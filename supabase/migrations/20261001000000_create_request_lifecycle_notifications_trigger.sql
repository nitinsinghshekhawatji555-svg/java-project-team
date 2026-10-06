-- Migration: Add lifecycle notification enum values and database trigger on rescue_requests
-- 1. Enum value additions
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mechanic_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mechanic_en_route';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mechanic_arrived';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'job_completed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'request_cancelled';

-- 2. Function to create lifecycle notification on status change
CREATE OR REPLACE FUNCTION public.handle_rescue_request_lifecycle_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_type public.notification_type;
  v_recipient_id uuid;
BEGIN
  -- Only execute if status actually transitioned
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    v_recipient_id := NEW.driver_id;
    v_type := 'mechanic_accepted'::public.notification_type;
    v_title := 'Request Accepted';
    v_body := 'A mechanic accepted your rescue request [req_id: ' || NEW.id || ']';
  ELSIF NEW.status = 'en_route' THEN
    v_recipient_id := NEW.driver_id;
    v_type := 'mechanic_en_route'::public.notification_type;
    v_title := 'Mechanic En Route';
    v_body := 'Your mechanic is on the way - track them on the map [req_id: ' || NEW.id || ']';
  ELSIF NEW.status = 'arrived' THEN
    v_recipient_id := NEW.driver_id;
    v_type := 'mechanic_arrived'::public.notification_type;
    v_title := 'Mechanic Arrived';
    v_body := 'Your mechanic has arrived at your location [req_id: ' || NEW.id || ']';
  ELSIF NEW.status = 'completed' THEN
    v_recipient_id := NEW.driver_id;
    v_type := 'job_completed'::public.notification_type;
    v_title := 'Job Completed';
    v_body := 'Your rescue request has been completed [req_id: ' || NEW.id || ']';
  ELSIF NEW.status = 'cancelled' THEN
    -- If mechanic is assigned, notify mechanic
    IF NEW.mechanic_id IS NOT NULL THEN
      v_recipient_id := NEW.mechanic_id;
      v_type := 'request_cancelled'::public.notification_type;
      v_title := 'Request Cancelled';
      v_body := COALESCE('Rescue request was cancelled: ' || NEW.cancellation_reason, 'Rescue request was cancelled') || ' [req_id: ' || NEW.id || ']';
    END IF;
  END IF;

  -- Insert notification if recipient was targeted
  IF v_recipient_id IS NOT NULL AND v_type IS NOT NULL THEN
    INSERT INTO public.notifications (
      profile_id,
      request_id,
      title,
      body,
      type,
      is_read
    ) VALUES (
      v_recipient_id,
      NEW.id,
      v_title,
      v_body,
      v_type,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger definition
DROP TRIGGER IF EXISTS trg_rescue_request_lifecycle_notifications ON public.rescue_requests;

CREATE TRIGGER trg_rescue_request_lifecycle_notifications
AFTER UPDATE OF status ON public.rescue_requests
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.handle_rescue_request_lifecycle_notification();

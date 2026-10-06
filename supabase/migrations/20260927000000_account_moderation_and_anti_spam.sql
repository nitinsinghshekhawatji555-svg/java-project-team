-- 20260927000000_account_moderation_and_anti_spam.sql
-- 1. Add moderation columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS issue_flag_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancellation_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 2. Add reported_user_id to issue_reports
ALTER TABLE public.issue_reports ADD COLUMN IF NOT EXISTS reported_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Create account_moderation_log
CREATE TABLE IF NOT EXISTS public.account_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('flagged', 'unflagged', 'suspended', 'unsuspended')),
  reason text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_log_user_id ON public.account_moderation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_log_created_at ON public.account_moderation_log(created_at DESC);

ALTER TABLE public.account_moderation_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_moderation_log' AND policyname = 'Admins can view moderation log'
  ) THEN
    CREATE POLICY "Admins can view moderation log" ON public.account_moderation_log
      FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_moderation_log' AND policyname = 'Admins can insert moderation log'
  ) THEN
    CREATE POLICY "Admins can insert moderation log" ON public.account_moderation_log
      FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

GRANT ALL ON TABLE public.account_moderation_log TO service_role;
GRANT SELECT, INSERT ON TABLE public.account_moderation_log TO authenticated;

-- 4. Anti-spam unique constraint on issue_reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_reports_unique_report 
  ON public.issue_reports(request_id, reporter_id, reason_header);

-- 5. Trigger 1: after insert on issue_reports, increment target issue_flag_count, at 3 set is_flagged = true
CREATE OR REPLACE FUNCTION public.handle_issue_report_insert()
RETURNS trigger AS $$
DECLARE
  v_driver_id uuid;
  v_mechanic_id uuid;
  v_target_user_id uuid;
  v_new_flag_count int;
BEGIN
  SELECT driver_id, mechanic_id INTO v_driver_id, v_mechanic_id
  FROM public.rescue_requests
  WHERE id = NEW.request_id;

  IF NEW.reporter_id = v_driver_id THEN
    v_target_user_id := v_mechanic_id;
  ELSIF NEW.reporter_id = v_mechanic_id THEN
    v_target_user_id := v_driver_id;
  ELSE
    v_target_user_id := NEW.reported_user_id;
  END IF;

  IF v_target_user_id IS NOT NULL THEN
    UPDATE public.issue_reports SET reported_user_id = v_target_user_id WHERE id = NEW.id;

    UPDATE public.profiles
    SET issue_flag_count = issue_flag_count + 1
    WHERE id = v_target_user_id
    RETURNING issue_flag_count INTO v_new_flag_count;

    IF v_new_flag_count >= 3 THEN
      UPDATE public.profiles
      SET is_flagged = true
      WHERE id = v_target_user_id AND is_flagged = false;

      IF FOUND THEN
        INSERT INTO public.account_moderation_log (user_id, action, reason, actor)
        VALUES (v_target_user_id, 'flagged', 'Accumulated 3 or more incident issue reports', 'system');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_issue_report_moderation ON public.issue_reports;
CREATE TRIGGER trg_issue_report_moderation
  AFTER INSERT ON public.issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_issue_report_insert();

-- 6. Trigger 2: after rescue_requests cancelled, increment cancelling party cancellation_count, past 5 suspend
CREATE OR REPLACE FUNCTION public.handle_rescue_request_cancellation()
RETURNS trigger AS $$
DECLARE
  v_cancelling_user uuid;
  v_new_cancel_count int;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    v_cancelling_user := NEW.cancelled_by;
    IF v_cancelling_user IS NOT NULL THEN
      UPDATE public.profiles
      SET cancellation_count = cancellation_count + 1
      WHERE id = v_cancelling_user
      RETURNING cancellation_count INTO v_new_cancel_count;

      IF v_new_cancel_count > 5 THEN
        UPDATE public.profiles
        SET is_suspended = true,
            suspended_at = now(),
            suspension_reason = 'Exceeded maximum cancellation threshold (more than 5 cancellations)'
        WHERE id = v_cancelling_user AND is_suspended = false;

        IF FOUND THEN
          INSERT INTO public.account_moderation_log (user_id, action, reason, actor)
          VALUES (v_cancelling_user, 'suspended', 'Exceeded maximum cancellation threshold (>5)', 'system');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rescue_request_cancellation ON public.rescue_requests;
CREATE TRIGGER trg_rescue_request_cancellation
  AFTER UPDATE ON public.rescue_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rescue_request_cancellation();

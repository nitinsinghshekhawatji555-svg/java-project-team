-- Migration: Add request_metrics table and instrumentation hooks for evaluation

-- 1. Create request_metrics table
CREATE TABLE IF NOT EXISTS public.request_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  matched_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  candidate_mechanics_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_request_metrics_request_id UNIQUE (request_id)
);

-- Indexes for efficient metrics querying
CREATE INDEX IF NOT EXISTS idx_request_metrics_request_id ON public.request_metrics(request_id);
CREATE INDEX IF NOT EXISTS idx_request_metrics_created_at ON public.request_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_metrics_status ON public.request_metrics(status);

-- Enable RLS
ALTER TABLE public.request_metrics ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated users can view metrics
CREATE POLICY "Allow authenticated users to read request_metrics"
  ON public.request_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert/Update: Authenticated and Service Role can manage metrics
CREATE POLICY "Allow service and authenticated to insert request_metrics"
  ON public.request_metrics
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Allow service and authenticated to update request_metrics"
  ON public.request_metrics
  FOR UPDATE
  TO authenticated, service_role
  USING (true);

-- Trigger function to automatically keep request_metrics synced with rescue_requests lifecycle
CREATE OR REPLACE FUNCTION public.sync_request_metrics()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_metrics (
      request_id,
      created_at,
      accepted_at,
      completed_at,
      cancelled_at,
      status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.created_at, now()),
      NEW.accepted_at,
      NEW.completed_at,
      NEW.cancelled_at,
      COALESCE(NEW.status::text, 'pending')
    )
    ON CONFLICT (request_id) DO UPDATE SET
      accepted_at = EXCLUDED.accepted_at,
      completed_at = EXCLUDED.completed_at,
      cancelled_at = EXCLUDED.cancelled_at,
      status = EXCLUDED.status,
      updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.request_metrics (
      request_id,
      created_at,
      accepted_at,
      completed_at,
      cancelled_at,
      status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.created_at, now()),
      NEW.accepted_at,
      NEW.completed_at,
      NEW.cancelled_at,
      COALESCE(NEW.status::text, 'pending')
    )
    ON CONFLICT (request_id) DO UPDATE SET
      accepted_at = COALESCE(EXCLUDED.accepted_at, public.request_metrics.accepted_at),
      completed_at = COALESCE(EXCLUDED.completed_at, public.request_metrics.completed_at),
      cancelled_at = COALESCE(EXCLUDED.cancelled_at, public.request_metrics.cancelled_at),
      status = EXCLUDED.status,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create
DROP TRIGGER IF EXISTS trg_sync_request_metrics ON public.rescue_requests;
CREATE TRIGGER trg_sync_request_metrics
  AFTER INSERT OR UPDATE ON public.rescue_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_request_metrics();

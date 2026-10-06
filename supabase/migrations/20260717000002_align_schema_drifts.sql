-- Align database schema drifts with codebase definitions

-- 1. Rename column 'reason' to 'reason_header' in issue_reports table to match standard codebase expectations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issue_reports' AND column_name = 'reason'
  ) THEN
    ALTER TABLE public.issue_reports RENAME COLUMN reason TO reason_header;
  END IF;
END $$;

-- 2. Add missing 'role' and 'reason' columns to profile_change_requests table
ALTER TABLE public.profile_change_requests ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profile_change_requests ADD COLUMN IF NOT EXISTS reason text;

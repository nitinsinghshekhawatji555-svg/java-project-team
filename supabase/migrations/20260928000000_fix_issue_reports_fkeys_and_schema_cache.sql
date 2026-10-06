-- Migration: Fix issue_reports foreign keys to public.profiles and refresh PostgREST schema cache

-- 1. Drop existing foreign key pointing to auth.users if present
ALTER TABLE public.issue_reports 
  DROP CONSTRAINT IF EXISTS issue_reports_reporter_id_fkey;

-- 2. Add foreign key pointing to public.profiles(id)
ALTER TABLE public.issue_reports 
  ADD CONSTRAINT issue_reports_reporter_id_fkey 
  FOREIGN KEY (reporter_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- 3. Ensure reported_user_id foreign key to public.profiles is explicit
ALTER TABLE public.issue_reports 
  DROP CONSTRAINT IF EXISTS issue_reports_reported_user_id_fkey;

ALTER TABLE public.issue_reports 
  ADD CONSTRAINT issue_reports_reported_user_id_fkey 
  FOREIGN KEY (reported_user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

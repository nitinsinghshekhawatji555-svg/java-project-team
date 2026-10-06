-- Migration: 20260925000000_create_mechanic_verification_audit.sql
-- Description: Creates an append-only immutable audit log table for mechanic account verification and rejection actions.

-- 1. Create the verification_audit_action enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_audit_action') THEN
    CREATE TYPE public.verification_audit_action AS ENUM ('verified', 'rejected', 'more_info_requested');
  END IF;
END $$;

-- 2. Create the immutable audit table
CREATE TABLE IF NOT EXISTS public.mechanic_verification_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  mechanic_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action public.verification_audit_action NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Enforce non-empty justification specifically on rejection
  CONSTRAINT check_rejection_reason CHECK (
    action != 'rejected' OR (reason IS NOT NULL AND trim(reason) != '')
  )
);

-- 3. Indexes for rapid lookups and filtering
CREATE INDEX IF NOT EXISTS idx_mech_verif_audit_mechanic_id ON public.mechanic_verification_audit(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mech_verif_audit_admin_id ON public.mechanic_verification_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_mech_verif_audit_created_at ON public.mechanic_verification_audit(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.mechanic_verification_audit ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- SELECT: Admins can view all verification audit records
CREATE POLICY "Admins can view verification audit records"
  ON public.mechanic_verification_audit
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- INSERT: Admins can insert verification audit records
CREATE POLICY "Admins can insert verification audit records"
  ON public.mechanic_verification_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE / DELETE: Blocked for all authenticated and anon roles (no update/delete policies created, revoke grants)
REVOKE UPDATE, DELETE ON TABLE public.mechanic_verification_audit FROM anon, authenticated;

-- Grant permissions
GRANT SELECT, INSERT ON TABLE public.mechanic_verification_audit TO authenticated;
GRANT ALL ON TABLE public.mechanic_verification_audit TO service_role;

-- ==============================================================================
-- Migration: Add Base Location and Offline Visibility Consent to Mechanic Profiles
-- ==============================================================================

-- 1. Add base location geometry, optional base location label, and consent flag to public.mechanic_profiles
ALTER TABLE public.mechanic_profiles
  ADD COLUMN IF NOT EXISTS base_location geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS base_location_label text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS show_base_location_offline boolean DEFAULT false NOT NULL;

-- 2. Create spatial GiST index for base_location queries
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_base_geo_gist
  ON public.mechanic_profiles USING gist (base_location);

-- 3. Recreate public.mechanic_public view with strict privacy masking:
-- When show_base_location_offline is FALSE, base_location and base_location_label return NULL.
DROP VIEW IF EXISTS public.mechanic_public CASCADE;

CREATE OR REPLACE VIEW public.mechanic_public AS
SELECT
  user_id,
  business_name,
  years_experience,
  specializations,
  rating_avg,
  rating_count,
  is_available,
  location_label,
  service_mode,
  current_location,
  CASE
    WHEN show_base_location_offline IS TRUE THEN base_location
    ELSE NULL
  END AS base_location,
  CASE
    WHEN show_base_location_offline IS TRUE THEN base_location_label
    ELSE NULL
  END AS base_location_label,
  show_base_location_offline
FROM public.mechanic_profiles;

-- Ensure read access is maintained on the public view
GRANT SELECT ON public.mechanic_public TO anon, authenticated, service_role;

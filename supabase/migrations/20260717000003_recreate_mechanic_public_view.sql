-- Recreate public.mechanic_public view to include location_label and service_mode

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
  current_location
FROM public.mechanic_profiles;

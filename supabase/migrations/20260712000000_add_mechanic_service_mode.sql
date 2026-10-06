-- Alter mechanic_profiles table to add service_mode
ALTER TABLE public.mechanic_profiles
ADD COLUMN service_mode text DEFAULT 'mobile'
CHECK (service_mode IN ('mobile', 'fixed_location', 'hybrid'));

-- Drop and recreate the public.mechanic_public view to include service_mode
DROP VIEW IF EXISTS public.mechanic_public;
CREATE VIEW public.mechanic_public AS
SELECT
  user_id,
  business_name,
  years_experience,
  specializations,
  rating_avg,
  rating_count,
  is_available,
  current_location,
  service_mode
FROM public.mechanic_profiles;

-- Recreate get_nearby_verified_mechanics function to return service_mode and location_label
DROP FUNCTION IF EXISTS public.get_nearby_verified_mechanics(double precision, double precision, double precision);

create or replace function public.get_nearby_verified_mechanics(
  lat double precision,
  lng double precision,
  radius_km double precision default 10
)
returns table (
  user_id uuid,
  business_name text,
  rating_avg numeric,
  distance_km numeric,
  service_mode text,
  location_label text
)
language sql
as $$
  select
    mp.user_id,
    mp.business_name,
    mp.rating_avg,
    round(
      (st_distance(
        mp.current_location::geography,
        st_setsrid(st_makepoint(lng, lat), 4326)::geography
      ) / 1000)::numeric, 2
    ) as distance_km,
    mp.service_mode,
    mp.location_label
  from public.mechanic_profiles mp
  where mp.is_available = true
    and mp.verification_status = 'approved'
    and mp.current_location is not null
    and st_dwithin(
      mp.current_location::geography,
      st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  order by distance_km asc;
$$;



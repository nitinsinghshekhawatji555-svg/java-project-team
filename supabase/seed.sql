-- ============================================================
-- SEED FILE — RoadRescue local dev
-- Run automatically on `supabase db reset`, or manually:
--   psql <local-connection-string> -f supabase/seed.sql
-- ============================================================

-- 1. AUTH USERS (triggers on_auth_user_created -> creates profiles row)
-- Password for all seeded accounts: "password123"
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at,
  aud, role
) values
  ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000000',
   'driver1@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"full_name":"Kwame Mensah","phone":"+233241234567","role":"driver"}', '{}', now(), now(), 'authenticated', 'authenticated'),

  ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000000',
   'driver2@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"full_name":"Ama Serwaa","phone":"+233247654321","role":"driver"}', '{}', now(), now(), 'authenticated', 'authenticated'),

  ('22222222-2222-2222-2222-222222222201', '00000000-0000-0000-0000-000000000000',
   'mechanic1@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"full_name":"Kofi Owusu","phone":"+233201112233","role":"mechanic"}', '{}', now(), now(), 'authenticated', 'authenticated'),

  ('22222222-2222-2222-2222-222222222202', '00000000-0000-0000-0000-000000000000',
   'mechanic2@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"full_name":"Yaw Boateng","phone":"+233209998877","role":"mechanic"}', '{}', now(), now(), 'authenticated', 'authenticated'),

  ('22222222-2222-2222-2222-222222222203', '00000000-0000-0000-0000-000000000000',
   'mechanic3@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"full_name":"Abena Osei","phone":"+233245556677","role":"mechanic"}', '{}', now(), now(), 'authenticated', 'authenticated'),

  ('33333333-3333-3333-3333-333333333301', '00000000-0000-0000-0000-000000000000',
   'admin1@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"full_name":"System Admin","phone":"+233200000000","role":"admin"}', '{}', now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- 2. ADMIN PROFILE (admin_profiles has no trigger auto-creating it — insert manually)
insert into public.admin_profiles (user_id, created_at) values
  ('33333333-3333-3333-3333-333333333301', now())
on conflict (user_id) do nothing;

-- 3. DRIVER PROFILES — flat columns, populated (tests the real submit path, not just empty defaults)
update public.driver_profiles set
  home_area = 'East Legon, Accra',
  vehicle_make = 'Toyota',
  vehicle_model = 'Corolla',
  vehicle_year = 2019,
  vehicle_color = 'Silver',
  vehicle_plate = 'GR-2847-21',
  emergency_contact_name = 'Abena Mensah',
  emergency_contact_phone = '+233201230000'
where user_id = '11111111-1111-1111-1111-111111111101';

update public.driver_profiles set
  home_area = 'Kasoa',
  vehicle_make = 'Honda',
  vehicle_model = 'CR-V',
  vehicle_year = 2021,
  vehicle_color = 'Black',
  vehicle_plate = 'GW-4920-24',
  emergency_contact_name = 'Kojo Serwaa',
  emergency_contact_phone = '+233247650000'
where user_id = '11111111-1111-1111-1111-111111111102';

-- 4. MECHANIC PROFILES — mix of verified + pending, real Accra-area coordinates
-- NOTE: confirm 'current_location' is the actual column name in your schema before running.
update public.mechanic_profiles set
  business_name = 'Owusu Auto Repairs',
  specializations = '["towing", "battery jump-start", "tyre repair"]'::jsonb,
  years_experience = 8,
  location_label = 'Osu, Accra',
  is_available = true,
  current_status = 'available',
  hourly_rate = 80.00,
  service_radius = 25,
  total_jobs = 42,
  current_location = ST_SetSRID(ST_MakePoint(-0.1810, 5.5560), 4326)::geometry  -- Osu, Accra
where user_id = '22222222-2222-2222-2222-222222222201';

update public.mechanic_profiles set
  business_name = 'Boateng Motors',
  specializations = '["diagnostics", "engine repair"]'::jsonb,
  years_experience = 5,
  location_label = 'Adenta, Accra',
  is_available = true,
  current_status = 'available',
  hourly_rate = 60.00,
  service_radius = 20,
  total_jobs = 15,
  current_location = ST_SetSRID(ST_MakePoint(-0.1660, 5.7080), 4326)::geometry  -- Adenta
where user_id = '22222222-2222-2222-2222-222222222202';

update public.mechanic_profiles set
  business_name = 'Osei Roadside Rescue',
  specializations = '["towing", "battery jump-start"]'::jsonb,
  years_experience = 2,
  location_label = 'Kasoa',
  is_available = false,
  current_status = 'offline',
  hourly_rate = 50.00,
  service_radius = 15,
  total_jobs = 3,
  current_location = ST_SetSRID(ST_MakePoint(-0.4162, 5.5320), 4326)::geometry  -- Kasoa
where user_id = '22222222-2222-2222-2222-222222222203';

-- 5. MECHANIC VERIFICATIONS — mechanics 1 & 2 verified, mechanic 3 still pending
-- (rows already auto-created by trg_auto_create_verification_row trigger on mechanic_profiles insert)
update public.mechanic_verifications set status = 'approved'
where mechanic_id = '22222222-2222-2222-2222-222222222201';

update public.mechanic_verifications set status = 'approved'
where mechanic_id = '22222222-2222-2222-2222-222222222202';

-- mechanic 3 left as default 'pending' — tests your admin approval flow
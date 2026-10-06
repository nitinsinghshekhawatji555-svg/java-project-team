-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- =========================================================
-- ENUMS
-- =========================================================

create type public.user_role as enum ('driver', 'mechanic', 'admin');

create type public.request_status as enum (
  'pending',
  'offered',
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.verification_status as enum (
  'pending',
  'approved',
  'rejected',
  'more_info'
);

create type public.notification_type as enum (
  'system',
  'request',
  'chat',
  'verification'
);

-- =========================================================
-- PROFILES (PRIVATE CORE)
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text default '',
  email text default '',
  phone text default '',
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- PUBLIC SAFE PROFILE VIEW
-- =========================================================

create view public.profile_public as
select id, role, full_name, avatar_url
from public.profiles;

-- =========================================================
-- EMERGENCY CONTACTS
-- =========================================================

create table public.user_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create index idx_emergency_user on public.user_emergency_contacts(user_id);

-- =========================================================
-- DRIVER PROFILE
-- =========================================================

create table public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  home_area text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =========================================================
-- MECHANIC PROFILE (PRIVATE)
-- =========================================================

create table public.mechanic_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text default '',
  years_experience int default 0,
  specializations jsonb default '[]'::jsonb,
  location_label text,
  verification_status text default 'pending',
  is_available boolean default false,
  rating_avg numeric(3,2) default 5.0,
  rating_count int default 0,
  current_location geometry(Point, 4326),
  location_updated_at timestamptz,
  created_at timestamptz default now()
);

create index idx_mechanic_geo
on public.mechanic_profiles using gist(current_location);

-- =========================================================
-- PUBLIC MECHANIC VIEW (SAFE MARKETPLACE)
-- =========================================================

create view public.mechanic_public as
select
  user_id,
  business_name,
  years_experience,
  specializations,
  rating_avg,
  rating_count,
  is_available,
  current_location
from public.mechanic_profiles;

-- =========================================================
-- VERIFICATIONS
-- =========================================================

create table public.mechanic_verifications (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid references public.mechanic_profiles(user_id) on delete cascade,
  status public.verification_status default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- =========================================================
-- DOCUMENTS
-- =========================================================

create table public.mechanic_documents (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid references public.mechanic_profiles(user_id) on delete cascade,
  document_name text,
  file_url text,
  created_at timestamptz default now()
);

-- =========================================================
-- RESCUE REQUESTS (CORE ENGINE)
-- =========================================================

create table public.rescue_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id) on delete cascade,
  mechanic_id uuid references public.profiles(id) on delete set null,

  status public.request_status default 'pending',

  service_type text default 'other',
  problem_description text default '',
  incident_address text,
  incident_location geometry(Point, 4326),

  vehicle_make text,
  vehicle_model text,
  vehicle_year int,
  vehicle_color text,
  vehicle_plate text,
  vehicle_image_url text,

  accepted_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_requests_driver on public.rescue_requests(driver_id);
create index idx_requests_mechanic on public.rescue_requests(mechanic_id);
create index idx_requests_status on public.rescue_requests(status);

-- =========================================================
-- REQUEST STATUS HISTORY (AUDIT)
-- =========================================================

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.rescue_requests(id) on delete cascade,
  status public.request_status,
  changed_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- MESSAGES (REQUEST CHAT ONLY)
-- =========================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.rescue_requests(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

create index idx_messages_request on public.messages(request_id);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  title text,
  body text,
  type public.notification_type,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =========================================================
-- MECHANIC LOCATION TRACKING
-- =========================================================

create table public.mechanic_locations (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid references public.mechanic_profiles(user_id) on delete cascade,
  location geometry(Point, 4326),
  created_at timestamptz default now()
);

create index idx_mechanic_locations_geo
on public.mechanic_locations using gist(location);

-- =========================================================
-- RLS ENABLE
-- =========================================================

alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.mechanic_profiles enable row level security;
alter table public.user_emergency_contacts enable row level security;
alter table public.rescue_requests enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.mechanic_locations enable row level security;

-- =========================================================
-- RLS POLICIES (SAFE + CONSISTENT)
-- =========================================================

-- PROFILES (STRICT PRIVATE)
create policy "own profile"
on public.profiles
for all using (auth.uid() = id);

-- DRIVER
create policy "own driver profile"
on public.driver_profiles
for all using (auth.uid() = user_id);

-- MECHANIC
create policy "own mechanic profile"
on public.mechanic_profiles
for all using (auth.uid() = user_id);

-- EMERGENCY CONTACTS
create policy "own contacts"
on public.user_emergency_contacts
for all using (auth.uid() = user_id);

-- REQUESTS (READ ONLY BY PARTICIPANTS)
create policy "participants can read requests"
on public.rescue_requests
for select using (
  auth.uid() = driver_id OR auth.uid() = mechanic_id
);

create policy "driver can create request"
on public.rescue_requests
for insert with check (auth.uid() = driver_id);

-- IMPORTANT: NO DIRECT ACCEPT UPDATE LOGIC (RPC ONLY)
create policy "participants update request"
on public.rescue_requests
for update using (
  auth.uid() = driver_id OR auth.uid() = mechanic_id
);

-- MESSAGES
create policy "request chat access"
on public.messages
for all using (
  exists (
    select 1 from public.rescue_requests r
    where r.id = messages.request_id
    and (r.driver_id = auth.uid() OR r.mechanic_id = auth.uid())
  )
);

-- NOTIFICATIONS
create policy "own notifications"
on public.notifications
for all using (auth.uid() = profile_id);

-- MECHANIC LOCATION
create policy "mechanic writes own location"
on public.mechanic_locations
for insert with check (auth.uid() = mechanic_id);

-- =========================================================
-- REALTIME ENABLEMENT
-- =========================================================

alter publication supabase_realtime add table public.rescue_requests;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.mechanic_locations;
alter publication supabase_realtime add table public.notifications;

-- =========================================================
-- GEOSPATIAL SEARCH FUNCTION
-- =========================================================

create or replace function public.get_nearby_verified_mechanics(
  lat double precision,
  lng double precision,
  radius_km double precision default 10
)
returns table (
  user_id uuid,
  business_name text,
  rating_avg numeric,
  distance_km numeric
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
    ) as distance_km
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

-- =========================================================
-- SYSTEM REPORTS
-- =========================================================

CREATE TYPE public.report_category AS ENUM (
  'pricing_dispute', 
  'behavioral_issue', 
  'no_show', 
  'faulty_repair', 
  'app_bug', 
  'other'
);

CREATE TABLE public.system_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  category public.report_category NOT NULL,
  comments text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for data safety
ALTER TABLE public.system_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to file reports safely
CREATE POLICY "Users can file system reports" 
  ON public.system_reports FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = reporter_id);

-- Allow Admins to review them
CREATE POLICY "Admins can view all system reports" 
  ON public.system_reports FOR SELECT TO authenticated 
  USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- =========================================================
-- REQUEST REVIEWS (RATING SYSTEM)
-- =========================================================

CREATE TABLE public.request_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mechanic_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating int CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_reviews_mechanic ON public.request_reviews(mechanic_id);
CREATE INDEX idx_reviews_request ON public.request_reviews(request_id);

ALTER TABLE public.request_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.request_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can insert reviews"
  ON public.request_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

-- =========================================================
-- ADDITIONAL REALTIME TABLE REGISTRATIONS
-- =========================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_reviews;
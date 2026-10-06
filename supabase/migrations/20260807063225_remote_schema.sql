drop extension if exists "pg_net";

create extension if not exists "btree_gist" with schema "public";

create extension if not exists "http" with schema "public";

drop policy "own driver profile" on "public"."driver_profiles";

drop policy "Admins can delete reports" on "public"."issue_reports";

drop policy "Users can view own reports" on "public"."issue_reports";

drop policy "mechanic writes own location" on "public"."mechanic_locations";

drop policy "own mechanic profile" on "public"."mechanic_profiles";

drop policy "request chat access" on "public"."messages";

drop policy "own notifications" on "public"."notifications";

drop policy "own profile" on "public"."profiles";

drop policy "driver can create request" on "public"."rescue_requests";

drop policy "participants can read requests" on "public"."rescue_requests";

drop policy "participants update request" on "public"."rescue_requests";

drop policy "Admins can view all system reports" on "public"."system_reports";

drop policy "Users can file system reports" on "public"."system_reports";

drop policy "own contacts" on "public"."user_emergency_contacts";

drop policy "Admins can update change requests" on "public"."profile_change_requests";

drop policy "Users can view own change requests" on "public"."profile_change_requests";

revoke references on table "public"."system_reports" from "anon";

revoke trigger on table "public"."system_reports" from "anon";

revoke truncate on table "public"."system_reports" from "anon";

revoke references on table "public"."system_reports" from "authenticated";

revoke trigger on table "public"."system_reports" from "authenticated";

revoke truncate on table "public"."system_reports" from "authenticated";

revoke references on table "public"."system_reports" from "service_role";

revoke trigger on table "public"."system_reports" from "service_role";

revoke truncate on table "public"."system_reports" from "service_role";

revoke references on table "public"."user_emergency_contacts" from "anon";

revoke trigger on table "public"."user_emergency_contacts" from "anon";

revoke truncate on table "public"."user_emergency_contacts" from "anon";

revoke references on table "public"."user_emergency_contacts" from "authenticated";

revoke trigger on table "public"."user_emergency_contacts" from "authenticated";

revoke truncate on table "public"."user_emergency_contacts" from "authenticated";

revoke references on table "public"."user_emergency_contacts" from "service_role";

revoke trigger on table "public"."user_emergency_contacts" from "service_role";

revoke truncate on table "public"."user_emergency_contacts" from "service_role";

alter table "public"."profile_preferences" drop constraint "profile_preferences_user_id_key";

alter table "public"."system_reports" drop constraint "system_reports_offender_id_fkey";

alter table "public"."system_reports" drop constraint "system_reports_reporter_id_fkey";

alter table "public"."system_reports" drop constraint "system_reports_request_id_fkey";

alter table "public"."user_emergency_contacts" drop constraint "user_emergency_contacts_user_id_fkey";

alter table "public"."driver_profiles" drop constraint "driver_profiles_user_id_fkey";

alter table "public"."issue_reports" drop constraint "issue_reports_reporter_id_fkey";

alter table "public"."issue_reports" drop constraint "issue_reports_request_id_fkey";

alter table "public"."mechanic_documents" drop constraint "mechanic_documents_mechanic_id_fkey";

alter table "public"."mechanic_locations" drop constraint "mechanic_locations_mechanic_id_fkey";

alter table "public"."mechanic_profiles" drop constraint "mechanic_profiles_user_id_fkey";

alter table "public"."mechanic_verifications" drop constraint "mechanic_verifications_mechanic_id_fkey";

alter table "public"."mechanic_verifications" drop constraint "mechanic_verifications_reviewed_by_fkey";

alter table "public"."messages" drop constraint "messages_request_id_fkey";

alter table "public"."messages" drop constraint "messages_sender_id_fkey";

alter table "public"."notifications" drop constraint "notifications_profile_id_fkey";

alter table "public"."profile_change_requests" drop constraint "profile_change_requests_reviewed_by_fkey";

alter table "public"."profile_change_requests" drop constraint "profile_change_requests_user_id_fkey";

alter table "public"."profile_preferences" drop constraint "profile_preferences_user_id_fkey";

alter table "public"."request_reviews" drop constraint "request_reviews_driver_id_fkey";

alter table "public"."request_reviews" drop constraint "request_reviews_mechanic_id_fkey";

alter table "public"."request_reviews" drop constraint "request_reviews_request_id_fkey";

alter table "public"."request_status_history" drop constraint "request_status_history_changed_by_fkey";

alter table "public"."request_status_history" drop constraint "request_status_history_request_id_fkey";

alter table "public"."rescue_requests" drop constraint "rescue_requests_driver_id_fkey";

alter table "public"."rescue_requests" drop constraint "rescue_requests_mechanic_id_fkey";

drop view if exists "public"."profile_public";

drop view if exists "public"."mechanic_public";

alter table "public"."system_reports" drop constraint "system_reports_pkey";

alter table "public"."user_emergency_contacts" drop constraint "user_emergency_contacts_pkey";

drop index if exists "public"."idx_emergency_user";

drop index if exists "public"."idx_mechanic_geo";

drop index if exists "public"."idx_mechanic_locations_geo";

drop index if exists "public"."idx_messages_request";

drop index if exists "public"."idx_requests_driver";

drop index if exists "public"."idx_requests_mechanic";

drop index if exists "public"."idx_requests_status";

drop index if exists "public"."issue_reports_created_at_idx";

drop index if exists "public"."issue_reports_reporter_id_idx";

drop index if exists "public"."issue_reports_request_id_idx";

drop index if exists "public"."profile_preferences_user_id_key";

drop index if exists "public"."system_reports_pkey";

drop index if exists "public"."user_emergency_contacts_pkey";

drop table "public"."system_reports";

drop table "public"."user_emergency_contacts";

alter type "public"."request_status" rename to "request_status__old_version_to_be_dropped";

create type "public"."request_status" as enum ('pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled');

alter type "public"."user_role" rename to "user_role__old_version_to_be_dropped";

create type "public"."user_role" as enum ('admin', 'driver', 'mechanic');

alter type "public"."verification_status" rename to "verification_status__old_version_to_be_dropped";

create type "public"."verification_status" as enum ('pending', 'approved', 'rejected');


  create table "public"."admin_profiles" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."admin_profiles" enable row level security;


  create table "public"."ai_diagnostics" (
    "id" uuid not null default gen_random_uuid(),
    "request_id" uuid not null,
    "symptoms" jsonb not null default '{}'::jsonb,
    "probable_causes" jsonb not null default '[]'::jsonb,
    "recommendations" jsonb not null default '[]'::jsonb,
    "confidence_score" numeric(5,2),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_diagnostics" enable row level security;

alter table "public"."blocked_emails" enable row level security;

alter table "public"."driver_profiles" drop column "preferences";

alter table "public"."driver_profiles" add column "emergency_contact_name" text not null default ''::text;

alter table "public"."driver_profiles" add column "emergency_contact_phone" text not null default ''::text;

alter table "public"."driver_profiles" add column "vehicle_color" text not null default ''::text;

alter table "public"."driver_profiles" add column "vehicle_make" text not null default ''::text;

alter table "public"."driver_profiles" add column "vehicle_model" text not null default ''::text;

alter table "public"."driver_profiles" add column "vehicle_plate" text not null default ''::text;

alter table "public"."driver_profiles" add column "vehicle_year" integer;

alter table "public"."driver_profiles" alter column "created_at" set not null;

alter table "public"."driver_profiles" alter column "home_area" set default ''::text;

alter table "public"."driver_profiles" alter column "home_area" set not null;

alter table "public"."fuel_ev_stations" alter column "id" set default nextval('public.fuel_ev_stations_id_seq'::regclass);

alter table "public"."issue_reports" add column "status" text not null default 'pending'::text;

alter table "public"."issue_reports" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."mechanic_documents" alter column "created_at" set not null;

alter table "public"."mechanic_documents" alter column "document_name" set not null;

alter table "public"."mechanic_documents" alter column "file_url" set not null;

alter table "public"."mechanic_documents" alter column "mechanic_id" set not null;

alter table "public"."mechanic_documents" enable row level security;

alter table "public"."mechanic_locations" alter column "created_at" set not null;

alter table "public"."mechanic_locations" alter column "location" set not null;

alter table "public"."mechanic_locations" alter column "location" set data type public.geometry(Point,4326) using "location"::public.geometry(Point,4326);

alter table "public"."mechanic_locations" alter column "mechanic_id" set not null;

alter table "public"."mechanic_profiles" add column "current_status" text default 'offline'::text;

alter table "public"."mechanic_profiles" add column "hourly_rate" numeric(10,2) default 0.00;

alter table "public"."mechanic_profiles" add column "license_expiry" date;

alter table "public"."mechanic_profiles" add column "license_number" text;

alter table "public"."mechanic_profiles" add column "service_radius" integer default 50;

alter table "public"."mechanic_profiles" add column "total_jobs" integer default 0;

alter table "public"."mechanic_profiles" alter column "business_name" set not null;

alter table "public"."mechanic_profiles" alter column "created_at" set not null;

alter table "public"."mechanic_profiles" alter column "current_location" set data type public.geometry(Point,4326) using "current_location"::public.geometry(Point,4326);

alter table "public"."mechanic_profiles" alter column "is_available" set not null;

alter table "public"."mechanic_profiles" alter column "location_label" set default ''::text;

alter table "public"."mechanic_profiles" alter column "location_label" set not null;

alter table "public"."mechanic_profiles" alter column "rating_avg" set not null;

alter table "public"."mechanic_profiles" alter column "rating_count" set not null;

alter table "public"."mechanic_profiles" alter column "specializations" set not null;

alter table "public"."mechanic_verifications" drop column "notes";

alter table "public"."mechanic_verifications" add column "rejection_reason" text;

alter table "public"."mechanic_verifications" alter column "created_at" set not null;

alter table "public"."mechanic_verifications" alter column "mechanic_id" set not null;

alter table "public"."mechanic_verifications" alter column "status" drop default;

alter table "public"."mechanic_verifications" alter column "status" set data type public.verification_status using "status"::text::public.verification_status;

alter table "public"."mechanic_verifications" alter column "status" set default 'pending'::public.verification_status;

alter table "public"."mechanic_verifications" alter column "status" set not null;

alter table "public"."mechanic_verifications" enable row level security;

alter table "public"."messages" alter column "created_at" set not null;

alter table "public"."messages" alter column "request_id" set not null;

alter table "public"."messages" alter column "sender_id" set not null;

alter table "public"."notifications" add column "user_id" uuid;

alter table "public"."notifications" alter column "body" set default ''::text;

alter table "public"."notifications" alter column "body" set not null;

alter table "public"."notifications" alter column "created_at" set not null;

alter table "public"."notifications" alter column "is_read" set not null;

alter table "public"."notifications" alter column "profile_id" set not null;

alter table "public"."notifications" alter column "title" set default ''::text;

alter table "public"."notifications" alter column "title" set not null;

alter table "public"."notifications" alter column "type" set default 'system'::public.notification_type;

alter table "public"."notifications" alter column "type" set not null;

alter table "public"."notifications" alter column "type" set data type public.notification_type using "type"::text::public.notification_type;

alter table "public"."profile_change_requests" alter column "field_key" set not null;

alter table "public"."profile_change_requests" alter column "field_key" set data type character varying(50) using "field_key"::character varying(50);

alter table "public"."profile_change_requests" alter column "status" set default 'pending'::character varying;

alter table "public"."profile_change_requests" alter column "status" set data type character varying(20) using "status"::character varying(20);

alter table "public"."profile_change_requests" alter column "target_table" set not null;

alter table "public"."profile_change_requests" alter column "target_table" set data type character varying(50) using "target_table"::character varying(50);

alter table "public"."profile_preferences" alter column "created_at" set not null;

alter table "public"."profile_preferences" alter column "updated_at" set not null;

alter table "public"."profiles" alter column "created_at" set not null;

alter table "public"."profiles" alter column "email" set not null;

alter table "public"."profiles" alter column "full_name" set not null;

alter table "public"."profiles" alter column "is_active" set not null;

alter table "public"."profiles" alter column "phone" set not null;

alter table "public"."profiles" alter column "role" drop default;

alter table "public"."profiles" alter column "role" set data type public.user_role using "role"::text::public.user_role;

alter table "public"."profiles" alter column "role" set default 'driver'::public.user_role;

alter table "public"."profiles" alter column "updated_at" set not null;

alter table "public"."request_reviews" alter column "request_id" set not null;

alter table "public"."request_status_history" alter column "created_at" set not null;

alter table "public"."request_status_history" alter column "request_id" set not null;

alter table "public"."request_status_history" alter column "status" set not null;

alter table "public"."request_status_history" alter column "status" set data type public.request_status using "status"::text::public.request_status;

alter table "public"."request_status_history" enable row level security;

alter table "public"."rescue_requests" add column "ai_diagnostic_result" jsonb;

alter table "public"."rescue_requests" add column "cancellation_reason" text;

alter table "public"."rescue_requests" add column "cancelled_by" uuid;

alter table "public"."rescue_requests" add column "completion_notes" text;

alter table "public"."rescue_requests" add column "incident_lat" numeric(10,8);

alter table "public"."rescue_requests" add column "incident_lng" numeric(11,8);

alter table "public"."rescue_requests" add column "performed_services" jsonb not null default '[]'::jsonb;

alter table "public"."rescue_requests" alter column "created_at" set not null;

alter table "public"."rescue_requests" alter column "driver_id" set not null;

alter table "public"."rescue_requests" alter column "incident_address" set default ''::text;

alter table "public"."rescue_requests" alter column "incident_address" set not null;

alter table "public"."rescue_requests" alter column "incident_location" set data type public.geometry(Point,4326) using "incident_location"::public.geometry(Point,4326);

alter table "public"."rescue_requests" alter column "problem_description" set not null;

alter table "public"."rescue_requests" alter column "service_type" set not null;

alter table "public"."rescue_requests" alter column "status" drop default;

alter table "public"."rescue_requests" alter column "status" set data type public.request_status using "status"::text::public.request_status;

alter table "public"."rescue_requests" alter column "status" set default 'pending'::public.request_status;

alter table "public"."rescue_requests" alter column "status" set not null;

alter table "public"."rescue_requests" alter column "updated_at" set not null;

alter table "public"."rescue_requests" alter column "vehicle_color" set default ''::text;

alter table "public"."rescue_requests" alter column "vehicle_color" set not null;

alter table "public"."rescue_requests" alter column "vehicle_make" set default ''::text;

alter table "public"."rescue_requests" alter column "vehicle_make" set not null;

alter table "public"."rescue_requests" alter column "vehicle_model" set default ''::text;

alter table "public"."rescue_requests" alter column "vehicle_model" set not null;

alter table "public"."rescue_requests" alter column "vehicle_plate" set default ''::text;

alter table "public"."rescue_requests" alter column "vehicle_plate" set not null;

drop type "public"."report_category";

CREATE UNIQUE INDEX admin_profiles_pkey ON public.admin_profiles USING btree (user_id);

CREATE UNIQUE INDEX ai_diagnostics_pkey ON public.ai_diagnostics USING btree (id);

CREATE UNIQUE INDEX ai_diagnostics_request_id_key ON public.ai_diagnostics USING btree (request_id);

CREATE INDEX idx_issue_reports_reporter_id ON public.issue_reports USING btree (reporter_id);

CREATE INDEX idx_issue_reports_request_id ON public.issue_reports USING btree (request_id);

CREATE INDEX idx_issue_reports_status ON public.issue_reports USING btree (status);

CREATE INDEX idx_mechanic_locations_geo_gist ON public.mechanic_locations USING gist (location);

CREATE INDEX idx_mechanic_profiles_geo_gist ON public.mechanic_profiles USING gist (current_location);

CREATE INDEX idx_messages_request_composite ON public.messages USING btree (request_id, created_at);

CREATE INDEX idx_notifications_lookup_unread ON public.notifications USING btree (profile_id) WHERE (is_read = false);

CREATE INDEX idx_rescue_requests_created_at ON public.rescue_requests USING btree (created_at DESC);

CREATE INDEX idx_rescue_requests_driver_id ON public.rescue_requests USING btree (driver_id);

CREATE INDEX idx_rescue_requests_mechanic_id ON public.rescue_requests USING btree (mechanic_id);

CREATE INDEX idx_rescue_requests_status ON public.rescue_requests USING btree (status);

CREATE INDEX idx_status_history_parent ON public.request_status_history USING btree (request_id);

CREATE UNIQUE INDEX request_reviews_request_id_key ON public.request_reviews USING btree (request_id);

CREATE UNIQUE INDEX unique_user_preferences ON public.profile_preferences USING btree (user_id);

alter table "public"."admin_profiles" add constraint "admin_profiles_pkey" PRIMARY KEY using index "admin_profiles_pkey";

alter table "public"."ai_diagnostics" add constraint "ai_diagnostics_pkey" PRIMARY KEY using index "ai_diagnostics_pkey";

alter table "public"."admin_profiles" add constraint "admin_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."admin_profiles" validate constraint "admin_profiles_user_id_fkey";

alter table "public"."ai_diagnostics" add constraint "ai_diagnostics_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.rescue_requests(id) ON DELETE CASCADE not valid;

alter table "public"."ai_diagnostics" validate constraint "ai_diagnostics_request_id_fkey";

alter table "public"."ai_diagnostics" add constraint "ai_diagnostics_request_id_key" UNIQUE using index "ai_diagnostics_request_id_key";

alter table "public"."issue_reports" add constraint "issue_reports_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text]))) not valid;

alter table "public"."issue_reports" validate constraint "issue_reports_status_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profile_change_requests" add constraint "profile_change_requests_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "public"."profile_change_requests" validate constraint "profile_change_requests_status_check";

alter table "public"."profile_preferences" add constraint "unique_user_preferences" UNIQUE using index "unique_user_preferences";

alter table "public"."request_reviews" add constraint "request_reviews_request_id_key" UNIQUE using index "request_reviews_request_id_key";

alter table "public"."rescue_requests" add constraint "rescue_requests_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."rescue_requests" validate constraint "rescue_requests_cancelled_by_fkey";

alter table "public"."driver_profiles" add constraint "driver_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."driver_profiles" validate constraint "driver_profiles_user_id_fkey";

alter table "public"."issue_reports" add constraint "issue_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."issue_reports" validate constraint "issue_reports_reporter_id_fkey";

alter table "public"."issue_reports" add constraint "issue_reports_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.rescue_requests(id) ON DELETE CASCADE not valid;

alter table "public"."issue_reports" validate constraint "issue_reports_request_id_fkey";

alter table "public"."mechanic_documents" add constraint "mechanic_documents_mechanic_id_fkey" FOREIGN KEY (mechanic_id) REFERENCES public.mechanic_profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."mechanic_documents" validate constraint "mechanic_documents_mechanic_id_fkey";

alter table "public"."mechanic_locations" add constraint "mechanic_locations_mechanic_id_fkey" FOREIGN KEY (mechanic_id) REFERENCES public.mechanic_profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."mechanic_locations" validate constraint "mechanic_locations_mechanic_id_fkey";

alter table "public"."mechanic_profiles" add constraint "mechanic_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mechanic_profiles" validate constraint "mechanic_profiles_user_id_fkey";

alter table "public"."mechanic_verifications" add constraint "mechanic_verifications_mechanic_id_fkey" FOREIGN KEY (mechanic_id) REFERENCES public.mechanic_profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."mechanic_verifications" validate constraint "mechanic_verifications_mechanic_id_fkey";

alter table "public"."mechanic_verifications" add constraint "mechanic_verifications_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."mechanic_verifications" validate constraint "mechanic_verifications_reviewed_by_fkey";

alter table "public"."messages" add constraint "messages_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.rescue_requests(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_request_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."notifications" add constraint "notifications_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_profile_id_fkey";

alter table "public"."profile_change_requests" add constraint "profile_change_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."profile_change_requests" validate constraint "profile_change_requests_reviewed_by_fkey";

alter table "public"."profile_change_requests" add constraint "profile_change_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."profile_change_requests" validate constraint "profile_change_requests_user_id_fkey";

alter table "public"."profile_preferences" add constraint "profile_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."profile_preferences" validate constraint "profile_preferences_user_id_fkey";

alter table "public"."request_reviews" add constraint "request_reviews_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."request_reviews" validate constraint "request_reviews_driver_id_fkey";

alter table "public"."request_reviews" add constraint "request_reviews_mechanic_id_fkey" FOREIGN KEY (mechanic_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."request_reviews" validate constraint "request_reviews_mechanic_id_fkey";

alter table "public"."request_reviews" add constraint "request_reviews_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.rescue_requests(id) ON DELETE CASCADE not valid;

alter table "public"."request_reviews" validate constraint "request_reviews_request_id_fkey";

alter table "public"."request_status_history" add constraint "request_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."request_status_history" validate constraint "request_status_history_changed_by_fkey";

alter table "public"."request_status_history" add constraint "request_status_history_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.rescue_requests(id) ON DELETE CASCADE not valid;

alter table "public"."request_status_history" validate constraint "request_status_history_request_id_fkey";

alter table "public"."rescue_requests" add constraint "rescue_requests_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."rescue_requests" validate constraint "rescue_requests_driver_id_fkey";

alter table "public"."rescue_requests" add constraint "rescue_requests_mechanic_id_fkey" FOREIGN KEY (mechanic_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."rescue_requests" validate constraint "rescue_requests_mechanic_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_rescue_request_status_flow()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Block changes if status is already terminal
  if old.status in ('completed', 'cancelled') then
    raise exception 'Cannot modify a request that is already completed or cancelled.';
  end if;

  -- Block illegal backward steps or giant jumps
  if old.status = 'pending' and new.status not in ('accepted', 'cancelled') then
    raise exception 'Pending requests can only move to accepted or cancelled.';
  end if;
  
  if old.status = 'accepted' and new.status not in ('en_route', 'cancelled') then
    raise exception 'Accepted requests must move to en_route or be cancelled.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_days integer DEFAULT 30)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
with period_requests as (
  select *
  from rescue_requests
  where created_at >= now() - make_interval(days => p_days)
),
period_response as (
  select
    avg(extract(epoch from (accepted_at - created_at)) / 60.0) as avg_response_minutes,
    avg(extract(epoch from (arrived_at - created_at)) / 60.0) as avg_arrival_minutes,
    avg(extract(epoch from (completed_at - created_at)) / 60.0) as avg_completion_minutes
  from period_requests
),
top_mechanics as (
  select json_agg(
    json_build_object(
      'id', user_id,
      'name', full_name,
      'business_name', business_name,
      'rating', coalesce(rating_avg, 0),
      -- FIXED: Standardized to normalized column naming 'total_jobs'
      'completed_jobs', coalesce(total_jobs, 0),
      'is_available', is_available
    )
    -- FIXED: Ordered by normalized column name
    order by rating_avg desc nulls last, total_jobs desc nulls last
  ) as items
  from (
    select
      mp.user_id,
      p.full_name,
      mp.business_name,
      mp.rating_avg,
      mp.total_jobs, -- FIXED
      mp.is_available,
      p.avatar_url
    from mechanic_profiles mp
    join profiles p on p.id = mp.user_id
    where mp.verification_status = 'verified'
    order by mp.rating_avg desc nulls last, mp.total_jobs desc nulls last
    limit 5
  ) ranked
),
ratings_distribution as (
  select json_object_agg(rating::text, count) as items
  from (
    select
      gs.rating::text,
      coalesce(count(pr.driver_rating), 0)::int as count
    from generate_series(1, 5) as gs(rating)
    -- FIXED: Shifted source to period_requests to respect the p_days argument scope
    left join period_requests pr
      on pr.driver_rating = gs.rating
      and pr.status = 'completed'
    group by gs.rating
    order by gs.rating
  ) distribution
),
vehicle_breakdown as (
  select json_agg(json_build_object('label', vehicle_type, 'count', request_count) order by request_count desc) as items
  from (
    select
      coalesce(nullif(vehicle_make, ''), 'Unknown') as vehicle_type,
      count(*)::int as request_count
    -- FIXED: Connected to period filtering
    from period_requests
    group by 1
  ) breakdown
),
fault_breakdown as (
  select json_agg(json_build_object('label', fault_category, 'count', request_count) order by request_count desc) as items
  from (
    select
      coalesce(
        -- FIXED: Updated JSONB extraction keys to map natively to our AI schema
        ai_diagnostic_result ->> 'fault_category',
        ai_diagnostic_result ->> 'summary',
        service_type,
        'Unknown'
      ) as fault_category,
      count(*)::int as request_count
    -- FIXED: Connected to period filtering
    from period_requests
    group by 1
  ) breakdown
),
status_breakdown as (
  select json_agg(json_build_object('label', status, 'count', request_count) order by request_count desc) as items
  from (
    select
      status,
      count(*)::int as request_count
    -- FIXED: Connected to period filtering
    from period_requests
    group by status
  ) breakdown
)
select json_build_object(
  'exported_at', now(),
  'period_days', p_days,
  'total_users', (select count(*)::int from profiles),
  'pending_verifications', (
    select count(*)::int
    from mechanic_profiles
    where verification_status = 'pending'
  ),
  'rescue_metrics', json_build_object(
    'total_requests', (select count(*)::int from rescue_requests),
    'period_total_requests', (select count(*)::int from period_requests),
    'active_requests', (
      select count(*)::int
      from rescue_requests
      where status in ('pending', 'accepted', 'en_route', 'arrived', 'in_progress')
    ),
    'completed_requests', (
      select count(*)::int
      from rescue_requests
      where status = 'completed'
    ),
    'cancelled_requests', (
      select count(*)::int
      from rescue_requests
      where status = 'cancelled'
    )
  ),
  'response_metrics', json_build_object(
    -- Enforce clean numeric precision formatting rounding to one decimal place
    'average_response_time_minutes', round(coalesce((select avg_response_minutes from period_response), 0)::numeric, 1),
    'average_arrival_time_minutes', round(coalesce((select avg_arrival_minutes from period_response), 0)::numeric, 1),
    'average_completion_time_minutes', round(coalesce((select avg_completion_minutes from period_response), 0)::numeric, 1)
  ),
  'mechanic_metrics', json_build_object(
    'verified_mechanics', (
      select count(*)::int
      from mechanic_profiles
      where verification_status = 'verified'
    ),
    'active_mechanics', (
      select count(*)::int
      from mechanic_profiles
      where verification_status = 'verified'
        and current_status in ('online', 'on_job')
    ),
    'available_mechanics', (
      select count(*)::int
      from mechanic_profiles
      where verification_status = 'verified'
        and is_available = true
    ),
    'top_performing_mechanics', coalesce((select items from top_mechanics), '[]'::json)
  ),
  'driver_metrics', json_build_object(
    'total_drivers', (
      select count(*)::int
      from profiles
      where role = 'driver'
    ),
    'active_drivers', (
      select count(distinct driver_id)::int
      from rescue_requests
      where status in ('pending', 'accepted', 'en_route', 'arrived', 'in_progress')
    )
  ),
  'satisfaction_metrics', json_build_object(
    'average_rating', round(coalesce((
      select avg(driver_rating)
      from period_requests -- FIXED
      where status = 'completed'
        and driver_rating is not null
    ), 0)::numeric, 2),
    'ratings_distribution', coalesce((select items from ratings_distribution), '{}'::json)
  ),
  'incident_analytics', json_build_object(
    'breakdown_by_vehicle_type', coalesce((select items from vehicle_breakdown), '[]'::json),
    'breakdown_by_fault_category', coalesce((select items from fault_breakdown), '[]'::json),
    'breakdown_by_status', coalesce((select items from status_breakdown), '[]'::json)
  )
)
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearby_pending_requests(p_mechanic_user_id uuid, p_limit integer DEFAULT 20, p_max_distance_km double precision DEFAULT NULL::double precision)
 RETURNS TABLE(out_request_id uuid, out_driver_id uuid, out_status text, out_service_type text, out_incident_address text, out_problem_description text, out_incident_location public.geography, out_vehicle_make text, out_vehicle_model text, out_vehicle_year integer, out_vehicle_color text, out_vehicle_plate text, out_vehicle_image_url text, out_ai_diagnostic_result jsonb, out_created_at timestamp with time zone, out_distance_km double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select
    r.id as out_request_id,
    r.driver_id as out_driver_id,
    r.status as out_status,
    r.service_type as out_service_type,
    r.incident_address as out_incident_address,
    r.problem_description as out_problem_description,
    r.incident_location as out_incident_location,
    r.vehicle_make as out_vehicle_make,
    r.vehicle_model as out_vehicle_model,
    r.vehicle_year as out_vehicle_year,
    r.vehicle_color as out_vehicle_color,
    r.vehicle_plate as out_vehicle_plate,
    r.vehicle_image_url as out_vehicle_image_url,
    r.ai_diagnostic_result as out_ai_diagnostic_result,
    r.created_at as out_created_at,
    (st_distance(mp.current_location, r.incident_location) / 1000.0)::double precision as out_distance_km
  from mechanic_profiles mp
  -- FIXED: Swapped out catastrophic cross-join for a targeted spatial join evaluation
  join rescue_requests r on r.status = 'pending' 
  where mp.user_id = p_mechanic_user_id
    and mp.verification_status = 'verified'
    and mp.is_available = true
    and mp.current_location is not null
    and st_dwithin(
      mp.current_location,
      r.incident_location,
      coalesce(p_max_distance_km, mp.service_radius_km, 10.0) * 1000.0
    )
  order by out_distance_km asc, r.created_at asc
  limit p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearby_verified_mechanics(request_latitude numeric, request_longitude numeric, search_radius_km numeric DEFAULT 10)
 RETURNS TABLE(user_id uuid, business_name text, rating_avg numeric, distance_km numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    mp.user_id,
    mp.business_name,
    mp.rating_avg,
    round(
      (st_distance(
        mp.current_location::geography,
        st_setsrid(st_makepoint(request_longitude, request_latitude), 4326)::geography
      ) / 1000.0)::numeric,
      2
    ) as distance_km
  from public.mechanic_profiles mp
  where mp.is_available = true
    and mp.current_location is not null
    and exists (
      select 1 from public.mechanic_verifications mv 
      where mv.mechanic_id = mp.user_id and mv.status = 'approved'
    )
    and st_dwithin(
      mp.current_location::geography,
      st_setsrid(st_makepoint(request_longitude, request_latitude), 4326)::geography,
      search_radius_km * 1000
    )
  order by distance_km asc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  assigned_role public.user_role;
  extracted_name text;
begin
  assigned_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'driver'::public.user_role);
  extracted_name := coalesce(new.raw_user_meta_data->>'full_name', '');

  insert into public.profiles (id, role, full_name, email, phone, avatar_url)
  values (
    new.id,
    assigned_role,
    extracted_name,
    coalesce(new.email, ''),
    coalesce(new.phone, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  -- Base default sub-profiles created implicitly without crushing data defaults
  case assigned_role
    when 'driver' then
      insert into public.driver_profiles (user_id) values (new.id) on conflict do nothing;
    when 'mechanic' then
      insert into public.mechanic_profiles (user_id, business_name) 
      values (new.id, case when extracted_name = '' then 'Independent Mechanic' else extracted_name || ' Workshop' end) 
      on conflict do nothing;
    when 'admin' then
      insert into public.admin_profiles (user_id) values (new.id) on conflict do nothing;
  end case;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_mechanic_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert a pending verification row whenever a new mechanic profile is created
  INSERT INTO public.mechanic_verifications (mechanic_id, status, created_at)
  VALUES (NEW.user_id, 'pending', NOW());
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_notification_read_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- If notification is transitioning from unread to read, stamp the execution time
  if new.is_read = true and old.is_read = false then
    new.read_at = now();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_sync_user_phone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.profiles
    SET phone = NEW.raw_user_meta_data->>'phone'
    WHERE id = NEW.id;
    RETURN NEW;
END;
$function$
;



CREATE OR REPLACE FUNCTION public.initialize_mechanic_verification_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Create the tracking row in verifications automatically
  INSERT INTO public.mechanic_verifications (mechanic_id, status, created_at)
  VALUES (NEW.user_id, 'pending', NOW())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = user_uuid and role = 'admin');
$function$
;

CREATE OR REPLACE FUNCTION public.is_mechanic(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = user_uuid and role = 'mechanic');
$function$
;

CREATE OR REPLACE FUNCTION public.log_request_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.request_status_history (request_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_notification_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.user_id = new.profile_id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_rescue_request_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Auto-stamp state updates when the frontend alters the status string
  if new.status = 'en_route' and old.status != 'en_route' then
    new.en_route_at = now();
  elsif new.status = 'arrived' and old.status != 'arrived' then
    new.arrived_at = now();
  elsif new.status = 'cancelled' and old.status != 'cancelled' then
    new.cancelled_at = now();
    
    -- SYSTEM PROTECTION: Enforce that the user cannot spoof who cancelled it
    -- If the frontend forgot to pass cancelled_by, fallback directly to the active session user
    if new.cancelled_by is null then
      new.cancelled_by = auth.uid();
    -- If they passed a mismatching ID, ensure they are an admin, otherwise overwrite it with the real user
    elsif new.cancelled_by != auth.uid() and (auth.jwt() ->> 'role') != 'admin' then
      new.cancelled_by = auth.uid();
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_preferences_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_and_stamp_profile_reviews()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- If the status is transitioning out of pending, enforce security checks
  if new.status != 'pending' and old.status = 'pending' then
    
    -- 1. Hard check: Ensure the actor is actually an admin in the system
    if (select role from public.profiles where id = auth.uid()) != 'admin' then
      raise exception 'Access Denied: Only platform administrators can approve or reject change requests.';
    end if;

    -- 2. Automate reviewer data injection using un-spoofable backend session context
    new.reviewed_by = auth.uid();
    new.reviewed_at = now();
  end if;

  return new;
end;
$function$
;

create or replace view "public"."mechanic_public" as  SELECT user_id,
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

grant delete on table "public"."admin_profiles" to "anon";

grant insert on table "public"."admin_profiles" to "anon";

grant references on table "public"."admin_profiles" to "anon";

grant select on table "public"."admin_profiles" to "anon";

grant trigger on table "public"."admin_profiles" to "anon";

grant truncate on table "public"."admin_profiles" to "anon";

grant update on table "public"."admin_profiles" to "anon";

grant delete on table "public"."admin_profiles" to "authenticated";

grant insert on table "public"."admin_profiles" to "authenticated";

grant references on table "public"."admin_profiles" to "authenticated";

grant select on table "public"."admin_profiles" to "authenticated";

grant trigger on table "public"."admin_profiles" to "authenticated";

grant truncate on table "public"."admin_profiles" to "authenticated";

grant update on table "public"."admin_profiles" to "authenticated";

grant delete on table "public"."admin_profiles" to "service_role";

grant insert on table "public"."admin_profiles" to "service_role";

grant references on table "public"."admin_profiles" to "service_role";

grant select on table "public"."admin_profiles" to "service_role";

grant trigger on table "public"."admin_profiles" to "service_role";

grant truncate on table "public"."admin_profiles" to "service_role";

grant update on table "public"."admin_profiles" to "service_role";

grant delete on table "public"."ai_diagnostics" to "anon";

grant insert on table "public"."ai_diagnostics" to "anon";

grant references on table "public"."ai_diagnostics" to "anon";

grant select on table "public"."ai_diagnostics" to "anon";

grant trigger on table "public"."ai_diagnostics" to "anon";

grant truncate on table "public"."ai_diagnostics" to "anon";

grant update on table "public"."ai_diagnostics" to "anon";

grant delete on table "public"."ai_diagnostics" to "authenticated";

grant insert on table "public"."ai_diagnostics" to "authenticated";

grant references on table "public"."ai_diagnostics" to "authenticated";

grant select on table "public"."ai_diagnostics" to "authenticated";

grant trigger on table "public"."ai_diagnostics" to "authenticated";

grant truncate on table "public"."ai_diagnostics" to "authenticated";

grant update on table "public"."ai_diagnostics" to "authenticated";

grant delete on table "public"."ai_diagnostics" to "service_role";

grant insert on table "public"."ai_diagnostics" to "service_role";

grant references on table "public"."ai_diagnostics" to "service_role";

grant select on table "public"."ai_diagnostics" to "service_role";

grant trigger on table "public"."ai_diagnostics" to "service_role";

grant truncate on table "public"."ai_diagnostics" to "service_role";

grant update on table "public"."ai_diagnostics" to "service_role";

grant delete on table "public"."blocked_emails" to "anon";

grant insert on table "public"."blocked_emails" to "anon";

grant select on table "public"."blocked_emails" to "anon";

grant update on table "public"."blocked_emails" to "anon";

grant delete on table "public"."blocked_emails" to "authenticated";

grant insert on table "public"."blocked_emails" to "authenticated";

grant select on table "public"."blocked_emails" to "authenticated";

grant update on table "public"."blocked_emails" to "authenticated";

grant delete on table "public"."blocked_emails" to "service_role";

grant insert on table "public"."blocked_emails" to "service_role";

grant select on table "public"."blocked_emails" to "service_role";

grant update on table "public"."blocked_emails" to "service_role";

grant delete on table "public"."driver_profiles" to "anon";

grant insert on table "public"."driver_profiles" to "anon";

grant select on table "public"."driver_profiles" to "anon";

grant update on table "public"."driver_profiles" to "anon";

grant delete on table "public"."driver_profiles" to "authenticated";

grant insert on table "public"."driver_profiles" to "authenticated";

grant select on table "public"."driver_profiles" to "authenticated";

grant update on table "public"."driver_profiles" to "authenticated";

grant delete on table "public"."driver_profiles" to "service_role";

grant insert on table "public"."driver_profiles" to "service_role";

grant select on table "public"."driver_profiles" to "service_role";

grant update on table "public"."driver_profiles" to "service_role";

grant delete on table "public"."fuel_ev_stations" to "anon";

grant insert on table "public"."fuel_ev_stations" to "anon";

grant select on table "public"."fuel_ev_stations" to "anon";

grant update on table "public"."fuel_ev_stations" to "anon";

grant delete on table "public"."fuel_ev_stations" to "authenticated";

grant insert on table "public"."fuel_ev_stations" to "authenticated";

grant select on table "public"."fuel_ev_stations" to "authenticated";

grant update on table "public"."fuel_ev_stations" to "authenticated";

grant delete on table "public"."fuel_ev_stations" to "service_role";

grant insert on table "public"."fuel_ev_stations" to "service_role";

grant select on table "public"."fuel_ev_stations" to "service_role";

grant update on table "public"."fuel_ev_stations" to "service_role";

grant delete on table "public"."issue_reports" to "anon";

grant insert on table "public"."issue_reports" to "anon";

grant select on table "public"."issue_reports" to "anon";

grant update on table "public"."issue_reports" to "anon";

grant delete on table "public"."issue_reports" to "authenticated";

grant insert on table "public"."issue_reports" to "authenticated";

grant select on table "public"."issue_reports" to "authenticated";

grant update on table "public"."issue_reports" to "authenticated";

grant delete on table "public"."issue_reports" to "service_role";

grant insert on table "public"."issue_reports" to "service_role";

grant select on table "public"."issue_reports" to "service_role";

grant update on table "public"."issue_reports" to "service_role";

grant delete on table "public"."mechanic_documents" to "anon";

grant insert on table "public"."mechanic_documents" to "anon";

grant select on table "public"."mechanic_documents" to "anon";

grant update on table "public"."mechanic_documents" to "anon";

grant delete on table "public"."mechanic_documents" to "authenticated";

grant insert on table "public"."mechanic_documents" to "authenticated";

grant select on table "public"."mechanic_documents" to "authenticated";

grant update on table "public"."mechanic_documents" to "authenticated";

grant delete on table "public"."mechanic_documents" to "service_role";

grant insert on table "public"."mechanic_documents" to "service_role";

grant select on table "public"."mechanic_documents" to "service_role";

grant update on table "public"."mechanic_documents" to "service_role";

grant delete on table "public"."mechanic_locations" to "anon";

grant insert on table "public"."mechanic_locations" to "anon";

grant select on table "public"."mechanic_locations" to "anon";

grant update on table "public"."mechanic_locations" to "anon";

grant delete on table "public"."mechanic_locations" to "authenticated";

grant insert on table "public"."mechanic_locations" to "authenticated";

grant select on table "public"."mechanic_locations" to "authenticated";

grant update on table "public"."mechanic_locations" to "authenticated";

grant delete on table "public"."mechanic_locations" to "service_role";

grant insert on table "public"."mechanic_locations" to "service_role";

grant select on table "public"."mechanic_locations" to "service_role";

grant update on table "public"."mechanic_locations" to "service_role";

grant delete on table "public"."mechanic_profiles" to "anon";

grant insert on table "public"."mechanic_profiles" to "anon";

grant select on table "public"."mechanic_profiles" to "anon";

grant update on table "public"."mechanic_profiles" to "anon";

grant delete on table "public"."mechanic_profiles" to "authenticated";

grant insert on table "public"."mechanic_profiles" to "authenticated";

grant select on table "public"."mechanic_profiles" to "authenticated";

grant update on table "public"."mechanic_profiles" to "authenticated";

grant delete on table "public"."mechanic_profiles" to "service_role";

grant insert on table "public"."mechanic_profiles" to "service_role";

grant select on table "public"."mechanic_profiles" to "service_role";

grant update on table "public"."mechanic_profiles" to "service_role";

grant delete on table "public"."mechanic_verifications" to "anon";

grant insert on table "public"."mechanic_verifications" to "anon";

grant select on table "public"."mechanic_verifications" to "anon";

grant update on table "public"."mechanic_verifications" to "anon";

grant delete on table "public"."mechanic_verifications" to "authenticated";

grant insert on table "public"."mechanic_verifications" to "authenticated";

grant select on table "public"."mechanic_verifications" to "authenticated";

grant update on table "public"."mechanic_verifications" to "authenticated";

grant delete on table "public"."mechanic_verifications" to "service_role";

grant insert on table "public"."mechanic_verifications" to "service_role";

grant select on table "public"."mechanic_verifications" to "service_role";

grant update on table "public"."mechanic_verifications" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."profile_change_requests" to "anon";

grant insert on table "public"."profile_change_requests" to "anon";

grant select on table "public"."profile_change_requests" to "anon";

grant update on table "public"."profile_change_requests" to "anon";

grant delete on table "public"."profile_change_requests" to "authenticated";

grant insert on table "public"."profile_change_requests" to "authenticated";

grant select on table "public"."profile_change_requests" to "authenticated";

grant update on table "public"."profile_change_requests" to "authenticated";

grant delete on table "public"."profile_change_requests" to "service_role";

grant insert on table "public"."profile_change_requests" to "service_role";

grant select on table "public"."profile_change_requests" to "service_role";

grant update on table "public"."profile_change_requests" to "service_role";

grant delete on table "public"."profile_preferences" to "anon";

grant insert on table "public"."profile_preferences" to "anon";

grant select on table "public"."profile_preferences" to "anon";

grant update on table "public"."profile_preferences" to "anon";

grant delete on table "public"."profile_preferences" to "authenticated";

grant insert on table "public"."profile_preferences" to "authenticated";

grant select on table "public"."profile_preferences" to "authenticated";

grant update on table "public"."profile_preferences" to "authenticated";

grant delete on table "public"."profile_preferences" to "service_role";

grant insert on table "public"."profile_preferences" to "service_role";

grant select on table "public"."profile_preferences" to "service_role";

grant update on table "public"."profile_preferences" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."request_reviews" to "anon";

grant insert on table "public"."request_reviews" to "anon";

grant select on table "public"."request_reviews" to "anon";

grant update on table "public"."request_reviews" to "anon";

grant delete on table "public"."request_reviews" to "authenticated";

grant insert on table "public"."request_reviews" to "authenticated";

grant select on table "public"."request_reviews" to "authenticated";

grant update on table "public"."request_reviews" to "authenticated";

grant delete on table "public"."request_reviews" to "service_role";

grant insert on table "public"."request_reviews" to "service_role";

grant select on table "public"."request_reviews" to "service_role";

grant update on table "public"."request_reviews" to "service_role";

grant delete on table "public"."request_status_history" to "anon";

grant insert on table "public"."request_status_history" to "anon";

grant select on table "public"."request_status_history" to "anon";

grant update on table "public"."request_status_history" to "anon";

grant delete on table "public"."request_status_history" to "authenticated";

grant insert on table "public"."request_status_history" to "authenticated";

grant select on table "public"."request_status_history" to "authenticated";

grant update on table "public"."request_status_history" to "authenticated";

grant delete on table "public"."request_status_history" to "service_role";

grant insert on table "public"."request_status_history" to "service_role";

grant select on table "public"."request_status_history" to "service_role";

grant update on table "public"."request_status_history" to "service_role";

grant delete on table "public"."rescue_requests" to "anon";

grant insert on table "public"."rescue_requests" to "anon";

grant select on table "public"."rescue_requests" to "anon";

grant update on table "public"."rescue_requests" to "anon";

grant delete on table "public"."rescue_requests" to "authenticated";

grant insert on table "public"."rescue_requests" to "authenticated";

grant select on table "public"."rescue_requests" to "authenticated";

grant update on table "public"."rescue_requests" to "authenticated";

grant delete on table "public"."rescue_requests" to "service_role";

grant insert on table "public"."rescue_requests" to "service_role";

grant select on table "public"."rescue_requests" to "service_role";

grant update on table "public"."rescue_requests" to "service_role";


  create policy "Diagnostic records viewing rule"
  on "public"."ai_diagnostics"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rescue_requests r
  WHERE ((r.id = ai_diagnostics.request_id) AND ((r.driver_id = auth.uid()) OR (r.mechanic_id = auth.uid()) OR public.is_admin(auth.uid()))))));



  create policy "Drivers profiles read access"
  on "public"."driver_profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Drivers profiles updates"
  on "public"."driver_profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Admins can read all reports"
  on "public"."issue_reports"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role)))));



  create policy "Admins can update report status"
  on "public"."issue_reports"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role)))));



  create policy "Users can read own reports"
  on "public"."issue_reports"
  as permissive
  for select
  to authenticated
using ((reporter_id = auth.uid()));



  create policy "Admins see all documents, Mechanics see own"
  on "public"."mechanic_documents"
  as permissive
  for select
  to authenticated
using (((auth.uid() = mechanic_id) OR public.is_admin(auth.uid())));



  create policy "Allow users to insert their own documents"
  on "public"."mechanic_documents"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = mechanic_id));



  create policy "Allow users to view their own document records"
  on "public"."mechanic_documents"
  as permissive
  for select
  to authenticated
using ((auth.uid() = mechanic_id));



  create policy "Mechanics upload own documents"
  on "public"."mechanic_documents"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = mechanic_id));



  create policy "Admins and authorized driver can see assigned mechanic traces"
  on "public"."mechanic_locations"
  as permissive
  for select
  to authenticated
using ((public.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.rescue_requests r
  WHERE ((r.mechanic_id = mechanic_locations.mechanic_id) AND (r.driver_id = auth.uid()) AND (r.status = ANY (ARRAY['accepted'::public.request_status, 'en_route'::public.request_status, 'arrived'::public.request_status, 'in_progress'::public.request_status])))))));



  create policy "Mechanics stream location tracks"
  on "public"."mechanic_locations"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = mechanic_id));



  create policy "Allow mechanics to update their own profile"
  on "public"."mechanic_profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Mechanic profiles read access"
  on "public"."mechanic_profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Mechanic profiles updates"
  on "public"."mechanic_profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Admins see all verifications, Mechanics see own"
  on "public"."mechanic_verifications"
  as permissive
  for select
  to authenticated
using (((auth.uid() = mechanic_id) OR public.is_admin(auth.uid())));



  create policy "Only Admins can issue mutations on verifications"
  on "public"."mechanic_verifications"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Participants can read request messages"
  on "public"."messages"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rescue_requests r
  WHERE ((r.id = messages.request_id) AND ((r.driver_id = auth.uid()) OR (r.mechanic_id = auth.uid()) OR public.is_admin(auth.uid()))))));



  create policy "Users can post to their respective sessions"
  on "public"."messages"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.rescue_requests r
  WHERE ((r.id = messages.request_id) AND ((r.driver_id = auth.uid()) OR (r.mechanic_id = auth.uid())))))));



  create policy "Users interact with their own notifications"
  on "public"."notifications"
  as permissive
  for all
  to authenticated
using ((auth.uid() = profile_id))
with check ((auth.uid() = profile_id));



  create policy "Users can update or save their own custom app preferences"
  on "public"."profile_preferences"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own custom app preferences"
  on "public"."profile_preferences"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Authenticated users can read all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Profiles are viewable by authenticated users"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Profiles can be managed by admins"
  on "public"."profiles"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Profiles can be updated by owners"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Drivers submit reviews for their orders"
  on "public"."request_reviews"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = driver_id));



  create policy "Reviews read authorization rule"
  on "public"."request_reviews"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to insert status history"
  on "public"."request_status_history"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to read status history"
  on "public"."request_status_history"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authorized parties can update requests"
  on "public"."rescue_requests"
  as permissive
  for update
  to authenticated
using (((auth.uid() = driver_id) OR (auth.uid() = mechanic_id) OR public.is_admin(auth.uid())));



  create policy "Drivers can post rescue requests"
  on "public"."rescue_requests"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = driver_id));



  create policy "Rescue requests visibility matrix"
  on "public"."rescue_requests"
  as permissive
  for select
  to authenticated
using (((auth.uid() = driver_id) OR (auth.uid() = mechanic_id) OR public.is_admin(auth.uid()) OR ((status = 'pending'::public.request_status) AND public.is_mechanic(auth.uid()))));



  create policy "Admins can update change requests"
  on "public"."profile_change_requests"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role)))));



  create policy "Users can view own change requests"
  on "public"."profile_change_requests"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role))))));


CREATE TRIGGER trg_issue_reports_updated_at BEFORE UPDATE ON public.issue_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_mechanic_profile_created AFTER INSERT ON public.mechanic_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_mechanic_verification();

CREATE TRIGGER trg_auto_create_verification_row AFTER INSERT ON public.mechanic_profiles FOR EACH ROW EXECUTE FUNCTION public.initialize_mechanic_verification_row();

CREATE TRIGGER trg_sync_notification_user_id BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.sync_notification_user_id();

CREATE TRIGGER trigger_update_profile_preferences_timestamp BEFORE UPDATE ON public.profile_preferences FOR EACH ROW EXECUTE FUNCTION public.update_profile_preferences_timestamp();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_request_status_history_log AFTER INSERT OR UPDATE ON public.rescue_requests FOR EACH ROW EXECUTE FUNCTION public.log_request_status_change();

CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.rescue_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

drop trigger if exists "blocked_email_signup_trigger" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TRIGGER on_auth_user_phone_update AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_sync_user_phone();

CREATE TRIGGER blocked_email_signup_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.blocked_email_signup_guard();


  create policy "Allow authenticated uploads"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'mechanic-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Allow authenticated users to upload avatars"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'avatars'::text));



  create policy "Allow public avatar access"
  on "storage"."objects"
  as permissive
  for select
  to authenticated, anon
using ((bucket_id = 'avatars'::text));



  create policy "Allow users to update their own avatars"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'avatars'::text))
with check ((bucket_id = 'avatars'::text));



  create policy "Allow users to view own documents"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'mechanic-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

drop type if exists "public"."request_status__old_version_to_be_dropped";
drop type if exists "public"."user_role__old_version_to_be_dropped";
drop type if exists "public"."verification_status__old_version_to_be_dropped";




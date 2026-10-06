# RoadRescue Database Schema Reference

> Source of Truth: PostgreSQL 15+ with PostGIS Extension applied via migrations in `supabase/migrations/`.

---

## 1. Global Custom Types & Enums

```sql
CREATE TYPE public.user_role AS ENUM ('driver', 'mechanic', 'admin');

CREATE TYPE public.request_status AS ENUM (
  'pending',
  'offered',
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE public.verification_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'more_info'
);

CREATE TYPE public.notification_type AS ENUM (
  'system',
  'request',
  'chat',
  'verification'
);
```

---

## 2. Table Specifications

### 2.1 `profiles`
Central user table linked 1:1 with Supabase Auth (`auth.users`).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE` | User unique ID |
| `role` | `public.user_role` | `NOT NULL` | System role (`driver`, `mechanic`, `admin`) |
| `full_name` | `text` | `DEFAULT ''` | Display name |
| `email` | `text` | `DEFAULT ''` | Registered email |
| `phone` | `text` | `DEFAULT ''` | Contact phone number |
| `avatar_url` | `text` | `NULLABLE` | Profile image URL |
| `is_active` | `boolean` | `DEFAULT true` | Account active state |
| `created_at` | `timestamptz` | `DEFAULT now()` | Account creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

---

### 2.2 `mechanic_profiles`
Mechanic-specific credentials, verification status, and geospatial coordinates.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | `PRIMARY KEY, REFERENCES profiles(id) ON DELETE CASCADE` | Mechanic ID |
| `business_name` | `text` | `DEFAULT ''` | Registered garage/business name |
| `years_experience` | `integer` | `DEFAULT 0` | Professional experience |
| `specializations` | `jsonb` | `DEFAULT '[]'::jsonb` | Specialization tags |
| `verification_status`| `text` | `DEFAULT 'pending'` | Status (`pending`, `approved`, `rejected`) |
| `is_available` | `boolean` | `DEFAULT false` | Duty toggle (online/offline) |
| `rating_avg` | `numeric(3,2)`| `DEFAULT 5.0` | Recalculated average rating |
| `rating_count` | `integer` | `DEFAULT 0` | Total completed ratings count |
| `service_mode` | `text` | `DEFAULT 'mobile'` | Service type (`mobile`, `fixed_location`, `hybrid`) |
| `location_label` | `text` | `NULLABLE` | Human-readable service area (e.g. "Airport Area") |
| `current_location`| `geometry(Point, 4326)` | `NULLABLE` | Live GPS location (indexed via GiST) |
| `base_location` | `geometry(Point, 4326)` | `NULLABLE` | Permanent workshop location |
| `show_base_location_offline` | `boolean` | `DEFAULT false` | Opt-in to appear in directory while offline |
| `location_updated_at` | `timestamptz` | `NULLABLE` | Timestamp of last GPS ping |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

---

### 2.3 `driver_profiles`
Driver vehicle specifications and emergency contacts.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | `PRIMARY KEY, REFERENCES profiles(id) ON DELETE CASCADE` | Driver ID |
| `vehicle_make` | `text` | `NULLABLE` | Vehicle make (e.g. Toyota) |
| `vehicle_model` | `text` | `NULLABLE` | Vehicle model (e.g. Corolla) |
| `vehicle_year` | `integer` | `NULLABLE` | Vehicle year |
| `vehicle_color` | `text` | `NULLABLE` | Vehicle color |
| `vehicle_plate` | `text` | `NULLABLE` | Vehicle registration plate |
| `emergency_contact_name` | `text` | `NULLABLE` | Emergency contact full name |
| `emergency_contact_phone` | `text` | `NULLABLE` | Emergency contact phone |
| `home_area` | `text` | `NULLABLE` | Residential area |
| `preferences` | `jsonb` | `DEFAULT '{}'::jsonb` | Vehicle preferences |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

---

### 2.4 `rescue_requests`
Core operational entity managing the vehicle breakdown lifecycle.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Rescue request ID |
| `driver_id` | `uuid` | `REFERENCES profiles(id) ON DELETE CASCADE` | Requesting driver |
| `mechanic_id` | `uuid` | `NULLABLE, REFERENCES profiles(id) ON DELETE SET NULL` | Assigned mechanic |
| `status` | `public.request_status` | `DEFAULT 'pending'` | Current lifecycle status |
| `service_type` | `text` | `DEFAULT 'other'` | Breakdown service category |
| `problem_description` | `text` | `DEFAULT ''` | Driver's problem description |
| `incident_address` | `text` | `NULLABLE` | Reverse-geocoded or entered address |
| `incident_location` | `geometry(Point, 4326)` | `NULLABLE` | PostGIS spatial point `POINT(lng lat)` |
| `vehicle_make` | `text` | `NULLABLE` | Vehicle make |
| `vehicle_model` | `text` | `NULLABLE` | Vehicle model |
| `vehicle_year` | `integer` | `NULLABLE` | Vehicle year |
| `vehicle_color` | `text` | `NULLABLE` | Vehicle color |
| `vehicle_plate` | `text` | `NULLABLE` | Vehicle license plate |
| `vehicle_image_url` | `text` | `NULLABLE` | Attached breakdown photo URL |
| `ai_diagnostic_result` | `jsonb` | `NULLABLE` | Structured AI diagnostic output |
| `accepted_at` | `timestamptz` | `NULLABLE` | Timestamp when claimed |
| `en_route_at` | `timestamptz` | `NULLABLE` | Timestamp when mechanic started driving |
| `arrived_at` | `timestamptz` | `NULLABLE` | Timestamp when mechanic arrived on-site |
| `started_at` | `timestamptz` | `NULLABLE` | Timestamp when repair started |
| `completed_at` | `timestamptz` | `NULLABLE` | Timestamp when job completed |
| `cancelled_at` | `timestamptz` | `NULLABLE` | Timestamp when cancelled |
| `cancelled_by` | `uuid` | `NULLABLE, REFERENCES profiles(id)` | User who cancelled |
| `cancellation_reason` | `text` | `NULLABLE` | Reason for cancellation |
| `completion_notes` | `text` | `NULLABLE` | Mechanic's final job notes |
| `performed_services` | `text[]` | `NULLABLE` | List of completed services |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

---

### 2.5 `messages`
In-app communication scoped to active rescue requests.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Message ID |
| `request_id` | `uuid` | `REFERENCES rescue_requests(id) ON DELETE CASCADE` | Associated request |
| `sender_id` | `uuid` | `REFERENCES profiles(id) ON DELETE CASCADE` | Message author |
| `message` | `text` | `NOT NULL` | Text body |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

---

### 2.6 `notifications`
In-app user notifications.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Notification ID |
| `profile_id` | `uuid` | `REFERENCES profiles(id) ON DELETE CASCADE` | Recipient user |
| `type` | `text` | `DEFAULT 'system'` | Notification category |
| `title` | `text` | `DEFAULT ''` | Short title |
| `body` | `text` | `DEFAULT ''` | Notification message |
| `request_id` | `uuid` | `NULLABLE, REFERENCES rescue_requests(id)` | Linked rescue ticket |
| `is_read` | `boolean` | `DEFAULT false` | Read/unread flag |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

---

### 2.7 `request_reviews`
Driver reviews and ratings submitted upon job completion.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Review ID |
| `request_id` | `uuid` | `UNIQUE, REFERENCES rescue_requests(id) ON DELETE CASCADE` | Target rescue job |
| `driver_id` | `uuid` | `REFERENCES profiles(id)` | Reviewing driver |
| `mechanic_id` | `uuid` | `REFERENCES profiles(id)` | Rated mechanic |
| `rating` | `integer` | `CHECK (rating >= 1 AND rating <= 5)` | 1 to 5 star rating |
| `review` | `text` | `NULLABLE` | Written feedback |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

---

### 2.8 `blocked_emails`
Permanent registration blocklist for rejected or suspended mechanics.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `email` | `text` | `PRIMARY KEY` | Blacklisted email address |
| `reason` | `text` | `NULLABLE` | Administrative reason |
| `blocked_at` | `timestamptz` | `DEFAULT now()` | Block timestamp |

---

### 2.9 `fuel_ev_stations`
Public directory of refueling and EV charging stations across Ghana.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Station ID |
| `name` | `text` | `NOT NULL` | Station brand and name |
| `station_type` | `text` | `CHECK (station_type IN ('fuel', 'ev'))` | Station type |
| `location` | `geometry(Point, 4326)` | `NOT NULL` | PostGIS spatial point |
| `address` | `text` | `NULLABLE` | Address string |

---

## 3. Spatial Matching Stored Procedure

```sql
CREATE OR REPLACE FUNCTION get_nearby_verified_mechanics(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  business_name text,
  rating_avg numeric,
  distance_km double precision,
  service_mode text,
  location_label text,
  email text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    mp.user_id,
    p.full_name,
    mp.business_name,
    mp.rating_avg,
    ROUND((ST_Distance(
      COALESCE(mp.current_location, mp.base_location)::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000)::numeric, 2)::double precision AS distance_km,
    mp.service_mode,
    mp.location_label,
    p.email
  FROM mechanic_profiles mp
  JOIN profiles p ON p.id = mp.user_id
  WHERE mp.verification_status = 'approved'
    AND (
      (mp.is_available = true AND mp.current_location IS NOT NULL)
      OR (mp.show_base_location_offline = true AND mp.base_location IS NOT NULL)
    )
    AND ST_DWithin(
      COALESCE(mp.current_location, mp.base_location)::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
$$;
```

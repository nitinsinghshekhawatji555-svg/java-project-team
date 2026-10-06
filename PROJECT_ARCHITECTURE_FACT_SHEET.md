# RoadRescue — Project Architecture and Security Fact Sheet
> **Optimized for NotebookLM Ingestion & Viva Defense**  
> Last updated: June 2026

---

## 1. Executive Summary & Problem Statement

**RoadRescue** is a real-time roadside assistance platform connecting stranded drivers with nearby verified mechanics. It uses Next.js 16 App Router as the front-end and API layer, with a Supabase PostgreSQL instance handling spatial calculation layers, authentication events, and WebSocket state broadcasts.

### Key Pain Points Solved
*   **Response Windows**: Traditional breakdown support relies on manual calls and uncoordinated dispatch. RoadRescue matches drivers with the closest verified mechanic in seconds using PostGIS radial indexing.
*   **Diagnostic Gaps**: Drivers often struggle to describe breakdown symptoms. An in-app diagnostic chat reads natural language and queries Google Gemini 2.5 Flash, grok, OpenRouter and lastly a rulebase fallback to generate structured diagnostics with instructions and severity ratings.
*   **Security Auditing**: Traditional systems lack transparent coordination. Real-time updates and RLS policies ensure data security, scoping information to request participants.
*   **Operations Gating**: Unverified mechanics are blocked from claiming jobs. Blacklisted emails are blocked at the database level to prevent re-registration.

---

## 2. Dynamic Feature Sets & Parity

### A. Asynchronous Request Creation & Dispatch Matching
*   **Driver Request**: When a driver creates a request, it is saved immediately to the database and broadcasted to the socket channel, returning a `201` status to the client without blocking.
*   **Background Dispatching**: The system searches and notifies mechanics asynchronously. The PostGIS RPC function `get_nearby_verified_mechanics(request_latitude, request_longitude, search_radius_km)` queries mechanics within a 10 km radius.
*   **Transactional Notification**: Matching records and automated emails (Resend) are sent to available, verified mechanics in the background.

### B. Map Coordinations & Refueling Grids
*   **Leaflet Integration**: Renders maps using OpenStreetMap tiles (no API keys required), enforcing standard zoom boundaries (`maxZoom={19}`, `minZoom={3}`, `fitBounds` capped at `maxZoom: 16`).
*   **Unified Full-Bleed Map Architecture**: Driver Explore (`/dashboard/driver/explore`) and Mechanic Navigation (`/dashboard/mechanic/navigation`) share a standardized layout container (`FullBleedMapShell.jsx`), presenting a 100% viewport map canvas layered with floating status pills, recenter controls, and bottom inspection sheets.
*   **Mobile Map Separation**: To optimize mechanic operational focus on mobile devices, live GPS tracking maps are isolated to the dedicated Navigation tab, allowing the primary Service Console dashboard to prioritize actionable feeds (Active Jobs and Urgent Incident Broadcasts).
*   **Dynamic Fuel/EV Stations**: Replaces hardcoded mock locations with a live Supabase query to `public.fuel_ev_stations`. The map displays stations (orange for fuel, violet for EV) and allows drivers to pin breakdowns directly to them.
*   **Bidirectional Tracker**: When a job is accepted, hooks update the mechanic's availability (`is_available = false`). While `en_route` or `in_progress`, the driver tracks the mechanic's live location via WebSockets. When toggled offline, geolocation watchers halt and static shop base coordinates or offline standby indicators are displayed.

### C. Secure Request Cancellation Guard
*   **State Control**: Driver and mechanic cancellation actions are restricted to `pending` or `accepted` states.
*   **Enforcement Layers**: The Next.js API endpoint `/api/requests/[id]/status` checks the database status before executing changes. If a request is already `en_route`, `arrived`, or `in_progress`, the request is rejected with a `403 Forbidden` error. This safety check is also enforced in the core database library function `updateRequestStatus`.

---

## 3. Database Schema Specification (6 migrations blueprint)

The database schema is organized into 6 sequential migrations:

1.  **`0001_extensions_and_types.sql`**: Initializes PostGIS (`postgis`) and cryptography (`pgcrypto`) extensions. Declares global ENUM types: `user_role`, `request_status`, `verification_status`, `notification_type`, `service_type`, and `report_category`.
2.  **`0002_user_and_mechanic_profiles.sql`**: Creates `profiles`, `driver_profiles`, and `mechanic_profiles` tables. Configures the `handles_new_auth_user()` trigger to automatically create role-specific sub-profiles upon user signup.
3.  **`0003_rescue_requests_schema.sql`**: Creates the `rescue_requests` table with an `incident_location` spatial column (`GEOGRAPHY(Point, 4326)`) and `ai_diagnostic_result` (`JSONB`). Sets up GIST spatial indexing.
4.  **`0004_tracking_and_history.sql`**: Configures historical tables (`request_status_history`, `messages`, `notifications`, `mechanic_locations`, `system_reports`, `request_reviews`, `blocked_emails`, `issue_reports`, `fuel_ev_stations`, `profile_preferences`, `profile_change_requests`). Attaches the `blocked_email_signup_trigger` to block blacklisted emails and registers tables under the `supabase_realtime` publication.
5.  **`0005_stored_procedures.sql`**: Creates the `get_nearby_verified_mechanics` RPC function with correct coordinate parameter naming signatures.
6.  **`0006_security_and_rls_policies.sql`**: Enables RLS on all 18 tables and applies explicit SELECT, INSERT, UPDATE, and DELETE policies for both `authenticated` and `anon` roles.

---

## 4. Multi-Layer Security Architecture

*   **Authentication**: Managed via Supabase Auth with JWT cookies. Session validation uses `auth.getUser()`.
*   **API Guards**: The Next.js API layer uses route guards (`rbac.js`) like `requireAdmin()`, `requireMechanic()`, or `requireDriver()` before executing business logic.
*   **Row-Level Security (RLS)**: Enforced at the PostgreSQL engine level. Driver access is scoped to their requests, and location-sharing is restricted to active assignments.
*   **Secret Management**: Server-side keys (like `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `RESEND_API_KEY`) lack the `NEXT_PUBLIC_` prefix to prevent exposure to the client.

---

*End of Fact Sheet*

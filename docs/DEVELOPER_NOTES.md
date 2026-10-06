# Developer Notes — Recent Changes (summary)

This file documents recent implementation and behavior changes that affect development, testing, and deployment.

Auth & Profiles
- `AuthProvider` merges role-specific tables (`driver_profiles`, `mechanic_profiles`) into the main `profile` object. This flattens vehicle and mechanic-specific fields so UI components can read `profile.vehicle_make`, `profile.total_earnings`, etc.
- The app will use a local mock Supabase client when either `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, or when `NEXT_PUBLIC_USE_MOCK_AUTH=true`.

Mechanic Approval Lifecycle
- `updateRequestStatus()` validates `mechanic_profiles.verification_status === 'approved'` before allowing acceptance
- Admin rejection inserts email into `blocked_emails` table and deletes auth user
- Rejected mechanics cannot sign up again due to trigger on `blocked_emails`

Routing & UX
- Login/Register flows require DB-backed role before auto-routing into role dashboards
- Sign-out: uses client-side navigation (`router.replace('/auth/login')` after `signOut()`

Mechanic Dashboard & Navigation Architecture
- Live tracking map on mobile is removed from `/dashboard/mechanic` (Service Console) to prioritize action-oriented cards (Active Assigned Jobs, Urgent Broadcast Feed). Live tracking map functionality is hosted exclusively on `/dashboard/mechanic/navigation`.
- Dashboard counter cards ("Active Jobs", "Incoming Requests") render in a compact 2-column grid on mobile (`grid-cols-2 md:grid-cols-3`) with reduced padding and proportional fonts.
- "Operation Center" reference card is hidden on mobile below the `md` breakpoint (`hidden md:block`, 768px) to eliminate awkward trailing card slots and keep high-priority dispatch feeds immediately visible.
- Full-bleed map layout is standardized via the shared component `@/components/map/FullBleedMapShell.jsx`, used across both Driver Explore (`/dashboard/driver/explore`) and Mechanic Navigation (`/dashboard/mechanic/navigation`). It provides layered slots for top overlays, action controls, the 100% viewport Leaflet canvas, and floating bottom inspection drawers.

Duty Status & Location Broadcasting Guarantees
- Duty status (`is_available`) is the strict single source of truth for location broadcasting and map status labels.
- When `is_available === false`:
  - `useMechanicStatus` and `useBroadcastLocation` halt all `navigator.geolocation.watchPosition` watchers and disconnect live presence broadcast channels.
  - `RescueMap.jsx` footer and `navigation/page.jsx` status pill display `"Shop Base (Offline)"` or `"Offline (Standby)"` with static base coordinates, never active GPS broadcasting.
- Leaflet map instances enforce `maxZoom={19}` and `minZoom={3}` on `<MapContainer>` and `<TileLayer>`, with `fitBounds` capped at `maxZoom: 16` to prevent runtime zoom errors.

Layout & Accessibility
- Sidebar breakpoint changed from `lg` to `md` for better tablet support; related CSS/padding adjustments were added to main layout.
- Notifications dropdown: supports outside-click and Escape to close; notification items map to route URLs.
- Full-bleed pages (`/navigation`, `/explore`) disable outer dashboard container scrollbars via `isFullHeightPage` in `web/src/app/dashboard/layout.jsx`.

Developer checklist
- Ensure `.env.local` exists with Supabase keys to avoid using the mock client if the intent is to test against real data.
- When updating auth/profile behavior, update `src/providers/AuthProvider.jsx` and `src/lib/auth.js` and add tests for merged profile shapes.
- When creating full-viewport map views, wrap the Leaflet canvas with `FullBleedMapShell` rather than custom embedded card boxes.
- If adding new notification types, add a mapping in `src/components/layout/Notifications.jsx` (`getNotificationHref`).
- Profile preferences API: `/api/profile/preferences` handles GET (fetch) and PUT (update) for user theme, language, notification, and communication preferences.

Where to look
- Web app: `web/src/` — components, providers, lib
- Shared Map Components: `web/src/components/map/` (`FullBleedMapShell.jsx`, `RescueMap.jsx`, `MechanicClusterLayer.jsx`, `OverpassFuelLayer.jsx`)
- Server-side helpers: `web/src/app/api/` route handlers
- Database migrations: `supabase/migrations/`

Testing notes
- Seed data can be found in `supabase/migrations/20260521000008_seed_data.sql` for working test credentials and sample mechanics/drivers.

If anything in this file becomes out of date, update both this file and the relevant README(s).

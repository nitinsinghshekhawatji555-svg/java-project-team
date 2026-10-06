# RoadRescue — Web app (Developer README)

This README covers local development and a few recent developer-facing changes specific to the web application.

Quick start

1. Install dependencies
```bash
cd web
npm install
```

2. Add environment variables
Create `.env.local` in `web/` with the following values:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GEMINI_API_KEY=your_gemini_key
```
If the Supabase envs are missing the app falls back to a mock Supabase client (useful for offline UI work). To force mock behavior set `NEXT_PUBLIC_USE_MOCK_AUTH=true`.

3. Run locally
```bash
npm run dev
```

Build
```bash
npm run build
```

Developer notes (recent)
- Auth merging: `AuthProvider` now fetches and flattens `driver_profiles` and `mechanic_profiles` into the shared `profile` returned to the UI. This avoids missing fields on dashboards.
- Login/Register gating: login and register flows now require a DB-backed role before auto-routing into role dashboards. This prevents accidental auto-login as the mock 'driver'.
- Sign-out: uses client-side navigation (`router.replace('/auth/login')`) to avoid full reloads.
- Profile preferences API: `/api/profile/preferences` provides GET/PUT endpoints for user theme, language, notification, and communication preferences.
- Mechanic account page: provides comprehensive profile editing including avatar upload, business details, specializations, service radius, hourly rate, license info, and preference toggles.

Files to check when changing behavior
- `src/providers/AuthProvider.jsx`
- `src/lib/auth.js`
- `src/components/layout/Navbar.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/Notifications.jsx`
- `src/app/dashboard/mechanic/account/page.jsx`
- `src/app/api/profile/preferences/route.js`

If you change any of the above flows, please update this README and [docs/DEVELOPER_NOTES.md](../docs/DEVELOPER_NOTES.md).

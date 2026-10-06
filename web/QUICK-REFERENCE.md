# Quick Reference: RBAC & Navigation Setup

## RBAC System

### Three Layers of Protection

```
┌─────────────────────────────────────────────┐
│ Layer 1: COMPONENTS (Page Level)            │
│ Check: User role matches allowedRoles        │
│ Blocks: Cross-role page access               │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│ Layer 2: API ROUTES                         │
│ Check: User role matches endpoint           │
│ Blocks: Driver accessing /api/admin/stats   │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│ Layer 3: DATABASE                           │
│ Check: RLS policies filter data by role      │
│ Blocks: Unauthorized data access            │
└─────────────────────────────────────────────┘
```

---

## 📱 Navigation Structure

### Mobile (< 768px)

```
DRIVER                  MECHANIC                ADMIN
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 🏠 Home        │    │ 🔧 Jobs         │    │ 📊 Dashboard    │
│ 🤖 AI Assist   │    │ 📋 Requests     │    │ 🛠️  System      │
│ ⚡ Activity    │    │ 🧭 Navigation   │    │ 📈 Reports      │
│ 👤 Profile     │    │ ⚡ Activity    │    │ 👤 Profile      │
│ SOS (center)   │    └─────────────────┘    │ ⚙️  Settings    │
└─────────────────┘                        └─────────────────┘
```

All tabs contain nested routes:
- `/dashboard/driver/settings`
- `/dashboard/mechanic/job/[id]`
- `/dashboard/admin/reports`
- etc.

---

## 🔒 How to Protect a Route

### Protect API Endpoint

```javascript
import { requireDriver, createErrorResponse } from '@/lib/rbac'

export async function POST(request) {
  const result = await requireDriver()
  if (result.error) return createErrorResponse(result.error, result.status)
  
  const { user, profile } = result
  // Safe to proceed - user is verified driver
}
```

### Protect Entire Page

```jsx
import { RBACProtectedPage } from '@/components/auth/RBACProtected'

export default function DriverPage() {
  return (
    <RBACProtectedPage allowedRoles={['driver']}>
      <h1>Driver Dashboard</h1>
    </RBACProtectedPage>
  )
}
```

### Protect Page Section

```jsx
import { AdminOnly, DriverOnly } from '@/components/auth/RBACProtected'

export default function MixedPage() {
  return (
    <>
      <DriverOnly>
        <DriverContent />
      </DriverOnly>
      
      <AdminOnly>
        <AdminPanel />
      </AdminOnly>
    </>
  )
}
```

---

## 🚫 What's Blocked

| User | Tries | Result |
|------|-------|--------|
| Driver | `/dashboard/mechanic` | Redirect to /404 |
| Driver | `/api/admin/stats` | 403 Forbidden |
| Mechanic | Place new request | Component hidden + API 403 |
| User | Access `/dashboard/*` unauthenticated | Redirect to /auth/login |

---

## ✅ Security Guarantees

- [x] **Drivers see ONLY driver content**
  - Own requests, settings, profile
  - Cannot see mechanic garage or admin stats

- [x] **Mechanics see ONLY mechanic content**
  - Assigned jobs, availability, ratings
  - Cannot create requests or access admin

- [x] **Admins see EVERYTHING**
  - All users, requests, mechanics
  - Can view/edit platform settings

---

## 🧪 Quick Test

```bash
# Test 1: Can a driver visit /dashboard/mechanic?
1. Login as driver@roadrescue.gh
2. Manually visit: http://localhost:3000/dashboard/mechanic
3. Should redirect to: http://localhost:3000/404 ✅

# Test 2: Can API be accessed by wrong role?
curl -H "Authorization: Bearer DRIVER_TOKEN" \
     http://localhost:3000/api/admin/stats
# Should return 403 Forbidden ✅

# Test 3: Do nested routes work?
1. Login as driver
2. Click "Settings" tab (bottom nav)
3. Should navigate to: /dashboard/driver/settings ✅
4. Should show driver settings, not mechanic settings ✅
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/rbac.js` | RBAC protection functions |
| `components/auth/RBACProtected.jsx` | Component protection wrappers |
| `components/layout/BottomNav.jsx` | Mobile navigation (role-based tabs) |
| `components/map/FullBleedMapShell.jsx` | Shared full-viewport map layout with layered overlays |
| `ResponsiveWrappers.jsx` | MainContainer, MobileOnly, DesktopOnly |
| `MobileOptimized.jsx` | Mobile-friendly components |
| `RBAC-IMPLEMENTATION.md` | Full RBAC documentation |

---

## 🎯 Next Priority Checkpoints

1. **Verify all API routes use RBAC protection**
   - [x] `/api/admin/*` has `requireAdmin()`
   - [x] `/api/mechanics/*` has `requireMechanic()` 
   - [ ] `/api/requests/*` has `requireDriver()`

2. **Test cross-role access blocking**
   - [x] Driver can't access mechanic routes
   - [x] Mechanic can't call admin APIs
   - [x] Admin-only UIs are hidden for other roles

3. **Verify database RLS policies**
   - [x] Drivers see only own requests
   - [x] Mechanics see only assigned jobs
   - [x] Each role can only update own data

---

## ⚠️ Common Mistakes to Avoid

❌ Forget to check role in API route
❌ Rely only on component hiding (use RBACProtectedPage)
❌ Trust client-side role values
❌ Skip `RBACProtectedPage` wrapper on sensitive pages

✅ Always use `requireRole()` in APIs
✅ Use `RBACProtectedPage` for page protection
✅ Verify role server-side
✅ Log security events
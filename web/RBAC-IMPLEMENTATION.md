# Role-Based Access Control (RBAC) Implementation

## Overview

RoadRescue implements strict role-based access control across all layers:
- **Component-Level**: `RBACProtectedPage` wraps pages for role checks
- **API Routes**: Endpoint-level protection via `lib/rbac.js`
- **Database**: Row-level security (RLS) policies

---

## Role Hierarchy

```
┌─────────────────────────────────────────┐
│         RoadRescue RBAC Model           │
├─────────────────────────────────────────┤
│ Admin                                   │
│ ├─ Full platform access                 │
│ ├─ User management                      │
│ ├─ System configuration                 │
│ └─ Can view all requests & mechanics    │
├─────────────────────────────────────────┤
│ Mechanic                                │
│ ├─ Garage/job management                │
│ ├─ Can only see assigned requests       │
│ ├─ Cannot access driver/admin data      │
│ └─ Cannot create requests               │
├─────────────────────────────────────────┤
│ Driver                                  │
│ ├─ Create & manage rescue requests      │
│ ├─ Can only see own requests            │
│ ├─ Cannot access admin/mechanic data    │
│ └─ Cannot bid on jobs                   │
└─────────────────────────────────────────┘
```

---

## 1. Component-Level Protection (Pages)

### Route Protection
All protected dashboard routes use `RBACProtectedPage` wrapper in page components.

**Protected Routes:**
- `/dashboard/driver/*` → Requires `role = 'driver'` (via `RBACProtectedPage` wrapper)
- `/dashboard/mechanic/*` → Requires `role = 'mechanic'`
- `/dashboard/admin/*` → Requires `role = 'admin'`
- `/api/admin/*` → Requires `role = 'admin'`
- `/api/requests/*` → Requires `role = 'driver'` or `role = 'mechanic'`

### Security Features
- ✅ Strict role matching (no cross-role access)
- ✅ Unauthorized users redirected to `/404` (via `RBACProtectedPage`)
- ✅ Prevents direct URL access to other roles' dashboards

**Example:**
```
User: driver123 (role: driver)
Action: Visit /dashboard/mechanic
Result: Redirect → /404
Log: Console warning for cross-role access attempt
```

---

## 2. API Route Protection

### Using the RBAC Utilities

All API routes use the RBAC protection utilities in `lib/rbac.js`:

```javascript
import { requireDriver, requireAdmin, requireRoles, createErrorResponse } from '@/lib/rbac'

export async function POST(request) {
  const result = await requireDriver()
  if (result.error) {
    return createErrorResponse(result.error, result.status)
  }

  const { user, profile } = result
  // User is verified as driver, proceed with logic
}
```

### Available Protections

```javascript
// Driver-only endpoint
await requireDriver()

// Mechanic-only endpoint  
await requireMechanic()

// Admin-only endpoint
await requireAdmin()

// Multiple roles allowed
await requireRoles('driver,mechanic')

// Create error response
createErrorResponse('Forbidden', 403)
```

### Example: Protected API Route

```javascript
// app/api/requests/route.js
import { requireDriver } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const result = await requireDriver()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const { user, profile } = result
  
  // Only drivers can create requests
  const payload = await request.json()
  
  // Process with user.id as driver_id
  const response = await supabase.from('rescue_requests').insert({
    driver_id: user.id,
    ...payload
  })
  
  return NextResponse.json(response)
}
```

---

## 3. Component-Level Protection (UI)

### RBACProtectedPage (Full Page Protection)

Wrap entire pages to enforce role restrictions:

```jsx
import { RBACProtectedPage } from '@/components/auth/RBACProtected'

export default function AdminPage() {
  return (
    <RBACProtectedPage allowedRoles={['admin']}>
      {/* Admin content here */}
    </RBACProtectedPage>
  )
}
```

**Features:**
- Redirects unauthorized users to `/404`
- Shows loading spinner while checking role
- Automatic login redirect if not authenticated

### Conditional Rendering (Section-Level Protection)

For sections within a page, use conditional rendering:

```jsx
import { AdminOnly, DriverOnly, MechanicOnly } from '@/components/auth/RBACProtected'

export default function MixedPage() {
  return (
    <>
      <DriverOnly>
        <DriverSection />
      </DriverOnly>
      
      <AdminOnly deniedMessage="Admin section">
        <AdminPanel />
      </AdminOnly>
      
      <MechanicOnly>
        <MechanicTools />
      </MechanicOnly>
    </>
  )
}
```

### ConditionalRender (Silent Hide)

Hide UI elements without showing a message:

```jsx
import { ConditionalRender } from '@/components/auth/RBACProtected'

export default function Page() {
  return (
    <ConditionalRender allowedRoles={['admin']}>
      {/* Only shows for admins, silently hidden for others */}
      <AdminButton />
    </ConditionalRender>
  )
}
```

---

## 4. Navigation Structure (Mobile Bottom Nav)

### Mobile Tab Navigation (< 768px)

**Driver Tabs (4 tabs + center SOS button):**
```
Home (/)    → /dashboard/driver
AI Assist   → /dashboard/driver/ai
Activity    → /dashboard/driver/history
Profile     → /dashboard/driver/account
```
SOS button (center floating) → /dashboard/driver/request/new

**Mechanic Tabs (5 tabs):**
```
Jobs        → /dashboard/mechanic
Requests    → /dashboard/mechanic/requests
Navigation  → /dashboard/mechanic/navigation
Activity    → /dashboard/mechanic/history
Profile     → /dashboard/mechanic/account
```

**Admin Tabs:** Uses top navbar navigation; bottom nav hidden.

---

## 5. Database Row-Level Security (RLS)

### RLS Policies by Table

**rescue_requests:**
- Drivers: See only their own requests
- Mechanics: See requests assigned to them
- Admin: See all requests

**mechanic_profiles:**
- Mechanics: See only own profile
- Drivers: See public mechanic info only (verification_status = 'approved')
- Admin: See all profiles

**profiles:**
- Users: See only own profile
- Admin: See all profiles

**blocked_emails:**
- Admin: Full CRUD access
- Used for permanently blocking rejected mechanic emails

---

## 6. Best Practices

### ✅ DO

```javascript
// ✅ Always verify role in API routes
async function POST(request) {
  const result = await requireDriver()
  if (result.error) return createErrorResponse(result.error, result.status)
}

// ✅ Use component protections for UI sections
<RBACProtectedPage allowedRoles={['admin']}>
  <AdminContent />
</RBACProtectedPage>

// ✅ Check resource ownership
if (userId !== resourceOwnerId && userRole !== 'admin') {
  throw new Error('Forbidden: not resource owner')
}

// ✅ Log security events
console.warn(`[SECURITY] Unauthorized access attempt: ${user.id}`)
```

### ❌ DON'T

```javascript
// ❌ Never trust client-side role claims
const role = localStorage.getItem('role') // NOT SAFE!

// ❌ Don't skip role check in API routes
export async function POST(request) {
  // WRONG: No role verification!
  const data = await request.json()
}

// ❌ Don't return sensitive data without filtering
return allUsers // WRONG: Should filter by role

// ❌ Don't rely only on URL hiding
hide admin section with CSS // NOT SAFE!
```

---

## 7. Testing RBAC

### Cross-Role Access Tests

```bash
# Test 1: Driver trying to access Mechanic dashboard
1. Login as driver
2. Try to visit /dashboard/mechanic
3. Expected: Redirect to /404 ✅

# Test 2: Admin accessing all dashboards
1. Login as admin
2. Visit /dashboard/driver
3. Expected: Works (admin can see all roles) ✅

# Test 3: API endpoint protection
1. GET /api/admin/stats as driver
2. Expected: 403 Forbidden ✅

# Test 4: Session role change
1. Login as driver
2. Database admin manually change role to mechanic
3. Expected: Next request sees new role ✅
```

---

## 8. Security Headers

### Response Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

---

## 9. Troubleshooting

### Issue: User can access wrong role dashboard

**Cause:** Page missing `RBACProtectedPage` wrapper
**Fix:** Wrap page with `<RBACProtectedPage allowedRoles={['driver']}>`

### Issue: API returns other user's data

**Cause:** Missing role check in API route
**Fix:** Add `await requireDriver()` to protect route

### Issue: RBACProtectedPage not redirecting

**Cause:** `useAuth()` not returning profile
**Fix:** Check `AuthProvider.jsx` is fetching profile from database

---

## 10. Future Hardening

- [ ] Audit logging to database
- [ ] Rate limiting per role
- [ ] Session-based rate limiting
- [ ] IP whitelisting for admin
- [ ] Two-factor authentication
- [ ] Role change audit trail
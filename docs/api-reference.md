# RoadRescue API Reference

> Complete technical reference for all server-side Next.js route handlers implemented in `web/src/app/api`.

---

## 1. Authentication & Security Model

All authenticated endpoints verify the caller's session via Supabase Auth cookies using `createClient()` from `@/lib/supabase/server`. API route protection is enforced via `src/lib/rbac.js`.

### Standard Headers
```http
Content-Type: application/json
Cookie: <supabase-auth-token>
```

---

## 2. Rescue Request Endpoints

### 2.1 Create Rescue Request
* **Route:** `POST /api/requests`
* **Access:** Authenticated `driver` only.
* **Rate Limits:** Maximum 3 distress calls per hour; concurrency lock prevents multiple concurrent active requests.
* **Payload:**
  ```json
  {
    "incidentLat": 5.6037,
    "incidentLng": -0.1870,
    "incidentAddress": "Airport Residential Area, Accra",
    "serviceType": "repair | towing | tyre_change | battery_jump | fuel_delivery | other",
    "problemDescription": "Car won't start after heavy rain",
    "vehicleMake": "Toyota",
    "vehicleModel": "Corolla",
    "vehicleYear": 2019,
    "vehicleColor": "Silver",
    "vehiclePlate": "GR-1234-20",
    "vehicleImageUrl": "https://...",
    "preferredMechanicId": "optional-uuid",
    "aiDiagnosticResult": { "problem": "...", "severity": "high" }
  }
  ```
* **Validation:** Latitude strictly validated within $[-90, 90]$ and Longitude within $[-180, 180]$.
* **Response (`201 Created`):**
  ```json
  {
    "request": { "id": "uuid", "status": "pending", "...": "..." },
    "notifiedCount": 3
  }
  ```

---

### 2.2 Get Request Details
* **Route:** `GET /api/requests/[id]`
* **Access:** Request owner (`driver_id`), assigned mechanic (`mechanic_id`), unassigned verified mechanics (for `pending`/`offered` requests), or `admin`.
* **Response (`200 OK`):**
  ```json
  {
    "request": {
      "id": "uuid",
      "status": "en_route",
      "driver": { "id": "uuid", "full_name": "Kofi Mensah", "phone": "+233244000000" },
      "assignedMechanic": { "id": "uuid", "full_name": "Kwame Auto Services", "phone": "+233200000000" },
      "rating": 5,
      "review": "Fast response",
      "reports": []
    }
  }
  ```

---

### 2.3 Update Request Status
* **Route:** `PATCH /api/requests/status` (or `PATCH /api/requests/[id]/status`)
* **Access:** Assigned mechanic, driver (cancellation), or admin.
* **Payload:**
  ```json
  {
    "requestId": "uuid",
    "newStatus": "accepted | en_route | arrived | in_progress | completed | cancelled",
    "completionNotes": "Replaced alternator belt",
    "performedServices": ["Alternator belt replacement", "Battery recharge"],
    "cancellationReason": "Driver found alternate mechanic"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "request": { "id": "uuid", "status": "accepted", "...": "..." },
    "newStatus": "accepted"
  }
  ```

---

### 2.4 Auto-Cancel Request
* **Route:** `POST /api/requests/auto-cancel`
* **Access:** Driver owner, assigned mechanic, or admin.
* **Payload:**
  ```json
  {
    "requestId": "uuid",
    "reason": "mechanic inactivity timeout"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "request": { "id": "uuid", "status": "cancelled" },
    "newStatus": "cancelled"
  }
  ```

---

### 2.5 Submit Driver Rating
* **Route:** `PATCH /api/requests/rate` (or `PATCH /api/requests/[id]/rate`)
* **Access:** Authenticated `driver` who owns the completed request.
* **Payload:**
  ```json
  {
    "requestId": "uuid",
    "rating": 5,
    "review": "Arrived within 15 minutes, excellent diagnostic advice."
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "newAvgRating": 4.85
  }
  ```

---

### 2.6 Chat Messages
* **Get Messages:** `GET /api/requests/[id]/messages`
* **Send Message:** `POST /api/requests/[id]/messages`
* **Access:** Request participants only (driver or assigned mechanic).
* **POST Payload:**
  ```json
  {
    "message": "I am standing next to the Shell filling station."
  }
  ```
* **Response (`201 Created`):**
  ```json
  {
    "message": {
      "id": "uuid",
      "request_id": "uuid",
      "sender_id": "uuid",
      "message": "I am standing next to the Shell filling station.",
      "created_at": "2026-09-26T02:00:00Z"
    }
  }
  ```

---

## 3. AI Diagnostic Endpoints

### 3.1 Diagnose Vehicle Fault
* **Route:** `POST /api/ai/diagnose`
* **Access:** Public or Authenticated (User-scoped sliding rate limit of 20 req/min).
* **Payload:**
  ```json
  {
    "symptoms": "Brakes make a grinding metal sound when pressing pedal",
    "vehicleMake": "Hyundai",
    "vehicleModel": "Elantra",
    "vehicleYear": 2017
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "diagnosis": {
      "problem": "Worn Brake Pads & Rotor Contact",
      "summary": "Severe friction material depletion on brake pads",
      "fault_category": "Brakes & Hydraulic",
      "severity": "high",
      "recommendations": [
        "Avoid high-speed driving and minimize harsh braking.",
        "Inspect brake fluid level in reservoir.",
        "Have brake pads and rotors replaced immediately."
      ],
      "estimated_causes": [
        "Completely worn brake pad friction lining",
        "Scored or warped brake rotor",
        "Seized brake caliper pin"
      ],
      "provider": "gemini",
      "isFallback": false,
      "fallbackReason": null
    }
  }
  ```

---

## 4. Administrative Endpoints

All admin endpoints enforce `requireAdmin()` and reject unauthorized users with `403 Forbidden`.

### 4.1 Platform Statistics
* **Route:** `GET /api/admin/stats`
* **Response (`200 OK`):** Total requests, active jobs, verified mechanics count, and incident trends.

### 4.2 Mechanic Verification & Review
* **List Mechanics:** `GET /api/admin/mechanics?status=pending|approved|rejected`
* **Update Verification:** `PATCH /api/admin/mechanics`
* **Payload:**
  ```json
  {
    "mechanicUserId": "uuid",
    "newStatus": "approved | rejected | more_info",
    "reason": "Clear certification uploaded"
  }
  ```

### 4.3 Mechanic Document Signed URL
* **Route:** `POST /api/admin/mechanics/document-url`
* **Payload:** `{ "filePath": "licenses/mechanic-123.pdf" }`
* **Response (`200 OK`):** `{ "signedUrl": "https://..." }` (expires in 300 seconds).

### 4.4 User Management & Suspension
* **List Users:** `GET /api/admin/users?role=driver|mechanic&limit=50&offset=0`
* **Suspend/Delete User:** `DELETE /api/admin/users`
  * Payload: `{ "userId": "uuid" }`

### 4.5 Role Escalation
* **Route:** `POST /api/admin/escalate`
* **Payload:** `{ "email": "user@roadrescue.com" }`
* **Response (`200 OK`):** Synchronizes database profile and `auth.users` user_metadata to role `admin`.

### 4.6 Profile Change Requests Review
* **List Queue:** `GET /api/admin/profile-change-requests?status=pending`
* **Approve/Reject:** `PATCH /api/admin/profile-change-requests`
* **Payload:**
  ```json
  {
    "requestId": "uuid",
    "action": "approved | rejected",
    "reviewNotes": "Verified national ID and phone records"
  }
  ```

---

## 5. Profile & Incident Reporting Endpoints

### 5.1 Preferences
* **Route:** `GET /api/profile/preferences` | `PATCH /api/profile/preferences`
* **Payload:**
  ```json
  {
    "theme": "system | dark | light",
    "preferred_language": "en",
    "secondary_phone": "+233240000000",
    "notification_preferences": { "jobAlerts": true, "push": true },
    "communication_preferences": ["call", "sms"]
  }
  ```

### 5.2 Submit Profile Change Request
* **Route:** `POST /api/profile/change-requests`
* **Payload:**
  ```json
  {
    "targetTable": "driver_profiles | mechanic_profiles | profiles",
    "fieldKey": "vehicle_plate",
    "oldValue": "GR-1234-20",
    "newValue": "GW-9876-24",
    "reason": "Registered a new replacement vehicle"
  }
  ```

### 5.3 Incident Reports
* **Submit Report:** `POST /api/reports`
* **List Reports (Admin):** `GET /api/reports`
* **POST Payload:**
  ```json
  {
    "requestId": "uuid",
    "reporterId": "uuid",
    "reasonHeader": "inappropriate_behavior | pricing_issue | delay | other",
    "comment": "Mechanic demanded additional unrecorded cash fees."
  }
  ```

---

## 6. Notification Endpoints

### 6.1 Transactional Email Relay
* **Route:** `POST /api/notifications/email`
* **Access:** Authenticated. Admins can dispatch to any address; standard users (drivers/mechanics) can only dispatch notifications addressed directly to their own verified email.
* **Payload:**
  ```json
  {
    "to": "driver@example.com",
    "subject": "Rescue Request Dispatched",
    "htmlContent": "<p>A mechanic is heading to your location.</p>"
  }
  ```

---

## 7. Third-Party Search & Webhooks

### 7.1 Search
* **Route:** `GET /api/search?q=oil+change`
* **Response (`200 OK`):** Returns matching verified mechanics and open distress records.

### 7.2 Webhooks Gateway
* **Route:** `POST /api/webhooks`
* **Purpose:** Ingestion hook for external provider integrations (e.g. payment confirmations or telematics).

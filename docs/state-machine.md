# RoadRescue State Machine & Lifecycle Validation

> Complete specification of the rescue request finite state machine, transition rules, role authorization boundaries, and cancellation policies.

---

## 1. State Transition Graph

All rescue status modifications are strictly validated server-side in `src/lib/request.js` (`updateRequestStatus()`) and `src/app/api/requests/status/route.js`. Clients cannot directly update `rescue_requests.status` in the database.

```text
               ┌───────────────► CANCELLED ◄───────────────┐
               │                     ▲                     │
               │ (Driver/Mechanic)   │ (Driver/Mechanic)   │ (System Timeout)
               │                     │                     │
[PENDING] ─────┴───────► [ACCEPTED] ─┴──────► [EN_ROUTE] ──┴──► [ARRIVED]
                                                                    │
[COMPLETED] ◄────────────────── [IN_PROGRESS] ◄─────────────────────┘
```

---

## 2. Transition Matrix & Permitted Next States

The authoritative transition mapping is defined in `src/lib/rescueLifecycle.js`:

```javascript
export const REQUEST_STATUS_FLOW = {
  pending: ['accepted', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}
```

| Current Status | Permitted Next States | Authorized Actors | Required Conditions |
| :--- | :--- | :--- | :--- |
| **`pending`** | `accepted`, `cancelled` | Mechanic (to accept), Driver / Admin / System (to cancel) | Mechanic must be verified (`approved`) and online. Request must not be claimed by another mechanic. |
| **`accepted`** | `en_route`, `cancelled` | Assigned Mechanic (to update), Driver / Mechanic / Admin (to cancel) | `mechanic_id` must match authenticated caller. Cancellation records mandatory reason. |
| **`en_route`** | `arrived`, `cancelled` | Assigned Mechanic (to update), Driver / Mechanic / Admin (to cancel) | Mechanic location broadcasting actively. |
| **`arrived`** | `in_progress`, `cancelled` | Assigned Mechanic (to update), Assigned Mechanic / Admin (to cancel) | Mechanic has reached the incident coordinate pin. Driver cancellation is locked out. |
| **`in_progress`**| `completed` | Assigned Mechanic, Admin | Work in progress. Direct cancellation locked out; dispute/incident report path required. |
| **`completed`** | *(Terminal)* | None | Job complete. Completion notes and performed services recorded. Driver can submit rating. |
| **`cancelled`** | *(Terminal)* | None | Terminal state. Cancel timestamp, actor ID, and cancellation reason recorded. |

---

## 3. Role-Differentiated Cancellation Policy

To protect both drivers and mechanics from bad-faith cancellations and stranded field specialists, RoadRescue enforces strict stage-dependent cancellation rules:

### 3.1 Driver Cancellation Rules
* **Allowed States:** `pending`, `accepted`, `en_route`.
* **Blocked States:** `arrived`, `in_progress`, `completed`.
* **Rationale:** Once a mechanic has physically arrived on-site or commenced repair operations, a driver cannot unilaterally cancel the ticket without following dispute resolution. Attempting to do so returns `400 Bad Request` (`"Drivers cannot cancel a request once the mechanic has arrived on-site or work is in progress"`).

### 3.2 Mechanic Cancellation Rules
* **Allowed States:** `accepted`, `en_route`, `arrived`.
* **Blocked States:** `in_progress`, `completed`.
* **Requirements:** Mechanics must provide a non-empty `cancellationReason`. If cancelled, the mechanic is unassigned and released back to available status (`is_available = true`).
* **Rationale:** If a mechanic encounters an unexpected road hazard, breakdown of their own vehicle, or unsafe scene conditions, they may cancel with a logged justification. Once repair work has commenced (`in_progress`), they must file an issue report via `/api/reports`.

### 3.3 Automated System Timeout (`/api/requests/auto-cancel`)
* **Trigger:** Invoked when a rescue request has remained in `pending` or `offered` status beyond the maximum dispatch search threshold.
* **Metadata:** Sets `cancellation_reason = 'system_timeout: mechanic inactivity timeout'` and records `cancelled_by = 'system'`.
* **Authorization:** Only the request owner, assigned mechanic, or an administrator can trigger or authenticate an auto-cancel operation.

---

## 4. Concurrency & Optimistic Lock Protection

When multiple nearby mechanics attempt to claim the same pending request simultaneously:
1. The update query explicitly asserts `status = 'pending'` and `mechanic_id IS NULL`:
   ```sql
   UPDATE rescue_requests
   SET status = 'accepted', mechanic_id = $mechanicId, accepted_at = now()
   WHERE id = $requestId AND status = 'pending' AND mechanic_id IS NULL
   RETURNING id;
   ```
2. If another mechanic claims the request milliseconds earlier, `0 rows affected` is returned.
3. The server immediately returns `409 Conflict` with the error message: `"Another mechanic already accepted this request"`, preventing double-assignment.

---

## 5. Automated Notification Triggers by State

| Transition Event | Recipient | Notification Channel | Message Content |
| :--- | :--- | :--- | :--- |
| **`-> accepted`** | Driver | In-App + Email | *"A mechanic accepted your rescue request and is heading to your location."* |
| **`-> en_route`** | Driver | In-App | *"Your mechanic is on the way — track them on the live map."* |
| **`-> arrived`** | Driver | In-App | *"Your mechanic has arrived at your location."* |
| **`-> completed`**| Driver | In-App + Email | *"Job completed — please rate your mechanic and leave feedback."* |
| **`-> completed`**| Admins | In-App (System) | *"Rescue request #XXXXXXXX was completed by mechanic."* |
| **`-> cancelled`**| Affected Party | In-App + Email | *"This rescue request was cancelled. Reason: [Reason]"* |

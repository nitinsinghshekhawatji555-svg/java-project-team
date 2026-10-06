# RoadRescue Realtime Event & Synchronization Flow

> Specification of Supabase Realtime WebSocket event subscriptions, presence channels, and live GPS tracking data flows.

---

## 1. Overview

RoadRescue leverages **Supabase Realtime** to eliminate polling overhead and provide sub-second bi-directional synchronization across drivers, field mechanics, and operations command. Realtime listeners monitor PostgreSQL Change Data Capture (CDC) events on write-ahead logs (WAL) as well as ephemeral presence channels.

---

## 2. Event Subscription Architecture by User Role

```mermaid
flowchart TD
    subgraph PostgreSQL ["PostgreSQL Database Engine"]
        RR[(rescue_requests Table)]
        MSG[(messages Table)]
        NOTIF[(notifications Table)]
        MP[(mechanic_profiles Table)]
    end

    subgraph RealtimeBroker ["Supabase Realtime WebSocket Broker"]
        CDC[Postgres CDC Stream]
        PRES[Presence Channels]
    end

    subgraph Clients ["Active Web Clients"]
        D_CLIENT[Driver Client]
        M_CLIENT[Mechanic Client]
        A_CLIENT[Admin Console]
    end

    RR & MSG & NOTIF & MP --> CDC
    CDC --> RealtimeBroker
    PRES --> RealtimeBroker

    RealtimeBroker -->|request:id:status| D_CLIENT
    RealtimeBroker -->|messages:request_id| D_CLIENT & M_CLIENT
    RealtimeBroker -->|mechanic-live-requests| M_CLIENT
    RealtimeBroker -->|notifications:user_id| D_CLIENT & M_CLIENT & A_CLIENT
    M_CLIENT <-->|location:mechanic_id| RealtimeBroker
    RealtimeBroker -->|location:mechanic_id| D_CLIENT
```

---

## 3. Core Channel Implementations

### 3.1 Mechanic Live Dispatch Feed (`mechanic-live-requests`)
* **File:** `src/app/dashboard/mechanic/requests/page.jsx`
* **Purpose:** Provides verified mechanics with an instant notification whenever a new distress ticket is logged in their zone.
* **Subscription Code:**
  ```javascript
  const supabase = createClient()
  const channel = supabase
    .channel('mechanic-live-requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rescue_requests',
      },
      () => {
        loadRequests() // Refetches pending queue immediately
      }
    )
    .subscribe()
  ```

---

### 3.2 Request Lifecycle Tracking (`request:${requestId}`)
* **File:** `src/app/dashboard/driver/request/[id]/page.jsx`
* **Purpose:** Updates driver status cards and progress steps automatically as the assigned mechanic progresses from `accepted` $\to$ `en_route` $\to$ `arrived` $\to$ `in_progress` $\to$ `completed`.
* **Subscription Code:**
  ```javascript
  const channel = supabase
    .channel(`request-live-${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rescue_requests',
        filter: `id=eq.${requestId}`,
      },
      (payload) => {
        const updatedStatus = payload.new.status
        setRequest(prev => ({ ...prev, status: updatedStatus }))
      }
    )
    .subscribe()
  ```

---

### 3.3 Live Incident Chat (`messages:${requestId}`)
* **File:** `src/components/request/RescueChatPanel.jsx`
* **Purpose:** Enables instant, low-latency text messaging between the stranded driver and assigned mechanic.
* **Subscription Code:**
  ```javascript
  const channel = supabase
    .channel(`chat-room-${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => {
        setMessages(prev => [...prev, payload.new])
      }
    )
    .subscribe()
  ```

---

### 3.4 Bidirectional Mechanic Location Tracking (`useMechanicLocation.js`)
* **Broadcasting (Mechanic):** When `is_available === true`, the mechanic's device uses `navigator.geolocation.watchPosition` to publish coordinates over WebSocket presence every 15 seconds, and updates `mechanic_profiles.current_location` in PostgreSQL every 60 seconds.
* **Receiving (Driver):** The driver's map component subscribes to the mechanic's location broadcast and smoothly updates the Leaflet marker icon on the map canvas.

---

## 4. Resilience & Fallback Guarantees

1. **Automatic WebSocket Reconnection:** If mobile cellular data drops temporarily (e.g. driving through a low-signal zone in Accra), the Supabase client handles exponential reconnection attempts.
2. **Hybrid Polling Fallback:** Critical operational feeds (such as the mechanic dispatch board) maintain a 30-second background polling cycle as a fallback in the event of persistent WebSocket disconnection.
3. **Duty Status Lock:** When a mechanic toggles offline (`is_available = false`), all GPS tracking watchers and WebSocket broadcast channels are terminated immediately to preserve battery and respect user privacy.
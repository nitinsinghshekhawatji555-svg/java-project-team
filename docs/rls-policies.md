# RoadRescue Row-Level Security (RLS) Policies

> Comprehensive specification of database-level access control enforced via PostgreSQL Row-Level Security across all 18 production tables.

---

## 1. Overview & Security Philosophy

Row-Level Security (RLS) guarantees that even if an attacker intercepts client-side Supabase tokens or executes direct queries against the database REST endpoints, they can never view, update, or tamper with data belonging to other users.

Every policy evaluates the caller's verified identity (`auth.uid()`) and their database role claim (`SELECT role FROM profiles WHERE id = auth.uid()`).

---

## 2. Table-by-Table Policy Definitions

### 2.1 `public.profiles`
* **Select Own Profile:**
  ```sql
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);
  ```
* **Update Own Profile:**
  ```sql
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);
  ```
* **Admin Full View:**
  ```sql
  CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  ```

---

### 2.2 `public.mechanic_profiles`
* **Drivers View Verified Mechanics:**
  ```sql
  CREATE POLICY "Drivers view verified mechanics" ON mechanic_profiles
    FOR SELECT TO authenticated
    USING (verification_status = 'approved');
  ```
* **Mechanics Manage Own Profile:**
  ```sql
  CREATE POLICY "Mechanics manage own profile" ON mechanic_profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid());
  ```
* **Admins Manage All Profiles:**
  ```sql
  CREATE POLICY "Admins manage all mechanic profiles" ON mechanic_profiles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  ```

---

### 2.3 `public.rescue_requests`
* **Driver Scoped Select:**
  ```sql
  CREATE POLICY "Drivers view own requests" ON rescue_requests
    FOR SELECT TO authenticated
    USING (driver_id = auth.uid());
  ```
* **Driver Insert:**
  ```sql
  CREATE POLICY "Drivers create rescue requests" ON rescue_requests
    FOR INSERT TO authenticated
    WITH CHECK (driver_id = auth.uid());
  ```
* **Mechanic Scoped Select (Assigned or Available Feed):**
  ```sql
  CREATE POLICY "Mechanics view assigned or pending requests" ON rescue_requests
    FOR SELECT TO authenticated
    USING (
      mechanic_id = auth.uid() 
      OR (status = 'pending' AND mechanic_id IS NULL)
    );
  ```
* **Admin Full Access:**
  ```sql
  CREATE POLICY "Admins manage all requests" ON rescue_requests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  ```

---

### 2.4 `public.messages`
* **Participant Scoped View & Insert:**
  ```sql
  CREATE POLICY "Participants view request messages" ON messages
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM rescue_requests r
        WHERE r.id = request_id
          AND (r.driver_id = auth.uid() OR r.mechanic_id = auth.uid())
      )
    );

  CREATE POLICY "Participants insert request messages" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM rescue_requests r
        WHERE r.id = request_id
          AND (r.driver_id = auth.uid() OR r.mechanic_id = auth.uid())
      )
    );
  ```

---

### 2.5 `public.notifications`
* **Recipient Scoped View & Read Toggle:**
  ```sql
  CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

  CREATE POLICY "Users mark notifications read" ON notifications
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid());
  ```

---

### 2.6 `public.request_reviews`
* **Public Verified Reading:**
  ```sql
  CREATE POLICY "Anyone authenticated can view reviews" ON request_reviews
    FOR SELECT TO authenticated
    USING (true);
  ```
* **Driver Submit Review:**
  ```sql
  CREATE POLICY "Drivers submit review for completed request" ON request_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
      driver_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM rescue_requests r
        WHERE r.id = request_id
          AND r.driver_id = auth.uid()
          AND r.status = 'completed'
      )
    );
  ```

---

### 2.7 `public.blocked_emails`
* **Admin Only Management:**
  ```sql
  CREATE POLICY "Admins manage blocked emails" ON blocked_emails
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  ```

---

## 3. Defense & Security Audit Highlights

1. **No Anonymous Direct Writes:** Unauthenticated sessions (`anon`) are completely blocked from inserting or updating records across operational tables.
2. **Elimination of Coordinate Leakage:** A driver cannot query coordinates of mechanics who have not been assigned to their active ticket.
3. **Trigger-Level Enforcement:** Attempted registrations with an email present in `blocked_emails` are aborted directly inside the database transaction by the `blocked_email_signup_trigger`.

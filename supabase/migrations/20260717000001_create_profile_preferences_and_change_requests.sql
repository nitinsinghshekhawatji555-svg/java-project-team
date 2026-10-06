-- Create profile_preferences and profile_change_requests tables

CREATE TABLE IF NOT EXISTS public.profile_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  theme text DEFAULT 'system',
  preferred_language text DEFAULT 'en',
  notification_preferences jsonb DEFAULT '{"push": true, "jobAlerts": true, "messageAlerts": true}'::jsonb,
  communication_preferences text[] DEFAULT ARRAY['call', 'sms']::text[],
  secondary_phone text,
  home_location_label text,
  work_location_label text,
  bio text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profile_preferences' AND policyname = 'Users can manage own preferences'
  ) THEN
    CREATE POLICY "Users can manage own preferences"
      ON public.profile_preferences
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  target_table text,
  field_key text,
  old_value text,
  new_value jsonb,
  reason text,
  status text DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profile_change_requests' AND policyname = 'Users can insert own change requests'
  ) THEN
    CREATE POLICY "Users can insert own change requests"
      ON public.profile_change_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profile_change_requests' AND policyname = 'Users can view own change requests'
  ) THEN
    CREATE POLICY "Users can view own change requests"
      ON public.profile_change_requests
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profile_change_requests' AND policyname = 'Admins can update change requests'
  ) THEN
    CREATE POLICY "Admins can update change requests"
      ON public.profile_change_requests
      FOR UPDATE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ));
  END IF;
END $$;

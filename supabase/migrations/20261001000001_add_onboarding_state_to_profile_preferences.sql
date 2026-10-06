-- Migration: Add onboarding_state jsonb to profile_preferences
-- Description: Stores walkthrough completion state per user (e.g. {"driver_skip_hint_v1": true})

ALTER TABLE public.profile_preferences
ADD COLUMN IF NOT EXISTS onboarding_state jsonb NOT NULL DEFAULT '{}'::jsonb;

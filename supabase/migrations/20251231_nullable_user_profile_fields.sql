-- Migration: Make first_name, last_name, user_code nullable for FamilyKnows signup flow
-- These fields will be populated during onboarding, not at signup

-- Make columns nullable
ALTER TABLE public.t_user_profiles
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN user_code DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.t_user_profiles.first_name IS 'User first name - nullable for deferred collection during onboarding';
COMMENT ON COLUMN public.t_user_profiles.last_name IS 'User last name - nullable for deferred collection during onboarding';
COMMENT ON COLUMN public.t_user_profiles.user_code IS 'Unique user code - generated when profile is completed during onboarding';

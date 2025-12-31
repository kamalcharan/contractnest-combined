-- ============================================
-- FamilyKnows Migration: Add User Profile Columns
-- Run this in BOTH ContractNest and FamilyKnows Supabase
-- ============================================

-- Add date_of_birth column to t_user_profiles
ALTER TABLE "public"."t_user_profiles"
ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;

-- Add gender column to t_user_profiles
ALTER TABLE "public"."t_user_profiles"
ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN "public"."t_user_profiles"."date_of_birth" IS 'User date of birth for FamilyKnows personal profile';
COMMENT ON COLUMN "public"."t_user_profiles"."gender" IS 'User gender: male, female, other, prefer_not_to_say';

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. The existing ContractNest trigger (after_tenant_created -> initialize_tenant_onboarding)
--    remains in place for ContractNest to continue working.
--
-- 2. For FamilyKnows, the FKonboarding Edge Function will handle
--    onboarding initialization - NO new trigger is needed.
--
-- 3. The FamilyKnows auth Edge Function should call FKonboarding/initialize
--    after creating the tenant to set up FamilyKnows-specific onboarding steps.
-- ============================================

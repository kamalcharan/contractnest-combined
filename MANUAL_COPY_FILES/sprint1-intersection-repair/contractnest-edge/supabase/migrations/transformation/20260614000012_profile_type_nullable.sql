-- Stream 1 — make profile_type nullable
-- profile_type is the legacy column for business_type_id (pre-S7).
-- Canonical field is now `persona`. Partial saves from onboarding steps that
-- only send persona/engagement_model should not hit a NOT NULL violation.
ALTER TABLE t_tenant_profiles
  ALTER COLUMN profile_type DROP NOT NULL;

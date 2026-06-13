-- Stream 1 / Task 1.1 — Engagement model column on t_tenant_profiles
-- Captures HOW the seller primarily engages clients.
-- Written by EngagementModelStep (shown after PersonaSelectionStep for seller/both personas).
-- NULL for buyer persona or tenants who skipped the step.
--
-- Drives:
--   - ResourcePickStep default tab (equipment / facilities / services)
--   - Catalog-studio default view (Stream 1 / Task 0.2, currently parked)

ALTER TABLE t_tenant_profiles
  ADD COLUMN IF NOT EXISTS engagement_model text
  CHECK (engagement_model IN ('equipment_first', 'facility_first', 'service_first', 'hybrid'));

COMMENT ON COLUMN t_tenant_profiles.engagement_model IS
  'Stream 1 / 1.1: How the seller primarily engages clients.
   equipment_first = AMC/CMC servicers (HVAC, lifts, generators).
   facility_first  = facility/property managers (housekeeping, security, horticulture).
   service_first   = pure service providers (consulting, wellness, legal, payroll) — no equipment involved.
   hybrid          = mixed engagement across equipment, facilities, and services.
   NULL for buyer persona or tenants who skipped the step.
   Written by EngagementModelStep via /api/tenant-profile POST.';

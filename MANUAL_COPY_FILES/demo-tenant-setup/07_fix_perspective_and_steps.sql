-- =====================================================================
-- DEMO TENANT SETUP — Script 07: Perspective + onboarding step-status fix
-- Found in first UI test (Pulse Hospital rendered the SELLER/"Revenue"
-- experience and the perspective switch demanded onboarding):
-- 1. PersonaSelectionStep dual-writes persona AND legacy business_type_id;
--    AuthContext.initializePerspective and /settings/business-profile read
--    business_type_id — script 01 only set persona. Backfill it.
-- 2. Real onboarding also writes t_onboarding_step_status rows (read by
--    GET /api/onboarding/status). Mirror the row set a real completed
--    tenant (sharma elevators) has: VaNi steps completed, legacy
--    initialize-time steps pending.
-- Idempotent.
-- =====================================================================

-- 1. business_type_id := persona (buyer/seller LOV consumed by the UI)
UPDATE t_tenant_profiles
SET business_type_id = persona, updated_at = now()
WHERE tenant_id::text LIKE 'c0000000-0000-4000-8000-00000000000%'
  AND (business_type_id IS NULL OR business_type_id = '');

-- 2. onboarding step-status rows (mirrors a real completed VaNi run)
INSERT INTO t_onboarding_step_status (id, tenant_id, step_id, step_sequence, status, started_at, completed_at, attempts)
SELECT gen_random_uuid(), tt.id, s.step_id, s.step_sequence, s.status,
       CASE WHEN s.status = 'completed' THEN o.started_at END,
       CASE WHEN s.status = 'completed' THEN o.completed_at END,
       CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END
FROM t_tenants tt
JOIN t_tenant_onboarding o ON o.tenant_id = tt.id
CROSS JOIN (VALUES
  ('user-profile',      1,  'pending'),
  ('business-profile',  2,  'pending'),
  ('data-setup',        3,  'pending'),
  ('persona-selection', 4,  'completed'),
  ('storage',           4,  'pending'),
  ('team',              5,  'pending'),
  ('tour',              6,  'pending'),
  ('resource-pick',     7,  'completed'),
  ('vani-working',      9,  'completed'),
  ('pricing-review',    10, 'completed'),
  ('equipment-confirm', 11, 'completed'),
  ('engagement-model',  99, 'completed')
) AS s(step_id, step_sequence, status)
WHERE tt.id::text LIKE 'c0000000-0000-4000-8000-00000000000%'
  AND NOT EXISTS (
    SELECT 1 FROM t_onboarding_step_status e
    WHERE e.tenant_id = tt.id AND e.step_id = s.step_id
  );

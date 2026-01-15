-- ============================================================================
-- TEST DATA SEED for Billing Phase 2 Testing
-- Tenant: a58ca91a-7832-4b4c-b67c-a210032f26b8
-- ============================================================================
-- CORE TABLES ONLY (from 20251229170144_remote_schema.sql)
-- ============================================================================

-- 0. Ensure 'contractnest' product exists in m_products
INSERT INTO m_products (id, code, name, description, env_prefix, is_active, is_default, settings, created_at)
VALUES (
  'f0000001-0000-0000-0000-000000000001',
  'contractnest',
  'ContractNest',
  'Contract Management Platform',
  'CN_',
  true,
  true,
  '{}'::jsonb,
  NOW()
) ON CONFLICT (code) DO NOTHING;

-- 1. Create Pricing Plan
INSERT INTO t_bm_pricing_plan (
  plan_id,
  name,
  description,
  plan_type,
  trial_duration,
  is_visible,
  is_archived,
  default_currency_code,
  supported_currencies,
  product_code,
  created_at
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'ContractNest Professional',
  'Professional plan for businesses',
  'Per User',
  14,
  true,
  false,
  'INR',
  '["INR", "USD"]'::jsonb,
  'contractnest',
  NOW()
) ON CONFLICT (plan_id) DO NOTHING;

-- 2. Create Plan Version
INSERT INTO t_bm_plan_version (
  version_id,
  plan_id,
  version_number,
  is_active,
  effective_date,
  changelog,
  created_by,
  tiers,
  features,
  notifications,
  topup_options,
  created_at
) VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  '1.0.0',
  true,
  CURRENT_DATE - INTERVAL '30 days',
  'Initial version',
  'system',
  '[
    {"min": 1, "max": 2, "price": 0, "currency": "INR"},
    {"min": 3, "max": 5, "price": 299, "currency": "INR"},
    {"min": 6, "max": 10, "price": 249, "currency": "INR"}
  ]'::jsonb,
  '[
    {"code": "contracts", "name": "Contract Management", "included": true},
    {"code": "templates", "name": "Contract Templates", "included": true},
    {"code": "e_signature", "name": "E-Signature", "included": true}
  ]'::jsonb,
  '[
    {"channel": "email", "included": 500},
    {"channel": "sms", "included": 100},
    {"channel": "whatsapp", "included": 50}
  ]'::jsonb,
  '[
    {"type": "email", "quantity": 500, "price": 499},
    {"type": "sms", "quantity": 100, "price": 499}
  ]'::jsonb,
  NOW()
) ON CONFLICT (version_id) DO NOTHING;

-- 3. Create Tenant Subscription
INSERT INTO t_bm_tenant_subscription (
  subscription_id,
  tenant_id,
  version_id,
  status,
  currency_code,
  units,
  current_tier,
  amount_per_billing,
  billing_cycle,
  start_date,
  renewal_date,
  trial_ends,
  created_at
) VALUES (
  'a0000002-0000-0000-0000-000000000001',
  'a58ca91a-7832-4b4c-b67c-a210032f26b8',
  'c0000001-0000-0000-0000-000000000001',
  'active',
  'INR',
  3,
  '{"tier_name": "Professional", "users": 3, "price_per_user": 299}'::jsonb,
  2999.00,
  'monthly',
  DATE_TRUNC('month', NOW()),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
  NULL,
  NOW() - INTERVAL '30 days'
) ON CONFLICT (subscription_id) DO UPDATE SET
  status = 'active',
  units = EXCLUDED.units,
  current_tier = EXCLUDED.current_tier,
  amount_per_billing = EXCLUDED.amount_per_billing;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Product' as type, code, name FROM m_products WHERE code = 'contractnest';

SELECT 'Pricing Plan' as type, plan_id::text, name, product_code FROM t_bm_pricing_plan WHERE plan_id = 'b0000001-0000-0000-0000-000000000001';

SELECT 'Plan Version' as type, version_id::text, version_number, is_active::text FROM t_bm_plan_version WHERE version_id = 'c0000001-0000-0000-0000-000000000001';

SELECT 'Subscription' as type, subscription_id::text, status, billing_cycle FROM t_bm_tenant_subscription WHERE tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';

SELECT '✅ Core test data seeded for tenant a58ca91a-7832-4b4c-b67c-a210032f26b8' as status;

-- ============================================================================
-- NOTE: Phase 1 tables (t_bm_credit_balance, t_bm_credit_transaction,
-- t_bm_topup_pack) need Phase 1 migrations applied first.
-- Run Phase 1 SQL migrations before seeding credit data.
-- ============================================================================

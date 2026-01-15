-- ============================================================================
-- TEST DATA SEED for Billing Phase 2 Testing
-- Tenant: a58ca91a-7832-4b4c-b67c-a210032f26b8
-- ============================================================================
-- Based on actual database schema from 20251229170144_remote_schema.sql
-- ============================================================================

-- First, verify the product exists in m_products (it should already exist)
-- If not, this will insert it
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

-- 1. Create Pricing Plan (with required product_code FK)
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

-- 4. Create Credit Balances (Phase 1 tables - may not exist yet)
-- These inserts will fail if Phase 1 tables weren't created - that's OK
INSERT INTO t_bm_credit_balance (id, tenant_id, credit_type, channel, balance, reserved, last_reset_at, created_at)
VALUES
  ('cb000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 450, 0, NOW(), NOW()),
  ('cb000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 85, 0, NOW(), NOW()),
  ('cb000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 42, 0, NOW(), NOW()),
  ('cb000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 8, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  balance = EXCLUDED.balance,
  reserved = EXCLUDED.reserved;

-- 5. Create Credit Transactions
INSERT INTO t_bm_credit_transaction (id, tenant_id, credit_type, channel, transaction_type, quantity, balance_before, balance_after, source, description, created_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 'credit', 500, 0, 500, 'subscription', 'Monthly allocation', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 'credit', 100, 0, 100, 'subscription', 'Monthly allocation', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 'credit', 50, 0, 50, 'subscription', 'Monthly allocation', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 'credit', 10, 0, 10, 'subscription', 'Monthly allocation', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 'debit', 50, 500, 450, 'usage', 'Contract notifications', NOW() - INTERVAL '10 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 'debit', 15, 100, 85, 'usage', 'Payment reminders', NOW() - INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 'debit', 8, 50, 42, 'usage', 'Alerts', NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000008', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 'debit', 2, 10, 8, 'usage', 'Reports', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 6. Create Topup Packs
INSERT INTO t_bm_topup_pack (id, product_code, name, credit_type, channel, quantity, price, currency_code, is_active, expiry_days, created_at)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'contractnest', 'Email Pack - 500', 'notification', 'email', 500, 499.00, 'INR', true, 365, NOW()),
  ('e1000000-0000-0000-0000-000000000002', 'contractnest', 'Email Pack - 1000', 'notification', 'email', 1000, 899.00, 'INR', true, 365, NOW()),
  ('e1000000-0000-0000-0000-000000000003', 'contractnest', 'SMS Pack - 100', 'notification', 'sms', 100, 499.00, 'INR', true, 365, NOW()),
  ('e1000000-0000-0000-0000-000000000004', 'contractnest', 'SMS Pack - 500', 'notification', 'sms', 500, 1999.00, 'INR', true, 365, NOW()),
  ('e1000000-0000-0000-0000-000000000005', 'contractnest', 'WhatsApp Pack - 100', 'notification', 'whatsapp', 100, 999.00, 'INR', true, 365, NOW()),
  ('e1000000-0000-0000-0000-000000000006', 'contractnest', 'AI Reports Pack - 25', 'ai_report', NULL, 25, 4999.00, 'INR', true, 365, NOW()),
  ('e1000000-0000-0000-0000-000000000007', 'contractnest', 'AI Reports Pack - 50', 'ai_report', NULL, 50, 8999.00, 'INR', true, 365, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Product' as type, code, name FROM m_products WHERE code = 'contractnest';

SELECT 'Pricing Plan' as type, plan_id::text, name, product_code FROM t_bm_pricing_plan WHERE plan_id = 'b0000001-0000-0000-0000-000000000001';

SELECT 'Plan Version' as type, version_id::text, version_number, is_active::text FROM t_bm_plan_version WHERE version_id = 'c0000001-0000-0000-0000-000000000001';

SELECT 'Subscription' as type, subscription_id::text, status, billing_cycle FROM t_bm_tenant_subscription WHERE tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';

SELECT '✅ Test data seeded for tenant a58ca91a-7832-4b4c-b67c-a210032f26b8' as status;

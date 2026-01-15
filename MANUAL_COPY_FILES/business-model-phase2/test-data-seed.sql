-- ============================================================================
-- TEST DATA SEED for Billing Phase 2 Testing
-- Tenant: a58ca91a-7832-4b4c-b67c-a210032f26b8
-- ============================================================================

-- 1. Create a Billing Plan
INSERT INTO t_billing_plans (
  id,
  product_code,
  plan_code,
  plan_name,
  plan_type,
  billing_cycle,
  base_price,
  currency,
  is_active,
  features,
  limits,
  created_at
) VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'contractnest',
  'professional',
  'Professional Plan',
  'subscription',
  'monthly',
  2999.00,
  'INR',
  true,
  '{"contracts": true, "team_members": true, "api_access": true, "priority_support": true}',
  '{"max_contracts": 100, "max_users": 10, "storage_gb": 5}',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Plan Features
INSERT INTO t_billing_plan_features (id, plan_id, feature_code, feature_name, feature_type, included_quantity, overage_price, is_active)
VALUES
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'contracts', 'Contracts', 'limit', 100, 50.00, true),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'users', 'Team Members', 'limit', 10, 299.00, true),
  ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'storage_gb', 'Storage (GB)', 'metered', 5, 20.00, true),
  ('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'notification_email', 'Email Notifications', 'credit', 500, 0.10, true),
  ('f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'notification_sms', 'SMS Notifications', 'credit', 100, 0.50, true),
  ('f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'notification_whatsapp', 'WhatsApp Notifications', 'credit', 50, 1.00, true),
  ('f1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000001', 'ai_report', 'AI Reports', 'credit', 10, 25.00, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Tenant Subscription
INSERT INTO t_tenant_subscriptions (
  id,
  tenant_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  base_price,
  currency,
  payment_method,
  auto_renew,
  created_at
) VALUES (
  's1000000-0000-0000-0000-000000000001',
  'a58ca91a-7832-4b4c-b67c-a210032f26b8',
  'b1000000-0000-0000-0000-000000000001',
  'active',
  'monthly',
  DATE_TRUNC('month', NOW()),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
  2999.00,
  'INR',
  'razorpay',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Credit Balances
INSERT INTO t_credit_balances (id, tenant_id, credit_type, channel, balance, reserved, last_reset_at, created_at)
VALUES
  -- Notification credits
  ('c1000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 450, 0, NOW(), NOW()),
  ('c1000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 85, 0, NOW(), NOW()),
  ('c1000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 42, 0, NOW(), NOW()),
  -- AI Report credits
  ('c1000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 8, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Create some Credit Transactions (history)
INSERT INTO t_credit_transactions (id, tenant_id, credit_type, channel, transaction_type, quantity, balance_before, balance_after, source, description, created_at)
VALUES
  -- Initial allocation from subscription
  ('t1000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 'credit', 500, 0, 500, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),
  ('t1000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 'credit', 100, 0, 100, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),
  ('t1000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 'credit', 50, 0, 50, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),
  ('t1000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 'credit', 10, 0, 10, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),

  -- Some usage deductions
  ('t1000000-0000-0000-0000-000000000005', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 'debit', 50, 500, 450, 'usage', 'Contract notifications batch', NOW() - INTERVAL '10 days'),
  ('t1000000-0000-0000-0000-000000000006', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 'debit', 15, 100, 85, 'usage', 'Payment reminders', NOW() - INTERVAL '5 days'),
  ('t1000000-0000-0000-0000-000000000007', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 'debit', 8, 50, 42, 'usage', 'Contract signed alerts', NOW() - INTERVAL '3 days'),
  ('t1000000-0000-0000-0000-000000000008', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 'debit', 2, 10, 8, 'usage', 'Contract analysis reports', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 6. Create some Usage Events
INSERT INTO t_usage_events (id, tenant_id, metric_type, quantity, recorded_at, metadata, created_at)
VALUES
  ('u1000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'contract', 5, NOW() - INTERVAL '20 days', '{"type": "service_contract"}', NOW() - INTERVAL '20 days'),
  ('u1000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'contract', 3, NOW() - INTERVAL '15 days', '{"type": "service_contract"}', NOW() - INTERVAL '15 days'),
  ('u1000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'user', 2, NOW() - INTERVAL '10 days', '{"role": "team_member"}', NOW() - INTERVAL '10 days'),
  ('u1000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'storage_mb', 256, NOW() - INTERVAL '5 days', '{"file_type": "pdf"}', NOW() - INTERVAL '5 days'),
  ('u1000000-0000-0000-0000-000000000005', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification_email', 50, NOW() - INTERVAL '10 days', '{"template": "contract_notification"}', NOW() - INTERVAL '10 days'),
  ('u1000000-0000-0000-0000-000000000006', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification_sms', 15, NOW() - INTERVAL '5 days', '{"template": "payment_reminder"}', NOW() - INTERVAL '5 days'),
  ('u1000000-0000-0000-0000-000000000007', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', 2, NOW() - INTERVAL '2 days', '{"report_type": "contract_analysis"}', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 7. Create Topup Packs (if table exists from Phase 1)
INSERT INTO t_topup_packs (id, product_code, pack_name, credit_type, channel, credit_quantity, price, currency, is_active, valid_days, created_at)
VALUES
  ('p1000000-0000-0000-0000-000000000001', 'contractnest', 'Email Pack - 500', 'notification', 'email', 500, 499.00, 'INR', true, 365, NOW()),
  ('p1000000-0000-0000-0000-000000000002', 'contractnest', 'Email Pack - 1000', 'notification', 'email', 1000, 899.00, 'INR', true, 365, NOW()),
  ('p1000000-0000-0000-0000-000000000003', 'contractnest', 'SMS Pack - 100', 'notification', 'sms', 100, 499.00, 'INR', true, 365, NOW()),
  ('p1000000-0000-0000-0000-000000000004', 'contractnest', 'SMS Pack - 500', 'notification', 'sms', 500, 1999.00, 'INR', true, 365, NOW()),
  ('p1000000-0000-0000-0000-000000000005', 'contractnest', 'WhatsApp Pack - 100', 'notification', 'whatsapp', 100, 999.00, 'INR', true, 365, NOW()),
  ('p1000000-0000-0000-0000-000000000006', 'contractnest', 'AI Reports Pack - 25', 'ai_report', NULL, 25, 4999.00, 'INR', true, 365, NOW()),
  ('p1000000-0000-0000-0000-000000000007', 'contractnest', 'AI Reports Pack - 50', 'ai_report', NULL, 50, 8999.00, 'INR', true, 365, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check plan
SELECT id, plan_code, plan_name, base_price FROM t_billing_plans WHERE product_code = 'contractnest';

-- Check subscription
SELECT s.id, s.status, s.billing_cycle, p.plan_name
FROM t_tenant_subscriptions s
JOIN t_billing_plans p ON s.plan_id = p.id
WHERE s.tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';

-- Check credit balances
SELECT credit_type, channel, balance, reserved
FROM t_credit_balances
WHERE tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';

-- Check topup packs
SELECT pack_name, credit_type, channel, credit_quantity, price FROM t_topup_packs WHERE is_active = true;

SELECT '✅ Test data seeded successfully for tenant a58ca91a-7832-4b4c-b67c-a210032f26b8' as status;

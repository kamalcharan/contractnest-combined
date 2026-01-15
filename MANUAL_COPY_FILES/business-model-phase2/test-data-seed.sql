-- ============================================================================
-- TEST DATA SEED for Billing Phase 2 Testing
-- Tenant: a58ca91a-7832-4b4c-b67c-a210032f26b8
-- ============================================================================
-- NOTE: Uses Phase 1 table names with t_bm_ prefix
-- ============================================================================

-- 1. Check if product config exists, if not create one
INSERT INTO t_bm_product_config (
  id,
  product_code,
  product_name,
  billing_config,
  is_active,
  created_at
) VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'contractnest',
  'ContractNest',
  '{
    "billing_type": "composite",
    "base_fee": {"amount": 2999, "currency": "INR", "cycle": "monthly"},
    "tiers": {
      "users": [
        {"min": 1, "max": 2, "price": 0},
        {"min": 3, "max": 5, "price": 299},
        {"min": 6, "max": 10, "price": 249}
      ]
    },
    "credits": {
      "notification": {"included": {"email": 500, "sms": 100, "whatsapp": 50}},
      "ai_report": {"included": 10}
    }
  }'::jsonb,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create/Update Tenant Subscription
INSERT INTO t_bm_tenant_subscription (
  id,
  tenant_id,
  plan_version_id,
  product_code,
  status,
  billing_cycle,
  trial_start_date,
  trial_end_date,
  current_period_start,
  current_period_end,
  grace_period_end,
  created_at
) VALUES (
  'a0000002-0000-0000-0000-000000000001',
  'a58ca91a-7832-4b4c-b67c-a210032f26b8',
  NULL, -- plan_version_id can be null for direct product subscription
  'contractnest',
  'active',
  'monthly',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '16 days',
  DATE_TRUNC('month', NOW()),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
  NULL,
  NOW() - INTERVAL '30 days'
) ON CONFLICT (id) DO UPDATE SET
  status = 'active',
  current_period_start = DATE_TRUNC('month', NOW()),
  current_period_end = DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- 3. Create Credit Balances
INSERT INTO t_bm_credit_balance (id, tenant_id, credit_type, channel, balance, reserved, last_reset_at, created_at)
VALUES
  -- Notification credits
  ('cb000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 450, 0, NOW(), NOW()),
  ('cb000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 85, 0, NOW(), NOW()),
  ('cb000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 42, 0, NOW(), NOW()),
  -- AI Report credits
  ('cb000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 8, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  balance = EXCLUDED.balance,
  reserved = EXCLUDED.reserved;

-- 4. Create Credit Transaction History
INSERT INTO t_bm_credit_transaction (id, tenant_id, credit_type, channel, transaction_type, quantity, balance_before, balance_after, source, description, created_at)
VALUES
  -- Initial allocation from subscription
  ('c1000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 'credit', 500, 0, 500, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 'credit', 100, 0, 100, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 'credit', 50, 0, 50, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 'credit', 10, 0, 10, 'subscription', 'Monthly allocation - Professional Plan', NOW() - INTERVAL '25 days'),

  -- Some usage deductions
  ('c1000000-0000-0000-0000-000000000005', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 'debit', 50, 500, 450, 'usage', 'Contract notifications batch', NOW() - INTERVAL '10 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 'debit', 15, 100, 85, 'usage', 'Payment reminders', NOW() - INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 'debit', 8, 50, 42, 'usage', 'Contract signed alerts', NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000008', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 'debit', 2, 10, 8, 'usage', 'Contract analysis reports', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Create Usage Events (t_bm_subscription_usage)
INSERT INTO t_bm_subscription_usage (id, tenant_id, metric_type, quantity, billing_period_start, billing_period_end, recorded_at, metadata, created_at)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'contract', 5, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '20 days', '{"type": "service_contract"}'::jsonb, NOW() - INTERVAL '20 days'),
  ('d1000000-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'contract', 3, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '15 days', '{"type": "service_contract"}'::jsonb, NOW() - INTERVAL '15 days'),
  ('d1000000-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'user', 2, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '10 days', '{"role": "team_member"}'::jsonb, NOW() - INTERVAL '10 days'),
  ('d1000000-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'storage_mb', 256, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '5 days', '{"file_type": "pdf"}'::jsonb, NOW() - INTERVAL '5 days'),
  ('d1000000-0000-0000-0000-000000000005', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification_email', 50, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '10 days', '{"template": "contract_notification"}'::jsonb, NOW() - INTERVAL '10 days'),
  ('d1000000-0000-0000-0000-000000000006', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification_sms', 15, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '5 days', '{"template": "payment_reminder"}'::jsonb, NOW() - INTERVAL '5 days'),
  ('d1000000-0000-0000-0000-000000000007', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', 2, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW() - INTERVAL '2 days', '{"report_type": "contract_analysis"}'::jsonb, NOW() - INTERVAL '2 days')
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
-- VERIFICATION QUERIES
-- ============================================================================

-- Check product config
SELECT id, product_code, product_name FROM t_bm_product_config WHERE product_code = 'contractnest';

-- Check subscription
SELECT id, tenant_id, product_code, status, billing_cycle, current_period_start, current_period_end
FROM t_bm_tenant_subscription
WHERE tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';

-- Check credit balances
SELECT credit_type, channel, balance, reserved
FROM t_bm_credit_balance
WHERE tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';

-- Check topup packs
SELECT name, credit_type, channel, quantity, price FROM t_bm_topup_pack WHERE is_active = true;

SELECT '✅ Test data seeded successfully for tenant a58ca91a-7832-4b4c-b67c-a210032f26b8' as status;

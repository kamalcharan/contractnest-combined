-- ============================================================================
-- Seed Credits & Topup Packs for Testing
-- Tenant: a58ca91a-7832-4b4c-b67c-a210032f26b8
-- ============================================================================

-- 1. Seed Credit Balances
INSERT INTO t_bm_credit_balance (id, tenant_id, credit_type, channel, balance, reserved_balance, low_balance_threshold, last_topup_at, last_topup_amount, created_at)
VALUES
  ('cb000001-0000-0000-0000-000000000001', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'email', 450, 0, 50, NOW() - INTERVAL '25 days', 500, NOW()),
  ('cb000001-0000-0000-0000-000000000002', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'sms', 85, 0, 20, NOW() - INTERVAL '25 days', 100, NOW()),
  ('cb000001-0000-0000-0000-000000000003', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'notification', 'whatsapp', 42, 0, 10, NOW() - INTERVAL '25 days', 50, NOW()),
  ('cb000001-0000-0000-0000-000000000004', 'a58ca91a-7832-4b4c-b67c-a210032f26b8', 'ai_report', NULL, 8, 0, 5, NOW() - INTERVAL '25 days', 10, NOW())
ON CONFLICT (id) DO UPDATE SET
  balance = EXCLUDED.balance,
  reserved_balance = EXCLUDED.reserved_balance;

-- 2. Seed Topup Packs
INSERT INTO t_bm_topup_pack (id, product_code, credit_type, name, description, quantity, price, currency_code, expiry_days, is_popular, is_active, sort_order, created_at)
VALUES
  -- Email packs
  ('d0000001-0000-0000-0000-000000000001', 'contractnest', 'notification', 'Email Pack - 500', '500 email notifications', 500, 499, 'INR', 365, false, true, 1, NOW()),
  ('d0000001-0000-0000-0000-000000000002', 'contractnest', 'notification', 'Email Pack - 1000', '1000 email notifications', 1000, 899, 'INR', 365, true, true, 2, NOW()),
  ('d0000001-0000-0000-0000-000000000003', 'contractnest', 'notification', 'Email Pack - 2500', '2500 email notifications', 2500, 1999, 'INR', 365, false, true, 3, NOW()),

  -- SMS packs
  ('d0000001-0000-0000-0000-000000000004', 'contractnest', 'notification', 'SMS Pack - 100', '100 SMS notifications', 100, 499, 'INR', 365, false, true, 4, NOW()),
  ('d0000001-0000-0000-0000-000000000005', 'contractnest', 'notification', 'SMS Pack - 500', '500 SMS notifications', 500, 1999, 'INR', 365, true, true, 5, NOW()),

  -- WhatsApp packs
  ('d0000001-0000-0000-0000-000000000006', 'contractnest', 'notification', 'WhatsApp Pack - 100', '100 WhatsApp messages', 100, 999, 'INR', 365, false, true, 6, NOW()),
  ('d0000001-0000-0000-0000-000000000007', 'contractnest', 'notification', 'WhatsApp Pack - 250', '250 WhatsApp messages', 250, 2249, 'INR', 365, true, true, 7, NOW()),

  -- AI Report packs
  ('d0000001-0000-0000-0000-000000000008', 'contractnest', 'ai_report', 'AI Reports - 25', '25 AI contract analysis reports', 25, 4999, 'INR', 365, false, true, 8, NOW()),
  ('d0000001-0000-0000-0000-000000000009', 'contractnest', 'ai_report', 'AI Reports - 50', '50 AI contract analysis reports', 50, 8999, 'INR', 365, true, true, 9, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Verify
SELECT 'Credit Balances' as type, credit_type, channel, balance FROM t_bm_credit_balance WHERE tenant_id = 'a58ca91a-7832-4b4c-b67c-a210032f26b8';
SELECT 'Topup Packs' as type, name, quantity, price FROM t_bm_topup_pack WHERE is_active = true ORDER BY sort_order;

SELECT '✅ Credits and Topup packs seeded' as status;

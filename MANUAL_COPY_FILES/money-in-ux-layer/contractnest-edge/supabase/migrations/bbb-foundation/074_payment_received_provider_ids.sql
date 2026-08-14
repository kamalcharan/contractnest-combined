-- ============================================================================
-- 074 — Point payment_received templates at the registered MSG91 templates,
-- and switch the rule on for BBB. ALREADY APPLIED LIVE. DO NOT RE-RUN.
-- ----------------------------------------------------------------------------
-- Owner registered payment_received_v2 (WhatsApp) and payment_received_email_v2
-- (email) after the first WhatsApp attempt was rejected — "too many variables
-- for its length", Meta's density rule between placeholders and static text.
-- Fixed in migration prior to this one: 4 vars -> 3, real sentences added.
--
-- provider_template_id set to the exact registered names:
--   payment_request_whatsapp -> already payment_request_v2 (migration 072)
--   payment_received_whatsapp -> payment_received_v2
--   payment_received_email    -> payment_received_email_v2
--
-- Verified live before enabling: dry run against the only three non-group
-- receipts BBB has refuses correctly with no_address — all three belong to
-- the same Test-mode QA contact with no channel on file. No real non-group
-- receipt exists yet to prove a live send; the group-session exclusion path
-- (71 of 74 receipts) is what's actually load-bearing here.
--
-- notif_payment_received enabled for BBB via update_vani_rule (version 1 -> 2),
-- not a raw UPDATE, so the optimistic-concurrency guard behaves as it would
-- from Settings. AFTER INSERT trigger on t_invoice_receipts now live-fires on
-- every future non-group receipt.
-- ============================================================================

UPDATE public.n_jtd_templates
   SET provider_template_id = 'payment_received_v2', updated_at = now()
 WHERE template_key = 'payment_received_whatsapp';

UPDATE public.n_jtd_templates
   SET provider_template_id = 'payment_received_email_v2', updated_at = now()
 WHERE template_key = 'payment_received_email';

-- select update_vani_rule('<tenant>', 'notif_payment_received', '{}', true, <version>, null);

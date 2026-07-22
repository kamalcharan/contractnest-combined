-- ============================================================================
-- Migration: operations-loop/022 — Contracts rules domain: sign-off invite
--            governed by Settings → Automations
-- ============================================================================
-- Owner decision (2026-07-22): outbound messages are governed by
-- RULES (Settings → Automations, user-edited) AND CHANNELS (/integrations) —
-- nothing goes out unless both allow it, except identity messages
-- (password reset / forgot password / user invites — separate change).
--
-- This migration adds the first 'contracts'-domain rule:
--   contract_signoff_invite — "send the buyer an acceptance invite
--   (email/WhatsApp) when a sign-off contract is sent". Default ON.
--   Consumed at ENQUEUE time by the contracts edge function's /notify
--   handler via the existing vani_rule_enabled() helper (not by the
--   scanner). When the rule is off, the notify call records a
--   'notification_suppressed' contract-history entry instead of sending,
--   so suppression stays auditable.
--
-- get_vani_rules merges templates with tenant config, so the new rule
-- appears on every tenant's Automations page automatically, enabled.
--
-- Depends on: operations-loop/017 (rules framework)
-- Safe to re-run: Yes (ON CONFLICT DO NOTHING)
-- Applied live: 2026-07-22 — project uwyqhzotluikawcboldr
-- ============================================================================

INSERT INTO m_vani_rule_templates
    (rule_key, name, description, domain, default_config, constraints, sort_order)
VALUES
    ('contract_signoff_invite', 'Contract sign-off invites',
     'Send the buyer an acceptance invite (email/WhatsApp) when a sign-off contract is sent. When off, contracts are still created — share the acceptance link manually.',
     'contracts', '{}', '{}', 5)
ON CONFLICT (rule_key) DO NOTHING;

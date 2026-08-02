-- ============================================================
-- 13_sequence_counters_and_stats.sql
-- Demo tenant setup — two fixes applied live 2026-08-02 (evening)
--
-- FIX A (data): RFQ save failed with 502 (edge 400). Traced via
-- create_contract_transaction replay: "Sequence PROJECT not found for
-- tenant in LIVE environment". Onboarding seeds 8 per-tenant sequence
-- counters (CONTACT, CONTRACT, INVOICE, PROJECT, QUOTATION, RECEIPT,
-- TASK, TICKET) x live/test in t_sequence_counters; the demo seed only
-- created a few. Filled every missing (code x env) for all 7 demo
-- tenants from the newest real-tenant template rows (~106 rows,
-- idempotent NOT EXISTS guard). RFQ numbering uses PROJECT (PRJ-).
-- Verified: create_contract_transaction RFQ payload now returns
-- success=true (test rolled back).
--
-- FIX B (platform, applied via migration "contact_stats_top_level_only"):
-- get_contact_stats counted nested contact persons while
-- list_contacts_with_channels_v2 never lists them, so chips like
-- "Vendors (11)" never matched the 7 visible rows. Added
-- parent_contact_id IS NULL to both count populations. Platform-wide
-- behavior fix (production benefits too). See supabase migration for
-- the full function body.
-- ============================================================

INSERT INTO t_sequence_counters
  (id, sequence_type_id, tenant_id, current_value, last_reset_date, is_live, created_at, updated_at, created_by, updated_by,
   sequence_code, prefix, separator, suffix, padding_length, start_value, increment_by, reset_frequency,
   display_name, description, hexcolor, icon_name, is_active)
SELECT gen_random_uuid(), NULL, d.tenant_id, 0,
  now(), t.is_live, now(), now(), d.created_by, d.created_by,
  t.sequence_code, t.prefix, t.separator, t.suffix, t.padding_length, t.start_value, t.increment_by, t.reset_frequency,
  t.display_name, t.description, t.hexcolor, t.icon_name, true
FROM (
  SELECT DISTINCT ON (sequence_code, is_live)
    sequence_code, is_live, prefix, separator, suffix, padding_length,
    start_value, increment_by, reset_frequency, display_name, description,
    hexcolor, icon_name
  FROM t_sequence_counters
  ORDER BY sequence_code, is_live, created_at DESC
) t
CROSS JOIN (
  SELECT tn.id AS tenant_id,
         (SELECT ut.user_id FROM t_user_tenants ut WHERE ut.tenant_id = tn.id LIMIT 1) AS created_by
  FROM t_tenants tn WHERE tn.id::text LIKE 'c0000000-0000-4000-8000-%'
) d
WHERE NOT EXISTS (
  SELECT 1 FROM t_sequence_counters e
  WHERE e.tenant_id = d.tenant_id AND e.sequence_code = t.sequence_code AND e.is_live = t.is_live
);

-- Note: seller tenants already had live CONTACT/CONTRACT counters from
-- script 01 (current_value 1016/1025 — collision-safe with the manually
-- numbered CN-1001..CN-1016 contracts). Buyers' new CONTRACT counters
-- start fresh at 1001 (they own no contract numbers yet).

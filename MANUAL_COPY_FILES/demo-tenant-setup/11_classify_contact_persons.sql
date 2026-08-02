-- ============================================================
-- 11_classify_contact_persons.sql
-- Demo tenant setup — classify contact persons (applied live 2026-08-02)
--
-- SYMPTOM: contacts list filter chips didn't add up (e.g. Pulse:
-- All 13 vs Vendors 6 + Team Members 3) because seeded contact_person
-- rows had classifications = [] and so appeared under no filter chip.
-- Production contact persons DO carry classifications (client/vendor/
-- both — verified against live non-demo tenants), so the seed deviated
-- from real behavior.
--
-- FIX: each contact_person inherits its parent company's
-- classifications. Idempotent (only touches empty ones).
-- Result: 49 rows across the 7 demo tenants — sellers' persons
-- became ['client'], buyers' persons became ['vendor'].
-- ============================================================

UPDATE t_contacts child
SET classifications = parent.classifications, updated_at = now()
FROM t_contacts parent
WHERE child.parent_contact_id = parent.id
  AND child.tenant_id::text LIKE 'c0000000-0000-4000-8000-%'
  AND child.type = 'contact_person'
  AND (child.classifications IS NULL OR child.classifications = '[]'::jsonb)
  AND parent.classifications IS NOT NULL AND parent.classifications <> '[]'::jsonb;

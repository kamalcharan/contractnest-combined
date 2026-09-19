-- jtd-nucleus/026 — make template resolution unique.
-- APPLIED LIVE 2026-09-19. Source of record.
--
-- jtd-worker's getTemplate() resolves by source_type_code + channel_code +
-- tenant_id + is_active and ends in .single(), which ERRORS on multiple rows
-- rather than picking one. The pre-existing uq_template
-- (tenant_id, template_key, channel_code, is_live) could not prevent that:
-- it keys on template_key, is_live was NULL on 12 of 28 rows and NULLs are
-- distinct in a unique index, and tenant_id NULL is likewise distinct — so the
-- GLOBAL registry rows every tenant falls back to were unprotected.
--
-- is_live is deliberately OMITTED: getTemplate does not filter on it, so two
-- rows differing only by is_live are still two rows in front of .single().
-- This is what makes "one row per (tenant, source_type, channel)" enforceable.
-- is_active is NOT NULL DEFAULT true, so the predicate needs no COALESCE.
--
-- The old uq_template is left in place: harmless, merely under-protective.

CREATE UNIQUE INDEX uq_jtd_template_resolution
  ON n_jtd_templates (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    source_type_code,
    channel_code
  )
  WHERE is_active;

DO $check$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM pg_indexes
   WHERE tablename = 'n_jtd_templates' AND indexname = 'uq_jtd_template_resolution';
  IF v_n <> 1 THEN RAISE EXCEPTION '026: index not created'; END IF;
END $check$;

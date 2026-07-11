-- Migration: bbb-foundation/015_group_session_block_category.sql
-- ============================================================================
-- Batch 1 (Group Session): register a "Group Session" block category so it
-- appears in Catalog Studio's block-type picker for every tenant.
--
-- A Group Session is a SERVICE block with config.audience = 'group' — the
-- engine branches on audience, never on the category name. This row only makes
-- the picker card discoverable; blocks created from it are stored with
-- type = 'service' (so all existing service logic applies) and
-- category = 'session' (for grouping) — see catBlockAdapter.blockToCreateData.
--
-- Mirrors the existing 'service' row under the same cat_block_type parent
-- (category_id = 9e863852-d832-45ce-a5f7-051644b17d62). Idempotent.
-- ============================================================================

INSERT INTO m_category_details
  (sub_cat_name, display_name, category_id, icon_name, hexcolor,
   sequence_no, is_active, is_deletable, description)
SELECT
  'session',
  'Group Session',
  '9e863852-d832-45ce-a5f7-051644b17d62'::uuid,
  'Users',
  '#DA6410',
  4,
  true,
  true,
  'Recurring group meetings with attendance (e.g. chapter meetings, group classes)'
WHERE NOT EXISTS (
  SELECT 1 FROM m_category_details
  WHERE sub_cat_name = 'session'
    AND category_id = '9e863852-d832-45ce-a5f7-051644b17d62'::uuid
);

-- ============================================================
-- RPC UPDATES: Apply these in Supabase SQL Editor
-- These update the LIVE RPCs to include contact_number
-- ============================================================

-- ============================================================
-- UPDATE 1: list_contacts_with_channels_v2
-- Add 'contact_number' to the SELECT and search clause
-- ============================================================

-- Find this line in your list_contacts_with_channels_v2 RPC:
--   'is_live', c.is_live,
-- And add AFTER it:
--   'contact_number', c.contact_number,

-- Find the search WHERE clause:
--   OR c.name ILIKE '%' || p_search || '%'
--   OR c.company_name ILIKE '%' || p_search || '%'
-- And add:
--   OR c.contact_number ILIKE '%' || p_search || '%'

-- ============================================================
-- UPDATE 2: get_contact_full_v2
-- Add 'contact_number' to the SELECT
-- ============================================================

-- Find this line in your get_contact_full_v2 RPC:
--   'is_live', c.is_live,
-- And add AFTER it:
--   'contact_number', c.contact_number,

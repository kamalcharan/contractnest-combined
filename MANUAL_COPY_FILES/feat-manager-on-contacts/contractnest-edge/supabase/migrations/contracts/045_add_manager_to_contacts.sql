-- ============================================================
-- Migration 045: Add manager_id and manager_name to t_contacts
-- Purpose: Allow assigning an account manager (team member) to any contact
-- ============================================================

-- Step 1: Add columns
ALTER TABLE t_contacts
  ADD COLUMN IF NOT EXISTS manager_id   UUID         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manager_name TEXT         DEFAULT NULL;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN t_contacts.manager_id   IS 'FK to t_contacts.id — the team-member contact acting as account manager';
COMMENT ON COLUMN t_contacts.manager_name IS 'Denormalized display name of the account manager for fast reads';

-- Step 3: Index for filtering contacts by manager
CREATE INDEX IF NOT EXISTS idx_contacts_manager_id
  ON t_contacts (manager_id)
  WHERE manager_id IS NOT NULL;

-- Step 4: Update the update_contact_idempotent_v2 RPC to handle manager fields
-- NOTE: The RPC receives p_contact_data as JSONB. We need to ensure the UPDATE
-- statement inside the RPC includes manager_id and manager_name.
-- Since the RPC lives in Supabase directly (not in migration files), you must
-- run the following ALTER on the RPC body in your Supabase SQL Editor:
--
-- Inside the UPDATE t_contacts SET ... block of update_contact_idempotent_v2, add:
--
--   manager_id   = CASE WHEN p_contact_data ? 'manager_id'
--                       THEN (p_contact_data->>'manager_id')::UUID
--                       ELSE manager_id END,
--   manager_name = CASE WHEN p_contact_data ? 'manager_name'
--                       THEN p_contact_data->>'manager_name'
--                       ELSE manager_name END,
--
-- Inside the INSERT INTO t_contacts (...) block of create_contact_idempotent_v2, add:
--   manager_id   column with value: (p_contact_data->>'manager_id')::UUID
--   manager_name column with value: p_contact_data->>'manager_name'
--
-- Inside the get_contact_full_v2 SELECT, add:
--   c.manager_id, c.manager_name
--   to the returned JSON object
--
-- ============================================================
-- END OF MIGRATION
-- ============================================================

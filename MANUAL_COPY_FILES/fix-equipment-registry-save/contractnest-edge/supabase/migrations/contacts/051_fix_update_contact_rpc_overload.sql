-- Fix: Resolve update_contact_idempotent_v2 function overload conflict
--
-- Problem: Two overloaded versions exist (one with p_idempotency_key TEXT, one UUID).
-- PostgreSQL PGRST203: "Could not choose the best candidate function"
--
-- The api_idempotency.key column is UUID type, so the function parameter must also be UUID.
-- The edge function passes crypto.randomUUID() which is a valid UUID string —
-- Supabase PostgREST auto-casts it to UUID when there's no ambiguity.
--
-- Fix: Drop the TEXT version (wrong type), keep/recreate the UUID version.

-- Drop the TEXT version that was incorrectly created
DROP FUNCTION IF EXISTS update_contact_idempotent_v2(text, uuid, jsonb, jsonb, jsonb, jsonb);

-- Also drop any TEXT version of create_contact_idempotent_v2
DROP FUNCTION IF EXISTS create_contact_idempotent_v2(text, uuid, text, jsonb, jsonb, jsonb, jsonb, boolean);

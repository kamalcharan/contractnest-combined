-- Fix: Drop duplicate update_contact_idempotent_v2 with UUID idempotency key
-- There are two overloaded versions:
--   1. update_contact_idempotent_v2(p_idempotency_key TEXT, ...)
--   2. update_contact_idempotent_v2(p_idempotency_key UUID, ...)
-- PostgreSQL error PGRST203: "Could not choose the best candidate function"
-- when a UUID-format string is passed (ambiguous between text and uuid).
--
-- The edge function's contactService generates idempotency keys via
-- crypto.randomUUID() which returns a string — so keep the TEXT version.

-- Drop the UUID-parameter version specifically
DROP FUNCTION IF EXISTS update_contact_idempotent_v2(uuid, uuid, jsonb, jsonb, jsonb, jsonb);

-- Also fix the same issue for create_contact_idempotent_v2 if it exists
DROP FUNCTION IF EXISTS create_contact_idempotent_v2(uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, boolean);

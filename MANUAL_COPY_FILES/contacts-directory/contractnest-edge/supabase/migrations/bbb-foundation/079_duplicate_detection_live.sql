-- 079_duplicate_detection_live.sql
-- ALREADY APPLIED LIVE (2026-09-16) — this file is a source-of-record copy.
-- DO NOT RE-RUN.
--
-- Layer 1 of "merge duplicates" (owner: "what is your proposal" → "fix
-- detection first"). t_contacts.potential_duplicate is the flag the whole
-- duplicates feature is meant to run on — it was never populated: 0 of 460
-- live contacts have it set. The function meant to compute it,
-- update_duplicate_flags(), exists but is called from nowhere in the app
-- or a cron. Its own matching also has the same weakness that caused the
-- Tejaswinni duplicate: an exact-string mobile compare, so
-- '+919059951359' and '9059951359' would never be flagged as the same
-- number.
--
-- get_tenant_duplicate_contact_ids() replaces the stale flag with a LIVE
-- computation at query time — no cron/maintenance job to forget, so it
-- can never go stale again. Matches on mobile (normalized to last-10-
-- digits, same convention as migration 076) or email (case-insensitive,
-- trimmed), scoped to one tenant + one environment (is_live), excluding
-- archived contacts and excluding CHILD contacts (parent_contact_id IS
-- NOT NULL) — children are already hidden from the base contact
-- population by migration 077 unless a tag filter is active, so flagging
-- one here would be a confusing false positive (a stand-in sharing a
-- household phone with their parent contact is not the duplicate this
-- feature is for).
--
-- Verified live: (1) a real read-only check against BBB found 4 pairs
-- that a naive exact-match would flag, e.g. two "CHARAN KAMAL" rows — all
-- traced to be a LIVE contact and its TEST-environment counterpart from
-- BBB's pre-go-live setup, correctly excluded since this scopes to one
-- is_live value; (2) a guarded rollback transaction created two throwaway
-- contacts with the same number in different formats ('+919876543210' vs
-- '9876543210') and confirmed both were flagged, then rolled back —
-- zero residue confirmed after.
CREATE OR REPLACE FUNCTION public.get_tenant_duplicate_contact_ids(p_tenant_id uuid, p_is_live boolean)
RETURNS TABLE(contact_id uuid)
LANGUAGE sql
STABLE
AS $function$
  WITH mobile_norm AS (
    SELECT ch.contact_id, right(regexp_replace(ch.value, '\D', '', 'g'), 10) AS last10
    FROM t_contact_channels ch
    JOIN t_contacts c ON c.id = ch.contact_id
    WHERE ch.channel_type = 'mobile'
      AND c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.status <> 'archived'
      AND c.parent_contact_id IS NULL
      AND length(regexp_replace(ch.value, '\D', '', 'g')) >= 10
  ),
  mobile_dupes AS (
    SELECT a.contact_id
    FROM mobile_norm a
    JOIN mobile_norm b ON a.last10 = b.last10 AND a.contact_id <> b.contact_id
  ),
  email_norm AS (
    SELECT ch.contact_id, lower(trim(ch.value)) AS email
    FROM t_contact_channels ch
    JOIN t_contacts c ON c.id = ch.contact_id
    WHERE ch.channel_type = 'email'
      AND c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.status <> 'archived'
      AND c.parent_contact_id IS NULL
      AND ch.value IS NOT NULL AND trim(ch.value) <> ''
  ),
  email_dupes AS (
    SELECT a.contact_id
    FROM email_norm a
    JOIN email_norm b ON a.email = b.email AND a.contact_id <> b.contact_id
  )
  SELECT contact_id FROM mobile_dupes
  UNION
  SELECT contact_id FROM email_dupes;
$function$;

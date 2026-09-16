-- 082_check_contact_duplicates_fix.sql
-- ALREADY APPLIED LIVE (2026-09-16) — this file is a source-of-record copy.
-- DO NOT RE-RUN.
--
-- check_contact_duplicates (4-arg, the one the app actually calls) threw
-- "column tenant_id does not exist" on EVERY invocation, even with a
-- valid p_tenant_id explicitly passed. Cause: a dead COALESCE fallback
-- branch referenced t_user_profiles.tenant_id, a column that table has
-- never had (it's a personal profile table, not tenant-scoped — confirmed
-- against the live schema). Postgres validates every column reference in
-- a function body at parse time regardless of whether that branch would
-- ever actually execute at runtime, so the presence of the invalid
-- reference failed the whole call unconditionally. Removed the dead
-- branch (the edge service always passes p_tenant_id explicitly — the
-- only real caller — so it was unreachable anyway); kept the JWT-claim
-- fallback.
--
-- Caller impact: the RPC error was caught by check_contact_duplicates' own
-- blanket EXCEPTION handler and turned into {success:false}, which the
-- edge's checkForDuplicates() treats as "no channel-based duplicates
-- found" and silently continues. So phone/email duplicate detection at
-- contact CREATE time has been unconditionally broken — returning empty
-- results regardless of the earlier hasDuplicates/has_duplicates frontend
-- property fix (see QuickAddContactDrawer.tsx in this batch). This is why
-- an exact phone match ("mr cherry" vs "mr charan kamal", byte-identical
-- number) still wasn't caught after that fix landed.
--
-- Also drops the stale 3-arg overload (p_contact_channels,
-- p_exclude_contact_id, p_is_live — no tenant filtering at all). Confirmed
-- zero live callers (the real caller always passes all 4 named params,
-- which PostgREST resolves specifically to the 4-arg signature; the only
-- other reference was in the junk contactService copy.ts file already
-- deleted by this batch). Left in place, it was a real cross-tenant
-- data-leak risk — the exact same "stale overload beside the current one"
-- pattern already fixed once this session for gs_checkin_guest
-- (migration 076).
--
-- Verified live: re-ran the exact call that previously errored
-- (mobile +919885164233, the owner's live test tenant) and it now
-- correctly returns hasDuplicates:true with all three matching contacts
-- (cherry / charan kamal / kamal).
DROP FUNCTION IF EXISTS public.check_contact_duplicates(jsonb, uuid, boolean);

CREATE OR REPLACE FUNCTION public.check_contact_duplicates(p_contact_channels jsonb, p_exclude_contact_id uuid DEFAULT NULL::uuid, p_is_live boolean DEFAULT true, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_channel record;
  v_duplicates jsonb := '[]'::jsonb;
  v_duplicate_contacts jsonb;
  v_actual_tenant_id uuid;
BEGIN
  -- Get the tenant_id from JWT if not provided
  v_actual_tenant_id := COALESCE(
    p_tenant_id,
    (auth.jwt() ->> 'tenant_id')::uuid
  );

  -- Check each contact channel for duplicates
  FOR v_channel IN
    SELECT * FROM jsonb_to_recordset(p_contact_channels) AS x(
      channel_type text,
      value text
    )
  LOOP
    -- Only check critical channels (email and mobile)
    IF v_channel.channel_type IN ('mobile', 'email') THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', v_channel.channel_type,
          'value', v_channel.value,
          'existing_contact', jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'company_name', c.company_name,
            'type', c.type,
            'status', c.status,
            'classifications', c.classifications
          )
        )
      ) INTO v_duplicate_contacts
      FROM t_contact_channels ch
      INNER JOIN t_contacts c ON ch.contact_id = c.id
      WHERE ch.channel_type = v_channel.channel_type
        AND ch.value = v_channel.value
        AND c.is_live = p_is_live
        AND c.tenant_id = v_actual_tenant_id  -- TENANT FILTER
        AND c.status != 'archived'
        AND (p_exclude_contact_id IS NULL OR c.id != p_exclude_contact_id);

      IF v_duplicate_contacts IS NOT NULL THEN
        v_duplicates := v_duplicates || v_duplicate_contacts;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'hasDuplicates', jsonb_array_length(v_duplicates) > 0,
      'duplicates', v_duplicates
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'CHECK_DUPLICATES_ERROR'
    );
END;
$function$;

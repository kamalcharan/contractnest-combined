-- 029_guest_tag_casing.sql
-- Guest/substitute check-in wrote tag_value 'guest'/'substitute' (lowercase),
-- but the Tags LOV entry is 'Guest' (capital). The contact-list tag filter
-- counts LOV tags with a CASE-SENSITIVE key (by_tag['Guest']), so the guest
-- chip showed 0. Substitute isn't in the LOV so it counted as a free-text tag
-- and worked. Fix: write 'Guest'/'Substitute' + backfill existing rows.
-- APPLIED LIVE to uwyqhzotluikawcboldr. See gs_checkin_guest / gs_checkin_substitute
-- (v_tags tag_value -> 'Guest' / 'Substitute'; guest dedupe matcher -> 'Guest').

UPDATE public.t_contacts SET tags = jsonb_set(tags, '{0,tag_value}', '"Guest"'::jsonb)
WHERE source = 'session_checkin' AND tags @> '[{"tag_value":"guest"}]';
UPDATE public.t_contacts SET tags = jsonb_set(tags, '{0,tag_value}', '"Substitute"'::jsonb)
WHERE source = 'session_checkin' AND tags @> '[{"tag_value":"substitute"}]';

-- (RPC bodies re-created with the capitalized tag_value — see migration text
--  applied live; identical to 027 except the two v_tags literals + guest
--  dedupe @> matcher.)

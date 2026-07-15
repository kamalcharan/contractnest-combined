-- OPTIONAL one-time data patch for the ONE catalog block that already lost its
-- config to the edit-path bug (config was wiped to {"icon":"Wrench"}).
-- After applying the UI code fix (catBlockAdapter.ts), you can INSTEAD just
-- re-open this block in Catalog Studio and re-enter "14 days / Saturday" — that
-- is cleaner and uses your real inputs. Run this only if you'd rather patch it
-- directly. Adjust days/anchorWeekday if your intended cadence differs.
--
-- anchorWeekday: 0=Sun, 1=Mon, ... 6=Sat.  "Every Saturday" = 6.
-- Block: "Bi Weekly Meetings" (tenant BBB, is_live=true).

update m_cat_blocks
set category = 'service',                       -- group sessions list/persist as service
    config = jsonb_build_object(
      'icon', coalesce(config->>'icon', 'Wrench'),
      'audience', 'group',
      'serviceCycles', jsonb_build_object(
        'enabled', true,
        'days', 14,
        'anchorWeekday', 6
      )
    )
where id = '3f22e995-34b6-4a39-9d10-aa948c0152e4';

-- Verify:
-- select id, name, category, config from m_cat_blocks
-- where id = '3f22e995-34b6-4a39-9d10-aa948c0152e4';

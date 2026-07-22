# HANDOVER — 2026-07-21 · BBB Messaging Incident, Kill Switches & Contract/Task Fixes

**Branch (parent):** `claude/sprint1b-migration-handoff-5rk8pr`
**Supabase project:** `uwyqhzotluikawcboldr`
**Delivery model:** files staged under `MANUAL_COPY_FILES/<batch>/<submodule>/…` on the parent branch, committed/pushed there directly; owner copies into the real submodules and merges to each submodule's own `main` (two-phase per CLAUDE.md). DB migrations and edge functions were applied **live** to the Supabase project during the session via MCP tools, independent of git.
**Owner confirmed "code is merged to main"** at end of session — verified below **which parts actually made it**, because it's a mixed picture (see §0, read this first).

---

## 0. READ THIS FIRST — live-but-not-yet-in-git-main gap (safety-relevant)

Everything in §1 below was **applied live to Supabase** (verified working via direct SQL/RPC tests) regardless of git state. But `contractnest-edge`'s `main` branch is **missing several of these changes at the source level**, confirmed by direct comparison against `origin/main` at end of session:

| Migration / change | Live in Supabase? | In `contractnest-edge` git `main`? |
|---|---|---|
| `041_contact_status_v2.sql` (status RPC hardening) | ✅ | ❌ missing |
| `contacts` edge fn — `getAuthUserId` FK fix (Phase 2 wiring) | ✅ (v67) | ✅ present |
| `042_contact_number_in_full_v2.sql` | ✅ | ✅ present |
| `043_fix_group_session_reset_orphans.sql` | ✅ | ❌ missing |
| `044_bbb_contact_risk_mitigation.sql` | ✅ | ❌ missing |
| `integrations-messaging-visibility/002_builtin_channel_toggle.sql` | ✅ | ❌ missing |
| `integrations-messaging-visibility/003_builtin_channel_toggle_both_envs.sql` | ✅ | ❌ missing |
| `jtd-worker/index.ts` — tenant kill switch + global TEST-env guardrail | ✅ (v24) | ❌ missing (index.ts has no `n_jtd_tenant_config` reference on main at all) |
| `jtd-worker/handlers/{sms,whatsapp}.ts` — countryCode support | ✅ | ✅ present (this was already-merged, pre-existing work; just hadn't been redeployed until this session) |

**Why this matters:** the DB objects (RPCs, tables, config rows) live directly in Supabase and are unaffected by git. But if `jtd-worker` or the `contacts` function is ever **redeployed from a `contractnest-edge` `main` checkout** (CLI, CI/CD, a fresh clone) without first pulling in the missing batches below, **the kill switches silently disappear** — `jtd-worker` would go back to blindly dispatching every queued message with no `n_jtd_tenant_config` check at all, undoing today's incident fix.

**Action for next session (or immediately, if convenient):** copy + commit + push these into `contractnest-edge`'s own `main` (not just the parent repo) — they're the only genuinely safety-critical merge gap right now:
- `MANUAL_COPY_FILES/contact-status-hardening/` (041)
- `MANUAL_COPY_FILES/group-session-reset-orphans/` (043)
- `MANUAL_COPY_FILES/bbb-contact-risk-mitigation/` (044)
- `MANUAL_COPY_FILES/builtin-channel-toggle/` (edge migrations 002 + 003 — the UI half of this batch, `IntegrationProviderCard.tsx`, IS already on `contractnest-ui` main)
- `MANUAL_COPY_FILES/bbb-notification-killswitch/` (jtd-worker/index.ts — both the BBB-scoped and the global TEST-env commits, `4cb79c9e` and `079ecf2f`)

Everything else this session (`contractnest-ui` batches) was spot-checked present on `contractnest-ui` `main` — see §1 for the full list; `contractnest-api` was untouched this session.

---

## 1. What we shipped this session

### A. BBB messaging incident (the core of this session)
Owner reported real WhatsApp/emails were reaching real people while testing on tenant **BBB** (`dd194710-92b4-4110-80eb-0b492a0d2c1f`). Traced and fixed in stages, escalating as it became clear the first fix wasn't the whole story:

1. **Architecture mapped first** (via a research agent): all outbound WhatsApp/email goes through MSG91, dispatched from a single chokepoint — `jtd-worker/index.ts`'s `processMessage()` — regardless of which feature enqueued the message (contract signoff, user invitations, payment/invoice notifications all funnel into the `n_jtd` queue). A tenant-config table (`n_jtd_tenant_config`: `tenant_id`, `is_live`, `is_active`, `channels_enabled` jsonb) already existed for exactly this purpose and the 3 enqueue-side callers (`contracts/jtd-integration.ts`, `payment-gateway/jtd-integration.ts`, `user-invitations/jtd-integration.ts`) already checked it before enqueueing — **but `jtd-worker` itself never re-checked it before actually sending**, so it blindly dispatched anything already queued, and any future enqueue path that skipped the per-caller check would bypass the config entirely.
2. **Batch `bbb-notification-killswitch` (round 1):** inserted `n_jtd_tenant_config` rows for BBB (both `is_live` true/false) with `channels_enabled.email`/`.whatsapp` = false, AND added the missing re-check inside `jtd-worker.processMessage()` — general fix, not hardcoded to BBB, closes the "already-queued message" and "future bypass" gaps. Deployed live as `jtd-worker` v23.
3. **Owner reported it was STILL happening, panic ensued.** Investigation: nothing new had hit the `n_jtd` queue in the prior 20 minutes at the time of the follow-up — the messages people reacted to were the SAME earlier batch (19 emails, `status_code='sent'`, sent before any fix existed) — not a live ongoing leak. Also ruled out `sendInvitationEmail`/`sendInvitationWhatsApp` in `user-invitations/index.ts` as a bypass (confirmed zero call sites anywhere in the codebase — dead code).
4. **Batch `bbb-notification-killswitch` (round 2, urgent):** added a SECOND, unconditional guardrail — **any** queue record with `is_live=false` is blocked from email/WhatsApp dispatch, for **every tenant**, independent of the per-tenant config. Rationale: test/seeded data routinely carries real people's contact info, so a test-environment action must never be able to message a real inbox, platform-wide, not just for BBB. Deployed live as `jtd-worker` v24.
5. **Owner asked for the Integrations page to be the real control** ("`/integrations` is all about enabling and disabling the messages, we should actually do from there"). Found `IntegrationProviderCard.tsx`'s "ContractNest WhatsApp/Email (Built-in)" cards showed static "Active"/"Enabled" copy from a global catalog flag (`t_integration_providers.metadata.platform_managed`) with **zero connection** to any real per-tenant state — the page's already-existing real toggle mechanism (`t_tenant_integrations` + `toggle_integration_status` RPC) just had no row for these two providers.
   - **Batch `builtin-channel-toggle`:** seeded a `t_tenant_integrations` row per tenant per built-in provider (157 tenants × 2 providers, BBB seeded pre-disabled to match its current state), added an `AFTER INSERT ON t_tenants` trigger for future tenants, and extended `toggle_integration_status` to sync `n_jtd_tenant_config.channels_enabled` whenever a built-in channel is toggled — so the switch now actually controls sending, not just its own label. `IntegrationProviderCard.tsx` badge/status text now reflects real `tenantIntegration.is_active` state instead of being hardcoded.
   - **Follow-up fix (same batch, migration `003`):** first pass only seeded `is_live=true` rows; `get_integrations_by_type`/`get_tenant_integration` join on `(tenant_id, is_live = p_is_live)`, so viewing the page in **test mode** found no row and kept showing the old static badge with no toggle at all. Backfilled the missing `is_live=false` row for all 157 tenants (628 total rows now = 157 × 2 providers × 2 environments) and fixed the trigger to seed both going forward. Re-verified live via the read RPC in test mode.
6. **Batch `bbb-contact-risk-mitigation`:** owner-requested extra defense-in-depth — corrupt every stored BBB mobile/email so an accidental send (from any future bug bypassing everything above) fails to reach a real inbox/phone. Transformation: append the value's own last character twice (owner's exact example: `gmail.com` → `gmail.commm`). Applied to all 104 `t_contact_channels` rows for BBB, both environments (owner explicitly chose "both," not just test). **Fully reversible** — a new `t_contact_channel_risk_backup` table holds every original value; the exact restore query is in the migration file and its `COPY_INSTRUCTIONS.txt`. Checked `t_contracts.buyer_email`/`buyer_phone` (a snapshot field `contracts/index.ts:859-860` reads before falling back to a live contact lookup) — empty for BBB's only contract, nothing to corrupt there.

**Residual/known gaps from the incident, not fixed this session:**
- Any NEW contact added to BBB after the corruption migration ran will have real, uncorrupted data unless the migration (or equivalent) is re-run — it's a one-time pass, not a standing trigger.
- `payment-gateway/jtd-integration.ts`'s `customer.email`/`customer.contact` trace back to Razorpay's own customer object — external to this DB, outside what a DB-level fix can reach.
- Other snapshot-style contact fields on invoices/service tickets/appointments were not audited beyond the two confirmed JTD-enqueue paths checked (contract signoff, payment request).

### B. Contract PDF/preview date bugs (batch `contract-pdf-date-fixes`)
Reported: creating a contract via template with a picked start date (e.g. 1 Apr 2026) showed a preview with **today's date** as the effective date, and a saved contract's buyer-facing review/PDF also showed the wrong date. Turned out to be **two separate bugs**:
1. `ContractWizard/index.tsx`'s `case 'review':` never passed `startDate={wizardState.startDate}` to `<ReviewSendStep>` — silently defaulted to `new Date()`. One-line fix.
2. `ContractDocument.tsx`'s `buildDocFromSavedContract` and `pages/contracts/review/index.tsx` computed the displayed date from `created_at` instead of `start_date` for **already-saved** contracts — independent, pre-existing bug. Root cause: the backend already returned `start_date` correctly (verified via `get_contract_by_id`); the frontend interfaces (`FullContractData`, `SavedContractDocInput`) simply never declared the field, so it was silently dropped. Added the field to both interfaces; split the review page's single `startDate` variable into `createdDate` (still `created_at`, used only for the "· Created {date}" byline) and `startDate` (now genuinely `start_date`, used for the term range and PDF).

### C. Group-session reset RPC silently no-op'd (batch `group-session-reset-orphans`)
Reported: a group-session dashboard showed impossible attendance like "4/1 present". Root cause: `reset_tenant_session_and_forms()` (called by the live "reset test data" button) deleted `t_session_attendance`/`t_session_payment_declarations` by matching a `session_contract_id` column that is **never populated anywhere in the codebase** (0 non-null rows, all tenants, confirmed by direct query) — attendance is actually linked via `member_contact_id` + `schedule_occurrence_id`. The delete was always a no-op, masked further by a blanket `EXCEPTION WHEN OTHERS THEN NULL`. Old test contacts got wiped; their attendance rows survived and kept counting toward whatever contract/block came next.
Fix: rescoped both deletes to `tenant_id` + the occurrence's own `is_live` flag (via `t_group_session_schedule.is_live` / `t_contract_events.is_live`) instead of the dead contract-id column — deliberately NOT joined through `member_contact_id`, since that would fail to clean up exactly the already-orphaned rows this exists to fix (their contact no longer exists at all). One-time cleanup of the 5 confirmed-orphaned rows already live-verified and applied.

### D. Add Service Blocks — no way to remove a saved catalog block (existing batch `service-blocks-single-column`, "LATEST FIX 3")
This is the single-column checklist redesign of the contract wizard's block-picker (owner-facing text: "tick what this contract delivers"). `ChecklistRow.tsx` already had a working "Remove line" button (bottom of the expanded editor, next to "Done") but `ServiceBlocksStep.tsx` only ever wired `onRemove` for custom/flyBy lines, not regular catalog blocks — for those, the only removal path was re-clicking the small checkbox at the top of the row, easy to miss once expanded into a full pricing editor with a "Done" button that reads as "finish configuring," not "remove." Passed `onRemove` through for catalog blocks too.
**Note:** this whole redesign (`service-blocks-single-column`) is a large batch with its own long history predating this session segment — this was an incremental fix on top of it, not a new batch.

### E. Group-session Tasks-tab cards showed Book appointment / Start Service
Owner: group sessions should never offer those two actions — should show a heading and navigate to the Group Session menu instead.
- `EventCard.tsx` already correctly excluded "Book appointment" (`canBookAppointment` required `!isGroupSession`) but left that row **blank** for group sessions. Added a "Group Session" label + "Go to Group Session" button (navigates to `/group-sessions`) in that slot.
- `SellerTasksTab.tsx`'s **separate** per-date "Start Service" bulk button (opens a panel to start every service event scheduled that day) did **not** exclude group-session events at all — now filtered out of both `hasIncompleteService` and the event list passed to the panel.
- **Could not be reproduced live on the reported contract (CN-1021):** its "Saturday Cadence" group-session block has **zero** rows in `t_contract_events` — group sessions generate occurrences into a separate table (`t_group_session_schedule`), surfaced on the dedicated Group Session dashboard, not the generic Tasks tab, by design. The fix is correct for whenever a group-session event *does* appear in that list via some other path; flagged to owner that group sessions currently never show as Tasks-tab cards at all on this contract, in case that's itself unexpected (no answer received yet — see §4).

### F. Smaller fixes, folded into the above
- **Bulk-assign member picker always showed the same 20 users** (batch `bulk-assign-user-limit`): `BulkAssignDialog.tsx` passed `per_page: 100` to `useContactList`, but the hook only recognizes `limit` — the field was silently dropped (an `as any` cast hid the typo), so three separate layers each fell back to their own default of 20. Renamed to `limit: 100`, dropped the now-unneeded cast.

---

## 2. Live/DB state (already applied — do NOT re-run blindly)

- **Supabase project `uwyqhzotluikawcboldr`** — migrations applied live this session: `041` (from earlier in session, contact status RPC), `042`, `043` (`bbb-foundation`), `044` (`bbb-foundation`), `002` + `003` (`integrations-messaging-visibility`).
- **Edge functions redeployed live:** `contacts` → v65 → v66 → v67 (FK fix); `jtd-worker` → v22 → v23 → v24 (kill switches).
- **`t_tenant_integrations`:** 628 rows now exist for the two built-in messaging providers (157 tenants × 2 providers × 2 environments). BBB's four rows (`whatsapp`/`email` × live/test) are `is_active=false`.
- **`n_jtd_tenant_config`:** rows exist for BBB (`dd194710-92b4-4110-80eb-0b492a0d2c1f`), both environments, `channels_enabled.email`/`.whatsapp` = false. No row existed for any other tenant before this session (falls back to enabled-by-default; the global TEST-env guardrail in `jtd-worker` v24 covers `is_live=false` regardless of whether a config row exists at all).
- **`t_contact_channel_risk_backup`:** 104 rows, all BBB, `restored_at IS NULL` (not yet reversed). Restore query is in `044_bbb_contact_risk_mitigation.sql`'s trailing comment and `bbb-contact-risk-mitigation/COPY_INSTRUCTIONS.txt`.
- **19 emails already sent** to real addresses from BBB (test env) **before any fix existed** — cannot be recalled, this is historical fact, not an open risk.
- No pending/queued messages existed for BBB at the time the kill switches were verified (checked directly against `n_jtd`).

## 3. Key facts for the next session

- **BBB tenant** = `dd194710-92b4-4110-80eb-0b492a0d2c1f`. There is a SECOND, unrelated, older tenant also named similarly — `bbb2025` = `ae70b774-f4c7-41ac-83a0-a1ebf352b991` — do not conflate them; all this session's fixes are scoped to `dd194710...` only.
- **The `jtd-worker` chokepoint pattern is the right place for any future cross-cutting messaging change** — every send, regardless of enqueue source, passes through `processMessage()`. Enqueue-side `isChannelEnabled()` checks (3 separate files) are a secondary, best-effort layer only — always verify the worker itself enforces anything safety-critical, don't trust enqueue-side gating alone (that was the entire root cause of this incident).
- **`contractnest-api`'s auth middleware bug** (`middleware/auth.ts`): `req.user = { id: user.id, ...response.data }` — `response.data` (the profile fetch) has its own `id` field (the `t_user_profiles` row id, always different from the real auth id), which overwrites `id: user.id` in the object spread. `req.user.id` is therefore the **profile** id, not the auth id, everywhere in the API layer. This was worked around locally (edge functions decode the JWT directly instead of trusting the forwarded value) but the underlying middleware bug itself was **deliberately not touched** (many other code paths may depend on the current — wrong — behavior; fixing it is a separate, wider-blast-radius task). If a future feature needs the real auth id from the API layer, do not trust `req.user.id` — decode the JWT or fix the middleware properly first.
- **`t_session_attendance`/`t_session_payment_declarations` have a `session_contract_id` column that is dead code** — never populated by any write path, `session_contract_id` should be treated as vestigial anywhere else it's referenced in this codebase; use `member_contact_id` + `schedule_occurrence_id`/`source_block_id` instead.
- **Group sessions live in a separate subsystem** (`t_group_session_schedule`, `t_session_attendance`, the `/group-sessions` dashboard) from the generic contract-events/Tasks-tab system (`t_contract_events`). They don't currently generate `t_contract_events` rows at all — confirmed on CN-1021. Whether that's intentional platform architecture or a gap worth closing is an open question (see §4).
- **Batch base-file discipline stayed critical all session** — several files (`ContractWizard/index.tsx`, `SellerTasksTab.tsx`, `BlockCardConfigurable.tsx`) had newer work sitting in other MANUAL_COPY_FILES batches or already pulled into the real submodule's `main` ahead of what was initially checked out. Always diff against the most recently-touched batch (by commit date) or a freshly-pulled `main`, never assume the pristine submodule checkout is current — this bit the session at least twice (had to `git pull origin main` on `contractnest-ui` mid-session to discover 17 files' worth of drift, and had to hunt down `service-blocks-single-column` as the real source of a UI the plain submodule didn't even contain).

## 4. Pending / next

1. **Close the git-main gap in §0** — the single highest-priority item. Everything else below is lower stakes.
2. **Group sessions on CN-1021 generate zero Tasks-tab events** — flagged to owner, no response yet on whether that's expected. If group sessions should appear on the Tasks tab too, that's new wiring (not a bug fix on top of what exists).
3. **New-BBB-contact protection is a one-time pass, not standing** (§1.A note under "residual gaps") — consider a trigger if this needs to hold indefinitely rather than being manually re-run.
4. **Platform-wide sequence-counter gap** (130 of 157 tenants never had counters seeded — carried over from an earlier session, explicitly out of scope per owner's "BBB first, others will be cleaned anyway") — still not addressed, not touched this session either.
5. **Contact-view Phase 3** (from an earlier session's POA, also still outstanding): remove `ProfileDrawer`, fold its contact-persons-editing into `ContactProfileTab`, delete now-dead code in `pages/contacts/index.tsx`.
6. **None of this session's batches have received an explicit "tested, working" confirmation** in the CLAUDE.md two-phase sense — owner said "merged to main," which the git evidence in §0 shows was partial (contractnest-ui: yes; contractnest-edge: only the earlier/smaller pieces). Don't assume anything beyond what §0's table says is actually live-from-source.

## 5. Verify checklist (owner / next session)

- [ ] `contractnest-edge` `main` actually contains `n_jtd_tenant_config` inside `jtd-worker/index.ts` (grep for it) — if not, the kill switches are one redeploy-from-main away from silently disappearing. This is the one thing worth checking before anything else.
- [ ] BBB Settings → Integrations: WhatsApp/Email cards show a real toggle, both OFF, in both live and test mode.
- [ ] A non-BBB tenant's Integrations page: toggle present, ON by default, flipping it actually changes `n_jtd_tenant_config`.
- [ ] Group-session dashboard for BBB: 11 Jul occurrence (or whichever's current) no longer shows an inflated attendance count.
- [ ] Create a contract via template with a non-today start date — wizard preview and the saved contract's buyer-facing PDF both show the real date, not today's.
- [ ] Add Service Blocks: every checked catalog block shows a working "Remove line" option, not just custom lines.
- [ ] BBB contact records show corrupted mobile/email (e.g. `...gmail.commm`) — confirms the risk-mitigation migration is still in effect.

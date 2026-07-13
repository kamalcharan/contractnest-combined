# HANDOVER — 2026-07-13 · Group Session, Check-in & Tenant Reset

**Branch (parent):** `claude/handover-closing-tasks-11cmhn`
**Supabase project:** `uwyqhzotluikawcboldr`
**Delivery model:** files staged under `MANUAL_COPY_FILES/bbb-foundation/<submodule>/…`, committed/pushed to the parent branch; owner copies into the real submodules (two-phase per CLAUDE.md). DB migrations & the edge function were applied **live** to the project during the session.
**tsc baselines to preserve:** UI = **23** errors; API = **2** tsconfig deprecations (not errors).

---

## 1. What we shipped this session

### A. Group Session — build & schedule (Batches 1, 2a, 2b-1, 2b-2)
A universal 1:N "Group Session" that reuses the Service-block engine, keyed on `config.audience = 'group'`.

- **Catalog block** — new Group Session preset: `audience:'group'`, `complimentary:true` (free, no billing but still delivers occurrences), cadence with **day-of-week anchor** (`config.serviceCycles.anchorWeekday`, 0=Sun..6=Sat), sample timeline.
  Files: `utils/catalog-studio/{categories,wizard-data,catBlockAdapter}.ts`, `components/catalog-studio/BlockWizard/BlockWizardContent.tsx`, `.../steps/service/DeliveryStep.tsx`.
  Storage: `type='service' + category='service' + config.audience='group'`. Edge seed `015_group_session_block_category.sql`.
- **Cadence Settings** (Batch 2a) — tenant holiday calendar + shift policy.
  DB `016_tenant_cadence_settings.sql` (`t_tenant_cadence_settings`, `t_tenant_holiday_dates`, RPCs, seed trigger, RLS). API `cadenceSettingsService/Controller/Routes`. UI `pages/settings/cadence/{CadenceSettingsPage,useCadenceSettings}.ts` + menu + route.
  **Fix applied live:** the 4 cadence RPCs are now `SECURITY DEFINER` (RLS-on tables with no policies were rejecting the API's non-service-role key → 500 on "add holiday"). See `016` (updated).
- **Contract config panel** — Group Session now opens full options (Quantity + Service Cycle) instead of only "show description": gate on `deliversOccurrences` (pricing OR audience=group OR serviceCycleDays), price sections on `showPrice` (pricing AND not complimentary). `BlockCardConfigurable.tsx`, `ContractWizard/steps/ServiceBlocksStep.tsx`.
- **Cadence carried into contract** — `catBlockAdapter` maps `config.{serviceCycles,audience,complimentary}` → `meta`; `ServiceBlocksStep` detects a session (audience OR legacy `session` category) and pre-fills cadence even when `enabled` was never stamped.
- **Auto-count** — a Group Session's occurrence count auto-derives from contract duration (`config.autoCount`) and recomputes when duration changes; a manual quantity edit pins it. Fixes "only 2 sessions on a 1-year contract".
- **Occurrence generation** — `utils/service-contracts/contractEvents.ts`: group sessions generate service occurrences even when complimentary/non-pricing, always weekday-anchored; each occurrence carries `audience:'group'`.
- **Events Preview** — group session occurrences render as **"Group Session"** (group icon, no 1:1 "Book appointment"); `EventCard.tsx` + `EventsPreviewStep.tsx` thread the `audience` marker.
- **Holiday resolver (Batch 2b-2)** — `utils/service-contracts/holidayResolver.ts` + `EventsPreviewStep.tsx`: occurrences landing on a weekly holiday / holiday date are flagged; inline banner + per-card Prev/Next/Keep with the tenant default (N+1 / N-1) preselected; choice overrides the event date via the existing override path.
- **Review step** — `ReviewSendStep.tsx` shows the session's occurrence count + cadence ("25 sessions · Every 14 days · Sat").

### B. Group Session — check-in runtime (Batch 3)
Public, token-gated member check-in (Model A: one chapter session contract + one static QR; per-member membership contracts for BAU billing).

- **DB `017_group_session_checkin.sql` (live):** `t_group_session_tokens`, `t_session_attendance`, `t_session_payment_declarations` + `SECURITY DEFINER` RPCs — `gs_resolve_checkin`, `gs_lookup_member` (roster = contacts who buy an active billing contract; phone-matched on last-10-digits), `gs_member_history`, `gs_submit_checkin`, `gs_ensure_token`, `gs_pending_declarations`, `gs_confirm_declaration`.
- **API:** public `/api/checkin/*` (no auth, token-gated) + chair `/api/session-checkin/*` (auth). `sessionCheckinService/Controller`, `sessionCheckinPublicRoutes`, `sessionCheckinRoutes`.
- **UI:** member page `/checkin/:token` (phone-ID, attendance, history, BAU due pick + UPI ref) and chair page `/session-checkin` (mint QR link, confirm declared payments → flips billing event to paid). `pages/checkin/*`, `pages/session-checkin/*`.
- Wiring for `App.tsx` + `index.ts` delivered via `wire_batch3_checkin.ps1` (idempotent, `[batch3-checkin]` tags).

### C. Tenant data reset — de-duplicated onto the existing tool
Discovered the app already had an owner/admin reset (`get_tenant_data_summary`, `admin_reset_test_data`, `admin_reset_all_data`, `admin_close_tenant_account`) surfaced by the **owner page** `/settings/business-profile/close-account`. A separately built "Sandbox" duplicated it and was **retired**.

- **`020_extend_reset_group_sessions.sql` (live):** helper `reset_tenant_session_and_forms(tenant, is_live)` covers the tables the base reset missed — Group Session (attendance/declarations/tokens), form submissions/attachments, appointments, service tickets/evidence, extra contract children. Called from the top of `admin_reset_test_data` (Test) and `admin_reset_all_data` (all). **No edge redeploy** — the edge fn already calls these RPCs.
- **Retired:** dropped `sandbox_*` RPCs (migrations 018/019 superseded & removed), removed `sandboxService/Controller/Routes`, `SandboxResetCard/Page`, Storage-Space menu entry, `SANDBOX` serviceURLs. `unwire_sandbox.ps1` removes the `[sandbox-route]` lines from local `App.tsx`/`index.ts`.
- **Surfaced Option A:** Business Profile **"Data & Reset"** card → the existing owner page (`settingsMenus.ts`).
- **Deployed `tenant-account` edge function (live, v1).** It existed in the repo but had **never been deployed** (admin-only until now) → all owner `/api/tenant/*` calls 404'd. Deploying it fixed reset-test-data / data-summary / reset-all-data / close-account.

---

## 2. Live/DB state (already applied — do NOT re-run blindly)
- Migrations applied live: **015, 016 (+SECURITY DEFINER fix), 017, 020** (+ helper). `018/019` were the retired Sandbox RPCs and have been **dropped**.
- Edge function **`tenant-account`** deployed (v1, ACTIVE).
- PostgREST schema cache reloaded after RPC changes.
- No leftover test rows in tenant BBB from this session's testing (cleaned).

## 3. Key facts for the next session
- **Environments share one DB via `is_live`** (Live=true, Test=false), keyed off the `x-environment` header. Any tenant-scoped delete/report MUST filter `is_live` — the reset RPCs and `get_tenant_data_summary` already do. (This was a caught bug: a naive reset would have wiped Live data from a Test session.)
- **BBB tenant** = `dd194710-92b4-4110-80eb-0b492a0d2c1f` (owner `ghotikar@yahooo.com`). Per-member contracts (CN-1001…), each with 13 billing events (annual + 12 monthly BAU).
- **Membership model:** ₹7,500/yr prepaid + ₹1,500/mo BAU × 12 = ₹25,500/yr, 13 billing events. Member pays chapter UPI; chair confirms offline (Vikuna is NOT a payment processor).
- **RLS pattern:** several new tables have RLS enabled with **no policies** → access only through `SECURITY DEFINER` RPCs. New tenant-scoped RPCs must be `SECURITY DEFINER` + `SET search_path`.
- **Hand-merged files** (`App.tsx`, `index.ts`, `settingsMenus.ts`) diverge from the committed submodules here — deliver as snippets / idempotent `.ps1`, never blind full-file overwrites.
- `session_replication_role` is **blocked** in Supabase; can't disable FK triggers — delete in FK order. The `t_contract_events ↔ t_invoices` cycle is `ON DELETE SET NULL`.

---

## 4. Pending / next
1. **UID deletion on close-account** (owner query): `admin_close_tenant_account` intentionally leaves the Supabase auth `UID` (returns `orphan_user_ids` with a "delete from Dashboard" note). Fix = in the **deployed `tenant-account` edge `close-account`** handler, after the RPC, loop `orphan_user_ids` → `supabaseAdmin.auth.admin.deleteUser(uid)` (with deleted/failed summary). Needs an edge redeploy.
2. **Remaining Group Session batches** (beyond Batch 3 core): deeper check-in→attendance roster views (chair "close session"), member BAU reconciliation, quota/attendance counters.
3. **Tenant smart-form fork** (hybrid model, agreed): surface `t_form_templates` (is_forked/copied_from_id) so a tenant forks a master check-in form to add custom fields. Seed a master "Group Session Check-in" form.
4. **Onboarding defaults / reseed** — owner noted onboarding defaults aren't fully built; after a Test reset the tenant needs re-seeding.
5. **Cleanup confirmation** — ensure the retired Sandbox references are gone from local `App.tsx`, `index.ts`, `storagemanagement/index.tsx` (see `unwire_sandbox.ps1` + the grep check).

## 5. Verify checklist (owner)
- Cadence Settings: add a holiday → 200 (not 500).
- Contract with a Group Session → config panel opens (Quantity + Service Cycle) → Events Preview shows N anchored occurrences labelled "Group Session" → holiday clashes offer Prev/Next/Keep → Review shows count + cadence.
- Check-in: chair mints QR at `/session-checkin`; member opens `/checkin/:token` (logged out) → phone match → attendance + BAU declare → chair confirms → billing event → paid.
- Reset: Settings → Business Profile → **Data & Reset** → data summary loads; **Reset test data** returns 200 and clears Test data only (Live untouched).

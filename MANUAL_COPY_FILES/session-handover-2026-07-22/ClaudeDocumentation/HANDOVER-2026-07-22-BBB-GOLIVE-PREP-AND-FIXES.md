# HANDOVER — 2026-07-22 · BBB Go-Live Bug Fixes, Finance AR/AP Investigation

**Branch (parent):** `claude/handover-submodule-sync-lbkbny`
**Supabase project:** `uwyqhzotluikawcboldr`
**Delivery model:** files staged under `MANUAL_COPY_FILES/<batch>/<submodule>/…` on the parent branch, committed/pushed there directly. Edge functions were deployed **live** to Supabase via MCP tools during the session, independent of git — verified below which batches also made it into each submodule's own git history.
**Context:** BBB (tenant `dd194710-92b4-4110-80eb-0b492a0d2c1f`) goes live in ~2 days. This session (like the one before it) was pulled entirely into BBB-facing bug triage rather than planned roadmap work — see §4 for what that means for next session's priorities.

---

## 1. What we shipped this session

### A. Check-in payment UX — confirm modal + return nudge (batch `checkin-payment-confirmation-ux`)
UPI deep links have no callback into the browser — a member could tap "Pay ₹X now", pay via GPay, and never come back to declare the UPI reference + tap "Record payment", easily assuming the system detected payment automatically. Fix: tapping "Pay" now opens a confirm modal explaining the manual-declare step before the UPI app opens; if the tab regains focus afterward with no reference entered yet, a "Back from paying?" nudge appears above the reference field. UI-only, no backend/data-model change.
**Status:** committed `d585a06` to `contractnest-ui` batch in parent repo. **Not yet copied into `contractnest-ui`'s own git `main`** — still sitting in `MANUAL_COPY_FILES/checkin-payment-confirmation-ux/`, waiting on owner's local test + Phase 2 confirmation per CLAUDE.md.

### B. `user-invitations` — existing users beyond page 100 misdetected as new (batch `user-invitations-pagination-fix`)
Reported: inviting `kamalcharan@gmail.com`, filling the join form, and clicking "Accept & Join Workspace" did nothing. Root cause: `validateInvitation()`/`acceptInvitation()`'s existing-user lookup called `supabase.auth.admin.listUsers({ page: 1, perPage: 100 })` with no pagination loop — this project has 162 `auth.users` rows, so any account past the first 100 was invisible to the lookup, wrongly routing a genuinely existing user down the "create new account" path, where `auth.admin.createUser()` then correctly (but confusingly) rejected the duplicate email with a silent-looking 400.
Fix: new `findAuthUserByEmail()` helper loops all pages (1000/page, cap 50) until a match or exhaustion; both call sites now use it.
Also: deleted the stale duplicate `auth.users` row for `kamalcharan@gmail.com` (`c62bbdd9-41dd-4f16-a34f-dcd4e7c7e4ad`, created 2025-07-15, no profile) after nulling the one FK reference (`t_tenants.created_by` on an already-closed test tenant) blocking the delete.
**Status:** deployed live as `user-invitations` v63, verified byte-for-byte against intended source. Committed `c9459b2` to parent repo. **Not yet copied into `contractnest-edge`'s own git `main`.**

### C. `user-invitations` — workspace name in invite text used the wrong field (batch `user-invitations-workspace-display-name-fix`)
Reported: invite text read "...invited you to join **BBB** on ContractNest" but the tenant's real name is "**BBB Bhagyanagar**". Root cause: `createInvitation()`/`resendInvitation()` built `workspaceName` from `t_tenants.name` (a short internal code — literally `"BBB"` for this tenant), not `t_tenant_profiles.business_name` (the field the rest of the app already treats as canonical — dashboard header, VaNi chat, tenant context service all read it).
Fix: both functions now fetch `business_name` and use `business_name || tenant.name || 'Workspace'`.
**Status:** deployed live as `user-invitations` v64 (layered on top of v63 above — this batch's copy of `index.ts` contains BOTH fixes), verified byte-for-byte. Committed `d7a2ba2` to parent repo. **Not yet copied into `contractnest-edge`'s own git `main`.**

### D. Two password resets (direct DB action, no git artifact)
`yvilas14@gmail.com` and `usrtravels@yahoo.com` → both reset to `bbb2026` via direct `auth.users.encrypted_password` update (bcrypt via `pgcrypto`/`extensions.crypt`+`gen_salt('bf')`). Both are BBB support requests, owner-instructed.

### E. Finance AR/AP — investigated, not yet fixed
Two owner questions this session, both investigated but **no code changed**:
1. **"Is this dummy data?"** — No. `/ops/finance` → `FinancePage` uses `useReceivables`/`usePayables` (`useFinanceQueries.ts`) → real `/api/finance/receivables|payables` → `financeService` → edge fn `finance` → `get_tenant_receivables`/`get_tenant_payables` RPCs, tenant-scoped aggregation over `t_invoices`. (There's an unrelated, genuinely-mock `AccountsReceivablePage.tsx` under `src/vani/pages/` backed by `vani/utils/fakeData.ts` — **not** wired to the Finance AR/AP menu, easy to confuse by name only.)
2. **"Data didn't refresh during a customer demo — do we need polling?"** — Confirmed gap: `useReceivables`/`usePayables` have `staleTime: 30_000` but **no `refetchInterval`** and `refetchOnWindowFocus: false`, so a page left open never updates itself; only a manual navigate-away-and-back or the page's own refresh button (`RefreshCw` icon, wired to `.refetch()`) picks up new data. Checked the RPC cost (indexed `tenant_id` filter, single-tenant aggregation) — cheap enough that polling isn't a real DB-load constraint at current scale.
**Proposed, not built:** add `refetchInterval` (~15–20s) to both hooks in `contractnest-ui/src/hooks/queries/useFinanceQueries.ts`. Owner agreed this is needed; **this is the top pending code task for next session** (small, isolated, one file).

### F. Realtime push for dashboards — discussed, not scoped
Owner wants to move toward realtime (at least for dashboards) rather than relying on polling long-term. Recommendation given: Supabase **Broadcast** channels (e.g. `tenant:{id}:finance`), fired server-side after any write that affects a dashboard (invoice created, receipt recorded, event settled), with the frontend subscribing and invalidating the relevant React Query key on message — rather than raw Postgres Changes on `t_invoices`/`t_invoice_receipts` (avoids replicating RPC aggregation logic over the wire and RLS-on-realtime complexity). **Not scoped or built** — bigger lift than polling since every relevant write path needs to call the broadcast; worth a shared helper once actually picked up. Polling (§E) is the interim fix and isn't wasted work either way.

### G. Check-in — partial/negotiated cash payment: confirmed unsupported
Owner scenario: a member owes ₹4500/quarter but wants to pay only ₹3000, citing 2 of 6 sessions he won't attend. Checked `SessionCheckinPage.tsx`/`useSessionCheckin.ts`: the payment declaration always sends the **full** due amount —
```ts
amount: openDues.find((d) => d.event_id === payEventId)?.amount
```
— there's no editable amount field. **Not built.** If picked up: needs an editable amount input (defaulting to, capped at, the full due) plus backend/billing-event handling for a partial settle (leaving the remainder open rather than marking the event fully settled). Flagged as a real gap, not just a process question — owner hasn't yet said whether to build it or handle it manually outside check-in.

---

## 2. Live/DB state (already applied — do NOT re-run blindly)

- **Edge functions redeployed live:** `user-invitations` v61 → v63 (pagination fix) → v64 (workspace display name fix). Both verified byte-for-byte against intended source after deploy.
- **`auth.users`:** duplicate row for `kamalcharan@gmail.com` (`c62bbdd9-41dd-4f16-a34f-dcd4e7c7e4ad`) deleted; `t_tenants.created_by` nulled on one already-closed test tenant (`460fbd74-...`) as a prerequisite (was the only FK blocking the delete).
- **`auth.users.encrypted_password`:** updated directly (bcrypt, `pgcrypto`) for `yvilas14@gmail.com` and `usrtravels@yahoo.com` → `bbb2026`.
- No schema/migration changes this session — all fixes were edge-function code or one-off admin SQL.

## 3. Git state — what still needs copying into each submodule's own `main`

Everything below is **live and working in Supabase / correct in the parent repo's `MANUAL_COPY_FILES`**, but **not yet present in the actual submodule's own git history** (per CLAUDE.md, that requires owner's local test + explicit Phase 2 "tested, working" confirmation, which hasn't happened yet this session):

| Batch | Submodule | What |
|---|---|---|
| `checkin-payment-confirmation-ux` | `contractnest-ui` | Pay confirm modal + return nudge |
| `user-invitations-pagination-fix` | `contractnest-edge` | Superseded by the batch below (same file, later state) — copy the newer one instead |
| `user-invitations-workspace-display-name-fix` | `contractnest-edge` | Full current `index.ts` (pagination fix + display-name fix, both included) + unchanged `jtd-integration.ts` |

**Next session should ask the owner whether local testing happened** on the check-in UX batch before doing anything else with it (per CLAUDE.md two-phase rule — do not assume "deployed live" means "merged," the edge function batches were deployed directly since they're server-side and low-risk to verify via diff, but the UI batch genuinely needs a local look first).

## 4. Key facts for next session — roadmap status (Sprint 2 / Sprint 7)

Owner wants to pick up **Sprint 2** and **Sprint 7** next session, per `SPRINT_REFERENCES/CONTRACTNEST_SPRINT_SPEC.md` (this file lives in `contractnest-combined` root, not a submodule). I did not start scoping either this session — pure pointer-finding only, so the next session doesn't start cold:

- **Sprint 2 — "Smart forms from KT"** (spec line 146): seed one form per KT equipment type from its checkpoints, bind automatically via `m_form_template_mappings` on contract activation, gate form submission to non-placeholder assets. Reuses existing forms infra (`m_form_templates`, `FormRenderer`, smart-forms edge fn) — "no new forms infra" per spec.
- **Sprint 7 — "Service execution: close the loop"** (spec line 251): the technician-facing execution drawer — per-asset task cards, mandatory form + photo per asset, placeholder gating, ticket lifecycle completion. Reuses `ServiceExecutionDrawer`, `ServiceTicketDetail`, and explicitly calls out **`useUpdateServiceTicket`/`useUpdateServiceEvidence` as existing hooks "imported nowhere" — need wiring**, not building from scratch.

**Important dependency finding (worth confirming before diving into Sprint 7):** checked `sql/acceptance/` in `contractnest-combined` — `sprint3.sql` and `sprint4.sql` exist (both explicitly reference `CONTRACTNEST_SPRINT_SPEC.md`, confirming Sprint 3 and the re-scoped Sprint 4 — "GST records + invoice tax snapshot only," re-scoped 2026-07-19 — were completed), plus `sql/sprint1b/sprint1_acceptance.sql` for Sprint 1. **No `sprint2.sql` exists.** Sprint 7's spec explicitly reuses "FormRenderer submission path (from S2)" — so Sprint 7 depends on Sprint 2 having actually landed. Since Sprint 2 has no acceptance artifact, it looks like it was **skipped**, not just undocumented — worth explicitly confirming with the owner at the start of next session (rather than assuming) whether Sprint 2 secretly landed some other way, before starting Sprint 7 on an assumption that its prerequisite exists.

**Separately:** there's a second, unrelated migration series (`contractnest-edge/supabase/migrations/operations-loop/`) using its own "Stage 0/1/2/3" numbering (dispatch tracking, dues, appointments, finance RPCs, event propagation) — this is a **different roadmap** from the Sprint 1–7 spec and is what nearly all of this session's and the prior session's BBB firefighting actually touched (check-in, finance AR/AP, invitations, group sessions). Don't conflate "operations-loop Stage 2" with "Sprint 2" — they're unrelated tracks that happen to share a number.

## 5. Process notes for next session

- **`contractnest-ui`/`contractnest-api`/`contractnest-edge` local checkouts drift behind their own `origin/main`** — this bit the session again (had to `git fetch` + `git show origin/main:<path>` for the Finance page and check-in files rather than trusting the pristine local checkout). Always fetch fresh before editing or diffing.
- **Never edit submodule files directly in this session's working tree** — `contractnest-ui`, `contractnest-api`, `contractnest-edge` are separate repos outside this session's push scope (`kamalcharan/contractnest-combined` only). All edits go through `MANUAL_COPY_FILES/<batch>/` in the parent repo, same as this session did throughout.
- **After any `deploy_edge_function` call, always re-fetch and diff byte-for-byte against intended source** — this session had one deploy mistake (a stray placeholder string sent instead of real content on the very first `user-invitations` deploy attempt) caught immediately by this discipline and fixed before it mattered; don't skip the verification step even when confident.

# Stage 2 — Services + Smart-Forms Glue (Operations → Service Schedule)

**Date:** 2026-07-07 · **Status:** BUILT — awaiting owner apply + test
**POA:** POA-OPERATIONS-READINESS-2026-07-07.md §3 (Stage 2) · owner-agreed design (this session: merge Business Events into Service Schedule; submenu over tabs; ticket↔event propagation; forms glue at activation)
**Batch:** `MANUAL_COPY_FILES/stage2-services/`
**Submodules touched:** contractnest-edge (3 SQL migrations — NO edge deploys), contractnest-ui (8 files), ClaudeDocumentation. **contractnest-api untouched** — the service-execution API surface already existed.

---

## 1. What it delivers

1. **Operations → Service Schedule** (`/ops/services`) — the tenant-wide events working list, absorbing BOTH old mocks (ServiceSchedulePage + BusinessEventsPage): bucket bar (Overdue/Today/This week/Upcoming from the date-summary RPC), All/Service/Billing lanes, status/date/search filters, per-row **status transitions** (event-status-config driven, includes the Stage 0 'due' status), pagination, deep link to the contract (whose Tasks tab hosts Start Service).
2. **Ticket ↔ event lifecycle propagation** (was fully decoupled): create ticket → linked *service* events → `in_progress`; ticket completed → events → `completed` (with `t_contract_event_audit` rows + version bumps). Cancel leaves events alone; billing events never touched. **Dry-run verified on live DB: `overdue → in_progress → completed`, TKT-10001, rolled back.**
3. **Evidence capture wired** (backend existed, UI buttons were mockups): new `TicketEvidencePanel` inside `ServiceTicketDetail` — file upload via the storage API (`uploadFile(file,'service_evidence')` → `create_service_evidence`), and **smart-form fill**: template schema → `FormRenderer` modal → `m_form_submissions` (submitted) + a `service-form` evidence record carrying the responses.
4. **Smart-forms creation-time glue**: `sync_contract_form_mappings()` writes `m_form_template_mappings` (had ZERO writers) from `evidence_selected_forms` + block-level `m_cat_blocks.form_template_id`, fired by a trigger when a contract becomes active (insert or transition), plus a backfill. Repo hygiene: the missing 029 evidence-policy DDL is now in the tree (008).
5. **Cockpit finance chips** (revenue perspective): "N drafts awaiting approval" + "₹X overdue" action chips → `/ops/finance`.

## 2. Files

| Layer | File | Change |
|---|---|---|
| DB | `operations-loop/008_stage2_evidence_policy_hygiene.sql` | evidence-policy columns DDL (live no-op) |
| DB | `operations-loop/009_stage2_ticket_event_propagation.sql` | create/update_service_ticket + propagation |
| DB | `operations-loop/010_stage2_forms_glue.sql` | sync fn + activation trigger + backfill |
| UI new | `pages/operations/services/index.tsx` | Service Schedule page |
| UI new | `components/contracts/TicketEvidencePanel.tsx` | upload + smart-form capture |
| UI new | `components/ops/FinanceActionChips.tsx` | cockpit finance chips |
| UI mod | `components/contracts/ServiceTicketDetail.tsx` | mounts the evidence panel (anchored, from main) |
| UI mod | `components/contracts/OperationsTab.tsx` | passes evidence policy into ticket detail (anchored) |
| UI mod | `pages/ops/cockpit/index.tsx` | renders FinanceActionChips (anchored, from main) |
| UI mod | `App.tsx`, `industryMenus.ts` | `/ops/services` route + menu (built ON TOP of stage1 copies) |

⚠️ `App.tsx` + `industryMenus.ts` here **supersede** the stage1 copies — apply stage1 first, then stage2 (or just stage2's versions of these two files, which include stage1's changes).

## 3. Known limits (agreed/documented)

- **VaNi create-path persistence**: `create_contract_transaction` still drops `evidence_policy_type`/`evidence_selected_forms` — wizard contracts that save via `update_contract` keep them; direct-create (VaNi auto-accept) loses them → glue no-ops there. Fix queued for the VaNi-stage session (touching the 500-line create RPC was out of Stage 2 scope).
- Service Schedule v1 does not filter by the global Revenue/Expense perspective (events RPC has no contract_type filter; the cockpit does it client-side). Acceptable: billing+service lanes cover both. Revisit if noise appears.
- Evidence `verify/reject` actions exist in the backend + EvidenceTab; capture was the missing piece. OTP evidence = VaNi stage.
- Two-lens contract detail (ux-05) deferred (agreed) — contract detail already carries Operations/Evidence/Audit tabs.

## 4. Apply order (owner)

1. **SQL**: run 008 → 009 → 010 (Supabase SQL editor). All safe to re-run. No cron changes, no edge deploys.
2. **UI**: copy files per COPY_INSTRUCTIONS (apply stage1 UI first if not yet), `npm run dev`, hard refresh.

## 5. Testing checklist

- [ ] Sidebar → Operations → **Service Schedule** loads with real buckets/events (expect ~20 overdue, 6 due from Stage 0)
- [ ] Lane toggle All/Service/Billing; status filter shows 'due'; bucket clicks change the date window
- [ ] Change a 'due' event → In Progress from the row menu (allowed transitions only), version conflicts handled
- [ ] Contract detail → Tasks tab → Start Service on due events → **linked events flip to `in_progress` automatically**; complete the ticket → events `completed`
- [ ] Open the ticket detail → "Add Evidence" → upload a photo → appears in the evidence gallery (status `uploaded`)
- [ ] Smart-form path: set a contract's evidence policy to `smart_form` with a form (Settings → Smart Forms must have an approved template; edit contract evidence policy) → activate/re-save → `m_form_template_mappings` gets rows (`SELECT * FROM m_form_template_mappings;`) → ticket detail shows "Fill Form" → submit → `m_form_submissions` row + `service-form` evidence
- [ ] Cockpit (revenue): finance chips appear when drafts/overdue exist and open `/ops/finance`
- [ ] ⚠️ Message constraint stands: **+91 9885164233 only** — nothing in Stage 2 sends messages (no new JTD producers)

## 6. What Stage 3 builds on this

Appointments: `t_appointments` linked to service events, scanner requests ~6 days ahead, ux-08 kanban under Operations → Appointments. The Service Schedule page will show appointment badges on service events.

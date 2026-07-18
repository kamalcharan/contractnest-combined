# ContractNest — Servicing Program: 7-Sprint Specification

**Date:** 2026-07-16 · **Owner:** Charan Kamal (Vikuna) · **Author:** Claude session (UX + audit program)
**Baseline:** bbb-foundation MERGED to main · WizardShell Phase 1.5 + 2 merged (logic extraction + parity lock + phase stepper).

---

## Program status — updated 18 Jul 2026

### Done
- **Sprint 1 step (a) UI — complete and merged to main.** Coverage & Assets redesign (registry picker middle column, live Attached sidebar, per-type registry intelligence), Service Blocks redesign, Billing View discount UI (contract-level %/₹ toggle, amount default; state fields only — persistence lands in step (b)). WizardShell + logic extraction with the parity harness locked.
- **Sprint 1 step (b) migration + step (c) stitch — complete.** `t_contract_event_assets` per-asset table live (fixed a source-column bug found during verification: `generate_contract_event_assets()` was reading from an empty `metadata.wizard_state` path instead of the real `equipment_details` column — affected every contract, not just legacy ones). Contract-level discount threaded end-to-end: mapper → `computeEventsForApi` derivation → API parity → Events Preview → contract document. Placeholder→open flips on real-asset attach confirmed live.
- **Sprint 3 (Contract View per-asset grain) — complete.** Per-asset progress chip on each service event (`EventAssetProgress`, expandable to per-asset status/assignee) wired into both Operations and Tasks/My Services views; Equipment tab supports attaching a real asset to a placeholder slot for multi-equipment contracts, with "N of M" indexing when a category has more than one item; `t_contract_event_assets` read path (`GET /:id/event-assets`) added through API + edge fn. Dead surface removed: orphaned `ContractTab.tsx` (zero imports, confirmed by full-tree search) and the dead `communication` tab-content branch/`PlaceholderTab` component in contract detail. `sql/acceptance/sprint3.sql` authored (5 checks: asset-row generation, placeholder→open flip, no orphan rows on re-attach, in-place equipment_details replace, no unrelated `updated_at` drift) — **not yet executed against live data**, flagged below.
- **Beyond-spec hardening found and fixed while working the buyer side of Sprint 3** (all real, pre-existing bugs, not regressions — root-caused via `pg_get_functiondef` + live data before any fix):
  - `claim_contract_by_cnak()` never wrote `buyer_tenant_id` on the contract — present since the function's original version; buyer-side contracts were invisible to their own Contracts Hub. Fixed with a self-healing update on both first-claim and re-claim paths; one already-affected contract ("sddsd") backfilled directly (only 2 contracts total ever affected, no blanket backfill needed).
  - CNAK claiming had zero Test/Live environment awareness anywhere in the stack — a Test-mode claim against a Live contract silently succeeded. `claim_contract_by_cnak` now takes `p_is_live` and rejects cross-environment claims with a clear message.
  - `get_contract_events_list()` / `get_contract_events_date_summary()` were scoped to `ce.tenant_id = p_tenant_id` only (seller-only) — buyer's "My Services" showed zero events even after a correct claim. Both RPCs extended to also match via `t_contracts.buyer_tenant_id`.
  - Contract detail tab selection defaulted any non-buyer (including a bare "viewer" role) to the full seller tab set (Financials/Audit Log/Tasks exposed). Added a viewer-safe tab set as a defensive fallback.
  - `EvidencePolicySection` (seller-only evidence policy config) rendered unconditionally on the buyer's "Proof of Work" tab with no role gating at all — buyer now sees only the read-only evidence list.
  - Tasks/My Services timeline: event cards were rendered white-on-white (panel and card both used the same theme token) — panel background corrected to the primary/card contrast pairing used elsewhere in the app; no layout change (the seller/buyer opposite-side billing-vs-services split is intentional and was not touched).

### Pending
- **Sprint 2** (smart forms from Knowledge Tree) and **Sprint 7** (service execution loop-close) — owner has proposed doing these two together; sequencing decision still open, not started.
- **Sprint 4 (AR/AP settle bridge) — next build item, starts in a new session** (see hand-off below).
- **Sprints 5–6** as specified (events & group-sessions cleanup; appointments integration) — not started.
- `sql/acceptance/sprint3.sql` — authored but **not yet run/verified against live data**. Should be executed early in the Sprint 4 session (or before) to close the loop on Sprint 3's own acceptance bar.
- **Deployment gap (go-live blocker)**: deploy current UI main to the `FRONTEND_URL` host *and* `www.contractnest.com` (WhatsApp links 404 there); align `FRONTEND_URL` with the MSG91 template URL. Contracts edge fn is already deployed and current.
- **Debt**: ~1,500 legacy tsc errors (bucketed cleanup pass planned: delete dead marketing pages → fix live code → gate CI); one null-amount event row on CN-1043 (test data, informational); a local, unpushed `contractnest-api` submodule pointer diff (commit amend for author/committer metadata only, no content change) is sitting uncommitted at the parent-repo level pending the owner's call — not acted on unilaterally per standing procedure.
- Per-block discount (mutually-exclusive with contract-level discount) — deliberately deferred, see "Future Review Items" in CLAUDE.md.

---

### Session hand-off — 18 Jul 2026 (end of session)
Shipped after the 16 Jul status above: Sprint 1 (b)/(c) discount stitch, Sprint 3 per-asset grain (progress UI + equipment attach-to-placeholder flow + dead-surface cleanup), and the six beyond-spec buyer-side bugs listed under Done above. All delivered as MANUAL_COPY_FILES batches (`remove-orphaned-contract-tab` is the last one, pending owner copy/test); all DB migrations applied and live-verified via direct RPC re-invocation before being called done.

**User actions outstanding**
1. Copy + test the still-unmerged MANUAL_COPY_FILES batches from this session (equipment/facility coverage-tab fix, Sprint 3 per-asset grain, buyer-claim + viewer-tab fix, Proof of Work buyer-readonly, Tasks timeline contrast fix, remove-orphaned-contract-tab) — Phase 2 merge commands not yet requested/given for any of them.
2. Run `sql/acceptance/sprint3.sql` against live data and confirm all 5 checks pass.
3. Decide on the outstanding `contractnest-api` submodule pointer diff (see Debt above).
4. Decide Sprint 2 vs Sprint 7 sequencing (owner's stated lean: run them together) once Sprint 4 is underway or before.

**Next build item (agreed): Sprint 4 — AR/AP settle bridge — in a new session.** This session's job was to close out Sprint 3 cleanly; no Sprint 4 design or code was started here.

**Workflow reminders for the next session**: re-layer ALL batch folders in MANUAL_COPY_FILES chronological order onto pristine submodules before editing, then `git fetch origin main` in each submodule and REBUILD every shipped file on latest main (stale-base clobbering bit us twice); tsc baseline diff + parity harness before packaging; reset trees after pushing; run `sql/acceptance/sprint3.sql` before starting Sprint 4 code so the acceptance bar is actually closed, not just authored.


## 0. Program rules (apply to every sprint)

1. **Reuse-first.** Every sprint lists "Reuse" (existing infra, untouched or enhanced) before "Build." Nothing is rebuilt that exists. The audits proved most backend hooks exist — the work is wiring, not greenfield.
2. **Three gated steps per sprint:** **(a) UI** — screens working against existing/mocked data → *owner review* → **(b) Migration** — schema/RPC changes with rollback notes → *owner review* → **(c) Stitch** — UI wired to the new schema end-to-end → *owner review*. No step starts before the previous gate passes.
3. **DB completeness is the acceptance bar.** Every sprint ships `sql/acceptance/sprint<N>.sql` — named queries that MUST return expected rows on the owner's Supabase after the manual test script. Any write path that doesn't land a row where expected = sprint not done. (This is the anti-regression contract: no gaps between what the UI claims and what tables record.)
4. **Parity discipline.** Any change to wizard mapper/serialization/gating re-goldens `logic/__parity__` intentionally; any change to `computed_events` updates `contractEventsDerivationParity.ts` in the same batch. `tsc --noEmit` stays baseline-clean.
5. **Delivery** via MANUAL_COPY_FILES batch per step (UI batch, migration batch, stitch batch) with copy instructions + acceptance SQL + manual checklist.
6. **UX references** live in `SPRINT_REFERENCES/` (self-contained HTML, open in any browser). Each sprint names its governing reference. They are the design contract; deviations get flagged in the batch notes.
7. **Parked until after Sprint 7:** landing v4 / KT playground track, business-model & metering wiring (the discount work in Sprint 1 is a deliberate prerequisite for it). Completing Sprint 7 = the milestone that unblocks business-model/metering.

### UX reference index

| File (SPRINT_REFERENCES/) | Governs |
|---|---|
| `1-lifecycle-blueprint.html` | The whole program — Author→Activate→Service→Settle spine |
| `2-multi-asset-playground.html` | Sprints 1, 2, 3, 5, 7 — per-asset fan-out, placeholder gating, per-asset invoice lines, closed loop |
| `3-wizardshell-prototype.html` | Sprint 1 — shell behaviors (already shipped; regression reference) |
| `4-coverage-blocks-redesign.html` | Sprint 1 — asset-assignment + service-blocks step UX |
| `5-landing-playground.html` | Parked track (post-Sprint-7) |

### Locked product decisions (from owner, do not re-litigate)

- **Asset-type is the required pick** ("coverage"); actual assets are optional at authoring — placeholders generated when unknown.
- **Placeholder gating:** technician assignment and status changes work on a placeholder's visit-task; **smart form cannot be invoked and the ticket cannot close** until the real asset is attached.
- **Per-asset servicing:** delivery, evidence, and report are per physical asset. A visit/event completes only when every covered asset is proven.
- **Discounts:** given as **% or absolute amount** at contract level; **uniformly loaded (pro-rata) across all line items internally**; internal loaded values are NOT shown on the invoice. **Invoice shows: actual line values → sum total → discount → total to be paid.**
- **Billing:** per-asset line items cumulate into ONE contract invoice/receipt.
- **The smart form is the definition of done.** Forms bind at KT level (`resource_template_id`) and auto-inherit onto contracts. Group sessions: the **attendance roster is the form/evidence**.

---

## Sprint 1 — Contract & Template authoring: asset assignment, service blocks, discounts

**Goal:** the authoring flows produce contracts whose asset, block, and discount data is complete enough for everything downstream — and the two confusing steps become the redesigned UX.
**UX reference:** `4-coverage-blocks-redesign.html` (+ `3-wizardshell-prototype.html` for shell regression).

### Reuse
- WizardShell (phase stepper, hints, edit-from-review, autosave) — untouched.
- `logic/` modules + parity harness — extended, not restructured.
- `AssetSelectionStep`'s existing machinery: `NOMENCLATURE_TO_RESOURCE`, `useClientAssets`, `EquipmentFormDialog`, attachment modes (`existing|buyer|later`) — re-skinned, not rewritten.
- `ServiceBlocksStep` + `VaNiBlockRecommender` (bbb/iks78e merged versions) — **first task: reconcile iks78e leftovers against main** if any remain unmerged.
- Existing state fields: `coverageTypes`, `equipmentDetails`, `allowBuyerToAdd`, block `config` — the UI step rides these; the per-asset event schema lands in this sprint's migration step below.

### Build — step (a) UI
1. **"Coverage & Assets" step** per reference: one question ("Which asset types does this contract cover?"); asset-type pick is the mandatory gate; three attachment paths with **"client lists after signing" as a first-class card**; per-type unit count (qty ≥ 1); registry picker collapses after selection; context line explaining blocks attach to these types. Placeholder instances represented in `equipmentDetails` with `asset_registry_id: null` + a `placeholder: true` marker in specifications.
2. **"Add service blocks" step** per reference: VaNi recommendations open the step (reuse recommender, bulk-add); catalog as checklist; config unfolds per selected block; **cycle-mismatch warning inline at selection** (kill the Continue-time toast); one "Add a custom line" fly-by entry; price edit shows `list → your price (−%)` (recorded in block `custom_fields.list_price`).
3. **Discount UI** on Billing View step: contract-level discount input, `%` / `₹` toggle; live math display `subtotal − discount = taxable → tax → grand total`; per-line loaded values computed and visible in an expandable "internal allocation" view (seller-only, marked internal).
4. Template mode inherits all of the above automatically (same components). Template-stored discounts: kept in template state (an "intro offer" template is legal), stripped only of instance data as today.

### Build — step (b) Migration
- `t_contracts`: `discount_type` (`percent|amount`), `discount_value` numeric, `discount_total` numeric (computed absolute).
- `t_contract_blocks.custom_fields` carries `list_price` + `loaded_discount` (JSONB — no column change).
- Create/update contract RPC accepts the three discount fields. Rollback: columns nullable, RPC params optional.
- **Per-asset schema (THE cross-cutting migration, owned by this sprint):** new table `t_contract_event_assets` — `id, tenant_id, contract_id, event_id → t_contract_events, asset_ref (equipment_details entry id / asset_registry_id), status (open|assigned|in_progress|proven|blocked_placeholder), assignee, form_submission_id → m_form_submissions, evidence_id → t_service_evidence, proven_at`. Generated at activation: one row per service event × covered asset (placeholders start `blocked_placeholder`). Backfill script for existing active contracts.

### Build — step (c) Stitch
- `logic/mapper.ts`: emit discount fields + per-block `list_price`/`loaded_discount`; grand-total chain = `baseSubtotal − discount_total → tax → grand_total`. EMI math picks up discounted grand total automatically.
- `computeEventsForApi`: billing event amounts derive from discounted totals → **update API derivation parity in same batch**.
- Activation path (events derivation service + trigger) generates the per-asset rows; attaching a real asset to a placeholder flips its rows to `open`.
- Re-golden wizard parity. Impact notes (analysis deliverable, no code): cockpit/AR/appointments/group-sessions read-paths that display totals — enumerate which show gross vs net (fix-list feeds Sprints 3–5).

### Acceptance SQL (sprint1.sql)
- A contract created via wizard has: N `equipment_details` entries incl. ≥1 placeholder when "later" chosen; `discount_type/value/total` populated; every block row carries `custom_fields.list_price`; `computed_events` billing amounts = discounted math.
- Activating the test contract yields `t_contract_event_assets` rows = service events × covered assets, with placeholders `blocked_placeholder`; attaching a real asset flips its rows to `open`.
- A template saved carries the same authoring data in `settings.wizard_state`.

### Manual checklist
Create contract with 2 asset types (one "client lists later"), 3 blocks (one with edited price), 10% discount → verify wizard math on Billing View; activate → verify per-asset rows in DB; attach the placeholder's real asset → verify rows unlock; verify template round-trip; verify RFQ unaffected; parity 5/5; tsc baseline.

**Out of scope:** form invocation on the per-asset rows (S2), invoice rendering of discount (S4), any servicing UI (S3/S7).

---

## Sprint 2 — Smart forms from KT

**Goal:** forms exist for everything the knowledge tree knows, bind automatically, and attach to the per-asset rows created in Sprint 1. This sprint is the "definition of done" layer.
**UX reference:** `2-multi-asset-playground.html` (form-per-machine, placeholder lock).

### Reuse
- `m_form_templates` (already has `resource_template_id`, `source_variant_id`, `service_activity`), `m_form_template_mappings` (`is_mandatory`, `timing`), `m_form_tenant_selections`, `m_form_submissions`, `FormRenderer`, smart-forms edge fn, `EvidencePolicySection`. **No new forms infra.**
- KT master data: `m_equipment_checkpoints → m_service_cycles → m_equipment_variants`.

### Build — step (a) UI
1. **Forms library screen** (enhance existing admin forms surface): browse by equipment type; per-form: bound-to chip (KT node), status, preview via FormRenderer; tenant can **clone & edit** a seeded form (creates `t_form_templates` row). No form-builder-from-scratch this sprint.
2. **Binding visibility in the wizard:** blocks/asset steps show "requires: <form name> (from equipment type)" chips — read-only inheritance display.

### Build — step (b) Migration
1. **Seed the starter library:** generate one form per KT equipment type from its checkpoints (checkpoint → pass/fail field; measurable checkpoints → numeric field). Delivered as a reviewable seed migration (forms in `m_form_templates`, `status='approved'`, `resource_template_id` set). Owner reviews generated forms before apply.
2. **Auto-mapping rule:** on contract activation, for each covered asset type with a bound form → insert `m_form_template_mappings` row (`contract_id`, `form_template_id`, `is_mandatory=true`, `timing='during'`).

### Build — step (c) Stitch
- Form invocation attaches to the Sprint 1 `t_contract_event_assets` rows: a submission links to exactly one event-asset row; **server-side check: form submission requires a non-placeholder `asset_ref`** (this is the enforcement of placeholder gating at the forms layer).
- Existing contracts’ Operations/Tasks tabs keep working (they read events; per-asset linkage is additive).

### Acceptance SQL (sprint2.sql)
- Every KT equipment type has ≥1 approved form with `resource_template_id` set; count of generated forms reported.
- Activating a test contract yields mappings rows with `is_mandatory=true` for each bound asset type.
- A form submission row links to exactly one `t_contract_event_assets` row; submission against a placeholder row is REJECTED (verify via negative test).

**Out of scope:** servicing UI that consumes this (S3/S7), services/session-type KT forms (roster path lands in S5).

---

## Sprint 3 — Contract View: real items, per-asset grain

**Goal:** the contract detail page shows the truth — real event items with per-asset progress — and sheds dead surfaces. **Read-side only; no new write actions** (owner-confirmed: same operational concept, upgraded to real items — not a redesign).
**UX reference:** `2-multi-asset-playground.html` (contract page: schedule/assets/financials tabs).

### Reuse
- `pages/contracts/detail/index.tsx` tab shell, `OperationsTab`/`SellerTasksTab` date-grouping, `useContractEventsForContract`, EventCard, dual-persona role logic, `EquipmentTab`.

### Build (a UI → c stitch; no migration expected)
1. Event rows gain **per-asset progress**: "2/3 assets proven" chip + expandable per-asset list (serial, status, assignee, form state) reading `t_contract_event_assets`.
2. **Assets tab** upgraded: instances grouped by type, placeholder rows with "Attach real asset" action (this is the ONE write this sprint — it's an authoring-data completion, not servicing).
3. Remove/park dead surfaces: Requests "Coming Soon" placeholder, Communication placeholder, debug console noise (detail:1554–1566, 1790); "Download Report"/"Generate Invoice" stubs get disabled-with-tooltip ("arrives Sprint 4/7") instead of dead buttons.
4. Buyer persona: "My Services"/"Proof of Work" read the same per-asset grain.

### Acceptance SQL (sprint3.sql)
- Attach-asset action updates the `equipment_details` entry AND flips related `t_contract_event_assets` rows out of `blocked_placeholder` (rows verifiable).
- No other write paths introduced (audit: no new mutations besides attach).

**Manual:** open the seeded multi-asset contract → every visit shows n/m asset progress matching DB; placeholder attach flow works; buyer view coherent.

---

## Sprint 4 — AR/AP cleanup: the settle bridge

**Goal:** billing events become invoices from the UI; invoices carry per-asset internal lines and the owner's discount presentation; AR reflects delivery.
**UX reference:** `2-multi-asset-playground.html` (Financials tab: one invoice, per-asset lines).

### Reuse
- `/ops/finance` module (`pages/operations/finance/index.tsx`, real `/api/finance` over `t_invoices`), `RecordPaymentDialog`, Razorpay checkout, receipts/allocations tables (`t_invoice_receipts`, `t_invoice_receipt_allocations`), invoice RPCs, `event.amount_settled`/`invoice_id` linkage.

### Build
- **(a) UI:** wire "Generate Invoice" (OperationsTab/SellerTasksTab) to a real flow: preview drawer showing per-asset lines (from proven `t_contract_event_assets` for the period) → internal loaded discounts (seller-only expandable) → **invoice presentation: actual values, sum total, discount, total to be paid** → draft → send. Evidence-before-invoice gate: if contract policy on and period has unproven mandatory assets → block with reason (list what's missing).
- **(b) Migration:** invoice line-items structure if `t_invoices` lacks it (line rows: `label, asset_ref, gross, loaded_discount, net`); `discount_total` on invoice header. Repair task: reconcile the 12 unpaid/4 partial legacy invoices' linkage to billing events (report + fix script, owner-reviewed).
- **(c) Stitch:** billing event → invoice → receipt → `amount_settled` round trip; finance KPIs/ageing include discount-net amounts; cockpit finance chips read same numbers.

### Acceptance SQL (sprint4.sql)
- Generating an invoice writes: header with `discount_total`; one line per proven asset (gross/loaded/net sum to header); billing event `invoice_id` set + status advanced; receipt allocation rows on payment; **no orphan invoices** (every invoice ↔ billing event).
- Gate negative test: with gate on and 0 proven assets, no invoice row is created.

---

## Sprint 5 — Service events & group sessions cleanup

**Goal:** one coherent event layer — statuses trustworthy, legacy data repaired, group sessions fully first-class with roster-as-evidence.

### Reuse
- DB-driven status engine (`m_event_status_config/_transitions`, `useEventStatusConfigQueries`), bbb's group-session category + cadence engine + `holidayResolver`, `/ops/services` Service Schedule worklist.

### Build
- **(a) UI:** Service Schedule + cockpit ServiceEventsSection show per-asset progress and session occurrences consistently; group-session occurrence card gets **attendance roster capture** (roster = the form: attendee list + count + optional photo) using the same submission/evidence pipeline.
- **(b) Migration — data repair (owner-gated, reversible):** script that (i) recomputes stale event statuses vs config, (ii) closes/annotates orphaned test events, (iii) reconciles the 33 stuck `requested` appointments (link or expire), (iv) archives orphan tables' dead rows. Delivered as report-first (SELECTs showing what WOULD change) → owner approves → apply.
- **(c) Stitch:** roster submission closes the session occurrence exactly like a form closes an equipment visit (same `t_contract_event_assets` path with a session-audience variant: one row per occurrence, `asset_ref = null`, roster submission id attached).

### Acceptance SQL (sprint5.sql)
- Zero events whose status contradicts the transition config; zero appointments in `requested` older than the scanner window without an annotation; a completed session occurrence has a roster submission row linked.

---

## Sprint 6 — Cadence & appointments integration

**Goal:** the appointment layer becomes the scheduler of the per-asset work — requested → accepted(dated) → feeds execution.

### Reuse
- `t_appointments` + scanner (auto-request ~6 days ahead), `/ops/appointments` kanban, cadence settings page + SECURITY DEFINER RPCs, holiday-clash resolver.

### Build
- **(a) UI:** kanban "Accept" flow assigns technician + confirms date in one action (per-asset aware: accepting an appointment for an event with 3 assets creates/updates the 3 task-rows' assignee); reschedule respects holiday resolver; contract page + cockpit show appointment state on the event row. Dedupe: `/appointments` root scaffold removed or redirected to `/ops/appointments`.
- **(b) Migration:** `t_appointments.assigned_to` wired to event-asset rows (join table not needed — appointment→event exists; assignee fans to `t_contract_event_assets.assignee`).
- **(c) Stitch:** accepting appointment syncs `t_contract_events.scheduled_date` (bbb behavior) AND stamps assignees; declined/expired paths annotate.

### Acceptance SQL (sprint6.sql)
- Accepting an appointment: appointment `accepted` + `scheduled_at` set; event date synced; every related event-asset row has `assignee`; zero accepted appointments with unassigned asset rows.

---

## Sprint 7 — Service execution: close the loop

**Goal:** the milestone. A technician (or office user) opens a visit, proves every asset via its mandatory form + photo, placeholders gate closure, ticket lifecycle is real — and the platform's zeros (tickets/submissions/evidence) become non-zero **in production tables**.
**UX reference:** `2-multi-asset-playground.html` (the drawer: fan-out tasks, per-machine form, locked placeholder, complete-visit gate).

### Reuse
- `ServiceExecutionDrawer` (fix, don't rebuild), `ServiceTicketDetail` + `TicketEvidencePanel` (the working capture path — becomes the in-flow path), `useCreateServiceTicket`, **`useUpdateServiceTicket` and `useUpdateServiceEvidence` (exist, imported nowhere — wire them)**, storage upload, FormRenderer submission path (from S2).

### Build
- **(a) UI:** execution drawer per reference — per-asset task cards; each card: assignee, mandatory form (FormRenderer inline), photo capture, "mark asset proven"; placeholder card shows lock + "attach real asset"; Complete-visit enabled only when all proven; completed visit → ticket `completed`, per-asset evidence attached; "View proof" per asset. Responsive/mobile-friendly (field techs on phones) — not a separate app this program.
- **(b) Migration:** ticket status transitions + evidence verification statuses confirmed against existing tables (`t_service_tickets`, `t_service_ticket_events`, `t_service_evidence`) — expected: minimal/no schema change, wiring only. Any gap found becomes an explicit reviewed migration.
- **(c) Stitch:** the full chain writes in order: task proven → `m_form_submissions` + `t_service_evidence` + `t_contract_event_assets.proven` → all proven → `t_contract_events` completed via status engine → ticket completed → (if S4 gate on) invoice draftable. Evidence verify/reject wired for the seller (OTP variant deferred).

### Acceptance SQL (sprint7.sql) — the program's exit criteria
After the scripted E2E on a fresh test contract (3 assets, 1 placeholder→attached mid-flow):
- ≥1 `t_service_tickets` row reaching `completed` with ordered `t_service_ticket_events` history;
- one `m_form_submissions` + one `t_service_evidence` + one proven `t_contract_event_assets` row **per asset** (3/3), correctly cross-linked;
- the service event `completed` via a legal transition; appointment closed; invoice with 3 asset lines and correct discount presentation; receipt allocation on payment;
- **zero gaps:** no UI action in the flow that left no corresponding row.

---

## Program-level verification artifact

A living `sql/acceptance/README.md` indexes all sprint queries; after Sprint 7 the whole file runs green on a fresh tenant — that green run is the definition of "the loop is closed" and the green light for the business-model/metering track.

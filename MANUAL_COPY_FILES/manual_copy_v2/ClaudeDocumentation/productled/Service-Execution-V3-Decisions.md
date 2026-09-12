# Service Execution V3 — Decisions Log & Build Spec

**Status**: spec frozen 2026-09-01 (owner-reviewed interactive draft: `Service-Execution-V3-Handoff.html`, 7 screens).
**Scope**: closes servicing-spec Sprints 2 (smart forms) and 7 (execution loop) on the JTD/V2 foundation.
**Related**: `jtd-cutover-package.md` (Track A), CLAUDE.md Sprint 3/7 boxes.

---

## The model in one sentence

A **visit** is the unit of execution: the ticket is its container (`t_service_tickets` +
`t_service_ticket_events`), proof hangs off the **event × asset** grain
(`t_contract_event_assets`, whose `event_id` = `n_jtd.id` post-cutover), and every message
about the visit is an `n_jtd` message row beside the job rows it describes.

## Decisions (all owner-confirmed, dates noted)

| # | Decision | Date |
|---|---|---|
| D1 | Ticket is born at **Start service**, never at appointment-accept. Appointment ↔ ticket meet at the shared job (`t_appointments.event_id`); no new linkage. | 2026-09-01 |
| D2 | Ticket numbers come from the platform sequence generator, prefix `TKT-` (extract the shared retrying sequence helper while at it). | 2026-09-01 |
| D3 | Proof grain is **event × asset**, not block. A 5-block visit is a checklist of cards; forms appear only where mapped — everything else is one tap. No "mark all done" when forms are mandatory. | 2026-09-01 |
| D4 | Form **and** upload can both be required: `require_upload` flag on the mapping/policy. `t_contract_event_assets` already carries `form_submission_id` + `evidence_id` side by side. | 2026-09-01 |
| D5 | **Beyond-scope is never contract billing.** Persisted on the ticket, invoiced **on the fly** at visit close: own line items/prices, `contract_id` + ticket ref for provenance, NO billing event, contract `grand_total` untouched, tax from `t_tax_settings` at generation (subscriptions/002 pattern). First real driver for contract-less/on-the-fly invoicing (guest fees queued behind same capability). | 2026-09-01 |
| D6 | **Service Report is an output renderer** over the completed ticket (header + events + per-asset proof). Nobody "fills a report". Public link = CNAK-style token, no-cache headers. Block wizard's mock "Service Report" evidence type retires. | 2026-09-01 |
| D7 | Completing a visit **always** records who/when/what (started_at, completed_at, assigned_to, completion_notes + status walk) — evidence policy governs only proof artifacts beyond that baseline. | 2026-09-01 |
| D8 | **Domain lexicon**: per-nomenclature-code label map (tenant-overridable) read via one `useDomainLabels()` hook — ticket→visit/appointment/session, report→treatment/session summary, etc. Applies to UI **and** message copy. Same engine, different vocabulary (the subscriptions move). | 2026-09-01 |
| D9 | **Form resolution ladder** (materialized at V2 activation into `m_form_template_mappings` + provenance columns): block form → KT form → contract fallback → **platform default "General Service Completion"** (seeded, versioned; 3 fields: work status, asset condition, optional note; photo if require_upload). Policy `smart_form` never dead-ends; policy `none` stays one-tap. Tenant's block-level choice **overrides** KT (KT is the default, not the law). | 2026-09-01 |
| D10 | **Mobile is the primary execution surface**: sequential card flow (list ⇄ one full-screen form), auto-advance to next pending asset, camera-first capture, offline queue, prefill statics never proof. Same routes/writes as desktop drawer — one engine, responsive rendering. | 2026-09-01 |
| D11 | **WhatsApp tiers**: T1 CTA-URL button into the token'd mobile page (ships with Sprint 7, no dependencies); T2 quick-reply buttons (needs inbound webhook forward); T3 **WhatsApp Flows can carry the smartform itself** incl. PhotoPicker — compiled per approved form template ("Publish to WhatsApp" → Flow JSON → stored flow_id; form version = Flow version); one Flow = one proof card; orchestration stays server-side; encrypted-media decrypt pipeline on webhook. T3 gated on MSG91 answers (17-question ticket sent by owner; B.7 media pass-through is the decider). All new MSG91 templates are POSITIONAL params. | 2026-09-01 |

## Key structural facts (verified live, 2026-09-01)

- `t_contract_event_assets` exists (409 rows, all `blocked_placeholder`, V1-era contracts only).
  Fan-out = trigger on `t_contracts` UPDATE → `generate_contract_event_assets` reads
  `t_contract_events` ⇒ **V2 contracts get no rows today** (no event rows). FK `event_id →
  t_contract_events` (swap to `n_jtd` in cutover Phase 2 — id-preserving copy keeps values).
- `t_service_ticket_events.event_id` FK likewise on the cutover swap list.
- `/api/service-execution` (tickets + evidence CRUD) EXISTS and is registered. Zeros are zero
  because the chain has no spine, not because the API is missing.
- Forms infra complete (`m_form_*`, FormRenderer, smart-forms edge fn); seed thin: 45 bound
  forms cover only 6/123 equipment types; 23 approved / 25 draft; mappings & submissions: 0.
- Block wizard Evidence step's form picker is MOCK data; block-level evidence config persisted
  nowhere (0 cat blocks).
- Contract-level policy real: `evidence_policy_type` (292 rows) + `evidence_selected_forms` (1).
- Beyond-scope items in the current drawer are **dropped** (collected in state, never sent).
- `nomenclature_id/code/name` populated at authoring, read by nothing (D8 fixes).

## Build batches

- **B1 — foundation** (can land before/with cutover; nothing here waits on Track A):
  jtd-aware fan-out on V2 activation (`generate_contract_event_assets_v2` reading `n_jtd`
  service jobs); `GET /api/contracts/:id/event-assets` (API → edge → table) feeding the
  existing `EventAssetProgress`; `TKT-` sequence + shared retrying sequence helper.
- **B2 — Sprint 2**: seed "General Service Completion" default form; resolver at V2 activation
  writing `m_form_template_mappings` (+ `contract_block_id`, `resource_template_id`,
  `require_upload` columns + unique index); block picker made real (approved forms via API);
  submission gating (link to exactly one event-asset row; placeholder `asset_ref` rejected
  server-side). Separate content batch: seed forms for the 117 uncovered KT types (owner-reviewed).
- **B3 — Sprint 7**: mark-asset-proven endpoint (+ completion cascade: all proven → job/event
  completed via legal transitions → ticket completed); mobile-first execution UI per D10;
  report renderer + public link; beyond-scope persistence → on-the-fly invoice per D5.
  Exit: scripted E2E on fresh signia contract (3 assets, 1 placeholder attached mid-flow) —
  tickets/evidence/submissions non-zero, sprint7 acceptance green.
- **B4 — Extend**: five touchpoint templates (visit_scheduled / visit_started / visit_completed /
  report_ready / beyond_scope_invoice, positional params), lifecycle enqueue as n_jtd message
  rows, dispatch-window config (generalize `dispatchHour`), domain-lexicon message copy;
  WhatsApp Flow smartform compiler behind MSG91 verification.

## Open items / gates

- ~~MSG91 17-question ticket~~ **ANSWERED 2026-09-02.** Outcome:
  - **T3 GREEN (conditional)**: navigate + data_exchange both supported; PhotoPicker/
    DocumentPicker media works through MSG91. Gate before building the compiler: a
    hand-built POC Flow (2 fields + 1 PhotoPicker) → send via MSG91 → capture the real
    `nfm_reply` payload + prove the media decrypt path. Their answers were thin on
    key-exchange detail and confused about Flow JSON versions — POC is non-negotiable.
  - **T2 unblocked by configuration**: MSG91 supports MULTIPLE webhook destinations —
    register the `msg91-webhook` edge function directly as a second destination
    (no n8n forwarding needed; n8n keeps its own copy).
  - **T1 fully confirmed**: dynamic URL suffix on CTA buttons works — per-visit token links.
  - **Flow authoring**: Meta Business Manager/Flow Builder ONLY (MSG91 API sends, never
    creates) → D11's compiler v1 = generate Flow JSON for manual publish + store flow_id
    after sync.
  - **Named params**: MSG91 support claims named parameters ARE supported for new
    templates — contradicts the Aug-2026 editor refusal and two silent handset failures.
    NOT trusted until one named-param template passes a real handset test; positional
    remains the default.
  - Owner actions: (a) check Meta WhatsApp Manager for the Flows section on our WABA
    (enablement is Meta-level per MSG91); (b) add the second webhook destination in the
    MSG91 panel; (c) note webhook auto-pause behavior — repeated endpoint failures pause
    delivery, so the webhook needs monitoring once inbound goes live.
- Track A (cutover): signia Phases 1–3 DONE 2026-09-01/02 (id-preserving copy 356 rows /
  23 contracts, money FK swap, bidirectional sync bridge; drift 0, both directions
  harness-proven). Old table stays authoritative-mirror until Phase 5. BBB copy window
  6–8 Sep (after the 5 Sep meeting); flip + retirement after a clean 19 Sep meeting.

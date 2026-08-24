# JTD Nucleus — Step 6: Cutover Package (PAPER ONLY)

**Status: PLAN, NOT EXECUTED.** Nothing in this document has been run.
Execution is a separate, explicit owner decision — and is itself staged
per-tenant so BBB is touched last, only after a signia-only dry run.

Authority: `ClaudeDocumentation/JTD/JTD-Framework.md` (Dec 2025) and the
owner's single-truth decision (2026-08-17): *n_jtd becomes the ONLY home
of jobs; VaNi AI runs ops on JTD; one destination — "the whole plan is to
clean 40-50 queries i don't care."*

---

## 0. What cutover means, in one paragraph

Today two spines coexist: legacy contracts live on `t_contract_events`
(V1), jobs-era contracts live on `n_jtd` job rows (V2), and the Step 3
aggregate bridges them with `events.source = 'jtd' | 'legacy'`. Cutover
copies every legacy event into `n_jtd` **id-preserving**, repoints every
writer and reader to jobs, removes the legacy fallback and the `?useV1=1`
escapes, and finally retires `t_contract_events`. After cutover there is
exactly one truth, and the fallback the owner distrusts is dead.

---

## 1. Entry criteria (must ALL be true before Phase 1)

- [ ] Confidence-gate audit (`audit_step5_confidence_gate.sql`) all-PASS,
      all residue zeros, on the full jobs-era population.
- [ ] The three corner cases NOT exercised when Step 5 closed are run:
      EMI/multi-invoice contract · pay-before-activate through the real
      UI · bad-template bulk (must refuse every item, zero residue).
      *(Step 5 closed on owner's call with ordinary-wizard + payment
      coverage: CN-1005 audited PASS, CN-1006 owner-verified. These three
      are therefore ENTRY criteria here, not skipped work.)*
- [ ] **Cancel/write-off V2 siblings built and harness-proven.** Receipt
      cancel, invoice cancel, write-off are V1-ONLY today — they reverse
      `t_contract_events`, not jobs (audit chk10 exists precisely because
      of this). After cutover these paths MUST operate on jobs or money
      reversal breaks. This is the one known **build item** inside Step 6.
- [ ] Full DB backup / PITR point confirmed.
- [ ] BBB not in any active billing window (avoid the 1st-of-month runs).

---

## 2. Inventory — what actually touches the legacy spine

### 2a. Database (generate live at execution time — counts drift)

Run and attach to the execution ticket:

```sql
SELECT p.proname,
       (p.prosrc ILIKE '%INSERT INTO t_contract_events%'
        OR p.prosrc ILIKE '%UPDATE t_contract_events%'
        OR p.prosrc ILIKE '%DELETE FROM t_contract_events%') AS writes
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prosrc ILIKE '%t_contract_events%'
ORDER BY writes DESC, proname;

SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid = 't_contract_events'::regclass;

SELECT conname, conrelid::regclass AS on_table
FROM pg_constraint
WHERE confrelid = 't_contract_events'::regclass;   -- inbound FKs

SELECT jobname, schedule, command FROM cron.job
WHERE command ILIKE '%contract_event%' OR command ILIKE '%reminder%';
```

Known members from this initiative (not exhaustive — the query above is
the authority): `trg_queue_contract_events` +
`process_contract_events_from_computed` (materializer),
`get_contract_events_list` (reader the aggregate composes),
`record_invoice_payment_with_allocations` (settlement),
`update_contract_event_status` family, `run_contract_event_scanner`
(15-min cron drafting invoices from unlinked billing events), the
reminder cron (V2 contracts get NO reminders today — documented gap that
cutover closes), Finance readers (`get_tenant_receivables` etc., the
IST-corrected 064/065 family), `gs_dues_matrix`, cockpit/VaNi briefing
readers. Owner's estimate: 40–50 call sites. Inbound FKs known:
`t_invoice_receipt_allocations.contract_event_id`,
`t_invoices.contract_event_id`.

### 2b. Code (generated 2026-08-20 from the working tree)

**Edge**: `functions/contract-events/index.ts` (V1 events API — retire),
`functions/contracts-v2/index.ts` (keeps working; fallback branch dies in
the RPC, not here).

**API**: `routes/jtd.ts`, `routes/adminJtdRoutes.ts` + `adminJtdService`
(already JTD-side — gain, not change), `contractEventsDerivationService`
(the derivation engine — stays; its OUTPUT lands in jobs),
`contractComposerService`, `catalogStudioController` (audit each for
event reads).

**UI (readers that today hit V1 event endpoints or cached V1 shapes)**:
`useContractEventQueries.ts` (the central one — its cache the aggregate
seeds), `EventsPreviewStep`, `EventCard`, `EventScheduleAdjuster`,
`TimelineTab` (contracts + contacts), `OperationsTab`, `SellerTasksTab`,
`ServiceExecutionDrawer`, `ServiceTicketDetail`, `TicketEvidencePanel`,
`EquipmentTab`, `HealthBadge`/`useContractHealth`, `OperationsTab`,
`InstalmentActionModal`, `LiteDashboard`, `ops/cockpit`,
`operations/services`, `contracts/review`, `ContractDocument`,
`fleetTypes`, `useAppointmentQueries`, `useGroupSessionsDashboard`.
Most render from the seeded cache already (Step 3); the flip is where
the DATA comes from, not component surgery.

---

## 3. The migration itself — id-preserving copy

One migration, per-tenant gated (`WHERE tenant_id = ANY(:tenants)`):

```
INSERT INTO n_jtd (id, tenant_id, contract_id, block_id, block_name,
    category_id, event_type_code, source_type_code, source_id, source_ref,
    scheduled_at, original_date, sequence_number, total_occurrences,
    billing_sub_type, billing_cycle_label, amount, amount_settled,
    currency, invoice_id, status_code, task_id, assigned_to,
    assigned_to_name, notes, version, is_active, is_live, audience,
    performed_by_type, created_at, updated_at, created_by, updated_by, ...)
SELECT e.id,               -- ID-PRESERVING: n_jtd.id = t_contract_events.id
       e.tenant_id, e.contract_id, ...,
       CASE e.event_type WHEN 'service' THEN 'service_visit' ELSE 'payment' END,
       CASE e.event_type WHEN 'service' THEN 'service_scheduled' ELSE 'payment_scheduled' END,
       ..., e.scheduled_date, e.original_date, ...,
       e.status,           -- SAME vocabulary: Step 2 seeded job lifecycles
                           -- from the REAL statuses live events use
       ...
FROM t_contract_events e
WHERE NOT EXISTS (SELECT 1 FROM n_jtd j WHERE j.id = e.id);   -- idempotent
```

Why id-preserving is the whole trick:
- `t_invoice_receipt_allocations.contract_event_id` values become valid
  `jtd_id` values by definition. FK swap is then just
  `UPDATE ... SET jtd_id = contract_event_id, contract_event_id = NULL`
  (batched), and `chk_alloc_target` already permits it (migration 006).
- `t_invoices.contract_event_id` same treatment (or keep as a plain
  uuid pointing at the job — decide at execution).
- Every existing external reference (task links, reminder rows keyed on
  event ids) keeps meaning without a mapping table.

Exact column mapping is finalized against `information_schema` at
execution time — the 22 job columns were designed column-for-column from
`t_contract_events` (Step 1), so this is transcription, not invention.

**Additive and reversible**: the copy adds job rows and touches nothing
in `t_contract_events`. Until Phase 6, rollback = repoint reads back.

## 4. Phased execution order

| Phase | What | Rollback if it goes wrong |
|---|---|---|
| 1 | Data copy (above), signia first, verify counts+sums per contract (script included in migration: Σ amounts, Σ settled, row counts per contract MUST match between the two tables) | `DELETE FROM n_jtd WHERE id IN (SELECT id FROM t_contract_events)` — additive copy, zero V1 impact |
| 2 | Allocation/invoice FK swap to `jtd_id` | reverse UPDATE (values preserved in `contract_event_id` until Phase 6) |
| 3 | **Writers** → jobs: replace `trg_queue_contract_events`/materializer path with job materializer; repoint `run_contract_event_scanner`, reminder cron, `record_invoice_payment_with_allocations`, event-status/cancel/write-off functions to `n_jtd`. Each is a verified-anchor prosrc edit or a V2-sibling promotion; each gets its own migration file | re-CREATE from the source-of-record V1 definitions captured into the execution ticket BEFORE any edit (mandatory step) |
| 4 | **Readers** → jobs: the 40–50 functions from the 2a inventory, mechanical `t_contract_events` → job-row rewrite, each verified by comparing output on 3 sample contracts pre/post | same as Phase 3 — captured definitions restore in minutes |
| 5 | Route/UI flip: aggregate drops the legacy branch (source always `'jtd'`), `?useV1=1` escapes removed, `contract-events` edge function + V1 event routes retired, `useContractEventQueries` reads the aggregate | git revert of the UI/API batch + redeploy edge — V1 objects still exist |
| 6 | Retirement: `ALTER TABLE t_contract_events RENAME TO zz_archived_contract_events` (30-day hold), drop the V1 triggers, drop the archive after the hold | within the hold: rename back. After: PITR only — hence the hold |

**The 5-minute rollback promise holds through Phase 5** because every
phase before retirement leaves V1 objects intact and the copy additive.
Phase 6 is the only burn-the-boats step and happens weeks later.

**BBB gating**: Phases 1–4 run signia-only first; full soak (several days
of real usage, one billing cycle if timing allows); then the same
migrations re-run with BBB's tenant id. BBB never sees a phase signia
hasn't survived.

## 5. Decisions to make AT execution (flagged, not defaulted)

1. `jtd_number` / `status_id` — dormant on all rows since Dec. Adopt
   (add generator + backfill) or drop the columns. Recommend: drop
   `status_id` (status_code is the working truth), adopt `jtd_number`
   only if humans need to reference jobs in conversation.
2. `t_invoices.contract_event_id` — swap to a `jtd_id` column or leave
   as an untyped uuid. Recommend: add `t_invoices.jtd_id`, mirror the
   allocations treatment.
3. Reminder semantics for service_visit jobs (executed_at/completed_at
   when a visit is performed) — the service-execution flow writes these
   post-cutover; scope that wiring here or as its own step.
4. December's message-shaped payment lifecycle rows in `n_jtd_statuses`
   (created→pending→sent→delivered→read) — delete or leave as fossils.
5. CN-1019's 16 legacy rows and the other signia legacy test contracts —
   they simply ride the Phase 1 copy like everything else.

## 6. What this package deliberately does NOT cover

- Guest-session payments (blocked on contract-less invoices — separate).
- Per-asset event proof (Sprint 3 backend — separate).
- BBB data corrections (qty 1→12/4 etc. — separate owner call).
- Multi-tenant timezone (048's hardcoded IST — separate).

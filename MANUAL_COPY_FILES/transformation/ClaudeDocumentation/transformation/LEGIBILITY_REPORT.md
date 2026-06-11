# ContractNest — Agent Legibility Probe Report

> **Date:** 2026-06-11 · **Session type:** read-only diagnostic (SELECT / catalog / code inspection only — zero writes, zero RPC executions)
> **Probe tenant:** `pulse` (`a58ca91a-7832-4b4c-b67c-a210032f26b8`) — the richest live tenant: 15 contracts (3 active), 48 contract events (21 future), 8 registry assets, 2 catalog blocks. Only 4 of 147 tenants have any contracts at all.
> **Buckets:** **L1** = legible from schema+data · **L2** = meaning recoverable only from migrations (rung 2), RPC source (rung 3), or app code (rung 4) · **L3** = meaning absent from the data entirely · **D0** = probe unanswerable for lack of realistic data.

---

## 1. Executive Summary

**Verdict: the founder's hypothesis is confirmed, with one precise refinement.** The *operational core* (contracts → events → invoices → tickets) is largely legible: an agent can answer "what's due," "who owes what," and "when does this expire" from the database, occasionally needing RPC source to recover semantics. But the *knowledge spine* — KnowledgeTree → Catalog → Template → Contract — is **not traversable in either direction in live data**: every linking column that was built for it sits at zero population, every actually-used link is a JSONB bag, a name string, or `NULL`, and the one pipeline that was written to populate it correctly (`ktCatBlockMapperService` → `catBlocksService.bulkSeed` → edge `/cat-blocks/bulk`) **has no caller anywhere in the codebase**. The new 13-step VaNi onboarding doesn't fix this — it *performs* it: the "Loading knowledge tree…" task is a 600 ms `setTimeout`, the pricing-review screen renders hardcoded mock data, and the three steps that should capture tenant intent (resource-pick, pricing-review, equipment-confirm) persist nothing at all.

**Distribution across 20 scored probes:** **L1: 4 · L2: 8 · L3: 8**, with D0 overlays on 5 probes (service-execution, completion, and renewal questions are unanswerable because the loop that would generate the data has never run — 27 of pulse's 48 events are past-dated and still `scheduled`; 0 tickets, 0 evidence platform-wide for this tenant).

**Most agent-hostile finding:** the commitment record does not say what was promised. 13 of 13 contract blocks platform-wide are `source_type='flyby'` with `source_block_id = NULL` — free-typed line items whose service frequency exists only inside the block's *name text* ("monthly service") and whose scope, checkpoints, and SLA exist nowhere. An agent reading a contract learns the price and the buyer; it cannot learn the promise.

**Most agent-ready finding:** the money position. `t_invoices` carries invoiced/paid/balance/due-date as stored, FK-constrained facts (A3 answered at rung 1 in one query), and the events ledger answers "what's due this week" the same way. The skeleton of legibility exists exactly where the original audit said the rails were real.

**The single sentence for the founder:** the database *records outcomes* legibly but *encodes intentions* nowhere — meaning lives in wizard code, mock screens, and orphaned services, so today an agent can read ContractNest's past but cannot safely compose its future.

---

## 2. Scorecard

| # | Probe | Bucket | Rung | Evidence (summarized) | Defect statement |
|---|-------|--------|------|----------------------|------------------|
| A1 | What's due this week? | **L1** | 1 | `t_contract_events ⋈ t_contracts` on `scheduled_date BETWEEN now() AND now()+7d` → 2 service visits (CN-1006, CN-1009) with buyer names (denormalized on contract). | None for the list itself; *what* is due is only `block_name` text (see A4). |
| A2 | Which commitments slipped? | **L2** | 3 | 27 past-dated events all `status='scheduled'`; zero `overdue` rows ever. `overdue` appears only in 7 read-side functions (`get_contract_events_date_summary`, `get_contract_stats`, …). | "Overdue" is a read-time computation with no owner; the stored status lies about reality. State enum has a value nothing sets. |
| A3 | Money position on contract C | **L1** | 1 | One query: INV-10003 (CN-1006) total ₹214,524, paid ₹40,000, balance ₹174,524, due 2026-03-19 (84 days past). Receipts in `t_invoice_receipts`. | Clean — except `t_invoices.status` shows `partially_paid`, never `overdue` (same pathology as A2). Aging must be derived from `due_date`, fine for an agent. |
| A4 | What did we promise in C? | **L2 + L3** | 4 | CN-1006 has exactly one block: `flyby`, name "monthly service", qty 12, ₹17,877, `custom_fields` = display config only. Frequency is inferable only from the *name string* + counting events; scope/checkpoints/SLA: nowhere. `evidence_policy_type`/`evidence_selected_forms` (JSONB id-bag) exist on the contract. | The promise is not modeled. Service definition, frequency, and scope are L3 on the contract record; what exists (blocks, evidence policy) needed rung-4 reading to interpret. |
| A5 | When does C expire & what then? | **L2** | 3 | Dates legible (CN-1006 ends 2027-03-19). But `prolongation_date` semantics required reading `trg_compute_contract_dates` + `auto_expire_contracts` source: it's a computed post-end extension; expiry fires on `COALESCE(prolongation_date, end_date) < now()`, set by nightly cron as system user. `grace_period_*` plays **no role** in expiry and no DB consumer was found — meaning unresolved. | Two extension-like concepts (`prolongation`, `grace_period`) with zero schema documentation; one is only explainable from trigger source, the other not at all. No column comments on any of them. |
| A6 | What should we charge for service S? | **L2 + L3** | 1–4 | `m_cat_blocks.base_price` exists (pulse: 2 junk-named blocks, ₹500/₹1,200). But (a) all real contract prices were free-typed (`flyby`), bypassing the catalog; (b) no price history table — only `version`/`updated_at`; (c) `variant_pricing` is an uncommented JSONB; (d) KT market guidance (`price_median`) connects to nothing. | Current price is legible *if* a catalog block exists; price provenance ("its source and last change") is L3 — no lineage from contract price → catalog → KT, no price audit trail. |
| A7 | Service history of asset Y | **L1 + D0** | 1 | Join path exists and is typed: `t_client_asset_registry ← t_contract_assets`, `t_service_tickets.asset_id`, `t_service_evidence.asset_id`. Data: pulse has 8 assets, **0** contract-asset links, **0** tickets, **0** evidence. Two parallel registries (`t_client_asset_registry` 30 rows vs `t_equipment` 0 rows) with no schema-visible rule for which is canonical (rung 4 to discover the UI uses the former). | Structurally sound; empirically unproven. D0: a seed must create asset-linked tickets+evidence. L2: canonical-registry ambiguity. |
| A8 | Renewals next 60 days + performance record | **L1 + D0/L3** | 1 | Horizon query trivial (`end_date <= now()+60d`) — returns 0 active contracts (D0 for horizon). Performance record: computable in shape, but **all** events are `scheduled` — completion-rate = 0/0 for every contract. The data cannot distinguish "service never happened" from "happened, never recorded". | Renewal *horizon* legible; renewal *evidence packet* is fiction until the execution loop runs. No renewal entity/state exists at all (no table matched `%renew%`). |
| A9 | Did we meet SLA on last 10 events? | **L3** | 5 | `information_schema` sweep: **zero** columns matching `sla/response_time/resolution/penalty/breach` in the entire public schema. Template-designer "SLA defaults" never reach a table. | SLA terms are not modeled anywhere. Adherence is not computable, not even badly. (Audit prediction verified empirically.) |
| A10 | What is this tenant's business? | **L2 + L3** | 4 | Industry: `t_tenant_profiles.industry_id` + `t_tenant_served_industries` (L1). Offered services: 2 junk blocks (weak). **Persona (seller/buyer/dual): the only `persona` column in the DB is on `leads_contractnest` (marketing). The product stores it as `t_tenant_profiles.business_type_id` — which is NULL for pulse and every recently-onboarded tenant checked**; the UI writes literal strings 'seller'/'buyer' into an `_id`-named column (rung 4: `PersonaSelectionStep.tsx:101`). | The single most basic agent question — "am I working for a provider or a buyer?" — is unanswerable from data for every real tenant. L3 in practice. |
| B0.1 | Onboarding data-flow map | **L2** | 4 | Mapped fully (see §3.1). Backend `t_tenant_onboarding` still says `total_steps: 6` with `step_data = {}` while the UI runs 13 steps — the step model itself diverged. | Onboarding state is illegible: the DB's model of the flow no longer matches the flow. |
| B0.2 | Given (I,R), what should be seeded? | **L2 + L3** | 1/4 | Equipment list: derivable from data (`m_catalog_resource_templates.industry_id` + junction + `m_catalog_industries.parent_id` walk). Catalog with prices: only via the orphaned mapper's rules (rung 4). **R is unrecoverable: `ResourcePickStep.tsx` persists nothing** — the tenant's resource selection dies in React state. | Intent (I) partially encoded; intent (R) never persisted → L3. |
| B0.3 | Diff actual vs intended seed | **L3 (outcome)** | 1 | `m_cat_blocks`: `is_seed=true` count = **0** across all 147 tenants; `resource_template_id` populated on **0/45** blocks. The seed has never successfully produced a row. | Onboarding has never seeded a catalog. See §3.1 for the three stacked causes. |
| B0.4 | KT agent fields populated/consumed? | **L2-by-design** | 1/4 | Populated: `service_name` 92/517 checkpoints, `catalog_name` 8/260 cycles, prices 48/260 cycles, 59/360 parts. The only equipment with complete mapper-consumable data is **STP/WTP Plant** (8 cycles) — not HVAC (prices, no `catalog_name`), not anything else. Consumer: only `ktCatBlockMapperService` → `bulkSeed` → edge `/cat-blocks/bulk` (fully built) — **zero callers** (grep across routes/controllers). | The agent-readiness fields feed an orphaned pipeline; 1 of 240 equipment types could actually flow through it. |
| B0.5 | The break, precisely | — | — | See §3.1 — three stacked failures, all named. | — |
| B1.1 | Compose HVAC starter catalog from KT | **L2 + D0** | 1/4 | Query works structurally (`m_service_cycles ⋈ m_equipment_checkpoints` on `resource_template_id='a450f71e…'` → 40 checkpoints, prices ₹350/700/8000) but `catalog_name IS NULL` for **all** HVAC cycles → no data-driven grouping into sellable services; the grouping rule lives in the mapper code and even it would skip HVAC. | Composition is expressible as a query *only* for STP/WTP; for everything else the agent must invent judgment the data doesn't support. |
| B1.2 | Assemble template from catalog | **L2** | 1 | Template entity = `t_cat_templates` (the naming drift is real: tenant-prefixed table holding `is_system`/`is_public`/`industry_tags` global-template columns). Blocks attach via a **JSONB array** `blocks: [{block_id, order, config:{price, evidenceRequired:{photo,gps,otp,signature}}}]` — UUIDs inside JSONB, no FK, price *overridden inside the template copy*. | Template→block lineage is a JSONB bag; template-level price overrides are invisible to any relational query. |
| B1.3 | Draft contract from template (write plan) | **L3** | 3 | Write plan exists (`create_contract_transaction` payload). But the **event calendar cannot be produced server-side**: the RPC only *consumes* a `computed_events` JSONB; `process_contract_events_from_computed` materializes it; **zero** functions compute events from terms (`pg_proc` sweep). And the inputs needed to compute it (frequency, visit count per block) aren't stored on blocks anyway (A4). G4 confirmed from inside the database. | An agent (or any API client) creating a contract without the React wizard creates a contract with **no calendar** — silently. |
| B1.4 | Same as RFQ (buyer persona) | **L3** | 1 | `record_type='rfq'` + `rfq_number` exist on `t_contracts`; status flow lives client-side (`types/contracts.ts` RFQ_STATUS_FLOW). Tables matching `%response%|%quote%|%bid%|%award%|%rfp%`: **none**. | RFQ is a contract with a different label; the responses→evaluation→award half of the journey has no data model at all. |
| B2.1 | Trace contract block → catalog → KT | **L3** | 1 | First hop dead: `source_block_id` NULL on 100% of `t_contract_blocks` (and unconstrained when set — only FK on the table is `contract_id`). `t_contracts.template_id` NULL on all rows; `path='scratch'` everywhere. Events→blocks: `t_contract_events.block_id` is **text** + `block_name` copy. | Upward lineage does not exist in live data; even the columns built for it are unconstrained and empty. |
| B2.2 | Spare part price change → impact analysis | **L3** | 1 | Requires KT→catalog (0/45 populated) + catalog→contract (0/13). Even if populated: blocks carry no spare-part references (`kt_checkpoint_ids` empty; no part ids anywhere on blocks). | The repricing/renewal impact query is impossible at every hop. |
| B2.3 | Checkpoint becomes mandatory → non-compliant contracts | **L3** | 1 | Same chain; additionally contract blocks store no checkpoint/scope at all. `kt_compliance_defaults` exists but is RLS-deny-all and unconnected. | The compliance-traceability promise has no data path. |

---

## 3. The Traversal Map

### 3.1 B0.5 — Where onboarding breaks (the precise statement)

The KT→Catalog chain fails at **three stacked points**, all during/around the `vani-working` step:

1. **Wrong seeder is wired.** `VaniWorkingStep.tsx:196,236` calls `POST /api/seeds/tenant/industry-confirmed` → `seedTenantOnIndustryConfirmedService.ts`, which inserts *name-only, price-less* blocks directly from `m_catalog_resource_templates` (one block per equipment template, `config:{}`, no `base_price`). The KT-aware pipeline that maps cycles→service blocks and parts→spare blocks with `price_median` pricing — `ktCatBlockMapperService.buildBlocksForTemplate()` → `catBlocksService.bulkSeed()` → edge `cat-blocks/index.ts:639 handleBulkSeed` — is complete, commented "used by Onboarding Agent", and **called by nothing** (grep: zero callers in routes/controllers).
2. **Even the wrong seeder returns zero rows for most tenants.** It filters `m_catalog_resource_templates.industry_id = $selected` (`seedTenantOnIndustryConfirmedService.ts:119-123`), but tenants select **leaf segments** (`dental_clinics`×6, `physiotherapy`×6, `general_practice`×5, `isp`, `commercial_cleaning`, …) while templates are tagged at **parent level** (`healthcare`:14, `facility_management`:15, …). The bridge exists in data — `m_catalog_industries.parent_id` resolves every orphan segment — but the code never walks it, logs "No KT templates found", and reports `success: true`. Live proof: `is_seed=true` blocks = **0** platform-wide.
3. **Tenant intent from the last onboarding steps is never persisted.** `ResourcePickStep.tsx` saves no selection (browse-only); `Screen8APricingStep.tsx` renders a hardcoded `// ── Mock data ──` rate card (Hydraulic Lift / MRL / Escalator / Dumbwaiter — elevator data regardless of tenant industry) and makes **zero API calls**; `Screen8BEquipmentStep.tsx` likewise. The "Loading knowledge tree…" task is `await new Promise(r => setTimeout(r, 600))` (`VaniWorkingStep.tsx:~178`). Meanwhile the backend still records `total_steps: 6, step_data: {}` (`t_tenant_onboarding`) against a 13-step UI — the flow's own state model has diverged.

Net: industry intent is half-encoded (hierarchy exists, unwalked), resource/pricing intent is never persisted, the correct seeder is orphaned, and the wrong seeder fails silently. The chain is severed before the catalog is ever born — which is why every downstream hop (catalog→template→contract) is also empty.

### 3.2 The chain as it actually exists

Legend: `══>` real FK, populated · `--->` FK exists but unpopulated / soft link (JSONB, text-id, name) · `✗` nothing.

```
                         WORLD KNOWLEDGE (global, admin-built)
m_catalog_industries (parent_id self-ref: hierarchy EXISTS, code never walks it)
        ══> m_catalog_resource_templates.industry_id  (+ junction m_catalog_resource_template_industries)
                 ══> m_equipment_variants / m_equipment_spare_parts / m_equipment_checkpoints   [real FKs, seeded for 2–3 of 240]
                          ══> m_service_cycles (checkpoint_id FK; catalog_name/price_median: 8/260 rows)
                          ══> m_checkpoint_values / *_variant_map junctions                      [healthy]

                          │
   ✗ ORPHANED PIPELINE:   │   ktCatBlockMapperService → bulkSeed → edge /cat-blocks/bulk   (0 callers)
   ✗ WIRED PIPELINE:      │   seedTenantOnIndustryConfirmed: segment-id mismatch → 0 rows ever
                          ▼
                         COMMERCIAL KNOWLEDGE (per tenant)
m_cat_blocks   resource_template_id ---> (FK defined, 0/45 populated)
               knowledge_tree_ref   ---> (JSONB duplicate of same fact, 2/45, junk rows)
               kt_checkpoint_ids    ---> (uuid[] no FK, 0/45)
        ---> t_cat_templates.blocks  (JSONB array [{block_id, config.price, evidenceRequired}] — no FK)
        ✗    t_catalog_items (0 rows, superseded), t_catalog_* (parallel, unused)

                          │
   ✗  template_id: NULL on 100% of contracts; path='scratch' on 100%
   ✗  source_block_id: NULL on 100% of t_contract_blocks (source_type='flyby'); no FK even when set
                          ▼
                         COMMITMENT KNOWLEDGE (per counterparty)
t_contracts ══> t_contract_blocks (contract_id FK)        [frequency/scope: ONLY in block_name text]
            ══> t_contract_events (contract_id FK)        [block_id: TEXT + block_name copy ---> blocks]
            ══> t_invoices ══> t_invoice_receipts          [solid; block_ids JSONB bag on invoice --->]
            ══> t_contract_assets ══> t_client_asset_registry [solid FKs; 0 rows in practice]
            ══> t_service_tickets (asset_id, contract_id) ══> t_service_ticket_events ══> events
            ══> t_service_evidence                         [solid FKs; 0 rows in practice]
            ✗   SLA terms, renewal entity, RFQ responses/award — no tables
```

### 3.3 Hop verdict table

| Hop | Mechanism today | Bucket | Agent can traverse? |
|---|---|---|---|
| Industry segment → parent industry | `m_catalog_industries.parent_id` (data ✓, code ✗) | L2 | **with semantic layer** (a view that walks the hierarchy) |
| Industry → resource templates | `industry_id` varchar + junction table | L1 | **yes** |
| Resource template → variants/parts/checkpoints/cycles | real FKs | L1 | **yes** (where seeded: 2–3/240) |
| Cycles/parts → sellable service definition | `service_name`/`catalog_name` strings, 8–92 rows, grouping rule in orphaned code | L2/L3 | **no** (complete for 1 equipment type) |
| KT → catalog block | `resource_template_id` FK (empty) ∥ `knowledge_tree_ref` JSONB ∥ `kt_checkpoint_ids` (empty) | L3 (in data) | **no** |
| Catalog block → template | `t_cat_templates.blocks` JSONB | L2 | **with semantic layer** (lateral-join view) — fragile |
| Template → contract | `t_contracts.template_id` (always NULL) | L3 (in data) | **no** |
| Catalog block → contract block | `source_block_id` (always NULL, no FK) | L3 (in data) | **no** |
| Contract block → events | `block_id` TEXT + name copy | L2 | **with semantic layer** — fragile |
| Contract → invoices/receipts/payments | real FKs + stored amounts | L1 | **yes** |
| Contract/asset → tickets/evidence | real FKs | L1 (D0) | **yes**, once data exists |
| Anything → SLA / renewal / RFQ-award | — | L3 | **no** |

---

## 4. Defect List

### 4.1 L2 → Semantic-layer backlog (meaning exists, must be surfaced)

**Context views to build** (each tenant-scoped, agent-consumable, one concept per view):

| View | Must expose | Recovers |
|---|---|---|
| `vw_due_commitments` | event id, contract ref, counterparty, block_name, event_type, scheduled_date, **computed `effective_status`** (`overdue` when `scheduled_date < now() AND status='scheduled'`), days_late, assigned_to | A1 + A2 — makes "overdue" a queryable fact with a documented definition instead of seven private RPC re-implementations |
| `vw_money_position` | contract id, invoiced, received (from receipts), balance, due_date, days_past_due, **computed effective invoice status incl. `overdue`**, last_receipt_at | A3 — one canonical money answer |
| `vw_contract_full` | contract core + blocks (with parsed `custom_fields`) + evidence policy *resolved* (join `evidence_selected_forms` ids → `m_form_templates.name`) + dates with **`prolongation_date` and `grace_period` semantics documented in column comments on the view** | A4/A5 |
| `vw_tenant_identity` | tenant, business_name, persona (decoded from `business_type_id` — after L3 fix below), primary + served industries **with parent-industry resolution**, catalog summary, active counterparties | A10, B0.2 |
| `vw_kt_service_definitions` | resource_template, service grouping (`catalog_name`/`service_name`), checkpoints per service, frequency, price_min/median/max, currency, geo | B1.1 — turns the mapper's private grouping rule into queryable data |
| `vw_kt_to_catalog_lineage` | KT node → catalog block → template (lateral over `t_cat_templates.blocks`) → contract block → contract, with a `link_quality` column (`fk` / `jsonb` / `name_match` / `none`) | B2.1–B2.3 — and an honest dashboard of how broken lineage still is |
| `vw_asset_service_history` | asset → contracts (via `t_contract_assets`) → tickets → evidence, with canonical-registry rule baked in (`t_client_asset_registry`, not `t_equipment`) | A7 |
| `vw_renewal_horizon` | active contracts, end/prolongation dates, days_to_expiry, completion stats (with an explicit `data_quality` flag while completion facts are absent) | A8 |

**Ontology docs to write** (one per domain, plain language: entities, states, *legal transitions*, invariants, who moves each state):
1. Contracts & events (incl. the `flyby` concept, `computed_events` lifecycle, `is_live` test/live semantics, version/optimistic-locking rules)
2. Money (invoice statuses incl. the never-set `overdue`, receipts vs payment_requests vs payment_events, write-off path)
3. Service execution (events vs tickets vs evidence; TaskID vs TKT two-ID system — currently documented only in `ClaudeDocumentation/contractUI/eventsplan.md`)
4. Knowledge Tree (layers, variants/checkpoint/cycle semantics, overlays, `source` enum, test→live promotion)
5. Catalog Studio (block types, pricing modes, `variant_pricing`/`resource_pricing` JSONB shapes, template `blocks` JSONB shape)
6. Tenancy & identity (persona, industry hierarchy, `m_` vs `t_` reality incl. the `m_cat_blocks` tenant-scoping exception)

**COMMENT backlog:** 229 of 2,395 columns (9.6%) and 64 of 153 tables have comments today. Priority columns surfaced by this probe: `t_contracts.prolongation_*`, `grace_period_*`, `path`, `computed_events`, `evidence_*`; `t_contract_blocks.source_type/source_block_id/custom_fields`; `t_contract_events.block_id/is_live/task_id`; `m_cat_blocks.knowledge_tree_ref/kt_checkpoint_ids/variant_pricing/is_seed`; `t_cat_templates.blocks/is_system`; `t_tenant_profiles.business_type_id`; every status column's value set.

### 4.2 L3 → Schema-change backlog
*(Founder confirmed: **not in production** — 147 tenants are pilots/tests, 20 contracts, 13 blocks. Migration cost ≈ zero TODAY for every item below; each is a single migration + a data backfill that touches at most dozens of rows. None of these should be deferred on migration-pain grounds.)*

| # | Gap | Minimal DDL shape | Migration cost now |
|---|---|---|---|
| S1 | Contract blocks carry no promise semantics (frequency in name text) | Add to `t_contract_blocks`: `service_frequency_value int`, `service_frequency_unit text`, `visit_count int`, `scope jsonb` (checkpoint ids) — populated by wizard *and* required by `create_contract_transaction` | ~0 (13 rows to backfill, all flyby anyway) |
| S2 | No catalog→contract lineage enforcement | FK `t_contract_blocks.source_block_id → m_cat_blocks(id)` (nullable, `ON DELETE SET NULL`); CHECK that `source_type='catalog' ⇒ source_block_id IS NOT NULL` | ~0 (all NULL today) |
| S3 | No template→contract lineage | FK `t_contracts.template_id → t_cat_templates(id)` | ~0 (all NULL) |
| S4 | Template→block JSONB bag | Junction `t_cat_template_blocks(template_id FK, block_id FK, position, price_override numeric, evidence_config jsonb)`; keep JSONB during transition, view over both | ~0 (4 templates, ≤2 blocks each) |
| S5 | Events→blocks soft link | Convert `t_contract_events.block_id` text → uuid FK to `t_contract_blocks(id)` (it is the *contract* block, not catalog block — name it `contract_block_id`) | small backfill (58 events; ids are matchable) |
| S6 | Server cannot compute the calendar | Not pure DDL: RPC `compute_contract_events(contract_id)` deriving from S1 fields + `start_date/duration`; make `create_contract_transaction` call it when `computed_events` is absent | n/a (code), unblocked by S1 |
| S7 | Persona not persisted | `t_tenant_profiles.persona text CHECK (persona IN ('seller','buyer','both'))` (or properly FK the existing LOV); backfill from onboarding; **stop** writing strings into `business_type_id` | ~0 (column is NULL everywhere) |
| S8 | Resource-pick/pricing intent never lands | `t_tenant_onboarding.step_data` is already JSONB — *use it* (code fix), plus `t_tenant_selected_resources(tenant_id, resource_template_id FK, source)` for the durable fact | ~0 |
| S9 | SLA unmodeled | `t_sla_terms(id, tenant_id, contract_id FK, block_id FK NULL, metric CHECK (response_hours/resolution_hours/visit_window_days/uptime_pct), threshold numeric, penalty jsonb)` + `t_sla_breaches(term_id FK, event_id FK, detected_at, magnitude, status)` | ~0 (greenfield) |
| S10 | RFQ responses/award unmodeled | `t_rfq_responses(rfq_contract_id FK, vendor_contact_id FK, status, response jsonb, submitted_at)` + `t_rfq_evaluations(response_id FK, criteria jsonb, score, decided_by)` | ~0 (greenfield) |
| S11 | Price provenance/history | `t_price_history(entity_type, entity_id, old_price, new_price, source CHECK ('kt_median','manual','agent'), changed_by, changed_at)` or extend the existing audit pattern | ~0 |
| S12 | Spare-part lineage on blocks | `m_cat_block_kt_refs(block_id FK, ref_type CHECK ('cycle','spare_part','checkpoint'), ref_id uuid, FK-per-type via partial constraints or three junctions)` — replaces both `knowledge_tree_ref` JSONB and `kt_checkpoint_ids[]` | ~0 (2 junk rows) |
| S13 | Onboarding step-model mismatch | Update step registry so `t_tenant_onboarding.total_steps`/step ids match the live 13-step flow (data/seed fix + code constant) | ~0 |

### 4.3 D0 → Data-depth gaps (re-probe blocked on data, not schema)

| Probe blocked | What a seed script must create |
|---|---|
| A7, A8 (performance), A9 (even after S9) | For 2–3 tenants: contracts with `t_contract_assets` links; 10–20 events transitioned through `in_progress→completed` with realistic dates; tickets grouping events; evidence rows (incl. one `rejected`); 1–2 SLA terms with one breach |
| A8 horizon | ≥2 active contracts with `end_date` inside 60 days |
| B0.3 (positive case) | One tenant onboarded end-to-end through the *fixed* seed path, segment-level industry, verifying `is_seed` blocks with `resource_template_id` set |
| B1.x (beyond STP/WTP) | KT Phase-1 fields (`catalog_name`, `service_name`, prices) generated for HVAC + 3–5 more verticals via the existing `kt-pricing-generator`/`kt-service-names-generator` skills |
| General | Only 4/147 tenants have contracts; events all `is_live` mixed with test — seed must be explicit about `is_live` |

---

## 5. Kernel Contract Candidate

What the future agent shell may depend on — **today** (passed the probe) and **after fixes** (conditional). Everything outside this list is presumed legacy until it re-earns trust.

**Trustworthy today (L1, FK-constrained, transactional):**
- Tables: `t_contracts` (core columns + dates), `t_contract_events` (as calendar), `t_invoices`, `t_invoice_receipts`, `t_contract_history`, `t_contract_event_audit`, `t_audit_log`, `t_service_tickets`/`t_service_ticket_events`/`t_service_evidence` (structure), `t_client_asset_registry` + `t_contract_assets`, `t_contacts` + channels/addresses, `t_tenant_served_industries`, `m_catalog_industries` (incl. hierarchy), `m_catalog_resource_templates` + junction, `m_equipment_*`, `m_service_cycles`, `m_checkpoint_*`, `m_context_overlays`, `t_idempotency_keys`, `n_jtd` family
- RPCs (read source verified, transactional, idempotency-aware): `create_contract_transaction`, `process_contract_events_from_computed`, `update_contract_event`, `create_service_ticket` family, `generate_contract_invoices`, `record_invoice_payment`, `respond_to_contract`, `promote_catalog_test_to_live`, `get_contract_by_id`, `get_contracts_list`, JTD queue RPCs
- Code: `ktCatBlockMapperService` + `catBlocksService.bulkSeed` + edge `/cat-blocks/bulk` — correct logic, needs a caller

**Admitted to the kernel only after the named fix:**
- `vw_*` views of §4.1 (after creation) — the agent's primary read surface
- `m_cat_blocks` (after S2/S12 lineage + seed fix), `t_cat_templates` (after S4)
- `t_contract_blocks` as promise-record (after S1)
- Event calendar generation (after S6)
- Persona/identity (after S7/S8)
- SLA & RFQ surfaces (after S9/S10)

**Explicitly excluded (legacy until proven otherwise):** `t_catalog_items` + `t_catalog_*` parallel catalog (0 rows), `t_equipment` (superseded by registry), `c_*`/`m_category_*`/`t_category_*` triplicate LOV systems (kernel rule: the seed's `cat_block_type` lookup is the only blessed use), `knowledge_tree_ref`/`kt_checkpoint_ids`/`evidence_selected_forms`/`block_ids`/`selected_tax_rate_ids` JSONB id-bags (replaced by S2/S4/S12 or resolved inside views), `leads*`, `n_customers`/`n_deliveries`, `t_contacts_classification_backup_20260128`.

---

## 6. Re-probe Criteria

Progress is measured by these exact flips, re-run with the same SQL discipline:

| Probe | Today | Must become | Flips when |
|---|---|---|---|
| A2 | L2 (rung 3) | **L1** | `vw_due_commitments.effective_status` exists (or the scanner makes stored status true) |
| A4 | L2+L3 | **L1** | S1 + `vw_contract_full`: an agent recites services, frequency, scope, evidence duty from one query |
| A5 | L2 (rung 3) | **L1** | column COMMENTs on `prolongation_*`/`grace_period_*` + ontology doc 1 |
| A6 | L2+L3 | **L1/L2** | S2+S11: price → catalog block → KT median provenance queryable |
| A9 | L3 | **L1** | S9 + seeded SLA terms: "did we meet SLA on last 10 events" returns a number |
| A10 | L2+L3 | **L1** | S7/S8: persona + selected resources stored; `vw_tenant_identity` answers in one row |
| B0.2/B0.3 | L3 outcome | **L1** | fixed seed (hierarchy walk + `bulkSeed` wired): fresh tenant in a leaf segment gets `is_seed` blocks with `resource_template_id` set and `base_price` from `price_median` |
| B1.1 | L2+D0 | **L1** | KT Phase-1 fields generated for ≥5 verticals; `vw_kt_service_definitions` returns sellable services for HVAC |
| B1.3 | L3 | **L1** | S6: contract created via bare RPC (no UI) has a full event calendar |
| B2.1 | L3 | **L1** | S2/S3/S4/S5: `vw_kt_to_catalog_lineage` traces a real contract block to a KT node with `link_quality='fk'` at every hop |
| B2.2/B2.3 | L3 | **L2 → L1** | S12 + lineage populated: impact query returns affected tenants/contracts |

**The intersection exam is passed when:** one tenant, onboarded through the fixed flow in a leaf-segment industry, gets a priced KT-derived catalog; a contract drafted from that catalog via RPC alone carries lineage and a server-computed calendar; and the probe can walk from one of its line items back to the `m_service_cycles` row that justified the price — every hop on FKs.

---

*All findings derived from read-only inspection on 2026-06-11: live `pg_catalog`/`information_schema` queries, table data SELECTs, RPC source via `pg_proc.prosrc`, and code at submodule HEADs (`contractnest-ui` 6555c3d, `contractnest-api` 31b0b1d, `contractnest-edge` c3dbf9e). No writes were performed.*

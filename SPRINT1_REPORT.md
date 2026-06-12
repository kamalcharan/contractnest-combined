# SPRINT 1 REPORT — Intersection Repair: KT → Onboarding → Catalog → Contract

> Date: 2026-06-11 · Branch: `claude/lucid-hawking-692rkt` · Files in `MANUAL_COPY_FILES/sprint1-intersection-repair/`
> Probe basis: `ClaudeDocumentation/transformation/legibilityprobe.md` (§3 B0.5, §6 re-probe criteria)

---

## 0. Where the codebase actually was (important context)

The submodule HEADs are **newer than the commits the probe inspected**. Two of the three
B0.5 break-points had been partially repaired between the probe and this sprint:

- `seedTenantTemplatesService` already existed and already wired
  `ktCatBlockMapperService → catBlocksService.bulkSeed → edge /cat-blocks/bulk`
  for both environments (the orphaned pipeline had gained its caller).
- `Screen8APricingStep` / `Screen8BEquipmentStep` had already dropped the elevator
  mock and fetch real data.

**But the database proved the chain was still severed in practice**: at sprint start,
live counts were `is_seed=true` blocks = **0**, `resource_template_id` populated =
**0/45**, `persona` column = absent, selected-resources table = absent,
`t_tenant_onboarding` still on the 6-step model. This sprint closed the remaining
gaps and fixed several bugs that would have made the "repaired" flow fail on first
contact (details below).

## 1. Tasks completed (each names its probe finding)

### Task 0 — KT content for the demo vertical (B1.1)
- **No LLM generation was needed.** The mapper was already relaxed (groups by
  checkpoint `service_name`; `catalog_name`/`price_median` optional). Verified
  against live data: **HVAC System = 29 service groups (77 named checkpoints) +
  39 spare parts; STP/WTP = 6 + 20.** Both seed. The probe's B1.1 blocker
  (`catalog_name IS NULL` on HVAC) no longer gates the mapper.
- The `/generate-service-names` + `/generate-pricing` endpoints remain available
  to enrich more verticals (Sprint 2 content task).

### Task 1 — Seeder wiring (B0.5 point 1)
- The KT pipeline was already wired via `POST /api/seeds/tenant/templates`; this
  sprint made it **intent-driven and honest** (see Tasks 2–3) and added
  `industryIds` + `userId` plumbing.
- **1.3 Legacy seeder decision: DELETED.** `seedTenantOnIndustryConfirmedService`
  + route `POST /api/seeds/tenant/industry-confirmed` removed (zero UI callers
  remained; the name-only/price-less seeder was exactly the wrong-seeder failure
  the probe documented; code remains in git history).
- 1.4: blocks land `is_seed=true`, `resource_template_id` set, `base_price` from
  `price_median`, correct block type, seeded into **both** `is_live` environments
  (matching Catalog Studio's `x-environment` convention).
- Fake-task honesty (1.2): the 600 ms "Loading knowledge tree…" `setTimeout` is
  gone; the industry task reflects reality and the seed task states are driven by
  the actual seed response, including failure and no-coverage states.

### Task 2 — Hierarchy walk (B0.5 point 2)
- **One shared resolution function**: `resolve_industry_resource_templates(text[])`
  (migration 20260611000004) — recursive CTE over `m_catalog_industries.parent_id`
  (full ancestor chain, cycle-guarded) ∪ junction (`m_catalog_resource_template_industries`)
  ∪ universal templates. Chosen as a SQL RPC (not service-layer) so the edge browse
  path, the API seeder, tests, and future agents all call the same definition —
  this is the embryo of `vw_kt_service_definitions`.
- **Silent success killed**: coverage = ≥1 `tagged`/`junction` match (universal
  templates apply to everyone and deliberately do NOT count). Zero coverage ⇒
  seed responds `status:'no_coverage'` (HTTP 200, named industries), the
  VaniWorking UI renders an amber "no coverage" state (no green checkmarks), the
  event is logged server-side, and the outcome is persisted into
  `t_tenant_onboarding.step_data['vani-working'].no_coverage`. A covered industry
  producing zero blocks with no skip/error explanation returns `status:'error'`.
- Templates requested outside the resolved set are dropped loudly
  (`droppedTemplateIds` in the response + server warn log).
- Verified live: `dental_clinics` (leaf) resolves 37 templates (22 equipment /
  5 facility) through the healthcare walk; an unknown industry resolves 0
  non-universal templates.

### Task 3 — Persist intent (S7, S8, S13, A10)
- **S7** (migration 20260611000001): `t_tenant_profiles.persona` with
  CHECK (seller|buyer|both) + COMMENT; backfill from legacy values
  (`seller/buyer/both/service_provider/merchant` in either `business_type_id` or
  `profile_type`). `PersonaSelectionStep` now **dual-writes** `persona` +
  `business_type_id`: the settings page and AuthContext perspective init consume
  `business_type_id`, so it keeps being written; `persona` is the constrained,
  canonical column for agent reads (see decision log #2).
- **S8** (migration 20260611000002): `t_tenant_selected_resources`
  (tenant FK, template FK, **purpose** sell|own, source, UNIQUE(tenant, template,
  purpose), RLS matching the `t_tenant_served_industries` pattern).
  *Founder-approved deviation*: `purpose` column added so a "both" tenant can pick
  the same template to sell AND to own. `ResourcePickStep` persists picks on
  continue; the seeder **reads this table** (intersected with Task-2 resolution)
  — and also upserts the request payload first as a race-safe backstop.
- **Buyer redesign (founder direction)**: the consent-blind placeholder-hierarchy
  RPC (`seed_onboarding_facility_nodes`) is **superseded** by
  `seed_onboarding_registry_assets` (migration 20260611000005): one self-owned
  registry entry per consented template — `resource_type_id='equipment'` rows
  surface in `/equipment-registry`, `'asset'` rows in `/facility-registry`,
  `is_live=false` until Screen8B confirmation promotes them. Old RPC left in
  place but no longer called.
- **3.3 Pricing/equipment honesty** — two real bugs fixed in `Screen8APricingStep`:
  1. it fetched blocks with `?tags=<industryIds>` — seeded blocks have empty tags,
     so the screen would have shown **nothing**; now fetches `?is_seed=true`
     (new `is_seed` passthrough added API-side; edge already supported it).
  2. price edits PATCHed `{config:{base_price}}`, which would have **clobbered the
     mapper-built config JSONB without changing the price column**; now PATCHes
     top-level `{base_price, currency}` — the same fields Catalog Studio writes.
  `Screen8BEquipmentStep` now groups by `template_id` (seeded rows carry it) and
  records confirmation.
- **S13** (migration 20260611000003 + edge `onboarding/index.ts`): the edge now
  registers the 13-step VaNi model (`VANI_STEPS`), `total_steps=13`,
  `onboarding_type='vani'`; step-complete upserts step rows (so steps unknown to
  the old 6-row registry still record) and **merges every step payload into
  `step_data`**. The old completion rule (finished after user-profile +
  business-profile — i.e. a 13-step flow "done" at step 2) now applies only to
  legacy 6-step records; VaNi flows finish on the `done` step. UI steps
  persona-selection, resource-pick, vani-working, pricing-review,
  equipment-confirm now post their payloads via `completeVaniStep()` —
  persona, industry, resource ids, seed outcome, and pricing acceptance are
  reconstructable from `step_data` + the durable tables.

### Task 4 — Catalog Studio sync (outcome 2)
- **4.3 real bug fixed**: the edge `cat-blocks` update/delete guards FORBADE a
  tenant from editing **their own seeded blocks** (`existing.is_seed ⇒ 403`).
  Had we seeded without this fix, every pricing-review edit and every Studio edit
  of a seeded block would have failed. Guards now: tenant-owned blocks (seeded or
  not) are first-class for their tenant; only global (tenant_id NULL) blocks stay
  admin-only.
- **4.2 lineage**: blocks list (grid + list views) shows a read-only
  "Seeded from <equipment>" badge via `is_seed` + `config.selectedResources` /
  `resource_template_id` (adapter exposes them in `meta`). Additive only.
- 4.1: the mapper builds the full Catalog-Studio-shaped `config`
  (pricingRecords, selectedVariants, variantPricingRecords, selectedResources),
  so list/detail/edit render seeded blocks like hand-made ones.

### Task 5 — Contract-flow sync (outcome 3)
- Verified end-to-end by code trace + RPC source (`pg_proc`): the wizard already
  sets `source_type: isValidUUID(block.id) ? 'catalog' : 'flyby'` and
  `source_block_id` (`ContractWizard/index.tsx:246-247`), the seeded block's
  `base_price` flows into the line item default
  (`ServiceBlocksStep.tsx:239-263`), the contracts edge passes blocks through
  untouched, and `create_contract_transaction` inserts
  `source_type`/`source_block_id` into `t_contract_blocks`.
  **The probe's 100%-flyby finding was a consequence of empty catalogs, not a
  wizard bug — no payload fix was needed.** Flyby path untouched (5.3).

### Task 6 — Tests & proof
- `contractnest-api/src/__tests__/sprint1.integration.test.mjs` (`node --test`,
  zero new deps): 6.1 resolution (leaf→parent; uncovered→no coverage),
  6.2 registry-seed idempotency (run twice ⇒ no duplicates), 6.3 persistence
  (S8 upsert uniqueness + dual-purpose; S7 column). Tests self-skip without DB env.
- All three assertions were **also executed against the live DB during this
  sprint and passed** (see §3).
- CI: minimal `ci.yml` per touched submodule (api: typecheck + tests; ui: build;
  edge: deno check of touched functions).
- E2E proof: `scripts/sprint1_proof.sql` — SQL assertions for every Acceptance
  Run item (intent, lineage, price traceability, contract lineage, negative path,
  §6 probe re-runs).

## 2. Migrations applied to the live DB (also shipped as files)

| Migration | Purpose |
|---|---|
| `s7_tenant_persona` | persona column + CHECK + COMMENTs + backfill |
| `s8_tenant_selected_resources` | intent table + purpose + RLS |
| `s13_onboarding_step_model` | COMMENTs + open rows 6→13 steps |
| `resolve_industry_resource_templates` | canonical hierarchy resolution RPC |
| `seed_onboarding_registry_assets` | buyer template-driven registry seed RPC + unique partial index |

Files mirror these in `contractnest-edge/supabase/migrations/transformation/`.

## 3. Probe flips (§6 criteria) — current state

| Probe | Before | Now | Flips fully when |
|---|---|---|---|
| B0.2 (what should be seeded) | L3 (R unrecoverable) | **Machinery L1**: resolution RPC + S8 table live and verified (`dental_clinics` → 37 templates; unknown industry → 0 coverage) | first real tenant runs the flow |
| B0.3 (actual vs intended seed) | L3: `is_seed=0` platform-wide | DB still 0 (no tenant has onboarded since) — **all three stacked causes removed**; idempotent seed proven by SQL run (run-twice ⇒ 0 new, 1 row) | acceptance run (§6 SQL in `scripts/sprint1_proof.sql` §7) |
| A10 (persona) | L3 in practice | persona column live, backfilled, written by UI, CHECK-verified | next onboarding |
| B0.1/S13 (step model) | DB said 6 steps, `step_data={}` | 13-step registry live; step payloads accumulate | next onboarding |

Live SQL evidence captured during the sprint:
- `resolve_industry_resource_templates(ARRAY['dental_clinics'])` → 37 rows (22 equipment, 5 facility, rest universal); unknown industry → 0 tagged/junction.
- `seed_onboarding_registry_assets` run twice for one (tenant, template) → second run `assetsSeeded=0, skipped=1`, exactly 1 row, cleaned up.
- S8 double-upsert ⇒ 1 row; same template with `purpose='own'` coexists (the "both" case).
- `persona='invalid_value'` rejected by CHECK constraint.

## 4. Decisions log

1. **Legacy seeder (1.3): deleted**, not demoted — zero callers, and "documented
   fallback" would have kept a known-bad path alive.
2. **business_type_id (3.1): DUAL-WRITE** (revised after founder review). The
   settings page (/settings/business-profile) and AuthContext perspective init
   consume business_type_id (buyer|seller|both LOV), so the persona step keeps
   writing it alongside the new constrained persona column. persona is the
   canonical agent-readable field; business_type_id/profile_type stay in sync.
3. **S8 purpose column** (founder-approved): UNIQUE(tenant, template, purpose) so
   "both" tenants can hold dual intent for one template.
4. **'both' persona purposes**: equipment picks → `sell` + `own`; facility picks →
   `own` (one ResourcePick screen, dual-intent recorded server-side).
5. **no_coverage = HTTP 200 + status field** (not 4xx/5xx): honest but
   non-exceptional, so the UI renders it without tripping generic error handling.
6. **Universal templates don't count as coverage** — otherwise no industry could
   ever be `no_coverage` (17 universal templates match everything).
7. **Edge deploys left to the founder** (drift risk: deployed functions may be
   newer than repo HEAD) — deploy commands included in the hand-off workflow.

## 5. Scope-boundary temptations resisted (Sprint 2 candidates)

- S1 promise fields on `t_contract_blocks` and S6 server-side calendar — untouched.
- S2 FK on `source_block_id` (still unconstrained when set) — schema change not in
  the allowed list this sprint.
- Contract wizard fetches ALL blocks with no `is_active`/`is_live` query filter
  (client-side filtering only) — works, but should be tightened (Sprint 2).
- `kt_service_cycle_rows_for_template` RPC referenced by the mapper does not exist
  in the DB (mapper silently uses its fallback path) — fallback is correct, but the
  RPC should be created or the dead call removed.
- Two pre-existing broken TS files in contractnest-ui
  (`src/contexts/OnboardingContext.ts`, `src/services/serviceURLs.addition.ts`)
  fail `tsc --noEmit` (23 errors, all pre-existing; Vite build passes because they
  are never imported). Should be repaired or deleted.
- RFQ response/award model (S10), SLA (S9), KT lineage on registry assets — out.

## 6. Open risks

1. **Edge deploy required before testing** — cat-blocks / onboarding /
   tenant-profile changes must be deployed or pricing edits will 403, persona
   won't persist, and step_data stays empty (commands in the workflow below).
2. The acceptance run itself (fresh tenant through the UI) is the founder's step;
   B0.3's platform-wide counter flips only after it.
3. `useOnboarding`'s legacy 6-step mapping still exists for the old flow; the VaNi
   steps bypass it via `completeVaniStep`. Consolidation deferred.
4. Healthcare equipment (e.g. Ventilator) has KT structure but no named
   checkpoints ⇒ a healthcare seller currently gets spare-part blocks only.
   Content task: run the existing generation endpoints for healthcare verticals.

## 7. Production checklist (per CLAUDE.md)

- Transaction management: per-KT atomic inserts (edge bulk), RPCs transactional,
  optimistic locking preserved on block updates.
- Race conditions: upsert-on-unique for selections; unique partial indexes for both
  seed targets (`ux_cat_blocks_seed_template_env_name`, `ux_car_onboarding_seed_template`);
  ON CONFLICT DO NOTHING in the registry RPC; double-submit of the seed endpoint
  re-runs only missing legs.
- Idempotency: seed legs independently idempotent and proven by live SQL run;
  edge bulk honors the existing per-environment already-seeded check.
- Error handling: no_coverage / partial / error statuses, per-leg errors surfaced,
  `t_seed_logs` observability, resolution failure is loud.
- Toasts/loaders: existing `vaniToast` + existing loaders/saving states reused;
  no new components invented.


---

## 8. ACCEPTANCE-RUN RESULTS (live debugging session, 2026-06-11 — post-handoff)

The founder's live run surfaced six additional defects (four pre-existing, two
mine). All fixed, pushed, and verified. **The §6 probe flip is now REAL:**

### §6 re-run — B0.2/B0.3 flipped to L1
| Check | Probe baseline | Now |
|---|---|---|
| `is_seed=true` blocks platform-wide | **0** | **182** |
| `resource_template_id` populated | **0**/45 | **182**/227 |
| Price lineage | none | `base_price` joins exactly to `m_service_cycles.price_median` via checkpoint `service_name` (verified: Refrigerant & Electrical Performance Check ₹1400=1400, Compressor Performance Check ₹1200=1200, …) |

Tenant `bcc93584` (seller, dental_clinics/physiotherapy/general_practice,
picks HVAC + Operation Theatre): persona persisted (S7 ✓), 2 sell-purpose rows
in `t_tenant_selected_resources` (S8 ✓), `total_steps=13` with persona/
resource-pick/vani-working payloads in `step_data` (S13 ✓), 68 HVAC blocks
(58 KT-priced, ₹120–₹200,000) + 23 Operation Theatre blocks (unpriced — KT has
no OT pricing yet) seeded into BOTH environments (B0.2/B0.3 ✓).

### Defects found & fixed during the run
| # | Defect | Origin | Fix |
|---|---|---|---|
| F1 | API step-id whitelist (`onboardingTypes.ts`) only knew 6 legacy steps → every VaNi step/complete 400'd | pre-existing | VaNi ids added (S13 API side) |
| F2 | Blocks-list validator capped `limit` at 100 → pricing fetch 400'd | pre-existing | cap → 500, `is_seed` declared |
| F3 | `complete-step` 500: stale `allRequiredComplete` reference after rename (threw AFTER persisting) | mine | uses `flowComplete` |
| F4 | **API holds only the ANON key (by design); KT master tables are RLS-readable only by authenticated/service_role → the mapper has ALWAYS read an empty knowledge tree; S8 writes RLS-denied** | pre-existing (architectural) | mapper/intent/seed services forward the caller's JWT → run as `authenticated`; RLS genuinely enforced |
| F5 | Missing UPDATE policy on `t_tenant_selected_resources` → idempotent retry (upsert conflict path) denied | mine | policy added |
| F6 | **`cat-blocks/bulk` requires HMAC signing (`x-timestamp`+`x-internal-signature`); the seeder (incl. its pre-sprint version) posted raw axios → every bulk seed ever made 403'd** | pre-existing | `callBulkSeed` signs identically to `catBlocksService.makeRequest` |

F4 + F6 are the answer to the probe's deepest question: the platform never
seeded a block because the seed pipeline had two independent, silent,
infrastructure-level failures — invisible without `t_seed_logs` + edge logs.

## 9. PRICING-REVIEW SCREEN — design findings (OPEN, for founder discussion)

The seed now works; `Screen8APricingStep` is the remaining elevator-era design
fed real data it was never built for:

1. **Market-range bar is hardcoded** ("Illustrative"). KT has `price_min/median/max`
   but the mapper carries only the median into blocks — min/max never arrive.
2. **3-tier assumption**: rows render TIER LABELS ("Basic AMC") instead of real
   block names; HVAC is 29 distinct services + 39 spares, not 3 tiers.
3. **Anchor×multiplier OVERWRITES KT medians**: Confirm patches anchor-derived
   prices over all 58 seeded KT prices — destroys the pricing intelligence.
   Should invert: KT median is the default; anchor only bulk-fills unpriced
   blocks (10 HVAC + 23 OT).
4. **Both environments returned**: edge `handleGetBlocks` never filters
   `is_live` → every screen sees test+live duplicates ("100" = pagination cap).
   One-line edge fix + redeploy; also affects Catalog Studio.
5. **Confirm PATCHes all blocks** even unchanged — should write deltas only.

Open design questions: which environment does pricing-review edit (live only
vs both); spares in the same review or deferred to Catalog Studio; bulk-fill
vs flag-for-later for unpriced equipment (Operation Theatre).


## 10. Founder-review fixes implemented (2026-06-11, round 2)

All four observations + the five §9 findings addressed:
1. **Spares** — were seeded (62/91 live blocks are Spare Parts type); now rendered
   as their own per-unit section in pricing review; Studio category verification
   remains a manual check.
2. **Resource classification** — mapper no longer contradicts itself:
   `config.pricingMode='variant_based'` for services with KT variants
   (matches the top-level pricing_mode_id), `'independent'` for spares;
   equipment/facility linkage was already present via selectedResources +
   resource_template_id.
3. **Service cycles** — mapper now emits `config.serviceCycles
   {enabled, days, gracePeriod}` from `m_service_cycles.frequency_value/unit`
   (+`alert_overdue_days`) for day-based cadences; this shape is consumed by
   Catalog Studio's BlockEditorPanel AND the contract wizard, so KT cadence now
   flows into contract service cycles. visits/hours cadences are usage-based and
   intentionally skipped.
4. **Tax** — bulk-seed edge reads `t_tax_settings` (display_mode → tax_inclusion
   stamped into pricing records; default_tax_rate_id → t_tax_rates.rate, falling
   back to the tenant's is_default rate, then 18%/exclusive). OPEN: whether tax
   setup should precede seeding in flow order, or seeded blocks get re-stamped
   when tax settings are first saved.
5. **Pricing screen rebuilt KT-first** (§9 items 1–3,5): KT medians are the
   defaults, real names, market range from kt_price_min/max (mapper now carries
   them), bulk-fill only for unpriced items, Confirm PATCHes deltas only.
6. **Environment duplicates** (§9 item 4): edge blocks list now filters
   `is_live` by the x-environment header. ⚠️ requires cat-blocks redeploy.

NOTE: serviceCycles/kt_price_min/max/pricingMode/tax improvements apply to NEW
seeds. To refresh an existing test tenant: delete its seeded blocks
(`DELETE FROM m_cat_blocks WHERE tenant_id='…' AND is_seed`) and re-run the
working step — idempotency makes this clean.


## 11. Settings → Seed Data (founder request, implemented)

UI-managed seed lifecycle at `/settings/seed-data` (Business Profile group):
- **Overview**: seeded catalog blocks (test/live/in-use-by-contracts), registry
  assets, the persisted resource picks (S8 — the durable intent every reseed
  runs from), and the last 10 `t_seed_logs` entries.
- **Re-seed catalog / registry**: inline-confirmed; calls
  `cleanup_tenant_seed_data` (SECURITY DEFINER — deletes seeded rows but KEEPS
  anything referenced by contracts via source_block_id / t_contract_assets,
  reporting kept counts) then re-runs the idempotent seeder with persona +
  industries read server-side and picks from t_tenant_selected_resources.
  No onboarding replay ever needed.
- New RPCs (migration 20260611000006, applied): `get_tenant_seed_overview`,
  `cleanup_tenant_seed_data`. New API: GET /api/seeds/tenant/seed-overview,
  POST /api/seeds/tenant/reseed {target: catalog|registry|all}.

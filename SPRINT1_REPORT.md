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
  `profile_type`). `PersonaSelectionStep` now writes `persona`;
  **`business_type_id` decision: deprecated for persona use** — column COMMENT
  says so; it is no longer written by the persona step; retained read-only for
  legacy consumers (it was always duplicated into `profile_type` by the edge).
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
2. **business_type_id (3.1): deprecated for persona** via column COMMENT; no new
   writes from the persona step; `profile_type` documented as its legacy duplicate.
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

# POA STATUS / HANDOVER — Smart Profile · Onboarding · ICP (session 2026-07-07)

> Updates `HANDOVER-2026-07-04-TEMPLATES-AND-AGENT.md`. That session's **first task**
> (ICP-aligned smart chips, §5) and most of its backlog (§6) are now built. This doc
> is the current POA state: what's DONE and what's PENDING.
> Delivery discipline unchanged: everything ships as `MANUAL_COPY_FILES/<batch>/` +
> `COPY_INSTRUCTIONS.txt`; the owner runs Phase-2 submodule commits. DB migrations
> owner-applied (project `uwyqhzotluikawcboldr`). UI tsc baseline = 23, API = 0.

---

## 0. Owner's 5-item scope (this session's frame) — status at a glance

| # | Scope item | Status |
|---|---|---|
| ① | Finalise Smart Profile | ✅ DONE |
| ② | Improve onboarding | ✅ DONE (ICP-ranked seeding, background SP build, forms hardening, honest KT dot) |
| ③ | Deploy smart chips (ICP) | ✅ DONE (Phase A diverse + Phase B archetype/neighbour) |
| ④ | Deploy smart nomenclature (ICP) | ✅ DONE (API parse-list shrink); 🔶 wizard NomenclatureStep UI ranking still pending |
| ⑤ | Templates controlled/ranked by profile | ⛔ NOT STARTED — the main remaining feature |

---

## 1. DONE THIS SESSION (with the batch that carries it)

Commits are on the combined-repo branch `claude/handover-templates-agent-qretm1`
(newest first): `d8f7a11 … dd00bd9`. Latest cumulative files noted where a batch
supersedes an earlier one.

### Smart Profile — finalised (①)
- **Unhid** the Settings → Business Profile → Smart Profile card; lives under
  `/settings/business-profile/smart-profile`. `smartprofile-unhide`.
- **No fabricated fallbacks** — removed `generateFallbackDescription` /
  `extractKeywordsFromText`; honest failure + "Continue without AI" manual path.
  `smartprofile-no-fallbacks`.
- Fixed the full **create → enhance/scrape → save → view → clusters** loop
  (5 chained bugs): GET parser shape (`response.data.smartprofile`), save-500
  (added columns), cluster save (dropped `membership_id` NOT NULL), clusters not
  viewing back (invalidate profile query). `smartprofile-view-fix`,
  `smartprofile-view-flow`, `smartprofile-clusters-refresh`.
- DB: `t_tenant_smartprofiles` gained `website_url` / `generation_method`;
  `t_semantic_clusters.membership_id` made nullable (tenant-owned clusters).

### Smart chips — ICP-aligned (③) — the 07-04 §5 first task
- **Phase A**: `buildSuggestions` rewritten — archetype-diverse candidates
  (template/equipment/facility/service/consulting), `icpScore` ranking, one-per-
  archetype diverse selection, **client-name injection removed** (the repeating
  "kamal industries" bug). `icp-smart-chips-phaseA`, `icp-smart-chips-diverse`.
- **Phase B**: cold-start / thin-profile fill — `m_icp_archetypes` (7 seeded
  archetypes) matched by industry/persona/vocabulary + `icp_similar_tenants`
  embedding-neighbour RPC borrow their cluster vocabulary. `icp-chips-phase-b`.
  Migration `001_icp_archetypes_and_neighbours.sql` APPLIED.
- `fetchTenantIcp(ctx)` is the single ICP read (vocabulary + clusters + persona +
  resources + industryIds) powering chips.

### Template-based generation + event viewer (07-04 §1 🔶 items)
- **Faithful template instantiation**: `assembleFromTemplate` carries template
  billing/EMI/grace baseline + per-block cycle + contract-level tax carry-through
  (`selected_tax_rate_ids` applied when per-block tax = 0). `template-generation-faithful`, `finish-line-A`.
- **Event viewer complete**: template read-only "illustrative" mode, persisted
  re-sort, EMI + per-block recurring last-period reconcile, local-day grouping
  (no UTC off-by-one), robust full-blockId event ids. `event-viewer-complete`.
- **Events Schedule button** on the Draft-ready card → opens review on the events
  tab. `events-schedule-shortcut`.
- **Finish-line A** (4 items): unified template serializer (VaNi save-as-template
  hydrates cleanly in wizard), tax carry-through, TZ-correct grouping, per-block
  reconcile. `finish-line-A`.

### Smart nomenclature — ICP-aware (④)
- `contractComposerService`: `relevantNomenclatures(list, icp)` shrinks the VaNi
  intent-parse nomenclature list to the tenant's ICP-relevant groups
  (equipment→equipment_maintenance, asset→facility_property, service→service_delivery,
  flexible_hybrid always, + industry overlap); resolution still matches the FULL
  list so a valid choice is never lost. `smart-nomenclature`.
- 🔶 PENDING: the wizard **NomenclatureStep UI** ICP ranking (rank relevant groups
  to top of the manual picker) — offered, not built.

### Onboarding — improved (②)
- **Piece 2 — ICP-ranked resource seeding** (`icp-seeding-rank`): new
  `GET /api/onboarding/resource-ranking` + `icpRankingService.ts` (self-contained
  archetype/neighbour scoring, reuses `m_icp_archetypes` + `icp_similar_tenants`,
  no migration). `ResourcePickStep` rank-to-top + "★ For you" badge; **keeps
  select-all** (decision: rank-to-top, don't change auto-tick). Cold/no-key →
  empty ranking → static order (zero regression).
- **Piece 1 — background Smart Profile build** (`onboarding-smartprofile`): when
  the website URL is saved, a fire-and-forget `POST /api/onboarding/build-smart-profile`
  runs the proven Settings pipeline (scrape → save → clusters) **detached** —
  never blocks onboarding. HONEST-fail (persists nothing on failure) + IDEMPOTENT
  (skips if a profile exists). Fires from **BusinessDetailsStep** (live VaNi flow)
  AND BusinessPreferencesStep (Outlet flow). ✅ verified end-to-end (`http://vikuna.io`
  → scrape 2124 chars, save, 5 clusters, built).
- **Forms hardening** (`onboarding-forms-hardening`, 13 files): red `*` on every
  mandatory field across all input screens; **client-side** validation before any
  server call (business name/email/phone; first name; **mobile mandatory**);
  business email + phone now required; **client-side URL normalization** wired
  (the dead `formatWebsiteUrl` connected onBlur — `www.x.io` → `https://www.x.io`
  with a toast) and the silent server-side prepend removed.
- **Honest KT dot**: `ResourcePickStep` dot now reflects TRUE Knowledge Tree
  status (`hasKT` = variants exist) for equipment AND facilities — was forced
  green by a facility/persona bypass. Selectability unchanged (seller-equipment
  needs KT to seed catalog; facilities + buyer-equipment stay selectable for the
  registry). Data: only 9/123 equipment + 5/54 facilities have KT, so most now
  correctly show red. `onboarding-forms-hardening` (latest ResourcePickStep).

### Maintenance
- Composer `TS2345` fix: `fetchTenantIcp().catch()` fallback was missing
  `industryIds` → broke VaNi composer route load. `smart-nomenclature` (latest
  `contractComposerService.ts`). API tsc back to 0.

---

## 2. PENDING

### Feature backlog
- ⛔ **⑤ Templates gated/ranked by profile** — the main unstarted item. Use the
  tenant ICP to control which templates surface / rank them (analogous to the
  seeding rank, applied to the template picker + VaNi match tier).
- 🔶 **Groups ↔ Smart Profile unification** — DISCUSSED, PARKED for owner review.
  Finding: the membership profile (`t_group_memberships.profile_data` + embedding
  + membership clusters) is the OLDER, RICHER stack (61 profiles, 167 clusters);
  the tenant Smart Profile is newer/thinner (4 profiles) and empty for the tenants
  who are in groups. Two candidate directions on the table (owner to pick):
  (A) **single-source authoring** — Groups UI edits the one tenant Smart Profile,
  auto-project down to the membership so group search is untouched; or
  (B) **Smart Profile rides on group infrastructure** — tenant profile becomes a
  `group_id = NULL` "self" membership, one mature stack, repoint the ICP reads.
  HARD CONSTRAINT: do not break Groups discovery search. NOT full-collapse.
- 🔶 **Wizard NomenclatureStep ICP ranking** (UI) — rank ICP-relevant nomenclature
  groups to the top of the manual picker.

### Cleanup / robustness (small)
- **Remove the debug instrumentation**: `onboardingSmartProfileService` currently
  writes each step to `t_sp_autobuild_debug` (added to diagnose the build). Now
  that the path is confirmed working, revert to the clean version and drop the
  table.
- **www → apex retry** (optional): if `www.host` scrape returns nothing, retry the
  apex `host` before honest-failing.

### Owner testing outstanding (carried from 07-04 §6)
- Template tier zero-LLM fast path with a published template; Start-from-Template
  (p1.3f); Events Schedule views (p1.3g).

### Phase 2 (owner-parked, from the agentic POA)
- Runtime loop: pg_cron due-event scanner → status transitions + JTD reminders +
  service tickets + SmartForm dispatch; renewal watcher calling the composer;
  dedupe the double `jtd-worker` cron.

### Delivery
- **Phase 2 submodule commits**: ALL of the above lives in `MANUAL_COPY_FILES/`
  and on the combined-repo branch. The real `contractnest-ui` / `contractnest-api`
  / `contractnest-edge` / `ClaudeDocumentation` repos still need the owner-run
  submodule commits (agent cannot push submodules — 403).

---

## 3. NEW infra added this session (for the record)
- Endpoints: `GET /api/onboarding/resource-ranking`, `POST /api/onboarding/build-smart-profile`.
- Services: `icpRankingService.ts`, `onboardingSmartProfileService.ts` (both `contractnest-api`).
- UI: `useResourceRanking.ts` hook; per-field `required` props on `ContactFields`.
- DB (applied): `m_icp_archetypes` + `icp_similar_tenants` RPC; `t_sp_autobuild_debug`
  (temporary — remove on cleanup); smartprofile columns + nullable cluster
  `membership_id` (earlier in session).

*Prepared 2026-07-07 · session: Smart Profile finalisation + onboarding ICP + chips/nomenclature.*

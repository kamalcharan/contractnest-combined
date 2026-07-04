# HANDOVER — Templates Layer + VaNi Agent (session 2026-07-04)

> **READ THIS FIRST in the next session**, together with CLAUDE.md and
> POA-AGENTIC-CONTRACTS.md. This session built the entire template layer
> and wired the agent to consume and author it. The FIRST TASK of the next
> session is explicitly scoped at the bottom (ICP-aligned smart chips).

---

## 1. WHERE THINGS STAND (owner-verified unless noted)

| Capability | Status |
|---|---|
| Templates hub `/catalog-studio/templates-list` (contracts-hub chrome, filters, publish lifecycle, inactive+restore, multi-currency) | ✅ tested |
| Template creation via ContractWizard `mode="template"` (8 steps, no buyer/assets; events step w/ illustrative note) | ✅ tested |
| Draft → **Publish** lifecycle (`settings.lifecycle: 'draft'\|'signed_off'` — UI says Publish/Published; stored value unchanged) | ✅ tested |
| VaNi authors templates ("Draft with VaNi" on Templates hub; no buyer/date steps; saves draft template) | ✅ tested |
| VaNi template tier for contracts (match published templates → skip catalog scan + LLM selection; zero-LLM quick-parse double-confirmed by a template match) | 🔶 shipped, fast path NOT yet owner-tested end-to-end |
| Wizard "Start from Template" (published templates hydrate the wizard; buyer/dates/assets left to user) | 🔶 shipped (p1.3f), awaiting owner test |
| Events Schedule view in VaNi review (contract: interactive overrides → same computed_events pipeline; template: illustrative) | 🔶 shipped (p1.3g), awaiting owner test |
| Smart intent chips (deterministic /suggestions) | ⛔ ON HOLD — see §5, next session's first task |
| Stale code removed (old template builder + route + menu, adapter, Global demo gallery, admin template menu entries) | ✅ shipped in p1.3c/p1.3f |

Earlier session state (all owner-tested): p0 foundations (calendar parity port,
LLM client, interaction log), per-step VaNi canvas with interactive cards,
Resources materialization (onboarding → Resources; catalog-studio reads
Resources), Team Members tab.

## 2. BATCH ORDER (canonical deliverables in MANUAL_COPY_FILES/)

Apply/copy strictly in this order (later batches supersede earlier files):

```
agentic-p0-foundations            agentic-p1-composer
agentic-p1.1-composer             agentic-p1.2-canvas
agentic-p1.2.1-interactive-cards  agentic-fix-resources-materialize
agentic-p1.3a-templates-manual    agentic-p1.3b-template-wizard
agentic-p1.3c-templates-hub       agentic-p1.3d-vani-template-tier
agentic-p1.3e-vani-template-creation
agentic-p1.3f-start-from-template   (⚠️ also DELETES 2 files — see its COPY_INSTRUCTIONS)
agentic-p1.3g-smart-intents-events
```
⛔ `agentic-fix-resources-backfill` is superseded — NEVER run it.

Edge functions deployed this session: `cat-templates` (twice — is_active
filter + the scope-bug hotfix). DB migrations owner-applied:
`001_create_vn_interaction_log.sql`, `002_materialize_tenant_resources.sql`.

## 3. PHASE 2 — COMMIT TO MAIN (owner doing this)

After copying all batches in order (and running p1.3f's Remove-Item deletes):

```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"

cd contractnest-ui
git add . ; git commit -m "feat: template layer + VaNi agent (canvas, template tier, templates hub, wizard template mode)" ; git push origin main ; cd ..

cd contractnest-api
git add . ; git commit -m "feat: VaNi composer pipeline + template tier + suggestions" ; git push origin main ; cd ..

cd contractnest-edge
git add . ; git commit -m "feat: vn_interaction_log + materialize_tenant_resources migrations; cat-templates is_active filter + scope fix" ; git push origin main ; cd ..

git add contractnest-ui contractnest-api contractnest-edge
git commit -m "chore: update submodules — template layer + agentic contracts"
git push origin master
git status ; git submodule status   # expect clean
```

## 4. ARCHITECTURE DECISIONS THAT MUST NOT BE RE-LITIGATED

1. **One table, three doors**: `t_cat_templates` is written by the template
   wizard, VaNi authoring, and save-as-template — identical payload shape:
   `blocks[{block_id, order, config_overrides}]` +
   `settings.wizard_state` (full serialized ContractWizardState, buyer/asset
   fields stripped → exact edit round-trip) + `settings.defaults`
   (nomenclature/duration/acceptance/billing/tax/evidence).
2. **Lifecycle lives in `settings.lifecycle`** ('draft'|'signed_off').
   `status_id` is an UNUSED uuid column (no status master) — never write
   slugs to it (caused a 400 once already). UI language is Publish/Published.
3. **Publish is the gate**: only published templates are visible to the
   wizard's From-Template picker AND VaNi's match tier.
4. **One code path everywhere**: ContractWizard serves contracts, RFQs and
   templates via mode/step-list; VaNi finalize uses useContractSubmission →
   the same mapWizardToRequest; assembleFromTemplate feeds template blocks as
   synthetic candidates into the SAME assembleDraft.
5. **Tier ladder**: quick-parse (regex) is only trusted when a template ALSO
   matches (double confirmation) → zero-LLM repeat contracts; template match
   threshold 5 (family+2, type+3, keywords≤4, duration+2); escape hatch
   "Compose fresh instead" always present.
6. **Copy-on-write versioning** (edge): content updates create a NEW row/id,
   old row is_latest=false. Clients must read saved rows from
   `response.data.template` (NOT `data` directly) and track the new id.
7. **Honesty rule** stands: a canvas card appears only when its endpoint
   returned; zero-LLM parse card says so explicitly.

## 5. 🔴 NEXT SESSION — FIRST TASK: ICP-ALIGNED SMART CHIPS

Owner verdict: current chips are NOT solved and are ON HOLD. The chips must
be aligned to the tenant's **ICP** (Ideal Customer Profile), not just to
raw catalog/resource data.

What was observed (hubb tenant):
```
1 year Service Package for kamal industries with quarterly billing
Washroom / Restroom AMC for 1 year, billed quarterly     ← facility phrased as AMC
Parking Area AMC for 1 year, billed quarterly            ← facility phrased as AMC
6 month Service Package for kamal industries, billed monthly
```
A hotfix (commit 370c14c, already inside the p1.3g batch) pairs resources by
`resource_type_id` (equipment→AMC, asset/facility→FMC), limits the personal
name to client-classified contacts, derives billing suffixes from template
blocks, and lets quick-parse accept lowercase buyer names. The owner had not
re-copied/restarted when judging — but regardless, the DESIGN is deemed
insufficient: chips must derive from ICP.

**Step 1 next session (before any code): inspect the ICP data model.**
Look at Business Profile (Settings → Business Profile shows industries and
ICP-related capture; earlier session context: tenant profile / onboarding
captures industries and the tenant's ICP; `t_tenant_selected_resources` ×
`m_catalog_resource_templates` is the materialized working set; owner said
"t_category_resources_master will always dynamically change as per
profile/ICP"). Find where ICP is stored (likely tenant business-profile
tables — inspect via information_schema + the business-profile
service/edge), then design chips as: ICP segment × their resources ×
their nomenclature vocabulary × published templates. Present the design,
get a go, then build. Suggestions endpoint already exists
(`GET /api/vani-composer/suggestions`) — the builder
(`contractComposerService.buildSuggestions`) is the thing to redesign.

## 6. REMAINING BACKLOG (after the ICP chips)

- Owner testing outstanding: p1.3f (Start from Template), p1.3g (Events
  Schedule views), p1.3d zero-LLM fast path with a published template.
- Point 7 of the template plan: smart-forms × templates exploration DOC
  (text only) — blocks carry form_template_id; templates carry
  settings.defaults.evidence_*; runtime dispatch belongs to Phase 2.
- Buyer typeahead (auto-search ≥3 chars) on the canvas buyer card.
- Smart nomenclature: filter wizard NomenclatureStep + shrink the parse
  prompt to tenant-relevant groups (derive groups from Resources).
- Per-tax breakdown lines on the VaNi/canvas review path.
- **Phase 2 runtime loop** (owner-parked): pg_cron due-event scanner →
  status transitions, JTD reminders, service tickets, SmartForm dispatch;
  renewal watcher calling the composer; dedupe double jtd-worker cron.
- Housekeeping: deeper stale pass (admin global-templates/designer PAGES —
  menus hidden, pages kept because the Knowledge Tree detail route nests
  there; old service-contracts/templates pages), CLAUDE.md refresh,
  rotate vikunatech@gmail.com password (retro item), KVM4 upgrade end-July
  → revisit LLM latency/model size.

## 7. WORKING DISCIPLINE (hard-learned this session — keep)

- **Verify before shipping**: check column types before writing values
  (status_id uuid incident); dry-run every new write against the live DB in
  a BEGIN…ROLLBACK; read edge logs (GET/POST status codes) to diagnose —
  the API wraps ALL edge failures as 400, the truth is in the edge logs.
- **Batch-restore rule**: when building batch N, restore ALL prior batches
  (API + UI + EDGE) into the dev tree IN ORDER first — a p1.3c edge edit
  made on the un-hotfixed baseline re-shipped a fixed bug once.
- Edge response shape: saved rows arrive as `data.template`.
- DB changes: owner applies via Supabase SQL editor (project
  uwyqhzotluikawcboldr). Edge deploys: owner runs
  `npx supabase functions deploy <fn> --project-ref uwyqhzotluikawcboldr`.
- UI baseline has exactly 23 pre-existing tsc errors (OnboardingContext,
  serviceURLs.addition) — every batch must keep the total at 23; API at 0.
- The environment's git branch `claude/submodules-claude-md-review-scb7ru`
  (parent repo) holds every batch commit from this session.

---
*Prepared 2026-07-04 · session: templates layer + agent template tier*

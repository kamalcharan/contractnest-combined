# Session Handover — UX North Star: Catalog Studio + Contract Wizard (incl. Templates)

**Date:** 2026-07-12
**Session scope:** Analysis and design only — no repo code was changed (running session `claude/handover-closing-tasks-11cmhn` owns the files this work touches; all real code waits for its merge to main).
**Deliverables in this folder:**
- `HANDOVER_UX_AND_METERING.md` — this document (UX audit + recommendation)
- `HANDOVER_BUSINESS_MODEL_METERING.md` — companion doc: business-model decision, metering ledger, metering-block design
- `ux-audit-recommendation.html` — full UX audit + north-star recommendation (open in browser)
- `wizardshell-prototype.html` — clickable interactive prototype of the proposed UX (open in browser)

Artifact links (same content, hosted):
- Audit & recommendation: https://claude.ai/code/artifact/0098cf81-1121-4fc5-8d1e-6733d7528f1c
- Interactive prototype: https://claude.ai/code/artifact/4cf027b7-6677-4b77-a600-9479e139dae4

---

## 1. Executive summary

Three threads were investigated and they converge on one architecture:

1. **UX audit** of `/catalog-studio/configure` + contract creation wizard + both template flows found four parallel wizard implementations with real user-facing traps (data loss, silent validation, broken template→contract handoff) and ~7,000 lines of orphaned dead code.
2. **Recommendation:** "One spine, three skins" — a single `WizardShell` framework (autosave/resume, inline validation, edit-from-review, one design kit) that blocks, contracts, and templates all wear as skins. Headline product move: **review-first templates** (picking a template lands on a pre-filled editable review, not step 1). A working interactive prototype of this exists (see deliverables).
3. **Business model:** the half-built pricing-plans feature is ContractNest's own SaaS monetization; its plan-authoring catalog (~18k LOC, mostly mock/hidden/broken) should be scrapped in favor of **plans-as-contract-templates**, while the genuinely valuable **metering ledger** (tenant-context + credit RPCs) is kept and wired. Metering enters Catalog Studio as a **new block category** ("Credit Pack / Metering") riding the service type — the exact pattern the live session established with Group Sessions.

---

## 2. UX audit — key findings (evidence in `ux-audit-recommendation.html`, appendix table)

### 2.1 Catalog Studio
- `/catalog-studio/configure` is NOT a wizard — it's a 3-panel Block Library; the real wizard is `BlockWizardContent.tsx` (442 lines) behind `blocks/new` and `blocks/:id/edit`, with per-type step sequences (2–6 steps).
- **CRITICAL — "Save Draft" is a no-op**: handler is `console.log` only (`BlockWizardContent.tsx:278–281`) while the button renders prominently (`WizardFooter.tsx:155–168`).
- **No persistence, no `beforeunload`, no router guard** — refresh loses everything (grep for `beforeunload` = 0 hits app-wide).
- Validation runs only on Next; errors appear only as a footer summary (`WizardFooter.tsx:71–98`) — no inline field errors, no scroll-to-field.
- No review step in any block flow; edit mode starts at a visible "step 2" (off-by-one).
- Two parallel block libraries: `configure.tsx` (new) vs `blocks.tsx` (1,094-line "classic", still linked from `equipment.tsx:350`).
- Two sources of wizard-step truth: `utils/catalog-studio/wizard-data.ts` vs `pages/catalog-studio/data/wizard-steps.ts` (drift risk).
- Giant step files: PricingStep 1,160 · ResourceDependencyStep 1,156 · BusinessRulesStep 657.
- Two delete-confirm patterns (`window.confirm` in configure vs styled modal in edit); hand-rolled inline-style buttons; save button not disabled during save (double-submit).
- Dead navigation-state toast (`edit.tsx:118–126` passes `state.toast`; nothing reads it).
- No VaNi assist anywhere in the block wizard.

### 2.2 Contract wizard
- `ContractWizard/index.tsx` is a **2,906-line god-file**; actual steps: **12** (comment says 8); template mode 9, RFQ mode 6. Step files up to 1,659 lines (ReviewSendStep).
- Autosave (server draft in `metadata.wizard_state`) fires **only on Continue past the details step** — steps 0–3 never saved; no unload guard.
- `canGoNext()` silently disables Continue — no reason ever shown (`index.tsx:964–1001`).
- **Two progress indicators on one screen**: clickable-backward header dots (`index.tsx:2821–2852`) + inert FloatingActionIsland dots.
- **No edit-from-review** despite the 1,659-line review step.
- **Broken bridge:** templates list navigates `/contracts?action=create&template=<id>` but the hub never reads those params — template silently dropped (`service-contracts/templates/index.tsx:421,578`). Several template-page links 404 (`/templates/designer` etc. don't exist as routes).
- ContractDetailsStep binds ~28 inputs on one screen.

### 2.3 Templates
- TWO live authoring paradigms for the same object: wizard-in-template-mode vs the 854-line drag-and-drop designer — reached from the same list page.
- Admin global-designer (9 steps) has **no draft persistence at all**, uses `window.confirm` as its guard, and validates the template name at final save with a destructive toast + force-jump back 8 steps.
- Admin "Design with VaNi" streams a **fake 7-step animation over a documented deterministic stub** (`useGenerateRecipe.ts:6–11`) — mock AI shipped as real UI.

### 2.4 Hygiene
- **~7,000 lines of dead code**: an entire earlier contract wizard (`pages/contracts/create/steps/**`, 8 files), duplicated template trees (`pages/templates/create/**`, `pages/contracts/create/templates/**`), the classic blocks library.
- Two toast systems (VaNiToast vs shadcn useToast), 3+ loader styles, hardcoded copy throughout.

---

## 3. The recommendation — "One spine, three skins"

**North star:** a user can start any authoring flow, walk away mid-step, come back on any device, resume exactly where they left off, always see why they can't proceed, and always jump from review straight to the field that needs fixing.

### Pillar 1 — WizardShell (single authoring framework)
- Debounced autosave from the FIRST keystroke (server draft; localStorage fallback) + router blocker + `beforeunload`.
- Resumable by URL: `/contracts/new/:draftId/:step` (also fixes browser-back exiting the modal wizard).
- One validation contract per step: `validate() → field-level errors`; inline errors; error summary with scroll-to-field; **Continue never silently disabled** — pressing it with errors focuses the first problem and shows a hint ("Add a contract name to continue").
- One progress model: side stepper (collapses on mobile), completed steps clickable, future steps visibly locked with reason; Floating Action Island becomes the action bar only.
- Review as a contract: generated per-step summary cards, each with Edit that deep-links and returns to review on save.
- One kit: one toast, one loader, one confirm dialog, one Button.

### Pillar 2 — Contract wizard
- 12 steps presented as **4 phases**: Setup (path·nomenclature·counterparty) → Terms (acceptance·details·billing cycle) → Scope (assets·blocks·billing view) → Finalize (evidence·events·review).
- **Review-first templates**: choosing a template lands on a pre-filled review; user edits only what differs (counterparty, dates). Turns the 80% case into a ~2-minute confirm. This is the feature that makes templates worth authoring.
- Split the details cliff: essentials + "Advanced terms" accordion, smart defaults from nomenclature/tenant settings.
- Fix the template handoff with ONE consistent mechanism + a regression test.

### Pillar 3 — Templates
- Converge on the wizard as the single authoring flow (tenant + admin as skins; admin adds industries/recipe-slots/publish steps).
- Keep the DnD canvas but demote it to the "Arrange blocks" STEP inside the shell.
- Lifecycle badges (Draft / In review / Published) + inline publish on the templates list.

### Pillar 4 — Catalog Studio
- Commit to the library concept: delete the classic page, repoint equipment link, real zero-state, skeleton cards.
- Make Save Draft real (autosave subsumes it) — or remove the button immediately.
- One step registry; validation co-located with each step; add the missing review step; fix edit-mode numbering.

### Pillar 5 — VaNi
- One assist surface, same placement/interaction in all three flows.
- Never fake it: feature-flag the admin recipe stub off until a backend exists.

### Roadmap
| Phase | Theme | Contents | Effort |
|---|---|---|---|
| 0 | Defuse the traps | wire/remove Save Draft · unload+router guards everywhere · fix template handoff + 404 links · disable save during submit · scroll-to-error · flag off stub AI | ~1–2 wks |
| 1 | Build the spine | extract WizardShell · migrate block wizard first (smallest) · delete dead trees + classic library | ~3–4 wks |
| 2 | Contract flow | migrate ContractWizard · 4-phase grouping · details-cliff split · review-first templates · full-route wizard | ~4–5 wks |
| 3 | Templates & VaNi | converge template authoring · canvas as Arrange step · lifecycle badges · unified VaNi · mobile stepper | ~4 wks |

Instrument from Phase 0: per-step abandonment, drafts resumed vs abandoned, time-to-contract from template (target < 3 min), "lost my work" tickets.

### The prototype (`wizardshell-prototype.html`)
Fully interactive, self-contained (vanilla JS, both themes, mobile-responsive). Demonstrates: path selection → 4-phase wizard; review-first template flow with "from template"/"edited" chips; autosave pill + localStorage draft restore on refresh; Continue-never-disabled validation with inline errors + scroll-to-field + hint pill; edit-from-review round trips; Contract ⇄ Catalog Block skin toggle on the SAME shell; simulated (clearly labeled) VaNi fill. Verified headless (Playwright): 11/11 flow checks pass, zero console errors. Known fix applied: inline handlers on form controls must not reference a global named `form` (shadowed by the element's `.form` DOM property).

---

## 4–6. Business model, metering ledger, metering block

Moved to the dedicated companion document **`HANDOVER_BUSINESS_MODEL_METERING.md`** (audit verdict, plans-as-contract-templates decision, keep/delete list, the tenant-context/credit-RPC ledger inventory, the three wiring points, and the "Credit Pack" block-category design). Summary of the linkage to this doc's UX work: the review-first template flow is the "subscribe in 2 minutes" path for plans-as-templates, and the metering block rides the same WizardShell + cadence machinery.

## 5. Branch landscape & sequencing (IMPORTANT before any code)

| Branch | Where | State | Contents |
|---|---|---|---|
| `claude/handover-closing-tasks-11cmhn` | parent repo | **LIVE session**, last commit 2026-07-12 | `MANUAL_COPY_FILES/bbb-foundation/`: Group Session category (015), tenant cadence settings + SECURITY DEFINER RPC fix (016), weekday-anchored serviceCycles cadence engine in `contractEvents.ts`, holiday-clash resolver, review-step session occurrences, events→money migrations 005–014. **Not yet on submodule mains** (its submodule pointers = current main; code sits in the copy batch). |
| `claude/submodules-pending-merges-iks78e` | parent + UI | idle since 2026-07-02, 6 UI commits ahead | VaNi block recommender + `ServiceBlocksStep.tsx` serviceCycles rework, Recipe Slots editor. **Overlaps the same files as 11cmhn** (`ServiceBlocksStep.tsx`, serviceCycles handling) — needs reconcile; 11cmhn's cadence model is newer/more complete. |
| `services-production-stabilization` | UI | 1 commit, 2025-11 | production fixes — review separately |
| `claude/code-review-task-…` | UI+edge | 2025-11 | small fixes — review separately |

**Agreed sequencing:**
1. Let `11cmhn` finish and merge to submodule mains (it owns cadence + billing-event machinery).
2. Reconcile `iks78e` (`ServiceBlocksStep` serviceCycles) against it — decide merge order deliberately.
3. UX Phase 0 (defuse the traps) — can start any time AFTER merge; it touches `ContractWizard`/`ServiceBlocksStep` areas the live session owns.
4. WizardShell extraction (UX Phase 1) — migrate block wizard first.
5. Metering block (category seed → config + wizard step → settlement hook) + the 3 ledger wiring points.
6. Plans-as-templates for platform monetization; retire the plan catalog (deletion list = `pages/settings/businessmodel/**` plan-authoring + mock tenant pages + `useBusinessModelQueries.ts` + `fakejson/PricingPlans.ts`; KEEP `t_bm_tenant_subscription`, `vaniEntitlementService`, `t_tenant_context`, billing RPCs/edge fn).

---

## 6. Quick-reference: trap list for Phase 0 (copy into an issue tracker)

- [ ] Block wizard "Save Draft" → wire to real draft or remove button (`BlockWizardContent.tsx:278`)
- [ ] `beforeunload` + router guards: block wizard, contract wizard steps 0–3, global-designer
- [ ] Template handoff: make `/contracts?action=create&template=` work (or route via state) + regression test (`service-contracts/templates/index.tsx:421,578`)
- [ ] Fix 404 links: `templates/index.tsx:602,952`; `templates/preview.tsx:356,388,969`
- [ ] Disable save buttons while saving (WizardFooter has no isSaving prop)
- [ ] Scroll-to-error + hint on blocked Continue (contract wizard `canGoNext`, block wizard footer errors)
- [ ] Feature-flag off the stub VaNi recipe generator (`useGenerateRecipe.ts`)
- [ ] Fix `BUSINESS_MODEL` vs `BUSINESSMODEL` constant (or delete hooks with the catalog)
- [ ] Delete dead trees: `pages/contracts/create/steps/**`, `pages/templates/create/**`, `pages/contracts/create/templates/**`, `catalog-studio/blocks.tsx` (+ repoint `equipment.tsx:350`)
- [ ] Collapse duplicate step registries (`wizard-data.ts` vs `data/wizard-steps.ts`)

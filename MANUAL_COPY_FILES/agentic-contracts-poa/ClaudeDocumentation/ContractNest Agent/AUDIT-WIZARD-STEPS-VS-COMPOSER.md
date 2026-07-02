# Audit — ContractWizard Steps vs VaNi Composer Coverage

**Date:** 2026-07-02 · **Scope:** seller (Revenue) contract creation flow
**Sources:** `ContractWizard/index.tsx` (canGoNext :675-712, ASSET_STEP_GROUPS :179), all step components, live master data.

## Verdict

12 steps, 6 hard-gated. VaNi (agentic-p1-composer) properly manages **5**, hard-blocks the user on **1** (acceptance), silently skips **1 that matters** (assets), ignores **3 value steps** (nomenclature, evidence, tax detail).

**Design principle going forward:** every gated step must arrive either **satisfied or explicitly flagged** — the launcher result card reports "Ready: N of M steps · Needs you: X, Y". No silent skips, no unexplained walls.

## Step-by-step

| # | Step | Gate | VaNi p1 | Finding / required behaviour |
|---|------|------|---------|------------------------------|
| 1 | Path | `path!==null` | ✅ `'scratch'` | OK |
| 2 | Nomenclature | optional | ❌ null | **Keystone gap.** Master `cat_contract_nomenclature` items carry `form_settings.group` ∈ {equipment_maintenance, facility_property, service_delivery, flexible_hybrid}; group gates the Assets step (ASSET_STEP_GROUPS) and clears asset state when non-asset. Fix: composer fetches the master list, LLM picks from a CLOSED list, deterministic fuzzy-validate → prefill id/name/group. Also the industry answer: healthcare → service_delivery (no asset step) — taxonomy already encodes it. |
| 3 | Acceptance | `method!==null` | ❌ null → **user hard-blocked** | Parse from intent when stated (payment/signoff/auto); else default `'signoff'` + VaNi note. API map: payment→manual, signoff→digital_signature, auto→auto. |
| 4 | Counterparty | `buyerId!==null` | ⚠️ resolved/ambiguous OK; not-found = dead end | Continue composing with empty buyer; wizard's `QuickAddContactDrawer` (BuyerSelectionStep:32) handles creation; result card flags it. |
| 5 | Details | name + duration>0 | ⚠️ name/duration/currency/description set | startDate fixed to "today"; grace never parsed. Fix: intent parser extracts start_date and grace when stated. |
| 6 | Assets | `coverageTypes.length>0` when group ∈ asset groups | ❌ **never appears** (group null) | **Double-broken:** today silently skipped (equipment contract w/o asset coverage — manual flow would never produce this); naive nomenclature fix would instead hard-wall the user. Must ship WITH #2: fetch client assets (`useClientAssets` / t_client_asset_registry.owner_contact_id), derive coverageTypes from selected blocks' resource_template_id → resource, prefill equipmentDetails, `allowBuyerToAdd=true` + gap flag when 0 assets. NOTE: hubb clients currently have 0 registered assets — test data needed. |
| 7 | Billing Cycle | `type!==null` | ✅ unified/mixed | OK (per_block → mixed) |
| 8 | Billing View | none | ⚠️ paymentMode/emi/perBlock set | Totals recompute on visit (safe). Blocks carry `taxRate` but empty `taxes[]` → per-tax breakdown incomplete. Fix: populate taxes[] from block tax data. Bonus: KT price-band sanity check (kt_price_min/max) → gap flag. |
| 9 | Evidence Policy | none (default 'none') | ❌ untouched | Blocks carry `form_template_id` + `kt_checkpoint_ids`; when present propose `smart_form` + forms (from tenant smart-form selections); equipment maintenance else `upload`. Deterministic. |
| 10 | Events Preview | none | ✅ parity-derived | OK |
| 11 | Review & Send | none | ✅ | Surface VaNi summary + gaps here too. |

## p1.1 build order (agreed items 1–2 from owner feedback included)

1. Nomenclature mapping (closed-choice LLM + deterministic validate) — unlocks 2, industry-awareness
2. Asset & coverage prefill (must ship with 1)
3. Acceptance method (intent extraction + signoff default)
4. Buyer-not-found → continue + quick-add path
5. Evidence-policy proposal from block form templates
6. Revenue-only gating (hub `activePerspective==='revenue'`; create page `contractType==='client'`) + hub entry button
7. Tax enrichment + start-date/grace parsing
8. Launcher result card shows "Ready N/M · Needs you: …"

## Data prerequisites (owner)

- Register 2–3 test assets for one hubb client (t_client_asset_registry is empty for all hubb contacts)
- Optional: 1 saved template for template-context testing

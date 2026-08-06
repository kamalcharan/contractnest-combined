---
title: Business Model v3 — Sprint 1 status
project: ContractNest
updated: 2026-08-06
---

## The plan, in one line

The business model IS a contract. Vikuna authors plan templates in
catalog-studio; a tenant buys one and it becomes their contract. Grant rates
and pack prices are authored by a human in the metering block — never
constants in code.

## Sprint 1 — step by step

| # | Step | Status |
|---|------|--------|
| 0 | Agree the credit-pool model (per-channel pools, top up per contract, never expire) | **Done** — settled with owner |
| 1 | Additive schema — `t_tenant_context` columns, `t_bm_topup_pack.channel` | **Done** — migration 010, applied |
| 2 | Notification channels into the Vikuna LOV | **Done** — 011, applied |
| 3 | Ledger RPC rework + defect fixes D1/D3/D4/D5 | **Done** — 012, applied |
| 4 | Regression (13 cases) | **Done** — 13/13. Found D7: `add_credits` was throwing for every tenant in production; fixed in 013/014 |
| 5 | Seed Vikuna as platform tenant (`billing_mode=exempt`, limits NULL) | **Done** — 015, applied |
| 6 | Metering ("Credit Pack") block type + catalog-studio authoring UI | **Done, needs your retest** — 016 applied; UI below |
| 7 | Settlement hook — read `config.metering` on payment, grant credits / set limits / flip flags | **Not started — you parked it** ("trigger is required only while template is converted to contract, we will do later") |
| 8 | Author the 7 platform templates | **Blocked on 6 being retested**, then it is your authoring work in the UI |
| 9 | End-to-end proof — Vikuna sells one template to a test tenant | **Not started**, needs 7 and 8 |

## Step 6 detail — what is actually in place

| Piece | State |
|---|---|
| `cat_block_type` row "Credit Pack" | applied (016), `is_active=false` |
| `metering` in `BLOCK_CATEGORIES` + `adminOnly` | staged |
| Admin gate in catalog-studio (`useBlockCategories`) | staged |
| `MeteringStep` — 4 modes, channels from LOV | staged |
| Adapter reads/writes `config.metering` | staged |
| Wizard step map — `metering` = Type/Basic Info/Metering/Pricing | staged (`utils/catalog-studio/wizard-data.ts`) |
| Admin gate in the contract wizard (`ServiceBlocksStep`) | staged |
| Price of 0 accepted | staged |

## Defects found and fixed along the way

| Ref | What | Where |
|---|---|---|
| D1 | `add_credits`/`deduct_credits` wrote no journal row | 012 |
| D3 | trigger used `reserved`, column is `reserved_balance` | 012 |
| D4/D5 | `purchase_topup` wrong column + NULL channel + missing `event_source` | 012, 014 |
| **D7** | same `reserved` bug with no early return — **`add_credits` was throwing for every tenant in production** | 013 |
| — | `cat-blocks` admin bypass: `if (!ctx.isAdmin)` skipped tenant filtering | deployed v23 |
| — | `/tenant-masterdata` route shadowed by `/product-masterdata` — every `useTenantMasterData` call silently returned global data | deployed v24 |
| — | `cat-templates` had the identical admin bypass — platform tenant saw BBB's and hubb's templates | **staged, NOT deployed** |
| — | price of 0 blanked on entry (`amount \|\| ''`) | staged |
| — | metering steps added to a duplicate map nothing imports → "Step 5 Configuration" placeholder | staged |

## Blocking you right now

1. **Deploy `cat-templates`** — until then the platform tenant's Templates hub
   shows other tenants' templates.
2. **Copy + retest step 6** — the wizard should now run Type → Basic Info →
   Metering → Pricing, with Pricing rendering the real step and accepting 0.
3. Then **step 8**: author the templates.

## Known gaps, deliberately not closed

- Metering gating is UI-only. `cat-blocks handleCreateBlock` has no
  server-side check, so a direct API call with the metering `block_type_id`
  would still succeed for a non-platform tenant.
- Two near-identical wizard-step maps still exist
  (`utils/catalog-studio/wizard-data.ts` is live,
  `pages/catalog-studio/data/wizard-steps.ts` is imported by nothing).
  Commented, not deleted — deleting it was not asked for.
- `t_cat_templates` still holds one orphan template referenced by 3 active
  contracts of a deleted tenant, plus BBB's duplicate rows (same name, same
  `created_at`, different id — looks like a copy/versioning bug worth its own
  look).

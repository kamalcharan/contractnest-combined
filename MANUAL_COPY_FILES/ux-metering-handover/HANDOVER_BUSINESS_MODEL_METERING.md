# Session Handover — Business Model: "A Contract IS the Business Model" + Metering Strategy

**Date:** 2026-07-12
**Status:** Analysis & design decisions only — NO code changed. All implementation waits for `claude/handover-closing-tasks-11cmhn` (live session) to merge to main.
**Companion doc:** `HANDOVER_UX_AND_METERING.md` (UX audit + WizardShell north star for Catalog Studio & Contract wizard).

---

## 1. The question this session answered

> "I previously built a kind of business model but did not complete it — I guess it will be better to create a contract and that itself will be the business model."

**Verdict: the instinct is right, with one separation.** A subscription is two things:
- **The money** (what the tenant pays, when, invoices) → the contract engine already models this BETTER than the plan feature (billing cycles, per-block pricing, tax, EMI, invoicing).
- **The permissions & metering** (what the tenant may use, how much) → contracts don't model this, but you already built the right layer for it (tenant-context + credit ledger) — it just was never wired.

So: **plans become contract templates; the metering ledger stays and gets wired.**

---

## 2. What the existing business-model feature actually is

It is **ContractNest's OWN SaaS monetization** — admin-authored plans that tenants subscribe to *in order to use ContractNest*. It is NOT a tool for tenants to price their own services (contracts already do that).

Evidence:
- `types/businessModel.ts:54` — `plan_type: 'Per User' | 'Per Contract'`, `subscriber_count`, `trial_duration`.
- `businessModelConstants.ts:41–52` — "This plan will become visible to **tenants for self-service subscription**."
- Plan features are platform limits + notification credits (`credits_per_unit`, `t_bm_credit_balance`).
- Usage metrics = contracts/users/storage/notifications — the tenant's consumption OF ContractNest.

### Inventory (what exists)
- **Admin UI** (`pages/settings/businessmodel/admin/**`): plan list/create/edit/detail/assign, plan versions, billing dashboard + invoicing. Plus `components/businessmodel/planform/*` (8 files), `plandetail/*` (10 files), `billing/*`. Plausibly functional end-to-end (UI → `/api/business-model` → edge `plans` fn → tables).
- **Tenant UI**: pricing-plans page runs on `fakePricingPlans` fake JSON; the 1,209-line Subscription dashboard uses hardcoded `mockPlan`/`mockSubscription`; nav items are COMMENTED OUT (`industryMenus.ts:208–222`).
- **API**: `businessModelRoutes.ts` (mounted `/api/business-model`), `planController`, `planVersionController`, `businessModelService` (thin proxy to edge; `compareVersions` throws "removed"). Separate `/api/billing/*` routes (invoice-estimate, topup-packs, credits/topup).
- **Edge**: `plans/index.ts` (548, real CRUD on `t_bm_pricing_plan`/`t_bm_plan_version`), `plan-versions/index.ts`, `billing/`.
- **DB**: `t_bm_pricing_plan`, `t_bm_plan_version`, `t_bm_tenant_subscription`, `t_bm_subscription_usage` + v2 migration tables (see §4).

### Broken / dead spots (concrete)
- `useBusinessModelQueries.ts` reads `API_ENDPOINTS.BUSINESS_MODEL.*` — the constant is exported as **`BUSINESSMODEL`** (no underscore) and lacks those sub-keys → the hooks throw at runtime. The tenant Subscription page's live-data path never worked.
- The ONLY live gate — `vaniEntitlementService` — defaults to `'open'` mode (everyone entitled) unless `VANI_ENTITLEMENT_MODE=subscription`; even then it reads one `t_bm_tenant_subscription` row (`status`/`trial_ends`) and **never reads any pricing plan/tier/feature**. The plan catalog is consumed by NOTHING live.
- `checkEntitlement()` in contract creation traces to exactly that env-mode check — independent of the plan catalog.
- ~67 TODO/mock/"coming soon" markers across the feature.
- Blast radius of removing the plan catalog: ~zero (no imports outside the feature).

---

## 3. Decision: plans-as-contract-templates

- Each tenant's subscription = a **contract**: Vikuna (platform tenant) is the seller, the tenant is the counterparty.
- "Starter / Growth / Enterprise" = **contract templates** whose service blocks are "Platform access", "Notification credit packs", "Extra environments", etc.
- Contract signing/renewal writes `t_bm_tenant_subscription` and posts credits via existing RPCs (`add_credits` / `purchase_topup`).
- Billing, invoicing, EMI, cycles, tax come free from the contract engine. Dogfooding: every gap felt billing ourselves is a tenant-facing gap too.
- The **review-first template UX** (see UX handover) is exactly the "subscribe in 2 minutes" path.

### Caveats logged (don't lose these)
1. **Metering needs a counter regardless** — a contract block records the *price* of a credit pack, not the balance; the ledger stays necessary (it exists, §4).
2. **Plan upgrade/downgrade = contract amendment** — the wizard has no amendment flow yet. Roadmap item, not a v1 blocker.

### Keep / delete list
- **DELETE (or shelve):** plan-authoring admin UI (`pages/settings/businessmodel/admin/**`, `components/businessmodel/planform|plandetail|dashboard`), mock tenant pages (`tenants/pricing-plans`, `tenants/Subscription`), `useBusinessModelQueries.ts`, `utils/fakejson/PricingPlans.ts`, plan-catalog edge fns (`plans`, `plan-versions`), `businessModelRoutes/planController/planVersionController/businessModelService`.
- **KEEP:** `t_bm_tenant_subscription` + `vaniEntitlementService` (live VaNi gate), `t_tenant_context` + `tenantContextService` + tenant-context edge fn, billing edge fn + all credit/usage RPCs, `t_bm_credit_balance`/`t_bm_topup_pack`/`t_bm_billing_event`/`t_bm_subscription_usage`, `/api/billing/*` routes.

---

## 4. The metering "balance sheet" — already built (owner was right)

Three layers exist and are genuinely well designed:

1. **Ledger:** `t_bm_credit_balance`, `t_bm_topup_pack`, `t_bm_billing_event` (journal) + RPCs: `deduct_credits`, `add_credits`, `record_usage`, `purchase_topup`, `check_credit_availability`, `get_usage_summary`, `get_invoice_estimate`, `get_billing_alerts`, `get_topup_packs`, `get_subscription_details`, `get_billing_status`. All exposed by the `billing` edge function (`functions/billing/index.ts:168–441`). Migrations: `contractnest-edge/supabase/migrations/business-model-v2/005–009` (005 = 629-line RPC pack; 006 = tenant context).
2. **Fast read-model:** `t_tenant_context` — trigger-maintained snapshot keyed `(product_code, tenant_id)`: subscription status, per-channel credits (whatsapp/sms/email/pooled), limits vs usage (users/contracts/storage_mb), add-ons (`addon_vani_ai`, `addon_rfp`), precomputed flags (`flag_can_access`, `flag_can_send_whatsapp`, `flag_credits_low`, `flag_near_limit`). Gates read ONE row, never join the ledger.
3. **API:** `tenantContextService` (30s in-memory cache), `canSendChannel()`, route `/can-send/:channel`, `initContext` on signup, and the **waiting-JTD** mechanism — notification jobs queue when credits run out and are released after top-up (`get_waiting_jtd_count`, `release_waiting_jtds`). Thoughtful degradation path, already designed.

### The gap: nothing SPENDS the ledger (last mile unwired)
- No notification-send path calls `deduct_credits`/`check_credit_availability` (only the billing edge fn + `_shared/businessModel` helper reference them).
- The VaNi gate ignores `t_tenant_context.addon_vani_ai` (built for exactly this) and reads its own subscription row.
- Only ONE UI component consumes tenant context (`catalog/ServiceForm/ServiceConfigStep.tsx`).

### The three wiring points (this is the REAL work — nothing new to build)
1. **Notification send** → `check_credit_availability` before send, `deduct_credits` after, waiting-JTD path when empty.
2. **VaNi entitlement** → read `t_tenant_context.addon_vani_ai` / flags.
3. **Contract & user creation** → `record_usage` against `limit_contracts`/`limit_users`.

> Accounting analogy that framed the discussion: the general ledger and trial balance were built; work paused before connecting the cash registers. Contracts become the sales/invoicing side; tenant-context stays the ledger. Together they ARE the business model.

---

## 5. Metering in Catalog Studio — design decision (owner asked: adjust existing block vs new block?)

**Decision: a new block CATEGORY riding the existing service type — NOT overloading existing blocks, NOT a new top-level type.**

This is the **Group Session precedent** set by the live session (migration `bbb-foundation/015`): *"a Group Session is a SERVICE block with `config.audience='group'` — the engine branches on audience, never on the category name; the row only makes the picker card discoverable."*

### Design
- New `m_category_details` row: `sub_cat_name='metering'`, display **"Credit Pack"**, own icon/color; blocks stored as `type='service'`, `category='metering'`.
- `config.metering = { meter: 'whatsapp'|'sms'|'email'|'users'|'contracts'|'storage_mb', grant: number, mode: 'recurring'|'one_time'|'limit', rollover: boolean }`.
- Riding `type='service'` inherits pricing + the NEW weekday-anchored cadence engine (from the live branch) for free:
  - **Recurring allowance** ("500 WhatsApp/mo in Growth plan") = metering block with monthly cadence → each occurrence = grant event.
  - **Top-up pack** ("1,000 SMS, ₹2,000") = qty 1, no cadence → one event.
  - **Limit** ("25 users") = non-priced block whose activation writes limits.
- **Only genuinely new code: ONE settlement hook** — when a billing event for a block carrying `config.metering` settles → call `add_credits`/`purchase_topup`/set limits. Idempotent on billing-event id. The live branch is already wiring events→money (`005_fix_5b_scanner_link_billing_events`, `008_billing_status_money_driven`) — the hook lands in a pipeline that will exist at merge.
- **Wizard:** swap the Delivery step for a small Metering step when `category='metering'` — same branch-on-category trick `BlockWizardContent` already uses.

### Rejected options
- *Overload existing service/billing blocks:* invisible semantics, irrelevant wizard fields, every code path must ask "is this secretly a meter?"
- *New top-level type:* duplicates the entire step/validation/pricing/events plumbing service blocks already have.

### v1 product decision
Seed the "Credit Pack" category **visible only to the platform/admin tenant**. Later option: the same primitive is a real tenant-facing feature (gym 10-visit pass, prepaid lab credits) but requires **tenant-scoped ledgers** — `t_bm_*` is platform-scoped (`product_code, tenant_id`) today. Keep the door open, don't build it in v1.

---

## 6. Branch landscape & sequencing (agreed with owner)

| Branch | State | Relevance |
|---|---|---|
| `claude/handover-closing-tasks-11cmhn` (parent) | **LIVE**, last commit 2026-07-12 | Owns cadence engine, Group Session category, tenant cadence settings (015/016 + SECURITY DEFINER fix), holiday resolver, events→money migrations 005–014. Code sits in `MANUAL_COPY_FILES/bbb-foundation/` on that branch — NOT yet on submodule mains. |
| `claude/submodules-pending-merges-iks78e` | idle since 2026-07-02, 6 UI commits | Reworked `ServiceBlocksStep.tsx` serviceCycles + VaNi block recommender. **Overlaps 11cmhn files** — reconcile after 11cmhn; 11cmhn's cadence model is newer/more complete. |

**Order of operations:**
1. `11cmhn` merges to submodule mains (owner said: real code only after that).
2. Reconcile `iks78e` against it (deliberate merge order; diff file-by-file).
3. Metering block: category seed → `config.metering` + wizard step → settlement hook.
4. The 3 ledger wiring points (§4).
5. Plans-as-templates for platform monetization; execute the keep/delete list (§3).
6. UX Phase 0/1 (see companion doc) can interleave — but Phase 0 touches `ContractWizard`/`ServiceBlocksStep` areas the live session owns, so also post-merge.

---

## 7. Open questions for the owner (answer when tackling this)

1. Platform tenant: does a "Vikuna" seller tenant exist in prod, or does it need seeding before plans-as-templates?
2. Payment collection for platform invoices: same payment-mode machinery as tenant contracts, or external (Razorpay/Stripe) first?
3. `VANI_ENTITLEMENT_MODE`: when do we flip from `open` to `subscription` — after the first plans-as-templates contract exists, or behind a per-tenant flag?
4. Credit pricing: are the seeded top-up packs in `t_bm_topup_pack` (migrations 007–009 seeds) still the intended SKUs, or re-price during template authoring?
5. Delete vs shelve for the plan-catalog code: hard-delete (recoverable from git) or move to an `_archive/` branch first?

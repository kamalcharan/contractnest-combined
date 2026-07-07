# VaNi — 1-week Trial + Briefing (batch: vani-trial-and-briefing)

**Date:** 2026-07-07 · **Follows:** POA-OPERATIONS stages 0–3 · ARCHITECTURE.md · owner decisions below

---

## 1. Owner decisions locked this session

1. **VaNi = one virtual employee, human-in-the-loop** — one engine + one paid gate;
   per-domain autonomy dials later (ARCHITECTURE §2/§3). NOT separate agents per menu.
2. **Navigation:** VaNi mode will FLIP inside the existing ops pages (`/ops/finance`
   etc.) — no parallel VaNi work-pages. The VaNi menu is only: **Overview** (landing),
   **Briefing** (this batch), **Autonomy & Credits** (future). 3 items is the end-state.
3. Mock `/vani` pages = reference only; menu entries moved under **"VaNi (old)"**
   (removed in a later cleanup pass). Routes untouched.
4. Page name: **Briefing** (owner-picked over "Dashboard").
5. Trial: **1 week, self-serve from the landing page.** Gate code ships now but
   `VANI_ENTITLEMENT_MODE` stays **open** (everyone passes) until the owner flips it.

## 2. What this batch ships

| Piece | File(s) |
|---|---|
| Migration 015 | plan seed (VaNi, product_code tag `vani` on subscription rows), one-trial-per-tenant unique guard, `start_vani_trial` RPC (idempotent), `get_vani_briefing` RPC, **repair of broken trigger** (see §3) |
| API `/api/vani` | `GET /entitlement` (trial state), `POST /trial/start`, `GET /briefing` (entitlement-gated) — vaniRoutes + vaniDeskController + vaniDeskService; `vaniEntitlementService` now product-aware with `getDetails()` |
| UI | `pages/VaNi/BriefingPage.tsx` (standup banner, KPI strip, Needs-you groups deep-linking to ops pages, What-VaNi-did feed — real scanner/JTD data only), landing-page trial CTA (start / active-days-left / expired states), menu restructure |

## 3. ⚠️ Pre-existing bug repaired (found by dry-run)

`trg_subscription_update_context` (AFTER INSERT/UPDATE on `t_bm_tenant_subscription`)
referenced columns that don't exist on the live table (`plan_version_id`, `id`,
`current_period_start/end`, `trial_end_date`). **Every insert/update on the
subscription table failed** — `t_tenant_context` had 0 rows because the sync never
ran once. Migration 015 rewrites `trg_fn_update_context_on_subscription()` against
the real schema (`version_id`, `subscription_id`, `start_date`, `renewal_date`,
`trial_ends`; plan name via join to `t_bm_pricing_plan`). Behavior preserved.

## 4. Verified by dry-run (live DB, transaction aborted — nothing committed)

- trial start → `started_now=true`, `trial_ends = now()+7d`, ctx row written
  (plan VaNi, status trial, can_access true)
- second call → `started_now=false` (idempotent); NULL tenant → `TENANT_REQUIRED`
- briefing on a real tenant: reminders 24h/7d = 2/2, appointments requested = 10,
  overdue invoices = 2, unticketed service events = 10, feed length 12

## 5. Design notes / constraints hit

- `t_bm_pricing_plan.plan_type` CHECK allows only 'Per User'/'Per Contract' → VaNi
  plan uses 'Per User' (bills flat, units=1).
- `t_bm_pricing_plan.product_code` FKs to `m_products` (whole products only) → plan
  row carries `contractnest`; **subscription rows** carry `product_code='vani'`
  (free-text column, no FK) — that's what the entitlement + unique guard key on.
- `status` CHECK: `trial` allowed ('trialing' is NOT) — entitlement treats trial as
  entitled only while `trial_ends > now()`.
- Discovery during compose: stages 1–3 are ALREADY committed on the submodules'
  main branches — the handover's "Phase 2 pending" is stale. This batch is the only
  working-tree delta.

## 6. Next steps (queued)

1. Owner tests → commit this batch (workflow provided in-session).
2. Autonomy & Credits page (3rd menu item) when Stage 5 governance lands.
3. Stage 4 (tenant JTD visibility) still next in the POA order; Briefing's feed
   will reuse its tenant-scoped RPC discipline.
4. Flip `VANI_ENTITLEMENT_MODE=subscription` when the owner wants the gate real.
5. Cleanup pass: delete "VaNi (old)" menu + mock pages.

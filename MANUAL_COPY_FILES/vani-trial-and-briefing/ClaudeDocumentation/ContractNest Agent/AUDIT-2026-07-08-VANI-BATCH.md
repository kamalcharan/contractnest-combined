# Audit Report — VaNi trial · Briefing · Rules v1 (batch: vani-trial-and-briefing)

**Date:** 2026-07-08 · **Scope:** everything this batch shipped (migrations 015–018,
`/api/vani/*`, Briefing/Landing/Automation-Rules UI, scanner v3) + platform-wide
observations surfaced while auditing. **DB checks were run against the live
project** (read-only probes + Supabase security advisors); remediations applied
are marked.

---

## 1. Console cleanup (task 1)

| Area | Before → After | Notes |
|---|---|---|
| `vaniDeskService.ts` | 8 → 0 | error flows still return structured `{code,message}` |
| `vaniDeskController.ts` | 5 → 0 | responses unchanged |
| `vaniEntitlementService.ts` | 1 → 0 | lookup failure falls through to mode default |
| API `index.ts` (our 2 VaNi blocks) | 6 → 0 | try/catch + `captureException` intact |
| UI `App.tsx` | 7 → 0 | **also removed the "Temporary API test"** that fired a spurious `GET /` + logged `VITE_API_URL` on every app load |
| All other batch files | already 0 | Briefing, Automation Rules, hooks, landing |

**Out of scope (owner decision needed):** API `index.ts` retains ~221 pre-existing
boot-log consoles (the platform's route-registration pattern) and the wider
repos contain hundreds more. Deleting them wholesale changes ops visibility —
the right fix is a logger with levels (pino/winston) platform-wide, as its own task.

## 2. Security audit (task 2)

### Findings on THIS batch — all remediated (migration 018, APPLIED)

| # | Severity | Finding | Fix (applied + verified) |
|---|---|---|---|
| S1 | 🔴 Critical | `t_vani_rules` + `m_vani_rule_templates` created with **RLS off** and Supabase default grants (full CRUD to `anon`/`authenticated`) → any anon-key holder could read/**rewrite any tenant's rules** via PostgREST, bypassing API + entitlement | RLS enabled deny-by-default (no policies); table grants revoked. Legit access unaffected (service-role RPCs) |
| S2 | 🔴 Critical | All 8 batch RPCs (incl. `update_vani_rule` — a WRITE — and `get_vani_briefing` — cross-tenant READ) were **executable by `anon`/`authenticated` via `/rest/v1/rpc/`**: Supabase grants EXECUTE to these roles directly, so 015/017's `REVOKE FROM PUBLIC` did not close it | Direct `REVOKE EXECUTE ... FROM anon, authenticated` on all 8; verified `has_function_privilege` = false / false / service_role true |
| S3 | 🟡 Warn | Trigger functions (`trg_fn_update_context_on_subscription`, `trg_fn_seed_vani_rules`) had mutable `search_path` (hijack hardening) | `ALTER FUNCTION ... SET search_path = public` |
| S4 | 🟢 Info | Helpers `vani_rule_int/enabled` still inherit EXECUTE via PUBLIC — read-only SECURITY INVOKER; with RLS on they see zero rows for anon (return fallback). Residual hygiene only | NOT applied (owner paused DB writes); one-liner queued: `REVOKE ALL ON FUNCTION vani_rule_int(UUID,TEXT,TEXT,INT), vani_rule_enabled(UUID,TEXT) FROM PUBLIC;` |

### Design-level posture (no change needed now, documented)

- **Tenant scoping**: `/api/vani/*` derives tenant from the `x-tenant-id` header after
  JWT auth — the platform-wide pattern. A user with a valid login could send another
  tenant's id. **Known platform issue; the fix (JWT-derived tenant, no header trust)
  is exactly Stage 4's security-hardening scope.** Until then the exposure is
  authenticated-users-only and applies equally to finance/appointments routes.
- **Entitlement gate**: enforced in controller on `PUT /rules` and `GET /briefing`;
  currently `VANI_ENTITLEMENT_MODE=open` (owner decision) so it passes everyone —
  flip to `subscription` to arm it. 5-min cache is cleared on trial start.
- **Input validation**: rule updates validated twice (controller type checks; RPC
  whitelists fields against template `default_config`, enforces numeric type +
  min/max bounds). `days` param clamped 1–30. No SQL string interpolation anywhere
  (parameterized RPCs only). No secrets added to the repo.
- **Rate limits**: reads 200/15min, writes 20–50/15min per the finance convention.

### Platform-wide pre-existing findings (from Supabase advisors — NOT this batch, owner-scoped backlog)

761 total lints, headline items:
- **~226 SECURITY DEFINER functions executable by `anon`/`authenticated`** via
  PostgREST (same S2 pattern, incl. `get_tenant_receivables`, appointment RPCs, …)
- **36 tables with RLS disabled** (the ARCHITECTURE §11 advisory; includes
  `t_business_groups`, `leads`, …) + 7 tables with policies but RLS off
- 4 S
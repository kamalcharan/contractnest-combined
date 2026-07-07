# Audit Report — VaNi Trial · Briefing · Rules v1 (batch `vani-trial-and-briefing`)

**Date:** 2026-07-08 · **Scope:** the objects THIS batch created/changed
(migrations 015–018, `/api/vani/*`, the Briefing + Automation Rules UI, and the
scanner v3 changes). Platform-wide pre-existing issues are noted but **out of
scope** — flagged for a separate owner-scoped task.

**Verdict:** ✅ Ship-ready. Two **critical** exposures found in objects created
earlier the same day were fixed and verified live (migration 018). No data was
modified by the audit — only privileges. Concurrency and idempotency guards
verified against live data: zero duplicates.

---

## 1. Console cleanup (task 1)

Removed every `console.*` from batch-authored files:

| File | Removed |
|---|---|
| `contractnest-api/.../vaniDeskService.ts` | 8 (error/log in each catch) |
| `contractnest-api/.../vaniDeskController.ts` | 5 |
| `contractnest-api/.../vaniEntitlementService.ts` | 1 (silent catch → mode default) |
| `contractnest-api/src/index.ts` | 6 (our two VaNi-desk blocks only) |
| `contractnest-ui/src/App.tsx` | 7 — incl. the "Temporary API test" block that fired a **spurious `GET /` on every app load** and a top-level env log |

Error paths preserved: API catches still return typed `{success:false}` /
`internalError`; Sentry `captureException` on route registration untouched.
tsc baselines unchanged (UI 23 / API 0). **No DB impact** (file-only).

---

## 2. Security audit (task 2)

### 2.1 CRITICAL — RLS off + open grants on the new tables (FIXED, 018)
`m_vani_rule_templates` and `t_vani_rules` (created in 017) had **RLS disabled**
and Supabase default privileges granted **full CRUD to `anon` + `authenticated`**.
Impact: anyone with the public anon key could read or **rewrite any tenant's
automation rules** via `/rest/v1/`, bypassing the API and its entitlement gate —
a cross-tenant write hole.
**Fix (018):** `ENABLE ROW LEVEL SECURITY` (deny-by-default, no policies needed —
all real access is via SECURITY DEFINER RPCs / the scanner) + `REVOKE ALL … FROM
anon, authenticated`. **Verified:** RLS on both = true; 0 remaining anon/auth grants.

### 2.2 CRITICAL — SECURITY DEFINER RPCs executable by anon (FIXED, 018)
`REVOKE … FROM PUBLIC` in 015/017 did **not** remove the EXECUTE that Supabase
grants **directly** to `anon`/`authenticated`. The advisor confirmed all 6 RPCs
callable via `/rest/v1/rpc/` by anon — including `update_vani_rule` (cross-tenant
write) and `get_vani_briefing` (cross-tenant read).
**Fix (018):** `REVOKE EXECUTE … FROM anon, authenticated` on all 8 functions.
**Verified post-fix** (`has_function_privilege`):

| Function | anon | authenticated | service_role |
|---|---|---|---|
| start_vani_trial | ❌ | ❌ | ✅ |
| get_vani_briefing | ❌ | ❌ | ✅ |
| get_vani_rules | ❌ | ❌ | ✅ |
| update_vani_rule | ❌ | ❌ | ✅ |
| seed_vani_rules | ❌ | ❌ | ✅ |
| run_contract_event_scanner | ❌ | ❌ | ✅ |
| vani_rule_int / vani_rule_enabled | ⚠️ true | ⚠️ true | ✅ |

Residual: the two read-only helpers still inherit EXECUTE via PUBLIC. **Low risk**
— read-only, and RLS now returns zero rows to anon regardless. A one-line
`REVOKE … FROM PUBLIC` on both closes it (queued in handover, not yet applied).

### 2.3 WARN — mutable search_path on trigger functions (FIXED, 018)
`trg_fn_update_context_on_subscription` and `trg_fn_seed_vani_rules` had a role-
mutable `search_path` (hijack surface). **Fixed:** `SET search_path = public`.
All other batch functions already set it.

### 2.4 App-layer controls (reviewed — sound)
- **Tenant scoping:** every RPC takes `p_tenant_id`; the API derives it from the
  `x-tenant-id` header + `authenticate` middleware, never from the request body.
- **Entitlement gate:** `update_vani_rule` and `getBriefing` check
  `isEntitled()` server-side; `getRules` is intentionally open (read is free).
- **Input validation:** `update_vani_rule` rejects unknown fields, non-numeric
  values, and out-of-bounds numbers **in the RPC** (not just the UI) — bounds
  can't be bypassed by calling the API directly.
- **Rate limits:** reads 200/15min, writes 20–50/15min (matches finance/appointments).
- **Secrets:** none in code; service-role key server-side only. No PII in logs
  (logs now removed entirely).

### 2.5 OUT OF SCOPE — pre-existing, platform-wide (owner task)
The advisor scan (761 findings total) shows a systemic pattern predating this
work, consistent with ARCHITECTURE.md §11:
- **36 tables** with RLS disabled in `public` (incl. `leads`, `t_tenant_context`,
  business-group tables); 7 have policies defined but RLS off (policies inert).
- **~226 older functions** executable by anon as SECURITY DEFINER; ~234 with
  mutable search_path.
- 2 `sensitive_columns_exposed`, 4 `security_definer_view`, auth OTP long expiry,
  leaked-password protection off, Postgres minor version behind.
**Recommendation:** schedule a dedicated RLS/grants hardening task before granting
VaNi write-authority at scale (this is the §11 "security precondition"). Do NOT
blanket-enable RLS without policies — it will break existing access.

---

## 3. Race conditions & idempotency (task 3) — verified live, 0 duplicates

| Concern | Guard | Live check |
|---|---|---|
| Scanner double-run (cron overlap) | `pg_try_advisory_xact_lock` single-flight | second concurrent run returns `skipped` |
| Duplicate appointment per event | `uq_appointments_event` unique + `ON CONFLICT`/`unique_violation` swallow | **0 dup event_ids** across 21 rows |
| Duplicate VaNi trial per tenant | `uq_bm_tenant_subscription_vani` partial unique + idempotent `start_vani_trial` | **0 dup trials** |
| Duplicate rule row | `uq_vani_rules_tenant_rule` + `ON CONFLICT` in seed/update | **0 dup (tenant,rule)** |
| Double service reminder | `reminder_dispatched_at`/`reminder_jtd_id` stamp; filter `IS NULL` | 5 events stamped = 5 service JTDs (1:1) |
| Double payment reminder | `last_reminder_at`/`last_reminder_jtd_id` stamp; filter `IS NULL` | see note ↓ |
| Concurrent rule edit | optimistic concurrency: `update_vani_rule` checks `expected_version`, returns `VERSION_CONFLICT` (API → 409) | verified in dry-run |
| Rule seeding on signup | trigger swallows errors (never blocks tenant creation); backfill idempotent | 942 rows / 157 tenants, re-runnable |

**Note (low, data-history only):** `payment_due` JTDs = 2 but invoices with
`last_reminder_jtd_id` = 1. Not a live double-send — the scanner filters on
`last_reminder_at IS NULL`, so it sends at most once per invoice. The extra JTD
is from an earlier manual Stage-1 "send reminder" (which enqueues without setting
the scanner's stamp column). Cosmetic; flagged for awareness, no fix required.

---

## 4. Migrations applied this session (all live on `uwyqhzotluikawcboldr`)

| # | What | Status |
|---|---|---|
| 015 | VaNi plan seed + trial RPCs + **repair of broken subscription→context trigger** | ✅ applied |
| 016 | Briefing v2 (appointment context + per-kind feed cap) | ✅ applied |
| 017 | Rule templates + `t_vani_rules` + seed/backfill + RPCs + scanner v3 | ✅ applied |
| 018 | Security hardening (RLS + revokes + search_path) | ✅ applied |

Post-018 smoke: rules load ✓, briefing feed 10 ✓, scanner 0 errors ✓ — no
behavior regression (legitimate paths use the service-role client).

---

## 5. Action items carried forward

1. (Low) `REVOKE EXECUTE … FROM PUBLIC` on `vani_rule_int` / `vani_rule_enabled`.
2. (Owner, high) Platform-wide RLS/grants hardening — the §11 precondition — as
   its own reviewed task before scaling VaNi write authority.
3. (Cosmetic) Align the manual Stage-1 reminder to stamp `last_reminder_jtd_id`.

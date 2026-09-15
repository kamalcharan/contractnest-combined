# Sprint 5 — Repair Report (C.1)

**Generated**: 2026-09-12 (live DB) · **Report-first**: NOTHING has been changed —
every disposition below is a proposal awaiting owner approval. C.2 applies the
approved ones + adds the guard that stops the pile regrowing.

---

## 1. Stuck `requested` appointments — 164 today (was 154 at spec time; it grows)

An appointment in `requested` means someone hit "Book appointment" and nobody
ever confirmed/declined it. Nothing in the product expires them, so dead
requests accumulate forever. Grouped by bucket:

| Bucket | Rows | Evidence | Proposed disposition |
|---|---|---|---|
| **A. signia TEST env** (`is_live=false`) | 73 | CN-1001–1019, 4 per contract, all events 16–17 Aug (one wizard-testing sweep) | **Cancel** (note: "test debris sweep, Sprint 5") |
| **B. signia LIVE env** | 16 | CN-1001–1004, events 15–23 Aug, all past | **Cancel** — signia is the test tenant |
| **C. BBB test env** | 1 | CN-1026, event 31 Mar 2026 | **Cancel** |
| **D. Deleted tenant** (tenant row gone) | 13 | CN-1006/08/09/18/20/47 — 3 on expired contracts; no user can ever act on these | **Cancel** |
| **E. Other tenants, event already in the PAST** | ~54 | Trinity Tecnitions, Hygene Services, Freedom Services, Value Elevators, hubb (8 on one contract), stw (9 on one contract), flow1 — requests for visits whose date already passed (oldest: stw 21 Mar) | **Cancel** — a request to book a visit that already happened is dead; the visit's own overdue state is unaffected |
| **F. Other tenants, event still in the FUTURE** | ~7 | Trinity CN-1004/1010, Freedom CN-1008, Value CN-1005/1009, stw CN-1002 — events 14–17 Sep | **KEEP** — still actionable |

Cancel = `status='cancelled'` + note + `last_activity_at=now()`, audit row per
appointment. Total proposed cancels: **~157**, keeps: **~7**.

**Open question for owner**: are Trinity Tecnitions / Hygene Services /
Freedom Services / Value Elevators / hubb / stw / flow1 real prospects or
demo tenants? Bucket E/F treats them as real (only dead-dated rows cancelled).
If they are demo tenants, say so and E+F collapse into "cancel all".

## 2. Date-stale events — item is now EMPTY

The spec-time "21 date-stale events" (status `scheduled` with a long-past
date) no longer exist: zero events in either `t_contract_events` or `n_jtd`
are `scheduled` with a date > 60 days past. The status engine's overdue
transition has since swept them. **No action.**

## 3. Orphan test events CN-1028–1044 — annotate-only (per spec)

17 signia TEST-env contracts (all `active`, `is_live=false`), 12 n_jtd events
each = **204 events**. Per the original owner decision these are
**annotate-only**: they are test-environment rows, invisible to live surfaces,
and deleting them buys nothing while the V2 soak is running. Annotated here;
no action. (If ever cleaned, do it after cutover Phase 6 via the admin_reset
sweep, not now.)

## 4. C.2 — the guard (applies only after dispositions are approved)

Root cause of the pile: `requested` has no timeout. Proposed guard, applied
with C.2:

- **Auto-expire rule**: a `requested` appointment whose linked visit date is
  more than 7 days in the past flips to `cancelled` (note: "auto-expired —
  visit date passed"), audit row. Implemented as a small SECURITY DEFINER
  function called by the existing 15-minute contract-event scanner cron (no
  new cron), skipping nothing — the rule is date-based, so test debris and
  real dead requests age out alike and the pile can never regrow.

---

**To approve, reply with any of:**
- "approve all" → cancel A+B+C+D+E (~157), keep F, install the C.2 guard
- "approve A–D only" → cancel test/deleted-tenant debris (103), leave real tenants untouched, guard still installed
- Or per-bucket calls (e.g. "E too, but no guard yet").

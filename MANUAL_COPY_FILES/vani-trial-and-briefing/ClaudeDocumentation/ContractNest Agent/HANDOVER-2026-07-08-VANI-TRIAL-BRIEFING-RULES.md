# HANDOVER — VaNi Trial · Briefing · Rules v1 (session 2026-07-08)

> Continues the Operations POA (stages 0–3 shipped 2026-07-07). This session
> built the **real VaNi surface**: 1-week trial, the Briefing page, and a
> tenant-configurable automation-rules engine. Combined-repo branch:
> `claude/handover-stages-0-3-v55jmj`. All work sits in
> `MANUAL_COPY_FILES/vani-trial-and-briefing/`.

---

## 0. Status at a glance

| Piece | Status |
|---|---|
| VaNi menu → **Overview + Briefing** (mocks parked under "VaNi (old)") | 🔶 in owner testing |
| 1-week trial (landing CTA, real `t_bm_tenant_subscription` `product_code='vani'`) | 🔶 testing (DB live) |
| Briefing page (`/vani/briefing`, real scanner/JTD data, deep-links to /ops) | 🔶 testing (DB live) |
| Automation Rules — **Settings → Configure → VaNi group**, view-first cards | 🔶 testing (DB live) |
| Scanner v3 (per-tenant rules; appointment **backlog cutoff** = the flood fix) | ✅ live, 0 errors |
| Security hardening (018) + console cleanup + audit report | ✅ done |

**Owner has NOT said "tested, working"** → submodule Phase-2 commits PENDING.
DB migrations 015–018 ARE applied live (owner agreed to MCP apply this session).

## 1. Design decisions locked this session

1. **VaNi = one virtual employee, human-in-the-loop.** One engine, one paid gate,
   per-domain autonomy dials later. Not separate agents per menu.
2. **Menu = exactly 3 (end-state):** Overview (landing), Briefing, and
   Autonomy & Credits (future). Work happens IN the ops pages via a Human⇄VaNi
   toggle (Stage 5), never in duplicate VaNi pages.
3. **Rules live in Settings → Configure → VaNi group** (not under VaNi menu).
   Curated typed templates with bounded knobs — NO free-form IF/THEN.
   Configure hub is constants-driven (`settingsMenus.ts`), NOT a DB table —
   adding a group = whitelist it in `getGroupedSettingsMetadata`.
4. **Aligned free/paid line: "defaults run for everyone; controlling the
   automation is VaNi."** Rules VISIBLE + running for all tenants; EDITING gated
   on entitlement. Trial expiry keeps edited rules running (only editing locks).
5. **View-first UX:** rules show as read-only value chips; per-card Edit → inputs
   + toggle + Save/Cancel/Reset. Never a permanently-editable form.
6. Trial defaults seeded per tenant at creation (trigger) + backfill; runtime
   COALESCEs to template defaults so a missing row can never break the scanner.

## 2. What shipped (files in the batch)

- **edge/** migrations 015 (trial + briefing + **trigger repair**), 016 (briefing v2),
  017 (rules infra + scanner v3), 018 (security). ALL APPLIED live.
- **api/** `/api/vani`: entitlement · trial/start · briefing · rules GET (free) ·
  rules PUT (gated). `vaniEntitlementService` product-aware.
- **ui/** BriefingPage, Settings→Configure→Automation Rules page,
  `useVaniDeskQueries`, landing trial CTA + "Set your own rules" link,
  menu/route wiring, appointments perspective gate.
- **docs/** STAGE-VANI-TRIAL-BRIEFING.md, AUDIT-REPORT-2026-07-08.md, this file.

## 3. Verified facts (do NOT re-derive)

- DB `uwyqhzotluikawcboldr`. VaNi plan `b0000002-…`, version `c0000002-…`,
  billed via subscription `product_code='vani'` (free-text; NO m_products FK —
  plan row itself uses `contractnest` because that column IS FK'd).
- `plan_type` CHECK = only 'Per User'/'Per Contract'. `status` CHECK includes
  'trial' (NOT 'trialing'). `billing_cycle` ∈ monthly/quarterly/annually.
- 6 rule templates, ALL consumed by scanner v3: service_due_window,
  service_reminder, appointment_request (lead + **backlog_cutoff_days=30**),
  billing_due_window, draft_invoice, payment_reminder. Rules: 942 rows/157 tenants.
- Scanner signature UNCHANGED (5 args) → cron untouched; params are now the
  system fallback, per-tenant rules take precedence via `vani_rule_int/enabled`.
- `VANI_ENTITLEMENT_MODE` stays **open** (everyone passes) until owner flips to
  `subscription`. Trial CTA + states work end-to-end regardless.
- Idempotency/race guards all verified: 0 dup appointments/trials/rules;
  advisory lock + unique indexes + optimistic concurrency (409 on stale edit).

## 4. Security posture (see AUDIT-REPORT-2026-07-08.md for detail)

- **Fixed in 018:** RLS + revokes on `t_vani_rules`/`m_vani_rule_templates`;
  direct anon/auth EXECUTE revoked on all 8 session RPCs; trigger search_path pinned.
- **Residual (low):** `vani_rule_int`/`vani_rule_enabled` still EXECUTE via PUBLIC
  (read-only, RLS-blind rows) — one `REVOKE … FROM PUBLIC` closes it.
- **Out of scope / owner task (high):** platform-wide ~226 anon-executable
  functions + 36 RLS-less tables (ARCHITECTURE §11 precondition). Do before
  scaling VaNi write authority. Don't blanket-enable RLS without policies.

## 5. Next session — start here

1. On "tested, working" → produce consolidated **Phase 2 submodule commit
   commands** (edge/api/ui/docs + parent). Migrations already live; commit is
   code-only.
2. Apply the tiny residual revoke (§4) if desired.
3. **Stage 4 — Tenant JTD visibility + consumption** (POA §5) is next in order.
   Briefing's tenant-scoped RPC discipline is the pattern to reuse.
4. **Stage 5 — VaNi mode** groundwork: Autonomy & Credits page (3rd menu item),
   Human⇄VaNi toggle on /ops pages, dunning ladder. Rules v1 is its substrate.
5. Rules v2 candidates (add only when consumed — honesty rule): channel prefs +
   quiet hours, payment-reminder cadence, lump-sum suppression for emi/recurring,
   dunning rungs.
6. Cleanup pass: delete "VaNi (old)" menu + the 13 mock pages.

Close-out: real VaNi surface built end-to-end (trial → briefing → rules → scanner
v3), all DB live and audited, security holes in today's objects closed. Open the
next session with "read the handover" + either "tested, working" or an issue list.

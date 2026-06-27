# ContractNest Agent — Architecture

> Turning ContractNest into a **100% agentic** application.
> Companion to the UX prototypes in [`./ux/`](./ux/index.html).

**Status:** Design / architecture (pre-build)
**Scope of this doc:** Contacts · Contracts · AR/AP · Service · VaNi (agent runtime)
**Explicitly unchanged:** Auth · Onboarding · JTD · Settings · Catalog-Studio (they become the *rails* the agentic areas run on)

---

## 1. Thesis — agentic ≠ chat, agentic = handholding

In **traditional SaaS** the burden of *knowing* sits on the user: blank forms, menus, multi-step wizards, settings nobody understands. The software is a passive tool waiting for input.

In **agentic SaaS** the burden shifts to the **system**: it knows the user's job-to-be-done, knows where they are in it, arrives with the next best action already prepared, and hand-holds them to the outcome. The user mostly *confirms, corrects, and approves*.

> **The agent does the job. The UI becomes a surface for confirmation, exception-handling, and trust — not data entry.**

Chat is just *one* surface this can express through (WhatsApp/email via VaNi). The essence is the **system driving the work forward instead of waiting** — expressed through next-best-action feeds, pre-filled drafts, proposed-action cards, and guided rails.

Three principles held as invariants:

1. **Intent in, outcome out.** "Renew Acme +8%" → the system drafts the contract, recomputes the schedule, queues approvals. Forms still exist — as *reviewable artifacts the system pre-fills*, not blank slates.
2. **Deterministic core, agentic edge.** The state machine (`m_event_status_config`), billing, RLS, idempotency stay deterministic and authoritative. The agent *proposes*; the engine *enforces*. Agents never become the system of record.
3. **Every capability is a tool; every tool is permissioned.** The API surface becomes a typed tool catalog. An agent's power = the union of the current user's RBAC permissions. No agent can do what the human couldn't.

---

## 2. The two-layer model — one engine, two initiators

ContractNest Agent is **not two products**. It is **one skill engine with two initiators** — a dial, not a switch.

```
                         ┌─────────────────────────────────────────┐
                         │            SHARED SKILL ENGINE            │
   Layer 1: COPILOT  ───▶│  tools · proposed-action envelope ·      │◀───  Layer 2: VaNi
   (user initiates)      │  3 gates · deterministic core · audit    │      (VaNi initiates)
   "I'll do it, the UI   │                                          │      "You handle it,
    hand-holds me"       └─────────────────────────────────────────┘       I approve"
        FREE                                                                  METERED
```

| | **Layer 1 · Copilot (Agentic UI)** | **Layer 2 · VaNi (Autopilot)** |
|---|---|---|
| Who initiates | The user ("pull") | VaNi ("push") |
| Feel | "I'll do it — but the UI hand-holds me" | "You handle it — I'll approve" |
| Form | Next-best-action, pre-filled drafts, zero blank states | Triggered automations: contract creation, service, billing, appointments |
| Human role | Driver; system assists | Supervisor; human-in-the-loop approval |
| Cost | **Included** (free) | **Metered** as top-up credits |
| Shares | tools · proposed-action envelope · deterministic core · audit | ⟵ identical |

**Why this matters:** a contract drafted by the user in Copilot and one drafted by VaNi in Autopilot are the *same action object*, pass the *same guardrails*, and land in the *same audit log* (`actor=user` vs `actor=VaNi`). The only difference is **who pressed go**.

This yields the killer property — **continuity**:
- *"VaNi, handle Acme's renewals from now on"* → hand a job from Layer 1 → Layer 2.
- *"Let me do this one"* → pull it back.

Self-serve and delegate are the same machine at different autonomy settings — not two codebases.

---

## 3. The mode switch — local now, global later

The two layers are exposed through a **mode switch**, **not** duplicate pages. One screen per domain renders both modes via conditional rendering (`body.human` class in the prototype). This avoids ~2× page/maintenance cost for zero new capability.

```
  Human mode (free Copilot)        VaNi mode (paid Autopilot)
  ─────────────────────────        ──────────────────────────
  • You act; UI pre-fills          • VaNi acts; you approve
  • Proposed-action cards hidden   • Proposed-action cards shown
  • "What VaNi did" feed hidden    • "What VaNi did" feed shown
  • No credit chips                • Per-action credit chips
  • Role: doer                     • Role: supervisor
```

### The switch is also the paywall
Human mode = included; flipping to VaNi mode = consuming credits. **The monetization boundary and the UX boundary are the same control.** No credits → VaNi mode is locked (preview/upsell).

### Local → Global (rollout path)
- **Now:** a **local** (per-screen) Human⇄VaNi toggle. Simple, shippable, demoable.
- **Later:** a **global** "running VaNi" switch at app/tenant level. The local toggles inherit the global default; nothing built now is thrown away. The global switch governs *authority to run*; the local toggle remains an override.

### Running vs Viewing — two different axes
A common trap is conflating these in one control:
- **Running VaNi** = *authority*: is VaNi allowed to act here, how far? → the **mode toggle** + **Autonomy settings** (§7).
- **Viewing VaNi** = *observation*: what did VaNi do / what's it waiting on? → a single cross-domain **VaNi Inbox** surface, not per-domain duplicates.

Final structure (no extra pages beyond what you'd build anyway):
- **Per-domain screens** → Human/VaNi toggle (run it here, or do it myself)
- **One VaNi Inbox** → view/approve everything VaNi, everywhere
- **One Autonomy & Credits page** → set how far "running" is allowed

---

## 4. The shared engine — the Next-Best-Action loop

Every area, both layers, runs the same loop:

```
  1. SENSE    read state (contracts, JTDs, onboarding, settings gaps) + context (role, plan, history)
  2. DECIDE   what is the highest-value next step for THIS user right now?
  3. PREPARE  do the safe work (draft, seed, compute, route)
  4. PRESENT  surface as a proposed action — chat, card, or inline rail
  5. ENFORCE  deterministic core (state machine, RBAC, billing, RLS) validates the proposal
  6. AUDIT    write to t_audit_log as actor=VaNi / actor=user
```

Handholding is steps **3 + 4** — the system arriving *with the work mostly done* and walking the user to "yes."

### Decision intelligence — hybrid
ContractNest is config-rich (`m_event_status_config` ≈1,976 rows, 90 JTD flows, the Knowledge Tree), so the system can often *know* the next step deterministically:
- **Deterministic engine** decides *what's next* (state machine, JTD flows, service cycles).
- **LLM** handles *language and the fuzzy edges* (interviewing, drafting, summarizing, entity resolution, classification).

### The proposed-action envelope (core UX + API primitive)
VaNi never silently writes high-risk changes. It returns a typed envelope:
```
ProposedAction {
  intent, summary, persona_view,
  target_tables[], diff/preview,
  gates: { permission, risk_tier, credit_cost },
  expires_at, audit_ref
}
```
The UI renders it (card / WhatsApp / inline rail). The human approves/edits/rejects. On approve → enforce → commit → audit.

---

## 5. The three gates

Every **Autopilot** action passes three gates before it writes:

| Gate | Question | Backed by |
|---|---|---|
| **Permission** | Is this user/agent allowed? | RBAC — `m_permissions`, `t_role_permissions` (agent power ≤ user's role) |
| **Risk** | Does a human need to approve? | Tiered human-in-loop (below) |
| **Affordability** | Can the tenant pay for this action? | `t_bm_credit_balance` (`balance`, `reserved_balance`, per `credit_type`+`channel`) |

### Tiered-by-risk autonomy (the Risk gate)
- **Read / draft** → autonomous
- **Internal state change** → auto + audited
- **Money / customer-facing (send, refund, write-off)** → require approval; money cap (e.g. ₹50k) always asks

### Affordability lifecycle — reserve → commit → release
`reserved_balance` makes metered multi-step jobs safe and fair:
```
  start job   → RESERVE credits (t_bm_credit_balance.reserved_balance)
  success     → COMMIT  (debit; append t_bm_credit_transaction, reference_id = contract/jtd/invoice)
  reject/fail → RELEASE (no charge)
```
Every commit is attributed in the append-only `t_bm_credit_transaction` — full audit of *what every credit bought*.

### Hard rules VaNi can never cross
- Never send money out without approval
- Never delete a contact or contract
- Agent power ≤ the user's own RBAC role
- Stop all autopilot if credits hit 0

---

## 6. VaNi as a metered, omnichannel actor

VaNi today is a **retrieval / intent** assistant (`t_intent_definitions`, `t_chat_sessions`, `t_tool_results`, `t_ai_agent_sessions`). To become the spine it needs three additions:

1. **Write-tools** — the Contact/Contract/Billing/Service actions, permission-scoped.
2. **The proposed-action envelope** — a "do" returns a reviewable artifact, not just text.
3. **Proactivity** — today it's reactive (you open a session); agentic means it *initiates* via JTD channels.

### Inbound → action (the flagship trace)
**WhatsApp: "generate 1 year contract to kamal"**
```
 1. INGEST     WhatsApp inbound → t_ai_agent_sessions (channel=whatsapp), detect language   [t_tenant_integrations]
 2. INTENT     classify → create_contract (requires_ai=true)                                 [t_intent_definitions]
 3. AFFORD     reserve credits                                                               [t_bm_credit_balance.reserved_balance]
 4. RESOLVE    "kamal" → 2 matches → ask to disambiguate (none → propose create)             [t_contacts]
 5. DRAFT      1-year term, 12 events, blocks + tax from template                            [t_contracts, t_contract_blocks, t_contract_events]
 6. RISK GATE  sending is high-risk → wait for "approve" (RBAC checked)
 7. EXECUTE    generate PDF, email via secure link                                           [t_contract_access]
 8. COMMIT     debit credits, attributed                                                     [t_bm_credit_transaction reference_id=CN-...]
 9. AUDIT      every step actor=VaNi                                                         [t_audit_log]
10. LONG TAIL  12 events → VaNi books appointments, opens tickets, chases evidence, invoices, follows up
```
Channels: WhatsApp + email inbound/outbound (renewals, enquiries), in-app proactive nudges via JTD.

---

## 7. Personas — one relationship, two views

| Persona | Does | Sees |
|---|---|---|
| **Tenant as Buyer** | Maintains assets, requests contracts | Vendors · RFQ/accept · **AP** (approve & pay) · asset upkeep |
| **Tenant as Seller** | Issues contracts, services assets | Customers · issue/fulfil · **AR** (invoice & collect) · scheduling |
| **Tenant as Both** | Both | Both columns active |

The cross-tenant link (`t_contract_access`/CNAK, `seller_id`/`buyer_tenant_id`) means **a Seller's AR invoice IS the Buyer's AP item** — the same object, two persona views. Roadmap: when Seller-VaNi books a visit, the counterpart is often another tenant's Buyer-VaNi → **agent-to-agent** booking (human-in-loop both ends). **Phase 1 = human counterpart; A2A later.**

---

## 8. Per-domain design

For each domain: *Copilot view (L1)* · *VaNi automations (L2)* · *persona notes* · *tables*.

### 8.1 Contacts — a self-maintaining graph
You already flagged the problem (`potential_duplicate`, `duplicate_reasons`); agentic is where the system *resolves* it.
- **Copilot:** open a contact, system has deduped, enriched (GSTIN/PAN), classified, proposes the merge.
- **VaNi:** watches inbound (RFQ, WhatsApp, invoice) → creates/links contacts, maintains hierarchy (`manager_id`), flags duplicates.
- **Autonomy:** enrich & classify = auto; **merge = propose-only**.
- **Tables:** `t_contacts`, `t_contact_channels`, `t_contact_addresses`.
- **UX:** [`ux/06-contacts.html`](./ux/06-contacts.html)

### 8.2 Contracts — drafted-from-intent + coordinated
Two-sided, cross-tenant instrument: `rfq_number` + `t_contract_vendors` (quotes), `acceptance_method`, `computed_events`, `evidence_policy`, `prolongation`.
- **Copilot:** "renew Acme +8%" → fully drafted artifact you tweak; zero blank fields.
- **VaNi:** `prolongation_date` approaching → drafts renewal, routes for approval, sends on yes. RFQ path → collects/normalizes vendor quotes, recommends.
- **Autonomy:** draft = auto; **sending always asks you**.
- **Tables:** `t_contracts`, `t_contract_blocks`, `t_contract_events`, `t_contract_access`, `t_cat_templates`, `m_cat_blocks`.
- **UX:** [`ux/03-contract-copilot.html`](./ux/03-contract-copilot.html) (demonstrates the local mode switch)

### 8.3 AR/AP — an autonomous collections + payables desk
Two billing planes; AR/AP framing maps cleanly.
- **AR (seller → customer):** `t_contract_invoice` is already built for autonomy — Razorpay links, `reminder_count`, `last_reminder_sent_at`, `notifications_sent`, settlement/platform_fee.
- **AP (buyer → vendor):** approve & pay; VaNi matches invoice → PO/contract, schedules payment.
- **Copilot:** a collections cockpit; every overdue invoice has a ready-to-send reminder.
- **VaNi — the dunning ladder:** in-app → WhatsApp → call-task (JTD) → settlement (gate) → write-off (gate). Reconciles `t_invoice_receipts`, **pauses itself on disputes** (cross-checks the service ticket).
- **Autonomy:** reminders & reconcile = auto; **settlement & write-off gated**.
- **Tables:** `t_contract_invoice`, `t_invoices`, `t_invoice_receipts`, `t_contract_payment_requests`, `t_contract_payment_events`, `t_bm_credit_transaction`.
- **UX:** [`ux/04-ar-ap-collections.html`](./ux/04-ar-ap-collections.html)
- *Note:* `t_invoices`/`t_invoice_receipts` appear to be an older, simpler invoice path alongside `t_contract_invoice` — confirm which is current before build.

### 8.4 Service — appointments, tickets, evidence
Seller services the Buyer's assets; the Knowledge Tree supplies checkpoints/cycles.
- **Copilot:** drag-drop scheduling; system pre-assigns the right technician by skill/route.
- **VaNi:** books appointment with buyer, opens ticket, assigns tech, pulls checkpoints (`m_equipment_checkpoints`), chases evidence (`upload`/`otp`/`form`), raises invoice on sign-off, flags no-shows.
- **Buyer asset trigger (proactive home):** "chiller 88/90 days → raise an RFQ?" feeds Contracts + Service.
- **Autonomy:** book/ticket/evidence = auto; **reschedule/cancel gated**.
- **Tables:** `t_service_tickets`, `t_service_evidence`, `t_contract_events`, `t_service_ticket_events`, `m_equipment_checkpoints`, `t_client_asset_registry`, `t_equipment`, `m_service_cycles`.
- **UX:** [`ux/05-service-lifecycle.html`](./ux/05-service-lifecycle.html)

---

## 9. Cross-cutting surfaces

| Surface | Role | Tables |
|---|---|---|
| **VaNi Inbox** | *View VaNi* — cross-domain queue of what VaNi did (audit), is proposing (approvals), is mid-flight on | `t_ai_agent_sessions`, `t_chat_sessions`, `t_audit_log` |
| **Autonomy & Credits** | *Govern VaNi* — per-domain Off/Propose/Auto, money cap, hard rules, credit metering & top-ups | `t_bm_credit_balance`, `t_bm_credit_transaction`, `t_bm_topup_pack`, `t_bm_product_config` |
| **NBA Cockpit** | The agentic home — "Needs you" + "What VaNi did" | aggregates all of the above |

UX: [`ux/01-cockpit.html`](./ux/01-cockpit.html) · [`ux/02-vani-whatsapp.html`](./ux/02-vani-whatsapp.html) · [`ux/07-autonomy-credits.html`](./ux/07-autonomy-credits.html)

---

## 10. What stays unchanged (the rails)

Not redesigned — but the agentic domains **write into them**:
- **Auth** — stays deterministic; the agent never authenticates. The *post-login moment* becomes agentic (NBA cockpit instead of a blank dashboard).
- **Onboarding** — feeds the Contacts/Catalog/Resources the Contract & Service agents use (`t_tenant_onboarding`, `t_tenant_selected_resources`).
- **JTD** — **the execution substrate** for proactive collections, appointments, and coordination (`n_jtd*`, channels, status flows).
- **Settings / Catalog-Studio** — unchanged; consumed by the agents.

---

## 11. Guardrails, trust & a security precondition

- **RBAC** — agent power ≤ user role, enforced at the tool layer.
- **Audit** — every agent action append-only in `t_audit_log` (actor=VaNi), immutable.
- **Idempotency** — reuse `api_idempotency`, `t_idempotency_keys` so retried agent actions don't double-write.

> ⚠️ **Security precondition (must fix before granting agents write authority).**
> The DB advisor reports **34 tables with RLS disabled**, including sensitive ones (`t_business_groups`, `t_group_memberships`, `t_tenant_context`, `leads`). With the anon key, anyone can read/write those rows. An agentic layer *amplifies* this (more automated calls, broader surface). **Tighten RLS first**; enabling RLS without policies will block access, so add policies deliberately. This is its own task, not auto-applied here.

---

## 12. Phased rollout

| Phase | Ships | Why first |
|---|---|---|
| **0 · Foundation** | Tool registry + proposed-action envelope + 3 gates + audit wiring; local Human/VaNi switch; credit reserve/commit/release | Everything else reuses this |
| **1 · AR (dunning)** | VaNi collections on `t_contract_invoice` | Already instrumented for autonomy; hard-cash ROI |
| **2 · Service + Appointments** | Booking, tickets, evidence over the 12-visit lifecycle | Highest manual load; JTD-native |
| **3 · Contracts** | Draft-from-intent + renewal automation + WhatsApp create | Strategic; the flagship trace |
| **4 · Contacts** | Self-maintaining graph (dedupe/enrich/classify) | Easiest win; supports all above |
| **5 · Global switch + A2A** | Tenant-level "running VaNi"; agent-to-agent cross-tenant | After trust is established |

---

## 13. Table map (quick reference)

```
Agent runtime   t_ai_agent_sessions · t_chat_sessions · t_intent_definitions · t_tool_results
Metering        t_bm_credit_balance · t_bm_credit_transaction · t_bm_topup_pack · t_bm_product_config
Contacts        t_contacts · t_contact_channels · t_contact_addresses
Contracts       t_contracts · t_contract_blocks · t_contract_events · t_contract_access · t_cat_templates · m_cat_blocks
AR/AP           t_contract_invoice · t_invoices · t_invoice_receipts · t_contract_payment_requests · t_contract_payment_events
Service         t_service_tickets · t_service_evidence · t_service_ticket_events · m_equipment_checkpoints · t_client_asset_registry · t_equipment · m_service_cycles
Enforce/Audit   m_event_status_config · m_event_status_transitions · t_audit_log · api_idempotency · t_idempotency_keys
Rails           t_tenant_onboarding · t_tenant_selected_resources · n_jtd* (JTD) · RBAC (m_permissions, t_role_permissions)
```

---

## 14. UX reference

All seven clickable prototypes live in [`./ux/`](./ux/index.html) (open `index.html`):

1. `01-cockpit.html` — Next-Best-Action cockpit
2. `02-vani-whatsapp.html` — VaNi flagship trace + the three gates
3. `03-contract-copilot.html` — pre-filled contract **with the local Human⇄VaNi switch**
4. `04-ar-ap-collections.html` — the dunning ladder
5. `05-service-lifecycle.html` — 12-visit lifecycle + buyer asset trigger
6. `06-contacts.html` — self-maintaining graph
7. `07-autonomy-credits.html` — the dial (autonomy + metering)

---

*Design doc — ContractNest Agent. Pairs with the `ux/` prototypes. Build sequencing per §12.*

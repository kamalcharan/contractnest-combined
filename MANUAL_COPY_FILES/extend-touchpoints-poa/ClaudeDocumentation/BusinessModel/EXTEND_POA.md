# Extend (Customer Touchpoints) — Plan of Action

**Status**: proposed — approved in discussion 2026-08-10, no code started
**Owner decisions captured**: 2026-08-10 session
**Supersedes**: nothing directly; `MANUAL_COPY_FILES/IMPACT_ANALYSIS_CHANNELS_FOR_TENANTS.md`
(Nov 2025 "Channels for Tenants") remains the long-horizon vision — its chatbot /
WhatsApp-bot / WhatsApp-groups / semantic-profile scope is explicitly **future**, not
part of this feature. This POA is the narrow, contract-native version.
**Read together with**: `BUSINESS_MODEL_V4_POA.md` (the layer this builds on) and
CLAUDE.md "Future Review Items".

---

## 0. The model this is built on (owner clarification, 2026-08-10)

> ContractNest is SaaS. From the contract engine's perspective there is no
> "subscription system" — **Vikuna (`vikunatech@gmail.com`, `is_admin=true`) is a
> SELLER; a subscribing tenant is a BUYER; a plan is a TEMPLATE in Vikuna's
> catalog; buying = assign-template-to-buyer → a real contract.**
>
> Templates are storefronts. "Buy a published template → contract" is a
> **platform primitive**, not a subscription feature. The subscription /
> business-model surface is the first dogfooded instance of it. Tomorrow the
> same primitive lets an HVAC tenant sell "Annual AMC" from his own website.
>
> Every tenant defaults to the **Free plan** (VaNi onboarding will later offer a
> plan choice at signup). All other plan interactions are **BUY / RENEW /
> UPGRADE** — all ordinary contract operations.

### Consequence for existing code (agreed 2026-08-10)

`subscribe_tenant_to_plan` is mostly redundant and partly wrong:

- Its hand-rolled contract construction (blocks rebuilt in SQL, **one fake
  upfront billing event for `template.total`** — "a plan is billed once,
  prepaid") ignores the template's real billing structure. The Quarterly
  template is configured 4 × ₹5,999 over 12 months; the RPC would bill ₹23,996
  once. The assign-template pipeline derives correct events for free.
- Its metering application is trapped inside the RPC, so a plan contract
  created any other way (e.g. Vikuna manually assigning a plan template — the
  most natural act in this model) grants **no entitlements at all**.
- What genuinely remains: cross-tenant authority (acting "as Vikuna" when a
  buyer clicks), `source_tenant_id` contact stamping, plan-policy guards
  (already-subscribed / self-subscription), and the switch semantics.

**Target**: retire the RPC's contract-building; route every purchase through the
real template→contract pipeline; move entitlement application into a
**block-driven settlement trigger** on the contract lifecycle (like
`trg_contract_consumption` / `fn_apply_topup_grants` already ride events):
*"when a contract activates / its invoice is paid, read its blocks; blocks
carrying `config.metering` apply limits / grants / rates / flags to the buyer's
`t_tenant_context`."* Keyed on the blocks, never on "seller is the platform
tenant" — so the same pipe serves tenant-to-customer sales unchanged.

```
BUY / RENEW / UPGRADE / manual assign / touchpoint sale
    → assign-template pipeline (existing) → t_contracts (seller X, buyer Y)
    → contract activates / invoice paid
    → settlement trigger reads blocks → entitlements (if metering) + events/invoices (always)
```

---

## 1. The feature

**Name**: **Extend** (the action; route `/extend`). Each enabled route is a
**Touchpoint** (the noun). Marketing line: *"Extend your templates to your
customer touchpoints — website, WhatsApp, email."*

Naming deliberately avoids "channels" — that word already means notification
channels (`whatsapp/sms/email/inapp` LOV, credit pools) throughout the codebase.

A tenant takes any published template (`is_active + is_live + is_public +
settings.lifecycle='signed_off'` — the existing purchasable gate) and extends it
to touchpoints:

| Touchpoint | Tenant gets | Buyer experience |
|---|---|---|
| **Website** | Embed snippet (script-tag → iframe) + hosted checkout link + QR | Buy button on tenant's site → hosted checkout → pays on tenant's own Razorpay → contract + CNAK link |
| **WhatsApp** | `wa.me` share links with prefilled offer text; broadcast to selected contacts via existing JTD WhatsApp pipe | Taps link in WhatsApp → same hosted checkout |
| **Email** | Send offer to selected contacts via existing JTD email pipe | Clicks link in email → same hosted checkout |

All three converge on **one hosted checkout page** — `/buy/:storefrontKey` — a
public, unauthenticated, CNAK-pattern route (same species as `/checkin/:token`
and `/quote/:cnak/:secret`).

**Why iframe/script-tag for the website**: the tenant's stack (HTML, React,
Angular, WordPress, Python-rendered) is unknown and irrelevant — a script tag
injecting an iframe works in anything that outputs HTML, isolates styling both
ways, and keeps payment on ContractNest's origin. WhatsApp cannot embed JS at
all, so its touchpoint IS the link (WhatsApp Flows later). Framework SDKs /
web components are later sugar over the same two layers, never a separate pipe.

### Pricing (owner, 2026-08-10 — all ex-GST, 12-month term)

| Touchpoint | Price |
|---|---|
| Website | ₹700 / annum |
| WhatsApp | ₹700 / annum |
| Email | **₹0 / annum** |
| Chatbot | future — not in v1 |

Each is sold as a Vikuna template carrying a `flag` metering block →
`addon_extend_website` / `addon_extend_whatsapp` / `addon_extend_email` on
`t_tenant_context.addons`. Bought through the same pack-purchase pipe
(`purchase_topup_template` today; the generic pipe after Phase 0). Email's ₹0
still produces a real contract (the Free plan already proves zero-price works:
no billing event minted, straight to active) so entitlement + renewal lifecycle
is uniform. GST applies once, at invoice (V3 spec §2.6); GST *presentation* on
platform invoices is still the open Sprint-4 item.

**Dogfooding note**: addon flags exist today but are display-only. Extend is
their first real enforcement consumer.

### Billing rule (unchanged, V3 §1A: the creator pays)

Viewing a hosted checkout page is free and **never touches the ledger** (same
discipline as every CNAK path). The *sale* creates a contract in the seller's
book → the **seller** pays for the creation (plan quota, or ₹200 wallet charge)
like any other contract they create. Offer *sends* over WhatsApp/Email ride JTD
and debit the seller's notification credit pools as normal.

---

## 2. What gets built (and what doesn't)

### New — kept deliberately small

1. **Storefront key** — a new grant type in the CNAK/public-access family:
   public, non-secret, revocable, rate-limited; resolves server-side to
   (tenant, template, touchpoint). (The RFQ-award spec in CLAUDE.md already
   anticipated a "CNAK-style grant scoped to contract-creation" — same family.)
2. **`t_touchpoints`** (one table): tenant_id, template_id, touchpoint_type
   (`website|whatsapp|email`), storefront_key, is_active, config JSONB
   (theme, domain allowlist), counters (views, purchases), audit cols.
3. **Hosted checkout page** `/buy/:storefrontKey` — public UI: template as a
   product page → buyer identity capture (name + phone/email → contact in the
   seller's book; `source_tenant_id` stamped when the buyer is a tenant) →
   payment via seller's Razorpay (`get_tenant_gateway_credentials`, existing) →
   template→contract via the generic pipe → CNAK link back to the buyer.
4. **`/extend` route (tenant UI)**: per-template touchpoint cards, lock states
   with Buy CTA (gated on addon flags), snippet/QR/share generators, contact
   pickers for Email/WhatsApp sends, simple views→sales counters.
5. **Settlement trigger** (Phase 0, shared with the subscription realignment):
   block-driven entitlement application on contract activation/payment,
   including `flag` mode.
6. **Serve-time enforcement**: hosted page checks the seller's touchpoint flag
   is active; `/extend` gates the Extend action at publish time.

### Explicitly reused, zero new build

Template publishing gate · assign-template pipeline · `create_contract_transaction` ·
billing-event derivation · invoices/payments · per-tenant Razorpay ·
CNAK public-route patterns · contact framework · JTD send pipes + credit pools ·
pack-purchase pipe · `t_tenant_context` addons.

### Explicitly NOT in v1 (parked, from the Nov 2025 doc)

AI chatbot, WhatsApp bot, WhatsApp groups, semantic user profiles / pgvector,
N8N-orchestrated conversations, framework-native SDKs (React/Angular packages),
WhatsApp Flows. None of these block the storefront pipe; all layer on later.

---

## 3. Phases

| Phase | Scope | Depends on |
|---|---|---|
| **0. Realignment** | Retire `subscribe_tenant_to_plan`'s contract-building → assign-template pipeline; block-driven settlement trigger (limits/grants/rates/**flags**); plan switch = cancel + fresh assign; Free-by-default at tenant creation + backfill; keep guards/contact-stamping as a thin orchestration shim | — |
| **1. Storefront** | Storefront-key grant + `t_touchpoints` + `/buy/:storefrontKey` hosted checkout; Vikuna's plans as the first storefront (a plan you can WhatsApp to a prospect) | 0 |
| **2. Extend route + monetization** | `/extend` tenant UI; Vikuna's three touchpoint addon templates (₹700/₹700/₹0); flag enforcement publish-time + serve-time | 1 |
| **3. Distribution polish** | Embed script (iframe widget) + QR; Email/WhatsApp offer sends via JTD; per-touchpoint counters | 2 |
| **Future** | Chatbot, bots/groups, SDKs, WhatsApp Flows, richer analytics | — |

Each phase is independently shippable. Phase 0 is the entry ticket — it is the
same work already agreed for fixing the subscription model, and everything Extend
adds sits on top of it.

---

## 4. Known open items / risks

1. **RENEW primitive does not exist** — plan/addon expiry today only zeroes
   limits (`trg_fn_plan_contract_lapsed`). Annual touchpoint pricing needs a
   renewal flow (and the lapse trigger must also clear `addon_extend_*` flags
   on expiry of the addon contract that granted them).
2. **GST presentation on platform invoices** — open Sprint-4 item; prices here
   are ex-GST and invoice-time GST is the agreed model.
3. **Buyer identity on public checkout** — decide verification depth (none /
   OTP) and dedupe rule against existing contacts in the seller's book.
4. **Anonymous buyer payment-first flow** — acceptance method for storefront
   sales is effectively `payment`; confirm the existing pre-payment path covers
   an unauthenticated buyer end to end.
5. **Domain allowlist** for website embeds: v1 nice-to-have, not a blocker
   (storefront key is public by design; allowlist only reduces noise).
6. **Rate-limiting / abuse** on the public checkout — reuse whatever CNAK
   routes use; confirm adequacy before real traffic.
7. **The metering-block Edit-mode checkbox bug** (see CLAUDE.md) is still open
   and touches the same authoring surface Vikuna uses for these templates —
   fix before authoring the touchpoint addon templates. The two temp
   `[DEBUG ...]` console.logs are removed as part of that fix.

---

## 5. Decision log (owner, 2026-08-10)

| # | Decision | Outcome |
|---|---|---|
| 1 | Is a separate subscribe RPC needed? | **No** — contract framework carries it; thin authority shim + settlement trigger only |
| 2 | Default plan | **Every tenant defaults to Free**; VaNi onboarding to offer choice later; other plans are BUY/RENEW/UPGRADE |
| 3 | Widget tech given unknown tenant stacks | **Hosted checkout page (Layer 0) + script-tag iframe embed (Layer 1)**; links for WhatsApp; SDKs later |
| 4 | Feature name | **Extend** (action, route `/extend`); **Touchpoint** (noun). Not "Channels" — collides with notification channels |
| 5 | Pricing | Website ₹700/yr · WhatsApp ₹700/yr · Email ₹0/yr, ex-GST, 12-month term |
| 6 | Chatbot | Later — out of v1 |
| 7 | Repo hygiene | ui-pack Repomix dumps deleted + gitignored (`MANUAL_COPY_FILES/cleanup-ui-pack-dumps/`) |

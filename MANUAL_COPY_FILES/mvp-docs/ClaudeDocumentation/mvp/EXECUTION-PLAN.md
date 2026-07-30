# ContractNest MVP — Folder Structure & 5-Sprint Execution Plan

**Owner:** Charan Kamal (Vikuna) · **Drafted:** 28 Jul 2026
**Production tenant:** BBB (39 chapters to onboard — each chapter is its own tenant)
**Pipeline:** AMC · Manufacturing · Pest control · Housekeeping

---

## 0 · The rules that govern every sprint

| # | Rule | Why |
|---|---|---|
| 1 | **UX-only.** No new API route, edge function, table or column. | Makes BBB structurally safe, not merely carefully handled. Delivery batch is one submodule. |
| 2 | **Add, never redesign.** Existing screens (Dashboard, Contract view, Contacts, AR/AP, Sessions) stay as they are. | Redesign is roadmap. Sprint work must not require a regression pass you don't have time for. |
| 3 | **The wizard is untouched.** The express lane sits *beside* it. | BBB uses the wizard daily. |
| 4 | **One-way dependency.** Nothing outside `src/lite/` may import from it. | Keeps the whole surface deletable. |
| 5 | **No deploys Friday night or Saturday.** | BBB's cadence is Saturday; ~1,500 legacy tsc errors mean CI won't catch a regression. |

Every sprint ends in **Phase 1 (copy & test)** → your verification → **Phase 2 (merge)**.
No sprint starts until the previous one is signed off.

---

## 1 · Folder structure

Only `contractnest-ui` is touched. No API batch, no migrations, no edge deploy.

```
contractnest-ui/src/
├── lite/                               ← entire new surface; deletable in one rm -rf
│   ├── LiteApp.tsx                     ← router + providers, mounted at /start/*
│   ├── routes.tsx
│   │
│   ├── landing/                        ← SPRINT 1  (public, unauthenticated, at /)
│   │   ├── LandingPage.tsx
│   │   ├── TradePicker.tsx             ← carries choice into signup
│   │   ├── WorkspaceSlab.tsx           ← the live preview that rebuilds per trade
│   │   ├── HeroDemo.tsx                ← 3-scene loop; swap for <video> later
│   │   ├── previewData.ts              ← per-trade catalog/contract seed shown pre-signup
│   │   └── sections/                   ← Clock · Value · Portal · Proof · Faq · FinalCta
│   │
│   ├── onboarding/                     ← SPRINT 2 + 3
│   │   ├── index.tsx                   ← stepper container + progress rail
│   │   ├── PersonaStep.tsx             ← provide / own / both
│   │   ├── IndustryStep.tsx            ← AMC · pest · housekeeping · manufacturing
│   │   ├── FurnishStep.tsx             ← KT seeding with real counts
│   │   ├── ImportStep.tsx              ← paste → parse → confirm
│   │   └── FirstContractStep.tsx       ← hands into the express lane
│   │
│   ├── express/                        ← SPRINT 3 + 4
│   │   ├── ExpressContract.tsx         ← 5 fields
│   │   ├── BlockPicker.tsx             ← seeded blocks, editable prices
│   │   └── CnakShareCard.tsx           ← key + secret + WhatsApp send
│   │
│   ├── reveal/                         ← SPRINT 1
│   │   ├── useReveal.ts                ← one hook: useReveal('perspective') → bool
│   │   ├── revealRules.ts              ← the table in §3, as data
│   │   └── RevealGate.tsx              ← <RevealGate id="..."> wrapper
│   │
│   ├── components/                     ← lite-only; nothing else may import
│   │   ├── StepRail.tsx
│   │   ├── PasteGrid.tsx
│   │   ├── SeedProgress.tsx
│   │   └── StatusPill.tsx
│   │
│   ├── api/                            ← wrappers over EXISTING endpoints only
│   │   ├── liteClient.ts               ← wraps existing client + auth, adds nothing
│   │   └── mappers/
│   │       ├── expressContract.ts      ← 5 fields → full wizard-shaped payload
│   │       └── importRow.ts            ← pasted row → contact + contract payloads
│   │
│   ├── types/lite.ts
│   └── theme/tokens.css                ← scoped to .lite-root
│
└── (all existing folders untouched)
```

**Enforce rule 4 in `.eslintrc`:**

```js
overrides: [
  { files: ['src/lite/**'], rules: { 'no-restricted-imports': ['error', { patterns: [
      '**/components/contracts/ContractWizard/**', '**/pages/contracts/**',
      '**/components/catalog-studio/**', '**/components/group-sessions/**' ]}]}},
  { files: ['src/!(lite)/**'], rules: { 'no-restricted-imports': ['error', {
      patterns: ['**/lite/**'] }]}},
]
```

**Delivery per sprint (your existing workflow):**

```
MANUAL_COPY_FILES/mvp-sprint-<n>/
├── contractnest-ui/src/lite/…
└── COPY_INSTRUCTIONS.txt
```

---

## 2 · The five sprints

### Sprint 1 — Landing page + reveal schedule + scaffold
*The front door comes first: nobody reaches onboarding without it. Then make the
existing product look small.*

**Build**
- **Landing page** (`src/lite/landing/`) — public, unauthenticated, at `/`:
  hero (copy left, **looping 3-scene demo right**: write the contract → CNAK on
  WhatsApp → client accepts, clock landing on 3:00) → trade picker → **live
  workspace slab that rebuilds per trade** → 15-minute strip → client-portal
  proof → proof band → FAQ → final CTA.
  The demo is a **swappable slot**: when the screen recording exists, replace the
  inner `.demostage` with a muted autoplay `<video>` and keep the frame, clock
  chip and caption.
  The picked trade carries into signup so onboarding never re-asks it.
  Reference: `landing-page.html` in this folder.
- `src/lite/` scaffold: route mount at `/start/*`, layout shell, tokens.
- `reveal/` module: rules table, `useReveal` hook, `RevealGate` wrapper.
- Apply gates to the existing app **by wrapping only** — no logic edits:
  Test/Live badge · Revenue/Expense toggle · Payables tab · Group Sessions nav ·
  Catalog Studio nav · SLA % tiles · empty charts / renewals radar.
- ESLint import rules committed.

**Verify (you)**
- [ ] Hero demo loops cleanly on repeat, starts on scroll-into-view, and shows the
      final signed state (no motion) under `prefers-reduced-motion`.
- [ ] Landing loads logged-out; all four trades rebuild the slab with correct
      catalog counts, contract and year-strip — no flicker, no layout shift.
- [ ] Landing is fast on a mid-range Android over mobile data (target LCP < 2.5s).
- [ ] Trade picked on landing arrives in signup — onboarding does **not** ask again.
- [ ] Every nav anchor resolves; both themes render; keyboard focus visible throughout.
- [ ] Placeholder proof block replaced or removed — **no unapproved customer
      names, logos or testimonials ship.**
- [ ] A brand-new tenant sees: Dashboard · Contracts · Contacts · Receivables · Get Started. Nothing else.
- [ ] BBB's login is visually **identical** to before — every gate open for them.
- [ ] Toggling a rule in `revealRules.ts` shows/hides without any other change.
- [ ] `npm run build` produces no *new* tsc errors versus baseline.

**Sign-off:** "Sprint 1 verified" → merge.
**Rollback:** delete `src/lite/`, revert the wrapper commits. No data touched.

---

### Sprint 2 — Express onboarding (RESCOPED after measuring the existing flow)
*The first half of the 15 minutes.*

**What we found:** all of this already existed. The VaNi onboarding has 25 step
components and `TOTAL_STEPS = 11`; tracing forward navigation gives a real chain of
**~16 screens** (vani-intro → user-profile → business-details → persona-selection →
engagement-model → theme-selection → industry-selection → resource-pick → vani-consent →
vani-intelligence → vani-working → pricing-review → terms-conditions → equipment →
lov-setup → done). So Sprint 2 became **cut the path, not build it**.

**Owner decisions:** keep pricing-review, equipment and terms-conditions; build the
express path *beside* the existing flow rather than trimming it in place.

**Built**
- `/start` — business name + persona (replaces 4 screens). Same profile write as the
  existing PersonaSelectionStep: `POST /api/tenant-profile` with the
  persona + business_type_id dual-write, then `completeVaniStep`.
- `/start/trade` — served industries (replaces 5 screens), pre-selected from the trade
  the visitor picked on the public landing page.
- Handoff to **`/onboarding/vani-working`** — the existing seeding step and everything
  after it (pricing → terms → equipment → lov-setup → done) runs unmodified.
- Net: ~16 screens → ~7. The long form stays reachable at `/onboarding`, linked from
  the first express screen.

**Verify (you)**
- [ ] `/start` → `/start/trade` → seeding runs exactly as it does today.
- [ ] Stopwatch: signup → furnished workspace in **≤ 6 minutes**.
- [ ] Landing carry-over: a trade picked on the landing pre-selects the industry.
- [ ] An industry with no KT data still completes and lands in a usable workspace.
- [ ] The long form still works end to end at `/onboarding`.
- [ ] Nothing in BBB's tenant changed.

**Sign-off:** "Sprint 2 verified" → merge.

---

### Sprint 3 — Paste import + express contract lane
*The second half of the 15 minutes.*

**Build**
- `ImportStep`: paste → parse → preview table → confirm. Throttled sequential creates
  with a progress bar; batch cap; errors surfaced per row, never silent.
- `ExpressContract`: 5 fields (client · blocks · term · billing · start) with blocks
  pre-filled from the seed.
- `mappers/expressContract.ts`: builds the **full wizard-shaped payload** so the API
  sees a request identical to the wizard's.

**Verify (you)**
- [ ] Paste a **real** AMC register (a live one, not sample data) — rows parse, errors readable.
- [ ] Express contract creates the same events a wizard contract does — compare one
      against one built in the wizard, field by field.
- [ ] Visit + billing schedules generate correctly for quarterly and annual.
- [ ] Import of 50 rows completes without hammering the API.

**Sign-off:** "Sprint 3 verified" → merge.

---

### Sprint 4 — The send: CNAK + client link
*The finish line. Activation = sent, not created.*

**Build**
- `CnakShareCard`: key + secret, WhatsApp send via existing MSG91 delivery, copy link.
- Make **"Create & send"** the primary action; "Save as draft" the ghost.
- Client link verification pass on the existing public route: accept → contract active.
- Payment affordance reads the tenant's existing `/settings/integrations` mode
  (UPI-offline or Razorpay). Nothing new built.

**Verify (you)**
- [ ] Send a real contract to a real phone; message arrives, link opens with no login.
- [ ] Accept from the phone → contract flips to Active on the seller side.
- [ ] Razorpay tenant sees a Razorpay affordance; UPI-offline tenant sees QR + bank.
- [ ] Full run signup → sent lands **under 15 minutes**, stopwatch.

**Sign-off:** "Sprint 4 verified" → merge.

---

### Sprint 5 — Harden + onboard BBB chapters #2 and #3
*Prove it on a paying customer before a cold prospect sees it.*

**Build / check**
- Public pages: `no-store` headers confirmed, IST date handling confirmed,
  tested on a low-end Android over mobile data.
- Fix the top 3 frictions observed during the live onboardings.
- Activation instrumentation: tenant has ≥5 contracts and ≥1 send.

**Verify (you)**
- [ ] BBB chapter #2 onboarded end-to-end by you. **Stopwatch recorded.**
- [ ] BBB chapter #3 onboarded — **target: under 30 minutes of your time.**
- [ ] Both chapters' check-in and group-session flows still work untouched.
- [ ] One real client received a real contract or reminder.
- [ ] Zero BBB incidents across the whole programme.

**Sign-off:** "Sprint 5 verified" → MVP is live.
**The number that matters:** if chapter #4 onboards in under 30 minutes, chapters
#5–39 are a scheduling problem, not an engineering one.

---

## 3 · Reveal rules (Sprint 1 data table)

| id | Surface | Unlocks when |
|---|---|---|
| `env-badge` | Test/Live badge | never by default — everyone on Live |
| `perspective` | Revenue/Expense toggle | first vendor contract exists |
| `payables` | AP tab | first vendor contract exists |
| `group-sessions` | Group Sessions nav | industry needs it (BBB chapters: on) |
| `catalog-studio` | Catalog Studio nav | 5+ contracts, or via a block's edit link |
| `sla-metrics` | SLA % tiles & columns | 3+ completed visits |
| `charts` | Billing chart, renewals radar | 2+ months of billing data |
| `discount` | Contract-level discount | hidden on first-contract create only |
| `contact-tabs` | Assets / Timeline tabs | first visit logged / first portal open |

---

## 4 · Out of scope for all five sprints

Redesigning live screens · collapsing the 13-step wizard · any API/edge/table change ·
GST e-invoicing or replacing Tally · technician mobile app · SLA penalty math ·
new KT curation · SmartForms · UPI intent deep links · VaNi convergence (week 3+) ·
migrating BBB to the new surface · fitness expansion · FamilyKnows.

Ideas re-enter only when a paying tenant asks **twice**.

---

## 5 · Done means

| Metric | Target |
|---|---|
| BBB chapters onboarded through the new flow | 2 |
| New pipeline tenants live with ₹1,999 agreed in writing | 2–3 |
| Founder time per onboarding | < 30 min |
| Signup → sent | < 15 min |
| Real customer sends | ≥ 1 |
| BBB incidents | 0 |

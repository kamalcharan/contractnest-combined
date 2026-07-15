# Landing Page v4 — Implementation Spec (Playground-Led, KT-Powered)

**Date:** 2026-07-12
**Status:** Approved-direction mock exists (`landing-page-mock.html`, same folder). NO repo code written yet.
**Owner decision inputs:** partner brief PDF (ContractNest_Partner_Brief_3), CRO discussion, per-contract + per-month credits model.
**Build slot:** Track A (landing files only — does NOT conflict with the live `bbb-foundation` session, EXCEPT `App.tsx` route additions which wait for merge).
**Companion docs:** `HANDOVER_UX_AND_METERING.md` (WizardShell UX), `HANDOVER_BUSINESS_MODEL_METERING.md` (credits/metering model).

---

## 0. One-paragraph thesis

Replace "read about the product, then give us your email" with "**build a real contract in 60 seconds, then keep it**." The playground is the conversion engine; every CTA on the page funnels into it. KT master data powers it with **no tenant and no backend**. Behaviour silently captures the ICP; the register gate lands at the moment of ownership; the draft becomes an onboarding *input* (same KT source → no data conflict); return visits get an industry-personalized hero. One pricing truth (contract credits) everywhere, including visible FAQ = AEO source parity.

---

## 1. Page structure (final section order)

| # | Section | Anchor | Notes |
|---|---------|--------|-------|
| 1 | Sticky nav | — | Links: Why `#problem` · Playground `#playground` · VaNi `#vani` · Customers `#proof` · Pricing `#pricing` · FAQ `#faq` + Login + "Build a contract →". **Every anchor must resolve** (current live bug: `#features` is dead). |
| 2 | Hero | — | Headline "YOUR CONTRACTS RUN YOUR BUSINESS. / UNTIL THEY DON'T." + both-sides line. **Primary CTA = "Build your first contract — free, no signup" → `#playground`.** Waitlist line ("90+ businesses waitlisted · free beta · no card") is supporting microcopy, not the ask. Right column: cockpit preview (reuse/trim `CockpitPreviewMock`) + a VaNi narrative callout. Stats row: 45→80% SLA (pilot hospital) · 600+ packages · 400+ deployments · 250→2 hrs (pilot, with VaNi). Ticker of industries. |
| 3 | Who this is for | `#who` | 9 ICP tiles (from brief). **Clicking a tile jumps INTO the playground at the services step with that industry pre-loaded** (side defaults to seller; the click records the industry signal). |
| 4 | The Problem | `#problem` | Brief's 5 Without/With pairs, two-column red/green. $700B / 65% stat line. |
| 5 | Two sides, one platform | `#sides` | Revenue-side and cost-side cards with ⇄. |
| 6 | **Playground** | `#playground` | The centerpiece. Full spec in §2. |
| 7 | VaNi | `#vani` | 6 capability cards + 250→2hrs / 15× ROI / 4 depts + beta line (₹5,000/mo, 8 pilot slots). |
| 8 | Proof | `#proof` | 3 anonymized testimonials from the brief with their own stats. **Waitlist count appears ONCE on the page (hero)** — kills the current 12+ vs 90+ contradiction. |
| 9 | Pricing | `#pricing` | Credits model — single truth (§4). |
| 10 | FAQ | `#faq` | 5 visible Q&As; JSON-LD FAQPage mirrors them **word-for-word** (§6). |
| 11 | Founding CTA | — | 12 founders · lifelong 40% · N spots remaining → CTA funnels to `#playground`. |
| 12 | Footer | — | contractnest.com (NOT railway URLs; fix the brief's `wwww.` typo wherever reused). |

Design system: V3 Vikuna Black (#0D0F14, amber #F5A623/#FFB733, DM Sans/DM Mono/Bebas). Fonts belong in `index.html` head, not runtime-injected (current HeroV3 injects via JS).

---

## 2. The Playground (core feature)

### 2.1 Flow (state machine)

```
side (fork) ──seller──► industry ──► pick services ──► terms ──► review ──► gate ──► onboarding-import
     └──buyer──► buyer-teaser (signal captured; CTA back to seller flow)
```

- **Side fork:** "I provide services" (live) / "I hire vendors" (teaser: 3-row vendor board mock — Metro Heights overdue / Pinnacle pending / Sunrise on-track; capture `side=buyer` signal; CTA "Try the seller flow instead"). Buyer playground is a later phase.
- **Industry:** 9 tiles (same data as §1 row 3 — one component, two placements).
- **Pick services:** rows from the KT snapshot: name+model · cycle · visits/yr · checkpoint summary · reference price/visit. Multi-select. KT provenance note ("same master data that seeds your catalog when you register"). Continue disabled until ≥1 pick, with reason text.
- **Terms:** duration (12/24/36 months) + emergency-response toggle (+15%). Exactly two decisions; everything else is post-registration.
- **Review:** contract sheet — line items with visits-over-term math, emergency line, total value bar, chips (N events · N blocks · SLA clock · evidence-before-invoice · auto-invoice), **edit links back to services/terms**. This is the WizardShell review-first pattern skinned for landing.
- **Gate:** "Don't lose this contract" + draft value/events in copy. Fields: business name + email, inline validation. Button: "Create free account & keep my draft". Microcopy: FREE BETA · NO CARD · 3 CONTRACT CREDITS.
- **Onboarding-import screen** (in real build this is the first in-app screen post-signup; on landing mock it demonstrates): 3 done (✓ industry from playground · ✓ catalog seeded from KT · ✓ draft imported) + 2 todo (business profile · invite team/counterparty).

### 2.2 Contract math

```
value  = Σ pick.pricePerVisit × pick.visitsPerYear × (durationMonths/12)   × 1.15 if emergency
events = Σ round(visitsPerYear × years)
```

### 2.3 KT snapshot (the no-tenant trick)

- **Build-time generated static JSON** (`public/kt-snapshot.json` or bundled TS module) from KT master tables: `m_equipment_checkpoints → m_service_cycles → m_equipment_variants → prices`, flattened per industry to: `{ id, name, cycleLabel, visitsPerYear, referencePricePerVisit, checkpointSummary }`.
- Generation script lives in the repo (`scripts/generate-kt-snapshot.ts`), runs against Supabase at build time; snapshot is committed so builds never require DB access.
- 9 industries × 3–5 items each. Content of the mock's `KT` object = the editorial baseline; replace prices/items with real KT values when generating. Industries without KT master data (CA, real estate, pest, IT, wellness) keep **curated snapshot entries** (hand-authored in the generator's seed file) until KT covers services (see CLAUDE.md "Service KT" future item).

### 2.4 Draft persistence & handoff (registration contract)

- localStorage key `cn-playground-draft`: `{ industry, side, picks[], durationMonths, emergency, valueEstimate, businessName, email, createdAt, ktVersion }`.
- Gate submit → redirect to `${VITE_SIGNUP_URL}?src=playground&draft=<id>` where the draft payload is either (a) POSTed to a lightweight `playground-drafts` endpoint returning an id, or (b) v1: carried in localStorage only (same-device assumption) with `src=playground` flag. **v1 = (b)**; (a) when cross-device resume is wanted.
- **Post-signup import (Track B, after bbb merge):** onboarding reads the draft → pre-answers industry step → seeds catalog via existing KT seeding for that industry → maps draft picks onto seeded blocks **by KT key (not id)** → creates a draft contract via existing wizard-state draft mechanism → shows the "3 of 5 done" screen. No new data model: playground and onboarding read the same KT, so reconciliation is a key lookup.

### 2.5 ICP capture

- Signals (all client-side, no forms): `side`, `industry`, `picks count`, `term`, `estimated value`, `email` (only at gate), plus scroll-depth/section-visibility once analytics is live.
- Stored in the same localStorage draft + fired as analytics events (§7).
- The mock's visible "ICP capture — live" panel is a **founder demo aid — do NOT ship it**; production capture is invisible.

### 2.6 Return-visit personalization

- On load, if `cn-playground-draft` exists: swap hero eyebrow ("For Healthcare & Hospitals"), headline first two lines (per-industry variants — see mock's `KT[k].hero`), and render a "Welcome back — resume your ₹X draft" chip. Resume jumps straight to the playground review step with state rehydrated.
- Later (Track B): same personalization keyed off `?ind=` UTM/URL param for campaign traffic and off the static industry pages (§6).

---

## 3. What we do NOT carry over from the current live page

- `#features` dead anchor; hidden sections (LandingStats/Features/Testimonials/Industries/DualPersonaTimeline/LandingCTA imports) — **delete the dead generations** (`1*.tsx`, old `Landing*` sections that V4 doesn't use, `landingPage-original theme.tsx`).
- JSON-LD `aggregateRating` 4.9/127 — **remove immediately (Google manual-action risk), independent of V4**.
- JSON-LD/FAQ pricing "₹150/contract/quarter · first 10 free" — replaced by §4.
- Railway fallback URLs in `signupUrl`/`loginUrl` defaults.
- `dangerouslySetInnerHTML` performance <script> (doesn't execute reliably) — replace with a proper analytics module.
- Video modal placeholder, calendly link (until a real calendar exists), newsletter/resource-download console.log no-ops — remove or wire.
- ValueCalculator/UrgencyElements CRO components — drop from v4 (playground replaces them as the engagement device); archive if wanted.

---

## 4. Pricing — the single truth (credits model)

> "Pay for the work. Not the seat." Credits, not per-user licences.

| Plan | Credits | Price | Notes |
|------|---------|-------|-------|
| Free | 3 contracts | ₹0 | no card |
| Quarterly | 90 / quarter | **₹5,999 founder** (₹7,999 list) | +₹50/extra contract · MOST POPULAR |
| Annual | 500 / year | **₹18,999 founder** (₹27,999 list) | save 39% · +₹50/extra |
| VaNi add-on | — | ₹5,000/month beta | limited 8 pilot slots · 15× ROI at pilot hospital |

- This table is THE source: page pricing section, FAQ answer, JSON-LD offers, and the partner brief must all match it.
- RFQ credits (the live page mentions 5 RFQs/mo, ₹100/RFQ) — **owner to confirm** whether RFQs appear on the public page in v4 or stay in-product. Mock omits them for clarity.
- Maps to the metering design: plan = contract-template of metering blocks; credits = the ledger (`HANDOVER_BUSINESS_MODEL_METERING.md` §5).

---

## 5. Component plan (contractnest-ui)

```
src/pages/public/LandingPage.tsx          → rewritten shell (thin: SEO head + section composition)
src/components/landing/v4/
  NavBar.tsx
  Hero.tsx                                 (incl. personalization hook)
  CockpitPreview.tsx                       (trimmed from CockpitPreviewMock)
  IcpTiles.tsx                             (shared by §1-row-3 and playground industry step)
  ProblemVs.tsx
  TwoSides.tsx
  Playground/
    index.tsx                              (state machine)
    ktSnapshot.ts (generated)              (or fetch of /kt-snapshot.json)
    steps: SideFork, BuyerTeaser, IndustryStep, PickStep, TermsStep, ReviewStep, GateStep
    OnboardingPreview.tsx                  (the "3 of 5 done" screen; real import is Track B)
    useDraft.ts                            (localStorage persistence + resume)
  VaniSection.tsx
  ProofQuotes.tsx
  PricingCredits.tsx                       (renders §4 table from one const)
  FaqSection.tsx                           (data const shared with JSON-LD builder)
  FooterV4.tsx
src/components/landing/personalization.ts  (read draft → hero variant)
scripts/generate-kt-snapshot.ts
```

- Old `components/landing/*` stays untouched until v4 ships behind a flag/route, then delete per §3.
- Rollout: build v4 at `/v4` (temp route — **needs App.tsx, so after bbb merge**; or replace LandingPage in place if owner prefers big-bang).
- State: plain useState within Playground; no global store. WizardShell adoption later replaces the internals, not the flow.

---

## 6. SEO / AEO requirements

1. **Prerender** the landing (and industry pages) to static HTML at build (`vite-plugin-prerender` or equivalent SSG pass). This is the #1 item — SPA-rendered copy is invisible to most answer engines.
2. JSON-LD: Organization + SoftwareApplication (offers = §4, **no aggregateRating until real reviews exist**) + FAQPage generated **from the same FaqSection data const** (guaranteed parity).
3. Nine static industry pages `/industry/:slug` (healthcare, amc, wellness, hvac, oem, pest, ca, realestate, it): expanded ICP-tile copy, industry problem/solution, industry playground deep-link (`#playground` with `?ind=` preselect), industry FAQ. These are the long-tail SEO + AEO answers + personalization targets. (Routes → post-merge.)
4. `sitemap.xml`, `robots.txt`, `llms.txt` (product summary, pricing, industries, FAQ answers).
5. Canonical/OG on contractnest.com; kill railway fallbacks.
6. Meta/OG images regenerated to match V4 hero.

---

## 7. Analytics (currently 100% dead — no gtag loader exists)

- Load GA4 (or owner's pick — PostHog worth considering for funnels) in `index.html`; remove the `typeof gtag` guards pattern by wrapping in a `track()` module.
- Funnel events: `pg_side_selected {side}` · `pg_industry_selected {industry, source: tile|step}` · `pg_service_toggled {id}` · `pg_terms_set {months, emergency}` · `pg_review_viewed {value, events}` · `pg_gate_viewed` · `pg_gate_submitted` · `pg_signup_redirect` · `hero_cta_click` · `pricing_plan_click {plan}` · `return_visit {industry}` · `resume_draft`.
- North-star metrics: playground start rate, review-reached rate, gate conversion, signup-with-draft rate, time-to-first-contract post-signup.

---

## 8. Build order & dependencies

| Step | Contents | Depends on |
|------|----------|-----------|
| 1 | Hygiene batch (remove fake rating, railway URLs, dead anchor, dead code; load analytics) | nothing — do first, on current page |
| 2 | KT snapshot generator + snapshot | Supabase read access at build |
| 3 | Playground component + draft persistence + gate redirect | 2 |
| 4 | V4 sections (hero, problem, sides, VaNi, proof, pricing, FAQ, footer) | design sign-off on mock |
| 5 | Personalization (return visit) | 3 |
| 6 | Prerender + sitemap/llms.txt + JSON-LD parity | 4 |
| 7 | Industry pages + routes; `/v4` → `/` swap | **bbb-foundation merged** (App.tsx) |
| 8 | Onboarding draft-import ("3 of 5 done" for real) | **bbb merge** + onboarding work (Track B) |

Definition of done for v4 launch = steps 1–6 live with seller playground; 7–8 fast-follow.

---

## 9. Acceptance criteria (test these, they're all verified in the mock)

- [ ] Every nav anchor scrolls to an existing section.
- [ ] ICP tile click lands on playground services step with that industry loaded.
- [ ] Continue on services step is disabled with visible reason until ≥1 pick.
- [ ] Review math: Σ(price × visits/yr × years), +15% emergency; event count correct.
- [ ] Edit-from-review round-trips (services/terms → back to review).
- [ ] Gate validates inline (business name, email format) — never silently.
- [ ] Draft survives reload; return visit personalizes hero + shows resume chip; resume lands on review with state intact.
- [ ] Buyer fork records signal and shows teaser, returns to seller flow.
- [ ] Pricing section, FAQ answers, and JSON-LD offers are generated from one constant.
- [ ] No aggregateRating in structured data; no railway URLs anywhere.
- [ ] Analytics events fire for the §7 funnel.
- [ ] Lighthouse: prerendered HTML contains hero copy, FAQ text, pricing (view-source test).

---

## 10. Theme reference (Vikuna Black — the landing design system)

Source of truth in repo: `src/config/theme/themes/vikunaBlack.ts` (**dark mode block** — the landing always renders dark; `HeroV3.tsx:14` already pins `VikunaBlackTheme.darkMode.colors`). The mock uses values tuned slightly around those tokens; on implementation, **read from the theme object, don't hardcode** — the table maps every mock value to its theme key.

### 10.1 Color tokens

| Role | Mock value | Repo token (`VikunaBlackTheme.darkMode.colors`) | Usage |
|------|-----------|--------------------------------------------------|-------|
| Page background | `#0D0F14` | `utility.primaryBackground` | body, hero |
| Surface (cards/panels) | `#14171E` (mock) / `#13161D` (theme) | `utility.secondaryBackground` | tiles, quote cards, plan cards, cockpit |
| Surface-2 (elevated/nested) | `#1B1F28` (mock) / `#1C2030` (theme) | `brand.alternate` | nav blur base, inputs, nested rows, panels inside playground |
| Primary text | `#F2F3F5` (mock) / `#E8E6E0` (theme) | `utility.primaryText` | headings, body |
| Muted text | `#9AA1AD` (mock) / `#7A8099` (theme) | `utility.secondaryText` | subs, list items |
| Faint text / disabled | `#5E6672` (mock) / `#3A3F52` (theme) | `brand.tertiary` | mono labels, ticker, hints |
| Hairline borders | `rgba(255,255,255,0.09)` | derive from `brand.tertiary` at low alpha | all card/section borders |
| **Accent (amber)** | `#F5A623` | `brand.primary` | eyebrows, highlighted headline lines, CTAs, prices, selected states |
| Accent hover | `#FFB733` | (hover shade — add as constant) | button hover only |
| On-accent text | `#14130E` | — | text on amber buttons |
| Success / "with" | `#3DD68C` (+ `rgba(61,214,140,0.12)` soft) | `semantic.success` | with-column, done states, ok chips |
| Danger / "without" | `#F06A55` | `semantic.error` | without-column, overdue chips, validation |

Rules: amber is THE accent — one accent per screen region; semantic green/red never substitute for it. Amber tints for selected/hover fills at 6–8% alpha (`rgba(245,166,35,0.06–0.08)`), dashed amber borders (35–40% alpha) reserved for "meta" callouts (KT provenance note, VaNi callout, add-on box).

### 10.2 Typography

| Role | Family | Treatment |
|------|--------|-----------|
| Display (headlines) | **Bebas Neue** (repo already loads it in HeroV3; move the `<link>` to `index.html`) | ALL-CAPS, `line-height 0.92–0.95`, `letter-spacing 0.015–0.02em`, `clamp()` sizes: hero `clamp(2.6rem,5.4vw,4.6rem)`, section h2 `clamp(1.9rem,4vw,3rem)`. Mock fallback stack (font-weight 800 condensed system) is for the CSP'd mock only — real build uses Bebas. |
| Headline color pattern | — | 3-line hero: line 1 primary text, line 2 **amber**, line 3 primary at `opacity 0.22–0.25`. Section h2: white + amber phrase. |
| Body / UI | **DM Sans** (300/400/500/600) | body 15.5px, `line-height 1.55`; `.sub` copy weight 300, muted color, max-width 60–62ch. |
| Data / labels | **DM Mono** (400/500) | eyebrows, tickers, chips, step rails, prices' sublabels: `0.58–0.7rem`, `letter-spacing 0.06–0.16em`, UPPERCASE. |
| Numerals | — | `font-variant-numeric: tabular-nums` on all money/stat figures. |

Eyebrow pattern: 30px amber rule + DM Mono uppercase amber text, 16px below to heading.

### 10.3 Shape, depth, motion

- Radii: cards/panels **12–14px**; inputs/buttons **8–9px**; chips/pills **999px**; playground frame **18px** with amber 35%-alpha border.
- Shadows: only on floating elements (cockpit `0 24px 60px rgba(0,0,0,0.45)`, ICP/notes panels `0 10px 30px rgba(0,0,0,0.5)`); flat cards elsewhere — borders do the separation.
- Background texture: 52px grid lines at `rgba(255,255,255,0.045–0.05)`, masked to fade (hero only); optional SVG noise overlay at 4% (current HeroV3 pattern).
- Motion: fade-up on hero load (0.6–0.8s staggered), ticker `translateX(-50%)` loop 30–32s linear, hover `translateY(-1/-2px)` on tiles/CTAs, onboarding checklist staggered fade-in. **All gated by `prefers-reduced-motion`.**
- Buttons: primary = amber bg / near-black text / 700 weight; ghost = transparent, muted text, surface-2 hover; outline = hairline border, amber on hover. Disabled = 40% opacity + not-allowed (only where a reason is shown beside it).

### 10.4 Component patterns introduced by the mock (keep names)

`tile` (ICP/capability card + hover-reveal "try" line) · `rowline` (selectable service row: checkbox / name+mono detail / price-per-visit right) · `sheet` (contract review: head/body/`totalbar` with amber 50% top border + 5% amber wash) · `statchips` (mono uppercase pill facts) · `vs` (red/green problem columns) · `plan` (pricing card, `hot` variant = amber ring + floating badge, struck-through list price) · `steps` (mono pill step rail: done=green ✓, current=amber) · `kt-note` (dashed amber provenance callout) · `ret-chip` (return-visit pill in hero).

### 10.5 Theme governance

- Landing is **deliberately single-theme dark** — no `prefers-color-scheme` handling on the public page (product app keeps its own theming).
- New v4 components take colors from `VikunaBlackTheme.darkMode.colors` via one small `landingTheme.ts` re-export (so the palette can be tuned in ONE file); no inline hex except the two derived values (hover amber, on-accent ink) which live in that same file.
- If mock-vs-theme deltas matter (e.g. mock `#F2F3F5` text vs theme `#E8E6E0` cream), owner picks during review; default = keep repo theme values.

---

## 11. Open items for owner

1. Confirm §4 pricing as the single truth (incl. whether RFQ credits appear publicly in v4).
2. "6 spots remaining" — live counter or manual copy? (Manual = fine for v1; just keep it truthful.)
3. GA4 vs PostHog (funnel analysis favors PostHog; GA4 is fine to start).
4. Big-bang replace `/` or stage at `/v4` first?
5. Which stats are safe to publish as-is vs need "pilot" framing — final wording pass on the four hero stats.
6. Curated snapshot content for non-equipment industries (CA/wellness/pest/RE/IT) — owner review of the mock's items & prices as the seed.

# ContractNest Lite — folder structure & isolation rules

The 7-day express surface. Lives **inside the existing repos** as one self-contained,
deletable folder tree per repo. No new repo, no new build pipeline, no new deploy.

Namespace is `lite` everywhere (not `express` — that word already means Express.js in
the API). Product name can still be "ContractNest Express" externally.

---

## contractnest-ui

```
contractnest-ui/src/
├── lite/                              ← the ENTIRE new surface. Deletable in one rm -rf.
│   ├── LiteApp.tsx                    ← router + providers, mounted at /lite/*
│   ├── routes.tsx
│   │
│   ├── layout/
│   │   ├── LiteShell.tsx              ← topbar + sidenav (Due list · Clients · Contracts
│   │   │                                 · Visits · Payments · Summary · Settings)
│   │   └── LiteNav.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── MagicLink.tsx          ← WhatsApp magic-link login
│   │   ├── onboarding/
│   │   │   ├── index.tsx              ← 4-step stepper container
│   │   │   ├── BusinessStep.tsx       ← name + GSTIN + address
│   │   │   ├── PaymentSetupStep.tsx   ← UPI-offline (QR/bank) OR Razorpay keys
│   │   │   └── ImportStep.tsx         ← paste AMC register → parse → confirm
│   │   ├── dashboard/
│   │   │   └── index.tsx              ← DUE LIST = payments + renewals in one view
│   │   ├── clients/
│   │   │   ├── index.tsx              ← list + search + filter
│   │   │   └── ClientDrawer.tsx
│   │   ├── contracts/
│   │   │   ├── index.tsx              ← list w/ status + CNAK column
│   │   │   ├── ExpressCreate.tsx      ← client + blocks + term → derived schedules
│   │   │   └── CnakShareModal.tsx
│   │   ├── visits/
│   │   │   └── index.tsx              ← today's visits → done + photo + notes
│   │   ├── payments/
│   │   │   └── index.tsx              ← confirm queue + received ledger
│   │   ├── summary/
│   │   │   └── index.tsx              ← month-end share card
│   │   └── settings/
│   │       └── index.tsx              ← business · payment mode · templates · plan
│   │
│   ├── public/                        ← client-facing, NO auth. Mounted at /c/:cnak
│   │   ├── ContractLinkPage.tsx       ← review → accept → living page
│   │   ├── AcceptPanel.tsx            ← name + OTP sign-off
│   │   ├── PayPanel.tsx               ← UPI QR/bank + UTR self-report, or Razorpay link
│   │   └── VisitHistoryPanel.tsx      ← proof-of-service log
│   │
│   ├── components/                    ← ONLY used by lite. Nothing else may import these.
│   │   ├── DueRow.tsx
│   │   ├── StatTile.tsx
│   │   ├── StatusPill.tsx
│   │   ├── CnakCard.tsx
│   │   ├── VisitCheckRow.tsx
│   │   ├── PasteImportGrid.tsx
│   │   └── ServiceBlockEditor.tsx
│   │
│   ├── hooks/
│   │   ├── useDueList.ts
│   │   ├── useLiteContracts.ts
│   │   ├── useVisits.ts
│   │   └── usePaymentConfirmations.ts
│   │
│   ├── api/                           ← thin typed wrappers over /api/lite/*
│   │   ├── liteClient.ts              ← wraps the EXISTING axios/fetch client + auth
│   │   ├── onboarding.ts
│   │   ├── dues.ts
│   │   ├── contracts.ts
│   │   ├── visits.ts
│   │   └── payments.ts
│   │
│   ├── types/
│   │   └── lite.ts
│   │
│   └── theme/
│       └── tokens.css                 ← the mockup's token set, scoped to .lite-root
│
└── (everything else untouched — pages/contracts, components/contracts/ContractWizard,
     catalog-studio, group-sessions … all stay exactly as they are = "advanced mode")
```

## contractnest-api / contractnest-edge / database

**Governing rule: UX-only. Zero new tables, zero new edge functions, zero changed
endpoints.** Lite is a new *client* of the existing API, not a new layer in it. This is
what makes the BBB guarantee absolute rather than merely careful.

Every lite screen maps to endpoints that already exist:

| Lite screen | Existing API it calls |
|---|---|
| Onboarding · business + payment | tenant account / profile routes |
| Onboarding · paste import | contact create + contract create, looped client-side |
| Due list (payments + renewals) | contract events list + date summary + contracts list, composed in the UI |
| Clients | contact routes |
| Contracts + express create | contract create (full payload built by the lite mapper) |
| CNAK share / claim / verify | existing CNAK issue + `claim_contract_by_cnak` |
| Visits check-off | existing proof-of-work / event status routes |
| Payments record + confirm | finance routes (receipts, allocations) |
| Client link `/c/:cnak` | existing public contract-access routes |

### The mapper pattern (how "few fields in, full payload out" works)

The existing contract-create endpoint expects the wizard's full payload. Lite does **not**
change it — instead `lite/api/mappers/expressContract.ts` takes the 5 express inputs and
constructs a complete, valid wizard payload with sane defaults. All the "simplification"
lives in the UI mapper; the API sees a request identical in shape to one the wizard sends.
Same trick for import: N sequential single-creates rather than a new bulk endpoint.

```
contractnest-ui/src/lite/api/
├── liteClient.ts        ← wraps the EXISTING client + auth; adds nothing
├── mappers/
│   ├── expressContract.ts   ← 5 fields → full wizard-shaped payload
│   ├── importRow.ts         ← pasted row → contact + contract payloads
│   └── dueList.ts           ← events + contracts → one unified due/renewal list
└── (thin per-domain wrappers over serviceURLs.ts entries)
```

### The two honest exceptions

1. **Razorpay** genuinely needs backend work — link creation and a signature-verified
   webhook receiver. Gateway payments are *not* built today (Sprint 7, per the spec).
   If the UX-only rule is to hold in week 1, **ship UPI-offline only and defer Razorpay to
   week 2** as one additive route (`routes/paymentWebhookRoutes.ts` + `razorpayService.ts`)
   that no existing code path calls. Recommended: defer it.
2. **Bulk import performance** — 50 rows = 50 sequential API calls. Fine at this scale
   (a few seconds behind a progress bar). Revisit only if a tenant arrives with 500+ rows.

Anything else that "needs an API change" is a signal the lite UX drifted out of scope —
adapt the UI, not the backend.

## Delivery (your existing workflow)

```
MANUAL_COPY_FILES/lite-mvp/
├── contractnest-ui/src/lite/…         ← the only submodule touched
└── COPY_INSTRUCTIONS.txt
```

One submodule. No API batch, no migrations, no edge deploy — so there is no step in the
delivery process that can affect BBB.

---

## The five isolation rules (this is what keeps it clean)

1. **`lite/` may import downward only** — from `components/common`, `utils`, the existing
   auth context and API client, design tokens. Shared primitives, nothing else.

2. **`lite/` must NEVER import** `components/contracts/ContractWizard`,
   `pages/contracts/detail`, `catalog-studio`, `group-sessions`, or any KT component.
   If lite needs something those own, copy the 20 lines you need.

3. **Nothing outside `lite/` may import from `lite/`.** One-way dependency. This is the
   single rule that keeps the folder deletable and the blast radius zero.

4. **API: `lite*Service` may CALL existing services; existing services must never call
   `lite*`.** Same one-way rule, server side. Lite is a caller, never a dependency.

5. **No new tables. No changed columns.** Lite writes to existing tables. If it genuinely
   needs storage, it's a **nullable additive column** or a new `lite_`-prefixed table —
   never an alteration to anything BBB reads. This is "BBB is sacred" expressed in DDL.

Enforce rules 2 and 3 mechanically in `.eslintrc`:

```js
// contractnest-ui/.eslintrc — no-restricted-imports
overrides: [
  { files: ['src/lite/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [
      '**/components/contracts/ContractWizard/**',
      '**/pages/contracts/**',
      '**/components/catalog-studio/**',
      '**/components/group-sessions/**',
    ]}]}},
  { files: ['src/!(lite)/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['**/lite/**'] }]}},
]
```

## Routing & deploy

| Surface | Route | Auth |
|---|---|---|
| Lite owner app | `/lite/*` | magic link (existing auth) |
| Client contract link | `/c/:cnak` | CNAK + secret, no login |
| Existing platform | everything else | unchanged |
| Lite API | `/api/lite/*` | existing middleware |
| Public API | `/api/lite/public/*` | token, **no-store headers** |
| Razorpay webhook | `/api/webhooks/razorpay` | signature verification |

Same build, same host, same nginx config, same CI. Zero new pipeline — that's the point.

---

## BBB safety — why this structure cannot break the 39-chapter rollout

**Code isolation is guaranteed by rules 3 and 5**: nothing BBB runs imports from `lite/`,
and lite changes no table BBB reads. BBB stays on group-sessions / check-in / contracts
exactly as today. The folder is not the risk. These four things are:

| Risk | Why it's real | Guardrail |
|---|---|---|
| **Shared deploy** | Same build → shipping lite redeploys the app BBB uses. With ~1,500 legacy tsc errors, CI cannot catch a regression for you. | Lazy-load `lite/` as its own chunk; never deploy Fri night–Sat (BBB's Saturday cadence); smoke-test check-in after every deploy. |
| **Shared runtime** | Same API process, same DB/pool. A looped import or unpaginated query in lite adds load BBB feels, even with perfect code isolation. | Cap import batch size; throttle the import loop; paginate every lite read; put lite behind a `LITE_ENABLED` flag killable without a deploy. |
| **Shared middleware** | If lite "just needs a tweak" to auth/tenant middleware, that touches BBB's path. | Lite adapts to existing middleware. Zero edits — if lite needs different behaviour, it wraps in the UI, never modifies the server. |
| **Founder attention** | 39 chapter onboardings and a 7-day sprint compete for the same person. This is the biggest one. | See the sequencing note below — make them the *same* work, not competing work. |

### Open modelling decision — resolve BEFORE writing lite code

There is **no chapter entity in the codebase** (searched: only a UX metaphor in the wizard
spec). So "39 chapters" today means one of:

- **A. 39 tenants** — full isolation, 39 separate onboardings, 39 × the setup work,
  cross-chapter reporting impossible without new work.
- **B. 1 tenant, chapters as a grouping** on contacts/contracts — one onboarding, shared
  master data, but needs a chapter dimension threaded through check-in, dues and dashboards.
- **C. Hybrid** — 1 tenant per chapter for money/dues, a parent org for rollup reporting.

This decision has a far larger blast radius than the lite folder. Pick it first.

### Sequencing that removes the collision

Split lite into two halves that ship independently:

1. **`lite/pages/onboarding/` + `liteOnboardingService` + `liteImportService`** — tenant
   bootstrap, paste import, payment setup. **This serves BBB's 39 chapters AND the AMC
   pipeline.** It is the same work. Build it Days 1–3 and point it at BBB chapters #2 and
   #3 first: real users, zero sales risk, immediate proof.
2. **The owner app** (due list, contracts, visits, CNAK) — AMC/pest/housekeeping only.
   Days 4–6, sold to new prospects.

Chapters still use the existing group-session/check-in surface for their weekly meetings.
Lite only replaces the *onboarding* path, which is exactly where the pain is.

## Payment modes (tenant setting, set during onboarding)

- **UPI-offline** (default, zero setup): QR + bank details on the client page →
  client self-reports UTR → owner confirms in the queue. Works day one for every tenant.
  Display only — **no `upi://` intent deep links** (the GPay lesson).
- **Razorpay** (tenant's own account keys, stored per-tenant): payment link on the client
  page → webhook auto-confirms, no manual step. Money never touches our account;
  no Route/marketplace splits.

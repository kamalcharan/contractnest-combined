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

## contractnest-api

```
contractnest-api/src/
├── routes/
│   ├── liteRoutes.ts                  ← authed:  /api/lite/*
│   ├── litePublicRoutes.ts            ← public:  /api/lite/public/*  (CNAK resolve/accept/
│   │                                     self-report). MUST set no-store headers (see
│   │                                     sessionCheckinPublicRoutes.ts for the pattern)
│   └── paymentWebhookRoutes.ts        ← /api/webhooks/razorpay — signature-verified, no auth
│
├── controllers/
│   └── liteController.ts
│
├── services/
│   ├── liteOnboardingService.ts       ← tenant bootstrap + payment setup
│   ├── liteImportService.ts           ← parse → validate → preview → commit rows
│   ├── liteDueListService.ts          ← unified read: billing events + renewal dates
│   ├── liteContractService.ts         ← express create → DELEGATES to contractService
│   │                                     + contractEventsDerivationService
│   ├── liteVisitService.ts            ← check-off → existing proof-of-work objects
│   ├── litePaymentService.ts          ← record / confirm / reject
│   └── razorpayService.ts             ← link creation + webhook verify (tenant's own keys)
│
├── validators/
│   └── liteValidators.ts
│
└── types/
    └── lite.ts
```

## Delivery (your existing workflow)

```
MANUAL_COPY_FILES/lite-mvp/
├── contractnest-ui/src/lite/…
├── contractnest-api/src/…
├── migrations/                        ← additive-only SQL (see rule 5)
└── COPY_INSTRUCTIONS.txt
```

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

## Payment modes (tenant setting, set during onboarding)

- **UPI-offline** (default, zero setup): QR + bank details on the client page →
  client self-reports UTR → owner confirms in the queue. Works day one for every tenant.
  Display only — **no `upi://` intent deep links** (the GPay lesson).
- **Razorpay** (tenant's own account keys, stored per-tenant): payment link on the client
  page → webhook auto-confirms, no manual step. Money never touches our account;
  no Route/marketplace splits.

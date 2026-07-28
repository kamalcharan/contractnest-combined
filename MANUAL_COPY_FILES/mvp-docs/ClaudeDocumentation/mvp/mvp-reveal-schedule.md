# MVP reveal schedule — what to hide, and what unlocks it

The product-led shell (`12productledshell.html`) is the target UX. It does not need
redesigning. What it needs is a **reveal schedule**: a new tenant should meet a product
that looks finished but small, and grow into the rest as they earn it.

The shell already ships the mechanism for this — the **setup meter** on the dashboard.
Use it as the reveal surface. Nothing below requires new screens; it is `hidden` until a
condition is true.

## Hide on day one

| Surface | Why it hurts a new tenant | Unlocks when |
|---|---|---|
| **Test / Live env badge** | Meaningless before there's real data, and a wrong choice silently breaks CNAK claims across environments (already a fixed bug). Default everyone to Live. | Tenant asks, or a sandbox feature ships. Never auto-show. |
| **Revenue / Expense perspective toggle** | A new AMC / pest / housekeeping tenant is 100% revenue-side. A toggle that flips every number is a question they can't answer yet. | First vendor contract is created. |
| **Payables (AP) tab** | Same reason — the mirror of a side they don't use. | Same trigger as above. |
| **Group Sessions** | Only relevant to batch/roster businesses (BBB chapters, wellness). Irrelevant and confusing for AMC. | Industry implies it, or tenant enables it in Settings. |
| **Catalog Studio** | The catalog is already seeded. Editing master data on day one is an invitation to break your own defaults. | Reachable only from a block's "edit in catalog" link until the tenant has 5+ contracts. |
| **SLA % metrics** (KPI tile, contract stats, contact health) | With zero visits logged these read "100%" or "—", which looks fake and teaches distrust of the numbers. | 3+ completed visits exist. |
| **Charts** (billing last 6 months, renewals radar) | Empty charts on day one are worse than no charts. | 2+ months of billing data; until then show the empty-state CTA pattern the shell already uses. |
| **Contract-level discount** | An extra decision inside the first contract, and per-block discount is already deliberately deferred. | Always available in edit; hidden on first-contract create only. |
| **Assets / Timeline tabs on Contact** | Empty until visits and portal activity exist. | First visit logged / first portal open. |

## Keep visible from minute one

Dashboard (as "what needs me today"), Contracts, Contacts, Receivables, Get Started
checklist, the VaNi pill, and the customer portal link. That's the whole day-one product.

## Already correctly gated in the shell — don't change

- **NPS card** fires only after a win moment, never on a timer.
- **Coach marks** are 3 tips, once, dismissible.
- **JIT GST ask** appears at first invoice preview, with the "this is why signup never
  asked" rationale shown inline. This pattern should be copied for every remaining
  setup field — address, logo, bank details, tax registration.
- **Empty states as CTAs** (prospects, past sessions) rather than blank tables.

## The one change I'd make to the shell

Onboarding currently ends at **"Create your first contract →"**, which hands into the
wizard. Keep that, but make the *last* wizard action the finish line — "Create & send to
customer" — and treat **sent** as the activation event, not *created*. A contract sitting
in the tenant's own workspace is not an aha moment; a customer who received a link is.
The shell's `finishWizard()` already does both; just make "send" the primary button and
"save as draft" the ghost.

## Against the live product, this is still a real change

The shell is a design, not what's deployed. Relative to the live product it means:
13-step wizard → 4 steps; no onboarding → persona + industry + seeded catalog; upfront
tax setup → JIT ask. That is the MVP build. Everything in the reveal schedule above is
`hidden` attributes and conditions on top of it — cheap, and reversible per tenant.

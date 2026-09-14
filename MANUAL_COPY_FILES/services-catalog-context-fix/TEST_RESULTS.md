# Catalogue context correction

## Root causes
- Loader validated data.total rather than data.pagination.total and has_more.
- New renderer received an unfiltered catalogue instead of enforcing stored dependencies and currency.
- Mandatory autoIncluded T&C was incorrectly treated as an equipment selection.

## Correction
- Strict pagination uses the current Edge response contract. Raw rows must match tenant/global visibility and the selected is_live value.
- Exact resource type/name mapping follows ResourceDependencyStep to resolve tenant resource IDs against KT template IDs.
- Stored equipment/facility/direct resource dependencies determine eligibility; no fuzzy service-title matching.
- Active pricing records must match contract currency. Resource-based prices retain the resource-specific rate and tax.
- No-resource-dependency blocks remain generally eligible; unrelated declared dependencies do not.
- T&C remains one mandatory whole-agreement block, not a scope selection or substitute FlyBy entry.
- Existing saved selections remain visible. Ineligible selections and missing T&C block completion, not unfinished draft saving.
- Context changes lock edits. No API, Edge or DB changes.

## Verification
- Context model: HVAC vs Lift/facility, direct IDs, KT bridge, active/inactive currency, resource prices/taxes, missing resources.
- Browser: coverage tabs filter offers; T&C once with no Add/Unassigned; FlyBy retains selected scope/currency.
- Browser: beta/Test/USD context; wrong-tenant and wrong-environment responses rejected; missing terms prevent completion.
- Services: pagination, quantity/tax, explicit complimentary, same-draft save/reopen, failure/retry, 24 mobile theme variants.
- Agreement and Coverage regression checks passed. Scoped TypeScript check found no added diagnostics.
- Production build verified separately before commit; unrelated existing warnings remain.

## Required local acceptance
Automated API data is mocked to the audited Edge response shape. Actual tenant payloads and persistence must be checked in the product. No real tenant data was mutated for QA.

# Smart Forms: `category` / `form_type` taxonomy — observation for future review

**Context**: raised during the Sprint 2/7 pilot (Knowledge Tree → Smart Forms →
contract execution, HVAC as the worked example), while adding equipment/facility
tagging to Smart Forms (`m_form_templates.resource_template_id`).

## What exists today

Two classification fields on every form template, both fixed enums hardcoded
in TypeScript (duplicated between `contractnest-ui` and `contractnest-api`):

```
FORM_CATEGORIES = calibration, inspection, audit, maintenance,
                   clinical, pharma, compliance, onboarding, general

FORM_TYPES = pre_service, post_service, during_service, standalone
```

## `form_type` — fine as-is

Describes *when in the service lifecycle* the form is used. This concept is
industry-agnostic and holds regardless of vertical (HVAC, medical, legal,
wellness, ...). No issue identified.

## `category` — conflates two different questions

The list mixes two dimensions that aren't parallel:

- **Industry vertical**: `clinical`, `pharma`
- **Functional purpose** (usable within almost any vertical): `calibration`,
  `inspection`, `audit`, `maintenance`, `compliance`, `general`

An HVAC preventive-maintenance form is simultaneously "maintenance" *and*
arguably "inspection" *and* could reasonably be "compliance" if it's tied to
a regulatory standard — the HVAC Knowledge Tree page already tracks
compliance standards (ISHRAE, BIS, CEA, CPCB, BEE, NABL) separately from this
field. Forcing a single pick from a flat list loses information rather than
classifying it. A clinical form has the same problem — it could equally be
"compliance" or "audit".

## Structural issue: hardcoded, not database-driven

Both enums are TypeScript arrays, duplicated in at least two places
(`contractnest-ui/.../smartFormsAdmin.types.ts` and
`contractnest-api/.../adminFormsValidators.ts`). Adding a category for a new
industry (e.g. `legal`, `wellness` — both plausible future verticals for
ContractNest) means editing code in multiple places and redeploying, not a
tenant/admin-facing action.

## Why this matters less than it first appears

Equipment/facility tagging (`resource_template_id`, wired up this session) is
a separate, more precise dimension that already answers "what does this form
belong to" — the question `category` was never actually built to answer.
Equipment tagging is database-driven and grows naturally as new Knowledge
Trees are built, without the hardcoding problem `category` has.

## Recommendation (not yet actioned)

Leave `category`/`form_type` as-is for now — reworking a taxonomy is a
bigger, separate decision that shouldn't block the equipment-tagging work
already in progress. Revisit when:

- A new industry vertical is onboarded that doesn't fit the current list
  (e.g. legal, wellness — see also the "Service KT" future-review item in
  the root `CLAUDE.md`), or
- `category` needs to support multiple values per form instead of one, or
- The hardcoded-enum duplication becomes a maintenance pain point.

Possible directions if picked back up: split `category` into two genuinely
orthogonal fields (industry vertical vs. functional purpose), allow multiple
tags instead of one, or move the enum into the database so it's
tenant/admin-extensible instead of requiring a code deploy.

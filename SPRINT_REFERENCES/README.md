# SPRINT_REFERENCES

The design contract for the 7-sprint servicing program. Open any HTML in a browser — all self-contained, no server needed.

| File | Governs | Notes |
|---|---|---|
| `CONTRACTNEST_SPRINT_SPEC.md` | Everything | The sprint specification |
| `1-lifecycle-blueprint.html` | Program spine | Author→Activate→Service→Settle, with the interactive servicing loop |
| `2-multi-asset-playground.html` | Sprints 2,3,5,7 | Per-asset fan-out, placeholder gating, per-asset invoice lines — the servicing model, playable |
| `3-wizardshell-prototype.html` | Sprint 1 (regression ref) | Shell behaviors already shipped |
| `4-coverage-blocks-redesign.html` | Sprint 1 | Coverage & Assets + Add Service Blocks step UX |
| `5-landing-playground.html` | Parked (post-Sprint-7) | Landing v4 / KT playground track |
| `6-cadence-pricing.html` | Sprint 1 insert (pre-1b) | Cyclical pricing: per-cadence rate card in catalog-studio + cadence-aware block card in the wizard — both tabs share state |
| `10-checklist-service-form-playground.html` | Sprint 2 design discussion | Knowledge Tree checkpoints → generating a Checklist (field companion) + Service Form (the record) as two artifacts from one equipment/facility pick; walks through where this plugs into the existing wizard Evidence Policy step and Start Service drawer |

Workflow per sprint: **UI → owner review → Migration → owner review → Stitch → owner review**, each delivered as a MANUAL_COPY_FILES batch with acceptance SQL.

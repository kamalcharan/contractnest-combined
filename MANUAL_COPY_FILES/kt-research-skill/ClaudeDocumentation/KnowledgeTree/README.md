# Knowledge Tree Research Skills

Skills for generating Knowledge Tree data for ContractNest equipment and facilities.

## Available Skills

| Skill | File | Covers | Status |
|-------|------|--------|--------|
| Equipment KT Research | `kt-research-equipment.md` | ~150 equipment items (HVAC, Elevator, DG Set, CT Scanner, etc.) | Ready |
| Facility KT Research | `kt-research-facility.md` | ~40 facility items (Branch Office, Classroom, OT, etc.) | Planned |
| Staff KT Research | `kt-research-staff.md` | ~50 staff/team items (Technician, Nurse, Guard, etc.) | Planned |

## Current Seed Status

| Equipment | resource_template_id | Variants | Parts | Checkpoints | Cycles | Overlays |
|-----------|---------------------|----------|-------|-------------|--------|----------|
| HVAC System | `a450f71e-...dafe` | 11 | 40 | 18 | 10 | 6 |
| Ventilator | `1622be2a-...3766` | 6 | 32 | 19 | 10 | 16 |
| **Remaining** | — | **238 items unseeded** | — | — | — | — |

## How to Use

1. Open a Claude Code session
2. Paste the equipment name + `resource_template_id`
3. Say: "Use kt-research-equipment.md to generate KT for [equipment name]"
4. Review the JSON output
5. POST to `/knowledge-tree/save` edge function or paste into KT Builder UI

## Data Flow

```
Skill generates JSON → POST /knowledge-tree/save → DB tables populated → KT Builder UI shows data
```

## Target Database Tables

- `m_equipment_variants`
- `m_equipment_spare_parts`
- `m_spare_part_variant_map`
- `m_equipment_checkpoints`
- `m_checkpoint_values`
- `m_checkpoint_variant_map`
- `m_service_cycles`
- `m_context_overlays`

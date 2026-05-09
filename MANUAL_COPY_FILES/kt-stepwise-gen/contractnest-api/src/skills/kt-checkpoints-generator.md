# Knowledge Tree — Step 3: Checkpoints Generator

You are a domain expert in commercial and industrial equipment maintenance.

Your task: generate service checkpoints, condition values, variant threshold overrides, and service cycles for the given equipment and service activity. This is step 3 of 3 in a phased Knowledge Tree build.

You will receive existing variants with REAL database UUIDs. Use those exact UUIDs in checkpoint_variant_map.

Your output MUST be a single raw JSON object — no markdown, no code fences, no explanation.

---

## Step 1: Classify the Equipment

Before generating, determine the equipment type:

| Classification | Examples | Focus |
|---|---|---|
| **Electromechanical** | HVAC, Elevator, DG Set, Compressor, Pump | Pressure/temp/current readings, many condition checks |
| **Electronic / Precision** | CT Scanner, MRI, Ventilator, Lab Analyzer | Calibration, software, safety interlocks |
| **Electrical Infrastructure** | UPS, Transformer, Panel Board, Switchgear | Voltage/current/insulation readings, safety-critical |
| **Mechanical** | Cooling Tower, Conveyor, Crane, Boiler | Vibration, lubrication, wear checks |
| **IT / Network** | Server, Router, BTS | Uptime, firmware, environmental |

---

## Quality Rules

1. **Domain-specific names** — "Gas Pressure — Suction (PSI)" not "Reading 1"
2. **Realistic thresholds** — Use actual industry-standard values (R410A suction: 55–130 PSI)
3. **Proper units** — PSI, °C, V, Amps, Pa, kPa, RPM, dB, mm, %, Ohms, MΩ, Hz, LPM, CFM, kW, kWh
4. **Actionable labels** — "Dusty — cleaned" not "Bad". Past-tense action verbs where applicable
5. **Meaningful severity** — `ok` = no action, `attention` = fixed this visit, `critical` = escalate
6. **checkpoint_variant_map** — only add entries where thresholds GENUINELY differ by variant capacity

### checkpoint_type rules (CRITICAL)

- `condition` — technician selects a label:
  - MUST have ≥ 3 checkpoint_values
  - unit, normal_min, normal_max, amber_threshold, red_threshold MUST all be null

- `reading` — numeric measurement:
  - MUST have unit, normal_min, normal_max, amber_threshold, red_threshold
  - MUST NOT have checkpoint_values

### service_cycles rules

- At least 6 service cycles
- frequency_unit: `"days"` (most common), `"hours"` (run-hour equipment), `"visits"`
- varies_by: array of applicable factors from: climate, season, industry, equipment_age, load_pattern, environment, coastal, dust_level, humidity, usage_intensity, run_hours

---

## Target Counts

| Type | Min | Typical | Max |
|---|---|---|---|
| Checkpoints | 10 | 15–20 | 30 |
| — Condition | 5 | 8–12 | 20 |
| — Reading | 5 | 7–10 | 15 |
| Checkpoint Values | 25 | 35–50 | 80 |
| Values per condition | 3 | 3–4 | 5 |
| Service Cycles | 6 | 8–12 | 15 |

---

## Output JSON

```
{
  "resource_template_id": "<provided UUID>",

  "checkpoints": [
    {
      "id": "cp1",
      "checkpoint_type": "condition",
      "service_activity": "{{SERVICE_ACTIVITY}}",
      "section_name": "Section Name",
      "name": "Checkpoint Name",
      "description": null,
      "layer": "equipment",
      "unit": null,
      "normal_min": null,
      "normal_max": null,
      "amber_threshold": null,
      "red_threshold": null,
      "threshold_note": null,
      "sort_order": 0,
      "source": "ai_researched",
      "is_active": true
    },
    {
      "id": "cp2",
      "checkpoint_type": "reading",
      "service_activity": "{{SERVICE_ACTIVITY}}",
      "section_name": "Section Name",
      "name": "Reading Name",
      "description": null,
      "layer": "equipment",
      "unit": "PSI",
      "normal_min": 55,
      "normal_max": 130,
      "amber_threshold": 50,
      "red_threshold": 40,
      "threshold_note": null,
      "sort_order": 1,
      "source": "ai_researched",
      "is_active": true
    }
  ],

  "checkpoint_values": [
    {
      "id": "cv1",
      "checkpoint_id": "cp1",
      "label": "Clean",
      "severity": "ok",
      "triggers_part_consumption": false,
      "requires_photo": false,
      "sort_order": 0
    },
    {
      "id": "cv2",
      "checkpoint_id": "cp1",
      "label": "Dusty — cleaned",
      "severity": "ok",
      "triggers_part_consumption": false,
      "requires_photo": false,
      "sort_order": 1
    },
    {
      "id": "cv3",
      "checkpoint_id": "cp1",
      "label": "Damaged — replaced",
      "severity": "critical",
      "triggers_part_consumption": true,
      "requires_photo": true,
      "sort_order": 2
    }
  ],

  "checkpoint_variant_map": [
    {
      "id": "cvm1",
      "checkpoint_id": "cp2",
      "variant_id": "<real UUID from input — copy exactly>",
      "override_min": 60,
      "override_max": 100,
      "override_amber": 55,
      "override_red": 45
    }
  ],

  "service_cycles": [
    {
      "id": "sc1",
      "checkpoint_id": "cp1",
      "frequency_value": 45,
      "frequency_unit": "days",
      "varies_by": ["environment", "dust_level"],
      "alert_overdue_days": 7,
      "source": "ai_researched",
      "is_active": true
    }
  ]
}
```

## Pre-Output Validation

- [ ] Every `condition` checkpoint has ≥ 3 checkpoint_values
- [ ] Every `reading` checkpoint has unit, normal_min, normal_max, amber_threshold, red_threshold
- [ ] No `reading` checkpoint has checkpoint_values
- [ ] No `condition` checkpoint has unit or threshold values
- [ ] All checkpoint_values reference a valid checkpoint_id from this payload
- [ ] All checkpoint_variant_map entries: checkpoint_id is a temp ID from this payload, variant_id is a real UUID from input
- [ ] All service_cycles reference a valid checkpoint_id from this payload
- [ ] service_cycles has ≥ 6 entries
- [ ] service_activity on every checkpoint and service_cycle is `"{{SERVICE_ACTIVITY}}"`

Output raw JSON only. No markdown. No explanation.

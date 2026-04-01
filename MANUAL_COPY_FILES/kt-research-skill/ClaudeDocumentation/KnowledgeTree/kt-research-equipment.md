# Knowledge Tree Research Skill — Equipment

> **Purpose:** Generate a complete Knowledge Tree JSON payload for any equipment type in `m_catalog_resource_templates`. The output is a ready-to-POST payload for the `/knowledge-tree/save` edge function.

---

## When to Use

Trigger this skill when:
- An admin says "generate KT for [equipment name]"
- Seeding a new equipment type into the Knowledge Tree system
- Bulk-generating KT data for unseeded `m_catalog_resource_templates` items

**This skill is for EQUIPMENT only** (things with motors, compressors, circuits, moving parts). For facilities (rooms, buildings, spaces), use `kt-research-facility.md`.

---

## Input Required

| Parameter | Source | Example |
|-----------|--------|---------|
| `equipment_name` | User or `m_catalog_resource_templates.name` | "Elevator / Lift" |
| `resource_template_id` | UUID from database | `"409871d2-d82c-48d6-9b47-75df942ce86e"` |
| `sub_category` | From database | "Vertical Transport" |

---

## Step 1: Classify the Equipment

Before generating data, classify the equipment to determine the KT shape:

| Classification | Examples | KT Characteristics |
|---------------|----------|-------------------|
| **Electromechanical** | HVAC, Elevator, DG Set, Compressor | Heavy on readings (PSI, Amps, °C), many variants by capacity, 6-7 component groups |
| **Electronic / Precision** | CT Scanner, MRI, Ventilator, Lab Analyzer | Calibration-heavy, fewer variants, specialized parts, regulatory checkpoints |
| **Electrical Infrastructure** | UPS, Transformer, Panel Board, Switchgear | Voltage/current readings, safety-critical, fewer moving parts |
| **Mechanical** | Pump, Cooling Tower, Conveyor, Crane | Vibration/noise focus, lubrication cycles, wear-part heavy |
| **IT / Network** | Server, Router, BTS, Data Storage | Uptime-focused, firmware checks, environmental (temp/humidity), fewer physical parts |

---

## Step 2: Research and Generate

For the given equipment, generate domain-specific data using your training knowledge. The output MUST be realistic — a field service engineer should look at the checkpoints and say "yes, these are the things I actually check."

### Quality Rules

1. **Domain-specific, not generic.** "Gas Pressure — Suction (PSI)" not "Reading 1"
2. **Realistic thresholds.** Use actual industry-standard ranges (e.g., R410A suction: 55-130 PSI)
3. **Proper units.** PSI, °C, V, Amps, Pa, pH, RPM, dB, mm, bar, kPa, %, Ohms, MΩ, LPM, CFM, kW, Hz
4. **Actionable condition labels.** "Dusty — cleaned" not just "Bad". Past-tense action where applicable
5. **Severity must be meaningful.** `ok` = no action, `attention` = fixed during visit, `critical` = needs follow-up/escalation
6. **Component groups must be real.** Use: `electrical`, `mechanical`, `refrigerant`, `filters`, `controls`, `consumables`, `water_side`, `hydraulic`, `pneumatic`, `optical`, `safety`
7. **Variants must differ meaningfully.** By capacity, technology, or application — not just size labels
8. **Spare part mapping must be logical.** A "Cooling Tower Fill Media" part should NOT map to a "Split AC" variant

---

## Step 3: Output Structure

Generate a single JSON object with these 8 arrays. Use **temporary string IDs** (e.g., `"v1"`, `"sp1"`, `"cp1"`) — the edge function generates real UUIDs on insert.

```json
{
  "resource_template_id": "UUID-FROM-DATABASE",

  "variants": [
    {
      "id": "v1",
      "name": "Variant Name",
      "description": "One-line description of what this variant is",
      "capacity_range": "Range or spec (e.g., '0.75–2.5 TR', '6-passenger', '500 kVA')",
      "attributes": {},
      "sort_order": 0,
      "source": "ai_researched",
      "is_active": true
    }
  ],

  "spare_parts": [
    {
      "id": "sp1",
      "component_group": "electrical|mechanical|refrigerant|filters|controls|consumables|water_side|hydraulic|pneumatic|optical|safety",
      "name": "Part Name",
      "description": "Optional — only if name isn't self-explanatory",
      "specifications": {
        "typical_lifespan": "5-10 years",
        "common_makes": "Siemens, ABB, Schneider"
      },
      "sort_order": 0,
      "source": "ai_researched",
      "is_active": true
    }
  ],

  "spare_part_variant_map": [
    {
      "id": "spvm1",
      "spare_part_id": "sp1",
      "variant_id": "v1",
      "is_recommended": true,
      "notes": null
    }
  ],

  "checkpoints": [
    {
      "id": "cp1",
      "checkpoint_type": "condition",
      "service_activity": "pm",
      "section_name": "Section Name (groups related checkpoints)",
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
      "service_activity": "pm",
      "section_name": "Section Name",
      "name": "Reading Name",
      "description": null,
      "layer": "equipment",
      "unit": "PSI",
      "normal_min": 55,
      "normal_max": 130,
      "amber_threshold": 50,
      "red_threshold": 40,
      "threshold_note": "Compare with nameplate rating",
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
      "variant_id": "v1",
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
      "varies_by": ["environment", "season", "industry"],
      "alert_overdue_days": 7,
      "source": "ai_researched",
      "is_active": true
    }
  ],

  "context_overlays": [
    {
      "id": "co1",
      "context_type": "climate",
      "context_value": "hot_humid",
      "adjustments": {
        "frequency_multiplier": 1.3,
        "affected_checkpoints": ["Air Filter Condition", "Drain Line"],
        "additional_actions": ["Monthly drain tray inspection during monsoon"],
        "threshold_adjustments": {
          "air_filter_check": { "frequency_value": 30 }
        },
        "notes": "High humidity increases fouling and drain line issues"
      },
      "priority": 1,
      "is_active": true
    }
  ]
}
```

---

## Field Constraints Reference

### checkpoint_type
- `"condition"` — Qualitative dropdown (technician selects a label). MUST have `checkpoint_values`. Unit/thresholds MUST be null.
- `"reading"` — Quantitative numeric input. MUST have `unit`, `normal_min`, `normal_max`. Should have `amber_threshold` and `red_threshold`. MUST NOT have `checkpoint_values`.

### service_activity
- `"pm"` — Preventive maintenance (most common, ~70% of checkpoints)
- `"repair"` — Breakdown / corrective
- `"inspection"` — Visual / audit
- `"install"` — Commissioning / installation
- `"decommission"` — End-of-life / removal

### layer
- `"equipment"` — Specific to this equipment type (default, ~80% of checkpoints)
- `"base"` — Generic across all equipment (e.g., "Electrical Connections", "Supply Voltage")

### severity (for checkpoint_values)
- `"ok"` — No further action needed
- `"attention"` — Fixed during this visit, or needs monitoring
- `"critical"` — Requires escalation, follow-up visit, or part replacement

### context_type (for overlays)
- `"climate"` — Weather/environmental (hot_humid, cold_dry, tropical, arid, monsoon)
- `"geography"` — Location-specific (coastal_salt_air, dusty_industrial, high_altitude, seismic_zone)
- `"industry_served"` — End-use industry (pharma_cleanroom, data_center, healthcare_hospital, food_processing)

### frequency_unit
- `"days"` — Calendar days (most common)
- `"hours"` — Run hours (for compressors, motors, generators)
- `"visits"` — Every N service visits

### varies_by (array of strings)
Common values: `"climate"`, `"season"`, `"industry"`, `"equipment_age"`, `"load_pattern"`, `"environment"`, `"coastal"`, `"dust_level"`, `"humidity"`, `"monsoon"`, `"water_quality"`, `"usage_intensity"`, `"regulatory"`, `"contract"`, `"manufacturer"`, `"run_hours"`, `"leak_history"`

### Supported units
`"PSI"`, `"°C"`, `"°F"`, `"V"`, `"Amps"`, `"Pa"`, `"kPa"`, `"bar"`, `"pH"`, `"RPM"`, `"dB"`, `"mm"`, `"µm"`, `"%"`, `"Ohms"`, `"MΩ"`, `"LPM"`, `"CFM"`, `"kW"`, `"kWh"`, `"Hz"`, `"m/s"`, `"mg/L"`, `"ppm"`, `"mbar"`, `"g"` (vibration), `"lux"`

---

## Target Counts (Guidelines)

| Data Type | Minimum | Typical | Maximum |
|-----------|---------|---------|---------|
| Variants | 3 | 6-10 | 15 |
| Spare Parts | 15 | 25-40 | 60 |
| Component Groups | 3 | 5-7 | 10 |
| Checkpoints | 10 | 15-20 | 30 |
| — Condition type | 5 | 8-12 | 20 |
| — Reading type | 5 | 7-10 | 15 |
| Checkpoint Values | 25 | 35-50 | 80 |
| Values per condition checkpoint | 3 | 3-4 | 5 |
| Service Cycles | 6 | 8-12 | 15 |
| Context Overlays | 3 | 4-6 | 10 |
| Spare Part-Variant Mappings | — | parts x variants x 0.6 | parts x variants |

---

## Gold-Standard Example: HVAC System

This is the reference-quality KT that all generated trees should match in depth and specificity.

### Variants (10 AI-researched)
| Name | Capacity Range | Description |
|------|---------------|-------------|
| Split AC / Room AC | 0.75-2.5 TR | Wall-mounted, residential & small commercial |
| Cassette AC | 1.5-5 TR | Ceiling-mounted, 360 deg airflow, commercial |
| Ductable AC | 5.5-25 TR | Ducted system, false ceiling distribution |
| VRF / VRV System | 8-60 TR | Multi-zone, multiple indoor units |
| Chiller (Water-Cooled) | 50-2000 TR | Centralized, cooling tower required |
| Chiller (Air-Cooled) | 30-500 TR | Centralized, no cooling tower |
| AHU (Air Handling Unit) | Connected to chiller | Large air handler with filter banks |
| FCU (Fan Coil Unit) | Hotel/office rooms | Room-level temperature control |
| Package / Rooftop Unit | 3-25 TR | Self-contained, roof-mounted |
| Window AC | 0.75-2 TR | Single-unit, window-mounted |

### Spare Parts (40 across 7 groups)
| Group | Count | Examples |
|-------|-------|----------|
| electrical | 6 | Capacitor (run/start), PCB / Controller Board, Contactor / Relay, Thermostat / Temp Sensor, Wiring Harness, Fuse / MCB |
| mechanical | 8 | Compressor, Fan Motor (indoor), Fan Motor (outdoor), Fan Blade / Blower Wheel, Bearing Set, Vibration Damper, Pulley, V-Belt |
| refrigerant | 6 | Refrigerant R410A, Refrigerant R22 (legacy), Expansion Valve (TXV/EEV), Filter Drier, Sight Glass, Schrader Valve Cap |
| filters | 5 | Pleated Panel Filter, Washable Mesh Filter, Carbon / Activated Charcoal Filter, HEPA Filter, Pre-Filter Frame |
| water_side | 6 | Cooling Tower Fill Media, CT Float Valve, CT Spray Nozzle, Chilled Water Pump Seal, Strainer / Y-Filter, Water Treatment Chemical |
| controls | 4 | Digital Thermostat, Pressure Switch (HP/LP), BMS Gateway Module, Remote Controller |
| consumables | 5 | Compressor Oil (POE/Mineral), Coil Cleaning Chemical, Drain Pan Algaecide Tablet, Pipe Insulation Tape, Copper Brazing Rod |

### Checkpoints (17 across 3 sections)
**Section: Filter, Coils & Drainage** (6 condition checkpoints)
- Air Filter Condition: Clean / Dusty — cleaned / Damaged — replaced
- Evaporator Coil: Clean / Cleaned during service / Chemical wash done / Damaged
- Condenser Coil: Clean / Cleaned / Fins bent — fixed / Damaged
- Drain Line: Clear / Slow — flushed / Blocked — cleared
- Drain Tray: Clean / Algae — cleaned / Rusted / cracked
- (all `checkpoint_type: "condition"`, `service_activity: "pm"`)

**Section: Mechanical Checks** (3 condition checkpoints)
- Vibration / Noise: Normal / Slightly elevated / High — investigate
- Electrical Connections: Tight / OK / Loose — tightened / Burnt / damaged (layer: `"base"`)
- Belt Condition: Good tension / Loose — adjusted / Worn — replaced / N/A (direct drive)

**Section: Refrigerant & Electrical** (8 reading checkpoints)
| Checkpoint | Unit | Normal Range | Amber | Red |
|-----------|------|-------------|-------|-----|
| Gas Pressure — Suction | PSI | 55-130 | 50 | 40 |
| Gas Pressure — Discharge | PSI | 200-350 | 370 | 400 |
| Compressor Amp Draw | Amps | 2-25 | — | — |
| Supply Voltage | V | 200-250 | 195 | 190 |
| Outlet Air Temperature | °C | 10-18 | 20 | 24 |
| Approach Temp — Evaporator | °C | 1-3 | 3.5 | 5 |
| Approach Temp — Condenser | °C | 1-2.5 | 3 | 4 |
| Filter Differential Pressure | Pa | 50-200 | 250 | 350 |
| Cooling Tower Water pH | pH | 7-8.5 | 6.5 | 6 |

### Service Cycles (10)
| Checkpoint | Frequency | Varies By | Alert |
|-----------|-----------|-----------|-------|
| Cooling Tower Water pH | 30 days | water_quality, scale | 7d |
| Air Filter Condition | 45 days | environment, season, industry | 7d |
| Evaporator Coil | 90 days | coastal, dust_level | 14d |
| Drain Line | 90 days | humidity, monsoon | 7d |
| Electrical Connections | 90 days | load_pattern | 14d |
| Gas Pressure — Suction | 90 days | equipment_age, leak_history | 7d |
| Condenser Coil | 180 days | coastal, usage | 14d |
| Supply Voltage | 365 days | regulatory, contract | 30d |
| Belt Condition | 365 days | usage_intensity | 30d |
| Compressor Amp Draw | 1000 hours | manufacturer, run_hours | — |

### Context Overlays (6)
| Type | Value | Multiplier | Key Actions |
|------|-------|-----------|-------------|
| climate | hot_humid_monsoon | 1.3x | Pre/post monsoon PMs, monthly drain inspection |
| geography | coastal_salt_air | 1.5x | Anti-corrosion spray, quarterly copper tubing check |
| geography | dusty_industrial | 1.6x | Pre-filters, weekly visual filter check, 15-day filter cycle |
| industry_served | pharma_cleanroom | 2.0x | HEPA integrity (DOP), particulate count, humidity monitoring |
| industry_served | data_center | 1.4x | Redundancy failover test, hot/cold aisle mapping |
| industry_served | healthcare_hospital | 1.5x | ACH verification, pressure differential, microbial sampling |

---

## Validation Checklist

Before outputting the JSON, verify:

- [ ] Every `condition` checkpoint has at least 3 `checkpoint_values`
- [ ] Every `reading` checkpoint has `unit`, `normal_min`, `normal_max`
- [ ] No `reading` checkpoint has `checkpoint_values`
- [ ] No `condition` checkpoint has `unit` or thresholds
- [ ] All `spare_part_variant_map` entries reference valid `spare_part_id` and `variant_id` from this payload
- [ ] All `checkpoint_values` reference valid `checkpoint_id` from this payload
- [ ] All `service_cycles` reference valid `checkpoint_id` from this payload
- [ ] All `checkpoint_variant_map` entries reference valid IDs from this payload
- [ ] `component_group` values are from the allowed set
- [ ] `service_activity` values are from the allowed set
- [ ] `frequency_unit` is "days", "hours", or "visits"
- [ ] `severity` is "ok", "attention", or "critical"
- [ ] `context_type` is "climate", "geography", or "industry_served"
- [ ] Variant count is 3-15, spare parts 15-60, checkpoints 10-30
- [ ] Section names are descriptive and group related checkpoints (3-8 sections typical)
- [ ] All `source` fields are `"ai_researched"`
- [ ] Overlays have realistic `frequency_multiplier` values (1.2-2.0 range)
- [ ] No duplicate names within variants, spare_parts, or checkpoints

---

## How to Use This Skill

### In a Claude Code Session

```
User: Generate KT for Elevator / Lift (resource_template_id: 409871d2-...)

Claude: [Uses this skill to produce the full JSON payload]
```

### To Insert the Data

Option A — Via edge function:
```bash
curl -X POST \
  https://uwyqhzotluikawcboldr.supabase.co/functions/v1/knowledge-tree/save \
  -H "Authorization: Bearer <anon-key>" \
  -H "x-is-admin: true" \
  -H "Content-Type: application/json" \
  -d '<generated-json>'
```

Option B — Via KT Builder UI:
1. Navigate to Global Templates > Knowledge Trees
2. Click the equipment card
3. Data loads in the editor — review and save

### Batch Seeding (Multiple Equipment)

For each equipment in `m_catalog_resource_templates`:
1. Run this skill with the equipment name + UUID
2. Review the output for domain accuracy
3. POST to edge function
4. Verify via `/knowledge-tree/summary?resource_template_id=UUID`

---

## Equipment Types Awaiting KT Research

Query to find unseeded equipment:
```sql
SELECT rt.id, rt.name, rt.sub_category
FROM m_catalog_resource_templates rt
LEFT JOIN m_equipment_variants ev ON ev.resource_template_id = rt.id
WHERE ev.id IS NULL
AND rt.resource_type_id IN (
  SELECT id FROM m_resource_types WHERE code IN ('equipment', 'asset')
)
ORDER BY rt.name;
```

---

**Last Updated:** April 2026
**Maintained By:** Vikuna Technologies

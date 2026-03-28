# ContractNest — Smart Forms System: Complete Write-Up

## 1. What Are Smart Forms?

Smart Forms are **structured, digital checklists and reports** that field technicians fill during service events. They replace paper-based forms (calibration reports, PM checklists, inspection sheets) with dynamic, validated, industry-standard digital forms.

Think of them as the **evidence layer** of a service contract — proof that work was done, done correctly, and done to specification.

### Why They Matter (Moat)
- Every equipment has industry-standard procedures (HVAC filter checks, MRI calibration readings, elevator safety inspections)
- Currently, most service companies use paper or generic Google Forms
- ContractNest ships **pre-built, equipment-specific smart forms** tied to contract types — no other product does this at this granularity
- Tenants get professional forms the moment they add equipment + choose a contract type

---

## 2. Current System Architecture

### 2.1 DB Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `m_form_templates` | Master form definitions (admin-created) | id, name, description, category, form_type, tags[], schema (JSONB), version, status, parent_template_id, created_by, approved_by |
| `m_form_tenant_selections` | Tenant bookmarks (which forms a tenant has enabled) | tenant_id, form_template_id, is_active, selected_by |
| `m_form_template_mappings` | Links forms to specific contracts | tenant_id, contract_id, form_template_id, service_type, timing, is_mandatory, effective_from/to |
| `m_form_submissions` | Filled form responses | tenant_id, form_template_id, form_template_version, service_event_id, contract_id, mapping_id, responses (JSONB), computed_values, status, submitted_by, reviewed_by |
| `m_form_attachments` | Files attached to submissions | (photos, PDFs, signatures) |

### 2.2 Form Template Structure (schema JSONB)

```json
{
  "id": "calibration_report",
  "title": "Calibration Report",
  "description": "Record calibration measurements and results",
  "sections": [
    {
      "id": "equipment_info",
      "title": "Equipment Information",
      "description": "Details of the equipment being calibrated",
      "fields": [
        { "id": "equipment_name", "type": "text", "label": "Equipment Name", "required": true },
        { "id": "serial_number", "type": "text", "label": "Serial Number", "required": true },
        { "id": "calibration_date", "type": "date", "label": "Calibration Date", "required": true }
      ]
    },
    {
      "id": "measurements",
      "title": "Measurement Results",
      "fields": [
        { "id": "test_point_1", "type": "number", "label": "Test Point 1 - Nominal", "step": 0.001 },
        { "id": "tolerance_1", "type": "select", "label": "Pass/Fail", "options": [{"label":"Pass","value":"pass"}, {"label":"Fail","value":"fail"}] }
      ]
    },
    {
      "id": "sign_off",
      "title": "Sign Off",
      "fields": [
        { "id": "technician_name", "type": "text", "label": "Technician Name", "required": true },
        { "id": "pass_overall", "type": "radio", "label": "Overall Result", "options": [...] }
      ]
    }
  ]
}
```

Supported field types: `text`, `number`, `date`, `select`, `radio`, `textarea`, `checkbox`, with validation (required, min/max, pattern), computed fields (formulas), and conditional logic.

### 2.3 Workflow / Lifecycle

```
Admin creates form → draft → submit for review → in_review → approved → available to tenants
                                                            → rejected (back to draft)
                                                 approved → new version → draft (v2)
                                                 approved → archived (past)
```

### 2.4 UI Routes

| Route | Who | What |
|---|---|---|
| `/admin/smart-forms` | Platform Admin | List, filter, manage all form templates |
| `/admin/smart-forms/editor/:id` | Platform Admin | 3-panel editor: Field Palette + Monaco JSON Editor + Live Preview |
| `/settings/configure/smart-forms` | Tenant | Browse approved forms, toggle on/off |

### 2.5 Current Data

Only **2 form templates** exist today:
1. "Calibration Report" (approved, well-structured schema with 3 sections)
2. "Untitled Form" (approved, placeholder)

**No forms are linked to equipment, industries, or nomenclatures.**

---

## 3. Equipment Landscape (What Forms Need to Cover)

### 3.1 Total Equipment

**121 equipment types** across 27 industries, plus:
- **8 universal equipment** (every business): AC, Fire Extinguisher, Fire Alarm, Laptop, Printer, Router, Electrical Panel, Plumbing, Water Purifier, CCTV
- **6 cross-industry equipment**: HVAC, DG Set, Transformer, UPS, Elevator, STP/WTP Plant

### 3.2 Equipment by Industry (top industries)

| Industry | Count | Key Equipment |
|---|---|---|
| Facility Management | 9 | HVAC, Fire Alarm, DG Set, Transformer, UPS, CCTV, Elevator, STP/WTP |
| Healthcare | 8 | MRI, CT Scanner, X-Ray, Ultrasound, Ventilator, Defibrillator, Patient Monitor |
| Construction | 6 | Tower Crane, Excavator, Concrete Plant, Scaffolding, Bar Bending, Transit Mixer |
| Manufacturing | 6 | CNC Machine, Conveyor, Injection Moulding, Compressor, Boiler |
| Pharma | 6 | HPLC, Tablet Press, Packaging Machine, Autoclave, Purified Water System, Pharma HVAC |
| Agriculture | 5 | Tractor, Harvester, Irrigation Pump, Agricultural Drone, Soil Testing |
| Automotive | 5 | Wheel Alignment, Paint Booth, Tyre Changer, Vehicle Lift, Diagnostic Equipment |
| Technology | 4 | Network Switch, Precision AC, Server Rack, IT Equipment |
| Wellness | 4 | Multi-Gym Station, Treadmill, Spa/Sauna, Fitness Equipment |

### 3.3 Equipment Sub-Categories (how they're organized)

Equipment is organized by `sub_category` within each industry:
- Healthcare: Diagnostic Imaging, Life Support, Patient Monitoring
- Manufacturing: CNC & Machining, Material Handling, Moulding, Pneumatics, Thermal
- Facility Mgmt: Fire & Safety, HVAC Systems, Power & Electrical, Security, Vertical Transport, Water Treatment

---

## 4. Contract Nomenclatures (What Type of Service)

The nomenclature defines the **type of service contract**. There are **21 nomenclature types** in 4 groups:

### 4.1 Equipment Maintenance Group (equipment-centric)

| Code | Full Name | Typical Duration | What It Means |
|---|---|---|---|
| **AMC** | Annual Maintenance Contract | 12 months | Scheduled preventive maintenance + limited repairs |
| **CMC** | Comprehensive Maintenance Contract | 12 months | PM + repairs + parts replacement (all-inclusive) |
| **CAMC** | Comprehensive Annual Maintenance Contract | 12 months | AMC + CMC combined (Indian market term) |
| **PMC** | Preventive Maintenance Contract | 12 months | Only scheduled PM visits, no repairs |
| **BMC** | Breakdown Maintenance Contract | Ongoing | Only repairs on call, no scheduled PM |
| **Warranty Ext** | Extended Warranty | 12 months | OEM-level coverage after warranty expires |

### 4.2 Facility / Property Group (facility-centric)

| Code | Full Name | Typical Duration |
|---|---|---|
| **FMC** | Facility Management Contract | 12 months |
| **O&M** | Operations & Maintenance | 36 months |
| **Manpower** | Manpower Supply Contract | 12 months |

### 4.3 Service Delivery Group (service-centric, not equipment-bound)

| Code | Full Name | Typical Duration |
|---|---|---|
| **Service Package** | Service Package Agreement | 1-12 months |
| **Care Plan** | Care Plan Agreement | 1-12 months |
| **Subscription** | Subscription Service | Ongoing/12 months |
| **Consultation** | Consultation Agreement | 6-12 months |
| **Training** | Training & Development | 1-6 months |
| **Project-Based** | Project-Based Service | Project-based |

### 4.4 Flexible / Hybrid Group

| Code | Full Name | Typical Duration |
|---|---|---|
| **SLA** | Service Level Agreement | 12 months |
| **Rate Contract** | Rate Contract | 12 months |
| **Retainer** | Retainer Agreement | 12 months |
| **Per-Call** | Per-Call / On-Demand | Ongoing |
| **Turnkey** | Turnkey Contract | Project-based |
| **BOT/BOOT** | Build-Operate-Transfer | 60 months |

---

## 5. How Smart Forms Link to Equipment

### 5.1 The Relationship

Every piece of equipment goes through specific **service activities**. Each service activity needs specific **forms** to document the work. The nomenclature (contract type) determines **which activities are covered**.

```
Industry → Equipment → Service Activity → Smart Form
                              ↑
                    Nomenclature determines scope
```

### 5.2 Service Activity Categories

Based on real-world service processes, every equipment type can have up to **6 service activities**:

| Service Activity | When | Triggered By | Example (HVAC) |
|---|---|---|---|
| **Preventive Maintenance** | Scheduled (monthly/quarterly) | AMC, CMC, CAMC, PMC | Filter cleaning, coil wash, gas check |
| **Breakdown / Corrective Repair** | Unplanned (on failure) | CMC, CAMC, BMC | Compressor replacement, gas leak fix |
| **Calibration** | Scheduled (annual/semi-annual) | AMC, CMC, CAMC | Thermostat accuracy, sensor calibration |
| **Inspection / Audit** | Scheduled or regulatory | All types, SLA | Safety compliance, energy efficiency audit |
| **Installation / Commissioning** | One-time (new equipment) | Turnkey, Project-Based | First-time setup, piping, gas charge, test run |
| **De-commissioning / Disposal** | One-time (end of life) | Any | Gas recovery, disconnection, disposal cert |

### 5.3 Which Nomenclature Covers Which Activity

| Nomenclature | PM | Repair | Calibration | Inspection | Install | Decommission |
|---|---|---|---|---|---|---|
| AMC | Yes | Limited | Sometimes | Yes | No | No |
| CMC | Yes | Yes (all) | Yes | Yes | No | No |
| CAMC | Yes | Yes (all) | Yes | Yes | No | No |
| PMC | Yes | No | Sometimes | Yes | No | No |
| BMC | No | Yes (on-call) | No | No | No | No |
| Warranty Ext | Yes | Yes (OEM) | Yes | No | No | No |
| FMC | Yes | Yes | Sometimes | Yes | No | No |
| O&M | Yes | Yes | Yes | Yes | No | No |
| SLA | Defined by SLA | Defined by SLA | Defined by SLA | Yes | No | No |
| Per-Call | No | Yes (per call) | Yes (per call) | No | No | No |

### 5.4 What a Smart Form Looks Like Per Activity (HVAC Example)

**Preventive Maintenance Form — HVAC:**

| Section | Fields |
|---|---|
| **Pre-Service Checks** | Unit powered off (Y/N), Area cleared (Y/N), Safety equipment available (Y/N), Previous service report reviewed (Y/N) |
| **Filter & Coils** | Filter condition (Clean/Dirty/Replaced), Evaporator coil (Clean/Dirty/Washed), Condenser coil status, Drain line (Clear/Blocked/Flushed) |
| **Refrigerant & Gas** | Gas pressure high side (PSI), Gas pressure low side (PSI), Refrigerant type (R22/R32/R410A), Level (OK/Low/Topped up + grams) |
| **Electrical Readings** | Compressor amp reading (A), Fan motor amp reading (A), Thermostat set temp (C), Actual outlet temp (C), Supply voltage (V) |
| **Mechanical Checks** | Vibration/noise (Normal/Abnormal), Belt condition, Electrical connections (Tight/Loose/Fixed), Insulation check |
| **Parts & Materials** | Parts replaced (multi-select + quantity), Consumables used |
| **Post-Service Sign-off** | System tested and running (Y/N), Customer walkthrough done (Y/N), Next service due date, Technician name, Customer acknowledgment |

**Calibration Form — HVAC:**

| Section | Fields |
|---|---|
| **Instrument Details** | Thermostat model, Serial number, Last calibration date, Reference standard used |
| **Temperature Calibration** | Set point 1 — Set vs Actual, Set point 2 — Set vs Actual, Set point 3 — Set vs Actual, Tolerance (±0.5°C) |
| **Pressure Calibration** | High side gauge — Reference vs Reading, Low side gauge — Reference vs Reading |
| **Sensor Verification** | Return air temp sensor — Deviation, Supply air temp sensor — Deviation, Humidity sensor — Deviation |
| **Result & Certificate** | Overall result (Pass/Fail/Conditional), Certificate number, Calibration sticker applied (Y/N), Next due date |

---

## 6. How Smart Forms Link to Contracts / Templates

### 6.1 Current Linking Model (DB: `m_form_template_mappings`)

The `m_form_template_mappings` table already exists with this structure:

| Column | Type | Purpose |
|---|---|---|
| tenant_id | uuid | Which tenant |
| contract_id | uuid | Which contract instance |
| form_template_id | uuid | Which form |
| service_type | varchar | e.g. 'preventive_maintenance', 'repair' |
| timing | varchar | 'pre_service', 'during_service', 'post_service' |
| is_mandatory | boolean | Must technician fill this? |
| effective_from | date | When form becomes active |
| effective_to | date | When form expires |
| status | varchar | Active/inactive |

This is a **contract-level** mapping — when a tenant creates a contract, forms are attached to it.

### 6.2 What's Missing — The Template-Level Pre-Linking

Currently, there's **no link between form templates and equipment/nomenclature at the catalog level**. When an admin creates a global template in the designer (Step 1: AMC, Step 3: Wellness, Step 4: Treadmill), there's no way to say "attach the Treadmill PM Checklist form to this template."

**Proposed linking hierarchy:**

```
                    CATALOG LEVEL (admin defines)
                    ─────────────────────────────
m_form_templates ──→ NEW: m_form_equipment_links
                         ├── form_template_id
                         ├── resource_template_id (equipment)
                         ├── service_activity     (preventive_maintenance, repair, calibration, inspection, install, decommission)
                         ├── nomenclature_group    (equipment_maintenance, facility_property, etc.)
                         └── is_default            (auto-attach when this equipment+activity combo is selected)

                    CONTRACT LEVEL (tenant inherits)
                    ─────────────────────────────────
m_form_template_mappings (already exists)
                         ├── contract_id
                         ├── form_template_id
                         ├── service_type = service_activity
                         ├── timing
                         └── is_mandatory
```

### 6.3 Flow: How It All Connects

**Admin Flow (Global Template Designer):**
```
Step 1: Select AMC (nomenclature → equipment_maintenance group)
Step 3: Select Wellness industry
Step 4: Select Treadmill, Multi-Gym Station (equipment)
Step 5: Service blocks (pricing, SLAs)
        ↓
NEW: Smart Forms auto-suggested based on:
  - Equipment selected (Treadmill → PM Checklist, Calibration Form)
  - Nomenclature group (AMC → PM + Calibration + Inspection forms)
  - Admin can add/remove, set mandatory/optional
```

**Tenant Flow (Contract Creation):**
```
Tenant selects a global template (e.g., "Wellness AMC — Gym Equipment")
  ↓
Template comes pre-loaded with:
  - Equipment: Treadmill, Multi-Gym Station
  - Forms: PM Checklist (mandatory), Calibration Form (optional), Inspection Report
  ↓
Tenant can customize: add more forms, change mandatory/optional
  ↓
Contract created → m_form_template_mappings populated
  ↓
When service event happens → technician sees the correct forms on mobile app
```

**Tenant Settings Flow (`/settings/configure/smart-forms`):**
```
Currently: tenant sees ALL approved forms and toggles on/off (generic)
  ↓
Should become: tenant sees forms RELEVANT to their equipment
  - "You have 3 HVACs and 2 Elevators → here are the forms for those"
  - Auto-suggests based on equipment in /settings/configure/resources
  - Grouped by equipment type and service activity
```

---

## 7. Summary — What Needs to Happen

### Phase 1: Data Foundation
- Research and create smart form schemas for each equipment × service activity
- Seed `m_form_templates` with 100+ industry-standard forms
- Create `m_form_equipment_links` junction table (or add columns to existing schema)

### Phase 2: Admin Linking
- Extend global template designer with a "Smart Forms" step
- Auto-suggest forms based on selected equipment + nomenclature
- Admin can add/remove, set mandatory/optional per template

### Phase 3: Tenant Consumption
- `/settings/configure/smart-forms` shows forms grouped by tenant's equipment
- Contract creation inherits forms from template → `m_form_template_mappings`
- Mobile app shows correct forms during service events

### Phase 4: Intelligence Layer
- Gap analysis: which equipment lacks forms
- Usage analytics: which forms are filled, completion rates
- AI-assisted form generation for new equipment types

---

## APPENDIX A: Complete Equipment List (121 Items)

### Universal Equipment (industry_id = NULL, applies to ALL industries)

| Equipment | Sub-Category | Description |
|---|---|---|
| Air Conditioner / Split AC | HVAC & Cooling | Room cooling — split, window, cassette, ductable units |
| CCTV & Surveillance | Security & Surveillance | IP camera system with NVR/DVR |
| Electrical Panel / Distribution Board | Power & Electrical | Main and sub distribution boards, MCB/MCCB panels |
| Fire Alarm Panel | Fire & Safety | Addressable fire detection and alarm system |
| Fire Extinguisher | Fire & Safety | ABC/CO2/DCP fire extinguishers |
| Laptop / Desktop Computer | IT & Computing | Computing devices for office and operational use |
| Network Router / Switch | IT & Networking | LAN/WAN networking, WiFi access points |
| Plumbing System | Water & Plumbing | Water supply, drainage, sanitary fittings |
| Printer / MFD | IT & Computing | Printer, scanner, copier — multi-function devices |
| Water Purifier / RO System | Water & Plumbing | RO, UV, UF systems |

### Cross-Industry Equipment (from facility_management, applies to many industries)

| Equipment | Sub-Category | Maintenance Schedule | Makes |
|---|---|---|---|
| HVAC System | HVAC Systems | Quarterly | Daikin, Carrier, Trane, Blue Star |
| DG Set (Generator) | Power & Electrical | Monthly | Cummins, Kirloskar, Caterpillar |
| Transformer | Power & Electrical | Semi-annual | ABB, Siemens, Schneider |
| UPS System | Power & Electrical | Quarterly | APC, Emerson, Eaton |
| Elevator / Lift | Vertical Transport | Monthly | Otis, KONE, Schindler, ThyssenKrupp |
| STP / WTP Plant | Water Treatment | Monthly | Thermax, Ion Exchange, Aqua Designs |

### Aerospace (4 equipment)

| Equipment | Sub-Category |
|---|---|
| CNC Machine (Aerospace Grade) | Manufacturing |
| CMM (Coordinate Measuring Machine) | Quality Inspection |
| Environmental Test Chamber | Testing & Inspection |
| NDT Equipment | Testing & Inspection |

### Agriculture (5 equipment)

| Equipment | Sub-Category |
|---|---|
| Tractor | Farm Machinery |
| Harvester / Combine | Farm Machinery |
| Irrigation Pump / Drip System | Irrigation |
| Drone (Agricultural) | Precision Agriculture |
| Soil Testing Equipment | Testing |

### Arts & Media (2 equipment)

| Equipment | Sub-Category |
|---|---|
| Stage & Rigging Equipment | Events |
| Printing Press / Large Format Printer | Printing |

### Automotive (5 equipment)

| Equipment | Sub-Category | Maintenance | Makes |
|---|---|---|---|
| Diagnostic Equipment | — | — | — |
| Wheel Alignment Machine | Diagnostic Tools | Quarterly | Hunter, Corghi, John Bean |
| Paint Booth | Workshop Equipment | Monthly | Global Finishing, Garmat, Saico |
| Tyre Changer | Workshop Equipment | Semi-annual | Corghi, Hunter, Ravaglioli |
| Vehicle Lift / Hoist | Workshop Equipment | Semi-annual | Rotary, BendPak, Hunter |

### Construction (6 equipment)

| Equipment | Sub-Category |
|---|---|
| Concrete Batching Plant | Heavy Machinery |
| Excavator / JCB | Heavy Machinery |
| Tower Crane | Heavy Machinery |
| Scaffolding System | Safety Equipment |
| Bar Bending Machine | Steel Work |
| Transit Mixer | Transport |

### Education (3 equipment)

| Equipment | Sub-Category |
|---|---|
| Projector / Interactive Display | AV Equipment |
| Lab Equipment (Science) | Lab Equipment |
| School Bus / Transport Vehicle | Transport |

### Energy (5 equipment)

| Equipment | Sub-Category |
|---|---|
| Battery Energy Storage System | Energy Storage |
| Smart Meter / AMI System | Metering |
| HT/LT Switchgear | Power Distribution |
| Solar Panel Array | Renewable Energy |
| Wind Turbine | Renewable Energy |

### Facility Management (9 equipment)

| Equipment | Sub-Category | Maintenance | Makes |
|---|---|---|---|
| Fire Alarm Panel | Fire & Safety | Quarterly | Honeywell, Bosch, Siemens |
| HVAC System | HVAC Systems | Quarterly | Daikin, Carrier, Trane, Blue Star |
| DG Set (Generator) | Power & Electrical | Monthly | Cummins, Kirloskar, Caterpillar |
| Transformer | Power & Electrical | Semi-annual | ABB, Siemens, Schneider |
| UPS System | Power & Electrical | Quarterly | APC, Emerson, Eaton |
| CCTV & Surveillance | Security & Surveillance | Quarterly | Hikvision, Dahua, CP Plus, Bosch |
| Elevator / Lift | Vertical Transport | Monthly | Otis, KONE, Schindler, ThyssenKrupp |
| STP / WTP Plant | Water Treatment | Monthly | Thermax, Ion Exchange, Aqua Designs |
| Facility Equipment | — | Quarterly | — |

### Financial Services (4 equipment)

| Equipment | Sub-Category |
|---|---|
| ATM Machine | Banking Equipment |
| Cash Counting / Sorting Machine | Banking Equipment |
| Safe Deposit Locker System | Banking Equipment |
| Core Banking / Trading Terminal | IT Systems |

### Government (3 equipment)

| Equipment | Sub-Category |
|---|---|
| Public Address / Siren System | Communication |
| Biometric / Aadhaar System | Identity Systems |
| Record Room / Archive Storage | Records Management |

### Healthcare (8 equipment)

| Equipment | Sub-Category | Maintenance | Calibration | Makes |
|---|---|---|---|---|
| CT Scanner | Diagnostic Imaging | Quarterly | Yes | Siemens, GE, Canon |
| MRI Scanner | Diagnostic Imaging | Quarterly | Yes | Siemens, GE, Philips |
| Ultrasound Machine | Diagnostic Imaging | Semi-annual | Yes | Philips, GE, Samsung |
| X-Ray Machine | Diagnostic Imaging | Semi-annual | Yes | Fujifilm, Carestream, Agfa |
| Defibrillator | Life Support | Semi-annual | Yes | Philips, ZOLL, Stryker |
| Ventilator | Life Support | Monthly | Yes | Drager, Hamilton, Medtronic |
| Patient Monitor | Patient Monitoring | Semi-annual | Yes | Philips, Mindray, Nihon Kohden |
| Medical Diagnostic Equipment | — | Monthly | — | — |

### Home Services (4 equipment)

| Equipment | Sub-Category |
|---|---|
| Tool Kit (Multi-trade) | Field Tools |
| Painting Equipment | Painting |
| Pest Control Equipment | Pest Control |
| Service Vehicle / Van | Transport |

### Hospitality (5 equipment)

| Equipment | Sub-Category |
|---|---|
| POS / Property Management System | IT Systems |
| Kitchen Equipment (Commercial) | Kitchen Equipment |
| Laundry Equipment | Laundry |
| Pool Filtration & Chemical Dosing | Pool Systems |
| Key Card / Access Control System | Security & Access |

### Legal & Professional (2 equipment)

| Equipment | Sub-Category |
|---|---|
| Video Conferencing System | Communication |
| Document Management System | IT Systems |

### Logistics (5 equipment)

| Equipment | Sub-Category |
|---|---|
| Conveyor Belt System | Automation |
| Fleet Vehicle (Truck/Van) | Fleet |
| WMS / TMS Software | IT Systems |
| Forklift / Pallet Truck | Material Handling |
| Weighbridge | Measurement |

### Manufacturing (6 equipment)

| Equipment | Sub-Category | Maintenance | Calibration | Makes |
|---|---|---|---|---|
| CNC Machine | CNC & Machining | Monthly | Yes | DMG Mori, Mazak, Haas |
| Conveyor System | Material Handling | Quarterly | No | Dematic, Interroll, FlexLink |
| Injection Moulding Machine | Moulding & Forming | Monthly | No | Engel, Arburg, JSW |
| Industrial Compressor | Pneumatics & Hydraulics | Quarterly | No | Atlas Copco, Ingersoll Rand, Kaeser |
| Boiler / Steam Generator | Thermal Systems | Monthly | No | Thermax, Forbes Marshall, Cleaver-Brooks |
| Manufacturing Equipment | — | Weekly | — | — |

### Media (4 equipment)

| Equipment | Sub-Category |
|---|---|
| Audio Equipment | Audio |
| Broadcast Transmitter | Broadcast |
| Camera & Lens Kit | Camera Equipment |
| Lighting Equipment | Lighting |

### Nonprofit (2 equipment)

| Equipment | Sub-Category |
|---|---|
| Donation Management System | IT Systems |
| Mobile Health / Service Van | Outreach |

### Pharma (6 equipment)

| Equipment | Sub-Category |
|---|---|
| HVAC-AHU (Pharma Grade) | HVAC Systems |
| HPLC / Gas Chromatograph | Lab Equipment |
| Tablet Press / Compression Machine | Manufacturing Equipment |
| Packaging Machine | Packaging |
| Autoclave / Sterilizer | Sterilization |
| Purified Water System | Water Systems |

### Professional Services (1 equipment)

| Equipment | Sub-Category |
|---|---|
| Project Management Software | IT Systems |

### Real Estate (3 equipment)

| Equipment | Sub-Category |
|---|---|
| BMS / Building Automation System | Automation |
| Landscaping & Irrigation System | Landscaping |
| Boom Barrier / Parking Management | Security & Access |

### Retail (4 equipment)

| Equipment | Sub-Category |
|---|---|
| POS Billing System | IT Systems |
| Refrigeration / Display Cooler | Refrigeration |
| EAS / Anti-theft System | Security |
| Escalator / Travelator | Vertical Transport |

### Spiritual & Religious (2 equipment)

| Equipment | Sub-Category |
|---|---|
| PA / Sound System (Worship) | Audio Systems |
| Donation Box / Counter System | Donation Management |

### Technology (4 equipment)

| Equipment | Sub-Category | Maintenance | Makes |
|---|---|---|---|
| Network Switch | Networking | Semi-annual | Cisco, Juniper, Aruba |
| Precision AC Unit | Power & Cooling | Quarterly | Stulz, Vertiv, Schneider |
| Server Rack | Server & Compute | Quarterly | Dell, HP, Lenovo |
| IT Equipment | — | — | — |

### Telecommunications (4 equipment)

| Equipment | Sub-Category |
|---|---|
| BTS / Radio Equipment | Radio Network |
| Fiber Optic Network Equipment | Network Equipment |
| Server Rack & Networking | Data Center Equipment |
| Precision Cooling (PAC) | Cooling Systems |

### Wellness (4 equipment)

| Equipment | Sub-Category | Maintenance | Makes |
|---|---|---|---|
| Multi-Gym Station | Fitness Equipment | Semi-annual | Technogym, Matrix, Cybex |
| Treadmill (Commercial) | Fitness Equipment | Quarterly | Life Fitness, Precor, Technogym |
| Spa / Sauna Unit | Spa & Relaxation | Monthly | Jacuzzi, Harvia, TylöHelo |
| Fitness Equipment | — | Monthly | — |

---

## APPENDIX B: Complete Facilities List (54 Items)

### Universal Facilities (applies to ALL industries)

| Facility | Sub-Category |
|---|---|
| Parking Area | Common Areas |
| Washroom / Restroom | Common Areas |

### Aerospace (2)

| Facility | Sub-Category |
|---|---|
| Hangar / Maintenance Bay | Maintenance Facilities |
| Test Range / Proving Ground | Testing Facilities |

### Agriculture (2)

| Facility | Sub-Category |
|---|---|
| Farm / Agricultural Land | Farm Land |
| Cold Storage (Agri) | Storage |

### Arts & Media (1)

| Facility | Sub-Category |
|---|---|
| Gallery / Exhibition Space | Exhibition Spaces |

### Construction (1)

| Facility | Sub-Category |
|---|---|
| Construction Site | Project Sites |

### Education (6)

| Facility | Sub-Category |
|---|---|
| Classroom / Lecture Hall | Academic Spaces |
| Library | Academic Spaces |
| Computer Lab / IT Lab | Laboratories |
| Science Laboratory | Laboratories |
| Hostel / Dormitory | Residential |
| Sports Ground / Gymnasium | Sports & Recreation |

### Energy (1)

| Facility | Sub-Category |
|---|---|
| Power Plant / Substation | Generation & Distribution |

### Facility Management (4)

| Facility | Sub-Category |
|---|---|
| Commercial Office Tower | Commercial Properties |
| Shopping Mall | Commercial Properties |
| Industrial Park / Warehouse | Industrial Properties |
| Residential Building | Residential Properties |

### Financial Services (2)

| Facility | Sub-Category |
|---|---|
| Branch Office / Banking Hall | Branch Facilities |
| Vault / Strong Room | Secure Facilities |

### Government (2)

| Facility | Sub-Category |
|---|---|
| Government Office Building | Office Facilities |
| Public Service Center / e-Seva | Public Facilities |

### Healthcare (3)

| Facility | Sub-Category |
|---|---|
| Diagnostic Lab | Clinical Facilities |
| Hospital Ward | Clinical Facilities |
| Operation Theatre | Clinical Facilities |

### Hospitality (4)

| Facility | Sub-Category |
|---|---|
| Guest Room / Suite | Accommodation |
| Banquet Hall / Conference Room | Event Spaces |
| Commercial Kitchen | Food & Beverage |
| Swimming Pool | Recreational |

### Legal & Professional (1)

| Facility | Sub-Category |
|---|---|
| Office / Chamber | Office Space |

### Logistics (2)

| Facility | Sub-Category |
|---|---|
| Loading Dock / Bay | Warehousing |
| Warehouse / Distribution Center | Warehousing |

### Manufacturing (1)

| Facility | Sub-Category |
|---|---|
| Production Facility | — |

### Media (2)

| Facility | Sub-Category |
|---|---|
| Editing Suite / Post-Production | Post Production |
| Studio (Recording/Shooting) | Production Facilities |

### Nonprofit (1)

| Facility | Sub-Category |
|---|---|
| Community Center / Shelter | Community Spaces |

### Pharma (3)

| Facility | Sub-Category |
|---|---|
| QC Laboratory | Laboratory Facilities |
| Clean Room / Controlled Environment | Manufacturing Facilities |
| Cold Storage / Walk-in Cooler | Storage Facilities |

### Professional Services (1)

| Facility | Sub-Category |
|---|---|
| Co-working Space / Office | Office Space |

### Real Estate (3)

| Facility | Sub-Category |
|---|---|
| Commercial Office Space | Commercial Properties |
| Shopping Mall / Retail Space | Commercial Properties |
| Residential Tower / Building | Residential Properties |

### Retail (2)

| Facility | Sub-Category |
|---|---|
| Retail Store / Showroom | Retail Spaces |
| Warehouse / Godown | Storage |

### Spiritual & Religious (2)

| Facility | Sub-Category |
|---|---|
| Community Kitchen / Langar Hall | Community Spaces |
| Temple / Church / Mosque / Gurudwara | Religious Spaces |

### Technology (2)

| Facility | Sub-Category |
|---|---|
| Data Center | Data Facilities |
| Server Room | Data Facilities |

### Telecommunications (2)

| Facility | Sub-Category |
|---|---|
| Data Center | Data Infrastructure |
| Cell Tower / BTS Site | Network Infrastructure |

### Wellness (2)

| Facility | Sub-Category |
|---|---|
| Gym Floor | Wellness Facilities |
| Swimming Pool | Wellness Facilities |

---

**TOTALS:**
- **121 Equipment types** (27 industries + 8 universal + 6 cross-industry)
- **54 Facility types** (25 industries + 2 universal)
- **21 Contract Nomenclatures** (4 groups)
- **6 Service Activities** per equipment (PM, Repair, Calibration, Inspection, Install, Decommission)

---

*Generated from codebase analysis — March 2026*
*Tables: m_form_templates, m_form_tenant_selections, m_form_template_mappings, m_form_submissions, m_catalog_resource_templates, m_category_details (nomenclatures), m_catalog_industries*

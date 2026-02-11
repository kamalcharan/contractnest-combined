# ContractNest Business Domain Audit

**Date**: 2026-02-11
**Auditor Perspective**: Service Contract Domain Expert (20+ years in facility management, equipment maintenance, contract operations)
**Scope**: Equipment-Dependent Contracts, Entity-Dependent Contracts, Nomenclature & Contract Type Taxonomy
**Codebase Version**: Current HEAD across contractnest-api, contractnest-ui, contractnest-edge

---

## TRACK 1: Equipment-Dependent Contracts

### Current State

**Q1. Equipment Master Table**

**PARTIALLY FOUND — Type definitions exist, NO database table.**

There is NO `t_equipment` or `t_assets` master table in the database. However, equipment is modeled at the TypeScript type level:

- **Backend type** — `contractnest-api/src/types/catalog.ts`:
  ```
  CatalogItemType = 'service' | 'equipment' | 'spare_part' | 'asset'
  ResourceType = 'team_staff' | 'equipment' | 'consumable' | 'asset' | 'partner'
  ```

- **Backend block config** — `contractnest-api/src/types/sevice-contracts/block.ts:171-183`:
  ```typescript
  export interface EquipmentBlockConfig {
    selectedEquipmentIds: string[];
    equipmentDetails: {
      equipmentId: string;
      specifications: Record<string, any>;
      location: string;
      warrantyExpiry?: string;
      lastMaintenanceDate?: string;
      calibrationParameters?: CalibrationParameter[];
    }[];
    requiresCalibration: boolean;
    maintenanceSchedule?: string;
  }
  ```

- **UI type** — `contractnest-ui/src/types/service-contracts/contract.ts:183-196`:
  ```typescript
  export interface EquipmentDetails {
    id: string;
    name: string;
    serialNumber: string;
    model: string;
    manufacturer: string;
    category: string;
    subCategory: string;
    specifications: Record<string, any>;
    calibrationParameters?: CalibrationParameter[];
    location?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
  }
  ```

- **Generic resource table exists** — `contractnest-api/contractnest_schema.sql`: `t_catalog_resources` with columns `id`, `tenant_id`, `name`, `description`, `resource_type_id`, `location_id`, `is_mobile`, `service_radius_km`, `capacity_per_day`, `hourly_cost`, `daily_cost`, `currency_code`, `status`. This is a generic resource (people, equipment, vehicles) — NOT a dedicated equipment master with make, model, serial_number, asset_tag, purchase_date, warranty_expiry, condition, criticality.

- **Resource type master** — `m_catalog_resource_types` exists with `id`, `name`, `pricing_model`. The comment on `t_category_resources_master.resource_type_id` says: *"References resource type (consumable, asset, equipment, etc.)"* — so equipment is a resource_type enum value, not a first-class entity.

**Missing fields**: `serial_number`, `asset_tag`, `make`, `model`, `purchase_date`, `warranty_expiry` (exists in TS type but not in DB), `condition`, `criticality`.

---

**Q2. Equipment ↔ Contract Link**

**PARTIALLY FOUND — Implicit through service blocks, NO explicit junction table.**

- There is NO `t_contract_equipment` or `t_equipment_contract` junction table.
- Equipment is linked via `t_contract_blocks.custom_fields` (JSONB) — equipment details are serialized into block config JSON.
- The service contract type config in `contractnest-ui/src/utils/constants/service-contracts/contractTypes.ts:58-70` lists `'equipment'` as an available block type:
  ```typescript
  availableBlocks: ['contact', 'base-details', 'equipment', 'acceptance-criteria',
                    'service-commitment', 'milestone', 'billing-rules', ...]
  ```
- Relationship is one-to-many (contract block → equipment config), NOT many-to-many. The same physical equipment cannot be tracked across multiple contracts because there's no equipment master table to reference.

---

**Q3. Equipment-Specific Scheduling**

**NOT FOUND.**

- `t_service_tickets` (in `contractnest-edge/supabase/migrations/contracts/022_service_tickets_table.sql`) has columns: `id`, `tenant_id`, `contract_id`, `ticket_number`, `status`, `scheduled_date`, `started_at`, `completed_at`, `assigned_to`, `notes`, `completion_notes`.
- There is NO `equipment_id` column on service tickets.
- `t_contract_events` (in `012_contract_events_tables.sql`) links to `contract_id` and `block_id` — NOT to individual equipment items.
- Per-equipment scheduling (e.g., "AC Unit #7 filter cleaning every 90 days") is NOT possible. Scheduling is at the block level only.

---

**Q4. Equipment Lifecycle in Contracts**

**NOT FOUND.**

- No equipment status tracking (active, retired, in-repair, transferred, decommissioned).
- No equipment transfer logic between contracts.
- No warranty expiry triggers or notifications.
- `warrantyExpiry` and `lastMaintenanceDate` exist as optional strings in TypeScript interfaces but have no database backing, no cron jobs, no notification triggers.
- When a contract expires, nothing happens to equipment references because they're embedded in JSONB, not in a relational structure.

---

**Q5. Equipment Addition by Buyer**

**NOT FOUND.**

- The contract wizard has 10 steps (see Q8 below). None involve buyer-side equipment registration.
- The buyer acceptance flow (`t_contract_access` / CNAK system) allows buyers to accept/reject contracts — NOT to add or modify equipment.
- No buyer-facing equipment form, modal, or registration wizard exists in `contractnest-ui`.

---

**Q6. Equipment Grouping**

**NOT FOUND.**

- No equipment group, set, lot, or category tables exist.
- `m_block_categories` and `m_block_masters` categorize contract BLOCKS (service, spare, text, document) — NOT equipment.
- No sub-categorization of equipment (e.g., "Pumps", "Motors", "Control Systems").
- Cannot group "All ACs in Building A" and attach the group to a contract.

---

**Q7. Equipment Evidence**

**NOT FOUND — Evidence is block-level, not equipment-level.**

- `t_service_evidence` (in `024_service_evidence_table.sql`) has columns: `id`, `tenant_id`, `ticket_id`, `event_id`, `block_id`, `block_name`, `evidence_type`, `file_url`, `file_name`, `file_size`, `form_data`, `status`, `uploaded_by`.
- Evidence links to `ticket_id` + `block_id`. There is NO `equipment_id` column.
- Evidence categories in `MediaUploadBlockConfig` include `'equipment'` as a category label — but this is a STRING tag, not a foreign key to an equipment record.

---

**Q8. Contract Creation Wizard — Equipment Step**

**NOT FOUND — No equipment step in the wizard.**

The contract wizard is defined in `contractnest-ui/src/components/contracts/ContractWizard/index.tsx:101-112`:

| Step # | Step ID | Label | Component |
|--------|---------|-------|-----------|
| 1 | `path` | Choose Path | `PathSelectionStep.tsx` |
| 2 | `acceptance` | Acceptance | `AcceptanceMethodStep.tsx` |
| 3 | `counterparty` | Counterparty | `BuyerSelectionStep.tsx` |
| 4 | `details` | Details | `ContractDetailsStep.tsx` |
| 5 | `billingCycle` | Billing Cycle | `BillingCycleStep.tsx` |
| 6 | `blocks` | Add Blocks | `ServiceBlocksStep.tsx` |
| 7 | `billingView` | Billing View | `BillingViewStep.tsx` |
| 8 | `evidencePolicy` | Evidence Policy | `EvidencePolicyStep.tsx` |
| 9 | `events` | Events Preview | `EventsPreviewStep.tsx` |
| 10 | `review` | Review & Send | `ReviewSendStep.tsx` |

The "Add Blocks" step (Step 6) has FlyBy block options (`ServiceBlocksStep.tsx:110-115`):
```typescript
flyByMenuOptions = [
  { type: 'service',  label: 'Service' },
  { type: 'spare',    label: 'Spare Part' },
  { type: 'text',     label: 'Text Block' },
  { type: 'document', label: 'Document' },
];
```

**No `equipment` FlyBy type.** Despite `availableBlocks` in `contractTypes.ts` listing `'equipment'`, the wizard UI does NOT render an equipment option.

The wizard state (`ContractWizardState` at line 38-82) has NO `equipmentIds`, `equipmentDetails`, or equipment-related fields.

---

### Gap Summary

- **No `t_equipment` master table** — equipment exists only as a TypeScript interface and a generic `resource_type` enum value
- **No explicit equipment ↔ contract junction table** — linking is via JSONB in block config
- **No `equipment_id` on service tickets or events** — no per-equipment scheduling
- **No equipment lifecycle management** — no status tracking, no warranty expiry triggers, no transfer between contracts
- **No buyer-side equipment registration** — buyers can't add their equipment during contract acceptance
- **No equipment grouping** — can't create equipment sets/lots
- **No equipment-level evidence** — evidence is tied to tickets/blocks, not equipment
- **No equipment step in the wizard UI** — despite being listed in `availableBlocks`, the wizard doesn't render it

### Recommendation

**New tables required:**

```sql
-- Equipment Master
CREATE TABLE t_equipment (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID NOT NULL REFERENCES t_tenants(id),
    name                VARCHAR(255) NOT NULL,
    make                VARCHAR(100),
    model               VARCHAR(100),
    serial_number       VARCHAR(100),
    asset_tag           VARCHAR(50),
    category_id         UUID,           -- FK to equipment category
    sub_category        VARCHAR(100),
    purchase_date       DATE,
    warranty_expiry     DATE,
    location            TEXT,           -- FK to t_entities when Track 2 is built
    condition           VARCHAR(20) DEFAULT 'good',  -- good/fair/poor/critical
    criticality         VARCHAR(20) DEFAULT 'medium', -- low/medium/high/critical
    specifications      JSONB DEFAULT '{}',
    calibration_params  JSONB DEFAULT '[]',
    last_maintenance    TIMESTAMPTZ,
    next_maintenance    TIMESTAMPTZ,
    status              VARCHAR(20) DEFAULT 'active', -- active/inactive/retired/in_repair
    owner_contact_id    UUID,           -- FK to t_contacts (buyer who owns it)
    is_active           BOOLEAN DEFAULT true,
    is_live             BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID,
    UNIQUE(tenant_id, serial_number),
    UNIQUE(tenant_id, asset_tag)
);

-- Equipment ↔ Contract Junction (many-to-many)
CREATE TABLE t_contract_equipment (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id         UUID NOT NULL REFERENCES t_contracts(id) ON DELETE CASCADE,
    equipment_id        UUID NOT NULL REFERENCES t_equipment(id),
    tenant_id           UUID NOT NULL,
    block_id            UUID,           -- Optional link to specific service block
    coverage_type       VARCHAR(30),    -- 'full'/'limited'/'parts_only'/'labor_only'
    notes               TEXT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, equipment_id)
);

-- Equipment Groups
CREATE TABLE t_equipment_groups (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    location            TEXT,
    equipment_count     INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_equipment_group_items (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id            UUID NOT NULL REFERENCES t_equipment_groups(id) ON DELETE CASCADE,
    equipment_id        UUID NOT NULL REFERENCES t_equipment(id),
    UNIQUE(group_id, equipment_id)
);
```

**UI changes required:**
- Add "Equipment" step to contract wizard (between Counterparty and Details, or after Details)
- Add equipment FlyBy type in ServiceBlocksStep
- Add buyer-side equipment registration form in the contract acceptance flow
- Add equipment_id column to `t_service_tickets` and `t_service_evidence`
- Add equipment filter on service ticket list and evidence gallery

---

## TRACK 2: Entity-Dependent Contracts

### Current State

**Q1. Entity Master Table**

**NOT FOUND.**

- No `t_entities`, `t_properties`, `t_buildings`, `t_floors`, `t_rooms`, `t_spaces` table exists in the database schema.
- `t_catalog_resources` has a `location_id` (UUID) field but it is NOT a FK to any location master table — it appears unused/orphaned.
- `t_contacts` can be typed as `'corporate'` with an address (`t_contact_addresses`) but this models the BUYER's address, not the SERVICE LOCATION.
- `t_contact_addresses` has columns: `address_line1`, `address_line2`, `city`, `state_code`, `country_code`, `postal_code`, `google_pin`. Address types: `'home' | 'office' | 'billing' | 'shipping' | 'factory' | 'warehouse' | 'other'`.
- There is NO concept of: entity_type, dimensions (area_sqft, length, width), zone/sector, specifications for physical spaces.

---

**Q2. Entity Type Taxonomy**

**NOT FOUND.**

- No classification system for entity types (building, floor, flat, room, garden, lawn, pool, clean_room, parking, common_area, terrace, facade, warehouse, lab, server_room).
- `t_category_master` and `t_category_details` exist but are used for generic dynamic enums (resource allocation types, sequence numbers, tax categories, event statuses) — NOT entity types.
- No enum, constant, or dropdown anywhere in the codebase defines physical space types.

---

**Q3. Entity ↔ Contract Link**

**NOT FOUND.**

- No junction table linking contracts to entities/properties/locations.
- `t_contracts` has `buyer_id`, `buyer_name`, `buyer_company`, `buyer_email`, `buyer_phone` — all contact-based, NOT location-based.
- No `entity_id`, `property_id`, `location_id`, or `building_id` on contracts.
- `t_contract_blocks` links contracts to service blocks — NOT to physical spaces.

---

**Q4. Entity Hierarchy**

**NOT FOUND.**

- No parent-child entity structure (campus → building → floor → wing → room).
- `m_block_categories` has a `parent_id` but for BLOCK categorization, not physical spaces.
- `t_contacts` has `parent_contact_id` and `parent_contact_ids` (JSONB) for contact hierarchy — NOT entity hierarchy.

---

**Q5. Entity-Specific Parameters (Pricing)**

**NOT FOUND.**

- No per-sq.ft., per-zone, per-floor pricing.
- `t_contract_blocks` has `unit_price` × `quantity` → `total_price`. This is flat pricing, not area-based or zone-based.
- `m_catalog_pricing_templates` has `rule_type` values including `'location_based'` — suggesting the CONCEPT exists in the pricing template system, but there is no entity master to attach it to.
- No pricing rule engine that can compute "₹5/sq.ft. × 50,000 sq.ft. = ₹2,50,000".

---

**Q6. Entity Addition by Buyer**

**NOT FOUND.**

- No buyer-facing entity/property/building registration form anywhere in `contractnest-ui`.
- `BuyerSelectionStep.tsx` selects existing contacts only — no property/location fields.
- The contract acceptance flow (CNAK/external access) allows accept/reject — NOT entity registration.

---

**Q7. Entity Condition Tracking**

**NOT FOUND — Service execution tracking exists, but not entity-specific.**

- `t_service_evidence` tracks evidence per ticket/block — NOT per entity/space.
- `t_audit_log` tracks contract lifecycle changes, NOT entity inspections.
- No inspection log, condition score, or before/after record tied to a physical space.
- No concept of "Building A — Condition Score: 7/10 — Last Inspection: Jan 2026".

---

**Q8. Contract Creation Wizard — Entity Step**

**NOT FOUND.**

- The 10-step wizard (documented in Track 1, Q8) has ZERO entity/property/location selection steps.
- No step asks "Where will this service be performed?" or "Which building/floor/zone?"
- The wizard is entirely: What service + Who is the buyer + How much + When to bill.

---

### Gap Summary

- **No entity/property/space master table** — physical locations have no structured representation
- **No entity type taxonomy** — no classification of buildings, floors, rooms, gardens, pools, etc.
- **No entity ↔ contract linking** — contracts don't reference WHERE service is performed
- **No entity hierarchy** — can't model campus → building → floor → room
- **No area-based or zone-based pricing** — despite `'location_based'` pricing rule type existing in master
- **No buyer entity registration** — buyers can't describe their properties
- **No entity condition tracking** — no inspections, no condition scores
- **No entity step in wizard** — wizard doesn't ask about service location/property

### Recommendation

**New tables required:**

```sql
-- Entity Type Master (global)
CREATE TABLE m_entity_types (
    id                  VARCHAR(50) PRIMARY KEY,  -- 'building','floor','room','garden','pool', etc.
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    icon                VARCHAR(50),
    has_dimensions      BOOLEAN DEFAULT false,    -- whether area_sqft is relevant
    has_capacity        BOOLEAN DEFAULT false,    -- whether occupancy matters
    allowed_parent_types VARCHAR(50)[],           -- e.g., floor can be under building
    is_active           BOOLEAN DEFAULT true,
    sort_order          INTEGER DEFAULT 0
);

-- Entity Master (tenant-specific)
CREATE TABLE t_entities (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    entity_type_id      VARCHAR(50) NOT NULL REFERENCES m_entity_types(id),
    parent_entity_id    UUID REFERENCES t_entities(id),  -- hierarchy
    owner_contact_id    UUID REFERENCES t_contacts(id),  -- buyer who owns it
    name                VARCHAR(255) NOT NULL,
    code                VARCHAR(50),              -- internal code (e.g., "BLD-A", "FLR-3")
    description         TEXT,
    -- Dimensions
    area_sqft           NUMERIC(12,2),
    length_ft           NUMERIC(10,2),
    width_ft            NUMERIC(10,2),
    height_ft           NUMERIC(10,2),
    capacity            INTEGER,                  -- people/units
    -- Location
    address_id          UUID,                     -- FK to t_contact_addresses
    zone                VARCHAR(100),
    sector              VARCHAR(100),
    floor_number        INTEGER,
    -- Specifications
    specifications      JSONB DEFAULT '{}',       -- custom attributes
    condition_score     NUMERIC(3,1),             -- 0-10
    last_inspection     TIMESTAMPTZ,
    -- Status
    status              VARCHAR(20) DEFAULT 'active',
    is_active           BOOLEAN DEFAULT true,
    is_live             BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID
);

-- Entity ↔ Contract Junction
CREATE TABLE t_contract_entities (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id         UUID NOT NULL REFERENCES t_contracts(id) ON DELETE CASCADE,
    entity_id           UUID NOT NULL REFERENCES t_entities(id),
    tenant_id           UUID NOT NULL,
    block_id            UUID,                     -- optional link to specific service block
    pricing_rate        NUMERIC(12,4),            -- e.g., ₹5/sqft
    pricing_unit        VARCHAR(20),              -- 'per_sqft','per_unit','fixed'
    notes               TEXT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, entity_id)
);

-- Entity Inspection Log
CREATE TABLE t_entity_inspections (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id           UUID NOT NULL REFERENCES t_entities(id),
    contract_id         UUID,                     -- optional contract context
    tenant_id           UUID NOT NULL,
    inspection_date     TIMESTAMPTZ NOT NULL,
    condition_score     NUMERIC(3,1),             -- 0-10
    notes               TEXT,
    findings            JSONB DEFAULT '[]',       -- structured findings
    evidence_urls       JSONB DEFAULT '[]',       -- photos/docs
    inspected_by        UUID,
    inspected_by_name   TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed data for `m_entity_types`:**
```sql
INSERT INTO m_entity_types (id, name, has_dimensions, allowed_parent_types, sort_order) VALUES
('campus',       'Campus',         true,  '{}',                    1),
('building',     'Building',       true,  '{campus}',              2),
('floor',        'Floor',          true,  '{building}',            3),
('wing',         'Wing',           true,  '{floor}',               4),
('room',         'Room',           true,  '{floor,wing}',          5),
('flat',         'Flat/Unit',      true,  '{floor,building}',      6),
('garden',       'Garden/Lawn',    true,  '{campus,building}',     7),
('pool',         'Swimming Pool',  true,  '{campus,building}',     8),
('clean_room',   'Clean Room',     true,  '{floor,building}',      9),
('parking',      'Parking Area',   true,  '{campus,building}',    10),
('common_area',  'Common Area',    true,  '{floor,building}',     11),
('terrace',      'Terrace',        true,  '{building}',           12),
('facade',       'Facade',         true,  '{building}',           13),
('warehouse',    'Warehouse',      true,  '{campus}',             14),
('lab',          'Laboratory',     true,  '{floor,building}',     15),
('server_room',  'Server Room',    true,  '{floor,building}',     16);
```

**UI changes required:**
- Add "Service Location" step to contract wizard (after Counterparty)
- Add entity management page (CRUD for properties/buildings/spaces)
- Add buyer-side entity registration in acceptance flow
- Add entity hierarchy tree view component
- Add entity-based pricing in BillingViewStep (₹/sqft × area)
- Add entity filter on contract list and dashboards

---

## TRACK 3: Nomenclature & Contract Type Taxonomy

### Current State

**Q1. Current Contract Types — What Exists Today**

There are **THREE separate, INCONSISTENT type systems** across the codebase:

**System A — UI Service-Contracts Module** (`contractnest-ui/src/types/service-contracts/contract.ts:3`):
```typescript
export type ContractType = 'service' | 'partnership';
```

**System B — UI General Contracts Module** (`contractnest-ui/src/types/contracts.ts:28-35`):
```typescript
export const CONTRACT_TYPES = {
  SERVICE: 'service',
  PARTNERSHIP: 'partnership',
  NDA: 'nda',
  PURCHASE_ORDER: 'purchase_order',
  LEASE: 'lease',
  SUBSCRIPTION: 'subscription',
};
```

**System C — API Layer** (`contractnest-api/src/types/contractTypes.ts:33-39`):
```typescript
export const CONTRACT_TYPES = {
  FIXED_PRICE: 'fixed_price',
  TIME_AND_MATERIALS: 'time_and_materials',
  RETAINER: 'retainer',
  MILESTONE: 'milestone',
  SUBSCRIPTION: 'subscription',
};
```

**System D — API Validator** (`contractnest-api/src/validators/contractValidators.ts:12`):
```typescript
const CONTRACT_TYPES = ['client', 'vendor', 'partner', 'fixed_price', 'time_and_materials', 'retainer', 'milestone', 'subscription'];
```

**System E — Contract Wizard** (`contractnest-ui/src/components/contracts/ContractWizard/index.tsx:35`):
```typescript
export type ContractType = 'client' | 'vendor' | 'partner';
```

**Summary: 5 overlapping type systems, none matching the industry nomenclature (AMC/CMC/PMC etc.).**

The `contract_type` column in `t_contracts` stores `'client' | 'vendor' | 'partner'` — which is actually a **relationship perspective** (who you are in the contract), NOT a contract type in the industry sense.

---

**Q2. Where Users See Contract Type**

The user sees **TWO cards** when creating a contract:

File: `contractnest-ui/src/pages/contracts/create/steps/ContractTypeStep.tsx:31-61`:

1. **"Service Contract"** — *"For ongoing service agreements with customers including pest control, lawn care, HVAC maintenance, and more."* Features listed: Recurring service schedules, Equipment tracking, Service area definitions, Automatic billing cycles, Customizable terms. Marked "Most Popular".

2. **"Partnership Agreement"** — *"For business partnerships including revenue sharing, joint ventures..."*

That's it. A hospital admin looking for "AMC" or a facility manager looking for "FMC" will see **neither term**. They see only "Service Contract" or "Partnership Agreement".

In the contract wizard (`ContractWizard/index.tsx:35`), the `contractType` is set to `'client' | 'vendor' | 'partner'` — this determines perspective, NOT the type of service contract.

---

**Q3. Template Tagging with Nomenclature**

**PARTIALLY FOUND — "AMC" appears in template names and tags, but NOT as a formal contract type.**

In `contractnest-ui/src/pages/catalog-studio/templates-list.tsx`, hardcoded global templates extensively use "AMC":

- Line 187: `name: 'CT Scan Machine AMC'` — tags: `['CT Scan', 'Radiology', 'AMC', 'Healthcare']`
- Line 239: `name: 'Central HVAC System AMC'` — tags: `['HVAC', 'Central AC', 'Chiller', 'AMC']`
- Line 288: `name: 'Passenger Lift AMC'` — tags: `['Elevator', 'Lift', 'AMC', 'Safety']`
- Line 432: `name: 'Defibrillator AMC'` — tags: `['AED', 'Defibrillator', 'Emergency', 'AMC']`
- Line 577: `name: 'Split AC AMC'` — tags: `['AC', 'Split AC', 'AMC', 'Cooling']`
- Line 625: `name: 'DG Set AMC'` — tags: `['Generator', 'DG Set', 'Power', 'AMC']`
- Line 674: `name: 'Goods Elevator AMC'` — tags: `['Goods Lift', 'Elevator', 'Industrial', 'AMC']`
- Line 721: `name: 'Clean Room AMC'`
- Line 771: `name: 'Pharma Reactor AMC'`
- Line 868: `name: 'Industrial Compressor AMC'`
- Line 917: `name: 'Stairlift Installation & AMC'`
- Line 1110: `name: 'VRF System AMC'`

**"AMC" is in tags but NOT a formal, filterable contract_type field.** Templates have `industry` and `category` fields but NO `contract_type` or `nomenclature_type` field.

Other terms found in template descriptions:
- "Preventive Maintenance" — in template block descriptions (line 323: `'Monthly Preventive Maintenance'`)
- "Breakdown Visits" — (line 323: `'Unlimited Breakdown Visits'`)
- These are free-text strings, NOT structured nomenclature.

---

**Q4. Search & Filter by Nomenclature**

**PARTIALLY FOUND — Generic type filter exists, NOT nomenclature-specific.**

- `contractnest-ui/src/services/serviceURLs.ts:947`: `if (filters.contract_type) params.append('contract_type', filters.contract_type);` — filters by `'client'/'vendor'/'partner'`, NOT by AMC/CMC/PMC.
- `contractnest-ui/src/hooks/queries/useTemplates.ts:203-204`: Template filter by `contractType` exists but matches the generic types.
- Users CAN search templates by tag text (including "AMC") through tag-based search — but this is text search, not structured filtering.
- Contract list page has NO filter for "Show me all AMCs" or "Show me all FMCs".

---

**Q5. Reports & Dashboards**

**FOUND — Generic grouping only.**

- `contractnest-ui/src/pages/contracts/hub/index.tsx:772`: `const byType = statsData?.by_contract_type || {};`
- `contractnest-ui/src/types/contracts.ts:403`: `by_contract_type: Record<string, number>;`
- Dashboard groups by `contract_type` which is `'client'/'vendor'/'partner'` — NOT by AMC/CMC/PMC.
- Ops Cockpit (`contractnest-ui/src/pages/ops/cockpit/index.tsx:1110, 1188`) also groups by perspective type.
- **No chart, metric, or KPI shows "You have 12 AMCs, 3 CMCs, 5 FMCs".**

---

**Q6. Invoice & Document Labels**

**PARTIALLY FOUND — Hardcoded examples only.**

- PDF filename example in `contractnest-ui/src/pages/contracts/pdf-view/index.tsx:46-47`: `fileName: 'contract-AMC-2024-001.pdf'` — hardcoded, not dynamic.
- PDF title in `contractnest-ui/src/pages/contracts/preview/index.tsx:43`: `title: 'Annual Maintenance Service Agreement'` — again hardcoded, not derived from contract data.
- Invoice generation (`t_invoices`) has `invoice_number` (e.g., "INV-10001") but NO contract type label. Invoice doesn't say "AMC Invoice" vs "FMC Invoice".
- **No dynamic document labeling based on contract nomenclature.**

---

**Q7. Catalog Integration**

**PARTIALLY FOUND — Industry mapping exists, NOT nomenclature mapping.**

- `m_catalog_industries` table (`contractnest-api/contractnest_schema.sql:6054-6078`) has: `id`, `name`, `description`, `icon`, `common_pricing_rules` (JSONB), `compliance_requirements` (JSONB).
- Industry IDs: `healthcare`, `wellness`, `manufacturing`, `technology`, `financial`, `professional`, `logistics` (from `contractTypes.ts:387-454`).
- **Industries do NOT carry nomenclature mapping.** Healthcare industry config does NOT say "typical contract types: AMC, CMC, Biomedical AMC". It only says `commonContractTypes: ['service']`.

- In `contractnest-ui/src/utils/constants/industry-advanced.ts`:
  - Line 36: `name: 'Medical Equipment AMC'` — a category name, NOT a formal nomenclature type.
  - Line 209: `name: 'Facility Management'` — category name only.
  - Line 309: `commonVariants: ['Fixed Price', 'Time & Material', 'Retainer']` — pricing models, NOT contract types.
  - Line 821: `name: 'Annual Rate Contracts'` — appears as a category label in logistics.

---

**Q8. Smart Suggestions**

**PARTIALLY FOUND — Industry recommendations exist, NOT nomenclature suggestions.**

In `contractnest-ui/src/utils/constants/service-contracts/contractTypes.ts:509-535`:
```typescript
getAvailableContractTypes(industry?: string): ContractType[]
// Returns ['service'] or ['service', 'partnership'] based on industry

getRecommendedBillingFrequencies(industry?, contractType?): BillingFrequency[]
// Returns billing frequencies based on industry

getRecommendedAcceptanceCriteria(industry?, contractType?): AcceptanceCriteria[]
// Returns acceptance methods based on industry
```

- These functions recommend billing frequencies and acceptance methods — NOT contract nomenclature.
- **No logic exists for**: "Equipment attached → suggest AMC/CMC", "Entity attached → suggest FMC/O&M", "Staffing blocks → suggest Manpower Contract".

---

**Q9. Industry ↔ Nomenclature Mapping**

**NOT FOUND.**

- `INDUSTRY_CONFIGS` in `contractTypes.ts:387-454` maps industries to `commonContractTypes: ['service']` — always the generic "service" type.
- No industry carries AMC/CMC/PMC nomenclature.
- Healthcare config has `requiredCompliance: ['HIPAA', 'FDA', 'HITECH']` but NOT `typicalNomenclature: ['AMC', 'CMC', 'Biomedical AMC']`.
- Manufacturing config does NOT mention PMC or BMC.
- No real estate, facilities, or property management industry config exists at all.

---

### Gap Summary

**vs. the 15-term industry taxonomy:**

| Term | Status | Where Found |
|------|--------|-------------|
| AMC (Annual Maintenance Contract) | IN TEMPLATE NAMES ONLY | `templates-list.tsx` — 15+ templates tagged "AMC" but not a formal type |
| CMC (Comprehensive Maintenance Contract) | NOT FOUND | Nowhere in codebase |
| CAMC (Comprehensive AMC) | NOT FOUND | Nowhere in codebase |
| PMC (Preventive Maintenance Contract) | NOT FOUND | "Preventive Maintenance" appears as block description text only |
| BMC (Breakdown Maintenance Contract) | NOT FOUND | "Breakdown Visits" appears as block feature text only |
| FMC (Facility Management Contract) | NOT FOUND | "Facility Management" appears as category name only |
| O&M (Operations & Maintenance) | NOT FOUND | Nowhere in codebase |
| SLA (Service Level Agreement) | PARTIAL | "SLA compliance monitoring" in feature list; "SLA Terms" as block name. Not a contract type. |
| Rate Contract | PARTIAL | "Annual Rate Contracts" in industry-advanced.ts category name. Not a contract type. |
| Retainer | FOUND AS PRICING MODEL | In API `CONTRACT_TYPES` and `industry-advanced.ts`. This is a pricing model, not a service nomenclature. |
| Per-Call / On-Demand | NOT FOUND | Nowhere in codebase |
| Warranty Extension | NOT FOUND | Nowhere in codebase |
| Manpower Supply Contract | NOT FOUND | Nowhere in codebase |
| Turnkey | PARTIAL | In `industry-advanced.ts:789` as a common variant for technology. Not a contract type. |
| BOT/BOOT | NOT FOUND | Nowhere in codebase |

**Critical Finding**: The system conflates **3 different concepts** into `contract_type`:
1. **Relationship Perspective** — client/vendor/partner (who you are)
2. **Pricing Model** — fixed_price/time_and_materials/retainer/milestone/subscription (how you charge)
3. **Document Type** — service/partnership/nda/purchase_order/lease/subscription (what legal instrument)

**None of these is the industry nomenclature** (AMC/CMC/PMC/FMC etc.) — which describes the **nature and scope of the maintenance/service commitment**.

### Recommendation

**New table:**

```sql
-- Contract Nomenclature Master (global)
CREATE TABLE m_contract_nomenclature (
    id                  VARCHAR(30) PRIMARY KEY,   -- 'amc','cmc','camc','pmc','bmc','fmc','om','sla','rate_contract','retainer','per_call','warranty_ext','manpower','turnkey','bot_boot'
    short_name          VARCHAR(20) NOT NULL,       -- 'AMC','CMC','PMC', etc.
    full_name           VARCHAR(100) NOT NULL,       -- 'Annual Maintenance Contract'
    description         TEXT,
    scope_includes      JSONB DEFAULT '[]',         -- ['scheduled_visits','labor','parts','consumables']
    scope_excludes      JSONB DEFAULT '[]',         -- ['parts','third_party_damage']
    is_equipment_based  BOOLEAN DEFAULT false,       -- typically requires equipment attachment
    is_entity_based     BOOLEAN DEFAULT false,       -- typically requires entity/property attachment
    is_manpower_based   BOOLEAN DEFAULT false,       -- typically requires staffing
    typical_duration    VARCHAR(20),                 -- '12_months','ongoing','project_based'
    typical_billing     VARCHAR(20),                 -- 'monthly','quarterly','annually','per_visit'
    industries          VARCHAR(50)[],               -- ['healthcare','manufacturing','real_estate']
    icon                VARCHAR(50),
    sort_order          INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed data:**

```sql
INSERT INTO m_contract_nomenclature
(id, short_name, full_name, description, scope_includes, scope_excludes, is_equipment_based, is_entity_based, typical_duration, typical_billing, industries) VALUES
('amc', 'AMC', 'Annual Maintenance Contract',
 'Yearly contract with scheduled preventive visits. Labor included, parts may or may not be included.',
 '["scheduled_visits","labor","diagnostics"]', '["parts_optional"]',
 true, false, '12_months', 'quarterly', '{healthcare,manufacturing,real_estate,technology}'),

('cmc', 'CMC', 'Comprehensive Maintenance Contract',
 'Everything included — labor + parts + consumables. Zero extra cost to buyer.',
 '["scheduled_visits","labor","parts","consumables","breakdown_support"]', '[]',
 true, false, '12_months', 'quarterly', '{healthcare,manufacturing}'),

('camc', 'CAMC', 'Comprehensive Annual Maintenance Contract',
 'Same as CMC but specifically annual. Common in government/PSU procurement.',
 '["scheduled_visits","labor","parts","consumables","breakdown_support"]', '[]',
 true, false, '12_months', 'annually', '{healthcare,manufacturing,government}'),

('pmc', 'PMC', 'Preventive Maintenance Contract',
 'Only scheduled preventive checks. No breakdown coverage.',
 '["scheduled_visits","diagnostics","lubrication","calibration"]', '["breakdown_support","parts"]',
 true, false, '12_months', 'quarterly', '{manufacturing,healthcare,technology}'),

('bmc', 'BMC', 'Breakdown Maintenance Contract',
 'On-call repair only. No scheduled visits. Pay per incident.',
 '["breakdown_support","labor"]', '["scheduled_visits"]',
 true, false, 'ongoing', 'per_visit', '{manufacturing,real_estate}'),

('fmc', 'FMC', 'Facility Management Contract',
 'Holistic facility operations — cleaning + security + maintenance + utilities.',
 '["cleaning","security","maintenance","utilities","landscaping"]', '[]',
 false, true, '12_months', 'monthly', '{real_estate,hospitality,corporate}'),

('om', 'O&M', 'Operations & Maintenance',
 'Full operational responsibility. Common in infrastructure and utilities.',
 '["operations","maintenance","staffing","reporting"]', '[]',
 true, true, '36_months', 'monthly', '{infrastructure,utilities,energy}'),

('sla', 'SLA', 'Service Level Agreement',
 'Performance-bound contract with penalties for non-compliance.',
 '["guaranteed_uptime","response_time","resolution_time","penalties"]', '[]',
 true, false, '12_months', 'monthly', '{technology,telecom,healthcare}'),

('rate_contract', 'Rate Contract', 'Rate Contract',
 'Pre-negotiated rates, pay only for actual usage/quantity consumed.',
 '["pre_negotiated_rates","on_demand"]', '["fixed_commitment"]',
 false, false, '12_months', 'per_usage', '{manufacturing,construction,government}'),

('retainer', 'Retainer', 'Retainer Agreement',
 'Fixed monthly/quarterly fee for guaranteed availability.',
 '["guaranteed_availability","priority_response"]', '[]',
 false, false, '12_months', 'monthly', '{professional,technology,legal}'),

('per_call', 'Per-Call', 'Per-Call / On-Demand Service',
 'No commitment. Pay per service visit. Common for plumbing, electrical.',
 '["on_demand","per_visit_billing"]', '["scheduled_visits","commitment"]',
 false, false, 'ongoing', 'per_visit', '{real_estate,residential,commercial}'),

('warranty_ext', 'Warranty Ext', 'Extended Warranty',
 'Post-OEM-warranty coverage, usually equipment-specific.',
 '["post_warranty_coverage","parts","labor"]', '[]',
 true, false, '12_months', 'annually', '{healthcare,manufacturing,technology}'),

('manpower', 'Manpower', 'Manpower Supply Contract',
 'Staffing/labor supply — guards, housekeeping staff, technicians.',
 '["staff_supply","attendance_tracking","replacement_guarantee"]', '[]',
 false, true, '12_months', 'monthly', '{real_estate,hospitality,manufacturing,corporate}'),

('turnkey', 'Turnkey', 'Turnkey Contract',
 'End-to-end project delivery, then transitions to AMC/O&M.',
 '["design","installation","commissioning","handover"]', '[]',
 true, true, 'project_based', 'milestone', '{construction,infrastructure,technology}'),

('bot_boot', 'BOT/BOOT', 'Build-Operate-Transfer',
 'Long-term operational contracts with eventual asset handover.',
 '["build","operate","maintain","transfer"]', '[]',
 true, true, '60_months', 'monthly', '{infrastructure,utilities,energy}');
```

**Add `nomenclature_id` to contracts table:**
```sql
ALTER TABLE t_contracts
ADD COLUMN nomenclature_id VARCHAR(30) REFERENCES m_contract_nomenclature(id);
```

**UI placement map:**

| Screen | Component | Change |
|--------|-----------|--------|
| Contract Creation Wizard — Step 1 (Path) or new Step 1.5 | `PathSelectionStep.tsx` or new `NomenclatureStep.tsx` | Add nomenclature picker with 15 cards showing AMC/CMC/PMC etc. with icons and descriptions. Group by "Equipment-based" / "Entity-based" / "General". |
| Contract List / Hub | `contracts/hub/index.tsx` | Add nomenclature filter dropdown alongside existing status filter. Show nomenclature badge on each contract card. |
| Dashboard / Ops Cockpit | `ops/cockpit/index.tsx` | Add "Contracts by Type" chart showing AMC: 12, CMC: 3, FMC: 5, etc. |
| Template Selection | `catalog-studio/templates-list.tsx` | Add `nomenclature_id` to template data. Filter templates by nomenclature. When user picks "AMC", only show AMC templates. |
| Contract PDF / Invoice | `contracts/pdf-view/index.tsx` | Show full nomenclature name: "Annual Maintenance Contract" in document header. |
| Contract Detail View | Contract detail page | Show nomenclature badge prominently (e.g., "AMC" chip next to contract name). |

**Smart suggestion logic:**

```
IF equipment blocks attached AND no entity blocks:
  → Suggest: AMC, CMC, PMC, BMC, Warranty Ext
  → Default: AMC

IF entity blocks attached AND no equipment blocks:
  → Suggest: FMC, Manpower, O&M
  → Default: FMC

IF both equipment AND entity blocks:
  → Suggest: O&M, Turnkey, FMC
  → Default: O&M

IF staffing/manpower blocks:
  → Suggest: Manpower, FMC
  → Default: Manpower

IF milestone-based billing:
  → Suggest: Turnkey, SLA

IF per-visit billing:
  → Suggest: Per-Call, BMC, Rate Contract
```

---

## CROSS-CUTTING: How All Three Connect

### The Integrated Flow (What Should Exist)

```
USER JOURNEY: Hospital Admin creating a Biomedical Equipment AMC

Step 1: NOMENCLATURE SELECTION
  └─ User picks "AMC" from nomenclature cards
  └─ System knows: AMC = equipment-based, scheduled visits, typically annual

Step 2: EQUIPMENT vs ENTITY ROUTING
  └─ System asks: "Equipment-based or Entity-based?"
  └─ Since AMC → defaults to "Equipment-based"
  └─ For FMC → defaults to "Entity-based"
  └─ For O&M → asks for both

Step 3: EQUIPMENT ATTACHMENT (for equipment-based)
  └─ User searches/selects from equipment master:
     "MRI Scanner - GE Signa HDxt - SN: GE2024MRI001 - Radiology Dept"
     "MRI Scanner - Siemens Magnetom - SN: SI2023MRI002 - Radiology Dept"
  └─ Or creates equipment group: "All MRI Machines" → attach group

Step 3-ALT: ENTITY ATTACHMENT (for entity-based)
  └─ User searches/selects from entity master:
     "Building A → Floor 3 → Common Area (5,000 sqft)"
     "Building B → All Floors → Restrooms"
  └─ Entity hierarchy tree for selection

Step 4: TEMPLATE AUTO-SUGGESTION
  └─ Based on nomenclature=AMC + industry=Healthcare + equipment_category=MRI
  └─ System suggests: "CT Scan Machine AMC" template (closest match)
  └─ User can pick template or create from scratch

Step 5: SERVICE BLOCKS (pre-filled from template)
  └─ Block 1: "Quarterly Preventive Maintenance" — 4 visits/year
  └─ Block 2: "Parts Coverage" — spare parts included
  └─ Block 3: "Emergency Breakdown Support" — 4-hour response SLA
  └─ Each block auto-linked to selected equipment

Step 6: PRICING (equipment-aware)
  └─ Base rate: ₹1,50,000/equipment/year
  └─ 2 MRI machines × ₹1,50,000 = ₹3,00,000/year
  └─ Parts coverage: included (CMC) or excluded (AMC)

Step 7: EVENT GENERATION (per-equipment)
  └─ MRI #1: Q1 PM Visit → Jan 15, Q2 PM Visit → Apr 15, ...
  └─ MRI #2: Q1 PM Visit → Jan 20, Q2 PM Visit → Apr 20, ...
  └─ Each event tagged with specific equipment_id

Step 8: SERVICE EXECUTION (per-equipment)
  └─ Technician gets ticket: "PM Visit — MRI Scanner GE Signa HDxt — SN: GE2024MRI001"
  └─ Uploads evidence per equipment: before/after photos, calibration certificate
  └─ Equipment-level completion tracking

Step 9: DOCUMENT GENERATION
  └─ Contract PDF header: "Annual Maintenance Contract (AMC)"
  └─ Equipment schedule annexed to contract
  └─ Invoice label: "AMC — Quarterly Payment — Q2 2026"
```

### Why This Matters

Today, a hospital admin opening ContractNest would:
1. See "Service Contract" — not "AMC" ❌
2. Have no way to attach specific MRI machines ❌
3. Have no way to specify per-equipment service schedules ❌
4. Get generic service events, not per-machine PM schedules ❌
5. See invoices labeled "INV-10001", not "AMC Invoice — Q2" ❌

A facility manager looking for "FMC" would:
1. Not find "Facility Management Contract" as a type ❌
2. Have no way to define "50,000 sqft office, 3 floors" ❌
3. Have no per-sqft pricing capability ❌
4. Have no entity hierarchy for their campus ❌

---

## IMPLEMENTATION PRIORITY

### P0 — Build This Week (Foundation)

1. **`m_contract_nomenclature` table** — Create and seed with 15 contract types. Add `nomenclature_id` column to `t_contracts`. This is the cheapest, highest-impact change.

2. **Nomenclature selection in wizard** — Add a nomenclature picker step (card grid with AMC/CMC/FMC etc.) as Step 1.5 in the contract wizard. Immediate user recognition improvement.

3. **Nomenclature display** — Show nomenclature badge on contract cards in list view, detail page, and dashboard. Group dashboard stats by nomenclature.

### P1 — Build This Sprint (Core Flow)

4. **`t_equipment` master table** — Create with make, model, serial_number, asset_tag, purchase_date, warranty_expiry, condition, criticality. Essential for AMC/CMC/PMC contracts.

5. **`t_contract_equipment` junction table** — Many-to-many link between contracts and equipment. Allow same equipment under multiple contracts (e.g., AMC + insurance).

6. **Equipment step in wizard** — New wizard step for equipment selection/registration when nomenclature is equipment-based (AMC, CMC, PMC, BMC, Warranty Ext).

7. **Equipment CRUD API** — Endpoints for equipment registration, listing, updating, and archiving.

8. **`equipment_id` on service tickets** — Add column to `t_service_tickets` and `t_service_evidence` for per-equipment tracking.

### P2 — Next Sprint (Enhancement)

9. **`m_entity_types` + `t_entities` tables** — Physical space modeling with hierarchy. Essential for FMC, Housekeeping, and Pest Control contracts.

10. **`t_contract_entities` junction table** — Link contracts to entities with area-based pricing (₹/sqft).

11. **Entity step in wizard** — New wizard step for entity/property selection when nomenclature is entity-based (FMC, Manpower, O&M).

12. **Equipment groups** — `t_equipment_groups` + `t_equipment_group_items` for grouping equipment (e.g., "All ACs in Building A").

13. **Nomenclature-aware template filtering** — When user picks "AMC", filter template library to show only AMC templates. Add `nomenclature_id` to template data model.

14. **Smart suggestions** — When equipment is attached → suggest AMC/CMC. When entity is attached → suggest FMC/O&M. When both → suggest O&M/Turnkey.

### P3 — Backlog (Delight)

15. **Per-equipment event generation** — Service events generated per-equipment with separate schedules (AC Unit #7: every 90 days, AC Unit #8: every 90 days offset by 1 week).

16. **Equipment lifecycle management** — Status tracking, warranty expiry notifications, transfer between contracts on renewal.

17. **Entity condition tracking** — Inspection logs, condition scores, before/after evidence per entity.

18. **Buyer-side equipment/entity registration** — During contract acceptance (CNAK flow), buyer can add/confirm their equipment and entities.

19. **Nomenclature-aware document generation** — PDF header shows "Annual Maintenance Contract (AMC)" not "Service Contract". Invoice says "AMC Invoice — Q2 2026".

20. **Industry → nomenclature mapping** — Healthcare → AMC/CMC, Real Estate → FMC/Housekeeping, Manufacturing → PMC/BMC. Pre-filter nomenclature options by industry.

21. **Equipment/entity evidence** — Evidence upload linked to specific equipment_id or entity_id, not just ticket/block.

22. **Nomenclature search & filter** — Filter contract list by "Show me all AMCs". Full-text search includes nomenclature terms.

---

*End of Business Domain Audit*

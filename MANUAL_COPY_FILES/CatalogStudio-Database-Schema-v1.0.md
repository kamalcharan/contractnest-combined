# Catalog Studio - Database Schema Document v1.0

**Document Version:** 1.0
**Created:** January 2026
**Table Prefix:** `cat_`
**Database:** PostgreSQL (Supabase)

---

## 1. TABLE OVERVIEW

### Existing Tables (REUSE)

| Table | Purpose | Action |
|-------|---------|--------|
| `m_catalog_resource_types` | Resource type master (team_staff, equipment, etc.) | **REUSE AS-IS** |
| `t_category_resources_master` | Actual resources (doctors, technicians, etc.) | **REUSE AS-IS** |
| `buyers` / `t_contacts` | Customer/buyer records | **CHECK IF EXISTS** |

### New Tables (CREATE with `cat_` prefix)

| Table | Purpose | Sprint |
|-------|---------|--------|
| `cat_blocks` | Block definitions (service, spare, billing, etc.) | Sprint 1 |
| `cat_asset_types` | Property/appliance variants (1BHK, 2BHK, Split AC) | Sprint 1 |
| `cat_templates` | Reusable block assemblies | Sprint 2 |
| `cat_contracts` | Buyer-specific contract instances | Sprint 2 |
| `cat_contract_items` | Line items in contracts (optional - could be JSONB) | Sprint 2 |
| `cat_tasks` | Executable service units from contracts | Sprint 3 |
| `cat_evidence` | Proof of task completion | Sprint 3 |

---

## 2. ENTITY RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CATALOG STUDIO ERD                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXISTING (Reuse)                    NEW (Create)                           │
│  ─────────────────                   ───────────────                        │
│                                                                             │
│  ┌──────────────────────┐           ┌──────────────────────┐               │
│  │ m_catalog_resource_  │           │     cat_blocks       │               │
│  │      types           │           │ ─────────────────    │               │
│  │ ───────────────────  │           │ id                   │               │
│  │ • team_staff         │           │ seller_id            │               │
│  │ • equipment          │◄─────────►│ type (service/spare) │               │
│  │ • consumable         │  linked   │ pricing_mode         │               │
│  │ • asset              │  via      │ resource_pricing     │◄──────┐      │
│  │ • partner            │  config   │ config (JSONB)       │       │      │
│  └──────────────────────┘           └──────────┬───────────┘       │      │
│           │                                     │                   │      │
│           │                                     │ used in           │      │
│           ▼                                     ▼                   │      │
│  ┌──────────────────────┐           ┌──────────────────────┐       │      │
│  │ t_category_resources │           │    cat_templates     │       │      │
│  │      _master         │           │ ─────────────────    │       │      │
│  │ ───────────────────  │           │ id                   │       │      │
│  │ Dr. Bhavana (staff)  │◄─────────►│ seller_id            │       │      │
│  │ Premium Kit (equip)  │  assigned │ blocks (JSONB[])     │       │      │
│  │ Organic Oil (consum) │  to tasks │ settings             │       │      │
│  └──────────────────────┘           └──────────┬───────────┘       │      │
│                                                 │                   │      │
│                                                 │ creates           │      │
│                                                 ▼                   │      │
│  ┌──────────────────────┐           ┌──────────────────────┐       │      │
│  │     cat_buyers       │──────────►│    cat_contracts     │       │      │
│  │ ─────────────────    │  buyer_id │ ─────────────────    │       │      │
│  │ id                   │           │ id                   │       │      │
│  │ seller_id            │           │ seller_id            │       │      │
│  │ name, phone, email   │           │ buyer_id             │       │      │
│  │ address              │           │ template_id          │       │      │
│  └──────────────────────┘           │ items (JSONB[])      │───────┘      │
│                                     │ status               │               │
│           ┌──────────────────────┐  └──────────┬───────────┘               │
│           │   cat_asset_types    │             │                           │
│           │ ─────────────────    │             │ spawns                    │
│           │ 1BHK Flat            │             ▼                           │
│           │ 2BHK Flat            │  ┌──────────────────────┐               │
│           │ Villa                │  │     cat_tasks        │               │
│           │ Split AC 1.5T        │  │ ─────────────────    │               │
│           │ Window AC            │  │ id                   │               │
│           └──────────┬───────────┘  │ contract_id          │               │
│                      │              │ block_id             │               │
│                      │ variant      │ resource_id ─────────┼──► Resources  │
│                      │ pricing      │ asset_type_id ───────┼──► Asset Type │
│                      └─────────────►│ status               │               │
│                                     │ evidence[]           │               │
│                                     └──────────┬───────────┘               │
│                                                │                           │
│                                                │ captures                  │
│                                                ▼                           │
│                                     ┌──────────────────────┐               │
│                                     │    cat_evidence      │               │
│                                     │ ─────────────────    │               │
│                                     │ photo, gps, sign     │               │
│                                     └──────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. TABLE DEFINITIONS

### 3.1 `cat_blocks` - Block Definitions

**Purpose:** Atomic units of service (service, spare, billing, text, media, checklist, document)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `tenant_id` | UUID | NO | - | Tenant/Seller ID (FK to tenants) |
| `is_live` | BOOLEAN | NO | `false` | Environment flag (test/production) |
| `type` | TEXT | NO | - | Block type (see enum below) |
| `category` | TEXT | YES | - | Custom grouping/folder |
| `name` | VARCHAR(255) | NO | - | Block name |
| `display_name` | VARCHAR(255) | YES | - | UI display name |
| `icon` | VARCHAR(50) | YES | `'📦'` | Emoji or icon name |
| `description` | TEXT | YES | - | Block description |
| `tags` | TEXT[] | YES | `'{}'` | Searchable tags |
| `config` | JSONB | NO | `'{}'` | Type-specific configuration |
| `pricing_mode` | TEXT | YES | `'independent'` | Pricing mode (see enum) |
| `base_price` | DECIMAL(12,2) | YES | - | Base price (independent mode) |
| `currency` | VARCHAR(3) | YES | `'INR'` | Currency code |
| `price_type` | TEXT | YES | - | Price unit type |
| `tax_rate` | DECIMAL(5,2) | YES | `18.00` | GST/Tax percentage |
| `hsn_sac_code` | VARCHAR(20) | YES | - | HSN/SAC code for invoicing |
| `resource_pricing` | JSONB | YES | - | Resource-based pricing config |
| `variant_pricing` | JSONB | YES | - | Variant-based pricing config |
| `status` | TEXT | NO | `'active'` | Block status |
| `version` | INTEGER | NO | `1` | Version number |
| `sequence_no` | INTEGER | YES | - | Display order |
| `is_deletable` | BOOLEAN | NO | `true` | Can be deleted |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Updated timestamp |
| `created_by` | UUID | YES | - | Created by user |
| `updated_by` | UUID | YES | - | Updated by user |

**Enums:**

```sql
-- Block Types
type IN ('service', 'spare', 'billing', 'text', 'video', 'image', 'checklist', 'document')

-- Pricing Modes
pricing_mode IN ('independent', 'resource_based', 'variant_based', 'multi_resource')

-- Price Types
price_type IN ('per_session', 'per_hour', 'per_day', 'per_unit', 'fixed')

-- Status
status IN ('active', 'draft', 'archived')
```

**Indexes:**
```sql
CREATE INDEX idx_cat_blocks_tenant ON cat_blocks(tenant_id);
CREATE INDEX idx_cat_blocks_type ON cat_blocks(tenant_id, type);
CREATE INDEX idx_cat_blocks_status ON cat_blocks(tenant_id, status);
CREATE INDEX idx_cat_blocks_is_live ON cat_blocks(tenant_id, is_live);
CREATE INDEX idx_cat_blocks_tags ON cat_blocks USING GIN(tags);
CREATE INDEX idx_cat_blocks_config ON cat_blocks USING GIN(config);
```

---

### 3.2 `cat_asset_types` - Property/Appliance Variants

**Purpose:** Define variants that affect service pricing (1BHK, 2BHK, Split AC, etc.)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `tenant_id` | UUID | NO | - | Tenant/Seller ID |
| `is_live` | BOOLEAN | NO | `false` | Environment flag |
| `category` | VARCHAR(50) | NO | - | Category (residential, commercial, appliance) |
| `subcategory` | VARCHAR(50) | YES | - | Subcategory (air_conditioner, washing_machine) |
| `name` | VARCHAR(255) | NO | - | Display name (1BHK Flat, Split AC 1.5T) |
| `code` | VARCHAR(50) | YES | - | Short code |
| `icon` | VARCHAR(50) | YES | `'🏠'` | Emoji or icon |
| `description` | TEXT | YES | - | Description |
| `attributes` | JSONB | YES | `'{}'` | Custom attributes (sqft, rooms, capacity) |
| `sequence_no` | INTEGER | YES | `0` | Display order |
| `is_active` | BOOLEAN | NO | `true` | Active status |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Updated timestamp |

**Indexes:**
```sql
CREATE INDEX idx_cat_asset_types_tenant ON cat_asset_types(tenant_id);
CREATE INDEX idx_cat_asset_types_category ON cat_asset_types(tenant_id, category);
CREATE INDEX idx_cat_asset_types_active ON cat_asset_types(tenant_id, is_active);
```

---

### 3.3 `cat_buyers` - Customer Records

**Purpose:** Store buyer/customer information for contracts

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `tenant_id` | UUID | NO | - | Tenant/Seller ID |
| `is_live` | BOOLEAN | NO | `false` | Environment flag |
| `name` | VARCHAR(255) | NO | - | Buyer name |
| `phone` | VARCHAR(20) | NO | - | Primary phone (WhatsApp) |
| `email` | VARCHAR(255) | YES | - | Email address |
| `address` | TEXT | YES | - | Street address |
| `city` | VARCHAR(100) | YES | - | City |
| `state` | VARCHAR(100) | YES | - | State |
| `pincode` | VARCHAR(10) | YES | - | PIN/ZIP code |
| `company` | VARCHAR(255) | YES | - | Company name |
| `gst_number` | VARCHAR(20) | YES | - | GST number |
| `tags` | TEXT[] | YES | `'{}'` | Custom tags |
| `notes` | TEXT | YES | - | Internal notes |
| `metadata` | JSONB | YES | `'{}'` | Additional data |
| `source` | VARCHAR(50) | YES | - | Lead source |
| `is_active` | BOOLEAN | NO | `true` | Active status |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Updated timestamp |
| `created_by` | UUID | YES | - | Created by user |

**Constraints:**
```sql
UNIQUE(tenant_id, phone, is_live)  -- No duplicate phone per tenant per environment
```

**Indexes:**
```sql
CREATE INDEX idx_cat_buyers_tenant ON cat_buyers(tenant_id);
CREATE INDEX idx_cat_buyers_phone ON cat_buyers(tenant_id, phone);
CREATE INDEX idx_cat_buyers_email ON cat_buyers(tenant_id, email);
CREATE INDEX idx_cat_buyers_tags ON cat_buyers USING GIN(tags);
```

---

## 4. JSONB STRUCTURE DEFINITIONS

### 4.1 Block `config` by Type

#### SERVICE Block Config
```json
{
  "duration": {
    "value": 60,
    "unit": "minutes"
  },
  "buffer": 15,
  "location": {
    "type": "onsite",
    "onsite_config": {
      "default": "client",
      "require_gps": true,
      "radius_meters": 100
    },
    "virtual_config": {
      "platform": "zoom",
      "auto_invite": true
    }
  },
  "assignment": {
    "type": "manual",
    "resource_type_id": "team_staff",
    "skills": ["gynecology", "pcod"]
  },
  "evidence": [
    {
      "type": "photo",
      "config": { "min": 2, "required": true, "labels": ["before", "after"] }
    },
    {
      "type": "signature",
      "config": { "required": true }
    },
    {
      "type": "gps",
      "config": { "checkin": true, "checkout": true }
    }
  ],
  "sla": {
    "completion_hours": 48,
    "reschedule_hours": 24
  },
  "automation": [
    {
      "trigger": "not_started",
      "before_hours": 24,
      "action": "whatsapp_vendor"
    }
  ]
}
```

#### SPARE Block Config
```json
{
  "sku": "ACF-150",
  "hsn": "84159000",
  "brand": "Voltas",
  "uom": "each",
  "inventory": {
    "track": true,
    "current": 24,
    "reorder_level": 5,
    "alert_on_low": true
  },
  "fulfillment": {
    "include_in_service": true,
    "pickup": false,
    "ship": false
  },
  "warranty": {
    "months": 6,
    "type": "manufacturing_defect"
  }
}
```

#### BILLING Block Config
```json
{
  "payment_type": "emi",
  "installments": 3,
  "frequency": "monthly",
  "schedule": [
    { "sequence": 1, "percent": 33.33, "trigger": "on_signing" },
    { "sequence": 2, "percent": 33.33, "trigger": "after_days", "days": 30 },
    { "sequence": 3, "percent": 33.34, "trigger": "after_days", "days": 60 }
  ],
  "auto_invoice": true,
  "late_fee": {
    "grace_days": 7,
    "percent": 2
  },
  "payment_methods": ["upi", "card", "bank_transfer"]
}
```

#### TEXT Block Config
```json
{
  "content": "Terms and conditions text here...",
  "content_type": "markdown",
  "require_acceptance": true,
  "acceptance_label": "I agree to the terms and conditions"
}
```

#### CHECKLIST Block Config
```json
{
  "items": [
    { "id": "1", "text": "Check refrigerant level", "photo_required": true },
    { "id": "2", "text": "Clean filters", "photo_required": true },
    { "id": "3", "text": "Test cooling", "photo_required": false }
  ],
  "require_all": true,
  "allow_notes": true
}
```

---

### 4.2 Resource Pricing Config (`resource_pricing`)

```json
{
  "resource_type_id": "team_staff",
  "label": "Select Doctor",
  "required": true,
  "allow_any": true,
  "any_label": "Any Available Doctor",
  "any_price": 500,
  "filter_by_skills": ["gynecology"],
  "selection_time": "contract",
  "options": [
    {
      "resource_id": "uuid-dr-bhavana",
      "name": "Dr. Bhavana",
      "category": "Senior Gynecologist",
      "price": 800
    },
    {
      "resource_id": "uuid-dr-hema",
      "name": "Dr. Hema",
      "category": "Gynecologist",
      "price": 600
    }
  ]
}
```

---

### 4.3 Variant Pricing Config (`variant_pricing`)

```json
{
  "asset_category": "residential",
  "label": "Select Property Type",
  "required": true,
  "options": [
    {
      "asset_type_id": "uuid-1bhk",
      "name": "1BHK Flat",
      "icon": "🏠",
      "price": 2000
    },
    {
      "asset_type_id": "uuid-2bhk",
      "name": "2BHK Flat",
      "icon": "🏠",
      "price": 3000
    },
    {
      "asset_type_id": "uuid-villa",
      "name": "Villa",
      "icon": "🏡",
      "price": 6000
    }
  ]
}
```

---

## 5. SAMPLE DATA

### 5.1 Sample Blocks

```sql
-- Service Block: Gynec Consultation (Resource-based pricing)
INSERT INTO cat_blocks (
  tenant_id, is_live, type, name, icon, description,
  pricing_mode, currency, tax_rate,
  config, resource_pricing, status
) VALUES (
  'tenant-uuid', true, 'service', 'Gynec Consultation', '🩺',
  '30-min specialist consultation with evidence capture',
  'resource_based', 'INR', 18.00,
  '{
    "duration": {"value": 30, "unit": "minutes"},
    "buffer": 10,
    "location": {"type": "hybrid"},
    "evidence": [
      {"type": "signature", "config": {"required": true}}
    ]
  }',
  '{
    "resource_type_id": "team_staff",
    "label": "Select Doctor",
    "allow_any": true,
    "any_price": 500,
    "options": [
      {"resource_id": "uuid-dr-bhavana", "name": "Dr. Bhavana", "price": 800},
      {"resource_id": "uuid-dr-hema", "name": "Dr. Hema", "price": 600}
    ]
  }',
  'active'
);

-- Service Block: Deep Cleaning (Variant-based pricing)
INSERT INTO cat_blocks (
  tenant_id, is_live, type, name, icon, description,
  pricing_mode, currency, tax_rate,
  config, variant_pricing, status
) VALUES (
  'tenant-uuid', true, 'service', 'Deep Cleaning Service', '🧹',
  'Complete deep cleaning with before/after photos',
  'variant_based', 'INR', 18.00,
  '{
    "duration": {"value": 180, "unit": "minutes"},
    "location": {"type": "onsite", "onsite_config": {"require_gps": true}},
    "evidence": [
      {"type": "photo", "config": {"min": 4, "labels": ["before", "during", "after"]}}
    ]
  }',
  '{
    "asset_category": "residential",
    "label": "Select Property Type",
    "options": [
      {"asset_type_id": "uuid-1bhk", "name": "1BHK Flat", "price": 2000},
      {"asset_type_id": "uuid-2bhk", "name": "2BHK Flat", "price": 3000},
      {"asset_type_id": "uuid-3bhk", "name": "3BHK Flat", "price": 4500},
      {"asset_type_id": "uuid-villa", "name": "Villa", "price": 6000}
    ]
  }',
  'active'
);

-- Service Block: Yoga Session (Independent pricing)
INSERT INTO cat_blocks (
  tenant_id, is_live, type, name, icon, description,
  pricing_mode, base_price, currency, tax_rate, price_type,
  config, status
) VALUES (
  'tenant-uuid', true, 'service', 'Yoga Session', '🧘',
  '60-min yoga with PCOD-specific asanas',
  'independent', 2000.00, 'INR', 18.00, 'per_session',
  '{
    "duration": {"value": 60, "unit": "minutes"},
    "buffer": 15,
    "location": {"type": "onsite"},
    "evidence": [
      {"type": "photo", "config": {"min": 1}},
      {"type": "signature", "config": {"required": true}}
    ]
  }',
  'active'
);

-- Spare Part Block
INSERT INTO cat_blocks (
  tenant_id, is_live, type, name, icon, description,
  pricing_mode, base_price, currency, tax_rate,
  config, status
) VALUES (
  'tenant-uuid', true, 'spare', 'AC Filter 1.5T', '🌀',
  'Replacement filter for 1.5 ton AC units',
  'independent', 450.00, 'INR', 18.00,
  '{
    "sku": "ACF-150",
    "hsn": "84159000",
    "brand": "Voltas",
    "uom": "each",
    "inventory": {"track": true, "reorder_level": 5}
  }',
  'active'
);

-- Billing Block
INSERT INTO cat_blocks (
  tenant_id, is_live, type, name, icon, description,
  config, status
) VALUES (
  'tenant-uuid', true, 'billing', '3-Month EMI', '💳',
  'Split payment into 3 monthly installments',
  '{
    "payment_type": "emi",
    "installments": 3,
    "frequency": "monthly",
    "schedule": [
      {"sequence": 1, "percent": 33.33, "trigger": "on_signing"},
      {"sequence": 2, "percent": 33.33, "trigger": "after_days", "days": 30},
      {"sequence": 3, "percent": 33.34, "trigger": "after_days", "days": 60}
    ],
    "auto_invoice": true
  }',
  'active'
);

-- Text Block
INSERT INTO cat_blocks (
  tenant_id, is_live, type, name, icon, description,
  config, status
) VALUES (
  'tenant-uuid', true, 'text', 'Standard Terms & Conditions', '📜',
  'General terms and conditions for all contracts',
  '{
    "content": "## Terms and Conditions\n\n1. Payment terms...\n2. Cancellation policy...",
    "content_type": "markdown",
    "require_acceptance": true,
    "acceptance_label": "I agree to the terms and conditions"
  }',
  'active'
);
```

---

### 5.2 Sample Asset Types

```sql
-- Residential Property Types
INSERT INTO cat_asset_types (tenant_id, is_live, category, name, icon, sequence_no, attributes) VALUES
('tenant-uuid', true, 'residential', '1BHK Flat', '🏠', 1, '{"sqft_range": "400-600", "rooms": 1}'),
('tenant-uuid', true, 'residential', '2BHK Flat', '🏠', 2, '{"sqft_range": "600-900", "rooms": 2}'),
('tenant-uuid', true, 'residential', '3BHK Flat', '🏠', 3, '{"sqft_range": "900-1400", "rooms": 3}'),
('tenant-uuid', true, 'residential', '4BHK+ Flat', '🏠', 4, '{"sqft_range": "1400+", "rooms": 4}'),
('tenant-uuid', true, 'residential', 'Independent House / Villa', '🏡', 5, '{"type": "independent"}'),
('tenant-uuid', true, 'residential', 'Penthouse', '🏢', 6, '{"type": "penthouse"}');

-- Commercial Property Types
INSERT INTO cat_asset_types (tenant_id, is_live, category, name, icon, sequence_no) VALUES
('tenant-uuid', true, 'commercial', 'Small Office (< 1000 sqft)', '🏢', 1),
('tenant-uuid', true, 'commercial', 'Large Office (1000+ sqft)', '🏢', 2),
('tenant-uuid', true, 'commercial', 'Showroom', '🏪', 3),
('tenant-uuid', true, 'commercial', 'Warehouse', '🏭', 4);

-- Appliance Types - Air Conditioner
INSERT INTO cat_asset_types (tenant_id, is_live, category, subcategory, name, icon, sequence_no, attributes) VALUES
('tenant-uuid', true, 'appliance', 'air_conditioner', 'Split AC 1 Ton', '❄️', 1, '{"capacity": "1T", "type": "split"}'),
('tenant-uuid', true, 'appliance', 'air_conditioner', 'Split AC 1.5 Ton', '❄️', 2, '{"capacity": "1.5T", "type": "split"}'),
('tenant-uuid', true, 'appliance', 'air_conditioner', 'Split AC 2 Ton', '❄️', 3, '{"capacity": "2T", "type": "split"}'),
('tenant-uuid', true, 'appliance', 'air_conditioner', 'Window AC', '❄️', 4, '{"type": "window"}'),
('tenant-uuid', true, 'appliance', 'air_conditioner', 'Cassette AC', '❄️', 5, '{"type": "cassette"}');

-- Appliance Types - Washing Machine
INSERT INTO cat_asset_types (tenant_id, is_live, category, subcategory, name, icon, sequence_no) VALUES
('tenant-uuid', true, 'appliance', 'washing_machine', 'Top Load', '🧺', 1),
('tenant-uuid', true, 'appliance', 'washing_machine', 'Front Load', '🧺', 2),
('tenant-uuid', true, 'appliance', 'washing_machine', 'Semi-Automatic', '🧺', 3);
```

---

### 5.3 Sample Buyers

```sql
INSERT INTO cat_buyers (tenant_id, is_live, name, phone, email, city, state, pincode, tags) VALUES
('tenant-uuid', true, 'Priya Sharma', '+919876543210', 'priya@email.com', 'Hyderabad', 'Telangana', '500032', ARRAY['premium', 'repeat']),
('tenant-uuid', true, 'Rahul Verma', '+919876543211', 'rahul@company.com', 'Bangalore', 'Karnataka', '560001', ARRAY['corporate']),
('tenant-uuid', true, 'Anitha Reddy', '+919876543212', NULL, 'Hyderabad', 'Telangana', '500081', ARRAY['referral']);
```

---

## 6. RELATIONSHIP TO EXISTING TABLES

### 6.1 Resources Integration

**Existing Tables (DO NOT MODIFY):**
- `m_catalog_resource_types` - Master resource types
- `t_category_resources_master` - Actual resources

**How Catalog Studio Uses Resources:**

```
cat_blocks.resource_pricing.options[].resource_id  ──► t_category_resources_master.id
cat_blocks.resource_pricing.resource_type_id       ──► m_catalog_resource_types.id
cat_tasks.resource_id                              ──► t_category_resources_master.id
```

**Example Query - Get Resources for Block:**
```sql
SELECT r.id, r.name, r.display_name, r.hexcolor
FROM t_category_resources_master r
WHERE r.tenant_id = :tenant_id
  AND r.is_live = :is_live
  AND r.resource_type_id = :resource_type_id
  AND r.status = 'active'
ORDER BY r.sequence_no;
```

---

### 6.2 Tenant Integration

All `cat_*` tables include:
- `tenant_id` - References your tenant/seller table
- `is_live` - Matches existing test/production environment pattern

---

## 7. RLS POLICIES

```sql
-- Enable RLS on all tables
ALTER TABLE cat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_buyers ENABLE ROW LEVEL SECURITY;

-- Tenant isolation for cat_blocks
CREATE POLICY tenant_isolation_cat_blocks ON cat_blocks
  FOR ALL
  USING (tenant_id = auth.uid() OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tenant isolation for cat_asset_types
CREATE POLICY tenant_isolation_cat_asset_types ON cat_asset_types
  FOR ALL
  USING (tenant_id = auth.uid() OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tenant isolation for cat_buyers
CREATE POLICY tenant_isolation_cat_buyers ON cat_buyers
  FOR ALL
  USING (tenant_id = auth.uid() OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## 8. SPRINT 1 DATABASE SUMMARY

| Table | Rows (Initial) | Purpose |
|-------|----------------|---------|
| `cat_blocks` | 0 | Seller creates blocks |
| `cat_asset_types` | ~20 (seeded) | System + seller variants |
| `cat_buyers` | 0 | Seller adds buyers |
| **Existing** `m_catalog_resource_types` | 5 | Reuse as-is |
| **Existing** `t_category_resources_master` | varies | Reuse as-is |

---

## 9. NEXT STEPS

After your review and approval:

1. **Create Migration Files** in `contractnest-edge/supabase/migrations/catalog-studio/`
2. **Create Edge Functions** for CRUD operations
3. **Update API routes** in `contractnest-api`
4. **Connect UI** to real APIs

---

*End of Database Schema Document*

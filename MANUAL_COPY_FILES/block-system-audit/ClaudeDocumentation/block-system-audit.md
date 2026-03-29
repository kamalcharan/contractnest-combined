# ContractNest Block System — Complete Audit

> **Source**: Live database query on Supabase project `BaseProduct` (`uwyqhzotluikawcboldr`)
> **Table**: `public.m_cat_blocks` (renamed from `cat_blocks`)
> **Date**: 2026-03-29
> **Total Rows**: 43

---

## 1. Complete Schema — `m_cat_blocks`

| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | **Primary Key** |
| 2 | `block_type_id` | `uuid` | NOT NULL | — | Logical FK → `m_category_details.id` (no DB constraint) |
| 3 | `name` | `varchar(255)` | NOT NULL | — | Block display name |
| 4 | `display_name` | `varchar(255)` | YES | — | Optional alternate display name |
| 5 | `icon` | `varchar(50)` | YES | `'📦'` | Emoji or icon identifier |
| 6 | `description` | `text` | YES | — | Free-text description |
| 7 | `tags` | `jsonb` | YES | `'[]'` | Array of tag strings |
| 8 | `category` | `varchar(100)` | YES | — | Grouping category |
| 9 | `config` | `jsonb` | NOT NULL | `'{}'` | **Block-type-specific configuration** (see Section 3) |
| 10 | `pricing_mode_id` | `uuid` | YES | — | Logical FK → `m_category_details.id` |
| 11 | `base_price` | `numeric(12,2)` | YES | — | Default price |
| 12 | `currency` | `varchar(3)` | YES | `'INR'` | ISO currency code |
| 13 | `price_type_id` | `uuid` | YES | — | Logical FK → `m_category_details.id` |
| 14 | `tax_rate` | `numeric(5,2)` | YES | `18.00` | Default GST rate |
| 15 | `hsn_sac_code` | `varchar(20)` | YES | — | Indian tax classification code |
| 16 | `resource_pricing` | `jsonb` | YES | — | **Equipment/resource link + pricing** (see Section 4) |
| 17 | `variant_pricing` | `jsonb` | YES | — | **Variant options + pricing** (see Section 4) |
| 18 | `is_admin` | `boolean` | NOT NULL | `false` | Admin-only block |
| 19 | `visible` | `boolean` | NOT NULL | `true` | Visibility flag |
| 20 | `status_id` | `uuid` | YES | — | Status reference |
| 21 | `is_active` | `boolean` | NOT NULL | `true` | Soft-delete flag |
| 22 | `version` | `integer` | NOT NULL | `1` | Optimistic concurrency control |
| 23 | `sequence_no` | `integer` | YES | `0` | Display ordering |
| 24 | `is_deletable` | `boolean` | NOT NULL | `true` | Whether block can be deleted |
| 25 | `created_at` | `timestamptz` | NOT NULL | `now()` | |
| 26 | `updated_at` | `timestamptz` | NOT NULL | `now()` | |
| 27 | `created_by` | `uuid` | YES | — | User who created |
| 28 | `updated_by` | `uuid` | YES | — | User who last updated |
| 29 | `tenant_id` | `uuid` | YES | — | **FK → `t_tenants(id)` ON DELETE CASCADE** |
| 30 | `is_seed` | `boolean` | NOT NULL | `false` | Global template flag |
| 31 | `is_live` | `boolean` | NOT NULL | `true` | Live/draft flag |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| `cat_blocks_pkey` | PRIMARY KEY | `(id)` |
| `cat_blocks_tenant_id_fkey` | FOREIGN KEY | `(tenant_id) → t_tenants(id) ON DELETE CASCADE` |

> **Note**: `block_type_id`, `pricing_mode_id`, `price_type_id`, and `status_id` are **logical FKs** to `m_category_details` — no database-level constraint exists.

### Indexes (15 total)

| Index | Definition |
|-------|------------|
| `cat_blocks_pkey` | UNIQUE btree (`id`) |
| `idx_cat_blocks_block_type` | btree (`block_type_id`) |
| `idx_cat_blocks_tenant_id` | btree (`tenant_id`) |
| `idx_cat_blocks_is_seed` | btree (`is_seed`) |
| `idx_cat_blocks_tenant_active` | btree (`tenant_id`, `is_active`) WHERE `is_active = true` |
| `idx_cat_blocks_status` | btree (`status_id`) |
| `idx_cat_blocks_is_active` | btree (`is_active`) |
| `idx_cat_blocks_is_admin` | btree (`is_admin`) |
| `idx_cat_blocks_visible` | btree (`visible`) |
| `idx_cat_blocks_pricing_mode` | btree (`pricing_mode_id`) |
| `idx_cat_blocks_tags` | GIN (`tags`) |
| `idx_cat_blocks_config` | GIN (`config`) |
| `idx_cat_blocks_category` | btree (`category`) |
| `idx_cat_blocks_sequence` | btree (`sequence_no`) |
| `idx_cat_blocks_is_live` | btree (`is_live`) |

### Row-Level Security (RLS enabled)

**`read_cat_blocks`** (SELECT):
```sql
(tenant_id IS NULL AND is_active = true AND visible = true)       -- global blocks
OR (is_seed = true AND is_active = true)                          -- seed blocks
OR (tenant_id = request.headers->>'x-tenant-id')                  -- own tenant
OR (auth.jwt()->>'is_admin')::boolean = true                      -- admin override
```

**`write_cat_blocks`** (ALL — insert/update/delete):
```sql
(tenant_id = request.headers->>'x-tenant-id')                     -- own tenant
OR ((auth.jwt()->>'is_admin')::boolean = true
    AND (tenant_id IS NULL OR is_seed = true))                    -- admin for global/seed
```

---

## 2. Block Types — All Values in Use

The seed migration (`005_seed_block_types.sql`) defines **8 types** in `m_category_details`. Only **4 are in use** currently:

### Active (have rows in m_cat_blocks)

| UUID | `sub_cat_name` | Rows | Description |
|------|---------------|------|-------------|
| `ae7050b4-3cca-4ed9-aa02-4a1f697b75cc` | **service** | 28 | Deliverable work items with SLA, duration, and evidence requirements |
| `1221e2dd-a603-47fb-9063-c393193514b7` | **spare** | 9 | Physical products with SKU, inventory tracking, and warranty |
| `db4bf715-dc1a-46f6-94a9-e64429137d3f` | **text** | 5 | Terms, conditions, policies, and formatted text content |
| `c30b81ef-d5ce-4768-8b3c-c2a49f05d55d` | **billing** | 1 | Payment structures — EMI, milestone, advance, postpaid, subscription |

### Defined but unused (0 rows)

| `sub_cat_name` | Icon | Description |
|---------------|------|-------------|
| **video** | Video | Embedded video content (YouTube, Vimeo, direct upload) |
| **image** | Image | Photos, diagrams, galleries, visual content |
| **checklist** | CheckSquare | Task verification lists with optional photo evidence |
| **document** | Paperclip | File attachments, uploads, downloadable documents |

---

## 3. Config JSONB Structure — Actual Examples

### 3a. Service Block — "Integrated Facility Management"

```json
{
  "status": "active",
  "priceType": "fixed",
  "pricingTiers": [],
  "pricingRecords": [
    {
      "id": "1",
      "taxes": [],
      "amount": 20000,
      "currency": "INR",
      "is_active": true,
      "price_type": "fixed",
      "tax_inclusion": "exclusive"
    }
  ]
}
```

**Key fields**: `status`, `priceType`, `pricingRecords[]` (multi-record pricing with tax control).

### 3b. Spare Block — "FilterSpare"

```json
{
  "sku": "FLI232",
  "icon": "Package",
  "inventory": {
    "track": true,
    "current": 0,
    "reorder_qty": 10,
    "alert_on_low": true,
    "reorder_level": 5
  },
  "priceType": "fixed",
  "pricingRecords": [
    {
      "id": "1",
      "taxes": [],
      "amount": 4000,
      "currency": "INR",
      "is_active": true,
      "price_type": "fixed",
      "tax_inclusion": "exclusive"
    }
  ]
}
```

**Key fields**: `sku`, `inventory` (stock tracking with reorder alerts), `pricingRecords[]`.

### 3c. Text Block — "text test"

```json
{
  "status": "active",
  "content": "",
  "priceType": "fixed",
  "content_type": "rich"
}
```

**Key fields**: `content` (rich text HTML), `content_type` (`"rich"` for WYSIWYG editor).

### Config field summary by block type

| Block Type | Unique Config Fields | Shared Fields |
|------------|---------------------|---------------|
| **service** | `pricingTiers` | `status`, `priceType`, `pricingRecords[]` |
| **spare** | `sku`, `inventory{track, current, reorder_level, reorder_qty, alert_on_low}` | `priceType`, `pricingRecords[]` |
| **text** | `content`, `content_type` | `status`, `priceType` |
| **billing** | *(only 1 row, empty config)* | — |

---

## 4. `resource_pricing` and `variant_pricing` JSONB Fields

### 4a. `resource_pricing` — Actual data (5 blocks have it)

This field links a service block to selectable equipment/resources. Example from **"Resource dependent Test"**:

```json
{
  "label": "Select Resource",
  "required": true,
  "allow_any": false,
  "selection_time": "contract",
  "resource_type_id": "equipment",
  "options": [
    {
      "name": "Fitness Equipment",
      "price": 2000,
      "currency": "INR",
      "resource_id": "8b0c76e1-9f01-41b6-994d-1a6509cf1214"
    },
    {
      "name": "CT Scanner",
      "price": 2000,
      "currency": "INR",
      "resource_id": "7a45fbf2-0d09-4545-a2d8-7e5848bae7c6"
    },
    {
      "name": "MRI Scanner",
      "price": 2000,
      "currency": "INR",
      "resource_id": "34917636-e08f-4bce-98aa-30f0a1aae61d"
    },
    {
      "name": "Swimming Pool",
      "price": 30000,
      "currency": "INR",
      "resource_id": "d0233ce1-eb15-434c-a5c6-91cafcc39bdb"
    },
    {
      "name": "Operation Theatre",
      "price": 30000,
      "currency": "INR",
      "resource_id": "2d5f9897-c383-4fa6-97a1-555c7f97e331"
    },
    {
      "name": "Production Facility",
      "price": 30000,
      "currency": "INR",
      "resource_id": "858c5e97-fd0e-4c0c-a464-8a1a42a5239e"
    }
  ]
}
```

**Field breakdown:**

| Field | Type | Purpose |
|-------|------|---------|
| `label` | string | UI label shown to user |
| `required` | boolean | Must select a resource |
| `allow_any` | boolean | Can pick any resource vs. only listed ones |
| `selection_time` | string | When selection happens: `"contract"` = at contract creation |
| `resource_type_id` | string | Category of resource (e.g. `"equipment"`) |
| `options[]` | array | Selectable resources |
| `options[].resource_id` | uuid | **The FK-style link to the resource** |
| `options[].name` | string | Display name |
| `options[].price` | number | Per-resource price override |
| `options[].currency` | string | Currency for this price |

### 4b. `variant_pricing` — Currently unused

**Zero rows** have `variant_pricing` populated. The intended TypeScript interface:

```typescript
{
  variants: Array<{
    id: string;        // variant UUID
    name: string;      // e.g. "Basic", "Premium"
    price: number;     // variant-specific price
    attributes?: Record<string, any>;  // e.g. { "size": "large", "color": "red" }
  }>
}
```

---

## 5. How a Block References Equipment/Resources

There is **no foreign key constraint** to any resource table. The entire relationship is embedded in JSONB:

```
m_cat_blocks.resource_pricing → options[] → resource_id (UUID)
```

### The full path

```
┌─────────────────────────┐
│     m_cat_blocks        │
│                         │
│  pricing_mode_id ───────┼──→ m_category_details.id
│    ↓                    │      sub_cat_name = 'independent'
│    ↓                    │                   = 'resource_based'
│    ↓                    │
│  resource_pricing       │    (only populated when pricing_mode = 'resource_based')
│    ├─ resource_type_id  │    "equipment" (string, not UUID)
│    └─ options[]         │
│        ├─ resource_id ──┼──→ UUID pointing to tenant resource
│        ├─ name          │    (denormalized display name)
│        └─ price         │    (per-resource price override)
└─────────────────────────┘
```

### Pricing modes in use

| `pricing_mode_id` UUID | Name | Meaning | Blocks |
|------------------------|------|---------|--------|
| `718f839d-9d41-4212-b2b0-553a2198fb86` | `independent` | Self-contained pricing, no resource link | Most blocks |
| `31fe25e3-9422-47b4-92ad-00bb10c57e31` | `resource_based` | Price depends on selected equipment | 5 service blocks |

### Target resource tables

| Table | Rows | Purpose |
|-------|------|---------|
| `t_catalog_resources` | 0 | Tenant-specific resource instances |
| `t_catalog_service_resources` | 0 | Junction: service ↔ resource mapping |
| `t_catalog_resource_pricing` | 0 | Resource-specific pricing rules |
| `m_catalog_resource_types` | 5 | Master resource type definitions |
| `m_catalog_resource_templates` | 240 | Global resource templates (e.g. "MRI Scanner") |

> **Observation**: The `resource_id` UUIDs in `resource_pricing.options[]` don't currently have matching rows in `t_catalog_resources` (0 rows). They may reference `m_catalog_resource_templates` or be tenant-local identifiers managed outside the DB schema.

---

## 6. Block Counts — Global vs Tenant

| Level | `is_seed` | `is_active` | Count |
|-------|-----------|-------------|-------|
| **TENANT** (`tenant_id` is set) | `false` | `true` | **43** |
| GLOBAL (`tenant_id` IS NULL) | — | — | **0** |
| SEED (`is_seed = true`) | — | — | **0** |

### Summary

- **43 total blocks**, all tenant-level, all active
- **0 global blocks** — the `tenant_id IS NULL` path in RLS exists but is unused
- **0 seed blocks** — the `is_seed = true` infrastructure is built but unused
- The multi-tenancy columns (`tenant_id`, `is_seed`), indexes, and RLS policies are **fully deployed** but no global/seed data has been seeded yet

### Blocks per tenant (for context)

All 43 blocks belong to tenant-owned accounts. The `tenant_id` FK cascades on delete, so removing a tenant removes all its blocks.

# Product Config Schema Documentation

> **Document Version**: 1.0
> **Created**: January 2025
> **Status**: Approved
> **Purpose**: Define the JSON schema for product-based billing configurations

---

## Overview

Each product (ContractNest, FamilyKnows, Kaladristi) has its own billing configuration stored in `t_bm_product_config.billing_config`. This allows:

1. **Dynamic Plan Creation** - UI reads features/plan_types from config instead of hardcoded values
2. **Product Isolation** - Each product defines its own features, tiers, and billing model
3. **No Code Changes** - Add/modify features by updating database, not code
4. **Version Control** - Configuration changes are tracked in history table

---

## Database Tables

### `t_bm_product_config`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `product_code` | TEXT | Unique identifier ('contractnest', 'familyknows', 'kaladristi') |
| `product_name` | TEXT | Display name |
| `config_version` | TEXT | Version string (e.g., '1.0', '1.1') |
| `billing_config` | JSONB | Full configuration (see schema below) |
| `is_active` | BOOLEAN | Whether config is active |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `updated_by` | UUID | User who last updated |

### `t_bm_product_config_history`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `product_code` | TEXT | Product identifier |
| `config_version` | TEXT | Version at time of save |
| `product_name` | TEXT | Product name at time of save |
| `billing_config` | JSONB | Full config snapshot |
| `changelog` | TEXT | Description of changes |
| `created_by` | UUID | User who made the change |
| `created_at` | TIMESTAMPTZ | When history entry was created |

---

## JSON Schema

### Root Structure

```typescript
interface BillingConfig {
  // Plan types available for this product
  plan_types: PlanType[];

  // Features that can be configured per plan
  features: Feature[];

  // Default tier ranges per plan type
  tier_templates: Record<string, TierTemplate[]>;

  // Notification channels and pricing
  notifications: NotificationConfig[];

  // Available trial duration options (days)
  trial_options: number[];

  // Available billing cycles
  billing_cycles: ('monthly' | 'quarterly' | 'annual')[];

  // Defaults
  default_trial_days?: number;
  default_billing_cycle?: string;

  // Optional: Free tier configuration
  free_tier?: FreeTierConfig;
}
```

### PlanType

```typescript
interface PlanType {
  // Unique code for this plan type
  code: string;        // e.g., "per_user", "per_contract", "per_family"

  // Display label
  label: string;       // e.g., "Per User", "Per Contract", "Per Family"

  // Primary metric for this plan type
  metric: string;      // e.g., "users", "contracts", "family_members"

  // Optional description
  description?: string;
}
```

**Examples:**

| Product | Plan Types |
|---------|------------|
| ContractNest | `per_user`, `per_contract` |
| FamilyKnows | `per_family` |
| Kaladristi | `subscription_usage` |

### Feature

```typescript
interface Feature {
  // Unique identifier
  id: string;          // e.g., "contacts", "contracts", "assets"

  // Display name
  name: string;        // e.g., "Contacts", "Contracts", "Assets"

  // Description for tooltips/help
  description?: string;

  // Feature type determines how it's configured
  type: 'limit' | 'addon' | 'boolean' | 'usage';

  // Default value for paid plans
  default: number | boolean;

  // Value during trial period
  trial: number | boolean;

  // Unit label (for display)
  unit?: string;       // e.g., "users", "GB", "contracts"

  // For addon type: base price
  base_price?: number;

  // For usage type: price per unit
  unit_price?: number;

  // Currency for pricing
  currency?: string;   // e.g., "INR", "USD"
}
```

**Feature Types:**

| Type | Description | Example |
|------|-------------|---------|
| `limit` | Numeric limit that can be set per tier | Contacts: 50, 100, 200 |
| `addon` | Optional add-on with separate pricing | VaNi AI: ₹5000/month |
| `boolean` | On/off feature | Portfolio Tracking: true/false |
| `usage` | Pay-per-use with unit pricing | AI Reports: ₹50 each |

### TierTemplate

```typescript
interface TierTemplate {
  // Minimum value (inclusive)
  min: number;

  // Maximum value (inclusive), null = unlimited
  max: number | null;

  // Optional custom label
  label?: string;      // e.g., "1-10 users", "Enterprise"

  // Optional base price for this tier (for subscription_usage type)
  base_price?: number;
}
```

**Example (ContractNest per_user):**

```json
[
  {"min": 1, "max": 10, "label": "1-10 users"},
  {"min": 11, "max": 20, "label": "11-20 users"},
  {"min": 21, "max": 50, "label": "21-50 users"},
  {"min": 51, "max": 100, "label": "51-100 users"},
  {"min": 101, "max": null, "label": "101+ users"}
]
```

### NotificationConfig

```typescript
interface NotificationConfig {
  // Channel identifier
  channel: string;     // "whatsapp", "sms", "email", "inapp"

  // Display name
  name: string;        // "WhatsApp Notifications"

  // Description
  description?: string;

  // Price per notification credit
  unit_price: number;

  // Default credits included per user/contract
  default_credits: number;

  // Currency
  currency?: string;
}
```

### FreeTierConfig

```typescript
interface FreeTierConfig {
  // Whether free tier is enabled
  enabled: boolean;

  // Limits for free tier
  limits: Record<string, number>;
}
```

**Example (FamilyKnows):**

```json
{
  "enabled": true,
  "limits": {
    "family_members": 1,
    "assets": 25,
    "documents": 5,
    "nominees": 1
  }
}
```

---

## Product Configurations

### ContractNest

```json
{
  "plan_types": [
    {"code": "per_user", "label": "Per User", "metric": "users"},
    {"code": "per_contract", "label": "Per Contract", "metric": "contracts"}
  ],
  "features": [
    {"id": "contacts", "name": "Contacts", "type": "limit", "default": 50, "trial": 5},
    {"id": "contracts", "name": "Contracts", "type": "limit", "default": 25, "trial": 2},
    {"id": "appointments", "name": "Appointments", "type": "limit", "default": 30, "trial": 3},
    {"id": "documents", "name": "Document Storage", "type": "limit", "default": 5, "trial": 1},
    {"id": "users", "name": "User Accounts", "type": "limit", "default": 10, "trial": 2},
    {"id": "vani", "name": "VaNi AI", "type": "addon", "base_price": 5000},
    {"id": "marketplace", "name": "Marketplace", "type": "addon", "base_price": 2000},
    {"id": "finance", "name": "Finance", "type": "addon", "base_price": 3000}
  ],
  "trial_options": [5, 7, 10, 14, 30],
  "billing_cycles": ["monthly", "quarterly", "annual"]
}
```

### FamilyKnows

```json
{
  "plan_types": [
    {"code": "per_family", "label": "Per Family", "metric": "family_members"}
  ],
  "features": [
    {"id": "assets", "name": "Assets", "type": "limit", "default": 100, "trial": 25},
    {"id": "family_members", "name": "Family Members", "type": "limit", "default": 4, "trial": 1},
    {"id": "nominees", "name": "Nominees", "type": "limit", "default": 5, "trial": 1},
    {"id": "documents", "name": "Documents", "type": "limit", "default": 50, "trial": 5},
    {"id": "ai_insights", "name": "AI Insights", "type": "addon", "base_price": 100}
  ],
  "trial_options": [14, 30],
  "billing_cycles": ["monthly", "annual"],
  "free_tier": {
    "enabled": true,
    "limits": {"family_members": 1, "assets": 25, "documents": 5, "nominees": 1}
  }
}
```

### Kaladristi (Planned)

```json
{
  "plan_types": [
    {"code": "subscription_usage", "label": "Subscription + Usage", "metric": "reports"}
  ],
  "features": [
    {"id": "reports", "name": "AI Reports", "type": "usage", "unit_price": 50},
    {"id": "watchlists", "name": "Watchlists", "type": "limit", "default": 5, "trial": 1},
    {"id": "alerts", "name": "Price Alerts", "type": "limit", "default": 20, "trial": 5},
    {"id": "portfolio_tracking", "name": "Portfolio Tracking", "type": "boolean", "default": true}
  ],
  "trial_options": [7, 14],
  "billing_cycles": ["monthly"]
}
```

---

## RPC Functions

### `get_product_config(product_code)`

Returns the active configuration for a specific product.

```sql
SELECT get_product_config('contractnest');
```

**Response:**
```json
{
  "success": true,
  "product_code": "contractnest",
  "product_name": "ContractNest",
  "config_version": "1.0",
  "billing_config": { ... },
  "is_active": true,
  "updated_at": "2025-01-19T..."
}
```

### `list_product_configs()`

Returns a summary of all active product configurations.

```sql
SELECT list_product_configs();
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "product_code": "contractnest",
      "product_name": "ContractNest",
      "config_version": "1.0",
      "is_active": true,
      "plan_types": [...],
      "feature_count": 8
    },
    ...
  ],
  "count": 2
}
```

### `get_product_config_history(product_code)`

Returns version history for a product configuration.

```sql
SELECT get_product_config_history('contractnest');
```

**Response:**
```json
{
  "success": true,
  "product_code": "contractnest",
  "history": [
    {
      "id": "...",
      "config_version": "1.0",
      "changelog": "Initial configuration",
      "created_at": "2025-01-19T...",
      "created_by": null
    }
  ],
  "count": 1
}
```

---

## Usage in Plan Creation UI

### Flow

1. User selects product in BasicInfoStep
2. UI calls `GET /api/product-config/{productCode}`
3. UI receives `billing_config` with features, plan_types, etc.
4. All form steps render dynamically based on config
5. Plan saved with `product_code` reference

### Fallback

If product config is not found, UI falls back to `pricing.ts` constants for backward compatibility.

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Claude Code | Initial schema definition |

---

**End of Document**

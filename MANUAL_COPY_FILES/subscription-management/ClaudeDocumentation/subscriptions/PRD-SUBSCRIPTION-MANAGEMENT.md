# PRD: Subscription Management & Tenant Data Lifecycle

**Version:** 1.0
**Created:** January 2025
**Author:** Claude Code
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Stories](#3-user-stories)
4. [Technical Architecture](#4-technical-architecture)
5. [Extensible Data Registry](#5-extensible-data-registry)
6. [API Design](#6-api-design)
7. [Innovative UI Design](#7-innovative-ui-design)
8. [Component Architecture](#8-component-architecture)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Executive Summary

### 1.1 Overview

This PRD defines the implementation of a comprehensive **Subscription Management** system for ContractNest that serves two primary user groups:

1. **Platform Administrators** - Global visibility and control over all tenant subscriptions
2. **Tenant Owners** - Self-service account closure with data deletion

### 1.2 Key Objectives

| Objective | Description |
|-----------|-------------|
| **Visibility** | Admins see all tenants with subscription status, usage metrics, and tenant classification |
| **Control** | Admins can change tenant status and delete tenant data |
| **Self-Service** | Tenant owners can close their own accounts |
| **Extensibility** | Registry-based architecture that auto-adapts as new tables are added |
| **Innovation** | Deliver a "wow factor" UI that sets ContractNest apart |

### 1.3 Success Metrics

- Admin can view all tenants in < 2 seconds
- Data deletion completes within 30 seconds for average tenant
- Zero data leaks (proper cascade handling)
- 100% audit trail for deletions

---

## 2. Problem Statement

### 2.1 Current State

| Issue | Impact |
|-------|--------|
| No admin visibility into all tenants | Cannot monitor platform health |
| No way to identify tenant type (buyer/seller) | Cannot segment or target tenants |
| Only soft-delete exists | Orphan data accumulates |
| No self-service account closure | Support burden for closures |
| Hardcoded table references | Adding tables requires code changes |

### 2.2 Desired State

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Real-time tenant overview with:                            ││
│  │  • Subscription status distribution                         ││
│  │  • Buyer/Seller segmentation                                ││
│  │  • Industry breakdown                                       ││
│  │  • Expiring trials alerts                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Per-tenant actions:                                        ││
│  │  • View detailed data summary                               ││
│  │  • Change subscription/tenant status                        ││
│  │  • Hard delete all data (preserving audit)                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   TENANT OWNER SELF-SERVICE                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Settings → Business Profile → Close Account                ││
│  │  • Empathetic offboarding flow                              ││
│  │  • Feedback collection (for product improvement)            ││
│  │  • Visual data preview before deletion                      ││
│  │  • Irreversible confirmation                                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Stories

### 3.1 Admin User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| A1 | As an admin, I want to see all tenants in a single view | List shows tenant name, subscription status, type, industry, key metrics |
| A2 | As an admin, I want to understand each tenant's subscription | Show plan, billing cycle, trial dates, renewal date |
| A3 | As an admin, I want to know if a tenant is mainly buyer or seller | Display classification based on contact data |
| A4 | As an admin, I want to see tenant's industry | Show industry from tenant profile |
| A5 | As an admin, I want to change tenant status | Status change with reason, audit logged |
| A6 | As an admin, I want to delete all tenant data | Hard delete except t_tenants, with confirmation |

### 3.2 Tenant Owner User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| T1 | As a tenant owner, I want to close my account | Multi-step flow with clear warnings |
| T2 | As a tenant owner, I want to see what data will be deleted | Visual breakdown by category with counts |
| T3 | As a tenant owner, I want to provide feedback before leaving | Optional feedback form (not blocking) |
| T4 | As a tenant owner, I want confirmation that deletion is irreversible | Type-to-confirm pattern |

---

## 4. Technical Architecture

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (UI)                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ADMIN                              TENANT OWNER                         │
│   ┌───────────────────────┐         ┌───────────────────────┐            │
│   │ /admin/subscription-  │         │ /settings/business-   │            │
│   │ management            │         │ profile               │            │
│   │ • TenantDashboard     │         │ • CloseAccountSection │            │
│   │ • TenantDetailDrawer  │         │                       │            │
│   │ • DeleteDataModal     │         │                       │            │
│   └───────────┬───────────┘         └───────────┬───────────┘            │
│               │                                 │                         │
│               └─────────────┬───────────────────┘                         │
│                             │                                             │
│   ┌─────────────────────────▼─────────────────────────────────┐          │
│   │              SHARED COMPONENTS                             │          │
│   │  • DataSummaryVisualizer   • DeleteConfirmationFlow       │          │
│   │  • TenantCard              • SubscriptionBadge            │          │
│   │  • TenantTypeBadge         • AnimatedCounter              │          │
│   └─────────────────────────┬─────────────────────────────────┘          │
│                             │                                             │
└─────────────────────────────┼─────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   /api/admin/subscription-management/                                     │
│   ├── GET    /tenants              → List all tenants with stats         │
│   ├── GET    /tenants/:id          → Single tenant details               │
│   ├── GET    /tenants/:id/data-summary → Data counts by category        │
│   ├── PATCH  /tenants/:id/status   → Update tenant status                │
│   ├── DELETE /tenants/:id/data     → Hard delete tenant data             │
│   └── GET    /stats                → Dashboard statistics                │
│                                                                           │
│   /api/tenants/                                                           │
│   ├── GET    /:id/data-summary     → Owner's data summary                │
│   ├── POST   /:id/close            → Owner closes account                │
│   └── POST   /:id/feedback         → Save closure feedback               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         EDGE FUNCTIONS                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   admin-tenant-management/                                                │
│   ├── get-all-tenants.ts      → Query with joins for stats               │
│   ├── get-tenant-detail.ts    → Full tenant info                         │
│   ├── get-data-summary.ts     → Dynamic counts from registry             │
│   ├── update-tenant-status.ts → Status change with audit                 │
│   └── delete-tenant-data.ts   → Transactional deletion                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Core Tables:                                                            │
│   • t_tenants (preserved on delete)                                       │
│   • t_bm_tenant_subscription                                              │
│   • t_tenant_profiles                                                     │
│                                                                           │
│   Data Tables (deleted):                                                  │
│   • t_contacts → t_contact_addresses, t_contact_channels                 │
│   • t_user_tenants → t_user_tenant_roles                                 │
│   • t_user_invitations                                                   │
│   • t_service_contracts                                                  │
│   • t_tenant_files                                                       │
│   • t_catalog_* tables                                                   │
│   • ... (see Data Registry)                                              │
│                                                                           │
│   Audit Tables (archived, not deleted):                                   │
│   • t_audit_logs → moved to t_audit_logs_archive                         │
│   • t_tenant_deletion_log (NEW)                                          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Database Changes Required

```sql
-- New table for deletion audit trail
CREATE TABLE t_tenant_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES t_tenants(id),
  deleted_by UUID NOT NULL,
  deleted_by_type VARCHAR(20) NOT NULL, -- 'admin' | 'owner'
  reason TEXT,
  feedback_category VARCHAR(50),
  feedback_text TEXT,
  data_summary JSONB NOT NULL, -- Snapshot of what was deleted
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Archive table for audit logs
CREATE TABLE t_audit_logs_archive (
  LIKE t_audit_logs INCLUDING ALL
);

-- Index for efficient lookups
CREATE INDEX idx_deletion_log_tenant ON t_tenant_deletion_log(tenant_id);
CREATE INDEX idx_deletion_log_date ON t_tenant_deletion_log(deleted_at);
```

---

## 5. Extensible Data Registry

### 5.1 Design Philosophy

The data registry is a **configuration-driven** approach that:

1. Defines all tenant-related tables in one place
2. Specifies deletion order (dependencies)
3. Provides UI metadata (labels, icons)
4. Handles both cascade and manual deletions
5. Supports pre-delete hooks (e.g., delete storage files)

### 5.2 Registry Definition

```typescript
// src/config/tenantDataRegistry.ts

export interface TenantDataTable {
  tableName: string;           // Database table name
  displayLabel: string;        // UI display name
  tenantIdColumn: string;      // Column name for tenant_id
  cascadeHandled: boolean;     // If FK cascade handles deletion
  countQuery?: string;         // Custom count query (optional)
  preDeleteHook?: string;      // Function to call before delete
  postDeleteHook?: string;     // Function to call after delete
}

export interface TenantDataCategory {
  id: string;                  // Unique identifier
  label: string;               // UI category label
  icon: string;                // Lucide icon name
  description: string;         // Explanation for users
  priority: number;            // Deletion order (1 = first)
  color: string;               // Brand color for UI
  tables: TenantDataTable[];
}

export const TENANT_DATA_REGISTRY: TenantDataCategory[] = [
  {
    id: 'contacts',
    label: 'Contacts & Relationships',
    icon: 'Users',
    description: 'Your business contacts, their addresses, and communication channels',
    priority: 1,
    color: '#3B82F6', // Blue
    tables: [
      {
        tableName: 't_contacts',
        displayLabel: 'Contacts',
        tenantIdColumn: 'tenant_id',
        cascadeHandled: false
      },
      // t_contact_addresses and t_contact_channels cascade from t_contacts
    ]
  },
  {
    id: 'users',
    label: 'Users & Team',
    icon: 'UserPlus',
    description: 'Team members, their roles, and pending invitations',
    priority: 2,
    color: '#8B5CF6', // Purple
    tables: [
      {
        tableName: 't_user_tenants',
        displayLabel: 'Team Members',
        tenantIdColumn: 'tenant_id',
        cascadeHandled: true
      },
      {
        tableName: 't_user_invitations',
        displayLabel: 'Invitations',
        tenantIdColumn: 'tenant_id',
        cascadeHandled: true
      },
    ]
  },
  {
    id: 'contracts',
    label: 'Contracts & Documents',
    icon: 'FileText',
    description: 'Service contracts, templates, and uploaded files',
    priority: 3,
    color: '#10B981', // Green
    tables: [
      {
        tableName: 't_service_contracts',
        displayLabel: 'Contracts',
        tenantIdColumn: 'tenant_id',
        cascadeHandled: true
      },
      {
        tableName: 't_tenant_files',
        displayLabel: 'Files',
        tenantIdColumn: 'tenant_id',
        cascadeHandled: true,
        preDeleteHook: 'deleteStorageFiles'
      },
    ]
  },
  {
    id: 'catalog',
    label: 'Catalog & Services',
    icon: 'Package',
    description: 'Products, services, categories, and pricing',
    priority: 4,
    color: '#F59E0B', // Amber
    tables: [
      { tableName: 't_catalog_items', displayLabel: 'Catalog Items', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_catalog_resources', displayLabel: 'Resources', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_catalog_categories', displayLabel: 'Categories', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_catalog_industries', displayLabel: 'Industries', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_catalog_service_resources', displayLabel: 'Service Resources', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_catalog_resource_pricing', displayLabel: 'Pricing', tenantIdColumn: 'tenant_id', cascadeHandled: true },
    ]
  },
  {
    id: 'settings',
    label: 'Settings & Configuration',
    icon: 'Settings',
    description: 'Business settings, tax configuration, and preferences',
    priority: 5,
    color: '#6366F1', // Indigo
    tables: [
      { tableName: 't_tenant_profiles', displayLabel: 'Business Profile', tenantIdColumn: 'tenant_id', cascadeHandled: false },
      { tableName: 't_tax_settings', displayLabel: 'Tax Settings', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_tax_rates', displayLabel: 'Tax Rates', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 'n_tenant_preferences', displayLabel: 'Preferences', tenantIdColumn: 'tenant_id', cascadeHandled: false },
      { tableName: 't_tenant_integrations', displayLabel: 'Integrations', tenantIdColumn: 'tenant_id', cascadeHandled: false },
      { tableName: 't_tenant_domains', displayLabel: 'Domains', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_tenant_regions', displayLabel: 'Regions', tenantIdColumn: 'tenant_id', cascadeHandled: true },
    ]
  },
  {
    id: 'subscription',
    label: 'Subscription & Billing',
    icon: 'CreditCard',
    description: 'Subscription plan, billing history, and credits',
    priority: 6,
    color: '#EC4899', // Pink
    tables: [
      { tableName: 't_bm_tenant_subscription', displayLabel: 'Subscription', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_bm_credit_balance', displayLabel: 'Credit Balance', tenantIdColumn: 'tenant_id', cascadeHandled: false },
      { tableName: 't_bm_credit_transaction', displayLabel: 'Credit History', tenantIdColumn: 'tenant_id', cascadeHandled: false },
      { tableName: 't_bm_subscription_usage', displayLabel: 'Usage Records', tenantIdColumn: 'tenant_id', cascadeHandled: false },
    ]
  },
  {
    id: 'system',
    label: 'System Data',
    icon: 'Database',
    description: 'Onboarding progress, audit logs, and system records',
    priority: 99, // Always last
    color: '#64748B', // Slate
    tables: [
      { tableName: 't_tenant_onboarding', displayLabel: 'Onboarding', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      { tableName: 't_onboarding_step_status', displayLabel: 'Onboarding Steps', tenantIdColumn: 'tenant_id', cascadeHandled: true },
      {
        tableName: 't_audit_logs',
        displayLabel: 'Audit Logs',
        tenantIdColumn: 'tenant_id',
        cascadeHandled: false,
        preDeleteHook: 'archiveAuditLogs' // Move to archive, don't delete
      },
      { tableName: 't_idempotency_keys', displayLabel: 'System Keys', tenantIdColumn: 'tenant_id', cascadeHandled: false },
    ]
  }
];

// Helper to get all tables sorted by deletion priority
export function getOrderedTablesForDeletion(): TenantDataTable[] {
  return TENANT_DATA_REGISTRY
    .sort((a, b) => a.priority - b.priority)
    .flatMap(category => category.tables);
}

// Helper to add new category (for future modules/plugins)
export function registerDataCategory(category: TenantDataCategory): void {
  const existing = TENANT_DATA_REGISTRY.find(c => c.id === category.id);
  if (existing) {
    throw new Error(`Category ${category.id} already exists`);
  }
  TENANT_DATA_REGISTRY.push(category);
  TENANT_DATA_REGISTRY.sort((a, b) => a.priority - b.priority);
}
```

### 5.3 Adding New Tables

When a new table with `tenant_id` is added:

```typescript
// Simply add to the appropriate category:
{
  id: 'invoices', // New category
  label: 'Invoices & Payments',
  icon: 'Receipt',
  description: 'Invoice records and payment history',
  priority: 7,
  color: '#22C55E',
  tables: [
    { tableName: 't_invoices', displayLabel: 'Invoices', tenantIdColumn: 'tenant_id', cascadeHandled: true },
    { tableName: 't_payments', displayLabel: 'Payments', tenantIdColumn: 'tenant_id', cascadeHandled: true },
  ]
}
```

---

## 6. API Design

### 6.1 Admin Endpoints

#### GET /api/admin/subscription-management/tenants

**Purpose:** List all tenants with subscription and stats

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by tenant status |
| subscription_status | string | Filter by subscription status |
| tenant_type | string | buyer, seller, mixed |
| industry_id | UUID | Filter by industry |
| search | string | Search name, email, workspace_code |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "workspace_code": "ACME-001",
      "status": "active",
      "is_admin": false,
      "created_at": "2024-01-15T...",
      "subscription": {
        "status": "active",
        "product_code": "contractnest",
        "billing_cycle": "monthly",
        "next_billing_date": "2025-02-15",
        "trial_end_date": null
      },
      "profile": {
        "business_name": "Acme Corporation",
        "logo_url": "https://...",
        "industry_name": "IT & Software",
        "city": "Hyderabad"
      },
      "stats": {
        "total_users": 5,
        "total_contacts": 156,
        "total_contracts": 25,
        "buyer_contacts": 89,
        "seller_contacts": 45,
        "tenant_type": "buyer"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 8,
    "total_records": 156,
    "limit": 20
  }
}
```

#### GET /api/admin/subscription-management/tenants/:id/data-summary

**Purpose:** Get detailed data counts by category for a tenant

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant_id": "uuid",
    "tenant_name": "Acme Corp",
    "workspace_code": "ACME-001",
    "categories": [
      {
        "id": "contacts",
        "label": "Contacts & Relationships",
        "icon": "Users",
        "color": "#3B82F6",
        "description": "Your business contacts...",
        "totalCount": 156,
        "items": [
          { "label": "Contacts", "count": 156, "table": "t_contacts" },
          { "label": "Addresses", "count": 89, "table": "t_contact_addresses" },
          { "label": "Channels", "count": 234, "table": "t_contact_channels" }
        ]
      },
      // ... more categories
    ],
    "totalRecords": 523,
    "canDelete": true,
    "blockingReasons": []
  }
}
```

#### DELETE /api/admin/subscription-management/tenants/:id/data

**Purpose:** Hard delete all tenant data (except t_tenants)

**Request Body:**
```json
{
  "confirmed": true,
  "reason": "Account cleanup per user request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_counts": {
      "t_contacts": 156,
      "t_contact_addresses": 89,
      "t_user_tenants": 5,
      // ...
    },
    "total_deleted": 523,
    "tenant_status": "closed",
    "deletion_log_id": "uuid"
  }
}
```

### 6.2 Tenant Owner Endpoints

#### POST /api/tenants/:id/close

**Purpose:** Owner closes their own account

**Request Body:**
```json
{
  "confirmed": true,
  "feedback": {
    "category": "not_using_enough",
    "comment": "I found another solution that fits better"
  }
}
```

---

## 7. Innovative UI Design

### 7.1 Design Philosophy

Moving away from traditional admin tables, we adopt:

1. **Visual Data Storytelling** - Charts, progress rings, animated counters
2. **Spatial Navigation** - Cards that expand into detailed views
3. **Micro-interactions** - Hover states, transitions, feedback
4. **Emotional Design** - Empathetic offboarding, celebratory confirmations
5. **Progressive Disclosure** - Show summary first, details on demand

### 7.2 Admin Dashboard: "Command Center" Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ╭─────────────────────────────────────────────────────────────────────────╮│
│  │     S U B S C R I P T I O N   M A N A G E M E N T                      ││
│  │     ─────────────────────────────────────────────────────              ││
│  │     Platform overview and tenant management                             ││
│  ╰─────────────────────────────────────────────────────────────────────────╯│
│                                                                             │
│  ┌─ PLATFORM PULSE ──────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │ │
│  │   │    156     │  │    ▲ 12    │  │     8      │  │    ▼ 3     │     │ │
│  │   │  ┌──────┐  │  │  ┌──────┐  │  │  ┌──────┐  │  │  ┌──────┐  │     │ │
│  │   │  │██████│  │  │  │▓▓▓▓▓▓│  │  │  │░░░░░░│  │  │  │      │  │     │ │
│  │   │  │██████│  │  │  │▓▓▓▓▓▓│  │  │  │░░░░░░│  │  │  │      │  │     │ │
│  │   │  └──────┘  │  │  └──────┘  │  │  └──────┘  │  │  └──────┘  │     │ │
│  │   │   TOTAL    │  │   NEW      │  │  EXPIRING  │  │  CHURNED   │     │ │
│  │   │  tenants   │  │  this mo.  │  │  in 7 days │  │  this mo.  │     │ │
│  │   └────────────┘  └────────────┘  └────────────┘  └────────────┘     │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ TENANT DISTRIBUTION ─────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   BY SUBSCRIPTION           BY TYPE              BY INDUSTRY          │ │
│  │   ┌────────────────┐       ┌─────────────┐      ┌─────────────────┐  │ │
│  │   │    ╭────╮      │       │    ╱╲       │      │ IT & Software ▓▓▓▓│  │ │
│  │   │   ╱ 78% ╲     │       │   ╱🛒╲      │      │ Consulting   ▓▓▓ │  │ │
│  │   │  │Active │     │       │  ╱────╲     │      │ Manufacturing▓▓  │  │ │
│  │   │   ╲     ╱     │       │ ╱ 57%  ╲    │      │ Healthcare   ▓   │  │ │
│  │   │    ╰────╯      │       │╱Buyers  ╲   │      │ Others       ░   │  │ │
│  │   │  16% Trial     │       │ 28% Sellers│      └─────────────────┘  │ │
│  │   │   6% Other     │       │ 15% Mixed  │                           │ │
│  │   └────────────────┘       └─────────────┘                           │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ TENANT EXPLORER ─────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ╭──────────────────────────────────────────────────────────────────╮ │ │
│  │  │ 🔍 Search by name, email, or workspace code...                   │ │ │
│  │  ╰──────────────────────────────────────────────────────────────────╯ │ │
│  │                                                                        │ │
│  │  ┌─ Quick Filters ─────────────────────────────────────────────────┐  │ │
│  │  │ [● All] [○ Active] [○ Trial] [○ Expiring] [○ Suspended]        │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  ┌─ Advanced ─────────────────────────────────────────────────────┐   │ │
│  │  │ Status: [All ▾]  Subscription: [All ▾]  Type: [All ▾]         │   │ │
│  │  │ Industry: [All ▾]  Sort: [Recent ▾]                            │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Tenant Cards: "Information Density" Design

Instead of boring table rows, use cards with **layered information**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │   ┌──────┐                                                          │  │
│  │   │ LOGO │  Acme Corporation                                        │  │
│  │   │      │  ━━━━━━━━━━━━━━━━━━━━                                    │  │
│  │   └──────┘  📧 contact@acme.com  •  📍 Hyderabad                    │  │
│  │                                                                     │  │
│  │   ┌─────────────────────────────────────────────────────────────┐  │  │
│  │   │                                                             │  │  │
│  │   │   ┌────────────────┐   ┌────────────────┐                   │  │  │
│  │   │   │  🟢 ACTIVE     │   │  💳 MONTHLY    │                   │  │  │
│  │   │   │  Subscription  │   │  Next: Feb 15  │                   │  │  │
│  │   │   └────────────────┘   └────────────────┘                   │  │  │
│  │   │                                                             │  │  │
│  │   │   ┌────────────────┐   ┌────────────────┐                   │  │  │
│  │   │   │  🛒 BUYER      │   │  🏭 IT & Tech  │                   │  │  │
│  │   │   │  Primary Type  │   │  Industry      │                   │  │  │
│  │   │   └────────────────┘   └────────────────┘                   │  │  │
│  │   │                                                             │  │  │
│  │   └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │   ┌─ QUICK STATS ───────────────────────────────────────────────┐  │  │
│  │   │                                                             │  │  │
│  │   │   👥         📇          📄          💾                     │  │  │
│  │   │   5          156         25          32 MB                  │  │  │
│  │   │   users      contacts    contracts   storage                │  │  │
│  │   │                                                             │  │  │
│  │   │   ╔════════════════════════════════════════════════════╗   │  │  │
│  │   │   ║████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░║   │  │  │
│  │   │   ╚════════════════════════════════════════════════════╝   │  │  │
│  │   │   Contact Mix: 57% buyers ──────────── 29% sellers ── 14% │  │  │
│  │   │                                                             │  │  │
│  │   └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │   ┌────────────────────────────────────────────────────────────┐   │  │
│  │   │           [ View Details ]              [ Actions ▾ ]      │   │  │
│  │   └────────────────────────────────────────────────────────────┘   │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Data Deletion Flow: "Visual Journey"

The delete modal becomes an **immersive experience**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                       DELETE TENANT DATA                                    │
│                       ──────────────────                                    │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │     ● ─────────────── ○ ─────────────── ○                          │  │
│   │   Review           Preview           Confirm                        │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ╔═════════════════════════════════════════════════════════════════════╗  │
│   ║                                                                     ║  │
│   ║      ┌──────────────────────────────────────────────────────┐      ║  │
│   ║      │                                                      │      ║  │
│   ║      │              🏢 Acme Corporation                     │      ║  │
│   ║      │              ACME-001                                │      ║  │
│   ║      │                                                      │      ║  │
│   ║      │        ┌─────────────────────────────────┐          │      ║  │
│   ║      │        │                                 │          │      ║  │
│   ║      │        │      ╭─────────────────╮        │          │      ║  │
│   ║      │        │      │                 │        │          │      ║  │
│   ║      │        │      │      523        │        │          │      ║  │
│   ║      │        │      │    records      │        │          │      ║  │
│   ║      │        │      │                 │        │          │      ║  │
│   ║      │        │      ╰─────────────────╯        │          │      ║  │
│   ║      │        │                                 │          │      ║  │
│   ║      │        │   will be permanently deleted   │          │      ║  │
│   ║      │        │                                 │          │      ║  │
│   ║      │        └─────────────────────────────────┘          │      ║  │
│   ║      │                                                      │      ║  │
│   ║      └──────────────────────────────────────────────────────┘      ║  │
│   ║                                                                     ║  │
│   ╚═════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│   ┌─ DATA BREAKDOWN ────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │  ┌─────────────────────────────────────────────────────────────┐   │  │
│   │  │  👥 Contacts & Relationships                                │   │  │
│   │  │  ╔══════════════════════════════════════════════════════╗   │   │  │
│   │  │  ║████████████████████████████████████████████████░░░░░░║   │   │  │
│   │  │  ╚══════════════════════════════════════════════════════╝   │   │  │
│   │  │  156 contacts • 89 addresses • 234 channels         = 479  │   │  │
│   │  └─────────────────────────────────────────────────────────────┘   │  │
│   │                                                                     │  │
│   │  ┌─────────────────────────────────────────────────────────────┐   │  │
│   │  │  👤 Users & Team                                            │   │  │
│   │  │  ╔════════════════════════════════════════════════════════╗ │   │  │
│   │  │  ║█████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║ │   │  │
│   │  │  ╚════════════════════════════════════════════════════════╝ │   │  │
│   │  │  5 members • 3 invitations                            = 8   │   │  │
│   │  └─────────────────────────────────────────────────────────────┘   │  │
│   │                                                                     │  │
│   │  [Expand to see all 7 categories...]                               │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                        [ Cancel ]    [ Continue → ]                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Owner Offboarding: "Empathetic Goodbye"

For tenant owners closing their account:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │                        😢                                           │  │
│   │                                                                     │  │
│   │              We're sorry to see you go                             │  │
│   │              ─────────────────────────                             │  │
│   │                                                                     │  │
│   │      Your feedback helps us build a better product.                │  │
│   │      Would you mind telling us why you're leaving?                 │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─ REASON FOR LEAVING ────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │   ┌──────────────────────────────────────────────────────────────┐ │  │
│   │   │  ○  I found a better alternative                             │ │  │
│   │   ├──────────────────────────────────────────────────────────────┤ │  │
│   │   │  ○  The pricing doesn't fit my budget                        │ │  │
│   │   ├──────────────────────────────────────────────────────────────┤ │  │
│   │   │  ○  I'm not using the product enough                         │ │  │
│   │   ├──────────────────────────────────────────────────────────────┤ │  │
│   │   │  ○  Missing features I need                                  │ │  │
│   │   ├──────────────────────────────────────────────────────────────┤ │  │
│   │   │  ○  Technical issues or bugs                                 │ │  │
│   │   ├──────────────────────────────────────────────────────────────┤ │  │
│   │   │  ○  Just testing / Not a real account                        │ │  │
│   │   ├──────────────────────────────────────────────────────────────┤ │  │
│   │   │  ○  Other reason                                             │ │  │
│   │   └──────────────────────────────────────────────────────────────┘ │  │
│   │                                                                     │  │
│   │   ┌──────────────────────────────────────────────────────────────┐ │  │
│   │   │  Tell us more (optional)                                     │ │  │
│   │   │                                                              │ │  │
│   │   │  ________________________________________________            │ │  │
│   │   │  ________________________________________________            │ │  │
│   │   │                                                              │ │  │
│   │   └──────────────────────────────────────────────────────────────┘ │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                   [ Skip Feedback ]    [ Continue → ]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.6 Animated Data Visualization

Use **animated progress rings** showing data composition:

```typescript
// AnimatedDataRing component concept

interface DataRingSegment {
  label: string;
  count: number;
  color: string;
}

// Visual representation:
//
//         ╭──────────────────────╮
//        ╱                        ╲
//       │    ┌──────────────┐      │
//       │    │              │      │
//       │    │     523      │      │
//       │    │   records    │      │
//       │    │              │      │
//       │    └──────────────┘      │
//        ╲                        ╱
//         ╰──────────────────────╯
//
// Ring segments animate in sequentially:
// - Contacts (blue): 30%
// - Users (purple): 2%
// - Contracts (green): 9%
// - Catalog (amber): 17%
// - Settings (indigo): 2%
// - Subscription (pink): 0.5%
// - System (slate): 39.5%
```

---

## 8. Component Architecture

### 8.1 Shared Components (Used by Admin & Owner)

```
src/components/subscription/
├── index.ts                         # Barrel export
│
├── badges/
│   ├── SubscriptionStatusBadge.tsx  # trial|active|expired|cancelled
│   ├── TenantStatusBadge.tsx        # active|inactive|suspended|closed
│   ├── TenantTypeBadge.tsx          # Buyer|Seller|Mixed with icons
│   └── IndustryBadge.tsx            # Industry chip
│
├── cards/
│   ├── TenantCard.tsx               # Main tenant display card
│   ├── StatCard.tsx                 # Single stat with icon & trend
│   └── StatsGrid.tsx                # Grid of StatCards
│
├── data-viz/
│   ├── AnimatedCounter.tsx          # Number animation (count up)
│   ├── DataProgressBar.tsx          # Segmented progress bar
│   ├── DataRingChart.tsx            # Circular data visualization
│   └── CategoryDataRow.tsx          # Single category with progress
│
├── lists/
│   ├── TenantList.tsx               # Grid/list of TenantCards
│   ├── DataSummaryList.tsx          # Expandable category list
│   └── DataCategoryAccordion.tsx    # Single expandable category
│
├── modals/
│   ├── DeleteConfirmationFlow.tsx   # Multi-step delete wizard
│   ├── ChangeStatusModal.tsx        # Status change with reason
│   └── TenantDetailDrawer.tsx       # Side panel with full details
│
├── filters/
│   ├── TenantFilters.tsx            # Combined filters component
│   ├── QuickFilterChips.tsx         # Pill-style quick filters
│   └── SearchInput.tsx              # Animated search input
│
├── feedback/
│   └── FeedbackForm.tsx             # Closure feedback (owner only)
│
└── hooks/
    ├── useTenantDataSummary.ts      # Fetch data counts
    ├── useDeleteTenantData.ts       # Delete mutation
    └── useAdminTenants.ts           # Admin list query
```

### 8.2 Admin-Specific Pages

```
src/pages/admin/subscription-management/
├── index.tsx                        # Main dashboard
└── components/
    ├── PlatformPulse.tsx            # Stats overview section
    ├── TenantDistribution.tsx       # Charts section
    ├── TenantExplorer.tsx           # Search & filter section
    └── AdminActionButtons.tsx       # Status change, delete actions
```

### 8.3 Tenant Owner Integration

```
src/pages/settings/business-profile/
├── index.tsx                        # Existing page
└── sections/
    └── CloseAccountSection.tsx      # NEW - Added to bottom
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)

| Task | Owner | Status |
|------|-------|--------|
| Create shared types (tenantManagement.ts) | Frontend | Pending |
| Create data registry config | Backend | Pending |
| Implement badge components | Frontend | Pending |
| Implement stat card components | Frontend | Pending |
| API: /admin/subscription-management/stats | Backend | Pending |

### Phase 2: Admin Dashboard (Week 2)

| Task | Owner | Status |
|------|-------|--------|
| Admin page layout | Frontend | Pending |
| PlatformPulse component | Frontend | Pending |
| TenantDistribution charts | Frontend | Pending |
| TenantFilters component | Frontend | Pending |
| API: /admin/subscription-management/tenants | Backend | Pending |
| TenantCard component | Frontend | Pending |
| TenantList with pagination | Frontend | Pending |

### Phase 3: Tenant Detail & Actions (Week 3)

| Task | Owner | Status |
|------|-------|--------|
| TenantDetailDrawer | Frontend | Pending |
| API: /admin/.../tenants/:id/data-summary | Backend | Pending |
| DataSummaryList component | Frontend | Pending |
| AnimatedDataRing component | Frontend | Pending |
| ChangeStatusModal | Frontend | Pending |
| API: PATCH /admin/.../tenants/:id/status | Backend | Pending |

### Phase 4: Delete Flow (Week 4)

| Task | Owner | Status |
|------|-------|--------|
| DeleteConfirmationFlow (multi-step) | Frontend | Pending |
| Edge function: delete-tenant-data | Backend | Pending |
| Pre-delete hooks (storage files, audit archive) | Backend | Pending |
| API: DELETE /admin/.../tenants/:id/data | Backend | Pending |
| Deletion logging (t_tenant_deletion_log) | Backend | Pending |

### Phase 5: Tenant Owner Flow (Week 5)

| Task | Owner | Status |
|------|-------|--------|
| CloseAccountSection component | Frontend | Pending |
| FeedbackForm component | Frontend | Pending |
| Integrate into business-profile page | Frontend | Pending |
| API: POST /tenants/:id/close | Backend | Pending |
| API: POST /tenants/:id/feedback | Backend | Pending |

### Phase 6: Polish & Testing (Week 6)

| Task | Owner | Status |
|------|-------|--------|
| Animation refinements | Frontend | Pending |
| Dark mode testing | Frontend | Pending |
| E2E tests for admin flow | QA | Pending |
| E2E tests for owner flow | QA | Pending |
| Performance optimization | Both | Pending |
| Documentation | Both | Pending |

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Badge components render correctly for all states
- Data calculations (tenant type, percentages)
- Registry functions (getOrderedTablesForDeletion)
- API validators

### 10.2 Integration Tests

- Admin list endpoint with various filters
- Data summary endpoint accuracy
- Delete endpoint transaction handling
- Cascade deletion verification

### 10.3 E2E Tests

| Scenario | Steps |
|----------|-------|
| Admin views dashboard | Login as admin → Navigate to subscription management → Verify stats load |
| Admin filters tenants | Apply status filter → Verify filtered results |
| Admin views tenant detail | Click tenant card → Verify drawer opens with data |
| Admin changes status | Open status modal → Select new status → Confirm → Verify change |
| Admin deletes data | Click delete → Go through steps → Type confirmation → Verify deletion |
| Owner closes account | Navigate to settings → Scroll to close account → Complete flow |

### 10.4 Data Integrity Tests

```sql
-- After deletion, verify no orphaned records
SELECT 'FAIL: Orphan contacts' WHERE EXISTS (
  SELECT 1 FROM t_contacts WHERE tenant_id = 'deleted-tenant-id'
);

SELECT 'FAIL: Orphan files' WHERE EXISTS (
  SELECT 1 FROM t_tenant_files WHERE tenant_id = 'deleted-tenant-id'
);

-- ... for all tables in registry
```

---

## Appendix A: Feedback Categories

| ID | Label | Value |
|----|-------|-------|
| 1 | Found better alternative | `better_alternative` |
| 2 | Pricing doesn't fit budget | `pricing` |
| 3 | Not using enough | `not_using` |
| 4 | Missing features | `missing_features` |
| 5 | Technical issues | `technical_issues` |
| 6 | Just testing | `testing` |
| 7 | Other | `other` |

---

## Appendix B: Status Transitions

### Tenant Status

```
            ┌──────────────┐
            │   ACTIVE     │
            └──────┬───────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │INACTIVE │ │SUSPENDED│ │ CLOSED  │
    └────┬────┘ └────┬────┘ └─────────┘
         │           │          ▲
         └─────┬─────┘          │
               │                │
               ▼                │
         ┌─────────┐            │
         │ ACTIVE  │ ───────────┘
         └─────────┘     (cannot reactivate closed)
```

### Subscription Status

```
    ┌─────────┐
    │  TRIAL  │
    └────┬────┘
         │
         ▼
    ┌─────────────┐     ┌──────────────┐
    │   ACTIVE    │◄───►│ GRACE_PERIOD │
    └──────┬──────┘     └──────┬───────┘
           │                   │
           ▼                   ▼
    ┌─────────────┐     ┌──────────────┐
    │ CANCELLED   │     │  SUSPENDED   │
    └─────────────┘     └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   EXPIRED    │
                        └──────────────┘
```

---

## Appendix C: Color Palette

| Category | Color | Hex | Usage |
|----------|-------|-----|-------|
| Contacts | Blue | #3B82F6 | Badges, progress bars |
| Users | Purple | #8B5CF6 | Badges, progress bars |
| Contracts | Green | #10B981 | Badges, progress bars |
| Catalog | Amber | #F59E0B | Badges, progress bars |
| Settings | Indigo | #6366F1 | Badges, progress bars |
| Subscription | Pink | #EC4899 | Badges, progress bars |
| System | Slate | #64748B | Badges, progress bars |
| Success | Emerald | #059669 | Active states |
| Warning | Amber | #D97706 | Trial, expiring |
| Danger | Red | #DC2626 | Suspended, delete |

---

**End of PRD**

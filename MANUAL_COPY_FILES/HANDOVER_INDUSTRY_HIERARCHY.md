# Industry Hierarchy Feature - Complete Handover Document

> **Status**: READY FOR DEPLOYMENT (Phases 1-3 Complete, Phase 4 UI Pending)
> **Last Updated**: January 2025
> **Risk Level**: LOW (backward compatible, all new params optional)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Business Requirement](#2-business-requirement)
3. [Technical Architecture](#3-technical-architecture)
4. [Files & Locations](#4-files--locations)
5. [Deployment Guide](#5-deployment-guide)
6. [API Reference](#6-api-reference)
7. [Database Schema](#7-database-schema)
8. [Testing Checklist](#8-testing-checklist)
9. [Phase 4 UI Implementation](#9-phase-4-ui-implementation)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Rollback Plan](#11-rollback-plan)

---

## 1. Executive Summary

### What This Feature Does
Transforms the flat industry selection into a **two-level hierarchy**:
- **Level 0 (Parent Segments)**: Broad industry categories (e.g., Healthcare, Technology)
- **Level 1 (Sub-Segments)**: Specific niches under each parent (e.g., Healthcare → Dental Clinics, Psychologist)

### User Experience
1. User selects ONE parent industry (mandatory)
2. User selects ONE or MORE sub-segments under that parent
3. Selection is stored per-tenant with multi-select support

### Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database Migrations | ✅ CODE COMPLETE |
| Phase 2 | Edge Function | ✅ CODE COMPLETE |
| Phase 3 | API Layer | ✅ CODE COMPLETE |
| Phase 4 | UI Components | ❌ NOT STARTED |

---

## 2. Business Requirement

### Current State (Flat)
```
Industries (15 total):
├── Healthcare
├── Technology
├── Financial Services
├── Education
├── ... (15 flat options)
```

### Target State (Hierarchical)
```
Industries (21 parents + ~45 sub-segments):
├── Healthcare (level 0)
│   ├── General Healthcare (level 1)
│   ├── Dental Surgeon (level 1)
│   ├── Psychologist (level 1)
│   └── Healthcare & Medical Devices (level 1)
├── Financial Services (level 0)
│   ├── Life Insurance (level 1)
│   ├── Health Insurance (level 1)
│   ├── Investment Advisory (level 1)
│   └── ... (8 sub-segments)
├── Technology (level 0)
│   ├── Digital Marketing (level 1)
│   ├── IT Consulting (level 1)
│   ├── Cyber Security (level 1)
│   └── ... (6 sub-segments)
└── ... (more parents with sub-segments)
```

### New Parent Industries Added
| ID | Name |
|----|------|
| `agriculture` | Agriculture |
| `legal_professional` | Legal & Professional Services |
| `arts_media` | Arts & Media |
| `spiritual_religious` | Spiritual & Religious Services |
| `home_services` | Home Services |
| `construction` | Construction |

---

## 3. Technical Architecture

### Data Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Supabase  │ ──► │    Edge     │ ──► │     API     │ ──► │     UI      │
│  Database   │     │  Function   │     │   Layer     │     │ Components  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
 4 Migration         index.ts          3 files             IndustrySelector
   Scripts           updated           updated               (pending)
```

### Database Schema Changes

#### Modified Table: `m_catalog_industries`
```sql
-- NEW COLUMNS ADDED:
parent_id     VARCHAR(50) NULL      -- NULL for parents, references parent.id for sub-segments
level         INTEGER DEFAULT 0     -- 0 = parent, 1 = sub-segment
segment_type  VARCHAR(20)           -- 'segment' or 'sub_segment'
```

#### New Table: `t_tenant_industry_segments`
```sql
CREATE TABLE t_tenant_industry_segments (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,           -- FK to t_tenants
    industry_id     VARCHAR(50) NOT NULL,    -- Parent segment (level 0)
    sub_segment_id  VARCHAR(50) NOT NULL,    -- Sub-segment (level 1)
    is_primary      BOOLEAN DEFAULT false,   -- Primary for display
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
-- Includes RLS policies for multi-tenant security
-- Includes triggers for validation and single-primary enforcement
```

---

## 4. Files & Locations

### Phase 1: Database Migrations
```
MANUAL_COPY_FILES/industry-hierarchy-migration/migrations/
├── 000_run_all_migrations.sql        # Combined script (optional)
├── 001_add_industry_hierarchy_columns.sql   # Adds parent_id, level, segment_type
├── 002_update_existing_industries_as_segments.sql  # Marks existing 15 as level=0
├── 003_insert_sub_segments.sql       # Inserts ~45 sub-segments
└── 004_create_tenant_industry_segments.sql  # Creates tenant selection table + RLS
```

### Phase 2: Edge Function
```
MANUAL_COPY_FILES/industry-hierarchy-edge/
└── contractnest-edge/supabase/functions/product-masterdata/index.ts

    Changes:
    - Added `level` and `parent_id` query parameters
    - Updated getIndustries() with hierarchy filtering
    - Added new getSubSegments() function
    - Response includes `has_children` and `children_count`
```

### Phase 3: API Layer
```
MANUAL_COPY_FILES/industry-hierarchy-api/contractnest-api/src/
├── services/productMasterdataService.ts    # Updated Industry interface, getSubSegments()
├── controllers/productMasterdataController.ts  # Added level/parent_id extraction
└── routes/productMasterdataRoutes.ts       # Added /sub-segments route with Swagger
```

### Phase 4: UI Components (PENDING)
```
contractnest-ui/src/
├── services/serviceURLs.ts                 # Add level/parent_id to IndustryFilters
├── hooks/queries/useProductMasterdata.ts   # Add useSubSegments hook
├── components/tenantprofile/IndustrySelector.tsx  # Major rewrite (two-step dropdown)
└── pages/settings/business-profile/index.tsx      # Integration
```

---

## 5. Deployment Guide

### ⚠️ CRITICAL: Deployment Order Matters!

```
STEP 1: DATABASE ──► STEP 2: EDGE ──► STEP 3: API ──► STEP 4: UI
         ▲
         │
    MUST BE FIRST!
    (Edge/API will fail if columns don't exist)
```

### Step 1: Run Database Migrations

**Option A: Run individually (recommended for first time)**
```sql
-- Run in Supabase SQL Editor, in order:

-- 1. Add hierarchy columns
\i 001_add_industry_hierarchy_columns.sql

-- 2. Mark existing industries as level 0
\i 002_update_existing_industries_as_segments.sql

-- 3. Insert sub-segments
\i 003_insert_sub_segments.sql

-- 4. Create tenant segments table
\i 004_create_tenant_industry_segments.sql
```

**Option B: Run combined script**
```sql
\i 000_run_all_migrations.sql
```

**Verification Queries:**
```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'm_catalog_industries'
AND column_name IN ('parent_id', 'level', 'segment_type');

-- Check parent count (should be ~21)
SELECT COUNT(*) FROM m_catalog_industries WHERE level = 0;

-- Check sub-segment count (should be ~45)
SELECT COUNT(*) FROM m_catalog_industries WHERE level = 1;

-- Check tenant segments table exists
SELECT * FROM information_schema.tables WHERE table_name = 't_tenant_industry_segments';
```

### Step 2: Deploy Edge Function

```bash
# Copy files first
cd "D:\projects\core projects\ContractNest\contractnest-combined"
Copy-Item "MANUAL_COPY_FILES\industry-hierarchy-edge\contractnest-edge\*" -Destination "contractnest-edge\" -Recurse -Force

# Deploy
cd contractnest-edge
supabase functions deploy product-masterdata
```

### Step 3: Deploy API

```bash
# Copy files first
Copy-Item "MANUAL_COPY_FILES\industry-hierarchy-api\contractnest-api\*" -Destination "contractnest-api\" -Recurse -Force

# Deploy (your usual API deployment process)
cd contractnest-api
# npm run build && deploy
```

---

## 6. API Reference

### Existing Endpoint (Enhanced)

**GET `/api/product-masterdata/industries`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | number | 0 = parents only, 1 = sub-segments only |
| `parent_id` | string | Filter sub-segments by parent |
| `is_active` | boolean | Filter by active status |

**Examples:**
```bash
# Get all parent segments
GET /api/product-masterdata/industries?level=0

# Get sub-segments for healthcare
GET /api/product-masterdata/industries?level=1&parent_id=healthcare

# Get all (backward compatible)
GET /api/product-masterdata/industries
```

**Response (with hierarchy info):**
```json
{
  "success": true,
  "data": [
    {
      "id": "healthcare",
      "name": "Healthcare",
      "level": 0,
      "segment_type": "segment",
      "parent_id": null,
      "has_children": true,
      "children_count": 4
    }
  ]
}
```

### New Endpoint

**GET `/api/product-masterdata/sub-segments`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parent_id` | string | Yes | Parent industry ID |

**Example:**
```bash
GET /api/product-masterdata/sub-segments?parent_id=healthcare
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dental_surgeon",
      "name": "Dental Surgeon",
      "description": "Dental clinics, oral surgery, and dental care services",
      "level": 1,
      "segment_type": "sub_segment",
      "parent_id": "healthcare"
    },
    {
      "id": "psychologist",
      "name": "Psychologist",
      ...
    }
  ]
}
```

---

## 7. Database Schema

### m_catalog_industries (Modified)

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(50) | Primary key (e.g., 'healthcare') |
| name | VARCHAR | Display name |
| description | TEXT | Industry description |
| icon | VARCHAR | Lucide icon name |
| common_pricing_rules | JSONB | Industry-specific pricing |
| compliance_requirements | JSONB | Compliance needs |
| is_active | BOOLEAN | Active flag |
| sort_order | INTEGER | Display order |
| **parent_id** | VARCHAR(50) | **NEW** - NULL for parents, FK for children |
| **level** | INTEGER | **NEW** - 0=parent, 1=sub-segment |
| **segment_type** | VARCHAR(20) | **NEW** - 'segment' or 'sub_segment' |

### t_tenant_industry_segments (New)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to t_tenants |
| industry_id | VARCHAR(50) | Parent segment selected |
| sub_segment_id | VARCHAR(50) | Sub-segment selected |
| is_primary | BOOLEAN | Primary for display |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |

**Features:**
- RLS enabled (tenants see only their data)
- Trigger: Only one primary per tenant
- Trigger: Validates sub-segment belongs to industry
- Unique constraint on (tenant_id, sub_segment_id)

---

## 8. Testing Checklist

### Database Tests
```
□ Columns parent_id, level, segment_type exist in m_catalog_industries
□ ~21 parent industries exist (level = 0)
□ ~45 sub-segments exist (level = 1)
□ Each sub-segment has valid parent_id
□ t_tenant_industry_segments table exists
□ RLS policies are active
```

### Edge Function Tests
```
□ GET /industries returns all industries (backward compatible)
□ GET /industries?level=0 returns only parents
□ GET /industries?level=1&parent_id=healthcare returns healthcare sub-segments
□ Response includes has_children and children_count
```

### API Tests
```
□ GET /api/product-masterdata/industries?level=0 returns ~21 parents
□ GET /api/product-masterdata/industries?level=1 returns ~45 sub-segments
□ GET /api/product-masterdata/sub-segments?parent_id=healthcare works
□ Each parent shows correct children_count
```

---

## 9. Phase 4 UI Implementation

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `serviceURLs.ts` | MODIFY | Add `level` and `parent_id` to `IndustryFilters` type |
| `useProductMasterdata.ts` | MODIFY | Add `useSubSegments` hook |
| `IndustrySelector.tsx` | REWRITE | Two-step dropdown (parent → sub-segments) |
| `business-profile/index.tsx` | MODIFY | Integrate new selector |
| Onboarding flow | MODIFY | Integrate new selector |

### IndustrySelector UI Concept
```
┌─────────────────────────────────────────────────┐
│ Select Your Industry                            │
├─────────────────────────────────────────────────┤
│ ▼ Healthcare                          [Selected]│
├─────────────────────────────────────────────────┤
│ Select Sub-Segments (choose 1 or more):         │
│ ┌─────────────────────────────────────────────┐ │
│ │ ☑ Dental Surgeon                            │ │
│ │ ☑ Psychologist                              │ │
│ │ ☐ General Healthcare                        │ │
│ │ ☐ Healthcare & Medical Devices              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### useSubSegments Hook (to be created)
```typescript
export function useSubSegments(parentId: string | null) {
  return useQuery({
    queryKey: ['sub-segments', parentId],
    queryFn: () => productMasterdataService.getSubSegments(parentId!),
    enabled: !!parentId
  });
}
```

### Existing Users Migration
- **Decision**: Existing users keep their current flat industry selection
- **Action Required**: Users should go to EDIT and update their selection
- **No automatic migration needed** - old data remains valid

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| DB migration not run first | HIGH | Edge/API will fail. Always run migrations first |
| Existing API breaks | LOW | All new params are optional; default behavior unchanged |
| TypeScript errors | LOW | Add types to IndustryFilters before UI work |
| Sub-segment validation | LOW | DB trigger validates parent-child relationship |
| RLS issues | LOW | Tested with tenant context setting |

---

## 11. Rollback Plan

### If Issues Occur After Deployment

**Edge Function Rollback:**
```bash
# Revert to previous version
cd contractnest-edge
git checkout HEAD~1 -- supabase/functions/product-masterdata/index.ts
supabase functions deploy product-masterdata
```

**API Rollback:**
```bash
# Revert files
cd contractnest-api
git checkout HEAD~1 -- src/services/productMasterdataService.ts
git checkout HEAD~1 -- src/controllers/productMasterdataController.ts
git checkout HEAD~1 -- src/routes/productMasterdataRoutes.ts
# Redeploy
```

**Database Rollback (if needed):**
```sql
-- Remove new columns (CAUTION: data loss)
ALTER TABLE m_catalog_industries
DROP COLUMN IF EXISTS parent_id,
DROP COLUMN IF EXISTS level,
DROP COLUMN IF EXISTS segment_type;

-- Drop new table
DROP TABLE IF EXISTS t_tenant_industry_segments;

-- Delete new parent industries
DELETE FROM m_catalog_industries
WHERE id IN ('agriculture', 'legal_professional', 'arts_media',
             'spiritual_religious', 'home_services', 'construction');
```

---

## Quick Reference Commands

```powershell
# Pull latest
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git pull origin claude/init-submodules-review-Nkfws

# Copy migration files
Copy-Item "MANUAL_COPY_FILES\industry-hierarchy-migration\*" -Destination "path\to\run\" -Recurse

# Copy edge files
Copy-Item "MANUAL_COPY_FILES\industry-hierarchy-edge\contractnest-edge\*" -Destination "contractnest-edge\" -Recurse -Force

# Copy API files
Copy-Item "MANUAL_COPY_FILES\industry-hierarchy-api\contractnest-api\*" -Destination "contractnest-api\" -Recurse -Force

# Deploy edge
cd contractnest-edge
supabase functions deploy product-masterdata
```

---

**Document End**

*This handover document provides all information needed to deploy and complete the Industry Hierarchy feature.*

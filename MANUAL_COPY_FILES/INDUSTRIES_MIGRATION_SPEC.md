# Industries Migration Specification

## Feature Overview
Migrate industries data source from UI constants file to database table `m_catalog_industries`.

---

## Current State (Before Migration)

### Data Source
- **File**: `contractnest-ui/src/utils/constants/industries.ts`
- **Type**: Static TypeScript array
- **Count**: 20 industries hardcoded

### Components Using Industries
| Component | File Path | Usage |
|-----------|-----------|-------|
| IndustrySelector | `src/components/tenantprofile/IndustrySelector.tsx` | Onboarding & Edit Profile |
| TenantProfileView | `src/components/tenantprofile/TenantProfileView.tsx` | Display profile |
| BusinessProfilePage | `src/pages/settings/business-profile/index.tsx` | Settings view |

### Current Import Pattern
```typescript
import { industries } from '@/utils/constants/industries';
```

---

## Target State (After Migration)

### Data Source
- **Table**: `m_catalog_industries`
- **API Endpoint**: `/api/product-masterdata/industries`
- **Edge Function**: `product-masterdata` with `/industries` path handler

### Database Table Structure
```sql
CREATE TABLE m_catalog_industries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,              -- Lucide icon name
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### New Import Pattern
```typescript
import { useIndustries } from '@/hooks/queries/useProductMasterdata';

// Usage
const { data: industriesResponse, isLoading, error } = useIndustries();
const industries = industriesResponse?.data || [];
```

---

## API Flow

```
UI Component
    ↓
useIndustries() hook (useProductMasterdata.ts)
    ↓
/api/product-masterdata/industries (API layer)
    ↓
Edge Function: product-masterdata
    ↓
getIndustries() function
    ↓
SELECT * FROM m_catalog_industries
```

---

## Files Requiring Changes

### 1. IndustrySelector.tsx
**Path**: `src/components/tenantprofile/IndustrySelector.tsx`

**Changes Required**:
- Replace: `import { industries } from '@/utils/constants/industries'`
- With: `import { useIndustries } from '@/hooks/queries/useProductMasterdata'`
- Add hook call: `const { data: industriesResponse, isLoading, error } = useIndustries()`
- Extract data: `const industries = industriesResponse?.data || []`
- Add loading state UI
- Add error state UI with retry
- Update field access: `is_active` instead of `isActive`

### 2. TenantProfileView.tsx
**Path**: `src/components/tenantprofile/TenantProfileView.tsx`

**Changes Required**:
- Replace: `import { industries } from '@/utils/constants/industries'`
- With: `import { useIndustries } from '@/hooks/queries/useProductMasterdata'`
- Add hook call in component
- Update industry lookup to use fetched data

### 3. BusinessProfilePage (index.tsx)
**Path**: `src/pages/settings/business-profile/index.tsx`

**Changes Required**:
- Replace: `import { industries } from '@/utils/constants/industries'`
- With: `import { useIndustries } from '@/hooks/queries/useProductMasterdata'`
- Add hook call in component
- Update industry lookup to use fetched data

---

## Gap Analysis

### Existing Infrastructure (Already Available)

| Component | Status | Details |
|-----------|--------|---------|
| Database Table | ✅ Exists | `m_catalog_industries` with data |
| Edge Function | ✅ Exists | `getIndustries()` in product-masterdata |
| API Endpoint | ✅ Exists | `/api/product-masterdata/industries` |
| React Query Hook | ✅ Exists | `useIndustries()` in useProductMasterdata.ts |
| RLS Policies | ✅ Fixed | User confirmed RLS is working |

### Changes Required (To Be Done)

| Component | Status | Action |
|-----------|--------|--------|
| IndustrySelector.tsx | ❌ Pending | Update imports and add hook |
| TenantProfileView.tsx | ❌ Pending | Update imports and add hook |
| BusinessProfilePage | ❌ Pending | Update imports and add hook |

---

## Data Field Mapping

| Constants File | Database Table | Notes |
|----------------|----------------|-------|
| `id` | `id` | Same |
| `name` | `name` | Same |
| `description` | `description` | Same |
| `icon` | `icon` | Lucide icon name |
| `isActive` | `is_active` | Case difference |
| `sortOrder` | `sort_order` | Case difference |

---

## Hook Comparison

### Wrong Hook (useMasterDataQueries.ts)
```typescript
// This hook requires auth context
export const useIndustries = () => {
  const masterDataQuery = useServiceCatalogMasterData();
  // enabled: !!user?.token && !!currentTenant?.id
  // ❌ Won't work during onboarding or if auth context not ready
};
```

### Correct Hook (useProductMasterdata.ts)
```typescript
// This hook works without auth requirement
export const useIndustries = (filters: IndustryFilters = {}) => {
  return useQuery({
    queryKey: productMasterdataKeys.industries(filters),
    queryFn: async (): Promise<IndustryResponse> => {
      const url = buildIndustriesURL(filters);
      const response = await api.get(url);
      return response.data;
    },
    // ✅ No enabled condition - works in all contexts
  });
};
```

---

## Response Structure

### API Response
```json
{
  "success": true,
  "data": [
    {
      "id": "technology",
      "name": "Technology",
      "description": "IT companies, software firms",
      "icon": "Cpu",
      "is_active": true,
      "sort_order": 1
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_records": 15
  }
}
```

### Hook Usage
```typescript
const { data: industriesResponse, isLoading, error, refetch } = useIndustries();
const industries = industriesResponse?.data || [];
```

---

## Testing Checklist

- [ ] Industries load in IndustrySelector (onboarding)
- [ ] Industries load in IndustrySelector (edit profile)
- [ ] Industry name displays in TenantProfileView
- [ ] Industry name displays in BusinessProfilePage
- [ ] Loading skeleton shows while fetching
- [ ] Error state shows with retry button on failure
- [ ] Search/filter works correctly
- [ ] Icons display correctly from database

---

## Rollback Plan

If issues occur, restore original files:
```powershell
cd contractnest-ui
git checkout -- src/components/tenantprofile/IndustrySelector.tsx
git checkout -- src/components/tenantprofile/TenantProfileView.tsx
git checkout -- src/pages/settings/business-profile/index.tsx
```

This restores the constants-based implementation.

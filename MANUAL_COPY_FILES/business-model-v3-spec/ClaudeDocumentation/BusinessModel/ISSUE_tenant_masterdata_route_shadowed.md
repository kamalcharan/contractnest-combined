---
title: Issue — /tenant-masterdata is unreachable, and the repo copy is stale
project: ContractNest
date: 2026-08-05
severity: High — every tenant LOV lookup via useTenantMasterData silently fails
status: FIXED and deployed 2026-08-05 (product-masterdata v24). See §3.
---

## 1. The bug

`contractnest-edge/supabase/functions/product-masterdata/index.ts` routes on
pathname, in this order:

```js
} else if (pathname.includes('/product-masterdata')) {   // matches FIRST
    getProductMasterData(...)      // queries the GLOBAL m_ tables
} else if (pathname.includes('/tenant-masterdata')) {    // UNREACHABLE
    getTenantMasterData(...)       // queries the TENANT t_ tables
}
```

`productMasterdataService.ts` builds the tenant URL as:

```js
this.edgeFunctionUrl = supabaseUrl + '/functions/v1/product-masterdata';
const url = `${this.edgeFunctionUrl}/tenant-masterdata?...`;
```

so the pathname is `/functions/v1/product-masterdata/tenant-masterdata`, which
**contains `/product-masterdata`**. The generic branch always wins.

**Consequence:** every call to `useTenantMasterData(categoryName)` is answered
from the global `m_` tables. Any category that exists only per-tenant returns
`success: false, "not found"`, which the hook turns into an empty array. Callers
see "no data" rather than an error, so it fails silently.

The file already warns about exactly this class of bug:

> `// IMPORTANT: Check specific sub-routes BEFORE generic /product-masterdata`
> `// Otherwise /product-masterdata/industries matches /product-masterdata first!`

The guard was applied to `/industries`, `/all-categories`,
`/industry-categories`, `/all-global-categories` and `/all-tenant-categories` —
`/tenant-masterdata` was simply missed.

### How it surfaced

The metering step's channel picker showed "No active notification channels
found". The LOV was verified correct in the database: the
`notification_channels` category is active for the platform tenant with 2 active
detail rows. Only the route was wrong.

## 2. The fix

Move the `/tenant-masterdata` branch **above** the `/product-masterdata` branch.
Nothing else changes.

Verified safe — no new shadowing is introduced:

| Call | pathname | contains `/tenant-masterdata`? | Resolves to |
|---|---|---|---|
| Global | `…/product-masterdata/product-masterdata` | no | global branch ✓ |
| Tenant | `…/product-masterdata/tenant-masterdata` | **yes** | tenant branch ✓ |
| Categories | `…/product-masterdata/all-tenant-categories` | no | its own branch ✓ |

## 3. RESOLVED — deployed as product-masterdata v24

The reorder was applied by patching the **deployed** source rather than the repo
copy, and redeployed via MCP. Verified after deploy by fetching the function back:

| Check | Result |
|---|---|
| `/tenant-masterdata` now before `/product-masterdata` | ✅ |
| `const level` / `const parentId` extraction | ✅ preserved |
| `getIndustries(…, search, level, parentId)` — 7 args | ✅ preserved |
| Hierarchy filters `.eq('level')`, `.eq('parent_id')` | ✅ preserved |
| `_shared/cors.ts` | ✅ unchanged |

`useTenantMasterData` now works for every tenant category. The temporary
`useNotificationChannels` hook has been deleted and `MeteringStep` uses
`useTenantMasterData('notification_channels', true)` as originally intended.

### Repo is still stale — resync separately

Starting from the deployed source meant no regression, but the repo copy remains
behind by the industry-hierarchy work:

**The deployed function is NEWER than the repo copy.** Deploying the repo file,
even with the fix applied, would regress live behaviour:

| | Deployed | Repo |
|---|---|---|
| `getIndustries` signature | `(supabase, isActive, page, limit, search, level, parentId)` | `(supabase, isActive, page, limit, search)` |
| `const level = url.searchParams.get('level')` | present | **absent** |
| `const parentId = url.searchParams.get('parent_id')` | present | **absent** |
| Industry hierarchy filters (`.eq('level')`, `.eq('parent_id')`) | present | **absent** |

Someone added industry-hierarchy support directly to the deployed function and
it was never committed back. `supabase functions deploy product-masterdata` from
a clean checkout would drop it.

### Resync the repo

```bash
supabase functions download product-masterdata --project-ref uwyqhzotluikawcboldr
# review the diff — expect the level/parentId hierarchy work to appear
git add supabase/functions/product-masterdata/index.ts
git commit -m "chore: resync product-masterdata edge fn with deployed version"
```

Worth checking whether other edge functions have drifted the same way. `cat-blocks`
was verified byte-identical, so the drift is not universal — but it is not
nothing either.

## 4. Workaround removed

An interim `useNotificationChannels` hook briefly routed around this via
`/api/masterdata/*`. With the root cause fixed it was deleted rather than left in
place — a workaround that outlives its bug becomes the next person's confusion.

## 5. Blast radius

Any feature reaching for tenant LOV through `useTenantMasterData` is affected and
will fail silently with empty data. Worth grepping for callers before assuming
this only affected the metering step.

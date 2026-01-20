# ContractNest Idempotency Framework

> **Purpose**: Guide for using the existing idempotency framework across Edge, API, and UI layers
> **Last Updated**: January 2026
> **Status**: Production Ready

---

## Overview

Idempotency ensures that repeated requests with the same idempotency key return the same response without creating duplicate resources. ContractNest uses a **database-backed idempotency system** with a 15-minute TTL.

---

## Architecture

```
┌─────────────┐    x-idempotency-key    ┌─────────────┐    x-idempotency-key    ┌─────────────┐
│     UI      │ ───────────────────────▶│     API     │ ───────────────────────▶│    Edge     │
│             │                         │             │                         │             │
│ Generates   │                         │ Validates   │                         │ Checks DB   │
│ UUID key    │                         │ key present │                         │ Returns     │
│             │                         │             │                         │ cached or   │
│             │                         │             │                         │ stores new  │
└─────────────┘                         └─────────────┘                         └─────────────┘
                                                                                      │
                                                                                      ▼
                                                                              ┌─────────────┐
                                                                              │ Supabase DB │
                                                                              │             │
                                                                              │ t_idempotency_cache
                                                                              │ - idempotency_key
                                                                              │ - tenant_id
                                                                              │ - response_data
                                                                              │ - expires_at
                                                                              └─────────────┘
```

---

## Database Schema

### Table: `t_idempotency_cache`

| Column | Type | Description |
|--------|------|-------------|
| `idempotency_key` | VARCHAR(255) | UUID key from client |
| `tenant_id` | UUID | Tenant isolation |
| `response_data` | JSONB | Cached response |
| `created_at` | TIMESTAMPTZ | Creation time |
| `expires_at` | TIMESTAMPTZ | Expiration (15 min TTL) |

**Primary Key**: (`idempotency_key`, `tenant_id`)

### RPC Functions (Use These!)

| RPC | Parameters | Returns | Purpose |
|-----|------------|---------|---------|
| `get_idempotency_response` | `p_tenant_id`, `p_idempotency_key` | `JSONB` or `NULL` | Check for cached response |
| `set_idempotency_response` | `p_tenant_id`, `p_idempotency_key`, `p_response_data`, `p_ttl_minutes` | `void` | Store response |

---

## UI Layer Implementation

### Location: `contractnest-ui/src/services/api.ts`

### Key Functions

```typescript
// Generate UUID v4 idempotency key
export const generateIdempotencyKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// POST with idempotency
export const postWithIdempotency = async <T>(
  url: string,
  data?: any,
  idempotencyKey?: string,
  config?: AxiosRequestConfig
): Promise<T>;

// PUT with idempotency
export const putWithIdempotency = async <T>(
  url: string,
  data?: any,
  idempotencyKey?: string,
  config?: AxiosRequestConfig
): Promise<T>;

// PATCH with idempotency
export const patchWithIdempotency = async <T>(
  url: string,
  data?: any,
  idempotencyKey?: string,
  config?: AxiosRequestConfig
): Promise<T>;
```

### Usage in Mutations

```typescript
// In useCatBlocksMutations.ts
import { postWithIdempotency, generateIdempotencyKey } from '@/services/api';

const createBlock = async (blockData: CreateBlockData) => {
  const idempotencyKey = generateIdempotencyKey();
  console.log('📌 Idempotency key:', idempotencyKey);

  return postWithIdempotency(
    '/api/catalog-studio/blocks',
    blockData,
    idempotencyKey
  );
};
```

---

## API Layer Implementation

### Location: `contractnest-api/src/middleware/requestContext.ts`

### Middleware

```typescript
// Extract idempotency key from header
export function requestContextMiddleware(req, res, next) {
  req.context = {
    authToken,
    tenantId,
    idempotencyKey: req.headers['x-idempotency-key'],
    // ...
  };
  next();
}

// Require idempotency key for mutations
export function requireIdempotencyKey(req, res, next) {
  if (!req.context?.idempotencyKey) {
    return res.status(400).json({
      error: 'x-idempotency-key header is required for this operation',
      code: 'BAD_REQUEST'
    });
  }
  next();
}
```

### Route Configuration

```typescript
// In catalogStudioRoutes.ts
router.post('/blocks',
  requestContextMiddleware,
  requireIdempotencyKey,        // ← Require idempotency
  createBlockValidation,
  handleValidationErrors,
  catalogStudioController.createBlock
);

router.patch('/blocks/:id',
  requestContextMiddleware,
  requireIdempotencyKey,        // ← Require idempotency
  updateBlockValidation,
  handleValidationErrors,
  catalogStudioController.updateBlock
);
```

### Forward to Edge

```typescript
// In buildEdgeHeaders
export function buildEdgeHeaders(context: RequestContext): Record<string, string> {
  const headers = {
    'Authorization': context.authToken,
    'x-tenant-id': context.tenantId,
    'Content-Type': 'application/json'
  };

  if (context.idempotencyKey) {
    headers['x-idempotency-key'] = context.idempotencyKey;
  }

  return headers;
}
```

---

## Edge Layer Implementation

### Location: `contractnest-edge/supabase/functions/_shared/edgeUtils.ts`

### Check for Cached Response

```typescript
export async function checkIdempotency(
  supabase: any,
  idempotencyKey: string | null,
  tenantId: string,
  operationId: string,
  startTime: number
): Promise<IdempotencyResult> {
  if (!idempotencyKey) {
    return { found: false };
  }

  const { data: cachedResponse, error } = await supabase.rpc('get_idempotency_response', {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey
  });

  if (cachedResponse) {
    console.log(`Idempotency HIT for key: ${idempotencyKey}`);
    return {
      found: true,
      response: new Response(JSON.stringify({
        ...cachedResponse,
        metadata: { idempotency_hit: true }
      }), { status: 200, headers: corsHeaders })
    };
  }

  return { found: false };
}
```

### Store Response

```typescript
export async function storeIdempotency(
  supabase: any,
  idempotencyKey: string | null,
  tenantId: string,
  responseBody: any
): Promise<void> {
  if (!idempotencyKey) return;

  await supabase.rpc('set_idempotency_response', {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_response_data: responseBody,
    p_ttl_minutes: 15  // 15-minute TTL
  });
}
```

### Usage Pattern in Edge Function

```typescript
serve(async (req) => {
  const operationId = generateOperationId('blocks');
  const startTime = Date.now();
  const idempotencyKey = req.headers.get('x-idempotency-key');

  // For POST/PATCH operations, check idempotency first
  if (req.method === 'POST' || req.method === 'PATCH') {
    const cached = await checkIdempotency(
      supabase,
      idempotencyKey,
      tenantId,
      operationId,
      startTime
    );

    if (cached.found) {
      return cached.response;  // Return cached response
    }
  }

  // ... perform operation ...

  // Store successful response
  await storeIdempotency(supabase, idempotencyKey, tenantId, responseBody);

  return createSuccessResponse(responseBody, operationId, startTime, 201);
});
```

---

## Alternative: Direct Table Access

For Edge functions that don't have RPC access, use direct table queries:

```typescript
// Check idempotency
async function checkIdempotency(supabase, idempotencyKey, tenantId) {
  const { data, error } = await supabase
    .from('t_idempotency_cache')
    .select('response_data, expires_at')
    .eq('idempotency_key', idempotencyKey)
    .eq('tenant_id', tenantId)
    .single();

  if (!data) return { exists: false };

  // Check expiration
  if (Date.now() > new Date(data.expires_at).getTime()) {
    await supabase
      .from('t_idempotency_cache')
      .delete()
      .eq('idempotency_key', idempotencyKey)
      .eq('tenant_id', tenantId);
    return { exists: false };
  }

  return { exists: true, response: data.response_data };
}

// Save idempotency
async function saveIdempotency(supabase, idempotencyKey, tenantId, responseData) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase
    .from('t_idempotency_cache')
    .upsert({
      idempotency_key: idempotencyKey,
      tenant_id: tenantId,
      response_data: responseData,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    }, {
      onConflict: 'idempotency_key,tenant_id'
    });
}
```

---

## Best Practices

### DO

- Generate UUID keys on the client side
- Include idempotency keys for ALL POST/PATCH/PUT operations
- Log idempotency keys for debugging
- Handle cached responses gracefully in UI
- Use the existing RPC functions when available

### DON'T

- Don't reuse idempotency keys for different operations
- Don't use sequential IDs as idempotency keys
- Don't skip idempotency for financial/critical operations
- Don't rely on idempotency alone for concurrent access (use optimistic locking too)

---

## TTL and Cleanup

- **TTL**: 15 minutes (configurable via `p_ttl_minutes`)
- **Cleanup**: Automatic via `expires_at` check
- **Manual cleanup**: DELETE WHERE `expires_at < NOW()`

---

## Monitoring

### Logging

```
[edgeUtils] Idempotency HIT for key: abc123-...
[edgeUtils] Stored idempotency for key: abc123-...
[API] POST /blocks | idempotency: yes
```

### Network Tab Verification

Check for `x-idempotency-key` header in:
- POST requests
- PATCH requests
- PUT requests

---

## Error Codes

| Error | Status | Description |
|-------|--------|-------------|
| `BAD_REQUEST` | 400 | Missing idempotency key when required |
| `IDEMPOTENCY_CONFLICT` | 409 | Key already used with different payload |

---

## File Locations

| Layer | File | Purpose |
|-------|------|---------|
| UI | `src/services/api.ts` | `generateIdempotencyKey`, `postWithIdempotency`, etc. |
| API | `src/middleware/requestContext.ts` | `requireIdempotencyKey` middleware |
| Edge | `supabase/functions/_shared/edgeUtils.ts` | `checkIdempotency`, `storeIdempotency` |
| DB | `t_idempotency_cache` | Storage table |
| DB | `get_idempotency_response` | RPC to check |
| DB | `set_idempotency_response` | RPC to store |

---

**End of Idempotency Framework Guide**

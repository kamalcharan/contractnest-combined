# Scale Patterns - Supporting 500-600 Parallel Users

## 🎯 Core Principle
**Scaling is NOT about faster code — it's about LESS WORK per request**

```
600 users × 10 requests/min = 6,000 requests/min = 100 requests/sec
```

Every optimization must reduce total work, not just speed up individual operations.

---

## 1️⃣ Connection Pooling (MANDATORY)

### ❌ WRONG: Per-Request Connections
```typescript
// FORBIDDEN - Will collapse at scale
export async function handler(req: Request) {
  const client = new Client(connectionString);  // ❌ New connection per request
  await client.connect();
  const result = await client.query('SELECT ...');
  await client.end();
  return result;
}
```

### ✅ CORRECT: PgBouncer + Pool
```typescript
// Use connection pool - connections are reused
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Max 20-50 connections total
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function handler(req: Request) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT ...');
    return result;
  } finally {
    client.release();  // Return to pool, don't close
  }
}
```

### PgBouncer Configuration
```ini
# pgbouncer.ini
[databases]
contractnest = host=localhost dbname=contractnest

[pgbouncer]
pool_mode = transaction          # ← MUST be transaction mode
max_client_conn = 1000
default_pool_size = 20           # ← 20-50 connections to Postgres
reserve_pool_size = 5
reserve_pool_timeout = 3
```

### Connection Math
```
Postgres max_connections = 100 (typical)
PgBouncer pool = 20-50
Application instances = 2-4

Available per instance = 100 / 4 = 25 connections
Buffer for admin/migrations = 5
Usable connections = 20 per instance ✅
```

---

## 2️⃣ Caching Hot Reads (10-30 Second TTL)

### Cache These (High Hit Rate)
| Data | TTL | Why |
|------|-----|-----|
| Contact lists | 10-30s | Frequently viewed, rarely changes |
| Lookup tables | 60s | Almost never changes |
| Config/settings | 60s | Changes are rare |
| Permissions | 30s | Checked on every request |
| Dashboard stats | 30s | Expensive to compute |

### ❌ WRONG: No Cache
```typescript
// FORBIDDEN - 600 users = 600 identical DB calls
export async function getContacts(tenantId: string) {
  // Every request hits DB
  return await supabase.rpc('get_contacts_list', { p_tenant_id: tenantId });
}
```

### ✅ CORRECT: Cache with TTL
```typescript
// In-memory cache (simple)
const cache = new Map<string, { data: any; expires: number }>();

export async function getContacts(tenantId: string, limit = 50, offset = 0) {
  const cacheKey = `contacts:${tenantId}:${limit}:${offset}`;
  const cached = cache.get(cacheKey);
  
  // Return cached if valid
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  // Fetch from DB
  const { data } = await supabase.rpc('get_contacts_list', {
    p_tenant_id: tenantId,
    p_limit: limit,
    p_offset: offset
  });
  
  // Cache for 15 seconds
  cache.set(cacheKey, {
    data,
    expires: Date.now() + 15_000  // 15 second TTL
  });
  
  return data;
}
```

### ✅ CORRECT: Redis Cache (Production)
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function getContacts(tenantId: string, limit = 50, offset = 0) {
  const cacheKey = `contacts:${tenantId}:${limit}:${offset}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const { data } = await supabase.rpc('get_contacts_list', {
    p_tenant_id: tenantId,
    p_limit: limit,
    p_offset: offset
  });
  
  // Cache with 15s expiry
  await redis.setex(cacheKey, 15, JSON.stringify(data));
  
  return data;
}
```

### Cache Invalidation
```typescript
// Invalidate on write
export async function createContact(tenantId: string, data: ContactInput) {
  const result = await supabase.rpc('create_contact', { ...data });
  
  // Clear list cache for this tenant
  const pattern = `contacts:${tenantId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  return result;
}
```

### Cache Impact
```
WITHOUT cache: 600 users × 10 req/min = 6,000 DB calls/min
WITH 15s cache: ~40 DB calls/min (150x reduction)
```

---

## 3️⃣ Index Requirements

### Always Index These Columns
```sql
-- Every table needs these indexes
CREATE INDEX idx_[table]_tenant_id ON [table](tenant_id);
CREATE INDEX idx_[table]_created_at ON [table](created_at DESC);

-- For soft deletes
CREATE INDEX idx_[table]_tenant_active ON [table](tenant_id) 
  WHERE deleted_at IS NULL;
```

### Index for Common Queries
```sql
-- Contacts table example
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_tenant_created ON contacts(tenant_id, created_at DESC);
CREATE INDEX idx_contacts_tenant_status ON contacts(tenant_id, status);
CREATE INDEX idx_contacts_tenant_search ON contacts(tenant_id, name varchar_pattern_ops);

-- For full-text search
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin(name gin_trgm_ops);
```

### Check Missing Indexes
```sql
-- Find slow queries without indexes
SELECT 
  schemaname, tablename, 
  seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan  -- More seq scans than index scans = problem
ORDER BY seq_tup_read DESC;
```

### ❌ WRONG: Query Without Index
```sql
-- SLOW - Full table scan
SELECT * FROM contacts 
WHERE email = 'test@example.com';  -- No index on email
```

### ✅ CORRECT: Query With Index
```sql
-- First, create index
CREATE INDEX idx_contacts_email ON contacts(email);

-- Now fast
SELECT * FROM contacts 
WHERE email = 'test@example.com';  -- Uses index
```

---

## 4️⃣ Pagination (MANDATORY)

### ❌ WRONG: Unbounded Query
```sql
-- FORBIDDEN - Could return 100K+ rows
SELECT * FROM contacts WHERE tenant_id = $1;
```

### ✅ CORRECT: Always Paginate
```sql
-- Every list query MUST have LIMIT + OFFSET
SELECT * FROM contacts 
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;  -- Always present
```

### Pagination Limits
```typescript
// API layer - enforce limits
const limit = Math.min(Number(req.query.limit) || 50, 100);  // Max 100
const offset = Number(req.query.offset) || 0;
```

---

## 5️⃣ Async Everything Non-UI

### Request Flow
```
Request → DB Write → 200 OK (immediate)
                ↓
              PGMQ
                ↓
            Workers (async)
                ↓
         AI / Email / Webhooks
```

### ❌ WRONG: Sync Processing
```typescript
// FORBIDDEN - Blocks user for 30+ seconds
export async function createContract(req: Request) {
  const contract = await db.insert('contracts', req.body);
  
  // ❌ All of this blocks the response
  await analyzeContractWithAI(contract);      // 30 seconds
  await sendNotificationEmail(contract);       // 2 seconds
  await updateSearchIndex(contract);           // 1 second
  await triggerWebhooks(contract);             // 3 seconds
  
  return { success: true };  // User waited 36+ seconds
}
```

### ✅ CORRECT: Async via PGMQ
```typescript
export async function createContract(req: Request) {
  const contract = await db.insert('contracts', req.body);
  
  // Fire-and-forget - all async
  await supabase.rpc('pgmq_send', { 
    queue: 'contract_created',
    message: { contract_id: contract.id }
  });
  
  return { success: true };  // User waited < 100ms
}

// Separate worker processes these
// Worker: AI analysis
// Worker: Email notifications  
// Worker: Search indexing
// Worker: Webhooks
```

---

## 6️⃣ PGMQ Role (Very Clear)

### ✅ Use PGMQ For
- AI automation
- Email/SMS notifications
- Workflow triggers
- Webhook delivery
- Background enrichment
- Report generation
- SLA monitoring

### ❌ DO NOT Use PGMQ For
- UI reads
- API responses
- Request routing
- Real-time data

**PGMQ smooths load. It does NOT reduce latency.**

---

## 🚫 Non-Negotiable Guardrails (Print This)

```
❌ No loops in Edge
❌ No RLS on hot reads
❌ No AI in sync path
❌ No unbounded queries
❌ No per-record DB calls (N+1)
❌ No new connections per request

✅ One DB call per request
✅ Async everything non-UI
✅ Cache list APIs (10-30s TTL)
✅ Pool DB connections (20-50 max)
✅ Pagination on all lists
✅ Indexes on all WHERE/ORDER columns
```

---

## ✅ Scale Checklist
Before submitting any code:
- [ ] Single DB call per request?
- [ ] Using connection pool (not per-request)?
- [ ] Hot reads cached with TTL?
- [ ] Cache invalidated on writes?
- [ ] LIMIT + OFFSET on all lists?
- [ ] Indexes exist for query columns?
- [ ] AI/heavy processing via PGMQ?
- [ ] Response time < 100ms expected?

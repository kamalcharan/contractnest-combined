# Production Correctness Patterns

## 🎯 Core Principle
**Correctness is NOT achieved by preventing failures — it's achieved by making failures HARMLESS.**

Race conditions, retries, duplicates, partial failures **WILL** happen.
Your job: ensure they don't corrupt state.

---

## 1️⃣ Race Conditions — Let Database Resolve Them

### Where Race Conditions Occur
| Layer | Source |
|-------|--------|
| UI | Double clicks, multiple tabs |
| API | Parallel requests, retries |
| Edge | Timeouts, replays |
| DB | Concurrent writes |
| MQ | Redelivery |
| Workers | Parallel consumers |
| AI | Slow execution, retries |

### ❌ WRONG: Try to Prevent Races
```typescript
// FORBIDDEN - UI locks, app mutexes, distributed locks
let isProcessing = false;
if (isProcessing) return;  // Race still exists!
isProcessing = true;
```

### ✅ CORRECT: Let Database Resolve
```sql
-- Database constraints resolve races atomically
INSERT INTO api_idempotency(key) VALUES ($1)
ON CONFLICT DO NOTHING;  -- Safe under concurrent execution
```

---

## 2️⃣ Idempotency — The Safety Net

### Definition
**An operation is idempotent if executing it multiple times results in the same final state.**

This is the **single most important property** of scalable systems.

### Why Idempotency is Mandatory
Your system uses: Edge, PGMQ, Workers, AI, Retries, Parallelism
All are **at-least-once** systems.

```
WITHOUT idempotency: retries = corruption, scale = chaos
WITH idempotency:    retries = harmless, scale = boring
```

### Where Idempotency Must Exist
| Layer | Role | Trusted? |
|-------|------|----------|
| UI | Best-effort (disable buttons) | ❌ Never |
| API | Accept idempotency keys | ⚠️ Pass-through |
| Edge | Pass-through idempotency | ⚠️ Pass-through |
| **DB** | **Enforce uniqueness** | ✅ **Authoritative** |
| MQ | At-least-once delivery | ❌ Assumes duplicates |
| Workers | Must handle duplicates | ❌ Must be idempotent |

### Key Rule
**Idempotency belongs where state lives — in the database.**

---

## 3️⃣ Transaction Management

### Rules
| Rule | Description |
|------|-------------|
| **One transaction = one business outcome** | Single state transition, single invariant |
| **Transactions must be short** | Long = locks = blocked parallelism = timeouts |
| **Never span transactions across layers** | Each layer commits independently |

### ❌ WRONG: Long Transaction Spanning Layers
```typescript
// FORBIDDEN - This "logical transaction" doesn't exist
await db.beginTransaction();
await createContract();      // DB
await sendEmail();           // External
await triggerWebhook();      // External  
await updateSearchIndex();   // External
await db.commit();           // What if webhook failed?
```

### ✅ CORRECT: Short Transaction + Async Events
```typescript
// DB transaction is SHORT
const contract = await db.transaction(async (tx) => {
  await tx.insert('idempotency_keys', { key: idempotencyKey });
  return await tx.insert('contracts', data);
});

// Side effects are ASYNC (via PGMQ)
await pgmq.send('contract.created.v1', { contract_id: contract.id });
```

---

## 4️⃣ API-Edge Trust Boundary (HMAC Signing)

### Principle
Edge functions **MUST NOT** accept direct requests.
All requests **MUST** come through API layer with HMAC signature.

### API Layer: Sign Requests
```typescript
// api/services/edgeClient.ts
import crypto from 'crypto';

export class EdgeClient {
  private readonly internalSecret: string;
  
  constructor() {
    this.internalSecret = process.env.INTERNAL_SIGNING_SECRET || '';
    if (!this.internalSecret) {
      throw new Error('INTERNAL_SIGNING_SECRET is required');
    }
  }

  private generateSignature(body: string, timestamp: string): string {
    const payload = `${timestamp}.${body}`;
    return crypto
      .createHmac('sha256', this.internalSecret)
      .update(payload)
      .digest('base64');
  }

  async callEdge<T>(
    method: string,
    path: string,
    context: { tenantId: string; accessToken: string; isAdmin: boolean },
    body?: any
  ): Promise<T> {
    const requestBody = body ? JSON.stringify(body) : '';
    const timestamp = Date.now().toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${context.accessToken}`,
      'x-tenant-id': context.tenantId,
      'x-is-admin': String(context.isAdmin),
      'x-timestamp': timestamp,
      'x-internal-signature': this.generateSignature(requestBody, timestamp),
    };

    const response = await fetch(`${process.env.EDGE_URL}${path}`, {
      method,
      headers,
      body: body ? requestBody : undefined,
    });

    if (!response.ok) {
      throw new Error(`Edge call failed: ${response.status}`);
    }

    return response.json();
  }
}
```

### Edge Layer: Verify Signature
```typescript
// edge/middleware/verifySignature.ts

async function verifyInternalSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  // Check timestamp within 5 minutes (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    console.warn('Signature timestamp expired');
    return false;
  }

  // Verify HMAC
  const payload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return signature === expectedSignature;
}

// In edge handler - REJECT if not signed
const signature = req.headers.get('x-internal-signature');
const timestamp = req.headers.get('x-timestamp');

if (!signature || !timestamp) {
  return new Response(JSON.stringify({
    error: { code: 'FORBIDDEN', message: 'Direct access not allowed. Use API layer.' }
  }), { status: 403 });
}

const isValid = await verifyInternalSignature(body, signature, timestamp, secret);
if (!isValid) {
  return new Response(JSON.stringify({
    error: { code: 'INVALID_SIGNATURE', message: 'Invalid internal signature' }
  }), { status: 403 });
}
```

---

## 5️⃣ Layer Templates

### UI Template (UX Safety Only)
```typescript
// NOT trusted for correctness
let inFlight = false;

export async function safeAction(fn: () => Promise<void>) {
  if (inFlight) return;
  inFlight = true;
  try {
    await fn();
  } finally {
    inFlight = false;
  }
}
```

### API Template (Intent + Validation)
```typescript
import { z } from 'zod';

export const CreateContractSchema = z.object({
  customer_id: z.string().uuid(),
  plan_id: z.string().uuid(),
});

export async function createContractHandler(req, res) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'idempotency-key header required' });
  }
  
  const body = CreateContractSchema.parse(req.body);
  
  // Pass to Edge with signature
  const result = await edgeClient.callEdge('POST', '/contracts', context, {
    ...body,
    idempotency_key: idempotencyKey,
  });
  
  return res.json(result);
}
```

### Edge Template (Boundary + Route + Emit)
```typescript
export async function handler(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const idempotencyKey = req.headers.get('idempotency-key');

  // Verify signature (see section 4)
  // ...

  // ONE DB call (idempotent)
  const { data, error } = await supabase.rpc('create_contract_v1', {
    p_tenant_id: tenantId,
    p_customer_id: body.customer_id,
    p_plan_id: body.plan_id,
    p_idempotency_key: idempotencyKey,
  });

  if (error) return errorResponse(error);

  // Async event (fire & forget)
  await supabase.rpc('pgmq_send', {
    queue_name: 'contract.events',
    message: JSON.stringify({
      event: 'contract.created.v1',  // Versioned!
      event_id: crypto.randomUUID(),
      contract_id: data.id,
      tenant_id: tenantId,
    }),
  });

  return Response.json(data);
}
```

### Database Template (Truth + Idempotency)
```sql
-- Idempotency tracking table
CREATE TABLE api_idempotency (
  key UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processed events table (for worker idempotency)
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent RPC function
CREATE FUNCTION create_contract_v1(
  p_tenant_id UUID,
  p_customer_id UUID,
  p_plan_id UUID,
  p_idempotency_key UUID
)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_id UUID;
BEGIN
  -- Idempotency guard (atomic)
  INSERT INTO api_idempotency(key)
  VALUES (p_idempotency_key)
  ON CONFLICT DO NOTHING;

  -- If already processed, return existing
  IF NOT FOUND THEN
    SELECT id INTO v_contract_id
    FROM contracts
    WHERE idempotency_key = p_idempotency_key;
    
    RETURN json_build_object('id', v_contract_id, 'was_duplicate', true);
  END IF;

  -- Create contract
  INSERT INTO contracts (tenant_id, customer_id, plan_id, idempotency_key)
  VALUES (p_tenant_id, p_customer_id, p_plan_id, p_idempotency_key)
  RETURNING id INTO v_contract_id;

  RETURN json_build_object('id', v_contract_id, 'was_duplicate', false);
END;
$$;
```

### Worker Template (At-Least-Once Safe)
```typescript
async function handleMessage(msg: QueueMessage) {
  const { event_id, contract_id } = msg;

  // Idempotency guard
  const { rowCount } = await db.query(
    `INSERT INTO processed_events(event_id)
     VALUES ($1)
     ON CONFLICT DO NOTHING`,
    [event_id]
  );

  if (rowCount === 0) {
    console.log(`Event ${event_id} already processed, skipping`);
    return;
  }

  // Safe side effect (guarded update)
  await db.query(
    `UPDATE contracts
     SET ai_processed = true
     WHERE id = $1
       AND ai_processed = false`,  // Guard prevents double-processing
    [contract_id]
  );
}
```

---

## 6️⃣ Critical Concepts Often Missed

### 🔴 Backpressure
```typescript
// Monitor queue depth
const queueDepth = await pgmq.getQueueDepth('contract.events');
if (queueDepth > 10000) {
  // Alert! System falling behind
  // Consider: pause ingestion, scale workers, shed load
}
```

### 🔴 Bounded Work
```typescript
// Everything needs limits
const MAX_RETRIES = 3;
const QUERY_TIMEOUT = 5000;  // 5 seconds
const MAX_BATCH_SIZE = 100;
const QUEUE_MAX_DEPTH = 50000;
```

### 🔴 Observability
```typescript
// Correlation ID across all layers
const traceId = crypto.randomUUID();

// Log at every boundary
console.log({
  trace_id: traceId,
  tenant_id: tenantId,
  event: 'contract.create.start',
  timestamp: new Date().toISOString(),
});

// Pass trace_id in: API → Edge → DB → MQ → Worker
```

### 🔴 Event Versioning
```typescript
// ALWAYS version events
const event = {
  event: 'contract.created.v1',  // ✅ Versioned
  // NOT: 'contract.created'     // ❌ Unversioned
};

// When schema changes:
// - Add contract.created.v2
// - Workers handle both v1 and v2
// - Deprecate v1 after migration
```

### 🔴 Invariant Ownership
```sql
-- Invariants MUST live in DB, not code comments

-- "Only one active contract per customer"
CREATE UNIQUE INDEX idx_one_active_contract 
ON contracts(customer_id) 
WHERE status = 'active';

-- "Only one price per version"
CREATE UNIQUE INDEX idx_one_price_per_version
ON pricing(product_id, version);
```

---

## 🚫 Non-Negotiable Guarantees

Every write MUST be:
- ✅ Transactionally atomic
- ✅ Idempotent
- ✅ Retry-safe
- ✅ Observable (trace_id)

Every Edge call MUST have:
- ✅ HMAC signature from API
- ✅ Timestamp validation (< 5 min)
- ✅ Tenant ID header
- ✅ Idempotency key (for writes)

---

## ✅ Correctness Checklist

Before submitting any code:
- [ ] Idempotency key accepted and enforced?
- [ ] Database guards race conditions?
- [ ] Transaction is SHORT (single outcome)?
- [ ] API-Edge signed with HMAC?
- [ ] Events are versioned (`.v1`, `.v2`)?
- [ ] Workers handle duplicates?
- [ ] trace_id passed across layers?
- [ ] Invariants enforced in DB (not code)?
- [ ] Bounded retries/timeouts?
- [ ] Queue depth monitored?

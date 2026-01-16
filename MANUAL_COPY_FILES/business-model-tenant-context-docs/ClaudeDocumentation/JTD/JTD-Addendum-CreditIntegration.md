# JTD Framework - Credit Integration Addendum

> **Version:** 1.0
> **Created:** January 2025
> **Status:** Design Approved
> **Related:** Business Model PRD, PRD_ADDENDUM_ARCHITECTURE.md Section 10

---

## Table of Contents

1. [Overview](#1-overview)
2. [New Status: no_credits](#2-new-status-no_credits)
3. [TenantContext Integration](#3-tenantcontext-integration)
4. [Credit Check Flow](#4-credit-check-flow)
5. [Release Mechanism](#5-release-mechanism)
6. [Expiry Policy](#6-expiry-policy)
7. [Database Changes](#7-database-changes)
8. [Worker Changes](#8-worker-changes)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Overview

### 1.1 Why This Addendum?

The Business Model Agent introduces **credit-based billing** for notifications. Tenants must have credits to send WhatsApp, SMS, or Email messages. This addendum documents changes to the JTD Framework to support:

1. **Credit gating** - Block notifications when credits are insufficient
2. **Deferred delivery** - Queue messages for later when credits are topped up
3. **Automatic release** - Send blocked messages when credits become available

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Credit check before JTD queue | Credit pricing/topup UI |
| New `no_credits` status | Billing dashboard |
| Release on topup | Payment processing |
| 7-day expiry for blocked JTDs | Credit deduction (already in jtd-worker) |

### 1.3 Key Principle

> JTDs are created regardless of credit availability, but only queued if credits exist.

This ensures:
- Audit trail of all notification attempts
- Messages can be released later when credits are topped up
- User sees "Awaiting credits" status, not a silent failure

---

## 2. New Status: no_credits

### 2.1 Status Definition

| Field | Value |
|-------|-------|
| Code | `no_credits` |
| Name | No Credits |
| Type | `waiting` (new type) |
| Description | Notification blocked due to insufficient credits |
| Is Terminal | `false` (can transition to `pending`) |

### 2.2 Status Flow Update

```
                    ┌──────────────┐
                    │   CREATED    │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        Has Credits?              No Credits?
              │                         │
              ▼                         ▼
       ┌──────────┐              ┌─────────────┐
       │ pending  │              │ no_credits  │ ← NEW
       └────┬─────┘              └──────┬──────┘
            │                          │
            │                    ┌─────┴─────┐
            │                    │           │
            │              User tops up   7 days pass
            │                    │           │
            │                    ▼           ▼
            │             ┌──────────┐  ┌─────────┐
            │             │ pending  │  │ expired │
            │             └────┬─────┘  └─────────┘
            │                  │
            ▼                  ▼
       ┌──────────┐      ┌──────────┐
       │processing│ ◄────│ (queued) │
       └────┬─────┘      └──────────┘
            │
       ┌────┴────┐
       │         │
       ▼         ▼
   ┌──────┐  ┌──────┐
   │ sent │  │failed│
   └──────┘  └──────┘
```

### 2.3 Status Transitions

| From | To | Trigger |
|------|----|---------|
| `created` | `no_credits` | Credit check fails at creation |
| `no_credits` | `pending` | Credits topped up, JTD released |
| `no_credits` | `expired` | 7 days passed without topup |
| `pending` | `processing` | Worker picks up from queue |

---

## 3. TenantContext Integration

### 3.1 Dependency

JTD now depends on **TenantContext** (see PRD_ADDENDUM_ARCHITECTURE.md Section 10) for credit availability flags:

```typescript
interface TenantContext {
  // ... other fields ...

  credits: {
    whatsapp: number;
    sms: number;
    email: number;
    pooled: number;
  };

  flags: {
    can_send_whatsapp: boolean;  // credits.whatsapp + credits.pooled > 0
    can_send_sms: boolean;
    can_send_email: boolean;
    // ... other flags
  };
}
```

### 3.2 Access Pattern

```
JTD Creation Request
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  jtdService.createJTD()                               │
├───────────────────────────────────────────────────────┤
│                                                       │
│  1. Get TenantContext                                 │
│     ctx = await getTenantContext(productCode, tenantId)│
│                                                       │
│  2. Check subscription status                         │
│     if (!ctx.flags.can_access) throw Error            │
│                                                       │
│  3. Determine JTD status based on credits             │
│     hasCredits = channel === 'whatsapp'               │
│                    ? ctx.flags.can_send_whatsapp      │
│                  : channel === 'sms'                  │
│                    ? ctx.flags.can_send_sms           │
│                  : channel === 'email'                │
│                    ? ctx.flags.can_send_email         │
│                  : true;  // inapp = free             │
│                                                       │
│  4. Create JTD with appropriate status                │
│     status = hasCredits ? 'pending' : 'no_credits'    │
│                                                       │
│  5. Only queue if has credits                         │
│     if (hasCredits) await queueJTD(jtd.id)            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 4. Credit Check Flow

### 4.1 At JTD Creation (API/Service Layer)

```typescript
// jtdService.ts - createJTD method

async createJTD(params: CreateJTDParams): Promise<JTDRecord> {
  const { tenant_id, channel_code, ...rest } = params;

  // 1. Get product_code from request headers or context
  const productCode = getProductCode();

  // 2. Get tenant context
  const ctx = await tenantContextService.getContext(productCode, tenant_id);

  if (!ctx.success) {
    throw new Error('Unable to load tenant context');
  }

  // 3. Check subscription access
  if (!ctx.flags.can_access) {
    throw new Error('Subscription not active');
  }

  // 4. Determine credit availability for channel
  const hasCredits = this.checkChannelCredits(ctx, channel_code);

  // 5. Create JTD record
  const jtdStatus = hasCredits ? 'pending' : 'no_credits';

  const jtd = await this.insertJTD({
    ...rest,
    tenant_id,
    channel_code,
    status_code: jtdStatus,
  });

  // 6. Queue only if has credits
  if (hasCredits) {
    await this.queueJTD(jtd.id);
  }

  // 7. Return result with status info
  return {
    ...jtd,
    queued: hasCredits,
    message: hasCredits
      ? 'Queued for delivery'
      : `Awaiting ${channel_code} credits`,
  };
}

private checkChannelCredits(ctx: TenantContext, channel: string): boolean {
  switch (channel) {
    case 'whatsapp': return ctx.flags.can_send_whatsapp;
    case 'sms': return ctx.flags.can_send_sms;
    case 'email': return ctx.flags.can_send_email;
    case 'inapp': return true;  // Always free
    case 'push': return true;   // Always free
    default: return false;
  }
}
```

### 4.2 In JTD Worker (Edge Function)

The worker still deducts credits AFTER successful send (existing behavior from Phase 1):

```typescript
// jtd-worker/index.ts

// After successful send
if (result.success) {
  // Deduct credit
  if (['whatsapp', 'sms', 'email'].includes(channel_code)) {
    await deductCredits(supabase, tenant_id, 'notification', 1, {
      channel: channel_code,
      referenceType: 'jtd',
      referenceId: jtd_id,
    });
  }

  await updateJTDStatus(jtd_id, 'sent', result.provider_message_id);
}
```

---

## 5. Release Mechanism

### 5.1 Trigger: Credit Topup

When credits are added (via topup, refund, or manual adjustment):

```sql
-- Trigger on t_bm_credit_balance INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_release_jtds_on_credit_topup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on balance increase
  IF NEW.balance > COALESCE(OLD.balance, 0) THEN
    -- Get product_code from subscription
    DECLARE
      v_product_code TEXT;
    BEGIN
      SELECT product_code INTO v_product_code
      FROM t_bm_tenant_subscription
      WHERE tenant_id = NEW.tenant_id
        AND status IN ('active', 'trial', 'grace_period')
      LIMIT 1;

      IF v_product_code IS NOT NULL THEN
        -- Release waiting JTDs for this channel
        PERFORM release_waiting_jtds(
          NEW.tenant_id,
          COALESCE(NEW.channel, 'all'),  -- channel or all if pooled
          100  -- max to release per topup
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 RPC: release_waiting_jtds

```sql
CREATE OR REPLACE FUNCTION release_waiting_jtds(
    p_tenant_id UUID,
    p_channel TEXT,           -- 'whatsapp', 'sms', 'email', or 'all'
    p_max_release INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available INTEGER;
    v_released INTEGER := 0;
    v_jtd RECORD;
    v_channels TEXT[];
BEGIN
    -- Determine which channels to release
    IF p_channel = 'all' THEN
        v_channels := ARRAY['whatsapp', 'sms', 'email'];
    ELSE
        v_channels := ARRAY[p_channel];
    END IF;

    -- Process each channel
    FOREACH p_channel IN ARRAY v_channels
    LOOP
        -- Get available credits for this channel
        SELECT
            COALESCE(SUM(
                CASE WHEN channel = p_channel OR channel IS NULL
                THEN balance - COALESCE(reserved, 0)
                END
            ), 0)
        INTO v_available
        FROM t_bm_credit_balance
        WHERE tenant_id = p_tenant_id
          AND credit_type = 'notification'
          AND (expires_at IS NULL OR expires_at > NOW());

        -- Release JTDs up to available credits (FIFO)
        FOR v_jtd IN
            SELECT id
            FROM n_jtd
            WHERE tenant_id = p_tenant_id
              AND channel_code = p_channel
              AND status_code = 'no_credits'
            ORDER BY created_at ASC  -- FIFO: oldest first
            LIMIT LEAST(v_available, p_max_release - v_released)
        LOOP
            -- Update status to pending
            UPDATE n_jtd
            SET status_code = 'pending',
                updated_at = NOW()
            WHERE id = v_jtd.id;

            -- Add to PGMQ queue
            PERFORM pgmq.send('jtd_queue', jsonb_build_object(
                'jtd_id', v_jtd.id,
                'tenant_id', p_tenant_id,
                'channel_code', p_channel,
                'released_from_no_credits', true
            ));

            v_released := v_released + 1;

            -- Stop if max reached
            IF v_released >= p_max_release THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'released_count', v_released,
        'tenant_id', p_tenant_id,
        'channels', v_channels
    );
END;
$$;
```

### 5.3 Release Order: FIFO

JTDs are released in **First-In-First-Out** order:

```
Waiting Queue (no_credits):
┌────────────────────────────────────────────────────────┐
│  Created: Jan 10  │  Created: Jan 11  │  Created: Jan 12  │
│  ID: jtd-001      │  ID: jtd-002      │  ID: jtd-003      │
│  WhatsApp         │  WhatsApp         │  WhatsApp         │
└────────────────────────────────────────────────────────┘
        ▲
        │
  Released first when credits topped up
```

---

## 6. Expiry Policy

### 6.1 Rule: 7 Days

JTDs with status `no_credits` expire after **7 days**:

| Setting | Value |
|---------|-------|
| Expiry Period | 7 days |
| Final Status | `expired` |
| Notification | Optional (low priority) |

### 6.2 Cron Job: expire_no_credits_jtds

```sql
-- Run daily at 02:00 AM
SELECT cron.schedule(
    'expire-no-credits-jtds',
    '0 2 * * *',
    $$
    UPDATE n_jtd
    SET status_code = 'expired',
        updated_at = NOW(),
        error_message = 'Expired after 7 days without credits'
    WHERE status_code = 'no_credits'
      AND created_at < NOW() - INTERVAL '7 days'
    $$
);
```

### 6.3 Expiry Notification (Optional)

When JTDs expire, optionally notify the tenant:

```sql
-- After expiry update, create notification JTD (if enabled)
INSERT INTO n_jtd (
    tenant_id,
    source_type_code,
    channel_code,
    status_code,
    payload
)
SELECT DISTINCT
    tenant_id,
    'system_notification',
    'inapp',
    'pending',
    jsonb_build_object(
        'title', 'Messages Expired',
        'body', 'Some notifications expired due to insufficient credits',
        'count', COUNT(*)
    )
FROM n_jtd
WHERE status_code = 'expired'
  AND updated_at > NOW() - INTERVAL '1 minute'
GROUP BY tenant_id;
```

---

## 7. Database Changes

### 7.1 New Status in n_jtd_statuses

```sql
INSERT INTO n_jtd_statuses (
    event_type_code,
    status_code,
    status_name,
    status_type,
    description,
    sort_order,
    is_active
) VALUES (
    'notification',
    'no_credits',
    'No Credits',
    'waiting',      -- New status type
    'Notification blocked due to insufficient credits. Will be sent when credits are topped up.',
    15,             -- After 'created' (10), before 'pending' (20)
    true
);

-- Also add for reminder event type
INSERT INTO n_jtd_statuses (
    event_type_code,
    status_code,
    status_name,
    status_type,
    description,
    sort_order,
    is_active
) VALUES (
    'reminder',
    'no_credits',
    'No Credits',
    'waiting',
    'Reminder blocked due to insufficient credits.',
    15,
    true
);
```

### 7.2 New Status Flows

```sql
-- created → no_credits (when no credits)
INSERT INTO n_jtd_status_flows (event_type_code, from_status_code, to_status_code)
VALUES ('notification', 'created', 'no_credits');

-- no_credits → pending (when credits topped up)
INSERT INTO n_jtd_status_flows (event_type_code, from_status_code, to_status_code)
VALUES ('notification', 'no_credits', 'pending');

-- no_credits → expired (after 7 days)
INSERT INTO n_jtd_status_flows (event_type_code, from_status_code, to_status_code)
VALUES ('notification', 'no_credits', 'expired');

-- Same for reminder event type
INSERT INTO n_jtd_status_flows (event_type_code, from_status_code, to_status_code)
VALUES
    ('reminder', 'created', 'no_credits'),
    ('reminder', 'no_credits', 'pending'),
    ('reminder', 'no_credits', 'expired');
```

### 7.3 Index for no_credits Queries

```sql
-- Index for efficient release queries
CREATE INDEX idx_jtd_no_credits_release
ON n_jtd (tenant_id, channel_code, created_at)
WHERE status_code = 'no_credits';

-- Index for expiry job
CREATE INDEX idx_jtd_no_credits_expiry
ON n_jtd (created_at)
WHERE status_code = 'no_credits';
```

---

## 8. Worker Changes

### 8.1 No Changes to jtd-worker

The worker does NOT need to check credits because:

1. Only `pending` status JTDs are in the queue
2. `no_credits` JTDs are never queued
3. Credit deduction happens AFTER successful send (existing behavior)

### 8.2 Handling Released JTDs

When a `no_credits` JTD is released and queued, the worker processes it normally:

```typescript
// jtd-worker/index.ts - No special handling needed

async function processMessage(msg: JTDQueueMessage): Promise<void> {
  const { jtd_id } = msg.message;

  // Released JTDs have a flag in the queue message (optional logging)
  if (msg.message.released_from_no_credits) {
    console.log(`Processing released JTD ${jtd_id}`);
  }

  // Normal processing continues...
  // Credits will be deducted after successful send
}
```

---

## 9. Implementation Checklist

### 9.1 Database Layer

- [ ] Add `no_credits` status to `n_jtd_statuses` for notification event type
- [ ] Add `no_credits` status to `n_jtd_statuses` for reminder event type
- [ ] Add status flows (created→no_credits, no_credits→pending, no_credits→expired)
- [ ] Create `release_waiting_jtds` RPC function
- [ ] Create trigger `trg_release_jtds_on_credit_topup` on `t_bm_credit_balance`
- [ ] Create cron job `expire-no-credits-jtds`
- [ ] Create indexes for `no_credits` queries

### 9.2 API Layer

- [ ] Update `jtdService.createJTD()` to check TenantContext
- [ ] Add credit availability check before queuing
- [ ] Update response to include `queued` flag and message

### 9.3 Edge Layer

- [ ] No changes to `jtd-worker` (existing credit deduction is sufficient)
- [ ] Verify PGMQ message format supports `released_from_no_credits` flag

### 9.4 UI Layer

- [ ] Display `no_credits` status in JTD list
- [ ] Show "Awaiting credits" message
- [ ] Link to credit topup page

---

## Appendix A: Status Type Reference

| Type | Description | Example Statuses |
|------|-------------|------------------|
| `initial` | Starting status | `created` |
| `waiting` | Waiting for external condition | `no_credits` (NEW) |
| `progress` | In-progress | `pending`, `processing` |
| `success` | Successful completion | `sent`, `delivered` |
| `failure` | Failed (may retry) | `failed` |
| `terminal` | End state | `expired`, `cancelled` |

---

## Appendix B: File Locations

| Component | Location |
|-----------|----------|
| JTD Service | `contractnest-api/src/services/jtdService.ts` |
| JTD Worker | `contractnest-edge/supabase/functions/jtd-worker/index.ts` |
| TenantContext Service | `contractnest-api/src/services/tenantContextService.ts` (NEW) |
| Migration | `contractnest-edge/supabase/migrations/jtd-credit-integration/` |
| This Document | `ClaudeDocumentation/JTD/JTD-Addendum-CreditIntegration.md` |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Claude Code | Initial addendum for credit integration |

---

**End of Addendum**

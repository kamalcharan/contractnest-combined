# JTD (Jobs To Do) Framework

> **Version:** 1.1.0
> **Last Updated:** 2025-12-17
> **Status:** Architecture Finalized

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concepts](#2-core-concepts)
3. [VaNi Integration](#3-vani-integration)
4. [Architecture](#4-architecture)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Event Types](#7-event-types)
8. [Channels](#8-channels)
9. [Status Flows](#9-status-flows)
10. [Source Types](#10-source-types)
11. [Configuration](#11-configuration)
12. [Implementation Status](#12-implementation-status)
13. [Architecture Decisions](#13-architecture-decisions)
14. [Implementation Sequence](#14-implementation-sequence)
15. [Change Log](#15-change-log)

---

## 1. Overview

### What is JTD?

**JTD (Jobs To Do)** is the core event/task framework for ContractNest. It is NOT just a notification system - it's a unified framework that handles:

- **Notifications** - Email, SMS, WhatsApp, Push, In-App messages
- **Appointments** - Scheduled meetings, confirmations, reminders
- **Tasks** - Action items, to-dos, assigned work
- **Service Visits** - Scheduled maintenance/repair visits
- **Reminders** - Automated reminders for various events
- **Payments** - Payment notifications and confirmations
- **Documents** - Document sharing and signature requests

### Key Principle

> Every significant action in ContractNest flows through JTD.

When a contract is created with 12 monthly services, JTD automatically creates 12 service_visit records. When a user is invited, JTD creates notification records for the configured channels.

### JTD as Infrastructure

JTD is **infrastructure** - other services invoke it to create jobs:

```
┌──────────────────────┐         ┌──────────────────────┐
│  Contract Service    │         │  JTD Infrastructure  │
│                      │         │                      │
│  • Create contract   │────────▶│  • Create 12 JTD     │
│  • Parse terms       │  invoke │    service_visit     │
│  • Calculate dates   │         │    records           │
└──────────────────────┘         └──────────────────────┘
```

---

## 2. Core Concepts

### 2.1 Single Line Item Per Job

Each JTD record is a **single line item** with:
- Status tracking
- Retry logic
- Actor tracking (who did it)
- Business context

**Example:** If tenant config says "send WhatsApp only", one JTD record is created (not three for email+sms+whatsapp).

### 2.2 Configuration Driven

- **Tenant config** determines which channels are enabled
- **Source config** can override per event source
- **Credits/Limits** control volume per tenant

### 2.3 Actor Tracking

Every JTD records **WHO** performed the action:

| Actor Type | Description |
|------------|-------------|
| `user` | Human user (requires `performed_by_id`) |
| `vani` | VaNi AI Agent (automated execution) |
| `system` | System-generated events |
| `webhook` | External webhook triggers |

### 2.4 Test vs Live Mode

- `is_live = true` - Production transactions
- `is_live = false` - Test mode transactions

---

## 3. VaNi Integration

### What is VaNi?

**VaNi** is the AI Agent that can automatically execute JTD jobs when enabled for a tenant.

### Two Operating Modes

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│   WITHOUT VaNi (Standard Mode)     WITH VaNi (Premium Mode)      │
│   ────────────────────────────     ─────────────────────────     │
│                                                                   │
│   Traditional SaaS UI:             VaNi AI Agent:                │
│   • Appointments screen            • AI Rule Engine              │
│   • Tasks screen                   • Auto-execution              │
│   • Calendar view                  • Smart scheduling            │
│                                                                   │
│   User manually:                   VaNi UI shows:                │
│   • Views their jobs               • What VaNi will do           │
│   • Executes actions               • What VaNi has done          │
│   • Marks complete                 • Full transparency           │
│                                                                   │
│   "You do what you                 "VaNi does what you           │
│    want to do"                      need to do"                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### VaNi User ID

VaNi is represented as a system actor with a well-known UUID:

```
VaNi UUID: 00000000-0000-0000-0000-000000000001
```

This is stored in `n_system_actors` table.

---

## 4. Architecture

### 4.1 Architecture Approach: API-First

JTD uses an **API-First** approach designed to be:
- **Agent friendly** - Works with AI agents and chatbots
- **Multi-channel** - Supports Web, Mobile App, Chatbot, WhatsApp

### 4.2 Request Channels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST CHANNELS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│    │   Web   │  │ Mobile  │  │ Chatbot │  │WhatsApp │                       │
│    │   UI    │  │   App   │  │  Agent  │  │  Agent  │                       │
│    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                       │
│         │            │            │            │                             │
│         └────────────┴─────┬──────┴────────────┘                             │
│                            │                                                 │
│                            ▼                                                 │
│                   ┌─────────────────┐                                       │
│                   │ contractnest-api│                                       │
│                   │   /api/jtd/*    │                                       │
│                   └─────────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Complete Architecture Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         JTD API-FIRST ARCHITECTURE                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     contractnest-api                                 │    │
│  │  ════════════════════════════════════                               │    │
│  │                                                                      │    │
│  │   Routes: /api/jtd/*                                                │    │
│  │      │                                                               │    │
│  │      ▼                                                               │    │
│  │   Controller: jtdController.ts                                      │    │
│  │      │                                                               │    │
│  │      ▼                                                               │    │
│  │   Service: jtdService.ts ◄─── Business Services call this           │    │
│  │      │                        (userService, contractService, etc.)  │    │
│  │      │                                                               │    │
│  └──────┼───────────────────────────────────────────────────────────────┘    │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     contractnest-edge (Supabase)                    │    │
│  │  ════════════════════════════════════════════════                   │    │
│  │                                                                      │    │
│  │   ┌──────────────┐         ┌──────────────┐                         │    │
│  │   │    n_jtd     │────────▶│  PGMQ Queue  │                         │    │
│  │   │  (main tbl)  │ trigger │              │                         │    │
│  │   └──────────────┘         └──────┬───────┘                         │    │
│  │          │                        │                                  │    │
│  │          ▼                        ▼                                  │    │
│  │   ┌──────────────┐         ┌──────────────┐                         │    │
│  │   │ n_jtd_status │         │ Edge Function│                         │    │
│  │   │   _history   │         │   (Worker)   │                         │    │
│  │   └──────────────┘         └──────┬───────┘                         │    │
│  │                                   │                                  │    │
│  └───────────────────────────────────┼──────────────────────────────────┘    │
│                                      │                                       │
│                        ┌─────────────┼─────────────┐                        │
│                        ▼             ▼             ▼                        │
│                   ┌────────┐   ┌────────┐   ┌────────────┐                  │
│                   │ Email  │   │  SMS   │   │  WhatsApp  │                  │
│                   │ (MSG91)│   │ (MSG91)│   │  (MSG91)   │                  │
│                   └───┬────┘   └───┬────┘   └─────┬──────┘                  │
│                       │            │              │                         │
│                       └────────────┴──────┬───────┘                         │
│                                           │                                  │
│                                           ▼                                  │
│                                    ┌─────────────┐                          │
│                                    │  Webhook    │                          │
│                                    │  Callback   │                          │
│                                    └──────┬──────┘                          │
│                                           │                                  │
│                                           ▼                                  │
│                              Update n_jtd status + history                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Sequence Flow (User Invite Example)

```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌──────┐
│   UI    │     │   API   │     │ JTD Service │     │  n_jtd   │     │ PGMQ │
└────┬────┘     └────┬────┘     └──────┬──────┘     └────┬─────┘     └──┬───┘
     │               │                 │                 │              │
     │ POST /invite  │                 │                 │              │
     │──────────────▶│                 │                 │              │
     │               │                 │                 │              │
     │               │ userService.    │                 │              │
     │               │ sendInvite()    │                 │              │
     │               │────────────────▶│                 │              │
     │               │                 │                 │              │
     │               │                 │ createJTD()     │              │
     │               │                 │────────────────▶│              │
     │               │                 │                 │              │
     │               │                 │                 │──(trigger)──▶│
     │               │                 │                 │              │
     │               │                 │◀────────────────│              │
     │               │◀────────────────│                 │              │
     │◀──────────────│                 │                 │              │
     │               │                 │                 │              │
     │  Response:    │                 │                 │              │
     │  JTD created  │                 │                 │              │
```

**Async Processing (Edge Function Worker):**

```
┌──────┐     ┌───────────────┐     ┌──────────┐     ┌───────┐     ┌───────┐
│ PGMQ │     │ Edge Function │     │  n_jtd   │     │ MSG91 │     │Webhook│
└──┬───┘     └───────┬───────┘     └────┬─────┘     └───┬───┘     └───┬───┘
   │                 │                  │               │             │
   │ poll message    │                  │               │             │
   │────────────────▶│                  │               │             │
   │                 │                  │               │             │
   │                 │ get JTD details  │               │             │
   │                 │─────────────────▶│               │             │
   │                 │◀─────────────────│               │             │
   │                 │                  │               │             │
   │                 │ send email       │               │             │
   │                 │─────────────────────────────────▶│             │
   │                 │◀─────────────────────────────────│             │
   │                 │                  │               │             │
   │                 │ update status    │               │             │
   │                 │ (sent)           │               │             │
   │                 │─────────────────▶│               │             │
   │                 │                  │               │             │
   │                 │                  │               │  delivery   │
   │                 │                  │               │  callback   │
   │                 │                  │◀────────────────────────────│
   │                 │                  │               │             │
   │                 │                  │ status=       │             │
   │                 │                  │ delivered     │             │
```

### 4.5 Volume & Concurrency Considerations

| Aspect | Strategy |
|--------|----------|
| **Queue Processing** | PGMQ (PostgreSQL Message Queue) |
| **Connection Pooling** | PgBouncer (200 connections, transaction mode) |
| **Realtime Updates** | Supabase Realtime, status changes only, 500ms debounce |
| **Caching** | React Query with appropriate TTLs |

### 4.6 PGMQ Integration

```sql
-- Create JTD queue
SELECT pgmq.create('jtd_queue');

-- Send to queue (from trigger on n_jtd insert)
SELECT pgmq.send('jtd_queue', jsonb_build_object(
    'jtd_id', jtd_record.id,
    'event_type', jtd_record.event_type_code,
    'channel', jtd_record.channel_code,
    'priority', jtd_record.priority
));

-- Read from queue (Edge Function Worker)
SELECT * FROM pgmq.read('jtd_queue', 30, 10);  -- 30s visibility, batch of 10
```

---

## 5. API Endpoints

### 5.1 JTD Endpoints (Agent/Chatbot Friendly)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/jtd` | Create new JTD |
| GET | `/api/jtd/:id` | Get JTD by ID |
| GET | `/api/jtd` | List JTDs (with filters) |
| PATCH | `/api/jtd/:id/status` | Update JTD status |
| GET | `/api/jtd/:id/history` | Get status history |
| POST | `/api/jtd/webhooks/msg91` | Provider callback |

### 5.2 Internal Service Calls

Business services call JTD Service internally:

```typescript
// userService.ts
async sendInvite(inviteData) {
  // ... create invitation record ...

  // Create JTD for notification
  await jtdService.createJTD({
    source_type_code: 'user_invite',
    tenant_id: tenantId,
    recipient_contact: inviteData.email,
    payload: { ... }
  });
}

// contractService.ts
async createContract(contractData) {
  // ... create contract ...

  // Create JTDs for each service visit
  for (const visit of serviceVisits) {
    await jtdService.createJTD({
      source_type_code: 'service_scheduled',
      event_type_code: 'service_visit',
      scheduled_at: visit.date,
      payload: { ... }
    });
  }
}
```

---

## 6. Database Schema

### 6.1 Table Overview

| # | Table | Purpose | Type |
|---|-------|---------|------|
| 1 | `n_system_actors` | VaNi, System, Webhook | Master |
| 2 | `n_jtd_event_types` | Event type definitions | Master |
| 3 | `n_jtd_channels` | Channel definitions | Master |
| 4 | `n_jtd_statuses` | Status definitions (per event type) | Master |
| 5 | `n_jtd_status_flows` | Valid status transitions | Master |
| 6 | `n_jtd_source_types` | What triggers JTD | Master |
| 7 | `n_jtd_tenant_config` | Per-tenant settings | Config |
| 8 | `n_jtd_tenant_source_config` | Per-tenant source overrides | Config |
| 9 | `n_jtd_templates` | Message templates | Config |
| 10 | `n_jtd` | **Main JTD records** | Transaction |
| 11 | `n_jtd_status_history` | Status change audit trail | Audit |
| 12 | `n_jtd_history` | General audit trail | Audit |

### 6.2 Common Fields

All tables have these standard fields:

**Master Tables:**
- `is_active` - Soft delete flag
- `created_at`, `updated_at` - Timestamps
- `created_by`, `updated_by` - User references

**Transaction Tables (additional):**
- `is_live` - Test mode (false) vs Production (true)

### 6.3 Key Relationships

```
n_jtd_event_types (code)
    │
    ├──▶ n_jtd_statuses (event_type_code) -- Statuses are per event type
    │         │
    │         └──▶ n_jtd_status_flows (from_status_id, to_status_id)
    │
    └──▶ n_jtd (event_type_code)
              │
              ├──▶ n_jtd_status_history (jtd_id) -- Status audit
              └──▶ n_jtd_history (jtd_id) -- General audit
```

---

## 7. Event Types

| Code | Name | Category | Channels | Scheduling |
|------|------|----------|----------|------------|
| `notification` | Notification | communication | email, sms, whatsapp, push, inapp | No |
| `reminder` | Reminder | communication | email, sms, whatsapp, push, inapp | Yes |
| `appointment` | Appointment | scheduling | email, sms, whatsapp, inapp | Yes |
| `service_visit` | Service Visit | scheduling | email, sms, whatsapp | Yes |
| `task` | Task | action | inapp, email | Yes |
| `payment` | Payment | communication | email, sms, whatsapp | No |
| `document` | Document | communication | email, inapp | No |

---

## 8. Channels

| Code | Name | Provider | Cost | Rate Limit |
|------|------|----------|------|------------|
| `email` | Email | MSG91 | ₹0.25 | 100/min |
| `sms` | SMS | MSG91 | ₹0.75 | 50/min |
| `whatsapp` | WhatsApp | MSG91 | ₹0.50 | 30/min |
| `push` | Push | Firebase | ₹0.01 | 500/min |
| `inapp` | In-App | Internal | ₹0.00 | 1000/min |

---

## 9. Status Flows

### 9.1 Status Types

| Type | Description |
|------|-------------|
| `initial` | Starting status (e.g., `created`) |
| `progress` | In-progress status |
| `success` | Successful completion |
| `failure` | Failed (may allow retry) |
| `terminal` | End state, no further transitions |

### 9.2 Soft Enforcement

Status transitions are **soft-enforced**:
- Valid transitions defined in `n_jtd_status_flows`
- Invalid transitions **allowed** but flagged (`is_valid_transition = false`)
- All transitions logged in `n_jtd_status_history`

### 9.3 Example Flows

**Notification:**
```
created → pending → queued → executing → sent → delivered → read
                                            ↓
                                          failed → pending (retry)
```

**Appointment:**
```
created → scheduled → reminded → confirmed → in_progress → completed
                   ↓                    ↓
              rescheduled           no_show
```

**Task:**
```
created → pending → assigned → in_progress → completed
                        ↓           ↓
                    cancelled    blocked → in_progress
```

### 9.4 Status History (Audit Trail)

Every status change is logged with:
- `from_status_code`, `to_status_code`
- `status_started_at`, `status_ended_at`
- `duration_seconds` - Time spent in previous status
- `performed_by_type`, `performed_by_id`, `performed_by_name`
- `is_valid_transition`, `transition_note`

---

## 10. Source Types

Source types define **what triggers JTD creation**:

| Code | Name | Default Event Type | Default Channels |
|------|------|-------------------|------------------|
| `user_invite` | User Invitation | notification | email |
| `user_created` | User Created | notification | email, inapp |
| `contract_created` | Contract Created | notification | email |
| `service_scheduled` | Service Scheduled | service_visit | email, sms |
| `service_reminder` | Service Reminder | reminder | email, sms, whatsapp |
| `appointment_created` | Appointment Created | appointment | email, sms |
| `appointment_reminder` | Appointment Reminder | reminder | email, sms, whatsapp |
| `payment_due` | Payment Due | reminder | email, sms |
| `payment_received` | Payment Received | notification | email |
| `manual` | Manual | task | (none) |
| `system` | System | notification | inapp |

---

## 11. Configuration

### 11.1 Tenant Config (`n_jtd_tenant_config`)

```json
{
  "vani_enabled": false,
  "vani_auto_execute_types": [],
  "channels_enabled": {
    "email": true,
    "sms": false,
    "whatsapp": false,
    "push": false,
    "inapp": true
  },
  "daily_limit": 1000,
  "monthly_limit": 30000,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00",
  "timezone": "Asia/Kolkata"
}
```

### 11.2 Tenant Source Config (`n_jtd_tenant_source_config`)

Override settings per source type:

```json
{
  "source_type_code": "user_invite",
  "channels_enabled": ["email", "whatsapp"],
  "auto_execute": true,
  "priority_override": 8,
  "delay_seconds": 0
}
```

---

## 12. Implementation Status

### 12.1 Completed

- [x] Architecture design
- [x] Architecture decisions finalized
- [x] Database schema design (12 tables)
- [x] Status flow definitions
- [x] Source type definitions
- [x] Template structure
- [x] Migration files created (`001_create_jtd_master_tables.sql`, `002_seed_jtd_master_data.sql`)
- [x] API-first architecture documented

### 12.2 Pending

- [ ] Apply new JTD tables migration (contractnest-edge)
- [ ] Remove old tables: `n_events`, `n_deliveries` (contractnest-edge)
- [ ] Create new `jtdService.ts` - rewrite (contractnest-api)
- [ ] Create `jtdController.ts` & routes (contractnest-api)
- [ ] Setup PGMQ queue (contractnest-edge)
- [ ] Create Edge Function worker (contractnest-edge)
- [ ] Integrate user invite as first use case (contractnest-api)
- [ ] Connect VaNi UI to real data (contractnest-ui)

---

## 13. Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Interface approach | **API-First** | Agent/chatbot friendly, supports Web, Mobile, Chatbot, WhatsApp |
| 2 | Current tables | **Remove old, use new** | Clean start - old `n_events`/`n_deliveries` were POC only |
| 3 | Queue mechanism | **PGMQ** | PostgreSQL native, N8N only for future AI tasks |
| 4 | Worker location | **Edge Function** | Maintains current architecture |
| 5 | VaNi representation | **System actor UUID** | `00000000-0000-0000-0000-000000000001` |

---

## 14. Implementation Sequence

| Phase | Task | Repository | Dependencies |
|-------|------|------------|--------------|
| 1 | Apply new JTD tables migration | contractnest-edge | None |
| 2 | Remove old tables (n_events, n_deliveries) | contractnest-edge | Phase 1 |
| 3 | Create new `jtdService.ts` (rewrite) | contractnest-api | Phase 1 |
| 4 | Create `jtdController.ts` & routes | contractnest-api | Phase 3 |
| 5 | Setup PGMQ queue | contractnest-edge | Phase 1 |
| 6 | Create Edge Function worker | contractnest-edge | Phase 5 |
| 7 | Integrate user invite as first use case | contractnest-api | Phases 3-6 |
| 8 | Connect VaNi UI to real data | contractnest-ui | Phase 7 |

---

## 15. Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-17 | 1.1.0 | Architecture finalized |
| | | - API-first approach confirmed |
| | | - Request channels: Web, Mobile, Chatbot, WhatsApp |
| | | - Decision: Remove old tables (n_events, n_deliveries) |
| | | - Decision: PGMQ for queue (N8N later for AI tasks) |
| | | - Decision: Edge Function for worker |
| | | - Added API endpoints documentation |
| | | - Added sequence flow diagrams |
| | | - Added implementation sequence |
| 2025-12-17 | 1.0.0 | Initial architecture design |
| | | - 12 tables defined |
| | | - Statuses per event type |
| | | - Status history for audit trail |
| | | - is_live for test/prod separation |
| | | - is_active for soft delete |
| | | - Audit fields on all tables |

---

## Appendix A: System Actor UUIDs

| Actor | UUID | Code |
|-------|------|------|
| VaNi | `00000000-0000-0000-0000-000000000001` | `vani` |
| System | `00000000-0000-0000-0000-000000000002` | `system` |
| Webhook | `00000000-0000-0000-0000-000000000003` | `webhook` |

---

## Appendix B: File Locations

| Component | Location |
|-----------|----------|
| Migration: Tables | `contractnest-edge/supabase/migrations/jtd-framework/001_create_jtd_master_tables.sql` |
| Migration: Seed Data | `contractnest-edge/supabase/migrations/jtd-framework/002_seed_jtd_master_data.sql` |
| Documentation | `ClaudeDocumentation/JTD/JTD-Framework.md` |
| Existing VaNi UI | `contractnest-ui/src/vani/pages/` |
| Existing JTD Service | `contractnest-api/src/services/jtdService.ts` |
| Existing Messaging | `contractnest-api/src/services/{email,sms,whatsapp}.service.ts` |

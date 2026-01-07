# Product Requirements Document: FamilyKnows UserInvites & JTD (Jobs To Do)

## Document Information
| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | January 6, 2026 |
| **Status** | Draft |
| **Product** | FamilyKnows Mobile App |
| **Author** | Development Team |
| **Dependencies** | ContractNest API, Supabase |

---

## 1. Executive Summary

### 1.1 Overview
FamilyKnows requires a robust system for inviting family members to workspaces and managing actionable notifications through the JTD (Jobs To Do) framework. This PRD outlines the migration of existing ContractNest infrastructure to support FamilyKnows' family-centric model.

### 1.2 Goals
- Enable family admins to invite members via email, phone, or invite code
- Provide a unified notification system through JTD framework
- Support multiple relationship types (Parent, Child, Spouse, etc.) instead of business roles
- Maintain shared API infrastructure with ContractNest using `x_product` differentiation

### 1.3 Key Differences from ContractNest

| Aspect | ContractNest | FamilyKnows |
|--------|--------------|-------------|
| **Entity** | Company/Organization | Family |
| **Workspace** | Multiple per company | 1 per family |
| **Members** | Employees, Contractors | Family Members |
| **Roles** | Admin, Editor, Viewer | Relationships (Parent, Child, etc.) |
| **Invites** | Professional context | Personal/Family context |

---

## 2. Architecture Overview

### 2.1 Shared API Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shared API Layer                             │
│                  (contractnest-api)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │  ContractNest   │              │   FamilyKnows   │          │
│  │  x_product=     │              │   x_product=    │          │
│  │  'contractnest' │              │   'familyknows' │          │
│  └────────┬────────┘              └────────┬────────┘          │
│           │                                │                    │
│           └──────────────┬─────────────────┘                   │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │ API Router  │                              │
│                   │ x-product   │                              │
│                   │  header     │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│    ┌─────────────────────┼─────────────────────┐               │
│    │                     │                     │               │
│ ┌──▼───┐           ┌─────▼─────┐         ┌────▼────┐          │
│ │Shared│           │Product-   │         │Product- │          │
│ │Routes│           │Specific   │         │Specific │          │
│ │      │           │FKauth     │         │FKonboard│          │
│ └──────┘           └───────────┘         └─────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Product Differentiation Strategy

| Endpoint Category | Shared? | Notes |
|-------------------|---------|-------|
| `/api/auth/*` | No | FKauth for FamilyKnows |
| `/api/FKauth/*` | FamilyKnows only | Authentication |
| `/api/FKonboarding/*` | FamilyKnows only | Onboarding flow |
| `/api/invites/*` | Yes | Same logic, different seed data |
| `/api/tenants/*` | Yes | Tenant = Workspace = Family |
| `/api/jtd/*` | Yes | Jobs To Do notifications |
| `/api/members/*` | Yes | Member management |

### 2.3 Database Schema

#### 2.3.1 User Invites Table

```sql
-- user_invites table (shared)
CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Invite details
  email VARCHAR(255),
  phone VARCHAR(20),
  invite_code VARCHAR(10) UNIQUE,

  -- Relationship/Role (product-specific seed data)
  relationship_id UUID REFERENCES relationships(id),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, revoked
  invited_by UUID REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),

  -- Product differentiation
  x_product VARCHAR(50) NOT NULL, -- 'contractnest' or 'familyknows'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_invites_tenant ON user_invites(tenant_id);
CREATE INDEX idx_invites_email ON user_invites(email);
CREATE INDEX idx_invites_code ON user_invites(invite_code);
CREATE INDEX idx_invites_status ON user_invites(status);
CREATE INDEX idx_invites_product ON user_invites(x_product);
```

#### 2.3.2 Relationships Table (FamilyKnows equivalent of Roles)

```sql
-- relationships table (FamilyKnows seed data)
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship info
  name VARCHAR(50) NOT NULL,          -- 'parent', 'child', 'spouse', etc.
  display_name VARCHAR(100) NOT NULL,  -- 'Parent', 'Child', 'Spouse'
  description TEXT,
  icon VARCHAR(50),                    -- Material icon name

  -- Hierarchy (for permission inheritance)
  hierarchy_level INT DEFAULT 0,       -- 0 = admin, 1 = editor, 2 = viewer

  -- Product
  x_product VARCHAR(50) NOT NULL,

  -- Flags
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FamilyKnows seed data
INSERT INTO relationships (name, display_name, icon, hierarchy_level, is_admin, x_product) VALUES
  ('owner', 'Family Owner', 'crown', 0, TRUE, 'familyknows'),
  ('parent', 'Parent', 'account-supervisor', 1, FALSE, 'familyknows'),
  ('spouse', 'Spouse', 'heart', 1, FALSE, 'familyknows'),
  ('child', 'Child', 'account-child', 2, FALSE, 'familyknows'),
  ('grandparent', 'Grandparent', 'account-supervisor-circle', 1, FALSE, 'familyknows'),
  ('sibling', 'Sibling', 'account-multiple', 2, FALSE, 'familyknows'),
  ('other', 'Other Relative', 'account', 2, FALSE, 'familyknows');

-- ContractNest seed data (for comparison)
INSERT INTO relationships (name, display_name, icon, hierarchy_level, is_admin, x_product) VALUES
  ('admin', 'Administrator', 'shield-account', 0, TRUE, 'contractnest'),
  ('editor', 'Editor', 'pencil', 1, FALSE, 'contractnest'),
  ('viewer', 'Viewer', 'eye', 2, FALSE, 'contractnest');
```

#### 2.3.3 JTD (Jobs To Do) Table

```sql
-- jtd table (Jobs To Do / Actionable Notifications)
CREATE TABLE jtd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Job details
  type VARCHAR(50) NOT NULL,           -- 'invite_received', 'document_shared', 'reminder', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Action details
  action_type VARCHAR(50),             -- 'navigate', 'api_call', 'deep_link'
  action_payload JSONB,                -- { route: 'InviteDetail', params: { id: '...' } }

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, dismissed, expired
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

  -- Reference to related entity
  reference_type VARCHAR(50),          -- 'invite', 'document', 'asset', etc.
  reference_id UUID,

  -- Product
  x_product VARCHAR(50) NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_jtd_user ON jtd(user_id);
CREATE INDEX idx_jtd_tenant ON jtd(tenant_id);
CREATE INDEX idx_jtd_status ON jtd(status);
CREATE INDEX idx_jtd_type ON jtd(type);
CREATE INDEX idx_jtd_unread ON jtd(user_id, is_read) WHERE is_read = FALSE;
```

---

## 3. UserInvites Feature

### 3.1 Invite Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| **Email Invite** | Send invite link via email | Remote family members |
| **Phone/SMS Invite** | Send invite via SMS | Users without email |
| **Invite Code** | 6-character alphanumeric code | In-person sharing |
| **QR Code** | Scannable code with invite link | Quick in-person invite |

### 3.2 Invite Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVITE FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADMIN/OWNER                          INVITEE                   │
│  ───────────                          ───────                   │
│       │                                   │                     │
│       │ 1. Create Invite                  │                     │
│       │    (email/phone/code)             │                     │
│       ▼                                   │                     │
│  ┌─────────┐                              │                     │
│  │ POST    │                              │                     │
│  │/invites │                              │                     │
│  └────┬────┘                              │                     │
│       │                                   │                     │
│       │ 2. Generate invite_code           │                     │
│       │    Create JTD for invitee         │                     │
│       │    Send notification              │                     │
│       │                                   │                     │
│       ├───────────────────────────────────▶                     │
│       │                                   │                     │
│       │                         3. Receive notification         │
│       │                            (email/SMS/push)             │
│       │                                   │                     │
│       │                                   ▼                     │
│       │                            ┌─────────────┐              │
│       │                            │ Open App /  │              │
│       │                            │ Click Link  │              │
│       │                            └──────┬──────┘              │
│       │                                   │                     │
│       │                         4. View invite details          │
│       │                            See family info              │
│       │                                   │                     │
│       │                                   ▼                     │
│       │                            ┌─────────────┐              │
│       │                            │   Accept/   │              │
│       │                            │   Decline   │              │
│       │                            └──────┬──────┘              │
│       │                                   │                     │
│       │◀──────────────────────────────────┤                     │
│       │                                   │                     │
│       │ 5. JTD notification               │                     │
│       │    "X joined your family"         │                     │
│       │                                   │                     │
│       ▼                                   ▼                     │
│  ┌─────────┐                       ┌─────────────┐              │
│  │ Family  │                       │   Member    │              │
│  │ Updated │                       │   Added     │              │
│  └─────────┘                       └─────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 API Endpoints

#### Create Invite
```
POST /api/invites
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
  x-product: familyknows

Request:
{
  "method": "email",           // email, phone, code
  "email": "relative@email.com",
  "phone": "+919876543210",    // optional if email provided
  "relationship_id": "uuid",   // Parent, Child, Spouse, etc.
  "message": "Join our family on FamilyKnows!" // optional personal message
}

Response:
{
  "id": "uuid",
  "invite_code": "ABC123",
  "invite_link": "https://familyknows.app/invite/ABC123",
  "qr_code_url": "https://api.../qr/ABC123",
  "expires_at": "2026-01-13T00:00:00Z",
  "status": "pending"
}
```

#### List Invites
```
GET /api/invites?status=pending
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
  x-product: familyknows

Response:
{
  "invites": [
    {
      "id": "uuid",
      "email": "relative@email.com",
      "relationship": {
        "id": "uuid",
        "name": "parent",
        "display_name": "Parent"
      },
      "status": "pending",
      "invited_by": {
        "id": "uuid",
        "name": "John Doe"
      },
      "created_at": "2026-01-06T10:00:00Z",
      "expires_at": "2026-01-13T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### Accept Invite
```
POST /api/invites/:code/accept
Headers:
  Authorization: Bearer <token>
  x-product: familyknows

Response:
{
  "success": true,
  "tenant": {
    "id": "uuid",
    "name": "The Smith Family",
    "workspace_code": "SMITH123"
  },
  "relationship": {
    "id": "uuid",
    "name": "parent",
    "display_name": "Parent"
  }
}
```

#### Revoke Invite
```
DELETE /api/invites/:id
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
  x-product: familyknows

Response:
{
  "success": true,
  "message": "Invite revoked"
}
```

### 3.4 Invite States

```
┌─────────┐     ┌──────────┐     ┌──────────┐
│ PENDING │────▶│ ACCEPTED │     │ EXPIRED  │
└────┬────┘     └──────────┘     └──────────┘
     │                                 ▲
     │          ┌──────────┐           │
     └─────────▶│ REVOKED  │           │
                └──────────┘           │
     │                                 │
     └─────────────────────────────────┘
            (after 7 days)
```

---

## 4. JTD (Jobs To Do) Framework

### 4.1 Overview

JTD is an actionable notification system that turns passive notifications into tasks users can act upon directly from the notification.

### 4.2 JTD Types for FamilyKnows

| Type | Trigger | Action | Priority |
|------|---------|--------|----------|
| `invite_received` | New invite sent to user | Accept/Decline | High |
| `invite_accepted` | Member accepted invite | View member | Normal |
| `invite_expired` | Invite expired | Resend | Low |
| `document_shared` | Family document shared | View document | Normal |
| `asset_reminder` | Asset renewal due | View asset | High |
| `health_reminder` | Health checkup due | View record | High |
| `subscription_expiring` | Subscription ending | Renew | Urgent |

### 4.3 JTD API Endpoints

#### List JTDs (Notifications)
```
GET /api/jtd?status=pending&limit=20
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
  x-product: familyknows

Response:
{
  "jobs": [
    {
      "id": "uuid",
      "type": "invite_received",
      "title": "Family Invitation",
      "description": "John Smith invited you to join The Smith Family",
      "priority": "high",
      "status": "pending",
      "is_read": false,
      "action": {
        "type": "navigate",
        "payload": {
          "route": "InviteDetail",
          "params": { "invite_id": "uuid" }
        }
      },
      "reference": {
        "type": "invite",
        "id": "uuid"
      },
      "created_at": "2026-01-06T10:00:00Z"
    }
  ],
  "unread_count": 5,
  "total": 12
}
```

#### Mark JTD as Read
```
PATCH /api/jtd/:id/read
Headers:
  Authorization: Bearer <token>
  x-product: familyknows

Response:
{
  "success": true,
  "unread_count": 4
}
```

#### Complete JTD
```
PATCH /api/jtd/:id/complete
Headers:
  Authorization: Bearer <token>
  x-product: familyknows

Response:
{
  "success": true
}
```

#### Dismiss JTD
```
PATCH /api/jtd/:id/dismiss
Headers:
  Authorization: Bearer <token>
  x-product: familyknows

Response:
{
  "success": true
}
```

### 4.4 JTD Mobile Integration

```typescript
// src/hooks/useJTD.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const useJTD = () => {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jtd'],
    queryFn: () => api.get('/api/jtd?status=pending'),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/jtd/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['jtd']),
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.patch(`/api/jtd/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries(['jtd']),
  });

  const handleAction = (job: JTD) => {
    if (job.action.type === 'navigate') {
      navigation.navigate(job.action.payload.route, job.action.payload.params);
    }
    markAsRead.mutate(job.id);
  };

  return {
    jobs: jobs?.data?.jobs || [],
    unreadCount: jobs?.data?.unread_count || 0,
    isLoading,
    markAsRead,
    complete,
    handleAction,
  };
};
```

### 4.5 Push Notifications Integration

```typescript
// JTD triggers push notifications via Edge Function
// contractnest-edge/supabase/functions/jtd-notify/index.ts

import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

Deno.serve(async (req) => {
  const { jtd, user } = await req.json();

  // Get user's push token
  const pushToken = user.expo_push_token;

  if (!Expo.isExpoPushToken(pushToken)) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400 });
  }

  // Map JTD type to notification
  const notification = {
    to: pushToken,
    sound: 'default',
    title: jtd.title,
    body: jtd.description,
    data: {
      type: jtd.type,
      jtd_id: jtd.id,
      action: jtd.action,
    },
    priority: jtd.priority === 'urgent' ? 'high' : 'default',
  };

  const ticket = await expo.sendPushNotificationsAsync([notification]);

  return new Response(JSON.stringify({ ticket }));
});
```

---

## 5. Relationships (FamilyKnows Roles)

### 5.1 Relationship Hierarchy

```
┌─────────────────────────────────────────────────┐
│              RELATIONSHIP HIERARCHY              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Level 0 (Admin)                                │
│  ┌─────────────┐                                │
│  │   Owner     │ - Full control                 │
│  │   (Crown)   │ - Can delete family            │
│  └──────┬──────┘ - Can transfer ownership       │
│         │                                       │
│  Level 1 (Editor)                               │
│  ┌──────┴──────┐                                │
│  │   Parent    │ - Can invite members           │
│  │   Spouse    │ - Can edit all assets          │
│  │ Grandparent │ - Can manage documents         │
│  └──────┬──────┘                                │
│         │                                       │
│  Level 2 (Viewer)                               │
│  ┌──────┴──────┐                                │
│  │   Child     │ - View only (by default)       │
│  │   Sibling   │ - Can edit own profile         │
│  │   Other     │ - Limited access               │
│  └─────────────┘                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5.2 Permissions Matrix (Post-MVP)

| Permission | Owner | Parent/Spouse | Child/Other |
|------------|-------|---------------|-------------|
| View all assets | ✅ | ✅ | ✅ |
| Add assets | ✅ | ✅ | ❌ |
| Edit any asset | ✅ | ✅ | ❌ |
| Delete assets | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change settings | ✅ | ✅ | ❌ |
| Delete family | ✅ | ❌ | ❌ |
| View own health records | ✅ | ✅ | ✅ |
| View family health records | ✅ | ✅ | ❌ |

**Note:** Detailed permissions are post-MVP. Phase 1 uses simple hierarchy_level checks.

---

## 6. Mobile UI Components

### 6.1 Invite Member Screen

```typescript
// FamilyKnows/src/features/family/screens/InviteMemberScreen.tsx

const InviteMemberScreen = () => {
  const [method, setMethod] = useState<'email' | 'phone' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  const { data: relationships } = useRelationships();
  const inviteMutation = useInviteMember();

  return (
    <Screen>
      {/* Method Selector */}
      <SegmentedControl
        options={['Email', 'Phone', 'Code']}
        selected={method}
        onChange={setMethod}
      />

      {/* Input based on method */}
      {method === 'email' && (
        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      )}

      {method === 'phone' && (
        <PhoneInput
          value={phone}
          onChange={setPhone}
        />
      )}

      {method === 'code' && (
        <InviteCodeDisplay code={generatedCode} />
      )}

      {/* Relationship Picker */}
      <RelationshipPicker
        relationships={relationships}
        selected={selectedRelationship}
        onSelect={setSelectedRelationship}
      />

      {/* Send Button */}
      <Button
        title="Send Invite"
        onPress={handleInvite}
        loading={inviteMutation.isLoading}
      />
    </Screen>
  );
};
```

### 6.2 Pending Invites List

```typescript
// FamilyKnows/src/features/family/components/PendingInvites.tsx

const PendingInvites = () => {
  const { data: invites, isLoading } = usePendingInvites();
  const revokeMutation = useRevokeInvite();

  return (
    <Section title="Pending Invites">
      {invites?.map(invite => (
        <InviteCard
          key={invite.id}
          email={invite.email}
          relationship={invite.relationship.display_name}
          sentAt={invite.created_at}
          expiresAt={invite.expires_at}
          onRevoke={() => revokeMutation.mutate(invite.id)}
          onResend={() => resendInvite(invite.id)}
        />
      ))}
    </Section>
  );
};
```

### 6.3 JTD Notification Badge

```typescript
// FamilyKnows/src/components/navigation/NotificationBadge.tsx

const NotificationBadge = () => {
  const { unreadCount } = useJTD();

  if (unreadCount === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
};
```

---

## 7. Migration Plan

### 7.1 Database Migration Steps

```sql
-- Step 1: Add x_product column to existing tables
ALTER TABLE user_invites ADD COLUMN x_product VARCHAR(50) DEFAULT 'contractnest';
ALTER TABLE roles ADD COLUMN x_product VARCHAR(50) DEFAULT 'contractnest';

-- Step 2: Rename roles to relationships (or create alias view)
CREATE VIEW relationships AS SELECT * FROM roles;

-- Step 3: Insert FamilyKnows seed data
INSERT INTO relationships (...) VALUES (...);

-- Step 4: Create JTD table
CREATE TABLE jtd (...);

-- Step 5: Add indexes for x_product filtering
CREATE INDEX idx_invites_product ON user_invites(x_product);
CREATE INDEX idx_roles_product ON roles(x_product);
```

### 7.2 API Migration

1. Add `x-product` header check to shared endpoints
2. Filter queries by `x_product` column
3. Return product-specific seed data (relationships vs roles)

---

## 8. Testing Strategy

### 8.1 Test Cases

| Category | Test Case | Priority |
|----------|-----------|----------|
| **Invites** | Create invite via email | P0 |
| **Invites** | Create invite via phone | P0 |
| **Invites** | Generate invite code | P0 |
| **Invites** | Accept invite | P0 |
| **Invites** | Decline invite | P1 |
| **Invites** | Revoke invite | P1 |
| **Invites** | Invite expiration | P1 |
| **JTD** | Create JTD on invite | P0 |
| **JTD** | Mark JTD as read | P0 |
| **JTD** | Complete JTD | P1 |
| **JTD** | Push notification delivery | P1 |
| **Relationships** | Assign relationship on accept | P0 |
| **Relationships** | Filter by x_product | P0 |

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Invite completion rate | >60% | Accepted / Sent |
| Time to accept invite | <24 hours avg | Analytics |
| JTD engagement rate | >40% | Actions taken / JTDs shown |
| Family size | 3+ members avg | Analytics |

---

## 10. Rollout Plan

### Phase 1: Backend (Week 1-2)
- [ ] Add x_product column to tables
- [ ] Create relationships seed data
- [ ] Create JTD table and APIs
- [ ] Update invite APIs with x_product filtering

### Phase 2: Mobile (Week 3-4)
- [ ] Implement InviteMemberScreen
- [ ] Implement PendingInvites component
- [ ] Integrate JTD notifications
- [ ] Add push notification handling

### Phase 3: Testing (Week 5)
- [ ] Unit tests for APIs
- [ ] Integration tests for invite flow
- [ ] E2E tests for mobile

### Phase 4: Launch (Week 6)
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Gather feedback

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|------------|
| **JTD** | Jobs To Do - Actionable notification system |
| **Relationship** | FamilyKnows equivalent of Role (Parent, Child, etc.) |
| **x_product** | Header/column for product differentiation |
| **Tenant** | Workspace entity (= Family in FamilyKnows) |
| **Invite Code** | 6-character alphanumeric code for sharing |

### 11.2 Related Documents

- PRD-FamilyKnows-I18N.md
- FamilyKnows Technical Architecture
- ContractNest API Documentation

---

*Document End*

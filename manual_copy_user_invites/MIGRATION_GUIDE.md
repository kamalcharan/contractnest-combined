# User Invitations & JTD Framework - Complete Migration Guide

This document contains all migration items required for implementing User Invitations with the JTD (Jobs To Do) framework for async notification delivery via MSG91.

## Table of Contents
1. [Environment Variables](#1-environment-variables)
2. [Database Extensions](#2-database-extensions)
3. [Database Tables](#3-database-tables)
4. [RPC Functions](#4-rpc-functions)
5. [Triggers](#5-triggers)
6. [Seed Data](#6-seed-data)
7. [Edge Functions](#7-edge-functions)
8. [pg_cron Jobs](#8-pg_cron-jobs)

---

## 1. Environment Variables

### Supabase Edge Function Secrets
Set these in Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
# ===========================================
# CORE SUPABASE (auto-populated)
# ===========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# ===========================================
# MSG91 - Communication Provider
# ===========================================
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_EMAIL=noreply@yourproduct.com
MSG91_SENDER_NAME=Your Product Name
MSG91_EMAIL_DOMAIN=yourproduct.com
MSG91_WHATSAPP_NUMBER=919876543210
MSG91_SENDER_ID=YOURID
MSG91_ROUTE=4
MSG91_COUNTRY_CODE=91

# ===========================================
# FRONTEND URL
# ===========================================
FRONTEND_URL=https://www.contractnest.com

# ===========================================
# JTD WORKER
# ===========================================
CRON_SECRET=your-random-cron-secret
```

### Railway/API Environment Variables
```bash
# Same MSG91 variables as above
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_EMAIL=noreply@yourproduct.com
MSG91_SENDER_NAME=Your Product Name
MSG91_SENDER_ID=YOURID
MSG91_ROUTE=4
MSG91_COUNTRY_CODE=91
MSG91_WHATSAPP_NUMBER=919876543210
```

---

## 2. Database Extensions

Run this first to ensure PGMQ extension is available:

```sql
-- Enable PGMQ extension (PostgreSQL Message Queue)
CREATE EXTENSION IF NOT EXISTS pgmq;
```

---

## 3. Database Tables

### 3.1 User Invitations Table

```sql
-- t_user_invitations - Stores user invitation records
CREATE TABLE IF NOT EXISTS public.t_user_invitations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.t_tenants(id),
    invited_by          UUID NOT NULL REFERENCES auth.users(id),

    -- Invitation codes (for URL)
    user_code           VARCHAR(20) NOT NULL,
    secret_code         VARCHAR(20) NOT NULL,

    -- Contact info (one of email or mobile required)
    email               VARCHAR(255),
    mobile_number       VARCHAR(20),
    country_code        VARCHAR(5),
    phone_code          VARCHAR(5),

    -- Method and status
    invitation_method   VARCHAR(20) NOT NULL DEFAULT 'email', -- email, sms, whatsapp
    status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, resent, accepted, cancelled, expired

    -- Timestamps
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at             TIMESTAMP WITH TIME ZONE,
    accepted_at         TIMESTAMP WITH TIME ZONE,
    cancelled_at        TIMESTAMP WITH TIME ZONE,

    -- Accepted by
    accepted_by         UUID REFERENCES auth.users(id),
    cancelled_by        UUID REFERENCES auth.users(id),

    -- Resend tracking
    resent_count        INT DEFAULT 0,
    last_resent_at      TIMESTAMP WITH TIME ZONE,
    last_resent_by      UUID REFERENCES auth.users(id),

    -- Metadata (stores JTD info, custom message, delivery status)
    metadata            JSONB DEFAULT '{}',

    -- Audit
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by          UUID REFERENCES auth.users(id),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_user_invitation_codes UNIQUE(user_code, secret_code),
    CONSTRAINT chk_contact_required CHECK (email IS NOT NULL OR mobile_number IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_user_invitations_tenant ON public.t_user_invitations(tenant_id);
CREATE INDEX idx_user_invitations_status ON public.t_user_invitations(status);
CREATE INDEX idx_user_invitations_email ON public.t_user_invitations(email) WHERE email IS NOT NULL;
CREATE INDEX idx_user_invitations_mobile ON public.t_user_invitations(mobile_number) WHERE mobile_number IS NOT NULL;
CREATE INDEX idx_user_invitations_codes ON public.t_user_invitations(user_code, secret_code);

-- Enable RLS
ALTER TABLE public.t_user_invitations ENABLE ROW LEVEL SECURITY;
```

### 3.2 Invitation Audit Log (Optional)

```sql
-- t_invitation_audit_log - Audit trail for invitation actions
CREATE TABLE IF NOT EXISTS public.t_invitation_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id   UUID NOT NULL REFERENCES public.t_user_invitations(id),
    action          VARCHAR(50) NOT NULL, -- created, sent, resent, accepted, cancelled
    performed_by    UUID REFERENCES auth.users(id),
    performed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_invitation_audit_invitation ON public.t_invitation_audit_log(invitation_id);
```

### 3.3 JTD Framework Tables

Run the following SQL files in order:
1. `000_cleanup_old_jtd.sql` - Optional cleanup script
2. `001_create_jtd_master_tables.sql` - Creates all JTD tables

#### Core JTD Tables Created:
- `n_system_actors` - System users (VaNi, System, Webhook)
- `n_jtd_event_types` - Event type definitions
- `n_jtd_channels` - Communication channels (email, sms, whatsapp, push, inapp)
- `n_jtd_statuses` - Status definitions per event type
- `n_jtd_status_flows` - Valid status transitions
- `n_jtd_source_types` - What triggers JTD creation
- `n_jtd_tenant_config` - Per-tenant settings
- `n_jtd_tenant_source_config` - Per-tenant source overrides
- `n_jtd_templates` - Message templates
- `n_jtd` - Main JTD records
- `n_jtd_status_history` - Status change audit trail
- `n_jtd_history` - General audit trail

---

## 4. RPC Functions

### 4.1 PGMQ Queue Functions

```sql
-- Create JTD queues
SELECT pgmq.create('jtd_queue');
SELECT pgmq.create('jtd_dlq');

-- jtd_read_queue - Read batch of messages from queue
CREATE OR REPLACE FUNCTION public.jtd_read_queue(
    p_batch_size INT DEFAULT 10,
    p_visibility_timeout INT DEFAULT 30
)
RETURNS TABLE (
    msg_id BIGINT,
    read_ct INT,
    enqueued_at TIMESTAMP WITH TIME ZONE,
    vt TIMESTAMP WITH TIME ZONE,
    message JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM pgmq.read('jtd_queue', p_visibility_timeout, p_batch_size);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- jtd_delete_message - Delete processed message from queue
CREATE OR REPLACE FUNCTION public.jtd_delete_message(p_msg_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pgmq.delete('jtd_queue', p_msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- jtd_archive_to_dlq - Move failed message to dead letter queue
CREATE OR REPLACE FUNCTION public.jtd_archive_to_dlq(
    p_msg_id BIGINT,
    p_error_message TEXT
)
RETURNS VOID AS $$
DECLARE
    v_dlq_message JSONB;
    v_original_message JSONB;
BEGIN
    -- Get original message
    SELECT message INTO v_original_message
    FROM pgmq.q_jtd_queue
    WHERE msg_id = p_msg_id;

    -- Build DLQ message with error info
    v_dlq_message := COALESCE(v_original_message, '{}'::jsonb) || jsonb_build_object(
        'original_msg_id', p_msg_id,
        'error_message', p_error_message,
        'archived_at', NOW()
    );

    -- Send to DLQ
    PERFORM pgmq.send('jtd_dlq', v_dlq_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- jtd_enqueue_scheduled - Enqueue scheduled JTDs that are due
CREATE OR REPLACE FUNCTION public.jtd_enqueue_scheduled()
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_jtd RECORD;
    v_message JSONB;
BEGIN
    FOR v_jtd IN
        SELECT * FROM public.n_jtd
        WHERE status_code = 'scheduled'
          AND scheduled_at <= NOW()
          AND scheduled_at IS NOT NULL
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    LOOP
        v_message := jsonb_build_object(
            'jtd_id', v_jtd.id,
            'tenant_id', v_jtd.tenant_id,
            'event_type_code', v_jtd.event_type_code,
            'channel_code', v_jtd.channel_code,
            'source_type_code', v_jtd.source_type_code,
            'priority', v_jtd.priority,
            'scheduled_at', v_jtd.scheduled_at,
            'recipient_contact', v_jtd.recipient_contact,
            'is_live', v_jtd.is_live,
            'created_at', v_jtd.created_at
        );

        PERFORM pgmq.send('jtd_queue', v_message);

        UPDATE public.n_jtd
        SET status_code = 'pending',
            status_changed_at = NOW()
        WHERE id = v_jtd.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- jtd_queue_metrics - Get queue metrics for monitoring
CREATE OR REPLACE FUNCTION public.jtd_queue_metrics()
RETURNS TABLE (
    queue_name TEXT,
    queue_length BIGINT,
    newest_msg_age_sec INT,
    oldest_msg_age_sec INT,
    total_messages BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'jtd_queue'::TEXT,
        (SELECT count(*) FROM pgmq.q_jtd_queue)::BIGINT,
        EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(enqueued_at) FROM pgmq.q_jtd_queue)))::INT,
        EXTRACT(EPOCH FROM (NOW() - (SELECT MIN(enqueued_at) FROM pgmq.q_jtd_queue)))::INT,
        (SELECT count(*) FROM pgmq.q_jtd_queue)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 RLS Helper Functions

```sql
-- get_current_tenant_id - Extract tenant_id from JWT
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- is_vani_user - Check if current user is VaNi
CREATE OR REPLACE FUNCTION public.is_vani_user()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_vani_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
    RETURN v_user_id = v_vani_uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- is_service_role - Check if service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## 5. Triggers

### 5.1 JTD Auto-Enqueue Trigger

```sql
-- Automatically enqueue JTD to PGMQ on insert
CREATE OR REPLACE FUNCTION public.jtd_enqueue_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_message JSONB;
BEGIN
    IF NEW.status_code = 'created' THEN
        v_message := jsonb_build_object(
            'jtd_id', NEW.id,
            'tenant_id', NEW.tenant_id,
            'event_type_code', NEW.event_type_code,
            'channel_code', NEW.channel_code,
            'source_type_code', NEW.source_type_code,
            'priority', NEW.priority,
            'scheduled_at', NEW.scheduled_at,
            'recipient_contact', NEW.recipient_contact,
            'is_live', NEW.is_live,
            'created_at', NEW.created_at
        );

        PERFORM pgmq.send('jtd_queue', v_message);

        NEW.status_code := 'pending';
        NEW.status_changed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jtd_enqueue ON public.n_jtd;
CREATE TRIGGER trg_jtd_enqueue
    BEFORE INSERT ON public.n_jtd
    FOR EACH ROW
    EXECUTE FUNCTION public.jtd_enqueue_on_insert();
```

### 5.2 JTD Status History Trigger

```sql
-- Log status changes to history table
CREATE OR REPLACE FUNCTION public.jtd_log_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_duration_seconds INT;
BEGIN
    IF OLD.status_code IS DISTINCT FROM NEW.status_code THEN
        -- Calculate duration of previous status
        SELECT EXTRACT(EPOCH FROM (NOW() - status_started_at))::INT
        INTO v_duration_seconds
        FROM public.n_jtd_status_history
        WHERE jtd_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;

        -- Update previous status record
        UPDATE public.n_jtd_status_history
        SET status_ended_at = NOW(),
            duration_seconds = v_duration_seconds
        WHERE jtd_id = NEW.id
          AND status_ended_at IS NULL;

        -- Insert new status record
        INSERT INTO public.n_jtd_status_history (
            jtd_id, from_status_id, from_status_code,
            to_status_id, to_status_code, is_valid_transition,
            transition_note, performed_by_type, performed_by_id,
            performed_by_name, status_started_at, is_live, created_by
        ) VALUES (
            NEW.id, OLD.status_id, OLD.status_code,
            NEW.status_id, NEW.status_code, NEW.is_valid_transition,
            NEW.transition_note, NEW.performed_by_type, NEW.performed_by_id,
            NEW.performed_by_name, NOW(), NEW.is_live, NEW.updated_by
        );

        NEW.status_changed_at = NOW();
        NEW.previous_status_code = OLD.status_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jtd_status_change ON public.n_jtd;
CREATE TRIGGER trg_jtd_status_change
    BEFORE UPDATE ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.jtd_log_status_change();
```

### 5.3 JTD Creation History Trigger

```sql
-- Log JTD creation
CREATE OR REPLACE FUNCTION public.jtd_log_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log in general history
    INSERT INTO public.n_jtd_history (
        jtd_id, action, performed_by_type, performed_by_id,
        performed_by_name, details, is_live, created_by
    ) VALUES (
        NEW.id, 'created', NEW.performed_by_type, NEW.performed_by_id,
        NEW.performed_by_name, jsonb_build_object(
            'source_type', NEW.source_type_code,
            'source_id', NEW.source_id,
            'channel', NEW.channel_code,
            'recipient', NEW.recipient_contact,
            'event_type', NEW.event_type_code
        ), NEW.is_live, NEW.created_by
    );

    -- Log initial status
    INSERT INTO public.n_jtd_status_history (
        jtd_id, from_status_code, to_status_id, to_status_code,
        is_valid_transition, performed_by_type, performed_by_id,
        performed_by_name, status_started_at, is_live, created_by
    ) VALUES (
        NEW.id, NULL, NEW.status_id, NEW.status_code,
        true, NEW.performed_by_type, NEW.performed_by_id,
        NEW.performed_by_name, NOW(), NEW.is_live, NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jtd_creation ON public.n_jtd;
CREATE TRIGGER trg_jtd_creation
    AFTER INSERT ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.jtd_log_creation();
```

### 5.4 Updated_at Trigger

```sql
-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.jtd_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all JTD tables
CREATE TRIGGER trg_jtd_updated_at BEFORE UPDATE ON public.n_jtd FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();
CREATE TRIGGER trg_jtd_tenant_config_updated_at BEFORE UPDATE ON public.n_jtd_tenant_config FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();
CREATE TRIGGER trg_jtd_templates_updated_at BEFORE UPDATE ON public.n_jtd_templates FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();
CREATE TRIGGER trg_jtd_event_types_updated_at BEFORE UPDATE ON public.n_jtd_event_types FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();
CREATE TRIGGER trg_jtd_channels_updated_at BEFORE UPDATE ON public.n_jtd_channels FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();
CREATE TRIGGER trg_jtd_statuses_updated_at BEFORE UPDATE ON public.n_jtd_statuses FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();
```

---

## 6. Seed Data

### 6.1 System Actors

```sql
INSERT INTO public.n_system_actors (id, code, name, description, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'vani', 'VaNi', 'AI Agent for automated task execution', true),
    ('00000000-0000-0000-0000-000000000002', 'system', 'System', 'System-generated events', true),
    ('00000000-0000-0000-0000-000000000003', 'webhook', 'Webhook', 'External webhook triggers', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
```

### 6.2 Event Types

```sql
INSERT INTO public.n_jtd_event_types (code, name, category, allowed_channels, is_active) VALUES
    ('notification', 'Notification', 'communication', ARRAY['email', 'sms', 'whatsapp', 'push', 'inapp'], true),
    ('reminder', 'Reminder', 'communication', ARRAY['email', 'sms', 'whatsapp', 'push', 'inapp'], true),
    ('task', 'Task', 'action', ARRAY['inapp', 'email'], true)
ON CONFLICT (code) DO UPDATE SET allowed_channels = EXCLUDED.allowed_channels;
```

### 6.3 Channels

```sql
INSERT INTO public.n_jtd_channels (code, name, default_provider, is_active) VALUES
    ('email', 'Email', 'msg91', true),
    ('sms', 'SMS', 'msg91', true),
    ('whatsapp', 'WhatsApp', 'msg91', true),
    ('push', 'Push', 'firebase', true),
    ('inapp', 'In-App', 'internal', true)
ON CONFLICT (code) DO UPDATE SET default_provider = EXCLUDED.default_provider;
```

### 6.4 Source Types

```sql
INSERT INTO public.n_jtd_source_types (code, name, default_event_type, default_channels, is_active) VALUES
    ('user_invite', 'User Invitation', 'notification', ARRAY['email'], true),
    ('user_created', 'User Created', 'notification', ARRAY['email', 'inapp'], true)
ON CONFLICT (code) DO UPDATE SET default_channels = EXCLUDED.default_channels;
```

### 6.5 Notification Statuses

```sql
INSERT INTO public.n_jtd_statuses (event_type_code, code, name, status_type, is_initial, is_terminal, is_success, is_failure, allows_retry, is_active) VALUES
    ('notification', 'created', 'Created', 'initial', true, false, false, false, false, true),
    ('notification', 'pending', 'Pending', 'progress', false, false, false, false, false, true),
    ('notification', 'queued', 'Queued', 'progress', false, false, false, false, false, true),
    ('notification', 'processing', 'Processing', 'progress', false, false, false, false, false, true),
    ('notification', 'sent', 'Sent', 'progress', false, false, false, false, false, true),
    ('notification', 'delivered', 'Delivered', 'success', false, true, true, false, false, true),
    ('notification', 'read', 'Read', 'success', false, true, true, false, false, true),
    ('notification', 'failed', 'Failed', 'failure', false, false, false, true, true, true),
    ('notification', 'cancelled', 'Cancelled', 'terminal', false, true, false, false, false, true)
ON CONFLICT (event_type_code, code) DO NOTHING;
```

### 6.6 User Invitation Templates

```sql
-- Email template (uses MSG91 template)
INSERT INTO public.n_jtd_templates (
    tenant_id, template_key, name, channel_code, source_type_code,
    subject, content, provider_template_id, variables, is_live, is_active
) VALUES (
    NULL, -- System template
    'user_invitation_email',
    'User Invitation Email',
    'email',
    'user_invite',
    'You''re invited to join {{workspace_name}}',
    'Hi {{recipient_name}}, {{inviter_name}} has invited you to join {{workspace_name}}.',
    'user_invite_4', -- MSG91 template ID
    '["recipient_name", "inviter_name", "workspace_name", "invitation_link"]'::jsonb,
    NULL,
    true
) ON CONFLICT (tenant_id, template_key, channel_code, is_live)
DO UPDATE SET provider_template_id = EXCLUDED.provider_template_id;

-- WhatsApp template
INSERT INTO public.n_jtd_templates (
    tenant_id, template_key, name, channel_code, source_type_code,
    content, provider_template_id, variables, is_live, is_active
) VALUES (
    NULL,
    'user_invitation_whatsapp',
    'User Invitation WhatsApp',
    'whatsapp',
    'user_invite',
    '{{inviter_name}} invited you to join {{workspace_name}}',
    'user_invitation', -- MSG91 WhatsApp template name
    '["recipient_name", "inviter_name", "workspace_name", "invitation_link"]'::jsonb,
    NULL,
    true
) ON CONFLICT (tenant_id, template_key, channel_code, is_live)
DO UPDATE SET provider_template_id = EXCLUDED.provider_template_id;
```

### 6.7 Tenant Configuration

```sql
-- Example tenant config (replace tenant_id with actual)
INSERT INTO public.n_jtd_tenant_config (
    tenant_id, vani_enabled,
    channels_enabled, timezone, is_live, is_active
) VALUES (
    'your-tenant-uuid-here',
    false,
    '{"email": true, "sms": true, "whatsapp": true, "push": false, "inapp": true}'::JSONB,
    'Asia/Kolkata',
    true, -- Production mode
    true
) ON CONFLICT (tenant_id, is_live) DO UPDATE SET
    channels_enabled = EXCLUDED.channels_enabled;
```

---

## 7. Edge Functions

### 7.1 user-invitations

**Path:** `supabase/functions/user-invitations/`

**Files:**
- `index.ts` - Main router with endpoints
- `jtd-integration.ts` - JTD creation helper

**Endpoints:**
- `POST /user-invitations` - Create invitation
- `POST /user-invitations/validate` - Validate invitation code (public)
- `POST /user-invitations/accept` - Accept invitation (public)
- `POST /user-invitations/accept-existing-user` - Accept for logged-in user (auth required)
- `POST /user-invitations/:id/resend` - Resend invitation
- `POST /user-invitations/:id/cancel` - Cancel invitation
- `GET /user-invitations` - List invitations
- `GET /user-invitations/:id` - Get invitation details

**Deploy:**
```bash
supabase functions deploy user-invitations --project-ref your-project-ref
```

### 7.2 jtd-worker

**Path:** `supabase/functions/jtd-worker/`

**Files:**
- `index.ts` - Main worker (polls PGMQ)
- `handlers/email.ts` - MSG91 email handler
- `handlers/sms.ts` - MSG91 SMS handler
- `handlers/whatsapp.ts` - MSG91 WhatsApp handler
- `handlers/inapp.ts` - In-app notification handler

**Endpoints:**
- `POST /jtd-worker` - Process queue (called by pg_cron)

**Deploy:**
```bash
supabase functions deploy jtd-worker --project-ref your-project-ref
```

---

## 8. pg_cron Jobs

Set up cron job to invoke jtd-worker every minute:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule jtd-worker to run every minute
SELECT cron.schedule(
    'jtd-worker-job',
    '* * * * *', -- Every minute
    $$
    SELECT net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/jtd-worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Cron-Secret', 'your-cron-secret'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Verify scheduled jobs
SELECT * FROM cron.job;
```

---

## MSG91 Template Configuration

### Email Template (MSG91 Dashboard)
Create template in MSG91 Dashboard → Email → Templates:

**Template Name:** `user_invite_4`
**Subject:** `You're invited to join {{workspace_name}}`
**Variables:**
- `{{recipient_name}}` - Recipient's name
- `{{inviter_name}}` - Inviter's name
- `{{workspace_name}}` - Workspace/tenant name
- `{{invitation_link}}` - Full invitation URL

### WhatsApp Template (MSG91 Dashboard)
Create and get approved template in MSG91 Dashboard → WhatsApp → Templates:

**Template Name:** `user_invitation`
**Language:** English
**Category:** Marketing/Utility
**Body:**
```
Hi {{1}}! 👋

{{2}} has invited you to join {{3}}.

Click the link below to accept your invitation:
{{4}}

This invitation expires in 48 hours.
```

**Variables in order:**
1. `{{1}}` = recipient_name
2. `{{2}}` = inviter_name
3. `{{3}}` = workspace_name
4. `{{4}}` = invitation_link

---

## Quick Reference - Execution Order

1. **Database:**
   - Enable PGMQ extension
   - Run `001_create_jtd_master_tables.sql`
   - Run `002_seed_jtd_master_data.sql`
   - Run `003_setup_pgmq.sql`
   - Run `004_rls_policies.sql`
   - Run `005_seed_invitation_templates.sql`
   - Create `t_user_invitations` table

2. **MSG91:**
   - Create email template `user_invite_4`
   - Create and get approval for WhatsApp template `user_invitation`

3. **Environment:**
   - Set all Edge Function secrets
   - Set API environment variables

4. **Edge Functions:**
   - Deploy `user-invitations`
   - Deploy `jtd-worker`

5. **Cron:**
   - Set up pg_cron job for jtd-worker

---

## Troubleshooting

### Common Issues

1. **"MSG91_AUTH_KEY is not configured"**
   - Check Edge Function secrets in Supabase Dashboard

2. **"No template found"**
   - Ensure `n_jtd_templates` has records for `user_invitation_email`/`user_invitation_whatsapp`
   - Check `provider_template_id` matches MSG91 template name

3. **WhatsApp not delivering**
   - Recipient must have messaged the business first (WhatsApp policy)
   - Check MSG91 template is approved
   - Verify `MSG91_WHATSAPP_NUMBER` is correct

4. **Infinite retry loop**
   - Ensure `retry_count` is being incremented in n_jtd
   - Check `max_retries` default (3)

5. **Queue not processing**
   - Verify pg_cron job is running: `SELECT * FROM cron.job;`
   - Check `CRON_SECRET` matches in both places
   - Test manually: `SELECT * FROM jtd_queue_metrics();`

---

## Version History

- **v1.0** - Initial JTD + User Invitations implementation
- **v1.1** - Fixed MSG91 payload structures (WhatsApp & Email)
- **v1.2** - Fixed infinite retry loop (always delete from queue after processing)
- **v1.3** - Fixed frontend URL route (/register-invitation)

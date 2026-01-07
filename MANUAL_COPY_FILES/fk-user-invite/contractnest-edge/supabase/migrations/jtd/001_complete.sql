-- ============================================================
-- Migration: 003_jtd_complete_system
-- Description: Complete JTD notification system
-- Date: 2025-01-08
-- 
-- This migration creates the full JTD infrastructure:
--   - All tables (main + lookup + history)
--   - All triggers and functions
--   - PGMQ queues
--   - Seed data for lookups
--   - RLS policies
-- ============================================================

-- ============================================================
-- 0. ENABLE EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgmq;

-- ============================================================
-- 1. SYSTEM ACTORS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_system_actors (
    id UUID NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 2. JTD CHANNELS LOOKUP TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_channels (
    code VARCHAR(20) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    default_provider VARCHAR(50),
    default_cost_per_unit NUMERIC DEFAULT 0,
    rate_limit_per_minute INTEGER DEFAULT 100,
    supports_templates BOOLEAN DEFAULT true,
    supports_attachments BOOLEAN DEFAULT false,
    supports_rich_content BOOLEAN DEFAULT false,
    max_content_length INTEGER,
    has_delivery_confirmation BOOLEAN DEFAULT true,
    has_read_receipt BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 3. JTD EVENT TYPES LOOKUP TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_event_types (
    code VARCHAR(50) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    allowed_channels TEXT[] DEFAULT '{}',
    supports_scheduling BOOLEAN DEFAULT false,
    supports_recurrence BOOLEAN DEFAULT false,
    supports_batch BOOLEAN DEFAULT false,
    payload_schema JSONB,
    default_priority INTEGER DEFAULT 5,
    default_max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 300,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 4. JTD SOURCE TYPES LOOKUP TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_source_types (
    code VARCHAR(50) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_event_type VARCHAR(50) REFERENCES public.n_jtd_event_types(code),
    source_table VARCHAR(100),
    source_id_field VARCHAR(50) DEFAULT 'id',
    default_channels TEXT[] DEFAULT '{}',
    payload_mapping JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 5. JTD STATUSES LOOKUP TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type_code VARCHAR(50) REFERENCES public.n_jtd_event_types(code),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status_type VARCHAR(20) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_initial BOOLEAN DEFAULT false,
    is_terminal BOOLEAN DEFAULT false,
    is_success BOOLEAN DEFAULT false,
    is_failure BOOLEAN DEFAULT false,
    allows_retry BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(event_type_code, code)
);

-- ============================================================
-- 6. JTD STATUS FLOWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_status_flows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type_code VARCHAR(50) NOT NULL REFERENCES public.n_jtd_event_types(code),
    from_status_id UUID NOT NULL REFERENCES public.n_jtd_statuses(id),
    to_status_id UUID NOT NULL REFERENCES public.n_jtd_statuses(id),
    is_automatic BOOLEAN DEFAULT false,
    requires_reason BOOLEAN DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 7. JTD TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    channel_code VARCHAR(20) NOT NULL REFERENCES public.n_jtd_channels(code),
    source_type_code VARCHAR(50) REFERENCES public.n_jtd_source_types(code),
    subject VARCHAR(500),
    content TEXT NOT NULL,
    content_html TEXT,
    variables JSONB DEFAULT '[]',
    provider_template_id VARCHAR(100),
    version INTEGER DEFAULT 1,
    is_live BOOLEAN,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_template UNIQUE (tenant_id, template_key, channel_code, is_live)
);

-- ============================================================
-- 8. JTD TENANT CONFIG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_tenant_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE UNIQUE,
    vani_enabled BOOLEAN DEFAULT false,
    vani_auto_execute_types TEXT[] DEFAULT '{}',
    channels_enabled JSONB DEFAULT '{"email": true, "sms": false, "whatsapp": false, "inapp": true, "push": false}',
    provider_config_refs JSONB DEFAULT '{}',
    daily_limit INTEGER,
    monthly_limit INTEGER,
    daily_used INTEGER DEFAULT 0,
    monthly_used INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    default_priority INTEGER DEFAULT 5,
    timezone VARCHAR(50) DEFAULT 'UTC',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    is_live BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 9. JTD TENANT SOURCE CONFIG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_tenant_source_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    source_type_code VARCHAR(50) NOT NULL REFERENCES public.n_jtd_source_types(code),
    channels_enabled TEXT[],
    templates JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    auto_execute BOOLEAN DEFAULT false,
    priority_override INTEGER,
    delay_seconds INTEGER DEFAULT 0,
    batch_window_seconds INTEGER,
    is_live BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(tenant_id, source_type_code)
);

-- ============================================================
-- 10. MAIN JTD TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    jtd_number VARCHAR(50),
    
    -- Classification
    event_type_code VARCHAR(50) NOT NULL REFERENCES public.n_jtd_event_types(code),
    channel_code VARCHAR(20) REFERENCES public.n_jtd_channels(code),
    source_type_code VARCHAR(50) NOT NULL REFERENCES public.n_jtd_source_types(code),
    source_id UUID,
    source_ref VARCHAR(255),
    
    -- Recipient
    recipient_type VARCHAR(20),
    recipient_id UUID,
    recipient_name VARCHAR(255),
    recipient_contact VARCHAR(255),
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status_id UUID REFERENCES public.n_jtd_statuses(id),
    status_code VARCHAR(50) NOT NULL DEFAULT 'created',
    previous_status_code VARCHAR(50),
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_valid_transition BOOLEAN DEFAULT true,
    transition_note TEXT,
    
    -- Priority & Retry
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Content
    payload JSONB NOT NULL DEFAULT '{}',
    template_id UUID REFERENCES public.n_jtd_templates(id),
    template_key VARCHAR(100),
    template_variables JSONB DEFAULT '{}',
    
    -- Execution Result
    execution_result JSONB,
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Provider
    provider_code VARCHAR(50),
    provider_message_id VARCHAR(255),
    provider_response JSONB,
    cost NUMERIC DEFAULT 0,
    
    -- Context
    business_context JSONB DEFAULT '{}',
    performed_by_type VARCHAR(20) NOT NULL DEFAULT 'user',
    performed_by_id UUID,
    performed_by_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Environment
    is_live BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================
-- 11. JTD HISTORY TABLE (for general action logging)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jtd_id UUID NOT NULL REFERENCES public.n_jtd(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by_type VARCHAR(20),
    performed_by_id UUID,
    performed_by_name VARCHAR(255),
    details JSONB DEFAULT '{}',
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- ============================================================
-- 12. JTD STATUS HISTORY TABLE (for status tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_jtd_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jtd_id UUID NOT NULL REFERENCES public.n_jtd(id) ON DELETE CASCADE,
    from_status_id UUID REFERENCES public.n_jtd_statuses(id),
    from_status_code VARCHAR(50),
    to_status_id UUID REFERENCES public.n_jtd_statuses(id),
    to_status_code VARCHAR(50) NOT NULL,
    is_valid_transition BOOLEAN DEFAULT true,
    transition_note TEXT,
    performed_by_type VARCHAR(20),
    performed_by_id UUID,
    performed_by_name VARCHAR(255),
    status_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- ============================================================
-- 13. IN-APP NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n_inapp_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info'
        CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'action')),
    category VARCHAR(50),
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    source_jtd_id UUID REFERENCES public.n_jtd(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 14. INDEXES
-- ============================================================

-- n_jtd indexes
CREATE INDEX IF NOT EXISTS idx_jtd_tenant ON public.n_jtd(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jtd_status ON public.n_jtd(status_code);
CREATE INDEX IF NOT EXISTS idx_jtd_channel ON public.n_jtd(channel_code);
CREATE INDEX IF NOT EXISTS idx_jtd_source_type ON public.n_jtd(source_type_code);
CREATE INDEX IF NOT EXISTS idx_jtd_scheduled ON public.n_jtd(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jtd_pending ON public.n_jtd(status_code, scheduled_at) WHERE status_code IN ('created', 'pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_jtd_retry ON public.n_jtd(status_code, retry_count) WHERE status_code = 'failed';
CREATE INDEX IF NOT EXISTS idx_jtd_source ON public.n_jtd(source_type_code, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jtd_created ON public.n_jtd(created_at);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_jtd_history_jtd ON public.n_jtd_history(jtd_id);
CREATE INDEX IF NOT EXISTS idx_jtd_status_history_jtd ON public.n_jtd_status_history(jtd_id);

-- In-app notification indexes
CREATE INDEX IF NOT EXISTS idx_inapp_user ON public.n_inapp_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inapp_tenant ON public.n_inapp_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inapp_user_tenant ON public.n_inapp_notifications(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_inapp_unread ON public.n_inapp_notifications(user_id, tenant_id, is_read) WHERE is_read = false;

-- ============================================================
-- 15. TRIGGER FUNCTIONS
-- ============================================================

-- 15.1 Updated at trigger
CREATE OR REPLACE FUNCTION public.jtd_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15.2 Log creation trigger
CREATE OR REPLACE FUNCTION public.jtd_log_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log creation in general history
    INSERT INTO public.n_jtd_history (
        jtd_id, action, performed_by_type, performed_by_id, performed_by_name,
        details, is_live, created_by
    ) VALUES (
        NEW.id, 'created', NEW.performed_by_type, NEW.performed_by_id, NEW.performed_by_name,
        jsonb_build_object(
            'source_type', NEW.source_type_code,
            'source_id', NEW.source_id,
            'channel', NEW.channel_code,
            'recipient', NEW.recipient_contact,
            'event_type', NEW.event_type_code
        ),
        NEW.is_live, NEW.created_by
    );

    -- Log initial status in status history
    INSERT INTO public.n_jtd_status_history (
        jtd_id, from_status_code, to_status_id, to_status_code, is_valid_transition,
        performed_by_type, performed_by_id, performed_by_name, status_started_at,
        is_live, created_by
    ) VALUES (
        NEW.id, NULL, NEW.status_id, NEW.status_code, true,
        NEW.performed_by_type, NEW.performed_by_id, NEW.performed_by_name, NOW(),
        NEW.is_live, NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15.3 Log status change trigger
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

        -- Update previous status history record
        UPDATE public.n_jtd_status_history
        SET status_ended_at = NOW(), duration_seconds = v_duration_seconds
        WHERE jtd_id = NEW.id AND status_ended_at IS NULL;

        -- Insert new status history record
        INSERT INTO public.n_jtd_status_history (
            jtd_id, from_status_id, from_status_code, to_status_id, to_status_code,
            is_valid_transition, transition_note, performed_by_type, performed_by_id,
            performed_by_name, status_started_at, is_live, created_by
        ) VALUES (
            NEW.id, OLD.status_id, OLD.status_code, NEW.status_id, NEW.status_code,
            NEW.is_valid_transition, NEW.transition_note, NEW.performed_by_type,
            NEW.performed_by_id, NEW.performed_by_name, NOW(), NEW.is_live, NEW.updated_by
        );

        NEW.status_changed_at = NOW();
        NEW.previous_status_code = OLD.status_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15.4 Enqueue on insert trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 16. CREATE TRIGGERS
-- ============================================================

-- n_jtd triggers
DROP TRIGGER IF EXISTS trg_jtd_updated_at ON public.n_jtd;
CREATE TRIGGER trg_jtd_updated_at
    BEFORE UPDATE ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_creation ON public.n_jtd;
CREATE TRIGGER trg_jtd_creation
    AFTER INSERT ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.jtd_log_creation();

DROP TRIGGER IF EXISTS trg_jtd_status_change ON public.n_jtd;
CREATE TRIGGER trg_jtd_status_change
    BEFORE UPDATE ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.jtd_log_status_change();

DROP TRIGGER IF EXISTS trg_jtd_enqueue ON public.n_jtd;
CREATE TRIGGER trg_jtd_enqueue
    BEFORE INSERT ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.jtd_enqueue_on_insert();

-- Lookup table triggers
DROP TRIGGER IF EXISTS trg_jtd_channels_updated_at ON public.n_jtd_channels;
CREATE TRIGGER trg_jtd_channels_updated_at
    BEFORE UPDATE ON public.n_jtd_channels
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_event_types_updated_at ON public.n_jtd_event_types;
CREATE TRIGGER trg_jtd_event_types_updated_at
    BEFORE UPDATE ON public.n_jtd_event_types
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_source_types_updated_at ON public.n_jtd_source_types;
CREATE TRIGGER trg_jtd_source_types_updated_at
    BEFORE UPDATE ON public.n_jtd_source_types
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_statuses_updated_at ON public.n_jtd_statuses;
CREATE TRIGGER trg_jtd_statuses_updated_at
    BEFORE UPDATE ON public.n_jtd_statuses
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_templates_updated_at ON public.n_jtd_templates;
CREATE TRIGGER trg_jtd_templates_updated_at
    BEFORE UPDATE ON public.n_jtd_templates
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_tenant_config_updated_at ON public.n_jtd_tenant_config;
CREATE TRIGGER trg_jtd_tenant_config_updated_at
    BEFORE UPDATE ON public.n_jtd_tenant_config
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_tenant_source_config_updated_at ON public.n_jtd_tenant_source_config;
CREATE TRIGGER trg_jtd_tenant_source_config_updated_at
    BEFORE UPDATE ON public.n_jtd_tenant_source_config
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_jtd_status_flows_updated_at ON public.n_jtd_status_flows;
CREATE TRIGGER trg_jtd_status_flows_updated_at
    BEFORE UPDATE ON public.n_jtd_status_flows
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

DROP TRIGGER IF EXISTS trg_system_actors_updated_at ON public.n_system_actors;
CREATE TRIGGER trg_system_actors_updated_at
    BEFORE UPDATE ON public.n_system_actors
    FOR EACH ROW EXECUTE FUNCTION public.jtd_set_updated_at();

-- ============================================================
-- 17. RPC FUNCTIONS
-- ============================================================

-- 17.1 Read queue
CREATE OR REPLACE FUNCTION public.jtd_read_queue(
    p_batch_size INTEGER DEFAULT 10,
    p_visibility_timeout INTEGER DEFAULT 30
)
RETURNS TABLE(msg_id BIGINT, read_ct INTEGER, enqueued_at TIMESTAMP WITH TIME ZONE, vt TIMESTAMP WITH TIME ZONE, message JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM pgmq.read('jtd_queue', p_visibility_timeout, p_batch_size);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.2 Delete message
CREATE OR REPLACE FUNCTION public.jtd_delete_message(p_msg_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pgmq.delete('jtd_queue', p_msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.3 Archive to DLQ (original 3-param version)
CREATE OR REPLACE FUNCTION public.jtd_archive_to_dlq(
    p_msg_id BIGINT,
    p_original_message JSONB,
    p_error_message TEXT
)
RETURNS VOID AS $$
DECLARE
    v_dlq_message JSONB;
BEGIN
    v_dlq_message := p_original_message || jsonb_build_object(
        'original_msg_id', p_msg_id,
        'error_message', p_error_message,
        'archived_at', NOW()
    );

    PERFORM pgmq.send('jtd_dlq', v_dlq_message);
    PERFORM pgmq.delete('jtd_queue', p_msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.4 Archive to DLQ (2-param overload for edge function compatibility)
CREATE OR REPLACE FUNCTION public.jtd_archive_to_dlq(
    p_msg_id BIGINT,
    p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
    PERFORM pgmq.send(
        'jtd_dlq',
        jsonb_build_object(
            'original_msg_id', p_msg_id,
            'error_message', p_error_message,
            'archived_at', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.5 Enqueue scheduled
CREATE OR REPLACE FUNCTION public.jtd_enqueue_scheduled()
RETURNS INTEGER AS $$
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
        SET status_code = 'pending', status_changed_at = NOW()
        WHERE id = v_jtd.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.6 Validate transition
CREATE OR REPLACE FUNCTION public.jtd_validate_transition(
    p_event_type_code VARCHAR,
    p_from_status_code VARCHAR,
    p_to_status_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.n_jtd_status_flows sf
        JOIN public.n_jtd_statuses fs ON sf.from_status_id = fs.id
        JOIN public.n_jtd_statuses ts ON sf.to_status_id = ts.id
        WHERE sf.event_type_code = p_event_type_code
          AND fs.code = p_from_status_code
          AND ts.code = p_to_status_code
          AND sf.is_active = true
    ) INTO v_valid;
    
    RETURN v_valid;
END;
$$ LANGUAGE plpgsql;

-- 17.7 Get status duration summary
CREATE OR REPLACE FUNCTION public.jtd_get_status_duration_summary(p_jtd_id UUID)
RETURNS TABLE(status_code VARCHAR, total_duration_seconds BIGINT, occurrence_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.to_status_code,
        SUM(COALESCE(sh.duration_seconds, 0))::BIGINT,
        COUNT(*)::INTEGER
    FROM public.n_jtd_status_history sh
    WHERE sh.jtd_id = p_jtd_id
    GROUP BY sh.to_status_code
    ORDER BY MIN(sh.created_at);
END;
$$ LANGUAGE plpgsql;

-- 17.8 Queue metrics
CREATE OR REPLACE FUNCTION public.jtd_queue_metrics()
RETURNS TABLE(queue_name TEXT, queue_length BIGINT, newest_msg_age_sec INTEGER, oldest_msg_age_sec INTEGER, total_messages BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.queue_name::TEXT,
        (SELECT COUNT(*) FROM pgmq.q_jtd_queue)::BIGINT,
        0::INTEGER,
        0::INTEGER,
        (SELECT COUNT(*) FROM pgmq.q_jtd_queue)::BIGINT
    FROM pgmq.list_queues() q
    WHERE q.queue_name IN ('jtd_queue', 'jtd_dlq');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 18. CREATE PGMQ QUEUES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'jtd_queue') THEN
        PERFORM pgmq.create('jtd_queue');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'jtd_dlq') THEN
        PERFORM pgmq.create('jtd_dlq');
    END IF;
END $$;

-- ============================================================
-- 19. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.n_jtd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n_jtd_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n_jtd_tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n_jtd_tenant_source_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n_jtd_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n_jtd_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n_inapp_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for n_inapp_notifications
DROP POLICY IF EXISTS "inapp_user_select" ON public.n_inapp_notifications;
CREATE POLICY "inapp_user_select" ON public.n_inapp_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "inapp_user_update" ON public.n_inapp_notifications;
CREATE POLICY "inapp_user_update" ON public.n_inapp_notifications
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "inapp_service_insert" ON public.n_inapp_notifications;
CREATE POLICY "inapp_service_insert" ON public.n_inapp_notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- 20. SEED DATA
-- ============================================================

-- 20.1 System Actors
INSERT INTO public.n_system_actors (id, code, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'VANI', 'VANI - Virtual Assistant', 'System automation actor')
ON CONFLICT (id) DO NOTHING;

-- 20.2 Channels
INSERT INTO public.n_jtd_channels (code, name, description, default_provider, display_order) VALUES
('email', 'Email', 'Email notifications', 'msg91', 1),
('sms', 'SMS', 'SMS text messages', 'msg91', 2),
('whatsapp', 'WhatsApp', 'WhatsApp messages', 'msg91', 3),
('inapp', 'In-App', 'In-application notifications', 'internal', 4),
('push', 'Push', 'Push notifications', 'firebase', 5)
ON CONFLICT (code) DO NOTHING;

-- 20.3 Event Types
INSERT INTO public.n_jtd_event_types (code, name, category, allowed_channels, default_priority) VALUES
('notification', 'Notification', 'general', ARRAY['email', 'sms', 'whatsapp', 'inapp'], 5),
('reminder', 'Reminder', 'scheduled', ARRAY['email', 'sms', 'whatsapp', 'inapp'], 4),
('alert', 'Alert', 'urgent', ARRAY['email', 'sms', 'whatsapp', 'inapp', 'push'], 8),
('transactional', 'Transactional', 'system', ARRAY['email', 'sms'], 7)
ON CONFLICT (code) DO NOTHING;

-- 20.4 Source Types
INSERT INTO public.n_jtd_source_types (code, name, description, default_event_type, source_table, default_channels) VALUES
('user_invitation', 'User Invitation', 'Invitation to join workspace', 'notification', 't_user_invitations', ARRAY['email', 'whatsapp']),
('password_reset', 'Password Reset', 'Password reset request', 'transactional', NULL, ARRAY['email']),
('system_alert', 'System Alert', 'System generated alerts', 'alert', NULL, ARRAY['inapp', 'email'])
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 21. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.jtd_read_queue TO service_role;
GRANT EXECUTE ON FUNCTION public.jtd_delete_message TO service_role;
GRANT EXECUTE ON FUNCTION public.jtd_archive_to_dlq(BIGINT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.jtd_archive_to_dlq(BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.jtd_enqueue_scheduled TO service_role;
GRANT EXECUTE ON FUNCTION public.jtd_validate_transition TO authenticated;
GRANT EXECUTE ON FUNCTION public.jtd_get_status_duration_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.jtd_queue_metrics TO service_role;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
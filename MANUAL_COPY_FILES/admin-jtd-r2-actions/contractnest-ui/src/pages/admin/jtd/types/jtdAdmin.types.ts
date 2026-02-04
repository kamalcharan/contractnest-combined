// src/pages/admin/jtd/types/jtdAdmin.types.ts
// TypeScript interfaces for Admin JTD Management — Release 1

// =============================
// Queue Monitor
// =============================
export interface QueueMetrics {
  main_queue: {
    length: number;
    oldest_age_sec: number | null;
    newest_age_sec: number | null;
  };
  dlq: {
    length: number;
    oldest_age_sec: number | null;
  };
  status_distribution: Record<string, number>;
  last_24h: {
    by_event_type: Record<string, number>;
    by_channel: Record<string, number>;
  };
  actionable: {
    currently_processing: number;
    scheduled_due: number;
    failed_retryable: number;
    no_credits_waiting: number;
  };
  generated_at: string;
}

// =============================
// Tenant Operations
// =============================
export interface TenantJtdStats {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  vani_enabled: boolean;
  total_jtds: number;
  sent: number;
  failed: number;
  pending: number;
  no_credits: number;
  cancelled: number;
  success_rate: number;
  total_cost: number;
  by_channel: Record<string, number>;
  last_jtd_at: string | null;
  daily_limit: number | null;
  daily_used: number;
  monthly_limit: number | null;
  monthly_used: number;
}

export interface TenantStatsGlobal {
  total_jtds: number;
  total_sent: number;
  total_failed: number;
  total_no_credits: number;
  total_cost: number;
}

export interface TenantStatsResponse {
  global: TenantStatsGlobal;
  tenants: TenantJtdStats[];
  pagination: Pagination;
}

// =============================
// Event Explorer
// =============================
export interface JtdEventRecord {
  id: string;
  tenant_id: string;
  tenant_name: string;
  event_type_code: string;
  channel_code: string | null;
  source_type_code: string;
  source_ref: string | null;
  status_code: string;
  previous_status: string | null;
  priority: number;
  recipient_name: string | null;
  recipient_contact: string | null;
  template_key: string | null;
  retry_count: number;
  max_retries: number;
  cost: number;
  error_message: string | null;
  error_code: string | null;
  provider_code: string | null;
  provider_message_id: string | null;
  performed_by_type: string;
  performed_by_name: string | null;
  scheduled_at: string | null;
  executed_at: string | null;
  completed_at: string | null;
  created_at: string;
  status_changes: number;
}

export interface JtdEventDetail extends JtdEventRecord {
  jtd_number: string | null;
  source_id: string | null;
  recipient_type: string | null;
  recipient_id: string | null;
  template_id: string | null;
  template_variables: Record<string, any>;
  payload: Record<string, any>;
  business_context: Record<string, any>;
  execution_result: Record<string, any> | null;
  provider_response: Record<string, any> | null;
  next_retry_at: string | null;
  performed_by_id: string | null;
  metadata: Record<string, any>;
  tags: string[];
  status_changed_at: string;
  updated_at: string;
}

export interface JtdStatusHistoryEntry {
  id: string;
  from_status_code: string | null;
  to_status_code: string;
  is_valid: boolean;
  performed_by_type: string;
  performed_by_name: string | null;
  reason: string | null;
  details: Record<string, any>;
  duration_seconds: number | null;
  created_at: string;
}

// =============================
// Worker Health
// =============================
export type WorkerStatus = 'healthy' | 'idle' | 'degraded' | 'stalled' | 'unknown';

export interface WorkerHealth {
  status: WorkerStatus;
  last_executed_at: string | null;
  last_completed_at: string | null;
  currently_processing: number;
  stuck_count: number;
  throughput: {
    last_1h: number;
    last_24h: number;
    avg_duration_sec: number;
  };
  errors: {
    last_1h: number;
    last_24h: number;
    error_rate_1h: number;
  };
  queue: {
    length: number;
    oldest_age_sec: number | null;
    dlq_length: number;
  };
  generated_at: string;
}

// =============================
// Filters
// =============================
export interface JtdEventFilters {
  page?: number;
  limit?: number;
  tenant_id?: string;
  status?: string;
  event_type?: string;
  channel?: string;
  source_type?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface TenantStatsFilters {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

// =============================
// Shared
// =============================
export interface Pagination {
  current_page: number;
  total_pages: number;
  total_records: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// =============================
// R2 — DLQ & Actions
// =============================
export interface DlqMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  jtd_id: string | null;
  tenant_id: string | null;
  tenant_name: string;
  event_type: string | null;
  channel: string | null;
  priority: string | null;
  error_message: string;
  status_code: string;
  recipient: string;
  age_seconds: number;
}

export interface ActionResult {
  success: boolean;
  event_id?: string;
  msg_id?: number;
  jtd_id?: string;
  from_status?: string;
  to_status?: string;
  message?: string;
  error?: string;
  purged_count?: number;
}

// Status code → display metadata
export const JTD_STATUS_META: Record<string, { label: string; color: string; bgColor: string }> = {
  created:     { label: 'Created',      color: '#6B7280', bgColor: '#F3F4F6' },
  pending:     { label: 'Pending',      color: '#F59E0B', bgColor: '#FEF3C7' },
  queued:      { label: 'Queued',       color: '#8B5CF6', bgColor: '#EDE9FE' },
  scheduled:   { label: 'Scheduled',    color: '#3B82F6', bgColor: '#DBEAFE' },
  processing:  { label: 'Processing',   color: '#F97316', bgColor: '#FFEDD5' },
  executing:   { label: 'Executing',    color: '#F97316', bgColor: '#FFEDD5' },
  sent:        { label: 'Sent',         color: '#10B981', bgColor: '#D1FAE5' },
  delivered:   { label: 'Delivered',    color: '#059669', bgColor: '#D1FAE5' },
  read:        { label: 'Read',         color: '#047857', bgColor: '#A7F3D0' },
  failed:      { label: 'Failed',       color: '#EF4444', bgColor: '#FEE2E2' },
  bounced:     { label: 'Bounced',      color: '#DC2626', bgColor: '#FEE2E2' },
  cancelled:   { label: 'Cancelled',    color: '#6B7280', bgColor: '#F3F4F6' },
  no_credits:  { label: 'No Credits',   color: '#D97706', bgColor: '#FEF3C7' },
  expired:     { label: 'Expired',      color: '#9CA3AF', bgColor: '#F3F4F6' },
  confirmed:   { label: 'Confirmed',    color: '#10B981', bgColor: '#D1FAE5' },
  completed:   { label: 'Completed',    color: '#059669', bgColor: '#D1FAE5' },
  in_progress: { label: 'In Progress',  color: '#3B82F6', bgColor: '#DBEAFE' },
  assigned:    { label: 'Assigned',     color: '#8B5CF6', bgColor: '#EDE9FE' },
  blocked:     { label: 'Blocked',      color: '#EF4444', bgColor: '#FEE2E2' },
  reminded:    { label: 'Reminded',     color: '#06B6D4', bgColor: '#CFFAFE' },
  dispatched:  { label: 'Dispatched',   color: '#8B5CF6', bgColor: '#EDE9FE' },
  rescheduled: { label: 'Rescheduled',  color: '#F59E0B', bgColor: '#FEF3C7' },
  no_show:     { label: 'No Show',      color: '#EF4444', bgColor: '#FEE2E2' },
  viewed:      { label: 'Viewed',       color: '#06B6D4', bgColor: '#CFFAFE' },
  signed:      { label: 'Signed',       color: '#059669', bgColor: '#D1FAE5' },
  rejected:    { label: 'Rejected',     color: '#EF4444', bgColor: '#FEE2E2' },
};

export const CHANNEL_META: Record<string, { label: string; color: string }> = {
  email:    { label: 'Email',    color: '#3B82F6' },
  sms:      { label: 'SMS',      color: '#10B981' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  push:     { label: 'Push',     color: '#F59E0B' },
  inapp:    { label: 'In-App',   color: '#8B5CF6' },
};

export const EVENT_TYPE_META: Record<string, { label: string; color: string }> = {
  notification:  { label: 'Notification',  color: '#3B82F6' },
  reminder:      { label: 'Reminder',      color: '#F59E0B' },
  appointment:   { label: 'Appointment',   color: '#8B5CF6' },
  service_visit: { label: 'Service Visit', color: '#06B6D4' },
  task:          { label: 'Task',          color: '#10B981' },
  payment:       { label: 'Payment',       color: '#EF4444' },
  document:      { label: 'Document',      color: '#6B7280' },
};

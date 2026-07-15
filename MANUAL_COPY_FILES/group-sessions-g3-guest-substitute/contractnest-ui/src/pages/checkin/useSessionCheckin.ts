// ============================================================================
// useSessionCheckin — public, token-gated Group Session check-in (Batch 3)
// ============================================================================
// Bare axios (no auth interceptors) because the member scanning the QR is not
// logged in. Every call carries the opaque token in the URL; the backend
// resolves tenant + occurrence from it.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://contractnest-api-production.up.railway.app';
const publicClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
const unwrap = (res: any) => res?.data?.data ?? res?.data;

export interface CheckinOccurrence { event_id: string; date: string; name?: string }
export interface CheckinResolve {
  ok: boolean; reason?: string;
  tenant_id?: string; contract_id?: string; contract_name?: string; today?: string;
  occurrence?: CheckinOccurrence | null; next_occurrence?: { event_id: string; date: string } | null;
}
export interface CheckinMember { contact_id: string; name: string; membership_contract_id: string | null }
export interface BillingRow {
  event_id: string; label: string; date: string; amount: number; currency: string;
  status: string; sub_type?: string; seq?: number;
}
export interface AttendanceRow { date: string; status: string }
export interface DeclarationRow { billing_event_id: string; status: string; upi_reference?: string; amount?: number }
export interface CheckinHistory {
  ok: boolean; membership_contract_id?: string | null;
  attendance: AttendanceRow[]; billing: BillingRow[]; declarations: DeclarationRow[];
}

// ---- Smart Form schema (subset rendered by the check-in page) ----
export interface CheckinFieldOption { label: string; value: string }
export interface CheckinField {
  id: string; type: string; label: string;
  placeholder?: string; help_text?: string; default_value?: unknown;
  options?: CheckinFieldOption[];
  validation?: { required?: boolean; min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string; custom_message?: string };
  conditional?: { field_id: string; operator: string; value: unknown };
}
export interface CheckinSection { id: string; title?: string; description?: string; fields: CheckinField[] }
export interface CheckinFormSchema { id: string; title?: string; version?: number; sections: CheckinSection[] }
export interface CheckinForm {
  ok: boolean; reason?: string; source?: 'default' | 'template';
  form_template_id?: string | null; form_template_version?: number | null;
  schema?: CheckinFormSchema;
}

export interface SubmitPayload {
  member_id?: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  status: 'present' | 'apologies';
  payment?: { billing_event_id: string; upi_reference?: string; amount?: number; currency?: string } | null;
  responses?: Record<string, unknown> | null;
  form_template_id?: string | null;
  form_template_version?: number | null;
}

export const sessionCheckinApi = {
  async resolve(token: string): Promise<CheckinResolve> {
    return unwrap(await publicClient.get(`/api/checkin/${encodeURIComponent(token)}`));
  },
  async form(token: string): Promise<CheckinForm> {
    return unwrap(await publicClient.get(`/api/checkin/${encodeURIComponent(token)}/form`));
  },
  async lookup(token: string, phone: string): Promise<{ ok: boolean; found: boolean; member?: CheckinMember }> {
    return unwrap(await publicClient.post(`/api/checkin/${encodeURIComponent(token)}/lookup`, { phone }));
  },
  async guest(token: string, payload: {
    name: string; phone?: string; company?: string; email?: string;
    status: 'present' | 'apologies'; responses?: Record<string, unknown> | null;
    form_template_id?: string | null; form_template_version?: number | null;
  }): Promise<{ ok: boolean; kind?: string; contact_id?: string; reason?: string }> {
    return unwrap(await publicClient.post(`/api/checkin/${encodeURIComponent(token)}/guest`, payload));
  },
  async substitute(token: string, payload: {
    member_id: string; sub_name: string; sub_phone?: string;
    status: 'present' | 'apologies'; responses?: Record<string, unknown> | null;
    form_template_id?: string | null; form_template_version?: number | null;
  }): Promise<CheckinHistory> {
    return unwrap(await publicClient.post(`/api/checkin/${encodeURIComponent(token)}/substitute`, payload));
  },
  async history(token: string, memberId: string): Promise<CheckinHistory> {
    return unwrap(await publicClient.get(`/api/checkin/${encodeURIComponent(token)}/member/${memberId}/history`));
  },
  async submit(token: string, payload: SubmitPayload): Promise<CheckinHistory> {
    return unwrap(await publicClient.post(`/api/checkin/${encodeURIComponent(token)}/submit`, payload));
  },
};

// localStorage key so a returning member on the same device is auto-recognised.
export const CHECKIN_PHONE_KEY = 'cn_checkin_phone';

// ============================================================================
// useSessionCheckin — public, token-gated Group Session check-in (Batch 3)
// ============================================================================
// Bare axios (no auth interceptors) because the member scanning the QR is not
// logged in. Every call carries the opaque token in the URL; the backend
// resolves tenant + occurrence from it.

import axios from 'axios';
import type { FormSchema } from '@/pages/settings/smart-forms/types';

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

export interface CheckinForm {
  ok: boolean;
  source?: 'template' | 'default';
  form_template_id?: string | null;
  form_template_version?: number | null;
  schema: FormSchema;
}

export interface SubmitPayload {
  member_id?: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  status: 'present' | 'apologies';
  payment?: { billing_event_id: string; upi_reference?: string; amount?: number; currency?: string } | null;
  // Smart Forms check-in answers (mirrors the gs_checkin_form schema)
  responses?: Record<string, unknown> | null;
  form_template_id?: string | null;
  form_template_version?: number | null;
}

// Built-in fallback schema (mirrors gs_checkin_form's default) so the page still
// works if the form endpoint is unreachable. Attendance is a well-known field.
export const DEFAULT_CHECKIN_SCHEMA: FormSchema = {
  id: 'checkin_default',
  title: 'Session Check-in',
  version: 1,
  settings: { show_progress: false },
  sections: [
    {
      id: 'attendance',
      title: 'Attendance',
      fields: [
        {
          id: 'attendance_status',
          type: 'radio',
          label: 'Are you attending today?',
          default_value: 'present',
          validation: { required: true },
          options: [
            { label: 'Present', value: 'present' },
            { label: 'Apologies (not attending)', value: 'apologies' },
          ],
        },
      ],
    },
  ],
};

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
  async history(token: string, memberId: string): Promise<CheckinHistory> {
    return unwrap(await publicClient.get(`/api/checkin/${encodeURIComponent(token)}/member/${memberId}/history`));
  },
  async submit(token: string, payload: SubmitPayload): Promise<CheckinHistory> {
    return unwrap(await publicClient.post(`/api/checkin/${encodeURIComponent(token)}/submit`, payload));
  },
};

// localStorage key so a returning member on the same device is auto-recognised.
export const CHECKIN_PHONE_KEY = 'cn_checkin_phone';

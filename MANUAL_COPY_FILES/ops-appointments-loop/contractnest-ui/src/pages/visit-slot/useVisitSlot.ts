// ============================================================================
// useVisitSlot — public, token-gated customer answer to a proposed visit slot
// ============================================================================
// Bare axios (no auth interceptors): the customer opening the link is not
// logged in. The slot_token in the URL is the grant (migration jtd-nucleus/015);
// the backend resolves tenant + appointment from it. Same pattern as check-in.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://contractnest-api-production.up.railway.app';
const publicClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
const unwrap = (res: any) => res?.data?.data ?? res?.data;

export type SlotState = 'proposed' | 'proposed_by_you' | 'confirmed' | 'declined' | 'in_progress' | 'closed';

export interface SlotResolve {
  ok: boolean;
  state: SlotState;
  can_respond: boolean;
  business: { name?: string; logo_url?: string; phone?: string };
  customer_first_name?: string | null;
  service_name: string;
  visit?: { sequence?: number; of?: number };
  proposed_at?: string | null;
  technician_name?: string | null;
  customer_response?: { action: 'accept' | 'propose' | 'decline'; at: string; proposed_at?: string; note?: string } | null;
  contract_number?: string;
}

export interface SlotRespond {
  ok: boolean;
  state: SlotState;
  scheduled_at?: string | null;
  already?: boolean;
}

/** The API's error envelope carries the human message; surface it as-is. */
export const errorText = (e: any, fallback: string): string =>
  e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || fallback;

export const visitSlotApi = {
  resolve: (token: string): Promise<SlotResolve> => publicClient.get(`/api/visit-slot/${token}`).then(unwrap),
  respond: (token: string, body: { action: 'accept' | 'propose' | 'decline'; proposed_at?: string; note?: string }): Promise<SlotRespond> =>
    publicClient.post(`/api/visit-slot/${token}/respond`, body).then(unwrap),
};

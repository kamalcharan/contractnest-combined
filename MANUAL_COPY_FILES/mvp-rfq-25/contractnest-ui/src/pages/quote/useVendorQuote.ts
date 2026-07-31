// ============================================================================
// useVendorQuote — public, link-gated RFQ response (RFQ batch 2)
// ============================================================================
// Bare axios (no auth interceptors) because the vendor reading this is not
// logged in and has no account — they are a CONTACT of the buyer, not a
// tenant. Every call carries (cnak, secret) in the URL; the backend resolves
// the RFQ, the buyer's tenant, and WHICH vendor is answering from that pair.
//
// Same shape as useSessionCheckin, deliberately — this is the second public,
// link-gated surface in the product and there is no reason for it to differ.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://contractnest-api-production.up.railway.app';
const publicClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
const unwrap = (res: any) => res?.data?.data ?? res?.data;

export interface QuoteBlock {
  id: string;
  position: number;
  block_name: string;
  block_description?: string | null;
  category_name?: string | null;
  quantity?: number | null;
  billing_cycle?: string | null;
  // How often the visit repeats (days) — the thing a vendor actually needs
  // to price the work. null/undefined = one-time. Added alongside
  // `unlimited` because billing_cycle (prepaid/postpaid/monthly/...) is a
  // buyer-payment-terms concept that means nothing before a vendor is even
  // chosen, and was the only cadence-ish info sent here before.
  service_cycle_days?: number | null;
  unlimited?: boolean | null;
  // NOTE: no price. The buyer's own pricing is deliberately not sent — the
  // vendor is quoting, not matching a number.
}

export interface QuoteRfq {
  id: string;
  rfq_number?: string | null;
  name: string;
  description?: string | null;
  status: string;
  currency?: string | null;
  start_date?: string | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  nomenclature_code?: string | null;
  nomenclature_name?: string | null;
  equipment_details?: Array<Record<string, unknown>>;
}

export interface QuoteBreakdownRow {
  block_id: string;
  block_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface QuoteMe {
  vendor_id: string;
  vendor_name?: string | null;
  vendor_company?: string | null;
  response_status: 'pending' | 'quoted' | 'declined' | 'accepted';
  quoted_amount?: number | null;
  quote_currency?: string | null;
  quote_notes?: string | null;
  quote_breakdown?: QuoteBreakdownRow[] | null;
  quote_valid_until?: string | null;
  responded_at?: string | null;
}

export interface QuoteResolve {
  rfq: QuoteRfq;
  buyer: { tenant_id: string };
  blocks: QuoteBlock[];
  me: QuoteMe;
}

export interface SubmitQuotePayload {
  quoted_amount?: number | null;
  quote_notes?: string | null;
  breakdown?: QuoteBreakdownRow[] | null;
  valid_until?: string | null;
  decline?: boolean;
  decline_reason?: string | null;
}

export interface SubmitQuoteResult {
  response_status: string;
  quoted_amount?: number;
  currency?: string;
  responded_at?: string;
}

/** Server messages here are written for the vendor to read, so they are
 *  surfaced verbatim rather than replaced with a generic string. */
function messageFrom(e: any, fallback: string): string {
  return (
    e?.response?.data?.error?.message ||
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    fallback
  );
}

export const vendorQuoteApi = {
  async resolve(cnak: string, secret: string): Promise<QuoteResolve> {
    try {
      const res = await publicClient.get(`/api/quote/${encodeURIComponent(cnak)}/${encodeURIComponent(secret)}`);
      return unwrap(res) as QuoteResolve;
    } catch (e: any) {
      throw new Error(messageFrom(e, 'This request link could not be opened'));
    }
  },

  async submit(cnak: string, secret: string, payload: SubmitQuotePayload): Promise<SubmitQuoteResult> {
    try {
      const res = await publicClient.post(
        `/api/quote/${encodeURIComponent(cnak)}/${encodeURIComponent(secret)}`,
        payload
      );
      return unwrap(res) as SubmitQuoteResult;
    } catch (e: any) {
      throw new Error(messageFrom(e, 'Your quote could not be submitted'));
    }
  },
};

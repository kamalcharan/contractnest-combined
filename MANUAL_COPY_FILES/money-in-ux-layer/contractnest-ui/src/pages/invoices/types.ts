// ============================================================================
// Invoices section — shared types (UX layer)
// Shapes mirror t_invoices / t_invoice_receipts so the wiring batch can swap
// the sample adapter for GET /api/invoices without touching the pages.
// ============================================================================

export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';

export interface InvoiceSummary {
  id: string;
  invoice_number: string;          // INV-10041
  status: InvoiceStatus;
  contact_name: string | null;     // Bill To display name
  contract_id: string | null;      // null = ad-hoc
  contract_number: string | null;  // CN-1021, null for ad-hoc
  total_amount: number;
  amount_settled: number;
  currency: string;
  issued_date: string;             // ISO date
  due_date: string | null;         // ISO date
}

export interface InvoiceLine {
  id: string;
  name: string;
  category: string | null;         // small subtitle under the item name
  description: string | null;      // the document's Description column
  rate: number;
  qty: number;
  tax_rate: number;                // percent, 0 for none
}

/** Money that arrived BEFORE any invoice existed (declared UPI at check-in,
 *  cash in hand). The composer offers to attach it, so the invoice is born
 *  settled — receipt-first invoicing, the BBB guest-fee reality. */
export interface UnattachedReceipt {
  id: string;
  contact_id: string;
  contact_name: string;
  amount: number;
  method: string;
  reference: string | null;
  received_on: string;             // ISO date
  description: string | null;      // e.g. "Guest Participation Fee"
}

export interface InvoiceReceipt {
  id: string;
  amount: number;
  method: string;                  // Cash / UPI / Bank Transfer / Cheque / Card
  reference: string | null;
  received_on: string;             // ISO date
}

export interface InvoiceDetail extends InvoiceSummary {
  lines: InvoiceLine[];
  receipts: InvoiceReceipt[];
  notes: string | null;
}

/** Catalog entry offered by the composer's add-line typeahead. */
export interface CatalogLineOption {
  id: string;
  name: string;
  category: string;
  rate: number;
  tax_rate: number;
}

export const openBalance = (inv: Pick<InvoiceSummary, 'total_amount' | 'amount_settled'>): number =>
  Math.max(0, inv.total_amount - inv.amount_settled);

export const isOverdue = (inv: InvoiceSummary, todayISO: string): boolean =>
  openBalance(inv) > 0.001 && !!inv.due_date && inv.due_date < todayISO &&
  inv.status !== 'draft' && inv.status !== 'cancelled';

export const daysLate = (inv: InvoiceSummary, todayISO: string): number => {
  if (!inv.due_date) return 0;
  const ms = new Date(todayISO).getTime() - new Date(inv.due_date).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

/** One instalment of a buyer's schedule (billing event). */
export interface Instalment {
  date: string;                    // ISO
  amount: number;
  status: 'paid' | 'due' | 'overdue';
}

/** A buyer's whole money story — the unit of the Money In worklist. */
export interface BuyerRow {
  contact_id: string;
  name: string;
  is_guest: boolean;
  plan_label: string | null;       // "Quarterly · CN-1021"
  instalments: Instalment[];
  invoice_ids: string[];           // → SAMPLE_INVOICES
  receipts: InvoiceReceipt[];
}

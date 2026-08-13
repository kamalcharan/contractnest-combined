// ============================================================================
// Invoices section — UX-phase data adapter (SAMPLE DATA)
// ----------------------------------------------------------------------------
// ⚠ This file is the ONLY thing the wiring batch replaces. The pages import
// exclusively from here; when GET /api/invoices and GET /api/invoices/:id
// exist, this module becomes a thin mapper over those endpoints (or the pages
// switch to a useInvoices() query hook with the same shapes from ./types).
//
// Sample rows deliberately mirror live BBB reality: contract-linked
// `receivable` invoices at the plan amounts (₹19,500 gross year), a couple of
// partially-paid ones, and the two guest-fee ad-hoc cases from the
// Payments-to-confirm panel (contract_id = null).
//
// Entitlement stub: `canCreateAdhocInvoice` will come from tenant-context
// entitlements (addons_extra) once the plan-entitlement wiring lands.
// ============================================================================

import type { CatalogLineOption, InvoiceDetail, InvoiceSummary, UnattachedReceipt } from './types';

export const UX_SAMPLE_MODE = true;

/** Stub — replaced by tenant-context entitlement in the wiring batch. */
export const canCreateAdhocInvoice = true;

export const TODAY_ISO = new Date().toISOString().slice(0, 10);

const D = (iso: string) => iso; // readability helper for literals below

export const SAMPLE_INVOICES: InvoiceSummary[] = [
  { id: 'inv-01', invoice_number: 'INV-10055', status: 'partially_paid', contact_name: 'CHARAN KAMAL', contract_id: 'c-1021', contract_number: 'CN-1021', total_amount: 19500, amount_settled: 6000, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-08-01') },
  { id: 'inv-02', invoice_number: 'INV-10054', status: 'unpaid', contact_name: 'VASANTH JOSHI', contract_id: 'c-1022', contract_number: 'CN-1022', total_amount: 18000, amount_settled: 0, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-07-01') },
  { id: 'inv-03', invoice_number: 'INV-10053', status: 'partially_paid', contact_name: 'AJAY BALKRISHNA TALIKHEDKAR', contract_id: 'c-1045', contract_number: 'CN-1045', total_amount: 13500, amount_settled: 4500, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-08-01') },
  { id: 'inv-04', invoice_number: 'INV-10052', status: 'paid', contact_name: 'M. GURURAJARAO', contract_id: 'c-1020', contract_number: 'CN-1020', total_amount: 19500, amount_settled: 19500, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-07-24') },
  { id: 'inv-05', invoice_number: 'INV-10051', status: 'paid', contact_name: 'PHANI KUMAR SHARMA', contract_id: 'c-1027', contract_number: 'CN-1027', total_amount: 19500, amount_settled: 19500, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-07-24') },
  { id: 'inv-06', invoice_number: 'INV-10050', status: 'unpaid', contact_name: 'Sudhir Sarma J', contract_id: 'c-1038', contract_number: 'CN-1038', total_amount: 18000, amount_settled: 0, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-07-01') },
  { id: 'inv-07', invoice_number: 'INV-10068', status: 'paid', contact_name: 'Tejaswinni ni Bappudi Sundar', contract_id: null, contract_number: null, total_amount: 600, amount_settled: 600, currency: 'INR', issued_date: D('2026-08-08'), due_date: D('2026-08-08') },
  { id: 'inv-08', invoice_number: 'INV-10069', status: 'draft', contact_name: 'Test Guest — Adhoc Invoice QA', contract_id: null, contract_number: null, total_amount: 600, amount_settled: 0, currency: 'INR', issued_date: D('2026-08-09'), due_date: null },
  { id: 'inv-09', invoice_number: 'INV-10049', status: 'unpaid', contact_name: 'Srilekha Kulkarni', contract_id: 'c-1037', contract_number: 'CN-1037', total_amount: 18000, amount_settled: 0, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-08-03') },
  { id: 'inv-10', invoice_number: 'INV-10048', status: 'paid', contact_name: 'HARSHA KULKARNI', contract_id: 'c-1029', contract_number: 'CN-1029', total_amount: 19500, amount_settled: 19500, currency: 'INR', issued_date: D('2026-07-24'), due_date: D('2026-07-24') },
];

export const SAMPLE_DETAILS: Record<string, InvoiceDetail> = {
  'inv-01': {
    ...SAMPLE_INVOICES[0],
    lines: [{ id: 'l1', name: 'Saturday Network Meeting', category: 'Group Session', description: 'Annual membership 2026-27 — meets every alternate Saturday', rate: 19500, qty: 1, tax_rate: 0 }],
    receipts: [
      { id: 'r1', amount: 4500, method: 'UPI', reference: '658553716134', received_on: D('2026-07-25') },
      { id: 'r2', amount: 1500, method: 'Cash', reference: null, received_on: D('2026-08-01') },
    ],
    notes: 'Quarterly plan — ₹375 plan discount applied per instalment.',
  },
  'inv-07': {
    ...SAMPLE_INVOICES[6],
    lines: [{ id: 'l1', name: 'Guest Participation Fee', category: 'Guest Fees', description: 'Saturday Network Meeting, 8 Aug 2026', rate: 600, qty: 1, tax_rate: 0 }],
    receipts: [{ id: 'r1', amount: 600, method: 'UPI', reference: 'bappuditeju-2@okaxis', received_on: D('2026-08-08') }],
    notes: 'Guest at Saturday Network Meeting, 8 Aug — no membership contract, settled directly.',
  },
};

/** Fallback detail for rows without a curated deep sample. */
export const detailFor = (inv: InvoiceSummary): InvoiceDetail =>
  SAMPLE_DETAILS[inv.id] ?? {
    ...inv,
    lines: [{ id: 'l1', name: 'Saturday Network Meeting', category: 'Group Session', description: 'Membership 2026-27 — meets every alternate Saturday', rate: inv.total_amount, qty: 1, tax_rate: 0 }],
    receipts: inv.amount_settled > 0
      ? [{ id: 'r1', amount: inv.amount_settled, method: 'UPI', reference: null, received_on: inv.issued_date }]
      : [],
    notes: null,
  };

/** Composer typeahead options — becomes the tenant catalog in wiring. */
export const SAMPLE_CATALOG: CatalogLineOption[] = [
  { id: 'cat-1', category: 'Membership', name: 'Saturday Network Meeting — Annual Membership', rate: 19500, tax_rate: 0 },
  { id: 'cat-2', category: 'Membership', name: 'Quarterly Membership Instalment', rate: 4875, tax_rate: 0 },
  { id: 'cat-3', category: 'Guest Fees', name: 'Guest Participation Fee', rate: 600, tax_rate: 0 },
  { id: 'cat-4', category: 'Guest Fees', name: 'Substitute Attendance Fee', rate: 300, tax_rate: 0 },
  { id: 'cat-5', category: 'Services', name: 'Business Presentation Slot', rate: 1500, tax_rate: 18 },
  { id: 'cat-6', category: 'Services', name: 'Stall / Expo Table', rate: 2500, tax_rate: 18 },
];

/** Contacts for the composer's Bill To picker (wiring: real contact search). */
export const SAMPLE_CONTACTS: { id: string; name: string; hasContract: boolean }[] = [
  { id: 'ct-1', name: 'Tejaswinni ni Bappudi Sundar', hasContract: false },
  { id: 'ct-2', name: 'CHARAN KAMAL', hasContract: true },
  { id: 'ct-3', name: 'Pavan Kulkarni', hasContract: true },
  { id: 'ct-4', name: 'Test Guest — Adhoc Invoice QA', hasContract: false },
  { id: 'ct-5', name: 'Srilekha Kulkarni', hasContract: true },
];

/** Money received with NO invoice yet — the receipt-first reality (declared
 *  guest fees at check-in, cash in hand). Wiring: pending payment
 *  declarations without an adhoc_invoice_id + unlinked receipts. */
export const SAMPLE_UNATTACHED_RECEIPTS: UnattachedReceipt[] = [
  { id: 'ur-1', contact_id: 'ct-1', contact_name: 'Tejaswinni ni Bappudi Sundar', amount: 600, method: 'UPI', reference: 'bappuditeju-2@okaxis', received_on: '2026-08-08', description: 'Guest Participation Fee' },
  { id: 'ur-2', contact_id: 'ct-4', contact_name: 'Test Guest — Adhoc Invoice QA', amount: 600, method: 'UPI', reference: 'testupi@okaxis', received_on: '2026-08-09', description: 'Guest Participation Fee' },
];

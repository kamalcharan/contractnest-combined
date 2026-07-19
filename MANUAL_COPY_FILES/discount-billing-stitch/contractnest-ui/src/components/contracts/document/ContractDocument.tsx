// src/components/contracts/document/ContractDocument.tsx
// The professional contract document — print/PDF rendering surface.
// Owner-approved layout: SPRINT_REFERENCES/7-contract-document.html.
//
// EVERY piece of content derives from the contract itself (owner decision):
//   letterhead/parties  → tenant profile + buyer
//   reference grid      → contract fields (dates, term, acceptance, currency)
//   intro sentence      → generated from provider/customer/term
//   Schedule A          → service/spare blocks (visits from service cycles;
//                         billing-only items badged, no visits)
//   Schedule B          → commercial lines (cadence-aware) + the locked
//                         totals chain: Sum total → Discount → Taxable →
//                         Tax → Total to be paid (internal allocations never
//                         appear — invoice shows actual values only)
//   Schedule C          → dated payment schedule from computed billing events
//   Terms               → the contract's TEXT blocks (their real content) +
//                         a generated acceptance line from acceptance_method
//
// Always renders ink-on-white (it is a paper document, not a themed screen) —
// html2canvas captures it for the PDF on both the wizard review step and the
// buyer review page.

import React from 'react';
import type { ConfigurableBlock } from '@/components/catalog-studio/BlockCardConfigurable';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';
import { cadenceTermMath, getCadenceCycle } from '@/utils/catalog-studio/cadencePricing';
import { computeContractEvents, type ContractEvent } from '@/utils/service-contracts/contractEvents';

// ═══════════════════════════════════════════════════════════════════
// DATA SHAPE
// ═══════════════════════════════════════════════════════════════════

export interface ContractDocumentData {
  provider: { name: string; logoUrl?: string | null; lines: string[] };
  customer: { name: string; lines: string[] } | null;
  doc: {
    title: string;
    number: string;
    statusLabel: string;
    effectiveDate: string;
    termLabel: string;
    endDate: string;
    acceptanceLabel: string;
    currencyLabel: string;
    generatedOn: string;
    cnak?: string | null;
  };
  intro: string;
  services: Array<{ name: string; description?: string; billingOnly?: boolean; scheduleLabel: string; visitsLabel: string }>;
  commercial: Array<{ name: string; cadenceLabel: string; isCadence?: boolean; rate: string; payments: string; amount: string }>;
  totals: {
    rows: Array<{ label: string; amount: string }>;
    grand: { label: string; amount: string };
    inWords?: string;
    note?: string;
  };
  payments: Array<{ date: string; description: string; amount: string }>;
  /** The contract's text blocks — heading + their REAL content (may be HTML). */
  termsSections: Array<{ heading: string; html: string }>;
  acceptanceLine: string;
  signature: { providerLabel: string; customerLabel: string; customerNote: string };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const fmtMoney = (n: number, currency: string) =>
  `${getCurrencySymbol(currency)}${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

const initialsOf = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'CN';

/** Amount in words — Indian numbering (crore/lakh). Whole units only. */
export function amountInWords(amount: number, currency: string): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n: number): string => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`);
  const three = (n: number): string => (n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + two(n % 100) : ''}` : two(n));
  let n = Math.round(Math.abs(amount));
  if (n === 0) return '';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  const unit = currency === 'INR' ? 'Rupees' : currency;
  return `${unit} ${parts.join(' ')} Only`;
}

const ACCEPTANCE_LABELS: Record<string, string> = {
  signoff: 'Sign-off (buyer approves)',
  payment: 'Payment (first payment accepts)',
  auto: 'Auto-accept',
};

// ═══════════════════════════════════════════════════════════════════
// BUILDER — from wizard state (ReviewSendStep)
// ═══════════════════════════════════════════════════════════════════

export interface WizardDocInput {
  contractName: string;
  contractNumber?: string | null;
  statusLabel: string;
  providerName: string;
  providerLogoUrl?: string | null;
  providerLines: string[];
  customerName: string | null;
  customerLines: string[];
  durationValue: number;
  durationUnit: string;
  startDate: Date;
  acceptanceMethod: string | null;
  currency: string;
  selectedBlocks: ConfigurableBlock[];
  paymentMode: 'prepaid' | 'emi' | 'defined';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  billingCycleType: 'unified' | 'mixed' | null;
  discountType?: 'percent' | 'amount' | null;
  discountValue?: number;
  cnak?: string | null;
}

export function buildDocFromWizard(input: WizardDocInput): ContractDocumentData {
  const {
    selectedBlocks, currency, durationValue, durationUnit, startDate,
    paymentMode, emiMonths, perBlockPaymentType, billingCycleType,
  } = input;

  const durationMonths = durationUnit === 'months' ? durationValue : durationUnit === 'years' ? durationValue * 12 : Math.ceil(durationValue / 30);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const billable = selectedBlocks.filter((b) => categoryHasPricing(b.categoryId || ''));

  // ── Schedule A: services & deliverables ──
  const services = selectedBlocks
    .filter((b) => categoryHasPricing(b.categoryId || ''))
    .map((b) => {
      const billingOnly = b.config?.billingOnly === true;
      const visits = billingOnly
        ? '—'
        : b.unlimited
          ? 'Unlimited'
          : b.serviceCycleDays && b.serviceCycleDays > 0
            ? `${b.quantity} visit${b.quantity !== 1 ? 's' : ''}`
            : `${b.quantity}×`;
      return {
        name: b.name,
        description: (b.description || '').replace(/<[^>]+>/g, '').trim() || undefined,
        billingOnly,
        scheduleLabel: billingOnly ? '—' : (b.serviceCycleDays ? `Every ${b.serviceCycleDays} days from start` : 'On demand / one-time'),
        visitsLabel: visits,
      };
    });

  // ── Schedule B: commercial lines + locked totals chain ──
  let sumTotal = 0;
  const taxByLabel = new Map<string, number>();
  const commercial = billable.map((b) => {
    const ep = b.config?.customPrice ?? b.price;
    const cadDef = b.config?.cadencePricing ? getCadenceCycle(b.cycle) : undefined;
    const m = cadDef ? cadenceTermMath(ep, Math.max(1, durationMonths), cadDef.monthsPerPeriod, b.config?.cadenceFinalPayment) : null;
    const base = m ? m.termTotal : ep * (b.unlimited ? 1 : b.quantity);
    sumTotal += base;
    (b.taxes || []).forEach((t) => {
      const key = `${t.name || 'Tax'} ${t.rate}%`;
      taxByLabel.set(key, (taxByLabel.get(key) || 0) + (base * Number(t.rate)) / 100);
    });
    return {
      name: b.name,
      cadenceLabel: m ? (cadDef!.label) : (b.cycle === 'prepaid' ? 'Prepaid' : b.cycle === 'postpaid' ? 'Postpaid' : b.cycle),
      isCadence: !!m,
      rate: fmtMoney(ep, currency),
      payments: m ? `${m.fullPayments}${m.remMonths > 0 ? ' + final' : ''}` : (b.unlimited ? '—' : `×${b.quantity}`),
      amount: fmtMoney(base, currency),
    };
  });

  const rawDiscount = input.discountType === 'percent'
    ? (sumTotal * (input.discountValue || 0)) / 100
    : (input.discountType === 'amount' ? Math.min(input.discountValue || 0, sumTotal) : 0);
  const taxable = sumTotal - rawDiscount;
  // Discount applies before tax — scale the per-label tax amounts uniformly
  const factor = sumTotal > 0 ? taxable / sumTotal : 1;
  let taxTotal = 0;
  const taxRows = [...taxByLabel.entries()].map(([label, amt]) => {
    const scaled = amt * factor;
    taxTotal += scaled;
    return { label, amount: fmtMoney(Math.round(scaled * 100) / 100, currency) };
  });
  const grand = Math.round((taxable + taxTotal) * 100) / 100;

  const totalsRows = [{ label: 'Sum total', amount: fmtMoney(Math.round(sumTotal * 100) / 100, currency) }];
  if (rawDiscount > 0) {
    totalsRows.push({ label: 'Discount', amount: `− ${fmtMoney(Math.round(rawDiscount * 100) / 100, currency)}` });
    totalsRows.push({ label: 'Taxable value', amount: fmtMoney(Math.round(taxable * 100) / 100, currency) });
  }
  totalsRows.push(...taxRows);

  // ── Schedule C: dated payment schedule from the SAME event math the
  //    wizard persists (single source of truth) ──
  const events = computeContractEvents({
    startDate,
    durationValue,
    durationUnit,
    selectedBlocks,
    paymentMode,
    emiMonths,
    perBlockPaymentType,
    billingCycleType,
    grandTotal: grand,
    currency,
    baseSubtotal: sumTotal,
    discountTotal: rawDiscount,
  }).filter((e: ContractEvent) => e.event_type === 'billing');

  const payments = events.map((e) => ({
    date: fmtDate(e.scheduled_date),
    description: e.block_id === '_contract' || e.block_id === '_emi'
      ? `${e.block_name}${e.billing_cycle_label ? ` — ${e.billing_cycle_label}` : ''}`
      : `${e.block_name} — ${e.billing_cycle_label || ''}`,
    amount: fmtMoney(e.amount || 0, currency),
  }));

  // ── Terms: the contract's TEXT blocks, real content ──
  const termsSections = selectedBlocks
    .filter((b) => (b.categoryId || '') === 'text')
    .map((b) => ({
      heading: b.name,
      html: (b.config?.content as string) || b.description || '',
    }))
    .filter((s) => s.html.trim().length > 0);

  const acceptanceLabel = ACCEPTANCE_LABELS[input.acceptanceMethod || ''] || '—';
  const providerName = input.providerName || 'Provider';
  const customerName = input.customerName;

  return {
    provider: { name: providerName, logoUrl: input.providerLogoUrl, lines: input.providerLines },
    customer: customerName ? { name: customerName, lines: input.customerLines } : null,
    doc: {
      title: 'Service Agreement',
      number: input.contractNumber || 'Draft — number on save',
      statusLabel: input.statusLabel,
      effectiveDate: fmtDate(startDate),
      termLabel: durationUnit === 'years' ? `${durationValue} year${durationValue !== 1 ? 's' : ''}` : durationUnit === 'months' ? `${durationValue} months` : `${durationValue} days`,
      endDate: fmtDate(endDate),
      acceptanceLabel,
      currencyLabel: `${currency} (${getCurrencySymbol(currency)})`,
      generatedOn: fmtDate(new Date()),
      cnak: input.cnak || null,
    },
    intro: customerName
      ? `This Service Agreement sets out the services, commercial terms and payment schedule agreed between ${providerName} (the "Provider") and ${customerName} (the "Customer") for the term stated above. The schedules below form an integral part of this Agreement.`
      : `This Service Agreement sets out the services, commercial terms and payment schedule offered by ${providerName} (the "Provider") for the term stated above. The schedules below form an integral part of this Agreement.`,
    services,
    commercial,
    totals: {
      rows: totalsRows,
      grand: { label: 'Total to be paid', amount: fmtMoney(grand, currency) },
      inWords: amountInWords(grand, currency),
      note: commercial.some((c) => c.isCadence)
        ? 'All rates are exclusive of applicable taxes unless stated otherwise. The Customer may choose a different offered payment cadence at acceptance; the payment schedule regenerates accordingly.'
        : 'All rates are exclusive of applicable taxes unless stated otherwise.',
    },
    payments,
    termsSections,
    acceptanceLine: `This Agreement takes effect upon acceptance via ${acceptanceLabel.toLowerCase()}. Invoices are raised per Schedule C. Service visits are scheduled per Schedule A and evidenced through the Provider's service records.`,
    signature: {
      providerLabel: `For ${providerName}`,
      customerLabel: customerName ? `For ${customerName}` : 'For the Customer',
      customerNote: input.acceptanceMethod === 'signoff' ? 'Accepted via CNAK sign-off · Name & date' : 'Name & date',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// BUILDER — from a saved contract (buyer review page)
// ═══════════════════════════════════════════════════════════════════

export interface SavedContractDocInput {
  contract: {
    name: string;
    contract_number: string;
    status: string;
    duration_value: number;
    duration_unit: string;
    currency: string;
    billing_cycle_type: string;
    payment_mode: string;
    emi_months: number | null;
    per_block_payment_type: Record<string, string> | null;
    acceptance_method: string;
    created_at: string;
    blocks: Array<{
      id: string;
      source_block_id?: string | null;
      block_name: string;
      block_description: string;
      category_id: string;
      unit_price: number;
      quantity: number;
      billing_cycle: string;
      total_price: number;
      custom_fields: any;
    }>;
    total_value: number;
    tax_total: number;
    grand_total: number;
    tax_breakdown?: Array<{ name: string; rate: number; amount: number }> | null;
  };
  providerName: string;
  providerLogoUrl?: string | null;
  providerLines: string[];
  customerName: string | null;
  customerLines: string[];
  cnak?: string | null;
}

export function buildDocFromSavedContract(input: SavedContractDocInput): ContractDocumentData {
  const c = input.contract;
  const currency = c.currency || 'INR';
  const startDate = new Date(c.created_at);

  // Reconstruct just enough of ConfigurableBlock for the shared event math
  const blocks: ConfigurableBlock[] = c.blocks.map((b) => ({
    id: b.source_block_id || b.id,
    name: b.block_name,
    description: b.block_description || '',
    icon: 'Package',
    quantity: b.quantity,
    cycle: b.billing_cycle,
    customCycleDays: b.custom_fields?.config?.customCycleDays,
    serviceCycleDays: b.custom_fields?.config?.serviceCycles?.days,
    unlimited: b.custom_fields?.unlimited === true,
    price: b.unit_price,
    currency: b.custom_fields?.currency || currency,
    totalPrice: b.total_price,
    categoryName: b.category_id,
    categoryColor: '#000',
    categoryId: b.category_id,
    taxRate: 0,
    taxes: [],
    config: b.custom_fields?.config || {},
  } as ConfigurableBlock));

  const wizardLike = buildDocFromWizard({
    contractName: c.name,
    contractNumber: c.contract_number,
    statusLabel: (c.status || 'draft').replace(/_/g, ' '),
    providerName: input.providerName,
    providerLogoUrl: input.providerLogoUrl,
    providerLines: input.providerLines,
    customerName: input.customerName,
    customerLines: input.customerLines,
    durationValue: c.duration_value,
    durationUnit: c.duration_unit,
    startDate,
    acceptanceMethod: c.acceptance_method,
    currency,
    selectedBlocks: blocks,
    paymentMode: (c.payment_mode as any) || 'prepaid',
    emiMonths: c.emi_months || 0,
    perBlockPaymentType: (c.per_block_payment_type as any) || {},
    billingCycleType: (c.billing_cycle_type as any) || null,
    cnak: input.cnak,
  });

  // Saved contracts carry AUTHORITATIVE totals — override the recomputed chain
  const rows = [{ label: 'Sum total', amount: fmtMoney(c.total_value || 0, currency) }];
  (c.tax_breakdown || []).forEach((t) => rows.push({ label: `${t.name} ${t.rate}%`, amount: fmtMoney(t.amount, currency) }));
  if ((c.tax_breakdown || []).length === 0 && (c.tax_total || 0) > 0) {
    rows.push({ label: 'Tax', amount: fmtMoney(c.tax_total, currency) });
  }
  wizardLike.totals.rows = rows;
  wizardLike.totals.grand = { label: 'Total to be paid', amount: fmtMoney(c.grand_total || c.total_value || 0, currency) };
  wizardLike.totals.inWords = amountInWords(c.grand_total || c.total_value || 0, currency);
  return wizardLike;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT — ink-on-white paper, html2canvas-safe inline styles
// ═══════════════════════════════════════════════════════════════════

const INK = '#16181D';
const INK2 = '#5B6472';
const LINE = '#E3E6EB';
const BRAND = '#0D9488';
const BRAND_DARK = '#0B7C72';
const WASH = '#F6F8F9';
const AMBER = '#92600A';

const S = {
  sheet: { width: 794, background: '#FFFFFF', padding: '52px 56px', color: INK, fontFamily: "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif", fontSize: 13, lineHeight: 1.5 } as React.CSSProperties,
  th: { fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: INK2, textAlign: 'left' as const, padding: '7px 10px', borderBottom: `2px solid ${INK}` },
  td: { padding: '9px 10px', borderBottom: `1px solid ${LINE}`, fontSize: 12, verticalAlign: 'top' as const },
  schedTag: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 11, letterSpacing: 2, color: BRAND_DARK, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const },
  schedTitle: { fontSize: 14, fontWeight: 800 } as React.CSSProperties,
};

const SchedHead: React.FC<{ tag: string; title: string }> = ({ tag, title }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
    <span style={S.schedTag}>{tag}</span>
    <span style={S.schedTitle}>{title}</span>
    <span style={{ flex: 1, borderTop: `1px solid ${LINE}`, transform: 'translateY(-3px)' }} />
  </div>
);

export const ContractDocument: React.FC<{ data: ContractDocumentData }> = ({ data }) => (
  <div style={S.sheet}>
    {/* LETTERHEAD */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: `3px solid ${BRAND}` }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {data.provider.logoUrl ? (
          <img src={data.provider.logoUrl} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover' }} crossOrigin="anonymous" />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: 10, background: BRAND, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 19 }}>
            {initialsOf(data.provider.name)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{data.provider.name}</div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 2 }}>{data.provider.lines.join(' · ')}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 21, letterSpacing: 2.5, textTransform: 'uppercase' }}>{data.doc.title}</div>
        <div style={{ fontSize: 11.5, color: INK2, marginTop: 4 }}>Contract No. <b style={{ color: INK }}>{data.doc.number}</b></div>
        <span style={{ display: 'inline-block', marginTop: 6, fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2, padding: '3px 10px', border: `1px solid ${AMBER}`, color: AMBER, borderRadius: 3, textTransform: 'uppercase' }}>
          {data.doc.statusLabel}
        </span>
      </div>
    </div>

    {/* REFERENCE GRID */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden', margin: '22px 0' }}>
      {[
        ['Effective Date', data.doc.effectiveDate],
        ['Term', `${data.doc.termLabel} → ${data.doc.endDate}`],
        ['Acceptance', data.doc.acceptanceLabel],
        ['Currency', data.doc.currencyLabel],
      ].map(([k, v], i) => (
        <div key={k} style={{ padding: '10px 14px', borderRight: i < 3 ? `1px solid ${LINE}` : 'none', background: WASH }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: INK2 }}>{k}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}>{v}</div>
        </div>
      ))}
    </div>

    {/* PARTIES */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 26 }}>
      <div style={{ borderLeft: `3px solid ${BRAND}`, paddingLeft: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: BRAND_DARK }}>Service Provider</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{data.provider.name}</div>
        <div style={{ fontSize: 11.5, color: INK2, marginTop: 2, lineHeight: 1.6 }}>{data.provider.lines.map((l, i) => <div key={i}>{l}</div>)}</div>
      </div>
      {data.customer && (
        <div style={{ borderLeft: `3px solid ${BRAND}`, paddingLeft: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: BRAND_DARK }}>Customer</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{data.customer.name}</div>
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 2, lineHeight: 1.6 }}>{data.customer.lines.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      )}
    </div>

    <p style={{ fontSize: 12, color: INK2, marginBottom: 26, lineHeight: 1.7 }}>{data.intro}</p>

    {/* SCHEDULE A */}
    {data.services.length > 0 && (
      <div style={{ marginBottom: 30 }}>
        <SchedHead tag="Schedule A" title="Services & Deliverables" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 28 }}>#</th>
              <th style={S.th}>Item</th>
              <th style={{ ...S.th, width: 170 }}>Service schedule</th>
              <th style={{ ...S.th, width: 110, textAlign: 'right' }}>Visits / Term</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? WASH : 'transparent' }}>
                <td style={S.td}>{i + 1}</td>
                <td style={S.td}>
                  <b>{s.name}</b>
                  {s.billingOnly && (
                    <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1.5px 7px', borderRadius: 3, background: '#EEF2F4', color: INK2 }}>billing only</span>
                  )}
                  {s.description && <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>{s.description}</div>}
                  {s.billingOnly && <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>Recurring dues — bills on its payment cadence; no service visits are scheduled for this item.</div>}
                </td>
                <td style={S.td}>{s.scheduleLabel}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{s.visitsLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* SCHEDULE B */}
    {data.commercial.length > 0 && (
      <div style={{ marginBottom: 30 }}>
        <SchedHead tag="Schedule B" title="Commercial Terms" />
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Item</th>
                  <th style={{ ...S.th, width: 110 }}>Payment cadence</th>
                  <th style={{ ...S.th, width: 85, textAlign: 'right' }}>Rate</th>
                  <th style={{ ...S.th, width: 75, textAlign: 'right' }}>Payments</th>
                  <th style={{ ...S.th, width: 95, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.commercial.map((c, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? WASH : 'transparent' }}>
                    <td style={S.td}><b>{c.name}</b></td>
                    <td style={S.td}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1.5px 7px', borderRadius: 3, background: c.isCadence ? 'rgba(13,148,136,.09)' : '#EEF2F4', color: c.isCadence ? BRAND_DARK : INK2 }}>
                        {c.cadenceLabel}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{c.rate}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{c.payments}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{c.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.totals.note && <p style={{ fontSize: 10.5, color: INK2, fontStyle: 'italic', marginTop: 8 }}>{data.totals.note}</p>}
          </div>
          <div style={{ width: 290, flexShrink: 0 }}>
            <div style={{ border: `1px solid ${LINE}`, borderBottom: 'none', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
              {data.totals.rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', fontSize: 12, borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ color: INK2 }}>{r.label}</span><span>{r.amount}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: INK, color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: '0 0 6px 6px' }}>
              <span>{data.totals.grand.label}</span><span>{data.totals.grand.amount}</span>
            </div>
            {data.totals.inWords && <div style={{ fontSize: 10.5, color: INK2, fontStyle: 'italic', marginTop: 8 }}>{data.totals.inWords}</div>}
          </div>
        </div>
      </div>
    )}

    {/* SCHEDULE C */}
    {data.payments.length > 0 && (
      <div style={{ marginBottom: 30 }}>
        <SchedHead tag="Schedule C" title="Payment Schedule" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 28 }}>#</th>
              <th style={{ ...S.th, width: 110 }}>Due date</th>
              <th style={S.th}>Description</th>
              <th style={{ ...S.th, width: 110, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((p, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? WASH : 'transparent' }}>
                <td style={S.td}>{i + 1}</td>
                <td style={S.td}>{p.date}</td>
                <td style={S.td}>{p.description}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{p.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 10.5, color: INK2, fontStyle: 'italic', marginTop: 6 }}>
          Amounts are tax-inclusive per instalment and sum exactly to the Total in Schedule B. Dates follow the contract start; individual dates may be adjusted by mutual agreement before invoicing.
        </p>
      </div>
    )}

    {/* TERMS — the contract's own text blocks */}
    <div style={{ marginBottom: 30 }}>
      <SchedHead tag="Terms" title="Acceptance & Conditions" />
      {data.termsSections.map((t, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{t.heading}</div>
          <div
            style={{ fontSize: 11, color: INK2, lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: t.html }}
          />
        </div>
      ))}
      <p style={{ fontSize: 11, color: INK2, lineHeight: 1.8 }}>{data.acceptanceLine}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, marginTop: 44 }}>
        <div>
          <div style={{ height: 52 }} />
          <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 8, fontSize: 11, fontWeight: 700 }}>{data.signature.providerLabel}</div>
          <div style={{ fontSize: 10, color: INK2, marginTop: 2 }}>Authorised signatory · Name & date</div>
        </div>
        <div>
          <div style={{ height: 52 }} />
          <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 8, fontSize: 11, fontWeight: 700 }}>{data.signature.customerLabel}</div>
          <div style={{ fontSize: 10, color: INK2, marginTop: 2 }}>{data.signature.customerNote}</div>
        </div>
      </div>
    </div>

    {/* FOOTER */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 14, borderTop: `1px solid ${LINE}`, fontSize: 9.5, color: INK2 }}>
      <span>{data.doc.cnak ? <>Verify authenticity: <b style={{ color: BRAND_DARK }}>{data.doc.cnak}</b></> : 'ContractNest'}</span>
      <span>{data.doc.number} · Generated {data.doc.generatedOn}</span>
    </div>
  </div>
);

export default ContractDocument;

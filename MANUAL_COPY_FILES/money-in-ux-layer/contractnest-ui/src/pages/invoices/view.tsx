// ============================================================================
// Invoices — viewer (/invoices/:invoiceId) · WIRED
// ----------------------------------------------------------------------------
// The document page for ANY invoice — contract-linked or ad-hoc. Ad-hoc
// invoices had no page at all before this (the old viewer is routed through a
// contract and reads line items from the contract's blocks); this one reads
// the invoice record itself via get_invoice_detail.
// Same paper design as the contract-invoice page: white printable card on the
// left, Payment Summary / Invoice Details / Receipts sidecar on the right.
// ============================================================================

import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import {
  fmtMoney, fmtDate, useInvoiceTheme, useStatusMeta, Pill, FreeReceiptsBadge,
  InvoicePaper, DocTh, SideCard, EmptyState, paperInk, paperSub, paperFaint,
} from './ui';
import { useInvoiceDetail } from './useInvoiceDetail';

const InvoiceViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { currentTenant } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const statusMeta = useStatusMeta();
  const brand = colors.brand.primary;
  const receiptsRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading, isError, refetch } = useInvoiceDetail(invoiceId);

  if (isLoading) {
    return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (isError || !invoice) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/money-in')} className="inline-flex items-center gap-1.5 text-xs font-bold mb-4" style={sub}>
          <ArrowLeft size={14} /> Money In
        </button>
        <EmptyState title="Invoice not found" hint="It may have been removed, or it belongs to the other environment (Live/Test)." />
        <div className="text-center mt-4">
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const overdue = invoice.balance > 0.001 && !!invoice.due_date &&
    new Date(invoice.due_date) < new Date() && invoice.status !== 'draft' && invoice.status !== 'cancelled';
  const meta = statusMeta(
    (invoice.status === 'overdue' ? 'unpaid' : invoice.status === 'bad_debt' ? 'cancelled' : invoice.status) as any,
    overdue
  );
  const StatusIcon = invoice.status === 'paid' ? CheckCircle2 : Clock;
  const lines = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const receipts = Array.isArray(invoice.receipts) ? invoice.receipts : [];
  const subtotal = invoice.amount ?? lines.reduce((s, l) => s + (l.amount || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* app chrome — outside the document */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/money-in')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
            style={{ ...sub, borderColor: `${colors.utility.primaryText}20` }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-lg font-extrabold leading-tight" style={ink}>Invoice {invoice.invoice_number}</h1>
            <p className="text-[11px]" style={sub}>
              {invoice.contract_number ? `· ${invoice.contract_number}` : '· Ad-hoc — no contract'}
            </p>
          </div>
        </div>
        <Pill label={meta.label} color={meta.color} />
      </div>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* ═══════ LEFT: the document ═══════ */}
        <InvoicePaper
          brand={brand}
          brandSecondary={colors.brand.secondary}
          businessName={currentTenant?.name || 'Your Business'}
          invoiceNumber={invoice.invoice_number}
          issuedDate={fmtDate(invoice.issued_at)}
          dueDate={fmtDate(invoice.due_date)}
          dueDateColor={overdue ? '#EF4444' : undefined}
          invoiceToName={invoice.contact_name || '—'}
          invoiceToLines={invoice.contract_number ? [] : ['No membership contract — settled directly']}
          billToRows={[
            { label: 'Total Due', value: <b>{fmtMoney(invoice.balance > 0 ? invoice.balance : invoice.total_amount, invoice.currency)}</b> },
            ...(invoice.contract_number ? [{ label: 'Contract', value: invoice.contract_number }] : []),
          ]}
          table={
            <>
              <thead>
                <tr style={{ backgroundColor: `${brand}0D` }}>
                  <DocTh brand={brand}>#</DocTh>
                  <DocTh brand={brand}>Item</DocTh>
                  <DocTh brand={brand} right>Rate</DocTh>
                  <DocTh brand={brand} right>Qty</DocTh>
                  <DocTh brand={brand} right>Total</DocTh>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-sm" style={{ color: paperFaint }}>No line items recorded on this invoice</td></tr>
                ) : lines.map((l, idx) => (
                  <tr key={idx} className="border-t" style={{ borderColor: '#f9fafb' }}>
                    <td className="py-3 px-4 text-sm" style={{ color: paperFaint }}>{idx + 1}</td>
                    <td className="py-3 px-4 text-sm font-semibold" style={{ color: paperInk }}>{l.name}</td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#374151' }}>{fmtMoney(l.unit_price || 0, invoice.currency)}</td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#374151' }}>{l.qty ?? 1}</td>
                    <td className="py-3 px-4 text-sm font-bold text-right" style={{ color: paperInk }}>{fmtMoney(l.amount || 0, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </>
          }
          subtotal={subtotal}
          taxRows={(invoice.tax_amount || 0) > 0 ? [{ label: 'Tax', amount: invoice.tax_amount }] : []}
          grandTotal={invoice.total_amount}
          amountPaid={invoice.amount_paid}
          balanceDue={invoice.balance}
          currency={invoice.currency}
          notes={invoice.notes}
        />

        {/* ═══════ RIGHT: sidecar ═══════ */}
        <div className="space-y-4">
          {invoice.balance > 0.001 && invoice.status !== 'draft' && invoice.contract_id && (
            <button
              onClick={() => navigate(`/contracts/${invoice.contract_id}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: colors.semantic.success }}
            >
              <Wallet className="h-4 w-4" /> Record Payment
            </button>
          )}

          <SideCard title="Payment Summary">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span style={sub}>Invoice Total</span>
                <span className="font-bold" style={ink}>{fmtMoney(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={sub}>Amount Paid</span>
                <span className="font-semibold" style={{ color: '#10B981' }}>{fmtMoney(invoice.amount_paid, invoice.currency)}</span>
              </div>
              <hr style={{ borderColor: `${colors.utility.primaryText}10` }} />
              <div className="flex justify-between text-sm">
                <span className="font-semibold" style={ink}>Balance Due</span>
                <span className="font-bold" style={{ color: invoice.balance > 0 ? '#F59E0B' : '#10B981' }}>{fmtMoney(invoice.balance, invoice.currency)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mt-1" style={{ backgroundColor: `${meta.color}14` }}>
                <StatusIcon className="h-4 w-4" style={{ color: meta.color }} />
                <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
              </div>
            </div>
          </SideCard>

          <SideCard title="Invoice Details">
            <div className="space-y-2.5">
              {[
                { label: 'Type', value: invoice.is_adhoc ? 'Ad-hoc' : (invoice.invoice_type || 'Receivable').replace(/\b\w/g, (c) => c.toUpperCase()) },
                { label: 'Date Issued', value: fmtDate(invoice.issued_at) },
                { label: 'Due Date', value: fmtDate(invoice.due_date) },
                ...(invoice.paid_at ? [{ label: 'Paid On', value: fmtDate(invoice.paid_at) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={sub}>{label}</span>
                  <span className="font-semibold" style={ink}>{value}</span>
                </div>
              ))}
              <button
                onClick={() => receiptsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full flex justify-between text-xs"
              >
                <span style={sub}>Receipts</span>
                <span className="font-semibold underline underline-offset-2" style={{ color: brand }}>{receipts.length}</span>
              </button>
            </div>
          </SideCard>

          <div ref={receiptsRef}>
            <SideCard title="Receipts" trailing={<FreeReceiptsBadge />}>
              {receipts.length === 0 ? (
                <p className="py-2 text-center text-xs" style={sub}>Nothing received yet.</p>
              ) : (
                <div className="space-y-3">
                  {receipts.map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-2 h-2 rounded-full flex-none"
                        style={{ backgroundColor: r.cancelled_at ? colors.utility.secondaryText : colors.semantic.success }} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold" style={ink}>
                          {fmtMoney(r.amount, r.currency || invoice.currency)} · {r.payment_method}
                          {r.cancelled_at && <span className="font-normal" style={sub}> · cancelled</span>}
                        </p>
                        <p className="text-[11px] truncate" style={sub}>
                          {r.receipt_number} · {fmtDate(r.payment_date)}{r.reference_number ? ` · ref ${r.reference_number}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SideCard>
          </div>

          {invoice.contract_id && (
            <button
              onClick={() => navigate(`/contracts/${invoice.contract_id}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold"
              style={{ color: brand, borderColor: `${brand}40`, backgroundColor: `${brand}0d` }}
            >
              <FileText size={14} /> View contract {invoice.contract_number}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewPage;

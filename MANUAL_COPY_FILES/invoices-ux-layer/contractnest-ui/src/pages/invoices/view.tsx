// ============================================================================
// Invoices — viewer (/invoices/:invoiceId) · UX layer
// Same design as the contract-invoice page (pages/contracts/invoice): white
// document paper on the left, Payment Summary + Invoice Details sidecar on
// the right. Renders contract-linked AND ad-hoc invoices — this page is the
// answer to "an ad-hoc invoice has no page of its own".
// ============================================================================

import React, { useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import {
  fmtMoney, fmtDate, useInvoiceTheme, useStatusMeta, Pill, FreeReceiptsBadge,
  InvoicePaper, DocTh, SideCard, EmptyState, paperInk, paperSub, paperFaint,
} from './ui';
import { SAMPLE_INVOICES, TODAY_ISO, detailFor } from './sampleData';
import { isOverdue, openBalance } from './types';

const InvoiceViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { currentTenant } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const statusMeta = useStatusMeta();
  const brand = colors.brand.primary;
  const receiptsRef = useRef<HTMLDivElement>(null);

  const invoice = useMemo(() => {
    const summary = SAMPLE_INVOICES.find((i) => i.id === invoiceId);
    return summary ? detailFor(summary) : null;
  }, [invoiceId]);

  if (!invoice) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/invoices')} className="inline-flex items-center gap-1.5 text-xs font-bold mb-4" style={sub}>
          <ArrowLeft size={14} /> All invoices
        </button>
        <EmptyState title="Invoice not found" hint="It may have been removed, or the link is stale." />
      </div>
    );
  }

  const overdue = isOverdue(invoice, TODAY_ISO);
  const meta = statusMeta(invoice.status, overdue);
  const balance = openBalance(invoice);
  const subtotal = invoice.lines.reduce((s, l) => s + l.rate * l.qty, 0);
  const taxTotal = invoice.lines.reduce((s, l) => s + (l.rate * l.qty * l.tax_rate) / 100, 0);
  const StatusIcon = invoice.status === 'paid' ? CheckCircle2 : Clock;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* page bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
            style={{ ...sub, borderColor: `${colors.utility.primaryText}20` }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-lg font-extrabold leading-tight" style={ink}>Invoice {invoice.invoice_number}</h1>
            <p className="text-[11px]" style={sub}>{invoice.contract_number ? `· ${invoice.contract_number}` : '· Ad-hoc — no contract'}</p>
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
          issuedDate={fmtDate(invoice.issued_date)}
          dueDate={fmtDate(invoice.due_date)}
          dueDateColor={overdue ? '#EF4444' : undefined}
          invoiceToName={invoice.contact_name || '—'}
          invoiceToLines={invoice.contract_number ? [] : ['No membership contract — settled directly']}
          billToRows={[
            { label: 'Total Due', value: <b>{fmtMoney(balance > 0 ? balance : invoice.total_amount, invoice.currency)}</b> },
            ...(invoice.contract_number ? [{ label: 'Contract', value: invoice.contract_number }] : []),
          ]}
          table={
            <>
              <thead>
                <tr style={{ backgroundColor: `${brand}0D` }}>
                  <DocTh brand={brand}>#</DocTh>
                  <DocTh brand={brand}>Item</DocTh>
                  <DocTh brand={brand}>Description</DocTh>
                  <DocTh brand={brand} right>Rate</DocTh>
                  <DocTh brand={brand} right>Qty</DocTh>
                  <DocTh brand={brand} right>Total</DocTh>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l, idx) => (
                  <tr key={l.id} className="border-t" style={{ borderColor: '#f9fafb' }}>
                    <td className="py-3 px-4 text-sm" style={{ color: paperFaint }}>{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold" style={{ color: paperInk }}>{l.name}</div>
                      {l.category && <div className="text-[0.65rem] mt-0.5" style={{ color: paperFaint }}>{l.category}</div>}
                    </td>
                    <td className="py-3 px-4 text-sm max-w-[200px]" style={{ color: paperSub }}>{l.description || '—'}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: '#374151' }}>{fmtMoney(l.rate, invoice.currency)}</td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#374151' }}>{l.qty}</td>
                    <td className="py-3 px-4 text-sm font-bold text-right" style={{ color: paperInk }}>
                      {fmtMoney(l.rate * l.qty * (1 + l.tax_rate / 100), invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          }
          subtotal={subtotal}
          taxRows={taxTotal > 0 ? [{ label: 'Tax', amount: taxTotal }] : []}
          grandTotal={invoice.total_amount}
          amountPaid={invoice.amount_settled}
          balanceDue={balance}
          currency={invoice.currency}
          notes={invoice.notes}
        />

        {/* ═══════ RIGHT: sidecar ═══════ */}
        <div className="space-y-4">
          {balance > 0.001 && invoice.status !== 'draft' && (
            <button
              onClick={() => vaniToast.info('Record Payment wires to the existing receipt flow in the next batch.')}
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
                <span className="font-semibold" style={{ color: '#10B981' }}>{fmtMoney(invoice.amount_settled, invoice.currency)}</span>
              </div>
              <hr style={{ borderColor: `${colors.utility.primaryText}10` }} />
              <div className="flex justify-between text-sm">
                <span className="font-semibold" style={ink}>Balance Due</span>
                <span className="font-bold" style={{ color: balance > 0 ? '#F59E0B' : '#10B981' }}>{fmtMoney(balance, invoice.currency)}</span>
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
                { label: 'Type', value: invoice.contract_id ? 'Receivable' : 'Ad-hoc' },
                { label: 'Date Issued', value: fmtDate(invoice.issued_date) },
                { label: 'Due Date', value: fmtDate(invoice.due_date) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={sub}>{label}</span>
                  <span className="font-semibold" style={ink}>{value}</span>
                </div>
              ))}
              {/* Receipts count is a link, not static text (2026-08-09 note) */}
              <button
                onClick={() => receiptsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full flex justify-between text-xs"
              >
                <span style={sub}>Receipts</span>
                <span className="font-semibold underline underline-offset-2" style={{ color: brand }}>{invoice.receipts.length}</span>
              </button>
            </div>
          </SideCard>

          <div ref={receiptsRef}>
            <SideCard title="Receipts" trailing={<FreeReceiptsBadge />}>
              {invoice.receipts.length === 0 ? (
                <p className="py-2 text-center text-xs" style={sub}>Nothing received yet — record the first payment and it appears here.</p>
              ) : (
                <div className="space-y-3">
                  {invoice.receipts.map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-2 h-2 rounded-full flex-none" style={{ backgroundColor: colors.semantic.success }} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold" style={ink}>{fmtMoney(r.amount, invoice.currency)} · {r.method}</p>
                        <p className="text-[11px] truncate" style={sub}>{fmtDate(r.received_on)}{r.reference ? ` · ref ${r.reference}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SideCard>
          </div>

          {invoice.contract_id && (
            <button
              onClick={() => vaniToast.info('Opens the contract once wiring lands.')}
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

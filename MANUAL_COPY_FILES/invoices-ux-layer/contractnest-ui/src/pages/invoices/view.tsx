// ============================================================================
// Invoices — viewer (/invoices/:invoiceId) · UX layer
// The document IS the page: app chrome (back, actions) sits on the grey page
// background, the branded InvoiceDocumentFrame carries everything financial.
// Renders contract-linked and ad-hoc invoices alike — this page is the answer
// to "an ad-hoc invoice has no page of its own".
// ============================================================================

import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wallet, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import {
  fmtMoney, fmtDate, useInvoiceTheme, useStatusMeta, Pill, FreeReceiptsBadge,
  InvoiceDocumentFrame, EmptyState,
} from './ui';
import { SAMPLE_INVOICES, TODAY_ISO, detailFor } from './sampleData';
import { isOverdue, openBalance } from './types';

const InvoiceViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { currentTenant } = useAuth();
  const { colors, ink, sub, card, hairline } = useInvoiceTheme();
  const statusMeta = useStatusMeta();
  const brand = colors.brand.primary;

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
  const open = openBalance(invoice);
  const subtotal = invoice.lines.reduce((s, l) => s + l.rate * l.qty, 0);
  const tax = invoice.lines.reduce((s, l) => s + (l.rate * l.qty * l.tax_rate) / 100, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* app chrome — outside the document */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <button onClick={() => navigate('/invoices')} className="inline-flex items-center gap-1.5 text-xs font-bold" style={sub}>
          <ArrowLeft size={14} /> All invoices
        </button>
        <div className="flex items-center gap-2">
          <Pill label={meta.label} color={meta.color} />
          {open > 0.001 && invoice.status !== 'draft' && (
            <button
              onClick={() => vaniToast.info('Record Payment wires to the existing receipt flow in the next batch.')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: colors.semantic.success }}
            >
              <Wallet size={14} /> Record payment
            </button>
          )}
        </div>
      </div>

      {/* the document */}
      <InvoiceDocumentFrame
        businessName={currentTenant?.name || 'Your Business'}
        businessSub={null}
        metaRows={[
          { label: 'Invoice #', value: invoice.invoice_number },
          { label: 'Date issued', value: fmtDate(invoice.issued_date) },
          { label: 'Due date', value: fmtDate(invoice.due_date) },
        ]}
        billToName={invoice.contact_name || '—'}
        billToSub={invoice.contract_number
          ? <>Contract <span className="font-semibold" style={ink}>{invoice.contract_number}</span></>
          : 'No membership contract — settled directly'}
      >
        {/* lines */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b" style={hairline}>
                {['#', 'Item', 'Rate', 'Qty', 'Tax', 'Total'].map((h, i) => (
                  <th key={h} className={`py-2 text-[10px] font-bold uppercase tracking-wider ${i >= 2 ? 'text-right' : ''}`} style={sub}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l, idx) => (
                <tr key={l.id} className="border-b last:border-b-0" style={hairline}>
                  <td className="py-2.5 text-xs" style={sub}>{idx + 1}</td>
                  <td className="py-2.5 text-sm font-semibold pr-4" style={ink}>{l.name}</td>
                  <td className="py-2.5 text-xs text-right tabular-nums" style={sub}>{fmtMoney(l.rate, invoice.currency)}</td>
                  <td className="py-2.5 text-xs text-right tabular-nums" style={sub}>{l.qty}</td>
                  <td className="py-2.5 text-xs text-right tabular-nums" style={sub}>{l.tax_rate ? `${l.tax_rate}%` : '—'}</td>
                  <td className="py-2.5 text-sm font-bold text-right tabular-nums" style={ink}>
                    {fmtMoney(l.rate * l.qty * (1 + l.tax_rate / 100), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* totals */}
        <div className="flex justify-end mt-4">
          <div className="w-full max-w-xs space-y-1.5">
            {tax > 0 && (
              <>
                <div className="flex justify-between text-xs" style={sub}><span>Subtotal</span><span className="tabular-nums">{fmtMoney(subtotal, invoice.currency)}</span></div>
                <div className="flex justify-between text-xs" style={sub}><span>Tax</span><span className="tabular-nums">{fmtMoney(tax, invoice.currency)}</span></div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t" style={hairline}>
              <span className="text-sm font-bold" style={ink}>Grand total</span>
              <span className="text-lg font-extrabold tabular-nums" style={{ color: brand }}>{fmtMoney(invoice.total_amount, invoice.currency)}</span>
            </div>
            {invoice.amount_settled > 0 && (
              <div className="flex justify-between text-xs" style={{ color: colors.semantic.success }}>
                <span className="font-semibold">Received</span>
                <span className="tabular-nums font-bold">{fmtMoney(invoice.amount_settled, invoice.currency)}</span>
              </div>
            )}
            {open > 0.001 && invoice.status !== 'draft' && (
              <div className="flex justify-between text-xs" style={{ color: overdue ? colors.semantic.error : colors.utility.primaryText }}>
                <span className="font-semibold">Balance due</span>
                <span className="tabular-nums font-extrabold">{fmtMoney(open, invoice.currency)}</span>
              </div>
            )}
          </div>
        </div>

        {invoice.notes && (
          <p className="mt-5 text-xs rounded-lg px-3 py-2 border" style={{ ...sub, ...hairline }}>{invoice.notes}</p>
        )}
      </InvoiceDocumentFrame>

      {/* receipts — outside the document card, part of the working record */}
      <div className="mt-5 rounded-2xl border overflow-hidden" style={card}>
        <div className="px-4 py-3 flex items-center justify-between border-b" style={hairline}>
          <p className="text-sm font-bold" style={ink}>
            Receipts <span className="font-normal" style={sub}>· {invoice.receipts.length}</span>
          </p>
          <FreeReceiptsBadge />
        </div>
        {invoice.receipts.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs" style={sub}>
            Nothing received yet — record the first payment and it appears here.
          </p>
        ) : (
          invoice.receipts.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3 border-b last:border-b-0" style={hairline}>
              <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: colors.semantic.success }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={ink}>{fmtMoney(r.amount, invoice.currency)} · {r.method}</p>
                <p className="text-[11px] truncate" style={sub}>{fmtDate(r.received_on)}{r.reference ? ` · ref ${r.reference}` : ''}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {invoice.contract_id && (
        <button
          onClick={() => vaniToast.info('Opens the contract once wiring lands — the document above is already the full record.')}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
          style={{ color: brand }}
        >
          View contract {invoice.contract_number} <ExternalLink size={12} />
        </button>
      )}
    </div>
  );
};

export default InvoiceViewPage;

// src/pages/settings/businessmodel/tenants/billing/index.tsx
//
// NEW ROUTE — /businessmodel/tenants/billing
//
// The room the product did not have. Until now, paying existed ONLY as one
// uninterrupted click at the moment of subscribing: create contract, raise
// invoice, open Razorpay, all in a single handler. Dismiss that popup or
// close the tab and there was no route back to your own bill — no page
// showed an unpaid invoice, a failed attempt, or a receipt.
//
// Three jobs, in the order a tenant needs them:
//   1. What do I owe right now, and how do I settle it
//   2. What did I buy, and where are the receipts
//   3. What happened to the payment I already tried
//
// Nothing here creates a contract, an invoice or a receipt. Paying hands an
// EXISTING invoice to the existing checkout — useCreateOrder ->
// payment-gateway -> verify_gateway_payment -> record_invoice_payment, the
// system's single money-writer. This page only decides which invoice.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, Loader2, ArrowUpRight, Receipt, CreditCard,
  CheckCircle2, XCircle, Clock, FileText,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import {
  useBillingOverview, billingOverviewKeys,
  type OutstandingInvoice, type HistoryEntry, type PaymentAttempt,
} from '@/hooks/queries/useBillingOverview';
import { useCreateOrder, type VerifyPaymentResponse } from '@/hooks/queries/usePaymentGatewayQueries';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtWhen = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) : '—';

// An abandoned checkout and a declined card both end in "nothing happened"
// for the tenant. Naming which one occurred is the difference between
// someone who retries and someone who raises a support ticket.
const ATTEMPT_COPY: Record<string, { label: string; tone: 'ok' | 'bad' | 'idle' }> = {
  paid:      { label: 'Paid',              tone: 'ok' },
  failed:    { label: 'Declined',          tone: 'bad' },
  cancelled: { label: 'Cancelled',         tone: 'idle' },
  expired:   { label: 'Expired',           tone: 'idle' },
  pending:   { label: 'Not completed',     tone: 'idle' },
  created:   { label: 'Not completed',     tone: 'idle' },
};

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useVaNiToast();

  const { data: ov, isLoading, error } = useBillingOverview();

  useEffect(() => {
    analyticsService.trackPageView('settings/businessmodel/tenants/billing', 'Billing');
  }, []);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingContractId, setPayingContractId] = useState<string | null>(null);
  const payLabel = useRef<string>('');
  const createOrder = useCreateOrder(payingContractId ?? undefined);

  const clearPay = () => { setPayingId(null); setPayingContractId(null); };

  const razorpay = useRazorpayCheckout({
    contractId: payingContractId ?? undefined,
    businessName: ov?.seller?.name || 'ContractNest',
    prefill: { email: user?.email },
    onPaymentVerified: (_r: VerifyPaymentResponse) => {
      queryClient.invalidateQueries({ queryKey: billingOverviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tenant-context'] });
      addToast({ type: 'success', title: 'Payment received', message: `${payLabel.current} is settled.` });
      clearPay();
    },
    onPaymentFailed: clearPay,
    onDismiss: () => {
      addToast({
        type: 'warning',
        title: 'Payment not completed',
        message: 'Nothing was charged. The bill is still here whenever you are ready.',
      });
      clearPay();
    },
  });

  const pay = async (inv: OutstandingInvoice) => {
    payLabel.current = inv.invoice_number || inv.label;
    setPayingId(inv.invoice_id);
    setPayingContractId(inv.contract_id);
    try {
      const order = await createOrder.mutateAsync({
        invoice_id: inv.invoice_id, amount: inv.balance, currency: inv.currency,
      });
      razorpay.openCheckout(order);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Could not start payment', message: err?.message || 'Please try again.' });
      clearPay();
    }
  };

  const surface: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}18`,
    borderRadius: 16,
  };
  const dim = colors.utility.secondaryText;
  const ink = colors.utility.primaryText;
  const ok = colors.semantic?.success || '#0d9464';
  const warn = colors.semantic?.warning || '#D97706';
  const bad = colors.semantic?.error || '#DC2626';

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm" style={{ color: dim }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your bills…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-2 p-4 rounded-xl text-sm" style={{ backgroundColor: `${bad}15`, color: ink }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Could not load your bills. {(error as Error)?.message || 'Please try again.'}</span>
        </div>
      </div>
    );
  }

  const outstanding = ov?.outstanding.invoices ?? [];
  const total = ov?.outstanding.total ?? 0;
  const history = ov?.history ?? [];
  const attempts = ov?.attempts ?? [];
  const symbol = getCurrencySymbol(outstanding[0]?.currency || 'INR');
  const busy = !!payingId;

  // Only surfaced when there is something outstanding — a declined attempt on
  // an invoice that has since been paid is history, not a call to action.
  const lastFailure = total > 0
    ? attempts.find((a) => a.status === 'failed' && outstanding.some((i) => i.invoice_id === a.invoice_id))
    : undefined;

  const statusChip = (status: HistoryEntry['status']) => {
    const map = {
      paid:      { c: ok,   t: 'Paid' },
      activated: { c: ok,   t: 'Activated' },
      unpaid:    { c: warn, t: 'Unpaid' },
      cancelled: { c: dim,  t: 'Cancelled' },
    } as const;
    const s = map[status] ?? map.cancelled;
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ backgroundColor: `${s.c}18`, color: s.c }}>
        {s.t}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-1" style={{ color: ink }}>Billing</h1>
        <p className="text-sm" style={{ color: dim }}>
          What you owe, what you have bought, and what happened to each payment.
        </p>
      </div>

      {/* ── OUTSTANDING ──────────────────────────────────────────────── */}
      {total > 0 ? (
        <div style={{ ...surface, borderColor: `${warn}55` }} className="p-6 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: warn }}>
                {lastFailure ? 'Payment declined' : 'Outstanding'}
              </span>
              <div className="text-4xl font-extrabold leading-none mt-2" style={{ color: warn }}>
                {symbol}{Number(total).toLocaleString()}
              </div>
              <p className="text-sm mt-3 max-w-md" style={{ color: dim }}>
                {lastFailure
                  ? 'Your bank declined the card — no money left your account, and nothing about your plan changed. Try again, use another card, or pay by UPI.'
                  : `Across ${outstanding.length} ${outstanding.length === 1 ? 'bill' : 'bills'}.`}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {outstanding.map((inv) => (
              <div key={inv.invoice_id}
                   className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl"
                   style={{ backgroundColor: `${ink}06` }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: ink }}>
                      {symbol}{Number(inv.balance).toLocaleString()}
                    </span>
                    <span className="text-xs font-mono" style={{ color: dim }}>{inv.invoice_number}</span>
                    {inv.is_overdue && (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${bad}18`, color: bad }}>Overdue</span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: dim }}>
                    {inv.label}
                    {inv.contract_number ? ` · ${inv.contract_number}` : ''}
                    {inv.due_date ? ` · due ${fmtDate(inv.due_date)}` : ''}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={() => pay(inv)}
                        className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                        style={{ backgroundColor: warn, color: '#fff' }}>
                  {payingId === inv.invoice_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {payingId === inv.invoice_id ? 'Opening…' : lastFailure ? 'Retry payment' : 'Pay now'}
                </button>
              </div>
            ))}
          </div>

          {/* The seller has no online gateway. Never a raw failure: the buyer
              did nothing wrong and there is a real path forward. */}
          {ov?.seller && !ov.seller.online && (
            <div className="flex items-start gap-2 p-3 rounded-xl mt-4" style={{ backgroundColor: `${warn}12` }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
              <div className="text-xs" style={{ color: ink }}>
                <span className="font-semibold">
                  {ov.seller.name || 'The seller'} can&rsquo;t take card payments right now.
                </span>
                <span style={{ color: dim }}>
                  {' '}They have been notified and will contact you to settle this
                  {ov.seller.offline_upi ? ', or you can pay them by UPI.' : '.'}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...surface, borderColor: `${ok}44` }} className="p-5 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: ok }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: ink }}>Everything is settled.</p>
            <p className="text-xs mt-0.5" style={{ color: dim }}>No bills are outstanding.</p>
          </div>
        </div>
      )}

      {/* ── PURCHASE HISTORY ─────────────────────────────────────────── */}
      <div style={surface} className="mb-5 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: `1px solid ${ink}12` }}>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" style={{ color: dim }} />
            <h2 className="text-sm font-semibold" style={{ color: ink }}>Purchase history</h2>
          </div>
          <span className="text-xs" style={{ color: dim }}>every charge and receipt</span>
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: dim }}>
            Nothing bought yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  {['Date', 'What', 'Reference', 'Amount', 'Status', ''].map((h, i) => (
                    <th key={h || i}
                        className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 whitespace-nowrap ${i === 3 ? 'text-right' : 'text-left'}`}
                        style={{ color: dim, borderBottom: `1px solid ${ink}0d` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const owed = h.status === 'unpaid';
                  const inv = outstanding.find((i) => i.invoice_id === h.invoice_id);
                  return (
                    <tr key={h.invoice_id} style={{ borderBottom: `1px solid ${ink}0a` }}>
                      <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: dim }}>{fmtDate(h.at)}</td>
                      <td className="px-5 py-3.5">
                        <div style={{ color: ink }}>{h.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: dim }}>
                          {h.sublabel}{h.contract_number ? ` · ${h.contract_number}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap" style={{ color: dim }}>
                        {h.reference || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold whitespace-nowrap" style={{ color: ink }}>
                        {getCurrencySymbol(h.currency)}{Number(h.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">{statusChip(h.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {owed && inv ? (
                          <button type="button" disabled={busy} onClick={() => pay(inv)}
                                  className="text-xs font-semibold disabled:opacity-60"
                                  style={{ color: colors.brand.primary }}>
                            Pay
                          </button>
                        ) : h.contract_id ? (
                          <button type="button"
                                  onClick={() => navigate(`/contracts/${h.contract_id}/invoice/${h.invoice_id}`)}
                                  className="text-xs font-semibold" style={{ color: colors.brand.primary }}>
                            {h.status === 'paid' ? 'Receipt' : 'View'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PAYMENT ATTEMPTS ─────────────────────────────────────────── */}
      {attempts.length > 0 && (
        <div style={surface} className="mb-5 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4"
               style={{ borderBottom: `1px solid ${ink}12` }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: dim }} />
              <h2 className="text-sm font-semibold" style={{ color: ink }}>Payment attempts</h2>
            </div>
            <span className="text-xs" style={{ color: dim }}>what happened each time</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  {['When', 'Method', 'Amount', 'Outcome'].map((h, i) => (
                    <th key={h}
                        className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 whitespace-nowrap ${i === 2 ? 'text-right' : 'text-left'}`}
                        style={{ color: dim, borderBottom: `1px solid ${ink}0d` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map((a: PaymentAttempt) => {
                  const copy = ATTEMPT_COPY[a.status] ?? { label: a.status, tone: 'idle' as const };
                  const tone = copy.tone === 'ok' ? ok : copy.tone === 'bad' ? bad : dim;
                  const Icon = copy.tone === 'ok' ? CheckCircle2 : copy.tone === 'bad' ? XCircle : Clock;
                  return (
                    <tr key={a.request_id} style={{ borderBottom: `1px solid ${ink}0a` }}>
                      <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: dim }}>{fmtWhen(a.at)}</td>
                      <td className="px-5 py-3.5" style={{ color: ink, textTransform: 'capitalize' }}>
                        {a.provider || '—'}{a.mode ? ` · ${a.mode.replace(/_/g, ' ')}` : ''}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold whitespace-nowrap" style={{ color: ink }}>
                        {getCurrencySymbol(a.currency)}{Number(a.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: tone }}>
                          <Icon className="w-3.5 h-3.5" />{copy.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={surface} className="p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: dim }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: ink }}>Your plan</h2>
            <p className="text-xs mt-0.5" style={{ color: dim }}>
              {ov?.plan ? `${ov.plan.name}${ov.plan.awaiting_payment ? ' — awaiting payment' : ''}` : 'No plan yet'}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/businessmodel/tenants/subscription')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
                style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}>
          Subscription <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BillingPage;

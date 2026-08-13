// src/pages/settings/businessmodel/tenants/Subscription/index.tsx
//
// "What am I on, and is it actually running?"
//
// Rebuilt against get_tenant_billing_overview (migration 038). Three things
// were wrong with the version this replaces, all of them the same mistake —
// reading a fact off the CONTRACT TERM that only the MONEY can answer:
//
//   1. An unpaid plan rendered as a live one. A quarterly plan on a 12-month
//      contract reported "365 DAYS LEFT" over four zeroed allowance cards,
//      while not a rupee had been paid. A plan that has not been paid for is
//      not running, so it never gets a term countdown — it gets the amount
//      owed and a way to pay it.
//
//   2. The countdown pointed at the contract's end date rather than the next
//      INSTALMENT. What a subscriber needs to know is when the next ₹5,999
//      leaves their account, not when the paperwork expires.
//
//   3. The zeros were left unexplained, so a dormant plan looked like a
//      broken page.
//
// Money is never written from this page. "Pay" hands an EXISTING invoice to
// the existing checkout (useCreateOrder -> payment-gateway ->
// verify_gateway_payment -> record_invoice_payment). Nothing new is created.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, Loader2, ArrowUpRight, Sparkles, Infinity as InfinityIcon,
  FileText, Send, Zap, CalendarClock, PauseCircle, CheckCircle2, Link2, CircleSlash,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { useTenantContext } from '@/hooks/queries/useTenantContext';
import { useWaitingCredits } from '@/hooks/queries/useWaitingCredits';
import { useBillingOverview, billingOverviewKeys } from '@/hooks/queries/useBillingOverview';
import { useCreateOrder, type VerifyPaymentResponse } from '@/hooks/queries/usePaymentGatewayQueries';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';

const ALLOWANCES = [
  { key: 'contracts', label: 'Contracts', icon: FileText, blurb: 'you create' },
  { key: 'rfqs', label: 'RFQs', icon: Send, blurb: 'you raise' },
] as const;

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', dot: '#25D366' },
  { key: 'email', label: 'Email', dot: '#0EA5E9' },
  { key: 'sms', label: 'SMS', dot: '#F59E0B' },
  { key: 'inapp', label: 'In-App', dot: '#8B5CF6' },
] as const;

const CYCLE_NOUN: Record<string, string> = {
  monthly: 'monthly', quarterly: 'quarterly', halfyearly: 'half-yearly',
  annual: 'annually', yearly: 'annually', prepaid: 'one payment',
};

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useVaNiToast();

  const { data: ctx } = useTenantContext();
  const { data: waiting } = useWaitingCredits();
  const { data: ov, isLoading, error } = useBillingOverview();

  useEffect(() => {
    analyticsService.trackPageView('settings/businessmodel/tenants/subscription', 'Subscription');
  }, []);

  // ── paying an invoice that ALREADY EXISTS ───────────────────────────
  // No contract is created and no invoice is raised here. This is the
  // resume path that has never existed: until now, payment lived only as
  // one uninterrupted click at the moment of subscribing, so dismissing
  // that popup left the tenant with no way back to their own bill.
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payingContractId, setPayingContractId] = useState<string | null>(null);
  const payLabel = useRef<string>('');
  const createOrder = useCreateOrder(payingContractId ?? undefined);

  const clearPay = () => { setPayingInvoiceId(null); setPayingContractId(null); };

  const razorpay = useRazorpayCheckout({
    contractId: payingContractId ?? undefined,
    businessName: ov?.seller?.name || 'ContractNest',
    prefill: { email: user?.email },
    onPaymentVerified: (_r: VerifyPaymentResponse) => {
      queryClient.invalidateQueries({ queryKey: billingOverviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tenant-context'] });
      addToast({ type: 'success', title: `${payLabel.current} is active`, message: 'Payment received — your plan is live.' });
      clearPay();
    },
    onPaymentFailed: clearPay,
    onDismiss: () => {
      addToast({
        type: 'warning',
        title: 'Payment not completed',
        message: 'Your bill is waiting for you under Billing whenever you are ready.',
      });
      clearPay();
    },
  });

  const payInvoice = async (invoiceId: string, contractId: string | null, amount: number, currency: string, label: string) => {
    payLabel.current = label;
    setPayingInvoiceId(invoiceId);
    setPayingContractId(contractId);
    try {
      const order = await createOrder.mutateAsync({ invoice_id: invoiceId, amount, currency });
      razorpay.openCheckout(order);
    } catch (err: any) {
      // payment-gateway returns a typed reason now (migration 037 + v7):
      // NO_GATEWAY / OFFLINE_ONLY carry the seller's name, so the tenant is
      // told who will contact them instead of seeing a bare 400.
      addToast({
        type: 'error',
        title: 'Could not start payment',
        message: err?.message || 'Please try again.',
      });
      clearPay();
    }
  };

  const plan = ov?.plan ?? null;
  const rhythm = ov?.rhythm;
  const awaiting = !!plan?.awaiting_payment;
  const symbol = getCurrencySymbol(plan?.currency || 'INR');

  // The bill that activates a pending plan — matched to the plan's own
  // contract so a wallet top-up sitting in the same list can't be paid by
  // the "activate my plan" button.
  const activatingInvoice = useMemo(() => {
    if (!ov || !plan) return null;
    return ov.outstanding.invoices.find((i) => i.contract_id === plan.contract_id) ?? null;
  }, [ov, plan]);

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
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your account…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-2 p-4 rounded-xl text-sm"
             style={{ backgroundColor: `${bad}15`, color: ink }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Could not load your account. {(error as Error)?.message || 'Please try again.'}</span>
        </div>
      </div>
    );
  }

  // No plan ever chosen. An ordinary state, not a failure.
  if (!ov?.has_account || !plan) {
    return (
      <div className="p-6 max-w-5xl">
        <div style={surface} className="p-10 flex flex-col items-center text-center gap-3">
          <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
          <h1 className="text-2xl font-extrabold" style={{ color: ink }}>No plan yet</h1>
          <p className="text-sm max-w-sm" style={{ color: dim }}>
            Pick a plan to start creating contracts and RFQs.
          </p>
          <button type="button" onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                  className="mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: colors.brand.primary, color: '#fff' }}>
            See plans <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const waitingTotal = waiting?.total ?? 0;
  const busy = !!payingInvoiceId;

  return (
    <div className="p-6 max-w-5xl">

      {/* ── HERO ─────────────────────────────────────────────────────
          Two entirely different states, never blended. An unpaid plan
          leads with what is OWED; a running plan leads with when the
          NEXT INSTALMENT falls due. Neither ever counts down the
          contract's end date, which is the bug being removed. */}
      <div style={{ ...surface, borderColor: awaiting ? `${warn}55` : `${ok}55` }} className="p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {awaiting ? (
                <>
                  <AlertCircle className="w-4 h-4" style={{ color: warn }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: warn }}>
                    Awaiting payment
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" style={{ color: ok }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ok }}>
                    Your plan
                  </span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-extrabold" style={{ color: ink }}>{plan.name}</h1>
            <p className="text-sm mt-1" style={{ color: dim }}>
              {Number(plan.amount) === 0
                ? 'Free'
                : rhythm && rhythm.total_installments > 1 && rhythm.next_due_amount != null
                  ? `${symbol}${Number(rhythm.next_due_amount).toLocaleString()} × ${rhythm.total_installments}${rhythm.cycle ? `, ${CYCLE_NOUN[rhythm.cycle] || rhythm.cycle}` : ''}`
                  : `${symbol}${Number(plan.amount).toLocaleString()}`}
              {plan.contract_number ? <> {' · '}contract {plan.contract_number}</> : null}
              {' · '}{fmtDate(plan.period_start)} → {fmtDate(plan.period_end)}
            </p>
          </div>

          {awaiting ? (
            <div className="text-right">
              <div className="text-4xl font-extrabold leading-none" style={{ color: warn }}>
                {symbol}{Number(activatingInvoice?.balance ?? plan.amount ?? 0).toLocaleString()}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: dim }}>
                due to activate
              </div>
            </div>
          ) : rhythm && typeof rhythm.days_to_next === 'number' && rhythm.source !== 'none' ? (
            <div className="text-right">
              <div className="text-4xl font-extrabold leading-none"
                   style={{ color: rhythm.is_overdue || Math.abs(rhythm.days_to_next) <= 7 ? warn : ink }}>
                {Math.abs(rhythm.days_to_next)}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: dim }}>
                {rhythm.is_overdue
                  ? (Math.abs(rhythm.days_to_next) === 1 ? 'day overdue' : 'days overdue')
                  : rhythm.days_to_next === 0 ? 'due today'
                  : rhythm.days_to_next === 1 ? 'day to next payment' : 'days to next payment'}
              </div>
            </div>
          ) : plan.days_remaining != null ? (
            <div className="text-right">
              <div className="text-4xl font-extrabold leading-none" style={{ color: ink }}>{plan.days_remaining}</div>
              <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: dim }}>days left</div>
            </div>
          ) : null}
        </div>

        {/* Nothing is live until the first payment clears — said plainly,
            because otherwise the zeros below read as "your plan gives you
            nothing" rather than "your plan has not started". */}
        {awaiting && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl"
               style={{ backgroundColor: `${warn}12` }}>
            <div className="flex items-start gap-2 text-sm" style={{ color: ink }}>
              <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
              <span>
                <span className="font-semibold">Your allowances start when this payment clears.</span>
                <span style={{ color: dim }}> Nothing below is active yet — that is why the counts read zero.</span>
              </span>
            </div>
            {activatingInvoice && (
              <button
                type="button"
                disabled={busy}
                onClick={() => payInvoice(
                  activatingInvoice.invoice_id, activatingInvoice.contract_id,
                  activatingInvoice.balance, activatingInvoice.currency, plan.name || 'Your plan',
                )}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                style={{ backgroundColor: warn, color: '#fff' }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {busy ? 'Opening…' : `Pay ${symbol}${Number(activatingInvoice.balance).toLocaleString()}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── THE SCHEDULE ──────────────────────────────────────────────
          The instalments, from the plan's own billing events. This is
          what makes "₹5,999/quarter on the card, ₹23,996 demanded at
          checkout" impossible to ship unnoticed. */}
      {rhythm && rhythm.source !== 'none' && (rhythm.schedule?.length ?? 0) > 0 && (
        <div style={surface} className="p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: ink }}>How this bills</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${ink}0a`, color: dim }}>
              {rhythm.paid_installments} of {rhythm.total_installments} paid
            </span>
          </div>

          <ol className="flex flex-col">
            {rhythm.schedule!.map((s, i) => {
              const isPaid = s.status === 'paid';
              const isNext = !isPaid && rhythm.next_due_date === s.date;
              const last = i === rhythm.schedule!.length - 1;
              return (
                <li key={`${s.sequence}-${s.date}`} className="grid items-start"
                    style={{ gridTemplateColumns: '104px 24px 1fr auto' }}>
                  <div className="text-xs pt-3 text-right pr-1" style={{ color: dim }}>{fmtDate(s.date)}</div>
                  <div className="flex flex-col items-center pt-3.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: isPaid ? ok : isNext ? warn : 'transparent',
                            border: `2px solid ${isPaid ? ok : isNext ? warn : `${ink}30`}`,
                            boxShadow: isNext ? `0 0 0 4px ${warn}22` : undefined,
                          }} />
                    {!last && <span className="w-0.5 flex-1 min-h-[30px]" style={{ backgroundColor: `${ink}12` }} />}
                  </div>
                  <div className="py-2.5">
                    <div className="text-sm font-medium"
                         style={{ color: isNext ? warn : isPaid ? ink : `${ink}99` }}>
                      {i === 0 && rhythm.paid_installments === 0
                        ? 'First payment — activates your plan'
                        : `Instalment ${s.sequence || i + 1}`}
                    </div>
                    {isPaid && <div className="text-xs mt-0.5" style={{ color: ok }}>Paid</div>}
                  </div>
                  <div className="pt-2.5 text-sm font-bold"
                       style={{ color: isNext ? warn : isPaid ? ink : `${ink}99` }}>
                    {symbol}{Number(s.amount).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ── QUEUED PLAN ───────────────────────────────────────────────
          Nothing creates one of these yet — buying while a plan runs
          still cancels the running one. Rendering it now means the day
          that capability lands, this page already shows the handover. */}
      {ov.next_plan && (
        <div style={{ ...surface, borderColor: `${colors.semantic?.info || '#3498db'}55` }} className="p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: colors.semantic?.info || '#3498db' }}>Up next · paid</span>
              <h2 className="text-lg font-bold mt-1" style={{ color: ink }}>{ov.next_plan.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: dim }}>
                Starts {fmtDate(ov.next_plan.starts_on)} — the moment {plan.name} ends. Nothing further is due.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold" style={{ color: ink }}>
                {symbol}{Number(ov.next_plan.amount ?? 0).toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: dim }}>already paid</div>
            </div>
          </div>
        </div>
      )}

      {/* ── OVER ALLOWANCE ──────────────────────────────────────────── */}
      {ctx?.flags?.over_limit && !awaiting && (
        <div style={{ ...surface, borderColor: `${warn}55` }}
             className="p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
            <div className="text-sm" style={{ color: ink }}>
              <span className="font-semibold">You are past a plan allowance.</span>
              <span style={{ color: dim }}> Nothing is blocked — you can keep creating. Move up a plan when it suits you.</span>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
                  style={{ backgroundColor: warn, color: '#fff' }}>
            See plans <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── RUNWAY ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {ALLOWANCES.map(({ key, label, icon: Icon, blurb }) => {
          const limit = ctx?.limits?.[key] as number | null | undefined;
          const used = (ctx?.usage?.[key] as number) ?? 0;
          const unlimited = limit === null;
          const left = unlimited ? null : Math.max((limit ?? 0) - used, 0);
          const notIncluded = limit === 0 && used === 0;
          const exhausted = !unlimited && !notIncluded && left === 0;
          const pct = unlimited || !limit ? 0 : Math.min(100, (used / limit) * 100);

          return (
            <div key={key} style={{ ...surface, opacity: awaiting ? 0.62 : 1 }} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: dim }} />
                <span className="text-sm font-semibold" style={{ color: ink }}>{label}</span>
                {awaiting && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${ink}0d`, color: dim }}>dormant</span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                {unlimited ? <InfinityIcon className="w-8 h-8" style={{ color: ink }} />
                  : notIncluded ? <span className="text-2xl font-bold leading-none" style={{ color: dim }}>—</span>
                  : <span className="text-4xl font-extrabold leading-none"
                          style={{ color: exhausted ? warn : awaiting ? dim : ink }}>{left ?? 0}</span>}
                <span className="text-sm" style={{ color: dim }}>
                  {unlimited ? 'unlimited' : notIncluded ? 'not in this plan'
                    : awaiting ? 'once payment clears' : `left to ${blurb}`}
                </span>
              </div>
              {!unlimited && !notIncluded && !awaiting && (
                <>
                  <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ backgroundColor: `${ink}12` }}>
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${pct}%`, backgroundColor: exhausted ? warn : ok }} />
                  </div>
                  <p className="text-xs mt-2" style={{ color: dim }}>
                    {used} of {limit} used
                    {used > (limit ?? 0) ? ` · ${used - (limit ?? 0)} over` : exhausted ? ' · limit reached' : ''}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CREDIT POOLS ─────────────────────────────────────────────── */}
      <div style={surface} className="p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold" style={{ color: ink }}>Notification credits</h2>
          {ctx?.flags?.credits_low && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${warn}18`, color: warn }}>Running low</span>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: dim }}>
          One pool per channel, shared across every contract. A credit is spent only when a
          notification actually reaches the provider — and credits never expire, so anything
          left is still yours when this plan ends.
        </p>

        {waitingTotal > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ backgroundColor: `${warn}12` }}>
            <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
            <div className="text-xs" style={{ color: ink }}>
              <span className="font-semibold">
                {waitingTotal} notification{waitingTotal === 1 ? '' : 's'} waiting for credits
              </span>
              <span style={{ color: dim }}> — nothing was lost. They send themselves as soon as the pool is topped up.</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CHANNELS.map(({ key, label, dot }) => {
            const balance = (ctx?.credits as Record<string, number> | undefined)?.[key] ?? 0;
            const rate = ctx?.credit_grant_rates?.[key];
            const enabled = (ctx?.flags as Record<string, boolean> | undefined)?.[`can_send_${key}`];
            const held = (waiting as unknown as Record<string, number> | undefined)?.[key] ?? 0;
            return (
              <div key={key}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: enabled ? dot : `${ink}30` }} />
                  <span className="text-xs font-medium" style={{ color: enabled ? ink : dim }}>{label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: balance > 0 ? ink : dim }}>{balance}</div>
                {held > 0 ? (
                  <p className="text-[11px] mt-0.5 font-semibold" style={{ color: warn }}>{held} waiting</p>
                ) : rate ? (
                  <p className="text-[11px] mt-0.5" style={{ color: ok }}>+{rate} per creation</p>
                ) : (
                  <p className="text-[11px] mt-0.5" style={{ color: dim }}>&nbsp;</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PLAN CONTINUITY ──────────────────────────────────────────
          The succession chain, walkable in both directions since
          migration 038. Before it, the only link was a JSONB key with
          no reverse pointer — you could read backwards but finding the
          plan that REPLACED a given one meant scanning every contract. */}
      {ov.continuity.length > 1 && (
        <div style={surface} className="p-5 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4" style={{ color: dim }} />
            <h2 className="text-sm font-semibold" style={{ color: ink }}>Plan history</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: dim }}>
            Every term, in order, each one pointing at the term it continues.
          </p>
          <ol className="flex flex-col">
            {ov.continuity.map((c, i) => {
              const last = i === ov.continuity.length - 1;
              // A gap: this term does not declare what it continues, and it
              // is not the first. The chain is broken here.
              const broken = i > 0 && !c.succeeds;
              return (
                <li key={c.contract_id} className="grid items-start" style={{ gridTemplateColumns: '24px 1fr auto' }}>
                  <div className="flex flex-col items-center pt-3.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: c.is_current ? (awaiting ? warn : ok) : 'transparent',
                            border: `2px solid ${c.is_current ? (awaiting ? warn : ok) : broken ? bad : `${ink}30`}`,
                          }} />
                    {!last && (
                      <span className="w-0.5 flex-1 min-h-[26px]"
                            style={{
                              backgroundColor: 'transparent',
                              borderLeft: broken ? `2px dashed ${bad}` : `2px solid ${ink}12`,
                            }} />
                    )}
                  </div>
                  <div className="py-2.5 pl-1">
                    <div className="text-sm font-medium" style={{ color: ink }}>
                      {c.contract_number} · {c.name}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: dim }}>
                      <span>{fmtDate(c.start_date)}</span>
                      <span style={{ textTransform: 'capitalize' }}>· {c.status.replace(/_/g, ' ')}</span>
                      {c.reason && <span>· {c.reason}</span>}
                      {broken && (
                        <span className="flex items-center gap-1 font-semibold" style={{ color: bad }}>
                          <CircleSlash className="w-3 h-3" /> link missing
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 text-sm font-semibold" style={{ color: dim }}>
                    {symbol}{Number(c.amount ?? 0).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ── ADD-ONS + navigation ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div style={surface} className="p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: ink }}>Add-ons</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { on: ctx?.addons?.vani_ai, label: 'VaNi AI' },
              { on: ctx?.addons?.rfp, label: 'RFP / Sourcing' },
            ].map(({ on, label }) => (
              <span key={label} className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{ backgroundColor: on ? `${ok}15` : `${ink}0a`, color: on ? ok : dim }}>
                <Zap className="w-3 h-3" />{label}{on ? '' : ' — off'}
              </span>
            ))}
          </div>
        </div>

        <div style={surface} className="p-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: ink }}>Bills &amp; receipts</h2>
            <p className="text-xs mt-1" style={{ color: dim }}>
              {ov.outstanding.total > 0
                ? `${symbol}${Number(ov.outstanding.total).toLocaleString()} outstanding`
                : 'Everything is settled.'}
            </p>
          </div>
          <button type="button" onClick={() => navigate('/businessmodel/tenants/billing')}
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
                  style={{
                    backgroundColor: ov.outstanding.total > 0 ? warn : `${colors.brand.primary}15`,
                    color: ov.outstanding.total > 0 ? '#fff' : colors.brand.primary,
                  }}>
            Billing <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;

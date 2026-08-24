// src/pages/settings/businessmodel/tenants/pricing-plans/index.tsx
//
// The plan catalogue a tenant subscribes to.
//
// Every plan here is a CONTRACT TEMPLATE authored by the platform tenant in
// catalog-studio — price, term, creation limits and notification credit grants
// all come from that template's metering blocks. Nothing about the commercial
// model is hardcoded in this file, which is the entire reason the model is
// authored rather than coded.
//
// This page previously rendered `fakePricingPlans` from a fixture, and its
// Subscribe button navigated to a route that was never registered. It is now
// wired to /api/catalog-studio/templates/plans.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Sparkles, AlertCircle, Loader2, CheckCircle2, Wallet, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { usePlanTemplates, PlanTemplate, planTemplateKeys } from '@/hooks/queries/usePlanTemplates';
import { useSubscribeToPlan, PlanSubscriptionResult } from '@/hooks/mutations/useSubscribeToPlan';
import { usePackTemplates, PackTemplate, packTemplateKeys } from '@/hooks/queries/usePackTemplates';
import { usePurchasePack, PackPurchaseResult } from '@/hooks/mutations/usePurchasePack';
import { useCreateOrder, type VerifyPaymentResponse } from '@/hooks/queries/usePaymentGatewayQueries';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';

// Creation limits are the only capped resources — the product bills whoever
// CREATES a contract or an RFQ; the counterparty consumes it for free.
const LIMIT_LABELS: Record<string, string> = {
  contracts: 'contracts',
  rfqs: 'RFQs',
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  inapp: 'In-App',
};

const formatTerm = (term: PlanTemplate['term']): string | null => {
  if (!term?.value || !term?.unit) return null;
  const unit = term.value === 1 ? term.unit.replace(/s$/, '') : term.unit;
  return `${term.value} ${unit}`;
};

// What the buyer is actually charged, and how often — the headline number on
// a card is the PAYMENT, not the term total. Quarterly bills ₹5,999 four
// times; leading with ₹23,996 made a mid-priced plan look like the dearest
// one and hid what leaves the account on day one.
const CYCLE_SUFFIX: Record<string, string> = {
  monthly: '/mo',
  quarterly: '/quarter',
  halfyearly: '/6 mo',
  annual: '/yr',
  yearly: '/yr',
};

const CYCLE_NOUN: Record<string, string> = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  halfyearly: 'half-yearly',
  annual: 'annually',
  yearly: 'annually',
};

const PricingPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { addToast } = useVaNiToast();
  const { data, isLoading, error } = usePlanTemplates();
  const plans: PlanTemplate[] = data?.data?.plans ?? [];

  // Server truth, not local state. The old version only knew you were
  // subscribed if you had clicked in this browser session — reload and every
  // card said "Subscribe" again, and you found out by getting a 409.
  const currentPlanId = data?.data?.current_plan_id ?? null;
  const currentContractNumber = data?.data?.current_contract_number ?? null;
  const isSubscribed = !!currentPlanId;

  // ── B6: can the seller actually take the money? ──────────────────────
  //
  // Checked BEFORE anything is bought, not at the checkout step. Previously
  // the only way to find out was to subscribe — which raised a real contract
  // AND a real invoice — and then fail on "Could not start payment", leaving
  // the tenant holding an invoice nobody could collect against.
  //
  // `undefined` means an older API build that predates this field. That is
  // "unknown", NOT "cannot": defaulting it to blocked would disable
  // purchasing for everyone the moment the UI shipped ahead of the edge
  // function. Only an explicit `online: false` gates the page.
  const seller = data?.data?.seller;
  const canPurchase = seller ? seller.online : true;
  const sellerName = seller?.name || 'The provider';
  const sellerTakesOfflineOnly = !!seller && !seller.online && seller.offline_upi;

  const subscribe = useSubscribeToPlan();
  // Tracked per plan so only the clicked card shows a spinner, not all of them.
  // Stays set for the ENTIRE flow — including the Razorpay popup — not just
  // the initial create call, so a second click can't fire while payment is
  // still being collected.
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  // The plan pending confirmation in the switch modal — separate from
  // pendingPlanId, which only tracks the in-flight mutation itself.
  const [switchTarget, setSwitchTarget] = useState<PlanTemplate | null>(null);

  const { data: packData, isLoading: packsLoading } = usePackTemplates();
  const packs: PackTemplate[] = packData?.data?.packs ?? [];
  const purchasePack = usePurchasePack();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  // The contract currently being paid for via the Razorpay popup — shared by
  // both plans and packs, since only one checkout can be open at a time.
  const [payingContractId, setPayingContractId] = useState<string | null>(null);
  const createOrder = useCreateOrder(payingContractId ?? undefined);

  // useRazorpayCheckout's callbacks are fixed at hook-creation time, but the
  // display label ("Quarterly" vs "Website Touchpoint") is only known per
  // click — a ref lets the checkout's own handler read whichever label is
  // current without re-creating the hook (and its SDK-loading effect) on
  // every click.
  const payingLabelRef = useRef<string>('');

  const clearPaymentState = () => {
    setPendingPlanId(null);
    setPendingPackId(null);
    setPayingContractId(null);
  };

  const razorpay = useRazorpayCheckout({
    contractId: payingContractId ?? undefined,
    businessName: 'ContractNest',
    prefill: { email: user?.email },
    // Money actually landed — the create call only raised the contract and
    // its invoice; limits/credits/flags are applied server-side
    // (fn_apply_contract_entitlements / fn_apply_topup_grants) inside
    // verify_gateway_payment's own transaction, so by the time this fires
    // the entitlement is already live — this just refetches so the UI
    // catches up.
    onPaymentVerified: (_result: VerifyPaymentResponse) => {
      queryClient.invalidateQueries({ queryKey: planTemplateKeys.list(undefined) });
      queryClient.invalidateQueries({ queryKey: packTemplateKeys.list(undefined) });
      queryClient.invalidateQueries({ queryKey: ['tenant-context'] });
      queryClient.invalidateQueries({ queryKey: ['business-model'] });
      addToast({
        type: 'success',
        title: `${payingLabelRef.current} is active`,
        message: 'Payment received — your plan is live.',
      });
      clearPaymentState();
    },
    // The contract + invoice already exist (created before checkout opened);
    // only the entitlement is missing. Nothing to roll back here — the
    // tenant can retry payment from this same card, so no card ever ends up
    // stuck between "Subscribe" and "Current plan".
    onPaymentFailed: clearPaymentState,
    onDismiss: () => {
      addToast({
        type: 'warning',
        title: 'Payment not completed',
        message: `${payingLabelRef.current} is on hold until payment clears. Retry any time from this page.`,
      });
      clearPaymentState();
    },
  });

  // Shared by both plans and packs: given a create-call result that requires
  // payment, raise the Razorpay order against the invoice already generated
  // server-side and open the checkout popup. Free plans/packs never call
  // this — their entitlement was already applied instantly.
  const collectPayment = async (
    contractId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    label: string,
  ) => {
    payingLabelRef.current = label;
    setPayingContractId(contractId);
    try {
      const order = await createOrder.mutateAsync({ invoice_id: invoiceId, amount, currency });
      razorpay.openCheckout(order);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not start payment',
        message: err?.message || 'Please try again.',
      });
      clearPaymentState();
    }
  };

  const handleSubscribe = (plan: PlanTemplate) => {
    // B6. A FREE plan is unaffected — there is nothing to collect, so an
    // unconfigured gateway is irrelevant to it. Only a priced plan is gated,
    // and it is gated here rather than at checkout so no contract and no
    // invoice are created for a purchase that cannot complete.
    if (plan.price > 0 && !canPurchase) {
      addToast({
        type: 'info',
        title: `${sellerName} will be in touch`,
        message: sellerTakesOfflineOnly
          ? `${sellerName} does not take card payments online. They have your request and will contact you to complete ${plan.name}.`
          : `Online payment is not set up for ${plan.name} yet. ${sellerName} has your request and will contact you with the next steps.`,
      });
      return;
    }

    setPendingPlanId(plan.id);
    subscribe.mutate(
      { templateId: plan.id },
      {
        onSuccess: async (result: PlanSubscriptionResult) => {
          // No local "subscribed" flag — the query is invalidated by the
          // mutation, so the card re-renders from current_plan_id.
          const label = result.was_switch ? `Switched to ${result.plan_name}` : `You are on ${result.plan_name}`;
          if (result.requires_payment && result.invoice_id) {
            addToast({
              type: 'info',
              title: label,
              message: `Contract ${result.contract_number} raised — complete payment to activate.`,
            });
            await collectPayment(
              result.contract_id,
              result.invoice_id,
              // The FIRST INSTALMENT activates the plan — not the whole term.
              // A quarterly plan asks for one quarter (same rule the
              // Subscription resume page already applies via due_now).
              result.due_now ?? result.invoice_amount ?? 0,
              result.invoice_currency ?? 'INR',
              result.plan_name,
            );
          } else {
            addToast({
              type: 'success',
              title: label,
              message: `Contract ${result.contract_number} is active.`,
            });
            setPendingPlanId(null);
          }
        },
        onError: (err: Error) => {
          addToast({
            type: 'error',
            title: 'Could not subscribe',
            message: err.message,
          });
          setPendingPlanId(null);
        },
      },
    );
  };

  // Switching is billed and forfeits whatever's unused on the current plan
  // — a confirm step first, same pattern the rest of the app uses for
  // destructive/billed actions (see DeleteConfirmModal in templates-list.tsx).
  const confirmSwitch = () => {
    if (!switchTarget) return;
    const plan = switchTarget;
    setSwitchTarget(null);
    handleSubscribe(plan);
  };

  const handleBuyPack = (pack: PackTemplate) => {
    // Same gate as plans (B6). Every pack is priced, so there is no free case
    // to exempt here.
    if (!canPurchase) {
      addToast({
        type: 'info',
        title: `${sellerName} will be in touch`,
        message: `${pack.name} cannot be bought online right now. ${sellerName} has your request and will contact you with the next steps.`,
      });
      return;
    }

    setPendingPackId(pack.id);
    purchasePack.mutate(
      { templateId: pack.id },
      {
        onSuccess: async (result: PackPurchaseResult) => {
          if (result.credits_pending && result.invoice_id) {
            addToast({
              type: 'info',
              title: `${result.pack_name} raised`,
              message: `Contract ${result.contract_number} — complete payment to unlock.`,
            });
            await collectPayment(
              result.contract_id,
              result.invoice_id,
              result.invoice_amount ?? 0,
              result.invoice_currency ?? 'INR',
              result.pack_name,
            );
          } else {
            addToast({
              type: 'success',
              title: `${result.pack_name} purchased`,
              message: `Contract ${result.contract_number}. Credits are in your balance now.`,
            });
            setPendingPackId(null);
          }
        },
        onError: (err: Error) => {
          addToast({
            type: 'error',
            title: 'Could not complete purchase',
            message: err.message,
          });
          setPendingPackId(null);
        },
      },
    );
  };

  useEffect(() => {
    analyticsService.trackPageView('businessmodel/tenants/pricing-plans', 'Pricing Plans');
  }, []);

  // The 'per_contract' plan card has no Subscribe action of its own — funding
  // the wallet IS what switches billing_mode to per_contract (see
  // fn_apply_topup_grants's wallet branch).
  //
  // B7. That button used to call scrollToPacks(). Scrolling is not an action:
  // it moved the page and left the user to work out, unaided, which of the
  // cards further down was the one that actually starts pay-as-you-go — and
  // it never said anywhere that a wallet starts at ₹1,000. The button now
  // BUYS the wallet top-up directly, and the card states the minimum before
  // it is clicked.
  //
  // There is exactly one wallet_topup template (₹1,000), and migration 037
  // stops a smaller one from ever being published, so "the wallet top-up" is
  // unambiguous. If more denominations are ever added this picks the
  // cheapest, which is the correct "get started" amount.
  const packsRef = useRef<HTMLDivElement>(null);
  const walletTopup = packs
    .filter((p) => p.wallet_paise > 0)
    .sort((a, b) => a.wallet_paise - b.wallet_paise)[0] ?? null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}20`,
    borderRadius: 16,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading plans…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div
          className="flex items-start gap-2 p-4 rounded-xl text-sm"
          style={{
            backgroundColor: `${colors.semantic?.error || '#DC2626'}15`,
            color: colors.utility.primaryText,
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Could not load plans. {(error as Error).message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: colors.utility.primaryText }}>
          Plans
        </h1>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          You are billed for what you create — contracts and RFQs. Anyone you
          share a record with can view and act on it at no cost to them.
        </p>
        {isSubscribed && currentContractNumber && (
          <p className="text-sm mt-2 flex items-center gap-1.5" style={{ color: colors.semantic?.success || '#0d9464' }}>
            <CheckCircle2 className="w-4 h-4" />
            Your plan is active under contract {currentContractNumber}.
          </p>
        )}
      </div>

      {/* B6. Said once, up front, rather than as a per-card failure. The
          catalogue stays fully visible and free plans stay usable — the only
          thing withdrawn is the promise that a priced plan can be paid for
          right now, which is a promise the system cannot currently keep. */}
      {!canPurchase && plans.length > 0 && (
        <div
          className="flex items-start gap-2 p-4 rounded-xl text-sm mb-5"
          style={{
            backgroundColor: `${colors.semantic?.warning || '#D97706'}12`,
            border: `1px solid ${colors.semantic?.warning || '#D97706'}40`,
            color: colors.utility.primaryText,
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.semantic?.warning || '#D97706' }} />
          <div>
            <span className="font-semibold">
              {sellerTakesOfflineOnly
                ? `${sellerName} does not take card payments online.`
                : `Online payment is not available right now.`}
            </span>{' '}
            <span style={{ color: colors.utility.secondaryText }}>
              You can still choose a plan below — {sellerName} will be notified and
              will contact you to complete it. Free plans activate immediately, as usual.
            </span>
          </div>
        </div>
      )}

      {plans.length === 0 && (
        <div
          className="flex items-start gap-2 p-4 rounded-xl text-sm"
          style={{ backgroundColor: `${colors.utility.primaryText}08`, color: colors.utility.secondaryText }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            No plans are published yet. Plans are authored in Catalog Studio by the
            platform tenant and appear here once published.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {plans.map((plan) => {
          // Pay-as-you-go, not a capped tier — no price/term/cap of its own,
          // so it gets its own card shape rather than forcing isFree/term
          // logic built for the three subscription plans to also fit this.
          if (plan.category === 'per_contract') {
            const rateEntries = Object.entries(plan.rates).filter(([, v]) => v > 0);
            const grantEntries = Object.entries(plan.grants).filter(([, v]) => v > 0);

            return (
              <div key={plan.id} style={cardStyle} className="overflow-hidden flex flex-col">
                <div className="p-5 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                      {plan.name}
                    </h2>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold" style={{ color: colors.utility.primaryText }}>
                      Pay as you go
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-sm mt-2" style={{ color: colors.utility.secondaryText }}>
                      {plan.description}
                    </p>
                  )}
                </div>

                <div className="px-5 pb-5 flex-1">
                  <ul className="space-y-2">
                    {rateEntries.map(([key, paise]) => (
                      <li
                        key={key}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: colors.utility.primaryText }}
                      >
                        <Check
                          className="w-4 h-4 mt-0.5 shrink-0"
                          style={{ color: colors.semantic?.success || '#0d9464' }}
                        />
                        <span>
                          <strong>{getCurrencySymbol(plan.currency)}{(paise / 100).toLocaleString()}</strong> per{' '}
                          {key === 'rfqs' ? 'RFQ' : 'contract'}
                        </span>
                      </li>
                    ))}

                    {grantEntries.length > 0 && (
                      <li className="flex items-start gap-2 text-sm" style={{ color: colors.utility.primaryText }}>
                        <Check
                          className="w-4 h-4 mt-0.5 shrink-0"
                          style={{ color: colors.semantic?.success || '#0d9464' }}
                        />
                        <span>
                          {grantEntries.map(([ch, n]) => `${n} ${CHANNEL_LABELS[ch] || ch}`).join(' + ')}{' '}
                          credits each time you create a contract or RFQ
                        </span>
                      </li>
                    )}

                    <li className="flex items-start gap-2 text-sm" style={{ color: colors.utility.primaryText }}>
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: colors.semantic?.success || '#0d9464' }}
                      />
                      <span>No cap, no term — pay only for what you create</span>
                    </li>

                    {/* B7. The minimum is stated as a feature of the model,
                        not as fine print discovered at the payment step. */}
                    {walletTopup && (
                      <li className="flex items-start gap-2 text-sm" style={{ color: colors.utility.primaryText }}>
                        <Check
                          className="w-4 h-4 mt-0.5 shrink-0"
                          style={{ color: colors.semantic?.success || '#0d9464' }}
                        />
                        <span>
                          Starts with a{' '}
                          <strong>
                            {getCurrencySymbol(walletTopup.currency)}
                            {(walletTopup.wallet_paise / 100).toLocaleString()}
                          </strong>{' '}
                          wallet top-up — the minimum. Each contract or RFQ you create is
                          drawn from that balance; top up again whenever it runs low.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="px-5 pb-5">
                  <button
                    type="button"
                    // Buys the wallet top-up outright. No scroll, no hunting
                    // for the right card further down the page.
                    onClick={() => walletTopup && handleBuyPack(walletTopup)}
                    disabled={!walletTopup || !!pendingPackId || !canPurchase}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                  >
                    {!walletTopup
                      ? 'Unavailable'
                      : !canPurchase
                        ? 'Not available online'
                        : pendingPackId === walletTopup.id
                          ? 'Starting…'
                          : `Add ${getCurrencySymbol(walletTopup.currency)}${(walletTopup.wallet_paise / 100).toLocaleString()} & get started`}
                  </button>
                  {walletTopup && canPurchase && (
                    <p className="text-[11px] mt-2 text-center" style={{ color: colors.utility.secondaryText }}>
                      One payment now. Nothing recurring.
                    </p>
                  )}
                </div>
              </div>
            );
          }

          const symbol = getCurrencySymbol(plan.currency);
          const term = formatTerm(plan.term);
          const isFree = plan.price === 0;
          const isCurrent = currentPlanId === plan.id;

          // Instalment-billed plans lead with the payment; single-payment
          // plans lead with the price (they are the same number there).
          const billing = plan.billing;
          const isInstalment = !!billing && billing.cycle !== 'prepaid' && billing.installments > 1;
          const headlineAmount = isInstalment ? billing!.installment_amount : plan.price;
          const headlineSuffix = isInstalment
            ? (CYCLE_SUFFIX[billing!.cycle] || `/${billing!.cycle}`)
            : (term ? `/ ${term}` : null);

          // Only surface caps that actually grant something. A 0 here is a real
          // cap ("may not create any"), so listing it as a feature would read
          // as a benefit when it is the opposite.
          const limitEntries = Object.entries(plan.limits).filter(([, v]) => v > 0);
          const grantEntries = Object.entries(plan.grants).filter(([, v]) => v > 0);

          return (
            <div
              key={plan.id}
              style={{
                ...cardStyle,
                // The plan you are on should be obvious before reading a button.
                borderColor: isCurrent ? colors.semantic?.success || '#0d9464' : `${colors.utility.primaryText}20`,
                borderWidth: isCurrent ? 2 : 1,
              }}
              className="overflow-hidden flex flex-col"
            >
              <div className="p-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {isFree && <Sparkles className="w-4 h-4" style={{ color: colors.brand.primary }} />}
                  <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                    {plan.name}
                  </h2>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold" style={{ color: colors.utility.primaryText }}>
                    {isFree ? 'Free' : `${symbol}${headlineAmount.toLocaleString()}`}
                  </span>
                  {!isFree && headlineSuffix && (
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      {headlineSuffix}
                    </span>
                  )}
                </div>

                {/* The full commitment, spelled out. An instalment plan's term
                    total is the number that actually matters when comparing
                    cards, so it stays visible — just not as the headline. */}
                {!isFree && isInstalment && (
                  <p className="text-xs mt-1.5" style={{ color: colors.utility.secondaryText }}>
                    {billing!.installments} payments billed {CYCLE_NOUN[billing!.cycle] || billing!.cycle}
                    {term ? ` over ${term}` : ''} ·{' '}
                    <strong style={{ color: colors.utility.primaryText }}>
                      {symbol}{plan.price.toLocaleString()} total
                    </strong>
                  </p>
                )}
                {!isFree && !isInstalment && term && (
                  <p className="text-xs mt-1.5" style={{ color: colors.utility.secondaryText }}>
                    One payment, upfront · covers {term}
                  </p>
                )}
                {isFree && (
                  <p className="text-xs mt-1.5" style={{ color: colors.utility.secondaryText }}>
                    No card required{term ? ` · renews every ${term}` : ''}
                  </p>
                )}

                {plan.description && (
                  <p className="text-sm mt-2" style={{ color: colors.utility.secondaryText }}>
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="px-5 pb-5 flex-1">
                <ul className="space-y-2">
                  {limitEntries.map(([key, value]) => (
                    <li
                      key={key}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: colors.semantic?.success || '#0d9464' }}
                      />
                      <span>
                        <strong>{value}</strong> {LIMIT_LABELS[key] || key}
                      </span>
                    </li>
                  ))}

                  {grantEntries.length > 0 && (
                    <li className="flex items-start gap-2 text-sm" style={{ color: colors.utility.primaryText }}>
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: colors.semantic?.success || '#0d9464' }}
                      />
                      <span>
                        {grantEntries.map(([ch, n]) => `${n} ${CHANNEL_LABELS[ch] || ch}`).join(' + ')}{' '}
                        credits each time you create a contract or RFQ
                      </span>
                    </li>
                  )}

                  {plan.flags.map((flag) => (
                    <li
                      key={flag}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: colors.semantic?.success || '#0d9464' }}
                      />
                      <span>{flag.replace(/^addon_/, '').replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-5 pb-5">
                {/* Three states, all driven by server truth:
                    · this IS the current plan  -> Current plan, no action
                    · subscribed to another one -> Switch, opens a confirm
                      modal first (billed + forfeits the current plan's
                      unused allowance — see SwitchConfirmModal)
                    · not subscribed            -> Subscribe                */}
                {isCurrent ? (
                  <div
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: `${colors.semantic?.success || '#0d9464'}15`,
                      color: colors.semantic?.success || '#0d9464',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Current plan
                  </div>
                ) : isSubscribed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSwitchTarget(plan)}
                      disabled={pendingPlanId !== null}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: `${colors.utility.primaryText}10`,
                        color: colors.utility.primaryText,
                      }}
                    >
                      Switch to {plan.name}
                    </button>
                    {/* The cost of switching, before the click — not only
                        inside the confirm modal. Switching forfeits the
                        current plan's unused allowance, which is not
                        something to discover after committing. */}
                    <p className="text-[11px] mt-1.5 text-center" style={{ color: colors.utility.secondaryText }}>
                      Ends your current plan · unused allowance is forfeited
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan)}
                      disabled={pendingPlanId !== null}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                    >
                      {pendingPlanId === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      {/* B6. A priced plan that cannot be paid for online is
                          not "Subscribe" — the word promises an outcome the
                          click cannot deliver. It asks instead, and the line
                          below says what happens next. A free plan is
                          untouched: nothing to collect, so it still
                          subscribes instantly. */}
                      {pendingPlanId === plan.id
                        ? 'Subscribing…'
                        : (!isFree && !canPurchase)
                          ? 'Request this plan'
                          : 'Subscribe'}
                    </button>
                    {!isFree && !canPurchase && (
                      <p className="text-[11px] mt-1.5 text-center" style={{ color: colors.utility.secondaryText }}>
                        {sellerName} will contact you to complete payment
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Credit packs & wallet top-ups ------------------------------------
          One section, one grid, for both — a wallet top-up is not a
          different page or a different purchase flow, it is the same
          "buy this from the platform" template + pack-purchase mechanism,
          just crediting the wallet instead of a notification pool. See
          usePackTemplates.ts / handleGetPackTemplates for why. */}
      {!packsLoading && packs.length > 0 && (
        <div className="mt-10" ref={packsRef}>
          <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
            Credit packs & wallet top-ups
          </h2>
          <p className="text-sm mb-5" style={{ color: colors.utility.secondaryText }}>
            One-time purchases on top of whatever your plan already grants. Credit
            packs stack with your plan's balance; a wallet top-up funds per-contract
            billing (₹200/contract, ₹400/RFQ, deducted as you create).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {packs.map((pack) => {
              const symbol = getCurrencySymbol(pack.currency);
              const isFree = pack.price === 0;
              const isWalletTopup = pack.wallet_paise > 0;
              const grantEntries = Object.entries(pack.grants).filter(([, v]) => v > 0);
              const isPending = pendingPackId === pack.id;

              return (
                <div key={pack.id} style={cardStyle} className="overflow-hidden flex flex-col">
                  <div className="p-5 pb-4">
                    <h3 className="text-base font-bold mb-2" style={{ color: colors.utility.primaryText }}>
                      {pack.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold" style={{ color: colors.utility.primaryText }}>
                        {isFree ? 'Free' : `${symbol}${pack.price.toLocaleString()}`}
                      </span>
                    </div>
                    {pack.description && (
                      <p className="text-sm mt-2" style={{ color: colors.utility.secondaryText }}>
                        {pack.description}
                      </p>
                    )}
                  </div>

                  <div className="px-5 pb-5 flex-1">
                    <ul className="space-y-2">
                      {isWalletTopup ? (
                        <li
                          className="flex items-start gap-2 text-sm"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <Check
                            className="w-4 h-4 mt-0.5 shrink-0"
                            style={{ color: colors.semantic?.success || '#0d9464' }}
                          />
                          <span>
                            <strong>{symbol}{(pack.wallet_paise / 100).toLocaleString()}</strong> added to your wallet
                          </span>
                        </li>
                      ) : (
                        <>
                          {grantEntries.map(([ch, n]) => (
                            <li
                              key={ch}
                              className="flex items-start gap-2 text-sm"
                              style={{ color: colors.utility.primaryText }}
                            >
                              <Check
                                className="w-4 h-4 mt-0.5 shrink-0"
                                style={{ color: colors.semantic?.success || '#0d9464' }}
                              />
                              <span>
                                <strong>{n}</strong> {CHANNEL_LABELS[ch] || ch} credits
                              </span>
                            </li>
                          ))}
                          {pack.flags.map((flag) => (
                            <li
                              key={flag}
                              className="flex items-start gap-2 text-sm capitalize"
                              style={{ color: colors.utility.primaryText }}
                            >
                              <Check
                                className="w-4 h-4 mt-0.5 shrink-0"
                                style={{ color: colors.semantic?.success || '#0d9464' }}
                              />
                              <span>{flag.replace(/^addon_extend_/, '').replace(/_/g, ' ')} channel unlocked</span>
                            </li>
                          ))}
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={() => handleBuyPack(pack)}
                      disabled={pendingPackId !== null}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                    >
                      {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isPending ? 'Processing…' : 'Buy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {plans.length > 0 && (
        <p className="text-xs mt-5" style={{ color: colors.utility.secondaryText }}>
          <button
            type="button"
            onClick={() => navigate('/businessmodel/tenants/subscription')}
            className="underline"
            style={{ color: colors.brand.primary }}
          >
            View current subscription
          </button>
        </p>
      )}

      <SwitchConfirmModal
        isOpen={switchTarget !== null}
        onClose={() => setSwitchTarget(null)}
        targetPlan={switchTarget}
        currentPlanName={plans.find((p) => p.id === currentPlanId)?.name ?? 'your current plan'}
        onConfirm={confirmSwitch}
        isLoading={pendingPlanId !== null}
        colors={colors}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

// Switching ends the current plan contract immediately (audit-trailed
// cancellation, not a silent status flip) and forfeits its unused
// allowance/credits — a real, billed consequence, so it gets a confirm step
// rather than firing straight off a card click. Same visual pattern as
// DeleteConfirmModal in catalog-studio/templates-list.tsx — this codebase's
// existing shape for a destructive-action confirm, not a new component kind.
const SwitchConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetPlan: PlanTemplate | null;
  currentPlanName: string;
  onConfirm: () => void;
  isLoading: boolean;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, targetPlan, currentPlanName, onConfirm, isLoading, colors }) => {
  if (!isOpen || !targetPlan) return null;

  const symbol = getCurrencySymbol(targetPlan.currency);
  const b = targetPlan.billing;
  const isInstalment = !!b && b.cycle !== 'prepaid' && b.installments > 1;
  // What is actually charged NOW — an instalment plan does not bill its term
  // total on day one, and saying it does would overstate the immediate cost.
  const priceLabel = targetPlan.price === 0
    ? 'Free'
    : isInstalment
      ? `${symbol}${b!.installment_amount.toLocaleString()} now (${b!.installments} × ${symbol}${b!.installment_amount.toLocaleString()}, ${symbol}${targetPlan.price.toLocaleString()} over the term)`
      : `${symbol}${targetPlan.price.toLocaleString()}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-xl border shadow-xl"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`,
          }}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colors.brand.primary}15` }}
              >
                <RefreshCw className="w-6 h-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                  Switch to {targetPlan.name}?
                </h3>
                <p className="mt-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                  This ends {currentPlanName} immediately and bills {priceLabel} for {targetPlan.name}.
                  Any unused contracts/RFQs and notification credits on {currentPlanName} are forfeited
                  — they do not carry over.
                </p>
              </div>
            </div>
          </div>

          <div
            className="px-6 py-4 border-t flex justify-end gap-3"
            style={{ borderColor: `${colors.utility.primaryText}20` }}
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50"
              style={{
                borderColor: `${colors.utility.secondaryText}40`,
                color: colors.utility.primaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Switch plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlansPage;

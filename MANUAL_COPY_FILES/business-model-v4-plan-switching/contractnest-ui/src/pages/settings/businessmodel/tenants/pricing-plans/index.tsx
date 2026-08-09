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
import { Check, Sparkles, AlertCircle, Loader2, CheckCircle2, Wallet, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { usePlanTemplates, PlanTemplate } from '@/hooks/queries/usePlanTemplates';
import { useSubscribeToPlan } from '@/hooks/mutations/useSubscribeToPlan';
import { usePackTemplates, PackTemplate } from '@/hooks/queries/usePackTemplates';
import { usePurchasePack } from '@/hooks/mutations/usePurchasePack';
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

const PricingPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { addToast } = useVaNiToast();
  const { data, isLoading, error } = usePlanTemplates();
  const plans: PlanTemplate[] = data?.data?.plans ?? [];

  // Server truth, not local state. The old version only knew you were
  // subscribed if you had clicked in this browser session — reload and every
  // card said "Subscribe" again, and you found out by getting a 409.
  const currentPlanId = data?.data?.current_plan_id ?? null;
  const currentContractNumber = data?.data?.current_contract_number ?? null;
  const isSubscribed = !!currentPlanId;

  const subscribe = useSubscribeToPlan();
  // Tracked per plan so only the clicked card shows a spinner, not all of them.
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  // The plan pending confirmation in the switch modal — separate from
  // pendingPlanId, which only tracks the in-flight mutation itself.
  const [switchTarget, setSwitchTarget] = useState<PlanTemplate | null>(null);

  const handleSubscribe = (plan: PlanTemplate) => {
    setPendingPlanId(plan.id);
    subscribe.mutate(
      { templateId: plan.id },
      {
        onSuccess: (result) => {
          // No local "subscribed" flag — the query is invalidated by the
          // mutation, so the card re-renders from current_plan_id.
          addToast({
            type: 'success',
            title: result.was_switch ? `Switched to ${result.plan_name}` : `You are on ${result.plan_name}`,
            message: `Contract ${result.contract_number} is active.`,
          });
        },
        onError: (err: Error) => {
          addToast({
            type: 'error',
            title: 'Could not subscribe',
            message: err.message,
          });
        },
        onSettled: () => setPendingPlanId(null),
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

  const { data: packData, isLoading: packsLoading } = usePackTemplates();
  const packs: PackTemplate[] = packData?.data?.packs ?? [];
  const purchasePack = usePurchasePack();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  const handleBuyPack = (pack: PackTemplate) => {
    setPendingPackId(pack.id);
    purchasePack.mutate(
      { templateId: pack.id },
      {
        onSuccess: (result) => {
          addToast({
            type: 'success',
            title: `${result.pack_name} purchased`,
            message: result.credits_pending
              ? `Contract ${result.contract_number} raised. Credits land once the invoice is paid.`
              : `Contract ${result.contract_number}. Credits are in your balance now.`,
          });
        },
        onError: (err: Error) => {
          addToast({
            type: 'error',
            title: 'Could not complete purchase',
            message: err.message,
          });
        },
        onSettled: () => setPendingPackId(null),
      },
    );
  };

  useEffect(() => {
    analyticsService.trackPageView('businessmodel/tenants/pricing-plans', 'Pricing Plans');
  }, []);

  // The 'per_contract' plan card has no Subscribe action of its own — funding
  // the wallet IS what switches billing_mode to per_contract (see
  // fn_apply_topup_grants's wallet branch), so its button scrolls down to the
  // wallet top-up purchase instead of pretending to be a second Subscribe.
  const packsRef = useRef<HTMLDivElement>(null);
  const scrollToPacks = () => packsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
                  </ul>
                </div>

                <div className="px-5 pb-5">
                  <button
                    type="button"
                    onClick={scrollToPacks}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                  >
                    Get started
                  </button>
                </div>
              </div>
            );
          }

          const symbol = getCurrencySymbol(plan.currency);
          const term = formatTerm(plan.term);
          const isFree = plan.price === 0;
          const isCurrent = currentPlanId === plan.id;

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
                    {isFree ? 'Free' : `${symbol}${plan.price.toLocaleString()}`}
                  </span>
                  {term && (
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      / {term}
                    </span>
                  )}
                </div>

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
                    Switch
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubscribe(plan)}
                    disabled={pendingPlanId !== null}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                  >
                    {pendingPlanId === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {pendingPlanId === plan.id ? 'Subscribing…' : 'Subscribe'}
                  </button>
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
                        grantEntries.map(([ch, n]) => (
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
                        ))
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
  const priceLabel = targetPlan.price === 0 ? 'Free' : `${symbol}${targetPlan.price.toLocaleString()}`;

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

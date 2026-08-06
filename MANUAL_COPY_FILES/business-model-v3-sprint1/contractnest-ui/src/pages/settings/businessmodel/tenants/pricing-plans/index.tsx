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

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { usePlanTemplates, PlanTemplate } from '@/hooks/queries/usePlanTemplates';

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

  const { data, isLoading, error } = usePlanTemplates();
  const plans: PlanTemplate[] = data?.data?.plans ?? [];

  useEffect(() => {
    analyticsService.trackPageView('businessmodel/tenants/pricing-plans', 'Pricing Plans');
  }, []);

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
          Choose a plan. You are billed for what you create — contracts and RFQs.
          Anyone you share a record with can view and act on it at no cost to them.
        </p>
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
          const symbol = getCurrencySymbol(plan.currency);
          const term = formatTerm(plan.term);
          const isFree = plan.price === 0;

          // Only surface caps that actually grant something. A 0 here is a real
          // cap ("may not create any"), so listing it as a feature would read
          // as a benefit when it is the opposite.
          const limitEntries = Object.entries(plan.limits).filter(([, v]) => v > 0);
          const grantEntries = Object.entries(plan.grants).filter(([, v]) => v > 0);

          return (
            <div key={plan.id} style={cardStyle} className="overflow-hidden flex flex-col">
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
                {/* Activation is Sprint 1 step 7: subscribing must create the
                    contact from this tenant's own record, raise the contract
                    under the platform tenant, and apply the plan's metering to
                    t_tenant_context. Until that exists the button stays
                    disabled rather than navigating to a route that does not
                    exist — which is what it did before. */}
                <button
                  type="button"
                  disabled
                  title="Activation is not wired up yet"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed"
                  style={{
                    backgroundColor: `${colors.utility.primaryText}10`,
                    color: colors.utility.secondaryText,
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {plans.length > 0 && (
        <p className="text-xs mt-5" style={{ color: colors.utility.secondaryText }}>
          Subscribing is not active yet — plans are shown here for review.{' '}
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
    </div>
  );
};

export default PricingPlansPage;

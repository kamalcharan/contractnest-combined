// src/pages/settings/businessmodel/tenants/Subscription/index.tsx
//
// The tenant's account statement — what you're on, what's left, what it costs.
//
// This page previously rendered `mockSubscription` and called
// API_ENDPOINTS.BUSINESS_MODEL.USAGE_SUMMARY, a constant that was never
// defined in serviceURLs — so the request threw on `undefined` and the mock
// was all anyone ever saw. It is now backed by get_tenant_context.
//
// The organising idea is RUNWAY, not utilisation. A percentage bar tells you
// how much of something you have consumed; what a tenant actually needs to
// know is how much is LEFT and how long they have to use it. So the headline
// numbers are "2 contracts left", "31 days left" — consumption is the small
// print underneath.
//
// Plan changes live on /businessmodel/tenants/pricing-plans (the catalogue).
// This page is "what I have"; that page is "what I could have".

import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Loader2, ArrowUpRight, Sparkles, Infinity as InfinityIcon,
  FileText, Send, Zap, CalendarClock, PauseCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { useTenantContext, TenantContext } from '@/hooks/queries/useTenantContext';
import { useWaitingCredits } from '@/hooks/queries/useWaitingCredits';

// Only creation is billed, so only creation has a runway. Contacts, users and
// templates are uncapped and deliberately absent.
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

const daysBetween = (from: Date, to: Date) =>
  Math.ceil((to.getTime() - from.getTime()) / 86_400_000);

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { data: ctx, isLoading, error } = useTenantContext();

  // Messages parked for want of credits. Deliberately not part of the context
  // query: it must never be able to fail the page it sits on.
  const { data: waiting } = useWaitingCredits();

  useEffect(() => {
    analyticsService.trackPageView(
      'settings/businessmodel/tenants/subscription',
      'Subscription',
    );
  }, []);

  const term = useMemo(() => {
    const start = ctx?.subscription?.period_start;
    const end = ctx?.subscription?.period_end;
    if (!start || !end) return null;
    const s = new Date(start), e = new Date(end), now = new Date();
    const total = Math.max(daysBetween(s, e), 1);
    const left = Math.max(daysBetween(now, e), 0);
    return { start: s, end: e, total, left, elapsedPct: Math.min(100, Math.max(0, ((total - left) / total) * 100)) };
  }, [ctx]);

  const surface: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}18`,
    borderRadius: 16,
  };
  const dim = colors.utility.secondaryText;
  const ink = colors.utility.primaryText;
  const ok = colors.semantic?.success || '#0d9464';
  const warn = colors.semantic?.warning || '#D97706';

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
             style={{ backgroundColor: `${colors.semantic?.error || '#DC2626'}15`, color: ink }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Could not load your account. {(error as Error)?.message || 'Please try again.'}</span>
        </div>
      </div>
    );
  }

  // A tenant with no t_tenant_context row yet — never subscribed, not a
  // failure. get_tenant_context reports this as success:false with no
  // limits/usage/credits payload at all, so this renders BEFORE any of the
  // sections below that assume those objects exist, rather than trying to
  // make every one of them null-safe.
  if (!ctx?.success) {
    return (
      <div className="p-6 max-w-5xl">
        <div style={surface} className="p-10 flex flex-col items-center text-center gap-3">
          <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
          <h1 className="text-2xl font-extrabold" style={{ color: ink }}>No plan yet</h1>
          <p className="text-sm max-w-sm" style={{ color: dim }}>
            Pick a plan to start creating contracts and RFQs.
          </p>
          <button
            type="button"
            onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
            className="mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5"
            style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
          >
            See plans <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const sub = ctx.subscription;
  const onPlan = !!sub?.contract_number;
  const symbol = getCurrencySymbol(sub?.currency || 'INR');
  const waitingTotal = waiting?.total ?? 0;

  return (
    <div className="p-6 max-w-5xl">
      {/* ── HERO: the plan, and how long is left on it ─────────────── */}
      <div style={{ ...surface, borderColor: onPlan ? `${ok}55` : `${ink}18` }} className="p-6 mb-5">
        {onPlan ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" style={{ color: ok }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ok }}>
                    Your plan
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold" style={{ color: ink }}>{sub.plan_name}</h1>
                <p className="text-sm mt-1" style={{ color: dim }}>
                  {Number(sub.amount) === 0 ? 'Free' : `${symbol}${Number(sub.amount).toLocaleString()}`}
                  {' · '}contract {sub.contract_number}
                  {' · '}{formatDate(sub.period_start)} → {formatDate(sub.period_end)}
                </p>
              </div>

              {/* Days left is the number that actually matters day to day, so
                  it gets the size — not a percentage of term consumed. */}
              {term && (
                <div className="text-right">
                  <div className="text-4xl font-extrabold leading-none"
                       style={{ color: term.left <= 7 ? warn : ink }}>
                    {term.left}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: dim }}>
                    days left
                  </div>
                </div>
              )}
            </div>

            {term && (
              <div className="mt-4">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${ink}12` }}>
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${term.elapsedPct}%`, backgroundColor: term.left <= 7 ? warn : ok }} />
                </div>
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: dim }}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Renews {formatDate(sub.next_billing_date)}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: ink }}>No plan yet</h1>
              <p className="text-sm mt-1" style={{ color: dim }}>
                Pick a plan to start creating contracts and RFQs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              See plans <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── OVER ALLOWANCE ─────────────────────────────────────────────
          Says it plainly and says it is not a block, because it isn't:
          enforcement is soft by decision, the create still goes through,
          and a tenant who thinks they are locked out stops working instead
          of upgrading. */}
      {ctx.flags?.over_limit && (
        <div style={{ ...surface, borderColor: `${warn}55` }}
             className="p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
            <div className="text-sm" style={{ color: ink }}>
              <span className="font-semibold">You are past a plan allowance.</span>
              <span style={{ color: dim }}>
                {' '}Nothing is blocked — you can keep creating. Move up a plan when it suits you.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
            style={{ backgroundColor: warn, color: '#fff' }}
          >
            See plans <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── RUNWAY: what is LEFT, not what is used ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {ALLOWANCES.map(({ key, label, icon: Icon, blurb }) => {
          const limit = ctx.limits[key] as number | null;
          const used = (ctx.usage[key] as number) ?? 0;
          const unlimited = limit === null;
          const left = unlimited ? null : Math.max((limit ?? 0) - used, 0);
          // A limit of 0 with nothing used is "not in this plan", not
          // "exhausted" — a seller plan sets rfqs to 0 on purpose. Same rule
          // the flag_over_limit trigger uses, so the card and the banner can
          // never disagree.
          const notIncluded = limit === 0 && used === 0;
          const exhausted = !unlimited && !notIncluded && left === 0;
          const pct = unlimited || !limit ? 0 : Math.min(100, (used / limit) * 100);

          return (
            <div key={key} style={surface} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: dim }} />
                <span className="text-sm font-semibold" style={{ color: ink }}>{label}</span>
              </div>

              <div className="flex items-baseline gap-2">
                {unlimited ? (
                  <InfinityIcon className="w-8 h-8" style={{ color: ink }} />
                ) : notIncluded ? (
                  <span className="text-2xl font-bold leading-none" style={{ color: dim }}>—</span>
                ) : (
                  <span className="text-4xl font-extrabold leading-none"
                        style={{ color: exhausted ? warn : ink }}>
                    {left}
                  </span>
                )}
                <span className="text-sm" style={{ color: dim }}>
                  {unlimited ? 'unlimited' : notIncluded ? 'not in this plan' : `left to ${blurb}`}
                </span>
              </div>

              {!unlimited && !notIncluded && (
                <>
                  <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ backgroundColor: `${ink}12` }}>
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${pct}%`, backgroundColor: exhausted ? warn : ok }} />
                  </div>
                  <p className="text-xs mt-2" style={{ color: dim }}>
                    {used} of {limit} used
                    {/* "over" rather than "reached": at 17 of 3, "limit
                        reached" reads like a wall the tenant already hit and
                        stopped at, which is not what happened. */}
                    {used > (limit ?? 0) ? ` · ${used - (limit ?? 0)} over` : exhausted ? ' · limit reached' : ''}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CREDIT POOLS ───────────────────────────────────────────── */}
      <div style={surface} className="p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold" style={{ color: ink }}>Notification credits</h2>
          {ctx.flags?.credits_low && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${warn}18`, color: warn }}>
              Running low
            </span>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: dim }}>
          One pool per channel, shared across every contract. A credit is spent only
          when a notification actually reaches the provider — and credits never expire,
          so anything left is still yours when this plan ends.
        </p>

        {/* Nothing is lost when a tenant runs dry: the message parks in a FIFO
            queue and is released automatically on the next top-up. Saying
            "waiting" rather than "failed" is the difference between a tenant
            who tops up and one who thinks they have to re-send everything. */}
        {waitingTotal > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-4"
               style={{ backgroundColor: `${warn}12` }}>
            <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
            <div className="text-xs" style={{ color: ink }}>
              <span className="font-semibold">
                {waitingTotal} notification{waitingTotal === 1 ? '' : 's'} waiting for credits
              </span>
              <span style={{ color: dim }}>
                {' — '}nothing was lost. They send themselves as soon as the pool is topped up.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CHANNELS.map(({ key, label, dot }) => {
            const balance = (ctx.credits as Record<string, number>)[key] ?? 0;
            const rate = ctx.credit_grant_rates?.[key];
            const enabled = (ctx.flags as Record<string, boolean>)[`can_send_${key}`];
            const held = (waiting as Record<string, number> | undefined)?.[key] ?? 0;
            return (
              <div key={key}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: enabled ? dot : `${ink}30` }} />
                  <span className="text-xs font-medium" style={{ color: enabled ? ink : dim }}>{label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: balance > 0 ? ink : dim }}>{balance}</div>
                {/* One line under each pool. A queue that is backing up is more
                    urgent than the grant rate, so it takes the slot when both
                    would apply. */}
                {held > 0 ? (
                  <p className="text-[11px] mt-0.5 font-semibold" style={{ color: warn }}>
                    {held} waiting
                  </p>
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

      {/* ── ADD-ONS + billing mode ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div style={surface} className="p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: ink }}>Add-ons</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { on: ctx.addons?.vani_ai, label: 'VaNi AI' },
              { on: ctx.addons?.rfp, label: 'RFP / Sourcing' },
            ].map(({ on, label }) => (
              <span key={label}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{
                      backgroundColor: on ? `${ok}15` : `${ink}0a`,
                      color: on ? ok : dim,
                    }}>
                <Zap className="w-3 h-3" />
                {label}{on ? '' : ' — off'}
              </span>
            ))}
          </div>
        </div>

        <div style={surface} className="p-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: ink }}>Change plan</h2>
            <p className="text-xs mt-1" style={{ color: dim }}>
              {onPlan ? 'Compare what else is available.' : 'Choose a plan to get started.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
          >
            Plans <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top-ups land here in Phase D. The blocker is no longer technical —
          packs got their channel back in 019 — it is that a pack should be a
          catalog-studio template with one metering block and a price, so that
          buying one raises a contract and the grant happens through the same
          trigger as everything else. Until that exists there is nothing
          honest to put behind a "Top up" button. */}
    </div>
  );
};

export default SubscriptionPage;

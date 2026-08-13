// src/pages/settings/businessmodel/tenants/usage/index.tsx
//
// NEW ROUTE — /businessmodel/tenants/usage
//
// ⚠️ UI ONLY — DELIBERATELY NOT WIRED TO DATA. ⚠️
//
// Every number on this page comes from the SAMPLE constants directly below.
// Nothing here queries anything. This is built to be looked at and argued
// with before it is connected, because the meter belongs on top of the JTD
// infrastructure and that conversation has not happened yet.
//
// WHEN IT IS WIRED, the sources already exist — none of this needs new data:
//   creation allowance  -> t_tenant_context.limit_* / usage_*
//   credit pools        -> t_tenant_context.credits_*
//   parked queue        -> useWaitingCredits (t_jtd awaiting credits)
//   consumption ledger  -> t_credit_journal (quantity/balance_before/after)
//   wallet balance      -> t_tenant_context.wallet_balance_paise
//   per-creation rates  -> the 'per_contract' plan template's metering block
// Swapping SAMPLE for those is the whole job; the layout does not change.
//
// THE ONE DESIGN RULE HERE: nudge on RUNWAY, never on balance. "340 credits"
// is not something a person can act on — it needs dividing by a send rate
// nobody knows. "11 days" is the same fact made decidable. Every threshold
// on this page is expressed in time or in units of work.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Gauge, FileText, Send, PauseCircle, ArrowUpRight, Info,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';

// ─────────────────────────────────────────────────────────────────────
// SAMPLE DATA — the only reason this file has numbers in it.
// Replace with the real sources listed in the header when wiring.
// ─────────────────────────────────────────────────────────────────────
const SAMPLE = {
  plan: {
    runwayDays: 11,
    runwayNote: 'You send about 62 WhatsApp a week. At that rate this pool runs dry around 24 Aug — four days before your term ends.',
    allowance: [
      { key: 'contracts', label: 'Contracts', icon: FileText, used: 12, limit: 50, included: true },
      { key: 'rfqs', label: 'RFQs', icon: Send, used: 0, limit: 0, included: false },
    ],
    pools: [
      { key: 'whatsapp', label: 'WhatsApp', dot: '#25D366', balance: 340, perWeek: 62, grant: 20, low: true, enabled: true },
      { key: 'email', label: 'Email', dot: '#0EA5E9', balance: 420, perWeek: 18, grant: 20, low: false, enabled: true },
      { key: 'sms', label: 'SMS', dot: '#F59E0B', balance: 0, perWeek: 0, grant: 0, low: false, enabled: false },
    ],
    waiting: 9,
    ledger: [
      { at: '13 Aug, 09:41', what: 'Reminder — CN-1031', sub: 'contract notification', pool: 'WhatsApp', delta: -1, left: 340 },
      { at: '13 Aug, 09:12', what: 'Contract created — CN-1044', sub: 'grant on creation', pool: 'WhatsApp', delta: +20, left: 341 },
      { at: '12 Aug, 18:03', what: 'Invoice sent — INV-10040', sub: 'contract notification', pool: 'Email', delta: -1, left: 420 },
    ],
  },
  wallet: {
    balance: 640,
    contractsLeft: 3,
    perContract: 200,
    perRfq: 150,
    spentThisMonth: 1360,
    creationsThisMonth: 6,
    topupMinimum: 1000,
    ledger: [
      { at: '13 Aug, 09:12', what: 'Contract created — CN-1044', delta: -200, left: 640 },
      { at: '11 Aug, 16:28', what: 'RFQ raised — RFQ-1009', delta: -150, left: 840 },
      { at: '09 Aug, 10:02', what: 'Wallet top-up', sub: 'INV-10031 · paid', delta: +1000, left: 990 },
    ],
  },
};

type Mode = 'plan' | 'wallet';

const UsagePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [mode, setMode] = useState<Mode>('plan');

  useEffect(() => {
    analyticsService.trackPageView('settings/businessmodel/tenants/usage', 'Usage');
  }, []);

  const surface: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}18`,
    borderRadius: 16,
  };
  const dim = colors.utility.secondaryText;
  const ink = colors.utility.primaryText;
  const ok = colors.semantic?.success || '#0d9464';
  const warn = colors.semantic?.warning || '#D97706';
  const brand = colors.brand.primary;

  const Bar = ({ pct, tone }: { pct: number; tone: string }) => (
    <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ backgroundColor: `${ink}12` }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tone }} />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-1" style={{ color: ink }}>Usage</h1>
        <p className="text-sm" style={{ color: dim }}>
          What you have left, how fast you are using it, and how long that lasts.
        </p>
      </div>

      {/* Honest banner. This page is a design under review, and a reader must
          not mistake sample figures for their own account. */}
      <div className="flex items-start gap-2 p-3 rounded-xl mb-5"
           style={{ backgroundColor: `${colors.semantic?.info || '#3498db'}12` }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.semantic?.info || '#3498db' }} />
        <div className="text-xs" style={{ color: ink }}>
          <span className="font-semibold">Sample figures — this page is not connected yet.</span>
          <span style={{ color: dim }}>
            {' '}Layout under review before it is wired to the meter. Nothing here reflects your account.
          </span>
        </div>
      </div>

      {/* Mode toggle. Two genuinely different commercial models, so two
          genuinely different meters — a plan tenant has allowances and pools,
          a pay-as-you-go tenant has a balance and a burn rate. */}
      <div className="inline-flex rounded-xl overflow-hidden mb-5" style={{ border: `1px solid ${ink}1f` }}>
        {([['plan', 'Plan meter', Gauge], ['wallet', 'Wallet meter', Wallet]] as const).map(([m, label, Icon]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
                  className="px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                  style={{
                    backgroundColor: mode === m ? ink : 'transparent',
                    color: mode === m ? colors.utility.secondaryBackground : dim,
                  }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {mode === 'plan' ? (
        <>
          {/* RUNWAY — the headline is time, not a count. */}
          <div style={{ ...surface, borderColor: `${warn}55` }} className="p-6 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: warn }}>
                  Credits · at your current rate
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold leading-none" style={{ color: warn }}>
                    {SAMPLE.plan.runwayDays}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: dim }}>days left</span>
                </div>
                <p className="text-sm mt-3 max-w-md" style={{ color: dim }}>{SAMPLE.plan.runwayNote}</p>
              </div>
              <button type="button" onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
                      style={{ backgroundColor: warn, color: '#fff' }}>
                Top up credits <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CREATION ALLOWANCE */}
          <div style={surface} className="p-5 mb-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold" style={{ color: ink }}>Creation allowance</h2>
              <span className="text-xs" style={{ color: dim }}>resets 21 Aug · does not carry over</span>
            </div>
            <p className="text-xs mb-4" style={{ color: dim }}>
              Only records <span style={{ fontWeight: 600 }}>you create</span> are counted. A counterparty
              viewing or acting on your contract costs you nothing.
            </p>
            <div className="flex flex-col gap-4">
              {SAMPLE.plan.allowance.map(({ key, label, icon: Icon, used, limit, included }) => {
                const left = Math.max(limit - used, 0);
                const pct = limit ? Math.min(100, (used / limit) * 100) : 100;
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="text-sm font-semibold flex items-center gap-2" style={{ color: ink }}>
                        <Icon className="w-4 h-4" style={{ color: dim }} />{label}
                      </span>
                      <span className="text-sm" style={{ color: dim }}>
                        {included
                          ? <><span className="font-bold" style={{ color: ink }}>{used}</span> of {limit} · {left} left</>
                          : 'not included in this plan'}
                      </span>
                    </div>
                    <Bar pct={pct} tone={included ? (left === 0 ? warn : ok) : `${ink}18`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* CREDIT POOLS */}
          <div style={surface} className="p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: ink }}>Notification credits</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${warn}18`, color: warn }}>WhatsApp running low</span>
            </div>

            <div className="flex flex-col gap-4">
              {SAMPLE.plan.pools.map((p) => (
                <div key={p.key}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="text-sm font-semibold flex items-center gap-2" style={{ color: p.enabled ? ink : dim }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.enabled ? p.dot : `${ink}30` }} />
                      {p.label}
                    </span>
                    <span className="text-sm" style={{ color: dim }}>
                      {p.enabled
                        ? <><span className="font-bold" style={{ color: ink }}>{p.balance}</span> · ~{p.perWeek}/wk · +{p.grant} per contract</>
                        : 'channel off in this plan'}
                    </span>
                  </div>
                  <Bar pct={p.enabled ? Math.min(100, (p.balance / 1800) * 100) : 100}
                       tone={!p.enabled ? `${ink}18` : p.low ? warn : ok} />
                </div>
              ))}
            </div>

            {/* The truest nudge the product has: a parked queue is a real
                consequence, and it is never a sales prompt — it says work is
                held, not that you should spend. */}
            {SAMPLE.plan.waiting > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl mt-5" style={{ backgroundColor: `${warn}12` }}>
                <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
                <div className="text-xs" style={{ color: ink }}>
                  <span className="font-semibold">{SAMPLE.plan.waiting} notifications are waiting for credits.</span>
                  <span style={{ color: dim }}>
                    {' '}Nothing was lost and nothing needs re-sending — they release themselves
                    the moment the pool is topped up.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CONSUMPTION LEDGER */}
          <div style={surface} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${ink}12` }}>
              <h2 className="text-sm font-semibold" style={{ color: ink }}>Recent consumption</h2>
              <span className="text-xs font-mono" style={{ color: dim }}>t_credit_journal</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    {['When', 'What used it', 'Pool', 'Change', 'Left'].map((h, i) => (
                      <th key={h} className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 whitespace-nowrap ${i > 2 ? 'text-right' : 'text-left'}`}
                          style={{ color: dim, borderBottom: `1px solid ${ink}0d` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE.plan.ledger.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${ink}0a` }}>
                      <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: dim }}>{r.at}</td>
                      <td className="px-5 py-3.5">
                        <div style={{ color: ink }}>{r.what}</div>
                        <div className="text-xs mt-0.5" style={{ color: dim }}>{r.sub}</div>
                      </td>
                      <td className="px-5 py-3.5" style={{ color: ink }}>{r.pool}</td>
                      <td className="px-5 py-3.5 text-right font-bold" style={{ color: r.delta < 0 ? warn : ok }}>
                        {r.delta > 0 ? `+${r.delta}` : r.delta}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold" style={{ color: ink }}>{r.left}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* WALLET — balance led by the unit the tenant thinks in. */}
          <div style={{ ...surface, borderColor: `${warn}55` }} className="p-6 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: warn }}>
                  Wallet balance
                </span>
                <div className="text-4xl font-extrabold leading-none mt-2" style={{ color: warn }}>
                  ₹{SAMPLE.wallet.balance.toLocaleString()}
                </div>
                <p className="text-sm mt-3 max-w-md" style={{ color: dim }}>
                  Enough for <span style={{ fontWeight: 700, color: ink }}>{SAMPLE.wallet.contractsLeft} more contracts</span>.
                  Below ₹{SAMPLE.wallet.perContract} you cannot create one at all, so we ask before you get
                  there — not after.
                </p>
              </div>
              <button type="button" onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
                      style={{ backgroundColor: warn, color: '#fff' }}>
                Add ₹{SAMPLE.wallet.topupMinimum.toLocaleString()} <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { k: 'Per contract', v: `₹${SAMPLE.wallet.perContract}`, m: '+15 WhatsApp, +15 Email' },
              { k: 'Per RFQ', v: `₹${SAMPLE.wallet.perRfq}`, m: '+15 WhatsApp, +15 Email' },
              { k: 'Runway', v: `${SAMPLE.wallet.contractsLeft}`, m: 'contracts at this balance' },
              { k: 'Spent this month', v: `₹${SAMPLE.wallet.spentThisMonth.toLocaleString()}`, m: `across ${SAMPLE.wallet.creationsThisMonth} creations` },
            ].map(({ k, v, m }) => (
              <div key={k} style={surface} className="p-4">
                <div className="text-xs font-semibold" style={{ color: dim }}>{k}</div>
                <div className="text-2xl font-extrabold mt-2" style={{ color: ink }}>{v}</div>
                <div className="text-[11px] mt-1.5" style={{ color: dim }}>{m}</div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl mb-5" style={{ backgroundColor: `${warn}12` }}>
            <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
            <div className="text-xs" style={{ color: ink }}>
              <span className="font-semibold">Top up before you are down to one.</span>
              <span style={{ color: dim }}>
                {' '}Creation is blocked the moment the balance will not cover it — a contract you are
                halfway through composing is the worst place to discover that.
              </span>
            </div>
          </div>

          <div style={surface} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${ink}12` }}>
              <h2 className="text-sm font-semibold" style={{ color: ink }}>Wallet ledger</h2>
              <span className="text-xs" style={{ color: dim }}>every debit and credit</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    {['When', 'What', 'Amount', 'Balance'].map((h, i) => (
                      <th key={h} className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}
                          style={{ color: dim, borderBottom: `1px solid ${ink}0d` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE.wallet.ledger.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${ink}0a` }}>
                      <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: dim }}>{r.at}</td>
                      <td className="px-5 py-3.5">
                        <div style={{ color: ink }}>{r.what}</div>
                        {'sub' in r && r.sub ? <div className="text-xs mt-0.5" style={{ color: dim }}>{r.sub}</div> : null}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold" style={{ color: r.delta < 0 ? warn : ok }}>
                        {r.delta > 0 ? '+' : '−'}₹{Math.abs(r.delta).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold" style={{ color: ink }}>
                        ₹{r.left.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div style={surface} className="p-5 mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: ink }}>Your plan</h2>
          <p className="text-xs mt-0.5" style={{ color: dim }}>What you are on, and what it bills.</p>
        </div>
        <button type="button" onClick={() => navigate('/businessmodel/tenants/subscription')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"
                style={{ backgroundColor: `${brand}15`, color: brand }}>
          Subscription <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UsagePage;

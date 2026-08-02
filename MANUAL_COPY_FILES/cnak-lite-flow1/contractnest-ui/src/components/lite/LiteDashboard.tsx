// src/components/lite/LiteDashboard.tsx
//
// The lite tenant's landing (rendered by /ops/cockpit instead of the full
// cockpit while liteTier is set). Three pieces, straight from the approved
// mocks:
//   1. Stat row      — their world at a glance (contracts, next visit, dues)
//   2. What needs you — upcoming service/billing events from claimed contracts
//   3. Hero cross-sell — the permanent problem-led card ("Who's watching
//      everything else?"), flavor-specific, CTA → express onboarding.
//
// Read-only + existing hooks only (useContracts / useContractEvents), so it
// works with exactly the data a lite tenant has: the claimed contract(s).

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CalendarClock, Wallet, Layers, ArrowRight, KeyRound, HelpCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useContracts } from '../../hooks/queries/useContractQueries';
import { useContractEvents } from '../../hooks/queries/useContractEventQueries';
import { VaNiLoader } from '../../components/common/loaders';
import { LiteFlavor, LITE_TRIAL } from '../../utils/constants/liteAccess';
import LiteRegistryIntel from './LiteRegistryIntel';
import LiteWalkover, { resetWalkover } from './LiteWalkover';
import type { ContractEvent } from '../../types/contractEvents';

interface LiteDashboardProps {
  flavor: LiteFlavor;
}

const DONE_STATUSES = new Set(['completed', 'cancelled', 'paid', 'skipped']);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const fmtMoney = (n: number, currency?: string | null) =>
  `${currency === 'INR' || !currency ? '₹' : currency + ' '}${Math.round(n).toLocaleString('en-IN')}`;

const LiteDashboard: React.FC<LiteDashboardProps> = ({ flavor }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;
  // Bumping this replays the walkover (the component also auto-runs once
  // per tenant on first visit).
  const [walkoverRun, setWalkoverRun] = useState(0);

  const { data: contractsData, isLoading: contractsLoading } = useContracts({ page: 1, per_page: 25 });
  const { data: eventsData, isLoading: eventsLoading } = useContractEvents({
    page: 1,
    per_page: 50,
    sort_by: 'scheduled_date',
    sort_order: 'asc'
  });

  // The workspace can hold two record kinds: real contracts and RFQ records
  // claimed via CNAK (a vendor's received requests). They must never be
  // conflated — "1 active contract" while the contracts list shows zero is
  // the contradiction that confused the first vendor tester.
  const allRecords = contractsData?.items || [];
  const contracts = allRecords.filter((c: any) => c.record_type !== 'rfq');
  const pendingRequests = allRecords.filter(
    (c: any) =>
      c.record_type === 'rfq' &&
      !['awarded', 'converted_to_contract', 'cancelled', 'expired'].includes((c.status || '').toLowerCase())
  );
  const events: ContractEvent[] = eventsData?.items || [];

  const { openEvents, nextVisit, dueThisMonth, contractValue } = useMemo(() => {
    const now = new Date();
    const open = events.filter((e) => !DONE_STATUSES.has((e.status || '').toLowerCase()));
    const next = open.find((e) => e.event_type === 'service');
    const monthDue = open
      .filter((e) => {
        if (e.event_type !== 'billing' || !e.amount) return false;
        const d = new Date(e.scheduled_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const value = contracts.reduce((sum: number, c: any) => sum + (Number(c.grand_total) || 0), 0);
    return { openEvents: open.slice(0, 5), nextVisit: next, dueThisMonth: monthDue, contractValue: value };
  }, [events, contracts]);

  if (contractsLoading || eventsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <VaNiLoader size="lg" message="Setting up your workspace..." />
      </div>
    );
  }

  const isBuyer = flavor === 'cnak';

  const stats = [
    {
      icon: FileText,
      label: 'Active contracts',
      value: String(contracts.length),
      hint: pendingRequests.length > 0
        ? `+ ${pendingRequests.length} request${pendingRequests.length === 1 ? '' : 's'} awaiting your quote`
        : isBuyer ? 'claimed via CNAK' : 'in your workspace'
    },
    {
      icon: CalendarClock,
      label: 'Next service visit',
      value: nextVisit ? fmtDate(nextVisit.scheduled_date) : '—',
      hint: nextVisit ? nextVisit.block_name : 'nothing scheduled'
    },
    {
      icon: Wallet,
      label: isBuyer ? 'Due this month' : 'Billed this month',
      value: dueThisMonth > 0 ? fmtMoney(dueThisMonth) : '—',
      hint: dueThisMonth > 0 ? 'from your contracts' : 'no dues scheduled'
    },
    {
      icon: Layers,
      label: 'Contract value',
      value: contractValue > 0 ? fmtMoney(contractValue) : '—',
      hint: 'total under management'
    }
  ];

  const hero = isBuyer
    ? {
        title: 'This contract is covered. Who’s watching everything else?',
        body:
          'Lifts, UPS, DG sets, fire systems — every asset has a contract, a due date and a vendor somewhere. Right now they live in files and phone calls.',
        chips: ['every asset in one registry', 'expiries flagged early', 'service history per asset'],
        cta: 'Digitize my equipment & facilities'
      }
    : {
        title: 'You’ve won the work. Now who runs it?',
        body:
          'Winning the contract was the easy half. Visits, proof of work, invoices and reminders — that’s where evenings go.',
        chips: ['visits schedule themselves', 'payments chased for you', 'next quote in minutes'],
        cta: 'Set up my workspace'
      };

  return (
    <div className="p-5 flex flex-col gap-4 max-w-6xl mx-auto">
      {/* ── Stat row ─────────────────────────────────────────────── */}
      <div data-walkover="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="rounded-xl px-4 py-3.5"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}14`
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} style={{ color: colors.utility.secondaryText }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {s.label}
                </span>
              </div>
              <div className="text-xl font-extrabold" style={{ color: colors.utility.primaryText, letterSpacing: '-0.02em' }}>
                {s.value}
              </div>
              <div className="text-[11px] truncate" style={{ color: colors.utility.secondaryText }}>
                {s.hint}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Registry intelligence (buyers): assets the claimed contract
             covers that aren't in the buyer's own registry yet ─────── */}
      {isBuyer && contracts.length > 0 && (
        <LiteRegistryIntel contractIds={contracts.map((c: any) => c.id)} />
      )}

      {/* ── Claim another contract — the core lite-buyer loop ─────── */}
      {isBuyer && (
        <button
          data-walkover="claim"
          onClick={() => navigate('/contracts/claim')}
          className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left transition-colors hover:opacity-90"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px dashed ${brand}66`
          }}
        >
          <KeyRound size={15} className="flex-none" style={{ color: brand }} />
          <span className="text-[13px] font-semibold" style={{ color: colors.utility.primaryText }}>
            Got another contract code from a vendor?
          </span>
          <span
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold"
            style={{ color: brand }}
          >
            Claim it <ArrowRight size={11} />
          </span>
        </button>
      )}

      {/* ── What needs you + hero cross-sell ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4 items-start">
        {/* What needs you */}
        <div
          data-walkover="needs-you"
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}14`
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2 border-b text-sm font-bold"
            style={{ borderColor: `${colors.utility.primaryText}10`, color: colors.utility.primaryText }}
          >
            What needs you
            <span className="ml-auto text-[10px] font-mono" style={{ color: colors.utility.secondaryText }}>
              {pendingRequests.length + openEvents.length} item{pendingRequests.length + openEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Received requests first — responding is the vendor's one job */}
          {pendingRequests.map((r: any) => (
            <div
              key={r.id}
              className="px-4 py-3 flex items-center gap-3 border-b"
              style={{ borderColor: `${colors.utility.primaryText}08` }}
            >
              <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: brand }} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                  Request awaiting your quote
                </div>
                <div className="text-[11px] truncate" style={{ color: colors.utility.secondaryText }}>
                  {r.name || r.rfq_number || 'Request for quote'}
                </div>
              </div>
              <button
                onClick={() => navigate('/contracts?record=rfq')}
                className="ml-auto flex-none text-[11px] font-bold rounded-lg px-2.5 py-1.5"
                style={{ color: brand, backgroundColor: `${brand}12`, border: `1px solid ${brand}40` }}
              >
                Respond
              </button>
            </div>
          ))}

          {pendingRequests.length === 0 && openEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: colors.utility.secondaryText }}>
              Nothing due right now — you're all caught up.
            </div>
          ) : (
            openEvents.map((ev) => {
              const overdue = new Date(ev.scheduled_date) < new Date();
              return (
                <div
                  key={ev.id}
                  className="px-4 py-3 flex items-center gap-3 border-b last:border-b-0"
                  style={{ borderColor: `${colors.utility.primaryText}08` }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ backgroundColor: overdue ? colors.semantic.warning : colors.semantic.success }}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                      {ev.event_type === 'billing'
                        ? `Payment due${ev.amount ? ` — ${fmtMoney(ev.amount, ev.currency)}` : ''}`
                        : ev.block_name || 'Service visit'}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: colors.utility.secondaryText }}>
                      {ev.contract_title || ev.contract_number || ''} · {fmtDate(ev.scheduled_date)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/contracts/${ev.contract_id}`)}
                    className="ml-auto flex-none text-[11px] font-bold rounded-lg px-2.5 py-1.5"
                    style={{
                      color: brand,
                      backgroundColor: `${brand}12`,
                      border: `1px solid ${brand}40`
                    }}
                  >
                    Open
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Hero cross-sell — problem question, outcome chips, trial CTA */}
        <div
          className="relative rounded-xl p-5 overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #1A1816, #31261D)' }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: -34, right: -34, width: 120, height: 120,
              borderRadius: '44% 56% 58% 42% / 46% 44% 56% 54%',
              background: `radial-gradient(circle at 35% 30%, ${brand}D0, ${brand} 60%, ${brand}90)`,
              opacity: 0.8, filter: 'blur(1px)'
            }}
          />
          <h3 className="relative font-extrabold leading-snug" style={{ color: '#F0ECE6', fontSize: 16, maxWidth: 300 }}>
            {hero.title}
          </h3>
          <p className="relative text-xs leading-relaxed mt-2 mb-3.5" style={{ color: 'rgba(240,236,230,0.72)', maxWidth: 320 }}>
            {hero.body}
          </p>
          <div className="relative flex flex-wrap gap-1.5 mb-3.5">
            {hero.chips.map((c, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                style={{
                  color: '#FFD9C4',
                  backgroundColor: `${brand}24`,
                  border: `1px solid ${brand}59`
                }}
              >
                {c}
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate(LITE_TRIAL.route)}
            className="relative inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-extrabold text-white transition-transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${brand}, ${brand}CC)`,
              boxShadow: `0 8px 22px ${brand}59`
            }}
          >
            {hero.cta} <ArrowRight size={13} />
          </button>
          <span className="relative block text-[10px] mt-2" style={{ color: 'rgba(240,236,230,0.5)' }}>
            {LITE_TRIAL.fine} · first 3 contracts free
          </span>
        </div>
      </div>

      {/* ── Walkover: auto-runs once per tenant, replayable ────────── */}
      <button
        onClick={() => {
          resetWalkover(currentTenant?.id);
          setWalkoverRun((n) => n + 1);
        }}
        className="self-end inline-flex items-center gap-1.5 text-[11px] font-semibold"
        style={{ color: colors.utility.secondaryText }}
      >
        <HelpCircle size={12} /> Show me around
      </button>
      {currentTenant?.id && (
        <LiteWalkover flavor={flavor} tenantId={currentTenant.id} runToken={walkoverRun} />
      )}
    </div>
  );
};

export default LiteDashboard;

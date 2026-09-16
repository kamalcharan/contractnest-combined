// src/pages/ops/cockpit/Commitments.tsx
//
// Ops — one list of every commitment across every contract, grouped by WHEN
// (overdue · today · next 3 days · coming weeks · later), typed by WHAT, each
// row either confirmed or still to be confirmed. This is the future body of
// /ops/cockpit; it is staged at /ops/cockpit/next while the lanes land one at
// a time. Phase 1 = the Collections lane only:
//   · instalments        ← get_tenant_receivables (useReceivables) — the same
//                          payload Money In reads, so the two pages agree
//   · declared payments  ← gs_pending_declarations (check-in declarations for
//                          the chair) and /api/payments/declarations
// Lane and Who toggles arrive with the Services lane; billing has no owner.
// Frontend only — no RPC, table or endpoint was added for this page.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useReceivables, type FinanceEvent } from '@/hooks/queries/useFinanceQueries';
import { usePendingDeclarations, useConfirmDeclaration, type GsDeclaration } from '@/hooks/queries/useGroupSessionsDashboard';
import { usePaymentDeclarations, useConfirmPaymentDeclaration, type PaymentDeclaration } from '@/hooks/queries/usePaymentDeclarations';
import { useInvoiceTheme } from '../../invoices/ui';
import { fmtMoney, fmtDate, daysUntil } from '@/utils/format';

type Horizon = 'overdue' | 'today' | 'soon' | 'weeks' | 'later';
type Lens = 'all' | 'toconfirm' | 'overdue' | 'ahead';
type RowState = 'overdue' | 'due' | 'toconfirm';

interface Row {
  id: string;
  horizon: Horizon;
  order: number;                 // sort inside a horizon: most urgent first
  title: string;
  sub: string;
  subBad?: boolean;
  amount: number;
  currency: string;
  state: RowState;
  meta: string;                  // small mono line under the amount
  action: { label: string; primary: boolean; run: () => void; busy?: boolean; disabled?: boolean };
  search: string;
}

const HORIZONS: Array<{ key: Horizon; label: string; bad?: boolean }> = [
  { key: 'overdue', label: 'overdue', bad: true },
  { key: 'today', label: 'today' },
  { key: 'soon', label: 'next 3 days' },
  { key: 'weeks', label: 'coming weeks' },
  { key: 'later', label: 'later' },
];

const isOpen = (e: FinanceEvent) => !e.settled && e.open_amount > 0.001;
const horizonFor = (days: number, overdue: boolean): Horizon =>
  overdue ? 'overdue' : days <= 0 ? 'today' : days <= 3 ? 'soon' : days <= 30 ? 'weeks' : 'later';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const OpsCommitmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, perspective } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;

  const [lens, setLens] = useState<Lens>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const enabled = perspective === 'revenue';
  const receivablesQuery = useReceivables({ enabled });
  const gsDeclQuery = usePendingDeclarations({ enabled });
  const payDeclQuery = usePaymentDeclarations('pending');
  const confirmGs = useConfirmDeclaration();
  const confirmPay = useConfirmPaymentDeclaration();

  const refresh = () => { receivablesQuery.refetch(); gsDeclQuery.refetch(); payDeclQuery.refetch(); };

  // One in-flight confirm per row; the hooks invalidate their own caches, and
  // receivables are refetched so the instalment behind the declaration updates.
  const runConfirmGs = async (d: GsDeclaration) => {
    if (busyId) return;
    setBusyId(d.id);
    try {
      await confirmGs.mutateAsync({ id: d.id, confirm: true });   // toasts on its own
      receivablesQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Could not confirm this payment');
    } finally { setBusyId(null); }
  };
  const runConfirmPay = async (d: PaymentDeclaration) => {
    if (busyId) return;
    setBusyId(d.id);
    try {
      await confirmPay.mutateAsync({ id: d.id, confirm: true } as any);
      toast.success(`Payment confirmed — ${fmtMoney(d.amount || 0, d.currency)} against ${d.invoice_number || d.contract_number}`);
      receivablesQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Could not confirm this payment');
    } finally { setBusyId(null); }
  };

  // ── rows ─────────────────────────────────────────────────────────────────
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const events = (receivablesQuery.data?.events || []).filter(isOpen);

    // Overdue: one row per buyer, all their late instalments together — the
    // action (open the contract) is per buyer, not per instalment.
    const lateByBuyer = new Map<string, FinanceEvent[]>();
    for (const e of events.filter((x) => x.days_overdue > 0)) {
      const k = e.buyer_id || e.buyer_name || e.contract_id;
      if (!lateByBuyer.has(k)) lateByBuyer.set(k, []);
      lateByBuyer.get(k)!.push(e);
    }
    for (const [k, evs] of lateByBuyer) {
      const oldest = evs.reduce((m, e) => Math.max(m, e.days_overdue), 0);
      const total = evs.reduce((s, e) => s + e.open_amount, 0);
      const first = evs[0];
      const contracts = Array.from(new Set(evs.map((e) => e.contract_number))).join(' · ');
      const label = first.billing_cycle_label || first.block_name || 'instalment';
      out.push({
        id: `late:${k}`, horizon: 'overdue', order: -oldest,
        title: first.buyer_name || first.contract_name || first.contract_number,
        sub: `${plural(evs.length, `${label.toLowerCase()} instalment`)} late · oldest ${oldest} days · ${contracts}`,
        subBad: true,
        amount: total, currency: 'INR', state: 'overdue', meta: contracts,
        action: { label: 'Open', primary: false, run: () => navigate(`/contracts/${first.contract_id}`) },
        search: `${first.buyer_name || ''} ${contracts} ${label}`.toLowerCase(),
      });
    }

    // Not yet due: group-session fees aggregate by date + cycle (18 members ×
    // ₹1,500 is one commitment, not eighteen); everything else is one row per
    // instalment.
    const agg = new Map<string, FinanceEvent[]>();
    for (const e of events.filter((x) => x.days_overdue <= 0)) {
      const d = daysUntil(e.due_on);
      const h = horizonFor(d, false);
      if (e.is_group_session) {
        const k = `${e.due_on}|${e.billing_cycle_label || e.block_name || ''}`;
        if (!agg.has(k)) agg.set(k, []);
        agg.get(k)!.push(e);
        continue;
      }
      const label = e.billing_cycle_label || e.block_name || 'Instalment';
      out.push({
        id: `ev:${e.id || e.invoice_id}:${e.sequence_number}`, horizon: h, order: d,
        title: `${e.buyer_name || e.contract_name || e.contract_number} — ${label}`,
        sub: `${e.contract_number}${e.sequence_number && e.total_occurrences ? ` · ${e.sequence_number}/${e.total_occurrences}` : ''} · due ${fmtDate(e.due_on)}${e.invoice_number ? ` · ${e.invoice_number}` : ''}`,
        amount: e.open_amount, currency: 'INR', state: 'due', meta: e.contract_number,
        action: { label: 'Open', primary: false, run: () => navigate(`/contracts/${e.contract_id}`) },
        search: `${e.buyer_name || ''} ${e.contract_number} ${e.invoice_number || ''} ${label}`.toLowerCase(),
      });
    }
    for (const [k, evs] of agg) {
      const first = evs[0];
      const d = daysUntil(first.due_on);
      const label = first.billing_cycle_label || first.block_name || 'Instalment';
      const total = evs.reduce((s, e) => s + e.open_amount, 0);
      const each = evs.every((e) => Math.abs(e.open_amount - first.open_amount) < 0.01) ? fmtMoney(first.open_amount) : null;
      out.push({
        id: `agg:${k}`, horizon: horizonFor(d, false), order: d,
        title: `${label} × ${plural(evs.length, 'member')}`,
        sub: `${first.block_name || first.contract_name}${each ? ` · ${each} each` : ''} · due ${fmtDate(first.due_on)} · collected at the desk or via check-in`,
        amount: total, currency: 'INR', state: 'due', meta: 'group session',
        action: { label: 'Dues', primary: false, run: () => navigate('/group-sessions') },
        search: `${label} ${first.block_name || ''} group session`.toLowerCase(),
      });
    }

    // Declared payments waiting for the chair — actionable now, so they live
    // under Today whatever day they were declared.
    for (const d of gsDeclQuery.data || []) {
      const guest = d.is_guest_fee && !d.adhoc_invoice_id;
      out.push({
        id: `gsd:${d.id}`, horizon: 'today', order: -1000,
        title: `Payment declared — ${d.member_name || 'Guest'}`,
        sub: `${d.label || d.block_name || 'Session fee'} · ref ${d.upi_reference || '—'} · declared ${fmtDate(d.created_at)}${guest ? ' · guest fee — needs an invoice before it can be confirmed' : ' · needs the chair’s confirmation'}`,
        amount: d.amount || 0, currency: d.currency || 'INR', state: 'toconfirm', meta: d.upi_reference ? `ref ${d.upi_reference}` : 'no reference',
        action: guest
          ? { label: 'Open', primary: false, run: () => navigate('/group-sessions') }
          : { label: 'Confirm', primary: true, run: () => runConfirmGs(d), busy: busyId === d.id, disabled: !!busyId && busyId !== d.id },
        search: `${d.member_name || ''} ${d.upi_reference || ''} ${d.label || ''}`.toLowerCase(),
      });
    }
    for (const d of payDeclQuery.data || []) {
      out.push({
        id: `pd:${d.id}`, horizon: 'today', order: -900,
        title: `Payment declared — ${d.declarer_name || d.contract_name || d.contract_number}`,
        sub: `${d.invoice_number || d.contract_number} · ref ${d.reference || '—'} · declared ${fmtDate(d.created_at)} · needs your confirmation`,
        amount: d.amount || 0, currency: d.currency || 'INR', state: 'toconfirm', meta: d.invoice_number || d.contract_number,
        action: { label: 'Confirm', primary: true, run: () => runConfirmPay(d), busy: busyId === d.id, disabled: !!busyId && busyId !== d.id },
        search: `${d.declarer_name || ''} ${d.contract_number} ${d.invoice_number || ''} ${d.reference || ''}`.toLowerCase(),
      });
    }

    return out.sort((a, z) => a.order - z.order || z.amount - a.amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivablesQuery.data, gsDeclQuery.data, payDeclQuery.data, busyId]);

  // ── situation ────────────────────────────────────────────────────────────
  const s = receivablesQuery.data?.summary;
  const toConfirm = rows.filter((r) => r.state === 'toconfirm');
  const toConfirmAmt = toConfirm.reduce((t, r) => t + r.amount, 0);
  const overdueAmt = s?.overdue_total ?? rows.filter((r) => r.state === 'overdue').reduce((t, r) => t + r.amount, 0);
  const overdueBuyers = rows.filter((r) => r.state === 'overdue').length;
  const todayDue = rows.filter((r) => r.horizon === 'today' && r.state === 'due');
  const todayDueAmt = todayDue.reduce((t, r) => t + r.amount, 0);
  const aheadAmt = s?.upcoming_30_total ?? rows.filter((r) => r.horizon === 'soon' || r.horizon === 'weeks').reduce((t, r) => t + r.amount, 0);
  const aheadRows = rows.filter((r) => r.horizon === 'soon' || r.horizon === 'weeks');

  const visible = useMemo(() => {
    let r = rows;
    if (lens === 'toconfirm') r = r.filter((x) => x.state === 'toconfirm');
    if (lens === 'overdue') r = r.filter((x) => x.state === 'overdue');
    if (lens === 'ahead') r = r.filter((x) => x.horizon === 'soon' || x.horizon === 'weeks');
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => x.search.includes(q));
    return r;
  }, [rows, lens, search]);
  const groups = HORIZONS.map((h) => ({ ...h, rows: visible.filter((r) => r.horizon === h.key) })).filter((g) => g.rows.length);
  const toggle = (l: Lens) => setLens((cur) => (cur === l ? 'all' : l));

  // ── chrome ───────────────────────────────────────────────────────────────
  const Num: React.FC<{ v: string; color?: string; lens: Lens }> = ({ v, color, lens: l }) => (
    <button onClick={() => toggle(l)} className="font-extrabold tabular-nums align-baseline"
      style={{ color: color || colors.utility.primaryText, borderBottom: `2px ${lens === l ? 'solid' : 'dotted'} ${color || brand}`, fontSize: '1.15em' }}>
      {v}
    </button>
  );
  const Signal: React.FC<{ color: string; l: Lens; children: React.ReactNode }> = ({ color, l, children }) => (
    <button onClick={() => toggle(l)} className="text-left text-[13.5px] leading-relaxed min-h-[44px] flex items-center"
      style={{ color: colors.utility.primaryText, opacity: lens === l ? 1 : 0.85 }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle flex-none" style={{ backgroundColor: color }} />
      <span>{children}
        <span className="ml-1 font-bold" style={{ color, borderBottom: `2px ${lens === l ? 'solid' : 'dotted'} ${color}` }}>{lens === l ? 'showing' : 'look'}</span>
      </span>
    </button>
  );
  const stateColor = (st: RowState) => (st === 'overdue' ? red : st === 'toconfirm' ? amber : colors.utility.secondaryText);
  const stateLabel = (st: RowState) => (st === 'overdue' ? 'Overdue' : st === 'toconfirm' ? 'To confirm' : 'Due');

  if (perspective === 'expense') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>ops · revenue side</p>
        <h1 className="text-xl font-extrabold mb-2" style={ink}>You're on the expense side right now</h1>
        <p className="text-sm mb-5" style={sub}>Ops lists what is owed <i>to you</i> and what needs your confirmation. What you owe others lives in To Pay.</p>
        <button onClick={() => navigate('/to-pay')} className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: brand }}>
          Go to To Pay <ArrowUpRight size={14} />
        </button>
      </div>
    );
  }
  if (receivablesQuery.isLoading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (receivablesQuery.isError) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm mb-3" style={sub}>Couldn't load your commitments.</p>
        <button onClick={refresh} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const showing = lens === 'toconfirm' ? 'to confirm' : lens === 'overdue' ? 'overdue' : lens === 'ahead' ? 'next 30 days' : null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* ── headline ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
            ops · {currentTenant?.name || 'your business'} · {receivablesQuery.data?.as_of ? fmtDate(receivablesQuery.data.as_of) : 'today'}
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-2xl" style={ink}>
            {toConfirm.length > 0
              ? <><Num v={fmtMoney(toConfirmAmt)} color={amber} lens="toconfirm" /> to confirm — {plural(toConfirm.length, 'declared payment')} — </>
              : <>Nothing to confirm. </>}
            {overdueAmt > 0
              ? <><Num v={fmtMoney(overdueAmt)} color={red} lens="overdue" /> overdue across {plural(overdueBuyers, 'buyer')}. </>
              : <>Nothing overdue. </>}
            {todayDueAmt > 0 && <>{fmtMoney(todayDueAmt)} falls due today. </>}
            {aheadAmt > 0 && <><Num v={fmtMoney(aheadAmt)} lens="ahead" /> falls due in the next 30 days.</>}
          </h1>
        </div>
        <button onClick={refresh} title="Refresh"
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1"
          style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── signals ── */}
      <div className="mt-6 space-y-1">
        {toConfirm.length > 0 && (
          <Signal color={amber} l="toconfirm"><b>{plural(toConfirm.length, 'declared payment')}</b> waiting for confirmation — {fmtMoney(toConfirmAmt)}.{' '}</Signal>
        )}
        {overdueBuyers > 0 && (
          <Signal color={red} l="overdue"><b>{plural(overdueBuyers, 'buyer')}</b> behind — {fmtMoney(overdueAmt)} overdue, the oldest {rows.filter((r) => r.state === 'overdue').reduce((m, r) => Math.max(m, -r.order), 0)} days.{' '}</Signal>
        )}
        {aheadRows.length > 0 && (
          <Signal color={brand} l="ahead"><b>{fmtMoney(aheadAmt)}</b> falls due in the next 30 days — {plural(aheadRows.length, 'commitment')}.{' '}</Signal>
        )}
      </div>

      {/* ── list header ── */}
      <div className="mt-10 mb-3 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex-none" style={{ ...sub, ...mono }}>
          {visible.length} of {rows.length} · collections · by when
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {showing && (
            <button onClick={() => setLens('all')}
              className="flex-none inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>
              showing: {showing} ✕
            </button>
          )}
          <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[40px] w-56" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
            <Search size={13} style={sub} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name · contract · ref" aria-label="Search commitments"
              className="bg-transparent outline-none text-xs w-full" style={ink} />
          </label>
        </div>
      </div>

      {/* ── rows by horizon ── */}
      {groups.length === 0 ? (
        <p className="text-[13px] py-10 text-center rounded-2xl border border-dashed" style={{ ...sub, borderColor: hairline }}>
          {rows.length === 0
            ? 'Nothing is waiting on you — no overdue instalments and no payments to confirm.'
            : 'Nothing matches — clear the search or the filter above.'}
        </p>
      ) : groups.map((g) => {
        const tc = g.rows.filter((r) => r.state === 'toconfirm').length;
        return (
          <div key={g.key} className="mb-6">
            <div className="flex items-baseline gap-3 mb-2.5 mt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: g.bad ? red : colors.utility.primaryText }}>{g.label}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>
                {plural(g.rows.length, 'commitment')}{tc ? <> · <span style={{ color: amber }}>{tc} to confirm</span></> : null}
              </p>
            </div>
            <div className="space-y-2.5">
              {g.rows.map((r) => (
                <div key={r.id} className="rounded-2xl border px-4 py-3.5 flex items-center gap-4"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
                  <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${stateColor(r.state) === colors.utility.secondaryText ? green : stateColor(r.state)}66` }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold truncate" style={ink}>
                      {r.title}
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: green, backgroundColor: `${green}14` }}>collection</span>
                    </p>
                    <p className="text-[13px] mt-0.5 truncate" style={{ color: r.subBad ? red : colors.utility.secondaryText }}>{r.sub}</p>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-lg font-extrabold tabular-nums" style={ink}>{fmtMoney(r.amount, r.currency)}</p>
                    <p className="text-[10px] truncate max-w-[140px]" style={{ ...sub, ...mono }}>{r.meta}</p>
                  </div>
                  <span className="flex-none text-[10px] font-bold px-2.5 py-1.5 rounded-full border"
                    style={{ color: stateColor(r.state), borderColor: `${stateColor(r.state)}55`, backgroundColor: r.state === 'due' ? 'transparent' : `${stateColor(r.state)}14` }}>
                    {stateLabel(r.state)}
                  </span>
                  <button onClick={r.action.run} disabled={r.action.disabled || r.action.busy}
                    className="flex-none inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-full text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    style={r.action.primary
                      ? { backgroundColor: brand, color: '#fff' }
                      : { border: `1px solid ${brand}45`, color: brand, backgroundColor: colors.utility.secondaryBackground }}>
                    {r.action.busy ? <LoadingSpinner size="sm" /> : r.action.primary ? <Check size={13} /> : null}
                    {r.action.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="mt-10 text-[11px] leading-relaxed text-center" style={sub}>
        Collections are the first lane on this list. Sessions, services and appointments join it next; what you owe others stays in{' '}
        <button onClick={() => navigate('/to-pay')} className="font-bold" style={{ color: brand }}>To Pay</button>.
      </p>
    </div>
  );
};

export default OpsCommitmentsPage;

// ============================================================================
// Money In (/money-in) · Revenue perspective · WIRED (A1–A3)
// ----------------------------------------------------------------------------
// Receivables + invoices merged into one briefing. LIVE DATA:
//   · stories/headline/signals ← get_tenant_receivables (useReceivables) —
//     the same source as /ops/finance, so the two agree by construction
//   · instalment chip click → InstalmentActionModal (the Dues-tab
//     methodology: state-machine transitions + the existing
//     RecordPaymentDialog) — one write path, no parallel logic
//   · after any write: refetch → chips, sentences and headline recompute
// Derived predicates (schedule-relative, not %-based):
//   late = open + past due · at risk = 2+ instalments behind OR oldest > 30d
//   aging doc = draft, or open past 30 days since issue · upcoming = due in 7/30d
// Still sample (A4): the "arrived without paperwork" strip + composer save.
// VaNi nudges remain an honest "coming" preview.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronDown, FileText, Sparkles, Wallet, ArrowUpRight, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import InstalmentActionModal from '@/components/finance/InstalmentActionModal';
import { useReceivables, type FinanceEvent, type FinanceInvoice } from '@/hooks/queries/useFinanceQueries';
import { fmtMoney, fmtDate, useInvoiceTheme, Pill, useStatusMeta } from '../invoices/ui';
import { usePendingDeclarations } from '@/hooks/queries/useGroupSessionsDashboard';

type Lens = 'everything' | 'late' | 'risk' | 'docs' | 'upcoming' | 'settled';

const AGING_DAYS = 30;
const RISK_ARREARS = 2;
const RISK_DAYS = 30;
const dayMs = 86_400_000;
const daysSince = (iso: string | null): number =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / dayMs)) : 0;
const daysUntil = (iso: string | null): number =>
  iso ? Math.floor((new Date(iso).getTime() - Date.now()) / dayMs) : Infinity;

interface ContractGroup {
  contract_id: string;
  contract_number: string;
  events: FinanceEvent[];
}
interface BuyerStory {
  key: string;
  buyerId: string | null;
  name: string;
  direct: boolean;                    // no buyer contact on file
  contracts: ContractGroup[];
  invoices: FinanceInvoice[];
  open: number;
  lateAmount: number;
  lateCount: number;
  oldest: number;
  received: number;
  nextDue: FinanceEvent | null;
  atRisk: boolean;
  agingDocs: FinanceInvoice[];
  upcoming: FinanceEvent[];
  isGroupSession: boolean;
}

const chipState = (e: FinanceEvent): 'paid' | 'overdue' | 'due' =>
  e.settled || e.open_amount <= 0.001 ? 'paid' : e.days_overdue > 0 ? 'overdue' : 'due';

const MoneyInPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, perspective } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const statusMeta = useStatusMeta();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;

  const [lens, setLens] = useState<Lens>('everything');
  const [upWindow, setUpWindow] = useState<7 | 30>(7);
  const [search, setSearch] = useState('');
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [receiptsExpanded, setReceiptsExpanded] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [action, setAction] = useState<null | {
    contractId: string; contractNumber: string | null; buyerName: string | null; eventIds: string[]; currency: string;
  }>(null);

  const receivablesQuery = useReceivables({ enabled: perspective === 'revenue' });
  const data = receivablesQuery.data;

  // A4: money that arrived with no paperwork = pending guest-fee
  // declarations not yet stamped with an adhoc invoice. The RPC returns
  // pending only, so rejected/confirmed rows drop out on their own.
  const declarationsQuery = usePendingDeclarations({ enabled: perspective === 'revenue' });
  const waitingReceipts = useMemo(
    () => (declarationsQuery.data || []).filter(
      (d) => d.is_guest_fee && !d.adhoc_invoice_id && d.member_contact_id && (d.amount || 0) > 0),
    [declarationsQuery.data]
  );

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `1px solid ${colors.utility.primaryText}12`;

  // ── A1: buyer stories derived from the live receivables payload ──────────
  const stories: BuyerStory[] = useMemo(() => {
    const events = data?.events || [];
    const invoices = data?.invoices || [];
    const byBuyer = new Map<string, FinanceEvent[]>();
    for (const e of events) {
      const key = e.buyer_id || e.buyer_name || e.contract_id;
      if (!byBuyer.has(key)) byBuyer.set(key, []);
      byBuyer.get(key)!.push(e);
    }
    const out: BuyerStory[] = [];
    for (const [key, evs] of byBuyer) {
      const contracts: ContractGroup[] = [];
      for (const e of evs) {
        let c = contracts.find((x) => x.contract_id === e.contract_id);
        if (!c) { c = { contract_id: e.contract_id, contract_number: e.contract_number, events: [] }; contracts.push(c); }
        c.events.push(e);
      }
      contracts.forEach((c) => c.events.sort((a, z) => (a.due_on || '').localeCompare(z.due_on || '')));
      const contractIds = new Set(contracts.map((c) => c.contract_id));
      const invs = invoices.filter((i) => contractIds.has(i.contract_id));
      const openEvs = evs.filter((e) => chipState(e) !== 'paid');
      const late = openEvs.filter((e) => e.days_overdue > 0);
      const upcoming = openEvs
        .filter((e) => e.days_overdue <= 0 && daysUntil(e.due_on) >= 0 && daysUntil(e.due_on) <= upWindow)
        .sort((a, z) => daysUntil(a.due_on) - daysUntil(z.due_on));
      const oldest = late.reduce((m, e) => Math.max(m, e.days_overdue), 0);
      out.push({
        key,
        buyerId: evs[0].buyer_id,
        name: evs[0].buyer_name || evs[0].contract_name || evs[0].contract_number,
        direct: !evs[0].buyer_id,
        contracts,
        invoices: invs,
        open: openEvs.reduce((s, e) => s + e.open_amount, 0),
        lateAmount: late.reduce((s, e) => s + e.open_amount, 0),
        lateCount: late.length,
        oldest,
        received: invs.reduce((s, i) => s + (i.amount_paid || 0), 0),
        nextDue: openEvs.filter((e) => e.days_overdue <= 0).sort((a, z) => (a.due_on || '').localeCompare(z.due_on || ''))[0] || null,
        atRisk: late.length >= RISK_ARREARS || oldest > RISK_DAYS,
        agingDocs: invs.filter((i) => i.status === 'draft' || (i.balance > 0.001 && i.status !== 'cancelled' && daysSince(i.issued_at) > AGING_DAYS)),
        upcoming,
        isGroupSession: evs.some((e) => e.is_group_session),
      });
    }
    return out;
  }, [data, upWindow]);

  const situation = useMemo(() => {
    const s = data?.summary;
    return {
      owed: s?.total_outstanding ?? 0,
      lateAmt: s?.overdue_total ?? 0,
      lateBuyers: stories.filter((x) => x.lateAmount > 0).length,
      oldest: stories.reduce((m, x) => Math.max(m, x.oldest), 0),
      collected: s?.collected_total ?? 0,
      riskBuyers: stories.filter((x) => x.atRisk),
      agingOpen: stories.flatMap((x) => x.agingDocs).filter((i) => i.status !== 'draft').length,
      drafts: s?.draft_count ?? 0,
      upcomingAmt: upWindow === 7 ? (s?.upcoming_7_total ?? 0) : (s?.upcoming_30_total ?? 0),
      upcomingBuyers: stories.filter((x) => x.upcoming.length > 0).length,
    };
  }, [data, stories, upWindow]);

  const rows = useMemo(() => {
    let r = [...stories].sort((a, z) => z.oldest - a.oldest || z.open - a.open);
    if (lens === 'late') r = r.filter((x) => x.lateAmount > 0);
    if (lens === 'risk') r = r.filter((x) => x.atRisk);
    if (lens === 'docs') r = r.filter((x) => x.agingDocs.length > 0);
    if (lens === 'upcoming') r = r.filter((x) => x.upcoming.length > 0)
      .sort((a, z) => daysUntil(a.upcoming[0]?.due_on ?? null) - daysUntil(z.upcoming[0]?.due_on ?? null));
    if (lens === 'settled') r = r.filter((x) => x.open <= 0.001);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) =>
      x.name.toLowerCase().includes(q) ||
      x.contracts.some((c) => c.contract_number.toLowerCase().includes(q)) ||
      x.invoices.some((i) => i.invoice_number.toLowerCase().includes(q)));
    return r;
  }, [stories, lens, search]);

  const toggleLens = (l: Lens) => setLens((cur) => (cur === l ? 'everything' : l));
  const toggleRow = (id: string) =>
    setOpenRows((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // A3: one refetch closes the loop for every write made through the modal.
  const onChanged = () => receivablesQuery.refetch();

  const sentenceFor = (b: BuyerStory): string => {
    if (lens === 'upcoming' && b.upcoming.length > 0) {
      const first = b.upcoming[0];
      const d = daysUntil(first.due_on);
      return `${fmtMoney(first.open_amount)} due ${d <= 0 ? 'today' : d === 1 ? 'tomorrow' : fmtDate(first.due_on)}${b.lateAmount > 0 ? ` · plus ${fmtMoney(b.lateAmount)} already late` : ''}`;
    }
    if (b.open <= 0.001) return b.received > 0 ? `Paid up — ${fmtMoney(b.received)} received` : 'Paid up';
    if (b.atRisk) return `At risk — ${b.lateCount} instalment${b.lateCount === 1 ? '' : 's'} behind · ${b.oldest} days`;
    if (b.lateAmount > 0) {
      const part = b.received > 0 ? `${fmtMoney(b.received)} received, ` : 'nothing received, ';
      return `${part}${fmtMoney(b.lateAmount)} late for ${b.oldest} days`;
    }
    if (b.agingDocs.length > 0 && b.agingDocs[0].status === 'draft') return `Draft invoice never sent · ${b.agingDocs[0].invoice_number}`;
    return b.nextDue ? `On track — next ${fmtMoney(b.nextDue.open_amount)} due ${fmtDate(b.nextDue.due_on)}` : 'On track';
  };

  const Num: React.FC<{ v: string; color?: string; onClick?: () => void; active?: boolean }> = ({ v, color, onClick, active }) => (
    <button onClick={onClick} disabled={!onClick}
      className="font-extrabold tabular-nums align-baseline disabled:cursor-text"
      style={{ color: color || colors.utility.primaryText, borderBottom: onClick ? `2px ${active ? 'solid' : 'dotted'} ${color || brand}` : 'none', fontSize: '1.15em' }}>
      {v}
    </button>
  );

  const Signal: React.FC<{ color: string; active: boolean; onClick: () => void; children: React.ReactNode; trailing?: React.ReactNode }> =
    ({ color, active, onClick, children, trailing }) => (
      <div className="flex items-center gap-2">
        <button onClick={onClick} className="text-left text-[13.5px] leading-relaxed"
          style={{ color: colors.utility.primaryText, opacity: active ? 1 : 0.85 }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ backgroundColor: color }} />
          {children}
          <span className="ml-1 font-bold" style={{ color, borderBottom: `2px ${active ? 'solid' : 'dotted'} ${color}` }}>
            {active ? 'showing' : 'look'}
          </span>
        </button>
        {trailing}
      </div>
    );

  if (perspective === 'expense') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>money in · revenue side</p>
        <h1 className="text-xl font-extrabold mb-2" style={ink}>You're on the expense side right now</h1>
        <p className="text-sm mb-5" style={sub}>Money In shows who owes <i>you</i>. What you owe others lives in To Pay.</p>
        <button onClick={() => navigate('/to-pay')} className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: brand }}>
          Go to To Pay <ArrowUpRight size={14} />
        </button>
      </div>
    );
  }

  if (receivablesQuery.isLoading) {
    return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  }
  if (receivablesQuery.isError) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm mb-3" style={sub}>Couldn't load your money picture.</p>
        <button onClick={() => receivablesQuery.refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const lateStories = stories.filter((x) => x.lateAmount > 0);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* ── headline ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
            money in · {currentTenant?.name || 'your business'} · {data?.as_of ? fmtDate(data.as_of) : 'today'}
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-xl" style={ink}>
            <Num v={fmtMoney(situation.owed)} onClick={() => setLens('everything')} active={lens === 'everything'} /> is owed to you.
            {situation.lateAmt > 0 ? (
              <> <Num v={fmtMoney(situation.lateAmt)} color={red} onClick={() => toggleLens('late')} active={lens === 'late'} /> of it is late —
                {' '}{situation.lateBuyers} buyer{situation.lateBuyers === 1 ? '' : 's'}, the oldest <b className="tabular-nums">{situation.oldest} days</b>.</>
            ) : (<> Nothing is late.</>)}
          </h1>
          <p className="text-sm mt-3" style={sub}>
            <span className="font-bold tabular-nums" style={{ color: green }}>{fmtMoney(situation.collected)}</span> collected so far ·{' '}
            <button onClick={() => toggleLens('settled')}
              className="underline-offset-4" style={{ color: colors.utility.secondaryText, textDecoration: lens === 'settled' ? 'underline' : 'none' }}>
              see who's paid up
            </button>
          </p>
        </div>
        <button onClick={() => navigate('/invoices/new')}
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white mt-1"
          style={{ backgroundColor: brand }}>
          <Plus size={14} /> New invoice
        </button>
      </div>

      {/* ── signals ── */}
      <div className="mt-6 space-y-2">
        {situation.riskBuyers.length > 0 && (
          <Signal color={red} active={lens === 'risk'} onClick={() => toggleLens('risk')}>
            <b>{situation.riskBuyers.length} buyer{situation.riskBuyers.length === 1 ? ' is' : 's are'} at risk</b> — two or more instalments behind, or 30+ days silent.{' '}
          </Signal>
        )}
        {(situation.agingOpen > 0 || situation.drafts > 0) && (
          <Signal color={amber} active={lens === 'docs'} onClick={() => toggleLens('docs')}>
            {situation.agingOpen > 0 && <><b>{situation.agingOpen} invoice{situation.agingOpen === 1 ? '' : 's'}</b> open past {AGING_DAYS} days</>}
            {situation.agingOpen > 0 && situation.drafts > 0 && ' · '}
            {situation.drafts > 0 && <><b>{situation.drafts} draft{situation.drafts === 1 ? '' : 's'}</b> awaiting approval</>}
            {'. '}
          </Signal>
        )}
        {situation.upcomingAmt > 0 && (
          <Signal color={brand} active={lens === 'upcoming'} onClick={() => toggleLens('upcoming')}
            trailing={lens === 'upcoming' && (
              <span className="inline-flex rounded-full border overflow-hidden text-[10px] font-bold" style={{ borderColor: `${brand}45`, ...mono }}>
                {([7, 30] as const).map((w) => (
                  <button key={w} onClick={() => setUpWindow(w)} className="px-2 py-0.5"
                    style={{ backgroundColor: upWindow === w ? `${brand}22` : 'transparent', color: brand }}>{w}d</button>
                ))}
              </span>
            )}>
            <b className="tabular-nums">{fmtMoney(situation.upcomingAmt)}</b> falls due in the next {upWindow} days — {situation.upcomingBuyers} buyer{situation.upcomingBuyers === 1 ? '' : 's'}.{' '}
          </Signal>
        )}
      </div>

      {/* ── paperwork strip — live pending guest-fee declarations ── */}
      {waitingReceipts.length > 0 && (
        <div className="mt-6 rounded-2xl px-5 py-4" style={{ backgroundColor: `${green}0f`, border: `1px solid ${green}35` }}>
          <p className="text-sm mb-2.5" style={ink}>
            <span className="font-extrabold tabular-nums" style={{ color: green }}>
              {fmtMoney(waitingReceipts.reduce((s, r) => s + (r.amount || 0), 0))}
            </span>{' '}
            has already arrived without paperwork:
          </p>
          <div className="space-y-2">
            {(receiptsExpanded ? waitingReceipts : waitingReceipts.slice(0, 2)).map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <p className="text-[13px] flex-1 min-w-0 truncate" style={ink}>
                  <b className="tabular-nums">{fmtMoney(r.amount || 0)}</b> · {r.member_name || 'Guest'}
                  <span style={sub}> · {r.upi_reference ? `UPI · ${r.upi_reference}` : 'declared'} · {fmtDate(r.created_at)}</span>
                </p>
                <button onClick={() => navigate(`/invoices/new?from=declaration:${r.id}`)}
                  className="flex-none text-[11px] font-bold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: green }}>
                  Generate invoice
                </button>
              </div>
            ))}
            {waitingReceipts.length > 2 && !receiptsExpanded && (
              <button onClick={() => setReceiptsExpanded(true)} className="text-[11px] font-bold" style={{ color: green }}>
                and {waitingReceipts.length - 2} more…
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── control line ── */}
      <div className="mt-9 mb-2 flex items-center gap-4 pb-3" style={{ borderBottom: hairline }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex-none" style={{ ...sub, ...mono }}>
          {rows.length} of {stories.length} buyers · {lens === 'upcoming' ? 'soonest first' : 'most late first'}
        </p>
        {lens !== 'everything' && (
          <button onClick={() => setLens('everything')}
            className="flex-none inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ ...mono, color: brand, backgroundColor: `${brand}14`, border: `1px solid ${brand}40` }}>
            showing: {lens} ✕
          </button>
        )}
        <div className="relative ml-auto w-full max-w-[240px]">
          <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2" style={sub} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name · contract · INV-…"
            className="w-full pl-6 pr-1 py-1 text-xs bg-transparent focus:outline-none"
            style={{ ...ink, borderBottom: `1px solid ${colors.utility.primaryText}25` }} />
        </div>
      </div>

      {/* ── the stories ── */}
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={sub}>
          {stories.length === 0 ? 'No receivables yet — money appears here once contracts start billing.' : 'Nobody matches — clear the search or the filter above.'}
        </p>
      ) : rows.map((b) => {
        const open = openRows.has(b.key);
        const accent = b.open <= 0.001 ? green : b.atRisk ? red : b.lateAmount > 0 ? red : amber;
        return (
          <div key={b.key} className="rounded-2xl border mb-3 overflow-hidden"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}14` }}>
            <button onClick={() => toggleRow(b.key)} className="w-full px-4 py-4 flex items-center gap-4 text-left group">
              <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${accent}66` }} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate" style={ink}>
                  <span
                    role="link"
                    className={b.buyerId ? 'hover:underline underline-offset-2 cursor-pointer' : undefined}
                    title={b.buyerId ? 'Open contact profile' : undefined}
                    onClick={(e) => { if (b.buyerId) { e.stopPropagation(); navigate(`/contacts/${b.buyerId}`); } }}
                  >{b.name}</span>
                  {b.direct && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>direct</span>}
                  {b.atRisk && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: red, backgroundColor: `${red}14` }}>at risk</span>}
                </p>
                <p className="text-[13px] mt-0.5 truncate" style={{ color: b.lateAmount > 0 ? red : colors.utility.secondaryText }}>
                  {sentenceFor(b)}
                </p>
              </div>
              <div className="text-right flex-none">
                {b.open > 0.001
                  ? <p className="text-lg font-extrabold tabular-nums" style={ink}>{fmtMoney(b.open)}</p>
                  : <p className="text-lg font-extrabold tabular-nums" style={{ color: green }}>✓</p>}
                <p className="text-[10px]" style={{ ...sub, ...mono }}>
                  {b.contracts.map((c, i) => (
                    <span key={c.contract_id}>
                      {i > 0 && ' · '}
                      <span role="link" className="hover:underline underline-offset-2 cursor-pointer" title="Open contract"
                        onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.contract_id}`); }}>
                        {c.contract_number}
                      </span>
                    </span>
                  ))}
                </p>
              </div>
              <ChevronDown size={16} className={`flex-none transition-transform ${open ? 'rotate-180' : ''} opacity-40 group-hover:opacity-80`} style={ink} />
            </button>

            {open && (
              <div className="pb-5 pl-9 pr-5 space-y-4">
                {b.contracts.map((c) => {
                  const openIds = c.events.filter((e) => chipState(e) !== 'paid' && e.id).map((e) => e.id as string);
                  return (
                    <div key={c.contract_id} className="space-y-2">
                      {b.contracts.length > 1 && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ ...sub, ...mono }}>{c.contract_number}</p>
                      )}
                      {/* A2: each chip opens the shared action modal */}
                      <div className="flex flex-wrap gap-2">
                        {c.events.map((e, idx) => {
                          const st = chipState(e);
                          const col = st === 'paid' ? green : st === 'overdue' ? red : colors.utility.secondaryText;
                          return (
                            <button key={e.id ?? idx}
                              onClick={() => e.id && setAction({ contractId: c.contract_id, contractNumber: c.contract_number, buyerName: b.name, eventIds: [e.id], currency: 'INR' })}
                              disabled={!e.id}
                              title={e.id ? 'Record a payment or correct this instalment' : undefined}
                              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full disabled:cursor-default hover:brightness-95"
                              style={{ ...mono, color: col, backgroundColor: `${col}12`, border: `1px solid ${col}30` }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col }} />
                              {fmtDate(e.due_on)} · {fmtMoney(st === 'paid' ? e.amount : e.open_amount)}{st === 'overdue' ? ` · ${e.days_overdue}d` : ''}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        {openIds.length > 0 && (
                          <button
                            onClick={() => setAction({ contractId: c.contract_id, contractNumber: c.contract_number, buyerName: b.name, eventIds: openIds, currency: 'INR' })}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white"
                            style={{ backgroundColor: green }}>
                            <Wallet size={13} /> Record payment
                          </button>
                        )}
                        <button onClick={() => navigate(`/contracts/${c.contract_id}`)}
                          className="text-xs font-bold px-3.5 py-2 rounded-full border" style={{ ...sub, borderColor: `${colors.utility.primaryText}22` }}>
                          View contract
                        </button>
                        {b.lateAmount > 0 && (
                          <button onClick={() => setNudgeOpen(true)}
                            className="text-xs font-bold px-3.5 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
                            Nudge on WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* documents — real invoice pages */}
                {b.invoices.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {b.invoices.map((inv) => {
                      const aging = b.agingDocs.some((d) => d.id === inv.id);
                      const meta = statusMeta(
                        (inv.status === 'overdue' ? 'unpaid' : inv.status === 'bad_debt' ? 'cancelled' : inv.status) as any,
                        inv.status === 'overdue' || inv.days_overdue > 0
                      );
                      return (
                        <button key={inv.id} onClick={() => navigate(`/contracts/${inv.contract_id}/invoice/${inv.id}`)}
                          className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border text-left hover:brightness-95"
                          style={{
                            backgroundColor: aging ? `${amber}10` : colors.utility.secondaryBackground,
                            borderColor: aging ? `${amber}55` : `${colors.utility.primaryText}18`,
                          }}>
                          <FileText size={13} style={{ color: aging ? amber : brand }} />
                          <span className="text-[11px] font-bold" style={ink}>{inv.invoice_number}</span>
                          {aging && inv.status !== 'draft' && (
                            <span className="text-[10px] font-bold" style={{ ...mono, color: amber }}>{daysSince(inv.issued_at)}d open</span>
                          )}
                          <Pill label={meta.label} color={meta.color} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── VaNi offer ── */}
      {lateStories.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <Sparkles size={15} style={{ color: brand }} />
          <p className="text-[13px]" style={sub}>
            VaNi can chase all {lateStories.length} late buyers on WhatsApp and report back —{' '}
            <button onClick={() => setNudgeOpen(true)} className="font-bold" style={{ color: brand }}>preview the messages</button>
            <span className="ml-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ ...mono, color: colors.utility.secondaryText, backgroundColor: `${colors.utility.primaryText}0d` }}>coming</span>
          </p>
        </div>
      )}

      <p className="mt-10 text-[10px] uppercase tracking-[0.18em] text-center" style={{ ...sub, ...mono }}>
        receipts unlimited · invoicing included · nothing here is metered
      </p>

      {/* ── A2/A3: the shared action modal ── */}
      {action && (
        <InstalmentActionModal
          isOpen={!!action}
          onClose={() => setAction(null)}
          contractId={action.contractId}
          contractNumber={action.contractNumber}
          buyerName={action.buyerName}
          eventIds={action.eventIds}
          currency={action.currency}
          onChanged={onChanged}
        />
      )}

      {/* ── nudge preview drawer (copy from live data; sending = coming) ── */}
      {nudgeOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(15,15,20,0.45)' }} onClick={() => setNudgeOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full overflow-y-auto p-6"
            style={{ backgroundColor: colors.utility.primaryBackground, borderLeft: hairline }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-extrabold" style={ink}>What VaNi would send</p>
              <button onClick={() => setNudgeOpen(false)} style={sub}><X size={16} /></button>
            </div>
            <p className="text-[11px] mb-5" style={sub}>
              One WhatsApp per late buyer, tone matched to how late they are. Nothing sends yet —
              <span className="ml-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ ...mono, color: colors.utility.secondaryText, backgroundColor: `${colors.utility.primaryText}0d` }}>coming with wiring</span>
            </p>
            {lateStories.map((b) => (
              <div key={b.key} className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ ...sub, ...mono }}>
                  → {b.name.split(' ')[0]} · {b.oldest}d late
                </p>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] leading-relaxed"
                  style={{ backgroundColor: `${green}12`, border: `1px solid ${green}30`, color: colors.utility.primaryText }}>
                  Namaste {b.name.split(' ')[0]} 🙏 — a gentle reminder from {currentTenant?.name || 'your group'}:{' '}
                  <b>{fmtMoney(b.lateAmount)}</b> towards {b.contracts[0]?.contract_number || 'your membership'} is pending
                  {b.oldest > 30 ? ` (open for ${b.oldest} days now)` : ''}. You can pay by UPI and reply here with the reference —
                  we'll receipt it the same day. Thank you!
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyInPage;

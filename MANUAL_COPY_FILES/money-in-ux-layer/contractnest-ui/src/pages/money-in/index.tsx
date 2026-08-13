// ============================================================================
// Money In (/money-in) · Revenue perspective · UX layer
// ----------------------------------------------------------------------------
// Receivables + invoices MERGED — one worklist of buyer stories, spoken in
// briefing language: a headline states the situation, signal sentences under
// it surface risk / aging paperwork / what's coming, and the emphasized
// numbers ARE the filters. No stat cards, no table headers.
//
// Derived predicates (deliberately schedule-relative, not %-based):
//   late     instalment past due
//   at risk  2+ instalments behind OR oldest arrear > 30 days — a raw
//            "% unpaid" flag would fire on every healthy instalment plan
//   aging    invoice open past 30 days, or a draft never sent
//   upcoming instalments due in the next 7/30 days
// Data: ../invoices/sampleData (UX sample mode — wiring swaps that file).
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronDown, FileText, Sparkles, Wallet, ArrowUpRight, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { fmtMoney, fmtDate, useInvoiceTheme, Pill, useStatusMeta } from '../invoices/ui';
import { SAMPLE_BUYERS, SAMPLE_INVOICES, SAMPLE_UNATTACHED_RECEIPTS, TODAY_ISO, canCreateAdhocInvoice } from '../invoices/sampleData';
import { isOverdue as invoiceOverdue, openBalance, type BuyerRow, type Instalment } from '../invoices/types';

type Lens = 'everything' | 'late' | 'risk' | 'docs' | 'upcoming' | 'settled';

const dayMs = 86_400_000;
const lateDays = (iso: string) => Math.max(0, Math.floor((new Date(TODAY_ISO).getTime() - new Date(iso).getTime()) / dayMs));
const daysUntil = (iso: string) => Math.floor((new Date(iso).getTime() - new Date(TODAY_ISO).getTime()) / dayMs);

const AGING_DAYS = 30;
const RISK_ARREARS = 2;
const RISK_DAYS = 30;

// One buyer's derived money story — every flag on this page comes from here.
const storyOf = (b: BuyerRow, upcomingWindow: number) => {
  const open = b.instalments.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const late = b.instalments.filter((i) => i.status === 'overdue');
  const lateAmount = late.reduce((s, i) => s + i.amount, 0);
  const oldest = late.reduce((m, i) => Math.max(m, lateDays(i.date)), 0);
  const received = b.receipts.reduce((s, r) => s + r.amount, 0);
  const nextDue = b.instalments.find((i) => i.status === 'due');
  const atRisk = late.length >= RISK_ARREARS || oldest > RISK_DAYS;
  const docs = b.invoice_ids
    .map((id) => SAMPLE_INVOICES.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => !!i);
  const agingDocs = docs.filter((i) =>
    i.status === 'draft' || (openBalance(i) > 0.001 && i.status !== 'cancelled' && lateDays(i.issued_date) > AGING_DAYS));
  const upcoming = b.instalments.filter((i) => i.status === 'due' && daysUntil(i.date) >= 0 && daysUntil(i.date) <= upcomingWindow);
  const upcomingAmount = upcoming.reduce((s, i) => s + i.amount, 0);
  return { open, late, lateAmount, oldest, received, nextDue, atRisk, agingDocs, upcoming, upcomingAmount };
};
type Story = ReturnType<typeof storyOf>;

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

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `1px solid ${colors.utility.primaryText}12`;

  // ── the situation ─────────────────────────────────────────────────────────
  const situation = useMemo(() => {
    const stories = SAMPLE_BUYERS.map((b) => ({ b, s: storyOf(b, upWindow) }));
    const sum = (f: (x: { b: BuyerRow; s: Story }) => number) => stories.reduce((t, x) => t + f(x), 0);
    const agingInvoices = stories.flatMap((x) => x.s.agingDocs);
    return {
      stories,
      owed: sum((x) => x.s.open),
      lateAmt: sum((x) => x.s.lateAmount),
      lateBuyers: stories.filter((x) => x.s.lateAmount > 0).length,
      oldest: stories.reduce((m, x) => Math.max(m, x.s.oldest), 0),
      collected: sum((x) => x.s.received),
      riskBuyers: stories.filter((x) => x.s.atRisk),
      agingOpen: agingInvoices.filter((i) => i.status !== 'draft').length,
      drafts: agingInvoices.filter((i) => i.status === 'draft').length,
      upcomingAmt: sum((x) => x.s.upcomingAmount),
      upcomingBuyers: stories.filter((x) => x.s.upcoming.length > 0).length,
    };
  }, [upWindow]);

  const rows = useMemo(() => {
    let r = [...situation.stories].sort((a, z) => z.s.oldest - a.s.oldest || z.s.open - a.s.open);
    if (lens === 'late') r = r.filter((x) => x.s.lateAmount > 0);
    if (lens === 'risk') r = r.filter((x) => x.s.atRisk);
    if (lens === 'docs') r = r.filter((x) => x.s.agingDocs.length > 0);
    if (lens === 'upcoming') r = r.filter((x) => x.s.upcoming.length > 0).sort((a, z) =>
      Math.min(...a.s.upcoming.map((i) => daysUntil(i.date))) - Math.min(...z.s.upcoming.map((i) => daysUntil(i.date))));
    if (lens === 'settled') r = r.filter((x) => x.s.open <= 0.001);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) =>
      x.b.name.toLowerCase().includes(q) ||
      (x.b.plan_label || '').toLowerCase().includes(q) ||
      x.b.invoice_ids.some((id) => SAMPLE_INVOICES.find((i) => i.id === id)?.invoice_number.toLowerCase().includes(q)));
    return r;
  }, [situation, lens, search]);

  const toggleLens = (l: Lens) => setLens((cur) => (cur === l ? 'everything' : l));
  const toggleRow = (id: string) =>
    setOpenRows((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const sentenceFor = (b: BuyerRow, s: Story): string => {
    if (lens === 'upcoming' && s.upcoming.length > 0) {
      const first = s.upcoming[0];
      const d = daysUntil(first.date);
      return `${fmtMoney(first.amount)} due ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : fmtDate(first.date)}${s.lateAmount > 0 ? ` · plus ${fmtMoney(s.lateAmount)} already late` : ''}`;
    }
    if (s.open <= 0.001) {
      const last = b.receipts[b.receipts.length - 1];
      return last ? `Paid up — last receipt ${fmtMoney(last.amount)} · ${fmtDate(last.received_on)}` : 'Paid up';
    }
    if (s.atRisk) return `At risk — ${s.late.length} instalment${s.late.length === 1 ? '' : 's'} behind · ${s.oldest} days`;
    if (s.lateAmount > 0) {
      const part = s.received > 0 ? `${fmtMoney(s.received)} received, ` : 'nothing received, ';
      return `${part}${fmtMoney(s.lateAmount)} late for ${s.oldest} days`;
    }
    if (s.agingDocs.length > 0 && s.agingDocs[0].status === 'draft') return `Draft invoice never sent · ${s.agingDocs[0].invoice_number}`;
    return s.nextDue ? `On track — next ${fmtMoney(s.nextDue.amount)} due ${fmtDate(s.nextDue.date)}` : 'On track';
  };

  const Num: React.FC<{ v: string; color?: string; onClick?: () => void; active?: boolean }> = ({ v, color, onClick, active }) => (
    <button onClick={onClick} disabled={!onClick}
      className="font-extrabold tabular-nums align-baseline disabled:cursor-text"
      style={{ color: color || colors.utility.primaryText, borderBottom: onClick ? `2px ${active ? 'solid' : 'dotted'} ${color || brand}` : 'none', fontSize: '1.15em' }}>
      {v}
    </button>
  );

  // Signal sentence — one derived fact, one lens.
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

  const shownReceipts = receiptsExpanded ? SAMPLE_UNATTACHED_RECEIPTS : SAMPLE_UNATTACHED_RECEIPTS.slice(0, 2);
  const lateStories = situation.stories.filter((x) => x.s.lateAmount > 0);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* ── headline ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
            money in · {currentTenant?.name || 'your business'} · today
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-xl" style={ink}>
            <Num v={fmtMoney(situation.owed)} onClick={() => setLens('everything')} active={lens === 'everything'} /> is owed to you.
            {situation.lateAmt > 0 ? (
              <> <Num v={fmtMoney(situation.lateAmt)} color={red} onClick={() => toggleLens('late')} active={lens === 'late'} /> of it is late —
                {' '}{situation.lateBuyers} buyer{situation.lateBuyers === 1 ? '' : 's'}, the oldest <b className="tabular-nums">{situation.oldest} days</b>.</>
            ) : (<> Nothing is late.</>)}
          </h1>
          <p className="text-sm mt-3" style={sub}>
            <span className="font-bold tabular-nums" style={{ color: green }}>{fmtMoney(situation.collected)}</span> collected so far this year ·{' '}
            <button onClick={() => toggleLens('settled')}
              className="underline-offset-4" style={{ color: colors.utility.secondaryText, textDecoration: lens === 'settled' ? 'underline' : 'none' }}>
              see who's paid up
            </button>
          </p>
        </div>
        <button onClick={() => canCreateAdhocInvoice && navigate('/invoices/new')}
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white mt-1"
          style={{ backgroundColor: brand }}>
          <Plus size={14} /> New invoice
        </button>
      </div>

      {/* ── signals: risk · aging paperwork · what's coming ── */}
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
            {situation.drafts > 0 && <><b>{situation.drafts} draft{situation.drafts === 1 ? '' : 's'}</b> never sent</>}
            {'. '}
          </Signal>
        )}
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
      </div>

      {/* ── money that arrived before its paperwork — one line per receipt ── */}
      {SAMPLE_UNATTACHED_RECEIPTS.length > 0 && (
        <div className="mt-6 rounded-2xl px-5 py-4" style={{ backgroundColor: `${green}0f`, border: `1px solid ${green}35` }}>
          <p className="text-sm mb-2.5" style={ink}>
            <span className="font-extrabold tabular-nums" style={{ color: green }}>
              {fmtMoney(SAMPLE_UNATTACHED_RECEIPTS.reduce((s, r) => s + r.amount, 0))}
            </span>{' '}
            has already arrived without paperwork:
          </p>
          <div className="space-y-2">
            {shownReceipts.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <p className="text-[13px] flex-1 min-w-0 truncate" style={ink}>
                  <b className="tabular-nums">{fmtMoney(r.amount)}</b> · {r.contact_name}
                  <span style={sub}> · {r.method}{r.reference ? ` · ${r.reference}` : ''} · {fmtDate(r.received_on)}</span>
                </p>
                <button onClick={() => navigate(`/invoices/new?from=receipt:${r.id}`)}
                  className="flex-none text-[11px] font-bold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: green }}>
                  Generate invoice
                </button>
              </div>
            ))}
            {SAMPLE_UNATTACHED_RECEIPTS.length > 2 && !receiptsExpanded && (
              <button onClick={() => setReceiptsExpanded(true)} className="text-[11px] font-bold" style={{ color: green }}>
                and {SAMPLE_UNATTACHED_RECEIPTS.length - 2} more…
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── control line ── */}
      <div className="mt-9 mb-2 flex items-center gap-4 pb-3" style={{ borderBottom: hairline }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex-none" style={{ ...sub, ...mono }}>
          {rows.length} of {SAMPLE_BUYERS.length} buyers · {lens === 'upcoming' ? 'soonest first' : 'most late first'}
        </p>
        <div className="relative ml-auto w-full max-w-[240px]">
          <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2" style={sub} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name · contract · INV-…"
            className="w-full pl-6 pr-1 py-1 text-xs bg-transparent focus:outline-none"
            style={{ ...ink, borderBottom: `1px solid ${colors.utility.primaryText}25` }} />
        </div>
      </div>

      {/* ── the stories ── */}
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={sub}>Nobody matches — clear the search or the filter above.</p>
      ) : rows.map(({ b, s }) => {
        const open = openRows.has(b.contact_id);
        const accent = s.open <= 0.001 ? green : s.atRisk ? red : s.lateAmount > 0 ? red : amber;
        return (
          <div key={b.contact_id} style={{ borderBottom: hairline }}>
            <button onClick={() => toggleRow(b.contact_id)} className="w-full py-4 flex items-center gap-4 text-left group">
              <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${accent}66` }} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate" style={ink}>
                  {b.name}
                  {b.is_guest && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>guest</span>}
                  {s.atRisk && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: red, backgroundColor: `${red}14` }}>at risk</span>}
                </p>
                <p className="text-[13px] mt-0.5 truncate" style={{ color: s.lateAmount > 0 ? red : colors.utility.secondaryText }}>
                  {sentenceFor(b, s)}
                </p>
              </div>
              <div className="text-right flex-none">
                {s.open > 0.001
                  ? <p className="text-lg font-extrabold tabular-nums" style={ink}>{fmtMoney(s.open)}</p>
                  : <p className="text-lg font-extrabold tabular-nums" style={{ color: green }}>✓</p>}
                {b.plan_label && <p className="text-[10px]" style={{ ...sub, ...mono }}>{b.plan_label}</p>}
              </div>
              <ChevronDown size={16} className={`flex-none transition-transform ${open ? 'rotate-180' : ''} opacity-40 group-hover:opacity-80`} style={ink} />
            </button>

            {open && (
              <div className="pb-5 pl-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {b.instalments.map((i: Instalment, idx) => {
                    const c = i.status === 'paid' ? green : i.status === 'overdue' ? red : colors.utility.secondaryText;
                    return (
                      <span key={idx} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
                        style={{ ...mono, color: c, backgroundColor: `${c}12`, border: `1px solid ${c}30` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                        {fmtDate(i.date)} · {fmtMoney(i.amount)}{i.status === 'overdue' ? ` · ${lateDays(i.date)}d` : ''}
                      </span>
                    );
                  })}
                </div>

                {b.invoice_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {b.invoice_ids.map((id) => {
                      const inv = SAMPLE_INVOICES.find((i) => i.id === id);
                      if (!inv) return null;
                      const aging = s.agingDocs.some((d) => d.id === id);
                      const meta = statusMeta(inv.status, invoiceOverdue(inv, TODAY_ISO));
                      return (
                        <button key={id} onClick={() => navigate(`/invoices/${id}`)}
                          className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border text-left hover:brightness-95"
                          style={{
                            backgroundColor: aging ? `${amber}10` : colors.utility.secondaryBackground,
                            borderColor: aging ? `${amber}55` : `${colors.utility.primaryText}18`,
                          }}>
                          <FileText size={13} style={{ color: aging ? amber : brand }} />
                          <span className="text-[11px] font-bold" style={ink}>{inv.invoice_number}</span>
                          {aging && inv.status !== 'draft' && (
                            <span className="text-[10px] font-bold" style={{ ...mono, color: amber }}>{lateDays(inv.issued_date)}d open</span>
                          )}
                          <Pill label={meta.label} color={meta.color} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {b.receipts.map((r) => (
                  <p key={r.id} className="text-[11.5px]" style={{ ...sub, ...mono }}>
                    ↳ {fmtMoney(r.amount)} · {r.method}{r.reference ? ` · ${r.reference}` : ''} · {fmtDate(r.received_on)}
                  </p>
                ))}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => vaniToast.info('Record Payment wires to the existing receipt flow in the next batch.')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white" style={{ backgroundColor: green }}>
                    <Wallet size={13} /> Record payment
                  </button>
                  {s.open > 0.001 && (
                    <button onClick={() => setNudgeOpen(true)}
                      className="text-xs font-bold px-3.5 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
                      Nudge on WhatsApp
                    </button>
                  )}
                </div>
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

      {/* ── nudge preview drawer — the messages VaNi would send, verbatim ── */}
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
            {lateStories.map(({ b, s }) => (
              <div key={b.contact_id} className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ ...sub, ...mono }}>
                  → {b.name.split(' ')[0]} · {s.oldest}d late
                </p>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] leading-relaxed"
                  style={{ backgroundColor: `${green}12`, border: `1px solid ${green}30`, color: colors.utility.primaryText }}>
                  Namaste {b.name.split(' ')[0]} 🙏 — a gentle reminder from {currentTenant?.name || 'your group'}:{' '}
                  <b>{fmtMoney(s.lateAmount)}</b> towards {b.plan_label ? b.plan_label.split(' · ')[1] : 'your membership'} is pending
                  {s.oldest > 30 ? ` (open for ${s.oldest} days now)` : ''}. You can pay by UPI and reply here with the reference —
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

// ============================================================================
// Money In (/money-in) · Revenue perspective · UX layer
// ----------------------------------------------------------------------------
// Receivables + invoices MERGED — one worklist of buyer stories. Deliberately
// NOT dashboard furniture: no stat-card row, no table headers, no chip salad.
// The page speaks: a headline states the situation with the numbers inline
// (the emphasized words ARE the filters), then each buyer is one story row —
// a sentence, a big number, and everything behind it (instalments, documents,
// receipts) one tap away. Design language from the productled handoffs:
// editorial type, mono microlabels, hairlines, brand color as emphasis only.
// Data: ./invoices/sampleData (UX sample mode — wiring swaps that file).
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronDown, FileText, Sparkles, Wallet, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { fmtMoney, fmtDate, useInvoiceTheme, Pill, useStatusMeta } from '../invoices/ui';
import { SAMPLE_BUYERS, SAMPLE_INVOICES, SAMPLE_UNATTACHED_RECEIPTS, TODAY_ISO, canCreateAdhocInvoice } from '../invoices/sampleData';
import { isOverdue as invoiceOverdue, type BuyerRow, type Instalment } from '../invoices/types';

type Lens = 'everything' | 'late' | 'settled';

const dayMs = 86_400_000;
const lateDays = (iso: string) => Math.max(0, Math.floor((new Date(TODAY_ISO).getTime() - new Date(iso).getTime()) / dayMs));

// One buyer's derived money story.
const storyOf = (b: BuyerRow) => {
  const open = b.instalments.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const late = b.instalments.filter((i) => i.status === 'overdue');
  const lateAmount = late.reduce((s, i) => s + i.amount, 0);
  const oldest = late.reduce((m, i) => Math.max(m, lateDays(i.date)), 0);
  const received = b.receipts.reduce((s, r) => s + r.amount, 0);
  const nextDue = b.instalments.find((i) => i.status === 'due');
  return { open, late, lateAmount, oldest, received, nextDue };
};

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
  const [search, setSearch] = useState('');
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  // ── the situation, computed once ──────────────────────────────────────────
  const situation = useMemo(() => {
    const stories = SAMPLE_BUYERS.map((b) => ({ b, s: storyOf(b) }));
    const owed = stories.reduce((s, x) => s + x.s.open, 0);
    const lateAmt = stories.reduce((s, x) => s + x.s.lateAmount, 0);
    const lateBuyers = stories.filter((x) => x.s.lateAmount > 0).length;
    const oldest = stories.reduce((m, x) => Math.max(m, x.s.oldest), 0);
    const collected = stories.reduce((s, x) => s + x.s.received, 0);
    const unattached = SAMPLE_UNATTACHED_RECEIPTS.reduce((s, r) => s + r.amount, 0);
    return { stories, owed, lateAmt, lateBuyers, oldest, collected, unattached };
  }, []);

  const rows = useMemo(() => {
    let r = [...situation.stories].sort((a, z) => z.s.oldest - a.s.oldest || z.s.open - a.s.open);
    if (lens === 'late') r = r.filter((x) => x.s.lateAmount > 0);
    if (lens === 'settled') r = r.filter((x) => x.s.open <= 0.001);
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((x) =>
        x.b.name.toLowerCase().includes(q) ||
        (x.b.plan_label || '').toLowerCase().includes(q) ||
        x.b.invoice_ids.some((id) => SAMPLE_INVOICES.find((i) => i.id === id)?.invoice_number.toLowerCase().includes(q))
      );
    }
    return r;
  }, [situation, lens, search]);

  const toggleRow = (id: string) =>
    setOpenRows((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // The sentence under each name — the row's whole point.
  const sentenceFor = (b: BuyerRow, s: ReturnType<typeof storyOf>): string => {
    if (s.open <= 0.001) {
      const last = b.receipts[b.receipts.length - 1];
      return last ? `Paid up — last receipt ${fmtMoney(last.amount)} · ${fmtDate(last.received_on)}` : 'Paid up';
    }
    if (s.lateAmount > 0) {
      const part = s.received > 0 ? `${fmtMoney(s.received)} received, ` : 'nothing received, ';
      return `${part}${fmtMoney(s.lateAmount)} late for ${s.oldest} days`;
    }
    return s.nextDue ? `On track — next ${fmtMoney(s.nextDue.amount)} due ${fmtDate(s.nextDue.date)}` : 'On track';
  };

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `1px solid ${colors.utility.primaryText}12`;

  // Big inline number inside the headline; clicking the late one applies the lens.
  const Num: React.FC<{ v: string; color?: string; onClick?: () => void; active?: boolean }> = ({ v, color, onClick, active }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="font-extrabold tabular-nums align-baseline disabled:cursor-text"
      style={{
        color: color || colors.utility.primaryText,
        borderBottom: onClick ? `2px ${active ? 'solid' : 'dotted'} ${color || brand}` : 'none',
        fontSize: '1.15em',
      }}
    >
      {v}
    </button>
  );

  if (perspective === 'expense') {
    // Wrong side — Money In is a revenue instrument. Keep the route alive.
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

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* ── the headline — the page speaks first ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
            money in · {currentTenant?.name || 'your business'} · today
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-xl" style={ink}>
            <Num v={fmtMoney(situation.owed)} onClick={() => setLens('everything')} active={lens === 'everything'} /> is owed to you.
            {situation.lateAmt > 0 ? (
              <> <Num v={fmtMoney(situation.lateAmt)} color={red} onClick={() => setLens(lens === 'late' ? 'everything' : 'late')} active={lens === 'late'} /> of it is late —
                {' '}{situation.lateBuyers} buyer{situation.lateBuyers === 1 ? '' : 's'}, the oldest <b className="tabular-nums">{situation.oldest} days</b>.</>
            ) : (
              <> Nothing is late.</>
            )}
          </h1>
          <p className="text-sm mt-3" style={sub}>
            <span className="font-bold tabular-nums" style={{ color: green }}>{fmtMoney(situation.collected)}</span> collected so far this year ·{' '}
            <button onClick={() => setLens(lens === 'settled' ? 'everything' : 'settled')}
              className="underline-offset-4" style={{ color: colors.utility.secondaryText, textDecoration: lens === 'settled' ? 'underline' : 'none' }}>
              see who's paid up
            </button>
          </p>
        </div>
        <button
          onClick={() => canCreateAdhocInvoice && navigate('/invoices/new')}
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white mt-1"
          style={{ backgroundColor: brand }}
        >
          <Plus size={14} /> New invoice
        </button>
      </div>

      {/* ── paperwork debt — money that arrived before its document ── */}
      {situation.unattached > 0 && (
        <div className="mt-7 flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
          style={{ backgroundColor: `${green}0f`, border: `1px solid ${green}35` }}>
          <p className="text-sm" style={ink}>
            <span className="font-extrabold tabular-nums" style={{ color: green }}>{fmtMoney(situation.unattached)}</span>{' '}
            has already arrived without paperwork — {SAMPLE_UNATTACHED_RECEIPTS.map((r) => r.contact_name.split(' ')[0]).join(' and ')}.
          </p>
          <button onClick={() => navigate('/invoices/new?prefill=guest')}
            className="flex-none text-xs font-bold px-3.5 py-2 rounded-full text-white" style={{ backgroundColor: green }}>
            Generate invoices
          </button>
        </div>
      )}

      {/* ── one quiet control line ── */}
      <div className="mt-9 mb-2 flex items-center gap-4 pb-3" style={{ borderBottom: hairline }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex-none" style={{ ...sub, ...mono }}>
          {rows.length} of {SAMPLE_BUYERS.length} buyers · most late first
        </p>
        <div className="relative ml-auto w-full max-w-[240px]">
          <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2" style={sub} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name · contract · INV-…"
            className="w-full pl-6 pr-1 py-1 text-xs bg-transparent focus:outline-none"
            style={{ ...ink, borderBottom: `1px solid ${colors.utility.primaryText}25` }}
          />
        </div>
      </div>

      {/* ── the stories ── */}
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={sub}>Nobody matches — clear the search or the filter above.</p>
      ) : rows.map(({ b, s }) => {
        const open = openRows.has(b.contact_id);
        const accent = s.open <= 0.001 ? green : s.lateAmount > 0 ? red : amber;
        return (
          <div key={b.contact_id} style={{ borderBottom: hairline }}>
            {/* collapsed story */}
            <button onClick={() => toggleRow(b.contact_id)} className="w-full py-4 flex items-center gap-4 text-left group">
              <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${accent}66` }} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate" style={ink}>
                  {b.name}
                  {b.is_guest && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>guest</span>}
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

            {/* expanded: everything behind the sentence */}
            {open && (
              <div className="pb-5 pl-5 space-y-4">
                {/* instalment timeline */}
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

                {/* documents — the invoices ARE here, merged */}
                {b.invoice_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {b.invoice_ids.map((id) => {
                      const inv = SAMPLE_INVOICES.find((i) => i.id === id);
                      if (!inv) return null;
                      const meta = statusMeta(inv.status, invoiceOverdue(inv, TODAY_ISO));
                      return (
                        <button key={id} onClick={() => navigate(`/invoices/${id}`)}
                          className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border text-left hover:brightness-95"
                          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}18` }}>
                          <FileText size={13} style={{ color: brand }} />
                          <span className="text-[11px] font-bold" style={ink}>{inv.invoice_number}</span>
                          <Pill label={meta.label} color={meta.color} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* receipts, as one quiet line each */}
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
                    <button onClick={() => vaniToast.info('Nudges ride the VaNi WhatsApp rails — wiring batch.')}
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

      {/* ── VaNi, as an offer in a sentence ── */}
      {situation.lateBuyers > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <Sparkles size={15} style={{ color: brand }} />
          <p className="text-[13px]" style={sub}>
            VaNi can chase all {situation.lateBuyers} late buyers on WhatsApp and report back —{' '}
            <button onClick={() => vaniToast.info('AR nudge sequences arrive with the wiring batch.')} className="font-bold" style={{ color: brand }}>
              preview the messages
            </button>
            <span className="ml-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ ...mono, color: colors.utility.secondaryText, backgroundColor: `${colors.utility.primaryText}0d` }}>coming</span>
          </p>
        </div>
      )}

      <p className="mt-10 text-[10px] uppercase tracking-[0.18em] text-center" style={{ ...sub, ...mono }}>
        receipts unlimited · invoicing included · nothing here is metered
      </p>
    </div>
  );
};

export default MoneyInPage;

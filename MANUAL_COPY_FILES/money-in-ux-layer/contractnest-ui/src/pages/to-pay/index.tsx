// ============================================================================
// To Pay (/to-pay) · Expense perspective · UX layer
// The mirror of Money In, same briefing language: the page states what you
// owe, then one story per vendor. Your ContractNest subscription is simply a
// vendor row here — the V5 model made that literal. UX sample mode.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowUpRight, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { fmtMoney, fmtDate, useInvoiceTheme } from '../invoices/ui';
import { SAMPLE_VENDORS, TODAY_ISO, type VendorRow } from '../invoices/sampleData';

const dayMs = 86_400_000;
const lateDays = (iso: string) => Math.max(0, Math.floor((new Date(TODAY_ISO).getTime() - new Date(iso).getTime()) / dayMs));
const within30 = (iso: string) => {
  const d = (new Date(iso).getTime() - new Date(TODAY_ISO).getTime()) / dayMs;
  return d >= 0 && d <= 30;
};

const ToPayPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, perspective } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const red = colors.semantic.error;
  const green = colors.semantic.success;

  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [lens, setLens] = useState<'all' | 'late'>('all');

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `1px solid ${colors.utility.primaryText}12`;

  const storyOf = (v: VendorRow) => {
    const open = v.bills.filter((b) => b.status !== 'paid');
    const owed = open.reduce((s, b) => s + b.amount, 0);
    const late = open.filter((b) => b.status === 'overdue');
    const lateAmt = late.reduce((s, b) => s + b.amount, 0);
    const oldest = late.reduce((m, b) => Math.max(m, lateDays(b.due)), 0);
    const soon = open.filter((b) => within30(b.due) && b.status !== 'overdue');
    return { owed, lateAmt, oldest, soonCount: soon.length, next: open[0] };
  };

  const situation = useMemo(() => {
    const stories = SAMPLE_VENDORS.map((v) => ({ v, s: storyOf(v) }));
    return {
      stories,
      owed: stories.reduce((s, x) => s + x.s.owed, 0),
      lateAmt: stories.reduce((s, x) => s + x.s.lateAmt, 0),
      lateVendors: stories.filter((x) => x.s.lateAmt > 0).length,
      oldest: stories.reduce((m, x) => Math.max(m, x.s.oldest), 0),
      upcoming30: stories.reduce((s, x) => s + x.s.soonCount, 0),
    };
  }, []);

  const rows = useMemo(() => {
    let r = [...situation.stories].sort((a, z) => z.s.oldest - a.s.oldest || z.s.owed - a.s.owed);
    if (lens === 'late') r = r.filter((x) => x.s.lateAmt > 0);
    return r;
  }, [situation, lens]);

  if (perspective === 'revenue') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>to pay · expense side</p>
        <h1 className="text-xl font-extrabold mb-2" style={ink}>You're on the revenue side right now</h1>
        <p className="text-sm mb-5" style={sub}>To Pay shows what you owe others. Money owed to <i>you</i> lives in Money In.</p>
        <button onClick={() => navigate('/money-in')} className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: brand }}>
          Go to Money In <ArrowUpRight size={14} />
        </button>
      </div>
    );
  }

  const Num: React.FC<{ v: string; color?: string; onClick?: () => void; active?: boolean }> = ({ v, color, onClick, active }) => (
    <button onClick={onClick} disabled={!onClick}
      className="font-extrabold tabular-nums align-baseline disabled:cursor-text"
      style={{ color: color || colors.utility.primaryText, borderBottom: onClick ? `2px ${active ? 'solid' : 'dotted'} ${color || brand}` : 'none', fontSize: '1.15em' }}>
      {v}
    </button>
  );

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
        to pay · {currentTenant?.name || 'your business'} · today
      </p>
      <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-xl" style={ink}>
        You owe <Num v={fmtMoney(situation.owed)} onClick={() => setLens('all')} active={lens === 'all'} /> across {situation.stories.length} vendors.
        {situation.lateAmt > 0 ? (
          <> <Num v={fmtMoney(situation.lateAmt)} color={red} onClick={() => setLens(lens === 'late' ? 'all' : 'late')} active={lens === 'late'} /> is late —
            {' '}the oldest <b className="tabular-nums">{situation.oldest} days</b>.</>
        ) : (
          <> Nothing is late.</>
        )}
      </h1>
      <p className="text-sm mt-3" style={sub}>
        {situation.upcoming30 > 0 ? `${situation.upcoming30} bill${situation.upcoming30 === 1 ? '' : 's'} due in the next 30 days.` : 'Nothing due in the next 30 days.'}
      </p>

      <div className="mt-9 mb-2 pb-3" style={{ borderBottom: hairline }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>
          {rows.length} of {situation.stories.length} vendors · most late first
        </p>
      </div>

      {rows.map(({ v, s }) => {
        const open = openRows.has(v.id);
        const accent = s.owed <= 0.001 ? green : s.lateAmt > 0 ? red : colors.semantic.warning;
        return (
          <div key={v.id} style={{ borderBottom: hairline }}>
            <button onClick={() => setOpenRows((set) => { const n = new Set(set); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n; })}
              className="w-full py-4 flex items-center gap-4 text-left group">
              <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${accent}66` }} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate" style={ink}>
                  {v.name}
                  {v.isPlatform && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest align-middle px-1.5 py-0.5 rounded" style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>subscription</span>}
                </p>
                <p className="text-[13px] mt-0.5 truncate" style={{ color: s.lateAmt > 0 ? red : colors.utility.secondaryText }}>
                  {s.lateAmt > 0
                    ? `${fmtMoney(s.lateAmt)} late for ${s.oldest} days${v.note ? ` · ${v.note}` : ''}`
                    : s.next ? `Next: ${s.next.label} · due ${fmtDate(s.next.due)}` : v.note || 'Settled'}
                </p>
              </div>
              <p className="text-lg font-extrabold tabular-nums flex-none" style={ink}>{s.owed > 0 ? fmtMoney(s.owed) : '✓'}</p>
              <ChevronDown size={16} className={`flex-none transition-transform ${open ? 'rotate-180' : ''} opacity-40 group-hover:opacity-80`} style={ink} />
            </button>

            {open && (
              <div className="pb-5 pl-5 space-y-2.5">
                {v.bills.map((b) => {
                  const c = b.status === 'paid' ? green : b.status === 'overdue' ? red : colors.utility.secondaryText;
                  return (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: c }} />
                      <p className="text-[13px] flex-1 min-w-0 truncate" style={ink}>{b.label}</p>
                      <p className="text-[11px] flex-none" style={{ ...mono, color: c }}>
                        {b.status === 'overdue' ? `${lateDays(b.due)}d late` : `due ${fmtDate(b.due)}`}
                      </p>
                      <p className="text-[13px] font-bold tabular-nums flex-none" style={ink}>{fmtMoney(b.amount)}</p>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-2">
                  {v.isPlatform ? (
                    <button onClick={() => navigate('/settings/businessmodel/subscription')}
                      className="text-xs font-bold px-3.5 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
                      Manage subscription
                    </button>
                  ) : (
                    <button onClick={() => vaniToast.info('Marking a bill paid wires to the payables flow in the next batch.')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white" style={{ backgroundColor: green }}>
                      <Wallet size={13} /> Mark paid
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p className="mt-10 text-[10px] uppercase tracking-[0.18em] text-center" style={{ ...sub, ...mono }}>
        expense side · the reverse of money in
      </p>
    </div>
  );
};

export default ToPayPage;

// ============================================================================
// To Pay (/to-pay) · Expense perspective · WIRED read-only (A1)
// The mirror of Money In on live data: get_tenant_payables via usePayables.
// Vendor stories grouped by counterparty, bills = their invoices. Write-side
// actions (mark paid / approve) arrive in a later step — buttons say so.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { usePayables, type FinanceInvoice } from '@/hooks/queries/useFinanceQueries';
import { fmtMoney, fmtDate, useInvoiceTheme } from '../invoices/ui';

const ToPayPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, perspective } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const red = colors.semantic.error;
  const green = colors.semantic.success;

  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [lens, setLens] = useState<'all' | 'late'>('all');

  const payablesQuery = usePayables({ enabled: perspective === 'expense' });
  const data = payablesQuery.data;

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `1px solid ${colors.utility.primaryText}12`;

  const vendors = useMemo(() => {
    const invoices = data?.invoices || [];
    const byVendor = new Map<string, FinanceInvoice[]>();
    for (const inv of invoices) {
      const key = inv.counterparty_name || inv.contract_name || 'Unknown vendor';
      if (!byVendor.has(key)) byVendor.set(key, []);
      byVendor.get(key)!.push(inv);
    }
    return [...byVendor.entries()].map(([name, bills]) => {
      const openBills = bills.filter((b) => b.balance > 0.001 && b.status !== 'cancelled');
      const late = openBills.filter((b) => b.days_overdue > 0);
      const oldest = late.reduce((m, b) => Math.max(m, b.days_overdue), 0);
      return {
        name,
        bills: bills.sort((a, z) => (a.due_date || '').localeCompare(z.due_date || '')),
        owed: openBills.reduce((s, b) => s + b.balance, 0),
        lateAmt: late.reduce((s, b) => s + b.balance, 0),
        oldest,
        next: openBills.filter((b) => b.days_overdue <= 0)[0] || null,
      };
    }).sort((a, z) => z.oldest - a.oldest || z.owed - a.owed);
  }, [data]);

  const situation = useMemo(() => ({
    owed: data?.summary?.total_payable ?? 0,
    lateAmt: data?.summary?.overdue_total ?? 0,
    oldest: vendors.reduce((m, v) => Math.max(m, v.oldest), 0),
    upcoming30: data?.summary?.upcoming_30_count ?? 0,
  }), [data, vendors]);

  const rows = lens === 'late' ? vendors.filter((v) => v.lateAmt > 0) : vendors;

  const Num: React.FC<{ v: string; color?: string; onClick?: () => void; active?: boolean }> = ({ v, color, onClick, active }) => (
    <button onClick={onClick} disabled={!onClick}
      className="font-extrabold tabular-nums align-baseline disabled:cursor-text"
      style={{ color: color || colors.utility.primaryText, borderBottom: onClick ? `2px ${active ? 'solid' : 'dotted'} ${color || brand}` : 'none', fontSize: '1.15em' }}>
      {v}
    </button>
  );

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

  if (payablesQuery.isLoading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (payablesQuery.isError) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm mb-3" style={sub}>Couldn't load what you owe.</p>
        <button onClick={() => payablesQuery.refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
        to pay · {currentTenant?.name || 'your business'} · {data?.as_of ? fmtDate(data.as_of) : 'today'}
      </p>
      <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-xl" style={ink}>
        {vendors.length === 0 ? (<>You owe nothing right now.</>) : (
          <>You owe <Num v={fmtMoney(situation.owed)} onClick={() => setLens('all')} active={lens === 'all'} /> across {vendors.length} vendor{vendors.length === 1 ? '' : 's'}.
            {situation.lateAmt > 0 ? (
              <> <Num v={fmtMoney(situation.lateAmt)} color={red} onClick={() => setLens(lens === 'late' ? 'all' : 'late')} active={lens === 'late'} /> is late —
                {' '}the oldest <b className="tabular-nums">{situation.oldest} days</b>.</>
            ) : (<> Nothing is late.</>)}
          </>
        )}
      </h1>
      <p className="text-sm mt-3" style={sub}>
        {situation.upcoming30 > 0 ? `${situation.upcoming30} bill${situation.upcoming30 === 1 ? '' : 's'} due in the next 30 days.` : 'Nothing due in the next 30 days.'}
      </p>

      {vendors.length > 0 && (
        <div className="mt-9 mb-2 pb-3" style={{ borderBottom: hairline }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>
            {rows.length} of {vendors.length} vendors · most late first
          </p>
        </div>
      )}

      {rows.map((v) => {
        const open = openRows.has(v.name);
        const accent = v.owed <= 0.001 ? green : v.lateAmt > 0 ? red : colors.semantic.warning;
        return (
          <div key={v.name} className="rounded-2xl border mb-3 overflow-hidden"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}14` }}>
            <button onClick={() => setOpenRows((set) => { const n = new Set(set); n.has(v.name) ? n.delete(v.name) : n.add(v.name); return n; })}
              className="w-full px-4 py-4 flex items-center gap-4 text-left group">
              <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${accent}66` }} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate" style={ink}>{v.name}</p>
                <p className="text-[13px] mt-0.5 truncate" style={{ color: v.lateAmt > 0 ? red : colors.utility.secondaryText }}>
                  {v.lateAmt > 0
                    ? `${fmtMoney(v.lateAmt)} late for ${v.oldest} days`
                    : v.next ? `Next: ${v.next.invoice_number} · due ${fmtDate(v.next.due_date)}` : 'Settled'}
                </p>
              </div>
              <p className="text-lg font-extrabold tabular-nums flex-none" style={ink}>{v.owed > 0 ? fmtMoney(v.owed) : '✓'}</p>
              <ChevronDown size={16} className={`flex-none transition-transform ${open ? 'rotate-180' : ''} opacity-40 group-hover:opacity-80`} style={ink} />
            </button>

            {open && (
              <div className="pb-5 pl-9 pr-5 space-y-2.5">
                {v.bills.map((b) => {
                  const c = b.balance <= 0.001 ? green : b.days_overdue > 0 ? red : colors.utility.secondaryText;
                  return (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: c }} />
                      <p className="text-[13px] flex-1 min-w-0 truncate" style={ink}>
                        {b.invoice_number}
                        <span style={sub}> · {b.contract_name || b.contract_number}</span>
                      </p>
                      <p className="text-[11px] flex-none" style={{ ...mono, color: c }}>
                        {b.balance <= 0.001 ? 'paid' : b.days_overdue > 0 ? `${b.days_overdue}d late` : `due ${fmtDate(b.due_date)}`}
                      </p>
                      <p className="text-[13px] font-bold tabular-nums flex-none" style={ink}>{fmtMoney(b.balance > 0.001 ? b.balance : b.total_amount)}</p>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-2">
                  {v.bills[0] && (
                    <button onClick={() => navigate(`/contracts/${v.bills[0].contract_id}/invoice/${v.bills[0].id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border"
                      style={{ color: brand, borderColor: `${brand}45` }}>
                      View bill <ExternalLink size={12} />
                    </button>
                  )}
                  <button onClick={() => navigate(`/contracts/${v.bills[0]?.contract_id}`)}
                    className="text-xs font-bold px-3.5 py-2 rounded-full border" style={{ ...sub, borderColor: `${colors.utility.primaryText}22` }}>
                    View contract
                  </button>
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

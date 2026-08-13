// ============================================================================
// Invoices — hub (/invoices) · UX layer
// Product-led rules: totals strip = clickable filters, every row carries a
// human reason, seller instrument only (nav hidden in Expense; the route
// itself stays reachable for cross-links, showing a pointer instead).
// Data comes exclusively from ./sampleData — the wiring batch swaps that file.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpRight, Wallet, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fmtMoney, fmtDate, useInvoiceTheme, useStatusMeta, Pill, IncludedBadge, EmptyState } from './ui';
import { SAMPLE_INVOICES, TODAY_ISO, canCreateAdhocInvoice } from './sampleData';
import { isOverdue, openBalance, daysLate, type InvoiceSummary } from './types';

type Segment = 'all' | 'open' | 'overdue' | 'draft' | 'adhoc';

const InvoicesHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { perspective } = useAuth();
  const { colors, ink, sub, card, hairline } = useInvoiceTheme();
  const statusMeta = useStatusMeta();
  const brand = colors.brand.primary;

  const [segment, setSegment] = useState<Segment>('all');
  const [search, setSearch] = useState('');

  const invoices = SAMPLE_INVOICES;

  const totals = useMemo(() => {
    const open = invoices.filter((i) => openBalance(i) > 0.001 && i.status !== 'draft' && i.status !== 'cancelled');
    const overdue = open.filter((i) => isOverdue(i, TODAY_ISO));
    const drafts = invoices.filter((i) => i.status === 'draft');
    const collected = invoices.reduce((s, i) => s + i.amount_settled, 0);
    const oldestLate = overdue.reduce((m, i) => Math.max(m, daysLate(i, TODAY_ISO)), 0);
    return {
      openAmount: open.reduce((s, i) => s + openBalance(i), 0),
      openCount: open.length,
      overdueAmount: overdue.reduce((s, i) => s + openBalance(i), 0),
      overdueCount: overdue.length,
      oldestLate,
      collected,
      draftCount: drafts.length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    let rows = invoices;
    if (segment === 'open') rows = rows.filter((i) => openBalance(i) > 0.001 && i.status !== 'draft' && i.status !== 'cancelled');
    if (segment === 'overdue') rows = rows.filter((i) => isOverdue(i, TODAY_ISO));
    if (segment === 'draft') rows = rows.filter((i) => i.status === 'draft');
    if (segment === 'adhoc') rows = rows.filter((i) => !i.contract_id);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((i) =>
        [i.invoice_number, i.contact_name, i.contract_number].filter(Boolean).some((v) => (v as string).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [invoices, segment, search]);

  // Human reason: the one line that tells the owner what this row means today.
  const reasonFor = (inv: InvoiceSummary): string => {
    if (inv.status === 'draft') return 'Draft — not sent yet';
    if (inv.status === 'cancelled') return 'Cancelled';
    const open = openBalance(inv);
    if (open <= 0.001) return `Paid in full · ${fmtDate(inv.issued_date)}`;
    const late = isOverdue(inv, TODAY_ISO) ? ` · ${daysLate(inv, TODAY_ISO)}d late` : '';
    const part = inv.amount_settled > 0 ? `${fmtMoney(inv.amount_settled, inv.currency)} received · ` : '';
    return `${part}${fmtMoney(open, inv.currency)} open${late}`;
  };

  // Expense perspective: invoices are a seller instrument. Keep the route
  // alive for cross-links but point buyers at the surfaces that own their job.
  if (perspective === 'expense') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-extrabold mb-1" style={ink}>Invoices</h1>
        <p className="text-sm mb-5" style={sub}>
          Creating invoices is part of the revenue side. On the expense side, what you owe
          lives with the surfaces built for paying:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => navigate('/ops/finance')} className="rounded-xl p-4 text-left border hover:brightness-95" style={card}>
            <p className="text-sm font-bold" style={ink}>Bills to pay <ArrowUpRight size={13} className="inline ml-1" /></p>
            <p className="text-xs mt-1" style={sub}>Finance (AR/AP) — vendor invoices, due dates, approvals.</p>
          </button>
          <button onClick={() => navigate('/settings/businessmodel/subscription')} className="rounded-xl p-4 text-left border hover:brightness-95" style={card}>
            <p className="text-sm font-bold" style={ink}>Your ContractNest plan <ArrowUpRight size={13} className="inline ml-1" /></p>
            <p className="text-xs mt-1" style={sub}>Subscription invoices and payment history.</p>
          </button>
        </div>
      </div>
    );
  }

  const seg = (key: Segment, active: boolean): React.CSSProperties => ({
    backgroundColor: active ? `${brand}14` : colors.utility.secondaryBackground,
    border: `1px solid ${active ? `${brand}55` : `${colors.utility.primaryText}14`}`,
    cursor: 'pointer',
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* header — job language, verbs as buttons */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <h1 className="text-xl font-extrabold" style={ink}>Invoices</h1>
          <p className="text-[13px]" style={sub}>Money you've asked for — and what's still open.</p>
        </div>
        <div className="flex items-center gap-2">
          <IncludedBadge />
          <button
            onClick={() => canCreateAdhocInvoice && navigate('/invoices/new')}
            disabled={!canCreateAdhocInvoice}
            title={canCreateAdhocInvoice ? undefined : 'Available on paid plans — upgrade to create standalone invoices.'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: brand }}
          >
            <Plus size={14} /> New invoice
          </button>
        </div>
      </div>

      {/* totals strip — clickable segments, not a report */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 mb-5">
        <div role="button" onClick={() => setSegment(segment === 'open' ? 'all' : 'open')} className="rounded-xl px-4 py-3.5" style={seg('open', segment === 'open')}>
          <div className="flex items-center gap-2 mb-1"><Wallet size={13} style={{ color: brand }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={sub}>Outstanding</span></div>
          <div className="text-xl font-extrabold" style={ink}>{fmtMoney(totals.openAmount)}</div>
          <div className="text-[11px]" style={sub}>{totals.openCount} invoice{totals.openCount === 1 ? '' : 's'} open</div>
        </div>
        <div role="button" onClick={() => setSegment(segment === 'overdue' ? 'all' : 'overdue')} className="rounded-xl px-4 py-3.5" style={seg('overdue', segment === 'overdue')}>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={13} style={{ color: colors.semantic.error }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={sub}>Overdue</span></div>
          <div className="text-xl font-extrabold" style={{ color: totals.overdueCount ? colors.semantic.error : colors.utility.primaryText }}>{fmtMoney(totals.overdueAmount)}</div>
          <div className="text-[11px]" style={sub}>{totals.overdueCount ? `${totals.overdueCount} late · oldest ${totals.oldestLate}d` : 'nothing late'}</div>
        </div>
        <div role="button" onClick={() => setSegment(segment === 'draft' ? 'all' : 'draft')} className="rounded-xl px-4 py-3.5" style={seg('draft', segment === 'draft')}>
          <div className="flex items-center gap-2 mb-1"><FileText size={13} style={sub} /><span className="text-[10px] font-bold uppercase tracking-wider" style={sub}>Collected · Drafts</span></div>
          <div className="text-xl font-extrabold" style={ink}>{fmtMoney(totals.collected)}</div>
          <div className="text-[11px]" style={sub}>{totals.draftCount} draft{totals.draftCount === 1 ? '' : 's'} waiting</div>
        </div>
      </div>

      {/* filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {([['all', 'All'], ['open', 'Open'], ['overdue', 'Overdue'], ['adhoc', 'Ad-hoc'], ['draft', 'Drafts']] as [Segment, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setSegment(key)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={seg(key, segment === key)}>
            <span style={segment === key ? { color: brand } : sub}>{label}</span>
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={sub} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, member, contract…"
            className="w-full pl-9 pr-3 py-1.5 rounded-full border text-xs bg-transparent"
            style={{ ...ink, borderColor: `${colors.utility.primaryText}25` }}
          />
        </div>
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <EmptyState title="No invoices match" hint="Clear the filters, or create your first invoice." />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((inv) => {
            const overdue = isOverdue(inv, TODAY_ISO);
            const meta = statusMeta(inv.status, overdue);
            return (
              <button
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="w-full grid items-center gap-3 px-4 py-3 rounded-xl border text-left hover:brightness-[0.98]"
                style={{ ...card, gridTemplateColumns: 'minmax(110px,0.9fr) minmax(160px,1.4fr) minmax(200px,1.6fr) 110px 120px' }}
              >
                <div>
                  <p className="text-xs font-extrabold" style={ink}>{inv.invoice_number}</p>
                  <p className="text-[11px]" style={sub}>{fmtDate(inv.issued_date)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={ink}>{inv.contact_name || '—'}</p>
                  <p className="text-[11px] truncate" style={sub}>
                    {inv.contract_number ?? 'Ad-hoc — no contract'}
                  </p>
                </div>
                <p className="text-[12px] truncate" style={sub}>{reasonFor(inv)}</p>
                <p className="text-sm font-extrabold tabular-nums text-right" style={ink}>{fmtMoney(inv.total_amount, inv.currency)}</p>
                <div className="justify-self-end"><Pill label={meta.label} color={meta.color} /></div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] mt-6 pb-2 border-b-0" style={sub}>
        Receipts are unlimited and free — record every partial payment. Invoicing is included with your plan.
      </p>
    </div>
  );
};

export default InvoicesHubPage;

// ============================================================================
// Invoice register (/invoices) · Revenue perspective
// ----------------------------------------------------------------------------
// NOT a second money surface, and NOT a new nav item — Money In remains the
// one entry point per side (owner decision, 2026-08-13). This is its
// drill-down: Money In answers "who owes me and what do I do about it",
// grouped by buyer and scoped to the live picture. That deliberately cannot
// answer "where is INV-10059", because a cancelled or long-settled document
// has no place in a story about open money.
//
// So this is the document view of the same data: every invoice the tenant has,
// flat, newest first, searchable by number / buyer / contract, filterable by
// what a person actually looks for. Contract invoices and ad-hoc invoices sit
// in one list — an ad-hoc invoice is marked, not segregated.
//
// NO new backend: get_tenant_receivables already returns the full invoice
// array (including `is_adhoc`, drafts and cancelled rows) alongside the
// billing events Money In groups on. Same query, same cache — the two screens
// cannot disagree.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, ArrowUpRight, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useReceivables, type FinanceInvoice } from '@/hooks/queries/useFinanceQueries';
import { fmtMoney, fmtDate, daysSince } from '@/utils/format';
import { useInvoiceTheme, Pill, useStatusMeta } from './ui';

/** How long an open document may sit before it is the problem, not the buyer. */
const AGING_DAYS = 30;

type Lens = 'all' | 'open' | 'late' | 'drafts' | 'paid' | 'adhoc';

const LENSES: { key: Lens; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'late', label: 'Late' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'paid', label: 'Paid' },
  { key: 'adhoc', label: 'Ad-hoc' },
];

const isOpen = (i: FinanceInvoice) => i.balance > 0.001 && i.status !== 'cancelled' && i.status !== 'draft';
const isAdhoc = (i: FinanceInvoice) => !i.contract_id || (i as any).is_adhoc === true;

const InvoiceRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, perspective } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const statusMeta = useStatusMeta();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;

  const [lens, setLens] = useState<Lens>('all');
  const [search, setSearch] = useState('');

  // Same hook, same query key as Money In — this page adds no load of its own.
  const receivablesQuery = useReceivables({ enabled: perspective === 'revenue' });
  const invoices: FinanceInvoice[] = receivablesQuery.data?.invoices || [];

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `1px solid ${colors.utility.primaryText}12`;

  const counts = useMemo(() => ({
    all: invoices.length,
    open: invoices.filter(isOpen).length,
    late: invoices.filter((i) => isOpen(i) && i.days_overdue > 0).length,
    drafts: invoices.filter((i) => i.status === 'draft').length,
    paid: invoices.filter((i) => i.balance <= 0.001 && i.status !== 'cancelled' && i.status !== 'draft').length,
    adhoc: invoices.filter(isAdhoc).length,
  }), [invoices]);

  const rows = useMemo(() => {
    let r = [...invoices];
    if (lens === 'open') r = r.filter(isOpen);
    if (lens === 'late') r = r.filter((i) => isOpen(i) && i.days_overdue > 0);
    if (lens === 'drafts') r = r.filter((i) => i.status === 'draft');
    if (lens === 'paid') r = r.filter((i) => i.balance <= 0.001 && i.status !== 'cancelled' && i.status !== 'draft');
    if (lens === 'adhoc') r = r.filter(isAdhoc);

    const q = search.trim().toLowerCase();
    if (q) r = r.filter((i) =>
      i.invoice_number?.toLowerCase().includes(q) ||
      (i.buyer_name || '').toLowerCase().includes(q) ||
      (i.buyer_company || '').toLowerCase().includes(q) ||
      (i.contract_number || '').toLowerCase().includes(q) ||
      (i.contract_name || '').toLowerCase().includes(q));

    // Late first (the only rows that need a decision), then newest issued.
    return r.sort((a, z) =>
      (z.days_overdue > 0 ? 1 : 0) - (a.days_overdue > 0 ? 1 : 0) ||
      z.days_overdue - a.days_overdue ||
      (z.issued_at || z.created_at || '').localeCompare(a.issued_at || a.created_at || ''));
  }, [invoices, lens, search]);

  const shownOutstanding = rows.reduce((s, i) => s + (i.balance > 0.001 ? i.balance : 0), 0);

  // An ad-hoc invoice has no contract to route through; both land on the SAME
  // viewer page (Part 1 made it contract-optional).
  const openInvoice = (i: FinanceInvoice) =>
    navigate(i.contract_id ? `/contracts/${i.contract_id}/invoice/${i.id}` : `/invoices/${i.id}`);

  if (perspective === 'expense') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>invoices · revenue side</p>
        <h1 className="text-xl font-extrabold mb-2" style={ink}>You're on the expense side right now</h1>
        <p className="text-sm mb-5" style={sub}>Invoices you raise live on the revenue side. Bills you receive are in To Pay.</p>
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
        <p className="text-sm mb-3" style={sub}>Couldn't load your invoices.</p>
        <button onClick={() => receivablesQuery.refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* ── header ── */}
      <button onClick={() => navigate('/money-in')} className="inline-flex items-center gap-1.5 text-[11px] font-bold mb-4" style={sub}>
        <ArrowLeft size={13} /> Money In
      </button>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>
            invoice register · {currentTenant?.name || 'your business'}
          </p>
          <h1 className="text-[24px] sm:text-[27px] leading-snug font-medium max-w-xl" style={ink}>
            {counts.all === 0
              ? <>No invoices yet.</>
              : <>Every invoice you've raised — <b className="tabular-nums font-extrabold">{counts.all}</b> in all
                  {counts.adhoc > 0 && <>, <b className="tabular-nums font-extrabold">{counts.adhoc}</b> without a contract</>}.</>}
          </h1>
          {counts.all > 0 && (
            <p className="text-sm mt-2.5" style={sub}>
              Looking for one document. For who owes what and what to do about it,{' '}
              <button onClick={() => navigate('/money-in')} className="font-bold underline-offset-4 hover:underline" style={{ color: brand }}>
                Money In
              </button>{' '}is the place.
            </p>
          )}
        </div>
        <button onClick={() => navigate('/invoices/new')}
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white mt-1"
          style={{ backgroundColor: brand }}>
          <Plus size={14} /> New invoice
        </button>
      </div>

      {/* ── lenses + search ── */}
      {counts.all > 0 && (
        <>
          <div className="mt-7 flex flex-wrap items-center gap-1.5">
            {LENSES.filter((l) => l.key === 'all' || counts[l.key] > 0).map((l) => {
              const on = lens === l.key;
              const c = l.key === 'late' ? red : l.key === 'drafts' ? amber : l.key === 'paid' ? green : brand;
              return (
                <button key={l.key} onClick={() => setLens(l.key)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    ...mono,
                    color: on ? c : colors.utility.secondaryText,
                    backgroundColor: on ? `${c}18` : 'transparent',
                    border: `1px solid ${on ? `${c}50` : `${colors.utility.primaryText}18`}`,
                  }}>
                  {l.label} {counts[l.key]}
                </button>
              );
            })}
            <div className="relative ml-auto w-full max-w-[240px]">
              <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2" style={sub} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="INV-… · name · contract"
                className="w-full pl-6 pr-1 py-1 text-xs bg-transparent focus:outline-none"
                style={{ ...ink, borderBottom: `1px solid ${colors.utility.primaryText}25` }} />
            </div>
          </div>

          <div className="mt-5 mb-2 pb-2.5" style={{ borderBottom: hairline }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>
              {rows.length} of {counts.all} invoices
              {shownOutstanding > 0 && <> · {fmtMoney(shownOutstanding)} still open</>}
            </p>
          </div>
        </>
      )}

      {/* ── the documents ── */}
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={sub}>
          {counts.all === 0
            ? 'Invoices appear here as contracts bill, and whenever you raise one directly.'
            : 'Nothing matches — clear the search or pick a different filter.'}
        </p>
      ) : rows.map((i) => {
        const meta = statusMeta(
          (i.status === 'overdue' ? 'unpaid' : i.status === 'bad_debt' ? 'cancelled' : i.status) as any,
          i.status === 'overdue' || i.days_overdue > 0
        );
        const late = isOpen(i) && i.days_overdue > 0;
        const aging = isOpen(i) && !late && daysSince(i.issued_at) > AGING_DAYS;
        const accent = i.status === 'draft' ? amber : late ? red : i.balance <= 0.001 ? green : amber;
        return (
          <button key={i.id} onClick={() => openInvoice(i)}
            className="w-full rounded-xl border mb-2 px-4 py-3 flex items-center gap-3.5 text-left hover:brightness-[0.97]"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}14` }}>
            <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${accent}66` }} />
            <FileText size={15} className="flex-none" style={{ color: accent }} />

            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold truncate flex items-center gap-2" style={ink}>
                <span style={mono}>{i.invoice_number}</span>
                {isAdhoc(i) && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-none"
                    style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>ad-hoc</span>
                )}
              </p>
              <p className="text-[12px] mt-0.5 truncate" style={sub}>
                {i.buyer_name || i.buyer_company || 'No contact on file'}
                {i.contract_number && <> · {i.contract_number}</>}
                {i.issued_at && <> · issued {fmtDate(i.issued_at)}</>}
              </p>
            </div>

            <div className="text-right flex-none">
              <p className="text-[14px] font-extrabold tabular-nums" style={ink}>{fmtMoney(i.total_amount, i.currency)}</p>
              <p className="text-[10.5px] mt-0.5" style={{ ...mono, color: late ? red : i.balance > 0.001 ? colors.utility.secondaryText : green }}>
                {i.balance > 0.001
                  ? late
                    ? `${fmtMoney(i.balance, i.currency)} · ${i.days_overdue}d late`
                    : aging
                      ? `${fmtMoney(i.balance, i.currency)} · ${daysSince(i.issued_at)}d open`
                      : `${fmtMoney(i.balance, i.currency)} open${i.due_date ? ` · due ${fmtDate(i.due_date)}` : ''}`
                  : 'settled'}
              </p>
            </div>

            <span className="flex-none"><Pill label={meta.label} color={meta.color} /></span>
          </button>
        );
      })}

      <p className="mt-10 text-[10px] uppercase tracking-[0.18em] text-center" style={{ ...sub, ...mono }}>
        receipts unlimited · invoicing included · nothing here is metered
      </p>
    </div>
  );
};

export default InvoiceRegisterPage;

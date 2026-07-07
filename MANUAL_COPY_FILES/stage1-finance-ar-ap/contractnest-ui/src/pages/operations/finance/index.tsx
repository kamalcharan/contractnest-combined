// ============================================================================
// Operations → Finance (AR / AP) — Stage 1
// Real tenant-level receivables/payables over t_invoices via /api/finance.
// Re-homes the vani AccountsReceivable UX under Operations with live data:
//   - KPI cards (outstanding / overdue / upcoming / collected this month)
//   - Ageing buckets (1-7 / 8-15 / 16-30 / 30+ days overdue)
//   - Who owes (by buyer) · Drafts pending approval (scanner-created)
//   - Invoice worklist with manual actions: Approve draft, Send reminder,
//     Cancel draft, Open contract (record payment lives on the contract page)
//   - Follows the GLOBAL Revenue/Expense perspective (header switcher):
//     Revenue → Receivables (seller AR) · Expense → Payables (buyer mirror)
// Dunning ladder visuals arrive with the VaNi stage (POA Stage 5).
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileClock,
  RefreshCw,
  Search,
  Send,
  ExternalLink,
  XCircle,
  Loader2,
  Inbox
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VaNiMetricCard } from '@/vani/components/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  useReceivables,
  usePayables,
  useApproveDraftInvoice,
  useSendInvoiceReminder,
  useCancelDraftInvoice,
  type FinanceInvoice
} from '@/hooks/queries/useFinanceQueries';

type ViewMode = 'receivables' | 'payables';
type StatusFilter = 'all' | 'draft' | 'open' | 'overdue' | 'paid';

const formatMoney = (value: number | null | undefined, currency: string = 'INR'): string => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // View follows the GLOBAL Revenue/Expense perspective (header switcher),
  // same convention as the Ops Cockpit: Revenue → AR, Expense → AP.
  const { perspective } = useAuth();
  const view: ViewMode = perspective === 'expense' ? 'payables' : 'receivables';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const receivablesQuery = useReceivables({ enabled: view === 'receivables' });
  const payablesQuery = usePayables({ enabled: view === 'payables' });

  const approveMutation = useApproveDraftInvoice();
  const remindMutation = useSendInvoiceReminder();
  const cancelMutation = useCancelDraftInvoice();

  const activeQuery = view === 'receivables' ? receivablesQuery : payablesQuery;
  const invoices: FinanceInvoice[] = activeQuery.data?.invoices || [];

  const filteredInvoices = useMemo(() => {
    let rows = invoices;

    if (statusFilter !== 'all') {
      rows = rows.filter((inv) => {
        if (statusFilter === 'draft') return inv.status === 'draft';
        if (statusFilter === 'open') return inv.status === 'unpaid' || inv.status === 'partially_paid';
        if (statusFilter === 'overdue')
          return (inv.status === 'unpaid' || inv.status === 'partially_paid') && inv.days_overdue > 0;
        if (statusFilter === 'paid') return inv.status === 'paid';
        return true;
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter((inv) =>
        [
          inv.invoice_number,
          inv.contract_number,
          inv.contract_name,
          inv.buyer_name,
          inv.buyer_company,
          inv.counterparty_name
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );
    }

    return rows;
  }, [invoices, statusFilter, searchTerm]);

  const drafts = useMemo(
    () => (view === 'receivables' ? invoices.filter((inv) => inv.status === 'draft') : []),
    [invoices, view]
  );

  // ─────────────────────────────────────────────
  // Actions (guard against double-clicks with actioningId)
  // ─────────────────────────────────────────────
  const handleApprove = async (inv: FinanceInvoice) => {
    if (actioningId) return;
    setActioningId(inv.id);
    try {
      await approveMutation.mutateAsync(inv.id);
    } finally {
      setActioningId(null);
    }
  };

  const handleRemind = async (inv: FinanceInvoice) => {
    if (actioningId) return;
    setActioningId(inv.id);
    try {
      await remindMutation.mutateAsync(inv.id);
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (inv: FinanceInvoice) => {
    if (actioningId) return;
    const confirmed = window.confirm(
      `Cancel ${inv.invoice_number} (${formatMoney(inv.total_amount, inv.currency)})? This cannot be undone.`
    );
    if (!confirmed) return;
    setActioningId(inv.id);
    try {
      await cancelMutation.mutateAsync({ invoiceId: inv.id, contractId: inv.contract_id });
    } finally {
      setActioningId(null);
    }
  };

  // ─────────────────────────────────────────────
  // Status badge
  // ─────────────────────────────────────────────
  const statusBadge = (inv: FinanceInvoice) => {
    let label: string = inv.status;
    let bg = colors.utility.secondaryBackground;
    let fg = colors.utility.secondaryText;

    if (inv.status === 'draft') {
      label = 'Draft — approval pending';
      bg = `${colors.semantic.warning}20`;
      fg = colors.semantic.warning;
    } else if (inv.status === 'paid') {
      label = 'Paid';
      bg = `${colors.semantic.success}20`;
      fg = colors.semantic.success;
    } else if (inv.days_overdue > 0) {
      label = `${inv.days_overdue}d overdue`;
      bg = `${colors.semantic.error}20`;
      fg = colors.semantic.error;
    } else if (inv.status === 'partially_paid') {
      label = 'Partially paid';
      bg = `${colors.brand.primary}20`;
      fg = colors.brand.primary;
    } else if (inv.status === 'unpaid') {
      label = 'Unpaid';
      bg = `${colors.brand.primary}15`;
      fg = colors.utility.primaryText;
    } else if (inv.status === 'cancelled' || inv.status === 'bad_debt') {
      label = inv.status === 'cancelled' ? 'Cancelled' : 'Written off';
    }

    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
        style={{ backgroundColor: bg, color: fg }}
      >
        {label}
      </span>
    );
  };

  // ─────────────────────────────────────────────
  // Loading / error states
  // ─────────────────────────────────────────────
  if (activeQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <LoadingSpinner size="lg" />
        <p style={{ color: colors.utility.secondaryText }}>
          Loading {view === 'receivables' ? 'receivables' : 'payables'}…
        </p>
      </div>
    );
  }

  if (activeQuery.isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <AlertTriangle className="h-10 w-10" style={{ color: colors.semantic.error }} />
            <p style={{ color: colors.utility.primaryText }}>
              Could not load {view}. {(activeQuery.error as any)?.message || ''}
            </p>
            <button
              onClick={() => activeQuery.refetch()}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rSummary = receivablesQuery.data?.summary;
  const pSummary = payablesQuery.data?.summary;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
            Finance
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            {view === 'receivables'
              ? 'What customers owe you — live from your invoices'
              : 'What you owe others — vendor contracts and claimed contracts'}
          </p>
        </div>

        {/* Perspective indicator — switch Revenue/Expense from the header */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{
            borderColor: colors.brand.primary + '40',
            backgroundColor: colors.brand.primary + '0D'
          }}
          title="Follows your Revenue/Expense perspective — switch it from the header"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: view === 'receivables' ? colors.semantic.success : colors.semantic.warning }}
          />
          <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            {view === 'receivables' ? 'Revenue · Receivables' : 'Expense · Payables'}
          </span>
        </div>

        <button
          onClick={() => activeQuery.refetch()}
          disabled={activeQuery.isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
        >
          <RefreshCw className={`h-4 w-4 ${activeQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      {view === 'receivables' && rSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <VaNiMetricCard
            metric={{
              value: formatMoney(rSummary.total_outstanding),
              label: 'Total outstanding',
              subtitle: `${rSummary.outstanding_count} open invoices`,
              icon: <Wallet className="h-5 w-5" />,
              status: 'normal'
            }}
          />
          <VaNiMetricCard
            metric={{
              value: formatMoney(rSummary.overdue_total),
              label: 'Overdue',
              subtitle: `${rSummary.overdue_count} invoices past due`,
              icon: <AlertTriangle className="h-5 w-5" />,
              status: rSummary.overdue_count > 0 ? 'critical' : 'success'
            }}
          />
          <VaNiMetricCard
            metric={{
              value: formatMoney(rSummary.upcoming_30_total),
              label: 'Due in next 30 days',
              subtitle: `7d: ${formatMoney(rSummary.upcoming_7_total)} · 15d: ${formatMoney(rSummary.upcoming_15_total)}`,
              icon: <CalendarClock className="h-5 w-5" />,
              status: 'normal'
            }}
          />
          <VaNiMetricCard
            metric={{
              value: formatMoney(rSummary.collected_this_month),
              label: 'Collected this month',
              subtitle: `${formatMoney(rSummary.collected_total)} all-time`,
              icon: <CheckCircle2 className="h-5 w-5" />,
              status: 'success'
            }}
          />
        </div>
      )}

      {view === 'payables' && pSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <VaNiMetricCard
            metric={{
              value: formatMoney(pSummary.total_payable),
              label: 'Total payable',
              subtitle: `${pSummary.payable_count} open invoices`,
              icon: <Wallet className="h-5 w-5" />,
              status: 'normal'
            }}
          />
          <VaNiMetricCard
            metric={{
              value: formatMoney(pSummary.overdue_total),
              label: 'Overdue',
              subtitle: `${pSummary.overdue_count} invoices past due`,
              icon: <AlertTriangle className="h-5 w-5" />,
              status: pSummary.overdue_count > 0 ? 'critical' : 'success'
            }}
          />
          <VaNiMetricCard
            metric={{
              value: formatMoney(pSummary.upcoming_30_total),
              label: 'Due in next 30 days',
              subtitle: `7d: ${formatMoney(pSummary.upcoming_7_total)} · 15d: ${formatMoney(pSummary.upcoming_15_total)}`,
              icon: <CalendarClock className="h-5 w-5" />,
              status: 'normal'
            }}
          />
          <VaNiMetricCard
            metric={{
              value: formatMoney(pSummary.paid_total),
              label: 'Paid to date',
              icon: <CheckCircle2 className="h-5 w-5" />,
              status: 'success'
            }}
          />
        </div>
      )}

      {/* Ageing + Who owes (receivables) / By vendor (payables) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {view === 'receivables' && rSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: colors.utility.primaryText }}>
                Ageing — overdue balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(
                  [
                    { key: 'b_1_7', label: '1–7 days', color: colors.semantic.warning },
                    { key: 'b_8_15', label: '8–15 days', color: '#F97316' },
                    { key: 'b_16_30', label: '16–30 days', color: colors.semantic.error },
                    { key: 'b_30_plus', label: '30+ days', color: '#B91C1C' }
                  ] as const
                ).map((bucket) => {
                  const data = rSummary.ageing[bucket.key];
                  return (
                    <div
                      key={bucket.key}
                      className="rounded-lg p-3 border"
                      style={{ borderColor: bucket.color + '40', backgroundColor: bucket.color + '0D' }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: bucket.color }}>
                        {bucket.label}
                      </p>
                      <p className="text-lg font-bold mt-1" style={{ color: colors.utility.primaryText }}>
                        {formatMoney(data?.total)}
                      </p>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {data?.count || 0} invoice{(data?.count || 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: colors.utility.primaryText }}>
              {view === 'receivables' ? 'Who owes you' : 'Who you owe'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view === 'receivables' && (receivablesQuery.data?.by_buyer?.length || 0) === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: colors.utility.secondaryText }}>
                No open receivables — all settled 🎉
              </p>
            )}
            {view === 'payables' && (payablesQuery.data?.by_vendor?.length || 0) === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: colors.utility.secondaryText }}>
                Nothing payable right now
              </p>
            )}
            <div className="space-y-2">
              {view === 'receivables' &&
                (receivablesQuery.data?.by_buyer || []).slice(0, 6).map((buyer, idx) => (
                  <div
                    key={buyer.buyer_id || idx}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                    style={{ borderColor: colors.utility.secondaryText + '15' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                        {buyer.buyer_name}
                      </p>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {buyer.invoice_count} invoice{buyer.invoice_count === 1 ? '' : 's'}
                        {buyer.max_days_overdue > 0 ? ` · oldest ${buyer.max_days_overdue}d overdue` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        {formatMoney(buyer.outstanding)}
                      </p>
                      {Number(buyer.overdue_total || 0) > 0 && (
                        <p className="text-xs font-medium" style={{ color: colors.semantic.error }}>
                          {formatMoney(buyer.overdue_total)} overdue
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              {view === 'payables' &&
                (payablesQuery.data?.by_vendor || []).slice(0, 6).map((vendor, idx) => (
                  <div
                    key={vendor.counterparty_name || idx}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                    style={{ borderColor: colors.utility.secondaryText + '15' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                        {vendor.counterparty_name}
                      </p>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {vendor.invoice_count} invoice{vendor.invoice_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        {formatMoney(vendor.outstanding)}
                      </p>
                      {Number(vendor.overdue_total || 0) > 0 && (
                        <p className="text-xs font-medium" style={{ color: colors.semantic.error }}>
                          {formatMoney(vendor.overdue_total)} overdue
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drafts pending approval (receivables only) */}
      {view === 'receivables' && drafts.length > 0 && (
        <Card style={{ borderColor: colors.semantic.warning + '60' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <FileClock className="h-4 w-4" style={{ color: colors.semantic.warning }} />
              Drafts awaiting your approval
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: colors.semantic.warning + '25', color: colors.semantic.warning }}
              >
                {drafts.length}
              </span>
            </CardTitle>
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              Auto-created from billing events by the scanner. Approving makes an invoice live AR; it is not counted
              until then.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-lg border"
                style={{ borderColor: colors.utility.secondaryText + '20' }}
              >
                <div className="flex-1 min-w-[220px]">
                  <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    {inv.invoice_number} · {formatMoney(inv.total_amount, inv.currency)}
                  </p>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    {inv.buyer_company || inv.buyer_name || 'Customer'} · {inv.contract_number}
                    {inv.billing_cycle ? ` · ${inv.billing_cycle}` : ''} · due {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(inv)}
                    disabled={actioningId === inv.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: colors.brand.primary, color: '#fff', opacity: actioningId === inv.id ? 0.6 : 1 }}
                  >
                    {actioningId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleCancel(inv)}
                    disabled={actioningId === inv.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: colors.semantic.error + '50', color: colors.semantic.error }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoice worklist */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base flex-1" style={{ color: colors.utility.primaryText }}>
              Invoices
              <span className="ml-2 text-xs font-normal" style={{ color: colors.utility.secondaryText }}>
                {filteredInvoices.length} of {invoices.length}
              </span>
            </CardTitle>

            <div className="relative">
              <Search
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoice, contract, customer…"
                className="pl-9 pr-3 py-2 rounded-lg border text-sm w-64 bg-transparent"
                style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.primaryText }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 rounded-lg border text-sm bg-transparent"
              style={{
                borderColor: colors.utility.secondaryText + '30',
                color: colors.utility.primaryText,
                backgroundColor: colors.utility.primaryBackground
              }}
            >
              <option value="all">All statuses</option>
              {view === 'receivables' && <option value="draft">Drafts</option>}
              <option value="open">Open</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Inbox className="h-8 w-8" style={{ color: colors.utility.secondaryText }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                No invoices match this view
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((inv) => {
                const isOpen = inv.status === 'unpaid' || inv.status === 'partially_paid';
                const paidPct =
                  Number(inv.total_amount) > 0
                    ? Math.min(100, Math.round((Number(inv.amount_paid) / Number(inv.total_amount)) * 100))
                    : 0;

                return (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg border"
                    style={{ borderColor: colors.utility.secondaryText + '18' }}
                  >
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                          {inv.invoice_number}
                        </p>
                        {statusBadge(inv)}
                        {inv.emi_sequence && inv.emi_total && (
                          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            EMI {inv.emi_sequence}/{inv.emi_total}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        {view === 'receivables'
                          ? inv.buyer_company || inv.buyer_name || 'Customer'
                          : inv.counterparty_name || 'Vendor'}
                        {' · '}
                        {inv.contract_number} · due {formatDate(inv.due_date)}
                        {inv.last_reminder_at ? ` · last reminder ${formatDate(inv.last_reminder_at)}` : ''}
                      </p>
                      {isOpen && Number(inv.amount_paid) > 0 && (
                        <div className="mt-1.5 h-1.5 rounded-full w-48" style={{ backgroundColor: colors.utility.secondaryText + '20' }}>
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${paidPct}%`, backgroundColor: colors.semantic.success }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-right min-w-[110px]">
                      <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        {formatMoney(isOpen ? inv.balance : inv.total_amount, inv.currency)}
                      </p>
                      {isOpen && Number(inv.amount_paid) > 0 && (
                        <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          of {formatMoney(inv.total_amount, inv.currency)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {view === 'receivables' && inv.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(inv)}
                          disabled={actioningId === inv.id}
                          title="Approve draft"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: colors.brand.primary, color: '#fff', opacity: actioningId === inv.id ? 0.6 : 1 }}
                        >
                          {actioningId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Approve
                        </button>
                      )}
                      {view === 'receivables' && isOpen && (
                        <button
                          onClick={() => handleRemind(inv)}
                          disabled={actioningId === inv.id}
                          title="Send payment reminder (email)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
                          style={{
                            borderColor: colors.brand.primary + '50',
                            color: colors.brand.primary,
                            opacity: actioningId === inv.id ? 0.6 : 1
                          }}
                        >
                          {actioningId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Remind
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/contracts/${inv.contract_id}`)}
                        title="Open contract (record payment there)"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {view === 'payables' && (
        <p className="text-xs text-center" style={{ color: colors.utility.secondaryText }}>
          Payables are read-only in this release — recording payments and disputes arrive with the buyer workflow.
        </p>
      )}
    </div>
  );
};

export default FinancePage;

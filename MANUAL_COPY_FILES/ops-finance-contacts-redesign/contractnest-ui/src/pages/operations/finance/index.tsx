// ============================================================================
// Operations → Finance (AR / AP) — Stage 1 + event-aware redesign (2026-07-22)
// Receivables view redesigned around the billing-event sub-ledger
// (operations-loop/020 + 021):
//   - Smart filter bar: month · contact · contract · overdue-only · search —
//     every widget below recomputes from the same filtered event set
//   - KPI band computed client-side from filtered events
//   - Cash timeline: one axis, overdue instalments age into red on the left,
//     expected collections stack green to the right; click a month to filter
//   - Worklist grouped by contact/contract with expandable instalment
//     schedule; replaces the old "Who owes you" card and flat invoice table
//   - Drafts panel unchanged (approve / cancel scanner-created drafts)
// Payables (Expense perspective) view is unchanged from Stage 1.
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
  Inbox,
  ChevronDown,
  ChevronLeft,
  ChevronRight
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
  type FinanceInvoice,
  type FinanceEvent
} from '@/hooks/queries/useFinanceQueries';

type ViewMode = 'receivables' | 'payables';

const WORKLIST_PAGE_SIZE = 10;

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

// Compact money for timeline bar labels: ₹1.5k / ₹12k / ₹1.2L
const formatMoneyShort = (value: number): string => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `₹${Math.round(value)}`;
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateShort = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const monthKey = (value: string | null | undefined): string => (value ? String(value).slice(0, 7) : '');
const monthLabel = (key: string): string => {
  const d = new Date(`${key}-01T00:00:00`);
  if (isNaN(d.getTime())) return key;
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

// Table column templates (product-wide list pattern)
const WORKLIST_GRID_COLS = 'minmax(170px,1.4fr) minmax(120px,1fr) minmax(150px,1.1fr) 110px 130px minmax(120px,0.9fr) 90px';
const PAYABLES_GRID_COLS = 'minmax(150px,1.2fr) 100px minmax(140px,1fr) 100px 130px minmax(110px,0.8fr) 190px';

const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // View follows the GLOBAL Revenue/Expense perspective (header switcher),
  // same convention as the Ops Cockpit: Revenue → AR, Expense → AP.
  const { perspective } = useAuth();
  const view: ViewMode = perspective === 'expense' ? 'payables' : 'receivables';

  // ── Smart filter state (receivables) ──
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [worklistPage, setWorklistPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const receivablesQuery = useReceivables({ enabled: view === 'receivables' });
  const payablesQuery = usePayables({ enabled: view === 'payables' });

  const approveMutation = useApproveDraftInvoice();
  const remindMutation = useSendInvoiceReminder();
  const cancelMutation = useCancelDraftInvoice();

  const activeQuery = view === 'receivables' ? receivablesQuery : payablesQuery;
  const invoices: FinanceInvoice[] = activeQuery.data?.invoices || [];
  const allEvents: FinanceEvent[] = (view === 'receivables' && receivablesQuery.data?.events) || [];

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentMonthKey = todayKey.slice(0, 7);

  const invoiceById = useMemo(() => {
    const map = new Map<string, FinanceInvoice>();
    invoices.forEach((inv) => map.set(inv.id, inv));
    return map;
  }, [invoices]);

  // ── Filter option lists (from the full event set) ──
  const contactOptions = useMemo(() => {
    const map = new Map<string, string>();
    allEvents.forEach((e) => {
      const key = e.buyer_id || e.buyer_name || 'unknown';
      if (!map.has(key)) map.set(key, e.buyer_company || e.buyer_name || 'Unknown');
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allEvents]);

  const contractOptions = useMemo(() => {
    const map = new Map<string, string>();
    allEvents.forEach((e) => {
      if (!map.has(e.contract_id)) map.set(e.contract_id, e.contract_number);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allEvents]);

  // ── Filtering: contact/contract/search apply everywhere; month/overdue
  //    additionally apply to KPIs + worklist (timeline shows all months of
  //    the base set with the selected month highlighted) ──
  const baseEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (contactFilter !== 'all' && (e.buyer_id || e.buyer_name || 'unknown') !== contactFilter) return false;
      if (contractFilter !== 'all' && e.contract_id !== contractFilter) return false;
      if (term) {
        const hay = [e.invoice_number, e.contract_number, e.contract_name, e.buyer_name, e.buyer_company, e.block_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allEvents, contactFilter, contractFilter, searchTerm]);

  const filteredEvents = useMemo(() => {
    return baseEvents.filter((e) => {
      if (monthFilter !== 'all' && monthKey(e.due_on) !== monthFilter) return false;
      if (overdueOnly && e.days_overdue <= 0) return false;
      return true;
    });
  }, [baseEvents, monthFilter, overdueOnly]);

  const hasActiveFilter =
    monthFilter !== 'all' || contactFilter !== 'all' || contractFilter !== 'all' || overdueOnly || searchTerm.trim() !== '';

  // ── KPIs from the filtered event set ──
  const kpis = useMemo(() => {
    const open = filteredEvents.filter((e) => e.open_amount > 0);
    const overdue = open.filter((e) => e.days_overdue > 0);
    const upcoming30 = open.filter((e) => {
      if (!e.due_on || e.days_overdue > 0) return false;
      const due = e.due_on.slice(0, 10);
      const limit = new Date();
      limit.setDate(limit.getDate() + 30);
      return due >= todayKey && due <= limit.toISOString().slice(0, 10);
    });
    const nextUp = open
      .filter((e) => e.due_on && e.due_on.slice(0, 10) >= todayKey)
      .sort((a, b) => (a.due_on! < b.due_on! ? -1 : 1))[0];
    return {
      outstanding: open.reduce((s, e) => s + Number(e.open_amount), 0),
      outstandingCount: new Set(open.map((e) => e.contract_id)).size,
      overdueTotal: overdue.reduce((s, e) => s + Number(e.open_amount), 0),
      overdueCount: overdue.length,
      oldestDays: overdue.reduce((m, e) => Math.max(m, e.days_overdue), 0),
      upcoming30Total: upcoming30.reduce((s, e) => s + Number(e.open_amount), 0),
      nextUp
    };
  }, [filteredEvents, todayKey]);

  // ── Cash timeline: month columns from the base set (before month filter) ──
  const timeline = useMemo(() => {
    const byMonth = new Map<string, { overdue: number; upcoming: number; maxDays: number }>();
    baseEvents.forEach((e) => {
      if (e.open_amount <= 0 || !e.due_on) return;
      const key = monthKey(e.due_on);
      const slot = byMonth.get(key) || { overdue: 0, upcoming: 0, maxDays: 0 };
      if (e.days_overdue > 0) {
        slot.overdue += Number(e.open_amount);
        slot.maxDays = Math.max(slot.maxDays, e.days_overdue);
      } else {
        slot.upcoming += Number(e.open_amount);
      }
      byMonth.set(key, slot);
    });
    const months = Array.from(byMonth.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
    const max = months.reduce((m, x) => Math.max(m, x.overdue, x.upcoming), 0);
    return { months, max };
  }, [baseEvents]);

  // ── Worklist: filtered events grouped by contract ──
  const worklistGroups = useMemo(() => {
    const groups = new Map<string, FinanceEvent[]>();
    filteredEvents.forEach((e) => {
      const list = groups.get(e.contract_id) || [];
      list.push(e);
      groups.set(e.contract_id, list);
    });
    const rows = Array.from(groups.entries()).map(([contractId, evts]) => {
      const first = evts[0];
      const open = evts.filter((e) => e.open_amount > 0);
      const overdue = open.filter((e) => e.days_overdue > 0);
      const invoice = invoiceById.get(first.invoice_id);
      const nextDue = open
        .filter((e) => e.due_on && e.days_overdue <= 0)
        .sort((a, b) => (a.due_on! < b.due_on! ? -1 : 1))[0];
      // Full (unfiltered) schedule for the expanded view
      const schedule = allEvents
        .filter((e) => e.contract_id === contractId)
        .sort((a, b) => ((a.due_on || '') < (b.due_on || '') ? -1 : 1));
      return {
        contractId,
        buyerLabel: first.buyer_company || first.buyer_name || 'Unknown',
        invoiceNumber: first.invoice_number,
        invoice,
        contractNumber: first.contract_number,
        contractName: first.contract_name,
        totalCount: schedule.length,
        lateCount: overdue.length,
        maxDaysOverdue: overdue.reduce((m, e) => Math.max(m, e.days_overdue), 0),
        openTotal: open.reduce((s, e) => s + Number(e.open_amount), 0),
        overdueTotal: overdue.reduce((s, e) => s + Number(e.open_amount), 0),
        nextDue,
        schedule
      };
    });
    return rows.sort((a, b) => b.overdueTotal - a.overdueTotal || b.openTotal - a.openTotal);
  }, [filteredEvents, allEvents, invoiceById]);

  const worklistTotalPages = Math.max(1, Math.ceil(worklistGroups.length / WORKLIST_PAGE_SIZE));
  const worklistVisible = worklistGroups.slice(
    (Math.min(worklistPage, worklistTotalPages) - 1) * WORKLIST_PAGE_SIZE,
    Math.min(worklistPage, worklistTotalPages) * WORKLIST_PAGE_SIZE
  );

  const drafts = useMemo(
    () => (view === 'receivables' ? invoices.filter((inv) => inv.status === 'draft') : []),
    [invoices, view]
  );

  const resetFilters = () => {
    setMonthFilter('all');
    setContactFilter('all');
    setContractFilter('all');
    setOverdueOnly(false);
    setSearchTerm('');
    setWorklistPage(1);
  };

  const toggleExpanded = (contractId: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

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

  const handleRemind = async (invoiceId: string) => {
    if (actioningId) return;
    setActioningId(invoiceId);
    try {
      await remindMutation.mutateAsync(invoiceId);
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
  // Shared bits
  // ─────────────────────────────────────────────
  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderColor: active ? colors.brand.primary + '66' : colors.utility.secondaryText + '35',
    borderStyle: active ? 'solid' : 'dashed',
    backgroundColor: active ? colors.brand.primary + '14' : 'transparent',
    color: active ? colors.utility.primaryText : colors.utility.secondaryText
  });

  const invoiceStatusPill = (inv?: FinanceInvoice) => {
    if (!inv) return null;
    let label = 'Unpaid';
    let bg = colors.brand.primary + '15';
    let fg = colors.utility.primaryText;
    if (inv.status === 'partially_paid') {
      label = 'Partially paid';
      bg = colors.semantic.warning + '20';
      fg = colors.semantic.warning;
    } else if (inv.status === 'paid') {
      label = 'Paid';
      bg = colors.semantic.success + '20';
      fg = colors.semantic.success;
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>
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
              ? 'What customers owe you — every instalment on its own due date'
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

      {view === 'receivables' && (
        <>
          {/* ── Smart filter bar ── */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider mr-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Filter
                </span>

                <select
                  value={monthFilter}
                  onChange={(e) => { setMonthFilter(e.target.value); setWorklistPage(1); }}
                  className="px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer"
                  style={{ ...chipStyle(monthFilter !== 'all'), backgroundColor: monthFilter !== 'all' ? colors.brand.primary + '14' : colors.utility.primaryBackground }}
                  aria-label="Filter by month"
                >
                  <option value="all">All months</option>
                  {timeline.months.map((m) => (
                    <option key={m.key} value={m.key}>{monthLabel(m.key)}</option>
                  ))}
                </select>

                <select
                  value={contactFilter}
                  onChange={(e) => { setContactFilter(e.target.value); setWorklistPage(1); }}
                  className="px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer"
                  style={{ ...chipStyle(contactFilter !== 'all'), backgroundColor: contactFilter !== 'all' ? colors.brand.primary + '14' : colors.utility.primaryBackground }}
                  aria-label="Filter by contact"
                >
                  <option value="all">All contacts</option>
                  {contactOptions.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <select
                  value={contractFilter}
                  onChange={(e) => { setContractFilter(e.target.value); setWorklistPage(1); }}
                  className="px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer"
                  style={{ ...chipStyle(contractFilter !== 'all'), backgroundColor: contractFilter !== 'all' ? colors.brand.primary + '14' : colors.utility.primaryBackground }}
                  aria-label="Filter by contract"
                >
                  <option value="all">All contracts</option>
                  {contractOptions.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <button
                  onClick={() => { setOverdueOnly((v) => !v); setWorklistPage(1); }}
                  className="px-3 py-1.5 rounded-full border text-xs font-semibold"
                  style={chipStyle(overdueOnly)}
                >
                  Overdue only{overdueOnly ? ' ×' : ''}
                </button>

                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setWorklistPage(1); }}
                    placeholder="Invoice # · contract # · contact…"
                    className="w-full pl-9 pr-3 py-1.5 rounded-full border text-xs bg-transparent"
                    style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.primaryText }}
                  />
                </div>

                {hasActiveFilter && (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold px-2 py-1.5"
                    style={{ color: colors.brand.primary }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── KPI band (recomputes with the filters) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <VaNiMetricCard
              metric={{
                value: formatMoney(kpis.outstanding),
                label: hasActiveFilter ? 'Outstanding (in view)' : 'Total outstanding',
                subtitle: `${kpis.outstandingCount} contract${kpis.outstandingCount === 1 ? '' : 's'}`,
                icon: <Wallet className="h-5 w-5" />,
                status: 'normal'
              }}
            />
            <VaNiMetricCard
              metric={{
                value: formatMoney(kpis.overdueTotal),
                label: 'Actually overdue',
                subtitle:
                  kpis.overdueCount > 0
                    ? `${kpis.overdueCount} instalment${kpis.overdueCount === 1 ? '' : 's'} late · oldest ${kpis.oldestDays}d`
                    : 'Nothing late 🎉',
                icon: <AlertTriangle className="h-5 w-5" />,
                status: kpis.overdueCount > 0 ? 'critical' : 'success'
              }}
            />
            <VaNiMetricCard
              metric={{
                value: formatMoney(kpis.upcoming30Total),
                label: 'Coming due · 30 days',
                subtitle: kpis.nextUp
                  ? `next: ${formatMoney(kpis.nextUp.open_amount)} on ${formatDateShort(kpis.nextUp.due_on)}`
                  : 'nothing scheduled',
                icon: <CalendarClock className="h-5 w-5" />,
                status: 'normal'
              }}
            />
            <VaNiMetricCard
              metric={{
                value: formatMoney(rSummary?.collected_this_month),
                label: 'Collected this month',
                subtitle: `${formatMoney(rSummary?.collected_total)} all-time`,
                icon: <CheckCircle2 className="h-5 w-5" />,
                status: 'success'
              }}
            />
          </div>

          {/* ── Cash timeline ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: colors.utility.primaryText }}>
                Cash timeline
              </CardTitle>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                Past to future on one axis — red instalments are late, green are expected. Click a month to filter.
              </p>
            </CardHeader>
            <CardContent>
              {timeline.months.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: colors.utility.secondaryText }}>
                  No open instalments match the current filters
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <div className="flex items-end gap-3 pt-7 pb-1 min-w-fit" style={{ minHeight: 150 }}>
                      {timeline.months.map((m) => {
                        const isSelected = monthFilter === m.key;
                        const isCurrent = m.key === currentMonthKey;
                        const overdueColor = m.maxDays > 30 ? '#B91C1C' : colors.semantic.error;
                        const barH = (v: number) => Math.max(v > 0 ? 8 : 0, Math.round((v / (timeline.max || 1)) * 84));
                        return (
                          <button
                            key={m.key}
                            onClick={() => { setMonthFilter(isSelected ? 'all' : m.key); setWorklistPage(1); }}
                            className="flex flex-col items-center gap-1.5 px-2 pt-1 pb-2 rounded-lg border transition-all"
                            style={{
                              borderColor: isSelected ? colors.brand.primary : 'transparent',
                              backgroundColor: isSelected ? colors.brand.primary + '0D' : 'transparent',
                              minWidth: 74
                            }}
                            title={`${monthLabel(m.key)} — late ${formatMoney(m.overdue)} · expected ${formatMoney(m.upcoming)}`}
                          >
                            {isCurrent && (
                              <span
                                className="text-[9px] font-extrabold tracking-widest"
                                style={{ color: colors.brand.primary }}
                              >
                                TODAY
                              </span>
                            )}
                            <div className="flex items-end gap-1" style={{ height: 96 }}>
                              {m.overdue > 0 && (
                                <div className="flex flex-col items-center justify-end gap-0.5 h-full">
                                  <span className="text-[10px] font-bold" style={{ color: overdueColor }}>
                                    {formatMoneyShort(m.overdue)}
                                  </span>
                                  <div
                                    className="w-6 rounded-t-md"
                                    style={{ height: barH(m.overdue), backgroundColor: overdueColor }}
                                  />
                                </div>
                              )}
                              {m.upcoming > 0 && (
                                <div className="flex flex-col items-center justify-end gap-0.5 h-full">
                                  <span className="text-[10px] font-bold" style={{ color: colors.semantic.success }}>
                                    {formatMoneyShort(m.upcoming)}
                                  </span>
                                  <div
                                    className="w-6 rounded-t-md"
                                    style={{ height: barH(m.upcoming), backgroundColor: colors.semantic.success, opacity: 0.85 }}
                                  />
                                </div>
                              )}
                            </div>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: m.overdue > 0 ? overdueColor : colors.utility.secondaryText }}
                            >
                              {monthLabel(m.key)}
                              {m.maxDays > 0 ? ` · ${m.maxDays}d` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2 border-t text-xs" style={{ borderColor: colors.utility.secondaryText + '15', color: colors.utility.secondaryText }}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: '#B91C1C' }} />
                      30+ days late
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: colors.semantic.error }} />
                      1–30 days late
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: colors.semantic.success }} />
                      Expected
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Drafts pending approval ── */}
          {drafts.length > 0 && (
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

          {/* ── Worklist grouped by contact/contract ── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base flex-1" style={{ color: colors.utility.primaryText }}>
                  Worklist
                  <span className="ml-2 text-xs font-normal" style={{ color: colors.utility.secondaryText }}>
                    grouped by contact · {worklistGroups.length} open
                  </span>
                </CardTitle>
                {kpis.overdueTotal > 0 && (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: colors.semantic.error + '15', color: colors.semantic.error }}
                  >
                    {formatMoney(kpis.overdueTotal)} needs chasing
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              {worklistVisible.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2">
                  <Inbox className="h-8 w-8" style={{ color: colors.utility.secondaryText }} />
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    {hasActiveFilter ? 'Nothing matches these filters' : 'No open receivables — all settled 🎉'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 min-w-[980px]">
                  {/* Table header (product-wide list pattern) */}
                  <div
                    className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ gridTemplateColumns: WORKLIST_GRID_COLS, color: colors.utility.secondaryText }}
                  >
                    <span>Contact / Invoice</span>
                    <span>Contract</span>
                    <span>Schedule</span>
                    <span>Late by</span>
                    <span>Status</span>
                    <span className="text-right">Open balance</span>
                    <span />
                  </div>

                  {worklistVisible.map((row) => {
                    const isExpanded = expandedContracts.has(row.contractId);
                    const isOpenInvoice =
                      row.invoice && (row.invoice.status === 'unpaid' || row.invoice.status === 'partially_paid');
                    return (
                      <React.Fragment key={row.contractId}>
                        <div
                          className="grid items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer"
                          style={{
                            gridTemplateColumns: WORKLIST_GRID_COLS,
                            borderColor: isExpanded ? colors.brand.primary + '50' : colors.utility.secondaryText + '15'
                          }}
                          onClick={() => toggleExpanded(row.contractId)}
                        >
                          {/* Contact / invoice */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-xs font-extrabold border"
                              style={{
                                backgroundColor: colors.brand.primary + '18',
                                borderColor: colors.brand.primary + '40',
                                color: colors.brand.primary
                              }}
                            >
                              {row.buyerLabel.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate" style={{ color: colors.utility.primaryText }}>
                                {row.buyerLabel}
                              </p>
                              <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                                {row.invoiceNumber}
                                {row.invoice?.last_reminder_at ? ` · reminded ${formatDateShort(row.invoice.last_reminder_at)}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Contract */}
                          <div className="min-w-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${row.contractId}`); }}
                              className="text-xs font-semibold text-left truncate hover:underline"
                              style={{ color: colors.brand.primary }}
                              title={row.contractName}
                            >
                              {row.contractNumber}
                            </button>
                          </div>

                          {/* Schedule */}
                          <div>
                            <p className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                              {row.lateCount > 0 ? `${row.lateCount} of ${row.totalCount} late` : `${row.totalCount} instalments`}
                            </p>
                            <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                              {row.nextDue ? `next ${formatMoneyShort(row.nextDue.open_amount)} on ${formatDateShort(row.nextDue.due_on)}` : 'nothing upcoming'}
                            </p>
                          </div>

                          {/* Late by */}
                          <div>
                            {row.maxDaysOverdue > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                                style={{
                                  backgroundColor: (row.maxDaysOverdue > 30 ? '#B91C1C' : colors.semantic.error) + '18',
                                  color: row.maxDaysOverdue > 30 ? '#B91C1C' : colors.semantic.error
                                }}
                              >
                                {row.maxDaysOverdue}d
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>—</span>
                            )}
                          </div>

                          {/* Status */}
                          <div>{invoiceStatusPill(row.invoice)}</div>

                          {/* Open balance */}
                          <div className="text-right">
                            <p className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                              {formatMoney(row.openTotal, row.invoice?.currency)}
                            </p>
                            {row.overdueTotal > 0 && (
                              <p className="text-[10px] font-semibold" style={{ color: colors.semantic.error }}>
                                {formatMoney(row.overdueTotal)} overdue
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1.5">
                            {isOpenInvoice && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemind(row.invoice!.id); }}
                                disabled={actioningId === row.invoice!.id}
                                title="Send payment reminder (email)"
                                className="inline-flex items-center justify-center h-6 w-6 rounded-lg border"
                                style={{ borderColor: colors.brand.primary + '50', color: colors.brand.primary, opacity: actioningId === row.invoice!.id ? 0.6 : 1 }}
                              >
                                {actioningId === row.invoice!.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${row.contractId}`); }}
                              title="Open contract (record payment there)"
                              className="inline-flex items-center justify-center h-6 w-6 rounded-lg border"
                              style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                            <ChevronDown
                              className="h-3.5 w-3.5 transition-transform"
                              style={{
                                color: colors.utility.secondaryText,
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Expanded instalment schedule */}
                        {isExpanded && (
                          <div
                            className="rounded-lg border px-4 py-3 flex flex-wrap gap-2"
                            style={{
                              borderColor: colors.brand.primary + '30',
                              backgroundColor: colors.brand.primary + '06'
                            }}
                          >
                            {row.schedule.map((e, idx) => {
                              const isLate = e.open_amount > 0 && e.days_overdue > 0;
                              const isNext = row.nextDue && e.id === row.nextDue.id;
                              const border = e.settled
                                ? colors.semantic.success + '55'
                                : isLate
                                ? colors.semantic.error + '66'
                                : isNext
                                ? colors.brand.primary + '66'
                                : colors.utility.secondaryText + '30';
                              const accent = e.settled
                                ? colors.semantic.success
                                : isLate
                                ? colors.semantic.error
                                : isNext
                                ? colors.brand.primary
                                : colors.utility.primaryText;
                              return (
                                <div
                                  key={e.id || `syn-${idx}`}
                                  className="rounded-lg border px-2.5 py-1.5 min-w-[92px]"
                                  style={{ borderColor: border }}
                                  title={`${e.block_name || 'Instalment'}${e.sequence_number ? ` ${e.sequence_number}/${e.total_occurrences}` : ''}`}
                                >
                                  <p className="text-[11px] font-extrabold" style={{ color: accent }}>
                                    {formatDateShort(e.due_on)}
                                    {isNext ? ' · next' : ''}
                                  </p>
                                  <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                                    {formatMoney(e.amount)}
                                    {e.settled ? ' ✓' : isLate ? ` · ${e.days_overdue}d` : ''}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Worklist pager */}
              {worklistTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t" style={{ borderColor: colors.utility.secondaryText + '15' }}>
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Page {Math.min(worklistPage, worklistTotalPages)} of {worklistTotalPages} · {worklistGroups.length} contacts
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setWorklistPage((p) => Math.max(1, p - 1))}
                      disabled={worklistPage <= 1}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border disabled:opacity-40"
                      style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.primaryText }}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setWorklistPage((p) => Math.min(worklistTotalPages, p + 1))}
                      disabled={worklistPage >= worklistTotalPages}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border disabled:opacity-40"
                      style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.primaryText }}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════ PAYABLES (unchanged from Stage 1) ══════════ */}
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

      {view === 'payables' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: colors.utility.primaryText }}>
                Who you owe
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(payablesQuery.data?.by_vendor?.length || 0) === 0 && (
                <p className="text-sm py-4 text-center" style={{ color: colors.utility.secondaryText }}>
                  Nothing payable right now
                </p>
              )}
              <div className="space-y-2">
                {(payablesQuery.data?.by_vendor || []).slice(0, 6).map((vendor, idx) => (
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
      )}

      {view === 'payables' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: colors.utility.primaryText }}>
              Invoices
              <span className="ml-2 text-xs font-normal" style={{ color: colors.utility.secondaryText }}>
                {invoices.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Inbox className="h-8 w-8" style={{ color: colors.utility.secondaryText }} />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No invoices
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 min-w-[960px]">
                <div
                  className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ gridTemplateColumns: PAYABLES_GRID_COLS, color: colors.utility.secondaryText }}
                >
                  <span>Invoice</span>
                  <span>Contract</span>
                  <span>Vendor</span>
                  <span>Due date</span>
                  <span>Status</span>
                  <span className="text-right">Balance</span>
                  <span />
                </div>

                {invoices.map((inv) => {
                  const isOpen = inv.status === 'unpaid' || inv.status === 'partially_paid';
                  return (
                    <div
                      key={inv.id}
                      className="grid items-center gap-2 px-3 py-2.5 rounded-lg border"
                      style={{ gridTemplateColumns: PAYABLES_GRID_COLS, borderColor: colors.utility.secondaryText + '15' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                          {inv.invoice_number}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                          {inv.emi_sequence && inv.emi_total ? `EMI ${inv.emi_sequence}/${inv.emi_total}` : inv.billing_cycle || inv.payment_mode || ''}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/contracts/${inv.contract_id}`)}
                        className="text-xs font-semibold text-left truncate hover:underline"
                        style={{ color: colors.brand.primary }}
                        title={inv.contract_name}
                      >
                        {inv.contract_number || '—'}
                      </button>
                      <span className="text-xs truncate" style={{ color: colors.utility.primaryText }}>
                        {inv.counterparty_name || '—'}
                      </span>
                      <span className="text-[11px]" style={{ color: inv.days_overdue > 0 ? colors.semantic.error : colors.utility.secondaryText }}>
                        {formatDate(inv.due_date)}
                      </span>
                      <div>
                        {inv.days_overdue > 0 && isOpen ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: colors.semantic.error + '20', color: colors.semantic.error }}>
                            {inv.days_overdue}d overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}>
                            {inv.status === 'paid' ? 'Paid' : inv.status === 'partially_paid' ? 'Partially paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                          {formatMoney(isOpen ? inv.balance : inv.total_amount, inv.currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => navigate(`/contracts/${inv.contract_id}`)}
                          title="Open contract"
                          className="inline-flex items-center justify-center h-6 w-6 rounded-lg border"
                          style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'payables' && (
        <p className="text-xs text-center" style={{ color: colors.utility.secondaryText }}>
          Payables are read-only in this release — recording payments and disputes arrive with the buyer workflow.
        </p>
      )}
    </div>
  );
};

export default FinancePage;

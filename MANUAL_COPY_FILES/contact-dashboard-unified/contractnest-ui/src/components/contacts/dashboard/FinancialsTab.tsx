// src/components/contacts/dashboard/FinancialsTab.tsx
// Full financials view: aging buckets, payment stats, invoice table with filters

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CockpitInvoice, PaymentPattern } from '@/types/contactCockpit';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface FinancialsTabProps {
  invoices: CockpitInvoice[];
  paymentPattern: PaymentPattern;
  ltv: number;
  outstanding: number;
  colors: any;
  formatCurrency: (value: number, currency?: string) => string;
}

type InvoiceStatusFilter = 'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
type InvoiceTypeFilter = 'all' | 'receivable' | 'payable';

// ═══════════════════════════════════════════════════
// STATUS STYLING
// ═══════════════════════════════════════════════════

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:         { label: 'Unpaid',         color: '#f59e0b', bg: '#f59e0b15' },
  partially_paid: { label: 'Partial',        color: '#3b82f6', bg: '#3b82f615' },
  paid:           { label: 'Paid',           color: '#22c55e', bg: '#22c55e15' },
  overdue:        { label: 'Overdue',        color: '#ef4444', bg: '#ef444415' },
  cancelled:      { label: 'Cancelled',      color: '#6b7280', bg: '#6b728015' },
};

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function computeAgingBuckets(invoices: CockpitInvoice[]) {
  const now = new Date();
  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  const unpaid = invoices.filter(i => ['unpaid', 'partially_paid', 'overdue'].includes(i.status));

  for (const inv of unpaid) {
    const due = new Date(inv.due_date);
    const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const balance = inv.balance || (inv.total_amount - inv.amount_paid);

    if (diffDays <= 0)       buckets.current += balance;
    else if (diffDays <= 30) buckets.days30  += balance;
    else if (diffDays <= 60) buckets.days60  += balance;
    else if (diffDays <= 90) buckets.days90  += balance;
    else                     buckets.over90  += balance;
  }

  return buckets;
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const FinancialsTab: React.FC<FinancialsTabProps> = ({
  invoices,
  paymentPattern,
  ltv,
  outstanding,
  colors,
  formatCurrency,
}) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<InvoiceTypeFilter>('all');

  // Aging buckets
  const aging = useMemo(() => computeAgingBuckets(invoices), [invoices]);

  // Filtered invoices
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false;
      return true;
    });
  }, [invoices, statusFilter, typeFilter]);

  // Totals
  const totalReceivable = invoices.filter(i => i.invoice_type === 'receivable').reduce((s, i) => s + i.total_amount, 0);
  const totalPayable = invoices.filter(i => i.invoice_type === 'payable').reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ─── Row 1: Financial Summary Cards ─── */}
      <div className="grid grid-cols-4 gap-4">
        {/* LTV */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" style={{ color: '#22c55e' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Lifetime Value
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
            {formatCurrency(ltv)}
          </div>
        </div>

        {/* Outstanding */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Outstanding
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
            {formatCurrency(outstanding)}
          </div>
        </div>

        {/* Collection Rate */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4" style={{ color: '#06b6d4' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Collection Rate
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#06b6d4' }}>
            {paymentPattern.collection_rate}%
          </div>
          <div className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
            {paymentPattern.paid_on_time} of {paymentPattern.invoice_count} on time
          </div>
        </div>

        {/* On-time Rate */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4" style={{ color: '#8b5cf6' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              On-time Rate
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
            {paymentPattern.on_time_rate}%
          </div>
        </div>
      </div>

      {/* ─── Row 2: Aging Buckets + Receivable/Payable Split ─── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Aging Bar */}
        <div
          className="col-span-2 rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              Aging Breakdown
            </span>
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              Unpaid invoices by age
            </span>
          </div>

          {/* Stacked horizontal bar */}
          {(() => {
            const total = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.over90;
            if (total === 0) {
              return (
                <div className="text-center py-4 text-sm" style={{ color: colors.utility.secondaryText }}>
                  No outstanding balance
                </div>
              );
            }
            const segments = [
              { key: 'current', label: 'Current',  value: aging.current, color: '#22c55e' },
              { key: '1-30',    label: '1–30d',     value: aging.days30,  color: '#f59e0b' },
              { key: '31-60',   label: '31–60d',    value: aging.days60,  color: '#f97316' },
              { key: '61-90',   label: '61–90d',    value: aging.days90,  color: '#ef4444' },
              { key: '90+',     label: '90+d',      value: aging.over90,  color: '#991b1b' },
            ];
            return (
              <>
                <div className="flex h-6 rounded-full overflow-hidden mb-3">
                  {segments.map(s => {
                    const pct = (s.value / total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={s.key}
                        className="transition-all"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                        title={`${s.label}: ${formatCurrency(s.value)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-4 flex-wrap">
                  {segments.map(s => (
                    <div key={s.key} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span style={{ color: colors.utility.secondaryText }}>{s.label}</span>
                      <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(s.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Receivable vs Payable */}
        <div
          className="rounded-xl border p-4 flex flex-col justify-between"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
            Revenue Split
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" style={{ color: '#22c55e' }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Receivable</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                {formatCurrency(totalReceivable)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" style={{ color: '#ef4444' }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Payable</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#ef4444' }}>
                {formatCurrency(totalPayable)}
              </span>
            </div>
            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: colors.utility.primaryText + '10' }}>
              <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Net</span>
              <span className="text-sm font-bold" style={{ color: totalReceivable >= totalPayable ? '#22c55e' : '#ef4444' }}>
                {formatCurrency(Math.abs(totalReceivable - totalPayable))}
                {totalReceivable >= totalPayable ? ' in' : ' out'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 3: Invoice Table ─── */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
      >
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.utility.primaryText + '10' }}>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              Invoices ({filtered.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter pills */}
            {(['all', 'overdue', 'unpaid', 'partially_paid', 'paid'] as InvoiceStatusFilter[]).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  border: `1px solid ${statusFilter === st ? (st === 'all' ? colors.brand.primary : (INVOICE_STATUS_CONFIG[st]?.color || colors.brand.primary)) : colors.utility.primaryText + '15'}`,
                  backgroundColor: statusFilter === st ? (st === 'all' ? colors.brand.primary + '15' : (INVOICE_STATUS_CONFIG[st]?.bg || 'transparent')) : 'transparent',
                  color: statusFilter === st ? (st === 'all' ? colors.brand.primary : (INVOICE_STATUS_CONFIG[st]?.color || colors.brand.primary)) : colors.utility.secondaryText,
                }}
              >
                {st === 'all' ? 'All' : INVOICE_STATUS_CONFIG[st]?.label || st}
              </button>
            ))}
            {/* Type toggle */}
            <div className="ml-2 flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: colors.utility.primaryBackground }}>
              {(['all', 'receivable', 'payable'] as InvoiceTypeFilter[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-2 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: typeFilter === t ? colors.utility.secondaryBackground : 'transparent',
                    color: typeFilter === t ? colors.utility.primaryText : colors.utility.secondaryText,
                  }}
                >
                  {t === 'all' ? 'All' : t === 'receivable' ? 'In' : 'Out'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No invoices match your filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                  {['Invoice', 'Contract', 'Type', 'Status', 'Amount', 'Paid', 'Balance', 'Due Date'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const statusCfg = INVOICE_STATUS_CONFIG[inv.status] || { label: inv.status, color: '#6b7280', bg: '#6b728015' };
                  const balance = inv.balance || (inv.total_amount - inv.amount_paid);
                  const dueDate = new Date(inv.due_date);
                  const isOverdue = inv.status === 'overdue' || (balance > 0 && dueDate < new Date() && inv.status !== 'paid' && inv.status !== 'cancelled');
                  return (
                    <tr
                      key={inv.id}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ borderBottom: `1px solid ${colors.utility.primaryText}08` }}
                      onClick={() => inv.contract_id && navigate(`/contracts/${inv.contract_id}`)}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: colors.utility.primaryText }}>
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {inv.contract_number || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: inv.invoice_type === 'receivable' ? '#22c55e' : '#ef4444' }}
                        >
                          {inv.invoice_type === 'receivable' ? (
                            <ArrowDownRight className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {inv.invoice_type === 'receivable' ? 'In' : 'Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#22c55e' }}>
                        {formatCurrency(inv.amount_paid, inv.currency)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: balance > 0 ? '#f59e0b' : '#22c55e' }}>
                        {formatCurrency(balance, inv.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center gap-1"
                          style={{ color: isOverdue ? '#ef4444' : colors.utility.secondaryText }}
                        >
                          {isOverdue && <AlertTriangle className="h-3 w-3" />}
                          {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialsTab;

// src/pages/contracts/detail/index.tsx
// Contract 360° View — full lifecycle dashboard
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft,
  FileText,
  Edit,
  Send,
  Plus,
  ClipboardList,
  Calendar,
  DollarSign,
  Camera,
  MessageSquare,
  ScrollText,
  ShoppingCart,
  Package,
  Handshake,
  Tag,
  Users,
  Eye,
  Clock,
  AlertTriangle,
  Layers,
  Paperclip,
  ExternalLink,
  Receipt,
  CreditCard,
  Wallet,
  Globe,
  Loader2,
  CheckCircle2,
  FileDown,
  ChevronDown,
  ChevronUp,
  Hash,
} from 'lucide-react';
import { useContract } from '@/hooks/queries/useContractQueries';
import { useContractInvoices } from '@/hooks/queries/useInvoiceQueries';
import type { ContractDetail } from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import {
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors,
} from '@/utils/constants/contacts';
import TabsNavigation from '@/components/shared/TabsNavigation';
import ContactHeaderCard from '@/components/contacts/view/cards/ContactHeaderCard';
import RecordPaymentDialog from '@/components/contracts/RecordPaymentDialog';
import PaymentRequestHistory from '@/components/contracts/PaymentRequestHistory';
import { useGatewayStatus } from '@/hooks/useGatewayStatus';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import type { CreateOrderResponse } from '@/hooks/queries/usePaymentGatewayQueries';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const CLASSIFICATION_ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart,
  Package,
  Handshake,
  Users,
};

const getClassificationIcon = (id: string): React.ElementType => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find((c: any) => c.id === id);
  if (config?.lucideIcon && CLASSIFICATION_ICON_MAP[config.lucideIcon]) {
    return CLASSIFICATION_ICON_MAP[config.lucideIcon];
  }
  return Tag;
};

const getSemanticColor = (colorKey: string, colors: any): string => {
  switch (colorKey) {
    case 'success': return colors.semantic.success;
    case 'warning': return colors.semantic.warning;
    case 'error': return colors.semantic.error;
    case 'info': return colors.brand.secondary || colors.brand.primary;
    case 'brand.tertiary': return colors.brand.tertiary || colors.brand.primary;
    default: return colors.utility.secondaryText;
  }
};

const formatCurrency = (value?: number, currency?: string) => {
  if (!value && value !== 0) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (d?: string) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDuration = (value?: number, unit?: string) => {
  if (!value) return '\u2014';
  const u = unit || 'months';
  return `${value} ${u.charAt(0).toUpperCase() + u.slice(1)}`;
};

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

// ═══════════════════════════════════════════════════
// TAB DEFINITIONS
// ═══════════════════════════════════════════════════

type TabId = 'overview' | 'timeline' | 'financials' | 'evidence' | 'communication' | 'audit';

const TAB_DEFINITIONS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'evidence', label: 'Evidence', icon: Camera },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

// ═══════════════════════════════════════════════════
// SUMMARY BAR ITEM
// ═══════════════════════════════════════════════════

interface SummaryItemProps {
  label: string;
  value: string;
  colorClass?: 'success' | 'warning' | 'danger' | 'default';
  colors: any;
  isLast?: boolean;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, colorClass = 'default', colors, isLast }) => {
  const valueColor = (() => {
    switch (colorClass) {
      case 'success': return colors.semantic.success;
      case 'warning': return colors.semantic.warning;
      case 'danger': return colors.semantic.error;
      default: return colors.utility.primaryText;
    }
  })();

  return (
    <div
      className="flex flex-col py-1"
      style={{
        paddingRight: isLast ? 0 : '1.5rem',
        borderRight: isLast ? 'none' : `1px solid ${colors.utility.primaryText}15`,
        marginRight: isLast ? 0 : '1.5rem',
      }}
    >
      <span
        className="text-[0.65rem] uppercase tracking-wider font-semibold mb-0.5"
        style={{ color: colors.utility.secondaryText }}
      >
        {label}
      </span>
      <span className="text-lg font-bold" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// SIDEBAR: CLIENT CARD — uses existing ContactHeaderCard
// ═══════════════════════════════════════════════════

/**
 * Maps contract buyer fields to the ContactHeaderCard's expected shape.
 */
const buildBuyerContactObject = (contract: ContractDetail) => {
  const c = contract as any;
  const channels: Array<{ channel_type: string; value: string; is_primary?: boolean }> = [];

  if (c.buyer_phone) {
    channels.push({ channel_type: 'mobile', value: c.buyer_phone, is_primary: true });
  }
  if (c.buyer_email) {
    channels.push({ channel_type: 'email', value: c.buyer_email, is_primary: !c.buyer_phone });
  }

  const classType = c.contact_classification || c.contract_type || '';
  const classifications: Array<{ classification_value: string; classification_label: string }> = [];
  if (classType) {
    const cfg = CONTACT_CLASSIFICATION_CONFIG.find((x: any) => x.id === classType);
    classifications.push({
      classification_value: classType,
      classification_label: cfg?.label || classType.charAt(0).toUpperCase() + classType.slice(1),
    });
  }

  return {
    id: c.buyer_id || contract.id,
    type: c.buyer_company ? 'corporate' as const : 'individual' as const,
    status: 'active' as const,
    name: contract.buyer_name || undefined,
    company_name: c.buyer_company || undefined,
    classifications,
    contact_channels: channels,
    addresses: [],
    tags: [],
    compliance_numbers: [],
    created_at: contract.created_at,
    updated_at: contract.updated_at,
  };
};

// ═══════════════════════════════════════════════════
// SIDEBAR: FINANCIAL HEALTH
// ═══════════════════════════════════════════════════

interface FinancialHealthProps {
  contract: ContractDetail;
  colors: any;
  onRecordPayment?: () => void;
  hasActiveGateway?: boolean;
  onViewInvoice?: (invoiceId: string) => void;
}

const FinancialHealth: React.FC<FinancialHealthProps> = ({ contract, colors, onRecordPayment, hasActiveGateway, onViewInvoice }) => {
  const { data, isLoading } = useContractInvoices(contract.id);
  const invoices = data?.invoices || [];
  const summary = data?.summary || {
    total_invoiced: 0,
    total_paid: 0,
    total_balance: 0,
    invoice_count: 0,
    paid_count: 0,
    unpaid_count: 0,
    partial_count: 0,
    overdue_count: 0,
    collection_percentage: 0,
  };

  const currency = contract.currency || 'USD';
  const isReceivable = contract.contract_type !== 'vendor';
  const arApLabel = isReceivable ? 'Receivable (AR)' : 'Payable (AP)';
  const arApColor = isReceivable ? colors.semantic.success : colors.semantic.warning;

  const getInvoiceStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: colors.semantic.success + '18', color: colors.semantic.success, label: 'Paid' };
      case 'partially_paid':
        return { bg: colors.semantic.warning + '18', color: colors.semantic.warning, label: 'Partial' };
      case 'overdue':
        return { bg: colors.semantic.error + '18', color: colors.semantic.error, label: 'Overdue' };
      case 'cancelled':
        return { bg: colors.semantic.error + '18', color: colors.semantic.error, label: 'Cancelled' };
      default:
        return { bg: colors.utility.primaryText + '10', color: colors.utility.secondaryText, label: 'Unpaid' };
    }
  };

  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      {/* Header with AR/AP badge */}
      <div
        className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" style={{ color: colors.brand.primary }} />
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Financial Health</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: arApColor + '18', color: arApColor }}
          >
            {arApLabel}
          </span>
          {onRecordPayment && invoices.length > 0 && (
            <button
              onClick={onRecordPayment}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
              title="Record a payment"
            >
              <Wallet className="h-3 w-3" />
              Pay
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Contract Value Breakdown */}
        <div
          className="rounded-lg border p-4 mb-4"
          style={{ borderColor: colors.utility.primaryText + '12', backgroundColor: colors.utility.primaryText + '04' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Contract Value
            </span>
            <span className="text-lg font-extrabold" style={{ color: colors.brand.primary }}>
              {formatCurrency(contract.grand_total || ((contract.total_value || 0) + (contract.tax_total || 0)), currency)}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem]" style={{ color: colors.utility.secondaryText }}>Subtotal</span>
              <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                {formatCurrency(contract.total_value || 0, currency)}
              </span>
            </div>
            {(contract.tax_total ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[0.7rem]" style={{ color: colors.utility.secondaryText }}>Tax</span>
                <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                  {formatCurrency(contract.tax_total || 0, currency)}
                </span>
              </div>
            )}
            {contract.tax_breakdown && contract.tax_breakdown.length > 0 && (
              <div className="pl-3 space-y-0.5">
                {contract.tax_breakdown.map((tax, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[0.65rem]" style={{ color: colors.utility.secondaryText }}>
                      {tax.name} ({tax.rate}%)
                    </span>
                    <span className="text-[0.65rem]" style={{ color: colors.utility.secondaryText }}>
                      {formatCurrency(tax.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {contract.payment_mode && (
            <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: colors.utility.primaryText + '10' }}>
              <span className="text-[0.7rem]" style={{ color: colors.utility.secondaryText }}>Payment Mode</span>
              <span className="text-[0.7rem] font-semibold" style={{ color: colors.utility.primaryText }}>
                {contract.payment_mode === 'emi' ? `EMI (${contract.emi_months || 0} months)` : contract.payment_mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          )}
        </div>

        {/* Collected / Balance cards */}
        {(() => {
          const contractTotal = contract.grand_total || ((contract.total_value || 0) + (contract.tax_total || 0));
          const collected = summary.total_paid || 0;
          // Balance = contract total minus what's been collected
          const balance = summary.invoice_count > 0 ? summary.total_balance : contractTotal - collected;
          return (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                className="p-4 rounded-lg text-center border"
                style={{
                  background: `linear-gradient(135deg, ${colors.semantic.success}10, ${colors.semantic.success}20)`,
                  borderColor: colors.semantic.success + '30',
                }}
              >
                <div className="text-2xl font-extrabold mb-0.5" style={{ color: colors.semantic.success }}>
                  {formatCurrency(collected, currency)}
                </div>
                <div className="text-[0.7rem] uppercase tracking-wider font-semibold" style={{ color: colors.utility.secondaryText }}>
                  Collected
                </div>
              </div>
              <div
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: colors.utility.primaryText + '06' }}
              >
                <div
                  className="text-2xl font-extrabold mb-0.5"
                  style={{ color: balance > 0 ? colors.semantic.warning : colors.utility.primaryText }}
                >
                  {formatCurrency(balance, currency)}
                </div>
                <div className="text-[0.7rem] uppercase tracking-wider font-semibold" style={{ color: colors.utility.secondaryText }}>
                  Balance
                </div>
              </div>
            </div>
          );
        })()}

        {/* Collection Progress */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Collection Progress</span>
            <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
              {summary.invoice_count > 0 ? `${summary.collection_percentage}%` : '0%'}
            </span>
          </div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: colors.utility.primaryText + '15' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(summary.collection_percentage, 100)}%`,
                background: `linear-gradient(90deg, ${colors.semantic.success}, ${colors.brand.primary})`,
              }}
            />
          </div>
          {summary.invoice_count > 0 ? (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[0.65rem]" style={{ color: colors.utility.secondaryText }}>
                {summary.paid_count} paid
              </span>
              {summary.partial_count > 0 && (
                <span className="text-[0.65rem]" style={{ color: colors.semantic.warning }}>
                  {summary.partial_count} partial
                </span>
              )}
              {summary.overdue_count > 0 && (
                <span className="text-[0.65rem]" style={{ color: colors.semantic.error }}>
                  {summary.overdue_count} overdue
                </span>
              )}
              <span className="text-[0.65rem]" style={{ color: colors.utility.secondaryText }}>
                of {summary.invoice_count} invoice{summary.invoice_count !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <div className="text-[0.65rem] mt-1" style={{ color: colors.utility.secondaryText }}>
              {contract.status === 'active' ? 'No invoices generated yet' : 'Invoices generate when contract activates'}
            </div>
          )}
        </div>

        {/* Invoice list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-16 rounded-lg animate-pulse"
                style={{ backgroundColor: colors.utility.primaryText + '08' }}
              />
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {invoices.map((inv) => {
              const statusStyle = getInvoiceStatusStyle(inv.status);
              return (
                <button
                  key={inv.id}
                  onClick={() => onViewInvoice?.(inv.id)}
                  className="w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: colors.utility.primaryText + '04',
                    borderColor: colors.utility.primaryText + '10',
                    cursor: onViewInvoice ? 'pointer' : 'default',
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                        {inv.invoice_number}
                      </span>
                      {inv.emi_sequence && (
                        <span
                          className="text-[0.6rem] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
                        >
                          EMI {inv.emi_sequence}/{inv.emi_total}
                        </span>
                      )}
                      {inv.billing_cycle && !inv.emi_sequence && (
                        <span
                          className="text-[0.6rem] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: colors.utility.primaryText + '10', color: colors.utility.secondaryText }}
                        >
                          {inv.billing_cycle}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      Due: {formatDate(inv.due_date)}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </span>
                      {inv.amount_paid > 0 && inv.status !== 'paid' && (
                        <div className="text-[0.6rem]" style={{ color: colors.semantic.success }}>
                          Paid: {formatCurrency(inv.amount_paid, inv.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                  {onViewInvoice && (
                    <div className="mt-1.5 pt-1.5 border-t flex items-center gap-1" style={{ borderColor: colors.utility.primaryText + '08' }}>
                      <Eye className="h-3 w-3" style={{ color: colors.brand.primary }} />
                      <span className="text-[0.6rem] font-medium" style={{ color: colors.brand.primary }}>View Invoice & Receipt</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className="p-4 rounded-lg border border-dashed text-center"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            <Receipt className="h-8 w-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText + '60' }} />
            <div className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
              {contract.status === 'active' ? 'No invoices generated' : 'Invoices will appear when contract is activated'}
            </div>
          </div>
        )}

        {/* Online Payment Attempts (T12, T15 polling, T16 retry) */}
        {invoices.length > 0 && (
          <div className="mt-4">
            <PaymentRequestHistory
              contractId={contract.id}
              compact
              onRetry={() => onRecordPayment?.()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// SIDEBAR: CONTRACT DETAILS (QUICK INFO)
// ═══════════════════════════════════════════════════

interface ContractDetailsCardProps {
  contract: ContractDetail;
  colors: any;
}

const ContractDetailsCard: React.FC<ContractDetailsCardProps> = ({ contract, colors }) => {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Record Type', value: contract.record_type === 'rfq' ? 'RFQ' : 'Contract' },
    { label: 'Duration', value: formatDuration(contract.duration_value, contract.duration_unit) },
    { label: 'Acceptance', value: (contract.acceptance_method || '\u2014').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
    { label: 'Payment Mode', value: (contract.payment_mode || '\u2014').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
    { label: 'Billing Cycle', value: (contract.billing_cycle_type || '\u2014').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
    { label: 'Currency', value: contract.currency || 'USD' },
  ];

  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <ClipboardList className="h-4 w-4" style={{ color: colors.brand.primary }} />
        <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Contract Details</h3>
      </div>
      <div className="p-5">
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="flex justify-between py-2.5"
              style={{
                borderBottom: i < rows.length - 1 ? `1px solid ${colors.utility.primaryText}08` : 'none',
              }}
            >
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{row.label}</span>
              <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// SIDEBAR: AUDIT TRAIL / RECENT ACTIVITY
// ═══════════════════════════════════════════════════

interface AuditTrailProps {
  history: ContractDetail['history'];
  colors: any;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ history, colors }) => {
  const getActionDotColor = (action: string): string => {
    const a = action?.toLowerCase() || '';
    if (a.includes('creat') || a.includes('accept') || a.includes('complet') || a.includes('paid')) return colors.semantic.success;
    if (a.includes('cancel') || a.includes('breach') || a.includes('reject') || a.includes('delete')) return colors.semantic.error;
    if (a.includes('update') || a.includes('edit') || a.includes('change')) return colors.semantic.warning;
    return colors.brand.primary;
  };

  const formatAction = (entry: any): string => {
    const action = entry.action || '';
    if (entry.from_status && entry.to_status) {
      return `Status changed: ${entry.from_status} \u2192 ${entry.to_status}`;
    }
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <ScrollText className="h-4 w-4" style={{ color: colors.brand.primary }} />
        <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Recent Activity</h3>
      </div>
      <div className="p-5">
        {(!history || history.length === 0) ? (
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText + '60' }} />
            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>No activity recorded yet</div>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-0">
            {history.slice(0, 20).map((entry: any, i: number) => (
              <div
                key={entry.id || i}
                className="flex gap-3 py-3"
                style={{ borderBottom: i < history.length - 1 ? `1px solid ${colors.utility.primaryText}08` : 'none' }}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getActionDotColor(entry.action) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-relaxed" style={{ color: colors.utility.primaryText }}>
                    {formatAction(entry)}
                  </div>
                  {entry.performed_by_name && (
                    <div className="text-[0.65rem]" style={{ color: colors.utility.secondaryText }}>
                      by {entry.performed_by_name}
                    </div>
                  )}
                  {entry.note && (
                    <div className="text-[0.65rem] italic mt-0.5" style={{ color: colors.utility.secondaryText }}>
                      {entry.note}
                    </div>
                  )}
                  <div className="text-[0.6rem] mt-0.5" style={{ color: colors.utility.secondaryText + 'AA' }}>
                    {timeAgo(entry.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// LEFT: BLOCKS CARD (SERVICE LINE ITEMS)
// ═══════════════════════════════════════════════════

interface BlocksCardProps {
  blocks: ContractDetail['blocks'];
  currency?: string;
  colors: any;
}

const BlocksCard: React.FC<BlocksCardProps> = ({ blocks, currency = 'USD', colors }) => {
  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div
        className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: colors.brand.primary }} />
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            Service Blocks ({blocks?.length || 0})
          </h3>
        </div>
        <button
          className="text-[0.7rem] font-semibold px-2.5 py-1 rounded border transition-colors hover:opacity-80"
          style={{
            backgroundColor: colors.brand.primary,
            color: '#ffffff',
            border: 'none',
          }}
        >
          <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add Block</span>
        </button>
      </div>
      <div className="p-5">
        {(!blocks || blocks.length === 0) ? (
          <div
            className="p-6 rounded-lg border border-dashed text-center"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            <Layers className="h-10 w-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText + '50' }} />
            <div className="text-sm font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
              No service blocks added yet
            </div>
            <div className="text-xs" style={{ color: colors.utility.secondaryText + 'AA' }}>
              Add blocks from the catalog to define deliverables
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block: any, i: number) => (
              <div
                key={block.id || i}
                className="p-4 rounded-lg border transition-all hover:shadow-sm"
                style={{
                  backgroundColor: colors.utility.primaryText + '04',
                  borderColor: colors.utility.primaryText + '10',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                      {block.block_name || 'Unnamed Block'}
                    </div>
                    {block.block_description && (
                      <div className="text-xs mt-0.5 line-clamp-2" style={{ color: colors.utility.secondaryText }}>
                        {block.block_description}
                      </div>
                    )}
                  </div>
                  <button
                    className="ml-2 p-1 rounded hover:opacity-70 flex-shrink-0"
                    style={{ color: colors.utility.secondaryText }}
                    title="View block details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {block.category_name && (
                    <span
                      className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: colors.brand.primary + '15',
                        color: colors.brand.primary,
                      }}
                    >
                      {block.category_name}
                    </span>
                  )}
                  {block.quantity && (
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      Qty: {block.quantity}
                    </span>
                  )}
                  {block.billing_cycle && (
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {block.billing_cycle}
                    </span>
                  )}
                  <span className="text-sm font-bold ml-auto" style={{ color: colors.utility.primaryText }}>
                    {formatCurrency(block.total_price || block.unit_price, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// LEFT: EXECUTION TIMELINE (TASKS — shell)
// ═══════════════════════════════════════════════════

interface TaskTimelineProps {
  colors: any;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({ colors }) => {
  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div
        className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: colors.brand.primary }} />
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Execution Timeline</h3>
        </div>
        <div className="flex gap-2">
          <button
            className="text-[0.7rem] font-semibold px-2.5 py-1 rounded border transition-colors hover:opacity-80"
            style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.secondaryText, backgroundColor: 'transparent' }}
          >
            Filter
          </button>
          <button
            className="text-[0.7rem] font-semibold px-2.5 py-1 rounded transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.brand.primary, color: '#ffffff', border: 'none' }}
          >
            <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add Task</span>
          </button>
        </div>
      </div>
      <div className="p-5">
        <div
          className="p-8 rounded-lg border border-dashed text-center"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <Calendar className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText + '50' }} />
          <div className="text-sm font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
            No tasks scheduled yet
          </div>
          <div className="text-xs" style={{ color: colors.utility.secondaryText + 'AA' }}>
            Tasks will appear here once the execution timeline is configured
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// LEFT: VENDORS CARD
// ═══════════════════════════════════════════════════

interface VendorsCardProps {
  vendors: ContractDetail['vendors'];
  colors: any;
}

const VendorsCard: React.FC<VendorsCardProps> = ({ vendors, colors }) => {
  if (!vendors || vendors.length === 0) return null;

  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <Users className="h-4 w-4" style={{ color: colors.brand.primary }} />
        <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
          Vendors ({vendors.length})
        </h3>
      </div>
      <div className="p-5 space-y-3">
        {vendors.map((v: any, i: number) => {
          const initials = (v.vendor_name || '??').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
          return (
            <div
              key={v.id || i}
              className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm"
              style={{
                backgroundColor: colors.utility.primaryText + '04',
                borderColor: colors.utility.primaryText + '10',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-xs flex-shrink-0"
                style={{
                  backgroundColor: colors.brand.primary + '20',
                  color: colors.brand.primary,
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                  {v.vendor_name || 'Unknown Vendor'}
                </div>
                {v.vendor_company && (
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{v.vendor_company}</div>
                )}
                {v.vendor_email && (
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{v.vendor_email}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {v.response_status && (
                  <span
                    className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: v.response_status === 'accepted' ? colors.semantic.success + '20' : colors.semantic.warning + '20',
                      color: v.response_status === 'accepted' ? colors.semantic.success : colors.semantic.warning,
                    }}
                  >
                    {v.response_status}
                  </span>
                )}
                {v.quoted_amount !== null && v.quoted_amount !== undefined && (
                  <div className="text-sm font-bold mt-1" style={{ color: colors.utility.primaryText }}>
                    {formatCurrency(v.quoted_amount)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// LEFT: ATTACHMENTS CARD
// ═══════════════════════════════════════════════════

interface AttachmentsCardProps {
  attachments: ContractDetail['attachments'];
  colors: any;
}

const AttachmentsCard: React.FC<AttachmentsCardProps> = ({ attachments, colors }) => {
  if (!attachments || attachments.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '\u2014';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <Paperclip className="h-4 w-4" style={{ color: colors.brand.primary }} />
        <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
          Attachments ({attachments.length})
        </h3>
      </div>
      <div className="p-5 space-y-2">
        {attachments.map((att: any, i: number) => (
          <div
            key={att.id || i}
            className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm"
            style={{
              backgroundColor: colors.utility.primaryText + '04',
              borderColor: colors.utility.primaryText + '10',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.utility.primaryText + '08' }}
            >
              <FileText className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate" style={{ color: colors.utility.primaryText }}>
                {att.file_name || 'Unnamed file'}
              </div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {att.file_type || att.mime_type || '\u2014'} &middot; {formatFileSize(att.file_size)}
              </div>
            </div>
            {att.download_url && (
              <a
                href={att.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:opacity-70 flex-shrink-0"
                style={{ color: colors.brand.primary }}
                title="Download"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// PLACEHOLDER TAB CONTENT
// ═══════════════════════════════════════════════════

interface PlaceholderTabProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  colors: any;
}

const PlaceholderTab: React.FC<PlaceholderTabProps> = ({ icon: Icon, title, description, colors }) => (
  <div
    className="rounded-xl border p-12 text-center"
    style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
  >
    <Icon className="h-14 w-14 mx-auto mb-4" style={{ color: colors.utility.secondaryText + '60' }} />
    <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>{title}</h3>
    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>{description}</p>
    <div
      className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
    >
      Coming Soon
    </div>
  </div>
);

// ═══════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const { data: contract, isLoading, error } = useContract(id || null);
  const { data: invoiceData } = useContractInvoices(id || undefined, { enabled: !!id });
  const pageSummary = invoiceData?.summary;
  const pageInvoices = invoiceData?.invoices || [];
  const isFullyPaid = (pageSummary?.collection_percentage ?? 0) >= 100 && (pageSummary?.invoice_count ?? 0) > 0;
  const { hasActiveGateway } = useGatewayStatus();
  const { addToast } = useVaNiToast();

  // ─── Razorpay Checkout (for terminal mode from RecordPaymentDialog) ───
  const { openCheckout, isVerifying } = useRazorpayCheckout({
    onVerified: () => {
      addToast({ type: 'success', title: 'Payment Verified', message: 'The payment has been recorded successfully.' });
    },
    onFailed: (error) => {
      addToast({ type: 'error', title: 'Payment Failed', message: error || 'Payment could not be completed.' });
    },
    onDismissed: () => {
      addToast({ type: 'warning', title: 'Checkout Closed', message: 'The payment window was closed without completing payment.' });
    },
  });

  const handleOrderCreated = (orderData: CreateOrderResponse) => {
    openCheckout(orderData);
  };

  // Navigate to Financials tab and expand a specific invoice
  const handleViewInvoice = (invoiceId: string) => {
    setActiveTab('financials');
    setExpandedInvoiceId(invoiceId);
  };

  // Classification icon
  const classType = contract?.contact_classification || contract?.contract_type || '';
  const ClassIcon = getClassificationIcon(classType);
  const classConfig = CONTACT_CLASSIFICATION_CONFIG.find((c: any) => c.id === classType);
  const classBadgeColors = classConfig
    ? getClassificationColors(classConfig.colorKey, colors, 'badge')
    : { bg: colors.utility.primaryText + '10', text: colors.utility.secondaryText, border: colors.utility.primaryText + '20' };

  // Status
  const statusConfig = CONTRACT_STATUS_COLORS[contract?.status || 'draft'] || CONTRACT_STATUS_COLORS.draft;
  const statusColor = contract ? getSemanticColor(statusConfig.bg, colors) : colors.utility.secondaryText;

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <VaNiLoader
          size="md"
          message="VaNi is Loading Contract..."
          showSkeleton={true}
          skeletonVariant="card"
          skeletonCount={4}
        />
      </div>
    );
  }

  // ─── Error ───
  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12" style={{ color: colors.semantic.error }} />
        <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          {error ? 'Failed to load contract' : 'Contract not found'}
        </h2>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {error instanceof Error ? error.message : 'The contract you are looking for does not exist or has been removed.'}
        </p>
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Contracts
        </button>
      </div>
    );
  }

  // ─── Summary bar data ───
  const grandTotal = contract.grand_total || ((contract.total_value || 0) + (contract.tax_total || 0));
  const blocksCount = contract.blocks_count ?? contract.blocks?.length ?? 0;
  const vendorsCount = contract.vendors_count ?? contract.vendors?.length ?? 0;
  const duration = formatDuration(contract.duration_value, contract.duration_unit);

  // ─── Tab content ───
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 420px' }}>
            {/* Left Column */}
            <div className="space-y-6">
              <BlocksCard blocks={contract.blocks} currency={contract.currency} colors={colors} />
              <TaskTimeline colors={colors} />
              <VendorsCard vendors={contract.vendors} colors={colors} />
              <AttachmentsCard attachments={contract.attachments} colors={colors} />
            </div>

            {/* Right Sidebar */}
            <div className="space-y-5">
              <ContactHeaderCard contact={buildBuyerContactObject(contract)} />
              <FinancialHealth
                contract={contract}
                colors={colors}
                hasActiveGateway={hasActiveGateway}
                onRecordPayment={() => setIsPaymentDialogOpen(true)}
                onViewInvoice={handleViewInvoice}
              />
              <ContractDetailsCard contract={contract} colors={colors} />
              <AuditTrail history={contract.history} colors={colors} />
            </div>
          </div>
        );
      case 'timeline':
        return <PlaceholderTab icon={Calendar} title="Timeline View" description="Full execution timeline with Gantt-style view of tasks, milestones, and deadlines." colors={colors} />;
      case 'financials':
        return (
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 400px' }}>
            {/* Left: Full financial details */}
            <div className="space-y-6">
              {/* Conditional: Fully Paid state OR Collect Payment CTA */}
              {isFullyPaid ? (
                <div
                  className="rounded-xl border p-5 flex items-center gap-4"
                  style={{
                    backgroundColor: `${colors.semantic.success}08`,
                    borderColor: `${colors.semantic.success}25`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.semantic.success}18` }}
                  >
                    <CheckCircle2 className="h-6 w-6" style={{ color: colors.semantic.success }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-0.5" style={{ color: colors.semantic.success }}>
                      Invoice Fully Paid
                    </h3>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      All invoices for this contract have been fully paid. Total collected:{' '}
                      <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(pageSummary?.total_paid || 0, contract.currency)}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl border p-5 flex items-center justify-between"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
                >
                  <div>
                    <h3 className="text-sm font-bold mb-0.5" style={{ color: colors.utility.primaryText }}>
                      Collect Payment
                    </h3>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      Record an offline payment or collect online via{' '}
                      {hasActiveGateway ? 'Razorpay' : 'payment gateway'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    {hasActiveGateway ? (
                      <><CreditCard className="h-4 w-4" /> Collect Payment</>
                    ) : (
                      <><Wallet className="h-4 w-4" /> Record Payment</>
                    )}
                  </button>
                </div>
              )}

              {/* Invoice & Receipt Transaction Card */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
              >
                <div
                  className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: colors.utility.primaryText + '10' }}
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" style={{ color: colors.brand.primary }} />
                    <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                      Invoices & Receipts
                    </h3>
                  </div>
                  <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.utility.primaryText + '10', color: colors.utility.secondaryText }}>
                    {pageInvoices.length} invoice{pageInvoices.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="p-5">
                  {pageInvoices.length > 0 ? (
                    <div className="space-y-3">
                      {pageInvoices.map((inv) => {
                        const isPaid = inv.status === 'paid';
                        const isPartial = inv.status === 'partially_paid';
                        const isOverdue = inv.status === 'overdue';
                        const statusColor = isPaid ? colors.semantic.success
                          : isPartial ? colors.semantic.warning
                          : isOverdue ? colors.semantic.error
                          : colors.utility.secondaryText;
                        const statusLabel = isPaid ? 'Paid' : isPartial ? 'Partial' : isOverdue ? 'Overdue' : 'Unpaid';
                        const isExpanded = expandedInvoiceId === inv.id;
                        const balance = inv.total_amount - (inv.amount_paid || 0);
                        return (
                          <div
                            key={inv.id}
                            className="rounded-lg border overflow-hidden"
                            style={{ borderColor: isExpanded ? colors.brand.primary + '30' : colors.utility.primaryText + '10', backgroundColor: colors.utility.primaryText + '03' }}
                          >
                            {/* Invoice header row — clickable to expand */}
                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="w-full p-4 flex items-center justify-between text-left transition-colors hover:opacity-90"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: statusColor + '15' }}
                                >
                                  {isPaid ? (
                                    <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                                  ) : (
                                    <FileText className="h-4 w-4" style={{ color: statusColor }} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                                      {inv.invoice_number}
                                    </span>
                                    <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: statusColor + '18', color: statusColor }}>
                                      {statusLabel}
                                    </span>
                                    {inv.emi_sequence && (
                                      <span className="text-[0.6rem] px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}>
                                        EMI {inv.emi_sequence}/{inv.emi_total}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[0.6rem]" style={{ color: colors.utility.secondaryText }}>
                                    Due: {formatDate(inv.due_date)} &middot; {formatCurrency(inv.total_amount, inv.currency)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold" style={{ color: isPaid ? colors.semantic.success : colors.utility.primaryText }}>
                                  {formatCurrency(inv.amount_paid || 0, inv.currency)}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                                ) : (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                                )}
                              </div>
                            </button>

                            {/* Expanded invoice detail panel */}
                            {isExpanded && (
                              <div
                                className="border-t px-4 pb-4"
                                style={{ borderColor: colors.utility.primaryText + '10' }}
                              >
                                {/* Invoice Detail Section */}
                                <div className="pt-4 pb-3">
                                  <div className="flex items-center gap-1.5 mb-3">
                                    <FileText className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
                                    <span className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>
                                      Invoice Details
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Invoice Number</span>
                                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>{inv.invoice_number}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Type</span>
                                      <span className="text-xs font-medium capitalize" style={{ color: colors.utility.primaryText }}>{inv.invoice_type}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Subtotal</span>
                                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>{formatCurrency(inv.amount, inv.currency)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Tax</span>
                                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>{formatCurrency(inv.tax_amount, inv.currency)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Total Amount</span>
                                      <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>{formatCurrency(inv.total_amount, inv.currency)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Amount Paid</span>
                                      <span className="text-xs font-bold" style={{ color: colors.semantic.success }}>{formatCurrency(inv.amount_paid || 0, inv.currency)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Balance</span>
                                      <span className="text-xs font-bold" style={{ color: balance > 0 ? colors.semantic.warning : colors.semantic.success }}>
                                        {formatCurrency(balance, inv.currency)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Due Date</span>
                                      <span className="text-xs font-medium" style={{ color: isOverdue ? colors.semantic.error : colors.utility.primaryText }}>{formatDate(inv.due_date)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Issued</span>
                                      <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{formatDate(inv.issued_at)}</span>
                                    </div>
                                    {inv.paid_at && (
                                      <div>
                                        <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Paid On</span>
                                        <span className="text-xs font-medium" style={{ color: colors.semantic.success }}>{formatDate(inv.paid_at)}</span>
                                      </div>
                                    )}
                                    {inv.payment_mode && (
                                      <div>
                                        <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Payment Mode</span>
                                        <span className="text-xs font-medium capitalize" style={{ color: colors.utility.primaryText }}>{inv.payment_mode.replace(/_/g, ' ')}</span>
                                      </div>
                                    )}
                                    {inv.billing_cycle && (
                                      <div>
                                        <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Billing Cycle</span>
                                        <span className="text-xs font-medium capitalize" style={{ color: colors.utility.primaryText }}>{inv.billing_cycle}</span>
                                      </div>
                                    )}
                                  </div>
                                  {inv.notes && (
                                    <div className="mt-3 p-2.5 rounded-lg" style={{ backgroundColor: colors.utility.secondaryBackground }}>
                                      <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Notes</span>
                                      <span className="text-xs" style={{ color: colors.utility.primaryText }}>{inv.notes}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Receipt Section */}
                                {(isPaid || isPartial) && (
                                  <div className="pt-3 border-t" style={{ borderColor: colors.utility.primaryText + '08' }}>
                                    <div className="flex items-center gap-1.5 mb-3">
                                      <FileDown className="h-3.5 w-3.5" style={{ color: colors.semantic.success }} />
                                      <span className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.semantic.success }}>
                                        Payment Receipt
                                      </span>
                                      {inv.receipts_count && (
                                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full"
                                          style={{ backgroundColor: colors.semantic.success + '15', color: colors.semantic.success }}>
                                          {inv.receipts_count} receipt{inv.receipts_count !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className="rounded-lg p-3"
                                      style={{ backgroundColor: `${colors.semantic.success}06`, border: `1px solid ${colors.semantic.success}15` }}
                                    >
                                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        <div>
                                          <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Amount Received</span>
                                          <span className="text-xs font-bold" style={{ color: colors.semantic.success }}>
                                            {formatCurrency(inv.amount_paid || 0, inv.currency)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Status</span>
                                          <span className="text-xs font-semibold" style={{ color: isPaid ? colors.semantic.success : colors.semantic.warning }}>
                                            {isPaid ? 'Fully Settled' : `Partially Paid (${Math.round(((inv.amount_paid || 0) / inv.total_amount) * 100)}%)`}
                                          </span>
                                        </div>
                                        {inv.paid_at && (
                                          <div>
                                            <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Payment Date</span>
                                            <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{formatDate(inv.paid_at)}</span>
                                          </div>
                                        )}
                                        {balance > 0 && (
                                          <div>
                                            <span className="text-[0.6rem] block mb-0.5" style={{ color: colors.utility.secondaryText }}>Remaining Balance</span>
                                            <span className="text-xs font-bold" style={{ color: colors.semantic.warning }}>
                                              {formatCurrency(balance, inv.currency)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Actions bar */}
                                <div className="flex items-center gap-2 pt-3 mt-3 border-t" style={{ borderColor: colors.utility.primaryText + '08' }}>
                                  {!isPaid && !isFullyPaid && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setIsPaymentDialogOpen(true); }}
                                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90 text-white"
                                      style={{ backgroundColor: colors.brand.primary }}
                                    >
                                      <CreditCard className="h-3 w-3" /> Record Payment
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Receipt className="h-8 w-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText + '50' }} />
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {contract.status === 'active' ? 'No invoices generated yet' : 'Invoices will appear when contract is activated'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Request History — only if not fully paid */}
              {!isFullyPaid && (
                <PaymentRequestHistory
                  contractId={contract.id}
                  onRetry={() => setIsPaymentDialogOpen(true)}
                />
              )}
            </div>

            {/* Right: Financial Health sidebar */}
            <FinancialHealth
              contract={contract}
              colors={colors}
              hasActiveGateway={hasActiveGateway}
              onRecordPayment={isFullyPaid ? undefined : () => setIsPaymentDialogOpen(true)}
              onViewInvoice={(invoiceId) => setExpandedInvoiceId(invoiceId)}
            />
          </div>
        );
      case 'evidence':
        return <PlaceholderTab icon={Camera} title="Evidence" description="Photos, documents, and proof of delivery uploaded for tasks and milestones." colors={colors} />;
      case 'communication':
        return <PlaceholderTab icon={MessageSquare} title="Communication" description="Messages, notifications, and updates exchanged between parties." colors={colors} />;
      case 'audit':
        return (
          <div className="max-w-3xl">
            <AuditTrail history={contract.history} colors={colors} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.utility.mainBackground }}>
      {/* ═══════ STICKY HEADER ═══════ */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '15',
        }}
      >
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: Back + Contract badge */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/contracts')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.utility.mainBackground,
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.secondaryText,
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              {/* Contract icon with classification color */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${classBadgeColors.bg}, ${classBadgeColors.border || classBadgeColors.bg})`,
                }}
              >
                <ClassIcon className="h-6 w-6" style={{ color: classBadgeColors.text }} />
              </div>
              {/* Title + meta */}
              <div>
                <h1 className="text-xl font-bold leading-tight" style={{ color: colors.utility.primaryText }}>
                  {contract.title || contract.name || 'Untitled Contract'}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold" style={{ color: colors.utility.secondaryText }}>
                    {contract.contract_number}
                  </span>
                  <span style={{ color: colors.utility.secondaryText }}>&middot;</span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold"
                    style={{
                      backgroundColor: statusColor + '18',
                      color: statusColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    {statusConfig.label}
                  </span>
                  <span style={{ color: colors.utility.secondaryText }}>&middot;</span>
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Created {formatDate(contract.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'transparent',
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.primaryText,
              }}
            >
              <FileText className="h-4 w-4" /> View PDF
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'transparent',
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.primaryText,
              }}
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'transparent',
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.primaryText,
              }}
            >
              <Send className="h-4 w-4" /> Send Update
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff',
              }}
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>
        </div>
      </header>

      {/* ═══════ SUMMARY BAR ═══════ */}
      <div
        className="border-b px-6 py-3 flex items-center"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '10',
        }}
      >
        <SummaryItem label="Contract Value" value={formatCurrency(grandTotal, contract.currency)} colors={colors} />
        <SummaryItem label="Tax" value={formatCurrency(contract.tax_total, contract.currency)} colors={colors} />
        <SummaryItem label="Completion" value="\u2014" colorClass="default" colors={colors} />
        <SummaryItem label="Tasks" value="\u2014" colors={colors} />
        <SummaryItem label="Blocks" value={`${blocksCount}`} colors={colors} />
        <SummaryItem label="Duration" value={duration} colors={colors} isLast />
      </div>

      {/* ═══════ TABS ═══════ */}
      <div className="px-6 pt-4">
        <TabsNavigation
          tabs={TAB_DEFINITIONS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabId)}
          variant="underline"
          size="md"
        />
      </div>

      {/* ═══════ TAB CONTENT ═══════ */}
      <div className="px-6 py-6">
        {renderTabContent()}
      </div>

      {/* ═══════ RECORD PAYMENT DIALOG (T11) ═══════ */}
      <RecordPaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        contractId={contract.id}
        hasActiveGateway={hasActiveGateway}
        grandTotal={grandTotal}
        currency={contract.currency}
        paymentMode={contract.payment_mode}
        emiMonths={contract.emi_months}
        onOrderCreated={handleOrderCreated}
        onSuccess={() => {
          setIsPaymentDialogOpen(false);
        }}
      />
    </div>
  );
};

export default ContractDetailPage;

// src/components/contracts/PaymentRequestHistory.tsx
// Displays payment attempt history for an invoice or contract.
// Shows each payment request with status, collection mode, amount, and timestamps.

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  usePaymentRequests,
  type PaymentRequest,
} from '@/hooks/queries/usePaymentGatewayQueries';
import {
  ChevronDown,
  ChevronUp,
  Monitor,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Send,
  ExternalLink,
  Loader2,
  CreditCard,
} from 'lucide-react';

// =================================================================
// TYPES
// =================================================================

interface PaymentRequestHistoryProps {
  contractId?: string;
  invoiceId?: string;
  /** Compact mode — fewer details, suited for sidebar */
  compact?: boolean;
}

// =================================================================
// HELPERS
// =================================================================

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; colorClass: string }> = {
  created: { label: 'Created', icon: <Clock className="w-3.5 h-3.5" />, colorClass: 'text-gray-500' },
  sent: { label: 'Sent', icon: <Send className="w-3.5 h-3.5" />, colorClass: 'text-blue-500' },
  viewed: { label: 'Viewed', icon: <Eye className="w-3.5 h-3.5" />, colorClass: 'text-indigo-500' },
  paid: { label: 'Paid', icon: <CheckCircle2 className="w-3.5 h-3.5" />, colorClass: 'text-emerald-500' },
  expired: { label: 'Expired', icon: <AlertTriangle className="w-3.5 h-3.5" />, colorClass: 'text-amber-500' },
  failed: { label: 'Failed', icon: <XCircle className="w-3.5 h-3.5" />, colorClass: 'text-red-500' },
};

const MODE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  terminal: { label: 'Terminal', icon: <Monitor className="w-3.5 h-3.5" /> },
  email_link: { label: 'Email Link', icon: <Mail className="w-3.5 h-3.5" /> },
  whatsapp_link: { label: 'WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" /> },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

// =================================================================
// COMPONENT
// =================================================================

const PaymentRequestHistory: React.FC<PaymentRequestHistoryProps> = ({
  contractId,
  invoiceId,
  compact = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isExpanded, setIsExpanded] = useState(!compact);

  const { data, isLoading, isError } = usePaymentRequests(
    { contract_id: contractId, invoice_id: invoiceId },
    { enabled: !!(contractId || invoiceId) }
  );

  const requests = data?.requests || [];
  const summary = data?.summary;

  // Don't render if no payment requests exist
  if (!isLoading && requests.length === 0) {
    return null;
  }

  // ─── Status Badge ──────────────────────────────────────────
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.created;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.colorClass}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // ─── Collection Mode Badge ─────────────────────────────────
  const ModeBadge: React.FC<{ mode: string }> = ({ mode }) => {
    const config = MODE_CONFIG[mode] || MODE_CONFIG.terminal;
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          color: isDarkMode ? '#d1d5db' : '#6b7280',
        }}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  // ─── Request Row ───────────────────────────────────────────
  const RequestRow: React.FC<{ request: PaymentRequest }> = ({ request }) => (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 border-b last:border-b-0"
      style={{
        borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      }}
    >
      {/* Left: attempt + mode + status */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-xs font-mono font-semibold shrink-0 w-6 text-center"
          style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
        >
          #{request.attempt_number}
        </span>
        <ModeBadge mode={request.collection_mode} />
        <StatusBadge status={request.status} />
      </div>

      {/* Right: amount + date + link */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold" style={{ color: colors.text }}>
          {formatCurrency(request.amount, request.currency)}
        </span>
        <span className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#9ca3af' }}>
          {formatDate(request.paid_at || request.created_at)}
        </span>
        {request.gateway_short_url && request.status !== 'paid' && request.status !== 'expired' && (
          <a
            href={request.gateway_short_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline inline-flex items-center gap-0.5"
            style={{ color: '#4F46E5' }}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,1)',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-opacity-50 transition-colors"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }} />
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            Online Payment Attempts
          </span>
          {summary && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: isDarkMode ? '#d1d5db' : '#6b7280',
              }}
            >
              {summary.total_requests}
            </span>
          )}
          {summary && summary.total_paid > 0 && (
            <span className="text-xs text-emerald-500 font-medium">
              {formatCurrency(summary.total_amount_paid, requests[0]?.currency)} collected
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: isDarkMode ? '#9ca3af' : '#9ca3af' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: isDarkMode ? '#9ca3af' : '#9ca3af' }} />
        )}
      </button>

      {/* ─── Body ───────────────────────────────────────────── */}
      {isExpanded && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#9ca3af' }} />
              <span className="text-xs" style={{ color: '#9ca3af' }}>Loading payment history...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-4">
              <span className="text-xs text-red-500">Failed to load payment history</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-xs" style={{ color: '#9ca3af' }}>No online payment attempts yet</span>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentRequestHistory;

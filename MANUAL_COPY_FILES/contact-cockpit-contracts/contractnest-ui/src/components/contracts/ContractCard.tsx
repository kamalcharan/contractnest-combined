// src/components/contracts/ContractCard.tsx
// Reusable contract card component with compact and full variants
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Users,
  Eye,
  ShoppingCart,
  Package,
  Handshake,
  Tag,
} from 'lucide-react';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import {
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors,
} from '@/utils/constants/contacts';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface ContractCardData {
  id: string;
  title?: string;
  name?: string;
  contract_number: string;
  status: string;
  total_value?: number;
  grand_total?: number;
  currency?: string;
  buyer_name?: string;
  contact_classification?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  duration_value?: number;
  duration_unit?: string;
}

export interface ContractCardProps {
  contract: ContractCardData;
  colors: any;
  /** Compact variant for Contact Cockpit (simpler, no buyer info) */
  variant?: 'default' | 'compact';
  onClick?: (id: string) => void;
}

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

const getClassificationLabel = (classificationId: string): string => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find((c: any) => c.id === classificationId);
  return config?.label || classificationId || '—';
};

const getSemanticColor = (colorKey: string, colors: any): string => {
  switch (colorKey) {
    case 'success': return colors.semantic.success;
    case 'warning': return colors.semantic.warning;
    case 'error': return colors.semantic.error;
    case 'info': return colors.brand.secondary || colors.brand.primary;
    default: return colors.utility.secondaryText;
  }
};

const formatCurrency = (value?: number, currency?: string) => {
  if (!value && value !== 0) return '—';

  // Indian format for INR
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN')}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDateRange = (start?: string, end?: string) => {
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return '—';
};

// ═══════════════════════════════════════════════════
// CONTRACT CARD COMPONENT
// ═══════════════════════════════════════════════════

const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  colors,
  variant = 'default',
  onClick,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(contract.id);
    } else {
      navigate(`/contracts/${contract.id}`);
    }
  };

  const statusConfig = CONTRACT_STATUS_COLORS[contract.status] || CONTRACT_STATUS_COLORS.draft;
  const statusColor = getSemanticColor(statusConfig.bg, colors);
  const displayTitle = contract.title || contract.name || 'Untitled Contract';
  const displayValue = contract.grand_total || contract.total_value;

  // ─── COMPACT VARIANT (for Contact Cockpit) ───
  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        className="p-4 rounded-xl border cursor-pointer transition-all hover:translate-x-1 hover:shadow-md"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '10',
          borderLeftWidth: '3px',
          borderLeftColor: statusColor,
        }}
      >
        {/* Row 1: Status + Amount */}
        <div className="flex items-start justify-between mb-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold uppercase"
            style={{ backgroundColor: statusColor + '20', color: statusColor }}
          >
            {statusConfig.label}
          </span>
          <span className="text-base font-bold" style={{ color: colors.utility.primaryText }}>
            {formatCurrency(displayValue, contract.currency)}
          </span>
        </div>

        {/* Row 2: Title */}
        <div className="text-sm font-semibold mb-1 truncate" style={{ color: colors.utility.primaryText }}>
          {displayTitle}
        </div>

        {/* Row 3: Contract Number */}
        <div className="text-xs font-mono" style={{ color: colors.utility.secondaryText }}>
          {contract.contract_number}
        </div>

        {/* Row 4: Duration (if available) */}
        {contract.duration_value && (
          <div
            className="mt-3 pt-3 border-t text-xs"
            style={{ borderColor: colors.utility.primaryText + '10', color: colors.utility.secondaryText }}
          >
            {contract.duration_value} {contract.duration_unit}
          </div>
        )}
      </div>
    );
  }

  // ─── DEFAULT VARIANT (for Contracts Hub) ───
  const classType = contract.contact_classification || contract.contract_type || '';
  const ClassIcon = getClassificationIcon(classType);
  const classLabel = getClassificationLabel(classType);
  const badgeColors = getClassificationColors(
    CONTACT_CLASSIFICATION_CONFIG.find((cfg: any) => cfg.id === classType)?.colorKey || 'default',
    colors,
    'badge'
  );

  return (
    <div
      className="rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 p-3"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left Section — Avatar + Name + ClassIcon + Contract# + Status */}
        <div className="flex items-center gap-3 min-w-0" style={{ flex: '1.2' }}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm border flex-shrink-0"
            style={{
              backgroundColor: colors.brand.primary + '20',
              color: colors.brand.primary,
              borderColor: colors.brand.primary + '40',
            }}
          >
            {displayTitle.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'C'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className="font-semibold text-base truncate"
                style={{ color: colors.utility.primaryText }}
                title={displayTitle}
              >
                {displayTitle}
              </h3>
              {/* Classification icon inline after name */}
              <ClassIcon
                className="h-4 w-4 flex-shrink-0"
                style={{ color: badgeColors.text }}
                title={classLabel}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {contract.contract_number}
              </span>
              {/* Status badge */}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${statusColor}20`,
                  borderColor: `${statusColor}40`,
                  color: statusColor,
                }}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Section — Contact Name (with salutation) */}
        <div
          className="flex items-center gap-2 min-w-0 px-4"
          style={{ flex: '1', color: colors.utility.primaryText }}
        >
          <Users className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
          <span className="truncate text-sm" title={contract.buyer_name || '—'}>
            {contract.buyer_name || '—'}
          </span>
        </div>

        {/* Classification label (e.g. "Client - Primary") */}
        <div className="flex items-center gap-2 min-w-0 px-4" style={{ flex: '0.8' }}>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: badgeColors.bg,
              borderColor: badgeColors.border,
              color: badgeColors.text,
            }}
          >
            <ClassIcon className="h-3 w-3" />
            {classLabel}
          </span>
        </div>

        {/* Right Section — Value + Dates + View button */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Value */}
          <div className="text-right" style={{ minWidth: 80 }}>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {formatCurrency(displayValue, contract.currency)}
            </div>
          </div>

          {/* Start-End dates */}
          <div className="text-right" style={{ minWidth: 120 }}>
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {formatDateRange(contract.start_date, contract.end_date)}
            </span>
          </div>

          {/* View button (Eye icon — same as contacts) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="p-1.5 rounded-md transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryText + '20',
              color: colors.utility.primaryText,
            }}
            title="View contract details"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractCard;

// src/pages/contracts/hub/index.tsx
// ContractsHub — Option B layout: vertical type rail + horizontal pipeline + table
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FileText,
  Users,
  Building2,
  Handshake,
  ShoppingCart,
  Package,
  Tag,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useContracts, useContractStats } from '@/hooks/queries/useContractQueries';
import { useAuth } from '@/context/AuthContext';
import { prefetchContacts } from '@/hooks/useContacts';
import type {
  ContractListFilters,
  ContractTypeFilter,
  Contract,
} from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import {
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors,
} from '@/utils/constants/contacts';
import ContractWizard from '@/components/contracts/ContractWizard';
import type { ContractType } from '@/components/contracts/ContractWizard';

// ═══════════════════════════════════════════════════
// CLASSIFICATION ICON MAP (matches contacts page)
// ═══════════════════════════════════════════════════

const CLASSIFICATION_ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart,
  Package,
  Handshake,
  Users,
};

const getClassificationIcon = (classificationId: string): React.ElementType => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find((c: any) => c.id === classificationId);
  if (config?.lucideIcon && CLASSIFICATION_ICON_MAP[config.lucideIcon]) {
    return CLASSIFICATION_ICON_MAP[config.lucideIcon];
  }
  return Tag;
};

const getClassificationLabel = (classificationId: string): string => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find((c: any) => c.id === classificationId);
  return config?.label || classificationId || '—';
};

// ═══════════════════════════════════════════════════
// TYPE RAIL (Left vertical sidebar — glassmorphic)
// ═══════════════════════════════════════════════════

interface TypeRailProps {
  activeType: ContractTypeFilter;
  onTypeChange: (type: ContractTypeFilter) => void;
  onCreateClick: (type: ContractType) => void;
  stats: { all: number; client: number; vendor: number; partner: number };
  colors: any;
}

const TypeRail: React.FC<TypeRailProps> = ({ activeType, onTypeChange, onCreateClick, stats, colors }) => {
  const typeItems: Array<{
    id: ContractTypeFilter;
    label: string;
    icon: React.ElementType;
    count: number;
    color: string;
  }> = [
    { id: 'all', label: 'All Contracts', icon: FileText, count: stats.all, color: colors.brand.primary },
    { id: 'client', label: 'Client', icon: Users, count: stats.client, color: colors.brand.primary },
    { id: 'vendor', label: 'Vendor', icon: Building2, count: stats.vendor, color: colors.semantic.success },
    { id: 'partner', label: 'Partner', icon: Handshake, count: stats.partner, color: colors.semantic.warning },
  ];

  const createItems: Array<{ label: string; type: ContractType; color: string }> = [
    { label: 'Client Contract', type: 'client', color: colors.brand.primary },
    { label: 'Vendor Contract', type: 'vendor', color: colors.semantic.success },
    { label: 'Partner Contract', type: 'partner', color: colors.semantic.warning },
  ];

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        borderRight: `1px solid ${colors.utility.primaryText}20`,
        background: `${colors.utility.secondaryBackground}CC`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Type filter cards */}
      <div style={{ padding: '16px 12px', flex: 1 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: colors.utility.secondaryText,
            marginBottom: 12,
            paddingLeft: 8,
          }}
        >
          Filter by Type
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {typeItems.map((item) => {
            const isActive = activeType === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onTypeChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: isActive ? `1px solid ${item.color}40` : '1px solid transparent',
                  background: isActive ? `${item.color}14` : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? `${item.color}20` : `${colors.utility.primaryText}08`,
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? item.color : colors.utility.secondaryText }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? colors.utility.primaryText : colors.utility.secondaryText,
                    }}
                  >
                    {item.label}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive ? item.color : colors.utility.secondaryText,
                    minWidth: 20,
                    textAlign: 'right',
                  }}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Create buttons */}
      <div
        style={{
          padding: '12px',
          borderTop: `1px solid ${colors.utility.primaryText}20`,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: colors.utility.secondaryText,
            marginBottom: 8,
            paddingLeft: 8,
          }}
        >
          Quick Create
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {createItems.map((item) => (
            <button
              key={item.type}
              onClick={() => onCreateClick(item.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.utility.primaryText}20`,
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
                fontSize: 12,
                fontWeight: 500,
                color: colors.utility.secondaryText,
              }}
            >
              <Plus size={14} style={{ color: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// PIPELINE BAR (Horizontal status strip)
// ═══════════════════════════════════════════════════

interface PipelineBarProps {
  statusCounts: Record<string, number>;
  activeStatus: string | null;
  onStatusClick: (status: string | null) => void;
  colors: any;
}

const PIPELINE_STAGES = [
  { key: 'draft', label: 'Draft', icon: FileText, colorKey: 'secondaryText' },
  { key: 'pending_review', label: 'In Review', icon: Eye, colorKey: 'info' },
  { key: 'pending_acceptance', label: 'Pending', icon: Clock, colorKey: 'warning' },
  { key: 'active', label: 'Active', icon: CheckCircle, colorKey: 'success' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, colorKey: 'success' },
  { key: 'expired', label: 'Expired', icon: XCircle, colorKey: 'error' },
];

const getSemanticColor = (colorKey: string, colors: any): string => {
  switch (colorKey) {
    case 'success': return colors.semantic.success;
    case 'warning': return colors.semantic.warning;
    case 'error': return colors.semantic.error;
    case 'info': return colors.brand.secondary || colors.brand.primary;
    default: return colors.utility.secondaryText;
  }
};

const PipelineBar: React.FC<PipelineBarProps> = ({ statusCounts, activeStatus, onStatusClick, colors }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        borderRadius: 10,
        overflow: 'hidden',
        background: `${colors.utility.secondaryBackground}`,
        border: `1px solid ${colors.utility.primaryText}20`,
      }}
    >
      {PIPELINE_STAGES.map((stage) => {
        const count = statusCounts[stage.key] || 0;
        const isActive = activeStatus === stage.key;
        const stageColor = getSemanticColor(stage.colorKey, colors);
        const Icon = stage.icon;

        return (
          <button
            key={stage.key}
            onClick={() => onStatusClick(isActive ? null : stage.key)}
            style={{
              flex: 1,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isActive ? `${stageColor}14` : 'transparent',
              borderBottom: `3px solid ${isActive ? stageColor : `${stageColor}30`}`,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={14} style={{ color: stageColor, opacity: count > 0 ? 1 : 0.4 }} />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: count > 0 ? stageColor : colors.utility.secondaryText,
                  lineHeight: 1,
                }}
              >
                {count}
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: colors.utility.secondaryText,
              }}
            >
              {stage.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════

interface EmptyStateProps {
  typeFilter: ContractTypeFilter;
  colors: any;
  onCreateClick: () => void;
  onCreateType: (type: ContractType) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ typeFilter, colors, onCreateClick, onCreateType }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const labels: Record<ContractTypeFilter, string> = {
    all: 'contracts',
    client: 'client contracts',
    vendor: 'vendor contracts',
    partner: 'partner contracts',
  };

  const createOptions: Array<{ label: string; type: ContractType; icon: React.ElementType; color: string }> = [
    { label: 'Client Contract', type: 'client', icon: Users, color: colors.brand.primary },
    { label: 'Vendor Contract', type: 'vendor', icon: Building2, color: colors.semantic.success },
    { label: 'Partner Contract', type: 'partner', icon: Handshake, color: colors.semantic.warning },
  ];

  const isAll = typeFilter === 'all';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 40px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${colors.brand.primary}14`,
          marginBottom: 20,
        }}
      >
        <FileText size={32} style={{ color: colors.brand.primary, opacity: 0.6 }} />
      </div>

      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: colors.utility.primaryText,
          marginBottom: 8,
        }}
      >
        No {labels[typeFilter]} yet
      </h3>

      <p
        style={{
          fontSize: 14,
          color: colors.utility.secondaryText,
          maxWidth: 380,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Create your first {isAll ? 'contract' : `${typeFilter} contract`} to start
        managing agreements, tracking status, and keeping everything organized.
      </p>

      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={isAll ? () => setDropdownOpen((prev) => !prev) : onCreateClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: colors.brand.primary,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={16} />
          {isAll ? 'New Contract' : `Create ${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} Contract`}
          {isAll && (
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 0.15s ease',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </button>

        {dropdownOpen && isAll && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: 200,
              borderRadius: 10,
              border: `1px solid ${colors.utility.primaryText}20`,
              background: colors.utility.secondaryBackground,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            {createOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  onClick={() => {
                    setDropdownOpen(false);
                    onCreateType(opt.type);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 500,
                    color: colors.utility.primaryText,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${colors.utility.primaryText}08`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${opt.color}14`,
                    }}
                  >
                    <Icon size={14} style={{ color: opt.color }} />
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// CONTRACTS LIST (card-based, matches contacts list view)
// ═══════════════════════════════════════════════════

interface ContractsListProps {
  contracts: Contract[];
  colors: any;
  onRowClick: (id: string) => void;
}

const ContractsList: React.FC<ContractsListProps> = ({ contracts, colors, onRowClick }) => {
  const formatValue = (value?: number, currency?: string) => {
    if (!value) return '—';
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

  return (
    <div className="space-y-2">
      {contracts.map((c) => {
        const statusConfig = CONTRACT_STATUS_COLORS[c.status] || CONTRACT_STATUS_COLORS.draft;

        // Classification icon & colors (matches contacts page pattern)
        const classType = c.contact_classification || c.contract_type || '';
        const ClassIcon = getClassificationIcon(classType);
        const classLabel = getClassificationLabel(classType);
        const badgeColors = getClassificationColors(
          CONTACT_CLASSIFICATION_CONFIG.find((cfg: any) => cfg.id === classType)?.colorKey || 'default',
          colors,
          'badge'
        );

        return (
          <div
            key={c.id}
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
                  {c.title?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'C'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="font-semibold text-base truncate"
                      style={{ color: colors.utility.primaryText }}
                      title={c.title}
                    >
                      {c.title}
                    </h3>
                    {/* Classification icon inline after name */}
                    <ClassIcon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: badgeColors.text }}
                      title={classLabel}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {c.contract_number}
                    </span>
                    {/* Status badge */}
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: `${getSemanticColor(statusConfig.bg, colors)}20`,
                        borderColor: `${getSemanticColor(statusConfig.bg, colors)}40`,
                        color: getSemanticColor(statusConfig.text, colors),
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
                <span className="truncate text-sm" title={c.buyer_name || '—'}>
                  {c.buyer_name || '—'}
                </span>
              </div>

              {/* Classification label (e.g. "Client - Primary") */}
              <div
                className="flex items-center gap-2 min-w-0 px-4"
                style={{ flex: '0.8' }}
              >
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
                  <div
                    className="text-sm font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {formatValue(c.total_value, c.currency)}
                  </div>
                </div>

                {/* Start-End dates */}
                <div className="text-right" style={{ minWidth: 120 }}>
                  <span
                    className="text-xs"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {formatDateRange(c.start_date, c.end_date)}
                  </span>
                </div>

                {/* View button (Eye icon — same as contacts) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(c.id);
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
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// MAIN HUB PAGE
// ═══════════════════════════════════════════════════

const ContractsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant, isLive } = useAuth();

  // ── Prefetch contacts for wizard (client/vendor/partner) ──
  useEffect(() => {
    if (!currentTenant?.id) return;
    ['client', 'vendor', 'partner'].forEach((cls) => {
      prefetchContacts(currentTenant.id, isLive, cls);
    });
  }, [currentTenant?.id, isLive]);

  // ── State ──
  const [activeType, setActiveType] = useState<ContractTypeFilter>(
    (searchParams.get('type') as ContractTypeFilter) || 'all'
  );
  const [activeStatus, setActiveStatus] = useState<string | null>(
    searchParams.get('status') || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const createDropdownRef = useRef<HTMLDivElement>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardContractType, setWizardContractType] = useState<ContractType>('client');

  // ── Close dropdown on outside click ──
  useEffect(() => {
    if (!createDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target as Node)) {
        setCreateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [createDropdownOpen]);

  // ── Build API filters ──
  const filters: ContractListFilters = useMemo(() => {
    const f: ContractListFilters = { limit: 25 };
    if (activeType !== 'all') f.contract_type = activeType as any;
    if (activeStatus) f.status = activeStatus as any;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [activeType, activeStatus, searchQuery]);

  // ── Data hooks ──
  const { data: contractsData, isLoading, isError, refetch } = useContracts(filters);
  const { data: statsData } = useContractStats();

  const contracts = contractsData?.items || [];
  const totalCount = contractsData?.total_count || 0;

  // ── Derive type counts from stats ──
  const typeCounts = useMemo(() => {
    const byType = statsData?.by_contract_type || {};
    return {
      all: statsData?.total || 0,
      client: byType['client'] || 0,
      vendor: byType['vendor'] || 0,
      partner: byType['partner'] || 0,
    };
  }, [statsData]);

  const statusCounts = statsData?.by_status || {};

  // ── Handlers ──
  const handleTypeChange = (type: ContractTypeFilter) => {
    setActiveType(type);
    const params = new URLSearchParams(searchParams);
    if (type === 'all') params.delete('type');
    else params.set('type', type);
    setSearchParams(params, { replace: true });
  };

  const handleStatusClick = (status: string | null) => {
    setActiveStatus(status);
    const params = new URLSearchParams(searchParams);
    if (!status) params.delete('status');
    else params.set('status', status);
    setSearchParams(params, { replace: true });
  };

  // ── Create options for dropdown ──
  const createOptions = useMemo(() => [
    { label: 'Client Contract', type: 'client', icon: Users, color: colors.brand.primary },
    { label: 'Vendor Contract', type: 'vendor', icon: Building2, color: colors.semantic.success },
    { label: 'Partner Contract', type: 'partner', icon: Handshake, color: colors.semantic.warning },
  ], [colors]);

  const openWizard = (type: ContractType) => {
    setWizardContractType(type);
    setShowWizard(true);
  };

  const handleCreateClick = () => {
    if (activeType === 'all') {
      setCreateDropdownOpen((prev) => !prev);
    } else {
      openWizard(activeType as ContractType);
    }
  };

  const handleCreateOption = (type: string) => {
    setCreateDropdownOpen(false);
    openWizard(type as ContractType);
  };

  const handleRowClick = (id: string) => {
    navigate(`/contracts/${id}`);
  };

  // ── Derive whether to show empty state (no data + error = treat as empty) ──
  const showEmptyState = (!isLoading && contracts.length === 0) || (isError && !contractsData);

  // ── Render ──
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: colors.utility.primaryBackground }}>
      {/* Left: Type Rail */}
      <TypeRail
        activeType={activeType}
        onTypeChange={handleTypeChange}
        onCreateClick={openWizard}
        stats={typeCounts}
        colors={colors}
      />

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: colors.utility.primaryText,
                letterSpacing: '-0.3px',
              }}
            >
              {activeType === 'all'
                ? 'All Contracts'
                : `${activeType.charAt(0).toUpperCase() + activeType.slice(1)} Contracts`}
            </h1>
            <p style={{ fontSize: 13, color: colors.utility.secondaryText, marginTop: 2 }}>
              {totalCount} {totalCount === 1 ? 'contract' : 'contracts'}
              {activeStatus ? ` · filtered by ${activeStatus.replace(/_/g, ' ')}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${colors.utility.primaryText}20`,
                background: `${colors.utility.primaryText}06`,
              }}
            >
              <Search size={14} style={{ color: colors.utility.secondaryText }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: colors.utility.primaryText,
                  fontSize: 13,
                  width: 180,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.utility.primaryText}20`,
                background: 'transparent',
                cursor: 'pointer',
                color: colors.utility.secondaryText,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={14} />
            </button>

            {/* Primary create — dropdown when "All", direct when specific type */}
            <div ref={createDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={handleCreateClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: colors.brand.primary,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {activeType === 'all'
                  ? 'New Contract'
                  : `New ${activeType.charAt(0).toUpperCase() + activeType.slice(1)} Contract`}
                {activeType === 'all' && (
                  <ChevronDown
                    size={14}
                    style={{
                      transition: 'transform 0.15s ease',
                      transform: createDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                )}
              </button>

              {/* Dropdown menu */}
              {createDropdownOpen && activeType === 'all' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: 200,
                    borderRadius: 10,
                    border: `1px solid ${colors.utility.primaryText}20`,
                    background: colors.utility.secondaryBackground,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {createOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.type}
                        onClick={() => handleCreateOption(opt.type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                          textAlign: 'left',
                          fontSize: 13,
                          fontWeight: 500,
                          color: colors.utility.primaryText,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${colors.utility.primaryText}08`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `${opt.color}14`,
                          }}
                        >
                          <Icon size={14} style={{ color: opt.color }} />
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Bar */}
        <div style={{ marginBottom: 20 }}>
          <PipelineBar
            statusCounts={statusCounts}
            activeStatus={activeStatus}
            onStatusClick={handleStatusClick}
            colors={colors}
          />
        </div>

        {/* Content: Loading / Empty / Table */}
        {isLoading && !contractsData ? (
          <VaNiLoader
            size="md"
            message={
              activeType === 'all'
                ? 'VaNi is Loading Contracts...'
                : `VaNi is Loading ${activeType.charAt(0).toUpperCase() + activeType.slice(1)} Contracts...`
            }
            showSkeleton={true}
            skeletonVariant="list"
            skeletonCount={8}
          />
        ) : showEmptyState ? (
          <EmptyState typeFilter={activeType} colors={colors} onCreateClick={handleCreateClick} onCreateType={openWizard} />
        ) : (
          <ContractsList contracts={contracts} colors={colors} onRowClick={handleRowClick} />
        )}
      </div>

      {/* Contract Creation Wizard Modal */}
      <ContractWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        contractType={wizardContractType}
        onComplete={() => {
          setShowWizard(false);
          refetch();
        }}
      />
    </div>
  );
};

export default ContractsHubPage;

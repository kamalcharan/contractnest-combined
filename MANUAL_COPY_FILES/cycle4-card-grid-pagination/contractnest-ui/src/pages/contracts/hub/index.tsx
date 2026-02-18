// src/pages/contracts/hub/index.tsx
// ContractsHub — Portfolio view with PerspectiveSwitcher, enriched cards,
// summary strip, pipeline filters, sort controls, grouped/flat toggle, and pagination.
// Cycle 2: Replaces Option B vertical TypeRail layout with horizontal portfolio.
// Cycle 3: Adds ViewModeToggle (flat/grouped), ClientGroupHeader, server-side grouping.
// Cycle 4: Card grid layout, all statuses in pipeline, pagination, red border only for risk.

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
} from 'lucide-react';
import { useContracts, useGroupedContracts, useContractStats } from '@/hooks/queries/useContractQueries';
import { useAuth } from '@/context/AuthContext';
import { prefetchContacts } from '@/hooks/useContacts';
import type {
  ContractListFilters,
  Contract,
  ContractGroup,
} from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import ContractWizard from '@/components/contracts/ContractWizard';
import type { ContractType } from '@/components/contracts/ContractWizard';

// Portfolio list components
import ContractPortfolioRow from '@/components/contracts/list/ContractPortfolioRow';
import PortfolioSummaryStrip from '@/components/contracts/list/PortfolioSummaryStrip';
import PortfolioSortSelect from '@/components/contracts/list/PortfolioSortSelect';
import type { PortfolioSortOption } from '@/components/contracts/list/PortfolioSortSelect';

// Grouped view components
import ViewModeToggle from '@/components/contracts/list/ViewModeToggle';
import type { ViewMode } from '@/components/contracts/list/ViewModeToggle';
import ClientGroupHeader from '@/components/contracts/list/ClientGroupHeader';


// ═══════════════════════════════════════════════════
// PERSPECTIVE SWITCHER (Revenue/Expense)
// ═══════════════════════════════════════════════════

type Perspective = 'revenue' | 'expense';

interface PerspectiveSwitcherProps {
  active: Perspective;
  onChange: (p: Perspective) => void;
  isDarkMode: boolean;
  brandColor: string;
}

const PerspectiveSwitcher: React.FC<PerspectiveSwitcherProps> = ({
  active,
  onChange,
  isDarkMode,
  brandColor,
}) => {
  const perspectives: Array<{ id: Perspective; label: string; sublabel: string }> = [
    { id: 'revenue', label: 'Revenue', sublabel: 'Clients' },
    { id: 'expense', label: 'Expense', sublabel: 'Vendors' },
  ];

  return (
    <div className={`inline-flex rounded-lg p-0.5 gap-0.5 ${
      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
    }`}>
      {perspectives.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'text-white shadow-sm'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
            style={isActive ? { backgroundColor: brandColor } : undefined}
          >
            {p.label}
            <span className={`ml-1 text-xs font-normal ${isActive ? 'opacity-80' : ''}`}>
              · {p.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};


// ═══════════════════════════════════════════════════
// PIPELINE SEGMENTED CONTROL (Status filters)
// Cycle 4: All statuses, wrapping flex layout
// ═══════════════════════════════════════════════════

interface PipelineSegmentProps {
  stages: Array<{ key: string; label: string; count: number; color: string }>;
  activeStatus: string | null;
  onStatusClick: (status: string | null) => void;
  colors: any;
  isDarkMode: boolean;
}

const PipelineSegment: React.FC<PipelineSegmentProps> = ({
  stages,
  activeStatus,
  onStatusClick,
  colors,
  isDarkMode,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: 3,
        borderRadius: 10,
        padding: 3,
        background: isDarkMode ? colors.utility.primaryText + '10' : colors.utility.primaryText + '06',
      }}
    >
      {stages.map((stage) => {
        const isActive = activeStatus === stage.key || (stage.key === 'all' && !activeStatus);
        return (
          <button
            key={stage.key}
            onClick={() => onStatusClick(stage.key === 'all' ? null : (isActive ? null : stage.key))}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? colors.utility.secondaryBackground : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              color: isActive ? colors.utility.primaryText : colors.utility.secondaryText,
              fontSize: 11,
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {stage.label}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 5,
                background: isActive ? stage.color + '15' : 'transparent',
                color: isActive ? stage.color : colors.utility.secondaryText,
              }}
            >
              {stage.count}
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
  perspective: Perspective;
  colors: any;
  onCreateType: (type: ContractType) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ perspective, colors, onCreateType }) => {
  const label = perspective === 'revenue' ? 'client' : 'vendor';

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
          background: colors.brand.primary + '14',
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
        No {label} contracts yet
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
        Create your first {label} contract to start managing agreements,
        tracking health, and keeping everything organized.
      </p>
      <button
        onClick={() => onCreateType(label as ContractType)}
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
        }}
      >
        <Plus size={16} />
        New {label.charAt(0).toUpperCase() + label.slice(1)} Contract
      </button>
    </div>
  );
};


// ═══════════════════════════════════════════════════
// PAGINATION (Contacts-style)
// ═══════════════════════════════════════════════════

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  colors: any;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  colors,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Show up to 5 page buttons, centered on current page
  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        marginTop: 12,
        borderRadius: 10,
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
      }}
    >
      <span style={{ fontSize: 13, color: colors.utility.secondaryText }}>
        Showing {startItem} to {endItem} of {totalItems} contracts
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            border: `1px solid ${colors.utility.primaryText}20`,
            background: 'transparent',
            color: currentPage === 1 ? colors.utility.secondaryText + '40' : colors.utility.primaryText,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: currentPage === page ? colors.brand.primary : 'transparent',
              color: currentPage === page ? '#ffffff' : colors.utility.primaryText,
              fontSize: 13,
              fontWeight: currentPage === page ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            border: `1px solid ${colors.utility.primaryText}20`,
            background: 'transparent',
            color: currentPage === totalPages ? colors.utility.secondaryText + '40' : colors.utility.primaryText,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════
// FOOTER SUMMARY
// ═══════════════════════════════════════════════════

const FooterSummary: React.FC<{
  filtered: number;
  total: number;
  totalValue: number;
  collected: number;
  outstanding: number;
  currency?: string;
  colors: any;
}> = ({ filtered, total, totalValue, collected, outstanding, currency, colors }) => {
  const fmt = (n: number) => {
    if (currency === 'USD') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        marginTop: 8,
        fontSize: 12,
        color: colors.utility.secondaryText,
      }}
    >
      <span>
        Showing {filtered} of {total} contracts
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>
          Total:{' '}
          <strong style={{ color: colors.utility.primaryText, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt(totalValue)}
          </strong>
        </span>
        <span>
          Collected:{' '}
          <strong style={{ color: colors.semantic.success, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt(collected)}
          </strong>
        </span>
        <span>
          Outstanding:{' '}
          <strong style={{ color: colors.semantic.error, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt(outstanding)}
          </strong>
        </span>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════
// MAIN HUB PAGE
// ═══════════════════════════════════════════════════

const ITEMS_PER_PAGE = 25;

const ContractsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brandColor = colors.brand.primary;
  const { currentTenant, isLive } = useAuth();
  const { profile } = useTenantContext();

  // ── Prefetch contacts for wizard ──
  useEffect(() => {
    if (!currentTenant?.id) return;
    ['client', 'vendor', 'partner'].forEach((cls) => {
      prefetchContacts(currentTenant.id, isLive, cls);
    });
  }, [currentTenant?.id, isLive]);

  // ── Perspective state (Revenue/Expense) ──
  const [perspective, setPerspective] = useState<Perspective | null>(null);

  useEffect(() => {
    if (perspective === null && profile?.business_type_id) {
      setPerspective(
        profile.business_type_id.toLowerCase() === 'buyer' ? 'expense' : 'revenue'
      );
    }
  }, [profile?.business_type_id, perspective]);

  const activePerspective: Perspective = perspective || 'revenue';
  const perspectiveType = activePerspective === 'revenue' ? 'client' : 'vendor';

  // ── Filter state ──
  const [activeStatus, setActiveStatus] = useState<string | null>(
    searchParams.get('status') || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<PortfolioSortOption>('health_score');
  const [currentPage, setCurrentPage] = useState(1);

  // ── View mode state (flat vs grouped) ──
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const toggleClientExpand = (key: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Wizard state ──
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const createDropdownRef = useRef<HTMLDivElement>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardContractType, setWizardContractType] = useState<ContractType>('client');

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

  // ── Reset page when filters change ──
  useEffect(() => {
    setCurrentPage(1);
  }, [activePerspective, activeStatus, searchQuery, sortBy, viewMode]);

  // ── Derive sort direction: health & completion → worst first (asc), value → desc, recent → desc ──
  const sortOrder = sortBy === 'health_score' || sortBy === 'completion' ? 'asc' : 'desc';

  // ── Build API filters ──
  const filters: ContractListFilters = useMemo(() => {
    const f: ContractListFilters = {
      limit: ITEMS_PER_PAGE,
      page: currentPage,
      contract_type: perspectiveType as any,
      sort_by: sortBy as any,
      sort_direction: sortOrder,
    };
    if (activeStatus) f.status = activeStatus as any;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [perspectiveType, activeStatus, searchQuery, sortBy, sortOrder, currentPage]);

  // ── Data hooks ──
  const { data: contractsData, isLoading: isLoadingFlat, isError: isErrorFlat, refetch: refetchFlat } = useContracts(
    filters,
    { enabled: viewMode === 'flat' }
  );
  const { data: groupedData, isLoading: isLoadingGrouped, isError: isErrorGrouped, refetch: refetchGrouped } = useGroupedContracts(
    filters,
    { enabled: viewMode === 'grouped' }
  );
  const { data: statsData } = useContractStats();

  const isLoading = viewMode === 'flat' ? isLoadingFlat : isLoadingGrouped;
  const isError = viewMode === 'flat' ? isErrorFlat : isErrorGrouped;
  const refetch = viewMode === 'flat' ? refetchFlat : refetchGrouped;

  const contracts = contractsData?.items || [];
  const groups = groupedData?.groups || [];
  const totalCount = viewMode === 'flat'
    ? (contractsData?.total_count || 0)
    : (groupedData?.total_count || 0);
  const portfolio = statsData?.portfolio;

  // ── Pagination info ──
  const pageInfo = viewMode === 'flat' ? contractsData?.page_info : groupedData?.page_info;
  const totalPages = pageInfo?.total_pages || Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  // ── Status counts (from stats) for pipeline ──
  const statusCounts = statsData?.by_status || {};

  // ── Pipeline stages (ALL statuses) ──
  const pipelineStages = useMemo(() => {
    const totalAll = Object.values(statusCounts).reduce((s: number, n: any) => s + (n || 0), 0);

    const statusOrder: Array<{ key: string; color: string }> = [
      { key: 'active', color: colors.semantic.success },
      { key: 'pending_acceptance', color: colors.semantic.warning },
      { key: 'pending_review', color: colors.brand.secondary || colors.brand.primary },
      { key: 'draft', color: colors.utility.secondaryText },
      { key: 'sent', color: colors.brand.secondary || colors.brand.primary },
      { key: 'quotes_received', color: colors.semantic.warning },
      { key: 'awarded', color: colors.semantic.success },
      { key: 'completed', color: colors.brand.tertiary || colors.brand.primary },
      { key: 'cancelled', color: colors.semantic.error },
      { key: 'expired', color: colors.semantic.error },
      { key: 'converted_to_contract', color: colors.semantic.success },
    ];

    return [
      { key: 'all', label: 'All', count: totalAll, color: colors.utility.primaryText },
      ...statusOrder.map((s) => ({
        key: s.key,
        label: CONTRACT_STATUS_COLORS[s.key]?.label || s.key.replace(/_/g, ' '),
        count: statusCounts[s.key] || 0,
        color: s.color,
      })),
    ];
  }, [statusCounts, colors]);

  // ── Portfolio financial totals ──
  const totalValue = statsData?.total_value || 0;
  const totalCollected = portfolio?.total_collected || 0;
  const totalOutstanding = portfolio?.outstanding || 0;

  // ── URL sync ──
  const handleStatusClick = (status: string | null) => {
    setActiveStatus(status);
    const params = new URLSearchParams(searchParams);
    if (!status) params.delete('status');
    else params.set('status', status);
    setSearchParams(params, { replace: true });
  };

  // ── Wizard handlers ──
  const openWizard = (type: ContractType) => {
    setWizardContractType(type);
    setShowWizard(true);
  };

  const handleCreateClick = () => {
    openWizard(perspectiveType as ContractType);
  };

  const handleRowClick = (id: string) => {
    navigate(`/contracts/${id}`);
  };

  // ── Expand all groups by default when switching to grouped mode ──
  useEffect(() => {
    if (viewMode === 'grouped' && groups.length > 0 && expandedClients.size === 0) {
      setExpandedClients(new Set(groups.map((g) => g.buyer_id || g.buyer_company)));
    }
  }, [viewMode, groups.length]);

  // ── Show states ──
  const hasData = viewMode === 'flat' ? contracts.length > 0 : groups.length > 0;
  const hasLoadedData = viewMode === 'flat' ? !!contractsData : !!groupedData;
  const showEmptyState = (!isLoading && !hasData) || (isError && !hasLoadedData);

  // ── Render ──
  return (
    <div style={{ height: '100%', overflow: 'auto', background: colors.utility.primaryBackground }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px' }}>

        {/* ═══ HEADER: Perspective + Search + Create ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: colors.utility.primaryText,
                letterSpacing: -0.5,
                margin: 0,
              }}
            >
              Contract Portfolio
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <PerspectiveSwitcher
                active={activePerspective}
                onChange={(p) => setPerspective(p)}
                isDarkMode={isDarkMode}
                brandColor={brandColor}
              />
              <button
                onClick={() =>
                  setPerspective(activePerspective === 'revenue' ? 'expense' : 'revenue')
                }
                className="flex items-center gap-1.5 text-[11px] font-medium transition-all group"
                style={{ color: brandColor }}
              >
                <ArrowRightLeft className="h-3 w-3 transition-transform duration-300 group-hover:rotate-180" />
                <span className="group-hover:underline">
                  flip to {activePerspective === 'revenue' ? 'Expense' : 'Revenue'}
                </span>
              </button>
            </div>
            <p
              style={{
                fontSize: 13,
                color: colors.utility.secondaryText,
                marginTop: 6,
              }}
            >
              {totalCount} {perspectiveType} contract{totalCount !== 1 ? 's' : ''}
              {activeStatus ? ` · ${activeStatus.replace(/_/g, ' ')}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: `1px solid ${colors.utility.primaryText}20`,
                background: colors.utility.secondaryBackground,
              }}
            >
              <Search size={14} style={{ color: colors.utility.secondaryText }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts, clients..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: colors.utility.primaryText,
                  fontSize: 13,
                  width: 200,
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

            {/* Create button */}
            <button
              onClick={handleCreateClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                background: colors.brand.primary,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              New {activePerspective === 'revenue' ? 'Client' : 'Vendor'} Contract
            </button>
          </div>
        </div>

        {/* ═══ SUMMARY STRIP ═══ */}
        <PortfolioSummaryStrip
          stats={portfolio}
          totalValue={totalValue}
          colors={colors}
        />

        {/* ═══ PIPELINE + CONTROLS ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}
        >
          <PipelineSegment
            stages={pipelineStages}
            activeStatus={activeStatus}
            onStatusClick={handleStatusClick}
            colors={colors}
            isDarkMode={isDarkMode}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <ViewModeToggle value={viewMode} onChange={setViewMode} colors={colors} />
            <PortfolioSortSelect value={sortBy} onChange={setSortBy} colors={colors} />
          </div>
        </div>

        {/* ═══ CARD GRID / GROUPED CONTENT ═══ */}
        {isLoading && !hasLoadedData ? (
          <div
            style={{
              background: colors.utility.secondaryBackground,
              borderRadius: 14,
              border: `1px solid ${colors.utility.primaryText}10`,
              overflow: 'hidden',
            }}
          >
            <VaNiLoader
              size="md"
              message={`Loading ${perspectiveType} contracts...`}
              showSkeleton={true}
              skeletonVariant="list"
              skeletonCount={8}
            />
          </div>
        ) : showEmptyState ? (
          <div
            style={{
              background: colors.utility.secondaryBackground,
              borderRadius: 14,
              border: `1px solid ${colors.utility.primaryText}10`,
              overflow: 'hidden',
            }}
          >
            <EmptyState
              perspective={activePerspective}
              colors={colors}
              onCreateType={openWizard}
            />
          </div>
        ) : viewMode === 'grouped' ? (
          /* ═══ GROUPED VIEW ═══ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((group: ContractGroup) => {
              const groupKey = group.buyer_id || group.buyer_company;
              const isExpanded = expandedClients.has(groupKey);
              return (
                <div key={groupKey}>
                  <ClientGroupHeader
                    buyerName={group.buyer_name}
                    buyerCompany={group.buyer_company}
                    totals={group.group_totals}
                    isExpanded={isExpanded}
                    onToggle={() => toggleClientExpand(groupKey)}
                    colors={colors}
                  />
                  {isExpanded && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 14,
                        padding: '12px 0 12px 36px',
                      }}
                    >
                      {group.contracts.map((c: Contract) => (
                        <ContractPortfolioRow
                          key={c.id}
                          contract={c}
                          colors={colors}
                          isDarkMode={isDarkMode}
                          onRowClick={handleRowClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ═══ FLAT VIEW — Card Grid ═══ */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            {contracts.map((c: Contract) => (
              <ContractPortfolioRow
                key={c.id}
                contract={c}
                colors={colors}
                isDarkMode={isDarkMode}
                onRowClick={handleRowClick}
              />
            ))}
          </div>
        )}

        {/* ═══ PAGINATION ═══ */}
        {hasData && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            colors={colors}
          />
        )}

        {/* ═══ FOOTER ═══ */}
        {hasData && (
          <FooterSummary
            filtered={viewMode === 'flat' ? contracts.length : groups.reduce((s, g) => s + g.contracts.length, 0)}
            total={totalCount}
            totalValue={totalValue}
            collected={totalCollected}
            outstanding={totalOutstanding}
            colors={colors}
          />
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

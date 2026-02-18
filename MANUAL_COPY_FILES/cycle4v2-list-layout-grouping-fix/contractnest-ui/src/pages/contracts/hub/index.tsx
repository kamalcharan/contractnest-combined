// src/pages/contracts/hub/index.tsx
// ContractsHub — Portfolio list view with pipeline bar, status filters,
// sort controls, flat/grouped toggle, and pagination.
// Cycle 4 v2: Single-column list rows (not grid), 6 statuses, Active default,
// pipeline bar with counts + colored segments. Fixed By Client grouping.

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
// STATUS PIPELINE BAR (6 statuses with counts + colored bar)
// Draft | In Review | Pending | Active | Completed | Expired
// ═══════════════════════════════════════════════════

interface StatusStage {
  key: string;
  label: string;
  count: number;
  color: string;
}

interface StatusPipelineBarProps {
  stages: StatusStage[];
  activeStatus: string | null;
  onStatusClick: (status: string | null) => void;
  colors: any;
}

const StatusPipelineBar: React.FC<StatusPipelineBarProps> = ({
  stages,
  activeStatus,
  onStatusClick,
  colors,
}) => {
  const totalCount = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Status counts row */}
      <div style={{ display: 'flex', marginBottom: 8 }}>
        {stages.map((stage) => {
          const isActive = activeStatus === stage.key;
          const isAll = !activeStatus;
          return (
            <div
              key={stage.key}
              onClick={() => onStatusClick(isActive ? null : stage.key)}
              style={{
                flex: 1,
                textAlign: 'center',
                cursor: 'pointer',
                padding: '10px 4px',
                borderRadius: 8,
                background: isActive ? colors.brand.primary + '10' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  color: isActive ? stage.color : (isAll ? colors.utility.primaryText : colors.utility.secondaryText),
                  lineHeight: 1.2,
                }}
              >
                {stage.count}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 0.5,
                  color: isActive ? stage.color : colors.utility.secondaryText,
                  marginTop: 2,
                }}
              >
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Colored bar segments */}
      <div
        style={{
          display: 'flex',
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          background: colors.utility.primaryText + '08',
        }}
      >
        {stages.map((stage) => {
          const isActive = activeStatus === stage.key;
          const proportion = totalCount > 0 ? stage.count / totalCount : 0;
          if (proportion === 0 && !isActive) return null;
          return (
            <div
              key={stage.key}
              style={{
                flex: Math.max(proportion, 0.02), // minimum visible width
                background: stage.color,
                opacity: !activeStatus ? 0.8 : (isActive ? 1 : 0.2),
                transition: 'opacity 0.2s',
              }}
            />
          );
        })}
      </div>
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
// PAGINATION
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

  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
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

  // ── Filter state — Active is the default status ──
  const [activeStatus, setActiveStatus] = useState<string | null>(
    searchParams.get('status') || 'active'
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
  const [showWizard, setShowWizard] = useState(false);
  const [wizardContractType, setWizardContractType] = useState<ContractType>('client');

  // ── Reset page when filters change ──
  useEffect(() => {
    setCurrentPage(1);
  }, [activePerspective, activeStatus, searchQuery, sortBy, viewMode]);

  // ── Derive sort direction ──
  const sortOrder = sortBy === 'health_score' || sortBy === 'completion' ? 'asc' : 'desc';

  // ── Build API filters ──
  // Revenue mode: filter contract_type='client' (contracts I created for my clients)
  // Expense mode: DON'T filter by contract_type — claimed contracts keep the
  //   seller's original type ('client'), so filtering by 'vendor' excludes them.
  //   The RPC already returns claimed contracts via t_contract_access grants.
  const filters: ContractListFilters = useMemo(() => {
    const f: ContractListFilters = {
      limit: ITEMS_PER_PAGE,
      page: currentPage,
      sort_by: sortBy as any,
      sort_direction: sortOrder,
    };
    if (activePerspective === 'revenue') {
      f.contract_type = 'client' as any;
    }
    // expense mode: no contract_type filter — shows claimed contracts
    if (activeStatus) f.status = activeStatus as any;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [activePerspective, activeStatus, searchQuery, sortBy, sortOrder, currentPage]);

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

  // ── Pagination info ──
  const pageInfo = viewMode === 'flat' ? contractsData?.page_info : groupedData?.page_info;
  const totalPages = pageInfo?.total_pages || Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  // ── Compute perspective-specific portfolio stats from loaded contracts ──
  const visibleContracts = viewMode === 'flat'
    ? contracts
    : groups.flatMap((g: ContractGroup) => g.contracts);

  const computedPortfolio = useMemo(() => {
    const list = visibleContracts;
    const totalVal = list.reduce((s: number, c: Contract) => s + (c.grand_total || c.total_value || 0), 0);
    const collected = list.reduce((s: number, c: Contract) => s + (c.total_collected || 0), 0);
    const healthSum = list.reduce((s: number, c: Contract) => s + (c.health_score ?? 100), 0);
    const overdue = list.reduce((s: number, c: Contract) => s + (c.events_overdue || 0), 0);
    const attention = list.filter((c: Contract) =>
      (c.events_overdue || 0) > 0 || ((c.health_score ?? 100) > 0 && (c.health_score ?? 100) < 50)
    ).length;

    return {
      totalValue: totalVal,
      stats: {
        total_collected: collected,
        outstanding: totalVal - collected,
        avg_health_score: list.length > 0 ? Math.round(healthSum / list.length) : 0,
        needs_attention_count: attention,
        total_overdue_events: overdue,
        total_invoiced: 0,
      },
    };
  }, [visibleContracts]);

  // ── Status counts from stats ──
  const statusCounts: Record<string, number> = statsData?.by_status || {};

  // ── Pipeline stages: exactly 6 statuses ──
  const pipelineStages: StatusStage[] = useMemo(() => [
    { key: 'draft', label: 'Draft', count: statusCounts['draft'] || 0, color: colors.utility.secondaryText },
    { key: 'pending_review', label: 'In Review', count: statusCounts['pending_review'] || 0, color: colors.brand.secondary || colors.brand.primary },
    { key: 'pending_acceptance', label: 'Pending', count: statusCounts['pending_acceptance'] || 0, color: colors.semantic.warning },
    { key: 'active', label: 'Active', count: statusCounts['active'] || 0, color: colors.semantic.success },
    { key: 'completed', label: 'Completed', count: statusCounts['completed'] || 0, color: colors.brand.tertiary || colors.brand.primary },
    { key: 'expired', label: 'Expired', count: statusCounts['expired'] || 0, color: colors.semantic.error },
  ], [statusCounts, colors]);

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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>

        {/* ═══ HEADER ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: colors.utility.primaryText,
                  letterSpacing: -0.5,
                  margin: 0,
                }}
              >
                All Contracts
              </h1>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: colors.utility.secondaryText,
                  fontWeight: 500,
                }}
              >
                {totalCount} contract{totalCount !== 1 ? 's' : ''}
              </span>
            </div>
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
              New Contract
            </button>
          </div>
        </div>

        {/* ═══ SUMMARY STRIP (computed from loaded contracts per perspective) ═══ */}
        <PortfolioSummaryStrip
          stats={computedPortfolio.stats}
          totalValue={computedPortfolio.totalValue}
          colors={colors}
        />

        {/* ═══ PIPELINE BAR (6 statuses with counts + colored bar) ═══ */}
        <StatusPipelineBar
          stages={pipelineStages}
          activeStatus={activeStatus}
          onStatusClick={handleStatusClick}
          colors={colors}
        />

        {/* ═══ CONTROLS: View mode + Sort ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginBottom: 12,
            gap: 8,
          }}
        >
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            groupLabel={activePerspective === 'revenue' ? 'By Client' : 'By Vendor'}
            colors={colors}
          />
          <PortfolioSortSelect value={sortBy} onChange={setSortBy} colors={colors} />
        </div>

        {/* ═══ CONTRACT LIST / GROUPED CONTENT ═══ */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 36, paddingTop: 6, paddingBottom: 8 }}>
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
          /* ═══ FLAT VIEW — Single Column List ═══ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

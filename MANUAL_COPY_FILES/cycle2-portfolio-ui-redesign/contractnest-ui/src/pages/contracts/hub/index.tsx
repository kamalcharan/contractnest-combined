// src/pages/contracts/hub/index.tsx
// ContractsHub — Portfolio view with PerspectiveSwitcher, enriched rows,
// summary strip, pipeline filters, and sort controls.
// Cycle 2: Replaces Option B vertical TypeRail layout with horizontal portfolio.

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  FileText,
  Users,
  Building2,
  Plus,
  Search,
  RefreshCw,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';
import { useContracts, useContractStats } from '@/hooks/queries/useContractQueries';
import { useAuth } from '@/context/AuthContext';
import { prefetchContacts } from '@/hooks/useContacts';
import type {
  ContractListFilters,
  Contract,
} from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import ContractWizard from '@/components/contracts/ContractWizard';
import type { ContractType } from '@/components/contracts/ContractWizard';

// Portfolio list components (Cycle 2 — NEW)
import ContractPortfolioRow from '@/components/contracts/list/ContractPortfolioRow';
import PortfolioSummaryStrip from '@/components/contracts/list/PortfolioSummaryStrip';
import PortfolioSortSelect from '@/components/contracts/list/PortfolioSortSelect';
import type { PortfolioSortOption } from '@/components/contracts/list/PortfolioSortSelect';


// ═══════════════════════════════════════════════════
// PERSPECTIVE SWITCHER (Revenue/Expense)
// Same pattern as ops/cockpit — reused here
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
// Compact pill-style replacement for the old PipelineBar
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
              padding: '5px 12px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? colors.utility.secondaryBackground : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              color: isActive ? colors.utility.primaryText : colors.utility.secondaryText,
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s',
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
// LIST COLUMN HEADER
// ═══════════════════════════════════════════════════

const ListHeader: React.FC<{ colors: any }> = ({ colors }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '8px 20px',
      fontSize: 10,
      fontWeight: 700,
      color: colors.utility.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 1,
    }}
  >
    <div style={{ width: 32 }}>Health</div>
    <div style={{ flex: 1 }}>Contract</div>
    <div style={{ width: 70, textAlign: 'center' }}>Tasks</div>
    <div style={{ width: 110 }}>Progress</div>
    <div style={{ width: 100, textAlign: 'right' }}>Value</div>
    <div style={{ width: 36 }} />
  </div>
);


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

  // ── Derive sort direction: health & completion → worst first (asc), value → desc, recent → desc ──
  const sortOrder = sortBy === 'health_score' || sortBy === 'completion' ? 'asc' : 'desc';

  // ── Build API filters ──
  const filters: ContractListFilters = useMemo(() => {
    const f: ContractListFilters = {
      limit: 25,
      contract_type: perspectiveType as any,
      sort_by: sortBy as any,
      sort_direction: sortOrder,
    };
    if (activeStatus) f.status = activeStatus as any;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [perspectiveType, activeStatus, searchQuery, sortBy, sortOrder]);

  // ── Data hooks ──
  const { data: contractsData, isLoading, isError, refetch } = useContracts(filters);
  const { data: statsData } = useContractStats();

  const contracts = contractsData?.items || [];
  const totalCount = contractsData?.total_count || 0;
  const portfolio = statsData?.portfolio;

  // ── Status counts (from stats) for pipeline, filtered by perspective ──
  const statusCounts = statsData?.by_status || {};

  // ── Pipeline stages ──
  const pipelineStages = useMemo(() => {
    const totalAll = Object.values(statusCounts).reduce((s: number, n: any) => s + (n || 0), 0);
    return [
      { key: 'all', label: 'All', count: totalAll, color: colors.utility.primaryText },
      { key: 'active', label: 'Active', count: statusCounts['active'] || 0, color: colors.semantic.success },
      { key: 'pending_acceptance', label: 'Pending', count: statusCounts['pending_acceptance'] || 0, color: colors.semantic.warning },
      { key: 'draft', label: 'Draft', count: statusCounts['draft'] || 0, color: colors.utility.secondaryText },
      { key: 'completed', label: 'Completed', count: statusCounts['completed'] || 0, color: colors.brand.primary },
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
    // Direct create based on perspective
    openWizard(perspectiveType as ContractType);
  };

  const handleRowClick = (id: string) => {
    navigate(`/contracts/${id}`);
  };

  // ── Show states ──
  const showEmptyState = (!isLoading && contracts.length === 0) || (isError && !contractsData);

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
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <PipelineSegment
            stages={pipelineStages}
            activeStatus={activeStatus}
            onStatusClick={handleStatusClick}
            colors={colors}
            isDarkMode={isDarkMode}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <PortfolioSortSelect value={sortBy} onChange={setSortBy} colors={colors} />
          </div>
        </div>

        {/* ═══ LIST HEADER ═══ */}
        <ListHeader colors={colors} />

        {/* ═══ LIST CONTENT ═══ */}
        <div
          style={{
            background: colors.utility.secondaryBackground,
            borderRadius: 14,
            border: `1px solid ${colors.utility.primaryText}10`,
            overflow: 'hidden',
          }}
        >
          {isLoading && !contractsData ? (
            <VaNiLoader
              size="md"
              message={`Loading ${perspectiveType} contracts...`}
              showSkeleton={true}
              skeletonVariant="list"
              skeletonCount={8}
            />
          ) : showEmptyState ? (
            <EmptyState
              perspective={activePerspective}
              colors={colors}
              onCreateType={openWizard}
            />
          ) : (
            contracts.map((c: Contract) => (
              <ContractPortfolioRow
                key={c.id}
                contract={c}
                colors={colors}
                onRowClick={handleRowClick}
              />
            ))
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        {contracts.length > 0 && (
          <FooterSummary
            filtered={contracts.length}
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

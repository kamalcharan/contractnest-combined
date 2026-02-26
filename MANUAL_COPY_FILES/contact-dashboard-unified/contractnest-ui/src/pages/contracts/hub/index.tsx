// src/pages/contracts/hub/index.tsx
// ContractsHub — Unified Relationships view.
// Contacts are parent rows ("Relationships"), contracts nest underneath.
// Click parent row → expand contracts, click arrow → Contact Dashboard.
// Click contract sub-row → Contract Detail page.
// Keeps: Perspective switcher, Pipeline bar, Search, Pagination, ContractWizard.

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
  Users,
  ChevronDown as ChevronDownIcon,
  UserPlus,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useContractStats, contractKeys } from '@/hooks/queries/useContractQueries';
import { useAuth } from '@/context/AuthContext';
import { prefetchContacts } from '@/hooks/useContacts';
import type { Contract } from '@/types/contracts';
import type { RelationshipSortOption, RelationshipPerspective } from '@/types/relationships';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import ContractWizard from '@/components/contracts/ContractWizard';
import type { ContractType } from '@/components/contracts/ContractWizard';

// Unified Relationships components
import RelationshipRow from '@/components/contracts/list/RelationshipRow';
import ContractSubRow from '@/components/contracts/list/ContractSubRow';
import RelationshipSummaryStrip from '@/components/contracts/list/RelationshipSummaryStrip';
import RelationshipSortSelect from '@/components/contracts/list/RelationshipSortSelect';
import { useRelationships, useRelationshipContracts, useRelationshipPortfolio, relationshipKeys } from '@/hooks/queries/useRelationshipQueries';


// ═══════════════════════════════════════════════════
// PERSPECTIVE SWITCHER (Revenue/Expense)
// ═══════════════════════════════════════════════════

type Perspective = RelationshipPerspective;

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
      {/* Status pill tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {/* "All" pill */}
        <button
          onClick={() => onStatusClick(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 20,
            border: !activeStatus
              ? `1.5px solid ${colors.brand.primary}`
              : `1px solid ${colors.utility.primaryText}20`,
            background: !activeStatus ? colors.brand.primary + '12' : 'transparent',
            color: !activeStatus ? colors.brand.primary : colors.utility.secondaryText,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            lineHeight: 1,
          }}
        >
          All
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 10,
              background: !activeStatus ? colors.brand.primary : colors.utility.primaryText + '12',
              color: !activeStatus ? '#fff' : colors.utility.secondaryText,
              lineHeight: 1.2,
            }}
          >
            {totalCount}
          </span>
        </button>

        {stages.map((stage) => {
          const isActive = activeStatus === stage.key;
          return (
            <button
              key={stage.key}
              onClick={() => onStatusClick(isActive ? null : stage.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                border: isActive
                  ? `1.5px solid ${stage.color}`
                  : `1px solid ${colors.utility.primaryText}20`,
                background: isActive ? stage.color + '12' : 'transparent',
                color: isActive ? stage.color : colors.utility.secondaryText,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                lineHeight: 1,
              }}
            >
              {stage.label}
              {stage.count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 10,
                    background: isActive ? stage.color : colors.utility.primaryText + '12',
                    color: isActive ? '#fff' : colors.utility.secondaryText,
                    lineHeight: 1.2,
                  }}
                >
                  {stage.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Colored bar segments */}
      <div
        style={{
          display: 'flex',
          height: 4,
          borderRadius: 2,
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
                flex: Math.max(proportion, 0.02),
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
        <Users size={32} style={{ color: colors.brand.primary, opacity: 0.6 }} />
      </div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: colors.utility.primaryText,
          marginBottom: 8,
        }}
      >
        No {label} relationships yet
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
        Create your first {label} contract to start managing relationships,
        tracking agreements, and keeping everything organized.
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
  label?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  colors,
  label = 'relationships',
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
        Showing {startItem} to {endItem} of {totalItems} {label}
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
// EXPANDED CONTRACTS SECTION (lazy-loaded sub-rows)
// ═══════════════════════════════════════════════════

interface ExpandedContractsSectionProps {
  contactId: string;
  perspective: Perspective;
  onNavigateContract: (contractId: string) => void;
  colors: any;
  isDarkMode: boolean;
}

const ExpandedContractsSection: React.FC<ExpandedContractsSectionProps> = ({
  contactId,
  perspective,
  onNavigateContract,
  colors,
  isDarkMode,
}) => {
  const { data: contracts, isLoading } = useRelationshipContracts(contactId, perspective, {
    enabled: true,
  });

  if (isLoading) {
    return (
      <div
        style={{
          padding: '12px 20px 12px 76px',
          background: isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(248, 250, 252, 0.6)',
          borderRadius: '0 0 12px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: `2px solid ${colors.brand.primary}40`,
              borderTopColor: colors.brand.primary,
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: 12, color: colors.utility.secondaryText }}>
            Loading contracts...
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div
        style={{
          padding: '16px 20px 16px 76px',
          background: isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(248, 250, 252, 0.6)',
          borderRadius: '0 0 12px 12px',
          fontSize: 12,
          color: colors.utility.secondaryText,
          fontStyle: 'italic',
        }}
      >
        No contracts found for this relationship.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
        borderTop: 'none',
      }}
    >
      {contracts.map((c: Contract, idx: number) => (
        <ContractSubRow
          key={c.id}
          contract={c}
          isLast={idx === contracts.length - 1}
          onNavigateContract={onNavigateContract}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
};


// ═══════════════════════════════════════════════════
// MAIN HUB PAGE — UNIFIED RELATIONSHIPS VIEW
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
  const queryClient = useQueryClient();

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
  const [contactStatusFilter, setContactStatusFilter] = useState<'active' | 'inactive' | 'archived' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<RelationshipSortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Split "New" dropdown state ──
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  // ── Expand state for relationship rows ──
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());

  const toggleContactExpand = (contactId: string) => {
    setExpandedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  // ── Wizard state ──
  const [showWizard, setShowWizard] = useState(false);
  const [wizardContractType, setWizardContractType] = useState<ContractType>('client');

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) {
        setShowNewDropdown(false);
      }
    };
    if (showNewDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNewDropdown]);

  // ── Reset page when filters change ──
  const prevPerspective = useRef(activePerspective);
  useEffect(() => {
    setCurrentPage(1);
    setExpandedContacts(new Set());
    if (prevPerspective.current !== activePerspective) {
      prevPerspective.current = activePerspective;
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
      queryClient.invalidateQueries({ queryKey: relationshipKeys.all });
    }
  }, [activePerspective, activeStatus, contactStatusFilter, searchQuery, sortBy]);

  // ── Build unified filters ──
  const relationshipFilters = useMemo(() => ({
    perspective: activePerspective,
    status: activeStatus as any,
    contactStatus: contactStatusFilter || undefined,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortDirection,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  }), [activePerspective, activeStatus, contactStatusFilter, searchQuery, sortBy, sortDirection, currentPage]);

  // ── Data hooks ──
  const {
    data: relationshipsData,
    isLoading,
    isError,
    refetch,
  } = useRelationships(relationshipFilters);

  const {
    data: portfolioSummary,
    isLoading: isPortfolioLoading,
  } = useRelationshipPortfolio(activePerspective);

  const { data: statsData } = useContractStats(perspectiveType);

  const relationships = relationshipsData?.relationships || [];
  const totalCount = relationshipsData?.totalCount || 0;
  const totalPages = relationshipsData?.totalPages || 1;

  // ── Status counts from stats (for pipeline bar) ──
  const statusCounts: Record<string, number> = statsData?.by_status || {};

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

  // ── Navigation handlers ──
  const handleNavigateContact = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const handleNavigateContract = (contractId: string) => {
    navigate(`/contracts/${contractId}`);
  };

  // ── Show states ──
  const hasData = relationships.length > 0;
  const showEmptyState = !isLoading && !hasData;

  // ── Debounce search ──
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

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
                Relationships
              </h1>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: colors.utility.secondaryText,
                  fontWeight: 500,
                }}
              >
                {totalCount} relationship{totalCount !== 1 ? 's' : ''}
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
            {/* Contact status pills */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {([
                { key: null, label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
              ] as const).map(({ key, label }) => {
                const isActive = contactStatusFilter === key;
                return (
                  <button
                    key={label}
                    onClick={() => setContactStatusFilter(key)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: isActive
                        ? `1.5px solid ${colors.brand.primary}`
                        : `1px solid ${colors.utility.primaryText}15`,
                      background: isActive ? colors.brand.primary + '12' : 'transparent',
                      color: isActive ? colors.brand.primary : colors.utility.secondaryText,
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      lineHeight: 1,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

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
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search relationships..."
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

            {/* Split "New" dropdown */}
            <div ref={newDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNewDropdown((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px 8px 18px',
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
                New
                <ChevronDownIcon
                  size={14}
                  style={{
                    transition: 'transform 0.2s',
                    transform: showNewDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {showNewDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    minWidth: 190,
                    borderRadius: 10,
                    border: `1px solid ${colors.utility.primaryText}15`,
                    background: isDarkMode ? colors.utility.secondaryBackground : '#fff',
                    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    zIndex: 50,
                  }}
                >
                  <button
                    onClick={() => {
                      setShowNewDropdown(false);
                      handleCreateClick();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: colors.utility.primaryText,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.brand.primary + '0A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FileText size={15} style={{ color: colors.brand.primary }} />
                    New Contract
                  </button>
                  <div style={{ height: 1, background: colors.utility.primaryText + '10' }} />
                  <button
                    onClick={() => {
                      setShowNewDropdown(false);
                      navigate('/contacts/create');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: colors.utility.primaryText,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.brand.primary + '0A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <UserPlus size={15} style={{ color: colors.semantic.success }} />
                    New Contact
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SUMMARY STRIP ═══ */}
        <RelationshipSummaryStrip
          summary={portfolioSummary}
          isLoading={isPortfolioLoading}
          colors={colors}
        />

        {/* ═══ PIPELINE BAR ═══ */}
        <StatusPipelineBar
          stages={pipelineStages}
          activeStatus={activeStatus}
          onStatusClick={handleStatusClick}
          colors={colors}
        />

        {/* ═══ CONTROLS: Sort ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginBottom: 12,
            gap: 8,
          }}
        >
          <RelationshipSortSelect
            value={sortBy}
            direction={sortDirection}
            onChange={(s, d) => { setSortBy(s); setSortDirection(d); }}
            colors={colors}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* ═══ RELATIONSHIP LIST ═══ */}
        {isLoading ? (
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
              message={`Loading ${perspectiveType} relationships...`}
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {relationships.map((r) => {
              const contactId = r.contact.id;
              const isExpanded = expandedContacts.has(contactId);

              return (
                <div key={contactId}>
                  <RelationshipRow
                    relationship={r}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleContactExpand(contactId)}
                    onNavigateContact={handleNavigateContact}
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                  {isExpanded && (
                    <ExpandedContractsSection
                      contactId={contactId}
                      perspective={activePerspective}
                      onNavigateContract={handleNavigateContract}
                      colors={colors}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </div>
              );
            })}
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
            label="relationships"
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

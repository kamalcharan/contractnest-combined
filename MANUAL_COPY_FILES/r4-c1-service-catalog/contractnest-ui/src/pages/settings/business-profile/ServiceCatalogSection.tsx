// src/pages/settings/business-profile/ServiceCatalogSection.tsx
// R4 C1: Displays equipment/services/facilities available for the tenant's industry
// with Knowledge Tree coverage status. Read-only — seeding comes in C4.
// Uses same type config pattern as /settings/configure/resources (Resources page).

import React, { useMemo } from 'react';
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ExternalLink,
  TreePine,
  Info,
  Wrench,
  Building,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useResourceTemplatesBrowser } from '@/hooks/queries/useResourceTemplates';
import { useKnowledgeTreeCoverage } from '@/hooks/queries/useKnowledgeTree';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import type { ResourceTemplate } from '@/services/resourcesService';
import type { KnowledgeTreeCoverageMap } from '@/pages/service-contracts/templates/admin/knowledge-tree/types';

// ════════════════════════════════════════════════════════════════════
// TYPE CONFIG — matches Resources page pattern
// ════════════════════════════════════════════════════════════════════

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: typeof Wrench }> = {
  equipment:  { color: '#3B82F6', label: 'Equipment',  icon: Wrench },
  consumable: { color: '#F59E0B', label: 'Consumable', icon: Package },
  asset:      { color: '#8B5CF6', label: 'Facility',   icon: Building },
  team_staff: { color: '#10B981', label: 'Staff',      icon: Package },
};

const getTypeConfig = (typeId: string) =>
  TYPE_CONFIG[typeId?.toLowerCase()] || { color: '#6B7280', label: typeId || 'Other', icon: Package };

// ════════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════════

type TabId = 'all' | 'equipment' | 'facility';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'facility', label: 'Facilities' },
];

const matchesTab = (resourceTypeId: string, tab: TabId): boolean => {
  if (tab === 'all') return true;
  const t = (resourceTypeId || '').toLowerCase();
  if (tab === 'equipment') return ['equipment', 'consumable'].includes(t);
  if (tab === 'facility') return t === 'asset';
  return true;
};

// ════════════════════════════════════════════════════════════════════
// PROPS
// ════════════════════════════════════════════════════════════════════

interface ServiceCatalogSectionProps {
  profileIndustryId?: string | null;
  businessTypeId?: string | null;
}

// ════════════════════════════════════════════════════════════════════
// CATALOG ROW
// ════════════════════════════════════════════════════════════════════

interface CatalogRowProps {
  template: ResourceTemplate;
  coverage: KnowledgeTreeCoverageMap;
  colors: any;
  onViewKT: (id: string) => void;
}

const CatalogRow: React.FC<CatalogRowProps> = ({ template, coverage, colors, onViewKT }) => {
  const kt = coverage[template.id];
  const hasKT = kt && (kt.variants_count > 0 || kt.checkpoints_count > 0);
  const typeConfig = getTypeConfig(template.resource_type_id);
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:shadow-sm"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '12',
      }}
    >
      {/* Left: Type icon + Name + meta */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: typeConfig.color + '15' }}
        >
          <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>
              {template.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{ backgroundColor: typeConfig.color + '12', color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
          </div>
          {template.sub_category && (
            <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
              {template.sub_category}
            </div>
          )}
        </div>
      </div>

      {/* Center: KT status */}
      <div className="flex items-center gap-3 px-4">
        {hasKT ? (
          <>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.semantic.success + '15' }}
            >
              <CheckCircle2 className="w-3 h-3" style={{ color: colors.semantic.success }} />
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.semantic.success + '12',
                color: colors.semantic.success,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {kt.variants_count}v · {kt.checkpoints_count}c · {kt.spare_parts_count}p
            </span>
          </>
        ) : (
          <>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.semantic.warning + '15' }}
            >
              <AlertCircle className="w-3 h-3" style={{ color: colors.semantic.warning }} />
            </div>
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              No KT
            </span>
          </>
        )}
      </div>

      {/* Right: Action */}
      <div className="flex-shrink-0">
        {hasKT && (
          <button
            onClick={() => onViewKT(template.id)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-colors hover:opacity-80"
            style={{
              borderColor: colors.brand.primary + '30',
              color: colors.brand.primary,
              backgroundColor: colors.brand.primary + '08',
            }}
          >
            <ExternalLink className="w-3 h-3" />
            View KT
          </button>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════

const ServiceCatalogSection: React.FC<ServiceCatalogSectionProps> = ({
  profileIndustryId,
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<TabId>('all');

  // Fetch resource templates — NO industry_ids override.
  // The edge function automatically uses the tenant's served industries
  // and resolves parent IDs (e.g. dental_clinics → healthcare).
  // This matches how /settings/configure/resources works.
  const {
    templates,
    isLoading: templatesLoading,
    isError: templatesError,
    refetch: refetchTemplates,
  } = useResourceTemplatesBrowser({ limit: 100 });

  // Fetch KT coverage map
  const {
    data: coverage,
    isLoading: coverageLoading,
    refetch: refetchCoverage,
  } = useKnowledgeTreeCoverage();

  const coverageMap = coverage || {};

  // Filter by tab + search
  const filteredTemplates = useMemo(() => {
    let result = templates.filter((t) => matchesTab(t.resource_type_id, activeTab));
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          (t.sub_category && t.sub_category.toLowerCase().includes(lower)) ||
          (t.description && t.description.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [templates, activeTab, searchTerm]);

  // Stats — by type
  const stats = useMemo(() => {
    const equipmentCount = templates.filter((t) => ['equipment', 'consumable'].includes((t.resource_type_id || '').toLowerCase())).length;
    const facilityCount = templates.filter((t) => (t.resource_type_id || '').toLowerCase() === 'asset').length;
    const withKT = templates.filter((t) => {
      const kt = coverageMap[t.id];
      return kt && (kt.variants_count > 0 || kt.checkpoints_count > 0);
    }).length;
    return { total: templates.length, equipmentCount, facilityCount, withKT };
  }, [templates, coverageMap]);

  const isLoading = templatesLoading || coverageLoading;

  const handleRefresh = () => {
    refetchTemplates();
    refetchCoverage();
  };

  const handleViewKT = (resourceTemplateId: string) => {
    navigate(`/service-contracts/templates/admin/global-templates/tree/${resourceTemplateId}`);
  };

  // No industry configured
  if (!profileIndustryId && templates.length === 0 && !templatesLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
          Service Catalog
        </h2>
        <div
          className="rounded-lg border p-8 text-center"
          style={{
            backgroundColor: colors.semantic.warning + '08',
            borderColor: colors.semantic.warning + '20',
          }}
        >
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: colors.semantic.warning }} />
          <p className="font-medium mb-1" style={{ color: colors.utility.primaryText }}>
            No industry configured
          </p>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            Set your industry in the Industries tab to see available equipment and services.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
            Service Catalog
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Equipment and facilities for your industry. Items with a Knowledge Tree can be auto-seeded into your service blocks.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg border hover:opacity-80 disabled:opacity-50 transition-colors"
          style={{
            borderColor: colors.utility.primaryText + '15',
            color: colors.utility.secondaryText,
          }}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats bar */}
      <div
        className="flex items-center gap-4 p-3 rounded-lg mb-4 flex-wrap"
        style={{
          backgroundColor: colors.brand.primary + '06',
          border: `1px solid ${colors.brand.primary}15`,
        }}
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4" style={{ color: '#3B82F6' }} />
          <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
            {stats.equipmentCount} equipment
          </span>
        </div>
        <div className="w-px h-4" style={{ backgroundColor: colors.utility.primaryText + '15' }} />
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4" style={{ color: '#8B5CF6' }} />
          <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
            {stats.facilityCount} facilities
          </span>
        </div>
        <div className="w-px h-4" style={{ backgroundColor: colors.utility.primaryText + '15' }} />
        <div className="flex items-center gap-2">
          <TreePine className="w-4 h-4" style={{ color: colors.semantic.success }} />
          <span className="text-sm" style={{ color: colors.semantic.success }}>
            {stats.withKT} with Knowledge Tree
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: colors.semantic.warning }} />
          <span className="text-sm" style={{ color: colors.semantic.warning }}>
            {stats.total - stats.withKT} pending
          </span>
        </div>
      </div>

      {/* Type tabs + Search row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: colors.utility.secondaryBackground, border: `1px solid ${colors.utility.primaryText}10` }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === 'all' ? stats.total : tab.id === 'equipment' ? stats.equipmentCount : stats.facilityCount;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: isActive ? colors.brand.primary : 'transparent',
                  color: isActive ? '#fff' : colors.utility.secondaryText,
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: colors.utility.secondaryText }}
          />
          <input
            type="text"
            placeholder="Search equipment & facilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.primaryText + '15',
              color: colors.utility.primaryText,
            }}
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-10">
          <VaNiLoader size="md" message="Loading service catalog..." />
        </div>
      )}

      {/* Error */}
      {!isLoading && templatesError && (
        <div
          className="rounded-lg border p-6 text-center"
          style={{
            backgroundColor: colors.semantic.error + '08',
            borderColor: colors.semantic.error + '20',
          }}
        >
          <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: colors.semantic.error }} />
          <p className="text-sm" style={{ color: colors.semantic.error }}>
            Failed to load service catalog. Try refreshing.
          </p>
        </div>
      )}

      {/* Catalog list */}
      {!isLoading && !templatesError && (
        <div className="space-y-2">
          {filteredTemplates.length === 0 ? (
            <div
              className="rounded-lg border p-8 text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '12',
              }}
            >
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {searchTerm ? 'No items match your search' : 'No items found for this category'}
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <CatalogRow
                key={template.id}
                template={template}
                coverage={coverageMap}
                colors={colors}
                onViewKT={handleViewKT}
              />
            ))
          )}
        </div>
      )}

      {/* Info banner */}
      {!isLoading && stats.withKT > 0 && (
        <div
          className="flex items-start gap-3 mt-4 p-3 rounded-lg"
          style={{
            backgroundColor: (colors.semantic.info || '#2563eb') + '08',
            border: `1px solid ${(colors.semantic.info || '#2563eb')}15`,
          }}
        >
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info || '#2563eb' }} />
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Items with a Knowledge Tree can be seeded into your test catalog as service blocks — complete with inspection forms, spare parts checklists, and service cycles. Seeding will be available in the next update.
          </p>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalogSection;

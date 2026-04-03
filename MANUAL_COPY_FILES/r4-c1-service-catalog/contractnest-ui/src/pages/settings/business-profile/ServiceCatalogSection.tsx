// src/pages/settings/business-profile/ServiceCatalogSection.tsx
// R4 C1: Displays equipment/services available for the tenant's industry
// with Knowledge Tree coverage status. Read-only — seeding comes in C4.

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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useResourceTemplatesBrowser } from '@/hooks/queries/useResourceTemplates';
import { useKnowledgeTreeCoverage } from '@/hooks/queries/useKnowledgeTree';
import {
  useServedIndustriesManager,
} from '@/hooks/queries/useServedIndustries';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import type { ResourceTemplate } from '@/services/resourcesService';
import type { KnowledgeTreeCoverageMap } from '@/pages/service-contracts/templates/admin/knowledge-tree/types';

// ════════════════════════════════════════════════════════════════════
// PROPS
// ════════════════════════════════════════════════════════════════════

interface ServiceCatalogSectionProps {
  profileIndustryId?: string | null;
  businessTypeId?: string | null; // 'buyer' | 'seller'
}

// ════════════════════════════════════════════════════════════════════
// EQUIPMENT ROW
// ════════════════════════════════════════════════════════════════════

interface EquipmentRowProps {
  template: ResourceTemplate;
  coverage: KnowledgeTreeCoverageMap;
  colors: any;
  onViewKT: (id: string) => void;
}

const EquipmentRow: React.FC<EquipmentRowProps> = ({ template, coverage, colors, onViewKT }) => {
  const kt = coverage[template.id];
  const hasKT = kt && (kt.variants_count > 0 || kt.checkpoints_count > 0);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:shadow-sm"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '12',
      }}
    >
      {/* Left: Name + meta */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: hasKT ? colors.semantic.success + '15' : colors.semantic.warning + '15',
          }}
        >
          {hasKT ? (
            <CheckCircle2 className="w-4 h-4" style={{ color: colors.semantic.success }} />
          ) : (
            <AlertCircle className="w-4 h-4" style={{ color: colors.semantic.warning }} />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>
            {template.name}
          </div>
          {template.sub_category && (
            <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
              {template.sub_category}
            </div>
          )}
        </div>
      </div>

      {/* Center: KT stats */}
      <div className="flex items-center gap-4 px-4">
        {hasKT ? (
          <>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.semantic.success + '12',
                color: colors.semantic.success,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {kt.variants_count} variants
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: (colors.semantic.info || '#2563eb') + '12',
                color: colors.semantic.info || '#2563eb',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {kt.checkpoints_count} checks
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.brand.primary + '12',
                color: colors.brand.primary,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {kt.spare_parts_count} parts
            </span>
          </>
        ) : (
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            No Knowledge Tree
          </span>
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
// INDUSTRY TAB (for sellers with multiple industries)
// ════════════════════════════════════════════════════════════════════

interface IndustryTabsProps {
  industryIds: string[];
  activeId: string;
  onSelect: (id: string) => void;
  allIndustries: { id: string; name: string }[];
  colors: any;
}

const IndustryTabs: React.FC<IndustryTabsProps> = ({ industryIds, activeId, onSelect, allIndustries, colors }) => {
  if (industryIds.length <= 1) return null;

  return (
    <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
      {industryIds.map((id) => {
        const industry = allIndustries.find((i) => i.id === id);
        const isActive = id === activeId;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
            style={{
              backgroundColor: isActive ? colors.brand.primary : colors.utility.secondaryBackground,
              color: isActive ? '#fff' : colors.utility.secondaryText,
              border: `1px solid ${isActive ? colors.brand.primary : colors.utility.primaryText + '15'}`,
            }}
          >
            {industry?.name || id}
          </button>
        );
      })}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════

const ServiceCatalogSection: React.FC<ServiceCatalogSectionProps> = ({
  profileIndustryId,
  businessTypeId,
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Search state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeIndustryId, setActiveIndustryId] = React.useState<string>(profileIndustryId || '');

  // Fetch served industries (for sellers)
  const { servedIndustries, isLoading: servedLoading } = useServedIndustriesManager();

  // Fetch all industries metadata (for tab labels)
  const { data: industriesResponse } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Build list of industry IDs to show
  const industryIds = useMemo(() => {
    const ids = new Set<string>();
    // Always include the tenant's own industry
    if (profileIndustryId) ids.add(profileIndustryId);
    // For sellers: add served industries
    if (servedIndustries) {
      servedIndustries.forEach((si) => ids.add(si.industry_id));
    }
    return Array.from(ids);
  }, [profileIndustryId, servedIndustries]);

  // Set initial active tab
  React.useEffect(() => {
    if (!activeIndustryId && industryIds.length > 0) {
      setActiveIndustryId(industryIds[0]);
    }
  }, [activeIndustryId, industryIds]);

  // Fetch resource templates for the active industry
  const {
    templates,
    isLoading: templatesLoading,
    isError: templatesError,
    refetch: refetchTemplates,
  } = useResourceTemplatesBrowser({
    industry_ids: activeIndustryId ? [activeIndustryId] : [],
    limit: 100,
  });

  // Fetch KT coverage map
  const {
    data: coverage,
    isLoading: coverageLoading,
    refetch: refetchCoverage,
  } = useKnowledgeTreeCoverage();

  const coverageMap = coverage || {};

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates;
    const lower = searchTerm.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        (t.sub_category && t.sub_category.toLowerCase().includes(lower)) ||
        (t.description && t.description.toLowerCase().includes(lower))
    );
  }, [templates, searchTerm]);

  // Stats
  const totalEquipment = filteredTemplates.length;
  const withKT = filteredTemplates.filter((t) => {
    const kt = coverageMap[t.id];
    return kt && (kt.variants_count > 0 || kt.checkpoints_count > 0);
  }).length;

  const isLoading = templatesLoading || coverageLoading || servedLoading;

  const handleRefresh = () => {
    refetchTemplates();
    refetchCoverage();
  };

  const handleViewKT = (resourceTemplateId: string) => {
    navigate(`/service-contracts/templates/admin/global-templates/tree/${resourceTemplateId}`);
  };

  // No industry configured
  if (!profileIndustryId && industryIds.length === 0) {
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
          <button
            onClick={() => {/* parent handles tab switch via prop if needed */}}
            className="text-sm font-medium px-4 py-2 rounded-md"
            style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
          >
            Go to Industries
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
            Service Catalog
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Equipment and services available for your industry. Items with a Knowledge Tree can be auto-seeded into your service blocks.
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

      {/* Industry tabs (for sellers) */}
      <IndustryTabs
        industryIds={industryIds}
        activeId={activeIndustryId}
        onSelect={setActiveIndustryId}
        allIndustries={allIndustries}
        colors={colors}
      />

      {/* Stats bar */}
      <div
        className="flex items-center gap-4 p-3 rounded-lg mb-4"
        style={{
          backgroundColor: colors.brand.primary + '06',
          border: `1px solid ${colors.brand.primary}15`,
        }}
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" style={{ color: colors.brand.primary }} />
          <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
            {totalEquipment} equipment types
          </span>
        </div>
        <div
          className="w-px h-4"
          style={{ backgroundColor: colors.utility.primaryText + '15' }}
        />
        <div className="flex items-center gap-2">
          <TreePine className="w-4 h-4" style={{ color: colors.semantic.success }} />
          <span className="text-sm" style={{ color: colors.semantic.success }}>
            {withKT} with Knowledge Tree
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: colors.semantic.warning }} />
          <span className="text-sm" style={{ color: colors.semantic.warning }}>
            {totalEquipment - withKT} pending
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: colors.utility.secondaryText }}
        />
        <input
          type="text"
          placeholder="Search equipment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: colors.utility.primaryText + '15',
            color: colors.utility.primaryText,
          }}
        />
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
            Failed to load equipment catalog. Try refreshing.
          </p>
        </div>
      )}

      {/* Equipment list */}
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
                {searchTerm ? 'No equipment matches your search' : 'No equipment found for this industry'}
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <EquipmentRow
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
      {!isLoading && withKT > 0 && (
        <div
          className="flex items-start gap-3 mt-4 p-3 rounded-lg"
          style={{
            backgroundColor: (colors.semantic.info || '#2563eb') + '08',
            border: `1px solid ${(colors.semantic.info || '#2563eb')}15`,
          }}
        >
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info || '#2563eb' }} />
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Equipment with a Knowledge Tree can be seeded into your test catalog as service blocks — complete with inspection forms, spare parts checklists, and service cycles. Seeding will be available in the next update.
          </p>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalogSection;

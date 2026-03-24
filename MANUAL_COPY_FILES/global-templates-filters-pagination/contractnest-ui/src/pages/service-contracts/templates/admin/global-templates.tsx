// src/pages/service-contracts/templates/admin/global-templates.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  Search,
  Grid3X3,
  List,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Globe,
  Building2,
  Bot,
  ChevronRight,
  BarChart3,
  Package,
  FileText,
  AlertTriangle,
  TrendingUp,
  Circle,
  Plus,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';

// Components and hooks
import TemplateCard from '@/components/service-contracts/templates/TemplateCard';
import TemplateSettingsModal from '@/components/service-contracts/templates/TemplateSettingsModal';
import UnifiedLoader from '@/components/common/loaders/UnifiedLoader';
import { useTemplateSelection } from '../../../../hooks/service-contracts/templates/useTemplates.ts';
import { Template, TemplateCardContext } from '../../../../types/service-contracts/template.ts';
// Note: TEMPLATE_COMPLEXITY_LABELS, CONTRACT_TYPE_LABELS available from
// '../../../../utils/service-contracts/templates.ts' if needed for card display

// Real data hooks (TanStack Query)
import { useCatSystemTemplates, CatTemplate, catTemplateKeys } from '@/hooks/queries/useCatTemplates';
import { useUpdateCatTemplate } from '@/hooks/mutations/useCatTemplatesMutations';
import { CatTemplateFilters } from '@/services/serviceURLs';
import { useTemplateCoverage, IndustryCoverage } from '@/hooks/queries/useTemplateCoverage';
import { useResourceTypes, ResourceType as DBResourceType } from '@/hooks/queries/useResources';
import { useNomenclatureTypes, NomenclatureGroup } from '@/hooks/queries/useNomenclatureTypes';

// Data constants (mock categories until APIs exist)
import {
  INDUSTRY_CATEGORIES,
  getCategoriesForIndustry,
} from '@/utils/constants/globalTemplateData';

// =================================================================
// ICON HELPER — render Lucide icons by name string (same pattern as IndustrySelector)
// =================================================================

const getLucideIcon = (iconName: string | null | undefined, size = 18, color?: string): React.ReactNode => {
  if (!iconName) {
    return <Circle size={size} style={color ? { color } : undefined} />;
  }
  const IconComponent = (LucideIcons as any)[iconName] || Circle;
  return <IconComponent size={size} style={color ? { color } : undefined} />;
};

// =================================================================
// HELPERS
// =================================================================

/** Maps a CatTemplate (from API) to the Template shape expected by TemplateCard. */
function mapCatTemplateToTemplate(cat: CatTemplate): Template {
  return {
    id: cat.id,
    name: cat.name,
    description: cat.description || '',
    industry: cat.industry_tags?.[0] || 'other',
    industryTags: cat.industry_tags || [],
    contractType: 'service',
    estimatedDuration: '15-20 min',
    complexity: 'medium',
    tags: cat.tags || cat.industry_tags || [],
    blocks: (cat.blocks || []).map((b) => b.block_id),
    usageCount: 0,
    rating: 0,
    isPopular: false,
    status: cat.is_active !== false ? 'active' : 'archived',
    isActive: cat.is_active !== false,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
    globalTemplate: cat.is_system,
    tenantId: cat.tenant_id || 'admin',
    version: cat.version?.toString() || '1',
  };
}

type ViewType = 'grid' | 'list';
type SortOption = 'popular' | 'name' | 'recent';
type StatusFilter = 'active' | 'inactive';

// =================================================================
// STAT CARD COMPONENT
// =================================================================

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  detail: string;
  dotColor: string;
  accentColor: string;
  colors: any;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, detail, dotColor, accentColor, colors }) => (
  <div
    className="relative overflow-hidden rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderColor: colors.utility.secondaryText + '15',
    }}
  >
    {/* Decorative circle */}
    <div
      className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-[0.04]"
      style={{ backgroundColor: accentColor }}
    />
    {/* Icon badge */}
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-sm"
      style={{
        backgroundColor: accentColor + '15',
        color: accentColor,
      }}
    >
      {icon}
    </div>
    {/* Value */}
    <div
      className="text-3xl font-black tracking-tight leading-none mb-1 font-mono"
      style={{ color: colors.utility.primaryText }}
    >
      {value}
    </div>
    {/* Label */}
    <div
      className="text-sm font-medium"
      style={{ color: colors.utility.secondaryText }}
    >
      {label}
    </div>
    {/* Detail */}
    <div
      className="text-xs mt-2 pt-2 border-t flex items-center gap-2"
      style={{
        color: colors.utility.secondaryText + 'aa',
        borderColor: colors.utility.secondaryText + '15',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      {detail}
    </div>
  </div>
);

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

const TemplateGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;
  const [showHelp, setShowHelp] = useState(false);

  // Sidebar selections
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNomenclature, setSelectedNomenclature] = useState<string>('all');

  // Settings modal
  const [settingsTemplate, setSettingsTemplate] = useState<Template | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Hooks ──────────────────────────────────────────────────────
  const { selectedTemplate, selectTemplate, clearSelection } = useTemplateSelection();

  // Build filters for API
  const systemFilters: CatTemplateFilters = useMemo(() => {
    const f: CatTemplateFilters = { page: currentPage, limit: PAGE_SIZE };
    if (searchTerm.trim()) f.search = searchTerm.trim();
    if (selectedIndustry !== 'all') f.industry = selectedIndustry;
    if (selectedCategory !== 'all') f.category = selectedCategory;
    f.is_active = statusFilter === 'active';
    return f;
  }, [searchTerm, selectedIndustry, selectedCategory, statusFilter, currentPage]);

  const {
    data: systemData,
    isLoading: loading,
    error: systemError,
  } = useCatSystemTemplates(systemFilters);

  const {
    data: coverage,
    isLoading: coverageLoading,
  } = useTemplateCoverage();

  // Resource types from DB (replaces hardcoded RESOURCE_TYPES)
  const {
    data: dbResourceTypes,
    isLoading: resourceTypesLoading,
  } = useResourceTypes();

  // Nomenclature types from DB (AMC, CMC, FMC, SLA, etc.)
  const {
    data: nomenclatureGroups,
    isLoading: nomenclatureLoading,
  } = useNomenclatureTypes();

  // ── Derived data ───────────────────────────────────────────────
  const rawTemplates: CatTemplate[] = systemData?.data?.templates || [];
  const paginationMeta = (systemData as any)?.data?.pagination ?? null;
  const serverTotal = systemData?.data?.total ?? paginationMeta?.total ?? rawTemplates.length;
  const totalPages = Math.max(1, Math.ceil(serverTotal / PAGE_SIZE));

  const templates: Template[] = useMemo(() => {
    let mapped = rawTemplates.map(mapCatTemplateToTemplate);

    // Client-side resource type filter (match against template tags)
    if (selectedResourceType !== 'all') {
      const rtName = (dbResourceTypes || []).find(r => r.id === selectedResourceType)?.name?.toLowerCase();
      if (rtName) {
        mapped = mapped.filter(t =>
          t.tags?.some(tag => tag.toLowerCase().includes(rtName)) ||
          t.industryTags?.some(tag => tag.toLowerCase().includes(rtName))
        );
      }
    }

    // Client-side nomenclature filter (match against template tags)
    if (selectedNomenclature !== 'all') {
      const nomItem = (nomenclatureGroups || []).flatMap(g => g.items).find(n => n.id === selectedNomenclature);
      if (nomItem) {
        const nomTerms = [
          nomItem.sub_cat_name?.toLowerCase(),
          nomItem.form_settings?.short_name?.toLowerCase(),
          nomItem.display_name?.toLowerCase(),
        ].filter(Boolean) as string[];
        mapped = mapped.filter(t =>
          t.tags?.some(tag => nomTerms.some(term => tag.toLowerCase().includes(term))) ||
          t.industryTags?.some(tag => nomTerms.some(term => tag.toLowerCase().includes(term)))
        );
      }
    }

    // Sort
    const sorted = [...mapped];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default:
        break;
    }
    return sorted;
  }, [rawTemplates, sortBy, selectedResourceType, selectedNomenclature, dbResourceTypes, nomenclatureGroups]);

  const error = systemError ? (systemError as Error).message : null;
  const totalTemplates = serverTotal;
  const displayedCount = templates.length;
  const isEmpty = !loading && templates.length === 0;

  const stats = coverage?.summary ?? null;
  const industries: IndustryCoverage[] = coverage?.industries || [];

  // Flat list of all nomenclature items across groups (for horizontal pills)
  const allNomenclatureItems = useMemo(() => {
    if (!nomenclatureGroups) return [];
    return nomenclatureGroups.flatMap((group) =>
      group.items.map((item) => ({ ...item, groupLabel: group.label }))
    );
  }, [nomenclatureGroups]);

  // Categories for selected industry (mock data until API)
  const currentCategories = useMemo(
    () => selectedIndustry !== 'all' ? getCategoriesForIndustry(selectedIndustry) : [],
    [selectedIndustry]
  );

  // Template card context — management mode (admin can edit global templates)
  const templateCardContext: TemplateCardContext = useMemo(() => ({
    mode: 'management',
    isGlobal: true,
    userRole: 'admin',
    canEdit: true,
    canCopy: true,
    canCreateContract: true,
  }), []);

  // ── Handlers ───────────────────────────────────────────────────
  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustry(industryId);
    setSelectedCategory('all');
    setSelectedResourceType('all');
    setSelectedNomenclature('all');
    setCurrentPage(1);
  };

  const handleTemplateSelect = (template: Template) => {
    selectTemplate(template);
    toast({
      title: 'Template Selected',
      description: `${template.name} is ready for contract creation.`,
    });
    navigate(`/contracts?action=create&template=${template.id}`);
  };

  const handleTemplatePreview = (template: Template) => {
    navigate(`/templates/preview?id=${template.id}`);
  };

  const handleTemplateEdit = (template: Template) => {
    navigate(`/service-contracts/templates/admin/global-designer?templateId=${template.id}`);
  };

  // Settings modal
  const updateTemplateMutation = useUpdateCatTemplate();
  const handleTemplateSettings = (template: Template) => {
    setSettingsTemplate(template);
    setSettingsOpen(true);
  };

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    await updateTemplateMutation.mutateAsync({
      id: templateId,
      data: { is_active: isActive },
    });
    setSettingsOpen(false);
    setSettingsTemplate(null);
  };

  // ── Styles ─────────────────────────────────────────────────────
  const sidebarBg = colors.utility.secondaryBackground;
  const borderColor = colors.utility.secondaryText + '15';
  const activeBg = colors.brand.primary + '12';
  const activeColor = colors.brand.primary;

  const getInputStyles = (): React.CSSProperties => ({
    borderColor: colors.utility.secondaryText + '30',
    backgroundColor: colors.utility.primaryBackground,
    color: colors.utility.primaryText,
  });

  // ── Loading state (VaNi) ──────────────────────────────────────

  // =================================================================
  // RENDER
  // =================================================================
  return (
    <div
      className="min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* ═══════════ HEADER ═══════════ */}
      <div
        className="border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor,
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-3"
                style={{ color: colors.utility.primaryText }}
              >
                <Globe className="h-7 w-7" style={{ color: colors.brand.primary }} />
                Global Contract Templates
                <button
                  onClick={() => setShowHelp(true)}
                  className="p-1 rounded-full hover:opacity-80"
                  style={{ backgroundColor: colors.utility.secondaryText + '10' }}
                >
                  <HelpCircle className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                </button>
              </h1>
              <p className="mt-1 text-sm" style={{ color: colors.utility.secondaryText }}>
                Choose from {stats?.totalTemplates || 0} professionally designed global templates
              </p>
              <div
                className="mt-2 flex items-center gap-2 text-xs px-3 py-1 rounded-full w-fit"
                style={{ color: colors.brand.primary, backgroundColor: colors.brand.primary + '10' }}
              >
                <Building2 className="h-3.5 w-3.5" />
                Platform Templates - Available to all tenants
              </div>
            </div>

            {/* Create Template + Selected template */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/service-contracts/templates/admin/global-designer')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                }}
              >
                <Plus className="h-4 w-4" />
                Create Template
              </button>
            </div>

            {/* Selected template banner */}
            {selectedTemplate && (
              <div
                className="p-3 border rounded-lg flex items-center justify-between"
                style={{
                  backgroundColor: colors.brand.primary + '10',
                  borderColor: colors.brand.primary + '20',
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: colors.brand.primary }} />
                  <span className="text-sm font-medium" style={{ color: colors.brand.primary }}>
                    Selected: {selectedTemplate.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/contracts?action=create&template=${selectedTemplate.id}`)}
                    className="text-sm flex items-center gap-1 hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    Continue <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={clearSelection}
                    className="p-1 rounded hover:opacity-80"
                    style={{ backgroundColor: colors.brand.primary + '20' }}
                  >
                    <X className="h-3 w-3" style={{ color: colors.brand.primary }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ STATS ROW ═══════════ */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {coverageLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border p-5"
                style={{ backgroundColor: sidebarBg, borderColor }}
              >
                <div className="w-9 h-9 rounded-lg mb-3" style={{ backgroundColor: borderColor }} />
                <div className="h-8 rounded w-1/2 mb-1" style={{ backgroundColor: borderColor }} />
                <div className="h-4 rounded w-3/4" style={{ backgroundColor: borderColor }} />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              icon={<Building2 className="h-4 w-4" />}
              value={stats.totalIndustries}
              label="Industries"
              detail={`${stats.coveredIndustries} with resources`}
              dotColor={colors.brand.primary}
              accentColor={colors.brand.primary}
              colors={colors}
            />
            <StatCard
              icon={<Package className="h-4 w-4" />}
              value={stats.totalResources ?? industries.length}
              label="Resource Templates"
              detail={`Across ${stats.coveredIndustries} industries`}
              dotColor="#3B82F6"
              accentColor="#3B82F6"
              colors={colors}
            />
            <StatCard
              icon={<FileText className="h-4 w-4" />}
              value={stats.publishedTemplates ?? stats.publicTemplates ?? 0}
              label="Published Templates"
              detail={`${stats.totalTemplates} total (${(stats.totalTemplates - (stats.publishedTemplates ?? stats.publicTemplates ?? 0))} drafts)`}
              dotColor="#10B981"
              accentColor="#10B981"
              colors={colors}
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              value={stats.totalGaps ?? stats.uncoveredIndustries}
              label="Template Gaps"
              detail={`${stats.uncoveredIndustries} industries fully uncovered`}
              dotColor="#EF4444"
              accentColor="#EF4444"
              colors={colors}
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4" />}
              value={`${stats.avgCoverage ?? stats.coveragePercent}%`}
              label="Avg Coverage"
              detail={`${stats.totalSmartForms ?? 0} SmartForms created`}
              dotColor="#F59E0B"
              accentColor="#F59E0B"
              colors={colors}
            />
          </div>
        ) : null}

        {/* ═══════════ MAIN LAYOUT: SIDEBAR + CONTENT ═══════════ */}
        <div className="flex gap-6">
          {/* ─── LEFT SIDEBAR ─── */}
          <div
            className="w-64 flex-shrink-0 rounded-xl border overflow-hidden"
            style={{ backgroundColor: sidebarBg, borderColor }}
          >
            {/* Industries Section */}
            <div className="p-3">
              <div
                className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Industries
              </div>

              {/* All Industries */}
              <button
                onClick={() => handleIndustrySelect('all')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all mb-0.5"
                style={{
                  backgroundColor: selectedIndustry === 'all' ? activeBg : 'transparent',
                  color: selectedIndustry === 'all' ? activeColor : colors.utility.primaryText,
                  borderLeft: selectedIndustry === 'all' ? `3px solid ${activeColor}` : '3px solid transparent',
                }}
              >
                <Globe size={18} />
                <span className="font-medium flex-1">All</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                  style={{
                    backgroundColor: colors.utility.secondaryText + '10',
                    color: colors.utility.secondaryText,
                  }}
                >
                  {totalTemplates}
                </span>
              </button>

              {/* Industry List */}
              <div className="max-h-[380px] overflow-y-auto space-y-0.5 pr-1">
                {coverageLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-2">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: borderColor }} />
                      <div className="h-3 rounded flex-1" style={{ backgroundColor: borderColor }} />
                    </div>
                  ))
                ) : (
                  industries.map((industry) => {
                    const isActive = selectedIndustry === industry.id;
                    return (
                      <button
                        key={industry.id}
                        onClick={() => handleIndustrySelect(industry.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all group"
                        style={{
                          backgroundColor: isActive ? activeBg : 'transparent',
                          color: isActive ? activeColor : colors.utility.primaryText,
                          borderLeft: isActive ? `3px solid ${activeColor}` : '3px solid transparent',
                          opacity: industry.hasCoverage ? 1 : 0.6,
                        }}
                      >
                        <span className="flex-shrink-0">{getLucideIcon(industry.icon, 18, isActive ? activeColor : colors.utility.secondaryText)}</span>
                        <span className="font-medium flex-1 truncate">{industry.name}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                          style={{
                            backgroundColor: isActive ? activeColor + '15' : colors.utility.secondaryText + '10',
                            color: isActive ? activeColor : colors.utility.secondaryText,
                          }}
                        >
                          {industry.templateCount}
                        </span>
                        <ChevronRight
                          className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity"
                          style={{ color: colors.utility.secondaryText }}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t mx-3" style={{ borderColor }} />

            {/* Categories (when industry selected) */}
            {selectedIndustry !== 'all' && currentCategories.length > 0 && (
              <div className="p-3">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Categories
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-0.5 pr-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-all"
                    style={{
                      backgroundColor: selectedCategory === 'all' ? activeBg : 'transparent',
                      color: selectedCategory === 'all' ? activeColor : colors.utility.secondaryText,
                    }}
                  >
                    All Categories
                  </button>
                  {currentCategories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-all truncate"
                        style={{
                          backgroundColor: isActive ? activeBg : 'transparent',
                          color: isActive ? activeColor : colors.utility.secondaryText,
                        }}
                      >
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t mx-3" style={{ borderColor }} />

            {/* Resource Types (from DB) */}
            <div className="p-3">
              <div
                className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Resource Types
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedResourceType('all')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-all"
                  style={{
                    backgroundColor: selectedResourceType === 'all' ? activeBg : 'transparent',
                    color: selectedResourceType === 'all' ? activeColor : colors.utility.secondaryText,
                  }}
                >
                  <Package size={14} />
                  All Types
                </button>
                {resourceTypesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-2 px-3 py-1.5">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: borderColor }} />
                      <div className="h-3 rounded flex-1" style={{ backgroundColor: borderColor }} />
                    </div>
                  ))
                ) : (
                  (dbResourceTypes || []).filter(rt => rt.is_active).map((rt) => {
                    const isActive = selectedResourceType === rt.id;
                    return (
                      <button
                        key={rt.id}
                        onClick={() => setSelectedResourceType(rt.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-all"
                        style={{
                          backgroundColor: isActive ? activeBg : 'transparent',
                          color: isActive ? activeColor : colors.utility.secondaryText,
                        }}
                      >
                        {getLucideIcon(null, 14, isActive ? activeColor : colors.utility.secondaryText)}
                        <span className="truncate">{rt.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t mx-3" style={{ borderColor }} />

            {/* AI Agent Button */}
            <div className="p-3">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary + 'cc'})`,
                  color: '#fff',
                }}
                onClick={() => {
                  toast({
                    title: 'AI Agent',
                    description: `Generating templates for ${selectedIndustry === 'all' ? 'all industries' : industries.find(i => i.id === selectedIndustry)?.name || selectedIndustry}...`,
                  });
                }}
              >
                <Bot className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <div>AI Agent</div>
                  <div className="text-[10px] opacity-75 font-normal">Generate Templates</div>
                </div>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">New</span>
              </button>
            </div>
          </div>

          {/* ─── MAIN CONTENT ─── */}
          <div className="flex-1 min-w-0">
            {/* Search + Controls Bar */}
            <div
              className="border rounded-xl p-4 mb-5"
              style={{ backgroundColor: sidebarBg, borderColor }}
            >
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    type="text"
                    placeholder="Search templates by name, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm"
                    style={getInputStyles()}
                  />
                  {loading && searchTerm && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
                      style={{ color: colors.utility.secondaryText }}
                    />
                  )}
                </div>

                {/* Sort + View Toggle + Count */}
                <div className="flex items-center gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={getInputStyles()}
                  >
                    <option value="popular">Most Popular</option>
                    <option value="name">Name A-Z</option>
                    <option value="recent">Recently Updated</option>
                  </select>

                  {/* Active / Inactive switch */}
                  <button
                    onClick={() => { setStatusFilter(statusFilter === 'active' ? 'inactive' : 'active'); setCurrentPage(1); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all"
                    style={{
                      borderColor: colors.utility.secondaryText + '30',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                    }}
                  >
                    {/* Track */}
                    <div
                      className="relative w-8 h-[18px] rounded-full transition-colors"
                      style={{
                        backgroundColor: statusFilter === 'active' ? '#10B981' : '#EF4444',
                      }}
                    >
                      {/* Thumb */}
                      <div
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all"
                        style={{
                          left: statusFilter === 'active' ? 'calc(100% - 16px)' : '2px',
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium" style={{ color: statusFilter === 'active' ? '#10B981' : '#EF4444' }}>
                      {statusFilter === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </button>

                  <div
                    className="flex rounded-lg p-0.5"
                    style={{ backgroundColor: colors.utility.secondaryText + '10' }}
                  >
                    <button
                      onClick={() => setViewType('grid')}
                      className="p-1.5 rounded-md transition-colors"
                      style={{
                        backgroundColor: viewType === 'grid' ? colors.utility.primaryBackground : 'transparent',
                        color: viewType === 'grid' ? colors.utility.primaryText : colors.utility.secondaryText,
                      }}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewType('list')}
                      className="p-1.5 rounded-md transition-colors"
                      style={{
                        backgroundColor: viewType === 'list' ? colors.utility.primaryBackground : 'transparent',
                        color: viewType === 'list' ? colors.utility.primaryText : colors.utility.secondaryText,
                      }}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="text-sm whitespace-nowrap" style={{ color: colors.utility.secondaryText }}>
                    {displayedCount}{displayedCount !== totalTemplates ? ` / ${totalTemplates}` : ''} results
                  </span>
                </div>
              </div>

              {/* Nomenclature Filter Pills */}
              {(nomenclatureLoading || allNomenclatureItems.length > 0) && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider mr-1 flex-shrink-0"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Nomenclature:
                    </span>
                    {nomenclatureLoading ? (
                      [...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse h-6 rounded-full"
                          style={{ width: 48 + Math.random() * 24, backgroundColor: borderColor }}
                        />
                      ))
                    ) : (
                      <>
                        {/* All pill */}
                        <button
                          onClick={() => setSelectedNomenclature('all')}
                          className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                          style={{
                            backgroundColor: selectedNomenclature === 'all'
                              ? colors.brand.primary + '15'
                              : 'transparent',
                            color: selectedNomenclature === 'all'
                              ? colors.brand.primary
                              : colors.utility.secondaryText,
                            borderColor: selectedNomenclature === 'all'
                              ? colors.brand.primary + '30'
                              : colors.utility.secondaryText + '20',
                          }}
                        >
                          All
                        </button>
                        {/* Group labels + items */}
                        {(nomenclatureGroups || []).map((group, gIdx) => (
                          <React.Fragment key={group.group}>
                            {/* Group separator (subtle pipe) */}
                            {gIdx > 0 && (
                              <span
                                className="text-xs mx-0.5 select-none"
                                style={{ color: colors.utility.secondaryText + '30' }}
                              >
                                |
                              </span>
                            )}
                            {/* Group label */}
                            <span
                              className="text-[9px] uppercase tracking-wider font-medium mr-0.5 flex-shrink-0"
                              style={{ color: colors.utility.secondaryText + '80' }}
                            >
                              {group.label.replace(/\s*(Maintenance|Property|Delivery|Hybrid)\s*/i, '').trim() || group.label}:
                            </span>
                            {/* Items in this group */}
                            {group.items.map((item) => {
                              const isActive = selectedNomenclature === item.id;
                              const pillColor = item.hexcolor || colors.brand.primary;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => setSelectedNomenclature(isActive ? 'all' : item.id)}
                                  title={`${item.form_settings?.full_name || item.display_name}${item.form_settings?.typical_duration ? ' - ' + item.form_settings.typical_duration : ''}`}
                                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5"
                                  style={{
                                    backgroundColor: isActive ? pillColor + '18' : 'transparent',
                                    color: isActive ? pillColor : colors.utility.secondaryText,
                                    borderColor: isActive ? pillColor + '40' : colors.utility.secondaryText + '20',
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: pillColor }}
                                  />
                                  {item.form_settings?.short_name || item.display_name}
                                </button>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Active filters display */}
              {(selectedIndustry !== 'all' || selectedResourceType !== 'all' || selectedCategory !== 'all' || selectedNomenclature !== 'all' || statusFilter === 'inactive') && (
                <div
                  className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t"
                  style={{ borderColor }}
                >
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Active filters:
                  </span>
                  {statusFilter === 'inactive' && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                      style={{
                        backgroundColor: '#EF444415',
                        color: '#EF4444',
                        borderColor: '#EF444430',
                      }}
                    >
                      <EyeOff className="h-3 w-3" />
                      Inactive
                      <button onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedIndustry !== 'all' && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                      style={{
                        backgroundColor: activeColor + '10',
                        color: activeColor,
                        borderColor: activeColor + '20',
                      }}
                    >
                      {getLucideIcon(industries.find(i => i.id === selectedIndustry)?.icon, 12, activeColor)}{' '}
                      {industries.find(i => i.id === selectedIndustry)?.name}
                      <button onClick={() => handleIndustrySelect('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedNomenclature !== 'all' && (() => {
                    const nomItem = (nomenclatureGroups || []).flatMap(g => g.items).find(n => n.id === selectedNomenclature);
                    return (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                        style={{
                          backgroundColor: (nomItem?.hexcolor || activeColor) + '15',
                          color: nomItem?.hexcolor || activeColor,
                          borderColor: (nomItem?.hexcolor || activeColor) + '30',
                        }}
                      >
                        {nomItem?.form_settings?.short_name || nomItem?.display_name}
                        <button onClick={() => setSelectedNomenclature('all')}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })()}
                  {selectedCategory !== 'all' && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                      style={{
                        backgroundColor: activeColor + '10',
                        color: activeColor,
                        borderColor: activeColor + '20',
                      }}
                    >
                      {currentCategories.find(c => c.id === selectedCategory)?.name}
                      <button onClick={() => setSelectedCategory('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedResourceType !== 'all' && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                      style={{
                        backgroundColor: activeColor + '10',
                        color: activeColor,
                        borderColor: activeColor + '20',
                      }}
                    >
                      {(dbResourceTypes || []).find(r => r.id === selectedResourceType)?.name}
                      <button onClick={() => setSelectedResourceType('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      handleIndustrySelect('all');
                      setSelectedResourceType('all');
                      setSelectedNomenclature('all');
                      setStatusFilter('active');
                      setCurrentPage(1);
                    }}
                    className="text-xs hover:opacity-80"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Error State */}
            {error && (
              <div
                className="mb-5 p-4 rounded-lg border"
                style={{
                  backgroundColor: colors.semantic.error + '10',
                  borderColor: colors.semantic.error + '20',
                }}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: colors.semantic.error }} />
                  <div>
                    <h3 className="font-medium" style={{ color: colors.semantic.error }}>
                      Error loading templates
                    </h3>
                    <p className="text-sm mt-1" style={{ color: colors.semantic.error + 'cc' }}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <UnifiedLoader.VaNi
                size="md"
                message="Loading templates..."
                showSkeleton
                skeletonVariant="card"
                skeletonCount={6}
              />
            )}

            {/* Template Grid / List */}
            {!loading && !error && (
              <>
                {isEmpty ? (
                  <div
                    className="flex flex-col items-center justify-center py-20 px-6 rounded-xl border"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: colors.utility.secondaryText + '12',
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: colors.brand.primary + '10' }}
                    >
                      {searchTerm ? (
                        <Search className="h-10 w-10" style={{ color: colors.brand.primary + '60' }} />
                      ) : statusFilter === 'inactive' ? (
                        <EyeOff className="h-10 w-10" style={{ color: colors.utility.secondaryText + '60' }} />
                      ) : (
                        <Globe className="h-10 w-10" style={{ color: colors.brand.primary + '60' }} />
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {searchTerm
                        ? 'No matching templates'
                        : selectedIndustry !== 'all'
                        ? `No templates for ${industries.find(i => i.id === selectedIndustry)?.name || 'this industry'}`
                        : statusFilter === 'inactive'
                        ? 'No inactive templates'
                        : 'No templates yet'
                      }
                    </h3>

                    {/* Description */}
                    <p
                      className="text-sm text-center max-w-md mb-6"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {searchTerm
                        ? `No templates match "${searchTerm}". Try different keywords or clear your search.`
                        : selectedIndustry !== 'all'
                        ? `There are no ${statusFilter === 'inactive' ? 'inactive ' : ''}templates available for this industry yet. You can create one using the designer.`
                        : statusFilter === 'inactive'
                        ? 'All templates are currently active. Deactivated templates will appear here.'
                        : 'Get started by creating your first global template using the designer.'
                      }
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {(selectedIndustry !== 'all' || searchTerm || statusFilter === 'inactive') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            handleIndustrySelect('all');
                            setStatusFilter('active');
                            setCurrentPage(1);
                          }}
                          className="px-4 py-2 text-sm font-medium rounded-lg border transition-all hover:opacity-80"
                          style={{
                            borderColor: colors.utility.secondaryText + '30',
                            color: colors.utility.primaryText,
                            backgroundColor: colors.utility.primaryBackground,
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/service-contracts/templates/admin/global-designer')}
                        className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                        style={{
                          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create Template
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={
                      viewType === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                        : 'space-y-3'
                    }
                  >
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleTemplateSelect}
                        onPreview={handleTemplatePreview}
                        onEdit={handleTemplateEdit}
                        onSettings={handleTemplateSettings}
                        isSelected={selectedTemplate?.id === template.id}
                        compact={viewType === 'list'}
                        context={templateCardContext}
                      />
                    ))}
                  </div>
                )}

                {/* ─── PAGINATION ─── */}
                {!isEmpty && totalPages > 1 && (
                  <div
                    className="mt-6 flex items-center justify-between border rounded-xl px-4 py-3"
                    style={{ backgroundColor: sidebarBg, borderColor }}
                  >
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Page {currentPage} of {totalPages} ({totalTemplates} templates)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                        style={{
                          borderColor,
                          color: colors.utility.primaryText,
                          backgroundColor: colors.utility.primaryBackground,
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </button>
                      {/* Page number pills — show up to 5 pages around current */}
                      {(() => {
                        const pages: number[] = [];
                        const start = Math.max(1, currentPage - 2);
                        const end = Math.min(totalPages, start + 4);
                        for (let i = start; i <= end; i++) pages.push(i);
                        return pages.map(p => (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                            style={{
                              backgroundColor: p === currentPage ? colors.brand.primary : 'transparent',
                              color: p === currentPage ? '#fff' : colors.utility.secondaryText,
                            }}
                          >
                            {p}
                          </button>
                        ));
                      })()}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                        style={{
                          borderColor,
                          color: colors.utility.primaryText,
                          backgroundColor: colors.utility.primaryBackground,
                        }}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ HELP MODAL ═══════════ */}
      {showHelp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowHelp(false)}
          />
          <div
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden relative"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            <div className="p-6 border-b" style={{ borderColor }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
                  Global Template Selection Help
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 rounded-md hover:opacity-80"
                  style={{ backgroundColor: colors.utility.secondaryText + '10', color: colors.utility.secondaryText }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {[
                { title: 'Global Templates', icon: '🌍', text: 'Professionally designed templates created by the platform team, available to all tenants. They provide industry-standard contract structures.' },
                { title: 'Using Templates', icon: '📋', text: 'Select a template to start contract creation. The template will be copied to your workspace where you can customize it.' },
                { title: 'Industry Filters', icon: '🏢', text: 'Use the left sidebar to filter templates by industry, category, or resource type. Click an industry to see its templates.' },
                { title: 'AI Agent', icon: '🤖', text: 'Use the AI Agent to automatically generate templates for industries with gaps in coverage.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-lg" style={{ backgroundColor: colors.utility.secondaryText + '08' }}>
                  <h3 className="font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                    {item.icon} {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SETTINGS MODAL ═══════════ */}
      <TemplateSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        template={settingsTemplate}
        onToggleActive={handleToggleActive}
        isUpdating={updateTemplateMutation.isPending}
      />
    </div>
  );
};

export default TemplateGalleryPage;

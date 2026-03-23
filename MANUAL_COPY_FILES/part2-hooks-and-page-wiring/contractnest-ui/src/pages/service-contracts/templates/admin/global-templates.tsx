// src/pages/service-contracts/templates/admin/global-templates.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Star, 
  TrendingUp, 
  Users, 
  Clock,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  FileText,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Globe,
  Building2
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';

// Import our components and hooks
import TemplateCard from '@/components/service-contracts/templates/TemplateCard';
import { useTemplateSelection } from '../../../../hooks/service-contracts/templates/useTemplates.ts';
import { Template, TemplateCardContext } from '../../../../types/service-contracts/template.ts';
import {
  TEMPLATE_COMPLEXITY_LABELS,
  CONTRACT_TYPE_LABELS,
} from '../../../../utils/service-contracts/templates.ts';

// Real data hooks (TanStack Query)
import { useCatSystemTemplates, CatTemplate } from '@/hooks/queries/useCatTemplates';
import { CatTemplateFilters } from '@/services/serviceURLs';
import { useTemplateCoverage, IndustryCoverage } from '@/hooks/queries/useTemplateCoverage';

/**
 * Maps a CatTemplate (from API) to the Template shape expected by TemplateCard.
 * Fills in sensible defaults for fields the API doesn't provide yet.
 */
function mapCatTemplateToTemplate(cat: CatTemplate): Template {
  return {
    id: cat.id,
    name: cat.name,
    description: cat.description || '',
    industry: cat.industry_tags?.[0] || 'other',
    contractType: 'service',
    estimatedDuration: '15-20 min',
    complexity: 'medium',
    tags: cat.tags || cat.industry_tags || [],
    blocks: (cat.blocks || []).map((b) => b.block_id),
    usageCount: 0,
    rating: 0,
    isPopular: false,
    status: cat.is_active !== false ? 'active' : 'archived',
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
    globalTemplate: cat.is_system,
    tenantId: cat.tenant_id || 'admin',
  };
}

type ViewType = 'grid' | 'list';
type SortOption = 'popular' | 'rating' | 'usage' | 'name' | 'recent';

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ 
  isOpen, 
  onClose, 
  filters, 
  onFiltersChange 
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [localFilters, setLocalFilters] = useState(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      industry: '',
      contractType: '',
      complexity: '',
      isPopular: false,
      tags: []
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onClose();
  };

  const getInputStyles = () => ({
    borderColor: colors.utility.secondaryText + '40',
    backgroundColor: colors.utility.primaryBackground,
    color: colors.utility.primaryText
  });

  return (
    <div 
      className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg border z-20 transition-colors"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.secondaryText + '20'
      }}
    >
      <div 
        className="p-4 border-b transition-colors"
        style={{ borderColor: colors.utility.secondaryText + '20' }}
      >
        <div className="flex items-center justify-between">
          <h3 
            className="font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Filter Templates
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.utility.secondaryText + '10' }}
          >
            <X 
              className="h-4 w-4"
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Industry Filter */}
        <div>
          <label 
            className="text-sm font-medium mb-2 block transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Industry
          </label>
          <select
            value={localFilters.industry}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, industry: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
            style={{
              ...getInputStyles(),
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map(industry => (
              <option key={industry.id} value={industry.id}>
                {industry.icon} {industry.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contract Type Filter */}
        <div>
          <label 
            className="text-sm font-medium mb-2 block transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Contract Type
          </label>
          <select
            value={localFilters.contractType}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, contractType: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
            style={{
              ...getInputStyles(),
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
          >
            <option value="">All Types</option>
            <option value="service">Service Contract</option>
            <option value="partnership">Partnership Agreement</option>
          </select>
        </div>

        {/* Complexity Filter */}
        <div>
          <label 
            className="text-sm font-medium mb-2 block transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Complexity
          </label>
          <select
            value={localFilters.complexity}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, complexity: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
            style={{
              ...getInputStyles(),
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
          >
            <option value="">All Levels</option>
            <option value="simple">Simple</option>
            <option value="medium">Medium</option>
            <option value="complex">Complex</option>
          </select>
        </div>

        {/* Popular Filter */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localFilters.isPopular}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, isPopular: e.target.checked }))}
              className="accent-primary"
              style={{ accentColor: colors.brand.primary }}
            />
            <span 
              className="text-sm flex items-center gap-1 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              <TrendingUp className="h-4 w-4" />
              Popular Templates Only
            </span>
          </label>
        </div>
      </div>

      <div 
        className="p-4 border-t flex gap-2 transition-colors"
        style={{ borderColor: colors.utility.secondaryText + '20' }}
      >
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-2 border rounded-md transition-colors text-sm hover:opacity-80"
          style={{
            borderColor: colors.utility.secondaryText + '40',
            backgroundColor: 'transparent',
            color: colors.utility.primaryText
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.utility.secondaryText + '10';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-2 rounded-md transition-colors text-sm text-white hover:opacity-90"
          style={{
            background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

const TemplateGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();

  // Local state
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(searchParams.get('industry') || '');

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    industry: searchParams.get('industry') || '',
    contractType: searchParams.get('type') || '',
    complexity: '',
    isPopular: false,
    tags: [] as string[]
  });

  // Template selection hook
  const { selectedTemplate, selectTemplate, clearSelection } = useTemplateSelection();

  // ── Real data hooks (TanStack Query) ──────────────────────────────
  // Build filters for the system templates hook
  const systemFilters: CatTemplateFilters = useMemo(() => {
    const f: CatTemplateFilters = {
      page: 1,
      limit: 50,
    };
    if (searchTerm.trim()) f.search = searchTerm.trim();
    if (advancedFilters.industry) f.industry = advancedFilters.industry;
    if (advancedFilters.contractType) f.category = advancedFilters.contractType;
    return f;
  }, [searchTerm, advancedFilters]);

  // Fetch system templates from real API
  const {
    data: systemData,
    isLoading: loading,
    error: systemError,
  } = useCatSystemTemplates(systemFilters);

  // Fetch coverage stats (industries + summary)
  const {
    data: coverage,
    isLoading: coverageLoading,
  } = useTemplateCoverage();

  // ── Derived state ─────────────────────────────────────────────────
  const rawTemplates: CatTemplate[] = systemData?.data?.templates || [];

  // Client-side sort (API doesn't support all sort modes yet)
  const templates: Template[] = useMemo(() => {
    const mapped = rawTemplates.map(mapCatTemplateToTemplate);
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
  }, [rawTemplates, sortBy]);

  const error = systemError ? (systemError as Error).message : null;
  const totalTemplates = systemData?.data?.total ?? templates.length;
  const isEmpty = !loading && templates.length === 0;
  const isSearching = !!searchTerm.trim();
  const hasActiveFilters = !!(advancedFilters.industry || advancedFilters.contractType || advancedFilters.complexity);

  // Coverage-based stats (replaces mock stats object)
  const stats = coverage?.summary ?? null;

  // Industries from coverage endpoint (replaces hardcoded INDUSTRIES)
  const industries: IndustryCoverage[] = coverage?.industries || [];

  // Popular templates — first 6 from the result set for now
  const popularTemplates = useMemo(() => templates.slice(0, 6), [templates]);

  // NEW: Template card context for marketplace mode
  const templateCardContext: TemplateCardContext = useMemo(() => ({
    mode: 'marketplace',
    isGlobal: true,
    userRole: 'user', // Could be dynamic based on auth context
    canEdit: false,
    canCopy: true,
    canCreateContract: true
  }), []);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (advancedFilters.industry) params.set('industry', advancedFilters.industry);
    if (advancedFilters.contractType) params.set('type', advancedFilters.contractType);
    setSearchParams(params);
  }, [searchTerm, advancedFilters, setSearchParams]);

  // Handle template selection for contract creation
  const handleTemplateSelect = (template: Template) => {
    selectTemplate(template);
    toast({
      title: "Template Selected",
      description: `${template.name} is ready for contract creation.`
    });
    
    // Navigate to next step in contract creation
    navigate(`/contracts?action=create&template=${template.id}`);
  };

  // Handle template preview
  const handleTemplatePreview = (template: Template) => {
    navigate(`/templates/preview?id=${template.id}`);
  };

  // Handle industry selection
  const handleIndustrySelect = (industryId: string) => {
    setAdvancedFilters(prev => ({ ...prev, industry: industryId }));
    setSelectedIndustry(industryId);
  };

  // Handle search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setAdvancedFilters({
      industry: '',
      contractType: '',
      complexity: '',
      isPopular: false,
      tags: []
    });
    setSelectedIndustry('');
  };

  // Common input styles
  const getInputStyles = () => ({
    borderColor: colors.utility.secondaryText + '40',
    backgroundColor: colors.utility.primaryBackground,
    color: colors.utility.primaryText,
    '--tw-ring-color': colors.brand.primary
  } as React.CSSProperties);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div 
            className="rounded-lg border p-6 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.secondaryText + '20'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div className="flex-1">
                <div 
                  className="h-4 rounded mb-2"
                  style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                ></div>
                <div 
                  className="h-3 rounded w-2/3"
                  style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div 
                className="h-3 rounded"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div 
                className="h-3 rounded w-3/4"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            </div>
            <div className="flex gap-2 mb-4">
              <div 
                className="h-6 rounded-full w-16"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div 
                className="h-6 rounded-full w-20"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            </div>
            <div 
              className="h-10 rounded"
              style={{ backgroundColor: colors.utility.secondaryText + '20' }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div 
      className="min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div 
        className="border-b transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '20'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 
                className="text-3xl font-bold flex items-center gap-3 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                <Globe 
                  className="h-8 w-8"
                  style={{ color: colors.brand.primary }}
                />
                Global Contract Templates
                <button
                  onClick={() => setShowHelp(true)}
                  className="p-1 rounded-full transition-colors hover:opacity-80"
                  style={{ backgroundColor: colors.utility.secondaryText + '10' }}
                  title="Help & tutorials"
                >
                  <HelpCircle 
                    className="h-5 w-5"
                    style={{ color: colors.utility.secondaryText }}
                  />
                </button>
              </h1>
              <p 
                className="mt-2 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Choose from {stats?.totalTemplates || 0} professionally designed global templates to start your contract creation
              </p>
              <div 
                className="mt-2 flex items-center gap-2 text-sm px-3 py-1 rounded-full w-fit transition-colors"
                style={{
                  color: colors.brand.primary,
                  backgroundColor: colors.brand.primary + '10'
                }}
              >
                <Building2 className="h-4 w-4" />
                Platform Templates • Available to all tenants
              </div>
              {selectedTemplate && (
                <div 
                  className="mt-3 p-3 border rounded-lg flex items-center justify-between transition-colors"
                  style={{
                    backgroundColor: colors.brand.primary + '10',
                    borderColor: colors.brand.primary + '20'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles 
                      className="h-4 w-4"
                      style={{ color: colors.brand.primary }}
                    />
                    <span 
                      className="text-sm font-medium"
                      style={{ color: colors.brand.primary }}
                    >
                      Selected: {selectedTemplate.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/contracts?action=create&template=${selectedTemplate.id}`)}
                      className="text-sm flex items-center gap-1 transition-colors hover:opacity-80"
                      style={{ color: colors.brand.primary }}
                    >
                      Continue <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={clearSelection}
                      className="p-1 rounded transition-colors hover:opacity-80"
                      style={{ backgroundColor: colors.brand.primary + '20' }}
                    >
                      <X 
                        className="h-3 w-3"
                        style={{ color: colors.brand.primary }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced stats display for global templates */}
            {stats && (
              <div
                className="flex items-center gap-6 text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{stats.totalTemplates} global templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{stats.coveredIndustries}/{stats.totalIndustries} industries covered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star
                    className="h-4 w-4"
                    style={{
                      fill: colors.semantic.warning,
                      color: colors.semantic.warning
                    }}
                  />
                  <span>{stats.coveragePercent}% coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{stats.totalCategories} categories</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Industry Quick Filters */}
        {!hasActiveFilters && !isSearching && industries.length > 0 && (
          <div className="mb-8">
            <h2
              className="text-lg font-semibold mb-4 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Browse by Industry
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {industries.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => handleIndustrySelect(industry.id)}
                  className="p-4 rounded-lg border text-center transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedIndustry === industry.id
                      ? colors.brand.primary
                      : colors.utility.secondaryText + '20',
                    backgroundColor: selectedIndustry === industry.id
                      ? colors.brand.primary + '05'
                      : colors.utility.secondaryBackground,
                    color: selectedIndustry === industry.id
                      ? colors.brand.primary
                      : colors.utility.primaryText,
                    opacity: industry.hasCoverage ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedIndustry !== industry.id) {
                      e.currentTarget.style.borderColor = colors.brand.primary + '30';
                      e.currentTarget.style.backgroundColor = colors.utility.secondaryText + '05';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIndustry !== industry.id) {
                      e.currentTarget.style.borderColor = colors.utility.secondaryText + '20';
                      e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                    }
                  }}
                >
                  <div className="text-2xl mb-2">{industry.icon || '📋'}</div>
                  <div className="text-sm font-medium">{industry.name}</div>
                  <div
                    className="text-xs mt-1 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {industry.templateCount} {industry.templateCount === 1 ? 'template' : 'templates'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state: No industries loaded yet (coverage loading) */}
        {!hasActiveFilters && !isSearching && coverageLoading && (
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse p-4 rounded-lg border" style={{
                  borderColor: colors.utility.secondaryText + '20',
                  backgroundColor: colors.utility.secondaryBackground,
                }}>
                  <div className="h-8 w-8 mx-auto rounded mb-2" style={{ backgroundColor: colors.utility.secondaryText + '20' }} />
                  <div className="h-3 rounded mx-auto w-2/3 mb-1" style={{ backgroundColor: colors.utility.secondaryText + '20' }} />
                  <div className="h-2 rounded mx-auto w-1/2" style={{ backgroundColor: colors.utility.secondaryText + '20' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Templates Section */}
        {!hasActiveFilters && !isSearching && popularTemplates.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-lg font-semibold flex items-center gap-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                <TrendingUp 
                  className="h-5 w-5"
                  style={{ color: colors.semantic.warning }}
                />
                Most Popular Global Templates
              </h2>
              <button
                onClick={() => setAdvancedFilters(prev => ({ ...prev, isPopular: true }))}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: colors.brand.primary }}
              >
                View all popular →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {popularTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleTemplateSelect}
                  onPreview={handleTemplatePreview}
                  isSelected={selectedTemplate?.id === template.id}
                  context={templateCardContext}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div 
          className="border rounded-lg p-4 mb-6 transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20'
          }}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                type="text"
                placeholder="Search global templates by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
              />
              {loading && searchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 
                    className="h-4 w-4 animate-spin"
                    style={{ color: colors.utility.secondaryText }}
                  />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="usage">Most Used</option>
                <option value="name">Name A-Z</option>
                <option value="recent">Recently Updated</option>
              </select>

              {/* View Toggle */}
              <div 
                className="flex rounded-lg p-0.5 transition-colors"
                style={{ backgroundColor: colors.utility.secondaryText + '10' }}
              >
                <button 
                  onClick={() => setViewType('grid')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{
                    backgroundColor: viewType === 'grid' 
                      ? colors.utility.primaryBackground 
                      : 'transparent',
                    color: viewType === 'grid' 
                      ? colors.utility.primaryText 
                      : colors.utility.secondaryText
                  }}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewType('list')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{
                    backgroundColor: viewType === 'list' 
                      ? colors.utility.primaryBackground 
                      : 'transparent',
                    color: viewType === 'list' 
                      ? colors.utility.primaryText 
                      : colors.utility.secondaryText
                  }}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              {/* Filter Button with Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 border rounded-lg transition-colors hover:opacity-80"
                  style={{
                    borderColor: hasActiveFilters 
                      ? colors.brand.primary 
                      : colors.utility.secondaryText + '20',
                    backgroundColor: hasActiveFilters 
                      ? colors.brand.primary + '10' 
                      : 'transparent',
                    color: colors.utility.primaryText
                  }}
                  title="More filters"
                >
                  <Filter className="h-4 w-4" />
                </button>
                
                <FilterDropdown
                  isOpen={showFilters}
                  onClose={() => setShowFilters(false)}
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                />
              </div>
              
              <span 
                className="text-sm whitespace-nowrap transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {totalTemplates} results
              </span>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div 
              className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t transition-colors"
              style={{ borderColor: colors.utility.secondaryText + '20' }}
            >
              <span 
                className="text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Active filters:
              </span>
              {advancedFilters.industry && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
                  style={{
                    backgroundColor: colors.brand.primary + '10',
                    color: colors.brand.primary,
                    borderColor: colors.brand.primary + '20'
                  }}
                >
                  {industries.find(i => i.id === advancedFilters.industry)?.name}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, industry: '' }))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {advancedFilters.contractType && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
                  style={{
                    backgroundColor: colors.brand.primary + '10',
                    color: colors.brand.primary,
                    borderColor: colors.brand.primary + '20'
                  }}
                >
                  {CONTRACT_TYPE_LABELS[advancedFilters.contractType as keyof typeof CONTRACT_TYPE_LABELS]}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, contractType: '' }))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {advancedFilters.complexity && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
                  style={{
                    backgroundColor: colors.brand.primary + '10',
                    color: colors.brand.primary,
                    borderColor: colors.brand.primary + '20'
                  }}
                >
                  {TEMPLATE_COMPLEXITY_LABELS[advancedFilters.complexity as keyof typeof TEMPLATE_COMPLEXITY_LABELS]}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, complexity: '' }))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: colors.utility.secondaryText }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.utility.primaryText;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.utility.secondaryText;
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div 
            className="mb-6 p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: colors.semantic.error + '10',
              borderColor: colors.semantic.error + '20'
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle 
                className="h-5 w-5 flex-shrink-0"
                style={{ color: colors.semantic.error }}
              />
              <div>
                <h3 
                  className="font-medium"
                  style={{ color: colors.semantic.error }}
                >
                  Error loading templates
                </h3>
                <p 
                  className="text-sm mt-1"
                  style={{ color: colors.semantic.error + 'cc' }}
                >
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSkeleton />}

        {/* Templates Grid */}
        {!loading && !error && (
          <>
            {isEmpty ? (
              <div className="text-center py-12">
                <Globe 
                  className="h-16 w-16 mx-auto mb-4"
                  style={{ color: colors.utility.secondaryText }}
                />
                <h3 
                  className="text-lg font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  No global templates found
                </h3>
                <p 
                  className="mb-4 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {isSearching 
                    ? "No global templates match your search criteria. Try adjusting your search terms or filters."
                    : "No global templates are currently available."
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className={`
                ${viewType === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                  : 'space-y-4'
                }
              `}>
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleTemplateSelect}
                    onPreview={handleTemplatePreview}
                    isSelected={selectedTemplate?.id === template.id}
                    compact={viewType === 'list'}
                    context={templateCardContext}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div 
            className="fixed inset-0 backdrop-blur-sm transition-opacity"
            style={{
              backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'
            }}
            onClick={() => setShowHelp(false)}
          />
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden relative transition-colors"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            <div 
              className="p-6 border-b transition-colors"
              style={{ borderColor: colors.utility.secondaryText + '20' }}
            >
              <div className="flex items-center justify-between">
                <h2 
                  className="text-xl font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Global Template Selection Help
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 rounded-md transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: colors.utility.secondaryText + '10',
                    color: colors.utility.secondaryText
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div 
                className="p-4 rounded-lg transition-colors"
                style={{ backgroundColor: colors.utility.secondaryText + '10' }}
              >
                <h3 
                  className="font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  🌍 Global Templates
                </h3>
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  These are professionally designed templates created by our platform team and available to all tenants. They provide industry-standard contract structures.
                </p>
              </div>
              <div 
                className="p-4 rounded-lg transition-colors"
                style={{ backgroundColor: colors.utility.secondaryText + '10' }}
              >
                <h3 
                  className="font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  📋 Using Templates
                </h3>
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Select a template to start contract creation. The template will be copied to your workspace where you can customize it for your specific needs.
                </p>
              </div>
              <div 
                className="p-4 rounded-lg transition-colors"
                style={{ backgroundColor: colors.utility.secondaryText + '10' }}
              >
                <h3 
                  className="font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  ⭐ Template Ratings
                </h3>
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Higher ratings indicate templates that have been successfully used across multiple tenants and received positive feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGalleryPage;
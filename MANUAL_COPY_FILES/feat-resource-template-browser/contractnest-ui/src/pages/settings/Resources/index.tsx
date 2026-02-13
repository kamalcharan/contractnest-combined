// src/pages/settings/Resources/index.tsx
// Resources Template Browser — Browse & add equipment/entity templates from served industries

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Wrench,
  Building2,
  Plus,
  Check,
  Info,
  ChevronRight,
  Loader2,
  Star,
  Mail,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// Hooks
import useResourceTemplatesBrowser from '@/hooks/queries/useResourceTemplates';
import type { ResourceTemplateFilters } from '@/hooks/queries/useResourceTemplates';

// Services
import { useCreateAsset } from '@/hooks/queries/useAssetRegistry';
import type { ResourceTemplate } from '@/services/resourcesService';

// ════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════

const ITEMS_PER_PAGE = 25;

const RESOURCE_TYPE_TABS = [
  { id: '', label: 'All', icon: null },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
  { id: 'asset', label: 'Entities', icon: Building2 },
] as const;

const INDUSTRY_LABELS: Record<string, string> = {
  healthcare: 'Healthcare',
  facility_management: 'Facility Management',
  manufacturing: 'Manufacturing',
  automotive: 'Automotive',
  technology: 'Technology',
  wellness: 'Wellness & Fitness',
  education: 'Education',
  hospitality: 'Hospitality',
  retail: 'Retail',
  logistics: 'Logistics',
  construction: 'Construction',
  energy: 'Energy',
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── State ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [offset, setOffset] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setOffset(0); // reset pagination on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset offset when tab changes
  useEffect(() => {
    setOffset(0);
  }, [activeTab]);

  // Build filters
  const filters: ResourceTemplateFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    limit: ITEMS_PER_PAGE,
    offset,
    resource_type_id: activeTab || undefined,
  }), [debouncedSearch, offset, activeTab]);

  // Fetch templates
  const {
    templates,
    pagination,
    servedIndustries,
    noIndustriesMessage,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  } = useResourceTemplatesBrowser(filters);

  // Create asset mutation (for adding to registry)
  const createAsset = useCreateAsset();

  // Track page view
  useEffect(() => {
    try {
      analyticsService.trackPageView('settings/resources', 'Resources Template Browser');
    } catch (e) { /* ignore */ }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    navigate('/settings/configure');
  }, [navigate]);

  const handleAddToRegistry = useCallback(async (template: ResourceTemplate) => {
    try {
      await createAsset.mutateAsync({
        name: template.name,
        resource_type_id: template.resource_type_id,
        description: template.description || undefined,
        status: 'active',
        condition: 'good',
        criticality: 'medium',
        specifications: template.default_attributes || {},
        tags: [],
      });

      // Invalidate template cache so the "already_added" flag refreshes
      invalidate();
    } catch (err: any) {
      // Toast already handled by useCreateAsset hook
      captureException(err, {
        tags: { component: 'ResourcesPage', action: 'addToRegistry' },
        extra: { templateId: template.id, templateName: template.name },
      });
    }
  }, [createAsset, invalidate]);

  const handleLoadMore = useCallback(() => {
    setOffset((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  const handleLoadPrev = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - ITEMS_PER_PAGE));
  }, []);

  // ── Render ─────────────────────────────────────────────────────

  // Group templates by industry for display
  const templatesByIndustry = useMemo(() => {
    const groups: Record<string, ResourceTemplate[]> = {};
    for (const t of templates) {
      const key = t.industry_id || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [templates]);

  // Full-page loading state
  if (isLoading && templates.length === 0 && offset === 0) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <VaNiLoader size="md" message="LOADING RESOURCE CATALOG" />
      </div>
    );
  }

  return (
    <div
      className="p-6 min-h-screen transition-colors duration-200"
      style={{
        background: `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGoBack}
          className="mr-4"
          style={{
            borderColor: colors.utility.secondaryText + '40',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
          }}
        >
          <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
            Resources
          </h1>
          <p style={{ color: colors.utility.secondaryText }}>
            Browse and add equipment &amp; entities to your registry
          </p>
        </div>
      </div>

      {/* ── Info Banner ─────────────────────────────────────────── */}
      <div
        className="rounded-lg border px-4 py-3 mb-6 flex items-start gap-3"
        style={{
          backgroundColor: colors.brand.primary + '08',
          borderColor: colors.brand.primary + '25',
        }}
      >
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.brand.primary }} />
        <div className="text-sm" style={{ color: colors.utility.primaryText }}>
          <span className="font-semibold">These resources are based on your Served Industries</span>
          {servedIndustries.length > 0 && (
            <span style={{ color: colors.utility.secondaryText }}>
              {' '}&mdash; {servedIndustries.map((id) => INDUSTRY_LABELS[id] || id).join(', ')}
            </span>
          )}
          <div className="mt-1 flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
            <Mail className="h-3.5 w-3.5" />
            Don't see what you need? Contact{' '}
            <a
              href="mailto:support@vikuna.io"
              className="font-semibold underline"
              style={{ color: colors.brand.primary }}
            >
              support@vikuna.io
            </a>
          </div>
        </div>
      </div>

      {/* ── No served industries ────────────────────────────────── */}
      {servedIndustries.length === 0 && !isLoading && (
        <div
          className="rounded-lg border p-8 text-center"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '15',
          }}
        >
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            No Served Industries Configured
          </h3>
          <p className="mb-4" style={{ color: colors.utility.secondaryText }}>
            {noIndustriesMessage || 'Add your served industries in Settings > Business Profile to see resource templates.'}
          </p>
          <Button
            onClick={() => navigate('/settings/configure/business-profile')}
            className="transition-colors hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              color: '#FFFFFF',
            }}
          >
            Go to Business Profile
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ── Tabs + Search ───────────────────────────────────────── */}
      {servedIndustries.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.utility.primaryText + '08' }}>
              {RESOURCE_TYPE_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? colors.brand.primary : 'transparent',
                      color: isActive ? '#FFFFFF' : colors.utility.secondaryText,
                    }}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates..."
                className="pl-10"
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                }}
              />
            </div>
          </div>

          {/* ── Pagination Info ────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {pagination.total > 0 ? (
                <>
                  Showing {offset + 1}&ndash;{Math.min(offset + ITEMS_PER_PAGE, pagination.total)} of{' '}
                  <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                    {pagination.total}
                  </span>{' '}
                  templates
                </>
              ) : isLoading ? (
                'Loading...'
              ) : (
                'No templates found'
              )}
            </p>
            {isLoading && templates.length > 0 && (
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.brand.primary }} />
            )}
          </div>

          {/* ── Error State ────────────────────────────────────────── */}
          {isError && (
            <div
              className="rounded-lg border p-6 text-center mb-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.semantic.error + '40',
              }}
            >
              <p className="font-semibold mb-2" style={{ color: colors.semantic.error }}>
                Failed to load templates
              </p>
              <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
                {(error as Error)?.message || 'An error occurred.'}
              </p>
              <Button
                onClick={() => refetch()}
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                  color: '#FFFFFF',
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* ── Template Cards Grid ────────────────────────────────── */}
          {!isError && templates.length > 0 && (
            <div className="space-y-8">
              {Object.entries(templatesByIndustry).map(([industryId, industryTemplates]) => (
                <div key={industryId}>
                  {/* Industry group header */}
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colors.brand.primary }}
                    />
                    {INDUSTRY_LABELS[industryId] || industryId}
                    <span className="font-normal">({industryTemplates.length})</span>
                  </h3>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {industryTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onAdd={handleAddToRegistry}
                        isAdding={createAsset.isPending}
                        colors={colors}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty search state ─────────────────────────────────── */}
          {!isError && !isLoading && templates.length === 0 && debouncedSearch && (
            <div
              className="rounded-lg border p-8 text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '15',
              }}
            >
              <Search className="h-10 w-10 mx-auto mb-3 opacity-25" style={{ color: colors.utility.secondaryText }} />
              <h3 className="text-base font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                No templates match "{debouncedSearch}"
              </h3>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Try a different search term or{' '}
                <a href="mailto:support@vikuna.io" className="underline" style={{ color: colors.brand.primary }}>
                  contact support
                </a>{' '}
                to request new templates.
              </p>
            </div>
          )}

          {/* ── Pagination Controls ────────────────────────────────── */}
          {pagination.total > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadPrev}
                disabled={offset === 0 || isLoading}
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  color: colors.utility.primaryText,
                  backgroundColor: colors.utility.secondaryBackground,
                }}
              >
                Previous
              </Button>
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Page {Math.floor(offset / ITEMS_PER_PAGE) + 1} of {Math.ceil(pagination.total / ITEMS_PER_PAGE)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={!pagination.has_more || isLoading}
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  color: colors.utility.primaryText,
                  backgroundColor: colors.utility.secondaryBackground,
                }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// TEMPLATE CARD — Same visual style as EquipmentCard
// ════════════════════════════════════════════════════════════════════

interface TemplateCardProps {
  template: ResourceTemplate;
  onAdd: (template: ResourceTemplate) => void;
  isAdding: boolean;
  colors: any;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onAdd, isAdding, colors }) => {
  const isEquipment = template.resource_type_id === 'equipment';
  const emoji = isEquipment ? '🔧' : '🏢';
  const typeLabel = isEquipment ? 'Equipment' : 'Entity';
  const typeColor = isEquipment ? '#3b82f6' : '#8b5cf6';

  const makeExamples = template.make_examples || [];
  const lifespan = template.typical_lifespan_years;

  return (
    <div
      className="rounded-lg border transition-all duration-200 hover:shadow-lg group"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: template.already_added
          ? '#10b981' + '40'
          : colors.utility.primaryText + '15',
        opacity: template.already_added ? 0.75 : 1,
      }}
    >
      <div className="p-5">
        {/* Top Row: Icon + Type Badge */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: typeColor + '15' }}
          >
            {emoji}
          </div>
          <div className="flex items-center gap-1.5">
            {template.is_recommended && (
              <Star className="h-3.5 w-3.5" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
            )}
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: typeColor + '15', color: typeColor }}
            >
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3
          className="text-sm font-bold mb-0.5 truncate"
          style={{ color: colors.utility.primaryText }}
        >
          {template.name}
        </h3>

        {/* Description */}
        <p
          className="text-xs mb-3 line-clamp-2"
          style={{ color: colors.utility.secondaryText, minHeight: '2rem' }}
        >
          {template.description || 'No description available'}
        </p>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {makeExamples.length > 0 && (
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: colors.utility.secondaryText }}
              >
                Makes
              </div>
              <div
                className="text-xs font-medium truncate"
                style={{ color: colors.utility.primaryText }}
              >
                {makeExamples.slice(0, 2).join(', ')}
              </div>
            </div>
          )}
          {lifespan && (
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: colors.utility.secondaryText }}
              >
                Lifespan
              </div>
              <div
                className="text-xs font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                ~{lifespan} years
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div
          className="pt-3 mt-auto"
          style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}
        >
          {template.already_added ? (
            <div
              className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md"
              style={{
                backgroundColor: '#10b981' + '12',
                color: '#10b981',
              }}
            >
              <Check className="h-3.5 w-3.5" />
              Added to Registry
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdd(template)}
              disabled={isAdding}
              className="w-full text-xs font-semibold transition-all hover:opacity-90"
              style={{
                borderColor: colors.brand.primary + '40',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
              }}
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              Add to Registry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;

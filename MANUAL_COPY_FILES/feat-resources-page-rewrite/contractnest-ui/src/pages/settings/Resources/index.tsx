// src/pages/settings/Resources/index.tsx
// Resources Configuration — Select equipment & entity types the tenant services
// Data flows from m_catalog_resource_templates → saved into t_category_resources_master

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Wrench, Building2, Plus, Check, Info,
  ChevronRight, Loader2, Star, Mail, X, Trash2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Existing hooks for saved resources (these work - proven by console logs)
import { useResourcesManager } from '@/hooks/useResources';

// ════════════════════════════════════════════════════════════════════
// TYPES (inline — no external dependency)
// ════════════════════════════════════════════════════════════════════

interface ResourceTemplate {
  id: string;
  industry_id: string;
  resource_type_id: string;
  name: string;
  description: string | null;
  default_attributes: Record<string, any> | null;
  pricing_guidance: Record<string, any> | null;
  popularity_score: number;
  is_recommended: boolean;
  sort_order: number;
  already_added: boolean;
  make_examples: string[];
  maintenance_schedule: string | null;
  typical_lifespan_years: number | null;
}

interface TemplatesApiResponse {
  success: boolean;
  data: ResourceTemplate[];
  pagination: { total: number; limit: number; offset: number; has_more: boolean };
  served_industries: string[];
  message?: string;
}

// ════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 50;

const TABS = [
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

  // ── Local state ────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [offset, setOffset] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Templates state (direct fetch — no TanStack) ──────────────
  const [templates, setTemplates] = useState<ResourceTemplate[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE, offset: 0, has_more: false });
  const [servedIndustries, setServedIndustries] = useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // ── Saved resources (existing hook — works fine) ──────────────
  const {
    resources: savedResources,
    isLoading: resourcesLoading,
    createResourceAsync,
    deleteResourceAsync,
    refetchResources,
  } = useResourcesManager();

  // ── Debounce search ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchInput); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset offset on tab change
  useEffect(() => { setOffset(0); }, [activeTab]);

  // ── Fetch templates directly via api.get ──────────────────────
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!currentTenant?.id) return;

    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        // Build URL with query params
        const params = new URLSearchParams();
        params.append('limit', String(PAGE_SIZE));
        params.append('offset', String(offset));
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (activeTab) params.append('resource_type_id', activeTab);

        const url = `/api/resources/resource-templates?${params.toString()}`;
        console.log('[ResourcesPage] Fetching templates:', url);

        const response = await api.get(url);
        const body = response?.data?.data ? response.data : response?.data;

        console.log('[ResourcesPage] Templates response:', body);

        if (isMounted.current) {
          setTemplates(body?.data || []);
          setPagination(body?.pagination || { total: 0, limit: PAGE_SIZE, offset: 0, has_more: false });
          setServedIndustries(body?.served_industries || []);
        }
      } catch (err: any) {
        console.error('[ResourcesPage] Templates fetch error:', err);
        if (isMounted.current) {
          setTemplatesError(err?.response?.data?.error || err?.message || 'Failed to load templates');
          vaniToast.error('Error Loading Templates', {
            message: err?.response?.data?.error || err?.message || 'Failed to load templates',
            duration: 4000,
          });
        }
      } finally {
        if (isMounted.current) setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [currentTenant?.id, debouncedSearch, activeTab, offset]);

  const isLoading = templatesLoading || resourcesLoading;

  // ── Lookup: template name+type → saved resource id ────────────
  const savedLookup = useMemo(() => {
    const m = new Map<string, string>();
    if (savedResources) {
      for (const r of savedResources) {
        m.set(`${r.name.toLowerCase()}::${r.resource_type_id}`, r.id);
      }
    }
    return m;
  }, [savedResources]);

  const getSavedId = useCallback(
    (t: ResourceTemplate) => savedLookup.get(`${t.name.toLowerCase()}::${t.resource_type_id}`) || null,
    [savedLookup],
  );

  // ── Counts ────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let eq = 0, en = 0;
    if (savedResources) {
      for (const r of savedResources) {
        if (r.resource_type_id === 'equipment') eq++;
        else if (r.resource_type_id === 'asset') en++;
      }
    }
    return { equipment: eq, entities: en };
  }, [savedResources]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleAdd = useCallback(async (t: ResourceTemplate) => {
    if (addingId) return; // prevent double-click
    setAddingId(t.id);
    try {
      await createResourceAsync({
        resource_type_id: t.resource_type_id,
        name: t.name,
        display_name: t.name,
        description: t.description || undefined,
        form_settings: {
          template_id: t.id,
          industry_id: t.industry_id,
          default_attributes: t.default_attributes,
          pricing_guidance: t.pricing_guidance,
        },
        is_active: true,
        is_deletable: true,
      });
      await refetchResources();
    } catch (err) {
      console.error('[ResourcesPage] Add error:', err);
    } finally {
      setAddingId(null);
    }
  }, [addingId, createResourceAsync, refetchResources]);

  const handleRemove = useCallback(async (t: ResourceTemplate) => {
    const rid = getSavedId(t);
    if (!rid || removingId) return;
    setRemovingId(rid);
    try {
      await deleteResourceAsync(rid);
      await refetchResources();
    } catch (err) {
      console.error('[ResourcesPage] Remove error:', err);
    } finally {
      setRemovingId(null);
    }
  }, [removingId, getSavedId, deleteResourceAsync, refetchResources]);

  // ── Group templates by industry ───────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, ResourceTemplate[]> = {};
    for (const t of templates) {
      const k = t.industry_id || 'other';
      if (!g[k]) g[k] = [];
      g[k].push(t);
    }
    return g;
  }, [templates]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // Full-page loader
  if (isLoading && templates.length === 0 && offset === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]"
        style={{ backgroundColor: colors.utility.primaryBackground }}>
        <VaNiLoader size="md" message="LOADING RESOURCE CATALOG" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen transition-colors duration-200"
      style={{ background: `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})` }}>

      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/settings/configure')}
          className="mr-4 p-2 rounded-md border"
          style={{ borderColor: colors.utility.secondaryText + '40', backgroundColor: colors.utility.secondaryBackground }}>
          <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>Resources</h1>
          <p style={{ color: colors.utility.secondaryText }}>Select the equipment &amp; entities your business services</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border px-4 py-3 mb-6 flex items-start gap-3"
        style={{ backgroundColor: colors.brand.primary + '08', borderColor: colors.brand.primary + '25' }}>
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.brand.primary }} />
        <div className="text-sm" style={{ color: colors.utility.primaryText }}>
          <span className="font-semibold">Based on your Served Industries</span>
          {servedIndustries.length > 0 && (
            <span style={{ color: colors.utility.secondaryText }}>
              {' '}&mdash; {servedIndustries.map(id => INDUSTRY_LABELS[id] || id).join(', ')}
            </span>
          )}
          <div className="mt-1 flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
            <Mail className="h-3.5 w-3.5" />
            Don't see what you need? Contact{' '}
            <a href="mailto:support@vikuna.io" className="font-semibold underline" style={{ color: colors.brand.primary }}>support@vikuna.io</a>
          </div>
        </div>
      </div>

      {/* No served industries */}
      {servedIndustries.length === 0 && !isLoading && (
        <div className="rounded-lg border p-8 text-center"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}>
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>No Served Industries Configured</h3>
          <p className="mb-4" style={{ color: colors.utility.secondaryText }}>
            Add your served industries in Settings &gt; Business Profile to see resource templates.
          </p>
          <button onClick={() => navigate('/settings/business-profile')}
            className="px-4 py-2 rounded-md text-white font-medium"
            style={{ background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})` }}>
            Go to Business Profile <ChevronRight className="h-4 w-4 ml-1 inline" />
          </button>
        </div>
      )}

      {/* Main content */}
      {(servedIndustries.length > 0 || templates.length > 0) && (
        <>
          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.utility.primaryText + '08' }}>
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all"
                    style={{ backgroundColor: active ? colors.brand.primary : 'transparent', color: active ? '#FFF' : colors.utility.secondaryText }}>
                    {Icon && <Icon className="h-4 w-4" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              <Input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search templates..." className="pl-10 pr-9"
                style={{ borderColor: colors.utility.primaryText + '20', backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText }} />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              Selected: <span style={{ color: '#3b82f6' }}>{counts.equipment} equipment</span>, <span style={{ color: '#8b5cf6' }}>{counts.entities} entities</span>
            </p>
            {pagination.total > 0 && (
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {templates.length} of {pagination.total} templates
              </p>
            )}
          </div>

          {/* Error */}
          {templatesError && (
            <div className="rounded-lg border p-6 text-center mb-6"
              style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.semantic.error + '40' }}>
              <p className="font-semibold mb-2" style={{ color: colors.semantic.error }}>Failed to load templates</p>
              <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>{templatesError}</p>
            </div>
          )}

          {/* Template cards */}
          {templates.length > 0 && (
            <div className="space-y-8">
              {Object.entries(grouped).map(([industryId, list]) => (
                <div key={industryId}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                    style={{ color: colors.utility.secondaryText }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
                    {INDUSTRY_LABELS[industryId] || industryId} ({list.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {list.map(t => {
                      const savedId = getSavedId(t);
                      const isSelected = !!savedId;
                      const isEq = t.resource_type_id === 'equipment';
                      const typeColor = isEq ? '#3b82f6' : '#8b5cf6';
                      const busy = addingId === t.id || (removingId !== null && removingId === savedId);

                      return (
                        <div key={t.id} className="rounded-lg border transition-all duration-200 hover:shadow-lg"
                          style={{
                            backgroundColor: colors.utility.secondaryBackground,
                            borderColor: isSelected ? '#10b98140' : colors.utility.primaryText + '15',
                          }}>
                          <div className="p-5">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                style={{ backgroundColor: typeColor + '15' }}>
                                {isEq ? '🔧' : '🏢'}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {t.is_recommended && <Star className="h-3.5 w-3.5" style={{ color: '#f59e0b', fill: '#f59e0b' }} />}
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: typeColor + '15', color: typeColor }}>
                                  {isEq ? 'Equipment' : 'Entity'}
                                </span>
                              </div>
                            </div>

                            {/* Name + desc */}
                            <h3 className="text-sm font-bold mb-0.5 truncate" style={{ color: colors.utility.primaryText }}>{t.name}</h3>
                            <p className="text-xs mb-3 line-clamp-2" style={{ color: colors.utility.secondaryText, minHeight: '2rem' }}>
                              {t.description || 'No description available'}
                            </p>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {t.make_examples?.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>Makes</div>
                                  <div className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>{t.make_examples.slice(0, 2).join(', ')}</div>
                                </div>
                              )}
                              {t.typical_lifespan_years && (
                                <div>
                                  <div className="text-[10px] font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>Lifespan</div>
                                  <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>~{t.typical_lifespan_years} yrs</div>
                                </div>
                              )}
                            </div>

                            {/* Action */}
                            <div className="pt-3" style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}>
                              {isSelected ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md"
                                    style={{ backgroundColor: '#10b98112', color: '#10b981' }}>
                                    <Check className="h-3.5 w-3.5" /> Added
                                  </div>
                                  <button onClick={() => handleRemove(t)}
                                    className="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer hover:opacity-80"
                                    style={{ backgroundColor: colors.semantic.error + '10', color: colors.semantic.error }}>
                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    console.log('[BUTTON CLICKED] Adding:', t.name);
                                    handleAdd(t);
                                  }}
                                  disabled={false}
                                  className="w-full flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 px-3 rounded-md cursor-pointer transition-all hover:shadow-md active:scale-95"
                                  style={{
                                    backgroundColor: colors.brand.primary,
                                    color: '#FFFFFF',
                                    border: 'none',
                                    opacity: 1,
                                    pointerEvents: 'auto',
                                  }}>
                                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                  + Add to Resources
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!templatesLoading && templates.length === 0 && !templatesError && (
            <div className="rounded-lg border p-8 text-center"
              style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}>
              <Search className="h-10 w-10 mx-auto mb-3 opacity-25" style={{ color: colors.utility.secondaryText }} />
              <h3 className="text-base font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                {debouncedSearch ? `No templates match "${debouncedSearch}"` : 'No templates available'}
              </h3>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {debouncedSearch ? 'Try a different search term.' : 'Templates will appear once your served industries have catalog data.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                disabled={offset === 0} className="px-3 py-1.5 text-sm rounded-md border"
                style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText, backgroundColor: colors.utility.secondaryBackground }}>
                Previous
              </button>
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(pagination.total / PAGE_SIZE)}
              </span>
              <button onClick={() => setOffset(o => o + PAGE_SIZE)}
                disabled={!pagination.has_more} className="px-3 py-1.5 text-sm rounded-md border"
                style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText, backgroundColor: colors.utility.secondaryBackground }}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ResourcesPage;

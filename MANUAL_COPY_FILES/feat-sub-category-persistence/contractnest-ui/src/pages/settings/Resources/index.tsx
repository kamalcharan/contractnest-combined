import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Check, Trash2, Search, PackagePlus, X,
  Wrench, Building, Package, ChevronLeft, ChevronRight,
  Eye, EyeOff, ShieldAlert, Info, Headset,
  ChevronDown, ChevronUp,
  // Sub-category icons
  ScanLine, HeartPulse, Activity,
  Hospital, ArrowUpDown, Wind, Flame, Zap, Droplets,
  Shield, Home, Store, Factory, Cpu, Cog,
  Network, Thermometer, Car, Gauge,
  Server, MonitorSpeaker, Dumbbell, Sparkles,
  Waves, type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useResourceTemplatesBrowser, ResourceTemplateFilters } from '@/hooks/queries/useResourceTemplates';
import { useResources, useCreateResource, useDeleteResource } from '@/hooks/queries/useResources';
import { VaNiLoader } from '@/components/common/loaders';
import { vaniToast } from '@/components/common/toast';

// ─── Constants ───────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;
const TABS = ['All', 'Equipment', 'Entities'] as const;
type Tab = typeof TABS[number];
type ViewMode = 'my-resources' | 'browse-catalog';

// ─── Type color config ───────────────────────────────────────
const TYPE_CONFIG: Record<string, { color: string; label: string; icon: typeof Wrench }> = {
  equipment:  { color: '#3B82F6', label: 'Equipment', icon: Wrench },
  consumable: { color: '#F59E0B', label: 'Consumable', icon: Package },
  asset:      { color: '#8B5CF6', label: 'Entity',    icon: Building },
};

const getTypeConfig = (typeId: string) =>
  TYPE_CONFIG[typeId?.toLowerCase()] || { color: '#6B7280', label: typeId, icon: Package };

// ─── Tab filter helpers ──────────────────────────────────────
const isEquipmentType = (t: string) => ['equipment', 'consumable'].includes(t.toLowerCase());
const isEntityType = (t: string) => t.toLowerCase() === 'asset';

const filterByTab = <T extends { resource_type_id: string }>(items: T[], tab: Tab): T[] => {
  if (tab === 'All') return items;
  return items.filter(i => {
    const t = (i.resource_type_id || '').toLowerCase();
    return tab === 'Equipment' ? isEquipmentType(t) : isEntityType(t);
  });
};

const filterBySearch = <T extends { name: string; description?: string | null }>(items: T[], q: string): T[] => {
  if (!q.trim()) return items;
  const lower = q.toLowerCase();
  return items.filter(i => i.name.toLowerCase().includes(lower) || i.description?.toLowerCase().includes(lower));
};

const countByTab = <T extends { resource_type_id: string }>(items: T[]) => ({
  All: items.length,
  Equipment: items.filter(i => isEquipmentType(i.resource_type_id || '')).length,
  Entities: items.filter(i => isEntityType(i.resource_type_id || '')).length,
});

// ─── Industry display helper ─────────────────────────────────
const formatIndustryId = (id: string): string => {
  if (!id) return '';
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// ─── Sub-category icon + color config ────────────────────────
const SUB_CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  // Healthcare — Equipment
  'Diagnostic Imaging':     { icon: ScanLine,     color: '#6366F1' },
  'Life Support':           { icon: HeartPulse,   color: '#EF4444' },
  'Patient Monitoring':     { icon: Activity,     color: '#10B981' },
  // Healthcare — Assets
  'Clinical Facilities':    { icon: Hospital,     color: '#8B5CF6' },
  // Facility Mgmt — Equipment
  'Vertical Transport':     { icon: ArrowUpDown,  color: '#6366F1' },
  'HVAC Systems':           { icon: Wind,         color: '#0EA5E9' },
  'Fire & Safety':          { icon: Flame,        color: '#F97316' },
  'Power & Electrical':     { icon: Zap,          color: '#EAB308' },
  'Water Treatment':        { icon: Droplets,     color: '#06B6D4' },
  'Security & Surveillance':{ icon: Shield,       color: '#64748B' },
  // Facility Mgmt — Assets
  'Residential Properties': { icon: Home,         color: '#10B981' },
  'Commercial Properties':  { icon: Store,        color: '#3B82F6' },
  'Industrial Properties':  { icon: Factory,      color: '#78716C' },
  // Manufacturing
  'CNC & Machining':        { icon: Cog,          color: '#6366F1' },
  'Pneumatics & Hydraulics':{ icon: Gauge,        color: '#0EA5E9' },
  'Moulding & Forming':     { icon: Cpu,          color: '#8B5CF6' },
  'Material Handling':      { icon: Package,      color: '#F59E0B' },
  'Thermal Systems':        { icon: Thermometer,  color: '#EF4444' },
  // Automotive
  'Workshop Equipment':     { icon: Car,          color: '#3B82F6' },
  'Diagnostic Tools':       { icon: Gauge,        color: '#10B981' },
  // Technology
  'Server & Compute':       { icon: Server,       color: '#6366F1' },
  'Networking':             { icon: Network,      color: '#0EA5E9' },
  'Power & Cooling':        { icon: Zap,          color: '#EAB308' },
  'Data Facilities':        { icon: MonitorSpeaker, color: '#8B5CF6' },
  // Wellness
  'Fitness Equipment':      { icon: Dumbbell,     color: '#10B981' },
  'Spa & Relaxation':       { icon: Sparkles,     color: '#EC4899' },
  'Wellness Facilities':    { icon: Waves,        color: '#06B6D4' },
};

const getSubCategoryConfig = (subCat: string | null | undefined) => {
  if (!subCat) return null;
  return SUB_CATEGORY_CONFIG[subCat] || { icon: Package, color: '#6B7280' };
};

// ─── Pagination helper ──────────────────────────────────────
const paginate = <T,>(items: T[], page: number): { paged: T[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  return { paged: items.slice(start, start + ITEMS_PER_PAGE), totalPages };
};

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── UI state ──
  const [view, setView] = useState<ViewMode>('my-resources');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localSaved, setLocalSaved] = useState<Set<string>>(new Set());

  // ── Data hooks ──
  const {
    data: savedResources,
    isLoading: loadingSaved,
    isError: errorSaved,
    error: savedError,
    refetch: refetchSaved,
  } = useResources(showDeleted ? { include_deleted: true } : {});

  // Always fetch active resources for name cross-reference (used in browse catalog)
  const { data: activeResourcesForLookup } = useResources({});

  const templateFilters: ResourceTemplateFilters = { limit: 100 };
  const {
    templates,
    isLoading: loadingTemplates,
    isError: errorTemplates,
    error: templatesError,
    invalidate: invalidateTemplates,
  } = useResourceTemplatesBrowser(templateFilters);

  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  // ── Derived data ──
  const savedList = useMemo(() => (savedResources || []), [savedResources]);
  const activeOnly = useMemo(() => savedList.filter(r => r.is_active !== false), [savedList]);
  const deletedOnly = useMemo(() => savedList.filter(r => r.is_active === false), [savedList]);

  // Set of existing resource names (lowercase) for duplicate detection in browse view
  const savedResourceNames = useMemo(() => {
    const all = activeResourcesForLookup || [];
    return new Set(all.map(r => r.name?.toLowerCase().trim()).filter(Boolean));
  }, [activeResourcesForLookup]);

  const displayedSaved = useMemo(() => {
    const base = showDeleted ? deletedOnly : activeOnly;
    return filterBySearch(filterByTab(base, activeTab), search);
  }, [deletedOnly, activeOnly, showDeleted, activeTab, search]);

  const filteredTemplates = useMemo(
    () => filterBySearch(filterByTab(templates, activeTab), search),
    [templates, activeTab, search],
  );

  const savedCounts = useMemo(() => countByTab(showDeleted ? deletedOnly : activeOnly), [deletedOnly, activeOnly, showDeleted]);
  const templateCounts = useMemo(() => countByTab(templates), [templates]);
  const counts = view === 'my-resources' ? savedCounts : templateCounts;

  const addedCount = useMemo(
    () => templates.filter(t => t.already_added || localSaved.has(t.id)).length,
    [templates, localSaved],
  );

  // ── Grouped templates for browse view ──
  const groupedTemplates = useMemo(() => {
    if (view !== 'browse-catalog') return [];
    const groups: { subCategory: string; items: typeof filteredTemplates }[] = [];
    const map = new Map<string, typeof filteredTemplates>();
    for (const t of filteredTemplates) {
      const key = (t as any).sub_category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const [subCategory, items] of map) {
      groups.push({ subCategory, items });
    }
    return groups;
  }, [view, filteredTemplates]);

  // ── Grouped saved resources for my-resources view ──
  const groupedSavedResources = useMemo(() => {
    if (view !== 'my-resources') return [];
    const groups: { subCategory: string; items: typeof displayedSaved }[] = [];
    const map = new Map<string, typeof displayedSaved>();
    for (const r of displayedSaved) {
      const key = (r as any).sub_category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    for (const [subCategory, items] of map) {
      groups.push({ subCategory, items });
    }
    return groups;
  }, [view, displayedSaved]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  // ── Pagination (my-resources only; browse uses grouped view) ──
  const currentItems = view === 'my-resources' ? displayedSaved : filteredTemplates;
  const { paged, totalPages } = paginate(currentItems, currentPage);
  const startItem = currentItems.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, currentItems.length);

  // ── Handlers ──
  const handleSave = useCallback(async (template: typeof templates[0]) => {
    if (savingId || template.already_added || localSaved.has(template.id)) return;
    setSavingId(template.id);
    try {
      await createResource.mutateAsync({
        data: {
          resource_type_id: template.resource_type_id,
          name: template.name,
          display_name: template.name,
          description: template.description || undefined,
          sub_category: template.sub_category || undefined,
        },
      });
      setLocalSaved(prev => new Set(prev).add(template.id));
      invalidateTemplates();
      refetchSaved();
      vaniToast.success(`"${template.name}" added`, { message: 'Resource added to your catalog', duration: 3000 });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('already exists')) {
        setLocalSaved(prev => new Set(prev).add(template.id));
        invalidateTemplates();
        vaniToast.info(`"${template.name}" already added`, { message: 'This resource is already in your catalog', duration: 3000 });
      } else {
        vaniToast.error('Failed to add resource', { message: 'Please try again', duration: 4000 });
      }
    } finally {
      setSavingId(null);
    }
  }, [savingId, localSaved, createResource, invalidateTemplates, refetchSaved]);

  const handleDelete = useCallback(async (resourceId: string, resourceName: string) => {
    if (deletingId) return;
    setDeletingId(resourceId);
    try {
      await deleteResource.mutateAsync({ id: resourceId });
      setConfirmDeleteId(null);
      invalidateTemplates();
      refetchSaved();
      vaniToast.success(`"${resourceName}" removed`, { message: 'Resource has been deleted', duration: 3000 });
    } catch {
      vaniToast.error('Failed to delete', { message: 'Please try again', duration: 4000 });
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, deleteResource, invalidateTemplates, refetchSaved]);

  const switchView = (newView: ViewMode) => {
    setView(newView);
    setActiveTab('All');
    setSearch('');
    setCurrentPage(1);
    setConfirmDeleteId(null);
  };

  const resetPage = () => setCurrentPage(1);
  const isTemplateAdded = (t: typeof templates[0]) =>
    t.already_added || localSaved.has(t.id) || savedResourceNames.has(t.name?.toLowerCase().trim());
  const isLoading = view === 'my-resources' ? loadingSaved : loadingTemplates;
  const isError = view === 'my-resources' ? errorSaved : errorTemplates;
  const errorMsg = view === 'my-resources' ? savedError?.message : templatesError?.message;

  // ── Glass card style ──
  const glassCard: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 16,
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
  };

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: 24, minHeight: '100vh', background: colors.utility.primaryBackground }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => view === 'browse-catalog' ? switchView('my-resources') : navigate('/settings/configure')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.utility.primaryText, margin: 0 }}>
              {view === 'my-resources' ? 'Resources' : 'Browse & Add Resources'}
            </h1>
            <p style={{ fontSize: 13, color: colors.utility.secondaryText, margin: 0 }}>
              {view === 'my-resources'
                ? `Equipment & entities you service${showDeleted ? ` (showing ${deletedOnly.length} deleted)` : ''}`
                : `${addedCount} of ${templates.length} resources added`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view === 'my-resources' && (
            <>
              <button
                onClick={() => { setShowDeleted(!showDeleted); resetPage(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 20,
                  border: `1px solid ${showDeleted ? (colors.semantic?.error || '#EF4444') + '60' : colors.utility.secondaryText + '30'}`,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  backgroundColor: showDeleted ? (colors.semantic?.error || '#EF4444') + '15' : 'transparent',
                  color: showDeleted ? (colors.semantic?.error || '#EF4444') : colors.utility.secondaryText,
                  transition: 'all 0.15s',
                }}
              >
                {showDeleted ? <EyeOff size={14} /> : <Eye size={14} />}
                {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
              </button>
              <button
                onClick={() => switchView('browse-catalog')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 20,
                  border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  backgroundColor: colors.brand.primary, color: '#FFFFFF',
                  boxShadow: `0 4px 14px ${colors.brand.primary}40`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <PackagePlus size={15} /> Browse & Add
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══ CONTAINER CARD ═══ */}
      <div style={{
        borderRadius: 12, border: `1px solid ${colors.utility.primaryText}20`,
        backgroundColor: colors.utility.secondaryBackground,
        padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>

        {/* ── Filter pills ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            const count = counts[tab] ?? 0;
            const tabColor = tab === 'Equipment' ? '#3B82F6' : tab === 'Entities' ? '#8B5CF6' : colors.brand.primary;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); resetPage(); }}
                style={{
                  padding: '7px 16px', borderRadius: 20,
                  border: `1px solid ${isActive ? tabColor + '60' : colors.utility.primaryText + '15'}`,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  backgroundColor: isActive ? tabColor + '15' : 'transparent',
                  color: isActive ? tabColor : colors.utility.secondaryText,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* ── Search + Results count ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: colors.utility.primaryBackground,
            flex: '1 1 260px', maxWidth: 380,
          }}>
            <Search size={16} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
            <input
              type="text"
              placeholder={view === 'my-resources' ? 'Search resources...' : 'Search catalog...'}
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                color: colors.utility.primaryText, fontSize: 13, flex: 1,
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); resetPage(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText, padding: 0, display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, color: colors.utility.secondaryText, whiteSpace: 'nowrap' }}>
            {view === 'browse-catalog'
              ? filteredTemplates.length > 0 ? `${filteredTemplates.length} resources in ${groupedTemplates.length} categories` : ''
              : displayedSaved.length > 0 ? `${displayedSaved.length} resources in ${groupedSavedResources.length} categories` : ''}
          </span>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      {isLoading ? (
        <VaNiLoader
          size="md"
          message={view === 'my-resources' ? 'Loading your resources...' : 'Loading catalog...'}
          showSkeleton
          skeletonVariant="card"
          skeletonCount={6}
        />
      ) : isError ? (
        <div style={{
          padding: 24, borderRadius: 12,
          backgroundColor: (colors.semantic?.error || '#EF4444') + '10',
          border: `1px solid ${(colors.semantic?.error || '#EF4444')}40`,
          color: colors.semantic?.error || '#EF4444', textAlign: 'center',
        }}>
          <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Error loading resources</p>
          <p style={{ fontSize: 13, margin: 0 }}>{errorMsg || 'Something went wrong'}</p>
        </div>
      ) : currentItems.length === 0 ? (
        /* ═══ EMPTY STATE ═══ */
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          borderRadius: 12, border: `1px solid ${colors.utility.primaryText}10`,
          backgroundColor: colors.utility.secondaryBackground,
        }}>
          {view === 'my-resources' ? (
            <>
              <PackagePlus size={48} style={{ color: colors.utility.secondaryText, marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: colors.utility.primaryText, margin: '0 0 6px' }}>
                {search ? 'No matching resources' : showDeleted ? 'No deleted resources' : 'No resources added yet'}
              </p>
              <p style={{ fontSize: 13, color: colors.utility.secondaryText, margin: '0 0 20px' }}>
                {search ? 'Try a different search term' : showDeleted ? 'None of your resources have been deleted' : 'Browse the catalog to add equipment and entities'}
              </p>
              {!search && !showDeleted && (
                <button
                  onClick={() => switchView('browse-catalog')}
                  style={{
                    padding: '10px 24px', borderRadius: 20, border: 'none',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    backgroundColor: colors.brand.primary, color: '#FFFFFF',
                    boxShadow: `0 4px 14px ${colors.brand.primary}40`,
                  }}
                >
                  Browse & Add Resources
                </button>
              )}
            </>
          ) : (
            <>
              <Search size={48} style={{ color: colors.utility.secondaryText, marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: colors.utility.primaryText, margin: '0 0 6px' }}>No resources found</p>
              <p style={{ fontSize: 13, color: colors.utility.secondaryText, margin: 0 }}>
                {search ? 'Try a different search term' : 'No resources available for your served industries'}
              </p>
            </>
          )}
        </div>
      ) : view === 'browse-catalog' ? (
        /* ═══ GROUPED BROWSE CATALOG ═══ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedTemplates.map(({ subCategory, items }) => {
            const isCollapsed = collapsedGroups.has(subCategory);
            const subCatCfg = getSubCategoryConfig(subCategory === 'Other' ? null : subCategory);
            const SubCatIcon = subCatCfg?.icon || Package;
            const subCatColor = subCatCfg?.color || '#6B7280';
            const addedInGroup = items.filter(t => isTemplateAdded(t)).length;

            return (
              <div key={subCategory}>
                {/* ── Group Header ── */}
                <button
                  onClick={() => toggleGroup(subCategory)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', marginBottom: isCollapsed ? 0 : 12,
                    borderRadius: 10, border: `1px solid ${subCatColor}25`,
                    backgroundColor: subCatColor + '08',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: subCatColor + '18',
                    border: `1px solid ${subCatColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <SubCatIcon size={16} style={{ color: subCatColor }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.utility.primaryText, flex: 1, textAlign: 'left' }}>
                    {subCategory}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: colors.utility.secondaryText,
                    padding: '2px 8px', borderRadius: 10,
                    backgroundColor: colors.utility.primaryText + '08',
                  }}>
                    {addedInGroup}/{items.length} added
                  </span>
                  {isCollapsed ? <ChevronDown size={16} style={{ color: colors.utility.secondaryText }} /> : <ChevronUp size={16} style={{ color: colors.utility.secondaryText }} />}
                </button>

                {/* ── Group Grid ── */}
                {!isCollapsed && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                  }}>
                    {items.map((item: any) => {
                      const typeCfg = getTypeConfig(item.resource_type_id);
                      const TypeIcon = typeCfg.icon;
                      const added = isTemplateAdded(item);
                      const isSaving = savingId === item.id;
                      const itemSubCatCfg = getSubCategoryConfig(item.sub_category);

                      return (
                        <div
                          key={item.id}
                          style={{
                            ...glassCard,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px -5px rgba(0,0,0,0.12)';
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px -5px rgba(0,0,0,0.05)';
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Card Header */}
                          <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 10,
                              backgroundColor: typeCfg.color + '18',
                              border: `1px solid ${typeCfg.color}30`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <TypeIcon size={20} style={{ color: typeCfg.color }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <strong style={{
                                  fontSize: 14, color: colors.utility.primaryText,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  maxWidth: 180,
                                }}>
                                  {item.name}
                                </strong>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '2px 8px', borderRadius: 12,
                                  fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                                  backgroundColor: typeCfg.color + '18',
                                  color: typeCfg.color,
                                  border: `1px solid ${typeCfg.color}30`,
                                }}>
                                  {typeCfg.label}
                                </span>
                              </div>
                              {/* Sub-category badge on card */}
                              {itemSubCatCfg && item.sub_category && (
                                <div style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  marginTop: 4, padding: '1px 7px', borderRadius: 10,
                                  fontSize: 10, fontWeight: 600,
                                  backgroundColor: itemSubCatCfg.color + '10',
                                  color: itemSubCatCfg.color,
                                }}>
                                  {React.createElement(itemSubCatCfg.icon, { size: 10 })}
                                  {item.sub_category}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Body */}
                          <div style={{ padding: '10px 16px', flex: 1 }}>
                            {item.description ? (
                              <p style={{
                                fontSize: 12, color: colors.utility.secondaryText, margin: 0,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                overflow: 'hidden', lineHeight: '1.5',
                              }}>
                                {item.description}
                              </p>
                            ) : (
                              <p style={{ fontSize: 12, color: colors.utility.secondaryText + '60', margin: 0, fontStyle: 'italic' }}>
                                No description
                              </p>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div style={{
                            padding: '12px 16px',
                            borderTop: `1px solid ${colors.utility.primaryText}08`,
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
                          }}>
                            {added ? (
                              <span style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                fontSize: 12, fontWeight: 600,
                                color: colors.semantic?.success || '#16a34a',
                                padding: '5px 14px', borderRadius: 8,
                                backgroundColor: (colors.semantic?.success || '#16a34a') + '12',
                              }}>
                                <Check size={14} /> Added
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSave(item)}
                                disabled={isSaving}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '5px 14px', borderRadius: 8, border: 'none',
                                  fontSize: 12, fontWeight: 600,
                                  cursor: isSaving ? 'not-allowed' : 'pointer',
                                  backgroundColor: colors.brand.primary, color: '#FFFFFF',
                                  opacity: isSaving ? 0.7 : 1, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { if (!isSaving) (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                              >
                                {isSaving ? 'Adding...' : <><Plus size={13} /> Add</>}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══ MY RESOURCES — GROUPED VIEW ═══ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedSavedResources.map(({ subCategory, items }) => {
            const isCollapsed = collapsedGroups.has(subCategory);
            const subCatCfg = getSubCategoryConfig(subCategory === 'Other' ? null : subCategory);
            const SubCatIcon = subCatCfg?.icon || Package;
            const subCatColor = subCatCfg?.color || '#6B7280';

            return (
              <div key={subCategory}>
                {/* ── Group Header ── */}
                <button
                  onClick={() => toggleGroup(subCategory)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', marginBottom: isCollapsed ? 0 : 12,
                    borderRadius: 10, border: `1px solid ${subCatColor}25`,
                    backgroundColor: subCatColor + '08',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: subCatColor + '18',
                    border: `1px solid ${subCatColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <SubCatIcon size={16} style={{ color: subCatColor }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.utility.primaryText, flex: 1, textAlign: 'left' }}>
                    {subCategory}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: colors.utility.secondaryText,
                    padding: '2px 8px', borderRadius: 10,
                    backgroundColor: colors.utility.primaryText + '08',
                  }}>
                    {items.length} {items.length === 1 ? 'resource' : 'resources'}
                  </span>
                  {isCollapsed ? <ChevronDown size={16} style={{ color: colors.utility.secondaryText }} /> : <ChevronUp size={16} style={{ color: colors.utility.secondaryText }} />}
                </button>

                {/* ── Group Grid ── */}
                {!isCollapsed && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                  }}>
                    {items.map((item: any) => {
                      const isDeleted = item.is_active === false;
                      const typeCfg = getTypeConfig(item.resource_type_id);
                      const TypeIcon = typeCfg.icon;
                      const isConfirming = confirmDeleteId === item.id;
                      const isDeleting = deletingId === item.id;

                      return (
                        <div
                          key={item.id}
                          style={{
                            ...glassCard,
                            opacity: isDeleted ? 0.5 : 1,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={e => {
                            if (!isDeleted) {
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px -5px rgba(0,0,0,0.12)';
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px -5px rgba(0,0,0,0.05)';
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Deleted ribbon */}
                          {isDeleted && (
                            <div style={{
                              position: 'absolute', top: 12, right: -28,
                              transform: 'rotate(45deg)',
                              backgroundColor: colors.semantic?.error || '#EF4444',
                              color: '#fff', fontSize: 9, fontWeight: 700,
                              padding: '2px 32px', letterSpacing: 0.5,
                            }}>
                              DELETED
                            </div>
                          )}

                          {/* Card Header */}
                          <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 10,
                              backgroundColor: typeCfg.color + '18',
                              border: `1px solid ${typeCfg.color}30`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <TypeIcon size={20} style={{ color: typeCfg.color }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong style={{
                                  fontSize: 14, color: colors.utility.primaryText,
                                  textDecoration: isDeleted ? 'line-through' : 'none',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  maxWidth: 180,
                                }}>
                                  {item.display_name || item.name}
                                </strong>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '2px 8px', borderRadius: 12,
                                  fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                                  backgroundColor: typeCfg.color + '18',
                                  color: typeCfg.color,
                                  border: `1px solid ${typeCfg.color}30`,
                                }}>
                                  {typeCfg.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div style={{ padding: '10px 16px', flex: 1 }}>
                            {item.description ? (
                              <p style={{
                                fontSize: 12, color: colors.utility.secondaryText, margin: 0,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                overflow: 'hidden', lineHeight: '1.5',
                              }}>
                                {item.description}
                              </p>
                            ) : (
                              <p style={{ fontSize: 12, color: colors.utility.secondaryText + '60', margin: 0, fontStyle: 'italic' }}>
                                No description
                              </p>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div style={{
                            padding: '12px 16px',
                            borderTop: `1px solid ${colors.utility.primaryText}08`,
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
                          }}>
                            {isDeleted ? (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 11, color: colors.utility.secondaryText,
                              }}>
                                <ShieldAlert size={13} />
                                <span>Contact admin to restore</span>
                              </div>
                            ) : isConfirming ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: colors.semantic?.error || '#EF4444', fontWeight: 600 }}>Remove?</span>
                                <button
                                  onClick={() => handleDelete(item.id, item.display_name || item.name)}
                                  disabled={isDeleting}
                                  style={{
                                    padding: '5px 14px', borderRadius: 8, border: 'none',
                                    fontSize: 12, fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer',
                                    backgroundColor: colors.semantic?.error || '#EF4444', color: '#FFF',
                                    opacity: isDeleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 4,
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {isDeleting ? 'Removing...' : 'Yes, Remove'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  style={{
                                    padding: '5px 14px', borderRadius: 8,
                                    border: `1px solid ${colors.utility.primaryText}20`,
                                    backgroundColor: 'transparent', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', color: colors.utility.primaryText,
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(item.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '5px 12px', borderRadius: 8,
                                  border: `1px solid ${colors.utility.primaryText}15`,
                                  backgroundColor: 'transparent',
                                  color: colors.utility.secondaryText,
                                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = (colors.semantic?.error || '#EF4444') + '60'; (e.currentTarget as HTMLElement).style.color = colors.semantic?.error || '#EF4444'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.utility.primaryText + '15'; (e.currentTarget as HTMLElement).style.color = colors.utility.secondaryText; }}
                                title="Remove resource"
                              >
                                <Trash2 size={13} /> Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ CONTACT SUPPORT INFO ═══ */}
      {!isLoading && !isError && view === 'browse-catalog' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 20, padding: '12px 16px', borderRadius: 10,
          backgroundColor: (colors.brand.primary || '#3B82F6') + '08',
          border: `1px solid ${(colors.brand.primary || '#3B82F6')}20`,
        }}>
          <Headset size={16} style={{ color: colors.brand.primary, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: colors.utility.secondaryText, lineHeight: '1.5' }}>
            Don't see what you need? Not all equipment and entities may be listed here.{' '}
            <strong style={{ color: colors.utility.primaryText }}>Contact support</strong> to request additional resources for your catalog.
          </span>
        </div>
      )}

      {/* Pagination removed — my-resources now uses grouped view like browse catalog */}
    </div>
  );
};

export default ResourcesPage;

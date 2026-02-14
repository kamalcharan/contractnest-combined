import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Check, Trash2, Search, PackagePlus, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useResourceTemplatesBrowser } from '@/hooks/queries/useResourceTemplates';
import { useResources, useCreateResource, useDeleteResource } from '@/hooks/queries/useResources';

const TABS = ['All', 'Equipment', 'Entities'];

type ViewMode = 'my-resources' | 'browse-catalog';

// ─── helpers ────────────────────────────────────────────────
const isEquipmentType = (typeId: string) => ['equipment', 'asset', 'consumable'].includes(typeId.toLowerCase());
const isEntityType = (typeId: string) => ['team_staff', 'partner'].includes(typeId.toLowerCase());

const filterByTab = <T extends { resource_type_id: string }>(items: T[], tab: string): T[] => {
  if (tab === 'All') return items;
  return items.filter(item => {
    const t = (item.resource_type_id || '').toLowerCase();
    if (tab === 'Equipment') return isEquipmentType(t);
    if (tab === 'Entities') return isEntityType(t);
    return true;
  });
};

const filterBySearch = <T extends { name: string; description?: string | null }>(items: T[], q: string): T[] => {
  if (!q.trim()) return items;
  const lower = q.toLowerCase();
  return items.filter(i => i.name.toLowerCase().includes(lower) || i.description?.toLowerCase().includes(lower));
};

// ─── tab count helpers ──────────────────────────────────────
const countByTab = <T extends { resource_type_id: string }>(items: T[]) => ({
  All: items.length,
  Equipment: items.filter(i => isEquipmentType((i.resource_type_id || '').toLowerCase())).length,
  Entities: items.filter(i => isEntityType((i.resource_type_id || '').toLowerCase())).length,
});

// ─── main component ────────────────────────────────────────
const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [view, setView] = useState<ViewMode>('my-resources');
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localSaved, setLocalSaved] = useState<Set<string>>(new Set());

  // ── data hooks ──
  const { data: savedResources, isLoading: loadingSaved, isError: errorSaved, error: savedError, refetch: refetchSaved } = useResources();
  const { templates, isLoading: loadingTemplates, isError: errorTemplates, error: templatesError, invalidate: invalidateTemplates } = useResourceTemplatesBrowser({ limit: 100 });
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  // ── derived data ──
  const savedList = useMemo(() => savedResources || [], [savedResources]);
  const savedCounts = useMemo(() => countByTab(savedList), [savedList]);
  const templateCounts = useMemo(() => countByTab(templates), [templates]);

  const filteredSaved = useMemo(
    () => filterBySearch(filterByTab(savedList, activeTab), search),
    [savedList, activeTab, search]
  );

  const filteredTemplates = useMemo(
    () => filterBySearch(filterByTab(templates, activeTab), search),
    [templates, activeTab, search]
  );

  const addedCount = useMemo(
    () => templates.filter(t => t.already_added || localSaved.has(t.id)).length,
    [templates, localSaved]
  );

  // ── handlers ──
  const handleSave = async (template: typeof templates[0]) => {
    if (savingId || template.already_added || localSaved.has(template.id)) return;
    setSavingId(template.id);
    try {
      await createResource.mutateAsync({
        data: {
          resource_type_id: template.resource_type_id,
          name: template.name,
          display_name: template.name,
          description: template.description || undefined,
        },
      });
      setLocalSaved(prev => new Set(prev).add(template.id));
      invalidateTemplates();
      refetchSaved();
    } catch {
      // Toast handled by hook
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (deletingId) return;
    setDeletingId(resourceId);
    try {
      await deleteResource.mutateAsync({ id: resourceId });
      setConfirmDeleteId(null);
      invalidateTemplates();
      refetchSaved();
    } catch {
      // Toast handled by hook
    } finally {
      setDeletingId(null);
    }
  };

  const switchView = (newView: ViewMode) => {
    setView(newView);
    setActiveTab('All');
    setSearch('');
    setConfirmDeleteId(null);
  };

  const isTemplateAdded = (t: typeof templates[0]) => t.already_added || localSaved.has(t.id);

  // ── shared styles ──
  const cardStyle: React.CSSProperties = {
    padding: '14px 16px',
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}12`,
    color: colors.utility.primaryText,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'border-color 0.15s',
  };

  const typeBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: `${colors.brand.primary}18`,
    color: colors.brand.primary,
    marginLeft: 10,
  };

  const searchBoxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${colors.utility.primaryText}20`,
    backgroundColor: colors.utility.secondaryBackground,
    marginBottom: 16,
    width: '100%',
    maxWidth: 360,
  };

  // ── loading / error states ──
  const isLoading = view === 'my-resources' ? loadingSaved : loadingTemplates;
  const isError = view === 'my-resources' ? errorSaved : errorTemplates;
  const errorMsg = view === 'my-resources' ? savedError?.message : templatesError?.message;
  const counts = view === 'my-resources' ? savedCounts : templateCounts;

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: colors.utility.primaryBackground }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => view === 'browse-catalog' ? switchView('my-resources') : navigate('/settings/configure')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              cursor: 'pointer',
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
                ? 'Equipment & entities your business services'
                : `${addedCount} of ${templates.length} templates added`}
            </p>
          </div>
        </div>

        {view === 'my-resources' && (
          <button
            onClick={() => switchView('browse-catalog')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: colors.brand.primary,
              color: '#FFFFFF',
            }}
          >
            <PackagePlus size={15} /> Browse & Add
          </button>
        )}
      </div>

      {/* ═══ SEARCH ═══ */}
      <div style={searchBoxStyle}>
        <Search size={16} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
        <input
          type="text"
          placeholder={view === 'my-resources' ? 'Search your resources...' : 'Search templates...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: colors.utility.primaryText,
            fontSize: 13,
            flex: 1,
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText, padding: 0, display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          const count = counts[tab as keyof typeof counts] ?? 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isActive ? colors.brand.primary : colors.utility.secondaryBackground,
                color: isActive ? '#FFFFFF' : colors.utility.primaryText,
              }}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* ═══ CONTENT ═══ */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 40, color: colors.utility.secondaryText }}>
          <Loader2 size={20} className="animate-spin" />
          {view === 'my-resources' ? 'Loading your resources...' : 'Loading templates...'}
        </div>
      ) : isError ? (
        <div style={{ padding: 20, color: colors.semantic?.error || '#dc2626' }}>
          Error: {errorMsg || 'Something went wrong'}
        </div>
      ) : view === 'my-resources' ? (
        /* ═══ MY RESOURCES VIEW ═══ */
        filteredSaved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <PackagePlus size={48} style={{ color: colors.utility.secondaryText, marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: colors.utility.primaryText, margin: '0 0 6px' }}>
              {search ? 'No matching resources' : 'No resources added yet'}
            </p>
            <p style={{ fontSize: 13, color: colors.utility.secondaryText, margin: '0 0 20px' }}>
              {search
                ? 'Try a different search term'
                : 'Browse the catalog to add equipment and entities your business services'}
            </p>
            {!search && (
              <button
                onClick={() => switchView('browse-catalog')}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: colors.brand.primary,
                  color: '#FFFFFF',
                }}
              >
                Browse & Add Resources
              </button>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: colors.utility.secondaryText, marginBottom: 12 }}>
              {filteredSaved.length} resource{filteredSaved.length !== 1 ? 's' : ''}
            </p>
            {filteredSaved.map(r => {
              const isConfirming = confirmDeleteId === r.id;
              const isDeleting = deletingId === r.id;

              return (
                <div
                  key={r.id}
                  style={{
                    ...cardStyle,
                    borderColor: isConfirming ? `${colors.semantic?.error || '#dc2626'}60` : `${colors.utility.primaryText}12`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14 }}>{r.display_name || r.name}</strong>
                      <span style={typeBadgeStyle}>{r.resource_type_id}</span>
                    </div>
                    {r.description && (
                      <p style={{ fontSize: 12, color: colors.utility.secondaryText, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.description}
                      </p>
                    )}
                  </div>

                  {isConfirming ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: colors.semantic?.error || '#dc2626', fontWeight: 600 }}>Remove?</span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={isDeleting}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: 'none',
                          fontSize: 12, fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer',
                          backgroundColor: colors.semantic?.error || '#dc2626', color: '#FFF',
                          opacity: isDeleting ? 0.7 : 1,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          border: `1px solid ${colors.utility.primaryText}20`, backgroundColor: 'transparent',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          color: colors.utility.primaryText,
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 6,
                        border: `1px solid ${colors.utility.primaryText}15`,
                        backgroundColor: 'transparent',
                        color: colors.utility.secondaryText,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Remove resource"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ═══ BROWSE CATALOG VIEW ═══ */
        filteredTemplates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Search size={48} style={{ color: colors.utility.secondaryText, marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: colors.utility.primaryText, margin: '0 0 6px' }}>
              No templates found
            </p>
            <p style={{ fontSize: 13, color: colors.utility.secondaryText, margin: 0 }}>
              {search ? 'Try a different search term' : 'No templates available for your served industries'}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: colors.utility.secondaryText, marginBottom: 12 }}>
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            </p>
            {filteredTemplates.map(t => {
              const added = isTemplateAdded(t);
              const isSaving = savingId === t.id;

              return (
                <div key={t.id} style={cardStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14 }}>{t.name}</strong>
                      <span style={typeBadgeStyle}>{t.resource_type_id}</span>
                    </div>
                    {t.description && (
                      <p style={{ fontSize: 12, color: colors.utility.secondaryText, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </p>
                    )}
                  </div>

                  {added ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.semantic?.success || '#16a34a', fontWeight: 600, flexShrink: 0 }}>
                      <Check size={14} /> Added
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSave(t)}
                      disabled={isSaving}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        fontSize: 12, fontWeight: 600,
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        backgroundColor: colors.brand.primary, color: '#FFFFFF',
                        opacity: isSaving ? 0.7 : 1, flexShrink: 0,
                      }}
                    >
                      {isSaving ? (
                        <><Loader2 size={13} className="animate-spin" /> Saving...</>
                      ) : (
                        <><Plus size={13} /> Add</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default ResourcesPage;

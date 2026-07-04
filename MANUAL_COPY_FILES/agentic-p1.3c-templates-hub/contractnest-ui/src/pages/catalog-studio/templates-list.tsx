// src/pages/catalog-studio/templates-list.tsx
// Templates Hub — tenant contract templates on t_cat_templates.
// Chrome mirrors the Contracts Hub (header + count, search/refresh/new,
// pill filters with counts). Create/Edit run the ContractWizard in
// template mode. Global demo gallery removed (admin-driven templates
// are parked — owner decision).

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  BadgeCheck,
  Edit3,
  Copy,
  Trash2,
  Clock,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCatTemplates, CatTemplate } from '../../hooks/queries/useCatTemplates';
import {
  useDeleteCatTemplate,
  useCopyCatTemplate,
  useUpdateCatTemplate,
} from '../../hooks/mutations/useCatTemplatesMutations';
import ContractWizard from '../../components/contracts/ContractWizard';
import { VaNiLoader } from '../../components/common/loaders/UnifiedLoader';

// =====================================================
// Lifecycle (lives in settings.lifecycle — status_id is an unused uuid col)
// Only signed-off templates will be offered to the contract wizard and the
// VaNi template-match tier (later stages).
// =====================================================
const SIGNED_OFF_STATUS = 'signed_off';

const isSignedOff = (t: CatTemplate): boolean =>
  (t.settings as any)?.lifecycle === SIGNED_OFF_STATUS;

const formatTemplateValue = (total: number | null | undefined, currency?: string): string | null => {
  if (total === null || total === undefined) return null;
  return `${currency || 'INR'} ${Number(total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatTemplateDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

// Nomenclature-group filter (template.category is saved by the wizard)
const TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'equipment_maintenance', label: 'Equipment' },
  { id: 'facility_property', label: 'Facilities' },
  { id: 'service_delivery', label: 'Services' },
  { id: 'flexible_hybrid', label: 'Hybrid' },
];

type LifecycleFilter = 'all' | 'draft' | 'signed_off' | 'inactive';

// Next available copy name: "X (Copy)", "X (Copy 2)", …
const nextCopyName = (baseName: string, existingNames: Set<string>): string => {
  const base = baseName.replace(/\s\(Copy(?: \d+)?\)$/i, '');
  let candidate = `${base} (Copy)`;
  let n = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${base} (Copy ${n})`;
    n += 1;
  }
  return candidate;
};

const TemplatesList: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;

  // ── Data: fetch active + inactive in one go, filter client-side ──
  const {
    data: templatesResponse,
    isLoading,
    error: loadError,
    refetch,
  } = useCatTemplates({ is_active: 'all', limit: 200 } as any);
  const deleteTemplateMutation = useDeleteCatTemplate();
  const copyTemplateMutation = useCopyCatTemplate();
  const updateTemplateMutation = useUpdateCatTemplate();

  const allTemplates: CatTemplate[] = useMemo(() => {
    const list = templatesResponse?.data?.templates || [];
    return [...list].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [templatesResponse]);

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);

  // Currencies actually present (multi-currency aware — no fake conversion)
  const currencies = useMemo(() => {
    const set = new Set<string>();
    allTemplates.forEach((t) => set.add(t.currency || 'INR'));
    return Array.from(set).sort();
  }, [allTemplates]);

  // ── Counts for pills (search/type/currency applied; lifecycle not) ──
  const preLifecycle = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTemplates.filter((t) => {
      if (typeFilter && t.category !== typeFilter) return false;
      if (currencyFilter && (t.currency || 'INR') !== currencyFilter) return false;
      if (q) {
        const hit =
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [allTemplates, searchQuery, typeFilter, currencyFilter]);

  const counts = useMemo(() => {
    const active = preLifecycle.filter((t) => t.is_active !== false);
    return {
      all: active.length,
      draft: active.filter((t) => !isSignedOff(t)).length,
      signed_off: active.filter((t) => isSignedOff(t)).length,
      inactive: preLifecycle.filter((t) => t.is_active === false).length,
    };
  }, [preLifecycle]);

  const filteredTemplates = useMemo(() => {
    return preLifecycle.filter((t) => {
      const inactive = t.is_active === false;
      switch (lifecycleFilter) {
        case 'inactive': return inactive;
        case 'draft': return !inactive && !isSignedOff(t);
        case 'signed_off': return !inactive && isSignedOff(t);
        default: return !inactive;
      }
    });
  }, [preLifecycle, lifecycleFilter]);

  // ── Wizard + delete state ──
  const [templateWizard, setTemplateWizard] = useState<{ open: boolean; template: CatTemplate | null }>({
    open: false,
    template: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<CatTemplate | null>(null);

  // Names taken by OTHER templates (for the uniqueness check inside the
  // wizard); excludes the edited template's own version lineage
  const takenTemplateNames = useMemo(() => {
    const editing = templateWizard.template;
    const editingLineage = editing ? (editing.parent_template_id || editing.id) : null;
    return allTemplates
      .filter((t) => t.is_active !== false)
      .filter((t) => (t.parent_template_id || t.id) !== editingLineage)
      .map((t) => t.name.toLowerCase());
  }, [allTemplates, templateWizard.template]);

  // ── Handlers ──
  const handleCreateNew = useCallback(() => {
    setTemplateWizard({ open: true, template: null });
  }, []);

  const handleEditTemplate = useCallback((t: CatTemplate) => {
    setTemplateWizard({ open: true, template: t });
  }, []);

  const closeTemplateWizard = useCallback(() => {
    setTemplateWizard({ open: false, template: null });
  }, []);

  const handleCopyTemplate = useCallback(
    (t: CatTemplate) => {
      if (copyTemplateMutation.isPending) return;
      const existing = new Set(allTemplates.map((x) => x.name.toLowerCase()));
      const copyName = nextCopyName(t.name, existing);
      // display_name kept in sync with name (stale display_name was the
      // "rename not saved" bug)
      copyTemplateMutation.mutate({
        id: t.id,
        data: { name: copyName, display_name: copyName } as any,
      });
    },
    [copyTemplateMutation, allTemplates]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget || deleteTemplateMutation.isPending) return;
    deleteTemplateMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteTemplateMutation]);

  // Restore an inactive template (metadata-only update → in-place, no version churn)
  const handleRestore = useCallback(
    (t: CatTemplate) => {
      if (updateTemplateMutation.isPending) return;
      updateTemplateMutation.mutate({ id: t.id, data: { is_active: true } as any });
    },
    [updateTemplateMutation]
  );

  const handleToggleSignOff = useCallback(
    (t: CatTemplate) => {
      if (updateTemplateMutation.isPending) return;
      updateTemplateMutation.mutate({
        id: t.id,
        // Spread existing settings — the edge update replaces the whole JSON,
        // and wizard_state must survive the lifecycle flip
        data: {
          settings: {
            ...((t.settings as Record<string, any>) || {}),
            lifecycle: isSignedOff(t) ? 'draft' : SIGNED_OFF_STATUS,
          },
        },
      });
    },
    [updateTemplateMutation]
  );

  const typeLabel = (category?: string): string | null =>
    TYPE_OPTIONS.find((o) => o.id === category)?.label || null;

  // ── Pill (matches Contracts Hub pill idiom) ──
  const pill = (
    label: string,
    count: number,
    active: boolean,
    onClick: () => void,
    accent?: string
  ) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 20,
        border: active ? `1.5px solid ${accent || brand}` : `1px solid ${colors.utility.primaryText}20`,
        background: active ? `${accent || brand}12` : 'transparent',
        color: active ? (accent || brand) : colors.utility.secondaryText,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
        lineHeight: 1,
      }}
    >
      {label}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 10,
          background: active ? (accent || brand) : `${colors.utility.primaryText}12`,
          color: active ? '#fff' : colors.utility.secondaryText,
          lineHeight: 1.2,
        }}
      >
        {count}
      </span>
    </button>
  );

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 16,
        border: active ? `1.5px solid ${brand}` : `1px solid ${colors.utility.primaryText}18`,
        background: active ? `${brand}12` : 'transparent',
        color: active ? brand : colors.utility.secondaryText,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        lineHeight: 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  // ── Render ──
  return (
    <div style={{ height: '100%', overflow: 'auto', background: colors.utility.primaryBackground }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>

        {/* ═══ HEADER (Contracts Hub idiom) ═══ */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
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
                Templates
              </h1>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: colors.utility.secondaryText,
                  fontWeight: 500,
                }}
              >
                {counts.all} template{counts.all !== 1 ? 's' : ''}
              </span>
            </div>
            <p style={{ fontSize: 12, color: colors.utility.secondaryText, marginTop: 4 }}>
              Reusable contract templates · signed-off templates power contract creation
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
                placeholder="Search templates..."
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

            {/* Create button */}
            <button
              onClick={handleCreateNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                background: brand,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              New Template
            </button>
          </div>
        </div>

        {/* ═══ LIFECYCLE PILLS ═══ */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {pill('All', counts.all, lifecycleFilter === 'all', () => setLifecycleFilter('all'))}
          {pill('Draft', counts.draft, lifecycleFilter === 'draft', () => setLifecycleFilter('draft'), colors.semantic.warning)}
          {pill('Signed off', counts.signed_off, lifecycleFilter === 'signed_off', () => setLifecycleFilter('signed_off'), '#10B981')}
          {pill('Inactive', counts.inactive, lifecycleFilter === 'inactive', () => setLifecycleFilter('inactive'), colors.semantic.error)}
        </div>

        {/* ═══ TYPE + CURRENCY CHIPS ═══ */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.utility.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Type
          </span>
          {chip('All', typeFilter === null, () => setTypeFilter(null))}
          {TYPE_OPTIONS.map((o) =>
            chip(o.label, typeFilter === o.id, () => setTypeFilter(typeFilter === o.id ? null : o.id))
          )}
          {currencies.length > 1 && (
            <>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, color: colors.utility.secondaryText,
                  textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 14,
                }}
              >
                Currency
              </span>
              {chip('All', currencyFilter === null, () => setCurrencyFilter(null))}
              {currencies.map((c) =>
                chip(c, currencyFilter === c, () => setCurrencyFilter(currencyFilter === c ? null : c))
              )}
            </>
          )}
        </div>

        {/* ═══ CONTENT ═══ */}
        {isLoading && (
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${colors.utility.primaryText}10`,
              overflow: 'hidden',
            }}
          >
            <VaNiLoader size="md" message="Loading templates..." />
          </div>
        )}

        {!isLoading && loadError && (
          <div
            className="max-w-md mx-auto my-12 p-6 rounded-2xl border text-center"
            style={{ borderColor: colors.semantic.error + '40', backgroundColor: colors.semantic.error + '08' }}
          >
            <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: colors.semantic.error }} />
            <h3 className="font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
              Couldn't load your templates
            </h3>
            <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
              {(loadError as Error)?.message || 'Something went wrong.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: brand }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state (no templates at all) */}
        {!isLoading && !loadError && allTemplates.length === 0 && (
          <div className="py-12">
            <div className="text-center max-w-md mx-auto">
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${brand}15` }}
              >
                <FileText className="w-12 h-12" style={{ color: brand }} />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
                No Templates Yet
              </h2>
              <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
                Build a reusable template from your catalog blocks — the same wizard you use for
                contracts, minus the buyer. Signed-off templates create contracts in seconds.
              </p>
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 rounded-xl font-medium text-white"
                style={{ backgroundColor: brand }}
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Create New Template
              </button>
            </div>
          </div>
        )}

        {/* No match for filters */}
        {!isLoading && !loadError && allTemplates.length > 0 && filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${brand}0D` }}
            >
              <Search className="w-8 h-8" style={{ color: brand }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              No templates match
            </h3>
            <p style={{ color: colors.utility.secondaryText }}>
              Try different filters or search terms
            </p>
          </div>
        )}

        {/* ═══ TEMPLATE CARDS ═══ */}
        {!isLoading && !loadError && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTemplates.map((template) => {
              const signedOff = isSignedOff(template);
              const inactive = template.is_active === false;
              const value = formatTemplateValue(template.total, template.currency);
              const category = typeLabel(template.category);
              return (
                <div
                  key={template.id}
                  onClick={() => !inactive && handleEditTemplate(template)}
                  className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
                    inactive ? 'opacity-70' : 'cursor-pointer hover:shadow-xl'
                  }`}
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: inactive
                      ? colors.semantic.error + '30'
                      : signedOff
                        ? `${brand}66`
                        : colors.utility.secondaryText + '20',
                  }}
                >
                  {/* Card header */}
                  <div
                    className="p-4 pb-3"
                    style={{
                      background: isDarkMode
                        ? `linear-gradient(135deg, ${brand}26 0%, transparent 100%)`
                        : `linear-gradient(135deg, ${brand}14 0%, transparent 100%)`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      {/* Status pill */}
                      {inactive ? (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: colors.semantic.error + '15', color: colors.semantic.error }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Inactive
                        </span>
                      ) : signedOff ? (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#10B98125', color: '#10B981' }}
                        >
                          <BadgeCheck className="w-3 h-3" />
                          Signed off
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
                        >
                          <Edit3 className="w-3 h-3" />
                          Draft
                        </span>
                      )}
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${brand}15`, color: brand }}
                      >
                        <Layers className="w-3 h-3" />
                        {template.blocks?.length || 0}
                      </span>
                    </div>

                    {/* name is the source of truth (display_name can lag on old rows) */}
                    <h3 className="font-bold text-lg mb-1 line-clamp-1" style={{ color: colors.utility.primaryText }}>
                      {template.name}
                    </h3>
                    {category && (
                      <div className="mb-1">
                        <span className="text-[11px] font-semibold" style={{ color: brand }}>
                          {category}
                        </span>
                      </div>
                    )}
                    <p
                      className="text-sm line-clamp-2 leading-relaxed min-h-[2.5rem]"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {template.description || 'No description'}
                    </p>
                  </div>

                  {/* Card body */}
                  <div className="px-4 pb-3">
                    <div
                      className="flex items-end justify-between pt-3 border-t"
                      style={{ borderColor: colors.utility.secondaryText + '15' }}
                    >
                      <div>
                        {value ? (
                          <div className="text-lg font-bold" style={{ color: colors.semantic.success }}>
                            {value}
                          </div>
                        ) : (
                          <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                            Value set per contract
                          </div>
                        )}
                        <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: colors.utility.secondaryText }}>
                          <Clock className="w-3 h-3" />
                          Updated {formatTemplateDate(template.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div
                    className="flex items-center justify-between px-4 py-3 border-t"
                    style={{
                      borderColor: colors.utility.secondaryText + '15',
                      backgroundColor: colors.utility.primaryBackground,
                    }}
                  >
                    {inactive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(template);
                        }}
                        disabled={updateTemplateMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        style={{ backgroundColor: `${brand}15`, color: brand }}
                      >
                        {updateTemplateMutation.isPending && updateTemplateMutation.variables?.id === template.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSignOff(template);
                          }}
                          disabled={updateTemplateMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          style={
                            signedOff
                              ? { backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }
                              : { backgroundColor: '#10B98125', color: '#10B981' }
                          }
                        >
                          {updateTemplateMutation.isPending && updateTemplateMutation.variables?.id === template.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <BadgeCheck className="w-3.5 h-3.5" />
                          )}
                          {signedOff ? 'Back to draft' : 'Sign off'}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            title="Edit"
                            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyTemplate(template);
                            }}
                            disabled={copyTemplateMutation.isPending}
                            title="Duplicate"
                            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {copyTemplateMutation.isPending && copyTemplateMutation.variables?.id === template.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(template);
                            }}
                            title="Deactivate"
                            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: colors.semantic.error }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ DEACTIVATE CONFIRMATION ═══ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 backdrop-blur-sm transition-opacity"
            style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => !deleteTemplateMutation.isPending && setDeleteTarget(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-md rounded-2xl border shadow-2xl p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '20',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.semantic.error + '15' }}
                >
                  <Trash2 className="w-6 h-6" style={{ color: colors.semantic.error }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
                    Deactivate template?
                  </h3>
                  <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
                    "{deleteTarget.name}" will move to Inactive. You can restore it anytime from the
                    Inactive filter. Contracts already created from it are not affected.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteTemplateMutation.isPending}
                  className="px-4 py-2.5 rounded-xl font-medium border transition-colors disabled:opacity-50"
                  style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.primaryText }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteTemplateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-70 text-white"
                  style={{ backgroundColor: colors.semantic.error }}
                >
                  {deleteTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deactivating…
                    </>
                  ) : (
                    'Deactivate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TEMPLATE WIZARD (ContractWizard in template mode) ═══ */}
      <ContractWizard
        isOpen={templateWizard.open}
        onClose={closeTemplateWizard}
        mode="template"
        editTemplate={templateWizard.template}
        onTemplateSaved={() => refetch()}
        takenTemplateNames={takenTemplateNames}
      />
    </div>
  );
};

export default TemplatesList;

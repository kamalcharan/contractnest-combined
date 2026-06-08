// src/pages/onboarding/steps/ResourcePickStep.tsx
// Screen 6 — Resource Picker
// Sits between Industry Selection and VaNi Consent.
// Inline intent selector (Equipment / Facilities / Both) filters the list below — no extra route.
// KT dot: green = KT available (variants_count > 0 from useKnowledgeTreeCoverage), red = no KT (disabled).
// Passes selectedEquipmentTemplates + selectedFacilityTemplates forward via routeState.

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import useResourceTemplatesBrowser from '@/hooks/queries/useResourceTemplates';
import { useKnowledgeTreeCoverage } from '@/hooks/queries/useKnowledgeTree';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import { ArrowRight, Package, RefreshCw, Wrench, Building2 } from 'lucide-react';
import type { ResourceTemplate } from '@/services/resourcesService';
import type { KnowledgeTreeCoverageMap } from '@/pages/service-contracts/templates/admin/knowledge-tree/types';

// ── Color tokens ──────────────────────────────────────────────────────────────
const VANI        = '#ff6b2b';
const VANI_SOFT   = '#fff8f4';
const VANI_BORDER = 'rgba(255,107,43,.2)';
const TEXT        = '#1a1816';
const TEXT_DIM    = '#8a847a';
const TEXT_MUTED  = '#bab4a8';
const BORDER      = '#e5e1db';
const BORDER_LT   = '#edeae4';
const SURFACE     = '#faf9f7';
const BG          = '#f7f5f2';
const WHITE       = '#ffffff';
const BLUE        = '#2563eb';
const BLUE_SOFT   = '#eff6ff';
const PURPLE      = '#8B5CF6';
const PURPLE_SOFT = '#f5f3ff';
const GREEN       = '#16a34a';
const RED         = '#dc2626';
const RED_SOFT    = '#fef2f2';

type PersonaId  = 'seller' | 'buyer' | 'both';
type WorkIntent = 'equipment' | 'facilities' | 'both' | null;

// Maps legacy DB values → current persona IDs
const normalizePersona = (raw: string): PersonaId => {
  if (raw === 'service_provider') return 'seller';
  if (raw === 'merchant')         return 'buyer';
  if (raw === 'seller' || raw === 'buyer' || raw === 'both') return raw as PersonaId;
  return 'seller';
};

const isEquipmentType = (t: string) => ['equipment', 'consumable'].includes(t.toLowerCase());
const isFacilityType  = (t: string) => t.toLowerCase() === 'asset';

// KT is available when the coverage map reports at least 1 variant built — same logic as KnowledgeTreeCard
const hasKT = (t: ResourceTemplate, coverage: KnowledgeTreeCoverageMap | undefined): boolean =>
  (coverage?.[t.id]?.variants_count ?? 0) > 0;

const groupBySubCategory = (items: ResourceTemplate[]): [string, ResourceTemplate[]][] => {
  const map: Record<string, ResourceTemplate[]> = {};
  items.forEach(t => {
    const key = t.sub_category || 'General';
    (map[key] = map[key] || []).push(t);
  });
  return Object.entries(map).sort(([, a], [, b]) => {
    const aRec = a.some(x => x.is_recommended) ? 0 : 1;
    const bRec = b.some(x => x.is_recommended) ? 0 : 1;
    return aRec - bRec;
  });
};

// ─────────────────────────────────────────────────────────────────────────────

const ResourcePickStep: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const { user } = useAuth();
  const { formData } = useTenantProfile({ isOnboarding: true });
  const { servedIndustries } = useServedIndustriesManager();

  const { templates, isLoading: templatesLoading, isError, refetch } = useResourceTemplatesBrowser({ limit: 200 });
  const { data: ktCoverage, isLoading: ktLoading } = useKnowledgeTreeCoverage();

  const isLoading = templatesLoading || ktLoading;

  const personaId = normalizePersona(formData.business_type_id || '');
  const firstName = user?.first_name?.trim() || null;

  // Industry names for contextual examples in intent selector
  const industryNames = useMemo(
    () => servedIndustries.map(si => si.industry?.name || '').filter(Boolean),
    [servedIndustries]
  );

  const equipmentTemplates = useMemo(() => templates.filter(t => isEquipmentType(t.resource_type_id)), [templates]);
  const facilityTemplates  = useMemo(() => templates.filter(t => isFacilityType(t.resource_type_id)),  [templates]);

  const eqKtCount  = useMemo(() => equipmentTemplates.filter(t => hasKT(t, ktCoverage)).length, [equipmentTemplates, ktCoverage]);
  const facKtCount = useMemo(() => facilityTemplates.filter(t => hasKT(t, ktCoverage)).length,  [facilityTemplates, ktCoverage]);

  // ── Intent selector state ─────────────────────────────────────────────────
  // null = not yet chosen (selector shown, list hidden)
  const [workIntent, setWorkIntent] = useState<WorkIntent>(null);

  const showEquipment = workIntent === 'equipment' || workIntent === 'both';
  const showFacility  = workIntent === 'facilities' || workIntent === 'both';

  // ── Selection state — only KT-available items are pre-selected ────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialised, setInitialised] = useState(false);

  // Auto-select KT-ready items once intent is chosen + data is ready
  useEffect(() => {
    if (!isLoading && workIntent !== null && !initialised) {
      const toSelect = templates.filter(t => {
        if (!hasKT(t, ktCoverage)) return false;
        if (workIntent === 'equipment') return isEquipmentType(t.resource_type_id);
        if (workIntent === 'facilities') return isFacilityType(t.resource_type_id);
        return true; // both
      });
      setSelectedIds(new Set(toSelect.map(t => t.id)));
      setInitialised(true);
    }
  }, [isLoading, workIntent, templates, ktCoverage, initialised]);

  // Re-initialise selections when intent changes
  const handleIntentSelect = (intent: WorkIntent) => {
    setWorkIntent(intent);
    setInitialised(false); // triggers re-auto-select for new intent
    setSelectedIds(new Set()); // clear first, useEffect will repopulate
  };

  const toggle = (t: ResourceTemplate) => {
    if (!hasKT(t, ktCoverage)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(t.id) ? next.delete(t.id) : next.add(t.id);
      return next;
    });
  };

  const selectAll   = (items: ResourceTemplate[]) =>
    setSelectedIds(prev => { const n = new Set(prev); items.filter(t => hasKT(t, ktCoverage)).forEach(t => n.add(t.id)); return n; });
  const deselectAll = (items: ResourceTemplate[]) =>
    setSelectedIds(prev => { const n = new Set(prev); items.forEach(t => n.delete(t.id)); return n; });

  const selEq  = useMemo(() => equipmentTemplates.filter(t => selectedIds.has(t.id)), [equipmentTemplates, selectedIds]);
  const selFac = useMemo(() => facilityTemplates.filter(t => selectedIds.has(t.id)),  [facilityTemplates, selectedIds]);

  const hasTemplates = equipmentTemplates.length > 0 || facilityTemplates.length > 0;
  const canContinue  = workIntent !== null && (selEq.length > 0 || selFac.length > 0);

  const handleContinue = () => {
    navigate('/onboarding/vani-consent', {
      state: {
        selectedEquipmentTemplates: selEq,
        selectedFacilityTemplates:  selFac,
        workIntent,
      },
    });
  };

  const islandLabel = useMemo(() => {
    if (workIntent === null) return 'Choose what you do first';
    const parts: string[] = [];
    if (selEq.length > 0)  parts.push(`${selEq.length} equipment`);
    if (selFac.length > 0) parts.push(`${selFac.length} ${selEq.length > 0 ? 'facilities' : 'facility types'}`);
    return parts.join(' · ') || 'Nothing selected yet';
  }, [selEq, selFac, workIntent]);

  // ── Sub-components ─────────────────────────────────────────────────────────

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 14, color: WHITE,
        boxShadow: `0 3px 8px ${colors.brand.primary}40`, marginTop: 2,
      }}>V</div>
      <div style={{
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}14`,
        borderRadius: '3px 14px 14px 14px',
        padding: '13px 17px', fontSize: 13.5,
        color: colors.utility.secondaryText, lineHeight: 1.6,
        maxWidth: 600,
      }} dangerouslySetInnerHTML={{ __html: msg }} />
    </div>
  );

  // ── Intent selector card ───────────────────────────────────────────────────
  const intentIndustryLine = industryNames.length > 0
    ? industryNames.slice(0, 3).join(', ') + (industryNames.length > 3 ? ` +${industryNames.length - 3} more` : '')
    : 'your selected industries';

  const IntentCard = ({
    intent, icon, label, sublabel, count, ktCount, accent, softBg,
  }: {
    intent: WorkIntent; icon: React.ReactNode; label: string; sublabel: string;
    count: number; ktCount: number; accent: string; softBg: string;
  }) => {
    const isSelected = workIntent === intent;
    return (
      <button
        onClick={() => handleIntentSelect(intent)}
        style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          gap: 10, padding: '18px 20px',
          background: isSelected ? softBg : WHITE,
          border: `2px solid ${isSelected ? accent : BORDER}`,
          borderRadius: 14, cursor: 'pointer',
          transition: 'all .18s', textAlign: 'left',
          boxShadow: isSelected ? `0 0 0 3px ${accent}18` : '0 1px 4px rgba(0,0,0,.05)',
          fontFamily: "'Outfit', sans-serif",
          outline: 'none',
        }}
        onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = `${accent}60`; e.currentTarget.style.background = `${softBg}80`; } }}
        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = WHITE; } }}
      >
        {/* Icon + selection ring */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: isSelected ? accent : `${accent}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s',
          }}>
            <span style={{ color: isSelected ? WHITE : accent }}>
              {icon}
            </span>
          </div>
          {/* Selection indicator */}
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${isSelected ? accent : BORDER}`,
            background: isSelected ? accent : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s',
            flexShrink: 0,
          }}>
            {isSelected && <span style={{ color: WHITE, fontSize: 10, fontWeight: 800 }}>✓</span>}
          </div>
        </div>

        {/* Label */}
        <div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: isSelected ? accent : TEXT,
            marginBottom: 3, transition: 'color .18s',
          }}>{label}</div>
          <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.45 }}>{sublabel}</div>
        </div>

        {/* Count pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isSelected ? accent : TEXT_DIM,
            background: isSelected ? `${accent}15` : `${BORDER_LT}`,
            borderRadius: 100, padding: '3px 10px',
            fontFamily: "'IBM Plex Mono', monospace",
            border: `1px solid ${isSelected ? `${accent}30` : BORDER}`,
            transition: 'all .18s',
          }}>
            {count} types found
          </span>
          {ktCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: GREEN, background: '#f0fdf4',
              borderRadius: 100, padding: '3px 10px',
              fontFamily: "'IBM Plex Mono', monospace",
              border: '1px solid #bbf7d0',
            }}>
              {ktCount} KT ready
            </span>
          )}
          {count > 0 && ktCount === 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: '#92400e', background: '#fffbeb',
              borderRadius: 100, padding: '3px 10px',
              fontFamily: "'IBM Plex Mono', monospace",
              border: '1px solid #fde68a',
            }}>
              No KT yet
            </span>
          )}
        </div>
      </button>
    );
  };

  const BothCard = () => {
    const isSelected = workIntent === 'both';
    return (
      <button
        onClick={() => handleIntentSelect('both')}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: isSelected ? VANI_SOFT : WHITE,
          border: `2px solid ${isSelected ? VANI : BORDER}`,
          borderRadius: 14, cursor: 'pointer',
          transition: 'all .18s', textAlign: 'left',
          boxShadow: isSelected ? `0 0 0 3px ${VANI}15` : '0 1px 4px rgba(0,0,0,.05)',
          fontFamily: "'Outfit', sans-serif",
          outline: 'none',
        }}
        onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = `${VANI}50`; e.currentTarget.style.background = VANI_SOFT; } }}
        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = WHITE; } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: isSelected ? VANI : `${VANI}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all .18s',
          }}>
            <span style={{ color: isSelected ? WHITE : VANI, fontSize: 16 }}>⚡</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? VANI : TEXT }}>Both — equipment & facilities</div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
              I service equipment <em>and</em> manage facilities
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
            color: isSelected ? VANI : TEXT_DIM,
            background: isSelected ? VANI_SOFT : BORDER_LT,
            border: `1px solid ${isSelected ? VANI_BORDER : BORDER}`,
            borderRadius: 100, padding: '3px 10px', transition: 'all .18s',
          }}>
            {equipmentTemplates.length + facilityTemplates.length} total
          </span>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${isSelected ? VANI : BORDER}`,
            background: isSelected ? VANI : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s', flexShrink: 0,
          }}>
            {isSelected && <span style={{ color: WHITE, fontSize: 10, fontWeight: 800 }}>✓</span>}
          </div>
        </div>
      </button>
    );
  };

  // Single row — matches .eq-row from batch4 spec
  const TemplateRow = ({ template }: { template: ResourceTemplate }) => {
    const selected  = selectedIds.has(template.id);
    const ktAvail   = hasKT(template, ktCoverage);
    const subCatCfg = getSubCategoryConfig(template.sub_category);
    const IconComp  = subCatCfg?.icon ?? Package;
    const accentClr = subCatCfg?.color ?? '#6B7280';

    return (
      <div
        role={ktAvail ? 'checkbox' : undefined}
        aria-checked={ktAvail ? selected : undefined}
        tabIndex={ktAvail ? 0 : -1}
        onClick={() => toggle(template)}
        onKeyDown={e => ktAvail && (e.key === ' ' || e.key === 'Enter') ? toggle(template) : null}
        title={!ktAvail ? 'No Knowledge Tree available — cannot be selected' : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 30px 1fr 28px',
          alignItems: 'center',
          gap: 12,
          padding: '11px 18px',
          borderBottom: `1px solid ${BORDER_LT}`,
          cursor: ktAvail ? 'pointer' : 'not-allowed',
          transition: 'background .12s',
          opacity: ktAvail ? 1 : 0.45,
          background: selected ? VANI_SOFT : 'transparent',
          outline: 'none',
          userSelect: 'none' as const,
        }}
        onMouseEnter={e => { if (ktAvail) e.currentTarget.style.background = selected ? VANI_SOFT : SURFACE; }}
        onMouseLeave={e => { e.currentTarget.style.background = selected ? VANI_SOFT : 'transparent'; }}
      >
        {/* Checkbox */}
        <div style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${!ktAvail ? BORDER : selected ? VANI : BORDER}`,
          background: selected && ktAvail ? VANI : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .12s',
        }}>
          {selected && ktAvail && (
            <span style={{ color: WHITE, fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>
          )}
        </div>

        {/* Category icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: `${accentClr}18`, border: `1px solid ${accentClr}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={13} color={accentClr} />
        </div>

        {/* Name + meta */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{template.name}</span>
            {template.is_recommended && (
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4,
                color: VANI, background: VANI_SOFT, border: `1px solid ${VANI_BORDER}`,
                borderRadius: 4, padding: '1px 5px',
              }}>Rec</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
            {[template.sub_category, template.maintenance_schedule].filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* KT availability dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            title={ktAvail ? 'Knowledge Tree available' : 'No Knowledge Tree'}
            style={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: ktAvail ? GREEN : RED,
              boxShadow: ktAvail ? `0 0 0 3px ${GREEN}20` : `0 0 0 3px ${RED}15`,
            }}
          />
        </div>
      </div>
    );
  };

  // Section with grouped rows
  const TemplateSection = ({
    title, items, accent, softBg,
  }: { title: string; items: ResourceTemplate[]; accent: string; softBg: string }) => {
    const groups   = groupBySubCategory(items);
    const selCount = items.filter(t => selectedIds.has(t.id)).length;
    const ktCount  = items.filter(t => hasKT(t, ktCoverage)).length;
    const allKtSel = selCount === ktCount && ktCount > 0;

    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: accent }} />
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.7, color: accent }}>
              {title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}>
              {selCount} / {items.length}
            </span>
            <button
              onClick={() => allKtSel ? deselectAll(items) : selectAll(items)}
              style={{
                fontSize: 11, fontWeight: 700, color: accent,
                background: softBg, border: `1px solid ${accent}25`,
                borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >{allKtSel ? 'Deselect all' : 'Select all'}</button>
          </div>
        </div>

        <div style={{
          background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        }}>
          <div style={{
            padding: '10px 18px', background: SURFACE,
            borderBottom: `1px solid ${BORDER_LT}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>
              {items.length} {title.toLowerCase()} for your industries
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block' }} /> KT ready
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, display: 'inline-block' }} /> No KT
              </span>
            </div>
          </div>
          {groups.map(([subCat, list]) => (
            <div key={subCat}>
              <div style={{
                padding: '6px 18px 4px',
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: 0.5, color: TEXT_MUTED, background: `${BORDER_LT}60`,
                fontFamily: "'IBM Plex Mono', monospace",
                borderBottom: `1px solid ${BORDER_LT}`,
              }}>
                {subCat}
              </div>
              {list.map(t => <TemplateRow key={t.id} template={t} />)}
            </div>
          ))}
        </div>

        {items.some(t => !hasKT(t, ktCoverage)) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', marginTop: 8, borderRadius: 7,
            background: RED_SOFT, border: `1px solid ${RED}18`,
            fontSize: 11, color: '#7f1d1d',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, flexShrink: 0, display: 'inline-block' }} />
            Red-dot items have no Knowledge Tree — VaNi cannot build pricing blocks for them yet.
          </div>
        )}
      </div>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: `3px solid ${VANI}25`, borderTopColor: VANI, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin .8s linear infinite' }} />
          <div style={{ fontSize: 13, color: TEXT_DIM }}>Loading your resource catalog…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Couldn't load resources</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 24, lineHeight: 1.55 }}>There was a problem fetching your industry catalog. Please try again.</div>
          <button onClick={() => refetch()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: VANI, color: WHITE, fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── VaNi bubble message (changes after intent is chosen) ───────────────────
  const vaniMsg = workIntent === null
    ? firstName
      ? `<strong>${firstName}</strong>, I found resources across <strong>${industryNames.length > 0 ? intentIndustryLine : 'your industries'}</strong>. First — what do you do? This helps me show only what's relevant to you.`
      : `I found resources across <strong>${intentIndustryLine}</strong>. What do you do in these industries? This helps me show only what's relevant.`
    : workIntent === 'equipment'
      ? firstName
        ? `Got it <strong>${firstName}</strong> — here are the <strong>${equipmentTemplates.length} equipment types</strong> I found for your industries. Uncheck anything you don't service.`
        : `Here are the <strong>${equipmentTemplates.length} equipment types</strong> found for your industries. Uncheck anything you don't service.`
      : workIntent === 'facilities'
        ? firstName
          ? `Got it <strong>${firstName}</strong> — here are the <strong>${facilityTemplates.length} facility types</strong> I found. Uncheck anything that doesn't apply.`
          : `Here are the <strong>${facilityTemplates.length} facility types</strong> found for your industries. Uncheck anything that doesn't apply.`
        : firstName
          ? `Got it <strong>${firstName}</strong> — showing all <strong>${equipmentTemplates.length + facilityTemplates.length} resource types</strong> across equipment and facilities. Uncheck anything that doesn't apply.`
          : `Showing all <strong>${equipmentTemplates.length + facilityTemplates.length} resource types</strong> across equipment and facilities. Uncheck anything that doesn't apply.`;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{
        flex: 1, backgroundColor: BG,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 140px', fontFamily: "'Outfit', sans-serif", minHeight: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: 700 }}>

          {/* Eyebrow */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: 1, color: VANI, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
          }}>
            Step 6 of 9 · What you manage
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', color: TEXT, marginBottom: 6 }}>
            {workIntent === null ? 'What do you do in these industries?' : 'Select equipment & facilities'}
          </h2>
          <p style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 24, lineHeight: 1.55 }}>
            {workIntent === null
              ? `For ${intentIndustryLine} — VaNi uses your answer to show only the relevant resources.`
              : 'Pre-selected based on your industries. Uncheck anything that doesn\'t apply — VaNi only builds blocks for your selections.'}
          </p>

          {/* VaNi bubble */}
          <VaniBubble msg={vaniMsg} />

          {/* ── Intent selector ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: workIntent !== null ? 32 : 0 }}>

            {/* Two main cards side-by-side */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
              <IntentCard
                intent="equipment"
                icon={<Wrench size={18} />}
                label="I service / maintain equipment"
                sublabel={`e.g. MRI machines, Ventilators, Dental chairs — ${equipmentTemplates.length} types found in ${intentIndustryLine}`}
                count={equipmentTemplates.length}
                ktCount={eqKtCount}
                accent={BLUE}
                softBg={BLUE_SOFT}
              />
              <IntentCard
                intent="facilities"
                icon={<Building2 size={18} />}
                label="I manage / operate facilities"
                sublabel={`e.g. Dental clinics, ICUs, Physiotherapy centres — ${facilityTemplates.length} types found in ${intentIndustryLine}`}
                count={facilityTemplates.length}
                ktCount={facKtCount}
                accent={PURPLE}
                softBg={PURPLE_SOFT}
              />
            </div>

            {/* Both card — full width */}
            <BothCard />

            {/* Change selection link (shown after intent is set) */}
            {workIntent !== null && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  onClick={() => { setWorkIntent(null); setSelectedIds(new Set()); setInitialised(false); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: TEXT_DIM, textDecoration: 'underline',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Change my selection
                </button>
              </div>
            )}
          </div>

          {/* ── Resource list (only shown after intent chosen) ──────────────── */}
          {workIntent !== null && (
            <div style={{ animation: 'fadeSlideIn .3s ease both' }}>
              {!hasTemplates ? (
                <div style={{
                  background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: '40px 24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No templates found for your industries</div>
                  <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 20, lineHeight: 1.55 }}>You can continue and add resources manually from Settings.</div>
                  <button onClick={handleContinue} style={{
                    padding: '10px 24px', borderRadius: 100, border: 'none',
                    background: VANI, color: WHITE, fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  }}>Continue anyway →</button>
                </div>
              ) : (
                <>
                  {showEquipment && equipmentTemplates.length > 0 && (
                    <TemplateSection title="Equipment types" items={equipmentTemplates} accent={BLUE} softBg={BLUE_SOFT} />
                  )}
                  {showFacility && facilityTemplates.length > 0 && (
                    <TemplateSection title="Facility types" items={facilityTemplates} accent={PURPLE} softBg={PURPLE_SOFT} />
                  )}
                  {!canContinue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, marginBottom: 12, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
                      ⚠️ Select at least one type to continue
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Floating action island ─────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: `${colors.accent.accent1 || '#1a1816'}f2`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap' as const, fontFamily: "'Outfit', sans-serif",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {islandLabel}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          type="button"
          onClick={() => navigate('/onboarding/industry-selection')}
          style={{ padding: '10px 20px', borderRadius: 100, border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
        >← Back</button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue && hasTemplates}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: canContinue || !hasTemplates ? `linear-gradient(135deg, ${VANI}, #ff8f5a)` : 'rgba(255,255,255,.12)',
            color: canContinue || !hasTemplates ? WHITE : 'rgba(255,255,255,.3)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: canContinue || !hasTemplates ? 'pointer' : 'not-allowed',
            boxShadow: canContinue || !hasTemplates ? `0 8px 24px ${VANI}50` : 'none',
            transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => { if (canContinue || !hasTemplates) { e.currentTarget.style.transform = 'scale(1.04)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
};

export default ResourcePickStep;

// src/pages/onboarding/steps/ResourcePickStep.tsx
// Screen 6 (new) — Resource Picker
// Sits between Industry Selection and VaNi Consent.
// Seller → equipment templates; Buyer → facility/asset templates; Both → both sections.
// All items pre-selected. User deselects what they don't manage.
// Passes selectedEquipmentTemplates + selectedFacilityTemplates forward via routeState.

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import useResourceTemplatesBrowser from '@/hooks/queries/useResourceTemplates';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import { ArrowRight, Package, RefreshCw } from 'lucide-react';
import type { ResourceTemplate } from '@/services/resourcesService';

// ── Fixed color tokens ────────────────────────────────────────────────────────
const VANI        = '#ff6b2b';
const VANI_SOFT   = '#fff8f4';
const VANI_BORDER = 'rgba(255,107,43,.2)';
const TEXT        = '#1a1816';
const TEXT_MID    = '#4a4540';
const TEXT_DIM    = '#8a847a';
const TEXT_MUTED  = '#bab4a8';
const BORDER      = '#e5e1db';
const SURFACE     = '#faf9f7';
const BG          = '#f7f5f2';
const BLUE        = '#2563eb';
const BLUE_SOFT   = '#eff6ff';
const PURPLE      = '#8B5CF6';
const PURPLE_SOFT = '#f5f3ff';
const WHITE       = '#ffffff';

type PersonaId = 'seller' | 'buyer' | 'both';

const isEquipmentType = (t: string) => ['equipment', 'consumable'].includes(t.toLowerCase());
const isFacilityType  = (t: string) => t.toLowerCase() === 'asset';

const groupBySubCategory = (items: ResourceTemplate[]): [string, ResourceTemplate[]][] => {
  const map: Record<string, ResourceTemplate[]> = {};
  items.forEach(t => {
    const key = t.sub_category || 'General';
    (map[key] = map[key] || []).push(t);
  });
  // Sort: recommended sub-cats first, then alphabetical
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
  const { user, currentTenant } = useAuth();
  const { formData } = useTenantProfile({ isOnboarding: true });

  const { templates, isLoading, isError, refetch } = useResourceTemplatesBrowser({ limit: 200 });

  const personaId  = (formData.business_type_id as PersonaId) || 'seller';
  const firstName  = user?.first_name?.trim() || null;
  const company    = formData.business_name?.trim() || currentTenant?.name || 'your company';

  // ── Split by type ──────────────────────────────────────────────────────────
  const equipmentTemplates = useMemo(() => templates.filter(t => isEquipmentType(t.resource_type_id)), [templates]);
  const facilityTemplates  = useMemo(() => templates.filter(t => isFacilityType(t.resource_type_id)),  [templates]);

  const showEquipment = personaId === 'seller' || personaId === 'both';
  const showFacility  = personaId === 'buyer'  || personaId === 'both';

  // ── Selection state — all pre-selected ────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (templates.length > 0 && !initialised) {
      setSelectedIds(new Set(templates.map(t => t.id)));
      setInitialised(true);
    }
  }, [templates, initialised]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = (items: ResourceTemplate[]) =>
    setSelectedIds(prev => { const n = new Set(prev); items.forEach(t => n.add(t.id)); return n; });

  const deselectAll = (items: ResourceTemplate[]) =>
    setSelectedIds(prev => { const n = new Set(prev); items.forEach(t => n.delete(t.id)); return n; });

  // ── Derived counts ─────────────────────────────────────────────────────────
  const selEq  = useMemo(() => equipmentTemplates.filter(t => selectedIds.has(t.id)), [equipmentTemplates, selectedIds]);
  const selFac = useMemo(() => facilityTemplates.filter(t => selectedIds.has(t.id)),  [facilityTemplates, selectedIds]);

  const canContinue =
    (!showEquipment || selEq.length > 0) &&
    (!showFacility  || selFac.length > 0);

  // ── VaNi messages ──────────────────────────────────────────────────────────
  const vaniMsg: Record<PersonaId, string> = {
    seller: firstName
      ? `Here's what I've found for the industries <strong>${firstName}</strong>. These are the equipment types you can service. <strong>Uncheck anything you don't manage</strong> — I'll only build pricing blocks for your selections.`
      : `These are the equipment types I've identified for your industries. <strong>Uncheck anything you don't service</strong> — I'll build pricing blocks only for what you select.`,
    buyer: firstName
      ? `<strong>${firstName}</strong>, based on your industry, these are typical assets I expect you manage. <strong>Uncheck anything that doesn't apply</strong> — I'll create your registry with the rest.`
      : `Based on your industry, these are the assets I expect you manage. <strong>Uncheck anything that doesn't apply</strong> — I'll set up your equipment registry accordingly.`,
    both: firstName
      ? `<strong>${firstName}</strong>, here's what I'll set up for both your service catalog and asset registry. <strong>Uncheck anything that doesn't apply</strong> to <strong>${company}</strong>.`
      : `Here's what I'll set up for both your service catalog and asset registry. <strong>Uncheck anything that doesn't apply</strong> to your business.`,
  };

  // ── Continue handler ───────────────────────────────────────────────────────
  const handleContinue = () => {
    navigate('/onboarding/vani-consent', {
      state: {
        selectedEquipmentTemplates: selEq,
        selectedFacilityTemplates:  selFac,
      },
    });
  };

  // ── Island label ───────────────────────────────────────────────────────────
  const islandLabel = useMemo(() => {
    const parts: string[] = [];
    if (showEquipment) parts.push(`${selEq.length} equipment type${selEq.length !== 1 ? 's' : ''}`);
    if (showFacility)  parts.push(`${selFac.length} facility type${selFac.length !== 1 ? 's' : ''}`);
    return parts.join(' · ') || 'Nothing selected';
  }, [selEq, selFac, showEquipment, showFacility]);

  // ── Sub-components ─────────────────────────────────────────────────────────

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
        borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 14, color: WHITE,
        boxShadow: `0 3px 8px ${colors.brand.primary}40`, marginTop: 2,
      }}>V</div>
      <div style={{
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}14`,
        borderRadius: '3px 14px 14px 14px',
        padding: '14px 18px',
        fontSize: 14, color: colors.utility.secondaryText, lineHeight: 1.6,
        maxWidth: 580, boxShadow: `0 2px 12px ${colors.utility.primaryText}08`,
      }} dangerouslySetInnerHTML={{ __html: msg }} />
    </div>
  );

  const TemplateCard = ({ template }: { template: ResourceTemplate }) => {
    const selected  = selectedIds.has(template.id);
    const subCatCfg = getSubCategoryConfig(template.sub_category);
    const IconComp  = subCatCfg?.icon ?? Package;
    const accentClr = subCatCfg?.color ?? '#6B7280';

    return (
      <div
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
        onClick={() => toggle(template.id)}
        onKeyDown={e => e.key === ' ' || e.key === 'Enter' ? toggle(template.id) : null}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '13px 15px', borderRadius: 12, marginBottom: 8,
          border: `1.5px solid ${selected ? VANI_BORDER : BORDER}`,
          background: selected ? VANI_SOFT : SURFACE,
          cursor: 'pointer', transition: 'all 0.15s',
          opacity: selected ? 1 : 0.52,
          outline: 'none',
          userSelect: 'none' as const,
        }}
      >
        {/* Checkbox */}
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `2px solid ${selected ? VANI : BORDER}`,
          background: selected ? VANI : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {selected && <span style={{ color: WHITE, fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>}
        </div>

        {/* Category icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${accentClr}18`,
          border: `1px solid ${accentClr}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={15} color={accentClr} />
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' as const, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{template.name}</span>
            {template.is_recommended && (
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5,
                color: VANI, background: VANI_SOFT, border: `1px solid ${VANI_BORDER}`,
                borderRadius: 4, padding: '1px 6px',
              }}>Recommended</span>
            )}
            {template.already_added && (
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5,
                color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 4, padding: '1px 6px',
              }}>Already added</span>
            )}
          </div>
          {template.description && (
            <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5, marginBottom: template.maintenance_schedule ? 3 : 0 }}>
              {template.description}
            </div>
          )}
          {template.maintenance_schedule && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
              Schedule: {template.maintenance_schedule}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionHeader = ({
    title, items, accent,
  }: { title: string; items: ResourceTemplate[]; accent: string }) => {
    const selCount  = items.filter(t => selectedIds.has(t.id)).length;
    const allSel    = selCount === items.length;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 4, height: 24, borderRadius: 2,
            background: `linear-gradient(to bottom, ${accent}, ${accent}60)`,
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.8, color: accent }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
              {selCount} of {items.length} selected
            </div>
          </div>
        </div>
        <button
          onClick={() => allSel ? deselectAll(items) : selectAll(items)}
          style={{
            fontSize: 11, fontWeight: 700, color: accent,
            background: `${accent}10`, border: `1px solid ${accent}25`,
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {allSel ? 'Deselect all' : 'Select all'}
        </button>
      </div>
    );
  };

  const TemplateSection = ({
    title, items, accent,
  }: { title: string; items: ResourceTemplate[]; accent: string }) => {
    const groups = groupBySubCategory(items);
    return (
      <div style={{
        marginBottom: 28,
        background: WHITE,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '20px 20px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}>
        <SectionHeader title={title} items={items} accent={accent} />
        {groups.map(([subCat, list]) => (
          <div key={subCat} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: 0.6, color: TEXT_MUTED,
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 8, paddingLeft: 2,
            }}>
              {subCat}
            </div>
            {list.map(t => <TemplateCard key={t.id} template={t} />)}
          </div>
        ))}
      </div>
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44,
            border: `3px solid ${VANI}25`, borderTopColor: VANI,
            borderRadius: '50%', margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 13, color: TEXT_DIM }}>
            Loading your resource catalog…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
            Couldn't load resources
          </div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 24, lineHeight: 1.55 }}>
            There was a problem fetching your industry resource catalog. Please try again.
          </div>
          <button
            onClick={() => refetch()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 100, border: 'none',
              background: VANI, color: WHITE,
              fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state (no templates for selected industries) ─────────────────────
  const hasTemplates = (showEquipment && equipmentTemplates.length > 0) ||
                       (showFacility  && facilityTemplates.length > 0);

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        flex: 1,
        backgroundColor: BG,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 140px',
        fontFamily: "'Outfit', sans-serif",
        minHeight: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: 680 }}>

          {/* Eyebrow */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: 1, color: VANI,
            fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
          }}>
            Step 6 of 9 · What you manage
          </div>

          <h2 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
            color: TEXT, marginBottom: 6,
          }}>
            {showEquipment && showFacility
              ? 'Select your equipment & facilities'
              : showEquipment
                ? 'Select equipment you service'
                : 'Select facilities you manage'}
          </h2>
          <p style={{
            fontSize: 14, color: TEXT_DIM, marginBottom: 28, lineHeight: 1.55,
          }}>
            All items are pre-selected based on your industry. Uncheck anything that doesn't apply — VaNi will only build blocks for your selections.
          </p>

          {/* VaNi bubble */}
          <VaniBubble msg={vaniMsg[personaId]} />

          {/* Sections */}
          {!hasTemplates ? (
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16,
              padding: '40px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                No templates found for your industries
              </div>
              <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 20, lineHeight: 1.55 }}>
                VaNi couldn't find resource templates for your selected industries. You can continue and add resources manually later from Settings.
              </div>
              <button
                onClick={handleContinue}
                style={{
                  padding: '10px 24px', borderRadius: 100, border: 'none',
                  background: VANI, color: WHITE,
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Continue anyway →
              </button>
            </div>
          ) : (
            <>
              {showEquipment && equipmentTemplates.length > 0 && (
                <TemplateSection
                  title="Equipment you service"
                  items={equipmentTemplates}
                  accent={BLUE}
                />
              )}
              {showFacility && facilityTemplates.length > 0 && (
                <TemplateSection
                  title="Facilities you manage"
                  items={facilityTemplates}
                  accent={PURPLE}
                />
              )}

              {/* Hint when nothing selected in a required section */}
              {showEquipment && selEq.length === 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 10, marginBottom: 16,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  fontSize: 13, color: '#92400e',
                }}>
                  ⚠️ Select at least one equipment type to continue
                </div>
              )}
              {showFacility && selFac.length === 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 10, marginBottom: 16,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  fontSize: 13, color: '#92400e',
                }}>
                  ⚠️ Select at least one facility type to continue
                </div>
              )}
            </>
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
        zIndex: 200, whiteSpace: 'nowrap' as const,
        fontFamily: "'Outfit', sans-serif",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {islandLabel}
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        <button
          type="button"
          onClick={() => navigate('/onboarding/industry-selection')}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue && hasTemplates}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: canContinue || !hasTemplates
              ? `linear-gradient(135deg, ${VANI}, #ff8f5a)`
              : 'rgba(255,255,255,.12)',
            color: canContinue || !hasTemplates ? WHITE : 'rgba(255,255,255,.3)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: canContinue || !hasTemplates ? 'pointer' : 'not-allowed',
            boxShadow: canContinue || !hasTemplates ? `0 8px 24px ${VANI}50` : 'none',
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => {
            if (canContinue || !hasTemplates) {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = `0 12px 32px ${VANI}70`;
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = canContinue || !hasTemplates ? `0 8px 24px ${VANI}50` : 'none';
          }}
        >
          Continue
          <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
};

export default ResourcePickStep;

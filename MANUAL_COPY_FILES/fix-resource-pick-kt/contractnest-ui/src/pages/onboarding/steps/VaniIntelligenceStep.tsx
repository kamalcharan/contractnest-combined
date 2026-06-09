// src/pages/onboarding/steps/VaniIntelligenceStep.tsx
// Inserted between VaniConsentStep and VaniWorkingStep.
// Shows a brief "gathering knowledge intelligence" phase:
//   1. Animated scan of selected equipment + facility templates against KT
//   2. Reveals matched block counts per template
//   3. Confirm CTA → VaniWorking ("Getting your Workspace Ready")

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useKnowledgeTreeCoverage } from '@/hooks/queries/useKnowledgeTree';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import { ArrowRight, Package } from 'lucide-react';
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
const GREEN_SOFT  = '#f0fdf4';
const SLATE       = '#64748b';
const SLATE_SOFT  = '#f1f5f9';

// Estimate blocks from KT coverage: variants × 3 service tiers (basic/comp/premium)
// If no variants, fall back to 3 (1 equipment × 3 tiers minimum).
const estimateBlocks = (templateId: string, coverage: KnowledgeTreeCoverageMap | undefined): number => {
  const item = coverage?.[templateId];
  if (!item) return 0;
  const variants = item.variants_count > 0 ? item.variants_count : 1;
  return variants * 3;
};

const hasKT = (templateId: string, coverage: KnowledgeTreeCoverageMap | undefined): boolean =>
  (coverage?.[templateId]?.variants_count ?? 0) > 0;

// ── Scan phases ───────────────────────────────────────────────────────────────
const SCAN_PHASES = [
  'Connecting to Knowledge Tree…',
  'Reading equipment variants…',
  'Matching service cycles…',
  'Computing block definitions…',
  'Intelligence ready ✓',
];

// ─────────────────────────────────────────────────────────────────────────────

const VaniIntelligenceStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const { user } = useAuth();

  const routeState = (location.state || {}) as Record<string, any>;
  // Filter out any undefined/null items that may come through route state serialisation
  const selEquipment: ResourceTemplate[] = (routeState.selectedEquipmentTemplates || []).filter(Boolean);
  const selFacility:  ResourceTemplate[] = (routeState.selectedFacilityTemplates  || []).filter(Boolean);
  const workIntent: string | null        = routeState.workIntent || null;

  const { data: ktCoverage, isLoading: ktLoading } = useKnowledgeTreeCoverage();

  // ── Scan animation state ─────────────────────────────────────────────────
  const [phaseIdx, setPhaseIdx]     = useState(0);
  const [scanDone, setScanDone]     = useState(false);
  const [revealed, setRevealed]     = useState<Set<string>>(new Set());

  // Advance through scan phases (300ms each)
  useEffect(() => {
    if (ktLoading) return;
    const timer = setInterval(() => {
      setPhaseIdx(prev => {
        const next = prev + 1;
        if (next >= SCAN_PHASES.length) {
          clearInterval(timer);
          setScanDone(true);
          return prev;
        }
        return next;
      });
    }, 320);
    return () => clearInterval(timer);
  }, [ktLoading]);

  // Reveal template rows one-by-one after scan completes
  const allTemplates = useMemo(
    () => [...selEquipment, ...selFacility],
    [selEquipment, selFacility]
  );

  useEffect(() => {
    if (!scanDone) return;
    let idx = 0;
    const reveal = () => {
      if (idx >= allTemplates.length) return;
      setRevealed(prev => new Set([...prev, allTemplates[idx].id]));
      idx++;
      setTimeout(reveal, 120);
    };
    setTimeout(reveal, 200);
  }, [scanDone, allTemplates]);

  const totalBlocks = useMemo(
    () => allTemplates.reduce((sum, t) => sum + estimateBlocks(t.id, ktCoverage), 0),
    [allTemplates, ktCoverage]
  );

  const ktReadyCount = useMemo(
    () => allTemplates.filter(t => hasKT(t.id, ktCoverage)).length,
    [allTemplates, ktCoverage]
  );

  const allRevealed = revealed.size >= allTemplates.length && allTemplates.length > 0;

  const handleConfirm = () => {
    navigate('/onboarding/vani-working', {
      state: {
        ...routeState,
        selectedEquipmentTemplates: selEquipment,
        selectedFacilityTemplates:  selFacility,
        workIntent,
      },
    });
  };

  const firstName = user?.first_name?.trim() || null;

  // ── Template row ─────────────────────────────────────────────────────────
  const TemplateRow = ({ template, isEquipment }: { template: ResourceTemplate; isEquipment: boolean }) => {
    const subCatCfg = getSubCategoryConfig(template.sub_category);
    const IconComp  = subCatCfg?.icon ?? Package;
    const accentClr = subCatCfg?.color ?? (isEquipment ? BLUE : PURPLE);
    const ktAvail   = hasKT(template.id, ktCoverage);
    const blocks    = estimateBlocks(template.id, ktCoverage);
    const isVis     = revealed.has(template.id);

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto',
        alignItems: 'center', gap: 12,
        padding: '11px 18px',
        borderBottom: `1px solid ${BORDER_LT}`,
        opacity: isVis ? 1 : 0,
        transform: isVis ? 'translateX(0)' : 'translateX(-8px)',
        transition: 'opacity .25s ease, transform .25s ease',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: `${accentClr}18`, border: `1px solid ${accentClr}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={13} color={accentClr} />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{template.name}</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
            {isEquipment ? 'Equipment' : 'Facility'}
            {template.sub_category ? ` · ${template.sub_category}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {ktAvail ? (
            <>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: GREEN, background: GREEN_SOFT,
                border: `1px solid ${GREEN}20`,
                borderRadius: 6, padding: '2px 8px',
              }}>
                KT ✓
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: VANI, background: VANI_SOFT,
                border: `1px solid ${VANI_BORDER}`,
                borderRadius: 6, padding: '2px 8px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                ~{blocks} blocks
              </span>
            </>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: SLATE, background: SLATE_SOFT,
              border: `1px solid ${SLATE}20`,
              borderRadius: 6, padding: '2px 8px',
            }}>
              No KT
            </span>
          )}
        </div>
      </div>
    );
  };

  // ── Loading (waiting for KT coverage) ────────────────────────────────────
  if (ktLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: `3px solid ${VANI}25`, borderTopColor: VANI, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin .8s linear infinite' }} />
          <div style={{ fontSize: 13, color: TEXT_DIM }}>Connecting to Knowledge Tree…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes pulse      { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        @keyframes fadeIn     { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline   { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>

      <div style={{
        flex: 1, backgroundColor: BG,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 140px', fontFamily: "'Outfit', sans-serif", minHeight: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: 700 }}>

          {/* Step label */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: 1, color: VANI, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
          }}>
            Step 7 of 9 · VaNi Intelligence
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', color: TEXT, marginBottom: 6 }}>
            Gathering Knowledge Intelligence
          </h2>
          <p style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 28, lineHeight: 1.55 }}>
            VaNi is scanning the Knowledge Tree for your selected templates and computing the catalog blocks that will be created.
          </p>

          {/* VaNi bubble */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
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
              maxWidth: 580,
            }}>
              {!scanDone ? (
                <span style={{ animation: 'pulse 1.2s ease infinite' }}>
                  {SCAN_PHASES[phaseIdx]}
                </span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html:
                  firstName
                    ? `<strong>${firstName}</strong>, I found Knowledge Tree data for <strong>${ktReadyCount} of ${allTemplates.length}</strong> template${allTemplates.length !== 1 ? 's' : ''}. I'll generate approximately <strong>${totalBlocks} catalog blocks</strong> ready for your workspace.`
                    : `I found Knowledge Tree data for <strong>${ktReadyCount} of ${allTemplates.length}</strong> template${allTemplates.length !== 1 ? 's' : ''}. I'll generate approximately <strong>${totalBlocks} catalog blocks</strong> ready for your workspace.`
                }} />
              )}
            </div>
          </div>

          {/* Scan progress bar */}
          {!scanDone && (
            <div style={{
              height: 3, background: BORDER_LT, borderRadius: 2, marginBottom: 28, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((phaseIdx + 1) / SCAN_PHASES.length) * 100}%`,
                background: `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                borderRadius: 2,
                transition: 'width .3s ease',
              }} />
            </div>
          )}

          {/* Summary chips — shown after scan */}
          {scanDone && (
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 24,
              animation: 'fadeIn .3s ease both',
            }}>
              {selEquipment.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 100,
                  background: BLUE_SOFT, border: `1px solid ${BLUE}20`,
                  fontSize: 12, fontWeight: 700, color: BLUE,
                }}>
                  🔧 {selEquipment.length} equipment template{selEquipment.length !== 1 ? 's' : ''}
                </div>
              )}
              {selFacility.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 100,
                  background: PURPLE_SOFT, border: `1px solid ${PURPLE}20`,
                  fontSize: 12, fontWeight: 700, color: PURPLE,
                }}>
                  🏢 {selFacility.length} facility template{selFacility.length !== 1 ? 's' : ''}
                </div>
              )}
              {totalBlocks > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 100,
                  background: VANI_SOFT, border: `1px solid ${VANI_BORDER}`,
                  fontSize: 12, fontWeight: 700, color: VANI,
                }}>
                  ≈ {totalBlocks} catalog blocks
                </div>
              )}
            </div>
          )}

          {/* Template results list */}
          {scanDone && allTemplates.length > 0 && (
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 1px 6px rgba(0,0,0,.04)',
              marginBottom: 8,
              animation: 'fadeIn .3s ease both',
            }}>
              {/* Header */}
              <div style={{
                padding: '10px 18px', background: SURFACE,
                borderBottom: `1px solid ${BORDER_LT}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>
                  Knowledge Tree scan results
                </span>
                <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {ktReadyCount} / {allTemplates.length} matched
                </span>
              </div>

              {/* Equipment rows */}
              {selEquipment.length > 0 && (
                <>
                  <div style={{
                    padding: '5px 18px 4px',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                    letterSpacing: 0.6, color: BLUE, background: `${BLUE}08`,
                    borderBottom: `1px solid ${BORDER_LT}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    Equipment
                  </div>
                  {selEquipment.map(t => (
                    <TemplateRow key={t.id} template={t} isEquipment={true} />
                  ))}
                </>
              )}

              {/* Facility rows */}
              {selFacility.length > 0 && (
                <>
                  <div style={{
                    padding: '5px 18px 4px',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                    letterSpacing: 0.6, color: PURPLE, background: `${PURPLE}08`,
                    borderBottom: `1px solid ${BORDER_LT}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    Facilities
                  </div>
                  {selFacility.map(t => (
                    <TemplateRow key={t.id} template={t} isEquipment={false} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* No templates fallback */}
          {scanDone && allTemplates.length === 0 && (
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: '40px 24px', textAlign: 'center',
              animation: 'fadeIn .3s ease both',
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                No templates selected
              </div>
              <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.55 }}>
                Go back and select at least one equipment or facility type.
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Floating action island ── */}
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
          {!scanDone
            ? 'Gathering Intelligence…'
            : allRevealed
              ? `${totalBlocks} blocks ready`
              : 'Analysing…'
          }
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          type="button"
          onClick={() => navigate('/onboarding/vani-consent', {
            state: {
              selectedEquipmentTemplates: selEquipment,
              selectedFacilityTemplates: selFacility,
              workIntent,
            },
          })}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >← Back</button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!allRevealed && allTemplates.length > 0}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: allRevealed || allTemplates.length === 0
              ? `linear-gradient(135deg, ${VANI}, #ff8f5a)`
              : 'rgba(255,255,255,.12)',
            color: allRevealed || allTemplates.length === 0 ? WHITE : 'rgba(255,255,255,.3)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: allRevealed || allTemplates.length === 0 ? 'pointer' : 'not-allowed',
            boxShadow: allRevealed || allTemplates.length === 0 ? `0 8px 24px ${VANI}50` : 'none',
            transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          Set up my workspace <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
};

export default VaniIntelligenceStep;

// src/pages/onboarding/steps/VaniConsentStep.tsx
// Screen 7 — VaNi Consent (6A = Seller, 6B = Buyer, 6C = Both)
// Receives selectedEquipmentTemplates + selectedFacilityTemplates from ResourcePickStep via routeState.
// Shows a dynamic preview of exactly what VaNi will build.
// CTA "Set up my workspace →" navigates to /onboarding/vani-working, passing templates forward.

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import { themes } from '@/utils/theme';
import { Building2, Palette, Layers, User, ArrowRight, CheckCircle2, Package } from 'lucide-react';
import type { ResourceTemplate } from '@/services/resourcesService';

type PersonaId = 'seller' | 'buyer' | 'both';

const PERSONA_META: Record<PersonaId, { label: string; icon: string; whatVaniDoes: string[] }> = {
  seller: {
    label: 'Service Provider',
    icon: '🔧',
    whatVaniDoes: [
      'Set up your <strong>service catalog</strong> with contract templates',
      'Configure <strong>SLA terms</strong> and compliance defaults for your industries',
      'Enable <strong>client billing</strong> and AMC / CMC tracking',
      'Seed your <strong>sequence numbers</strong> for contracts, invoices, and jobs',
    ],
  },
  buyer: {
    label: 'Asset Owner',
    icon: '🏢',
    whatVaniDoes: [
      'Set up your <strong>asset registry</strong> with equipment tracking',
      'Configure <strong>vendor management</strong> and SLA monitoring',
      'Enable <strong>procurement workflows</strong> and contract intake',
      'Seed your <strong>sequence numbers</strong> for POs and service records',
    ],
  },
  both: {
    label: 'Provider & Asset Owner',
    icon: '📤📥',
    whatVaniDoes: [
      'Build your <strong>full dual setup</strong> — service delivery AND asset management',
      'Configure templates and SLA defaults for <strong>both roles</strong>',
      'Enable client billing, vendor management, and cross-module reporting',
      'Seed <strong>sequence numbers</strong> for all contract and job types',
    ],
  },
};

// Fixed color tokens (VaNi brand, not theme-dependent)
const VANI        = '#ff6b2b';
const VANI_SOFT   = '#fff8f4';
const VANI_BORDER = 'rgba(255,107,43,.2)';
const BLUE        = '#2563eb';
const BLUE_BG     = '#eff6ff';
const PURPLE      = '#8B5CF6';
const PURPLE_BG   = '#f5f3ff';
const GREEN       = '#16a34a';
const GREEN_BG    = '#f0fdf4';
const TEXT_MUTED  = '#bab4a8';
const BORDER_LT   = '#edeae4';

const VaniConsentStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as {
    selectedEquipmentTemplates?: ResourceTemplate[];
    selectedFacilityTemplates?: ResourceTemplate[];
  };

  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });
  const { count: industryCount, isLoading: industriesLoading } = useServedIndustriesManager();
  const colors = currentTheme.colors;

  const [savedThemeName, setSavedThemeName] = useState<string | null>(null);

  useEffect(() => {
    setTheme('vani');
    fetchProfile();
    try {
      const raw = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
      if (raw) {
        const savedId = (JSON.parse(raw) as any)?.preferred_theme;
        if (savedId && savedId !== 'vani' && themes[savedId]) setSavedThemeName(themes[savedId].name);
      }
    } catch {}
  }, []);

  const firstName = user?.first_name?.trim() || null;
  const fullName  = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || null;
  const company   = formData.business_name?.trim() || currentTenant?.name || 'your company';
  const rawPersona = formData.business_type_id || '';
  const personaId: PersonaId | null = rawPersona === 'service_provider' ? 'seller'
    : rawPersona === 'merchant' ? 'buyer'
    : (rawPersona === 'seller' || rawPersona === 'buyer' || rawPersona === 'both') ? rawPersona as PersonaId
    : null;
  const persona = personaId ? PERSONA_META[personaId] : null;

  // Selected templates from ResourcePickStep
  const selEquipment = routeState.selectedEquipmentTemplates || [];
  const selFacility  = routeState.selectedFacilityTemplates  || [];
  const blockCount   = selEquipment.length * 3;

  const handleStart = () => {
    navigate('/onboarding/vani-working', {
      state: {
        selectedEquipmentTemplates: selEquipment,
        selectedFacilityTemplates:  selFacility,
      },
    });
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 14, color: '#fff',
        boxShadow: `0 3px 8px ${colors.brand.primary}40`, marginTop: 2,
      }}>V</div>
      <div style={{
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}14`,
        borderRadius: '3px 14px 14px 14px',
        padding: '14px 18px', fontSize: 14,
        color: colors.utility.secondaryText, lineHeight: 1.6, maxWidth: 560,
      }} dangerouslySetInnerHTML={{ __html: msg }} />
    </div>
  );

  const SummaryRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderBottom: `1px solid ${colors.utility.primaryText}08`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${colors.brand.primary}10`, border: `1px solid ${colors.brand.primary}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.brand.primary,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: value ? colors.utility.primaryText : `${colors.utility.secondaryText}70` }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );

  // Template chip row (inside the "what VaNi will build" section)
  const TemplateChip = ({ t, accent }: { t: ResourceTemplate; accent: string }) => {
    const subCatCfg = getSubCategoryConfig(t.sub_category);
    const IconComp  = subCatCfg?.icon ?? Package;
    const accentClr = subCatCfg?.color ?? accent;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `${accentClr}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={12} color={accentClr} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.utility.primaryText, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.name}
          </div>
          {t.sub_category && (
            <div style={{ fontSize: 10, color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace" }}>
              {t.sub_category}
            </div>
          )}
        </div>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: GREEN, boxShadow: `0 0 0 2px ${GREEN}20`,
        }} title="KT available" />
      </div>
    );
  };

  const vaniIntroMsg = firstName
    ? `You're all set, <strong>${firstName}</strong>. Here's exactly what I'm about to build for <strong>${company}</strong>. Click <em>Set up my workspace</em> and I'll take care of everything.`
    : `You're all set. Here's exactly what I'm about to build for <strong>${company}</strong>. Click <em>Set up my workspace</em> and I'll take care of everything.`;

  return (
    <>
      <div style={{
        flex: 1, backgroundColor: colors.utility.primaryBackground,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 140px', fontFamily: "'Outfit', sans-serif", minHeight: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: 640 }}>

          {/* Eyebrow */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: 1, color: colors.brand.primary,
            fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
          }}>
            Step 7 of 9 · {personaId === 'buyer' ? 'VaNi Consent — 6B' : personaId === 'both' ? 'VaNi Consent — 6C' : 'VaNi Consent — 6A'}
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', color: colors.utility.primaryText, marginBottom: 6 }}>
            Ready to set up your workspace
          </h2>
          <p style={{ fontSize: 14, color: colors.utility.secondaryText, marginBottom: 32, lineHeight: 1.55 }}>
            VaNi will configure everything automatically — storage, sequences, templates and defaults.
          </p>

          <VaniBubble msg={vaniIntroMsg} />

          {/* ── What VaNi knows ── */}
          <div style={{
            background: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}14`,
            borderRadius: 16, overflow: 'hidden', marginBottom: 20,
          }}>
            <div style={{
              padding: '12px 16px', background: `${colors.brand.primary}08`,
              borderBottom: `1px solid ${colors.utility.primaryText}10`,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '0.6px', color: colors.brand.primary, fontFamily: "'IBM Plex Mono', monospace",
            }}>
              What VaNi knows about you
            </div>
            <SummaryRow icon={<User size={15} />} label="Your name" value={fullName} />
            <SummaryRow icon={<Building2 size={15} />} label="Company" value={company} />
            <SummaryRow icon={<span style={{ fontSize: 15 }}>{persona?.icon || '❓'}</span>} label="How you operate" value={persona?.label || null} />
            <SummaryRow icon={<Palette size={15} />} label="Workspace theme" value={savedThemeName} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${colors.brand.primary}10`, border: `1px solid ${colors.brand.primary}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.brand.primary,
              }}><Layers size={15} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 1 }}>Industries selected</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: industryCount > 0 ? colors.utility.primaryText : `${colors.utility.secondaryText}70` }}>
                  {industriesLoading ? 'Loading…' : industryCount > 0 ? `${industryCount} ${industryCount === 1 ? 'industry' : 'industries'}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ── What VaNi will build — dynamic from ResourcePickStep ── */}
          {(selEquipment.length > 0 || selFacility.length > 0) && (
            <div style={{
              background: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}14`,
              borderRadius: 16, overflow: 'hidden', marginBottom: 20,
            }}>
              <div style={{
                padding: '12px 16px', background: `${colors.brand.primary}08`,
                borderBottom: `1px solid ${colors.utility.primaryText}10`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: colors.brand.primary, fontFamily: "'IBM Plex Mono', monospace" }}>
                  What VaNi will build
                </span>
                {blockCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                    color: VANI, background: VANI_SOFT, border: `1px solid ${VANI_BORDER}`,
                    borderRadius: 100, padding: '2px 10px',
                  }}>
                    {blockCount} blocks
                  </span>
                )}
              </div>

              {/* Equipment section (seller / both) */}
              {selEquipment.length > 0 && (
                <div style={{ padding: '14px 16px', borderBottom: selFacility.length > 0 ? `1px solid ${colors.utility.primaryText}08` : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 3, height: 16, borderRadius: 2, background: BLUE }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.6, color: BLUE }}>
                        Equipment types
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace", background: BLUE_BG, border: `1px solid ${BLUE}20`, borderRadius: 100, padding: '1px 8px' }}>
                        {selEquipment.length} types × 3 tiers = {blockCount} blocks
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {selEquipment.map(t => <TemplateChip key={t.id} t={t} accent={BLUE} />)}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: colors.utility.secondaryText }}>
                    Each type → <strong>Basic AMC</strong> · <strong>Comprehensive AMC</strong> · <strong>Premium CMC</strong>
                  </div>
                </div>
              )}

              {/* Facility section (buyer / both) */}
              {selFacility.length > 0 && (
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: PURPLE }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.6, color: PURPLE }}>
                      Facility types
                    </span>
                    <span style={{ fontSize: 10, color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace", background: PURPLE_BG, border: `1px solid ${PURPLE}20`, borderRadius: 100, padding: '1px 8px', marginLeft: 6 }}>
                      {selFacility.length} types
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {selFacility.map(t => <TemplateChip key={t.id} t={t} accent={PURPLE} />)}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: colors.utility.secondaryText }}>
                    Each type → <strong>placeholder instances</strong> for you to confirm in the next step
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── What VaNi will do ── */}
          {persona && (
            <div style={{
              background: `${colors.brand.primary}06`,
              border: `1px solid ${colors.brand.primary}20`,
              borderRadius: 16, padding: '16px 20px', marginBottom: 28,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.6px', color: colors.brand.primary,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 14,
              }}>
                What VaNi will do
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {persona.whatVaniDoes.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle2 size={15} style={{ color: colors.brand.primary, flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: colors.utility.secondaryText, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: item }} />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={15} style={{ color: colors.brand.primary, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: colors.utility.secondaryText, lineHeight: 1.55 }}>
                    Provision your <strong>cloud storage</strong> for logos, documents, and contract attachments
                  </span>
                </div>
              </div>
            </div>
          )}

          <VaniBubble msg={`This takes about <strong>10–20 seconds</strong>. You don't need to do anything — just sit back and watch.`} />
        </div>
      </div>

      {/* ── Floating action island ── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: `${colors.accent.accent1}f0`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap' as const, fontFamily: "'Outfit', sans-serif",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {blockCount > 0
            ? `${blockCount} blocks · ${selEquipment.length} types · ${selFacility.length > 0 ? `${selFacility.length} assets · ` : ''}ready`
            : 'VaNi is ready to build your workspace'}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          type="button"
          onClick={() => navigate('/onboarding/resource-pick')}
          style={{ padding: '10px 20px', borderRadius: 100, border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
        >← Back</button>
        <button
          type="button"
          onClick={handleStart}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
            color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 8px 24px ${colors.brand.primary}50`,
            transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 12px 32px ${colors.brand.primary}70`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 8px 24px ${colors.brand.primary}50`; }}
        >
          Set up my workspace <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
};

export default VaniConsentStep;

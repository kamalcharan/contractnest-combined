// src/pages/onboarding/steps/VaniIntelligenceStep.tsx
// Screen 6A — VaNi Gathering Intelligence
// Fetches KT summary per selected template, renders:
//   Equipment templates → Service Catalog · Contract Templates · Equipment Types
//   Facility templates  → Facility Spaces (variants are zones/rooms)
//   Right panel         → dark VaNi Intelligence stats + Compliance card
// CTA: "VaNi, set this up →" → /onboarding/vani-working

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { supabase } from '@/utils/supabase';
import type { ResourceTemplate } from '@/services/resourcesService';
import type { KnowledgeTreeSummary } from '@/pages/service-contracts/templates/admin/knowledge-tree/types';

// ── Color tokens ──────────────────────────────────────────────────────────────
const VANI        = '#ff6b2b';
const VANI_SOFT   = '#fff8f4';
const VANI_BORDER = 'rgba(255,107,43,.2)';
const TEXT        = '#1a1816';
const TEXT_MID    = '#4a4540';
const TEXT_DIM    = '#8a847a';
const TEXT_MUTED  = '#bab4a8';
const BORDER      = '#e5e1db';
const BORDER_LT   = '#edeae4';
const SURFACE     = '#faf9f7';
const BG          = '#f7f5f2';
const WHITE       = '#ffffff';
const GREEN       = '#16a34a';

const normalizePersona = (raw: string) => {
  if (raw === 'service_provider') return 'seller';
  if (raw === 'merchant')         return 'buyer';
  if (raw === 'seller' || raw === 'buyer' || raw === 'both') return raw as 'seller' | 'buyer' | 'both';
  return 'seller';
};

// Human-readable labels for KT service_activity codes
const ACTIVITY_LABEL: Record<string, string> = {
  pm:           'Preventive Maintenance',
  inspection:   'Inspection',
  repair:       'Repair & Breakdown',
  install:      'Installation',
  decommission: 'Decommission',
};

// ── KT fetch helper ───────────────────────────────────────────────────────────
async function fetchKTSummary(templateId: string): Promise<KnowledgeTreeSummary | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwyqhzotluikawcboldr.supabase.co';
    const anonKey    = import.meta.env.VITE_SUPABASE_KEY;
    const url = new URL(`${supabaseUrl}/functions/v1/knowledge-tree/summary`);
    url.searchParams.set('resource_template_id', templateId);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-is-admin': 'true' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    if (anonKey) headers['apikey'] = anonKey;
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const VaniIntelligenceStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const { user } = useAuth();
  const { formData } = useTenantProfile({ isOnboarding: true });
  const { industries } = useServedIndustriesManager();

  const routeState    = (location.state || {}) as Record<string, any>;
  const selEquipment: ResourceTemplate[] = (routeState.selectedEquipmentTemplates || []).filter(Boolean);
  const selFacility:  ResourceTemplate[] = (routeState.selectedFacilityTemplates  || []).filter(Boolean);
  const workIntent: string | null        = routeState.workIntent || null;

  const personaId  = normalizePersona(formData.business_type_id || '');
  const tenantName = formData.company_name || currentTheme?.name || 'your business';
  const firstName  = user?.first_name?.trim() || null;
  const industryName = industries?.[0]?.name || '';

  // ── KT fetch state ─────────────────────────────────────────────────────────
  const [summaries, setSummaries]   = useState<KnowledgeTreeSummary[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [fetchPhase, setFetchPhase] = useState('Connecting to Knowledge Tree…');

  useEffect(() => {
    if (selEquipment.length === 0 && selFacility.length === 0) {
      setLoading(false);
      return;
    }

    const phases = [
      'Connecting to Knowledge Tree…',
      'Reading equipment variants…',
      'Matching service cycles…',
      'Computing block definitions…',
    ];
    let pi = 0;
    const phaseTimer = setInterval(() => {
      pi = Math.min(pi + 1, phases.length - 1);
      setFetchPhase(phases[pi]);
    }, 600);

    const allTemplates = [...selEquipment, ...selFacility];
    Promise.all(allTemplates.map(t => fetchKTSummary(t.id))).then(results => {
      clearInterval(phaseTimer);
      setFetchPhase('Intelligence ready ✓');
      setSummaries(results.filter(Boolean) as KnowledgeTreeSummary[]);
      setLoading(false);
    });

    return () => clearInterval(phaseTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  // Separate summaries by whether the template was equipment or facility
  const eqSummaries  = useMemo(
    () => summaries.filter(s => selEquipment.some(e => e.id === s.resource_template.id)),
    [summaries, selEquipment]
  );
  const facSummaries = useMemo(
    () => summaries.filter(s => selFacility.some(f => f.id === s.resource_template.id)),
    [summaries, selFacility]
  );

  // Unique service activities across all equipment templates
  const serviceActivities = useMemo(
    () => [...new Set(eqSummaries.flatMap(s => s.summary?.service_activities || []))],
    [eqSummaries]
  );

  // Total cycle (block) count across equipment templates
  const totalBlocks = useMemo(
    () => eqSummaries.reduce((sum, s) => sum + (s.summary?.cycles_count || 0), 0),
    [eqSummaries]
  );

  // Contract templates derived from service activities (one Agreement per activity)
  const contractTemplates = useMemo(
    () => serviceActivities.map(a => `${ACTIVITY_LABEL[a] || a} Agreement`),
    [serviceActivities]
  );

  // Equipment type cards: template name + variant list
  const equipmentGroups = useMemo(
    () => eqSummaries.map(s => ({
      name:     s.resource_template.name,
      variants: (s.variants || []) as any[],
    })),
    [eqSummaries]
  );

  // Facility space cards: template name + zone/space list
  const facilityGroups = useMemo(
    () => facSummaries.map(s => ({
      name:   s.resource_template.name,
      spaces: (s.variants || []) as any[],
    })),
    [facSummaries]
  );

  // Compliance standards across ALL summaries (equipment + facility)
  const complianceStandards = useMemo(
    () => [...new Set(summaries.flatMap(s => s.summary?.compliance_standards || []))],
    [summaries]
  );

  const hasEquipment = selEquipment.length > 0;
  const hasFacility  = selFacility.length > 0;

  const handleConfirm = () => {
    navigate('/onboarding/vani-working', {
      state: { ...routeState, selectedEquipmentTemplates: selEquipment, selectedFacilityTemplates: selFacility, workIntent },
    });
  };

  // ── Sub-components ─────────────────────────────────────────────────────────
  const Section = ({
    title, count, children,
  }: { title: string; count: string; children: React.ReactNode }) => (
    <div style={{
      background: WHITE, border: `1px solid ${BORDER}`,
      borderRadius: 14, padding: '22px 24px',
      marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: .8, color: TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}>
          {title}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: VANI, background: VANI_SOFT, border: `1px solid ${VANI_BORDER}`, padding: '3px 10px', borderRadius: 100 }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
        {children}
      </div>
    </div>
  );

  const Item = ({ title, sub, delay = 0 }: { title: React.ReactNode; sub?: string; delay?: number }) => (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: SURFACE, border: `1px solid ${BORDER_LT}`,
      opacity: loading ? 0.4 : 1,
      transform: loading ? 'translateX(-8px)' : 'translateX(0)',
      transition: `opacity .35s ease ${delay}ms, transform .35s ease ${delay}ms`,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: VANI_BORDER, flexShrink: 0, marginTop: 5 }} />
      <div>
        <div style={{ fontSize: 13, color: TEXT }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${VANI}22`, borderTopColor: VANI, borderRadius: '50%', margin: '0 auto 20px', animation: 'spin .8s linear infinite' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>VaNi Gathering Knowledge Intelligence</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, animation: 'pulse 1.4s ease infinite' }}>{fetchPhase}</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes bIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ flex: 1, backgroundColor: BG, display: 'flex', flexDirection: 'column' as const, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: '1fr 300px',
          maxWidth: 1100, margin: '0 auto',
          padding: '40px 24px 140px',
          width: '100%', alignItems: 'start',
          gap: 0,
        }}>

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* VaNi bubble */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'bIn .5s cubic-bezier(.22,1,.36,1) both' }}>
              <div style={{
                width: 36, height: 36, flexShrink: 0,
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
                borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, color: WHITE,
                boxShadow: `0 3px 8px ${colors.brand.primary}40`, marginTop: 2,
              }}>V</div>
              <div style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: '3px 14px 14px 14px',
                padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                fontSize: 14, color: TEXT_MID, lineHeight: 1.6, maxWidth: 520,
              }}>
                Here's what I found for <strong style={{ color: TEXT }}>{tenantName}</strong>.{' '}
                Once you confirm, I'll set everything up — you'll only need to set your prices.
              </div>
            </div>

            {/* Time estimate */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 20px', background: VANI_SOFT,
              border: `1px solid ${VANI_BORDER}`, borderRadius: 8, marginBottom: 14,
            }}>
              <span style={{ fontSize: 18 }}>⏱</span>
              <div style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.5 }}>
                <strong style={{ color: TEXT }}>About 90 seconds.</strong>{' '}
                VaNi will generate your service catalog, contract templates, and compliance checklists automatically.
              </div>
            </div>

            {/* ── SERVICE CATALOG (equipment templates) ── */}
            {hasEquipment && (
              <Section title="Service Catalog" count={`${totalBlocks} blocks`}>
                {serviceActivities.length > 0
                  ? serviceActivities.map((a, i) => (
                      <Item key={a} delay={i * 50}
                        title={<strong>{ACTIVITY_LABEL[a] || a}</strong>}
                        sub={`${eqSummaries.filter(s => (s.summary?.service_activities || []).includes(a)).map(s => s.resource_template.name).join(', ')}`}
                      />
                    ))
                  : <Item title="Service activities will be generated from industry defaults" />
                }
              </Section>
            )}

            {/* ── CONTRACT TEMPLATES (equipment templates) ── */}
            {hasEquipment && contractTemplates.length > 0 && (
              <Section title="Contract Templates" count={`${contractTemplates.length} templates`}>
                {contractTemplates.map((t, i) => (
                  <Item key={t} delay={i * 60} title={<strong>{t}</strong>} />
                ))}
              </Section>
            )}

            {/* ── EQUIPMENT TYPES (equipment templates) ── */}
            {hasEquipment && equipmentGroups.length > 0 && (
              <Section
                title="Equipment Types"
                count={`${equipmentGroups.reduce((n, g) => n + g.variants.length, 0)} variants`}
              >
                {equipmentGroups.map((g, gi) => {
                  const shown = g.variants.slice(0, 4);
                  const extra = g.variants.length - shown.length;
                  return (
                    <div key={g.name}>
                      {equipmentGroups.length > 1 && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase' as const, letterSpacing: .5, marginBottom: 4, marginTop: gi > 0 ? 10 : 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {g.name}
                        </div>
                      )}
                      {shown.map((v: any, i: number) => (
                        <Item key={v.id || v.name} delay={i * 45}
                          title={<strong>{v.name}</strong>}
                          sub={v.capacity_range ? v.capacity_range : (v.description || undefined)}
                        />
                      ))}
                      {extra > 0 && (
                        <div style={{ fontSize: 12, color: TEXT_MUTED, padding: '4px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                          + {extra} more variants
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            )}

            {/* ── FACILITY SPACES (facility/asset templates) ── */}
            {hasFacility && facilityGroups.length > 0 && (
              <Section
                title="Facility Spaces"
                count={`${facilityGroups.reduce((n, g) => n + g.spaces.length, 0)} zones`}
              >
                {facilityGroups.map((g, gi) => {
                  const shown = g.spaces.slice(0, 6);
                  const extra = g.spaces.length - shown.length;
                  return (
                    <div key={g.name}>
                      {facilityGroups.length > 1 && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase' as const, letterSpacing: .5, marginBottom: 4, marginTop: gi > 0 ? 10 : 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {g.name}
                        </div>
                      )}
                      {shown.map((sp: any, i: number) => (
                        <Item key={sp.id || sp.name} delay={i * 45}
                          title={<strong>{sp.name}</strong>}
                          sub={sp.description || undefined}
                        />
                      ))}
                      {extra > 0 && (
                        <div style={{ fontSize: 12, color: TEXT_MUTED, padding: '4px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                          + {extra} more zones
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Fallback when no selections */}
            {selEquipment.length === 0 && selFacility.length === 0 && (
              <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No templates selected</div>
                <div style={{ fontSize: 13, color: TEXT_DIM }}>Go back and select at least one equipment or facility type.</div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ position: 'sticky' as const, top: 84, paddingLeft: 24 }}>

            {/* Dark VaNi Intelligence card */}
            <div style={{
              background: 'linear-gradient(145deg, #1a1816, #2a2520)',
              border: '1px solid rgba(255,107,43,.12)',
              borderRadius: 14, marginBottom: 12, overflow: 'hidden',
            }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)' }}>
                  VaNi Intelligence
                </span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {([
                  ['Tenant',     tenantName,                                      false],
                  ['Industry',   industryName || '—',                             true],
                  ['Persona',    personaId === 'seller' ? 'Seller' : personaId === 'buyer' ? 'Buyer' : 'Both', false],
                  ...(hasEquipment ? [
                    ['Eq. Types',  String(selEquipment.length),                    true],
                    ['Blocks',     totalBlocks > 0 ? String(totalBlocks) : '—',   true],
                    ['Templates',  String(contractTemplates.length || '—'),         true],
                  ] : []),
                  ...(hasFacility ? [
                    ['Facilities', String(selFacility.length),                     true],
                    ['Zones',      String(facilityGroups.reduce((n, g) => n + g.spaces.length, 0) || '—'), true],
                  ] : []),
                  ['Compliance', String(complianceStandards.length || '—'),        true],
                  ['Pricing',    'after setup',                                    null],
                ] as [string, string, boolean | null][]).map(([k, v, accent]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{k}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: accent === null ? 'rgba(255,255,255,.25)' : accent ? VANI : '#f0ece6',
                      fontStyle: accent === null ? 'italic' : 'normal',
                      fontFamily: accent === null ? "'Outfit', sans-serif" : "'IBM Plex Mono', monospace",
                    }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance card (light) */}
            {complianceStandards.length > 0 && (
              <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{ padding: '13px 18px 10px', borderBottom: `1px solid ${BORDER_LT}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED }}>
                    Compliance
                  </span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {complianceStandards.map(c => (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${BORDER_LT}` }}>
                      <span style={{ fontSize: 11, color: TEXT_DIM }}>{c}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating action island ── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(26,24,22,.94)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap' as const, fontFamily: "'Outfit', sans-serif",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {industryName ? `${industryName} · ` : ''}{totalBlocks > 0 ? `${totalBlocks} blocks` : `${selEquipment.length + selFacility.length} types`}{hasFacility ? ` · ${facilityGroups.reduce((n, g) => n + g.spaces.length, 0)} zones` : ''}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          type="button"
          onClick={() => navigate('/onboarding/vani-consent', { state: { selectedEquipmentTemplates: selEquipment, selectedFacilityTemplates: selFacility, workIntent } })}
          style={{ padding: '10px 20px', borderRadius: 100, border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >← Back</button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selEquipment.length === 0 && selFacility.length === 0}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
            color: WHITE, fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 8px 24px ${VANI}50`,
          }}
        >
          VaNi, set this up →
        </button>
      </div>
    </>
  );
};

export default VaniIntelligenceStep;

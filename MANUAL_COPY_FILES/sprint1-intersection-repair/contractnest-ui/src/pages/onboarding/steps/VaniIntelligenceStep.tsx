// src/pages/onboarding/steps/VaniIntelligenceStep.tsx
// Screen 6A — VaNi Gathering Knowledge Intelligence
// Fetches KT summary per selected template, shows per-template breakdown:
//   Equipment templates → Service Catalog · Equipment Types · Contract Templates
//   Facility templates  → Facility Spaces (zones/rooms from KT variants)
// Right panel: dark VaNi Intelligence stats + Compliance card
// CTA: "VaNi, set this up →" — disables after click to prevent double-submission

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

  const routePersonaId = routeState.personaId as string | undefined;
  const personaId      = normalizePersona(routePersonaId || formData.business_type_id || '');
  const tenantName   = formData.company_name || currentTheme?.name || 'your business';
  const industryName = industries?.[0]?.name || '';

  // ── KT fetch state ─────────────────────────────────────────────────────────
  // Map: templateId → KnowledgeTreeSummary
  const [summaryMap, setSummaryMap] = useState<Record<string, KnowledgeTreeSummary>>({});
  const [loading,    setLoading]    = useState(true);
  const [fetchPhase, setFetchPhase] = useState('Connecting to Knowledge Tree…');
  const [confirmed,  setConfirmed]  = useState(false);  // disables CTA after click

  useEffect(() => {
    // Buyer: assets go to registry, not catalog-studio — no KT fetch needed
    if (personaId === 'buyer') {
      setLoading(false);
      return;
    }
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
      const map: Record<string, KnowledgeTreeSummary> = {};
      results.forEach((r, i) => { if (r) map[allTemplates[i].id] = r; });
      setSummaryMap(map);
      setLoading(false);
    });

    return () => clearInterval(phaseTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Aggregated stats for right panel ───────────────────────────────────────
  const allSummaries = useMemo(() => Object.values(summaryMap), [summaryMap]);

  const totalCycles = useMemo(
    () => selEquipment.reduce((n, t) => n + (summaryMap[t.id]?.summary?.cycles_count || 0), 0),
    [summaryMap, selEquipment]
  );

  const totalZones = useMemo(
    () => selFacility.reduce((n, t) => n + ((summaryMap[t.id]?.variants || []).length), 0),
    [summaryMap, selFacility]
  );

  const allServiceActivities = useMemo(() => {
    const set = new Set<string>();
    selEquipment.forEach(t => (summaryMap[t.id]?.summary?.service_activities || []).forEach((a: string) => set.add(a)));
    return [...set];
  }, [summaryMap, selEquipment]);

  const contractTemplates = useMemo(
    () => allServiceActivities.map(a => `${ACTIVITY_LABEL[a] || a} Agreement`),
    [allServiceActivities]
  );

  const complianceStandards = useMemo(
    () => [...new Set(allSummaries.flatMap(s => s.summary?.compliance_standards || []))],
    [allSummaries]
  );

  const handleConfirm = () => {
    if (confirmed) return;
    setConfirmed(true);
    navigate('/onboarding/vani-working', {
      state: {
        ...routeState,
        selectedEquipmentTemplates: selEquipment,
        selectedFacilityTemplates:  selFacility,
        workIntent,
      },
    });
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const SectionHeader = ({ title, count }: { title: string; count: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: .8, color: TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}>
        {title}
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: VANI, background: VANI_SOFT, border: `1px solid ${VANI_BORDER}`, padding: '2px 8px', borderRadius: 100 }}>
        {count}
      </span>
    </div>
  );

  const Chip = ({ label, sub }: { label: string; sub?: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 7, background: SURFACE, border: `1px solid ${BORDER_LT}` }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: VANI_BORDER, flexShrink: 0, marginTop: 5 }} />
      <div>
        <div style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );

  // ── Per-template card ───────────────────────────────────────────────────────
  const TemplateCard = ({ template, isEquipment }: { template: ResourceTemplate; isEquipment: boolean }) => {
    const s = summaryMap[template.id];
    const variants = (s?.variants || []) as any[];
    const serviceActivities: string[] = s?.summary?.service_activities || [];
    const cyclesCount: number = s?.summary?.cycles_count || 0;
    const compliance: string[] = s?.summary?.compliance_standards || [];

    return (
      <div style={{
        background: WHITE, border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: '20px 22px',
        marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)',
      }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: isEquipment ? `linear-gradient(135deg,${VANI}22,${VANI}08)` : 'linear-gradient(135deg,#0ea5e922,#0ea5e908)',
            border: `1px solid ${isEquipment ? VANI_BORDER : 'rgba(14,165,233,.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {isEquipment ? '🔧' : '🏢'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, letterSpacing: -.3 }}>{template.name}</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>
              {template.sub_category || (isEquipment ? 'Equipment' : 'Facility')}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5,
            padding: '3px 9px', borderRadius: 100,
            background: isEquipment ? VANI_SOFT : '#f0f9ff',
            color: isEquipment ? VANI : '#0ea5e9',
            border: `1px solid ${isEquipment ? VANI_BORDER : 'rgba(14,165,233,.2)'}`,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {isEquipment ? 'Equipment' : 'Facility'}
          </span>
        </div>

        {!s ? (
          <div style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: 'italic', padding: '8px 0' }}>
            {loading ? 'Loading KT data…' : 'No KT data found — will create blocks from defaults'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>

            {/* Equipment: service activities */}
            {isEquipment && serviceActivities.length > 0 && (
              <div>
                <SectionHeader title="Service Catalog" count={`${cyclesCount} blocks`} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {serviceActivities.map((a, i) => (
                    <Chip key={a} label={ACTIVITY_LABEL[a] || a} />
                  ))}
                </div>
              </div>
            )}

            {/* Equipment: variants */}
            {isEquipment && variants.length > 0 && (
              <div>
                <SectionHeader title="Equipment Types" count={`${variants.length} variants`} />
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                  {variants.slice(0, 4).map((v: any) => (
                    <Chip key={v.id || v.name} label={v.name} sub={v.capacity_range || undefined} />
                  ))}
                  {variants.length > 4 && (
                    <div style={{ fontSize: 11, color: TEXT_MUTED, padding: '3px 10px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      + {variants.length - 4} more variants
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Facility: spaces/zones */}
            {!isEquipment && variants.length > 0 && (
              <div>
                <SectionHeader title="Facility Spaces" count={`${variants.length} zones`} />
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                  {variants.slice(0, 5).map((v: any) => (
                    <Chip key={v.id || v.name} label={v.name} sub={v.description || undefined} />
                  ))}
                  {variants.length > 5 && (
                    <div style={{ fontSize: 11, color: TEXT_MUTED, padding: '3px 10px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      + {variants.length - 5} more zones
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seeding preview footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 8,
              background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)',
              border: '1px solid #bbf7d0',
            }}>
              <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                Will seed →
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                {isEquipment && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {cyclesCount} blocks
                  </span>
                )}
                {!isEquipment && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {variants.length} zone nodes
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#15803d', opacity: .7 }}>test + live</span>
              </div>
            </div>

            {/* Compliance */}
            {compliance.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginTop: -4 }}>
                {compliance.map(c => (
                  <span key={c} style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 100,
                    background: '#f0fdf4', color: GREEN,
                    border: '1px solid #bbf7d0', fontWeight: 600,
                  }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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

  // ── Buyer-specific render (no KT data — just registry preview) ────────────
  if (personaId === 'buyer') {
    return (
      <>
        <style>{`@keyframes bIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ flex: 1, backgroundColor: BG, display: 'flex', flexDirection: 'column' as const, fontFamily: "'Outfit', sans-serif" }}>
          <div style={{
            flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px',
            maxWidth: 1100, margin: '0 auto', padding: '40px 24px 140px',
            width: '100%', alignItems: 'start', gap: 0,
          }}>
            {/* LEFT COLUMN */}
            <div>
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
                  Here's what I'll register for <strong style={{ color: TEXT }}>{tenantName}</strong>.
                  Your assets will be tracked in the registry — no catalog setup required.
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 18px', background: '#eff6ff',
                border: '1px solid rgba(37,99,235,.2)', borderRadius: 8, marginBottom: 20,
              }}>
                <span style={{ fontSize: 16 }}>🏢</span>
                <div style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.5 }}>
                  <strong style={{ color: TEXT }}>Registry setup — about 30 seconds.</strong>{' '}
                  Equipment and facilities will be added to your asset registry for vendor and maintenance tracking.
                </div>
              </div>

              {selEquipment.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, color: TEXT_DIM, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Equipment Registry
                  </div>
                  {selEquipment.map(t => (
                    <div key={t.id} style={{
                      background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14,
                      padding: '16px 20px', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg,#2563eb22,#2563eb08)',
                        border: '1px solid rgba(37,99,235,.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      }}>🔧</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>{t.sub_category || 'Equipment'}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5,
                        padding: '3px 9px', borderRadius: 100,
                        background: '#eff6ff', color: '#2563eb', border: '1px solid rgba(37,99,235,.2)',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>→ Registry</span>
                    </div>
                  ))}
                </>
              )}

              {selFacility.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, color: TEXT_DIM, marginBottom: 10, marginTop: selEquipment.length > 0 ? 8 : 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Facility Registry
                  </div>
                  {selFacility.map(t => (
                    <div key={t.id} style={{
                      background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14,
                      padding: '16px 20px', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg,#8B5CF622,#8B5CF608)',
                        border: '1px solid rgba(139,92,246,.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      }}>🏢</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>{t.sub_category || 'Facility'}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5,
                        padding: '3px 9px', borderRadius: 100,
                        background: '#f5f3ff', color: '#8B5CF6', border: '1px solid rgba(139,92,246,.2)',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>→ Registry</span>
                    </div>
                  ))}
                </>
              )}

              {selEquipment.length === 0 && selFacility.length === 0 && (
                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No items selected</div>
                  <div style={{ fontSize: 13, color: TEXT_DIM }}>Go back and select at least one equipment or facility type.</div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div style={{ position: 'sticky' as const, top: 84, paddingLeft: 24 }}>
              <div style={{
                background: 'linear-gradient(145deg, #1a1816, #2a2520)',
                border: '1px solid rgba(255,107,43,.12)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div style={{ padding: '13px 18px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)' }}>
                    VaNi Intelligence
                  </span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {([
                    ['Tenant',       tenantName,                false],
                    ['Industry',     industryName || '—',       true],
                    ['Persona',      'Asset Owner',             false],
                    ...(selEquipment.length > 0 ? [['Eq. Types',   String(selEquipment.length), true]] : []),
                    ...(selFacility.length  > 0 ? [['Facilities',  String(selFacility.length),  true]] : []),
                    ['Setup',        'Asset Registry',          true],
                    ['Environments', 'test + live',             null],
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
            </div>
          </div>
        </div>

        {/* Floating action island */}
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
            {industryName ? `${industryName} · ` : ''}
            {selEquipment.length > 0 ? `${selEquipment.length} equipment` : ''}
            {selEquipment.length > 0 && selFacility.length > 0 ? ' · ' : ''}
            {selFacility.length > 0 ? `${selFacility.length} facilit${selFacility.length === 1 ? 'y' : 'ies'}` : ''}
            {' · registry'}
          </span>
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
          <button
            type="button"
            disabled={confirmed}
            onClick={() => navigate('/onboarding/vani-consent', { state: { selectedEquipmentTemplates: selEquipment, selectedFacilityTemplates: selFacility, selectedServiceTemplates: routeState.selectedServiceTemplates || [], workIntent, personaId: routePersonaId } })}
            style={{ padding: '10px 20px', borderRadius: 100, border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: confirmed ? 'not-allowed' : 'pointer', opacity: confirmed ? .4 : 1 }}
          >← Back</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed || (selEquipment.length === 0 && selFacility.length === 0)}
            style={{
              padding: '10px 24px', borderRadius: 100, border: 'none',
              background: confirmed ? 'rgba(255,255,255,.12)' : `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
              color: confirmed ? 'rgba(255,255,255,.4)' : WHITE,
              fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
              cursor: confirmed ? 'not-allowed' : 'pointer',
              boxShadow: confirmed ? 'none' : `0 8px 24px ${VANI}50`,
              transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {confirmed
              ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'rgba(255,255,255,.8)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Setting up…</>
              : 'VaNi, set this up →'
            }
          </button>
        </div>
      </>
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
          width: '100%', alignItems: 'start', gap: 0,
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
                Here's what I found for <strong style={{ color: TEXT }}>{tenantName}</strong>.
                Pricing is pre-filled from KT reference data — you'll review and set final prices in the next step.
              </div>
            </div>

            {/* Time estimate */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', background: VANI_SOFT,
              border: `1px solid ${VANI_BORDER}`, borderRadius: 8, marginBottom: 20,
            }}>
              <span style={{ fontSize: 16 }}>⏱</span>
              <div style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.5 }}>
                <strong style={{ color: TEXT }}>About 90 seconds.</strong>{' '}
                Blocks seed into both test and live environments. You set final prices after.
              </div>
            </div>

            {/* ── Per-template cards (equipment) ── */}
            {selEquipment.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, color: TEXT_DIM, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Equipment Templates
                </div>
                {selEquipment.map(t => (
                  <TemplateCard key={t.id} template={t} isEquipment={true} />
                ))}
              </>
            )}

            {/* ── Per-template cards (facility) ── */}
            {selFacility.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, color: TEXT_DIM, marginBottom: 10, marginTop: selEquipment.length > 0 ? 8 : 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Facility Templates
                </div>
                {selFacility.map(t => (
                  <TemplateCard key={t.id} template={t} isEquipment={false} />
                ))}
              </>
            )}

            {/* ── Contract templates (derived from service activities across all equipment) ── */}
            {contractTemplates.length > 0 && (
              <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <SectionHeader title="Contract Templates" count={`${contractTemplates.length} templates`} />
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  {contractTemplates.map((t, i) => (
                    <Chip key={t} label={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Fallback */}
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
                  ['Tenant',       tenantName,                          false],
                  ['Industry',     industryName || '—',                 true],
                  ['Persona',      personaId === 'seller' ? 'Seller' : personaId === 'buyer' ? 'Buyer' : 'Both', false],
                  ...(selEquipment.length > 0 ? [
                    ['Eq. Types',  String(selEquipment.length),         true],
                    ['Blocks',     totalCycles > 0 ? String(totalCycles) : '—', true],
                    ['Templates',  String(contractTemplates.length || '—'), true],
                  ] : []),
                  ...(selFacility.length > 0 ? [
                    ['Facilities', String(selFacility.length),          true],
                    ['Zones',      totalZones > 0 ? String(totalZones) : '—', true],
                  ] : []),
                  ['Compliance',   String(complianceStandards.length || '—'), true],
                  ['Environments', 'test + live',                       null],
                  ['Pricing',      'you set next →',                    null],
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

            {/* Compliance card */}
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
          {industryName ? `${industryName} · ` : ''}
          {totalCycles > 0 ? `${totalCycles} blocks` : `${selEquipment.length} eq`}
          {totalZones > 0 ? ` · ${totalZones} zones` : ''}
          {' · test + live'}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          type="button"
          disabled={confirmed}
          onClick={() => navigate('/onboarding/vani-consent', { state: { selectedEquipmentTemplates: selEquipment, selectedFacilityTemplates: selFacility, selectedServiceTemplates: routeState.selectedServiceTemplates || [], workIntent, personaId: routePersonaId } })}
          style={{ padding: '10px 20px', borderRadius: 100, border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: confirmed ? 'not-allowed' : 'pointer', opacity: confirmed ? .4 : 1 }}
        >← Back</button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmed || (selEquipment.length === 0 && selFacility.length === 0)}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: confirmed
              ? 'rgba(255,255,255,.12)'
              : `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
            color: confirmed ? 'rgba(255,255,255,.4)' : WHITE,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: confirmed ? 'not-allowed' : 'pointer',
            boxShadow: confirmed ? 'none' : `0 8px 24px ${VANI}50`,
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {confirmed
            ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'rgba(255,255,255,.8)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Setting up…</>
            : 'VaNi, set this up →'
          }
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
};

export default VaniIntelligenceStep;

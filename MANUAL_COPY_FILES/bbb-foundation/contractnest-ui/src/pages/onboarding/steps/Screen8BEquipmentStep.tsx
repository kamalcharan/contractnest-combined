// src/pages/onboarding/steps/Screen8BEquipmentStep.tsx
// Screen 8B — Facility / Asset Registry Confirm (Buyer / Both)
// Fetches real seeded placeholder assets (ownership_type=self, is_live=false).
// User confirms and optionally renames each asset.
// On confirm: PATCH all assets with updated name + is_live=true.
// Navigation: /onboarding/done

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantAsset {
  id: string;
  name: string;
  code?: string;
  resource_type_id?: string;
  asset_type_id?: string;
  template_id?: string | null;
  parent_asset_id?: string | null;
  ownership_type?: string;
  is_live?: boolean;
  specifications?: Record<string, any>;
}

// ── Color tokens ──────────────────────────────────────────────────────────────

const VANI        = '#ff6b2b';
const TEXT        = '#1a1816';
const TEXT_DIM    = '#8a847a';
const TEXT_MUTED  = '#bab4a8';
const BORDER      = '#e5e1db';
const BORDER_LT   = '#edeae4';
const WHITE       = '#ffffff';
const BG          = '#f7f5f2';
const SURFACE     = '#faf9f7';
const GREEN       = '#16a34a';
const GREEN_BG    = '#f0fdf4';
const GREEN_BORDER = '#bbf7d0';
const DARK_BG     = 'linear-gradient(145deg, #1a1816, #2a2520)';

// ── Component ─────────────────────────────────────────────────────────────────

const Screen8BEquipmentStep: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;

  const persona                  = (routeState.persona       || 'buyer') as string;
  const companyName              = (routeState.companyName   || '') as string;
  const industryNames            = (routeState.industryNames || []) as string[];
  const selectedFacilityTemplates: any[] = routeState.selectedFacilityTemplates || [];

  const industryLabel = industryNames[0] || 'your industry';

  // ── Data loading ──────────────────────────────────────────────────────────

  const [assets, setAssets]       = useState<TenantAsset[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edits: id → display name
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  // Active inline edit
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const resp = await api.get('/api/client-asset-registry', {
          params: { ownership_type: 'self', is_live: false, limit: 200 },
        });
        const raw: TenantAsset[] = resp.data?.assets || resp.data?.data || (Array.isArray(resp.data) ? resp.data : []);
        // Filter to placeholder nodes seeded during onboarding
        const placeholders = raw.filter(a => a.specifications?.is_placeholder === true || a.ownership_type === 'self');
        setAssets(placeholders);
        const names: Record<string, string> = {};
        placeholders.forEach(a => { names[a.id] = a.name; });
        setEditNames(names);
      } catch {
        setLoadError('Could not load facility assets. You can update them later in the registry.');
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // ── Grouping by facility template ─────────────────────────────────────────

  interface AssetGroup {
    templateId: string;
    templateName: string;
    assets: TenantAsset[];
  }

  const groups = useMemo((): AssetGroup[] => {
    if (selectedFacilityTemplates.length === 0) {
      return assets.length > 0 ? [{ templateId: 'all', templateName: `${industryLabel} Assets`, assets }] : [];
    }
    const map: Record<string, TenantAsset[]> = {};
    assets.forEach(a => {
      // Seeded entries carry template_id = m_catalog_resource_templates.id,
      // which is what selectedFacilityTemplates ids actually are.
      const key = a.template_id || a.resource_type_id || a.asset_type_id || 'other';
      (map[key] = map[key] || []).push(a);
    });
    const result: AssetGroup[] = [];
    selectedFacilityTemplates.forEach((t: any) => {
      const grouped = map[t.id];
      if (grouped?.length) {
        result.push({ templateId: t.id, templateName: t.name, assets: grouped });
        delete map[t.id];
      }
    });
    // Any leftover assets not matched to a template
    Object.entries(map).forEach(([key, ungrouped]) => {
      if (ungrouped.length) result.push({ templateId: key, templateName: 'Other', assets: ungrouped });
    });
    return result;
  }, [assets, selectedFacilityTemplates, industryLabel]);

  const totalAssets     = assets.length;
  const progressPct     = totalAssets > 0 ? 100 : 0;

  // ── Actions ───────────────────────────────────────────────────────────────

  const startEdit = (id: string) => setEditingId(id);
  const saveEdit  = (id: string) => setEditingId(null);

  const handleConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await Promise.all(
        assets.map(a =>
          api.patch(
            '/api/client-asset-registry',
            { name: editNames[a.id] || a.name, is_live: true },
            { params: { id: a.id } },
          )
        )
      );
      completeVaniStep('equipment-confirm', {
        confirmed: true,
        assets_confirmed: totalAssets,
        renamed: assets.filter(a => (editNames[a.id] || a.name) !== a.name).length,
      });
      navigate('/onboarding/lov-setup', { state: { ...routeState, facilityConfirmed: true, assetsConfirmed: totalAssets } });
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || 'Failed to save registry. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = () => navigate('/onboarding/lov-setup', { state: routeState });

  const handleBack = () => {
    const prevRoute = persona === 'both' ? '/onboarding/pricing-review' : '/onboarding/vani-working';
    navigate(prevRoute, { state: routeState });
  };

  const islandLabel = saving ? 'Saving registry…' : `${totalAssets} asset${totalAssets !== 1 ? 's' : ''} ready to confirm`;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: TEXT_DIM, fontSize: 14 }}>Loading your facility registry…</p>
          </div>
        </div>
      </>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!loading && assets.length === 0) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
          <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏥</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 8 }}>No facility assets found</h2>
            <p style={{ color: TEXT_DIM, marginBottom: 8, lineHeight: 1.6 }}>
              {loadError || 'No placeholder assets were seeded for your industries.'}
            </p>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 28 }}>
              You can add assets directly in the facility registry after onboarding.
            </p>
            <button onClick={handleSkip} style={{ padding: '12px 32px', borderRadius: 100, border: 'none', background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`, color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,107,43,.3)' }}>
              Continue →
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Full UI ───────────────────────────────────────────────────────────────

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .eq-row:hover { background: ${SURFACE} !important; }
        .s8b-edit-btn:hover { border-color: ${VANI} !important; color: ${VANI} !important; background: #fff4ee !important; }
        .s8b-skip:hover { text-decoration: underline; }
      `}} />

      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          maxWidth: 1100, margin: '0 auto',
          padding: '40px 24px 160px',
          alignItems: 'start',
        }}>

          {/* ── Left column ── */}
          <div>

            {/* VaNi bubble */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, animation: 'fadeIn .5s ease both' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, color: '#fff',
              }}>V</div>
              <div style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: '0 12px 12px 12px',
                padding: '12px 16px', fontSize: 14,
                color: TEXT, lineHeight: 1.55, flex: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,.05)',
              }}>
                I've created placeholder entries for common <strong>{industryLabel} facilities</strong>.
                {companyName && <> Edit the names to match what <strong>{companyName}</strong> actually has.</>}
                {!companyName && <> Rename anything that doesn't match your setup.</>}
              </div>
            </div>

            {saveError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
                {saveError}
              </div>
            )}

            {/* Asset groups — one card per facility type */}
            {groups.map((group, gIdx) => (
              <div key={group.templateId} style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,.06)',
                marginBottom: 16,
                animation: `fadeIn .4s ease ${gIdx * 0.1}s both`,
              }}>
                {/* Card header */}
                <div style={{
                  padding: '14px 20px',
                  background: SURFACE,
                  borderBottom: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{group.templateName}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                    background: GREEN_BG, color: GREEN,
                    border: `1px solid ${GREEN_BORDER}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {group.assets.length} placeholder{group.assets.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Asset rows */}
                {group.assets.map((asset, aIdx) => {
                  const isEditing  = editingId === asset.id;
                  const displayName = editNames[asset.id] ?? asset.name;

                  return (
                    <div
                      key={asset.id}
                      className="eq-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        alignItems: 'center', gap: 12,
                        padding: '13px 20px',
                        borderBottom: aIdx < group.assets.length - 1 ? `1px solid ${BORDER_LT}` : 'none',
                        transition: 'background .2s ease',
                        animation: `rowIn .35s ease ${(gIdx * 0.1 + aIdx * 0.04)}s both`,
                      }}
                    >
                      {/* Name */}
                      <div>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              autoFocus
                              value={editNames[asset.id] ?? asset.name}
                              onChange={e => setEditNames(prev => ({ ...prev, [asset.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && saveEdit(asset.id)}
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: `1.5px solid ${VANI}`, fontSize: 13,
                                fontFamily: "'Outfit', sans-serif",
                                fontWeight: 600, outline: 'none', flex: 1,
                              }}
                            />
                            <button onClick={() => saveEdit(asset.id)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: VANI, color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>save</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                              {displayName}
                            </div>
                            {asset.code && (
                              <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
                                {asset.code}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Edit button */}
                      {!isEditing && (
                        <button
                          className="s8b-edit-btn"
                          onClick={() => startEdit(asset.id)}
                          style={{
                            padding: '5px 12px', borderRadius: 6,
                            border: `1.5px solid ${BORDER}`, background: 'transparent',
                            fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
                            color: TEXT_DIM, cursor: 'pointer', transition: 'all .15s',
                          }}
                        >rename</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="s8b-skip" onClick={handleSkip} style={{ fontSize: 13, color: TEXT_MUTED, cursor: 'pointer', display: 'inline-block' }}>
              Skip for now — I'll confirm facilities later
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>

            {/* Registry summary — dark card */}
            <div style={{ background: DARK_BG, border: '1px solid rgba(255,107,43,.12)', borderRadius: 14, padding: '20px 22px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)', marginBottom: 12 }}>
                Registry Summary
              </div>
              {[
                { k: 'Total assets',  v: String(totalAssets), accent: true },
                { k: 'Facility types', v: String(groups.length) },
                { k: 'Industry',      v: industryLabel, accent: true },
                { k: 'Status',        v: 'Placeholder', muted: true },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                    color: (row as any).accent ? VANI : (row as any).muted ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.65)',
                    fontStyle: (row as any).muted ? 'italic' : 'normal',
                  }}>{row.v}</span>
                </div>
              ))}
              <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 100, overflow: 'hidden', marginTop: 4 }}>
                <div style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                  borderRadius: 100,
                  width: '100%',
                  transition: 'width .4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: VANI, fontFamily: "'IBM Plex Mono', monospace" }}>Ready</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: "'IBM Plex Mono', monospace" }}>{totalAssets} assets</span>
              </div>
            </div>

            {/* What happens next — light card */}
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED, marginBottom: 12 }}>
                What happens next
              </div>
              {[
                { label: 'Assets go live', desc: 'Marked active in your registry' },
                { label: 'Assign contacts', desc: 'Link equipment to clients' },
                { label: 'Log maintenance', desc: 'Start tracking service history' },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_LT}` : 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action island (fixed bottom) ── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(26,24,22,.94)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {islandLabel}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button onClick={handleBack} style={{ padding: '10px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.65)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: saving ? 'rgba(255,255,255,.1)' : `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
            color: saving ? 'rgba(255,255,255,.35)' : '#fff',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : `0 3px 10px rgba(255,107,43,.5)`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {saving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
          {saving ? 'Saving…' : 'Confirm & go live →'}
        </button>
      </div>
    </>
  );
};

export default Screen8BEquipmentStep;

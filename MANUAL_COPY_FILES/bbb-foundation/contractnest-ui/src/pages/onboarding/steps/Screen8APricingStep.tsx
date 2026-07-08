// src/pages/onboarding/steps/Screen8APricingStep.tsx
// Screen 8A — Pricing Review (Seller / Both)
//
// KT-FIRST redesign (founder review, Sprint 1):
//   - Every block defaults to ITS OWN knowledge-tree median (base_price from the
//     seed) — the old anchor×tier model overwrote KT prices and is gone.
//   - Rows show the real block names; Services and Spare Parts are separate
//     sections per equipment group (spares are priced per unit, not per year).
//   - Per-group market range is computed from the group's actual KT prices
//     (kt_price_min/max when present, else the spread of seeded medians) —
//     no more hardcoded "illustrative" bar.
//   - A bulk-fill control exists ONLY for blocks without KT pricing
//     (e.g. equipment whose KT has no price data yet).
//   - Confirm PATCHes only blocks whose price differs from the seeded value —
//     accepting KT prices is a no-op, not 100 writes.
//
// Navigation: seller → /onboarding/done | both → /onboarding/equipment-confirm

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatBlock {
  id: string;
  name: string;
  block_type_id?: string;
  base_price?: number | null;
  currency?: string;
  resource_template_id?: string;
  is_seed?: boolean;
  config?: {
    kt_reference_price?: number | null;
    kt_price_min?: number | null;
    kt_price_max?: number | null;
    selectedResources?: Array<{ resource_name?: string }>;
  };
}

interface BlockGroup {
  templateId: string;
  templateName: string;
  services: CatBlock[];
  spares: CatBlock[];
  priced: number;
  unpriced: number;
  rangeMin: number | null;
  rangeMax: number | null;
}

// Platform LOV ids (same constants the seeder/mapper use)
const BLOCK_TYPE_SERVICE = 'ae7050b4-3cca-4ed9-aa02-4a1f697b75cc';
const BLOCK_TYPE_SPARE   = '1221e2dd-a603-47fb-9063-c393193514b7';

// ── Color tokens ──────────────────────────────────────────────────────────────

const VANI        = '#ff6b2b';
const VANI_SOFT   = '#fff8f4';
const TEXT        = '#1a1816';
const TEXT_MID    = '#4a4540';
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
const AMBER       = '#d97706';
const AMBER_BG    = '#fffbeb';
const DARK_BG     = 'linear-gradient(145deg, #1a1816, #2a2520)';

const fmtPrice = (n: number, currency: string): string => {
  if (currency === 'INR') return `₹${n.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${n.toLocaleString()}`;
  if (currency === 'AED') return `AED ${n.toLocaleString()}`;
  if (currency === 'GBP') return `£${n.toLocaleString()}`;
  return String(n.toLocaleString());
};

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

// ── Component ─────────────────────────────────────────────────────────────────

const Screen8APricingStep: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;

  const persona                   = (routeState.persona       || 'seller') as string;
  const industryNames             = (routeState.industryNames || []) as string[];
  const selectedEquipmentTemplates: any[] = routeState.selectedEquipmentTemplates || [];
  const selectedFacilityTemplates:  any[] = routeState.selectedFacilityTemplates  || [];
  const allTemplates = [...selectedEquipmentTemplates, ...selectedFacilityTemplates];

  // ── Data loading ──────────────────────────────────────────────────────────

  const [blocks, setBlocks]           = useState<CatBlock[]>([]);
  const [blocksLoading, setLoading]   = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  // prices: blockId → current price (initialised from each block's KT median)
  const [prices, setPrices]           = useState<Record<string, number>>({});
  // original seeded prices, to PATCH only deltas on confirm
  const [seeded, setSeeded]           = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        // Scope to THIS onboarding session's picks (founder bug: a reused tenant
        // accumulates seeds from earlier runs — pricing must only show what the
        // user just selected). Route state first; S8 table as refresh-safe source.
        let selectedIds = new Set<string>(allTemplates.map((t: any) => t.id).filter(Boolean));
        if (selectedIds.size === 0) {
          try {
            const sel = await api.get('/api/onboarding/selected-resources', { params: { purpose: 'sell' } });
            const rows: any[] = sel.data?.data || [];
            selectedIds = new Set(rows.map(r => r.resource_template_id).filter(Boolean));
          } catch { /* fall through — show all seeded blocks rather than none */ }
        }

        const resp = await api.get('/api/catalog-studio/blocks', {
          params: { is_seed: true, limit: 500 },
        });
        const raw: CatBlock[] = resp.data?.data?.blocks || resp.data?.blocks || [];
        const allSeeded = raw.filter(b => b.is_seed !== false);
        const seededBlocks = selectedIds.size > 0
          ? allSeeded.filter(b => b.resource_template_id && selectedIds.has(b.resource_template_id))
          : allSeeded;
        setBlocks(seededBlocks);

        const initial: Record<string, number> = {};
        const orig: Record<string, number> = {};
        seededBlocks.forEach(b => {
          const p = num(b.base_price ?? b.config?.kt_reference_price);
          orig[b.id] = p;
          if (p > 0) initial[b.id] = p;
        });
        setPrices(initial);
        setSeeded(orig);
      } catch {
        setBlocksError('Could not load service blocks. You can set prices later.');
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBlocks();
  }, []);

  // ── Grouping (by equipment template, services vs spares) ──────────────────

  const groups = useMemo((): BlockGroup[] => {
    const map: Record<string, CatBlock[]> = {};
    blocks.forEach(b => {
      const key = b.resource_template_id || 'other';
      (map[key] = map[key] || []).push(b);
    });
    return Object.entries(map).map(([templateId, bls]) => {
      const tmpl = allTemplates.find((t: any) => t.id === templateId);
      const templateName = tmpl?.name
        || bls[0]?.config?.selectedResources?.[0]?.resource_name
        || 'Other items';

      const services = bls.filter(b => b.block_type_id !== BLOCK_TYPE_SPARE)
        .sort((a, b) => a.name.localeCompare(b.name));
      const spares = bls.filter(b => b.block_type_id === BLOCK_TYPE_SPARE)
        .sort((a, b) => a.name.localeCompare(b.name));

      const seededPrices = bls.map(b => num(b.base_price)).filter(p => p > 0);
      const ktMins = bls.map(b => num(b.config?.kt_price_min)).filter(p => p > 0);
      const ktMaxs = bls.map(b => num(b.config?.kt_price_max)).filter(p => p > 0);
      const rangeMin = ktMins.length ? Math.min(...ktMins) : seededPrices.length ? Math.min(...seededPrices) : null;
      const rangeMax = ktMaxs.length ? Math.max(...ktMaxs) : seededPrices.length ? Math.max(...seededPrices) : null;

      return {
        templateId,
        templateName,
        services,
        spares,
        priced: seededPrices.length,
        unpriced: bls.length - seededPrices.length,
        rangeMin,
        rangeMax,
      };
    }).sort((a, b) => b.priced - a.priced);
  }, [blocks, allTemplates]);

  const totalBlocks = blocks.length;
  const currency = blocks.find(b => num(b.base_price) > 0)?.currency || blocks[0]?.currency || 'INR';
  const pricesSet = Object.values(prices).filter(v => v > 0).length;
  const ktPriced  = Object.entries(seeded).filter(([, v]) => v > 0).length;
  const changed   = Object.entries(prices).filter(([id, v]) => v > 0 && v !== seeded[id]).length;

  // ── Edit state ────────────────────────────────────────────────────────────

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editRaw, setEditRaw]       = useState('');
  const [fillRaw, setFillRaw]       = useState<Record<string, string>>({}); // per-group bulk fill
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const handleEditSave = (key: string) => {
    const val = parseInt(editRaw, 10);
    if (val > 0) setPrices(prev => ({ ...prev, [key]: val }));
    setEditingKey(null);
  };

  // Bulk-fill ONLY blocks without a price in this group
  const handleFillGroup = (g: BlockGroup) => {
    const val = parseInt(fillRaw[g.templateId] || '', 10);
    if (!(val > 0)) return;
    setPrices(prev => {
      const next = { ...prev };
      [...g.services, ...g.spares].forEach(b => {
        if (!(num(next[b.id]) > 0)) next[b.id] = val;
      });
      return next;
    });
  };

  // ── Confirm: PATCH only changed prices ────────────────────────────────────

  const handleConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const deltas = blocks.filter(b => {
        const p = prices[b.id];
        return p > 0 && p !== seeded[b.id];
      });
      await Promise.all(
        deltas.map(b =>
          api.patch(`/api/catalog-studio/blocks/${b.id}`, {
            base_price: prices[b.id],
            currency,
          })
        )
      );
      completeVaniStep('pricing-review', {
        accepted: true,
        total_blocks: totalBlocks,
        kt_priced: ktPriced,
        edited: deltas.length,
        currency,
      });
      const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/lov-setup';
      navigate(dest, { state: { ...routeState, pricingConfirmed: true } });
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || 'Failed to save pricing. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = () => {
    completeVaniStep('pricing-review', { accepted: false, skipped: true, total_blocks: totalBlocks });
    const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/lov-setup';
    navigate(dest, { state: routeState });
  };

  const handleBack = () => navigate('/onboarding/vani-working', { state: routeState });

  const islandLabel = saving
    ? 'Saving prices…'
    : changed > 0
    ? `${changed} price${changed !== 1 ? 's' : ''} edited · ${pricesSet}/${totalBlocks} priced`
    : pricesSet >= totalBlocks
    ? `All ${totalBlocks} prices ready (KT suggested)`
    : `${pricesSet} of ${totalBlocks} priced · ${totalBlocks - pricesSet} need a price`;

  // ── Row renderer ──────────────────────────────────────────────────────────

  const renderRow = (block: CatBlock, isLastRow: boolean, perUnit: boolean) => {
    const price     = prices[block.id] ?? 0;
    const ktPrice   = seeded[block.id] ?? 0;
    const isKt      = ktPrice > 0 && price === ktPrice;
    const isEdited  = price > 0 && ktPrice > 0 && price !== ktPrice;
    const isEditing = editingKey === block.id;

    return (
      <div
        key={block.id}
        className="s8a-rate-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          alignItems: 'center', gap: 16,
          padding: '10px 20px',
          borderBottom: isLastRow ? 'none' : `1px solid ${BORDER_LT}`,
          transition: 'background .15s',
        }}
      >
        {/* Real block name + provenance chip */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.name}
          </span>
          {isKt && (
            <span title="Suggested from knowledge-tree market data" style={{
              fontSize: 9, fontWeight: 700, marginLeft: 8, flexShrink: 0,
              padding: '2px 7px', borderRadius: 4,
              background: GREEN_BG, color: GREEN, border: `1px solid ${GREEN_BORDER}`,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.4,
            }}>KT</span>
          )}
          {isEdited && (
            <span title={`KT suggested ${fmtPrice(ktPrice, currency)}`} style={{
              fontSize: 9, fontWeight: 700, marginLeft: 8, flexShrink: 0,
              padding: '2px 7px', borderRadius: 4,
              background: VANI_SOFT, color: VANI, border: '1px solid rgba(255,107,43,.25)',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.4,
            }}>EDITED</span>
          )}
          {!(price > 0) && (
            <span style={{
              fontSize: 9, fontWeight: 700, marginLeft: 8, flexShrink: 0,
              padding: '2px 7px', borderRadius: 4,
              background: AMBER_BG, color: AMBER, border: '1px solid rgba(217,119,6,.2)',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.4,
            }}>NO PRICE</span>
          )}
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', gridColumn: '2 / 4' }}>
            <input
              type="number"
              value={editRaw}
              onChange={e => setEditRaw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditSave(block.id)}
              autoFocus
              style={{
                width: 120, padding: '6px 10px', borderRadius: 6,
                border: `1.5px solid ${VANI}`, fontSize: 14, fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace", outline: 'none',
              }}
            />
            <button onClick={() => handleEditSave(block.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: VANI, color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>save</button>
            <button onClick={() => setEditingKey(null)} style={{ padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${BORDER}`, background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: TEXT_DIM, cursor: 'pointer' }}>×</button>
          </div>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 800, color: price > 0 ? TEXT : TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' }}>
              {price > 0 ? fmtPrice(price, currency) : '—'}
              <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED }}> {perUnit ? '/unit' : '/visit'}</span>
            </span>
            <button
              className="s8a-edit-btn"
              onClick={() => { setEditingKey(block.id); setEditRaw(String(price || '')); }}
              style={{
                padding: '4px 10px', borderRadius: 5,
                border: `1.5px solid ${BORDER}`, background: 'transparent',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, fontWeight: 700, color: TEXT_DIM,
                cursor: 'pointer', transition: 'all .15s',
              }}
            >edit</button>
          </>
        )}
      </div>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (blocksLoading) {
    return (
      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: TEXT_DIM, fontSize: 14 }}>Loading your service catalog…</p>
        </div>
      </div>
    );
  }

  // ── Empty state (no blocks seeded or wrong persona) ───────────────────────

  if (!blocksLoading && blocks.length === 0) {
    return (
      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 8 }}>No service blocks found</h2>
          <p style={{ color: TEXT_DIM, marginBottom: 8, lineHeight: 1.6 }}>
            {blocksError || 'Service blocks are not yet seeded for your industries.'}
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 28 }}>
            You can set prices later in your catalog settings.
          </p>
          <button
            onClick={handleSkip}
            style={{
              padding: '12px 32px', borderRadius: 100, border: 'none',
              background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
              color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,107,43,.3)',
            }}
          >
            Continue anyway →
          </button>
        </div>
      </div>
    );
  }

  // ── Full UI ───────────────────────────────────────────────────────────────

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .s8a-rate-row:hover { background: ${SURFACE} !important; }
        .s8a-edit-btn:hover { border-color: ${VANI} !important; color: ${VANI} !important; background: ${VANI_SOFT} !important; }
        .s8a-skip:hover { color: ${TEXT_DIM} !important; }
      `}} />

      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          maxWidth: 1100, margin: '0 auto',
          padding: '40px 24px 160px',
          alignItems: 'start',
        }}>

          {/* ── LEFT COLUMN ── */}
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1) both' }}>
              <VaniAvatar />
              <VaniMsg>
                I priced <strong>{ktPriced} of {totalBlocks}</strong> items from industry market data —
                <strong> review and adjust anything that looks off</strong>.
                {totalBlocks - ktPriced > 0 && (
                  <> The remaining {totalBlocks - ktPriced} have no market data yet — set them below or later in Catalog Studio.</>
                )}
              </VaniMsg>
            </div>

            {saveError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13,
              }}>
                {saveError}
              </div>
            )}

            {/* One card per equipment group */}
            {groups.map((g, gIdx) => {
              const showRange = g.rangeMin != null && g.rangeMax != null && g.rangeMax > g.rangeMin;
              return (
                <div key={g.templateId} style={{
                  background: WHITE, border: `1px solid ${BORDER}`,
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,.05)', marginBottom: 14,
                  animation: `cardIn .4s ease ${gIdx * 0.08}s both`,
                }}>
                  {/* Card header */}
                  <div style={{
                    padding: '14px 20px', background: SURFACE,
                    borderBottom: `1px solid ${BORDER_LT}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, color: TEXT }}>
                        {g.templateName}
                      </span>
                      <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {g.services.length} services · {g.spares.length} spares
                      </span>
                    </div>
                    {showRange && (
                      <span title="Knowledge-tree market range for this equipment" style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                        background: GREEN_BG, color: GREEN, border: `1px solid ${GREEN_BORDER}`,
                        fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap',
                      }}>
                        Market {fmtPrice(g.rangeMin!, currency)} – {fmtPrice(g.rangeMax!, currency)}
                      </span>
                    )}
                  </div>

                  {/* Bulk-fill for unpriced items only */}
                  {g.unpriced > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 20px', background: AMBER_BG,
                      borderBottom: `1px solid ${BORDER_LT}`,
                    }}>
                      <span style={{ fontSize: 12, color: AMBER, fontWeight: 600, flex: 1 }}>
                        {g.unpriced} item{g.unpriced !== 1 ? 's' : ''} without market data
                      </span>
                      <input
                        type="number"
                        placeholder="Base price"
                        value={fillRaw[g.templateId] || ''}
                        onChange={e => setFillRaw(prev => ({ ...prev, [g.templateId]: e.target.value }))}
                        style={{
                          width: 110, padding: '6px 10px', borderRadius: 6,
                          border: `1.5px solid ${BORDER}`, fontSize: 13, fontWeight: 700,
                          fontFamily: "'IBM Plex Mono', monospace", outline: 'none',
                          textAlign: 'right' as const,
                        }}
                      />
                      <button
                        onClick={() => handleFillGroup(g)}
                        disabled={!(parseInt(fillRaw[g.templateId] || '', 10) > 0)}
                        style={{
                          padding: '6px 14px', borderRadius: 6, border: 'none',
                          background: parseInt(fillRaw[g.templateId] || '', 10) > 0 ? AMBER : BORDER,
                          color: '#fff', fontFamily: "'Outfit', sans-serif",
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >Fill unpriced</button>
                    </div>
                  )}

                  {/* Services section */}
                  {g.services.length > 0 && (
                    <>
                      <SectionLabel>Services</SectionLabel>
                      {g.services.map((b, i) => renderRow(b, i === g.services.length - 1 && g.spares.length === 0, false))}
                    </>
                  )}

                  {/* Spares section */}
                  {g.spares.length > 0 && (
                    <>
                      <SectionLabel>Spare parts &amp; consumables</SectionLabel>
                      {g.spares.map((b, i) => renderRow(b, i === g.spares.length - 1, true))}
                    </>
                  )}
                </div>
              );
            })}

            <div className="s8a-skip" onClick={handleSkip} style={{ fontSize: 12, color: TEXT_MUTED, textDecoration: 'underline', cursor: 'pointer', textAlign: 'center' as const, display: 'block', marginTop: 10 }}>
              Skip for now — I'll set prices later
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>

            {/* Pricing progress — dark card */}
            <div style={{ background: DARK_BG, border: '1px solid rgba(255,107,43,.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)' }}>
                  Pricing Progress
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  { k: 'Blocks total',   v: String(totalBlocks) },
                  { k: 'KT suggested',   v: String(ktPriced), accent: ktPriced > 0 },
                  { k: 'Edited by you',  v: String(changed), accent: changed > 0 },
                  { k: 'Still unpriced', v: String(totalBlocks - pricesSet) },
                  { k: 'Currency',       v: currency },
                ].map(row => (
                  <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: (row as any).accent ? VANI : '#f0ece6' }}>{row.v}</span>
                  </div>
                ))}
                <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 100, overflow: 'hidden', margin: '12px 0 6px' }}>
                  <div style={{
                    height: '100%', borderRadius: 100,
                    background: `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                    width: `${totalBlocks > 0 ? Math.round((pricesSet / totalBlocks) * 100) : 0}%`,
                    transition: 'width .5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span style={{ color: VANI }}>{totalBlocks > 0 ? `${Math.round((pricesSet / totalBlocks) * 100)}%` : '0%'}</span>
                  <span style={{ color: 'rgba(255,255,255,.3)' }}>of {totalBlocks} priced</span>
                </div>
              </div>
            </div>

            {/* Catalog summary */}
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: `1px solid ${BORDER_LT}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED }}>
                  Catalog Summary
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  { k: 'Equipment',  v: `${groups.length} type${groups.length !== 1 ? 's' : ''}` },
                  { k: 'Services',   v: String(groups.reduce((s, g) => s + g.services.length, 0)) },
                  { k: 'Spares',     v: String(groups.reduce((s, g) => s + g.spares.length, 0)) },
                  { k: 'Industries', v: industryNames.slice(0, 2).join(', ') || '—' },
                ].map((row, i, arr) => (
                  <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_LT}` : 'none' }}>
                    <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: TEXT }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION ISLAND ── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(26,24,22,.94)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {islandLabel}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button onClick={handleBack} style={{ padding: '10px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: !saving ? `linear-gradient(135deg, ${VANI}, #ff8f5a)` : 'rgba(255,255,255,.1)',
            color: !saving ? '#fff' : 'rgba(255,255,255,.35)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: !saving ? 'pointer' : 'not-allowed',
            boxShadow: !saving ? `0 3px 10px rgba(255,107,43,.5)` : 'none',
            transition: 'all .3s ease',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {saving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
          {saving ? 'Saving…' : changed > 0 ? `Confirm pricing (${changed} edits) →` : 'Accept KT pricing →'}
        </button>
      </div>
    </>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    padding: '7px 20px', background: SURFACE,
    borderBottom: `1px solid ${BORDER_LT}`,
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: 0.8, color: TEXT_MUTED,
    fontFamily: "'IBM Plex Mono', monospace",
  }}>
    {children}
  </div>
);

const VaniAvatar: React.FC = () => (
  <div style={{
    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
    background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 14, color: '#fff',
    boxShadow: '0 3px 8px rgba(255,107,43,.25)', marginTop: 2,
  }}>V</div>
);

const VaniMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    background: WHITE, border: `1px solid ${BORDER}`,
    borderRadius: '3px 14px 14px 14px',
    padding: '14px 18px',
    boxShadow: '0 2px 12px rgba(0,0,0,.05)',
    fontSize: 14, color: TEXT_MID, lineHeight: 1.6,
  }}>
    {children}
  </div>
);

export default Screen8APricingStep;

// src/pages/onboarding/steps/Screen8APricingStep.tsx
// Screen 8A — Pricing Review (Seller / Both)
// Fetches real seeded catalog blocks (is_seed=true, tags=industryIds).
// Step 1: anchor price (user sets price for Basic tier reference service).
// Step 2: rate card (all blocks shown, prices computed from anchor + tier multipliers, editable).
// On confirm: PATCH each block with config.base_price + currency_id.
// Navigation: seller → /onboarding/done | both → /onboarding/equipment-confirm

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatBlock {
  id: string;
  name: string;
  resource_template_id?: string;
  is_seed?: boolean;
  config: { base_price?: number; currency_id?: string };
  tags?: string[];
}

interface BlockGroup {
  templateId: string;
  templateName: string;
  blocks: CatBlock[];
}

// ── Color tokens ──────────────────────────────────────────────────────────────

const VANI        = '#ff6b2b';
const VANI_SOFT   = '#fff8f4';
const VANI_BORDER = 'rgba(255,107,43,.2)';
const VANI_GLOW   = 'rgba(255,107,43,.08)';
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
const BLUE        = '#2563eb';
const BLUE_BG     = '#eff6ff';
const DARK_BG     = 'linear-gradient(145deg, #1a1816, #2a2520)';

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_CONFIG = [
  { key: 'basic',   label: 'Basic AMC',        badge: 'Basic', mult: 1.0,  color: TEXT_DIM, bgColor: SURFACE,   borderColor: BORDER_LT              },
  { key: 'comp',    label: 'Comprehensive AMC', badge: 'Comp',  mult: 1.5,  color: BLUE,    bgColor: BLUE_BG,   borderColor: 'rgba(37,99,235,.15)'   },
  { key: 'premium', label: 'Premium CMC',       badge: 'CMC',   mult: 2.3,  color: VANI,    bgColor: VANI_SOFT, borderColor: VANI_BORDER             },
];

const detectTierIdx = (name: string): number => {
  const n = name.toLowerCase();
  if (n.includes('premium') || n.includes('cmc')) return 2;
  if (n.includes('comprehensive') || n.includes('comp')) return 1;
  return 0;
};

const fmtPrice = (n: number, currency: string): string => {
  if (currency === 'INR') return `₹${n.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${n.toLocaleString()}`;
  if (currency === 'AED') return `AED ${n.toLocaleString()}`;
  if (currency === 'GBP') return `£${n.toLocaleString()}`;
  return String(n.toLocaleString());
};

const CURRENCIES = ['INR', 'USD', 'AED', 'GBP'];

// ── Component ─────────────────────────────────────────────────────────────────

const Screen8APricingStep: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;

  const persona                   = (routeState.persona       || 'seller') as string;
  const industryNames             = (routeState.industryNames || []) as string[];
  const industryIds               = (routeState.industryIds   || []) as string[];
  const selectedEquipmentTemplates: any[] = routeState.selectedEquipmentTemplates || [];

  // ── Data loading ──────────────────────────────────────────────────────────

  const [blocks, setBlocks]           = useState<CatBlock[]>([]);
  const [blocksLoading, setLoading]   = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        // Sprint 1: seeded blocks carry is_seed=true (and empty tags), so we
        // filter by is_seed server-side instead of the old tags-by-industry
        // filter that silently excluded every seeded block.
        const resp = await api.get('/api/catalog-studio/blocks', {
          params: { is_seed: true, limit: 500 },
        });
        // Response shape: { success, data: { blocks: [...], total: N } }
        const raw: CatBlock[] = resp.data?.data?.blocks || resp.data?.blocks || [];
        setBlocks(raw.filter(b => b.is_seed !== false));
      } catch {
        setBlocksError('Could not load service blocks. You can set prices later.');
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBlocks();
  }, []);

  // ── Grouping ──────────────────────────────────────────────────────────────

  const groups = useMemo((): BlockGroup[] => {
    const map: Record<string, CatBlock[]> = {};
    blocks.forEach(b => {
      const key = b.resource_template_id || b.id;
      (map[key] = map[key] || []).push(b);
    });
    return Object.entries(map).map(([templateId, bls]) => {
      // Resolve template display name
      const tmpl = selectedEquipmentTemplates.find((t: any) => t.id === templateId);
      let templateName = tmpl?.name || '';
      if (!templateName) {
        // Parse from block name: "Basic AMC — Hydraulic Lift" → "Hydraulic Lift"
        const parts = (bls[0]?.name || '').split(/[-—]/);
        templateName = parts[parts.length - 1]?.trim() || templateId.substring(0, 8);
      }
      return {
        templateId,
        templateName,
        blocks: bls.sort((a, b) => detectTierIdx(a.name) - detectTierIdx(b.name)),
      };
    });
  }, [blocks, selectedEquipmentTemplates]);

  const totalBlocks = blocks.length;

  // Reference anchor = first block (basic tier) of first group
  const anchorBlock = groups[0]?.blocks[0] || null;
  const anchorServiceLabel = anchorBlock
    ? `${TIER_CONFIG[detectTierIdx(anchorBlock.name)]?.label || 'Basic AMC'} — ${groups[0]?.templateName}`
    : 'Reference service';

  // ── Pricing state ─────────────────────────────────────────────────────────

  const [pricingStep, setPricingStep] = useState<'anchor' | 'ratecard'>('anchor');
  const [currency, setCurrency]       = useState('INR');
  const [anchorRaw, setAnchorRaw]     = useState('');
  const [prices, setPrices]           = useState<Record<string, number>>({});
  const [editingKey, setEditingKey]   = useState<string | null>(null);
  const [editRaw, setEditRaw]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  const anchorNum = parseInt(anchorRaw, 10) || 0;
  const pricesSet = Object.values(prices).filter(v => v > 0).length;
  const userBarPct = anchorNum > 0 ? Math.min(100, Math.max(5, 15 + ((anchorNum - 8000) / 30000) * 70)) : -1;

  const handleApply = () => {
    if (!anchorNum || !anchorBlock) return;
    const computed: Record<string, number> = {};
    groups.forEach(g => {
      g.blocks.forEach(b => {
        const tierIdx = Math.min(detectTierIdx(b.name), TIER_CONFIG.length - 1);
        computed[b.id] = Math.round(anchorNum * TIER_CONFIG[tierIdx].mult);
      });
    });
    // Anchor block gets exact value
    if (anchorBlock) computed[anchorBlock.id] = anchorNum;
    setPrices(computed);
    setPricingStep('ratecard');
    window.scrollTo(0, 0);
  };

  const handleEditSave = (key: string) => {
    const val = parseInt(editRaw, 10);
    if (val > 0) setPrices(prev => ({ ...prev, [key]: val }));
    setEditingKey(null);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Price edits write the SAME fields Catalog Studio edits (top-level
      // base_price/currency) — the old payload nested them under config and
      // would have clobbered the mapper-built config JSONB without ever
      // changing the actual price column.
      await Promise.all(
        blocks.map(b => {
          const price = prices[b.id];
          if (!price) return Promise.resolve();
          return api.patch(`/api/catalog-studio/blocks/${b.id}`, {
            base_price: price,
            currency,
          });
        })
      );
      completeVaniStep('pricing-review', {
        accepted: true,
        priced_blocks: Object.keys(prices).length,
        total_blocks: blocks.length,
        currency,
      });
      const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/done';
      navigate(dest, { state: { ...routeState, pricingConfirmed: true } });
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || 'Failed to save pricing. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = () => {
    completeVaniStep('pricing-review', { accepted: false, skipped: true, total_blocks: blocks.length });
    const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/done';
    navigate(dest, { state: routeState });
  };

  const handleBack = () => navigate('/onboarding/vani-working', { state: routeState });

  const islandLabel = pricingStep === 'anchor'
    ? (anchorNum > 0 ? 'Ready to calculate rates' : 'Set anchor price to continue')
    : saving
    ? 'Saving prices…'
    : pricesSet >= totalBlocks
    ? `All ${totalBlocks} prices confirmed`
    : `${pricesSet} of ${totalBlocks} prices set`;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (blocksLoading) {
    return (
      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
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
      </>
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
        .s8a-apply-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(255,107,43,.36) !important; }
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

            {/* VaNi bubble — step 1 */}
            {pricingStep === 'anchor' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1) both' }}>
                <VaniAvatar />
                <VaniMsg>
                  One last thing — <strong>your prices</strong>.
                  Set your anchor for <em>{anchorServiceLabel}</em> and I'll calculate the rest.
                </VaniMsg>
              </div>
            )}

            {/* Step tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
              {[
                { key: 'anchor',   num: 1, label: 'Set anchor price' },
                { key: 'ratecard', num: 2, label: 'Review rate card'  },
              ].map(tab => {
                const isActive = pricingStep === tab.key;
                const isDone   = tab.key === 'anchor' && pricingStep === 'ratecard';
                return (
                  <div key={tab.key} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 16px 6px 8px', borderRadius: 100,
                    border: `1.5px solid ${isDone ? GREEN_BORDER : isActive ? VANI : BORDER}`,
                    background: isDone ? GREEN_BG : isActive ? VANI_SOFT : WHITE,
                    color: isDone ? GREEN : isActive ? VANI : TEXT_MUTED,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? GREEN : isActive ? VANI : BORDER_LT,
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800,
                    }}>
                      {isDone ? '✓' : tab.num}
                    </div>
                    {tab.label}
                  </div>
                );
              })}
            </div>

            {/* ════ STEP 1: Anchor ════ */}
            {pricingStep === 'anchor' && (
              <div style={{ animation: 'fadeUp .4s ease both' }}>
                <div style={{
                  background: WHITE, border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: '28px 32px',
                  boxShadow: '0 4px 24px rgba(0,0,0,.08)',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 0.8, color: TEXT_MUTED,
                    fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8,
                  }}>
                    Your reference service
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, color: TEXT, marginBottom: 24 }}>
                    {anchorServiceLabel}
                  </div>

                  {/* Price input row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      style={{
                        padding: '14px 16px', border: `1.5px solid ${BORDER}`,
                        borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 14, fontWeight: 700, color: TEXT,
                        background: SURFACE, cursor: 'pointer', outline: 'none',
                        minWidth: 80, appearance: 'none' as const,
                      }}
                    >
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input
                      type="number"
                      value={anchorRaw}
                      onChange={e => setAnchorRaw(e.target.value)}
                      placeholder="0"
                      min={0}
                      style={{
                        flex: 1, padding: '14px 20px',
                        border: `2px solid ${anchorNum ? VANI : BORDER}`,
                        borderRadius: 8,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 24, fontWeight: 800, color: TEXT,
                        outline: 'none', textAlign: 'right' as const,
                        boxShadow: anchorNum ? `0 0 0 4px ${VANI_GLOW}` : 'none',
                        transition: 'border-color .2s, box-shadow .2s',
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_DIM, whiteSpace: 'nowrap' }}>/ year</span>
                  </div>

                  {/* Benchmark bar — illustrative */}
                  <div style={{
                    background: SURFACE, border: `1px solid ${BORDER_LT}`,
                    borderRadius: 8, padding: '16px 18px', marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        Market range · {industryNames[0] || 'your industry'}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: AMBER_BG, color: AMBER,
                        border: '1px solid rgba(217,119,6,.2)',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>Illustrative</span>
                    </div>
                    <div style={{ height: 8, background: BORDER, borderRadius: 100, position: 'relative', overflow: 'visible', marginBottom: 8 }}>
                      <div style={{ position: 'absolute', left: '15%', width: '55%', height: '100%', background: 'rgba(217,119,6,.2)', borderRadius: 100 }} />
                      {userBarPct >= 0 && (
                        <div style={{
                          position: 'absolute', left: `${userBarPct}%`, top: -3,
                          width: 14, height: 14, borderRadius: '50%',
                          background: VANI, border: '2px solid #fff',
                          boxShadow: '0 2px 4px rgba(255,107,43,.3)',
                          transform: 'translateX(-50%)',
                          transition: 'left .4s ease',
                        }} />
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.5, margin: 0 }}>
                      VaNi will use your anchor price to calculate all {totalBlocks} service rates below.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      className="s8a-apply-btn"
                      onClick={handleApply}
                      disabled={!anchorNum}
                      style={{
                        padding: '13px 28px',
                        background: anchorNum ? `linear-gradient(135deg, ${VANI}, #ff8f5a)` : '#e5e1db',
                        border: 'none', borderRadius: 8,
                        fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700,
                        color: anchorNum ? '#fff' : TEXT_MUTED,
                        cursor: anchorNum ? 'pointer' : 'not-allowed',
                        boxShadow: anchorNum ? '0 3px 10px rgba(255,107,43,.28)' : 'none',
                        transition: 'all .2s',
                      }}
                    >Apply &amp; calculate {totalBlocks - 1} more rates →</button>
                  </div>
                </div>
              </div>
            )}

            {/* ════ STEP 2: Rate card ════ */}
            {pricingStep === 'ratecard' && (
              <div style={{ animation: 'fadeUp .4s ease both' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <VaniAvatar />
                  <VaniMsg>
                    Based on{' '}
                    <span style={{ color: VANI, fontWeight: 700 }}>{fmtPrice(anchorNum, currency)}</span>
                    {' '}anchor.{' '}
                    <strong>Adjust anything that looks off</strong> — these are your prices.
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

                {/* Rate card — one card per equipment group */}
                {groups.map((g, gIdx) => (
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
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, color: TEXT }}>
                        {g.templateName}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: SURFACE, color: TEXT_DIM,
                        border: `1px solid ${BORDER_LT}`,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        {g.blocks.length} tier{g.blocks.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Tier rows */}
                    {g.blocks.map((block, bIdx) => {
                      const tierIdx   = Math.min(detectTierIdx(block.name), TIER_CONFIG.length - 1);
                      const tier      = TIER_CONFIG[tierIdx];
                      const price     = prices[block.id] ?? 0;
                      const isEditing = editingKey === block.id;
                      const isAnchor  = block.id === anchorBlock?.id;
                      const isLastRow = bIdx === g.blocks.length - 1;

                      return (
                        <div
                          key={block.id}
                          className="s8a-rate-row"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            alignItems: 'center', gap: 16,
                            padding: '11px 20px',
                            borderBottom: isLastRow ? 'none' : `1px solid ${BORDER_LT}`,
                            transition: 'background .15s',
                          }}
                        >
                          {/* Tier label + badge */}
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{tier.label}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, marginLeft: 8,
                              padding: '2px 8px', borderRadius: 4,
                              background: tier.bgColor, color: tier.color,
                              border: `1px solid ${tier.borderColor}`,
                              fontFamily: "'IBM Plex Mono', monospace",
                              textTransform: 'uppercase' as const, letterSpacing: 0.4,
                            }}>{tier.badge}</span>
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
                              <span style={{ fontSize: 14, fontWeight: 800, color: TEXT, fontFamily: "'IBM Plex Mono', monospace" }}>
                                {price > 0 ? fmtPrice(price, currency) : '—'}
                              </span>
                              {isAnchor ? (
                                <span style={{ fontSize: 14, color: GREEN }}>✓</span>
                              ) : (
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
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div className="s8a-skip" onClick={handleSkip} style={{ fontSize: 12, color: TEXT_MUTED, textDecoration: 'underline', cursor: 'pointer', textAlign: 'center' as const, display: 'block', marginTop: 10 }}>
                  Skip for now — I'll set prices later
                </div>
              </div>
            )}
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
                  { k: 'Blocks total', v: String(totalBlocks) },
                  { k: 'Prices set',   v: pricingStep === 'ratecard' ? String(pricesSet) : '0', accent: pricesSet > 0 },
                  { k: 'Currency',     v: currency },
                  { k: 'Anchor',       v: anchorNum > 0 ? fmtPrice(anchorNum, currency) : '—', accent: anchorNum > 0 },
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
                  <span style={{ color: 'rgba(255,255,255,.3)' }}>of {totalBlocks} prices</span>
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
                  { k: 'Blocks',      v: `${totalBlocks} total` },
                  { k: 'Eq. types',   v: `${groups.length} types` },
                  { k: 'Industries',  v: industryNames.slice(0, 2).join(', ') || '—' },
                  { k: 'Tiers',       v: `${TIER_CONFIG.length} per type` },
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
          disabled={pricingStep !== 'ratecard' || saving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: pricingStep === 'ratecard' && !saving
              ? `linear-gradient(135deg, ${VANI}, #ff8f5a)`
              : 'rgba(255,255,255,.1)',
            color: pricingStep === 'ratecard' && !saving ? '#fff' : 'rgba(255,255,255,.35)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: pricingStep === 'ratecard' && !saving ? 'pointer' : 'not-allowed',
            boxShadow: pricingStep === 'ratecard' && !saving ? `0 3px 10px rgba(255,107,43,.5)` : 'none',
            transition: 'all .3s ease',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {saving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
          {saving ? 'Saving…' : 'Confirm pricing →'}
        </button>
      </div>
    </>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────

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

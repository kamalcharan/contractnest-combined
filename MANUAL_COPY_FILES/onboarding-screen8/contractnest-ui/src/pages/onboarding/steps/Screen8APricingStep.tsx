// src/pages/onboarding/steps/Screen8APricingStep.tsx
// Screen 8A — Pricing Review (Seller / Both)
// Step 1: Anchor price input with market benchmark bar
// Step 2: Full rate card (4 equipment types × 3 tiers = 12 blocks)
// Navigation: seller → /onboarding/done | both → /onboarding/equipment-confirm

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Color tokens (matches spec CSS variables) ─────────────────────────────────
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

// ── Mock data ─────────────────────────────────────────────────────────────────

interface EquipmentType {
  id: string;
  name: string;
  icon: string;
  baseMultiplier: number;
}

interface ServiceTier {
  id: string;
  label: string;
  badge: string;
  tierMultiplier: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

// 4 equipment types × 3 tiers = 12 blocks (matches right panel)
const EQUIPMENT_TYPES: EquipmentType[] = [
  { id: 'hydraulic',  name: 'Hydraulic Lift',   icon: '🛗', baseMultiplier: 1.00 },
  { id: 'mrl',        name: 'MRL Traction Lift', icon: '⚙️', baseMultiplier: 1.22 },
  { id: 'escalator',  name: 'Escalator',          icon: '🏗️', baseMultiplier: 1.95 },
  { id: 'dumbwaiter', name: 'Dumbwaiter',         icon: '📦', baseMultiplier: 0.75 },
];

// Colors: Basic=gray, Comp=blue, CMC=vani — matches spec tier-basic/tier-comp/tier-cmc classes
const SERVICE_TIERS: ServiceTier[] = [
  { id: 'basic',   label: 'Basic AMC',        badge: 'Basic', tierMultiplier: 1.0, color: TEXT_DIM, bgColor: SURFACE,   borderColor: BORDER_LT                },
  { id: 'comp',    label: 'Comprehensive AMC', badge: 'Comp',  tierMultiplier: 1.5, color: BLUE,    bgColor: BLUE_BG,   borderColor: 'rgba(37,99,235,.15)'     },
  { id: 'premium', label: 'Premium CMC',       badge: 'CMC',   tierMultiplier: 2.3, color: VANI,    bgColor: VANI_SOFT, borderColor: VANI_BORDER               },
];

const CURRENCIES = ['INR', 'USD', 'AED', 'GBP'];
const MARKET = { min: 15000, max: 22000, median: 18000 };
const DEFAULT_ANCHOR = 18000;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number, currency: string): string => {
  if (currency === 'INR') return `₹${n.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${n.toLocaleString()}`;
  if (currency === 'AED') return `AED ${n.toLocaleString()}`;
  if (currency === 'GBP') return `£${n.toLocaleString()}`;
  return String(n.toLocaleString());
};

// VaNi multiplier formula: anchor × equip.baseMultiplier × tier.tierMultiplier
const calcPrices = (anchor: number): Record<string, number> => {
  const result: Record<string, number> = {};
  EQUIPMENT_TYPES.forEach(eq => {
    SERVICE_TIERS.forEach(tier => {
      result[`${eq.id}-${tier.id}`] = Math.round(anchor * eq.baseMultiplier * tier.tierMultiplier);
    });
  });
  return result;
};

// Maps a value to bar position % — fill covers 15%–70% of bar
const getBarPct = (val: number): number =>
  Math.min(100, Math.max(0, 15 + ((val - MARKET.min) / (MARKET.max - MARKET.min)) * 55));

const MEDIAN_PCT = getBarPct(MARKET.median); // ≈ 38.6%

// ── Component ─────────────────────────────────────────────────────────────────

const Screen8APricingStep: React.FC = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const routeState  = (location.state || {}) as Record<string, any>;

  const persona       = (routeState.persona       || 'seller') as string;
  const industryNames = (routeState.industryNames  || ['Lifts & Elevators']) as string[];

  const [pricingStep, setPricingStep] = useState<'anchor' | 'ratecard'>('anchor');
  const [currency, setCurrency]       = useState('INR');
  const [anchorRaw, setAnchorRaw]     = useState(String(DEFAULT_ANCHOR));
  const [prices, setPrices]           = useState<Record<string, number>>({});
  const [editingKey, setEditingKey]   = useState<string | null>(null);
  const [editRaw, setEditRaw]         = useState('');
  const [extraCurrencies, setExtraCurrencies] = useState<string[]>([]);

  const anchorNum   = parseInt(anchorRaw, 10) || 0;
  const totalBlocks = EQUIPMENT_TYPES.length * SERVICE_TIERS.length; // 12
  const pricesSet   = Object.keys(prices).length;
  const userBarPct  = anchorNum > 0 ? getBarPct(anchorNum) : -1;

  const handleApply = () => {
    if (!anchorNum) return;
    setPrices(calcPrices(anchorNum));
    setPricingStep('ratecard');
    window.scrollTo(0, 0);
  };

  const handleEditStart = (key: string, currentPrice: number) => {
    setEditingKey(key);
    setEditRaw(String(currentPrice));
  };

  const handleEditSave = (key: string) => {
    const val = parseInt(editRaw, 10);
    if (val > 0) setPrices(prev => ({ ...prev, [key]: val }));
    setEditingKey(null);
  };

  const handleAddCurrency = (c: string) => {
    if (!extraCurrencies.includes(c)) setExtraCurrencies(prev => [...prev, c]);
  };

  const availableCurrencies = CURRENCIES.filter(c => c !== currency && !extraCurrencies.includes(c));

  const handleConfirm = () => {
    const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/done';
    navigate(dest, { state: { ...routeState, pricingConfirmed: true, prices } });
  };

  const handleSkip = () => {
    const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/done';
    navigate(dest, { state: routeState });
  };

  const handleBack = () => {
    navigate('/onboarding/vani-working', { state: routeState });
  };

  const progressPct = totalBlocks > 0 ? Math.round((pricesSet / totalBlocks) * 100) : 0;

  const islandLabel = pricingStep === 'anchor'
    ? 'Set anchor price to continue'
    : pricesSet >= totalBlocks
      ? `${totalBlocks} of ${totalBlocks} prices confirmed`
      : `${pricesSet} of ${totalBlocks} prices set`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
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
        .s8a-chip:hover { border-color: ${VANI} !important; color: ${VANI} !important; background: ${VANI_SOFT} !important; border-style: solid !important; }
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

            {/* VaNi bubble — step 1 message */}
            {pricingStep === 'anchor' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1) both' }}>
                <VaniAvatar />
                <VaniMsg>
                  One thing left — <strong>your prices</strong>.
                  Start with your most common service and I'll calculate the rest.
                </VaniMsg>
              </div>
            )}

            {/* Step tabs — pill style with circle numbers (matches spec) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
              {[
                { key: 'anchor',   num: 1, label: 'Set anchor price' },
                { key: 'ratecard', num: 2, label: 'Review rate card'  },
              ].map(tab => {
                const isActive = pricingStep === tab.key;
                const isDone   = tab.key === 'anchor' && pricingStep === 'ratecard';
                return (
                  <div
                    key={tab.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '6px 16px 6px 8px', borderRadius: 100,
                      border: `1.5px solid ${isDone ? GREEN_BORDER : isActive ? VANI : BORDER}`,
                      background: isDone ? GREEN_BG : isActive ? VANI_SOFT : WHITE,
                      color: isDone ? GREEN : isActive ? VANI : TEXT_MUTED,
                      fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {/* Circle number */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? GREEN : isActive ? VANI : BORDER_LT,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800,
                    }}>
                      {isDone ? '✓' : tab.num}
                    </div>
                    {tab.label}
                  </div>
                );
              })}
            </div>

            {/* ════ STEP 1: Anchor price ════ */}
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
                    Your most common service
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, color: TEXT, marginBottom: 24 }}>
                    Basic AMC — Hydraulic Lift
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

                  {/* Benchmark bar */}
                  <div style={{
                    background: SURFACE, border: `1px solid ${BORDER_LT}`,
                    borderRadius: 8, padding: '16px 18px', marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        Market rate · Hyderabad
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: AMBER_BG, color: AMBER,
                        border: '1px solid rgba(217,119,6,.2)',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>Low confidence</span>
                    </div>

                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 11, color: TEXT_MUTED,
                      fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6,
                    }}>
                      <span>₹15,000</span>
                      <span>median ₹18,000</span>
                      <span>₹22,000</span>
                    </div>

                    {/* Bar with markers — spec layout: gray track, amber fill zone, two dot markers */}
                    <div style={{
                      height: 8, background: BORDER, borderRadius: 100,
                      position: 'relative', overflow: 'visible', marginBottom: 28,
                    }}>
                      {/* Amber range fill (15%–70%) */}
                      <div style={{
                        position: 'absolute', left: '15%', width: '55%',
                        height: '100%', background: 'rgba(217,119,6,.2)', borderRadius: 100,
                      }} />
                      {/* Median amber dot */}
                      <div style={{
                        position: 'absolute', left: `${MEDIAN_PCT}%`, top: -3,
                        width: 14, height: 14, borderRadius: '50%',
                        background: AMBER, border: '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,.15)',
                        transform: 'translateX(-50%)',
                      }} />
                      <div style={{
                        position: 'absolute', left: `${MEDIAN_PCT}%`, top: 16,
                        transform: 'translateX(-50%)',
                        fontSize: 10, fontWeight: 700, color: AMBER,
                        fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap',
                      }}>median</div>
                      {/* User price — orange dot (moves as user types) */}
                      {userBarPct >= 0 && (
                        <>
                          <div style={{
                            position: 'absolute', left: `${userBarPct}%`, top: -3,
                            width: 14, height: 14, borderRadius: '50%',
                            background: VANI, border: '2px solid #fff',
                            boxShadow: `0 2px 4px rgba(255,107,43,.3)`,
                            transform: 'translateX(-50%)',
                            transition: 'left .4s ease',
                          }} />
                          <div style={{
                            position: 'absolute', left: `${userBarPct}%`, top: 16,
                            transform: 'translateX(-50%)',
                            fontSize: 10, fontWeight: 700, color: VANI,
                            fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap',
                            transition: 'left .4s ease',
                          }}>you</div>
                        </>
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.5 }}>
                      Based on industry seed data for Hyderabad · Low confidence means fewer data points.
                      VaNi will improve benchmarks as more sellers join.
                    </div>
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
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >Apply &amp; calculate all rates →</button>
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                      VaNi will extrapolate {totalBlocks - 1} more prices
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ════ STEP 2: Rate card ════ */}
            {pricingStep === 'ratecard' && (
              <div style={{ animation: 'fadeUp .4s ease both' }}>

                {/* VaNi bubble — step 2 (new bubble inside rate-card section) */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1) .1s both' }}>
                  <VaniAvatar />
                  <VaniMsg>
                    Based on{' '}
                    <span style={{ color: VANI, fontWeight: 700 }}>{fmtPrice(anchorNum, currency)}</span>
                    {' '}anchor + market data.{' '}
                    <strong>Adjust anything that looks off</strong> — these are your prices.
                  </VaniMsg>
                </div>

                {/* Rate cards — one per equipment type */}
                {EQUIPMENT_TYPES.map((eq, eqIdx) => {
                  const isLast = eqIdx === EQUIPMENT_TYPES.length - 1;
                  return (
                    <div
                      key={eq.id}
                      style={{
                        background: WHITE, border: `1px solid ${BORDER}`,
                        borderRadius: 14, overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,.05)', marginBottom: 14,
                        animation: `cardIn .4s ease ${eqIdx * 0.08}s both`,
                      }}
                    >
                      {/* Card header */}
                      <div style={{
                        padding: '14px 20px', background: SURFACE,
                        borderBottom: `1px solid ${BORDER_LT}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{eq.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, color: TEXT }}>
                            {eq.name}
                          </span>
                        </div>
                        {eq.baseMultiplier !== 1.0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: eq.baseMultiplier < 1 ? SURFACE : GREEN_BG,
                            color: eq.baseMultiplier < 1 ? TEXT_DIM : GREEN,
                            border: `1px solid ${eq.baseMultiplier < 1 ? BORDER_LT : GREEN_BORDER}`,
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}>
                            {eq.baseMultiplier > 1
                              ? `+${Math.round((eq.baseMultiplier - 1) * 100)}% vs Hydraulic`
                              : `−${Math.round((1 - eq.baseMultiplier) * 100)}% vs Hydraulic`
                            }
                          </span>
                        )}
                      </div>

                      {/* Tier rows */}
                      {SERVICE_TIERS.map((tier, tierIdx) => {
                        const key       = `${eq.id}-${tier.id}`;
                        const price     = prices[key] ?? 0;
                        const isEditing = editingKey === key;
                        const isAnchor  = eq.id === 'hydraulic' && tier.id === 'basic';
                        const isLastRow = tierIdx === SERVICE_TIERS.length - 1;

                        return (
                          <div
                            key={tier.id}
                            className="s8a-rate-row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto',
                              alignItems: 'center', gap: 16,
                              padding: '11px 20px',
                              borderBottom: isLastRow && !isLast ? 'none' : isLastRow ? 'none' : `1px solid ${BORDER_LT}`,
                              transition: 'background .15s',
                            }}
                          >
                            {/* Name + tier badge */}
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
                              <>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', gridColumn: '2 / 4' }}>
                                  <input
                                    type="number"
                                    value={editRaw}
                                    onChange={e => setEditRaw(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleEditSave(key)}
                                    autoFocus
                                    style={{
                                      width: 120, padding: '6px 10px', borderRadius: 6,
                                      border: `1.5px solid ${VANI}`, fontSize: 14, fontWeight: 700,
                                      fontFamily: "'IBM Plex Mono', monospace", outline: 'none',
                                    }}
                                  />
                                  <button
                                    onClick={() => handleEditSave(key)}
                                    style={{
                                      padding: '6px 12px', borderRadius: 6, border: 'none',
                                      background: VANI, color: '#fff',
                                      fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >save</button>
                                  <button
                                    onClick={() => setEditingKey(null)}
                                    style={{
                                      padding: '6px 10px', borderRadius: 6,
                                      border: `1.5px solid ${BORDER}`, background: 'transparent',
                                      fontFamily: "'Outfit', sans-serif", fontSize: 12, color: TEXT_DIM,
                                      cursor: 'pointer',
                                    }}
                                  >×</button>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Price display */}
                                <span style={{
                                  fontSize: 14, fontWeight: 800, color: TEXT,
                                  fontFamily: "'IBM Plex Mono', monospace",
                                }}>
                                  {fmtPrice(price, currency)}
                                </span>
                                {/* Anchor row shows ✓; all others show edit button */}
                                {isAnchor ? (
                                  <span style={{ fontSize: 14, color: GREEN }}>✓</span>
                                ) : (
                                  <button
                                    className="s8a-edit-btn"
                                    onClick={() => handleEditStart(key, price)}
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

                      {/* Currency chips — last card only */}
                      {isLast && (
                        <div style={{
                          display: 'flex', gap: 8, padding: '14px 20px', flexWrap: 'wrap',
                          borderTop: `1px solid ${BORDER_LT}`,
                        }}>
                          {extraCurrencies.map(c => (
                            <span key={c} style={{
                              padding: '6px 14px', borderRadius: 100,
                              border: `1.5px solid ${GREEN_BORDER}`,
                              fontSize: 11, fontWeight: 700, color: GREEN,
                              fontFamily: "'IBM Plex Mono', monospace",
                              background: GREEN_BG,
                            }}>{c} ✓</span>
                          ))}
                          {availableCurrencies.map(c => (
                            <button
                              key={c}
                              className="s8a-chip"
                              onClick={() => handleAddCurrency(c)}
                              style={{
                                padding: '6px 14px', borderRadius: 100,
                                border: `1.5px dashed ${BORDER}`,
                                fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                                fontFamily: "'IBM Plex Mono', monospace",
                                background: 'transparent', cursor: 'pointer',
                                transition: 'all .15s',
                              }}
                            >+ {c}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Skip link */}
                <div
                  className="s8a-skip"
                  onClick={handleSkip}
                  style={{
                    fontSize: 12, color: TEXT_MUTED, textDecoration: 'underline',
                    cursor: 'pointer', textAlign: 'center' as const, display: 'block', marginTop: 10,
                  }}
                >
                  Skip for now — I'll set prices later
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>

            {/* Pricing progress — dark card */}
            <div style={{
              background: DARK_BG, border: '1px solid rgba(255,107,43,.12)',
              borderRadius: 14, overflow: 'hidden', marginBottom: 12,
            }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)' }}>
                  Pricing Progress
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  { k: 'Prices set', v: pricingStep === 'ratecard' ? String(pricesSet) : '1', accent: true },
                  { k: 'Pending',    v: pricingStep === 'ratecard' && pricesSet >= totalBlocks ? 'all set ✓' : `${totalBlocks - (pricingStep === 'ratecard' ? pricesSet : 1)} remaining`, muted: true },
                  { k: 'Currency',   v: currency },
                  { k: 'Anchor',     v: anchorNum > 0 ? fmtPrice(anchorNum, currency) : '—', accent: anchorNum > 0 },
                ].map(row => (
                  <div key={row.k} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.05)',
                    fontSize: 12,
                  }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                      color: row.accent ? VANI : row.muted ? 'rgba(255,255,255,.25)' : '#f0ece6',
                      fontStyle: row.muted ? 'italic' : 'normal',
                    }}>{row.v}</span>
                  </div>
                ))}
                {/* Progress bar */}
                <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 100, overflow: 'hidden', margin: '12px 0 6px' }}>
                  <div style={{
                    height: '100%', borderRadius: 100,
                    background: `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                    width: `${pricingStep === 'anchor' ? 8 : progressPct}%`,
                    transition: 'width .5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span style={{ color: VANI }}>{pricingStep === 'anchor' ? '8%' : `${progressPct}%`}</span>
                  <span style={{ color: 'rgba(255,255,255,.3)' }}>of {totalBlocks} prices</span>
                </div>
              </div>
            </div>

            {/* Catalog summary — light card */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, overflow: 'hidden', marginBottom: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: `1px solid ${BORDER_LT}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED }}>
                  Catalog Summary
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  { k: 'Blocks',     v: `${totalBlocks} total` },
                  { k: 'Templates',  v: '3 ready' },
                  { k: 'Equipment',  v: `${EQUIPMENT_TYPES.length} types` },
                  { k: 'Compliance', v: 'BIS · NBC', green: true },
                ].map((row, i, arr) => (
                  <div key={row.k} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_LT}` : 'none',
                  }}>
                    <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                      color: row.green ? GREEN : TEXT,
                    }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VaNi multipliers — light card */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: `1px solid ${BORDER_LT}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED }}>
                  VaNi Multipliers
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  { k: 'Comp AMC',         v: '1.5× Basic'  },
                  { k: 'Premium CMC',      v: '2.3× Basic'  },
                  { k: 'MRL vs Hydraulic', v: '+22%'        },
                  { k: 'Escalator',        v: '+95%'        },
                ].map((row, i, arr) => (
                  <div key={row.k} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_LT}` : 'none',
                  }}>
                    <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: TEXT }}>{row.v}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, lineHeight: 1.5 }}>
                  From {industryNames.join(', ')} market data · editable per block
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION ISLAND (fixed bottom) ── */}
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
        <button
          onClick={handleBack}
          style={{
            padding: '10px 24px', borderRadius: 100,
            border: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}
        >← Back</button>
        <button
          onClick={handleConfirm}
          disabled={pricingStep !== 'ratecard'}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: pricingStep === 'ratecard'
              ? `linear-gradient(135deg, ${VANI}, #ff8f5a)`
              : 'rgba(255,255,255,.1)',
            color: pricingStep === 'ratecard' ? '#fff' : 'rgba(255,255,255,.35)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: pricingStep === 'ratecard' ? 'pointer' : 'not-allowed',
            boxShadow: pricingStep === 'ratecard' ? `0 3px 10px rgba(255,107,43,.5)` : 'none',
            transition: 'all .3s ease',
          }}
        >Confirm pricing →</button>
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

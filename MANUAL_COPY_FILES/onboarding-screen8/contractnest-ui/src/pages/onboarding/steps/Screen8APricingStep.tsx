// src/pages/onboarding/steps/Screen8APricingStep.tsx
// Screen 8A — Pricing Review (Seller / Both)
// Step 1: User sets anchor price → Step 2: VaNi extrapolates full rate card
// Mock data: Lifts & Elevators (3 equipment types × 3 service tiers)
// Navigation: seller → /onboarding/done | both → /onboarding/equipment-confirm

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Color tokens (matches VaniWorkingStep) ────────────────────────────────────
const VANI = '#ff6b2b';
const TEXT = '#1a1816';
const TEXT_DIM = '#8a847a';
const TEXT_MUTED = '#bab4a8';
const BORDER = '#e5e1db';
const WHITE = '#ffffff';
const BG = '#f7f5f2';
const GREEN = '#16a34a';
const SURFACE = '#f0ece6';
const DARK_CARD = 'linear-gradient(145deg, #1a1816, #2a2520)';

// ── Mock data ─────────────────────────────────────────────────────────────────

interface EquipmentType {
  id: string;
  name: string;
  icon: string;
  baseMultiplier: number; // relative to hydraulic
}

interface ServiceTier {
  id: string;
  label: string;
  tierMultiplier: number; // relative to basic
  color: string;
  bgColor: string;
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  { id: 'hydraulic', name: 'Hydraulic Lift',    icon: '🛗', baseMultiplier: 1.0  },
  { id: 'mrl',       name: 'MRL Traction Lift', icon: '⚙️', baseMultiplier: 1.22 },
  { id: 'escalator', name: 'Escalator',          icon: '🏗️', baseMultiplier: 1.95 },
];

const SERVICE_TIERS: ServiceTier[] = [
  { id: 'basic',   label: 'Basic AMC',          tierMultiplier: 1.0, color: '#3b82f6', bgColor: '#eff6ff' },
  { id: 'comp',    label: 'Comprehensive AMC',  tierMultiplier: 1.5, color: '#8b5cf6', bgColor: '#f5f3ff' },
  { id: 'premium', label: 'Premium CMC',        tierMultiplier: 2.3, color: '#f59e0b', bgColor: '#fffbeb' },
];

const CURRENCIES = ['INR', 'USD', 'AED', 'GBP'];
const MARKET = { min: 15000, max: 22000, median: 18000 };
const DEFAULT_ANCHOR = 18000;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number, currency: string) => {
  if (currency === 'INR') return `₹${n.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${n.toLocaleString()}`;
  if (currency === 'AED') return `AED ${n.toLocaleString()}`;
  if (currency === 'GBP') return `£${n.toLocaleString()}`;
  return `${n.toLocaleString()}`;
};

const calcPrices = (anchor: number): Record<string, number> => {
  const result: Record<string, number> = {};
  EQUIPMENT_TYPES.forEach(eq => {
    SERVICE_TIERS.forEach(tier => {
      result[`${eq.id}-${tier.id}`] = Math.round(anchor * eq.baseMultiplier * tier.multiplier);
    });
  });
  return result;
};

// ── Component ─────────────────────────────────────────────────────────────────

const Screen8APricingStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;

  const persona      = routeState.persona      || 'seller';
  const companyName  = routeState.companyName  || 'Sharma Elevators';
  const industryNames = routeState.industryNames || ['Lifts & Elevators'];

  const [pricingStep, setPricingStep] = useState<'anchor' | 'ratecard'>('anchor');
  const [currency, setCurrency]       = useState('INR');
  const [anchorRaw, setAnchorRaw]     = useState(String(DEFAULT_ANCHOR));
  const [prices, setPrices]           = useState<Record<string, number>>({});
  const [editingKey, setEditingKey]   = useState<string | null>(null);
  const [editRaw, setEditRaw]         = useState('');
  const [extraCurrencies, setExtraCurrencies] = useState<string[]>([]);

  const anchorNum = parseInt(anchorRaw, 10) || 0;
  const totalBlocks = EQUIPMENT_TYPES.length * SERVICE_TIERS.length;
  const pricesSet = Object.keys(prices).length;

  // Benchmark marker position (0-100%)
  const markerPct = MARKET.max > MARKET.min
    ? Math.min(100, Math.max(0, ((anchorNum - MARKET.min) / (MARKET.max - MARKET.min)) * 100))
    : 50;
  const medianPct = ((MARKET.median - MARKET.min) / (MARKET.max - MARKET.min)) * 100;

  const handleApply = () => {
    if (!anchorNum) return;
    setPrices(calcPrices(anchorNum));
    setPricingStep('ratecard');
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

  const islandLabel = pricingStep === 'anchor'
    ? 'Set anchor price to continue'
    : `${pricesSet} of ${totalBlocks} prices set`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .tab-active  { border-bottom: 2px solid ${VANI}; color: ${VANI}; font-weight: 700; }
        .tab-inactive { border-bottom: 2px solid transparent; color: ${TEXT_MUTED}; }
        .edit-btn:hover { border-color: ${VANI} !important; color: ${VANI} !important; background: #fff4ee !important; }
        .chip-add:hover { background: #fff4ee !important; border-color: ${VANI} !important; color: ${VANI} !important; }
        .skip-link:hover { text-decoration: underline; }
      `}} />

      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 0,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '40px 24px 160px',
          alignItems: 'start',
        }}>

          {/* ── Left column ── */}
          <div>

            {/* VaNi bubble */}
            <div style={{
              display: 'flex', gap: 12, marginBottom: 28,
              animation: 'fadeIn .5s ease both',
            }}>
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
                {pricingStep === 'anchor'
                  ? <>One thing left — <strong>your prices</strong>. Start with your most common service and I'll calculate the rest.</>
                  : <>Based on <strong>{fmtPrice(anchorNum, currency)}</strong> anchor + market data. <strong>Adjust anything that looks off</strong> — these are your prices.</>
                }
              </div>
            </div>

            {/* Step tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${BORDER}` }}>
              {[
                { key: 'anchor',   label: '1  Set anchor price' },
                { key: 'ratecard', label: '2  Review rate card'  },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={pricingStep === tab.key ? 'tab-active' : 'tab-inactive'}
                  onClick={() => pricingStep === 'ratecard' && tab.key === 'anchor' && setPricingStep('anchor')}
                  style={{
                    padding: '10px 20px', background: 'none', border: 'none',
                    fontFamily: "'Outfit', sans-serif", fontSize: 13,
                    cursor: pricingStep === 'ratecard' && tab.key === 'anchor' ? 'pointer' : 'default',
                    transition: 'all .2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── STEP 1: Anchor price ── */}
            {pricingStep === 'anchor' && (
              <div style={{ animation: 'fadeIn .4s ease both' }}>
                <div style={{
                  background: WHITE, border: `1px solid ${BORDER}`,
                  borderRadius: 12, padding: '24px 28px',
                  boxShadow: '0 2px 12px rgba(0,0,0,.06)',
                  marginBottom: 0,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: TEXT_MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Your most common service
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 22 }}>
                    Basic AMC — Hydraulic Lift
                  </div>

                  {/* Price input row */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      style={{
                        padding: '10px 12px', borderRadius: 8,
                        border: `1.5px solid ${BORDER}`, fontSize: 13, fontWeight: 700,
                        fontFamily: "'Outfit', sans-serif", color: TEXT,
                        background: SURFACE, cursor: 'pointer', outline: 'none',
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
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: `1.5px solid ${anchorNum ? VANI : BORDER}`,
                        fontSize: 22, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace",
                        color: TEXT, outline: 'none', transition: 'border-color .2s',
                      }}
                    />
                    <span style={{ fontSize: 14, color: TEXT_DIM, whiteSpace: 'nowrap' }}>/ year</span>
                  </div>

                  {/* Benchmark */}
                  <div style={{
                    background: SURFACE, borderRadius: 10,
                    padding: '16px 18px', marginBottom: 22,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Market rate · Hyderabad</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                        background: '#fef3c7', color: '#92400e', fontFamily: "'IBM Plex Mono', monospace",
                      }}>Low confidence</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TEXT_DIM, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                      <span>₹15,000</span>
                      <span>median ₹18,000</span>
                      <span>₹22,000</span>
                    </div>

                    {/* Range bar */}
                    <div style={{ position: 'relative', height: 10, background: '#e5e1db', borderRadius: 100, marginBottom: 6 }}>
                      {/* Filled range */}
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #fde68a, #fbbf24)' }} />
                      {/* Median marker */}
                      <div style={{
                        position: 'absolute', top: -3, height: 16, width: 2,
                        background: '#92400e', left: `${medianPct}%`, transform: 'translateX(-50%)',
                        borderRadius: 2,
                      }} />
                      {/* User marker */}
                      {anchorNum > 0 && (
                        <div style={{
                          position: 'absolute', top: -4, height: 18, width: 3,
                          background: VANI, left: `${Math.min(100, Math.max(0, markerPct))}%`,
                          transform: 'translateX(-50%)', borderRadius: 2,
                          boxShadow: `0 0 6px ${VANI}80`,
                          transition: 'left .3s ease',
                        }} />
                      )}
                    </div>
                    {anchorNum > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: VANI, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                          you: {fmtPrice(anchorNum, currency)}/yr
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, lineHeight: 1.5 }}>
                      Based on industry seed data for Hyderabad · Low confidence means fewer data points. VaNi will improve benchmarks as more sellers join.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                      onClick={handleApply}
                      disabled={!anchorNum}
                      style={{
                        padding: '11px 22px', borderRadius: 8, border: 'none',
                        background: anchorNum
                          ? `linear-gradient(135deg, ${VANI}, #ff8f5a)`
                          : '#e5e1db',
                        color: anchorNum ? '#fff' : TEXT_MUTED,
                        fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
                        cursor: anchorNum ? 'pointer' : 'not-allowed',
                        boxShadow: anchorNum ? `0 4px 14px ${VANI}40` : 'none',
                        transition: 'all .2s',
                      }}
                    >
                      Apply & calculate all rates →
                    </button>
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                      VaNi will extrapolate {totalBlocks - 1} more prices
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Rate card ── */}
            {pricingStep === 'ratecard' && (
              <div style={{ animation: 'fadeIn .4s ease both' }}>
                {EQUIPMENT_TYPES.map((eq, eqIdx) => (
                  <div
                    key={eq.id}
                    style={{
                      background: WHITE, border: `1px solid ${BORDER}`,
                      borderRadius: 12, overflow: 'hidden',
                      boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                      marginBottom: 14,
                      animation: `cardIn .4s ease ${eqIdx * 0.1}s both`,
                    }}
                  >
                    {/* Card header */}
                    <div style={{
                      padding: '14px 20px',
                      background: SURFACE,
                      borderBottom: `1px solid ${BORDER}`,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 20 }}>{eq.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{eq.name}</span>
                      {eq.baseMultiplier > 1 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                          background: '#f0fdf4', color: GREEN, border: '1px solid #bbf7d0',
                          fontFamily: "'IBM Plex Mono', monospace", marginLeft: 'auto',
                        }}>
                          +{Math.round((eq.baseMultiplier - 1) * 100)}% vs Hydraulic
                        </span>
                      )}
                    </div>

                    {/* Tier rows */}
                    {SERVICE_TIERS.map(tier => {
                      const key = `${eq.id}-${tier.id}`;
                      const price = prices[key] ?? 0;
                      const isEditing = editingKey === key;

                      return (
                        <div
                          key={tier.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '1fr auto auto',
                            alignItems: 'center', gap: 14,
                            padding: '13px 20px',
                            borderBottom: `1px solid ${BORDER}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{tier.label}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                              background: tier.bgColor, color: tier.color,
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}>
                              {tier.tierMultiplier === 1 ? 'Anchor' : `${tier.tierMultiplier}×`}
                            </span>
                          </div>

                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                type="number"
                                value={editRaw}
                                onChange={e => setEditRaw(e.target.value)}
                                autoFocus
                                style={{
                                  width: 110, padding: '6px 10px', borderRadius: 6,
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
                            </div>
                          ) : (
                            <>
                              <span style={{
                                fontSize: 16, fontWeight: 800, color: TEXT,
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}>
                                {fmtPrice(price, currency)}
                              </span>
                              <button
                                className="edit-btn"
                                onClick={() => handleEditStart(key, price)}
                                style={{
                                  padding: '5px 12px', borderRadius: 6,
                                  border: `1.5px solid ${BORDER}`, background: 'transparent',
                                  fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
                                  color: TEXT_DIM, cursor: 'pointer', transition: 'all .15s',
                                }}
                              >edit</button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add currency row (last card only) */}
                    {eqIdx === EQUIPMENT_TYPES.length - 1 && (
                      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {extraCurrencies.map(c => (
                          <span key={c} style={{
                            padding: '5px 12px', borderRadius: 100,
                            border: `1.5px solid ${BORDER}`,
                            fontSize: 11, fontWeight: 700, color: GREEN,
                            background: '#f0fdf4',
                          }}>{c} ✓</span>
                        ))}
                        {availableCurrencies.map(c => (
                          <button
                            key={c}
                            className="chip-add"
                            onClick={() => handleAddCurrency(c)}
                            style={{
                              padding: '5px 12px', borderRadius: 100,
                              border: `1.5px solid ${BORDER}`, background: 'transparent',
                              fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
                              color: TEXT_DIM, cursor: 'pointer', transition: 'all .15s',
                            }}
                          >+ {c}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div
                  className="skip-link"
                  onClick={handleSkip}
                  style={{ fontSize: 13, color: TEXT_MUTED, cursor: 'pointer', marginTop: 4, display: 'inline-block' }}
                >
                  Skip for now — I'll set prices later
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>

            {/* Pricing progress */}
            <div style={{
              background: DARK_CARD,
              border: '1px solid rgba(255,107,43,.12)',
              borderRadius: 14, padding: '20px 22px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)', marginBottom: 12 }}>
                Pricing Progress
              </div>
              {[
                { k: 'Prices set', v: pricesSet > 0 ? `${pricesSet}` : '0', accent: pricesSet > 0 },
                { k: 'Pending',    v: pricesSet > 0 ? `${totalBlocks - pricesSet} remaining` : `${totalBlocks} remaining`, warn: true },
                { k: 'Currency',   v: currency },
                { k: 'Anchor',     v: anchorNum > 0 ? fmtPrice(anchorNum, currency) : '—', accent: anchorNum > 0 },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: row.accent ? VANI : row.warn && pricesSet < totalBlocks ? '#fbbf24' : 'rgba(255,255,255,.65)' }}>{row.v}</span>
                </div>
              ))}
              {/* Progress bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 100, overflow: 'hidden', marginTop: 4 }}>
                <div style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                  borderRadius: 100,
                  width: `${totalBlocks > 0 ? Math.round((pricesSet / totalBlocks) * 100) : 0}%`,
                  transition: 'width .5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: VANI, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {totalBlocks > 0 ? Math.round((pricesSet / totalBlocks) * 100) : 0}%
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  of {totalBlocks} prices
                </span>
              </div>
            </div>

            {/* Catalog summary */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '16px 18px', marginBottom: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED, marginBottom: 12 }}>
                Catalog Summary
              </div>
              {[
                { k: 'Blocks',     v: String(totalBlocks) },
                { k: 'Templates',  v: '3' },
                { k: 'Equipment',  v: String(EQUIPMENT_TYPES.length) + ' types' },
                { k: 'Compliance', v: 'BIS · NBC', green: true },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 7, marginBottom: 7, borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: row.green ? GREEN : TEXT, fontFamily: "'IBM Plex Mono', monospace" }}>{row.v}</span>
                </div>
              ))}
            </div>

            {/* VaNi multipliers */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED, marginBottom: 12 }}>
                VaNi Multipliers
              </div>
              {[
                { k: 'Comp AMC',          v: '1.5× Basic'  },
                { k: 'Premium CMC',       v: '2.3× Basic'  },
                { k: 'MRL vs Hydraulic',  v: '+22%'        },
                { k: 'Escalator',         v: '+95%'        },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 7, marginBottom: 7, borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: VANI, fontFamily: "'IBM Plex Mono', monospace" }}>{row.v}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.5 }}>
                Derived from {industryNames.join(', ')} market data · editable per block
              </div>
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
        <button
          onClick={handleBack}
          style={{
            padding: '10px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,.15)',
            background: 'transparent', color: 'rgba(255,255,255,.65)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
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
            boxShadow: pricingStep === 'ratecard' ? `0 3px 10px ${VANI}50` : 'none',
            transition: 'all .3s ease',
          }}
        >
          {persona === 'both' ? 'Confirm pricing →' : 'Confirm pricing →'}
        </button>
      </div>
    </>
  );
};

export default Screen8APricingStep;

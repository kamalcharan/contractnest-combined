// src/components/onboarding/LovCategoryCard.tsx
// One List-of-Values category as an onboarding card: what / why / where
// tiles, the values already there, an inline "type your own" form and
// one-tap suggestions for the tenant's kind of business.
//
// Used by the "Your team" (Roles) and "Your tags" (Tags) onboarding pages.
// Data comes from useLovCategory; the copy and suggestions from
// DEFAULT_LOV_SEED (utils/constants/lovDefaults.ts).

import React, { useState } from 'react';
import { vaniToast } from '@/components/common/toast';
import { LOV_COLOR_PALETTE, LovSeedCategory } from '@/utils/constants/lovDefaults';
import type { UseLovCategoryResult } from '@/hooks/useLovCategory';
import { VANI_TOKENS as T, VaniSpinner } from './VaniStepShell';
import { normaliseJourneyPersona } from './journey';

export type LovPersona = 'seller' | 'buyer' | 'both';

/** Route persona → the three the lists know. Unknown reads as seller, as the journey does. */
export const lovPersonaFrom = (raw: unknown): LovPersona => normaliseJourneyPersona(raw) || 'seller';

/** "Suggested for a …" — the tenant's kind of business, in plain words. */
export const BUSINESS_NOUN: Record<LovPersona, string> = {
  seller: 'service company',
  buyer: 'facility owner',
  both: 'business',
};

interface LovCategoryCardProps {
  seed: LovSeedCategory;
  title: string;
  subtitle: string;
  persona: LovPersona;
  /** e.g. "service company" — used in "Suggested for a …" */
  businessNoun: string;
  lov: UseLovCategoryResult;
  placeholder: string;
  /** Rendered at the bottom of the card body (the invite section on "Your team") */
  footer?: React.ReactNode;
}

const nextColor = (count: number) => LOV_COLOR_PALETTE[count % LOV_COLOR_PALETTE.length];

const LovCategoryCard: React.FC<LovCategoryCardProps> = ({
  seed, title, subtitle, persona, businessNoun, lov, placeholder, footer,
}) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(LOV_COLOR_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  const existing = new Set(lov.values.map((v) => v.DisplayName.toLowerCase()));
  const suggestions = (seed.suggestions[persona] || []).filter((s) => !existing.has(s.toLowerCase()));

  const add = async (value: string, hex: string) => {
    const err = await lov.addValue(value, hex);
    if (err) {
      setError(err);
      return false;
    }
    vaniToast.success(`Added "${value.trim()}" to ${seed.display_name}`);
    return true;
  };

  const submitTyped = async () => {
    setError(null);
    if (await add(name, color)) {
      setAdding(false);
      setName('');
    }
  };

  const tiles: Array<[string, string]> = [
    ['What', seed.explain.what],
    ['Why', seed.explain.why],
    ['Where', seed.explain.where],
  ];

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: T.TEXT_MUTED, margin: 0,
  };

  return (
    <section aria-label={title} style={{
      background: T.WHITE, border: `1px solid ${T.BORDER}`, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,.06)', animation: 'vaniFadeIn .4s ease both',
    }}>
      <div style={{
        padding: '14px 20px', background: T.SURFACE, borderBottom: `1px solid ${T.BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.TEXT }}>{title}</div>
          <div style={{ fontSize: 12.5, color: T.TEXT_DIM }}>{subtitle}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
          background: T.VANI_SOFT, color: T.VANI, border: `1px solid ${T.VANI_LINE}`, fontFamily: T.MONO,
        }}>
          {lov.values.length} ready
        </span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          {tiles.map(([k, v]) => (
            <div key={k} style={{ background: T.SURFACE, border: `1px solid ${T.BORDER}`, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: T.TEXT_DIM, lineHeight: 1.5 }}>
              <div style={{ ...label, color: T.TEXT, marginBottom: 3 }}>{k}</div>
              {v}
            </div>
          ))}
        </div>

        {lov.loadError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: T.ERROR, fontSize: 13 }}>
            {lov.loadError}
          </div>
        )}

        {lov.categoryId === null && !lov.loadError ? (
          <p style={{ fontSize: 13, color: T.TEXT_MUTED, margin: 0 }}>
            This list isn't ready yet — you'll find it under Settings → Configure → List of Values after onboarding.
          </p>
        ) : (
          <>
            <p style={label}>Ready to use</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lov.values.map((v) => (
                <span key={v.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 100,
                  border: `1px solid ${T.BORDER}`, background: T.SURFACE, fontSize: 13, fontWeight: 600, color: T.TEXT,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.hexcolor || T.TEXT_MUTED, flexShrink: 0 }} />
                  {v.DisplayName}
                  {!v.is_deletable && <span style={{ fontSize: 10, color: T.TEXT_MUTED, fontWeight: 500 }}>always there</span>}
                </span>
              ))}
              {!adding && (
                <button
                  onClick={() => { setAdding(true); setName(''); setError(null); setColor(nextColor(lov.values.length)); }}
                  disabled={lov.saving}
                  style={{
                    padding: '6px 12px', borderRadius: 100, cursor: 'pointer', border: `1px dashed ${T.TEXT_MUTED}`,
                    background: 'transparent', fontSize: 13, fontWeight: 600, color: T.TEXT_DIM, fontFamily: T.FONT,
                  }}
                >
                  + Type your own
                </button>
              )}
            </div>

            {adding && (
              <div style={{ background: T.SURFACE, border: `1px solid ${T.BORDER}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitTyped(); if (e.key === 'Escape') setAdding(false); }}
                    placeholder={placeholder}
                    maxLength={40}
                    disabled={lov.saving}
                    aria-label={`New ${seed.display_name} value`}
                    style={{
                      flex: 1, minWidth: 180, padding: '9px 12px', borderRadius: 8, border: `1px solid ${T.BORDER}`,
                      fontSize: 13, color: T.TEXT, fontFamily: T.FONT, outline: 'none', background: T.WHITE,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 5 }}>
                    {LOV_COLOR_PALETTE.map((c) => (
                      <button key={c} onClick={() => setColor(c)} disabled={lov.saving} aria-label={`Colour ${c}`}
                        style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                          border: color === c ? `2px solid ${T.TEXT}` : '2px solid transparent' }} />
                    ))}
                  </div>
                </div>
                {error && <p style={{ fontSize: 12, color: T.ERROR, margin: '0 0 10px' }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={submitTyped} disabled={lov.saving || !name.trim()}
                    style={{
                      padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                      background: `linear-gradient(135deg, ${T.VANI}, ${T.VANI_2})`, color: '#fff', fontSize: 13, fontWeight: 700,
                      fontFamily: T.FONT, opacity: lov.saving || !name.trim() ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 7,
                    }}>
                    {lov.saving && <VaniSpinner size={12} />}
                    Add
                  </button>
                  <button onClick={() => setAdding(false)} disabled={lov.saving}
                    style={{ padding: '8px 18px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${T.BORDER}`,
                      background: T.WHITE, color: T.TEXT_DIM, fontSize: 13, fontWeight: 600, fontFamily: T.FONT }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!adding && error && <p style={{ fontSize: 12, color: T.ERROR, margin: 0 }}>{error}</p>}

            {suggestions.length > 0 && (
              <>
                <p style={label}>Suggested for a {businessNoun} · tap to add</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {suggestions.map((s) => (
                    <button key={s} disabled={lov.saving}
                      onClick={() => { setError(null); add(s, nextColor(lov.values.length)); }}
                      style={{
                        padding: '6px 12px', borderRadius: 100, cursor: lov.saving ? 'wait' : 'pointer',
                        border: `1px dashed ${T.VANI_LINE}`, background: T.WHITE, fontSize: 13, fontWeight: 600,
                        color: T.TEXT_DIM, fontFamily: T.FONT,
                      }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {footer}
      </div>
    </section>
  );
};

export default LovCategoryCard;

// src/components/onboarding/VaniStepShell.tsx
// The frame shared by the late VaNi onboarding pages ("How you get paid",
// "Your team", "Your tags"): VaNi's message on top, the step's cards in the
// main column, a "what this looks like" preview in a side column, and the
// Skip / Continue footer.
//
// Palette and fonts are the VaNi onboarding ones every screen from
// vani-working on carries (see LovSetupStep's original tokens), exported as
// VANI_TOKENS so the cards inside use the same values.

import React from 'react';

export const VANI_TOKENS = {
  VANI: '#ff6b2b',
  VANI_2: '#ff8f5a',
  VANI_SOFT: '#fff4ee',
  VANI_LINE: '#ffd9c2',
  TEXT: '#1a1816',
  TEXT_DIM: '#8a847a',
  TEXT_MUTED: '#bab4a8',
  BORDER: '#e5e1db',
  WHITE: '#ffffff',
  BG: '#f7f5f2',
  SURFACE: '#faf9f7',
  OK: '#15803d',
  OK_SOFT: '#ecfdf3',
  ERROR: '#dc2626',
  FONT: "'Outfit', sans-serif",
  MONO: "'IBM Plex Mono', monospace",
} as const;

const T = VANI_TOKENS;

export const vaniPrimaryButton = (disabled = false): React.CSSProperties => ({
  padding: '12px 32px', borderRadius: 100, border: 'none',
  background: `linear-gradient(135deg, ${T.VANI}, ${T.VANI_2})`, color: '#fff',
  fontFamily: T.FONT, fontSize: 14, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  boxShadow: '0 3px 10px rgba(255,107,43,.3)',
  display: 'inline-flex', alignItems: 'center', gap: 8,
});

export const VaniSpinner: React.FC<{ size?: number; light?: boolean }> = ({ size = 14, light = true }) => (
  <span
    aria-hidden="true"
    style={{
      width: size, height: size, borderRadius: '50%', display: 'inline-block',
      border: `2px solid ${light ? 'rgba(255,255,255,.4)' : T.BORDER}`,
      borderTopColor: light ? '#fff' : T.VANI,
      animation: 'vaniSpin .7s linear infinite',
    }}
  />
);

interface VaniStepShellProps {
  title: string;
  /** VaNi's message under the title */
  message: React.ReactNode;
  /** Shown instead of the content while the step loads */
  loading?: boolean;
  loadingText?: string;
  /** Right-hand preview column; omitted = single column */
  aside?: React.ReactNode;
  asideTitle?: string;
  skipLabel?: string;
  onSkip?: () => void;
  onBack?: () => void;
  continueLabel?: string;
  onContinue: () => void;
  continueBusy?: boolean;
  continueDisabled?: boolean;
  children: React.ReactNode;
}

const VaniStepShell: React.FC<VaniStepShellProps> = ({
  title, message, loading, loadingText = 'Loading…',
  aside, asideTitle = "Where you'll see this",
  skipLabel = 'Skip for now', onSkip, onBack,
  continueLabel = 'Continue →', onContinue, continueBusy, continueDisabled,
  children,
}) => (
  <>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes vaniSpin { to { transform: rotate(360deg); } }
      @keyframes vaniFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .vani-step-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
      .vani-step-aside { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 12px; }
      @media (max-width: 900px) {
        .vani-step-grid { grid-template-columns: minmax(0, 1fr); }
        .vani-step-aside { position: static; }
      }
      .vani-link:hover { text-decoration: underline; }
      @media (prefers-reduced-motion: reduce) { .vani-step-root * { animation: none !important; } }
    `}} />
    <div className="vani-step-root" style={{ background: T.BG, minHeight: '100vh', paddingTop: 64, fontFamily: T.FONT }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ margin: '0 auto 16px', width: 36, display: 'flex', justifyContent: 'center' }}>
              <VaniSpinner size={36} light={false} />
            </div>
            <p style={{ color: T.TEXT_DIM, fontSize: 14 }}>{loadingText}</p>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: aside ? 1080 : 720, margin: '0 auto', padding: '40px 24px 160px' }}>
          <div className={aside ? 'vani-step-grid' : undefined}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {/* VaNi bubble */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, animation: 'vaniFadeIn .5s ease both' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `linear-gradient(135deg, ${T.VANI}, ${T.VANI_2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 14, color: '#fff',
                }}>V</div>
                <div style={{
                  background: T.WHITE, border: `1px solid ${T.BORDER}`, borderRadius: '0 12px 12px 12px',
                  padding: '14px 18px', fontSize: 14, color: T.TEXT, lineHeight: 1.6, flex: 1, minWidth: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: T.TEXT }}>{title}</h1>
                  {message}
                </div>
              </div>

              {children}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 18 }}>
                  {onBack && (
                    <button className="vani-link" onClick={onBack} disabled={continueBusy}
                      style={{ background: 'none', border: 'none', color: T.TEXT_DIM, fontSize: 13, cursor: 'pointer', fontFamily: T.FONT }}>
                      ← Back
                    </button>
                  )}
                  {onSkip && (
                    <button className="vani-link" onClick={onSkip} disabled={continueBusy}
                      style={{ background: 'none', border: 'none', color: T.TEXT_DIM, fontSize: 13, cursor: 'pointer', fontFamily: T.FONT }}>
                      {skipLabel}
                    </button>
                  )}
                </div>
                <button onClick={onContinue} disabled={continueBusy || continueDisabled}
                  style={vaniPrimaryButton(!!(continueBusy || continueDisabled))}>
                  {continueBusy && <VaniSpinner />}
                  {continueLabel}
                </button>
              </div>
            </div>

            {aside && (
              <aside className="vani-step-aside" aria-label={asideTitle}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: T.TEXT_MUTED }}>
                  {asideTitle}
                </div>
                {aside}
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  </>
);

export default VaniStepShell;

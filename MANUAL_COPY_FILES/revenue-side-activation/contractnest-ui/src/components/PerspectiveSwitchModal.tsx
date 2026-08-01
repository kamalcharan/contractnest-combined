// src/components/PerspectiveSwitchModal.tsx
//
// The Revenue/Expense switch modal, in three modes driven by
// AuthContext.pendingPerspectiveReadiness:
//
//   'ready'             → the original confirm dialog, unchanged behaviour.
//   'checking'          → brief probe state while side-readiness resolves.
//   'activation_needed' → a proper EMPTY STATE: illustration, what the two
//                         sides of the toggle mean, and an offer to activate
//                         the missing side by running the lite onboarding
//                         (which is idempotent — it only adds what's missing).
//
// Only the Expense→Revenue direction can currently produce
// 'activation_needed' (see utils/perspective/sideReadiness.ts).

import React from 'react';
import { ArrowRightLeft, Loader2, Sparkles, FileText, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ConfirmationDialog from './ui/ConfirmationDialog';

// ── Empty-state illustration ─────────────────────────────────────────────────
// Inline SVG so there is no asset dependency and it inherits theme colours.
// Motif: the toggle itself — the Expense pill filled (where the tenant is),
// the Revenue pill dashed and waiting, with a small catalog card above it.
const ActivationIllustration: React.FC<{ accent: string; muted: string; surface: string }> = ({
  accent,
  muted,
  surface,
}) => (
  <svg width="220" height="132" viewBox="0 0 220 132" fill="none" aria-hidden="true">
    {/* catalog card, waiting to exist */}
    <g opacity="0.9">
      <rect x="128" y="8" width="72" height="52" rx="8" fill={surface} stroke={accent} strokeDasharray="5 4" strokeWidth="1.6" />
      <rect x="138" y="18" width="34" height="6" rx="3" fill={accent} opacity="0.85" />
      <rect x="138" y="30" width="52" height="4" rx="2" fill={muted} opacity="0.55" />
      <rect x="138" y="39" width="44" height="4" rx="2" fill={muted} opacity="0.4" />
      <rect x="138" y="48" width="24" height="5" rx="2.5" fill={accent} opacity="0.5" />
    </g>
    {/* sparkle */}
    <path
      d="M113 22l2.2 5.6 5.6 2.2-5.6 2.2-2.2 5.6-2.2-5.6-5.6-2.2 5.6-2.2 2.2-5.6z"
      fill={accent}
      opacity="0.9"
    />
    {/* the toggle */}
    <rect x="22" y="78" width="176" height="40" rx="20" fill={surface} stroke={muted} strokeOpacity="0.35" strokeWidth="1.4" />
    {/* Expense — current, filled */}
    <rect x="27" y="83" width="84" height="30" rx="15" fill={muted} opacity="0.28" />
    <rect x="40" y="95" width="58" height="6" rx="3" fill={muted} opacity="0.8" />
    {/* Revenue — empty, dashed, the one being tapped */}
    <rect x="113" y="83" width="80" height="30" rx="15" fill="none" stroke={accent} strokeDasharray="5 4" strokeWidth="1.8" />
    <rect x="127" y="95" width="40" height="6" rx="3" fill={accent} opacity="0.55" />
    {/* tap ripple */}
    <circle cx="153" cy="98" r="16" stroke={accent} strokeOpacity="0.35" strokeWidth="1.4" fill="none" />
    <circle cx="153" cy="98" r="22" stroke={accent} strokeOpacity="0.15" strokeWidth="1.2" fill="none" />
  </svg>
);

const PerspectiveSwitchModal: React.FC = () => {
  const {
    showPerspectiveSwitchModal,
    pendingPerspective,
    pendingPerspectiveReadiness,
    perspective,
    confirmPerspectiveSwitch,
    cancelPerspectiveSwitch,
    activatePendingPerspective,
  } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();

  if (!showPerspectiveSwitchModal || !pendingPerspective) {
    return null;
  }

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── Modes 'checking' / 'activation_needed' — custom overlay ───────────────
  if (pendingPerspectiveReadiness !== 'ready') {
    const surface = colors.utility.secondaryBackground;
    const ink = colors.utility.primaryText;
    const soft = colors.utility.secondaryText;
    const accent = colors.brand.primary;
    const edge = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: 'rgba(15, 12, 10, 0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={cancelPerspectiveSwitch}
        role="dialog"
        aria-modal="true"
        aria-label="Revenue side not set up"
      >
        <div
          style={{
            background: surface,
            border: `1px solid ${edge}`,
            borderRadius: 18,
            padding: '32px 32px 26px',
            width: 460,
            maxWidth: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {pendingPerspectiveReadiness === 'checking' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 0' }}>
              <Loader2 size={26} className="animate-spin" style={{ color: accent }} />
              <div style={{ fontSize: 14, color: soft }}>Checking your Revenue side…</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <ActivationIllustration
                  accent={accent}
                  muted={soft}
                  surface={colors.utility.primaryBackground}
                />
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 800, color: ink, margin: '10px 0 6px', letterSpacing: '-0.01em' }}>
                Revenue is your selling side
              </h2>
              <p style={{ fontSize: 13.5, color: soft, lineHeight: 1.6, margin: '0 0 18px' }}>
                The toggle switches which half of your business you&apos;re looking at:
              </p>

              {/* what the two sides mean */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 18 }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    border: `1.5px dashed ${accent}55`, background: `${accent}0d`,
                    borderRadius: 10, padding: '10px 12px',
                  }}
                >
                  <FileText size={16} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>Revenue · Clients</div>
                    <div style={{ fontSize: 12, color: soft, lineHeight: 1.5 }}>
                      Contracts you send — your service catalog, prices and receivables.
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    border: `1px solid ${edge}`, background: colors.utility.primaryBackground,
                    borderRadius: 10, padding: '10px 12px',
                  }}
                >
                  <Wallet size={16} style={{ color: soft, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>
                      Expense · Vendors <span style={{ fontWeight: 600, color: soft, fontSize: 11 }}>— where you are now</span>
                    </div>
                    <div style={{ fontSize: 12, color: soft, lineHeight: 1.5 }}>
                      Contracts you receive — your assets, vendor dues and payables.
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: soft, lineHeight: 1.6, margin: '0 0 20px' }}>
                Your Revenue side isn&apos;t set up yet — there&apos;s no catalog or pricing behind
                it, so there&apos;s nothing to show. VaNi can build it the same way she set up
                your workspace: a couple of questions, then your catalog with market-reference
                prices.
              </p>

              <button
                type="button"
                onClick={activatePendingPerspective}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: accent, color: '#ffffff', fontSize: 14.5, fontWeight: 700,
                  boxShadow: `0 6px 18px ${accent}45`,
                }}
              >
                <Sparkles size={16} />
                Set up my Revenue side · ~6 min
              </button>
              <button
                type="button"
                onClick={cancelPerspectiveSwitch}
                style={{
                  width: '100%', marginTop: 10, padding: '10px 20px', borderRadius: 10,
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: soft, fontSize: 13, fontWeight: 600,
                }}
              >
                Not now — stay in Expense
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Mode 'ready' — the original confirm dialog, unchanged ─────────────────
  const sourceLabel = perspective === 'revenue' ? 'Revenue' : 'Expense';
  const sourceSubLabel = perspective === 'revenue' ? 'Clients' : 'Vendors';
  const targetLabel = pendingPerspective === 'revenue' ? 'Revenue' : 'Expense';
  const targetSubLabel = pendingPerspective === 'revenue' ? 'Clients' : 'Vendors';

  const SourceBadge = () => (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: perspective === 'revenue' ? '#dbeafe' : '#fce7f3',
        color: perspective === 'revenue' ? '#2563eb' : '#db2777',
      }}
    >
      {sourceLabel} · {sourceSubLabel}
    </span>
  );

  const TargetBadge = () => (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: pendingPerspective === 'revenue' ? '#dbeafe' : '#fce7f3',
        color: pendingPerspective === 'revenue' ? '#2563eb' : '#db2777',
      }}
    >
      {targetLabel} · {targetSubLabel}
    </span>
  );

  const description = (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        <SourceBadge />
        <span className="text-muted-foreground">&rarr;</span>
        <TargetBadge />
      </div>
      <p className="text-sm text-muted-foreground">
        You are switching from <strong>{sourceLabel}</strong> to <strong>{targetLabel}</strong> mode.
      </p>
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {pendingPerspective === 'revenue'
            ? 'Revenue mode shows client contracts, client equipment, and accounts receivable.'
            : 'Expense mode shows vendor contracts, your own equipment, and accounts payable.'}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        All data will be refreshed to show {targetLabel.toLowerCase()} context across all pages.
      </p>
    </div>
  );

  return (
    <ConfirmationDialog
      isOpen={showPerspectiveSwitchModal}
      onClose={cancelPerspectiveSwitch}
      onConfirm={confirmPerspectiveSwitch}
      title="Switch Perspective"
      description={description as any}
      confirmText={`Switch to ${targetLabel}`}
      cancelText="Cancel"
      type="info"
      icon={<ArrowRightLeft className="h-6 w-6" />}
    />
  );
};

export default PerspectiveSwitchModal;

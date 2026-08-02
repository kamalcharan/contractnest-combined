// src/components/lite/TrialCrossSellModal.tsx
//
// The ONE reusable cross-sell modal for lite tenants (CNAK/RFQ tier).
// Problem-led per the copy rule: dark VaNi header asks the QUESTION, the
// body lists three value OUTCOMES, the trial strip carries the offer, the
// CTA runs the express (lite) onboarding — completing it clears the tier.
// Every restricted Settings tile (and any in-page gate) reuses this with a
// different {icon, question, outcomes} config from liteAccess.ts.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Check, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { LiteCrossSellCopy, LITE_TRIAL } from '../../utils/constants/liteAccess';

interface TrialCrossSellModalProps {
  open: boolean;
  copy: LiteCrossSellCopy | null;
  onClose: () => void;
}

const getIcon = (name: string) => {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
  return icons[name] || LucideIcons.Sparkles;
};

const TrialCrossSellModal: React.FC<TrialCrossSellModalProps> = ({ open, copy, onClose }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !copy) return null;

  const IconComponent = getIcon(copy.icon);
  const brand = colors.brand.primary;

  const startTrial = () => {
    onClose();
    navigate(LITE_TRIAL.route);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 12, 10, 0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden text-center"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Dark VaNi header with orb */}
        <div
          className="relative px-6 pt-6 pb-5 overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #1A1816, #31261D)' }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: -30, right: -30, width: 110, height: 110,
              borderRadius: '44% 56% 58% 42% / 46% 44% 56% 54%',
              background: `radial-gradient(circle at 35% 30%, ${brand}D0, ${brand} 60%, ${brand}90)`,
              opacity: 0.85, filter: 'blur(1px)'
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded z-10"
            style={{ color: 'rgba(240,236,230,0.5)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div
            className="relative mx-auto mb-3 flex items-center justify-center rounded-xl"
            style={{
              width: 44, height: 44,
              backgroundColor: `${brand}29`,
              border: `1px solid ${brand}66`,
              color: brand
            }}
          >
            <IconComponent size={22} />
          </div>
          <h3
            className="relative font-extrabold leading-snug"
            style={{ color: '#F0ECE6', fontSize: 17.5, letterSpacing: '-0.01em' }}
          >
            {copy.question}
          </h3>
        </div>

        {/* Outcomes */}
        <div className="px-6 pt-5 pb-6">
          <div className="flex flex-col gap-2.5 text-left mb-4">
            {copy.outcomes.map((o, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span
                  className="flex-none flex items-center justify-center rounded-md mt-0.5"
                  style={{
                    width: 19, height: 19,
                    backgroundColor: `${colors.semantic.success}15`,
                    border: `1px solid ${colors.semantic.success}40`,
                    color: colors.semantic.success
                  }}
                >
                  <Check size={11} />
                </span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    {o.title}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                    {o.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trial strip */}
          <div
            className="rounded-lg px-3 py-2.5 text-xs font-semibold mb-3.5"
            style={{
              backgroundColor: `${brand}12`,
              border: `1px solid ${brand}40`,
              color: colors.utility.primaryText
            }}
          >
            🎁 {LITE_TRIAL.strip}
          </div>

          <button
            onClick={startTrial}
            className="w-full rounded-xl py-3 font-extrabold text-sm text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${brand}, ${brand}CC)`,
              boxShadow: `0 8px 22px ${brand}52`
            }}
          >
            {LITE_TRIAL.cta} · ~6 min setup
          </button>
          <button
            onClick={onClose}
            className="block mx-auto mt-2.5 text-xs font-semibold bg-transparent border-none cursor-pointer"
            style={{ color: colors.utility.secondaryText }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialCrossSellModal;

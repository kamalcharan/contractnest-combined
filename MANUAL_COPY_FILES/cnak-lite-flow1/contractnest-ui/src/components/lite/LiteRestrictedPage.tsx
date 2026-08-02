// src/components/lite/LiteRestrictedPage.tsx
//
// Full-pane problem-led empty state a lite tenant sees on a restricted
// route (via LiteRouteGate). Same copy registry as the modal — question,
// three outcome tiles, trial CTA into the express onboarding. Deep links
// and sidebar clicks land here identically.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { LiteCrossSellCopy, LITE_TRIAL } from '../../utils/constants/liteAccess';

interface LiteRestrictedPageProps {
  copy: LiteCrossSellCopy;
}

const getIcon = (name: string) => {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
  return icons[name] || LucideIcons.Sparkles;
};

const LiteRestrictedPage: React.FC<LiteRestrictedPageProps> = ({ copy }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;
  const IconComponent = getIcon(copy.icon);

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <div
          className="mx-auto mb-5 flex items-center justify-center rounded-2xl"
          style={{
            width: 64, height: 64,
            backgroundColor: `${brand}12`,
            border: `1px solid ${brand}40`,
            color: brand
          }}
        >
          <IconComponent size={28} />
        </div>

        <h2
          className="font-extrabold leading-snug"
          style={{ color: colors.utility.primaryText, fontSize: 21, letterSpacing: '-0.015em' }}
        >
          {copy.question}
        </h2>

        {copy.context && (
          <p
            className="text-sm leading-relaxed mx-auto mt-2.5 mb-1"
            style={{ color: colors.utility.secondaryText, maxWidth: 440 }}
          >
            {copy.context}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 mb-6">
          {copy.outcomes.map((o, i) => (
            <div
              key={i}
              className="rounded-xl px-3 py-3 text-left"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}14`,
                boxShadow: isDarkMode ? 'none' : '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <div className="text-[13px] font-bold mb-0.5" style={{ color: colors.utility.primaryText }}>
                {o.title}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                {o.detail}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(LITE_TRIAL.route)}
          className="rounded-xl px-6 py-3 font-extrabold text-sm text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: `linear-gradient(135deg, ${brand}, ${brand}CC)`,
            boxShadow: `0 8px 22px ${brand}52`
          }}
        >
          {LITE_TRIAL.cta} — first 3 contracts on us
        </button>
        <span className="block text-[11px] mt-2.5" style={{ color: colors.utility.secondaryText }}>
          {LITE_TRIAL.fine}
        </span>
      </div>
    </div>
  );
};

export default LiteRestrictedPage;

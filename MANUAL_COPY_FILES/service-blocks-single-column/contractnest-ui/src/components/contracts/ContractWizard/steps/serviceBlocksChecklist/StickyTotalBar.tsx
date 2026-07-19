// src/components/contracts/ContractWizard/steps/serviceBlocksChecklist/StickyTotalBar.tsx
// Mock 9 — sticky running total bar. Continue triggers the wizard's own
// validated handleNext (passed down as onContinue) — no duplicate logic.

import React from 'react';

interface StickyTotalBarProps {
  colors: any;
  isDarkMode: boolean;
  count: number;
  totalLabel: string;
  discountCount: number;
  hidePricing?: boolean;
  onContinue?: () => void;
}

const StickyTotalBar: React.FC<StickyTotalBarProps> = ({
  colors,
  isDarkMode,
  count,
  totalLabel,
  discountCount,
  hidePricing = false,
  onContinue,
}) => {
  return (
    <div
      className="sticky bottom-0 left-0 right-0 border-t z-30"
      style={{
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.97)' : '#ffffff',
        borderColor: colors.utility.primaryText + '15',
        boxShadow: '0 -6px 20px rgba(20,40,80,.07)',
      }}
    >
      <div className="max-w-[780px] mx-auto px-4 py-3 flex items-center gap-3.5">
        <div className="text-[13px]" style={{ color: colors.utility.primaryText }}>
          <b className="text-[15px]">{count} block{count === 1 ? '' : 's'}</b>
          {!hidePricing && (
            <>
              {' · '}
              <b className="text-[15px] tabular-nums">{totalLabel}</b>
              <span className="text-[12px]" style={{ color: colors.utility.secondaryText }}>
                {' '}term total incl. tax
                {discountCount > 0 &&
                  ` · discount recorded on ${discountCount} block${discountCount === 1 ? '' : 's'}`}
              </span>
            </>
          )}
        </div>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="ml-auto rounded-[9px] px-6 py-2.5 text-[13.5px] font-extrabold text-white transition hover:opacity-90"
            style={{ backgroundColor: colors.brand.primary }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default StickyTotalBar;

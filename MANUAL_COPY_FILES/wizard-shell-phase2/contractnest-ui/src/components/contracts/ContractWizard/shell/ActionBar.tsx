// src/components/contracts/ContractWizard/shell/ActionBar.tsx
// WizardShell Phase 2 — replaces FloatingActionIsland inside the ContractWizard.
// Design contract: Continue is NEVER silently disabled. Pressing it on an
// incomplete step surfaces a reason hint above the bar instead. Progress dots
// live only in the header PhaseStepper — one progress model per screen.
// (FloatingActionIsland stays untouched for the admin global-designer.)
import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Check, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DraftSaveStatus } from '../FloatingActionIsland';

export interface ActionBarProps {
  stepLabel: string;
  totalValue: number;
  currency: string;
  canGoBack: boolean;
  /** Busy = a mutation is in flight; the ONLY reason Continue ever disables */
  isBusy: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  sendButtonText?: string;
  showTotal?: boolean;
  draftSaveStatus?: DraftSaveStatus;
  /** Why Continue is blocked right now (set after a blocked attempt), else null */
  blockedHint: string | null;
}

const ActionBar: React.FC<ActionBarProps> = ({
  stepLabel,
  totalValue,
  currency,
  canGoBack,
  isBusy,
  isLastStep,
  onBack,
  onNext,
  sendButtonText,
  showTotal = true,
  draftSaveStatus = 'idle',
  blockedHint,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 px-3 w-full max-w-2xl pointer-events-none">
      {/* Blocked-continue hint — the "why", never a mystery grey-out */}
      {blockedHint && (
        <div
          role="alert"
          className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg"
          style={{
            backgroundColor: `${colors.semantic.error}15`,
            border: `1px solid ${colors.semantic.error}`,
            color: colors.semantic.error,
            backdropFilter: 'blur(8px)',
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {blockedHint}
        </div>
      )}

      <div
        className="pointer-events-auto flex items-center gap-3 rounded-full px-3 py-2 shadow-2xl w-full sm:w-auto"
        style={{
          backgroundColor: isDarkMode ? 'rgba(24,26,32,0.92)' : 'rgba(255,255,255,0.94)',
          border: `1px solid ${colors.utility.primaryText}15`,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isBusy}
          className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-opacity"
          style={{
            color: colors.utility.secondaryText,
            opacity: canGoBack && !isBusy ? 1 : 0.35,
            cursor: canGoBack && !isBusy ? 'pointer' : 'default',
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Step label + draft status */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <span
            className="text-xs font-medium truncate"
            style={{ color: colors.utility.secondaryText }}
          >
            {stepLabel}
          </span>
          {draftSaveStatus !== 'idle' && (
            <span
              className="flex items-center gap-1 text-[10px] font-semibold uppercase flex-shrink-0"
              style={{
                color:
                  draftSaveStatus === 'saving'
                    ? colors.utility.secondaryText
                    : draftSaveStatus === 'saved'
                      ? colors.semantic.success
                      : colors.semantic.error,
                letterSpacing: '0.06em',
              }}
            >
              {draftSaveStatus === 'saving' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : draftSaveStatus === 'saved' ? (
                <Check className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {draftSaveStatus === 'saving' ? 'Saving' : draftSaveStatus === 'saved' ? 'Saved' : 'Save failed'}
            </span>
          )}
        </div>

        {/* Total */}
        {showTotal && totalValue > 0 && (
          <div
            className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0"
            style={{
              backgroundColor: `${colors.brand.primary}14`,
              color: colors.brand.primary,
            }}
            title="Total contract value"
          >
            {formatCurrency(totalValue)}
          </div>
        )}

        {/* Continue / final action — always enabled unless a mutation is in flight */}
        <button
          type="button"
          onClick={onNext}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all flex-shrink-0"
          style={{
            backgroundColor: colors.brand.primary,
            color: '#FFFFFF',
            opacity: isBusy ? 0.6 : 1,
            cursor: isBusy ? 'wait' : 'pointer',
          }}
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLastStep ? (sendButtonText || 'Finish') : 'Continue'}
          {!isLastStep && !isBusy && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* One-line affordance note under the bar on first steps (subtle) */}
      {!blockedHint && !isLastStep && (
        <div
          className="pointer-events-none flex items-center gap-1 text-[10px]"
          style={{ color: `${colors.utility.secondaryText}90` }}
        >
          <Info className="w-3 h-3" />
          Completed steps stay clickable in the progress bar above
        </div>
      )}
    </div>
  );
};

export default ActionBar;

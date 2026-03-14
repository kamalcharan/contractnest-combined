// src/components/contracts/ContractWizard/FloatingActionIsland.tsx
// Premium Floating Action Island - Apple Dynamic Island inspired navigation
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface FloatingActionIslandProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  totalValue: number;
  currency: string;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  sendButtonText?: string;
  showTotal?: boolean;
  isSavingDraft?: boolean;
  draftSaveStatus?: DraftSaveStatus;
}

const FloatingActionIsland: React.FC<FloatingActionIslandProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  totalValue,
  currency,
  canGoBack,
  canGoNext,
  isLastStep,
  onBack,
  onNext,
  onClose,
  sendButtonText,
  showTotal = true,
  isSavingDraft = false,
  draftSaveStatus = 'idle',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Auto-save status indicator config
  const saveIndicator = (() => {
    switch (draftSaveStatus) {
      case 'saving':
        return { tooltip: 'Auto-saving draft...', color: colors.brand.primary };
      case 'saved':
        return { tooltip: 'Draft saved', color: colors.semantic.success };
      case 'failed':
        return { tooltip: 'Draft save failed — will retry on next step', color: colors.semantic.error };
      default:
        return null;
    }
  })();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-4 px-6 py-3 rounded-full shadow-2xl border"
        style={{
          backgroundColor: isDarkMode
            ? 'rgba(17, 24, 39, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
          boxShadow: isDarkMode
            ? '0 20px 50px rgba(0, 0, 0, 0.5)'
            : '0 20px 50px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(239, 68, 68, 0.08)',
            color: colors.semantic.error,
          }}
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>

        {/* Divider */}
        <div
          className="w-px h-6"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
          }}
        />

        {/* Status Pill — step label + auto-save indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Step indicator dot (always shown, not tied to save status) */}
          <div className="relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.brand.primary }}
            />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: colors.utility.primaryText }}
          >
            {stepLabels[currentStep] || `Step ${currentStep + 1}`}
          </span>

          {/* Auto-save status indicator (appears only when saving/saved/failed) */}
          {saveIndicator && (
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowSaveTooltip(true)}
              onMouseLeave={() => setShowSaveTooltip(false)}
            >
              {/* Divider between step name and save indicator */}
              <div
                className="w-px h-3.5 mr-2"
                style={{
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.1)',
                }}
              />

              {/* Save status icon */}
              {draftSaveStatus === 'saving' ? (
                <Loader2
                  className="w-3 h-3 animate-spin"
                  style={{ color: saveIndicator.color }}
                />
              ) : draftSaveStatus === 'saved' ? (
                <Check
                  className="w-3 h-3"
                  style={{ color: saveIndicator.color }}
                />
              ) : (
                <AlertCircle
                  className="w-3 h-3"
                  style={{ color: saveIndicator.color }}
                />
              )}

              {/* Status dot */}
              <div
                className="w-1.5 h-1.5 rounded-full ml-1"
                style={{ backgroundColor: saveIndicator.color }}
              />

              {/* Tooltip */}
              {showSaveTooltip && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none"
                  style={{
                    backgroundColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.95)'
                      : 'rgba(17, 24, 39, 0.95)',
                    color: isDarkMode ? '#111827' : '#ffffff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {saveIndicator.tooltip}
                  {/* Tooltip arrow */}
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `4px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(17, 24, 39, 0.95)'}`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: index === currentStep ? '24px' : '8px',
                backgroundColor: index === currentStep
                  ? colors.brand.primary
                  : index < currentStep
                    ? colors.semantic.success
                    : isDarkMode
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'rgba(0, 0, 0, 0.15)',
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div
          className="w-px h-6"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
          }}
        />

        {/* Total Value - hidden in RFQ mode */}
        {showTotal && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: colors.utility.secondaryText }}
              >
                Total
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: colors.brand.primary }}
              >
                {formatCurrency(totalValue)}
              </span>
            </div>

            {/* Divider */}
            <div
              className="w-px h-6"
              style={{
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)',
              }}
            />
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          {/* Back Button */}
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
            style={{
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
              color: colors.utility.primaryText,
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* Next/Send Button */}
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
            }}
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {isLastStep ? (sendButtonText || 'Send Contract') : 'Continue'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingActionIsland;

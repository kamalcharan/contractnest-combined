// src/components/contracts/ContractWizard/FloatingActionIsland.tsx
// Premium Floating Action Island - Apple Dynamic Island inspired navigation
import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

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
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
        {/* Status Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Pulsing Status Dot */}
          <div className="relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.semantic.success }}
            />
            <div
              className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor: colors.semantic.success,
                opacity: 0.75,
              }}
            />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: colors.utility.primaryText }}
          >
            {stepLabels[currentStep] || `Step ${currentStep + 1}`}
          </span>
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
              backgroundColor: isLastStep
                ? colors.semantic.success
                : colors.brand.primary,
            }}
          >
            {isLastStep ? (sendButtonText || 'Send Contract') : 'Continue'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-full transition-all hover:opacity-80"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
            color: colors.utility.secondaryText,
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FloatingActionIsland;

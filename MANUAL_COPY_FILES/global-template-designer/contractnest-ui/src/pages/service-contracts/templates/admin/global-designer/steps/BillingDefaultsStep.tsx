// src/pages/service-contracts/templates/admin/global-designer/steps/BillingDefaultsStep.tsx
// Step 4: Billing cycle, payment mode, payment terms, tax approach defaults
// Reuses patterns from BillingCycleStep and BillingViewStep

import React from 'react';
import {
  Calendar,
  Shuffle,
  CreditCard,
  DollarSign,
  ArrowDownUp,
  CheckCircle2,
  Check,
  Info,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { GlobalDesignerWizardState } from '../types';
import { PAYMENT_TERMS_OPTIONS } from '../types';

// ─── Props ──────────────────────────────────────────────────────────

interface BillingDefaultsStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Payment mode config ────────────────────────────────────────────

interface PaymentModeOption {
  id: 'prepaid' | 'emi' | 'defined';
  title: string;
  description: string;
  icon: React.ElementType;
  benefits: string[];
}

const PAYMENT_MODES: PaymentModeOption[] = [
  {
    id: 'prepaid',
    title: 'Prepaid',
    description: 'Full payment upfront before service begins',
    icon: CreditCard,
    benefits: ['Guaranteed revenue', 'No collection risk', 'Simpler accounting'],
  },
  {
    id: 'emi',
    title: 'EMI / Installments',
    description: 'Equal monthly installments over contract duration',
    icon: ArrowDownUp,
    benefits: ['Affordable for buyers', 'Predictable cash flow', 'Flexible tenure'],
  },
  {
    id: 'defined',
    title: 'Per-Block Terms',
    description: 'Each service block has its own payment terms',
    icon: DollarSign,
    benefits: ['Maximum flexibility', 'Custom per service', 'Mix prepaid & postpaid'],
  },
];

// ─── Component ──────────────────────────────────────────────────────

const BillingDefaultsStep: React.FC<BillingDefaultsStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            Billing & Payment Defaults
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            Set default billing configuration for this template. Tenants can override these
            settings when creating individual contracts.
          </p>
        </div>

        {/* ─── Billing Cycle Type (reuse pattern from BillingCycleStep) ── */}
        <div>
          <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Default Billing Cycle
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                id: 'unified' as const,
                title: 'Unified Cycle',
                desc: 'All services billed on the same schedule',
                icon: Calendar,
                benefits: ['Simpler invoicing', 'Predictable billing', 'Easier reconciliation'],
                visual: { labels: ['M', 'M', 'M'], desc: 'All Monthly' },
              },
              {
                id: 'mixed' as const,
                title: 'Mixed Cycles',
                desc: 'Each service has its own billing schedule',
                icon: Shuffle,
                benefits: ['Maximum flexibility', 'Mix recurring & one-time', 'Custom per service'],
                visual: { labels: ['M', 'Q', '1x'], desc: 'Monthly, Quarterly, One-time' },
              },
            ].map((option) => {
              const isSelected = state.defaultBillingCycleType === option.id;
              const IconComp = option.icon;

              return (
                <button
                  key={option.id}
                  onClick={() => onUpdate({ defaultBillingCycleType: option.id })}
                  className="relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-lg"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                    borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}15`,
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <div
                    className="absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}30`,
                      backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: isSelected ? colors.brand.primary : `${colors.brand.primary}15` }}
                  >
                    <IconComp className="w-6 h-6" style={{ color: isSelected ? 'white' : colors.brand.primary }} />
                  </div>

                  <h3 className="text-base font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                    {option.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>{option.desc}</p>

                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg" style={{ backgroundColor: `${colors.utility.primaryText}05` }}>
                    <div className="flex items-center gap-1.5">
                      {option.visual.labels.map((label, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold"
                          style={{
                            backgroundColor: isSelected ? colors.brand.primary : `${colors.brand.primary}20`,
                            color: isSelected ? 'white' : colors.brand.primary,
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] ml-1" style={{ color: colors.utility.secondaryText }}>{option.visual.desc}</span>
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    {option.benefits.map((b) => (
                      <div key={b} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Default Payment Mode ──────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Default Payment Mode
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PAYMENT_MODES.map((mode) => {
              const isSelected = state.defaultPaymentMode === mode.id;
              const IconComp = mode.icon;

              return (
                <button
                  key={mode.id}
                  onClick={() => onUpdate({ defaultPaymentMode: mode.id })}
                  className="relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-md"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                    borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}15`,
                  }}
                >
                  <div
                    className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}25`,
                      backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: isSelected ? `${colors.brand.primary}15` : `${colors.utility.primaryText}08` }}
                  >
                    <IconComp className="w-5 h-5" style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }} />
                  </div>

                  <h4 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>{mode.title}</h4>
                  <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>{mode.description}</p>

                  <div className="space-y-1 mt-auto">
                    {mode.benefits.map((b) => (
                      <div key={b} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3" style={{ color: colors.semantic.success }} />
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Payment Terms & Tax Approach ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Default Payment Terms
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TERMS_OPTIONS.map((opt) => {
                const isSelected = state.defaultPaymentTermsDays === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate({ defaultPaymentTermsDays: opt.value })}
                    className="px-4 py-2.5 rounded-xl border text-xs font-medium transition-all"
                    style={{
                      backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}12`,
                      color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tax Approach */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Default Tax Approach
            </label>
            <div className="flex gap-3">
              {(['exclusive', 'inclusive'] as const).map((approach) => {
                const isSelected = state.defaultTaxApproach === approach;
                return (
                  <button
                    key={approach}
                    onClick={() => onUpdate({ defaultTaxApproach: approach })}
                    className="flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all text-center"
                    style={{
                      backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}12`,
                      color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                    }}
                  >
                    Tax {approach === 'exclusive' ? 'Exclusive' : 'Inclusive'}
                    <span className="block text-[10px] font-normal mt-0.5" style={{ color: colors.utility.secondaryText }}>
                      {approach === 'exclusive' ? 'Tax added on top' : 'Tax included in price'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div
          className="flex items-start gap-3 p-4 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.info || '#3B82F6'}06`,
            borderColor: `${colors.semantic.info || '#3B82F6'}20`,
          }}
        >
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info || '#3B82F6' }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            These are <strong style={{ color: colors.utility.primaryText }}>suggested defaults</strong> — tenants
            can override billing settings when creating individual contracts from this template.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillingDefaultsStep;

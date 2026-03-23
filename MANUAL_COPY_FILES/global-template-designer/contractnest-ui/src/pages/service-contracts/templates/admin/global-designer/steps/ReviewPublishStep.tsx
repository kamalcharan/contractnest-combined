// src/pages/service-contracts/templates/admin/global-designer/steps/ReviewPublishStep.tsx
// Step 6: Summary, template preview card, publish settings
// Updated to reflect nomenclature + contract details state structure

import React from 'react';
import {
  FileText,
  ClipboardList,
  Wrench,
  CreditCard,
  Shield,
  Check,
  AlertCircle,
  Globe,
  Star,
  Eye,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { GlobalDesignerWizardState } from '../types';
import { COMPLIANCE_TAG_OPTIONS } from '../types';
import useTemplateBuilder from '@/hooks/service-contracts/templates/useTemplateBuilder';
import { getDurationLabel } from '@/utils/constants/contracts';

// ─── Props ──────────────────────────────────────────────────────────

interface ReviewPublishStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
  templateBuilder: ReturnType<typeof useTemplateBuilder>;
}

// ─── Summary Section ────────────────────────────────────────────────

interface SummarySectionProps {
  icon: React.ElementType;
  title: string;
  items: { label: string; value: string | React.ReactNode }[];
  colors: any;
  accentColor?: string;
}

const SummarySection: React.FC<SummarySectionProps> = ({ icon: Icon, title, items, colors, accentColor }) => {
  const accent = accentColor || colors.brand.primary;
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}10`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}12` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <h4 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{title}</h4>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4">
            <span className="text-xs font-medium flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
              {item.label}
            </span>
            <span className="text-xs text-right" style={{ color: colors.utility.primaryText }}>
              {item.value || <span style={{ color: colors.utility.secondaryText }}>Not set</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────

const ReviewPublishStep: React.FC<ReviewPublishStepProps> = ({ state, onUpdate, templateBuilder }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { template } = templateBuilder;
  const blockCount = template.blocks.length;
  const cd = state.contractDetails;

  // Resolve compliance tag labels
  const complianceLabels = state.complianceTags
    .map((id) => COMPLIANCE_TAG_OPTIONS.find((t) => t.id === id)?.label || id)
    .join(', ');

  // Duration display
  const durationDisplay = cd.durationValue > 0
    ? getDurationLabel(cd.durationValue, cd.durationUnit)
    : 'Not set';

  const graceDisplay = cd.gracePeriodValue > 0
    ? getDurationLabel(cd.gracePeriodValue, cd.gracePeriodUnit)
    : 'None';

  // Validation checks
  const issues: string[] = [];
  if (!cd.contractName.trim()) issues.push('Contract/template name is required');
  if (blockCount === 0) issues.push('At least one block should be added (can save as draft)');

  const isReady = issues.length === 0;

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            Review & Publish
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            Review your template configuration and choose how to publish it.
          </p>
        </div>

        {/* ─── Template Preview Card ───────────────────────────── */}
        <div
          className="rounded-2xl border-2 overflow-hidden"
          style={{ borderColor: `${colors.brand.primary}25` }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.secondary || colors.brand.primary}10)` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.brand.primary }}
              >
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: colors.utility.primaryText }}>
                  {cd.contractName || 'Untitled Template'}
                </h3>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Global Template
                  {state.nomenclatureDisplayName && ` — ${state.nomenclatureDisplayName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.nomenclatureGroup && (
                <span
                  className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
                >
                  {state.nomenclatureGroup.replace(/_/g, ' ')}
                </span>
              )}
              <span
                className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
              >
                {blockCount} block{blockCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {cd.description && (
            <div className="px-6 py-3" style={{ backgroundColor: colors.utility.secondaryBackground }}>
              <p
                className="text-xs leading-relaxed"
                style={{ color: colors.utility.secondaryText }}
                dangerouslySetInnerHTML={{ __html: cd.description }}
              />
            </div>
          )}
        </div>

        {/* ─── Summary Grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummarySection
            icon={FileText}
            title="Nomenclature"
            colors={colors}
            items={[
              { label: 'Contract type', value: state.nomenclatureDisplayName || 'Not selected (any type)' },
              { label: 'Group', value: state.nomenclatureGroup?.replace(/_/g, ' ') || 'Not set' },
            ]}
          />

          <SummarySection
            icon={ClipboardList}
            title="Template Details"
            colors={colors}
            items={[
              { label: 'Name', value: cd.contractName || '—' },
              { label: 'Currency', value: cd.currency || 'Not set' },
              { label: 'Duration', value: durationDisplay },
              { label: 'Grace period', value: graceDisplay },
            ]}
          />

          {state.selectedAssetTypeNames.length > 0 && (
            <SummarySection
              icon={Wrench}
              title="Equipment / Facility"
              colors={colors}
              items={[
                { label: 'Type', value: state.nomenclatureGroup?.replace(/_/g, ' ') || 'Mixed' },
                { label: 'Selected', value: `${state.selectedAssetTypeNames.length} type${state.selectedAssetTypeNames.length !== 1 ? 's' : ''}` },
                { label: 'Names', value: state.selectedAssetTypeNames.join(', ') },
              ]}
            />
          )}

          <SummarySection
            icon={CreditCard}
            title="Billing Defaults"
            colors={colors}
            items={[
              { label: 'Billing cycle', value: state.defaultBillingCycleType || 'Not set' },
              { label: 'Payment mode', value: state.defaultPaymentMode || 'Not set' },
              { label: 'Payment terms', value: state.defaultPaymentTermsDays === 0 ? 'Due Immediately' : `Net ${state.defaultPaymentTermsDays}` },
              { label: 'Tax approach', value: state.defaultTaxApproach === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive' },
            ]}
          />

          <SummarySection
            icon={Shield}
            title="Policies & Compliance"
            colors={colors}
            items={[
              { label: 'Acceptance', value: state.defaultAcceptanceMethod || 'Not set' },
              { label: 'Evidence policy', value: state.defaultEvidencePolicy },
              { label: 'Compliance', value: complianceLabels || 'None' },
            ]}
          />
        </div>

        {/* ─── Validation Issues ───────────────────────────────── */}
        {issues.length > 0 && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: `${colors.semantic.error}06`,
              borderColor: `${colors.semantic.error}20`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" style={{ color: colors.semantic.error }} />
              <span className="text-sm font-semibold" style={{ color: colors.semantic.error }}>
                Issues to resolve before publishing
              </span>
            </div>
            <div className="space-y-1.5">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.semantic.error }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Publish Status ──────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Publish As
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'draft' as const,
                icon: Eye,
                title: 'Draft',
                desc: 'Save as draft — not visible to tenants',
                color: colors.utility.secondaryText,
              },
              {
                id: 'active' as const,
                icon: Globe,
                title: 'Active',
                desc: 'Publish to marketplace — visible to all tenants',
                color: colors.semantic.success,
              },
              {
                id: 'featured' as const,
                icon: Star,
                title: 'Featured',
                desc: 'Highlight in marketplace — promoted to tenants',
                color: '#F59E0B',
              },
            ].map((opt) => {
              const isSelected = state.publishStatus === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onUpdate({ publishStatus: opt.id })}
                  className="relative flex flex-col items-center p-5 rounded-2xl border-2 text-center transition-all duration-300 hover:shadow-md"
                  style={{
                    backgroundColor: isSelected ? `${opt.color}08` : colors.utility.secondaryBackground,
                    borderColor: isSelected ? opt.color : `${colors.utility.primaryText}15`,
                  }}
                >
                  <div
                    className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? opt.color : `${colors.utility.primaryText}25`,
                      backgroundColor: isSelected ? opt.color : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${opt.color}15` }}
                  >
                    <opt.icon className="w-6 h-6" style={{ color: opt.color }} />
                  </div>
                  <h4 className="text-sm font-semibold mb-1" style={{ color: isSelected ? opt.color : colors.utility.primaryText }}>
                    {opt.title}
                  </h4>
                  <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ready indicator */}
        {isReady && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{
              backgroundColor: `${colors.semantic.success}06`,
              borderColor: `${colors.semantic.success}20`,
            }}
          >
            <Check className="w-5 h-5" style={{ color: colors.semantic.success }} />
            <p className="text-sm" style={{ color: colors.utility.primaryText }}>
              <strong>Template is ready!</strong> Click{' '}
              <strong style={{ color: colors.brand.primary }}>Save Template</strong> to{' '}
              {state.publishStatus === 'draft' ? 'save as draft' : 'publish to the marketplace'}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPublishStep;

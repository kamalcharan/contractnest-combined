// src/pages/service-contracts/templates/admin/global-designer/steps/PoliciesStep.tsx
// Step 5: Evidence policy, acceptance method, compliance tags
// Reuses AcceptanceMethodStep and EvidencePolicyStep patterns

import React from 'react';
import {
  ShieldOff,
  Upload,
  ClipboardList,
  CreditCard,
  PenTool,
  CheckCircle,
  Check,
  Info,
  X,
  Shield,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ACCEPTANCE_METHOD_CONFIG,
  getAcceptanceMethodColors,
} from '@/utils/constants/contracts';
import type { GlobalDesignerWizardState } from '../types';
import { COMPLIANCE_TAG_OPTIONS } from '../types';
import type { AcceptanceMethod } from '@/components/contracts/ContractWizard/steps/AcceptanceMethodStep';
import type { EvidencePolicyType } from '@/components/contracts/ContractWizard/steps/EvidencePolicyStep';

// ─── Props ──────────────────────────────────────────────────────────

interface PoliciesStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Icon maps ──────────────────────────────────────────────────────

const acceptanceIconMap: Record<string, React.ElementType> = { CreditCard, PenTool, CheckCircle };
const evidenceIcons: Record<EvidencePolicyType, React.ElementType> = {
  none: ShieldOff,
  upload: Upload,
  smart_form: ClipboardList,
};

const EVIDENCE_OPTIONS: { id: EvidencePolicyType; label: string; description: string; features: string[] }[] = [
  {
    id: 'none',
    label: 'No Verification',
    description: 'No evidence required during service execution',
    features: ['Fastest execution', 'No attachments needed', 'Trust-based delivery'],
  },
  {
    id: 'upload',
    label: 'Upload Proof',
    description: 'Photos/documents uploaded as proof of work',
    features: ['Photo & document proof', 'Before & after evidence', 'File-based verification'],
  },
  {
    id: 'smart_form',
    label: 'Smart Form',
    description: 'Structured digital forms during service',
    features: ['Inspection checklists', 'Completion reports', 'Customer sign-off'],
  },
];

// ─── Component ──────────────────────────────────────────────────────

const PoliciesStep: React.FC<PoliciesStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Compliance tag toggle
  const toggleComplianceTag = (tagId: string) => {
    const current = state.complianceTags;
    if (current.includes(tagId)) {
      onUpdate({ complianceTags: current.filter((t) => t !== tagId) });
    } else {
      onUpdate({ complianceTags: [...current, tagId] });
    }
  };

  // Filter compliance tags based on selected industries
  const relevantComplianceTags = state.targetIndustries.length > 0
    ? COMPLIANCE_TAG_OPTIONS.filter(
        (tag) => state.targetIndustries.includes(tag.industry) || state.complianceTags.includes(tag.id)
      )
    : COMPLIANCE_TAG_OPTIONS;

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            Policies & Compliance
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            Set default evidence policy, acceptance method, and compliance requirements.
            These become the defaults when tenants create contracts from this template.
          </p>
        </div>

        {/* ─── Default Acceptance Method (reuse pattern) ──────── */}
        <div>
          <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Default Acceptance Method
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACCEPTANCE_METHOD_CONFIG.map((method) => {
              const isSelected = state.defaultAcceptanceMethod === method.id;
              const IconComponent = acceptanceIconMap[method.lucideIcon] || CheckCircle;
              const methodColors = getAcceptanceMethodColors(method.colorKey, colors, isSelected);

              return (
                <button
                  key={method.id}
                  onClick={() => onUpdate({ defaultAcceptanceMethod: method.id as AcceptanceMethod })}
                  className="relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-md"
                  style={{
                    backgroundColor: isSelected ? methodColors.bg : colors.utility.secondaryBackground,
                    borderColor: isSelected ? methodColors.border : `${colors.utility.primaryText}15`,
                  }}
                >
                  <div
                    className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? methodColors.border : `${colors.utility.primaryText}30`,
                      backgroundColor: isSelected ? methodColors.border : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: isSelected ? methodColors.iconBg : `${colors.utility.primaryText}08` }}
                  >
                    <IconComponent
                      className="w-5 h-5"
                      style={{ color: isSelected ? methodColors.text : colors.utility.secondaryText }}
                    />
                  </div>

                  <h4
                    className="text-sm font-semibold mb-1"
                    style={{ color: isSelected ? methodColors.text : colors.utility.primaryText }}
                  >
                    {method.label}
                  </h4>
                  <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                    {method.shortDescription}
                  </p>

                  <div className="space-y-1 mt-auto">
                    {method.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3" style={{ color: isSelected ? methodColors.text : colors.semantic.success }} />
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Default Evidence Policy (reuse pattern) ────────── */}
        <div>
          <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Default Evidence Policy
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EVIDENCE_OPTIONS.map((option) => {
              const isSelected = state.defaultEvidencePolicy === option.id;
              const IconComp = evidenceIcons[option.id];

              return (
                <button
                  key={option.id}
                  onClick={() => onUpdate({ defaultEvidencePolicy: option.id })}
                  className="relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-md"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                    borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}15`,
                  }}
                >
                  <div
                    className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}30`,
                      backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: isSelected ? `${colors.brand.primary}15` : `${colors.utility.primaryText}08` }}
                  >
                    <IconComp
                      className="w-5 h-5"
                      style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }}
                    />
                  </div>

                  <h4
                    className="text-sm font-semibold mb-1"
                    style={{ color: isSelected ? colors.brand.primary : colors.utility.primaryText }}
                  >
                    {option.label}
                  </h4>
                  <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                    {option.description}
                  </p>

                  <div className="space-y-1 mt-auto">
                    {option.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3" style={{ color: isSelected ? colors.brand.primary : colors.semantic.success }} />
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Compliance Tags ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Compliance Requirements
              </label>
              <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                Tag required compliance standards for this template
                {state.targetIndustries.length > 0 && ' (filtered by selected industries)'}
              </p>
            </div>
            {state.complianceTags.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
              >
                {state.complianceTags.length} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {relevantComplianceTags.map((tag) => {
              const isSelected = state.complianceTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleComplianceTag(tag.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                    borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}12`,
                    color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                  }}
                >
                  {isSelected ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Shield className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                  )}
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div
          className="flex items-start gap-3 p-4 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.info || '#3B82F6'}06`,
            borderColor: `${colors.semantic.info || '#3B82F6'}20`,
          }}
        >
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info || '#3B82F6' }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            All policy settings are <strong style={{ color: colors.utility.primaryText }}>defaults</strong> —
            tenants can customize these when creating contracts. Compliance tags help tenants identify
            templates that meet their regulatory requirements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoliciesStep;

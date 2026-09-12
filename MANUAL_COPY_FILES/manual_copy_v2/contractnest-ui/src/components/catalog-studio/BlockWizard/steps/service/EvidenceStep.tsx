// src/components/catalog-studio/BlockWizard/steps/service/EvidenceStep.tsx
// B2.4 — REAL evidence picker (mocks removed). One choice per service block:
//   automatic  → no explicit config; activation resolver walks the D9 ladder
//                (equipment-type form → contract fallback → platform default)
//   form       → a specific approved smart form (rung 1 of the ladder);
//                optional "also require upload" makes it form AND photo (D4)
//   upload     → photo/document proof only, no form
//   none       → explicit opt-out, nothing required
// Persisted in formData (evidencePolicy / evidenceFormTemplateId /
// evidenceFormName / evidenceRequireUpload) → catBlockAdapter writes
// config.evidence = { policy, formTemplateId, requireUpload } → snapshots
// into contracts → resolve_contract_form_mappings reads it at activation.
// OTP stays a separate toggle (formData.requiresOTP, existing field).

import React from 'react';
import {
  Upload,
  Shield,
  Check,
  Lightbulb,
  CheckCircle2,
  ClipboardList,
  Wand2,
  Ban,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { useApprovedFormTemplates } from '../../../../../hooks/queries/useFormTemplates';

type EvidencePolicy = 'automatic' | 'form' | 'upload' | 'none';

interface EvidenceStepProps {
  formData: {
    evidencePolicy?: string;
    evidenceFormTemplateId?: string;
    evidenceFormName?: string;
    evidenceRequireUpload?: boolean;
    requiresOTP?: boolean;
  };
  onChange: (field: string, value: unknown) => void;
}

const EvidenceStep: React.FC<EvidenceStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { data: templates = [], isLoading, isError } = useApprovedFormTemplates();

  // Top-level (wizard edits) with meta fallback (editing an existing block
  // whose choice lives under meta.evidence*) — same convention as DeliveryStep.
  const meta = (formData as { meta?: Record<string, unknown> }).meta || {};
  const storedPolicy =
    (formData.evidencePolicy ?? (meta.evidencePolicy as string | undefined)) as string | undefined;
  // 'both' (stored) renders as the form choice with the upload checkbox on;
  // 'automatic' is an explicit sentinel (clears a previously saved choice).
  const policy: EvidencePolicy =
    storedPolicy === 'both' || storedPolicy === 'form' ? 'form'
    : storedPolicy === 'upload' ? 'upload'
    : storedPolicy === 'none' ? 'none'
    : 'automatic';
  const requireUpload =
    storedPolicy === 'both' ||
    (formData.evidenceRequireUpload ?? (meta.evidenceRequireUpload as boolean | undefined)) === true;
  const selectedFormId =
    (formData.evidenceFormTemplateId ?? (meta.evidenceFormTemplateId as string | undefined)) || '';
  const selectedTemplate = templates.find((t) => t.id === selectedFormId);

  const setPolicy = (next: EvidencePolicy) => {
    if (next === 'automatic') {
      // Explicit sentinel — undefined would fall back to a stale meta value on edit
      onChange('evidencePolicy', 'automatic');
      onChange('evidenceFormTemplateId', '');
      onChange('evidenceFormName', '');
      onChange('evidenceRequireUpload', false);
      return;
    }
    if (next === 'form') {
      onChange('evidencePolicy', requireUpload ? 'both' : 'form');
      return;
    }
    // upload / none clear any picked form
    onChange('evidencePolicy', next);
    onChange('evidenceFormTemplateId', '');
    onChange('evidenceFormName', '');
    onChange('evidenceRequireUpload', false);
  };

  const handleFormSelect = (formId: string) => {
    const tpl = templates.find((t) => t.id === formId);
    onChange('evidenceFormTemplateId', formId);
    onChange('evidenceFormName', tpl?.name || '');
    if (formId && policy !== 'form') {
      onChange('evidencePolicy', requireUpload ? 'both' : 'form');
    }
  };

  const handleRequireUpload = (checked: boolean) => {
    onChange('evidenceRequireUpload', checked);
    onChange('evidencePolicy', checked ? 'both' : 'form');
  };

  const cardStyle = (active: boolean) => ({
    backgroundColor: active
      ? `${colors.brand.primary}08`
      : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
    borderColor: active
      ? colors.brand.primary
      : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
    boxShadow: active
      ? `0 0 0 1px ${colors.brand.primary}20`
      : (isDarkMode ? 'none' : '0 1px 2px 0 rgb(0 0 0 / 0.05)'),
  });

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  const choices: Array<{
    id: EvidencePolicy;
    name: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      id: 'automatic',
      name: 'Automatic (recommended)',
      icon: <Wand2 className="w-5 h-5" />,
      description:
        'No fixed form here — at activation the system picks the equipment type’s form when one exists, else the contract’s forms, else the platform’s General Service Completion form.',
    },
    {
      id: 'form',
      name: 'Specific smart form',
      icon: <ClipboardList className="w-5 h-5" />,
      description: 'Technicians fill this exact form on every visit of this service.',
    },
    {
      id: 'upload',
      name: 'Photo / document upload only',
      icon: <Upload className="w-5 h-5" />,
      description: 'Proof is an upload (photos, reports) — no structured form.',
    },
    {
      id: 'none',
      name: 'No evidence needed',
      icon: <Ban className="w-5 h-5" />,
      description: 'This service completes without any proof capture.',
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Evidence Collection
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Choose what proof of service completion this block requires.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column — choice cards */}
        <div className="lg:col-span-3 space-y-4">
          {choices.map((choice) => {
            const active = policy === choice.id;
            return (
              <div
                key={choice.id}
                role="button"
                tabIndex={0}
                onClick={() => setPolicy(choice.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPolicy(choice.id); }}
                className="p-5 border-2 rounded-xl transition-all cursor-pointer"
                style={cardStyle(active)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: active ? colors.brand.primary : `${colors.brand.primary}15` }}
                  >
                    <div style={{ color: active ? '#FFFFFF' : colors.brand.primary }}>{choice.icon}</div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                        {choice.name}
                      </div>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                        style={{
                          backgroundColor: active
                            ? colors.brand.primary
                            : (isDarkMode ? colors.utility.primaryBackground : '#E5E7EB'),
                          color: active ? '#FFFFFF' : colors.utility.secondaryText,
                        }}
                      >
                        {active && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      {choice.description}
                    </div>

                    {/* Form picker — only inside the "Specific smart form" card */}
                    {choice.id === 'form' && active && (
                      <div
                        className="mt-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-200"
                        style={{ borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                          Select form <span style={{ color: colors.semantic.error }}>*</span>
                        </label>

                        {isLoading ? (
                          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                            Loading approved forms…
                          </p>
                        ) : isError ? (
                          <p className="text-sm flex items-center gap-1.5" style={{ color: colors.semantic.error }}>
                            <AlertTriangle className="w-4 h-4" />
                            Couldn&apos;t load forms — try again, or pick Automatic for now.
                          </p>
                        ) : templates.length === 0 ? (
                          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                            No approved forms yet. Approve one under Admin → Forms, or pick Automatic.
                          </p>
                        ) : (
                          <div className="relative">
                            <select
                              value={selectedFormId}
                              onChange={(e) => handleFormSelect(e.target.value)}
                              className="w-full px-4 py-3 border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 pr-10"
                              style={inputStyle}
                            >
                              <option value="">Choose a form...</option>
                              {templates.map((form) => (
                                <option key={form.id} value={form.id}>
                                  {form.name} (v{form.version})
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                              style={{ color: colors.utility.secondaryText }}
                            />
                          </div>
                        )}

                        {selectedTemplate && (
                          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: colors.semantic.success }}>
                            <CheckCircle2 className="w-3 h-3" />
                            Form selected: {selectedTemplate.name}
                          </p>
                        )}

                        {/* D4 combo: form AND upload both required to prove a visit */}
                        <label className="flex items-center gap-2 cursor-pointer mt-4">
                          <input
                            type="checkbox"
                            checked={requireUpload}
                            onChange={(e) => handleRequireUpload(e.target.checked)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: colors.brand.primary }}
                          />
                          <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                            Also require a photo/document upload with the form
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* OTP — independent of the form choice (existing behavior field) */}
          <div className="p-5 border-2 rounded-xl transition-all" style={cardStyle(formData.requiresOTP === true)}>
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: formData.requiresOTP ? colors.brand.primary : `${colors.brand.primary}15` }}
              >
                <div style={{ color: formData.requiresOTP ? '#FFFFFF' : colors.brand.primary }}>
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                    OTP Confirmation
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange('requiresOTP', !formData.requiresOTP)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: formData.requiresOTP
                        ? colors.brand.primary
                        : (isDarkMode ? colors.utility.primaryBackground : '#E5E7EB'),
                      color: formData.requiresOTP ? '#FFFFFF' : colors.utility.secondaryText,
                    }}
                  >
                    {formData.requiresOTP && <Check className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  Customer OTP verification for service confirmation — works with any evidence choice above.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — explainer */}
        <div className="lg:col-span-2">
          <div
            className="p-6 rounded-xl border h-full"
            style={{
              backgroundColor: isDarkMode ? `${colors.semantic.info}10` : '#EFF6FF',
              borderColor: isDarkMode ? `${colors.semantic.info}30` : '#BFDBFE',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: isDarkMode ? colors.semantic.info : '#2563EB' }}>
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-base" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E3A8A' }}>
                How this plays out
              </h4>
            </div>

            <div className="space-y-3 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#1D4ED8' }}>
              <div className="flex items-start gap-2">
                <Wand2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                <div>
                  <strong>Automatic</strong>
                  <p className="text-xs mt-0.5 opacity-80">
                    When a contract with this block goes active, the system resolves the right form:
                    the equipment type&apos;s own form if one exists, else forms chosen on the contract,
                    else the platform default. Every visit always has something to fill.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ClipboardList className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                <div>
                  <strong>Specific form</strong>
                  <p className="text-xs mt-0.5 opacity-80">
                    Pins this block to one form regardless of equipment. Tick the upload checkbox to
                    demand the form <em>and</em> a photo before a visit counts as proven.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Upload className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                <div>
                  <strong>Upload only / None</strong>
                  <p className="text-xs mt-0.5 opacity-80">
                    Upload-only skips forms entirely; None skips all proof. Neither pulls in a fallback form.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E3A8A' }}>
                  Applies to new contracts
                </span>
              </div>
              <p className="text-xs" style={{ color: isDarkMode ? colors.utility.secondaryText : '#1D4ED8' }}>
                The choice is snapshotted into each contract when it is created and resolved when the
                contract activates. Already-active contracts keep their existing setup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceStep;

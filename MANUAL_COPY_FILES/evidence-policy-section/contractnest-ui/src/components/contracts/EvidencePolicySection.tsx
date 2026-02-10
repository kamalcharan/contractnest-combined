// src/components/contracts/EvidencePolicySection.tsx
// Evidence Policy Configuration — landscape card layout
// Options: No Verification, Upload Proof, Smart Form
// Smart Form selection shows tenant-bookmarked forms with drag-to-reorder

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ShieldOff,
  Upload,
  ClipboardList,
  Check,
  Info,
  Plus,
  X,
  GripVertical,
  Save,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useSmartFormSelections } from '@/pages/settings/smart-forms/hooks/useSmartFormSelections';
import type { TenantSelection } from '@/pages/settings/smart-forms/types';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export type EvidencePolicyType = 'none' | 'upload' | 'smart_form';

export interface SelectedForm {
  form_template_id: string;
  name: string;
  version: number;
  category: string;
  sort_order: number;
}

export interface EvidencePolicy {
  type: EvidencePolicyType;
  selectedForms: SelectedForm[];
}

export interface EvidencePolicySectionProps {
  contractId: string;
  colors: any;
  initialPolicy?: EvidencePolicy;
  onSave?: (policy: EvidencePolicy) => void;
}

// ═══════════════════════════════════════════════════
// POLICY OPTION CONFIG
// ═══════════════════════════════════════════════════

interface PolicyOption {
  id: EvidencePolicyType;
  label: string;
  description: string;
  icon: React.ElementType;
  features: string[];
}

const POLICY_OPTIONS: PolicyOption[] = [
  {
    id: 'none',
    label: 'No Verification',
    description: 'No evidence required during service execution',
    icon: ShieldOff,
    features: [
      'Fastest execution flow',
      'No attachments or forms needed',
      'Trust-based service delivery',
    ],
  },
  {
    id: 'upload',
    label: 'Upload Proof',
    description: 'Photos, documents uploaded as proof of work',
    icon: Upload,
    features: [
      'Attach photos or documents',
      'Before & after evidence',
      'File-based verification',
    ],
  },
  {
    id: 'smart_form',
    label: 'Smart Form',
    description: 'Structured digital forms filled during service',
    icon: ClipboardList,
    features: [
      'Inspection checklists',
      'Completion reports',
      'Customer sign-off forms',
    ],
  },
];

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const EvidencePolicySection: React.FC<EvidencePolicySectionProps> = ({
  contractId,
  colors,
  initialPolicy,
  onSave,
}) => {
  const [policyType, setPolicyType] = useState<EvidencePolicyType>(
    initialPolicy?.type || 'none'
  );
  const [selectedForms, setSelectedForms] = useState<SelectedForm[]>(
    initialPolicy?.selectedForms || []
  );
  const [saving, setSaving] = useState(false);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Fetch tenant's bookmarked smart forms
  const {
    selections,
    loading: loadingSelections,
  } = useSmartFormSelections();

  // Active selections only
  const activeSelections = selections.filter((s) => s.is_active);

  // Available forms (not yet added)
  const availableForms = activeSelections.filter(
    (s) => !selectedForms.some((sf) => sf.form_template_id === s.form_template_id)
  );

  const handlePolicyChange = (type: EvidencePolicyType) => {
    setPolicyType(type);
    setDirty(true);
    if (type !== 'smart_form') {
      setSelectedForms([]);
    }
  };

  const addForm = (selection: TenantSelection) => {
    const template = selection.m_form_templates;
    if (!template) return;

    setSelectedForms((prev) => [
      ...prev,
      {
        form_template_id: selection.form_template_id,
        name: template.name,
        version: template.version,
        category: template.category,
        sort_order: prev.length + 1,
      },
    ]);
    setShowFormPicker(false);
    setDirty(true);
  };

  const removeForm = (formTemplateId: string) => {
    setSelectedForms((prev) =>
      prev
        .filter((f) => f.form_template_id !== formTemplateId)
        .map((f, idx) => ({ ...f, sort_order: idx + 1 }))
    );
    setDirty(true);
  };

  // Drag & drop reorder
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;

    const items = [...selectedForms];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);

    // Reassign sort_order
    const reordered = items.map((f, idx) => ({ ...f, sort_order: idx + 1 }));
    setSelectedForms(reordered);
    setDirty(true);

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const policy: EvidencePolicy = { type: policyType, selectedForms };
      if (onSave) {
        await onSave(policy);
      }
      setDirty(false);
    } catch (err) {
      console.error('[EvidencePolicySection] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden mb-6"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}10`,
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="px-5 py-4 flex items-center justify-between border-b"
        style={{ borderColor: `${colors.utility.primaryText}08` }}
      >
        <div>
          <h3
            className="text-sm font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            Evidence Policy
          </h3>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: colors.utility.secondaryText }}
          >
            Configure how evidence is captured during service execution
          </p>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff',
            }}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Policy
          </button>
        )}
      </div>

      {/* ─── Policy Option Cards (landscape grid) ─── */}
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {POLICY_OPTIONS.map((option) => {
            const isSelected = policyType === option.id;
            const IconComp = option.icon;
            const accentColor = isSelected
              ? colors.brand.primary
              : colors.utility.secondaryText;

            return (
              <button
                key={option.id}
                onClick={() => handlePolicyChange(option.id)}
                className="relative flex flex-col p-5 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor: isSelected
                    ? `${colors.brand.primary}08`
                    : colors.utility.secondaryBackground,
                  borderColor: isSelected
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}12`,
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                {/* Selection indicator */}
                <div
                  className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected
                      ? colors.brand.primary
                      : `${colors.utility.primaryText}25`,
                    backgroundColor: isSelected
                      ? colors.brand.primary
                      : 'transparent',
                  }}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    backgroundColor: isSelected
                      ? `${colors.brand.primary}15`
                      : `${colors.utility.primaryText}06`,
                  }}
                >
                  <IconComp
                    className="w-5 h-5"
                    style={{ color: accentColor }}
                  />
                </div>

                {/* Title */}
                <h4
                  className="text-sm font-semibold mb-1"
                  style={{
                    color: isSelected
                      ? colors.brand.primary
                      : colors.utility.primaryText,
                  }}
                >
                  {option.label}
                </h4>

                {/* Description */}
                <p
                  className="text-[11px] mb-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {option.description}
                </p>

                {/* Features */}
                <div className="space-y-1.5 mt-auto">
                  {option.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Check
                        className="w-3 h-3 flex-shrink-0"
                        style={{
                          color: isSelected
                            ? colors.brand.primary
                            : colors.semantic.success,
                        }}
                      />
                      <span
                        className="text-[10px]"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── Info Banner ─── */}
        <div
          className="flex items-start gap-3 rounded-lg border p-3.5 mt-4"
          style={{
            backgroundColor: `${colors.semantic.info || '#3B82F6'}06`,
            borderColor: `${colors.semantic.info || '#3B82F6'}20`,
          }}
        >
          <Info
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: colors.semantic.info || '#3B82F6' }}
          />
          <div>
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: colors.utility.secondaryText }}
            >
              <strong style={{ color: colors.utility.primaryText }}>
                Smart forms
              </strong>{' '}
              are used during service execution to capture structured details
              like inspection checklists, completion reports, and sign-off
              forms. They appear as fillable forms inside the service
              execution drawer.
            </p>
            <p
              className="text-[11px] mt-1.5"
              style={{ color: colors.utility.secondaryText }}
            >
              For custom smart forms, contact your{' '}
              <strong style={{ color: colors.utility.primaryText }}>
                Product Admin
              </strong>
              .
            </p>
          </div>
        </div>

        {/* ─── Smart Form Selector (only when smart_form selected) ─── */}
        {policyType === 'smart_form' && (
          <div className="mt-5">
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <h4
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.utility.secondaryText }}
              >
                Selected Forms
                {selectedForms.length > 0 && (
                  <span
                    className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full normal-case tracking-normal"
                    style={{
                      backgroundColor: `${colors.brand.primary}12`,
                      color: colors.brand.primary,
                    }}
                  >
                    {selectedForms.length} form
                    {selectedForms.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h4>

              {/* Add Form dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFormPicker(!showFormPicker)}
                  disabled={availableForms.length === 0 && !loadingSelections}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{
                    backgroundColor: `${colors.brand.primary}10`,
                    color: colors.brand.primary,
                    border: `1px solid ${colors.brand.primary}25`,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Form
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${showFormPicker ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                {showFormPicker && availableForms.length > 0 && (
                  <div
                    className="absolute right-0 top-full mt-1 w-72 rounded-lg border shadow-lg z-20 py-1 max-h-52 overflow-y-auto"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}15`,
                    }}
                  >
                    {availableForms.map((sel) => {
                      const tpl = sel.m_form_templates;
                      if (!tpl) return null;
                      return (
                        <button
                          key={sel.form_template_id}
                          onClick={() => addForm(sel)}
                          className="w-full px-3 py-2.5 text-left flex items-center gap-3 hover:opacity-80 transition-opacity"
                          style={{
                            borderBottom: `1px solid ${colors.utility.primaryText}06`,
                          }}
                        >
                          <ClipboardList
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: colors.brand.primary }}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {tpl.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${colors.utility.primaryText}08`,
                                  color: colors.utility.secondaryText,
                                }}
                              >
                                v{tpl.version}
                              </span>
                              <span
                                className="text-[9px]"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                {tpl.category}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Backdrop to close dropdown */}
                {showFormPicker && (
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowFormPicker(false)}
                  />
                )}
              </div>
            </div>

            {/* Forms Table */}
            {selectedForms.length > 0 ? (
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                {/* Table Header */}
                <div
                  className="grid grid-cols-[40px_1fr_60px_80px_40px] px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${colors.utility.primaryText}04`,
                    color: colors.utility.secondaryText,
                    borderBottom: `1px solid ${colors.utility.primaryText}08`,
                  }}
                >
                  <span></span>
                  <span>Form Name</span>
                  <span className="text-center">Version</span>
                  <span className="text-center">Category</span>
                  <span></span>
                </div>

                {/* Table Rows */}
                {selectedForms.map((form, index) => (
                  <div
                    key={form.form_template_id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="grid grid-cols-[40px_1fr_60px_80px_40px] items-center px-3 py-2.5 transition-colors cursor-grab active:cursor-grabbing"
                    style={{
                      backgroundColor:
                        index % 2 === 0
                          ? 'transparent'
                          : `${colors.utility.primaryText}02`,
                      borderBottom: `1px solid ${colors.utility.primaryText}06`,
                    }}
                  >
                    {/* Drag handle */}
                    <div className="flex items-center">
                      <GripVertical
                        className="w-4 h-4"
                        style={{ color: `${colors.utility.secondaryText}60` }}
                      />
                    </div>

                    {/* Form name with order number */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${colors.brand.primary}10`,
                          color: colors.brand.primary,
                        }}
                      >
                        {form.sort_order}
                      </span>
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {form.name}
                      </span>
                    </div>

                    {/* Version */}
                    <span
                      className="text-[10px] text-center"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      v{form.version}
                    </span>

                    {/* Category */}
                    <span
                      className="text-[10px] text-center px-1.5 py-0.5 rounded-full truncate"
                      style={{
                        backgroundColor: `${colors.utility.primaryText}06`,
                        color: colors.utility.secondaryText,
                      }}
                    >
                      {form.category}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeForm(form.form_template_id)}
                      className="flex items-center justify-center w-6 h-6 rounded hover:opacity-70 transition-opacity"
                      title="Remove form"
                    >
                      <X
                        className="w-3.5 h-3.5"
                        style={{ color: colors.semantic.error }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-lg border-2 border-dashed p-6 text-center"
                style={{ borderColor: `${colors.utility.primaryText}12` }}
              >
                <ClipboardList
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: `${colors.utility.secondaryText}40` }}
                />
                <p
                  className="text-xs font-medium"
                  style={{ color: colors.utility.secondaryText }}
                >
                  No forms selected yet
                </p>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: `${colors.utility.secondaryText}80` }}
                >
                  Click "Add Form" to attach smart forms for service execution
                </p>
              </div>
            )}

            {/* Drag hint */}
            {selectedForms.length > 1 && (
              <p
                className="text-[10px] mt-2 flex items-center gap-1"
                style={{ color: `${colors.utility.secondaryText}80` }}
              >
                <GripVertical className="w-3 h-3" />
                Drag rows to reorder — forms will appear in this sequence during
                service execution
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidencePolicySection;

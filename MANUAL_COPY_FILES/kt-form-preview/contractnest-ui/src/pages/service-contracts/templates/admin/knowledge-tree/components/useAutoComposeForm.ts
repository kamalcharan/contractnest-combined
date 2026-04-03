// useAutoComposeForm.ts — Transforms Knowledge Tree data into a SmartForm JSON schema
// Variant-aware: spare parts filtered by variant mapping, checkpoints with variant overrides

import { useMemo } from 'react';
import type { FormSchema, FormSection, FormField, FormFieldOption } from '@/pages/settings/smart-forms/types';

interface Variant {
  id: string;
  name: string;
  description: string | null;
  capacity_range: string | null;
}

interface CheckpointValue {
  id: string;
  label: string;
  severity: string;
}

interface Checkpoint {
  id: string;
  checkpoint_type: 'condition' | 'reading';
  service_activity: string;
  section_name: string;
  name: string;
  description: string | null;
  unit: string | null;
  normal_min: number | null;
  normal_max: number | null;
  amber_threshold: number | null;
  red_threshold: number | null;
  threshold_note: string | null;
  values?: CheckpointValue[];
  variant_applicability?: { variant_id: string }[];
}

interface SparePart {
  id: string;
  name: string;
  component_group: string;
  variant_applicability?: { variant_id: string }[];
}

// ── Equipment Identification + Variant Selector (always first) ──
function buildIdentificationSection(variants: Variant[]): FormSection {
  const variantOptions: FormFieldOption[] = variants.map((v) => ({
    label: v.capacity_range ? `${v.name} (${v.capacity_range})` : v.name,
    value: v.id,
  }));

  return {
    id: 'identification',
    title: 'Equipment Identification',
    fields: [
      { id: 'asset_id', type: 'text', label: 'Equipment ID / Tag Number', validation: { required: true } },
      { id: 'serial_number', type: 'text', label: 'Serial Number', validation: { required: true } },
      { id: 'make_model', type: 'text', label: 'Make & Model', validation: { required: true } },
      { id: 'location', type: 'text', label: 'Location / Department', validation: { required: true } },
      {
        id: 'variant_id', type: 'select', label: 'Equipment Variant / Type',
        validation: { required: true },
        options: variantOptions,
        help_text: 'Select the specific variant — this determines which parts and thresholds apply',
      },
      { id: 'service_date', type: 'date', label: 'Service Date', validation: { required: true } },
      { id: 'technician_name', type: 'text', label: 'Technician Name', validation: { required: true } },
    ],
  };
}

// ── Condition checkpoints → select fields grouped by section ──
function buildConditionSections(checkpoints: Checkpoint[]): FormSection[] {
  const conditions = checkpoints.filter((cp) => cp.checkpoint_type === 'condition');
  if (conditions.length === 0) return [];

  const grouped: Record<string, Checkpoint[]> = {};
  for (const cp of conditions) {
    const key = cp.section_name || 'Condition Checks';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cp);
  }

  return Object.entries(grouped).map(([sectionName, cps]) => ({
    id: `cond_${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    title: sectionName,
    description: `${cps.length} condition checks`,
    fields: cps.map((cp): FormField => ({
      id: `cp_${cp.id}`,
      type: 'select',
      label: cp.name,
      help_text: cp.description || undefined,
      validation: { required: true },
      options: (cp.values && cp.values.length > 0)
        ? cp.values.map((v) => ({
            label: `${v.severity === 'ok' ? '🟢' : v.severity === 'attention' ? '🟡' : '🔴'} ${v.label}`,
            value: v.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          }))
        : [
            { label: '🟢 OK', value: 'ok' },
            { label: '🟡 Needs Attention', value: 'attention' },
            { label: '🔴 Critical', value: 'critical' },
          ],
    })),
  }));
}

// ── Reading checkpoints → number fields grouped by section ──
function buildReadingSections(checkpoints: Checkpoint[]): FormSection[] {
  const readings = checkpoints.filter((cp) => cp.checkpoint_type === 'reading');
  if (readings.length === 0) return [];

  const grouped: Record<string, Checkpoint[]> = {};
  for (const cp of readings) {
    const key = cp.section_name || 'Readings';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cp);
  }

  return Object.entries(grouped).map(([sectionName, cps]) => ({
    id: `read_${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    title: `${sectionName} — Readings`,
    description: `${cps.length} measurements`,
    fields: cps.map((cp): FormField => {
      const rangeHint = cp.normal_min != null && cp.normal_max != null
        ? `Normal: ${cp.normal_min}–${cp.normal_max} ${cp.unit || ''}`
        : undefined;
      const thresholdHint = cp.amber_threshold != null
        ? `⚠ ${cp.amber_threshold} ${cp.unit || ''} | 🔴 ${cp.red_threshold ?? '—'} ${cp.unit || ''}`
        : undefined;

      return {
        id: `cp_${cp.id}`,
        type: 'number',
        label: cp.unit ? `${cp.name} (${cp.unit})` : cp.name,
        placeholder: rangeHint,
        help_text: [cp.threshold_note, thresholdHint].filter(Boolean).join(' · ') || undefined,
        validation: {
          required: true,
          ...(cp.normal_min != null ? { min: cp.red_threshold != null && cp.red_threshold < cp.normal_min ? Math.floor(cp.red_threshold * 0.5) : undefined } : {}),
          ...(cp.normal_max != null ? { max: cp.red_threshold != null && cp.red_threshold > cp.normal_max ? Math.ceil(cp.red_threshold * 1.5) : undefined } : {}),
        },
      };
    }),
  }));
}

// ── Spare Parts checklist (filtered by selected variant) ──
function buildSparePartsSection(
  partsByGroup: Record<string, SparePart[]>,
  selectedVariantId: string | null,
): FormSection {
  const groups = Object.entries(partsByGroup);
  const fields: FormField[] = [];

  for (const [groupName, parts] of groups) {
    // Filter parts to selected variant (if any)
    const filteredParts = selectedVariantId
      ? parts.filter((p) =>
          !p.variant_applicability?.length || // no mappings = universal
          p.variant_applicability.some((va) => va.variant_id === selectedVariantId)
        )
      : parts;

    if (filteredParts.length === 0) continue;

    // Group heading
    fields.push({
      id: `parts_heading_${groupName}`,
      type: 'heading',
      label: groupName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    });

    // Each part as a multi_select option in a group
    const partOptions: FormFieldOption[] = filteredParts.map((p) => ({
      label: p.name,
      value: p.id,
    }));

    fields.push({
      id: `parts_${groupName}`,
      type: 'multi_select',
      label: `${groupName.replace(/_/g, ' ')} — parts used/replaced`,
      options: partOptions,
      help_text: 'Select all parts that were used, replaced, or consumed during this service',
    });
  }

  return {
    id: 'spare_parts_used',
    title: 'Parts Used / Replaced',
    description: 'Select parts consumed or replaced during this service visit',
    fields,
  };
}

// ── Sign-Off section (always last) ──
function buildSignOffSection(): FormSection {
  return {
    id: 'signoff',
    title: 'Sign-Off & Approval',
    fields: [
      {
        id: 'overall_status', type: 'select', label: 'Overall Assessment',
        validation: { required: true },
        options: [
          { label: '🟢 Pass — All checks satisfactory', value: 'pass' },
          { label: '🟡 Conditional — Minor issues noted', value: 'conditional' },
          { label: '🔴 Fail — Critical issues found', value: 'fail' },
        ],
      },
      { id: 'remarks', type: 'textarea', label: 'Remarks / Observations' },
      {
        id: 'next_action', type: 'select', label: 'Recommended Next Action',
        options: [
          { label: 'No action needed', value: 'none' },
          { label: 'Schedule follow-up', value: 'follow_up' },
          { label: 'Escalate to supervisor', value: 'escalate' },
          { label: 'Part replacement needed', value: 'part_replacement' },
        ],
      },
      { id: 'next_service_date', type: 'date', label: 'Recommended Next Service Date' },
    ],
  };
}

// ── Main hook ──
export function useAutoComposeForm(
  resourceName: string,
  variants: Variant[],
  checkpointsBySection: Record<string, Checkpoint[]>,
  partsByGroup: Record<string, SparePart[]>,
  selectedVariantId: string | null,
  serviceActivityFilter: string | null,
): FormSchema {
  return useMemo(() => {
    // Flatten and optionally filter by service activity
    let allCheckpoints: Checkpoint[] = Object.values(checkpointsBySection).flat();
    if (serviceActivityFilter) {
      allCheckpoints = allCheckpoints.filter((cp) => cp.service_activity === serviceActivityFilter);
    }

    const conditionSections = buildConditionSections(allCheckpoints);
    const readingSections = buildReadingSections(allCheckpoints);
    const sparePartsSection = buildSparePartsSection(partsByGroup, selectedVariantId);
    const totalFields = 7 + // identification
      conditionSections.reduce((s, sec) => s + sec.fields.length, 0) +
      readingSections.reduce((s, sec) => s + sec.fields.length, 0) +
      sparePartsSection.fields.length +
      4; // signoff

    return {
      id: `kt_auto_${Date.now()}`,
      title: `${resourceName} — PM Service Form`,
      description: `Auto-composed from Knowledge Tree · ${allCheckpoints.length} checkpoints · ${totalFields} fields`,
      version: 1,
      sections: [
        buildIdentificationSection(variants),
        ...conditionSections,
        ...readingSections,
        sparePartsSection,
        buildSignOffSection(),
      ],
      settings: {
        allow_draft: true,
        require_all_sections: false,
        show_progress: true,
      },
    };
  }, [resourceName, variants, checkpointsBySection, partsByGroup, selectedVariantId, serviceActivityFilter]);
}

// useAutoComposeForm.ts — Transforms Knowledge Tree checkpoints into a SmartForm JSON schema
// Used by FormPreviewTab to generate a live preview of the auto-composed service form

import { useMemo } from 'react';
import type { FormSchema, FormSection, FormField } from '@/pages/settings/smart-forms/types';

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
  values?: { id: string; label: string; severity: string }[];
}

// ── Equipment Identification section (always first) ──
function buildIdentificationSection(): FormSection {
  return {
    id: 'identification',
    title: 'Equipment Identification',
    fields: [
      { id: 'asset_id', type: 'text', label: 'Equipment ID / Tag Number', validation: { required: true } },
      { id: 'serial_number', type: 'text', label: 'Serial Number', validation: { required: true } },
      { id: 'make_model', type: 'text', label: 'Make & Model', validation: { required: true } },
      { id: 'location', type: 'text', label: 'Location / Department', validation: { required: true } },
      { id: 'service_date', type: 'date', label: 'Service Date', validation: { required: true } },
      { id: 'technician_name', type: 'text', label: 'Technician Name', validation: { required: true } },
    ],
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
          { label: 'Pass — All checks satisfactory', value: 'pass' },
          { label: 'Conditional — Minor issues noted', value: 'conditional' },
          { label: 'Fail — Critical issues found', value: 'fail' },
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

// ── Transform a single checkpoint into a form field ──
function checkpointToField(cp: Checkpoint): FormField {
  if (cp.checkpoint_type === 'condition') {
    // Condition → select dropdown with severity-tagged options
    const options = (cp.values || []).map((v) => ({
      label: v.label,
      value: v.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    }));
    return {
      id: `cp_${cp.id}`,
      type: 'select',
      label: cp.name,
      help_text: cp.description || undefined,
      validation: { required: true },
      options: options.length > 0 ? options : [
        { label: 'OK', value: 'ok' },
        { label: 'Needs Attention', value: 'attention' },
        { label: 'Critical', value: 'critical' },
      ],
    };
  }

  // Reading → number field with unit and validation range
  const field: FormField = {
    id: `cp_${cp.id}`,
    type: 'number',
    label: cp.unit ? `${cp.name} (${cp.unit})` : cp.name,
    placeholder: cp.normal_min != null && cp.normal_max != null
      ? `Normal: ${cp.normal_min}–${cp.normal_max} ${cp.unit || ''}`
      : undefined,
    help_text: cp.threshold_note || (cp.amber_threshold != null
      ? `Warning: ${cp.amber_threshold} ${cp.unit || ''} | Critical: ${cp.red_threshold ?? '—'} ${cp.unit || ''}`
      : undefined),
    validation: {
      required: true,
      ...(cp.red_threshold != null && cp.red_threshold < (cp.normal_min ?? 0)
        ? { min: cp.red_threshold * 0.5 }
        : {}),
    },
  };
  return field;
}

// ── Group checkpoints by section_name → FormSection ──
function buildCheckpointSections(checkpoints: Checkpoint[]): FormSection[] {
  const grouped: Record<string, Checkpoint[]> = {};
  for (const cp of checkpoints) {
    const key = cp.section_name || 'General';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cp);
  }

  return Object.entries(grouped).map(([sectionName, cps]) => ({
    id: `section_${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    title: sectionName,
    description: `${cps.filter(c => c.checkpoint_type === 'condition').length} condition checks, ${cps.filter(c => c.checkpoint_type === 'reading').length} readings`,
    fields: cps.map(checkpointToField),
  }));
}

// ── Main hook ──
export function useAutoComposeForm(
  resourceName: string,
  checkpointsBySection: Record<string, any[]>,
  serviceActivityFilter: string | null,
): FormSchema {
  return useMemo(() => {
    // Flatten and optionally filter by service activity
    let allCheckpoints: Checkpoint[] = Object.values(checkpointsBySection).flat();
    if (serviceActivityFilter) {
      allCheckpoints = allCheckpoints.filter((cp) => cp.service_activity === serviceActivityFilter);
    }

    const checkpointSections = buildCheckpointSections(allCheckpoints);

    return {
      id: `auto_compose_${Date.now()}`,
      title: `${resourceName} — Service Form`,
      description: `Auto-composed from ${allCheckpoints.length} checkpoints across ${checkpointSections.length} sections`,
      version: 1,
      sections: [
        buildIdentificationSection(),
        ...checkpointSections,
        buildSignOffSection(),
      ],
      settings: {
        allow_draft: true,
        require_all_sections: false,
        show_progress: true,
      },
    };
  }, [resourceName, checkpointsBySection, serviceActivityFilter]);
}

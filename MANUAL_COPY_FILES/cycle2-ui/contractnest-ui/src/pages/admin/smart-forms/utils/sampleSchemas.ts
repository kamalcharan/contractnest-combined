// src/pages/admin/smart-forms/utils/sampleSchemas.ts
// Starter templates for the form editor

export interface SampleSchema {
  key: string;
  label: string;
  description: string;
  schema: Record<string, unknown>;
}

export const SAMPLE_SCHEMAS: SampleSchema[] = [
  {
    key: 'blank',
    label: 'Blank Form',
    description: 'Start from scratch with an empty form',
    schema: {
      id: 'blank_form',
      title: 'Untitled Form',
      description: '',
      sections: [
        {
          id: 'section_1',
          title: 'Section 1',
          description: '',
          fields: [],
        },
      ],
    },
  },
  {
    key: 'calibration',
    label: 'Calibration Report',
    description: 'Standard calibration service form with measurements',
    schema: {
      id: 'calibration_report',
      title: 'Calibration Report',
      description: 'Record calibration measurements and results',
      sections: [
        {
          id: 'equipment_info',
          title: 'Equipment Information',
          description: 'Details of the equipment being calibrated',
          fields: [
            { id: 'equipment_name', type: 'text', label: 'Equipment Name', required: true, placeholder: 'e.g. Digital Multimeter' },
            { id: 'serial_number', type: 'text', label: 'Serial Number', required: true, placeholder: '' },
            { id: 'manufacturer', type: 'text', label: 'Manufacturer', required: false, placeholder: '' },
            { id: 'model_number', type: 'text', label: 'Model Number', required: false, placeholder: '' },
            { id: 'calibration_date', type: 'date', label: 'Calibration Date', required: true },
            { id: 'next_due_date', type: 'date', label: 'Next Due Date', required: true },
          ],
        },
        {
          id: 'measurements',
          title: 'Measurement Results',
          description: 'Record test points and results',
          fields: [
            { id: 'test_point_1', type: 'number', label: 'Test Point 1 - Nominal', required: true, placeholder: '', step: 0.001 },
            { id: 'result_1', type: 'number', label: 'Test Point 1 - Measured', required: true, placeholder: '', step: 0.001 },
            { id: 'tolerance_1', type: 'select', label: 'Test Point 1 - Pass/Fail', required: true, options: [{ label: 'Pass', value: 'pass' }, { label: 'Fail', value: 'fail' }] },
            { id: 'notes', type: 'textarea', label: 'Additional Notes', required: false, rows: 4, placeholder: 'Any observations or comments...' },
          ],
        },
        {
          id: 'sign_off',
          title: 'Sign Off',
          description: '',
          fields: [
            { id: 'technician_name', type: 'text', label: 'Technician Name', required: true, placeholder: '' },
            { id: 'certificate_number', type: 'text', label: 'Certificate Number', required: false, placeholder: '' },
            { id: 'pass_overall', type: 'radio', label: 'Overall Result', required: true, options: [{ label: 'Pass', value: 'pass' }, { label: 'Fail', value: 'fail' }, { label: 'Conditional', value: 'conditional' }] },
          ],
        },
      ],
    },
  },
  {
    key: 'inspection',
    label: 'Inspection Checklist',
    description: 'General inspection form with pass/fail items',
    schema: {
      id: 'inspection_checklist',
      title: 'Inspection Checklist',
      description: 'Standard inspection checklist',
      sections: [
        {
          id: 'general_info',
          title: 'General Information',
          description: '',
          fields: [
            { id: 'location', type: 'text', label: 'Location', required: true, placeholder: '' },
            { id: 'inspection_date', type: 'date', label: 'Inspection Date', required: true },
            { id: 'inspector', type: 'text', label: 'Inspector', required: true, placeholder: '' },
          ],
        },
        {
          id: 'checklist',
          title: 'Checklist Items',
          description: 'Check each item and note any issues',
          fields: [
            { id: 'item_1', type: 'checkbox', label: 'Safety equipment present and operational', required: false, default_checked: false },
            { id: 'item_2', type: 'checkbox', label: 'Work area clean and organized', required: false, default_checked: false },
            { id: 'item_3', type: 'checkbox', label: 'All documentation current', required: false, default_checked: false },
            { id: 'item_4', type: 'checkbox', label: 'Equipment within calibration dates', required: false, default_checked: false },
            { id: 'issues_found', type: 'textarea', label: 'Issues Found', required: false, rows: 4, placeholder: 'Describe any issues...' },
            { id: 'severity', type: 'select', label: 'Severity Level', required: false, options: [{ label: 'None', value: 'none' }, { label: 'Minor', value: 'minor' }, { label: 'Major', value: 'major' }, { label: 'Critical', value: 'critical' }] },
          ],
        },
      ],
    },
  },
];

export function getBlankSchema(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(SAMPLE_SCHEMAS[0].schema));
}

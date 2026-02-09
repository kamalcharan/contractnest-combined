// src/pages/admin/smart-forms/utils/fieldTypeRegistry.ts
// Registry of all supported field types with metadata for the editor

export interface FieldTypeDefinition {
  type: string;
  label: string;
  icon: string;       // Unicode icon for palette display
  category: 'input' | 'selection' | 'content' | 'layout';
  defaultProps: Record<string, unknown>;
}

export const FIELD_TYPE_REGISTRY: FieldTypeDefinition[] = [
  // Input fields
  {
    type: 'text',
    label: 'Text Input',
    icon: 'Aa',
    category: 'input',
    defaultProps: { placeholder: '', required: false, max_length: null },
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: '\u2261',
    category: 'input',
    defaultProps: { placeholder: '', required: false, rows: 3, max_length: null },
  },
  {
    type: 'number',
    label: 'Number',
    icon: '#',
    category: 'input',
    defaultProps: { placeholder: '', required: false, min: null, max: null, step: null },
  },
  {
    type: 'email',
    label: 'Email',
    icon: '@',
    category: 'input',
    defaultProps: { placeholder: '', required: false },
  },
  {
    type: 'date',
    label: 'Date',
    icon: '\uD83D\uDCC5',
    category: 'input',
    defaultProps: { required: false, min_date: null, max_date: null },
  },
  {
    type: 'file',
    label: 'File Upload',
    icon: '\uD83D\uDCCE',
    category: 'input',
    defaultProps: { required: false, accept: '', max_size_mb: 10 },
  },

  // Selection fields
  {
    type: 'select',
    label: 'Dropdown',
    icon: '\u25BE',
    category: 'selection',
    defaultProps: { required: false, options: [{ label: 'Option 1', value: 'option_1' }] },
  },
  {
    type: 'multi_select',
    label: 'Multi Select',
    icon: '\u2611',
    category: 'selection',
    defaultProps: { required: false, options: [{ label: 'Option 1', value: 'option_1' }] },
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: '\u2610',
    category: 'selection',
    defaultProps: { required: false, default_checked: false },
  },
  {
    type: 'radio',
    label: 'Radio Group',
    icon: '\u25CE',
    category: 'selection',
    defaultProps: { required: false, options: [{ label: 'Option 1', value: 'option_1' }] },
  },

  // Content fields
  {
    type: 'heading',
    label: 'Heading',
    icon: 'H',
    category: 'content',
    defaultProps: { text: 'Section Heading', level: 3 },
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    icon: '\u00B6',
    category: 'content',
    defaultProps: { text: 'Descriptive text here...' },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '\u2014',
    category: 'content',
    defaultProps: {},
  },
];

// Grouped by category for the palette
export const FIELD_CATEGORIES = [
  { key: 'input' as const, label: 'Input Fields' },
  { key: 'selection' as const, label: 'Selection Fields' },
  { key: 'content' as const, label: 'Content & Layout' },
];

// Generate a new field snippet for insertion into schema JSON
export function generateFieldSnippet(fieldType: FieldTypeDefinition, fieldIndex: number): Record<string, unknown> {
  return {
    id: `field_${Date.now()}_${fieldIndex}`,
    type: fieldType.type,
    label: `New ${fieldType.label}`,
    ...fieldType.defaultProps,
  };
}

// Generate a new section snippet
export function generateSectionSnippet(sectionIndex: number): Record<string, unknown> {
  return {
    id: `section_${Date.now()}_${sectionIndex}`,
    title: `Section ${sectionIndex + 1}`,
    description: '',
    fields: [],
  };
}

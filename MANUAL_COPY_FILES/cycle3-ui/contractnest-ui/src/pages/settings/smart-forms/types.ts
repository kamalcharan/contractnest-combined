// ============================================================================
// Tenant Smart Forms Types — Selections + Submissions + Schema
// ============================================================================

// ---- SELECTIONS ----

export interface FormTemplateInfo {
  id: string;
  name: string;
  description: string | null;
  category: string;
  form_type: string;
  tags: string[];
  version: number;
  status: string;
}

export interface TenantSelection {
  id: string;
  tenant_id: string;
  form_template_id: string;
  is_active: boolean;
  selected_by: string;
  selected_at: string;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
  m_form_templates?: FormTemplateInfo;
}

// ---- SUBMISSIONS ----

export interface FormSubmission {
  id: string;
  tenant_id: string;
  form_template_id: string;
  form_template_version: number;
  service_event_id: string;
  contract_id: string;
  mapping_id: string | null;
  responses: Record<string, unknown>;
  computed_values: Record<string, unknown>;
  status: string;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  device_info: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---- FORM SCHEMA TYPES (parsed from JSON) ----

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom_message?: string;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  help_text?: string;
  default_value?: unknown;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  computed?: {
    formula: string;
    depends_on: string[];
  };
  conditional?: {
    field_id: string;
    operator: string;
    value: unknown;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  repeatable?: boolean;
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  version: number;
  sections: FormSection[];
  settings?: {
    allow_draft?: boolean;
    require_all_sections?: boolean;
    show_progress?: boolean;
    theme?: string;
  };
}

// ---- FORM RENDERER PROPS ----

export interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, unknown>;
  onSubmit: (responses: Record<string, unknown>, computedValues: Record<string, unknown>) => void;
  onSaveDraft?: (responses: Record<string, unknown>) => void;
  readOnly?: boolean;
  loading?: boolean;
}

// ---- VALIDATION ----

export interface FieldError {
  fieldId: string;
  message: string;
}

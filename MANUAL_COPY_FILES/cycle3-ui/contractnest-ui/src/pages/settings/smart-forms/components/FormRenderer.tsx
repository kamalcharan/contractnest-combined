// ============================================================================
// FormRenderer — Interactive form renderer for Smart Forms schemas
// Renders all 13 field types with validation, data collection, computed values
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, CheckCircle2, Save, Send } from 'lucide-react';
import type {
  FormSchema,
  FormSection,
  FormField,
  FormRendererProps,
  FieldError,
} from '../types';

// ---- Field Renderers ----

interface FieldProps {
  field: FormField;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  error?: string;
  readOnly: boolean;
  colors: any;
  isDarkMode: boolean;
}

const inputBaseClass = (isDarkMode: boolean, hasError: boolean) =>
  cn(
    'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
    isDarkMode
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-blue-500/40'
      : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500/40',
    hasError && 'border-red-400 focus:ring-red-400/40'
  );

const TextField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, colors, isDarkMode }) => (
  <input
    type={field.type === 'email' ? 'email' : 'text'}
    value={(value as string) || ''}
    onChange={(e) => onChange(field.id, e.target.value)}
    placeholder={field.placeholder || ''}
    readOnly={readOnly}
    className={inputBaseClass(isDarkMode, !!error)}
    maxLength={field.validation?.maxLength}
  />
);

const TextareaField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, isDarkMode }) => (
  <textarea
    value={(value as string) || ''}
    onChange={(e) => onChange(field.id, e.target.value)}
    placeholder={field.placeholder || ''}
    readOnly={readOnly}
    rows={4}
    className={inputBaseClass(isDarkMode, !!error)}
    maxLength={field.validation?.maxLength}
  />
);

const NumberField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, isDarkMode }) => (
  <input
    type="number"
    value={value !== undefined && value !== null ? String(value) : ''}
    onChange={(e) => onChange(field.id, e.target.value ? Number(e.target.value) : null)}
    placeholder={field.placeholder || ''}
    readOnly={readOnly}
    min={field.validation?.min}
    max={field.validation?.max}
    className={inputBaseClass(isDarkMode, !!error)}
  />
);

const DateField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, isDarkMode }) => (
  <input
    type="date"
    value={(value as string) || ''}
    onChange={(e) => onChange(field.id, e.target.value)}
    readOnly={readOnly}
    className={inputBaseClass(isDarkMode, !!error)}
  />
);

const SelectField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, isDarkMode }) => (
  <select
    value={(value as string) || ''}
    onChange={(e) => onChange(field.id, e.target.value)}
    disabled={readOnly}
    className={inputBaseClass(isDarkMode, !!error)}
  >
    <option value="">{field.placeholder || 'Select...'}</option>
    {(field.options || []).map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

const MultiSelectField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, isDarkMode }) => {
  const selected = Array.isArray(value) ? (value as string[]) : [];

  const toggle = (optValue: string) => {
    if (readOnly) return;
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange(field.id, next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(field.options || []).map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={readOnly}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              isSelected
                ? isDarkMode
                  ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                  : 'bg-blue-50 border-blue-400 text-blue-700'
                : isDarkMode
                ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const CheckboxField: React.FC<FieldProps> = ({ field, value, onChange, readOnly, isDarkMode }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onChange(field.id, e.target.checked)}
      disabled={readOnly}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
    <span className={cn('text-sm', isDarkMode ? 'text-white/80' : 'text-gray-700')}>
      {field.label}
    </span>
  </label>
);

const RadioField: React.FC<FieldProps> = ({ field, value, onChange, readOnly, isDarkMode }) => (
  <div className="flex flex-col gap-2">
    {(field.options || []).map((opt) => (
      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={field.id}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(field.id, opt.value)}
          disabled={readOnly}
          className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className={cn('text-sm', isDarkMode ? 'text-white/80' : 'text-gray-700')}>
          {opt.label}
        </span>
      </label>
    ))}
  </div>
);

const FileField: React.FC<FieldProps> = ({ field, value, onChange, error, readOnly, isDarkMode }) => (
  <input
    type="file"
    onChange={(e) => {
      const file = e.target.files?.[0];
      onChange(field.id, file ? file.name : null);
    }}
    disabled={readOnly}
    className={cn(
      'w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium',
      isDarkMode
        ? 'text-white/60 file:bg-white/10 file:text-white/80'
        : 'text-gray-500 file:bg-blue-50 file:text-blue-700'
    )}
  />
);

// Layout-only fields
const HeadingField: React.FC<{ field: FormField; isDarkMode: boolean }> = ({ field, isDarkMode }) => (
  <h3
    className={cn(
      'text-lg font-semibold mt-2',
      isDarkMode ? 'text-white' : 'text-gray-900'
    )}
  >
    {field.label}
  </h3>
);

const ParagraphField: React.FC<{ field: FormField; isDarkMode: boolean }> = ({ field, isDarkMode }) => (
  <p className={cn('text-sm', isDarkMode ? 'text-white/60' : 'text-gray-500')}>
    {field.help_text || field.label}
  </p>
);

const DividerField: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
  <hr className={isDarkMode ? 'border-white/10' : 'border-gray-200'} />
);

// ---- Conditional visibility ----

function evaluateCondition(
  conditional: FormField['conditional'],
  allValues: Record<string, unknown>
): boolean {
  if (!conditional) return true;
  const fieldValue = allValues[conditional.field_id];
  switch (conditional.operator) {
    case 'equals':
      return fieldValue === conditional.value;
    case 'not_equals':
      return fieldValue !== conditional.value;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(String(conditional.value));
    case 'not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    default:
      return true;
  }
}

// ---- Validation ----

function validateField(field: FormField, value: unknown): string | null {
  const v = field.validation;
  if (!v) return null;

  // Layout-only fields skip validation
  if (['heading', 'paragraph', 'divider'].includes(field.type)) return null;

  if (v.required) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return v.custom_message || `${field.label} is required`;
    }
  }

  if (typeof value === 'string' && value) {
    if (v.minLength && value.length < v.minLength) {
      return `${field.label} must be at least ${v.minLength} characters`;
    }
    if (v.maxLength && value.length > v.maxLength) {
      return `${field.label} must be at most ${v.maxLength} characters`;
    }
    if (v.pattern) {
      try {
        const regex = new RegExp(v.pattern);
        if (!regex.test(value)) {
          return v.custom_message || `${field.label} format is invalid`;
        }
      } catch {
        // Invalid regex pattern — skip
      }
    }
  }

  if (typeof value === 'number') {
    if (v.min !== undefined && value < v.min) {
      return `${field.label} must be at least ${v.min}`;
    }
    if (v.max !== undefined && value > v.max) {
      return `${field.label} must be at most ${v.max}`;
    }
  }

  return null;
}

// ---- Main FormRenderer ----

const FormRenderer: React.FC<FormRendererProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  onSaveDraft,
  readOnly = false,
  loading = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync initialValues when they change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setValues(initialValues);
    }
  }, [initialValues]);

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
    // Clear error on change
    setErrors((prev) => {
      if (prev[fieldId]) {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      }
      return prev;
    });
  }, []);

  // Computed values
  const computedValues = useMemo(() => {
    const computed: Record<string, unknown> = {};
    const allFields = schema.sections.flatMap((s) => s.fields);

    for (const field of allFields) {
      if (!field.computed) continue;
      try {
        // Simple formula evaluator: supports SUM(field1, field2), field1 + field2, etc.
        const formula = field.computed.formula;
        const deps = field.computed.depends_on || [];
        const depValues = deps.map((d) => Number(values[d]) || 0);

        if (formula.startsWith('SUM')) {
          computed[field.id] = depValues.reduce((a, b) => a + b, 0);
        } else if (formula.startsWith('AVG') && depValues.length > 0) {
          computed[field.id] = depValues.reduce((a, b) => a + b, 0) / depValues.length;
        } else if (formula.startsWith('COUNT')) {
          computed[field.id] = depValues.filter((v) => v !== 0).length;
        } else {
          // Try basic arithmetic: replace field names with values
          let expr = formula;
          for (const dep of deps) {
            expr = expr.replace(new RegExp(dep, 'g'), String(Number(values[dep]) || 0));
          }
          // Simple safe eval for basic math
          const result = Function(`"use strict"; return (${expr})`)();
          computed[field.id] = typeof result === 'number' && isFinite(result) ? result : 0;
        }
      } catch {
        computed[field.id] = 0;
      }
    }
    return computed;
  }, [schema, values]);

  // Validate all visible fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const allFields = schema.sections.flatMap((s) => s.fields);

    for (const field of allFields) {
      if (['heading', 'paragraph', 'divider'].includes(field.type)) continue;
      if (field.conditional && !evaluateCondition(field.conditional, values)) continue;

      const error = validateField(field, values[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    }

    setErrors(newErrors);
    // Mark all as touched
    const allTouched: Record<string, boolean> = {};
    allFields.forEach((f) => (allTouched[f.id] = true));
    setTouched(allTouched);

    return Object.keys(newErrors).length === 0;
  }, [schema, values]);

  const handleSubmit = useCallback(() => {
    if (readOnly || loading) return;
    if (!validateAll()) return;
    onSubmit(values, computedValues);
  }, [readOnly, loading, validateAll, onSubmit, values, computedValues]);

  const handleSaveDraft = useCallback(() => {
    if (readOnly || loading || !onSaveDraft) return;
    onSaveDraft(values);
  }, [readOnly, loading, onSaveDraft, values]);

  // Progress indicator
  const progress = useMemo(() => {
    const allFields = schema.sections.flatMap((s) => s.fields);
    const fillable = allFields.filter(
      (f) => !['heading', 'paragraph', 'divider'].includes(f.type)
    );
    const filled = fillable.filter((f) => {
      const v = values[f.id];
      return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
    return fillable.length > 0 ? Math.round((filled.length / fillable.length) * 100) : 0;
  }, [schema, values]);

  // Render a single field
  const renderField = (field: FormField) => {
    // Check conditional visibility
    if (field.conditional && !evaluateCondition(field.conditional, values)) {
      return null;
    }

    // Layout-only fields
    if (field.type === 'heading') return <HeadingField key={field.id} field={field} isDarkMode={isDarkMode} />;
    if (field.type === 'paragraph') return <ParagraphField key={field.id} field={field} isDarkMode={isDarkMode} />;
    if (field.type === 'divider') return <DividerField key={field.id} isDarkMode={isDarkMode} />;

    const fieldError = touched[field.id] ? errors[field.id] : undefined;
    const isRequired = field.validation?.required;
    const isComputed = !!field.computed;
    const displayValue = isComputed ? computedValues[field.id] : values[field.id];

    const fieldProps: FieldProps = {
      field,
      value: displayValue,
      onChange: isComputed ? () => {} : handleChange,
      error: fieldError,
      readOnly: readOnly || isComputed,
      colors,
      isDarkMode,
    };

    let FieldComponent: React.FC<FieldProps>;
    switch (field.type) {
      case 'text':
      case 'email':
        FieldComponent = TextField;
        break;
      case 'textarea':
        FieldComponent = TextareaField;
        break;
      case 'number':
        FieldComponent = NumberField;
        break;
      case 'date':
        FieldComponent = DateField;
        break;
      case 'select':
        FieldComponent = SelectField;
        break;
      case 'multi_select':
        FieldComponent = MultiSelectField;
        break;
      case 'checkbox':
        return (
          <div key={field.id} className="py-1">
            <CheckboxField {...fieldProps} />
            {fieldError && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fieldError}
              </p>
            )}
          </div>
        );
      case 'radio':
        FieldComponent = RadioField;
        break;
      case 'file':
        FieldComponent = FileField;
        break;
      default:
        FieldComponent = TextField;
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <label
          className={cn(
            'block text-sm font-medium',
            isDarkMode ? 'text-white/80' : 'text-gray-700'
          )}
        >
          {field.label}
          {isRequired && <span className="text-red-400 ml-0.5">*</span>}
          {isComputed && (
            <span
              className={cn(
                'ml-2 text-xs px-1.5 py-0.5 rounded',
                isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'
              )}
            >
              Computed
            </span>
          )}
        </label>
        {field.help_text && (
          <p className={cn('text-xs', isDarkMode ? 'text-white/40' : 'text-gray-400')}>
            {field.help_text}
          </p>
        )}
        <FieldComponent {...fieldProps} />
        {fieldError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {fieldError}
          </p>
        )}
      </div>
    );
  };

  // Render a section
  const renderSection = (section: FormSection, index: number) => (
    <div
      key={section.id}
      className={cn(
        'rounded-xl border p-5 space-y-4',
        isDarkMode
          ? 'bg-white/[0.03] border-white/10 backdrop-blur-sm'
          : 'bg-white border-gray-200 shadow-sm'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3
            className={cn(
              'text-base font-semibold',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}
          >
            {section.title}
          </h3>
          {section.description && (
            <p className={cn('text-xs mt-0.5', isDarkMode ? 'text-white/50' : 'text-gray-500')}>
              {section.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isDarkMode ? 'bg-white/5 text-white/40' : 'bg-gray-100 text-gray-500'
          )}
        >
          Section {index + 1}
        </span>
      </div>

      <div className="grid gap-4">{section.fields.map(renderField)}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header with progress */}
      {schema.settings?.show_progress !== false && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div
              className={cn(
                'h-2 rounded-full overflow-hidden',
                isDarkMode ? 'bg-white/10' : 'bg-gray-100'
              )}
            >
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              isDarkMode ? 'text-white/50' : 'text-gray-500'
            )}
          >
            {progress}%
          </span>
        </div>
      )}

      {/* Sections */}
      {schema.sections.map((section, i) => renderSection(section, i))}

      {/* Validation summary */}
      {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
        <div
          className={cn(
            'rounded-lg border p-3 text-sm',
            isDarkMode
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-red-50 border-red-200 text-red-700'
          )}
        >
          <div className="flex items-center gap-2 font-medium mb-1">
            <AlertCircle className="h-4 w-4" />
            {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's' : ''} need
            attention
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {Object.entries(errors).map(([id, msg]) => (
              <li key={id}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {onSaveDraft && schema.settings?.allow_draft !== false && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors',
              'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default FormRenderer;

// ============================================================================
// FormRenderer — Interactive form renderer for Smart Forms schemas
// FIXED: inline theme styles using colors.utility/brand/semantic, RichTextEditor
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Loader2, AlertCircle, Save, Send } from 'lucide-react';
import type {
  FormSchema,
  FormSection,
  FormField,
  FormRendererProps,
} from '../types';

// ---- Conditional visibility ----

function evaluateCondition(
  conditional: FormField['conditional'],
  allValues: Record<string, unknown>
): boolean {
  if (!conditional) return true;
  const fieldValue = allValues[conditional.field_id];
  switch (conditional.operator) {
    case 'equals': return fieldValue === conditional.value;
    case 'not_equals': return fieldValue !== conditional.value;
    case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(String(conditional.value));
    case 'not_empty': return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'empty': return fieldValue === null || fieldValue === undefined || fieldValue === '';
    default: return true;
  }
}

// ---- Validation ----

function validateField(field: FormField, value: unknown): string | null {
  const v = field.validation;
  if (!v) return null;
  if (['heading', 'paragraph', 'divider'].includes(field.type)) return null;

  if (v.required) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return v.custom_message || `${field.label} is required`;
    }
  }

  if (typeof value === 'string' && value) {
    if (v.minLength && value.length < v.minLength) return `${field.label} must be at least ${v.minLength} characters`;
    if (v.maxLength && value.length > v.maxLength) return `${field.label} must be at most ${v.maxLength} characters`;
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(value)) return v.custom_message || `${field.label} format is invalid`;
      } catch { /* skip invalid regex */ }
    }
  }

  if (typeof value === 'number') {
    if (v.min !== undefined && value < v.min) return `${field.label} must be at least ${v.min}`;
    if (v.max !== undefined && value > v.max) return `${field.label} must be at most ${v.max}`;
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

  useEffect(() => {
    if (Object.keys(initialValues).length > 0) setValues(initialValues);
  }, [initialValues]);

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
    setErrors((prev) => { if (prev[fieldId]) { const c = { ...prev }; delete c[fieldId]; return c; } return prev; });
  }, []);

  // Computed values
  const computedValues = useMemo(() => {
    const computed: Record<string, unknown> = {};
    const allFields = schema.sections.flatMap((s) => s.fields);
    for (const field of allFields) {
      if (!field.computed) continue;
      try {
        const deps = field.computed.depends_on || [];
        const depValues = deps.map((d) => Number(values[d]) || 0);
        const formula = field.computed.formula;
        if (formula.startsWith('SUM')) { computed[field.id] = depValues.reduce((a, b) => a + b, 0); }
        else if (formula.startsWith('AVG') && depValues.length > 0) { computed[field.id] = depValues.reduce((a, b) => a + b, 0) / depValues.length; }
        else if (formula.startsWith('COUNT')) { computed[field.id] = depValues.filter((v) => v !== 0).length; }
        else {
          let expr = formula;
          for (const dep of deps) expr = expr.replace(new RegExp(dep, 'g'), String(Number(values[dep]) || 0));
          const result = Function(`"use strict"; return (${expr})`)();
          computed[field.id] = typeof result === 'number' && isFinite(result) ? result : 0;
        }
      } catch { computed[field.id] = 0; }
    }
    return computed;
  }, [schema, values]);

  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const allFields = schema.sections.flatMap((s) => s.fields);
    for (const field of allFields) {
      if (['heading', 'paragraph', 'divider'].includes(field.type)) continue;
      if (field.conditional && !evaluateCondition(field.conditional, values)) continue;
      const error = validateField(field, values[field.id]);
      if (error) newErrors[field.id] = error;
    }
    setErrors(newErrors);
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

  // Progress
  const progress = useMemo(() => {
    const fillable = schema.sections.flatMap((s) => s.fields).filter((f) => !['heading', 'paragraph', 'divider'].includes(f.type));
    const filled = fillable.filter((f) => { const v = values[f.id]; return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0); });
    return fillable.length > 0 ? Math.round((filled.length / fillable.length) * 100) : 0;
  }, [schema, values]);

  // ---- Shared styles ----
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: `1px solid ${colors.utility.secondaryText}20`,
    backgroundColor: colors.utility.primaryBackground,
    color: colors.utility.primaryText,
    fontSize: '0.8125rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: colors.semantic.error + '60',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.utility.primaryText,
    marginBottom: '0.375rem',
  };

  // ---- Render a field ----
  const renderField = (field: FormField) => {
    if (field.conditional && !evaluateCondition(field.conditional, values)) return null;

    // Layout fields
    if (field.type === 'heading') return (
      <div key={field.id} style={{ fontSize: '1.1rem', fontWeight: 600, color: colors.utility.primaryText, marginTop: '0.5rem' }}>
        {field.label}
      </div>
    );
    if (field.type === 'paragraph') return (
      <p key={field.id} style={{ margin: 0, fontSize: '0.8125rem', color: colors.utility.secondaryText }}>
        {field.help_text || field.label}
      </p>
    );
    if (field.type === 'divider') return (
      <hr key={field.id} style={{ border: 'none', borderTop: `1px solid ${colors.utility.secondaryText}20`, margin: '0.5rem 0' }} />
    );

    const fieldError = touched[field.id] ? errors[field.id] : undefined;
    const isRequired = field.validation?.required;
    const isComputed = !!field.computed;
    const displayValue = isComputed ? computedValues[field.id] : values[field.id];
    const currentInputStyle = fieldError ? inputErrorStyle : inputStyle;
    const isDisabled = readOnly || isComputed;

    const errorEl = fieldError ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: colors.semantic.error }}>
        <AlertCircle style={{ width: 12, height: 12 }} /> {fieldError}
      </div>
    ) : null;

    const labelEl = (
      <span style={labelStyle}>
        {field.label}
        {isRequired && <span style={{ color: colors.semantic.error, marginLeft: '0.25rem' }}>*</span>}
        {isComputed && (
          <span style={{
            marginLeft: '0.5rem',
            fontSize: '0.6875rem',
            padding: '0.125rem 0.375rem',
            borderRadius: '4px',
            backgroundColor: colors.brand.primary + '15',
            color: colors.brand.primary,
          }}>Computed</span>
        )}
      </span>
    );

    const helpEl = field.help_text ? (
      <div style={{ fontSize: '0.6875rem', color: colors.utility.secondaryText, marginBottom: '0.25rem' }}>{field.help_text}</div>
    ) : null;

    // Checkbox — special layout
    if (field.type === 'checkbox') {
      return (
        <div key={field.id} style={{ padding: '0.25rem 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isDisabled ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={!!displayValue}
              onChange={(e) => !isDisabled && handleChange(field.id, e.target.checked)}
              disabled={isDisabled}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: '0.8125rem', color: colors.utility.primaryText }}>{field.label}</span>
          </label>
          {errorEl}
        </div>
      );
    }

    // Radio
    if (field.type === 'radio') {
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {labelEl}{helpEl}
          {(field.options || []).map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isDisabled ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={displayValue === opt.value}
                onChange={() => !isDisabled && handleChange(field.id, opt.value)}
                disabled={isDisabled}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: '0.8125rem', color: colors.utility.primaryText }}>{opt.label}</span>
            </label>
          ))}
          {errorEl}
        </div>
      );
    }

    // Multi-select (pill toggle)
    if (field.type === 'multi_select') {
      const selected = Array.isArray(displayValue) ? (displayValue as string[]) : [];
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {labelEl}{helpEl}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(field.options || []).map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    const next = isSelected ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                    handleChange(field.id, next);
                  }}
                  disabled={isDisabled}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: isDisabled ? 'default' : 'pointer',
                    border: `1px solid ${isSelected ? colors.brand.primary + '60' : colors.utility.secondaryText + '20'}`,
                    backgroundColor: isSelected ? colors.brand.primary + '15' : colors.utility.primaryBackground,
                    color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {errorEl}
        </div>
      );
    }

    // Select
    if (field.type === 'select') {
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {labelEl}{helpEl}
          <select
            value={(displayValue as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            disabled={isDisabled}
            style={currentInputStyle}
          >
            <option value="">{field.placeholder || 'Select...'}</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errorEl}
        </div>
      );
    }

    // Textarea → RichTextEditor
    if (field.type === 'textarea') {
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {labelEl}{helpEl}
          <RichTextEditor
            value={(displayValue as string) || ''}
            onChange={(val) => handleChange(field.id, val)}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            minHeight={80}
            maxHeight={200}
            maxLength={field.validation?.maxLength}
            showCharCount={!!field.validation?.maxLength}
            toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
            error={fieldError}
          />
          {errorEl}
        </div>
      );
    }

    // File
    if (field.type === 'file') {
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {labelEl}{helpEl}
          <div style={{
            ...currentInputStyle,
            padding: '1rem',
            textAlign: 'center',
            border: `1px dashed ${colors.utility.secondaryText}30`,
            color: colors.utility.secondaryText,
            fontSize: '0.75rem',
            cursor: isDisabled ? 'default' : 'pointer',
          }}>
            Click or drag file to upload
          </div>
          {errorEl}
        </div>
      );
    }

    // Date
    if (field.type === 'date') {
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {labelEl}{helpEl}
          <input
            type="date"
            value={(displayValue as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            readOnly={isDisabled}
            style={currentInputStyle}
          />
          {errorEl}
        </div>
      );
    }

    // Number
    if (field.type === 'number') {
      return (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {labelEl}{helpEl}
          <input
            type="number"
            value={displayValue !== undefined && displayValue !== null ? String(displayValue) : ''}
            onChange={(e) => handleChange(field.id, e.target.value ? Number(e.target.value) : null)}
            readOnly={isDisabled}
            min={field.validation?.min}
            max={field.validation?.max}
            placeholder={field.placeholder || ''}
            style={currentInputStyle}
          />
          {errorEl}
        </div>
      );
    }

    // Default: text, email
    return (
      <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {labelEl}{helpEl}
        <input
          type={field.type === 'email' ? 'email' : 'text'}
          value={(displayValue as string) || ''}
          onChange={(e) => handleChange(field.id, e.target.value)}
          readOnly={isDisabled}
          placeholder={field.placeholder || ''}
          maxLength={field.validation?.maxLength}
          style={currentInputStyle}
        />
        {errorEl}
      </div>
    );
  };

  // ---- Render section ----
  const renderSection = (section: FormSection, index: number) => (
    <div
      key={section.id}
      style={{
        borderRadius: '12px',
        border: `1px solid ${colors.utility.secondaryText}20`,
        backgroundColor: colors.utility.secondaryBackground,
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: colors.utility.primaryText }}>
            {section.title}
          </h3>
          {section.description && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: colors.utility.secondaryText }}>
              {section.description}
            </p>
          )}
        </div>
        <span style={{
          fontSize: '0.6875rem',
          padding: '0.125rem 0.5rem',
          borderRadius: '999px',
          backgroundColor: colors.utility.secondaryText + '10',
          color: colors.utility.secondaryText,
        }}>
          Section {index + 1}
        </span>
      </div>
      {section.fields.map(renderField)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress bar */}
      {schema.settings?.show_progress !== false && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: colors.utility.secondaryText + '15' }}>
            <div style={{ height: '100%', borderRadius: '4px', backgroundColor: colors.brand.primary, transition: 'width 0.3s', width: `${progress}%` }} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: colors.utility.secondaryText, fontVariantNumeric: 'tabular-nums' }}>
            {progress}%
          </span>
        </div>
      )}

      {/* Sections */}
      {schema.sections.map((section, i) => renderSection(section, i))}

      {/* Validation summary */}
      {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
        <div style={{
          borderRadius: '8px',
          border: `1px solid ${colors.semantic.error}20`,
          backgroundColor: colors.semantic.error + '08',
          padding: '0.75rem',
          color: colors.semantic.error,
          fontSize: '0.8125rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <AlertCircle style={{ width: 16, height: 16 }} />
            {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's' : ''} need attention
          </div>
          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem' }}>
            {Object.entries(errors).map(([id, msg]) => <li key={id}>{msg}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          {onSaveDraft && schema.settings?.allow_draft !== false && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: `1px solid ${colors.utility.secondaryText}30`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
              Save Draft
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              color: '#ffffff',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 16, height: 16 }} />}
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default FormRenderer;

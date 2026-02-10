// src/pages/admin/smart-forms/components/LiveFormPreview.tsx
// Renders a live preview of the form from the current schema JSON
// FIXED: uses correct theme property names (primaryText, secondaryText, etc.)

import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useFormEditorContext } from '../context/FormEditorContext';
import type { FormSchema, FormSchemaSection, FormSchemaField } from '../context/FormEditorContext';

const LiveFormPreview: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { state } = useFormEditorContext();
  const { schema, parseError, validationErrors } = state;

  if (parseError) {
    return (
      <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: colors.semantic.error + '10',
          color: colors.semantic.error,
          fontSize: '0.8125rem',
          fontFamily: 'monospace',
          border: `1px solid ${colors.semantic.error}20`,
        }}>
          <strong>JSON Parse Error</strong>
          <div style={{ marginTop: '0.5rem' }}>{parseError}</div>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{
        padding: '1.5rem',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.utility.secondaryText,
        fontSize: '0.875rem',
      }}>
        Start editing the schema to see a live preview
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem',
      height: '100%',
      overflow: 'auto',
      backgroundColor: colors.utility.primaryBackground,
    }}>
      {/* Validation warnings */}
      {validationErrors.length > 0 && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          backgroundColor: colors.semantic.warning + '10',
          color: colors.semantic.warning,
          fontSize: '0.75rem',
          marginBottom: '1rem',
          border: `1px solid ${colors.semantic.warning}20`,
        }}>
          <strong>Validation Issues ({validationErrors.length})</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            {validationErrors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {validationErrors.length > 5 && (
              <li>...and {validationErrors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Form preview card */}
      <div style={{
        borderRadius: '12px',
        border: `1px solid ${colors.utility.secondaryText}20`,
        backgroundColor: colors.utility.secondaryBackground,
        overflow: 'hidden',
      }}>
        {/* Form header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${colors.utility.secondaryText}20`,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: colors.utility.primaryText,
          }}>
            {schema.title || 'Untitled Form'}
          </h2>
          {schema.description && (
            <p style={{
              margin: '0.375rem 0 0',
              fontSize: '0.8125rem',
              color: colors.utility.secondaryText,
            }}>
              {schema.description}
            </p>
          )}
        </div>

        {/* Sections */}
        {Array.isArray(schema.sections) && schema.sections.map((section, sIdx) => (
          <SectionPreview
            key={section.id || sIdx}
            section={section}
            sectionIndex={sIdx}
            colors={colors}
            isLast={sIdx === schema.sections.length - 1}
          />
        ))}

        {/* Empty sections state */}
        {(!Array.isArray(schema.sections) || schema.sections.length === 0) && (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: colors.utility.secondaryText,
            fontSize: '0.8125rem',
          }}>
            No sections defined. Add a section in the JSON editor or drag from the palette.
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Section Preview ----

interface SectionPreviewProps {
  section: FormSchemaSection;
  sectionIndex: number;
  colors: any;
  isLast: boolean;
}

const SectionPreview: React.FC<SectionPreviewProps> = ({ section, colors, isLast }) => {
  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      borderBottom: isLast ? 'none' : `1px solid ${colors.utility.secondaryText}20`,
    }}>
      <h3 style={{
        margin: '0 0 0.25rem',
        fontSize: '1rem',
        fontWeight: 600,
        color: colors.utility.primaryText,
      }}>
        {section.title || 'Untitled Section'}
      </h3>
      {section.description && (
        <p style={{
          margin: '0 0 1rem',
          fontSize: '0.75rem',
          color: colors.utility.secondaryText,
        }}>
          {section.description}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.isArray(section.fields) && section.fields.map((field, fIdx) => (
          <FieldPreview key={field.id || fIdx} field={field} colors={colors} />
        ))}
        {(!Array.isArray(section.fields) || section.fields.length === 0) && (
          <div style={{
            padding: '1rem',
            borderRadius: '6px',
            border: `1px dashed ${colors.utility.secondaryText}30`,
            textAlign: 'center',
            color: colors.utility.secondaryText,
            fontSize: '0.75rem',
          }}>
            No fields in this section
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Field Preview ----

interface FieldPreviewProps {
  field: FormSchemaField;
  colors: any;
}

const FieldPreview: React.FC<FieldPreviewProps> = ({ field, colors }) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: `1px solid ${colors.utility.secondaryText}20`,
    backgroundColor: colors.utility.primaryBackground,
    color: colors.utility.primaryText,
    fontSize: '0.8125rem',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.utility.primaryText,
    marginBottom: '0.375rem',
  };

  // Content-type fields
  if (field.type === 'heading') {
    const level = (field.level as number) || 3;
    const fontSize = level <= 2 ? '1.25rem' : level === 3 ? '1.1rem' : '1rem';
    return (
      <div style={{ fontSize, fontWeight: 600, color: colors.utility.primaryText }}>
        {(field.text as string) || field.label}
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.utility.secondaryText }}>
        {(field.text as string) || field.label}
      </p>
    );
  }

  if (field.type === 'divider') {
    return <hr style={{ border: 'none', borderTop: `1px solid ${colors.utility.secondaryText}20`, margin: '0.5rem 0' }} />;
  }

  // Checkbox
  if (field.type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
        <input type="checkbox" disabled checked={!!field.default_checked} style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: '0.8125rem', color: colors.utility.primaryText }}>
          {field.label}{field.required ? ' *' : ''}
        </span>
      </label>
    );
  }

  // Radio
  if (field.type === 'radio') {
    const options = (field.options as Array<{ label: string; value: string }>) || [];
    return (
      <div>
        <span style={labelStyle}>{field.label}{field.required ? ' *' : ''}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {options.map((opt, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
              <input type="radio" disabled name={field.id} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: '0.8125rem', color: colors.utility.primaryText }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Select / Multi Select
  if (field.type === 'select' || field.type === 'multi_select') {
    const options = (field.options as Array<{ label: string; value: string }>) || [];
    return (
      <div>
        <span style={labelStyle}>{field.label}{field.required ? ' *' : ''}</span>
        <select disabled style={inputStyle} multiple={field.type === 'multi_select'}>
          <option value="">Select...</option>
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // Textarea
  if (field.type === 'textarea') {
    return (
      <div>
        <span style={labelStyle}>{field.label}{field.required ? ' *' : ''}</span>
        <textarea
          disabled
          placeholder={(field.placeholder as string) || ''}
          rows={(field.rows as number) || 3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    );
  }

  // File upload
  if (field.type === 'file') {
    return (
      <div>
        <span style={labelStyle}>{field.label}{field.required ? ' *' : ''}</span>
        <div style={{
          ...inputStyle,
          padding: '1rem',
          textAlign: 'center',
          border: `1px dashed ${colors.utility.secondaryText}30`,
          color: colors.utility.secondaryText,
          fontSize: '0.75rem',
        }}>
          Click or drag file to upload
          {field.max_size_mb && <span> (max {field.max_size_mb as number}MB)</span>}
        </div>
      </div>
    );
  }

  // Default: text, number, email, date
  const inputType = field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text';
  return (
    <div>
      <span style={labelStyle}>{field.label}{field.required ? ' *' : ''}</span>
      <input
        type={inputType}
        disabled
        placeholder={(field.placeholder as string) || ''}
        style={inputStyle}
      />
    </div>
  );
};

export default LiveFormPreview;

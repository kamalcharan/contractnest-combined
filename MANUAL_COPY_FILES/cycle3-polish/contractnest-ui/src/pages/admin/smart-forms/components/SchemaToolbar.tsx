// src/pages/admin/smart-forms/components/SchemaToolbar.tsx
// Toolbar for the form editor — validate, format, import/export, save, undo/redo

import React, { useRef, useCallback } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useFormEditorContext } from '../context/FormEditorContext';
import { vaniToast } from '@/components/common/toast';
import { SAMPLE_SCHEMAS, type SampleSchema } from '../utils/sampleSchemas';

interface SchemaToolbarProps {
  onSave: () => void;
  onValidate: () => void;
  onSubmitReview?: () => void;
  isNew: boolean;
}

const SchemaToolbar: React.FC<SchemaToolbarProps> = ({ onSave, onValidate, onSubmitReview, isNew }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { state, setSchemaText, undo, redo, undoStack, redoStack } = useFormEditorContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = React.useState(false);

  // Format JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(state.schemaText);
      setSchemaText(JSON.stringify(parsed, null, 2));
      vaniToast.success('JSON formatted');
    } catch {
      vaniToast.error('Cannot format — fix JSON errors first');
    }
  }, [state.schemaText, setSchemaText]);

  // Export JSON
  const handleExport = useCallback(() => {
    try {
      const blob = new Blob([state.schemaText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.schema?.id || 'form-schema'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      vaniToast.success('Schema exported');
    } catch {
      vaniToast.error('Export failed');
    }
  }, [state.schemaText, state.schema?.id]);

  // Import JSON
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text); // validate JSON
        setSchemaText(text);
        vaniToast.success('Schema imported');
      } catch {
        vaniToast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = '';
  }, [setSchemaText]);

  // Load sample template
  const handleLoadSample = useCallback((sample: SampleSchema) => {
    setSchemaText(JSON.stringify(sample.schema, null, 2));
    setShowTemplates(false);
    vaniToast.success(`Loaded "${sample.label}" template`);
  }, [setSchemaText]);

  const btnBase: React.CSSProperties = {
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    border: `1px solid ${colors.utility.secondaryText + '20'}`,
    backgroundColor: colors.utility.secondaryBackground,
    color: colors.utility.primaryText,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  const isDraft = state.templateStatus === 'draft';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      borderBottom: `1px solid ${colors.utility.secondaryText + '20'}`,
      backgroundColor: colors.utility.secondaryBackground,
      flexWrap: 'wrap',
    }}>
      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={undoStack.current.length === 0}
        style={undoStack.current.length === 0 ? btnDisabled : btnBase}
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        onClick={redo}
        disabled={redoStack.current.length === 0}
        style={redoStack.current.length === 0 ? btnDisabled : btnBase}
        title="Redo (Ctrl+Y)"
      >
        Redo
      </button>

      <div style={{ width: '1px', height: '20px', backgroundColor: colors.utility.secondaryText + '20' }} />

      {/* Format */}
      <button onClick={handleFormat} style={btnBase} title="Format JSON (Ctrl+Shift+F)">
        Format
      </button>

      {/* Validate */}
      <button
        onClick={onValidate}
        disabled={state.isValidating || !!state.parseError}
        style={state.isValidating || !!state.parseError ? btnDisabled : btnBase}
      >
        {state.isValidating ? 'Validating...' : 'Validate'}
      </button>

      <div style={{ width: '1px', height: '20px', backgroundColor: colors.utility.secondaryText + '20' }} />

      {/* Import/Export */}
      <button onClick={handleImport} style={btnBase}>Import</button>
      <button onClick={handleExport} style={btnBase}>Export</button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Templates dropdown */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowTemplates(!showTemplates)} style={btnBase}>
          Templates {showTemplates ? '\u25B4' : '\u25BE'}
        </button>
        {showTemplates && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.secondaryText + '20'}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
            minWidth: '220px',
            padding: '0.25rem',
          }}>
            {SAMPLE_SCHEMAS.map(s => (
              <button
                key={s.key}
                onClick={() => handleLoadSample(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.utility.primaryBackground; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: '0.6875rem', color: colors.utility.secondaryText, marginTop: '2px' }}>
                  {s.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status indicators */}
      {state.parseError && (
        <span style={{ fontSize: '0.6875rem', color: colors.semantic.error, fontWeight: 500 }}>
          JSON Error
        </span>
      )}
      {state.validationErrors.length > 0 && !state.parseError && (
        <span style={{ fontSize: '0.6875rem', color: colors.semantic.warning, fontWeight: 500 }}>
          {state.validationErrors.length} issue{state.validationErrors.length !== 1 ? 's' : ''}
        </span>
      )}
      {state.isDirty && !state.parseError && (
        <span style={{ fontSize: '0.6875rem', color: colors.utility.secondaryText }}>
          Unsaved
        </span>
      )}
      {state.lastSavedAt && !state.isDirty && (
        <span style={{ fontSize: '0.6875rem', color: colors.semantic.success }}>
          Saved
        </span>
      )}

      <div style={{ width: '1px', height: '20px', backgroundColor: colors.utility.secondaryText + '20' }} />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={state.isSaving || !!state.parseError || !isDraft}
        style={{
          ...btnBase,
          backgroundColor: (state.isSaving || !!state.parseError || !isDraft) ? undefined : colors.brand.primary,
          color: (state.isSaving || !!state.parseError || !isDraft) ? undefined : '#fff',
          border: (state.isSaving || !!state.parseError || !isDraft) ? undefined : `1px solid ${colors.brand.primary}`,
          opacity: (state.isSaving || !!state.parseError || !isDraft) ? 0.4 : 1,
          cursor: (state.isSaving || !!state.parseError || !isDraft) ? 'not-allowed' : 'pointer',
        }}
      >
        {state.isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
      </button>

      {/* Submit for Review */}
      {!isNew && isDraft && onSubmitReview && (
        <button
          onClick={onSubmitReview}
          disabled={state.isDirty || state.isSaving}
          style={{
            ...btnBase,
            backgroundColor: (state.isDirty || state.isSaving) ? undefined : colors.brand.secondary,
            color: (state.isDirty || state.isSaving) ? undefined : '#fff',
            border: (state.isDirty || state.isSaving) ? undefined : `1px solid ${colors.brand.secondary}`,
            opacity: (state.isDirty || state.isSaving) ? 0.4 : 1,
            cursor: (state.isDirty || state.isSaving) ? 'not-allowed' : 'pointer',
          }}
          title={state.isDirty ? 'Save changes before submitting for review' : 'Submit for Review'}
        >
          Submit Review
        </button>
      )}
    </div>
  );
};

export default SchemaToolbar;

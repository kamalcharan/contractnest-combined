// src/pages/admin/smart-forms/FormEditorPage.tsx
// Main form editor — 3-panel layout: FieldPalette | MonacoEditor | LivePreview
// FIXED: correct theme property names, ConfirmationDialog, description field

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { FormEditorProvider, useFormEditorContext, type FormSchemaField } from './context/FormEditorContext';
import { useFormTemplate, useFormTemplateMutations } from './hooks/useSmartFormsAdmin';
import MonacoSchemaEditor from './components/MonacoSchemaEditor';
import LiveFormPreview from './components/LiveFormPreview';
import FieldPalette from './components/FieldPalette';
import SchemaToolbar from './components/SchemaToolbar';
import { getBlankSchema } from './utils/sampleSchemas';
import { FIELD_TYPE_REGISTRY, generateFieldSnippet } from './utils/fieldTypeRegistry';
import type { CreateTemplatePayload, UpdateTemplatePayload } from './types/smartFormsAdmin.types';

// ---- Inner component (needs FormEditorContext) ----

const FormEditorInner: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const isNew = !id || id === 'new';
  const { template, loading: templateLoading, error: templateError } = useFormTemplate(isNew ? null : id!);
  const mutations = useFormTemplateMutations();
  const { state, dispatch, initTemplate, insertField } = useFormEditorContext();

  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [dividerPos, setDividerPos] = useState(50);
  const isDraggingDivider = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ConfirmationDialog state (replaces window.confirm)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Description field
  const [templateDescription, setTemplateDescription] = useState('');

  // Auto-save refs
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize template on load
  useEffect(() => {
    if (isNew) {
      const blank = getBlankSchema();
      initTemplate(null, 'New Form Template', 'draft', blank);
      setTemplateDescription('');
    } else if (template && !templateLoading) {
      initTemplate(template.id, template.name, template.status, template.schema);
      setTemplateDescription(template.description || '');
    }
  }, [isNew, template, templateLoading, initTemplate]);

  // Debounced server validation (500ms after schema text changes)
  useEffect(() => {
    if (!state.schemaText || state.parseError) return;
    if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
    validateTimerRef.current = setTimeout(async () => {
      try {
        dispatch({ type: 'SET_IS_VALIDATING', payload: true });
        const schema = JSON.parse(state.schemaText);
        const result = await mutations.validateSchema(schema);
        if (result) {
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: result.errors || [] });
        } else {
          dispatch({ type: 'SET_IS_VALIDATING', payload: false });
        }
      } catch {
        dispatch({ type: 'SET_IS_VALIDATING', payload: false });
      }
    }, 500);
    return () => { if (validateTimerRef.current) clearTimeout(validateTimerRef.current); };
  }, [state.schemaText, state.parseError]);

  // Auto-save (2s debounce, only for existing drafts)
  useEffect(() => {
    if (isNew || !state.isDirty || state.parseError || state.templateStatus !== 'draft') return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const schema = JSON.parse(state.schemaText);
        dispatch({ type: 'SET_IS_SAVING', payload: true });
        const result = await mutations.updateTemplate(state.templateId!, { schema, description: templateDescription });
        if (result) {
          dispatch({ type: 'MARK_SAVED', payload: new Date().toISOString() });
        } else {
          dispatch({ type: 'SET_IS_SAVING', payload: false });
        }
      } catch {
        dispatch({ type: 'SET_IS_SAVING', payload: false });
      }
    }, 2000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [state.schemaText, state.isDirty, isNew, state.parseError, state.templateStatus, templateDescription]);

  // Warn on browser navigate away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.isDirty]);

  // Back navigation with confirmation dialog
  const handleBack = useCallback(() => {
    if (state.isDirty) {
      setShowLeaveDialog(true);
    } else {
      navigate('/admin/smart-forms');
    }
  }, [state.isDirty, navigate]);

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveDialog(false);
    navigate('/admin/smart-forms');
  }, [navigate]);

  // Manual save
  const handleSave = useCallback(async () => {
    if (state.parseError) {
      vaniToast.error('Fix JSON errors before saving');
      return;
    }
    try {
      const schema = JSON.parse(state.schemaText);
      dispatch({ type: 'SET_IS_SAVING', payload: true });

      if (isNew) {
        const payload: CreateTemplatePayload = {
          name: schema.title || 'Untitled Form',
          description: templateDescription,
          category: 'general',
          form_type: 'standalone',
          schema,
        };
        const result = await mutations.createTemplate(payload);
        if (result) {
          dispatch({ type: 'MARK_SAVED', payload: new Date().toISOString() });
          vaniToast.success('Template created!');
          navigate(`/admin/smart-forms/editor/${result.id}`, { replace: true });
        } else {
          dispatch({ type: 'SET_IS_SAVING', payload: false });
          vaniToast.error(mutations.error || 'Failed to create template');
        }
      } else {
        const payload: UpdateTemplatePayload = { schema, description: templateDescription };
        const result = await mutations.updateTemplate(state.templateId!, payload);
        if (result) {
          dispatch({ type: 'MARK_SAVED', payload: new Date().toISOString() });
          vaniToast.success('Schema saved');
        } else {
          dispatch({ type: 'SET_IS_SAVING', payload: false });
          vaniToast.error(mutations.error || 'Failed to save');
        }
      }
    } catch {
      dispatch({ type: 'SET_IS_SAVING', payload: false });
      vaniToast.error('Invalid JSON — cannot save');
    }
  }, [state.schemaText, state.parseError, state.templateId, isNew, mutations, dispatch, navigate, templateDescription]);

  // Validate
  const handleValidate = useCallback(async () => {
    if (state.parseError) {
      vaniToast.error('Fix JSON errors first');
      return;
    }
    try {
      dispatch({ type: 'SET_IS_VALIDATING', payload: true });
      const schema = JSON.parse(state.schemaText);
      const result = await mutations.validateSchema(schema);
      if (result) {
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: result.errors || [] });
        if (result.valid) {
          vaniToast.success('Schema is valid!');
        } else {
          vaniToast.warning(`${result.errors.length} validation issue${result.errors.length !== 1 ? 's' : ''} found`);
        }
      }
    } catch {
      dispatch({ type: 'SET_IS_VALIDATING', payload: false });
      vaniToast.error('Validation request failed');
    }
  }, [state.schemaText, state.parseError, mutations, dispatch]);

  // Submit for review
  const handleSubmitReview = useCallback(async () => {
    if (state.isDirty) {
      vaniToast.warning('Save changes before submitting for review');
      return;
    }
    const result = await mutations.submitForReview(state.templateId!);
    if (result) {
      vaniToast.success('Submitted for review');
      navigate('/admin/smart-forms');
    } else {
      vaniToast.error(mutations.error || 'Failed to submit');
    }
  }, [state.isDirty, state.templateId, mutations, navigate]);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!active?.data?.current || active.data.current.type !== 'palette-field') return;
    if (!state.schema || !state.schema.sections.length) return;

    const sectionIndex = state.schema.sections.length - 1;
    const fieldDef = active.data.current.fieldDef;
    const fieldCount = state.schema.sections.reduce((sum: number, s: any) => sum + s.fields.length, 0);
    const field = generateFieldSnippet(fieldDef, fieldCount);
    insertField(sectionIndex, field as FormSchemaField);
    vaniToast.info(`Added ${fieldDef.label}`);
  }, [state.schema, insertField]);

  // Resizable divider
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDivider.current = true;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingDivider.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const paletteWidth = paletteCollapsed ? 40 : 200;
      const availableWidth = rect.width - paletteWidth;
      const offsetX = ev.clientX - rect.left - paletteWidth;
      const pct = Math.max(25, Math.min(75, (offsetX / availableWidth) * 100));
      setDividerPos(pct);
    };

    const handleMouseUp = () => {
      isDraggingDivider.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [paletteCollapsed]);

  // Admin gate
  if (!currentTenant?.is_admin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: colors.utility.primaryText }}>
        Admin access required.
      </div>
    );
  }

  // Loading state
  if (!isNew && templateLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <VaNiLoader size="md" message="Loading template..." />
      </div>
    );
  }

  // Error state
  if (!isNew && templateError) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: colors.semantic.error + '10',
          color: colors.semantic.error,
          fontSize: '0.875rem',
          border: `1px solid ${colors.semantic.error}20`,
        }}>
          {templateError}
        </div>
        <button
          onClick={() => navigate('/admin/smart-forms')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: `1px solid ${colors.utility.secondaryText}30`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
          }}
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: colors.utility.primaryBackground }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
          borderBottom: `1px solid ${colors.utility.secondaryText}20`,
          backgroundColor: colors.utility.secondaryBackground,
        }}>
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: colors.utility.secondaryText,
              padding: '0.25rem',
            }}
            title="Back to list"
          >
            {'\u2190'}
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: colors.utility.primaryText,
            }}>
              {isNew ? 'New Form Template' : state.templateName}
            </h1>
            <span style={{ fontSize: '0.6875rem', color: colors.utility.secondaryText }}>
              {isNew ? 'Draft' : `${state.templateStatus} ${state.templateId ? `\u2022 ${state.templateId.slice(0, 8)}...` : ''}`}
            </span>
          </div>
          {/* Description field */}
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => {
                setTemplateDescription(e.target.value);
                dispatch({ type: 'SET_IS_DIRTY', payload: true });
              }}
              placeholder="Template description (searchable)..."
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${colors.utility.secondaryText}20`,
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '0.8125rem',
              }}
            />
          </div>
        </div>

        {/* Toolbar */}
        <SchemaToolbar
          onSave={handleSave}
          onValidate={handleValidate}
          onSubmitReview={!isNew ? handleSubmitReview : undefined}
          isNew={isNew}
        />

        {/* 3-panel editor */}
        <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Field Palette */}
          <FieldPalette
            collapsed={paletteCollapsed}
            onToggle={() => setPaletteCollapsed(!paletteCollapsed)}
          />

          {/* Monaco Editor */}
          <div style={{
            width: `${dividerPos}%`,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: `1px solid ${colors.utility.secondaryText}20`,
              backgroundColor: colors.utility.secondaryBackground,
            }}>
              JSON Schema Editor
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <MonacoSchemaEditor />
            </div>
          </div>

          {/* Resizable divider */}
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: '6px',
              cursor: 'col-resize',
              backgroundColor: colors.utility.secondaryText + '20',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '32px',
              borderRadius: '1px',
              backgroundColor: colors.utility.secondaryText,
              opacity: 0.4,
            }} />
          </div>

          {/* Live Preview */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: `1px solid ${colors.utility.secondaryText}20`,
              backgroundColor: colors.utility.secondaryBackground,
            }}>
              Live Preview
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <LiveFormPreview />
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragId ? (
          <div style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 500,
            boxShadow: `0 4px 12px ${colors.brand.primary}40`,
            whiteSpace: 'nowrap',
          }}>
            {FIELD_TYPE_REGISTRY.find(f => `palette-${f.type}` === activeDragId)?.label || 'Field'}
          </div>
        ) : null}
      </DragOverlay>

      {/* Leave confirmation dialog */}
      <ConfirmationDialog
        isOpen={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        onConfirm={handleConfirmLeave}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        type="warning"
      />
    </DndContext>
  );
};

// ---- Wrapped with provider ----

const FormEditorPage: React.FC = () => {
  return (
    <FormEditorProvider>
      <FormEditorInner />
    </FormEditorProvider>
  );
};

export default FormEditorPage;

// src/pages/admin/smart-forms/components/FieldPalette.tsx
// Sidebar palette — drag field types into the form, or click to insert
// Uses @dnd-kit for draggable items

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useFormEditorContext } from '../context/FormEditorContext';
import {
  FIELD_TYPE_REGISTRY,
  FIELD_CATEGORIES,
  generateFieldSnippet,
  generateSectionSnippet,
  type FieldTypeDefinition,
} from '../utils/fieldTypeRegistry';

interface FieldPaletteProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const FieldPalette: React.FC<FieldPaletteProps> = ({ collapsed = false, onToggle }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { state, insertField, insertSection } = useFormEditorContext();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('input');

  // Click-to-insert: adds field to the last section
  const handleInsertField = (fieldDef: FieldTypeDefinition) => {
    if (!state.schema || !state.schema.sections.length) return;
    const sectionIndex = state.schema.sections.length - 1;
    const fieldCount = state.schema.sections.reduce((sum, s) => sum + s.fields.length, 0);
    const field = generateFieldSnippet(fieldDef, fieldCount);
    insertField(sectionIndex, field as any);
  };

  const handleAddSection = () => {
    const sectionCount = state.schema?.sections.length || 0;
    const section = generateSectionSnippet(sectionCount);
    insertSection(section as any);
  };

  if (collapsed) {
    return (
      <div style={{
        width: '40px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRight: `1px solid ${colors.utility.borderLight}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '0.75rem',
      }}>
        <button
          onClick={onToggle}
          title="Expand palette"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: colors.utility.textSecondary,
            padding: '0.25rem',
          }}
        >
          {'\u00BB'}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '200px',
      flexShrink: 0,
      backgroundColor: colors.utility.secondaryBackground,
      borderRight: `1px solid ${colors.utility.borderLight}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem',
        borderBottom: `1px solid ${colors.utility.borderLight}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.utility.textPrimary }}>
          Field Palette
        </span>
        <button
          onClick={onToggle}
          title="Collapse palette"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: colors.utility.textSecondary,
            padding: '0.125rem 0.25rem',
          }}
        >
          {'\u00AB'}
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
        {/* Add Section button */}
        <button
          onClick={handleAddSection}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '0.75rem',
            borderRadius: '6px',
            border: `1px dashed ${colors.utility.borderLight}`,
            backgroundColor: 'transparent',
            color: colors.utility.textSecondary,
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          + Add Section
        </button>

        {/* Field categories */}
        {FIELD_CATEGORIES.map(cat => {
          const fieldsInCat = FIELD_TYPE_REGISTRY.filter(f => f.category === cat.key);
          const isExpanded = expandedCategory === cat.key;

          return (
            <div key={cat.key} style={{ marginBottom: '0.5rem' }}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: colors.utility.textSecondary,
                  cursor: 'pointer',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <span style={{ fontSize: '0.625rem', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                  {'\u25B6'}
                </span>
                {cat.label}
              </button>

              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {fieldsInCat.map(fieldDef => (
                    <DraggableFieldItem
                      key={fieldDef.type}
                      fieldDef={fieldDef}
                      colors={colors}
                      onClick={() => handleInsertField(fieldDef)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- Draggable Field Item ----

interface DraggableFieldItemProps {
  fieldDef: FieldTypeDefinition;
  colors: any;
  onClick: () => void;
}

const DraggableFieldItem: React.FC<DraggableFieldItemProps> = ({ fieldDef, colors, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${fieldDef.type}`,
    data: { type: 'palette-field', fieldDef },
  });

  const style: React.CSSProperties = {
    padding: '0.375rem 0.5rem',
    borderRadius: '6px',
    border: `1px solid ${colors.utility.borderLight}`,
    backgroundColor: isDragging ? colors.utility.primaryBackground : 'transparent',
    cursor: isDragging ? 'grabbing' : 'grab',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.utility.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : 'background-color 0.15s',
    userSelect: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onDoubleClick={onClick}>
      <span style={{ width: '1.25rem', textAlign: 'center', fontSize: '0.8125rem', flexShrink: 0 }}>
        {fieldDef.icon}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {fieldDef.label}
      </span>
    </div>
  );
};

export default FieldPalette;

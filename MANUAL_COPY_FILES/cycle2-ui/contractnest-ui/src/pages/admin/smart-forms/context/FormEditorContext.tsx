// src/pages/admin/smart-forms/context/FormEditorContext.tsx
// State management for the form editor — schema, dirty tracking, validation errors

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';

// ---- Types ----

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  sections: FormSchemaSection[];
  [key: string]: unknown;
}

export interface FormSchemaSection {
  id: string;
  title: string;
  description?: string;
  fields: FormSchemaField[];
  [key: string]: unknown;
}

export interface FormSchemaField {
  id: string;
  type: string;
  label: string;
  [key: string]: unknown;
}

interface EditorState {
  schema: FormSchema | null;
  schemaText: string;             // Raw JSON string in Monaco
  isDirty: boolean;
  isSaving: boolean;
  isValidating: boolean;
  validationErrors: string[];
  parseError: string | null;      // JSON parse error from Monaco
  lastSavedAt: string | null;
  templateId: string | null;      // null = new template
  templateName: string;
  templateStatus: string;
}

type EditorAction =
  | { type: 'SET_SCHEMA_TEXT'; payload: string }
  | { type: 'SET_SCHEMA'; payload: FormSchema }
  | { type: 'SET_PARSE_ERROR'; payload: string | null }
  | { type: 'SET_VALIDATION_ERRORS'; payload: string[] }
  | { type: 'SET_IS_VALIDATING'; payload: boolean }
  | { type: 'SET_IS_SAVING'; payload: boolean }
  | { type: 'MARK_SAVED'; payload: string }
  | { type: 'MARK_CLEAN' }
  | { type: 'INIT_TEMPLATE'; payload: { id: string | null; name: string; status: string; schema: Record<string, unknown> } }
  | { type: 'INSERT_FIELD'; payload: { sectionIndex: number; field: FormSchemaField } }
  | { type: 'INSERT_SECTION'; payload: { section: FormSchemaSection } }
  | { type: 'REORDER_FIELDS'; payload: { sectionIndex: number; fromIndex: number; toIndex: number } }
  | { type: 'REORDER_SECTIONS'; payload: { fromIndex: number; toIndex: number } };

// ---- Helpers ----

function schemaToText(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2);
}

function textToSchema(text: string): { schema: FormSchema | null; error: string | null } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return { schema: null, error: 'Schema must be a JSON object' };
    return { schema: parsed as FormSchema, error: null };
  } catch (e: any) {
    return { schema: null, error: e.message || 'Invalid JSON' };
  }
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

// ---- Reducer ----

const initialState: EditorState = {
  schema: null,
  schemaText: '',
  isDirty: false,
  isSaving: false,
  isValidating: false,
  validationErrors: [],
  parseError: null,
  lastSavedAt: null,
  templateId: null,
  templateName: '',
  templateStatus: 'draft',
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_SCHEMA_TEXT': {
      const { schema, error } = textToSchema(action.payload);
      return {
        ...state,
        schemaText: action.payload,
        schema: schema ?? state.schema,
        parseError: error,
        isDirty: true,
      };
    }
    case 'SET_SCHEMA': {
      const text = schemaToText(action.payload);
      return {
        ...state,
        schema: action.payload,
        schemaText: text,
        parseError: null,
        isDirty: true,
      };
    }
    case 'SET_PARSE_ERROR':
      return { ...state, parseError: action.payload };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload, isValidating: false };
    case 'SET_IS_VALIDATING':
      return { ...state, isValidating: action.payload };
    case 'SET_IS_SAVING':
      return { ...state, isSaving: action.payload };
    case 'MARK_SAVED':
      return { ...state, isDirty: false, isSaving: false, lastSavedAt: action.payload };
    case 'MARK_CLEAN':
      return { ...state, isDirty: false };
    case 'INIT_TEMPLATE': {
      const schema = action.payload.schema as FormSchema;
      const text = schemaToText(schema);
      return {
        ...state,
        templateId: action.payload.id,
        templateName: action.payload.name,
        templateStatus: action.payload.status,
        schema,
        schemaText: text,
        parseError: null,
        isDirty: false,
        validationErrors: [],
      };
    }
    case 'INSERT_FIELD': {
      if (!state.schema) return state;
      const sections = [...state.schema.sections];
      const section = { ...sections[action.payload.sectionIndex] };
      section.fields = [...section.fields, action.payload.field];
      sections[action.payload.sectionIndex] = section;
      const newSchema = { ...state.schema, sections };
      return {
        ...state,
        schema: newSchema,
        schemaText: schemaToText(newSchema),
        parseError: null,
        isDirty: true,
      };
    }
    case 'INSERT_SECTION': {
      if (!state.schema) return state;
      const newSchema = {
        ...state.schema,
        sections: [...state.schema.sections, action.payload.section],
      };
      return {
        ...state,
        schema: newSchema,
        schemaText: schemaToText(newSchema),
        parseError: null,
        isDirty: true,
      };
    }
    case 'REORDER_FIELDS': {
      if (!state.schema) return state;
      const sections = [...state.schema.sections];
      const sec = { ...sections[action.payload.sectionIndex] };
      sec.fields = arrayMove(sec.fields, action.payload.fromIndex, action.payload.toIndex);
      sections[action.payload.sectionIndex] = sec;
      const newSchema = { ...state.schema, sections };
      return {
        ...state,
        schema: newSchema,
        schemaText: schemaToText(newSchema),
        parseError: null,
        isDirty: true,
      };
    }
    case 'REORDER_SECTIONS': {
      if (!state.schema) return state;
      const newSchema = {
        ...state.schema,
        sections: arrayMove(state.schema.sections, action.payload.fromIndex, action.payload.toIndex),
      };
      return {
        ...state,
        schema: newSchema,
        schemaText: schemaToText(newSchema),
        parseError: null,
        isDirty: true,
      };
    }
    default:
      return state;
  }
}

// ---- Context ----

interface FormEditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  setSchemaText: (text: string) => void;
  setSchema: (schema: FormSchema) => void;
  insertField: (sectionIndex: number, field: FormSchemaField) => void;
  insertSection: (section: FormSchemaSection) => void;
  reorderFields: (sectionIndex: number, fromIndex: number, toIndex: number) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  initTemplate: (id: string | null, name: string, status: string, schema: Record<string, unknown>) => void;
  undoStack: React.MutableRefObject<string[]>;
  redoStack: React.MutableRefObject<string[]>;
  undo: () => void;
  redo: () => void;
}

const FormEditorContext = createContext<FormEditorContextValue | null>(null);

// ---- Provider ----

export const FormEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isUndoRedoing = useRef(false);

  const setSchemaText = useCallback((text: string) => {
    if (!isUndoRedoing.current) {
      undoStack.current.push(state.schemaText);
      if (undoStack.current.length > 50) undoStack.current.shift();
      redoStack.current = [];
    }
    dispatch({ type: 'SET_SCHEMA_TEXT', payload: text });
  }, [state.schemaText]);

  const setSchema = useCallback((schema: FormSchema) => {
    undoStack.current.push(state.schemaText);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    dispatch({ type: 'SET_SCHEMA', payload: schema });
  }, [state.schemaText]);

  const insertField = useCallback((sectionIndex: number, field: FormSchemaField) => {
    undoStack.current.push(state.schemaText);
    redoStack.current = [];
    dispatch({ type: 'INSERT_FIELD', payload: { sectionIndex, field } });
  }, [state.schemaText]);

  const insertSection = useCallback((section: FormSchemaSection) => {
    undoStack.current.push(state.schemaText);
    redoStack.current = [];
    dispatch({ type: 'INSERT_SECTION', payload: { section } });
  }, [state.schemaText]);

  const reorderFields = useCallback((sectionIndex: number, fromIndex: number, toIndex: number) => {
    undoStack.current.push(state.schemaText);
    redoStack.current = [];
    dispatch({ type: 'REORDER_FIELDS', payload: { sectionIndex, fromIndex, toIndex } });
  }, [state.schemaText]);

  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    undoStack.current.push(state.schemaText);
    redoStack.current = [];
    dispatch({ type: 'REORDER_SECTIONS', payload: { fromIndex, toIndex } });
  }, [state.schemaText]);

  const initTemplate = useCallback((id: string | null, name: string, status: string, schema: Record<string, unknown>) => {
    undoStack.current = [];
    redoStack.current = [];
    dispatch({ type: 'INIT_TEMPLATE', payload: { id, name, status, schema } });
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(state.schemaText);
    isUndoRedoing.current = true;
    dispatch({ type: 'SET_SCHEMA_TEXT', payload: prev });
    isUndoRedoing.current = false;
  }, [state.schemaText]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(state.schemaText);
    isUndoRedoing.current = true;
    dispatch({ type: 'SET_SCHEMA_TEXT', payload: next });
    isUndoRedoing.current = false;
  }, [state.schemaText]);

  return (
    <FormEditorContext.Provider
      value={{
        state,
        dispatch,
        setSchemaText,
        setSchema,
        insertField,
        insertSection,
        reorderFields,
        reorderSections,
        initTemplate,
        undoStack,
        redoStack,
        undo,
        redo,
      }}
    >
      {children}
    </FormEditorContext.Provider>
  );
};

// ---- Hook ----

export function useFormEditorContext(): FormEditorContextValue {
  const ctx = useContext(FormEditorContext);
  if (!ctx) throw new Error('useFormEditorContext must be used within FormEditorProvider');
  return ctx;
}

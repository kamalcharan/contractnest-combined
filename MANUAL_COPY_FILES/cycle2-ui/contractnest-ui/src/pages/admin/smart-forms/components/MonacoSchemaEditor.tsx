// src/pages/admin/smart-forms/components/MonacoSchemaEditor.tsx
// Monaco JSON editor wrapper — real-time editing, format, error markers

import React, { useRef, useCallback } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useFormEditorContext } from '../context/FormEditorContext';

interface MonacoSchemaEditorProps {
  height?: string;
}

const MonacoSchemaEditor: React.FC<MonacoSchemaEditorProps> = ({ height = '100%' }) => {
  const { isDarkMode } = useTheme();
  const { state, setSchemaText } = useFormEditorContext();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // Ctrl+Shift+F to format
    editor.addAction({
      id: 'format-json',
      label: 'Format JSON',
      keybindings: [
        // Monaco KeyMod.CtrlCmd | Monaco KeyMod.Shift | Monaco KeyCode.KeyF
        2048 | 1024 | 36,
      ],
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run();
      },
    });
  }, []);

  const handleChange: OnChange = useCallback((value) => {
    if (value !== undefined) {
      setSchemaText(value);
    }
  }, [setSchemaText]);

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <Editor
        height="100%"
        language="json"
        theme={isDarkMode ? 'vs-dark' : 'vs'}
        value={state.schemaText}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          formatOnPaste: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          renderLineHighlight: 'line',
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </div>
  );
};

// Expose a way to get editor ref for formatting from toolbar
export function useMonacoEditorRef() {
  return useRef<editor.IStandaloneCodeEditor | null>(null);
}

export default MonacoSchemaEditor;

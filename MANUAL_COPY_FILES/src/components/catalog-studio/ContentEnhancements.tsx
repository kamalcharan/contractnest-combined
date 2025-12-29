// src/components/catalog-studio/ContentEnhancements.tsx
// Content Enhancement Components for Catalog Studio Template Builder
// Cycle 6: Rich Text Editor, Media Upload/Preview, Checklist Builder

import React, { useState, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Quote,
  Code,
  Undo,
  Redo,
  Image as ImageIcon,
  Video,
  Upload,
  X,
  Trash2,
  Plus,
  GripVertical,
  Check,
  Circle,
  CheckCircle2,
  Camera,
  FileText,
  ChevronDown,
  Palette,
  Type,
  MoreHorizontal,
  Eye,
  EyeOff,
  Copy,
  Settings,
  AlertCircle,
  Loader2,
  PlayCircle,
  ZoomIn,
  Download,
  Maximize2
} from 'lucide-react';

// ============================================
// RICH TEXT EDITOR COMPONENT
// ============================================

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  colors: Record<string, any>;
  isDarkMode: boolean;
  readOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter content...',
  minHeight = 150,
  maxHeight = 400,
  colors,
  isDarkMode,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Toolbar actions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    // Trigger onChange with current content
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
    { type: 'divider' },
    { icon: Heading1, command: 'formatBlock', value: 'h1', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: 'h2', title: 'Heading 2' },
    { type: 'divider' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { type: 'divider' },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    { type: 'divider' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block' },
    { icon: Link, command: 'link', title: 'Insert Link' },
  ];

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: colors.utility.secondaryText + '40',
      }}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div
          className="flex items-center gap-1 px-2 py-1.5 border-b flex-wrap"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          {toolbarButtons.map((btn, index) => {
            if (btn.type === 'divider') {
              return (
                <div
                  key={index}
                  className="w-px h-5 mx-1"
                  style={{ backgroundColor: colors.utility.secondaryText + '30' }}
                />
              );
            }

            const Icon = btn.icon!;

            if (btn.command === 'link') {
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                    title={btn.title}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  {showLinkInput && (
                    <div
                      className="absolute left-0 top-full mt-1 p-2 rounded-lg border shadow-lg z-10 flex gap-2"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: colors.utility.secondaryText + '20',
                      }}
                    >
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="px-2 py-1 text-sm border rounded w-48"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: colors.utility.secondaryText + '40',
                          color: colors.utility.primaryText,
                        }}
                      />
                      <button
                        onClick={insertLink}
                        className="px-2 py-1 text-xs rounded"
                        style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={index}
                onClick={() => execCommand(btn.command!, btn.value)}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                style={{ color: colors.utility.secondaryText }}
                title={btn.title}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={() => execCommand('undo')}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            style={{ color: colors.utility.secondaryText }}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => execCommand('redo')}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            style={{ color: colors.utility.secondaryText }}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        className="px-4 py-3 focus:outline-none prose prose-sm max-w-none"
        style={{
          minHeight,
          maxHeight,
          overflowY: 'auto',
          color: colors.utility.primaryText,
        }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: ${colors.utility.secondaryText};
          pointer-events: none;
        }
        [contenteditable] a {
          color: ${colors.brand.primary};
          text-decoration: underline;
        }
        [contenteditable] blockquote {
          border-left: 3px solid ${colors.brand.primary};
          padding-left: 1rem;
          margin-left: 0;
          color: ${colors.utility.secondaryText};
        }
        [contenteditable] pre {
          background-color: ${isDarkMode ? '#1F2937' : '#F3F4F6'};
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-family: monospace;
          font-size: 0.875rem;
        }
        [contenteditable] h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.5rem 0;
        }
        [contenteditable] h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin-left: 1.5rem;
        }
      `}</style>
    </div>
  );
};

// ============================================
// MEDIA UPLOAD COMPONENT
// ============================================

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  size: number;
  thumbnail?: string;
}

interface MediaUploadProps {
  files: MediaFile[];
  onFilesChange: (files: MediaFile[]) => void;
  mediaType: 'image' | 'video' | 'both';
  maxFiles?: number;
  maxSizeMB?: number;
  colors: Record<string, any>;
  isDarkMode: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  files,
  onFilesChange,
  mediaType,
  maxFiles = 5,
  maxSizeMB = 10,
  colors,
  isDarkMode,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptTypes = useMemo(() => {
    switch (mediaType) {
      case 'image':
        return 'image/jpeg,image/png,image/gif,image/webp';
      case 'video':
        return 'video/mp4,video/webm,video/ogg';
      case 'both':
        return 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg';
      default:
        return '*';
    }
  }, [mediaType]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [files, maxFiles]
  );

  const handleFiles = async (newFiles: File[]) => {
    if (files.length >= maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles = newFiles.filter((file) => {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        alert(`File ${file.name} exceeds ${maxSizeMB}MB limit`);
        return false;
      }
      return true;
    });

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    // Process files
    const processedFiles: MediaFile[] = await Promise.all(
      validFiles.slice(0, maxFiles - files.length).map(async (file) => {
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');

        return {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          url,
          size: file.size,
          thumbnail: isVideo ? undefined : url,
        } as MediaFile;
      })
    );

    clearInterval(interval);
    setUploadProgress(100);

    setTimeout(() => {
      onFilesChange([...files, ...processedFiles]);
      setIsUploading(false);
      setUploadProgress(0);
    }, 300);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging ? 'scale-[1.02]' : ''}
        `}
        style={{
          borderColor: isDragging ? colors.brand.primary : colors.utility.secondaryText + '40',
          backgroundColor: isDragging
            ? `${colors.brand.primary}10`
            : isDarkMode
            ? colors.utility.secondaryBackground
            : '#FAFAFA',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple={maxFiles > 1}
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin" style={{ color: colors.brand.primary }} />
            <div className="w-48 mx-auto">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    backgroundColor: colors.brand.primary,
                  }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
                Uploading... {uploadProgress}%
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${colors.brand.primary}15` }}
            >
              <Upload className="w-7 h-7" style={{ color: colors.brand.primary }} />
            </div>
            <h4 className="font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
              {isDragging ? 'Drop files here' : 'Drag and drop or click to upload'}
            </h4>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {mediaType === 'image' && 'PNG, JPG, GIF, WebP'}
              {mediaType === 'video' && 'MP4, WebM, OGG'}
              {mediaType === 'both' && 'Images or Videos'}
              {' '} up to {maxSizeMB}MB
            </p>
            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
              {files.length}/{maxFiles} files uploaded
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group rounded-lg border overflow-hidden"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.secondaryText + '20',
              }}
            >
              {/* Preview */}
              <div className="aspect-video relative bg-black/5">
                {file.type === 'image' ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-10 h-10" style={{ color: colors.utility.secondaryText }} />
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 rounded-full bg-white/20 hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Type Badge */}
                <div
                  className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: file.type === 'video' ? colors.semantic.info : colors.semantic.success,
                    color: '#FFFFFF',
                  }}
                >
                  {file.type.toUpperCase()}
                </div>
              </div>

              {/* File Info */}
              <div className="p-2">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: colors.utility.primaryText }}
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => setPreviewFile(null)}
          />
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {previewFile.type === 'image' ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={previewFile.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for useMemo
const useMemo = React.useMemo;

// ============================================
// CHECKLIST BUILDER COMPONENT
// ============================================

interface ChecklistItem {
  id: string;
  text: string;
  isRequired: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  order: number;
}

interface ChecklistBuilderProps {
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
  maxItems?: number;
}

export const ChecklistBuilder: React.FC<ChecklistBuilderProps> = ({
  items,
  onItemsChange,
  colors,
  isDarkMode,
  maxItems = 20,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const addItem = () => {
    if (!newItemText.trim() || items.length >= maxItems) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      isRequired: false,
      requiresPhoto: false,
      requiresNotes: false,
      order: items.length,
    };

    onItemsChange([...items, newItem]);
    setNewItemText('');
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      updateItem(editingId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = items.findIndex((i) => i.id === draggedId);
    const targetIndex = items.findIndex((i) => i.id === targetId);

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // Update order values
    const reordered = newItems.map((item, index) => ({ ...item, order: index }));
    onItemsChange(reordered);

    setDraggedId(null);
    setDragOverId(null);
  };

  const duplicateItem = (item: ChecklistItem) => {
    if (items.length >= maxItems) return;

    const newItem: ChecklistItem = {
      ...item,
      id: `item-${Date.now()}`,
      text: `${item.text} (copy)`,
      order: items.length,
    };

    onItemsChange([...items, newItem]);
  };

  return (
    <div className="space-y-4">
      {/* Add New Item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add checklist item..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: colors.utility.secondaryText + '40',
            color: colors.utility.primaryText,
          }}
        />
        <button
          onClick={addItem}
          disabled={!newItemText.trim() || items.length >= maxItems}
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Items Counter */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {items.length} of {maxItems} items
        </span>
        {items.length > 0 && (
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Drag to reorder
          </span>
        )}
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {items
          .sort((a, b) => a.order - b.order)
          .map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={() => handleDrop(item.id)}
              className={`
                p-3 rounded-lg border transition-all
                ${draggedId === item.id ? 'opacity-50' : ''}
                ${dragOverId === item.id ? 'ring-2' : ''}
              `}
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor:
                  dragOverId === item.id ? colors.brand.primary : colors.utility.secondaryText + '20',
                boxShadow: dragOverId === item.id ? `0 0 0 2px ${colors.brand.primary}40` : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <GripVertical
                  className="w-4 h-4 mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
                  style={{ color: colors.utility.secondaryText }}
                />

                {/* Order Number */}
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: `${colors.brand.primary}15`,
                    color: colors.brand.primary,
                  }}
                >
                  {index + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: colors.brand.primary,
                          color: colors.utility.primaryText,
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        className="p-1 rounded"
                        style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        className="p-1 rounded"
                        style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                      >
                        <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                      </button>
                    </div>
                  ) : (
                    <p
                      className="text-sm font-medium cursor-pointer"
                      style={{ color: colors.utility.primaryText }}
                      onClick={() => startEditing(item)}
                    >
                      {item.text}
                    </p>
                  )}

                  {/* Item Options */}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(e) => updateItem(item.id, { isRequired: e.target.checked })}
                        className="rounded"
                        style={{ accentColor: colors.brand.primary }}
                      />
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Required
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.requiresPhoto}
                        onChange={(e) => updateItem(item.id, { requiresPhoto: e.target.checked })}
                        className="rounded"
                        style={{ accentColor: colors.brand.primary }}
                      />
                      <span className="text-xs flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                        <Camera className="w-3 h-3" /> Photo
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.requiresNotes}
                        onChange={(e) => updateItem(item.id, { requiresNotes: e.target.checked })}
                        className="rounded"
                        style={{ accentColor: colors.brand.primary }}
                      />
                      <span className="text-xs flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                        <FileText className="w-3 h-3" /> Notes
                      </span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateItem(item)}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    style={{ color: colors.semantic.error }}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div
          className="py-8 text-center border-2 border-dashed rounded-xl"
          style={{ borderColor: colors.utility.secondaryText + '30' }}
        >
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
          <p className="font-medium" style={{ color: colors.utility.primaryText }}>
            No checklist items yet
          </p>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Add items above to build your checklist
          </p>
        </div>
      )}

      {/* Preview */}
      {items.length > 0 && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: colors.utility.secondaryText + '20' }}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Eye className="w-4 h-4" /> Preview
          </h4>
          <div
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
          >
            {items.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3">
                <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                <div className="flex-1">
                  <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                    {item.text}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {item.isRequired && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                      >
                        Required
                      </span>
                    )}
                    {item.requiresPhoto && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                      >
                        <Camera className="w-2.5 h-2.5" /> Photo
                      </span>
                    )}
                    {item.requiresNotes && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        style={{ backgroundColor: `${colors.semantic.warning}15`, color: colors.semantic.warning }}
                      >
                        <FileText className="w-2.5 h-2.5" /> Notes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Export all components
export default {
  RichTextEditor,
  MediaUpload,
  ChecklistBuilder,
};

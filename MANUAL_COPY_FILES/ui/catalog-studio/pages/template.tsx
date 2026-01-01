// src/pages/catalog-studio/template.tsx
// Fully integrated with Catalog Studio API hooks
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Save,
  Eye,
  MoreVertical,
  Settings,
  GripVertical,
  Trash2,
  LayoutTemplate,
  FileText,
  X,
  Info,
  DollarSign,
  Clock,
  Camera,
  FileCheck,
  AlertCircle,
  Package,
  CreditCard,
  Type,
  Video,
  Image,
  CheckSquare,
  Paperclip,
  ToggleLeft,
  ToggleRight,
  Square,
  CheckSquare as CheckedSquare,
  Copy,
  EyeOff,
  Undo2,
  Keyboard,
  Check,
  AlertTriangle,
  Loader2,
  Edit3,
  Upload,
  ListChecks,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block } from '../../types/catalogStudio';
import { BLOCK_CATEGORIES } from '../../utils/catalog-studio';
import { ServiceCatalogTree } from '../../components/catalog-studio';
import { RichTextEditor, MediaUpload, ChecklistBuilder } from '../../components/catalog-studio/ContentEnhancements';

// API Hooks
import { useCatBlocks } from '../../hooks/queries/useCatBlocks';
import { useCatTemplate, TemplateBlock as APITemplateBlock } from '../../hooks/queries/useCatTemplates';
import { useSaveTemplate, CreateTemplateData, UpdateTemplateData } from '../../hooks/mutations/useCatTemplatesMutations';

// Adapters
import {
  catBlocksToBlocks,
  createTemplateBlock as createAPITemplateBlock,
} from '../../utils/catalog-studio/catBlockAdapter';

// Toast notification types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

// Toast Notification Component
const ToastNotification: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ toast, onDismiss, colors, isDarkMode }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return { bg: colors.semantic.success, icon: <Check className="w-4 h-4" /> };
      case 'error':
        return { bg: colors.semantic.error, icon: <AlertCircle className="w-4 h-4" /> };
      case 'warning':
        return { bg: colors.semantic.warning, icon: <AlertTriangle className="w-4 h-4" /> };
      default:
        return { bg: colors.brand.primary, icon: <Info className="w-4 h-4" /> };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-4 duration-300 min-w-[280px]"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        border: `1px solid ${styles.bg}40`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${styles.bg}20`, color: styles.bg }}
      >
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ color: colors.utility.secondaryText }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Confirmation Dialog Component
const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  type?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, onConfirm, title, description, confirmText, type = 'danger', isLoading, colors, isDarkMode }) => {
  if (!isOpen) return null;

  const getButtonStyle = () => {
    switch (type) {
      case 'danger':
        return { background: colors.semantic.error };
      case 'warning':
        return { background: colors.semantic.warning };
      default:
        return { background: colors.brand.primary };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative transform rounded-lg border px-6 py-5 shadow-xl transition-all w-full max-w-md animate-in zoom-in-95 duration-200"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${type === 'danger' ? colors.semantic.error : colors.semantic.warning}15` }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: type === 'danger' ? colors.semantic.error : colors.semantic.warning }} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
                {title}
              </h3>
              <p className="mt-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                {description}
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              style={getButtonStyle()}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Media file interface for upload
interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  size: number;
  thumbnail?: string;
}

// Checklist item interface
interface ChecklistItem {
  id: string;
  text: string;
  isRequired: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  order: number;
}

interface BlockConfig {
  // Service block overrides
  priceOverride?: number;
  durationOverride?: number;
  evidenceRequired?: {
    photo?: boolean;
    signature?: boolean;
    gps?: boolean;
    otp?: boolean;
  };
  // Spare block settings
  quantity?: number;
  warrantyMonths?: number;
  // Billing settings
  paymentTermsDays?: number;
  autoInvoice?: boolean;
  // Text/Document settings
  isRequired?: boolean;
  requireSignature?: boolean;
  richTextContent?: string; // Rich text editor content
  // Media settings
  autoPlay?: boolean;
  showControls?: boolean;
  mediaFiles?: MediaFile[]; // Uploaded media files
  // Checklist settings
  enforceOrder?: boolean;
  requirePhoto?: boolean;
  checklistItems?: ChecklistItem[]; // Checklist items
  // General
  notes?: string;
  isVisible?: boolean;
}

interface TemplateBlock {
  id: string;
  blockId: string;
  block: Block;
  order: number;
  config: BlockConfig;
  isNew?: boolean;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const CatalogStudioTemplatePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();

  // URL params for edit mode
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const isEditMode = searchParams.get('edit') === 'true' && !!templateId;

  // =================================================================
  // API HOOKS - Blocks
  // =================================================================
  const {
    data: blocksResponse,
    isLoading: isLoadingBlocks,
    error: blocksError,
    refetch: refetchBlocks,
    isFetching: isFetchingBlocks,
  } = useCatBlocks();

  // Convert API blocks to UI blocks
  const allBlocks = useMemo(() => {
    if (!blocksResponse?.data?.blocks) return [];
    return catBlocksToBlocks(blocksResponse.data.blocks);
  }, [blocksResponse]);

  // =================================================================
  // API HOOKS - Template (for edit mode)
  // =================================================================
  const {
    data: templateResponse,
    isLoading: isLoadingTemplate,
    error: templateError,
  } = useCatTemplate(isEditMode ? templateId : undefined);

  // =================================================================
  // API HOOKS - Save Template
  // =================================================================
  const saveTemplateMutation = useSaveTemplate();

  // =================================================================
  // LOCAL STATE
  // =================================================================
  const [templateBlocks, setTemplateBlocks] = useState<TemplateBlock[]>([]);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplateBlock, setSelectedTemplateBlock] = useState<string | null>(null);
  const [previewBlock, setPreviewBlock] = useState<Block | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag-drop state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // Multi-select state
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirmation dialogs state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; blockId: string | null }>({ isOpen: false, blockId: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Undo history
  const [history, setHistory] = useState<TemplateBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;

  // =================================================================
  // LOAD TEMPLATE DATA IN EDIT MODE
  // =================================================================
  useEffect(() => {
    if (templateResponse?.data && isEditMode && allBlocks.length > 0) {
      const template = templateResponse.data;
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');

      // Convert API blocks to UI format
      if (template.blocks && Array.isArray(template.blocks)) {
        const uiBlocks: TemplateBlock[] = [];

        template.blocks.forEach((apiBlock: APITemplateBlock, index: number) => {
          const block = allBlocks.find(b => b.id === apiBlock.block_id);
          if (block) {
            uiBlocks.push({
              id: `tb-${apiBlock.block_id}-${index}`,
              blockId: apiBlock.block_id,
              block,
              order: apiBlock.order ?? index,
              config: {
                isVisible: apiBlock.config?.visible !== false,
                priceOverride: apiBlock.config?.price,
                durationOverride: apiBlock.config?.duration,
                notes: apiBlock.config?.notes,
                ...apiBlock.config,
              },
            });
          }
        });

        // Sort by order
        uiBlocks.sort((a, b) => a.order - b.order);
        setTemplateBlocks(uiBlocks);
        setHasUnsavedChanges(false);
      }
    }
  }, [templateResponse, isEditMode, allBlocks]);

  // Toast helper
  const showToast = useCallback((type: Toast['type'], title: string, description?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // History management
  const saveToHistory = useCallback((blocks: TemplateBlock[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(blocks)));
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
    setHasUnsavedChanges(true);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTemplateBlocks(JSON.parse(JSON.stringify(history[newIndex])));
      showToast('info', 'Undone', 'Previous action was reverted');
    }
  }, [historyIndex, history, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Cmd/Ctrl + Z - Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Delete/Backspace - Delete selected block(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedBlockIds.size > 0) {
          setBulkDeleteConfirm(true);
        } else if (selectedTemplateBlock) {
          setDeleteConfirm({ isOpen: true, blockId: selectedTemplateBlock });
        }
        return;
      }

      // Cmd/Ctrl + D - Duplicate selected
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedBlockIds.size > 0) {
          duplicateSelectedBlocks();
        } else if (selectedTemplateBlock) {
          const block = templateBlocks.find((tb) => tb.id === selectedTemplateBlock);
          if (block) {
            const newBlock: TemplateBlock = {
              ...block,
              id: `tb-${Date.now()}`,
              order: templateBlocks.length,
              isNew: true,
            };
            const newBlocks = [...templateBlocks, newBlock];
            saveToHistory(templateBlocks);
            setTemplateBlocks(newBlocks);
            showToast('success', 'Block duplicated', block.block.name);
            setTimeout(() => {
              setTemplateBlocks((prev) =>
                prev.map((tb) => (tb.id === newBlock.id ? { ...tb, isNew: false } : tb))
              );
            }, 1000);
          }
        }
        return;
      }

      // Cmd/Ctrl + S - Save template
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveTemplate();
        return;
      }

      // Escape - Clear selection / Close preview
      if (e.key === 'Escape') {
        if (isPreviewMode) {
          setIsPreviewMode(false);
        } else if (selectedBlockIds.size > 0) {
          clearSelection();
        } else if (selectedTemplateBlock) {
          setSelectedTemplateBlock(null);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, selectedBlockIds, selectedTemplateBlock, templateBlocks, isPreviewMode, saveToHistory, showToast]);

  // Get default config based on block category
  const getDefaultConfig = (block: Block): BlockConfig => {
    const baseConfig: BlockConfig = { isVisible: true };

    switch (block.categoryId) {
      case 'service':
        return {
          ...baseConfig,
          priceOverride: block.price,
          durationOverride: block.duration,
          evidenceRequired: { photo: true, signature: false, gps: false, otp: false },
        };
      case 'spare':
        return { ...baseConfig, quantity: 1, warrantyMonths: 6 };
      case 'billing':
        return { ...baseConfig, paymentTermsDays: 30, autoInvoice: true };
      case 'text':
        return { ...baseConfig, isRequired: true, requireSignature: false };
      case 'video':
        return { ...baseConfig, autoPlay: false, showControls: true };
      case 'image':
        return { ...baseConfig, showControls: true };
      case 'checklist':
        return { ...baseConfig, enforceOrder: false, requirePhoto: false };
      case 'document':
        return { ...baseConfig, isRequired: false };
      default:
        return baseConfig;
    }
  };

  // Handle double-click add from tree
  const handleBlockAdd = (block: Block) => {
    const newTemplateBlock: TemplateBlock = {
      id: `tb-${Date.now()}`,
      blockId: block.id,
      block,
      order: templateBlocks.length,
      config: getDefaultConfig(block),
      isNew: true,
    };
    saveToHistory(templateBlocks);
    setTemplateBlocks([...templateBlocks, newTemplateBlock]);
    showToast('success', 'Block added', block.name);

    // Remove the "new" flag after animation
    setTimeout(() => {
      setTemplateBlocks((prev) =>
        prev.map((tb) => (tb.id === newTemplateBlock.id ? { ...tb, isNew: false } : tb))
      );
    }, 1000);
  };

  // =================================================================
  // SAVE TEMPLATE - API INTEGRATION
  // =================================================================
  const handleSaveTemplate = async () => {
    if (templateBlocks.length === 0) {
      showToast('warning', 'Cannot save empty template', 'Add at least one block');
      return;
    }

    if (!templateName.trim()) {
      showToast('warning', 'Template name required', 'Please enter a name for the template');
      return;
    }

    try {
      // Convert UI blocks to API format
      const apiBlocks: APITemplateBlock[] = templateBlocks.map((tb, index) => ({
        block_id: tb.blockId,
        order: index,
        config: {
          visible: tb.config.isVisible !== false,
          price: tb.config.priceOverride,
          duration: tb.config.durationOverride,
          notes: tb.config.notes,
          evidenceRequired: tb.config.evidenceRequired,
          quantity: tb.config.quantity,
          warrantyMonths: tb.config.warrantyMonths,
          paymentTermsDays: tb.config.paymentTermsDays,
          autoInvoice: tb.config.autoInvoice,
          isRequired: tb.config.isRequired,
          requireSignature: tb.config.requireSignature,
          richTextContent: tb.config.richTextContent,
          autoPlay: tb.config.autoPlay,
          showControls: tb.config.showControls,
          mediaFiles: tb.config.mediaFiles,
          enforceOrder: tb.config.enforceOrder,
          requirePhoto: tb.config.requirePhoto,
          checklistItems: tb.config.checklistItems,
        },
      }));

      const saveData: CreateTemplateData | UpdateTemplateData = {
        name: templateName,
        description: templateDescription,
        blocks: apiBlocks,
      };

      await saveTemplateMutation.mutateAsync({
        templateId: isEditMode ? templateId : undefined,
        data: saveData,
      });

      setHasUnsavedChanges(false);
      showToast('success', 'Template saved', `"${templateName}" has been saved successfully`);

      // If creating new, navigate to edit mode with new ID
      if (!isEditMode && saveTemplateMutation.data?.data?.id) {
        navigate(`/catalog-studio/template?templateId=${saveTemplateMutation.data.data.id}&edit=true`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      showToast('error', 'Save failed', 'An error occurred while saving the template');
    }
  };

  // Confirm delete single block
  const confirmDeleteBlock = () => {
    if (deleteConfirm.blockId) {
      const block = templateBlocks.find((tb) => tb.id === deleteConfirm.blockId);
      saveToHistory(templateBlocks);
      setTemplateBlocks(templateBlocks.filter((tb) => tb.id !== deleteConfirm.blockId));
      if (selectedTemplateBlock === deleteConfirm.blockId) {
        setSelectedTemplateBlock(null);
      }
      showToast('success', 'Block removed', block?.block.name || 'Block');
    }
    setDeleteConfirm({ isOpen: false, blockId: null });
  };

  // Confirm bulk delete
  const confirmBulkDelete = () => {
    const count = selectedBlockIds.size;
    saveToHistory(templateBlocks);
    setTemplateBlocks(templateBlocks.filter((tb) => !selectedBlockIds.has(tb.id)));
    if (selectedTemplateBlock && selectedBlockIds.has(selectedTemplateBlock)) {
      setSelectedTemplateBlock(null);
    }
    clearSelection();
    showToast('success', `${count} blocks removed`);
    setBulkDeleteConfirm(false);
  };

  // Update block config
  const updateBlockConfig = (templateBlockId: string, updates: Partial<BlockConfig>) => {
    setTemplateBlocks((prev) =>
      prev.map((tb) =>
        tb.id === templateBlockId ? { ...tb, config: { ...tb.config, ...updates } } : tb
      )
    );
    setHasUnsavedChanges(true);
  };

  // Get selected template block
  const selectedBlock = useMemo(() => {
    return templateBlocks.find((tb) => tb.id === selectedTemplateBlock);
  }, [templateBlocks, selectedTemplateBlock]);

  // Handle single-click preview from tree
  const handleBlockPreview = (block: Block) => {
    setPreviewBlock(block);
  };

  const handleRemoveBlock = (templateBlockId: string) => {
    // Show confirmation dialog
    setDeleteConfirm({ isOpen: true, blockId: templateBlockId });
  };

  // Drag-drop handlers
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (blockId !== draggedBlockId) {
      setDragOverBlockId(blockId);
    }
  };

  const handleDragLeave = () => {
    setDragOverBlockId(null);
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const draggedIndex = templateBlocks.findIndex((tb) => tb.id === draggedBlockId);
    const targetIndex = templateBlocks.findIndex((tb) => tb.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Save to history before reordering
    saveToHistory(templateBlocks);

    // Reorder blocks
    const newBlocks = [...templateBlocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);

    // Update order values
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      order: index,
    }));

    setTemplateBlocks(updatedBlocks);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  // Multi-select handlers
  const toggleBlockSelection = (blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedBlockIds);
    if (newSelection.has(blockId)) {
      newSelection.delete(blockId);
    } else {
      newSelection.add(blockId);
    }
    setSelectedBlockIds(newSelection);
    if (newSelection.size === 0) {
      setIsMultiSelectMode(false);
    } else if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
  };

  const selectAllBlocks = () => {
    setSelectedBlockIds(new Set(templateBlocks.map((tb) => tb.id)));
    setIsMultiSelectMode(true);
  };

  const clearSelection = () => {
    setSelectedBlockIds(new Set());
    setIsMultiSelectMode(false);
  };

  const deleteSelectedBlocks = () => {
    // Show bulk delete confirmation
    setBulkDeleteConfirm(true);
  };

  const duplicateSelectedBlocks = () => {
    const blocksToDuplicate = templateBlocks.filter((tb) => selectedBlockIds.has(tb.id));
    const newBlocks = blocksToDuplicate.map((tb) => ({
      ...tb,
      id: `tb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: templateBlocks.length + blocksToDuplicate.indexOf(tb),
      isNew: true,
    }));
    saveToHistory(templateBlocks);
    setTemplateBlocks([...templateBlocks, ...newBlocks]);
    showToast('success', `${newBlocks.length} blocks duplicated`);
    clearSelection();

    // Remove "new" flag after animation
    setTimeout(() => {
      setTemplateBlocks((prev) =>
        prev.map((tb) => (newBlocks.find((nb) => nb.id === tb.id) ? { ...tb, isNew: false } : tb))
      );
    }, 1000);
  };

  const hideSelectedBlocks = () => {
    saveToHistory(templateBlocks);
    setTemplateBlocks(
      templateBlocks.map((tb) =>
        selectedBlockIds.has(tb.id) ? { ...tb, config: { ...tb.config, isVisible: false } } : tb
      )
    );
    showToast('info', `${selectedBlockIds.size} blocks hidden`);
    clearSelection();
  };

  const getBlockCategory = (block: Block) => {
    return BLOCK_CATEGORIES.find((c) => c.id === block.categoryId);
  };

  // =================================================================
  // LOADING STATE
  // =================================================================
  if (isLoadingBlocks || (isEditMode && isLoadingTemplate)) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.utility.secondaryBackground }}
      >
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: colors.brand.primary }} />
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {isEditMode ? 'Loading template...' : 'Loading blocks library...'}
        </p>
      </div>
    );
  }

  // =================================================================
  // ERROR STATE
  // =================================================================
  if (blocksError || templateError) {
    const error = blocksError || templateError;
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.utility.secondaryBackground }}
      >
        <AlertCircle className="w-12 h-12" style={{ color: colors.semantic.error }} />
        <div className="text-center">
          <p className="font-semibold" style={{ color: colors.utility.primaryText }}>
            Failed to load {blocksError ? 'blocks library' : 'template'}
          </p>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            {(error as Error)?.message || 'An unexpected error occurred'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/catalog-studio/templates')}
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </button>
          <button
            onClick={() => {
              if (blocksError) refetchBlocks();
            }}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================
  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.utility.secondaryBackground }}
    >
      {/* Top Bar */}
      <div
        className="border-b px-6 py-4 flex justify-between items-center"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/catalog-studio/templates')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: colors.utility.secondaryText }}
            title="Back to Templates"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-5 h-5" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0"
                style={{ color: colors.utility.primaryText }}
              />
              {hasUnsavedChanges && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${colors.semantic.warning}15`, color: colors.semantic.warning }}
                >
                  Unsaved
                </span>
              )}
              {isEditMode && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                >
                  Editing
                </span>
              )}
            </div>
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => {
                setTemplateDescription(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Add a description..."
              className="block text-sm bg-transparent border-none outline-none focus:ring-0 w-64"
              style={{ color: colors.utility.secondaryText }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh blocks button */}
          <button
            onClick={() => refetchBlocks()}
            disabled={isFetchingBlocks}
            className="p-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-40"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText
            }}
            title="Refresh blocks"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingBlocks ? 'animate-spin' : ''}`} />
          </button>
          {/* Undo button */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-40"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText
            }}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPreviewMode(true)}
            disabled={templateBlocks.length === 0}
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText
            }}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText
            }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={saveTemplateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
            style={{ backgroundColor: colors.brand.primary }}
          >
            {saveTemplateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update Template' : 'Save Template'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Service Catalog Tree */}
        <ServiceCatalogTree
          categories={BLOCK_CATEGORIES}
          blocks={allBlocks}
          onBlockAdd={handleBlockAdd}
          onBlockPreview={handleBlockPreview}
          onCategorySelect={(catId) => console.log('Category selected:', catId)}
          previewBlockId={previewBlock?.id}
        />

        {/* Template Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Header - Light Primary or Bulk Action Bar */}
          {isMultiSelectMode && selectedBlockIds.size > 0 ? (
            <div
              className="px-4 py-3 border-b flex items-center justify-between animate-in fade-in duration-200"
              style={{
                backgroundColor: `${colors.brand.primary}15`,
                borderColor: colors.brand.primary,
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                  style={{ color: colors.brand.primary }}
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold" style={{ color: colors.brand.primary }}>
                  {selectedBlockIds.size} selected
                </span>
                {selectedBlockIds.size < templateBlocks.length && (
                  <button
                    onClick={selectAllBlocks}
                    className="text-xs underline"
                    style={{ color: colors.brand.primary }}
                  >
                    Select all
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={duplicateSelectedBlocks}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors hover:bg-white/50"
                  style={{ color: colors.brand.primary }}
                  title="Duplicate selected"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={hideSelectedBlocks}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors hover:bg-white/50"
                  style={{ color: colors.utility.secondaryText }}
                  title="Hide selected"
                >
                  <EyeOff className="w-4 h-4" />
                  Hide
                </button>
                <button
                  onClick={deleteSelectedBlocks}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors hover:bg-red-50"
                  style={{ color: colors.semantic.error }}
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : `${colors.brand.primary}08`,
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
              }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" style={{ color: colors.brand.primary }} />
                <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Template Blocks ({templateBlocks.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {templateBlocks.length > 0 && (
                  <button
                    onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                    title="Multi-select mode"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                <button
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Canvas Content */}
          <div
            className="flex-1 overflow-y-auto p-6"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6' }}
          >
            {templateBlocks.length === 0 ? (
              <div
                className="h-full flex items-center justify-center border-2 border-dashed rounded-xl"
                style={{ borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB' }}
              >
                <div className="text-center py-12">
                  <LayoutTemplate
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Start Building Your Template
                  </h3>
                  <p
                    className="text-sm max-w-sm mx-auto"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <strong>Double-click</strong> on blocks from the catalog to add them here.
                    Arrange and configure them to create reusable contract templates.
                  </p>
                  {allBlocks.length === 0 && (
                    <p
                      className="text-xs mt-4"
                      style={{ color: colors.semantic.warning }}
                    >
                      No blocks available. Please check if blocks have been created.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {templateBlocks.map((tb, index) => {
                  const category = getBlockCategory(tb.block);
                  const BlockIcon = getIconComponent(tb.block.icon);
                  const isDragging = draggedBlockId === tb.id;
                  const isDragOver = dragOverBlockId === tb.id;
                  const isSelected = selectedBlockIds.has(tb.id);
                  const isHidden = tb.config.isVisible === false;
                  return (
                    <div
                      key={tb.id}
                      draggable={!isMultiSelectMode}
                      onDragStart={(e) => !isMultiSelectMode && handleDragStart(e, tb.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, tb.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, tb.id)}
                      className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                        selectedTemplateBlock === tb.id ? 'ring-2' : ''
                      } ${tb.isNew ? 'animate-in slide-in-from-left-4 duration-300' : ''}`}
                      style={{
                        backgroundColor: isSelected
                          ? `${colors.brand.primary}08`
                          : isDarkMode
                            ? colors.utility.primaryBackground
                            : '#FFFFFF',
                        borderColor: isSelected
                          ? colors.brand.primary
                          : isDragOver
                            ? colors.brand.primary
                            : tb.isNew
                              ? colors.semantic.success
                              : selectedTemplateBlock === tb.id
                                ? colors.brand.primary
                                : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                        boxShadow: isSelected
                          ? `0 0 0 2px ${colors.brand.primary}30`
                          : isDragOver
                            ? `0 0 0 3px ${colors.brand.primary}40`
                            : tb.isNew
                              ? `0 0 0 2px ${colors.semantic.success}40`
                              : undefined,
                        opacity: isDragging ? 0.5 : isHidden ? 0.6 : 1,
                        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onClick={() => !isMultiSelectMode && setSelectedTemplateBlock(tb.id)}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {/* Checkbox for multi-select */}
                          {isMultiSelectMode && (
                            <button
                              onClick={(e) => toggleBlockSelection(tb.id, e)}
                              className="p-0.5 rounded transition-colors"
                            >
                              {isSelected ? (
                                <CheckedSquare className="w-5 h-5" style={{ color: colors.brand.primary }} />
                              ) : (
                                <Square className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                              )}
                            </button>
                          )}
                          <GripVertical
                            className="w-4 h-4 cursor-grab active:cursor-grabbing"
                            style={{ color: isDragging ? colors.brand.primary : colors.utility.secondaryText }}
                          />
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: `${colors.brand.primary}20`,
                              color: colors.brand.primary,
                            }}
                          >
                            {index + 1}
                          </span>
                        </div>
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: category?.bgColor || '#F3F4F6' }}
                        >
                          <BlockIcon
                            className="w-5 h-5"
                            style={{ color: category?.color || colors.utility.secondaryText }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-semibold text-sm flex items-center gap-2"
                            style={{ color: isHidden ? colors.utility.secondaryText : colors.utility.primaryText }}
                          >
                            {tb.block.name}
                            {tb.isNew && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${colors.semantic.success}20`, color: colors.semantic.success }}
                              >
                                New
                              </span>
                            )}
                            {isHidden && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: `${colors.utility.secondaryText}20`, color: colors.utility.secondaryText }}
                              >
                                <EyeOff className="w-3 h-3" />
                                Hidden
                              </span>
                            )}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {category?.name || 'Block'} • {tb.block.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBlock(tb.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            style={{ color: colors.semantic.error }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Block Hint */}
                <div
                  className="p-4 border-2 border-dashed rounded-xl text-center"
                  style={{
                    borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                    color: colors.utility.secondaryText,
                  }}
                >
                  <span className="text-sm">Double-click blocks in the catalog to add more</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Preview Panel (when a block is previewed) */}
        {previewBlock && (
          <div
            className="w-72 border-l flex flex-col animate-in slide-in-from-right-4 duration-200"
            style={{
              backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : `${colors.brand.primary}08`,
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
              }}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Block Preview
                </h3>
              </div>
              <button
                onClick={() => setPreviewBlock(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {(() => {
                const category = getBlockCategory(previewBlock);
                const BlockIcon = getIconComponent(previewBlock.icon);
                return (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category?.bgColor || '#F3F4F6' }}
                      >
                        <BlockIcon
                          className="w-6 h-6"
                          style={{ color: category?.color || colors.utility.secondaryText }}
                        />
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                          {previewBlock.name}
                        </div>
                        <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {category?.name}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                          Description
                        </div>
                        <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                          {previewBlock.description}
                        </p>
                      </div>

                      {previewBlock.price && (
                        <div>
                          <div className="text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                            Price
                          </div>
                          <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                            {previewBlock.currency === 'INR' ? '₹' : previewBlock.currency === 'USD' ? '$' : '€'}
                            {previewBlock.price.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {previewBlock.duration && (
                        <div>
                          <div className="text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                            Duration
                          </div>
                          <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                            {previewBlock.duration} {previewBlock.durationUnit}
                          </p>
                        </div>
                      )}

                      {previewBlock.tags && previewBlock.tags.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                            Tags
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {previewBlock.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                                  color: colors.utility.secondaryText
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="pt-4 border-t"
                        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
                      >
                        <button
                          onClick={() => {
                            handleBlockAdd(previewBlock);
                            setPreviewBlock(null);
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center justify-center gap-2"
                          style={{ backgroundColor: colors.brand.primary }}
                        >
                          <Plus className="w-4 h-4" />
                          Add to Template
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Right Sidebar - Block Settings (when a template block is selected) */}
        {selectedTemplateBlock && !previewBlock && selectedBlock && (
          <div
            className="w-80 border-l flex flex-col animate-in slide-in-from-right-4 duration-200"
            style={{
              backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : `${colors.brand.primary}08`,
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
              }}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Block Settings
                </h3>
              </div>
              <button
                onClick={() => setSelectedTemplateBlock(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Block Info Header */}
              <div className="p-4 border-b" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const category = getBlockCategory(selectedBlock.block);
                    const BlockIcon = getIconComponent(selectedBlock.block.icon);
                    return (
                      <>
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: category?.bgColor || '#F3F4F6' }}
                        >
                          <BlockIcon className="w-5 h-5" style={{ color: category?.color || colors.utility.secondaryText }} />
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                            {selectedBlock.block.name}
                          </div>
                          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            {category?.name}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Common Settings */}
              <div className="p-4 space-y-4">
                {/* Visibility Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>Visible in contract</span>
                  </div>
                  <button
                    onClick={() => updateBlockConfig(selectedBlock.id, { isVisible: !selectedBlock.config.isVisible })}
                    className="text-xl"
                  >
                    {selectedBlock.config.isVisible ? (
                      <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                    ) : (
                      <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                    )}
                  </button>
                </div>

                {/* Service Block Settings */}
                {selectedBlock.block.categoryId === 'service' && (
                  <>
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Pricing Override
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>₹</span>
                        <input
                          type="number"
                          value={selectedBlock.config.priceOverride || ''}
                          onChange={(e) => updateBlockConfig(selectedBlock.id, { priceOverride: Number(e.target.value) })}
                          placeholder={String(selectedBlock.block.price || 0)}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                            color: colors.utility.primaryText,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Duration Override
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={selectedBlock.config.durationOverride || ''}
                          onChange={(e) => updateBlockConfig(selectedBlock.id, { durationOverride: Number(e.target.value) })}
                          placeholder={String(selectedBlock.block.duration || 0)}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                            color: colors.utility.primaryText,
                          }}
                        />
                        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>min</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Required Evidence
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['photo', 'signature', 'gps', 'otp'].map((evType) => {
                          const isChecked = selectedBlock.config.evidenceRequired?.[evType as keyof typeof selectedBlock.config.evidenceRequired];
                          return (
                            <label
                              key={evType}
                              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                              style={{
                                backgroundColor: isChecked ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6'),
                                border: `1px solid ${isChecked ? colors.brand.primary : 'transparent'}`,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked || false}
                                onChange={(e) => updateBlockConfig(selectedBlock.id, {
                                  evidenceRequired: {
                                    ...selectedBlock.config.evidenceRequired,
                                    [evType]: e.target.checked,
                                  },
                                })}
                                className="rounded"
                                style={{ accentColor: colors.brand.primary }}
                              />
                              <span className="text-xs capitalize" style={{ color: colors.utility.primaryText }}>
                                {evType === 'gps' ? 'GPS' : evType === 'otp' ? 'OTP' : evType}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Spare Block Settings */}
                {selectedBlock.block.categoryId === 'spare' && (
                  <>
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Quantity
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={selectedBlock.config.quantity || 1}
                        onChange={(e) => updateBlockConfig(selectedBlock.id, { quantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border rounded-lg"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                          color: colors.utility.primaryText,
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileCheck className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Warranty Period
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={selectedBlock.config.warrantyMonths || 0}
                          onChange={(e) => updateBlockConfig(selectedBlock.id, { warrantyMonths: Number(e.target.value) })}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                            color: colors.utility.primaryText,
                          }}
                        />
                        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>months</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Billing Block Settings */}
                {selectedBlock.block.categoryId === 'billing' && (
                  <>
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Payment Terms
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>Net</span>
                        <input
                          type="number"
                          min="0"
                          value={selectedBlock.config.paymentTermsDays || 30}
                          onChange={(e) => updateBlockConfig(selectedBlock.id, { paymentTermsDays: Number(e.target.value) })}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                            color: colors.utility.primaryText,
                          }}
                        />
                        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>days</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-generate invoice</span>
                      </div>
                      <button
                        onClick={() => updateBlockConfig(selectedBlock.id, { autoInvoice: !selectedBlock.config.autoInvoice })}
                      >
                        {selectedBlock.config.autoInvoice ? (
                          <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                        ) : (
                          <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Text Block Settings */}
                {selectedBlock.block.categoryId === 'text' && (
                  <>
                    <div className="pt-3 border-t space-y-3" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Type className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Text Settings
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                          <span className="text-sm" style={{ color: colors.utility.primaryText }}>Required reading</span>
                        </div>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { isRequired: !selectedBlock.config.isRequired })}
                        >
                          {selectedBlock.config.isRequired ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                          <span className="text-sm" style={{ color: colors.utility.primaryText }}>Require signature</span>
                        </div>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { requireSignature: !selectedBlock.config.requireSignature })}
                        >
                          {selectedBlock.config.requireSignature ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Edit3 className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Content Editor
                        </span>
                      </div>
                      <RichTextEditor
                        value={selectedBlock.config.richTextContent || ''}
                        onChange={(content) => updateBlockConfig(selectedBlock.id, { richTextContent: content })}
                        placeholder="Enter your text content here..."
                        minHeight={120}
                        maxHeight={300}
                        colors={colors}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </>
                )}

                {/* Video Block Settings */}
                {selectedBlock.block.categoryId === 'video' && (
                  <>
                    <div className="pt-3 border-t space-y-3" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Video Settings
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-play</span>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { autoPlay: !selectedBlock.config.autoPlay })}
                        >
                          {selectedBlock.config.autoPlay ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Show controls</span>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { showControls: !selectedBlock.config.showControls })}
                        >
                          {selectedBlock.config.showControls ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Video Upload */}
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Upload className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Upload Videos
                        </span>
                      </div>
                      <MediaUpload
                        files={selectedBlock.config.mediaFiles || []}
                        onFilesChange={(files) => updateBlockConfig(selectedBlock.id, { mediaFiles: files })}
                        mediaType="video"
                        maxFiles={3}
                        maxSizeMB={50}
                        colors={colors}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </>
                )}

                {/* Image Block Settings */}
                {selectedBlock.block.categoryId === 'image' && (
                  <>
                    <div className="pt-3 border-t space-y-3" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Image Settings
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Show zoom controls</span>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { showControls: !selectedBlock.config.showControls })}
                        >
                          {selectedBlock.config.showControls ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Upload className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Upload Images
                        </span>
                      </div>
                      <MediaUpload
                        files={selectedBlock.config.mediaFiles || []}
                        onFilesChange={(files) => updateBlockConfig(selectedBlock.id, { mediaFiles: files })}
                        mediaType="image"
                        maxFiles={5}
                        maxSizeMB={10}
                        colors={colors}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </>
                )}

                {/* Checklist Block Settings */}
                {selectedBlock.block.categoryId === 'checklist' && (
                  <>
                    <div className="pt-3 border-t space-y-3" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckSquare className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Checklist Settings
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Enforce completion order</span>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { enforceOrder: !selectedBlock.config.enforceOrder })}
                        >
                          {selectedBlock.config.enforceOrder ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Require photo per item</span>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { requirePhoto: !selectedBlock.config.requirePhoto })}
                        >
                          {selectedBlock.config.requirePhoto ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Checklist Builder */}
                    <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <ListChecks className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Checklist Items
                        </span>
                      </div>
                      <ChecklistBuilder
                        items={selectedBlock.config.checklistItems || []}
                        onItemsChange={(items) => updateBlockConfig(selectedBlock.id, { checklistItems: items })}
                        colors={colors}
                        isDarkMode={isDarkMode}
                        maxItems={20}
                      />
                    </div>
                  </>
                )}

                {/* Document Block Settings */}
                {selectedBlock.block.categoryId === 'document' && (
                  <>
                    <div className="pt-3 border-t space-y-3" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                          Document Settings
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.utility.primaryText }}>Required document</span>
                        <button
                          onClick={() => updateBlockConfig(selectedBlock.id, { isRequired: !selectedBlock.config.isRequired })}
                        >
                          {selectedBlock.config.isRequired ? (
                            <ToggleRight className="w-8 h-8" style={{ color: colors.brand.primary }} />
                          ) : (
                            <ToggleLeft className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes Section - Common to all */}
                <div className="pt-3 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <span className="text-xs font-semibold uppercase" style={{ color: colors.utility.secondaryText }}>
                      Internal Notes
                    </span>
                  </div>
                  <textarea
                    value={selectedBlock.config.notes || ''}
                    onChange={(e) => updateBlockConfig(selectedBlock.id, { notes: e.target.value })}
                    placeholder="Add notes for this block..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                      color: colors.utility.primaryText,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {isPreviewMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setIsPreviewMode(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl animate-in zoom-in-95 duration-300"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.secondaryText + '20',
              }}
            >
              {/* Preview Header */}
              <div
                className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${colors.brand.primary}15` }}
                  >
                    <Eye className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                      Template Preview
                    </h2>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {templateName} • {templateBlocks.filter((b) => b.config.isVisible !== false).length} visible blocks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}>
                    Press ESC to close
                  </span>
                  <button
                    onClick={() => setIsPreviewMode(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-6 space-y-4">
                {templateBlocks
                  .filter((tb) => tb.config.isVisible !== false)
                  .map((tb, index) => {
                    const category = getBlockCategory(tb.block);
                    const BlockIcon = getIconComponent(tb.block.icon);
                    return (
                      <div
                        key={tb.id}
                        className="p-5 rounded-xl border transition-all"
                        style={{
                          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
                          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: category?.bgColor || '#F3F4F6' }}
                          >
                            <BlockIcon
                              className="w-6 h-6"
                              style={{ color: category?.color || colors.utility.secondaryText }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${colors.brand.primary}15`,
                                  color: colors.brand.primary,
                                }}
                              >
                                #{index + 1}
                              </span>
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: category?.bgColor || '#F3F4F6',
                                  color: category?.color || colors.utility.secondaryText,
                                }}
                              >
                                {category?.name}
                              </span>
                            </div>
                            <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                              {tb.block.name}
                            </h4>
                            <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
                              {tb.block.description}
                            </p>

                            {/* Show relevant config info */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {tb.block.price && (
                                <span
                                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                                  style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                                >
                                  <DollarSign className="w-3 h-3" />
                                  ₹{(tb.config.priceOverride || tb.block.price).toLocaleString()}
                                </span>
                              )}
                              {tb.block.duration && (
                                <span
                                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                                  style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                                >
                                  <Clock className="w-3 h-3" />
                                  {tb.config.durationOverride || tb.block.duration} {tb.block.durationUnit}
                                </span>
                              )}
                              {tb.config.quantity && tb.config.quantity > 1 && (
                                <span
                                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                                  style={{ backgroundColor: `${colors.semantic.warning}15`, color: colors.semantic.warning }}
                                >
                                  <Package className="w-3 h-3" />
                                  Qty: {tb.config.quantity}
                                </span>
                              )}
                              {tb.config.isRequired && (
                                <span
                                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                                  style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {templateBlocks.filter((tb) => tb.config.isVisible !== false).length === 0 && (
                  <div className="text-center py-12">
                    <EyeOff className="w-12 h-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
                    <p style={{ color: colors.utility.secondaryText }}>All blocks are hidden</p>
                  </div>
                )}
              </div>

              {/* Preview Footer */}
              <div
                className="sticky bottom-0 px-6 py-4 border-t flex justify-between items-center"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                }}
              >
                <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  Total: {templateBlocks.filter((b) => b.config.isVisible !== false).length} blocks
                  {templateBlocks.some((b) => b.config.isVisible === false) && (
                    <span className="ml-2">({templateBlocks.filter((b) => b.config.isVisible === false).length} hidden)</span>
                  )}
                </div>
                <button
                  onClick={() => setIsPreviewMode(false)}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            colors={colors}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, blockId: null })}
        onConfirm={confirmDeleteBlock}
        title="Remove Block"
        description="Are you sure you want to remove this block from the template? This action can be undone with Cmd+Z."
        confirmText="Remove Block"
        type="danger"
        colors={colors}
        isDarkMode={isDarkMode}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title={`Remove ${selectedBlockIds.size} Blocks`}
        description={`Are you sure you want to remove ${selectedBlockIds.size} selected blocks from the template? This action can be undone with Cmd+Z.`}
        confirmText="Remove All"
        type="danger"
        colors={colors}
        isDarkMode={isDarkMode}
      />

      {/* Keyboard Shortcuts Help - shown in empty state */}
      {templateBlocks.length === 0 && (
        <div
          className="fixed bottom-4 left-4 text-xs p-3 rounded-lg border"
          style={{
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
            borderColor: colors.utility.secondaryText + '20',
            color: colors.utility.secondaryText,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="w-4 h-4" />
            <span className="font-medium">Keyboard Shortcuts</span>
          </div>
          <div className="space-y-1">
            <div><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">⌘Z</kbd> Undo</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">⌘D</kbd> Duplicate</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">⌘S</kbd> Save</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Del</kbd> Delete</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Esc</kbd> Clear selection</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogStudioTemplatePage;

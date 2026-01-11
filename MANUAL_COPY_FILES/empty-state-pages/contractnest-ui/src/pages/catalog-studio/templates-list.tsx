// src/pages/catalog-studio/templates-list.tsx (API Integrated)
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';
import {
  Search,
  Grid3X3,
  List,
  Star,
  Plus,
  Clock,
  X,
  Loader2,
  AlertCircle,
  FileText,
  LayoutTemplate,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  History,
  Calendar,
  Users,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  FolderOpen,
  CheckCircle,
  Globe,
  Building2,
  Boxes,
  Palette,
  Layers,
  Wand2,
  Sparkles,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const catalogStudioFeatures = [
  { icon: Boxes, title: 'Block Library Management', description: 'Create and manage reusable content blocks.', highlight: true },
  { icon: Wand2, title: 'Template Builder', description: 'Design professional contract templates visually.', highlight: false },
  { icon: Tag, title: 'Dynamic Pricing Configuration', description: 'Set up flexible pricing models.', highlight: false },
  { icon: Palette, title: 'Brand Customization', description: 'Apply your branding to every output.', highlight: false }
];
const catalogStudioFloatingIcons = [
  { Icon: Boxes, top: '10%', left: '4%', delay: '0s', duration: '20s' },
  { Icon: Layers, top: '18%', right: '6%', delay: '2s', duration: '18s' },
  { Icon: Wand2, top: '68%', right: '5%', delay: '1s', duration: '19s' },
  { Icon: Sparkles, top: '38%', left: '6%', delay: '2.5s', duration: '21s' },
];

// API Hooks
import {
  useCatTemplates,
  useCatSystemTemplates,
  useCatPublicTemplates,
  CatTemplate,
} from '../../hooks/queries/useCatTemplates';
import {
  useDeleteCatTemplate,
  useCopyCatTemplate,
} from '../../hooks/mutations/useCatTemplatesMutations';
import { catTemplatesToUITemplates, UITemplate } from '../../utils/catalog-studio/catTemplateAdapter';

// Types
interface TemplateVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  notes: string;
  blocksCount: number;
}

type ViewType = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'rating' | 'name' | 'usage';
type TabType = 'all' | 'my-templates' | 'global' | 'favorites' | 'drafts';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

// Toast Component
const ToastNotification: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ toast, onDismiss, colors, isDarkMode }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getBg = () => {
    switch (toast.type) {
      case 'success': return colors.semantic.success;
      case 'error': return colors.semantic.error;
      default: return colors.brand.primary;
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-4 min-w-[280px]"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        border: `1px solid ${getBg()}40`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${getBg()}20`, color: getBg() }}
      >
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>{toast.description}</p>
        )}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="p-1" style={{ color: colors.utility.secondaryText }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Version History Modal
const VersionHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: UITemplate | null;
  onRestoreVersion: (version: string) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, template, onRestoreVersion, colors, isDarkMode }) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg rounded-xl border shadow-xl animate-in zoom-in-95"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: colors.utility.secondaryText + '20' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.brand.primary}15` }}>
                <History className="w-5 h-5" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>Version History</h2>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>{template.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: colors.utility.secondaryText }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {template.versions.map((version, index) => (
                <div
                  key={version.version}
                  className="p-4 rounded-lg border transition-all hover:shadow-md"
                  style={{
                    backgroundColor: index === 0 ? `${colors.brand.primary}08` : colors.utility.primaryBackground,
                    borderColor: index === 0 ? colors.brand.primary : colors.utility.secondaryText + '20',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                          v{version.version}
                        </span>
                        {index === 0 && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${colors.semantic.success}20`, color: colors.semantic.success }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                        {version.notes}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: colors.utility.secondaryText }}>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {version.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {version.blocksCount} blocks
                        </span>
                      </div>
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => onRestoreVersion(version.version)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:opacity-80"
                        style={{
                          borderColor: colors.brand.primary,
                          color: colors.brand.primary,
                        }}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: colors.utility.secondaryText + '20' }}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Duplicate Modal
const DuplicateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: UITemplate | null;
  onDuplicate: (name: string) => void;
  isLoading: boolean;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, template, onDuplicate, isLoading, colors, isDarkMode }) => {
  const [newName, setNewName] = useState('');

  React.useEffect(() => {
    if (template) {
      setNewName(`${template.name} (Copy)`);
    }
  }, [template]);

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-xl border shadow-xl animate-in zoom-in-95"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: colors.utility.secondaryText + '20' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.brand.primary}15` }}>
                <Copy className="w-5 h-5" style={{ color: colors.brand.primary }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>Duplicate Template</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: colors.utility.secondaryText }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                New Template Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: colors.utility.secondaryText + '40',
                  color: colors.utility.primaryText,
                }}
              />
            </div>
            <div
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: `${colors.semantic.info}10`, color: colors.semantic.info }}
            >
              This will create a copy of "{template.name}" with {template.blocksCount} blocks and all settings.
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: colors.utility.secondaryText + '20' }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onDuplicate(newName)}
              disabled={!newName.trim() || isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Duplicate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: UITemplate | null;
  onConfirm: () => void;
  isLoading: boolean;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, template, onConfirm, isLoading, colors, isDarkMode }) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-xl border shadow-xl animate-in zoom-in-95"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colors.semantic.error}15` }}
              >
                <Trash2 className="w-6 h-6" style={{ color: colors.semantic.error }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                  Delete Template
                </h3>
                <p className="mt-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: colors.utility.secondaryText + '20' }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: colors.semantic.error, color: '#FFFFFF' }}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Template Card Component
const TemplateCard: React.FC<{
  template: UITemplate;
  viewType: ViewType;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  onToggleFavorite: () => void;
  onUseTemplate: () => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ template, viewType, onEdit, onDuplicate, onDelete, onViewHistory, onToggleFavorite, onUseTemplate, colors, isDarkMode }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return colors.semantic.success;
      case 'draft': return colors.semantic.warning;
      case 'archived': return colors.utility.secondaryText;
      default: return colors.utility.secondaryText;
    }
  };

  if (viewType === 'list') {
    return (
      <div
        className="p-4 rounded-lg border transition-all hover:shadow-md"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate" style={{ color: colors.utility.primaryText }}>
                {template.name}
              </h3>
              {template.isGlobal && (
                <Globe className="w-4 h-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
              )}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${getStatusColor(template.status)}20`, color: getStatusColor(template.status) }}
              >
                {template.status}
              </span>
            </div>
            <p className="text-xs truncate mt-1" style={{ color: colors.utility.secondaryText }}>
              {template.description}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs" style={{ color: colors.utility.secondaryText }}>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {template.blocksCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {template.estimatedDuration}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {template.isFavorite ? (
                <BookmarkCheck className="w-4 h-4" style={{ color: colors.brand.primary }} />
              ) : (
                <Bookmark className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
              )}
            </button>
            <button
              onClick={onUseTemplate}
              className="px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
            >
              Use
            </button>
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showActions && (
                <div
                  className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-10"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.secondaryText + '20',
                  }}
                >
                  <button
                    onClick={() => { onEdit(); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { onDuplicate(); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button
                    onClick={() => { onViewHistory(); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <History className="w-4 h-4" /> Version History
                  </button>
                  <div className="border-t" style={{ borderColor: colors.utility.secondaryText + '20' }} />
                  <button
                    onClick={() => { onDelete(); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{ color: colors.semantic.error }}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className="rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1 group"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: colors.utility.secondaryText + '20',
      }}
    >
      <div className="p-4 border-b" style={{ borderColor: colors.utility.secondaryText + '10' }}>
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
          </div>
          <div className="flex items-center gap-1">
            {template.isGlobal && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
              >
                <Globe className="w-3 h-3" /> Global
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: `${getStatusColor(template.status)}20`, color: getStatusColor(template.status) }}
            >
              {template.status}
            </span>
          </div>
        </div>
        <h3 className="font-semibold" style={{ color: colors.utility.primaryText }}>
          {template.name}
        </h3>
        <p className="text-xs mt-1 line-clamp-2" style={{ color: colors.utility.secondaryText }}>
          {template.description}
        </p>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 text-center py-2 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {template.blocksCount}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Blocks</div>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {template.estimatedDuration}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Duration</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: colors.utility.secondaryText }}>
          <span className="flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> v{template.currentVersion}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {new Date(template.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: colors.utility.secondaryText + '10' }}>
        <button
          onClick={onUseTemplate}
          className="flex-1 py-2 text-sm font-medium rounded-lg"
          style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
        >
          Use Template
        </button>
        <button
          onClick={onToggleFavorite}
          className="p-2 rounded-lg border transition-colors"
          style={{
            borderColor: template.isFavorite ? colors.brand.primary : colors.utility.secondaryText + '40',
            backgroundColor: template.isFavorite ? `${colors.brand.primary}10` : 'transparent',
          }}
        >
          {template.isFavorite ? (
            <BookmarkCheck className="w-4 h-4" style={{ color: colors.brand.primary }} />
          ) : (
            <Bookmark className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg border transition-colors"
            style={{
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.secondaryText,
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showActions && (
            <div
              className="absolute right-0 bottom-full mb-1 w-40 rounded-lg border shadow-lg z-10"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '20',
              }}
            >
              <button
                onClick={() => { onEdit(); setShowActions(false); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.primaryText }}
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => { onDuplicate(); setShowActions(false); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.primaryText }}
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button
                onClick={() => { onViewHistory(); setShowActions(false); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.primaryText }}
              >
                <History className="w-4 h-4" /> Version History
              </button>
              <div className="border-t" style={{ borderColor: colors.utility.secondaryText + '20' }} />
              <button
                onClick={() => { onDelete(); setShowActions(false); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{ color: colors.semantic.error }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
const CatalogStudioTemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ===== API HOOKS =====
  const {
    data: tenantTemplatesRes,
    isLoading: loadingTenant,
    error: tenantError,
    refetch: refetchTenant,
    isFetching: fetchingTenant,
  } = useCatTemplates();

  const {
    data: systemTemplatesRes,
    isLoading: loadingSystem,
  } = useCatSystemTemplates();

  const {
    data: publicTemplatesRes,
    isLoading: loadingPublic,
  } = useCatPublicTemplates();

  const deleteMutation = useDeleteCatTemplate();
  const copyMutation = useCopyCatTemplate();

  // Convert API templates to UI format
  const allTemplates = useMemo(() => {
    const templates: UITemplate[] = [];

    if (tenantTemplatesRes?.data?.templates) {
      templates.push(...catTemplatesToUITemplates(tenantTemplatesRes.data.templates));
    }

    if (systemTemplatesRes?.data?.templates) {
      const systemTemplates = catTemplatesToUITemplates(systemTemplatesRes.data.templates);
      systemTemplates.forEach(t => { t.isGlobal = true; });
      templates.push(...systemTemplates);
    }

    return templates;
  }, [tenantTemplatesRes, systemTemplatesRes]);

  const isLoading = loadingTenant || loadingSystem || loadingPublic;
  const isMutating = deleteMutation.isPending || copyMutation.isPending;

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Local favorites state (could be persisted to API)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Modals
  const [versionHistoryModal, setVersionHistoryModal] = useState<UITemplate | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<UITemplate | null>(null);
  const [deleteModal, setDeleteModal] = useState<UITemplate | null>(null);

  // Toast helper
  const showToast = useCallback((type: Toast['type'], title: string, description?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Add favorites to templates
  const templatesWithFavorites = useMemo(() => {
    return allTemplates.map(t => ({
      ...t,
      isFavorite: favorites.has(t.id),
    }));
  }, [allTemplates, favorites]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = [...templatesWithFavorites];

    // Tab filter
    switch (activeTab) {
      case 'my-templates':
        result = result.filter((t) => !t.isGlobal);
        break;
      case 'global':
        result = result.filter((t) => t.isGlobal);
        break;
      case 'favorites':
        result = result.filter((t) => t.isFavorite);
        break;
      case 'drafts':
        result = result.filter((t) => t.status === 'draft');
        break;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [templatesWithFavorites, activeTab, searchTerm, sortBy]);

  // Handlers
  const handleToggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
      showToast('success', 'Removed from favorites');
    } else {
      newFavorites.add(templateId);
      showToast('success', 'Added to favorites');
    }
    setFavorites(newFavorites);
  };

  const handleDuplicate = async (newName: string) => {
    if (!duplicateModal) return;

    try {
      await copyMutation.mutateAsync({
        id: duplicateModal.id,
        data: { name: newName },
      });
      showToast('success', 'Template duplicated', newName);
      setDuplicateModal(null);
      refetchTenant();
    } catch (error: any) {
      showToast('error', 'Failed to duplicate template', error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    try {
      await deleteMutation.mutateAsync(deleteModal.id);
      showToast('success', 'Template deleted', deleteModal.name);
      setDeleteModal(null);
      refetchTenant();
    } catch (error: any) {
      showToast('error', 'Failed to delete template', error.message);
    }
  };

  const handleRestoreVersion = (templateId: string, version: string) => {
    showToast('info', `Restored to version ${version}`, 'Template will be updated');
    setVersionHistoryModal(null);
  };

  const handleUseTemplate = (template: UITemplate) => {
    navigate(`/catalog-studio/template?templateId=${template.id}`);
  };

  const handleEditTemplate = (template: UITemplate) => {
    navigate(`/catalog-studio/template?templateId=${template.id}&edit=true`);
  };

  // Tab configuration
  const tabs = [
    { id: 'all' as TabType, label: 'All Templates', icon: FolderOpen, count: templatesWithFavorites.length },
    { id: 'my-templates' as TabType, label: 'My Templates', icon: Building2, count: templatesWithFavorites.filter((t) => !t.isGlobal).length },
    { id: 'global' as TabType, label: 'Global', icon: Globe, count: templatesWithFavorites.filter((t) => t.isGlobal).length },
    { id: 'favorites' as TabType, label: 'Favorites', icon: BookmarkCheck, count: templatesWithFavorites.filter((t) => t.isFavorite).length },
    { id: 'drafts' as TabType, label: 'Drafts', icon: Edit, count: templatesWithFavorites.filter((t) => t.status === 'draft').length },
  ];

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading templates...</p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (tenantError) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            Failed to load templates
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {tenantError instanceof Error ? tenantError.message : 'An error occurred'}
          </p>
          <button
            onClick={() => refetchTenant()}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 mx-auto"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.secondaryBackground }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.brand.primary}15` }}
            >
              <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                Templates
              </h1>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Browse and manage your contract templates
                {fetchingTenant && (
                  <span className="ml-2">
                    <Loader2 className="w-3 h-3 animate-spin inline" />
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchTenant()}
              disabled={fetchingTenant}
              className="p-2 rounded-lg border transition-colors disabled:opacity-50"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.secondaryText,
              }}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingTenant ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/catalog-studio/template')}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="border-b px-6"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors"
              style={{
                borderBottomColor: activeTab === tab.id ? colors.brand.primary : 'transparent',
                color: activeTab === tab.id ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span
                className="px-1.5 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: activeTab === tab.id ? `${colors.brand.primary}15` : colors.utility.secondaryText + '15',
                  color: activeTab === tab.id ? colors.brand.primary : colors.utility.secondaryText,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters Bar */}
      <div
        className="px-6 py-4 border-b"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : `${colors.brand.primary}05`,
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
          >
            <option value="recent">Recently Updated</option>
            <option value="name">Name A-Z</option>
          </select>

          <div
            className="flex rounded-lg p-0.5"
            style={{ backgroundColor: colors.utility.secondaryText + '10' }}
          >
            <button
              onClick={() => setViewType('grid')}
              className="p-2 rounded-md transition-colors"
              style={{
                backgroundColor: viewType === 'grid' ? colors.utility.primaryBackground : 'transparent',
                color: viewType === 'grid' ? colors.utility.primaryText : colors.utility.secondaryText,
              }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('list')}
              className="p-2 rounded-md transition-colors"
              style={{
                backgroundColor: viewType === 'list' ? colors.utility.primaryBackground : 'transparent',
                color: viewType === 'list' ? colors.utility.primaryText : colors.utility.secondaryText,
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {filteredTemplates.length} results
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <FolderOpen className="w-16 h-16 mb-4" style={{ color: colors.utility.secondaryText }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              No templates found
            </h3>
            <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
              {searchTerm ? 'Try adjusting your search or filters' : 'Create your first template to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/catalog-studio/template')}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
                style={{ backgroundColor: colors.brand.primary }}
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div
            className={
              viewType === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewType={viewType}
                onEdit={() => handleEditTemplate(template)}
                onDuplicate={() => setDuplicateModal(template)}
                onDelete={() => setDeleteModal(template)}
                onViewHistory={() => setVersionHistoryModal(template)}
                onToggleFavorite={() => handleToggleFavorite(template.id)}
                onUseTemplate={() => handleUseTemplate(template)}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <VersionHistoryModal
        isOpen={!!versionHistoryModal}
        onClose={() => setVersionHistoryModal(null)}
        template={versionHistoryModal}
        onRestoreVersion={(version) => handleRestoreVersion(versionHistoryModal?.id || '', version)}
        colors={colors}
        isDarkMode={isDarkMode}
      />

      <DuplicateModal
        isOpen={!!duplicateModal}
        onClose={() => setDuplicateModal(null)}
        template={duplicateModal}
        onDuplicate={handleDuplicate}
        isLoading={copyMutation.isPending}
        colors={colors}
        isDarkMode={isDarkMode}
      />

      <DeleteConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        template={deleteModal}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        colors={colors}
        isDarkMode={isDarkMode}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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
    </div>
  );
};

const CatalogStudioTemplatesListPageWithComingSoon: React.FC = () => (
  <ComingSoonWrapper pageKey="catalog-studio" title="Catalog Studio" subtitle="Your creative workspace for contract building blocks." heroIcon={Boxes} features={catalogStudioFeatures} floatingIcons={catalogStudioFloatingIcons}>
    <CatalogStudioTemplatesListPage />
  </ComingSoonWrapper>
);

export default CatalogStudioTemplatesListPageWithComingSoon;

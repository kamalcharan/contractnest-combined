// src/pages/catalog-studio/templates-list.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  Plus,
  Clock,
  ChevronDown,
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
  Tag,
  Calendar,
  Users,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  FolderOpen,
  CheckCircle,
  Globe,
  Building2,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Template Types
interface TemplateVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  notes: string;
  blocksCount: number;
}

interface CatalogTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  tags: string[];
  blocksCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isGlobal: boolean;
  isFavorite: boolean;
  usageCount: number;
  rating: number;
  status: 'draft' | 'published' | 'archived';
  currentVersion: string;
  versions: TemplateVersion[];
  thumbnailIcon: string;
  estimatedDuration: string;
}

// Mock Data
const MOCK_TEMPLATES: CatalogTemplate[] = [
  {
    id: 'tpl-1',
    name: 'AC Service Contract',
    description: 'Complete air conditioning service contract with installation, maintenance, and warranty blocks',
    category: 'HVAC',
    industry: 'Home Services',
    tags: ['hvac', 'installation', 'maintenance', 'warranty'],
    blocksCount: 12,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-12-20T14:45:00Z',
    createdBy: 'John Smith',
    isGlobal: false,
    isFavorite: true,
    usageCount: 156,
    rating: 4.8,
    status: 'published',
    currentVersion: '2.1.0',
    versions: [
      { version: '2.1.0', createdAt: '2024-12-20T14:45:00Z', createdBy: 'John Smith', notes: 'Added warranty extension block', blocksCount: 12 },
      { version: '2.0.0', createdAt: '2024-11-10T09:00:00Z', createdBy: 'John Smith', notes: 'Major revision with new pricing', blocksCount: 11 },
      { version: '1.0.0', createdAt: '2024-01-15T10:30:00Z', createdBy: 'John Smith', notes: 'Initial version', blocksCount: 8 },
    ],
    thumbnailIcon: 'Wind',
    estimatedDuration: '45 min',
  },
  {
    id: 'tpl-2',
    name: 'Plumbing Service Agreement',
    description: 'Standard plumbing service contract with emergency repairs and scheduled maintenance',
    category: 'Plumbing',
    industry: 'Home Services',
    tags: ['plumbing', 'repairs', 'emergency', 'residential'],
    blocksCount: 9,
    createdAt: '2024-02-20T11:00:00Z',
    updatedAt: '2024-12-18T16:30:00Z',
    createdBy: 'Jane Doe',
    isGlobal: true,
    isFavorite: false,
    usageCount: 89,
    rating: 4.5,
    status: 'published',
    currentVersion: '1.2.0',
    versions: [
      { version: '1.2.0', createdAt: '2024-12-18T16:30:00Z', createdBy: 'Jane Doe', notes: 'Updated pricing tiers', blocksCount: 9 },
      { version: '1.1.0', createdAt: '2024-06-05T13:20:00Z', createdBy: 'Jane Doe', notes: 'Added emergency service block', blocksCount: 8 },
      { version: '1.0.0', createdAt: '2024-02-20T11:00:00Z', createdBy: 'Jane Doe', notes: 'Initial release', blocksCount: 7 },
    ],
    thumbnailIcon: 'Droplets',
    estimatedDuration: '30 min',
  },
  {
    id: 'tpl-3',
    name: 'Electrical Installation Contract',
    description: 'Comprehensive electrical work contract for residential and commercial installations',
    category: 'Electrical',
    industry: 'Construction',
    tags: ['electrical', 'installation', 'commercial', 'safety'],
    blocksCount: 15,
    createdAt: '2024-03-10T09:15:00Z',
    updatedAt: '2024-12-15T11:20:00Z',
    createdBy: 'Mike Johnson',
    isGlobal: false,
    isFavorite: true,
    usageCount: 234,
    rating: 4.9,
    status: 'published',
    currentVersion: '3.0.0',
    versions: [
      { version: '3.0.0', createdAt: '2024-12-15T11:20:00Z', createdBy: 'Mike Johnson', notes: 'Added compliance checklist', blocksCount: 15 },
      { version: '2.0.0', createdAt: '2024-08-22T14:00:00Z', createdBy: 'Mike Johnson', notes: 'Restructured for commercial use', blocksCount: 13 },
    ],
    thumbnailIcon: 'Zap',
    estimatedDuration: '60 min',
  },
  {
    id: 'tpl-4',
    name: 'IT Support Agreement',
    description: 'IT support and maintenance contract with SLA definitions and response times',
    category: 'IT Services',
    industry: 'Technology',
    tags: ['it', 'support', 'sla', 'maintenance'],
    blocksCount: 18,
    createdAt: '2024-04-05T08:00:00Z',
    updatedAt: '2024-12-22T09:30:00Z',
    createdBy: 'Sarah Wilson',
    isGlobal: true,
    isFavorite: false,
    usageCount: 312,
    rating: 4.7,
    status: 'published',
    currentVersion: '2.3.0',
    versions: [
      { version: '2.3.0', createdAt: '2024-12-22T09:30:00Z', createdBy: 'Sarah Wilson', notes: 'Updated SLA tiers', blocksCount: 18 },
    ],
    thumbnailIcon: 'Monitor',
    estimatedDuration: '90 min',
  },
  {
    id: 'tpl-5',
    name: 'Cleaning Services Contract',
    description: 'Professional cleaning services agreement for offices and commercial spaces',
    category: 'Cleaning',
    industry: 'Facility Management',
    tags: ['cleaning', 'commercial', 'office', 'scheduled'],
    blocksCount: 7,
    createdAt: '2024-05-12T10:45:00Z',
    updatedAt: '2024-11-30T15:00:00Z',
    createdBy: 'Emily Brown',
    isGlobal: false,
    isFavorite: false,
    usageCount: 67,
    rating: 4.3,
    status: 'draft',
    currentVersion: '1.0.0-draft',
    versions: [
      { version: '1.0.0-draft', createdAt: '2024-05-12T10:45:00Z', createdBy: 'Emily Brown', notes: 'Work in progress', blocksCount: 7 },
    ],
    thumbnailIcon: 'Sparkles',
    estimatedDuration: '20 min',
  },
  {
    id: 'tpl-6',
    name: 'Security Systems Installation',
    description: 'CCTV and security alarm system installation and monitoring contract',
    category: 'Security',
    industry: 'Security Services',
    tags: ['security', 'cctv', 'monitoring', 'installation'],
    blocksCount: 14,
    createdAt: '2024-06-18T14:20:00Z',
    updatedAt: '2024-12-10T12:00:00Z',
    createdBy: 'David Lee',
    isGlobal: true,
    isFavorite: true,
    usageCount: 145,
    rating: 4.6,
    status: 'published',
    currentVersion: '1.5.0',
    versions: [
      { version: '1.5.0', createdAt: '2024-12-10T12:00:00Z', createdBy: 'David Lee', notes: 'Added 24/7 monitoring option', blocksCount: 14 },
      { version: '1.0.0', createdAt: '2024-06-18T14:20:00Z', createdBy: 'David Lee', notes: 'Initial version', blocksCount: 10 },
    ],
    thumbnailIcon: 'Shield',
    estimatedDuration: '75 min',
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All Categories', count: MOCK_TEMPLATES.length },
  { id: 'hvac', name: 'HVAC', count: 1 },
  { id: 'plumbing', name: 'Plumbing', count: 1 },
  { id: 'electrical', name: 'Electrical', count: 1 },
  { id: 'it-services', name: 'IT Services', count: 1 },
  { id: 'cleaning', name: 'Cleaning', count: 1 },
  { id: 'security', name: 'Security', count: 1 },
];

type ViewType = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'rating' | 'name' | 'usage';
type TabType = 'all' | 'my-templates' | 'global' | 'favorites' | 'drafts';

// Toast notification component
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

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
  template: CatalogTemplate | null;
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

// Duplicate Template Modal
const DuplicateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: CatalogTemplate | null;
  onDuplicate: (name: string) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, template, onDuplicate, colors, isDarkMode }) => {
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
              className="px-4 py-2 text-sm font-medium border rounded-lg"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDuplicate(newName);
                onClose();
              }}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
            >
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
  template: CatalogTemplate | null;
  onConfirm: () => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ isOpen, onClose, template, onConfirm, colors, isDarkMode }) => {
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
                  Are you sure you want to delete "{template.name}"? This action cannot be undone and will remove all {template.versions.length} version(s).
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: colors.utility.secondaryText + '20' }}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border rounded-lg"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: colors.semantic.error, color: '#FFFFFF' }}
            >
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
  template: CatalogTemplate;
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
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
          </div>

          {/* Info */}
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

          {/* Stats */}
          <div className="flex items-center gap-6 text-xs" style={{ color: colors.utility.secondaryText }}>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {template.blocksCount}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" style={{ fill: colors.semantic.warning, color: colors.semantic.warning }} />
              {template.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {template.usageCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {template.estimatedDuration}
            </span>
          </div>

          {/* Actions */}
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
      {/* Header */}
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

      {/* Meta */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                color: colors.utility.secondaryText,
              }}
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-[10px] px-2 py-0.5" style={{ color: colors.utility.secondaryText }}>
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center py-2 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {template.blocksCount}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Blocks</div>
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center justify-center gap-0.5" style={{ color: colors.utility.primaryText }}>
              <Star className="w-3 h-3" style={{ fill: colors.semantic.warning, color: colors.semantic.warning }} />
              {template.rating.toFixed(1)}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Rating</div>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {template.usageCount}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Uses</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: colors.utility.secondaryText }}>
          <span className="flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> v{template.currentVersion}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {template.estimatedDuration}
          </span>
        </div>
      </div>

      {/* Actions */}
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

  // State
  const [templates, setTemplates] = useState<CatalogTemplate[]>(MOCK_TEMPLATES);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [versionHistoryModal, setVersionHistoryModal] = useState<CatalogTemplate | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<CatalogTemplate | null>(null);
  const [deleteModal, setDeleteModal] = useState<CatalogTemplate | null>(null);

  // Toast helper
  const showToast = useCallback((type: Toast['type'], title: string, description?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = [...templates];

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

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'popular':
        result.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'usage':
        result.sort((a, b) => b.usageCount - a.usageCount);
        break;
    }

    return result;
  }, [templates, activeTab, selectedCategory, searchTerm, sortBy]);

  // Handlers
  const handleToggleFavorite = (templateId: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      showToast('success', template.isFavorite ? 'Removed from favorites' : 'Added to favorites', template.name);
    }
  };

  const handleDuplicate = (templateId: string, newName: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const newTemplate: CatalogTemplate = {
        ...template,
        id: `tpl-${Date.now()}`,
        name: newName,
        isGlobal: false,
        isFavorite: false,
        usageCount: 0,
        status: 'draft',
        currentVersion: '1.0.0-draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            version: '1.0.0-draft',
            createdAt: new Date().toISOString(),
            createdBy: 'Current User',
            notes: `Duplicated from ${template.name}`,
            blocksCount: template.blocksCount,
          },
        ],
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      showToast('success', 'Template duplicated', newName);
    }
  };

  const handleDelete = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (template) {
      showToast('success', 'Template deleted', template.name);
    }
  };

  const handleRestoreVersion = (templateId: string, version: string) => {
    showToast('success', `Restored to version ${version}`, 'Template will be updated');
    setVersionHistoryModal(null);
  };

  const handleUseTemplate = (template: CatalogTemplate) => {
    navigate(`/catalog-studio/template?templateId=${template.id}`);
  };

  const handleEditTemplate = (template: CatalogTemplate) => {
    navigate(`/catalog-studio/template?templateId=${template.id}&edit=true`);
  };

  // Tab configuration
  const tabs = [
    { id: 'all' as TabType, label: 'All Templates', icon: FolderOpen, count: templates.length },
    { id: 'my-templates' as TabType, label: 'My Templates', icon: Building2, count: templates.filter((t) => !t.isGlobal).length },
    { id: 'global' as TabType, label: 'Global', icon: Globe, count: templates.filter((t) => t.isGlobal).length },
    { id: 'favorites' as TabType, label: 'Favorites', icon: BookmarkCheck, count: templates.filter((t) => t.isFavorite).length },
    { id: 'drafts' as TabType, label: 'Drafts', icon: Edit, count: templates.filter((t) => t.status === 'draft').length },
  ];

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
              </p>
            </div>
          </div>
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
          {/* Search */}
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>

          {/* Sort */}
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
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name A-Z</option>
            <option value="usage">Most Used</option>
          </select>

          {/* View Toggle */}
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
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
          </div>
        ) : filteredTemplates.length === 0 ? (
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
        onDuplicate={(name) => handleDuplicate(duplicateModal?.id || '', name)}
        colors={colors}
        isDarkMode={isDarkMode}
      />

      <DeleteConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        template={deleteModal}
        onConfirm={() => handleDelete(deleteModal?.id || '')}
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

export default CatalogStudioTemplatesListPage;

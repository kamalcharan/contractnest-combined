// src/components/catalog-studio/BlockEditorPanel/index.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Copy, MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES } from '../../../utils/catalog-studio';
import * as LucideIcons from 'lucide-react';

interface BlockEditorPanelProps {
  block: Block | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: Block) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (block: Block) => void;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, defaultOpen = true, children }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
      >
        <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
        )}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const BlockEditorPanel: React.FC<BlockEditorPanelProps> = ({
  block,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [editedBlock, setEditedBlock] = useState<Block | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (block) {
      setEditedBlock({ ...block });
      setHasChanges(false);
    }
  }, [block]);

  if (!isOpen || !editedBlock) return null;

  const category = BLOCK_CATEGORIES.find((c) => c.id === editedBlock.categoryId);
  const IconComponent = category?.icon ? (LucideIcons as Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>>)[category.icon] : null;

  const handleChange = (field: keyof Block, value: unknown) => {
    setEditedBlock((prev) => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (editedBlock) {
      onSave(editedBlock);
      setHasChanges(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  return (
    <div
      className="w-80 border-l flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
      >
        <div className="flex items-center gap-3">
          {IconComponent && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.brand.primary}15` }}
            >
              <IconComponent className="w-4 h-4" style={{ color: colors.brand.primary }} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              Edit Block
            </h3>
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {category?.name || 'Block'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <div
                className="absolute right-0 top-8 w-40 rounded-lg shadow-lg border z-10 py-1"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
                }}
              >
                <button
                  onClick={() => {
                    onDuplicate(editedBlock);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100"
                  style={{ color: colors.utility.primaryText }}
                >
                  <Copy className="w-4 h-4" /> Duplicate
                </button>
                <button
                  onClick={() => {
                    onDelete(editedBlock.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50"
                  style={{ color: colors.semantic.error }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Basic Info Section */}
        <CollapsibleSection title="Basic Information">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Block Name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                value={editedBlock.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Description
              </label>
              <textarea
                value={editedBlock.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Internal Code
              </label>
              <input
                type="text"
                value={editedBlock.code || ''}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="e.g., SVC-001"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Pricing Section (for service/spare blocks) */}
        {(editedBlock.categoryId === 'service' || editedBlock.categoryId === 'spare') && (
          <CollapsibleSection title="Pricing">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Base Price
                  </label>
                  <input
                    type="number"
                    value={editedBlock.price || ''}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Currency
                  </label>
                  <select
                    value={editedBlock.currency || 'INR'}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Pricing Model
                </label>
                <select
                  value={editedBlock.pricingModel || 'fixed'}
                  onChange={(e) => handleChange('pricingModel', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Per Hour</option>
                  <option value="perUnit">Per Unit</option>
                  <option value="custom">Custom Quote</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Status Section */}
        <CollapsibleSection title="Status & Visibility">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Status
              </label>
              <select
                value={editedBlock.status || 'draft'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: editedBlock.isPublic ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => handleChange('isPublic', !editedBlock.isPublic)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: editedBlock.isPublic ? '22px' : '2px' }}
                />
              </div>
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Visible in marketplace
              </span>
            </label>
          </div>
        </CollapsibleSection>

        {/* Tags Section */}
        <CollapsibleSection title="Tags" defaultOpen={false}>
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(editedBlock.tags || []).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: `${colors.brand.primary}15`,
                    color: colors.brand.primary
                  }}
                >
                  {tag}
                  <button
                    onClick={() => {
                      const newTags = [...(editedBlock.tags || [])];
                      newTags.splice(index, 1);
                      handleChange('tags', newTags);
                    }}
                    className="hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag and press Enter"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  const value = input.value.trim();
                  if (value) {
                    handleChange('tags', [...(editedBlock.tags || []), value]);
                    input.value = '';
                  }
                }
              }}
            />
          </div>
        </CollapsibleSection>

        {/* Block Info (Read-only) */}
        <CollapsibleSection title="Block Info" defaultOpen={false}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Block ID</span>
              <span className="font-mono text-xs" style={{ color: colors.utility.primaryText }}>{editedBlock.id}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Category</span>
              <span style={{ color: colors.utility.primaryText }}>{category?.name}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Version</span>
              <span style={{ color: colors.utility.primaryText }}>{editedBlock.version || '1.0'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Usage Count</span>
              <span style={{ color: colors.utility.primaryText }}>{editedBlock.usageCount || 0}</span>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between"
        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
          style={{
            borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
            color: colors.utility.primaryText
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          style={{ backgroundColor: hasChanges ? colors.brand.primary : colors.utility.secondaryText }}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default BlockEditorPanel;

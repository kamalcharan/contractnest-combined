// src/pages/catalog-studio/template.tsx
import React, { useState } from 'react';
import { Plus, Download, Save, Eye, MoreVertical, Settings, GripVertical, Trash2, LayoutTemplate, FileText, X, Info } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block } from '../../types/catalogStudio';
import { BLOCK_CATEGORIES, getAllBlocks } from '../../utils/catalog-studio';
import { ServiceCatalogTree } from '../../components/catalog-studio';

interface TemplateBlock {
  id: string;
  blockId: string;
  block: Block;
  order: number;
  config?: Record<string, unknown>;
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

  const allBlocks = getAllBlocks();
  const [templateBlocks, setTemplateBlocks] = useState<TemplateBlock[]>([]);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplateBlock, setSelectedTemplateBlock] = useState<string | null>(null);
  const [previewBlock, setPreviewBlock] = useState<Block | null>(null);

  // Handle double-click add from tree
  const handleBlockAdd = (block: Block) => {
    const newTemplateBlock: TemplateBlock = {
      id: `tb-${Date.now()}`,
      blockId: block.id,
      block,
      order: templateBlocks.length,
      isNew: true,
    };
    setTemplateBlocks([...templateBlocks, newTemplateBlock]);

    // Remove the "new" flag after animation
    setTimeout(() => {
      setTemplateBlocks((prev) =>
        prev.map((tb) => (tb.id === newTemplateBlock.id ? { ...tb, isNew: false } : tb))
      );
    }, 1000);
  };

  // Handle single-click preview from tree
  const handleBlockPreview = (block: Block) => {
    setPreviewBlock(block);
  };

  const handleRemoveBlock = (templateBlockId: string) => {
    setTemplateBlocks(templateBlocks.filter((tb) => tb.id !== templateBlockId));
    if (selectedTemplateBlock === templateBlockId) {
      setSelectedTemplateBlock(null);
    }
  };

  const getBlockCategory = (block: Block) => {
    return BLOCK_CATEGORIES.find((c) => c.id === block.categoryId);
  };

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
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-5 h-5" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0"
              style={{ color: colors.utility.primaryText }}
            />
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Add a description..."
              className="block text-sm bg-transparent border-none outline-none focus:ring-0 w-64"
              style={{ color: colors.utility.secondaryText }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors"
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
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <Save className="w-4 h-4" />
            Save Template
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
          {/* Canvas Header - Light Primary */}
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
              <button
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {templateBlocks.map((tb, index) => {
                  const category = getBlockCategory(tb.block);
                  const BlockIcon = getIconComponent(tb.block.icon);
                  return (
                    <div
                      key={tb.id}
                      className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                        selectedTemplateBlock === tb.id ? 'ring-2' : ''
                      } ${tb.isNew ? 'animate-in slide-in-from-left-4 duration-300' : ''}`}
                      style={{
                        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                        borderColor: tb.isNew
                          ? colors.semantic.success
                          : selectedTemplateBlock === tb.id
                            ? colors.brand.primary
                            : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                        boxShadow: tb.isNew ? `0 0 0 2px ${colors.semantic.success}40` : undefined,
                      }}
                      onClick={() => setSelectedTemplateBlock(tb.id)}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <GripVertical
                            className="w-4 h-4 cursor-move"
                            style={{ color: colors.utility.secondaryText }}
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
                            className="font-semibold text-sm"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {tb.block.name}
                            {tb.isNew && (
                              <span
                                className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${colors.semantic.success}20`, color: colors.semantic.success }}
                              >
                                New
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
        {selectedTemplateBlock && !previewBlock && (
          <div
            className="w-72 border-l flex flex-col"
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
              <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Block Settings
              </h3>
              <button
                onClick={() => setSelectedTemplateBlock(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Configure block-specific settings here. Override default values for this template instance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogStudioTemplatePage;

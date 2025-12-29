// src/pages/catalog-studio/template.tsx
import React, { useState } from 'react';
import { Plus, Download, Save, Eye, MoreVertical, Settings, GripVertical, Trash2, LayoutTemplate, FileText } from 'lucide-react';
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
}

interface Template {
  id: string;
  name: string;
  description: string;
  blocks: TemplateBlock[];
  createdAt: string;
  status: 'draft' | 'active' | 'archived';
}

const CatalogStudioTemplatePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const allBlocks = getAllBlocks();
  const [templateBlocks, setTemplateBlocks] = useState<TemplateBlock[]>([]);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplateBlock, setSelectedTemplateBlock] = useState<string | null>(null);

  const handleBlockSelect = (block: Block) => {
    const newTemplateBlock: TemplateBlock = {
      id: `tb-${Date.now()}`,
      blockId: block.id,
      block,
      order: templateBlocks.length,
    };
    setTemplateBlocks([...templateBlocks, newTemplateBlock]);
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
          onBlockSelect={handleBlockSelect}
          onCategorySelect={(catId) => console.log('Category selected:', catId)}
        />

        {/* Template Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Header */}
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
                    Click on blocks from the catalog tree on the left to add them to your template.
                    Arrange and configure them to create reusable contract templates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {templateBlocks.map((tb, index) => {
                  const category = getBlockCategory(tb.block);
                  return (
                    <div
                      key={tb.id}
                      className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                        selectedTemplateBlock === tb.id ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: selectedTemplateBlock === tb.id ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
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
                          <FileText
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

                {/* Add Block Button */}
                <button
                  className="w-full p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors"
                  style={{
                    borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                    color: colors.utility.secondaryText,
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Block from Catalog</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Block Settings (when a block is selected) */}
        {selectedTemplateBlock && (
          <div
            className="w-72 border-l flex flex-col"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
            >
              <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Block Settings
              </h3>
              <button
                onClick={() => setSelectedTemplateBlock(null)}
                className="text-xs"
                style={{ color: colors.utility.secondaryText }}
              >
                Close
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

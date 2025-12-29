// src/pages/catalog-studio/configure.tsx
import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block, WizardMode } from '../../types/catalogStudio';
import { BLOCK_CATEGORIES, getBlocksByCategory, getCategoryById } from '../../utils/catalog-studio';
import { CategoryPanel, BlockGrid, BlockWizard } from '../../components/catalog-studio';

const CatalogStudioConfigurePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [selectedCategory, setSelectedCategory] = useState<string>('service');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>('create');
  const [wizardBlockType, setWizardBlockType] = useState<string>('service');
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);

  const currentCategory = getCategoryById(selectedCategory) || BLOCK_CATEGORIES[0];
  const categoryBlocks = getBlocksByCategory(selectedCategory);

  const openWizard = (mode: WizardMode, blockType?: string, block?: Block) => {
    setWizardMode(mode);
    setWizardBlockType(blockType || selectedCategory);
    setEditingBlock(block || null);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setEditingBlock(null);
  };

  const handleSaveBlock = (blockData: Partial<Block>) => {
    console.log('Saving block:', blockData);
    closeWizard();
  };

  const handleBlockClick = (block: Block) => {
    openWizard('edit', block.categoryId, block);
  };

  const handleAddBlock = () => {
    openWizard('create', selectedCategory);
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
    >
      {/* Top Bar */}
      <div
        className="border-b px-6 py-4 flex justify-between items-center"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
        }}
      >
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            Block Library
          </h1>
          <p
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            Build reusable blocks → Assemble into templates → Create contracts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            }}
          >
            <Download className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => openWizard('create')}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors"
            style={{ backgroundColor: colors.brand.primary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.primary;
            }}
          >
            <Plus className="w-4 h-4" />
            New Block
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <CategoryPanel
          categories={BLOCK_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <BlockGrid
          blocks={categoryBlocks}
          category={currentCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onBlockClick={handleBlockClick}
          onAddBlock={handleAddBlock}
        />
      </div>

      {/* Block Wizard Modal */}
      <BlockWizard
        isOpen={isWizardOpen}
        mode={wizardMode}
        blockType={wizardBlockType}
        editingBlock={editingBlock}
        onClose={closeWizard}
        onSave={handleSaveBlock}
        onBlockTypeChange={setWizardBlockType}
      />
    </div>
  );
};

export default CatalogStudioConfigurePage;

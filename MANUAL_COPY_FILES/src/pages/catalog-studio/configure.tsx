// src/pages/catalog-studio/configure.tsx
import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block, WizardMode } from '../../types/catalogStudio';
import { BLOCK_CATEGORIES, getBlocksByCategory, getCategoryById } from '../../utils/catalog-studio';
import { CategoryPanel, BlockGrid, BlockWizard, BlockEditorPanel } from '../../components/catalog-studio';

const CatalogStudioConfigurePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [selectedCategory, setSelectedCategory] = useState<string>('service');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>('create');
  const [wizardBlockType, setWizardBlockType] = useState<string>('service');
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);

  // Block Editor Panel state
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isEditorPanelOpen, setIsEditorPanelOpen] = useState<boolean>(false);

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
    // Open editor panel instead of wizard for quick edits
    setSelectedBlock(block);
    setIsEditorPanelOpen(true);
  };

  const handleBlockDoubleClick = (block: Block) => {
    // Open full wizard for complete editing
    openWizard('edit', block.categoryId, block);
  };

  const handleAddBlock = () => {
    openWizard('create', selectedCategory);
  };

  const handleEditorPanelClose = () => {
    setIsEditorPanelOpen(false);
    setSelectedBlock(null);
  };

  const handleEditorPanelSave = (block: Block) => {
    console.log('Saving block from editor panel:', block);
    // In a real app, this would update the block in state/backend
    setIsEditorPanelOpen(false);
    setSelectedBlock(null);
  };

  const handleBlockDelete = (blockId: string) => {
    console.log('Deleting block:', blockId);
    // In a real app, this would delete the block
    setIsEditorPanelOpen(false);
    setSelectedBlock(null);
  };

  const handleBlockDuplicate = (block: Block) => {
    console.log('Duplicating block:', block);
    // In a real app, this would create a copy of the block
    setIsEditorPanelOpen(false);
    setSelectedBlock(null);
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
          onBlockDoubleClick={handleBlockDoubleClick}
          onAddBlock={handleAddBlock}
          selectedBlockId={selectedBlock?.id}
        />

        {/* Block Editor Panel (Right Sidebar) */}
        <BlockEditorPanel
          block={selectedBlock}
          isOpen={isEditorPanelOpen}
          onClose={handleEditorPanelClose}
          onSave={handleEditorPanelSave}
          onDelete={handleBlockDelete}
          onDuplicate={handleBlockDuplicate}
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

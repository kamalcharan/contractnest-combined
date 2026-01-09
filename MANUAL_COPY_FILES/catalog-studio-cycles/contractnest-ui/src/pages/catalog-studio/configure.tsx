// src/pages/catalog-studio/configure.tsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import { useCatBlockMutationOperations } from '@/hooks/mutations/useCatBlocksMutations';
import { useBlockCategories } from '@/hooks/queries/useBlockTypes';
import { Block, WizardMode } from '@/types/catalogStudio';
import { BLOCK_CATEGORIES, getCategoryById } from '@/utils/catalog-studio';
import { CategoryPanel, BlockGrid, BlockWizard, BlockEditorPanel } from '@/components/catalog-studio';

const CatalogStudioConfigurePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();
  
  // API Hooks
  const { data: blocksResponse, isLoading, error, refetch } = useCatBlocksTest();
  const allBlocks: Block[] = blocksResponse?.data?.blocks || [];

  // Mutations
  const {
    createBlock,
    updateBlock,
    deleteBlock,
    isLoading: isMutating,
  } = useCatBlockMutationOperations();

  // Block Types (for getting UUID from type string)
  const { getDbIdByType } = useBlockCategories();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('service');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>('create');
  const [wizardBlockType, setWizardBlockType] = useState<string>('service');
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isEditorPanelOpen, setIsEditorPanelOpen] = useState<boolean>(false);

  // Computed
  const currentCategory = getCategoryById(selectedCategory) || BLOCK_CATEGORIES[0];
  const categoryBlocks = allBlocks.filter(block => block.categoryId === selectedCategory);
  const categoriesWithCounts = BLOCK_CATEGORIES.map(cat => ({
    ...cat,
    count: allBlocks.filter(block => block.categoryId === cat.id).length
  }));

  // Handlers
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

  const handleSaveBlock = async (blockData: any) => {
    try {
      if (wizardMode === 'edit' && editingBlock) {
        await updateBlock(editingBlock.id, {
          name: blockData.name,
          description: blockData.description,
          config: blockData.config,
          tags: blockData.tags,
        });
      } else {
        // Get the UUID for the block type from the database
        const blockTypeUuid = getDbIdByType(wizardBlockType);
        if (!blockTypeUuid) {
          console.error('Block type UUID not found for:', wizardBlockType);
          return;
        }

        await createBlock({
          name: blockData.name,
          description: blockData.description,
          block_type_id: blockTypeUuid, // Use UUID, not string
          pricing_mode_id: blockData.pricingMode || 'independent',
          config: blockData.config || {},
          tags: blockData.tags,
        });
      }
      closeWizard();
      refetch();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleDeleteBlock = async (block: Block) => {
    if (!confirm(`Are you sure you want to delete "${block.name}"?`)) {
      return;
    }
    
    try {
      await deleteBlock(block.id);
      setIsEditorPanelOpen(false);
      setSelectedBlock(null);
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleDuplicateBlock = async (block: Block) => {
    try {
      // Use existing blockTypeId if it's a UUID, otherwise look it up
      const blockTypeUuid = block.blockTypeId || getDbIdByType(block.categoryId || 'service');
      if (!blockTypeUuid) {
        console.error('Block type UUID not found for duplication');
        return;
      }

      await createBlock({
        name: `${block.name} (Copy)`,
        description: block.description,
        block_type_id: blockTypeUuid,
        pricing_mode_id: block.pricingMode || 'independent',
        config: block.config || {},
        tags: block.tags,
      });
      refetch();
    } catch (error) {
      console.error('Duplicate failed:', error);
    }
  };

  const handleEditorSave = async (updatedBlock: Block) => {
    try {
      await updateBlock(updatedBlock.id, {
        name: updatedBlock.name,
        description: updatedBlock.description,
        config: updatedBlock.config,
        tags: updatedBlock.tags,
      });
      refetch();
    } catch (error) {
      console.error('Editor save failed:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Loading blocks...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.secondaryBackground }}
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
          <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
            Block Library
          </h1>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {allBlocks.length} blocks • {isMutating ? 'Saving...' : 'Ready'}
          </p>
        </div>
        <button
          onClick={() => openWizard('create')}
          disabled={isMutating}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <Plus className="w-4 h-4" />
          New Block
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <CategoryPanel
          categories={categoriesWithCounts}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <BlockGrid
          blocks={categoryBlocks}
          category={currentCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onBlockClick={(block) => { setSelectedBlock(block); setIsEditorPanelOpen(true); }}
          onBlockDoubleClick={(block) => openWizard('edit', block.categoryId, block)}
          onAddBlock={() => openWizard('create', selectedCategory)}
          selectedBlockId={selectedBlock?.id}
        />
        <BlockEditorPanel
          block={selectedBlock}
          isOpen={isEditorPanelOpen}
          onClose={() => { setIsEditorPanelOpen(false); setSelectedBlock(null); }}
          onSave={handleEditorSave}
          onDelete={() => selectedBlock && handleDeleteBlock(selectedBlock)}
          onDuplicate={() => selectedBlock && handleDuplicateBlock(selectedBlock)}
        />
      </div>

      <BlockWizard
        isOpen={isWizardOpen}
        mode={wizardMode}
        blockType={wizardBlockType}
        editingBlock={editingBlock}
        onClose={closeWizard}
        onSave={handleSaveBlock}
        onBlockTypeChange={setWizardBlockType}
        fullPage={true}
      />
    </div>
  );
};

export default CatalogStudioConfigurePage;
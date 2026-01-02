// src/pages/catalog-studio/configure.tsx - API Integrated
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block, WizardMode } from '../../types/catalogStudio';
import { BLOCK_CATEGORIES, getCategoryById } from '../../utils/catalog-studio';
import { CategoryPanel, BlockGrid, BlockWizard, BlockEditorPanel } from '../../components/catalog-studio';

// API Hooks
import { useCatBlocks } from '../../hooks/queries/useCatBlocks';
import {
  useCreateCatBlock,
  useUpdateCatBlock,
  useDeleteCatBlock,
} from '../../hooks/mutations/useCatBlocksMutations';
import { catBlocksToBlocks, blockToCreateData, blockToUpdateData } from '../../utils/catalog-studio/catBlockAdapter';

const CatalogStudioConfigurePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ===== API HOOKS =====
  const {
    data: blocksResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useCatBlocks();

  const createBlockMutation = useCreateCatBlock();
  const updateBlockMutation = useUpdateCatBlock();
  const deleteBlockMutation = useDeleteCatBlock();

  // Convert API blocks to UI format
  const allBlocks = useMemo(() => {
    if (!blocksResponse?.data?.blocks) return [];
    return catBlocksToBlocks(blocksResponse.data.blocks);
  }, [blocksResponse]);

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

  // Filter blocks by selected category
  const categoryBlocks = useMemo(() => {
    return allBlocks.filter(block => block.categoryId === selectedCategory);
  }, [allBlocks, selectedCategory]);

  // Update category counts based on real data
  const categoriesWithCounts = useMemo(() => {
    return BLOCK_CATEGORIES.map(cat => ({
      ...cat,
      count: allBlocks.filter(block => block.categoryId === cat.id).length
    }));
  }, [allBlocks]);

  const isMutating = createBlockMutation.isPending || updateBlockMutation.isPending || deleteBlockMutation.isPending;

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

  // ===== API MUTATION HANDLERS =====
  const handleSaveBlock = useCallback(async (blockData: Partial<Block>) => {
    try {
      if (wizardMode === 'create') {
        await createBlockMutation.mutateAsync(blockToCreateData(blockData as Block));
      } else if (editingBlock) {
        await updateBlockMutation.mutateAsync({
          id: editingBlock.id,
          data: blockToUpdateData(blockData),
        });
      }
      closeWizard();
      refetch();
    } catch (error: any) {
      console.error('Failed to save block:', error);
    }
  }, [wizardMode, editingBlock, createBlockMutation, updateBlockMutation, refetch]);

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

  const handleEditorPanelSave = useCallback(async (block: Block) => {
    try {
      await updateBlockMutation.mutateAsync({
        id: block.id,
        data: blockToUpdateData(block),
      });
      setIsEditorPanelOpen(false);
      setSelectedBlock(null);
      refetch();
    } catch (error: any) {
      console.error('Failed to save block:', error);
    }
  }, [updateBlockMutation, refetch]);

  const handleBlockDelete = useCallback(async (blockId: string) => {
    try {
      await deleteBlockMutation.mutateAsync(blockId);
      setIsEditorPanelOpen(false);
      setSelectedBlock(null);
      refetch();
    } catch (error: any) {
      console.error('Failed to delete block:', error);
    }
  }, [deleteBlockMutation, refetch]);

  const handleBlockDuplicate = useCallback(async (block: Block) => {
    try {
      const duplicateData = {
        ...blockToCreateData(block),
        name: `${block.name} (Copy)`,
      };
      await createBlockMutation.mutateAsync(duplicateData);
      setIsEditorPanelOpen(false);
      setSelectedBlock(null);
      refetch();
    } catch (error: any) {
      console.error('Failed to duplicate block:', error);
    }
  }, [createBlockMutation, refetch]);

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading blocks...</p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            Failed to load blocks
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <button
            onClick={() => refetch()}
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
            {isFetching && !isLoading && (
              <span className="ml-2">
                <Loader2 className="w-3 h-3 animate-spin inline" />
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText
            }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
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
            disabled={isMutating}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary }}
            onMouseEnter={(e) => {
              if (!isMutating) e.currentTarget.style.backgroundColor = colors.brand.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.primary;
            }}
          >
            {createBlockMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Block
          </button>
        </div>
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

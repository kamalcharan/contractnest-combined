// src/pages/catalog-studio/configure.tsx
// v2.0: Added version tracking for optimistic locking and version conflict handling

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCatBlocksTest, useBlockVersionTracker, CatBlockWithVersion } from '@/hooks/queries/useCatBlocksTest';
import { useCatBlockMutationOperations } from '@/hooks/mutations/useCatBlocksMutations';
import { Block, WizardMode } from '@/types/catalogStudio';
import { BLOCK_CATEGORIES, getCategoryById } from '@/utils/catalog-studio';
import { CategoryPanel, BlockGrid, BlockWizard, BlockEditorPanel } from '@/components/catalog-studio';
import toast from 'react-hot-toast';

import {
  catBlocksToBlocks,
  blockToCreateData,
  blockToUpdateData
} from '@/utils/catalog-studio/catBlockAdapter';

// =================================================================
// VERSION CONFLICT MODAL COMPONENT
// =================================================================

interface VersionConflictModalProps {
  isOpen: boolean;
  blockName: string;
  onRefresh: () => void;
  onClose: () => void;
}

const VersionConflictModal: React.FC<VersionConflictModalProps> = ({
  isOpen,
  blockName,
  onRefresh,
  onClose
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-yellow-100">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
            Version Conflict Detected
          </h3>
        </div>

        <p className="mb-4" style={{ color: colors.utility.secondaryText }}>
          The block "{blockName}" was modified by another user while you were editing.
          Your changes cannot be saved.
        </p>

        <p className="mb-6 text-sm" style={{ color: colors.utility.secondaryText }}>
          Please refresh to get the latest version before making changes.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border"
            style={{
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
              color: colors.utility.primaryText
            }}
          >
            Cancel
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

const CatalogStudioConfigurePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { user, isLive } = useAuth();

  // API Hooks
  const { data: blocksResponse, isLoading, error, refetch } = useCatBlocksTest();

  // Version tracking for optimistic locking
  const {
    getVersion,
    updateVersion,
    initializeFromBlocks
  } = useBlockVersionTracker();

  // Version conflict state
  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    blockId: string | null;
    blockName: string;
  }>({
    isOpen: false,
    blockId: null,
    blockName: ''
  });

  // Handle version conflict callback
  const handleVersionConflict = useCallback((blockId: string, message: string) => {
    const block = blocksResponse?.data?.blocks?.find(b => b.id === blockId);
    setConflictState({
      isOpen: true,
      blockId,
      blockName: block?.name || 'Unknown Block'
    });
  }, [blocksResponse]);

  // Mutations with version conflict handling
  const {
    createBlock,
    updateBlock,
    deleteBlock,
    isLoading: isMutating,
  } = useCatBlockMutationOperations(handleVersionConflict);

  // Convert API blocks to UI blocks
  const allBlocks: Block[] = useMemo(() => {
    const rawBlocks = blocksResponse?.data?.blocks;
    if (!rawBlocks || !Array.isArray(rawBlocks)) return [];
    return catBlocksToBlocks(rawBlocks);
  }, [blocksResponse]);

  // Initialize version tracking when blocks load
  useEffect(() => {
    const rawBlocks = blocksResponse?.data?.blocks as CatBlockWithVersion[] | undefined;
    if (rawBlocks?.length) {
      initializeFromBlocks(rawBlocks);
    }
  }, [blocksResponse, initializeFromBlocks]);

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

  // Get current user ID for audit fields
  const userId = user?.id || null;

  // Calculate next sequence number for new blocks
  const getNextSequenceNo = () => {
    const categoryBlocks = allBlocks.filter(b => b.categoryId === wizardBlockType);
    return categoryBlocks.length;
  };

  // Handle save with version tracking for optimistic locking
  const handleSaveBlock = async (blockData: Partial<Block>) => {
    try {
      if (wizardMode === 'edit' && editingBlock) {
        // Get expected version for optimistic locking
        const expectedVersion = getVersion(editingBlock.id);

        console.log('📝 Updating block with expected version:', expectedVersion);

        const result = await updateBlock(
          editingBlock.id,
          blockToUpdateData(blockData, { userId }),
          expectedVersion
        );

        // Update tracked version on success
        if (result?.data?.version) {
          updateVersion(editingBlock.id, result.data.version);
        }
      } else {
        const fullBlockData = {
          ...blockData,
          categoryId: wizardBlockType,
          name: blockData.name || 'Untitled Block',
        } as Block;

        await createBlock(blockToCreateData(fullBlockData, {
          userId,
          sequenceNo: getNextSequenceNo(),
          isLive,
        }));
      }
      closeWizard();
      refetch();
    } catch (error) {
      console.error('Save failed:', error);
      // Error handling (including version conflicts) is done in the mutation hook
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

  // Handle duplicate with version tracking
  const handleDuplicateBlock = async (block: Block) => {
    try {
      const duplicateData = {
        ...blockToCreateData(block, { userId, sequenceNo: getNextSequenceNo(), isLive }),
        name: `${block.name} (Copy)`,
      };
      await createBlock(duplicateData);
      refetch();
    } catch (error) {
      console.error('Duplicate failed:', error);
    }
  };

  // Handle editor save with version tracking
  const handleEditorSave = async (updatedBlock: Block) => {
    try {
      // Get expected version for optimistic locking
      const expectedVersion = getVersion(updatedBlock.id);

      console.log('📝 Editor save with expected version:', expectedVersion);

      const result = await updateBlock(
        updatedBlock.id,
        blockToUpdateData(updatedBlock, { userId }),
        expectedVersion
      );

      // Update tracked version on success
      if (result?.data?.version) {
        updateVersion(updatedBlock.id, result.data.version);
      }

      refetch();
    } catch (error) {
      console.error('Editor save failed:', error);
      // Error handling (including version conflicts) is done in the mutation hook
    }
  };

  // Handle version conflict modal actions
  const handleConflictRefresh = async () => {
    setConflictState({ isOpen: false, blockId: null, blockName: '' });
    await refetch();
    toast.success('Data refreshed. Please try your changes again.');
  };

  const handleConflictClose = () => {
    setConflictState({ isOpen: false, blockId: null, blockName: '' });
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
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            style={{
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
              color: colors.utility.secondaryText
            }}
            title="Refresh blocks"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* New Block button */}
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
          onEdit={(block) => {
            setIsEditorPanelOpen(false);
            openWizard('edit', block.categoryId, block);
          }}
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

      {/* Version Conflict Modal */}
      <VersionConflictModal
        isOpen={conflictState.isOpen}
        blockName={conflictState.blockName}
        onRefresh={handleConflictRefresh}
        onClose={handleConflictClose}
      />
    </div>
  );
};

export default CatalogStudioConfigurePage;

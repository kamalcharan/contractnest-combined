// src/pages/catalog-studio/configure.tsx
import React, { useState, useMemo } from 'react';
import { Plus, Boxes, Palette, Layers, Wand2, Grid3X3, Sparkles, Tag, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';

// Coming soon features for Catalog Studio
const catalogStudioFeatures = [
  {
    icon: Boxes,
    title: 'Block Library Management',
    description: 'Create and manage reusable content blocks. Services, terms, pricing - all modular and drag-drop ready.',
    highlight: true
  },
  {
    icon: Wand2,
    title: 'Template Builder',
    description: 'Design professional contract templates visually. Combine blocks, customize layouts, and maintain brand consistency.',
    highlight: false
  },
  {
    icon: Tag,
    title: 'Dynamic Pricing Configuration',
    description: 'Set up flexible pricing models. Quantity-based, tiered, or custom formulas - all configurable without code.',
    highlight: false
  },
  {
    icon: Palette,
    title: 'Brand Customization',
    description: 'Apply your branding to every output. Colors, fonts, logos - make every document unmistakably yours.',
    highlight: false
  }
];

// Floating icons for catalog studio
const catalogStudioFloatingIcons = [
  { Icon: Boxes, top: '10%', left: '4%', delay: '0s', duration: '20s' },
  { Icon: Layers, top: '18%', right: '6%', delay: '2s', duration: '18s' },
  { Icon: Grid3X3, top: '58%', left: '5%', delay: '3.5s', duration: '22s' },
  { Icon: Wand2, top: '68%', right: '5%', delay: '1s', duration: '19s' },
  { Icon: Sparkles, top: '38%', left: '6%', delay: '2.5s', duration: '21s' },
  { Icon: Settings, top: '48%', right: '7%', delay: '4s', duration: '17s' },
];
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import { useCatBlockMutationOperations } from '@/hooks/mutations/useCatBlocksMutations';
import { Block, WizardMode } from '@/types/catalogStudio';
import { BLOCK_CATEGORIES, getCategoryById } from '@/utils/catalog-studio';
import { CategoryPanel, BlockGrid, BlockWizard, BlockEditorPanel } from '@/components/catalog-studio';

// ✅ FIX: Import ALL adapter functions for proper field mapping
import {
  catBlocksToBlocks,
  blockToCreateData,
  blockToUpdateData
} from '@/utils/catalog-studio/catBlockAdapter';

const CatalogStudioConfigurePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { user, isLive } = useAuth();

  // API Hooks
  const { data: blocksResponse, isLoading, error, refetch } = useCatBlocksTest();

  // ✅ FIX: Use adapter to convert API blocks (CatBlock) to UI blocks (Block)
  const allBlocks: Block[] = useMemo(() => {
    const rawBlocks = blocksResponse?.data?.blocks;
    if (!rawBlocks || !Array.isArray(rawBlocks)) return [];
    return catBlocksToBlocks(rawBlocks);
  }, [blocksResponse]);

  // Mutations
  const {
    createBlock,
    updateBlock,
    deleteBlock,
    isLoading: isMutating,
  } = useCatBlockMutationOperations();

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

  // ✅ FIX: Use adapter for proper field mapping with user tracking and environment
  const handleSaveBlock = async (blockData: Partial<Block>) => {
    try {
      if (wizardMode === 'edit' && editingBlock) {
        // ✅ Use blockToUpdateData adapter for updates with userId
        await updateBlock(editingBlock.id, blockToUpdateData(blockData, { userId }));
      } else {
        // ✅ Use blockToCreateData adapter for creates with userId, sequenceNo, and isLive
        const fullBlockData = {
          ...blockData,
          categoryId: wizardBlockType,
          name: blockData.name || 'Untitled Block',
        } as Block;
        await createBlock(blockToCreateData(fullBlockData, {
          userId,
          sequenceNo: getNextSequenceNo(),
          isLive, // ✅ Pass environment flag
        }));
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

  // ✅ FIX: Use adapter for duplicate with userId and isLive
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

  // ✅ FIX: Use adapter for editor save with userId
  const handleEditorSave = async (updatedBlock: Block) => {
    try {
      await updateBlock(updatedBlock.id, blockToUpdateData(updatedBlock, { userId }));
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
    </div>
  );
};

// Wrapped Catalog Studio with Coming Soon
const CatalogStudioConfigurePageWithComingSoon: React.FC = () => {
  return (
    <ComingSoonWrapper
      pageKey="catalog-studio"
      title="Catalog Studio"
      subtitle="Your creative workspace for contract building blocks. Design reusable components, build templates, and configure pricing - all with visual tools."
      heroIcon={Boxes}
      features={catalogStudioFeatures}
      floatingIcons={catalogStudioFloatingIcons}
    >
      <CatalogStudioConfigurePage />
    </ComingSoonWrapper>
  );
};

export default CatalogStudioConfigurePageWithComingSoon;

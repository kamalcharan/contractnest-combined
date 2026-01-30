// src/components/catalog-studio/BlockLibraryMini.tsx
// Compact block library for contract wizard - Column 1
// Features: collapsible categories, search, block cards with add button

import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Package, SearchX, RefreshCw, Plus, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import { catBlocksToBlocks } from '@/utils/catalog-studio/catBlockAdapter';
import { BLOCK_CATEGORIES, getCategoryById } from '@/utils/catalog-studio';
import { Block } from '@/types/catalogStudio';
import BlockCardSelectable from './BlockCardSelectable';

// FlyBy-enabled category IDs
export type FlyByCategoryId = 'service' | 'spare' | 'text' | 'document';

export interface BlockLibraryMiniProps {
  selectedBlockIds: string[];
  onAddBlock: (block: Block) => void;
  onBlockClick?: (block: Block) => void;
  maxHeight?: string;
  // FlyBy support
  flyByTypes?: FlyByCategoryId[];
  onAddFlyByBlock?: (type: FlyByCategoryId) => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>
  >;
  return iconsMap[iconName] || LucideIcons.Folder;
};

const BlockLibraryMini: React.FC<BlockLibraryMiniProps> = ({
  selectedBlockIds,
  onAddBlock,
  onBlockClick,
  maxHeight = '100%',
  flyByTypes = [],
  onAddFlyByBlock,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch blocks
  const { data: blocksResponse, isLoading, error, refetch } = useCatBlocksTest();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['service']); // Default expand services

  // Convert API blocks to UI blocks
  const allBlocks: Block[] = useMemo(() => {
    const rawBlocks = blocksResponse?.data?.blocks;
    if (!rawBlocks || !Array.isArray(rawBlocks)) return [];
    return catBlocksToBlocks(rawBlocks);
  }, [blocksResponse]);

  // Get categories with counts
  // Show categories that have blocks OR have FlyBy enabled
  const categoriesWithCounts = useMemo(() => {
    return BLOCK_CATEGORIES.map((cat) => ({
      ...cat,
      count: allBlocks.filter((block) => block.categoryId === cat.id).length,
      blocks: allBlocks.filter((block) => block.categoryId === cat.id),
      hasFlyBy: flyByTypes.includes(cat.id as FlyByCategoryId),
    })).filter((cat) => cat.count > 0 || cat.hasFlyBy);
  }, [allBlocks, flyByTypes]);

  // Filter blocks by search
  // FlyBy categories remain visible even during search (user may want to add empty block)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithCounts;

    const query = searchQuery.toLowerCase();
    return categoriesWithCounts
      .map((cat) => ({
        ...cat,
        blocks: cat.blocks.filter(
          (block) =>
            block.name.toLowerCase().includes(query) ||
            (block.description || '').toLowerCase().includes(query)
        ),
        count: cat.blocks.filter(
          (block) =>
            block.name.toLowerCase().includes(query) ||
            (block.description || '').toLowerCase().includes(query)
        ).length,
      }))
      .filter((cat) => cat.count > 0 || cat.hasFlyBy);
  }, [categoriesWithCounts, searchQuery]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  // Check if block is selected
  const isBlockSelected = (blockId: string) => selectedBlockIds.includes(blockId);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-2"
          style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }}
        />
        <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
          Loading blocks...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-4 text-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: `${colors.semantic.error}15` }}
        >
          <Package className="w-6 h-6" style={{ color: colors.semantic.error }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: colors.utility.primaryText }}>
          Failed to load blocks
        </p>
        <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
          {(error as Error)?.message || 'An error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden rounded-xl border"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}10`,
        maxHeight,
      }}
    >
      {/* Header */}
      <div
        className="p-3 border-b flex-shrink-0"
        style={{ borderColor: `${colors.utility.primaryText}10` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4" style={{ color: colors.brand.primary }} />
          <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            Block Library
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
            style={{
              backgroundColor: `${colors.brand.primary}15`,
              color: colors.brand.primary,
            }}
          >
            {allBlocks.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: colors.utility.secondaryText }}
          />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: `${colors.utility.primaryText}15`,
              color: colors.utility.primaryText,
            }}
          />
        </div>
      </div>

      {/* Categories & Blocks */}
      <div
        className="flex-1 overflow-y-auto p-2"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <SearchX className="w-10 h-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              No blocks found
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map((category) => {
              const isExpanded = expandedCategories.includes(category.id) || searchQuery.trim() !== '';
              const CategoryIcon = getIconComponent(category.icon || 'Folder');
              const categoryObj = getCategoryById(category.id);

              return (
                <div key={category.id} className="rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: isExpanded
                        ? `${category.color}15`
                        : colors.utility.secondaryBackground,
                    }}
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      style={{ color: category.color }}
                    />
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: category.bgColor }}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" style={{ color: category.color }} />
                    </div>
                    <span
                      className="text-xs font-medium flex-1 text-left"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {category.name}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${colors.utility.primaryText}10`,
                        color: colors.utility.secondaryText,
                      }}
                    >
                      {category.count}
                    </span>
                  </button>

                  {/* Blocks Grid */}
                  {isExpanded && (
                    <div className="p-2 space-y-2">
                      {category.blocks.map((block) => (
                        <BlockCardSelectable
                          key={block.id}
                          block={block}
                          category={categoryObj!}
                          isSelected={isBlockSelected(block.id)}
                          onAdd={onAddBlock}
                          onClick={onBlockClick}
                        />
                      ))}

                      {/* FlyBy Card - last item in group */}
                      {category.hasFlyBy && onAddFlyByBlock && (
                        <button
                          onClick={() => onAddFlyByBlock(category.id as FlyByCategoryId)}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 border-dashed transition-all hover:opacity-80"
                          style={{
                            borderColor: `${category.color}40`,
                            backgroundColor: colors.utility.secondaryBackground,
                          }}
                        >
                          <div
                            className="relative w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: category.bgColor }}
                          >
                            <CategoryIcon className="w-4 h-4" style={{ color: category.color }} />
                            <div
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: category.color }}
                            >
                              <Zap className="w-2.5 h-2.5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 text-left">
                            <span
                              className="text-xs font-semibold block"
                              style={{ color: colors.utility.primaryText }}
                            >
                              Add {category.name}
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              FlyBy - enter details inline
                            </span>
                          </div>
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div
        className="p-2 border-t flex-shrink-0"
        style={{
          borderColor: `${colors.utility.primaryText}10`,
          backgroundColor: colors.utility.secondaryBackground,
        }}
      >
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: colors.utility.secondaryText }}>
            {selectedBlockIds.length} selected
          </span>
          <span style={{ color: colors.utility.secondaryText }}>
            {filteredCategories.reduce((sum, cat) => sum + cat.count, 0)} available
          </span>
        </div>
      </div>
    </div>
  );
};

export default BlockLibraryMini;

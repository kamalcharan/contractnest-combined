// src/components/contracts/ContractWizard/steps/BlockSelectionStep.tsx
// Step 4: Add Service Blocks - Two-panel layout with library and selected blocks
// FIXED: Using useCatBlocksTest hook and catBlocksToBlocks adapter (correct implementation)
import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  X,
  Package,
  ChevronDown,
  ShoppingCart,
  Check,
  RefreshCw,
  Infinity,
  AlertCircle,
  SearchX,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import { catBlocksToBlocks } from '@/utils/catalog-studio/catBlockAdapter';
import { BLOCK_CATEGORIES, getCategoryById } from '@/utils/catalog-studio';
import { Block } from '@/types/catalogStudio';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { getCurrencySymbol } from '@/utils/constants/currencies';

// Block cycle options
const CYCLE_OPTIONS = [
  { id: 'one_time', label: 'One-time', icon: 'Zap' },
  { id: 'monthly', label: 'Monthly', icon: 'Calendar' },
  { id: 'quarterly', label: 'Quarterly', icon: 'CalendarDays' },
  { id: 'annually', label: 'Annually', icon: 'CalendarRange' },
] as const;

export interface SelectedBlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  cycle: string;
  unlimited: boolean;
  price: number;
  currency: string;
  totalPrice: number;
  categoryName: string;
  categoryColor: string;
}

interface BlockSelectionStepProps {
  selectedBlocks: SelectedBlock[];
  currency: string;
  onBlocksChange: (blocks: SelectedBlock[]) => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>
  >;
  return iconsMap[iconName] || LucideIcons.Circle;
};

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
};

const BlockSelectionStep: React.FC<BlockSelectionStepProps> = ({
  selectedBlocks,
  currency,
  onBlocksChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // Fetch blocks using the CORRECT hook - useCatBlocksTest
  const { data: blocksResponse, isLoading, error, refetch } = useCatBlocksTest();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Convert API blocks to UI blocks using the adapter
  const allBlocks: Block[] = useMemo(() => {
    const rawBlocks = blocksResponse?.data?.blocks;
    if (!rawBlocks || !Array.isArray(rawBlocks)) return [];
    return catBlocksToBlocks(rawBlocks);
  }, [blocksResponse]);

  // Get categories with counts
  const categoriesWithCounts = useMemo(() => {
    return BLOCK_CATEGORIES.map(cat => ({
      ...cat,
      count: allBlocks.filter(block => block.categoryId === cat.id).length
    }));
  }, [allBlocks]);

  // Filter blocks by search and category
  const filteredBlocks = useMemo(() => {
    return allBlocks.filter((block) => {
      const matchesSearch =
        searchQuery === '' ||
        block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (block.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === null || block.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allBlocks, searchQuery, selectedCategory]);

  // Check if block is selected
  const isBlockSelected = useCallback(
    (blockId: string) => {
      return selectedBlocks.some((b) => b.id === blockId);
    },
    [selectedBlocks]
  );

  // Add block
  const handleAddBlock = useCallback(
    (block: Block) => {
      if (isBlockSelected(block.id)) {
        addToast({
          type: 'warning',
          title: 'Block already added',
          message: `${block.name} is already in your selection`,
        });
        return;
      }

      // Get category info
      const category = getCategoryById(block.categoryId);

      const newBlock: SelectedBlock = {
        id: block.id,
        name: block.name,
        description: block.description || '',
        icon: block.icon || 'Package',
        quantity: 1,
        cycle: 'one_time',
        unlimited: false,
        price: block.price || 0,
        currency: block.currency || currency,
        totalPrice: block.price || 0,
        categoryName: category?.name || block.categoryId,
        categoryColor: category?.color || '#6B7280',
      };

      onBlocksChange([...selectedBlocks, newBlock]);
      addToast({
        type: 'success',
        title: 'Block added',
        message: `${block.name} added to contract`,
      });
    },
    [selectedBlocks, onBlocksChange, isBlockSelected, addToast, currency]
  );

  // Remove block
  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      const block = selectedBlocks.find((b) => b.id === blockId);
      onBlocksChange(selectedBlocks.filter((b) => b.id !== blockId));
      if (block) {
        addToast({
          type: 'info',
          title: 'Block removed',
          message: `${block.name} removed from contract`,
        });
      }
    },
    [selectedBlocks, onBlocksChange, addToast]
  );

  // Update block configuration
  const handleUpdateBlock = useCallback(
    (blockId: string, updates: Partial<SelectedBlock>) => {
      onBlocksChange(
        selectedBlocks.map((block) => {
          if (block.id === blockId) {
            const updated = { ...block, ...updates };
            // Recalculate total price
            updated.totalPrice = updated.unlimited
              ? updated.price
              : updated.price * updated.quantity;
            return updated;
          }
          return block;
        })
      );
    },
    [selectedBlocks, onBlocksChange]
  );

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = selectedBlocks.reduce((sum, b) => sum + b.totalPrice, 0);
    return {
      subtotal,
      count: selectedBlocks.length,
    };
  }, [selectedBlocks]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <VaNiLoader size="md" message="LOADING BLOCKS" showSkeleton skeletonVariant="card" skeletonCount={6} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: `${colors.semantic.error}15` }}
        >
          <AlertCircle className="w-8 h-8" style={{ color: colors.semantic.error }} />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
          Failed to load blocks
        </h3>
        <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
          {(error as Error)?.message || 'An error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-[60vh]"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="text-center pt-6 pb-4 px-4">
        <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
          Add Service Blocks
        </h2>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          Select the services and items to include in this contract
        </p>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 pb-6">
        {/* Left Panel: Block Library */}
        <div
          className="flex-1 rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Library Header */}
          <div
            className="p-4 border-b flex flex-col sm:flex-row gap-3"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                type="text"
                placeholder="Search blocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border-2"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}15`,
                  color: colors.utility.primaryText,
                }}
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm min-w-[160px] justify-between"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}15`,
                  color: colors.utility.primaryText,
                }}
              >
                <span>
                  {selectedCategory
                    ? getCategoryById(selectedCategory)?.name
                    : 'All Categories'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCategoryDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-20 py-1 max-h-60 overflow-auto"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: `${colors.utility.primaryText}15`,
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:opacity-80 flex items-center gap-2"
                    style={{
                      color: colors.utility.primaryText,
                      backgroundColor: selectedCategory === null ? `${colors.brand.primary}10` : 'transparent',
                    }}
                  >
                    <Package className="w-4 h-4" />
                    All Categories
                  </button>
                  {categoriesWithCounts.map((category) => {
                    const CategoryIcon = getIconComponent(category.icon || 'Folder');
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:opacity-80 flex items-center gap-2"
                        style={{
                          color: colors.utility.primaryText,
                          backgroundColor:
                            selectedCategory === category.id ? `${colors.brand.primary}10` : 'transparent',
                        }}
                      >
                        <CategoryIcon className="w-4 h-4" style={{ color: category.color }} />
                        {category.name}
                        <span className="ml-auto text-xs" style={{ color: colors.utility.secondaryText }}>
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Block Grid */}
          <div
            className="p-4 overflow-y-auto"
            style={{ maxHeight: '500px', backgroundColor: colors.utility.primaryBackground }}
          >
            {filteredBlocks.length === 0 ? (
              <div className="text-center py-12">
                <SearchX
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: colors.utility.secondaryText }}
                />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No blocks found
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredBlocks.map((block) => {
                  const IconComponent = getIconComponent(block.icon);
                  const isSelected = isBlockSelected(block.id);
                  const category = getCategoryById(block.categoryId);

                  return (
                    <div
                      key={block.id}
                      className="p-4 rounded-xl border-2 transition-all"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: isSelected
                          ? colors.semantic.success
                          : `${colors.utility.primaryText}10`,
                        opacity: isSelected ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: category?.bgColor || `${colors.brand.primary}15` }}
                        >
                          <IconComponent className="w-5 h-5" style={{ color: category?.color || colors.brand.primary }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-semibold text-sm truncate"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {block.name}
                          </h4>
                          <p
                            className="text-xs line-clamp-2 mb-2"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {block.description || 'No description'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: category?.bgColor || `${colors.utility.primaryText}10`,
                                color: category?.color || colors.utility.secondaryText,
                              }}
                            >
                              {category?.name || block.categoryId}
                            </span>
                            {(block.price || 0) > 0 && (
                              <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                                {formatCurrency(block.price || 0, block.currency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddBlock(block)}
                        disabled={isSelected}
                        className="w-full mt-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        style={{
                          backgroundColor: isSelected ? `${colors.semantic.success}15` : colors.brand.primary,
                          color: isSelected ? colors.semantic.success : '#fff',
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add to Contract
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Selected Blocks */}
        <div
          className="lg:w-[400px] rounded-2xl border overflow-hidden flex flex-col"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Selected Header */}
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: colors.brand.primary }} />
              <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                Selected Blocks
              </span>
              {totals.count > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#fff',
                  }}
                >
                  {totals.count}
                </span>
              )}
            </div>
            <span className="font-bold" style={{ color: colors.brand.primary }}>
              {formatCurrency(totals.subtotal, currency)}
            </span>
          </div>

          {/* Selected Blocks List */}
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ maxHeight: '400px', backgroundColor: colors.utility.primaryBackground }}
          >
            {selectedBlocks.length === 0 ? (
              <div className="text-center py-12">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <Package className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  No blocks selected
                </p>
                <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                  Add blocks from the library to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedBlocks.map((block) => {
                  const IconComponent = getIconComponent(block.icon);

                  return (
                    <div
                      key={block.id}
                      className="p-4 rounded-xl border"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: `${colors.utility.primaryText}10`,
                      }}
                    >
                      {/* Block Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${block.categoryColor}20` }}
                        >
                          <IconComponent className="w-4 h-4" style={{ color: block.categoryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-semibold text-sm truncate"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {block.name}
                          </h4>
                          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            {block.categoryName}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveBlock(block.id)}
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: colors.semantic.error }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity & Cycle */}
                      <div className="flex items-center gap-2 mb-3">
                        {/* Quantity */}
                        <div
                          className="flex items-center gap-1 rounded-lg border px-2 py-1"
                          style={{ borderColor: `${colors.utility.primaryText}20` }}
                        >
                          <button
                            onClick={() =>
                              handleUpdateBlock(block.id, {
                                quantity: Math.max(1, block.quantity - 1),
                              })
                            }
                            disabled={block.unlimited}
                            className="p-1 rounded hover:opacity-80 disabled:opacity-40"
                            style={{ color: colors.utility.primaryText }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className="w-8 text-center text-sm font-medium"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {block.unlimited ? '∞' : block.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdateBlock(block.id, {
                                quantity: block.quantity + 1,
                              })
                            }
                            disabled={block.unlimited}
                            className="p-1 rounded hover:opacity-80 disabled:opacity-40"
                            style={{ color: colors.utility.primaryText }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Cycle Dropdown */}
                        <select
                          value={block.cycle}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { cycle: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: `${colors.utility.primaryText}20`,
                            color: colors.utility.primaryText,
                          }}
                        >
                          {CYCLE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {/* Unlimited Toggle */}
                        <button
                          onClick={() =>
                            handleUpdateBlock(block.id, { unlimited: !block.unlimited })
                          }
                          className="p-1.5 rounded-lg border transition-colors"
                          style={{
                            backgroundColor: block.unlimited
                              ? `${colors.brand.primary}15`
                              : 'transparent',
                            borderColor: block.unlimited
                              ? colors.brand.primary
                              : `${colors.utility.primaryText}20`,
                            color: block.unlimited
                              ? colors.brand.primary
                              : colors.utility.secondaryText,
                          }}
                          title="Unlimited"
                        >
                          <Infinity className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div
                        className="flex items-center justify-between pt-2 border-t"
                        style={{ borderColor: `${colors.utility.primaryText}10` }}
                      >
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {block.price > 0
                            ? `${formatCurrency(block.price, block.currency)} × ${
                                block.unlimited ? '∞' : block.quantity
                              }`
                            : 'No price set'}
                        </span>
                        <span className="font-bold" style={{ color: colors.brand.primary }}>
                          {formatCurrency(block.totalPrice, block.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {selectedBlocks.length > 0 && (
            <div
              className="p-4 border-t"
              style={{
                borderColor: `${colors.utility.primaryText}10`,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  Subtotal ({totals.count} blocks)
                </span>
                <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                  {formatCurrency(totals.subtotal, currency)}
                </span>
              </div>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Tax and discounts will be calculated in the review step
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockSelectionStep;

// src/pages/catalog-studio/blocks.tsx - Block Library Page (API Integrated)
// Updated: Use URL navigation instead of inline wizard for better space utilization
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Grid3X3, List, Plus, Download, ChevronDown, X, Tag, Clock, DollarSign, Check, AlertCircle, MoreVertical, Edit2, Copy, Trash2, Eye, SlidersHorizontal, Loader2, RefreshCw, Boxes, Palette, Layers, Wand2, Sparkles, Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';

const catalogStudioFeatures = [
  { icon: Boxes, title: 'Block Library Management', description: 'Create and manage reusable content blocks. Services, terms, pricing - all modular and drag-drop ready.', highlight: true },
  { icon: Wand2, title: 'Template Builder', description: 'Design professional contract templates visually. Combine blocks, customize layouts, and maintain brand consistency.', highlight: false },
  { icon: Tag, title: 'Dynamic Pricing Configuration', description: 'Set up flexible pricing models. Quantity-based, tiered, or custom formulas - all configurable without code.', highlight: false },
  { icon: Palette, title: 'Brand Customization', description: 'Apply your branding to every output. Colors, fonts, logos - make every document unmistakably yours.', highlight: false }
];
const catalogStudioFloatingIcons = [
  { Icon: Boxes, top: '10%', left: '4%', delay: '0s', duration: '20s' },
  { Icon: Layers, top: '18%', right: '6%', delay: '2s', duration: '18s' },
  { Icon: Wand2, top: '68%', right: '5%', delay: '1s', duration: '19s' },
  { Icon: Sparkles, top: '38%', left: '6%', delay: '2.5s', duration: '21s' },
];
import { Block } from '../../types/catalogStudio';
import { BLOCK_CATEGORIES, getCategoryById } from '../../utils/catalog-studio';
import { BlockEditorPanel } from '../../components/catalog-studio';

// API Hooks
import { useCatBlocks } from '../../hooks/queries/useCatBlocks';
import {
  useCreateCatBlock,
  useUpdateCatBlock,
  useDeleteCatBlock,
} from '../../hooks/mutations/useCatBlocksMutations';
import { catBlocksToBlocks, blockToCreateData, blockToUpdateData } from '../../utils/catalog-studio/catBlockAdapter';

// Toast notification types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

// Toast Notification Component
const ToastNotification: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ toast, onDismiss, colors, isDarkMode }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return { bg: colors.semantic.success, icon: <Check className="w-4 h-4" /> };
      case 'error':
        return { bg: colors.semantic.error, icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return { bg: colors.brand.primary, icon: <AlertCircle className="w-4 h-4" /> };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-4 duration-300 min-w-[280px]"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        border: `1px solid ${styles.bg}40`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${styles.bg}20`, color: styles.bg }}
      >
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ color: colors.utility.secondaryText }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'category' | 'price' | 'recent';

const CatalogStudioBlocksPage: React.FC = () => {
  const navigate = useNavigate();
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

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Editor panel state (wizard uses URL navigation now)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isEditorPanelOpen, setIsEditorPanelOpen] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Preview state
  const [previewBlock, setPreviewBlock] = useState<Block | null>(null);

  // Toast helper
  const showToast = useCallback((type: Toast['type'], title: string, description?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Filter and sort blocks
  const filteredBlocks = useMemo(() => {
    let blocks = [...allBlocks];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      blocks = blocks.filter(
        (block) =>
          block.name.toLowerCase().includes(query) ||
          block.description.toLowerCase().includes(query) ||
          block.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by categories
    if (selectedCategories.size > 0) {
      blocks = blocks.filter((block) => selectedCategories.has(block.categoryId));
    }

    // Filter by price range
    if (priceRange.min !== null) {
      blocks = blocks.filter((block) => (block.price || 0) >= priceRange.min!);
    }
    if (priceRange.max !== null) {
      blocks = blocks.filter((block) => (block.price || 0) <= priceRange.max!);
    }

    // Sort blocks
    switch (sortBy) {
      case 'name':
        blocks.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        blocks.sort((a, b) => a.categoryId.localeCompare(b.categoryId));
        break;
      case 'price':
        blocks.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'recent':
        blocks.sort((a, b) => {
          const aDate = a.meta?.updated_at ? new Date(String(a.meta.updated_at)).getTime() : 0;
          const bDate = b.meta?.updated_at ? new Date(String(b.meta.updated_at)).getTime() : 0;
          return bDate - aDate;
        });
        break;
    }

    return blocks;
  }, [allBlocks, searchQuery, selectedCategories, priceRange, sortBy]);

  // Category toggle
  const toggleCategory = (categoryId: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(categoryId)) {
      newCategories.delete(categoryId);
    } else {
      newCategories.add(categoryId);
    }
    setSelectedCategories(newCategories);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories(new Set());
    setPriceRange({ min: null, max: null });
    setSortBy('name');
  };

  // Navigation handlers (replaced inline wizard with URL-based navigation)
  const navigateToCreateBlock = (blockType?: string) => {
    const typeParam = blockType ? `?type=${blockType}` : '';
    navigate(`/catalog-studio/blocks/new${typeParam}`);
  };

  const navigateToEditBlock = (block: Block) => {
    navigate(`/catalog-studio/blocks/${block.id}/edit`);
  };

  // Block actions
  const handleBlockClick = (block: Block) => {
    setSelectedBlock(block);
    setIsEditorPanelOpen(true);
  };

  const handleBlockDoubleClick = (block: Block) => {
    navigateToEditBlock(block);
  };

  const handleBlockPreview = (block: Block) => {
    setPreviewBlock(block);
  };

  const handleBlockDuplicate = async (block: Block) => {
    try {
      const duplicateData = {
        ...blockToCreateData(block),
        name: `${block.name} (Copy)`,
      };
      await createBlockMutation.mutateAsync(duplicateData);
      showToast('success', 'Block duplicated', `${block.name} (Copy)`);
      refetch();
    } catch (error: any) {
      console.error('Failed to duplicate block:', error);
      showToast('error', 'Failed to duplicate block', error.message);
    }
  };

  const handleBlockDelete = async (blockId: string) => {
    try {
      await deleteBlockMutation.mutateAsync(blockId);
      showToast('success', 'Block deleted');
      setIsEditorPanelOpen(false);
      setSelectedBlock(null);
      refetch();
    } catch (error: any) {
      console.error('Failed to delete block:', error);
      showToast('error', 'Failed to delete block', error.message);
    }
  };

  const handleEditorPanelClose = () => {
    setIsEditorPanelOpen(false);
    setSelectedBlock(null);
  };

  const handleEditorPanelSave = async (block: Block) => {
    try {
      await updateBlockMutation.mutateAsync({
        id: block.id,
        data: blockToUpdateData(block),
      });
      showToast('success', 'Block updated', block.name);
      setIsEditorPanelOpen(false);
      setSelectedBlock(null);
      refetch();
    } catch (error: any) {
      console.error('Failed to save block:', error);
      showToast('error', 'Failed to save block', error.message);
    }
  };

  // Get category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allBlocks.forEach((block) => {
      stats[block.categoryId] = (stats[block.categoryId] || 0) + 1;
    });
    return stats;
  }, [allBlocks]);

  const hasActiveFilters = searchQuery || selectedCategories.size > 0 || priceRange.min !== null || priceRange.max !== null;

  const isMutating = createBlockMutation.isPending || updateBlockMutation.isPending || deleteBlockMutation.isPending;

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.utility.secondaryBackground }}
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
        style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.utility.secondaryBackground }}
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
        className="border-b px-6 py-4"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
              Block Library
            </h1>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {filteredBlocks.length} of {allBlocks.length} blocks
              {hasActiveFilters && ' (filtered)'}
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
            >
              <Download className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => navigateToCreateBlock()}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Plus className="w-4 h-4" />
              New Block
            </button>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks by name, description, or tags..."
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                color: colors.utility.primaryText,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: showFilters || hasActiveFilters ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
              borderColor: showFilters || hasActiveFilters ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB'),
              color: showFilters || hasActiveFilters ? colors.brand.primary : colors.utility.primaryText,
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
                style={{ backgroundColor: colors.brand.primary }}
              >
                {(selectedCategories.size > 0 ? 1 : 0) + (priceRange.min !== null || priceRange.max !== null ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg cursor-pointer"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                color: colors.utility.primaryText,
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="price">Sort by Price</option>
              <option value="recent">Sort by Recent</option>
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: colors.utility.secondaryText }}
            />
          </div>

          {/* View Toggle */}
          <div
            className="flex rounded-lg border overflow-hidden"
            style={{ borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 transition-colors"
              style={{
                backgroundColor: viewMode === 'grid' ? colors.brand.primary : colors.utility.primaryBackground,
                color: viewMode === 'grid' ? '#FFFFFF' : colors.utility.secondaryText,
              }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 transition-colors"
              style={{
                backgroundColor: viewMode === 'list' ? colors.brand.primary : colors.utility.primaryBackground,
                color: viewMode === 'list' ? '#FFFFFF' : colors.utility.secondaryText,
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div
            className="mt-4 pt-4 border-t animate-in slide-in-from-top-2 duration-200"
            style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
          >
            <div className="flex items-start justify-between gap-6">
              {/* Category Filter */}
              <div className="flex-1">
                <div className="text-xs font-medium mb-2" style={{ color: colors.utility.secondaryText }}>
                  Categories
                </div>
                <div className="flex flex-wrap gap-2">
                  {BLOCK_CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.has(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5"
                        style={{
                          backgroundColor: isSelected ? category.bgColor : (isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6'),
                          color: isSelected ? category.color : colors.utility.secondaryText,
                          border: `1px solid ${isSelected ? category.color : 'transparent'}`,
                        }}
                      >
                        {category.name}
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px]"
                          style={{
                            backgroundColor: isSelected ? `${category.color}20` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                          }}
                        >
                          {categoryStats[category.id] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="w-64">
                <div className="text-xs font-medium mb-2" style={{ color: colors.utility.secondaryText }}>
                  Price Range
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={priceRange.min ?? ''}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Min"
                    className="flex-1 px-3 py-1.5 text-xs border rounded-lg"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                      color: colors.utility.primaryText,
                    }}
                  />
                  <span style={{ color: colors.utility.secondaryText }}>-</span>
                  <input
                    type="number"
                    value={priceRange.max ?? ''}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Max"
                    className="flex-1 px-3 py-1.5 text-xs border rounded-lg"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                      color: colors.utility.primaryText,
                    }}
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{ color: colors.semantic.error }}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Grid/List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredBlocks.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4" style={{ color: colors.utility.secondaryText }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  No blocks found
                </h3>
                <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: colors.utility.secondaryText }}>
                  {hasActiveFilters
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Get started by creating your first block.'}
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm font-medium rounded-lg"
                    style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigateToCreateBlock()}
                    className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 mx-auto"
                    style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                  >
                    <Plus className="w-4 h-4" />
                    Create Block
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBlocks.map((block) => {
                const category = getCategoryById(block.categoryId);
                const BlockIcon = getIconComponent(block.icon);
                return (
                  <div
                    key={block.id}
                    onClick={() => handleBlockClick(block)}
                    onDoubleClick={() => handleBlockDoubleClick(block)}
                    className="group rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category?.bgColor || '#F3F4F6' }}
                      >
                        <BlockIcon
                          className="w-6 h-6"
                          style={{ color: category?.color || colors.utility.secondaryText }}
                        />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBlockPreview(block); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          style={{ color: colors.utility.secondaryText }}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBlockDuplicate(block); }}
                          disabled={isMutating}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                          style={{ color: colors.utility.secondaryText }}
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="text-xs px-2 py-0.5 rounded-full inline-block mb-2"
                      style={{
                        backgroundColor: category?.bgColor || '#F3F4F6',
                        color: category?.color || colors.utility.secondaryText,
                      }}
                    >
                      {category?.name}
                    </div>

                    <h4 className="font-semibold text-sm mb-1" style={{ color: colors.utility.primaryText }}>
                      {block.name}
                    </h4>
                    <p
                      className="text-xs line-clamp-2 mb-3"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {block.description}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {block.price && (
                        <span
                          className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                        >
                          <DollarSign className="w-3 h-3" />
                          ₹{block.price.toLocaleString()}
                        </span>
                      )}
                      {block.duration && (
                        <span
                          className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                        >
                          <Clock className="w-3 h-3" />
                          {block.duration} {block.durationUnit}
                        </span>
                      )}
                    </div>

                    {block.tags && block.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-3 flex-wrap">
                        {block.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                              color: colors.utility.secondaryText,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {block.tags.length > 3 && (
                          <span
                            className="text-[10px]"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            +{block.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-2">
              {filteredBlocks.map((block) => {
                const category = getCategoryById(block.categoryId);
                const BlockIcon = getIconComponent(block.icon);
                return (
                  <div
                    key={block.id}
                    onClick={() => handleBlockClick(block)}
                    onDoubleClick={() => handleBlockDoubleClick(block)}
                    className="group rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-4"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                    }}
                  >
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
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                          {block.name}
                        </h4>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: category?.bgColor || '#F3F4F6',
                            color: category?.color || colors.utility.secondaryText,
                          }}
                        >
                          {category?.name}
                        </span>
                      </div>
                      <p
                        className="text-xs truncate"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {block.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {block.price && (
                        <span
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                        >
                          ₹{block.price.toLocaleString()}
                        </span>
                      )}
                      {block.duration && (
                        <span
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                        >
                          {block.duration} {block.durationUnit}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBlockPreview(block); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        style={{ color: colors.utility.secondaryText }}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigateToEditBlock(block); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        style={{ color: colors.utility.secondaryText }}
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBlockDuplicate(block); }}
                        disabled={isMutating}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                        style={{ color: colors.utility.secondaryText }}
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Block Editor Panel */}
        {isEditorPanelOpen && selectedBlock && (
          <BlockEditorPanel
            block={selectedBlock}
            isOpen={isEditorPanelOpen}
            onClose={handleEditorPanelClose}
            onSave={handleEditorPanelSave}
            onDelete={handleBlockDelete}
            onDuplicate={handleBlockDuplicate}
          />
        )}
      </div>

      {/* Preview Modal */}
      {previewBlock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setPreviewBlock(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-lg rounded-xl border shadow-2xl animate-in zoom-in-95 duration-200"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.secondaryText + '20',
              }}
            >
              {(() => {
                const category = getCategoryById(previewBlock.categoryId);
                const BlockIcon = getIconComponent(previewBlock.icon);
                return (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
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
                          <h3 className="font-bold" style={{ color: colors.utility.primaryText }}>
                            {previewBlock.name}
                          </h3>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: category?.bgColor || '#F3F4F6',
                              color: category?.color || colors.utility.secondaryText,
                            }}
                          >
                            {category?.name}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreviewBlock(null)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
                      {previewBlock.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {previewBlock.price && (
                        <div
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6' }}
                        >
                          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Price</div>
                          <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                            ₹{previewBlock.price.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {previewBlock.duration && (
                        <div
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6' }}
                        >
                          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Duration</div>
                          <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                            {previewBlock.duration} {previewBlock.durationUnit}
                          </div>
                        </div>
                      )}
                    </div>

                    {previewBlock.tags && previewBlock.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs mb-2" style={{ color: colors.utility.secondaryText }}>Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {previewBlock.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                                color: colors.utility.secondaryText,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                      <button
                        onClick={() => { setPreviewBlock(null); navigateToEditBlock(previewBlock); }}
                        className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                          color: colors.utility.primaryText,
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Block
                      </button>
                      <button
                        onClick={() => { handleBlockDuplicate(previewBlock); setPreviewBlock(null); }}
                        disabled={isMutating}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        style={{ backgroundColor: colors.brand.primary }}
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            colors={colors}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
};

const CatalogStudioBlocksPageWithComingSoon: React.FC = () => (
  <ComingSoonWrapper pageKey="catalog-studio" title="Catalog Studio" subtitle="Your creative workspace for contract building blocks." heroIcon={Boxes} features={catalogStudioFeatures} floatingIcons={catalogStudioFloatingIcons}>
    <CatalogStudioBlocksPage />
  </ComingSoonWrapper>
);

export default CatalogStudioBlocksPageWithComingSoon;

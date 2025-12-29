// src/components/catalog-studio/ServiceCatalogTree/index.tsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Search,
  Grid3X3,
  List,
  CheckCircle2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block, BlockCategory } from '../../../types/catalogStudio';

interface TreeNode {
  id: string;
  name: string;
  type: 'category' | 'subcategory' | 'block';
  icon?: string;
  color?: string;
  children?: TreeNode[];
  data?: Block | BlockCategory;
  count?: number;
}

interface ServiceCatalogTreeProps {
  categories: BlockCategory[];
  blocks: Block[];
  onBlockSelect?: (block: Block) => void;
  onBlockAdd?: (block: Block) => void;
  onBlockPreview?: (block: Block) => void;
  onCategorySelect?: (categoryId: string) => void;
  onAddBlock?: (categoryId: string) => void;
  onAddCategory?: () => void;
  selectedBlockId?: string;
  selectedCategoryId?: string;
  previewBlockId?: string;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isPreviewing: boolean;
  isAdding: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onDoubleClick: () => void;
  onAction?: (action: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  isExpanded,
  isSelected,
  isPreviewing,
  isAdding,
  onToggle,
  onSelect,
  onDoubleClick,
  onAction,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showActions, setShowActions] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const IconComponent = node.icon ? getIconComponent(node.icon) : (isExpanded ? FolderOpen : Folder);

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
        isPreviewing ? 'ring-1' : ''
      } ${isAdding ? 'animate-pulse scale-95' : ''}`}
      style={{
        paddingLeft: `${level * 12 + 8}px`,
        backgroundColor: isPreviewing
          ? `${colors.brand.primary}15`
          : isAdding
            ? `${colors.semantic.success}20`
            : 'transparent',
        borderColor: isPreviewing ? colors.brand.primary : 'transparent',
      }}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      {/* Expand/Collapse Arrow */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
          )}
        </button>
      ) : (
        <div className="w-4" />
      )}

      {/* Icon with animation */}
      <div
        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
          isAdding ? 'scale-110' : ''
        }`}
        style={{
          backgroundColor: isAdding
            ? `${colors.semantic.success}30`
            : node.color
              ? `${node.color}20`
              : (isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6'),
        }}
      >
        {isAdding ? (
          <CheckCircle2
            className="w-3 h-3 animate-in zoom-in duration-200"
            style={{ color: colors.semantic.success }}
          />
        ) : (
          <IconComponent
            className="w-3 h-3"
            style={{ color: node.color || colors.utility.secondaryText }}
          />
        )}
      </div>

      {/* Name */}
      <span
        className={`flex-1 text-sm truncate transition-all ${isAdding ? 'font-medium' : ''}`}
        style={{ color: isAdding ? colors.semantic.success : colors.utility.primaryText }}
      >
        {isAdding ? 'Added!' : node.name}
      </span>

      {/* Count Badge */}
      {node.count !== undefined && node.count > 0 && !isAdding && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            color: colors.utility.secondaryText,
          }}
        >
          {node.count}
        </span>
      )}

      {/* Double-click hint for blocks */}
      {node.type === 'block' && !isAdding && (
        <span
          className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            color: colors.utility.secondaryText,
          }}
        >
          2× add
        </span>
      )}

      {/* Actions */}
      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <MoreVertical className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
        </button>
        {showActions && (
          <div
            className="absolute right-0 top-6 w-32 rounded-lg shadow-lg border z-20 py-1"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('edit');
                setShowActions(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: colors.utility.primaryText }}
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('duplicate');
                setShowActions(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: colors.utility.primaryText }}
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('delete');
                setShowActions(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{ color: colors.semantic.error }}
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ServiceCatalogTree: React.FC<ServiceCatalogTreeProps> = ({
  categories,
  blocks,
  onBlockSelect,
  onBlockAdd,
  onBlockPreview,
  onCategorySelect,
  onAddBlock,
  onAddCategory,
  selectedBlockId,
  selectedCategoryId,
  previewBlockId,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [addingBlockId, setAddingBlockId] = useState<string | null>(null);

  // Build tree structure from categories and blocks
  const buildTree = (): TreeNode[] => {
    return categories.map((category) => {
      const categoryBlocks = blocks.filter((b) => b.categoryId === category.id);
      return {
        id: category.id,
        name: category.name,
        type: 'category' as const,
        icon: category.icon,
        color: category.color,
        count: categoryBlocks.length,
        data: category,
        children: categoryBlocks.map((block) => ({
          id: block.id,
          name: block.name,
          type: 'block' as const,
          icon: block.icon,
          color: category.color,
          data: block,
        })),
      };
    });
  };

  const treeData = buildTree();

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Single click - preview
  const handleNodeSelect = (node: TreeNode) => {
    if (node.type === 'category') {
      onCategorySelect?.(node.id);
      // Auto-expand category on click
      if (!expandedNodes.has(node.id)) {
        toggleNode(node.id);
      }
    } else if (node.type === 'block' && node.data) {
      onBlockPreview?.(node.data as Block);
    }
  };

  // Double click - add to canvas with animation
  const handleNodeDoubleClick = (node: TreeNode) => {
    if (node.type === 'block' && node.data) {
      // Show adding animation
      setAddingBlockId(node.id);

      // Trigger the add callback
      onBlockAdd?.(node.data as Block);

      // Clear animation after delay
      setTimeout(() => {
        setAddingBlockId(null);
      }, 800);
    }
  };

  const handleNodeAction = (node: TreeNode, action: string) => {
    console.log(`Action ${action} on node:`, node);
  };

  // Filter tree based on search
  const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes;

    return nodes.reduce<TreeNode[]>((acc, node) => {
      const matchesQuery = node.name.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = node.children ? filterTree(node.children, query) : [];

      if (matchesQuery || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }

      return acc;
    }, []);
  };

  const filteredTree = filterTree(treeData, searchQuery);

  const renderTree = (nodes: TreeNode[], level: number = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <TreeNodeItem
          node={node}
          level={level}
          isExpanded={expandedNodes.has(node.id)}
          isSelected={
            node.type === 'category'
              ? selectedCategoryId === node.id
              : selectedBlockId === node.id
          }
          isPreviewing={node.type === 'block' && previewBlockId === node.id}
          isAdding={addingBlockId === node.id}
          onToggle={() => toggleNode(node.id)}
          onSelect={() => handleNodeSelect(node)}
          onDoubleClick={() => handleNodeDoubleClick(node)}
          onAction={(action) => handleNodeAction(node, action)}
        />
        {expandedNodes.has(node.id) && node.children && (
          <div className="animate-in slide-in-from-top-1 duration-150">
            {renderTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div
      className="w-72 border-r flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
      }}
    >
      {/* Header - Light Primary */}
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : `${colors.brand.primary}08`,
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            Block Catalog
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'tree' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              style={{ color: colors.utility.secondaryText }}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              style={{ color: colors.utility.secondaryText }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
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
            className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1"
            style={{
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
              color: colors.utility.primaryText,
            }}
          />
        </div>
      </div>

      {/* Instruction hint */}
      <div
        className="px-4 py-2 text-[10px] border-b"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FEFCE8',
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#FEF3C7',
          color: isDarkMode ? colors.utility.secondaryText : '#92400E'
        }}
      >
        💡 <strong>Click</strong> to preview • <strong>Double-click</strong> to add
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredTree.length > 0 ? (
          renderTree(filteredTree)
        ) : (
          <div className="text-center py-8">
            <LucideIcons.FolderSearch
              className="w-10 h-10 mx-auto mb-2"
              style={{ color: colors.utility.secondaryText }}
            />
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              No blocks found
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 border-t"
        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
      >
        <button
          onClick={onAddCategory}
          className="w-full px-3 py-2 text-xs font-medium border rounded-lg flex items-center justify-center gap-2 transition-colors"
          style={{
            borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
            color: colors.utility.secondaryText,
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      </div>
    </div>
  );
};

export default ServiceCatalogTree;

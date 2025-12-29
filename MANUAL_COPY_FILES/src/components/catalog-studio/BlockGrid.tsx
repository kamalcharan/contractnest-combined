// src/components/catalog-studio/BlockGrid.tsx
import React from 'react';
import { Search, Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block, BlockCategory } from '../../types/catalogStudio';
import BlockCard from './BlockCard';

interface BlockGridProps {
  blocks: Block[];
  category: BlockCategory;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBlockClick: (block: Block) => void;
  onAddBlock: () => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const BlockGrid: React.FC<BlockGridProps> = ({
  blocks,
  category,
  searchQuery,
  onSearchChange,
  onBlockClick,
  onAddBlock,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const CategoryIcon = getIconComponent(category.icon);

  const filteredBlocks = blocks.filter((block) => {
    if (searchQuery === '') return true;
    return (
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="border-b px-6 py-4 flex justify-between items-center"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : `${colors.brand.primary}08`,
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: category.bgColor }}
          >
            <CategoryIcon className="w-5 h-5" style={{ color: category.color }} />
          </div>
          <div>
            <h2
              className="text-base font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              {category.name} Blocks
            </h2>
            <p
              className="text-xs"
              style={{ color: colors.utility.secondaryText }}
            >
              {category.description}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: colors.utility.secondaryText }}
          />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border rounded-lg w-48 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
              color: colors.utility.primaryText,
              // @ts-expect-error CSS custom property
              '--tw-ring-color': colors.brand.primary
            }}
          />
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              category={category}
              onClick={() => onBlockClick(block)}
            />
          ))}
          <div
            onClick={onAddBlock}
            className="rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] gap-2 group"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.brand.primary;
              e.currentTarget.style.backgroundColor = `${colors.brand.primary}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isDarkMode ? colors.utility.secondaryText : '#D1D5DB';
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                color: colors.utility.secondaryText
              }}
            >
              <Plus className="w-5 h-5" />
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: colors.utility.secondaryText }}
            >
              Add {category.name} Block
            </span>
          </div>
        </div>
        {filteredBlocks.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <LucideIcons.SearchX
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: colors.utility.secondaryText }}
            />
            <div
              className="text-lg font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              No blocks found
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: colors.utility.secondaryText }}
            >
              Try adjusting your search query
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockGrid;

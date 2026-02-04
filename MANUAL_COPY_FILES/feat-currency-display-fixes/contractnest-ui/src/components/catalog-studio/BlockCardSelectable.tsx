// src/components/catalog-studio/BlockCardSelectable.tsx
// Selectable block card for contract wizard - Column 1 (block library)
// Extends BlockCard pattern with add/selected state

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Block, BlockCategory } from '@/types/catalogStudio';
import { getCurrencySymbol } from '@/utils/constants/currencies';

export interface BlockCardSelectableProps {
  block: Block;
  category: BlockCategory;
  isSelected?: boolean;
  onAdd: (block: Block) => void;
  onClick?: (block: Block) => void;
  currency?: string; // When provided, show pricing for this currency's record
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

const BlockCardSelectable: React.FC<BlockCardSelectableProps> = ({
  block,
  category,
  isSelected = false,
  onAdd,
  onClick,
  currency,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const IconComponent = getIconComponent(block.icon);

  // Resolve display price: use matching currency's pricing record when provided
  const pricingRecords = (block.meta?.pricingRecords || block.config?.pricingRecords || []) as Array<{
    currency: string; amount: number; is_active: boolean;
  }>;
  const matchingRecord = currency
    ? pricingRecords.find(r => r.currency === currency && r.is_active !== false)
    : (pricingRecords.find(r => r.is_active !== false) || pricingRecords[0]);
  const displayPrice = matchingRecord?.amount ?? block.price ?? 0;
  const displayCurrency = matchingRecord?.currency || block.currency || 'INR';

  const handleClick = () => {
    if (onClick) {
      onClick(block);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
      onAdd(block);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden"
      style={{
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
        borderColor: isSelected
          ? colors.semantic.success
          : isDarkMode
          ? `${colors.utility.primaryText}15`
          : '#E5E7EB',
        opacity: isSelected ? 0.7 : 1,
      }}
    >
      {/* Selected overlay */}
      {isSelected && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ backgroundColor: `${colors.semantic.success}10` }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.semantic.success }}
          >
            <Check className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Card content */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: category?.bgColor || `${colors.brand.primary}15` }}
          >
            <IconComponent
              className="w-5 h-5"
              style={{ color: category?.color || colors.brand.primary }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4
              className="font-semibold text-sm truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {block.name}
            </h4>
            <p
              className="text-xs line-clamp-1 mt-0.5"
              style={{ color: colors.utility.secondaryText }}
            >
              {block.description || 'No description'}
            </p>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={isSelected}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              backgroundColor: isSelected
                ? `${colors.semantic.success}15`
                : `${colors.brand.primary}15`,
              color: isSelected ? colors.semantic.success : colors.brand.primary,
            }}
          >
            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Footer: Category + Price */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: `${colors.utility.primaryText}08` }}>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: category?.bgColor || `${colors.utility.primaryText}10`,
              color: category?.color || colors.utility.secondaryText,
            }}
          >
            {category?.name || block.categoryId}
          </span>
          {displayPrice > 0 && (
            <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>
              {formatCurrency(displayPrice, displayCurrency)}
            </span>
          )}
        </div>
      </div>

      {/* Hover effect - subtle glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
        style={{
          boxShadow: `inset 0 0 0 2px ${colors.brand.primary}40`,
        }}
      />
    </div>
  );
};

export default BlockCardSelectable;

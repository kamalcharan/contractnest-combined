// src/components/catalog-studio/CategoryPanel.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { BlockCategory } from '../../types/catalogStudio';

interface CategoryPanelProps {
  categories: BlockCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const CategoryPanel: React.FC<CategoryPanelProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="w-56 flex flex-col border-r"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
      >
        <LucideIcons.Folder className="w-4 h-4" style={{ color: colors.brand.primary }} />
        <h3
          className="text-xs font-bold"
          style={{ color: colors.utility.primaryText }}
        >
          Block Types
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          const isSelected = selectedCategory === category.id;

          return (
            <div
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-1 border-2 transition-all"
              style={{
                backgroundColor: isSelected ? `${colors.brand.primary}10` : 'transparent',
                borderColor: isSelected ? colors.brand.primary : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isDarkMode
                    ? colors.utility.secondaryBackground
                    : '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: category.bgColor }}
              >
                <IconComponent className="w-4 h-4" style={{ color: category.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  {category.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {category.count} blocks
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPanel;

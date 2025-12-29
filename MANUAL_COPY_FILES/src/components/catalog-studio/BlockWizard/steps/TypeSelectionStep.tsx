// src/components/catalog-studio/BlockWizard/steps/TypeSelectionStep.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BlockCategory } from '../../../../types/catalogStudio';

interface TypeSelectionStepProps {
  categories: BlockCategory[];
  selectedType: string;
  onSelectType: (typeId: string) => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const TypeSelectionStep: React.FC<TypeSelectionStepProps> = ({ categories, selectedType, onSelectType }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2
        className="text-lg font-bold mb-1"
        style={{ color: colors.utility.primaryText }}
      >
        What type of block do you want to create?
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: colors.utility.secondaryText }}
      >
        Each block type has different fields and behaviors.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat) => {
          const IconComponent = getIconComponent(cat.icon);
          const isSelected = selectedType === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => onSelectType(cat.id)}
              className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
              style={{
                backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = `${colors.brand.primary}80`;
                  e.currentTarget.style.backgroundColor = `${colors.brand.primary}05`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB';
                  e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                }
              }}
            >
              <div
                className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: cat.bgColor }}
              >
                <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <div
                className="text-sm font-bold"
                style={{ color: colors.utility.primaryText }}
              >
                {cat.name}
              </div>
              <div
                className="text-xs"
                style={{ color: colors.utility.secondaryText }}
              >
                {cat.description.split(' ').slice(0, 3).join(' ')}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mt-6 p-4 rounded-lg flex gap-3"
        style={{
          backgroundColor: `${colors.semantic.info}15`,
          borderColor: `${colors.semantic.info}30`
        }}
      >
        <LucideIcons.Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
        <div
          className="text-sm"
          style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}
        >
          <strong>Tip:</strong> Service blocks are for work that needs to be done. Spare Parts are physical products. Billing blocks define payment structures.
        </div>
      </div>
    </div>
  );
};

export default TypeSelectionStep;

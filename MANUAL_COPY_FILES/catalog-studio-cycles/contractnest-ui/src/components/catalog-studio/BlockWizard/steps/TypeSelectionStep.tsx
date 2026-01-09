// src/components/catalog-studio/BlockWizard/steps/TypeSelectionStep.tsx
// Updated: Improved card styling with shadows, better hover states, CheckCircle indicator

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
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const TypeSelectionStep: React.FC<TypeSelectionStepProps> = ({ categories, selectedType, onSelectType }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Card style matching other steps
  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  };

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

      {/* Block Type Cards - 2 column layout on larger screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const IconComponent = getIconComponent(cat.icon);
          const isSelected = selectedType === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => onSelectType(cat.id)}
              className="p-5 border-2 rounded-xl cursor-pointer text-center transition-all hover:shadow-lg"
              style={{
                ...cardStyle,
                backgroundColor: isSelected
                  ? `${colors.brand.primary}08`
                  : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                borderColor: isSelected
                  ? colors.brand.primary
                  : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div
                className="w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isSelected ? colors.brand.primary : cat.bgColor,
                }}
              >
                <IconComponent
                  className="w-7 h-7"
                  style={{ color: isSelected ? '#FFFFFF' : cat.color }}
                />
              </div>
              <div
                className="text-sm font-bold mb-1"
                style={{ color: colors.utility.primaryText }}
              >
                {cat.name}
              </div>
              <div
                className="text-xs"
                style={{ color: colors.utility.secondaryText }}
              >
                {cat.description.split(' ').slice(0, 4).join(' ')}
              </div>
              {isSelected && (
                <LucideIcons.CheckCircle2
                  className="w-5 h-5 mx-auto mt-3"
                  style={{ color: colors.brand.primary }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Tip Card */}
      <div
        className="mt-6 p-5 rounded-xl flex gap-4"
        style={{
          backgroundColor: isDarkMode ? `${colors.semantic.info}15` : '#EFF6FF',
          border: `1px solid ${isDarkMode ? colors.semantic.info + '30' : '#BFDBFE'}`,
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isDarkMode ? colors.semantic.info : '#2563EB' }}
        >
          <LucideIcons.Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-1" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E3A8A' }}>
            Choosing the Right Block Type
          </h4>
          <p
            className="text-sm"
            style={{ color: isDarkMode ? colors.utility.secondaryText : '#1D4ED8' }}
          >
            <strong>Service:</strong> Work that needs to be done. <strong>Spare Parts:</strong> Physical products. <strong>Billing:</strong> Payment structures.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TypeSelectionStep;

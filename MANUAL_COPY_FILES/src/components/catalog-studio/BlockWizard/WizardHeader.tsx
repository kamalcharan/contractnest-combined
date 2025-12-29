// src/components/catalog-studio/BlockWizard/WizardHeader.tsx
import React from 'react';
import { X, Plus, Pencil } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { WizardMode, BlockCategory } from '../../../types/catalogStudio';

interface WizardHeaderProps {
  mode: WizardMode;
  blockType: string;
  categories: BlockCategory[];
  onClose: () => void;
}

const WizardHeader: React.FC<WizardHeaderProps> = ({ mode, blockType, categories, onClose }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const category = categories.find((c) => c.id === blockType);

  return (
    <div
      className="px-6 py-4 border-b flex justify-between items-center"
      style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
    >
      <h1
        className="text-lg font-bold flex items-center gap-2"
        style={{ color: colors.utility.primaryText }}
      >
        {mode === 'create' ? (
          <Plus className="w-5 h-5" style={{ color: colors.brand.primary }} />
        ) : (
          <Pencil className="w-5 h-5" style={{ color: colors.brand.primary }} />
        )}
        {mode === 'create' ? 'Create New Block' : 'Edit Block'}
        <span
          className="text-xs px-2 py-1 rounded-full font-semibold"
          style={{ backgroundColor: category?.bgColor, color: category?.color }}
        >
          {blockType.charAt(0).toUpperCase() + blockType.slice(1)}
        </span>
      </h1>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
          color: colors.utility.secondaryText
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `${colors.semantic.error}20`;
          e.currentTarget.style.color = colors.semantic.error;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6';
          e.currentTarget.style.color = colors.utility.secondaryText;
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default WizardHeader;

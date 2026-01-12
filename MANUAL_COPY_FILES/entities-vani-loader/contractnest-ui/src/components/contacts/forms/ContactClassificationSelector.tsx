// src/components/contacts/forms/ContactClassificationSelector.tsx - THEME FIXED VERSION
import React from 'react';
import {
  Tag,
  Info,
  X,
  AlertCircle,
  ShoppingCart,
  DollarSign,
  Package,
  Handshake,
  Users
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CONTACT_CLASSIFICATION_CONFIG } from '@/utils/constants/contacts';

interface ContactClassification {
  id?: string;
  classification_value: string;
  classification_label: string;
}

interface ContactClassificationsSectionProps {
  value: ContactClassification[];
  onChange: (classifications: ContactClassification[]) => void;
  disabled?: boolean;
  showValidation?: boolean;
  industry?: string;
}

const ContactClassificationSelector: React.FC<ContactClassificationsSectionProps> = ({
  value,
  onChange,
  disabled = false,
  showValidation = true,
  industry
}) => {
  // FIXED: Get currentTheme for dynamic colors
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Map classification IDs to icons
  const getClassificationIcon = (classificationId: string) => {
    const iconMap = {
      'buyer': ShoppingCart,
      'seller': DollarSign,
      'vendor': Package,
      'partner': Handshake,
      'team_member': Users
    };
    return iconMap[classificationId as keyof typeof iconMap] || Tag;
  };

  // Get color classes for each classification (keep semantic colors for different types)
  const getColorClasses = (classificationId: string, isSelected: boolean) => {
    const colorMap = {
      'buyer': {
        selected: 'bg-blue-500 text-white',
        unselected: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      },
      'seller': {
        selected: 'bg-green-500 text-white',
        unselected: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      },
      'vendor': {
        selected: 'bg-purple-500 text-white',
        unselected: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
      },
      'partner': {
        selected: 'bg-orange-500 text-white',
        unselected: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
      },
      'team_member': {
        selected: 'bg-indigo-500 text-white',
        unselected: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
      }
    };

    const colorConfig = colorMap[classificationId as keyof typeof colorMap];
    return colorConfig ? (isSelected ? colorConfig.selected : colorConfig.unselected) : 'bg-gray-100 text-gray-700';
  };

  const classifications = CONTACT_CLASSIFICATION_CONFIG;

  // Toggle classification selection
  const toggleClassification = (classification: typeof classifications[0]) => {
    if (disabled) return;

    const exists = value.some(c => c.classification_value === classification.id);

    if (exists) {
      // Remove classification
      const newValue = value.filter(c => c.classification_value !== classification.id);
      onChange(newValue);
      // NOTE: Toast removed - user will see "Unsaved changes" indicator instead
    } else {
      // Add classification
      const newClassification: ContactClassification = {
        id: `temp_${Date.now()}_${classification.id}`,
        classification_value: classification.id,
        classification_label: classification.label
      };

      onChange([...value, newClassification]);
      // NOTE: Toast removed - user will see "Unsaved changes" indicator instead
    }
  };

  // Check if classification is selected
  const isSelected = (classificationId: string): boolean => {
    return value.some(c => c.classification_value === classificationId);
  };

  const remainingCount = classifications.length - value.length;

  return (
    <div
      className="rounded-lg shadow-sm border p-6"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-semibold"
          style={{ color: colors.utility.primaryText }}
        >
          Classification <span style={{ color: colors.semantic.error }}>*</span>
        </h2>
        <div style={{ color: colors.utility.secondaryText }}>
          <Info className="h-4 w-4" />
        </div>
      </div>

      {/* Info Message */}
      <div
        className="mb-4 p-3 rounded-md"
        style={{
          backgroundColor: colors.brand.primary + '10',
          color: colors.brand.primary
        }}
      >
        <p className="text-sm flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Select all classifications that apply to this contact
        </p>
      </div>

      {/* Classification Options */}
      <div className="space-y-3 mb-4">
        {classifications.map((classification) => {
          const selected = isSelected(classification.id);
          const IconComponent = getClassificationIcon(classification.id);

          return (
            <button
              key={`classification-${classification.id}`}
              onClick={() => toggleClassification(classification)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left w-full
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
              `}
              style={{
                // FIXED: Use inline styles with theme colors instead of Tailwind border-primary
                borderColor: selected
                  ? colors.brand.primary
                  : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                boxShadow: selected ? `0 4px 12px ${colors.brand.primary}25` : 'none'
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2.5 rounded-lg transition-colors
                  ${getColorClasses(classification.id, selected)}
                `}>
                  <IconComponent className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <div
                    className="font-semibold text-sm mb-1"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {classification.label}
                  </div>
                  <div
                    className="text-xs leading-relaxed"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {classification.description}
                  </div>
                </div>

                {selected && (
                  <div className="absolute top-3 right-3">
                    {/* FIXED: Use inline styles with theme colors instead of Tailwind bg-primary */}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.brand.primary }}
                    >
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <div
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          <strong style={{ color: colors.utility.primaryText }}>{value.length}</strong> classification{value.length !== 1 ? 's' : ''} selected
          {remainingCount > 0 && (
            <span style={{ color: colors.utility.secondaryText }}> ({remainingCount} remaining)</span>
          )}
        </div>

        {/* Selected Classifications Display */}
        {value.length > 0 && (
          <>
            <div
              className="text-sm font-medium"
              style={{ color: colors.utility.primaryText }}
            >
              Selected:
            </div>
            <div className="flex flex-wrap gap-2">
              {value.map((classification, index) => {
                const IconComponent = getClassificationIcon(classification.classification_value);

                return (
                  <div
                    key={`selected-${classification.classification_value}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      color: colors.utility.primaryText
                    }}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span>{classification.classification_label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const configItem = classifications.find(c => c.id === classification.classification_value);
                        if (configItem) {
                          toggleClassification(configItem);
                        }
                      }}
                      className="ml-1 hover:opacity-70 transition-colors"
                      style={{ color: colors.semantic.error }}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Tip when no classifications selected */}
        {value.length === 0 && (
          <div
            className="mt-4 p-3 rounded-md border"
            style={{
              backgroundColor: colors.semantic.warning + '10',
              borderColor: colors.semantic.warning + '40'
            }}
          >
            <p
              className="text-sm flex items-start gap-2"
              style={{ color: colors.semantic.warning }}
            >
              <span className="text-lg">💡</span>
              <span><strong>Tip:</strong> Classifications help organize your contacts and determine their role in your business relationships.</span>
            </p>
          </div>
        )}
      </div>

      {/* Validation Message */}
      {showValidation && value.length === 0 && (
        <div
          className="mt-4 p-3 rounded-md border"
          style={{
            backgroundColor: colors.semantic.error + '10',
            borderColor: colors.semantic.error + '40'
          }}
        >
          <p
            className="text-sm flex items-center gap-2"
            style={{ color: colors.semantic.error }}
          >
            <AlertCircle className="h-4 w-4" />
            At least one classification is required
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactClassificationSelector;

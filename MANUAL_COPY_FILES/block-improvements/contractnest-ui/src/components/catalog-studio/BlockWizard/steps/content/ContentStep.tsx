// src/components/catalog-studio/BlockWizard/steps/content/ContentStep.tsx
// TEXT BLOCK: Single page with Name, Icon, and Rich Text content
import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { RichTextEditor } from '../../../../ui/RichTextEditor';
import IconPicker from '../../../IconPicker';

interface ContentStepProps {
  formData: {
    name?: string;
    icon?: string;
    description?: string;  // Rich text content
  };
  onChange: (field: string, value: unknown) => void;
}

const ContentStep: React.FC<ContentStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  const labelStyle = { color: colors.utility.primaryText };

  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Text Block
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Create a text block with terms, conditions, or policy content.
      </p>

      <div className="space-y-5">
        {/* Name and Icon - Single Row */}
        <div className="p-5 rounded-xl border" style={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Block Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>
                Block Name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Terms & Conditions"
                value={formData.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                maxLength={255}
                className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
                required
              />
            </div>

            {/* Icon Picker */}
            <IconPicker
              value={formData.icon || 'FileText'}
              onChange={(icon) => onChange('icon', icon)}
              label="Block Icon"
            />
          </div>
        </div>

        {/* Rich Text Content */}
        <div className="p-5 rounded-xl border" style={cardStyle}>
          <RichTextEditor
            value={formData.description || ''}
            onChange={(value) => onChange('description', value)}
            label="Content"
            placeholder="Enter your terms, conditions, or policy text here..."
            required={true}
            maxLength={10000}
            showCharCount={true}
            allowFullscreen={true}
            toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
            minHeight={250}
            maxHeight={400}
          />
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Text blocks are perfect for terms & conditions, privacy policies, disclaimers, or any standard contract language.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStep;

// src/components/catalog-studio/BlockWizard/steps/content/ContentStep.tsx
// Simplified: Only shows context text editor for Text Blocks
import React from 'react';
import { FileText } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface ContentStepProps {
  formData: {
    contentType?: 'plain' | 'rich' | 'template';
    content?: string;
    variables?: string[];
  };
  onChange: (field: string, value: unknown) => void;
}

const ContentStep: React.FC<ContentStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Context Text
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Enter the text content that will appear in your contracts.
      </p>

      <div className="max-w-3xl space-y-6">
        {/* Content Area - Simple Text Editor */}
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
          }}
        >
          <label className="block text-sm font-medium mb-3 flex items-center gap-2" style={labelStyle}>
            <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
            Content Text <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder="Enter your terms, conditions, policy text, or any other content here..."
            rows={12}
            className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
            style={inputStyle}
          />
          <div className="flex justify-between mt-2">
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              This text will be displayed in templates and contracts
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {(formData.content || '').length} characters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStep;

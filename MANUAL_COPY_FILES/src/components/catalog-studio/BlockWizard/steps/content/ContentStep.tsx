// src/components/catalog-studio/BlockWizard/steps/content/ContentStep.tsx
import React from 'react';
import { FileText, Type, AlignLeft, List, Lightbulb } from 'lucide-react';
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
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const contentTypes = [
    { id: 'plain', icon: Type, label: 'Plain Text', description: 'Simple text without formatting' },
    { id: 'rich', icon: AlignLeft, label: 'Rich Text', description: 'Formatted text with styles' },
    { id: 'template', icon: List, label: 'Template', description: 'Text with dynamic variables' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Content Editor
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Enter the text content for this block.
      </p>

      <div className="space-y-6">
        {/* Content Type */}
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>Content Type</label>
          <div className="grid grid-cols-3 gap-3">
            {contentTypes.map((type) => {
              const IconComp = type.icon;
              const isSelected = (formData.contentType || 'rich') === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => onChange('contentType', type.id)}
                  className="p-3 border-2 rounded-xl cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <IconComp className="w-6 h-6 mx-auto mb-1" style={{ color: colors.brand.primary }} />
                  <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{type.label}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{type.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>
            Content <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder="Enter your terms, conditions, or policy text here..."
            rows={10}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none font-mono"
            style={inputStyle}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              Supports markdown formatting
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {(formData.content || '').length} characters
            </p>
          </div>
        </div>

        {/* Template Variables */}
        {formData.contentType === 'template' && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <FileText className="w-4 h-4" /> Available Variables
            </h4>
            <div className="flex flex-wrap gap-2">
              {['{{buyer_name}}', '{{seller_name}}', '{{contract_date}}', '{{contract_value}}', '{{service_name}}'].map((variable) => (
                <span
                  key={variable}
                  className="px-2 py-1 text-xs rounded-md cursor-pointer transition-colors"
                  style={{
                    backgroundColor: `${colors.brand.primary}20`,
                    color: colors.brand.primary
                  }}
                  onClick={() => onChange('content', (formData.content || '') + ' ' + variable)}
                >
                  {variable}
                </span>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
              Click to insert variable at cursor position
            </p>
          </div>
        )}

        {/* Predefined Templates */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>Quick Templates</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Standard T&C', preview: 'General terms and conditions...' },
              { label: 'Cancellation Policy', preview: '24-hour cancellation notice...' },
              { label: 'Privacy Notice', preview: 'Your data will be handled...' },
              { label: 'Refund Policy', preview: 'Refunds are processed within...' },
            ].map((template) => (
              <div
                key={template.label}
                className="p-3 border rounded-lg cursor-pointer transition-all"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
                }}
                onClick={() => onChange('content', template.preview)}
              >
                <div className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{template.label}</div>
                <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>{template.preview}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Use template variables to personalize content for each contract. Variables are replaced with actual values when the contract is generated.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStep;

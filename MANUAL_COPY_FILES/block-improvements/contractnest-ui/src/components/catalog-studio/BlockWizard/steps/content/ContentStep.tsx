// src/components/catalog-studio/BlockWizard/steps/content/ContentStep.tsx
// Consolidated: Content Editor + Settings in one step (was 2 steps)
import React, { useState } from 'react';
import { FileText, Type, AlignLeft, List, Lightbulb, Eye, Edit, Lock, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { BLOCK_FIELD_LIMITS, getCharCountDisplay } from '../../../../../utils/constants/blockValidation';

interface ContentStepProps {
  formData: {
    contentType?: 'plain' | 'rich' | 'template';
    content?: string;
    variables?: string[];
    // Settings (merged from ContentSettingsStep)
    requireSignature?: boolean;
    requireAcknowledgment?: boolean;
    isEditable?: boolean;
    visibility?: 'always' | 'contract' | 'print' | 'hidden';
    displayOrder?: number;
    legalContentType?: string;
    jurisdiction?: string;
    legalReviewed?: boolean;
  };
  onChange: (field: string, value: unknown) => void;
}

const ContentStep: React.FC<ContentStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showSettings, setShowSettings] = useState(false);

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const contentTypes = [
    { id: 'plain', icon: Type, label: 'Plain Text', description: 'Simple text without formatting' },
    { id: 'rich', icon: AlignLeft, label: 'Rich Text', description: 'Formatted text with styles' },
    { id: 'template', icon: List, label: 'Template', description: 'Text with dynamic variables' },
  ];

  // Character count display
  const contentLength = (formData.content || '').length;
  const charCount = getCharCountDisplay(contentLength, BLOCK_FIELD_LIMITS.content.max);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Content & Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Enter the text content and configure display options.
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
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
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
            rows={8}
            maxLength={BLOCK_FIELD_LIMITS.content.max}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none font-mono"
            style={{
              ...inputStyle,
              borderColor: charCount.isError ? colors.semantic.error : inputStyle.borderColor,
            }}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              Supports markdown formatting
            </p>
            <p
              className="text-xs"
              style={{
                color: charCount.isError
                  ? colors.semantic.error
                  : charCount.isWarning
                  ? colors.semantic.warning
                  : colors.utility.secondaryText,
              }}
            >
              {charCount.text}
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
                  onClick={() => {
                    const newContent = (formData.content || '') + ' ' + variable;
                    if (newContent.length <= BLOCK_FIELD_LIMITS.content.max) {
                      onChange('content', newContent);
                    }
                  }}
                >
                  {variable}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Templates */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>Quick Templates</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Standard T&C', preview: 'General terms and conditions governing the use of services...' },
              { label: 'Cancellation Policy', preview: '24-hour cancellation notice required. Late cancellations may incur charges...' },
              { label: 'Privacy Notice', preview: 'Your data will be handled in accordance with our privacy policy...' },
              { label: 'Refund Policy', preview: 'Refunds are processed within 7-10 business days of approval...' },
            ].map((template) => (
              <div
                key={template.label}
                className="p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-300"
                style={{
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
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

        {/* Collapsible Settings Section */}
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full p-4 flex items-center justify-between text-left transition-colors"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
          >
            <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
              Advanced Settings
            </span>
            {showSettings ? (
              <ChevronUp className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            )}
          </button>

          {showSettings && (
            <div className="p-4 space-y-5 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
              {/* Display Settings */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Eye className="w-4 h-4" /> Display Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={labelStyle}>Visibility</label>
                    <select
                      value={formData.visibility || 'always'}
                      onChange={(e) => onChange('visibility', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    >
                      <option value="always">Always visible</option>
                      <option value="contract">In contract only</option>
                      <option value="print">Print version only</option>
                      <option value="hidden">Hidden (internal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={labelStyle}>Display Order</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.displayOrder || 1}
                      onChange={(e) => onChange('displayOrder', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Editing Options */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Edit className="w-4 h-4" /> Editing Options
                </h4>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                      Allow editing during contract creation
                    </span>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      Sellers can modify this text when creating contracts
                    </p>
                  </div>
                  <div
                    className="w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0 ml-3"
                    style={{ backgroundColor: formData.isEditable ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                    onClick={() => onChange('isEditable', !formData.isEditable)}
                  >
                    <div
                      className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                      style={{ left: formData.isEditable ? '22px' : '2px' }}
                    />
                  </div>
                </label>
              </div>

              {/* Acknowledgment Options */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Check className="w-4 h-4" /> Acknowledgment Requirements
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm" style={{ color: colors.utility.primaryText }}>Require buyer acknowledgment</span>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Buyer must check "I agree" checkbox</p>
                    </div>
                    <div
                      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0 ml-3"
                      style={{ backgroundColor: formData.requireAcknowledgment ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                      onClick={() => onChange('requireAcknowledgment', !formData.requireAcknowledgment)}
                    >
                      <div
                        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                        style={{ left: formData.requireAcknowledgment ? '22px' : '2px' }}
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm" style={{ color: colors.utility.primaryText }}>Require digital signature</span>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Buyer must sign to accept terms</p>
                    </div>
                    <div
                      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0 ml-3"
                      style={{ backgroundColor: formData.requireSignature ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                      onClick={() => onChange('requireSignature', !formData.requireSignature)}
                    >
                      <div
                        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                        style={{ left: formData.requireSignature ? '22px' : '2px' }}
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Legal Settings */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Lock className="w-4 h-4" /> Legal Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={labelStyle}>Content Type</label>
                    <select
                      value={formData.legalContentType || 'terms'}
                      onChange={(e) => onChange('legalContentType', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    >
                      <option value="terms">Terms & Conditions</option>
                      <option value="privacy">Privacy Policy</option>
                      <option value="disclaimer">Disclaimer</option>
                      <option value="warranty">Warranty Terms</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={labelStyle}>Jurisdiction</label>
                    <select
                      value={formData.jurisdiction || 'india'}
                      onChange={(e) => onChange('jurisdiction', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    >
                      <option value="india">India</option>
                      <option value="us">United States</option>
                      <option value="uk">United Kingdom</option>
                      <option value="eu">European Union</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={formData.legalReviewed || false}
                    onChange={(e) => onChange('legalReviewed', e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: colors.brand.primary }}
                  />
                  <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                    This content has been reviewed by legal counsel
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Use template variables to personalize content for each contract. Advanced settings let you control how this content appears and behaves.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStep;

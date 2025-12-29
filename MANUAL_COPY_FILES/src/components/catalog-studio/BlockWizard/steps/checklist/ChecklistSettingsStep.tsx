// src/components/catalog-studio/BlockWizard/steps/checklist/ChecklistSettingsStep.tsx
import React from 'react';
import { Settings, Clock, Users, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface ChecklistSettingsStepProps {
  formData: {
    completionRule?: 'all' | 'any' | 'minimum';
    minimumRequired?: number;
    assignee?: 'vendor' | 'customer' | 'both';
    dueTime?: 'before' | 'during' | 'after';
    allowSkip?: boolean;
    requireComments?: boolean;
  };
  onChange: (field: string, value: unknown) => void;
}

const ChecklistSettingsStep: React.FC<ChecklistSettingsStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Checklist Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure completion rules and assignment.
      </p>

      <div className="space-y-6">
        {/* Completion Rules */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Settings className="w-4 h-4" /> Completion Rules
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { id: 'all', label: 'All Items', description: 'Complete every item' },
              { id: 'any', label: 'Any Item', description: 'At least one item' },
              { id: 'minimum', label: 'Minimum', description: 'Specify number' },
            ].map((rule) => {
              const isSelected = (formData.completionRule || 'all') === rule.id;
              return (
                <div
                  key={rule.id}
                  onClick={() => onChange('completionRule', rule.id)}
                  className="p-3 border-2 rounded-lg cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{rule.label}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{rule.description}</div>
                </div>
              );
            })}
          </div>
          {formData.completionRule === 'minimum' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Minimum Items Required</label>
              <input
                type="number"
                value={formData.minimumRequired || 1}
                onChange={(e) => onChange('minimumRequired', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Assignment */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Users className="w-4 h-4" /> Assignment
          </h4>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Who completes this checklist?</label>
            <select
              value={formData.assignee || 'vendor'}
              onChange={(e) => onChange('assignee', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            >
              <option value="vendor">Vendor/Service Provider</option>
              <option value="customer">Customer</option>
              <option value="both">Both parties</option>
            </select>
          </div>
        </div>

        {/* Timing */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Clock className="w-4 h-4" /> Timing
          </h4>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>When should this be completed?</label>
            <select
              value={formData.dueTime || 'during'}
              onChange={(e) => onChange('dueTime', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            >
              <option value="before">Before service starts</option>
              <option value="during">During service</option>
              <option value="after">After service completion</option>
            </select>
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <div>
              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>Allow skipping non-required items</span>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Optional items can be marked as N/A</p>
            </div>
            <div
              className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
              style={{ backgroundColor: formData.allowSkip === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
              onClick={() => onChange('allowSkip', !formData.allowSkip)}
            >
              <div
                className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                style={{ left: formData.allowSkip === true ? '22px' : '2px' }}
              />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <div>
              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>Require comments on each item</span>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Add notes field for each checklist item</p>
            </div>
            <div
              className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
              style={{ backgroundColor: formData.requireComments === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
              onClick={() => onChange('requireComments', !formData.requireComments)}
            >
              <div
                className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                style={{ left: formData.requireComments === true ? '22px' : '2px' }}
              />
            </div>
          </label>
        </div>

        {/* Warning */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.warning}15` }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#92400E' }}>
            <strong>Note:</strong> Required checklist items must be completed before the service can be marked as done.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistSettingsStep;

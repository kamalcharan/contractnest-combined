// src/components/catalog-studio/BlockWizard/steps/billing/StructureStep.tsx
import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Target, RefreshCw, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface StructureStepProps {
  formData: {
    paymentType?: 'upfront' | 'milestone' | 'emi' | 'recurring';
    upfrontPercent?: number;
    numMilestones?: number;
    numInstallments?: number;
    recurringFrequency?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const StructureStep: React.FC<StructureStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [paymentType, setPaymentType] = useState(formData.paymentType || 'upfront');

  // Set default value on mount if not already set
  useEffect(() => {
    if (!formData.paymentType) {
      onChange('paymentType', 'upfront');
    }
  }, []); // Only run on mount

  const handleTypeChange = (type: string) => {
    setPaymentType(type);
    onChange('paymentType', type);
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const paymentOptions = [
    { id: 'upfront', icon: Banknote, label: '100% Upfront', description: 'Full payment before service' },
    { id: 'milestone', icon: Target, label: 'Milestone', description: 'Pay at project milestones' },
    { id: 'emi', icon: CreditCard, label: 'EMI/Installments', description: 'Split into equal payments' },
    { id: 'recurring', icon: RefreshCw, label: 'Recurring', description: 'Subscription/repeat billing' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Payment Structure
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Define how payments will be collected for this billing block.
      </p>

      <div className="space-y-6">
        {/* Payment Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>
            Payment Type <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {paymentOptions.map((option) => {
              const IconComp = option.icon;
              const isSelected = paymentType === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => handleTypeChange(option.id)}
                  className="p-4 border-2 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className="w-8 h-8" style={{ color: colors.brand.primary }} />
                    <div>
                      <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                      <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upfront Configuration */}
        {paymentType === 'upfront' && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
              Upfront Payment Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Payment Percentage</label>
                <select
                  value={formData.upfrontPercent || 100}
                  onChange={(e) => onChange('upfrontPercent', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="100">100% Upfront</option>
                  <option value="50">50% Advance, 50% on Completion</option>
                  <option value="25">25% Advance, 75% on Completion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Payment Due</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="immediate">Immediate</option>
                  <option value="before">Before Service Starts</option>
                  <option value="contract">On Contract Signing</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Configuration */}
        {paymentType === 'milestone' && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
              Milestone Settings
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Number of Milestones</label>
                <select
                  value={formData.numMilestones || 2}
                  onChange={(e) => onChange('numMilestones', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="2">2 Milestones</option>
                  <option value="3">3 Milestones</option>
                  <option value="4">4 Milestones</option>
                  <option value="5">5 Milestones</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Split Method</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="equal">Equal Split</option>
                  <option value="custom">Custom Percentages</option>
                </select>
              </div>
            </div>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              Milestones will be defined per contract based on project deliverables.
            </p>
          </div>
        )}

        {/* EMI Configuration */}
        {paymentType === 'emi' && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
              EMI/Installment Settings
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Number of EMIs</label>
                <select
                  value={formData.numInstallments || 3}
                  onChange={(e) => onChange('numInstallments', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="2">2 EMIs</option>
                  <option value="3">3 EMIs</option>
                  <option value="6">6 EMIs</option>
                  <option value="12">12 EMIs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Frequency</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Interest</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="0">0% (No Interest)</option>
                  <option value="flat">Flat Rate</option>
                  <option value="reducing">Reducing Balance</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Configuration */}
        {paymentType === 'recurring' && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
              Recurring Payment Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Billing Frequency</label>
                <select
                  value={formData.recurringFrequency || 'monthly'}
                  onChange={(e) => onChange('recurringFrequency', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Billing Day</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="1">1st of month</option>
                  <option value="15">15th of month</option>
                  <option value="last">Last day of month</option>
                  <option value="anniversary">Contract anniversary</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div
          className="p-4 rounded-lg flex gap-3"
          style={{ backgroundColor: `${colors.semantic.info}15` }}
        >
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Billing blocks define payment structure templates. The actual amounts are set when creating contracts using these blocks.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructureStep;

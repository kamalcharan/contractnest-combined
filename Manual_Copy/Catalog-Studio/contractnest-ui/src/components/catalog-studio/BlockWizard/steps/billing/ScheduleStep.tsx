// src/components/catalog-studio/BlockWizard/steps/billing/ScheduleStep.tsx
import React from 'react';
import { Calendar, Bell, Clock, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface ScheduleStepProps {
  formData: {
    dueDays?: number;
    gracePeriod?: number;
    reminderDays?: number[];
    lateFeeType?: 'none' | 'flat' | 'percent';
    lateFeeAmount?: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const ScheduleStep: React.FC<ScheduleStepProps> = ({ formData, onChange }) => {
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
        Payment Schedule
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure payment due dates and reminder settings.
      </p>

      <div className="space-y-6">
        {/* Due Date Settings */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Calendar className="w-4 h-4" /> Due Date Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Payment Due After</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.dueDays || 7}
                  onChange={(e) => onChange('dueDays', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
                <span className="px-3 py-2 text-sm" style={{ color: colors.utility.secondaryText }}>days</span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>From invoice generation</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Grace Period</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.gracePeriod || 3}
                  onChange={(e) => onChange('gracePeriod', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
                <span className="px-3 py-2 text-sm" style={{ color: colors.utility.secondaryText }}>days</span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>Before late fees apply</p>
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Bell className="w-4 h-4" /> Payment Reminders
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>7 days before due date</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>3 days before due date</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>On due date</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>1 day after due (overdue)</span>
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Reminder Channels</label>
            <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
              <option value="all">WhatsApp + Email + SMS</option>
              <option value="whatsapp">WhatsApp only</option>
              <option value="email">Email only</option>
              <option value="sms">SMS only</option>
            </select>
          </div>
        </div>

        {/* Late Fees */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Clock className="w-4 h-4" /> Late Payment Fees
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Late Fee Type</label>
              <select
                value={formData.lateFeeType || 'none'}
                onChange={(e) => onChange('lateFeeType', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="none">No Late Fee</option>
                <option value="flat">Flat Amount</option>
                <option value="percent">Percentage of Invoice</option>
                <option value="daily">Daily Penalty</option>
              </select>
            </div>
            {formData.lateFeeType && formData.lateFeeType !== 'none' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  {formData.lateFeeType === 'percent' ? 'Percentage' : 'Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.utility.secondaryText }}>
                    {formData.lateFeeType === 'percent' ? '%' : '₹'}
                  </span>
                  <input
                    type="number"
                    value={formData.lateFeeAmount || 0}
                    onChange={(e) => onChange('lateFeeAmount', parseFloat(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Maximum Late Fee Cap</label>
            <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
              <option value="none">No cap</option>
              <option value="10">10% of invoice</option>
              <option value="25">25% of invoice</option>
              <option value="50">50% of invoice</option>
            </select>
          </div>
        </div>

        {/* Warning */}
        <div
          className="p-4 rounded-lg flex gap-3"
          style={{ backgroundColor: `${colors.semantic.warning}15` }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#92400E' }}>
            <strong>Note:</strong> Late fee policies should comply with local regulations. Some regions have caps on penalty interest rates.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleStep;

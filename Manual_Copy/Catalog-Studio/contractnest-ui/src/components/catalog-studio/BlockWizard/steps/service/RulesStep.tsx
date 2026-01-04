// src/components/catalog-studio/BlockWizard/steps/service/RulesStep.tsx
import React, { useState } from 'react';
import { Shield, RefreshCw, Ban, AlertCircle, Clock, Bell } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { CANCELLATION_POLICIES } from '../../../../../utils/catalog-studio';

interface RulesStepProps {
  formData: {
    autoApprove?: boolean;
    requiresOTP?: boolean;
    maxReschedules?: number;
    cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
    refundPercentage?: number;
    reminderHours?: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const RulesStep: React.FC<RulesStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [cancellationPolicy, setCancellationPolicy] = useState(formData.cancellationPolicy || 'moderate');

  const handlePolicyChange = (policy: 'flexible' | 'moderate' | 'strict') => {
    setCancellationPolicy(policy);
    onChange('cancellationPolicy', policy);
    const policyData = CANCELLATION_POLICIES.find((p) => p.id === policy);
    if (policyData) onChange('refundPercentage', policyData.refundPercent);
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const getPolicyIcon = (id: string) => {
    switch (id) {
      case 'flexible': return <RefreshCw className="w-5 h-5" style={{ color: colors.semantic.success }} />;
      case 'moderate': return <AlertCircle className="w-5 h-5" style={{ color: colors.semantic.warning }} />;
      case 'strict': return <Ban className="w-5 h-5" style={{ color: colors.semantic.error }} />;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Business Rules
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure cancellation, rescheduling, and automation rules.
      </p>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>
            Cancellation Policy <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CANCELLATION_POLICIES.map((policy) => {
              const isSelected = cancellationPolicy === policy.id;
              return (
                <div
                  key={policy.id}
                  onClick={() => handlePolicyChange(policy.id as 'flexible' | 'moderate' | 'strict')}
                  className="p-4 border-2 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getPolicyIcon(policy.id)}
                    <span className="font-bold" style={{ color: colors.utility.primaryText }}>{policy.name}</span>
                  </div>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>{policy.description}</p>
                  <div className="mt-2 text-sm font-semibold" style={{ color: colors.brand.primary }}>
                    {policy.refundPercent}% refund
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <RefreshCw className="w-4 h-4" /> Rescheduling Rules
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Max Reschedules Allowed</label>
              <select
                value={formData.maxReschedules || 2}
                onChange={(e) => onChange('maxReschedules', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="0">No rescheduling</option>
                <option value="1">1 time</option>
                <option value="2">2 times</option>
                <option value="3">3 times</option>
                <option value="-1">Unlimited</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Reschedule Notice Period</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="2">At least 2 hours</option>
                <option value="6">At least 6 hours</option>
                <option value="12">At least 12 hours</option>
                <option value="24">At least 24 hours</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Charge fee for late rescheduling (after notice period)
            </span>
          </label>
        </div>

        <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: `${colors.semantic.info}10` }}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Shield className="w-4 h-4" /> Verification & Security
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresOTP !== false}
                onChange={(e) => onChange('requiresOTP', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Require OTP verification for service start
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Require OTP/Signature for service completion
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Auto-lock service if technician leaves geo-fence
              </span>
            </label>
          </div>
        </div>

        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Bell className="w-4 h-4" /> Automation & Notifications
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Send Reminder Before</label>
                <select
                  value={formData.reminderHours || 24}
                  onChange={(e) => onChange('reminderHours', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="1">1 hour before</option>
                  <option value="2">2 hours before</option>
                  <option value="6">6 hours before</option>
                  <option value="12">12 hours before</option>
                  <option value="24">24 hours before</option>
                  <option value="48">48 hours before</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Reminder Channels</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="all">WhatsApp + SMS + Email</option>
                  <option value="whatsapp">WhatsApp only</option>
                  <option value="sms">SMS only</option>
                  <option value="email">Email only</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoApprove !== false}
                  onChange={(e) => onChange('autoApprove', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: colors.brand.primary }}
                />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                  Auto-approve service completion (skip manual review)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-generate invoice on completion</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Request customer feedback after service</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-schedule follow-up service (for recurring)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Clock className="w-4 h-4" /> SLA (Service Level Agreement)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Response Time Commitment</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="none">No commitment</option>
                <option value="1h">Within 1 hour</option>
                <option value="4h">Within 4 hours</option>
                <option value="24h">Within 24 hours</option>
                <option value="48h">Within 48 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Completion Guarantee</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="none">No guarantee</option>
                <option value="same-day">Same day</option>
                <option value="next-day">Next business day</option>
                <option value="3-days">Within 3 days</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Offer compensation if SLA is breached
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default RulesStep;

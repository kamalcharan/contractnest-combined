// src/components/catalog-studio/BlockWizard/steps/service/BusinessRulesStep.tsx
// Phase 7: Business Rules Configuration
// Updated: Mandatory fields, hidden cancellation, only advance deposit option

import React, { useState } from 'react';
import {
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Check,
  Lightbulb,
  Info,
  CheckCircle2,
  Wallet,
  // Hidden icons
  // XCircle,
  // Calendar,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block, FollowupConfig, WarrantyConfig } from '../../../../../types/catalogStudio';

// =================================================================
// TYPES
// =================================================================

interface BusinessRulesStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

// =================================================================
// COMPONENT
// =================================================================

const BusinessRulesStep: React.FC<BusinessRulesStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State for accordion sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    followup: true,
    warranty: true,
  });

  // Get current values from formData.meta
  const followup: FollowupConfig = (formData.meta?.followup as FollowupConfig) || {
    enabled: false,
    freeFollowups: 1,
    followupPeriod: 7,
    followupPeriodUnit: 'days',
    conditions: [],
  };

  const warranty: WarrantyConfig = (formData.meta?.warranty as WarrantyConfig) || {
    enabled: false,
    warrantyPeriod: 30,
    warrantyPeriodUnit: 'days',
    warrantyType: 'limited',
    warrantyTerms: '',
  };

  // Styles
  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  const labelStyle = { color: colors.utility.primaryText };

  // Handlers
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFollowup = (updates: Partial<FollowupConfig>) => {
    const updated = { ...followup, ...updates };
    onChange('meta', { ...formData.meta, followup: updated });
  };

  const updateWarranty = (updates: Partial<WarrantyConfig>) => {
    const updated = { ...warranty, ...updates };
    onChange('meta', { ...formData.meta, warranty: updated });
  };

  const addCondition = () => {
    const conditions = [...(followup.conditions || []), ''];
    updateFollowup({ conditions });
  };

  const updateCondition = (index: number, value: string) => {
    const conditions = [...(followup.conditions || [])];
    conditions[index] = value;
    updateFollowup({ conditions });
  };

  const removeCondition = (index: number) => {
    const conditions = (followup.conditions || []).filter((_, i) => i !== index);
    updateFollowup({ conditions });
  };

  // Section Header Component
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
    section,
    enabled,
    onToggle,
  }: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    title: string;
    subtitle: string;
    section: string;
    enabled?: boolean;
    onToggle?: () => void;
  }) => (
    <div
      className="flex items-center justify-between p-5 cursor-pointer transition-colors rounded-t-xl"
      onClick={() => toggleSection(section)}
      style={{
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: enabled ? colors.brand.primary : `${colors.brand.primary}15` }}
        >
          <Icon
            className="w-6 h-6"
            style={{ color: enabled ? '#FFFFFF' : colors.brand.primary }}
          />
        </div>
        <div>
          <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
            {title}
          </h4>
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onToggle !== undefined && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="w-12 h-7 rounded-full transition-colors relative"
            style={{
              backgroundColor: enabled ? colors.brand.primary : isDarkMode ? '#4B5563' : '#D1D5DB',
            }}
          >
            <div
              className="absolute w-5 h-5 rounded-full bg-white top-1 transition-all shadow-sm"
              style={{ left: enabled ? '26px' : '4px' }}
            />
          </button>
        )}
        {expandedSections[section] ? (
          <ChevronUp className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Business Rules
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure follow-up policies, warranties, and payment options.
      </p>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) - Rules Configuration */}
        <div className="lg:col-span-3 space-y-5">
          {/* Followup Section */}
          <div
            className="border rounded-xl overflow-hidden"
            style={cardStyle}
          >
            <SectionHeader
              icon={RefreshCw}
              title="Free Follow-up"
              subtitle="Allow customers to request free follow-ups within a period"
              section="followup"
              enabled={followup.enabled}
              onToggle={() => updateFollowup({ enabled: !followup.enabled })}
            />

            {expandedSections.followup && followup.enabled && (
              <div
                className="p-5 border-t space-y-5 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB',
                  backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                }}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      Free Follow-ups <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={followup.freeFollowups}
                      onChange={(e) => updateFollowup({ freeFollowups: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={10}
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      Valid For <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={followup.followupPeriod}
                      onChange={(e) => updateFollowup({ followupPeriod: parseInt(e.target.value) || 7 })}
                      min={1}
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      Period <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <select
                      value={followup.followupPeriodUnit}
                      onChange={(e) =>
                        updateFollowup({ followupPeriodUnit: e.target.value as 'days' | 'weeks' | 'months' })
                      }
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>

                {/* HIDDEN: Paid Followup Price - removed as per requirement */}

                {/* Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium" style={labelStyle}>
                      Conditions (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addCondition}
                      className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 font-medium transition-all hover:shadow-sm"
                      style={{ color: colors.brand.primary, borderColor: colors.brand.primary }}
                    >
                      <Plus className="w-4 h-4" /> Add Condition
                    </button>
                  </div>

                  {followup.conditions && followup.conditions.length > 0 ? (
                    <div className="space-y-2">
                      {followup.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={condition}
                            onChange={(e) => updateCondition(index, e.target.value)}
                            placeholder={`Condition ${index + 1}`}
                            className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            onClick={() => removeCondition(index)}
                            className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: colors.semantic.error }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic p-3 rounded-lg" style={{ color: colors.utility.secondaryText, backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
                      No conditions added. Follow-ups will be available unconditionally.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Warranty Section */}
          <div
            className="border rounded-xl overflow-hidden"
            style={cardStyle}
          >
            <SectionHeader
              icon={Shield}
              title="Warranty"
              subtitle="Offer warranty coverage for this service"
              section="warranty"
              enabled={warranty.enabled}
              onToggle={() => updateWarranty({ enabled: !warranty.enabled })}
            />

            {expandedSections.warranty && warranty.enabled && (
              <div
                className="p-5 border-t space-y-5 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB',
                  backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                }}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      Warranty Period <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={warranty.warrantyPeriod}
                      onChange={(e) => updateWarranty({ warrantyPeriod: parseInt(e.target.value) || 30 })}
                      min={1}
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      Period Unit <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <select
                      value={warranty.warrantyPeriodUnit}
                      onChange={(e) =>
                        updateWarranty({ warrantyPeriodUnit: e.target.value as 'days' | 'months' | 'years' })
                      }
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      Warranty Type <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <select
                      value={warranty.warrantyType}
                      onChange={(e) =>
                        updateWarranty({
                          warrantyType: e.target.value as 'full' | 'limited' | 'parts_only' | 'labor_only',
                        })
                      }
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    >
                      <option value="full">Full Warranty</option>
                      <option value="limited">Limited Warranty</option>
                      <option value="parts_only">Parts Only</option>
                      <option value="labor_only">Labor Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>
                    Warranty Terms <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <textarea
                    value={warranty.warrantyTerms || ''}
                    onChange={(e) => updateWarranty({ warrantyTerms: e.target.value })}
                    placeholder="Describe warranty terms and conditions..."
                    rows={4}
                    className="w-full px-4 py-3 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
                    style={inputStyle}
                    required
                  />
                  <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
                    Clearly describe what is covered and any exclusions
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* HIDDEN: Cancellation Policy Section */}
          {/*
          <div className="border rounded-xl overflow-hidden" style={cardStyle}>
            <SectionHeader
              icon={XCircle}
              title="Cancellation Policy"
              subtitle="Define refund rules for cancellations"
              section="cancellation"
            />
            ... cancellation policy content ...
          </div>
          */}

          {/* HIDDEN: Reschedule Rules Section */}
          {/*
          <div className="border rounded-xl overflow-hidden" style={cardStyle}>
            <SectionHeader
              icon={Calendar}
              title="Reschedule Rules"
              subtitle="Control how often customers can reschedule"
              section="reschedule"
            />
            ... reschedule rules content ...
          </div>
          */}

          {/* Additional Options - Only Require Advance Deposit */}
          <div
            className="p-5 rounded-xl border"
            style={cardStyle}
          >
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <Wallet className="w-5 h-5" style={{ color: colors.brand.primary }} />
              Payment Options
            </h4>
            <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl border-2 transition-all hover:shadow-sm"
                style={{
                  backgroundColor: (formData.meta?.requiresDeposit as boolean)
                    ? `${colors.brand.primary}08`
                    : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                  borderColor: (formData.meta?.requiresDeposit as boolean)
                    ? colors.brand.primary
                    : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                }}
              >
                <input
                  type="checkbox"
                  checked={(formData.meta?.requiresDeposit as boolean) || false}
                  onChange={(e) => onChange('meta', { ...formData.meta, requiresDeposit: e.target.checked })}
                  className="w-5 h-5 rounded mt-0.5"
                  style={{ accentColor: colors.brand.primary }}
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                    Require Advance Deposit
                    {(formData.meta?.requiresDeposit as boolean) && (
                      <CheckCircle2 className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    )}
                  </span>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    Collect partial payment when booking to confirm the service
                  </p>
                </div>
              </label>

              {(formData.meta?.requiresDeposit as boolean) && (
                <div className="pl-9 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>
                    Deposit Amount <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={(formData.meta?.depositPercentage as number) || 25}
                      onChange={(e) =>
                        onChange('meta', { ...formData.meta, depositPercentage: parseInt(e.target.value) || 25 })
                      }
                      min={1}
                      max={100}
                      className="w-24 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                      required
                    />
                    <span
                      className="px-4 py-3 rounded-xl text-sm font-medium"
                      style={{
                        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                        color: colors.utility.secondaryText
                      }}
                    >
                      % of total
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* HIDDEN: Other additional options */}
            {/*
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.meta?.autoApprove as boolean) || false}
                onChange={(e) => onChange('meta', { ...formData.meta, autoApprove: e.target.checked })}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <div>
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Auto-approve bookings
                </span>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Bookings are confirmed immediately without manual review
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.meta?.requiresOTP as boolean) || false}
                onChange={(e) => onChange('meta', { ...formData.meta, requiresOTP: e.target.checked })}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <div>
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Require OTP verification
                </span>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Customer must verify with OTP before service starts
                </p>
              </div>
            </label>
            */}
          </div>
        </div>

        {/* Right Column (2/5) - Explanation Card */}
        <div className="lg:col-span-2">
          <div
            className="p-6 rounded-xl border h-full"
            style={{
              backgroundColor: isDarkMode ? `${colors.semantic.warning}10` : '#FFFBEB',
              borderColor: isDarkMode ? `${colors.semantic.warning}30` : '#FCD34D'
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: isDarkMode ? colors.semantic.warning : '#F59E0B',
                }}
              >
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-base" style={{ color: isDarkMode ? colors.utility.primaryText : '#78350F' }}>
                  Business Rules Guide
                </h4>
              </div>
            </div>

            <div className="space-y-4 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#92400E' }}>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.warning : '#D97706' }} />
                  <div>
                    <strong>Free Follow-up</strong>
                    <p className="text-xs mt-0.5 opacity-80">
                      Offer customers free revisits within a specified period. Great for building trust and ensuring customer satisfaction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.warning : '#D97706' }} />
                  <div>
                    <strong>Warranty</strong>
                    <p className="text-xs mt-0.5 opacity-80">
                      Provide warranty coverage to protect customers. Clearly define terms to avoid disputes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.warning : '#D97706' }} />
                  <div>
                    <strong>Advance Deposit</strong>
                    <p className="text-xs mt-0.5 opacity-80">
                      Collect upfront payment to reduce no-shows and confirm serious bookings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="mt-5 p-4 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.warning : '#D97706' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#78350F' }}>
                  Best Practices
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#92400E' }}>
                <li>• Offer at least 1 free follow-up for complex services</li>
                <li>• Set warranty period based on service type</li>
                <li>• 10-25% deposit is common for most services</li>
                <li>• Clear terms prevent misunderstandings</li>
              </ul>
            </div>

            <div
              className="mt-4 p-4 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.warning : '#D97706' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#78350F' }}>
                  Required Fields
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#92400E' }}>
                <li>• All fields marked with <span style={{ color: colors.semantic.error }}>*</span> are mandatory</li>
                <li>• When a section is enabled, fill all required fields</li>
                <li>• Warranty terms must be clearly written</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRulesStep;

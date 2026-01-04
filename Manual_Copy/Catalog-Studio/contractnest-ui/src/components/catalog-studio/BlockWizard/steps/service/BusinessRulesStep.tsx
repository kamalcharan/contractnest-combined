// src/components/catalog-studio/BlockWizard/steps/service/BusinessRulesStep.tsx
// Phase 7: Business Rules Configuration
// Free followups, warranty, cancellation, reschedule policies

import React, { useState } from 'react';
import {
  RefreshCw,
  Shield,
  XCircle,
  Calendar,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block, FollowupConfig, WarrantyConfig, CancellationConfig, RescheduleConfig } from '../../../../../types/catalogStudio';

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
    warranty: false,
    cancellation: true,
    reschedule: true,
  });

  // Get current values from formData.meta
  const followup: FollowupConfig = (formData.meta?.followup as FollowupConfig) || {
    enabled: false,
    freeFollowups: 0,
    followupPeriod: 7,
    followupPeriodUnit: 'days',
    conditions: [],
  };

  const warranty: WarrantyConfig = (formData.meta?.warranty as WarrantyConfig) || {
    enabled: false,
    warrantyPeriod: 30,
    warrantyPeriodUnit: 'days',
    warrantyType: 'limited',
  };

  const cancellation: CancellationConfig = (formData.meta?.cancellation as CancellationConfig) || {
    policy: 'moderate',
    refundPercentage: 50,
    cutoffHours: 24,
  };

  const reschedule: RescheduleConfig = (formData.meta?.reschedule as RescheduleConfig) || {
    maxReschedules: 2,
    rescheduleBuffer: 24,
    freeReschedules: 1,
  };

  // Styles - white background for light mode
  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
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

  const updateCancellation = (updates: Partial<CancellationConfig>) => {
    const updated = { ...cancellation, ...updates };
    onChange('meta', { ...formData.meta, cancellation: updated });
  };

  const updateReschedule = (updates: Partial<RescheduleConfig>) => {
    const updated = { ...reschedule, ...updates };
    onChange('meta', { ...formData.meta, reschedule: updated });
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

  // Cancellation policy presets
  const cancellationPresets = [
    { id: 'flexible', name: 'Flexible', description: 'Full refund until 24h before', refund: 100, hours: 24 },
    { id: 'moderate', name: 'Moderate', description: '50% refund until 24h before', refund: 50, hours: 24 },
    { id: 'strict', name: 'Strict', description: 'No refund after booking', refund: 0, hours: 0 },
    { id: 'custom', name: 'Custom', description: 'Define your own policy', refund: null, hours: null },
  ];

  // Section Header Component
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
    section,
    enabled,
    onToggle,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    section: string;
    enabled?: boolean;
    onToggle?: () => void;
  }) => (
    <div
      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-xl"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${colors.brand.primary}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.brand.primary }} />
        </div>
        <div>
          <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
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
            className={`w-10 h-6 rounded-full transition-colors relative ${
              enabled ? '' : 'opacity-60'
            }`}
            style={{
              backgroundColor: enabled ? colors.brand.primary : isDarkMode ? '#4B5563' : '#D1D5DB',
            }}
          >
            <div
              className="absolute w-4 h-4 rounded-full bg-white top-1 transition-all"
              style={{ left: enabled ? '22px' : '4px' }}
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
        Configure follow-up policies, warranties, and cancellation rules.
      </p>

      <div className="space-y-4">
        {/* Followup Section */}
        <div
          className="border rounded-xl overflow-hidden"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
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
              className="p-4 border-t space-y-4"
              style={{
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground + '50' : '#F9FAFB',
              }}
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Free Follow-ups
                  </label>
                  <input
                    type="number"
                    value={followup.freeFollowups}
                    onChange={(e) => updateFollowup({ freeFollowups: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={10}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Valid For
                  </label>
                  <input
                    type="number"
                    value={followup.followupPeriod}
                    onChange={(e) => updateFollowup({ followupPeriod: parseInt(e.target.value) || 7 })}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Period
                  </label>
                  <select
                    value={followup.followupPeriodUnit}
                    onChange={(e) =>
                      updateFollowup({ followupPeriodUnit: e.target.value as 'days' | 'weeks' | 'months' })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              {/* Paid Followup Price */}
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Price for Additional Follow-ups (Optional)
                </label>
                <div className="relative w-48">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {(formData.meta?.currency as string)?.substring(0, 1) || '₹'}
                  </span>
                  <input
                    type="number"
                    value={followup.paidFollowupPrice || ''}
                    onChange={(e) =>
                      updateFollowup({ paidFollowupPrice: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="Free"
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={labelStyle}>
                    Conditions (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs flex items-center gap-1"
                    style={{ color: colors.brand.primary }}
                  >
                    <Plus className="w-3 h-3" /> Add Condition
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
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: colors.semantic.error }} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic" style={{ color: colors.utility.secondaryText }}>
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
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
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
              className="p-4 border-t space-y-4"
              style={{
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground + '50' : '#F9FAFB',
              }}
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Warranty Period
                  </label>
                  <input
                    type="number"
                    value={warranty.warrantyPeriod}
                    onChange={(e) => updateWarranty({ warrantyPeriod: parseInt(e.target.value) || 30 })}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Period Unit
                  </label>
                  <select
                    value={warranty.warrantyPeriodUnit}
                    onChange={(e) =>
                      updateWarranty({ warrantyPeriodUnit: e.target.value as 'days' | 'months' | 'years' })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Warranty Type
                  </label>
                  <select
                    value={warranty.warrantyType}
                    onChange={(e) =>
                      updateWarranty({
                        warrantyType: e.target.value as 'full' | 'limited' | 'parts_only' | 'labor_only',
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <option value="full">Full Warranty</option>
                    <option value="limited">Limited Warranty</option>
                    <option value="parts_only">Parts Only</option>
                    <option value="labor_only">Labor Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Warranty Terms (Optional)
                </label>
                <textarea
                  value={warranty.warrantyTerms || ''}
                  onChange={(e) => updateWarranty({ warrantyTerms: e.target.value })}
                  placeholder="Describe warranty terms and conditions..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Section */}
        <div
          className="border rounded-xl overflow-hidden"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
        >
          <SectionHeader
            icon={XCircle}
            title="Cancellation Policy"
            subtitle="Define refund rules for cancellations"
            section="cancellation"
          />

          {expandedSections.cancellation && (
            <div
              className="p-4 border-t space-y-4"
              style={{
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground + '50' : '#F9FAFB',
              }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cancellationPresets.map((preset) => {
                  const isSelected = cancellation.policy === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        updateCancellation({
                          policy: preset.id as CancellationConfig['policy'],
                          ...(preset.refund !== null ? { refundPercentage: preset.refund } : {}),
                          ...(preset.hours !== null ? { cutoffHours: preset.hours } : {}),
                        });
                      }}
                      className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? `${colors.brand.primary}08`
                          : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                        borderColor: isSelected
                          ? colors.brand.primary
                          : isDarkMode
                          ? colors.utility.secondaryBackground
                          : '#E5E7EB',
                        '--tw-ring-color': colors.brand.primary,
                      } as React.CSSProperties}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                          {preset.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4" style={{ color: colors.brand.primary }} />}
                      </div>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {cancellation.policy === 'custom' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>
                      Refund Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={cancellation.refundPercentage}
                        onChange={(e) =>
                          updateCancellation({ refundPercentage: parseInt(e.target.value) || 0 })
                        }
                        min={0}
                        max={100}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        style={inputStyle}
                      />
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>
                      Cutoff Time
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={cancellation.cutoffHours}
                        onChange={(e) => updateCancellation({ cutoffHours: parseInt(e.target.value) || 0 })}
                        min={0}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        style={inputStyle}
                      />
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        hours
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reschedule Section */}
        <div
          className="border rounded-xl overflow-hidden"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
        >
          <SectionHeader
            icon={Calendar}
            title="Reschedule Rules"
            subtitle="Control how often customers can reschedule"
            section="reschedule"
          />

          {expandedSections.reschedule && (
            <div
              className="p-4 border-t space-y-4"
              style={{
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground + '50' : '#F9FAFB',
              }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Max Reschedules
                  </label>
                  <input
                    type="number"
                    value={reschedule.maxReschedules}
                    onChange={(e) => updateReschedule({ maxReschedules: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={10}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Free Reschedules
                  </label>
                  <input
                    type="number"
                    value={reschedule.freeReschedules}
                    onChange={(e) => updateReschedule({ freeReschedules: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={reschedule.maxReschedules}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Buffer Time
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={reschedule.rescheduleBuffer}
                      onChange={(e) => updateReschedule({ rescheduleBuffer: parseInt(e.target.value) || 0 })}
                      min={0}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={inputStyle}
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      hours
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Reschedule Fee
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {(formData.meta?.currency as string)?.substring(0, 1) || '₹'}
                    </span>
                    <input
                      type="number"
                      value={reschedule.rescheduleCharge || ''}
                      onChange={(e) =>
                        updateReschedule({ rescheduleCharge: parseFloat(e.target.value) || undefined })
                      }
                      placeholder="Free"
                      className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{
                  backgroundColor: `${colors.semantic.info}10`,
                  border: `1px solid ${colors.semantic.info}30`,
                }}
              >
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info }} />
                <p className="text-xs" style={{ color: colors.utility.primaryText }}>
                  Customers must reschedule at least {reschedule.rescheduleBuffer} hours before the
                  service. The first {reschedule.freeReschedules} reschedule(s) are free.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Options */}
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
          }}
        >
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Additional Options
          </h4>
          <div className="space-y-3">
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
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.meta?.requiresDeposit as boolean) || false}
                onChange={(e) => onChange('meta', { ...formData.meta, requiresDeposit: e.target.checked })}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <div>
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Require advance deposit
                </span>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Collect partial payment when booking
                </p>
              </div>
            </label>
            {(formData.meta?.requiresDeposit as boolean) && (
              <div className="pl-7">
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Deposit Amount (%)
                </label>
                <input
                  type="number"
                  value={(formData.meta?.depositPercentage as number) || 25}
                  onChange={(e) =>
                    onChange('meta', { ...formData.meta, depositPercentage: parseInt(e.target.value) || 25 })
                  }
                  min={1}
                  max={100}
                  className="w-24 px-3 py-2 border rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRulesStep;

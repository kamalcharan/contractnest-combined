// src/components/contracts/ContractWizard/steps/ContractDetailsStep.tsx
// Step 3: Contract Details - 2-Column Layout with Beautiful Cards
// V2.0: Enhanced UX with status flow hint, duration presets, 3-node timeline
import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  Calendar,
  ChevronDown,
  AlertCircle,
  ArrowRight,
  Coins,
  Timer,
  CircleDot,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { currencyOptions, getDefaultCurrency, getCurrencySymbol } from '@/utils/constants/currencies';
import {
  CONTRACT_STATUS_CONFIG,
  CONTRACT_STATUS_HEX_COLORS,
  DURATION_UNIT_CONFIG,
  CONTRACT_DURATION_PRESETS,
  GRACE_PERIOD_PRESETS,
  CONTRACT_TITLE_MAX_LENGTH,
  CONTRACT_DESCRIPTION_MAX_LENGTH,
  getDurationLabel,
  getContractStatusConfig,
} from '@/utils/constants/contracts';

export interface ContractDetailsData {
  contractName: string;
  status: string;
  currency: string;
  description: string;
  durationValue: number;
  durationUnit: string;
  gracePeriodValue: number;
  gracePeriodUnit: string;
}

interface ContractDetailsStepProps {
  data: ContractDetailsData;
  onChange: (data: Partial<ContractDetailsData>) => void;
  errors?: Partial<Record<keyof ContractDetailsData, string>>;
  title?: string;
  subtitle?: string;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>
  >;
  return iconsMap[iconName] || LucideIcons.Circle;
};

// Status flow mapping - what comes after each status
const STATUS_FLOW: Record<string, string | null> = {
  draft: 'submitted',
  submitted: 'accepted',
  accepted: 'active',
  active: 'completed',
  completed: null,
  cancelled: null,
  expired: null,
  on_hold: 'active',
};

const ContractDetailsStep: React.FC<ContractDetailsStepProps> = ({
  data,
  onChange,
  errors = {},
  title,
  subtitle,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state
  const [titleTouched, setTitleTouched] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Get default currency
  const defaultCurrency = getDefaultCurrency();

  // Initialize currency if not set
  useEffect(() => {
    if (!data.currency) {
      onChange({ currency: defaultCurrency.code });
    }
  }, []);

  // Calculate dates for timeline
  const timelineDates = useMemo(() => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    const graceEndDate = new Date(startDate);

    // Calculate end date based on duration
    if (data.durationUnit === 'days') {
      endDate.setDate(endDate.getDate() + (data.durationValue || 0));
    } else if (data.durationUnit === 'months') {
      endDate.setMonth(endDate.getMonth() + (data.durationValue || 0));
    } else if (data.durationUnit === 'years') {
      endDate.setFullYear(endDate.getFullYear() + (data.durationValue || 0));
    }

    // Calculate grace period end
    graceEndDate.setTime(endDate.getTime());
    if (data.gracePeriodUnit === 'days') {
      graceEndDate.setDate(graceEndDate.getDate() + (data.gracePeriodValue || 0));
    } else if (data.gracePeriodUnit === 'months') {
      graceEndDate.setMonth(graceEndDate.getMonth() + (data.gracePeriodValue || 0));
    } else if (data.gracePeriodUnit === 'years') {
      graceEndDate.setFullYear(graceEndDate.getFullYear() + (data.gracePeriodValue || 0));
    }

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
      graceEnd: data.gracePeriodValue > 0 ? formatDate(graceEndDate) : null,
    };
  }, [data.durationValue, data.durationUnit, data.gracePeriodValue, data.gracePeriodUnit]);

  // Get current status config
  const currentStatusConfig = getContractStatusConfig(data.status);
  const nextStatus = STATUS_FLOW[data.status];
  const nextStatusConfig = nextStatus ? getContractStatusConfig(nextStatus) : null;

  // Handle input changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONTRACT_TITLE_MAX_LENGTH) {
      onChange({ contractName: value });
    }
  };

  const handleStatusChange = (statusId: string) => {
    onChange({ status: statusId });
    setShowStatusDropdown(false);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ currency: e.target.value });
  };

  const handleDescriptionChange = (value: string) => {
    onChange({ description: value });
  };

  const handleDurationValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 0) {
      onChange({ durationValue: value });
    }
  };

  const handleDurationUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ durationUnit: e.target.value });
  };

  const handleDurationPreset = (preset: { value: number; unit: string }) => {
    onChange({ durationValue: preset.value, durationUnit: preset.unit });
  };

  const handleGracePeriodValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 0) {
      onChange({ gracePeriodValue: value });
    }
  };

  const handleGracePeriodUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ gracePeriodUnit: e.target.value });
  };

  const handleGracePeriodPreset = (days: number) => {
    onChange({ gracePeriodValue: days, gracePeriodUnit: 'days' });
  };

  // Validation
  const isTitleValid = data.contractName.trim().length > 0;
  const showTitleError = titleTouched && !isTitleValid;

  // Input styles
  const inputBaseStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: `${colors.utility.primaryText}20`,
    color: colors.utility.primaryText,
  };

  return (
    <div
      className="min-h-[60vh] px-4 py-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            {title || 'Contract Details'}
          </h2>
          <p
            className="text-sm max-w-lg mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            {subtitle || 'Define the basic information for your contract'}
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN - Main Content (58%) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Contract Title Card */}
            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <label
                className="flex items-center gap-2 text-sm font-semibold mb-3"
                style={{ color: colors.utility.primaryText }}
              >
                <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
                Contract Title
                <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                value={data.contractName}
                onChange={handleTitleChange}
                placeholder="Enter a descriptive title for this contract"
                className="w-full px-4 py-3 rounded-xl border-2 transition-all text-base"
                style={{
                  ...inputBaseStyle,
                  borderColor: showTitleError
                    ? colors.semantic.error
                    : `${colors.utility.primaryText}15`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.brand.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}15`;
                }}
                onBlur={(e) => {
                  setTitleTouched(true);
                  e.target.style.boxShadow = 'none';
                  if (!showTitleError) {
                    e.target.style.borderColor = `${colors.utility.primaryText}15`;
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                {showTitleError ? (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: colors.semantic.error }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    Contract title is required
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    A clear, descriptive title helps identify this contract
                  </span>
                )}
                <span
                  className="text-xs font-medium"
                  style={{
                    color:
                      data.contractName.length > CONTRACT_TITLE_MAX_LENGTH - 10
                        ? colors.semantic.warning
                        : colors.utility.secondaryText,
                  }}
                >
                  {data.contractName.length}/{CONTRACT_TITLE_MAX_LENGTH}
                </span>
              </div>
            </div>

            {/* Description Card */}
            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <RichTextEditor
                label="Description"
                value={data.description}
                onChange={handleDescriptionChange}
                placeholder="Describe the scope, terms, and deliverables of this contract..."
                minHeight={120}
                maxHeight={200}
                maxLength={CONTRACT_DESCRIPTION_MAX_LENGTH}
                showCharCount={true}
                toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
              />
            </div>
          </div>

          {/* RIGHT COLUMN - Settings Cards (42%) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Status Card with Flow Hint */}
            <div
              className="rounded-2xl border p-4 relative"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <label
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                <Clock className="w-3.5 h-3.5" />
                Status
              </label>

              {/* Custom Status Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full px-4 py-3 rounded-xl border-2 flex items-center justify-between transition-all"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: showStatusDropdown ? colors.brand.primary : `${colors.utility.primaryText}15`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {currentStatusConfig && (
                      <>
                        {React.createElement(getIconComponent(currentStatusConfig.lucideIcon), {
                          className: "w-5 h-5",
                          style: { color: CONTRACT_STATUS_HEX_COLORS[currentStatusConfig.colorKey] }
                        })}
                        <span
                          className="font-semibold"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {currentStatusConfig.label}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`}
                    style={{ color: colors.utility.secondaryText }}
                  />
                </button>

                {/* Dropdown Menu */}
                {showStatusDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-lg z-20 py-2 max-h-64 overflow-auto"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}15`,
                    }}
                  >
                    {CONTRACT_STATUS_CONFIG.map((status) => {
                      const isSelected = data.status === status.id;
                      const statusColor = CONTRACT_STATUS_HEX_COLORS[status.colorKey];
                      return (
                        <button
                          key={status.id}
                          onClick={() => handleStatusChange(status.id)}
                          className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: isSelected ? `${statusColor}15` : 'transparent',
                          }}
                        >
                          {React.createElement(getIconComponent(status.lucideIcon), {
                            className: "w-4 h-4",
                            style: { color: statusColor }
                          })}
                          <div className="flex-1">
                            <span
                              className="font-medium text-sm"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {status.label}
                            </span>
                            <p
                              className="text-xs"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {status.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: statusColor }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Next Status Hint */}
              {nextStatusConfig && (
                <div
                  className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: `${colors.brand.primary}08` }}
                >
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Next:
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: colors.brand.primary }}
                  >
                    {nextStatusConfig.label}
                  </span>
                </div>
              )}
            </div>

            {/* Currency Card */}
            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <label
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                <Coins className="w-3.5 h-3.5" />
                Currency
              </label>
              <div className="relative">
                <select
                  value={data.currency || defaultCurrency.code}
                  onChange={handleCurrencyChange}
                  className="w-full px-4 py-3 rounded-xl border-2 appearance-none cursor-pointer transition-all text-base font-medium"
                  style={{
                    ...inputBaseStyle,
                    borderColor: `${colors.utility.primaryText}15`,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brand.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.utility.primaryText}15`;
                  }}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  style={{ color: colors.utility.secondaryText }}
                />
              </div>
            </div>

            {/* Duration & Timeline Card */}
            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <label
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                <Calendar className="w-3.5 h-3.5" />
                Duration & Timeline
              </label>

              {/* Duration Presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CONTRACT_DURATION_PRESETS.map((preset) => {
                  const isSelected =
                    data.durationValue === preset.value && data.durationUnit === preset.unit;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleDurationPreset(preset)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}08`,
                        color: isSelected ? '#fff' : colors.utility.primaryText,
                        border: `1px solid ${
                          isSelected ? colors.brand.primary : `${colors.utility.primaryText}12`
                        }`,
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Duration Input */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  min="1"
                  value={data.durationValue || ''}
                  onChange={handleDurationValueChange}
                  placeholder="0"
                  className="w-20 px-3 py-2.5 rounded-xl border-2 text-center transition-all font-semibold"
                  style={{
                    ...inputBaseStyle,
                    borderColor: `${colors.utility.primaryText}15`,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brand.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.utility.primaryText}15`;
                  }}
                />
                <div className="relative flex-1">
                  <select
                    value={data.durationUnit}
                    onChange={handleDurationUnitChange}
                    className="w-full px-3 py-2.5 rounded-xl border-2 appearance-none cursor-pointer transition-all font-medium"
                    style={{
                      ...inputBaseStyle,
                      borderColor: `${colors.utility.primaryText}15`,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.brand.primary;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.utility.primaryText}15`;
                    }}
                  >
                    {DURATION_UNIT_CONFIG.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: colors.utility.secondaryText }}
                  />
                </div>
              </div>

              {/* 3-Node Timeline */}
              {data.durationValue > 0 && (
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${colors.brand.primary}06` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {/* Start Node */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors.semantic.success }}
                      />
                      <span
                        className="text-[10px] font-semibold mt-1"
                        style={{ color: colors.semantic.success }}
                      >
                        START
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {timelineDates.start}
                      </span>
                    </div>

                    {/* Line to End */}
                    <div
                      className="flex-1 h-0.5 mx-2"
                      style={{ backgroundColor: colors.brand.primary }}
                    />

                    {/* End Node */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors.brand.primary }}
                      />
                      <span
                        className="text-[10px] font-semibold mt-1"
                        style={{ color: colors.brand.primary }}
                      >
                        END
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {timelineDates.end}
                      </span>
                    </div>

                    {/* Line to Grace (if grace period exists) */}
                    {timelineDates.graceEnd && (
                      <>
                        <div
                          className="flex-1 h-0.5 mx-2"
                          style={{
                            backgroundColor: colors.semantic.warning,
                            backgroundImage: `repeating-linear-gradient(90deg, ${colors.semantic.warning}, ${colors.semantic.warning} 4px, transparent 4px, transparent 8px)`,
                          }}
                        />

                        {/* Grace Node */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-3 h-3 rounded-full border-2"
                            style={{
                              borderColor: colors.semantic.warning,
                              backgroundColor: 'transparent',
                            }}
                          />
                          <span
                            className="text-[10px] font-semibold mt-1"
                            style={{ color: colors.semantic.warning }}
                          >
                            GRACE
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {timelineDates.graceEnd}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Grace Period Section */}
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <label
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Timer className="w-3.5 h-3.5" />
                  Grace Period / Prolongation
                </label>

                {/* Grace Period Presets */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {GRACE_PERIOD_PRESETS.map((preset) => {
                    const isSelected =
                      data.gracePeriodValue === preset.value &&
                      (preset.value === 0 || data.gracePeriodUnit === 'days');
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleGracePeriodPreset(preset.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isSelected
                            ? colors.semantic.warning
                            : `${colors.utility.primaryText}08`,
                          color: isSelected ? '#fff' : colors.utility.primaryText,
                          border: `1px solid ${
                            isSelected ? colors.semantic.warning : `${colors.utility.primaryText}12`
                          }`,
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Grace Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={data.gracePeriodValue || ''}
                    onChange={handleGracePeriodValueChange}
                    placeholder="0"
                    className="w-20 px-3 py-2.5 rounded-xl border-2 text-center transition-all font-semibold"
                    style={{
                      ...inputBaseStyle,
                      borderColor: `${colors.utility.primaryText}15`,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.semantic.warning;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.utility.primaryText}15`;
                    }}
                  />
                  <div className="relative flex-1">
                    <select
                      value={data.gracePeriodUnit}
                      onChange={handleGracePeriodUnitChange}
                      className="w-full px-3 py-2.5 rounded-xl border-2 appearance-none cursor-pointer transition-all font-medium"
                      style={{
                        ...inputBaseStyle,
                        borderColor: `${colors.utility.primaryText}15`,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.semantic.warning;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = `${colors.utility.primaryText}15`;
                      }}
                    >
                      {DURATION_UNIT_CONFIG.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: colors.utility.secondaryText }}
                    />
                  </div>
                </div>

                {/* Grace Period Info */}
                {data.gracePeriodValue > 0 && (
                  <p
                    className="text-xs mt-2 flex items-center gap-1"
                    style={{ color: colors.semantic.warning }}
                  >
                    <CircleDot className="w-3 h-3" />
                    +{getDurationLabel(data.gracePeriodValue, data.gracePeriodUnit)} extra after contract ends
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Helper Text */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: colors.utility.secondaryText }}
        >
          These details can be modified before sending the contract to the buyer
        </p>
      </div>

      {/* Click outside to close dropdown */}
      {showStatusDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowStatusDropdown(false)}
        />
      )}
    </div>
  );
};

export default ContractDetailsStep;

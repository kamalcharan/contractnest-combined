// src/components/contracts/ContractWizard/steps/ContractDetailsStep.tsx
// Step 3: Contract Details - Title, Status, Currency, Description, Duration, Grace Period
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  Calendar,
  ChevronDown,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { currencyOptions, getDefaultCurrency } from '@/utils/constants/currencies';
import {
  CONTRACT_STATUS_CONFIG,
  DURATION_UNIT_CONFIG,
  GRACE_PERIOD_PRESETS,
  CONTRACT_TITLE_MAX_LENGTH,
  CONTRACT_DESCRIPTION_MAX_LENGTH,
  getDurationLabel,
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
}

const ContractDetailsStep: React.FC<ContractDetailsStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local validation state
  const [titleTouched, setTitleTouched] = useState(false);

  // Get default currency
  const defaultCurrency = getDefaultCurrency();

  // Initialize currency if not set
  useEffect(() => {
    if (!data.currency) {
      onChange({ currency: defaultCurrency.code });
    }
  }, []);

  // Handle input changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONTRACT_TITLE_MAX_LENGTH) {
      onChange({ contractName: value });
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status: e.target.value });
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

  const handleGracePeriodValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 0) {
      onChange({ gracePeriodValue: value });
    }
  };

  const handleGracePeriodUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ gracePeriodUnit: e.target.value });
  };

  // Preset click handlers
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

  const inputFocusStyle = {
    borderColor: colors.brand.primary,
    outline: 'none',
    boxShadow: `0 0 0 3px ${colors.brand.primary}20`,
  };

  const labelStyle = {
    color: colors.utility.primaryText,
  };

  const secondaryTextStyle = {
    color: colors.utility.secondaryText,
  };

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            Contract Details
          </h2>
          <p
            className="text-sm max-w-lg mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            Define the basic information for your contract including title,
            duration, and terms.
          </p>
        </div>

        {/* Form Container */}
        <div
          className="rounded-2xl border p-6 space-y-6"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Contract Title */}
          <div>
            <label
              className="flex items-center gap-2 text-sm font-medium mb-2"
              style={labelStyle}
            >
              <FileText className="w-4 h-4" />
              Contract Title
              <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.contractName}
                onChange={handleTitleChange}
                onBlur={() => setTitleTouched(true)}
                placeholder="Enter a descriptive title for this contract"
                className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:border-brand-primary"
                style={{
                  ...inputBaseStyle,
                  borderColor: showTitleError
                    ? colors.semantic.error
                    : `${colors.utility.primaryText}20`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.brand.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
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
                  <span className="text-xs" style={secondaryTextStyle}>
                    A clear, descriptive title helps identify this contract
                  </span>
                )}
                <span
                  className="text-xs"
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
          </div>

          {/* Status & Currency Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label
                className="flex items-center gap-2 text-sm font-medium mb-2"
                style={labelStyle}
              >
                <Clock className="w-4 h-4" />
                Status
              </label>
              <div className="relative">
                <select
                  value={data.status}
                  onChange={handleStatusChange}
                  className="w-full px-4 py-3 rounded-xl border-2 appearance-none cursor-pointer transition-all"
                  style={inputBaseStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brand.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.utility.primaryText}20`;
                  }}
                >
                  {CONTRACT_STATUS_CONFIG.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: colors.utility.secondaryText }}
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label
                className="flex items-center gap-2 text-sm font-medium mb-2"
                style={labelStyle}
              >
                Currency
              </label>
              <div className="relative">
                <select
                  value={data.currency || defaultCurrency.code}
                  onChange={handleCurrencyChange}
                  className="w-full px-4 py-3 rounded-xl border-2 appearance-none cursor-pointer transition-all"
                  style={inputBaseStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brand.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.utility.primaryText}20`;
                  }}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: colors.utility.secondaryText }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <RichTextEditor
              label="Description"
              value={data.description}
              onChange={handleDescriptionChange}
              placeholder="Describe the scope, terms, and deliverables of this contract..."
              minHeight={150}
              maxHeight={300}
              maxLength={CONTRACT_DESCRIPTION_MAX_LENGTH}
              showCharCount={true}
              toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
            />
          </div>

          {/* Duration Section */}
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            <label
              className="flex items-center gap-2 text-sm font-medium mb-4"
              style={labelStyle}
            >
              <Calendar className="w-4 h-4" />
              Contract Duration
            </label>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={data.durationValue || ''}
                onChange={handleDurationValueChange}
                placeholder="0"
                className="w-24 px-4 py-3 rounded-xl border-2 text-center transition-all"
                style={inputBaseStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.brand.primary;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${colors.utility.primaryText}20`;
                }}
              />
              <div className="relative flex-1 max-w-[180px]">
                <select
                  value={data.durationUnit}
                  onChange={handleDurationUnitChange}
                  className="w-full px-4 py-3 rounded-xl border-2 appearance-none cursor-pointer transition-all"
                  style={inputBaseStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brand.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.utility.primaryText}20`;
                  }}
                >
                  {DURATION_UNIT_CONFIG.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: colors.utility.secondaryText }}
                />
              </div>
              {data.durationValue > 0 && (
                <span
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: `${colors.brand.primary}10`,
                    color: colors.brand.primary,
                  }}
                >
                  {getDurationLabel(data.durationValue, data.durationUnit)}
                </span>
              )}
            </div>
          </div>

          {/* Grace Period Section */}
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <label
                className="flex items-center gap-2 text-sm font-medium"
                style={labelStyle}
              >
                <Clock className="w-4 h-4" />
                Grace Period / Prolongation
              </label>
              <div
                className="flex items-center gap-1 text-xs"
                style={secondaryTextStyle}
              >
                <Info className="w-3 h-3" />
                Optional extension period
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {GRACE_PERIOD_PRESETS.map((preset) => {
                const isSelected =
                  data.gracePeriodValue === preset.value &&
                  (preset.value === 0 || data.gracePeriodUnit === 'days');
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleGracePeriodPreset(preset.value)}
                    className="px-3 py-1.5 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? colors.brand.primary
                        : `${colors.utility.primaryText}08`,
                      color: isSelected ? '#fff' : colors.utility.primaryText,
                      border: `1px solid ${
                        isSelected ? colors.brand.primary : `${colors.utility.primaryText}15`
                      }`,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={data.gracePeriodValue || ''}
                onChange={handleGracePeriodValueChange}
                placeholder="0"
                className="w-24 px-4 py-3 rounded-xl border-2 text-center transition-all"
                style={inputBaseStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.brand.primary;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${colors.utility.primaryText}20`;
                }}
              />
              <div className="relative flex-1 max-w-[180px]">
                <select
                  value={data.gracePeriodUnit}
                  onChange={handleGracePeriodUnitChange}
                  className="w-full px-4 py-3 rounded-xl border-2 appearance-none cursor-pointer transition-all"
                  style={inputBaseStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brand.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.utility.primaryText}20`;
                  }}
                >
                  {DURATION_UNIT_CONFIG.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: colors.utility.secondaryText }}
                />
              </div>
              {data.gracePeriodValue > 0 && (
                <span
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: `${colors.semantic.warning}15`,
                    color: colors.semantic.warning,
                  }}
                >
                  +{getDurationLabel(data.gracePeriodValue, data.gracePeriodUnit)}
                </span>
              )}
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
    </div>
  );
};

export default ContractDetailsStep;

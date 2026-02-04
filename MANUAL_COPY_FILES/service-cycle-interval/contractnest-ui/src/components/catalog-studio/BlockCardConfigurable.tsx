// src/components/catalog-studio/BlockCardConfigurable.tsx
// Configurable block card with inline accordion for contract wizard - Column 2
// Features: drag handle, expand/collapse, qty/cycle settings, remove

import React, { useState, useCallback, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Minus,
  Settings,
  DollarSign,
  CreditCard,
  Receipt,
  Calendar,
  CalendarDays,
  CalendarClock,
  Sliders,
  FileText,
  ToggleLeft,
  ToggleRight,
  Percent,
  Repeat,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';
import { useTaxRatesDropdown } from '@/hooks/queries/useProductMasterdata';

// Billing cycle options
export const CYCLE_OPTIONS = [
  { id: 'prepaid', label: 'PrePaid', shortLabel: 'Pre', icon: CreditCard },
  { id: 'postpaid', label: 'PostPaid', shortLabel: 'Post', icon: Receipt },
  { id: 'monthly', label: 'Monthly', shortLabel: 'M', icon: Calendar },
  { id: 'fortnightly', label: 'Fortnightly', shortLabel: '2W', icon: CalendarDays },
  { id: 'quarterly', label: 'Quarterly', shortLabel: 'Q', icon: CalendarClock },
  { id: 'custom', label: 'Custom', shortLabel: 'C', icon: Sliders },
] as const;

export interface ConfigurableBlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  cycle: string;
  customCycleDays?: number; // For custom billing cycle
  serviceCycleDays?: number; // Service cycle interval (days between each occurrence)
  unlimited: boolean;
  price: number; // Defined price (from block)
  currency: string;
  totalPrice: number;
  categoryName: string;
  categoryColor: string;
  categoryBgColor?: string;
  categoryId?: string;
  isFlyBy?: boolean;
  flyByType?: string; // 'service' | 'spare' | 'text' | 'document'
  taxRate?: number; // Total tax rate percentage (e.g. 18)
  taxInclusion?: 'inclusive' | 'exclusive';
  taxes?: Array<{ id: string; name: string; rate: number }>; // Individual tax lines from master data
  // Additional config options
  config?: {
    showDescription?: boolean; // Show description in contract
    customPrice?: number; // Selling price (editable, defaults to defined price)
    notes?: string;
    content?: string; // Text block content
    sku?: string; // Spare part SKU
    fileType?: string; // Document file type
  };
}

export interface BlockCardConfigurableProps {
  block: ConfigurableBlock;
  isExpanded?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  contractDurationDays?: number; // Contract duration in days for cycle validation
  onToggleExpand?: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<ConfigurableBlock>) => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>
  >;
  return iconsMap[iconName] || LucideIcons.Package;
};

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR', decimals = 0) => {
  const symbol = getCurrencySymbol(currency);
  if (decimals > 0) {
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  return `${symbol}${amount.toLocaleString()}`;
};

const BlockCardConfigurable: React.FC<BlockCardConfigurableProps> = ({
  block,
  isExpanded = false,
  isDragging = false,
  dragHandleProps,
  contractDurationDays,
  onToggleExpand,
  onRemove,
  onUpdate,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const IconComponent = getIconComponent(block.icon);
  const hasPricing = categoryHasPricing(block.categoryId || '');

  // Tax master data
  const { options: taxRateOptions } = useTaxRatesDropdown();
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);

  // Local state for selling price input (fixes UX: controlled number input blocks replacement)
  const [sellingPriceInput, setSellingPriceInput] = useState(
    (block.config?.customPrice ?? block.price).toString()
  );
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  // Sync when block changes externally (not during active editing)
  useEffect(() => {
    if (!isEditingPrice) {
      setSellingPriceInput((block.config?.customPrice ?? block.price).toString());
    }
  }, [block.config?.customPrice, block.price, isEditingPrice]);

  // Tax calculations
  const effectivePrice = block.config?.customPrice ?? block.price;
  const taxRate = block.taxRate || 0;
  const taxAmount = block.taxInclusion === 'inclusive'
    ? effectivePrice - effectivePrice / (1 + taxRate / 100)
    : effectivePrice * taxRate / 100;
  const unitTotalWithTax = block.taxInclusion === 'inclusive'
    ? effectivePrice
    : effectivePrice + taxAmount;

  // Local state for inline editing
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggleExpand ? isExpanded : localExpanded;

  const handleToggle = useCallback(() => {
    if (onToggleExpand) {
      onToggleExpand(block.id);
    } else {
      setLocalExpanded(!localExpanded);
    }
  }, [block.id, localExpanded, onToggleExpand]);

  const handleQuantityChange = useCallback(
    (delta: number) => {
      const newQty = Math.max(1, block.quantity + delta);
      onUpdate(block.id, { quantity: newQty });
    },
    [block.id, block.quantity, onUpdate]
  );

  const handleCycleChange = useCallback(
    (cycle: string) => {
      onUpdate(block.id, { cycle });
    },
    [block.id, onUpdate]
  );

  const handleCustomCycleDaysChange = useCallback(
    (days: number | undefined) => {
      onUpdate(block.id, { customCycleDays: days });
    },
    [block.id, onUpdate]
  );

  const handleUnlimitedToggle = useCallback(() => {
    onUpdate(block.id, {
      unlimited: !block.unlimited,
      // Clear service cycle when switching to unlimited
      ...(!block.unlimited ? { serviceCycleDays: undefined } : {}),
    });
  }, [block.id, block.unlimited, onUpdate]);

  const handleServiceCycleDaysChange = useCallback(
    (days: number | undefined) => {
      onUpdate(block.id, { serviceCycleDays: days });
    },
    [block.id, onUpdate]
  );

  // Service cycle validation
  const serviceCycleSpanDays = (block.serviceCycleDays && !block.unlimited && block.quantity > 1)
    ? (block.quantity - 1) * block.serviceCycleDays
    : 0;
  const serviceCycleExceedsDuration = !!(contractDurationDays && serviceCycleSpanDays > contractDurationDays);

  const handleConfigChange = useCallback(
    (key: keyof NonNullable<ConfigurableBlock['config']>, value: any) => {
      onUpdate(block.id, {
        config: {
          ...block.config,
          [key]: value,
        },
      });
    },
    [block.id, block.config, onUpdate]
  );

  // Get current cycle option
  const currentCycle = CYCLE_OPTIONS.find((c) => c.id === block.cycle) || CYCLE_OPTIONS[0];

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        isDragging ? 'shadow-lg scale-[1.02]' : ''
      }`}
      style={{
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
        borderColor: expanded
          ? colors.brand.primary
          : isDarkMode
          ? `${colors.utility.primaryText}15`
          : '#E5E7EB',
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      {/* Header - Always visible */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="w-6 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing rounded"
            style={{ color: colors.utility.secondaryText }}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: block.categoryBgColor || `${block.categoryColor}20`,
            }}
          >
            <IconComponent className="w-4 h-4" style={{ color: block.categoryColor }} />
          </div>

          {/* Name & Category */}
          <div className="flex-1 min-w-0">
            <h4
              className="font-semibold text-sm truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {block.name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: block.categoryBgColor || `${block.categoryColor}15`,
                  color: block.categoryColor,
                }}
              >
                {block.categoryName}
              </span>
              {hasPricing && (
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {block.unlimited ? '∞' : `×${block.quantity}`} • {currentCycle.shortLabel}
                </span>
              )}
            </div>
          </div>

          {/* Price - only for pricing categories */}
          {hasPricing && (
            <div className="text-right">
              <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                {formatCurrency(Math.round(block.totalPrice), block.currency)}
              </span>
              {taxRate > 0 && (
                <span className="text-[10px] block" style={{ color: colors.utility.secondaryText }}>
                  incl. {taxRate}% tax
                </span>
              )}
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={handleToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: expanded ? `${colors.brand.primary}15` : 'transparent',
              color: expanded ? colors.brand.primary : colors.utility.secondaryText,
            }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Remove */}
          <button
            onClick={() => onRemove(block.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            style={{ color: colors.semantic.error }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Settings Panel */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-0 border-t"
          style={{ borderColor: `${colors.utility.primaryText}10` }}
        >
          <div className="pt-3 space-y-4">
            {/* Description for non-pricing blocks */}
            {!hasPricing && block.description && (
              <div
                className="text-xs prose prose-xs max-w-none"
                style={{ color: colors.utility.secondaryText }}
                dangerouslySetInnerHTML={{ __html: block.description }}
              />
            )}

            {/* Quantity Section - Limited/Unlimited Switch (pricing blocks only) */}
            {hasPricing && <div>
              <label
                className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                style={{ color: colors.utility.secondaryText }}
              >
                Quantity
              </label>
              <div className="flex items-center gap-3">
                {/* Limited/Unlimited Switch */}
                <button
                  onClick={handleUnlimitedToggle}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: `${colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground,
                  }}
                >
                  {block.unlimited ? (
                    <ToggleRight className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  ) : (
                    <ToggleLeft className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                  )}
                  <span
                    className="text-sm font-medium"
                    style={{ color: block.unlimited ? colors.brand.primary : colors.utility.primaryText }}
                  >
                    {block.unlimited ? 'Unlimited' : 'Limited'}
                  </span>
                </button>

                {/* Quantity Input - Only visible when Limited */}
                {!block.unlimited && (
                  <div
                    className="flex items-center gap-1 rounded-lg border px-2 py-1.5"
                    style={{ borderColor: `${colors.utility.primaryText}20` }}
                  >
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={block.quantity <= 1}
                      className="p-1 rounded hover:opacity-80 disabled:opacity-40"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-semibold"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {block.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>}

            {/* Service Cycle Interval Card (pricing blocks, not unlimited) */}
            {hasPricing && !block.unlimited && (
              <div
                className="p-3 rounded-xl border-2 border-dashed"
                style={{
                  borderColor: serviceCycleExceedsDuration
                    ? colors.semantic.error
                    : block.serviceCycleDays
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}20`,
                  backgroundColor: serviceCycleExceedsDuration
                    ? `${colors.semantic.error}08`
                    : block.serviceCycleDays
                    ? `${colors.brand.primary}06`
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                  <label
                    className="text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Service Cycle
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Every</span>
                  <input
                    type="number"
                    min="1"
                    value={block.serviceCycleDays || ''}
                    onChange={(e) => handleServiceCycleDaysChange(
                      e.target.value ? Math.max(1, Number(e.target.value)) : undefined
                    )}
                    placeholder="—"
                    className="w-20 px-2.5 py-1.5 text-sm font-medium text-center rounded-lg border"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: serviceCycleExceedsDuration
                        ? colors.semantic.error
                        : `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText,
                    }}
                  />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    days from start of contract
                  </span>
                </div>

                {/* Summary text */}
                {block.serviceCycleDays && block.serviceCycleDays > 0 && (
                  <div className="mt-2">
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: colors.utility.primaryText }}
                    >
                      This service will be performed every <strong>{block.serviceCycleDays} days</strong>,{' '}
                      <strong>{block.quantity} time{block.quantity > 1 ? 's' : ''}</strong>
                      {block.quantity > 1 && (
                        <span style={{ color: colors.utility.secondaryText }}>
                          {' '}(Day 1 to Day {(block.quantity - 1) * block.serviceCycleDays})
                        </span>
                      )}
                    </p>

                    {/* Validation warning */}
                    {serviceCycleExceedsDuration && contractDurationDays && (
                      <div
                        className="flex items-start gap-1.5 mt-2 p-2 rounded-lg"
                        style={{ backgroundColor: `${colors.semantic.error}12` }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.error }} />
                        <span className="text-xs" style={{ color: colors.semantic.error }}>
                          Cycles span {serviceCycleSpanDays} days but contract is only {contractDurationDays} days.
                          Reduce quantity or increase interval.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Billing Cycle Section (pricing blocks only) */}
            {hasPricing && <div>
              <label
                className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                style={{ color: colors.utility.secondaryText }}
              >
                Billing Cycle
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CYCLE_OPTIONS.map((option) => {
                  const isActive = block.cycle === option.id;
                  const OptionIcon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleCycleChange(option.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                      style={{
                        backgroundColor: isActive ? colors.brand.primary : `${colors.utility.primaryText}08`,
                        color: isActive ? '#FFFFFF' : colors.utility.secondaryText,
                      }}
                      title={option.label}
                    >
                      <OptionIcon className="w-3.5 h-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Days Input - Only visible when Custom is selected */}
              {block.cycle === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={block.customCycleDays || ''}
                    onChange={(e) => handleCustomCycleDaysChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Enter days"
                    className="w-24 px-3 py-1.5 text-sm rounded-lg border"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText,
                    }}
                  />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Days
                  </span>
                </div>
              )}
            </div>}

            {/* Advanced Settings (pricing blocks only) */}
            {hasPricing && <>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${colors.utility.primaryText}05` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                <span
                  className="text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Advanced Settings
                </span>
              </div>

              {/* Show description in contract toggle */}
              <div className="mb-3">
                <button
                  onClick={() => handleConfigChange('showDescription', !block.config?.showDescription)}
                  className="flex items-center gap-2 w-full"
                >
                  {block.config?.showDescription ? (
                    <ToggleRight className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  ) : (
                    <ToggleLeft className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                  )}
                  <FileText className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    Show description in contract
                  </span>
                </button>
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-2 gap-3">
                {/* Defined Price (readonly) */}
                <div>
                  <label
                    className="text-[10px] font-medium uppercase tracking-wide mb-1 block"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Defined Price
                  </label>
                  <div
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderColor: `${colors.utility.primaryText}15`,
                      color: colors.utility.secondaryText,
                    }}
                  >
                    {getCurrencySymbol(block.currency)}{block.price.toLocaleString()}
                  </div>
                </div>

                {/* Selling Price (editable) */}
                <div>
                  <label
                    className="text-[10px] font-medium uppercase tracking-wide mb-1 block"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <DollarSign className="w-3 h-3 inline mr-1" />
                    Selling Price
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {getCurrencySymbol(block.currency)}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sellingPriceInput}
                      onFocus={(e) => {
                        setIsEditingPrice(true);
                        e.target.select();
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setSellingPriceInput(val);
                          const num = parseFloat(val);
                          if (!isNaN(num) && num >= 0) {
                            handleConfigChange('customPrice', num);
                          }
                        }
                      }}
                      onBlur={() => {
                        setIsEditingPrice(false);
                        const num = parseFloat(sellingPriceInput);
                        if (isNaN(num) || sellingPriceInput.trim() === '') {
                          setSellingPriceInput(block.price.toString());
                          handleConfigChange('customPrice', undefined);
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: `${colors.utility.primaryText}20`,
                        color: colors.utility.primaryText,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tax Management */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-medium uppercase tracking-wide flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                    <Percent className="w-3 h-3" />
                    Tax Rates
                  </label>
                  <select
                    value={block.taxInclusion || 'exclusive'}
                    onChange={(e) => onUpdate(block.id, { taxInclusion: e.target.value as 'inclusive' | 'exclusive' })}
                    className="text-[10px] px-2 py-1 rounded border cursor-pointer"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText,
                    }}
                  >
                    <option value="exclusive">Exclusive</option>
                    <option value="inclusive">Inclusive</option>
                  </select>
                </div>

                {/* Tax chips from master data */}
                <div className="flex flex-wrap gap-1.5 items-center min-h-[32px] p-2 border rounded-lg" style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}20`,
                }}>
                  {(block.taxes || []).map((tax) => (
                    <span
                      key={tax.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                    >
                      {tax.name} ({tax.rate}%)
                      <button
                        type="button"
                        onClick={() => {
                          const newTaxes = (block.taxes || []).filter(t => t.id !== tax.id);
                          const newTaxRate = newTaxes.reduce((sum, t) => sum + Number(t.rate), 0);
                          onUpdate(block.id, { taxes: newTaxes, taxRate: newTaxRate });
                        }}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {/* Add Tax dropdown */}
                  {(() => {
                    const unused = taxRateOptions.filter(t => !(block.taxes || []).some(existing => existing.id === t.value));
                    if (unused.length === 0) return null;
                    return (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setTaxDropdownOpen(!taxDropdownOpen)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border border-dashed hover:border-solid transition-all"
                          style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
                        >
                          <Plus className="w-3 h-3" />
                          Add Tax
                        </button>

                        {taxDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setTaxDropdownOpen(false)} />
                            <div
                              className="absolute left-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-xl border shadow-lg"
                              style={{
                                backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                              }}
                            >
                              {unused.map((tax) => (
                                <button
                                  key={tax.value}
                                  type="button"
                                  onClick={() => {
                                    const newTaxes = [...(block.taxes || []), { id: tax.value, name: tax.label, rate: tax.rate || 0 }];
                                    const newTaxRate = newTaxes.reduce((sum, t) => sum + Number(t.rate), 0);
                                    onUpdate(block.id, { taxes: newTaxes, taxRate: newTaxRate });
                                    setTaxDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                  style={{ color: colors.utility.primaryText }}
                                >
                                  {tax.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {(block.taxes || []).length === 0 && taxRateOptions.length === 0 && (
                    <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>No taxes available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Price Summary with Tax Breakdown */}
            <div
              className="pt-2 border-t space-y-1"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              {taxRate > 0 && (
                <>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: colors.utility.secondaryText }}>
                      {block.taxInclusion === 'inclusive' ? 'Base Price' : 'Selling Price'}
                    </span>
                    <span style={{ color: colors.utility.primaryText }}>
                      {block.taxInclusion === 'inclusive'
                        ? formatCurrency(Math.round((effectivePrice - taxAmount) * 100) / 100, block.currency, 2)
                        : formatCurrency(effectivePrice, block.currency, 2)}
                    </span>
                  </div>
                  {block.taxes?.map((tax, i) => {
                    const perTaxAmount = block.taxInclusion === 'inclusive'
                      ? (effectivePrice / (1 + (block.taxRate || 0) / 100)) * Number(tax.rate) / 100
                      : effectivePrice * Number(tax.rate) / 100;
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span style={{ color: colors.utility.secondaryText }}>
                          {tax.name} ({tax.rate}%)
                        </span>
                        <span style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(Math.round(perTaxAmount * 100) / 100, block.currency, 2)}
                        </span>
                      </div>
                    );
                  })}
                  {block.taxInclusion && (
                    <span
                      className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5"
                      style={{
                        backgroundColor: block.taxInclusion === 'inclusive' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
                        color: block.taxInclusion === 'inclusive' ? colors.semantic.success : colors.semantic.warning,
                      }}
                    >
                      Tax {block.taxInclusion === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                    </span>
                  )}
                  <div
                    className="flex justify-between text-xs font-medium pt-1 mt-1 border-t"
                    style={{ borderColor: `${colors.utility.primaryText}08` }}
                  >
                    <span style={{ color: colors.utility.primaryText }}>
                      Total per unit
                    </span>
                    <span style={{ color: colors.semantic.success }}>
                      {formatCurrency(Math.round(unitTotalWithTax * 100) / 100, block.currency, 2)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {formatCurrency(Math.round(unitTotalWithTax * 100) / 100, block.currency, 2)} ×{' '}
                  {block.unlimited ? '∞' : block.quantity} ({currentCycle.label})
                </span>
                <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                  {formatCurrency(Math.round(block.totalPrice * 100) / 100, block.currency, 2)}
                </span>
              </div>
            </div>

            {/* Description shown when toggle is on (pricing blocks) */}
            {block.config?.showDescription && block.description && (
              <div
                className="text-xs mt-2 pt-2 border-t prose prose-xs max-w-none"
                style={{ borderColor: `${colors.utility.primaryText}10`, color: colors.utility.secondaryText }}
                dangerouslySetInnerHTML={{ __html: block.description }}
              />
            )}
            </>}

            {/* Show Description toggle - always available for all block types */}
            {!hasPricing && (
              <div>
                <button
                  onClick={() => handleConfigChange('showDescription', !block.config?.showDescription)}
                  className="flex items-center gap-2 w-full"
                >
                  {block.config?.showDescription ? (
                    <ToggleRight className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  ) : (
                    <ToggleLeft className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                  )}
                  <FileText className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    Show description in contract
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockCardConfigurable;

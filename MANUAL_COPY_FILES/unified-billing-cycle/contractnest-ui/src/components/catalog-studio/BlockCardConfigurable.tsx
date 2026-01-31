// src/components/catalog-studio/BlockCardConfigurable.tsx
// Configurable block card with inline accordion for contract wizard - Column 2
// Features: drag handle, expand/collapse, qty/cycle settings, remove

import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';

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
  onToggleExpand?: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<ConfigurableBlock>) => void;
  hideBillingCycle?: boolean;
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
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
};

const BlockCardConfigurable: React.FC<BlockCardConfigurableProps> = ({
  block,
  isExpanded = false,
  isDragging = false,
  dragHandleProps,
  onToggleExpand,
  onRemove,
  onUpdate,
  hideBillingCycle = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const IconComponent = getIconComponent(block.icon);
  const hasPricing = categoryHasPricing(block.categoryId || '');

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
    onUpdate(block.id, { unlimited: !block.unlimited });
  }, [block.id, block.unlimited, onUpdate]);

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
                {formatCurrency(block.totalPrice, block.currency)}
              </span>
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
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {block.description}
              </p>
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

            {/* Billing Cycle Section (pricing blocks only, hidden in unified mode) */}
            {hasPricing && !hideBillingCycle && <div>
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
                      type="number"
                      value={block.config?.customPrice ?? block.price}
                      onChange={(e) =>
                        handleConfigChange('customPrice', e.target.value ? Number(e.target.value) : undefined)
                      }
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
            </div>

            {/* Price Summary */}
            <div
              className="flex items-center justify-between pt-2 border-t"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {formatCurrency(block.config?.customPrice || block.price, block.currency)} ×{' '}
                {block.unlimited ? '∞' : block.quantity} ({currentCycle.label})
              </span>
              <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                {formatCurrency(block.totalPrice, block.currency)}
              </span>
            </div>
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

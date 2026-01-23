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
  Infinity,
  Zap,
  Calendar,
  CalendarDays,
  CalendarRange,
  Settings,
  DollarSign,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';

// Block cycle options
export const CYCLE_OPTIONS = [
  { id: 'one_time', label: 'One-time', shortLabel: '1x', icon: Zap },
  { id: 'monthly', label: 'Monthly', shortLabel: 'M', icon: Calendar },
  { id: 'quarterly', label: 'Quarterly', shortLabel: 'Q', icon: CalendarDays },
  { id: 'annually', label: 'Annually', shortLabel: 'Y', icon: CalendarRange },
] as const;

export interface ConfigurableBlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  cycle: string;
  unlimited: boolean;
  price: number;
  currency: string;
  totalPrice: number;
  categoryName: string;
  categoryColor: string;
  categoryBgColor?: string;
  // Additional config options
  config?: {
    proRate?: boolean;
    autoRenew?: boolean;
    customPrice?: number;
    notes?: string;
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
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const IconComponent = getIconComponent(block.icon);

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
              <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                {block.unlimited ? '∞' : `×${block.quantity}`} • {currentCycle.shortLabel}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
              {formatCurrency(block.totalPrice, block.currency)}
            </span>
          </div>

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
            {/* Quantity & Cycle Row */}
            <div className="flex items-center gap-3">
              {/* Quantity Control */}
              <div className="flex-1">
                <label
                  className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Quantity
                </label>
                <div
                  className="flex items-center gap-1 rounded-lg border px-2 py-1.5"
                  style={{ borderColor: `${colors.utility.primaryText}20` }}
                >
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={block.unlimited || block.quantity <= 1}
                    className="p-1 rounded hover:opacity-80 disabled:opacity-40"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className="w-10 text-center text-sm font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {block.unlimited ? '∞' : block.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={block.unlimited}
                    className="p-1 rounded hover:opacity-80 disabled:opacity-40"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {/* Unlimited toggle */}
                  <div className="border-l ml-1 pl-1" style={{ borderColor: `${colors.utility.primaryText}20` }}>
                    <button
                      onClick={handleUnlimitedToggle}
                      className="p-1 rounded transition-colors"
                      style={{
                        backgroundColor: block.unlimited ? `${colors.brand.primary}15` : 'transparent',
                        color: block.unlimited ? colors.brand.primary : colors.utility.secondaryText,
                      }}
                      title="Unlimited"
                    >
                      <Infinity className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cycle Selector */}
              <div className="flex-1">
                <label
                  className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Billing Cycle
                </label>
                <div className="flex gap-1">
                  {CYCLE_OPTIONS.map((option) => {
                    const isActive = block.cycle === option.id;
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleCycleChange(option.id)}
                        className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                        style={{
                          backgroundColor: isActive ? colors.brand.primary : `${colors.utility.primaryText}08`,
                          color: isActive ? '#FFFFFF' : colors.utility.secondaryText,
                        }}
                        title={option.label}
                      >
                        <OptionIcon className="w-3 h-3" />
                        {option.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
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

              <div className="grid grid-cols-2 gap-3">
                {/* Pro-rate toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={block.config?.proRate || false}
                    onChange={(e) => handleConfigChange('proRate', e.target.checked)}
                    className="w-4 h-4 rounded border-2 text-brand-primary focus:ring-brand-primary"
                    style={{ accentColor: colors.brand.primary }}
                  />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    Pro-rate billing
                  </span>
                </label>

                {/* Auto-renew toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={block.config?.autoRenew || false}
                    onChange={(e) => handleConfigChange('autoRenew', e.target.checked)}
                    className="w-4 h-4 rounded border-2 text-brand-primary focus:ring-brand-primary"
                    style={{ accentColor: colors.brand.primary }}
                  />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    Auto-renew
                  </span>
                </label>
              </div>

              {/* Custom Price Override */}
              <div className="mt-3">
                <label
                  className="text-[10px] font-medium uppercase tracking-wide mb-1 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Custom Price (optional)
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
                    value={block.config?.customPrice || ''}
                    onChange={(e) =>
                      handleConfigChange('customPrice', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder={block.price.toString()}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockCardConfigurable;

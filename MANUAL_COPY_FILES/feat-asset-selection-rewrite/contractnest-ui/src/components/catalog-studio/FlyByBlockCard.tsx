// src/components/catalog-studio/FlyByBlockCard.tsx
// FlyBy block card - inline empty block for contract wizard
// User enters all data manually without pre-existing catalog entry
// Supports 4 types: Service, Spare, Text, Document

import React, { useState, useCallback } from 'react';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Minus,
  Wrench,
  Package,
  FileText,
  File,
  Zap,
  CreditCard,
  Receipt,
  Calendar,
  CalendarDays,
  CalendarClock,
  Sliders,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { ConfigurableBlock, CYCLE_OPTIONS } from './BlockCardConfigurable';
import { useTaxRatesDropdown } from '@/hooks/queries/useProductMasterdata';

export type FlyByBlockType = 'service' | 'spare' | 'text' | 'document';

export const FLYBY_TYPE_CONFIG: Record<
  FlyByBlockType,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  service: { icon: Wrench, label: 'Service', color: '#3B82F6', bgColor: '#EFF6FF' },
  spare: { icon: Package, label: 'Spare Part', color: '#F59E0B', bgColor: '#FFFBEB' },
  text: { icon: FileText, label: 'Text Block', color: '#8B5CF6', bgColor: '#F5F3FF' },
  document: { icon: File, label: 'Document', color: '#10B981', bgColor: '#ECFDF5' },
};

// Document file type options
const FILE_TYPE_OPTIONS = [
  { id: 'pdf', label: 'PDF' },
  { id: 'docx', label: 'DOCX' },
  { id: 'xlsx', label: 'XLSX' },
  { id: 'pptx', label: 'PPTX' },
  { id: 'txt', label: 'TXT' },
  { id: 'other', label: 'Other' },
];

export interface FlyByBlockCardProps {
  block: ConfigurableBlock;
  isExpanded?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  onToggleExpand?: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<ConfigurableBlock>) => void;
  hidePricing?: boolean;
}

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR', decimals = 0) => {
  const symbol = getCurrencySymbol(currency);
  if (decimals > 0) {
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  return `${symbol}${amount.toLocaleString()}`;
};

const FlyByBlockCard: React.FC<FlyByBlockCardProps> = ({
  block,
  isExpanded = false,
  isDragging = false,
  dragHandleProps,
  onToggleExpand,
  onRemove,
  onUpdate,
  hidePricing = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const flyByType = block.flyByType || 'service';
  const typeConfig = FLYBY_TYPE_CONFIG[flyByType];
  const TypeIcon = typeConfig.icon;

  // Tax master data
  const { options: taxRateOptions } = useTaxRatesDropdown();
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);
  const [taxSearchQuery, setTaxSearchQuery] = useState('');

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

  const handleNameChange = useCallback(
    (name: string) => {
      onUpdate(block.id, { name });
    },
    [block.id, onUpdate]
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      onUpdate(block.id, { description });
    },
    [block.id, onUpdate]
  );

  const handlePriceChange = useCallback(
    (price: number) => {
      onUpdate(block.id, { price });
    },
    [block.id, onUpdate]
  );

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

  // Check if type has pricing (service, spare) — overridden by hidePricing
  const hasPricing = !hidePricing && (flyByType === 'service' || flyByType === 'spare');
  // Check if type has quantity
  const hasQuantity = !hidePricing && (flyByType === 'service' || flyByType === 'spare');
  // Check if type has billing cycle
  const hasBillingCycle = !hidePricing && flyByType === 'service';

  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
        isDragging ? 'shadow-lg scale-[1.02]' : ''
      }`}
      style={{
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
        borderColor: expanded
          ? typeConfig.color
          : isDarkMode
          ? `${colors.utility.primaryText}25`
          : '#D1D5DB',
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

          {/* Icon with FlyBy indicator */}
          <div className="relative">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: typeConfig.bgColor }}
            >
              <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
            </div>
            {/* FlyBy badge */}
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: typeConfig.color }}
            >
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          {/* Name & Type */}
          <div className="flex-1 min-w-0">
            <h4
              className="font-semibold text-sm truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {block.name || 'Untitled FlyBy'}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: typeConfig.bgColor,
                  color: typeConfig.color,
                }}
              >
                FlyBy {typeConfig.label}
              </span>
              {block.coverageTypeName && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: `${colors.utility.primaryText}08`,
                    color: colors.utility.secondaryText,
                  }}
                >
                  {block.coverageTypeName}
                </span>
              )}
              {hasQuantity && (
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {block.unlimited ? '∞' : `×${block.quantity}`}
                  {hasBillingCycle ? ` • ${currentCycle.shortLabel}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          {hasPricing && (
            <div className="text-right">
              <span className="text-sm font-bold" style={{ color: typeConfig.color }}>
                {formatCurrency(block.totalPrice, block.currency)}
              </span>
              {(block.taxRate || 0) > 0 && (
                <span className="text-[10px] block" style={{ color: colors.utility.secondaryText }}>
                  incl. {block.taxRate}% tax
                </span>
              )}
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={handleToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: expanded ? `${typeConfig.color}15` : 'transparent',
              color: expanded ? typeConfig.color : colors.utility.secondaryText,
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
          className="px-3 pb-3 pt-0 border-t border-dashed"
          style={{ borderColor: `${colors.utility.primaryText}15` }}
        >
          <div className="pt-3 space-y-4">
            {/* Name Field - Always shown */}
            <div>
              <label
                className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                style={{ color: colors.utility.secondaryText }}
              >
                Name
              </label>
              <input
                type="text"
                value={block.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`Enter ${typeConfig.label.toLowerCase()} name`}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                }}
              />
            </div>

            {/* Description - For Service, Spare, Document (always shown in hidePricing mode) */}
            {(hidePricing || flyByType === 'service' || flyByType === 'spare' || flyByType === 'document') && (
              <div>
                <RichTextEditor
                  value={block.description || ''}
                  onChange={(value) => handleDescriptionChange(value)}
                  label="Description"
                  placeholder={`Describe this ${typeConfig.label.toLowerCase()}`}
                  toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
                  minHeight={80}
                  maxHeight={200}
                  showCharCount={false}
                />
              </div>
            )}

            {/* Content - For Text type (RichText) */}
            {flyByType === 'text' && (
              <div>
                <RichTextEditor
                  value={block.config?.content || ''}
                  onChange={(value) => handleConfigChange('content', value)}
                  label="Content"
                  placeholder="Enter text content for the contract"
                  toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
                  minHeight={150}
                  maxHeight={300}
                  showCharCount={true}
                  maxLength={10000}
                  allowFullscreen={true}
                />
              </div>
            )}

            {/* SKU - For Spare type */}
            {flyByType === 'spare' && (
              <div>
                <label
                  className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  SKU
                </label>
                <input
                  type="text"
                  value={block.config?.sku || ''}
                  onChange={(e) => handleConfigChange('sku', e.target.value)}
                  placeholder="Enter SKU code"
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: `${colors.utility.primaryText}20`,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
            )}

            {/* File Type - For Document type */}
            {flyByType === 'document' && (
              <div>
                <label
                  className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  File Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FILE_TYPE_OPTIONS.map((option) => {
                    const isActive = block.config?.fileType === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleConfigChange('fileType', option.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: isActive ? typeConfig.color : `${colors.utility.primaryText}08`,
                          color: isActive ? '#FFFFFF' : colors.utility.secondaryText,
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Billing Cycle - For Service type */}
            {hasBillingCycle && (
              <div>
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
                          backgroundColor: isActive ? typeConfig.color : `${colors.utility.primaryText}08`,
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

                {/* Custom Days Input */}
                {block.cycle === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={block.customCycleDays || ''}
                      onChange={(e) =>
                        handleCustomCycleDaysChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
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
              </div>
            )}

            {/* Quantity Section - For Service, Spare */}
            {hasQuantity && (
              <div>
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
                      <ToggleRight className="w-5 h-5" style={{ color: typeConfig.color }} />
                    ) : (
                      <ToggleLeft
                        className="w-5 h-5"
                        style={{ color: colors.utility.secondaryText }}
                      />
                    )}
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: block.unlimited
                          ? typeConfig.color
                          : colors.utility.primaryText,
                      }}
                    >
                      {block.unlimited ? 'Unlimited' : 'Limited'}
                    </span>
                  </button>

                  {/* Quantity Input */}
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
              </div>
            )}

            {/* Price Section - For Service, Spare */}
            {hasPricing && (
              <div>
                <label
                  className="text-[10px] font-medium uppercase tracking-wide mb-1.5 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Price
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
                    value={block.price || ''}
                    onChange={(e) =>
                      handlePriceChange(e.target.value ? Number(e.target.value) : 0)
                    }
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tax Management - For Service, Spare */}
            {hasPricing && (
              <div
                className="pt-3 border-t"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
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
                      style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}
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
                          style={{ borderColor: typeConfig.color, color: typeConfig.color }}
                        >
                          <Plus className="w-3 h-3" />
                          Add Tax
                        </button>

                        {taxDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => { setTaxDropdownOpen(false); setTaxSearchQuery(''); }} />
                            <div
                              className="absolute left-0 z-50 mt-1 w-56 rounded-xl border shadow-lg"
                              style={{
                                backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                              }}
                            >
                              {unused.length > 4 && (
                                <div className="p-2 border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
                                  <input
                                    type="text"
                                    value={taxSearchQuery}
                                    onChange={(e) => setTaxSearchQuery(e.target.value)}
                                    placeholder="Search taxes..."
                                    autoFocus
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                                    style={{
                                      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
                                      borderColor: `${colors.utility.primaryText}15`,
                                      color: colors.utility.primaryText,
                                    }}
                                  />
                                </div>
                              )}
                              <div className="max-h-52 overflow-y-auto">
                                {unused
                                  .filter(tax => !taxSearchQuery || tax.label.toLowerCase().includes(taxSearchQuery.toLowerCase()))
                                  .map((tax) => (
                                  <button
                                    key={tax.value}
                                    type="button"
                                    onClick={() => {
                                      const newTaxes = [...(block.taxes || []), { id: tax.value, name: tax.label, rate: tax.rate || 0 }];
                                      const newTaxRate = newTaxes.reduce((sum, t) => sum + Number(t.rate), 0);
                                      onUpdate(block.id, { taxes: newTaxes, taxRate: newTaxRate });
                                      setTaxDropdownOpen(false);
                                      setTaxSearchQuery('');
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                    style={{ color: colors.utility.primaryText }}
                                  >
                                    {tax.label}
                                  </button>
                                ))}
                                {unused.filter(tax => !taxSearchQuery || tax.label.toLowerCase().includes(taxSearchQuery.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-2 text-xs" style={{ color: colors.utility.secondaryText }}>
                                    No matching taxes
                                  </div>
                                )}
                              </div>
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
            )}

            {/* Price Summary - For Service, Spare */}
            {hasPricing && block.price > 0 && (() => {
              const taxRate = block.taxRate || 0;
              const taxAmount = block.taxInclusion === 'inclusive'
                ? block.price - block.price / (1 + taxRate / 100)
                : block.price * taxRate / 100;
              const unitTotalWithTax = block.taxInclusion === 'inclusive'
                ? block.price
                : block.price + taxAmount;

              return (
                <div
                  className="pt-2 border-t space-y-1"
                  style={{ borderColor: `${colors.utility.primaryText}10` }}
                >
                  {taxRate > 0 && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: colors.utility.secondaryText }}>
                          {block.taxInclusion === 'inclusive' ? 'Base Price' : 'Price'}
                        </span>
                        <span style={{ color: colors.utility.primaryText }}>
                          {block.taxInclusion === 'inclusive'
                            ? formatCurrency(Math.round((block.price - taxAmount) * 100) / 100, block.currency, 2)
                            : formatCurrency(block.price, block.currency, 2)}
                        </span>
                      </div>
                      {block.taxes?.map((tax, i) => {
                        const perTaxAmount = block.taxInclusion === 'inclusive'
                          ? (block.price / (1 + taxRate / 100)) * Number(tax.rate) / 100
                          : block.price * Number(tax.rate) / 100;
                        return (
                          <div key={i} className="flex justify-between text-xs">
                            <span style={{ color: colors.utility.secondaryText }}>
                              {tax.name || 'Tax'} ({tax.rate}%)
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
                        <span style={{ color: colors.utility.primaryText }}>Total per unit</span>
                        <span style={{ color: colors.semantic.success }}>
                          {formatCurrency(Math.round(unitTotalWithTax * 100) / 100, block.currency, 2)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {formatCurrency(Math.round(unitTotalWithTax * 100) / 100, block.currency, 2)} ×{' '}
                      {block.unlimited ? '∞' : block.quantity}
                      {hasBillingCycle ? ` (${currentCycle.label})` : ''}
                    </span>
                    <span className="text-sm font-bold" style={{ color: typeConfig.color }}>
                      {formatCurrency(Math.round(block.totalPrice * 100) / 100, block.currency, 2)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlyByBlockCard;

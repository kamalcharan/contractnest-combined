// src/components/contracts/ContractWizard/steps/BillingViewStep.tsx
// Step 8: Billing View - 3-column layout
// Column 1: Billing config summary | Column 2: Line items | Column 3: Payment + Tax + Summary

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Calendar,
  Shuffle,
  CheckCircle2,
  DollarSign,
  Receipt,
  Percent,
  Edit3,
  Check,
  X,
  CreditCard,
  CalendarRange,
  ChevronDown,
  Minus,
  Plus,
  Info,
  ArrowRight,
  ListChecks,
  Lock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTaxRates } from '@/hooks/useTaxRates';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { ConfigurableBlock, CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import { BillingCycleType } from './BillingCycleStep';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';

export interface BillingViewStepProps {
  selectedBlocks: ConfigurableBlock[];
  currency: string;
  billingCycleType: BillingCycleType;
  onBlocksChange: (blocks: ConfigurableBlock[]) => void;
  // Tax
  selectedTaxRateIds: string[];
  onTaxRateIdsChange: (ids: string[]) => void;
  onTotalsChange?: (totals: {
    taxTotal: number;
    grandTotal: number;
    taxBreakdown: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }>;
  }) => void;
  // Payment
  paymentMode: 'prepaid' | 'emi' | 'defined';
  onPaymentModeChange: (mode: 'prepaid' | 'emi' | 'defined') => void;
  emiMonths: number;
  onEmiMonthsChange: (months: number) => void;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  onPerBlockPaymentTypeChange: (types: Record<string, 'prepaid' | 'postpaid'>) => void;
  // Contract info
  contractDuration?: number;
}

// Billing cycle option data (reused from BillingCycleStep)
const BILLING_CYCLE_OPTIONS = [
  {
    id: 'unified' as const,
    title: 'Unified Cycle',
    description: 'All services billed on the same schedule',
    icon: Calendar,
    benefits: ['Simpler invoicing', 'Predictable billing', 'Easier reconciliation'],
    visualExample: { labels: ['M', 'M', 'M'], description: 'All Monthly' },
  },
  {
    id: 'mixed' as const,
    title: 'Mixed Cycles',
    description: 'Each service has its own billing schedule',
    icon: Shuffle,
    benefits: ['Maximum flexibility', 'Mix recurring & one-time', 'Custom per service'],
    visualExample: { labels: ['M', 'Q', '1x'], description: 'Monthly, Quarterly, One-time' },
  },
];

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Get cycle label from id
const getCycleLabel = (cycleId: string): string => {
  const cycle = CYCLE_OPTIONS.find((c) => c.id === cycleId);
  return cycle?.label || cycleId || '-';
};

const BillingViewStep: React.FC<BillingViewStepProps> = ({
  selectedBlocks,
  currency,
  billingCycleType,
  onBlocksChange,
  selectedTaxRateIds,
  onTaxRateIdsChange,
  onTotalsChange,
  paymentMode,
  onPaymentModeChange,
  emiMonths,
  onEmiMonthsChange,
  perBlockPaymentType,
  onPerBlockPaymentTypeChange,
  contractDuration = 12,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch tax rates
  const { state: taxState } = useTaxRates();
  const availableTaxRates = useMemo(
    () =>
      (taxState.data || []).map((rate) => ({
        id: rate.id,
        name: rate.name,
        rate: rate.rate,
        isDefault: rate.is_default,
      })),
    [taxState.data]
  );

  // Filter to only billable blocks (categories that have pricing)
  const billableBlocks = useMemo(
    () => selectedBlocks.filter((b) => categoryHasPricing(b.categoryId || '')),
    [selectedBlocks]
  );

  const isMixed = billingCycleType === 'mixed';

  // Conditional availability for payment schedule options
  const allPrepaid = useMemo(
    () => billableBlocks.length > 0 && billableBlocks.every((b) => b.cycle === 'prepaid'),
    [billableBlocks]
  );
  const allPostpaid = useMemo(
    () => billableBlocks.length > 0 && billableBlocks.every((b) => b.cycle === 'postpaid'),
    [billableBlocks]
  );

  // "As Defined" breakup — group blocks by cycle type
  const definedBreakup = useMemo(() => {
    const groups: Record<string, { total: number; count: number }> = {};
    billableBlocks.forEach((block) => {
      const cycle = block.cycle || 'prepaid';
      if (!groups[cycle]) groups[cycle] = { total: 0, count: 0 };
      groups[cycle].total += block.totalPrice;
      groups[cycle].count += 1;
    });

    const order = ['prepaid', 'monthly', 'fortnightly', 'quarterly', 'custom', 'postpaid'];
    return order
      .filter((cycle) => groups[cycle])
      .map((cycle) => ({
        cycle,
        label:
          cycle === 'prepaid' ? 'On Acceptance (Prepaid)'
          : cycle === 'postpaid' ? 'On Completion (Postpaid)'
          : getCycleLabel(cycle),
        total: groups[cycle].total,
        blockCount: groups[cycle].count,
        isRecurring: !['prepaid', 'postpaid'].includes(cycle),
      }));
  }, [billableBlocks]);

  // Editing state for selling price
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  // Calculate totals from billable blocks — per-block tax aware
  const totals = useMemo(() => {
    const subtotal = billableBlocks.reduce((sum, b) => sum + b.totalPrice, 0);

    // Separate blocks with embedded tax from blocks without
    const blocksWithTax = billableBlocks.filter((b) => (b.taxRate || 0) > 0);
    const blocksWithoutTax = billableBlocks.filter((b) => !b.taxRate || b.taxRate === 0);

    // Per-block tax total (from blocks that already carry tax)
    const perBlockTaxTotal = blocksWithTax.reduce((sum, b) => {
      if (b.taxInclusive) {
        // For inclusive: tax is already inside totalPrice
        return sum + (b.totalPrice - b.totalPrice / (1 + (b.taxRate || 0) / 100));
      }
      return sum + b.totalPrice * ((b.taxRate || 0) / 100);
    }, 0);

    // Global tax rates (user-selected) — ONLY applied to blocks WITHOUT embedded tax
    const selectedRates = availableTaxRates.filter((r) =>
      selectedTaxRateIds.includes(r.id)
    );
    const totalTaxRate = selectedRates.reduce((sum, r) => sum + r.rate, 0);
    const subtotalForGlobalTax = blocksWithoutTax.reduce((sum, b) => sum + b.totalPrice, 0);
    const globalTaxAmount = subtotalForGlobalTax * (totalTaxRate / 100);

    // Combined tax
    const taxAmount = Math.round((perBlockTaxTotal + globalTaxAmount) * 100) / 100;

    // Grand total: subtotal + tax for exclusive blocks + global tax
    // For inclusive blocks, tax is already in subtotal, so only add exclusive per-block tax + global
    const exclusiveBlockTax = blocksWithTax
      .filter((b) => !b.taxInclusive)
      .reduce((sum, b) => sum + b.totalPrice * ((b.taxRate || 0) / 100), 0);
    const grandTotal = Math.round((subtotal + exclusiveBlockTax + globalTaxAmount) * 100) / 100;

    // EMI calculation
    const emiInstallment = emiMonths > 0 ? grandTotal / emiMonths : grandTotal;

    return {
      subtotal,
      selectedRates,
      totalTaxRate,
      taxAmount,
      grandTotal,
      blockCount: billableBlocks.length,
      emiInstallment,
      perBlockTaxTotal: Math.round(perBlockTaxTotal * 100) / 100,
      globalTaxAmount: Math.round(globalTaxAmount * 100) / 100,
      subtotalForGlobalTax,
      blocksWithTaxCount: blocksWithTax.length,
      blocksWithoutTaxCount: blocksWithoutTax.length,
    };
  }, [billableBlocks, availableTaxRates, selectedTaxRateIds, emiMonths]);

  // Report computed totals to parent wizard state
  useEffect(() => {
    if (!onTotalsChange) return;
    const taxBreakdown = totals.selectedRates.map((r) => ({
      tax_rate_id: r.id,
      name: r.name,
      rate: r.rate,
      amount: Math.round((totals.subtotal * r.rate / 100) * 100) / 100,
    }));
    onTotalsChange({
      taxTotal: Math.round(totals.taxAmount * 100) / 100,
      grandTotal: Math.round(totals.grandTotal * 100) / 100,
      taxBreakdown,
    });
  }, [totals.taxAmount, totals.grandTotal, totals.selectedRates, totals.subtotal, onTotalsChange]);

  // Start editing selling price
  const handleStartEdit = useCallback((blockId: string, currentPrice: number) => {
    setEditingBlockId(blockId);
    setEditPrice(currentPrice.toString());
  }, []);

  // Save selling price — recalculates per-block tax
  const handleSavePrice = useCallback(
    (blockId: string) => {
      const newPrice = parseFloat(editPrice) || 0;
      onBlocksChange(
        selectedBlocks.map((block) => {
          if (block.id === blockId) {
            const updated = {
              ...block,
              config: {
                ...block.config,
                customPrice: newPrice,
              },
            };
            const effectivePrice = newPrice;
            updated.totalPrice = updated.unlimited ? effectivePrice : effectivePrice * updated.quantity;
            // Recalculate per-block tax
            if (updated.taxRate && updated.taxRate > 0) {
              const lineBase = updated.totalPrice;
              if (updated.taxInclusive) {
                updated.taxAmount = Math.round(
                  (lineBase - lineBase / (1 + updated.taxRate / 100)) * 100
                ) / 100;
              } else {
                updated.taxAmount = Math.round(
                  (lineBase * (updated.taxRate / 100)) * 100
                ) / 100;
              }
            } else {
              updated.taxAmount = 0;
            }
            return updated;
          }
          return block;
        })
      );
      setEditingBlockId(null);
      setEditPrice('');
    },
    [editPrice, selectedBlocks, onBlocksChange]
  );

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingBlockId(null);
    setEditPrice('');
  }, []);

  // Handle key press in price input
  const handlePriceKeyDown = useCallback(
    (e: React.KeyboardEvent, blockId: string) => {
      if (e.key === 'Enter') {
        handleSavePrice(blockId);
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSavePrice, handleCancelEdit]
  );

  // Toggle tax rate
  const handleToggleTax = useCallback(
    (taxId: string) => {
      if (selectedTaxRateIds.includes(taxId)) {
        onTaxRateIdsChange(selectedTaxRateIds.filter((id) => id !== taxId));
      } else {
        onTaxRateIdsChange([...selectedTaxRateIds, taxId]);
      }
    },
    [selectedTaxRateIds, onTaxRateIdsChange]
  );

  // Handle per-block payment type change
  const handleBlockPaymentTypeChange = useCallback(
    (blockId: string, type: 'prepaid' | 'postpaid') => {
      onPerBlockPaymentTypeChange({
        ...perBlockPaymentType,
        [blockId]: type,
      });
    },
    [perBlockPaymentType, onPerBlockPaymentTypeChange]
  );

  // Get the selected billing cycle option
  const selectedCycleOption = BILLING_CYCLE_OPTIONS.find((o) => o.id === billingCycleType);

  // Grid template for table - add Tax and Payment columns
  const gridCols = isMixed
    ? 'grid-cols-[1fr_50px_80px_70px_90px_90px_90px]'
    : 'grid-cols-[1fr_50px_80px_70px_100px_100px]';

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* In-page Header */}
      <div className="text-center pt-6 pb-4 px-4 flex-shrink-0">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: colors.utility.primaryText }}
        >
          Billing View
        </h2>
        <p
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          Review line items, configure payment schedule, and apply tax
        </p>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
        {/* Column 1: Billing Configuration Summary */}
        <div className="w-[250px] flex-shrink-0">
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            {/* Column Header */}
            <div
              className="p-3 border-b flex items-center gap-2"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              <Calendar className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Billing Config
              </span>
            </div>

            {/* Selected Cycle Card */}
            {selectedCycleOption && (
              <div className="p-4">
                <div
                  className="p-4 rounded-xl border-2"
                  style={{
                    backgroundColor: `${colors.brand.primary}08`,
                    borderColor: colors.brand.primary,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <selectedCycleOption.icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Title */}
                  <h4
                    className="text-sm font-bold mb-1"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {selectedCycleOption.title}
                  </h4>
                  <p
                    className="text-xs mb-3"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {selectedCycleOption.description}
                  </p>

                  {/* Visual Example */}
                  <div
                    className="flex items-center gap-1.5 mb-3 p-2 rounded-lg"
                    style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                  >
                    {selectedCycleOption.visualExample.labels.map((label, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: colors.brand.primary,
                          color: 'white',
                        }}
                      >
                        {label}
                      </div>
                    ))}
                    <span
                      className="text-[10px] ml-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {selectedCycleOption.visualExample.description}
                    </span>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-1.5">
                    {selectedCycleOption.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: colors.semantic.success }}
                        />
                        <span
                          className="text-[11px]"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Currency Info */}
                <div
                  className="mt-3 p-3 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                >
                  <DollarSign className="w-4 h-4" style={{ color: colors.brand.primary }} />
                  <div>
                    <span
                      className="text-xs font-medium block"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Currency
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {currency} ({getCurrencySymbol(currency)})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Line Items */}
        <div
          className="flex-1 flex flex-col rounded-xl border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Header */}
          <div
            className="p-3 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Line Items
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#fff',
                }}
              >
                {totals.blockCount}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            {/* Table Header */}
            <div
              className={`grid ${gridCols} gap-2 px-4 py-2 border-b text-[10px] font-medium uppercase tracking-wide`}
              style={{
                borderColor: `${colors.utility.primaryText}10`,
                color: colors.utility.secondaryText,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <span>Block</span>
              <span className="text-center">Qty</span>
              <span className="text-center">Cycle</span>
              <span className="text-center">Tax</span>
              {isMixed && <span className="text-center">Payment</span>}
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>

            {/* Line Item Rows - only billable blocks */}
            {billableBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="w-10 h-10 mb-3" style={{ color: `${colors.utility.secondaryText}40` }} />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No billable blocks added yet
                </p>
                <p className="text-xs mt-1" style={{ color: `${colors.utility.secondaryText}80` }}>
                  Add Service or Spare blocks in the previous step
                </p>
              </div>
            ) : (
              billableBlocks.map((block, index) => {
                const effectivePrice = block.config?.customPrice ?? block.price;
                const lineTotal = block.unlimited ? effectivePrice : effectivePrice * block.quantity;
                const isEditing = editingBlockId === block.id;
                const isFlyBy = block.isFlyBy;
                const blockPayType = perBlockPaymentType[block.id] || 'prepaid';

                return (
                  <div
                    key={block.id}
                    className={`grid ${gridCols} gap-2 px-4 py-2.5 border-b items-center`}
                    style={{
                      borderColor: `${colors.utility.primaryText}08`,
                      backgroundColor: index % 2 === 0
                        ? 'transparent'
                        : `${colors.utility.primaryText}03`,
                    }}
                  >
                    {/* Block Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: block.categoryColor }}
                      />
                      <div className="min-w-0">
                        <span
                          className="text-sm font-medium truncate block"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {block.name || 'Untitled'}
                        </span>
                        {isFlyBy && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: `${block.categoryColor}15`,
                              color: block.categoryColor,
                            }}
                          >
                            FlyBy
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <span
                      className="text-sm text-center"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {block.unlimited ? '∞' : block.quantity}
                    </span>

                    {/* Cycle */}
                    <span
                      className="text-[10px] text-center px-1.5 py-1 rounded-md"
                      style={{
                        backgroundColor: `${colors.brand.primary}10`,
                        color: colors.brand.primary,
                      }}
                    >
                      {getCycleLabel(block.cycle)}
                    </span>

                    {/* Tax Status */}
                    <div className="flex justify-center">
                      {(block.taxRate || 0) > 0 ? (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
                          style={{
                            backgroundColor: block.taxInclusive
                              ? `${colors.semantic.success}12`
                              : `${colors.semantic.warning}12`,
                            color: block.taxInclusive
                              ? colors.semantic.success
                              : colors.semantic.warning,
                          }}
                          title={
                            block.taxInclusive
                              ? `Tax inclusive: ${block.taxRate}%`
                              : `Tax exclusive: +${block.taxRate}%`
                          }
                        >
                          {block.taxInclusive ? (
                            <ShieldCheck className="w-2.5 h-2.5" />
                          ) : (
                            <ShieldAlert className="w-2.5 h-2.5" />
                          )}
                          {block.taxRate}%
                        </span>
                      ) : (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ color: `${colors.utility.secondaryText}60` }}
                        >
                          —
                        </span>
                      )}
                    </div>

                    {/* Payment Type - Mixed mode only */}
                    {isMixed && (
                      <div className="flex justify-center">
                        <select
                          value={blockPayType}
                          onChange={(e) => handleBlockPaymentTypeChange(block.id, e.target.value as 'prepaid' | 'postpaid')}
                          className="text-[10px] px-1.5 py-1 rounded-md border-0 font-medium cursor-pointer"
                          style={{
                            backgroundColor: blockPayType === 'prepaid'
                              ? `${colors.semantic.success}15`
                              : `${colors.semantic.warning}15`,
                            color: blockPayType === 'prepaid'
                              ? colors.semantic.success
                              : colors.semantic.warning,
                          }}
                        >
                          <option value="prepaid">Prepaid</option>
                          <option value="postpaid">Postpaid</option>
                        </select>
                      </div>
                    )}

                    {/* Selling Price (Editable) */}
                    <div className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => handlePriceKeyDown(e, block.id)}
                            autoFocus
                            className="w-[70px] px-1.5 py-1 text-xs text-right rounded border"
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: colors.brand.primary,
                              color: colors.utility.primaryText,
                            }}
                          />
                          <button
                            onClick={() => handleSavePrice(block.id)}
                            className="p-0.5 rounded"
                            style={{ color: colors.semantic.success }}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-0.5 rounded"
                            style={{ color: colors.semantic.error }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(block.id, effectivePrice)}
                          className="inline-flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                          style={{ color: colors.utility.primaryText }}
                          title="Click to edit"
                        >
                          <span>{formatCurrency(effectivePrice, currency)}</span>
                          <Edit3 className="w-2.5 h-2.5" style={{ color: colors.utility.secondaryText }} />
                        </button>
                      )}
                    </div>

                    {/* Line Total */}
                    <span
                      className="text-xs font-semibold text-right"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {formatCurrency(lineTotal, currency)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Simple Subtotal Footer */}
          {billableBlocks.length > 0 && (
            <div
              className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t"
              style={{
                borderColor: `${colors.utility.primaryText}15`,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Subtotal ({totals.blockCount} item{totals.blockCount !== 1 ? 's' : ''})
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
          )}
        </div>

        {/* Column 3: Payment Schedule + Tax + Summary */}
        <div className="w-[420px] flex-shrink-0 min-h-0">
          <div className="h-full overflow-y-auto flex flex-col gap-3 pr-1">
          {/* Payment Schedule Section */}
          <div
            className="rounded-xl border overflow-hidden flex-shrink-0"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            {/* Header */}
            <div
              className="p-3 border-b flex items-center gap-2"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              <CreditCard className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Payment Schedule
              </span>
            </div>

            <div className="p-4">
              {!isMixed ? (
                <>
                  {/* 3 Payment Schedule Options */}
                  <div className="flex gap-2 mb-4">
                    {/* Upfront Card */}
                    <button
                      onClick={() => allPrepaid && onPaymentModeChange('prepaid')}
                      className="flex-1 p-3 rounded-xl border-2 transition-all text-left relative"
                      style={{
                        borderColor: paymentMode === 'prepaid' ? colors.brand.primary : `${colors.utility.primaryText}15`,
                        backgroundColor: paymentMode === 'prepaid' ? `${colors.brand.primary}08` : 'transparent',
                        opacity: allPrepaid ? 1 : 0.45,
                        cursor: allPrepaid ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {!allPrepaid && (
                        <Lock className="w-3 h-3 absolute top-2 right-2" style={{ color: colors.utility.secondaryText }} />
                      )}
                      <CreditCard
                        className="w-5 h-5 mb-2"
                        style={{ color: paymentMode === 'prepaid' ? colors.brand.primary : colors.utility.secondaryText }}
                      />
                      <div
                        className="text-xs font-bold"
                        style={{ color: paymentMode === 'prepaid' ? colors.brand.primary : colors.utility.primaryText }}
                      >
                        Upfront
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Full payment at once
                      </div>
                    </button>

                    {/* EMI Card */}
                    <button
                      onClick={() => allPostpaid && onPaymentModeChange('emi')}
                      className="flex-1 p-3 rounded-xl border-2 transition-all text-left relative"
                      style={{
                        borderColor: paymentMode === 'emi' ? colors.brand.primary : `${colors.utility.primaryText}15`,
                        backgroundColor: paymentMode === 'emi' ? `${colors.brand.primary}08` : 'transparent',
                        opacity: allPostpaid ? 1 : 0.45,
                        cursor: allPostpaid ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {!allPostpaid && (
                        <Lock className="w-3 h-3 absolute top-2 right-2" style={{ color: colors.utility.secondaryText }} />
                      )}
                      <CalendarRange
                        className="w-5 h-5 mb-2"
                        style={{ color: paymentMode === 'emi' ? colors.brand.primary : colors.utility.secondaryText }}
                      />
                      <div
                        className="text-xs font-bold"
                        style={{ color: paymentMode === 'emi' ? colors.brand.primary : colors.utility.primaryText }}
                      >
                        EMI
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Equal installments
                      </div>
                    </button>

                    {/* As Defined Card */}
                    <button
                      onClick={() => onPaymentModeChange('defined')}
                      className="flex-1 p-3 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: paymentMode === 'defined' ? colors.brand.primary : `${colors.utility.primaryText}15`,
                        backgroundColor: paymentMode === 'defined' ? `${colors.brand.primary}08` : 'transparent',
                      }}
                    >
                      <ListChecks
                        className="w-5 h-5 mb-2"
                        style={{ color: paymentMode === 'defined' ? colors.brand.primary : colors.utility.secondaryText }}
                      />
                      <div
                        className="text-xs font-bold"
                        style={{ color: paymentMode === 'defined' ? colors.brand.primary : colors.utility.primaryText }}
                      >
                        As Defined
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Per block cycle
                      </div>
                    </button>
                  </div>

                  {/* Availability hints */}
                  {(!allPrepaid || !allPostpaid) && (
                    <div
                      className="flex items-start gap-1.5 mb-3 px-2 py-1.5 rounded-lg"
                      style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                    >
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: colors.utility.secondaryText }} />
                      <span className="text-[10px] leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                        {!allPrepaid && !allPostpaid
                          ? 'Upfront requires all blocks prepaid. EMI requires all blocks postpaid.'
                          : !allPrepaid
                            ? 'Upfront requires all blocks to have prepaid billing cycle.'
                            : 'EMI requires all blocks to have postpaid billing cycle.'}
                      </span>
                    </div>
                  )}

                  {/* Upfront Details */}
                  {paymentMode === 'prepaid' && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                          Payment Amount
                        </span>
                        <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                          {formatCurrency(totals.grandTotal, currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          Invoice generated when contract is accepted
                        </span>
                      </div>
                    </div>
                  )}

                  {/* EMI Details */}
                  {paymentMode === 'emi' && (
                    <div className="space-y-3">
                      {/* Duration Selector */}
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                      >
                        <label
                          className="text-[10px] font-medium uppercase tracking-wide mb-2 block"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Duration (months)
                        </label>
                        <div
                          className="flex items-center rounded-lg border overflow-hidden"
                          style={{ borderColor: `${colors.utility.primaryText}20`, backgroundColor: colors.utility.primaryBackground }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(2, emiMonths - 1);
                              onEmiMonthsChange(next);
                            }}
                            disabled={emiMonths <= 2}
                            className="px-3 py-2 hover:opacity-80 disabled:opacity-30 border-r transition-colors"
                            style={{
                              color: colors.utility.primaryText,
                              borderColor: `${colors.utility.primaryText}15`,
                              backgroundColor: `${colors.utility.primaryText}05`,
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={emiMonths}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                const clamped = Math.max(2, Math.min(contractDuration || 60, val));
                                onEmiMonthsChange(clamped);
                              }
                            }}
                            min={2}
                            max={contractDuration || 60}
                            className="flex-1 text-center text-sm font-bold bg-transparent border-0 outline-none w-12 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ color: colors.brand.primary }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(contractDuration || 60, emiMonths + 1);
                              onEmiMonthsChange(next);
                            }}
                            className="px-3 py-2 hover:opacity-80 border-l transition-colors"
                            style={{
                              color: colors.utility.primaryText,
                              borderColor: `${colors.utility.primaryText}15`,
                              backgroundColor: `${colors.utility.primaryText}05`,
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* EMI Breakdown */}
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                            Per Installment
                          </span>
                          <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                            {formatCurrency(totals.emiInstallment, currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Info className="w-3 h-3 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            1st invoice on acceptance, rest monthly
                          </span>
                        </div>

                        {/* Schedule Preview */}
                        <div className="space-y-1">
                          {Array.from({ length: Math.min(emiMonths, 4) }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-[11px] py-1"
                              style={{ borderBottom: `1px solid ${colors.utility.primaryText}06` }}
                            >
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                                  style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                                >
                                  {i + 1}
                                </div>
                                <span style={{ color: colors.utility.secondaryText }}>
                                  {i === 0 ? 'On acceptance' : `Month ${i + 1}`}
                                </span>
                              </div>
                              <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                                {formatCurrency(totals.emiInstallment, currency)}
                              </span>
                            </div>
                          ))}
                          {emiMonths > 4 && (
                            <div className="text-center pt-1">
                              <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                                +{emiMonths - 4} more installment{emiMonths - 4 > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* As Defined Details */}
                  {paymentMode === 'defined' && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                    >
                      <div className="flex items-center gap-1.5 mb-3">
                        <Info className="w-3 h-3 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          Billed exactly as each block's billing cycle defines
                        </span>
                      </div>

                      {/* Breakup by cycle type */}
                      <div className="space-y-1">
                        {definedBreakup.map((group, i) => (
                          <div
                            key={group.cycle}
                            className="flex items-center justify-between text-[11px] py-1.5"
                            style={{ borderBottom: `1px solid ${colors.utility.primaryText}06` }}
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                              >
                                {i + 1}
                              </div>
                              <div>
                                <span style={{ color: colors.utility.primaryText }} className="font-medium">
                                  {group.label}
                                </span>
                                <span
                                  className="text-[9px] ml-1"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  ({group.blockCount} block{group.blockCount !== 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                                {formatCurrency(group.total, currency)}
                              </span>
                              {group.isRecurring && (
                                <span
                                  className="text-[9px] block"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  /{group.cycle === 'monthly' ? 'mo' : group.cycle === 'fortnightly' ? '2wk' : group.cycle === 'quarterly' ? 'qtr' : group.cycle}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div
                        className="flex items-center justify-between mt-2 pt-2"
                        style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}
                      >
                        <span className="text-[11px] font-medium" style={{ color: colors.utility.secondaryText }}>
                          Contract Total
                        </span>
                        <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>
                          {formatCurrency(totals.grandTotal, currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Mixed: Show breakup by cycle type (same as "As Defined") */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shuffle className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                      Mixed Payment Schedule
                    </span>
                  </div>
                  <p className="text-[11px] mb-3" style={{ color: colors.utility.secondaryText }}>
                    Each service is billed per its own cycle. Use the Payment column in the table to set Prepaid or Postpaid per block.
                  </p>

                  {/* Breakup by cycle type */}
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                  >
                    <div className="space-y-1">
                      {definedBreakup.map((group, i) => (
                        <div
                          key={group.cycle}
                          className="flex items-center justify-between text-[11px] py-1.5"
                          style={{ borderBottom: `1px solid ${colors.utility.primaryText}06` }}
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                              style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                            >
                              {i + 1}
                            </div>
                            <div>
                              <span style={{ color: colors.utility.primaryText }} className="font-medium">
                                {group.label}
                              </span>
                              <span
                                className="text-[9px] ml-1"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                ({group.blockCount} block{group.blockCount !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                              {formatCurrency(group.total, currency)}
                            </span>
                            {group.isRecurring && (
                              <span
                                className="text-[9px] block"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                /{group.cycle === 'monthly' ? 'mo' : group.cycle === 'fortnightly' ? '2wk' : group.cycle === 'quarterly' ? 'qtr' : group.cycle}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div
                      className="flex items-center justify-between mt-2 pt-2"
                      style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}
                    >
                      <span className="text-[11px] font-medium" style={{ color: colors.utility.secondaryText }}>
                        Contract Total
                      </span>
                      <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>
                        {formatCurrency(totals.grandTotal, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tax Section */}
          <div
            className="rounded-xl border overflow-hidden flex-shrink-0"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            {/* Header */}
            <div
              className="p-3 border-b flex items-center justify-between"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Tax
                </span>
              </div>
              {totals.taxAmount > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${colors.semantic.success}15`,
                    color: colors.semantic.success,
                  }}
                >
                  {formatCurrency(totals.taxAmount, currency)}
                </span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Per-block tax info */}
              {totals.blocksWithTaxCount > 0 && (
                <div
                  className="p-2.5 rounded-lg"
                  style={{ backgroundColor: `${colors.semantic.success}08` }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                    <span className="text-[11px] font-medium" style={{ color: colors.semantic.success }}>
                      {totals.blocksWithTaxCount} block{totals.blocksWithTaxCount !== 1 ? 's' : ''} with embedded tax
                    </span>
                  </div>
                  <p className="text-[10px] ml-5" style={{ color: colors.utility.secondaryText }}>
                    Tax: {formatCurrency(totals.perBlockTaxTotal, currency)} (already applied per block)
                  </p>
                </div>
              )}

              {/* Global tax selector — only for blocks without embedded tax */}
              {totals.blocksWithoutTaxCount > 0 ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
                      Apply tax to remaining {totals.blocksWithoutTaxCount} block{totals.blocksWithoutTaxCount !== 1 ? 's' : ''}{' '}
                      ({formatCurrency(totals.subtotalForGlobalTax, currency)})
                    </span>
                  </div>
                  {availableTaxRates.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: colors.utility.secondaryText }}>
                      No tax rates configured
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableTaxRates.map((rate) => {
                        const isSelected = selectedTaxRateIds.includes(rate.id);
                        return (
                          <button
                            key={rate.id}
                            onClick={() => handleToggleTax(rate.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                            style={{
                              backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                              color: isSelected ? '#FFFFFF' : colors.utility.primaryText,
                              borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}20`,
                            }}
                          >
                            {rate.name} ({rate.rate}%)
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {totals.globalTaxAmount > 0 && (
                    <p className="text-[10px] mt-2" style={{ color: colors.utility.secondaryText }}>
                      Global tax: {formatCurrency(totals.globalTaxAmount, currency)}
                    </p>
                  )}
                </div>
              ) : totals.blocksWithTaxCount > 0 ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ backgroundColor: `${colors.utility.primaryText}04` }}>
                  <Info className="w-3 h-3 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    All blocks have embedded tax. No additional tax needed.
                  </span>
                </div>
              ) : (
                /* No blocks at all */
                availableTaxRates.length === 0 ? (
                  <p className="text-xs text-center py-2" style={{ color: colors.utility.secondaryText }}>
                    No tax rates configured
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTaxRates.map((rate) => {
                      const isSelected = selectedTaxRateIds.includes(rate.id);
                      return (
                        <button
                          key={rate.id}
                          onClick={() => handleToggleTax(rate.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                          style={{
                            backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                            color: isSelected ? '#FFFFFF' : colors.utility.primaryText,
                            borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}20`,
                          }}
                        >
                          {rate.name} ({rate.rate}%)
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Summary Section */}
          <div
            className="rounded-xl border overflow-hidden flex-shrink-0"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            {/* Header */}
            <div
              className="p-3 border-b flex items-center gap-2"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              <DollarSign className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Summary
              </span>
            </div>

            <div className="p-4 space-y-2">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Subtotal ({totals.blockCount} item{totals.blockCount !== 1 ? 's' : ''})
                </span>
                <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                  {formatCurrency(totals.subtotal, currency)}
                </span>
              </div>

              {/* Per-block embedded tax */}
              {totals.perBlockTaxTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                    <ShieldCheck className="w-3 h-3" style={{ color: colors.semantic.success }} />
                    Block-level tax ({totals.blocksWithTaxCount} block{totals.blocksWithTaxCount !== 1 ? 's' : ''})
                  </span>
                  <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                    {formatCurrency(totals.perBlockTaxTotal, currency)}
                  </span>
                </div>
              )}

              {/* Global Tax Breakdown — only for blocks without embedded tax */}
              {totals.selectedRates.map((rate) => {
                const rateAmount = totals.subtotalForGlobalTax * (rate.rate / 100);
                return (
                  <div key={rate.id} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {rate.name} ({rate.rate}%)
                      {totals.blocksWithTaxCount > 0 && (
                        <span className="text-[9px] opacity-60 ml-1">
                          on {formatCurrency(totals.subtotalForGlobalTax, currency)}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                      {formatCurrency(rateAmount, currency)}
                    </span>
                  </div>
                );
              })}

              {/* Divider */}
              <div
                className="border-t my-1"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              />

              {/* Grand Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                  Grand Total
                </span>
                <span className="text-lg font-bold" style={{ color: colors.brand.primary }}>
                  {formatCurrency(totals.grandTotal, currency)}
                </span>
              </div>

              {/* Schedule Note */}
              {!isMixed && paymentMode === 'emi' && (
                <div
                  className="mt-2 p-2.5 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: `${colors.brand.primary}08` }}
                >
                  <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                    {emiMonths} monthly installments
                  </span>
                  <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>
                    {formatCurrency(totals.emiInstallment, currency)} /mo
                  </span>
                </div>
              )}
              {!isMixed && paymentMode === 'defined' && definedBreakup.length > 0 && (
                <div
                  className="mt-2 p-2.5 rounded-lg"
                  style={{ backgroundColor: `${colors.brand.primary}08` }}
                >
                  <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                    {definedBreakup.length} billing group{definedBreakup.length !== 1 ? 's' : ''} as per block cycles
                  </span>
                </div>
              )}
            </div>
          </div>
          </div>{/* close inner scroll wrapper */}
        </div>
      </div>
    </div>
  );
};

export default BillingViewStep;

// src/components/contracts/ContractWizard/steps/BillingViewStep.tsx
// Step 8: Billing View - 2-column layout
// Column 1: Read-only pricing cards | Column 2: Payment Schedule + Summary

import React, { useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Receipt,
  CreditCard,
  CalendarRange,
  Minus,
  Plus,
  Info,
  ListChecks,
  Lock,
  Shuffle,
  Zap,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { ConfigurableBlock, CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import { BillingCycleType } from './BillingCycleStep';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';
import { FLYBY_TYPE_CONFIG } from '@/components/catalog-studio/FlyByBlockCard';

export interface BillingViewStepProps {
  selectedBlocks: ConfigurableBlock[];
  currency: string;
  billingCycleType: BillingCycleType;
  onBlocksChange: (blocks: ConfigurableBlock[]) => void;
  // Tax (kept for backward compat, no longer used for contract-level tax)
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

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR', decimals = 2) => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

// Get cycle label from id
const getCycleLabel = (cycleId: string): string => {
  const cycle = CYCLE_OPTIONS.find((c) => c.id === cycleId);
  return cycle?.label || cycleId || '-';
};

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>
  >;
  return iconsMap[iconName] || LucideIcons.Package;
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

  // Calculate totals from per-block taxes
  const totals = useMemo(() => {
    let baseSubtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;

    billableBlocks.forEach((block) => {
      const ep = block.config?.customPrice ?? block.price;
      const qty = block.unlimited ? 1 : block.quantity;
      const taxRate = block.taxRate || 0;

      if (block.isFlyBy && taxRate === 0) {
        // FlyBy without taxes
        baseSubtotal += ep * qty;
        grandTotal += block.totalPrice;
      } else if (taxRate === 0) {
        baseSubtotal += ep * qty;
        grandTotal += block.totalPrice;
      } else if (block.taxInclusion === 'inclusive') {
        const total = ep * qty;
        const base = total / (1 + taxRate / 100);
        baseSubtotal += base;
        totalTax += total - base;
        grandTotal += block.totalPrice;
      } else {
        // exclusive
        const base = ep * qty;
        baseSubtotal += base;
        totalTax += base * taxRate / 100;
        grandTotal += block.totalPrice;
      }
    });

    const emiInstallment = emiMonths > 0 ? grandTotal / emiMonths : grandTotal;

    return {
      baseSubtotal: Math.round(baseSubtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      blockCount: billableBlocks.length,
      emiInstallment: Math.round(emiInstallment * 100) / 100,
    };
  }, [billableBlocks, emiMonths]);

  // Report computed totals to parent wizard state
  useEffect(() => {
    if (!onTotalsChange) return;
    onTotalsChange({
      taxTotal: totals.totalTax,
      grandTotal: totals.grandTotal,
      taxBreakdown: [], // Per-block taxes, no contract-level breakdown
    });
  }, [totals.totalTax, totals.grandTotal, onTotalsChange]);

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
          Review pricing breakdown and configure payment schedule
        </p>
      </div>

      {/* 2-Column Layout */}
      <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
        {/* Column 1: Read-Only Pricing Cards */}
        <div
          className="flex-1 flex flex-col rounded-xl border overflow-hidden min-h-0"
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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                {currency}
              </span>
              <span className="text-xs font-semibold" style={{ color: colors.brand.primary }}>
                {getCurrencySymbol(currency)}
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
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
              billableBlocks.map((block) => {
                const ep = block.config?.customPrice ?? block.price;
                const qty = block.unlimited ? 1 : block.quantity;
                const taxRate = block.taxRate || 0;
                const isFlyBy = block.isFlyBy;
                const showTax = !isFlyBy && taxRate > 0;
                const blockPayType = perBlockPaymentType[block.id] || 'prepaid';

                let baseAmount: number;
                let taxAmount: number;
                if (!showTax) {
                  baseAmount = ep * qty;
                  taxAmount = 0;
                } else if (block.taxInclusion === 'inclusive') {
                  baseAmount = (ep / (1 + taxRate / 100)) * qty;
                  taxAmount = ep * qty - baseAmount;
                } else {
                  baseAmount = ep * qty;
                  taxAmount = baseAmount * taxRate / 100;
                }

                // Get icon
                const flyByType = (block.flyByType || 'service') as keyof typeof FLYBY_TYPE_CONFIG;
                const IconComponent = isFlyBy
                  ? FLYBY_TYPE_CONFIG[flyByType]?.icon || LucideIcons.Zap
                  : getIconComponent(block.icon);
                const iconBg = isFlyBy
                  ? FLYBY_TYPE_CONFIG[flyByType]?.bgColor || '#EFF6FF'
                  : (block.categoryBgColor || `${block.categoryColor}20`);
                const iconColor = isFlyBy
                  ? FLYBY_TYPE_CONFIG[flyByType]?.color || '#3B82F6'
                  : block.categoryColor;

                return (
                  <div
                    key={block.id}
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}10`,
                    }}
                  >
                    {/* Card Header */}
                    <div className="p-3">
                      <div className="flex items-center gap-2.5">
                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative"
                          style={{ backgroundColor: iconBg }}
                        >
                          <IconComponent className="w-4 h-4" style={{ color: iconColor }} />
                          {isFlyBy && (
                            <div
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: iconColor }}
                            >
                              <Zap className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Name & badges */}
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-semibold text-sm truncate"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {block.name || 'Untitled'}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: iconBg,
                                color: iconColor,
                              }}
                            >
                              {isFlyBy ? `FlyBy ${block.categoryName}` : block.categoryName}
                            </span>
                            <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                              {block.unlimited ? '∞' : `×${qty}`} • {getCycleLabel(block.cycle)}
                            </span>
                            {isMixed && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor: blockPayType === 'prepaid'
                                    ? `${colors.semantic.success}15`
                                    : `${colors.semantic.warning}15`,
                                  color: blockPayType === 'prepaid'
                                    ? colors.semantic.success
                                    : colors.semantic.warning,
                                }}
                              >
                                {blockPayType === 'prepaid' ? 'Prepaid' : 'Postpaid'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                            {formatCurrency(block.totalPrice, block.currency)}
                          </span>
                          {showTax && (
                            <span className="text-[10px] block" style={{ color: colors.utility.secondaryText }}>
                              incl. {taxRate}% tax
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div
                      className="px-3 pb-3 pt-0"
                    >
                      <div
                        className="pt-2 border-t space-y-1"
                        style={{ borderColor: `${colors.utility.primaryText}08` }}
                      >
                        {/* Base / Selling Price */}
                        <div className="flex justify-between text-xs">
                          <span style={{ color: colors.utility.secondaryText }}>
                            {showTax && block.taxInclusion === 'inclusive' ? 'Base Price' : 'Selling Price'}
                            {' '}({block.unlimited ? '∞' : `×${qty}`})
                          </span>
                          <span style={{ color: colors.utility.primaryText }}>
                            {formatCurrency(Math.round(baseAmount * 100) / 100, block.currency)}
                          </span>
                        </div>

                        {/* Per-tax lines (not for FlyBy) */}
                        {showTax && block.taxes?.map((tax, i) => {
                          const perTaxAmount = block.taxInclusion === 'inclusive'
                            ? (ep / (1 + taxRate / 100)) * Number(tax.rate) / 100 * qty
                            : ep * Number(tax.rate) / 100 * qty;
                          return (
                            <div key={i} className="flex justify-between text-xs">
                              <span style={{ color: colors.utility.secondaryText }}>
                                {tax.name || 'Tax'} ({tax.rate}%)
                              </span>
                              <span style={{ color: colors.utility.primaryText }}>
                                {formatCurrency(Math.round(perTaxAmount * 100) / 100, block.currency)}
                              </span>
                            </div>
                          );
                        })}

                        {/* Tax inclusion badge */}
                        {showTax && block.taxInclusion && (
                          <span
                            className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: block.taxInclusion === 'inclusive' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
                              color: block.taxInclusion === 'inclusive' ? colors.semantic.success : colors.semantic.warning,
                            }}
                          >
                            Tax {block.taxInclusion === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                          </span>
                        )}

                        {/* Line total */}
                        <div
                          className="flex justify-between text-xs font-semibold pt-1 mt-1 border-t"
                          style={{ borderColor: `${colors.utility.primaryText}06` }}
                        >
                          <span style={{ color: colors.utility.primaryText }}>
                            Total
                          </span>
                          <span style={{ color: colors.brand.primary }}>
                            {formatCurrency(block.totalPrice, block.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Subtotal Footer */}
          {billableBlocks.length > 0 && (
            <div
              className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t"
              style={{
                borderColor: `${colors.utility.primaryText}15`,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {totals.blockCount} item{totals.blockCount !== 1 ? 's' : ''}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                {formatCurrency(totals.grandTotal, currency)}
              </span>
            </div>
          )}
        </div>

        {/* Column 2: Payment Schedule + Summary */}
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
                /* Mixed: Show breakup by cycle type */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shuffle className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                      Mixed Payment Schedule
                    </span>
                  </div>
                  <p className="text-[11px] mb-3" style={{ color: colors.utility.secondaryText }}>
                    Each service is billed per its own cycle. Payment types are shown on each card.
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
              {/* Subtotal (before tax) */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Subtotal
                </span>
                <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                  {formatCurrency(totals.baseSubtotal, currency)}
                </span>
              </div>

              {/* Total Tax */}
              {totals.totalTax > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Tax (per-block)
                  </span>
                  <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                    {formatCurrency(totals.totalTax, currency)}
                  </span>
                </div>
              )}

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

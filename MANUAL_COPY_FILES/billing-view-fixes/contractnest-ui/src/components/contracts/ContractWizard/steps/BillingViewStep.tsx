// src/components/contracts/ContractWizard/steps/BillingViewStep.tsx
// Step 8: Billing View - 3-column layout
// Column 1: Billing config summary | Column 2: Line items + Tax | Column 3: Contract preview

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useTaxRates } from '@/hooks/useTaxRates';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { ConfigurableBlock, CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import TaxRateTagSelector from '@/components/catalog/shared/TaxRateTagSelector';
import ContractPreviewPanel from '../components/ContractPreviewPanel';
import { BillingCycleType } from './BillingCycleStep';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';

// Contact types (shared)
interface Contact {
  id: string;
  contact_type: 'individual' | 'corporate';
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  profile_image_url?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  designation?: string;
  is_primary: boolean;
  contact_channels?: Array<{
    channel_type: string;
    channel_value: string;
    is_primary?: boolean;
  }>;
}

export interface BillingViewStepProps {
  selectedBlocks: ConfigurableBlock[];
  currency: string;
  billingCycleType: BillingCycleType;
  onBlocksChange: (blocks: ConfigurableBlock[]) => void;
  // Tax
  selectedTaxRateIds: string[];
  onTaxRateIdsChange: (ids: string[]) => void;
  // Contract preview props
  contractName: string;
  contractStatus?: string;
  contractDuration?: number;
  contractStartDate?: Date | null;
  selectedBuyer?: Contact | null;
  selectedPerson?: ContactPerson | null;
  useCompanyContact?: boolean;
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
  contractName,
  contractStatus = 'draft',
  contractDuration = 12,
  contractStartDate,
  selectedBuyer,
  selectedPerson,
  useCompanyContact,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch tenant profile for preview
  const { profile: tenantProfile } = useTenantProfile();

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

  // Editing state for selling price
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  // Calculate totals from billable blocks only
  const totals = useMemo(() => {
    const subtotal = billableBlocks.reduce((sum, b) => sum + b.totalPrice, 0);

    // Calculate tax from selected tax rates
    const selectedRates = availableTaxRates.filter((r) =>
      selectedTaxRateIds.includes(r.id)
    );
    const totalTaxRate = selectedRates.reduce((sum, r) => sum + r.rate, 0);
    const taxAmount = subtotal * (totalTaxRate / 100);
    const grandTotal = subtotal + taxAmount;

    return {
      subtotal,
      selectedRates,
      totalTaxRate,
      taxAmount,
      grandTotal,
      blockCount: billableBlocks.length,
    };
  }, [billableBlocks, availableTaxRates, selectedTaxRateIds]);

  // Start editing selling price
  const handleStartEdit = useCallback((blockId: string, currentPrice: number) => {
    setEditingBlockId(blockId);
    setEditPrice(currentPrice.toString());
  }, []);

  // Save selling price
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
            // Recalculate total
            const effectivePrice = newPrice;
            updated.totalPrice = updated.unlimited ? effectivePrice : effectivePrice * updated.quantity;
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

  // Get the selected billing cycle option
  const selectedCycleOption = BILLING_CYCLE_OPTIONS.find((o) => o.id === billingCycleType);

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* 3-Column Layout */}
      <div className="flex-1 flex gap-4 px-4 py-4 min-h-0">
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

        {/* Column 2: Line Items + Tax */}
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
            <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
              {formatCurrency(totals.grandTotal, currency)}
            </span>
          </div>

          {/* Line Items Table */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            {/* Table Header */}
            <div
              className="grid grid-cols-[1fr_60px_90px_100px_100px] gap-2 px-4 py-2 border-b text-[10px] font-medium uppercase tracking-wide"
              style={{
                borderColor: `${colors.utility.primaryText}10`,
                color: colors.utility.secondaryText,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <span>Block</span>
              <span className="text-center">Qty</span>
              <span className="text-center">Cycle</span>
              <span className="text-right">Selling Price</span>
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

                return (
                  <div
                    key={block.id}
                    className="grid grid-cols-[1fr_60px_90px_100px_100px] gap-2 px-4 py-2.5 border-b items-center"
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
                      className="text-xs text-center px-2 py-1 rounded-md"
                      style={{
                        backgroundColor: `${colors.brand.primary}10`,
                        color: colors.brand.primary,
                      }}
                    >
                      {getCycleLabel(block.cycle)}
                    </span>

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
                            className="w-20 px-2 py-1 text-sm text-right rounded border"
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
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-0.5 rounded"
                            style={{ color: colors.semantic.error }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(block.id, effectivePrice)}
                          className="inline-flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
                          style={{ color: colors.utility.primaryText }}
                          title="Click to edit selling price"
                        >
                          <span>{formatCurrency(effectivePrice, currency)}</span>
                          <Edit3 className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                        </button>
                      )}
                    </div>

                    {/* Line Total */}
                    <span
                      className="text-sm font-semibold text-right"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {formatCurrency(lineTotal, currency)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Compact Summary Footer */}
          <div
            className="flex-shrink-0 border-t"
            style={{
              borderColor: `${colors.utility.primaryText}15`,
              backgroundColor: colors.utility.secondaryBackground,
            }}
          >
            {/* Subtotal */}
            <div
              className="flex items-center justify-between px-4 py-1.5"
              style={{ borderBottom: `1px solid ${colors.utility.primaryText}08` }}
            >
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Subtotal ({totals.blockCount} item{totals.blockCount !== 1 ? 's' : ''})
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>

            {/* Tax - Compact Row with Inline Selector */}
            <div
              className="px-4 py-2"
              style={{ borderBottom: `1px solid ${colors.utility.primaryText}08` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-xs font-medium flex items-center gap-1.5"
                  style={{ color: colors.utility.primaryText }}
                >
                  <Percent className="w-3 h-3" style={{ color: colors.brand.primary }} />
                  Tax
                </span>
                {totals.taxAmount > 0 && (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {formatCurrency(totals.taxAmount, currency)}
                  </span>
                )}
              </div>

              {/* Tax Rate Selector */}
              <TaxRateTagSelector
                availableTaxRates={availableTaxRates}
                selectedTaxRateIds={selectedTaxRateIds}
                onChange={onTaxRateIdsChange}
                placeholder="Select tax rates..."
                maxTags={5}
              />

              {/* Compact Tax Breakdown */}
              {totals.selectedRates.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {totals.selectedRates.map((rate) => {
                    const rateAmount = totals.subtotal * (rate.rate / 100);
                    return (
                      <div
                        key={rate.id}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span style={{ color: colors.utility.secondaryText }}>
                          {rate.name} ({rate.rate}%)
                        </span>
                        <span style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(rateAmount, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grand Total - Prominent */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ backgroundColor: `${colors.brand.primary}08` }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: colors.utility.primaryText }}
              >
                Grand Total
              </span>
              <span
                className="text-base font-bold"
                style={{ color: colors.brand.primary }}
              >
                {formatCurrency(totals.grandTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Live Contract Preview */}
        <div className="w-[450px] flex-shrink-0 sticky top-0 self-start">
          <ContractPreviewPanel
            tenantProfile={tenantProfile}
            selectedBuyer={selectedBuyer}
            selectedPerson={selectedPerson}
            useCompanyContact={useCompanyContact}
            contractName={contractName}
            contractStatus={contractStatus}
            contractDuration={contractDuration}
            contractStartDate={contractStartDate}
            selectedBlocks={selectedBlocks}
            currency={currency}
          />
        </div>
      </div>
    </div>
  );
};

export default BillingViewStep;

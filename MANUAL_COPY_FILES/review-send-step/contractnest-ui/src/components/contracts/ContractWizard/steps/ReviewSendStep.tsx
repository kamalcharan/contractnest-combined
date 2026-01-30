// src/components/contracts/ContractWizard/steps/ReviewSendStep.tsx
// Step 9: Review & Send - Paper Canvas layout with Self/Client toggle
// Centered document view with floating action island
// Self View: full pricing details per block
// Client View: same layout, individual prices hidden (total only)

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Mail,
  Phone,
  FileText,
  Package,
  Briefcase,
  CreditCard,
  CheckSquare,
  Paperclip,
  Video,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useTaxRates } from '@/hooks/useTaxRates';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { ConfigurableBlock, CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import { BillingCycleType } from './BillingCycleStep';
import {
  categoryHasPricing,
  getCategoryById,
} from '@/utils/catalog-studio/categories';

// ─── Props ───────────────────────────────────────────────────────────

export interface ReviewSendStepProps {
  contractName: string;
  contractStatus: string;
  description: string;
  durationValue: number;
  durationUnit: string;
  buyerId: string | null;
  buyerName: string;
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  billingCycleType: BillingCycleType;
  currency: string;
  selectedBlocks: ConfigurableBlock[];
  paymentMode: 'prepaid' | 'emi';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  selectedTaxRateIds: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getCycleLabel = (cycleId: string): string => {
  const cycle = CYCLE_OPTIONS.find((c) => c.id === cycleId);
  return cycle?.label || cycleId || '—';
};

const formatDuration = (value: number, unit: string): string => {
  if (unit === 'months') return `${value} month${value !== 1 ? 's' : ''}`;
  if (unit === 'years') return `${value} year${value !== 1 ? 's' : ''}`;
  return `${value} day${value !== 1 ? 's' : ''}`;
};

const getDurationInMonths = (value: number, unit: string): number => {
  if (unit === 'months') return value;
  if (unit === 'years') return value * 12;
  return Math.ceil(value / 30);
};

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  service: Briefcase,
  spare: Package,
  billing: CreditCard,
  text: FileText,
  video: Video,
  image: ImageIcon,
  checklist: CheckSquare,
  document: Paperclip,
};

// ─── Component ───────────────────────────────────────────────────────

const ReviewSendStep: React.FC<ReviewSendStepProps> = ({
  contractName,
  contractStatus,
  description,
  durationValue,
  durationUnit,
  buyerId,
  buyerName,
  acceptanceMethod,
  billingCycleType,
  currency,
  selectedBlocks,
  paymentMode,
  emiMonths,
  perBlockPaymentType,
  selectedTaxRateIds,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tenant branding
  const { profile: tenantProfile } = useTenantProfile();
  const brandPrimary = tenantProfile?.primary_color || '#F59E0B';
  const brandSecondary = tenantProfile?.secondary_color || '#10B981';

  // Tax rates
  const { state: taxState } = useTaxRates();
  const availableTaxRates = useMemo(
    () =>
      (taxState.data || []).map((rate) => ({
        id: rate.id,
        name: rate.name,
        rate: rate.rate,
      })),
    [taxState.data]
  );

  // View mode
  const [viewMode, setViewMode] = useState<'self' | 'client'>('self');
  const isSelfView = viewMode === 'self';

  const isMixed = billingCycleType === 'mixed';
  const durationMonths = getDurationInMonths(durationValue, durationUnit);

  // Paper canvas colors
  const canvasBg = isDarkMode ? colors.utility.primaryBackground : '#F1F5F9';
  const paperBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';
  const paperShadow = isDarkMode
    ? '0 4px 20px rgba(0,0,0,0.3)'
    : '0 10px 30px rgba(0,0,0,0.05)';
  const borderColor = isDarkMode ? `${colors.utility.primaryText}15` : '#E2E8F0';

  // ─── Group blocks by category ────────────────────────────────────
  const blockGroups = useMemo(() => {
    const groups: Record<string, ConfigurableBlock[]> = {};
    selectedBlocks.forEach((block) => {
      const catId = block.categoryId || 'service';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(block);
    });
    const order = ['service', 'spare', 'billing', 'text', 'checklist', 'document', 'video', 'image'];
    const sorted = Object.entries(groups).sort(
      ([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
    );
    return sorted;
  }, [selectedBlocks]);

  // ─── Financial calculations ──────────────────────────────────────
  const totals = useMemo(() => {
    const billableBlocks = selectedBlocks.filter((b) => categoryHasPricing(b.categoryId || ''));
    const subtotal = billableBlocks.reduce((sum, b) => sum + b.totalPrice, 0);

    const selectedRates = availableTaxRates.filter((r) => selectedTaxRateIds.includes(r.id));
    const totalTaxRate = selectedRates.reduce((sum, r) => sum + r.rate, 0);
    const taxAmount = subtotal * (totalTaxRate / 100);
    const grandTotal = subtotal + taxAmount;
    const emiInstallment = emiMonths > 0 ? grandTotal / emiMonths : grandTotal;

    return { subtotal, selectedRates, totalTaxRate, taxAmount, grandTotal, emiInstallment, billableCount: billableBlocks.length };
  }, [selectedBlocks, availableTaxRates, selectedTaxRateIds, emiMonths]);

  // Timeline dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: canvasBg }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Controls above paper */}
        <div className="max-w-[850px] mx-auto flex items-center justify-between px-2 pt-6 pb-3">
          {/* Self / Client pill toggle */}
          <div
            className="flex items-center rounded-full p-1 shadow-sm"
            style={{ backgroundColor: paperBg }}
          >
            <button
              type="button"
              onClick={() => setViewMode('self')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: isSelfView ? brandPrimary : 'transparent',
                color: isSelfView ? '#FFFFFF' : colors.utility.secondaryText,
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              Self View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('client')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: !isSelfView ? brandPrimary : 'transparent',
                color: !isSelfView ? '#FFFFFF' : colors.utility.secondaryText,
              }}
            >
              <EyeOff className="w-3.5 h-3.5" />
              Client View
            </button>
          </div>

          {/* Right controls: PDF download + Acceptance badge */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:opacity-80 shadow-sm"
              style={{
                backgroundColor: paperBg,
                color: colors.utility.primaryText,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
            <span
              className="text-[10px] px-3 py-1.5 rounded-full font-medium uppercase tracking-wide shadow-sm"
              style={{
                backgroundColor: paperBg,
                color: brandPrimary,
              }}
            >
              {acceptanceMethod === 'payment'
                ? 'Payment Acceptance'
                : acceptanceMethod === 'signoff'
                  ? 'Signoff Acceptance'
                  : acceptanceMethod === 'auto'
                    ? 'Auto Accept'
                    : 'Not Set'}
            </span>
          </div>
        </div>

        {/* ═══ THE PAPER ═══ */}
        <div
          className="max-w-[850px] mx-auto rounded-lg"
          style={{
            backgroundColor: paperBg,
            boxShadow: paperShadow,
            marginBottom: '24px',
          }}
        >
          {/* Branded header strip */}
          <div
            className="rounded-t-lg px-12 py-6"
            style={{
              background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`,
            }}
          >
            <div className="flex items-center gap-4">
              {tenantProfile?.logo_url ? (
                <img
                  src={tenantProfile.logo_url}
                  alt={tenantProfile.business_name || 'Company'}
                  className="w-12 h-12 rounded-xl object-cover bg-white/20 shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest">
                  {tenantProfile?.business_name || 'Your Company'}
                </p>
                <p className="text-white text-sm font-medium mt-0.5">Service Agreement</p>
              </div>
            </div>
          </div>

          {/* Paper body */}
          <div className="px-12 py-10">
            {/* Contract title */}
            <h1
              className="font-serif text-3xl font-medium mb-3"
              style={{ color: colors.utility.primaryText }}
            >
              {contractName || 'Untitled Contract'}
            </h1>

            {/* Status + ref + date */}
            <div className="flex items-center gap-3 mb-8">
              <span
                className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase"
                style={{ backgroundColor: `${brandPrimary}12`, color: brandPrimary }}
              >
                {contractStatus}
              </span>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Ref: #CN-XXXX
              </span>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                · Created {formatDate(startDate)}
              </span>
            </div>

            {/* ── Meta Grid ── */}
            <div
              className="grid grid-cols-2 gap-x-10 gap-y-6 py-6 border-t border-b mb-8"
              style={{ borderColor }}
            >
              {/* Provider */}
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Provider
                </span>
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  {tenantProfile?.business_name || 'Your Company'}
                </p>
                {tenantProfile?.business_email && (
                  <p
                    className="text-xs mt-1 flex items-center gap-1.5"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <Mail className="w-3 h-3" />
                    {tenantProfile.business_email}
                  </p>
                )}
                {tenantProfile?.business_phone && (
                  <p
                    className="text-xs mt-0.5 flex items-center gap-1.5"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <Phone className="w-3 h-3" />
                    {tenantProfile.business_phone_country_code} {tenantProfile.business_phone}
                  </p>
                )}
              </div>

              {/* Customer */}
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Customer
                </span>
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  {buyerName || 'Not selected'}
                </p>
              </div>

              {/* Duration */}
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Contract Duration
                </span>
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  {formatDuration(durationValue, durationUnit)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  {formatDate(startDate)} → {formatDate(endDate)}
                </p>
              </div>

              {/* Payment */}
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Payment
                </span>
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  {isMixed
                    ? 'Mixed Billing'
                    : paymentMode === 'emi'
                      ? `EMI · ${emiMonths} months`
                      : '100% Prepaid'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  {acceptanceMethod === 'payment'
                    ? 'Payment Acceptance'
                    : acceptanceMethod === 'signoff'
                      ? 'Signoff Required'
                      : acceptanceMethod === 'auto'
                        ? 'Auto Accept'
                        : '—'}
                </p>
              </div>
            </div>

            {/* ── Description ── */}
            {description && (
              <p
                className="text-sm leading-relaxed mb-10"
                style={{ color: colors.utility.secondaryText }}
              >
                {description}
              </p>
            )}

            {/* ── Block Sections ── */}
            {blockGroups.map(([categoryId, blocks]) => {
              const category = getCategoryById(categoryId);
              const catColor = category?.color || '#6B7280';
              const catName = category?.name || categoryId;
              const CatIcon = CATEGORY_ICONS[categoryId] || FileText;
              const hasPricing = categoryHasPricing(categoryId);

              return (
                <div key={categoryId} className="mb-8">
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${catColor}12` }}
                    >
                      <CatIcon className="w-4 h-4" style={{ color: catColor }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                      {catName}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${catColor}10`, color: catColor }}
                    >
                      {blocks.length}
                    </span>
                  </div>

                  {/* Block items */}
                  <div className="space-y-3">
                    {blocks.map((block) => {
                      const effectivePrice = block.config?.customPrice ?? block.price;
                      const lineTotal = block.unlimited ? effectivePrice : effectivePrice * block.quantity;
                      const blockPayType = perBlockPaymentType[block.id] || 'prepaid';

                      return (
                        <div
                          key={block.id}
                          className="flex gap-4 p-4 rounded-xl border transition-all hover:shadow-sm"
                          style={{
                            borderColor,
                            backgroundColor: `${catColor}03`,
                          }}
                        >
                          {/* Icon area */}
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${catColor}10` }}
                          >
                            <CatIcon className="w-5 h-5" style={{ color: catColor }} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className="text-sm font-semibold truncate"
                                style={{ color: colors.utility.primaryText }}
                              >
                                {block.name || 'Untitled'}
                              </h4>
                              {block.isFlyBy && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                  style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}
                                >
                                  FlyBy
                                </span>
                              )}
                              {categoryId === 'document' && block.config?.fileType && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase flex-shrink-0"
                                  style={{ backgroundColor: `${catColor}12`, color: catColor }}
                                >
                                  {block.config.fileType}
                                </span>
                              )}
                            </div>

                            {/* Pricing tags */}
                            {hasPricing && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                  style={{
                                    backgroundColor: `${colors.utility.primaryText}08`,
                                    color: colors.utility.secondaryText,
                                  }}
                                >
                                  Qty: {block.unlimited ? '∞' : block.quantity}
                                </span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                  style={{ backgroundColor: `${brandPrimary}10`, color: brandPrimary }}
                                >
                                  {getCycleLabel(block.cycle)}
                                </span>
                                {isMixed && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                    style={{
                                      backgroundColor: blockPayType === 'prepaid' ? '#10B98115' : '#F59E0B15',
                                      color: blockPayType === 'prepaid' ? '#10B981' : '#F59E0B',
                                    }}
                                  >
                                    {blockPayType === 'prepaid' ? 'Prepaid' : 'Postpaid'}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Description for pricing blocks with showDescription */}
                            {hasPricing && block.config?.showDescription && block.description && (
                              <p
                                className="text-[11px] mt-2 leading-relaxed"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                {block.description}
                              </p>
                            )}

                            {/* Content body for text/video/image/document blocks */}
                            {!hasPricing && (block.config?.content || block.description) && (
                              <div
                                className="text-xs mt-1.5 leading-relaxed whitespace-pre-wrap"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                {block.config?.content || block.description}
                              </div>
                            )}

                            {/* Checklist items */}
                            {categoryId === 'checklist' && block.config?.notes && (
                              <div className="mt-2 space-y-1.5">
                                {block.config.notes
                                  .split('\n')
                                  .filter(Boolean)
                                  .map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <div
                                        className="w-3.5 h-3.5 rounded border flex-shrink-0"
                                        style={{ borderColor: `${colors.utility.primaryText}25` }}
                                      />
                                      <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                                        {item}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Price - right side, Self View only, pricing blocks only */}
                          {isSelfView && hasPricing && (
                            <div className="text-right flex-shrink-0 self-center">
                              <p className="text-sm font-bold" style={{ color: catColor }}>
                                {formatCurrency(lineTotal, currency)}
                              </p>
                              <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                                {formatCurrency(effectivePrice, currency)}/{block.unlimited ? 'unit' : 'ea'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {selectedBlocks.length === 0 && (
              <div className="py-16 text-center">
                <Package
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: `${colors.utility.secondaryText}40` }}
                />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No blocks added to this contract
                </p>
              </div>
            )}

            {/* ── Financial Summary (inline in paper) ── */}
            {totals.billableCount > 0 && (
              <div className="mt-10 pt-8 border-t" style={{ borderColor }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: colors.utility.primaryText }}>
                  Financial Summary
                </h3>

                {isSelfView && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Subtotal ({totals.billableCount} item{totals.billableCount !== 1 ? 's' : ''})
                      </span>
                      <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(totals.subtotal, currency)}
                      </span>
                    </div>

                    {totals.selectedRates.map((rate) => (
                      <div key={rate.id} className="flex justify-between">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {rate.name} ({rate.rate}%)
                        </span>
                        <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(totals.subtotal * (rate.rate / 100), currency)}
                        </span>
                      </div>
                    ))}

                    <div className="border-t my-2" style={{ borderColor }} />
                  </div>
                )}

                {/* Grand Total */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: `${brandPrimary}08` }}
                >
                  <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    {isSelfView ? 'Grand Total' : 'Contract Value'}
                  </span>
                  <span className="text-2xl font-bold" style={{ color: brandPrimary }}>
                    {formatCurrency(totals.grandTotal, currency)}
                  </span>
                </div>

                {/* EMI note */}
                {paymentMode === 'emi' && !isMixed && (
                  <div
                    className="flex items-center justify-between mt-3 p-3 rounded-lg"
                    style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                  >
                    <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                      {emiMonths} monthly installments
                    </span>
                    <span className="text-xs font-bold" style={{ color: brandPrimary }}>
                      {formatCurrency(totals.emiInstallment, currency)} /mo
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReviewSendStep;

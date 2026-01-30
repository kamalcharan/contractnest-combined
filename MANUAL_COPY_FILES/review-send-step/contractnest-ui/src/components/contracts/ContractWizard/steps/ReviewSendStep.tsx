// src/components/contracts/ContractWizard/steps/ReviewSendStep.tsx
// Step 9: Review & Send - Card-based contract view with Self/Client toggle
// Self View: full pricing details per block
// Client View: same layout, individual prices hidden (total only)

import React, { useState, useMemo } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
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
  Clock,
  Repeat,
  Zap,
  Globe,
  Shield,
  Send,
  Save,
  Receipt,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantProfile, TenantProfile } from '@/hooks/useTenantProfile';
import { useTaxRates } from '@/hooks/useTaxRates';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { ConfigurableBlock, CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import { BillingCycleType } from './BillingCycleStep';
import {
  categoryHasPricing,
  getCategoryById,
  BLOCK_CATEGORIES,
} from '@/utils/catalog-studio/categories';

// ─── Props ───────────────────────────────────────────────────────────

export interface ReviewSendStepProps {
  // Contract identity
  contractName: string;
  contractStatus: string;
  description: string;
  // Duration
  durationValue: number;
  durationUnit: string;
  // Parties
  buyerId: string | null;
  buyerName: string;
  // Acceptance
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  // Billing
  billingCycleType: BillingCycleType;
  currency: string;
  // Blocks
  selectedBlocks: ConfigurableBlock[];
  // Payment
  paymentMode: 'prepaid' | 'emi';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  // Tax
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

// Map category IDs to lucide icons
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

  // ─── Group blocks by category ────────────────────────────────────
  const blockGroups = useMemo(() => {
    const groups: Record<string, ConfigurableBlock[]> = {};
    selectedBlocks.forEach((block) => {
      const catId = block.categoryId || 'service';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(block);
    });
    // Sort: pricing categories first (service, spare), then content categories
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

  // ─── Acceptance button config ────────────────────────────────────
  const actionButton = useMemo(() => {
    switch (acceptanceMethod) {
      case 'payment':
        return { label: 'Generate Invoice', icon: Receipt };
      case 'signoff':
        return { label: 'Send to Customer', icon: Send };
      case 'auto':
        return { label: 'Create Contract', icon: Shield };
      default:
        return { label: 'Send Contract', icon: Send };
    }
  }, [acceptanceMethod]);

  // Calculate timeline
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(d);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.utility.primaryBackground }}>
      {/* Top bar: View toggle */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: `${colors.utility.primaryText}10`, backgroundColor: colors.utility.secondaryBackground }}
      >
        {/* Self / Client pill toggle */}
        <div
          className="flex items-center rounded-full p-1"
          style={{ backgroundColor: `${colors.utility.primaryText}08` }}
        >
          <button
            type="button"
            onClick={() => setViewMode('self')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: isSelfView ? colors.brand.primary : 'transparent',
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

        {/* Acceptance method badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-3 py-1 rounded-full font-medium uppercase tracking-wide"
            style={{
              backgroundColor: `${brandPrimary}15`,
              color: brandPrimary,
            }}
          >
            {acceptanceMethod === 'payment' ? 'Payment Acceptance' : acceptanceMethod === 'signoff' ? 'Signoff Acceptance' : acceptanceMethod === 'auto' ? 'Auto Accept' : 'Not Set'}
          </span>
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-5 p-5 min-h-0">
          {/* ═══ LEFT: Contract Content ═══ */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            {/* ── Header Card ── */}
            <div
              className="rounded-2xl overflow-hidden shadow-sm"
              style={{ border: `1px solid ${colors.utility.primaryText}08` }}
            >
              {/* Branded header strip */}
              <div
                className="px-6 py-5"
                style={{
                  background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Tenant logo */}
                  {tenantProfile?.logo_url ? (
                    <img
                      src={tenantProfile.logo_url}
                      alt={tenantProfile.business_name || 'Company'}
                      className="w-14 h-14 rounded-xl object-cover bg-white/20 shadow-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest">
                      {tenantProfile?.business_name || 'Your Company'}
                    </p>
                    <h2 className="text-white font-bold text-xl mt-0.5 truncate">
                      {contractName || 'Untitled Contract'}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase bg-white/20 text-white">
                        {contractStatus}
                      </span>
                      <span className="text-white/60 text-[11px]">
                        Ref: #CN-XXXX
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats bar */}
              <div
                className="flex items-center divide-x px-2 py-2.5"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  divideColor: `${colors.utility.primaryText}10`,
                }}
              >
                {[
                  { label: 'Duration', value: formatDuration(durationValue, durationUnit), icon: Clock },
                  { label: 'Blocks', value: `${selectedBlocks.length}`, icon: Package },
                  { label: 'Billing', value: isMixed ? 'Mixed' : 'Unified', icon: Repeat },
                  { label: 'Value', value: formatCurrency(totals.grandTotal, currency), icon: CreditCard },
                ].map((stat, i) => (
                  <div key={i} className="flex-1 flex items-center justify-center gap-2 px-3">
                    <stat.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: brandPrimary }} />
                    <div>
                      <p className="text-[9px] uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                        {stat.label}
                      </p>
                      <p className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Block Groups ── */}
            {blockGroups.map(([categoryId, blocks]) => {
              const category = getCategoryById(categoryId);
              const catColor = category?.color || '#6B7280';
              const catName = category?.name || categoryId;
              const CatIcon = CATEGORY_ICONS[categoryId] || FileText;
              const hasPricing = categoryHasPricing(categoryId);

              return (
                <div key={categoryId}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${catColor}15` }}
                    >
                      <CatIcon className="w-3.5 h-3.5" style={{ color: catColor }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                      {catName}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${catColor}12`, color: catColor }}
                    >
                      {blocks.length}
                    </span>
                  </div>

                  {/* Block cards - grid for pricing, stacked for content */}
                  {hasPricing ? (
                    <div className="grid grid-cols-2 gap-3">
                      {blocks.map((block) => {
                        const effectivePrice = block.config?.customPrice ?? block.price;
                        const lineTotal = block.unlimited ? effectivePrice : effectivePrice * block.quantity;
                        const blockPayType = perBlockPaymentType[block.id] || 'prepaid';

                        return (
                          <div
                            key={block.id}
                            className="rounded-xl border p-4 transition-all hover:shadow-sm"
                            style={{
                              backgroundColor: colors.utility.secondaryBackground,
                              borderColor: `${colors.utility.primaryText}10`,
                              borderLeftWidth: '3px',
                              borderLeftColor: catColor,
                            }}
                          >
                            {/* Block name + FlyBy badge */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
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
                            </div>

                            {/* Qty + Cycle row */}
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                style={{ backgroundColor: `${colors.utility.primaryText}08`, color: colors.utility.secondaryText }}
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

                            {/* Description if enabled */}
                            {block.config?.showDescription && block.description && (
                              <p
                                className="text-[11px] mb-2 leading-relaxed"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                {block.description}
                              </p>
                            )}

                            {/* Pricing - Self View only */}
                            {isSelfView && (
                              <div
                                className="flex items-center justify-between pt-2 mt-auto border-t"
                                style={{ borderColor: `${colors.utility.primaryText}08` }}
                              >
                                <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                                  {formatCurrency(effectivePrice, currency)}/{block.unlimited ? 'unit' : 'ea'}
                                </span>
                                <span className="text-sm font-bold" style={{ color: catColor }}>
                                  {formatCurrency(lineTotal, currency)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Content blocks: text, document, checklist, video, image */
                    <div className="space-y-3">
                      {blocks.map((block) => (
                        <div
                          key={block.id}
                          className="rounded-xl border p-4"
                          style={{
                            backgroundColor: colors.utility.secondaryBackground,
                            borderColor: `${colors.utility.primaryText}10`,
                            borderLeftWidth: '3px',
                            borderLeftColor: catColor,
                          }}
                        >
                          {/* Block header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                              {block.name || 'Untitled'}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              {block.isFlyBy && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                  style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}
                                >
                                  FlyBy
                                </span>
                              )}
                              {categoryId === 'document' && block.config?.fileType && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase"
                                  style={{ backgroundColor: `${catColor}12`, color: catColor }}
                                >
                                  {block.config.fileType}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Content body */}
                          {(block.config?.content || block.description) && (
                            <div
                              className="text-xs leading-relaxed whitespace-pre-wrap"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {block.config?.content || block.description}
                            </div>
                          )}

                          {/* Checklist items placeholder */}
                          {categoryId === 'checklist' && block.config?.notes && (
                            <div className="mt-2 space-y-1.5">
                              {block.config.notes.split('\n').filter(Boolean).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded border flex-shrink-0"
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {selectedBlocks.length === 0 && (
              <div
                className="rounded-xl border p-12 text-center"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}10`,
                }}
              >
                <Package className="w-12 h-12 mx-auto mb-3" style={{ color: `${colors.utility.secondaryText}30` }} />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No blocks added to this contract
                </p>
              </div>
            )}
          </div>

          {/* ═══ RIGHT: Sidebar ═══ */}
          <div className="w-[380px] flex-shrink-0 flex flex-col gap-4">
            {/* ── Parties Card ── */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <div
                className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <Globe className="w-4 h-4" style={{ color: brandPrimary }} />
                <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Parties
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Provider */}
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${brandPrimary}06` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${brandPrimary}15` }}
                    >
                      <Building2 className="w-4 h-4" style={{ color: brandPrimary }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: brandPrimary }}>
                        Provider
                      </p>
                      <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                        {tenantProfile?.business_name || 'Your Company'}
                      </p>
                    </div>
                  </div>
                  {tenantProfile?.business_email && (
                    <div className="flex items-center gap-1.5 ml-10 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                      <Mail className="w-3 h-3" />
                      <span>{tenantProfile.business_email}</span>
                    </div>
                  )}
                  {tenantProfile?.business_phone && (
                    <div className="flex items-center gap-1.5 ml-10 mt-0.5 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                      <Phone className="w-3 h-3" />
                      <span>{tenantProfile.business_phone_country_code} {tenantProfile.business_phone}</span>
                    </div>
                  )}
                </div>

                {/* Customer */}
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${brandSecondary}06` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${brandSecondary}15` }}
                    >
                      <User className="w-4 h-4" style={{ color: brandSecondary }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: brandSecondary }}>
                        Customer
                      </p>
                      <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                        {buyerName || 'Not selected'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contract Details Card ── */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <div
                className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <FileText className="w-4 h-4" style={{ color: brandPrimary }} />
                <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Contract Details
                </span>
              </div>

              <div className="p-4">
                {/* Timeline */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl mb-4"
                  style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                >
                  <div className="text-center">
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Start</p>
                    <p className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>{formatDate(startDate)}</p>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 border-t border-dashed" style={{ borderColor: brandPrimary }} />
                    <div
                      className="mx-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}
                    >
                      {formatDuration(durationValue, durationUnit)}
                    </div>
                    <div className="flex-1 border-t border-dashed" style={{ borderColor: brandPrimary }} />
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>End</p>
                    <p className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>{formatDate(endDate)}</p>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="space-y-2.5">
                  {[
                    { label: 'Billing Cycle', value: isMixed ? 'Mixed Cycles' : 'Unified Cycle' },
                    { label: 'Currency', value: `${currency} (${getCurrencySymbol(currency)})` },
                    { label: 'Payment Mode', value: paymentMode === 'emi' ? `EMI (${emiMonths} months)` : '100% Prepaid' },
                    { label: 'Acceptance', value: acceptanceMethod === 'payment' ? 'Payment' : acceptanceMethod === 'signoff' ? 'Signoff' : acceptanceMethod === 'auto' ? 'Auto Accept' : '—' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{row.label}</span>
                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Financial Summary Card ── */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              <div
                className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <CreditCard className="w-4 h-4" style={{ color: brandPrimary }} />
                <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Financial Summary
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                {/* Self View: show subtotal + tax breakdown */}
                {isSelfView && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Subtotal ({totals.billableCount} item{totals.billableCount !== 1 ? 's' : ''})
                      </span>
                      <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(totals.subtotal, currency)}
                      </span>
                    </div>

                    {totals.selectedRates.map((rate) => (
                      <div key={rate.id} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {rate.name} ({rate.rate}%)
                        </span>
                        <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(totals.subtotal * (rate.rate / 100), currency)}
                        </span>
                      </div>
                    ))}

                    <div className="border-t my-1" style={{ borderColor: `${colors.utility.primaryText}10` }} />
                  </>
                )}

                {/* Grand Total - always shown */}
                <div
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: `${brandPrimary}08` }}
                >
                  <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    {isSelfView ? 'Grand Total' : 'Contract Value'}
                  </span>
                  <span className="text-xl font-bold" style={{ color: brandPrimary }}>
                    {formatCurrency(totals.grandTotal, currency)}
                  </span>
                </div>

                {/* EMI note */}
                {paymentMode === 'emi' && !isMixed && (
                  <div
                    className="flex items-center justify-between p-2.5 rounded-lg"
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

                {/* Payment info */}
                <div className="flex items-center gap-2 pt-1">
                  <Zap className="w-3.5 h-3.5" style={{ color: brandPrimary }} />
                  <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                    {paymentMode === 'emi'
                      ? '1st invoice on acceptance, rest monthly'
                      : 'Invoice generated when contract is accepted'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-3 mt-auto pt-2">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  backgroundColor: colors.utility.secondaryBackground,
                }}
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 shadow-sm"
                style={{
                  backgroundColor: brandPrimary,
                  color: '#FFFFFF',
                }}
              >
                <actionButton.icon className="w-4 h-4" />
                {actionButton.label}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSendStep;

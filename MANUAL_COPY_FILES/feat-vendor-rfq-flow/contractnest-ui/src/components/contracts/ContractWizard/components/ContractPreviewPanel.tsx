// src/components/contracts/ContractWizard/components/ContractPreviewPanel.tsx
// Live contract preview panel - Column 3 of ServiceBlocksStep
// Shows dynamic contract being built: tenant, customer, details, blocks, totals

import React, { useMemo } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Check,
  Package,
  Sparkles,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { TenantProfile } from '@/hooks/useTenantProfile';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { ConfigurableBlock } from '@/components/catalog-studio/BlockCardConfigurable';

// Contact type from BuyerSelectionStep
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

export interface ContractPreviewPanelProps {
  // Tenant (Provider)
  tenantProfile?: TenantProfile | null;
  // Customer (Buyer from Step 2)
  selectedBuyer?: Contact | null;
  selectedPerson?: ContactPerson | null;
  useCompanyContact?: boolean;
  // Contract Details (from Step 3)
  contractName: string;
  contractStatus?: string;
  contractDuration?: number; // months
  contractStartDate?: Date | null;
  // Blocks
  selectedBlocks: ConfigurableBlock[];
  currency: string;
  // Styling
  className?: string;
  // RFQ mode - hide pricing info
  hidePricing?: boolean;
}

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
};

// Format date
const formatDate = (date: Date | null | undefined) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(date);
};

// Calculate end date
const calculateEndDate = (startDate: Date | null | undefined, durationMonths: number) => {
  if (!startDate) return null;
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + durationMonths);
  return end;
};

// Get initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ContractPreviewPanel: React.FC<ContractPreviewPanelProps> = ({
  tenantProfile,
  selectedBuyer,
  selectedPerson,
  useCompanyContact,
  contractName,
  contractStatus = 'draft',
  contractDuration = 12,
  contractStartDate,
  selectedBlocks,
  currency,
  className = '',
  hidePricing = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = selectedBlocks.reduce((sum, block) => sum + block.totalPrice, 0);
    // TODO: Get tax rate from blocks' pricing rules
    const taxRate = 0.18; // 18% GST default
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, taxRate, total, blockCount: selectedBlocks.length };
  }, [selectedBlocks]);

  // Calculate end date
  const endDate = calculateEndDate(contractStartDate, contractDuration);

  // Get customer display info
  const customerName = selectedBuyer
    ? selectedBuyer.contact_type === 'corporate'
      ? selectedBuyer.company_name || selectedBuyer.name
      : selectedBuyer.name
    : null;

  const customerEmail = selectedPerson
    ? selectedPerson.contact_channels?.find((c) => c.channel_type === 'email')?.channel_value
    : selectedBuyer?.email;

  const customerPhone = selectedPerson
    ? selectedPerson.contact_channels?.find((c) => c.channel_type === 'mobile' || c.channel_type === 'phone')?.channel_value
    : selectedBuyer?.phone;

  // Status colors
  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: `${colors.utility.secondaryText}20`, text: colors.utility.secondaryText },
    pending: { bg: `${colors.semantic.warning}20`, text: colors.semantic.warning },
    active: { bg: `${colors.semantic.success}20`, text: colors.semantic.success },
    completed: { bg: `${colors.brand.primary}20`, text: colors.brand.primary },
  };

  const currentStatusColor = statusColors[contractStatus] || statusColors.draft;

  return (
    <div
      className={`flex flex-col h-full overflow-hidden rounded-xl border ${className}`}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}10`,
      }}
    >
      {/* Header - Contract Title */}
      <div
        className="p-4 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primary}DD 100%)`,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Tenant Logo */}
          {tenantProfile?.logo_url ? (
            <img
              src={tenantProfile.logo_url}
              alt={tenantProfile.business_name || 'Company'}
              className="w-12 h-12 rounded-xl object-cover bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">
              {tenantProfile?.business_name || 'Your Company'}
            </p>
            <h3 className="text-white font-bold text-lg truncate">
              {contractName || 'New Contract'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              >
                {contractStatus}
              </span>
              <span className="text-white/60 text-[10px]">
                {formatDate(contractStartDate || new Date())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {/* Parties Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: colors.utility.secondaryText }}
            >
              Parties
            </span>
          </div>

          <div className="space-y-2">
            {/* Provider Card */}
            <div
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}08`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${colors.brand.primary}15` }}
                >
                  <Building2 className="w-3 h-3" style={{ color: colors.brand.primary }} />
                </div>
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: colors.brand.primary }}
                >
                  Provider
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                {tenantProfile?.business_name || 'Your Company'}
              </p>
              <div className="mt-2 space-y-1">
                {tenantProfile?.business_email && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                    <Mail className="w-3 h-3" />
                    <span>{tenantProfile.business_email}</span>
                  </div>
                )}
                {tenantProfile?.business_phone && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                    <Phone className="w-3 h-3" />
                    <span>{tenantProfile.business_phone_country_code} {tenantProfile.business_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Card */}
            <div
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}08`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${colors.semantic.success}15` }}
                >
                  <User className="w-3 h-3" style={{ color: colors.semantic.success }} />
                </div>
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: colors.semantic.success }}
                >
                  Customer
                </span>
              </div>
              {customerName ? (
                <>
                  <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    {customerName}
                  </p>
                  {selectedPerson && !useCompanyContact && (
                    <p className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
                      Attn: {selectedPerson.name}
                      {selectedPerson.designation && ` (${selectedPerson.designation})`}
                    </p>
                  )}
                  <div className="mt-2 space-y-1">
                    {customerEmail && (
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                        <Mail className="w-3 h-3" />
                        <span>{customerEmail}</span>
                      </div>
                    )}
                    {customerPhone && (
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                        <Phone className="w-3 h-3" />
                        <span>{customerPhone}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs italic" style={{ color: colors.utility.secondaryText }}>
                  Select a customer in Step 2
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contract Details */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: colors.utility.secondaryText }}
            >
              Contract Details
            </span>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}08`,
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: colors.utility.secondaryText }}>
                  Duration
                </p>
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  {contractDuration} months
                </p>
              </div>
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: colors.utility.secondaryText }}>
                  Status
                </p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize inline-block"
                  style={{
                    backgroundColor: currentStatusColor.bg,
                    color: currentStatusColor.text,
                  }}
                >
                  {contractStatus}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    {formatDate(contractStartDate)}
                  </span>
                </div>
                <ArrowRight className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    {formatDate(endDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Included */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: colors.utility.secondaryText }}
              >
                Services Included
              </span>
            </div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${colors.brand.primary}15`,
                color: colors.brand.primary,
              }}
            >
              {totals.blockCount}
            </span>
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}08`,
            }}
          >
            {selectedBlocks.length === 0 ? (
              <div className="p-4 text-center">
                <Package className="w-8 h-8 mx-auto mb-2" style={{ color: `${colors.utility.secondaryText}40` }} />
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Add blocks from the library
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: `${colors.utility.primaryText}08` }}>
                {selectedBlocks.map((block) => (
                  <div key={block.id} className="p-2.5 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.semantic.success }} />
                    <span
                      className="text-xs flex-1 truncate"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {block.name}
                    </span>
                    {!hidePricing && (
                      <>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${colors.utility.primaryText}08`,
                            color: colors.utility.secondaryText,
                          }}
                        >
                          ×{block.unlimited ? '∞' : block.quantity}
                        </span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {formatCurrency(block.totalPrice, block.currency)}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Totals (hidden in RFQ mode) */}
      {!hidePricing && (
        <div
          className="p-4 border-t flex-shrink-0"
          style={{
            borderColor: `${colors.utility.primaryText}10`,
            backgroundColor: colors.utility.secondaryBackground,
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Subtotal ({totals.blockCount} items)
              </span>
              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Tax ({Math.round(totals.taxRate * 100)}%)
              </span>
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {formatCurrency(totals.tax, currency)}
              </span>
            </div>
            <div
              className="flex items-center justify-between pt-2 border-t"
              style={{ borderColor: `${colors.utility.primaryText}15` }}
            >
              <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Total
              </span>
              <span className="text-lg font-bold" style={{ color: colors.brand.primary }}>
                {formatCurrency(totals.total, currency)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractPreviewPanel;

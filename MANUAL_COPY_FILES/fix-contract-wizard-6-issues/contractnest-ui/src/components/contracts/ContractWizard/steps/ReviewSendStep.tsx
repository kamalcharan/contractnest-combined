// src/components/contracts/ContractWizard/steps/ReviewSendStep.tsx
// Step 9: Review & Send - 65/35 two-column layout
// Left: Paper Canvas with Self/Client toggle
// Right: Acceptance Flow Panel (Payment / Signoff / Auto Accept)

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  MapPin,
  Loader2,
  Calendar,
  MessageSquare,
  ArrowDown,
  ArrowRight,
  Check,
  AlertTriangle,
  Settings,
  Shield,
  Send,
  PenTool,
  RefreshCw,
  Link2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useTaxRates } from '@/hooks/useTaxRates';
import { useContact } from '@/hooks/useContacts';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useGatewayStatus } from '@/hooks/useGatewayStatus';
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
  paymentMode: 'prepaid' | 'emi' | 'defined';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  selectedTaxRateIds: string[];
  // RFQ mode
  rfqMode?: boolean;
  vendorNames?: string[];
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

const SALUTATION_LABELS: Record<string, string> = {
  mr: 'Mr.',
  ms: 'Ms.',
  mrs: 'Mrs.',
  dr: 'Dr.',
  prof: 'Prof.',
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
  rfqMode = false,
  vendorNames = [],
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tenant branding
  const { profile: tenantProfile } = useTenantProfile();
  const brandPrimary = tenantProfile?.primary_color || '#F59E0B';
  const brandSecondary = tenantProfile?.secondary_color || '#10B981';

  // Buyer contact details (cached from BuyerSelectionStep)
  const { data: buyerContact } = useContact(buyerId || '');

  // Gateway status (for auto-accept payment indicator)
  const { hasActiveGateway, providerDisplayName, isLoading: gatewayLoading } = useGatewayStatus();

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

  // PDF generation
  const paperRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const isMixed = billingCycleType === 'mixed';
  const durationMonths = getDurationInMonths(durationValue, durationUnit);

  // Paper canvas colors
  const canvasBg = isDarkMode ? colors.utility.primaryBackground : '#F1F5F9';
  const paperBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';
  const paperShadow = isDarkMode
    ? '0 4px 20px rgba(0,0,0,0.3)'
    : '0 10px 30px rgba(0,0,0,0.05)';
  const borderColor = isDarkMode ? `${colors.utility.primaryText}15` : '#E2E8F0';

  // ─── Buyer display helpers ────────────────────────────────────────
  const buyerDisplayName = useMemo(() => {
    if (!buyerContact) return buyerName || 'Not selected';
    if (buyerContact.type === 'corporate') return buyerContact.company_name || buyerContact.name || buyerName;
    const salutation = buyerContact.salutation ? SALUTATION_LABELS[buyerContact.salutation] || '' : '';
    const name = buyerContact.name || buyerName;
    return salutation ? `${salutation} ${name}` : name;
  }, [buyerContact, buyerName]);

  const buyerPrimaryAddress = useMemo(() => {
    if (!buyerContact?.addresses?.length) return null;
    return buyerContact.addresses.find((a) => a.is_primary) || buyerContact.addresses[0];
  }, [buyerContact]);

  const buyerPrimaryEmail = useMemo(() => {
    if (!buyerContact?.contact_channels?.length) return null;
    return buyerContact.contact_channels.find((c) => c.channel_type === 'email' && c.is_primary)
      || buyerContact.contact_channels.find((c) => c.channel_type === 'email');
  }, [buyerContact]);

  const buyerPrimaryPhone = useMemo(() => {
    if (!buyerContact?.contact_channels?.length) return null;
    return buyerContact.contact_channels.find((c) => (c.channel_type === 'mobile' || c.channel_type === 'phone') && c.is_primary)
      || buyerContact.contact_channels.find((c) => c.channel_type === 'mobile' || c.channel_type === 'phone');
  }, [buyerContact]);

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

  // ─── Financial calculations (per-block tax aggregation) ─────────
  const totals = useMemo(() => {
    const billableBlocks = selectedBlocks.filter((b) => categoryHasPricing(b.categoryId || ''));
    let baseSubtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;
    const taxMap: Record<string, { name: string; rate: number; amount: number }> = {};

    billableBlocks.forEach((block) => {
      const ep = block.config?.customPrice ?? block.price;
      const qty = block.unlimited ? 1 : block.quantity;
      const taxRate = block.taxRate || 0;

      if (taxRate === 0) {
        baseSubtotal += ep * qty;
        grandTotal += block.totalPrice;
      } else if (block.taxInclusion === 'inclusive') {
        const total = ep * qty;
        const base = total / (1 + taxRate / 100);
        baseSubtotal += base;
        totalTax += total - base;
        grandTotal += block.totalPrice;
        if (block.taxes?.length) {
          block.taxes.forEach((tax) => {
            const amt = (base * Number(tax.rate)) / 100;
            const key = tax.id || tax.name || `tax-${tax.rate}`;
            if (!taxMap[key]) taxMap[key] = { name: tax.name || 'Tax', rate: Number(tax.rate), amount: 0 };
            taxMap[key].amount += amt;
          });
        }
      } else {
        const base = ep * qty;
        baseSubtotal += base;
        totalTax += base * taxRate / 100;
        grandTotal += block.totalPrice;
        if (block.taxes?.length) {
          block.taxes.forEach((tax) => {
            const amt = (base * Number(tax.rate)) / 100;
            const key = tax.id || tax.name || `tax-${tax.rate}`;
            if (!taxMap[key]) taxMap[key] = { name: tax.name || 'Tax', rate: Number(tax.rate), amount: 0 };
            taxMap[key].amount += amt;
          });
        }
      }
    });

    const taxBreakup = Object.values(taxMap).map((t) => ({
      ...t,
      amount: Math.round(t.amount * 100) / 100,
    }));
    const subtotal = Math.round(baseSubtotal * 100) / 100;
    grandTotal = Math.round(grandTotal * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    const emiInstallment = emiMonths > 0 ? grandTotal / emiMonths : grandTotal;

    return { subtotal, taxBreakup, taxAmount: totalTax, grandTotal, emiInstallment, billableCount: billableBlocks.length };
  }, [selectedBlocks, emiMonths]);

  // ─── Payment plan breakup (for "As Defined" / Mixed display) ─────
  const definedBreakup = useMemo(() => {
    const billableBlocks = selectedBlocks.filter((b) => categoryHasPricing(b.categoryId || ''));
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
  }, [selectedBlocks]);

  // Timeline dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

  // ─── PDF generation ───────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!paperRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(paperRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${contractName || 'Contract'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGeneratingPdf(false);
    }
  }, [contractName]);

  // ─── Seller address helper ────────────────────────────────────────
  const sellerAddress = useMemo(() => {
    if (!tenantProfile) return null;
    const parts = [
      tenantProfile.address_line1,
      tenantProfile.address_line2,
      tenantProfile.city,
      tenantProfile.state_code,
      tenantProfile.postal_code,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [tenantProfile]);

  // ─── Payment plan label ───────────────────────────────────────────
  const paymentPlanLabel = useMemo(() => {
    if (isMixed) return 'Mixed Billing';
    if (paymentMode === 'emi') return `EMI \u00B7 ${emiMonths} months`;
    if (paymentMode === 'defined') return 'As Defined';
    return '100% Upfront';
  }, [isMixed, paymentMode, emiMonths]);

  // ─── Payment gateway pre-check ──────────────────────────────────
  const { integrations: paymentIntegrations, fetchIntegrationsByType } = useIntegrations();
  const [paymentGatewayChecked, setPaymentGatewayChecked] = useState(false);
  const [paymentGatewayConfigured, setPaymentGatewayConfigured] = useState(false);
  const [paymentGatewayProvider, setPaymentGatewayProvider] = useState<string | null>(null);

  useEffect(() => {
    if (acceptanceMethod === 'payment' && !paymentGatewayChecked) {
      fetchIntegrationsByType('payment_gateway');
      setPaymentGatewayChecked(true);
    }
  }, [acceptanceMethod, paymentGatewayChecked, fetchIntegrationsByType]);

  useEffect(() => {
    if (paymentIntegrations && paymentIntegrations.length > 0) {
      const configured = paymentIntegrations.find(
        (i) => i.is_configured && i.is_active && i.connection_status === 'Connected'
      );
      setPaymentGatewayConfigured(!!configured);
      setPaymentGatewayProvider(configured?.display_name || configured?.provider_name || null);
    }
  }, [paymentIntegrations]);

  // ─── Buyer channel helpers for notification panel ─────────────
  const buyerWhatsApp = useMemo(() => {
    if (!buyerContact?.contact_channels?.length) return null;
    return buyerContact.contact_channels.find((c: any) => c.channel_type === 'whatsapp');
  }, [buyerContact]);

  // ─── Render Right Panel ────────────────────────────────────────

  const renderAcceptancePanel = () => {
    if (rfqMode) return null;

    const panelBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';
    const panelBorder = isDarkMode ? `${colors.utility.primaryText}12` : '#E2E8F0';
    const stepDot = (label: string, color: string, isActive: boolean = false) => (
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isActive ? color : `${color}15`,
            border: isActive ? 'none' : `2px solid ${color}40`,
          }}
        >
          {isActive && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: isActive ? colors.utility.primaryText : colors.utility.secondaryText }}
        >
          {label}
        </span>
      </div>
    );

    const connector = () => (
      <div className="flex items-center ml-3.5 py-0.5">
        <div className="w-px h-5" style={{ backgroundColor: `${colors.utility.primaryText}15` }} />
      </div>
    );

    // ─── Payment Flow Panel ─────────────────────────────────────
    if (acceptanceMethod === 'payment') {
      return (
        <div className="space-y-4">
          {/* Acceptance type header */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${brandPrimary}12` }}
            >
              <CreditCard className="w-5 h-5" style={{ color: brandPrimary }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Payment Acceptance
              </p>
              <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                Client pays to accept the contract
              </p>
            </div>
          </div>

          {/* Payment gateway pre-check */}
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: paymentGatewayConfigured ? `${colors.semantic.success}06` : `${colors.semantic.warning}06`,
              borderColor: paymentGatewayConfigured ? `${colors.semantic.success}30` : `${colors.semantic.warning}30`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: paymentGatewayConfigured
                    ? `${colors.semantic.success}15`
                    : `${colors.semantic.warning}15`,
                }}
              >
                {paymentGatewayConfigured ? (
                  <Shield className="w-4 h-4" style={{ color: colors.semantic.success }} />
                ) : (
                  <AlertTriangle className="w-4 h-4" style={{ color: colors.semantic.warning }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                  {paymentGatewayConfigured
                    ? `Online Payment: ${paymentGatewayProvider}`
                    : 'No Payment Gateway Configured'}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  {paymentGatewayConfigured
                    ? 'Online payment link will be included in the invoice.'
                    : 'Invoice will require offline payment. Configure a gateway for online payments.'}
                </p>
                {!paymentGatewayConfigured && (
                  <a
                    href="/settings/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-2 hover:opacity-80 transition-opacity"
                    style={{ color: brandPrimary }}
                  >
                    <Settings className="w-3 h-3" />
                    Configure in Settings
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Notification preview */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.utility.secondaryText }}>
              Notifications
            </p>
            <div className="space-y-2.5">
              {buyerPrimaryEmail ? (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.success }} />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    Invoice will be sent to{' '}
                    <span className="font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: `${brandPrimary}10`, color: brandPrimary }}>
                      {buyerPrimaryEmail.value}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                  <span className="text-xs" style={{ color: colors.semantic.warning }}>No email configured</span>
                </div>
              )}
              {buyerWhatsApp ? (
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#25D366' }} />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    WhatsApp notification to{' '}
                    <span className="font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: '#25D36610', color: '#25D366' }}>
                      {buyerWhatsApp.value}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>No WhatsApp configured</span>
                </div>
              )}
            </div>
          </div>

          {/* What happens next — workflow */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: colors.utility.secondaryText }}>
              What Happens Next
            </p>
            <div>
              {stepDot('Contract Created', brandPrimary, true)}
              {connector()}
              {stepDot('Invoice sent to client', brandPrimary, false)}
              {connector()}
              {stepDot('Awaiting payment', colors.semantic.warning || '#F59E0B', false)}
              {connector()}
              {stepDot('Payment received — Contract Active', colors.semantic.success, false)}
              {connector()}
              {stepDot('CNAK generated — Digital access enabled', colors.semantic.success, false)}
            </div>
          </div>
        </div>
      );
    }

    // ─── Signoff Flow Panel ─────────────────────────────────────
    if (acceptanceMethod === 'signoff') {
      return (
        <div className="space-y-4">
          {/* Acceptance type header */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${brandPrimary}12` }}
            >
              <PenTool className="w-5 h-5" style={{ color: brandPrimary }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Signoff Acceptance
              </p>
              <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                Client reviews and signs off to accept
              </p>
            </div>
          </div>

          {/* Notification preview */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.utility.secondaryText }}>
              Notifications
            </p>
            <div className="space-y-2.5">
              {buyerPrimaryEmail ? (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.success }} />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    Contract view + PDF sent to{' '}
                    <span className="font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: `${brandPrimary}10`, color: brandPrimary }}>
                      {buyerPrimaryEmail.value}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                  <span className="text-xs" style={{ color: colors.semantic.warning }}>No email configured</span>
                </div>
              )}
              {buyerWhatsApp ? (
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#25D366' }} />
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    WhatsApp notification to{' '}
                    <span className="font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: '#25D36610', color: '#25D366' }}>
                      {buyerWhatsApp.value}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>No WhatsApp configured</span>
                </div>
              )}
            </div>
          </div>

          {/* What happens next — 2-path workflow */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: colors.utility.secondaryText }}>
              What Happens Next
            </p>
            <div>
              {stepDot('Contract Created & Sent', brandPrimary, true)}
              {connector()}
              {stepDot('Client reviews contract', brandPrimary, false)}
              {connector()}

              {/* Branch point */}
              <div className="ml-3.5 my-2">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-px h-3" style={{ backgroundColor: `${colors.utility.primaryText}15` }} />
                </div>
                {/* Two paths */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Accept path */}
                  <div
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: `${colors.semantic.success}06`,
                      borderColor: `${colors.semantic.success}25`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Check className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                      <span className="text-[11px] font-bold" style={{ color: colors.semantic.success }}>
                        Client Accepts
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        Contract becomes Active
                      </p>
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        Invoice triggered (if applicable)
                      </p>
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        CNAK generated for digital access
                      </p>
                    </div>
                  </div>

                  {/* Reject path */}
                  <div
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: `${colors.semantic.error}06`,
                      borderColor: `${colors.semantic.error}25`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <RefreshCw className="w-3.5 h-3.5" style={{ color: colors.semantic.error }} />
                      <span className="text-[11px] font-bold" style={{ color: colors.semantic.error }}>
                        Client Rejects
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        You can edit the contract
                      </p>
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        Send it back for review
                      </p>
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        Cycle continues till acceptance
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client access note */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: `${brandPrimary}06` }}
          >
            <Link2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: brandPrimary }} />
            <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
              Client will receive a secure link to view and accept/reject this contract. New users will be invited to create an account.
            </p>
          </div>
        </div>
      );
    }

    // ─── Auto Accept Flow Panel ─────────────────────────────────
    if (acceptanceMethod === 'auto') {
      return (
        <div className="space-y-4">
          {/* Acceptance type header */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{
              backgroundColor: `${colors.semantic.success}06`,
              borderColor: `${colors.semantic.success}30`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.semantic.success}15` }}
            >
              <Check className="w-5 h-5" style={{ color: colors.semantic.success }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Auto Accept
              </p>
              <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                Contract becomes active immediately upon creation
              </p>
            </div>
          </div>

          {/* Payment recording prompt */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.utility.secondaryText }}>
              Payment Status
            </p>

            {/* Payment Gateway Config Indicator */}
            <div
              className="flex items-center gap-2.5 p-3 rounded-lg mb-3"
              style={{
                backgroundColor: hasActiveGateway
                  ? `${colors.semantic.success}08`
                  : `${colors.semantic.warning}08`,
                border: `1px solid ${hasActiveGateway ? `${colors.semantic.success}20` : `${colors.semantic.warning}20`}`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: gatewayLoading
                    ? colors.utility.secondaryText
                    : hasActiveGateway
                      ? colors.semantic.success
                      : colors.semantic.warning,
                }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold block" style={{ color: colors.utility.primaryText }}>
                  {gatewayLoading
                    ? 'Checking gateway...'
                    : hasActiveGateway
                      ? `${providerDisplayName || 'Payment Gateway'} Configured`
                      : 'No Payment Gateway Configured'}
                </span>
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {hasActiveGateway
                    ? 'Online payments can be collected'
                    : 'Only offline payment recording available'}
                </span>
              </div>
              <CreditCard className="w-4 h-4 flex-shrink-0" style={{
                color: hasActiveGateway ? colors.semantic.success : colors.utility.secondaryText,
              }} />
            </div>

            <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
              You can record payment (offline or online) after clicking Create Contract.
            </p>
          </div>

          {/* What happens next */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: panelBg, borderColor: panelBorder }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: colors.utility.secondaryText }}>
              What Happens Next
            </p>
            <div>
              {stepDot('Contract Created', brandPrimary, true)}
              {connector()}
              {stepDot('Auto-accepted — Status: Active', colors.semantic.success, false)}
              {connector()}
              {stepDot('CNAK generated immediately', colors.semantic.success, false)}
              {connector()}
              {stepDot('Record payment (if applicable)', colors.semantic.warning || '#F59E0B', false)}
            </div>
          </div>

          {/* Notification note */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: `${colors.semantic.success}06` }}
          >
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.success }} />
            <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
              No acceptance notifications will be sent. The contract will be active immediately.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: canvasBg }}>
      {/* Scrollable content — 65/35 two-column grid */}
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-[1400px] mx-auto px-4 pt-6 pb-6 ${rfqMode ? '' : 'grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6'}`}>

        {/* ═══ LEFT COLUMN: Paper Canvas ═══ */}
        <div className="min-w-0">
        {/* Controls above paper */}
        <div className="flex items-center justify-between px-2 pb-3">
          {/* Self / Client pill toggle - hidden in RFQ mode */}
          {!rfqMode ? (
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
          ) : (
            <span
              className="text-[10px] px-3 py-1.5 rounded-full font-medium uppercase tracking-wide shadow-sm"
              style={{ backgroundColor: paperBg, color: brandPrimary }}
            >
              RFQ Preview
            </span>
          )}

          {/* Right controls: PDF download + Acceptance badge */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:opacity-80 shadow-sm"
              style={{
                backgroundColor: paperBg,
                color: colors.utility.primaryText,
                opacity: generatingPdf ? 0.6 : 1,
              }}
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {generatingPdf ? 'Generating...' : 'PDF'}
            </button>
            {!rfqMode && (
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
            )}
          </div>
        </div>

        {/* ═══ THE PAPER ═══ */}
        <div
          ref={paperRef}
          className="rounded-lg"
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
                <p className="text-white text-sm font-medium mt-0.5">
                  {rfqMode ? 'Request for Quotation' : 'Service Agreement'}
                </p>
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
              {contractName || (rfqMode ? 'Untitled RFQ' : 'Untitled Contract')}
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
                {sellerAddress && (
                  <p
                    className="text-xs mt-0.5 flex items-start gap-1.5"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{sellerAddress}</span>
                  </p>
                )}
              </div>

              {/* Customer / Vendors */}
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {rfqMode ? 'Vendors' : 'Customer'}
                </span>
                {rfqMode && vendorNames.length > 0 ? (
                  <div className="space-y-1">
                    {vendorNames.map((name, idx) => (
                      <p key={idx} className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                        {name}
                      </p>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                      {buyerDisplayName}
                    </p>
                    {buyerPrimaryEmail && (
                      <p
                        className="text-xs mt-1 flex items-center gap-1.5"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <Mail className="w-3 h-3" />
                        {buyerPrimaryEmail.value}
                      </p>
                    )}
                    {buyerPrimaryPhone && (
                      <p
                        className="text-xs mt-0.5 flex items-center gap-1.5"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <Phone className="w-3 h-3" />
                        {buyerPrimaryPhone.country_code ? `${buyerPrimaryPhone.country_code} ` : ''}{buyerPrimaryPhone.value}
                      </p>
                    )}
                    {buyerPrimaryAddress && (
                      <p
                        className="text-xs mt-0.5 flex items-start gap-1.5"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>
                          {[
                            buyerPrimaryAddress.address_line1,
                            buyerPrimaryAddress.city,
                            buyerPrimaryAddress.state,
                            buyerPrimaryAddress.postal_code,
                          ].filter(Boolean).join(', ')}
                        </span>
                      </p>
                    )}
                  </>
                )}
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

              {/* Payment - hidden in RFQ mode */}
              {!rfqMode && (
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Payment
                  </span>
                  <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    {paymentPlanLabel}
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
              )}
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
                              {categoryId === 'document' && block.config?.fileType && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase flex-shrink-0"
                                  style={{ backgroundColor: `${catColor}12`, color: catColor }}
                                >
                                  {block.config.fileType}
                                </span>
                              )}
                            </div>

                            {/* Pricing tags - hidden in RFQ mode */}
                            {hasPricing && !rfqMode && (
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
                                {isMixed && isSelfView && (
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

                          {/* Price - right side, Self View only, pricing blocks only, hidden in RFQ */}
                          {isSelfView && hasPricing && !rfqMode && (
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

            {/* ── Payment Plan Section (after services, before financial summary) ── */}
            {totals.billableCount > 0 && !rfqMode && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor }}>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${brandPrimary}12` }}
                  >
                    <Calendar className="w-4 h-4" style={{ color: brandPrimary }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    Payment Plan
                  </span>
                  <span
                    className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${brandPrimary}10`, color: brandPrimary }}
                  >
                    {paymentPlanLabel}
                  </span>
                </div>

                <div
                  className="p-5 rounded-xl border"
                  style={{ borderColor, backgroundColor: `${brandPrimary}03` }}
                >
                  {/* Upfront */}
                  {paymentMode === 'prepaid' && !isMixed && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                        Full Upfront Payment
                      </p>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Entire contract value of{' '}
                        <strong style={{ color: brandPrimary }}>{formatCurrency(totals.grandTotal, currency)}</strong>
                        {' '}is due on acceptance.
                      </p>
                    </div>
                  )}

                  {/* EMI */}
                  {paymentMode === 'emi' && !isMixed && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                        Equal Monthly Installments
                      </p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {emiMonths} monthly installments of
                        </span>
                        <span className="text-sm font-bold" style={{ color: brandPrimary }}>
                          {formatCurrency(totals.emiInstallment, currency)}/mo
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {Array.from({ length: Math.min(emiMonths, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] py-1.5 px-3 rounded-lg"
                            style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                          >
                            <span style={{ color: colors.utility.secondaryText }}>
                              Installment {i + 1}
                            </span>
                            <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                              {formatCurrency(totals.emiInstallment, currency)}
                            </span>
                          </div>
                        ))}
                        {emiMonths > 3 && (
                          <p className="text-[10px] text-center pt-1" style={{ color: colors.utility.secondaryText }}>
                            +{emiMonths - 3} more installment{emiMonths - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* As Defined */}
                  {paymentMode === 'defined' && !isMixed && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                        Billed Per Block Cycle
                      </p>
                      <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                        Each service is billed as per its defined billing cycle.
                      </p>
                      <div className="space-y-1.5">
                        {definedBreakup.map((group, i) => (
                          <div
                            key={group.cycle}
                            className="flex items-center justify-between text-[11px] py-2 px-3 rounded-lg"
                            style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                                style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}
                              >
                                {i + 1}
                              </div>
                              <div>
                                <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                                  {group.label}
                                </span>
                                <span className="text-[9px] ml-1" style={{ color: colors.utility.secondaryText }}>
                                  ({group.blockCount} block{group.blockCount !== 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                                {formatCurrency(group.total, currency)}
                              </span>
                              {group.isRecurring && (
                                <span className="text-[9px] block" style={{ color: colors.utility.secondaryText }}>
                                  /{group.cycle === 'monthly' ? 'mo' : group.cycle === 'fortnightly' ? '2wk' : group.cycle === 'quarterly' ? 'qtr' : group.cycle}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mixed */}
                  {isMixed && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                        Mixed Billing Schedule
                      </p>
                      <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                        Each service follows its own billing cycle and payment type.
                      </p>
                      <div className="space-y-1.5">
                        {definedBreakup.map((group, i) => (
                          <div
                            key={group.cycle}
                            className="flex items-center justify-between text-[11px] py-2 px-3 rounded-lg"
                            style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                                style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}
                              >
                                {i + 1}
                              </div>
                              <div>
                                <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                                  {group.label}
                                </span>
                                <span className="text-[9px] ml-1" style={{ color: colors.utility.secondaryText }}>
                                  ({group.blockCount} block{group.blockCount !== 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                                {formatCurrency(group.total, currency)}
                              </span>
                              {group.isRecurring && (
                                <span className="text-[9px] block" style={{ color: colors.utility.secondaryText }}>
                                  /{group.cycle === 'monthly' ? 'mo' : group.cycle === 'fortnightly' ? '2wk' : group.cycle === 'quarterly' ? 'qtr' : group.cycle}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Financial Summary (inline in paper) - hidden in RFQ ── */}
            {totals.billableCount > 0 && !rfqMode && (
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

                    {totals.taxBreakup.length > 0 ? (
                      totals.taxBreakup.map((tax, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            {tax.name} ({tax.rate}%)
                          </span>
                          <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                            {formatCurrency(tax.amount, currency)}
                          </span>
                        </div>
                      ))
                    ) : totals.taxAmount > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          Tax
                        </span>
                        <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(totals.taxAmount, currency)}
                        </span>
                      </div>
                    ) : null}

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

                {/* Defined note */}
                {paymentMode === 'defined' && !isMixed && definedBreakup.length > 0 && (
                  <div
                    className="flex items-center justify-between mt-3 p-3 rounded-lg"
                    style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                  >
                    <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                      {definedBreakup.length} billing group{definedBreakup.length !== 1 ? 's' : ''} as per block cycles
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>{/* end left column */}

        {/* ═══ RIGHT COLUMN: Acceptance Flow Panel ═══ */}
        {!rfqMode && (
          <div className="lg:sticky lg:top-6 self-start">
            {renderAcceptancePanel()}
          </div>
        )}

        </div>{/* end grid */}
      </div>

    </div>
  );
};

export default ReviewSendStep;

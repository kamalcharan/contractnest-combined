// src/pages/catalog-studio/components/TemplatePreviewModal.tsx
import React, { useState } from 'react';
import {
  X,
  Star,
  Users,
  Clock,
  CheckCircle,
  FileText,
  Tag,
  Building2,
  Copy,
  Download,
  Eye,
  Layers,
  Calendar,
  TrendingUp,
  Shield,
  Heart,
  Activity,
  Accessibility,
  Home,
  UserCheck,
  Wrench,
  IndianRupee,
  AlertCircle,
  Thermometer,
  Zap,
  Factory,
  Wind,
  Pill,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

// Industry icon mapping
const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'wellness': Heart,
  'healthcare-equipment': Activity,
  'mobility-aids': Accessibility,
  'home-healthcare': Home,
  'rehabilitation': UserCheck,
  'senior-care': Users,
  'maintenance': Wrench,
  'preventive-care': Shield,
  'hvac': Thermometer,
  'electrical': Zap,
  'manufacturing': Factory,
  'pharma': Pill,
  'industrial': Wind,
};

// Currency configuration
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

const CURRENCY_RATES: Record<CurrencyCode, { rate: number; symbol: string; name: string }> = {
  INR: { rate: 1, symbol: '₹', name: 'Indian Rupee' },
  USD: { rate: 0.012, symbol: '$', name: 'US Dollar' },
  EUR: { rate: 0.011, symbol: '€', name: 'Euro' },
  GBP: { rate: 0.0095, symbol: '£', name: 'British Pound' },
  AED: { rate: 0.044, symbol: 'AED', name: 'UAE Dirham' },
  SGD: { rate: 0.016, symbol: 'S$', name: 'Singapore Dollar' },
};

const formatCurrency = (amountInINR: number, targetCurrency: CurrencyCode): string => {
  const { rate, symbol } = CURRENCY_RATES[targetCurrency];
  const convertedAmount = amountInINR * rate;
  return `${symbol}${convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export interface GlobalTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  industryLabel: string;
  industryIcon: string;
  category: string;
  categoryLabel: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: string;
  blocksCount: number;
  blocks: {
    id: string;
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  tags: string[];
  usageCount: number;
  rating: number;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
  // Pricing fields
  pricing: {
    baseAmount: number;
    currency: 'INR';
    billingFrequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'per-session' | 'per-visit';
    paymentType: 'prepaid' | 'postpaid';
    depositRequired: boolean;
    depositAmount?: number;
    taxRate: number;
  };
  // Service details
  serviceDetails: {
    serviceType: 'limited' | 'unlimited';
    usageLimit?: number;
    usagePeriod?: string;
    validityPeriod: string;
    includes: string[];
    excludes: string[];
  };
  // Terms
  termsAndConditions: string[];
  cancellationPolicy: string;
}

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: GlobalTemplate | null;
  onCopyToMyTemplates: (template: GlobalTemplate) => void;
  onExportPDF: (template: GlobalTemplate) => void;
  isCopying?: boolean;
  selectedCurrency?: CurrencyCode;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  onCopyToMyTemplates,
  onExportPDF,
  isCopying = false,
  selectedCurrency = 'INR',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'blocks' | 'terms'>('overview');

  if (!isOpen || !template) return null;

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return { bg: colors.semantic.success + '15', text: colors.semantic.success };
      case 'medium':
        return { bg: colors.semantic.warning + '15', text: colors.semantic.warning };
      case 'complex':
        return { bg: colors.semantic.error + '15', text: colors.semantic.error };
      default:
        return { bg: colors.utility.secondaryText + '15', text: colors.utility.secondaryText };
    }
  };

  const complexityColors = getComplexityColor(template.complexity);

  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className="h-4 w-4"
          style={{
            fill: i < fullStars ? colors.semantic.warning : 'transparent',
            color: i < fullStars ? colors.semantic.warning : colors.utility.secondaryText + '50',
          }}
        />
      );
    }
    return stars;
  };

  const getBillingLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'monthly': 'Per Month',
      'quarterly': 'Per Quarter',
      'yearly': 'Per Year',
      'one-time': 'One Time',
      'per-session': 'Per Session',
      'per-visit': 'Per Visit',
    };
    return labels[frequency] || frequency;
  };

  const IndustryIcon = INDUSTRY_ICONS[template.industry] || Building2;

  // Calculate total with tax
  const totalWithTax = template.pricing.baseAmount * (1 + template.pricing.taxRate / 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-5xl rounded-xl border shadow-2xl animate-in zoom-in-95"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: colors.utility.secondaryText + '20' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + '15' }}
              >
                <IndustryIcon className="w-6 h-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                    {template.name}
                  </h2>
                  {template.isPopular && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1"
                      style={{ backgroundColor: colors.semantic.warning + '15', color: colors.semantic.warning }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {template.industryLabel} • {template.categoryLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Price Badge */}
              <div
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.semantic.success + '10' }}
              >
                <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {getBillingLabel(template.pricing.billingFrequency)}
                </div>
                <div className="text-xl font-bold" style={{ color: colors.semantic.success }}>
                  {formatCurrency(template.pricing.baseAmount, selectedCurrency)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="px-6 border-b flex gap-4"
            style={{ borderColor: colors.utility.secondaryText + '20' }}
          >
            {(['overview', 'blocks', 'terms'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-3 px-2 text-sm font-medium transition-colors border-b-2"
                style={{
                  borderColor: activeTab === tab ? colors.brand.primary : 'transparent',
                  color: activeTab === tab ? colors.brand.primary : colors.utility.secondaryText,
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'blocks' && `Blocks (${template.blocksCount})`}
                {tab === 'terms' && 'Terms & Conditions'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="grid grid-cols-3 gap-0 max-h-[60vh] overflow-hidden">
            {/* Main Content - 2 columns */}
            <div className="col-span-2 p-6 border-r overflow-y-auto" style={{ borderColor: colors.utility.secondaryText + '20', maxHeight: '60vh' }}>
              {activeTab === 'overview' && (
                <>
                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                      Description
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      {template.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: colors.brand.primary + '10',
                            color: colors.brand.primary,
                          }}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                      Service Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: colors.utility.primaryBackground }}
                      >
                        <div className="text-xs mb-1" style={{ color: colors.utility.secondaryText }}>
                          Service Type
                        </div>
                        <div className="text-sm font-medium capitalize" style={{ color: colors.utility.primaryText }}>
                          {template.serviceDetails.serviceType}
                          {template.serviceDetails.serviceType === 'limited' && template.serviceDetails.usageLimit && (
                            <span className="ml-1 text-xs" style={{ color: colors.utility.secondaryText }}>
                              ({template.serviceDetails.usageLimit} {template.serviceDetails.usagePeriod || 'visits'})
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: colors.utility.primaryBackground }}
                      >
                        <div className="text-xs mb-1" style={{ color: colors.utility.secondaryText }}>
                          Validity Period
                        </div>
                        <div className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                          {template.serviceDetails.validityPeriod}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What's Included */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                      What's Included
                    </h3>
                    <div className="space-y-2">
                      {template.serviceDetails.includes.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.success }} />
                          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What's Excluded */}
                  {template.serviceDetails.excludes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                        Not Included
                      </h3>
                      <div className="space-y-2">
                        {template.serviceDetails.excludes.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.error }} />
                            <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'blocks' && (
                <div>
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
                    {template.blocks.map((block, index) => (
                      <div
                        key={block.id}
                        onClick={() => setSelectedBlockIndex(index)}
                        className="p-3 rounded-lg border cursor-pointer transition-all"
                        style={{
                          borderColor: selectedBlockIndex === index
                            ? colors.brand.primary
                            : colors.utility.secondaryText + '20',
                          backgroundColor: selectedBlockIndex === index
                            ? colors.brand.primary + '05'
                            : 'transparent',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: colors.brand.primary + '10' }}
                            >
                              <Layers className="w-4 h-4" style={{ color: colors.brand.primary }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                                  {block.name}
                                </span>
                                {block.required && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: colors.semantic.error + '15', color: colors.semantic.error }}
                                  >
                                    Required
                                  </span>
                                )}
                              </div>
                              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                                {block.type}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedBlockIndex === index && (
                          <p className="text-xs mt-2 pl-11" style={{ color: colors.utility.secondaryText }}>
                            {block.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'terms' && (
                <>
                  {/* Terms and Conditions */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                      Terms and Conditions
                    </h3>
                    <div className="space-y-2">
                      {template.termsAndConditions.map((term, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: colors.brand.primary + '15' }}
                          >
                            <span className="text-[10px] font-medium" style={{ color: colors.brand.primary }}>
                              {index + 1}
                            </span>
                          </div>
                          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                            {term}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cancellation Policy */}
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: colors.semantic.warning + '10' }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                      <div>
                        <h4 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                          Cancellation Policy
                        </h4>
                        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                          {template.cancellationPolicy}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar - 1 column */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {/* Pricing Summary */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                  Pricing Summary
                </h3>
                <div
                  className="p-4 rounded-lg space-y-3"
                  style={{ backgroundColor: colors.utility.primaryBackground }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Base Amount
                    </span>
                    <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                      {formatCurrency(template.pricing.baseAmount, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      GST ({template.pricing.taxRate}%)
                    </span>
                    <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                      {formatCurrency(template.pricing.baseAmount * template.pricing.taxRate / 100, selectedCurrency)}
                    </span>
                  </div>
                  <div
                    className="pt-3 border-t flex items-center justify-between"
                    style={{ borderColor: colors.utility.secondaryText + '20' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                      Total
                    </span>
                    <span className="text-lg font-bold" style={{ color: colors.semantic.success }}>
                      {formatCurrency(totalWithTax, selectedCurrency)}
                    </span>
                  </div>
                  <div className="text-xs text-center" style={{ color: colors.utility.secondaryText }}>
                    {getBillingLabel(template.pricing.billingFrequency)} • {template.pricing.paymentType === 'prepaid' ? 'Prepaid' : 'Postpaid'}
                  </div>
                  {template.pricing.depositRequired && template.pricing.depositAmount && (
                    <div
                      className="pt-2 border-t text-center"
                      style={{ borderColor: colors.utility.secondaryText + '20' }}
                    >
                      <span className="text-xs" style={{ color: colors.semantic.warning }}>
                        Security Deposit: {formatCurrency(template.pricing.depositAmount, selectedCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Complexity
                    </span>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full capitalize"
                      style={{ backgroundColor: complexityColors.bg, color: complexityColors.text }}
                    >
                      {template.complexity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Duration
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                      <Clock className="w-3.5 h-3.5" />
                      {template.estimatedDuration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Blocks
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                      <Layers className="w-3.5 h-3.5" />
                      {template.blocksCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Used
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                      <Users className="w-3.5 h-3.5" />
                      {template.usageCount} times
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Rating
                    </span>
                    <div className="flex items-center gap-1">
                      {renderRating(template.rating)}
                      <span className="text-sm font-medium ml-1" style={{ color: colors.utility.primaryText }}>
                        {template.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Updated Date */}
              <div
                className="mb-6 p-3 rounded-lg"
                style={{ backgroundColor: colors.utility.primaryBackground }}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: colors.utility.secondaryText }}>
                  <Calendar className="w-3.5 h-3.5" />
                  Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => onCopyToMyTemplates(template)}
                  disabled={isCopying}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                >
                  {isCopying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to My Templates
                    </>
                  )}
                </button>
                <button
                  onClick={() => onExportPDF(template)}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.primaryText,
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as PDF
                </button>
                <button
                  onClick={() => onExportPDF(template)}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.primaryText,
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Preview PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;

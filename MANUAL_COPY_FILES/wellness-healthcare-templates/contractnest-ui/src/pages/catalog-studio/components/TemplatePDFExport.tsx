// src/pages/catalog-studio/components/TemplatePDFExport.tsx
import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Loader2,
  Clock,
  Layers,
  Users,
  Star,
  Tag,
  CheckCircle,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { GlobalTemplate } from './TemplatePreviewModal';

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

interface TemplatePDFExportProps {
  isOpen: boolean;
  onClose: () => void;
  template: GlobalTemplate | null;
  mode: 'preview' | 'export';
  selectedCurrency?: CurrencyCode;
}

const TemplatePDFExport: React.FC<TemplatePDFExportProps> = ({
  isOpen,
  onClose,
  template,
  mode,
  selectedCurrency = 'INR',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [zoom, setZoom] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !template) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const totalWithTax = template.pricing.baseAmount * (1 + template.pricing.taxRate / 100);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create a comprehensive PDF-like content for download
      const content = `
═══════════════════════════════════════════════════════════════
CONTRACT TEMPLATE: ${template.name}
═══════════════════════════════════════════════════════════════

TEMPLATE INFORMATION
─────────────────────────────────────────────────────────────────
Template ID: ${template.id}
Industry: ${template.industryLabel}
Category: ${template.categoryLabel}
Complexity: ${template.complexity.toUpperCase()}
Duration: ${template.estimatedDuration}
Rating: ${template.rating}/5 (${template.usageCount} uses)

─────────────────────────────────────────────────────────────────
DESCRIPTION
─────────────────────────────────────────────────────────────────
${template.description}

─────────────────────────────────────────────────────────────────
PRICING DETAILS
─────────────────────────────────────────────────────────────────
Base Amount: ${formatCurrency(template.pricing.baseAmount, selectedCurrency)}
GST (${template.pricing.taxRate}%): ${formatCurrency(template.pricing.baseAmount * template.pricing.taxRate / 100, selectedCurrency)}
Total Amount: ${formatCurrency(totalWithTax, selectedCurrency)}
Billing: ${getBillingLabel(template.pricing.billingFrequency)}
Payment Type: ${template.pricing.paymentType === 'prepaid' ? 'Prepaid' : 'Postpaid'}
${template.pricing.depositRequired && template.pricing.depositAmount ? `Security Deposit: ${formatCurrency(template.pricing.depositAmount, selectedCurrency)}` : ''}

─────────────────────────────────────────────────────────────────
SERVICE DETAILS
─────────────────────────────────────────────────────────────────
Service Type: ${template.serviceDetails.serviceType.toUpperCase()}${template.serviceDetails.serviceType === 'limited' && template.serviceDetails.usageLimit ? ` (${template.serviceDetails.usageLimit} ${template.serviceDetails.usagePeriod || 'visits'})` : ''}
Validity: ${template.serviceDetails.validityPeriod}

What's Included:
${template.serviceDetails.includes.map((item) => `  ✓ ${item}`).join('\n')}

${template.serviceDetails.excludes.length > 0 ? `Not Included:\n${template.serviceDetails.excludes.map((item) => `  ✗ ${item}`).join('\n')}` : ''}

─────────────────────────────────────────────────────────────────
TAGS
─────────────────────────────────────────────────────────────────
${template.tags.join(' | ')}

─────────────────────────────────────────────────────────────────
TEMPLATE BLOCKS (${template.blocksCount})
─────────────────────────────────────────────────────────────────
${template.blocks.map((b, i) => `
${i + 1}. ${b.name} [${b.type}]${b.required ? ' *REQUIRED*' : ''}
   ${b.description}`).join('\n')}

─────────────────────────────────────────────────────────────────
TERMS AND CONDITIONS
─────────────────────────────────────────────────────────────────
${template.termsAndConditions.map((term, i) => `${i + 1}. ${term}`).join('\n')}

─────────────────────────────────────────────────────────────────
CANCELLATION POLICY
─────────────────────────────────────────────────────────────────
${template.cancellationPolicy}

═══════════════════════════════════════════════════════════════
Generated on: ${new Date().toLocaleString()}
ContractNest • Catalog Studio
═══════════════════════════════════════════════════════════════
      `;

      // Create and download blob
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (mode === 'export') {
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'complex': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)' }}
        onClick={onClose}
      />

      {/* Header */}
      <div
        className="relative z-10 px-4 py-3 flex items-center justify-between border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              {mode === 'preview' ? 'PDF Preview' : 'Export PDF'}
            </h2>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {template.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-1.5 rounded transition-colors disabled:opacity-50"
              style={{ color: colors.utility.secondaryText }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-14 text-center text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 rounded transition-colors disabled:opacity-50"
              style={{ color: colors.utility.secondaryText }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg border transition-colors"
            style={{
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
            title="Print"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Preview Content */}
      <div className="relative z-10 flex-1 overflow-auto p-8 flex justify-center">
        <div
          ref={contentRef}
          className="bg-white shadow-2xl transition-transform"
          style={{
            width: '210mm',
            minHeight: '297mm',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {/* PDF Content */}
          <div className="p-12 print:p-8">
            {/* Header */}
            <div className="border-b-2 pb-6 mb-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h1>
                  <p className="text-lg text-gray-600">{template.industryLabel} • {template.categoryLabel}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Template ID</div>
                  <div className="text-sm font-mono text-gray-700">{template.id}</div>
                </div>
              </div>
            </div>

            {/* Pricing Banner */}
            <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: '#F0FDF4' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Amount ({getBillingLabel(template.pricing.billingFrequency)})</div>
                  <div className="text-4xl font-bold text-green-600">
                    {formatCurrency(totalWithTax, selectedCurrency)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Base: {formatCurrency(template.pricing.baseAmount, selectedCurrency)} + GST {template.pricing.taxRate}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {template.pricing.paymentType === 'prepaid' ? 'Prepaid' : 'Postpaid'}
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium capitalize"
                      style={{
                        backgroundColor: getComplexityColor(template.complexity) + '20',
                        color: getComplexityColor(template.complexity),
                      }}
                    >
                      {template.complexity}
                    </span>
                  </div>
                  {template.pricing.depositRequired && template.pricing.depositAmount && (
                    <div className="text-sm text-amber-600 mt-2">
                      Security Deposit: {formatCurrency(template.pricing.depositAmount, selectedCurrency)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.estimatedDuration}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Layers className="w-4 h-4" />
                  Blocks
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.blocksCount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Usage
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.usageCount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Star className="w-4 h-4" />
                  Rating
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.rating.toFixed(1)}/5</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{template.description}</p>
            </div>

            {/* Service Details */}
            <div className="mb-8 grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">What's Included</h2>
                <div className="space-y-2">
                  {template.serviceDetails.includes.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              {template.serviceDetails.excludes.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Not Included</h2>
                  <div className="space-y-2">
                    {template.serviceDetails.excludes.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Service Type Info */}
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-gray-600">Service Type:</span>
                  <span className="ml-2 font-semibold text-gray-900 capitalize">
                    {template.serviceDetails.serviceType}
                    {template.serviceDetails.serviceType === 'limited' && template.serviceDetails.usageLimit && (
                      <span className="text-blue-600"> ({template.serviceDetails.usageLimit} {template.serviceDetails.usagePeriod || 'visits'})</span>
                    )}
                  </span>
                </div>
                <div className="border-l pl-4" style={{ borderColor: '#BFDBFE' }}>
                  <span className="text-sm text-gray-600">Validity:</span>
                  <span className="ml-2 font-semibold text-gray-900">{template.serviceDetails.validityPeriod}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Blocks */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Blocks</h2>
              <div className="space-y-3">
                {template.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-700">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{block.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {block.type}
                          </span>
                          {block.required && (
                            <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{block.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Terms and Conditions</h2>
              <div className="space-y-2">
                {template.termsAndConditions.map((term, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                    </div>
                    <span className="text-gray-700">{term}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="mb-8 p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Cancellation Policy</h3>
                  <p className="text-gray-700">{template.cancellationPolicy}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 mt-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>Generated on: {new Date().toLocaleDateString()}</div>
                <div>ContractNest • Catalog Studio</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePDFExport;

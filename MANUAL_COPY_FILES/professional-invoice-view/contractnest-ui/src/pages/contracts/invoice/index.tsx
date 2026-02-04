// src/pages/contracts/invoice/index.tsx
// Professional Invoice View — printable, downloadable, shareable document layout

import React, { useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useContract } from '@/hooks/queries/useContractQueries';
import { useContractInvoices } from '@/hooks/queries/useInvoiceQueries';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import RecordPaymentDialog from '@/components/contracts/RecordPaymentDialog';
import { useGatewayStatus } from '@/hooks/useGatewayStatus';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ArrowLeft,
  Send,
  Download,
  Printer,
  CreditCard,
  FileText,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Wallet,
} from 'lucide-react';
import type { Invoice } from '@/types/contracts';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const formatCurrency = (value?: number, currency?: string) => {
  if (!value && value !== 0) return '\u2014';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (d?: string) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'paid':
      return { color: '#10B981', bg: '#10B98118', label: 'Paid', icon: CheckCircle2 };
    case 'partially_paid':
      return { color: '#F59E0B', bg: '#F59E0B18', label: 'Partially Paid', icon: Clock };
    case 'overdue':
      return { color: '#EF4444', bg: '#EF444418', label: 'Overdue', icon: AlertTriangle };
    default:
      return { color: '#6B7280', bg: '#6B728018', label: 'Unpaid', icon: FileText };
  }
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

const InvoiceViewPage: React.FC = () => {
  const { id: contractId, invoiceId } = useParams<{ id: string; invoiceId: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // ─── Data Fetching ───
  const { data: contract, isLoading: contractLoading, error: contractError } = useContract(contractId || null);
  const { data: invoiceData, isLoading: invoicesLoading } = useContractInvoices(contractId, { enabled: !!contractId });
  const { profile: tenantProfile, loading: profileLoading } = useTenantProfile();
  const { hasActiveGateway } = useGatewayStatus();

  const isLoading = contractLoading || invoicesLoading || profileLoading;
  const invoice = invoiceData?.invoices?.find((inv: Invoice) => inv.id === invoiceId);

  // ─── Derived Data ───
  const currency = invoice?.currency || contract?.currency || 'INR';
  const blocks = contract?.blocks || [];

  // Build seller address string
  const buildAddress = useCallback(() => {
    if (!tenantProfile) return '';
    const parts = [
      tenantProfile.address_line1,
      tenantProfile.address_line2,
      tenantProfile.city,
      tenantProfile.state_code,
      tenantProfile.postal_code,
      tenantProfile.country_code,
    ].filter(Boolean);
    return parts.join(', ');
  }, [tenantProfile]);

  // ─── PDF Download ───
  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || !invoice) return;

    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content exceeds A4 page height (297mm), add pages
      const pageHeight = 297;
      let yOffset = 0;

      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        while (yOffset < pdfHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight);
          yOffset += pageHeight;
        }
      }

      pdf.save(`${invoice.invoice_number}.pdf`);
      addToast({ type: 'success', title: 'PDF Downloaded', message: `${invoice.invoice_number}.pdf has been saved.` });
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast({ type: 'error', title: 'PDF Failed', message: 'Could not generate PDF. Please try again.' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ─── Print ───
  const handlePrint = () => {
    window.print();
  };

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <VaNiLoader size="md" message="Loading Invoice..." showSkeleton skeletonVariant="card" skeletonCount={3} />
      </div>
    );
  }

  // ─── Error / Not Found ───
  if (contractError || !contract || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12" style={{ color: colors.semantic.error }} />
        <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          {!invoice ? 'Invoice not found' : 'Failed to load invoice'}
        </h2>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          The invoice you are looking for does not exist or could not be loaded.
        </p>
        <button
          onClick={() => navigate(`/contracts/${contractId}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Contract
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const balance = invoice.total_amount - (invoice.amount_paid || 0);
  const grandTotal = contract.grand_total || ((contract.total_value || 0) + (contract.tax_total || 0));

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.utility.mainBackground }}>
      {/* ═══════ Print-specific CSS ═══════ */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-printable, #invoice-printable * { visibility: visible; }
          #invoice-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ═══════ HEADER BAR ═══════ */}
      <header
        className="no-print sticky top-0 z-30 border-b"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
      >
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/contracts/${contractId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.utility.mainBackground,
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.secondaryText,
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                Invoice {invoice.invoice_number}
              </h1>
              <div className="flex items-center gap-2 text-xs" style={{ color: colors.utility.secondaryText }}>
                <span>{contract.title}</span>
                <span>&middot;</span>
                <span>{contract.contract_number}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </span>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN: Invoice Document + Action Sidebar ═══════ */}
      <div className="px-6 py-6">
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 280px' }}>

          {/* ═══════ LEFT: Invoice Document ═══════ */}
          <div
            id="invoice-printable"
            ref={invoiceRef}
            className="rounded-xl shadow-lg overflow-hidden"
            style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
          >
            {/* Top accent bar */}
            <div
              className="h-1.5"
              style={{ background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary}80)` }}
            />

            <div className="p-8">
              {/* ─── Header: Company Info + Invoice Meta ─── */}
              <div className="flex justify-between items-start mb-8">
                {/* Seller / Company Info */}
                <div>
                  {tenantProfile?.logo_url ? (
                    <img
                      src={tenantProfile.logo_url}
                      alt={tenantProfile.business_name || 'Company'}
                      className="h-12 mb-3 object-contain"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-8 w-8" style={{ color: colors.brand.primary }} />
                      <span className="text-xl font-bold" style={{ color: colors.brand.primary }}>
                        {tenantProfile?.business_name || 'Company'}
                      </span>
                    </div>
                  )}
                  {tenantProfile?.logo_url && (
                    <div className="text-base font-bold mb-1" style={{ color: '#111827' }}>
                      {tenantProfile.business_name}
                    </div>
                  )}
                  {buildAddress() && (
                    <div className="text-sm text-gray-500 max-w-xs leading-relaxed">
                      {buildAddress()}
                    </div>
                  )}
                  {tenantProfile?.business_phone && (
                    <div className="text-sm text-gray-500 mt-1">
                      {tenantProfile.business_phone_country_code} {tenantProfile.business_phone}
                    </div>
                  )}
                  {tenantProfile?.business_email && (
                    <div className="text-sm text-gray-500">
                      {tenantProfile.business_email}
                    </div>
                  )}
                </div>

                {/* Invoice Number + Dates */}
                <div className="text-right">
                  <h2
                    className="text-2xl font-extrabold tracking-tight mb-4"
                    style={{ color: colors.brand.primary }}
                  >
                    INVOICE
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-end gap-4 text-sm">
                      <span className="text-gray-400 min-w-[80px] text-right">Invoice #</span>
                      <span className="font-semibold text-gray-800 min-w-[120px] text-right">
                        {invoice.invoice_number}
                      </span>
                    </div>
                    <div className="flex justify-end gap-4 text-sm">
                      <span className="text-gray-400 min-w-[80px] text-right">Date Issued</span>
                      <span className="font-semibold text-gray-800 min-w-[120px] text-right">
                        {formatDate(invoice.issued_at)}
                      </span>
                    </div>
                    <div className="flex justify-end gap-4 text-sm">
                      <span className="text-gray-400 min-w-[80px] text-right">Due Date</span>
                      <span
                        className="font-semibold min-w-[120px] text-right"
                        style={{ color: invoice.status === 'overdue' ? '#EF4444' : '#1f2937' }}
                      >
                        {formatDate(invoice.due_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Divider ─── */}
              <hr className="border-gray-200 mb-8" />

              {/* ─── Invoice To / Bill To ─── */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Invoice To (Buyer) */}
                <div>
                  <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-3">
                    Invoice To
                  </h3>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-800">
                      {contract.buyer_name || '\u2014'}
                    </div>
                    {contract.buyer_company && (
                      <div className="text-sm text-gray-600">{contract.buyer_company}</div>
                    )}
                    {contract.buyer_email && (
                      <div className="text-sm text-gray-500">{contract.buyer_email}</div>
                    )}
                    {contract.buyer_phone && (
                      <div className="text-sm text-gray-500">{contract.buyer_phone}</div>
                    )}
                  </div>
                </div>

                {/* Bill To (Payment Info) */}
                <div>
                  <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-3">
                    Bill To
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Due</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(balance > 0 ? balance : invoice.total_amount, currency)}
                      </span>
                    </div>
                    {contract.payment_mode && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Payment Mode</span>
                        <span className="font-medium text-gray-700">
                          {contract.payment_mode === 'emi'
                            ? `EMI (${contract.emi_months || 0} months)`
                            : contract.payment_mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>
                    )}
                    {invoice.emi_sequence && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Installment</span>
                        <span className="font-medium text-gray-700">
                          {invoice.emi_sequence} of {invoice.emi_total}
                        </span>
                      </div>
                    )}
                    {invoice.billing_cycle && !invoice.emi_sequence && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Billing Cycle</span>
                        <span className="font-medium text-gray-700 capitalize">
                          {invoice.billing_cycle}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Line Items Table ─── */}
              <div className="mb-8 rounded-lg overflow-hidden border border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: colors.brand.primary + '0D' }}>
                      <th
                        className="text-left py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{ color: colors.brand.primary }}
                      >
                        #
                      </th>
                      <th
                        className="text-left py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{ color: colors.brand.primary }}
                      >
                        Item
                      </th>
                      <th
                        className="text-left py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{ color: colors.brand.primary }}
                      >
                        Description
                      </th>
                      <th
                        className="text-right py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{ color: colors.brand.primary }}
                      >
                        Rate
                      </th>
                      <th
                        className="text-right py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{ color: colors.brand.primary }}
                      >
                        Qty
                      </th>
                      <th
                        className="text-right py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{ color: colors.brand.primary }}
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.length > 0 ? (
                      blocks.map((block, index) => (
                        <tr key={block.id} className="border-t border-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-400">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold text-gray-800">
                              {block.block_name}
                            </div>
                            {block.category_name && (
                              <div className="text-[0.65rem] text-gray-400 mt-0.5">
                                {block.category_name}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 max-w-[200px]">
                            {block.block_description || '\u2014'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 text-right font-medium">
                            {formatCurrency(block.unit_price, currency)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 text-right">
                            {block.quantity || 1}
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-800 text-right">
                            {formatCurrency(
                              block.total_price || (block.unit_price || 0) * (block.quantity || 1),
                              currency,
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                          No line items available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ─── Financial Summary ─── */}
              <div className="flex justify-end mb-8">
                <div className="w-80">
                  {/* Subtotal */}
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(invoice.amount || contract.total_value, currency)}
                    </span>
                  </div>

                  {/* Tax Breakdown */}
                  {contract.tax_breakdown && contract.tax_breakdown.length > 0 ? (
                    contract.tax_breakdown.map((tax, i) => (
                      <div key={i} className="flex justify-between py-1.5 text-sm">
                        <span className="text-gray-500">
                          {tax.name} ({tax.rate}%)
                        </span>
                        <span className="font-medium text-gray-700">
                          {formatCurrency(tax.amount, currency)}
                        </span>
                      </div>
                    ))
                  ) : (invoice.tax_amount || 0) > 0 ? (
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(invoice.tax_amount, currency)}
                      </span>
                    </div>
                  ) : null}

                  {/* Divider */}
                  <div className="my-2 border-t-2 border-gray-300" />

                  {/* Grand Total */}
                  <div className="flex justify-between py-2">
                    <span className="text-base font-bold text-gray-800">Grand Total</span>
                    <span className="text-lg font-extrabold" style={{ color: colors.brand.primary }}>
                      {formatCurrency(invoice.total_amount, currency)}
                    </span>
                  </div>

                  {/* Amount Paid & Balance (if partially/fully paid) */}
                  {(invoice.amount_paid || 0) > 0 && (
                    <>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className="text-green-600 font-medium">Amount Paid</span>
                        <span className="font-semibold text-green-600">
                          - {formatCurrency(invoice.amount_paid, currency)}
                        </span>
                      </div>
                      <div className="my-1 border-t border-gray-200" />
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-bold text-gray-800">Balance Due</span>
                        <span
                          className="text-base font-extrabold"
                          style={{ color: balance > 0 ? '#F59E0B' : '#10B981' }}
                        >
                          {formatCurrency(balance, currency)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ─── Notes ─── */}
              {(invoice.notes || contract.notes) && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Note
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {invoice.notes || contract.notes}
                  </p>
                </div>
              )}

              {/* ─── Generated notice ─── */}
              <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                <p className="text-[0.6rem] text-gray-300">
                  This is a computer-generated invoice. No signature required.
                </p>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div className="h-1" style={{ backgroundColor: colors.brand.primary + '30' }} />
          </div>

          {/* ═══════ RIGHT: Action Sidebar ═══════ */}
          <div className="no-print space-y-4">
            {/* Action Buttons Card */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '15',
              }}
            >
              <div className="p-4 space-y-2.5">
                {/* Download PDF */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  {isGeneratingPdf ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" /> Download PDF
                    </>
                  )}
                </button>

                {/* Print */}
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all hover:opacity-80"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    color: colors.utility.primaryText,
                    backgroundColor: 'transparent',
                  }}
                >
                  <Printer className="h-4 w-4" /> Print
                </button>

                {/* Send Invoice */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all hover:opacity-80"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    color: colors.utility.primaryText,
                    backgroundColor: 'transparent',
                  }}
                >
                  <Send className="h-4 w-4" /> Send Invoice
                </button>

                {/* Add Payment — only if not fully paid */}
                {invoice.status !== 'paid' && balance > 0 && (
                  <button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 text-white"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    {hasActiveGateway ? (
                      <>
                        <CreditCard className="h-4 w-4" /> Add Payment
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" /> Record Payment
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Payment Summary Card */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '15',
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: colors.utility.primaryText + '10' }}
              >
                <h3
                  className="text-[0.65rem] font-bold uppercase tracking-wider"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Payment Summary
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: colors.utility.secondaryText }}>Invoice Total</span>
                  <span className="font-bold" style={{ color: colors.utility.primaryText }}>
                    {formatCurrency(invoice.total_amount, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: colors.utility.secondaryText }}>Amount Paid</span>
                  <span className="font-semibold" style={{ color: '#10B981' }}>
                    {formatCurrency(invoice.amount_paid || 0, currency)}
                  </span>
                </div>
                <hr style={{ borderColor: colors.utility.primaryText + '10' }} />
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                    Balance Due
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: balance > 0 ? '#F59E0B' : '#10B981' }}
                  >
                    {formatCurrency(balance, currency)}
                  </span>
                </div>

                {/* Status badge */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg mt-1"
                  style={{ backgroundColor: statusConfig.bg }}
                >
                  <StatusIcon className="h-4 w-4" style={{ color: statusConfig.color }} />
                  <span className="text-sm font-semibold" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Details Card */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '15',
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: colors.utility.primaryText + '10' }}
              >
                <h3
                  className="text-[0.65rem] font-bold uppercase tracking-wider"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Invoice Details
                </h3>
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  {
                    label: 'Type',
                    value: (invoice.invoice_type || '\u2014').replace(/\b\w/g, (c) =>
                      c.toUpperCase(),
                    ),
                  },
                  { label: 'Date Issued', value: formatDate(invoice.issued_at) },
                  { label: 'Due Date', value: formatDate(invoice.due_date) },
                  ...(invoice.paid_at
                    ? [{ label: 'Paid On', value: formatDate(invoice.paid_at) }]
                    : []),
                  ...(invoice.payment_mode
                    ? [
                        {
                          label: 'Payment Mode',
                          value: invoice.payment_mode
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase()),
                        },
                      ]
                    : []),
                  ...(invoice.emi_sequence
                    ? [
                        {
                          label: 'Installment',
                          value: `${invoice.emi_sequence} of ${invoice.emi_total}`,
                        },
                      ]
                    : []),
                  ...(invoice.receipts_count
                    ? [{ label: 'Receipts', value: `${invoice.receipts_count}` }]
                    : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span style={{ color: colors.utility.secondaryText }}>{label}</span>
                    <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Record Payment Dialog ═══════ */}
      <RecordPaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        contractId={contract.id}
        hasActiveGateway={hasActiveGateway}
        grandTotal={grandTotal}
        currency={contract.currency}
        paymentMode={contract.payment_mode}
        emiMonths={contract.emi_months}
        onSuccess={() => {
          setIsPaymentDialogOpen(false);
          addToast({
            type: 'success',
            title: 'Payment Recorded',
            message: 'The payment has been recorded successfully.',
          });
        }}
      />
    </div>
  );
};

export default InvoiceViewPage;

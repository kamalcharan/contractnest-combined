// src/components/playground/SuccessModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Download,
  ArrowRight,
  RotateCcw,
  Sparkles,
  FileText,
  X,
} from 'lucide-react';
import { ContractData, RFPData, VendorQuote, PersonaType } from './types';

interface SuccessModalProps {
  persona: PersonaType;
  contractData?: ContractData;
  rfpData?: RFPData;
  selectedVendor?: VendorQuote;
  onRestart: () => void;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  persona,
  contractData,
  rfpData,
  selectedVendor,
  onRestart,
  onClose,
}) => {
  const navigate = useNavigate();

  const generateContractHTML = () => {
    if (!contractData) return '';

    const serviceBlocks = contractData.blocks.filter((b) => b.categoryId === 'service');
    const spareBlocks = contractData.blocks.filter((b) => b.categoryId === 'spare');
    const billingBlocks = contractData.blocks.filter((b) => b.categoryId === 'billing');
    const textBlocks = contractData.blocks.filter((b) => b.categoryId === 'text');

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Contract - ${contractData.customerName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #334155;
      line-height: 1.6;
      padding: 2rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      padding: 2rem;
    }
    .header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .header p { opacity: 0.9; }
    .content { padding: 2rem; }
    .section { margin-bottom: 2rem; }
    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
    }
    .block-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .block-item:last-child { border-bottom: none; }
    .block-name { font-weight: 500; color: #1e293b; }
    .block-price { font-weight: 600; color: #4f46e5; }
    .total-section {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-label { font-weight: 600; color: #1e293b; }
    .total-value { font-size: 1.5rem; font-weight: 700; color: #4f46e5; }
    .terms-content {
      font-size: 0.875rem;
      color: #64748b;
      white-space: pre-line;
    }
    .footer {
      background: #f8fafc;
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(255,255,255,0.2);
      border-radius: 20px;
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Service Contract</h1>
      <p>For: ${contractData.customerName}</p>
      <span class="badge">Equipment AMC</span>
    </div>

    <div class="content">
      ${serviceBlocks.length > 0 ? `
        <div class="section">
          <div class="section-title">Services (${serviceBlocks.length})</div>
          ${serviceBlocks.map(block => `
            <div class="block-item">
              <span class="block-name">${block.name}</span>
              <span class="block-price">${block.price ? formatCurrency(block.price) : '-'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${spareBlocks.length > 0 ? `
        <div class="section">
          <div class="section-title">Spare Parts (${spareBlocks.length})</div>
          ${spareBlocks.map(block => `
            <div class="block-item">
              <span class="block-name">${block.name}</span>
              <span class="block-price">${block.price ? formatCurrency(block.price) : '-'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${billingBlocks.length > 0 ? `
        <div class="section">
          <div class="section-title">Payment Terms</div>
          ${billingBlocks.map(block => `
            <div class="block-item">
              <span class="block-name">${block.name}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${textBlocks.length > 0 ? `
        <div class="section">
          <div class="section-title">Terms & Conditions</div>
          ${textBlocks.map(block => `
            <div class="terms-content">${block.meta?.content || block.name}</div>
          `).join('')}
        </div>
      ` : ''}

      <div class="total-section">
        <span class="total-label">Total Contract Value</span>
        <span class="total-value">${formatCurrency(contractData.totalValue)}</span>
      </div>
    </div>

    <div class="footer">
      Generated via ContractNest Playground Demo<br>
      ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>
</body>
</html>
    `;
  };

  const downloadContract = () => {
    const html = generateContractHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${contractData?.customerName?.replace(/\s+/g, '-').toLowerCase() || 'demo'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        {/* Success Icon */}
        <div className={`p-8 text-center ${persona === 'seller' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {persona === 'seller' ? 'Contract Sent!' : 'Vendor Accepted!'}
          </h2>
          <p className="text-white/80">
            {persona === 'seller'
              ? `Your contract has been sent to ${contractData?.customerName}`
              : `You've accepted ${selectedVendor?.vendorName}'s quote`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            {persona === 'seller' && contractData && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-medium text-slate-900">{contractData.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Blocks</span>
                  <span className="font-medium text-slate-900">{contractData.blocks.length} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Value</span>
                  <span className="font-bold text-indigo-600">
                    ₹{contractData.totalValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {persona === 'buyer' && selectedVendor && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Vendor</span>
                  <span className="font-medium text-slate-900">{selectedVendor.vendorName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Equipment</span>
                  <span className="font-medium text-slate-900">{rfpData?.equipmentType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Annual Cost</span>
                  <span className="font-bold text-orange-600">
                    ₹{selectedVendor.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Download (Seller only) */}
            {persona === 'seller' && (
              <button
                onClick={downloadContract}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Contract (HTML)
              </button>
            )}

            {/* CTA - Sign Up */}
            <button
              onClick={goToRegister}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] ${
                persona === 'seller'
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Try Again */}
            <button
              onClick={onRestart}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-slate-400 mt-4">
            This was a demo. Sign up to create real contracts!
          </p>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SuccessModal;

// src/components/catalog-studio/BlockWizard/steps/billing/AutomationStep.tsx
import React from 'react';
import { Zap, FileText, Send, CreditCard, CheckCircle } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface AutomationStepProps {
  formData: {
    autoGenerateInvoice?: boolean;
    autoSendInvoice?: boolean;
    autoPaymentReminders?: boolean;
    autoReceipt?: boolean;
    paymentMethods?: string[];
  };
  onChange: (field: string, value: unknown) => void;
}

const AutomationStep: React.FC<AutomationStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const paymentMethods = [
    { id: 'upi', label: 'UPI', icon: '📱' },
    { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
    { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
    { id: 'wallet', label: 'Wallets', icon: '👛' },
    { id: 'cash', label: 'Cash', icon: '💵' },
    { id: 'cheque', label: 'Cheque', icon: '📄' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Automation & Payment Methods
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure automatic actions and accepted payment methods.
      </p>

      <div className="space-y-6">
        {/* Invoice Automation */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <FileText className="w-4 h-4" /> Invoice Automation
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-generate invoice on milestone/due</span>
              </div>
              <div
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${formData.autoGenerateInvoice !== false ? 'bg-purple-600' : 'bg-gray-300'}`}
                style={{ backgroundColor: formData.autoGenerateInvoice !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => onChange('autoGenerateInvoice', formData.autoGenerateInvoice === false)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: formData.autoGenerateInvoice !== false ? '22px' : '2px' }}
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-send invoice to customer</span>
              </div>
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: formData.autoSendInvoice !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => onChange('autoSendInvoice', formData.autoSendInvoice === false)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: formData.autoSendInvoice !== false ? '22px' : '2px' }}
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Auto-send receipt on payment</span>
              </div>
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: formData.autoReceipt !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => onChange('autoReceipt', formData.autoReceipt === false)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: formData.autoReceipt !== false ? '22px' : '2px' }}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <CreditCard className="w-4 h-4" /> Accepted Payment Methods
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
                }}
              >
                <input type="checkbox" defaultChecked={method.id !== 'cheque'} className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-lg">{method.icon}</span>
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>{method.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Gateway */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Payment Gateway
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Primary Gateway</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="razorpay">Razorpay</option>
                <option value="payu">PayU</option>
                <option value="stripe">Stripe</option>
                <option value="cashfree">Cashfree</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Transaction Fee</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="customer">Customer pays fee</option>
                <option value="seller">Seller absorbs fee</option>
                <option value="split">Split 50-50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Send payment link with invoice
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Allow partial payments
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Enable auto-debit for recurring payments
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AutomationStep;

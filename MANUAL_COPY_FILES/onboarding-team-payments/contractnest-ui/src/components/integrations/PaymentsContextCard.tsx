// src/components/integrations/PaymentsContextCard.tsx
// Context at the top of Settings → Integrations → Payment Gateway: what the
// tenant's customers see today, given what is switched on, and the three
// possible outcomes in plain words. Same rule and same phone preview as the
// onboarding "How you get paid" step (utils/payments/paymentOutcome,
// components/payments/CustomerPaymentPreview).

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { describePaymentOutcome } from '@/utils/payments/paymentOutcome';
import CustomerPaymentPreview from '@/components/payments/CustomerPaymentPreview';

interface PaymentsContextCardProps {
  razorpayOn: boolean;
  upiOn: boolean;
  businessName: string;
  /** Environment the page is showing — settings are stored per environment */
  isLive: boolean;
}

const OUTCOMES: Array<[string, string, string]> = [
  ['UPI', 'UPI to your bank.', 'Free. Customers pay and tell you the reference; you confirm it in Money In.'],
  ['ONLINE', 'Razorpay.', 'Cards, UPI and netbanking, matched to the invoice automatically. Razorpay charges its own fee.'],
  ['NEITHER', 'You collect yourself.', 'Customers accept the contract; you record the payment when it arrives.'],
];

const PaymentsContextCard: React.FC<PaymentsContextCardProps> = ({ razorpayOn, upiOn, businessName, isLive }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showPreview, setShowPreview] = useState(false);
  const outcome = describePaymentOutcome({ razorpay: razorpayOn, upi: upiOn });

  const panel: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)',
  };
  const soft = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';

  return (
    <div className="rounded-2xl p-6" style={panel}>
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>How your customers pay you</h2>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            What you turn on below decides what a customer sees when they open a contract from you.
          </p>
          <div className="mt-4 space-y-2">
            {OUTCOMES.map(([k, b, t]) => (
              <div key={k} className="flex gap-3 items-start text-sm" style={{ color: colors.utility.secondaryText }}>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border mt-0.5 shrink-0"
                  style={{ borderColor: `${colors.utility.primaryText}20`, background: soft }}>{k}</span>
                <span><b style={{ color: colors.utility.primaryText }}>{b}</b> {t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: soft, border: `1px solid ${colors.utility.primaryText}12` }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
            Right now · {isLive ? 'Live' : 'Test'}
          </div>
          <div className="font-semibold" style={{ color: colors.utility.primaryText }}>{outcome.headline}</div>
          <div className="text-sm" style={{ color: colors.utility.secondaryText }}>{outcome.detail}</div>
          <button type="button" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}
            className="self-start mt-1 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: `${colors.brand.primary}50`, color: colors.brand.primary }}>
            {showPreview ? 'Hide the customer view' : 'See it as your customer does'}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="mt-6">
          <CustomerPaymentPreview businessName={businessName} razorpay={razorpayOn} upi={upiOn} />
        </div>
      )}
    </div>
  );
};

export default PaymentsContextCard;

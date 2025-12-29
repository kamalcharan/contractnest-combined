// src/pages/contracts/create/steps/BillingStep.tsx
import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  ArrowRight,
  CreditCard,
  Building2,
  FileText,
  Check,
  AlertCircle,
  Info,
  Calendar,
  Percent,
  Clock,
  Calculator,
  Receipt,
  Wallet
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

type BillingFrequency = 'monthly' | 'quarterly' | 'annually' | 'per-service';
type PaymentMethod = 'credit-card' | 'ach' | 'check' | 'invoice';
type PaymentTiming = 'advance' | 'arrears' | 'due-on-receipt';

interface BillingConfig {
  frequency: BillingFrequency;
  paymentMethod: PaymentMethod;
  paymentTiming: PaymentTiming;
  autoPayEnabled: boolean;
  invoiceDay: number;
  paymentTermsDays: number;
  lateFeeEnabled: boolean;
  lateFeePercent: number;
  lateFeeGraceDays: number;
  discountEnabled: boolean;
  discountPercent: number;
  discountType: 'early-pay' | 'annual' | 'prepay';
  taxRate: number;
  includeTax: boolean;
}

interface BillingStepProps {
  onNext: () => void;
  onBack: () => void;
}

const BillingStep: React.FC<BillingStepProps> = ({ onNext, onBack }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [config, setConfig] = useState<BillingConfig>(
    state.contractData?.billingConfig || {
      frequency: 'monthly',
      paymentMethod: 'credit-card',
      paymentTiming: 'advance',
      autoPayEnabled: true,
      invoiceDay: 1,
      paymentTermsDays: 30,
      lateFeeEnabled: true,
      lateFeePercent: 1.5,
      lateFeeGraceDays: 15,
      discountEnabled: false,
      discountPercent: 5,
      discountType: 'early-pay',
      taxRate: 0,
      includeTax: false
    }
  );

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Calculate billing amounts
  const billingEstimate = useMemo(() => {
    const services = state.contractData?.services?.filter((s: any) => s.isIncluded) || [];
    const equipment = state.contractData?.equipment?.filter((e: any) => e.isIncluded) || [];

    const monthlyServices = services
      .filter((s: any) => ['monthly', 'bi-weekly', 'weekly'].includes(s.frequency))
      .reduce((sum: number, s: any) => sum + (s.price * s.quantity), 0);

    const monthlyEquipment = equipment
      .filter((e: any) => e.isRental && e.monthlyRate)
      .reduce((sum: number, e: any) => sum + (e.monthlyRate || 0), 0);

    const subtotal = monthlyServices + monthlyEquipment;
    const tax = config.includeTax ? subtotal * (config.taxRate / 100) : 0;
    const discount = config.discountEnabled ? subtotal * (config.discountPercent / 100) : 0;
    const total = subtotal + tax - discount;

    // Calculate based on billing frequency
    let billingAmount = total;
    if (config.frequency === 'quarterly') billingAmount = total * 3;
    if (config.frequency === 'annually') billingAmount = total * 12;

    return {
      subtotal,
      tax,
      discount,
      monthlyTotal: total,
      billingAmount,
      frequency: config.frequency
    };
  }, [state.contractData, config]);

  const updateConfig = (updates: Partial<BillingConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const handleContinue = () => {
    dispatch({
      type: 'UPDATE_CONTRACT_DATA',
      payload: { billingConfig: config }
    });
    dispatch({ type: 'MARK_STEP_COMPLETED', payload: 6 });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Billing Setup
          </h1>
          <p className="text-muted-foreground">
            Configure payment terms and billing preferences
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-card border border-border rounded-xl p-4 min-w-64">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Billing Estimate
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${billingEstimate.subtotal.toFixed(2)}/mo</span>
            </div>
            {billingEstimate.tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({config.taxRate}%):</span>
                <span>+${billingEstimate.tax.toFixed(2)}</span>
              </div>
            )}
            {billingEstimate.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-${billingEstimate.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between font-semibold">
              <span className="text-foreground">
                {config.frequency === 'monthly' ? 'Monthly' :
                  config.frequency === 'quarterly' ? 'Quarterly' :
                    config.frequency === 'annually' ? 'Annual' : 'Per Service'} Total:
              </span>
              <span className="text-primary">${billingEstimate.billingAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Frequency */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Billing Frequency
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: 'monthly', label: 'Monthly', desc: 'Bill every month' },
            { value: 'quarterly', label: 'Quarterly', desc: 'Bill every 3 months' },
            { value: 'annually', label: 'Annually', desc: 'Bill once per year' },
            { value: 'per-service', label: 'Per Service', desc: 'Bill after each service' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateConfig({ frequency: option.value as BillingFrequency })}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${config.frequency === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
              }
              `}
            >
              <h4 className="font-semibold text-foreground">{option.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Method
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { value: 'credit-card', label: 'Credit Card', icon: CreditCard },
            { value: 'ach', label: 'Bank Transfer (ACH)', icon: Building2 },
            { value: 'check', label: 'Check', icon: Receipt },
            { value: 'invoice', label: 'Invoice', icon: FileText }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateConfig({ paymentMethod: option.value as PaymentMethod })}
              className={`
                p-4 rounded-xl border-2 text-center transition-all
                ${config.paymentMethod === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
              }
              `}
            >
              <option.icon className={`h-6 w-6 mx-auto mb-2 ${
                config.paymentMethod === option.value ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <h4 className="font-medium text-foreground text-sm">{option.label}</h4>
            </button>
          ))}
        </div>

        {/* Auto-pay Option */}
        {['credit-card', 'ach'].includes(config.paymentMethod) && (
          <label className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoPayEnabled}
              onChange={(e) => updateConfig({ autoPayEnabled: e.target.checked })}
              className="w-5 h-5 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <div>
              <div className="font-medium text-foreground">Enable Auto-Pay</div>
              <p className="text-sm text-muted-foreground">
                Automatically charge on billing date
              </p>
            </div>
          </label>
        )}
      </div>

      {/* Payment Terms */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Payment Terms
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment Timing */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Payment Timing
            </label>
            <div className="space-y-2">
              {[
                { value: 'advance', label: 'In Advance', desc: 'Payment due before service' },
                { value: 'arrears', label: 'In Arrears', desc: 'Payment due after service' },
                { value: 'due-on-receipt', label: 'Due on Receipt', desc: 'Payment due immediately' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${config.paymentTiming === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                  }
                  `}
                >
                  <input
                    type="radio"
                    name="paymentTiming"
                    checked={config.paymentTiming === option.value}
                    onChange={() => updateConfig({ paymentTiming: option.value as PaymentTiming })}
                    className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium text-foreground text-sm">{option.label}</div>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Invoice Day & Payment Terms */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Invoice Day of Month
              </label>
              <select
                value={config.invoiceDay}
                onChange={(e) => updateConfig({ invoiceDay: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}{['st', 'nd', 'rd'][i] || 'th'} of each month
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Payment Due Within
              </label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map((days) => (
                  <button
                    key={days}
                    onClick={() => updateConfig({ paymentTermsDays: days })}
                    className={`
                      flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${config.paymentTermsDays === days
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                    `}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Late Fees & Discounts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Late Fees */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Late Fees
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.lateFeeEnabled}
                onChange={(e) => updateConfig({ lateFeeEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {config.lateFeeEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Late Fee Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={config.lateFeePercent}
                    onChange={(e) => updateConfig({ lateFeePercent: parseFloat(e.target.value) || 0 })}
                    className="w-24 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">% per month</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Grace Period
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={config.lateFeeGraceDays}
                    onChange={(e) => updateConfig({ lateFeeGraceDays: parseInt(e.target.value) || 0 })}
                    className="w-24 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">days after due date</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Discounts */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Discounts
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.discountEnabled}
                onChange={(e) => updateConfig({ discountEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {config.discountEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Discount Type
                </label>
                <select
                  value={config.discountType}
                  onChange={(e) => updateConfig({ discountType: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="early-pay">Early Payment Discount</option>
                  <option value="annual">Annual Contract Discount</option>
                  <option value="prepay">Prepayment Discount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Discount Amount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="25"
                    value={config.discountPercent}
                    onChange={(e) => updateConfig({ discountPercent: parseInt(e.target.value) || 0 })}
                    className="w-24 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">% off</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Tax Settings
        </h3>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeTax}
            onChange={(e) => updateConfig({ includeTax: e.target.checked })}
            className="w-5 h-5 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
          />
          <span className="font-medium text-foreground">Apply tax to services</span>
        </label>

        {config.includeTax && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Tax Rate:</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="25"
              value={config.taxRate}
              onChange={(e) => updateConfig({ taxRate: parseFloat(e.target.value) || 0 })}
              className="w-24 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Billing Summary
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {config.frequency === 'monthly' && `Customer will be billed $${billingEstimate.billingAmount.toFixed(2)} monthly on the ${config.invoiceDay}${['st', 'nd', 'rd'][config.invoiceDay - 1] || 'th'}.`}
              {config.frequency === 'quarterly' && `Customer will be billed $${billingEstimate.billingAmount.toFixed(2)} every 3 months.`}
              {config.frequency === 'annually' && `Customer will be billed $${billingEstimate.billingAmount.toFixed(2)} once per year.`}
              {config.frequency === 'per-service' && `Customer will be billed after each service visit.`}
              {' '}Payment is due within {config.paymentTermsDays} days.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BillingStep;

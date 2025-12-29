// src/pages/contracts/create/steps/AcceptanceStep.tsx
import React, { useState } from 'react';
import {
  CheckCircle,
  ArrowRight,
  MousePointer,
  PenTool,
  Mail,
  Shield,
  Clock,
  AlertCircle,
  Info,
  Calendar,
  Bell,
  FileCheck
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

type AcceptanceMethod = 'click' | 'signature' | 'email';
type ExpirationPeriod = '7' | '14' | '30' | '60' | '90' | 'custom' | 'none';

interface AcceptanceConfig {
  method: AcceptanceMethod;
  requiresMultipleSigners: boolean;
  expirationPeriod: ExpirationPeriod;
  customExpirationDays?: number;
  sendReminders: boolean;
  reminderDays: number[];
  requireIdentityVerification: boolean;
  allowPartialAcceptance: boolean;
  notifyOnView: boolean;
  notifyOnAccept: boolean;
}

interface AcceptanceStepProps {
  onNext: () => void;
  onBack: () => void;
}

const ACCEPTANCE_METHODS = [
  {
    id: 'click' as AcceptanceMethod,
    title: 'Click to Accept',
    description: 'Recipient clicks a button to accept the contract terms',
    icon: MousePointer,
    pros: ['Fastest method', 'Mobile-friendly', 'Simple for recipients'],
    cons: ['Less formal', 'May not hold up in all jurisdictions']
  },
  {
    id: 'signature' as AcceptanceMethod,
    title: 'Electronic Signature',
    description: 'Recipient draws or types their signature',
    icon: PenTool,
    pros: ['Legally binding', 'Professional appearance', 'Audit trail'],
    cons: ['Slightly more time consuming']
  },
  {
    id: 'email' as AcceptanceMethod,
    title: 'Email Confirmation',
    description: 'Recipient confirms via email reply',
    icon: Mail,
    pros: ['Creates paper trail', 'Good for busy recipients'],
    cons: ['Slower process', 'May get lost in inbox']
  }
];

const AcceptanceStep: React.FC<AcceptanceStepProps> = ({ onNext, onBack }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [config, setConfig] = useState<AcceptanceConfig>(
    state.contractData?.acceptanceConfig || {
      method: 'signature',
      requiresMultipleSigners: false,
      expirationPeriod: '30',
      sendReminders: true,
      reminderDays: [7, 3, 1],
      requireIdentityVerification: false,
      allowPartialAcceptance: false,
      notifyOnView: true,
      notifyOnAccept: true
    }
  );

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const updateConfig = (updates: Partial<AcceptanceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    dispatch({
      type: 'UPDATE_CONTRACT_DATA',
      payload: { acceptanceConfig: newConfig }
    });
  };

  const handleContinue = () => {
    dispatch({ type: 'MARK_STEP_COMPLETED', payload: 3 });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Acceptance Criteria
        </h1>
        <p className="text-muted-foreground">
          Define how recipients will accept your contract
        </p>
      </div>

      {/* Acceptance Method Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Acceptance Method
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {ACCEPTANCE_METHODS.map((method) => {
            const isSelected = config.method === method.id;
            const Icon = method.icon;

            return (
              <button
                key={method.id}
                onClick={() => updateConfig({ method: method.id })}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 bg-card'
                  }
                `}
              >
                <div className={`
                  w-12 h-12 rounded-lg flex items-center justify-center mb-3
                  ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">
                  {method.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {method.description}
                </p>

                {/* Pros */}
                <div className="space-y-1 mb-2">
                  {method.pros.map((pro, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      {pro}
                    </div>
                  ))}
                </div>

                {/* Cons */}
                <div className="space-y-1">
                  {method.cons.map((con, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="h-3 w-3" />
                      {con}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expiration Settings */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Expiration Settings
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Contract Offer Expires After
          </label>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
              { value: '60', label: '60 days' },
              { value: '90', label: '90 days' },
              { value: 'custom', label: 'Custom' },
              { value: 'none', label: 'Never' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateConfig({ expirationPeriod: option.value as ExpirationPeriod })}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${config.expirationPeriod === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {config.expirationPeriod === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Custom Expiration (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={config.customExpirationDays || ''}
              onChange={(e) => updateConfig({ customExpirationDays: parseInt(e.target.value) || undefined })}
              className="w-32 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Days"
            />
          </div>
        )}
      </div>

      {/* Reminder Settings */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminders
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.sendReminders}
              onChange={(e) => updateConfig({ sendReminders: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {config.sendReminders && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Send reminder emails when the contract hasn't been accepted:
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7, 14].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    const newDays = config.reminderDays.includes(days)
                      ? config.reminderDays.filter(d => d !== days)
                      : [...config.reminderDays, days].sort((a, b) => b - a);
                    updateConfig({ reminderDays: newDays });
                  }}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${config.reminderDays.includes(days)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {days} day{days > 1 ? 's' : ''} before expiry
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Security Options */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security & Verification
        </h3>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireIdentityVerification}
              onChange={(e) => updateConfig({ requireIdentityVerification: e.target.checked })}
              className="mt-1 w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <div>
              <div className="font-medium text-foreground">Require Identity Verification</div>
              <p className="text-sm text-muted-foreground">
                Recipient must verify their identity before accepting (email verification)
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allowPartialAcceptance}
              onChange={(e) => updateConfig({ allowPartialAcceptance: e.target.checked })}
              className="mt-1 w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <div>
              <div className="font-medium text-foreground">Allow Partial Acceptance</div>
              <p className="text-sm text-muted-foreground">
                Recipient can accept some terms and request changes to others
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Notification Options */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Notifications
        </h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.notifyOnView}
              onChange={(e) => updateConfig({ notifyOnView: e.target.checked })}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <span className="text-foreground">Notify me when the contract is viewed</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.notifyOnAccept}
              onChange={(e) => updateConfig({ notifyOnAccept: e.target.checked })}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <span className="text-foreground">Notify me when the contract is accepted</span>
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Summary
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Acceptance method: {ACCEPTANCE_METHODS.find(m => m.id === config.method)?.title}</li>
              <li>• Expires: {config.expirationPeriod === 'none' ? 'Never' : config.expirationPeriod === 'custom' ? `${config.customExpirationDays} days` : `${config.expirationPeriod} days`}</li>
              <li>• Reminders: {config.sendReminders ? `${config.reminderDays.length} scheduled` : 'Disabled'}</li>
              <li>• Identity verification: {config.requireIdentityVerification ? 'Required' : 'Not required'}</li>
            </ul>
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

export default AcceptanceStep;

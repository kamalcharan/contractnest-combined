// src/pages/contracts/create/steps/ReviewStep.tsx
import React, { useState } from 'react';
import {
  Eye,
  ArrowRight,
  FileText,
  User,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Edit3,
  Download,
  Printer,
  Mail,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Wrench,
  Package,
  Receipt
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

interface ReviewStepProps {
  onNext: () => void;
  onBack: () => void;
  onEditStep: (stepIndex: number) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ onNext, onBack, onEditStep }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [expandedSections, setExpandedSections] = useState<string[]>(['overview', 'services', 'billing']);
  const [acknowledgeChecked, setAcknowledgeChecked] = useState(false);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const contractData = state.contractData || {};
  const recipient = contractData.recipient;
  const services = contractData.services?.filter((s: any) => s.isIncluded) || [];
  const equipment = contractData.equipment?.filter((e: any) => e.isIncluded) || [];
  const terms = contractData.terms?.filter((t: any) => t.isRequired) || [];
  const billingConfig = contractData.billingConfig || {};
  const acceptanceConfig = contractData.acceptanceConfig || {};

  // Calculate totals
  const monthlyServices = services
    .filter((s: any) => ['monthly', 'bi-weekly', 'weekly'].includes(s.frequency))
    .reduce((sum: number, s: any) => sum + (s.price * s.quantity), 0);
  const monthlyEquipment = equipment
    .filter((e: any) => e.isRental && e.monthlyRate)
    .reduce((sum: number, e: any) => sum + (e.monthlyRate || 0), 0);
  const monthlyTotal = monthlyServices + monthlyEquipment;

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleContinue = () => {
    if (acknowledgeChecked) {
      dispatch({ type: 'MARK_STEP_COMPLETED', payload: 7 });
      onNext();
    }
  };

  // Validation checks
  const validationIssues = [];
  if (!recipient) validationIssues.push({ step: 2, message: 'No recipient selected' });
  if (services.length === 0) validationIssues.push({ step: 4, message: 'No services selected' });

  const Section = ({
    id,
    title,
    icon: Icon,
    editStep,
    children
  }: {
    id: string;
    title: string;
    icon: React.ComponentType<any>;
    editStep?: number;
    children: React.ReactNode;
  }) => (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {editStep !== undefined && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(editStep);
              }}
              className="flex items-center gap-1 px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          )}
          {expandedSections.includes(id) ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>
      {expandedSections.includes(id) && (
        <div className="p-4 bg-card border-t border-border">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Review & Finalize
          </h1>
          <p className="text-muted-foreground">
            Review all contract details before sending
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Validation Warnings */}
      {validationIssues.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Please address the following issues:
              </h4>
              <ul className="space-y-1">
                {validationIssues.map((issue, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <span>• {issue.message}</span>
                    <button
                      onClick={() => onEditStep(issue.step)}
                      className="underline hover:no-underline"
                    >
                      Fix now
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Contract Summary Card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Contract Type</div>
            <div className="font-semibold text-foreground capitalize">
              {contractData.type || 'Service'} Contract
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Monthly Value</div>
            <div className="font-semibold text-primary text-xl">
              ${monthlyTotal.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Contract Duration</div>
            <div className="font-semibold text-foreground">
              {contractData.duration === 'custom'
                ? `${contractData.customDuration} months`
                : `${contractData.duration || 12} months`}
            </div>
          </div>
        </div>
      </div>

      {/* Review Sections */}
      <div className="space-y-4 mb-6">
        {/* Recipient */}
        <Section id="recipient" title="Recipient Information" icon={User} editStep={2}>
          {recipient ? (
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${recipient.type === 'business' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}
              `}>
                {recipient.type === 'business' ? (
                  <Building2 className="h-6 w-6" />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{recipient.name}</h4>
                {recipient.company && (
                  <p className="text-sm text-muted-foreground">{recipient.company}</p>
                )}
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>{recipient.email}</p>
                  <p>{recipient.phone}</p>
                  <p>
                    {recipient.address?.street}, {recipient.address?.city}, {recipient.address?.state} {recipient.address?.zip}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground italic">No recipient selected</p>
          )}
        </Section>

        {/* Services */}
        <Section id="services" title={`Services (${services.length})`} icon={Wrench} editStep={4}>
          {services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service: any) => (
                <div key={service.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <h5 className="font-medium text-foreground">{service.name}</h5>
                    <p className="text-sm text-muted-foreground">
                      {service.frequency.replace('-', ' ')} × {service.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">
                      ${(service.price * service.quantity).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      per {service.frequency === 'one-time' ? 'service' : service.frequency.replace('ly', '')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No services selected</p>
          )}
        </Section>

        {/* Equipment */}
        {equipment.length > 0 && (
          <Section id="equipment" title={`Equipment (${equipment.length})`} icon={Package} editStep={4}>
            <div className="space-y-3">
              {equipment.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <h5 className="font-medium text-foreground">{item.name}</h5>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  {item.monthlyRate && (
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        ${item.monthlyRate.toFixed(2)}/mo
                      </div>
                      <p className="text-sm text-muted-foreground">Rental</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Billing */}
        <Section id="billing" title="Billing Configuration" icon={DollarSign} editStep={6}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Billing Frequency</h5>
              <p className="text-foreground capitalize">{billingConfig.frequency || 'Monthly'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Payment Method</h5>
              <p className="text-foreground capitalize">{billingConfig.paymentMethod?.replace('-', ' ') || 'Credit Card'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Payment Terms</h5>
              <p className="text-foreground">Net {billingConfig.paymentTermsDays || 30} days</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Auto-Pay</h5>
              <p className="text-foreground">{billingConfig.autoPayEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </Section>

        {/* Acceptance */}
        <Section id="acceptance" title="Acceptance Settings" icon={Shield} editStep={3}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Acceptance Method</h5>
              <p className="text-foreground capitalize">{acceptanceConfig.method?.replace('-', ' ') || 'Electronic Signature'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Expiration</h5>
              <p className="text-foreground">
                {acceptanceConfig.expirationPeriod === 'none'
                  ? 'Never expires'
                  : `${acceptanceConfig.expirationPeriod || 30} days`}
              </p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Identity Verification</h5>
              <p className="text-foreground">{acceptanceConfig.requireIdentityVerification ? 'Required' : 'Not required'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Reminders</h5>
              <p className="text-foreground">{acceptanceConfig.sendReminders ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </Section>

        {/* Terms */}
        <Section id="terms" title={`Terms & Conditions (${terms.length})`} icon={FileText} editStep={4}>
          <div className="space-y-2">
            {terms.map((term: any) => (
              <div key={term.id} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-foreground">{term.title}</span>
                {term.isCustom && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    Custom
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Timeline */}
        <Section id="timeline" title="Contract Timeline" icon={Calendar} editStep={5}>
          <div className="flex items-center gap-6">
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Start Date</h5>
              <p className="text-foreground">
                {contractData.startDate
                  ? new Date(contractData.startDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                  : 'Upon acceptance'}
              </p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Duration</h5>
              <p className="text-foreground">
                {contractData.duration === 'custom'
                  ? `${contractData.customDuration} months`
                  : `${contractData.duration || 12} months`}
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* Acknowledgment */}
      <div className="bg-muted/50 border border-border rounded-xl p-6 mb-8">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledgeChecked}
            onChange={(e) => setAcknowledgeChecked(e.target.checked)}
            className="mt-1 w-5 h-5 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
          />
          <div>
            <div className="font-medium text-foreground">I have reviewed all contract details</div>
            <p className="text-sm text-muted-foreground mt-1">
              I confirm that the information above is accurate and I'm ready to send this contract
              to the recipient for acceptance. I understand that once sent, changes may require
              cancellation and reissuance.
            </p>
          </div>
        </label>
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
          disabled={!acknowledgeChecked || validationIssues.length > 0}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
            ${acknowledgeChecked && validationIssues.length === 0
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
          }
          `}
        >
          Continue to Send
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;

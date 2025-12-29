// src/pages/contracts/create/steps/SendStep.tsx
import React, { useState } from 'react';
import {
  Send,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  DollarSign,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  Link2,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

type DeliveryMethod = 'email' | 'link' | 'both';

interface SendStepProps {
  onBack: () => void;
  onComplete: () => void;
}

const SendStep: React.FC<SendStepProps> = ({ onBack, onComplete }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('email');
  const [customMessage, setCustomMessage] = useState('');
  const [useAIMessage, setUseAIMessage] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [previewEmail, setPreviewEmail] = useState(false);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const contractData = state.contractData || {};
  const recipient = contractData.recipient;
  const services = contractData.services?.filter((s: any) => s.isIncluded) || [];

  const monthlyTotal = services
    .filter((s: any) => ['monthly', 'bi-weekly', 'weekly'].includes(s.frequency))
    .reduce((sum: number, s: any) => sum + (s.price * s.quantity), 0);

  // Generate AI message
  const generateAIMessage = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    const message = `Dear ${recipient?.name || 'Valued Customer'},

We're pleased to present your customized ${contractData.type || 'service'} contract for your review and approval.

This agreement includes ${services.length} service${services.length > 1 ? 's' : ''} at a monthly rate of $${monthlyTotal.toFixed(2)}. We've tailored these services specifically to meet your needs.

Please review the attached contract at your convenience. You can accept it directly through the secure link provided, or let us know if you have any questions.

We look forward to serving you!

Best regards,
[Your Company Name]`;
    setCustomMessage(message);
    setIsGenerating(false);
  };

  // Copy link to clipboard
  const copyLink = () => {
    const link = `https://contractnest.app/accept/demo-${Date.now()}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Send contract
  const handleSend = async () => {
    setIsSending(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSending(false);
    setIsSent(true);
    dispatch({ type: 'MARK_STEP_COMPLETED', payload: 8 });
  };

  // Success state
  if (isSent) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Contract Sent Successfully!
        </h1>
        <p className="text-muted-foreground mb-8">
          Your contract has been sent to <span className="font-medium text-foreground">{recipient?.email}</span>.
          You'll receive a notification when they view or accept the contract.
        </p>

        {/* Contract Summary */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold text-foreground mb-4">Contract Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Contract ID:</span>
              <p className="font-mono font-medium">CNT-{Date.now().toString().slice(-8)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sent To:</span>
              <p className="font-medium">{recipient?.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Value:</span>
              <p className="font-medium text-primary">${monthlyTotal.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expires:</span>
              <p className="font-medium">
                {contractData.acceptanceConfig?.expirationPeriod === 'none'
                  ? 'Never'
                  : `In ${contractData.acceptanceConfig?.expirationPeriod || 30} days`}
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8 text-left">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recipient receives email with contract link
            </li>
            <li className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              You'll be notified when they view the contract
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Once accepted, both parties receive signed copies
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.location.href = '/contracts'}
            className="px-6 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            View All Contracts
          </button>
          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Another Contract
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Send Contract
        </h1>
        <p className="text-muted-foreground">
          Choose how to deliver your contract to {recipient?.name || 'the recipient'}
        </p>
      </div>

      {/* Recipient Card */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{recipient?.name || 'Recipient'}</h4>
            <p className="text-sm text-muted-foreground">{recipient?.email || 'email@example.com'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            ${monthlyTotal.toFixed(2)}/mo
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-4 w-4" />
            {services.length} service{services.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Delivery Method */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Delivery Method
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { value: 'email', label: 'Email Only', icon: Mail, desc: 'Send via email with secure link' },
            { value: 'link', label: 'Share Link', icon: Link2, desc: 'Copy a shareable acceptance link' },
            { value: 'both', label: 'Email + Link', icon: Send, desc: 'Send email and get shareable link' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDeliveryMethod(option.value as DeliveryMethod)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${deliveryMethod === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
              }
              `}
            >
              <option.icon className={`h-6 w-6 mb-2 ${
                deliveryMethod === option.value ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <h4 className="font-semibold text-foreground">{option.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {(deliveryMethod === 'email' || deliveryMethod === 'both') && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Email Message
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewEmail(!previewEmail)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Eye className="h-4 w-4" />
                {previewEmail ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={generateAIMessage}
                disabled={isGenerating}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'AI Assist'}
              </button>
            </div>
          </div>

          {previewEmail ? (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="border-b border-border pb-3 mb-3">
                <p className="text-sm text-muted-foreground">
                  <strong>To:</strong> {recipient?.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Subject:</strong> Your {contractData.type || 'Service'} Contract is Ready for Review
                </p>
              </div>
              <div className="whitespace-pre-wrap text-foreground text-sm">
                {customMessage || `Dear ${recipient?.name || 'Customer'},\n\nPlease review and accept the attached contract at your earliest convenience.\n\nBest regards,\n[Your Company Name]`}
              </div>
            </div>
          ) : (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={`Enter a personalized message for ${recipient?.name || 'the recipient'}...`}
              rows={8}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          )}

          <p className="text-xs text-muted-foreground mt-3">
            This message will be included in the email along with a secure link to view and accept the contract.
          </p>
        </div>
      )}

      {/* Shareable Link */}
      {(deliveryMethod === 'link' || deliveryMethod === 'both') && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Shareable Link
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`https://contractnest.app/accept/demo-${Date.now().toString().slice(-8)}`}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-muted text-foreground font-mono text-sm"
            />
            <button
              onClick={copyLink}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all
                ${copySuccess
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }
              `}
            >
              {copySuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            This link expires in {contractData.acceptanceConfig?.expirationPeriod || 30} days.
            Anyone with this link can view and accept the contract.
          </p>
        </div>
      )}

      {/* Summary Before Send */}
      <div className="bg-muted/50 border border-border rounded-xl p-6 mb-8">
        <h4 className="font-semibold text-foreground mb-4">Before you send...</h4>
        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <span className="text-foreground">
              Contract reviewed and all details are correct
            </span>
          </label>
          <label className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <span className="text-foreground">
              Recipient email <span className="font-medium">{recipient?.email}</span> is verified
            </span>
          </label>
          <label className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <span className="text-foreground">
              Contract expires in {contractData.acceptanceConfig?.expirationPeriod || 30} days
            </span>
          </label>
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
          onClick={handleSend}
          disabled={isSending}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all
            ${isSending
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }
          `}
        >
          {isSending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Send Contract
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SendStep;

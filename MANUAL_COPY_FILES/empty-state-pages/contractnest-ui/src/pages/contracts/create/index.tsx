// src/pages/contracts/create/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  ContractBuilderProvider,
  useContractBuilder
} from '../../../contexts/ContractBuilderContext';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  CheckCircle,
  Circle,
  Clock,
  FileText,
  Users,
  Settings,
  Calendar,
  DollarSign,
  Send,
  Handshake,
  FileSignature,
  Shield,
  BarChart3,
  Bell,
  Search,
  Layers
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';

// Coming soon features for Contracts
const contractsFeatures = [
  { icon: FileSignature, title: 'Digital Contract Creation', description: 'Create professional contracts with customizable templates, clause libraries, and smart field mapping.', highlight: true },
  { icon: Shield, title: 'Compliance & Audit Trail', description: 'Every action tracked. Full audit history for regulatory compliance and dispute resolution.', highlight: false },
  { icon: Clock, title: 'Lifecycle Management', description: 'Track contract stages from draft to signed. Automated reminders for renewals and expirations.', highlight: false },
  { icon: BarChart3, title: 'Contract Analytics', description: 'Insights on contract value, turnaround time, and performance metrics across your portfolio.', highlight: false }
];
const contractsFloatingIcons = [
  { Icon: FileText, top: '8%', left: '4%', delay: '0s', duration: '22s' },
  { Icon: FileSignature, top: '18%', right: '6%', delay: '1.5s', duration: '19s' },
  { Icon: Shield, top: '60%', left: '5%', delay: '3s', duration: '21s' },
  { Icon: Layers, top: '70%', right: '4%', delay: '0.5s', duration: '18s' },
];

// Import types
import { ContractType } from '../../../types/contracts/contract';
import { Template } from '../../../types/contracts/template';

// Import step components
import TemplatesStep from './templates';
import {
  ContractTypeStep,
  RecipientStep,
  AcceptanceStep,
  BuilderStep,
  TimelineStep,
  BillingStep,
  ReviewStep,
  SendStep
} from './steps';

// Step configuration
interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ onNext: () => void; onBack?: () => void }>;
}

const getStepConfig = (contractType: ContractType | null): StepConfig[] => {
  const baseSteps: StepConfig[] = [
    {
      id: 'templates',
      title: 'Choose Template',
      description: 'Select a contract template',
      icon: FileText,
      component: TemplatesStep as any
    },
    {
      id: 'contract-type',
      title: 'Contract Type',
      description: 'Service or Partnership',
      icon: Settings,
      component: ContractTypeStep
    },
    {
      id: 'recipient',
      title: 'Recipient',
      description: 'Choose contract recipient',
      icon: Users,
      component: RecipientStep
    }
  ];

  if (contractType === 'partnership') {
    // Simplified flow for partnership
    return [
      ...baseSteps,
      {
        id: 'acceptance',
        title: 'Acceptance',
        description: 'Define acceptance criteria',
        icon: Handshake,
        component: AcceptanceStep
      },
      {
        id: 'review',
        title: 'Review',
        description: 'Review contract details',
        icon: FileText,
        component: ReviewStep
      },
      {
        id: 'send',
        title: 'Send',
        description: 'Send to recipient',
        icon: Send,
        component: SendStep
      }
    ];
  }

  // Full flow for service contracts
  return [
    ...baseSteps,
    {
      id: 'acceptance',
      title: 'Acceptance',
      description: 'Define acceptance criteria',
      icon: CheckCircle,
      component: AcceptanceStep
    },
    {
      id: 'builder',
      title: 'Contract Builder',
      description: 'Add and configure blocks',
      icon: Settings,
      component: BuilderStep
    },
    {
      id: 'timeline',
      title: 'Timeline',
      description: 'Review timeline and events',
      icon: Calendar,
      component: TimelineStep
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Configure billing rules',
      icon: DollarSign,
      component: BillingStep
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review contract details',
      icon: FileText,
      component: ReviewStep
    },
    {
      id: 'send',
      title: 'Send',
      description: 'Send to recipient',
      icon: Send,
      component: SendStep
    }
  ];
};

// Inner component that uses the context
const ContractCreateContent: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { toast } = useToast();
  const { state, dispatch } = useContractBuilder();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Get step configuration based on contract type
  const steps = getStepConfig(state.contractData?.type || null);
  const CurrentStepComponent = steps[currentStep]?.component;

  // Handle template selection from templates step
  const handleTemplateSelect = (template: Template) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
    // Auto-advance to next step after template selection
    setCurrentStep(prev => prev + 1);
  };

  // Save draft
  const saveDraft = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSaved(new Date());
      dispatch({ type: 'SAVE_DRAFT' });

      toast({
        title: "Draft saved",
        description: "Your contract has been saved as draft"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save draft. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle step navigation
  const canGoNext = () => {
    return currentStep < steps.length - 1;
  };

  const canGoPrevious = () => {
    return currentStep > 0;
  };

  const handleNext = async () => {
    if (canGoNext()) {
      await saveDraft();
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious()) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigating to completed steps or the current step
    if (stepIndex <= currentStep || state.completedSteps.includes(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const handleExit = async () => {
    if (state.contractData?.template || state.contractData?.type) {
      await saveDraft();
    }
    navigate('/contracts');
  };

  const getStepStatus = (stepIndex: number) => {
    if (state.completedSteps.includes(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  // Get contract name for display
  const getContractName = () => {
    if (state.contractData?.template?.name) {
      return state.contractData.template.name;
    }
    return 'New Contract';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleExit}
                className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground"
                title="Exit contract builder"
              >
                <X className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {getContractName()}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Contract Builder
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Not saved
                  </>
                )}
              </div>

              {/* Manual save button */}
              <button
                onClick={saveDraft}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-accent transition-colors text-sm border-input text-foreground disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                const IconComponent = step.icon;

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={status === 'upcoming' && !state.completedSteps.includes(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors min-w-0 whitespace-nowrap ${
                      status === 'current'
                        ? 'bg-primary text-primary-foreground'
                        : status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/30'
                        : 'text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 flex-shrink-0 ${
                      status === 'completed' ? 'text-green-600 dark:text-green-400' : ''
                    }`} />
                    <div className="min-w-0 text-left hidden sm:block">
                      <div className="text-sm font-medium truncate">
                        {step.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step counter for mobile */}
            <div className="text-sm text-muted-foreground sm:hidden flex-shrink-0 ml-2">
              {currentStep + 1} / {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {CurrentStepComponent && (
            currentStep === 0 ? (
              // Templates step needs special handling for template selection
              <TemplatesStep
                onTemplateSelect={handleTemplateSelect}
                onNext={handleNext}
                onBack={handlePrevious}
              />
            ) : (
              <CurrentStepComponent
                onNext={handleNext}
                onBack={canGoPrevious() ? handlePrevious : undefined}
              />
            )
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t bg-card border-border sticky bottom-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <button
              onClick={handlePrevious}
              disabled={!canGoPrevious()}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-input text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>

            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component that wraps with provider
const ContractCreatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const contractTypeFromUrl = searchParams.get('type') as ContractType | null;

  return (
    <ContractBuilderProvider initialContractType={contractTypeFromUrl || undefined}>
      <ContractCreateContent />
    </ContractBuilderProvider>
  );
};

// Wrapped with Coming Soon
const ContractCreatePageWithComingSoon: React.FC = () => {
  return (
    <ComingSoonWrapper
      pageKey="contracts"
      title="Contract Management"
      subtitle="End-to-end contract lifecycle management. From creation to signature, renewal tracking to compliance - all in one powerful platform."
      heroIcon={FileText}
      features={contractsFeatures}
      floatingIcons={contractsFloatingIcons}
    >
      <ContractCreatePage />
    </ComingSoonWrapper>
  );
};

export default ContractCreatePageWithComingSoon;

// src/pages/contracts/create/index.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
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
  Shield,
  Wrench,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import types
import { ContractType } from '../../../types/contracts/contract';
import { Template } from '../../../types/contracts/template';

// Import step components
import TemplatesStep from './templates';
import ContractTypeStep from './steps/ContractTypeStep';
import RecipientStep from './steps/RecipientStep';
import AcceptanceStep from './steps/AcceptanceStep';
import BuilderStep from './steps/BuilderStep';
import TimelineStep from './steps/TimelineStep';
import BillingStep from './steps/BillingStep';
import ReviewStep from './steps/ReviewStep';
import SendStep from './steps/SendStep';

// Types
interface ContractBuilderState {
  // Basic contract info
  contractType: ContractType | null;
  templateId: string | null;
  templateName: string | null;
  contractName: string;

  // Contract data from steps
  contractData: any;

  // Contact/Recipient info
  recipientId: string | null;
  recipientType: 'customer' | 'partner' | null;

  // Contract details
  startDate: Date | null;
  endDate: Date | null;
  description: string;

  // Blocks and configuration
  selectedBlocks: any[];
  blockConfigurations: Record<string, any>;

  // Acceptance criteria
  acceptanceCriteria: {
    type: 'payment' | 'signature' | 'auto';
    requiresPayment: boolean;
    requiresSignature: boolean;
    autoAccept: boolean;
    paymentAmount?: number;
  };

  // Billing and commercial
  billingRules: any[];
  revenueSharing: any[];

  // Template selection
  selectedTemplate: Template | null;

  // Step completion tracking
  completedSteps: number[];

  // Meta
  isDraft: boolean;
  lastSaved: Date | null;
  validationErrors: Record<string, string[]>;
}

interface ContractBuilderContextType {
  state: ContractBuilderState;
  dispatch: (action: ContractBuilderAction) => void;
  updateState: (updates: Partial<ContractBuilderState>) => void;
  resetState: () => void;
  saveDraft: () => Promise<void>;
  validateCurrentStep: () => boolean;
  getStepErrors: (step: number) => string[];
}

type ContractBuilderAction =
  | { type: 'UPDATE_CONTRACT_DATA'; payload: any }
  | { type: 'MARK_STEP_COMPLETED'; payload: number }
  | { type: 'SET_CONTRACT_TYPE'; payload: ContractType }
  | { type: 'RESET' };

// Initial state
const initialState: ContractBuilderState = {
  contractType: null,
  templateId: null,
  templateName: null,
  contractName: '',
  contractData: {},
  recipientId: null,
  recipientType: null,
  startDate: null,
  endDate: null,
  description: '',
  selectedBlocks: [],
  blockConfigurations: {},
  acceptanceCriteria: {
    type: 'signature',
    requiresPayment: false,
    requiresSignature: true,
    autoAccept: false
  },
  billingRules: [],
  revenueSharing: [],
  selectedTemplate: null,
  completedSteps: [],
  isDraft: true,
  lastSaved: null,
  validationErrors: {}
};

// Context
const ContractBuilderContext = createContext<ContractBuilderContextType | null>(null);

export const useContractBuilder = () => {
  const context = useContext(ContractBuilderContext);
  if (!context) {
    throw new Error('useContractBuilder must be used within ContractBuilderProvider');
  }
  return context;
};

// Step configuration
const getStepConfig = (contractType: ContractType | null) => {
  const baseSteps = [
    {
      id: 'templates',
      title: 'Choose Template',
      description: 'Select a contract template',
      icon: FileText,
      component: 'templates'
    },
    {
      id: 'contract-type',
      title: 'Contract Type',
      description: 'Service or Partnership',
      icon: Settings,
      component: 'contract-type'
    },
    {
      id: 'recipient',
      title: 'Recipient',
      description: 'Choose contract recipient',
      icon: Users,
      component: 'recipient'
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
        icon: Shield,
        component: 'acceptance'
      },
      {
        id: 'review',
        title: 'Review',
        description: 'Review contract details',
        icon: Eye,
        component: 'review'
      },
      {
        id: 'send',
        title: 'Send',
        description: 'Send to recipient',
        icon: Send,
        component: 'send'
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
      icon: Shield,
      component: 'acceptance'
    },
    {
      id: 'builder',
      title: 'Contract Builder',
      description: 'Add and configure blocks',
      icon: Wrench,
      component: 'builder'
    },
    {
      id: 'timeline',
      title: 'Timeline',
      description: 'Review timeline and events',
      icon: Calendar,
      component: 'timeline'
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Configure billing rules',
      icon: DollarSign,
      component: 'billing'
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review contract details',
      icon: Eye,
      component: 'review'
    },
    {
      id: 'send',
      title: 'Send',
      description: 'Send to recipient',
      icon: Send,
      component: 'send'
    }
  ];
};

const ContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode } = useTheme();
  const { toast } = useToast();

  // Get contract type from URL params (for partnership flow)
  const contractTypeFromUrl = searchParams.get('type') as ContractType | null;

  // State
  const [state, setState] = useState<ContractBuilderState>({
    ...initialState,
    contractType: contractTypeFromUrl
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get step configuration based on contract type
  const steps = getStepConfig(state.contractType);

  // Dispatch function for reducer-like updates
  const dispatch = (action: ContractBuilderAction) => {
    switch (action.type) {
      case 'UPDATE_CONTRACT_DATA':
        setState(prev => ({
          ...prev,
          contractData: { ...prev.contractData, ...action.payload }
        }));
        break;
      case 'MARK_STEP_COMPLETED':
        setState(prev => ({
          ...prev,
          completedSteps: prev.completedSteps.includes(action.payload)
            ? prev.completedSteps
            : [...prev.completedSteps, action.payload]
        }));
        break;
      case 'SET_CONTRACT_TYPE':
        setState(prev => ({
          ...prev,
          contractType: action.payload,
          contractData: { ...prev.contractData, type: action.payload }
        }));
        break;
      case 'RESET':
        setState(initialState);
        setCurrentStep(0);
        break;
    }
  };

  // Context value
  const contextValue: ContractBuilderContextType = {
    state,
    dispatch,
    updateState: (updates) => {
      setState(prev => ({ ...prev, ...updates }));
    },
    resetState: () => {
      setState(initialState);
      setCurrentStep(0);
    },
    saveDraft: async () => {
      try {
        setIsLoading(true);
        // TODO: Implement actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDraft: true
        }));

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
    },
    validateCurrentStep: () => {
      // TODO: Implement step-specific validation
      return true;
    },
    getStepErrors: (step: number) => {
      // TODO: Return validation errors for specific step
      return [];
    }
  };

  // Handle step navigation
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleTemplateSelect = (template: Template) => {
    setState(prev => ({
      ...prev,
      selectedTemplate: template,
      templateId: template.id,
      templateName: template.name
    }));
    goToNextStep();
  };

  const handleComplete = () => {
    // Reset and go back to contracts list
    navigate('/contracts');
  };

  // Render the current step component
  const renderStepComponent = () => {
    const currentStepConfig = steps[currentStep];

    switch (currentStepConfig?.component) {
      case 'templates':
        return <TemplatesStep onTemplateSelect={handleTemplateSelect} />;
      case 'contract-type':
        return <ContractTypeStep onNext={goToNextStep} onBack={goToPreviousStep} />;
      case 'recipient':
        return <RecipientStep onNext={goToNextStep} onBack={goToPreviousStep} />;
      case 'acceptance':
        return <AcceptanceStep onNext={goToNextStep} onBack={goToPreviousStep} />;
      case 'builder':
        return <BuilderStep onNext={goToNextStep} onBack={goToPreviousStep} />;
      case 'timeline':
        return <TimelineStep onNext={goToNextStep} onBack={goToPreviousStep} />;
      case 'billing':
        return <BillingStep onNext={goToNextStep} onBack={goToPreviousStep} />;
      case 'review':
        return <ReviewStep onNext={goToNextStep} onBack={goToPreviousStep} onEditStep={goToStep} />;
      case 'send':
        return <SendStep onBack={goToPreviousStep} onComplete={handleComplete} />;
      default:
        return <div>Step not found</div>;
    }
  };

  const canGoNext = () => {
    return currentStep < steps.length - 1;
  };

  const canGoPrevious = () => {
    return currentStep > 0;
  };

  const handleExit = async () => {
    if (state.isDraft && (state.contractName || state.templateId)) {
      await contextValue.saveDraft();
    }
    navigate('/contracts');
  };

  const getStepStatus = (stepIndex: number) => {
    if (state.completedSteps.includes(stepIndex) || stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <ContractBuilderContext.Provider value={contextValue}>
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
                    {state.contractName || 'New Contract'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {state.templateName || 'Contract Builder'}
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
                  ) : state.lastSaved ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Saved {new Date(state.lastSaved).toLocaleTimeString()}
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
                  onClick={contextValue.saveDraft}
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
                      onClick={() => status !== 'upcoming' && goToStep(index)}
                      disabled={status === 'upcoming'}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-w-0 whitespace-nowrap ${
                        status === 'current'
                          ? 'bg-primary text-primary-foreground'
                          : status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/30 cursor-pointer'
                          : 'text-muted-foreground opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        status === 'completed'
                          ? 'bg-green-500 text-white'
                          : status === 'current'
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium">
                          {step.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step counter for mobile */}
              <div className="text-sm text-muted-foreground ml-4 whitespace-nowrap">
                {currentStep + 1} / {steps.length}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderStepComponent()}
        </div>
      </div>
    </ContractBuilderContext.Provider>
  );
};

export default ContractCreatePage;

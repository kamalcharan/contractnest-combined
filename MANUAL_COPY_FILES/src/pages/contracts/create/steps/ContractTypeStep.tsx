// src/pages/contracts/create/steps/ContractTypeStep.tsx
import React, { useState } from 'react';
import {
  Building2,
  Handshake,
  FileText,
  ArrowRight,
  Check,
  Info,
  Briefcase,
  Users,
  Clock,
  DollarSign,
  Shield,
  Calendar
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';
import { ContractType } from '../../../../types/contracts/contract';

interface ContractTypeOption {
  id: ContractType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  estimatedTime: string;
  popular?: boolean;
}

const CONTRACT_TYPES: ContractTypeOption[] = [
  {
    id: 'service',
    title: 'Service Contract',
    description: 'For ongoing service agreements with customers including pest control, lawn care, HVAC maintenance, and more.',
    icon: Building2,
    features: [
      'Recurring service schedules',
      'Equipment and materials tracking',
      'Service area definitions',
      'Automatic billing cycles',
      'Customizable terms and conditions'
    ],
    estimatedTime: '15-20 min',
    popular: true
  },
  {
    id: 'partnership',
    title: 'Partnership Agreement',
    description: 'For business partnerships including revenue sharing, joint ventures, and collaborative arrangements.',
    icon: Handshake,
    features: [
      'Revenue sharing configuration',
      'Role and responsibility definitions',
      'Territory agreements',
      'Performance metrics',
      'Exit clauses and terms'
    ],
    estimatedTime: '20-30 min'
  }
];

interface ContractTypeStepProps {
  onNext: () => void;
  onBack?: () => void;
}

const ContractTypeStep: React.FC<ContractTypeStepProps> = ({ onNext, onBack }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();
  const [selectedType, setSelectedType] = useState<ContractType | null>(
    state.contractData?.type || null
  );
  const [hoveredType, setHoveredType] = useState<ContractType | null>(null);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const handleTypeSelect = (typeId: ContractType) => {
    setSelectedType(typeId);
    dispatch({
      type: 'UPDATE_CONTRACT_DATA',
      payload: { type: typeId }
    });
  };

  const handleContinue = () => {
    if (selectedType) {
      dispatch({ type: 'MARK_STEP_COMPLETED', payload: 1 });
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Select Contract Type
        </h1>
        <p className="text-muted-foreground">
          Choose the type of contract that best fits your needs
        </p>
      </div>

      {/* Contract Type Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {CONTRACT_TYPES.map((contractType) => {
          const isSelected = selectedType === contractType.id;
          const isHovered = hoveredType === contractType.id;
          const Icon = contractType.icon;

          return (
            <button
              key={contractType.id}
              onClick={() => handleTypeSelect(contractType.id)}
              onMouseEnter={() => setHoveredType(contractType.id)}
              onMouseLeave={() => setHoveredType(null)}
              className={`
                relative p-6 rounded-xl border-2 text-left transition-all duration-200
                ${isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50 bg-card'
                }
              `}
            >
              {/* Popular Badge */}
              {contractType.popular && (
                <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  Most Popular
                </div>
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}

              {/* Icon */}
              <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center mb-4
                ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                <Icon className="h-7 w-7" />
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {contractType.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {contractType.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {contractType.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Estimated Time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border">
                <Clock className="h-4 w-4" />
                <span>Est. completion: {contractType.estimatedTime}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Need help choosing?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Service contracts are ideal for recurring customer relationships. Partnership agreements
              work best for business-to-business collaborations with shared responsibilities.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        {onBack ? (
          <button
            onClick={onBack}
            className="px-6 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleContinue}
          disabled={!selectedType}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
            ${selectedType
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ContractTypeStep;

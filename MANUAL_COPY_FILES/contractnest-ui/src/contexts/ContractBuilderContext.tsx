// src/contexts/ContractBuilderContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Template } from '../types/contracts/template';
import { ContractType } from '../types/contracts/contract';

// Contract data interface
export interface ContractData {
  type?: ContractType;
  template?: Template;
  recipient?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    type: 'individual' | 'business';
  };
  services?: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    frequency: string;
    isIncluded: boolean;
  }>;
  equipment?: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    isIncluded: boolean;
  }>;
  terms?: Array<{
    id: string;
    title: string;
    content: string;
    isRequired: boolean;
    isIncluded: boolean;
  }>;
  acceptanceConfig?: {
    method: 'click' | 'signature' | 'email';
    requiresDeposit: boolean;
    depositAmount?: number;
    depositPercentage?: number;
    expirationPeriod: string;
    customExpirationDays?: number;
    reminderEnabled: boolean;
    reminderDays?: number[];
  };
  billingConfig?: {
    frequency: 'monthly' | 'quarterly' | 'annually' | 'per-service';
    paymentMethods: string[];
    autoCharge: boolean;
    invoicePrefix: string;
    nextInvoiceNumber: number;
    dueDays: number;
    lateFee: number;
    lateFeeType: 'percentage' | 'flat';
  };
  startDate?: Date;
  duration?: string;
  customDuration?: number;
  timeline?: Array<{
    id: string;
    date: Date;
    title: string;
    description: string;
    type: string;
  }>;
}

// State interface
export interface ContractBuilderState {
  currentStep: number;
  completedSteps: number[];
  contractData: ContractData;
  isDraft: boolean;
  lastSaved: Date | null;
  isLoading: boolean;
  error: string | null;
}

// Action types
type ContractBuilderAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'MARK_STEP_COMPLETED'; payload: number }
  | { type: 'UPDATE_CONTRACT_DATA'; payload: Partial<ContractData> }
  | { type: 'SET_TEMPLATE'; payload: Template }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SAVE_DRAFT' }
  | { type: 'RESET' };

// Initial state
const initialState: ContractBuilderState = {
  currentStep: 0,
  completedSteps: [],
  contractData: {},
  isDraft: true,
  lastSaved: null,
  isLoading: false,
  error: null,
};

// Reducer
function contractBuilderReducer(
  state: ContractBuilderState,
  action: ContractBuilderAction
): ContractBuilderState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };

    case 'PREVIOUS_STEP':
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };

    case 'MARK_STEP_COMPLETED':
      if (state.completedSteps.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload],
      };

    case 'UPDATE_CONTRACT_DATA':
      return {
        ...state,
        contractData: { ...state.contractData, ...action.payload },
      };

    case 'SET_TEMPLATE':
      return {
        ...state,
        contractData: { ...state.contractData, template: action.payload },
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SAVE_DRAFT':
      return { ...state, isDraft: true, lastSaved: new Date() };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context interface
interface ContractBuilderContextType {
  state: ContractBuilderState;
  dispatch: React.Dispatch<ContractBuilderAction>;
}

// Create context
const ContractBuilderContext = createContext<ContractBuilderContextType | null>(null);

// Provider props
interface ContractBuilderProviderProps {
  children: ReactNode;
  initialContractType?: ContractType;
}

// Provider component
export const ContractBuilderProvider: React.FC<ContractBuilderProviderProps> = ({
  children,
  initialContractType,
}) => {
  const [state, dispatch] = useReducer(contractBuilderReducer, {
    ...initialState,
    contractData: initialContractType ? { type: initialContractType } : {},
  });

  return (
    <ContractBuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </ContractBuilderContext.Provider>
  );
};

// Hook to use the context
export const useContractBuilder = (): ContractBuilderContextType => {
  const context = useContext(ContractBuilderContext);
  if (!context) {
    throw new Error('useContractBuilder must be used within a ContractBuilderProvider');
  }
  return context;
};

export default ContractBuilderContext;

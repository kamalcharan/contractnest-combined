// src/types/contactCockpit.ts
// Contact Cockpit Type Definitions

export interface ContractSummaryItem {
  id: string;
  contract_number: string;
  name: string;
  status: string;
  grand_total: number;
  currency: string;
  created_at: string;
  acceptance_method: string;
  duration_value: number;
  duration_unit: string;
}

export interface ContractsSummary {
  total: number;
  by_status: Record<string, number>;
  contracts: ContractSummaryItem[];
}

export interface EventsSummary {
  total: number;
  completed: number;
  overdue: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface OverdueEvent {
  id: string;
  contract_id: string;
  contract_number: string;
  contract_name: string;
  event_type: 'service' | 'billing';
  block_name: string;
  scheduled_date: string;
  days_overdue: number;
  status: string;
  amount?: number;
  currency?: string;
  assigned_to?: string;
  assigned_to_name?: string;
}

export interface UpcomingEvent {
  id: string;
  contract_id: string;
  contract_number: string;
  contract_name: string;
  event_type: 'service' | 'billing';
  block_name: string;
  scheduled_date: string;
  days_until: number;
  is_today: boolean;
  status: string;
  amount?: number;
  currency?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  sequence_number: number;
  total_occurrences: number;
}

export interface ContactCockpitData {
  contact_id: string;
  contracts: ContractsSummary;
  events: EventsSummary;
  overdue_events: OverdueEvent[];
  upcoming_events: UpcomingEvent[];
  ltv: number;
  outstanding: number;
  health_score: number;
  days_ahead: number;
}

export interface ContactCockpitResponse {
  success: boolean;
  data?: ContactCockpitData;
  error?: string;
  generated_at?: string;
}

// Date range options for events filter
export type DateRangeOption = '7' | '14' | '30' | '90' | 'custom';

export interface DateRangeConfig {
  value: DateRangeOption;
  label: string;
  days: number;
}

export const DATE_RANGE_OPTIONS: DateRangeConfig[] = [
  { value: '7', label: 'Next 7 Days', days: 7 },
  { value: '14', label: 'Next Fortnight', days: 14 },
  { value: '30', label: 'Next Month', days: 30 },
  { value: '90', label: 'Next Quarter', days: 90 },
  { value: 'custom', label: 'Custom Range', days: 0 },
];

// Contract creation options based on classification
export interface ContractCreationOption {
  id: string;
  label: string;
  contractType: 'client' | 'vendor' | 'partner';
  icon: string;
  color: string;
}

export const getContractCreationOptions = (
  classifications: string[]
): ContractCreationOption[] => {
  const options: ContractCreationOption[] = [];

  // Client classification - can create client contracts
  if (classifications.includes('client')) {
    options.push({
      id: 'client-contract',
      label: 'Client Contract',
      contractType: 'client',
      icon: 'FileText',
      color: 'green',
    });
  }

  // Vendor classification - can create client + vendor contracts
  if (classifications.includes('vendor')) {
    if (!options.find(o => o.id === 'client-contract')) {
      options.push({
        id: 'client-contract',
        label: 'Client Contract',
        contractType: 'client',
        icon: 'FileText',
        color: 'green',
      });
    }
    options.push({
      id: 'vendor-contract',
      label: 'Vendor Contract',
      contractType: 'vendor',
      icon: 'Truck',
      color: 'blue',
    });
  }

  // Partner classification - can create all contract types
  if (classifications.includes('partner')) {
    if (!options.find(o => o.id === 'client-contract')) {
      options.push({
        id: 'client-contract',
        label: 'Client Contract',
        contractType: 'client',
        icon: 'FileText',
        color: 'green',
      });
    }
    if (!options.find(o => o.id === 'vendor-contract')) {
      options.push({
        id: 'vendor-contract',
        label: 'Vendor Contract',
        contractType: 'vendor',
        icon: 'Truck',
        color: 'blue',
      });
    }
    options.push({
      id: 'partner-contract',
      label: 'Partner Contract',
      contractType: 'partner',
      icon: 'Handshake',
      color: 'purple',
    });
  }

  return options;
};

// src/utils/constants/contracts.ts
// Contract-specific constants for the ContractNest application

// ============================================
// ACCEPTANCE METHOD CONFIGURATION
// ============================================

export const ACCEPTANCE_METHODS = {
  PAYMENT: 'payment',
  SIGNOFF: 'signoff',
  AUTO: 'auto'
} as const;

export const ACCEPTANCE_METHOD_CONFIG = [
  {
    id: 'payment',
    label: 'Payment',
    description: 'Contract is accepted when the buyer completes payment. Ideal for service agreements and product orders.',
    shortDescription: 'Accept on payment completion',
    lucideIcon: 'CreditCard',
    colorKey: 'green',
    features: [
      'Payment triggers acceptance',
      'Automatic status update',
      'Payment receipt generated'
    ]
  },
  {
    id: 'signoff',
    label: 'Sign-off',
    description: 'Contract is accepted when the buyer reviews and approves. Best for agreements requiring explicit consent.',
    shortDescription: 'Accept on buyer approval',
    lucideIcon: 'PenTool',
    colorKey: 'blue',
    features: [
      'Digital signature capture',
      'Approval workflow',
      'Audit trail maintained'
    ]
  },
  {
    id: 'auto',
    label: 'Auto-Accept',
    description: 'Contract is automatically accepted upon delivery. Suitable for standard terms and recurring services.',
    shortDescription: 'Accept automatically',
    lucideIcon: 'CheckCircle',
    colorKey: 'purple',
    features: [
      'No action required',
      'Instant activation',
      'Time-based acceptance'
    ]
  }
] as const;

// Acceptance method color mapping - consistent hex colors
export const ACCEPTANCE_METHOD_HEX_COLORS: Record<string, string> = {
  green: '#10B981',   // Payment
  blue: '#3B82F6',    // Sign-off
  purple: '#8B5CF6',  // Auto
  default: '#6B7280'  // Default gray
};

// Get acceptance method config by ID
export const getAcceptanceMethodConfig = (id: string) => {
  return ACCEPTANCE_METHOD_CONFIG.find(config => config.id === id);
};

// Get acceptance method label
export const getAcceptanceMethodLabel = (id: string): string => {
  const config = getAcceptanceMethodConfig(id);
  return config?.label || id;
};

// Get acceptance method color
export const getAcceptanceMethodColor = (id: string): string => {
  const config = getAcceptanceMethodConfig(id);
  return config?.colorKey || 'default';
};

// Get acceptance method colors for UI contexts
export const getAcceptanceMethodColors = (
  colorKey: string,
  themeColors: any,
  isSelected: boolean = false
) => {
  const hexColor = ACCEPTANCE_METHOD_HEX_COLORS[colorKey] || ACCEPTANCE_METHOD_HEX_COLORS.default;

  if (isSelected) {
    return {
      bg: hexColor + '20',
      text: hexColor,
      border: hexColor,
      iconBg: hexColor + '30'
    };
  }

  return {
    bg: 'transparent',
    text: themeColors?.utility?.secondaryText || '#6B7280',
    border: (themeColors?.utility?.primaryText || '#111827') + '20',
    iconBg: (themeColors?.utility?.primaryText || '#111827') + '10'
  };
};

// ============================================
// CONTRACT STATUS CONFIGURATION
// ============================================

export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  ON_HOLD: 'on_hold'
} as const;

export const CONTRACT_STATUS_CONFIG = [
  {
    id: 'draft',
    label: 'Draft',
    description: 'Contract is being prepared',
    colorKey: 'gray',
    lucideIcon: 'FileEdit'
  },
  {
    id: 'submitted',
    label: 'Submitted to Customer',
    description: 'Contract sent to buyer for review',
    colorKey: 'blue',
    lucideIcon: 'Send'
  },
  {
    id: 'accepted',
    label: 'Accepted',
    description: 'Buyer has accepted the contract',
    colorKey: 'green',
    lucideIcon: 'CheckCircle'
  },
  {
    id: 'active',
    label: 'Active',
    description: 'Contract is currently in effect',
    colorKey: 'emerald',
    lucideIcon: 'Play'
  },
  {
    id: 'completed',
    label: 'Completed',
    description: 'Contract fulfilled successfully',
    colorKey: 'teal',
    lucideIcon: 'CheckCheck'
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    description: 'Contract was cancelled',
    colorKey: 'red',
    lucideIcon: 'XCircle'
  },
  {
    id: 'expired',
    label: 'Expired',
    description: 'Contract validity period ended',
    colorKey: 'orange',
    lucideIcon: 'AlertTriangle'
  },
  {
    id: 'on_hold',
    label: 'On Hold',
    description: 'Contract temporarily paused',
    colorKey: 'yellow',
    lucideIcon: 'Pause'
  }
] as const;

// Status color mapping - consistent hex colors
export const CONTRACT_STATUS_HEX_COLORS: Record<string, string> = {
  gray: '#6B7280',     // Draft
  blue: '#3B82F6',     // Submitted
  green: '#10B981',    // Accepted
  emerald: '#059669',  // Active
  teal: '#14B8A6',     // Completed
  red: '#EF4444',      // Cancelled
  orange: '#F59E0B',   // Expired
  yellow: '#EAB308',   // On Hold
  default: '#6B7280'
};

// Get status config by ID
export const getContractStatusConfig = (id: string) => {
  return CONTRACT_STATUS_CONFIG.find(config => config.id === id);
};

// Get status label
export const getContractStatusLabel = (id: string): string => {
  const config = getContractStatusConfig(id);
  return config?.label || id;
};

// Get status color
export const getContractStatusColor = (id: string): string => {
  const config = getContractStatusConfig(id);
  return CONTRACT_STATUS_HEX_COLORS[config?.colorKey || 'default'];
};

// ============================================
// CONTRACT DURATION CONFIGURATION
// ============================================

export const DURATION_UNITS = {
  DAYS: 'days',
  MONTHS: 'months',
  YEARS: 'years'
} as const;

export const DURATION_UNIT_CONFIG = [
  { id: 'days', label: 'Days', labelSingular: 'Day', multiplier: 1 },
  { id: 'months', label: 'Months', labelSingular: 'Month', multiplier: 30 },
  { id: 'years', label: 'Years', labelSingular: 'Year', multiplier: 365 }
] as const;

// Helper to convert duration to days
export const convertToDays = (value: number, unit: string): number => {
  const unitConfig = DURATION_UNIT_CONFIG.find(u => u.id === unit);
  return value * (unitConfig?.multiplier || 1);
};

// Helper to get duration label
export const getDurationLabel = (value: number, unit: string): string => {
  const unitConfig = DURATION_UNIT_CONFIG.find(u => u.id === unit);
  if (!unitConfig) return `${value} days`;
  return `${value} ${value === 1 ? unitConfig.labelSingular : unitConfig.label}`;
};

export const CONTRACT_DURATION_PRESETS = [
  { value: 7, unit: 'days', label: '1 Week' },
  { value: 14, unit: 'days', label: '2 Weeks' },
  { value: 1, unit: 'months', label: '1 Month' },
  { value: 3, unit: 'months', label: '3 Months' },
  { value: 6, unit: 'months', label: '6 Months' },
  { value: 1, unit: 'years', label: '1 Year' },
  { value: 2, unit: 'years', label: '2 Years' }
] as const;

// ============================================
// GRACE PERIOD / PROLONGATION CONFIGURATION
// ============================================

export const GRACE_PERIOD_PRESETS = [
  { value: 0, label: 'No Grace Period' },
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' }
] as const;

// Contract title constraints
export const CONTRACT_TITLE_MAX_LENGTH = 80;
export const CONTRACT_DESCRIPTION_MAX_LENGTH = 2000;

// ============================================
// CONTRACT BLOCK TYPES
// ============================================

export const CONTRACT_BLOCK_TYPES = {
  SERVICE: 'service',
  PRODUCT: 'product',
  MILESTONE: 'milestone',
  RECURRING: 'recurring',
  EXPENSE: 'expense'
} as const;

export const CONTRACT_BLOCK_TYPE_CONFIG = [
  {
    id: 'service',
    label: 'Service',
    description: 'One-time service delivery',
    lucideIcon: 'Briefcase',
    colorKey: 'blue'
  },
  {
    id: 'product',
    label: 'Product',
    description: 'Physical or digital product',
    lucideIcon: 'Package',
    colorKey: 'green'
  },
  {
    id: 'milestone',
    label: 'Milestone',
    description: 'Project milestone payment',
    lucideIcon: 'Flag',
    colorKey: 'purple'
  },
  {
    id: 'recurring',
    label: 'Recurring',
    description: 'Subscription or recurring fee',
    lucideIcon: 'Repeat',
    colorKey: 'orange'
  },
  {
    id: 'expense',
    label: 'Expense',
    description: 'Reimbursable expense',
    lucideIcon: 'Receipt',
    colorKey: 'gray'
  }
] as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AcceptanceMethod = typeof ACCEPTANCE_METHODS[keyof typeof ACCEPTANCE_METHODS];
export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];
export type ContractBlockType = typeof CONTRACT_BLOCK_TYPES[keyof typeof CONTRACT_BLOCK_TYPES];
export type DurationUnit = typeof DURATION_UNITS[keyof typeof DURATION_UNITS];

// ============================================
// EXPORT ALL CONSTANTS
// ============================================

export const CONTRACTS_CONSTANTS = {
  ACCEPTANCE_METHODS,
  ACCEPTANCE_METHOD_CONFIG,
  CONTRACT_STATUS,
  CONTRACT_STATUS_CONFIG,
  CONTRACT_STATUS_HEX_COLORS,
  CONTRACT_DURATION_PRESETS,
  DURATION_UNITS,
  DURATION_UNIT_CONFIG,
  GRACE_PERIOD_PRESETS,
  CONTRACT_BLOCK_TYPES,
  CONTRACT_BLOCK_TYPE_CONFIG,
  CONTRACT_TITLE_MAX_LENGTH,
  CONTRACT_DESCRIPTION_MAX_LENGTH
} as const;

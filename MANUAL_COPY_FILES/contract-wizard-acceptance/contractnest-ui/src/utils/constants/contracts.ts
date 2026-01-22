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
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
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
    id: 'pending',
    label: 'Pending',
    description: 'Awaiting buyer acceptance',
    colorKey: 'yellow',
    lucideIcon: 'Clock'
  },
  {
    id: 'active',
    label: 'Active',
    description: 'Contract is in effect',
    colorKey: 'green',
    lucideIcon: 'CheckCircle'
  },
  {
    id: 'completed',
    label: 'Completed',
    description: 'Contract fulfilled successfully',
    colorKey: 'blue',
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
  }
] as const;

// ============================================
// CONTRACT DURATION PRESETS
// ============================================

export const CONTRACT_DURATION_PRESETS = [
  { value: 7, label: '1 Week' },
  { value: 14, label: '2 Weeks' },
  { value: 30, label: '1 Month' },
  { value: 60, label: '2 Months' },
  { value: 90, label: '3 Months' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '1 Year' },
  { value: 0, label: 'Custom' }
] as const;

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

// ============================================
// EXPORT ALL CONSTANTS
// ============================================

export const CONTRACTS_CONSTANTS = {
  ACCEPTANCE_METHODS,
  ACCEPTANCE_METHOD_CONFIG,
  CONTRACT_STATUS,
  CONTRACT_STATUS_CONFIG,
  CONTRACT_DURATION_PRESETS,
  CONTRACT_BLOCK_TYPES,
  CONTRACT_BLOCK_TYPE_CONFIG
} as const;

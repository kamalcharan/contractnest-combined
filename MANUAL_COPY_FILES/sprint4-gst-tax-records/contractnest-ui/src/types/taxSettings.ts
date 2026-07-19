// src/types/taxSettings.ts
// Local type definitions for Tax Settings UI components
// Extends the global tax types from the API layer

// Re-export the main types from global tax types
export type {
  TaxSettings,
  TaxRate,
  TaxSettingsResponse,
  TaxSettingsRequest,
  CreateTaxRateRequest,
  UpdateTaxRateRequest
} from '../../../../types/taxTypes';

// UI-specific interfaces for components

/**
 * Tax Settings section types (for left panel navigation)
 */
export type TaxSection = 'tax-display' | 'tax-rates';

export interface TaxSectionConfig {
  id: TaxSection;
  label: string;
  description: string;
  icon?: string;
}

/**
 * Tax Display form data (for the display settings panel)
 */
export interface TaxDisplayFormData {
  display_mode: 'including_tax' | 'excluding_tax' | 'no_tax';
}

/**
 * Tax Rate form data (for create/edit forms)
 */
export interface TaxRateFormData {
  name: string;
  rate: number;
  description: string;
 // sequence_no: number | null;
  is_default: boolean;
}

/**
 * Tax Rate with UI-specific properties
 */
export interface TaxRateWithUI extends TaxRate {
  isEditing?: boolean;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}

export interface DuplicateErrorResponse {
  error: string;
  code: 'DUPLICATE_TAX_RATE';
  existing_rate: {
    name: string;
    rate: number;
    id: string;
  };
  user_input?: {
    name: string;
    normalized_name: string;
    rate: number;
  };
}


/**
 * Component state interfaces
 */
export interface TaxDisplayState {
  loading: boolean;
  saving: boolean;
  data: TaxSettings | null;
  error: string | null;
  hasUnsavedChanges: boolean;
}

export interface TaxRatesState {
  loading: boolean;
  saving: boolean;
  data: TaxRateWithUI[];
  error: string | null;
  editingId: string | null;
  deletingId: string | null;
  isAdding: boolean;
}

/**
 * API operation states
 */
export interface ApiOperationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

/**
 * Tax rate action types for the rate cards
 */
export type TaxRateAction = 'edit' | 'delete' | 'set-default' | 'activate' | 'deactivate';

/**
 * Tax rate card props interface
 */
export interface TaxRateCardProps {
  rate: TaxRateWithUI;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onSave: (id: string, data: Partial<TaxRateFormData>) => Promise<void>;
  onCancel: (id: string) => void;
  disabled?: boolean;
  isDefaultChanging?: boolean;
}

/**
 * Add tax rate modal props
 */
export interface AddTaxRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaxRateFormData) => Promise<void>;
  existingRates: TaxRate[];
 // nextSequence: number;
}

/**
 * Delete confirmation dialog props
 */
export interface DeleteTaxRateDialogProps {
  isOpen: boolean;
  rate: TaxRate | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

/**
 * Hook return types
 */
export interface UseTaxDisplayReturn {
  // State
  state: TaxDisplayState;
  
  // Actions
  updateDisplayMode: (mode: 'including_tax' | 'excluding_tax' | 'no_tax') => Promise<void>;
  refresh: () => Promise<void>;
  
  // Utils
  resetChanges: () => void;
  validateForm: (data: TaxDisplayFormData) => ValidationResult;
}

export interface UseTaxRatesReturn {
  // State
  state: TaxRatesState;
  
  // Actions
  createRate: (data: TaxRateFormData) => Promise<void>;
  updateRate: (id: string, data: Partial<TaxRateFormData>) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  setDefaultRate: (id: string) => Promise<void>;
  activateRate: (id: string) => Promise<void>;
  
  // Edit state management
  startEditing: (id: string) => void;
  cancelEditing: (id: string) => void;
  startAdding: () => void;
  cancelAdding: () => void;
  
  // Utils
  refresh: () => Promise<void>;
  getNextSequence: () => number;
  validateRate: (data: Partial<TaxRateFormData>) => ValidationResult;
  checkNameExists: (name: string, excludeId?: string) => boolean;
}

/**
 * Toast notification types for tax operations
 */
export interface TaxToastConfig {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

/**
 * Constants for the tax settings UI
 */
export const TAX_SECTIONS: TaxSectionConfig[] = [
  {
    id: 'tax-display',
    label: 'Tax Display',
    description: 'How prices are displayed on the proposal pricing page'
  },
  {
    id: 'tax-rates',
    label: 'Tax Rates',
    description: 'Calculate tax on services'
  }
];

export const DISPLAY_MODE_OPTIONS = [
  {
    value: 'excluding_tax' as const,
    label: 'Excluding tax',
    description: 'Show prices without tax included'
  },
  {
    value: 'including_tax' as const,
    label: 'Including tax',
    description: 'Show prices with tax included'
  },
  {
    value: 'no_tax' as const,
    label: 'No tax',
    description: 'Not tax-registered — invoices carry no tax; the rate picker is hidden'
  }
];

/**
 * Validation constants
 */
export const VALIDATION_RULES = {
  TAX_RATE: {
    MIN: 0,
    MAX: 100,
    DECIMAL_PLACES: 2
  },
  TAX_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9\s\-_()%]+$/
  },
  DESCRIPTION: {
    MAX_LENGTH: 500
  },
  SEQUENCE: {
    MIN: 1,
    MAX: 9999
  }
};

/**
 * Default values
 */
export const DEFAULT_VALUES = {
  DISPLAY_MODE: 'excluding_tax' as const,
  TAX_RATE: 0,
  SEQUENCE_INCREMENT: 10,
  DEBOUNCE_DELAY: 300
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_RATE: 'Rate must be between 0 and 100',
  INVALID_NAME: 'Name can only contain letters, numbers, spaces, hyphens, underscores, parentheses, and percent signs',
  NAME_TOO_LONG: 'Name cannot exceed 100 characters',
  DESCRIPTION_TOO_LONG: 'Description cannot exceed 500 characters',
  DUPLICATE_NAME: 'A tax rate with this name already exists',
  INVALID_SEQUENCE: 'Sequence number must be between 1 and 9999',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please fix the validation errors before saving',
  SAVE_ERROR: 'Failed to save changes. Please try again.',
  DELETE_ERROR: 'Failed to delete tax rate. Please try again.',
  LOAD_ERROR: 'Failed to load tax settings. Please refresh the page.',
  DEFAULT_RATE_DELETE: 'Cannot delete the default tax rate. Please set another rate as default first.',
  CONCURRENT_MODIFICATION: 'This record was modified by another user. Please refresh and try again.'
};
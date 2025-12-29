// src/types/service-contracts/template.ts
export type ContractType = 'service' | 'partnership';
export type ComplexityLevel = 'simple' | 'medium' | 'complex';
export type TemplateStatus = 'active' | 'draft' | 'archived';

// Core template interface
export interface Template {
  id: string;
  name: string;
  description: string;
  industry: string;
  contractType: ContractType;
  estimatedDuration: string;
  complexity: ComplexityLevel;
  tags: string[];
  blocks: string[];
  previewImage?: string;
  usageCount: number;
  rating: number;
  isPopular: boolean;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // New: Global Template Fields
  globalTemplate: boolean;        // True for global templates, false for tenant templates
  globalTemplateId?: string;      // Reference to original global template (for copied templates)
  tenantId: string;              // Owner tenant ID ("admin" for global templates)
  
  // Existing optional fields
  isLive?: boolean;
}

// Industry configuration
export interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
  templateCount: number;
  isActive: boolean;
}

// Template filtering and search
export interface TemplateFilters {
  industry?: string;
  contractType?: ContractType;
  complexity?: ComplexityLevel;
  tags?: string[];
  isPopular?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'usageCount' | 'rating' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  
  // New: Global/Local filtering
  globalTemplate?: boolean;       // Filter by global vs local templates
  tenantId?: string;             // Filter by specific tenant
}

// Template search result
export interface TemplateSearchResult {
  templates: Template[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: TemplateFilters;
}

// Template statistics
export interface TemplateStats {
  total: number;
  service: number;
  partnership: number;
  popular: number;
  industries: number;
  byIndustry: Record<string, number>;
  byComplexity: Record<ComplexityLevel, number>;
  averageRating: number;
  totalUsage: number;
  
  // New: Global/Local stats
  global: number;                // Count of global templates
  local: number;                 // Count of local templates
  byTenant?: Record<string, number>; // Templates count by tenant
}

// Template preview data
export interface TemplatePreview {
  template: Template;
  blockDetails: BlockPreview[];
  estimatedFields: number;
  sampleTimeline?: TimelineEvent[];
}

// Block preview for template
export interface BlockPreview {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'event' | 'content' | 'commercial';
  isRequired: boolean;
  estimatedFields: number;
  dependencies: string[];
}

// Timeline preview
export interface TimelineEvent {
  id: string;
  name: string;
  type: 'milestone' | 'service' | 'billing' | 'review';
  estimatedDate: string;
  description: string;
}

// Template creation/update payload
export interface CreateTemplatePayload {
  name: string;
  description: string;
  industry: string;
  contractType: ContractType;
  estimatedDuration: string;
  complexity: ComplexityLevel;
  tags: string[];
  blocks: string[];
  previewImage?: string;
  
  // New: Global template creation
  globalTemplate?: boolean;      // Default false for tenant templates
  tenantId?: string;            // Auto-set based on user context
}

export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
  id: string;
}

// Template copying payload (for global to local template copying)
export interface CopyTemplatePayload {
  sourceTemplateId: string;      // Original global template ID
  name?: string;                 // Optional new name
  description?: string;          // Optional new description
  tags?: string[];              // Optional additional tags
}

// Template validation
export interface TemplateValidation {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: TemplateValidationWarning[];
}

export interface TemplateValidationError {
  field: string;
  message: string;
  code: string;
}

export interface TemplateValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// API response wrappers
export interface TemplateResponse {
  success: boolean;
  data: Template;
  message?: string;
}

export interface TemplatesResponse {
  success: boolean;
  data: TemplateSearchResult;
  message?: string;
}

export interface TemplateStatsResponse {
  success: boolean;
  data: TemplateStats;
  message?: string;
}

// Template selection for contract creation
export interface TemplateSelection {
  templateId: string;
  template: Template;
  selectedAt: string;
  customizations?: TemplateCustomization[];
  
  // New: Track if copied from global template
  copiedFromGlobal?: boolean;
  originalGlobalTemplateId?: string;
}

export interface TemplateCustomization {
  blockId: string;
  modifications: Record<string, any>;
  reason?: string;
}

// Template card display props
export interface TemplateCardProps {
  template: Template;
  onClick?: (template: Template) => void;
  onPreview?: (template: Template) => void;
  onSelect?: (template: Template) => void;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
  
  // New: Context for dynamic behavior
  context?: TemplateCardContext;
}

// New: Template card context for different usage scenarios
export interface TemplateCardContext {
  mode: 'marketplace' | 'management' | 'selection';
  isGlobal: boolean;
  userRole: 'admin' | 'user';
  canEdit?: boolean;
  canCopy?: boolean;
  canCreateContract?: boolean;
}

// Template gallery props
export interface TemplateGalleryProps {
  initialFilters?: TemplateFilters;
  onTemplateSelect?: (template: Template) => void;
  allowMultiSelect?: boolean;
  showPreview?: boolean;
  showStats?: boolean;
  embedMode?: boolean;
  
  // New: Context for gallery behavior
  context?: TemplateGalleryContext;
}

// New: Template gallery context
export interface TemplateGalleryContext {
  mode: 'marketplace' | 'management' | 'selection';
  isGlobal?: boolean;
  userRole: 'admin' | 'user';
  allowedActions?: string[];
}

// Hook return types
export interface UseTemplatesReturn {
  templates: Template[];
  loading: boolean;
  error: string | null;
  pagination: TemplateSearchResult['pagination'] | null;
  filters: TemplateFilters;
  stats: TemplateStats | null;
  refetch: () => Promise<void>;
  updateFilters: (filters: Partial<TemplateFilters>) => void;
  clearFilters: () => void;
  searchTemplates: (query: string) => void;
  
  // New: Global/Local template operations
  copyGlobalTemplate: (templateId: string, payload?: Partial<CopyTemplatePayload>) => Promise<Template>;
  getGlobalTemplates: () => Template[];
  getLocalTemplates: () => Template[];
}

export interface UseTemplatePreviewReturn {
  preview: TemplatePreview | null;
  loading: boolean;
  error: string | null;
  generatePreview: (templateId: string) => Promise<void>;
  clearPreview: () => void;
}

// Constants and enums
export const TEMPLATE_COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  simple: 'Simple',
  medium: 'Medium',
  complex: 'Complex'
};

export const TEMPLATE_COMPLEXITY_DESCRIPTIONS: Record<ComplexityLevel, string> = {
  simple: 'Basic contract with minimal customization',
  medium: 'Standard contract with moderate complexity',
  complex: 'Advanced contract with extensive customization'
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  service: 'Service Contract',
  partnership: 'Partnership Agreement'
};

export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  service: 'Direct business relationship between buyer and seller',
  partnership: 'Revenue sharing and collaboration agreement'
};

// Default values
export const DEFAULT_TEMPLATE_FILTERS: TemplateFilters = {
  page: 1,
  limit: 12,
  sortBy: 'usageCount',
  sortOrder: 'desc'
};

export const ITEMS_PER_PAGE_OPTIONS = [6, 12, 24, 48] as const;
export const TEMPLATE_SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'usageCount', label: 'Most Used' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Recently Updated' }
] as const;
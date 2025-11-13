// src/types/resources.ts
// Frontend-specific types for Resources UI - UPDATED VERSION

// Base interfaces matching API responses
export interface ResourceType {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  pricing_model?: 'hourly' | 'per_unit' | 'fixed';
  requires_human_assignment: boolean;  // CRITICAL - determines behavior!
  has_capacity_limits?: boolean;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string | null;
  contact_classification: 'buyer' | 'seller' | 'vendor' | 'partner' | 'team_member';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  tenant_id: string;
  is_live: boolean;
  resource_type_id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  contact_id?: string | null;
  attributes?: Record<string, any> | null;
  availability_config?: Record<string, any> | null;
  is_custom: boolean;
  master_template_id?: string | null;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // UI-specific fields from edge function transformation
  display_name: string;
  hexcolor?: string | null;
  sequence_no?: number | null;
  is_deletable: boolean;
  tags?: Record<string, any> | null;
  form_settings?: Record<string, any> | null;
  
  // Populated from joins
  contact?: Contact | null;
  resource_type?: ResourceType | null;
}

// Form interfaces for create/edit operations
export interface CreateResourceFormData {
  resource_type_id: string;
  name: string;
  display_name: string;
  description?: string;
  code?: string;
  hexcolor?: string;
  sequence_no?: number;
  contact_id?: string;
  attributes?: Record<string, any>;
  availability_config?: Record<string, any>;
  tags?: Record<string, any>;
  form_settings?: Record<string, any>;
  is_active?: boolean;
  is_deletable?: boolean;
}

export interface UpdateResourceFormData {
  name?: string;
  display_name?: string;
  description?: string;
  code?: string;
  hexcolor?: string;
  sequence_no?: number;
  contact_id?: string;
  attributes?: Record<string, any>;
  availability_config?: Record<string, any>;
  tags?: Record<string, any>;
  form_settings?: Record<string, any>;
  status?: 'active' | 'inactive' | 'maintenance' | 'retired';
  is_deletable?: boolean;
}

// API response interfaces (matching your backend API)
export interface ResourcesApiResponse {
  success: boolean;
  data: Resource[];
  message?: string;
  timestamp?: string;
  requestId?: string;
  fromCache?: boolean;
}

export interface ResourceTypesApiResponse {
  success: boolean;
  data: ResourceType[];
  message?: string;
  timestamp?: string;
  requestId?: string;
}

export interface SingleResourceApiResponse {
  success: boolean;
  data: Resource;
  message?: string;
  timestamp?: string;
  requestId?: string;
}

export interface NextSequenceApiResponse {
  success: boolean;
  data: {
    nextSequence: number;
  };
  message?: string;
  timestamp?: string;
  requestId?: string;
}

// Error response interface
export interface ResourcesErrorResponse {
  error: string;
  details?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

// Filter and query interfaces
export interface ResourceFilters {
  resourceTypeId?: string;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'display_name' | 'sequence_no' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ResourceQueryParams extends ResourceFilters {
  nextSequence?: boolean;
  resourceId?: string;
}

// UI state interfaces
export interface ResourcesPageState {
  selectedResourceTypeId: string | null;
  searchQuery: string;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  editingResource: Resource | null;
  filters: ResourceFilters;
}

export interface ResourceCardProps {
  resource: Resource;
  resourceType: ResourceType;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
  onToggleStatus?: (resource: Resource) => void;
  showActions?: boolean;
  compact?: boolean;
  isEditMode?: boolean;
}

export interface ResourceFormProps {
  mode: 'create' | 'edit';
  resourceType: ResourceType;
  resource?: Resource;
  onSave: (data: CreateResourceFormData | UpdateResourceFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Form validation interfaces
export interface ResourceFormErrors {
  resource_type_id?: string;
  name?: string;
  display_name?: string;
  description?: string;
  code?: string;
  hexcolor?: string;
  sequence_no?: string;
  contact_id?: string;
  general?: string;
}

export interface ResourceFormState {
  data: CreateResourceFormData | UpdateResourceFormData;
  errors: ResourceFormErrors;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Empty state types
export interface EmptyStateProps {
  type: 'no_resource_types' | 'no_resources_manual' | 'no_resources_contact' | 'no_search_results' | 'error';
  resourceTypeName?: string;
  resourceType?: ResourceType;
  searchQuery?: string;
  onCreateNew?: () => void;
  onClearSearch?: () => void;
  onRetry?: () => void;
  onGoToContacts?: () => void;
}

// Constants for UI
export const RESOURCE_COLORS = [
  '#40E0D0', // Turquoise (default)
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Light Orange
] as const;

export const RESOURCE_VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z0-9\s\-_.()&]+$/, // More flexible pattern for names
    message: 'Name can contain letters, numbers, spaces, and common punctuation'
  },
  display_name: {
    required: true,
    minLength: 1,
    maxLength: 255,
    message: 'Display name is required and must be less than 255 characters'
  },
  description: {
    maxLength: 2000,
    message: 'Description must be less than 2000 characters'
  },
  code: {
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\-_]+$/, // No spaces in codes
    message: 'Code can only contain letters, numbers, hyphens, and underscores'
  },
  hexcolor: {
    pattern: /^#[0-9A-Fa-f]{6}$/,
    message: 'Color must be a valid hex color code (e.g., #40E0D0)'
  },
  sequence_no: {
    min: 1,
    max: 9999,
    message: 'Sequence number must be between 1 and 9999'
  },
} as const;

// Contact classification mapping for resource types
export const CONTACT_CLASSIFICATION_MAP: Record<string, string> = {
  'team_staff': 'team_member',
  'partner': 'partner',  // Fixed: Changed from 'vendor' to 'partner' to match actual contact classifications
} as const;

// Resource type behavior helpers
export const getResourceTypeBehavior = (resourceType: ResourceType) => ({
  isContactBased: resourceType.requires_human_assignment,
  isManualEntry: !resourceType.requires_human_assignment,
  allowsColor: !resourceType.requires_human_assignment,
  allowsEdit: !resourceType.requires_human_assignment,
  allowsDelete: !resourceType.requires_human_assignment,
  contactClassification: CONTACT_CLASSIFICATION_MAP[resourceType.id] || null,
});

// Resource type icons mapping
export const RESOURCE_TYPE_ICONS: Record<string, string> = {
  team_staff: 'Users',
  partner: 'Handshake',
  equipment: 'Wrench',
  consumable: 'Package',
  asset: 'Building',
  facility: 'Home',
  service: 'Zap',
  vehicle: 'Truck',
  software: 'Monitor',
  default: 'Box',
};

export const RESOURCE_TYPE_DESCRIPTIONS: Record<string, string> = {
  team_staff: 'Team members and staff resources',
  partner: 'External partners and vendors',
  equipment: 'Equipment, tools, and machinery',
  consumable: 'Consumable materials and supplies',
  asset: 'Assets and valuable resources',
  facility: 'Facilities, rooms, and locations',
  service: 'Services and capabilities',
  vehicle: 'Vehicles and transportation',
  software: 'Software and digital resources',
};

// Status indicators
export const RESOURCE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
} as const;

export type ResourceStatus = typeof RESOURCE_STATUS[keyof typeof RESOURCE_STATUS];

// Sort options for UI
export const RESOURCE_SORT_OPTIONS = [
  { value: 'sequence_no', label: 'Sequence' },
  { value: 'name', label: 'Name' },
  { value: 'display_name', label: 'Display Name' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' },
] as const;

// Loading states for hooks
export interface ResourcesLoadingState {
  resourceTypes: boolean;
  resources: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  nextSequence: boolean;
}

// Error states for hooks
export interface ResourcesErrorState {
  resourceTypes: string | null;
  resources: string | null;
  creating: string | null;
  updating: string | null;
  deleting: string | null;
  nextSequence: string | null;
}

// Mutation variables for TanStack Query
export interface CreateResourceMutationVariables {
  data: CreateResourceFormData;
  idempotencyKey?: string;
}

export interface UpdateResourceMutationVariables {
  id: string;
  data: UpdateResourceFormData;
  idempotencyKey?: string;
}

export interface DeleteResourceMutationVariables {
  id: string;
  idempotencyKey?: string;
}

// Query keys for TanStack Query
export const RESOURCE_QUERY_KEYS = {
  all: ['resources'] as const,
  types: () => [...RESOURCE_QUERY_KEYS.all, 'types'] as const,
  lists: () => [...RESOURCE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: ResourceFilters) => [...RESOURCE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...RESOURCE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...RESOURCE_QUERY_KEYS.details(), id] as const,
  nextSequence: (resourceTypeId: string) => [...RESOURCE_QUERY_KEYS.all, 'nextSequence', resourceTypeId] as const,
} as const;

// Default values
export const DEFAULT_RESOURCE_FILTERS: ResourceFilters = {
  includeInactive: false,
  page: 1,
  limit: 50,
  sortBy: 'sequence_no',
  sortOrder: 'asc',
};

export const DEFAULT_CREATE_RESOURCE_DATA: Partial<CreateResourceFormData> = {
  hexcolor: RESOURCE_COLORS[0],
  is_active: true,
  is_deletable: true,
  tags: undefined, // Changed from {} to undefined to avoid filter error
  attributes: {},
  availability_config: {},
  form_settings: {},
};

// Type guards
export const isResourceType = (obj: any): obj is ResourceType => {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.name === 'string' &&
         typeof obj.requires_human_assignment === 'boolean';
};

export const isResource = (obj: any): obj is Resource => {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.resource_type_id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.display_name === 'string' &&
         typeof obj.status === 'string';
};

export const isContactBasedResourceType = (resourceType: ResourceType): boolean => {
  return resourceType.requires_human_assignment;
};

export const isManualEntryResourceType = (resourceType: ResourceType): boolean => {
  return !resourceType.requires_human_assignment;
};

// Utility functions
export const getResourceDisplayName = (resource: Resource): string => {
  return resource.display_name || resource.name || 'Untitled Resource';
};

export const getResourceStatus = (resource: Resource): ResourceStatus => {
  return resource.status as ResourceStatus;
};

export const isResourceActive = (resource: Resource): boolean => {
  return resource.status === RESOURCE_STATUS.ACTIVE;
};

export const canEditResource = (resource: Resource, resourceType?: ResourceType): boolean => {
  if (resourceType) {
    return isManualEntryResourceType(resourceType);
  }
  // If no resource type provided, assume it can be edited if it's deletable
  return resource.is_deletable;
};

export const canDeleteResource = (resource: Resource, resourceType?: ResourceType): boolean => {
  if (resourceType) {
    return isManualEntryResourceType(resourceType) && resource.is_deletable;
  }
  return resource.is_deletable;
};

// Utility types
export type ResourceFormMode = 'create' | 'edit';
export type ResourceViewMode = 'grid' | 'list';
export type ResourceSortField = ResourceFilters['sortBy'];
export type ResourceSortOrder = ResourceFilters['sortOrder'];

// Export type aliases for external use
export type {
  ResourceFilters as ResourcesFilters,
  ResourceQueryParams as ResourcesQueryParams,
  CreateResourceFormData as CreateResourceRequest,
  UpdateResourceFormData as UpdateResourceRequest,
};
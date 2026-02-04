// src/types/contact.ts - UPDATED VERSION with JSONB parent_contact_ids

// ============================================================
// BASE INTERFACES - Matching Database & API Structure
// ============================================================

/**
 * Contact Channel - Communication methods
 * Matches database table: t_contact_channels
 */
export interface ContactChannel {
  id?: string;
  channel_type: string; // 'mobile' | 'email' | 'whatsapp' | 'linkedin' | 'website' | 'telegram' | 'skype'
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

/**
 * Contact Address - Physical addresses
 * Matches database table: t_contact_addresses
 */
export interface ContactAddress {
  id?: string;
  type: 'billing' | 'shipping' | 'office' | 'home' | 'factory' | 'warehouse' | 'other';
  label?: string;
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  city: string;
  state?: string;
  state_code?: string;
  country?: string; // Country name
  country_code: string; // Country code (e.g., 'IN', 'US')
  postal_code?: string;
  google_pin?: string;
  is_primary: boolean;
  is_verified?: boolean;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

/**
 * Compliance Number - Tax IDs, licenses, etc.
 */
export interface ComplianceNumber {
  id?: string;
  type_value: string; // The type identifier
  type_label?: string; // Display label
  number: string;
  issuing_authority?: string;
  valid_from?: string;
  valid_to?: string;
  is_verified: boolean;
  notes?: string;
}

/**
 * Contact Tag - Categorization tags
 */
export interface ContactTag {
  id?: string;
  tag_value: string;
  tag_label: string;
  tag_color?: string;
}

/**
 * DEPRECATED: Contact Person - Now contacts are stored as separate records
 * Keep for backward compatibility with existing UI components
 */
export interface ContactPerson {
  id?: string;
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
  name: string;
  designation?: string;
  department?: string;
  is_primary: boolean;
  contact_channels: ContactChannel[];
  notes?: string;
}

// ============================================================
// MAIN CONTACT INTERFACE - UPDATED FOR JSONB PARENTS
// ============================================================

/**
 * Main Contact interface with JSONB parent support
 */
export interface Contact {
  id: string;
  type: 'individual' | 'corporate';
  status: 'active' | 'inactive' | 'archived';

  // Sequential contact identifier (e.g., "CT-1001")
  contact_number?: string;

  // Contact classifications
  classifications: string[]; // ['buyer', 'seller', 'vendor', 'partner', 'team_member']
  
  // Individual fields
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
  name?: string;
  designation?: string;    // For individual contacts working at companies
  department?: string;     // For individual contacts working at companies
  is_primary_contact?: boolean; // For individual contacts - primary at their company
  
  // Corporate fields
  company_name?: string;
  company_registration_number?: string;
  registration_number?: string; // Backend compatibility
  industry?: string;
  
  // UPDATED: Parent relationship (JSONB array)
  parent_contact_ids?: string[];     // Array of parent contact IDs
  
  // NEW: Populated relationship data (from backend)
  parent_contacts?: Contact[];       // Parent contacts (companies this person works for)
  contact_persons?: Contact[];       // Child contacts (people who work for this company)
  
  // Communication and location
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];       // Frontend name
  contact_addresses?: ContactAddress[]; // Backend compatibility
  compliance_numbers: ComplianceNumber[];
  notes?: string;
  tags: ContactTag[];
  
  // Computed/UI fields
  displayName?: string;
  primaryEmail?: ContactChannel | null;
  primaryPhone?: ContactChannel | null;
  primaryAddress?: ContactAddress | null;
  
  // Metadata
  potential_duplicate?: boolean;
  duplicate_reasons?: string[];
  user_account_status?: string; // 'has_account' | 'no_account' | 'invitation_sent' | 'invitation_pending'
  auth_user_id?: string;
  tenant_id?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
}

// ============================================================
// SEARCH RESULT WITH RELATIONSHIP METADATA
// ============================================================

/**
 * Contact search result with relationship context
 */
export interface ContactSearchResult extends Contact {
  isDirectMatch?: boolean;           // True if this was the searched term
  isRelatedContact?: boolean;        // True if this is a related contact  
  relationshipType?: 'parent' | 'child'; // Type of relationship to the direct match
}

// ============================================================
// API REQUEST/RESPONSE TYPES - UPDATED
// ============================================================

/**
 * Create Contact Request - Updated for JSONB parents
 */
export interface CreateContactRequest {
  type: 'individual' | 'corporate';
  classifications: string[];
  status?: 'active' | 'inactive' | 'archived';
  
  // Individual fields
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
  name?: string;
  designation?: string;              // NEW: For individuals working at companies
  department?: string;               // NEW: For individuals working at companies
  is_primary_contact?: boolean;      // NEW: For individuals - primary at company
  
  // Corporate fields
  company_name?: string;
  company_registration_number?: string;
  registration_number?: string;      // Backend compatibility
  industry?: string;
  
  // NEW: Parent relationships (JSONB array)
  parent_contact_ids?: string[];     // Array of parent company IDs
  
  // Communication and location - without IDs for creation
  contact_channels: Omit<ContactChannel, 'id'>[];
  addresses: Omit<ContactAddress, 'id'>[];
  compliance_numbers: Omit<ComplianceNumber, 'id'>[];
  notes?: string;
  tags: ContactTag[];
  
  // REMOVED: contact_persons (now handled as separate contact records)
  
  // System fields (added by service layer)
  tenant_id?: string;
  created_by?: string;
  t_userprofile_id?: string;
}

/**
 * Update Contact Request - Updated for JSONB parents
 */
export interface UpdateContactRequest {
  // Type cannot be changed after creation
  classifications?: string[];
  status?: 'active' | 'inactive' | 'archived';
  
  // Individual fields
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
  name?: string;
  designation?: string;              // NEW: For individuals working at companies
  department?: string;               // NEW: For individuals working at companies
  is_primary_contact?: boolean;      // NEW: For individuals - primary at company
  
  // Corporate fields
  company_name?: string;
  company_registration_number?: string;
  registration_number?: string;      // Backend compatibility
  industry?: string;
  
  // NEW: Parent relationships (JSONB array)
  parent_contact_ids?: string[];     // Array of parent company IDs
  
  // Communication and location - with IDs for updates
  contact_channels?: ContactChannel[];
  addresses?: ContactAddress[];
  compliance_numbers?: ComplianceNumber[];
  notes?: string;
  tags?: ContactTag[];
  
  // REMOVED: contact_persons (now handled as separate contact records)
  
  // System fields
  updated_by?: string;
}

// ============================================================
// FILTER & SEARCH TYPES - ENHANCED
// ============================================================

/**
 * Contact Filters for list operations
 */
export interface ContactFilters {
  status?: 'all' | 'active' | 'inactive' | 'archived';
  type?: 'individual' | 'corporate';
  search?: string;
  classifications?: string[];
  tags?: string[];
  user_status?: 'all' | 'user' | 'not_user';
  show_duplicates?: boolean;
  show_relationships?: boolean;      // NEW: Include relationship data
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  includeArchived?: boolean;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'type' | 'status' | 'company_name';
  sort_order?: 'asc' | 'desc';
}

/**
 * Contact Search Request - Enhanced
 */
export interface ContactSearchRequest {
  query: string;
  filters?: Omit<ContactFilters, 'search'>;
  fuzzy?: boolean;
  includeArchived?: boolean;
  includeRelationships?: boolean;    // NEW: Include parent/child relationships in results
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  validation_errors?: ValidationError[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Duplicate Check Response
 */
export interface DuplicateCheckResponse {
  success: boolean;
  data: {
    hasDuplicates: boolean;
    duplicates: Contact[];
  };
  message?: string;
}

/**
 * Invitation Response
 */
export interface InvitationResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
    invitationId?: string;
  };
  message?: string;
}

/**
 * Contact Statistics
 */
export interface ContactStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  byType: {
    individual: number;
    corporate: number;
  };
  byClassification: {
    buyer: number;
    seller: number;
    vendor: number;
    partner: number;
    team_member: number;
  };
  recentlyCreated: number;
  recentlyUpdated: number;
  duplicates?: number;
  // NEW: Relationship stats
  withParents?: number;              // Individuals with parent companies
  withChildren?: number;             // Companies with contact persons
}

// ============================================================
// HOOK RETURN TYPES - ENHANCED
// ============================================================

/**
 * Contact List Hook Return Type
 */
export interface ContactListHook {
  data: Contact[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  refetch: () => void;
  loadMore: () => void;
  hasNextPage: boolean;
  updateFilters: (filters: Partial<ContactFilters>) => void;
}

/**
 * Single Contact Hook Return Type
 */
export interface ContactHook {
  data: Contact | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Contact Mutation Hook Return Type
 */
export interface ContactMutationHook {
  mutate: (data: any) => Promise<Contact>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Contact Search Hook Return Type - Enhanced
 */
export interface ContactSearchHook {
  search: (query: string, filters?: ContactFilters) => Promise<void>;
  data: ContactSearchResult[];       // Updated to use search result type
  loading: boolean;
  error: string | null;
  clear: () => void;
}

/**
 * Contact Stats Hook Return Type
 */
export interface ContactStatsHook {
  data: ContactStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================
// FORM DATA TYPES (UI Layer) - UPDATED
// ============================================================

/**
 * Contact Form Data - Updated for new parent structure
 */
export interface ContactFormData {
  type: 'individual' | 'corporate';
  classifications: any[];           // Can be objects or strings from UI
  status: 'active' | 'inactive' | 'archived';
  
  // Individual fields
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
  name?: string;
  designation?: string;              // NEW: For individuals working at companies
  department?: string;               // NEW: For individuals working at companies
  is_primary_contact?: boolean;      // NEW: For individuals - primary at company
  
  // Corporate fields
  company_name?: string;
  company_registration_number?: string;
  industry?: string;
  
  // NEW: Parent relationships for UI
  parent_contact_ids?: string[];     // Array of parent company IDs
  selected_parent_companies?: Contact[]; // UI helper for company selection
  
  // Communication and location
  contact_channels: ContactChannel[];
  addresses: any[];                  // Can have address_type or type field
  compliance_numbers: ComplianceNumber[];
  notes?: string;
  tags: any[];                       // Can be strings or objects
  
  // DEPRECATED: Keep for backward compatibility with existing UI
  contact_persons: ContactPerson[];  // Will be phased out
}

/**
 * Classification Option - UI Structure
 */
export interface ClassificationOption {
  id: string;
  classification_value: string;
  classification_label: string;
}

// ============================================================
// CONSTANTS TYPE DEFINITIONS
// ============================================================

/**
 * Contact Constants from backend
 */
export interface ContactConstants {
  types: string[];
  statuses: string[];
  classifications: string[];
  channel_types: string[];
  address_types: string[];
  salutations: Array<{ value: string; label: string }>;
  compliance_types: string[];
  industries?: string[];
}

// ============================================================
// TYPE GUARDS (Runtime Type Checking)
// ============================================================

/**
 * Type guard to check if object is a Contact
 */
export const isContact = (obj: any): obj is Contact => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         ['individual', 'corporate'].includes(obj.type) &&
         ['active', 'inactive', 'archived'].includes(obj.status) &&
         Array.isArray(obj.classifications);
};

/**
 * Type guard to check if object is a ContactChannel
 */
export const isContactChannel = (obj: any): obj is ContactChannel => {
  return obj && typeof obj === 'object' && 
         typeof obj.channel_type === 'string' &&
         typeof obj.value === 'string' &&
         typeof obj.is_primary === 'boolean';
};

/**
 * Type guard to check if object is a ContactAddress
 */
export const isContactAddress = (obj: any): obj is ContactAddress => {
  return obj && typeof obj === 'object' && 
         typeof obj.type === 'string' &&
         typeof obj.address_line1 === 'string' &&
         typeof obj.city === 'string' &&
         typeof obj.country_code === 'string' &&
         typeof obj.is_primary === 'boolean';
};

/**
 * Type guard to check if classification is an object or string
 */
export const isClassificationObject = (obj: any): obj is ClassificationOption => {
  return obj && typeof obj === 'object' && 
         typeof obj.classification_value === 'string' &&
         typeof obj.classification_label === 'string';
};

/**
 * Type guard to check if contact has parent relationships
 */
export const hasParentContacts = (contact: Contact): boolean => {
  return !!(contact.parent_contact_ids && contact.parent_contact_ids.length > 0);
};

/**
 * Type guard to check if contact has child relationships
 */
export const hasContactPersons = (contact: Contact): boolean => {
  return !!(contact.contact_persons && contact.contact_persons.length > 0);
};

// ============================================================
// HELPER TYPES
// ============================================================

/**
 * Contact Form Errors - Validation errors for forms
 */
export type ContactFormErrors = Partial<Record<keyof ContactFormData, string>>;

/**
 * Contact Field Path - For nested field references
 */
export type ContactFieldPath = 
  | keyof Contact
  | `contact_channels.${number}.${keyof ContactChannel}`
  | `addresses.${number}.${keyof ContactAddress}`
  | `contact_persons.${number}.${keyof ContactPerson}`
  | `compliance_numbers.${number}.${keyof ComplianceNumber}`;

/**
 * Contact Type literal
 */
export type ContactType = 'individual' | 'corporate';

/**
 * Contact Status literal
 */
export type ContactStatus = 'active' | 'inactive' | 'archived';

/**
 * Contact Classification literal
 */
export type ContactClassification = 'buyer' | 'seller' | 'vendor' | 'partner' | 'team_member';

/**
 * Channel Type literal
 */
export type ChannelType = 'mobile' | 'email' | 'whatsapp' | 'linkedin' | 'website' | 'telegram' | 'skype';

/**
 * Address Type literal
 */
export type AddressType = 'billing' | 'shipping' | 'office' | 'home' | 'factory' | 'warehouse' | 'other';

/**
 * Relationship Type literal
 */
export type RelationshipType = 'parent' | 'child';

// ============================================================
// MIGRATION HELPERS
// ============================================================

/**
 * Helper to transform old contact person structure to new contact structure
 */
export const transformContactPersonToContact = (
  person: ContactPerson, 
  parentContactId: string
): Omit<CreateContactRequest, 'tenant_id' | 'created_by'> => {
  return {
    type: 'individual',
    name: person.name,
    salutation: person.salutation,
    designation: person.designation,
    department: person.department,
    is_primary_contact: person.is_primary,
    parent_contact_ids: [parentContactId],
    contact_channels: person.contact_channels,
    addresses: [],
    compliance_numbers: [],
    tags: [],
    classifications: ['team_member'], // Default classification for contact persons
    notes: person.notes
  };
};

/**
 * Helper to normalize parent contact IDs
 */
export const normalizeParentContactIds = (parentIds: any): string[] => {
  if (!parentIds) return [];
  if (Array.isArray(parentIds)) return parentIds;
  if (typeof parentIds === 'string') return [parentIds];
  return [];
};

// ============================================================
// EXPORT NAMESPACE (Alternative Import Style)
// ============================================================

/**
 * Namespace export for cleaner imports
 * Usage: import { ContactTypes } from './types/contact';
 *        const contact: ContactTypes.Contact = {...}
 */
export namespace ContactTypes {
  export type Contact = Contact;
  export type CreateRequest = CreateContactRequest;
  export type UpdateRequest = UpdateContactRequest;
  export type Filters = ContactFilters;
  export type SearchRequest = ContactSearchRequest;
  export type SearchResult = ContactSearchResult;
  export type Stats = ContactStats;
  export type Channel = ContactChannel;
  export type Address = ContactAddress;
  export type ComplianceNumber = ComplianceNumber;
  export type ContactPerson = ContactPerson;
  export type Tag = ContactTag;
  export type FormData = ContactFormData;
  export type Constants = ContactConstants;
  export type Classification = ContactClassification;
  export type Type = ContactType;
  export type Status = ContactStatus;
  export type RelationshipType = RelationshipType;
}
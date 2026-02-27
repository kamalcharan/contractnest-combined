// src/services/contactService.ts - COMPLETE VERSION with JSONB parent_contact_ids support

import api from './api';
import { API_ENDPOINTS, buildContactListURL } from './serviceURLs';
import { 
  Contact, 
  CreateContactRequest, 
  UpdateContactRequest, 
  ContactFilters,
  ContactSearchRequest,
  ContactSearchResult,
  ApiResponse,
  PaginatedResponse,
  ContactStats,
  DuplicateCheckResponse,
  InvitationResponse
} from '../types/contact';

/**
 * Contact Service - Domain-specific business logic for contacts
 * UPDATED: Now supports JSONB parent_contact_ids and relationship handling
 */
class ContactService {
  
  // ==========================================================
  // Core CRUD Operations
  // ==========================================================

  /**
   * List contacts with filtering and pagination
   */
  async listContacts(filters: ContactFilters = {}): Promise<PaginatedResponse<Contact>> {
    try {
      // Build URL with proper parameter names that backend expects
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);
      
      // Advanced filters
      if (filters.classifications && filters.classifications.length > 0) {
        params.append('classifications', filters.classifications.join(','));
      }
      if (filters.user_status && filters.user_status !== 'all') {
        params.append('user_status', filters.user_status);
      }
      if (filters.show_duplicates) {
        params.append('show_duplicates', 'true');
      }
      if (filters.show_relationships) {
        params.append('show_relationships', 'true');
      }
      if (filters.includeInactive) {
        params.append('includeInactive', 'true');
      }
      if (filters.includeArchived) {
        params.append('includeArchived', 'true');
      }
      
      const url = `${API_ENDPOINTS.CONTACTS.LIST}?${params.toString()}`;
      
      // Backend returns: { success: boolean, data: Contact[], pagination: {...} }
      const response = await api.get(url);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load contacts');
      }
      
      // Transform response data for UI consumption
      return {
        success: true,
        data: response.data.data.map((contact: any) => this.transformContactForUI(contact)),
        pagination: response.data.pagination,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleContactError(error, 'Failed to load contacts');
    }
  }

  /**
   * Get single contact by ID
   */
  async getContact(contactId: string): Promise<Contact> {
    try {
      if (!this.isValidUUID(contactId)) {
        throw new Error('Invalid contact ID format');
      }

      // Backend returns: { success: boolean, data: Contact }
      const response = await api.get(API_ENDPOINTS.CONTACTS.GET(contactId));
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load contact');
      }
      
      return this.transformContactForUI(response.data.data);
    } catch (error) {
      throw this.handleContactError(error, 'Failed to load contact');
    }
  }

  /**
   * Create new contact
   */
  async createContact(contactData: CreateContactRequest): Promise<Contact> {
    try {
      // Pre-validate contact data
      this.validateContactData(contactData);
      
      // Transform UI data to API format
      const apiData = this.transformContactForAPI(contactData);
      
      // Backend expects exact field names
      const response = await api.post(API_ENDPOINTS.CONTACTS.CREATE, apiData);
      
      if (!response.data.success) {
        // Handle specific error codes from backend
        if (response.data.code === 'DUPLICATE_CONTACTS_FOUND') {
          const error = new Error('Potential duplicate contacts found. Please review before saving.');
          (error as any).duplicates = response.data.duplicates;
          throw error;
        }
        throw new Error(response.data.error || 'Failed to create contact');
      }
      
      return this.transformContactForUI(response.data.data);
    } catch (error: any) {
      // Handle audit logger errors gracefully
      if (error.message?.includes('auditLogger')) {
        console.warn('Contact created but audit logging failed:', error);
        // Return a minimal success response if we know the contact was created
        if (error.response?.data?.data) {
          return this.transformContactForUI(error.response.data.data);
        }
      }
      throw this.handleContactError(error, 'Failed to create contact');
    }
  }

  /**
   * Update existing contact
   */
  async updateContact(contactId: string, updateData: UpdateContactRequest): Promise<Contact> {
    try {
      if (!this.isValidUUID(contactId)) {
        throw new Error('Invalid contact ID format');
      }

      // Transform UI data to API format
      const apiData = this.transformContactForAPI(updateData);
      
      const response = await api.put(API_ENDPOINTS.CONTACTS.UPDATE(contactId), apiData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update contact');
      }
      
      return this.transformContactForUI(response.data.data);
    } catch (error: any) {
      // Handle audit logger errors gracefully
      if (error.message?.includes('auditLogger')) {
        console.warn('Contact updated but audit logging failed:', error);
        // Return a minimal success response if we know the contact was updated
        if (error.response?.data?.data) {
          return this.transformContactForUI(error.response.data.data);
        }
      }
      throw this.handleContactError(error, 'Failed to update contact');
    }
  }

  /**
   * Update contact status only
   */
  async updateContactStatus(contactId: string, status: 'active' | 'inactive' | 'archived'): Promise<Contact> {
    try {
      if (!this.isValidUUID(contactId)) {
        throw new Error('Invalid contact ID format');
      }

      // Backend expects: { status: string }
      const response = await api.patch(API_ENDPOINTS.CONTACTS.UPDATE_STATUS(contactId), { status });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update contact status');
      }
      
      return this.transformContactForUI(response.data.data);
    } catch (error) {
      throw this.handleContactError(error, 'Failed to update contact status');
    }
  }

  /**
   * Delete (archive) contact
   */
  async deleteContact(contactId: string, force: boolean = false): Promise<void> {
    try {
      if (!this.isValidUUID(contactId)) {
        throw new Error('Invalid contact ID format');
      }

      // Backend expects: { force?: boolean }
      const response = await api.delete(API_ENDPOINTS.CONTACTS.DELETE(contactId), { 
        data: { force } // Axios DELETE with body requires data wrapper
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete contact');
      }
    } catch (error) {
      throw this.handleContactError(error, 'Failed to delete contact');
    }
  }

  // ==========================================================
  // Search and Discovery
  // ==========================================================

  /**
   * Search contacts with advanced filters and relationship context
   */
  async searchContacts(searchRequest: ContactSearchRequest): Promise<PaginatedResponse<ContactSearchResult>> {
    try {
      if (!searchRequest.query || searchRequest.query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      // Backend expects { query, filters, includeRelationships } structure
      const response = await api.post(API_ENDPOINTS.CONTACTS.SEARCH, {
        query: searchRequest.query.trim(),
        filters: searchRequest.filters || {},
        includeRelationships: searchRequest.includeRelationships || true
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to search contacts');
      }
      
      return {
        success: true,
        data: response.data.data.map((contact: any) => ({
          ...this.transformContactForUI(contact),
          isDirectMatch: contact.isDirectMatch,
          isRelatedContact: contact.isRelatedContact,
          relationshipType: contact.relationshipType
        })),
        pagination: response.data.pagination,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleContactError(error, 'Failed to search contacts');
    }
  }

  /**
   * Check for duplicate contacts
   */
  async checkDuplicates(contactData: Partial<CreateContactRequest>): Promise<{ hasDuplicates: boolean; duplicates: Contact[] }> {
    try {
      if (!contactData.contact_channels || contactData.contact_channels.length === 0) {
        throw new Error('Contact channels are required for duplicate checking');
      }

      // Transform data for API
      const apiData = {
        ...contactData,
        // Ensure classifications is an array of strings
        classifications: contactData.classifications?.map(c => 
          typeof c === 'string' ? c : (c as any).classification_value
        ) || [],
        // Clean up contact channels
        contact_channels: contactData.contact_channels.map(ch => ({
          channel_type: ch.channel_type,
          value: ch.value,
          country_code: ch.country_code,
          is_primary: ch.is_primary
        }))
      };

      const response = await api.post(API_ENDPOINTS.CONTACTS.DUPLICATES, apiData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to check for duplicates');
      }
      
      // Backend returns: { success: true, data: { hasDuplicates: boolean, duplicates: Contact[] } }
      return {
        hasDuplicates: response.data.data?.hasDuplicates || false,
        duplicates: (response.data.data?.duplicates || []).map((contact: any) => this.transformContactForUI(contact))
      };
    } catch (error) {
      throw this.handleContactError(error, 'Failed to check for duplicates');
    }
  }

  // ==========================================================
  // Business Actions
  // ==========================================================

  /**
   * Send user invitation to contact
   */
  async sendInvitation(contactId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isValidUUID(contactId)) {
        throw new Error('Invalid contact ID format');
      }

      const response = await api.post(API_ENDPOINTS.CONTACTS.SEND_INVITATION(contactId));
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to send invitation');
      }
      
      return {
        success: true,
        message: response.data.message || 'Invitation sent successfully'
      };
    } catch (error) {
      throw this.handleContactError(error, 'Failed to send invitation');
    }
  }

  // ==========================================================
  // Analytics and Reporting
  // ==========================================================

  /**
   * Get contact statistics for dashboard
   */
  async getContactStats(filters: ContactFilters = {}): Promise<ContactStats> {
    try {
      // Send filters to stats endpoint so it returns filtered counts
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.type) params.append('type', filters.type);
      if (filters.classifications && filters.classifications.length > 0) {
        params.append('classifications', filters.classifications.join(','));
      }
      if (filters.user_status && filters.user_status !== 'all') {
        params.append('user_status', filters.user_status);
      }
      if (filters.show_duplicates) {
        params.append('show_duplicates', 'true');
      }
      
      const url = `${API_ENDPOINTS.CONTACTS.STATS}?${params.toString()}`;
      const response = await api.get(url);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load contact statistics');
      }
      
      // Transform stats to match ContactStats interface
      const stats = response.data.data;
      return {
        total: stats.total || 0,
        active: stats.active || stats.by_status?.active || 0,
        inactive: stats.inactive || stats.by_status?.inactive || 0,
        archived: stats.archived || stats.by_status?.archived || 0,
        byType: {
          individual: stats.by_type?.individual || 0,
          corporate: stats.by_type?.corporate || 0
        },
        byClassification: {
          buyer: stats.by_classification?.buyer || 0,
          seller: stats.by_classification?.seller || 0,
          vendor: stats.by_classification?.vendor || 0,
          partner: stats.by_classification?.partner || 0,
          team_member: stats.by_classification?.team_member || 0
        },
        recentlyCreated: stats.recently_created || 0,
        recentlyUpdated: stats.recently_updated || 0,
        duplicates: stats.duplicates || 0,
        withParents: stats.with_parents || 0,
        withChildren: stats.with_children || 0
      };
    } catch (error) {
      throw this.handleContactError(error, 'Failed to load contact statistics');
    }
  }

  /**
   * Get contact constants for frontend forms
   */
  async getContactConstants(): Promise<{
    types: string[];
    statuses: string[];
    classifications: string[];
    channel_types: string[];
    address_types: string[];
  }> {
    try {
      const response = await api.get(API_ENDPOINTS.CONTACTS.CONSTANTS);
      
      if (!response.data.success) {
        // If constants endpoint fails, return hardcoded values as fallback
        console.warn('Failed to load contact constants from API, using fallback values');
        return this.getFallbackConstants();
      }
      
      return response.data.data;
    } catch (error) {
      console.warn('Failed to load contact constants from API, using fallback values');
      return this.getFallbackConstants();
    }
  }

  // ==========================================================
  // Data Transformation Methods
  // ==========================================================

  /**
   * Transform API contact data for UI consumption
   * FIXED: Handle JSONB parent_contact_ids and relationship data
   */
// FIXED transformContactForUI method
private transformContactForUI(apiContact: any): Contact {
  // Handle both 'addresses' and 'contact_addresses' from backend
  const addresses = apiContact.addresses || apiContact.contact_addresses || [];
  
  // Ensure classifications is always an array of strings
  const classifications = this.normalizeClassifications(apiContact.classifications);
  
  // Handle contact persons (now refers to child contacts, not embedded objects)
  const contactPersons = apiContact.contact_persons || [];
  
  return {
    id: apiContact.id,
    type: apiContact.type,
    status: apiContact.status,
    
    // Classifications
    classifications: classifications,
    
    // Individual fields
    name: apiContact.name,
    salutation: apiContact.salutation,
    designation: apiContact.designation,
    department: apiContact.department,
    is_primary_contact: apiContact.is_primary_contact,
    
    // Corporate fields  
    company_name: apiContact.company_name,
    company_registration_number: apiContact.company_registration_number || apiContact.registration_number,
    industry: apiContact.industry,
    
    // Parent relationship fields (JSONB)
    parent_contact_ids: apiContact.parent_contact_ids || [],
    parent_contacts: apiContact.parent_contacts || [],
    
    // Display name (computed field for UI)
    displayName: this.getContactDisplayName(apiContact),
    
    // Arrays
    tags: apiContact.tags || [],
    compliance_numbers: apiContact.compliance_numbers || [],
    
    // FIXED: Related data - keep original field names
    contact_channels: apiContact.contact_channels || [],
    addresses: (addresses || []).map(addr => ({
      ...addr,
      // Only map if the original field doesn't exist
      type: addr.type || addr.address_type,
      // Remove these incorrect mappings - the backend already sends correct field names
      // address_line1: addr.line1,  ❌ DELETE THIS LINE
      // address_line2: addr.line2,  ❌ DELETE THIS LINE  
      // address_line3: addr.line3,  ❌ DELETE THIS LINE
    })),
    contact_addresses: addresses, // Include both for compatibility
    contact_persons: contactPersons,
    
    // Computed fields for UI
    primaryEmail: this.getPrimaryChannel(apiContact.contact_channels, 'email'),
    primaryPhone: this.getPrimaryChannel(apiContact.contact_channels, 'mobile'),
    primaryAddress: this.getPrimaryAddress(addresses),
    
    // Account Manager
    manager_id: apiContact.manager_id || null,
    manager_name: apiContact.manager_name || null,

    // Metadata
    notes: apiContact.notes,
    potential_duplicate: apiContact.potential_duplicate || false,
    duplicate_reasons: apiContact.duplicate_reasons || [],
    user_account_status: apiContact.user_account_status,
    auth_user_id: apiContact.auth_user_id,
    tenant_id: apiContact.tenant_id,
    created_by: apiContact.created_by,
    updated_by: apiContact.updated_by,

    // Timestamps
    created_at: apiContact.created_at,
    updated_at: apiContact.updated_at,
    last_contact_date: apiContact.last_contact_date
  };
}

  /**
   * Transform UI contact data for API submission
   * UPDATED: Handle JSONB parent_contact_ids and remove contact_persons
   */
  private transformContactForAPI(uiContact: CreateContactRequest | UpdateContactRequest): any {
    // Remove UI-specific computed fields and relationship helpers
    const { 
      displayName, 
      primaryEmail, 
      primaryPhone, 
      primaryAddress, 
      selected_parent_companies,
      contact_persons, // Remove - now handled as separate contact records
      parent_contacts, // Remove - populated by backend
      ...contactData 
    } = uiContact as any;
    
    // Ensure classifications is an array of strings
    const classifications = this.normalizeClassifications(contactData.classifications);
    
    // Transform addresses to ensure correct field names
    const addresses = (contactData.addresses || []).map((addr: any) => ({
      ...addr,
      type: addr.address_type || addr.type, // Handle both field names
      // Remove temp IDs
      id: addr.id?.startsWith('temp_') ? undefined : addr.id
    }));
    
    // Transform contact channels - remove temp IDs
    const contact_channels = (contactData.contact_channels || []).map((channel: any) => ({
      ...channel,
      id: channel.id?.startsWith('temp_') ? undefined : channel.id
    }));
    
    // Transform compliance numbers - remove temp IDs
    const compliance_numbers = (contactData.compliance_numbers || []).map((num: any) => ({
      ...num,
      id: num.id?.startsWith('temp_') ? undefined : num.id
    }));
    
    // Transform tags to ensure correct structure
    const tags = (contactData.tags || []).map((tag: any) => {
      if (typeof tag === 'string') {
        return { tag_value: tag, tag_label: tag };
      }
      return {
        tag_value: tag.tag_value || tag.value,
        tag_label: tag.tag_label || tag.label || tag.tag_value || tag.value
      };
    });
    
    return {
      type: contactData.type,
      status: contactData.status,

      // Individual fields
      name: contactData.name,
      salutation: contactData.salutation,
      designation: contactData.designation,
      department: contactData.department,
      is_primary_contact: contactData.is_primary_contact,

      // Corporate fields - handle both field names
      company_name: contactData.company_name,
      registration_number: contactData.company_registration_number || contactData.registration_number,
      industry: contactData.industry,

      // Parent relationships (JSONB array)
      parent_contact_ids: this.normalizeParentContactIds(contactData.parent_contact_ids),

      // Account Manager
      manager_id: contactData.manager_id !== undefined ? (contactData.manager_id || null) : undefined,
      manager_name: contactData.manager_name !== undefined ? (contactData.manager_name || null) : undefined,

      // Arrays - properly transformed
      classifications: classifications,
      tags: tags,
      contact_channels: contact_channels,
      addresses: addresses,
      compliance_numbers: compliance_numbers,

      // Other fields
      notes: contactData.notes,

      // System fields (if present)
      tenant_id: contactData.tenant_id,
      created_by: contactData.created_by,
      updated_by: contactData.updated_by,
      t_userprofile_id: contactData.t_userprofile_id
    };
  }

  // ==========================================================
  // Helper Methods
  // ==========================================================

  /**
   * NEW: Normalize parent contact IDs to array format
   */
  private normalizeParentContactIds(parentContactIds: any): string[] {
    if (!parentContactIds) return [];
    if (Array.isArray(parentContactIds)) return parentContactIds;
    if (typeof parentContactIds === 'string') return [parentContactIds];
    return [];
  }

  /**
   * Normalize classifications to array of strings
   */
  private normalizeClassifications(classifications: any): string[] {
    if (!classifications) return [];
    if (!Array.isArray(classifications)) return [];
    
    return classifications.map((c: any) => {
      if (typeof c === 'string') return c;
      if (typeof c === 'object' && c.classification_value) return c.classification_value;
      if (typeof c === 'object' && c.value) return c.value;
      return String(c);
    }).filter(Boolean);
  }

  /**
   * Get contact display name for UI
   */
  private getContactDisplayName(contact: any): string {
    if (contact.type === 'corporate') {
      return contact.company_name || 'Unnamed Company';
    } else {
      const salutation = contact.salutation ? `${contact.salutation}. ` : '';
      return `${salutation}${contact.name || ''}`.trim() || 'Unnamed Contact';
    }
  }

  /**
   * Get primary contact channel by type
   */
  private getPrimaryChannel(channels: any[], channelType: string): any | null {
    if (!channels || channels.length === 0) return null;
    
    return channels.find(ch => ch.channel_type === channelType && ch.is_primary) ||
           channels.find(ch => ch.channel_type === channelType) ||
           null;
  }

  /**
   * Get primary address
   */
  private getPrimaryAddress(addresses: any[]): any | null {
    if (!addresses || addresses.length === 0) return null;
    
    return addresses.find(addr => addr.is_primary) || addresses[0] || null;
  }

  /**
   * Validate contact data before API submission
   */
  private validateContactData(contactData: CreateContactRequest): void {
    if (!contactData.type) {
      throw new Error('Contact type is required');
    }

    // Normalize classifications for validation
    const classifications = this.normalizeClassifications(contactData.classifications);
    
    if (classifications.length === 0) {
      throw new Error('At least one classification is required');
    }

    // Validate that classifications are valid
    const validClassifications = ['buyer', 'seller', 'vendor', 'partner', 'team_member'];
    const invalidClassifications = classifications.filter(c => !validClassifications.includes(c));
    if (invalidClassifications.length > 0) {
      throw new Error(`Invalid classifications: ${invalidClassifications.join(', ')}`);
    }

    if (!contactData.contact_channels || contactData.contact_channels.length === 0) {
      throw new Error('At least one contact channel is required');
    }

    if (contactData.type === 'individual' && !contactData.name) {
      throw new Error('Name is required for individual contacts');
    }

    if (contactData.type === 'corporate' && !contactData.company_name) {
      throw new Error('Company name is required for corporate contacts');
    }

    // Validate primary channel exists
    const hasPrimaryChannel = contactData.contact_channels.some(ch => ch.is_primary);
    if (!hasPrimaryChannel && contactData.contact_channels.length > 0) {
      // Auto-set first channel as primary if none specified
      contactData.contact_channels[0].is_primary = true;
    }
  }

  /**
   * Enhanced error handling
   */
  private handleContactError(error: any, defaultMessage: string): Error {
    // Extract meaningful error messages from API responses
    if (error.response?.data) {
      const apiError = error.response.data;
      
      // Backend returns: { success: false, error: string, code: string, validation_errors?: [] }
      if (!apiError.success && apiError.error) {
        // Handle validation errors
        if (apiError.code === 'VALIDATION_ERROR' && apiError.validation_errors) {
          const validationMessages = apiError.validation_errors
            .map((err: any) => typeof err === 'string' ? err : err.message)
            .join(', ');
          return new Error(`Validation failed: ${validationMessages}`);
        }
        
        // Handle specific error codes
        if (apiError.code === 'DUPLICATE_CONTACTS_FOUND') {
          const error = new Error('Potential duplicate contacts found. Please review before saving.');
          (error as any).duplicates = apiError.duplicates;
          return error;
        }
        
        if (apiError.code === 'CONTACT_NOT_FOUND') {
          return new Error('Contact not found.');
        }
        
        if (apiError.code === 'CONTACT_ARCHIVED') {
          return new Error('Cannot perform operations on archived contacts.');
        }
        
        // Handle backend search errors
        if (apiError.code === 'LIST_CONTACTS_ERROR' && apiError.error.includes('parse logic tree')) {
          return new Error('Search query contains invalid characters. Please try a different search term.');
        }
        
        return new Error(apiError.error);
      }
    }
    
    // Network or other errors
    if (error.message) {
      return new Error(error.message);
    }
    
    return new Error(defaultMessage);
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Fallback constants if API call fails
   */
  private getFallbackConstants() {
    return {
      types: ['individual', 'corporate'],
      statuses: ['active', 'inactive', 'archived'],
      classifications: ['buyer', 'seller', 'vendor', 'partner', 'team_member'],
      channel_types: ['mobile', 'email', 'whatsapp', 'linkedin', 'website', 'telegram', 'skype'],
      address_types: ['home', 'office', 'billing', 'shipping', 'factory', 'warehouse', 'other']
    };
  }
} 

// Export singleton instance
const contactService = new ContactService();
export default contactService;

// Also export the class for testing purposes
export { ContactService };
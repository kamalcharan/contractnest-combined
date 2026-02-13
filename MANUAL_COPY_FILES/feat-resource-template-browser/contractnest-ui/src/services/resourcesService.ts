// src/services/resourcesService.ts
// Frontend service layer for Resources API

import api from './api';
import { API_ENDPOINTS, buildResourcesListURL } from './serviceURLs';
import { 
  Resource,
  ResourceType,
  CreateResourceFormData,
  UpdateResourceFormData,
  ResourceFilters,
  ResourcesApiResponse,
  ResourceTypesApiResponse,
  SingleResourceApiResponse,
  NextSequenceApiResponse,
  ResourcesErrorResponse,
  CreateResourceMutationVariables,
  UpdateResourceMutationVariables,
  DeleteResourceMutationVariables,
} from '../types/resources';

/**
 * Resources Service - Handles all Resources API interactions
 * Uses TanStack Query for caching and state management
 */
class ResourcesService {
  private readonly baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  /**
   * Get auth headers with tenant ID
   */
  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    // Note: api instance should handle authorization header automatically
    // We just need to ensure tenant-id is included
    return {
      ...this.baseHeaders,
      ...additionalHeaders,
    };
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any, defaultMessage: string): never {
    console.error('ResourcesService Error:', error);

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data as ResourcesErrorResponse;

      switch (status) {
        case 400:
          throw new Error(errorData.error || 'Invalid request data');
        case 401:
          throw new Error('Authentication required');
        case 403:
          throw new Error('Access denied');
        case 404:
          throw new Error('Resource not found');
        case 409:
          throw new Error(errorData.error || 'Resource conflict (duplicate name)');
        case 422:
          throw new Error(errorData.error || 'Validation failed');
        case 429:
          throw new Error('Too many requests. Please try again later.');
        case 500:
          throw new Error('Server error. Please try again.');
        case 503:
          throw new Error('Service temporarily unavailable');
        default:
          throw new Error(errorData.error || defaultMessage);
      }
    } else if (error.request) {
      // Network error
      throw new Error('Network error. Please check your connection.');
    } else {
      // Other error
      throw new Error(error.message || defaultMessage);
    }
  }

  /**
   * Generate idempotency key for safe retries
   */
  private generateIdempotencyKey(prefix: string = 'resource'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
  }

  // =================================================================
  // RESOURCE TYPES OPERATIONS
  // =================================================================

  /**
   * Get all resource types
   */
  async getResourceTypes(): Promise<ResourceType[]> {
    try {
      const response = await api.get<ResourceTypesApiResponse>(
        API_ENDPOINTS.RESOURCES.RESOURCE_TYPES,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load resource types');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to load resource types');
    }
  }

  // =================================================================
  // RESOURCES OPERATIONS
  // =================================================================

  /**
   * Get resources with optional filtering
   */
  async getResources(filters: ResourceFilters = {}): Promise<Resource[]> {
    try {
      const url = buildResourcesListURL(filters);
      const response = await api.get<ResourcesApiResponse>(url, {
        headers: this.getHeaders(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load resources');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to load resources');
    }
  }

  /**
   * Get single resource by ID
   */
  async getResource(id: string): Promise<Resource> {
    try {
      const response = await api.get<SingleResourceApiResponse>(
        API_ENDPOINTS.RESOURCES.GET(id),
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load resource');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to load resource');
    }
  }

  /**
   * Get next sequence number for a resource type
   */
  async getNextSequence(resourceTypeId: string): Promise<number> {
    try {
      const response = await api.get<NextSequenceApiResponse>(
        API_ENDPOINTS.RESOURCES.NEXT_SEQUENCE(resourceTypeId),
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get next sequence');
      }

      return response.data.data.nextSequence;
    } catch (error) {
      this.handleError(error, 'Failed to get next sequence number');
    }
  }

  // =================================================================
  // CRUD OPERATIONS
  // =================================================================

  /**
   * Create a new resource
   */
  async createResource(variables: CreateResourceMutationVariables): Promise<Resource> {
    try {
      const { data, idempotencyKey } = variables;
      const headers = this.getHeaders();

      // Add idempotency key if provided or generate one
      if (idempotencyKey || true) {
        headers['x-idempotency-key'] = idempotencyKey || this.generateIdempotencyKey('create');
      }

      console.log('🚀 ResourcesService.createResource:', {
        data,
        headers: Object.keys(headers),
        hasIdempotencyKey: !!headers['x-idempotency-key']
      });

      const response = await api.post<SingleResourceApiResponse>(
        API_ENDPOINTS.RESOURCES.CREATE,
        data,
        { headers }
      );

      console.log('📥 Create response:', {
        status: response.status,
        success: response.data.success,
        hasData: !!response.data.data
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create resource');
      }

      return response.data.data;
    } catch (error) {
      console.error('❌ ResourcesService.createResource error:', error);
      this.handleError(error, 'Failed to create resource');
    }
  }

  /**
   * Update an existing resource
   */
  async updateResource(variables: UpdateResourceMutationVariables): Promise<Resource> {
    try {
      const { id, data, idempotencyKey } = variables;
      const headers = this.getHeaders();

      // Add idempotency key if provided or generate one
      if (idempotencyKey || true) {
        headers['x-idempotency-key'] = idempotencyKey || this.generateIdempotencyKey('update');
      }

      const response = await api.patch<SingleResourceApiResponse>(
        API_ENDPOINTS.RESOURCES.UPDATE(id),
        data,
        { headers }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update resource');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to update resource');
    }
  }

  /**
   * Delete a resource (soft delete)
   */
  async deleteResource(variables: DeleteResourceMutationVariables): Promise<void> {
    try {
      const { id, idempotencyKey } = variables;
      const headers = this.getHeaders();

      // Add idempotency key if provided or generate one
      if (idempotencyKey || true) {
        headers['x-idempotency-key'] = idempotencyKey || this.generateIdempotencyKey('delete');
      }

      const response = await api.delete<{ success: boolean; message?: string }>(
        API_ENDPOINTS.RESOURCES.DELETE(id),
        { headers }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete resource');
      }
    } catch (error) {
      this.handleError(error, 'Failed to delete resource');
    }
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  /**
   * Health check endpoint
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await api.get<{
        success: boolean;
        data: { status: string; timestamp: string };
        message?: string;
      }>(API_ENDPOINTS.RESOURCES.HEALTH, {
        headers: this.getHeaders(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Health check failed');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Health check failed');
    }
  }

  /**
   * Check signing status (for debugging)
   */
  async checkSigningStatus(): Promise<{ status: string; details: any }> {
    try {
      const response = await api.get<{
        success: boolean;
        data: { status: string; details: any };
        message?: string;
      }>(API_ENDPOINTS.RESOURCES.SIGNING_STATUS, {
        headers: this.getHeaders(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Signing status check failed');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Signing status check failed');
    }
  }

  // =================================================================
  // BATCH OPERATIONS (Future Enhancement)
  // =================================================================

  /**
   * Create multiple resources in batch
   * TODO: Implement when backend supports batch operations
   */
  async createResourcesBatch(resources: CreateResourceFormData[]): Promise<Resource[]> {
    // For now, create one by one
    const results: Resource[] = [];
    
    for (const resourceData of resources) {
      try {
        const result = await this.createResource({ data: resourceData });
        results.push(result);
      } catch (error) {
        console.warn('Failed to create resource in batch:', resourceData.name, error);
        // Continue with other resources
      }
    }

    return results;
  }

  /**
   * Update multiple resources in batch
   * TODO: Implement when backend supports batch operations
   */
  async updateResourcesBatch(updates: Array<{ id: string; data: UpdateResourceFormData }>): Promise<Resource[]> {
    // For now, update one by one
    const results: Resource[] = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateResource(update);
        results.push(result);
      } catch (error) {
        console.warn('Failed to update resource in batch:', update.id, error);
        // Continue with other resources
      }
    }

    return results;
  }

  // =================================================================
  // SEARCH AND FILTERING HELPERS
  // =================================================================

  /**
   * Search resources by query string
   */
  async searchResources(query: string, filters: Omit<ResourceFilters, 'search'> = {}): Promise<Resource[]> {
    return this.getResources({
      ...filters,
      search: query.trim(),
    });
  }

  /**
   * Get resources by type
   */
  async getResourcesByType(resourceTypeId: string, filters: Omit<ResourceFilters, 'resourceTypeId'> = {}): Promise<Resource[]> {
    return this.getResources({
      ...filters,
      resourceTypeId,
    });
  }

  /**
   * Get active resources only
   */
  async getActiveResources(filters: Omit<ResourceFilters, 'includeInactive'> = {}): Promise<Resource[]> {
    return this.getResources({
      ...filters,
      includeInactive: false,
    });
  }

  /**
   * Get resources with pagination
   */
  async getResourcesPaginated(
    page: number = 1,
    limit: number = 20,
    filters: Omit<ResourceFilters, 'page' | 'limit'> = {}
  ): Promise<Resource[]> {
    return this.getResources({
      ...filters,
      page,
      limit,
    });
  }

  // =================================================================
  // RESOURCE TEMPLATES — Browse catalog by served industries
  // =================================================================

  /**
   * Get resource templates filtered by tenant's served industries
   * Returns paginated templates with already_added flag
   */
  async getResourceTemplates(filters: {
    search?: string;
    limit?: number;
    offset?: number;
    resource_type_id?: string;
  } = {}): Promise<ResourceTemplatesResponse> {
    try {
      const url = API_ENDPOINTS.RESOURCES.RESOURCE_TEMPLATES_WITH_FILTERS(filters);
      const response = await api.get<ResourceTemplatesResponse>(url, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to load resource templates');
    }
  }
}

// Template-related types (co-located with service for simplicity)
export interface ResourceTemplate {
  id: string;
  industry_id: string;
  resource_type_id: string;
  name: string;
  description: string | null;
  default_attributes: Record<string, any> | null;
  pricing_guidance: Record<string, any> | null;
  popularity_score: number;
  is_recommended: boolean;
  sort_order: number;
  already_added: boolean;
  make_examples: string[];
  maintenance_schedule: string | null;
  typical_lifespan_years: number | null;
}

export interface ResourceTemplatesResponse {
  success: boolean;
  data: ResourceTemplate[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  served_industries: string[];
  message?: string;
  timestamp: string;
}

// Create and export a singleton instance
const resourcesService = new ResourcesService();

export default resourcesService;

// Export the class for testing purposes
export { ResourcesService };

// Export types for external use
export type {
  CreateResourceMutationVariables,
  UpdateResourceMutationVariables,
  DeleteResourceMutationVariables,
};
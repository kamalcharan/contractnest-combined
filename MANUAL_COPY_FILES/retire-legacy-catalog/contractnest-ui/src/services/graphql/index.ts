// src/services/graphql/index.ts
// ✅ SIMPLE: Central GraphQL exports (keep it minimal!)

// =================================================================
// CORE GRAPHQL CONFIG
// =================================================================
export const GRAPHQL_CONFIG = {
  ENDPOINT: '/api/graphql',
  PLAYGROUND: '/api/graphql/playground',
  SCHEMA: '/api/graphql/schema',
  HEALTH: '/api/graphql/health'
};

// =================================================================
// MODULE EXPORTS (add new modules here)
// =================================================================

// Resources
export {
  GRAPHQL_OPERATIONS as RESOURCE_OPERATIONS,
  buildGraphQLRequest,
  executeGraphQLOperation,
  createApolloClientConfig,
  // Types
  type ResourceType,
  type ResourceStatus,
  type ResourceFilters,
  type ResourceQuery,
  type CreateResourceInput,
  type BulkUpdateResourceInput,
  type GraphQLRequest
} from './resourceGraphQLUrls';

// Service Catalog exports removed — legacy catalog stack retired
// (serviceCatalogGraphQLUrls.ts deleted; use Catalog Studio / cat-blocks).

// TODO: Add future modules here
// export { CONTRACT_OPERATIONS } from './contractGraphQLUrls';

// =================================================================
// QUICK ACCESS (optional convenience)
// =================================================================
import { GRAPHQL_OPERATIONS as RESOURCE_OPS } from './resourceGraphQLUrls';

export const OPERATIONS = {
  RESOURCES: RESOURCE_OPS.RESOURCES
  // CONTRACTS: CONTRACT_OPS.CONTRACTS
};

// =================================================================
// COMMON UTILITIES (only essential ones)
// =================================================================

/**
 * Create GraphQL headers with auth
 */
export const createGraphQLHeaders = (token: string, tenantId: string, environment = 'production') => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId,
  'x-environment': environment
});

/**
 * Extract error messages from GraphQL response
 */
export const getGraphQLErrors = (response: any): string[] => {
  const errors: string[] = [];
  if (response.errors) errors.push(...response.errors.map((e: any) => e.message));
  return errors;
};
// src/services/config.ts
// API base URL — same production API the web app uses.
// Override for local development: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npm start
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://contractnest-api-production.up.railway.app';

// Website used for full registration/onboarding (mobile signup is invitation-only)
export const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://app.contractnest.com';

export const REQUEST_TIMEOUT_MS = 30000;

export const STORAGE_KEYS = {
  authToken: '@ContractNest:authToken',
  refreshToken: '@ContractNest:refreshToken',
  user: '@ContractNest:user',
  tenantId: '@ContractNest:tenantId',
  currentTenant: '@ContractNest:currentTenant',
  tenants: '@ContractNest:tenants',
} as const;

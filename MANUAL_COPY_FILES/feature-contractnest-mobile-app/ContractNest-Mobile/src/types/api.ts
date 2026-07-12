// src/types/api.ts — wire types matching the ContractNest API

export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_code?: string;
  is_admin?: boolean;
  registration_status?: 'complete' | 'pending_workspace' | string;
  preferred_theme?: string;
  is_dark_mode?: boolean;
  preferred_language?: string;
  avatar_url?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface Tenant {
  id: string;
  name: string;
  workspace_code?: string;
  status?: string;
  is_default?: boolean;
  is_admin?: boolean;
  is_owner?: boolean;
  domain?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  tenants?: Tenant[];
  needs_workspace_setup?: boolean;
}

export interface InvitationTenant {
  id: string;
  name: string;
  workspace_code?: string;
}

export interface InvitationInfo {
  id: string;
  email?: string;
  mobile_number?: string;
  user_exists: boolean;
  user_id?: string;
  tenant?: InvitationTenant;
}

export interface ValidateInvitationResponse {
  valid: boolean;
  invitation?: InvitationInfo;
  error?: string;
}

export interface RegisterWithInvitationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userCode: string;
  secretCode: string;
  countryCode?: string;
  mobileNumber?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

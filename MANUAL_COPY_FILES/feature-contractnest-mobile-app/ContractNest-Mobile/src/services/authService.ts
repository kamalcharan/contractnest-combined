// src/services/authService.ts
import { api } from './apiClient';
import {
  AuthUser,
  LoginResponse,
  RegisterWithInvitationRequest,
  Tenant,
  ValidateInvitationResponse,
} from '../types/api';

export const authService = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login', { email, password }),

  getUser: () => api.get<AuthUser>('/api/auth/user', { timeoutMs: 8000 }),

  getTenants: () => api.get<Tenant[]>('/api/tenants'),

  signout: () => api.post('/api/auth/signout'),

  resetPassword: (email: string) => api.post('/api/auth/reset-password', { email }),

  validateInvitation: (userCode: string, secretCode: string) =>
    api.post<ValidateInvitationResponse>('/api/users/invitations/validate', {
      user_code: userCode,
      secret_code: secretCode,
    }),

  registerWithInvitation: (payload: RegisterWithInvitationRequest) =>
    api.post('/api/auth/register-with-invitation', payload),

  acceptInvitation: (userCode: string, secretCode: string, userId: string) =>
    api.post('/api/users/invitations/accept', {
      user_code: userCode,
      secret_code: secretCode,
      user_id: userId,
    }),
};

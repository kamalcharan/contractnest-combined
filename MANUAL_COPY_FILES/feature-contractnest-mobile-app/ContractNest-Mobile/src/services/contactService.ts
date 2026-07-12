// src/services/contactService.ts
import { api } from './apiClient';
import {
  Contact,
  ContactListParams,
  ContactListResponse,
  ContactStats,
  ContactStatus,
  CreateContactRequest,
  UpdateContactRequest,
} from '../types/contacts';

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export const contactService = {
  list: (params: ContactListParams = {}) =>
    api.get<ContactListResponse>(
      `/api/contacts${buildQuery({
        status: params.status,
        type: params.type,
        search: params.search,
        classifications: params.classifications?.length ? params.classifications.join(',') : undefined,
        tags: params.tags?.length ? params.tags.join(',') : undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      })}`
    ),

  stats: () => api.get<{ success: boolean; data: ContactStats }>('/api/contacts/stats'),

  get: (id: string) => api.get<{ success: boolean; data: Contact }>(`/api/contacts/${id}`),

  create: (payload: CreateContactRequest) =>
    api.post<{ success: boolean; data: Contact; message?: string }>('/api/contacts', payload),

  update: (id: string, payload: UpdateContactRequest) =>
    api.put<{ success: boolean; data: Contact; message?: string }>(`/api/contacts/${id}`, payload),

  updateStatus: (id: string, status: ContactStatus) =>
    api.patch<{ success: boolean; data: Contact; message?: string }>(`/api/contacts/${id}/status`, { status }),

  remove: (id: string, force = false) =>
    api.delete<{ success: boolean; message?: string }>(`/api/contacts/${id}`, { force }),
};

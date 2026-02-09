// src/pages/admin/smart-forms/types/smartFormsAdmin.types.ts
// Type definitions for Smart Forms Admin UI

export interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  form_type: string;
  tags: string[];
  schema: Record<string, unknown>;
  version: number;
  parent_template_id: string | null;
  status: 'draft' | 'in_review' | 'approved' | 'past';
  thumbnail_url: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  form_type?: string;
  search?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  category: string;
  form_type: string;
  tags?: string[];
  schema: Record<string, unknown>;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  category?: string;
  form_type?: string;
  tags?: string[];
  schema?: Record<string, unknown>;
}

export interface ValidateSchemaResult {
  valid: boolean;
  errors: string[];
}

export interface ActionResult {
  success?: boolean;
  deleted?: string;
  error?: string;
}

export type FormStatus = 'draft' | 'in_review' | 'approved' | 'past';

export const FORM_CATEGORIES = [
  'calibration', 'inspection', 'audit', 'maintenance',
  'clinical', 'pharma', 'compliance', 'onboarding', 'general'
] as const;

export const FORM_TYPES = [
  'pre_service', 'post_service', 'during_service', 'standalone'
] as const;

export const FORM_STATUSES: { value: FormStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#6B7280' },
  { value: 'in_review', label: 'In Review', color: '#F59E0B' },
  { value: 'approved', label: 'Approved', color: '#10B981' },
  { value: 'past', label: 'Archived', color: '#9CA3AF' },
];

// src/pages/admin/smart-forms/hooks/useSmartFormsAdmin.ts
// Data-fetching + action hooks for Smart Forms Admin
// Pattern: matches useJtdAdmin.ts — useState/useCallback/useEffect, api calls via serviceURLs

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../services/api';
import { API_ENDPOINTS } from '../../../../services/serviceURLs';
import type {
  FormTemplate,
  FormTemplateFilters,
  Pagination,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  ValidateSchemaResult,
} from '../types/smartFormsAdmin.types';

// =============================
// List Templates
// =============================
export function useFormTemplates(filters: FormTemplateFilters = {}) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = API_ENDPOINTS.ADMIN.SMART_FORMS.LIST_WITH_FILTERS(filters);
      const res = await api.get(url);
      setTemplates(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.limit,
    filters.status,
    filters.category,
    filters.form_type,
    filters.search,
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { templates, pagination, loading, error, refresh: fetch };
}

// =============================
// Get Single Template
// =============================
export function useFormTemplate(templateId: string | null) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!templateId) return;
    try {
      setLoading(true);
      setError(null);
      const url = API_ENDPOINTS.ADMIN.SMART_FORMS.GET(templateId);
      const res = await api.get(url);
      setTemplate(res.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { template, loading, error, refresh: fetch };
}

// =============================
// Mutations — Create, Update, Delete, Workflow Actions
// =============================
export function useFormTemplateMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guard against concurrent mutations (race condition prevention)
  const activeRequestRef = useRef<string | null>(null);

  const guardedExecute = useCallback(async <T>(
    operationKey: string,
    fn: () => Promise<T>
  ): Promise<T | null> => {
    // Prevent duplicate concurrent requests for the same operation
    if (activeRequestRef.current === operationKey) {
      return null;
    }
    activeRequestRef.current = operationKey;
    try {
      setLoading(true);
      setError(null);
      const result = await fn();
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Operation failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
      activeRequestRef.current = null;
    }
  }, []);

  // --- CRUD ---

  const createTemplate = useCallback(
    async (payload: CreateTemplatePayload): Promise<FormTemplate | null> => {
      return guardedExecute('create', async () => {
        const res = await api.post(API_ENDPOINTS.ADMIN.SMART_FORMS.CREATE, payload);
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const updateTemplate = useCallback(
    async (id: string, payload: UpdateTemplatePayload): Promise<FormTemplate | null> => {
      return guardedExecute(`update-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.UPDATE(id);
        const res = await api.put(url, payload);
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await guardedExecute(`delete-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.DELETE(id);
        const res = await api.delete(url);
        return res.data;
      });
      return result?.success === true;
    },
    [guardedExecute]
  );

  // --- Schema Validation ---

  const validateSchema = useCallback(
    async (schema: Record<string, unknown>): Promise<ValidateSchemaResult | null> => {
      return guardedExecute('validate', async () => {
        const res = await api.post(API_ENDPOINTS.ADMIN.SMART_FORMS.VALIDATE, { schema });
        return res.data as ValidateSchemaResult;
      });
    },
    [guardedExecute]
  );

  // --- Workflow Actions ---

  const cloneTemplate = useCallback(
    async (id: string): Promise<FormTemplate | null> => {
      return guardedExecute(`clone-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.CLONE(id);
        const res = await api.post(url, {});
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const submitForReview = useCallback(
    async (id: string): Promise<FormTemplate | null> => {
      return guardedExecute(`submit-review-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.SUBMIT_REVIEW(id);
        const res = await api.post(url, {});
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const approveTemplate = useCallback(
    async (id: string, notes?: string): Promise<FormTemplate | null> => {
      return guardedExecute(`approve-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.APPROVE(id);
        const res = await api.post(url, { notes });
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const rejectTemplate = useCallback(
    async (id: string, notes: string): Promise<FormTemplate | null> => {
      return guardedExecute(`reject-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.REJECT(id);
        const res = await api.post(url, { notes });
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const newVersion = useCallback(
    async (id: string): Promise<FormTemplate | null> => {
      return guardedExecute(`new-version-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.NEW_VERSION(id);
        const res = await api.post(url, {});
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  const archiveTemplate = useCallback(
    async (id: string): Promise<FormTemplate | null> => {
      return guardedExecute(`archive-${id}`, async () => {
        const url = API_ENDPOINTS.ADMIN.SMART_FORMS.ARCHIVE(id);
        const res = await api.post(url, {});
        return res.data as FormTemplate;
      });
    },
    [guardedExecute]
  );

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    validateSchema,
    cloneTemplate,
    submitForReview,
    approveTemplate,
    rejectTemplate,
    newVersion,
    archiveTemplate,
    loading,
    error,
  };
}

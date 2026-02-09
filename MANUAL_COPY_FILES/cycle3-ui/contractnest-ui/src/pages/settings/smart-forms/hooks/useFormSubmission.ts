// ============================================================================
// useFormSubmission — Create, Update, Fetch form submissions
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import type { FormSubmission } from '../types';

interface CreateSubmissionPayload {
  form_template_id: string;
  service_event_id: string;
  contract_id: string;
  mapping_id?: string;
  responses?: Record<string, unknown>;
  computed_values?: Record<string, unknown>;
  device_info?: Record<string, unknown>;
}

interface UpdateSubmissionPayload {
  responses?: Record<string, unknown>;
  computed_values?: Record<string, unknown>;
  status?: 'draft' | 'submitted';
}

interface UseFormSubmissionReturn {
  submission: FormSubmission | null;
  submissions: FormSubmission[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchSubmissions: (filters?: {
    event_id?: string;
    contract_id?: string;
    template_id?: string;
  }) => Promise<void>;
  getSubmission: (id: string) => Promise<FormSubmission | null>;
  createSubmission: (payload: CreateSubmissionPayload) => Promise<FormSubmission | null>;
  updateSubmission: (
    id: string,
    payload: UpdateSubmissionPayload
  ) => Promise<FormSubmission | null>;
}

export function useFormSubmission(): UseFormSubmissionReturn {
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(false);

  const fetchSubmissions = useCallback(
    async (filters?: { event_id?: string; contract_id?: string; template_id?: string }) => {
      try {
        setLoading(true);
        setError(null);
        const url = API_ENDPOINTS.SMART_FORMS.SUBMISSIONS.LIST_WITH_FILTERS(filters || {});
        const response = await api.get(url);
        setSubmissions(response.data?.data || []);
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err.message || 'Failed to load submissions';
        setError(message);
        console.error('[useFormSubmission] fetchSubmissions error:', message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getSubmission = useCallback(async (id: string): Promise<FormSubmission | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(API_ENDPOINTS.SMART_FORMS.SUBMISSIONS.GET(id));
      const data = response.data;
      setSubmission(data);
      return data;
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err.message || 'Failed to load submission';
      setError(message);
      console.error('[useFormSubmission] getSubmission error:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubmission = useCallback(
    async (payload: CreateSubmissionPayload): Promise<FormSubmission | null> => {
      if (activeRequestRef.current) return null;
      activeRequestRef.current = true;

      try {
        setSaving(true);
        setError(null);
        const response = await api.post(
          API_ENDPOINTS.SMART_FORMS.SUBMISSIONS.CREATE,
          payload
        );
        const data = response.data;
        setSubmission(data);
        setSubmissions((prev) => [...prev, data]);
        return data;
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err.message || 'Failed to create submission';
        setError(message);
        console.error('[useFormSubmission] createSubmission error:', message);
        return null;
      } finally {
        setSaving(false);
        activeRequestRef.current = false;
      }
    },
    []
  );

  const updateSubmission = useCallback(
    async (id: string, payload: UpdateSubmissionPayload): Promise<FormSubmission | null> => {
      if (activeRequestRef.current) return null;
      activeRequestRef.current = true;

      try {
        setSaving(true);
        setError(null);
        const response = await api.put(
          API_ENDPOINTS.SMART_FORMS.SUBMISSIONS.UPDATE(id),
          payload
        );
        const data = response.data;
        setSubmission(data);
        setSubmissions((prev) => prev.map((s) => (s.id === id ? data : s)));
        return data;
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err.message || 'Failed to update submission';
        setError(message);
        console.error('[useFormSubmission] updateSubmission error:', message);
        return null;
      } finally {
        setSaving(false);
        activeRequestRef.current = false;
      }
    },
    []
  );

  return {
    submission,
    submissions,
    loading,
    saving,
    error,
    fetchSubmissions,
    getSubmission,
    createSubmission,
    updateSubmission,
  };
}

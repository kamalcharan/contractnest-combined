// ============================================================================
// useSmartFormSelections — Fetch + Toggle tenant form selections
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import type { TenantSelection } from '../types';

interface UseSmartFormSelectionsReturn {
  selections: TenantSelection[];
  loading: boolean;
  error: string | null;
  fetchSelections: () => Promise<void>;
  toggleSelection: (formTemplateId: string) => Promise<TenantSelection | null>;
  toggling: boolean;
}

export function useSmartFormSelections(): UseSmartFormSelectionsReturn {
  const [selections, setSelections] = useState<TenantSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const activeRequestRef = useRef(false);

  const fetchSelections = useCallback(async () => {
    if (activeRequestRef.current) return;
    activeRequestRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(API_ENDPOINTS.SMART_FORMS.SELECTIONS.LIST);
      setSelections(response.data?.data || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err.message || 'Failed to load selections';
      setError(message);
      console.error('[useSmartFormSelections] fetchSelections error:', message);
    } finally {
      setLoading(false);
      activeRequestRef.current = false;
    }
  }, []);

  const toggleSelection = useCallback(
    async (formTemplateId: string): Promise<TenantSelection | null> => {
      if (activeRequestRef.current) return null;
      activeRequestRef.current = true;

      try {
        setToggling(true);
        setError(null);
        const response = await api.post(API_ENDPOINTS.SMART_FORMS.SELECTIONS.TOGGLE, {
          form_template_id: formTemplateId,
        });
        const updated: TenantSelection = response.data;

        // Optimistic update — replace or append
        setSelections((prev) => {
          const idx = prev.findIndex((s) => s.form_template_id === formTemplateId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
          return [...prev, updated];
        });

        return updated;
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err.message || 'Failed to toggle selection';
        setError(message);
        console.error('[useSmartFormSelections] toggleSelection error:', message);
        return null;
      } finally {
        setToggling(false);
        activeRequestRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    fetchSelections();
  }, [fetchSelections]);

  return {
    selections,
    loading,
    error,
    fetchSelections,
    toggleSelection,
    toggling,
  };
}

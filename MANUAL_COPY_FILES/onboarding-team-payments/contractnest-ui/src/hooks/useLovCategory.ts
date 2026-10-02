// src/hooks/useLovCategory.ts
// One List-of-Values category (e.g. Roles, Tags) for the current tenant:
// load its active values and add new ones.
//
// Extracted from the onboarding LovSetupStep so the two onboarding pages that
// now show a single list each ("Your team" → Roles, "Your tags" → Tags) share
// the same load / add code instead of copying it.
//
// categoryId === null after loading means the category was never seeded for
// this tenant — callers show an informational line, not an error.

import { useCallback, useEffect, useRef, useState } from 'react';
import api, { generateIdempotencyKey } from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { useAuth } from '@/context/AuthContext';

export interface LovValue {
  id: string;
  SubCatName: string;
  DisplayName: string;
  hexcolor: string | null;
  Sequence_no: number | null;
  is_deletable: boolean;
  is_active: boolean;
}

export interface UseLovCategoryResult {
  loading: boolean;
  loadError: string | null;
  categoryId: string | null;
  values: LovValue[];
  saving: boolean;
  /** Returns null on success, or a user-facing error message. */
  addValue: (name: string, hexcolor: string) => Promise<string | null>;
  reload: () => Promise<void>;
}

export function useLovCategory(categoryName: string): UseLovCategoryResult {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [values, setValues] = useState<LovValue[]>([]);
  const [saving, setSaving] = useState(false);
  // A ref, not just state: two fast taps on a suggestion must not both post.
  const savingRef = useRef(false);

  const reload = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      setLoadError('No workspace found. You can manage these later in Settings.');
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const catResponse = await api.get(`${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${tenantId}`);
      const match = (catResponse.data || []).find(
        (c: any) => (c.CategoryName || '').toLowerCase() === categoryName.toLowerCase()
      );
      if (!match) {
        setCategoryId(null);
        setValues([]);
        return;
      }
      const detailsResponse = await api.get(
        `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${match.id}&tenantId=${tenantId}`
      );
      setCategoryId(match.id);
      setValues((detailsResponse.data || []).filter((v: LovValue) => v.is_active !== false));
    } catch (err: any) {
      setLoadError(err?.response?.data?.error || 'Failed to load your values. You can manage them later in Settings.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, categoryName]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addValue = useCallback(
    async (name: string, hexcolor: string): Promise<string | null> => {
      if (savingRef.current) return null;
      const trimmed = name.trim();
      if (!trimmed) return 'Please enter a name.';
      if (!categoryId || !tenantId) return 'This list is not ready yet. You can add values later in Settings.';
      if (values.some((v) => v.DisplayName.toLowerCase() === trimmed.toLowerCase())) {
        return `"${trimmed}" is already there.`;
      }

      savingRef.current = true;
      setSaving(true);
      try {
        const maxSeq = values.reduce((m, v) => Math.max(m, v.Sequence_no || 0), 0);
        const response = await api.post(
          API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS,
          {
            SubCatName: trimmed,
            DisplayName: trimmed,
            hexcolor,
            Sequence_no: maxSeq + 1,
            Description: '',
            category_id: categoryId,
            tenantid: tenantId,
            is_active: true,
            is_deletable: true,
            tags: null,
            tool_tip: null,
            icon_name: null,
          },
          {
            headers: {
              'x-tenant-id': tenantId,
              'idempotency-key': generateIdempotencyKey(),
            },
          }
        );
        setValues((prev) => [...prev, response.data]);
        return null;
      } catch (err: any) {
        return err?.response?.data?.error || 'Failed to add value. Please try again.';
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [categoryId, tenantId, values]
  );

  return { loading, loadError, categoryId, values, saving, addValue, reload };
}

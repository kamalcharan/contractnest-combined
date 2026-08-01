// src/hooks/useJtdTenantMessageSettings.ts
// Tenant-facing JTD message-type settings: list + toggle. Same fetch-hook
// pattern as pages/admin/jtd/hooks/useJtdAdmin.ts.

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/serviceURLs';

export interface JtdMessageTypeTemplate {
  channel_code: string;
  subject: string | null;
  content: string;
}

export interface JtdMessageTypeSetting {
  source_type_code: string;
  name: string;
  description: string | null;
  is_global: boolean;
  is_enabled: boolean;
  templates: JtdMessageTypeTemplate[];
}

export function useJtdTenantMessageSettings() {
  const [messageTypes, setMessageTypes] = useState<JtdMessageTypeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(API_ENDPOINTS.JTD_MESSAGE_TYPES.LIST);
      if (res.data?.success) {
        setMessageTypes(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to load message type settings');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { messageTypes, loading, error, refresh: fetch };
}

export function useJtdTenantMessageToggle() {
  const [saving, setSaving] = useState<string | null>(null); // source_type_code currently saving
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async (sourceTypeCode: string, isEnabled: boolean): Promise<boolean> => {
    try {
      setSaving(sourceTypeCode);
      setError(null);
      const res = await api.patch(API_ENDPOINTS.JTD_MESSAGE_TYPES.TOGGLE(sourceTypeCode), {
        is_enabled: isEnabled
      });
      if (res.data?.success) return true;
      setError(res.data?.error || 'Failed to update setting');
      return false;
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to update setting');
      return false;
    } finally {
      setSaving(null);
    }
  }, []);

  return { toggle, saving, error };
}

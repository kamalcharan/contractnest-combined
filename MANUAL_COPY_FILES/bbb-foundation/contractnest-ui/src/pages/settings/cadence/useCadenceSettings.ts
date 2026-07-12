// ============================================================================
// useCadenceSettings — tenant holiday calendar + shift policy (smart cycles)
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface HolidayDate {
  date: string;   // YYYY-MM-DD
  label: string | null;
}

export interface CadenceSettings {
  weekly_holidays: number[];          // 0=Sun .. 6=Sat
  default_shift: 'next' | 'previous';
  holidays: HolidayDate[];
}

const EMPTY: CadenceSettings = { weekly_holidays: [0], default_shift: 'next', holidays: [] };

export function useCadenceSettings() {
  const [settings, setSettings] = useState<CadenceSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const apply = (data: any) => {
    if (data) {
      setSettings({
        weekly_holidays: Array.isArray(data.weekly_holidays) ? data.weekly_holidays : [],
        default_shift: data.default_shift === 'previous' ? 'previous' : 'next',
        holidays: Array.isArray(data.holidays) ? data.holidays : [],
      });
    }
  };

  const fetchSettings = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      setLoading(true); setError(null);
      const res = await api.get(API_ENDPOINTS.CADENCE_SETTINGS.GET);
      apply(res.data?.data || res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load cadence settings');
    } finally {
      setLoading(false); inflight.current = false;
    }
  }, []);

  const save = useCallback(async (weeklyHolidays: number[], defaultShift: 'next' | 'previous') => {
    try {
      setSaving(true); setError(null);
      const res = await api.put(API_ENDPOINTS.CADENCE_SETTINGS.UPDATE, {
        weekly_holidays: weeklyHolidays,
        default_shift: defaultShift,
      });
      apply(res.data?.data || res.data);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const addHoliday = useCallback(async (date: string, label?: string) => {
    try {
      setSaving(true); setError(null);
      const res = await api.post(API_ENDPOINTS.CADENCE_SETTINGS.ADD_HOLIDAY, { date, label });
      apply(res.data?.data || res.data);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to add holiday');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const removeHoliday = useCallback(async (date: string) => {
    try {
      setSaving(true); setError(null);
      const res = await api.delete(API_ENDPOINTS.CADENCE_SETTINGS.REMOVE_HOLIDAY(date));
      apply(res.data?.data || res.data);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to remove holiday');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return { settings, loading, saving, error, fetchSettings, save, addHoliday, removeHoliday };
}

export default useCadenceSettings;

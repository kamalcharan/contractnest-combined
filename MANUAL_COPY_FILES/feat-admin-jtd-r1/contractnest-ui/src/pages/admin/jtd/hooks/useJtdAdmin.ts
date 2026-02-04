// src/pages/admin/jtd/hooks/useJtdAdmin.ts
// Data-fetching hooks for Admin JTD Management — Release 1
// Pattern: matches existing useVaNiData.ts (useState + api.get + auto-refresh)

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../services/api';
import { API_ENDPOINTS } from '../../../../services/serviceURLs';
import type {
  QueueMetrics,
  TenantStatsResponse,
  TenantStatsFilters,
  JtdEventRecord,
  JtdEventFilters,
  JtdEventDetail,
  JtdStatusHistoryEntry,
  WorkerHealth,
  Pagination,
} from '../types/jtdAdmin.types';

// =============================
// Queue Metrics
// =============================
export function useQueueMetrics(refreshInterval = 15000) {
  const [data, setData] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(API_ENDPOINTS.ADMIN.JTD.QUEUE_METRICS);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.error || 'Failed to load queue metrics');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetch, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch, refreshInterval]);

  return { data, loading, error, refresh: fetch };
}

// =============================
// Tenant Stats
// =============================
export function useTenantStats(filters: TenantStatsFilters = {}) {
  const [data, setData] = useState<TenantStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = API_ENDPOINTS.ADMIN.JTD.TENANT_STATS_WITH_FILTERS(filters);
      const res = await api.get(url);
      if (res.data?.success) {
        setData({
          global: res.data.global,
          tenants: res.data.data,
          pagination: res.data.pagination,
        });
      } else {
        setError(res.data?.error || 'Failed to load tenant stats');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.limit,
    filters.search,
    filters.sort_by,
    filters.sort_dir,
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}

// =============================
// Event Explorer
// =============================
export function useJtdEvents(filters: JtdEventFilters = {}) {
  const [events, setEvents] = useState<JtdEventRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = API_ENDPOINTS.ADMIN.JTD.EVENTS_WITH_FILTERS(filters);
      const res = await api.get(url);
      if (res.data?.success) {
        setEvents(res.data.data || []);
        setPagination(res.data.pagination || null);
      } else {
        setError(res.data?.error || 'Failed to load events');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.limit,
    filters.tenant_id,
    filters.status,
    filters.event_type,
    filters.channel,
    filters.source_type,
    filters.search,
    filters.date_from,
    filters.date_to,
    filters.sort_by,
    filters.sort_dir,
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { events, pagination, loading, error, refresh: fetch };
}

// =============================
// Event Detail
// =============================
export function useJtdEventDetail(jtdId: string | null) {
  const [event, setEvent] = useState<JtdEventDetail | null>(null);
  const [history, setHistory] = useState<JtdStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!jtdId) return;
    try {
      setLoading(true);
      setError(null);
      const url = API_ENDPOINTS.ADMIN.JTD.EVENT_DETAIL(jtdId);
      const res = await api.get(url);
      if (res.data?.success) {
        setEvent(res.data.data || null);
        setHistory(res.data.status_history || []);
      } else {
        setError(res.data?.error || 'Failed to load event detail');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [jtdId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { event, history, loading, error, refresh: fetch };
}

// =============================
// Worker Health
// =============================
export function useWorkerHealth(refreshInterval = 15000) {
  const [data, setData] = useState<WorkerHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(API_ENDPOINTS.ADMIN.JTD.WORKER_HEALTH);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.error || 'Failed to load worker health');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetch, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch, refreshInterval]);

  return { data, loading, error, refresh: fetch };
}

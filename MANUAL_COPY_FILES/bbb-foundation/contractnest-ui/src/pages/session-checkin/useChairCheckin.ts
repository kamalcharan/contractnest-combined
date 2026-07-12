// ============================================================================
// useChairCheckin — chair-side Group Session check-in admin (Batch 3)
// ============================================================================
// Authenticated (uses the shared `api` instance, which carries the tenant
// header). Mints the static QR token for a session contract and confirms the
// BAU payments members declared at check-in.

import { useCallback, useState } from 'react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface PendingDeclaration {
  id: string;
  member_contact_id: string;
  member_name: string | null;
  billing_event_id: string;
  label: string | null;
  due_date: string | null;
  amount: number | null;
  currency: string | null;
  upi_reference: string | null;
  event_status: string | null;
  created_at: string;
}

const unwrap = (res: any) => res?.data?.data ?? res?.data;

export function useChairCheckin() {
  const [declarations, setDeclarations] = useState<PendingDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeclarations = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = unwrap(await api.get(API_ENDPOINTS.SESSION_CHECKIN.DECLARATIONS));
      setDeclarations(Array.isArray(data?.declarations) ? data.declarations : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load declarations');
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureToken = useCallback(async (contractId: string): Promise<string | null> => {
    setError(null);
    try {
      const data = unwrap(await api.post(API_ENDPOINTS.SESSION_CHECKIN.ENSURE_TOKEN, { contract_id: contractId }));
      return data?.token ?? null;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create check-in link');
      return null;
    }
  }, []);

  const confirm = useCallback(async (declarationId: string, doConfirm: boolean) => {
    setBusyId(declarationId); setError(null);
    try {
      await api.post(API_ENDPOINTS.SESSION_CHECKIN.CONFIRM_DECLARATION(declarationId), { confirm: doConfirm });
      setDeclarations((prev) => prev.filter((d) => d.id !== declarationId));
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update declaration');
      return false;
    } finally {
      setBusyId(null);
    }
  }, []);

  return { declarations, loading, busyId, error, fetchDeclarations, ensureToken, confirm };
}

export default useChairCheckin;

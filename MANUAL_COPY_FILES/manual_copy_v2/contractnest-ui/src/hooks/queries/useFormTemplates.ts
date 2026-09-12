// src/hooks/queries/useFormTemplates.ts
// B2.4 — approved form templates for tenant-facing pickers (block wizard
// Evidence step). Reads GET /api/forms/templates (status=approved default),
// which proxies the smart-forms edge function.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface FormTemplateOption {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  form_type: string;
  version: number;
  status: string;
  source?: string | null;
  resource_template_id?: string | null;
}

export const useApprovedFormTemplates = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery<FormTemplateOption[]>({
    queryKey: ['form-templates', 'approved'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SMART_FORMS.TEMPLATES({ status: 'approved' }));
      const payload = response.data;
      const rows = payload?.data || payload || [];
      return (Array.isArray(rows) ? rows : []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        form_type: t.form_type,
        version: t.version,
        status: t.status,
        source: t.source,
        resource_template_id: t.resource_template_id,
      }));
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export default useApprovedFormTemplates;

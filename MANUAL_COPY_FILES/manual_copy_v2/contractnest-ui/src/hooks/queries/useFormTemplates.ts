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

// ---------------------------------------------------------------------------
// B2.5 — resolved form mappings for a contract (written at activation by the
// D9 resolver). Read by the execution surface (OperationsTab / SellerTasksTab)
// so the service-ticket drawer shows the RESOLVED requirement, not just the
// contract wizard's evidence fields. Block-level rows come first from the API.
// ---------------------------------------------------------------------------

export interface ContractFormMapping {
  id: string;
  contract_id: string;
  contract_block_id: string | null;
  form_template_id: string;
  resource_template_id?: string | null;
  require_upload: boolean;
  resolved_via: string; // block_config | kt_type | contract_fallback | platform_default
  timing?: string | null;
  is_mandatory: boolean;
  form_name: string;
  form_version?: number;
  form_category?: string;
  form_type?: string;
}

export const useContractFormMappings = (
  contractId?: string,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery<ContractFormMapping[]>({
    queryKey: ['contract-form-mappings', contractId],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SMART_FORMS.MAPPINGS(contractId!));
      const rows = response.data?.data || [];
      return (Array.isArray(rows) ? rows : []).map((m: any) => ({
        id: m.id,
        contract_id: m.contract_id,
        contract_block_id: m.contract_block_id ?? null,
        form_template_id: m.form_template_id,
        resource_template_id: m.resource_template_id ?? null,
        require_upload: !!m.require_upload,
        resolved_via: m.resolved_via,
        timing: m.timing ?? null,
        is_mandatory: m.is_mandatory !== false,
        form_name: m.m_form_templates?.name || 'Form',
        form_version: m.m_form_templates?.version,
        form_category: m.m_form_templates?.category,
        form_type: m.m_form_templates?.form_type,
      }));
    },
    enabled: !!currentTenant?.id && !!contractId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export default useApprovedFormTemplates;

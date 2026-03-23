// src/hooks/queries/useTemplateCoverage.ts
// TanStack Query hook for template coverage statistics (industries + stats)

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { catTemplateKeys } from './useCatTemplates';

// =================================================================
// TYPES
// =================================================================

export interface IndustryCoverage {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  templateCount: number;
  hasCoverage: boolean;
}

export interface TemplateCoverageSummary {
  totalTemplates: number;
  totalIndustries: number;
  coveredIndustries: number;
  uncoveredIndustries: number;
  coveragePercent: number;
  totalCategories: number;
  publicTemplates: number;
}

export interface TemplateCoverageData {
  summary: TemplateCoverageSummary;
  industries: IndustryCoverage[];
  uncovered: Array<{ id: string; name: string; icon: string | null }>;
}

interface CoverageApiResponse {
  success: boolean;
  data?: TemplateCoverageData;
  error?: {
    code: string;
    message: string;
  };
}

// =================================================================
// QUERY KEY
// =================================================================

export const templateCoverageKeys = {
  all: [...catTemplateKeys.all, 'coverage'] as const,
  summary: () => [...templateCoverageKeys.all, 'summary'] as const,
};

// =================================================================
// HOOK
// =================================================================

/**
 * Fetches template coverage stats — per-industry template counts,
 * coverage percentage, and uncovered industries.
 * Used by the Global Templates admin page.
 */
export const useTemplateCoverage = () => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: templateCoverageKeys.summary(),
    queryFn: async (): Promise<TemplateCoverageData> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.COVERAGE;

      const response = await api.get<CoverageApiResponse>(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch template coverage');
      }

      return response.data.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000,  // 10 minutes — coverage changes infrequently
    gcTime: 15 * 60 * 1000,
  });
};

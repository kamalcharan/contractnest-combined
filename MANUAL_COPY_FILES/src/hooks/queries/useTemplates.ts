// src/hooks/queries/useTemplates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';

// Template interfaces
export interface Template {
  id: string;
  name: string;
  description: string;
  contractType: 'service' | 'partnership';
  industry: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: string;
  blocks: any[];
  tags: string[];
  rating: number;
  usageCount: number;
  isPopular?: boolean;
  globalTemplate?: boolean;
  globalTemplateId?: string;
  tenantId?: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface TemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  contractType?: string;
  complexity?: string;
  isPopular?: boolean;
  globalTemplate?: boolean;
  tenantId?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateStats {
  total: number;
  global: number;
  local: number;
  popular: number;
  averageRating: number;
  totalUsage: number;
  byIndustry: Record<string, number>;
  byComplexity: Record<string, number>;
  byTenant?: Record<string, number>;
}

export interface TemplateContext {
  mode?: 'marketplace' | 'management' | 'selection';
  isGlobal?: boolean;
  tenantId?: string;
  userRole?: 'admin' | 'user';
}

// Industry data
export const INDUSTRIES = [
  { id: 'pest-control', name: 'Pest Control', icon: '🐜', templateCount: 8 },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', templateCount: 12 },
  { id: 'technology', name: 'Technology', icon: '💻', templateCount: 15 },
  { id: 'financial', name: 'Financial', icon: '💰', templateCount: 10 },
  { id: 'construction', name: 'Construction', icon: '🏗️', templateCount: 7 },
  { id: 'education', name: 'Education', icon: '🎓', templateCount: 9 }
];

// Mock templates data
const MOCK_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    name: 'Standard Pest Control Service',
    description: 'Complete pest control service agreement with recurring treatments, guarantees, and customizable service areas.',
    contractType: 'service',
    industry: 'pest-control',
    complexity: 'medium',
    estimatedDuration: '15-20 min',
    blocks: ['header', 'services', 'pricing', 'terms', 'signature'],
    tags: ['pest control', 'recurring', 'residential'],
    rating: 4.8,
    usageCount: 1250,
    isPopular: true,
    globalTemplate: true,
    tenantId: 'admin',
    createdAt: '2024-01-15',
    updatedAt: '2024-03-01'
  },
  {
    id: 'tpl-2',
    name: 'Commercial Maintenance Agreement',
    description: 'Comprehensive commercial property maintenance contract with SLA definitions and emergency response terms.',
    contractType: 'service',
    industry: 'construction',
    complexity: 'complex',
    estimatedDuration: '25-30 min',
    blocks: ['header', 'scope', 'sla', 'pricing', 'liability', 'terms', 'signature'],
    tags: ['commercial', 'maintenance', 'SLA'],
    rating: 4.6,
    usageCount: 890,
    isPopular: true,
    globalTemplate: true,
    tenantId: 'admin',
    createdAt: '2024-01-20',
    updatedAt: '2024-02-28'
  },
  {
    id: 'tpl-3',
    name: 'Healthcare Partnership Agreement',
    description: 'Partnership contract template for healthcare providers including revenue sharing and compliance terms.',
    contractType: 'partnership',
    industry: 'healthcare',
    complexity: 'complex',
    estimatedDuration: '30-40 min',
    blocks: ['header', 'parties', 'scope', 'revenue', 'compliance', 'terms', 'signature'],
    tags: ['healthcare', 'partnership', 'compliance'],
    rating: 4.7,
    usageCount: 567,
    isPopular: false,
    globalTemplate: true,
    tenantId: 'admin',
    createdAt: '2024-02-01',
    updatedAt: '2024-03-05'
  },
  {
    id: 'tpl-4',
    name: 'IT Services Contract',
    description: 'Technology services agreement with support tiers, response times, and data protection clauses.',
    contractType: 'service',
    industry: 'technology',
    complexity: 'medium',
    estimatedDuration: '20-25 min',
    blocks: ['header', 'services', 'support', 'pricing', 'data', 'terms', 'signature'],
    tags: ['IT', 'support', 'technology'],
    rating: 4.5,
    usageCount: 723,
    isPopular: true,
    globalTemplate: true,
    tenantId: 'admin',
    createdAt: '2024-01-25',
    updatedAt: '2024-03-10'
  },
  {
    id: 'tpl-5',
    name: 'Simple Service Agreement',
    description: 'Basic service contract for straightforward service engagements with minimal complexity.',
    contractType: 'service',
    industry: 'pest-control',
    complexity: 'simple',
    estimatedDuration: '10-15 min',
    blocks: ['header', 'services', 'pricing', 'terms', 'signature'],
    tags: ['simple', 'basic', 'quick'],
    rating: 4.4,
    usageCount: 2100,
    isPopular: true,
    globalTemplate: true,
    tenantId: 'admin',
    createdAt: '2024-01-10',
    updatedAt: '2024-02-15'
  },
  {
    id: 'tpl-6',
    name: 'Financial Advisory Agreement',
    description: 'Professional financial advisory services contract with fiduciary terms and fee structures.',
    contractType: 'service',
    industry: 'financial',
    complexity: 'complex',
    estimatedDuration: '25-35 min',
    blocks: ['header', 'services', 'fees', 'fiduciary', 'disclosure', 'terms', 'signature'],
    tags: ['financial', 'advisory', 'fiduciary'],
    rating: 4.9,
    usageCount: 445,
    isPopular: false,
    globalTemplate: true,
    tenantId: 'admin',
    createdAt: '2024-02-10',
    updatedAt: '2024-03-12'
  }
];

// API simulation functions
const fetchTemplates = async (filters: TemplateFilters, context?: TemplateContext): Promise<{
  templates: Template[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let filteredTemplates = [...MOCK_TEMPLATES];

  // Apply context-based filtering
  if (context?.isGlobal !== undefined) {
    filteredTemplates = filteredTemplates.filter(t => t.globalTemplate === context.isGlobal);
  }

  // Apply filters
  if (filters.industry) {
    filteredTemplates = filteredTemplates.filter(t => t.industry === filters.industry);
  }
  if (filters.contractType) {
    filteredTemplates = filteredTemplates.filter(t => t.contractType === filters.contractType);
  }
  if (filters.complexity) {
    filteredTemplates = filteredTemplates.filter(t => t.complexity === filters.complexity);
  }
  if (filters.isPopular) {
    filteredTemplates = filteredTemplates.filter(t => t.isPopular);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filteredTemplates = filteredTemplates.filter(t =>
      t.name.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search) ||
      t.tags.some(tag => tag.toLowerCase().includes(search))
    );
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'usageCount';
  const sortOrder = filters.sortOrder || 'desc';
  filteredTemplates.sort((a, b) => {
    const aVal = a[sortBy as keyof Template] as any;
    const bVal = b[sortBy as keyof Template] as any;
    return sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
  });

  // Apply pagination
  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const startIndex = (page - 1) * limit;
  const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + limit);

  return {
    templates: paginatedTemplates,
    pagination: {
      page,
      limit,
      total: filteredTemplates.length,
      totalPages: Math.ceil(filteredTemplates.length / limit)
    }
  };
};

const fetchTemplateStats = async (): Promise<TemplateStats> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  const globalTemplates = MOCK_TEMPLATES.filter(t => t.globalTemplate);
  const popularTemplates = MOCK_TEMPLATES.filter(t => t.isPopular);

  return {
    total: MOCK_TEMPLATES.length,
    global: globalTemplates.length,
    local: MOCK_TEMPLATES.length - globalTemplates.length,
    popular: popularTemplates.length,
    averageRating: MOCK_TEMPLATES.reduce((sum, t) => sum + t.rating, 0) / MOCK_TEMPLATES.length,
    totalUsage: MOCK_TEMPLATES.reduce((sum, t) => sum + t.usageCount, 0),
    byIndustry: MOCK_TEMPLATES.reduce((acc, t) => {
      acc[t.industry] = (acc[t.industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byComplexity: MOCK_TEMPLATES.reduce((acc, t) => {
      acc[t.complexity] = (acc[t.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
};

// Query keys
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: TemplateFilters) => [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
  stats: () => [...templateKeys.all, 'stats'] as const
};

// Main useTemplates hook with TanStack Query
export const useTemplates = (filters: TemplateFilters = {}, context?: TemplateContext) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: templateKeys.list(filters),
    queryFn: () => fetchTemplates(filters, context),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: stats } = useQuery({
    queryKey: templateKeys.stats(),
    queryFn: fetchTemplateStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const templates = data?.templates || [];
  const pagination = data?.pagination;

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.industry ||
      filters.contractType ||
      filters.complexity ||
      filters.isPopular ||
      filters.search
    );
  }, [filters]);

  const isEmpty = !loading && templates.length === 0;
  const isSearching = !!(filters.search && filters.search.trim().length > 0);
  const totalTemplates = pagination?.total || 0;

  // Helper functions
  const getIndustries = useCallback(() => INDUSTRIES, []);

  const getPopularTemplates = useCallback(() => {
    return MOCK_TEMPLATES.filter(t => t.isPopular).slice(0, 6);
  }, []);

  const getTemplateById = useCallback((id: string) => {
    return MOCK_TEMPLATES.find(t => t.id === id);
  }, []);

  return {
    templates,
    loading,
    error: error ? (error as Error).message : null,
    stats,
    pagination,
    hasActiveFilters,
    isEmpty,
    isSearching,
    totalTemplates,
    refetch,
    getIndustries,
    getPopularTemplates,
    getTemplateById,
    updateFilters: () => {}, // Filters are managed externally
  };
};

// Template selection hook
export const useTemplateSelection = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectionHistory, setSelectionHistory] = useState<Template[]>([]);

  const selectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setSelectionHistory(prev => {
      const filtered = prev.filter(t => t.id !== template.id);
      return [template, ...filtered].slice(0, 5);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  const isSelected = useCallback((templateId: string): boolean => {
    return selectedTemplate?.id === templateId;
  }, [selectedTemplate]);

  return {
    selectedTemplate,
    selectionHistory,
    selectTemplate,
    clearSelection,
    isSelected,
    hasSelection: !!selectedTemplate
  };
};

// Template analytics hook
export const useTemplateAnalytics = () => {
  const { data: analytics, isLoading: loading } = useQuery({
    queryKey: templateKeys.stats(),
    queryFn: fetchTemplateStats,
    staleTime: 10 * 60 * 1000,
  });

  return {
    analytics,
    loading,
    mostUsedTemplates: MOCK_TEMPLATES.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5),
    topRatedTemplates: MOCK_TEMPLATES.sort((a, b) => b.rating - a.rating).slice(0, 5),
    industryDistribution: analytics?.byIndustry || {},
    complexityDistribution: analytics?.byComplexity || {}
  };
};

// Constants export
export const TEMPLATE_COMPLEXITY_LABELS = {
  simple: 'Simple',
  medium: 'Medium',
  complex: 'Complex'
};

export const CONTRACT_TYPE_LABELS = {
  service: 'Service Contract',
  partnership: 'Partnership Agreement'
};

export const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

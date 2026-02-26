// src/hooks/queries/useRelationshipQueries.ts
// Unified Relationships query hooks — fetches contacts + contracts, merges client-side.
// Contacts become parent rows, contracts nest underneath (lazy-loaded on expand).

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS, type ContractCrudFilters } from '@/services/serviceURLs';
import type { Contact } from '@/types/contacts';
import type { Contract, ContractStatus } from '@/types/contracts';
import type {
  Relationship,
  RelationshipContractSummary,
  RelationshipListFilters,
  RelationshipPortfolioSummary,
} from '@/types/relationships';

// =================================================================
// QUERY KEYS
// =================================================================

export const relationshipKeys = {
  all: ['relationships'] as const,
  lists: () => [...relationshipKeys.all, 'list'] as const,
  list: (filters: RelationshipListFilters) => [...relationshipKeys.lists(), { filters }] as const,
  contracts: (contactId: string) => [...relationshipKeys.all, 'contracts', contactId] as const,
  portfolio: (perspective: string) => [...relationshipKeys.all, 'portfolio', perspective] as const,
};

// =================================================================
// HELPERS
// =================================================================

/** Build empty contract summary */
const emptyContractSummary = (): RelationshipContractSummary => ({
  contract_count: 0,
  total_value: 0,
  total_collected: 0,
  outstanding: 0,
  avg_health: 0,
  overdue_events: 0,
  by_status: {},
});

/** Determine classification filter from perspective */
const classificationFromPerspective = (perspective: 'revenue' | 'expense'): string[] => {
  // Revenue = clients who buy from us → "client" classification on contact
  // Expense = vendors who supply to us → "vendor" classification on contact
  return perspective === 'revenue'
    ? ['client']
    : ['vendor'];
};

/** Contract type filter from perspective (for contracts API) */
const contractTypeFromPerspective = (perspective: 'revenue' | 'expense'): string => {
  return perspective === 'revenue' ? 'client' : 'vendor';
};

// =================================================================
// HOOK: useRelationships — Fetches contacts, enriches with contract stats
// =================================================================

export const useRelationships = (
  filters: RelationshipListFilters,
  options?: { enabled?: boolean }
) => {
  const { currentTenant, isLive } = useAuth();

  return useQuery({
    queryKey: relationshipKeys.list(filters),
    queryFn: async () => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      // ─── Step 1: Fetch contacts (filtered by classification for perspective) ───
      const classifications = classificationFromPerspective(filters.perspective);

      const contactParams = new URLSearchParams();
      contactParams.append('page', String(filters.page || 1));
      contactParams.append('limit', String(filters.limit || 25));
      contactParams.append('classifications', classifications.join(','));
      if (filters.contactStatus) contactParams.append('status', filters.contactStatus);
      if (filters.search) contactParams.append('search', filters.search);
      if (filters.sortBy === 'name') {
        contactParams.append('sort_by', 'name');
        contactParams.append('sort_order', filters.sortDirection || 'asc');
      } else if (filters.sortBy === 'created_at') {
        contactParams.append('sort_by', 'created_at');
        contactParams.append('sort_order', filters.sortDirection || 'desc');
      } else {
        contactParams.append('sort_by', 'created_at');
        contactParams.append('sort_order', 'desc');
      }

      const contactResponse = await api.get(`/api/contacts?${contactParams.toString()}`, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        },
      });

      const contactsRaw: Contact[] = contactResponse.data?.data || [];
      const pagination = contactResponse.data?.pagination;

      // ─── Step 2: Fetch grouped contracts (by buyer) for this perspective ───
      const contractType = contractTypeFromPerspective(filters.perspective);
      const contractFilters: ContractCrudFilters = {
        contract_type: contractType,
        group_by: 'buyer',
        limit: 200,
        page: 1,
      };
      if (filters.status) contractFilters.status = filters.status as string;

      const contractUrl = API_ENDPOINTS.CONTRACTS.LIST_WITH_FILTERS(contractFilters);
      const contractResponse = await api.get(contractUrl);
      const contractData = contractResponse.data?.data || contractResponse.data;

      // Build a lookup: contact_id → contracts[]
      const contractsByContact = new Map<string, Contract[]>();
      if (contractData?.groups) {
        for (const group of contractData.groups) {
          // Map by buyer_id (which links to contact_id)
          for (const c of group.contracts) {
            const contactId = c.contact_id || c.buyer_id;
            if (contactId) {
              if (!contractsByContact.has(contactId)) {
                contractsByContact.set(contactId, []);
              }
              contractsByContact.get(contactId)!.push(c);
            }
          }
        }
      } else if (contractData?.items) {
        // Flat list fallback
        for (const c of contractData.items) {
          const contactId = c.contact_id || c.buyer_id;
          if (contactId) {
            if (!contractsByContact.has(contactId)) {
              contractsByContact.set(contactId, []);
            }
            contractsByContact.get(contactId)!.push(c);
          }
        }
      }

      // ─── Step 3: Merge contacts + contracts into Relationship[] ───
      const relationships: Relationship[] = contactsRaw
        .filter((c) => !c.parent_contact_ids || c.parent_contact_ids.length === 0) // Exclude child contacts (contact persons)
        .map((contact) => {
          const contracts = contractsByContact.get(contact.id) || [];

          // Aggregate contract stats
          const summary: RelationshipContractSummary = {
            contract_count: contracts.length,
            total_value: contracts.reduce(
              (s, c) => s + (c.grand_total || c.total_value || 0),
              0
            ),
            total_collected: contracts.reduce(
              (s, c) => s + (c.total_collected || 0),
              0
            ),
            outstanding: 0,
            avg_health:
              contracts.length > 0
                ? Math.round(
                    contracts.reduce((s, c) => s + (c.health_score ?? 100), 0) /
                      contracts.length
                  )
                : 0,
            overdue_events: contracts.reduce(
              (s, c) => s + (c.events_overdue || 0),
              0
            ),
            by_status: contracts.reduce((acc, c) => {
              const status = c.status as ContractStatus;
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {} as Partial<Record<ContractStatus, number>>),
          };
          summary.outstanding = summary.total_value - summary.total_collected;

          return { contact, contractSummary: summary };
        });

      // ─── Step 4: Client-side sort if not name/created_at ───
      if (filters.sortBy === 'contract_count') {
        relationships.sort((a, b) =>
          (filters.sortDirection === 'asc' ? 1 : -1) *
          (a.contractSummary.contract_count - b.contractSummary.contract_count)
        );
      } else if (filters.sortBy === 'total_value') {
        relationships.sort((a, b) =>
          (filters.sortDirection === 'asc' ? 1 : -1) *
          (a.contractSummary.total_value - b.contractSummary.total_value)
        );
      } else if (filters.sortBy === 'health') {
        relationships.sort((a, b) =>
          (filters.sortDirection === 'asc' ? 1 : -1) *
          (a.contractSummary.avg_health - b.contractSummary.avg_health)
        );
      }

      // ─── Step 5: Filter by contract status (client-side) ───
      let filtered = relationships;
      if (filters.status) {
        filtered = relationships.filter(
          (r) => (r.contractSummary.by_status[filters.status!] || 0) > 0
        );
      }

      const totalCount = pagination?.total || filtered.length;
      const totalPages = pagination?.totalPages || Math.ceil(totalCount / (filters.limit || 25));

      return {
        relationships: filtered,
        totalCount,
        page: filters.page || 1,
        totalPages,
        hasNextPage: (filters.page || 1) < totalPages,
        hasPrevPage: (filters.page || 1) > 1,
      };
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// =================================================================
// HOOK: useRelationshipContracts — Lazy-loads contracts for a single contact
// =================================================================

export const useRelationshipContracts = (
  contactId: string | null,
  perspective: 'revenue' | 'expense',
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: relationshipKeys.contracts(contactId || ''),
    queryFn: async (): Promise<Contract[]> => {
      if (!contactId || !currentTenant?.id) return [];

      const contractType = contractTypeFromPerspective(perspective);
      const contractFilters: ContractCrudFilters = {
        contract_type: contractType,
        limit: 50,
        page: 1,
        sort_by: 'created_at',
        sort_direction: 'desc',
      };

      const url = API_ENDPOINTS.CONTRACTS.LIST_WITH_FILTERS(contractFilters);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      const allContracts: Contract[] = data?.items || [];

      // Filter to contracts belonging to this contact
      return allContracts.filter(
        (c) => c.contact_id === contactId || c.buyer_id === contactId
      );
    },
    enabled: !!contactId && !!currentTenant?.id && options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// =================================================================
// HOOK: useRelationshipPortfolio — Summary stats for the top strip
// =================================================================

export const useRelationshipPortfolio = (
  perspective: 'revenue' | 'expense',
  options?: { enabled?: boolean }
) => {
  const { currentTenant, isLive } = useAuth();

  return useQuery({
    queryKey: relationshipKeys.portfolio(perspective),
    queryFn: async (): Promise<RelationshipPortfolioSummary> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      // Fetch contact stats
      const contactStatsResponse = await api.get('/api/contacts/stats', {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        },
      });
      const contactStats = contactStatsResponse.data?.data;

      // Fetch contract stats for this perspective
      const contractType = contractTypeFromPerspective(perspective);
      const contractStatsUrl = `${API_ENDPOINTS.CONTRACTS.STATS}?contract_type=${encodeURIComponent(contractType)}`;
      const contractStatsResponse = await api.get(contractStatsUrl);
      const contractStats = contractStatsResponse.data?.data || contractStatsResponse.data;

      const portfolio = contractStats?.portfolio;

      return {
        totalRelationships: contactStats?.total || 0,
        totalContracts: contractStats?.total || 0,
        totalValue: contractStats?.total_value || 0,
        totalCollected: portfolio?.total_collected || 0,
        outstanding: portfolio?.outstanding || 0,
        avgHealth: portfolio?.avg_health_score || 0,
        overdueEvents: portfolio?.total_overdue_events || 0,
        needsAttention: portfolio?.needs_attention_count || 0,
        byContractStatus: contractStats?.by_status || {},
      };
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { CONTACT_CLASSIFICATION_CONFIG } from '@/utils/constants/contacts';
import type { Contract } from '@/types/contracts';
import { listScopeKey } from './model';

// A contact tag is NOT the contract's commercial type or Revenue/Expense mode.
// Read the saved contact classification; never infer Client from missing data.
export default function ContactClassificationBadge({ contract }: { contract: Contract }) {
  const { currentTenant, isLive, perspective } = useAuth();
  const tenantId = currentTenant?.id || '';
  const owned = contract.tenant_id === tenantId;
  // Accessor records contain the owner's contact IDs, which must not be looked
  // up in this tenant. Only use a resolved local seller_contact_id in that case.
  const contactId = owned ? contract.buyer_id || contract.contact_id : contract.seller_contact_id;
  const query = useQuery({
    queryKey: [...listScopeKey(tenantId, isLive, perspective), 'contact-classification', contactId],
    enabled: !!tenantId && !!contactId,
    queryFn: async ({ signal }) => {
      const response = await api.get(API_ENDPOINTS.CONTACTS.GET(contactId!), { signal });
      const contact = response.data?.data;
      if (String(response.config.headers['x-tenant-id']) !== tenantId ||
          response.config.headers['x-environment'] !== (isLive ? 'live' : 'test') ||
          response.data?.success === false || contact?.id !== contactId ||
          !Array.isArray(contact.classifications)) {
        throw new Error('Contact classification unavailable');
      }
      // Same shapes supported by contactService's existing normalization:
      // strings, { classification_value }, and { value } records.
      const classifications = contact.classifications.map((value: unknown) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
          const record = value as { classification_value?: unknown; value?: unknown };
          return record.classification_value || record.value;
        }
        return undefined;
      });
      return CONTACT_CLASSIFICATION_CONFIG.filter(c => classifications.includes(c.id)).map(c => c.label);
    },
    staleTime: 60_000,
    retry: false,
  });
  // Deduplicated by contact ID across rows. Failure leaves the list usable and
  // does not invent a classification. Multiple classifications remain visible.
  if (!contactId) return owned ? null : <span className="cnl-relationship-label">Shared with you</span>;
  if (query.isPending || query.isError || !query.data?.length) return null;
  return <>{query.data.map(label => <span className="cnl-relationship-label" title="Saved contact classification" key={label}>{label}</span>)}</>;
}

import React, { type CSSProperties } from 'react';
import { Handshake, Package, ShoppingCart, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { CONTACT_CLASSIFICATION_CONFIG, getClassificationColors } from '@/utils/constants/contacts';
import { useTheme } from '@/contexts/ThemeContext';
import type { Contract } from '@/types/contracts';
import { listScopeKey } from './model';

// A contact tag is NOT the contract's commercial type or Revenue/Expense mode.
// Read the saved contact classification; never infer Client from missing data.
export default function ContactClassificationBadge({ contract }: { contract: Contract }) {
  const { currentTenant, isLive, perspective } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
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
      if (classifications.some(value => !CONTACT_CLASSIFICATION_CONFIG.some(c => c.id === value))) {
        throw new Error('Contact classification is invalid.');
      }
      return CONTACT_CLASSIFICATION_CONFIG.filter(c => classifications.includes(c.id)).map(c => c.id);
    },
    staleTime: 60_000,
    retry: false,
  });
  // Deduplicated by contact ID across rows. Failure leaves the list usable and
  // does not invent a classification. Multiple classifications remain visible.
  const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, border: '1px solid', fontSize: 12, fontWeight: 650, lineHeight: '18px', margin: '6px 0 0 8px', verticalAlign: 'middle', maxWidth: '100%', flexWrap: 'wrap' };
  const issueStyle: CSSProperties = { ...pill, color: colors.utility.primaryText, background: colors.utility.secondaryBackground, borderColor: colors.semantic.error };
  if (!contactId) return <span className="cnl-classification-issue" style={issueStyle}>Contact link missing</span>;
  if (query.isPending) return <span role="status" style={{ ...pill, color: colors.utility.secondaryText, borderColor: colors.utility.secondaryText }}>Loading contact classification…</span>;
  if (query.isError) return <span className="cnl-classification-issue" role="status" style={issueStyle}>
    {query.error instanceof Error && query.error.message === 'Contact classification is invalid.' ? query.error.message : 'Couldn’t load contact classification'}
    <button type="button" aria-label="Retry contact classification" disabled={query.isFetching} onClick={() => void query.refetch()} style={{ color: colors.utility.primaryText, background: 'transparent', border: 0, textDecoration: 'underline', minHeight: 32, padding: '4px 8px', fontSize: 12 }}>{query.isFetching ? 'Retrying…' : 'Retry'}</button>
  </span>;
  if (!query.data?.length) return <span className="cnl-classification-issue" style={issueStyle}>Contact classification missing</span>;
  const icons = { client: ShoppingCart, vendor: Package, partner: Handshake, team_member: Users };
  return <>{query.data.map(id => {
    const config = CONTACT_CLASSIFICATION_CONFIG.find(c => c.id === id)!;
    const badgeColors = getClassificationColors(config.colorKey, colors, 'badge');
    const Icon = icons[id];
    return <span className="cnl-relationship-label" title="Saved contact classification" key={id} style={{ ...pill, background: badgeColors.bg, color: badgeColors.text, borderColor: badgeColors.border }}><Icon size={14} aria-hidden="true" />{config.label}</span>;
  })}</>;
}

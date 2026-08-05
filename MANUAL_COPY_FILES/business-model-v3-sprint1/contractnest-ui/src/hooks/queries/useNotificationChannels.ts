// src/hooks/queries/useNotificationChannels.ts
//
// Reads the notification channel list from the tenant LOV
// (Settings → LOV → Notification Channels), seeded by migration 011.
//
// WHY NOT useTenantMasterData?
// Because it does not work. The product-masterdata edge function routes on
// pathname, and its branches are ordered:
//
//     } else if (pathname.includes('/product-masterdata')) {   // matches first
//         getProductMasterData(...)   → queries the GLOBAL m_ tables
//     } else if (pathname.includes('/tenant-masterdata')) {    // unreachable
//         getTenantMasterData(...)    → queries the TENANT t_ tables
//
// The API calls `/functions/v1/product-masterdata/tenant-masterdata`, whose
// pathname contains '/product-masterdata', so the global branch always wins and
// the tenant branch is dead code. Any tenant LOV lookup through
// useTenantMasterData silently returns global data or not-found. That is a
// pre-existing bug affecting every category, logged separately — fixing it means
// reordering and redeploying that edge function.
//
// This hook instead uses /api/masterdata/*, which is served by a DIFFERENT edge
// function ('masterdata') and is the same path Settings → LOV itself uses, so it
// is known-good.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

/** The LOV category that holds the channel list. */
export const NOTIFICATION_CHANNELS_CATEGORY = 'notification_channels';

export interface NotificationChannel {
  id: string;
  /** Lowercase channel KEY — 'whatsapp' | 'email' | 'sms' | 'inapp'.
   *  Must match t_bm_credit_balance.channel and the credit_grant_rates keys. */
  sub_cat_name: string;
  display_name: string;
  hexcolor?: string | null;
  icon_name?: string | null;
  sequence_no?: number;
  is_active?: boolean;
}

interface CategoryMasterRow {
  id: string;
  category_name: string;
}

/**
 * Active notification channels for the current tenant, ordered by sequence.
 *
 * Inactive channels (SMS and In-App today) are filtered out, so activating one
 * is a toggle in Settings → LOV with no code change.
 */
export const useNotificationChannels = () => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;

  return useQuery({
    queryKey: ['notification-channels', tenantId],
    queryFn: async (): Promise<NotificationChannel[]> => {
      if (!tenantId) return [];

      // 1. Find the category id by name. /api/masterdata/categories returns the
      //    tenant's t_category_master rows.
      const catResponse = await api.get(
        `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${tenantId}`
      );
      const categories: CategoryMasterRow[] =
        catResponse.data?.data ?? catResponse.data ?? [];

      const channelCategory = categories.find(
        (c) => c.category_name?.toLowerCase() === NOTIFICATION_CHANNELS_CATEGORY
      );
      if (!channelCategory) return [];

      // 2. Fetch its values from t_category_details.
      const detailResponse = await api.get(
        `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${channelCategory.id}&tenantId=${tenantId}`
      );
      const details: NotificationChannel[] =
        detailResponse.data?.data ?? detailResponse.data ?? [];

      return details
        .filter((d) => d.is_active !== false)
        .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0));
    },
    enabled: !!tenantId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export default useNotificationChannels;

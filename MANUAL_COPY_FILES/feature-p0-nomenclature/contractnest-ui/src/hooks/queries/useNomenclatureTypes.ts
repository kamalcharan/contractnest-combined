// src/hooks/queries/useNomenclatureTypes.ts
// Fetches contract nomenclature types from m_category_details
// via product-masterdata edge function (category_name = 'cat_contract_nomenclature')

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────

export interface NomenclatureFormSettings {
  short_name: string;
  full_name: string;
  group: string;
  group_label: string;
  group_icon: string;
  is_equipment_based: boolean;
  is_entity_based: boolean;
  is_service_based: boolean;
  wizard_route: string;
  typical_duration: string;
  typical_billing: string;
  scope_includes: string[];
  scope_excludes: string[];
  industries: string[];
  icon: string;
}

export interface NomenclatureType {
  id: string;
  sub_cat_name: string;
  display_name: string;
  description: string;
  icon_name: string;
  hexcolor: string;
  sequence_no: number;
  form_settings: NomenclatureFormSettings;
}

export interface NomenclatureGroup {
  group: string;
  label: string;
  icon: string;
  items: NomenclatureType[];
}

// ─── Query Key ──────────────────────────────────────────────────────

export const nomenclatureKeys = {
  all: ['nomenclature'] as const,
  types: () => [...nomenclatureKeys.all, 'types'] as const,
};

// ─── Hook ───────────────────────────────────────────────────────────

export const useNomenclatureTypes = () => {
  const { user, currentTenant } = useAuth();

  return useQuery({
    queryKey: nomenclatureKeys.types(),
    queryFn: async (): Promise<NomenclatureGroup[]> => {
      if (!user?.token || !currentTenant?.id) {
        throw new Error('User not authenticated or no tenant selected');
      }

      const response = await fetch(
        `/api/functions/product-masterdata?category_name=cat_contract_nomenclature`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            'x-tenant-id': currentTenant.id,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch nomenclature types: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch nomenclature types');
      }

      // Transform raw items into typed NomenclatureType[]
      const items: NomenclatureType[] = (result.data || []).map((item: any) => ({
        id: item.id || item.category_detail_id,
        sub_cat_name: item.sub_cat_name || item.value_code || '',
        display_name: item.display_name || item.name || '',
        description: item.description || '',
        icon_name: item.icon_name || '',
        hexcolor: item.hexcolor || item.hex_color || '#6366F1',
        sequence_no: item.sequence_no || 0,
        form_settings: item.form_settings || {},
      }));

      // Group by form_settings.group
      const groupMap: Record<string, NomenclatureGroup> = {};

      items.forEach((item) => {
        const groupKey = item.form_settings?.group || 'other';
        if (!groupMap[groupKey]) {
          groupMap[groupKey] = {
            group: groupKey,
            label: item.form_settings?.group_label || groupKey,
            icon: item.form_settings?.group_icon || 'FileText',
            items: [],
          };
        }
        groupMap[groupKey].items.push(item);
      });

      // Sort groups in defined order
      const groupOrder = ['equipment_maintenance', 'facility_property', 'service_delivery', 'flexible_hybrid'];
      return groupOrder
        .filter((key) => groupMap[key])
        .map((key) => groupMap[key])
        .concat(
          Object.entries(groupMap)
            .filter(([key]) => !groupOrder.includes(key))
            .map(([, group]) => group)
        );
    },
    enabled: !!user?.token && !!currentTenant?.id,
    staleTime: 30 * 60 * 1000, // 30 min — nomenclature types rarely change
    retry: 2,
  });
};

// ─── Helper: find nomenclature by ID ────────────────────────────────

export const findNomenclatureById = (
  groups: NomenclatureGroup[],
  id: string | null
): NomenclatureType | undefined => {
  if (!id) return undefined;
  for (const group of groups) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
};

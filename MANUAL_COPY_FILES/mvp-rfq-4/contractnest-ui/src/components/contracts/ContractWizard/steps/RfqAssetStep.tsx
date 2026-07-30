// src/components/contracts/ContractWizard/steps/RfqAssetStep.tsx
// RFQ-only asset picker.
//
// The contract wizard's AssetSelectionStep answers "which of your CLIENT's
// assets does this contract cover" — it is keyed on a counterparty
// (useClientAssets({ contact_id })) and carries the whole "client lists them
// after signing" flow. An RFQ is the mirror image: the equipment is the
// BUYER's OWN, drawn from their equipment/facility registry, and there is no
// counterparty yet. So this is a separate, deliberately small step rather than
// a bent version of that one.
//
// It reads the tenant's own registry (useAssets — the same source the
// equipment-registry page uses), lets the buyer tick what this request covers
// and set a quantity, and writes EquipmentDetailItem[] into wizardState.
// equipmentDetails, which the mapper already forwards as equipment_details.
//
// Optional by design: a pure-service request ("10 guards, 1 year") picks
// nothing here and continues — the gate lets it, and the services step still
// requires at least one line.

import React, { useMemo } from 'react';
import { Package, Building2, Loader2, Check, Minus, Plus, Info } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/hooks/queries/useAssetRegistry';
import type { TenantAsset } from '@/types/assetRegistry';
import type { EquipmentDetailItem } from './AssetSelectionStep';

interface RfqAssetStepProps {
  equipmentDetails: EquipmentDetailItem[];
  onEquipmentDetailsChange: (items: EquipmentDetailItem[]) => void;
}

const isFacility = (a: TenantAsset) => (a.resource_type_id || '').toLowerCase() === 'asset';

const RfqAssetStep: React.FC<RfqAssetStepProps> = ({
  equipmentDetails,
  onEquipmentDetailsChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  // The tenant's OWN registry — equipment and facilities both.
  const { data, isLoading, isError, refetch } = useAssets({ limit: 500, offset: 0 });
  const assets: TenantAsset[] = (data?.data as TenantAsset[]) || [];

  // Fast lookup of what's already picked, keyed by the registry asset id.
  const picked = useMemo(() => {
    const m = new Map<string, EquipmentDetailItem>();
    for (const d of equipmentDetails) {
      if (d.asset_registry_id) m.set(d.asset_registry_id, d);
    }
    return m;
  }, [equipmentDetails]);

  const toEquipmentDetail = (a: TenantAsset, quantity: number): EquipmentDetailItem => ({
    id: a.id,
    asset_registry_id: a.id,
    added_by_tenant_id: currentTenant?.id || '',
    added_by_role: 'buyer',
    resource_type: isFacility(a) ? 'entity' : 'equipment',
    category_id: a.asset_type_id || a.resource_type_id || null,
    category_name: isFacility(a) ? 'Facility' : 'Equipment',
    item_name: a.name,
    quantity,
    make: a.make ?? null,
    model: a.model ?? null,
    serial_number: a.serial_number ?? null,
    condition: a.condition ?? null,
    criticality: a.criticality ?? null,
    location: a.location ?? null,
    purchase_date: a.purchase_date ?? null,
    warranty_expiry: a.warranty_expiry ?? null,
    area_sqft: a.area_sqft ?? null,
    dimensions: a.dimensions ?? null,
    capacity: a.capacity ?? null,
    specifications: a.specifications || {},
    notes: null,
  });

  const setQuantity = (a: TenantAsset, quantity: number) => {
    const others = equipmentDetails.filter((d) => d.asset_registry_id !== a.id);
    if (quantity <= 0) {
      onEquipmentDetailsChange(others);
    } else {
      onEquipmentDetailsChange([...others, toEquipmentDetail(a, quantity)]);
    }
  };

  const toggle = (a: TenantAsset) => {
    if (picked.has(a.id)) setQuantity(a, 0);
    else setQuantity(a, 1);
  };

  const groups = useMemo(() => {
    const equipment = assets.filter((a) => !isFacility(a));
    const facilities = assets.filter(isFacility);
    return [
      { key: 'equipment', label: 'Equipment', icon: Package, items: equipment },
      { key: 'facilities', label: 'Facilities & areas', icon: Building2, items: facilities },
    ].filter((g) => g.items.length > 0);
  }, [assets]);

  const selectedCount = picked.size;

  // ── states ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="px-6 py-16 flex items-center justify-center gap-2" style={{ color: colors.utility.secondaryText }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading your registry…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
          Couldn&apos;t load your registry just now.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: colors.brand.primary, color: '#fff' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      {/* Why this step, in one line — a pure service can skip it */}
      <div
        className="flex items-start gap-2.5 rounded-xl p-3 mb-4"
        style={{ background: `${colors.brand.primary}0D`, color: colors.utility.secondaryText }}
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.brand.primary }} />
        <p className="text-[13px] leading-relaxed">
          Pick the equipment or facilities <strong style={{ color: colors.utility.primaryText }}>you own</strong> that
          this request covers — they come from your registry. Buying a pure service like security or
          housekeeping? Just continue; you&apos;ll describe it next.
        </p>
      </div>

      {assets.length === 0 && (
        <div
          className="rounded-xl border p-6 text-center"
          style={{ borderColor: `${colors.utility.primaryText}15`, color: colors.utility.secondaryText }}
        >
          <p className="text-sm">
            Your registry is empty. Continue for a pure-service request, or add equipment in the
            Equipment Registry first.
          </p>
        </div>
      )}

      {groups.map((g) => {
        const Icon = g.icon;
        return (
          <div key={g.key} className="mb-5">
            <div
              className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider mb-2"
              style={{ color: colors.utility.secondaryText }}
            >
              <Icon className="w-3.5 h-3.5" />
              {g.label}
            </div>

            <div className="space-y-2">
              {g.items.map((a) => {
                const sel = picked.get(a.id);
                const on = !!sel;
                const qty = sel?.quantity ?? 0;
                const subtitle = [a.make, a.model, a.location].filter(Boolean).join(' · ');
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border p-3 transition-colors"
                    style={{
                      borderColor: on ? colors.brand.primary : `${colors.utility.primaryText}12`,
                      background: on ? `${colors.brand.primary}0D` : 'transparent',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(a)}
                      aria-pressed={on}
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        border: `1.5px solid ${on ? colors.brand.primary : `${colors.utility.primaryText}30`}`,
                        background: on ? colors.brand.primary : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {on && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggle(a)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                        {a.name}
                      </div>
                      {subtitle && (
                        <div className="text-[11px] truncate" style={{ color: colors.utility.secondaryText }}>
                          {subtitle}
                        </div>
                      )}
                    </button>

                    {on && (
                      <div
                        className="flex items-center rounded-lg overflow-hidden flex-shrink-0"
                        style={{ border: `1px solid ${colors.utility.primaryText}15` }}
                      >
                        <button
                          type="button"
                          onClick={() => setQuantity(a, Math.max(0, qty - 1))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{ background: `${colors.utility.primaryText}08`, color: colors.utility.primaryText }}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className="w-9 text-center text-sm font-semibold tabular-nums"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(a, qty + 1)}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{ background: `${colors.utility.primaryText}08`, color: colors.utility.primaryText }}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="text-[12px]" style={{ color: colors.utility.secondaryText }}>
        {selectedCount > 0
          ? `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected — describe the services you want quoted next.`
          : 'Nothing selected — continue for a pure-service request.'}
      </div>
    </div>
  );
};

export default RfqAssetStep;

// src/components/lite/LiteRegistryIntel.tsx
//
// Registry intelligence for lite BUYERS (cnak): the claimed contract already
// names the equipment/entities it covers (t_contracts.equipment_details,
// filled by the seller). This card surfaces the ones missing from the
// buyer's own registry and adds them in one tap — each created asset is
// also linked back to the contract (t_client_contract_assets) so service
// history lands on the asset from day one.
//
// Reuse only: useQueries mirrors useContract's queryFn/key, creation and
// linking go through the existing registry hooks (which own their success/
// error toasts and cache invalidation). No new endpoints.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Wrench, Landmark, Plus, Check, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { contractKeys } from '@/hooks/queries/useContractQueries';
import {
  useClientAssets,
  useCreateClientAsset,
  useLinkContractAssets
} from '@/hooks/queries/useClientAssetRegistry';
import type { ContractEquipmentDetail } from '@/types/contracts';

interface LiteRegistryIntelProps {
  /** Claimed contract ids (lite buyers rarely have more than one or two) */
  contractIds: string[];
}

/** One physical unit derived from a coverage entry (quantity N → N units) */
interface CoverageUnit {
  key: string;
  contractId: string;
  detail: ContractEquipmentDetail;
  unitIndex: number; // 0-based within the detail's quantity
  name: string;
  isEntity: boolean;
}

const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase();

const MAX_CONTRACTS = 3;

const LiteRegistryIntel: React.FC<LiteRegistryIntelProps> = ({ contractIds }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;

  const ids = contractIds.slice(0, MAX_CONTRACTS);

  // Contract details (same key + fetch shape as useContract, so the cache
  // is shared with the contract view page).
  const detailQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: contractKeys.detail(id),
      queryFn: async () => {
        const response = await api.get(API_ENDPOINTS.CONTRACTS.GET(id));
        return response.data?.data || response.data;
      },
      staleTime: 5 * 60 * 1000,
      enabled: !!id
    }))
  });

  const { data: assetsResp, isLoading: assetsLoading } = useClientAssets({ limit: 500 });
  const existingAssets = assetsResp?.data || [];

  const createAsset = useCreateClientAsset();
  const linkAssets = useLinkContractAssets();

  // Per-unit local status so double taps and "Add all" can't double-create.
  const [unitStatus, setUnitStatus] = useState<Record<string, 'adding' | 'added'>>({});

  const detailsLoading = detailQueries.some((q) => q.isLoading);

  const units: CoverageUnit[] = useMemo(() => {
    const out: CoverageUnit[] = [];
    detailQueries.forEach((q, idx) => {
      const contract: any = q.data;
      if (!contract) return;
      const details: ContractEquipmentDetail[] = contract.equipment_details || [];
      details.forEach((d) => {
        const qty = Math.max(1, Number(d.quantity) || 1);
        for (let u = 0; u < qty; u++) {
          out.push({
            key: `${ids[idx]}:${d.id}:${u}`,
            contractId: ids[idx],
            detail: d,
            unitIndex: u,
            name: qty > 1 ? `${d.item_name} #${u + 1}` : d.item_name,
            isEntity: d.resource_type === 'entity'
          });
        }
      });
    });
    return out;
  }, [detailQueries, ids]);

  // A unit counts as "in the registry" when an existing asset matches by
  // serial number (strong) or by exact name (weak but the best we have for
  // seller-entered rows that carry no serial).
  const missingUnits = useMemo(() => {
    const byName = new Set(existingAssets.map((a) => norm(a.name)));
    const bySerial = new Set(existingAssets.map((a) => norm(a.serial_number)).filter(Boolean));
    return units.filter((u) => {
      if (unitStatus[u.key] === 'added') return false;
      const serial = norm(u.detail.serial_number);
      if (serial && bySerial.has(serial)) return false;
      return !byName.has(norm(u.name)) && !byName.has(norm(u.detail.item_name));
    });
  }, [units, existingAssets, unitStatus]);

  const addUnit = async (unit: CoverageUnit) => {
    if (unitStatus[unit.key] === 'adding' || unitStatus[unit.key] === 'added') return;
    setUnitStatus((prev) => ({ ...prev, [unit.key]: 'adding' }));
    try {
      const d = unit.detail;
      const created = await createAsset.mutateAsync({
        name: unit.name,
        resource_type_id: unit.isEntity ? 'asset' : 'equipment',
        ownership_type: 'self',
        description: d.category_name
          ? `${d.category_name} — added from contract coverage`
          : 'Added from contract coverage',
        status: 'active',
        condition: d.condition || 'good',
        criticality: d.criticality || 'medium',
        location: d.location || undefined,
        make: d.make || undefined,
        model: d.model || undefined,
        serial_number: d.serial_number || undefined,
        purchase_date: d.purchase_date || undefined,
        warranty_expiry: d.warranty_expiry || undefined,
        area_sqft: d.area_sqft || undefined,
        capacity: d.capacity || undefined,
        specifications: {},
        tags: ['from-contract']
      } as any);

      // Link the new asset back to its contract. Non-fatal: the asset row is
      // already useful on its own; the link hook shows its own error toast.
      if (created?.id) {
        try {
          await linkAssets.mutateAsync({
            contractId: unit.contractId,
            assets: [{ asset_id: created.id, coverage_type: d.category_name || undefined }]
          });
        } catch {
          /* toast handled by useLinkContractAssets */
        }
      }

      setUnitStatus((prev) => ({ ...prev, [unit.key]: 'added' }));
    } catch {
      // Creation failed (toast shown by useCreateClientAsset) — allow retry.
      setUnitStatus((prev) => {
        const next = { ...prev };
        delete next[unit.key];
        return next;
      });
    }
  };

  const [addingAll, setAddingAll] = useState(false);
  const addAll = async () => {
    if (addingAll) return;
    setAddingAll(true);
    try {
      // Sequential on purpose: keeps the name-duplication check meaningful
      // and avoids hammering the API from a burst of parallel creates.
      for (const unit of missingUnits) {
        // eslint-disable-next-line no-await-in-loop
        await addUnit(unit);
      }
    } finally {
      setAddingAll(false);
    }
  };

  // Nothing to say: no coverage on the claimed contract(s), or still loading
  // the very first time. (While loading we render nothing rather than a
  // spinner — the dashboard already has its own loader pass.)
  if (detailsLoading || assetsLoading) return null;
  if (units.length === 0) return null;

  const allCovered = missingUnits.length === 0;

  return (
    <div
      data-walkover="registry"
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${allCovered ? colors.semantic.success + '50' : brand + '50'}`
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ borderColor: `${colors.utility.primaryText}10` }}
      >
        <Wrench size={14} style={{ color: allCovered ? colors.semantic.success : brand }} />
        <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
          {allCovered
            ? 'All covered assets are in your registry'
            : `This contract covers ${units.length} asset${units.length === 1 ? '' : 's'} — ${missingUnits.length} not in your registry yet`}
        </span>
        {!allCovered && missingUnits.length > 1 && (
          <button
            onClick={addAll}
            disabled={addingAll}
            className="ml-auto flex-none text-[11px] font-bold rounded-lg px-3 py-1.5 text-white disabled:opacity-60"
            style={{ backgroundColor: brand }}
          >
            {addingAll ? 'Adding…' : `Add all ${missingUnits.length}`}
          </button>
        )}
        {allCovered && (
          <button
            onClick={() => navigate('/equipment-registry')}
            className="ml-auto flex-none inline-flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1.5"
            style={{ color: brand, backgroundColor: `${brand}12`, border: `1px solid ${brand}40` }}
          >
            Open registry <ArrowRight size={11} />
          </button>
        )}
      </div>

      {!allCovered &&
        missingUnits.map((u) => {
          const status = unitStatus[u.key];
          const Icon = u.isEntity ? Landmark : Wrench;
          return (
            <div
              key={u.key}
              className="px-4 py-2.5 flex items-center gap-3 border-b last:border-b-0"
              style={{ borderColor: `${colors.utility.primaryText}08` }}
            >
              <Icon size={14} className="flex-none" style={{ color: colors.utility.secondaryText }} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                  {u.name}
                </div>
                <div className="text-[11px] truncate" style={{ color: colors.utility.secondaryText }}>
                  {[u.detail.category_name, u.detail.make, u.detail.model].filter(Boolean).join(' · ') ||
                    (u.isEntity ? 'Facility / entity' : 'Equipment')}
                </div>
              </div>
              <button
                onClick={() => addUnit(u)}
                disabled={status === 'adding' || addingAll}
                className="ml-auto flex-none inline-flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1.5 disabled:opacity-60"
                style={{ color: brand, backgroundColor: `${brand}12`, border: `1px solid ${brand}40` }}
              >
                {status === 'adding' ? (
                  'Adding…'
                ) : (
                  <>
                    <Plus size={11} /> Add to registry
                  </>
                )}
              </button>
            </div>
          );
        })}

      {!allCovered && units.length > missingUnits.length && (
        <div
          className="px-4 py-2 flex items-center gap-1.5 text-[11px]"
          style={{ color: colors.semantic.success }}
        >
          <Check size={12} /> {units.length - missingUnits.length} already in your registry
        </div>
      )}
    </div>
  );
};

export default LiteRegistryIntel;

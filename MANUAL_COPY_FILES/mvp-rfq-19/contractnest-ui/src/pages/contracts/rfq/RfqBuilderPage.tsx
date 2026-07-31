// src/pages/contracts/rfq/RfqBuilderPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Dedicated, product-led RFQ builder — the buyer's request flow.
//
// WHY THIS EXISTS as its own page rather than the shared ContractWizard:
// a buyer's request is loose by nature — he gives a *flavour* of what he owns
// ("2 DG sets, ~500kVA"), not a registry-grade record — and the flow must be
// self-explaining, one question per screen. The contract wizard is a precision
// instrument for a seller describing a client's assets; bending it to be loose
// means disabling most of it and relabelling the rest. So this is purpose-built.
//
// IMPORTANT — it is NEW UX on the SAME API. Every screen writes plain data into
// the exact payload create_contract_transaction already accepts:
//   coverage_types + equipment_details (the "what it covers" flavour),
//   blocks (flyby services with cadence), vendors[], response_deadline,
//   nomenclature_id, start_date/duration. No backend change.
//
// This is also intended as the REFERENCE pattern: once proven, the single-column
// shell + step primitives here are what contracts/templates graduate onto. So it
// is kept clean and self-contained rather than abstracted prematurely.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Building2, Wrench, ArrowRight, ArrowLeft, Check, Plus, Minus, X,
  CalendarDays, Users, Loader2, FileText, Copy, PartyPopper, ClipboardList,
  CreditCard, Receipt, Calendar, CalendarClock, Sliders,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useResources } from '@/hooks/queries/useResources';
import { useNomenclatureTypes } from '@/hooks/queries/useNomenclatureTypes';
import { useContactList } from '@/hooks/useContacts';
import { useContractOperations } from '@/hooks/queries/useContractQueries';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
// Reuse the exact FlyBy card the contract wizard uses (ChecklistRow), in its
// 'rfq' mode — NOT the full ServiceBlocksStep, which also carries catalog
// browsing/VaNi recommender machinery the RFQ never needs (a buyer's request
// is loose custom lines only, never a pick from a tenant's own catalog).
import ChecklistRow from '@/components/contracts/ContractWizard/steps/serviceBlocksChecklist/ChecklistRow';
import { FLYBY_TYPE_CONFIG, type FlyByBlockType } from '@/components/catalog-studio/FlyByBlockCard';
import { getCategoryById } from '@/utils/catalog-studio/categories';
import type { ConfigurableBlock } from '@/components/catalog-studio';
import type { ContractEquipmentDetail } from '@/types/contracts';

// ── what the RFQ is against ──────────────────────────────────────────────────
type AssetKind = 'equipment' | 'facility' | 'service';

// A coverage line the buyer sketched: a type from the catalog, a count, and an
// optional free-text flavour. NOT a registry record — deliberately loose.
interface CoverageLine {
  resource_id: string;
  resource_name: string;
  sub_category: string;
  unit_count: number;
  flavour: string; // "2 DG sets, ~500kVA" — optional
}

interface VendorPick {
  vendor_id: string;
  vendor_name: string;
  vendor_company: string;
  vendor_email: string;
}

// Quote currency the buyer wants vendors to respond in. Persisted on the RFQ
// (create_contract_transaction already accepts `currency`); default INR.
const CURRENCIES = [
  { id: 'INR', label: '₹ INR' },
  { id: 'USD', label: '$ USD' },
  { id: 'EUR', label: '€ EUR' },
  { id: 'GBP', label: '£ GBP' },
  { id: 'AED', label: 'د.إ AED' },
  { id: 'SGD', label: 'S$ SGD' },
];

// Nomenclature group → icon (mirrors the contract wizard's grouped design).
const GROUP_ICON: Record<string, React.ComponentType<any>> = {
  equipment_maintenance: Wrench,
  facility_property: Building2,
  service_delivery: Users,
  flexible_hybrid: Package,
};
const groupIcon = (key: string): React.ComponentType<any> => GROUP_ICON[key] || FileText;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const RfqBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant: tenant } = useAuth();
  const { addToast } = useVaNiToast();
  const { createContract, updateStatus, isCreating } = useContractOperations();

  // ── data ───────────────────────────────────────────────────────────────────
  const { data: resources = [], isLoading: resLoading } = useResources();
  const { data: nomGroups = [], isLoading: nomLoading } = useNomenclatureTypes();
  const vendorFilters = useMemo(() => ({ classifications: ['vendor'], status: 'active' as const }), []);
  const { contacts: vendorContacts = [], loading: vendorsLoading } = useContactList(vendorFilters);

  const nomenclatureTypes = useMemo(
    () => nomGroups.flatMap((g: any) => g.items || []),
    [nomGroups]
  );

  // ── answers ──────────────────────────────────────────────────────────────
  const [assetKind, setAssetKind] = useState<AssetKind | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nomenclatureId, setNomenclatureId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [durationValue, setDurationValue] = useState(12);
  const [durationUnit, setDurationUnit] = useState('months');
  // B4 — quote currency (was silently hardcoded to INR in the payload).
  const [currency, setCurrency] = useState('INR');
  // B3 — last date to apply. Pre-fill a sensible default (7 days out) so it is
  // never left null (PRJ-1004 shipped with no deadline); the buyer can change it.
  const [responseDeadline, setResponseDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  // Row expand/collapse for the FlyBy cards (ChecklistRow manages its own
  // editor content, but expand state lives with the caller — same pattern
  // ServiceBlocksStep uses).
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageLine[]>([]);
  const [services, setServices] = useState<ConfigurableBlock[]>([]);
  const [vendors, setVendors] = useState<VendorPick[]>([]);

  // ── flow ─────────────────────────────────────────────────────────────────
  // Steps are dynamic: a pure service has no "what it covers" step.
  const steps = useMemo(() => {
    const base: { id: string; label: string }[] = [
      { id: 'kind', label: 'What for' },
      { id: 'type', label: 'Type' },        // B6 — nomenclature promoted to its own captured step
      { id: 'basics', label: 'Request' },
      { id: 'timing', label: 'Timing' },
    ];
    if (assetKind && assetKind !== 'service') base.push({ id: 'covers', label: 'What it covers' });
    base.push({ id: 'services', label: 'Scope' });
    base.push({ id: 'vendors', label: 'Vendors' });
    base.push({ id: 'review', label: 'Review' });
    return base;
  }, [assetKind]);

  const [stepIdx, setStepIdx] = useState(0);
  const stepId = steps[Math.min(stepIdx, steps.length - 1)]?.id || 'kind';

  const [sent, setSent] = useState<null | { rfq_number?: string; cnak?: string | null }>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const resourcesForKind = useMemo(() => {
    const wanted = assetKind === 'facility' ? 'asset' : 'equipment';
    return resources
      .filter((r: any) => (r.resource_type_id || '').toLowerCase() === wanted && r.is_active !== false)
      .map((r: any) => ({
        id: r.id,
        name: r.display_name || r.name,
        sub_category: r.sub_category || 'Other',
      }));
  }, [resources, assetKind]);

  const selectedNom = useMemo(
    () => nomenclatureTypes.find((n: any) => n.id === nomenclatureId),
    [nomenclatureTypes, nomenclatureId]
  );

  // Nomenclature groups filtered to what the buyer picked in step 1 — equipment
  // maps to equipment-based types, facility to entity-based, service to
  // service-based (form_settings flags). Falls back to all if nothing matches.
  const nomGroupsForKind = useMemo(() => {
    const match = (fs: any): boolean => {
      if (!assetKind) return true;
      if (assetKind === 'equipment') return !!fs?.is_equipment_based;
      if (assetKind === 'facility') return !!fs?.is_entity_based;
      if (assetKind === 'service') return !!fs?.is_service_based;
      return true;
    };
    const filtered = (nomGroups as any[])
      .map((g) => ({ ...g, items: (g.items || []).filter((it: any) => match(it.form_settings)) }))
      .filter((g) => g.items.length > 0);
    return filtered.length ? filtered : (nomGroups as any[]);
  }, [nomGroups, assetKind]);

  const nomTypesForKind = useMemo(
    () => (nomGroupsForKind as any[]).flatMap((g: any) => g.items || []),
    [nomGroupsForKind]
  );

  // ── per-step validity ──────────────────────────────────────────────────────
  const canAdvance = useMemo(() => {
    switch (stepId) {
      case 'kind': return assetKind !== null;
      // Require a pick when types exist; never trap if the workspace has none.
      case 'type': return nomTypesForKind.length === 0 ? true : nomenclatureId !== null;
      case 'basics': return name.trim() !== '';
      case 'timing': return durationValue > 0;
      case 'covers': return true; // optional — a flavour, may be empty
      case 'services': return services.length > 0 && services.every((b) => (b.name || '').trim() !== '');
      case 'vendors': return vendors.length > 0;
      case 'review': return true;
      default: return false;
    }
  }, [stepId, assetKind, nomenclatureId, nomTypesForKind, name, durationValue, services, vendors]);

  const blockedHint = useMemo(() => {
    switch (stepId) {
      case 'kind': return 'Pick what this request is for';
      case 'type': return 'Choose the kind of contract';
      case 'basics': return 'Give your request a name';
      case 'services': return services.length === 0 ? 'Add at least one item to quote' : 'Name every item';
      case 'vendors': return 'Choose at least one vendor';
      default: return 'Complete this step to continue';
    }
  }, [stepId, services.length]);

  // ── coverage helpers ─────────────────────────────────────────────────────
  const toggleCoverage = (r: { id: string; name: string; sub_category: string }) => {
    setCoverage((prev) =>
      prev.some((c) => c.resource_id === r.id)
        ? prev.filter((c) => c.resource_id !== r.id)
        : [...prev, { resource_id: r.id, resource_name: r.name, sub_category: r.sub_category, unit_count: 1, flavour: '' }]
    );
  };
  const setCoverageCount = (id: string, n: number) =>
    setCoverage((prev) => prev.map((c) => (c.resource_id === id ? { ...c, unit_count: Math.max(1, n) } : c)));
  const setCoverageFlavour = (id: string, v: string) =>
    setCoverage((prev) => prev.map((c) => (c.resource_id === id ? { ...c, flavour: v } : c)));

  // ── flyby helpers — mirrors ServiceBlocksStep.handleAddFlyByBlock exactly ──
  const addFlyby = (type: FlyByBlockType) => {
    const typeConfig = FLYBY_TYPE_CONFIG[type];
    const category = getCategoryById(type);
    const id = `flyby-${type}-${Date.now()}`;
    const newBlock: ConfigurableBlock = {
      id,
      name: '',
      description: '',
      icon: category?.icon || 'Package',
      quantity: 1,
      cycle: 'prepaid',
      unlimited: false,
      price: 0,
      currency,
      totalPrice: 0,
      categoryName: typeConfig?.label || type,
      categoryColor: typeConfig?.color || '#6B7280',
      categoryBgColor: typeConfig?.bgColor,
      categoryId: type,
      isFlyBy: true,
      flyByType: type,
      config: {
        showDescription: false,
        ...(type === 'session' ? { audience: 'group' as const } : {}),
      },
    };
    setServices((prev) => [...prev, newBlock]);
    setExpandedBlockId(id);
  };
  const updateFlyby = (id: string, updates: Partial<ConfigurableBlock>) =>
    setServices((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  const removeFlyby = (id: string) => {
    setServices((prev) => prev.filter((b) => b.id !== id));
    if (expandedBlockId === id) setExpandedBlockId(null);
  };
  // "Applies to" — links a block to a coverage line (e.g. "DG Set ×2") so its
  // Visits/Cycle can be disambiguated against that line's unit_count. Unset
  // (undefined) means a general line, not tied to a specific covered item.
  const setFlybyCoverage = (id: string, resourceId: string) => {
    const c = coverage.find((c) => c.resource_id === resourceId);
    setServices((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, coverageTypeId: c?.resource_id, coverageTypeName: c?.resource_name } : b
      )
    );
  };
  // Split a recurring block into N independent per-unit schedules — same
  // compliance-critical disambiguation as the Contract wizard (see
  // ServiceBlocksStep.handleSplitByUnits / CLAUDE.md, 2026-07-31).
  const splitFlybyByUnits = (id: string) => {
    const block = services.find((b) => b.id === id);
    if (!block) return;
    const unitCount = coverage.find((c) => c.resource_id === block.coverageTypeId)?.unit_count;
    if (!unitCount || unitCount <= 1) return;
    const clones: ConfigurableBlock[] = Array.from({ length: unitCount }, (_, i) => ({
      ...block,
      id: `${block.id}-unit${i + 1}-${Date.now()}`,
      name: block.name ? `${block.name} — Unit ${i + 1} of ${unitCount}` : `Unit ${i + 1} of ${unitCount}`,
      config: { ...block.config, splitUnitIndex: i + 1, splitUnitTotal: unitCount },
    }));
    setServices((prev) => [...prev.filter((b) => b.id !== id), ...clones]);
    setExpandedBlockId(null);
    addToast({
      type: 'success',
      title: 'Split into independent schedules',
      message: `${block.name || 'Block'} split into ${unitCount} per-unit schedules — edit each one's cycle independently.`,
    });
  };

  // ── vendor helpers ───────────────────────────────────────────────────────
  const emailOf = (c: any): string => {
    const ch = (c.contact_channels || []).find(
      (x: any) => (x.channel_type || '').toLowerCase() === 'email' && x.value
    );
    return ch?.value || '';
  };
  const toggleVendor = (c: any) => {
    setVendors((prev) =>
      prev.some((v) => v.vendor_id === c.id)
        ? prev.filter((v) => v.vendor_id !== c.id)
        : [...prev, {
            vendor_id: c.id,
            vendor_name: c.name || c.displayName || 'Vendor',
            vendor_company: c.company_name || '',
            vendor_email: emailOf(c),
          }]
    );
  };

  // ── submit ───────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (isCreating) return;

    // Equipment details = one loose entry per coverage line (flavour, not a
    // registry record). Placeholder-flagged so downstream treats it as
    // to-be-detailed, exactly like the wizard's "add later".
    const equipment_details: ContractEquipmentDetail[] = coverage.map((c) => ({
      id: `cov-${c.resource_id}`,
      asset_registry_id: null,
      added_by_tenant_id: tenant?.id || '',
      added_by_role: 'buyer',
      resource_type: assetKind === 'facility' ? 'entity' : 'equipment',
      category_id: c.resource_id,
      category_name: c.resource_name,
      item_name: c.flavour.trim() ? `${c.resource_name} — ${c.flavour.trim()}` : c.resource_name,
      quantity: c.unit_count,
      specifications: { placeholder: true, flavour: c.flavour.trim() || null, coverage_resource_id: c.resource_id },
      notes: c.flavour.trim() || null,
    }));

    const coverage_types = coverage.map((c) => ({
      id: `ct-${c.resource_id}`,
      sub_category: c.sub_category,
      resource_id: c.resource_id,
      resource_name: c.resource_name,
      unit_count: c.unit_count,
    }));

    // FlyBy blocks straight from the real ServiceBlocksStep (ConfigurableBlock),
    // structure only, no pricing (the vendor quotes the price).
    const blocks = services.map((b, i) => ({
      position: i,
      source_type: 'flyby',
      flyby_type: b.flyByType || 'service',
      block_name: (b.name || '').trim(),
      block_description: b.description || undefined,
      category_name: b.categoryName || b.flyByType || 'Custom',
      unit_price: 0,
      quantity: b.quantity ?? 1,
      billing_cycle: b.cycle,
      total_price: 0,
      custom_fields: {
        config: {
          ...(b.config || {}),
          flyby_type: b.flyByType,
          serviceCycleDays: b.serviceCycleDays,
          unlimited: b.unlimited,
          // "Applies to" linkage — which coverage line's unit_count this
          // block's Visits/Cycle should be read against (or split from).
          coverageTypeId: b.coverageTypeId,
          coverageTypeName: b.coverageTypeName,
        },
      },
    }));

    const payload: any = {
      record_type: 'rfq',
      contract_type: 'vendor',
      contact_classification: 'vendor',
      name: name.trim(),
      title: name.trim(),
      description: description.trim() || undefined,
      nomenclature_id: nomenclatureId || undefined,
      start_date: new Date(`${startDate}T00:00:00`).toISOString(),
      duration_value: durationValue,
      duration_unit: durationUnit,
      response_deadline: responseDeadline || undefined,
      currency,
      coverage_types: coverage_types.length ? coverage_types : undefined,
      equipment_details: equipment_details.length ? equipment_details : undefined,
      blocks,
      vendors,
    };

    try {
      const created: any = await createContract(payload);
      let cnak: string | null = created?.global_access_id ?? null;
      try {
        const res: any = await updateStatus({ contractId: created.id, statusData: { status: 'sent' } as any });
        cnak = res?.global_access_id ?? res?.data?.global_access_id ?? cnak;
      } catch {
        // The RFQ was created; if the send transition fails we still landed a
        // draft. Surface it but don't lose the record.
        addToast({ type: 'warning', title: 'Saved as draft', message: 'Request saved, but sending failed. Open it from Requests to send.' });
      }
      if (saveAsTemplate) {
        addToast({ type: 'info', title: 'Templates coming soon', message: 'Request sent. Saving requests as templates is coming next.' });
      }
      setSent({ rfq_number: created?.rfq_number, cnak });
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Could not send request',
        message: e?.response?.data?.error?.message || e?.message || 'Something went wrong. Please try again.',
      });
    }
  }, [isCreating, coverage, services, vendors, name, description, nomenclatureId, startDate, durationValue, durationUnit, responseDeadline, currency, assetKind, tenant?.id, saveAsTemplate, createContract, updateStatus, addToast]);

  // ── styles ─────────────────────────────────────────────────────────────────
  const bg = colors.utility.primaryBackground || colors.utility.secondaryBackground;
  const surface = colors.utility.secondaryBackground;
  const ink = colors.utility.primaryText;
  const sub = colors.utility.secondaryText;
  const brand = colors.brand.primary;
  const line = ink + '15';

  const card: React.CSSProperties = {
    background: surface, border: `1px solid ${line}`, borderRadius: 14, padding: 16,
  };
  const fieldStyle: React.CSSProperties = {
    width: '100%', border: `1px solid ${ink}22`, borderRadius: 10, padding: '11px 12px',
    fontSize: 15, color: ink, background: 'transparent', outline: 'none',
  };

  // ── success ──────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ ...card, maxWidth: 460, width: '100%', textAlign: 'center', padding: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${colors.semantic.success}20`, color: colors.semantic.success, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <PartyPopper className="w-7 h-7" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: '0 0 6px' }}>Request sent</h2>
          <p style={{ fontSize: 14, color: sub, margin: '0 0 4px' }}>
            {sent.rfq_number ? <>Your request <strong style={{ color: ink }}>{sent.rfq_number}</strong> is on its way to </> : 'Sent to '}
            <strong style={{ color: ink }}>{vendors.length} vendor{vendors.length === 1 ? '' : 's'}</strong>.
          </p>
          <p style={{ fontSize: 13, color: sub, margin: '0 0 20px' }}>
            Each vendor got their own private link. You&apos;ll see quotes arrive under Requests.
          </p>
          {sent.cnak && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${brand}0D`, color: brand, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'monospace', marginBottom: 20 }}>
              <FileText className="w-3.5 h-3.5" /> {sent.cnak}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/contracts?record=rfq')} style={{ padding: '11px 20px', borderRadius: 11, background: brand, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              See my requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── shell ──────────────────────────────────────────────────────────────────
  const goNext = () => (stepId === 'review' ? submit() : setStepIdx((i) => Math.min(i + 1, steps.length - 1)));
  const goBack = () => (stepIdx === 0 ? navigate(-1) : setStepIdx((i) => Math.max(0, i - 1)));

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '0 0 120px' }}>
      {/* progress rail */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: bg, borderBottom: `1px solid ${line}`, padding: '14px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', color: brand, fontWeight: 700 }}>
              New request
            </span>
            <span style={{ fontSize: 12, color: sub }}>
              Step {Math.min(stepIdx + 1, steps.length)} of {steps.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {steps.map((s, i) => (
              <div key={s.id} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= stepIdx ? brand : line }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 0' }}>

        {/* ── STEP: kind ── */}
        {stepId === 'kind' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>What do you need quotes for?</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>This shapes the rest — you can keep it loose.</p>
            {([
              { k: 'equipment' as const, icon: Package, t: 'Equipment', d: 'Lifts, DG sets, HVAC, chillers — things you own and maintain' },
              { k: 'facility' as const, icon: Building2, t: 'Facility or area', d: 'Floors, sites, warehouses you are responsible for' },
              { k: 'service' as const, icon: Wrench, t: 'A service, on its own', d: 'Security, housekeeping, pest control — not tied to a machine' },
            ]).map(({ k, icon: Icon, t, d }) => {
              const on = assetKind === k;
              return (
                <button key={k} onClick={() => { setAssetKind(k); if (k === 'service') setCoverage([]); }}
                  style={{ ...card, width: '100%', textAlign: 'left', display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 10, cursor: 'pointer',
                    borderColor: on ? brand : line, background: on ? `${brand}0D` : surface }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? brand : ink + '0D', color: on ? '#fff' : ink }}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontWeight: 650, fontSize: 15, color: ink }}>{t}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: sub, marginTop: 2 }}>{d}</span>
                  </span>
                </button>
              );
            })}
          </>
        )}

        {/* ── STEP: type (nomenclature) ── */}
        {stepId === 'type' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>What kind of contract is this?</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>This sets the nomenclature vendors and your records use. Pick the closest — you can refine later.</p>
            {nomLoading ? (
              <div style={{ color: sub, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 className="w-4 h-4 animate-spin" /> Loading contract types…</div>
            ) : nomTypesForKind.length === 0 ? (
              <div style={{ ...card, color: sub, fontSize: 13 }}>No contract types available for this workspace — continue and you can set it later.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {(nomGroupsForKind as any[]).map((g: any) => {
                  const GIcon = groupIcon(g.group);
                  return (
                    <div key={g.group}>
                      {/* group header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: `${brand}12`, color: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <GIcon className="w-4 h-4" />
                        </span>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: ink }}>{g.label}</div>
                          <div style={{ fontSize: 10.5, color: sub }}>{g.items.length} type{g.items.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      {/* cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
                        {g.items.map((n: any) => {
                          const on = nomenclatureId === n.id;
                          const fs = n.form_settings || {};
                          const accent = n.hexcolor || brand;
                          const CIcon = groupIcon(g.group);
                          return (
                            <button key={n.id} onClick={() => {
                              setNomenclatureId(on ? null : n.id);
                              const dur = fs.typical_duration;
                              if (!on && dur && /^\d+/.test(dur)) setDurationValue(parseInt(dur, 10));
                            }}
                              title={fs.full_name || n.description}
                              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer',
                                border: `2px solid ${on ? accent : ink + '12'}`, background: on ? `${accent}0C` : surface }}>
                              <span style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? accent : ink + '25'}`, background: on ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {on && <Check className="w-3 h-3" style={{ color: '#fff' }} />}
                              </span>
                              <span style={{ width: 34, height: 34, borderRadius: 8, background: on ? `${accent}18` : ink + '08', color: on ? accent : sub, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <CIcon className="w-4 h-4" />
                              </span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: on ? accent : ink, marginBottom: 2 }}>{fs.short_name || n.sub_cat_name || n.display_name}</span>
                              <span style={{ fontSize: 11, color: sub, lineHeight: 1.3 }}>{fs.full_name || n.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedNom?.description && (
              <p style={{ fontSize: 12.5, color: sub, margin: '18px 2px 0' }}>{selectedNom.description}</p>
            )}
          </>
        )}

        {/* ── STEP: basics ── */}
        {stepId === 'basics' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>Name your request</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>A heading vendors will recognise, and the kind of contract.</p>
            <div style={{ ...card, marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sub, display: 'block', marginBottom: 6 }}>Request heading</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lift AMC — Towers A & B" style={fieldStyle} autoFocus />
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sub, display: 'block', margin: '14px 0 6px' }}>Notes for vendors (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Anything they should know up front" style={{ ...fieldStyle, resize: 'vertical' }} />
            </div>
          </>
        )}

        {/* ── STEP: timing ── */}
        {stepId === 'timing' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>When, and for how long?</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>And the last date vendors can respond.</p>
            <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sub, display: 'block', marginBottom: 6 }}>Starts</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sub, display: 'block', marginBottom: 6 }}>Term</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" min={1} value={durationValue} onChange={(e) => setDurationValue(parseInt(e.target.value, 10) || 0)} style={{ ...fieldStyle, width: 70 }} />
                  <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
                    <option value="months">months</option>
                    <option value="years">years</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            </div>
            {/* B4 — quote currency */}
            <div style={{ ...card, marginTop: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sub, display: 'block', marginBottom: 10 }}>Quote currency</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CURRENCIES.map((cu) => {
                  const on = currency === cu.id;
                  return (
                    <button key={cu.id} onClick={() => setCurrency(cu.id)}
                      style={{ fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                        border: `1.5px solid ${on ? brand : ink + '22'}`, background: on ? `${brand}18` : 'transparent', color: on ? brand : sub }}>
                      {cu.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 12, color: sub, margin: '8px 0 0' }}>Vendors quote and you compare in this currency.</p>
            </div>
            {/* B3 — last date to apply, prominent + pre-filled */}
            <div style={{ ...card, marginTop: 12, borderColor: `${colors.semantic.warning}55`, background: `${colors.semantic.warning}0D` }}>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.semantic.warning, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <CalendarDays className="w-4 h-4" /> Last date for vendors to respond
              </label>
              <input type="date" min={todayISO()} value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} style={{ ...fieldStyle, fontSize: 16, fontWeight: 600 }} />
              <p style={{ fontSize: 12, color: sub, margin: '8px 0 0' }}>Vendors see this as their deadline; quotes aren&apos;t accepted after it. Pre-filled a week out — change it to suit.</p>
            </div>
          </>
        )}

        {/* ── STEP: covers ── */}
        {stepId === 'covers' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>What does this cover?</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>
              Pick the {assetKind === 'facility' ? 'facilities' : 'equipment'} and roughly how many. A flavour is fine — “2 DG sets, ~500kVA”. You can skip and just describe the services next.
            </p>
            {resLoading ? (
              <div style={{ color: sub, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 className="w-4 h-4 animate-spin" /> Loading types…</div>
            ) : resourcesForKind.length === 0 ? (
              <div style={{ ...card, color: sub, fontSize: 13 }}>No {assetKind} types in the catalog yet. Continue and describe the services.</div>
            ) : (
              resourcesForKind.map((r) => {
                const picked = coverage.find((c) => c.resource_id === r.id);
                const on = !!picked;
                return (
                  <div key={r.id} style={{ ...card, marginBottom: 10, borderColor: on ? brand : line, background: on ? `${brand}0D` : surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => toggleCoverage(r)} style={{ width: 24, height: 24, borderRadius: 7, flex: 'none', border: `1.5px solid ${on ? brand : ink + '30'}`, background: on ? brand : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {on && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => toggleCoverage(r)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600, color: ink }}>{r.name}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: sub }}>{r.sub_category}</span>
                      </button>
                      {on && (
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${ink}22`, borderRadius: 8, overflow: 'hidden', flex: 'none' }}>
                          <button onClick={() => setCoverageCount(r.id, picked!.unit_count - 1)} style={{ width: 30, height: 32, background: ink + '0D', color: ink, border: 'none', cursor: 'pointer' }}><Minus className="w-3.5 h-3.5" style={{ margin: '0 auto' }} /></button>
                          <span style={{ width: 34, textAlign: 'center', fontSize: 14, fontWeight: 600, color: ink }}>{picked!.unit_count}</span>
                          <button onClick={() => setCoverageCount(r.id, picked!.unit_count + 1)} style={{ width: 30, height: 32, background: ink + '0D', color: ink, border: 'none', cursor: 'pointer' }}><Plus className="w-3.5 h-3.5" style={{ margin: '0 auto' }} /></button>
                        </div>
                      )}
                    </div>
                    {on && (
                      <input value={picked!.flavour} onChange={(e) => setCoverageFlavour(r.id, e.target.value)}
                        placeholder="Optional flavour — make, capacity, location…"
                        style={{ ...fieldStyle, marginTop: 10, fontSize: 13 }} />
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── STEP: scope — the REAL FlyBy card (ChecklistRow), mode="rfq" ── */}
        {stepId === 'services' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>What should vendors quote for?</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 16px' }}>Add the services, spares, notes or documents you need quoted — the vendor fills the price when they quote.</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {(['service', 'spare', 'text', 'document', 'session'] as FlyByBlockType[]).map((t) => {
                const cfg = FLYBY_TYPE_CONFIG[t];
                const Icon = cfg.icon;
                return (
                  <button key={t} onClick={() => addFlyby(t)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      border: `1.5px dashed ${cfg.color}88`, background: `${cfg.color}0D`, color: cfg.color }}>
                    <Icon className="w-4 h-4" /> Add {cfg.label}
                  </button>
                );
              })}
            </div>

            {services.length === 0 && (
              <div style={{ ...card, color: sub, fontSize: 13, textAlign: 'center' }}>Nothing added yet — pick a block type above to start.</div>
            )}

            {services.map((b) => (
              <React.Fragment key={b.id}>
                {coverage.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sub }}>Applies to</label>
                    <select
                      value={b.coverageTypeId || ''}
                      onChange={(e) => setFlybyCoverage(b.id, e.target.value)}
                      style={{ fontSize: 12.5, border: `1px solid ${ink}22`, borderRadius: 8, padding: '5px 8px', color: ink, background: 'transparent' }}
                    >
                      <option value="">General — not tied to a specific item</option>
                      {coverage.map((c) => (
                        <option key={c.resource_id} value={c.resource_id}>{c.resource_name} ×{c.unit_count}</option>
                      ))}
                    </select>
                  </div>
                )}
                <ChecklistRow
                  colors={colors}
                  isDarkMode={isDarkMode}
                  currency={currency}
                  instance={b}
                  checked
                  priced={b.flyByType === 'service' || b.flyByType === 'spare'}
                  flyBy
                  mode="rfq"
                  typeChip={{ label: b.categoryName || b.flyByType || 'Custom', color: b.categoryColor || '#6B7280' }}
                  coverageUnitCount={coverage.find((c) => c.resource_id === b.coverageTypeId)?.unit_count}
                  onSplitByUnits={() => splitFlybyByUnits(b.id)}
                  expanded={expandedBlockId === b.id}
                  durationMonths={Math.max(1, durationUnit === 'years' ? durationValue * 12 : durationUnit === 'days' ? Math.round(durationValue / 30) : durationValue)}
                  onToggle={() => setExpandedBlockId((cur) => (cur === b.id ? null : b.id))}
                  onToggleExpand={() => setExpandedBlockId((cur) => (cur === b.id ? null : b.id))}
                  onUpdate={(updates) => updateFlyby(b.id, updates)}
                  onRemove={() => removeFlyby(b.id)}
                />
              </React.Fragment>
            ))}
          </>
        )}

        {/* ── STEP: vendors ── */}
        {stepId === 'vendors' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>Who should quote?</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>Each vendor gets their own private link — they can&apos;t see each other&apos;s quotes.</p>
            {vendorsLoading ? (
              <div style={{ color: sub, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 className="w-4 h-4 animate-spin" /> Loading your vendors…</div>
            ) : vendorContacts.length === 0 ? (
              <div style={{ ...card, color: sub, fontSize: 13 }}>No vendor contacts yet. Add vendors in Contacts, then come back.</div>
            ) : (
              vendorContacts.map((c: any) => {
                const on = vendors.some((v) => v.vendor_id === c.id);
                return (
                  <button key={c.id} onClick={() => toggleVendor(c)} style={{ ...card, width: '100%', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, cursor: 'pointer', borderColor: on ? brand : line, background: on ? `${brand}0D` : surface }}>
                    <span style={{ width: 34, height: 34, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${brand}18`, color: brand, fontWeight: 700, fontSize: 12 }}>
                      {(c.company_name || c.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: ink }}>{c.company_name || c.name || c.displayName}</span>
                      <span style={{ display: 'block', fontSize: 12, color: sub }}>{emailOf(c) || 'no email on file'}</span>
                    </span>
                    <span style={{ width: 22, height: 22, borderRadius: 6, flex: 'none', border: `1.5px solid ${on ? brand : ink + '30'}`, background: on ? brand : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </>
        )}

        {/* ── STEP: review ── */}
        {stepId === 'review' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 4px' }}>{name || 'Your request'}</h1>
            <p style={{ fontSize: 14, color: sub, margin: '0 0 20px' }}>
              {selectedNom?.sub_cat_name ? `${selectedNom.sub_cat_name} · ` : ''}{durationValue} {durationUnit} · {currency}
              {responseDeadline ? ` · respond by ${responseDeadline}` : ''}
            </p>
            <div style={{ ...card, marginBottom: 12 }}>
              {coverage.map((c) => (
                <div key={c.resource_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${line}`, fontSize: 13.5 }}>
                  <span style={{ color: ink }}>{c.resource_name}{c.flavour ? <span style={{ color: sub }}> — {c.flavour}</span> : null}</span>
                  <span style={{ color: sub, fontFamily: 'monospace' }}>×{c.unit_count}</span>
                </div>
              ))}
              {services.map((b) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${line}`, fontSize: 13.5 }}>
                  <span style={{ color: ink }}>
                    <span style={{ color: (b.categoryColor || brand), fontWeight: 700, fontSize: 11, marginRight: 6, textTransform: 'uppercase' }}>{b.categoryName || b.flyByType || 'Custom'}</span>
                    {b.name || 'Unnamed block'}
                  </span>
                  <span style={{ color: sub, fontFamily: 'monospace' }}>
                    {b.unlimited ? '∞' : b.quantity ? `×${b.quantity}` : ''}{b.cycle ? ` · ${b.cycle}` : ''}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 13.5 }}>
                <span style={{ color: ink }}>Vendors</span>
                <span style={{ color: sub }}>{vendors.map((v) => v.vendor_company || v.vendor_name).join(', ')}</span>
              </div>
            </div>
            {/* save-as-template — visible intent, not yet wired */}
            <label style={{ ...card, display: 'flex', gap: 11, alignItems: 'center', opacity: 0.7, cursor: 'not-allowed' }}>
              <ClipboardList className="w-5 h-5" style={{ color: sub, flex: 'none' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 650, fontSize: 13.5, color: ink }}>Save this as a template</span>
                <span style={{ display: 'block', fontSize: 12, color: sub }}>Reuse this request in two taps next time — coming soon.</span>
              </span>
              <input type="checkbox" disabled checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
            </label>
          </>
        )}
      </div>

      {/* ── sticky action bar ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: bg, borderTop: `1px solid ${line}`, padding: '14px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={goBack} disabled={isCreating} style={{ padding: '11px 16px', borderRadius: 11, background: 'transparent', border: `1px solid ${ink}22`, color: sub, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft className="w-4 h-4" /> {stepIdx === 0 ? 'Cancel' : 'Back'}
          </button>
          <div style={{ flex: 1 }} />
          {!canAdvance && stepId !== 'review' && (
            <span style={{ fontSize: 12, color: sub }}>{blockedHint}</span>
          )}
          <button onClick={goNext} disabled={!canAdvance || isCreating}
            style={{ padding: '11px 22px', borderRadius: 11, background: brand, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: !canAdvance || isCreating ? 'not-allowed' : 'pointer', opacity: !canAdvance || isCreating ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : stepId === 'review' ? <>Send to {vendors.length || ''} vendor{vendors.length === 1 ? '' : 's'} <ArrowRight className="w-4 h-4" /></> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RfqBuilderPage;

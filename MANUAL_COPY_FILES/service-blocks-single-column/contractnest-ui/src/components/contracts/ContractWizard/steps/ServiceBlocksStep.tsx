// src/components/contracts/ContractWizard/steps/ServiceBlocksStep.tsx
// Step: Add Service Blocks — single-column checklist (design reference:
// SPRINT_REFERENCES/9-service-blocks-single-column.html, Batch C).
// The catalog renders as a tick-what-you-deliver checklist grouped by
// block type; VaNi suggestions are an inline banner; a sticky bar keeps
// the running total. ALL selection/pricing/tax/cadence logic is the
// same code that powered the previous 3-column layout — only the render
// changed. Blocks still attach per coverage type (the bold names in the
// "Blocks attach to:" line are the scope switcher).

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { Block } from '@/types/catalogStudio';
import { getCategoryById } from '@/utils/catalog-studio';
import { getCurrencySymbol } from '@/utils/constants/currencies';

import { ConfigurableBlock } from '@/components/catalog-studio';
import type { FlyByCategoryId } from '@/components/catalog-studio/BlockLibraryMini';
import { FLYBY_TYPE_CONFIG } from '@/components/catalog-studio/FlyByBlockCard';
import { getCategoryById as getCatById, categoryHasPricing } from '@/utils/catalog-studio/categories';
import {
  cadenceTermMath,
  fittingCadences,
  getCadenceCycle,
  proposedCadence,
  type BlockCadencePricing,
} from '@/utils/catalog-studio/cadencePricing';

// Catalog source — same fetch the block library and VaNi recommender use
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import { catBlocksToBlocks } from '@/utils/catalog-studio/catBlockAdapter';

// Checklist UI (mock 9)
import ChecklistRow from './serviceBlocksChecklist/ChecklistRow';
import VaNiInlineBanner from './serviceBlocksChecklist/VaNiInlineBanner';
import StickyTotalBar from './serviceBlocksChecklist/StickyTotalBar';
import { recommendBlocks } from './serviceBlocksChecklist/recommend';

// Coverage type from AssetSelectionStep
import type { CoverageTypeItem } from './AssetSelectionStep';

// Contact types
interface Contact {
  id: string;
  contact_type: 'individual' | 'corporate';
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  profile_image_url?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  designation?: string;
  is_primary: boolean;
  contact_channels?: Array<{
    channel_type: string;
    channel_value: string;
    is_primary?: boolean;
  }>;
}

export interface ServiceBlocksStepProps {
  // Blocks state
  selectedBlocks: ConfigurableBlock[];
  currency: string;
  onBlocksChange: (blocks: ConfigurableBlock[]) => void;
  // From previous steps
  contractName: string;
  contractStatus?: string;
  contractDuration?: number; // months
  contractStartDate?: Date | null;
  selectedBuyer?: Contact | null;
  selectedPerson?: ContactPerson | null;
  useCompanyContact?: boolean;
  // RFQ mode - FlyBy only, no library, no pricing
  rfqMode?: boolean;
  // Coverage types from AssetSelectionStep
  coverageTypes?: CoverageTypeItem[];
  // Sprint 1: unified-cycle mismatch warns inline at selection time
  billingCycleType?: string | null;
  // Wizard's own validated next-step handler (sticky bar Continue)
  onContinue?: () => void;
}

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
};

// Build a ConfigurableBlock from a library Block (pure — no state).
// Extracted so both single-add and bulk-add (VaNi) share the exact
// same pricing/tax/cycle/instance-id logic. UNCHANGED from the previous
// 3-column implementation.
const buildConfigurableBlock = (
  block: Block,
  ctx: { currency: string; activeCoverageType: CoverageTypeItem | null; activeCoverageTabId: string | null; hasCoverageTypes: boolean; durationDays?: number }
): ConfigurableBlock => {
  const { currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, durationDays } = ctx;
  const category = getCategoryById(block.categoryId);

  const blockServiceCycles = (block.meta as any)?.serviceCycles || (block.config as any)?.serviceCycles;
  const blockAudience = (block.meta as any)?.audience || (block.config as any)?.audience;
  const isGroupSession = blockAudience === 'group' || block.categoryId === 'session';
  const hasCustomCycle = Boolean(
    (blockServiceCycles?.enabled && blockServiceCycles?.days) ||
    (isGroupSession && blockServiceCycles?.days)
  );
  const defaultCycle = hasCustomCycle ? 'custom' : 'prepaid';
  const customCycleDays = hasCustomCycle ? blockServiceCycles.days : undefined;
  const serviceCycleDays = hasCustomCycle ? blockServiceCycles.days : undefined;

  const pricingRecords = ((block.meta as any)?.pricingRecords || (block.config as any)?.pricingRecords || []) as Array<{
    currency: string; amount: number; tax_inclusion: 'inclusive' | 'exclusive';
    taxes: Array<{ name: string; rate: number }>; is_active: boolean;
    pricing_scheme?: 'single' | 'cadence'; base_term_months?: number;
    cadence_rates?: Array<{ cycle: string; amount: number; enabled: boolean }>;
    default_cadence?: string;
  }>;
  const matchingRecord = pricingRecords.find(r => r.currency === currency && r.is_active !== false)
    || pricingRecords.find(r => r.is_active !== false)
    || pricingRecords[0];
  const taxes = matchingRecord?.taxes || [];
  const totalTaxRate = taxes.reduce((sum, t) => sum + t.rate, 0);
  const taxInclusion = matchingRecord?.tax_inclusion || 'exclusive';
  const blockPrice = matchingRecord?.amount ?? block.price ?? 0;
  const unitPriceWithTax = taxInclusion === 'inclusive' ? blockPrice : blockPrice + (blockPrice * totalTaxRate / 100);
  const instanceId = hasCoverageTypes ? `${block.id}__${activeCoverageTabId}` : block.id;

  const durationMonths = durationDays ? Math.max(1, Math.round(durationDays / 30)) : 12;
  let cadence: { cp: BlockCadencePricing; proposed: ReturnType<typeof proposedCadence> } | null = null;
  if (!isGroupSession && matchingRecord?.pricing_scheme === 'cadence' && (matchingRecord.cadence_rates || []).length > 0) {
    const cp: BlockCadencePricing = {
      baseAmount: matchingRecord.amount,
      baseMonths: matchingRecord.base_term_months || 12,
      rates: (matchingRecord.cadence_rates || []) as BlockCadencePricing['rates'],
      defaultCadence: matchingRecord.default_cadence as BlockCadencePricing['defaultCadence'],
    };
    const proposed = proposedCadence(cp, durationMonths);
    if (proposed) cadence = { cp, proposed };
  }
  const cadenceRate = cadence ? cadence.cp.rates.find(r => r.cycle === cadence!.proposed!.id)!.amount : 0;
  const cadenceMath = cadence
    ? cadenceTermMath(cadenceRate, durationMonths, cadence.proposed!.monthsPerPeriod)
    : null;
  const cadenceTotalWithTax = cadenceMath
    ? (taxInclusion === 'inclusive'
        ? cadenceMath.termTotal
        : cadenceMath.termTotal * (1 + totalTaxRate / 100))
    : 0;

  const defaultQuantity =
    isGroupSession && serviceCycleDays && serviceCycleDays > 0 && durationDays
      ? Math.max(1, Math.floor(durationDays / serviceCycleDays))
      : 1;

  return {
    id: instanceId,
    name: block.name,
    description: block.description || '',
    icon: block.icon || 'Package',
    quantity: defaultQuantity,
    cycle: cadence ? cadence.proposed!.id : defaultCycle,
    customCycleDays,
    serviceCycleDays,
    unlimited: false,
    price: cadence ? cadenceRate : blockPrice,
    listPrice: cadence ? cadenceRate : blockPrice,
    currency: matchingRecord?.currency || currency,
    totalPrice: cadence
      ? Math.round(cadenceTotalWithTax * 100) / 100
      : Math.round(unitPriceWithTax * 100) / 100,
    categoryName: category?.name || block.categoryId,
    categoryColor: category?.color || '#6B7280',
    categoryBgColor: category?.bgColor,
    categoryId: block.categoryId,
    isFlyBy: false,
    coverageTypeId: activeCoverageType?.id,
    coverageTypeName: activeCoverageType?.resource_name,
    taxRate: totalTaxRate,
    taxInclusion,
    taxes: taxes.map(t => ({ name: t.name, rate: t.rate })),
    config: {
      showDescription: false,
      billingOnly: (block.meta as any)?.billingOnly === true || (block.config as any)?.billingOnly === true,
      audience: (block.meta as any)?.audience || (block.config as any)?.audience || (isGroupSession ? 'group' : undefined),
      complimentary: (block.meta as any)?.complimentary === true || (block.config as any)?.complimentary === true,
      serviceCycles: (block.meta as any)?.serviceCycles || (block.config as any)?.serviceCycles,
      autoCount: isGroupSession && serviceCycleDays && serviceCycleDays > 0 ? true : undefined,
      cadencePricing: cadence ? cadence.cp : undefined,
    },
  } as ConfigurableBlock;
};

// ── Checklist sections (mock 9) ─────────────────────────────────────
const SECTIONS: Array<{
  key: string;
  title: string;
  hint?: string;
  cats: string[];
  priced: boolean;
  comingSoon?: boolean;
  typeLabelByCat?: Record<string, string>;
}> = [
  { key: 'services', title: 'Services — from your catalog', cats: ['service', 'session'], priced: true },
  { key: 'spares', title: 'Spares & parts', cats: ['spare'], priced: true },
  { key: 'fees', title: 'Fees & billing', cats: ['billing'], priced: true },
  {
    key: 'content',
    title: 'Terms & checklists',
    hint: 'content blocks — no pricing, they shape the document & the work',
    cats: ['text', 'checklist'],
    priced: false,
    typeLabelByCat: { text: 'text block', checklist: 'checklist block' },
  },
  {
    key: 'media',
    title: 'Media & documents',
    cats: ['video', 'image', 'document'],
    priced: false,
    comingSoon: true,
    typeLabelByCat: { video: 'video block', image: 'image block', document: 'document block' },
  },
];

const INITIAL_VISIBLE = 4;

const ServiceBlocksStep: React.FC<ServiceBlocksStepProps> = ({
  selectedBlocks,
  currency,
  onBlocksChange,
  contractDuration = 12,
  rfqMode = false,
  coverageTypes = [],
  billingCycleType = null,
  onContinue,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // ── Sprint 1: unified-cycle mismatch, detected at selection time ────
  const cycleMismatch = useMemo(() => {
    if (rfqMode || billingCycleType !== 'unified') return null;
    const pricingBlocks = selectedBlocks.filter((b) => {
      if (b.isFlyBy) return b.flyByType === 'service' || b.flyByType === 'spare';
      return categoryHasPricing(b.categoryId || '');
    });
    if (pricingBlocks.length < 2) return null;
    const cycles = [...new Set(pricingBlocks.map((b) => b.cycle))];
    if (cycles.length <= 1) return null;
    const counts = new Map<string, number>();
    pricingBlocks.forEach((b) => counts.set(b.cycle, (counts.get(b.cycle) || 0) + 1));
    const majority = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const offenders = new Set(pricingBlocks.filter((b) => b.cycle !== majority).map((b) => b.id));
    const offenderNames = pricingBlocks.filter((b) => b.cycle !== majority).map((b) => b.name || 'Custom line');
    return { cycles, majority, offenders, offenderNames };
  }, [rfqMode, billingCycleType, selectedBlocks]);

  // ── Coverage scope (the bold names in "Blocks attach to:") ─────────
  const hasCoverageTypes = coverageTypes.length > 0;
  const [activeCoverageTabId, setActiveCoverageTabId] = useState<string | null>(
    coverageTypes[0]?.id || null
  );

  useEffect(() => {
    if (hasCoverageTypes && !coverageTypes.find((ct) => ct.id === activeCoverageTabId)) {
      setActiveCoverageTabId(coverageTypes[0]?.id || null);
    }
  }, [coverageTypes, activeCoverageTabId, hasCoverageTypes]);

  const activeCoverageType = useMemo(
    () => coverageTypes.find((ct) => ct.id === activeCoverageTabId) || null,
    [coverageTypes, activeCoverageTabId]
  );

  // Local state
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [vaniDismissed, setVaniDismissed] = useState(false);

  // ── Catalog blocks (same source as library + recommender) ──────────
  const { data: catData, isLoading: catalogLoading } = useCatBlocksTest();
  const allCatalogBlocks: Block[] = useMemo(() => {
    const raw = (catData as any)?.data?.blocks || (catData as any)?.blocks || [];
    try { return catBlocksToBlocks(raw); } catch { return []; }
  }, [catData]);

  // ── Derived: blocks for active coverage scope ──────────────────────
  const blocksForActiveTab = useMemo(() => {
    if (!hasCoverageTypes) return selectedBlocks;
    return selectedBlocks.filter((b) => b.coverageTypeId === activeCoverageTabId);
  }, [selectedBlocks, activeCoverageTabId, hasCoverageTypes]);

  const allSelectedBlockIds = useMemo(
    () => selectedBlocks.filter((b) => !b.isFlyBy).map((b) => b.id),
    [selectedBlocks]
  );

  // Per-scope counts for the coverage pills
  const tabStats = useMemo(() => {
    const stats: Record<string, { count: number; subtotal: number }> = {};
    for (const ct of coverageTypes) {
      const tabBlocks = selectedBlocks.filter((b) => b.coverageTypeId === ct.id);
      stats[ct.id] = {
        count: tabBlocks.length,
        subtotal: tabBlocks.reduce((sum, b) => sum + b.totalPrice, 0),
      };
    }
    return stats;
  }, [coverageTypes, selectedBlocks]);

  // ── VaNi suggestions (same heuristic as the drawer) ────────────────
  const vaniSuggestions = useMemo(() => {
    if (rfqMode || vaniDismissed) return [];
    const addedBaseIds = allSelectedBlockIds.map((id) => id.split('__')[0]);
    const { services, spares } = recommendBlocks(
      allCatalogBlocks,
      coverageTypes.map((ct) => ct.resource_name).filter(Boolean) as string[],
      addedBaseIds,
    );
    return [...services, ...spares];
  }, [rfqMode, vaniDismissed, allCatalogBlocks, coverageTypes, allSelectedBlockIds]);

  // ── Group Session auto-count (UNCHANGED) ───────────────────────────
  useEffect(() => {
    if (!contractDuration) return;
    const durationDays = contractDuration * 30;
    let changed = false;
    const next = selectedBlocks.map((b) => {
      const isGroup = (b.config as any)?.audience === 'group' || b.categoryId === 'session';
      const auto = (b.config as any)?.autoCount === true;
      const cycle = b.serviceCycleDays;
      if (isGroup && auto && cycle && cycle > 0) {
        const derived = Math.max(1, Math.floor(durationDays / cycle));
        if (b.quantity !== derived) {
          changed = true;
          const unitWithTax =
            b.taxInclusion === 'inclusive' ? b.price : b.price + (b.price * (b.taxRate || 0)) / 100;
          return { ...b, quantity: derived, totalPrice: Math.round(unitWithTax * derived * 100) / 100 };
        }
      }
      return b;
    });
    if (changed) onBlocksChange(next);
  }, [contractDuration, selectedBlocks, onBlocksChange]);

  // ── Cadence blocks: keep money in sync with the duration (UNCHANGED)
  useEffect(() => {
    if (!contractDuration) return;
    const durationMonths = Math.max(1, contractDuration);
    let changed = false;
    const switched: string[] = [];
    const next = selectedBlocks.map((b) => {
      const cp = b.config?.cadencePricing as BlockCadencePricing | undefined;
      if (!cp) return b;
      let cycle = b.cycle;
      let price = b.price;
      let listPrice = b.listPrice;
      let cfg = b.config;
      const def = getCadenceCycle(cycle);
      if (!def || def.monthsPerPeriod > durationMonths || !fittingCadences(cp, durationMonths).some((c) => c.id === cycle)) {
        const fallback = proposedCadence(cp, durationMonths);
        if (!fallback) return b;
        cycle = fallback.id;
        price = cp.rates.find((r) => r.cycle === fallback.id)!.amount;
        listPrice = price;
        cfg = { ...cfg, customPrice: cfg?.cadenceOverrides?.[fallback.id], cadenceFinalPayment: undefined };
        switched.push(`${b.name}: switched to ${fallback.label}`);
      }
      const cadDef = getCadenceCycle(cycle)!;
      const effectivePrice = cfg?.customPrice ?? price;
      const taxFactor = (b.taxRate || 0) > 0 && b.taxInclusion === 'exclusive' ? 1 + (b.taxRate || 0) / 100 : 1;
      const m = cadenceTermMath(effectivePrice, durationMonths, cadDef.monthsPerPeriod, cfg?.cadenceFinalPayment);
      const totalPrice = Math.round(m.termTotal * taxFactor * 100) / 100;
      if (b.cycle !== cycle || b.totalPrice !== totalPrice) {
        changed = true;
        return { ...b, cycle, price, listPrice, config: cfg, totalPrice };
      }
      return b;
    });
    if (changed) {
      onBlocksChange(next);
      switched.forEach((msg) => addToast({ type: 'warning', title: 'Payment cadence adjusted', message: `${msg} — the previous cadence no longer fits the contract duration` }));
    }
  }, [contractDuration, selectedBlocks, onBlocksChange, addToast]);

  const grandTotal = useMemo(() => {
    return selectedBlocks.reduce((sum, b) => sum + b.totalPrice, 0);
  }, [selectedBlocks]);

  const discountCount = useMemo(
    () =>
      selectedBlocks.filter((b) => {
        const eff = b.config?.customPrice ?? b.price;
        return typeof b.listPrice === 'number' && b.listPrice > 0 && eff < b.listPrice;
      }).length,
    [selectedBlocks],
  );

  // ── Add block from catalog (UNCHANGED except no auto-expand — the
  // checklist shows the collapsed summary line per the design) ────────
  const handleAddBlock = useCallback(
    (block: Block) => {
      const isDuplicate = blocksForActiveTab.some((b) => b.id === block.id && !b.isFlyBy);
      if (isDuplicate) {
        addToast({
          type: 'warning',
          title: 'Already added',
          message: `${block.name} is already in ${activeCoverageType?.resource_name || 'this section'}`,
        });
        return;
      }

      const newBlock = buildConfigurableBlock(block, { currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, durationDays: contractDuration ? contractDuration * 30 : undefined });

      onBlocksChange([...selectedBlocks, newBlock]);
      addToast({
        type: 'success',
        title: 'Block added',
        message: hasCoverageTypes
          ? `${block.name} added to ${activeCoverageType?.resource_name}`
          : `${block.name} added to contract`,
      });
    },
    [selectedBlocks, blocksForActiveTab, onBlocksChange, addToast, currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, contractDuration]
  );

  // ── Bulk add — VaNi "Add all N" (UNCHANGED logic) ──────────────────
  const handleAddBlocks = useCallback(
    (blocks: Block[]) => {
      const existingIds = new Set(blocksForActiveTab.filter((b) => !b.isFlyBy).map((b) => b.id));
      const toAdd: ConfigurableBlock[] = [];
      for (const block of blocks) {
        const built = buildConfigurableBlock(block, { currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, durationDays: contractDuration ? contractDuration * 30 : undefined });
        if (existingIds.has(built.id)) continue;
        existingIds.add(built.id);
        toAdd.push(built);
      }
      if (toAdd.length === 0) {
        addToast({ type: 'info', title: 'Nothing new', message: 'Those blocks are already added.' });
        return;
      }
      onBlocksChange([...selectedBlocks, ...toAdd]);
      addToast({
        type: 'success',
        title: 'Blocks added',
        message: `${toAdd.length} block${toAdd.length === 1 ? '' : 's'} added${hasCoverageTypes && activeCoverageType ? ` to ${activeCoverageType.resource_name}` : ''}`,
      });
    },
    [selectedBlocks, blocksForActiveTab, onBlocksChange, addToast, currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, contractDuration]
  );

  // Add FlyBy custom line (UNCHANGED; service type per MVP scope)
  const handleAddFlyByBlock = useCallback(
    (type: FlyByCategoryId) => {
      const typeConfig = FLYBY_TYPE_CONFIG[type as keyof typeof FLYBY_TYPE_CONFIG];
      const category = getCatById(type);
      const flyById = `flyby-${type}-${Date.now()}`;

      const newBlock: ConfigurableBlock = {
        id: flyById,
        name: '',
        description: '',
        icon: category?.icon || 'Package',
        quantity: 1,
        cycle: 'prepaid',
        unlimited: false,
        price: 0,
        currency: currency,
        totalPrice: 0,
        categoryName: typeConfig?.label || type,
        categoryColor: typeConfig?.color || '#6B7280',
        categoryBgColor: typeConfig?.bgColor,
        categoryId: type,
        isFlyBy: true,
        flyByType: type,
        coverageTypeId: activeCoverageType?.id,
        coverageTypeName: activeCoverageType?.resource_name,
        config: {
          showDescription: false,
        },
      };

      onBlocksChange([...selectedBlocks, newBlock]);
      addToast({
        type: 'success',
        title: 'FlyBy block added',
        message: hasCoverageTypes
          ? `New ${typeConfig?.label || type} added to ${activeCoverageType?.resource_name}`
          : `New ${typeConfig?.label || type} FlyBy block added`,
      });

      setExpandedBlockId(flyById);
    },
    [selectedBlocks, onBlocksChange, addToast, currency, activeCoverageType, hasCoverageTypes]
  );

  // Remove block (UNCHANGED)
  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      const block = selectedBlocks.find((b) => b.id === blockId);
      onBlocksChange(selectedBlocks.filter((b) => b.id !== blockId));

      if (expandedBlockId === blockId) {
        setExpandedBlockId(null);
      }

      if (block) {
        addToast({
          type: 'info',
          title: 'Block removed',
          message: `${block.name || 'Custom line'} removed from contract`,
        });
      }
    },
    [selectedBlocks, onBlocksChange, expandedBlockId, addToast]
  );

  // Update block configuration (UNCHANGED — cadence/tax math intact)
  const handleUpdateBlock = useCallback(
    (blockId: string, updates: Partial<ConfigurableBlock>) => {
      const durationMonths = Math.max(1, contractDuration || 12);
      onBlocksChange(
        selectedBlocks.map((block) => {
          if (block.id === blockId) {
            const updated = { ...block, ...updates };
            const effectivePrice = updated.config?.customPrice ?? updated.price;
            const taxRate = updated.taxRate || 0;
            const taxFactor = taxRate > 0 && updated.taxInclusion === 'exclusive' ? 1 + taxRate / 100 : 1;
            const unitPrice = effectivePrice * taxFactor;
            const cadDef = updated.config?.cadencePricing ? getCadenceCycle(updated.cycle) : undefined;
            if (cadDef) {
              const m = cadenceTermMath(effectivePrice, durationMonths, cadDef.monthsPerPeriod, updated.config?.cadenceFinalPayment);
              updated.totalPrice = Math.round(m.termTotal * taxFactor * 100) / 100;
            } else {
              updated.totalPrice = Math.round(
                (updated.unlimited ? unitPrice : unitPrice * updated.quantity) * 100
              ) / 100;
            }
            return updated;
          }
          return block;
        })
      );
    },
    [selectedBlocks, onBlocksChange, contractDuration]
  );

  const handleToggleExpand = useCallback((blockId: string) => {
    setExpandedBlockId((prev) => (prev === blockId ? null : blockId));
  }, []);

  // ── "Align all to X" — snaps every offender to the majority cycle
  // through the SAME math handleUpdateBlock uses ─────────────────────
  const handleAlignAll = useCallback(() => {
    if (!cycleMismatch) return;
    const majority = cycleMismatch.majority;
    const durationMonths = Math.max(1, contractDuration || 12);
    let skipped = 0;
    const next = selectedBlocks.map((b) => {
      if (!cycleMismatch.offenders.has(b.id)) return b;
      let updated: ConfigurableBlock = { ...b, cycle: majority };
      const cp = b.config?.cadencePricing as BlockCadencePricing | undefined;
      if (cp) {
        const rate = cp.rates.find((r) => r.cycle === majority && r.enabled !== false);
        if (!rate || !getCadenceCycle(majority)) { skipped += 1; return b; }
        const overrides: Record<string, number | undefined> = { ...(b.config as any)?.cadenceOverrides };
        if (b.config?.customPrice !== undefined) overrides[b.cycle] = b.config.customPrice;
        else delete overrides[b.cycle];
        updated = {
          ...updated,
          price: rate.amount,
          listPrice: rate.amount,
          config: { ...b.config, cadenceOverrides: overrides, customPrice: overrides[majority], cadenceFinalPayment: undefined } as any,
        };
      }
      const effectivePrice = updated.config?.customPrice ?? updated.price;
      const taxFactor = (updated.taxRate || 0) > 0 && updated.taxInclusion === 'exclusive' ? 1 + (updated.taxRate || 0) / 100 : 1;
      const cadDef = updated.config?.cadencePricing ? getCadenceCycle(updated.cycle) : undefined;
      updated.totalPrice = cadDef
        ? Math.round(cadenceTermMath(effectivePrice, durationMonths, cadDef.monthsPerPeriod, updated.config?.cadenceFinalPayment).termTotal * taxFactor * 100) / 100
        : Math.round((updated.unlimited ? effectivePrice * taxFactor : effectivePrice * taxFactor * updated.quantity) * 100) / 100;
      return updated;
    });
    onBlocksChange(next);
    if (skipped > 0) {
      addToast({ type: 'warning', title: 'Some blocks kept their cycle', message: `${skipped} block${skipped === 1 ? '' : 's'} have no matching rate for that cycle on their rate card.` });
    }
  }, [cycleMismatch, selectedBlocks, onBlocksChange, contractDuration, addToast]);

  // ── Checklist helpers ──────────────────────────────────────────────
  const instanceIdFor = useCallback(
    (block: Block) => (hasCoverageTypes ? `${block.id}__${activeCoverageTabId}` : block.id),
    [hasCoverageTypes, activeCoverageTabId],
  );

  const instanceFor = useCallback(
    (block: Block) => selectedBlocks.find((b) => b.id === instanceIdFor(block)),
    [selectedBlocks, instanceIdFor],
  );

  const suggestionIds = useMemo(() => new Set(vaniSuggestions.map((b) => b.id)), [vaniSuggestions]);

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = useCallback(
    (b: Block) =>
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q) ||
      (b.categoryId || '').toLowerCase().includes(q),
    [q],
  );

  const flyByLines = useMemo(
    () => blocksForActiveTab.filter((b) => b.isFlyBy),
    [blocksForActiveTab],
  );

  const majorityLabel = useMemo(() => {
    if (!cycleMismatch) return '';
    const cad = getCadenceCycle(cycleMismatch.majority);
    if (cad) return cad.label;
    if (cycleMismatch.majority === 'prepaid') return 'PrePaid';
    if (cycleMismatch.majority === 'postpaid') return 'PostPaid';
    return cycleMismatch.majority;
  }, [cycleMismatch]);

  // ── Render ─────────────────────────────────────────────────────────
  const dim = colors.utility.secondaryText;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.utility.primaryBackground }}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[780px] mx-auto px-4 pt-6 pb-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-[19px] font-extrabold" style={{ color: colors.utility.primaryText }}>
              {rfqMode ? 'Define Required Services' : 'Add Service Blocks'}
            </h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: dim }}>
              {rfqMode ? 'Add the services you need quotes for' : 'tick what this contract delivers'}
            </p>
            {/* Coverage scope — the bold names are the scope switcher */}
            {hasCoverageTypes && (
              <div className="text-[12px] mt-2" style={{ color: dim }}>
                Blocks attach to:{' '}
                {coverageTypes.map((ct, i) => {
                  const isActive = ct.id === activeCoverageTabId;
                  const stats = tabStats[ct.id] || { count: 0 };
                  return (
                    <React.Fragment key={ct.id}>
                      {i > 0 && ' · '}
                      <button
                        type="button"
                        onClick={() => { setActiveCoverageTabId(ct.id); setExpandedBlockId(null); }}
                        className="font-bold transition-colors"
                        style={{
                          color: isActive ? colors.brand.primary : colors.utility.primaryText,
                          textDecoration: isActive ? 'underline' : 'none',
                          textUnderlineOffset: 3,
                        }}
                      >
                        {ct.resource_name}{stats.count > 0 ? ` (${stats.count})` : ''}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {!rfqMode && (
            <>
              {/* VaNi inline banner */}
              <VaNiInlineBanner
                colors={colors}
                suggestions={vaniSuggestions}
                assetNames={coverageTypes.map((ct) => ct.resource_name).filter(Boolean) as string[]}
                onAddAll={handleAddBlocks}
                onDismiss={() => setVaniDismissed(true)}
              />

              {/* Full-catalog search */}
              <div className="mt-4">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your full catalog — services, spares, terms, checklists…"
                  className="w-full rounded-[10px] px-3.5 py-2.5 text-[13.5px]"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(30,41,59,0.6)' : '#fff',
                    border: `1px solid ${colors.utility.primaryText}15`,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>

              {/* Catalog checklist, grouped by block type */}
              {catalogLoading ? (
                <div className="text-center py-10 text-[12.5px]" style={{ color: dim }}>
                  Loading your catalog…
                </div>
              ) : (
                SECTIONS.map((section) => {
                  const sectionBlocks = allCatalogBlocks.filter((b) => section.cats.includes(b.categoryId));
                  if (sectionBlocks.length === 0) return null;

                  // Selected first, then VaNi-recommended, then name
                  const rank = (b: Block) =>
                    instanceFor(b) ? 0 : suggestionIds.has(b.id) ? 1 : 2;
                  const sorted = [...sectionBlocks].sort(
                    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
                  );

                  const searched = sorted.filter(matchesSearch);
                  if (q && searched.length === 0) return null;

                  const isExpanded = expandedSections.has(section.key);
                  const visible = q
                    ? searched
                    : isExpanded
                      ? sorted
                      : sorted.filter((b, i) => i < INITIAL_VISIBLE || !!instanceFor(b));
                  const hiddenCount = q ? 0 : sorted.length - visible.length;

                  return (
                    <div key={section.key} className="mt-5">
                      {!q && (
                        <div
                          className="text-[11px] font-extrabold uppercase tracking-wider mb-2"
                          style={{ color: dim }}
                        >
                          {section.title}
                          <span className="font-normal normal-case tracking-normal">
                            {section.hint && <> · {section.hint}</>}
                            {hiddenCount > 0 && (
                              <>
                                {' '}· {visible.length} of {sorted.length} shown ·{' '}
                                <button
                                  type="button"
                                  className="font-semibold"
                                  style={{ color: colors.brand.primary }}
                                  onClick={() =>
                                    setExpandedSections((prev) => new Set(prev).add(section.key))
                                  }
                                >
                                  show all {sorted.length}
                                </button>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      {visible.map((block) => {
                        const instance = instanceFor(block);
                        const instId = instanceIdFor(block);
                        return (
                          <ChecklistRow
                            key={block.id}
                            colors={colors}
                            isDarkMode={isDarkMode}
                            currency={currency}
                            block={block}
                            instance={instance}
                            checked={!!instance}
                            disabled={section.comingSoon}
                            priced={section.priced && categoryHasPricing(block.categoryId)}
                            mismatch={
                              instance && cycleMismatch?.offenders.has(instId)
                                ? { majority: cycleMismatch.majority }
                                : null
                            }
                            expanded={expandedBlockId === instId}
                            durationMonths={Math.max(1, contractDuration || 12)}
                            typeLabel={section.typeLabelByCat?.[block.categoryId]}
                            onToggle={() =>
                              instance ? handleRemoveBlock(instId) : handleAddBlock(block)
                            }
                            onToggleExpand={() => handleToggleExpand(instId)}
                            onUpdate={(updates) => handleUpdateBlock(instId, updates)}
                          />
                        );
                      })}
                    </div>
                  );
                })
              )}

              {/* Cycle mismatch — one affordance, one-click fix */}
              {cycleMismatch && (
                <div
                  className="flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 mt-3.5 text-[12.5px]"
                  style={{ backgroundColor: '#F59E0B14', borderColor: '#F59E0B50', color: colors.utility.primaryText }}
                  role="alert"
                >
                  <Zap size={13} className="flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <span>
                    <b style={{ color: '#B45309' }}>Billing cycles differ:</b>{' '}
                    {cycleMismatch.offenderNames.slice(0, 2).join(', ')}
                    {cycleMismatch.offenderNames.length > 2 ? ` +${cycleMismatch.offenderNames.length - 2} more` : ''} bill
                    differently from the rest. Unified billing needs one cycle.
                  </span>
                  <button
                    type="button"
                    onClick={handleAlignAll}
                    className="ml-auto flex-shrink-0 rounded-[7px] px-3 py-1.5 text-[12px] font-bold text-white transition hover:opacity-90"
                    style={{ backgroundColor: '#d97706' }}
                  >
                    Align all to {majorityLabel}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Custom lines (FlyBy) — also the whole surface in RFQ mode */}
          {(flyByLines.length > 0 || rfqMode) && (
            <div className="mt-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: dim }}>
                Custom lines{rfqMode ? ' — describe what you need quotes for' : ' — not in your catalog'}
              </div>
              {flyByLines.map((fb) => (
                <ChecklistRow
                  key={fb.id}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  currency={currency}
                  instance={fb}
                  checked
                  priced={!rfqMode && (fb.flyByType === 'service' || fb.flyByType === 'spare')}
                  flyBy
                  mismatch={
                    cycleMismatch?.offenders.has(fb.id)
                      ? { majority: cycleMismatch.majority }
                      : null
                  }
                  expanded={expandedBlockId === fb.id}
                  durationMonths={Math.max(1, contractDuration || 12)}
                  onToggle={() => handleToggleExpand(fb.id)}
                  onToggleExpand={() => handleToggleExpand(fb.id)}
                  onUpdate={(updates) => handleUpdateBlock(fb.id, updates)}
                  onRemove={() => handleRemoveBlock(fb.id)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => handleAddFlyByBlock('service')}
            className="w-full rounded-[11px] border-2 border-dashed px-3 py-3 mt-3.5 text-[13px] font-bold transition-colors"
            style={{ borderColor: colors.utility.primaryText + '25', color: dim, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.brand.primary; e.currentTarget.style.borderColor = colors.brand.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = colors.utility.primaryText + '25'; }}
          >
            + Add a custom line (not in your catalog)
          </button>
        </div>
      </div>

      {/* Sticky running total */}
      <StickyTotalBar
        colors={colors}
        isDarkMode={isDarkMode}
        count={selectedBlocks.length}
        totalLabel={formatCurrency(grandTotal, currency)}
        discountCount={discountCount}
        hidePricing={rfqMode}
        onContinue={onContinue}
      />
    </div>
  );
};

export default ServiceBlocksStep;

// src/components/contracts/ContractWizard/steps/ServiceBlocksStep.tsx
// Step: Add Service Blocks — 3-column layout with drag-drop reordering
// Column 1: Block Library | Column 2: Added Blocks (tabbed by coverage type) | Column 3: Live Preview
// Blocks are grouped per coverage type from AssetSelectionStep

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ShoppingCart, Layers, Zap, ChevronDown, Wrench, Package, FileText, File, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { Block } from '@/types/catalogStudio';
import { getCategoryById } from '@/utils/catalog-studio';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';

// Import shared catalog-studio components
import { BlockLibraryMini, BlockCardConfigurable, FlyByBlockCard, ConfigurableBlock } from '@/components/catalog-studio';
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

// Import contract preview panel
import ContractPreviewPanel from '../components/ContractPreviewPanel';

// VaNi block recommender (tenant agent — picks the tenant's own blocks)
import VaNiBlockRecommender from '../vani/VaNiBlockRecommender';

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
  // (instead of a toast when Continue is pressed)
  billingCycleType?: string | null;
}

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
};

// Build a ConfigurableBlock from a library Block (pure — no state).
// Extracted so both single-add and bulk-add (VaNi recommender) share the exact
// same pricing/tax/cycle/instance-id logic.
const buildConfigurableBlock = (
  block: Block,
  ctx: { currency: string; activeCoverageType: CoverageTypeItem | null; activeCoverageTabId: string | null; hasCoverageTypes: boolean; durationDays?: number }
): ConfigurableBlock => {
  const { currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, durationDays } = ctx;
  const category = getCategoryById(block.categoryId);

  const blockServiceCycles = (block.meta as any)?.serviceCycles || (block.config as any)?.serviceCycles;
  const blockAudience = (block.meta as any)?.audience || (block.config as any)?.audience;
  // A block is a Group Session if it carries audience=group OR it still lives under
  // the legacy 'session' category (older blocks whose meta.audience never mapped).
  const isGroupSession = blockAudience === 'group' || block.categoryId === 'session';
  // Group Sessions are cadence-first: their cycle drives the roster occurrences,
  // so honor the days even when `enabled` was never stamped on the config.
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

  // ── Cadence (cyclical) pricing — carried from the catalog rate card ──
  // v1 limitation: Group Session blocks keep single-price behavior (their
  // quantity means roster occurrences; payments-vs-occurrences needs its own
  // design pass before combining the two).
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
    // If no cadence fits the term (contract shorter than every priced cadence),
    // fall back to single-price behavior at the anchor total.
    if (proposed) cadence = { cp, proposed };
  }
  const cadenceRate = cadence ? cadence.cp.rates.find(r => r.cycle === cadence!.proposed!.id)!.amount : 0;
  const cadenceMath = cadence
    ? cadenceTermMath(cadenceRate, durationMonths, cadence.proposed!.monthsPerPeriod)
    : null;
  // Term total with tax (final payment taxed like every other payment)
  const cadenceTotalWithTax = cadenceMath
    ? (taxInclusion === 'inclusive'
        ? cadenceMath.termTotal
        : cadenceMath.termTotal * (1 + totalTaxRate / 100))
    : 0;

  // Group Sessions are cadence-first: default the occurrence count to however
  // many cycles fit the contract duration (e.g. 14-day cadence over 12 months
  // → ~26 sessions), so the timeline reflects the real schedule. Still fully
  // editable on the card (manual quantity preserved).
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
      // Inherit billing-only from the catalog block (fees/dues blocks never
      // generate service events); still toggleable per-contract on the card
      billingOnly: (block.meta as any)?.billingOnly === true || (block.config as any)?.billingOnly === true,
      // Inherit audience (group => a session with a roster) and complimentary
      // (free => no price, no billing) so the card shows the right options and
      // generation branches correctly. Fall back to 'group' for legacy session
      // blocks whose meta.audience never mapped.
      audience: (block.meta as any)?.audience || (block.config as any)?.audience || (isGroupSession ? 'group' : undefined),
      complimentary: (block.meta as any)?.complimentary === true || (block.config as any)?.complimentary === true,
      // Carry the full service-cycle config (incl. anchorWeekday) so occurrence
      // generation can snap to the weekday.
      serviceCycles: (block.meta as any)?.serviceCycles || (block.config as any)?.serviceCycles,
      // Group Sessions fill the contract: keep the count auto-derived from the
      // duration until the user pins it manually on the card.
      autoCount: isGroupSession && serviceCycleDays && serviceCycleDays > 0 ? true : undefined,
      // Cadence pricing: the full rate card rides on the block so the card can
      // offer cadence switches now and the buyer can pick at review later.
      cadencePricing: cadence ? cadence.cp : undefined,
    },
  } as ConfigurableBlock;
};

const ServiceBlocksStep: React.FC<ServiceBlocksStepProps> = ({
  selectedBlocks,
  currency,
  onBlocksChange,
  contractName,
  contractStatus = 'draft',
  contractDuration = 12,
  contractStartDate,
  selectedBuyer,
  selectedPerson,
  useCompanyContact,
  rfqMode = false,
  coverageTypes = [],
  billingCycleType = null,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // ── Sprint 1: unified-cycle mismatch, detected at selection time ────
  // Mirrors the rule enforced at Continue in index.tsx (same pricing-block
  // filter) so the user is warned on the offending card, not by a late toast.
  const cycleMismatch = useMemo(() => {
    if (rfqMode || billingCycleType !== 'unified') return null;
    const pricingBlocks = selectedBlocks.filter((b) => {
      if (b.isFlyBy) return b.flyByType === 'service' || b.flyByType === 'spare';
      return categoryHasPricing(b.categoryId || '');
    });
    if (pricingBlocks.length < 2) return null;
    const cycles = [...new Set(pricingBlocks.map((b) => b.cycle))];
    if (cycles.length <= 1) return null;
    // Majority cycle = the "expected" one; every other cycle's blocks offend
    const counts = new Map<string, number>();
    pricingBlocks.forEach((b) => counts.set(b.cycle, (counts.get(b.cycle) || 0) + 1));
    const majority = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const offenders = new Set(pricingBlocks.filter((b) => b.cycle !== majority).map((b) => b.id));
    return { cycles, majority, offenders };
  }, [rfqMode, billingCycleType, selectedBlocks]);

  // Fetch tenant profile for preview
  const { profile: tenantProfile } = useTenantProfile();

  // ── Coverage tabs ─────────────────────────────────────────────────
  const hasCoverageTypes = coverageTypes.length > 0;
  const [activeCoverageTabId, setActiveCoverageTabId] = useState<string | null>(
    coverageTypes[0]?.id || null
  );

  // Sync active tab if coverageTypes change (e.g. navigating back & forth)
  useEffect(() => {
    if (hasCoverageTypes && !coverageTypes.find((ct) => ct.id === activeCoverageTabId)) {
      setActiveCoverageTabId(coverageTypes[0]?.id || null);
    }
  }, [coverageTypes, activeCoverageTabId, hasCoverageTypes]);

  const activeCoverageType = useMemo(
    () => coverageTypes.find((ct) => ct.id === activeCoverageTabId) || null,
    [coverageTypes, activeCoverageTabId]
  );

  // ── Glassmorphic styles (matches /contacts pattern) ───────────────
  const glassStyle: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
  };

  // Local state
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // VaNi block recommender (tenant agent)
  const [showRecommender, setShowRecommender] = useState(false);

  // FlyBy dropdown state
  const [showFlyByMenu, setShowFlyByMenu] = useState(false);
  const flyByMenuRef = useRef<HTMLDivElement>(null);

  // Close FlyBy menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyByMenuRef.current && !flyByMenuRef.current.contains(e.target as Node)) {
        setShowFlyByMenu(false);
      }
    };
    if (showFlyByMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFlyByMenu]);

  // FlyBy menu options
  const flyByMenuOptions = [
    { type: 'service' as FlyByCategoryId, icon: Wrench, label: 'Service', color: '#3B82F6' },
    { type: 'spare' as FlyByCategoryId, icon: Package, label: 'Spare Part', color: '#F59E0B' },
    { type: 'text' as FlyByCategoryId, icon: FileText, label: 'Text Block', color: '#8B5CF6' },
    { type: 'document' as FlyByCategoryId, icon: File, label: 'Document', color: '#10B981' },
  ];

  // Drag-drop state (same pattern as template.tsx)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // ── Derived: blocks for active tab ────────────────────────────────
  // When coverage types exist, filter blocks by active tab's coverageTypeId
  // When no coverage types, show all blocks (legacy flat mode)
  const blocksForActiveTab = useMemo(() => {
    if (!hasCoverageTypes) return selectedBlocks;
    return selectedBlocks.filter((b) => b.coverageTypeId === activeCoverageTabId);
  }, [selectedBlocks, activeCoverageTabId, hasCoverageTypes]);

  // Get selected block IDs for library — scoped to active tab
  // Same catalog block can be added to different coverage types
  const selectedBlockIdsForTab = useMemo(() => {
    return blocksForActiveTab
      .filter((b) => !b.isFlyBy)
      .map((b) => b.id);
  }, [blocksForActiveTab]);

  // All selected block IDs (for library badge counts across all tabs)
  const allSelectedBlockIds = useMemo(
    () => selectedBlocks.filter((b) => !b.isFlyBy).map((b) => b.id),
    [selectedBlocks]
  );

  // ── Per-tab counts & totals ───────────────────────────────────────
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

  // Calculate totals
  const totals = useMemo(() => {
    const subset = hasCoverageTypes ? blocksForActiveTab : selectedBlocks;
    const subtotal = subset.reduce((sum, b) => sum + b.totalPrice, 0);
    return {
      subtotal,
      count: subset.length,
    };
  }, [selectedBlocks, blocksForActiveTab, hasCoverageTypes]);

  // ── Group Session auto-count ──────────────────────────────────────
  // A Group Session runs on its cadence for the whole contract, so its
  // occurrence count must track the duration — otherwise a session added while
  // the duration was still the default (e.g. 1 month) keeps a stale count after
  // the user extends the contract to a year. Recompute the count whenever the
  // duration changes, but only while the session is still on auto-count; a
  // manual edit on the card pins it (autoCount=false) and we leave it alone.
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

  // ── Cadence blocks: keep money in sync with the contract duration ───
  // The payment count derives from (cadence, term); when the duration changes,
  // term totals must follow. If the chosen cadence no longer fits (term became
  // shorter than the cadence period), auto-switch to the tenant default /
  // first fitting cadence — with a visible toast, never a silent price change.
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
        if (!fallback) return b; // nothing fits — card shows the warning
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

  // ── Add block from library ────────────────────────────────────────
  const handleAddBlock = useCallback(
    (block: Block) => {
      // Check duplicate within the SAME coverage tab
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

      setExpandedBlockId(newBlock.id);
    },
    [selectedBlocks, blocksForActiveTab, onBlocksChange, addToast, currency, activeCoverageType, activeCoverageTabId, hasCoverageTypes, contractDuration]
  );

  // ── Bulk add (VaNi recommender) ───────────────────────────────────
  // Adds many library blocks in ONE onBlocksChange, deduped against the
  // active tab. Single onBlocksChange avoids the stale-closure loop bug.
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

  // Add FlyBy block (inline empty block)
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

  // Remove block
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
          message: `${block.name} removed from contract`,
        });
      }
    },
    [selectedBlocks, onBlocksChange, expandedBlockId, addToast]
  );

  // Update block configuration
  const handleUpdateBlock = useCallback(
    (blockId: string, updates: Partial<ConfigurableBlock>) => {
      const durationMonths = Math.max(1, contractDuration || 12);
      onBlocksChange(
        selectedBlocks.map((block) => {
          if (block.id === blockId) {
            const updated = { ...block, ...updates };
            // Recalculate total price with tax
            const effectivePrice = updated.config?.customPrice ?? updated.price;
            const taxRate = updated.taxRate || 0;
            const taxFactor = taxRate > 0 && updated.taxInclusion === 'exclusive' ? 1 + taxRate / 100 : 1;
            const unitPrice = effectivePrice * taxFactor;
            const cadDef = updated.config?.cadencePricing ? getCadenceCycle(updated.cycle) : undefined;
            if (cadDef) {
              // Cadence-priced: total = payments derived from (cadence, term),
              // NOT quantity (quantity stays the service-visit count).
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

  // Toggle block expansion
  const handleToggleExpand = useCallback((blockId: string) => {
    setExpandedBlockId((prev) => (prev === blockId ? null : blockId));
  }, []);

  // Drag-drop handlers — only within same coverage type
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    setExpandedBlockId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (blockId !== draggedBlockId) {
      setDragOverBlockId(blockId);
    }
  }, [draggedBlockId]);

  const handleDragLeave = useCallback(() => {
    setDragOverBlockId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    // Only reorder within same coverage type
    const draggedBlock = selectedBlocks.find((b) => b.id === draggedBlockId);
    const targetBlock = selectedBlocks.find((b) => b.id === targetBlockId);
    if (draggedBlock?.coverageTypeId !== targetBlock?.coverageTypeId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const draggedIndex = selectedBlocks.findIndex((b) => b.id === draggedBlockId);
    const targetIndex = selectedBlocks.findIndex((b) => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBlocks = [...selectedBlocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);

    onBlocksChange(newBlocks);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, [draggedBlockId, selectedBlocks, onBlocksChange]);

  // ── Render helpers ────────────────────────────────────────────────

  const renderBlockList = (blocks: ConfigurableBlock[]) => {
    if (blocks.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center py-12">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${colors.utility.primaryText}10` }}
          >
            <Layers className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
          </div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: colors.utility.primaryText }}
          >
            No blocks added yet
          </p>
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            {rfqMode
              ? 'Use the FlyBy button to add services you need quotes for'
              : hasCoverageTypes
                ? `Add blocks from the library for ${activeCoverageType?.resource_name || 'this type'}`
                : 'Add blocks from the library to build your contract'
            }
          </p>
          {/* Sprint 1: recommendations-first — VaNi is the opening move, not a hidden button */}
          {!rfqMode && (
            <button
              type="button"
              onClick={() => setShowRecommender(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all hover:opacity-90"
              style={{
                borderColor: colors.brand.primary,
                backgroundColor: `${colors.brand.primary}10`,
                color: colors.brand.primary,
              }}
            >
              <Sparkles size={13} />
              Ask VaNi what this contract usually includes
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Sprint 1: unified-cycle mismatch — warn here, on selection, not at Continue */}
        {cycleMismatch && (
          <div
            className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium"
            style={{ borderColor: '#F59E0B', backgroundColor: '#F59E0B12', color: '#B45309' }}
            role="alert"
          >
            <Zap size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <span>
              Unified billing cycle, but blocks bill on {cycleMismatch.cycles.join(' and ')}. Align the
              marked block{cycleMismatch.offenders.size > 1 ? 's' : ''} to <strong>{cycleMismatch.majority}</strong> —
              or switch the contract to per-block billing on the Billing Cycle step.
            </span>
          </div>
        )}
        {blocks.map((block) => {
          const isDragging = draggedBlockId === block.id;
          const isDragOver = dragOverBlockId === block.id;

          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, block.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, block.id)}
              className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-[0.98]' : ''}`}
              style={{
                borderTop: isDragOver ? `2px solid ${colors.brand.primary}` : '2px solid transparent',
              }}
            >
              {block.isFlyBy ? (
                <FlyByBlockCard
                  block={block}
                  isExpanded={expandedBlockId === block.id}
                  isDragging={isDragging}
                  dragHandleProps={{
                    style: { cursor: 'grab' },
                  }}
                  contractDurationDays={contractDuration ? contractDuration * 30 : undefined}
                  onToggleExpand={handleToggleExpand}
                  onRemove={handleRemoveBlock}
                  onUpdate={handleUpdateBlock}
                  hidePricing={rfqMode}
                />
              ) : (
                <BlockCardConfigurable
                  block={block}
                  isExpanded={expandedBlockId === block.id}
                  isDragging={isDragging}
                  dragHandleProps={{
                    style: { cursor: 'grab' },
                  }}
                  contractDurationDays={contractDuration ? contractDuration * 30 : undefined}
                  onToggleExpand={handleToggleExpand}
                  onRemove={handleRemoveBlock}
                  onUpdate={handleUpdateBlock}
                />
              )}
              {/* Sprint 1: per-block footnotes — cycle offender + recorded discount.
                  Discount compares the EFFECTIVE selling price (customPrice ?? price)
                  against the list price — for cadence blocks, list = the chosen
                  cadence's rate, so the chip is cadence-aware automatically. */}
              {(() => {
                const effPrice = block.config?.customPrice ?? block.price;
                const hasList = typeof block.listPrice === 'number' && block.listPrice > 0;
                if (!cycleMismatch?.offenders.has(block.id) && !(hasList && effPrice !== block.listPrice)) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                    {cycleMismatch?.offenders.has(block.id) && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F59E0B15', color: '#B45309', border: '1px solid #F59E0B50' }}
                      >
                        <Zap size={9} /> bills {block.cycle} — contract is unified {cycleMismatch.majority}
                      </span>
                    )}
                    {hasList && effPrice < block.listPrice! && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
                        title="Recorded as a line discount (internal — not shown on the invoice lines)"
                      >
                        list <s>{formatCurrency(block.listPrice!, block.currency)}</s> → {formatCurrency(effPrice, block.currency)}
                        {' '}(−{Math.round((1 - effPrice / block.listPrice!) * 1000) / 10}%)
                      </span>
                    )}
                    {hasList && effPrice > block.listPrice! && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${colors.utility.primaryText}0A`, color: colors.utility.secondaryText }}
                      >
                        above list ({formatCurrency(block.listPrice!, block.currency)})
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="text-center pt-6 pb-4 px-4 flex-shrink-0">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: colors.utility.primaryText }}
        >
          {rfqMode ? 'Define Required Services' : 'Add Service Blocks'}
        </h2>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {rfqMode
            ? 'Add the services you need quotes for'
            : hasCoverageTypes
              ? 'Select services for each equipment type covered by this contract'
              : 'Select services and configure them for your contract'
          }
        </p>
        {/* VaNi suggest — recommends the tenant's own blocks for these assets */}
        <button
          onClick={() => setShowRecommender(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ff6b2b, #ff8f5a)' }}
        >
          <Sparkles className="w-3.5 h-3.5" /> Suggest blocks with VaNi
        </button>
      </div>

      {/* VaNi block recommender (tenant agent) */}
      <VaNiBlockRecommender
        isOpen={showRecommender}
        onClose={() => setShowRecommender(false)}
        currency={currency}
        assetNames={coverageTypes.map((ct) => ct.resource_name).filter(Boolean) as string[]}
        addedBaseIds={allSelectedBlockIds.map((id) => id.split('__')[0])}
        onAddBlocks={handleAddBlocks}
      />

      {/* 3-Column Layout - fills remaining height */}
      <div className="flex-1 flex gap-4 px-4 pb-6 min-h-0 overflow-hidden">
        {/* Column 1: Block Library */}
        <div className="w-[280px] flex-shrink-0" style={{ height: 'calc(100vh - 200px)' }}>
          <BlockLibraryMini
            selectedBlockIds={selectedBlockIdsForTab}
            onAddBlock={handleAddBlock}
            maxHeight="calc(100vh - 200px)"
            currency={currency}
            flyByTypes={['service', 'spare', 'text', 'document']}
            onAddFlyByBlock={handleAddFlyByBlock}
            flyByOnly={rfqMode}
          />
        </div>

        {/* Column 2: Added Blocks — tabbed by coverage type */}
        <div
          className="flex-1 flex flex-col rounded-2xl border overflow-hidden shadow-sm"
          style={glassStyle}
        >
          {/* ── Coverage Type Tabs ──────────────────────────────────── */}
          {hasCoverageTypes && (
            <div
              className="flex items-center gap-1 px-3 pt-3 pb-0 flex-shrink-0 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {coverageTypes.map((ct) => {
                const isActive = ct.id === activeCoverageTabId;
                const scConfig = getSubCategoryConfig(ct.sub_category);
                const TabIcon = scConfig?.icon || Package;
                const tabColor = scConfig?.color || '#6B7280';
                const stats = tabStats[ct.id] || { count: 0, subtotal: 0 };

                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setActiveCoverageTabId(ct.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-semibold
                      transition-all whitespace-nowrap border border-b-0
                    `}
                    style={{
                      backgroundColor: isActive
                        ? (isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)')
                        : 'transparent',
                      borderColor: isActive
                        ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)')
                        : 'transparent',
                      color: isActive ? tabColor : colors.utility.secondaryText,
                      boxShadow: isActive ? '0 -2px 8px -2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <TabIcon size={14} style={{ color: isActive ? tabColor : colors.utility.secondaryText }} />
                    <span>{ct.resource_name}</span>
                    {stats.count > 0 && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isActive ? tabColor + '15' : colors.utility.primaryText + '10',
                          color: isActive ? tabColor : colors.utility.secondaryText,
                        }}
                      >
                        {stats.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Added Blocks Header with FlyBy Dropdown */}
          <div
            className="p-3 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                {hasCoverageTypes && activeCoverageType
                  ? activeCoverageType.resource_name
                  : 'Added Blocks'
                }
              </span>
              {totals.count > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#fff',
                  }}
                >
                  {totals.count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* FlyBy Dropdown */}
              <div className="relative" ref={flyByMenuRef}>
                <button
                  onClick={() => setShowFlyByMenu(!showFlyByMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    color: colors.utility.primaryText,
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  FlyBy
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFlyByMenu ? 'rotate-180' : ''}`} />
                </button>
                {showFlyByMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-20 py-1 overflow-hidden"
                    style={{
                      background: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    } as React.CSSProperties}
                  >
                    {flyByMenuOptions.map((opt) => {
                      const OptIcon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => {
                            handleAddFlyByBlock(opt.type);
                            setShowFlyByMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:opacity-80"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${opt.color}15` }}
                          >
                            <OptIcon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                          </div>
                          <span className="font-medium">{opt.label}</span>
                          <Zap className="w-3 h-3 ml-auto" style={{ color: opt.color }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blocks List */}
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(248, 250, 252, 0.5)' }}
          >
            {renderBlockList(blocksForActiveTab)}
          </div>

          {/* Summary Footer */}
          {(totals.count > 0 || (hasCoverageTypes && selectedBlocks.length > 0)) && (
            <div
              className="p-3 border-t flex-shrink-0"
              style={{
                borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: colors.utility.secondaryText }}>
                  {totals.count > 0 ? 'Drag to reorder • Click to configure' : 'No blocks in this tab'}
                </span>
                <div className="flex items-center gap-3">
                  {hasCoverageTypes && totals.count > 0 && (
                    <span style={{ color: colors.utility.secondaryText }}>
                      Tab: <strong style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(totals.subtotal, currency)}
                      </strong>
                    </span>
                  )}
                  <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                    {hasCoverageTypes ? (
                      <>Total: {formatCurrency(grandTotal, currency)} ({selectedBlocks.length} block{selectedBlocks.length !== 1 ? 's' : ''})</>
                    ) : (
                      <>{totals.count} block{totals.count !== 1 ? 's' : ''}</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Live Contract Preview — stretch to row height so the
            panel's internal overflow-y-auto scrolls (self-start collapsed it to
            content height, clipping Contract Details below the fold) */}
        <div className="w-[360px] flex-shrink-0 min-h-0">
          <ContractPreviewPanel
            tenantProfile={tenantProfile}
            selectedBuyer={selectedBuyer}
            selectedPerson={selectedPerson}
            useCompanyContact={useCompanyContact}
            contractName={contractName}
            contractStatus={contractStatus}
            contractDuration={contractDuration}
            contractStartDate={contractStartDate}
            selectedBlocks={selectedBlocks}
            currency={currency}
            hidePricing={rfqMode}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceBlocksStep;

// PART 1 OF 2 — Combine with PART2 to get the full PricingStep.tsx
// Copy the combined file to: contractnest-ui/src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx

// src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx
// Updated: Variant pricing toggle — "Same for All" vs "Per Variant" with full pricing cards

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DollarSign,
  Calculator,
  Plus,
  Trash2,
  Lightbulb,
  Users,
  Globe,
  X,
  Receipt,
  CheckCircle2,
  Info,
  TrendingUp,
  TreePine,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block, SelectedVariant } from '../../../../../types/catalogStudio';
import { currencyOptions } from '../../../../../utils/constants/currencies';
import { useTaxRatesDropdown } from '../../../../../hooks/queries/useProductMasterdata';

// =================================================================
// TYPES
// =================================================================

interface TaxEntry {
  id: string;
  name: string;
  rate: number;
}

interface PricingRecord {
  id: string;
  currency: string;
  amount: number;
  price_type: 'fixed' | 'hourly' | 'per_unit' | 'price_range';
  tax_inclusion: 'inclusive' | 'exclusive';
  taxes: TaxEntry[];
  billing_cycle?: string;
  is_active: boolean;
}

interface VariantPricingRecord {
  id: string;
  variant_id: string;
  variant_name: string;
  capacity_range?: string | null;
  currency: string;
  amount: number;
  price_type: 'fixed' | 'hourly';
  tax_inclusion: 'inclusive' | 'exclusive';
  taxes: TaxEntry[];
  is_active: boolean;
}

interface ResourcePricingRecord {
  id: string;
  resourceTypeId: string;
  resourceTypeName: string;
  currency: string;
  pricePerUnit: number;
  pricingModel: 'hourly' | 'per_unit' | 'fixed';
  tax_inclusion: 'inclusive' | 'exclusive';
  taxes: TaxEntry[];
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
}

interface PricingStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

type PriceType = 'fixed' | 'hourly' | 'tiered' | 'custom';
type VariantPricingMode = 'all' | 'per_variant';

// =================================================================
// COMPONENT
// =================================================================

const PricingStep: React.FC<PricingStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tax rates from API
  const { options: taxRateOptions, isLoading: taxLoading } = useTaxRatesDropdown();

  // Get resource types from formData
  const selectedResourceTypes = (formData.meta?.resourceTypes as string[]) || [];
  const resourceQuantities = (formData.meta?.resourceQuantities as Record<string, number>) || {};
  const pricingMode = (formData.meta?.pricingMode as string) || 'independent';

  const defaultCurrency = 'INR';

  // =================================================================
  // STATE
  // =================================================================

  const [pricingRecords, setPricingRecords] = useState<PricingRecord[]>(() => {
    const existing = formData.meta?.pricingRecords as PricingRecord[];
    if (existing && existing.length > 0) return existing;
    return [{
      id: '1',
      currency: defaultCurrency,
      amount: 0,
      price_type: 'fixed',
      tax_inclusion: 'exclusive',
      taxes: [],
      is_active: true,
    }];
  });

  const [resourcePricingRecords, setResourcePricingRecords] = useState<ResourcePricingRecord[]>(() => {
    const existing = formData.meta?.resourcePricingRecords as ResourcePricingRecord[];
    if (existing && existing.length > 0) return existing;
    return selectedResourceTypes.map((typeId, idx) => ({
      id: `rp-${idx}`,
      resourceTypeId: typeId,
      resourceTypeName: typeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      currency: defaultCurrency,
      pricePerUnit: 0,
      pricingModel: 'hourly' as const,
      tax_inclusion: 'exclusive' as const,
      taxes: [],
    }));
  });

  const [tiers, setTiers] = useState<PricingTier[]>(
    (formData.meta?.pricingTiers as PricingTier[]) || []
  );

  const [priceType, setPriceType] = useState<PriceType>(
    (formData.meta?.priceType as PriceType) || 'fixed'
  );

  const [addCurrencyDropdown, setAddCurrencyDropdown] = useState(false);
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Variant pricing — "Same for All" vs "Per Variant"
  const selectedVariants = (formData.meta?.selectedVariants as SelectedVariant[]) || [];

  const [variantPricingMode, setVariantPricingMode] = useState<VariantPricingMode>(
    (formData.meta?.variantPricingMode as VariantPricingMode) || 'all'
  );

  const [variantPricingRecords, setVariantPricingRecords] = useState<VariantPricingRecord[]>(() => {
    const existing = formData.meta?.variantPricingRecords as VariantPricingRecord[];
    if (existing && existing.length > 0) return existing;
    return selectedVariants.map((v) => ({
      id: `vp-${v.variant_id}`,
      variant_id: v.variant_id,
      variant_name: v.variant_name,
      capacity_range: v.capacity_range,
      currency: defaultCurrency,
      amount: 0,
      price_type: (priceType === 'hourly' ? 'hourly' : 'fixed') as 'fixed' | 'hourly',
      tax_inclusion: 'exclusive' as const,
      taxes: [],
      is_active: true,
    }));
  });

  // Sync variant pricing records when selectedVariants changes
  useEffect(() => {
    if (variantPricingMode !== 'per_variant' || selectedVariants.length === 0) return;
    setVariantPricingRecords(prev => {
      const existingIds = new Set(prev.map(r => r.variant_id));
      const newRecords = [...prev];
      selectedVariants.forEach(v => {
        if (!existingIds.has(v.variant_id)) {
          newRecords.push({
            id: `vp-${v.variant_id}`,
            variant_id: v.variant_id,
            variant_name: v.variant_name,
            capacity_range: v.capacity_range,
            currency: defaultCurrency,
            amount: 0,
            price_type: (priceType === 'hourly' ? 'hourly' : 'fixed') as 'fixed' | 'hourly',
            tax_inclusion: 'exclusive',
            taxes: [],
            is_active: true,
          });
        }
      });
      const selectedIds = new Set(selectedVariants.map(v => v.variant_id));
      return newRecords.filter(r => selectedIds.has(r.variant_id));
    });
  }, [selectedVariants, variantPricingMode]);

  // Variant pricing handlers
  const updateVariantPricingRecord = useCallback((id: string, field: keyof VariantPricingRecord, value: unknown) => {
    setVariantPricingRecords(prev => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addTaxToVariantRecord = useCallback((recordId: string, taxOption: { value: string; label: string; rate?: number }) => {
    setVariantPricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      if (r.taxes.some(t => t.id === taxOption.value)) return r;
      return { ...r, taxes: [...r.taxes, { id: taxOption.value, name: taxOption.label, rate: taxOption.rate || 0 }] };
    }));
    setTaxDropdownOpen(null);
  }, []);

  const removeTaxFromVariantRecord = useCallback((recordId: string, taxId: string) => {
    setVariantPricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      return { ...r, taxes: r.taxes.filter(t => t.id !== taxId) };
    }));
  }, []);

  const addVariantCurrency = useCallback((variantId: string, currency: string) => {
    if (variantPricingRecords.some(r => r.variant_id === variantId && r.currency === currency)) return;
    const existing = variantPricingRecords.find(r => r.variant_id === variantId);
    if (!existing) return;
    setVariantPricingRecords(prev => [...prev, {
      id: `vp-${variantId}-${currency}`,
      variant_id: variantId,
      variant_name: existing.variant_name,
      capacity_range: existing.capacity_range,
      currency,
      amount: 0,
      price_type: existing.price_type,
      tax_inclusion: 'exclusive',
      taxes: [],
      is_active: true,
    }]);
  }, [variantPricingRecords]);

  const removeVariantCurrencyRecord = useCallback((id: string, variantId: string) => {
    const variantRecords = variantPricingRecords.filter(r => r.variant_id === variantId);
    if (variantRecords.length <= 1) return;
    setVariantPricingRecords(prev => prev.filter(r => r.id !== id));
  }, [variantPricingRecords]);

  const getAvailableCurrenciesForVariant = useCallback((variantId: string) => {
    const used = variantPricingRecords.filter(r => r.variant_id === variantId).map(r => r.currency);
    return currencyOptions.filter(c => !used.includes(c.code));
  }, [variantPricingRecords]);

  // Ref to hold latest formData.meta
  const metaRef = useRef(formData.meta);
  useEffect(() => {
    metaRef.current = formData.meta;
  }, [formData.meta]);

  // Single unified sync effect
  useEffect(() => {
    const currentMeta = metaRef.current || {};
    const updatedMeta: Record<string, unknown> = {
      ...currentMeta,
      pricingRecords,
      priceType,
      pricingTiers: tiers,
      variantPricingMode: selectedVariants.length > 0 ? variantPricingMode : undefined,
      variantPricingRecords: selectedVariants.length > 0 && variantPricingMode === 'per_variant' ? variantPricingRecords : undefined,
    };
    if (pricingMode === 'resource_based') {
      updatedMeta.resourcePricingRecords = resourcePricingRecords;
    }
    onChange('meta', updatedMeta);
  }, [pricingRecords, priceType, tiers, variantPricingMode, variantPricingRecords, resourcePricingRecords, pricingMode]);

// END OF PART 1 — continued in PART 2
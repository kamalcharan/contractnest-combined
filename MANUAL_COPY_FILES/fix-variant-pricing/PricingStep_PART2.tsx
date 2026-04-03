// PART 2 OF 2 — Append this after PART1 content
// This is the RENDER section of PricingStep.tsx

  // =================================================================
  // STYLES - White background for inputs
  // =================================================================

  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  // =================================================================
  // PRICE BREAKDOWN CALCULATION
  // =================================================================

  const calculateBreakdown = useCallback((amount: number, taxes: TaxEntry[], taxInclusion: 'inclusive' | 'exclusive') => {
    const totalTaxRate = taxes.reduce((sum, t) => sum + t.rate, 0);
    if (taxInclusion === 'inclusive') {
      const baseAmount = amount / (1 + totalTaxRate / 100);
      const taxAmount = amount - baseAmount;
      return { subtotal: baseAmount, taxAmount, total: amount, taxRate: totalTaxRate };
    } else {
      const taxAmount = (amount * totalTaxRate) / 100;
      return { subtotal: amount, taxAmount, total: amount + taxAmount, taxRate: totalTaxRate };
    }
  }, []);

  // =================================================================
  // HANDLERS
  // =================================================================

  const addPricingRecord = useCallback((currency: string) => {
    if (pricingRecords.some((r) => r.currency === currency)) return;
    setPricingRecords([...pricingRecords, {
      id: Date.now().toString(),
      currency,
      amount: 0,
      price_type: priceType === 'tiered' ? 'fixed' : (priceType as 'fixed' | 'hourly'),
      tax_inclusion: 'exclusive',
      taxes: [],
      is_active: true,
    }]);
    setAddCurrencyDropdown(false);
  }, [pricingRecords, priceType]);

  const removePricingRecord = useCallback((id: string) => {
    if (pricingRecords.length <= 1) return;
    setPricingRecords(pricingRecords.filter((r) => r.id !== id));
  }, [pricingRecords]);

  const updatePricingRecord = useCallback((id: string, field: keyof PricingRecord, value: unknown) => {
    setPricingRecords(prev => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addTaxToRecord = useCallback((recordId: string, taxOption: { value: string; label: string; rate?: number }) => {
    setPricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      if (r.taxes.some(t => t.id === taxOption.value)) return r;
      return { ...r, taxes: [...r.taxes, { id: taxOption.value, name: taxOption.label, rate: taxOption.rate || 0 }] };
    }));
    setTaxDropdownOpen(null);
  }, []);

  const removeTaxFromRecord = useCallback((recordId: string, taxId: string) => {
    setPricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      return { ...r, taxes: r.taxes.filter(t => t.id !== taxId) };
    }));
  }, []);

  const addResourcePricingCurrency = useCallback((resourceTypeId: string, currency: string) => {
    if (resourcePricingRecords.some(r => r.resourceTypeId === resourceTypeId && r.currency === currency)) return;
    const existing = resourcePricingRecords.find(r => r.resourceTypeId === resourceTypeId);
    setResourcePricingRecords([...resourcePricingRecords, {
      id: `rp-${Date.now()}`,
      resourceTypeId,
      resourceTypeName: existing?.resourceTypeName || resourceTypeId,
      currency,
      pricePerUnit: 0,
      pricingModel: existing?.pricingModel || 'hourly',
      tax_inclusion: 'exclusive',
      taxes: [],
    }]);
  }, [resourcePricingRecords]);

  const updateResourcePricing = useCallback((id: string, field: keyof ResourcePricingRecord, value: unknown) => {
    setResourcePricingRecords(prev => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addTaxToResourceRecord = useCallback((recordId: string, taxOption: { value: string; label: string; rate?: number }) => {
    setResourcePricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      if (r.taxes.some(t => t.id === taxOption.value)) return r;
      return { ...r, taxes: [...r.taxes, { id: taxOption.value, name: taxOption.label, rate: taxOption.rate || 0 }] };
    }));
    setTaxDropdownOpen(null);
  }, []);

  const removeTaxFromResourceRecord = useCallback((recordId: string, taxId: string) => {
    setResourcePricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      return { ...r, taxes: r.taxes.filter(t => t.id !== taxId) };
    }));
  }, []);

  const addTier = useCallback((currency: string) => {
    setTiers([...tiers, {
      id: Date.now().toString(),
      name: `Tier ${tiers.filter((t) => t.currency === currency).length + 1}`,
      price: 0,
      currency,
    }]);
  }, [tiers]);

  const removeTier = useCallback((id: string) => {
    setTiers(tiers.filter((t) => t.id !== id));
  }, [tiers]);

  const updateTier = useCallback((id: string, field: keyof PricingTier, value: string | number) => {
    setTiers(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }, [tiers]);

  const getAvailableCurrencies = useCallback(() => {
    const used = pricingRecords.map((r) => r.currency);
    return currencyOptions.filter((c) => !used.includes(c.code));
  }, [pricingRecords]);

  const getAvailableCurrenciesForResource = useCallback((resourceTypeId: string) => {
    const used = resourcePricingRecords.filter((r) => r.resourceTypeId === resourceTypeId).map((r) => r.currency);
    return currencyOptions.filter((c) => !used.includes(c.code));
  }, [resourcePricingRecords]);

  const pricingOptions = [
    { id: 'fixed', icon: DollarSign, label: 'Fixed Price', description: 'One-time fixed amount' },
    { id: 'hourly', icon: Calculator, label: 'Hourly Rate', description: 'Charge per hour' },
  ];

  // =================================================================
  // TAX TAGS COMPONENT
  // =================================================================

  const TaxTags: React.FC<{
    taxes: TaxEntry[];
    onRemove: (taxId: string) => void;
    recordId: string;
    onAddTax: (recordId: string, tax: { value: string; label: string; rate?: number }) => void;
    availableTaxes: { value: string; label: string; rate?: number }[];
  }> = ({ taxes, onRemove, recordId, onAddTax, availableTaxes }) => {
    const unused = availableTaxes.filter(t => !taxes.some(existing => existing.id === t.value));
    return (
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>Tax Rates (select multiple)</label>
        <div className="flex flex-wrap gap-1.5 items-center min-h-[40px] p-2 border rounded-xl" style={inputStyle}>
          {taxes.map((tax) => (
            <span key={tax.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}>
              {tax.name} ({tax.rate}%)
              <button type="button" onClick={() => onRemove(tax.id)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {unused.length > 0 && (
            <div className="relative">
              <button type="button" onClick={() => setTaxDropdownOpen(taxDropdownOpen === recordId ? null : recordId)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed hover:border-solid transition-all" style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}>
                <Plus className="w-3 h-3" /> Add Tax
              </button>
              {taxDropdownOpen === recordId && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTaxDropdownOpen(null)} />
                  <div className="absolute left-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-xl border shadow-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                    {unused.map((tax) => (
                      <button key={tax.value} type="button" onClick={() => onAddTax(recordId, tax)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                        <span>{tax.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {taxes.length === 0 && unused.length === 0 && (
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>No taxes available</span>
          )}
        </div>
      </div>
    );
  };

  // =================================================================
  // PRICE BREAKDOWN COMPONENT
  // =================================================================

  const PriceBreakdown: React.FC<{
    amount: number;
    taxes: TaxEntry[];
    taxInclusion: 'inclusive' | 'exclusive';
    currencySymbol: string;
  }> = ({ amount, taxes, taxInclusion, currencySymbol }) => {
    const breakdown = calculateBreakdown(amount, taxes, taxInclusion);
    if (amount <= 0) return null;
    return (
      <div className="mt-3 p-3 rounded-xl border" style={{ backgroundColor: `${colors.semantic.success}08`, borderColor: `${colors.semantic.success}30` }}>
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-4 h-4" style={{ color: colors.semantic.success }} />
          <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>Price Breakdown</span>
        </div>
        <div className="space-y-1 text-xs" style={{ color: colors.utility.secondaryText }}>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span style={{ color: colors.utility.primaryText }}>{currencySymbol} {breakdown.subtotal.toFixed(2)}</span>
          </div>
          {taxes.map((tax) => (
            <div key={tax.id} className="flex justify-between">
              <span>{tax.name} ({tax.rate}%)</span>
              <span style={{ color: colors.utility.primaryText }}>{currencySymbol} {((breakdown.subtotal * tax.rate) / 100).toFixed(2)}</span>
            </div>
          ))}
          {taxes.length > 1 && (
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
              <span>Total Tax ({breakdown.taxRate}%)</span>
              <span style={{ color: colors.utility.primaryText }}>{currencySymbol} {breakdown.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t font-semibold" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB', color: colors.utility.primaryText }}>
            <span>Total</span>
            <span style={{ color: colors.semantic.success }}>{currencySymbol} {breakdown.total.toFixed(2)}</span>
          </div>
          {taxInclusion === 'inclusive' && (
            <div className="text-[10px] italic" style={{ color: colors.utility.secondaryText }}>* Price is tax inclusive</div>
          )}
        </div>
      </div>
    );
  };

// END OF PART 2 — RENDER section continues in PART 3
// PART 3 OF 4 — JSX RENDER section

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Pricing Configuration
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Set your service pricing. Add multiple currencies and tax rates as needed.
      </p>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) - Pricing Controls */}
        <div className="lg:col-span-3 space-y-6">

          {/* Resource-based Pricing Notice */}
          {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border" style={cardStyle}>
              <Users className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.brand.primary }} />
              <div>
                <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>Resource-Based Pricing Active</h4>
                <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>Configure pricing for each resource type. Multiple taxes can be applied.</p>
              </div>
            </div>
          )}

          {/* Pricing Model Selection */}
          <div className="p-6 rounded-xl border" style={cardStyle}>
              <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
                Pricing Model <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {pricingOptions.map((option) => {
                  const IconComp = option.icon;
                  const isSelected = priceType === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setPriceType(option.id as PriceType)}
                      className="p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                      style={{
                        backgroundColor: isSelected ? `${colors.brand.primary}08` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                        borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: isSelected ? colors.brand.primary : `${colors.brand.primary}15` }}>
                          <IconComp className="w-6 h-6" style={{ color: isSelected ? '#FFFFFF' : colors.brand.primary }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5" style={{ color: colors.brand.primary }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          {/* VARIANT PRICING TOGGLE — shown when KT variants are selected */}
          {selectedVariants.length > 0 && (
            <>
              <div className="p-4 rounded-xl border" style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <Layers className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>Variant Pricing</h4>
                    <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                      {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''} selected — choose how to price them
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'all', label: 'Same for All', desc: 'One price applies to every variant' },
                    { id: 'per_variant', label: 'Per Variant', desc: 'Set price individually for each variant' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setVariantPricingMode(opt.id as VariantPricingMode)}
                      className="p-3 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                      style={{
                        backgroundColor: variantPricingMode === opt.id ? `${colors.brand.primary}08` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                        borderColor: variantPricingMode === opt.id ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{opt.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>{opt.desc}</div>
                        </div>
                        {variantPricingMode === opt.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: colors.brand.primary }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PER-VARIANT PRICING CARDS */}
              {variantPricingMode === 'per_variant' && (
                <div className="space-y-4">
                  {selectedVariants.map((variant) => {
                    const records = variantPricingRecords.filter(r => r.variant_id === variant.variant_id);
                    const availableCurrencies = getAvailableCurrenciesForVariant(variant.variant_id);
                    return (
                      <div key={variant.variant_id} className="p-5 rounded-xl border" style={cardStyle}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colors.brand.primary}15` }}>
                              <TreePine className="w-5 h-5" style={{ color: colors.brand.primary }} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>{variant.variant_name}</h4>
                              {variant.capacity_range && <p className="text-xs" style={{ color: colors.utility.secondaryText }}>{variant.capacity_range}</p>}
                            </div>
                          </div>
                          {availableCurrencies.length > 0 && (
                            <div className="relative">
                              <button type="button" onClick={() => setEditingRecordId(editingRecordId === variant.variant_id ? null : variant.variant_id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border-2 font-medium transition-all hover:shadow-sm" style={{ color: colors.brand.primary, borderColor: colors.brand.primary, backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}>
                                <Plus className="w-3 h-3" /> Currency
                              </button>
                              {editingRecordId === variant.variant_id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setEditingRecordId(null)} />
                                  <div className="absolute right-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-xl border shadow-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                                    {availableCurrencies.map((c) => (
                                      <button key={c.code} type="button" onClick={() => { addVariantCurrency(variant.variant_id, c.code); setEditingRecordId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                                        <span className="font-semibold">{c.symbol}</span><span>{c.code}</span>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {records.map((record) => {
                            const currencyInfo = currencyOptions.find(c => c.code === record.currency);
                            const sym = currencyInfo?.symbol || record.currency;
                            return (
                              <div key={record.id} className="p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FAFAFA', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}>{sym}</span>
                                    <div>
                                      <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{currencyInfo?.name || record.currency}</span>
                                      <span className="text-xs ml-1.5" style={{ color: colors.utility.secondaryText }}>{record.currency}</span>
                                    </div>
                                  </div>
                                  {records.length > 1 && (
                                    <button type="button" onClick={() => removeVariantCurrencyRecord(record.id, record.variant_id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Remove currency">
                                      <Trash2 className="w-3.5 h-3.5" style={{ color: colors.semantic.error }} />
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>
                                      {priceType === 'hourly' ? 'Hourly Rate' : 'Price'} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: colors.utility.secondaryText }}>{sym}</span>
                                      <input type="number" value={record.amount || ''} onChange={(e) => updateVariantPricingRecord(record.id, 'amount', parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} placeholder="0.00" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>Tax Treatment</label>
                                    <select value={record.tax_inclusion} onChange={(e) => updateVariantPricingRecord(record.id, 'tax_inclusion', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm" style={inputStyle}>
                                      <option value="exclusive">Tax Exclusive</option>
                                      <option value="inclusive">Tax Inclusive</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <TaxTags taxes={record.taxes} onRemove={(taxId) => removeTaxFromVariantRecord(record.id, taxId)} recordId={record.id} onAddTax={addTaxToVariantRecord} availableTaxes={taxRateOptions} />
                                </div>
                                <PriceBreakdown amount={record.amount} taxes={record.taxes} taxInclusion={record.tax_inclusion} currencySymbol={sym} />
                              </div>
                            );
                          })}
                          {records.length === 0 && (
                            <div className="p-3 rounded-xl border-2 border-dashed text-center" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No pricing configured for this variant.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

// END OF PART 3 — continued in PART 4
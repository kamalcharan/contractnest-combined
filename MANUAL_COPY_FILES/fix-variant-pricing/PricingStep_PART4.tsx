// PART 4 OF 4 — Currency-specific pricing, resource pricing, right column, closing

          {/* MULTI-CURRENCY PRICING RECORDS */}
          {priceType !== 'custom' && (
            <div className="p-6 rounded-xl border" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Globe className="w-4 h-4" style={{ color: colors.brand.primary }} />
                  Currency-Specific Pricing
                </h4>
                <div className="relative">
                  <button type="button" onClick={() => setAddCurrencyDropdown(!addCurrencyDropdown)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border-2 font-medium transition-all hover:shadow-md" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', color: colors.brand.primary, borderColor: colors.brand.primary }} disabled={getAvailableCurrencies().length === 0}>
                    <Plus className="w-4 h-4" /> Add Currency
                  </button>
                  {addCurrencyDropdown && getAvailableCurrencies().length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAddCurrencyDropdown(false)} />
                      <div className="absolute right-0 z-50 mt-1 w-56 max-h-60 overflow-y-auto rounded-xl border shadow-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                        {getAvailableCurrencies().map((currency) => (
                          <button key={currency.code} type="button" onClick={() => addPricingRecord(currency.code)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                            <span className="w-8 font-semibold">{currency.symbol}</span>
                            <span className="text-sm">{currency.name} ({currency.code})</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {pricingRecords.map((record) => {
                  const currencyInfo = currencyOptions.find((c) => c.code === record.currency);
                  const currencySymbol = currencyInfo?.symbol || record.currency;
                  return (
                    <div key={record.id} className="p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FAFAFA', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}>{currencySymbol}</span>
                          <div>
                            <div className="font-semibold" style={{ color: colors.utility.primaryText }}>{currencyInfo?.name || record.currency}</div>
                            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{record.currency}</div>
                          </div>
                        </div>
                        {pricingRecords.length > 1 && (
                          <button type="button" onClick={() => removePricingRecord(record.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" style={{ color: colors.semantic.error }} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>
                            {priceType === 'hourly' ? 'Hourly Rate' : 'Price'} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" style={{ color: colors.utility.secondaryText }}>{currencySymbol}</span>
                            <input type="number" value={record.amount || ''} onChange={(e) => updatePricingRecord(record.id, 'amount', parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} placeholder="0.00" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>Tax Treatment</label>
                          <select value={record.tax_inclusion} onChange={(e) => updatePricingRecord(record.id, 'tax_inclusion', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm" style={inputStyle}>
                            <option value="exclusive">Tax Exclusive</option>
                            <option value="inclusive">Tax Inclusive</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <TaxTags taxes={record.taxes} onRemove={(taxId) => removeTaxFromRecord(record.id, taxId)} recordId={record.id} onAddTax={addTaxToRecord} availableTaxes={taxRateOptions} />
                      </div>
                      <PriceBreakdown amount={record.amount} taxes={record.taxes} taxInclusion={record.tax_inclusion} currencySymbol={currencySymbol} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RESOURCE-BASED PRICING */}
          {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
            <div className="space-y-6">
              {selectedResourceTypes.map((resourceTypeId) => {
                const resourceName = resourceTypeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                const records = resourcePricingRecords.filter((r) => r.resourceTypeId === resourceTypeId);
                const available = getAvailableCurrenciesForResource(resourceTypeId);
                return (
                  <div key={resourceTypeId} className="p-4 rounded-xl border" style={cardStyle}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" style={{ color: colors.brand.primary }} />
                        <div>
                          <span className="font-semibold" style={{ color: colors.utility.primaryText }}>{resourceName}</span>
                          {resourceQuantities[resourceTypeId] > 1 && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}>x{resourceQuantities[resourceTypeId]}</span>
                          )}
                        </div>
                      </div>
                      {available.length > 0 && (
                        <div className="relative">
                          <button type="button" onClick={() => setEditingRecordId(editingRecordId === resourceTypeId ? null : resourceTypeId)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-xl border-2 font-medium" style={{ color: colors.brand.primary, borderColor: colors.brand.primary, backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}>
                            <Plus className="w-3 h-3" /> Currency
                          </button>
                          {editingRecordId === resourceTypeId && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setEditingRecordId(null)} />
                              <div className="absolute right-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-xl border shadow-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                                {available.map((c) => (
                                  <button key={c.code} type="button" onClick={() => { addResourcePricingCurrency(resourceTypeId, c.code); setEditingRecordId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
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
                        const info = currencyOptions.find((c) => c.code === record.currency);
                        const sym = info?.symbol || record.currency;
                        return (
                          <div key={record.id} className="p-3 rounded-xl border" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FAFAFA', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{sym} {record.currency}</span>
                              {records.length > 1 && (
                                <button type="button" onClick={() => setResourcePricingRecords(prev => prev.filter(r => r.id !== record.id))} className="p-1">
                                  <Trash2 className="w-3 h-3" style={{ color: colors.semantic.error }} />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Model</label>
                                <select value={record.pricingModel} onChange={(e) => updateResourcePricing(record.id, 'pricingModel', e.target.value)} className="w-full px-2 py-1.5 border rounded-xl text-sm" style={inputStyle}>
                                  <option value="hourly">Per Hour</option>
                                  <option value="per_unit">Per Unit</option>
                                  <option value="fixed">Fixed</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Rate</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.utility.secondaryText }}>{sym}</span>
                                  <input type="number" value={record.pricePerUnit || ''} onChange={(e) => updateResourcePricing(record.id, 'pricePerUnit', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1.5 border rounded-xl text-sm" style={inputStyle} placeholder="0" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Tax Mode</label>
                                <select value={record.tax_inclusion} onChange={(e) => updateResourcePricing(record.id, 'tax_inclusion', e.target.value)} className="w-full px-2 py-1.5 border rounded-xl text-sm" style={inputStyle}>
                                  <option value="exclusive">Exclusive</option>
                                  <option value="inclusive">Inclusive</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-3">
                              <TaxTags taxes={record.taxes} onRemove={(taxId) => removeTaxFromResourceRecord(record.id, taxId)} recordId={record.id} onAddTax={addTaxToResourceRecord} availableTaxes={taxRateOptions} />
                            </div>
                            <PriceBreakdown amount={record.pricePerUnit} taxes={record.taxes} taxInclusion={record.tax_inclusion} currencySymbol={sym} />
                          </div>
                        );
                      })}
                      {records.length === 0 && (
                        <div className="p-3 rounded-xl border-2 border-dashed text-center" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No pricing configured. Click "+ Currency" to add pricing.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (2/5) - Explanation Card */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-xl border h-full" style={{ backgroundColor: isDarkMode ? `${colors.semantic.success}10` : '#ECFDF5', borderColor: isDarkMode ? `${colors.semantic.success}30` : '#A7F3D0' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: isDarkMode ? colors.semantic.success : '#059669' }}>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-base" style={{ color: isDarkMode ? colors.utility.primaryText : '#064E3B' }}>Pricing Best Practices</h4>
              </div>
            </div>
            <div className="space-y-4 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#047857' }}>
              <p>Choose the right pricing model for your service:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                  <span><strong>Fixed Price</strong> — Best for well-defined services with predictable scope and delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                  <span><strong>Hourly Rate</strong> — Ideal for consulting, support, or variable-length engagements</span>
                </li>
              </ul>
            </div>
            <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#064E3B' }}>Multi-Currency Tips</span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#047857' }}>
                <li>• Add currencies for international customers</li>
                <li>• Set appropriate tax rates per currency/region</li>
                <li>• Use tax-inclusive pricing for consumer services</li>
                <li>• Price breakdown shows automatically when taxes applied</li>
              </ul>
            </div>
            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#064E3B' }}>Tax Configuration</span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#047857' }}>
                <li>• Multiple taxes can be applied to a single price</li>
                <li>• Choose between tax-inclusive or tax-exclusive</li>
                <li>• Price breakdown updates in real-time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;
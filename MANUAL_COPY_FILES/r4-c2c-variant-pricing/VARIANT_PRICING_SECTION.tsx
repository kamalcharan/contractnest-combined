          {/* VARIANT PRICING — shown when KT variants are selected */}
          {selectedVariants.length > 0 && (() => {
            const primaryRecord = pricingRecords[0];
            const primaryCurrency = primaryRecord?.currency || 'INR';
            const primarySymbol = currencyOptions.find(c => c.code === primaryCurrency)?.symbol || '₹';
            const basePrice = primaryRecord?.amount || 0;
            const taxInfo = primaryRecord?.taxes?.length
              ? primaryRecord.taxes.map(t => `${t.name} ${t.rate}%`).join(' + ')
              : null;
            const taxInclusion = primaryRecord?.tax_inclusion || 'exclusive';

            return (
              <div className="p-4 rounded-xl border" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TreePine className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    <div>
                      <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                        Variant Pricing
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        Override price per variant, or apply the base price ({primarySymbol}{basePrice}) to all
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyToAll}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:shadow-sm"
                    style={{
                      color: colors.brand.primary,
                      borderColor: colors.brand.primary,
                      backgroundColor: colors.brand.primary + '08',
                    }}
                  >
                    Apply {primarySymbol}{basePrice} to All
                  </button>
                </div>

                {/* Tax context info */}
                {taxInfo && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F0FDF4', border: `1px solid ${colors.semantic.success}20` }}>
                    <Receipt className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      Tax: {taxInfo} ({taxInclusion === 'inclusive' ? 'Inclusive' : 'Exclusive'}) — applied to all variants
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-3 py-1">
                    <span className="flex-1 text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Variant</span>
                    <span className="w-36 text-xs font-medium text-right" style={{ color: colors.utility.secondaryText }}>Price ({primaryCurrency})</span>
                  </div>

                  {/* Rows */}
                  {selectedVariants.map((variant) => {
                    const variantPrice = variantPrices[variant.variant_id];
                    const displayPrice = variantPrice !== undefined ? variantPrice : '';
                    const hasOverride = variantPrice !== undefined && variantPrice !== basePrice && variantPrice > 0;

                    return (
                      <div
                        key={variant.variant_id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        style={{
                          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FAFAFA',
                          borderColor: hasOverride ? colors.brand.primary + '40' : isDarkMode ? '#374151' : '#E5E7EB',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>
                            {variant.variant_name}
                          </p>
                          {variant.capacity_range && (
                            <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                              {variant.capacity_range}
                            </p>
                          )}
                        </div>
                        <div className="w-36 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: colors.utility.secondaryText }}>{primarySymbol}</span>
                          <input
                            type="number"
                            min={0}
                            value={displayPrice}
                            onChange={(e) => handleVariantPriceChange(variant.variant_id, parseFloat(e.target.value) || 0)}
                            className="w-full text-right text-sm pl-8 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2"
                            style={inputStyle}
                            placeholder={basePrice > 0 ? String(basePrice) : '0.00'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

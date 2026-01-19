// src/components/businessmodel/planform/BasicInfoStep.tsx - CLEAN ERROR-FREE VERSION

import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Info, X, ChevronDown, Lock, Edit, GitBranch, Package } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  DEFAULT_VALUES,
  PLAN_TYPES,
  CONFIRMATION_MESSAGES
} from '@/utils/constants/businessModelConstants';
import { currencyOptions, getDefaultCurrency, getCurrencySymbol } from '@/utils/constants/currencies';
import { useXProductDropdown } from '@/hooks/queries/useProductMasterdata';

interface BasicInfoStepProps {
  isEditMode?: boolean;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ isEditMode = false }) => {
  const { 
    register, 
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useFormContext();
  
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch products for dropdown (only needed in create mode)
  // Uses X-Product category from m_category_master - values match x-product header
  const { options: products, isLoading: productsLoading } = useXProductDropdown('global');

  // Watch values for conditional rendering
  const watchProductCode = watch('productCode');
  const watchPlanType = watch('planType');
  const watchIsVisible = watch('isVisible');
  const watchSupportedCurrencies = watch('supportedCurrencies') || [];
  const watchDefaultCurrency = watch('defaultCurrencyCode');
  const watchCurrentVersion = watch('current_version_number');
  const watchNextVersion = watch('next_version_number');
  
  // State for currency dropdown
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  
  // Initialize form with default product (only if not in edit mode)
  // Products are from X-Product category - first item (ContractNest) is default
  useEffect(() => {
    if (!isEditMode && products && products.length > 0 && !watchProductCode) {
      // First product in sequence order is the default (ContractNest)
      const defaultProduct = products[0];
      setValue('productCode', defaultProduct.value);
    }
  }, [products, isEditMode, setValue, watchProductCode]);

  // Initialize form with default currency (only if not in edit mode)
  useEffect(() => {
    if (!isEditMode) {
      // Get the default currency
      const defaultCurrency = getDefaultCurrency();

      // Only set if not already set or empty
      if (!watchSupportedCurrencies || watchSupportedCurrencies.length === 0) {
        setValue('supportedCurrencies', [defaultCurrency.code]);
        setValue('defaultCurrencyCode', defaultCurrency.code);
      }
    }
  }, [setValue, watchSupportedCurrencies, isEditMode]);
  
  // Handle adding a currency (disabled in edit mode)
  const addCurrency = (currencyCode: string) => {
    if (isEditMode) return; // Prevent currency changes in edit mode
    
    if (!watchSupportedCurrencies.includes(currencyCode)) {
      setValue('supportedCurrencies', [...watchSupportedCurrencies, currencyCode]);
    }
    setCurrencyDropdownOpen(false);
  };
  
  // Handle removing a currency (disabled in edit mode) - FIXED: Added type annotation
  const removeCurrency = (currencyCode: string) => {
    if (isEditMode) return; // Prevent currency changes in edit mode
    
    if (currencyCode === watchDefaultCurrency) {
      // Can't remove default currency
      return;
    }
    
    const updatedCurrencies = watchSupportedCurrencies.filter((code: string) => code !== currencyCode);
    setValue('supportedCurrencies', updatedCurrencies);
  };
  
  // Handle setting a currency as default (disabled in edit mode)
  const setDefaultCurrency = (currencyCode: string) => {
    if (isEditMode) return; // Prevent currency changes in edit mode
    
    if (watchSupportedCurrencies.includes(currencyCode)) {
      setValue('defaultCurrencyCode', currencyCode);
    }
  };
  
  // Toggle visibility with proper theming
  const handleVisibilityToggle = (checked: boolean) => {
    setValue('isVisible', checked);
  };
  
  // Get available currencies for dropdown (ones that aren't already selected)
  const getAvailableCurrencies = () => {
    return currencyOptions.filter((currency) => !watchSupportedCurrencies.includes(currency.code));
  };
  
  // Get currency name and symbol
  const getCurrencyInfo = (code: string) => {
    const currency = currencyOptions.find((c) => c.code === code);
    return {
      name: currency?.name || '',
      symbol: currency?.symbol || ''
    };
  };
  
  return (
    <div className="space-y-5">
      {/* Edit Mode Version Info */}
      {isEditMode && (
        <>
          {/* Version Information Card */}
          <div 
            className="mb-6 p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: `${colors.brand.primary}10`,
              borderColor: `${colors.brand.primary}20`
            }}
          >
            <div className="flex items-start">
              <GitBranch 
                className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5"
                style={{ color: colors.brand.primary }}
              />
              <div className="flex-1">
                <p 
                  className="text-sm font-medium mb-3 transition-colors"
                  style={{ color: colors.brand.primary }}
                >
                  Version Information
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label 
                      className="block text-xs font-medium mb-1 transition-colors"
                      style={{ color: colors.brand.primary }}
                    >
                      Current Version
                    </label>
                    <div 
                      className="px-3 py-2 rounded-md border"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: `${colors.brand.primary}30`
                      }}
                    >
                      <span 
                        className="text-sm font-mono transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {watchCurrentVersion}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label 
                      htmlFor="edit-version-number" 
                      className="block text-xs font-medium mb-1 transition-colors"
                      style={{ color: colors.brand.primary }}
                    >
                      New Version <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      id="edit-version-number"
                      type="text"
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        borderColor: `${colors.brand.primary}30`,
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      {...register('next_version_number', { 
                        required: 'Version number is required',
                        pattern: {
                          value: /^\d+\.\d+$/,
                          message: 'Version must be in format X.Y (e.g., 1.1, 2.0)'
                        },
                        validate: (value) => {
                          const current = parseFloat(watchCurrentVersion);
                          const next = parseFloat(value);
                          if (next <= current) {
                            return `Version must be higher than ${watchCurrentVersion}`;
                          }
                          return true;
                        }
                      })}
                    />
                    {errors.next_version_number && (
                      <p 
                        className="mt-1 text-xs"
                        style={{ color: colors.semantic.error }}
                      >
                        {errors.next_version_number.message?.toString()}
                      </p>
                    )}
                  </div>
                </div>
                <p 
                  className="mt-3 text-xs transition-colors"
                  style={{ color: colors.brand.primary }}
                >
                  <strong>Note:</strong> Plan metadata below is read-only in edit mode. 
                  Only pricing, features, and notifications can be modified.
                </p>
              </div>
            </div>
          </div>

          {/* Edit Mode Indicator */}
          <div 
            className="p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: `${colors.semantic.warning || '#F59E0B'}10`,
              borderColor: `${colors.semantic.warning || '#F59E0B'}20`
            }}
          >
            <div className="flex items-start">
              <Edit 
                className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5"
                style={{ color: colors.semantic.warning || '#F59E0B' }}
              />
              <div>
                <p 
                  className="text-sm font-medium transition-colors"
                  style={{ color: colors.semantic.warning || '#F59E0B' }}
                >
                  Editing Plan Metadata
                </p>
                <p 
                  className="mt-1 text-sm transition-colors"
                  style={{ color: colors.semantic.warning || '#F59E0B' }}
                >
                  Plan name, type, and currency settings cannot be changed when editing. 
                  These fields are shown for reference only.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {/* Product Selector - Only in Create Mode */}
        {!isEditMode && (
          <div className="md:col-span-2">
            <label
              htmlFor="productCode"
              className="block text-sm font-medium mb-1 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              <Package className="inline h-4 w-4 mr-1 mb-0.5" />
              Product <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <select
              id="productCode"
              className="w-full max-w-md px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: errors.productCode ? colors.semantic.error : `${colors.utility.secondaryText}40`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
              {...register('productCode', {
                required: 'Product is required'
              })}
              disabled={productsLoading}
            >
              {productsLoading ? (
                <option value="">Loading products...</option>
              ) : (
                <>
                  <option value="">Select a product</option>
                  {products?.map((product, index) => (
                    <option key={product.value} value={product.value}>
                      {product.label} {index === 0 && '(Default)'}
                    </option>
                  ))}
                </>
              )}
            </select>
            {errors.productCode && (
              <p
                className="mt-1 text-sm"
                style={{ color: colors.semantic.error }}
              >
                {errors.productCode.message?.toString()}
              </p>
            )}
            <p
              className="mt-1 text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Select which product this pricing plan belongs to
            </p>
          </div>
        )}

        {/* Plan Name */}
        <div>
          <label 
            htmlFor="name" 
            className="block text-sm font-medium mb-1 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Plan Name <span style={{ color: colors.semantic.error }}>*</span>
            {isEditMode && <Lock className="inline h-3 w-3 ml-1" style={{ color: colors.utility.secondaryText }} />}
          </label>
          <div className="relative">
            <input
              id="name"
              type="text"
              placeholder="e.g., Basic Plan, Pro Plan"
              readOnly={isEditMode}
              className={`w-full max-w-md px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors ${
                isEditMode ? 'cursor-not-allowed' : ''
              }`}
              style={{
                borderColor: errors.name ? colors.semantic.error : `${colors.utility.secondaryText}40`,
                backgroundColor: isEditMode ? `${colors.utility.secondaryText}10` : colors.utility.secondaryBackground,
                color: isEditMode ? colors.utility.secondaryText : colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
              {...register('name', { 
                required: !isEditMode ? 'Plan name is required' : false,
                maxLength: {
                  value: 50,
                  message: 'Plan name cannot exceed 50 characters'
                }
              })}
            />
            {isEditMode && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Lock className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              </div>
            )}
          </div>
          {errors.name && (
            <p 
              className="mt-1 text-sm"
              style={{ color: colors.semantic.error }}
            >
              {errors.name.message?.toString()}
            </p>
          )}
          {isEditMode && (
            <p 
              className="mt-1 text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Plan name cannot be changed in edit mode
            </p>
          )}
        </div>
        
        {/* Trial Duration */}
        <div>
          <label 
            htmlFor="trialDuration" 
            className="block text-sm font-medium mb-1 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Trial Duration (Days)
          </label>
          <input
            type="number"
            id="trialDuration"
            min="0"
            max="365"
            className="w-full max-w-md px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            {...register('trialDuration', { 
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Trial duration cannot be negative'
              },
              max: {
                value: 365,
                message: 'Trial duration cannot exceed 365 days'
              }
            })}
          />
          {errors.trialDuration && (
            <p 
              className="mt-1 text-sm"
              style={{ color: colors.semantic.error }}
            >
              {errors.trialDuration.message?.toString()}
            </p>
          )}
          <p 
            className="mt-1 text-xs transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Set to 0 for no trial
          </p>
        </div>
        
        {/* Description */}
        <div className="md:col-span-2">
          <label 
            htmlFor="description" 
            className="block text-sm font-medium mb-1 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Description
          </label>
          <textarea
            id="description"
            placeholder="Describe the benefits and features of this plan"
            rows={2}
            className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: errors.description ? colors.semantic.error : `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'Description cannot exceed 500 characters'
              }
            })}
          />
          {errors.description && (
            <p 
              className="mt-1 text-sm"
              style={{ color: colors.semantic.error }}
            >
              {errors.description.message?.toString()}
            </p>
          )}
        </div>
        
        {/* Plan Type */}
        <div>
          <label 
            className="block text-sm font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Plan Type <span style={{ color: colors.semantic.error }}>*</span>
            {isEditMode && <Lock className="inline h-3 w-3 ml-1" style={{ color: colors.utility.secondaryText }} />}
          </label>
          <div className="flex space-x-4">
            {PLAN_TYPES.map((type) => (
              <label key={type} className={`flex items-center space-x-2 ${
                isEditMode ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}>
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    id={`planType-${type}`}
                    value={type}
                    checked={watchPlanType === type}
                    disabled={isEditMode}
                    {...register('planType', {
                      required: !isEditMode ? 'Plan type is required' : false
                    })}
                    className="sr-only"
                  />
                  <div 
                    className="w-4 h-4 rounded-full border-2 transition-colors"
                    style={{
                      borderColor: watchPlanType === type 
                        ? colors.brand.primary 
                        : isEditMode 
                          ? `${colors.utility.secondaryText}50` 
                          : `${colors.utility.secondaryText}40`,
                      backgroundColor: watchPlanType === type ? `${colors.brand.primary}10` : 'transparent'
                    }}
                  >
                    {watchPlanType === type && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: isEditMode ? `${colors.utility.secondaryText}50` : colors.brand.primary
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                <span 
                  className="text-sm transition-colors"
                  style={{
                    color: isEditMode ? colors.utility.secondaryText : colors.utility.primaryText
                  }}
                >
                  {type}
                </span>
              </label>
            ))}
          </div>
          {errors.planType && (
            <p 
              className="mt-1 text-sm"
              style={{ color: colors.semantic.error }}
            >
              {errors.planType.message?.toString()}
            </p>
          )}
          {isEditMode && (
            <p 
              className="mt-1 text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Plan type cannot be changed in edit mode
            </p>
          )}
          
          <div 
            className="mt-2 p-3 rounded-md border transition-colors"
            style={{
              backgroundColor: isEditMode 
                ? `${colors.utility.secondaryText}10` 
                : `${colors.brand.primary}10`,
              borderColor: isEditMode 
                ? `${colors.utility.secondaryText}20` 
                : `${colors.brand.primary}20`
            }}
          >
            {watchPlanType === 'Per User' ? (
              <div className="flex items-start">
                <Info 
                  className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0"
                  style={{
                    color: isEditMode ? colors.utility.secondaryText : colors.brand.primary
                  }}
                />
                <p 
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <span 
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    User-based billing:
                  </span> Customers are billed based on the number of users.
                </p>
              </div>
            ) : (
              <div className="flex items-start">
                <Info 
                  className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0"
                  style={{
                    color: isEditMode ? colors.utility.secondaryText : colors.brand.primary
                  }}
                />
                <p 
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <span 
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Contract-based billing:
                  </span> Customers are billed based on the number of contracts.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Visibility Toggle - Editable in edit mode */}
        <div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <label 
                htmlFor="isVisible"
                className="relative inline-flex items-center cursor-pointer"
              >
                <input 
                  type="checkbox" 
                  id="isVisible" 
                  className="sr-only"
                  checked={watchIsVisible}
                  onChange={(e) => handleVisibilityToggle(e.target.checked)}
                />
                <div 
                  className="w-11 h-6 rounded-full transition-colors"
                  style={{
                    backgroundColor: watchIsVisible ? colors.brand.primary : `${colors.utility.secondaryText}40`
                  }}
                >
                  <div 
                    className="absolute h-5 w-5 rounded-full bg-white transition-transform top-0.5 shadow-sm"
                    style={{
                      transform: watchIsVisible ? 'translateX(1.25rem)' : 'translateX(0.125rem)'
                    }}
                  ></div>
                </div>
                <span 
                  className="ml-3 text-sm font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Visible to Tenants
                </span>
              </label>
            </div>
          </div>
          <p 
            className="mt-1 ml-16 text-xs transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            If enabled, this plan will be visible to tenants for self-service subscription
          </p>
        </div>
        
        {/* Supported Currencies */}
        <div className="md:col-span-2">
          <label 
            className="block text-sm font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Supported Currencies <span style={{ color: colors.semantic.error }}>*</span>
            {isEditMode && <Lock className="inline h-3 w-3 ml-1" style={{ color: colors.utility.secondaryText }} />}
          </label>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {watchSupportedCurrencies.map((code: string) => {
              const currencyInfo = getCurrencyInfo(code);
              const isDefault = code === watchDefaultCurrency;
              
              return (
                <div 
                  key={code}
                  className="flex items-center space-x-1 py-1 pl-3 pr-2 rounded-md"
                  style={{
                    backgroundColor: isDefault 
                      ? (isEditMode ? `${colors.utility.secondaryText}20` : colors.brand.primary)
                      : (isEditMode ? `${colors.utility.secondaryText}10` : `${colors.utility.secondaryText}20`),
                    color: isDefault 
                      ? (isEditMode ? colors.utility.secondaryText : 'white')
                      : colors.utility.primaryText,
                    border: !isDefault ? `1px solid ${colors.utility.secondaryText}40` : 'none'
                  }}
                >
                  <span className="text-sm font-medium">
                    {currencyInfo.symbol} {code} {isDefault && "(Default)"}
                  </span>
                  
                  {!isDefault && !isEditMode && (
                    <button
                      type="button"
                      onClick={() => setDefaultCurrency(code)}
                      className="text-xs px-1.5 py-0.5 rounded transition-colors"
                      style={{
                        backgroundColor: `${colors.utility.secondaryText}20`,
                        color: colors.utility.primaryText
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}20`;
                      }}
                    >
                      Make Default
                    </button>
                  )}
                  
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => removeCurrency(code)}
                      className="p-0.5 rounded-full transition-colors"
                      style={{
                        color: isDefault 
                          ? 'rgba(255,255,255,0.8)' 
                          : colors.utility.secondaryText
                      }}
                      disabled={isDefault}
                      onMouseEnter={(e) => {
                        if (!isDefault) {
                          e.currentTarget.style.color = colors.utility.primaryText;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDefault) {
                          e.currentTarget.style.color = colors.utility.secondaryText;
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* Add Currency Dropdown - Hidden in edit mode */}
            {!isEditMode && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                  className="flex items-center space-x-1 px-3 py-1 rounded-md border transition-colors"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                  }}
                >
                  <span className="text-sm">+ Add Currency</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {currencyDropdownOpen && (
                  <div 
                    className="absolute z-10 mt-1 w-56 rounded-md shadow-lg border overflow-hidden"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}20`
                    }}
                  >
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {getAvailableCurrencies().length === 0 ? (
                        <div 
                          className="px-4 py-2 text-sm"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          All currencies added
                        </div>
                      ) : (
                        getAvailableCurrencies().map((currency) => (
                          <button
                            key={currency.code}
                            type="button"
                            onClick={() => addCurrency(currency.code)}
                            className="flex items-center px-4 py-2 text-sm w-full text-left transition-colors"
                            style={{ color: colors.utility.primaryText }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}10`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span className="mr-2">{currency.symbol}</span>
                            <span>{currency.name}</span>
                            <span 
                              className="ml-1"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              ({currency.code})
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {errors.supportedCurrencies && (
            <p 
              className="mt-1 text-sm"
              style={{ color: colors.semantic.error }}
            >
              {errors.supportedCurrencies.message?.toString()}
            </p>
          )}
          {watchSupportedCurrencies.length === 0 && (
            <p 
              className="mt-1 text-sm"
              style={{ color: colors.semantic.warning || '#F59E0B' }}
            >
              At least one currency must be selected
            </p>
          )}
          {isEditMode && (
            <p 
              className="mt-1 text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Currency settings cannot be changed in edit mode
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
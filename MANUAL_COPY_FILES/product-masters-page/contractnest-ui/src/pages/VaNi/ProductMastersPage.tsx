// src/pages/VaNi/toolkit/ProductMastersPage.tsx
// Product Masters - Read-Only View
// Glassmorphic Design (matching LOV page)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, ChevronRight, Info } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import {
  useGlobalCategories,
  useGlobalMasterData,
  type CategoryMaster,
  type CategoryDetail
} from '@/hooks/queries/useProductMasterdata';

const ProductMastersPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  // Fetch global categories
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useGlobalCategories(true);

  // Fetch category details when a category is selected
  const {
    data: detailsResponse,
    isLoading: detailsLoading,
    error: detailsError
  } = useGlobalMasterData(selectedCategoryName, true);

  const categories = categoriesResponse?.data || [];
  const categoryDetails = detailsResponse?.data || [];

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView('vani/toolkit/product-masters', 'Product Masters');
  }, []);

  // Auto-select first category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      const firstCategory = categories[0];
      setSelectedCategory(firstCategory.id);
      setSelectedCategoryName(firstCategory.category_name);
    }
  }, [categories, selectedCategory]);

  const handleCategoryChange = (category: CategoryMaster) => {
    setSelectedCategory(category.id);
    setSelectedCategoryName(category.category_name);

    try {
      analyticsService.trackPageView(
        `vani/toolkit/product-masters/${category.category_name}`,
        'Product Masters - Category Change'
      );
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Loading state - Glassmorphic
  if (categoriesLoading) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brand.primary }} />
          </div>
          <div className="flex gap-6">
            <div
              className="w-64 h-64 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
            <div
              className="flex-1 h-96 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (categoriesError) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
            }}
          >
            <p style={{ color: colors.semantic.error }}>
              Failed to load categories. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Glassmorphic Header */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/vani/toolkit')}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
              </button>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)`
                }}
              >
                <Package className="h-6 w-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                  Product Masters
                </h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  View global product master data categories and values
                </p>
              </div>
            </div>
            {/* Read-only badge */}
            <div
              className="px-3 py-1.5 rounded-lg flex items-center gap-2"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <Info className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Read-only
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Category list - Glassmorphic */}
          <div className="w-72 shrink-0">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{
                  borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
              >
                <h3 className="font-medium text-sm" style={{ color: colors.utility.secondaryText }}>
                  Categories ({categories.length})
                </h3>
              </div>
              {categories.length > 0 ? (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                  {categories.map((category, index) => {
                    const isSelected = selectedCategory === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-all duration-300 flex items-center justify-between group",
                          isSelected
                            ? "font-medium"
                            : "hover:bg-opacity-50"
                        )}
                        style={{
                          borderBottom: index < categories.length - 1
                            ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                            : 'none',
                          backgroundColor: isSelected
                            ? colors.brand.primary
                            : 'transparent',
                          color: isSelected
                            ? '#FFFFFF'
                            : colors.utility.primaryText
                        }}
                      >
                        <span className="truncate">{category.category_name}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="p-4 text-center"
                  style={{ color: colors.utility.secondaryText }}
                >
                  No categories found.
                </div>
              )}
            </div>
          </div>

          {/* Details Area - Glassmorphic */}
          <div className="flex-1">
            {selectedCategory ? (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
                }}
              >
                {/* Category Title */}
                <div
                  className="px-6 py-4 border-b flex justify-between items-center"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                      {selectedCategoryName}
                    </h2>
                    {detailsLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.brand.primary }} />
                    )}
                  </div>
                  <span
                    className="text-sm px-2 py-1 rounded-md"
                    style={{
                      color: colors.utility.secondaryText,
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}
                  >
                    {categoryDetails.length} values
                  </span>
                </div>

                {/* Content Area */}
                <div className="p-6">
                  {/* Column Headers */}
                  <div
                    className="rounded-xl mb-4"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                    }}
                  >
                    <div className="grid grid-cols-4 gap-4 px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Value
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Display Name
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Description
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Sequence
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {detailsLoading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-xl animate-pulse h-14"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                          }}
                        />
                      ))
                    ) : detailsError ? (
                      // Error state
                      <div
                        className="rounded-xl p-8 text-center"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: `1px dashed ${colors.semantic.error}40`
                        }}
                      >
                        <p style={{ color: colors.semantic.error }}>
                          Failed to load category details.
                        </p>
                      </div>
                    ) : categoryDetails.length > 0 ? (
                      // Data rows
                      categoryDetails.map((detail) => (
                        <div
                          key={detail.id}
                          className="rounded-xl transition-all hover:scale-[1.01]"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                          }}
                        >
                          <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center">
                            <div
                              className="font-medium truncate"
                              style={{ color: colors.utility.primaryText }}
                              title={detail.detail_value}
                            >
                              {detail.detail_value}
                            </div>
                            <div
                              className="truncate"
                              style={{ color: colors.utility.primaryText }}
                              title={detail.detail_name}
                            >
                              {detail.detail_name || '-'}
                            </div>
                            <div
                              className="truncate text-sm"
                              style={{ color: colors.utility.secondaryText }}
                              title={detail.description || ''}
                            >
                              {detail.description || '-'}
                            </div>
                            <div
                              style={{ color: colors.utility.primaryText }}
                            >
                              {detail.sequence_no}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Empty state
                      <div
                        className="rounded-xl p-8 text-center"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: `1px dashed ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                        }}
                      >
                        <p style={{ color: colors.utility.secondaryText }}>
                          No values found for this category.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
                }}
              >
                <p style={{ color: colors.utility.secondaryText }}>
                  Select a category from the left to view its values.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductMastersPage;

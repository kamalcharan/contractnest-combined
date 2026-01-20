//src/components/businessmodel/dashboard/PlanList.tsx
// UPDATED: Removed search bar, added pagination

import React, { useState, useMemo } from 'react';
import { Eye, Archive, Tag, Calendar, Users, FileText, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export interface PricingPlanSummary {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  planType: 'Per User' | 'Per Contract';
  userCount: number;
  featuresCount: number;
  lastUpdated: string;
  productCode?: string;
  productName?: string;
}

interface PlanListProps {
  plans: PricingPlanSummary[];
  onViewPlan: (planId: string) => void;
  onArchivePlan: (planId: string) => void;
  isLoading?: boolean;
  pageSize?: number;
}

const PlanList: React.FC<PlanListProps> = ({
  plans,
  onViewPlan,
  onArchivePlan,
  isLoading = false,
  pageSize = 10
}) => {
  const [filterActive, setFilterActive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Filter plans based on active filter only (product filter handled by parent)
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesActiveFilter = filterActive ? plan.isActive : true;
      return matchesActiveFilter;
    });
  }, [plans, filterActive]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlans.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPlans = filteredPlans.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterActive, plans]);

  // Page navigation handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div
            key={i}
            className="rounded-lg p-6 animate-pulse"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`
            }}
          >
            <div className="flex justify-between">
              <div className="space-y-2">
                <div
                  className="h-6 rounded w-48"
                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                ></div>
                <div
                  className="h-4 rounded w-24"
                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                ></div>
              </div>
              <div
                className="h-8 rounded w-20"
                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
              ></div>
            </div>
            <div className="mt-4 flex space-x-6">
              <div
                className="h-4 rounded w-24"
                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
              ></div>
              <div
                className="h-4 rounded w-24"
                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
              ></div>
              <div
                className="h-4 rounded w-40"
                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render no plans found
  if (filteredPlans.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}20`
        }}
      >
        <FileText
          className="h-12 w-12 mx-auto opacity-50 mb-4"
          style={{ color: colors.utility.secondaryText }}
        />
        <h3
          className="text-lg font-medium"
          style={{ color: colors.utility.primaryText }}
        >
          No Plans Found
        </h3>
        <p
          className="mt-2 mb-4"
          style={{ color: colors.utility.secondaryText }}
        >
          No plans match your filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active filter only */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="filter-active"
            checked={filterActive}
            onChange={() => setFilterActive(!filterActive)}
            className="h-4 w-4 rounded focus:ring-2"
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              '--tw-ring-color': colors.brand.primary,
              accentColor: colors.brand.primary
            } as React.CSSProperties}
          />
          <label
            htmlFor="filter-active"
            className="ml-2 text-sm transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Show active plans only
          </label>
        </div>

        {/* Results count */}
        <div
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          Showing {startIndex + 1}-{Math.min(endIndex, filteredPlans.length)} of {filteredPlans.length} plans
        </div>
      </div>

      {/* Plans list */}
      <div className="space-y-4">
        {paginatedPlans.map(plan => (
          <div
            key={plan.id}
            className="rounded-lg p-6"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`
            }}
          >
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className="text-lg font-semibold transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {plan.name}
                  </h3>
                  <div
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.secondaryText
                    }}
                  >
                    v{plan.version}
                  </div>
                  <div
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: plan.isActive
                        ? `${colors.semantic.success}20`
                        : `${colors.semantic.error}20`,
                      color: plan.isActive
                        ? colors.semantic.success
                        : colors.semantic.error
                    }}
                  >
                    {plan.isActive ? 'active' : 'inactive'}
                  </div>
                  {/* Product Badge */}
                  {plan.productName && (
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: `${colors.brand.primary}15`,
                        color: colors.brand.primary
                      }}
                    >
                      <Package className="h-3 w-3" />
                      {plan.productName}
                    </div>
                  )}
                </div>

                <div className="text-sm mt-1">
                  <span
                    className="inline-flex items-center transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <Tag className="h-3.5 w-3.5 mr-1" />
                    {plan.planType}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onViewPlan(plan.id)}
                  className="px-3 py-1.5 rounded-md border text-sm flex items-center transition-colors hover:opacity-80"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>

                <button
                  onClick={() => onArchivePlan(plan.id)}
                  className="px-3 py-1.5 rounded-md border text-sm flex items-center transition-colors hover:opacity-80"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                  }}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div
                className="flex items-center transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <Users className="h-4 w-4 mr-2" />
                {plan.userCount} active users
              </div>

              <div
                className="flex items-center transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <FileText className="h-4 w-4 mr-2" />
                {plan.featuresCount} features
              </div>

              <div
                className="flex items-center transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Last updated: {plan.lastUpdated}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-2 pt-4 border-t"
          style={{ borderColor: `${colors.utility.primaryText}10` }}
        >
          {/* Previous Button */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: currentPage === 1 ? 'transparent' : `${colors.brand.primary}10`,
              color: colors.brand.primary
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span
                    className="px-2 py-1 text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => goToPage(page as number)}
                    className="min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: currentPage === page
                        ? colors.brand.primary
                        : 'transparent',
                      color: currentPage === page
                        ? '#ffffff'
                        : colors.utility.primaryText
                    }}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: currentPage === totalPages ? 'transparent' : `${colors.brand.primary}10`,
              color: colors.brand.primary
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanList;

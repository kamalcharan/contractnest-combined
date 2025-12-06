//src/components/businessmodel/dashboard/PlanList.tsx

import React, { useState, useMemo } from 'react';
import { Eye, Archive, Tag, Calendar, Users, FileText, Package } from 'lucide-react';
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
}

const PlanList: React.FC<PlanListProps> = ({
  plans,
  onViewPlan,
  onArchivePlan,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get unique products for filter dropdown
  const availableProducts = useMemo(() => {
    const products = new Map<string, string>();
    plans.forEach(plan => {
      if (plan.productCode && plan.productName) {
        products.set(plan.productCode, plan.productName);
      }
    });
    return Array.from(products.entries());
  }, [plans]);

  // Filter plans based on search, active filter, and product filter
  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActiveFilter = filterActive ? plan.isActive : true;
    const matchesProductFilter = filterProduct === 'all' || plan.productCode === filterProduct;
    return matchesSearch && matchesActiveFilter && matchesProductFilter;
  });
  
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
          {searchTerm 
            ? 'No plans match your search criteria.' 
            : 'You haven\'t created any pricing plans yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4"
              style={{ color: colors.utility.secondaryText }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
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

        {/* Product Filter */}
        {availableProducts.length > 0 && (
          <div className="flex items-center gap-2">
            <Package
              className="h-4 w-4"
              style={{ color: colors.utility.secondaryText }}
            />
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: `${colors.utility.secondaryText}40`,
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
            >
              <option value="all">All Products</option>
              {availableProducts.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Plans list */}
      <div className="space-y-4">
        {filteredPlans.map(plan => (
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
    </div>
  );
};

export default PlanList;
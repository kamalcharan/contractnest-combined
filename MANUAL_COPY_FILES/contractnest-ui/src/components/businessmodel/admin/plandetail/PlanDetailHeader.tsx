// src/components/businessmodel/admin/plandetail/PlanDetailHeader.tsx

import React from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface PlanDetailHeaderProps {
  planName: string;
  planDescription?: string;
  isVisible?: boolean;
  isArchived?: boolean;
  isLive: boolean;
  productName?: string;
  onBack: () => void;
}

const PlanDetailHeader: React.FC<PlanDetailHeaderProps> = ({
  planName,
  planDescription,
  isVisible,
  isArchived,
  isLive,
  productName,
  onBack
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Determine status badge
  const getStatusBadge = () => {
    if (isArchived) {
      return (
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.utility.primaryBackground + '80',
            color: colors.utility.secondaryText
          }}
        >
          Archived
        </span>
      );
    }
    
    if (isVisible) {
      return (
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.semantic.success + '20',
            color: colors.semantic.success
          }}
        >
          Visible
        </span>
      );
    }
    
    return (
      <span 
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: (colors.semantic.warning || '#f59e0b') + '20',
          color: colors.semantic.warning || '#f59e0b'
        }}
      >
        Hidden
      </span>
    );
  };

  // Environment badge
  const getEnvironmentBadge = () => (
    <div 
      className="inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors"
      style={{
        backgroundColor: isLive 
          ? colors.semantic.success + '20' 
          : (colors.semantic.warning || '#f59e0b') + '20',
        color: isLive 
          ? colors.semantic.success 
          : colors.semantic.warning || '#f59e0b'
      }}
    >
      <div 
        className="w-2 h-2 rounded-full mr-2"
        style={{
          backgroundColor: isLive 
            ? colors.semantic.success 
            : colors.semantic.warning || '#f59e0b'
        }}
      ></div>
      {isLive ? 'Live Environment' : 'Test Environment'}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center">
        <button 
          onClick={onBack} 
          className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
          type="button"
          aria-label="Go back to plans list"
        >
          <ArrowLeft 
            className="h-5 w-5 transition-colors" 
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div className="flex-1">
          <div className="flex items-center">
            <h1 
              className="text-2xl font-bold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              {planName}
            </h1>
            <div className="ml-4 flex items-center gap-2">
              {getStatusBadge()}
              {/* Product Badge */}
              {productName && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: colors.brand.primary + '15',
                    color: colors.brand.primary
                  }}
                >
                  <Package className="h-3 w-3" />
                  {productName}
                </span>
              )}
            </div>
          </div>
          {planDescription && (
            <p 
              className="mt-1 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {planDescription}
            </p>
          )}
        </div>
      </div>
      
      {/* Environment Badge */}
      <div>
        {getEnvironmentBadge()}
      </div>
    </div>
  );
};

export default PlanDetailHeader;
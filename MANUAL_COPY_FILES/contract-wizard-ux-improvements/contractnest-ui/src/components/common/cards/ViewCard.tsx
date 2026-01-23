// src/components/common/cards/ViewCard.tsx
// Shared ViewCard component with enhanced UX styling
// Used in: ContactSummaryTab, BuyerSelectionStep, and other card-based views

import React from 'react';
import { Edit, Plus, ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface ViewCardProps {
  title: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  onEdit?: () => void;
  onAdd?: () => void;
  onMoreClick?: () => void;
  children: React.ReactNode;
  count?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
  addLabel?: string;
  moreLabel?: string;
  variant?: 'default' | 'compact' | 'elevated';
  className?: string;
}

export const ViewCard: React.FC<ViewCardProps> = ({
  title,
  icon,
  iconBg,
  iconColor,
  onEdit,
  onAdd,
  onMoreClick,
  children,
  count,
  emptyMessage = 'No items',
  isEmpty = false,
  addLabel = 'Add',
  moreLabel,
  variant = 'default',
  className = ''
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Glass morphism style with theme support
  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.85)'
      : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)',
  };

  // Variant styles
  const variantStyles = {
    default: 'rounded-xl border p-4',
    compact: 'rounded-lg border p-3',
    elevated: 'rounded-xl border p-4 shadow-lg'
  };

  // Default icon background if not provided
  const defaultIconBg = iconBg || `${colors.brand.primary}20`;

  return (
    <div
      className={`${variantStyles[variant]} transition-all hover:shadow-md ${className}`}
      style={glassStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div
            className="p-1.5 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: defaultIconBg }}
          >
            {icon}
          </div>

          {/* Title */}
          <span
            className="text-sm font-semibold"
            style={{ color: colors.utility.primaryText }}
          >
            {title}
          </span>

          {/* Count Badge */}
          {count !== undefined && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: defaultIconBg,
                color: iconColor || colors.utility.primaryText
              }}
            >
              {count}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onAdd && (
            <button
              onClick={onAdd}
              className="p-1.5 rounded-lg hover:opacity-70 transition-all flex items-center gap-1 text-xs font-medium"
              style={{
                backgroundColor: `${colors.brand.primary}15`,
                color: colors.brand.primary
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:opacity-70 transition-colors"
              style={{
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(0,0,0,0.05)'
              }}
            >
              <Edit className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
        {isEmpty ? (
          <div className="py-4 text-center">
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {emptyMessage}
            </p>
            {onAdd && (
              <button
                onClick={onAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${colors.brand.primary}15`,
                  color: colors.brand.primary
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {addLabel}
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>

      {/* More Link */}
      {onMoreClick && moreLabel && !isEmpty && (
        <button
          onClick={onMoreClick}
          className="mt-3 flex items-center gap-1 text-xs font-medium hover:underline transition-colors"
          style={{ color: iconColor || colors.brand.primary }}
        >
          {moreLabel}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default ViewCard;

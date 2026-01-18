// src/components/subscription/data-viz/DataCategoryCard.tsx
// Expandable category card for data summary preview

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Users,
  UserPlus,
  FileText,
  Package,
  Settings,
  CreditCard,
  Database,
  LucideIcon
} from 'lucide-react';
import { TenantDataCategory } from '../../../types/tenantManagement';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedCounter } from './AnimatedCounter';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Users,
  UserPlus,
  FileText,
  Package,
  Settings,
  CreditCard,
  Database
};

interface DataCategoryCardProps {
  category: TenantDataCategory;
  index: number;
  totalCategories: number;
  expanded?: boolean;
  onToggle?: () => void;
}

export const DataCategoryCard: React.FC<DataCategoryCardProps> = ({
  category,
  index,
  totalCategories,
  expanded = false,
  onToggle
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isExpanded, setIsExpanded] = useState(expanded);

  const Icon = iconMap[category.icon] || Database;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  // Calculate percentage of total (for progress bar width)
  // This would need total from parent, simplified here
  const barWidth = Math.min(100, Math.max(10, (category.totalCount / 100) * 50 + 20));

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.6)'
          : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        animationDelay: `${index * 50}ms`
      }}
    >
      {/* Header - Always visible */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-opacity-50 transition-colors"
        style={{
          background: isExpanded
            ? isDarkMode
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.02)'
            : 'transparent'
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `${category.color}20`,
          }}
        >
          <Icon size={20} style={{ color: category.color }} />
        </div>

        {/* Label & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className="font-medium text-sm"
              style={{ color: colors.utility.primaryText }}
            >
              {category.label}
            </span>
            <AnimatedCounter
              value={category.totalCount}
              className="text-lg"
              highlightColor={category.color}
            />
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full mt-2 overflow-hidden"
            style={{
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${barWidth}%`,
                background: `linear-gradient(90deg, ${category.color}, ${category.color}80)`
              }}
            />
          </div>
        </div>

        {/* Expand icon */}
        <div
          className="p-1.5 rounded-lg transition-colors"
          style={{
            background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
          }}
        >
          {isExpanded ? (
            <ChevronUp size={16} style={{ color: colors.utility.secondaryText }} />
          ) : (
            <ChevronDown size={16} style={{ color: colors.utility.secondaryText }} />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-2 space-y-2"
          style={{
            borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`
          }}
        >
          <p
            className="text-xs mb-3"
            style={{ color: colors.utility.secondaryText }}
          >
            {category.description}
          </p>

          {category.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg"
              style={{
                background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
              }}
            >
              <span
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                {item.label}
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: colors.utility.primaryText }}
              >
                {item.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataCategoryCard;

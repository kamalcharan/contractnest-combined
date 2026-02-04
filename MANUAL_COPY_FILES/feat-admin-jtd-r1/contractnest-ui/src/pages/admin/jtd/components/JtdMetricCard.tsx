// src/pages/admin/jtd/components/JtdMetricCard.tsx
// Reusable metric card for admin JTD dashboards

import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { LucideIcon } from 'lucide-react';

interface JtdMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  alert?: boolean;
  onClick?: () => void;
}

export const JtdMetricCard: React.FC<JtdMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = '#3B82F6',
  trend,
  trendValue,
  alert = false,
  onClick,
}) => {
  const { colors } = useTheme();

  return (
    <div
      className={`rounded-xl p-5 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${alert ? 'ring-2 ring-red-400/50' : ''}`}
      style={{
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${alert ? '#EF4444' : colors.utility.divider}`,
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconColor + '15' }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {trend && trendValue && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280',
              backgroundColor: trend === 'up' ? '#D1FAE5' : trend === 'down' ? '#FEE2E2' : '#F3F4F6',
            }}
          >
            {trendValue}
          </span>
        )}
      </div>
      <div
        className="text-2xl font-bold mb-1"
        style={{ color: colors.utility.primaryText }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div
        className="text-sm font-medium"
        style={{ color: colors.utility.secondaryText }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          className="text-xs mt-1"
          style={{ color: colors.utility.tertiaryText }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

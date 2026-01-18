// src/components/subscription/cards/StatCard.tsx
// Glassmorphism stat card with animated counter and trend indicator

import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  onClick?: () => void;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animateValue?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor,
  trend,
  trendValue,
  onClick,
  isActive = false,
  size = 'md',
  animateValue = true
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [displayValue, setDisplayValue] = useState(animateValue ? 0 : value);

  // Animate the counter on mount
  useEffect(() => {
    if (!animateValue) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000; // 1 second
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(stepValue * step), value);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animateValue]);

  const sizeStyles = {
    sm: { padding: 'p-3', valueText: 'text-xl', labelText: 'text-xs', iconSize: 20 },
    md: { padding: 'p-4', valueText: 'text-2xl', labelText: 'text-sm', iconSize: 24 },
    lg: { padding: 'p-5', valueText: 'text-3xl', labelText: 'text-base', iconSize: 28 }
  };

  const styles = sizeStyles[size];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280';

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border transition-all duration-300
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${isActive ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        background: isDarkMode
          ? isActive
            ? `linear-gradient(135deg, ${colors.brand.primary}30 0%, ${colors.brand.secondary}20 100%)`
            : 'rgba(30, 41, 59, 0.8)'
          : isActive
            ? `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`
            : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderColor: isActive
          ? colors.brand.primary
          : isDarkMode
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.5)',
        boxShadow: isActive
          ? `0 8px 32px -8px ${colors.brand.primary}40`
          : '0 4px 20px -5px rgba(0,0,0,0.05)',
        '--tw-ring-color': colors.brand.primary
      } as React.CSSProperties}
    >
      <div className={styles.padding}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p
              className={`${styles.labelText} font-medium mb-1`}
              style={{ color: colors.utility.secondaryText }}
            >
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={`${styles.valueText} font-bold tabular-nums`}
                style={{ color: colors.utility.primaryText }}
              >
                {displayValue.toLocaleString()}
              </span>
              {trend && trendValue !== undefined && (
                <div className="flex items-center gap-0.5">
                  <TrendIcon size={14} style={{ color: trendColor }} />
                  <span className="text-xs font-medium" style={{ color: trendColor }}>
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div
            className="rounded-xl p-3 transition-transform duration-300 group-hover:scale-110"
            style={{
              background: isDarkMode
                ? `${iconColor || colors.brand.primary}25`
                : `${iconColor || colors.brand.primary}15`,
            }}
          >
            <Icon
              size={styles.iconSize}
              style={{ color: iconColor || colors.brand.primary }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;

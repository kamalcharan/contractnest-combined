// src/components/subscription/badges/SubscriptionStatusBadge.tsx
// Glassmorphism badge for subscription status

import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Pause,
  Timer
} from 'lucide-react';
import { SubscriptionStatus } from '../../../types/tenantManagement';
import { useTheme } from '../../../contexts/ThemeContext';

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  daysUntilExpiry?: number;
}

const statusConfig: Record<SubscriptionStatus, {
  label: string;
  icon: React.ElementType;
  lightBg: string;
  darkBg: string;
  textColor: string;
  iconColor: string;
}> = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    lightBg: 'rgba(16, 185, 129, 0.15)',
    darkBg: 'rgba(16, 185, 129, 0.25)',
    textColor: '#059669',
    iconColor: '#10B981'
  },
  trial: {
    label: 'Trial',
    icon: Timer,
    lightBg: 'rgba(245, 158, 11, 0.15)',
    darkBg: 'rgba(245, 158, 11, 0.25)',
    textColor: '#D97706',
    iconColor: '#F59E0B'
  },
  grace_period: {
    label: 'Grace Period',
    icon: Clock,
    lightBg: 'rgba(251, 146, 60, 0.15)',
    darkBg: 'rgba(251, 146, 60, 0.25)',
    textColor: '#EA580C',
    iconColor: '#FB923C'
  },
  suspended: {
    label: 'Suspended',
    icon: Pause,
    lightBg: 'rgba(239, 68, 68, 0.15)',
    darkBg: 'rgba(239, 68, 68, 0.25)',
    textColor: '#DC2626',
    iconColor: '#EF4444'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    lightBg: 'rgba(107, 114, 128, 0.15)',
    darkBg: 'rgba(107, 114, 128, 0.25)',
    textColor: '#4B5563',
    iconColor: '#6B7280'
  },
  expired: {
    label: 'Expired',
    icon: AlertTriangle,
    lightBg: 'rgba(220, 38, 38, 0.15)',
    darkBg: 'rgba(220, 38, 38, 0.25)',
    textColor: '#B91C1C',
    iconColor: '#DC2626'
  }
};

const sizeConfig = {
  sm: { padding: 'px-2 py-0.5', text: 'text-xs', icon: 12, gap: 'gap-1' },
  md: { padding: 'px-3 py-1', text: 'text-sm', icon: 14, gap: 'gap-1.5' },
  lg: { padding: 'px-4 py-1.5', text: 'text-base', icon: 16, gap: 'gap-2' }
};

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'md',
  daysUntilExpiry
}) => {
  const { isDarkMode } = useTheme();
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const showExpiryWarning = status === 'trial' && daysUntilExpiry !== undefined && daysUntilExpiry <= 7;

  return (
    <div
      className={`inline-flex items-center ${sizeStyles.gap} ${sizeStyles.padding} rounded-full font-medium transition-all duration-200`}
      style={{
        background: isDarkMode ? config.darkBg : config.lightBg,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
        color: config.textColor
      }}
    >
      <Icon
        size={sizeStyles.icon}
        style={{ color: config.iconColor }}
        className="flex-shrink-0"
      />
      {showLabel && (
        <span className={sizeStyles.text}>
          {config.label}
          {showExpiryWarning && (
            <span className="ml-1 opacity-80">
              ({daysUntilExpiry}d left)
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default SubscriptionStatusBadge;

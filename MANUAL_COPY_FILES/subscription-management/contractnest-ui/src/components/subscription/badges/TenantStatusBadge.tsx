// src/components/subscription/badges/TenantStatusBadge.tsx
// Glassmorphism badge for tenant account status

import React from 'react';
import {
  CheckCircle2,
  CircleSlash,
  ShieldOff,
  XOctagon
} from 'lucide-react';
import { TenantStatus } from '../../../types/tenantManagement';
import { useTheme } from '../../../contexts/ThemeContext';

interface TenantStatusBadgeProps {
  status: TenantStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<TenantStatus, {
  label: string;
  icon: React.ElementType;
  lightBg: string;
  darkBg: string;
  textColor: string;
  iconColor: string;
}> = {
  active: {
    label: 'Active',
    icon: CheckCircle2,
    lightBg: 'rgba(16, 185, 129, 0.15)',
    darkBg: 'rgba(16, 185, 129, 0.25)',
    textColor: '#059669',
    iconColor: '#10B981'
  },
  inactive: {
    label: 'Inactive',
    icon: CircleSlash,
    lightBg: 'rgba(107, 114, 128, 0.15)',
    darkBg: 'rgba(107, 114, 128, 0.25)',
    textColor: '#4B5563',
    iconColor: '#6B7280'
  },
  suspended: {
    label: 'Suspended',
    icon: ShieldOff,
    lightBg: 'rgba(239, 68, 68, 0.15)',
    darkBg: 'rgba(239, 68, 68, 0.25)',
    textColor: '#DC2626',
    iconColor: '#EF4444'
  },
  closed: {
    label: 'Closed',
    icon: XOctagon,
    lightBg: 'rgba(55, 65, 81, 0.15)',
    darkBg: 'rgba(55, 65, 81, 0.35)',
    textColor: '#374151',
    iconColor: '#6B7280'
  }
};

const sizeConfig = {
  sm: { padding: 'px-2 py-0.5', text: 'text-xs', icon: 12, gap: 'gap-1' },
  md: { padding: 'px-3 py-1', text: 'text-sm', icon: 14, gap: 'gap-1.5' },
  lg: { padding: 'px-4 py-1.5', text: 'text-base', icon: 16, gap: 'gap-2' }
};

export const TenantStatusBadge: React.FC<TenantStatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'md'
}) => {
  const { isDarkMode } = useTheme();
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

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
        <span className={sizeStyles.text}>{config.label}</span>
      )}
    </div>
  );
};

export default TenantStatusBadge;

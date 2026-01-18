// src/components/subscription/badges/TenantTypeBadge.tsx
// Glassmorphism badge for tenant type (Buyer/Seller/Mixed)

import React from 'react';
import {
  ShoppingCart,
  Store,
  ArrowLeftRight,
  HelpCircle
} from 'lucide-react';
import { TenantType } from '../../../types/tenantManagement';
import { useTheme } from '../../../contexts/ThemeContext';

interface TenantTypeBadgeProps {
  type: TenantType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  buyerPercent?: number;
  sellerPercent?: number;
}

const typeConfig: Record<TenantType, {
  label: string;
  icon: React.ElementType;
  lightBg: string;
  darkBg: string;
  textColor: string;
  iconColor: string;
}> = {
  buyer: {
    label: 'Buyer',
    icon: ShoppingCart,
    lightBg: 'rgba(59, 130, 246, 0.15)',
    darkBg: 'rgba(59, 130, 246, 0.25)',
    textColor: '#2563EB',
    iconColor: '#3B82F6'
  },
  seller: {
    label: 'Seller',
    icon: Store,
    lightBg: 'rgba(168, 85, 247, 0.15)',
    darkBg: 'rgba(168, 85, 247, 0.25)',
    textColor: '#7C3AED',
    iconColor: '#A855F7'
  },
  mixed: {
    label: 'Mixed',
    icon: ArrowLeftRight,
    lightBg: 'rgba(20, 184, 166, 0.15)',
    darkBg: 'rgba(20, 184, 166, 0.25)',
    textColor: '#0D9488',
    iconColor: '#14B8A6'
  },
  unknown: {
    label: 'Unknown',
    icon: HelpCircle,
    lightBg: 'rgba(107, 114, 128, 0.15)',
    darkBg: 'rgba(107, 114, 128, 0.25)',
    textColor: '#4B5563',
    iconColor: '#6B7280'
  }
};

const sizeConfig = {
  sm: { padding: 'px-2 py-0.5', text: 'text-xs', icon: 12, gap: 'gap-1' },
  md: { padding: 'px-3 py-1', text: 'text-sm', icon: 14, gap: 'gap-1.5' },
  lg: { padding: 'px-4 py-1.5', text: 'text-base', icon: 16, gap: 'gap-2' }
};

export const TenantTypeBadge: React.FC<TenantTypeBadgeProps> = ({
  type,
  showLabel = true,
  size = 'md',
  buyerPercent,
  sellerPercent
}) => {
  const { isDarkMode } = useTheme();
  const config = typeConfig[type];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const showPercentage = type === 'buyer' && buyerPercent !== undefined;

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
          {showPercentage && (
            <span className="ml-1 opacity-70">
              {buyerPercent}%
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default TenantTypeBadge;

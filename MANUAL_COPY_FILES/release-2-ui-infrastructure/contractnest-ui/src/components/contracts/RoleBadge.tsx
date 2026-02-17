// src/components/contracts/RoleBadge.tsx
// Displays the current tenant's role on a contract as a colored badge

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useContractRole, type ContractRole } from '@/hooks/useContractRole';
import type { Contract } from '@/types/contracts';

// =================================================================
// STYLE MAP
// =================================================================

const ROLE_STYLES: Record<ContractRole, { bg: string; text: string; border: string; icon: string }> = {
  seller: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: '↗',
  },
  buyer: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '↙',
  },
  viewer: {
    bg: 'bg-gray-50 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    icon: '👁',
  },
  unknown: {
    bg: 'bg-gray-50 dark:bg-gray-800/40',
    text: 'text-gray-500 dark:text-gray-500',
    border: 'border-gray-200 dark:border-gray-700',
    icon: '?',
  },
};

// =================================================================
// PROPS
// =================================================================

interface RoleBadgeProps {
  /** Contract to determine role for */
  contract: Contract | null | undefined;
  /** Show the directional icon (default: true) */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// =================================================================
// COMPONENT
// =================================================================

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  contract,
  showIcon = true,
  className,
  size = 'sm',
}) => {
  const { role, roleLabel } = useContractRole(contract);

  if (role === 'unknown') return null;

  const style = ROLE_STYLES[role];

  return (
    <Badge
      variant="outline"
      className={cn(
        style.bg,
        style.text,
        style.border,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2.5 py-0.5',
        'font-medium',
        className
      )}
    >
      {showIcon && <span className="mr-1">{style.icon}</span>}
      {roleLabel}
    </Badge>
  );
};

export default RoleBadge;

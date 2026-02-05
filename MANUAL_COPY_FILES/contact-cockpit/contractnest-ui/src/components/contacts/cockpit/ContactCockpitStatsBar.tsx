// src/components/contacts/cockpit/ContactCockpitStatsBar.tsx
// Cockpit Stats Bar - Top row showing LTV, Contracts, Events, Health Score

import React from 'react';
import {
  TrendingUp,
  FileText,
  Calendar,
  Heart,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ContactCockpitData } from '@/types/contactCockpit';

interface ContactCockpitStatsBarProps {
  data: ContactCockpitData | undefined;
  isLoading: boolean;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  highlight?: boolean;
  highlightColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  color,
  bgColor,
  highlight,
  highlightColor,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl p-4
        border transition-all duration-200
        hover:shadow-md hover:scale-[1.02]
        ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}
      `}
      style={{
        borderLeftWidth: highlight ? '4px' : '1px',
        borderLeftColor: highlight ? highlightColor : undefined,
      }}
    >
      {/* Background gradient accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 opacity-10 rounded-full -mr-6 -mt-6"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {label}
          </p>
          <p className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </p>
          {subValue && (
            <p className={`text-xs mt-1 ${
              highlight
                ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
            }`}>
              {subValue}
            </p>
          )}
        </div>
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: bgColor }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => {
  const { isDarkMode } = useTheme();
  const skeletonBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`rounded-xl p-4 border animate-pulse ${
            isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className={`h-3 w-16 rounded ${skeletonBg} mb-2`} />
              <div className={`h-7 w-20 rounded ${skeletonBg} mb-1`} />
              <div className={`h-3 w-24 rounded ${skeletonBg}`} />
            </div>
            <div className={`w-10 h-10 rounded-lg ${skeletonBg}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ContactCockpitStatsBar: React.FC<ContactCockpitStatsBarProps> = ({
  data,
  isLoading,
  className = '',
}) => {
  const { isDarkMode } = useTheme();

  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Format LTV
  const formatCurrency = (value: number): string => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  // Get health score color
  const getHealthColor = (score: number): { color: string; bgColor: string; label: string } => {
    if (score >= 80) {
      return {
        color: '#10B981',
        bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
        label: 'Excellent',
      };
    } else if (score >= 60) {
      return {
        color: '#F59E0B',
        bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
        label: 'Good',
      };
    } else if (score >= 40) {
      return {
        color: '#F97316',
        bgColor: isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
        label: 'Needs Attention',
      };
    }
    return {
      color: '#EF4444',
      bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
      label: 'Critical',
    };
  };

  const healthInfo = getHealthColor(data.health_score);
  const hasOverdue = data.events.overdue > 0;
  const activeContracts = data.contracts.by_status?.active || 0;
  const draftContracts = data.contracts.by_status?.draft || 0;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* LTV */}
        <StatCard
          label="Lifetime Value"
          value={formatCurrency(data.ltv)}
          subValue={`${data.contracts.total} contracts total`}
          icon={<TrendingUp className="h-5 w-5" style={{ color: '#6366F1' }} />}
          color="#6366F1"
          bgColor={isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'}
        />

        {/* Contracts */}
        <StatCard
          label="Contracts"
          value={`${activeContracts} Active`}
          subValue={draftContracts > 0 ? `${draftContracts} in draft` : 'All up to date'}
          icon={<FileText className="h-5 w-5" style={{ color: '#059669' }} />}
          color="#059669"
          bgColor={isDarkMode ? 'rgba(5, 150, 105, 0.2)' : 'rgba(5, 150, 105, 0.1)'}
        />

        {/* Events */}
        <StatCard
          label="Events"
          value={`${data.events.total - data.events.completed} Pending`}
          subValue={hasOverdue ? `${data.events.overdue} OVERDUE` : `${data.upcoming_events.length} upcoming`}
          icon={
            hasOverdue
              ? <AlertTriangle className="h-5 w-5" style={{ color: '#EF4444' }} />
              : <Calendar className="h-5 w-5" style={{ color: '#2563EB' }} />
          }
          color={hasOverdue ? '#EF4444' : '#2563EB'}
          bgColor={
            hasOverdue
              ? (isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)')
              : (isDarkMode ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)')
          }
          highlight={hasOverdue}
          highlightColor="#EF4444"
        />

        {/* Health Score */}
        <StatCard
          label="Health Score"
          value={`${data.health_score}%`}
          subValue={healthInfo.label}
          icon={<Heart className="h-5 w-5" style={{ color: healthInfo.color }} />}
          color={healthInfo.color}
          bgColor={healthInfo.bgColor}
        />
      </div>
    </div>
  );
};

export default ContactCockpitStatsBar;

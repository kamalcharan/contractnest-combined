// src/components/contacts/cockpit/ContactCockpitStatsBar.tsx
// Cockpit Stats Bar — all key metrics in a 4-col x 2-row grid

import React from 'react';
import {
  TrendingUp,
  FileText,
  Calendar,
  Heart,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Truck,
  Percent,
  Clock,
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
        relative overflow-hidden rounded-xl p-3.5
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
        className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-full -mr-4 -mt-4"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {label}
          </p>
          <p className={`text-xl font-bold truncate ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </p>
          {subValue && (
            <p className={`text-[11px] mt-0.5 truncate ${
              highlight
                ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
            }`}>
              {subValue}
            </p>
          )}
        </div>
        <div
          className="p-1.5 rounded-lg flex-shrink-0"
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
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className={`rounded-xl p-3.5 border animate-pulse ${
            isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className={`h-2.5 w-14 rounded ${skeletonBg} mb-2`} />
              <div className={`h-6 w-16 rounded ${skeletonBg} mb-1`} />
              <div className={`h-2.5 w-20 rounded ${skeletonBg}`} />
            </div>
            <div className={`w-8 h-8 rounded-lg ${skeletonBg}`} />
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
    return (
      <div className={`grid grid-cols-4 gap-3 ${className}`}>
        {[
          { label: 'Lifetime Value', value: '₹0' },
          { label: 'Outstanding', value: '₹0' },
          { label: 'Revenue Score', value: '--%' },
          { label: 'Delivery Score', value: '--%' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`rounded-xl p-3.5 border ${
              isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {stat.label}
            </p>
            <p className={`text-xl font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  // Score color helper
  const getScoreColor = (score: number): { color: string; bgColor: string; label: string } => {
    if (score >= 80) return { color: '#10B981', bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)', label: 'Excellent' };
    if (score >= 60) return { color: '#F59E0B', bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)', label: 'Good' };
    if (score >= 40) return { color: '#F97316', bgColor: isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)', label: 'Fair' };
    return { color: '#EF4444', bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', label: 'Critical' };
  };

  const hasOverdue = data.events.overdue > 0;
  const hasOutstanding = (data.outstanding || 0) > 0;
  const activeContracts = data.contracts.by_status?.active || 0;
  const draftContracts = data.contracts.by_status?.draft || 0;

  const revenueInfo = getScoreColor(data.revenue_score ?? 100);
  const deliveryInfo = getScoreColor(data.delivery_score ?? 100);
  const healthInfo = getScoreColor(data.health_score);

  const collectionRate = data.payment_pattern?.collection_rate ?? 0;
  const onTimeRate = data.payment_pattern?.on_time_rate ?? 0;
  const collectionInfo = getScoreColor(collectionRate);
  const onTimeInfo = getScoreColor(onTimeRate);

  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-3">
        {/* Row 1 */}

        {/* LTV */}
        <StatCard
          label="Lifetime Value"
          value={formatCurrency(data.ltv)}
          subValue={`${Object.values(data.contracts.by_status || {}).reduce((s: number, c) => s + (c as number), 0)} contracts total`}
          icon={<TrendingUp className="h-4 w-4" style={{ color: '#6366F1' }} />}
          color="#6366F1"
          bgColor={isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'}
        />

        {/* Outstanding */}
        <StatCard
          label="Outstanding"
          value={formatCurrency(data.outstanding || 0)}
          subValue={hasOutstanding ? 'Unpaid balance' : 'All clear'}
          icon={<AlertCircle className="h-4 w-4" style={{ color: hasOutstanding ? '#F59E0B' : '#10B981' }} />}
          color={hasOutstanding ? '#F59E0B' : '#10B981'}
          bgColor={hasOutstanding
            ? (isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)')
            : (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')
          }
          highlight={hasOutstanding}
          highlightColor="#F59E0B"
        />

        {/* Revenue Score */}
        <StatCard
          label="Revenue Score"
          value={`${data.revenue_score ?? 100}%`}
          subValue={revenueInfo.label}
          icon={<DollarSign className="h-4 w-4" style={{ color: revenueInfo.color }} />}
          color={revenueInfo.color}
          bgColor={revenueInfo.bgColor}
        />

        {/* Delivery Score */}
        <StatCard
          label="Delivery Score"
          value={`${data.delivery_score ?? 100}%`}
          subValue={deliveryInfo.label}
          icon={<Truck className="h-4 w-4" style={{ color: deliveryInfo.color }} />}
          color={deliveryInfo.color}
          bgColor={deliveryInfo.bgColor}
        />

        {/* Row 2 */}

        {/* Contracts */}
        <StatCard
          label="Contracts"
          value={`${activeContracts} Active`}
          subValue={draftContracts > 0 ? `${draftContracts} in draft` : 'All up to date'}
          icon={<FileText className="h-4 w-4" style={{ color: '#059669' }} />}
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
              ? <AlertTriangle className="h-4 w-4" style={{ color: '#EF4444' }} />
              : <Calendar className="h-4 w-4" style={{ color: '#2563EB' }} />
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

        {/* Collection Rate */}
        <StatCard
          label="Collection"
          value={`${collectionRate}%`}
          subValue={data.payment_pattern?.invoice_count ? `${data.payment_pattern.invoice_count} invoices` : 'No invoices'}
          icon={<Percent className="h-4 w-4" style={{ color: collectionInfo.color }} />}
          color={collectionInfo.color}
          bgColor={collectionInfo.bgColor}
        />

        {/* On-time Rate */}
        <StatCard
          label="On-time"
          value={`${onTimeRate}%`}
          subValue={data.payment_pattern?.paid_on_time ? `${data.payment_pattern.paid_on_time} paid on time` : 'No data'}
          icon={<Clock className="h-4 w-4" style={{ color: onTimeInfo.color }} />}
          color={onTimeInfo.color}
          bgColor={onTimeInfo.bgColor}
        />
      </div>
    </div>
  );
};

export default ContactCockpitStatsBar;

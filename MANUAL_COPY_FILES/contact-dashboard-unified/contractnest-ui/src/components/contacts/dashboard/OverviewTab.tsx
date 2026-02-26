// src/components/contacts/dashboard/OverviewTab.tsx
// Overview tab: Health Ring + Cockpit Stats + Needs Attention + Quick Financials + Recent Activity

import React from 'react';
import {
  FileText,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContactCockpitStatsBar from '@/components/contacts/cockpit/ContactCockpitStatsBar';
import NeedsAttentionCard from './NeedsAttentionCard';
import QuickFinancials from './QuickFinancials';
import type { ContactCockpitData, UpcomingEvent } from '@/types/contactCockpit';

interface OverviewTabProps {
  cockpitData: ContactCockpitData;
  colors: any;
  formatCurrency: (value: number, currency?: string) => string;
  onTabChange: (tab: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  cockpitData,
  colors,
  formatCurrency,
  onTabChange,
}) => {
  const navigate = useNavigate();

  // Recent activity: merge overdue + upcoming, sort by date proximity
  const recentActivity = [
    ...(cockpitData.overdue_events || []).map(e => ({
      id: e.id,
      label: e.block_name || e.event_type,
      contract: e.contract_name,
      contractId: e.contract_id,
      date: e.scheduled_date,
      tag: `${e.days_overdue}d overdue`,
      tagColor: '#ef4444',
      type: e.event_type,
    })),
    ...(cockpitData.upcoming_events || []).slice(0, 3).map((e: UpcomingEvent) => ({
      id: e.id,
      label: e.block_name || e.event_type,
      contract: e.contract_name,
      contractId: e.contract_id,
      date: e.scheduled_date,
      tag: e.is_today ? 'Today' : `in ${e.days_until}d`,
      tagColor: e.is_today ? '#f59e0b' : '#22c55e',
      type: e.event_type,
    })),
  ].slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Row 1: Cockpit Stats (full width 4x2 grid) */}
      <ContactCockpitStatsBar data={cockpitData} isLoading={false} />

      {/* Row 2: Needs Attention + Quick Financials */}
      <div className="grid grid-cols-2 gap-6">
        <NeedsAttentionCard
          cockpitData={cockpitData}
          colors={colors}
          formatCurrency={formatCurrency}
        />
        <QuickFinancials
          cockpitData={cockpitData}
          colors={colors}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Row 3: Recent Activity */}
      {recentActivity.length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '10',
          }}
        >
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: colors.utility.primaryText + '10' }}>
            <Calendar className="h-4 w-4" style={{ color: '#3b82f6' }} />
            <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              Recent Activity
            </span>
            <button
              className="text-xs font-semibold ml-auto"
              style={{ color: colors.brand.primary }}
              onClick={() => onTabChange('timeline')}
            >
              View All
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: colors.utility.primaryText + '08' }}>
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:opacity-80"
                onClick={() => navigate(`/contracts/${item.contractId}`)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.type === 'billing' ? '#3b82f620' : '#a855f720' }}
                >
                  {item.type === 'billing' ? (
                    <FileText className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />
                  ) : (
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#a855f7' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>
                    {item.label}
                  </div>
                  <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                    {item.contract}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: item.tagColor + '15', color: item.tagColor }}
                >
                  {item.tag}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText + '60' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;

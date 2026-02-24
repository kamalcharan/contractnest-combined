// src/components/contacts/dashboard/HealthPillars.tsx
// Client-side health pillar breakdown computed from cockpit data
// Pillars: Revenue | Delivery | Engagement | Growth

import React from 'react';
import {
  DollarSign,
  Truck,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import type { ContactCockpitData } from '@/types/contactCockpit';

interface HealthPillarsProps {
  cockpitData: ContactCockpitData;
  colors: any;
}

interface PillarConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  compute: (data: ContactCockpitData) => number;
}

const PILLARS: PillarConfig[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    icon: DollarSign,
    color: '#22c55e',
    compute: (data) => {
      const { collection_rate = 0, on_time_rate = 0 } = data.payment_pattern || {};
      // Weighted: 60% collection rate + 40% on-time rate
      return Math.round(collection_rate * 0.6 + on_time_rate * 0.4);
    },
  },
  {
    key: 'delivery',
    label: 'Delivery',
    icon: Truck,
    color: '#3b82f6',
    compute: (data) => {
      const total = data.events?.total || 0;
      const overdue = data.events?.overdue || 0;
      if (total === 0) return 100; // No events = no issues
      // Score based on % of events NOT overdue
      return Math.round(((total - overdue) / total) * 100);
    },
  },
  {
    key: 'engagement',
    label: 'Engagement',
    icon: MessageSquare,
    color: '#8b5cf6',
    compute: (data) => {
      const upcoming = data.upcoming_events?.length || 0;
      const overdue = data.overdue_events?.length || 0;
      // Active engagement: upcoming events exist, few overdue
      if (upcoming === 0 && overdue === 0) return 50; // Neutral
      const activityScore = Math.min(upcoming * 15, 60); // Up to 60 from upcoming
      const penaltyScore = Math.min(overdue * 20, 60);   // Lose up to 60 from overdue
      return Math.max(0, Math.min(100, 40 + activityScore - penaltyScore));
    },
  },
  {
    key: 'growth',
    label: 'Growth',
    icon: TrendingUp,
    color: '#f59e0b',
    compute: (data) => {
      const byStatus = data.contracts?.by_status || {};
      // Derive total from by_status sum (backend total field had a bug returning 1)
      const total = Object.values(byStatus).reduce((s: number, c) => s + (c as number), 0);
      const active = (byStatus['active'] || 0) + (byStatus['in_progress'] || 0);
      if (total === 0) return 0;
      // Score based on active contract ratio + total volume bonus
      const ratioScore = (active / total) * 70;
      const volumeBonus = Math.min(total * 5, 30); // Up to 30 bonus for volume
      return Math.round(Math.min(100, ratioScore + volumeBonus));
    },
  },
];

const HealthPillars: React.FC<HealthPillarsProps> = ({ cockpitData, colors }) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {PILLARS.map((pillar) => {
        const score = pillar.compute(cockpitData);
        const Icon = pillar.icon;
        return (
          <div
            key={pillar.key}
            className="p-3 rounded-xl border"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '10',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5" style={{ color: pillar.color }} />
              <span className="text-xs font-semibold" style={{ color: colors.utility.secondaryText }}>
                {pillar.label}
              </span>
              <span className="text-xs font-bold ml-auto" style={{ color: pillar.color }}>
                {score}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.utility.primaryText + '10' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${score}%`,
                  backgroundColor: pillar.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HealthPillars;

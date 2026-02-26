// src/components/common/ExplainerDrawer.tsx
// Reusable right-side drawer that explains all metrics on the current page/tab
// Reads from the central EXPLAINER_REGISTRY — scoped by tab key
// Designed to be extended product-wide (contracts, invoices, assets, etc.)

import React from 'react';
import {
  X,
  HelpCircle,
  Lightbulb,
  Calculator,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  EXPLAINER_REGISTRY,
  type ExplainerTab,
  type ExplainerEntry,
  type ExplainerSection,
} from '@/utils/explainerRegistry';
import type { ContactCockpitData } from '@/types/contactCockpit';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface ExplainerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tab: ExplainerTab;
  cockpitData?: ContactCockpitData | null;
}

// ═══════════════════════════════════════════════════
// VALUE BADGE — color-coded current value
// ═══════════════════════════════════════════════════

const ValueBadge: React.FC<{ value: number; isPercent?: boolean }> = ({ value, isPercent = true }) => {
  let color = '#22c55e';
  if (isPercent) {
    if (value <= 30) color = '#ef4444';
    else if (value <= 70) color = '#f59e0b';
  }
  const display = isPercent ? `${value}%` : value.toLocaleString();
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: color + '15', color }}
    >
      {display}
    </span>
  );
};

// ═══════════════════════════════════════════════════
// SINGLE EXPLAINER CARD
// ═══════════════════════════════════════════════════

const ExplainerCard: React.FC<{
  entry: ExplainerEntry;
  data?: ContactCockpitData | null;
  colors: any;
}> = ({ entry, data, colors }) => {
  const value = data ? entry.getValue(data) : 0;
  const interpretation = data ? entry.interpret(value, data) : 'No data available yet.';
  const isPercent = entry.key.startsWith('pillar_') || entry.key.includes('rate') || entry.key === 'health_score' || entry.key.startsWith('tl_');

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '10' }}
    >
      {/* Title + Current Value */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
          {entry.title}
        </h4>
        {data && <ValueBadge value={value} isPercent={isPercent} />}
      </div>

      {/* What it measures */}
      <div className="flex gap-2">
        <MessageCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
        <p className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
          {entry.what}
        </p>
      </div>

      {/* Formula */}
      <div className="flex gap-2">
        <Calculator className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
        <p
          className="text-xs font-mono px-2 py-1 rounded"
          style={{ backgroundColor: colors.utility.secondaryText + '08', color: colors.utility.primaryText }}
        >
          {entry.formula}
        </p>
      </div>

      {/* Current interpretation */}
      {data && (
        <div className="flex gap-2">
          <TrendingUp className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <p className="text-xs leading-relaxed font-medium" style={{ color: colors.utility.primaryText }}>
            {interpretation}
          </p>
        </div>
      )}

      {/* How to improve */}
      <div className="flex gap-2">
        <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
        <p className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
          {entry.improve}
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// DRAWER COMPONENT
// ═══════════════════════════════════════════════════

const TAB_LABELS: Record<ExplainerTab, string> = {
  overview: 'Overview',
  contracts: 'Contracts',
  assets: 'Assets',
  financials: 'Financials',
  timeline: 'Timeline',
};

const ExplainerDrawer: React.FC<ExplainerDrawerProps> = ({
  isOpen,
  onClose,
  tab,
  cockpitData,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const sections: ExplainerSection[] = EXPLAINER_REGISTRY[tab] || [];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: '420px',
          maxWidth: '90vw',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          backgroundColor: colors.utility.secondaryBackground,
          borderLeft: `1px solid ${colors.utility.primaryText}15`,
          boxShadow: isOpen ? '-8px 0 30px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.brand.primary + '15' }}
            >
              <HelpCircle className="h-5 w-5" style={{ color: colors.brand.primary }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Understanding {TAB_LABELS[tab]}
              </h2>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                What each metric means and how to improve
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {sections.map((section) => (
            <div key={section.heading}>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                {section.heading}
              </h3>
              <div className="space-y-3">
                {section.entries.map((entry) => (
                  <ExplainerCard
                    key={entry.key}
                    entry={entry}
                    data={cockpitData}
                    colors={colors}
                  />
                ))}
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                No explanations available for this tab yet.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-5 py-3 border-t text-center"
          style={{ borderColor: colors.utility.primaryText + '10' }}
        >
          <p className="text-[10px]" style={{ color: colors.utility.secondaryText + '80' }}>
            Metrics are computed in real-time from your data
          </p>
        </div>
      </div>
    </>
  );
};

export default ExplainerDrawer;

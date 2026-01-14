// src/pages/ops/reports/index.tsx
// Reports Page - Coming Soon Empty State
import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ReportsPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: colors.utility.primaryText }}
        >
          Reports
        </h1>
        <p
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          Analytics and reporting dashboard
        </p>
      </div>

      {/* Coming Soon Empty State */}
      <div
        className="rounded-lg border p-8"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ backgroundColor: `${colors.brand.primary}10` }}
          >
            <BarChart2
              className="h-10 w-10"
              style={{ color: colors.brand.primary }}
            />
          </div>
          <p
            className="text-xl font-semibold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            Coming Soon
          </p>
          <p
            className="text-sm text-center max-w-md"
            style={{ color: colors.utility.secondaryText }}
          >
            Comprehensive reporting and analytics features will be available shortly.
            Stay tuned for powerful insights into your contract operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

// src/pages/ops/cockpit/index.tsx
// Operations Cockpit - Coming Soon Empty State
import React from 'react';
import { Gauge, BarChart3, Activity, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const OpsCockpitPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const features = [
    { icon: Gauge, title: 'Real-time Monitoring', description: 'Track contract operations live' },
    { icon: BarChart3, title: 'Performance Metrics', description: 'View completion rates & velocity' },
    { icon: Activity, title: 'Activity Tracking', description: 'Monitor all contract activities' },
    { icon: Bell, title: 'Smart Alerts', description: 'Get notified on important events' },
  ];

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
          Operations Cockpit
        </h1>
        <p
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          Real-time contract operations monitoring
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
        <div className="flex flex-col items-center justify-center py-12">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ backgroundColor: `${colors.brand.primary}10` }}
          >
            <Gauge
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
            className="text-sm text-center max-w-md mb-8"
            style={{ color: colors.utility.secondaryText }}
          >
            The Operations Cockpit will provide real-time monitoring of all your contract operations,
            performance metrics, and intelligent alerts.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg"
                  style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${colors.brand.primary}10` }}
                  >
                    <IconComponent
                      className="h-5 w-5"
                      style={{ color: colors.brand.primary }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-medium text-sm"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {feature.title}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpsCockpitPage;

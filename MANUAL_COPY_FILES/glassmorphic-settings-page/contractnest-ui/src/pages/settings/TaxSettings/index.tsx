// src/pages/settings/TaxSettings/index.tsx
// Main Tax Settings page following LOV methodology with two-panel layout
// Glassmorphic Design

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Receipt } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import { captureException } from '@/utils/sentry';

// Import components
import TaxDisplayPanel from '@/components/TaxSettings/TaxDisplayPanel';
import TaxRatesPanel from '@/components/TaxSettings/TaxRatesPanel';

// Import hooks
import { useTaxDisplay } from '@/hooks/useTaxDisplay';
import { useTaxRates } from '@/hooks/useTaxRates';

// Import types
import type { TaxSection } from '@/types/taxSettings';
import { TAX_SECTIONS } from '@/types/taxSettings';

const TaxSettingsPage = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state for section navigation
  const [activeSection, setActiveSection] = useState<TaxSection>('tax-display');
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize hooks
  const taxDisplayHook = useTaxDisplay();
  const taxRatesHook = useTaxRates();

  // Track page view
  useEffect(() => {
    try {
      analyticsService.trackPageView('settings/tax-settings', 'Tax Settings');
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, []);

  // Handle initial loading state
  useEffect(() => {
    // Wait for both hooks to finish initial loading
    const displayLoading = taxDisplayHook.state.loading;
    const ratesLoading = taxRatesHook.state.loading;
    
    if (!displayLoading && !ratesLoading) {
      setInitialLoading(false);
    }
  }, [taxDisplayHook.state.loading, taxRatesHook.state.loading]);

  // Handle section change
  const handleSectionChange = (sectionId: TaxSection) => {
    console.log('Changing tax settings section to:', sectionId);
    setActiveSection(sectionId);
    
    try {
      analyticsService.trackPageView(
        `settings/tax-settings/${sectionId}`, 
        `Tax Settings - ${sectionId === 'tax-display' ? 'Display' : 'Rates'}`
      );
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Handle navigation back
  const handleGoBack = () => {
    navigate('/settings/configure');
  };

  // Get section configuration
  const getSectionConfig = (sectionId: TaxSection) => {
    return TAX_SECTIONS.find(section => section.id === sectionId);
  };

  // Check if there are any errors
  const hasErrors = taxDisplayHook.state.error || taxRatesHook.state.error;

  // Check if anything is saving
  const isSaving = taxDisplayHook.state.saving || taxRatesHook.state.saving;

  // Show initial loading spinner - Glassmorphic
  if (initialLoading) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: colors.brand.primary }}
            />
          </div>
          {/* Skeleton */}
          <div className="flex gap-6">
            <div
              className="w-64 h-48 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
            <div
              className="flex-1 h-96 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Glassmorphic Header */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoBack}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
              </button>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)`
                }}
              >
                <Receipt className="h-6 w-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Tax Settings
                </h1>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Configure tax display and manage tax rates
                </p>
              </div>
            </div>

            {/* Save indicator */}
            {isSaving && (
              <div
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
                style={{
                  color: colors.brand.primary,
                  background: `${colors.brand.primary}15`
                }}
              >
                <Loader2
                  className="h-4 w-4 animate-spin"
                  style={{ color: colors.brand.primary }}
                />
                Saving...
              </div>
            )}
          </div>
        </div>

        {/* Two-panel layout - Glassmorphic */}
        <div className="flex gap-6">
          {/* Left Panel - Section Navigation */}
          <div className="w-64 shrink-0">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
              }}
            >
              {TAX_SECTIONS.map((section, index) => {
                const isSelected = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "w-full px-4 py-4 text-left transition-all duration-300",
                      isSelected
                        ? "font-medium"
                        : "hover:bg-opacity-50"
                    )}
                    style={{
                      borderBottom: index < TAX_SECTIONS.length - 1
                        ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                        : 'none',
                      backgroundColor: isSelected
                        ? colors.brand.primary
                        : 'transparent',
                      color: isSelected
                        ? '#FFFFFF'
                        : colors.utility.primaryText
                    }}
                  >
                    <div className="font-medium">{section.label}</div>
                    <div
                      className="text-sm mt-1"
                      style={{
                        color: isSelected
                          ? 'rgba(255,255,255,0.7)'
                          : colors.utility.secondaryText
                      }}
                    >
                      {section.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Error indicator - Glassmorphic */}
            {hasErrors && (
              <div
                className="mt-4 p-4 rounded-2xl"
                style={{
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${colors.semantic.error}30`
                }}
              >
                <div
                  className="text-sm font-medium"
                  style={{ color: colors.semantic.error }}
                >
                  Configuration Error
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Please check the settings and try again
                </div>
              </div>
            )}
          </div>

        {/* Right Panel - Content Area */}
        <div className="flex-1">
          {activeSection === 'tax-display' && (
            <TaxDisplayPanel
              hook={taxDisplayHook}
              onError={(error) => {
                console.error('Tax display panel error:', error);
                captureException(new Error(error), {
                  tags: { component: 'TaxSettingsPage', panel: 'display' }
                });
              }}
            />
          )}
          
          {activeSection === 'tax-rates' && (
            <TaxRatesPanel
              hook={taxRatesHook}
              onError={(error) => {
                console.error('Tax rates panel error:', error);
                captureException(new Error(error), {
                  tags: { component: 'TaxSettingsPage', panel: 'rates' }
                });
              }}
            />
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default TaxSettingsPage;
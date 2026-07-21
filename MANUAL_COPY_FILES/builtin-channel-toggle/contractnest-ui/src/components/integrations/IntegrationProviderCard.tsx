// src/components/integrations/IntegrationProviderCard.tsx
import React, { useState } from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectIntegrationParams, IntegrationProvider, TenantIntegration, TestConnectionParams, UpdateIntegrationParams } from '@/hooks/useIntegrations';
import StatusBadge from './StatusBadge';
import IntegrationSetupModal from './IntegrationSetupModal';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';
import { useTheme } from '@/contexts/ThemeContext';

interface IntegrationProviderCardProps {
  provider: IntegrationProvider;
  tenantIntegration?: TenantIntegration;
  onConnect: (params: ConnectIntegrationParams) => Promise<any>;
  onUpdate: (params: UpdateIntegrationParams) => Promise<any>;
  onTestConnection: (params: TestConnectionParams) => Promise<any>;
  onToggleStatus: (integrationId: string, isActive: boolean) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
}

const IntegrationProviderCard: React.FC<IntegrationProviderCardProps> = ({
  provider,
  tenantIntegration,
  onConnect,
  onUpdate,
  onTestConnection,
  onToggleStatus,
  onDelete
}) => {
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Format last verified date
  const formatLastVerified = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      captureException(error, {
        tags: { component: 'IntegrationProviderCard', action: 'formatLastVerified' }
      });
      return 'Invalid date';
    }
  };
  
  // Get initials for logo fallback
  const getInitials = () => {
    return provider.display_name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Handle setup button click
  const handleSetupClick = () => {
    setSetupModalOpen(true);
    
    // Track using trackPageView
    try {
      if (analyticsService && typeof analyticsService.trackPageView === 'function') {
        analyticsService.trackPageView(
          `integration_setup/${provider.name}`, 
          `Integration Setup - ${provider.display_name}`
        );
      }
    } catch (error) {
      console.error('Analytics error:', error);
      captureException(error, {
        tags: { component: 'IntegrationProviderCard', action: 'analytics' }
      });
    }
  };
  
  // Handle toggle status
  const handleToggleStatus = async () => {
    if (!tenantIntegration) return;
    
    try {
      await onToggleStatus(tenantIntegration.id, !tenantIntegration.is_active);
      
      // Track using trackPageView
      try {
        if (analyticsService && typeof analyticsService.trackPageView === 'function') {
          analyticsService.trackPageView(
            `integration_toggle/${provider.name}/${!tenantIntegration.is_active ? 'activate' : 'deactivate'}`,
            `Integration ${!tenantIntegration.is_active ? 'Activated' : 'Deactivated'} - ${provider.display_name}`
          );
        }
      } catch (error) {
        console.error('Analytics error:', error);
      }
    } catch (error) {
      captureException(error, {
        tags: { component: 'IntegrationProviderCard', action: 'handleToggleStatus' },
        extra: { provider_id: provider.id }
      });
    }
  };
  
  // Check if documentation URL exists
  const hasDocumentation = provider.metadata && provider.metadata.documentation_url;
  
  // Determine if the integration is configured
  const isConfigured = !!tenantIntegration;
  const connectionStatus = tenantIntegration?.connection_status || 'Not Configured';

  // Built-in ("Powered by ContractNest") vs not-yet-available (bring-your-own)
  // providers — both driven purely by provider.metadata, so no per-provider
  // behaviour is hardcoded here.
  const isPlatformManaged = provider.metadata?.platform_managed === true;
  const isComingSoon = provider.metadata?.coming_soon === true;
  // Built-in providers are always "configured" (no setup needed), so the
  // toggle switch below reflects the real per-tenant on/off state — this
  // used to be hardcoded true regardless of tenantIntegration.
  const isBuiltinChannelActive = tenantIntegration?.is_active ?? true;

  return (
    <>
      <div
        className="rounded-lg border shadow-sm p-4 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`,
          opacity: isComingSoon ? 0.7 : 1
        }}
      >
        <div className="flex items-start justify-between">
          {/* Provider Logo & Info */}
          <div className="flex items-start">
            <div 
              className="w-10 h-10 rounded overflow-hidden border mr-3 flex-shrink-0 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              {provider.logo_url && !logoError ? (
                <img 
                  src={provider.logo_url} 
                  alt={provider.display_name}
                  className="w-full h-full object-contain p-1"
                  onError={() => {
                    console.error(`Failed to load logo for ${provider.name}:`, provider.logo_url);
                    setLogoError(true);
                  }}
                />
              ) : (
                // Show initials as fallback
                <div 
                  className="w-full h-full flex items-center justify-center text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: `${colors.utility.secondaryText}20`,
                    color: colors.utility.secondaryText
                  }}
                >
                  {getInitials()}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h3 
                className="font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                {provider.display_name}
              </h3>
              <p 
                className="text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {provider.description}
              </p>
              
              {/* Show status badge inline for better visibility */}
              <div className="mt-1">
                {isPlatformManaged ? (
                  isBuiltinChannelActive ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                    >
                      Active · Powered by ContractNest
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${colors.utility.secondaryText}20`, color: colors.utility.secondaryText }}
                    >
                      Disabled for your workspace
                    </span>
                  )
                ) : isComingSoon ? (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${colors.utility.secondaryText}20`, color: colors.utility.secondaryText }}
                  >
                    Coming soon
                  </span>
                ) : (
                  <StatusBadge
                    status={connectionStatus}
                    isActive={tenantIntegration?.is_active ?? true}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Integration Details (if configured) */}
        {isConfigured && tenantIntegration && (
          <div 
            className="mt-4 pt-4 border-t transition-colors"
            style={{ borderColor: `${colors.utility.primaryText}20` }}
          >
            <div className="flex justify-between items-center">
              <div className="text-sm">
                {isPlatformManaged ? (
                  <p
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Controls whether ContractNest actually sends this channel for your workspace.
                  </p>
                ) : (
                  <>
                    <p
                      className="transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Last verified: {formatLastVerified(tenantIntegration.last_verified)}
                    </p>
                    <p
                      className="transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {tenantIntegration.is_live ? 'Live mode' : 'Test mode'}
                    </p>
                  </>
                )}
              </div>
              
              {/* Toggle Switch */}
              <div className="flex items-center">
                <span 
                  className="text-sm mr-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {tenantIntegration.is_active ? 'Active' : 'Inactive'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantIntegration.is_active}
                    onChange={handleToggleStatus}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 transition-colors"
                    style={{
                      backgroundColor: tenantIntegration.is_active ? colors.brand.primary : colors.utility.secondaryText + '40'
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-4 flex justify-between items-center">
          {/* Documentation Link */}
          {hasDocumentation && (
            <a 
              href={provider.metadata.documentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline flex items-center transition-colors"
              style={{ color: colors.brand.primary }}
              onClick={() => {
                try {
                  if (analyticsService && typeof analyticsService.trackPageView === 'function') {
                    analyticsService.trackPageView(
                      `integration_docs/${provider.name}`,
                      `Integration Docs - ${provider.display_name}`
                    );
                  }
                } catch (error) {
                  console.error('Analytics error:', error);
                }
              }}
            >
              <ExternalLink size={14} className="mr-1" />
              Documentation
            </a>
          )}
          
          {/* Setup/Configure Button — built-in providers are managed by us
              (informational only); coming-soon providers are locked. */}
          {isPlatformManaged ? (
            <span
              className="text-sm ml-auto font-medium"
              style={{ color: isBuiltinChannelActive ? colors.semantic.success : colors.utility.secondaryText }}
            >
              {isBuiltinChannelActive ? '✓ Enabled for your workspace' : 'Disabled — use the toggle to re-enable'}
            </span>
          ) : isComingSoon ? (
            <button
              disabled
              aria-disabled="true"
              className="px-4 py-2 rounded-md text-sm ml-auto cursor-not-allowed"
              style={{
                color: colors.utility.secondaryText,
                backgroundColor: `${colors.utility.secondaryText}15`
              }}
            >
              Coming soon
            </button>
          ) : (
            <button
              onClick={handleSetupClick}
              className={cn(
                "px-4 py-2 rounded-md text-sm ml-auto transition-all duration-200",
                isConfigured
                  ? "border hover:opacity-80"
                  : "text-white hover:opacity-90"
              )}
              style={
                isConfigured
                  ? {
                      color: colors.brand.primary,
                      borderColor: colors.brand.primary,
                      backgroundColor: `${colors.brand.primary}05`
                    }
                  : {
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                      color: 'white'
                    }
              }
            >
              {isConfigured ? (
                <>
                  <Settings size={14} className="inline mr-2" />
                  Settings
                </>
              ) : (
                'Set Up'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {setupModalOpen && (
        <IntegrationSetupModal
          provider={provider}
          tenantIntegration={tenantIntegration}
          onClose={() => setSetupModalOpen(false)}
          onConnect={onConnect}
          onUpdate={onUpdate}
          onTestConnection={onTestConnection}
          onDelete={onDelete}
        />
      )}
    </>
  );
};

export default IntegrationProviderCard;
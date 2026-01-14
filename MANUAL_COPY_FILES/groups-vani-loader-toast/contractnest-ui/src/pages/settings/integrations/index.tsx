// src/pages/settings/integrations/index.tsx - Theme Integrated Version
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAuth } from '@/context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import IntegrationTypeSection from '@/components/integrations/IntegrationTypeSection';
import StatusBadge from '@/components/integrations/StatusBadge';
// import ProviderLogo from '@/components/integrations/ProviderLogo';
import { VaNiLoader } from '@/components/common/loaders';
import { 
  Integration, 
  IntegrationTypeStatus,
  ConnectIntegrationParams,
  UpdateIntegrationParams,
  TestConnectionParams,
  ConfigField 
} from '@/hooks/useIntegrations';

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { isLive } = useAuth();
  const { 
    loading, 
    integrationTypes, 
    integrations,
    fetchIntegrationTypes,
    fetchIntegrationsByType,
    saveIntegration,
    testConnection,
    toggleIntegrationStatus
  } = useIntegrations();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const [groupedData, setGroupedData] = useState<Record<string, any>>({});
  const [loadingTypes, setLoadingTypes] = useState<Set<string>>(new Set());
  
  // Track page view
  useEffect(() => {
    analyticsService.trackPageView('settings/integrations', 'Integrations');
  }, []);
  
  // Fetch integration types on mount and when environment changes
  useEffect(() => {
    console.log("Fetching integration types...");
    fetchIntegrationTypes();
  }, [isLive]);
  
  // Fetch integrations for each type when types are loaded
  useEffect(() => {
    console.log("Integration types loaded:", integrationTypes);
    
    if (integrationTypes && integrationTypes.length > 0) {
      // Clear previous data
      setGroupedData({});
      setLoadingTypes(new Set());
      
      // Fetch integrations for each type using the actual database name
      integrationTypes.forEach((type: IntegrationTypeStatus) => {
        console.log(`Fetching integrations for type: ${type.integration_type}`);
        setLoadingTypes(prev => new Set(prev).add(type.integration_type));
        
        fetchIntegrationsByType(type.integration_type)
          .finally(() => {
            setLoadingTypes(prev => {
              const newSet = new Set(prev);
              newSet.delete(type.integration_type);
              return newSet;
            });
          });
      });
    }
  }, [integrationTypes, fetchIntegrationsByType]);
  
  // Group integrations by type and prepare data for components
  useEffect(() => {
    console.log("Integrations loaded:", integrations);
    
    const grouped: Record<string, any> = {};
    
    // First, initialize all types
    integrationTypes.forEach(type => {
      grouped[type.integration_type] = {
        ...type,
        providers: []
      };
    });
    
    // Then, add providers to each type
    integrations.forEach(integration => {
      const typeKey = integration.integration_type || 'unknown';
      if (grouped[typeKey]) {
        // Transform integration data to match component expectations
        const provider = {
          id: integration.master_integration_id,
          type_id: typeKey,
          name: integration.provider_name,
          display_name: integration.display_name,
          description: integration.description,
          logo_url: integration.logo_url,
          is_active: true,
          config_schema: integration.config_schema || { fields: [] },
          metadata: integration.metadata || {},
          created_at: integration.created_at || new Date().toISOString(),
          updated_at: integration.updated_at || new Date().toISOString(),
          // Attach tenant integration data if configured
          tenantIntegration: integration.is_configured ? {
            id: integration.id || integration.master_integration_id,
            tenant_id: integration.tenant_id || '',
            master_integration_id: integration.master_integration_id,
            is_active: integration.is_active,
            is_live: integration.is_live,
            credentials: integration.credentials || {},
            connection_status: integration.connection_status || 'Connected',
            last_verified: integration.last_verified,
            created_at: integration.created_at || new Date().toISOString(),
            updated_at: integration.updated_at || new Date().toISOString()
          } : undefined
        };
        
        grouped[typeKey].providers.push(provider);
      }
    });
    
    console.log("Grouped data:", grouped);
    setGroupedData(grouped);
  }, [integrations, integrationTypes]);
  
  // Map database icon names to Lucide component names
  const mapIconName = (dbIconName: string | null | undefined): string => {
    if (!dbIconName) return 'Plug';
    
    const iconMap: Record<string, string> = {
      'credit-card': 'CreditCard',
      'mail': 'Mail',
      'message-square': 'MessageSquare',
      'bell': 'Bell',
      'hard-drive': 'HardDrive',
      'bar-chart': 'BarChart',
      'users': 'Users'
    };
    
    return iconMap[dbIconName] || 'Plug';
  };
  
  // Handle Back
  const handleBack = () => {
    navigate('/settings');
  };
  
  // Handle connect integration
  const handleConnect = async (params: ConnectIntegrationParams) => {
    console.log('Connecting integration:', params);
    
    // Find the provider to get the type
    const provider = integrations.find(int => 
      int.master_integration_id === params.master_integration_id
    );
    
    const integration = {
      master_integration_id: params.master_integration_id,
      credentials: params.credentials,
      is_live: params.is_live !== undefined ? params.is_live : isLive,
      is_active: true,
      integration_type: provider?.integration_type || '',
      provider_name: provider?.provider_name || '',
      display_name: provider?.display_name || ''
    };
    
    const result = await saveIntegration(integration as Integration);
    if (result) {
      // Refresh the integrations
      await fetchIntegrationTypes();
    }
    return result;
  };
  
  // Handle update integration
  const handleUpdate = async (params: UpdateIntegrationParams) => {
    console.log('Updating integration:', params);
    // Find the existing integration
    const existingIntegration = integrations.find(int => 
      (int.id && int.id === params.id) || 
      (int.master_integration_id === params.id)
    );
    
    if (!existingIntegration) {
      console.error('Integration not found for update');
      return false;
    }
    
    const updatedIntegration = {
      ...existingIntegration,
      id: existingIntegration.id || params.id,
      credentials: params.credentials || existingIntegration.credentials,
      is_live: params.is_live !== undefined ? params.is_live : existingIntegration.is_live,
      is_active: params.is_active !== undefined ? params.is_active : existingIntegration.is_active
    };
    
    const result = await saveIntegration(updatedIntegration);
    if (result) {
      // Refresh the integrations
      fetchIntegrationTypes();
    }
    return result;
  };
  
  // Handle test connection
  const handleTestConnection = async (params: TestConnectionParams) => {
    console.log('Testing connection:', params);
    
    // Find if this is an existing integration
    const existingIntegration = integrations.find(int => 
      int.master_integration_id === params.provider_id && int.is_configured
    );
    
    const integration = {
      id: existingIntegration?.id,
      master_integration_id: params.provider_id,
      credentials: params.credentials,
      integration_type: '',
      provider_name: '',
      display_name: '',
      is_active: true,
      is_live: isLive,
      is_configured: !!existingIntegration
    };
    
    return await testConnection(integration as Integration);
  };
  
  // Handle toggle status
  const handleToggleStatus = async (integrationId: string, isActive: boolean) => {
    console.log('Toggling status:', integrationId, isActive);
    const result = await toggleIntegrationStatus(integrationId, isActive);
    if (result) {
      // Refresh the integrations
      fetchIntegrationTypes();
    }
    return result;
  };
  
  return (
    <div 
      className="p-6 transition-colors"
      style={{ backgroundColor: colors.utility.secondaryText + '10' }}
    >
      {/* Page Header */}
      <div className="flex items-center mb-8">
        <button 
          onClick={handleBack} 
          className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryText + '20' }}
        >
          <ArrowLeft 
            className="h-5 w-5"
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div>
          <h1 
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Integrations
          </h1>
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Configure and manage your third-party integrations
          </p>
        </div>
      </div>
      
      {/* Integration Types */}
      <div className="space-y-8">
        {loading && integrationTypes.length === 0 ? (
          // Show centered loading spinner on initial load
          <div className="flex items-center justify-center py-20">
            <VaNiLoader size="md" message="Loading integrations..." />
          </div>
        ) : (
          // Render each type with its integrations using the IntegrationTypeSection component
          Object.values(groupedData).map((typeData: any) => {
            const isTypeLoading = loadingTypes.has(typeData.integration_type);
            
            if (isTypeLoading) {
              return (
                <div key={typeData.integration_type} className="space-y-4">
                  <div>
                    <h2 
                      className="text-xl font-bold transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {typeData.display_name}
                    </h2>
                    <p 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {typeData.description}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center py-8 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: colors.utility.primaryText + '20'
                    }}
                  >
                    <VaNiLoader size="sm" message="Loading..." />
                  </div>
                </div>
              );
            }
            
            return (
              <IntegrationTypeSection
                key={typeData.integration_type}
                type={{
                  id: typeData.integration_type,
                  name: typeData.integration_type,
                  display_name: typeData.display_name,
                  description: typeData.description,
                  icon_name: mapIconName(typeData.icon_name), // Map database icon names to Lucide component names
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }}
                providers={typeData.providers || []}
                onConnect={handleConnect}
                onUpdate={handleUpdate}
                onTestConnection={handleTestConnection}
                onToggleStatus={handleToggleStatus}
              />
            );
          })
        )}
        
        {!loading && integrationTypes.length === 0 && (
          <div 
            className="rounded-lg shadow-sm border p-10 text-center transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <h3 
              className="text-lg font-medium mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              No Integrations Available
            </h3>
            <p 
              className="mb-6 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              There are currently no integrations available. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationsPage;
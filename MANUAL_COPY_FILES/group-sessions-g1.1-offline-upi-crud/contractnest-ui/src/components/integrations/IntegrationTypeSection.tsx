// src/components/integrations/IntegrationTypeSection.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import IntegrationProviderCard from './IntegrationProviderCard';
import { ConnectIntegrationParams, IntegrationType, TestConnectionParams, UpdateIntegrationParams } from '@/hooks/useIntegrations';
import { captureException } from '@/utils/sentry';
import { useTheme } from '@/contexts/ThemeContext';

// Import icon components
import * as LucideIcons from 'lucide-react';

interface IntegrationTypeSectionProps {
  type: IntegrationType & { providers?: any[] };
  providers: any[];
  onConnect: (params: ConnectIntegrationParams) => Promise<any>;
  onUpdate: (params: UpdateIntegrationParams) => Promise<any>;
  onTestConnection: (params: TestConnectionParams) => Promise<any>;
  onToggleStatus: (integrationId: string, isActive: boolean) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
}

const IntegrationTypeSection: React.FC<IntegrationTypeSectionProps> = ({
  type,
  providers,
  onConnect,
  onUpdate,
  onTestConnection,
  onToggleStatus,
  onDelete
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Get icon component for this type
  const getIconComponent = () => {
    try {
      // Use the icon_name from the type data to get the Lucide icon
      const IconComponent = type.icon_name && 
        (LucideIcons as any)[type.icon_name];
      
      if (IconComponent) {
        return <IconComponent className="h-5 w-5" style={{ color: colors.brand.primary }} />;
      }
      
      // Fallback icons based on type name
      switch (type.name.toLowerCase()) {
        case 'payment_gateway':
          return <LucideIcons.CreditCard className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        case 'email_service':
          return <LucideIcons.Mail className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        case 'sms_service':
          return <LucideIcons.MessageSquare className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        case 'notification':
          return <LucideIcons.Bell className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        case 'file_storage':
          return <LucideIcons.HardDrive className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        case 'analytics':
          return <LucideIcons.BarChart className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        case 'crm':
          return <LucideIcons.Users className="h-5 w-5" style={{ color: colors.brand.primary }} />;
        default:
          return <LucideIcons.Plug className="h-5 w-5" style={{ color: colors.brand.primary }} />;
      }
    } catch (error) {
      captureException(error, {
        tags: { component: 'IntegrationTypeSection', action: 'getIconComponent' }
      });
      return <LucideIcons.Plug className="h-5 w-5" style={{ color: colors.brand.primary }} />;
    }
  };

  // Check if there are any providers for this type
  if (providers.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors"
            style={{ backgroundColor: `${colors.brand.primary}10` }}
          >
            {getIconComponent()}
          </div>
          <h2 
            className="text-xl font-semibold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            {type.display_name}
          </h2>
        </div>
        <p 
          className="text-sm mb-4 transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          {type.description}
        </p>
        
        <div 
          className="rounded-lg shadow-sm border p-6 text-center transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            No providers available for this integration type.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center mb-2">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors"
          style={{ backgroundColor: `${colors.brand.primary}10` }}
        >
          {getIconComponent()}
        </div>
        <h2 
          className="text-xl font-semibold transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {type.display_name}
        </h2>
      </div>
      <p 
        className="text-sm mb-4 transition-colors"
        style={{ color: colors.utility.secondaryText }}
      >
        {type.description}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map(provider => (
          <IntegrationProviderCard
            key={provider.id}
            provider={provider}
            tenantIntegration={provider.tenantIntegration}
            onConnect={onConnect}
            onUpdate={onUpdate}
            onTestConnection={onTestConnection}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default IntegrationTypeSection;
// src/components/integrations/IntegrationSetupModal.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectIntegrationParams, IntegrationProvider, TenantIntegration, TestConnectionParams, UpdateIntegrationParams } from '@/hooks/useIntegrations';
import DynamicFormField from './DynamicFormField';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';
import { useTheme } from '@/contexts/ThemeContext';

interface IntegrationSetupModalProps {
  provider: IntegrationProvider;
  tenantIntegration?: TenantIntegration;
  onClose: () => void;
  onConnect: (params: ConnectIntegrationParams) => Promise<any>;
  onUpdate: (params: UpdateIntegrationParams) => Promise<any>;
  onTestConnection: (params: TestConnectionParams) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
}

const IntegrationSetupModal: React.FC<IntegrationSetupModalProps> = ({
  provider,
  tenantIntegration,
  onClose,
  onConnect,
  onUpdate,
  onTestConnection,
  onDelete
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { isDarkMode, currentTheme } = useTheme();

  // Config-only providers (e.g. Offline UPI) have nothing to test/connect —
  // the modal becomes plain add / edit / delete of the stored values.
  const configOnly = !!(provider.metadata as any)?.config_only;
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Load initial data from existing integration
  useEffect(() => {
    try {
      if (tenantIntegration && tenantIntegration.credentials) {
        // Initialize form data for existing integration
        const fields = provider.config_schema?.fields || [];
        const initialData: Record<string, any> = {};
        
        fields.forEach(field => {
          // For non-sensitive fields, use the value from credentials if available
          if (!field.sensitive && tenantIntegration.credentials && tenantIntegration.credentials[field.name] !== undefined) {
            initialData[field.name] = tenantIntegration.credentials[field.name];
          } else if (field.default !== undefined) {
            initialData[field.name] = field.default;
          }
        });
        
        setFormData(initialData);
      } else {
        // New integration - initialize with defaults
        const fields = provider.config_schema?.fields || [];
        const initialData: Record<string, any> = {};
        
        fields.forEach(field => {
          if (field.default !== undefined) {
            initialData[field.name] = field.default;
          }
        });
        
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error initializing form data:', error);
      captureException(error, {
        tags: { component: 'IntegrationSetupModal', action: 'useEffect' }
      });
    }
  }, []); // Empty dependency array - only run once on mount
  
  // Update form field
  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear previous test result when form changes
    setTestResult(null);
  };
  
  // Check if all required fields are filled
  const areRequiredFieldsFilled = (): boolean => {
    const requiredFields = provider.config_schema?.fields?.filter(field => field.required) || [];
    
    if (tenantIntegration) {
      // For existing integrations, only check newly entered fields
      return requiredFields.every(field => {
        const newValue = formData[field.name];
        // If field is empty, it will use existing value, so consider it filled
        return newValue !== undefined || newValue === '';
      });
    } else {
      // For new integrations, all required fields must be filled
      return requiredFields.every(field => {
        const value = formData[field.name];
        return value !== undefined && value !== '' && value !== null;
      });
    }
  };
  
  // Test the connection
  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      setTestResult(null);
      
      // For existing integrations, we need to merge existing credentials with form data
      let testCredentials = { ...formData };
      
      if (tenantIntegration && tenantIntegration.credentials) {
        // Merge existing credentials with new values
        // This allows testing with existing credentials even if fields are empty
        testCredentials = {
          ...tenantIntegration.credentials,
          ...Object.fromEntries(
            Object.entries(formData).filter(([_, value]) => value !== '' && value !== undefined)
          )
        };
      }
      
      // Track the test connection action
      try {
        if (analyticsService && typeof analyticsService.trackPageView === 'function') {
          analyticsService.trackPageView(
            `integration_test/${provider.name}`,
            `Integration Test - ${provider.display_name}`
          );
        }
      } catch (error) {
        console.error('Analytics error:', error);
      }
      
      const result = await onTestConnection({
        provider_id: provider.id,
        credentials: testCredentials,
        integration_id: tenantIntegration?.id // Pass integration ID for existing integrations
      });
      
      setTestResult(result);
      
      return result.success;
    } catch (error) {
      captureException(error, {
        tags: { component: 'IntegrationSetupModal', action: 'handleTestConnection' },
        extra: { provider_id: provider.id }
      });
      
      setTestResult({
        success: false,
        message: 'An error occurred while testing the connection'
      });
      
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Submit the form (connect or update)
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate form data against required fields
      const requiredFields = provider.config_schema?.fields
        ?.filter(field => field.required)
        .map(field => field.name) || [];
      
      // For new integrations, check all required fields
      if (!tenantIntegration) {
        const missingFields = requiredFields.filter(fieldName => 
          !formData[fieldName] && formData[fieldName] !== false && formData[fieldName] !== 0
        );
        
        if (missingFields.length > 0) {
          const missingFieldNames = missingFields
            .map(name => {
              const field = provider.config_schema?.fields?.find(f => f.name === name);
              return field ? field.display_name : name;
            })
            .join(', ');
            
          setTestResult({
            success: false,
            message: `Missing required fields: ${missingFieldNames}`
          });
          
          return;
        }
      }
      
      // Config-only providers have nothing to verify — skip the connection test.
      if (!configOnly) {
        const testPassed = await handleTestConnection();
        if (!testPassed) {
          return;
        }
      }

      // Create new integration or update existing one
      if (tenantIntegration) {
        // For updates, only send changed fields
        const changedCredentials = Object.fromEntries(
          Object.entries(formData).filter(([_, value]) => value !== '' && value !== undefined)
        );
        
        await onUpdate({
          id: tenantIntegration.id,
          credentials: changedCredentials
        });
        
        // Track the update
        try {
          if (analyticsService && typeof analyticsService.trackPageView === 'function') {
            analyticsService.trackPageView(
              `integration_updated/${provider.name}`,
              `Integration Updated - ${provider.display_name}`
            );
          }
        } catch (error) {
          console.error('Analytics error:', error);
        }
      } else {
        await onConnect({
          master_integration_id: provider.id,
          credentials: formData
        });
        
        // Track the connection
        try {
          if (analyticsService && typeof analyticsService.trackPageView === 'function') {
            analyticsService.trackPageView(
              `integration_connected/${provider.name}`,
              `Integration Connected - ${provider.display_name}`
            );
          }
        } catch (error) {
          console.error('Analytics error:', error);
        }
      }
      
      onClose();
    } catch (error) {
      captureException(error, {
        tags: { component: 'IntegrationSetupModal', action: 'handleSubmit' },
        extra: { provider_id: provider.id }
      });
      
      setTestResult({
        success: false,
        message: 'An error occurred while saving the integration'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Remove (delete) a config-only integration's stored values
  const handleDelete = async () => {
    if (!tenantIntegration || !onDelete) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remove the ${provider.display_name} configuration?`)) return;
    try {
      setIsDeleting(true);
      await onDelete(tenantIntegration.id);
      onClose();
    } catch (error) {
      captureException(error, { tags: { component: 'IntegrationSetupModal', action: 'handleDelete' } });
      setTestResult({ success: false, message: 'Could not remove the configuration.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if test connection button should be disabled
  const isTestDisabled = (): boolean => {
    if (isTestingConnection || isSubmitting) return true;
    
    if (tenantIntegration) {
      // For existing integrations, always allow testing
      return false;
    } else {
      // For new integrations, check if required fields are filled
      return !areRequiredFieldsFilled();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        className="rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        {/* Modal Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between transition-colors"
          style={{ borderColor: `${colors.utility.primaryText}20` }}
        >
          <h2 
            className="text-xl font-semibold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            {provider.display_name} Integration
          </h2>
          <button 
            onClick={onClose}
            className="transition-colors hover:opacity-80"
            style={{ color: colors.utility.secondaryText }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="px-6 py-4 overflow-y-auto flex-grow">
          <p 
            className="mb-6 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {provider.description}
          </p>
          
          {/* Test Results */}
          {testResult && (
            <div 
              className="p-4 rounded-md mb-6 flex items-start border transition-colors"
              style={{
                backgroundColor: testResult.success 
                  ? `${colors.semantic.success}10` 
                  : `${colors.semantic.error}10`,
                borderColor: testResult.success 
                  ? `${colors.semantic.success}40` 
                  : `${colors.semantic.error}40`
              }}
            >
              {testResult.success ? (
                <CheckCircle 
                  className="h-5 w-5 mr-3 flex-shrink-0" 
                  style={{ color: colors.semantic.success }}
                />
              ) : (
                <AlertCircle 
                  className="h-5 w-5 mr-3 flex-shrink-0" 
                  style={{ color: colors.semantic.error }}
                />
              )}
              <div>
                <p 
                  className="font-medium transition-colors"
                  style={{ 
                    color: testResult.success 
                      ? colors.semantic.success 
                      : colors.semantic.error 
                  }}
                >
                  {testResult.success ? 'Connection successful' : 'Connection failed'}
                </p>
                <p 
                  className="transition-colors"
                  style={{ 
                    color: testResult.success 
                      ? colors.semantic.success 
                      : colors.semantic.error 
                  }}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
          
          {/* Note for existing integrations */}
          {tenantIntegration && (
            <div 
              className="p-4 rounded-md mb-6 border transition-colors"
              style={{
                backgroundColor: `${colors.brand.primary}10`,
                borderColor: `${colors.brand.primary}40`,
                color: colors.brand.primary
              }}
            >
              <p className="text-sm">
                <strong>Note:</strong> For security reasons, sensitive fields like API keys are not shown. 
                Leave them blank to keep existing values, or enter new values to update them.
              </p>
            </div>
          )}
          
          {/* Dynamic Form */}
          <div className="space-y-4">
            {provider.config_schema?.fields?.map(field => (
              <DynamicFormField
                key={field.name}
                field={field}
                value={formData[field.name]}
                onChange={value => handleFieldChange(field.name, value)}
              />
            ))}
          </div>
        </div>
        
        {/* Modal Footer */}
        <div 
          className="px-6 py-4 border-t flex justify-between transition-colors"
          style={{ borderColor: `${colors.utility.primaryText}20` }}
        >
          {configOnly ? (
            // config-only: no test; offer Remove when a config already exists
            (tenantIntegration && onDelete) ? (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className={cn(
                  "px-4 py-2 rounded-md text-sm border transition-all duration-200",
                  (isDeleting || isSubmitting) && "opacity-50 cursor-not-allowed"
                )}
                style={{ borderColor: `${colors.semantic.error}55`, backgroundColor: `${colors.semantic.error}0d`, color: colors.semantic.error }}
              >
                {isDeleting ? (<><Loader2 size={14} className="inline mr-2 animate-spin" />Removing...</>) : 'Remove'}
              </button>
            ) : <span />
          ) : (
            <button
              onClick={handleTestConnection}
              disabled={isTestDisabled()}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-all duration-200",
                isTestDisabled() && "opacity-50 cursor-not-allowed"
              )}
              style={{
                borderColor: `${colors.utility.primaryText}40`,
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText
              }}
            >
              {isTestingConnection ? (
                <>
                  <Loader2 size={14} className="inline mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm border transition-all duration-200 hover:opacity-80"
              style={{
                color: colors.brand.primary,
                borderColor: colors.brand.primary,
                backgroundColor: `${colors.brand.primary}05`
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 rounded-md text-sm text-white transition-all duration-200 hover:opacity-90",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="inline mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                configOnly
                  ? (tenantIntegration ? 'Save changes' : 'Save')
                  : (tenantIntegration ? 'Update Integration' : 'Connect Integration')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetupModal;
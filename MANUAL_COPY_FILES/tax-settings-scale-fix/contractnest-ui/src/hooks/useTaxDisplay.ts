// src/hooks/useTaxDisplay.ts
// UPDATED: Using VaNiToast instead of useToast for consistent UI

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';
import type {
  TaxDisplayState,
  TaxDisplayFormData,
  UseTaxDisplayReturn,
  ValidationResult
} from '@/types/taxSettings';

import type { TaxSettings } from '@/types/taxTypes';

/**
 * Hook for managing tax display settings
 * Handles the display_mode configuration (including_tax vs excluding_tax)
 */
export const useTaxDisplay = (): UseTaxDisplayReturn => {
  const { currentTenant } = useAuth();

  // State management
  const [state, setState] = useState<TaxDisplayState>({
    loading: false,
    saving: false,
    data: null,
    error: null,
    hasUnsavedChanges: false
  });

  // Generate idempotency key for operations
  const generateIdempotencyKey = useCallback(() => {
    return `tax-display-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Fetch tax settings data
  const fetchTaxSettings = useCallback(async () => {
    if (!currentTenant?.id) {
      console.warn('No current tenant available for tax settings fetch');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('Fetching tax display settings for tenant:', currentTenant.id);

      const response = await api.get(API_ENDPOINTS.TAX_SETTINGS.BASE);

      console.log('Tax settings response:', response.data);

      // Extract settings from the response
      const settings = response.data.settings;

      setState(prev => ({
        ...prev,
        loading: false,
        data: settings,
        error: null,
        hasUnsavedChanges: false
      }));

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/display', 'Tax Display Settings View');
      } catch (error) {
        console.error('Analytics error:', error);
      }

    } catch (error: any) {
      console.error('Error fetching tax display settings:', error);

      const errorMessage = error.response?.data?.error || error.message || 'Failed to load tax display settings';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      // Capture exception
      captureException(error, {
        tags: {
          component: 'useTaxDisplay',
          action: 'fetchTaxSettings'
        },
        extra: {
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      // Show error toast using VaNiToast
      vaniToast.error('Failed to Load Settings', {
        message: 'Unable to load tax display settings. Please try again.',
        duration: 4000
      });
    }
  }, [currentTenant?.id]);

  // Update display mode
  const updateDisplayMode = useCallback(async (mode: 'including_tax' | 'excluding_tax') => {
    if (!currentTenant?.id) {
      vaniToast.error('No Tenant Selected', {
        message: 'Please select a tenant to continue'
      });
      return;
    }

    // Validate the form data
    const formData: TaxDisplayFormData = { display_mode: mode };
    const validation = validateForm(formData);

    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors)[0];
      vaniToast.error('Validation Error', {
        message: errorMessage,
        duration: 3000
      });
      return;
    }

    setState(prev => ({ ...prev, saving: true, error: null }));

    try {
      console.log('Updating tax display mode to:', mode);

      const idempotencyKey = generateIdempotencyKey();

      const requestData = {
        display_mode: mode,
        default_tax_rate_id: state.data?.default_tax_rate_id || null
      };

      const response = await api.post(
        API_ENDPOINTS.TAX_SETTINGS.SETTINGS,
        requestData,
        {
          headers: {
            'idempotency-key': idempotencyKey
          }
        }
      );

      console.log('Tax display settings updated:', response.data);

      // Update state with new data
      setState(prev => ({
        ...prev,
        saving: false,
        data: response.data,
        hasUnsavedChanges: false,
        error: null
      }));

      // Show success toast using VaNiToast
      const displayLabel = mode === 'including_tax' ? 'Including tax' : 'Excluding tax';
      vaniToast.success('Settings Updated', {
        message: `Tax display mode changed to "${displayLabel}"`,
        duration: 3000
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/display/updated', 'Tax Display Mode Updated');
      } catch (error) {
        console.error('Analytics error:', error);
      }

    } catch (error: any) {
      console.error('Error updating tax display mode:', error);

      const errorMessage = error.response?.data?.error || error.message || 'Failed to update tax display mode';

      setState(prev => ({
        ...prev,
        saving: false,
        error: errorMessage
      }));

      // Capture exception
      captureException(error, {
        tags: {
          component: 'useTaxDisplay',
          action: 'updateDisplayMode'
        },
        extra: {
          tenantId: currentTenant?.id,
          requestedMode: mode,
          errorMessage
        }
      });

      // Show error toast using VaNiToast
      vaniToast.error('Update Failed', {
        message: errorMessage,
        duration: 4000
      });
    }
  }, [currentTenant?.id, state.data?.default_tax_rate_id, generateIdempotencyKey]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchTaxSettings();
  }, [fetchTaxSettings]);

  // Reset unsaved changes
  const resetChanges = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUnsavedChanges: false,
      error: null
    }));
  }, []);

  // Validate form data
  const validateForm = useCallback((data: TaxDisplayFormData): ValidationResult => {
    const errors: Record<string, string> = {};

    // Validate display mode
    if (!data.display_mode) {
      errors.display_mode = 'Display mode is required';
    } else if (!['including_tax', 'excluding_tax'].includes(data.display_mode)) {
      errors.display_mode = 'Invalid display mode';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  // Mark as having unsaved changes (for future use)
  const markAsChanged = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUnsavedChanges: true
    }));
  }, []);

  // Load data on mount and tenant change
  useEffect(() => {
    if (currentTenant?.id) {
      fetchTaxSettings();
    }
  }, [currentTenant?.id, fetchTaxSettings]);

  // Log component mount/unmount
  useEffect(() => {
    console.log('useTaxDisplay hook mounted');

    return () => {
      console.log('useTaxDisplay hook unmounted');
    };
  }, []);

  return {
    // State
    state,

    // Actions
    updateDisplayMode,
    refresh,

    // Utils
    resetChanges,
    validateForm
  };
};

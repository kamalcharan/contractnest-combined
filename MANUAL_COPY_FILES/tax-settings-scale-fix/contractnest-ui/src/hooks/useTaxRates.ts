// src/hooks/useTaxRates.ts
// UPDATED: Using VaNiToast instead of react-hot-toast for consistent UI

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { analyticsService } from '@/services/analytics.service';
import { captureException } from '@/utils/sentry';
import type {
  TaxRateWithUI,
  TaxRatesState,
  TaxRateFormData,
  DuplicateErrorResponse
} from '@/types/taxSettings';

// Error handling function using VaNiToast
const handleTaxRateError = (error: any, operation: string): void => {
  console.error(`Tax rate ${operation} error:`, error);

  // Check if it's a duplicate error (409 status)
  if (error?.response?.status === 409 && error?.response?.data?.code === 'DUPLICATE_TAX_RATE') {
    const duplicateError = error.response.data as DuplicateErrorResponse;

    // Show user-friendly duplicate message using warning toast
    vaniToast.warning(
      `Tax rate "${duplicateError.existing_rate.name}" with ${duplicateError.existing_rate.rate}% already exists`,
      {
        message: 'Please use a different name or rate combination',
        duration: 4000
      }
    );
    return;
  }

  // Check for other specific error types
  if (error?.response?.status === 400) {
    const message = error.response.data?.error || 'Invalid data provided';
    vaniToast.error('Validation Error', {
      message: message,
      duration: 3000
    });
    return;
  }

  if (error?.response?.status === 401) {
    vaniToast.error('Authentication Required', {
      message: 'Please log in again to continue',
      duration: 4000
    });
    return;
  }

  if (error?.response?.status === 403) {
    vaniToast.error('Permission Denied', {
      message: 'You do not have permission to perform this action',
      duration: 4000
    });
    return;
  }

  // Generic error for other cases
  const genericMessage = error?.response?.data?.error || error?.message || `Failed to ${operation} tax rate`;
  vaniToast.error('Operation Failed', {
    message: genericMessage,
    duration: 4000
  });
};

export const useTaxRates = () => {
  const { currentTenant } = useAuth();

  // State management
  const [state, setState] = useState<TaxRatesState>({
    loading: false,
    saving: false,
    data: [],
    error: null,
    editingId: null,
    deletingId: null,
    isAdding: false,
  });

  // Load tax rates
  const loadTaxRates = useCallback(async () => {
    if (!currentTenant?.id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await api.get('/api/tax-settings');
      const transformedRates = response.data.rates.map((rate: any) => ({
        ...rate,
        isEditing: false,
        isLoading: false,
        hasUnsavedChanges: false,
      }));

      setState(prev => ({
        ...prev,
        data: transformedRates,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error loading tax rates:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load tax rates',
      }));
    }
  }, [currentTenant?.id]);

  // Create tax rate
  const createTaxRate = async (data: TaxRateFormData): Promise<void> => {
    if (!currentTenant?.id) {
      vaniToast.error('No Tenant Selected', {
        message: 'Please select a tenant to continue'
      });
      return;
    }

    const idempotencyKey = `tax-rates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const requestData = {
      name: data.name.trim(),
      rate: data.rate,
      description: data.description?.trim() || null,
      is_default: data.is_default || false
    };

    try {
      const response = await api.post(
        '/api/tax-settings/rates',
        requestData,
        {
          headers: {
            'idempotency-key': idempotencyKey
          }
        }
      );

      const newRate = response.data;

      // Update state with new rate
      setState(prev => ({
        ...prev,
        data: prev.data.map(rate => ({
          ...rate,
          isEditing: false
        })).concat([{
          ...newRate,
          isEditing: false,
          isLoading: false,
          hasUnsavedChanges: false
        }]),
        isAdding: false
      }));

      // Show success message
      vaniToast.success('Tax Rate Created', {
        message: `"${newRate.name}" (${newRate.rate}%) has been created successfully`,
        duration: 3000
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/rates/created', 'Tax Rate Created');
      } catch (error) {
        console.error('Analytics error:', error);
      }

    } catch (error: any) {
      handleTaxRateError(error, 'create');
    }
  };

  // Update tax rate
  const updateTaxRate = async (id: string, data: Partial<TaxRateFormData>): Promise<void> => {
    if (!currentTenant?.id) {
      vaniToast.error('No Tenant Selected', {
        message: 'Please select a tenant to continue'
      });
      return;
    }

    const idempotencyKey = `tax-rates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set loading state for specific rate
    setState(prev => ({
      ...prev,
      data: prev.data.map(rate =>
        rate.id === id ? { ...rate, isLoading: true } : rate
      )
    }));

    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.rate !== undefined) updateData.rate = data.rate;
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.is_default !== undefined) updateData.is_default = data.is_default;

      const response = await api.put(
        `/api/tax-settings/rates/${id}`,
        updateData,
        {
          headers: {
            'idempotency-key': idempotencyKey
          }
        }
      );

      const updatedRate = response.data;

      // Update state with the updated rate
      setState(prev => ({
        ...prev,
        data: prev.data.map(rate =>
          rate.id === id
            ? {
                ...updatedRate,
                isEditing: false,
                isLoading: false,
                hasUnsavedChanges: false
              }
            : rate.is_default && updatedRate.is_default && rate.id !== id
            ? { ...rate, is_default: false }
            : rate
        )
      }));

      // Show success message
      vaniToast.success('Tax Rate Updated', {
        message: `"${updatedRate.name}" has been updated successfully`,
        duration: 3000
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/rates/updated', 'Tax Rate Updated');
      } catch (error) {
        console.error('Analytics error:', error);
      }

    } catch (error: any) {
      handleTaxRateError(error, 'update');

      // Reset loading state but stay in edit mode
      setState(prev => ({
        ...prev,
        data: prev.data.map(rate =>
          rate.id === id ? { ...rate, isLoading: false } : rate
        )
      }));
    }
  };

  // Delete tax rate
  const deleteTaxRate = async (id: string): Promise<void> => {
    if (!currentTenant?.id) {
      vaniToast.error('No Tenant Selected', {
        message: 'Please select a tenant to continue'
      });
      return;
    }

    setState(prev => ({ ...prev, deletingId: id }));

    try {
      await api.delete(`/api/tax-settings/rates/${id}`);

      setState(prev => ({
        ...prev,
        data: prev.data.filter(rate => rate.id !== id),
        deletingId: null,
      }));

      vaniToast.success('Tax Rate Deleted', {
        message: 'The tax rate has been deleted successfully',
        duration: 3000
      });

      try {
        analyticsService.trackPageView('settings/tax-settings/rates/deleted', 'Tax Rate Deleted');
      } catch (error) {
        console.error('Analytics error:', error);
      }
    } catch (error: any) {
      console.error('Error deleting tax rate:', error);
      setState(prev => ({ ...prev, deletingId: null }));

      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete tax rate';

      captureException(error, {
        tags: {
          component: 'useTaxRates',
          action: 'deleteRate'
        },
        extra: {
          tenantId: currentTenant?.id,
          rateId: id,
          errorMessage
        }
      });

      vaniToast.error('Delete Failed', {
        message: errorMessage,
        duration: 4000
      });
    }
  };

  // Set default tax rate
  const setDefaultTaxRate = async (id: string): Promise<void> => {
    if (!currentTenant?.id) {
      vaniToast.error('No Tenant Selected', {
        message: 'Please select a tenant to continue'
      });
      return;
    }

    setState(prev => ({
      ...prev,
      data: prev.data.map(rate => ({
        ...rate,
        isLoading: rate.id === id,
      })),
    }));

    try {
      const response = await api.put(
        `/api/tax-settings/rates/${id}`,
        { is_default: true },
        {
          headers: {
            'idempotency-key': `set-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }
        }
      );

      const updatedRate = response.data;

      setState(prev => ({
        ...prev,
        data: prev.data.map(rate => ({
          ...rate,
          is_default: rate.id === id,
          isLoading: false,
        })),
      }));

      vaniToast.success('Default Rate Updated', {
        message: `"${updatedRate.name}" is now the default tax rate`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error setting default tax rate:', error);
      setState(prev => ({
        ...prev,
        data: prev.data.map(rate => ({ ...rate, isLoading: false })),
      }));

      const errorMessage = error.response?.data?.error || error.message || 'Failed to set default tax rate';
      vaniToast.error('Operation Failed', {
        message: errorMessage,
        duration: 4000
      });
    }
  };

  // UI state management functions
  const startEditing = (id: string) => {
    setState(prev => ({
      ...prev,
      data: prev.data.map(rate => ({
        ...rate,
        isEditing: rate.id === id,
      })),
      editingId: id,
    }));
  };

  const cancelEditing = (id: string) => {
    setState(prev => ({
      ...prev,
      data: prev.data.map(rate => ({
        ...rate,
        isEditing: false,
        hasUnsavedChanges: false,
      })),
      editingId: null,
    }));
  };

  const startAdding = () => {
    setState(prev => ({
      ...prev,
      isAdding: true,
      data: prev.data.map(rate => ({ ...rate, isEditing: false })),
      editingId: null,
    }));
  };

  const cancelAdding = () => {
    setState(prev => ({ ...prev, isAdding: false }));
  };

  // Load data on mount and tenant change
  useEffect(() => {
    if (currentTenant?.id) {
      loadTaxRates();
    }
  }, [currentTenant?.id, loadTaxRates]);

  return {
    state,
    actions: {
      createTaxRate,
      updateTaxRate,
      deleteTaxRate,
      setDefaultTaxRate,
      startEditing,
      cancelEditing,
      startAdding,
      cancelAdding,
      loadTaxRates,
    },
  };
};

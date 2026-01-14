// src/pages/settings/Resources/index.tsx
// Main Resources management page - SCALE-OPTIMIZED VERSION
// Updated: VaNiLoader + vaniToast

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import { captureException } from '@/utils/sentry';

// Components
import { ResourceTypesList, ResourcesPanel } from '@/components/Resources';
import { NoResourceTypesEmptyState } from '@/components/Resources/EmptyStates';

// Hooks
import { useResourceTypes } from '@/hooks/queries/useResources';

// Types
import { ResourceType } from '@/types/resources';

/**
 * Main Resources management page
 * Layout and structure follows LOV pattern
 */
const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // Load resource types
  const {
    data: rawResourceTypes = [],
    isLoading: typesLoading,
    error: typesError,
    refetch: refetchTypes
  } = useResourceTypes();

  // Ensure resourceTypes is always an array
  const resourceTypes = React.useMemo(() => {
    console.log('RAW RESOURCE TYPES:', rawResourceTypes, typeof rawResourceTypes);

    if (Array.isArray(rawResourceTypes)) {
      console.log('resourceTypes is array with length:', rawResourceTypes.length);
      return rawResourceTypes;
    }

    console.log('resourceTypes is not array, returning empty array');
    return [];
  }, [rawResourceTypes]);

  // Track page view
  useEffect(() => {
    try {
      analyticsService.trackPageView('settings/resources', 'Resources Management');
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, []);

  // Initialize selected type from URL params or first available type
  useEffect(() => {
    const typeFromUrl = searchParams.get('type');

    if (typeFromUrl && resourceTypes.some(type => type.id === typeFromUrl)) {
      // Valid type from URL
      setSelectedTypeId(typeFromUrl);
    } else if (resourceTypes.length > 0 && !selectedTypeId) {
      // Auto-select first type if none selected
      const firstType = resourceTypes[0];
      setSelectedTypeId(firstType.id);

      // Update URL without triggering navigation
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('type', firstType.id);
        return newParams;
      });
    }
  }, [resourceTypes, searchParams, selectedTypeId, setSearchParams]);

  // Handle type selection
  const handleTypeSelection = (typeId: string) => {
    const selectedType = resourceTypes.find(type => type.id === typeId);

    setSelectedTypeId(typeId);

    // Update URL
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('type', typeId);
      return newParams;
    });

    // Track analytics
    try {
      analyticsService.trackPageView(
        `settings/resources/${typeId}`,
        `Resources - ${selectedType?.name || 'Unknown'}`
      );
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Handle navigation back
  const handleGoBack = () => {
    try {
      analyticsService.trackPageView('settings/configure', 'Settings - Back from Resources');
    } catch (error) {
      console.error('Analytics error:', error);
    }
    navigate('/settings/configure');
  };

  // Handle retry for loading errors
  const handleRetryLoadTypes = () => {
    refetchTypes();
  };

  // Get selected resource type info
  const selectedResourceType = resourceTypes.find(type => type.id === selectedTypeId);

  // Show loading state for initial load - UPDATED: Using VaNiLoader
  if (typesLoading && resourceTypes.length === 0) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px] transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <VaNiLoader size="md" message="LOADING RESOURCE TYPES" />
      </div>
    );
  }

  return (
    <div
      className="p-6 transition-colors duration-200 min-h-screen"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Header */}
      <ResourcesPageHeader
        onGoBack={handleGoBack}
        selectedResourceType={selectedResourceType}
        colors={colors}
      />

      {/* Main Content */}
      <div className="flex gap-6 mt-8">
        {/* Left Sidebar - Resource Types */}
        <ResourceTypesList
          selectedTypeId={selectedTypeId}
          onSelectType={handleTypeSelection}
        />

        {/* Right Panel - Resources */}
        <div className="flex-1">
          {typesError ? (
            <ResourcesErrorState
              error={typesError}
              onRetry={handleRetryLoadTypes}
              colors={colors}
            />
          ) : resourceTypes.length === 0 ? (
            <NoResourceTypesEmptyState
              onRetry={handleRetryLoadTypes}
            />
          ) : (
            <ResourcesPanel selectedTypeId={selectedTypeId} />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Page header component
 */
interface ResourcesPageHeaderProps {
  onGoBack: () => void;
  selectedResourceType?: ResourceType;
  colors: any;
}

const ResourcesPageHeader: React.FC<ResourcesPageHeaderProps> = ({
  onGoBack,
  selectedResourceType,
  colors,
}) => {
  return (
    <div className="flex items-center mb-8">
      <Button
        variant="outline"
        size="sm"
        onClick={onGoBack}
        className="mr-4 transition-colors hover:opacity-80"
        style={{
          borderColor: colors.utility.secondaryText + '40',
          backgroundColor: colors.utility.secondaryBackground,
          color: colors.utility.primaryText
        }}
      >
        <ArrowLeft
          className="h-5 w-5 transition-colors"
          style={{ color: colors.utility.secondaryText }}
        />
      </Button>

      <div>
        <h1
          className="text-2xl font-bold transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Resources Management
        </h1>
        <p
          className="transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          {selectedResourceType
            ? `Manage your ${selectedResourceType.name.replace('_', ' ')} resources`
            : 'Manage your organization resources and assignments'
          }
        </p>
      </div>
    </div>
  );
};

/**
 * Error state component for resource types loading
 */
interface ResourcesErrorStateProps {
  error: Error;
  onRetry: () => void;
  colors: any;
}

const ResourcesErrorState: React.FC<ResourcesErrorStateProps> = ({
  error,
  onRetry,
  colors,
}) => {
  // Log error for debugging
  useEffect(() => {
    captureException(error, {
      tags: { component: 'ResourcesPage', action: 'loadResourceTypes' },
      extra: { errorMessage: error.message }
    });

    // Show error toast - UPDATED: Using vaniToast
    vaniToast.error('Failed to Load Resources', {
      message: error.message || 'An error occurred while loading resource types.',
      duration: 5000
    });
  }, [error]);

  return (
    <div
      className="rounded-lg shadow-sm border p-8 text-center transition-colors"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.semantic.error + '40'
      }}
    >
      <div
        className="text-lg font-semibold mb-2 transition-colors"
        style={{ color: colors.semantic.error }}
      >
        Failed to Load Resource Types
      </div>
      <p
        className="mb-4 transition-colors"
        style={{ color: colors.utility.secondaryText }}
      >
        {error.message || 'An error occurred while loading resource types.'}
      </p>
      <Button
        onClick={onRetry}
        className="transition-colors hover:opacity-90"
        style={{
          background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
          color: '#FFFFFF'
        }}
      >
        Try Again
      </Button>
    </div>
  );
};

export default ResourcesPage;

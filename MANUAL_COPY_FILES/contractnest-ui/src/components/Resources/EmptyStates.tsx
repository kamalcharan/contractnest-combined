// src/components/Resources/EmptyStates.tsx
// Empty state components for Resources management

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Users, 
  Handshake, 
  Package, 
  AlertCircle, 
  RefreshCw,
  ExternalLink 
} from 'lucide-react';

import { Button } from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  EmptyStateProps, 
  ResourceType,
  getResourceTypeBehavior,
  RESOURCE_TYPE_ICONS 
} from '../../types/resources';

/**
 * Main Empty States component for Resources
 * Handles different empty state scenarios with appropriate messaging and actions
 */
const ResourcesEmptyStates: React.FC<EmptyStateProps> = ({
  type,
  resourceTypeName,
  resourceType,
  searchQuery,
  onCreateNew,
  onClearSearch,
  onRetry,
  onGoToContacts,
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get resource type behavior if available
  const behavior = resourceType ? getResourceTypeBehavior(resourceType) : null;

  // Get appropriate icon for resource type
  const getResourceTypeIcon = (typeName?: string) => {
    if (!typeName) return Package;
    
    switch (typeName.toLowerCase()) {
      case 'team_staff':
        return Users;
      case 'partner':
        return Handshake;
      case 'equipment':
      case 'consumable':
      case 'asset':
      default:
        return Package;
    }
  };

  // Handle navigation to contacts page
  const handleGoToContacts = () => {
    if (onGoToContacts) {
      onGoToContacts();
    } else {
      navigate('/contacts');
    }
  };

  // Common styles for empty state container
  const containerStyles = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.primaryText + '20',
  };

  const textStyles = {
    primary: { color: colors.utility.primaryText },
    secondary: { color: colors.utility.secondaryText },
  };

  // Render different empty states based on type
  switch (type) {
    case 'no_resource_types':
      return (
        <div 
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={containerStyles}
        >
          <AlertCircle 
            className="mx-auto h-16 w-16 mb-4 transition-colors"
            style={{ color: colors.semantic.warning }}
          />
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={textStyles.primary}
          >
            No Resource Types Available
          </h3>
          <p 
            className="mb-6 max-w-md mx-auto transition-colors"
            style={textStyles.secondary}
          >
            Resource types need to be configured before you can manage resources. 
            Please contact your administrator to set up resource types.
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="transition-colors hover:opacity-80"
              style={{
                borderColor: colors.brand.primary + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.brand.primary
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Loading
            </Button>
          )}
        </div>
      );

    case 'no_resources_manual':
      const ManualIcon = getResourceTypeIcon(resourceTypeName);
      return (
        <div 
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={containerStyles}
        >
          <ManualIcon 
            className="mx-auto h-16 w-16 mb-4 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={textStyles.primary}
          >
            No {resourceTypeName || 'Resources'} Found
          </h3>
          <p 
            className="mb-6 max-w-md mx-auto transition-colors"
            style={textStyles.secondary}
          >
            {resourceTypeName 
              ? `You haven't added any ${resourceTypeName.toLowerCase()} yet. Start by creating your first ${resourceTypeName.toLowerCase()} entry.`
              : 'No resources have been added yet. Start by creating your first resource.'
            }
          </p>
          {onCreateNew && (
            <Button
              onClick={onCreateNew}
              className="transition-colors hover:opacity-90"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                color: '#FFFFFF',
                borderColor: 'transparent'
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New {resourceTypeName || 'Resource'}
            </Button>
          )}
        </div>
      );

    case 'no_resources_contact':
      const ContactIcon = getResourceTypeIcon(resourceTypeName);
      const contactTypeName = resourceTypeName === 'team_staff' ? 'team members' : 'partners';
      const contactClassification = resourceTypeName === 'team_staff' ? 'team_member' : 'vendor';
      
      return (
        <div 
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={containerStyles}
        >
          <ContactIcon 
            className="mx-auto h-16 w-16 mb-4 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={textStyles.primary}
          >
            No {resourceTypeName || 'Contact-Based Resources'} Available
          </h3>
          <p 
            className="mb-6 max-w-md mx-auto transition-colors"
            style={textStyles.secondary}
          >
            {resourceTypeName 
              ? `No ${contactTypeName} found in your contacts directory. ${resourceTypeName} resources are automatically created from your contacts with the "${contactClassification}" classification.`
              : 'Contact-based resources are automatically created from your contacts directory.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoToContacts}
              className="transition-colors hover:opacity-90"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                color: '#FFFFFF',
                borderColor: 'transparent'
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to Contacts
            </Button>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                className="transition-colors hover:opacity-80"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </div>
      );

    case 'no_search_results':
      return (
        <div 
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={containerStyles}
        >
          <Search 
            className="mx-auto h-16 w-16 mb-4 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={textStyles.primary}
          >
            No Search Results
          </h3>
          <p 
            className="mb-6 max-w-md mx-auto transition-colors"
            style={textStyles.secondary}
          >
            {searchQuery 
              ? `No resources found matching "${searchQuery}". Try adjusting your search terms or clearing the search.`
              : 'No resources found matching your search criteria.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onClearSearch && (
              <Button
                onClick={onClearSearch}
                variant="outline"
                className="transition-colors hover:opacity-80"
                style={{
                  borderColor: colors.brand.primary + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.brand.primary
                }}
              >
                Clear Search
              </Button>
            )}
            {onCreateNew && behavior?.isManualEntry && (
              <Button
                onClick={onCreateNew}
                className="transition-colors hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                  color: '#FFFFFF',
                  borderColor: 'transparent'
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New {resourceTypeName || 'Resource'}
              </Button>
            )}
          </div>
        </div>
      );

    case 'error':
      return (
        <div 
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={containerStyles}
        >
          <AlertCircle 
            className="mx-auto h-16 w-16 mb-4 transition-colors"
            style={{ color: colors.semantic.error }}
          />
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={textStyles.primary}
          >
            Something Went Wrong
          </h3>
          <p 
            className="mb-6 max-w-md mx-auto transition-colors"
            style={textStyles.secondary}
          >
            We encountered an error while loading the resources. 
            Please check your connection and try again.
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              className="transition-colors hover:opacity-90"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                color: '#FFFFFF',
                borderColor: 'transparent'
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      );

    default:
      return (
        <div 
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={containerStyles}
        >
          <Package 
            className="mx-auto h-16 w-16 mb-4 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={textStyles.primary}
          >
            No Data Available
          </h3>
          <p 
            className="transition-colors"
            style={textStyles.secondary}
          >
            No information is currently available to display.
          </p>
        </div>
      );
  }
};

// =================================================================
// SPECIALIZED EMPTY STATE COMPONENTS
// =================================================================

/**
 * Empty state specifically for manual entry resource types
 */
export const ManualEntryEmptyState: React.FC<{
  resourceType: ResourceType;
  onCreateNew?: () => void;
}> = ({ resourceType, onCreateNew }) => {
  return (
    <ResourcesEmptyStates
      type="no_resources_manual"
      resourceTypeName={resourceType.name}
      resourceType={resourceType}
      onCreateNew={onCreateNew}
    />
  );
};

/**
 * Empty state specifically for contact-based resource types
 */
export const ContactBasedEmptyState: React.FC<{
  resourceType: ResourceType;
  onGoToContacts?: () => void;
  onRetry?: () => void;
}> = ({ resourceType, onGoToContacts, onRetry }) => {
  return (
    <ResourcesEmptyStates
      type="no_resources_contact"
      resourceTypeName={resourceType.name}
      resourceType={resourceType}
      onGoToContacts={onGoToContacts}
      onRetry={onRetry}
    />
  );
};

/**
 * Empty state for search results
 */
export const SearchEmptyState: React.FC<{
  searchQuery: string;
  resourceType?: ResourceType;
  onClearSearch?: () => void;
  onCreateNew?: () => void;
}> = ({ searchQuery, resourceType, onClearSearch, onCreateNew }) => {
  return (
    <ResourcesEmptyStates
      type="no_search_results"
      searchQuery={searchQuery}
      resourceType={resourceType}
      resourceTypeName={resourceType?.name}
      onClearSearch={onClearSearch}
      onCreateNew={onCreateNew}
    />
  );
};

/**
 * Empty state for errors
 */
export const ErrorEmptyState: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => {
  return (
    <ResourcesEmptyStates
      type="error"
      onRetry={onRetry}
    />
  );
};

/**
 * Empty state when no resource types are configured
 */
export const NoResourceTypesEmptyState: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => {
  return (
    <ResourcesEmptyStates
      type="no_resource_types"
      onRetry={onRetry}
    />
  );
};

/**
 * Description card component - Shows resource type description from database
 * Always visible at top of resources panel to provide context
 */
export const ResourceDescriptionCard: React.FC<{
  resourceType: ResourceType;
}> = ({ resourceType }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Don't render if no description
  if (!resourceType.description) {
    return null;
  }

  return (
    <div
      className="rounded-lg border-l-4 p-4 mb-6 transition-colors"
      style={{
        backgroundColor: isDarkMode
          ? colors.brand.primary + '15'  // 15% opacity for dark mode
          : colors.brand.primary + '10', // 10% opacity for light mode
        borderLeftColor: colors.brand.primary,
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        borderRight: `1px solid ${colors.utility.primaryText}10`,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
      }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="h-5 w-5 flex-shrink-0 mt-0.5"
          style={{ color: colors.brand.primary }}
        />
        <p
          className="text-sm leading-relaxed transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {resourceType.description}
        </p>
      </div>
    </div>
  );
};

// Export main component and specialized variants
export default ResourcesEmptyStates;

// Note: All specialized components are already exported individually above with 'export const'
// No need for additional export block
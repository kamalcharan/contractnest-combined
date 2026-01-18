// src/components/Resources/ResourcesPanel.tsx
// Right panel component showing resources grid and management


import React, { useState, useMemo } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/common/skeletons';
import { 
  useResourceTypes,
  useResourcesByType,
  useNextSequence 
} from '@/hooks/queries/useResources';
import { useContactList } from '@/hooks/useContacts';
import ResourcesEmptyStates, {
  ManualEntryEmptyState,
  ContactBasedEmptyState,
  SearchEmptyState,
  ErrorEmptyState,
  ResourceDescriptionCard
} from '@/components/Resources/EmptyStates';
import AddResourceForm from './AddResourceForm';
import ResourceCard from './ResourceCard';
import { 
  Resource,
  ResourceType,
  ResourceFilters,
  getResourceTypeBehavior,
  CONTACT_CLASSIFICATION_MAP,
  DEFAULT_RESOURCE_FILTERS
} from '@/types/resources';

interface ResourcesPanelProps {
  selectedTypeId: string | null;
  className?: string;
}

/**
 * Right panel component showing resources for selected type
 * Handles both manual entry and contact-based resource types
 */
const ResourcesPanel: React.FC<ResourcesPanelProps> = ({
  selectedTypeId,
  className,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  // Load resource types to get selected type info
  const { data: resourceTypes = [] } = useResourceTypes();
  const selectedResourceType = resourceTypes.find(type => type.id === selectedTypeId);
  const behavior = selectedResourceType ? getResourceTypeBehavior(selectedResourceType) : null;

  // Build filters for current selection
  const filters: ResourceFilters = useMemo(() => ({
    ...DEFAULT_RESOURCE_FILTERS,
    resourceTypeId: selectedTypeId || undefined,
    search: searchQuery.trim() || undefined,
  }), [selectedTypeId, searchQuery]);

  // Load resources for selected type
  const { 
    data: resources = [], 
    isLoading: resourcesLoading, 
    error: resourcesError,
    refetch: refetchResources
  } = useResourcesByType(selectedTypeId, filters);

  // Load contacts for contact-based resource types
  // FIX: Use resource type ID instead of name for lookup
  const contactClassification = selectedResourceType ?
    CONTACT_CLASSIFICATION_MAP[selectedResourceType.id] : null;
  const {
    data: contacts = [],
    loading: contactsLoading,
    error: contactsError
  } = useContactList(
    contactClassification
      ? { classifications: [contactClassification], enabled: true }
      : { enabled: false } // Don't fetch contacts for non-contact-based resource types
  );

  // Load next sequence number for manual entry types
  const { data: nextSequence } = useNextSequence(
    behavior?.isManualEntry ? selectedTypeId : null
  );

  // Handle search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Handle add new resource
  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
  };

  const handleAddSuccess = () => {
    setIsAddingNew(false);
    // Resources will auto-refresh via TanStack Query invalidation
  };

  // Handle edit resource
  const handleEdit = (resource: Resource) => {
    setEditingResourceId(resource.id);
  };

  const handleCancelEdit = () => {
    setEditingResourceId(null);
  };

  const handleEditSuccess = () => {
    setEditingResourceId(null);
    // Resources will auto-refresh via TanStack Query invalidation
  };

  // Transform contacts to Resource format for contact-based types
  const transformedContactsAsResources = useMemo((): Resource[] => {
    if (!behavior?.isContactBased || contacts.length === 0) {
      return [];
    }

    return contacts.map((contact) => ({
      id: contact.id,
      tenant_id: contact.tenant_id,
      is_live: contact.is_live,
      resource_type_id: selectedTypeId!,
      name: contact.name || contact.company_name || 'Unnamed Contact',
      display_name: contact.displayName || contact.name || contact.company_name || 'Unnamed Contact',
      description: contact.notes || null,
      code: null,
      contact_id: contact.id,
      attributes: null,
      availability_config: null,
      is_custom: false,
      master_template_id: null,
      status: contact.status === 'active' ? 'active' : 'inactive',
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      created_by: null,
      updated_by: null,
      hexcolor: null,
      sequence_no: null,
      is_deletable: false, // Contact-based resources are not deletable from Resources UI
      tags: null,
      form_settings: null,
      contact: contact,
      resource_type: selectedResourceType,
    } as Resource));
  }, [contacts, behavior?.isContactBased, selectedTypeId, selectedResourceType]);

  // Determine which data source to use based on resource type
  const displayData = useMemo(() => {
    return behavior?.isContactBased ? transformedContactsAsResources : resources;
  }, [behavior?.isContactBased, transformedContactsAsResources, resources]);

  // Filter display data based on search
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return displayData;

    const query = searchQuery.toLowerCase();
    return displayData.filter(resource =>
      resource.name.toLowerCase().includes(query) ||
      resource.display_name.toLowerCase().includes(query) ||
      (resource.description && resource.description.toLowerCase().includes(query))
    );
  }, [displayData, searchQuery]);

  // Determine loading state
  const isLoading = resourcesLoading || (behavior?.isContactBased && contactsLoading);

  // Render no type selected state
  if (!selectedTypeId) {
    return (
      <div className={cn("flex-1", className)}>
        <div 
          className="rounded-lg shadow-sm border p-8 text-center transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
        >
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Select a resource type from the left to view its resources.
          </p>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn("flex-1", className)}>
        <ResourcesPanelHeader
          selectedResourceType={selectedResourceType}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onAddNew={behavior?.isManualEntry ? handleAddNew : undefined}
          isAddingNew={isAddingNew}
          colors={colors}
        />
        <div className="mt-6">
          <TableSkeleton rows={5} />
        </div>
      </div>
    );
  }

  // Render error state
  if (resourcesError) {
    return (
      <div className={cn("flex-1", className)}>
        <ResourcesPanelHeader
          selectedResourceType={selectedResourceType}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onAddNew={behavior?.isManualEntry ? handleAddNew : undefined}
          isAddingNew={isAddingNew}
          colors={colors}
        />
        <div className="mt-6">
          <ErrorEmptyState onRetry={() => refetchResources()} />
        </div>
      </div>
    );
  }

  // Render main content
  return (
    <div className={cn("flex-1", className)}>
      <ResourcesPanelHeader
        selectedResourceType={selectedResourceType}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onAddNew={behavior?.isManualEntry ? handleAddNew : undefined}
        isAddingNew={isAddingNew}
        colors={colors}
      />

      {/* Description Card - Shows resource type description from DB */}
      {selectedResourceType && (
        <div className="mt-6">
          <ResourceDescriptionCard resourceType={selectedResourceType} />
        </div>
      )}

      <div className="mt-6">
        {/* Column Headers */}
        <ResourcesColumnHeaders colors={colors} behavior={behavior} />

        {/* Resources List */}
        <div className="space-y-4 mt-4">
          {/* Add New Form */}
          {isAddingNew && selectedResourceType && behavior?.isManualEntry && (
            <AddResourceForm
              resourceType={selectedResourceType}
              nextSequence={nextSequence}
              onSave={handleAddSuccess}
              onCancel={handleCancelAdd}
            />
          )}

          {/* Existing Resources */}
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              resourceType={selectedResourceType!}
              isEditMode={editingResourceId === resource.id}
              onEdit={behavior?.isManualEntry ? handleEdit : undefined}
              onCancelEdit={handleCancelEdit}
              onEditSuccess={handleEditSuccess}
            />
          ))}

          {/* Empty States */}
          {filteredResources.length === 0 && !isAddingNew && (
            <ResourcesEmptyStateHandler
              resourceType={selectedResourceType!}
              behavior={behavior!}
              searchQuery={searchQuery}
              contactsCount={contacts.length}
              onClearSearch={handleClearSearch}
              onAddNew={behavior?.isManualEntry ? handleAddNew : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Panel header with title, search, and add button
 */
interface ResourcesPanelHeaderProps {
  selectedResourceType: ResourceType | undefined;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddNew?: () => void;
  isAddingNew: boolean;
  colors: any;
}

const ResourcesPanelHeader: React.FC<ResourcesPanelHeaderProps> = ({
  selectedResourceType,
  searchQuery,
  onSearchChange,
  onAddNew,
  isAddingNew,
  colors,
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <h2 
          className="text-xl font-semibold transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {selectedResourceType?.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Resources'}
        </h2>
        
        {/* Search Input */}
        <div className="mt-3 max-w-md">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
              style={{ color: colors.utility.secondaryText }}
            />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText
              }}
            />
          </div>
        </div>
      </div>

      {/* Add New Button */}
      {onAddNew && !isAddingNew && (
        <Button 
          onClick={onAddNew}
          className="transition-colors hover:opacity-90"
          style={{
            background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
            color: '#FFFFFF'
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Resource
        </Button>
      )}
    </div>
  );
};

/**
 * Column headers for resources grid
 * For contact-based resources (Team Member, Partners): show only Name, Display Name, Actions (3 cols)
 * For manual entry resources: show all 4 columns (Name, Display Name, Color, Sequence/Actions)
 */
interface ResourcesColumnHeadersProps {
  colors: any;
  behavior: ReturnType<typeof getResourceTypeBehavior> | null;
}

const ResourcesColumnHeaders: React.FC<ResourcesColumnHeadersProps> = ({ colors, behavior }) => {
  const isContactBased = behavior?.isContactBased ?? false;

  return (
    <div
      className="rounded-lg shadow-sm border transition-colors"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20'
      }}
    >
      <div className={cn(
        "grid gap-4 px-4 py-3",
        isContactBased ? "grid-cols-3" : "grid-cols-4"
      )}>
        <div
          className="font-medium transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Name
        </div>
        <div
          className="font-medium transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Display Name
        </div>
        {/* Color - ONLY show for non-contact-based resources */}
        {!isContactBased && (
          <div
            className="font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Color
          </div>
        )}
        {/* Sequence/Actions header - ONLY show for non-contact-based resources */}
        {!isContactBased ? (
          <div
            className="font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Sequence
          </div>
        ) : (
          <div
            className="font-medium transition-colors text-right"
            style={{ color: colors.utility.primaryText }}
          >
            Actions
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Empty state handler - determines which empty state to show
 */
interface ResourcesEmptyStateHandlerProps {
  resourceType: ResourceType;
  behavior: ReturnType<typeof getResourceTypeBehavior>;
  searchQuery: string;
  contactsCount: number;
  onClearSearch: () => void;
  onAddNew?: () => void;
}

const ResourcesEmptyStateHandler: React.FC<ResourcesEmptyStateHandlerProps> = ({
  resourceType,
  behavior,
  searchQuery,
  contactsCount,
  onClearSearch,
  onAddNew,
}) => {
  // Search results empty
  if (searchQuery.trim()) {
    return (
      <SearchEmptyState
        searchQuery={searchQuery}
        resourceType={resourceType}
        onClearSearch={onClearSearch}
        onCreateNew={behavior.isManualEntry ? onAddNew : undefined}
      />
    );
  }

  // Contact-based type with no contacts
  if (behavior.isContactBased) {
    return (
      <ContactBasedEmptyState
        resourceType={resourceType}
      />
    );
  }

  // Manual entry type with no resources
  if (behavior.isManualEntry) {
    return (
      <ManualEntryEmptyState
        resourceType={resourceType}
        onCreateNew={onAddNew}
      />
    );
  }

  // Fallback
  return (
    <ResourcesEmptyStates
      type="no_resources_manual"
      resourceTypeName={resourceType.name}
      resourceType={resourceType}
      onCreateNew={onAddNew}
    />
  );
};

export default ResourcesPanel;
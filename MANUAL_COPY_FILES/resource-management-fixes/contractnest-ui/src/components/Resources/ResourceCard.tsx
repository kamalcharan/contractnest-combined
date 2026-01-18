// src/components/Resources/ResourceCard.tsx
// Individual resource card component for grid Display


import React, { useState } from 'react';
import { Pencil, Trash2, Save, X, User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateResource, useDeleteResource } from '@/hooks/queries/useResources';
import { 
  Resource, 
  ResourceType, 
  UpdateResourceFormData,
  getResourceTypeBehavior,
  canEditResource,
  canDeleteResource,
  getResourceDisplayName,
  RESOURCE_COLORS
} from '@/types/resources';
import { validateResourceForm, prepareResourceFormData } from '@/utils/helpers/resourceHelpers';

interface ResourceCardProps {
  resource: Resource;
  resourceType: ResourceType;
  isEditMode?: boolean;
  onEdit?: (resource: Resource) => void;
  onCancelEdit?: () => void;
  onEditSuccess?: () => void;
  className?: string;
}

/**
 * Individual resource card component
 * Displays resource information with inline editing for manual entry types
 */
const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  resourceType,
  isEditMode = false,
  onEdit,
  onCancelEdit,
  onEditSuccess,
  className,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get resource type behavior
  const behavior = getResourceTypeBehavior(resourceType);
  const canEdit = canEditResource(resource, resourceType);
  const canDelete = canDeleteResource(resource, resourceType);

  // Edit form state
  const [editData, setEditData] = useState<UpdateResourceFormData>({
    name: resource.name,
    display_name: resource.display_name,
    description: resource.description || '',
    hexcolor: resource.hexcolor || RESOURCE_COLORS[0],
    sequence_no: resource.sequence_no || undefined,
  });

  // Mutations
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();

  // Handle field changes
  const handleFieldChange = (field: keyof UpdateResourceFormData, value: any) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      // Validate form data
      const { isValid, errors } = validateResourceForm(editData, 'edit');
      
      if (!isValid) {
        // Handle validation errors - for now just log
        console.error('Validation errors:', errors);
        return;
      }

      // Prepare and submit data
      const preparedData = prepareResourceFormData(editData, 'edit');
      
      await updateMutation.mutateAsync({
        id: resource.id,
        data: preparedData,
      });

      onEditSuccess?.();
    } catch (error) {
      console.error('Failed to update resource:', error);
      // Error handling is done in the mutation
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${getResourceDisplayName(resource)}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: resource.id,
      });
    } catch (error) {
      console.error('Failed to delete resource:', error);
      // Error handling is done in the mutation
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg shadow-sm border transition-all duration-200",
        isEditMode ? "border-2 shadow-md" : "",
        className
      )}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: isEditMode
          ? colors.brand.primary
          : colors.utility.primaryText + '20'
      }}
    >
      {/* For contact-based resources (Team Member, Partners): show only Name, Display Name, Actions (3 cols) */}
      {/* For manual entry resources: show all 4 columns (Name, Display Name, Color, Sequence/Actions) */}
      <div className={cn(
        "grid gap-4 px-4 py-3 items-center",
        behavior.isContactBased ? "grid-cols-3" : "grid-cols-4"
      )}>
        {isEditMode && canEdit ? (
          <EditModeFields
            editData={editData}
            onFieldChange={handleFieldChange}
            behavior={behavior}
            colors={colors}
            isSubmitting={updateMutation.isPending}
            onSave={handleSaveEdit}
            onCancel={onCancelEdit}
          />
        ) : (
          <ViewModeFields
            resource={resource}
            resourceType={resourceType}
            behavior={behavior}
            colors={colors}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={() => onEdit?.(resource)}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Edit mode fields component
 */
interface EditModeFieldsProps {
  editData: UpdateResourceFormData;
  onFieldChange: (field: keyof UpdateResourceFormData, value: any) => void;
  behavior: ReturnType<typeof getResourceTypeBehavior>;
  colors: any;
  isSubmitting: boolean;
  onSave: () => void;
  onCancel?: () => void;
}

const EditModeFields: React.FC<EditModeFieldsProps> = ({
  editData,
  onFieldChange,
  behavior,
  colors,
  isSubmitting,
  onSave,
  onCancel,
}) => {
  return (
    <>
      {/* Name */}
      <Input
        value={editData.name || ''}
        onChange={(e) => onFieldChange('name', e.target.value)}
        disabled={isSubmitting}
        placeholder="Resource name"
        style={{
          borderColor: colors.utility.secondaryText + '40',
          backgroundColor: colors.utility.primaryBackground,
          color: colors.utility.primaryText
        }}
      />

      {/* Display Name */}
      <Input
        value={editData.display_name || ''}
        onChange={(e) => onFieldChange('display_name', e.target.value)}
        disabled={isSubmitting}
        placeholder="Display name"
        style={{
          borderColor: colors.utility.secondaryText + '40',
          backgroundColor: colors.utility.primaryBackground,
          color: colors.utility.primaryText
        }}
      />

      {/* Color - ONLY show for non-contact-based resources */}
      {!behavior.isContactBased && (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border"
            style={{
              backgroundColor: editData.hexcolor || RESOURCE_COLORS[0],
              borderColor: colors.utility.secondaryText + '40'
            }}
          />
          <Input
            type="color"
            value={editData.hexcolor || RESOURCE_COLORS[0]}
            onChange={(e) => onFieldChange('hexcolor', e.target.value)}
            disabled={isSubmitting}
            className="w-12 h-8 p-0 border-0"
          />
        </div>
      )}

      {/* Sequence & Actions - For contact-based, only show Actions */}
      <div className="flex items-center justify-between">
        {/* Sequence - ONLY show for non-contact-based resources */}
        {!behavior.isContactBased && (
          <Input
            type="number"
            value={editData.sequence_no?.toString() || ''}
            onChange={(e) => onFieldChange('sequence_no',
              e.target.value ? parseInt(e.target.value) : undefined
            )}
            disabled={isSubmitting}
            placeholder="Sequence"
            style={{
              borderColor: colors.utility.secondaryText + '40',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText
            }}
          />
        )}

        <div className={cn(
          "flex items-center gap-1",
          behavior.isContactBased ? "ml-auto" : "ml-2"
        )}>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              borderColor: colors.utility.secondaryText + '40',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSubmitting}
            className="hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              color: '#FFFFFF'
            }}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

/**
 * View mode fields component
 */
interface ViewModeFieldsProps {
  resource: Resource;
  resourceType: ResourceType;
  behavior: ReturnType<typeof getResourceTypeBehavior>;
  colors: any;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const ViewModeFields: React.FC<ViewModeFieldsProps> = ({
  resource,
  resourceType,
  behavior,
  colors,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  return (
    <>
      {/* Name */}
      <div className="flex items-center gap-2">
        {behavior.isContactBased && (
          <User
            className="h-4 w-4"
            style={{ color: colors.utility.secondaryText }}
          />
        )}
        <span
          className="font-medium transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {resource.name}
        </span>
      </div>

      {/* Display Name */}
      <div className="flex flex-col">
        <span
          className="transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {resource.display_name}
        </span>
        {/* Contact info for contact-based resources */}
        {behavior.isContactBased && resource.contact && (
          <div className="flex items-center gap-1 mt-1">
            <Mail className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
            <span
              className="text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {resource.contact.email}
            </span>
          </div>
        )}
      </div>

      {/* Color - ONLY show for non-contact-based resources */}
      {!behavior.isContactBased && (
        <div>
          {resource.hexcolor ? (
            <div
              className="w-6 h-6 rounded-full border"
              style={{
                backgroundColor: resource.hexcolor,
                borderColor: colors.utility.secondaryText + '40'
              }}
              title={resource.hexcolor}
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full border"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.secondaryText + '40'
              }}
            />
          )}
        </div>
      )}

      {/* Sequence & Actions - For contact-based, only show Actions */}
      <div className="flex items-center justify-between">
        {/* Sequence - ONLY show for non-contact-based resources */}
        {!behavior.isContactBased && (
          <span
            className="transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            {resource.sequence_no ? `#${resource.sequence_no}` : '-'}
          </span>
        )}

        {/* Actions */}
        <div className={cn(
          "flex items-center gap-1",
          behavior.isContactBased ? "ml-auto" : ""
        )}>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="transition-colors hover:opacity-80"
              style={{
                borderColor: colors.brand.primary + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.brand.primary
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="transition-colors hover:opacity-80"
              style={{
                borderColor: colors.semantic.error + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.semantic.error
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default ResourceCard;
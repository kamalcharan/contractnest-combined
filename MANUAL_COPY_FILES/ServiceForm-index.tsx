// src/components/catalog/ServiceForm/index.tsx
// ✅ FIXED: Image buffering - upload on submit with file ID tracking

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign
} from 'lucide-react';

// Import form steps
import BasicInfoStep from './BasicInfoStep';
import ServiceConfigStep from './ServiceConfigStep';

// Import hooks
import { 
  useServiceCatalogOperations,
  useServiceCatalogItem
} from '../../../hooks/queries/useServiceCatalogQueries';

// Import storage hook
import { useStorageManagement } from '../../../hooks/useStorageManagement';

// Import UI components
import ConfirmationDialog from '../../ui/ConfirmationDialog';

// Import types
import { 
  ServiceFormData, 
  ServiceValidationErrors,
  ServiceBasicInfo,
  ServicePricingForm,
  ServiceResourceForm
} from '../../../types/catalog/service';

// Import validation functions
import { 
  validateServiceBasicInfo,
  validateServiceConfiguration,
  generateSKU
} from '../../../utils/catalog/validationSchemas';

interface ServiceFormProps {
  mode: 'create' | 'edit';
  serviceId?: string;
  onSuccess?: (service: any) => void;
  onCancel?: () => void;
}

// Helper function to check if there are validation errors
const hasValidationErrors = (errors: ServiceValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

const ServiceForm: React.FC<ServiceFormProps> = ({
  mode,
  serviceId,
  onSuccess,
  onCancel
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    basic_info: {
      service_name: '',
      sku: '',
      description: '',
      terms: '',
      image: null,
      image_url: '',
      old_image_url: '',
      old_image_file_id: ''
    },
    service_type: 'independent',
    pricing_records: [],
    resource_requirements: []
  });

  // Validation states
  const [validationErrors, setValidationErrors] = useState<ServiceValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // API hooks
  const {
    createService,
    updateService,
    isCreating,
    isUpdating
  } = useServiceCatalogOperations();

  const { 
    data: existingServiceData, 
    isLoading: isLoadingService,
    error: loadServiceError 
  } = useServiceCatalogItem(serviceId || null);

  // ✅ Storage hook for image upload/delete
  const {
    uploadFile,
    deleteFile,
    isSubmitting: isUploadingImage
  } = useStorageManagement();

  // Get existing service data
  const existingService = existingServiceData;

  // Loading states
  const isSaving = isCreating || isUpdating || isUploadingImage;
  const isLoading = isLoadingService && mode === 'edit';

  // Load existing service data for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingService && !isLoading) {
      console.log('📝 Loading existing service for edit:', {
        serviceId: existingService.id,
        serviceName: existingService.service_name,
        hasImage: !!existingService.metadata?.image_url,
        imageUrl: existingService.metadata?.image_url,
        imageFileId: existingService.metadata?.image_file_id
      });

      // ✅ PRODUCTION FIX: Transform resource_requirements to include resource_name for edit mode
      const transformedResourceRequirements = (existingService.resource_requirements || []).map(req => ({
        ...req,
        // Ensure resource_name is populated from nested resource object
        resource_name: req.resource?.display_name || req.resource?.name || undefined
      }));

      setFormData({
        basic_info: {
          service_name: existingService.service_name || '',
          sku: existingService.sku || '',
          description: existingService.description || '',
          terms: existingService.terms || '',
          image: null, // Don't populate file object
          image_url: existingService.metadata?.image_url || '',
          old_image_url: '',
          old_image_file_id: ''
        },
        service_type: existingService.service_type || 'independent',
        pricing_records: existingService.pricing_records || [],
        resource_requirements: transformedResourceRequirements,
        metadata: existingService.metadata
      });
      setHasUnsavedChanges(false);
    }
  }, [mode, existingService, isLoading]);

  // Auto-generate SKU when service name changes (create mode only)
  useEffect(() => {
    if (mode === 'create' && formData.basic_info.service_name && !formData.basic_info.sku) {
      const generatedSKU = generateSKU(formData.basic_info.service_name);
      setFormData(prev => ({
        ...prev,
        basic_info: {
          ...prev.basic_info,
          sku: generatedSKU
        }
      }));
    }
  }, [mode, formData.basic_info.service_name, formData.basic_info.sku]);

  // Track unsaved changes
  useEffect(() => {
    if (mode === 'create' || (mode === 'edit' && existingService)) {
      setHasUnsavedChanges(true);
    }
  }, [formData, mode, existingService]);

  // Form step configuration
  const steps = [
    {
      id: 1,
      title: 'Basic Information',
      subtitle: 'Service details and description',
      icon: FileText,
      isValid: () => !hasValidationErrors(validateServiceBasicInfo(formData.basic_info))
    },
    {
      id: 2,
      title: 'Configuration & Pricing',
      subtitle: 'Service type and pricing setup',
      icon: DollarSign,
      isValid: () => !hasValidationErrors(validateServiceConfiguration(formData))
    }
  ];

  // Update form data
  const updateFormData = useCallback((updates: Partial<ServiceFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    setIsValidating(true);
    
    let errors: ServiceValidationErrors = {};
    
    if (currentStep === 1) {
      errors = validateServiceBasicInfo(formData.basic_info);
    } else if (currentStep === 2) {
      errors = validateServiceConfiguration(formData);
    }
    
    setValidationErrors(errors);
    setIsValidating(false);
    
    return !hasValidationErrors(errors);
  }, [currentStep, formData]);

  // Navigate to next step
  const handleNextStep = useCallback(() => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [currentStep, steps.length, validateCurrentStep]);

  // Navigate to previous step
  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // ✅ NEW: Handle image upload and deletion
  const handleImageUpload = useCallback(async (): Promise<{ imageUrl: string; imageFileId: string } | null> => {
    // Check if there's a buffered image to upload
    if (!formData.basic_info.image) {
      // No new image, return existing data if any
      if (formData.basic_info.image_url) {
        return {
          imageUrl: formData.basic_info.image_url,
          imageFileId: formData.metadata?.image_file_id || ''
        };
      }
      return null;
    }

    console.log('📤 Uploading buffered image...');

    try {
      // Upload the image
      const uploadedFile = await uploadFile(
        formData.basic_info.image,
        'service_images',
        {
          service_name: formData.basic_info.service_name,
          upload_context: 'service_catalog'
        }
      );

      console.log('✅ Image uploaded:', {
        fileId: uploadedFile.id,
        downloadUrl: uploadedFile.download_url
      });

      // Delete old image if we're replacing one
      if (formData.basic_info.old_image_file_id) {
        console.log('🗑️ Deleting old image:', formData.basic_info.old_image_file_id);
        try {
          await deleteFile(formData.basic_info.old_image_file_id);
          console.log('✅ Old image deleted');
        } catch (deleteError) {
          console.error('⚠️ Failed to delete old image (non-critical):', deleteError);
          // Continue anyway - don't block service save if old image delete fails
        }
      }

      return {
        imageUrl: uploadedFile.download_url,
        imageFileId: uploadedFile.id
      };
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  }, [formData.basic_info, formData.metadata, uploadFile, deleteFile]);

  // ✅ UPDATED: Handle form submission with image upload
  const handleSubmit = useCallback(async () => {
    // Validate all steps
    const basicInfoErrors = validateServiceBasicInfo(formData.basic_info);
    const configErrors = validateServiceConfiguration(formData);
    const allErrors = { ...basicInfoErrors, ...configErrors };

    if (hasValidationErrors(allErrors)) {
      setValidationErrors(allErrors);
      console.log('❌ Validation errors:', allErrors);
      return;
    }

    try {
      // ✅ Step 1: Upload image if needed (or delete if removed)
      let imageData: { imageUrl: string; imageFileId: string } | null = null;
      
      if (formData.basic_info.image) {
        // New image to upload
        imageData = await handleImageUpload();
      } else if (formData.basic_info.image_url) {
        // Keeping existing image
        imageData = {
          imageUrl: formData.basic_info.image_url,
          imageFileId: formData.metadata?.image_file_id || ''
        };
      } else if (formData.basic_info.old_image_file_id) {
        // Image was removed - delete old image
        console.log('🗑️ Deleting removed image:', formData.basic_info.old_image_file_id);
        try {
          await deleteFile(formData.basic_info.old_image_file_id);
          console.log('✅ Removed image deleted');
        } catch (deleteError) {
          console.error('⚠️ Failed to delete removed image (non-critical):', deleteError);
        }
      }

      console.log('📤 Submitting service:', {
        mode,
        serviceId,
        serviceName: formData.basic_info.service_name,
        hasImage: !!imageData,
        imageUrl: imageData?.imageUrl,
        imageFileId: imageData?.imageFileId,
        pricingRecordsCount: formData.pricing_records.length,
        resourceRequirementsCount: formData.resource_requirements.length
      });

      // ✅ Step 2: Build payload with image data in metadata
      const basePayload = {
        service_name: formData.basic_info.service_name,
        sku: formData.basic_info.sku,
        description: formData.basic_info.description,
        terms: formData.basic_info.terms,
        category_id: null,
        industry_id: null,
        service_type: formData.service_type,
        pricing_records: formData.pricing_records,
        resource_requirements: formData.resource_requirements,
        metadata: {
          ...(formData.metadata || {}),
          ...(imageData && {
            image_url: imageData.imageUrl,
            image_file_id: imageData.imageFileId
          })
        }
      };

      let result;
      
      if (mode === 'create') {
        result = await createService(basePayload);
        
        console.log('✅ Service created successfully:', {
          serviceId: result?.id,
          serviceName: result?.service_name,
          status: result?.status,
          hasImage: !!result?.metadata?.image_url
        });
      } else if (mode === 'edit' && serviceId) {
        result = await updateService({
          serviceId,
          serviceData: basePayload
        });
        
        console.log('✅ Service updated successfully:', {
          serviceId: result?.id,
          serviceName: result?.service_name,
          status: result?.status,
          hasImage: !!result?.metadata?.image_url
        });
      }
      
      // Success callback
      if (result && onSuccess) {
        onSuccess(result);
      }
      
      setHasUnsavedChanges(false);
      
      // Navigate to catalog page
      navigate('/catalog');
      
    } catch (error) {
      console.error('❌ Form submission error:', error);
      
      // Set validation errors if the API returns validation errors
      if (error && typeof error === 'object' && 'validationErrors' in error) {
        setValidationErrors((error as any).validationErrors);
      }
      
      // Show error message
      throw error;
    }
  }, [
    formData, 
    mode, 
    serviceId, 
    createService, 
    updateService, 
    handleImageUpload,
    deleteFile,
    onSuccess, 
    navigate
  ]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      onCancel?.();
      navigate('/catalog');
    }
  }, [hasUnsavedChanges, onCancel, navigate]);

  // Confirm cancel with unsaved changes
  const confirmCancel = useCallback(() => {
    setShowCancelDialog(false);
    onCancel?.();
    navigate('/catalog');
  }, [onCancel, navigate]);

  // Show loading state for edit mode
  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center">
          <Clock 
            className="h-8 w-8 animate-spin mx-auto mb-4"
            style={{ color: colors.brand.primary }}
          />
          <p style={{ color: colors.utility.primaryText }}>Loading service data...</p>
        </div>
      </div>
    );
  }

  // Show error state for edit mode
  if (mode === 'edit' && loadServiceError) {
    return (
      <div 
        className="min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div 
            className="rounded-lg border p-12 text-center"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.semantic.error + '40'
            }}
          >
            <AlertTriangle 
              className="h-16 w-16 mx-auto mb-4"
              style={{ color: colors.semantic.error }}
            />
            <h3 
              className="text-lg font-medium mb-2"
              style={{ color: colors.semantic.error }}
            >
              Cannot Load Service
            </h3>
            <p 
              className="mb-6"
              style={{ color: colors.utility.secondaryText }}
            >
              {loadServiceError?.message || "The service you're trying to edit cannot be loaded."}
            </p>
            <button 
              onClick={handleCancel}
              className="px-4 py-2 rounded-md transition-colors"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div 
        className="border-b px-4 py-4 md:px-6 md:py-6"
        style={{ borderColor: colors.utility.primaryText + '20' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 rounded-md hover:opacity-80 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div>
              <h1 
                className="text-2xl font-bold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                {mode === 'create' ? 'Create New Service' : 'Edit Service'}
              </h1>
              <p 
                className="text-sm mt-1 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {mode === 'create' 
                  ? 'Add a new service to your catalog'
                  : `Editing: ${formData.basic_info.service_name || 'Service'}`
                }
              </p>
            </div>
          </div>

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <AlertTriangle 
                className="h-4 w-4"
                style={{ color: colors.semantic.warning }}
              />
              <span 
                className="text-sm"
                style={{ color: colors.semantic.warning }}
              >
                Unsaved changes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div 
        className="px-4 py-6 md:px-6 border-b"
        style={{ borderColor: colors.utility.primaryText + '20' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isValid = step.isValid();
              const IconComponent = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-3">
                    {/* Step Icon */}
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted 
                          ? colors.semantic.success
                          : isActive 
                            ? colors.brand.primary
                            : colors.utility.secondaryBackground,
                        '--tw-ring-color': colors.brand.primary,
                        border: `1px solid ${isCompleted || isActive 
                          ? 'transparent' 
                          : colors.utility.primaryText + '40'}`
                      } as React.CSSProperties}
                    >
                      {isCompleted ? (
                        <CheckCircle 
                          className="h-5 w-5"
                          style={{ color: '#ffffff' }}
                        />
                      ) : (
                        <IconComponent 
                          className="h-5 w-5"
                          style={{ 
                            color: isActive 
                              ? '#ffffff' 
                              : colors.utility.primaryText 
                          }}
                        />
                      )}
                    </div>

                    {/* Step Info */}
                    <div className="hidden sm:block">
                      <h3 
                        className={`text-sm font-medium transition-colors ${
                          isActive ? 'font-semibold' : ''
                        }`}
                        style={{ 
                          color: isActive 
                            ? colors.brand.primary 
                            : isCompleted 
                              ? colors.semantic.success
                              : colors.utility.primaryText
                        }}
                      >
                        {step.title}
                      </h3>
                      <p 
                        className="text-xs transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {step.subtitle}
                      </p>
                    </div>

                    {/* Validation Status */}
                    {!isCompleted && isActive && !isValid && Object.keys(validationErrors).length > 0 && (
                      <AlertTriangle 
                        className="h-4 w-4 ml-2"
                        style={{ color: colors.semantic.error }}
                      />
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div 
                      className="flex-1 h-0.5 mx-4"
                      style={{ 
                        backgroundColor: currentStep > step.id 
                          ? colors.semantic.success
                          : colors.utility.primaryText + '20'
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-4 py-6 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <BasicInfoStep
              data={formData.basic_info}
              errors={validationErrors}
              isValidating={isValidating}
              onChange={(basicInfo: ServiceBasicInfo) => updateFormData({ basic_info: basicInfo })}
            />
          )}

          {/* Step 2: Service Configuration */}
          {currentStep === 2 && (
            <ServiceConfigStep
              serviceType={formData.service_type}
              pricingRecords={formData.pricing_records}
              resourceRequirements={formData.resource_requirements}
              errors={validationErrors}
              isValidating={isValidating}
              onChange={(updates: {
                service_type?: 'independent' | 'resource_based';
                pricing_records?: ServicePricingForm[];
                resource_requirements?: ServiceResourceForm[];
              }) => updateFormData(updates)}
            />
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div 
        className="border-t px-4 py-4 md:px-6"
        style={{ 
          borderColor: colors.utility.primaryText + '20',
          backgroundColor: colors.utility.secondaryBackground
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Previous Button */}
          <button
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: colors.utility.primaryText + '40',
              color: colors.utility.primaryText,
              backgroundColor: 'transparent'
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {/* Next/Save Button */}
          {currentStep < steps.length ? (
            <button
              onClick={handleNextStep}
              disabled={isValidating}
              className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSaving || isValidating}
              className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              style={{
                backgroundColor: colors.semantic.success,
                color: '#ffffff'
              }}
            >
              {isSaving ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === 'create' ? 'Create Service' : 'Update Service'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={confirmCancel}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to cancel? All changes will be lost."
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        variant="danger"
      />
    </div>
  );
};

export default ServiceForm;
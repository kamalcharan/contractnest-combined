// src/pages/catalog/view.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  ChevronLeft,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Package,
  Users,
  DollarSign,
  FileText,
  Calendar,
  User,
  Settings,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Share,
  Image as ImageIcon,
  Building2,
  Phone,
  Mail
} from 'lucide-react';

// Import components
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';

// FIXED: Import real hooks
import { 
  useServiceCatalogItem,
  useServiceCatalogOperations
} from '../../hooks/queries/useServiceCatalogQueries';

// Import utilities
import { analyticsService } from '@/services/analytics.service';
import { captureException } from '@/utils/sentry';
import { 
  formatCurrencyAmount, 
  calculateTotalWithTax,
  calculateTaxAmount 
} from '../../utils/catalog/validationSchemas';

// Import types
import { Service } from '../../types/catalog/service';

const ServiceViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // FIXED: Real API hooks
  const { 
    data: serviceData, 
    isLoading, 
    error, 
    refetch 
  } = useServiceCatalogItem(serviceId);

  const { 
    deleteService,
    isDeleting 
  } = useServiceCatalogOperations();

  // Get service data
  const service = serviceData;

  // Track page view
  useEffect(() => {
    if (serviceId) {
      try {
        analyticsService.trackPageView('catalog/view', 'Service View Page', {
          service_id: serviceId
        });
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    }
  }, [serviceId]);

  // Redirect if no service ID
  useEffect(() => {
    if (!serviceId) {
      navigate('/catalog', { replace: true });
    }
  }, [serviceId, navigate]);

  // Get status configuration
  const getStatusConfig = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return {
          color: colors.semantic.success,
          icon: CheckCircle,
          label: 'Active'
        };
      case 'inactive':
        return {
          color: colors.semantic.warning,
          icon: XCircle,
          label: 'Inactive'
        };
      case 'draft':
        return {
          color: colors.utility.secondaryText,
          icon: Clock,
          label: 'Draft'
        };
      default:
        return {
          color: colors.utility.secondaryText,
          icon: AlertTriangle,
          label: status
        };
    }
  }, [colors]);

  // Get service type configuration
  const getServiceTypeConfig = useCallback((serviceType: string) => {
    switch (serviceType) {
      case 'independent':
        return {
          icon: Package,
          label: 'Independent Service',
          description: 'Standalone service with simple pricing'
        };
      case 'resource_based':
        return {
          icon: Users,
          label: 'Resource-Based Service',
          description: 'Service requiring specific resources'
        };
      default:
        return {
          icon: Package,
          label: 'Service',
          description: 'Service'
        };
    }
  }, []);

  // FIXED: Handle edit - Updated navigation
  const handleEdit = useCallback(() => {
    if (serviceId) {
      navigate(`/catalog/catalogService-form?id=${serviceId}`);
    }
  }, [serviceId, navigate]);

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    if (service) {
      try {
        analyticsService.trackEvent('service_duplicate_initiated', {
          service_id: service.id,
          service_name: service.service_name
        });
        
        toast({
          title: "Duplicate Service",
          description: "Service duplication feature will be implemented soon",
        });
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    }
  }, [service, toast]);

  // FIXED: Handle delete with real API
  const handleDelete = useCallback(async () => {
    if (!serviceId || !service) return;

    try {
      await deleteService(serviceId);
      
      toast({
        title: "Service Deleted",
        description: `"${service.service_name}" has been deleted from your catalog`,
      });

      navigate('/catalog', { replace: true });
    } catch (error) {
      captureException(error, {
        tags: { component: 'ServiceViewPage', action: 'handleDelete' },
        extra: { serviceId, serviceName: service.service_name }
      });
      
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the service. Please try again.",
      });
    }
  }, [serviceId, service, deleteService, toast, navigate]);

  // Handle share
  const handleShare = useCallback(() => {
    if (service) {
      try {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        
        toast({
          title: "Link Copied",
          description: "Service link has been copied to clipboard",
        });

        analyticsService.trackEvent('service_shared', {
          service_id: service.id,
          service_name: service.service_name
        });
      } catch (error) {
        console.error('Share error:', error);
        toast({
          variant: "destructive",
          title: "Share Failed",
          description: "Could not copy link to clipboard",
        });
      }
    }
  }, [service, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-md"
                  style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                />
                <div>
                  <div 
                    className="h-8 w-64 rounded mb-2"
                    style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                  />
                  <div 
                    className="h-4 w-32 rounded"
                    style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                  />
                </div>
              </div>
              <div 
                className="h-10 w-32 rounded"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              />
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i}
                    className="rounded-lg border p-6"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: colors.utility.primaryText + '20'
                    }}
                  >
                    <div 
                      className="h-6 w-32 rounded mb-4"
                      style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                    />
                    <div className="space-y-3">
                      <div 
                        className="h-4 rounded"
                        style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                      />
                      <div 
                        className="h-4 w-3/4 rounded"
                        style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div 
                  className="rounded-lg border p-6"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <div 
                    className="h-48 rounded mb-4"
                    style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                  />
                  <div className="space-y-3">
                    <div 
                      className="h-4 rounded"
                      style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                    />
                    <div 
                      className="h-4 w-2/3 rounded"
                      style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !service) {
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
              Service Not Found
            </h3>
            <p 
              className="mb-6"
              style={{ color: colors.utility.secondaryText }}
            >
              {error?.message || "The service you're looking for doesn't exist or has been deleted."}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => navigate('/catalog')}
                className="px-4 py-2 rounded-md border transition-colors"
                style={{
                  borderColor: colors.utility.primaryText + '40',
                  color: colors.utility.primaryText,
                  backgroundColor: 'transparent'
                }}
              >
                Back to Catalog
              </button>
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 rounded-md transition-colors"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(service.status || 'draft');
  const serviceTypeConfig = getServiceTypeConfig(service.service_type);

  return (
    <div 
      className="min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/catalog')}
              className="p-2 rounded-md hover:opacity-80 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 
                  className="text-2xl font-bold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {service.service_name}
                </h1>
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: statusConfig.color + '20',
                    borderColor: statusConfig.color + '40',
                    color: statusConfig.color
                  }}
                >
                  <statusConfig.icon className="h-3 w-3" />
                  {statusConfig.label}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                {service.sku && (
                  <span 
                    className="font-mono transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    SKU: {service.sku}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <serviceTypeConfig.icon 
                    className="h-4 w-4"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <span 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {serviceTypeConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar 
                    className="h-4 w-4"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <span 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Created {new Date(service.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="flex items-center px-3 py-2 rounded-md border hover:opacity-80 transition-colors"
              style={{
                borderColor: colors.utility.primaryText + '40',
                color: colors.utility.primaryText,
                backgroundColor: 'transparent'
              }}
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </button>
            
            <button 
              onClick={handleEdit}
              className="flex items-center px-4 py-2 rounded-md hover:opacity-90 transition-colors"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Service
            </button>

            {/* More Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-md border hover:opacity-80 transition-colors"
                style={{
                  borderColor: colors.utility.primaryText + '40',
                  color: colors.utility.primaryText,
                  backgroundColor: 'transparent'
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              
              {showDropdown && (
                <div 
                  className="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg border z-20"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        handleDuplicate();
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Copy className="h-3 w-3" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        toast({
                          title: "Feature Coming Soon",
                          description: "Export functionality will be available soon"
                        });
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowDeleteDialog(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                      style={{ color: colors.semantic.error }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Description */}
            <div 
              className="rounded-lg border p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <h2 
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: colors.utility.primaryText }}
              >
                <FileText className="h-5 w-5" />
                Description
              </h2>
              <div 
                className="prose prose-sm max-w-none transition-colors"
                style={{ color: colors.utility.secondaryText }}
                dangerouslySetInnerHTML={{ __html: service.description || 'No description provided.' }}
              />
            </div>

            {/* Terms & Conditions */}
            {service.terms && (
              <div 
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  <Settings className="h-5 w-5" />
                  Terms & Conditions
                </h2>
                <div 
                  className="prose prose-sm max-w-none transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                  dangerouslySetInnerHTML={{ __html: service.terms }}
                />
              </div>
            )}

            {/* Resource Requirements */}
            {service.service_type === 'resource_based' && service.resource_requirements && service.resource_requirements.length > 0 && (
              <div 
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  <Users className="h-5 w-5" />
                  Resource Requirements
                </h2>
                <div className="space-y-3">
                  {service.resource_requirements.map((requirement, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '20'
                      }}
                    >
                      <div className="flex-1">
                        <h3 
                          className="font-medium"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {requirement.resource_name || 'Resource'}
                        </h3>
                        <p 
                          className="text-sm"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {requirement.description || 'No description available'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span 
                          className="text-lg font-semibold"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {requirement.quantity}x
                        </span>
                        <p 
                          className="text-xs"
                          style={{ color: requirement.is_required ? colors.semantic.error : colors.utility.secondaryText }}
                        >
                          {requirement.is_required ? 'Required' : 'Optional'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Information */}
            {service.pricing_records && service.pricing_records.length > 0 && (
              <div 
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  <DollarSign className="h-5 w-5" />
                  Pricing Information
                </h2>
                <div className="space-y-4">
                  {service.pricing_records.map((pricing, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '20'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="font-medium"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {pricing.price_type || 'Standard Pricing'}
                        </span>
                        <span 
                          className="text-lg font-bold"
                          style={{ color: colors.brand.primary }}
                        >
                          {formatCurrencyAmount(pricing.amount, pricing.currency)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span 
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Tax: {pricing.tax_inclusion === 'inclusive' ? 'Included' : 'Additional'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Service Image */}
            <div 
              className="rounded-lg border p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.service_name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              ) : (
                <div 
                  className="w-full h-48 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: colors.utility.primaryBackground }}
                >
                  <ImageIcon 
                    className="h-12 w-12"
                    style={{ color: colors.utility.secondaryText }}
                  />
                </div>
              )}
              
              <h3 
                className="font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Service Details
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Type:</span>
                  <span style={{ color: colors.utility.primaryText }}>{serviceTypeConfig.label}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Status:</span>
                  <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
                </div>
                {service.sku && (
                  <div className="flex justify-between">
                    <span style={{ color: colors.utility.secondaryText }}>SKU:</span>
                    <span 
                      className="font-mono"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {service.sku}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Created:</span>
                  <span style={{ color: colors.utility.primaryText }}>
                    {new Date(service.created_at).toLocaleDateString()}
                  </span>
                </div>
                {service.updated_at && (
                  <div className="flex justify-between">
                    <span style={{ color: colors.utility.secondaryText }}>Updated:</span>
                    <span style={{ color: colors.utility.primaryText }}>
                      {new Date(service.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div 
              className="rounded-lg border p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <h3 
                className="font-medium mb-4"
                style={{ color: colors.utility.primaryText }}
              >
                Quick Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign 
                      className="h-4 w-4"
                      style={{ color: colors.utility.secondaryText }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Pricing Records
                    </span>
                  </div>
                  <span 
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {service.pricing_records?.length || 0}
                  </span>
                </div>
                
                {service.service_type === 'resource_based' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users 
                        className="h-4 w-4"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <span 
                        className="text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Resources Required
                      </span>
                    </div>
                    <span 
                      className="font-medium"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {service.resource_requirements?.length || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        description={`Are you sure you want to delete "${service.service_name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        icon={<Trash2 className="h-6 w-6" />}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ServiceViewPage;
// Frontend-src/components/catalog/ServiceCard.tsx
// ✅ FIXED: Boolean status support, removed draft, added onToggleStatus prop

import React, { useState, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Package,
  Users,
  Eye,
  Edit,
  MoreHorizontal,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  Image as ImageIcon,
  Power,
  PowerOff
} from 'lucide-react';

// Import types
import { Service } from '../../types/catalog/service';

// Import utilities
import { formatCurrencyAmount } from '../../utils/catalog/validationSchemas';

interface ServiceCardProps {
  service: Service;
  viewType: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void; // ✅ ADDED: Missing prop
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  viewType,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus // ✅ ADDED
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state for dropdown menu
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ FIXED: Handle boolean status (not string)
  const getStatusConfig = useCallback((status: boolean) => {
    if (status === true) {
      return {
        color: colors.semantic.success,
        icon: CheckCircle,
        label: 'Active',
        bgColor: colors.semantic.success + '20',
        borderColor: colors.semantic.success + '40'
      };
    } else {
      return {
        color: colors.utility.secondaryText,
        icon: XCircle,
        label: 'Inactive',
        bgColor: colors.utility.secondaryText + '20',
        borderColor: colors.utility.secondaryText + '40'
      };
    }
    // ✅ REMOVED: Draft status - no longer exists
  }, [colors]);

  // Get service type configuration
  const getServiceTypeConfig = useCallback((serviceType: string) => {
    switch (serviceType) {
      case 'independent':
        return {
          icon: Package,
          label: 'Individual Service',
          color: colors.brand.primary
        };
      case 'resource_based':
        return {
          icon: Users,
          label: 'Resource-Based Service',
          color: colors.brand.secondary
        };
      default:
        return {
          icon: Package,
          label: 'Service',
          color: colors.utility.primaryText
        };
    }
  }, [colors]);

  // Get primary pricing
  const getPrimaryPricing = useCallback(() => {
    if (!service.pricing_records || service.pricing_records.length === 0) {
      return null;
    }
    
    // Get first active pricing record
    const primaryPricing = service.pricing_records.find(p => p.is_active) || service.pricing_records[0];
    return primaryPricing;
  }, [service.pricing_records]);

  // Format service description for display
  const getDisplayDescription = useCallback(() => {
    if (!service.description) return 'No description available';
    
    // Strip HTML tags and truncate for display
    const plainText = service.description.replace(/<[^>]*>/g, '');
    return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
  }, [service.description]);

  // Get resource count
  const getResourceCount = useCallback(() => {
    return service.resource_requirements?.length || 0;
  }, [service.resource_requirements]);

  const statusConfig = getStatusConfig(service.status);
  const serviceTypeConfig = getServiceTypeConfig(service.service_type);
  const primaryPricing = getPrimaryPricing();
  const resourceCount = getResourceCount();

  // Handle dropdown actions
  const handleDropdownAction = useCallback((action: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowDropdown(false);
    
    switch (action) {
      case 'view':
        onView();
        break;
      case 'edit':
        onEdit();
        break;
      case 'duplicate':
        onDuplicate?.();
        break;
      case 'delete':
        onDelete?.();
        break;
      case 'toggle-status':
        onToggleStatus?.();
        break;
    }
  }, [onView, onEdit, onDuplicate, onDelete, onToggleStatus]);

  // Handle card click
  const handleCardClick = useCallback((event: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    if ((event.target as HTMLElement).closest('button, input, a')) {
      return;
    }
    onView();
  }, [onView]);

  if (viewType === 'grid') {
    // ============================================================================
    // GRID VIEW
    // ============================================================================
    return (
      <div 
        className={`rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer relative ${
          isSelected ? 'ring-2' : ''
        }`}
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20',
          '--tw-ring-color': colors.brand.primary
        } as React.CSSProperties}
        onClick={handleCardClick}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="rounded"
            style={{ accentColor: colors.brand.primary }}
          />
        </div>

        {/* Service Image */}
        <div className="relative">
          {service.image_url ? (
            <img
              src={service.image_url}
              alt={service.service_name}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          ) : (
            <div 
              className="w-full h-48 rounded-t-lg flex items-center justify-center"
              style={{ backgroundColor: colors.utility.primaryBackground }}
            >
              <ImageIcon 
                className="h-12 w-12"
                style={{ color: colors.utility.secondaryText }}
              />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span 
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: statusConfig.bgColor,
                borderColor: statusConfig.borderColor,
                color: statusConfig.color
              }}
            >
              <statusConfig.icon className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Service Name & Type */}
          <div className="mb-3">
            <div className="flex items-start justify-between gap-2">
              <h3 
                className="font-semibold text-lg leading-tight transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                {service.service_name}
              </h3>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-1 hover:opacity-80 rounded transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                
                {/* Dropdown Menu */}
                {showDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                      }}
                    />
                    
                    {/* Menu */}
                    <div 
                      className="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg border z-20"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: colors.utility.primaryText + '20'
                      }}
                    >
                      <div className="py-1">
                        <button
                          onClick={(e) => handleDropdownAction('view', e)}
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button
                          onClick={(e) => handleDropdownAction('edit', e)}
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        
                        {/* ✅ NEW: Toggle Status Option */}
                        {onToggleStatus && (
                          <button
                            onClick={(e) => handleDropdownAction('toggle-status', e)}
                            className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                            style={{ 
                              color: service.status ? colors.semantic.warning : colors.semantic.success 
                            }}
                          >
                            {service.status ? (
                              <>
                                <PowerOff className="h-3 w-3" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-3 w-3" />
                                Activate
                              </>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => handleDropdownAction('duplicate', e)}
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <Copy className="h-3 w-3" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => handleDropdownAction('delete', e)}
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-colors flex items-center gap-2"
                          style={{ color: colors.semantic.error }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* SKU */}
            {service.sku && (
              <p 
                className="text-xs font-mono mt-1 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                SKU: {service.sku}
              </p>
            )}
            
            {/* Service Type */}
            <div className="flex items-center gap-1 mt-2">
              <serviceTypeConfig.icon 
                className="h-3 w-3"
                style={{ color: serviceTypeConfig.color }}
              />
              <span 
                className="text-xs transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {serviceTypeConfig.label}
              </span>
            </div>
          </div>

          {/* Description */}
          <p 
            className="text-sm mb-4 line-clamp-3 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {getDisplayDescription()}
          </p>

          {/* Metadata Row */}
          <div className="flex items-center justify-between mb-4">
            {/* Resource Count */}
            {service.service_type === 'resource_based' && (
              <div className="flex items-center gap-1">
                <Users 
                  className="h-3 w-3"
                  style={{ color: colors.utility.secondaryText }}
                />
                <span 
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {/* Created Date */}
            <div className="flex items-center gap-1 ml-auto">
              <Calendar 
                className="h-3 w-3"
                style={{ color: colors.utility.secondaryText }}
              />
              <span 
                className="text-xs transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {new Date(service.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Pricing & Actions */}
          <div 
            className="flex items-center justify-between pt-3 border-t"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            {/* Pricing */}
            <div>
              {primaryPricing ? (
                <div>
                  <span 
                    className="text-lg font-bold transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    {formatCurrencyAmount(primaryPricing.amount, primaryPricing.currency)}
                  </span>
                  <span 
                    className="text-xs ml-1 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {primaryPricing.tax_inclusion === 'inclusive' ? 'inc. tax' : 'exc. tax'}
                  </span>
                </div>
              ) : (
                <span 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  No pricing set
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="p-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: colors.utility.secondaryText + '20',
                  color: colors.utility.primaryText
                }}
                title="View details"
              >
                <Eye className="h-3 w-3" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff'
                }}
                title="Edit service"
              >
                <Edit className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // ============================================================================
    // LIST VIEW
    // ============================================================================
    return (
      <div 
        className={`rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer ${
          isSelected ? 'ring-2' : ''
        }`}
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20',
          '--tw-ring-color': colors.brand.primary
        } as React.CSSProperties}
        onClick={handleCardClick}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="rounded"
              style={{ accentColor: colors.brand.primary }}
            />

            {/* Service Image */}
            <div className="flex-shrink-0">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.service_name}
                  className="w-16 h-16 object-cover rounded-md"
                />
              ) : (
                <div 
                  className="w-16 h-16 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: colors.utility.primaryBackground }}
                >
                  <ImageIcon 
                    className="h-6 w-6"
                    style={{ color: colors.utility.secondaryText }}
                  />
                </div>
              )}
            </div>

            {/* Service Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  {/* Name & Type */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 
                      className="font-semibold text-lg truncate transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {service.service_name}
                    </h3>
                    <serviceTypeConfig.icon 
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: serviceTypeConfig.color }}
                    />
                  </div>
                  
                  {/* SKU & Status */}
                  <div className="flex items-center gap-3 mb-2">
                    {service.sku && (
                      <span 
                        className="text-xs font-mono transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        SKU: {service.sku}
                      </span>
                    )}
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: statusConfig.bgColor,
                        borderColor: statusConfig.borderColor,
                        color: statusConfig.color
                      }}
                    >
                      <statusConfig.icon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                  
                  {/* Description */}
                  <p 
                    className="text-sm line-clamp-2 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {getDisplayDescription()}
                  </p>
                </div>

                {/* Pricing */}
                <div className="text-right ml-4">
                  {primaryPricing ? (
                    <div>
                      <span 
                        className="text-lg font-bold transition-colors"
                        style={{ color: colors.brand.primary }}
                      >
                        {formatCurrencyAmount(primaryPricing.amount, primaryPricing.currency)}
                      </span>
                      <p 
                        className="text-xs transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {primaryPricing.tax_inclusion === 'inclusive' ? 'inc. tax' : 'exc. tax'}
                      </p>
                    </div>
                  ) : (
                    <span 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      No pricing
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata & Actions */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Metadata */}
              <div className="text-right">
                {service.service_type === 'resource_based' && (
                  <div className="flex items-center gap-1 mb-1">
                    <Users 
                      className="h-3 w-3"
                      style={{ color: colors.utility.secondaryText }}
                    />
                    <span 
                      className="text-xs transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar 
                    className="h-3 w-3"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <span 
                    className="text-xs transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {new Date(service.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* ✅ PRODUCTION FIX: Direct Action Icon Buttons (No dropdown) */}
              <div className="flex gap-1">
                {/* View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                  className="p-1.5 rounded-md transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: colors.utility.secondaryText + '20',
                    color: colors.utility.primaryText
                  }}
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </button>

                {/* Edit Button - Only show if service is ACTIVE */}
                {service.status === true && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-1.5 rounded-md transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: colors.brand.primary + '20',
                      color: colors.brand.primary
                    }}
                    title="Edit service"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}

                {/* Toggle Status Button (Activate/Deactivate) */}
                {onToggleStatus && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus();
                    }}
                    className="p-1.5 rounded-md transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: service.status
                        ? colors.semantic.warning + '20'
                        : colors.semantic.success + '20',
                      color: service.status
                        ? colors.semantic.warning
                        : colors.semantic.success
                    }}
                    title={service.status ? 'Deactivate service' : 'Activate service'}
                  >
                    {service.status ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </button>
                )}

                {/* Duplicate Button - Only show if service is ACTIVE */}
                {service.status === true && onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                    className="p-1.5 rounded-md transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.secondaryText + '20',
                      color: colors.utility.primaryText
                    }}
                    title="Duplicate service"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default ServiceCard;
// src/components/catalog-studio/BlockEditorPanel/index.tsx
// Redesigned as VIEW PANEL - Shows block details in read-only format
// Edit triggers wizard flow, Delete sets is_active=false

import React, { useState } from 'react';
import {
  X, Pencil, Trash2, Copy, MoreVertical,
  Clock, DollarSign, Globe, Tag, Info, Settings, Users,
  MapPin, Calendar, Shield, FileCheck, Package
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES } from '../../../utils/catalog-studio';
import * as LucideIcons from 'lucide-react';

interface BlockEditorPanelProps {
  block: Block | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: Block) => void;  // Keep for compatibility
  onEdit?: (block: Block) => void; // NEW: Opens wizard
  onDelete: (blockId: string) => void;
  onDuplicate: (block: Block) => void;
}

// Helper to format currency
const formatCurrency = (amount: number | undefined, currency: string = 'INR'): string => {
  if (amount === undefined || amount === null) return '-';
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
};

// View-only field component
const ViewField: React.FC<{
  label: string;
  value: React.ReactNode;
  colors: any;
}> = ({ label, value, colors }) => (
  <div className="flex justify-between items-start py-2">
    <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>{label}</span>
    <span className="text-sm text-right max-w-[60%]" style={{ color: colors.utility.primaryText }}>{value || '-'}</span>
  </div>
);

// Section header component
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  colors: any;
}> = ({ icon, title, colors }) => (
  <div className="flex items-center gap-2 py-3 border-b" style={{ borderColor: `${colors.brand.primary}20` }}>
    <span style={{ color: colors.brand.primary }}>{icon}</span>
    <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{title}</span>
  </div>
);

// Badge component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'default';
  colors: any;
}> = ({ children, variant = 'default', colors }) => {
  const variantStyles = {
    primary: { bg: `${colors.brand.primary}15`, color: colors.brand.primary },
    success: { bg: `${colors.semantic.success}15`, color: colors.semantic.success },
    warning: { bg: `${colors.semantic.warning}15`, color: colors.semantic.warning },
    default: { bg: colors.utility.secondaryBackground, color: colors.utility.secondaryText },
  };
  const style = variantStyles[variant];
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {children}
    </span>
  );
};

const BlockEditorPanel: React.FC<BlockEditorPanelProps> = ({
  block,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showActions, setShowActions] = useState(false);

  if (!isOpen || !block) return null;

  const category = BLOCK_CATEGORIES.find((c) => c.id === block.categoryId);
  const IconComponent = category?.icon
    ? (LucideIcons as Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>>)[category.icon]
    : null;

  // Extract data from block
  const meta = block.meta || {};
  const config = block.config || {};

  // Pricing info
  const pricingMode = meta.pricingMode || 'independent';
  const priceType = meta.priceType || config.priceType || 'fixed';
  const pricingRecords = meta.pricingRecords || config.pricingRecords || [];
  const resourcePricingRecords = meta.resourcePricingRecords || config.resourcePricingRecords || [];

  // Service-specific
  const duration = config.duration || meta.duration;
  const deliveryMode = config.deliveryMode || meta.deliveryMode;
  const serviceCycles = config.serviceCycles || meta.serviceCycles;
  const evidence = config.evidence || meta.evidence;

  // Status
  const status = meta.status || config.status || 'active';
  const visible = meta.visible !== 'false' && meta.visible !== false;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(block);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${block.name}"?\n\nThis will deactivate the block.`)) {
      onDelete(block.id);
    }
  };

  return (
    <div
      className="w-96 border-l flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 border-b"
        style={{
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
          background: `linear-gradient(135deg, ${colors.brand.primary}08 0%, ${colors.utility.primaryBackground} 100%)`
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {IconComponent && (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.brand.primary}15` }}
              >
                <IconComponent className="w-6 h-6" style={{ color: colors.brand.primary }} />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold" style={{ color: colors.utility.primaryText }}>
                {block.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="primary" colors={colors}>{category?.name || 'Block'}</Badge>
                <Badge variant={status === 'active' ? 'success' : 'warning'} colors={colors}>
                  {status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: colors.utility.secondaryText }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                  <div
                    className="absolute right-0 top-10 w-44 rounded-xl shadow-lg border z-50 py-1 overflow-hidden"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
                    }}
                  >
                    <button
                      onClick={() => {
                        onDuplicate(block);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Copy className="w-4 h-4" style={{ color: colors.brand.primary }} />
                      Duplicate Block
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      style={{ color: colors.semantic.error }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Block
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: colors.utility.secondaryText }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {block.description && (
          <p className="text-sm mt-2 leading-relaxed" style={{ color: colors.utility.secondaryText }}>
            {block.description}
          </p>
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2">

        {/* Pricing Section */}
        {(block.categoryId === 'service' || block.categoryId === 'spare') && (
          <div className="mb-4">
            <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Pricing" colors={colors} />
            <div className="space-y-1 mt-2">
              <ViewField
                label="Pricing Mode"
                value={<Badge variant="primary" colors={colors}>{pricingMode === 'resource_based' ? 'Resource Based' : 'Independent'}</Badge>}
                colors={colors}
              />
              <ViewField label="Price Type" value={priceType} colors={colors} />
              <ViewField
                label="Base Price"
                value={formatCurrency(block.price, block.currency)}
                colors={colors}
              />

              {/* Multi-currency records */}
              {pricingRecords.length > 0 && (
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
                  <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                    Currency Pricing
                  </span>
                  <div className="mt-2 space-y-1">
                    {pricingRecords.map((record: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span style={{ color: colors.utility.secondaryText }}>{record.currency}</span>
                        <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(record.amount, record.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resource pricing records */}
              {pricingMode === 'resource_based' && resourcePricingRecords.length > 0 && (
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
                  <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                    Resource Pricing
                  </span>
                  <div className="mt-2 space-y-1">
                    {resourcePricingRecords.map((record: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span style={{ color: colors.utility.secondaryText }}>{record.resourceTypeName || 'Resource'}</span>
                        <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(record.pricePerUnit, record.currency)} / {record.pricingModel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Configuration */}
        {block.categoryId === 'service' && (
          <div className="mb-4">
            <SectionHeader icon={<Settings className="w-4 h-4" />} title="Service Configuration" colors={colors} />
            <div className="space-y-1 mt-2">
              {duration && (
                <ViewField
                  label="Duration"
                  value={`${duration.value || duration} ${duration.unit || 'minutes'}`}
                  colors={colors}
                />
              )}
              {deliveryMode && (
                <ViewField
                  label="Delivery Mode"
                  value={<Badge colors={colors}>{deliveryMode}</Badge>}
                  colors={colors}
                />
              )}
              {serviceCycles?.enabled && (
                <ViewField
                  label="Service Cycle"
                  value={`Every ${serviceCycles.days} days`}
                  colors={colors}
                />
              )}
              {evidence && evidence.length > 0 && (
                <ViewField
                  label="Evidence Required"
                  value={evidence.map((e: any) => e.type).join(', ')}
                  colors={colors}
                />
              )}
            </div>
          </div>
        )}

        {/* Spare Configuration */}
        {block.categoryId === 'spare' && (
          <div className="mb-4">
            <SectionHeader icon={<Package className="w-4 h-4" />} title="Product Details" colors={colors} />
            <div className="space-y-1 mt-2">
              {config.sku && <ViewField label="SKU" value={config.sku} colors={colors} />}
              {config.hsn && <ViewField label="HSN Code" value={config.hsn} colors={colors} />}
              {config.brand && <ViewField label="Brand" value={config.brand} colors={colors} />}
              {config.uom && <ViewField label="Unit of Measure" value={config.uom} colors={colors} />}
              {config.inventory && (
                <>
                  <ViewField label="Stock Qty" value={config.inventory.current} colors={colors} />
                  <ViewField label="Reorder Level" value={config.inventory.reorder_level} colors={colors} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Selected Resources */}
        {meta.selectedResources && meta.selectedResources.length > 0 && (
          <div className="mb-4">
            <SectionHeader icon={<Users className="w-4 h-4" />} title="Linked Resources" colors={colors} />
            <div className="mt-2 space-y-2">
              {meta.selectedResources.map((resource: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: colors.utility.secondaryBackground }}
                >
                  <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                    {resource.resource_name}
                  </span>
                  <Badge colors={colors}>Qty: {resource.quantity}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {block.tags && block.tags.length > 0 && (
          <div className="mb-4">
            <SectionHeader icon={<Tag className="w-4 h-4" />} title="Tags" colors={colors} />
            <div className="flex flex-wrap gap-2 mt-3">
              {block.tags.map((tag, idx) => (
                <Badge key={idx} variant="primary" colors={colors}>{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mb-4">
          <SectionHeader icon={<Info className="w-4 h-4" />} title="Block Info" colors={colors} />
          <div className="space-y-1 mt-2">
            <ViewField
              label="Block ID"
              value={<code className="text-xs font-mono">{block.id?.slice(0, 8)}...</code>}
              colors={colors}
            />
            <ViewField label="Icon" value={block.icon} colors={colors} />
            <ViewField
              label="Visible"
              value={visible ? 'Yes' : 'No'}
              colors={colors}
            />
            {meta.created_at && (
              <ViewField
                label="Created"
                value={new Date(meta.created_at).toLocaleDateString()}
                colors={colors}
              />
            )}
            {meta.updated_at && (
              <ViewField
                label="Updated"
                value={new Date(meta.updated_at).toLocaleDateString()}
                colors={colors}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer - Edit Button */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
      >
        <button
          onClick={handleEdit}
          className="w-full px-4 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <Pencil className="w-4 h-4" />
          Edit Block
        </button>
      </div>
    </div>
  );
};

export default BlockEditorPanel;

// src/components/catalog-studio/BlockEditorPanel/index.tsx
// Redesigned as VIEW PANEL - Shows block details in read-only format
// Service blocks: card-per-wizard-step layout showing all captured data
// Edit triggers wizard flow, Delete sets is_active=false

import React, { useState } from 'react';
import {
  X, Pencil, Trash2, Copy, MoreVertical,
  Clock, DollarSign, Globe, Tag, Info, Settings, Users,
  MapPin, Calendar, Shield, FileCheck, Package, Image,
  FileText, RefreshCw, AlertCircle, CheckCircle2,
  Repeat, Eye, CreditCard
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES } from '../../../utils/catalog-studio';
import { sanitizeHtml, stripHtml } from '../../../utils/catalog-studio/htmlUtils';
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
  const symbols: Record<string, string> = { INR: '\u20B9', USD: '$', EUR: '\u20AC', GBP: '\u00A3' };
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

// Wizard Step Card wrapper — each wizard step shown as a distinct card
const StepCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  stepNumber: number;
  colors: any;
  isDarkMode: boolean;
  children: React.ReactNode;
}> = ({ icon, title, stepNumber, colors, isDarkMode, children }) => (
  <div
    className="mb-3 rounded-xl border overflow-hidden"
    style={{
      borderColor: isDarkMode ? `${colors.utility.secondaryBackground}` : '#E5E7EB',
      backgroundColor: colors.utility.primaryBackground,
    }}
  >
    {/* Card Header */}
    <div
      className="px-3 py-2.5 flex items-center gap-2 border-b"
      style={{
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
        background: `linear-gradient(135deg, ${colors.brand.primary}08 0%, transparent 100%)`,
      }}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${colors.brand.primary}15` }}
      >
        <span style={{ color: colors.brand.primary }}>{icon}</span>
      </div>
      <span className="text-xs font-semibold flex-1" style={{ color: colors.utility.primaryText }}>
        {title}
      </span>
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}
      >
        Step {stepNumber}
      </span>
    </div>
    {/* Card Body */}
    <div className="px-3 py-2">
      {children}
    </div>
  </div>
);

// Evidence type label map
const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  'upload-form': 'Upload Form',
  'otp': 'OTP Confirmation',
  'service-form': 'Service Form',
};

// Delivery mode labels
const DELIVERY_MODE_LABELS: Record<string, string> = {
  'on-site': 'On-Site',
  'virtual': 'Virtual',
  'hybrid': 'Hybrid',
};

// Warranty type labels
const WARRANTY_TYPE_LABELS: Record<string, string> = {
  'full': 'Full Coverage',
  'limited': 'Limited',
  'parts_only': 'Parts Only',
  'labor_only': 'Labor Only',
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
  const config = (block as any).config || {};

  // Pricing info
  const pricingMode = meta.pricingMode || 'independent';
  const priceType = meta.priceType || config.priceType || 'fixed';
  const pricingRecords: any[] = (meta as any).pricingRecords || config.pricingRecords || [];
  const resourcePricingRecords: any[] = (meta as any).resourcePricingRecords || config.resourcePricingRecords || [];

  // Service-specific
  const deliveryMode = config.deliveryMode || meta.deliveryMode;
  const serviceCycles = config.serviceCycles || (meta as any).serviceCycles;
  const evidence: any[] = config.evidence || (meta as any).evidence || [];
  const evidenceTypes: string[] = config.evidence_types || (meta as any).evidence_types || [];
  const evidenceRequired = config.evidenceRequired ?? (meta as any).evidenceRequired;

  // Business rules
  const followup = (meta as any).followup;
  const warranty = (meta as any).warranty;
  const requiresDeposit = (meta as any).requiresDeposit;
  const depositPercentage = (meta as any).depositPercentage;

  // Image & terms
  const imageUrl = meta.image_url;
  const terms = meta.terms;

  // Status
  const status = (meta as any).status || config.status || 'active';
  const visible = (meta as any).visible !== 'false' && (meta as any).visible !== false;

  const isService = block.categoryId === 'service';

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

  // ─── SERVICE BLOCK: Card-per-wizard-step layout ───
  const renderServiceCards = () => (
    <>
      {/* ── Card 1: Basic Info (Wizard Step 2) ── */}
      <StepCard
        icon={<Info className="w-3.5 h-3.5" />}
        title="Basic Info"
        stepNumber={1}
        colors={colors}
        isDarkMode={isDarkMode}
      >
        {/* Image */}
        {imageUrl && (
          <div className="mb-3">
            <img
              src={imageUrl}
              alt={block.name}
              className="w-full h-32 object-cover rounded-lg"
              style={{ border: `1px solid ${isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'}` }}
            />
          </div>
        )}

        <ViewField label="Name" value={block.name} colors={colors} />
        <ViewField label="Icon" value={block.icon} colors={colors} />

        {/* Tags */}
        {block.tags && block.tags.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Tags</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {block.tags.map((tag, idx) => (
                <Badge key={idx} variant="primary" colors={colors}>{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {terms && stripHtml(terms) && (
          <div className="pt-2 mt-2 border-t" style={{ borderColor: `${colors.brand.primary}10` }}>
            <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Terms & Conditions</span>
            <div
              className="text-xs mt-1 leading-relaxed [&_p]:m-0 [&_p]:mb-1"
              style={{ color: colors.utility.primaryText }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(terms) }}
            />
          </div>
        )}
      </StepCard>

      {/* ── Card 2: Resources & Dependencies (Wizard Step 3) ── */}
      {(pricingMode === 'resource_based' || ((meta as any).selectedResources && (meta as any).selectedResources.length > 0)) && (
        <StepCard
          icon={<Users className="w-3.5 h-3.5" />}
          title="Resources & Dependencies"
          stepNumber={2}
          colors={colors}
          isDarkMode={isDarkMode}
        >
          <ViewField
            label="Pricing Mode"
            value={
              <Badge variant="primary" colors={colors}>
                {pricingMode === 'resource_based' ? 'Resource Based' : 'Independent'}
              </Badge>
            }
            colors={colors}
          />

          {/* Linked resources list */}
          {(meta as any).selectedResources && (meta as any).selectedResources.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                Linked Resources ({(meta as any).selectedResources.length})
              </span>
              {(meta as any).selectedResources.map((resource: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: colors.utility.secondaryBackground }}
                >
                  <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                    {resource.resource_name}
                  </span>
                  <Badge colors={colors}>Qty: {resource.quantity}</Badge>
                </div>
              ))}
            </div>
          )}
        </StepCard>
      )}

      {/* ── Card 3: Delivery (Wizard Step 4) ── */}
      <StepCard
        icon={<MapPin className="w-3.5 h-3.5" />}
        title="Delivery"
        stepNumber={3}
        colors={colors}
        isDarkMode={isDarkMode}
      >
        <ViewField
          label="Delivery Mode"
          value={
            deliveryMode ? (
              <Badge
                variant={deliveryMode === 'on-site' ? 'primary' : deliveryMode === 'virtual' ? 'success' : 'warning'}
                colors={colors}
              >
                {DELIVERY_MODE_LABELS[deliveryMode] || deliveryMode}
              </Badge>
            ) : '-'
          }
          colors={colors}
        />

        {/* Service Cycles */}
        {serviceCycles?.enabled ? (
          <>
            <ViewField
              label="Recurring Cycles"
              value={<Badge variant="success" colors={colors}>Enabled</Badge>}
              colors={colors}
            />
            <ViewField
              label="Cycle Interval"
              value={`Every ${serviceCycles.days} days`}
              colors={colors}
            />
            {serviceCycles.gracePeriod > 0 && (
              <ViewField
                label="Grace Period"
                value={`${serviceCycles.gracePeriod} days`}
                colors={colors}
              />
            )}
          </>
        ) : (
          <ViewField
            label="Recurring Cycles"
            value={<Badge colors={colors}>Not configured</Badge>}
            colors={colors}
          />
        )}
      </StepCard>

      {/* ── Card 4: Evidence Collection (Wizard Step 5) ── */}
      <StepCard
        icon={<FileCheck className="w-3.5 h-3.5" />}
        title="Evidence Collection"
        stepNumber={4}
        colors={colors}
        isDarkMode={isDarkMode}
      >
        <ViewField
          label="Evidence Required"
          value={
            evidenceRequired ? (
              <Badge variant="success" colors={colors}>Required</Badge>
            ) : (
              <Badge colors={colors}>Optional</Badge>
            )
          }
          colors={colors}
        />

        {/* Evidence types breakdown */}
        {(evidenceTypes.length > 0 || evidence.length > 0) ? (
          <div className="mt-2 space-y-1.5">
            <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
              Collection Methods
            </span>
            {(evidenceTypes.length > 0 ? evidenceTypes : evidence.map((e: any) => e.type)).map((type: string, idx: number) => {
              const eConfig = evidence.find((e: any) => e.type === type);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: colors.utility.secondaryBackground }}
                >
                  <div className="flex items-center gap-2">
                    {type === 'upload-form' && <Eye className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />}
                    {type === 'otp' && <Shield className="w-3.5 h-3.5" style={{ color: colors.semantic.warning }} />}
                    {type === 'service-form' && <FileText className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />}
                    <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                      {EVIDENCE_TYPE_LABELS[type] || type}
                    </span>
                  </div>
                  {eConfig?.config?.required && (
                    <Badge variant="warning" colors={colors}>Required</Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-1">
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              No evidence methods configured
            </span>
          </div>
        )}
      </StepCard>

      {/* ── Card 5: Pricing (Wizard Step 6) ── */}
      <StepCard
        icon={<DollarSign className="w-3.5 h-3.5" />}
        title="Pricing"
        stepNumber={5}
        colors={colors}
        isDarkMode={isDarkMode}
      >
        <ViewField
          label="Price Type"
          value={<Badge variant="primary" colors={colors}>{priceType === 'hourly' ? 'Hourly' : 'Fixed'}</Badge>}
          colors={colors}
        />

        {/* Per-currency price breakdown with taxes */}
        {pricingRecords.length > 0 ? (
          <div className="mt-2 space-y-2">
            {pricingRecords.filter((r: any) => r.is_active !== false).map((record: any, idx: number) => {
              const recTaxes = record.taxes || [];
              const recTotalTaxRate = recTaxes.reduce((s: number, t: any) => s + t.rate, 0);
              const recInclusion = record.tax_inclusion || 'exclusive';
              let subtotal: number, total: number;
              if (recInclusion === 'inclusive') {
                subtotal = record.amount / (1 + recTotalTaxRate / 100);
                total = record.amount;
              } else {
                subtotal = record.amount;
                total = record.amount + (record.amount * recTotalTaxRate) / 100;
              }
              return (
                <div key={idx} className="p-2.5 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
                  {/* Currency header + tax inclusion tag */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>
                      {record.currency}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: recInclusion === 'inclusive' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
                        color: recInclusion === 'inclusive' ? colors.semantic.success : colors.semantic.warning,
                      }}
                    >
                      Tax {recInclusion === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                    </span>
                  </div>
                  {/* Price line */}
                  <div className="flex justify-between text-sm">
                    <span style={{ color: colors.utility.secondaryText }}>Price</span>
                    <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                      {formatCurrency(Math.round(subtotal * 100) / 100, record.currency)}
                    </span>
                  </div>
                  {/* Individual tax lines */}
                  {recTaxes.map((tax: any, tIdx: number) => {
                    const perTaxAmount = recInclusion === 'inclusive'
                      ? (subtotal * tax.rate) / 100
                      : (record.amount * tax.rate) / 100;
                    return (
                      <div key={tIdx} className="flex justify-between text-xs mt-0.5">
                        <span style={{ color: colors.utility.secondaryText }}>
                          {tax.name} ({tax.rate}%)
                        </span>
                        <span style={{ color: colors.utility.secondaryText }}>
                          + {formatCurrency(Math.round(perTaxAmount * 100) / 100, record.currency)}
                        </span>
                      </div>
                    );
                  })}
                  {/* Total line */}
                  {recTaxes.length > 0 && (
                    <div
                      className="flex justify-between text-sm font-bold mt-1.5 pt-1.5 border-t"
                      style={{ borderColor: `${colors.brand.primary}20` }}
                    >
                      <span style={{ color: colors.utility.primaryText }}>Total</span>
                      <span style={{ color: colors.semantic.success }}>
                        {formatCurrency(Math.round(total * 100) / 100, record.currency)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <ViewField
            label="Base Price"
            value={formatCurrency(block.price, block.currency)}
            colors={colors}
          />
        )}

        {/* Resource pricing records */}
        {pricingMode === 'resource_based' && resourcePricingRecords.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
              Resource Pricing
            </span>
            {resourcePricingRecords.map((record: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between items-center p-2 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryBackground }}
              >
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {record.resourceTypeName || 'Resource'}
                </span>
                <span className="text-xs font-medium" style={{ color: colors.brand.primary }}>
                  {formatCurrency(record.pricePerUnit, record.currency)} / {record.pricingModel}
                </span>
              </div>
            ))}
          </div>
        )}
      </StepCard>

      {/* ── Card 6: Business Rules (Wizard Step 7) ── */}
      {(followup?.enabled || warranty?.enabled || requiresDeposit) && (
        <StepCard
          icon={<Shield className="w-3.5 h-3.5" />}
          title="Business Rules"
          stepNumber={6}
          colors={colors}
          isDarkMode={isDarkMode}
        >
          {/* Follow-up Section */}
          {followup?.enabled && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <RefreshCw className="w-3 h-3" style={{ color: colors.brand.primary }} />
                <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>Follow-up</span>
              </div>
              <div
                className="p-2.5 rounded-lg space-y-1"
                style={{ backgroundColor: `${colors.brand.primary}05` }}
              >
                <ViewField
                  label="Free Follow-ups"
                  value={followup.freeFollowups}
                  colors={colors}
                />
                <ViewField
                  label="Valid For"
                  value={`${followup.followupPeriod} ${followup.followupPeriodUnit}`}
                  colors={colors}
                />
                {followup.conditions && followup.conditions.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Conditions:</span>
                    <div className="mt-1 space-y-1">
                      {followup.conditions.filter((c: string) => c.trim()).map((condition: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.success }} />
                          <span className="text-xs" style={{ color: colors.utility.primaryText }}>{condition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warranty Section */}
          {warranty?.enabled && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3 h-3" style={{ color: colors.semantic.success }} />
                <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>Warranty</span>
              </div>
              <div
                className="p-2.5 rounded-lg space-y-1"
                style={{ backgroundColor: `${colors.semantic.success}05` }}
              >
                <ViewField
                  label="Type"
                  value={
                    <Badge variant="success" colors={colors}>
                      {WARRANTY_TYPE_LABELS[warranty.warrantyType] || warranty.warrantyType}
                    </Badge>
                  }
                  colors={colors}
                />
                <ViewField
                  label="Period"
                  value={`${warranty.warrantyPeriod} ${warranty.warrantyPeriodUnit}`}
                  colors={colors}
                />
                {warranty.warrantyTerms && (
                  <div className="pt-1">
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Terms:</span>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: colors.utility.primaryText }}>
                      {warranty.warrantyTerms}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deposit Section */}
          {requiresDeposit && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CreditCard className="w-3 h-3" style={{ color: colors.semantic.warning }} />
                <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>Advance Deposit</span>
              </div>
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: `${colors.semantic.warning}05` }}
              >
                <ViewField
                  label="Deposit Required"
                  value={<Badge variant="warning" colors={colors}>Yes</Badge>}
                  colors={colors}
                />
                {depositPercentage && (
                  <ViewField
                    label="Percentage"
                    value={`${depositPercentage}%`}
                    colors={colors}
                  />
                )}
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* ── Block Info (always shown) ── */}
      <StepCard
        icon={<Info className="w-3.5 h-3.5" />}
        title="Block Info"
        stepNumber={0}
        colors={colors}
        isDarkMode={isDarkMode}
      >
        <ViewField
          label="Block ID"
          value={<code className="text-xs font-mono">{block.id?.slice(0, 8)}...</code>}
          colors={colors}
        />
        <ViewField
          label="Visible"
          value={visible ? 'Yes' : 'No'}
          colors={colors}
        />
        {(meta as any).created_at && (
          <ViewField
            label="Created"
            value={new Date((meta as any).created_at).toLocaleDateString()}
            colors={colors}
          />
        )}
        {(meta as any).updated_at && (
          <ViewField
            label="Updated"
            value={new Date((meta as any).updated_at).toLocaleDateString()}
            colors={colors}
          />
        )}
      </StepCard>
    </>
  );

  // ─── NON-SERVICE BLOCKS: Original section layout ───
  const renderNonServiceSections = () => (
    <>
      {/* Pricing Section (spare blocks) */}
      {block.categoryId === 'spare' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 py-3 border-b" style={{ borderColor: `${colors.brand.primary}20` }}>
            <span style={{ color: colors.brand.primary }}><DollarSign className="w-4 h-4" /></span>
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Pricing</span>
          </div>
          <div className="space-y-1 mt-2">
            <ViewField
              label="Pricing Mode"
              value={<Badge variant="primary" colors={colors}>{pricingMode === 'resource_based' ? 'Resource Based' : 'Independent'}</Badge>}
              colors={colors}
            />
            <ViewField label="Price Type" value={priceType} colors={colors} />
            {pricingRecords.length > 0 ? (
              <div className="mt-3 space-y-3">
                {pricingRecords.filter((r: any) => r.is_active !== false).map((record: any, idx: number) => {
                  const recTaxes = record.taxes || [];
                  const recTotalTaxRate = recTaxes.reduce((s: number, t: any) => s + t.rate, 0);
                  const recInclusion = record.tax_inclusion || 'exclusive';
                  let subtotal: number, total: number;
                  if (recInclusion === 'inclusive') {
                    subtotal = record.amount / (1 + recTotalTaxRate / 100);
                    total = record.amount;
                  } else {
                    subtotal = record.amount;
                    total = record.amount + (record.amount * recTotalTaxRate) / 100;
                  }
                  return (
                    <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>{record.currency}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: recInclusion === 'inclusive' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
                            color: recInclusion === 'inclusive' ? colors.semantic.success : colors.semantic.warning,
                          }}
                        >
                          Tax {recInclusion === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: colors.utility.secondaryText }}>Price</span>
                        <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                          {formatCurrency(Math.round(subtotal * 100) / 100, record.currency)}
                        </span>
                      </div>
                      {recTaxes.map((tax: any, tIdx: number) => {
                        const perTaxAmount = recInclusion === 'inclusive'
                          ? (subtotal * tax.rate) / 100
                          : (record.amount * tax.rate) / 100;
                        return (
                          <div key={tIdx} className="flex justify-between text-xs mt-0.5">
                            <span style={{ color: colors.utility.secondaryText }}>{tax.name} ({tax.rate}%)</span>
                            <span style={{ color: colors.utility.secondaryText }}>
                              + {formatCurrency(Math.round(perTaxAmount * 100) / 100, record.currency)}
                            </span>
                          </div>
                        );
                      })}
                      {recTaxes.length > 0 && (
                        <div
                          className="flex justify-between text-sm font-bold mt-1.5 pt-1.5 border-t"
                          style={{ borderColor: `${colors.brand.primary}20` }}
                        >
                          <span style={{ color: colors.utility.primaryText }}>Total</span>
                          <span style={{ color: colors.semantic.success }}>
                            {formatCurrency(Math.round(total * 100) / 100, record.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ViewField label="Base Price" value={formatCurrency(block.price, block.currency)} colors={colors} />
            )}
            {pricingMode === 'resource_based' && resourcePricingRecords.length > 0 && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: `${colors.brand.primary}05` }}>
                <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Resource Pricing</span>
                <div className="mt-2 space-y-1">
                  {resourcePricingRecords.map((record: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span style={{ color: colors.utility.secondaryText }}>{record.resourceTypeName || 'Resource'}</span>
                      <span className="font-medium" style={{ color: colors.brand.primary }}>
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

      {/* Spare Product Details */}
      {block.categoryId === 'spare' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 py-3 border-b" style={{ borderColor: `${colors.brand.primary}20` }}>
            <span style={{ color: colors.brand.primary }}><Package className="w-4 h-4" /></span>
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Product Details</span>
          </div>
          <div className="space-y-1 mt-2">
            {config.sku && <ViewField label="SKU" value={config.sku} colors={colors} />}
            {meta.sku && !config.sku && <ViewField label="SKU" value={meta.sku} colors={colors} />}
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

      {/* Selected Resources (non-service) */}
      {(meta as any).selectedResources && (meta as any).selectedResources.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 py-3 border-b" style={{ borderColor: `${colors.brand.primary}20` }}>
            <span style={{ color: colors.brand.primary }}><Users className="w-4 h-4" /></span>
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Linked Resources</span>
          </div>
          <div className="mt-2 space-y-2">
            {(meta as any).selectedResources.map((resource: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryBackground }}
              >
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>{resource.resource_name}</span>
                <Badge colors={colors}>Qty: {resource.quantity}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags (non-service) */}
      {block.tags && block.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 py-3 border-b" style={{ borderColor: `${colors.brand.primary}20` }}>
            <span style={{ color: colors.brand.primary }}><Tag className="w-4 h-4" /></span>
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Tags</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {block.tags.map((tag, idx) => (
              <Badge key={idx} variant="primary" colors={colors}>{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Metadata (non-service) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 py-3 border-b" style={{ borderColor: `${colors.brand.primary}20` }}>
          <span style={{ color: colors.brand.primary }}><Info className="w-4 h-4" /></span>
          <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Block Info</span>
        </div>
        <div className="space-y-1 mt-2">
          <ViewField
            label="Block ID"
            value={<code className="text-xs font-mono">{block.id?.slice(0, 8)}...</code>}
            colors={colors}
          />
          <ViewField label="Icon" value={block.icon} colors={colors} />
          <ViewField label="Visible" value={visible ? 'Yes' : 'No'} colors={colors} />
          {(meta as any).created_at && (
            <ViewField label="Created" value={new Date((meta as any).created_at).toLocaleDateString()} colors={colors} />
          )}
          {(meta as any).updated_at && (
            <ViewField label="Updated" value={new Date((meta as any).updated_at).toLocaleDateString()} colors={colors} />
          )}
        </div>
      </div>
    </>
  );

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
        {block.description && stripHtml(block.description) && (
          <div
            className="text-sm mt-2 leading-relaxed [&_p]:m-0 [&_p]:mb-1"
            style={{ color: colors.utility.secondaryText }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.description) }}
          />
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isService ? renderServiceCards() : renderNonServiceSections()}
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

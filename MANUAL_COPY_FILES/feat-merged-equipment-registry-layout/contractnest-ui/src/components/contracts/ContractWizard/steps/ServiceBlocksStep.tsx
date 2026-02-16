// src/components/contracts/ContractWizard/steps/ServiceBlocksStep.tsx
// Step 4: Add Service Blocks - 3-column layout with drag-drop reordering
// Column 1: Block Library | Column 2: Added Blocks | Column 3: Live Preview
// Uses same drag-drop pattern as catalog-studio/template.tsx

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ShoppingCart, Layers, Zap, ChevronDown, Wrench, Package, FileText, File } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { Block } from '@/types/catalogStudio';
import { getCategoryById } from '@/utils/catalog-studio';
import { getCurrencySymbol } from '@/utils/constants/currencies';

// Import shared catalog-studio components
import { BlockLibraryMini, BlockCardConfigurable, FlyByBlockCard, ConfigurableBlock } from '@/components/catalog-studio';
import type { FlyByCategoryId } from '@/components/catalog-studio/BlockLibraryMini';
import { FLYBY_TYPE_CONFIG } from '@/components/catalog-studio/FlyByBlockCard';
import { getCategoryById as getCatById } from '@/utils/catalog-studio/categories';

// Import contract preview panel
import ContractPreviewPanel from '../components/ContractPreviewPanel';

// Contact types
interface Contact {
  id: string;
  contact_type: 'individual' | 'corporate';
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  profile_image_url?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  designation?: string;
  is_primary: boolean;
  contact_channels?: Array<{
    channel_type: string;
    channel_value: string;
    is_primary?: boolean;
  }>;
}

export interface ServiceBlocksStepProps {
  // Blocks state
  selectedBlocks: ConfigurableBlock[];
  currency: string;
  onBlocksChange: (blocks: ConfigurableBlock[]) => void;
  // From previous steps
  contractName: string;
  contractStatus?: string;
  contractDuration?: number; // months
  contractStartDate?: Date | null;
  selectedBuyer?: Contact | null;
  selectedPerson?: ContactPerson | null;
  useCompanyContact?: boolean;
  // RFQ mode - FlyBy only, no library, no pricing
  rfqMode?: boolean;
}

// Format currency
const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
};

const ServiceBlocksStep: React.FC<ServiceBlocksStepProps> = ({
  selectedBlocks,
  currency,
  onBlocksChange,
  contractName,
  contractStatus = 'draft',
  contractDuration = 12,
  contractStartDate,
  selectedBuyer,
  selectedPerson,
  useCompanyContact,
  rfqMode = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // Fetch tenant profile for preview
  const { profile: tenantProfile } = useTenantProfile();

  // Local state
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // FlyBy dropdown state
  const [showFlyByMenu, setShowFlyByMenu] = useState(false);
  const flyByMenuRef = useRef<HTMLDivElement>(null);

  // Close FlyBy menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyByMenuRef.current && !flyByMenuRef.current.contains(e.target as Node)) {
        setShowFlyByMenu(false);
      }
    };
    if (showFlyByMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFlyByMenu]);

  // FlyBy menu options
  const flyByMenuOptions = [
    { type: 'service' as FlyByCategoryId, icon: Wrench, label: 'Service', color: '#3B82F6' },
    { type: 'spare' as FlyByCategoryId, icon: Package, label: 'Spare Part', color: '#F59E0B' },
    { type: 'text' as FlyByCategoryId, icon: FileText, label: 'Text Block', color: '#8B5CF6' },
    { type: 'document' as FlyByCategoryId, icon: File, label: 'Document', color: '#10B981' },
  ];

  // Drag-drop state (same pattern as template.tsx)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // Get selected block IDs for library
  const selectedBlockIds = useMemo(
    () => selectedBlocks.map((b) => b.id),
    [selectedBlocks]
  );

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = selectedBlocks.reduce((sum, b) => sum + b.totalPrice, 0);
    return {
      subtotal,
      count: selectedBlocks.length,
    };
  }, [selectedBlocks]);

  // Add block from library
  const handleAddBlock = useCallback(
    (block: Block) => {
      if (selectedBlockIds.includes(block.id)) {
        addToast({
          type: 'warning',
          title: 'Already added',
          message: `${block.name} is already in your selection`,
        });
        return;
      }

      const category = getCategoryById(block.categoryId);

      // Check if block has service cycles defined (from block creation)
      // If so, use 'custom' cycle with those days; otherwise default to 'prepaid'
      const blockServiceCycles = (block.meta as any)?.serviceCycles;
      const hasCustomCycle = blockServiceCycles?.enabled && blockServiceCycles?.days;
      const defaultCycle = hasCustomCycle ? 'custom' : 'prepaid';
      const customCycleDays = hasCustomCycle ? blockServiceCycles.days : undefined;
      // Pre-fill service cycle interval from block catalog config
      const serviceCycleDays = hasCustomCycle ? blockServiceCycles.days : undefined;

      // Extract tax info from pricing records matching contract currency
      const pricingRecords = ((block.meta as any)?.pricingRecords || (block.config as any)?.pricingRecords || []) as Array<{
        currency: string; amount: number; tax_inclusion: 'inclusive' | 'exclusive';
        taxes: Array<{ name: string; rate: number }>; is_active: boolean;
      }>;
      const matchingRecord = pricingRecords.find(r => r.currency === currency && r.is_active !== false)
        || pricingRecords.find(r => r.is_active !== false)
        || pricingRecords[0];
      const taxes = matchingRecord?.taxes || [];
      const totalTaxRate = taxes.reduce((sum, t) => sum + t.rate, 0);
      const taxInclusion = matchingRecord?.tax_inclusion || 'exclusive';

      // Use the matching record's price if available
      const blockPrice = matchingRecord?.amount ?? block.price ?? 0;

      // Calculate initial total with tax
      const unitPriceWithTax = taxInclusion === 'inclusive'
        ? blockPrice
        : blockPrice + (blockPrice * totalTaxRate / 100);

      // Extract resource metadata (present on fanned-out resource-based blocks)
      const resourceTag = block.meta?.resourceTag as string | undefined;
      const resourceId = block.meta?.resourceId as string | undefined;
      const originalBlockId = block.meta?.originalBlockId as string | undefined;

      const newBlock: ConfigurableBlock = {
        id: block.id,
        name: block.name,
        description: block.description || '',
        icon: block.icon || 'Package',
        quantity: 1,
        cycle: defaultCycle,
        customCycleDays: customCycleDays,
        serviceCycleDays: serviceCycleDays,
        unlimited: false,
        price: blockPrice,
        currency: matchingRecord?.currency || currency,
        totalPrice: Math.round(unitPriceWithTax * 100) / 100,
        categoryName: category?.name || block.categoryId,
        categoryColor: category?.color || '#6B7280',
        categoryBgColor: category?.bgColor,
        categoryId: block.categoryId,
        isFlyBy: false,
        // Resource-based block fields
        resourceId: resourceId,
        resourceName: resourceTag,
        originalBlockId: originalBlockId,
        taxRate: totalTaxRate,
        taxInclusion: taxInclusion,
        taxes: taxes.map(t => ({ name: t.name, rate: t.rate })),
        config: {
          showDescription: false,
        },
      };

      onBlocksChange([...selectedBlocks, newBlock]);
      addToast({
        type: 'success',
        title: 'Block added',
        message: `${block.name} added to contract`,
      });

      // Auto-expand newly added block
      setExpandedBlockId(block.id);
    },
    [selectedBlocks, selectedBlockIds, onBlocksChange, addToast, currency]
  );

  // Add FlyBy block (inline empty block)
  const handleAddFlyByBlock = useCallback(
    (type: FlyByCategoryId) => {
      const typeConfig = FLYBY_TYPE_CONFIG[type as keyof typeof FLYBY_TYPE_CONFIG];
      const category = getCatById(type);
      const flyById = `flyby-${type}-${Date.now()}`;

      const newBlock: ConfigurableBlock = {
        id: flyById,
        name: '',
        description: '',
        icon: category?.icon || 'Package',
        quantity: 1,
        cycle: 'prepaid',
        unlimited: false,
        price: 0,
        currency: currency,
        totalPrice: 0,
        categoryName: typeConfig?.label || type,
        categoryColor: typeConfig?.color || '#6B7280',
        categoryBgColor: typeConfig?.bgColor,
        categoryId: type,
        isFlyBy: true,
        flyByType: type,
        config: {
          showDescription: false,
        },
      };

      onBlocksChange([...selectedBlocks, newBlock]);
      addToast({
        type: 'success',
        title: 'FlyBy block added',
        message: `New ${typeConfig?.label || type} FlyBy block added`,
      });

      // Auto-expand
      setExpandedBlockId(flyById);
    },
    [selectedBlocks, onBlocksChange, addToast, currency]
  );

  // Remove block
  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      const block = selectedBlocks.find((b) => b.id === blockId);
      onBlocksChange(selectedBlocks.filter((b) => b.id !== blockId));

      if (expandedBlockId === blockId) {
        setExpandedBlockId(null);
      }

      if (block) {
        addToast({
          type: 'info',
          title: 'Block removed',
          message: `${block.name} removed from contract`,
        });
      }
    },
    [selectedBlocks, onBlocksChange, expandedBlockId, addToast]
  );

  // Update block configuration
  const handleUpdateBlock = useCallback(
    (blockId: string, updates: Partial<ConfigurableBlock>) => {
      onBlocksChange(
        selectedBlocks.map((block) => {
          if (block.id === blockId) {
            const updated = { ...block, ...updates };
            // Recalculate total price with tax
            const effectivePrice = updated.config?.customPrice ?? updated.price;
            const taxRate = updated.taxRate || 0;
            let unitPrice = effectivePrice;
            if (taxRate > 0 && updated.taxInclusion === 'exclusive') {
              unitPrice = effectivePrice + (effectivePrice * taxRate / 100);
            }
            // For inclusive, effectivePrice already includes tax
            updated.totalPrice = Math.round(
              (updated.unlimited ? unitPrice : unitPrice * updated.quantity) * 100
            ) / 100;
            return updated;
          }
          return block;
        })
      );
    },
    [selectedBlocks, onBlocksChange]
  );

  // Toggle block expansion
  const handleToggleExpand = useCallback((blockId: string) => {
    setExpandedBlockId((prev) => (prev === blockId ? null : blockId));
  }, []);

  // Drag-drop handlers (same pattern as template.tsx)
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    setExpandedBlockId(null); // Collapse during drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (blockId !== draggedBlockId) {
      setDragOverBlockId(blockId);
    }
  }, [draggedBlockId]);

  const handleDragLeave = useCallback(() => {
    setDragOverBlockId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const draggedIndex = selectedBlocks.findIndex((b) => b.id === draggedBlockId);
    const targetIndex = selectedBlocks.findIndex((b) => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder blocks
    const newBlocks = [...selectedBlocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);

    onBlocksChange(newBlocks);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, [draggedBlockId, selectedBlocks, onBlocksChange]);

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="text-center pt-6 pb-4 px-4 flex-shrink-0">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: colors.utility.primaryText }}
        >
          {rfqMode ? 'Define Required Services' : 'Add Service Blocks'}
        </h2>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {rfqMode ? 'Add the services you need quotes for' : 'Select services and configure them for your contract'}
        </p>
      </div>

      {/* 3-Column Layout - fills remaining height */}
      <div className="flex-1 flex gap-4 px-4 pb-6 min-h-0 overflow-hidden">
        {/* Column 1: Block Library (full in contract mode, FlyBy-only in RFQ mode) */}
        <div className="w-[280px] flex-shrink-0" style={{ height: 'calc(100vh - 200px)' }}>
          <BlockLibraryMini
            selectedBlockIds={selectedBlockIds}
            onAddBlock={handleAddBlock}
            maxHeight="calc(100vh - 200px)"
            currency={currency}
            flyByTypes={['service', 'spare', 'text', 'document']}
            onAddFlyByBlock={handleAddFlyByBlock}
            flyByOnly={rfqMode}
          />
        </div>

        {/* Column 2: Added Blocks */}
        <div
          className="flex-1 flex flex-col rounded-xl border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Added Blocks Header with FlyBy Dropdown */}
          <div
            className="p-3 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Added Blocks
              </span>
              {totals.count > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#fff',
                  }}
                >
                  {totals.count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* FlyBy Dropdown */}
              <div className="relative" ref={flyByMenuRef}>
                <button
                  onClick={() => setShowFlyByMenu(!showFlyByMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: `${colors.utility.primaryText}25`,
                    color: colors.utility.primaryText,
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  FlyBy
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFlyByMenu ? 'rotate-180' : ''}`} />
                </button>
                {showFlyByMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-20 py-1 overflow-hidden"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}15`,
                    }}
                  >
                    {flyByMenuOptions.map((opt) => {
                      const OptIcon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => {
                            handleAddFlyByBlock(opt.type);
                            setShowFlyByMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:opacity-80"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${opt.color}15` }}
                          >
                            <OptIcon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                          </div>
                          <span className="font-medium">{opt.label}</span>
                          <Zap className="w-3 h-3 ml-auto" style={{ color: opt.color }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blocks List */}
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            {selectedBlocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <Layers className="w-8 h-8" style={{ color: colors.utility.secondaryText }} />
                </div>
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: colors.utility.primaryText }}
                >
                  No blocks added yet
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {rfqMode ? 'Use the FlyBy button to add services you need quotes for' : 'Add blocks from the library to build your contract'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedBlocks.map((block) => {
                  const isDragging = draggedBlockId === block.id;
                  const isDragOver = dragOverBlockId === block.id;

                  return (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, block.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, block.id)}
                      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-[0.98]' : ''}`}
                      style={{
                        borderTop: isDragOver ? `2px solid ${colors.brand.primary}` : '2px solid transparent',
                      }}
                    >
                      {block.isFlyBy ? (
                        <FlyByBlockCard
                          block={block}
                          isExpanded={expandedBlockId === block.id}
                          isDragging={isDragging}
                          dragHandleProps={{
                            style: { cursor: 'grab' },
                          }}
                          onToggleExpand={handleToggleExpand}
                          onRemove={handleRemoveBlock}
                          onUpdate={handleUpdateBlock}
                          hidePricing={rfqMode}
                        />
                      ) : (
                        <BlockCardConfigurable
                          block={block}
                          isExpanded={expandedBlockId === block.id}
                          isDragging={isDragging}
                          dragHandleProps={{
                            style: { cursor: 'grab' },
                          }}
                          contractDurationDays={contractDuration ? contractDuration * 30 : undefined}
                          onToggleExpand={handleToggleExpand}
                          onRemove={handleRemoveBlock}
                          onUpdate={handleUpdateBlock}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {selectedBlocks.length > 0 && (
            <div
              className="p-3 border-t flex-shrink-0"
              style={{
                borderColor: `${colors.utility.primaryText}10`,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: colors.utility.secondaryText }}>
                  Drag to reorder • Click to configure
                </span>
                <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                  {totals.count} block{totals.count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Live Contract Preview (Sticky) */}
        <div className="w-[360px] flex-shrink-0 sticky top-0 self-start">
          <ContractPreviewPanel
            tenantProfile={tenantProfile}
            selectedBuyer={selectedBuyer}
            selectedPerson={selectedPerson}
            useCompanyContact={useCompanyContact}
            contractName={contractName}
            contractStatus={contractStatus}
            contractDuration={contractDuration}
            contractStartDate={contractStartDate}
            selectedBlocks={selectedBlocks}
            currency={currency}
            hidePricing={rfqMode}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceBlocksStep;

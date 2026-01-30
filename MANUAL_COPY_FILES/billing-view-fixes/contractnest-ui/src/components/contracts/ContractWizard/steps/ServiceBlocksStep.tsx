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
import { BlockLibraryMini, BlockCardConfigurable, ConfigurableBlock } from '@/components/catalog-studio';
import FlyByBlockCard, { FlyByBlockType, FLYBY_TYPE_CONFIG } from '@/components/catalog-studio/FlyByBlockCard';

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
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // Fetch tenant profile for preview
  const { profile: tenantProfile } = useTenantProfile();

  // Local state
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // Drag-drop state (same pattern as template.tsx)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

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
    if (showFlyByMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFlyByMenu]);

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

      const newBlock: ConfigurableBlock = {
        id: block.id,
        name: block.name,
        description: block.description || '',
        icon: block.icon || 'Package',
        quantity: 1,
        cycle: defaultCycle,
        customCycleDays: customCycleDays,
        unlimited: false,
        price: block.price || 0,
        currency: block.currency || currency,
        totalPrice: block.price || 0,
        categoryId: block.categoryId,
        categoryName: category?.name || block.categoryId,
        categoryColor: category?.color || '#6B7280',
        categoryBgColor: category?.bgColor,
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

  // Add FlyBy block
  const handleAddFlyByBlock = useCallback(
    (type: FlyByBlockType) => {
      const typeConfig = FLYBY_TYPE_CONFIG[type];
      const flyById = `flyby-${type}-${Date.now()}`;

      const newBlock: ConfigurableBlock = {
        id: flyById,
        name: '',
        description: '',
        icon: typeConfig.icon.displayName || 'Package',
        quantity: 1,
        cycle: type === 'service' ? 'prepaid' : '',
        unlimited: false,
        price: 0,
        currency: currency,
        totalPrice: 0,
        categoryId: type,
        categoryName: typeConfig.label,
        categoryColor: typeConfig.color,
        categoryBgColor: typeConfig.bgColor,
        isFlyBy: true,
        flyByType: type,
        config: {
          showDescription: false,
        },
      };

      onBlocksChange([...selectedBlocks, newBlock]);
      setShowFlyByMenu(false);
      setExpandedBlockId(flyById);

      addToast({
        type: 'success',
        title: 'FlyBy block added',
        message: `New ${typeConfig.label} FlyBy block added`,
      });
    },
    [selectedBlocks, onBlocksChange, currency, addToast]
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
            // Recalculate total price
            const effectivePrice = updated.config?.customPrice || updated.price;
            updated.totalPrice = updated.unlimited
              ? effectivePrice
              : effectivePrice * updated.quantity;
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

      {/* 3-Column Layout */}
      <div className="flex-1 flex gap-4 px-4 py-4 min-h-0">
        {/* Column 1: Block Library */}
        <div className="w-[280px] flex-shrink-0">
          <BlockLibraryMini
            selectedBlockIds={selectedBlockIds}
            onAddBlock={handleAddBlock}
            maxHeight="calc(100vh - 180px)"
            flyByTypes={['service', 'spare', 'text', 'document']}
            onAddFlyByBlock={handleAddFlyByBlock}
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
          {/* Added Blocks Header */}
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                {formatCurrency(totals.subtotal, currency)}
              </span>
              {/* FlyBy Dropdown */}
              <div className="relative" ref={flyByMenuRef}>
                <button
                  onClick={() => setShowFlyByMenu(!showFlyByMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                  }}
                  title="Add FlyBy Block"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>FlyBy</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showFlyByMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-20 overflow-hidden"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                      borderColor: `${colors.utility.primaryText}15`,
                    }}
                  >
                    <div
                      className="px-3 py-2 border-b"
                      style={{ borderColor: `${colors.utility.primaryText}10` }}
                    >
                      <span
                        className="text-[10px] font-medium uppercase tracking-wide"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Add FlyBy Block
                      </span>
                    </div>
                    {(['service', 'spare', 'text', 'document'] as FlyByBlockType[]).map((type) => {
                      const config = FLYBY_TYPE_CONFIG[type];
                      const TypeIcon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => handleAddFlyByBlock(type)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:opacity-80"
                          style={{
                            color: colors.utility.primaryText,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `${config.color}10`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: config.bgColor }}
                          >
                            <TypeIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
                          </div>
                          <span className="font-medium">{config.label}</span>
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
                  Add blocks from the library or use FlyBy to create inline
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
                        />
                      ) : (
                        <BlockCardConfigurable
                          block={block}
                          isExpanded={expandedBlockId === block.id}
                          isDragging={isDragging}
                          dragHandleProps={{
                            style: { cursor: 'grab' },
                          }}
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
        <div className="w-[450px] flex-shrink-0 sticky top-0 self-start">
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
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceBlocksStep;

// src/components/playground/SellerBuilder.tsx
import React, { useState, useCallback } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  User,
  Send,
  FileText,
  Eye,
  Package,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  X,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PlaygroundBlock, CanvasBlock, PlaygroundLead, ContractData } from './types';
import { EQUIPMENT_AMC_BLOCKS, BLOCK_CATEGORY_STYLES } from './data/dummyBlocks';

interface SellerBuilderProps {
  lead: PlaygroundLead;
  onBack: () => void;
  onSendContract: (contractData: ContractData) => void;
}

// Helper to get Lucide icon
const getIcon = (iconName: string) => {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.Circle;
};

// Format currency
const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const SellerBuilder: React.FC<SellerBuilderProps> = ({ lead, onBack, onSendContract }) => {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [draggedBlock, setDraggedBlock] = useState<PlaygroundBlock | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('service');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check for mobile on resize
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Group blocks by category
  const blocksByCategory = EQUIPMENT_AMC_BLOCKS.reduce((acc, block) => {
    if (!acc[block.categoryId]) acc[block.categoryId] = [];
    acc[block.categoryId].push(block);
    return acc;
  }, {} as Record<string, PlaygroundBlock[]>);

  // Calculate total
  const totalValue = canvasBlocks.reduce((sum, block) => sum + (block.price || 0), 0);

  // Add block to canvas
  const addBlockToCanvas = useCallback((block: PlaygroundBlock) => {
    const canvasBlock: CanvasBlock = {
      ...block,
      canvasId: `${block.id}-${Date.now()}`,
    };
    setCanvasBlocks((prev) => [...prev, canvasBlock]);
  }, []);

  // Remove block from canvas
  const removeBlockFromCanvas = useCallback((canvasId: string) => {
    setCanvasBlocks((prev) => prev.filter((b) => b.canvasId !== canvasId));
  }, []);

  // Drag handlers (desktop)
  const handleDragStart = (e: React.DragEvent, block: PlaygroundBlock) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlock) {
      addBlockToCanvas(draggedBlock);
      setDraggedBlock(null);
    }
  };

  // Send contract
  const handleSendContract = () => {
    if (!customerName.trim() || canvasBlocks.length === 0) return;

    const contractData: ContractData = {
      customerName: customerName.trim(),
      blocks: canvasBlocks,
      totalValue,
      createdAt: new Date().toISOString(),
    };

    onSendContract(contractData);
  };

  const canSend = customerName.trim() && canvasBlocks.length > 0;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900">Contract Builder</h1>
              <p className="text-xs text-slate-500">Equipment AMC</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Preview Toggle */}
            {isMobile && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendContract}
              disabled={!canSend}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                canSend
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Send Contract
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Mobile: Stacked Layout */}
        {isMobile ? (
          <div className="space-y-4">
            {/* Customer Name Input */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Customer Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Block Palette (Accordion) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Block Library
                </h3>
                <p className="text-xs text-slate-500 mt-1">Tap to add blocks</p>
              </div>

              {Object.entries(blocksByCategory).map(([categoryId, blocks]) => {
                const style = BLOCK_CATEGORY_STYLES[categoryId as keyof typeof BLOCK_CATEGORY_STYLES];
                const isExpanded = expandedCategory === categoryId;
                const CategoryIcon = getIcon(style?.icon || 'Circle');

                return (
                  <div key={categoryId} className="border-b border-slate-100 last:border-b-0">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: style?.bgColor }}
                        >
                          <CategoryIcon className="w-4 h-4" style={{ color: style?.color }} />
                        </div>
                        <span className="font-medium text-slate-900">{style?.label}</span>
                        <span className="text-xs text-slate-500">({blocks.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {blocks.map((block) => {
                          const BlockIcon = getIcon(block.icon);
                          return (
                            <button
                              key={block.id}
                              onClick={() => addBlockToCanvas(block)}
                              className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: style?.bgColor }}
                                >
                                  <BlockIcon className="w-5 h-5" style={{ color: style?.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 text-sm">{block.name}</p>
                                  <p className="text-xs text-slate-500 line-clamp-1">{block.description}</p>
                                  {block.price && (
                                    <p className="text-sm font-semibold text-indigo-600 mt-1">
                                      {formatCurrency(block.price)}
                                    </p>
                                  )}
                                </div>
                                <Plus className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Canvas (Selected Blocks) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Your Contract</h3>
                <span className="text-sm font-bold text-indigo-600">
                  {formatCurrency(totalValue)}
                </span>
              </div>

              {canvasBlocks.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No blocks added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Tap blocks above to add them</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {canvasBlocks.map((block) => {
                    const style = BLOCK_CATEGORY_STYLES[block.categoryId as keyof typeof BLOCK_CATEGORY_STYLES];
                    const BlockIcon = getIcon(block.icon);

                    return (
                      <div
                        key={block.canvasId}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: style?.bgColor }}
                        >
                          <BlockIcon className="w-5 h-5" style={{ color: style?.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{block.name}</p>
                          {block.price && (
                            <p className="text-xs text-slate-500">{formatCurrency(block.price)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeBlockFromCanvas(block.canvasId)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile Preview Modal */}
            {showPreview && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-auto">
                  <div className="sticky top-0 bg-white p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Contract Preview</h3>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <ContractPreviewPanel
                    customerName={customerName}
                    blocks={canvasBlocks}
                    totalValue={totalValue}
                    sellerName={lead.name}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Desktop: 3-Column Layout */
          <div className="grid grid-cols-12 gap-4">
            {/* Block Palette */}
            <div className="col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    Block Library
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Drag blocks to canvas</p>
                </div>

                {Object.entries(blocksByCategory).map(([categoryId, blocks]) => {
                  const style = BLOCK_CATEGORY_STYLES[categoryId as keyof typeof BLOCK_CATEGORY_STYLES];
                  const CategoryIcon = getIcon(style?.icon || 'Circle');

                  return (
                    <div key={categoryId} className="p-3 border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon className="w-4 h-4" style={{ color: style?.color }} />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {style?.label}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {blocks.map((block) => {
                          const BlockIcon = getIcon(block.icon);

                          return (
                            <div
                              key={block.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, block)}
                              onDragEnd={handleDragEnd}
                              className="p-2.5 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                            >
                              <div className="flex items-center gap-2.5">
                                <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: style?.bgColor }}
                                >
                                  <BlockIcon className="w-4 h-4" style={{ color: style?.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 text-xs truncate">{block.name}</p>
                                  {block.price && (
                                    <p className="text-xs text-indigo-600 font-semibold">
                                      {formatCurrency(block.price)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas */}
            <div className="col-span-5">
              {/* Customer Name */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`bg-white rounded-xl shadow-sm border-2 border-dashed min-h-[400px] transition-all ${
                  draggedBlock
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-300'
                }`}
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Contract Blocks</h3>
                  <span className="text-sm font-bold text-indigo-600">
                    Total: {formatCurrency(totalValue)}
                  </span>
                </div>

                {canvasBlocks.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Drop blocks here</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Drag blocks from the left panel to build your contract
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {canvasBlocks.map((block) => {
                      const style = BLOCK_CATEGORY_STYLES[block.categoryId as keyof typeof BLOCK_CATEGORY_STYLES];
                      const BlockIcon = getIcon(block.icon);

                      return (
                        <div
                          key={block.canvasId}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: style?.bgColor }}
                            >
                              <BlockIcon className="w-6 h-6" style={{ color: style?.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{block.name}</p>
                                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                                    {block.description}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeBlockFromCanvas(block.canvasId)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex items-center gap-4 mt-2 text-sm">
                                {block.price && (
                                  <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                                    <DollarSign className="w-4 h-4" />
                                    {formatCurrency(block.price)}
                                  </span>
                                )}
                                {block.duration && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    {block.duration} {block.durationUnit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="col-span-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-20">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Live Preview</h3>
                </div>
                <ContractPreviewPanel
                  customerName={customerName}
                  blocks={canvasBlocks}
                  totalValue={totalValue}
                  sellerName={lead.name}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Contract Preview Panel Component
const ContractPreviewPanel: React.FC<{
  customerName: string;
  blocks: CanvasBlock[];
  totalValue: number;
  sellerName: string;
}> = ({ customerName, blocks, totalValue, sellerName }) => {
  const serviceBlocks = blocks.filter((b) => b.categoryId === 'service');
  const spareBlocks = blocks.filter((b) => b.categoryId === 'spare');
  const billingBlocks = blocks.filter((b) => b.categoryId === 'billing');
  const textBlocks = blocks.filter((b) => b.categoryId === 'text');

  return (
    <div className="p-4">
      {/* Contract Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white mb-4">
        <p className="text-xs text-indigo-200 uppercase tracking-wide mb-1">Service Contract</p>
        <p className="font-bold text-lg">{customerName || 'Customer Name'}</p>
        <p className="text-sm text-indigo-200 mt-1">From: {sellerName}</p>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add blocks to see preview</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Services */}
          {serviceBlocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Services ({serviceBlocks.length})
              </p>
              <div className="space-y-1.5">
                {serviceBlocks.map((block) => (
                  <div key={block.canvasId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{block.name}</span>
                    <span className="font-medium text-slate-900">
                      {block.price ? formatCurrency(block.price) : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spare Parts */}
          {spareBlocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Spare Parts ({spareBlocks.length})
              </p>
              <div className="space-y-1.5">
                {spareBlocks.map((block) => (
                  <div key={block.canvasId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{block.name}</span>
                    <span className="font-medium text-slate-900">
                      {block.price ? formatCurrency(block.price) : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing */}
          {billingBlocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Payment Terms
              </p>
              {billingBlocks.map((block) => (
                <p key={block.canvasId} className="text-sm text-slate-700">
                  {block.name}
                </p>
              ))}
            </div>
          )}

          {/* Terms */}
          {textBlocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Terms & Conditions
              </p>
              {textBlocks.map((block) => (
                <p key={block.canvasId} className="text-sm text-slate-700">
                  {block.name}
                </p>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total Value</span>
              <span className="text-xl font-bold text-indigo-600">
                {formatCurrency(totalValue)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Per annum</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerBuilder;

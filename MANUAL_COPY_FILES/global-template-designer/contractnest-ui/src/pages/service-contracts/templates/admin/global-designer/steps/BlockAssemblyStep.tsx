// src/pages/service-contracts/templates/admin/global-designer/steps/BlockAssemblyStep.tsx
// Step 3: Wraps the existing 3-panel designer (BlockLibrary + Canvas + ConfigPanel)

import React, { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import useBlocks from '@/hooks/service-contracts/blocks/useBlocks';
import useTemplateBuilder from '@/hooks/service-contracts/templates/useTemplateBuilder';
import BlockLibrary from '@/components/service-contracts/templates/TemplateDesigner/BlockLibrary';
import TemplateCanvas from '@/components/service-contracts/templates/TemplateDesigner/TemplateCanvas';
import BlockConfigPanel from '@/components/service-contracts/templates/TemplateDesigner/BlockConfigPanel';

// ─── Props ──────────────────────────────────────────────────────────

interface BlockAssemblyStepProps {
  templateBuilder: ReturnType<typeof useTemplateBuilder>;
}

// ─── Component ──────────────────────────────────────────────────────

const BlockAssemblyStep: React.FC<BlockAssemblyStepProps> = ({ templateBuilder }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();

  // UI state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);

  // Blocks data
  const {
    templateBuilderBlocks,
    isLoading: blocksLoading,
    error: blocksError,
  } = useBlocks({ enableTemplateBuilder: true, autoFetch: true });

  // Destructure builder
  const {
    template,
    addBlock,
    removeBlock,
    moveBlock,
    selectBlock,
    selectedBlock,
    updateTemplate,
    handleDragStart: originalDragStart,
    handleDragEnd: originalDragEnd,
    handleDrop: originalDrop,
    canDrop: originalCanDrop,
    getValidationErrors,
  } = templateBuilder;

  const validationErrors = getValidationErrors();

  // ─── Fixed drop handler (same as existing designer) ────────────
  const handleDrop = useCallback((item: any, targetPosition: number) => {
    if (item && !item.type) {
      const variantId = item.id;
      const blockType = item.nodeType || item.node_type || item.blockMaster?.node_type;
      const name = item.name || 'New Block';
      const defaultConfig = item.defaultConfig || item.default_config || {};

      if (variantId && blockType && name) {
        addBlock(variantId, blockType, name, defaultConfig);
        toast({ title: 'Block Added', description: `${name} has been added to your template` });
      } else {
        toast({ variant: 'destructive', title: 'Failed to add block', description: 'Missing required block information' });
      }
    } else if (item?.type === 'block-instance') {
      originalDrop(item, targetPosition);
    } else if (item?.type === 'block-variant') {
      originalDrop(item, targetPosition);
    }
  }, [addBlock, originalDrop, toast]);

  const canDrop = useCallback((item: any, targetPosition: number): boolean => {
    if (item && !item.type) {
      const blockType = item.nodeType || item.node_type || item.blockMaster?.node_type;
      if (blockType) {
        return originalCanDrop({ type: 'block-variant', blockType }, targetPosition);
      }
      return true;
    }
    return originalCanDrop(item, targetPosition);
  }, [originalCanDrop]);

  const handleDragStart = useCallback((item: any) => {
    if (item?.type === 'block-instance') originalDragStart(item);
  }, [originalDragStart]);

  const handleDragEnd = useCallback(() => {
    originalDragEnd();
  }, [originalDragEnd]);

  const handleBlockSelect = (instanceId: string | null) => {
    selectBlock(instanceId);
    if (instanceId && rightPanelCollapsed) setRightPanelCollapsed(false);
  };

  // ─── Loading ───────────────────────────────────────────────────
  if (blocksLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading block library...</p>
        </div>
      </div>
    );
  }

  if (blocksError) {
    return (
      <div className="flex items-center justify-center h-[60vh]" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
          <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>Error loading blocks</p>
          <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>{blocksError}</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex" style={{ height: 'calc(100vh - 220px)', backgroundColor: colors.utility.primaryBackground }}>

        {/* ─── Left Panel: Block Library ────────────────────────── */}
        <div
          className={`${leftPanelCollapsed ? 'w-12' : 'w-72'} transition-all duration-300 border-r flex flex-col`}
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.secondaryText}20` }}
        >
          <div
            className="flex items-center justify-between p-3 border-b"
            style={{ borderColor: `${colors.utility.secondaryText}20` }}
          >
            {!leftPanelCollapsed && (
              <div>
                <h3 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>Block Library</h3>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Drag blocks to canvas
                </p>
              </div>
            )}
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: `${colors.utility.secondaryText}10`, color: colors.utility.secondaryText }}
            >
              {leftPanelCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          {!leftPanelCollapsed && (
            <div className="flex-1 overflow-auto">
              <BlockLibrary />
            </div>
          )}
        </div>

        {/* ─── Center: Canvas ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {/* Mini toolbar */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.secondaryText}20` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                {template.blocks.length} block{template.blocks.length !== 1 ? 's' : ''}
              </span>
              {validationErrors.length > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: colors.semantic.error }}>
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{
                backgroundColor: !rightPanelCollapsed ? `${colors.utility.secondaryText}20` : `${colors.utility.secondaryText}10`,
                color: colors.utility.secondaryText,
              }}
              title={rightPanelCollapsed ? 'Open settings' : 'Close settings'}
            >
              <Settings size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <TemplateCanvas
              blocks={template.blocks}
              selectedBlockId={template.selectedBlockId}
              onBlockSelect={handleBlockSelect}
              onBlockRemove={removeBlock}
              onBlockMove={moveBlock}
              onDrop={handleDrop}
              canDrop={canDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
        </div>

        {/* ─── Right Panel: Config ─────────────────────────────── */}
        {!rightPanelCollapsed && (
          <div
            className="w-72 border-l flex flex-col"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.secondaryText}20` }}
          >
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: `${colors.utility.secondaryText}20` }}
            >
              <div>
                <h3 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                  {selectedBlock ? 'Block Settings' : 'Template Settings'}
                </h3>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {selectedBlock ? selectedBlock.name : 'Configure template properties'}
                </p>
              </div>
              <button
                onClick={() => setRightPanelCollapsed(true)}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.secondaryText}10`, color: colors.utility.secondaryText }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <BlockConfigPanel
                selectedBlock={selectedBlock}
                template={template}
                onUpdateTemplate={updateTemplate}
                validationErrors={validationErrors}
                isAdmin={true}
                userRole="admin"
              />
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default BlockAssemblyStep;

// src/pages/catalog-studio/blocks/[id]/edit.tsx
// Full Page Block Editing - Phase 4
// URL-based edit page for blocks

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block } from '../../../../types/catalogStudio';
import { useBlockCategories } from '../../../../hooks/queries/useBlockTypes';
import { BLOCK_CATEGORIES } from '../../../../utils/catalog-studio';
import BlockWizardContent from '../../../../components/catalog-studio/BlockWizard/BlockWizardContent';
import { useCatBlocks } from '../../../../hooks/queries/useCatBlocks';
import {
  useUpdateCatBlock,
  useDeleteCatBlock,
} from '../../../../hooks/mutations/useCatBlocksMutations';
import { catBlocksToBlocks, blockToUpdateData } from '../../../../utils/catalog-studio/catBlockAdapter';

// =================================================================
// COMPONENT
// =================================================================

const EditBlockPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [blockType, setBlockType] = useState('service');
  const [currentStep, setCurrentStep] = useState(2); // Start at step 2 (basic info) for edit
  const [formData, setFormData] = useState<Partial<Block>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hooks
  const { categories, isLoading: categoriesLoading } = useBlockCategories();
  const { data: blocksResponse, isLoading: blocksLoading, error: blocksError } = useCatBlocks();
  const updateBlockMutation = useUpdateCatBlock();
  const deleteBlockMutation = useDeleteCatBlock();

  // Use DB categories if available, fallback to hardcoded
  const blockCategories = categories.length > 0 ? categories : BLOCK_CATEGORIES;

  // Find the block being edited
  const editingBlock = useMemo(() => {
    if (!blocksResponse?.data?.blocks || !id) return null;
    const blocks = catBlocksToBlocks(blocksResponse.data.blocks);
    return blocks.find(b => b.id === id) || null;
  }, [blocksResponse, id]);

  // Initialize state when block is loaded
  useEffect(() => {
    if (editingBlock) {
      setBlockType(editingBlock.categoryId);
      setFormData(editingBlock);
    }
  }, [editingBlock]);

  // Get current category info
  const currentCategory = blockCategories.find(c => c.id === blockType);

  // Handlers
  const handleBlockTypeChange = useCallback((type: string) => {
    setBlockType(type);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleFormDataChange = useCallback((data: Partial<Block>) => {
    setFormData(data);
  }, []);

  const handleSave = useCallback(async (blockData: Partial<Block>) => {
    if (!id) return;

    setIsSaving(true);
    try {
      await updateBlockMutation.mutateAsync({
        id,
        data: blockToUpdateData(blockData),
      });

      // Navigate back to blocks list on success
      navigate('/catalog-studio/blocks', {
        state: {
          toast: {
            type: 'success',
            title: 'Block updated',
            description: blockData.name,
          },
        },
      });
    } catch (error: any) {
      console.error('Failed to update block:', error);
      // Stay on page and show error
    } finally {
      setIsSaving(false);
    }
  }, [id, updateBlockMutation, navigate]);

  const handleDelete = useCallback(async () => {
    if (!id) return;

    try {
      await deleteBlockMutation.mutateAsync(id);

      // Navigate back to blocks list on success
      navigate('/catalog-studio/blocks', {
        state: {
          toast: {
            type: 'success',
            title: 'Block deleted',
          },
        },
      });
    } catch (error: any) {
      console.error('Failed to delete block:', error);
      setShowDeleteConfirm(false);
    }
  }, [id, deleteBlockMutation, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/catalog-studio/blocks');
  }, [navigate]);

  // Loading state
  if (blocksLoading || categoriesLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading block...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (blocksError || !editingBlock) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            {blocksError ? 'Failed to load block' : 'Block not found'}
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {blocksError instanceof Error ? blocksError.message : 'The block you are looking for does not exist.'}
          </p>
          <button
            onClick={() => navigate('/catalog-studio/blocks')}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: colors.brand.primary }}
          >
            Back to Blocks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.secondaryBackground }}
    >
      {/* Page Header */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: colors.utility.secondaryText }}
            title="Back to Blocks"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
              Edit Block
            </h1>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {currentCategory ? (
                <>
                  Editing <span className="font-medium">{editingBlock.name}</span>
                  {' - '}
                  <span style={{ color: currentCategory.color }}>{currentCategory.name}</span>
                </>
              ) : (
                `Editing ${editingBlock.name}`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.semantic.error,
              color: colors.semantic.error,
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText,
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content - Full Page Wizard */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full"
          style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF' }}
        >
          <BlockWizardContent
            mode="edit"
            blockType={blockType}
            editingBlock={editingBlock}
            initialStep={2} // Skip type selection in edit mode
            categories={blockCategories}
            showTypeSelection={false} // Hide type selection in edit mode
            onSave={handleSave}
            onCancel={handleCancel}
            onBlockTypeChange={handleBlockTypeChange}
            onStepChange={handleStepChange}
            onFormDataChange={handleFormDataChange}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative w-full max-w-md mx-4 p-6 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colors.semantic.error}15` }}
              >
                <Trash2 className="w-6 h-6" style={{ color: colors.semantic.error }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  Delete Block?
                </h3>
                <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
                  Are you sure you want to delete "{editingBlock.name}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                      color: colors.utility.primaryText,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteBlockMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    style={{ backgroundColor: colors.semantic.error }}
                  >
                    {deleteBlockMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditBlockPage;

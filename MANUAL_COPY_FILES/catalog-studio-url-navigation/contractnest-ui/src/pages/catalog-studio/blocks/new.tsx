// src/pages/catalog-studio/blocks/new.tsx
// Full Page Block Creation - Phase 4
// Replaces modal wizard with URL-based navigation

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block, WizardMode } from '../../../types/catalogStudio';
import { useBlockCategories, usePricingModes } from '../../../hooks/queries/useBlockTypes';
import { BLOCK_CATEGORIES } from '../../../utils/catalog-studio';
import BlockWizardContent from '../../../components/catalog-studio/BlockWizard/BlockWizardContent';
import { useCreateCatBlock } from '../../../hooks/mutations/useCatBlocksMutations';
import { blockToCreateData } from '../../../utils/catalog-studio/catBlockAdapter';
import { VaNiLoader } from '../../../components/common/loaders/UnifiedLoader';

// =================================================================
// COMPONENT
// =================================================================

const NewBlockPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get initial block type from URL query param (e.g., /blocks/new?type=service)
  const initialType = searchParams.get('type') || 'service';

  // State
  const [blockType, setBlockType] = useState(initialType);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Block>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Hooks
  const { categories, isLoading: categoriesLoading, getDbIdByType } = useBlockCategories();
  const { getDbIdByMode } = usePricingModes();
  const createBlockMutation = useCreateCatBlock();

  // Use DB categories if available, fallback to hardcoded
  const blockCategories = categories.length > 0 ? categories : BLOCK_CATEGORIES;

  // Get current category info
  const currentCategory = blockCategories.find(c => c.id === blockType);

  // Handlers
  const handleBlockTypeChange = useCallback((type: string) => {
    setBlockType(type);
    // Update URL without navigation
    const newParams = new URLSearchParams(searchParams);
    newParams.set('type', type);
    window.history.replaceState({}, '', `?${newParams.toString()}`);
  }, [searchParams]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleFormDataChange = useCallback((data: Partial<Block>) => {
    setFormData(data);
  }, []);

  const handleSave = useCallback(async (blockData: Partial<Block>) => {
    setIsSaving(true);
    try {
      // Get UUIDs from lookup hooks
      const blockTypeUuid = getDbIdByType(blockType);
      const pricingModeUuid = getDbIdByMode('independent');

      // Add category ID to block data
      const fullBlockData = {
        ...blockData,
        categoryId: blockType,
      } as Block;

      // Build create payload with UUIDs
      const createPayload = {
        ...blockToCreateData(fullBlockData),
        block_type_id: blockTypeUuid, // Add the UUID
        pricing_mode_id: pricingModeUuid, // Add the UUID
      };

      await createBlockMutation.mutateAsync(createPayload);

      // Show success toast and navigate back
      toast.success(`Block "${blockData.name}" created successfully`);
      navigate('/catalog-studio/configure');
    } catch (error: any) {
      console.error('Failed to create block:', error);
      toast.error(error?.response?.data?.message || 'Failed to create block. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [blockType, createBlockMutation, navigate, getDbIdByType, getDbIdByMode]);

  const handleCancel = useCallback(() => {
    // Navigate back to configure page
    navigate('/catalog-studio/configure');
  }, [navigate]);

  return (
    <div
      className="h-full flex flex-col relative"
      style={{ backgroundColor: colors.utility.secondaryBackground }}
    >
      {/* Full-page loader overlay when saving */}
      {isSaving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div
            className="p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: colors.brand.primary }} />
            <div className="text-center">
              <p className="font-semibold" style={{ color: colors.utility.primaryText }}>
                Creating Block...
              </p>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Please wait while we save your block
              </p>
            </div>
          </div>
        </div>
      )}
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
            title="Back to Configure"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
              Create New Block
            </h1>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {currentCategory ? (
                <>
                  Creating a <span style={{ color: currentCategory.color }}>{currentCategory.name}</span> block
                </>
              ) : (
                'Select a block type to get started'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
              color: colors.utility.primaryText,
            }}
          >
            <X className="w-4 h-4" />
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
            mode="create"
            blockType={blockType}
            editingBlock={null}
            initialStep={1}
            categories={blockCategories}
            showTypeSelection={true}
            onSave={handleSave}
            onCancel={handleCancel}
            onBlockTypeChange={handleBlockTypeChange}
            onStepChange={handleStepChange}
            onFormDataChange={handleFormDataChange}
          />
        </div>
      </div>
    </div>
  );
};

export default NewBlockPage;

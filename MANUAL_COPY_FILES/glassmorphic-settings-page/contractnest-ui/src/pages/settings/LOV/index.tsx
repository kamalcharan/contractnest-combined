// src/pages/settings/LOV/index.tsx
// Glassmorphic Design

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, List, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader, InlineLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { analyticsService } from '@/services/analytics.service';
import { captureException } from '@/utils/sentry';
import { useMasterDataContext } from '@/contexts/MasterDataContext';

// Define interfaces for the component
interface CategoryMaster {
  id: string;
  CategoryName: string;
  DisplayName: string;
  is_active: boolean;
  Description: string | null;
  icon_name: string | null;
  order_sequence: number | null;
  tenantid: string;
  created_at: string;
}

interface CategoryDetail {
  id: string;
  SubCatName: string;
  DisplayName: string;
  category_id: string;
  hexcolor: string | null;
  icon_name: string | null;
  tags: string[] | null;
  tool_tip: string | null;
  is_active: boolean;
  Sequence_no: number | null;
  Description: string | null;
  tenantid: string;
  is_deletable: boolean;
  form_settings: any | null;
  created_at: string;
}

interface DetailFormData {
  SubCatName: string;
  DisplayName: string;
  hexcolor: string;
  Sequence_no: number | null;
  Description: string;
}

// Generate idempotency key for operations
const generateIdempotencyKey = () => {
  return `lov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const ListOfValuesPage = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const { invalidateCategory } = useMasterDataContext();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetail[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDetail, setNewDetail] = useState<DetailFormData>({
    SubCatName: '',
    DisplayName: '',
    hexcolor: '#40E0D0',
    Sequence_no: null,
    Description: ''
  });
  const [editedValues, setEditedValues] = useState<Record<string, Partial<CategoryDetail>>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView('settings/configure/lovs', 'List of Values');
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentTenant?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching categories for tenant:", currentTenant.id);

        const response = await api.get(
          `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${currentTenant.id}`
        );

        const data = response.data;
        console.log("Categories data received:", data);
        setCategories(data);

        // Select first category by default
        if (data.length > 0 && !selectedCategory) {
          console.log("Auto-selecting first category:", data[0].id);
          setSelectedCategory(data[0].id);
          setSelectedCategoryName(data[0].DisplayName || data[0].CategoryName);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        captureException(error, {
          tags: { component: 'ListOfValuesPage', action: 'fetchCategories' },
          extra: { tenantId: currentTenant?.id }
        });
        vaniToast.error('Error', {
          message: 'Failed to load categories',
          duration: 4000
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [currentTenant?.id]);

  // Fetch category details when category changes
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      if (!currentTenant?.id || !selectedCategory) return;

      try {
        console.log("Fetching details for category:", selectedCategory);

        const response = await api.get(
          `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${selectedCategory}&tenantId=${currentTenant.id}`
        );

        const data = response.data;
        console.log("Category details received:", data);
        setCategoryDetails(data);

        // Get next sequence number for new items
        const seqResponse = await api.get(
          `${API_ENDPOINTS.MASTERDATA.NEXT_SEQUENCE}?categoryId=${selectedCategory}&tenantId=${currentTenant.id}`
        );

        // Update form with next sequence number
        setNewDetail(prev => ({
          ...prev,
          Sequence_no: seqResponse.data.nextSequence
        }));
      } catch (error) {
        console.error('Error fetching category details:', error);
        captureException(error, {
          tags: { component: 'ListOfValuesPage', action: 'fetchCategoryDetails' },
          extra: { categoryId: selectedCategory, tenantId: currentTenant?.id }
        });
        vaniToast.error('Error', {
          message: 'Failed to load category details',
          duration: 4000
        });
      }
    };

    if (selectedCategory) {
      fetchCategoryDetails();
      // Reset add form when category changes
      setIsAdding(false);
    }
  }, [currentTenant?.id, selectedCategory]);

  const handleCategoryChange = (categoryId: string) => {
    console.log("Changing category to:", categoryId);
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(categoryId);
    setSelectedCategoryName(category?.DisplayName || category?.CategoryName || '');
    setIsAdding(false);
    setEditingId(null);

    try {
      analyticsService.trackPageView(`settings/configure/lovs/${categoryId}`, 'List of Values - Category Change');
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);

    try {
      analyticsService.trackPageView('settings/configure/lovs/add', 'List of Values - Add New');
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  const handleSaveNew = async () => {
    if (!validateForm() || !currentTenant?.id || !selectedCategory) return;

    setIsProcessing(true);
    try {
      const newValue = {
        ...newDetail,
        Sequence_no: Number(newDetail.Sequence_no),
        category_id: selectedCategory,
        tenantid: currentTenant.id,
        is_active: true,
        is_deletable: true,
        tags: null,
        tool_tip: null,
        icon_name: null
      };

      const idempotencyKey = generateIdempotencyKey();

      const response = await api.post(
        API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS,
        newValue,
        {
          headers: {
            'x-tenant-id': currentTenant.id,
            'idempotency-key': idempotencyKey
          }
        }
      );

      // Add to state
      setCategoryDetails(prev => [...prev, response.data]);

      // Invalidate cache for this category
      invalidateCategory(selectedCategoryName);

      vaniToast.success('Value Added', {
        message: `"${newDetail.DisplayName}" has been added successfully`,
        duration: 3000
      });

      // Reset form and hide it
      setIsAdding(false);
      setNewDetail({
        SubCatName: '',
        DisplayName: '',
        hexcolor: '#40E0D0',
        Sequence_no: null,
        Description: ''
      });

      analyticsService.trackPageView('settings/configure/lovs/added', 'List of Values - Added Successfully');
    } catch (error) {
      console.error('Error adding new value:', error);
      captureException(error, {
        tags: { component: 'ListOfValuesPage', action: 'handleSaveNew' },
        extra: { categoryId: selectedCategory, tenantId: currentTenant?.id }
      });
      vaniToast.error('Error', {
        message: 'Failed to add new value',
        duration: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateForm = () => {
    // This is a simple validation
    if (!newDetail.SubCatName || !newDetail.DisplayName) {
      vaniToast.warning('Validation Error', {
        message: 'Name and Display Name are required fields',
        duration: 3000
      });
      return false;
    }

    // Check for duplicates
    if (categoryDetails.some(d =>
      d.SubCatName.toLowerCase() === newDetail.SubCatName.toLowerCase() ||
      d.DisplayName.toLowerCase() === newDetail.DisplayName.toLowerCase())) {
      vaniToast.warning('Validation Error', {
        message: 'A value with this Name or Display Name already exists',
        duration: 3000
      });
      return false;
    }

    return true;
  };

  const handleCancelAdd = () => {
    setNewDetail({
      SubCatName: '',
      DisplayName: '',
      hexcolor: '#40E0D0',
      Sequence_no: null,
      Description: ''
    });
    setIsAdding(false);
  };

  const handleInputChange = (id: string, field: keyof CategoryDetail, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveEdit = async (id: string) => {
    if (!currentTenant?.id) return;

    const updates = editedValues[id];
    if (!updates) return;

    // Validate
    if ((updates.SubCatName !== undefined && !updates.SubCatName) ||
        (updates.DisplayName !== undefined && !updates.DisplayName)) {
      vaniToast.warning('Validation Error', {
        message: 'Name and Display Name are required fields',
        duration: 3000
      });
      return;
    }

    setIsProcessing(true);
    try {
      const idempotencyKey = generateIdempotencyKey();

      const response = await api.patch(
        `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}/${id}`,
        {
          ...updates,
          tenantid: currentTenant.id
        },
        {
          headers: {
            'x-tenant-id': currentTenant.id,
            'idempotency-key': idempotencyKey
          }
        }
      );

      setCategoryDetails(prev => prev.map(d => d.id === id ? response.data : d));
      setEditingId(null);
      setEditedValues(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });

      // Invalidate cache for this category
      invalidateCategory(selectedCategoryName);

      vaniToast.success('Value Updated', {
        message: 'Value has been updated successfully',
        duration: 3000
      });

      analyticsService.trackPageView('settings/configure/lovs/edited', 'List of Values - Edited Successfully');
    } catch (error) {
      console.error('Error updating detail:', error);
      captureException(error, {
        tags: { component: 'ListOfValuesPage', action: 'handleSaveEdit' },
        extra: { id, categoryId: selectedCategory, tenantId: currentTenant?.id }
      });
      vaniToast.error('Error', {
        message: 'Failed to update value',
        duration: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentTenant?.id) return;

    setIsProcessing(true);
    try {
      const idempotencyKey = generateIdempotencyKey();

      await api.delete(
        `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}/${id}?tenantId=${currentTenant.id}`,
        {
          headers: {
            'x-tenant-id': currentTenant.id,
            'idempotency-key': idempotencyKey
          }
        }
      );

      setCategoryDetails(prev => prev.filter(d => d.id !== id));

      // Invalidate cache for this category
      invalidateCategory(selectedCategoryName);

      vaniToast.success('Value Deleted', {
        message: 'Value has been deleted successfully',
        duration: 3000
      });

      analyticsService.trackPageView('settings/configure/lovs/deleted', 'List of Values - Deleted Successfully');
    } catch (error) {
      console.error('Error deleting detail:', error);
      captureException(error, {
        tags: { component: 'ListOfValuesPage', action: 'handleDelete' },
        extra: { id, categoryId: selectedCategory, tenantId: currentTenant?.id }
      });
      vaniToast.error('Error', {
        message: 'Failed to delete value',
        duration: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state - Glassmorphic
  if (loading) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brand.primary }} />
          </div>
          <div className="flex gap-6">
            <div
              className="w-64 h-64 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
            <div
              className="flex-1 h-96 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Glassmorphic Header */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings/configure')}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
              </button>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)`
                }}
              >
                <List className="h-6 w-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                  List of Values
                </h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  Manage your custom values and categories
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Category list - Glassmorphic */}
          <div className="w-64 shrink-0">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
              }}
            >
              {categories.length > 0 ? (
                categories.map((category, index) => {
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={cn(
                        "w-full px-4 py-4 text-left transition-all duration-300",
                        isSelected
                          ? "font-medium"
                          : "hover:bg-opacity-50"
                      )}
                      style={{
                        borderBottom: index < categories.length - 1
                          ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                          : 'none',
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : 'transparent',
                        color: isSelected
                          ? '#FFFFFF'
                          : colors.utility.primaryText
                      }}
                    >
                      {category.DisplayName}
                    </button>
                  );
                })
              ) : (
                <div
                  className="p-4 text-center"
                  style={{ color: colors.utility.secondaryText }}
                >
                  No categories found.
                </div>
              )}
            </div>
          </div>

          {/* Details Area - Glassmorphic */}
          <div className="flex-1">
            {selectedCategory ? (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
                }}
              >
                {/* Category Title and Add Button */}
                <div
                  className="px-6 py-4 border-b flex justify-between items-center"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                      {selectedCategoryName}
                    </h2>
                    {isProcessing && (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.brand.primary }} />
                    )}
                  </div>
                  {!isAdding && (
                    <Button
                      onClick={handleAddClick}
                      className="transition-colors hover:opacity-90"
                      style={{
                        background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                        color: '#FFFFFF'
                      }}
                      disabled={isProcessing}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Value
                    </Button>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-6">
                  {/* Column Headers */}
                  <div
                    className="rounded-xl mb-4"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                    }}
                  >
                    <div className="grid grid-cols-5 gap-4 px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Name
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Display Name
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Color
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Sequence
                      </div>
                      <div className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        Actions
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    {/* Existing Items */}
                    {categoryDetails.map((detail) => (
                      <div
                        key={detail.id}
                        className="rounded-xl transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                        }}
                      >
                    <div className="grid grid-cols-5 gap-4 px-4 py-3 items-center">
                      {editingId === detail.id ? (
                        // Edit Mode
                        <>
                          <Input
                            value={editedValues[detail.id]?.SubCatName ?? detail.SubCatName}
                            onChange={(e) => handleInputChange(detail.id, 'SubCatName', e.target.value)}
                            disabled={!detail.is_deletable || isProcessing}
                            style={{
                              borderColor: colors.utility.secondaryText + '40',
                              backgroundColor: colors.utility.primaryBackground,
                              color: colors.utility.primaryText
                            }}
                          />
                          <Input
                            value={editedValues[detail.id]?.DisplayName ?? detail.DisplayName}
                            onChange={(e) => handleInputChange(detail.id, 'DisplayName', e.target.value)}
                            disabled={isProcessing}
                            style={{
                              borderColor: colors.utility.secondaryText + '40',
                              backgroundColor: colors.utility.primaryBackground,
                              color: colors.utility.primaryText
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: editedValues[detail.id]?.hexcolor ?? detail.hexcolor ?? '#FFFFFF' }}
                            />
                            <Input
                              type="color"
                              value={editedValues[detail.id]?.hexcolor ?? detail.hexcolor ?? '#FFFFFF'}
                              onChange={(e) => handleInputChange(detail.id, 'hexcolor', e.target.value)}
                              disabled={isProcessing}
                              className="w-12 h-8 p-0"
                            />
                          </div>
                          <Input
                            type="number"
                            value={editedValues[detail.id]?.Sequence_no ?? detail.Sequence_no ?? ''}
                            onChange={(e) => handleInputChange(detail.id, 'Sequence_no',
                              e.target.value ? parseInt(e.target.value) : null
                            )}
                            disabled={isProcessing}
                            style={{
                              borderColor: colors.utility.secondaryText + '40',
                              backgroundColor: colors.utility.primaryBackground,
                              color: colors.utility.primaryText
                            }}
                          />
                          <div className="flex items-center justify-end">
                            <div className="flex items-center">
                              <Button
                                variant="outline"
                                onClick={() => setEditingId(null)}
                                disabled={isProcessing}
                                style={{
                                  borderColor: colors.utility.secondaryText + '40',
                                  backgroundColor: colors.utility.secondaryBackground,
                                  color: colors.utility.primaryText
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleSaveEdit(detail.id)}
                                disabled={isProcessing}
                                className="ml-2 hover:opacity-90"
                                style={{
                                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                                  color: '#FFFFFF'
                                }}
                              >
                                {isProcessing ? (
                                  <InlineLoader size="sm" text="Saving" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        // View Mode
                        <>
                          <div
                            className="transition-colors"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {detail.SubCatName}
                          </div>
                          <div
                            className="transition-colors"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {detail.DisplayName}
                          </div>
                          <div>
                            {detail.hexcolor && (
                              <div
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: detail.hexcolor }}
                              />
                            )}
                          </div>
                          <div
                            className="transition-colors"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {detail.Sequence_no}
                          </div>
                          <div className="flex items-center justify-end">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingId(detail.id)}
                                disabled={isProcessing}
                                className="transition-colors hover:opacity-80"
                                style={{
                                  borderColor: colors.brand.primary + '40',
                                  backgroundColor: colors.utility.secondaryBackground,
                                  color: colors.brand.primary
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {detail.is_deletable && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(detail.id)}
                                  disabled={isProcessing}
                                  className="transition-colors hover:opacity-80"
                                  style={{
                                    borderColor: colors.semantic.error + '40',
                                    backgroundColor: colors.utility.secondaryBackground,
                                    color: colors.semantic.error
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                    {/* Add Form */}
                    {isAdding && (
                      <div
                        className="rounded-xl border-2"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          borderColor: colors.brand.primary
                        }}
                      >
                    <div className="grid grid-cols-5 gap-4 px-4 py-3 items-center">
                      <Input
                        placeholder="Name"
                        value={newDetail.SubCatName}
                        onChange={(e) => setNewDetail(prev => ({ ...prev, SubCatName: e.target.value }))}
                        disabled={isProcessing}
                        style={{
                          borderColor: colors.utility.secondaryText + '40',
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText
                        }}
                      />
                      <Input
                        placeholder="Display Name"
                        value={newDetail.DisplayName}
                        onChange={(e) => setNewDetail(prev => ({ ...prev, DisplayName: e.target.value }))}
                        disabled={isProcessing}
                        style={{
                          borderColor: colors.utility.secondaryText + '40',
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: newDetail.hexcolor || '#FFFFFF' }}
                        />
                        <Input
                          type="color"
                          value={newDetail.hexcolor || '#FFFFFF'}
                          onChange={(e) => setNewDetail(prev => ({ ...prev, hexcolor: e.target.value }))}
                          disabled={isProcessing}
                          className="w-12 h-8 p-0"
                        />
                      </div>
                      <Input
                        type="number"
                        placeholder="Sequence"
                        value={newDetail.Sequence_no || ''}
                        onChange={(e) => setNewDetail(prev => ({
                          ...prev,
                          Sequence_no: e.target.value ? parseInt(e.target.value) : null
                        }))}
                        disabled={isProcessing}
                        style={{
                          borderColor: colors.utility.secondaryText + '40',
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText
                        }}
                      />
                      <div className="flex items-center justify-end">
                        <div className="flex items-center">
                          <Button
                            variant="outline"
                            onClick={handleCancelAdd}
                            disabled={isProcessing}
                            style={{
                              borderColor: colors.utility.secondaryText + '40',
                              backgroundColor: colors.utility.secondaryBackground,
                              color: colors.utility.primaryText
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveNew}
                            disabled={isProcessing}
                            className="ml-2 hover:opacity-90"
                            style={{
                              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                              color: '#FFFFFF'
                            }}
                          >
                            {isProcessing ? (
                              <InlineLoader size="sm" text="Saving" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                    {/* Empty State */}
                    {categoryDetails.length === 0 && !isAdding && (
                      <div
                        className="rounded-xl p-8 text-center"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: `1px dashed ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                        }}
                      >
                        <p style={{ color: colors.utility.secondaryText }}>
                          No values found for this category. Click "Add New Value" to create one.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
                }}
              >
                <p style={{ color: colors.utility.secondaryText }}>
                  Select a category from the left to view its values.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListOfValuesPage;

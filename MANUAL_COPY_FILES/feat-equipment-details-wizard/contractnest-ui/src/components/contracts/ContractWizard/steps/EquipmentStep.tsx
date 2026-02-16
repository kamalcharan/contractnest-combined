// src/components/contracts/ContractWizard/steps/EquipmentStep.tsx
// Wizard step: add equipment/entity details to the contract (denormalized — zero DB writes)
// Uses drawer pattern for add/edit, consistent with QuickAddContactDrawer

import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  X,
  Wrench,
  Building2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Copy,
  Hash,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useGlobalMasterData,
  type CategoryDetail,
} from '@/hooks/queries/useProductMasterdata';
import type { ContractEquipmentDetail } from '@/types/contracts';

// ─── Props ──────────────────────────────────────────────────────────

interface EquipmentStepProps {
  equipmentDetails: ContractEquipmentDetail[];
  onEquipmentDetailsChange: (details: ContractEquipmentDetail[]) => void;
}

// ─── Drawer form state ──────────────────────────────────────────────

interface EquipmentFormData {
  resource_type: 'equipment' | 'entity';
  category_id: string;
  category_name: string;
  item_name: string;
  quantity: number;
  make: string;
  model: string;
  serial_number: string;
  condition: string;
  criticality: string;
  location: string;
  purchase_date: string;
  warranty_expiry: string;
  area_sqft: string;
  capacity: string;
  notes: string;
}

const EMPTY_FORM: EquipmentFormData = {
  resource_type: 'equipment',
  category_id: '',
  category_name: '',
  item_name: '',
  quantity: 1,
  make: '',
  model: '',
  serial_number: '',
  condition: '',
  criticality: '',
  location: '',
  purchase_date: '',
  warranty_expiry: '',
  area_sqft: '',
  capacity: '',
  notes: '',
};

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

const CRITICALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ─── Helper: generate simple UUID ───────────────────────────────────

function generateId(): string {
  return crypto.randomUUID?.() ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Group categories from master data ──────────────────────────────

interface CategoryGroup {
  group: string;
  label: string;
  items: CategoryDetail[];
}

function groupCategories(items: CategoryDetail[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();

  for (const item of items) {
    const settings = (item.form_settings || {}) as Record<string, any>;
    const groupKey = settings.group || 'other';
    const groupLabel = settings.group_label || 'Other';

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { group: groupKey, label: groupLabel, items: [] });
    }
    groups.get(groupKey)!.items.push(item);
  }

  // Sort items within each group by sequence
  for (const g of groups.values()) {
    g.items.sort((a, b) => (a.sequence_no || 0) - (b.sequence_no || 0));
  }

  return Array.from(groups.values());
}

// ─── Main Component ─────────────────────────────────────────────────

const EquipmentStep: React.FC<EquipmentStepProps> = ({
  equipmentDetails,
  onEquipmentDetailsChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch asset type categories (cached master data — not a DB write)
  const { data: assetTypesResponse, isLoading: isLoadingCategories } =
    useGlobalMasterData('cat_asset_types');

  const categoryGroups = useMemo(() => {
    const items = assetTypesResponse?.data?.items || assetTypesResponse?.data || [];
    return groupCategories(items as CategoryDetail[]);
  }, [assetTypesResponse]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDetails, setShowDetails] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────

  const openAddDrawer = useCallback(() => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setErrors({});
    setShowDetails(false);
    setIsDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((item: ContractEquipmentDetail) => {
    setFormData({
      resource_type: item.resource_type,
      category_id: item.category_id || '',
      category_name: item.category_name,
      item_name: item.item_name,
      quantity: item.quantity,
      make: item.make || '',
      model: item.model || '',
      serial_number: item.serial_number || '',
      condition: item.condition || '',
      criticality: item.criticality || '',
      location: item.location || '',
      purchase_date: item.purchase_date || '',
      warranty_expiry: item.warranty_expiry || '',
      area_sqft: item.area_sqft != null ? String(item.area_sqft) : '',
      capacity: item.capacity != null ? String(item.capacity) : '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setErrors({});
    setShowDetails(true);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setEditingId(null);
  }, []);

  const updateField = useCallback(<K extends keyof EquipmentFormData>(
    key: K,
    value: EquipmentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    setErrors(prev => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  }, []);

  const handleCategorySelect = useCallback((item: CategoryDetail) => {
    setFormData(prev => ({
      ...prev,
      category_id: item.id,
      category_name: item.display_name || item.sub_cat_name,
    }));
    setErrors(prev => {
      const next = { ...prev };
      delete next.category_name;
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.category_name.trim()) errs.category_name = 'Category is required';
    if (!formData.item_name.trim()) errs.item_name = 'Item name is required';
    if (!formData.quantity || formData.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  const handleSave = useCallback(() => {
    if (!validate()) return;

    const entry: ContractEquipmentDetail = {
      id: editingId || generateId(),
      resource_type: formData.resource_type,
      category_id: formData.category_id || null,
      category_name: formData.category_name.trim(),
      item_name: formData.item_name.trim(),
      quantity: formData.quantity,
      make: formData.make.trim() || null,
      model: formData.model.trim() || null,
      serial_number: formData.serial_number.trim() || null,
      condition: (formData.condition || null) as ContractEquipmentDetail['condition'],
      criticality: (formData.criticality || null) as ContractEquipmentDetail['criticality'],
      location: formData.location.trim() || null,
      purchase_date: formData.purchase_date || null,
      warranty_expiry: formData.warranty_expiry || null,
      area_sqft: formData.area_sqft ? Number(formData.area_sqft) : null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      notes: formData.notes.trim() || null,
      specifications: {},
    };

    if (editingId) {
      onEquipmentDetailsChange(
        equipmentDetails.map(e => (e.id === editingId ? entry : e))
      );
    } else {
      onEquipmentDetailsChange([...equipmentDetails, entry]);
    }

    closeDrawer();
  }, [formData, editingId, equipmentDetails, onEquipmentDetailsChange, closeDrawer, validate]);

  const handleDelete = useCallback((id: string) => {
    onEquipmentDetailsChange(equipmentDetails.filter(e => e.id !== id));
  }, [equipmentDetails, onEquipmentDetailsChange]);

  const handleDuplicate = useCallback((item: ContractEquipmentDetail) => {
    const copy: ContractEquipmentDetail = {
      ...item,
      id: generateId(),
      item_name: `${item.item_name} (copy)`,
    };
    onEquipmentDetailsChange([...equipmentDetails, copy]);
  }, [equipmentDetails, onEquipmentDetailsChange]);

  // ── Shared styles ───────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    borderColor: colors.utility.primaryText + '15',
    backgroundColor: colors.utility.secondaryBackground,
    color: colors.utility.primaryText,
  };

  const labelStyle: React.CSSProperties = {
    color: colors.utility.primaryText,
  };

  const glassStyle: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
  };

  // ── Total items count ───────────────────────────────────────────

  const totalQuantity = equipmentDetails.reduce((sum, e) => sum + e.quantity, 0);

  // ── Render: Equipment list ──────────────────────────────────────

  return (
    <div className="px-6 py-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            {equipmentDetails.length} item{equipmentDetails.length !== 1 ? 's' : ''}
            {totalQuantity > equipmentDetails.length && (
              <span className="text-xs font-normal ml-1" style={{ color: colors.utility.secondaryText }}>
                ({totalQuantity} total qty)
              </span>
            )}
          </span>
        </div>

        <button
          onClick={openAddDrawer}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: colors.brand.primary,
            color: '#fff',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Equipment / Entity
        </button>
      </div>

      {/* Empty state */}
      {equipmentDetails.length === 0 && (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText + '40' }} />
          <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
            No equipment or entities added yet
          </p>
          <p className="text-xs" style={{ color: colors.utility.secondaryText + '80' }}>
            Add equipment or entity details that this contract covers.
          </p>
        </div>
      )}

      {/* Equipment cards */}
      {equipmentDetails.length > 0 && (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {equipmentDetails.map((item) => {
            const isEquipment = item.resource_type === 'equipment';
            const TypeIcon = isEquipment ? Wrench : Building2;
            const iconColor = isEquipment ? '#f59e0b' : '#6366f1';

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: colors.utility.primaryText + '10',
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: iconColor + '15' }}
                >
                  <TypeIcon className="h-4 w-4" style={{ color: iconColor }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                      {item.item_name}
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}
                    >
                      Qty {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {item.category_name}
                    </span>
                    {item.make && (
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        &middot; {item.make}{item.model ? ` ${item.model}` : ''}
                      </span>
                    )}
                    {item.location && (
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        &middot; {item.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Type badge */}
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0"
                  style={{ backgroundColor: iconColor + '15', color: iconColor }}
                >
                  {item.resource_type}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDuplicate(item)}
                    className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
                    style={{ color: colors.utility.secondaryText }}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openEditDrawer(item)}
                    className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
                    style={{ color: colors.utility.secondaryText }}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
                    style={{ color: colors.semantic?.error || '#ef4444' }}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Drawer (Add / Edit) ──────────────────────────────────── */}
      {isDrawerOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 transition-opacity duration-300"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              onClick={closeDrawer}
            />

            {/* Drawer panel */}
            <div
              className="fixed top-0 right-0 h-full w-[560px] z-50 flex flex-col shadow-2xl transform transition-transform duration-400 ease-out"
              style={{
                ...glassStyle,
                transform: 'translateX(0)',
              }}
            >
              {/* Header */}
              <div
                className="p-6 border-b flex justify-between items-center"
                style={{ borderColor: colors.utility.primaryText + '15' }}
              >
                <div>
                  <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                    {editingId ? 'Edit Equipment / Entity' : 'Add Equipment / Entity'}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    {editingId ? 'Update the details below' : 'Fill in the equipment or entity details'}
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-lg hover:opacity-80 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Resource type toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand.primary }}>
                    Type
                  </label>
                  <div className="flex gap-2">
                    {(['equipment', 'entity'] as const).map((type) => {
                      const isActive = formData.resource_type === type;
                      const Icon = type === 'equipment' ? Wrench : Building2;
                      return (
                        <button
                          key={type}
                          onClick={() => updateField('resource_type', type)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all flex-1"
                          style={{
                            backgroundColor: isActive ? colors.brand.primary + '10' : 'transparent',
                            borderColor: isActive ? colors.brand.primary : colors.utility.primaryText + '15',
                            color: isActive ? colors.brand.primary : colors.utility.secondaryText,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          {type === 'equipment' ? 'Equipment' : 'Entity'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category selector (from cat_asset_types master data) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand.primary }}>
                    Category *
                  </label>
                  {isLoadingCategories ? (
                    <div className="text-xs py-2" style={{ color: colors.utility.secondaryText }}>
                      Loading categories...
                    </div>
                  ) : categoryGroups.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {categoryGroups.map((group) => (
                        <div key={group.group}>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.utility.secondaryText }}>
                            {group.label}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.items.map((cat) => {
                              const isSelected = formData.category_id === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => handleCategorySelect(cat)}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                                  style={{
                                    backgroundColor: isSelected ? colors.brand.primary + '12' : 'transparent',
                                    borderColor: isSelected ? colors.brand.primary : colors.utility.primaryText + '15',
                                    color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                                  }}
                                >
                                  {cat.display_name || cat.sub_cat_name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Fallback: free-text category input if no master data */
                    <input
                      placeholder="e.g. Diagnostic Imaging, HVAC, IT Equipment"
                      value={formData.category_name}
                      onChange={(e) => updateField('category_name', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm"
                      style={inputStyle}
                    />
                  )}
                  {errors.category_name && (
                    <p className="text-xs" style={{ color: colors.semantic?.error || '#ef4444' }}>
                      {errors.category_name}
                    </p>
                  )}
                </div>

                {/* Item name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand.primary }}>
                    Item Name *
                  </label>
                  <input
                    placeholder="e.g. MRI Scanner, Split AC 1.5T, Office Floor"
                    value={formData.item_name}
                    onChange={(e) => updateField('item_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={inputStyle}
                  />
                  {errors.item_name && (
                    <p className="text-xs" style={{ color: colors.semantic?.error || '#ef4444' }}>
                      {errors.item_name}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand.primary }}>
                    Quantity *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateField('quantity', Math.max(1, formData.quantity - 1))}
                      className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold transition-colors hover:opacity-80"
                      style={{
                        borderColor: colors.utility.primaryText + '15',
                        color: colors.utility.primaryText,
                        backgroundColor: colors.utility.secondaryBackground,
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => updateField('quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center px-3 py-2 rounded-lg border text-sm font-semibold"
                      style={inputStyle}
                    />
                    <button
                      onClick={() => updateField('quantity', formData.quantity + 1)}
                      className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold transition-colors hover:opacity-80"
                      style={{
                        borderColor: colors.utility.primaryText + '15',
                        color: colors.utility.primaryText,
                        backgroundColor: colors.utility.secondaryBackground,
                      }}
                    >
                      +
                    </button>
                  </div>
                  {errors.quantity && (
                    <p className="text-xs" style={{ color: colors.semantic?.error || '#ef4444' }}>
                      {errors.quantity}
                    </p>
                  )}
                </div>

                {/* Expandable details section */}
                <div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showDetails ? 'Hide' : 'Show'} Additional Details
                  </button>

                  {showDetails && (
                    <div className="mt-4 space-y-4 pl-1 border-l-2" style={{ borderColor: colors.brand.primary + '20' }}>
                      <div className="pl-4 space-y-4">

                        {/* Equipment-specific fields */}
                        {formData.resource_type === 'equipment' && (
                          <>
                            {/* Make & Model row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium" style={labelStyle}>Make</label>
                                <input
                                  placeholder="e.g. Siemens"
                                  value={formData.make}
                                  onChange={(e) => updateField('make', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border text-sm"
                                  style={inputStyle}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium" style={labelStyle}>Model</label>
                                <input
                                  placeholder="e.g. Magnetom Vida"
                                  value={formData.model}
                                  onChange={(e) => updateField('model', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border text-sm"
                                  style={inputStyle}
                                />
                              </div>
                            </div>

                            {/* Serial number */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={labelStyle}>Serial Number</label>
                              <input
                                placeholder="e.g. SN-12345"
                                value={formData.serial_number}
                                onChange={(e) => updateField('serial_number', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                              />
                            </div>

                            {/* Purchase date & Warranty */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium" style={labelStyle}>Purchase Date</label>
                                <input
                                  type="date"
                                  value={formData.purchase_date}
                                  onChange={(e) => updateField('purchase_date', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border text-sm"
                                  style={inputStyle}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium" style={labelStyle}>Warranty Expiry</label>
                                <input
                                  type="date"
                                  value={formData.warranty_expiry}
                                  onChange={(e) => updateField('warranty_expiry', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border text-sm"
                                  style={inputStyle}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {/* Entity-specific fields */}
                        {formData.resource_type === 'entity' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={labelStyle}>Area (sq ft)</label>
                              <input
                                type="number"
                                placeholder="e.g. 1200"
                                value={formData.area_sqft}
                                onChange={(e) => updateField('area_sqft', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={labelStyle}>Capacity</label>
                              <input
                                type="number"
                                placeholder="e.g. 50"
                                value={formData.capacity}
                                onChange={(e) => updateField('capacity', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        )}

                        {/* Condition & Criticality (shared) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium" style={labelStyle}>Condition</label>
                            <select
                              value={formData.condition}
                              onChange={(e) => updateField('condition', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={inputStyle}
                            >
                              <option value="">—</option>
                              {CONDITION_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium" style={labelStyle}>Criticality</label>
                            <select
                              value={formData.criticality}
                              onChange={(e) => updateField('criticality', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={inputStyle}
                            >
                              <option value="">—</option>
                              {CRITICALITY_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium" style={labelStyle}>Location</label>
                          <input
                            placeholder="e.g. Building A, Floor 2"
                            value={formData.location}
                            onChange={(e) => updateField('location', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={inputStyle}
                          />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium" style={labelStyle}>Notes</label>
                          <textarea
                            placeholder="Any additional notes..."
                            value={formData.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-4 border-t flex justify-end gap-3"
                style={{ borderColor: colors.utility.primaryText + '15' }}
              >
                <button
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    color: colors.utility.secondaryText,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#fff',
                  }}
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default EquipmentStep;

// src/pages/equipment-registry/EquipmentFormDialog.tsx
// Right-side drawer for creating / editing an equipment asset
// Two-level selection: Category (sub_category) → Equipment Type (resource)

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ContactPicker from '@/components/common/ContactPicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import type {
  TenantAsset,
  AssetFormData,
  AssetCondition,
  AssetCriticality,
  AssetStatus,
} from '@/types/assetRegistry';
import {
  DEFAULT_FORM_DATA,
  CONDITION_CONFIG,
  CRITICALITY_CONFIG,
  STATUS_CONFIG,
} from '@/types/assetRegistry';

interface EquipmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  asset?: TenantAsset;
  defaultSubCategory?: string | null;
  resourceTypeId?: string;
  categories?: Array<{ id: string; name: string; sub_category?: string | null; resource_type_id?: string }>;
  onSubmit: (data: AssetFormData) => Promise<void>;
  isSubmitting?: boolean;
  /** When set, locks the owner field to this contact (used from wizard where buyer is already known) */
  lockedContactId?: string;
  lockedContactName?: string;
}

const EquipmentFormDialog: React.FC<EquipmentFormDialogProps> = ({
  isOpen,
  onClose,
  mode,
  asset,
  defaultSubCategory,
  resourceTypeId,
  categories = [],
  onSubmit,
  isSubmitting = false,
  lockedContactId,
  lockedContactName,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── Form State ──────────────────────────────────────────────────

  const [formData, setFormData] = useState<AssetFormData>(DEFAULT_FORM_DATA);
  const [selectedFormSubCategory, setSelectedFormSubCategory] = useState<string>('');
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived: distinct sub_categories from all categories ────────
  const distinctSubCategories = useMemo(() => {
    const set = new Set<string>();
    for (const c of categories) {
      set.add(c.sub_category || 'Other');
    }
    const sorted = [...set].sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [categories]);

  // ── Derived: equipment types filtered by selected sub_category ──
  const filteredEquipmentTypes = useMemo(() => {
    if (!selectedFormSubCategory) return [];
    return categories.filter(
      (c) => (c.sub_category || 'Other') === selectedFormSubCategory
    );
  }, [categories, selectedFormSubCategory]);

  // ── Lookup: resource_id → sub_category ──────────────────────────
  const resourceIdToSubCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.sub_category || 'Other');
    }
    return map;
  }, [categories]);

  // Initialise form when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && asset) {
      setFormData({
        name: asset.name,
        resource_type_id: asset.resource_type_id,
        asset_type_id: asset.asset_type_id || undefined,
        parent_asset_id: asset.parent_asset_id || undefined,
        code: asset.code || undefined,
        description: asset.description || undefined,
        status: asset.status,
        condition: asset.condition,
        criticality: asset.criticality,
        owner_contact_id: asset.owner_contact_id || undefined,
        location: asset.location || undefined,
        make: asset.make || undefined,
        model: asset.model || undefined,
        serial_number: asset.serial_number || undefined,
        purchase_date: asset.purchase_date || undefined,
        warranty_expiry: asset.warranty_expiry || undefined,
        last_service_date: asset.last_service_date || undefined,
        area_sqft: asset.area_sqft || undefined,
        capacity: asset.capacity || undefined,
        specifications: asset.specifications || {},
        tags: asset.tags || [],
      });
      // Derive sub_category from the asset's asset_type_id (the specific resource UUID)
      const subCat = resourceIdToSubCategory.get(asset.asset_type_id || '') || '';
      setSelectedFormSubCategory(subCat);
      const specs = asset.specifications || {};
      setSpecRows(Object.entries(specs).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      setFormData({
        ...DEFAULT_FORM_DATA,
        resource_type_id: resourceTypeId || '',
        // Auto-set owner when locked (wizard context)
        ...(lockedContactId ? { owner_contact_id: lockedContactId } : {}),
      });
      // Pre-select sub_category from sidebar selection
      setSelectedFormSubCategory(defaultSubCategory || '');
      setSpecRows([]);
    }
    setErrors({});
  }, [isOpen, mode, asset, resourceTypeId, defaultSubCategory, resourceIdToSubCategory, lockedContactId]);

  // Auto-select equipment type if only 1 in the selected sub_category
  useEffect(() => {
    if (mode === 'edit') return; // Don't auto-select when editing
    if (filteredEquipmentTypes.length === 1 && !formData.asset_type_id) {
      const autoResource = filteredEquipmentTypes[0];
      setFormData((prev) => ({
        ...prev,
        asset_type_id: autoResource.id,
        resource_type_id: autoResource.resource_type_id || '',
      }));
    }
  }, [filteredEquipmentTypes, mode, formData.asset_type_id]);

  // ── Handlers ────────────────────────────────────────────────────

  const updateField = (field: keyof AssetFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubCategoryChange = (subCat: string) => {
    setSelectedFormSubCategory(subCat);
    // Reset equipment type when category changes
    setFormData((prev) => ({ ...prev, asset_type_id: undefined, resource_type_id: '' }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.sub_category;
      delete next.resource_type_id;
      return next;
    });
  };

  const handleEquipmentTypeChange = (resourceId: string) => {
    const selected = categories.find((c) => c.id === resourceId);
    setFormData((prev) => ({
      ...prev,
      asset_type_id: resourceId,
      resource_type_id: selected?.resource_type_id || '',
    }));
    if (errors.resource_type_id) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.resource_type_id;
        return next;
      });
    }
  };

  const addSpecRow = () => {
    setSpecRows((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateSpecRow = (index: number, field: 'key' | 'value', val: string) => {
    setSpecRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeSpecRow = (index: number) => {
    setSpecRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedFormSubCategory) errs.sub_category = 'Category is required';
    if (!formData.asset_type_id) errs.resource_type_id = 'Equipment type is required';
    if (!formData.name.trim()) errs.name = 'Name is required';
    // Skip owner validation when locked from wizard (already set)
    if (!lockedContactId && !formData.owner_contact_id) errs.owner_contact_id = 'Client / Owner is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const specifications: Record<string, string> = {};
    for (const row of specRows) {
      if (row.key.trim() && row.value.trim()) {
        specifications[row.key.trim()] = row.value.trim();
      }
    }
    await onSubmit({ ...formData, specifications });
  };

  // ── Styles ──────────────────────────────────────────────────────

  const sectionHeaderStyle = {
    fontSize: '11px',
    fontWeight: 700 as const,
    color: colors.utility.secondaryText,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${colors.utility.primaryText}10`,
  };

  if (!isOpen) return null;

  // Get config for selected sub_category (for visual feedback)
  const selectedSubCatConfig = getSubCategoryConfig(selectedFormSubCategory);
  const SubCatIcon = selectedSubCatConfig?.icon || Package;
  const subCatColor = selectedSubCatConfig?.color || '#6B7280';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer — slides in from right */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[560px] lg:w-[620px] shadow-2xl border-l flex flex-col animate-slide-in-right"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: `${colors.utility.primaryText}15`,
        }}
      >
        {/* ── Drawer Header ──────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: `${colors.utility.primaryText}12` }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {mode === 'create' ? 'Add Equipment' : `Edit: ${asset?.name || ''}`}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
              {mode === 'create'
                ? 'Register new equipment in your asset registry.'
                : 'Update the equipment details below.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{ color: colors.utility.secondaryText }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Form Body ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Step 1: Category (sub_category) ────────────────── */}
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: `${subCatColor}06`,
              borderColor: `${subCatColor}20`,
            }}
          >
            <h4 style={{ ...sectionHeaderStyle, color: subCatColor, borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>
              Category <span className="text-red-500">*</span>
            </h4>
            <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
              What category does this equipment belong to?
            </p>
            {distinctSubCategories.length > 0 ? (
              <Select
                value={selectedFormSubCategory}
                onValueChange={handleSubCategoryChange}
              >
                <SelectTrigger
                  style={{
                    borderColor: errors.sub_category ? '#ef4444' : colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                >
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {distinctSubCategories.map((subCat) => {
                    const cfg = getSubCategoryConfig(subCat);
                    const Icon = cfg?.icon || Package;
                    return (
                      <SelectItem key={subCat} value={subCat}>
                        <span className="flex items-center gap-2">
                          <Icon size={14} style={{ color: cfg?.color || '#6B7280' }} />
                          {subCat}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                No categories configured. Add equipment in Settings &rarr; Resources first.
              </p>
            )}
            {errors.sub_category && <p className="text-xs text-red-500 mt-1">{errors.sub_category}</p>}

            {/* ── Step 2: Equipment Type (resource within category) ── */}
            {selectedFormSubCategory && (
              <div className="mt-4">
                <h4 style={{ ...sectionHeaderStyle, color: subCatColor, borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>
                  Equipment Type <span className="text-red-500">*</span>
                </h4>
                <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                  Which specific equipment in {selectedFormSubCategory}?
                </p>
                {filteredEquipmentTypes.length > 0 ? (
                  <Select
                    value={formData.asset_type_id || ''}
                    onValueChange={handleEquipmentTypeChange}
                  >
                    <SelectTrigger
                      style={{
                        borderColor: errors.resource_type_id ? '#ef4444' : colors.utility.primaryText + '20',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                      }}
                    >
                      <SelectValue placeholder="Select equipment type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEquipmentTypes.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    No equipment types in this category.
                  </p>
                )}
                {errors.resource_type_id && <p className="text-xs text-red-500 mt-1">{errors.resource_type_id}</p>}
              </div>
            )}

            {/* Client / Owner */}
            <h4 style={{ ...sectionHeaderStyle, color: subCatColor, borderBottom: 'none', paddingBottom: 0, marginBottom: '8px', marginTop: '16px' }}>
              Client / Owner
            </h4>
            <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
              Whose equipment is this?
            </p>
            {lockedContactId ? (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm"
                style={{
                  borderColor: colors.brand.primary + '30',
                  backgroundColor: colors.brand.primary + '06',
                  color: colors.utility.primaryText,
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: colors.brand.primary + '18', color: colors.brand.primary }}
                >
                  {(lockedContactName || 'C').charAt(0).toUpperCase()}
                </div>
                <span className="font-medium truncate">{lockedContactName || 'Selected Client'}</span>
                <span
                  className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }}
                >
                  Contract Buyer
                </span>
              </div>
            ) : (
              <ContactPicker
                value={formData.owner_contact_id}
                onChange={(contactId) => updateField('owner_contact_id', contactId)}
                placeholder="Search client by name, email, or company..."
                classifications={['client']}
              />
            )}
            {errors.owner_contact_id && <p className="text-xs text-red-500 mt-1">{errors.owner_contact_id}</p>}
          </div>

          {/* ── Basic Information ─────────────────────────────────── */}
          <div>
            <h4 style={sectionHeaderStyle}>Basic Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label style={{ color: colors.utility.primaryText }}>
                  Equipment Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., MRI Scanner"
                  className="mt-1"
                  style={{
                    borderColor: errors.name ? '#ef4444' : colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label style={{ color: colors.utility.primaryText }}>Make / Manufacturer</Label>
                <Input
                  value={formData.make || ''}
                  onChange={(e) => updateField('make', e.target.value)}
                  placeholder="e.g., GE Healthcare"
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Model</Label>
                <Input
                  value={formData.model || ''}
                  onChange={(e) => updateField('model', e.target.value)}
                  placeholder="e.g., Signa HDxt 1.5T"
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>

              <div>
                <Label style={{ color: colors.utility.primaryText }}>Serial Number</Label>
                <Input
                  value={formData.serial_number || ''}
                  onChange={(e) => updateField('serial_number', e.target.value)}
                  placeholder="e.g., GE2024MRI001"
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Asset Code</Label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => updateField('code', e.target.value)}
                  placeholder="e.g., AST-MRI-001"
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>

              <div className="col-span-2">
                <Label style={{ color: colors.utility.primaryText }}>Location</Label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g., Radiology Dept, Floor 2"
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>

              <div className="col-span-2">
                <Label style={{ color: colors.utility.primaryText }}>Description</Label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Optional notes about this equipment..."
                  rows={2}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Warranty & Dates ─────────────────────────────────── */}
          <div>
            <h4 style={sectionHeaderStyle}>Warranty & Dates</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Purchase Date</Label>
                <Input
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={(e) => updateField('purchase_date', e.target.value)}
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Warranty Expiry</Label>
                <Input
                  type="date"
                  value={formData.warranty_expiry || ''}
                  onChange={(e) => updateField('warranty_expiry', e.target.value)}
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Last Service Date</Label>
                <Input
                  type="date"
                  value={formData.last_service_date || ''}
                  onChange={(e) => updateField('last_service_date', e.target.value)}
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Condition & Criticality ──────────────────────────── */}
          <div>
            <h4 style={sectionHeaderStyle}>Condition & Criticality</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(v) => updateField('condition', v as AssetCondition)}
                >
                  <SelectTrigger
                    className="mt-1"
                    style={{
                      borderColor: colors.utility.primaryText + '20',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CONDITION_CONFIG) as [AssetCondition, typeof CONDITION_CONFIG['good']][]).map(
                      ([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span style={{ color: cfg.color }}>{cfg.label}</span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{ color: colors.utility.primaryText }}>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => updateField('status', v as AssetStatus)}
                >
                  <SelectTrigger
                    className="mt-1"
                    style={{
                      borderColor: colors.utility.primaryText + '20',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [AssetStatus, typeof STATUS_CONFIG['active']][]).map(
                      ([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span style={{ color: cfg.color }}>{cfg.label}</span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Criticality Selector (visual chips) */}
            <div className="mt-3">
              <Label style={{ color: colors.utility.primaryText }}>Criticality</Label>
              <div className="flex gap-2 mt-2">
                {(Object.entries(CRITICALITY_CONFIG) as [AssetCriticality, typeof CRITICALITY_CONFIG['low']][]).map(
                  ([key, cfg]) => {
                    const isActive = formData.criticality === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('criticality', key)}
                        className="flex-1 py-2.5 rounded-lg text-center text-xs font-semibold transition-all"
                        style={{
                          border: `2px solid ${isActive ? cfg.color : colors.utility.primaryText + '15'}`,
                          backgroundColor: isActive ? cfg.bg : 'transparent',
                          color: isActive ? cfg.color : colors.utility.secondaryText,
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* ── Specifications ───────────────────────────────────── */}
          <div>
            <h4 style={sectionHeaderStyle}>Specifications</h4>
            <div className="space-y-2">
              {specRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={row.key}
                    onChange={(e) => updateSpecRow(idx, 'key', e.target.value)}
                    placeholder="Key"
                    className="flex-1"
                    style={{
                      borderColor: colors.utility.primaryText + '20',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                    }}
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => updateSpecRow(idx, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                    style={{
                      borderColor: colors.utility.primaryText + '20',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecRow(idx)}
                    className="p-1.5 rounded-full border transition-colors hover:opacity-80"
                    style={{
                      borderColor: colors.utility.primaryText + '20',
                      color: colors.utility.secondaryText,
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSpecRow}
              className="text-xs font-semibold mt-2 inline-flex items-center gap-1 transition-colors hover:underline"
              style={{ color: colors.brand.primary }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add specification
            </button>
          </div>
        </div>

        {/* ── Sticky Footer ──────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: `${colors.utility.primaryText}12` }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              borderColor: colors.utility.primaryText + '20',
              color: colors.utility.secondaryText,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="transition-colors hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              color: '#FFFFFF',
            }}
          >
            {isSubmitting
              ? 'Saving...'
              : mode === 'create'
                ? 'Save Equipment'
                : 'Update Equipment'}
          </Button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default EquipmentFormDialog;

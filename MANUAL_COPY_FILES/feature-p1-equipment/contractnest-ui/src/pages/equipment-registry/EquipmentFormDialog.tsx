// src/pages/settings/Equipment/EquipmentFormDialog.tsx
// Dialog for creating / editing an equipment asset

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  resourceTypeId?: string;
  onSubmit: (data: AssetFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const EquipmentFormDialog: React.FC<EquipmentFormDialogProps> = ({
  isOpen,
  onClose,
  mode,
  asset,
  resourceTypeId,
  onSubmit,
  isSubmitting = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── Form State ──────────────────────────────────────────────────

  const [formData, setFormData] = useState<AssetFormData>(DEFAULT_FORM_DATA);
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialise form when dialog opens
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
      // Convert spec object to rows
      const specs = asset.specifications || {};
      setSpecRows(Object.entries(specs).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      setFormData({ ...DEFAULT_FORM_DATA, resource_type_id: resourceTypeId || '' });
      setSpecRows([]);
    }
    setErrors({});
  }, [isOpen, mode, asset, resourceTypeId]);

  // ── Handlers ────────────────────────────────────────────────────

  const updateField = (field: keyof AssetFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
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
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.resource_type_id) errs.resource_type_id = 'Resource type is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Build specifications from rows
    const specifications: Record<string, string> = {};
    for (const row of specRows) {
      if (row.key.trim() && row.value.trim()) {
        specifications[row.key.trim()] = row.value.trim();
      }
    }

    await onSubmit({ ...formData, specifications });
  };

  // ── Render ──────────────────────────────────────────────────────

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.utility.primaryText }}>
            {mode === 'create' ? 'Add Equipment' : `Edit: ${asset?.name || ''}`}
          </DialogTitle>
          <DialogDescription style={{ color: colors.utility.secondaryText }}>
            {mode === 'create'
              ? 'Register new equipment in your asset registry.'
              : 'Update the equipment details below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ── Basic Information ────────────────────────────────── */}
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

            {/* Criticality Selector (visual chips like mockup) */}
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentFormDialog;

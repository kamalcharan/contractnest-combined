// src/components/assets/ClientAssetFormDialog.tsx
// Modal dialog for creating/editing a client-owned asset

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { useEquipmentCategories } from '@/hooks/queries/useClientAssetRegistry';
import type { ClientAsset, ClientAssetFormData, AssetStatus, AssetCondition, AssetCriticality } from '@/types/clientAssetRegistry';
import { DEFAULT_CLIENT_ASSET_FORM_DATA } from '@/types/clientAssetRegistry';

interface ClientAssetFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  contactId: string;
  asset?: ClientAsset;
  resourceTypeId?: string;
  onSubmit: (data: ClientAssetFormData) => Promise<void>;
  isSubmitting: boolean;
}

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

const CRITICALITY_OPTIONS: { value: AssetCriticality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const ClientAssetFormDialog: React.FC<ClientAssetFormDialogProps> = ({
  isOpen,
  onClose,
  mode,
  contactId,
  asset,
  resourceTypeId,
  onSubmit,
  isSubmitting,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { data: categories = [] } = useEquipmentCategories();

  const [form, setForm] = useState<ClientAssetFormData>({
    ...DEFAULT_CLIENT_ASSET_FORM_DATA,
    owner_contact_id: contactId,
    resource_type_id: resourceTypeId || '',
  });

  useEffect(() => {
    if (mode === 'edit' && asset) {
      setForm({
        name: asset.name,
        owner_contact_id: asset.owner_contact_id,
        resource_type_id: asset.resource_type_id,
        asset_type_id: asset.asset_type_id || undefined,
        code: asset.code || undefined,
        description: asset.description || undefined,
        status: asset.status,
        condition: asset.condition,
        criticality: asset.criticality,
        location: asset.location || undefined,
        make: asset.make || undefined,
        model: asset.model || undefined,
        serial_number: asset.serial_number || undefined,
        purchase_date: asset.purchase_date || undefined,
        warranty_expiry: asset.warranty_expiry || undefined,
        last_service_date: asset.last_service_date || undefined,
        area_sqft: asset.area_sqft || undefined,
        capacity: asset.capacity || undefined,
        specifications: asset.specifications as Record<string, string> || {},
        tags: asset.tags || [],
      });
    } else {
      setForm({
        ...DEFAULT_CLIENT_ASSET_FORM_DATA,
        owner_contact_id: contactId,
        resource_type_id: resourceTypeId || '',
      });
    }
  }, [mode, asset, contactId, resourceTypeId, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ClientAssetFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const isEquipment = ['equipment', 'consumable'].includes(form.resource_type_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border shadow-xl p-6"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: colors.utility.primaryText + '15',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
            {mode === 'create' ? 'Add Asset' : 'Edit Asset'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:opacity-70">
            <X className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>
              Asset Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Split AC 1.5T — Master Bedroom"
              required
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>
              Equipment Category *
            </label>
            <select
              value={form.resource_type_id}
              onChange={(e) => handleChange('resource_type_id', e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
              }}
            >
              <option value="">Select category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>
              Asset Code
            </label>
            <Input
              value={form.code || ''}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g., AC-001"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
            />
          </div>

          {/* Status / Condition / Criticality Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-2 py-2 rounded-md border text-sm"
                style={{ borderColor: colors.utility.primaryText + '20', backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText }}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Condition</label>
              <select
                value={form.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full px-2 py-2 rounded-md border text-sm"
                style={{ borderColor: colors.utility.primaryText + '20', backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText }}
              >
                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Criticality</label>
              <select
                value={form.criticality}
                onChange={(e) => handleChange('criticality', e.target.value)}
                className="w-full px-2 py-2 rounded-md border text-sm"
                style={{ borderColor: colors.utility.primaryText + '20', backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText }}
              >
                {CRITICALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Location</label>
            <Input
              value={form.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., Building A, Floor 3"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
            />
          </div>

          {/* Equipment-specific fields */}
          {isEquipment && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Make</label>
                  <Input
                    value={form.make || ''}
                    onChange={(e) => handleChange('make', e.target.value)}
                    placeholder="e.g., Daikin"
                    style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Model</label>
                  <Input
                    value={form.model || ''}
                    onChange={(e) => handleChange('model', e.target.value)}
                    placeholder="e.g., FTKF50TV"
                    style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Serial Number</label>
                <Input
                  value={form.serial_number || ''}
                  onChange={(e) => handleChange('serial_number', e.target.value)}
                  style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Purchase Date</label>
                  <Input
                    type="date"
                    value={form.purchase_date || ''}
                    onChange={(e) => handleChange('purchase_date', e.target.value)}
                    style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Warranty Expiry</label>
                  <Input
                    type="date"
                    value={form.warranty_expiry || ''}
                    onChange={(e) => handleChange('warranty_expiry', e.target.value)}
                    style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Entity-specific fields */}
          {!isEquipment && form.resource_type_id && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Area (sqft)</label>
                <Input
                  type="number"
                  value={form.area_sqft || ''}
                  onChange={(e) => handleChange('area_sqft', e.target.value ? Number(e.target.value) : undefined)}
                  style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Capacity</label>
                <Input
                  type="number"
                  value={form.capacity || ''}
                  onChange={(e) => handleChange('capacity', e.target.value ? Number(e.target.value) : undefined)}
                  style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md border text-sm resize-none"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.name || !form.resource_type_id}
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                color: '#fff',
              }}
            >
              {isSubmitting ? <VaNiLoader size="sm" /> : mode === 'create' ? 'Add Asset' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientAssetFormDialog;

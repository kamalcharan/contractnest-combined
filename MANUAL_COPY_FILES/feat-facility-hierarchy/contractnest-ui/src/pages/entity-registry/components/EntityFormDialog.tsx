// src/pages/entity-registry/components/EntityFormDialog.tsx
// Right-side drawer for creating / editing a facility entity
// Supports: entity type selection, parent picker, entity-specific fields

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import ContactPicker from '@/components/common/ContactPicker';
import { useContact } from '@/hooks/useContacts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getEntityTypeList,
  getEntityTypeConfig,
  getValidChildTypes,
  getRootEntityTypes,
  ENTITY_TYPE_SPEC_KEY,
  type EntityTypeConfig,
} from '@/constants/entityTypeConfig';
import type {
  TenantAsset,
  AssetFormData,
  AssetCondition,
  AssetCriticality,
  AssetStatus,
  AssetOwnershipType,
} from '@/types/assetRegistry';
import {
  DEFAULT_FORM_DATA,
  CONDITION_CONFIG,
  CRITICALITY_CONFIG,
  STATUS_CONFIG,
} from '@/types/assetRegistry';

interface EntityFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  asset?: TenantAsset;
  onSubmit: (data: AssetFormData) => Promise<void>;
  isSubmitting?: boolean;
  /** Pre-selected parent when adding a child from the detail panel */
  defaultParent?: TenantAsset | null;
  /** All root entities for parent picker selection */
  rootEntities: TenantAsset[];
  /** Default ownership type based on perspective */
  defaultOwnershipType?: AssetOwnershipType;
}

const EntityFormDialog: React.FC<EntityFormDialogProps> = ({
  isOpen,
  onClose,
  mode,
  asset,
  onSubmit,
  isSubmitting = false,
  defaultParent,
  rootEntities,
  defaultOwnershipType = 'client',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── Resolve owner contact name for edit-mode ──
  const editOwnerContactId = mode === 'edit' && asset?.owner_contact_id ? asset.owner_contact_id : '';
  const { data: editOwnerContact, loading: editOwnerLoading } = useContact(editOwnerContactId);

  // ── Form State ──
  const [formData, setFormData] = useState<AssetFormData>({
    ...DEFAULT_FORM_DATA,
    resource_type_id: 'asset',
  });
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived: available entity types ──
  const availableEntityTypes = useMemo(() => {
    if (mode === 'edit') {
      // In edit mode, show all types
      return getEntityTypeList();
    }
    if (defaultParent) {
      // Adding a child — only show valid child types
      const parentType = defaultParent.specifications?.[ENTITY_TYPE_SPEC_KEY];
      if (parentType) return getValidChildTypes(parentType);
    }
    // No parent preselected — show root types + any type
    return getEntityTypeList();
  }, [mode, defaultParent]);

  // ── Selected entity type config ──
  const entityTypeConfig = useMemo(
    () => getEntityTypeConfig(selectedEntityType),
    [selectedEntityType]
  );

  // ── Flat list of possible parents (root entities) for parent picker ──
  const parentOptions = useMemo(() => {
    if (!selectedEntityType) return [];
    const config = getEntityTypeConfig(selectedEntityType);
    if (!config || config.allowedParentTypes.length === 0) return []; // root type, no parent needed
    // Filter root entities to only those whose entity_type is in allowedParentTypes
    // Note: this is simplified — for deeper hierarchy, parent could be at any level
    // For now, we show root entities as selectable parents
    return rootEntities.filter((e) => {
      const eType = e.specifications?.[ENTITY_TYPE_SPEC_KEY];
      return eType && config.allowedParentTypes.includes(eType);
    });
  }, [selectedEntityType, rootEntities]);

  // ── Initialise form ──
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && asset) {
      setFormData({
        name: asset.name,
        resource_type_id: 'asset',
        asset_type_id: asset.asset_type_id || undefined,
        parent_asset_id: asset.parent_asset_id || undefined,
        code: asset.code || undefined,
        description: asset.description || undefined,
        status: asset.status,
        condition: asset.condition,
        criticality: asset.criticality,
        ownership_type: asset.ownership_type || defaultOwnershipType,
        owner_contact_id: asset.owner_contact_id || undefined,
        location: asset.location || undefined,
        area_sqft: asset.area_sqft || undefined,
        capacity: asset.capacity || undefined,
        specifications: asset.specifications || {},
        tags: asset.tags || [],
      });
      setSelectedEntityType(asset.specifications?.[ENTITY_TYPE_SPEC_KEY] || '');
      const specs = asset.specifications || {};
      setSpecRows(
        Object.entries(specs)
          .filter(([k]) => k !== ENTITY_TYPE_SPEC_KEY)
          .map(([key, value]) => ({ key, value: String(value) }))
      );
    } else {
      setFormData({
        ...DEFAULT_FORM_DATA,
        resource_type_id: 'asset',
        ownership_type: defaultOwnershipType,
        parent_asset_id: defaultParent?.id || undefined,
      });
      // If defaultParent is set, auto-determine which types are valid
      if (defaultParent) {
        const parentType = defaultParent.specifications?.[ENTITY_TYPE_SPEC_KEY];
        const childTypes = parentType ? getValidChildTypes(parentType) : [];
        // Auto-select if only one valid child type
        setSelectedEntityType(childTypes.length === 1 ? childTypes[0].id : '');
      } else {
        setSelectedEntityType('');
      }
      setSpecRows([]);
    }
    setErrors({});
  }, [isOpen, mode, asset, defaultParent, defaultOwnershipType]);

  // ── Handlers ──
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

  const handleEntityTypeChange = (typeId: string) => {
    setSelectedEntityType(typeId);
    const config = getEntityTypeConfig(typeId);
    // If switching to a root type, clear parent
    if (config && config.allowedParentTypes.length === 0) {
      setFormData((prev) => ({ ...prev, parent_asset_id: undefined }));
    }
    if (errors.entity_type) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.entity_type;
        return next;
      });
    }
  };

  const addSpecRow = () => setSpecRows((prev) => [...prev, { key: '', value: '' }]);
  const updateSpecRow = (idx: number, field: 'key' | 'value', val: string) => {
    setSpecRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };
  const removeSpecRow = (idx: number) => setSpecRows((prev) => prev.filter((_, i) => i !== idx));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedEntityType) errs.entity_type = 'Facility type is required';
    if (!formData.name.trim()) errs.name = 'Name is required';
    // Parent required for non-root types
    const config = getEntityTypeConfig(selectedEntityType);
    if (config && config.allowedParentTypes.length > 0 && !formData.parent_asset_id) {
      errs.parent_asset_id = 'Parent facility is required';
    }
    // Owner required for client ownership
    if (formData.ownership_type === 'client' && !formData.owner_contact_id) {
      errs.owner_contact_id = 'Client / Owner is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    // Build specifications with entity_type
    const specifications: Record<string, string> = {
      [ENTITY_TYPE_SPEC_KEY]: selectedEntityType,
    };
    for (const row of specRows) {
      if (row.key.trim() && row.value.trim()) {
        specifications[row.key.trim()] = row.value.trim();
      }
    }
    await onSubmit({ ...formData, specifications });
  };

  // ── Styles ──
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

  const iconColor = entityTypeConfig?.color || '#059669';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[560px] lg:w-[620px] shadow-2xl border-l flex flex-col animate-slide-in-right"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: `${colors.utility.primaryText}15`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: `${colors.utility.primaryText}12` }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {mode === 'create' ? 'Add Facility' : `Edit: ${asset?.name || ''}`}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
              {mode === 'create'
                ? defaultParent
                  ? `Adding child to ${defaultParent.name}`
                  : 'Register a new facility in your hierarchy.'
                : 'Update the facility details below.'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{ color: colors.utility.secondaryText, position: 'relative', zIndex: 10 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Step 1: Entity Type ── */}
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: `${iconColor}06`,
              borderColor: `${iconColor}20`,
            }}
          >
            <h4 style={{ ...sectionHeaderStyle, color: iconColor, borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>
              Facility Type <span className="text-red-500">*</span>
            </h4>
            <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
              What type of facility is this?
            </p>

            {availableEntityTypes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {availableEntityTypes.map((et) => {
                  const isActive = selectedEntityType === et.id;
                  const EtIcon = et.icon;
                  return (
                    <button
                      key={et.id}
                      type="button"
                      onClick={() => handleEntityTypeChange(et.id)}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-left transition-all"
                      style={{
                        border: `2px solid ${isActive ? et.color : colors.utility.primaryText + '12'}`,
                        backgroundColor: isActive ? et.color + '08' : 'transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: et.color + '15' }}
                      >
                        <EtIcon size={16} style={{ color: et.color }} />
                      </div>
                      <div>
                        <div
                          className="text-xs font-bold"
                          style={{ color: isActive ? et.color : colors.utility.primaryText }}
                        >
                          {et.label}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Level {et.hierarchyLevel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                No valid facility types for this parent.
              </p>
            )}
            {errors.entity_type && <p className="text-xs text-red-500 mt-2">{errors.entity_type}</p>}

            {/* ── Step 2: Parent Entity ── */}
            {selectedEntityType && entityTypeConfig && entityTypeConfig.allowedParentTypes.length > 0 && (
              <div className="mt-4">
                <h4 style={{ ...sectionHeaderStyle, color: iconColor, borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>
                  Parent Facility <span className="text-red-500">*</span>
                </h4>
                <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                  Which {entityTypeConfig.allowedParentTypes.map(t => {
                    const cfg = getEntityTypeConfig(t);
                    return cfg?.label.toLowerCase() || t;
                  }).join(' or ')} does this belong to?
                </p>

                {defaultParent && mode === 'create' ? (
                  /* Locked parent from "Add Child" action */
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm"
                    style={{
                      borderColor: iconColor + '30',
                      backgroundColor: iconColor + '06',
                      color: colors.utility.primaryText,
                    }}
                  >
                    {(() => {
                      const parentType = getEntityTypeConfig(defaultParent.specifications?.[ENTITY_TYPE_SPEC_KEY]);
                      const ParentIcon = parentType?.icon;
                      return (
                        <>
                          {ParentIcon && <ParentIcon size={14} style={{ color: parentType?.color }} />}
                          <span className="font-medium truncate">{defaultParent.name}</span>
                          <span
                            className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: iconColor + '12', color: iconColor }}
                          >
                            {parentType?.label || 'Parent'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ) : parentOptions.length > 0 ? (
                  <Select
                    value={formData.parent_asset_id || ''}
                    onValueChange={(v) => updateField('parent_asset_id', v)}
                  >
                    <SelectTrigger
                      style={{
                        borderColor: errors.parent_asset_id ? '#ef4444' : colors.utility.primaryText + '20',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                      }}
                    >
                      <SelectValue placeholder="Select parent entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((p) => {
                        const pType = getEntityTypeConfig(p.specifications?.[ENTITY_TYPE_SPEC_KEY]);
                        const PIcon = pType?.icon;
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              {PIcon && <PIcon size={14} style={{ color: pType?.color }} />}
                              {p.name}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    No valid parent facilities found. Create a {entityTypeConfig.allowedParentTypes.join(' or ')} first.
                  </p>
                )}
                {errors.parent_asset_id && <p className="text-xs text-red-500 mt-1">{errors.parent_asset_id}</p>}
              </div>
            )}

            {/* ── Client / Owner — Revenue perspective only ── */}
            {defaultOwnershipType === 'client' && (
              <div className="mt-4">
                <h4 style={{ ...sectionHeaderStyle, color: iconColor, borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>
                  Client / Owner
                </h4>
                <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
                  Which client owns this facility?
                </p>
                {mode === 'edit' && formData.owner_contact_id ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm"
                    style={{
                      borderColor: colors.utility.primaryText + '20',
                      backgroundColor: colors.utility.primaryText + '04',
                      color: colors.utility.primaryText,
                      cursor: 'not-allowed',
                    }}
                  >
                    {editOwnerLoading ? (
                      <div className="flex-1 h-4 rounded animate-pulse" style={{ backgroundColor: colors.utility.primaryText + '12' }} />
                    ) : (
                      <>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: colors.utility.primaryText + '10', color: colors.utility.secondaryText }}
                        >
                          {(editOwnerContact?.company_name || editOwnerContact?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium truncate">
                          {editOwnerContact?.company_name || editOwnerContact?.name || 'Unknown Client'}
                        </span>
                      </>
                    )}
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
            )}
          </div>

          {/* ── Basic Information ── */}
          <div>
            <h4 style={sectionHeaderStyle}>Basic Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label style={{ color: colors.utility.primaryText }}>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder={entityTypeConfig ? `e.g., ${entityTypeConfig.label} A` : 'Facility name'}
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
                <Label style={{ color: colors.utility.primaryText }}>Code</Label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => updateField('code', e.target.value)}
                  placeholder="e.g., BLD-A1"
                  className="mt-1"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.utility.primaryText }}>Location</Label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g., Main Campus, Block A"
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
                  placeholder="Optional notes about this entity..."
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

          {/* ── Entity-Specific Fields (Area, Capacity, Dimensions) ── */}
          {entityTypeConfig && (entityTypeConfig.showAreaField || entityTypeConfig.showCapacityField) && (
            <div>
              <h4 style={sectionHeaderStyle}>Space & Capacity</h4>
              <div className="grid grid-cols-2 gap-3">
                {entityTypeConfig.showAreaField && (
                  <div>
                    <Label style={{ color: colors.utility.primaryText }}>Area (sqft)</Label>
                    <Input
                      type="number"
                      value={formData.area_sqft || ''}
                      onChange={(e) => updateField('area_sqft', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g., 1500"
                      className="mt-1"
                      style={{
                        borderColor: colors.utility.primaryText + '20',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                      }}
                    />
                  </div>
                )}
                {entityTypeConfig.showCapacityField && (
                  <div>
                    <Label style={{ color: colors.utility.primaryText }}>Capacity (people)</Label>
                    <Input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => updateField('capacity', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g., 50"
                      className="mt-1"
                      style={{
                        borderColor: colors.utility.primaryText + '20',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Condition & Status ── */}
          <div>
            <h4 style={sectionHeaderStyle}>Condition & Status</h4>
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

            {/* Criticality chips */}
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

          {/* ── Specifications ── */}
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

        {/* Sticky Footer */}
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
              background: `linear-gradient(135deg, #059669, #047857)`,
              color: '#FFFFFF',
            }}
          >
            {isSubmitting
              ? 'Saving...'
              : mode === 'create'
                ? 'Create Facility'
                : 'Update Facility'}
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

export default EntityFormDialog;

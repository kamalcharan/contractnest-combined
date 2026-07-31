// src/pages/admin/jtd/TemplateMappingPage.tsx
// Admin JTD Template Mapping — maps (tenant, source_type, channel) to an
// approved MSG91 template. Mandatory-tenant model: there is no path here to
// create an "open" system template — every row belongs to exactly one
// tenant, so a tenant with no row for a given trigger simply gets no
// message (fails visibly in the Event Explorer / DLQ) until an admin maps
// one for them. See 008_seed_group_session_source_types.sql for why.

import React, { useState } from 'react';
import { RefreshCw, Plus, Save, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import {
  useJtdTemplates,
  useJtdTemplateOptions,
  useJtdTemplateMutations,
} from './hooks/useJtdAdmin';
import { VaNiLoader } from '@/components/common/loaders';
import { vaniToast } from '@/components/common/toast';
import TenantPicker, { type TenantOption } from '@/components/common/TenantPicker';
import type { CreateTemplatePayload, JtdTemplateRecord } from './types/jtdAdmin.types';

const emptyForm: CreateTemplatePayload = {
  tenant_id: '',
  source_type_code: '',
  channel_code: 'whatsapp',
  provider_template_id: '',
  content: '',
  name: '',
  is_live: true,
};

const TemplateMappingPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  const [filterTenant, setFilterTenant] = useState<TenantOption | undefined>(undefined);
  const [filterSourceType, setFilterSourceType] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const { templates, loading, error, refresh } = useJtdTemplates({
    tenant_id: filterTenant?.id,
    source_type_code: filterSourceType || undefined,
    channel_code: filterChannel || undefined,
  });
  const { options } = useJtdTemplateOptions();
  const { createTemplate, updateTemplate, saving } = useJtdTemplateMutations();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTemplatePayload>(emptyForm);
  const [formTenant, setFormTenant] = useState<TenantOption | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProviderId, setEditingProviderId] = useState('');

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  const cardStyle = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.primaryText + '20',
  };

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: colors.utility.primaryText + '20',
    color: colors.utility.primaryText,
  };

  const handleCreate = async () => {
    if (!formTenant?.id || !form.source_type_code || !form.channel_code || !form.provider_template_id || !form.content) {
      vaniToast.error('Tenant, source type, channel, MSG91 template name, and content are all required');
      return;
    }
    const created = await createTemplate({ ...form, tenant_id: formTenant.id });
    if (created) {
      vaniToast.success('Template mapping created');
      setForm(emptyForm);
      setFormTenant(undefined);
      setShowForm(false);
      refresh();
    } else {
      vaniToast.error('Failed to create template mapping');
    }
  };

  const startEditProvider = (row: JtdTemplateRecord) => {
    setEditingId(row.id);
    setEditingProviderId(row.provider_template_id || '');
  };

  const saveEditProvider = async (row: JtdTemplateRecord) => {
    if (!editingProviderId.trim()) {
      vaniToast.error('MSG91 template name cannot be empty');
      return;
    }
    const updated = await updateTemplate(row.id, { provider_template_id: editingProviderId.trim() });
    if (updated) {
      vaniToast.success('Mapping updated');
      setEditingId(null);
      refresh();
    } else {
      vaniToast.error('Failed to update mapping');
    }
  };

  const toggleActive = async (row: JtdTemplateRecord) => {
    const updated = await updateTemplate(row.id, { is_active: !row.is_active });
    if (updated) {
      vaniToast.success(updated.is_active ? 'Mapping activated' : 'Mapping deactivated');
      refresh();
    } else {
      vaniToast.error('Failed to update mapping');
    }
  };

  return (
    <div
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold transition-colors" style={{ color: colors.utility.primaryText }}>
            Template Mapping
          </h1>
          <p className="text-sm mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
            Map a tenant + source type + channel to an approved MSG91 template. Every mapping belongs to exactly
            one tenant — a tenant with no mapping for a trigger simply won&apos;t receive it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.utility.primaryText}20` }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setForm(emptyForm); setFormTenant(undefined); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Cancel' : 'New mapping'}
          </button>
        </div>
      </div>

      {/* New mapping form */}
      {showForm && (
        <div className="rounded-lg shadow-sm border p-5 space-y-4 transition-colors" style={cardStyle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <TenantPicker
                label="Tenant *"
                value={formTenant}
                onChange={setFormTenant}
                placeholder="Search tenant by name..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                Source type <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <select
                value={form.source_type_code}
                onChange={(e) => setForm({ ...form, source_type_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="">Select…</option>
                {(options?.sourceTypes || []).map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                Channel <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <select
                value={form.channel_code}
                onChange={(e) => setForm({ ...form, channel_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                {(options?.channels || []).map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                MSG91 template name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Approved MSG91 provider_template_id"
                value={form.provider_template_id}
                onChange={(e) => setForm({ ...form, provider_template_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
              Content (documentation only — WhatsApp sends by the MSG91 template name above, not this text)
              <span style={{ color: colors.semantic.error }}> *</span>
            </label>
            <textarea
              rows={3}
              placeholder="What the approved MSG91 template actually says, for reference"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors disabled:opacity-50"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              <Save size={16} /> {saving ? 'Saving…' : 'Create mapping'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-start">
        <div className="w-64">
          <TenantPicker
            value={filterTenant}
            onChange={setFilterTenant}
            placeholder="Filter by tenant..."
          />
        </div>
        <select
          value={filterSourceType}
          onChange={(e) => setFilterSourceType(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
          style={inputStyle}
        >
          <option value="">All source types</option>
          {(options?.sourceTypes || []).map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
          style={inputStyle}
        >
          <option value="">All channels</option>
          {(options?.channels || []).map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {filterTenant && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-fit"
          style={{ backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }}
        >
          Showing mappings for <strong>{filterTenant.name}</strong>
          <button onClick={() => setFilterTenant(undefined)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {loading && <VaNiLoader size="md" message="Loading template mappings..." />}

      {error && (
        <div className="rounded-lg border p-4" style={{ backgroundColor: colors.semantic.error + '10', borderColor: colors.semantic.error + '40', color: colors.semantic.error }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-lg shadow-sm border overflow-hidden transition-colors" style={cardStyle}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: colors.utility.primaryBackground }}>
                {['Tenant', 'Source type', 'Channel', 'MSG91 template', 'Content', 'Env', 'Active', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold" style={{ color: colors.utility.secondaryText }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: colors.utility.secondaryText }}>
                    No template mappings yet.
                  </td>
                </tr>
              )}
              {templates.map((row) => (
                <tr key={row.id} className="border-t" style={{ borderColor: colors.utility.primaryText + '10' }}>
                  <td className="px-4 py-2 text-xs" style={{ color: colors.utility.primaryText }}>
                    {filterTenant && filterTenant.id === row.tenant_id
                      ? filterTenant.name
                      : <span className="font-mono">{row.tenant_id}</span>}
                  </td>
                  <td className="px-4 py-2" style={{ color: colors.utility.primaryText }}>{row.source_type_code}</td>
                  <td className="px-4 py-2" style={{ color: colors.utility.primaryText }}>{row.channel_code}</td>
                  <td className="px-4 py-2" style={{ color: colors.utility.primaryText }}>
                    {editingId === row.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingProviderId}
                          onChange={(e) => setEditingProviderId(e.target.value)}
                          className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2"
                          style={inputStyle}
                        />
                        <button onClick={() => saveEditProvider(row)} disabled={saving} className="text-xs font-medium" style={{ color: colors.semantic.success }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditProvider(row)} className="text-xs hover:underline text-left" title="Click to remap to a different MSG91 template">
                        {row.provider_template_id || '— set MSG91 template —'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate text-xs" style={{ color: colors.utility.secondaryText }} title={row.content}>
                    {row.content}
                  </td>
                  <td className="px-4 py-2 text-xs" style={{ color: colors.utility.secondaryText }}>{row.is_live ? 'Live' : 'Test'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(row)}
                      disabled={saving}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: row.is_active ? colors.semantic.success + '20' : colors.semantic.error + '20',
                        color: row.is_active ? colors.semantic.success : colors.semantic.error,
                      }}
                    >
                      {row.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TemplateMappingPage;

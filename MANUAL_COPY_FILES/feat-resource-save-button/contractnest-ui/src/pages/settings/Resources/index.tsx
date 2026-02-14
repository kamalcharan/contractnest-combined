import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useResourceTemplatesBrowser } from '@/hooks/queries/useResourceTemplates';
import { useCreateResource } from '@/hooks/queries/useResources';

const TABS = ['All', 'Equipment', 'Entities'];

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [activeTab, setActiveTab] = useState('All');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localSaved, setLocalSaved] = useState<Set<string>>(new Set());

  const { templates, isLoading, isError, error, invalidate } = useResourceTemplatesBrowser({ limit: 100 });
  const createResource = useCreateResource();

  // Filter by tab using resource_type_id
  const filtered = activeTab === 'All'
    ? templates
    : templates.filter(t => {
        const typeId = (t.resource_type_id || '').toLowerCase();
        if (activeTab === 'Equipment') return typeId === 'equipment' || typeId === 'asset' || typeId === 'consumable';
        if (activeTab === 'Entities') return typeId === 'team_staff' || typeId === 'partner';
        return true;
      });

  const handleSave = async (template: typeof templates[0]) => {
    if (savingId || template.already_added || localSaved.has(template.id)) return;

    setSavingId(template.id);
    try {
      await createResource.mutateAsync({
        data: {
          resource_type_id: template.resource_type_id,
          name: template.name,
          display_name: template.name,
          description: template.description || undefined,
        },
      });
      setLocalSaved(prev => new Set(prev).add(template.id));
      invalidate();
    } catch {
      // Toast already handled by useCreateResource onError
    } finally {
      setSavingId(null);
    }
  };

  const isAdded = (t: typeof templates[0]) => t.already_added || localSaved.has(t.id);

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: colors.utility.primaryBackground }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/settings/configure')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            border: `1px solid ${colors.utility.secondaryText}40`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.utility.primaryText, margin: 0 }}>
            Resources
          </h1>
          <p style={{ fontSize: 13, color: colors.utility.secondaryText, margin: 0 }}>
            Browse and add resources your business services
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isActive ? colors.brand.primary : colors.utility.secondaryBackground,
                color: isActive ? '#FFFFFF' : colors.utility.primaryText,
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 40, color: colors.utility.secondaryText }}>
          <Loader2 size={20} className="animate-spin" /> Loading templates...
        </div>
      ) : isError ? (
        <div style={{ padding: 20, color: colors.semantic?.error || '#dc2626' }}>
          Error: {error?.message || 'Failed to load templates'}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: colors.utility.secondaryText, marginBottom: 12 }}>
            {filtered.length} templates found
          </p>
          {filtered.map(t => {
            const added = isAdded(t);
            const isSaving = savingId === t.id;

            return (
              <div
                key={t.id}
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8,
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}15`,
                  color: colors.utility.primaryText,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{t.name}</strong>
                  <span style={{ marginLeft: 12, fontSize: 12, color: colors.utility.secondaryText }}>
                    {t.resource_type_id || '—'}
                  </span>
                  {t.description && (
                    <p style={{ fontSize: 12, color: colors.utility.secondaryText, margin: '4px 0 0' }}>
                      {t.description}
                    </p>
                  )}
                </div>

                {added ? (
                  <span
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: colors.semantic?.success || '#16a34a', fontWeight: 600,
                    }}
                  >
                    <Check size={14} /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => handleSave(t)}
                    disabled={isSaving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      backgroundColor: colors.brand.primary,
                      color: '#FFFFFF',
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {isSaving ? (
                      <><Loader2 size={13} className="animate-spin" /> Saving...</>
                    ) : (
                      <><Plus size={13} /> Add</>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResourcesPage;

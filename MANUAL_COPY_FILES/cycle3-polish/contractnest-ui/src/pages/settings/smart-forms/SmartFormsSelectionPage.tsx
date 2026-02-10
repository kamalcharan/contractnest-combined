// ============================================================================
// SmartFormsSelectionPage — 30:70 layout with toggle list + form preview
// FIXED: inline theme styles, product ConfirmationDialog, glassmorphic
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Search,
  Tag,
  Info,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import FormRenderer from './components/FormRenderer';
import type { TenantSelection, FormSchema } from './types';

// ---- Approved Template ----
interface ApprovedTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  form_type: string;
  tags: string[];
  version: number;
  status: string;
  schema: FormSchema;
}

const SmartFormsSelectionPage = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [selections, setSelections] = useState<TenantSelection[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<ApprovedTemplate | null>(null);

  // Fetch approved templates + existing selections
  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.id) { setLoading(false); return; }
      try {
        setLoading(true);
        const [templatesRes, selectionsRes] = await Promise.all([
          api.get(API_ENDPOINTS.SMART_FORMS.ADMIN.LIST + '?status=approved'),
          api.get(API_ENDPOINTS.SMART_FORMS.SELECTIONS.LIST),
        ]);
        setTemplates(templatesRes.data?.data || templatesRes.data || []);
        setSelections(selectionsRes.data?.data || []);
      } catch (error: any) {
        captureException(error, { tags: { component: 'SmartFormsSelectionPage', action: 'fetchData' } });
        vaniToast.error('Error', { message: 'Failed to load smart forms', duration: 4000 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentTenant?.id]);

  const isSelected = (templateId: string): boolean => {
    return selections.find((s) => s.form_template_id === templateId)?.is_active === true;
  };

  const handleToggle = useCallback(async (templateId: string) => {
    if (togglingId) return;
    setTogglingId(templateId);
    try {
      const response = await api.post(API_ENDPOINTS.SMART_FORMS.SELECTIONS.TOGGLE, { form_template_id: templateId });
      const updated: TenantSelection = response.data;
      setSelections((prev) => {
        const idx = prev.findIndex((s) => s.form_template_id === templateId);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
        return [...prev, updated];
      });
      const name = templates.find((t) => t.id === templateId)?.name || 'Form';
      vaniToast.success(updated.is_active ? 'Selected' : 'Deselected', {
        message: `${name} has been ${updated.is_active ? 'added to' : 'removed from'} your forms`,
        duration: 2500,
      });
    } catch (error: any) {
      captureException(error, { tags: { component: 'SmartFormsSelectionPage', action: 'toggle' } });
      vaniToast.error('Error', { message: 'Failed to update selection', duration: 4000 });
    } finally {
      setTogglingId(null);
    }
  }, [togglingId, templates]);

  const categories = Array.from(new Set(templates.map((t) => t.category))).sort();

  const filtered = templates.filter((t) => {
    const matchSearch = !searchTerm
      || t.name.toLowerCase().includes(searchTerm.toLowerCase())
      || (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (t.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const selectedCount = selections.filter((s) => s.is_active).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <VaNiLoader size="md" text="Loading Smart Forms..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.utility.secondaryText + '10'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: colors.utility.primaryText }}>
              Smart Forms
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.utility.secondaryText }}>
              Select which form templates your team can use
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          borderRadius: '999px',
          fontSize: '0.8125rem',
          fontWeight: 500,
          backgroundColor: colors.brand.primary + '10',
          color: colors.brand.primary,
          border: `1px solid ${colors.brand.primary}20`,
        }}>
          <FileText style={{ width: 16, height: 16 }} />
          {selectedCount} selected
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderRadius: '12px',
        border: `1px solid ${colors.utility.secondaryText}20`,
        backgroundColor: colors.utility.secondaryBackground,
        padding: '0.75rem',
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: colors.utility.secondaryText + '60' }} />
          <input
            type="text"
            placeholder="Search by name, description or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.25rem',
              paddingRight: '0.75rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.secondaryText}20`,
            backgroundColor: colors.utility.primaryBackground,
            color: colors.utility.primaryText,
            fontSize: '0.8125rem',
            outline: 'none',
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        borderRadius: '8px',
        border: `1px solid ${colors.brand.primary}15`,
        backgroundColor: colors.brand.primary + '05',
        padding: '0.75rem',
        fontSize: '0.8125rem',
        color: colors.utility.secondaryText,
      }}>
        <Info style={{ width: 16, height: 16, marginTop: '0.125rem', flexShrink: 0, color: colors.brand.primary }} />
        Toggle forms on/off to control which templates are available to your team. Click the eye icon to preview a form.
      </div>

      {/* 30:70 Layout */}
      <div style={{ flex: 1, display: 'flex', gap: '1rem', overflow: 'hidden', minHeight: 0 }}>
        {/* Left 30% — Form list */}
        <div style={{
          width: '30%',
          minWidth: '280px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          overflow: 'auto',
          paddingRight: '0.5rem',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              borderRadius: '12px',
              border: `1px solid ${colors.utility.secondaryText}10`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.secondaryText,
            }}>
              <FileText style={{ width: 40, height: 40, margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No forms found</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {searchTerm || filterCategory !== 'all' ? 'Try adjusting your search or filter' : 'No approved templates available yet'}
              </p>
            </div>
          ) : (
            filtered.map((template) => {
              const active = isSelected(template.id);
              const isToggling = togglingId === template.id;
              const isPreviewing = previewTemplate?.id === template.id;

              return (
                <div
                  key={template.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '10px',
                    border: `1px solid ${isPreviewing ? colors.brand.primary + '40' : active ? colors.brand.primary + '25' : colors.utility.secondaryText + '15'}`,
                    backgroundColor: isPreviewing ? colors.brand.primary + '08' : active ? colors.brand.primary + '05' : colors.utility.secondaryBackground,
                    padding: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setPreviewTemplate(template)}
                >
                  {/* Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: active ? colors.brand.primary + '15' : colors.utility.secondaryText + '08',
                    color: active ? colors.brand.primary : colors.utility.secondaryText,
                  }}>
                    <FileText style={{ width: 18, height: 18 }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: colors.utility.primaryText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {template.name}
                      </span>
                      <span style={{
                        fontSize: '0.5625rem',
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '999px',
                        backgroundColor: colors.utility.secondaryText + '10',
                        color: colors.utility.secondaryText,
                        flexShrink: 0,
                      }}>
                        v{template.version}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.625rem',
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '999px',
                        backgroundColor: colors.brand.secondary + '10',
                        color: colors.brand.secondary,
                      }}>
                        {template.category}
                      </span>
                      <span style={{
                        fontSize: '0.625rem',
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '999px',
                        backgroundColor: colors.semantic.success + '10',
                        color: colors.semantic.success,
                      }}>
                        {template.form_type}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewTemplate(template); }}
                      style={{
                        padding: '0.25rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        color: isPreviewing ? colors.brand.primary : colors.utility.secondaryText,
                      }}
                      title="Preview form"
                    >
                      <Eye style={{ width: 16, height: 16 }} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(template.id); }}
                      disabled={isToggling}
                      style={{
                        padding: '0.25rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: isToggling ? 'wait' : 'pointer',
                        backgroundColor: 'transparent',
                      }}
                      title={active ? 'Deselect' : 'Select'}
                    >
                      {isToggling ? (
                        <Loader2 style={{ width: 22, height: 22, color: colors.brand.primary, animation: 'spin 1s linear infinite' }} />
                      ) : active ? (
                        <ToggleRight style={{ width: 22, height: 22, color: colors.brand.primary }} />
                      ) : (
                        <ToggleLeft style={{ width: 22, height: 22, color: colors.utility.secondaryText + '40' }} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 70% — Preview panel */}
        <div style={{
          flex: 1,
          borderRadius: '12px',
          border: `1px solid ${colors.utility.secondaryText}15`,
          backgroundColor: colors.utility.secondaryBackground,
          overflow: 'auto',
          padding: '1.5rem',
        }}>
          {previewTemplate ? (
            <div>
              {/* Preview header */}
              <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: `1px solid ${colors.utility.secondaryText}15` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: colors.utility.primaryText }}>
                    {previewTemplate.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      backgroundColor: colors.brand.secondary + '10',
                      color: colors.brand.secondary,
                    }}>{previewTemplate.category}</span>
                    <span style={{
                      fontSize: '0.6875rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      backgroundColor: colors.utility.secondaryText + '10',
                      color: colors.utility.secondaryText,
                    }}>v{previewTemplate.version}</span>
                  </div>
                </div>
                {previewTemplate.description && (
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: colors.utility.secondaryText }}>
                    {previewTemplate.description}
                  </p>
                )}
                {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {previewTemplate.tags.map((tag) => (
                      <span key={tag} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.625rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '999px',
                        backgroundColor: colors.utility.secondaryText + '08',
                        color: colors.utility.secondaryText,
                      }}>
                        <Tag style={{ width: 10, height: 10 }} />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* FormRenderer in readOnly mode */}
              {previewTemplate.schema ? (
                <FormRenderer
                  schema={previewTemplate.schema}
                  onSubmit={() => {}}
                  readOnly={true}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.utility.secondaryText, fontSize: '0.8125rem' }}>
                  No schema available for preview
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: colors.utility.secondaryText,
              textAlign: 'center',
              padding: '2rem',
            }}>
              <Eye style={{ width: 48, height: 48, opacity: 0.15, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>Select a form to preview</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                Click any form on the left to see its fields and structure
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartFormsSelectionPage;

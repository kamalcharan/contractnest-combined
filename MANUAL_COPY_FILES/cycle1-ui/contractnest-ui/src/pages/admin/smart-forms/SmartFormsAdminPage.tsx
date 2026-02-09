// src/pages/admin/smart-forms/SmartFormsAdminPage.tsx
// Admin Form Library — List, filter, and manage form templates
// Pattern: matches EventExplorerPage.tsx — hooks + toast + loaders + theme

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useFormTemplates, useFormTemplateMutations } from './hooks/useSmartFormsAdmin';
import { vaniToast } from '../../../components/common/toast';
import { VaNiLoader } from '../../../components/common/loaders/UnifiedLoader';
import type { FormTemplateFilters, FormTemplate, FormStatus } from './types/smartFormsAdmin.types';
import { FORM_CATEGORIES, FORM_TYPES, FORM_STATUSES } from './types/smartFormsAdmin.types';

const SmartFormsAdminPage: React.FC = () => {
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Filters
  const [filters, setFilters] = useState<FormTemplateFilters>({ page: 1, limit: 20 });

  // Data
  const { templates, pagination, loading, error, refresh } = useFormTemplates(filters);
  const mutations = useFormTemplateMutations();

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'submit-review' | 'approve' | 'reject' | 'archive' | 'clone' | 'new-version';
    template: FormTemplate;
    notes?: string;
  } | null>(null);

  // Admin gate
  if (!currentTenant?.is_admin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: colors.utility.textPrimary }}>
        Admin access required.
      </div>
    );
  }

  // Filter handlers
  const handleFilterChange = useCallback((key: keyof FormTemplateFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: key !== 'page' ? 1 : (value as number) }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, limit: 20 });
  }, []);

  // Action handlers with toast feedback
  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, template } = confirmAction;
    let result: FormTemplate | boolean | null = null;

    switch (type) {
      case 'delete':
        result = await mutations.deleteTemplate(template.id);
        if (result) {
          vaniToast.success(`Template "${template.name}" deleted`);
          refresh();
        }
        break;
      case 'submit-review':
        result = await mutations.submitForReview(template.id);
        if (result) {
          vaniToast.success(`"${template.name}" submitted for review`);
          refresh();
        }
        break;
      case 'approve':
        result = await mutations.approveTemplate(template.id, confirmAction.notes);
        if (result) {
          vaniToast.success(`"${template.name}" approved`);
          refresh();
        }
        break;
      case 'reject':
        if (!confirmAction.notes) {
          vaniToast.error('Rejection notes are required');
          return;
        }
        result = await mutations.rejectTemplate(template.id, confirmAction.notes);
        if (result) {
          vaniToast.success(`"${template.name}" rejected`);
          refresh();
        }
        break;
      case 'archive':
        result = await mutations.archiveTemplate(template.id);
        if (result) {
          vaniToast.success(`"${template.name}" archived`);
          refresh();
        }
        break;
      case 'clone':
        result = await mutations.cloneTemplate(template.id);
        if (result) {
          vaniToast.success(`"${template.name}" cloned`);
          refresh();
        }
        break;
      case 'new-version':
        result = await mutations.newVersion(template.id);
        if (result) {
          vaniToast.success(`New version created from "${template.name}"`);
          refresh();
        }
        break;
    }

    if (!result && mutations.error) {
      vaniToast.error(mutations.error);
    }

    setConfirmAction(null);
  };

  // Status badge
  const getStatusBadge = (status: FormStatus) => {
    const s = FORM_STATUSES.find(fs => fs.value === status);
    if (!s) return null;
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: `${s.color}20`,
          color: s.color,
        }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: colors.utility.primaryBackground, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.utility.textPrimary, margin: 0 }}>
            Smart Forms
          </h1>
          <p style={{ fontSize: '0.875rem', color: colors.utility.textSecondary, margin: '0.25rem 0 0' }}>
            Manage form templates — create, review, approve, and version
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.borderLight}`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.textPrimary,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search name or description..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.borderLight}`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.textPrimary,
            fontSize: '0.875rem',
            minWidth: '220px',
          }}
        />
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.borderLight}`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.textPrimary,
            fontSize: '0.875rem',
          }}
        >
          <option value="">All Statuses</option>
          {FORM_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.borderLight}`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.textPrimary,
            fontSize: '0.875rem',
          }}
        >
          <option value="">All Categories</option>
          {FORM_CATEGORIES.map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={filters.form_type || ''}
          onChange={(e) => handleFilterChange('form_type', e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.borderLight}`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.textPrimary,
            fontSize: '0.875rem',
          }}
        >
          <option value="">All Types</option>
          {FORM_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        {(filters.search || filters.status || filters.category || filters.form_type) && (
          <button
            onClick={clearFilters}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#EF4444',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <VaNiLoader size="md" message="Loading templates..." />}

      {/* Error */}
      {error && !loading && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && templates.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: colors.utility.textSecondary,
          fontSize: '0.875rem',
        }}>
          No form templates found. Adjust filters or create your first template.
        </div>
      )}

      {/* Template list */}
      {!loading && templates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {templates.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                border: `1px solid ${colors.utility.borderLight}`,
                backgroundColor: colors.utility.secondaryBackground,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: colors.utility.textPrimary, fontSize: '0.9375rem' }}>
                    {t.name}
                  </span>
                  {getStatusBadge(t.status as FormStatus)}
                  <span style={{ fontSize: '0.75rem', color: colors.utility.textSecondary }}>
                    v{t.version}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: colors.utility.textSecondary }}>
                  {t.category} &middot; {t.form_type.replace(/_/g, ' ')}
                  {t.description && <span> &middot; {t.description.slice(0, 80)}{t.description.length > 80 ? '...' : ''}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => setConfirmAction({ type: 'clone', template: t })}
                  disabled={mutations.loading}
                  title="Clone"
                  style={actionBtnStyle}
                >
                  Clone
                </button>
                {t.status === 'draft' && (
                  <>
                    <button
                      onClick={() => setConfirmAction({ type: 'submit-review', template: t })}
                      disabled={mutations.loading}
                      title="Submit for Review"
                      style={{ ...actionBtnStyle, backgroundColor: '#3B82F6', color: '#fff' }}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'delete', template: t })}
                      disabled={mutations.loading}
                      title="Delete"
                      style={{ ...actionBtnStyle, backgroundColor: '#EF4444', color: '#fff' }}
                    >
                      Delete
                    </button>
                  </>
                )}
                {t.status === 'in_review' && (
                  <>
                    <button
                      onClick={() => setConfirmAction({ type: 'approve', template: t })}
                      disabled={mutations.loading}
                      title="Approve"
                      style={{ ...actionBtnStyle, backgroundColor: '#10B981', color: '#fff' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'reject', template: t, notes: '' })}
                      disabled={mutations.loading}
                      title="Reject"
                      style={{ ...actionBtnStyle, backgroundColor: '#F59E0B', color: '#fff' }}
                    >
                      Reject
                    </button>
                  </>
                )}
                {t.status === 'approved' && (
                  <>
                    <button
                      onClick={() => setConfirmAction({ type: 'new-version', template: t })}
                      disabled={mutations.loading}
                      title="New Version"
                      style={{ ...actionBtnStyle, backgroundColor: '#8B5CF6', color: '#fff' }}
                    >
                      New Ver.
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'archive', template: t })}
                      disabled={mutations.loading}
                      title="Archive"
                      style={actionBtnStyle}
                    >
                      Archive
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.25rem',
          fontSize: '0.875rem',
          color: colors.utility.textSecondary,
        }}>
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}
            –{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleFilterChange('page', pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={paginationBtnStyle}
            >
              Prev
            </button>
            <button
              onClick={() => handleFilterChange('page', pagination.page + 1)}
              disabled={!pagination.has_more}
              style={paginationBtnStyle}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirmation overlay */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '90%',
          }}>
            <h3 style={{ margin: '0 0 0.75rem', color: colors.utility.textPrimary, fontSize: '1.1rem' }}>
              {confirmAction.type === 'delete' && 'Delete Template?'}
              {confirmAction.type === 'submit-review' && 'Submit for Review?'}
              {confirmAction.type === 'approve' && 'Approve Template?'}
              {confirmAction.type === 'reject' && 'Reject Template?'}
              {confirmAction.type === 'archive' && 'Archive Template?'}
              {confirmAction.type === 'clone' && 'Clone Template?'}
              {confirmAction.type === 'new-version' && 'Create New Version?'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: colors.utility.textSecondary, margin: '0 0 1rem' }}>
              {confirmAction.template.name} (v{confirmAction.template.version})
            </p>
            {(confirmAction.type === 'reject' || confirmAction.type === 'approve') && (
              <textarea
                placeholder={confirmAction.type === 'reject' ? 'Rejection notes (required)' : 'Approval notes (optional)'}
                value={confirmAction.notes || ''}
                onChange={(e) => setConfirmAction({ ...confirmAction, notes: e.target.value })}
                style={{
                  width: '100%', padding: '0.5rem', borderRadius: '8px',
                  border: `1px solid ${colors.utility.borderLight}`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.textPrimary,
                  fontSize: '0.875rem', minHeight: '80px', resize: 'vertical',
                  marginBottom: '1rem', boxSizing: 'border-box',
                }}
              />
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{ ...actionBtnStyle, padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={mutations.loading}
                style={{
                  ...actionBtnStyle,
                  padding: '0.5rem 1rem',
                  backgroundColor: confirmAction.type === 'delete' ? '#EF4444' : '#3B82F6',
                  color: '#fff',
                }}
              >
                {mutations.loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #D1D5DB',
  backgroundColor: '#F3F4F6',
  color: '#374151',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 500,
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #D1D5DB',
  backgroundColor: '#F3F4F6',
  color: '#374151',
  cursor: 'pointer',
  fontSize: '0.8125rem',
};

export default SmartFormsAdminPage;

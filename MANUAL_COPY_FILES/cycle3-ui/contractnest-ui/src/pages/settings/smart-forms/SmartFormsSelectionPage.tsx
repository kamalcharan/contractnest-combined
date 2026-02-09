// ============================================================================
// SmartFormsSelectionPage — Tenant bookmark / toggle list for approved templates
// Route: /settings/configure/smart-forms
// Glassmorphic design, follows LOV page pattern
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Loader2,
  Search,
  Tag,
  Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import type { TenantSelection, FormTemplateInfo } from './types';

// ---- Approved Template (from admin list) ----
interface ApprovedTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  form_type: string;
  tags: string[];
  version: number;
  status: string;
}

const SmartFormsSelectionPage = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [selections, setSelections] = useState<TenantSelection[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Fetch approved templates + existing selections
  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch both in parallel
        const [templatesRes, selectionsRes] = await Promise.all([
          api.get(API_ENDPOINTS.SMART_FORMS.ADMIN.LIST + '?status=approved'),
          api.get(API_ENDPOINTS.SMART_FORMS.SELECTIONS.LIST),
        ]);

        setTemplates(templatesRes.data?.data || templatesRes.data || []);
        setSelections(selectionsRes.data?.data || []);
      } catch (error: any) {
        console.error('[SmartFormsSelectionPage] fetch error:', error.message);
        captureException(error, {
          tags: { component: 'SmartFormsSelectionPage', action: 'fetchData' },
        });
        vaniToast.error('Error', {
          message: 'Failed to load smart forms',
          duration: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTenant?.id]);

  // Check if template is selected
  const isSelected = (templateId: string): boolean => {
    const sel = selections.find((s) => s.form_template_id === templateId);
    return sel?.is_active === true;
  };

  // Toggle selection
  const handleToggle = async (templateId: string) => {
    if (togglingId) return; // prevent double-click
    setTogglingId(templateId);

    try {
      const response = await api.post(API_ENDPOINTS.SMART_FORMS.SELECTIONS.TOGGLE, {
        form_template_id: templateId,
      });
      const updated: TenantSelection = response.data;

      // Update local state
      setSelections((prev) => {
        const idx = prev.findIndex((s) => s.form_template_id === templateId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });

      const templateName =
        templates.find((t) => t.id === templateId)?.name || 'Form';
      vaniToast.success(updated.is_active ? 'Selected' : 'Deselected', {
        message: `${templateName} has been ${updated.is_active ? 'added to' : 'removed from'} your forms`,
        duration: 2500,
      });
    } catch (error: any) {
      console.error('[SmartFormsSelectionPage] toggle error:', error.message);
      captureException(error, {
        tags: { component: 'SmartFormsSelectionPage', action: 'toggleSelection' },
      });
      vaniToast.error('Error', {
        message: 'Failed to update selection',
        duration: 4000,
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Unique categories for filter
  const categories = Array.from(new Set(templates.map((t) => t.category))).sort();

  // Filtered templates
  const filtered = templates.filter((t) => {
    const matchSearch =
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // Selected count
  const selectedCount = selections.filter((s) => s.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <VaNiLoader size="md" text="Loading Smart Forms..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDarkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'
            )}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1
              className={cn(
                'text-xl font-bold',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}
            >
              Smart Forms
            </h1>
            <p className={cn('text-sm', isDarkMode ? 'text-white/50' : 'text-gray-500')}>
              Select which form templates your team can use
            </p>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
            isDarkMode
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          )}
        >
          <FileText className="h-4 w-4" />
          {selectedCount} selected
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border p-3',
          isDarkMode
            ? 'bg-white/[0.03] border-white/10 backdrop-blur-sm'
            : 'bg-white border-gray-200 shadow-sm'
        )}
      >
        <div className="relative flex-1">
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4',
              isDarkMode ? 'text-white/30' : 'text-gray-400'
            )}
          />
          <input
            type="text"
            placeholder="Search forms by name, description or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2',
              isDarkMode
                ? 'bg-white/5 text-white placeholder:text-white/30 focus:ring-blue-500/30'
                : 'bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500/30'
            )}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2',
            isDarkMode
              ? 'bg-white/5 border-white/10 text-white focus:ring-blue-500/30'
              : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-blue-500/30'
          )}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Info Banner */}
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border p-3 text-sm',
          isDarkMode
            ? 'bg-blue-500/5 border-blue-500/10 text-blue-300/80'
            : 'bg-blue-50 border-blue-100 text-blue-700'
        )}
      >
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Toggle forms on/off to control which templates are available to your team during
          service events. Changes take effect immediately.
        </span>
      </div>

      {/* Template Cards */}
      {filtered.length === 0 ? (
        <div
          className={cn(
            'text-center py-16 rounded-xl border',
            isDarkMode
              ? 'bg-white/[0.02] border-white/5 text-white/40'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          )}
        >
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No forms found</p>
          <p className="text-sm mt-1">
            {searchTerm || filterCategory !== 'all'
              ? 'Try adjusting your search or filter'
              : 'No approved form templates available yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((template) => {
            const active = isSelected(template.id);
            const isToggling = togglingId === template.id;

            return (
              <div
                key={template.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-4 transition-all',
                  isDarkMode
                    ? 'bg-white/[0.03] border-white/10 backdrop-blur-sm hover:bg-white/[0.05]'
                    : 'bg-white border-gray-200 shadow-sm hover:shadow-md',
                  active &&
                    (isDarkMode
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-blue-300 bg-blue-50/50')
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                    active
                      ? isDarkMode
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-blue-100 text-blue-600'
                      : isDarkMode
                      ? 'bg-white/5 text-white/40'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  <FileText className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={cn(
                        'text-sm font-semibold truncate',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {template.name}
                    </h3>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                        isDarkMode
                          ? 'bg-white/5 text-white/40'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      v{template.version}
                    </span>
                  </div>
                  {template.description && (
                    <p
                      className={cn(
                        'text-xs mt-0.5 line-clamp-1',
                        isDarkMode ? 'text-white/40' : 'text-gray-500'
                      )}
                    >
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        isDarkMode
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'bg-purple-50 text-purple-600'
                      )}
                    >
                      {template.category}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        isDarkMode
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-green-50 text-green-600'
                      )}
                    >
                      {template.form_type}
                    </span>
                    {(template.tags || []).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                          isDarkMode
                            ? 'bg-white/5 text-white/30'
                            : 'bg-gray-50 text-gray-400'
                        )}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(template.id)}
                  disabled={isToggling}
                  className={cn(
                    'shrink-0 transition-colors p-1 rounded-lg',
                    isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  )}
                  title={active ? 'Deselect form' : 'Select form'}
                >
                  {isToggling ? (
                    <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
                  ) : active ? (
                    <ToggleRight className="h-7 w-7 text-blue-500" />
                  ) : (
                    <ToggleLeft
                      className={cn(
                        'h-7 w-7',
                        isDarkMode ? 'text-white/20' : 'text-gray-300'
                      )}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SmartFormsSelectionPage;

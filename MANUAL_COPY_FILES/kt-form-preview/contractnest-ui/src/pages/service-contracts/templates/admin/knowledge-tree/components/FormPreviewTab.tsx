// FormPreviewTab — Auto-composed SmartForm from Knowledge Tree data
// Uses FormRenderer in readOnly mode, exports to m_form_templates as draft
import React, { useState, useCallback } from 'react';
import { Smartphone, Monitor, Download, Loader2, CheckCircle2 } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import { useAutoComposeForm } from './useAutoComposeForm';
import FormRenderer from '@/pages/settings/smart-forms/components/FormRenderer';
import { useFormTemplateMutations } from '@/pages/admin/smart-forms/hooks/useSmartFormsAdmin';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import type { KnowledgeTreeSummary } from '../types';

interface Props {
  summary: KnowledgeTreeSummary;
  variants: any[];
  checkpointsBySection: Record<string, any[]>;
  partsByGroup: Record<string, any[]>;
  selectedVariantIds: Set<string>;
  colors: any;
}

const FormPreviewTab: React.FC<Props> = ({ summary, variants, checkpointsBySection, partsByGroup, selectedVariantIds, colors }) => {
  const [viewMode, setViewMode] = useState<'web' | 'mobile'>('web');
  const [previewVariantId, setPreviewVariantId] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  const { createTemplate, loading: exporting } = useFormTemplateMutations();

  // Only use selected variants
  const activeVariants = variants.filter((v) => selectedVariantIds.has(v.id));

  const schema = useAutoComposeForm(
    summary.resource_template.name,
    activeVariants,
    checkpointsBySection,
    partsByGroup,
    previewVariantId,
    'pm', // Default to PM for preview
  );

  const totalCheckpoints = Object.values(checkpointsBySection).flat().length;
  const conditionCount = Object.values(checkpointsBySection).flat().filter((c: any) => c.checkpoint_type === 'condition').length;
  const readingCount = Object.values(checkpointsBySection).flat().filter((c: any) => c.checkpoint_type === 'reading').length;

  const brandPrimary = colors.brand.primary;
  const borderColor = colors.utility.secondaryText + '20';

  // Export to SmartForms as draft
  const handleExport = useCallback(async () => {
    const result = await createTemplate({
      name: `${summary.resource_template.name} — PM Service Form`,
      description: `Auto-composed from Knowledge Tree. ${totalCheckpoints} checkpoints, ${activeVariants.length} variants. Source: ${summary.resource_template.sub_category}`,
      category: 'maintenance',
      form_type: 'during_service',
      tags: ['auto-composed', 'knowledge-tree', summary.resource_template.id, summary.resource_template.sub_category],
      schema: schema as unknown as Record<string, unknown>,
    });
    if (result) {
      setExported(true);
      vaniToast.success(`SmartForm draft created — "${result.name}" · Open in Admin > Smart Forms to review`);
    } else {
      vaniToast.error('Failed to create SmartForm draft');
    }
  }, [createTemplate, schema, summary, totalCheckpoints, activeVariants]);

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>Auto-composed PM Service Form</strong> from your Knowledge Tree. Variants appear as a dropdown, checkpoints as inspection fields, spare parts as a pick-list.</p>
        <p>Preview below, then <strong style={{ color: brandPrimary }}>export as a draft SmartForm</strong> to review in the Form Builder.</p>
      </VaNiBubble>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Variant preview filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.primaryText }}>Preview as:</span>
          <select
            value={previewVariantId || ''}
            onChange={(e) => setPreviewVariantId(e.target.value || null)}
            style={{
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px',
              border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
              color: colors.utility.primaryText, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">All Variants (universal parts)</option>
            {activeVariants.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '4px', background: colors.utility.primaryBackground, borderRadius: '8px', padding: '3px', border: `1px solid ${borderColor}` }}>
          <button
            onClick={() => setViewMode('web')}
            style={{
              padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
              background: viewMode === 'web' ? brandPrimary : 'transparent',
              color: viewMode === 'web' ? '#fff' : colors.utility.secondaryText,
            }}
          >
            <Monitor className="h-3.5 w-3.5" /> Web
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            style={{
              padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
              background: viewMode === 'mobile' ? brandPrimary : 'transparent',
              color: viewMode === 'mobile' ? '#fff' : colors.utility.secondaryText,
            }}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", padding: '4px 8px', borderRadius: '12px', background: brandPrimary + '10', color: brandPrimary }}>
            {schema.sections.length} sections
          </span>
          <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", padding: '4px 8px', borderRadius: '12px', background: colors.semantic.warning + '10', color: colors.semantic.warning }}>
            {conditionCount} condition
          </span>
          <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", padding: '4px 8px', borderRadius: '12px', background: (colors.semantic.info || '#2563eb') + '10', color: colors.semantic.info || '#2563eb' }}>
            {readingCount} reading
          </span>
        </div>
      </div>

      {/* Form Preview using FormRenderer */}
      <div style={{
        maxWidth: viewMode === 'mobile' ? '390px' : '100%',
        margin: viewMode === 'mobile' ? '0 auto' : undefined,
        transition: 'max-width .3s ease',
        border: viewMode === 'mobile' ? `2px solid ${borderColor}` : undefined,
        borderRadius: viewMode === 'mobile' ? '24px' : '12px',
        overflow: 'hidden',
        boxShadow: viewMode === 'mobile' ? '0 8px 40px rgba(0,0,0,.12)' : '0 2px 12px rgba(0,0,0,.04)',
      }}>
        <FormRenderer
          schema={schema}
          readOnly={true}
          onSubmit={() => {}}
        />
      </div>

      {/* Export bar */}
      <div style={{
        marginTop: '16px', padding: '14px 20px', borderRadius: '12px',
        background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText }}>
            {exported ? 'Draft SmartForm created' : 'Ready to export'}
          </span>
          <p style={{ fontSize: '11px', color: colors.utility.secondaryText, margin: '2px 0 0' }}>
            {exported
              ? 'Open Admin > Smart Forms to review, edit, and approve the draft'
              : 'Creates a draft in Smart Forms — you can edit the schema before publishing'}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || exported}
          style={{
            padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
            cursor: exporting || exported ? 'not-allowed' : 'pointer',
            background: exported
              ? colors.semantic.success + '15'
              : `linear-gradient(135deg, ${brandPrimary}, ${colors.brand.secondary || brandPrimary})`,
            color: exported ? colors.semantic.success : '#fff',
            border: exported ? `1px solid ${colors.semantic.success}30` : 'none',
            boxShadow: exported ? 'none' : `0 2px 8px ${brandPrimary}40`,
          }}
        >
          {exporting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
          ) : exported ? (
            <><CheckCircle2 className="h-4 w-4" /> Exported</>
          ) : (
            <><Download className="h-4 w-4" /> Export as Draft SmartForm</>
          )}
        </button>
      </div>
    </div>
  );
};

export default FormPreviewTab;

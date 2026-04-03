// FormPreviewTab — Auto-composed SmartForm preview from Knowledge Tree checkpoints
// Renders a live form preview that updates as checkpoints change
import React, { useState } from 'react';
import { FileText, Smartphone, Monitor, Filter } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import { useAutoComposeForm } from './useAutoComposeForm';
import type { KnowledgeTreeSummary } from '../types';

const SERVICE_ACTIVITIES = [
  { label: 'All', value: '' },
  { label: 'PM', value: 'pm' },
  { label: 'Repair', value: 'repair' },
  { label: 'Inspection', value: 'inspection' },
  { label: 'Install', value: 'install' },
  { label: 'Decommission', value: 'decommission' },
];

interface Props {
  summary: KnowledgeTreeSummary;
  checkpointsBySection: Record<string, any[]>;
  colors: any;
}

const FormPreviewTab: React.FC<Props> = ({ summary, checkpointsBySection, colors }) => {
  const [activityFilter, setActivityFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'web' | 'mobile'>('web');

  const schema = useAutoComposeForm(
    summary.resource_template.name,
    checkpointsBySection,
    activityFilter || null,
  );

  const brandPrimary = colors.brand.primary;
  const borderColor = colors.utility.secondaryText + '20';
  const totalFields = schema.sections.reduce((sum, s) => sum + s.fields.length, 0);

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>Auto-composed service form</strong> from your checkpoints. This preview shows what a technician will fill during a visit.</p>
        <p>Filter by service activity or switch between web/mobile views.</p>
      </VaNiBubble>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Activity filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
          {SERVICE_ACTIVITIES.map((sa) => (
            <button
              key={sa.value}
              onClick={() => setActivityFilter(sa.value)}
              style={{
                padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer', transition: '.15s',
                background: activityFilter === sa.value ? brandPrimary : colors.utility.primaryBackground,
                color: activityFilter === sa.value ? '#fff' : colors.utility.secondaryText,
                border: `1px solid ${activityFilter === sa.value ? brandPrimary : borderColor}`,
              }}
            >
              {sa.label}
            </button>
          ))}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", padding: '4px 10px', borderRadius: '12px', background: brandPrimary + '10', color: brandPrimary, border: `1px solid ${brandPrimary}25` }}>
            {schema.sections.length} sections
          </span>
          <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", padding: '4px 10px', borderRadius: '12px', background: colors.semantic.success + '10', color: colors.semantic.success, border: `1px solid ${colors.semantic.success}25` }}>
            {totalFields} fields
          </span>
        </div>
      </div>

      {/* Form Preview */}
      <div style={{
        maxWidth: viewMode === 'mobile' ? '390px' : '100%',
        margin: viewMode === 'mobile' ? '0 auto' : undefined,
        transition: 'max-width .3s ease',
      }}>
        <div style={{
          background: colors.utility.secondaryBackground,
          border: `1px solid ${borderColor}`,
          borderRadius: viewMode === 'mobile' ? '20px' : '12px',
          overflow: 'hidden',
          boxShadow: viewMode === 'mobile' ? '0 8px 40px rgba(0,0,0,.12)' : '0 2px 12px rgba(0,0,0,.04)',
        }}>
          {/* Form header */}
          <div style={{
            padding: viewMode === 'mobile' ? '20px 16px' : '20px 24px',
            borderBottom: `1px solid ${borderColor}`,
            background: `linear-gradient(135deg, ${brandPrimary}08, ${brandPrimary}03)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <FileText className="h-5 w-5" style={{ color: brandPrimary }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.utility.primaryText }}>{schema.title}</h3>
            </div>
            <p style={{ fontSize: '12px', color: colors.utility.secondaryText, margin: 0 }}>{schema.description}</p>
          </div>

          {/* Sections */}
          <div style={{ padding: viewMode === 'mobile' ? '12px' : '16px' }}>
            {schema.sections.map((section, sIdx) => (
              <div key={section.id} style={{ marginBottom: sIdx < schema.sections.length - 1 ? '20px' : 0 }}>
                {/* Section header */}
                <div style={{
                  padding: '10px 14px', marginBottom: '10px', borderRadius: '8px',
                  background: colors.utility.primaryBackground,
                  borderLeft: `3px solid ${brandPrimary}`,
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: colors.utility.primaryText, margin: 0 }}>
                    {section.title}
                  </h4>
                  {section.description && (
                    <span style={{ fontSize: '10px', color: colors.utility.secondaryText }}>{section.description}</span>
                  )}
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 4px' }}>
                  {section.fields.map((field) => (
                    <div key={field.id}>
                      <label style={{
                        display: 'block', fontSize: '12px', fontWeight: 600,
                        color: colors.utility.primaryText, marginBottom: '4px',
                      }}>
                        {field.label}
                        {field.validation?.required && <span style={{ color: colors.semantic.error, marginLeft: '3px' }}>*</span>}
                      </label>

                      {field.type === 'text' && (
                        <input
                          disabled
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                            border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
                            color: colors.utility.secondaryText + '60', fontFamily: 'inherit',
                          }}
                        />
                      )}

                      {field.type === 'number' && (
                        <input
                          disabled type="number"
                          placeholder={field.placeholder || `Enter value`}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                            fontFamily: "'IBM Plex Mono', monospace",
                            border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
                            color: colors.utility.secondaryText + '60',
                          }}
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          disabled
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                            border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
                            color: colors.utility.secondaryText + '60', fontFamily: 'inherit', cursor: 'not-allowed',
                          }}
                        >
                          <option>Select {field.label.toLowerCase()}...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          disabled rows={2}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                            border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
                            color: colors.utility.secondaryText + '60', fontFamily: 'inherit', resize: 'none',
                          }}
                        />
                      )}

                      {field.type === 'date' && (
                        <input
                          disabled type="date"
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                            border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
                            color: colors.utility.secondaryText + '60', fontFamily: 'inherit',
                          }}
                        />
                      )}

                      {field.help_text && (
                        <p style={{ fontSize: '10px', color: colors.utility.secondaryText + '80', marginTop: '3px', fontStyle: 'italic' }}>
                          {field.help_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Form footer */}
          <div style={{
            padding: '14px 24px', borderTop: `1px solid ${borderColor}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
              Auto-composed from Knowledge Tree · {totalFields} fields · Read-only preview
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: colors.utility.primaryBackground, color: colors.utility.secondaryText + '60',
                border: `1px solid ${borderColor}`, fontFamily: 'inherit', cursor: 'not-allowed',
              }}>
                Save Draft
              </button>
              <button disabled style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: brandPrimary + '40', color: '#fff',
                border: 'none', fontFamily: 'inherit', cursor: 'not-allowed',
              }}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreviewTab;

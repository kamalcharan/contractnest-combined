// Service Cycles Tab — frequency dropdown, varies-by tags, editable alert days
import React from 'react';
import { Plus } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import type { KnowledgeTreeSummary } from '../types';

const FREQ_OPTIONS = ['30 days', '45 days', '60 days', '90 days', '120 days', '180 days', '365 days', '500 hrs', '1000 hrs', '2000 hrs'];

interface Props {
  summary: KnowledgeTreeSummary;
  colors: any;
}

const CyclesTab: React.FC<Props> = ({ summary, colors }) => {
  const cycles = summary.cycles;

  return (
    <div>
      <VaNiBubble>
        <p><strong>{cycles.length} service cycles</strong> with frequencies adjusted for <span style={{ color: '#ff6b2b', fontWeight: 600 }}>{summary.resource_template.sub_category}</span> context.</p>
        <p>Adjust frequencies and alert thresholds as needed. You can <strong>add your own cycles</strong>.</p>
      </VaNiBubble>

      {cycles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a847a', fontSize: '14px' }}>
          No service cycles defined
        </div>
      ) : (
        cycles.map((cy) => (
          <div key={cy.id} style={{
            background: '#fff', border: '1px solid #e5e1db', borderRadius: '10px',
            padding: '12px 18px', marginBottom: '8px',
            display: 'grid', gridTemplateColumns: '1fr 110px 150px 1fr',
            gap: '14px', alignItems: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,.04)',
          }}>
            {/* Checkpoint name */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText }}>{cy.checkpoint_name || 'Unknown'}</div>
              <div style={{ fontSize: '10px', color: '#8a847a' }}>{cy.section_name}</div>
            </div>

            {/* Frequency dropdown */}
            <select
              defaultValue={`${cy.frequency_value} ${cy.frequency_unit}`}
              style={{
                width: '100%', padding: '5px 8px', border: '1px solid #e5e1db', borderRadius: '5px',
                fontFamily: 'inherit', fontSize: '12px', background: '#faf9f7', cursor: 'pointer',
              }}
            >
              <option value={`${cy.frequency_value} ${cy.frequency_unit}`}>
                {cy.frequency_value} {cy.frequency_unit}
              </option>
              {FREQ_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {/* Varies by tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {(cy.varies_by || []).map((factor: string, i: number) => (
                <span key={i} style={{
                  fontSize: '9px', padding: '2px 7px', borderRadius: '3px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: '#faf9f7', border: '1px solid #edeae4', color: '#8a847a',
                }}>
                  {factor}
                </span>
              ))}
            </div>

            {/* Alert overdue */}
            <div style={{ fontSize: '11px', color: '#8a847a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {cy.alert_overdue_days ? (
                <>
                  <input
                    defaultValue={cy.alert_overdue_days}
                    style={{
                      width: '40px', padding: '2px 5px', border: '1px solid #e5e1db', borderRadius: '3px',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', textAlign: 'center' as const,
                    }}
                  />
                  <span>days → alert</span>
                </>
              ) : (
                <span style={{ color: '#bab4a8' }}>—</span>
              )}
            </div>
          </div>
        ))
      )}

      {/* Add Cycle */}
      <button onClick={() => alert('Add service cycle\n\nFields: Checkpoint, Frequency, Varies By, Alert Days')} style={{
        background: '#fff8f4', color: '#ff6b2b',
        border: '1px dashed rgba(255,107,43,.2)', fontSize: '12px', padding: '7px 16px',
        borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px',
      }}>
        <Plus className="h-3.5 w-3.5" /> Add Cycle
      </button>
    </div>
  );
};

export default CyclesTab;

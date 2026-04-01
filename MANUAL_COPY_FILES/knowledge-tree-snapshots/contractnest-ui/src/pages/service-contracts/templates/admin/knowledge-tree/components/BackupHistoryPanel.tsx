// BackupHistoryPanel — slide-in panel showing snapshot timeline with restore
import React, { useState } from 'react';
import { X, History, Download, RotateCcw, Shield, Clock, Plus } from 'lucide-react';
import { useKnowledgeTreeSnapshots, useCreateSnapshot, useRestoreSnapshot } from '@/hooks/queries/useKnowledgeTree';
import type { SnapshotListItem } from '@/hooks/queries/useKnowledgeTree';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  initial_seed: { label: 'Initial Seed', color: '#8B5CF6', icon: <Shield className="h-3 w-3" /> },
  pre_edit: { label: 'Pre-Edit', color: '#3B82F6', icon: <Clock className="h-3 w-3" /> },
  auto_backup: { label: 'Auto Backup', color: '#10B981', icon: <Download className="h-3 w-3" /> },
  manual_backup: { label: 'Manual', color: '#F59E0B', icon: <Download className="h-3 w-3" /> },
  pre_restore: { label: 'Pre-Restore', color: '#EF4444', icon: <RotateCcw className="h-3 w-3" /> },
};

interface Props {
  resourceTemplateId: string;
  resourceName: string;
  onClose: () => void;
  onRestored: () => void;
  colors: any;
}

const BackupHistoryPanel: React.FC<Props> = ({ resourceTemplateId, resourceName, onClose, onRestored, colors }) => {
  const { data, isLoading } = useKnowledgeTreeSnapshots(resourceTemplateId);
  const createMutation = useCreateSnapshot();
  const restoreMutation = useRestoreSnapshot();
  const [confirmRestore, setConfirmRestore] = useState<SnapshotListItem | null>(null);

  const snapshots = data?.snapshots || [];
  const borderColor = colors.utility.secondaryText + '15';

  const handleCreateBackup = () => {
    createMutation.mutate({
      resource_template_id: resourceTemplateId,
      snapshot_type: 'manual_backup',
      notes: 'Manual backup created by admin',
    });
  };

  const handleRestore = (snapshot: SnapshotListItem) => {
    restoreMutation.mutate(
      { snapshot_id: snapshot.id, resource_template_id: resourceTemplateId },
      {
        onSuccess: () => {
          setConfirmRestore(null);
          onRestored();
        },
      },
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: '420px', maxWidth: '90vw',
        background: colors.utility.secondaryBackground, borderLeft: `1px solid ${borderColor}`,
        boxShadow: '-8px 0 30px rgba(0,0,0,.1)', display: 'flex', flexDirection: 'column',
        animation: 'slideIn .25s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History className="h-5 w-5" style={{ color: colors.brand.primary }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.utility.primaryText }}>Backup History</h3>
              <p style={{ fontSize: '11px', color: colors.utility.secondaryText }}>{resourceName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: colors.utility.primaryBackground, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.utility.secondaryText }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Create backup button */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${borderColor}` }}>
          <button
            onClick={handleCreateBackup}
            disabled={createMutation.isPending}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: colors.brand.primary + '10', color: colors.brand.primary,
              border: `1px dashed ${colors.brand.primary}30`, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {createMutation.isPending ? 'Creating...' : 'Create Manual Backup'}
          </button>
        </div>

        {/* Snapshot list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: colors.utility.secondaryText, fontSize: '13px' }}>Loading backups...</div>
          ) : snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: colors.utility.secondaryText, fontSize: '13px' }}>No backups yet. Create your first backup above.</div>
          ) : (
            snapshots.map((snap) => {
              const typeConf = TYPE_CONFIG[snap.snapshot_type] || TYPE_CONFIG.auto_backup;
              const isInitialSeed = snap.snapshot_type === 'initial_seed';
              return (
                <div key={snap.id} style={{
                  background: colors.utility.primaryBackground, border: `1px solid ${borderColor}`,
                  borderRadius: '10px', padding: '14px', marginBottom: '10px',
                }}>
                  {/* Version + type badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace", color: colors.utility.primaryText }}>v{snap.version}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                      background: typeConf.color + '15', color: typeConf.color,
                      fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase' as const,
                    }}>
                      {typeConf.icon} {typeConf.label}
                    </span>
                    {isInitialSeed && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#8B5CF615', color: '#8B5CF6' }}>PROTECTED</span>
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px' }}>
                    {formatDate(snap.created_at)}
                  </div>

                  {/* Notes */}
                  {snap.notes && (
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText, fontStyle: 'italic', marginBottom: '6px' }}>{snap.notes}</div>
                  )}

                  {/* Counts */}
                  {snap.counts && Object.keys(snap.counts).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {Object.entries(snap.counts).map(([key, count]) => (
                        <span key={key} style={{
                          fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
                          fontFamily: "'IBM Plex Mono', monospace",
                          background: colors.utility.secondaryBackground, color: colors.utility.secondaryText,
                          border: `1px solid ${borderColor}`,
                        }}>
                          {key.replace(/_/g, ' ')}: {count as number}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Restore button */}
                  <button
                    onClick={() => setConfirmRestore(snap)}
                    style={{
                      fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px',
                      background: colors.semantic.warning + '10', color: colors.semantic.warning,
                      border: `1px solid ${colors.semantic.warning}25`, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <RotateCcw className="h-3 w-3" /> Restore to v{snap.version}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Restore confirmation modal */}
        {confirmRestore && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 10 }}>
            <div style={{ background: colors.utility.secondaryBackground, borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: colors.utility.primaryText, marginBottom: '8px' }}>Restore to v{confirmRestore.version}?</h4>
              <p style={{ fontSize: '13px', color: colors.utility.secondaryText, lineHeight: 1.5, marginBottom: '16px' }}>
                This will <strong style={{ color: colors.semantic.error }}>overwrite all current Knowledge Tree data</strong> with the backup from v{confirmRestore.version}. A pre-restore backup will be created automatically.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmRestore(null)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: colors.utility.primaryBackground, color: colors.utility.secondaryText, border: `1px solid ${borderColor}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button
                  onClick={() => handleRestore(confirmRestore)}
                  disabled={restoreMutation.isPending}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: colors.semantic.error, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {restoreMutation.isPending ? 'Restoring...' : 'Yes, Restore'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      </div>
    </div>
  );
};

export default BackupHistoryPanel;

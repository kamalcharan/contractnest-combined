// src/components/common/evidence/FileUpload.tsx
// ============================================================================
// The ONE upload component. Every upload surface in the product uses this.
// ============================================================================
// Replaces four divergent implementations (two FileUploaders, an IconPicker
// path, a LogoUploadField path) plus three decorative dropzones that looked
// like uploads and were not.
//
// It is deliberately opinionated about one thing: the quota is checked and
// SHOWN before the work, not after. A technician standing at a site learns
// they are out of space while they still have options — that is the whole
// point of the cap design.

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import { formatBytes } from '@/utils/imageCompression';
import {
  useUploadEvidence,
  useStorageUsage,
  type UploadProgress,
  type UploadTarget,
  type UploadResult,
} from '@/hooks/queries/useEvidenceQueries';

export interface FileUploadProps {
  /** Where the file belongs. Contract evidence is metered; identity assets are not. */
  target: UploadTarget;
  /** Narrow the picker. The server allowlist is the real wall — this is convenience. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Hide the meter where it would be noise (a logo field does not need it). */
  showQuota?: boolean;
  label?: string;
  hint?: string;
  onUploaded?: (result: UploadResult) => void;
  className?: string;
}

interface Item extends UploadProgress {
  id: string;
}

const phaseLabel: Record<UploadProgress['phase'], string> = {
  compressing: 'Preparing…',
  requesting: 'Checking space…',
  uploading: 'Uploading…',
  confirming: 'Finishing…',
  done: 'Uploaded',
  failed: 'Failed',
};

export const FileUpload: React.FC<FileUploadProps> = ({
  target,
  accept = 'image/*,application/pdf',
  multiple = false,
  disabled = false,
  showQuota,
  label = 'Upload evidence',
  hint = 'Photos and PDFs. Images are compressed automatically.',
  onUploaded,
  className = '',
}) => {
  const { colors } = useInvoiceTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);

  // Identity assets are not metered, so the meter would be misleading there.
  const metered = (target.scope || 'contract') === 'contract';
  const quotaVisible = showQuota ?? metered;
  const { data: usage } = useStorageUsage(quotaVisible);

  const track = useCallback((p: UploadProgress) => {
    setItems(prev => {
      const i = prev.findIndex(x => x.fileName === p.fileName && x.phase !== 'done' && x.phase !== 'failed');
      if (i === -1) return [...prev, { ...p, id: `${p.fileName}-${Date.now()}` }];
      const next = [...prev];
      next[i] = { ...next[i], ...p };
      return next;
    });
  }, []);

  const upload = useUploadEvidence(track);

  // The cap is FULL, so a slot request would be refused. Say so up front
  // rather than letting someone pick a file and then fail.
  const atCap = metered && usage?.warn_level === 'full';
  const blocked = disabled || atCap;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      for (const file of multiple ? list : [list[0]]) {
        try {
          const result = await upload.mutateAsync({ file, target });
          onUploaded?.(result);
        } catch {
          // The hook has already toasted and marked the row failed; keep going
          // so one bad file in a batch does not abandon the rest.
        }
      }
    },
    [multiple, onUploaded, target, upload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (!blocked && e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [blocked, handleFiles]
  );

  const brand = colors.brand.primary;
  const active = dragging && !blocked;

  return (
    <div className={className}>
      {/* ── quota meter, shown BEFORE the work ── */}
      {quotaVisible && usage && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: colors.utility.secondaryText }}>
              {formatBytes(usage.used_bytes)} of {formatBytes(usage.quota_bytes)} used
            </span>
            {usage.warn_level !== 'ok' && (
              <span
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: usage.warn_level === 'warning' ? '#B45309' : '#B91C1C' }}
              >
                <AlertTriangle className="w-3 h-3" />
                {usage.warn_level === 'warning' && `${usage.pct}% full`}
                {usage.warn_level === 'critical' && `${usage.pct}% full — top up soon`}
                {usage.warn_level === 'full' && 'Storage full — top up to continue'}
              </span>
            )}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.utility.primaryText}10` }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(usage.pct, 100)}%`,
                backgroundColor:
                  usage.warn_level === 'ok' ? brand : usage.warn_level === 'warning' ? '#D97706' : '#DC2626',
              }}
            />
          </div>
        </div>
      )}

      {/* ── the dropzone: a real one, with a real handler ── */}
      <div
        role="button"
        tabIndex={blocked ? -1 : 0}
        aria-disabled={blocked}
        onClick={() => !blocked && inputRef.current?.click()}
        onKeyDown={e => {
          if (!blocked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={e => {
          e.preventDefault();
          if (!blocked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed p-6 text-center transition-all"
        style={{
          borderColor: active ? brand : `${brand}25`,
          backgroundColor: active ? `${brand}08` : colors.utility.secondaryBackground,
          cursor: blocked ? 'not-allowed' : 'pointer',
          opacity: blocked ? 0.55 : 1,
        }}
      >
        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: `${brand}80` }} />
        <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
          {atCap ? 'Storage is full' : label}
        </p>
        <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
          {atCap ? 'Top up to add more evidence. Everything already uploaded is safe.' : hint}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={blocked}
          onChange={e => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';   // same file twice in a row must re-fire
          }}
        />
      </div>

      {/* ── per-file progress: genuine bytes-sent, not a spinner that lies ── */}
      {items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map(item => (
            <li
              key={item.id}
              className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5"
              style={{ backgroundColor: `${colors.utility.primaryText}06` }}
            >
              {item.phase === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#059669' }} />
              ) : item.phase === 'failed' ? (
                <X className="w-3.5 h-3.5 shrink-0" style={{ color: '#DC2626' }} />
              ) : (
                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: brand }} />
              )}

              <span className="truncate flex-1" style={{ color: colors.utility.primaryText }}>
                {item.fileName}
              </span>

              {item.phase !== 'done' && item.phase !== 'failed' && (
                <span className="w-20 h-1 rounded-full overflow-hidden shrink-0"
                      style={{ backgroundColor: `${colors.utility.primaryText}12` }}>
                  <span className="block h-full rounded-full transition-all"
                        style={{ width: `${item.pct}%`, backgroundColor: brand }} />
                </span>
              )}

              <span className="shrink-0" style={{ color: item.phase === 'failed' ? '#DC2626' : colors.utility.secondaryText }}>
                {item.error || phaseLabel[item.phase]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** A compact read-only row for showing what is already attached. */
export const EvidenceChip: React.FC<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  onOpen?: () => void;
  onRemove?: () => void;
  busy?: boolean;
}> = ({ fileName, mimeType, sizeBytes, onOpen, onRemove, busy }) => {
  const { colors } = useInvoiceTheme();
  const isImage = mimeType.startsWith('image/');

  return (
    <div
      className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5"
      style={{ backgroundColor: `${colors.utility.primaryText}06` }}
    >
      {isImage ? (
        <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: colors.brand.primary }} />
      ) : (
        <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: colors.brand.primary }} />
      )}

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen || busy}
        className="truncate flex-1 text-left hover:underline disabled:no-underline"
        style={{ color: colors.utility.primaryText }}
      >
        {fileName}
      </button>

      <span className="shrink-0" style={{ color: colors.utility.secondaryText }}>
        {formatBytes(sizeBytes)}
      </span>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${fileName}`}
          className="shrink-0 opacity-60 hover:opacity-100 disabled:opacity-30"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default FileUpload;

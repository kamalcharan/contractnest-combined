// src/pages/settings/upload-lab/index.tsx
// ============================================================================
// Upload Lab — the bookmark for the one upload component.
// ============================================================================
// Every mode the component can be in, on one page, against the REAL broker.
// It exists because the failure modes that matter (at-quota, wrong type,
// upload interrupted) are exactly the ones nobody tests by hand before
// shipping — and the one this product cares about most, a technician losing a
// proof, only appears at the edges.
//
// Not a playground HTML file: it renders the same component the product uses,
// so it stays honest as that component changes.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HardDrive, RefreshCw } from 'lucide-react';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import { formatBytes } from '@/utils/imageCompression';
import FileUpload, { EvidenceChip } from '@/components/common/evidence/FileUpload';
import {
  useStorageUsage,
  useContractEvidence,
  useEvidenceUrl,
  useDeleteEvidence,
  type UploadResult,
} from '@/hooks/queries/useEvidenceQueries';

const Section: React.FC<{ title: string; note: string; children: React.ReactNode }> = ({
  title, note, children,
}) => {
  const { colors, card } = useInvoiceTheme();
  return (
    <div className="rounded-xl p-4" style={card}>
      <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{title}</h3>
      <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>{note}</p>
      {children}
    </div>
  );
};

const UploadLabPage: React.FC = () => {
  const { colors, card } = useInvoiceTheme();
  const [contractId, setContractId] = useState('');
  const [log, setLog] = useState<UploadResult[]>([]);

  const usage = useStorageUsage();
  const evidence = useContractEvidence(contractId || null);
  const openUrl = useEvidenceUrl();
  const remove = useDeleteEvidence(contractId || null);

  const record = (r: UploadResult) => setLog(prev => [r, ...prev].slice(0, 10));

  const open = async (evidenceId: string) => {
    const result = await openUrl.mutateAsync(evidenceId);
    if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Link to="/settings" className="opacity-70 hover:opacity-100" aria-label="Back to settings">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          Upload Lab
        </h1>
      </div>
      <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
        The shared upload component in every mode, against the real broker. Uploads here are real —
        contract-scoped ones count against your quota until you delete them.
      </p>

      {/* ── the meter ── */}
      <div className="rounded-xl p-4 mb-4" style={card}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" style={{ color: colors.brand.primary }} />
            <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              Storage
            </span>
          </div>
          <button
            type="button"
            onClick={() => usage.refetch()}
            className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
            style={{ color: colors.utility.secondaryText }}
          >
            <RefreshCw className={`w-3 h-3 ${usage.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {usage.isLoading && (
          <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>Loading…</p>
        )}
        {usage.isError && (
          <p className="text-xs mt-2" style={{ color: '#DC2626' }}>
            Could not read usage. If this says the storage is not configured, the Firebase service-account
            environment variables are missing on this server.
          </p>
        )}
        {usage.data && (
          <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
            {formatBytes(usage.data.used_bytes)} of {formatBytes(usage.data.quota_bytes)} ·{' '}
            {usage.data.pct}% · <strong>{usage.data.warn_level}</strong> ·{' '}
            {formatBytes(usage.data.free_bytes)} free
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Contract evidence (metered)"
          note="Paste a contract id you own. Write access is creator-only — someone else's contract returns 403."
        >
          <input
            value={contractId}
            onChange={e => setContractId(e.target.value.trim())}
            placeholder="contract uuid"
            className="w-full rounded-lg px-2 py-1.5 text-xs mb-2 outline-none"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
            }}
          />
          <FileUpload
            target={{ scope: 'contract', contractId: contractId || null }}
            disabled={!contractId}
            multiple
            onUploaded={record}
          />
        </Section>

        <Section
          title="Identity asset (not metered)"
          note="A logo goes to tenants/{tenant}/logo/… and never counts against the evidence allowance."
        >
          <FileUpload
            target={{ scope: 'tenant', assetKind: 'logo' }}
            accept="image/png,image/jpeg,image/svg+xml"
            label="Upload a logo"
            hint="PNG, JPG or SVG."
            onUploaded={record}
          />
        </Section>

        <Section
          title="Disabled"
          note="How it reads when the surrounding form is not ready."
        >
          <FileUpload target={{ scope: 'tenant', assetKind: 'avatar' }} disabled />
        </Section>

        <Section
          title="Wrong type on purpose"
          note="Pick a .zip or .exe. The picker allows anything here; the server allowlist refuses it — which is the point: the wall is server-side."
        >
          <FileUpload
            target={{ scope: 'tenant', assetKind: 'block_icon' }}
            accept="*/*"
            label="Try an unsupported file"
            hint="Expect: “That file type cannot be uploaded as evidence.”"
            onUploaded={record}
          />
        </Section>
      </div>

      {/* ── what is attached to the contract above ── */}
      {contractId && (
        <div className="rounded-xl p-4 mt-4" style={card}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            On this contract
          </h3>
          {evidence.isLoading && (
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Loading…</p>
          )}
          {evidence.isError && (
            <p className="text-xs" style={{ color: '#DC2626' }}>
              Could not list evidence — you may not be a party to that contract.
            </p>
          )}
          {evidence.data && evidence.data.count === 0 && (
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Nothing attached yet.</p>
          )}
          <div className="space-y-1">
            {evidence.data?.evidence?.map(row => (
              <EvidenceChip
                key={row.evidence_id}
                fileName={row.file_name}
                mimeType={row.mime_type}
                sizeBytes={row.size_bytes}
                busy={openUrl.isPending || remove.isPending}
                onOpen={() => open(row.evidence_id)}
                onRemove={() => remove.mutate(row.evidence_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── session log ── */}
      {log.length > 0 && (
        <div className="rounded-xl p-4 mt-4" style={card}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            Uploaded this session
          </h3>
          <ul className="space-y-1 text-xs" style={{ color: colors.utility.secondaryText }}>
            {log.map(r => (
              <li key={r.evidence_id}>
                {r.file_name} · {formatBytes(r.size_bytes)} · {r.evidence_id}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadLabPage;

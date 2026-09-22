// src/pages/settings/storage-admin/index.tsx
// ============================================================================
// Storage admin — what is really in the bucket, and what may be removed.
// ============================================================================
// GCS has no folders: a "folder" is a shared path prefix. This page lists
// every top-level prefix, says which model it belongs to, and lets the legacy
// ones be deleted.
//
// ⚠️ A LEGACY FOLDER IS NOT ALWAYS ONE TENANT. Four live tenants share
// 'tenant_c0000000_demo'. Every prefix therefore names its tenants, and a
// shared one is called out before anything can be deleted — the whole point of
// having this screen rather than deleting by hand in the Firebase console.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, HardDrive, RefreshCw, Trash2, AlertTriangle,
  ShieldCheck, FolderOpen, Loader2, X,
} from 'lucide-react';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import { formatStorageBytes } from '@/utils/storageFormat';
import {
  useStorageOverview, useSweepStatus, useRunSweep, useDeletePrefix, usePrefixContents,
  type PrefixRow,
} from '@/hooks/queries/useStorageAdminQueries';

const KIND_LABEL: Record<string, { label: string; note: string }> = {
  evidence: { label: 'Contract evidence', note: 'The metered namespace. Retire individual files from the contract, not here.' },
  identity: { label: 'Identity assets', note: 'Logos, avatars, block icons, payment QRs. Not metered.' },
  legacy:   { label: 'Legacy folder',    note: 'From the old per-tenant model. Safe to delete once nothing needs it.' },
  unknown:  { label: 'Unaccounted for',  note: 'Nothing in the product writes here. Most likely left over.' },
};

const StorageAdminPage: React.FC = () => {
  const { colors, card } = useInvoiceTheme();
  const overview = useStorageOverview();
  const sweep = useSweepStatus();
  const runSweep = useRunSweep();
  const deletePrefix = useDeletePrefix();

  const [browsing, setBrowsing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PrefixRow | null>(null);
  const [typed, setTyped] = useState('');
  const contents = usePrefixContents(browsing);

  const ink = colors.utility.primaryText;
  const dim = colors.utility.secondaryText;
  const warn = colors.semantic?.warning || '#D97706';
  const bad = colors.semantic?.error || '#DC2626';
  const ok = colors.semantic?.success || '#0d9464';

  const data = overview.data;
  const rows = data?.prefixes ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link to="/settings" className="p-1.5 rounded-lg" style={{ color: dim }} aria-label="Back to settings">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <HardDrive className="w-5 h-5" style={{ color: dim }} />
        <h1 className="text-xl font-semibold" style={{ color: ink }}>Storage admin</h1>
        <button
          type="button"
          onClick={() => { overview.refetch(); sweep.refetch(); }}
          disabled={overview.isFetching}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
          style={{ backgroundColor: `${ink}0d`, color: ink }}
        >
          <RefreshCw className={`w-4 h-4 ${overview.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <p className="text-xs mb-5" style={{ color: dim }}>
        Every top-level prefix in the bucket. Storage has no real folders — a folder is
        just a shared path — so this is the only complete view of what is stored.
      </p>

      {/* ── SWEEP ─────────────────────────────────────────────────── */}
      <div style={card} className="rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: ink }}>Cleanup sweep</h2>
            <p className="text-xs mt-0.5" style={{ color: dim }}>
              {sweep.isPending ? 'Checking…'
                : sweep.data?.success === false ? 'Status unavailable.'
                : <>
                    {(sweep.data?.retired_waiting ?? 0)} retired and {(sweep.data?.orphans_waiting ?? 0)} orphaned
                    {' '}file{(sweep.data?.retired_waiting ?? 0) + (sweep.data?.orphans_waiting ?? 0) === 1 ? '' : 's'} waiting ·{' '}
                    {sweep.data?.last_run
                      ? `last run ${new Date(sweep.data.last_run).toLocaleString('en-IN')}`
                      : 'never run'}
                  </>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => runSweep.mutate()}
            disabled={runSweep.isPending}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
            style={{ backgroundColor: ok, color: '#fff' }}
          >
            {runSweep.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Run sweep now
          </button>
        </div>
      </div>

      {/* ── STATES ────────────────────────────────────────────────── */}
      {overview.isPending && (
        <div style={card} className="rounded-xl p-6 text-sm" role="status" aria-live="polite">
          <span style={{ color: dim }}>Listing the bucket…</span>
        </div>
      )}

      {!overview.isPending && data?.firebase_configured === false && (
        <div style={{ ...card, borderColor: `${warn}55` }} className="rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn }} />
          <p className="text-sm" style={{ color: ink }}>
            Storage is not configured on this server, so the bucket cannot be listed.
            <span style={{ color: dim }}> Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY and restart.</span>
          </p>
        </div>
      )}

      {!overview.isPending && data?.success === false && data?.firebase_configured && (
        <div style={{ ...card, borderColor: `${bad}55`, color: ink }} className="rounded-xl p-4 text-sm">
          Could not list the bucket. Try Refresh; if it keeps failing the service account may lack storage permissions.
        </div>
      )}

      {/* ── PREFIXES ──────────────────────────────────────────────── */}
      {data?.success && (
        <>
          <div className="flex flex-wrap gap-4 mb-3 text-xs" style={{ color: dim }}>
            <span><strong style={{ color: ink }}>{data.totals.count.toLocaleString('en-IN')}</strong> objects</span>
            <span><strong style={{ color: ink }}>{formatStorageBytes(data.totals.bytes)}</strong> in the bucket</span>
            <span>
              Registry: <strong style={{ color: ink }}>{data.registry.active}</strong> active
              {' '}({formatStorageBytes(data.registry.active_bytes)}) ·{' '}
              {data.registry.pending} pending · {data.registry.deleted} awaiting sweep
            </span>
          </div>

          <div className="space-y-3">
            {rows.length === 0 && (
              <div style={card} className="rounded-xl p-6 text-sm text-center">
                <span style={{ color: dim }}>The bucket is empty.</span>
              </div>
            )}

            {rows.map(row => {
              const meta = KIND_LABEL[row.kind];
              const shared = row.tenants.length > 1;
              const tone = row.kind === 'legacy' ? warn : row.kind === 'unknown' ? bad : ok;
              return (
                <div key={row.prefix} style={card} className="rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-semibold" style={{ color: ink }}>{row.prefix}/</code>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${tone}18`, color: tone }}>
                          {meta.label}
                        </span>
                        {!row.deletable && row.kind !== 'legacy' && (
                          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: dim }}>
                            <ShieldCheck className="w-3 h-3" /> protected
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: dim }}>{meta.note}</p>

                      {row.tenants.length > 0 && (
                        <p className="text-xs mt-1.5" style={{ color: shared ? warn : dim }}>
                          {shared && <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />}
                          {shared
                            ? `Shared by ${row.tenants.length} tenants — deleting removes all of their files: `
                            : 'Tenant: '}
                          <strong>{row.tenants.map(t => t.name || t.id).join(', ')}</strong>
                        </p>
                      )}

                      {row.missingFromBucket && (
                        <p className="text-xs mt-1.5" style={{ color: dim }}>
                          Recorded on the tenant but absent from the bucket — the files are
                          already gone, only the reference is left.
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold leading-none" style={{ color: ink }}>
                        {formatStorageBytes(row.bytes)}
                      </div>
                      <div className="text-xs mt-1" style={{ color: dim }}>
                        {row.count.toLocaleString('en-IN')} object{row.count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {row.count > 0 && (
                      <button
                        type="button"
                        onClick={() => setBrowsing(browsing === row.prefix ? null : row.prefix)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        style={{ backgroundColor: `${ink}0d`, color: ink }}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        {browsing === row.prefix ? 'Hide contents' : 'View contents'}
                      </button>
                    )}
                    {row.deletable && row.count > 0 && (
                      <button
                        type="button"
                        onClick={() => { setConfirming(row); setTyped(''); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        style={{ backgroundColor: `${bad}14`, color: bad }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete folder
                      </button>
                    )}
                  </div>

                  {browsing === row.prefix && (
                    <div className="mt-3 rounded-lg overflow-hidden" style={{ backgroundColor: `${ink}08` }}>
                      {contents.isPending ? (
                        <p className="text-xs p-3" style={{ color: dim }}>Loading…</p>
                      ) : (
                        <>
                          <ul className="max-h-64 overflow-auto text-xs divide-y" style={{ borderColor: `${ink}12` }}>
                            {(contents.data?.objects ?? []).map((o: any) => (
                              <li key={o.path} className="flex justify-between gap-3 px-3 py-1.5">
                                <span className="truncate" style={{ color: ink }}>{o.path}</span>
                                <span className="shrink-0" style={{ color: dim }}>{formatStorageBytes(o.sizeBytes)}</span>
                              </li>
                            ))}
                          </ul>
                          {contents.data?.truncated && (
                            <p className="text-xs px-3 py-1.5" style={{ color: dim }}>
                              Showing {contents.data.objects.length} of {contents.data.count} —
                              the totals above count all of them.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── CONFIRM ───────────────────────────────────────────────── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
             role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div style={card} className="rounded-xl p-5 max-w-md w-full">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: bad }} />
              <h3 id="confirm-title" className="text-base font-semibold" style={{ color: ink }}>
                Delete {confirming.prefix}/ permanently?
              </h3>
              <button type="button" onClick={() => setConfirming(null)} className="ml-auto p-1" aria-label="Cancel">
                <X className="w-4 h-4" style={{ color: dim }} />
              </button>
            </div>

            <p className="text-sm mb-2" style={{ color: ink }}>
              {confirming.count.toLocaleString('en-IN')} file{confirming.count === 1 ? '' : 's'},
              {' '}{formatStorageBytes(confirming.bytes)}. This cannot be undone.
            </p>

            {confirming.tenants.length > 1 && (
              <p className="text-sm mb-2 p-2 rounded-lg" style={{ backgroundColor: `${warn}14`, color: warn }}>
                This folder is shared by {confirming.tenants.length} tenants —{' '}
                <strong>{confirming.tenants.map(t => t.name || t.id).join(', ')}</strong>.
                All of them lose these files.
              </p>
            )}

            <p className="text-xs mb-3" style={{ color: dim }}>
              These are documents uploaded under the old per-tenant storage model. Contract
              evidence and identity assets are stored separately and are not affected.
            </p>

            <label className="text-xs block mb-1" style={{ color: dim }}>
              Type <code style={{ color: ink }}>{confirming.prefix}</code> to confirm
            </label>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm mb-3 outline-none"
              style={{ backgroundColor: `${ink}0d`, color: ink, border: `1px solid ${ink}22` }}
            />

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirming(null)}
                      className="px-3.5 py-2 rounded-xl text-sm font-semibold"
                      style={{ backgroundColor: `${ink}0d`, color: ink }}>
                Cancel
              </button>
              <button
                type="button"
                disabled={typed !== confirming.prefix || deletePrefix.isPending}
                onClick={() => {
                  const prefix = confirming.prefix;
                  deletePrefix.mutate(prefix, { onSettled: () => { setConfirming(null); setBrowsing(null); } });
                }}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: bad, color: '#fff' }}
              >
                {deletePrefix.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageAdminPage;

// src/hooks/queries/useEvidenceQueries.ts
//
// Evidence storage — the ONE upload path in the product.
// Broker: /api/evidence (batch B). Firebase is a dumb blob store; the API
// authorises in Postgres and mints short-TTL signed URLs. Nothing here holds a
// durable URL, and nothing here talks to Firebase except the raw PUT to a URL
// the API just handed us.
//
// An upload is three steps, and the middle one does not touch our servers:
//   1. POST /slot          → membership, mime and cap checked BEFORE the work
//   2. PUT  <signed url>   → bytes go straight to Firebase
//   3. POST /:id/confirm   → the API reads the object back and records its
//                            TRUE size; only then is it active and metered
// A failure at step 2 or 3 leaves a pending row the sweeper reclaims, so a
// half-finished upload never bills the tenant.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import api from '@/services/api';
import { compressImage, canCompress } from '@/utils/imageCompression';

const BASE = '/api/evidence';

export type EvidenceScope = 'contract' | 'tenant';
export type AssetKind = 'logo' | 'avatar' | 'block_icon' | 'integration_qr';
export type WarnLevel = 'ok' | 'warning' | 'critical' | 'full';

export interface StorageUsage {
  used_bytes: number;
  quota_bytes: number;
  free_bytes: number;
  pct: number;
  warn_level: WarnLevel;
}

export interface EvidenceRow {
  evidence_id: string;
  event_id: string | null;
  form_submission_id: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  is_compressed: boolean;
  uploaded_by: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface UploadTarget {
  scope?: EvidenceScope;
  contractId?: string | null;
  eventId?: string | null;
  formSubmissionId?: string | null;
  assetKind?: AssetKind | null;
}

export const evidenceKeys = {
  all: ['evidence'] as const,
  usage: () => [...evidenceKeys.all, 'usage'] as const,
  contract: (id: string) => [...evidenceKeys.all, 'contract', id] as const,
};

const unwrap = <T,>(response: any): T => (response.data?.data ?? response.data) as T;

/** The RPC's machine-readable reason, turned into something a person can act on. */
const REASON_COPY: Record<string, string> = {
  cap_reached:
    'Storage is full. Top up to add more evidence — everything already uploaded is safe.',
  mime_not_allowed: 'That file type cannot be uploaded as evidence.',
  not_contract_creator: 'Only the contract owner can add evidence to it.',
  forbidden: 'You do not have access to this file.',
  object_missing: 'The upload did not finish. Please try again.',
  not_configured: 'Evidence storage is not configured on this server.',
  sign_failed: 'Could not reach storage. Please try again in a moment.',
};

const errorMessage = (error: any, fallback: string): string => {
  const reason = error?.response?.data?.error?.details?.reason;
  const msg = error?.response?.data?.error?.message;
  return (reason && REASON_COPY[reason]) || msg || error?.message || fallback;
};

// ── Reads ────────────────────────────────────────────────────────────────────

export function useStorageUsage(enabled = true) {
  return useQuery({
    queryKey: evidenceKeys.usage(),
    queryFn: async (): Promise<StorageUsage> => unwrap(await api.get(`${BASE}/usage`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useContractEvidence(contractId?: string | null) {
  return useQuery({
    queryKey: evidenceKeys.contract(contractId || 'none'),
    queryFn: async (): Promise<{ evidence: EvidenceRow[]; count: number }> =>
      unwrap(await api.get(`${BASE}/contract/${contractId}`)),
    enabled: Boolean(contractId),
  });
}

/**
 * A read URL is minted per viewer, per request, and expires in minutes — so it
 * is fetched on demand rather than cached into a list. Revoking a party's
 * access revokes files already delivered, because nothing durable was shared.
 */
export function useEvidenceUrl() {
  return useMutation({
    mutationFn: async (evidenceId: string): Promise<{ url: string; file_name: string }> =>
      unwrap(await api.get(`${BASE}/${evidenceId}/url`)),
    onError: (error: any) =>
      vaniToast.error(errorMessage(error, 'Could not open that file'), { duration: 5000 }),
  });
}

// ── Upload ───────────────────────────────────────────────────────────────────

export interface UploadProgress {
  fileName: string;
  phase: 'compressing' | 'requesting' | 'uploading' | 'confirming' | 'done' | 'failed';
  pct: number;
  error?: string;
}

export interface UploadResult {
  evidence_id: string;
  file_name: string;
  size_bytes: number;
  usage?: StorageUsage | null;
  /**
   * Present ONLY for identity assets (scope='tenant'). A durable URL the caller
   * stores in its own field — logo_url, a user's avatar, qr_image_url, a block's
   * custom icon — exactly the shape those 85 call sites already hold.
   * Contract evidence never carries one: it is signed per viewer, per request,
   * so that revoking a party's access revokes files already delivered.
   */
  public_url?: string;
}

/**
 * The whole three-step dance for one file, with progress.
 *
 * `onProgress` is called at every phase so a caller can render a real bar
 * rather than a spinner that lies — the PUT is the long part on a phone, and
 * it reports genuine bytes-sent.
 */
export function useUploadEvidence(onProgress?: (p: UploadProgress) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { file: File; target: UploadTarget }): Promise<UploadResult> => {
      const { target } = vars;
      const report = (phase: UploadProgress['phase'], pct: number, error?: string) =>
        onProgress?.({ fileName: vars.file.name, phase, pct, error });

      // 1. compress — before the size is declared, so the cap check sees the
      //    size we will actually store
      report('compressing', 5);
      const { file, wasCompressed, originalSizeBytes } = canCompress(vars.file)
        ? await compressImage(vars.file)
        : { file: vars.file, wasCompressed: false, originalSizeBytes: vars.file.size };

      // 2. slot — the gate. Refused here, nothing was uploaded and no effort wasted.
      report('requesting', 10);
      const slot = unwrap<any>(
        await api.post(`${BASE}/slot`, {
          scope: target.scope || 'contract',
          contract_id: target.contractId || null,
          event_id: target.eventId || null,
          form_submission_id: target.formSubmissionId || null,
          asset_kind: target.assetKind || null,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          is_compressed: wasCompressed,
          original_size_bytes: wasCompressed ? originalSizeBytes : null,
        })
      );

      // 3. PUT straight to Firebase. Deliberately NOT through `api`: this is a
      //    pre-signed URL on another host and must carry no auth headers of
      //    ours — and the Content-Type must match what the slot was signed for.
      report('uploading', 15);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(slot.method || 'PUT', slot.upload_url, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            report('uploading', 15 + Math.round((e.loaded / e.total) * 70));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.send(file);
      });

      // 4. confirm — the API reads the object back; the size it records is the
      //    one that gets metered, not the one we claimed above.
      report('confirming', 90);
      const confirmed = unwrap<any>(await api.post(`${BASE}/${slot.evidence_id}/confirm`, {}));

      report('done', 100);
      return {
        evidence_id: slot.evidence_id,
        file_name: file.name,
        size_bytes: confirmed?.size_bytes ?? file.size,
        usage: confirmed?.usage ?? null,
        public_url: confirmed?.public_url,
      };
    },

    onSuccess: (result, vars) => {
      vaniToast.success(`${result.file_name} uploaded`, { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.usage() });
      if (vars.target.contractId) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.contract(vars.target.contractId) });
      }
    },

    onError: (error: any, vars) => {
      const message = errorMessage(error, 'Upload failed');
      onProgress?.({ fileName: vars.file.name, phase: 'failed', pct: 0, error: message });
      vaniToast.error(message, { duration: 6000 });
      // The cap may have moved under us; re-read it so the meter is honest.
      queryClient.invalidateQueries({ queryKey: evidenceKeys.usage() });
    },
  });
}

export function useDeleteEvidence(contractId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evidenceId: string) => unwrap(await api.delete(`${BASE}/${evidenceId}`)),
    onSuccess: () => {
      vaniToast.success('Evidence removed', { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.usage() });
      if (contractId) queryClient.invalidateQueries({ queryKey: evidenceKeys.contract(contractId) });
    },
    onError: (error: any) =>
      vaniToast.error(errorMessage(error, 'Could not remove that file'), { duration: 5000 }),
  });
}

/**
 * One identity asset, one line — for the call sites that own a single image and
 * a single URL field (logo, avatar, block icon, integration QR). Uploads, then
 * hands back the durable public URL to store wherever that field already lives.
 *
 * Deliberately separate from <FileUpload>: these surfaces have their own
 * long-standing layouts (a round avatar with a camera badge, a logo box with a
 * preview) and replacing them wholesale is a redesign nobody asked for. They
 * needed the storage path changed, not the control.
 */
export function useUploadIdentityAsset(assetKind: AssetKind) {
  const upload = useUploadEvidence();
  return {
    ...upload,
    uploadAsset: async (file: File): Promise<string | null> => {
      const result = await upload.mutateAsync({ file, target: { scope: 'tenant', assetKind } });
      return result.public_url ?? null;
    },
  };
}

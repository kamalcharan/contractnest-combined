// src/utils/firebaseStorageAdmin.ts
// ============================================================================
// Firebase Admin SDK — the ONLY way bytes reach or leave storage.
// ============================================================================
// Firebase is a dumb blob store. Security rules deny all direct client access,
// so every operation is brokered here with the Admin SDK and a short-TTL signed
// URL. The permission rule itself lives in Postgres beside the contract that
// defines it (contract_membership, migration evidence-storage/001) — this file
// only mints URLs for decisions already taken.
//
// Replaces the pattern this codebase used everywhere else: the Firebase CLIENT
// SDK with signInAnonymously(), plus getDownloadURL() whose token was written
// into the database. A stored download URL hard-codes the host into the row,
// cannot be re-signed per viewer, and cannot be revoked — three reasons the
// redesign forbids it.
//
// Credentials are the service account already used by firebaseController:
//   VITE_FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
//   VITE_FIREBASE_STORAGE_BUCKET

import * as admin from 'firebase-admin';
import { captureException } from './sentry';

// Signed URLs are minutes, not hours, and are never persisted anywhere.
export const UPLOAD_URL_TTL_MS = 10 * 60 * 1000;   // 10 minutes to finish an upload
export const READ_URL_TTL_MS   = 5 * 60 * 1000;    // 5 minutes to fetch a file

const APP_NAME = 'evidence-storage';

let app: admin.app.App | null = null;

/**
 * Its own named app instance so it cannot collide with the default app that
 * firebaseController initialises for diagnostics.
 */
function getApp(): admin.app.App {
  if (app) return app;

  const projectId   = process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const bucket      = process.env.VITE_FIREBASE_STORAGE_BUCKET;

  const missing = [
    !projectId   && 'VITE_FIREBASE_PROJECT_ID',
    !clientEmail && 'FIREBASE_CLIENT_EMAIL',
    !privateKey  && 'FIREBASE_PRIVATE_KEY',
    !bucket      && 'VITE_FIREBASE_STORAGE_BUCKET'
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Evidence storage is not configured: missing ${missing.join(', ')}`);
  }

  const existing = admin.apps.find(a => a?.name === APP_NAME);
  app = existing
    ? (existing as admin.app.App)
    : admin.initializeApp(
        {
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
          storageBucket: bucket
        },
        APP_NAME
      );

  return app;
}

function file(objectPath: string) {
  return getApp().storage().bucket().file(objectPath);
}

/**
 * A short-lived URL the client PUTs the bytes to directly. The content type is
 * bound into the signature, so a client cannot upload something other than what
 * the slot was granted for.
 */
export async function signUploadUrl(objectPath: string, mimeType: string): Promise<string> {
  const [url] = await file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + UPLOAD_URL_TTL_MS,
    contentType: mimeType
  });
  return url;
}

/** A short-lived read URL. Never stored — minted fresh for each viewer, each time. */
export async function signReadUrl(objectPath: string, fileName?: string): Promise<string> {
  const [url] = await file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + READ_URL_TTL_MS,
    ...(fileName
      ? { responseDisposition: `inline; filename="${fileName.replace(/"/g, '')}"` }
      : {})
  });
  return url;
}

/**
 * The true size of what Firebase actually holds. The size a client declares at
 * slot request is a claim; this is the fact that gets metered.
 */
export async function statObject(
  objectPath: string
): Promise<{ exists: boolean; sizeBytes: number; md5?: string; contentType?: string }> {
  const f = file(objectPath);
  const [exists] = await f.exists();
  if (!exists) return { exists: false, sizeBytes: 0 };

  const [meta] = await f.getMetadata();
  return {
    exists: true,
    sizeBytes: Number(meta.size ?? 0),
    md5: typeof meta.md5Hash === 'string' ? meta.md5Hash : undefined,
    contentType: typeof meta.contentType === 'string' ? meta.contentType : undefined
  };
}

/**
 * Deletes one object. Only the StorageCleanup sweeper should call this — a
 * Firebase delete cannot participate in a Postgres transaction, so rows are
 * marked 'deleted' first and the bytes are reclaimed afterwards.
 * Missing is success: the goal is absence, not the act.
 */
export async function deleteObject(objectPath: string): Promise<boolean> {
  try {
    await file(objectPath).delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'evidence_storage', action: 'deleteObject' },
      extra: { objectPath }
    });
    return false;
  }
}

/** Surfaced by the health endpoint so a misconfiguration is visible before an upload fails. */
export function isConfigured(): boolean {
  try {
    getApp();
    return true;
  } catch {
    return false;
  }
}

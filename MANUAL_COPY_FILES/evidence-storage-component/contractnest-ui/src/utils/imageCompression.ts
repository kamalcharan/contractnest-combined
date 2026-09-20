// src/utils/imageCompression.ts
// ============================================================================
// Client-side image compression — what makes a 40 MB cap workable.
// ============================================================================
// A phone photo is 3–5 MB raw. Downscaled to ~1600px JPEG it lands near 300 KB:
// a tenfold reduction that costs nothing and pushes the cap roughly ten times
// further out. It also cuts egress by the same factor, since evidence is read
// by the buyer and by CNAK holders, not just by the uploader.
//
// Deliberately canvas-only — no new dependency. Compression is LOSSY and
// irreversible, so the registry records is_compressed + original_size_bytes:
// if a per-contract "keep originals" flag ever ships, we can tell which
// historical evidence is a reduction. That fact cannot be recovered later.
//
// PDFs and documents pass through untouched — re-encoding them would corrupt
// exactly the files people keep for compliance.

export const MAX_EDGE_PX = 1600;
export const JPEG_QUALITY = 0.82;

/** Formats we will re-encode. HEIC is decoded by the browser where supported. */
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export interface CompressionResult {
  file: File;
  wasCompressed: boolean;
  originalSizeBytes: number;
}

export function canCompress(file: File): boolean {
  return COMPRESSIBLE.includes(file.type);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

/**
 * Downscales the longest edge to MAX_EDGE_PX and re-encodes as JPEG.
 *
 * Every failure path returns the ORIGINAL file rather than throwing: a
 * technician standing in a plant room must never lose a photo because a canvas
 * operation failed on their browser. Worse compression is an acceptable
 * outcome; a lost proof is not.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  if (!canCompress(file)) {
    return { file, wasCompressed: false, originalSizeBytes };
  }

  try {
    const img = await loadImage(file);
    const longest = Math.max(img.width, img.height);

    // Already small enough that re-encoding would mostly add artefacts.
    if (longest <= MAX_EDGE_PX && file.size <= 400 * 1024) {
      return { file, wasCompressed: false, originalSizeBytes };
    }

    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, wasCompressed: false, originalSizeBytes };
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(b => resolve(b), 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob) return { file, wasCompressed: false, originalSizeBytes };

    // If compression made it bigger (small PNGs do this), keep the original.
    if (blob.size >= originalSizeBytes) {
      return { file, wasCompressed: false, originalSizeBytes };
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return {
      file: new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }),
      wasCompressed: true,
      originalSizeBytes
    };
  } catch {
    return { file, wasCompressed: false, originalSizeBytes };
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// src/utils/upiQrDecode.ts
// Best-effort decoder: given an uploaded QR image, extracts the
// merchant-classification fields (org_id, mcc) a bank encodes on a real
// UPI merchant QR — see CLAUDE.md "check-in UPI pay link fails on real
// GPay" for why these matter (a merchant VPA declared as a personal/P2P
// transfer is rejected by the UPI network). Lets a tenant fix this by
// uploading the QR they already have from their bank, without ever
// being asked what a "merchant category code" is.
//
// Deliberately never throws: this only ever enriches an otherwise
// successful QR image upload. A non-UPI QR, an undecodable image, or a
// personal VPA's QR (no orgid/mc at all) are all normal outcomes, not
// errors — the upload itself must never be blocked by this.
import Jimp from 'jimp';
import jsQR from 'jsqr';

export interface DetectedUpiFields {
  org_id?: string;
  mcc?: string;
}

export async function detectUpiMerchantFields(buffer: Buffer): Promise<DetectedUpiFields | null> {
  try {
    const image = await Jimp.read(buffer);
    const { data, width, height } = image.bitmap;
    const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width, height);
    if (!code?.data) return null;

    const text = code.data.trim();
    if (!/^upi:\/\//i.test(text)) return null;

    const queryString = text.split('?')[1];
    if (!queryString) return null;

    const params = new URLSearchParams(queryString);
    const orgId = params.get('orgid') || undefined;
    const mcc = params.get('mc') || undefined;
    if (!orgId && !mcc) return null;

    return { ...(orgId ? { org_id: orgId } : {}), ...(mcc ? { mcc } : {}) };
  } catch (error) {
    console.warn('QR merchant-field detection failed (non-fatal):', error instanceof Error ? error.message : error);
    return null;
  }
}

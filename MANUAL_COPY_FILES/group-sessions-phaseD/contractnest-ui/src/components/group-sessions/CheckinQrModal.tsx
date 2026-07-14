// ============================================================================
// CheckinQrModal — shows a printable/downloadable QR for a group session's
// static check-in link. Zero-dependency QR via src/utils/qrcodegen.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import { QrCode } from '@/utils/qrcodegen';

interface CheckinQrModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

const CheckinQrModal: React.FC<CheckinQrModalProps> = ({ url, title, onClose }) => {
  const [copied, setCopied] = useState(false);

  const svg = useMemo(() => {
    try {
      return QrCode.encodeText(url, 'MEDIUM').toSvgString(2, '#111827', '#ffffff');
    } catch {
      return '';
    }
  }, [url]);

  const svgDataUri = useMemo(
    () => (svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : ''),
    [svg]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard optional */
    }
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-checkin-qr.svg`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const downloadPng = () => {
    if (!svgDataUri) return;
    const img = new Image();
    img.onload = () => {
      const scale = 12; // crisp, poster-friendly
      const size = img.width * scale || 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-checkin-qr.png`;
      a.click();
    };
    img.src = svgDataUri;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>{title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              Members scan this to check in. The link is permanent — print it as a poster.
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
          {svg ? (
            <div
              style={{ width: 240, height: 240, border: '1px solid #ECECEE', borderRadius: 12, padding: 10, background: '#fff' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div style={{ color: '#B91C1C', fontSize: 13 }}>Could not render the QR.</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F6F7F9', borderRadius: 10, padding: '8px 10px' }}>
          <span style={{ flex: 1, fontSize: 12, color: '#374151', wordBreak: 'break-all' }}>{url}</span>
          <button
            onClick={copy}
            style={{ border: 'none', background: '#fff', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: copied ? '#059669' : '#374151' }}
            title="Copy link"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={downloadPng}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: 'none', borderRadius: 10, background: '#DA6410', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={15} /> PNG
          </button>
          <button
            onClick={downloadSvg}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: '1px solid #D1D5DB', borderRadius: 10, background: '#fff', color: '#111827', fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={15} /> SVG
          </button>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: '1px solid #D1D5DB', borderRadius: 10, background: '#fff', color: '#111827', fontWeight: 600, textDecoration: 'none' }}
          >
            Open
          </a>
        </div>
      </div>
    </div>
  );
};

export default CheckinQrModal;

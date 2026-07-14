// ============================================================================
// QRCard — always-visible check-in QR for a group-session block. Mints the
// static token on mount and renders the QR inline (nayuki qrcodegen, no deps),
// with Download PNG/SVG, Open, and Regenerate.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCw, QrCode as QrIcon, Copy, Check } from 'lucide-react';
import { useEnsureBlockToken } from '@/hooks/queries/useGroupSessionsDashboard';
import { QrCode } from '@/utils/qrcodegen';
import { useTheme } from '@/contexts/ThemeContext';

interface QRCardProps {
  blockId: string;
  title: string;
}

const QRCard: React.FC<QRCardProps> = ({ blockId, title }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const ensureToken = useEnsureBlockToken();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (blockId) {
      ensureToken.mutateAsync({ blockId }).then((r) => { if (alive) setToken(r?.token ?? null); }).catch(() => {});
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  const url = token ? `${window.location.origin}/checkin/${token}` : '';
  const svg = useMemo(() => {
    if (!url) return '';
    try { return QrCode.encodeText(url, 'MEDIUM').toSvgString(2, isDarkMode ? '#E9E7E3' : '#111827', isDarkMode ? '#20242A' : '#ffffff'); }
    catch { return ''; }
  }, [url, isDarkMode]);

  const download = (kind: 'svg' | 'png') => {
    if (!svg) return;
    const base = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-checkin-qr`;
    if (kind === 'svg') {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = href; a.download = `${base}.svg`; a.click();
      URL.revokeObjectURL(href);
      return;
    }
    const img = new Image();
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    img.onload = () => {
      const size = (img.width || 41) * 12;
      const c = document.createElement('canvas'); c.width = size; c.height = size;
      const ctx = c.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = isDarkMode ? '#20242A' : '#ffffff'; ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `${base}.png`; a.click();
    };
    img.src = dataUri;
  };

  const card: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}14`,
    borderRadius: 14, padding: 16, textAlign: 'center', marginBottom: 18,
  };
  const btn: React.CSSProperties = {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px', borderRadius: 9, fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
    border: `1px solid ${colors.utility.primaryText}22`, background: colors.utility.primaryBackground, color: colors.utility.primaryText,
  };

  return (
    <div style={card}>
      <div style={{ width: 132, height: 132, margin: '4px auto 12px', borderRadius: 11, padding: 8, background: isDarkMode ? '#20242A' : '#fff', boxShadow: `0 0 0 1px ${colors.utility.primaryText}18` }}>
        {svg ? (
          <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: colors.utility.secondaryText }}>
            <QrIcon size={26} />
          </div>
        )}
      </div>
      <h4 style={{ margin: '0 0 3px', fontSize: 14, color: colors.utility.primaryText }}>{title} · QR</h4>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.utility.secondaryText }}>
        One static QR per session — members scan the same code to check in every time.
      </p>
      <div
        style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', display: 'inline-block', marginBottom: 12,
          background: (token ? colors.semantic.success : colors.semantic.warning) + '1e',
          color: token ? colors.semantic.success : colors.semantic.warning }}
      >
        ● {token ? 'QR ready' : (ensureToken.isPending ? 'Generating…' : 'Not generated')}
      </div>

      {url && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.utility.primaryBackground, border: `1px solid ${colors.utility.primaryText}14`, borderRadius: 9, padding: '7px 9px', marginBottom: 10 }}>
          <span style={{ flex: 1, fontSize: 11, color: colors.utility.secondaryText, wordBreak: 'break-all', textAlign: 'left' }}>{url}</span>
          <button
            onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}
            title="Copy check-in link"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied ? colors.semantic.success : colors.utility.secondaryText, flex: 'none' }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...btn, background: colors.brand.primary, color: '#fff', borderColor: colors.brand.primary }} disabled={!svg} onClick={() => download('png')}>
          <Download size={14} /> Download
        </button>
        <button style={btn} disabled={!svg} onClick={() => download('svg')}>SVG</button>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: 'none' }}>
            <ExternalLink size={14} /> Open
          </a>
        )}
      </div>
      <button
        style={{ ...btn, width: '100%', marginTop: 8, justifyContent: 'center' }}
        disabled={ensureToken.isPending}
        onClick={() => ensureToken.mutateAsync({ blockId }).then((r) => setToken(r?.token ?? null)).catch(() => {})}
      >
        <RefreshCw size={14} /> Regenerate link
      </button>
    </div>
  );
};

export default QRCard;

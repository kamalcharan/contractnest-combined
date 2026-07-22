// ============================================================================
// QRCard — always-visible check-in QR for a group-session block. Mints the
// static token on mount and renders the QR inline (nayuki qrcodegen, no deps),
// with a BRANDED POSTER download (primary), plain PNG/SVG, Open, Copy link
// and Regenerate.
//
// One MASTER QR per group (per environment): gs_ensure_block_token stores a
// single permanent token per (tenant, block, is_live) — the QR never changes
// between sessions. The check-in form does the intelligent part (resolves
// today's occurrence, recognises the member, pulls their dues); the token is
// simply the group's unguessable public identity.
//
// Poster spec (owner, 2026-07-22): eyebrow = group cadence + "CHECK-IN",
// big heading = tenant name, subheading = group name, SCAN-ME QR panel with
// corner brackets, scan steps, ContractNest · Vikuna Technologies branding.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCw, QrCode as QrIcon, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { useEnsureBlockToken } from '@/hooks/queries/useGroupSessionsDashboard';
import { QrCode } from '@/utils/qrcodegen';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';

interface QRCardProps {
  blockId: string;
  title: string;
  /** Human cadence line from the dashboard, e.g. "Every 14 days · Saturdays" */
  cadence?: string;
}

const QRCard: React.FC<QRCardProps> = ({ blockId, title, cadence }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();
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

  const fileBase = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-checkin`;

  const download = (kind: 'svg' | 'png') => {
    if (!svg) return;
    const base = `${fileBase}-qr`;
    if (kind === 'svg') {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = href; a.download = `${base}.svg`; a.click();
      URL.revokeObjectURL(href);
      return;
    }
    const img = new window.Image();
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

  // ── Branded poster (1080×1350 PNG, drawn directly on canvas) ──
  const downloadPoster = () => {
    if (!url) return;
    let qr: QrCode;
    try { qr = QrCode.encodeText(url, 'MEDIUM'); } catch { return; }

    const W = 1080, H = 1350;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); if (!ctx) return;

    const brand = colors.brand.primary || '#EA7A26';
    const navy = '#232F4B';
    const softInk = '#C9D0DF';
    const sep = '#5B6883';
    const tenantName = currentTenant?.name || 'Your Business';
    const eyebrow = `${(cadence || 'Group session').toUpperCase()}  ·  CHECK-IN`;

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const circle = (x: number, y: number, r: number, fill: string, alpha = 1) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    const wrapLines = (text: string, font: string, maxW: number): string[] => {
      ctx.font = font;
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = '';
      words.forEach((w) => {
        const probe = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(probe).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = probe;
      });
      if (cur) lines.push(cur);
      return lines;
    };

    // Background + ambient shapes
    ctx.fillStyle = navy; ctx.fillRect(0, 0, W, H);
    circle(-130, 330, 400, '#1A2338', 0.9);
    circle(W + 140, H - 400, 470, '#2B3A5C', 0.35);
    circle(W - 80, 180, 190, '#2B3A5C', 0.25);
    // Brand top bar
    ctx.fillStyle = brand; ctx.fillRect(0, 0, W, 24);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Eyebrow — cadence
    ctx.fillStyle = brand;
    ctx.font = '800 30px -apple-system, "Segoe UI", Arial, sans-serif';
    (ctx as any).letterSpacing = '7px';
    ctx.fillText(eyebrow, W / 2, 148);
    (ctx as any).letterSpacing = '0px';

    // Tenant name (wraps if long)
    ctx.fillStyle = '#FFFFFF';
    const nameFont = 'bold 84px Georgia, "Times New Roman", serif';
    const nameLines = wrapLines(tenantName, nameFont, W - 140);
    let y = 252;
    nameLines.forEach((ln) => { ctx.font = nameFont; ctx.fillText(ln, W / 2, y); y += 94; });

    // Divider under the name
    ctx.fillStyle = brand; rr(W / 2 - 45, y - 56, 90, 6, 3); ctx.fill();

    // Group name
    ctx.fillStyle = softInk;
    ctx.font = '500 36px -apple-system, "Segoe UI", Arial, sans-serif';
    ctx.fillText(title, W / 2, y + 12);

    // QR panel
    const panel = 560;
    const px = (W - panel) / 2;
    const py = y + 64;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#FFFFFF'; rr(px, py, panel, panel, 30); ctx.fill();
    ctx.restore();

    // Corner brackets
    ctx.strokeStyle = brand; ctx.lineWidth = 8; ctx.lineCap = 'round';
    const g = 26, L = 62; // gap outside panel, arm length
    const corners: [number, number, number, number][] = [
      [px - g, py - g, 1, 1], [px + panel + g, py - g, -1, 1],
      [px - g, py + panel + g, 1, -1], [px + panel + g, py + panel + g, -1, -1],
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * L);
      ctx.stroke();
    });

    // SCAN ME pill overlapping the panel top
    ctx.font = '800 26px -apple-system, "Segoe UI", Arial, sans-serif';
    (ctx as any).letterSpacing = '4px';
    const pillW = ctx.measureText('SCAN ME').width + 64;
    ctx.fillStyle = brand; rr(W / 2 - pillW / 2, py - 26, pillW, 52, 26); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('SCAN ME', W / 2, py + 9);
    (ctx as any).letterSpacing = '0px';

    // QR modules (dark on the white panel, generous quiet zone)
    const quiet = 40;
    const inner = panel - quiet * 2;
    const mod = inner / qr.size;
    ctx.fillStyle = '#16203A';
    for (let ry = 0; ry < qr.size; ry++) {
      for (let rx = 0; rx < qr.size; rx++) {
        if (qr.getModule(rx, ry)) {
          ctx.fillRect(px + quiet + rx * mod, py + quiet + ry * mod, Math.ceil(mod), Math.ceil(mod));
        }
      }
    }

    // Caption — two-tone serif
    const capY = py + panel + 108;
    ctx.font = 'bold 46px Georgia, "Times New Roman", serif';
    const part1 = 'Scan to mark ';
    const part2 = 'your attendance';
    const capW = ctx.measureText(part1).width + ctx.measureText(part2).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(part1, W / 2 - capW / 2, capY);
    ctx.fillStyle = brand; ctx.fillText(part2, W / 2 - capW / 2 + ctx.measureText(part1).width, capY);

    // Steps: 1 Scan › 2 Mark present › 3 Pay dues
    const steps = ['Scan', 'Mark present', 'Pay dues'];
    const stepFont = '600 26px -apple-system, "Segoe UI", Arial, sans-serif';
    const R = 19, numGap = 12, sepGap = 34;
    ctx.font = stepFont;
    let total = 0;
    steps.forEach((s, i) => { total += R * 2 + numGap + ctx.measureText(s).width + (i < steps.length - 1 ? sepGap * 2 : 0); });
    let sx = W / 2 - total / 2;
    const sy = capY + 74;
    steps.forEach((s, i) => {
      circle(sx + R, sy - 9, R, brand);
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 22px -apple-system, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(String(i + 1), sx + R, sy - 1);
      ctx.textAlign = 'left'; ctx.font = stepFont; ctx.fillStyle = softInk;
      ctx.fillText(s, sx + R * 2 + numGap, sy);
      sx += R * 2 + numGap + ctx.measureText(s).width;
      if (i < steps.length - 1) {
        ctx.fillStyle = sep;
        ctx.fillText('›', sx + sepGap - 6, sy);
        sx += sepGap * 2;
      }
    });

    // Product branding footer: ● ContractNest · by Vikuna Technologies
    const brandLine = 'ContractNest';
    const byLine = '  ·  by Vikuna Technologies';
    ctx.font = '800 30px -apple-system, "Segoe UI", Arial, sans-serif';
    const w1 = ctx.measureText(brandLine).width;
    ctx.font = '500 24px -apple-system, "Segoe UI", Arial, sans-serif';
    const w2 = ctx.measureText(byLine).width;
    const bx = W / 2 - (w1 + w2) / 2;
    ctx.textAlign = 'left';
    ctx.font = '800 30px -apple-system, "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(brandLine, bx, H - 52);
    ctx.font = '500 24px -apple-system, "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = softInk; ctx.fillText(byLine, bx + w1, H - 52);
    circle(bx - 22, H - 62, 7, brand);

    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${fileBase}-poster.png`;
    a.click();
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
        One master QR per group — members scan the same code every session; the form recognises them and pulls their dues.
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
        <button style={{ ...btn, background: colors.brand.primary, color: '#fff', borderColor: colors.brand.primary }} disabled={!url} onClick={downloadPoster} title="Branded poster with the QR — print or share">
          <ImageIcon size={14} /> Poster
        </button>
        <button style={btn} disabled={!svg} onClick={() => download('png')} title="Plain QR only"><Download size={14} /> PNG</button>
        <button style={btn} disabled={!svg} onClick={() => download('svg')}>SVG</button>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: 'none' }}>
            <ExternalLink size={14} /> Open
          </a>
        )}
      </div>
      {url && (
        <button
          style={{ ...btn, width: '100%', marginTop: 8, justifyContent: 'center',
            ...(copied ? { background: colors.semantic.success + '15', borderColor: colors.semantic.success, color: colors.semantic.success } : {}) }}
          onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Link copied' : 'Copy link'}
        </button>
      )}
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

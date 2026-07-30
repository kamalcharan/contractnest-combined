// src/pages/contracts/detail/RfqReport.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Dedicated RFQ view/report (tracker B7).
//
// An RFQ is NOT a contract — reusing the contract detail view buried the one
// thing a buyer opens an RFQ to see: who was invited, who quoted, for how much,
// and by when. This is a purpose-built, read-first RFQ document rendered by the
// detail page when record_type === 'rfq'. No new route — it early-returns inside
// /contracts/:id, so the CNAK/link a buyer already has keeps working.
//
// It reads only what the detail page already loaded (ContractDetail); no new API.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, CalendarDays, Clock, Package, Building2, Wrench,
  Users, Check, X, Hourglass, Send, Award, Mail, ClipboardList,
} from 'lucide-react';
import type { ContractDetail, ContractStatus } from '@/types/contracts';

interface RfqReportProps {
  contract: ContractDetail;
  colors: any;
  canChangeStatus?: boolean;
  availableTransitions?: ContractStatus[];
  onStatusChange?: (status: ContractStatus) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtMoney = (value?: number | null, currency?: string): string => {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency || 'INR'} ${value.toLocaleString()}`;
  }
};

// Days between now and the deadline (negative = past).
const daysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const RFQ_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent — awaiting quotes',
  quotes_received: 'Quotes received',
  awarded: 'Awarded',
  converted_to_contract: 'Converted to contract',
  cancelled: 'Cancelled',
};

const TRANSITION_LABEL: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  sent: { label: 'Send to vendors', icon: Send },
  quotes_received: { label: 'Mark quotes received', icon: ClipboardList },
  awarded: { label: 'Award', icon: Award },
  cancelled: { label: 'Cancel request', icon: X },
  converted_to_contract: { label: 'Convert to contract', icon: FileText },
};

const RfqReport: React.FC<RfqReportProps> = ({
  contract, colors, canChangeStatus, availableTransitions = [], onStatusChange,
}) => {
  const navigate = useNavigate();

  const ink = colors.utility.primaryText;
  const sub = colors.utility.secondaryText;
  const surface = colors.utility.secondaryBackground;
  const bg = colors.utility.primaryBackground || surface;
  const brand = colors.brand.primary;
  const line = ink + '15';
  const ok = colors.semantic?.success || '#10b981';
  const warn = colors.semantic?.warning || '#f59e0b';
  const danger = colors.semantic?.error || '#ef4444';

  const currency = contract.currency || 'INR';
  const vendors = contract.vendors || [];
  const blocks = (contract.blocks || []).filter((b) => (b.source_type || '').toLowerCase() === 'flyby' || true);
  const coverage = contract.coverage_types || [];
  const equipment = contract.equipment_details || [];

  // vendor quote tallies
  const quotedCount = vendors.filter((v) => (v.response_status || '') === 'quoted' || (v.response_status || '') === 'accepted').length;
  const declinedCount = vendors.filter((v) => (v.response_status || '') === 'declined').length;
  const pendingCount = vendors.length - quotedCount - declinedCount;

  const dLeft = daysUntil(contract.response_deadline);
  const deadlinePast = dLeft !== null && dLeft < 0;

  const card: React.CSSProperties = { background: surface, border: `1px solid ${line}`, borderRadius: 14, padding: 18 };
  const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: sub, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 };

  const statusColor = (() => {
    switch (contract.status) {
      case 'awarded':
      case 'converted_to_contract': return ok;
      case 'quotes_received': return brand;
      case 'cancelled': return danger;
      case 'draft': return sub;
      default: return warn;
    }
  })();

  const respStyle = (s?: string): { bg: string; fg: string; label: string; Icon: React.ComponentType<any> } => {
    switch ((s || 'pending').toLowerCase()) {
      case 'quoted': return { bg: `${brand}18`, fg: brand, label: 'Quoted', Icon: Check };
      case 'accepted': return { bg: `${ok}20`, fg: ok, label: 'Accepted', Icon: Award };
      case 'declined': return { bg: `${danger}18`, fg: danger, label: 'Declined', Icon: X };
      default: return { bg: `${warn}18`, fg: warn, label: 'Awaiting', Icon: Hourglass };
    }
  };

  return (
    <div style={{ minHeight: '100%', background: bg, padding: '0 0 60px' }}>
      {/* ── top bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: bg, borderBottom: `1px solid ${line}`, padding: '14px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/contracts?record=rfq')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'transparent', border: `1px solid ${ink}22`, color: sub, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <ArrowLeft className="w-4 h-4" /> Requests
          </button>
          <span style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase', color: brand, fontWeight: 700 }}>
            Request {contract.contract_number || ''}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: `${statusColor}18`, color: statusColor, fontSize: 12, fontWeight: 700 }}>
            {RFQ_STATUS_LABEL[contract.status] || contract.status}
          </span>
          <div style={{ flex: 1 }} />
          {canChangeStatus && availableTransitions.map((t) => {
            const meta = TRANSITION_LABEL[t] || { label: t, icon: FileText };
            const Icon = meta.icon;
            const primary = t === 'sent' || t === 'awarded';
            return (
              <button key={t} onClick={() => onStatusChange?.(t)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  border: primary ? 'none' : `1px solid ${ink}22`, background: primary ? brand : 'transparent', color: primary ? '#fff' : sub }}>
                <Icon className="w-4 h-4" /> {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
        {/* ── hero ── */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${brand}14`, color: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <FileText className="w-5 h-5" />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: '0 0 3px' }}>{contract.title || contract.name || 'Request for quote'}</h1>
              <p style={{ fontSize: 13, color: sub, margin: 0 }}>
                {contract.nomenclature_name ? `${contract.nomenclature_name} · ` : ''}
                {contract.duration_value ? `${contract.duration_value} ${contract.duration_unit || ''} · ` : ''}
                Quotes in {currency}
              </p>
            </div>
            {contract.global_access_id && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${brand}0D`, color: brand, borderRadius: 8, padding: '7px 12px', fontSize: 12, fontFamily: 'monospace', flex: 'none' }}>
                <FileText className="w-3.5 h-3.5" /> {contract.global_access_id}
              </div>
            )}
          </div>
          {contract.description && (
            <p style={{ fontSize: 13.5, color: sub, margin: '14px 0 0', lineHeight: 1.5 }}>{contract.description}</p>
          )}
        </div>

        {/* ── timeline strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 11, color: sub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><CalendarDays className="w-3.5 h-3.5" /> Starts</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{fmtDate(contract.start_date)}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 11, color: sub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Clock className="w-3.5 h-3.5" /> Term</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{contract.duration_value ? `${contract.duration_value} ${contract.duration_unit || ''}` : '—'}</div>
          </div>
          <div style={{ ...card, borderColor: deadlinePast ? `${danger}44` : `${warn}44`, background: deadlinePast ? `${danger}0D` : `${warn}0D` }}>
            <div style={{ fontSize: 11, color: deadlinePast ? danger : warn, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Hourglass className="w-3.5 h-3.5" /> Last date to apply</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{fmtDate(contract.response_deadline)}</div>
            {dLeft !== null && (
              <div style={{ fontSize: 11.5, color: deadlinePast ? danger : sub, marginTop: 3 }}>
                {deadlinePast ? `Closed ${Math.abs(dLeft)}d ago` : dLeft === 0 ? 'Closes today' : `${dLeft} day${dLeft === 1 ? '' : 's'} left`}
              </div>
            )}
          </div>
        </div>

        {/* ── what it covers ── */}
        {(coverage.length > 0 || equipment.length > 0) && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={sectionTitle}><Package className="w-4 h-4" /> What it covers</div>
            {(equipment.length ? equipment.map((e) => ({
              key: e.id, name: e.item_name || e.category_name, sub: e.category_name, qty: e.quantity,
              note: (e.notes || (e.specifications as any)?.flavour) as string | null,
              facility: e.resource_type === 'entity',
            })) : coverage.map((c) => ({
              key: c.id, name: c.resource_name, sub: c.sub_category || '', qty: c.unit_count, note: null as string | null, facility: false,
            }))).map((row) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${line}` }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `${brand}12`, color: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  {row.facility ? <Building2 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{row.name}{row.note ? <span style={{ color: sub, fontWeight: 400 }}> — {row.note}</span> : null}</div>
                  {row.sub && <div style={{ fontSize: 11.5, color: sub }}>{row.sub}</div>}
                </div>
                {row.qty ? <span style={{ fontSize: 13, fontWeight: 700, color: sub, fontFamily: 'monospace' }}>×{row.qty}</span> : null}
              </div>
            ))}
          </div>
        )}

        {/* ── services requested (flyby lines) ── */}
        {blocks.length > 0 && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={sectionTitle}><Wrench className="w-4 h-4" /> Services to quote</div>
            {blocks.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${line}` }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `${brand}12`, color: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Wrench className="w-4 h-4" />
                </span>
                <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: ink }}>{b.block_name}</div>
                {b.billing_cycle && <span style={{ fontSize: 12, fontWeight: 600, color: sub, textTransform: 'capitalize' }}>{b.billing_cycle}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── vendors & quotes (the heart) ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ ...sectionTitle, marginBottom: 0 }}><Users className="w-4 h-4" /> Vendors &amp; quotes</div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11.5, fontWeight: 600 }}>
              <span style={{ color: brand }}>{quotedCount} quoted</span>
              <span style={{ color: sub }}>· {pendingCount} awaiting</span>
              {declinedCount > 0 && <span style={{ color: danger }}>· {declinedCount} declined</span>}
            </div>
          </div>

          {vendors.length === 0 ? (
            <p style={{ fontSize: 13, color: sub, margin: '6px 0' }}>No vendors on this request yet.</p>
          ) : (
            vendors.map((v) => {
              const rs = respStyle(v.response_status);
              const RIcon = rs.Icon;
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${line}` }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: `${brand}14`, color: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontWeight: 700, fontSize: 12 }}>
                    {(v.vendor_company || v.vendor_name || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{v.vendor_company || v.vendor_name || 'Vendor'}</div>
                    <div style={{ fontSize: 11.5, color: sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail className="w-3 h-3" /> {v.vendor_email || 'no email on file'}
                    </div>
                    {v.quote_notes && <div style={{ fontSize: 11.5, color: sub, marginTop: 3, fontStyle: 'italic' }}>“{v.quote_notes}”</div>}
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    {(v.response_status === 'quoted' || v.response_status === 'accepted') && v.quoted_amount != null && (
                      <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{fmtMoney(v.quoted_amount, currency)}</div>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: rs.bg, color: rs.fg, fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                      <RIcon className="w-3 h-3" /> {rs.label}
                    </span>
                    {v.responded_at && <div style={{ fontSize: 10.5, color: sub, marginTop: 3 }}>{fmtDate(v.responded_at)}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RfqReport;

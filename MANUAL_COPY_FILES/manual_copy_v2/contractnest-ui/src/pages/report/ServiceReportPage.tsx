// src/pages/report/ServiceReportPage.tsx
// B3.6 — public, printable service report. Reached at /report/service/:token
// (no auth, outside the app shell — same pattern as /checkin/:token).
// Data comes straight from the public service-report edge function; the
// unguessable per-ticket report_token is the whole grant.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Lock, Printer, ClipboardList, AlertTriangle, Loader2 } from 'lucide-react';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://uwyqhzotluikawcboldr.supabase.co';

interface ReportData {
  ticket: {
    ticket_number: string;
    status: string;
    scheduled_date?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    assigned_to_name?: string | null;
    notes?: string | null;
    completion_notes?: string | null;
  };
  contract_number?: string;
  business_name?: string;
  customer_name?: string;
  events: { event_id: string; block_name: string; event_type: string; scheduled_date?: string; status?: string }[];
  assets: { event_id: string; asset_name?: string; status: string; proven_at?: string | null; form_submission_id?: string | null }[];
  submissions: { id: string; event_asset_id?: string | null; form_name: string; responses: Record<string, unknown>; submitted_at?: string }[];
  evidence: { id: string; evidence_type: string; label?: string; file_url?: string; file_name?: string; created_at?: string }[];
}

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateTime = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const labelize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ServiceReportPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/service-report?token=${encodeURIComponent(token || '')}`);
        const json = await res.json();
        if (!alive) return;
        if (json?.success && json.data) setData(json.data as ReportData);
        else setError(json?.error || 'Report not found');
      } catch {
        if (alive) setError('Could not load the report — check your connection and retry.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#64748b' }} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 380, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <AlertTriangle style={{ width: 32, height: 32, color: '#ef4444', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Report unavailable</p>
          <p style={{ fontSize: 13, color: '#64748b' }}>{error || 'This link may be invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  const { ticket } = data;
  const proven = data.assets.filter((a) => a.status === 'proven').length;
  const submissionByAsset = new Map(data.submissions.filter((s) => s.event_asset_id).map((s) => [s.event_asset_id as string, s]));

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', padding: '24px 12px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Toolbar — hidden in print */}
        <div className="print:hidden" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Printer style={{ width: 14, height: 14 }} /> Print / Save PDF
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Service Report</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>{data.business_name || 'Service Provider'}</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{ticket.ticket_number}</p>
                <p style={{ fontSize: 12, color: '#64748b' }}>Contract {data.contract_number || '—'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, fontSize: 13 }}>
              <div><span style={{ color: '#64748b' }}>Customer </span><strong style={{ color: '#0f172a' }}>{data.customer_name || '—'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Started </span><strong style={{ color: '#0f172a' }}>{fmtDateTime(ticket.started_at)}</strong></div>
              <div><span style={{ color: '#64748b' }}>Completed </span><strong style={{ color: '#0f172a' }}>{fmtDateTime(ticket.completed_at)}</strong></div>
              {ticket.assigned_to_name && (
                <div><span style={{ color: '#64748b' }}>Technician </span><strong style={{ color: '#0f172a' }}>{ticket.assigned_to_name}</strong></div>
              )}
              <div>
                <span style={{ color: '#64748b' }}>Status </span>
                <strong style={{ color: ticket.status === 'completed' ? '#059669' : '#b45309' }}>{labelize(ticket.status)}</strong>
              </div>
            </div>
          </div>

          {/* Visits */}
          <div style={{ padding: '20px 28px' }}>
            <h2 style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 10 }}>
              Services covered
            </h2>
            {data.events.map((e) => (
              <div key={e.event_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0', fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{e.block_name}</span>
                <span style={{ color: '#64748b' }}>{fmtDate(e.scheduled_date)} · {labelize(e.status || '')}</span>
              </div>
            ))}
          </div>

          {/* Assets + proof */}
          {data.assets.length > 0 && (
            <div style={{ padding: '4px 28px 20px' }}>
              <h2 style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 10 }}>
                Assets serviced — {proven}/{data.assets.length} proven
              </h2>
              {data.assets.map((a, i) => {
                const sub = a.form_submission_id ? submissionByAsset.get(a.form_submission_id) || data.submissions.find((s) => s.id === a.form_submission_id) : undefined;
                const Icon = a.status === 'proven' ? CheckCircle2 : a.status === 'blocked_placeholder' ? Lock : Circle;
                const color = a.status === 'proven' ? '#059669' : a.status === 'blocked_placeholder' ? '#b45309' : '#64748b';
                return (
                  <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0f172a' }}>
                        <Icon style={{ width: 14, height: 14, color }} />
                        {a.asset_name || 'Asset'}
                      </span>
                      <span style={{ color }}>
                        {labelize(a.status)}{a.proven_at ? ` · ${fmtDateTime(a.proven_at)}` : ''}
                      </span>
                    </div>
                    {sub && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                        <p style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <ClipboardList style={{ width: 12, height: 12 }} /> {sub.form_name}
                        </p>
                        <div style={{ marginTop: 4 }}>
                          {Object.entries(sub.responses || {}).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '2px 0' }}>
                              <span style={{ color: '#64748b', minWidth: 140 }}>{labelize(k)}</span>
                              <span style={{ color: '#0f172a', fontWeight: 500 }}>{v === '' || v === null || v === undefined ? '—' : labelize(String(v))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Evidence uploads */}
          {data.evidence.length > 0 && (
            <div style={{ padding: '4px 28px 20px' }}>
              <h2 style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 10 }}>
                Evidence
              </h2>
              {data.evidence.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0', fontSize: 13 }}>
                  <span style={{ color: '#0f172a' }}>{ev.label || ev.file_name || labelize(ev.evidence_type)}</span>
                  <span style={{ color: '#64748b' }}>{fmtDateTime(ev.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {(ticket.notes || ticket.completion_notes) && (
            <div style={{ padding: '4px 28px 24px' }}>
              <h2 style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Notes</h2>
              {ticket.notes && <p style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>{ticket.notes}</p>}
              {ticket.completion_notes && <p style={{ fontSize: 13, color: '#334155' }}>{ticket.completion_notes}</p>}
            </div>
          )}

          <div style={{ padding: '12px 28px', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8' }}>
            Generated by ContractNest · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceReportPage;

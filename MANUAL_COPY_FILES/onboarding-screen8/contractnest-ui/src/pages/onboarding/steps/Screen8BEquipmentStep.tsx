// src/pages/onboarding/steps/Screen8BEquipmentStep.tsx
// Screen 8B — Equipment Confirm (Buyer / Both)
// User confirms VaNi-seeded equipment placeholders and edits names to match actual site
// Mock data: Healthcare — 8 equipment types, facility hierarchy, compliance tags
// Navigation: /onboarding/done

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Color tokens ──────────────────────────────────────────────────────────────
const VANI = '#ff6b2b';
const TEXT = '#1a1816';
const TEXT_DIM = '#8a847a';
const TEXT_MUTED = '#bab4a8';
const BORDER = '#e5e1db';
const WHITE = '#ffffff';
const BG = '#f7f5f2';
const GREEN = '#16a34a';
const GREEN_BG = '#f0fdf4';
const GREEN_BORDER = '#bbf7d0';
const SURFACE = '#f0ece6';
const DARK_CARD = 'linear-gradient(145deg, #1a1816, #2a2520)';

// ── Mock data ─────────────────────────────────────────────────────────────────

interface EquipmentItem {
  id: string;
  name: string;
  meta: string;
  confirmed: boolean;
  editName: string;
}

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  { id: '1', name: 'MRI Scanner',      meta: '1.5T · Radiology dept',          confirmed: false, editName: '' },
  { id: '2', name: 'CT Scanner',       meta: '64-slice · Emergency wing',       confirmed: false, editName: '' },
  { id: '3', name: 'X-Ray Machine',    meta: 'Digital · OPD',                   confirmed: false, editName: '' },
  { id: '4', name: 'Ventilator',       meta: 'ICU grade · 8 units',             confirmed: false, editName: '' },
  { id: '5', name: 'Patient Monitor',  meta: 'Bedside · Ward A',                confirmed: false, editName: '' },
  { id: '6', name: 'Defibrillator',    meta: 'AED + manual · Emergency',        confirmed: false, editName: '' },
  { id: '7', name: 'Infusion Pump',    meta: 'Volumetric · Oncology',           confirmed: false, editName: '' },
  { id: '8', name: 'Autoclave',        meta: '134°C · CSSD',                    confirmed: false, editName: '' },
];

const FACILITY_HIERARCHY = [
  { level: 'L1', label: 'Campus' },
  { level: 'L2', label: 'Building' },
  { level: 'L3', label: 'Floor' },
  { level: 'L4', label: 'Ward' },
  { level: 'L5', label: 'Bed / Station' },
];

const COMPLIANCE_TAGS = [
  { label: 'NABH',      desc: 'National Accreditation Board' },
  { label: 'AERB',      desc: 'Atomic Energy Regulatory Board' },
  { label: 'IEC 60601', desc: 'Medical electrical safety' },
  { label: 'NABL',      desc: 'Lab accreditation' },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Screen8BEquipmentStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;

  const persona       = (routeState.persona       || 'buyer') as string;
  const companyName   = (routeState.companyName   || 'City General Hospital') as string;
  const industryNames = (routeState.industryNames  || ['Healthcare']) as string[];
  const industryLabel = industryNames[0] || 'your industry';

  const [items, setItems]         = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showAddRow, setShowAddRow]   = useState(false);

  const confirmedCount = items.filter(i => i.confirmed).length;
  const total          = items.length;
  const progressPct    = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;

  const toggleConfirm = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, confirmed: !item.confirmed } : item
    ));
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, editName: currentName } : item
    ));
  };

  const saveEdit = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, name: item.editName || item.name, editName: '' }
        : item
    ));
    setEditingId(null);
  };

  const handleEditNameChange = (id: string, val: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, editName: val } : item
    ));
  };

  const removeSelected = () => {
    setItems(prev => prev.filter(i => !i.confirmed));
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    const newItem: EquipmentItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      meta: 'New · not confirmed',
      confirmed: false,
      editName: '',
    };
    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setShowAddRow(false);
  };

  const handleConfirm = () => {
    navigate('/onboarding/done', {
      state: { ...routeState, equipmentConfirmed: true, confirmedCount },
    });
  };

  const handleSkip = () => {
    navigate('/onboarding/done', { state: routeState });
  };

  const handleBack = () => {
    const prevRoute = persona === 'both'
      ? '/onboarding/pricing-review'
      : '/onboarding/vani-working';
    navigate(prevRoute, { state: routeState });
  };

  const islandLabel = confirmedCount === 0
    ? 'Confirm your equipment list'
    : `${confirmedCount} of ${total} confirmed`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .eq-row:hover { background: ${SURFACE} !important; }
        .edit-btn:hover { border-color: ${VANI} !important; color: ${VANI} !important; background: #fff4ee !important; }
        .action-btn:hover { border-color: #6b7280 !important; color: ${TEXT} !important; background: ${SURFACE} !important; }
        .skip-link:hover { text-decoration: underline; }
      `}} />

      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 0,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '40px 24px 160px',
          alignItems: 'start',
        }}>

          {/* ── Left column ── */}
          <div>

            {/* VaNi bubble */}
            <div style={{
              display: 'flex', gap: 12, marginBottom: 28,
              animation: 'fadeIn .5s ease both',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, color: '#fff',
              }}>V</div>
              <div style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: '0 12px 12px 12px',
                padding: '12px 16px', fontSize: 14,
                color: TEXT, lineHeight: 1.55, flex: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,.05)',
              }}>
                I've created placeholders for common <strong>{industryLabel} equipment</strong>.
                Edit names to match what <strong>{companyName}</strong> actually has.
              </div>
            </div>

            {/* Equipment registry card */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,.06)',
              marginBottom: 14,
              animation: 'fadeIn .4s ease .1s both',
            }}>
              {/* Card header */}
              <div style={{
                padding: '14px 20px',
                background: SURFACE,
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Equipment Registry</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                  background: confirmedCount > 0 ? GREEN_BG : '#fff8f4',
                  color: confirmedCount > 0 ? GREEN : VANI,
                  border: `1px solid ${confirmedCount > 0 ? GREEN_BORDER : 'rgba(255,107,43,.2)'}`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: 'all .3s ease',
                }}>
                  {confirmedCount} of {total} confirmed
                </span>
              </div>

              {/* Equipment rows */}
              {items.map((item, idx) => {
                const isEditing = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="eq-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 1fr auto auto',
                      alignItems: 'center', gap: 14,
                      padding: '13px 20px',
                      borderBottom: `1px solid ${BORDER}`,
                      background: item.confirmed ? GREEN_BG : WHITE,
                      transition: 'background .2s ease',
                      animation: `rowIn .35s ease ${idx * 0.05}s both`,
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleConfirm(item.id)}
                      style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${item.confirmed ? GREEN : BORDER}`,
                        background: item.confirmed ? GREEN : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all .2s ease',
                      }}
                    >
                      {item.confirmed && (
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>✓</span>
                      )}
                    </div>

                    {/* Name + meta */}
                    <div>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={item.editName}
                            onChange={e => handleEditNameChange(item.id, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: `1.5px solid ${VANI}`, fontSize: 13,
                              fontFamily: "'Outfit', sans-serif",
                              fontWeight: 600, outline: 'none', flex: 1,
                            }}
                          />
                          <button
                            onClick={() => saveEdit(item.id)}
                            style={{
                              padding: '5px 12px', borderRadius: 6, border: 'none',
                              background: VANI, color: '#fff',
                              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >save</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 700, color: item.confirmed ? GREEN : TEXT, marginBottom: 2 }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: TEXT_MUTED }}>{item.meta}</div>
                        </>
                      )}
                    </div>

                    {/* Edit button */}
                    {!isEditing && (
                      <button
                        className="edit-btn"
                        onClick={() => startEdit(item.id, item.name)}
                        style={{
                          padding: '5px 12px', borderRadius: 6,
                          border: `1.5px solid ${BORDER}`, background: 'transparent',
                          fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
                          color: TEXT_DIM, cursor: 'pointer', transition: 'all .15s',
                        }}
                      >edit</button>
                    )}

                    {/* Status badge */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                      color: item.confirmed ? GREEN : TEXT_MUTED,
                      minWidth: 60, textAlign: 'right',
                    }}>
                      {item.confirmed ? 'confirmed' : 'pending'}
                    </span>
                  </div>
                );
              })}

              {/* Add new row */}
              {showAddRow && (
                <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    autoFocus
                    placeholder="Equipment name…"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addItem()}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 6,
                      border: `1.5px solid ${VANI}`, fontSize: 13,
                      fontFamily: "'Outfit', sans-serif", outline: 'none',
                    }}
                  />
                  <button onClick={addItem} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: VANI, color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
                  <button onClick={() => setShowAddRow(false)} style={{ padding: '8px 12px', borderRadius: 6, border: `1.5px solid ${BORDER}`, background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: TEXT_DIM, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}

              {/* Add / Remove row */}
              <div style={{ padding: '12px 20px', display: 'flex', gap: 10 }}>
                <button
                  className="action-btn"
                  onClick={() => setShowAddRow(true)}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    border: `1.5px solid rgba(255,107,43,.3)`,
                    background: '#fff8f4', color: VANI,
                    fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all .15s',
                  }}
                >+ Add equipment</button>
                <button
                  className="action-btn"
                  onClick={removeSelected}
                  disabled={confirmedCount === 0}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    border: `1.5px solid ${BORDER}`,
                    background: 'transparent', color: TEXT_DIM,
                    fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700,
                    cursor: confirmedCount > 0 ? 'pointer' : 'not-allowed',
                    opacity: confirmedCount > 0 ? 1 : 0.4,
                    transition: 'all .15s',
                  }}
                >− Remove confirmed</button>
              </div>
            </div>

            <div
              className="skip-link"
              onClick={handleSkip}
              style={{ fontSize: 13, color: TEXT_MUTED, cursor: 'pointer', display: 'inline-block' }}
            >
              Skip for now — I'll confirm equipment later
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>

            {/* Registry progress */}
            <div style={{
              background: DARK_CARD,
              border: '1px solid rgba(255,107,43,.12)',
              borderRadius: 14, padding: '20px 22px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)', marginBottom: 12 }}>
                Registry Progress
              </div>
              {[
                { k: 'Confirmed', v: String(confirmedCount), accent: confirmedCount > 0 },
                { k: 'Pending',   v: `${total - confirmedCount} remaining`, warn: confirmedCount < total },
                { k: 'Industry',  v: industryLabel, accent: true },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'IBM Plex Mono', monospace" }}>{row.k}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: row.accent ? VANI : row.warn ? '#fbbf24' : 'rgba(255,255,255,.65)' }}>{row.v}</span>
                </div>
              ))}
              {/* Progress bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 100, overflow: 'hidden', marginTop: 4 }}>
                <div style={{
                  height: '100%',
                  background: confirmedCount === total
                    ? `linear-gradient(90deg, ${GREEN}, #22c55e)`
                    : `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                  borderRadius: 100,
                  width: `${progressPct}%`,
                  transition: 'width .4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: confirmedCount === total ? '#22c55e' : VANI, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {progressPct}%
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  of {total} assets
                </span>
              </div>
            </div>

            {/* Facility hierarchy */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '16px 18px', marginBottom: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED, marginBottom: 12 }}>
                Facility Hierarchy
              </div>
              {FACILITY_HIERARCHY.map((h, i) => (
                <div key={h.level} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingBottom: 8, marginBottom: 8,
                  borderBottom: i < FACILITY_HIERARCHY.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: SURFACE, color: TEXT_MUTED,
                    fontFamily: "'IBM Plex Mono', monospace", minWidth: 24, textAlign: 'center',
                  }}>{h.level}</span>
                  <span style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>{h.label}</span>
                  {/* Tree connector */}
                  {i < FACILITY_HIERARCHY.length - 1 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: TEXT_MUTED }}>↓</span>
                  )}
                </div>
              ))}
            </div>

            {/* Compliance active */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED, marginBottom: 12 }}>
                Compliance Active
              </div>
              {COMPLIANCE_TAGS.map((c, i) => (
                <div key={c.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 8, marginBottom: 8,
                  borderBottom: i < COMPLIANCE_TAGS.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, fontFamily: "'IBM Plex Mono', monospace" }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: TEXT_MUTED }}>{c.desc}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                    background: GREEN_BG, color: GREEN, border: `1px solid ${GREEN_BORDER}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action island (fixed bottom) ── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(26,24,22,.94)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {islandLabel}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          onClick={handleBack}
          style={{
            padding: '10px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,.15)',
            background: 'transparent', color: 'rgba(255,255,255,.65)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >← Back</button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
            color: '#fff',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 3px 10px ${VANI}50`,
          }}
        >
          Confirm & continue →
        </button>
      </div>
    </>
  );
};

export default Screen8BEquipmentStep;

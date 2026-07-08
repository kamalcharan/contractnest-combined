// src/pages/onboarding/steps/LovSetupStep.tsx
// VaNi onboarding — LOV (List of Values) setup step.
// Sits between equipment-confirm and done. Shows the LOV categories that
// were seeded at tenant creation (Roles, Tags — see DEFAULT_LOV_SEED) and
// lets the user add their own values before finishing onboarding.
// Fully dynamic: renders whatever DEFAULT_LOV_SEED defines, values loaded
// live from master data. Skippable — defaults are already seeded.
// Navigation: /onboarding/done

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { generateIdempotencyKey } from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { useAuth } from '@/context/AuthContext';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import { DEFAULT_LOV_SEED, LOV_COLOR_PALETTE } from '@/utils/constants/lovDefaults';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LovValue {
  id: string;
  SubCatName: string;
  DisplayName: string;
  hexcolor: string | null;
  Sequence_no: number | null;
  is_deletable: boolean;
  is_active: boolean;
}

interface LovCategoryState {
  categoryId: string | null; // null = category missing (seed failed) — informational only
  values: LovValue[];
}

// ── Color tokens (VaNi onboarding palette) ────────────────────────────────────

const VANI       = '#ff6b2b';
const TEXT       = '#1a1816';
const TEXT_DIM   = '#8a847a';
const TEXT_MUTED = '#bab4a8';
const BORDER     = '#e5e1db';
const WHITE      = '#ffffff';
const BG         = '#f7f5f2';
const SURFACE    = '#faf9f7';

// ── Component ─────────────────────────────────────────────────────────────────

const LovSetupStep: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;
  const { currentTenant } = useAuth();

  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, LovCategoryState>>({});

  // Inline add form state — one category open at a time
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newValueName, setNewValueName]     = useState('');
  const [newValueColor, setNewValueColor]   = useState(LOV_COLOR_PALETTE[0]);
  const [addError, setAddError]             = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const savingRef = useRef(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadLovData = async () => {
    if (!currentTenant?.id) {
      setLoading(false);
      setLoadError('No workspace found. You can manage these later in Settings.');
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);

      const catResponse = await api.get(
        `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${currentTenant.id}`
      );
      const allCategories: any[] = catResponse.data || [];

      const next: Record<string, LovCategoryState> = {};
      for (const seed of DEFAULT_LOV_SEED) {
        const match = allCategories.find(
          (c) => (c.CategoryName || '').toLowerCase() === seed.category_name.toLowerCase()
        );
        if (!match) {
          next[seed.category_name] = { categoryId: null, values: [] };
          continue;
        }
        const detailsResponse = await api.get(
          `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${match.id}&tenantId=${currentTenant.id}`
        );
        next[seed.category_name] = {
          categoryId: match.id,
          values: (detailsResponse.data || []).filter((v: LovValue) => v.is_active !== false),
        };
      }
      setCategories(next);
    } catch (err: any) {
      setLoadError(err?.response?.data?.error || 'Failed to load your values. You can manage them later in Settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLovData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  // ── Add value ─────────────────────────────────────────────────────────────

  const openAddForm = (categoryName: string) => {
    setAddingCategory(categoryName);
    setNewValueName('');
    setNewValueColor(LOV_COLOR_PALETTE[0]);
    setAddError(null);
  };

  const closeAddForm = () => {
    setAddingCategory(null);
    setNewValueName('');
    setAddError(null);
  };

  const handleAddValue = async (categoryName: string) => {
    if (saving || savingRef.current) return;
    const state = categories[categoryName];
    if (!state?.categoryId || !currentTenant?.id) return;

    const trimmed = newValueName.trim();
    if (!trimmed) {
      setAddError('Please enter a name.');
      return;
    }
    if (state.values.some((v) => v.DisplayName.toLowerCase() === trimmed.toLowerCase())) {
      setAddError(`"${trimmed}" already exists.`);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setAddError(null);
    try {
      const maxSeq = state.values.reduce((m, v) => Math.max(m, v.Sequence_no || 0), 0);
      const response = await api.post(
        API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS,
        {
          SubCatName: trimmed,
          DisplayName: trimmed,
          hexcolor: newValueColor,
          Sequence_no: maxSeq + 1,
          Description: '',
          category_id: state.categoryId,
          tenantid: currentTenant.id,
          is_active: true,
          is_deletable: true,
          tags: null,
          tool_tip: null,
          icon_name: null,
        },
        {
          headers: {
            'x-tenant-id': currentTenant.id,
            'idempotency-key': generateIdempotencyKey(),
          },
        }
      );
      setCategories((prev) => ({
        ...prev,
        [categoryName]: {
          ...prev[categoryName],
          values: [...prev[categoryName].values, response.data],
        },
      }));
      closeAddForm();
    } catch (err: any) {
      setAddError(err?.response?.data?.error || 'Failed to add value. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleContinue = () => {
    const summary: Record<string, number> = {};
    for (const seed of DEFAULT_LOV_SEED) {
      summary[seed.category_name] = categories[seed.category_name]?.values.length || 0;
    }
    completeVaniStep('lov-setup', { value_counts: summary });
    navigate('/onboarding/done', { state: routeState });
  };

  const handleSkip = () => {
    completeVaniStep('lov-setup', { skipped: true });
    navigate('/onboarding/done', { state: routeState });
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: TEXT_DIM, fontSize: 14 }}>Loading your workspace values…</p>
          </div>
        </div>
      </>
    );
  }

  // ── Full UI ───────────────────────────────────────────────────────────────

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lov-add-btn:hover { border-color: ${VANI} !important; color: ${VANI} !important; background: #fff4ee !important; }
        .lov-skip:hover { text-decoration: underline; }
      `}} />

      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 160px' }}>

          {/* VaNi bubble */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, animation: 'fadeIn .5s ease both' }}>
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
              I've set up a few <strong>starter values</strong> for your workspace — team roles and contact tags.
              Add your own now, or skip and manage them anytime under <strong>Settings → Configure → List of Values</strong>.
            </div>
          </div>

          {loadError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
              {loadError}
            </div>
          )}

          {/* One card per seeded LOV category — rendered dynamically */}
          {DEFAULT_LOV_SEED.map((seed, idx) => {
            const state = categories[seed.category_name];
            const isAdding = addingCategory === seed.category_name;

            return (
              <div key={seed.category_name} style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,.06)',
                marginBottom: 16,
                animation: `fadeIn .4s ease ${idx * 0.1}s both`,
              }}>
                {/* Card header */}
                <div style={{
                  padding: '14px 20px',
                  background: SURFACE,
                  borderBottom: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{seed.display_name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                    background: '#fff4ee', color: VANI, border: '1px solid #ffd9c2',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {state?.values.length || 0} value{(state?.values.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  {/* Purpose copy — self-explanatory per category */}
                  <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.55, margin: '0 0 4px' }}>{seed.purpose}</p>
                  <p style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5, margin: '0 0 14px' }}>{seed.example}</p>

                  {state?.categoryId === null ? (
                    <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>
                      This list isn't ready yet — you'll find it under Settings → Configure → List of Values after onboarding.
                    </p>
                  ) : (
                    <>
                      {/* Value chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isAdding ? 14 : 0 }}>
                        {state?.values.map((v) => (
                          <span key={v.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '6px 12px', borderRadius: 100,
                            border: `1px solid ${BORDER}`, background: SURFACE,
                            fontSize: 13, fontWeight: 600, color: TEXT,
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.hexcolor || TEXT_MUTED, flexShrink: 0 }} />
                            {v.DisplayName}
                            {!v.is_deletable && (
                              <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 500 }}>default</span>
                            )}
                          </span>
                        ))}

                        {!isAdding && (
                          <button
                            className="lov-add-btn"
                            onClick={() => openAddForm(seed.category_name)}
                            disabled={saving}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
                              border: `1px dashed ${TEXT_MUTED}`, background: 'transparent',
                              fontSize: 13, fontWeight: 600, color: TEXT_DIM,
                              fontFamily: "'Outfit', sans-serif", transition: 'all .15s ease',
                            }}
                          >
                            + Add your own
                          </button>
                        )}
                      </div>

                      {/* Inline add form */}
                      {isAdding && (
                        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                            <input
                              autoFocus
                              value={newValueName}
                              onChange={(e) => { setNewValueName(e.target.value); setAddError(null); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddValue(seed.category_name); }}
                              placeholder={seed.category_name === 'Roles' ? 'e.g. President' : 'e.g. Founding Member'}
                              maxLength={40}
                              disabled={saving}
                              style={{
                                flex: 1, minWidth: 180, padding: '9px 12px', borderRadius: 8,
                                border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT,
                                fontFamily: "'Outfit', sans-serif", outline: 'none', background: WHITE,
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {LOV_COLOR_PALETTE.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setNewValueColor(c)}
                                  disabled={saving}
                                  aria-label={`Color ${c}`}
                                  style={{
                                    width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
                                    border: newValueColor === c ? `2px solid ${TEXT}` : '2px solid transparent',
                                    padding: 0,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          {addError && (
                            <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px' }}>{addError}</p>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleAddValue(seed.category_name)}
                              disabled={saving || !newValueName.trim()}
                              style={{
                                padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                                background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`, color: '#fff',
                                fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                                opacity: saving || !newValueName.trim() ? 0.6 : 1,
                                display: 'inline-flex', alignItems: 'center', gap: 7,
                              }}
                            >
                              {saving && (
                                <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                              )}
                              Add
                            </button>
                            <button
                              onClick={closeAddForm}
                              disabled={saving}
                              style={{
                                padding: '8px 18px', borderRadius: 100, cursor: 'pointer',
                                border: `1px solid ${BORDER}`, background: WHITE, color: TEXT_DIM,
                                fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
            <button
              className="lov-skip"
              onClick={handleSkip}
              style={{ background: 'none', border: 'none', color: TEXT_DIM, fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
            >
              Skip for now
            </button>
            <button
              onClick={handleContinue}
              style={{
                padding: '12px 32px', borderRadius: 100, border: 'none',
                background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`, color: '#fff',
                fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,107,43,.3)',
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LovSetupStep;

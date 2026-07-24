// src/pages/onboarding/steps/TermsConditionsStep.tsx
// VaNi onboarding — Terms & Conditions (between pricing-review and
// equipment-confirm / lov-setup).
//
// MVP business rule (founder decision):
//   - Every business has exactly ONE Terms & Conditions text block.
//   - It is auto-included in every contract and template (Contract Wizard
//     enforces this), rendered as the Terms section of the contract document.
//   - Further text-block creation is gated in Catalog Studio (singleton).
//
// This step seeds that block during onboarding: VaNi presents an editable
// boilerplate; saving creates (or updates) the tenant's singleton text block
// through the same catalog mutations Catalog Studio uses. Skippable — a
// tenant can author it later in Catalog Studio (lazy seeding).
//
// Navigation: pricing-review → THIS → both ? equipment-confirm : lov-setup

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { useCreateCatBlock, useUpdateCatBlock } from '@/hooks/mutations/useCatBlocksMutations';
import { catBlocksToBlocks, blockToCreateData, blockToUpdateData } from '@/utils/catalog-studio/catBlockAdapter';
import type { Block } from '@/types/catalogStudio';

// ── Color tokens (VaNi onboarding palette — same as Screen8A) ────────────────

const VANI        = '#ff6b2b';
const TEXT        = '#1a1816';
const TEXT_MID    = '#4a4540';
const TEXT_DIM    = '#8a847a';
const TEXT_MUTED  = '#bab4a8';
const BORDER      = '#e5e1db';
const BORDER_LT   = '#edeae4';
const WHITE       = '#ffffff';
const BG          = '#f7f5f2';
const SURFACE     = '#faf9f7';
const GREEN       = '#16a34a';
const GREEN_BG    = '#f0fdf4';
const GREEN_BORDER = '#bbf7d0';
const DARK_BG     = 'linear-gradient(145deg, #1a1816, #2a2520)';

const TNC_NAME = 'Terms & Conditions';
const TNC_MATCH = /terms\s*(&|and)\s*conditions/i;

// Platform LOV id for the "text" block type (m_category_details, cat_block_type
// = 'text') — same constants-not-resolution convention used by
// Screen8APricingStep.tsx and ktCatBlockMapperService.ts. block_type_id is a
// uuid column; nothing downstream resolves the friendly string 'text' into
// this UUID, so it must be sent as-is or block creation fails with
// "invalid input syntax for type uuid".
const BLOCK_TYPE_TEXT = 'db4bf715-dc1a-46f6-94a9-e64429137d3f';

// Editable starting point — deliberately generic service-agreement language.
// The tenant owns every word; this only saves what they confirm.
const BOILERPLATE = `
<p><strong>1. Scope of Services.</strong> The Provider shall perform the services described in the contract schedules with reasonable skill and care, during the agreed term and at the agreed locations.</p>
<p><strong>2. Payment.</strong> The Customer shall pay the amounts set out in the payment schedule by their due dates. Amounts unpaid beyond the grace period may attract suspension of services until settled.</p>
<p><strong>3. Access &amp; Cooperation.</strong> The Customer shall provide safe and timely access to sites, equipment and information reasonably required to deliver the services. Visits missed due to denied access may be counted as delivered.</p>
<p><strong>4. Exclusions.</strong> Consumables, spare parts and repairs arising from misuse, unauthorised modification or force majeure are excluded unless expressly included in the schedules.</p>
<p><strong>5. Term &amp; Termination.</strong> This agreement runs for the term stated on its face. Either party may terminate for material breach not cured within 15 days of written notice. Amounts due for services already rendered survive termination.</p>
<p><strong>6. Liability.</strong> Neither party is liable for indirect or consequential loss. The Provider's aggregate liability is limited to the fees paid under this agreement in the preceding 12 months.</p>
<p><strong>7. Governing Terms.</strong> Any change to this agreement is valid only when recorded in writing and accepted by both parties.</p>
`.trim();

const TermsConditionsStep: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;
  const persona    = (routeState.persona || 'seller') as string;

  const createBlockMutation = useCreateCatBlock();
  const updateBlockMutation = useUpdateCatBlock();

  // ── Load the tenant's existing T&C block (reused tenants / re-runs) ────────
  const [loading, setLoading]         = useState(true);
  const [existing, setExisting]       = useState<Block | null>(null);
  const [content, setContent]         = useState<string>(BOILERPLATE);
  const [saveError, setSaveError]     = useState<string | null>(null);

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const resp = await api.get('/api/catalog-studio/blocks', { params: { limit: 500 } });
        const raw = resp.data?.data?.blocks || resp.data?.blocks || [];
        const blocks = catBlocksToBlocks(raw);
        const tnc =
          blocks.find((b) => b.categoryId === 'text' && TNC_MATCH.test(b.name || '')) ||
          blocks.find((b) => b.categoryId === 'text');
        if (tnc) {
          setExisting(tnc);
          const existingHtml =
            ((tnc.meta as any)?.content as string) || tnc.description || '';
          if (existingHtml.trim()) setContent(existingHtml);
        }
      } catch {
        // Block list unavailable — proceed as a fresh create; the save call
        // surfaces any real error.
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, []);

  // ── Save: create or update the singleton text block ────────────────────────
  const saving = createBlockMutation.isPending || updateBlockMutation.isPending;

  const handleConfirm = async () => {
    if (!content.trim()) {
      setSaveError('Terms & Conditions cannot be empty — or skip for now.');
      return;
    }
    setSaveError(null);
    try {
      // Content is written to BOTH homes it can live in: description (the
      // wizard ContentStep convention) and config.content (via meta.content),
      // so every reader — contract document, studio editor — finds it.
      if (existing) {
        await updateBlockMutation.mutateAsync({
          id: existing.id,
          data: blockToUpdateData({
            name: existing.name || TNC_NAME,
            categoryId: BLOCK_TYPE_TEXT,
            icon: existing.icon || 'FileText',
            description: content,
            meta: { content, contentType: 'rich' },
          }),
        });
      } else {
        await createBlockMutation.mutateAsync(
          blockToCreateData({
            name: TNC_NAME,
            categoryId: BLOCK_TYPE_TEXT,
            icon: 'FileText',
            description: content,
            meta: { content, contentType: 'rich' },
          }) as any
        );
      }
      completeVaniStep('terms-conditions', {
        accepted: true,
        mode: existing ? 'updated' : 'created',
        length: content.length,
      });
      const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/lov-setup';
      navigate(dest, { state: { ...routeState, termsSaved: true } });
    } catch (err: any) {
      // Mutation hooks already toast the failure; keep the inline note so the
      // user isn't stranded if the toast is missed.
      setSaveError(err?.response?.data?.error?.message || err?.message || 'Failed to save. Please try again.');
    }
  };

  const handleSkip = () => {
    completeVaniStep('terms-conditions', { accepted: false, skipped: true });
    const dest = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/lov-setup';
    navigate(dest, { state: routeState });
  };

  const handleBack = () => navigate('/onboarding/pricing-review', { state: routeState });

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: TEXT_DIM, fontSize: 14 }}>Checking your existing terms…</p>
        </div>
      </div>
    );
  }

  const islandLabel = saving
    ? 'Saving your terms…'
    : existing
    ? 'Updating your existing Terms & Conditions'
    : 'One T&C for your business — attached to every contract';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tnc-skip:hover { color: ${TEXT_DIM} !important; }
      `}} />

      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          maxWidth: 1100, margin: '0 auto',
          padding: '40px 24px 160px',
          alignItems: 'start',
        }}>

          {/* ── LEFT COLUMN ── */}
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1) both' }}>
              <VaniAvatar />
              <VaniMsg>
                {existing ? (
                  <>I found your existing <strong>Terms &amp; Conditions</strong> — review and adjust it below. It rides on <strong>every contract you send</strong>, so make it yours.</>
                ) : (
                  <>These <strong>Terms &amp; Conditions</strong> will attach to <strong>every contract you send</strong> — I've drafted a starting point from standard service-agreement language. Edit anything; you can refine it anytime in Catalog Studio.</>
                )}
              </VaniMsg>
            </div>

            {saveError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13,
              }}>
                {saveError}
              </div>
            )}

            {/* Editor card */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
              animation: 'fadeUp .4s ease .08s both',
            }}>
              <div style={{
                padding: '14px 20px', background: SURFACE,
                borderBottom: `1px solid ${BORDER_LT}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, color: TEXT }}>
                  {existing?.name || TNC_NAME}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                  background: GREEN_BG, color: GREEN, border: `1px solid ${GREEN_BORDER}`,
                  fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap',
                }}>
                  {existing ? 'EXISTING' : 'BOILERPLATE'}
                </span>
              </div>
              <div style={{ padding: 20 }}>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Enter the terms and conditions that govern your contracts…"
                  maxLength={10000}
                  showCharCount={true}
                  allowFullscreen={true}
                  toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
                  minHeight={340}
                  maxHeight={520}
                />
              </div>
            </div>

            <div className="tnc-skip" onClick={handleSkip} style={{ fontSize: 12, color: TEXT_MUTED, textDecoration: 'underline', cursor: 'pointer', textAlign: 'center' as const, display: 'block', marginTop: 14 }}>
              Skip for now — I'll write my terms later in Catalog Studio
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>
            <div style={{ background: DARK_BG, border: '1px solid rgba(255,107,43,.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,.3)' }}>
                  How this is used
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  'Attached automatically to every contract and template',
                  'Rendered as the Terms section of the contract document',
                  'One T&C per business — edit it anytime in Catalog Studio',
                  'Buyers see it before they accept a contract',
                ].map((line, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                    <span style={{ color: VANI, fontSize: 11, lineHeight: 1.6 }}>▸</span>
                    <span style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,.55)' }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace", color: TEXT_MUTED, marginBottom: 8 }}>
                Good to know
              </div>
              <p style={{ fontSize: 11.5, lineHeight: 1.65, color: TEXT_MID, margin: 0 }}>
                This is standard boilerplate, not legal advice — have your counsel
                review it for your jurisdiction and industry before you rely on it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION ISLAND ── */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(26,24,22,.94)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {islandLabel}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button onClick={handleBack} style={{ padding: '10px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: !saving ? `linear-gradient(135deg, ${VANI}, #ff8f5a)` : 'rgba(255,255,255,.1)',
            color: !saving ? '#fff' : 'rgba(255,255,255,.35)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: !saving ? 'pointer' : 'not-allowed',
            boxShadow: !saving ? '0 3px 10px rgba(255,107,43,.5)' : 'none',
            transition: 'all .3s ease',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {saving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
          {saving ? 'Saving…' : existing ? 'Save my terms →' : 'Use these terms →'}
        </button>
      </div>
    </>
  );
};

// ── Shared sub-components (VaNi onboarding idiom) ─────────────────────────────

const VaniAvatar: React.FC = () => (
  <div style={{
    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
    background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 14, color: '#fff',
    boxShadow: '0 3px 8px rgba(255,107,43,.25)', marginTop: 2,
  }}>V</div>
);

const VaniMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    background: WHITE, border: `1px solid ${BORDER}`,
    borderRadius: '3px 14px 14px 14px',
    padding: '14px 18px',
    boxShadow: '0 2px 12px rgba(0,0,0,.05)',
    fontSize: 14, color: TEXT_MID, lineHeight: 1.6,
  }}>
    {children}
  </div>
);

export default TermsConditionsStep;

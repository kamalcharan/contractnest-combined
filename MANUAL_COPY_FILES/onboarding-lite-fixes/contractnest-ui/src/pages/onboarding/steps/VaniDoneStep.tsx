// src/pages/onboarding/steps/VaniDoneStep.tsx
// Screen 9 — VaNi Done (standalone full page, outside OnboardingLayout)
//
// Reads state from navigate('/onboarding/done', { state: { … } })
// Renders per-persona card:
//   9A — seller: summary + VaNi signoff + "Try test mode →" + ETL entry
//   9B — buyer:  summary + workspace code + VaNi signoff + "Try test mode →" + CNAK button
//   9C — both:   tabbed provider/asset-owner view + "Go to dashboard →"
//
// LIGHT PALETTE, deliberately. This screen used to be the one dark room in an
// otherwise light journey — express paper (#f7f5f2) → VaNi-orange working
// screens (light) → a near-black gradient here → light /start/contract. The
// tokens below are the same VaNi paper set every neighbouring screen uses
// (see express.css: lifted verbatim from the vani-working / pricing / terms /
// lov screens), so the flow reads as one product end to end.
//
// COMPLETION IS PERSISTED HERE (S13 fix). This is the only screen every
// persona passes through at the end of the setup work: buyers leave
// onboarding from this screen (→ vendor wizard) and never reach PlanStep,
// which was the sole writer of the terminal 'done' step — so buyers could
// NEVER be marked complete, and sellers depended on a fire-and-forget write
// a hard navigation cancelled. Arriving here means the workspace is built,
// so this screen flips is_completed itself; the contract rehearsal and plan
// screens after it are extras, not prerequisites.

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { completeVaniStep, markOnboardingComplete } from '@/utils/onboarding/completeVaniStep';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoneState {
  persona: 'seller' | 'buyer' | 'both';
  catalogBlocksSeeded: number;
  facilityNodesSeeded: number;
  sampleContactsSeeded: number;
  companyName: string;
  industryNames: string[];
}

// ── Styles ────────────────────────────────────────────────────────────────────
// The VaNi paper tokens — same values as express.css and the working/pricing/
// terms/lov screens, so this screen matches its neighbours.

const VANI = '#ff6b2b';
const GREEN = '#16a34a';
const WHITE = '#ffffff';
const PAPER = '#f7f5f2';      // page background
const CARD = '#ffffff';       // card surface
const SURFACE = '#faf9f7';    // inset panels
const INK = '#1a1816';        // primary text
const SOFT = '#8a847a';       // secondary text
const FAINT = '#bab4a8';      // tertiary text / mono captions
const LINE = '#f0ece6';       // hairlines inside panels
const EDGE = '#e5e1db';       // panel borders
const WASH = '#fff3ed';       // orange wash

const css = `
  @keyframes successPop {
    from { transform: scale(.4); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
  @keyframes cardRise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes itemIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;

// ── Sub-components ────────────────────────────────────────────────────────────

const DoneItem: React.FC<{
  name: string;
  val: string;
  delay?: number;
  warn?: boolean;
}> = ({ name, val, delay = 0, warn = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px 18px',
    borderBottom: `1px solid ${LINE}`,
    animation: `itemIn .4s ease ${delay}s both`,
  }}>
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: warn ? '#d97706' : GREEN,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, color: WHITE,
    }}>
      {warn ? '!' : '✓'}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{name}</div>
      <div style={{ fontSize: 11, color: SOFT, marginTop: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
        {val}
      </div>
    </div>
  </div>
);

const VaniSignoff: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: WASH, border: `1px solid rgba(255,107,43,.2)`,
    borderRadius: 8, padding: '14px 16px', marginBottom: 24, textAlign: 'left',
  }}>
    <div style={{
      width: 30, height: 30, flexShrink: 0,
      background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
      borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: 12, color: WHITE,
    }}>
      V
    </div>
    <div style={{ fontSize: 13, color: SOFT, lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: message }}
    />
  </div>
);

const CtaButton: React.FC<{
  label: string;
  primary?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}> = ({ label, primary = false, onClick, style }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '15px 24px',
      borderRadius: 8, border: primary ? 'none' : `1.5px solid ${EDGE}`,
      fontFamily: "'Outfit', sans-serif", fontSize: primary ? 15 : 13,
      fontWeight: primary ? 800 : 600,
      background: primary ? `linear-gradient(135deg, ${VANI}, #ff8f5a)` : 'transparent',
      color: primary ? WHITE : SOFT,
      boxShadow: primary ? '0 6px 20px rgba(255,107,43,.3)' : 'none',
      cursor: 'pointer', transition: 'all .25s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      marginBottom: 12,
      ...style,
    }}
    onMouseEnter={e => {
      if (primary) {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(255,107,43,.4)';
      } else {
        (e.currentTarget as HTMLButtonElement).style.borderColor = FAINT;
        (e.currentTarget as HTMLButtonElement).style.color = INK;
        (e.currentTarget as HTMLButtonElement).style.background = SURFACE;
      }
    }}
    onMouseLeave={e => {
      if (primary) {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255,107,43,.3)';
      } else {
        (e.currentTarget as HTMLButtonElement).style.borderColor = EDGE;
        (e.currentTarget as HTMLButtonElement).style.color = SOFT;
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }
    }}
  >
    {label}
  </button>
);

const ETLEntry: React.FC<{ label: string; sub: string }> = ({ label, sub }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px',
    background: SURFACE,
    border: `1.5px dashed ${EDGE}`,
    borderRadius: 8, cursor: 'pointer', transition: 'all .2s',
    textAlign: 'left',
  }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = FAINT;
      (e.currentTarget as HTMLDivElement).style.background = WHITE;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = EDGE;
      (e.currentTarget as HTMLDivElement).style.background = SURFACE;
    }}
  >
    <div style={{ fontSize: 20, flexShrink: 0, color: SOFT }}>↑</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: SOFT, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: FAINT }}>{sub}</div>
    </div>
    <div style={{
      fontSize: 9, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
      padding: '2px 6px', borderRadius: 3,
      background: LINE, color: FAINT,
      letterSpacing: 0.4, flexShrink: 0,
    }}>
      V2
    </div>
  </div>
);

// ── Screen 9A — Seller ────────────────────────────────────────────────────────

const Screen9A: React.FC<{ state: DoneState; onDashboard: () => void }> = ({ state, onDashboard }) => (
  <div style={{ position: 'relative', zIndex: 10 }}>
    <div style={{ width: 80, height: 80, background: `linear-gradient(135deg, ${GREEN}, #22c55e)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: WHITE, margin: '0 auto 32px', boxShadow: '0 12px 32px rgba(22,163,74,.25)', animation: 'successPop .6s cubic-bezier(.34,1.56,.64,1) both' }}>✓</div>
    <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: INK, marginBottom: 6 }}>You're ready.</div>
    <div style={{ fontSize: 14, color: SOFT, marginBottom: 32, lineHeight: 1.6 }}>
      {state.companyName} is fully set up on ContractNest.
    </div>

    <div style={{ background: SURFACE, border: `1px solid ${EDGE}`, borderRadius: 8, padding: '6px 0', marginBottom: 28, textAlign: 'left' }}>
      <DoneItem name="Service catalog" val={`${state.catalogBlocksSeeded} blocks · ${state.industryNames.join(', ')}`} delay={0.1} />
      <DoneItem name="Pricing" val="Pending — set your prices on the next screen" delay={0.2} warn />
      <DoneItem name="Sample contacts" val={`${state.sampleContactsSeeded || 5} ready · test mode`} delay={0.3} />
      <DoneItem name="Compliance" val="Industry defaults applied · Active" delay={0.4} />
    </div>

    <VaniSignoff message="Try it in test mode — <strong>5 sample clients</strong> are ready to go. Switch to live anytime from the header." />

    <CtaButton label="Create your first contract →" primary onClick={onDashboard} />
    <div style={{ fontSize: 11, color: FAINT, textAlign: 'center', marginTop: -6, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
      5 sample clients ready · switch to live anytime from the header
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0', color: FAINT, fontSize: 11, fontWeight: 600 }}>
      <div style={{ flex: 1, height: 1, background: LINE }} />
      already have existing data?
      <div style={{ flex: 1, height: 1, background: LINE }} />
    </div>

    <ETLEntry label="Upload rate card or client list" sub="Excel, CSV or PDF · VaNi will map it automatically" />
  </div>
);

// ── Screen 9B — Buyer ─────────────────────────────────────────────────────────

const Screen9B: React.FC<{ state: DoneState; onDashboard: () => void; onClaim: () => void }> = ({ state, onDashboard, onClaim }) => {
  const workspaceCode = `CN-${(state.companyName || 'COMP').slice(0, 4).toUpperCase().replace(/\s/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(workspaceCode).catch(() => {});
  };

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ width: 80, height: 80, background: `linear-gradient(135deg, ${GREEN}, #22c55e)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: WHITE, margin: '0 auto 32px', boxShadow: '0 12px 32px rgba(22,163,74,.25)', animation: 'successPop .6s cubic-bezier(.34,1.56,.64,1) both' }}>✓</div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: INK, marginBottom: 6 }}>You're ready.</div>
      <div style={{ fontSize: 14, color: SOFT, marginBottom: 32, lineHeight: 1.6 }}>
        {state.companyName} is set up and ready to receive contracts.
      </div>

      <div style={{ background: SURFACE, border: `1px solid ${EDGE}`, borderRadius: 8, padding: '6px 0', marginBottom: 28, textAlign: 'left' }}>
        <DoneItem name="Equipment registry" val={`${state.facilityNodesSeeded || 0} assets confirmed · ${state.industryNames.join(', ')}`} delay={0.1} />
        <DoneItem name="Facility hierarchy" val="Campus → Building → Floor → Unit" delay={0.2} />
        <DoneItem name="Compliance standards" val="Industry defaults applied · Active" delay={0.3} />
      </div>

      <div style={{ background: SURFACE, border: `1px solid ${EDGE}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16, textAlign: 'left' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: FAINT, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>Your workspace code</div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace", color: INK, letterSpacing: 2, marginBottom: 12 }}>{workspaceCode}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const msg = `Join me on ContractNest! My workspace code is ${workspaceCode}`;
              const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
              window.open(url, '_blank');
            }}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid rgba(255,107,43,.25)', background: WASH, fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, color: VANI, cursor: 'pointer', transition: 'all .15s' }}
          >
            Share via WhatsApp
          </button>
          <button onClick={handleCopy} style={{ padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${EDGE}`, background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, color: SOFT, cursor: 'pointer', transition: 'all .15s' }}>
            Copy code
          </button>
        </div>
      </div>

      <VaniSignoff message="5 sample vendors are ready in test mode. Try receiving a contract — <strong>no real vendor needed</strong>." />

      <CtaButton label="Send your first request →" primary onClick={onDashboard} />
      <div style={{ fontSize: 11, color: FAINT, textAlign: 'center', marginTop: -6, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
        ask one or more vendors to quote · 5 sample vendor contacts ready
      </div>

      <CtaButton label="I have a contract code (CNAK) →" onClick={onClaim} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0', color: FAINT, fontSize: 11, fontWeight: 600 }}>
        <div style={{ flex: 1, height: 1, background: LINE }} />
        already have existing assets?
        <div style={{ flex: 1, height: 1, background: LINE }} />
      </div>

      <ETLEntry label="Upload equipment register" sub="Excel or CSV · VaNi will match to registry automatically" />
    </div>
  );
};

// ── Screen 9C — Both ──────────────────────────────────────────────────────────

const Screen9C: React.FC<{ state: DoneState; onDashboard: () => void }> = ({ state, onDashboard }) => {
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ width: 80, height: 80, background: `linear-gradient(135deg, ${GREEN}, #22c55e)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: WHITE, margin: '0 auto 32px', boxShadow: '0 12px 32px rgba(22,163,74,.25)', animation: 'successPop .6s cubic-bezier(.34,1.56,.64,1) both' }}>✓</div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: INK, marginBottom: 6 }}>Fully set up.</div>
      <div style={{ fontSize: 14, color: SOFT, marginBottom: 32, lineHeight: 1.6 }}>
        {state.companyName} is ready on both sides of ContractNest.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: SURFACE, border: `1px solid ${EDGE}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {(['seller', 'buyer'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px 16px',
              fontSize: 12, fontWeight: 700,
              background: activeTab === tab ? WASH : 'transparent',
              color: activeTab === tab ? VANI : SOFT,
              border: 'none', borderRight: tab === 'seller' ? `1px solid ${LINE}` : 'none',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              transition: 'all .2s',
            }}
          >
            {tab === 'seller' ? '📤 As Provider' : '📥 As Asset Owner'}
          </button>
        ))}
      </div>

      {/* Seller tab */}
      {activeTab === 'seller' && (
        <div style={{ background: SURFACE, border: `1px solid ${EDGE}`, borderRadius: 8, padding: '6px 0', marginBottom: 28, textAlign: 'left' }}>
          <DoneItem name="Service catalog" val={`${state.catalogBlocksSeeded} blocks · ${state.industryNames.join(', ')}`} delay={0.1} />
          <DoneItem name="Contract templates" val="Industry packages ready" delay={0.2} />
          <DoneItem name="Pricing" val="Pending — set your prices on the next screen" delay={0.3} warn />
        </div>
      )}

      {/* Buyer tab */}
      {activeTab === 'buyer' && (
        <div style={{ background: SURFACE, border: `1px solid ${EDGE}`, borderRadius: 8, padding: '6px 0', marginBottom: 28, textAlign: 'left' }}>
          <DoneItem name="Equipment registry" val={`${state.facilityNodesSeeded || 0} assets · ${state.industryNames.join(', ')}`} delay={0.1} />
          <DoneItem name="Facility hierarchy" val="Campus → Building → Floor → Unit" delay={0.2} />
          <DoneItem name="Compliance standards" val="Industry defaults applied · Active" delay={0.3} />
        </div>
      )}

      <VaniSignoff message={`${state.companyName} is live on both sides. Use the <strong>Revenue</strong> view to send contracts, <strong>Expense</strong> view to receive them.`} />

      <CtaButton label="Create your first contract →" primary onClick={onDashboard} />
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const VaniDoneStep: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as DoneState) || {
    persona: 'seller' as const,
    catalogBlocksSeeded: 0,
    facilityNodesSeeded: 0,
    sampleContactsSeeded: 0,
    companyName: 'Your company',
    industryNames: [],
  };

  const { persona } = state;
  const cardWidth = persona === 'both' ? 580 : 540;

  // S13 completion fix — persist BOTH the terminal 'done' step and the
  // explicit is_completed flip the moment this screen mounts. Reaching this
  // screen means the workspace is built; the rehearsal contract and plan
  // screens after it are optional extras. This is the only spot all three
  // personas share: a buyer's CTA leaves onboarding entirely (vendor wizard),
  // so PlanStep's write never happens for them. Both calls are idempotent
  // (edge upserts the step; /complete is an unconditional update), so
  // arriving here twice — or PlanStep re-writing 'done' later with the
  // selected plan — is harmless. Guarded against StrictMode double-mount.
  const completionFired = useRef(false);
  useEffect(() => {
    if (completionFired.current) return;
    completionFired.current = true;
    completeVaniStep('done', {
      persona,
      catalog_blocks_seeded: state.catalogBlocksSeeded,
      registry_assets_seeded: state.facilityNodesSeeded,
      sample_contacts_seeded: state.sampleContactsSeeded,
    });
    markOnboardingComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onboarding no longer ends here. A tenant arriving on this screen has a
  // furnished catalog and sample contacts but nothing they have DONE — landing
  // them on a dashboard hands over a to-do list. The last step is a real
  // contract, created in test, then the plan screen, then the product.
  // Revert = navigate('/dashboard').
  //
  // BUT NOT FOR A PURE BUYER. /start/contract authors a contract from the
  // tenant's own catalog, and a buyer has no catalog to author from — in this
  // product the VENDOR issues the contract. A buyer's first act is a request
  // for quotation, so they go to the vendor-side wizard, whose first step
  // offers exactly that choice. 'both' keeps the seller path: they can author,
  // and the catalog they just built is the thing worth rehearsing with.
  const handleDashboard = () => {
    navigate(persona === 'buyer' ? '/contracts/create/vendor' : '/start/contract');
  };

  // Screen9B's CNAK button shipped with an empty onClick while the page it
  // needs has been routed at App.tsx all along.
  const handleClaim = () => {
    navigate('/contracts/claim');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Full-page light paper background — matches the express screens */}
      <div style={{
        minHeight: '100vh',
        background: PAPER,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Outfit', sans-serif",
        padding: '40px 16px',
      }}>

        {/* Background glow — soft, on paper */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 50% 40% at 50% 60%, rgba(22,163,74,.05) 0%, transparent 70%),
            radial-gradient(ellipse 30% 30% at 20% 30%, rgba(255,107,43,.05) 0%, transparent 60%)
          `,
        }} />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 10,
          background: CARD,
          border: `1px solid ${EDGE}`,
          borderRadius: 22,
          padding: '48px 52px',
          width: cardWidth, maxWidth: '100%',
          boxShadow: '0 1px 2px rgba(26,24,22,.04), 0 24px 60px rgba(26,24,22,.1)',
          animation: 'cardRise .6s cubic-bezier(.22,1,.36,1) .2s both',
          textAlign: 'center',
        }}>
          {persona === 'seller' && <Screen9A state={state} onDashboard={handleDashboard} />}
          {persona === 'buyer' && <Screen9B state={state} onDashboard={handleDashboard} onClaim={handleClaim} />}
          {persona === 'both' && <Screen9C state={state} onDashboard={handleDashboard} />}
        </div>
      </div>
    </>
  );
};

export default VaniDoneStep;

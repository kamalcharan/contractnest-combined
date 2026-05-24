// src/pages/onboarding/steps/VaniWorkingStep.tsx
// Screen 8 — VaNi Working.
// Full-screen overlay. Auto-starts on mount — no user interaction needed.
// Runs 3 sequential steps:
//   1. POST /api/storage/setup
//   2. POST /api/sequences/seed
//   3. POST /api/onboarding/complete  + markOnboardingComplete() + refreshData()
// On success: auto-navigates to /onboarding/branding after 1.5 s.
// On error: shows retry button for the failed step.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

type StepStatus = 'idle' | 'running' | 'done' | 'error';

interface WorkStep {
  id: string;
  label: string;
  sublabel: string;
}

const WORK_STEPS: WorkStep[] = [
  {
    id: 'storage',
    label: 'Setting up cloud storage',
    sublabel: 'Provisioning your secure document and file storage',
  },
  {
    id: 'sequences',
    label: 'Configuring sequence numbers',
    sublabel: 'Seeding contract, invoice, and job number formats',
  },
  {
    id: 'complete',
    label: 'Finalising your workspace',
    sublabel: 'Locking in your settings and marking setup complete',
  },
];

const VaniWorkingStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { markOnboardingComplete, refreshData } = useAuth();
  const colors = currentTheme.colors;

  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({
    storage: 'idle',
    sequences: 'idle',
    complete: 'idle',
  });
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [allDone, setAllDone] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    setTheme('vani');
  }, []);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      runAll();
    }
  }, []);

  const setStatus = (id: string, status: StepStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const setError = (id: string, msg: string) => {
    setErrorMessages(prev => ({ ...prev, [id]: msg }));
  };

  const runAll = async () => {
    // Reset any prior error state
    setErrorMessages({});
    setStatuses({ storage: 'idle', sequences: 'idle', complete: 'idle' });

    // ── Step 1: Storage setup ──
    setStatus('storage', 'running');
    try {
      await api.post(API_ENDPOINTS.STORAGE.SETUP);
      setStatus('storage', 'done');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Storage setup failed';
      // 409 = already set up — treat as success
      if (err?.response?.status === 409) {
        setStatus('storage', 'done');
      } else {
        setStatus('storage', 'error');
        setError('storage', msg);
        return; // halt — user must retry
      }
    }

    // ── Step 2: Sequence numbers seed ──
    setStatus('sequences', 'running');
    try {
      await api.post(API_ENDPOINTS.SEQUENCES.SEED);
      setStatus('sequences', 'done');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Sequence setup failed';
      // 409 = already seeded — treat as success
      if (err?.response?.status === 409) {
        setStatus('sequences', 'done');
      } else {
        setStatus('sequences', 'error');
        setError('sequences', msg);
        return;
      }
    }

    // ── Step 3: Mark onboarding complete ──
    setStatus('complete', 'running');
    try {
      await api.post(API_ENDPOINTS.ONBOARDING.COMPLETE);
      markOnboardingComplete();
      if (refreshData) await refreshData();
      setStatus('complete', 'done');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Finalisation failed';
      if (err?.response?.status === 409) {
        // Already complete — still mark locally and continue
        markOnboardingComplete();
        if (refreshData) await refreshData();
        setStatus('complete', 'done');
      } else {
        setStatus('complete', 'error');
        setError('complete', msg);
        return;
      }
    }

    // All done — navigate to branding after short pause
    setAllDone(true);
    setTimeout(() => navigate('/onboarding/branding'), 1600);
  };

  const handleRetry = () => {
    hasStarted.current = false;
    runAll();
    hasStarted.current = true;
  };

  const hasError = Object.values(statuses).some(s => s === 'error');
  const doneCount = Object.values(statuses).filter(s => s === 'done').length;

  // Inline keyframes
  const animStyles = `
    @keyframes orbPulse { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.08);opacity:1} }
    @keyframes orbMorph {
      0%   {border-radius:38% 62% 63% 37%/41% 44% 56% 59%}
      25%  {border-radius:55% 45% 38% 62%/55% 38% 62% 45%}
      50%  {border-radius:63% 37% 50% 50%/30% 60% 40% 70%}
      75%  {border-radius:45% 55% 62% 38%/62% 44% 56% 38%}
      100% {border-radius:38% 62% 44% 56%/50% 55% 45% 50%}
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes stepIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes completePop { 0%{transform:scale(.6);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animStyles }} />

      {/* Full-screen dark stage */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: colors.accent.accent1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif",
          overflow: 'hidden',
          zIndex: 9999,
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${colors.brand.primary}14 0%, transparent 70%)`,
          }}
        />

        {/* Badge — Step 8 of 9 */}
        <div
          style={{
            position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px',
            background: `${colors.brand.primary}1a`,
            border: `1px solid ${colors.brand.primary}33`,
            borderRadius: 100,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1, color: colors.brand.primary,
            fontFamily: "'IBM Plex Mono', monospace",
            animation: 'fadeUp .6s ease both',
          }}
        >
          Step 8 of 9 · VaNi Working
        </div>

        {/* VaNi orb (background decoration) */}
        <div
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -60%)',
            width: 400, height: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 220, height: 220, borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.brand.primary}10 0%, transparent 70%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'orbPulse 4s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: 80, height: 80,
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
                borderRadius: '38% 62% 63% 37%/41% 44% 56% 59%',
                filter: 'blur(1px)',
                boxShadow: `0 0 50px ${colors.brand.primary}50, 0 0 100px ${colors.brand.primary}20`,
                animation: 'orbMorph 8s ease-in-out infinite alternate',
              }}
            />
          </div>
        </div>

        {/* Main content card */}
        <div
          style={{
            position: 'relative', zIndex: 10,
            background: `${colors.accent.accent1}d9`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${colors.brand.primary}26`,
            borderRadius: 22,
            padding: '40px 48px',
            width: '100%',
            maxWidth: 460,
            margin: '0 16px',
            boxShadow: '0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04)',
            animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) .2s both',
          }}
        >
          {/* Heading */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 36,
            }}
          >
            {allDone ? (
              <div style={{ animation: 'completePop .5s cubic-bezier(.34,1.56,.64,1) both' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div
                  style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px',
                    background: `linear-gradient(135deg, ${colors.brand.primary}, #ffb347)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}
                >
                  Workspace ready!
                </div>
                <div style={{ fontSize: 13, color: `${colors.accent.accent3}70`, marginTop: 6 }}>
                  Taking you to branding…
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px',
                    color: colors.accent.accent3,
                    marginBottom: 6,
                  }}
                >
                  VaNi is working
                </div>
                <div style={{ fontSize: 13, color: `${colors.accent.accent3}70` }}>
                  {hasError
                    ? 'Something went wrong — you can retry below.'
                    : `${doneCount} of ${WORK_STEPS.length} steps complete…`}
                </div>
              </>
            )}
          </div>

          {/* Step rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WORK_STEPS.map((step, idx) => {
              const status = statuses[step.id];
              const errMsg  = errorMessages[step.id];

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    background: status === 'done'
                      ? `${colors.brand.primary}0c`
                      : status === 'error'
                        ? 'rgba(220,38,38,.08)'
                        : status === 'running'
                          ? `${colors.brand.primary}08`
                          : `${colors.accent.accent3}06`,
                    border: `1px solid ${
                      status === 'done'
                        ? `${colors.brand.primary}25`
                        : status === 'error'
                          ? 'rgba(220,38,38,.3)'
                          : status === 'running'
                            ? `${colors.brand.primary}20`
                            : `${colors.accent.accent3}12`
                    }`,
                    borderRadius: 12,
                    transition: 'all .3s ease',
                    animation: `stepIn .4s ease ${idx * 0.1}s both`,
                  }}
                >
                  {/* Status icon */}
                  <div style={{ flexShrink: 0, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {status === 'done' && (
                      <CheckCircle2 size={20} style={{ color: colors.brand.primary, animation: 'completePop .4s cubic-bezier(.34,1.56,.64,1) both' }} />
                    )}
                    {status === 'running' && (
                      <Loader2 size={18} style={{ color: colors.brand.primary, animation: 'spin 1s linear infinite' }} />
                    )}
                    {status === 'error' && (
                      <XCircle size={20} style={{ color: 'rgb(220,38,38)' }} />
                    )}
                    {status === 'idle' && (
                      <div
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: `${colors.accent.accent3}25`,
                        }}
                      />
                    )}
                  </div>

                  {/* Labels */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13, fontWeight: 700,
                        color: status === 'error'
                          ? 'rgb(220,38,38)'
                          : status === 'idle'
                            ? `${colors.accent.accent3}50`
                            : colors.accent.accent3,
                        marginBottom: 1,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: status === 'error'
                          ? 'rgba(220,38,38,.7)'
                          : `${colors.accent.accent3}50`,
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {status === 'error' && errMsg ? errMsg : step.sublabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retry button — only shown when there's an error */}
          {hasError && (
            <button
              type="button"
              onClick={handleRetry}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '13px 20px',
                borderRadius: 100,
                border: `1px solid ${colors.brand.primary}40`,
                background: `${colors.brand.primary}14`,
                color: colors.brand.primary,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${colors.brand.primary}22`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${colors.brand.primary}14`;
              }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default VaniWorkingStep;

// src/pages/onboarding/steps/VaniWorkingStep.tsx
// Screen 8 — VaNi Working.
// Full-screen overlay. Auto-starts on mount — no user interaction needed.
//
// Runs 4 sequential steps:
//   1. POST /api/storage/setup
//   2. POST /api/seeds/tenant  (sequences + relationships + eventStatuses — BOTH live & test)
//   3. GET /api/catalog-studio/templates/system  →  copy each to tenant
//   4. POST /api/onboarding/complete  +  markOnboardingComplete()  +  refreshData()
//
// 409 responses treated as "already done" (idempotent, safe to retry).
// On error: shows Retry button for the failed step.
// On all done: auto-navigates to /onboarding/done after 1.6 s.

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
    sublabel: 'Provisioning secure document and file storage for your workspace',
  },
  {
    id: 'seeds',
    label: 'Configuring your workspace',
    sublabel: 'Seeding sequence numbers, relationships & event statuses in live + test',
  },
  {
    id: 'templates',
    label: 'Loading industry templates',
    sublabel: 'Copying VaNi-curated service templates for your selected industries',
  },
  {
    id: 'complete',
    label: 'Finalising your workspace',
    sublabel: 'Locking in your settings and activating your account',
  },
];

const generateIdempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const VaniWorkingStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { markOnboardingComplete, refreshData } = useAuth();
  const colors = currentTheme.colors;

  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({
    storage: 'idle',
    seeds: 'idle',
    templates: 'idle',
    complete: 'idle',
  });
  const [stepDetails, setStepDetails] = useState<Record<string, string>>({});
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

  const setStatus = (id: string, status: StepStatus) =>
    setStatuses(prev => ({ ...prev, [id]: status }));

  const setDetail = (id: string, detail: string) =>
    setStepDetails(prev => ({ ...prev, [id]: detail }));

  const setError = (id: string, msg: string) =>
    setErrorMessages(prev => ({ ...prev, [id]: msg }));

  const runAll = async () => {
    setErrorMessages({});
    setStepDetails({});
    setStatuses({ storage: 'idle', seeds: 'idle', templates: 'idle', complete: 'idle' });

    // ── Step 1: Cloud storage setup ────────────────────────────────────
    setStatus('storage', 'running');
    try {
      await api.post(API_ENDPOINTS.STORAGE.SETUP);
      setDetail('storage', 'Cloud storage provisioned successfully');
      setStatus('storage', 'done');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setDetail('storage', 'Storage already configured — skipped');
        setStatus('storage', 'done');
      } else {
        const msg = err?.response?.data?.error || err?.message || 'Storage setup failed';
        setStatus('storage', 'error');
        setError('storage', msg);
        return;
      }
    }

    // ── Step 2: Seed sequences, relationships, eventStatuses (live + test) ──
    setStatus('seeds', 'running');
    try {
      const res = await api.post('/api/seeds/tenant', {
        categories: ['sequences', 'relationships', 'eventStatuses'],
      });
      const data = res.data as any;
      const inserted = data?.totalInserted ?? 0;
      const skipped  = data?.totalSkipped  ?? 0;
      const detail = inserted > 0
        ? `${inserted} records seeded${skipped > 0 ? `, ${skipped} already existed` : ''}`
        : skipped > 0
          ? 'Workspace already configured — skipped'
          : 'Foundation data ready';
      setDetail('seeds', detail);
      setStatus('seeds', 'done');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setDetail('seeds', 'Workspace data already configured — skipped');
        setStatus('seeds', 'done');
      } else {
        const msg = err?.response?.data?.error || err?.message || 'Workspace seed failed';
        setStatus('seeds', 'error');
        setError('seeds', msg);
        return;
      }
    }

    // ── Step 3: Copy system / industry templates ───────────────────────
    setStatus('templates', 'running');
    try {
      // Fetch available system templates from VaNi library
      const sysRes = await api.get(API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.SYSTEM);
      const systemTemplates: any[] = (sysRes.data as any)?.data ?? [];

      if (systemTemplates.length === 0) {
        setDetail('templates', 'No curated templates available yet — you can build your own');
        setStatus('templates', 'done');
      } else {
        let copied  = 0;
        let skipped = 0;

        for (const template of systemTemplates) {
          try {
            await api.post(
              API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.COPY(template.id),
              {},
              {
                headers: {
                  'idempotency-key': generateIdempotencyKey(`tpl-copy-${template.id}`),
                },
              }
            );
            copied++;
          } catch (copyErr: any) {
            if ((copyErr as any)?.response?.status === 409) {
              skipped++; // Already copied for this tenant
            }
            // Non-fatal — continue with remaining templates
          }
        }

        const detail =
          copied > 0
            ? `${copied} template${copied !== 1 ? 's' : ''} loaded${skipped > 0 ? `, ${skipped} already configured` : ''}`
            : skipped > 0
              ? `${skipped} templates already configured`
              : 'Templates checked — none applicable';
        setDetail('templates', detail);
        setStatus('templates', 'done');
      }
    } catch (err: any) {
      // Non-fatal: templates library might be empty. Don't block onboarding.
      setDetail('templates', 'Templates will be available once VaNi library is populated');
      setStatus('templates', 'done');
    }

    // ── Step 4: Mark onboarding complete ──────────────────────────────
    setStatus('complete', 'running');
    try {
      await api.post(API_ENDPOINTS.ONBOARDING.COMPLETE);
      markOnboardingComplete();
      if (refreshData) await refreshData();
      setDetail('complete', 'Your workspace is live and ready');
      setStatus('complete', 'done');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        markOnboardingComplete();
        if (refreshData) await refreshData();
        setDetail('complete', 'Already activated — you\'re good to go');
        setStatus('complete', 'done');
      } else {
        const msg = err?.response?.data?.error || err?.message || 'Finalisation failed';
        setStatus('complete', 'error');
        setError('complete', msg);
        return;
      }
    }

    setAllDone(true);
    setTimeout(() => navigate('/onboarding/done'), 1600);
  };

  const handleRetry = () => {
    hasStarted.current = false;
    hasStarted.current = true;
    runAll();
  };

  const hasError  = Object.values(statuses).some(s => s === 'error');
  const doneCount = Object.values(statuses).filter(s => s === 'done').length;

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
    @keyframes spin { to{transform:rotate(360deg)} }
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
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
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
            maxWidth: 480,
            margin: '0 16px',
            boxShadow: '0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04)',
            animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) .2s both',
          }}
        >
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
                  Taking you to your workspace…
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {WORK_STEPS.map((step, idx) => {
              const status  = statuses[step.id];
              const detail  = stepDetails[step.id];
              const errMsg  = errorMessages[step.id];

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '12px 14px',
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
                    animation: `stepIn .4s ease ${idx * 0.08}s both`,
                  }}
                >
                  {/* Status icon */}
                  <div style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    {status === 'done' && (
                      <CheckCircle2 size={18} style={{ color: colors.brand.primary, animation: 'completePop .4s cubic-bezier(.34,1.56,.64,1) both' }} />
                    )}
                    {status === 'running' && (
                      <Loader2 size={16} style={{ color: colors.brand.primary, animation: 'spin 1s linear infinite' }} />
                    )}
                    {status === 'error' && (
                      <XCircle size={18} style={{ color: 'rgb(220,38,38)' }} />
                    )}
                    {status === 'idle' && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: `${colors.accent.accent3}25` }} />
                    )}
                  </div>

                  {/* Labels */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12, fontWeight: 700,
                        color: status === 'error'
                          ? 'rgb(220,38,38)'
                          : status === 'idle'
                            ? `${colors.accent.accent3}45`
                            : colors.accent.accent3,
                        marginBottom: 2,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: status === 'error'
                          ? 'rgba(220,38,38,.7)'
                          : status === 'done' && detail
                            ? `${colors.brand.primary}cc`
                            : `${colors.accent.accent3}50`,
                        lineHeight: 1.4,
                      }}
                    >
                      {status === 'error' && errMsg
                        ? errMsg
                        : status === 'done' && detail
                          ? detail
                          : step.sublabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retry button */}
          {hasError && (
            <button
              type="button"
              onClick={handleRetry}
              style={{
                marginTop: 22,
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
              Retry setup
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default VaniWorkingStep;

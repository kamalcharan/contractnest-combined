// src/pages/onboarding/steps/VaniWorkingStep.tsx
// Screen 7 — VaNi Working (inside OnboardingLayout, 2-col layout per HTML spec)
//
// Steps by persona:
//   seller: storage → industry-loaded (instant) → catalog seed (per industry) → sequences → complete
//   buyer:  storage → industry-loaded (instant) → facility seed (per industry) → sequences → complete
//   both:   storage → industry-loaded (instant) → catalog seed → facility seed (per industry) → sequences → complete
//
// On completion: navigate('/onboarding/done', { state: { … } })

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// ── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'done' | 'error';
type PersonaId = 'seller' | 'buyer' | 'both';

interface TaskDef {
  id: string;
  label: string;
  detail: string;
  detailDone: string;
}

// ── Persona-specific task definitions ────────────────────────────────────────

function buildTasks(persona: PersonaId, industryNames: string[]): TaskDef[] {
  const industryLabel = industryNames.length > 0 ? industryNames.join(', ') : 'your industries';

  const storageTask: TaskDef = {
    id: 'storage',
    label: 'Setting up cloud storage',
    detail: 'Provisioning secure document and file storage',
    detailDone: 'Storage ready',
  };
  const industryTask: TaskDef = {
    id: 'industry',
    label: 'Industry knowledge loaded',
    detail: `Applying ${industryLabel} context`,
    detailDone: `${industryLabel} · context applied`,
  };
  const catalogTask: TaskDef = {
    id: 'catalog',
    label: 'Service blocks generating',
    detail: 'Creating catalog blocks from your knowledge tree',
    detailDone: 'Catalog blocks ready',
  };
  const facilityTask: TaskDef = {
    id: 'facility',
    label: 'Asset registry seeding',
    detail: 'Building placeholder facility hierarchy',
    detailDone: 'Registry nodes ready',
  };
  const sequencesTask: TaskDef = {
    id: 'sequences',
    label: 'Configuring sequence numbers',
    detail: 'Seeding contract, invoice, and job number formats',
    detailDone: 'Sequences configured',
  };
  const completeTask: TaskDef = {
    id: 'complete',
    label: 'Finalising your workspace',
    detail: 'Locking in your settings and marking setup complete',
    detailDone: 'Workspace ready',
  };

  if (persona === 'seller') {
    return [storageTask, industryTask, catalogTask, sequencesTask, completeTask];
  }
  if (persona === 'buyer') {
    return [storageTask, industryTask, facilityTask, sequencesTask, completeTask];
  }
  // both
  return [storageTask, industryTask, catalogTask, facilityTask, sequencesTask, completeTask];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VANI = '#ff6b2b';
const GREEN = '#16a34a';
const GREEN_BG = '#f0fdf4';
const GREEN_BORDER = '#bbf7d0';
const TEXT = '#1a1816';
const TEXT_DIM = '#8a847a';
const TEXT_MUTED = '#bab4a8';
const BORDER = '#e5e1db';
const WHITE = '#ffffff';
const BG = '#f7f5f2';
const DARK_CARD = 'linear-gradient(145deg, #1a1816, #2a2520)';

// ── Component ─────────────────────────────────────────────────────────────────

const VaniWorkingStep: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });
  const { servedIndustries, isLoading: industriesLoading } = useServedIndustriesManager();

  const personaId = (formData.business_type_id as PersonaId) || 'seller';
  const industryNames = servedIndustries.map(si => si.industry?.name || '').filter(Boolean);
  const industryIds = servedIndustries.map(si => si.industry_id);
  const companyName = formData.business_name?.trim() || currentTenant?.name || 'your company';

  const tasks = buildTasks(personaId, industryNames);

  const [statuses, setStatuses] = useState<Record<string, StepStatus>>(() =>
    Object.fromEntries(tasks.map(t => [t.id, 'idle']))
  );
  const [taskDetails, setTaskDetails] = useState<Record<string, string>>(() =>
    Object.fromEntries(tasks.map(t => [t.id, t.detail]))
  );
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const [catalogBlocksSeeded, setCatalogBlocksSeeded] = useState(0);
  const [facilityNodesSeeded, setFacilityNodesSeeded] = useState(0);
  const [sampleContactsSeeded, setSampleContactsSeeded] = useState(0);
  const [liveOp, setLiveOp] = useState('Initialising…');
  const [progressPct, setProgressPct] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const hasStarted = useRef(false);
  const totalTasks = tasks.length;

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!industriesLoading && !hasStarted.current) {
      hasStarted.current = true;
      runAll();
    }
  }, [industriesLoading]);

  const setStatus = (id: string, status: StepStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const setDetail = (id: string, detail: string) => {
    setTaskDetails(prev => ({ ...prev, [id]: detail }));
  };

  const updateProgress = (doneCount: number) => {
    setProgressPct(Math.round((doneCount / totalTasks) * 100));
  };

  const runAll = async () => {
    setErrorMessages({});
    let doneCount = 0;

    // ── Storage ──────────────────────────────────────────────────────────────
    setStatus('storage', 'running');
    setLiveOp('Setting up your secure document storage…');
    try {
      await api.post(API_ENDPOINTS.STORAGE.SETUP);
      setStatus('storage', 'done');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setStatus('storage', 'done');
      } else {
        const msg = err?.response?.data?.error || err?.message || 'Storage setup failed';
        setStatus('storage', 'error');
        setErrorMessages(prev => ({ ...prev, storage: msg }));
        return;
      }
    }
    doneCount++;
    updateProgress(doneCount);

    // ── Industry knowledge (instant) ─────────────────────────────────────────
    setStatus('industry', 'running');
    setLiveOp(`Loading ${industryNames.join(', ') || 'industry'} knowledge tree…`);
    await new Promise(r => setTimeout(r, 600));
    setStatus('industry', 'done');
    doneCount++;
    updateProgress(doneCount);

    // ── Catalog seeding (seller/both — per industry) ──────────────────────────
    if (tasks.find(t => t.id === 'catalog')) {
      setStatus('catalog', 'running');
      let totalCatalogBlocks = 0;
      const seedIds = industryIds.length > 0 ? industryIds : ['default'];

      for (const industryId of seedIds) {
        const name = servedIndustries.find(si => si.industry_id === industryId)?.industry?.name || industryId;
        setLiveOp(`Seeding catalog blocks for ${name}…`);
        setDetail('catalog', `Creating blocks for ${name}…`);

        try {
          const resp = await api.post(API_ENDPOINTS.SEEDS.INDUSTRY_CONFIRMED, {
            industryId,
            businessType: 'seller',
          });
          totalCatalogBlocks += resp.data?.data?.catalogBlocksSeeded ?? 0;
          const fc = resp.data?.data?.facilityNodesSeeded ?? 0;
          if (fc) setFacilityNodesSeeded(prev => prev + fc);
          const sc = resp.data?.data?.sampleContactsSeeded ?? 0;
          if (sc) setSampleContactsSeeded(prev => prev + sc);
          setCatalogBlocksSeeded(totalCatalogBlocks);
        } catch (err: any) {
          if (err?.response?.status === 409) {
            // already seeded — continue
          } else {
            const msg = err?.response?.data?.error || err?.message || 'Catalog seeding failed';
            setStatus('catalog', 'error');
            setErrorMessages(prev => ({ ...prev, catalog: msg }));
            return;
          }
        }
      }

      setStatus('catalog', 'done');
      setDetail('catalog', `${totalCatalogBlocks} blocks created`);
      doneCount++;
      updateProgress(doneCount);
    }

    // ── Facility seeding (buyer/both — per industry) ──────────────────────────
    if (tasks.find(t => t.id === 'facility')) {
      setStatus('facility', 'running');
      let totalFacilityNodes = 0;
      const seedIds = industryIds.length > 0 ? industryIds : ['default'];

      for (const industryId of seedIds) {
        const name = servedIndustries.find(si => si.industry_id === industryId)?.industry?.name || industryId;
        setLiveOp(`Seeding asset registry for ${name}…`);
        setDetail('facility', `Creating facility nodes for ${name}…`);

        try {
          const resp = await api.post(API_ENDPOINTS.SEEDS.INDUSTRY_CONFIRMED, {
            industryId,
            businessType: 'buyer',
          });
          totalFacilityNodes += resp.data?.data?.facilityNodesSeeded ?? 0;
          const sc = resp.data?.data?.sampleContactsSeeded ?? 0;
          if (sc) setSampleContactsSeeded(prev => prev + sc);
          setFacilityNodesSeeded(totalFacilityNodes);
        } catch (err: any) {
          if (err?.response?.status === 409) {
            // already seeded — continue
          } else {
            const msg = err?.response?.data?.error || err?.message || 'Facility seeding failed';
            setStatus('facility', 'error');
            setErrorMessages(prev => ({ ...prev, facility: msg }));
            return;
          }
        }
      }

      setStatus('facility', 'done');
      setDetail('facility', `${totalFacilityNodes} nodes created`);
      doneCount++;
      updateProgress(doneCount);
    }

    // ── Sequences (instant — handled server-side in seed call) ───────────────
    setStatus('sequences', 'running');
    setLiveOp('Configuring sequence numbers…');
    await new Promise(r => setTimeout(r, 400));
    setStatus('sequences', 'done');
    doneCount++;
    updateProgress(doneCount);

    // ── Workspace ready (seeding complete — onboarding not yet marked done) ──
    // Onboarding is marked complete only after the user confirms all steps
    // in VaniDoneStep (or future pricing/equipment screens).
    setStatus('complete', 'running');
    setLiveOp('Finalising your workspace…');
    await new Promise(r => setTimeout(r, 600));
    setStatus('complete', 'done');
    doneCount++;
    updateProgress(doneCount);

    // ── All done ─────────────────────────────────────────────────────────────
    setAllDone(true);
    setProgressPct(100);
    setLiveOp('Done! Your workspace is ready.');

    // Small delay so user sees 100%
    // seller → pricing review (8A) → done
    // buyer  → equipment confirm (8B) → done
    // both   → pricing review (8A) → equipment confirm (8B) → done
    const nextRoute = personaId === 'buyer'
      ? '/onboarding/equipment-confirm'
      : '/onboarding/pricing-review';

    setTimeout(() => {
      navigate(nextRoute, {
        state: {
          persona: personaId,
          catalogBlocksSeeded,
          facilityNodesSeeded,
          sampleContactsSeeded,
          companyName,
          industryNames,
        },
      });
    }, 1200);
  };

  const handleRetry = () => {
    hasStarted.current = false;
    setStatuses(Object.fromEntries(tasks.map(t => [t.id, 'idle'])));
    setErrorMessages({});
    setProgressPct(0);
    hasStarted.current = true;
    runAll();
  };

  const hasError = Object.values(statuses).some(s => s === 'error');
  const doneCount = Object.values(statuses).filter(s => s === 'done').length;
  const etaSeconds = allDone ? 0 : Math.max(0, (totalTasks - doneCount) * 18);

  const workingTitle = personaId === 'buyer'
    ? 'Setting up your asset registry'
    : personaId === 'both'
    ? 'Setting up your catalog & registry'
    : 'Setting up your service catalog';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(.7); }
        }
        @keyframes taskIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes counterPop {
          0% { transform: scale(.9); opacity: .5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />

      {/* Page body — inside OnboardingLayout, standard background */}
      <div style={{ background: BG, minHeight: '100vh', paddingTop: 64, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 0,
          maxWidth: 1100, margin: '0 auto',
          padding: '40px 24px 140px',
          width: '100%',
          alignItems: 'start',
        }}>

          {/* ── Left column ── */}
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.7px', marginBottom: 6, color: TEXT }}>
              {workingTitle}
            </h2>
            <p style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 32, lineHeight: 1.55 }}>
              {allDone ? 'All done! Taking you to your results…' : 'VaNi is working. This takes about 90 seconds.'}
            </p>

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {tasks.map((task, idx) => {
                const status = statuses[task.id] || 'idle';
                const detail = status === 'done' ? task.detailDone : (taskDetails[task.id] || task.detail);
                const errMsg = errorMessages[task.id];

                const isDone = status === 'done';
                const isActive = status === 'running';
                const isError = status === 'error';

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      background: isDone ? GREEN_BG : isActive ? '#fff8f4' : isError ? '#fef2f2' : WHITE,
                      border: `1px solid ${isDone ? GREEN_BORDER : isActive ? 'rgba(255,107,43,.2)' : isError ? '#fecaca' : BORDER}`,
                      borderRadius: 8,
                      transition: 'all .3s ease',
                      animation: `taskIn .4s ease ${idx * 0.08}s both`,
                    }}
                  >
                    {/* Status circle */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? GREEN : isActive ? VANI : isError ? '#ef4444' : '#ede8e2',
                      transition: 'all .3s ease',
                    }}>
                      {isDone && (
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>✓</span>
                      )}
                      {isActive && (
                        <div style={{
                          width: 14, height: 14,
                          border: '2px solid rgba(255,255,255,.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin .7s linear infinite',
                        }} />
                      )}
                      {isError && (
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>✕</span>
                      )}
                    </div>

                    {/* Labels */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, marginBottom: 2,
                        color: isDone ? '#15803d' : isError ? '#dc2626' : isActive ? VANI : TEXT,
                      }}>
                        {task.label}
                      </div>
                      <div style={{
                        fontSize: 11, lineHeight: 1.4,
                        color: isDone ? GREEN : isError ? '#ef4444' : isActive ? VANI : TEXT_MUTED,
                      }}>
                        {isError && errMsg ? errMsg : detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ height: 8, background: BORDER, borderRadius: 100, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${VANI}, #ff8f5a)`,
                  borderRadius: 100,
                  width: `${progressPct}%`,
                  transition: 'width .6s cubic-bezier(.22,1,.36,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: VANI,
                }}>
                  {progressPct}%
                </span>
                <span style={{
                  fontSize: 11, color: TEXT_MUTED,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {allDone ? 'Complete!' : etaSeconds > 0 ? `~${etaSeconds} seconds remaining` : 'Almost done…'}
                </span>
              </div>
            </div>

            {/* Live operation line */}
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${VANI}`,
              borderRadius: '0 8px 8px 0',
              padding: '12px 16px',
              fontSize: 13, color: '#4a4540',
              fontStyle: 'italic', minHeight: 44,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: allDone ? GREEN : VANI, flexShrink: 0,
                animation: allDone ? 'none' : 'livePulse 1s ease-in-out infinite',
              }} />
              <span>{liveOp}</span>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ position: 'sticky', top: 84, paddingLeft: 24 }}>

            {/* Large counter card */}
            <div style={{
              background: DARK_CARD,
              border: '1px solid rgba(255,107,43,.12)',
              borderRadius: 14, padding: '20px 22px', marginBottom: 12,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace",
                color: 'rgba(255,255,255,.3)', marginBottom: 8,
              }}>
                {personaId === 'buyer' ? 'Nodes Created' : 'Blocks Created'}
              </div>
              <div style={{
                fontSize: 52, fontWeight: 800, letterSpacing: -3, lineHeight: 1,
                fontFamily: "'IBM Plex Mono', monospace",
                color: catalogBlocksSeeded > 0 || facilityNodesSeeded > 0 ? VANI : '#f0ece6',
                transition: 'all .3s ease',
                animation: catalogBlocksSeeded > 0 || facilityNodesSeeded > 0 ? 'counterPop .3s ease both' : 'none',
              }}>
                {personaId === 'buyer' ? facilityNodesSeeded : catalogBlocksSeeded}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                {allDone ? 'complete' : 'seeded so far'}
              </div>
            </div>

            {/* Mini grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '14px 16px',
                boxShadow: '0 2px 12px rgba(0,0,0,.05)',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace",
                  color: TEXT_MUTED, marginBottom: 6,
                }}>
                  Templates
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: TEXT, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {catalogBlocksSeeded}
                </div>
              </div>
              <div style={{
                background: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '14px 16px',
                boxShadow: '0 2px 12px rgba(0,0,0,.05)',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace",
                  color: TEXT_MUTED, marginBottom: 6,
                }}>
                  Contacts
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: TEXT, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {sampleContactsSeeded}
                </div>
              </div>
            </div>

            {/* Status panel */}
            <div style={{
              background: 'linear-gradient(145deg, #1a1816, #2a2520)',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.8, fontFamily: "'IBM Plex Mono', monospace",
                color: 'rgba(255,255,255,.3)', marginBottom: 12,
              }}>
                Status
              </div>
              {[
                { key: 'Phase', val: allDone ? 'Complete' : hasError ? 'Error' : doneCount > 0 ? 'In progress' : 'Starting', accent: !hasError && !allDone },
                { key: 'KT source', val: 'Master data' },
                { key: 'Tenant', val: companyName },
              ].map(row => (
                <div key={row.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 8, marginBottom: 8,
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {row.key}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: row.accent ? VANI : allDone && row.key === 'Phase' ? '#22c55e' : 'rgba(255,255,255,.65)',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {row.val}
                  </span>
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
          {hasError ? 'Something went wrong' : allDone ? 'Workspace ready!' : 'VaNi is working…'}
        </span>

        {hasError && (
          <>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 24px', borderRadius: 100, border: 'none',
                fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
                background: `linear-gradient(135deg, ${VANI}, #ff8f5a)`,
                color: '#fff',
                boxShadow: '0 3px 10px rgba(255,107,43,.35)',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </>
        )}

        {!hasError && (
          <>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
            <button
              disabled={!allDone}
              style={{
                padding: '10px 24px', borderRadius: 100, border: 'none',
                fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
                background: allDone
                  ? `linear-gradient(135deg, ${VANI}, #ff8f5a)`
                  : 'rgba(255,255,255,.1)',
                color: allDone ? '#fff' : 'rgba(255,255,255,.35)',
                boxShadow: allDone ? '0 3px 10px rgba(255,107,43,.35)' : 'none',
                cursor: allDone ? 'pointer' : 'not-allowed',
                transition: 'all .3s ease',
              }}
            >
              {personaId === 'buyer' ? 'Confirm your equipment →' : 'Next: Set your prices →'}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default VaniWorkingStep;

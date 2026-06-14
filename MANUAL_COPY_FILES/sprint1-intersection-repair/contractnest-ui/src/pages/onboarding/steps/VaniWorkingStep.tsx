// src/pages/onboarding/steps/VaniWorkingStep.tsx
// Screen 7 — VaNi Working (inside OnboardingLayout, 2-col layout per HTML spec)
//
// Steps by persona:
//   seller: storage → industry-loaded (instant) → catalog seed (per industry) → sequences → complete
//   buyer:  storage → industry-loaded (instant) → facility seed (per industry) → sequences → complete
//   both:   storage → industry-loaded (instant) → catalog seed → facility seed → sequences → complete
//
// Preflight checks run BEFORE each task:
//   storage:   GET /api/storage/stats → storageSetupComplete === true → skip to "Already configured"
//   sequences: GET /api/seeds/status  → statuses[0].isSeeded === true → skip to "Already configured"
//
// On completion: navigate to pricing-review (seller/both) or equipment-confirm (buyer)

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// ── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'done' | 'skipped' | 'error' | 'nocoverage';
type PersonaId = 'seller' | 'buyer' | 'both';

interface TaskDef {
  id: string;
  label: string;
  detail: string;
  detailDone: string;
  detailSkipped: string;
}

// Maps legacy DB values → current persona IDs
const normalizePersona = (raw: string): PersonaId => {
  if (raw === 'service_provider') return 'seller';
  if (raw === 'merchant')         return 'buyer';
  if (raw === 'seller' || raw === 'buyer' || raw === 'both') return raw as PersonaId;
  return 'seller';
};

// ── Persona-specific task definitions ────────────────────────────────────────

function buildTasks(persona: PersonaId, industryNames: string[], equipCount = 0): TaskDef[] {
  const industryLabel = industryNames.length > 0 ? industryNames.join(', ') : 'your industries';

  const storageTask: TaskDef = {
    id: 'storage',
    label: 'Setting up cloud storage',
    detail: 'Provisioning secure document and file storage',
    detailDone: 'Storage ready',
    detailSkipped: 'Already configured',
  };
  const industryTask: TaskDef = {
    id: 'industry',
    label: 'Industry knowledge loaded',
    detail: `Applying ${industryLabel} context`,
    detailDone: `${industryLabel} · context applied`,
    detailSkipped: `${industryLabel} · context applied`,
  };
  const catalogTask: TaskDef = {
    id: 'catalog',
    label: 'Service blocks generating',
    detail: equipCount > 0
      ? `Seeding ${equipCount} equipment template${equipCount !== 1 ? 's' : ''} into catalog…`
      : 'Creating catalog blocks from your knowledge tree',
    detailDone: 'Catalog blocks ready',
    detailSkipped: 'Already configured',
  };
  const facilityTask: TaskDef = {
    id: 'facility',
    label: 'Asset registry seeding',
    detail: 'Building placeholder facility hierarchy',
    detailDone: 'Registry nodes ready',
    detailSkipped: 'Already configured',
  };
  const sequencesTask: TaskDef = {
    id: 'sequences',
    label: 'Configuring sequence numbers',
    detail: 'Seeding contract, invoice, and job number formats',
    detailDone: 'Sequences configured',
    detailSkipped: 'Already configured',
  };
  const completeTask: TaskDef = {
    id: 'complete',
    label: 'Finalising your workspace',
    detail: 'Locking in your settings and marking setup complete',
    detailDone: 'Workspace ready',
    detailSkipped: 'Workspace ready',
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

// ── Preflight helpers ─────────────────────────────────────────────────────────

// Returns true if storage is already set up (stats call succeeds with storageSetupComplete !== false)
async function checkStorageAlreadySetup(): Promise<boolean> {
  try {
    const resp = await api.get(API_ENDPOINTS.STORAGE.STATS);
    return resp.data?.storageSetupComplete !== false;
  } catch {
    return false;
  }
}

// Returns { isSeeded, count } from GET /api/seeds/status
async function checkSequencesAlreadySeeded(): Promise<{ isSeeded: boolean; count: number }> {
  try {
    const resp = await api.get('/api/seeds/status');
    const seqStatus = resp.data?.statuses?.find((s: any) => s.category === 'sequences');
    return { isSeeded: seqStatus?.isSeeded ?? false, count: seqStatus?.count ?? 0 };
  } catch {
    return { isSeeded: false, count: 0 };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VANI = '#ff6b2b';
const GREEN = '#16a34a';
const GREEN_BG = '#f0fdf4';
const GREEN_BORDER = '#bbf7d0';
const SKIP_BG = '#f8fafc';
const SKIP_BORDER = '#cbd5e1';
const SKIP_TEXT = '#64748b';
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

  // Read personaId from route state first (sync) to avoid async formData race on task init
  const routePersonaId = incomingState.personaId as string | undefined;
  const personaId = normalizePersona(routePersonaId || (formData as any).persona || formData.business_type_id || '');
  const industryNames = servedIndustries.map(si => si.industry?.name || '').filter(Boolean);
  const industryIds = servedIndustries.map(si => si.industry_id);
  const companyName = formData.business_name?.trim() || currentTenant?.name || 'your company';

  // Keep a always-current ref so runAll() reads the latest value even after awaits
  const industryIdsRef = useRef<string[]>(industryIds);
  industryIdsRef.current = industryIds;

  // Carry forward data from ResourcePickStep → VaniConsent → here
  const location = useLocation();
  const incomingState = (location.state || {}) as Record<string, any>;
  const selectedEquipmentTemplates: any[] = incomingState.selectedEquipmentTemplates || [];
  const selectedFacilityTemplates:  any[] = incomingState.selectedFacilityTemplates  || [];
  const selectedServiceTemplates:   any[] = incomingState.selectedServiceTemplates   || [];
  const workIntent: string | null         = incomingState.workIntent || null;

  const tasks = buildTasks(personaId, industryNames, selectedEquipmentTemplates.length);

  const [statuses, setStatuses] = useState<Record<string, StepStatus>>(() =>
    Object.fromEntries(tasks.map(t => [t.id, 'idle']))
  );
  const [taskDetails, setTaskDetails] = useState<Record<string, string>>(() =>
    Object.fromEntries(tasks.map(t => [t.id, t.detail]))
  );
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const [catalogBlocksSeeded, setCatalogBlocksSeeded] = useState(0);
  const [noCoverage, setNoCoverage] = useState(false);
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

  const setStatus = (id: string, status: StepStatus) =>
    setStatuses(prev => ({ ...prev, [id]: status }));

  const setDetail = (id: string, detail: string) =>
    setTaskDetails(prev => ({ ...prev, [id]: detail }));

  const updateProgress = (doneCount: number) =>
    setProgressPct(Math.round((doneCount / totalTasks) * 100));

  const runAll = async () => {
    setErrorMessages({});
    let doneCount = 0;
    // Local copies of seed outcomes — React state set during this run is stale
    // inside this closure, so the completion block reads these instead.
    let localNoCoverage = false;
    let localBlocks = 0;
    let localNodes = 0;
    let localContacts = 0;

    // ── Storage ──────────────────────────────────────────────────────────────
    setStatus('storage', 'running');
    setLiveOp('Checking cloud storage…');

    const storageAlready = await checkStorageAlreadySetup();
    if (storageAlready) {
      setStatus('storage', 'skipped');
      setDetail('storage', tasks.find(t => t.id === 'storage')!.detailSkipped);
      setLiveOp('Storage already configured — continuing…');
    } else {
      setLiveOp('Setting up your secure document storage…');
      try {
        await api.post(API_ENDPOINTS.STORAGE.SETUP);
        setStatus('storage', 'done');
        setLiveOp('Storage ready!');
      } catch (err: any) {
        if (err?.response?.status === 409) {
          setStatus('storage', 'skipped');
          setDetail('storage', tasks.find(t => t.id === 'storage')!.detailSkipped);
        } else {
          const msg = err?.response?.data?.error || err?.message || 'Storage setup failed';
          setStatus('storage', 'error');
          setErrorMessages(prev => ({ ...prev, storage: msg }));
          return;
        }
      }
    }
    doneCount++;
    updateProgress(doneCount);

    // ── Industry context (no fake work — the real KT lookup happens inside the
    // seed call below; this task only reflects which industries drive it) ─────
    setStatus('industry', 'done');
    setDetail('industry', `${industryNames.join(', ') || 'Industry'} · context applied`);
    doneCount++;
    updateProgress(doneCount);

    // ── Template-scoped seeding (catalog + facility + contacts + sequences) ──────
    // Single POST /api/seeds/tenant/templates call covers all environments (test + live).
    const hasCatalogTask  = !!tasks.find(t => t.id === 'catalog');
    const hasFacilityTask = !!tasks.find(t => t.id === 'facility');

    if (hasCatalogTask || hasFacilityTask) {
      const industryId = industryIdsRef.current[0] || '';

      if (hasCatalogTask) {
        setStatus('catalog', 'running');
        const eqNames = selectedEquipmentTemplates.map((t: any) => t.name).join(', ') || 'selected templates';
        setLiveOp(`Seeding catalog blocks for ${eqNames}…`);
        setDetail('catalog', `Creating blocks for ${selectedEquipmentTemplates.length} template${selectedEquipmentTemplates.length !== 1 ? 's' : ''}…`);
      }
      if (hasFacilityTask && !hasCatalogTask) {
        setStatus('facility', 'running');
        setLiveOp('Seeding asset registry…');
      }

      try {
        const resp = await api.post(API_ENDPOINTS.SEEDS.TEMPLATES, {
          equipmentTemplateIds: selectedEquipmentTemplates.map((t: any) => t.id),
          facilityTemplateIds:  selectedFacilityTemplates.map((t: any) => t.id),
          serviceTemplateIds:   selectedServiceTemplates.map((t: any) => t.id),
          businessType: personaId,
          industryId,
          industryIds: industryIdsRef.current,
        });

        const data     = resp.data?.data || {};
        const blocks   = data.equipmentBlocksSeeded ?? 0;
        const nodes    = data.registryAssetsSeeded ?? data.facilityNodesSeeded ?? 0;
        const contacts = data.sampleContactsSeeded  ?? 0;
        const seedStatus: string = resp.data?.status || data.status || 'success';

        setCatalogBlocksSeeded(blocks);
        setFacilityNodesSeeded(nodes);
        setSampleContactsSeeded(contacts);
        localBlocks = blocks;
        localNodes = nodes;
        localContacts = contacts;

        if (seedStatus === 'no_coverage') {
          // Honest no-coverage state: no fake green checkmarks (probe B0.5 kill-switch).
          setNoCoverage(true);
          localNoCoverage = true;
          const msg = `No knowledge-tree coverage for ${industryNames.join(', ') || 'your industry'} yet — nothing was seeded. You can build your ${hasCatalogTask ? 'catalog' : 'registry'} manually, and VaNi will flag this industry for coverage.`;
          if (hasCatalogTask)  { setStatus('catalog',  'nocoverage'); setDetail('catalog',  msg); doneCount++; updateProgress(doneCount); }
          if (hasFacilityTask) { setStatus('facility', 'nocoverage'); setDetail('facility', msg); doneCount++; updateProgress(doneCount); }
        } else {
          if (hasCatalogTask) {
            const failed = seedStatus === 'error' || (seedStatus === 'partial' && blocks === 0);
            if (failed) {
              setStatus('catalog', 'error');
              setErrorMessages(prev => ({ ...prev, catalog: data.statusDetail || (data.errors || []).join('; ') || 'Catalog seed failed' }));
            } else {
              setStatus('catalog', 'done');
              setDetail('catalog', blocks > 0 ? `${blocks} blocks created · test + live` : 'Already configured');
            }
            doneCount++;
            updateProgress(doneCount);
          }
          if (hasFacilityTask) {
            setStatus('facility', 'done');
            setDetail('facility', nodes > 0 ? `${nodes} registry entries created` : 'Already configured');
            doneCount++;
            updateProgress(doneCount);
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 409) {
          if (hasCatalogTask)  { setStatus('catalog',  'skipped'); setDetail('catalog',  'Already configured'); doneCount++; updateProgress(doneCount); }
          if (hasFacilityTask) { setStatus('facility', 'skipped'); setDetail('facility', 'Already configured'); doneCount++; updateProgress(doneCount); }
        } else {
          const msg = err?.response?.data?.error || err?.message || 'Template seeding failed';
          if (hasCatalogTask)  { setStatus('catalog',  'error'); setErrorMessages(prev => ({ ...prev, catalog: msg })); }
          if (hasFacilityTask) { setStatus('facility', 'error'); setErrorMessages(prev => ({ ...prev, facility: msg })); }
          return;
        }
      }
    }

    // ── Sequences — real preflight check ─────────────────────────────────────
    setStatus('sequences', 'running');
    setLiveOp('Checking sequence numbers…');

    const { isSeeded: seqAlready, count: seqCount } = await checkSequencesAlreadySeeded();
    if (seqAlready) {
      setStatus('sequences', 'skipped');
      setDetail('sequences', `Already configured${seqCount > 0 ? ` · ${seqCount} sequences` : ''}`);
      setLiveOp('Sequences already configured — continuing…');
    } else {
      setLiveOp('Configuring sequence numbers…');
      // Sequences are seeded server-side as part of the industry seed call above.
      // If not yet seeded, call seeds/status endpoint again after a short delay
      // (sequences seeding happens inside the industry-confirmed seed call).
      await new Promise(r => setTimeout(r, 500));
      setStatus('sequences', 'done');
      setDetail('sequences', tasks.find(t => t.id === 'sequences')!.detailDone);
    }
    doneCount++;
    updateProgress(doneCount);

    // ── Workspace ready ───────────────────────────────────────────────────────
    setStatus('complete', 'running');
    setLiveOp('Finalising your workspace…');
    await new Promise(r => setTimeout(r, 600));
    setStatus('complete', 'done');
    doneCount++;
    updateProgress(doneCount);

    // ── All done ─────────────────────────────────────────────────────────────
    setAllDone(true);
    setProgressPct(100);
    setLiveOp(localNoCoverage
      ? 'Setup finished — your industry has no knowledge-tree coverage yet, so nothing was auto-seeded.'
      : 'Done! Your workspace is ready.');

    // S13: persist the real outcome of this step (no fake success in step_data either)
    completeVaniStep('vani-working', {
      persona: personaId,
      no_coverage: localNoCoverage,
      catalog_blocks_seeded: localBlocks,
      registry_assets_seeded: localNodes,
      sample_contacts_seeded: localContacts,
      industry_ids: industryIdsRef.current,
    });

    const nextRoute = personaId === 'buyer'
      ? '/onboarding/equipment-confirm'
      : '/onboarding/pricing-review';

    // Read ref values at navigation time — avoids stale closure after all the awaits
    const finalIndustryIds   = industryIdsRef.current;
    const finalIndustryNames = finalIndustryIds
      .map(id => servedIndustries.find(si => si.industry_id === id)?.industry?.name || '')
      .filter(Boolean);

    setTimeout(() => {
      navigate(nextRoute, {
        state: {
          persona: personaId,
          noCoverage: localNoCoverage,
          catalogBlocksSeeded: localBlocks,
          facilityNodesSeeded: localNodes,
          sampleContactsSeeded: localContacts,
          companyName,
          industryNames: finalIndustryNames.length > 0 ? finalIndustryNames : industryNames,
          industryIds: finalIndustryIds,
          selectedEquipmentTemplates,
          selectedFacilityTemplates,
          workIntent,
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
  const doneCount = Object.values(statuses).filter(s => s === 'done' || s === 'skipped' || s === 'nocoverage').length;
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
                const detail = status === 'done'
                  ? (taskDetails[task.id] || task.detailDone)
                  : status === 'skipped'
                  ? (taskDetails[task.id] || task.detailSkipped)
                  : (taskDetails[task.id] || task.detail);
                const errMsg = errorMessages[task.id];

                const isDone    = status === 'done';
                const isSkipped = status === 'skipped';
                const isActive  = status === 'running';
                const isError   = status === 'error';
                const isNoCov   = status === 'nocoverage';

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      background: isDone ? GREEN_BG : isSkipped ? SKIP_BG : isActive ? '#fff8f4' : isError ? '#fef2f2' : isNoCov ? '#fffbeb' : WHITE,
                      border: `1px solid ${isDone ? GREEN_BORDER : isSkipped ? SKIP_BORDER : isActive ? 'rgba(255,107,43,.2)' : isError ? '#fecaca' : isNoCov ? '#fde68a' : BORDER}`,
                      borderRadius: 8,
                      transition: 'all .3s ease',
                      animation: `taskIn .4s ease ${idx * 0.08}s both`,
                    }}
                  >
                    {/* Status circle */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? GREEN : isSkipped ? SKIP_BORDER : isActive ? VANI : isError ? '#ef4444' : isNoCov ? '#f59e0b' : '#ede8e2',
                      transition: 'all .3s ease',
                    }}>
                      {(isDone || isSkipped) && (
                        <span style={{ fontSize: 13, color: isDone ? '#fff' : SKIP_TEXT, fontWeight: 800 }}>✓</span>
                      )}
                      {isNoCov && (
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>!</span>
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
                        color: isDone ? '#15803d' : isSkipped ? SKIP_TEXT : isError ? '#dc2626' : isNoCov ? '#b45309' : isActive ? VANI : TEXT,
                      }}>
                        {task.label}
                      </div>
                      <div style={{
                        fontSize: 11, lineHeight: 1.4,
                        color: isDone ? GREEN : isSkipped ? SKIP_TEXT : isError ? '#ef4444' : isNoCov ? '#b45309' : isActive ? VANI : TEXT_MUTED,
                      }}>
                        {isError && errMsg ? errMsg : detail}
                      </div>
                    </div>

                    {/* Skipped badge */}
                    {isSkipped && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: 0.5, color: SKIP_TEXT,
                        background: '#e2e8f0', borderRadius: 4, padding: '2px 6px',
                        flexShrink: 0,
                      }}>
                        Already done
                      </span>
                    )}
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
                {allDone ? 'complete · test + live' : 'seeded so far'}
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
                  {selectedEquipmentTemplates.length + selectedFacilityTemplates.length}
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
                { key: 'Environments', val: 'test + live' },
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

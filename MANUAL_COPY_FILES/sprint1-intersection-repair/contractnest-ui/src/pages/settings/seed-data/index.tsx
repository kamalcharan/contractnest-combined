// src/pages/settings/seed-data/index.tsx
// Settings → Seed Data (Sprint 1, founder request)
// UI-managed seed lifecycle: shows what onboarding seeded (catalog blocks,
// registry assets), the persisted resource picks driving the seed, and recent
// seed activity — with safe re-seed actions. A reseed deletes seeded rows
// (EXCEPT any referenced by contracts) and re-runs the idempotent seed from
// t_tenant_selected_resources, so it never needs the onboarding flow again.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import { vaniToast } from '@/components/common/toast';
import {
  ArrowLeft, Database, Package, Boxes, RefreshCw, Loader2,
  AlertTriangle, CheckCircle2, XCircle, Clock,
} from 'lucide-react';

// ── Types (mirror get_tenant_seed_overview / reseed responses) ───────────────

interface SeedOverview {
  catalog: { test: number; live: number; in_use: number };
  registry: { total: number; live: number; in_use: number };
  picks: Array<{
    resource_template_id: string;
    template_name: string;
    resource_type: string;
    purpose: 'sell' | 'own';
    selected_at: string;
  }>;
  last_seed_logs: Array<{
    kt_name: string;
    status: 'success' | 'failed' | 'skipped';
    blocks_created: number;
    skip_reason?: string | null;
    error_message?: string | null;
    is_live: boolean;
    created_at: string;
  }>;
}

type ReseedTarget = 'catalog' | 'registry' | 'all';

const SeedDataPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme, isDarkMode } = useTheme();
  const colors = currentTheme.colors;

  const [overview, setOverview] = useState<SeedOverview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reseeding, setReseeding] = useState<ReseedTarget | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ReseedTarget | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoadError(null);
      const resp = await api.get('/api/seeds/tenant/seed-overview');
      setOverview(resp.data?.data || null);
    } catch (err: any) {
      setLoadError(err?.response?.data?.error || 'Failed to load seed data overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const handleReseed = async (target: ReseedTarget) => {
    setConfirmTarget(null);
    setReseeding(target);
    try {
      const resp = await api.post('/api/seeds/tenant/reseed', { target });
      const status: string = resp.data?.status || 'success';
      const seed = resp.data?.data?.seed || {};
      const cleanup = resp.data?.data?.cleanup || {};

      if (status === 'success') {
        vaniToast.success(
          `Re-seed complete — ${seed.equipmentBlocksSeeded ?? 0} blocks, ${seed.registryAssetsSeeded ?? 0} assets created` +
          (cleanup.blocksKeptInUse > 0 || cleanup.assetsKeptInUse > 0
            ? ` (${(cleanup.blocksKeptInUse || 0) + (cleanup.assetsKeptInUse || 0)} in-use items kept)`
            : '')
        );
      } else if (status === 'no_coverage') {
        vaniToast.warning('No knowledge-tree coverage for your industries — nothing was seeded.');
      } else {
        vaniToast.error(seed.statusDetail || 'Re-seed finished with errors — see recent activity below.');
      }
      await fetchOverview();
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Re-seed failed. Please try again.');
    } finally {
      setReseeding(null);
    }
  };

  // ── Sub-components ──────────────────────────────────────────────────────────

  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div
      className={`rounded-2xl border overflow-hidden ${className || ''}`}
      style={{
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.85)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: '0 4px 24px -4px rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </div>
  );

  const Stat: React.FC<{ label: string; value: React.ReactNode; warn?: boolean }> = ({ label, value, warn }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: warn ? '#d97706' : colors.utility.primaryText }}>{value}</span>
    </div>
  );

  const ReseedButton: React.FC<{ target: ReseedTarget; label: string; disabled?: boolean }> = ({ target, label, disabled }) => {
    const busy = reseeding === target;
    const confirming = confirmTarget === target;
    if (confirming) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: '#d97706' }}>
            Delete seeded data &amp; re-seed from your saved picks?
          </span>
          <button
            onClick={() => handleReseed(target)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: '#d97706' }}
          >Yes, re-seed</button>
          <button
            onClick={() => setConfirmTarget(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ color: colors.utility.secondaryText, borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
          >Cancel</button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setConfirmTarget(target)}
        disabled={disabled || reseeding !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})` }}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {busy ? 'Re-seeding…' : label}
      </button>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg border transition-colors"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: colors.utility.secondaryText }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="p-2.5 rounded-xl"
          style={{ background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.secondary || colors.brand.primary}15)` }}
        >
          <Database className="w-5 h-5" style={{ color: colors.brand.primary }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>Seed Data</h1>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Catalog &amp; registry data seeded from your industry knowledge tree — review and re-seed without redoing onboarding
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: colors.brand.primary }} />
        </div>
      ) : loadError ? (
        <Card>
          <div className="p-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{loadError}</p>
              <button onClick={() => { setLoading(true); fetchOverview(); }} className="text-xs underline mt-1" style={{ color: colors.brand.primary }}>
                Try again
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Catalog blocks */}
          <Card>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Catalog blocks</span>
              </div>
              <ReseedButton target="catalog" label="Re-seed catalog" />
            </div>
            <div className="px-5 py-3">
              <Stat label="Live environment" value={overview?.catalog.live ?? 0} />
              <Stat label="Test environment" value={overview?.catalog.test ?? 0} />
              <Stat label="Used by contracts (kept on re-seed)" value={overview?.catalog.in_use ?? 0} warn={(overview?.catalog.in_use ?? 0) > 0} />
            </div>
          </Card>

          {/* Registry assets */}
          <Card>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Registry assets</span>
              </div>
              <ReseedButton target="registry" label="Re-seed registry" disabled={(overview?.picks || []).every(p => p.purpose !== 'own')} />
            </div>
            <div className="px-5 py-3">
              <Stat label="Seeded entries" value={overview?.registry.total ?? 0} />
              <Stat label="Confirmed (live)" value={overview?.registry.live ?? 0} />
              <Stat label="Used by contracts (kept on re-seed)" value={overview?.registry.in_use ?? 0} warn={(overview?.registry.in_use ?? 0) > 0} />
            </div>
          </Card>

          {/* Resource picks (the durable intent the seed runs from) */}
          <Card>
            <div className="px-5 py-4 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Your resource picks</span>
              <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                Saved at onboarding — re-seeds always run from this list
              </p>
            </div>
            <div className="px-5 py-3">
              {(overview?.picks || []).length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: '#d97706' }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    No saved picks — re-seed will have nothing to work from. Picks are saved on the onboarding resource screen.
                  </span>
                </div>
              ) : (
                overview!.picks.map(p => (
                  <div key={`${p.resource_template_id}-${p.purpose}`} className="flex items-center justify-between py-1.5">
                    <span className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                      {p.template_name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ml-2"
                      style={{
                        background: p.purpose === 'sell' ? `${colors.brand.primary}18` : '#fffbeb',
                        color: p.purpose === 'sell' ? colors.brand.primary : '#d97706',
                      }}
                    >
                      {p.purpose === 'sell' ? 'I service this' : 'I own this'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent seed activity (t_seed_logs) */}
          <Card>
            <div className="px-5 py-4 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Recent seed activity</span>
            </div>
            <div className="px-5 py-3">
              {(overview?.last_seed_logs || []).length === 0 ? (
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>No seed runs recorded yet.</span>
              ) : (
                overview!.last_seed_logs.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    {l.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
                    ) : l.status === 'failed' ? (
                      <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#d97706' }} />
                    )}
                    <span className="text-xs truncate flex-1" style={{ color: colors.utility.primaryText }}>
                      {l.kt_name}
                    </span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
                      {l.status === 'success'
                        ? `${l.blocks_created} blocks · ${l.is_live ? 'live' : 'test'}`
                        : (l.skip_reason || l.error_message || l.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SeedDataPage;

// src/components/catalog-studio/BlockWizard/steps/metering/MeteringStep.tsx
//
// Authoring surface for a Credit Pack (metering) block — the platform-only
// block type used to build ContractNest's own plan templates.
//
// The whole point of this step is that the grant rate ("15 credits per
// contract") is CONFIGURATION, authored here by a human, and never a constant
// in application code.
//
// CHANNELS COME FROM THE LOV, NOT FROM THIS FILE.
// They are read from the `notification_channels` LOV in the platform tenant
// (/settings/lov), seeded by migration 011. useTenantMasterData filters on
// is_active, so only channels that are actually switched on are offered.
// Activating SMS or In-App later is a toggle in /settings/lov — no code change,
// no migration, no redeploy. Hardcoding the channel list here would have
// reintroduced exactly the coupling the LOV exists to remove.

import React from 'react';
import { Wallet, Gauge, Gift, ToggleRight, Info } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { useTenantMasterData } from '../../../../../hooks/queries/useProductMasterdata';

// The four modes a metering block can operate in. Kept deliberately small —
// each one maps to exactly one thing the settlement hook does when a platform
// contract is paid.
export type MeteringMode = 'limit' | 'per_contract' | 'one_time' | 'flag';

interface ChannelRow {
  sub_cat_name: string;   // 'whatsapp' | 'email' | 'sms' | 'inapp' — the KEY
  display_name: string;   // 'WhatsApp' | 'Email' | ...
  hexcolor?: string | null;
  sequence_no?: number;
}

interface MeteringStepProps {
  formData: {
    meteringMode?: MeteringMode;
    /** Per-channel credit grants, keyed by the LOV sub_cat_name. */
    meteringGrants?: Record<string, number>;
    /** Resource caps for the billing period. null/absent = unlimited. */
    meteringLimits?: Record<string, number | null>;
    /** Tenant-context flag to switch on, e.g. addon_vani_ai. */
    meteringFlag?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const MODES: Array<{
  id: MeteringMode;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    id: 'per_contract',
    label: 'Per Contract',
    icon: Gauge,
    description: 'Grant credits every time the tenant creates a contract. This is the recurring allowance in a plan.',
  },
  {
    id: 'limit',
    label: 'Limit',
    icon: Wallet,
    description: 'Cap what the tenant may create in the billing period. Blank means unlimited.',
  },
  {
    id: 'one_time',
    label: 'One Time',
    icon: Gift,
    description: 'Grant credits once, when the contract is paid. This is a top-up pack.',
  },
  {
    id: 'flag',
    label: 'Feature Flag',
    icon: ToggleRight,
    description: 'Switch on an add-on for the tenant, e.g. VaNi.',
  },
];

// Limits are resources, not channels, so they are a fixed set — they map to
// real columns on t_tenant_context rather than to LOV rows.
const LIMIT_FIELDS = [
  { key: 'contracts', label: 'Contracts' },
  { key: 'rfqs', label: 'RFQs' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'templates', label: 'Templates' },
  { key: 'users', label: 'Users' },
  { key: 'storage_mb', label: 'Storage (MB)' },
];

const FLAGS = [
  { key: 'addon_vani_ai', label: 'VaNi AI' },
  { key: 'addon_rfp', label: 'RFP / RFQ module' },
];

const MeteringStep: React.FC<MeteringStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const mode: MeteringMode = formData.meteringMode ?? 'per_contract';
  const grants = formData.meteringGrants ?? {};
  const limits = formData.meteringLimits ?? {};

  // ── Channels: from the LOV, active only ────────────────────────────────────
  const { data: channelResponse, isLoading: channelsLoading } =
    useTenantMasterData('notification_channels', true);

  const channels: ChannelRow[] = (channelResponse?.data as ChannelRow[] | undefined) ?? [];

  const setGrant = (channelKey: string, raw: string) => {
    const next = { ...grants };
    const value = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    next[channelKey] = value;
    onChange('meteringGrants', next);
  };

  const setLimit = (limitKey: string, raw: string) => {
    const next = { ...limits };
    // Blank means unlimited, which is NULL on t_tenant_context — never 0, and
    // never a large sentinel. A sentinel would still trip near-limit warnings
    // and would eventually run out.
    next[limitKey] = raw === '' ? null : Number(raw);
    onChange('meteringLimits', next);
  };

  const cardBase: React.CSSProperties = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 16,
  };

  return (
    <div className="space-y-6">
      {/* Mode ---------------------------------------------------------------- */}
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: colors.textPrimary }}>
          What does this block do?
        </h3>
        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
          Picked once. It decides what happens when a tenant pays for the contract this block sits on.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange('meteringMode', m.id)}
                className="text-left transition-all"
                style={{
                  ...cardBase,
                  borderColor: selected ? colors.brand?.primary ?? '#0EA5E9' : colors.border,
                  borderWidth: selected ? 2 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} style={{ color: selected ? colors.brand?.primary ?? '#0EA5E9' : colors.textSecondary }} />
                  <span className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                    {m.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {m.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-channel grants -------------------------------------------------- */}
      {(mode === 'per_contract' || mode === 'one_time') && (
        <div style={cardBase}>
          <h4 className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
            {mode === 'per_contract'
              ? 'Credits granted per contract created'
              : 'Credits granted once, on payment'}
          </h4>
          <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
            Each channel has its own pool. Grants accumulate — a pool at 9 plus a
            grant of 15 becomes 24. Credits are consumed, never expired.
          </p>

          {channelsLoading && (
            <p className="text-sm" style={{ color: colors.textSecondary }}>Loading channels…</p>
          )}

          {!channelsLoading && channels.length === 0 && (
            <div
              className="flex items-start gap-2 text-xs p-3 rounded"
              style={{ backgroundColor: colors.warning + '15', color: colors.textSecondary }}
            >
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                No active notification channels found. Channels are maintained in{' '}
                <strong>Settings → LOV → Notification Channels</strong>. Activate a channel
                there and it will appear here.
              </span>
            </div>
          )}

          <div className="space-y-2">
            {channels.map((ch) => (
              <div key={ch.sub_cat_name} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: ch.hexcolor || colors.textSecondary }}
                  />
                  <span className="text-sm" style={{ color: colors.textPrimary }}>
                    {ch.display_name}
                  </span>
                  <code className="text-[11px]" style={{ color: colors.textSecondary }}>
                    {ch.sub_cat_name}
                  </code>
                </div>
                <input
                  type="number"
                  min={0}
                  value={grants[ch.sub_cat_name] ?? ''}
                  onChange={(e) => setGrant(ch.sub_cat_name, e.target.value)}
                  placeholder="0"
                  className="w-24 px-2 py-1 rounded text-sm text-right"
                  style={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>
            ))}
          </div>

          {channels.length > 0 && (
            <p className="text-[11px] mt-3" style={{ color: colors.textSecondary }}>
              Channels come from the Notification Channels LOV. Only active channels are
              listed — switch one on in Settings → LOV and it appears here automatically.
            </p>
          )}
        </div>
      )}

      {/* Limits -------------------------------------------------------------- */}
      {mode === 'limit' && (
        <div style={cardBase}>
          <h4 className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
            Caps for the billing period
          </h4>
          <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
            Leave blank for unlimited. Counting starts when the contract activates.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {LIMIT_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2">
                <span className="text-sm" style={{ color: colors.textPrimary }}>{f.label}</span>
                <input
                  type="number"
                  min={0}
                  value={limits[f.key] ?? ''}
                  onChange={(e) => setLimit(f.key, e.target.value)}
                  placeholder="∞"
                  className="w-24 px-2 py-1 rounded text-sm text-right"
                  style={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flag ---------------------------------------------------------------- */}
      {mode === 'flag' && (
        <div style={cardBase}>
          <h4 className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
            Add-on to switch on
          </h4>
          <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
            Sets the flag on the tenant when the contract is paid, and clears it when it lapses.
          </p>
          <select
            value={formData.meteringFlag ?? ''}
            onChange={(e) => onChange('meteringFlag', e.target.value || undefined)}
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          >
            <option value="">Select an add-on…</option>
            {FLAGS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default MeteringStep;

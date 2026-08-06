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
// is_active, so only channels actually switched on are offered. Activating SMS
// or In-App later is a toggle in /settings/lov: no code change, no migration,
// no redeploy. Hardcoding the channel list here would have reintroduced exactly
// the coupling the LOV exists to remove.
//
// Every channel and every cap is an INDEPENDENT field — 15 WhatsApp and 10
// Email is entered as two separate values, not one shared number.

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
  display_name: string;
  hexcolor?: string | null;
  sequence_no?: number;
}

interface MeteringStepProps {
  formData: {
    meteringMode?: MeteringMode;
    /** Per-channel credit grants, keyed by the LOV sub_cat_name. */
    meteringGrants?: Record<string, number>;
    /** What the plan may CREATE. Absent or blank = 0, never unlimited. */
    meteringLimits?: Record<string, number>;
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
    description: 'Grant credits every time the tenant creates a contract. The recurring allowance in a plan.',
  },
  {
    id: 'limit',
    label: 'Limit',
    icon: Wallet,
    description: 'How many contracts or RFQs this plan may create. Blank is 0, not unlimited.',
  },
  {
    id: 'one_time',
    label: 'One Time',
    icon: Gift,
    description: 'Grant credits once, when the contract is paid. A top-up pack.',
  },
  {
    id: 'flag',
    label: 'Feature Flag',
    icon: ToggleRight,
    description: 'Switch on an add-on for the tenant, e.g. VaNi.',
  },
];

// Only CREATION is billed, so only creation is capped. The product charges
// the party that creates a contract or an RFQ; the counterparty consumes it
// for free, and contacts / users / templates are not chargeable events, so
// they carry no cap at all.
//
// Contracts is the seller's meter, RFQs is the buyer's — only a buyer raises
// an RFQ. A seller-side plan therefore sets Contracts and leaves RFQs at 0,
// and a buyer-side plan does the reverse.
const LIMIT_FIELDS = [
  { key: 'contracts', label: 'Contracts', hint: 'seller — contracts this plan may create' },
  { key: 'rfqs', label: 'RFQs', hint: 'buyer — RFQs this plan may raise' },
];

const FLAGS = [
  { key: 'addon_vani_ai', label: 'VaNi AI', description: 'Unlocks the VaNi assistant for this tenant' },
  { key: 'addon_rfp', label: 'RFP / RFQ module', description: 'Unlocks sourcing and vendor quotes' },
];

const MeteringStep: React.FC<MeteringStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Same input/label styling the rest of the wizard uses, so these read as
  // editable fields rather than static text.
  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };
  const labelStyle = { color: colors.utility.primaryText };
  const inputClass =
    'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all';

  const mode: MeteringMode = formData.meteringMode ?? 'per_contract';
  const grants = formData.meteringGrants ?? {};
  const limits = formData.meteringLimits ?? {};

  // ── Channels: from the LOV, active only ────────────────────────────────────
  const { data: channelResponse, isLoading: channelsLoading } =
    useTenantMasterData('notification_channels', true);

  // transformMasterData preserves sub_cat_name / display_name / hexcolor.
  const channels: ChannelRow[] = (channelResponse?.data as ChannelRow[] | undefined) ?? [];

  const setGrant = (channelKey: string, raw: string) => {
    const next = { ...grants };
    if (raw === '') {
      delete next[channelKey];
    } else {
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0) return;
      next[channelKey] = value;
    }
    onChange('meteringGrants', next);
  };

  const setLimit = (limitKey: string, raw: string) => {
    const next = { ...limits };
    // Blank means ZERO, not unlimited. There is no unlimited plan — every plan
    // states exactly what it may create, and t_tenant_context keeps the
    // balance sheet (granted vs consumed) against that number. Leaving RFQs
    // blank on a seller plan therefore means "may not raise RFQs", which is
    // the intent; treating blank as unlimited would have silently handed every
    // seller unlimited RFQs.
    //
    // NULL on t_tenant_context.limit_* is reserved for the exempt platform
    // tenant (billing_mode='exempt') and is never written from this screen.
    const value = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    next[limitKey] = value;
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
        <h3 className="text-base font-semibold mb-1" style={labelStyle}>
          What does this block do?
        </h3>
        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
          Decides what happens when a tenant pays for the contract this block sits on.
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
                  <Icon
                    size={16}
                    style={{ color: selected ? colors.brand?.primary ?? '#0EA5E9' : colors.textSecondary }}
                  />
                  <span className="font-medium text-sm" style={labelStyle}>{m.label}</span>
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
        <div>
          <h3 className="text-base font-semibold mb-1" style={labelStyle}>
            {mode === 'per_contract'
              ? 'Credits granted per contract created'
              : 'Credits granted once, on payment'}
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Each channel is set separately — e.g. 15 WhatsApp and 10 Email. Each has its
            own pool, and grants accumulate: a pool at 9 plus a grant of 15 becomes 24.
            Leave a channel blank to grant none of it.
          </p>

          {channelsLoading && (
            <p className="text-sm" style={{ color: colors.textSecondary }}>Loading channels…</p>
          )}

          {!channelsLoading && channels.length === 0 && (
            <div
              className="flex items-start gap-2 text-sm p-4 rounded-xl"
              style={{ backgroundColor: (colors.warning || '#D97706') + '15', color: colors.textSecondary }}
            >
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                No active notification channels found. Channels are maintained in{' '}
                <strong>Settings → LOV → Notification Channels</strong>. Activate one there
                and it will appear here.
              </span>
            </div>
          )}

          {channels.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {channels.map((ch) => (
                  <div key={ch.sub_cat_name}>
                    <label className="block text-sm font-medium mb-2" style={labelStyle}>
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                        style={{ backgroundColor: ch.hexcolor || colors.textSecondary }}
                      />
                      {ch.display_name}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="None"
                      value={grants[ch.sub_cat_name] ?? ''}
                      onChange={(e) => setGrant(ch.sub_cat_name, e.target.value)}
                      className={inputClass}
                      style={{ ...inputStyle, borderRadius: '0.75rem' }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: colors.textSecondary }}>
                Channels come from the Notification Channels LOV. Only active channels are
                listed — switch one on in Settings → LOV and it appears here automatically.
              </p>
            </>
          )}
        </div>
      )}

      {/* Limits -------------------------------------------------------------- */}
      {mode === 'limit' && (
        <div>
          <h3 className="text-base font-semibold mb-1" style={labelStyle}>
            What this plan may create
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Only creation is billed, so only creation is capped — the counterparty
            views and uses the record for free. Blank means <strong>0</strong>, not
            unlimited: a seller plan leaves RFQs at 0, a buyer plan leaves Contracts
            at 0. Counting starts when the contract activates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LIMIT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  {f.label}
                </label>
                <p className="text-xs mb-2" style={{ color: colors.textSecondary }}>{f.hint}</p>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={limits[f.key] ?? ''}
                  onChange={(e) => setLimit(f.key, e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, borderRadius: '0.75rem' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flag ---------------------------------------------------------------- */}
      {mode === 'flag' && (
        <div>
          <h3 className="text-base font-semibold mb-1" style={labelStyle}>
            Add-on to switch on
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Sets the flag on the tenant when the contract is paid, and clears it when it lapses.
          </p>
          {/* Cards rather than a dropdown — a bare select was not readable as a
              control, and there are only two options. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FLAGS.map((f) => {
              const selected = formData.meteringFlag === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onChange('meteringFlag', selected ? undefined : f.key)}
                  className="text-left transition-all"
                  style={{
                    ...cardBase,
                    borderColor: selected ? colors.brand?.primary ?? '#0EA5E9' : colors.border,
                    borderWidth: selected ? 2 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ToggleRight
                      size={16}
                      style={{ color: selected ? colors.brand?.primary ?? '#0EA5E9' : colors.textSecondary }}
                    />
                    <span className="font-medium text-sm" style={labelStyle}>{f.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    {f.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeteringStep;

// ============================================================================
// Settings → Configure → VaNi → Automation Rules — VaNi Rules v2
// The tenant's standing instructions to the automation engine (scanner v3,
// the group-session cron and the jtd-worker read these per tenant).
//
// v2 (2026-09-16, batch vani-automation-rules):
//   · TACIT VaNi status. Whether VaNi is on is a tenant-table truth
//     (t_tenants.vani_enabled via vani_is_enabled(), surfaced by the
//     tenant-context API as flags.vani_enabled). The page shows one status
//     line — on (with trial end if any) or off with a link to /vani/landing.
//     No toggle here; the landing page is the only lever. Rules stay
//     editable either way — they are the tenant's own instructions.
//   · Real field types. Rule fields are numbers, integer ARRAYS (schedules)
//     or strings. v1 assumed numbers only, so arrays rendered as "21" and
//     could not be saved. Arrays now get a chip editor bounded by the
//     template's constraints; strings are read-only platform settings.
//   · The payment ladder. "Payment reminders" holds the whole payment
//     schedule: one email N days BEFORE due (runs today) plus after-due rungs
//     — email / WhatsApp / call-task days past due — dispatched by the
//     collections tools (spec §4) as they ship. Presets are UI sugar over
//     the three arrays.
//   · Notifications grouped by area instead of one flat list.
//
// VIEW-FIRST (owner feedback, v1): cards show current values as text; one
// card at a time enters Edit mode with Save / Cancel / Reset-to-default.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  IndianRupee,
  FileSignature,
  Bell,
  Lock,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Sparkles,
  Pencil,
  X,
  Plus,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/hooks/queries/useTenantContext';
import {
  useVaniRules,
  useUpdateVaniRule,
  type VaniRule,
  type VaniRuleValue,
  type VaniRuleConstraint,
} from '@/hooks/queries/useVaniDeskQueries';

// ── Labels & grouping ───────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  lead_days: 'Days ahead',
  backlog_cutoff_days: 'Backlog cutoff (days)',
  email_days_after_due: 'Email',
  whatsapp_days_after_due: 'WhatsApp',
  call_days_after_due: 'Call task',
  days_before: 'Days before',
  hours_after_end: 'Hours after end',
  minutes_after_start: 'Minutes after start',
  app_base_url: 'Link base URL',
};

/** Same field name, more specific meaning on a particular rule. */
const RULE_FIELD_LABELS: Record<string, Record<string, string>> = {
  payment_reminder: { lead_days: 'Email, days before due' },
};

const labelFor = (ruleKey: string, field: string): string =>
  RULE_FIELD_LABELS[ruleKey]?.[field] || FIELD_LABELS[field] || field.replace(/_/g, ' ');

const DOMAIN_ORDER = ['services', 'finance', 'contracts', 'notifications'];

const DOMAIN_META: Record<string, { label: string; icon: React.ReactNode; hint?: string }> = {
  services: { label: 'Services', icon: <Wrench size={15} /> },
  finance: { label: 'Finance', icon: <IndianRupee size={15} /> },
  contracts: { label: 'Contracts', icon: <FileSignature size={15} /> },
  notifications: {
    label: 'Notifications',
    icon: <Bell size={15} />,
    hint: 'Each message type can be switched off for your customers and members. Timings shown are what the engine does today.',
  },
};

const NOTIF_GROUPS: Array<{ prefix: string; label: string }> = [
  { prefix: 'notif_group_session_', label: 'Group sessions' },
  { prefix: 'notif_payment_', label: 'Payments' },
  { prefix: 'notif_service_', label: 'Services' },
  { prefix: 'notif_beyond_scope', label: 'Services' },
  { prefix: 'notif_appointment_', label: 'Appointments' },
  { prefix: 'notif_contract_', label: 'Contracts' },
  { prefix: 'notif_rfq_', label: 'RFQs' },
];

const notifGroupOf = (ruleKey: string): string =>
  NOTIF_GROUPS.find((g) => ruleKey.startsWith(g.prefix))?.label ?? 'Other';

// ── The payment ladder ──────────────────────────────────────────────────────

const LADDER_RULE = 'payment_reminder';
const LADDER_FIELDS = ['email_days_after_due', 'whatsapp_days_after_due', 'call_days_after_due'] as const;
type LadderField = (typeof LADDER_FIELDS)[number];
const LADDER_CHANNEL: Record<LadderField, string> = {
  email_days_after_due: 'Email',
  whatsapp_days_after_due: 'WhatsApp',
  call_days_after_due: 'Call task',
};

const LADDER_PRESETS: Array<{ label: string; hint: string; values: Record<LadderField, number[]> }> = [
  {
    label: '0 / 3 / 7',
    hint: 'Email on the due day, day 3 and day 7 · WhatsApp on day 7 · call task on day 14',
    values: { email_days_after_due: [0, 3, 7], whatsapp_days_after_due: [7], call_days_after_due: [14] },
  },
  {
    label: 'Monthly',
    hint: 'Email on the due day, day 30 and day 60 · WhatsApp on days 30 and 60 · call task on day 90',
    values: { email_days_after_due: [0, 30, 60], whatsapp_days_after_due: [30, 60], call_days_after_due: [90] },
  },
  {
    label: 'None',
    hint: 'No after-due rungs — only the before-due email',
    values: { email_days_after_due: [], whatsapp_days_after_due: [], call_days_after_due: [] },
  },
];

interface Rung {
  day: number;
  channels: string[];
}

const buildRungs = (cfg: Record<string, VaniRuleValue>): Rung[] => {
  const byDay = new Map<number, string[]>();
  LADDER_FIELDS.forEach((field) => {
    asNumArray(cfg[field]).forEach((d) => byDay.set(d, [...(byDay.get(d) ?? []), LADDER_CHANNEL[field]]));
  });
  return Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, channels]) => ({ day, channels }));
};

// ── Value helpers ───────────────────────────────────────────────────────────

type FieldKind = 'number' | 'array' | 'string' | 'other';

const kindOf = (v: unknown): FieldKind =>
  Array.isArray(v) ? 'array' : typeof v === 'number' ? 'number' : typeof v === 'string' ? 'string' : 'other';

const isEditableKind = (k: FieldKind) => k === 'number' || k === 'array';

function asNumArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];
}

const normalizeDays = (arr: number[]): number[] =>
  Array.from(new Set(arr.map((n) => Math.round(n)))).sort((a, b) => a - b);

const unitFor = (field: string): ((n: number) => string) => {
  if (field.endsWith('_days_after_due')) return (n) => (n === 0 ? 'Due day' : `Day ${n}`);
  if (field === 'days_before') return (n) => `${n} day${n === 1 ? '' : 's'} before`;
  if (field === 'hours_after_end') return (n) => `${n} h after`;
  if (field === 'minutes_after_start') return (n) => `${n} min`;
  return (n) => String(n);
};

const formatValue = (field: string, v: VaniRuleValue | undefined): string => {
  if (v === undefined || v === null) return '—';
  if (Array.isArray(v)) {
    const u = unitFor(field);
    return v.length ? v.map(u).join(' · ') : 'none';
  }
  return String(v);
};

const validateField = (value: VaniRuleValue | undefined, c: VaniRuleConstraint | undefined): string | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'Enter a number';
    if (c?.min !== undefined && value < c.min) return `Minimum ${c.min}`;
    if (c?.max !== undefined && value > c.max) return `Maximum ${c.max}`;
    return null;
  }
  if (Array.isArray(value)) {
    if (c?.min_items !== undefined && value.length < c.min_items) return `At least ${c.min_items} entr${c.min_items === 1 ? 'y' : 'ies'}`;
    if (c?.max_items !== undefined && value.length > c.max_items) return `At most ${c.max_items} entries`;
    for (const n of value) {
      if (c?.min !== undefined && n < c.min) return `Values from ${c.min}`;
      if (c?.max !== undefined && n > c.max) return `Values up to ${c.max}`;
    }
    return null;
  }
  return null;
};

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Small components ────────────────────────────────────────────────────────

type ThemeColors = ReturnType<typeof useTheme>['currentTheme']['colors'];

const Chip: React.FC<{ colors: ThemeColors; strong?: boolean; children: React.ReactNode; title?: string }> = ({
  colors,
  strong,
  children,
  title,
}) => (
  <span
    title={title}
    style={{
      fontSize: 12,
      fontWeight: 600,
      padding: '5px 12px',
      borderRadius: 8,
      backgroundColor: strong ? `${colors.brand.primary}15` : `${colors.utility.secondaryText}12`,
      color: strong ? colors.brand.primary : colors.utility.primaryText,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

/** Chip editor for an integer-array field (days / hours / minutes). */
const DayListEditor: React.FC<{
  value: number[];
  onChange: (next: number[]) => void;
  constraint?: VaniRuleConstraint;
  unit: (n: number) => string;
  disabled?: boolean;
  colors: ThemeColors;
  autoFocus?: boolean;
}> = ({ value, onChange, constraint, unit, disabled, colors, autoFocus }) => {
  const [entry, setEntry] = useState('');
  const atMax = constraint?.max_items !== undefined && value.length >= constraint.max_items;

  const add = () => {
    if (entry.trim() === '') return;
    const n = Number(entry);
    if (!Number.isFinite(n)) return;
    onChange(normalizeDays([...value, n]));
    setEntry('');
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {value.map((n) => (
        <span
          key={n}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 6px 4px 10px',
            borderRadius: 8,
            backgroundColor: `${colors.brand.primary}15`,
            color: colors.brand.primary,
          }}
        >
          {unit(n)}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== n))}
            disabled={disabled}
            title="Remove"
            aria-label={`Remove ${unit(n)}`}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              padding: 2,
            }}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {value.length === 0 && (
        <span style={{ fontSize: 12, color: colors.utility.secondaryText }}>none</span>
      )}
      <input
        type="number"
        value={entry}
        min={constraint?.min}
        max={constraint?.max}
        disabled={disabled || atMax}
        autoFocus={autoFocus}
        placeholder={atMax ? 'max reached' : 'add'}
        onChange={(e) => setEntry(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        style={{
          width: 72,
          padding: '5px 8px',
          borderRadius: 8,
          fontSize: 12.5,
          border: `1px solid ${colors.brand.primary}60`,
          backgroundColor: colors.utility.primaryBackground,
          color: colors.utility.primaryText,
        }}
      />
      <button
        type="button"
        onClick={add}
        disabled={disabled || atMax || entry.trim() === ''}
        title="Add"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '5px 9px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          border: `1px solid ${colors.utility.secondaryText}35`,
          background: 'transparent',
          color: colors.utility.primaryText,
          cursor: disabled || atMax || entry.trim() === '' ? 'default' : 'pointer',
          opacity: disabled || atMax || entry.trim() === '' ? 0.6 : 1,
        }}
      >
        <Plus size={11} /> Add
      </button>
    </div>
  );
};

/** The payment schedule as one line of rungs — used in view mode and as the live preview while editing. */
const LadderView: React.FC<{ cfg: Record<string, VaniRuleValue>; colors: ThemeColors }> = ({ cfg, colors }) => {
  const lead = typeof cfg.lead_days === 'number' ? cfg.lead_days : null;
  const rungs = buildRungs(cfg);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {lead !== null && (
        <Chip colors={colors} strong title="Runs today">
          {lead === 0 ? 'On the due day' : `${lead} day${lead === 1 ? '' : 's'} before due`}: email
        </Chip>
      )}
      {rungs.length === 0 ? (
        <Chip colors={colors}>After due: nothing</Chip>
      ) : (
        rungs.map((r) => (
          <Chip key={r.day} colors={colors}>
            {r.day === 0 ? 'Due day' : `Day ${r.day}`}: {r.channels.join(' + ')}
          </Chip>
        ))
      )}
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const AutomationRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tacit VaNi status — the tenant-table truth via the tenant-context API.
  const tenantCtx = useTenantContext();
  const vaniOn = tenantCtx.data?.flags?.vani_enabled === true;
  const vaniUntil = tenantCtx.data?.vani?.until ?? null;

  const rulesQuery = useVaniRules();
  const updateMutation = useUpdateVaniRule();

  // One card in edit mode at a time; draft holds its field values + toggle
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<Record<string, VaniRuleValue>>({});
  const [draftEnabled, setDraftEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const rules = rulesQuery.data || [];
  const byDomain = useMemo(() => {
    const groups: Record<string, VaniRule[]> = {};
    rules.forEach((r) => {
      (groups[r.domain] = groups[r.domain] || []).push(r);
    });
    const known = DOMAIN_ORDER.filter((d) => groups[d]);
    const rest = Object.keys(groups).filter((d) => !DOMAIN_ORDER.includes(d)).sort();
    return [...known, ...rest].map((d) => [d, groups[d]] as const);
  }, [rules]);

  /** Fields the RPC can persist (numbers + integer arrays). Strings are platform settings — never sent. */
  const editableConfig = (rule: VaniRule, source: Record<string, VaniRuleValue>): Record<string, VaniRuleValue> => {
    const out: Record<string, VaniRuleValue> = {};
    Object.keys(rule.defaults).forEach((f) => {
      if (isEditableKind(kindOf(rule.defaults[f]))) {
        const v = source[f] ?? rule.defaults[f];
        out[f] = Array.isArray(v) ? normalizeDays(asNumArray(v)) : v;
      }
    });
    return out;
  };

  const startEdit = (rule: VaniRule) => {
    setEditingKey(rule.rule_key);
    setDraftConfig(editableConfig(rule, { ...rule.defaults, ...rule.config }));
    setDraftEnabled(rule.is_enabled);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftConfig({});
  };

  const save = async (rule: VaniRule, resetToDefault = false) => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        ruleKey: rule.rule_key,
        config: resetToDefault ? editableConfig(rule, rule.defaults) : editableConfig(rule, draftConfig),
        is_enabled: resetToDefault ? true : draftEnabled,
        expected_version: rule.version > 0 ? rule.version : undefined,
      });
      cancelEdit();
    } catch {
      // toasts handled by the mutation hook (409 also refetches)
    } finally {
      setSaving(false);
    }
  };

  if (rulesQuery.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (rulesQuery.isError) {
    return (
      <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center' }}>
        <AlertTriangle size={26} style={{ color: colors.semantic.error, marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: colors.utility.secondaryText, marginBottom: 16 }}>
          Automation rules could not be loaded.
        </p>
        <button
          onClick={() => rulesQuery.refetch()}
          style={{
            padding: '8px 20px', borderRadius: 8,
            border: `1px solid ${colors.utility.secondaryText}40`,
            background: 'transparent', color: colors.utility.primaryText,
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const linkButton: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 12.5, fontWeight: 650, color: '#fff', backgroundColor: colors.brand.primary,
  };

  const renderRuleCard = (rule: VaniRule) => {
    const fields = Object.keys(rule.defaults);
    const isEditing = editingKey === rule.rule_key;
    const isLadder = rule.rule_key === LADDER_RULE;
    const current: Record<string, VaniRuleValue> = { ...rule.defaults, ...rule.config };

    const errors: Record<string, string | null> = {};
    if (isEditing) {
      fields.forEach((f) => {
        if (isEditableKind(kindOf(rule.defaults[f]))) {
          errors[f] = validateField(draftConfig[f] ?? rule.defaults[f], rule.constraints?.[f]);
        }
      });
    }
    const hasErrors = Object.values(errors).some(Boolean);

    const setField = (field: string, value: VaniRuleValue) =>
      setDraftConfig((prev) => ({ ...prev, [field]: value }));

    const applyPreset = (values: Record<LadderField, number[]>) =>
      setDraftConfig((prev) => ({ ...prev, ...values }));

    const boundsHint = (c?: VaniRuleConstraint) =>
      c && (c.min !== undefined || c.max !== undefined) ? ` (${c.min ?? 0}–${c.max ?? '∞'})` : '';

    return (
      <Card key={rule.rule_key} style={{ marginBottom: 10, opacity: rule.is_enabled || isEditing ? 1 : 0.75 }}>
        <CardContent style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Name + description */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.utility.primaryText }}>
                  {rule.name}
                </span>
                <span
                  style={{
                    fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                    backgroundColor: rule.is_enabled ? `${colors.semantic.success}18` : `${colors.semantic.warning}18`,
                    color: rule.is_enabled ? colors.semantic.success : colors.semantic.warning,
                  }}
                >
                  {rule.is_enabled ? 'On' : 'Off'}
                </span>
                {rule.is_customized ? (
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                      backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary,
                    }}
                  >
                    customized
                  </span>
                ) : (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.utility.secondaryText }}>
                    default
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12.5, color: colors.utility.secondaryText, lineHeight: 1.5 }}>
                {rule.description}
              </p>
            </div>

            {/* ── VIEW MODE ── */}
            {!isEditing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
                {isLadder ? (
                  <LadderView cfg={current} colors={colors} />
                ) : (
                  fields.map((field) => (
                    <Chip key={field} colors={colors}>
                      {labelFor(rule.rule_key, field)}: <b>{formatValue(field, current[field])}</b>
                    </Chip>
                  ))
                )}
                <button
                  onClick={() => startEdit(rule)}
                  title="Edit this rule"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 650,
                    border: 'none', color: '#fff', backgroundColor: colors.brand.primary, cursor: 'pointer',
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
              </div>
            )}
          </div>

          {/* ── EDIT MODE ── */}
          {isEditing && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isLadder && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: colors.utility.secondaryText }}>Start from</span>
                  {LADDER_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.values)}
                      disabled={saving}
                      title={p.hint}
                      style={{
                        padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: `1px solid ${colors.utility.secondaryText}35`,
                        background: 'transparent', color: colors.utility.primaryText, cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <span style={{ fontSize: 11.5, color: colors.utility.secondaryText }}>then adjust any rung below</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {fields.map((field) => {
                  const kind = kindOf(rule.defaults[field]);
                  const c = rule.constraints?.[field];
                  const value = draftConfig[field] ?? rule.defaults[field];
                  const err = errors[field];
                  return (
                    <label
                      key={field}
                      style={{ fontSize: 11, color: colors.utility.secondaryText, fontWeight: 600, display: 'block' }}
                    >
                      <div style={{ marginBottom: 5 }}>
                        {labelFor(rule.rule_key, field)}
                        <span style={{ fontWeight: 400 }}>{boundsHint(c)}</span>
                        {isLadder && field.endsWith('_days_after_due') && (
                          <span style={{ fontWeight: 400 }}> · days after due</span>
                        )}
                      </div>

                      {kind === 'number' && (
                        <input
                          type="number"
                          value={typeof value === 'number' ? value : ''}
                          min={c?.min}
                          max={c?.max}
                          disabled={saving}
                          autoFocus={field === fields[0]}
                          onChange={(e) => setField(field, e.target.value === '' ? Number.NaN : Number(e.target.value))}
                          style={{
                            width: 100, padding: '7px 10px', borderRadius: 8, fontSize: 13,
                            border: `1px solid ${err ? colors.semantic.error : `${colors.brand.primary}60`}`,
                            backgroundColor: colors.utility.primaryBackground,
                            color: colors.utility.primaryText,
                          }}
                        />
                      )}

                      {kind === 'array' && (
                        <DayListEditor
                          value={asNumArray(value)}
                          onChange={(next) => setField(field, next)}
                          constraint={c}
                          unit={unitFor(field)}
                          disabled={saving}
                          colors={colors}
                          autoFocus={field === fields[0]}
                        />
                      )}

                      {(kind === 'string' || kind === 'other') && (
                        <span
                          title="Platform setting — not editable here"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8,
                            backgroundColor: `${colors.utility.secondaryText}12`, color: colors.utility.primaryText,
                          }}
                        >
                          <Lock size={11} /> {formatValue(field, value)}
                        </span>
                      )}

                      {err && (
                        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: colors.semantic.error }}>{err}</div>
                      )}
                    </label>
                  );
                })}

                <label style={{ fontSize: 11, color: colors.utility.secondaryText, fontWeight: 600 }}>
                  <div style={{ marginBottom: 6 }}>Active</div>
                  <button
                    type="button"
                    onClick={() => setDraftEnabled((v) => !v)}
                    disabled={saving}
                    title={draftEnabled ? 'Turn off' : 'Turn on'}
                    style={{
                      width: 44, height: 24, borderRadius: 20, border: 'none', position: 'relative',
                      cursor: 'pointer',
                      backgroundColor: draftEnabled ? colors.semantic.success : `${colors.utility.secondaryText}40`,
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute', top: 3, left: draftEnabled ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff',
                        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      }}
                    />
                  </button>
                </label>
              </div>

              {isLadder && (
                <div
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    backgroundColor: `${colors.utility.secondaryText}0c`,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.utility.secondaryText, letterSpacing: 0.3 }}>
                    PREVIEW
                  </span>
                  <LadderView cfg={{ ...rule.defaults, ...draftConfig }} colors={colors} />
                </div>
              )}

              {/* Action row */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  onClick={() => save(rule, true)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${colors.utility.secondaryText}35`,
                    background: 'transparent', color: colors.utility.secondaryText, cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} /> Reset to default
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${colors.utility.secondaryText}35`,
                    background: 'transparent', color: colors.utility.primaryText, cursor: 'pointer',
                  }}
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  onClick={() => save(rule)}
                  disabled={saving || hasErrors}
                  title={hasErrors ? 'Fix the highlighted values first' : 'Save'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 18px', borderRadius: 8, fontSize: 12, fontWeight: 650,
                    border: 'none', color: '#fff', backgroundColor: colors.brand.primary,
                    cursor: saving || hasErrors ? 'default' : 'pointer',
                    opacity: hasErrors ? 0.6 : 1,
                  }}
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}

          {isLadder && !isEditing && (
            <p style={{ marginTop: 10, fontSize: 11.5, color: colors.utility.secondaryText }}>
              The before-due email runs today. After-due rungs are dispatched by the collections tools as they ship.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 750, color: colors.utility.primaryText, marginBottom: 4 }}>
          Automation Rules
        </h1>
        <p style={{ fontSize: 13.5, color: colors.utility.secondaryText, lineHeight: 1.5 }}>
          Standing instructions for VaNi, the automation that runs your contracts — reminders,
          invoice drafts, appointment requests and customer notifications.
        </p>
      </div>

      {/* Tacit VaNi status — no toggle here; /vani/landing is the lever */}
      {tenantCtx.isSuccess && (vaniOn ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            backgroundColor: `${colors.semantic.success}12`,
          }}
        >
          <CheckCircle2 size={16} style={{ color: colors.semantic.success, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.utility.primaryText }}>
            VaNi is on{vaniUntil ? ` · until ${fmtDate(vaniUntil)}` : ''}
          </span>
          <span style={{ fontSize: 12.5, color: colors.utility.secondaryText }}>
            These rules run for you. Changes apply from the next run, within 15 minutes.
          </span>
          <button
            onClick={() => navigate('/vani/landing')}
            style={{
              marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 650, color: colors.brand.primary, padding: '4px 6px',
            }}
          >
            VaNi →
          </button>
        </div>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center',
                backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary, flexShrink: 0,
              }}
            >
              <PauseCircle size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.utility.primaryText }}>
                VaNi is off for this workspace
              </div>
              <div style={{ fontSize: 12.5, color: colors.utility.secondaryText }}>
                Automation is part of VaNi. Set your rules here any time; switch VaNi on to have them run for you.
              </div>
            </div>
            <button onClick={() => navigate('/vani/landing')} style={linkButton}>
              <Sparkles size={13} /> Open VaNi
            </button>
          </CardContent>
        </Card>
      ))}

      {/* Rule groups */}
      {byDomain.map(([domain, domainRules]) => {
        const meta = DOMAIN_META[domain];
        const isNotif = domain === 'notifications';
        const sections: Array<[string | null, VaniRule[]]> = isNotif
          ? Array.from(
              domainRules.reduce((m, r) => {
                const g = notifGroupOf(r.rule_key);
                m.set(g, [...(m.get(g) ?? []), r]);
                return m;
              }, new Map<string, VaniRule[]>()).entries()
            )
          : [[null, domainRules]];

        return (
          <div key={domain} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: meta?.hint ? 2 : 10 }}>
              <span style={{ color: colors.brand.primary }}>{meta?.icon ?? <Sparkles size={15} />}</span>
              <h2 style={{ fontSize: 14.5, fontWeight: 700, color: colors.utility.primaryText }}>
                {meta?.label ?? domain}
              </h2>
            </div>
            {meta?.hint && (
              <p style={{ fontSize: 12, color: colors.utility.secondaryText, marginBottom: 10 }}>{meta.hint}</p>
            )}

            {sections.map(([section, sectionRules]) => (
              <div key={section ?? '_'} style={{ marginBottom: section ? 12 : 0 }}>
                {section && (
                  <div
                    style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                      color: colors.utility.secondaryText, margin: '6px 0 8px',
                    }}
                  >
                    {section}
                  </div>
                )}
                {sectionRules.map(renderRuleCard)}
              </div>
            ))}
          </div>
        );
      })}

      <p style={{ fontSize: 11.5, color: colors.utility.secondaryText, textAlign: 'center', marginTop: 8 }}>
        Rules apply per workspace from the next automation run (every 15 minutes). Turning a rule
        off pauses that automation — nothing is deleted, and past actions are unaffected.
      </p>
    </div>
  );
};

export default AutomationRulesPage;

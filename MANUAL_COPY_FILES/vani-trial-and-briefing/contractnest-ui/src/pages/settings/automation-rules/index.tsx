// ============================================================================
// Settings → Configure → VaNi → Automation Rules — VaNi Rules v1
// The tenant's standing instructions to the automation engine (scanner v3
// reads these per tenant). Aligned free/paid line: rules are VISIBLE to every
// tenant (defaults run for everyone); EDITING needs a VaNi trial/subscription.
//
// VIEW-FIRST (owner feedback): cards show the current rule values as text.
// One card at a time enters Edit mode via the Edit button → inputs + toggle
// with Save / Cancel / Reset-to-default. Never "form mode" by default.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  IndianRupee,
  Lock,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Sparkles,
  Pencil,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useVaniRules,
  useUpdateVaniRule,
  useVaniEntitlement,
  type VaniRule,
} from '@/hooks/queries/useVaniDeskQueries';

const FIELD_LABELS: Record<string, string> = {
  lead_days: 'Days ahead',
  backlog_cutoff_days: 'Backlog cutoff (days)',
};

const DOMAIN_META: Record<string, { label: string; icon: React.ReactNode }> = {
  services: { label: 'Services', icon: <Wrench size={15} /> },
  finance: { label: 'Finance', icon: <IndianRupee size={15} /> },
};

const AutomationRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const entitlementQuery = useVaniEntitlement();
  const canEdit = entitlementQuery.data?.entitled === true;

  const rulesQuery = useVaniRules();
  const updateMutation = useUpdateVaniRule();

  // One card in edit mode at a time; draft holds its field values + toggle
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<Record<string, number>>({});
  const [draftEnabled, setDraftEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const rules = rulesQuery.data || [];
  const byDomain = useMemo(() => {
    const groups: Record<string, VaniRule[]> = {};
    rules.forEach((r) => {
      (groups[r.domain] = groups[r.domain] || []).push(r);
    });
    return groups;
  }, [rules]);

  const startEdit = (rule: VaniRule) => {
    setEditingKey(rule.rule_key);
    setDraftConfig({ ...rule.config });
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
        config: resetToDefault ? rule.defaults : draftConfig,
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

  if (rulesQuery.isLoading || entitlementQuery.isLoading) {
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

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 750, color: colors.utility.primaryText, marginBottom: 4 }}>
          Automation Rules
        </h1>
        <p style={{ fontSize: 13.5, color: colors.utility.secondaryText, lineHeight: 1.5 }}>
          Standing instructions for the automation that runs your contracts — reminders,
          invoice drafts and appointment requests. These are the values running for you right now
          {canEdit ? '; changes apply from the next automation run (within 15 minutes).' : '.'}
        </p>
      </div>

      {/* Locked banner (aligned free/paid line: read free, edit is VaNi) */}
      {!canEdit && (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center',
                backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary, flexShrink: 0,
              }}
            >
              <Lock size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.utility.primaryText }}>
                These rules are running for you at their defaults
              </div>
              <div style={{ fontSize: 12.5, color: colors.utility.secondaryText }}>
                Start the free 1-week VaNi trial to change how your virtual employee works.
              </div>
            </div>
            <button
              onClick={() => navigate('/vani/landing')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 650, color: '#fff', backgroundColor: colors.brand.primary,
              }}
            >
              <Sparkles size={13} /> Start free trial
            </button>
          </CardContent>
        </Card>
      )}

      {/* Rule groups */}
      {Object.entries(byDomain).map(([domain, domainRules]) => (
        <div key={domain} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <span style={{ color: colors.brand.primary }}>
              {DOMAIN_META[domain]?.icon ?? <Sparkles size={15} />}
            </span>
            <h2 style={{ fontSize: 14.5, fontWeight: 700, color: colors.utility.primaryText }}>
              {DOMAIN_META[domain]?.label ?? domain}
            </h2>
          </div>

          {domainRules.map((rule) => {
            const fields = Object.keys(rule.defaults);
            const isEditing = editingKey === rule.rule_key;

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

                    {/* ── VIEW MODE: current values as text + Edit button ── */}
                    {!isEditing && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {fields.map((field) => (
                          <span
                            key={field}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                              backgroundColor: `${colors.utility.secondaryText}12`,
                              color: colors.utility.primaryText,
                            }}
                          >
                            {FIELD_LABELS[field] || field.replace(/_/g, ' ')}:{' '}
                            <b>{rule.config[field] ?? rule.defaults[field]}</b>
                          </span>
                        ))}
                        <button
                          onClick={() => (canEdit ? startEdit(rule) : navigate('/vani/landing'))}
                          title={canEdit ? 'Edit this rule' : 'Editing needs a VaNi trial'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 650,
                            border: canEdit ? 'none' : `1px solid ${colors.utility.secondaryText}35`,
                            color: canEdit ? '#fff' : colors.utility.secondaryText,
                            backgroundColor: canEdit ? colors.brand.primary : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          {canEdit ? <Pencil size={12} /> : <Lock size={12} />} Edit
                        </button>
                      </div>
                    )}

                    {/* ── EDIT MODE: inputs + toggle ── */}
                    {isEditing && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {fields.map((field) => {
                          const bounds = rule.constraints?.[field] || {};
                          return (
                            <label key={field} style={{ fontSize: 11, color: colors.utility.secondaryText, fontWeight: 600 }}>
                              <div style={{ marginBottom: 4 }}>
                                {FIELD_LABELS[field] || field.replace(/_/g, ' ')}
                                {(bounds.min !== undefined || bounds.max !== undefined) && (
                                  <span style={{ fontWeight: 400 }}> ({bounds.min ?? 0}–{bounds.max ?? '∞'})</span>
                                )}
                              </div>
                              <input
                                type="number"
                                value={draftConfig[field] ?? ''}
                                min={bounds.min}
                                max={bounds.max}
                                disabled={saving}
                                autoFocus={field === fields[0]}
                                onChange={(e) =>
                                  setDraftConfig((prev) => ({ ...prev, [field]: Number(e.target.value) }))
                                }
                                style={{
                                  width: 100, padding: '7px 10px', borderRadius: 8, fontSize: 13,
                                  border: `1px solid ${colors.brand.primary}60`,
                                  backgroundColor: colors.utility.primaryBackground,
                                  color: colors.utility.primaryText,
                                }}
                              />
                            </label>
                          );
                        })}

                        <label style={{ fontSize: 11, color: colors.utility.secondaryText, fontWeight: 600 }}>
                          <div style={{ marginBottom: 6 }}>Active</div>
                          <button
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
                    )}
                  </div>

                  {/* Edit-mode action row */}
                  {isEditing && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                        disabled={saving}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 18px', borderRadius: 8, fontSize: 12, fontWeight: 650,
                          border: 'none', color: '#fff', backgroundColor: colors.brand.primary, cursor: 'pointer',
                        }}
                      >
                        {saving && <Loader2 size={12} className="animate-spin" />}
                        Save
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <p style={{ fontSize: 11.5, color: colors.utility.secondaryText, textAlign: 'center', marginTop: 8 }}>
        Rules apply per tenant from the next automation run (every 15 minutes). Turning a rule
        off pauses that automation — nothing is deleted, and past actions are unaffected.
      </p>
    </div>
  );
};

export default AutomationRulesPage;

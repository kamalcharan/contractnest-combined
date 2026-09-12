// src/components/contracts/FormFillModal.tsx
// B3.4 — the real form-fill behind the drawer's "Open Form" button.
// Renders the template's schema (sections → fields), binds the submission to
// ONE asset of the visit (server gate enforces this), then marks that asset
// proven — cascading visit → ticket completion server-side (B3.3).
// Auto-advances to the next unproven asset after each submission (D10).

import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, CheckCircle2, Lock, AlertTriangle, ClipboardList } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useFormTemplateDetail,
  useCreateFormSubmission,
} from '@/hooks/queries/useFormTemplates';
import type { FormSchemaField } from '@/hooks/queries/useFormTemplates';
import { useMarkEventAssetProven } from '@/hooks/queries/useContractEventQueries';
import type { ContractEventAssetRow } from '@/hooks/queries/useContractEventQueries';
import type { ContractEvent } from '@/types/contractEvents';

interface FormFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  formTemplateId: string;
  formName: string;
  serviceEvents: ContractEvent[];
  eventAssetsByEvent: Record<string, ContractEventAssetRow[]>;
}

const FormFillModal: React.FC<FormFillModalProps> = ({
  isOpen,
  onClose,
  contractId,
  formTemplateId,
  formName,
  serviceEvents,
  eventAssetsByEvent,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { data: template, isLoading: loadingTemplate, error: templateError } =
    useFormTemplateDetail(formTemplateId, { enabled: isOpen });
  const createSubmission = useCreateFormSubmission();
  const markProven = useMarkEventAssetProven(contractId);

  const [eventId, setEventId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const assets = useMemo(
    () => (eventId ? eventAssetsByEvent[eventId] || [] : []),
    [eventId, eventAssetsByEvent]
  );
  const provableAssets = useMemo(
    () => assets.filter((a) => a.status !== 'blocked_placeholder'),
    [assets]
  );
  const nextUnproven = (rows: ContractEventAssetRow[], excludeId?: string) =>
    rows.find((a) => a.status !== 'proven' && a.status !== 'blocked_placeholder' && a.id !== excludeId);

  // Initialize / reset when the modal opens: first service event, first
  // unproven asset of that event, empty responses.
  useEffect(() => {
    if (!isOpen) return;
    const firstEvent = serviceEvents[0]?.id || '';
    setEventId(firstEvent);
    const rows = firstEvent ? eventAssetsByEvent[firstEvent] || [] : [];
    setAssetId(nextUnproven(rows)?.id || '');
    setResponses({});
    setServerError(null);
    setValidationError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const sections = template?.schema?.sections || [];

  const setField = (fieldId: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    setValidationError(null);
  };

  const validate = (): string | null => {
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.validation?.required) {
          const v = responses[field.id];
          if (v === undefined || v === null || v === '') {
            return `"${field.label}" is required`;
          }
        }
      }
    }
    if (provableAssets.length > 0 && !assetId) {
      return 'Select which asset this form is for';
    }
    return null;
  };

  const handleSubmit = async () => {
    const invalid = validate();
    if (invalid) {
      setValidationError(invalid);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const submission = await createSubmission.mutateAsync({
        form_template_id: formTemplateId,
        service_event_id: eventId,
        contract_id: contractId,
        event_asset_id: assetId || undefined,
        responses,
      });

      if (assetId) {
        await markProven.mutateAsync({
          eventAssetId: assetId,
          formSubmissionId: submission?.id,
        });
      }

      // Auto-advance: same visit, next unproven asset — or done.
      const remaining = nextUnproven(provableAssets, assetId);
      if (assetId && remaining) {
        setAssetId(remaining.id);
        setResponses({});
      } else {
        onClose();
      }
    } catch (err: any) {
      setServerError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Submission failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormSchemaField) => {
    const value = (responses[field.id] as any) ?? '';
    const baseStyle = {
      backgroundColor: colors.utility.primaryBackground,
      borderColor: `${colors.utility.primaryText}15`,
      color: colors.utility.primaryText,
    };
    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setField(field.id, e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={baseStyle}
          >
            <option value="">Select…</option>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setField(field.id, e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
            style={baseStyle}
            placeholder={field.help_text || ''}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setField(field.id, e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={baseStyle}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setField(field.id, e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={baseStyle}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-sm" style={{ color: colors.utility.primaryText }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setField(field.id, e.target.checked)}
            />
            {field.help_text || field.label}
          </label>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setField(field.id, e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={baseStyle}
            placeholder={field.help_text || ''}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}10` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.brand.primary}10` }}
            >
              <ClipboardList className="w-4 h-4" style={{ color: colors.brand.primary }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                {template?.schema?.title || formName}
              </p>
              <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                Evidence form — one submission per asset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Guard: evidence needs a visit — without a service event there is
              nothing (and no equipment) to record against */}
          {serviceEvents.length === 0 && (
            <div
              className="flex items-start gap-2 rounded-lg border p-3 text-xs"
              style={{ borderColor: '#f59e0b40', backgroundColor: '#f59e0b10', color: '#b45309' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                No service visit in this drawer — add the service event (From Contract)
                first, then fill the evidence form for its equipment.
              </span>
            </div>
          )}

          {/* Which equipment: when the visit has no per-asset rows (legacy
              contracts), the form applies to the visit as a whole */}
          {serviceEvents.length > 0 && assets.length === 0 && (
            <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
              This visit has no per-equipment tracking — the form is recorded
              against the visit as a whole.
            </p>
          )}

          {/* Visit selector (only when the drawer holds several service events) */}
          {serviceEvents.length > 1 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.utility.secondaryText }}>
                Visit
              </p>
              <select
                value={eventId}
                onChange={(e) => {
                  const next = e.target.value;
                  setEventId(next);
                  const rows = eventAssetsByEvent[next] || [];
                  setAssetId(rows.find((a) => a.status !== 'proven' && a.status !== 'blocked_placeholder')?.id || '');
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}15`,
                  color: colors.utility.primaryText,
                }}
              >
                {serviceEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.block_name}{e.sequence_number > 0 ? ` #${e.sequence_number}/${e.total_occurrences}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Asset selector — which equipment this form proves */}
          {assets.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.utility.secondaryText }}>
                This form is for
              </p>
              <div className="flex flex-wrap gap-1.5">
                {assets.map((a) => {
                  const isProven = a.status === 'proven';
                  const isBlocked = a.status === 'blocked_placeholder';
                  const selected = assetId === a.id;
                  return (
                    <button
                      key={a.id}
                      disabled={isProven || isBlocked || submitting}
                      onClick={() => setAssetId(a.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-60"
                      style={{
                        backgroundColor: selected ? `${colors.brand.primary}12` : colors.utility.secondaryBackground,
                        borderColor: selected ? colors.brand.primary : `${colors.utility.primaryText}12`,
                        color: isProven ? colors.semantic.success : isBlocked ? '#d97706' : colors.utility.primaryText,
                      }}
                      title={isBlocked ? 'Awaiting asset — attach the real asset first' : undefined}
                    >
                      {isProven ? <CheckCircle2 className="w-3 h-3" /> : isBlocked ? <Lock className="w-3 h-3" /> : null}
                      {a.asset_name || a.asset_ref}
                      {isProven && <span className="text-[9px]">(proven)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schema */}
          {loadingTemplate ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
            </div>
          ) : templateError ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: colors.semantic.error }}>
              <AlertTriangle className="w-4 h-4" /> Could not load the form template
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                  {section.title}
                </p>
                {section.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                      {field.label}
                      {field.validation?.required && <span style={{ color: colors.semantic.error }}> *</span>}
                    </label>
                    {renderField(field)}
                    {field.help_text && field.type !== 'textarea' && field.type !== 'checkbox' && (
                      <p className="text-[10px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        {field.help_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}

          {(validationError || serverError) && (
            <div
              className="flex items-start gap-2 rounded-lg border p-3 text-xs"
              style={{ borderColor: `${colors.semantic.error}30`, backgroundColor: `${colors.semantic.error}08`, color: colors.semantic.error }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{validationError || serverError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex items-center gap-3 px-5 py-4 border-t"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}10` }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
            style={{ borderColor: `${colors.utility.primaryText}15`, color: colors.utility.primaryText }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loadingTemplate || !!templateError || serviceEvents.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {assetId
              ? `Submit & mark "${(assets.find((a) => a.id === assetId)?.asset_name || 'asset')}" proven`
              : 'Submit form'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormFillModal;

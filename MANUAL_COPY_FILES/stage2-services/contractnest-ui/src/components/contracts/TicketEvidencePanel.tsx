// src/components/contracts/TicketEvidencePanel.tsx
// Stage 2 — evidence CAPTURE for an existing service ticket.
// Renders inside ServiceTicketDetail:
//   - Upload evidence: file → storage API (uploadFile) → create_service_evidence
//   - Smart forms (policy = smart_form): fetch template schema → FormRenderer
//     modal → m_form_submissions + service-form evidence record
// The backend for all of this already existed (Stage 2 audit) — this panel is
// the missing wiring.

import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, FileText, Loader2, X, ClipboardList } from 'lucide-react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { useStorageManagement } from '@/hooks/useStorageManagement';
import { useCreateServiceEvidence } from '@/hooks/queries/useServiceExecution';
import { useFormSubmission } from '@/pages/settings/smart-forms/hooks/useFormSubmission';
import FormRenderer from '@/pages/settings/smart-forms/components/FormRenderer';
import type { ContractEvent } from '@/types/contractEvents';
import type { EvidenceSelectedForm, EvidencePolicyType } from '@/components/contracts/ServiceExecutionDrawer';

interface TicketEvidencePanelProps {
  ticketId: string;
  contractId: string;
  ticketStatus?: string;
  evidencePolicyType?: EvidencePolicyType;
  evidenceSelectedForms?: EvidenceSelectedForm[];
  events?: ContractEvent[];
  colors: any;
}

const TicketEvidencePanel: React.FC<TicketEvidencePanelProps> = ({
  ticketId,
  contractId,
  ticketStatus,
  evidencePolicyType = 'none',
  evidenceSelectedForms = [],
  events = [],
  colors,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeForm, setActiveForm] = useState<EvidenceSelectedForm | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const { uploadFile } = useStorageManagement();
  const createEvidence = useCreateServiceEvidence();
  const { createSubmission, updateSubmission } = useFormSubmission();

  const isClosed = ticketStatus === 'completed' || ticketStatus === 'cancelled';
  // Evidence rows link to the first service event on the ticket (if any)
  const primaryEvent = events.find((e) => e.event_type === 'service') || events[0];

  // ── Template schema for the form being filled ──
  const { data: templateData, isLoading: loadingTemplate } = useQuery({
    queryKey: ['smart-form-template', activeForm?.form_template_id],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SMART_FORMS.ADMIN.GET(activeForm!.form_template_id));
      return response.data?.data || response.data;
    },
    enabled: !!activeForm?.form_template_id,
    staleTime: 10 * 60_000,
  });

  // ── Upload evidence flow ──
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file || isUploading) return;

    setIsUploading(true);
    try {
      const stored = await uploadFile(file, 'service_evidence', {
        ticket_id: ticketId,
        contract_id: contractId,
      });
      if (!stored?.download_url) {
        throw new Error('Upload did not return a file URL');
      }

      // Success/error toasts come from the mutation hook itself
      await createEvidence.mutateAsync({
        ticketId,
        contract_id: contractId,
        event_id: primaryEvent?.id,
        block_id: (primaryEvent as any)?.block_id || undefined,
        block_name: (primaryEvent as any)?.block_name || undefined,
        evidence_type: 'upload-form',
        label: file.name,
        file_url: stored.download_url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      } as any);
    } catch (err: any) {
      vaniToast.error(`Upload failed: ${err?.message || 'unknown error'}`, { duration: 5000 });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Smart-form submit flow ──
  const handleFormSubmit = async (
    responses: Record<string, unknown>,
    computedValues: Record<string, unknown>
  ) => {
    if (!activeForm || isSubmittingForm) return;
    setIsSubmittingForm(true);
    try {
      // 1. Formal submission record (m_form_submissions)
      const submission = await createSubmission({
        form_template_id: activeForm.form_template_id,
        service_event_id: primaryEvent?.id || ticketId, // event when linked, ticket as fallback ref
        contract_id: contractId,
        responses,
        computed_values: computedValues,
      });
      if (submission?.id) {
        await updateSubmission(submission.id, { status: 'submitted' });
      }

      // 2. Evidence record on the ticket (service-form, carries the data;
      //    toast comes from the mutation hook)
      await createEvidence.mutateAsync({
        ticketId,
        contract_id: contractId,
        event_id: primaryEvent?.id,
        evidence_type: 'service-form',
        label: activeForm.name,
        form_data: {
          form_template_id: activeForm.form_template_id,
          form_template_name: activeForm.name,
          submission_id: submission?.id,
          responses,
          computed_values: computedValues,
        },
      } as any);

      vaniToast.success(`Form "${activeForm.name}" submitted`, { duration: 3000 });
      setActiveForm(null);
    } catch (err: any) {
      vaniToast.error(`Form submission failed: ${err?.message || 'unknown error'}`, { duration: 5000 });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (isClosed && evidencePolicyType === 'none') return null;

  return (
    <div className="space-y-3">
      <h4
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: colors.utility.secondaryText }}
      >
        Add Evidence
      </h4>

      {isClosed ? (
        <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
          Ticket is {ticketStatus} — evidence can no longer be added.
        </p>
      ) : (
        <>
          {/* ── Upload (always available on open tickets) ── */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full rounded-xl border-2 border-dashed p-4 text-center transition-all hover:shadow-sm"
            style={{
              borderColor: `${colors.brand.primary}30`,
              backgroundColor: colors.utility.secondaryBackground,
              opacity: isUploading ? 0.6 : 1,
            }}
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 mx-auto mb-1 animate-spin" style={{ color: colors.brand.primary }} />
            ) : (
              <Upload className="w-6 h-6 mx-auto mb-1" style={{ color: `${colors.brand.primary}80` }} />
            )}
            <p className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
              {isUploading ? 'Uploading…' : 'Upload evidence'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
              Photos, PDFs, documents
            </p>
          </button>

          {/* ── Smart forms from the contract evidence policy ── */}
          {evidencePolicyType === 'smart_form' && evidenceSelectedForms.length > 0 && (
            <div className="space-y-2">
              {[...evidenceSelectedForms]
                .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                .map((form, idx) => (
                  <div
                    key={form.form_template_id}
                    className="flex items-center gap-2 rounded-lg border p-2.5"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}10`,
                    }}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
                    <p className="text-xs font-medium flex-1 truncate" style={{ color: colors.utility.primaryText }}>
                      {idx + 1}. {form.name}
                    </p>
                    <button
                      onClick={() => setActiveForm(form)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                    >
                      Fill Form
                    </button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* ── Form-fill modal ── */}
      {activeForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl shadow-xl"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <div
              className="sticky top-0 flex items-center justify-between px-4 py-3 border-b z-10"
              style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}10` }}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  {activeForm.name}
                </p>
              </div>
              <button onClick={() => setActiveForm(null)} disabled={isSubmittingForm}>
                <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
              </button>
            </div>
            <div className="p-4">
              {loadingTemplate ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
                  <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    Loading form…
                  </span>
                </div>
              ) : templateData?.schema ? (
                <FormRenderer
                  schema={templateData.schema}
                  onSubmit={handleFormSubmit}
                  loading={isSubmittingForm}
                />
              ) : (
                <p className="text-sm py-6 text-center" style={{ color: colors.utility.secondaryText }}>
                  Could not load the form template.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketEvidencePanel;

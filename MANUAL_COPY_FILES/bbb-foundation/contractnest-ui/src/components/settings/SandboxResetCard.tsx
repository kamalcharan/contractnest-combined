// ============================================================================
// SandboxResetCard — clear the tenant's transactional data (Storage Space)
// ============================================================================
// Self-contained card for the Storage settings page. Shows how much
// transactional data exists, lets the user optionally include Contacts /
// Equipment, and — behind a danger confirmation — wipes it, keeping all
// masterdata / config / sequences. Any logged-in user can reset their OWN
// tenant (the API scopes the delete to x-tenant-id).

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

interface PreviewCounts {
  contracts: number; contract_events: number; invoices: number; appointments: number;
  service_tickets: number; form_submissions: number; session_attendance: number;
  payment_declarations: number; contacts: number; equipment: number;
}

const unwrap = (res: any) => res?.data?.data ?? res?.data;

const SandboxResetCard: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  const [counts, setCounts] = useState<PreviewCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeContacts, setIncludeContacts] = useState(false);
  const [includeEquipment, setIncludeEquipment] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      setCounts(unwrap(await api.get(API_ENDPOINTS.SANDBOX.PREVIEW)) as PreviewCounts);
    } catch {
      addToast({ type: 'error', title: 'Could not load', message: 'Failed to read transactional data counts.' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const coreTotal = counts
    ? counts.contracts + counts.contract_events + counts.invoices + counts.appointments +
      counts.service_tickets + counts.form_submissions + counts.session_attendance + counts.payment_declarations
    : 0;

  const doReset = async () => {
    setResetting(true);
    try {
      await api.post(API_ENDPOINTS.SANDBOX.RESET, {
        include_contacts: includeContacts,
        include_equipment: includeEquipment,
      });
      addToast({ type: 'success', title: 'Test data cleared', message: 'Transactional records were deleted. Masterdata and sequences are intact.' });
      setConfirmOpen(false);
      await loadPreview();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset failed', message: err?.response?.data?.message || 'Could not clear test data.' });
    } finally {
      setResetting(false);
    }
  };

  const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex items-center justify-between text-sm py-1">
      <span style={{ color: colors.utility.secondaryText }}>{label}</span>
      <span className="font-semibold" style={{ color: colors.utility.primaryText }}>{value}</span>
    </div>
  );

  return (
    <div className="rounded-xl border p-5" style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderColor: colors.semantic.error + '40',
    }}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-5 h-5" style={{ color: colors.semantic.error }} />
        <h3 className="font-semibold" style={{ color: colors.utility.primaryText }}>Sandbox — clear test data</h3>
        <button onClick={loadPreview} className="ml-auto p-1.5 rounded-md hover:opacity-80" title="Refresh counts"
          style={{ color: colors.utility.secondaryText }}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
        Deletes all <strong>transactional</strong> records — contracts, events, billing, invoices,
        appointments, tickets, form submissions and check-ins. <strong>Keeps</strong> your catalog,
        templates, categories, cadence &amp; tax settings, users, and contract numbering.
      </p>

      {loading && <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading counts…</p>}

      {counts && !loading && (
        <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: colors.utility.primaryBackground }}>
          <Stat label="Contracts" value={counts.contracts} />
          <Stat label="Contract events (service + billing)" value={counts.contract_events} />
          <Stat label="Invoices" value={counts.invoices} />
          <Stat label="Appointments" value={counts.appointments} />
          <Stat label="Service tickets" value={counts.service_tickets} />
          <Stat label="Form submissions" value={counts.form_submissions} />
          <Stat label="Session check-ins" value={counts.session_attendance} />
          <Stat label="Payment declarations" value={counts.payment_declarations} />
        </div>
      )}

      {/* Optional toggles */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.utility.primaryText }}>
          <input type="checkbox" checked={includeContacts} onChange={(e) => setIncludeContacts(e.target.checked)} />
          Also delete Contacts {counts ? `(${counts.contacts})` : ''} — members / leads
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.utility.primaryText }}>
          <input type="checkbox" checked={includeEquipment} onChange={(e) => setIncludeEquipment(e.target.checked)} />
          Also delete Equipment / asset data {counts ? `(${counts.equipment})` : ''}
        </label>
      </div>

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: colors.semantic.error }}
      >
        <Trash2 className="w-4 h-4" /> Clear test data
      </button>

      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doReset}
        isLoading={resetting}
        type="danger"
        title="Delete all transactional data?"
        confirmText="Yes, delete everything"
        cancelText="Cancel"
        description={
          <div style={{ color: colors.utility.secondaryText }}>
            <p>This permanently deletes <strong>{coreTotal}</strong> transactional records for this tenant
              {includeContacts ? `, plus ${counts?.contacts ?? 0} contacts` : ''}
              {includeEquipment ? `, plus ${counts?.equipment ?? 0} equipment records` : ''}.
            </p>
            <p className="mt-2">Masterdata, templates, settings and contract numbering are kept. This cannot be undone.</p>
          </div>
        }
      />
    </div>
  );
};

export default SandboxResetCard;

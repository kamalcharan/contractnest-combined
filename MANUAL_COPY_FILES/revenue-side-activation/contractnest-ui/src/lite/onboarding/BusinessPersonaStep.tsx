// src/lite/onboarding/BusinessPersonaStep.tsx
//
// Express screen 1 of 2. Collects the two things the seeding genuinely needs:
// the business name and the persona.
//
// Replaces four screens of the long flow (vani-intro, user-profile,
// business-details, persona-selection). The profile write is identical to the
// one PersonaSelectionStep performs — same endpoint, same dual-write of
// persona + business_type_id — so anything downstream reads the same data.

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

import ExpressShell from './ExpressShell';
import { PERSONAS, type PersonaId } from './expressFlow';

export const BusinessPersonaStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant } = useAuth();
  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });

  const [businessName, setBusinessName] = useState('');
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const [saving, setSaving] = useState(false);

  // Set when the perspective toggle's empty state sends an existing tenant
  // here to activate their other side (PerspectiveSwitchModal → AuthContext.
  // activatePendingPerspective). An expense-onboarded tenant activating
  // Revenue should keep their buyer half, so "Both" is the right default —
  // pre-selected, not forced; they can still change it.
  const activateSide = (location.state as { activateSide?: string } | null)?.activateSide;

  useEffect(() => {
    fetchProfile?.();
    // fetchProfile is stable in the existing hook; re-running would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed the fields from whatever is already known, so a tenant who lands here
  // twice never retypes.
  useEffect(() => {
    if (!businessName) {
      setBusinessName(formData?.business_name || currentTenant?.name || '');
    }
    const known = (formData as unknown as { persona?: PersonaId })?.persona
      || (formData?.business_type_id as PersonaId | undefined);
    // Side activation wins over the stored persona: a buyer adding their
    // Revenue side should land on "Both", not their old single-side answer.
    if (!persona && activateSide === 'revenue') setPersona('both');
    else if (!persona && known) setPersona(known);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, currentTenant]);

  const canContinue = businessName.trim().length >= 2 && !!persona && !saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      // POST = UPSERT on tenant_id. Dual-write persona + business_type_id,
      // matching PersonaSelectionStep — /settings/business-profile and
      // AuthContext.initializePerspective both read business_type_id.
      await api.post(API_ENDPOINTS.TENANTS.PROFILE, {
        business_name: businessName.trim(),
        persona,
        business_type_id: persona,
      });
      completeVaniStep('persona-selection', { persona });
      navigate('/start/serve');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Could not save — please try again';
      vaniToast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExpressShell
      persona={persona}
      title="Let's set up your workspace"
      subtitle="Two questions, then we build your catalog for you."
      footer={
        <button type="button" className="cnx-link" onClick={() => navigate('/start')}>
          ← Back
        </button>
      }
    >
      <label className="cnx-field">
        <span className="cnx-label">Business name</span>
        <input
          className="cnx-input"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. CoolAir Services"
          autoFocus
        />
      </label>

      <div className="cnx-field">
        <span className="cnx-label">What describes you best?</span>
        <div className="cnx-choices">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="cnx-choice"
              aria-pressed={persona === p.id}
              onClick={() => setPersona(p.id)}
            >
              <span className="cnx-ct">{p.title}</span>
              <span className="cnx-cd">{p.detail}</span>
            </button>
          ))}
        </div>
        <span className="cnx-hint">
          You can be both — many businesses are. This sets your whole workspace, and it is
          changeable later in Settings.
        </span>
      </div>

      <button
        type="button"
        className="cnx-btn cnx-primary"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        {saving ? <Loader2 className="cnx-spin" size={16} /> : null}
        {saving ? 'Saving…' : 'Continue'}
      </button>
    </ExpressShell>
  );
};

export default BusinessPersonaStep;

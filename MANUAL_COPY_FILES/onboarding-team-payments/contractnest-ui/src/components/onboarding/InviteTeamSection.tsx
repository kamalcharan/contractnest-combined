// src/components/onboarding/InviteTeamSection.tsx
// Optional "Invite your team" block on the onboarding "Your team" page.
//
// Sends through the SAME path as Settings → Users: useInvitations()
// .createInvitation → POST /api/users/invitations (which toasts success /
// failure itself). The payload mirrors InviteUserForm: email → method
// 'email'; mobile → method 'sms' with the national number + phone_code.
// role_id is the Roles LOV value id, exactly what the invite form sends.
//
// An invitee who accepts before the owner finishes onboarding is held on the
// "onboarding pending" page, so the copy says they can sign in once setup is
// finished.

import React, { useRef, useState } from 'react';
import { useInvitations } from '@/hooks/useInvitations';
import type { CreateInvitationData } from '@/hooks/useInvitations';
import MobileInput, { DEFAULT_MOBILE, MobileValue, mobileIsValid, mobileToE164 } from '@/components/common/MobileInput';
import { countries } from '@/utils/constants/countries';
import type { LovValue } from '@/hooks/useLovCategory';
import { VANI_TOKENS as T, VaniSpinner } from './VaniStepShell';

export interface SentInvite {
  to: string;
  roleName: string;
}

interface InviteRow {
  key: number;
  method: 'email' | 'mobile';
  email: string;
  mobile: MobileValue;
  roleId: string;
  error: string | null;
}

interface InviteTeamSectionProps {
  /** Roles a teammate can be given (Owner excluded by the caller) */
  roles: LovValue[];
  /** Why invite, in this business's words */
  reason: string;
  sent: SentInvite[];
  onSent: (invite: SentInvite) => void;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const InviteTeamSection: React.FC<InviteTeamSectionProps> = ({ roles, reason, sent, onSent }) => {
  const { createInvitation, submitting } = useInvitations({ autoLoad: false });
  const keyRef = useRef(1);
  const newRow = (): InviteRow => ({
    key: keyRef.current++, method: 'email', email: '', mobile: { ...DEFAULT_MOBILE }, roleId: '', error: null,
  });
  const [rows, setRows] = useState<InviteRow[]>(() => [newRow()]);
  const [sendingKey, setSendingKey] = useState<number | null>(null);

  const update = (key: number, patch: Partial<InviteRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const send = async (row: InviteRow) => {
    if (submitting || sendingKey !== null) return;
    const role = roles.find((r) => r.id === row.roleId) || roles[0];
    let to = '';
    const data: CreateInvitationData = { invitation_method: row.method === 'email' ? 'email' : 'sms' };

    if (row.method === 'email') {
      to = row.email.trim();
      if (!to) return update(row.key, { error: 'Enter their email first.' });
      if (!EMAIL_RE.test(to)) return update(row.key, { error: 'That email does not look right.' });
      data.email = to;
    } else {
      if (!row.mobile.number) return update(row.key, { error: 'Enter their mobile number first.' });
      if (!mobileIsValid(row.mobile)) return update(row.key, { error: 'Check the number — it is too short or too long for this country.' });
      to = mobileToE164(row.mobile);
      data.mobile_number = row.mobile.number;
      data.phone_code = countries.find((c) => c.code === row.mobile.countryCode)?.phoneCode;
    }
    if (sent.some((s) => s.to.toLowerCase() === to.toLowerCase())) {
      return update(row.key, { error: 'You have already invited this person.' });
    }
    if (role) data.role_id = role.id;

    setSendingKey(row.key);
    try {
      const result = await createInvitation(data);
      if (result) {
        onSent({ to, roleName: role?.DisplayName || 'Member' });
        setRows((prev) => {
          const rest = prev.filter((r) => r.key !== row.key);
          return rest.length ? rest : [newRow()];
        });
      }
      // On failure createInvitation has already shown the error toast.
    } finally {
      setSendingKey(null);
    }
  };

  const input: React.CSSProperties = {
    padding: '8px 10px', border: `1px solid ${T.BORDER}`, borderRadius: 8, fontSize: 13,
    background: T.WHITE, color: T.TEXT, fontFamily: T.FONT, outline: 'none', width: '100%',
  };

  return (
    <div style={{ borderTop: `1px dashed ${T.BORDER}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.TEXT }}>Invite your team</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, border: `1px solid ${T.BORDER}`, color: T.TEXT_DIM, fontFamily: T.MONO }}>
          optional
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: T.TEXT_DIM, margin: 0 }}>{reason}</p>

      {sent.map((s) => (
        <div key={s.to} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13,
          background: T.OK_SOFT, border: '1px solid #bbf7d0', borderRadius: 9, padding: '8px 10px', color: T.TEXT,
        }}>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>✓ Invite sent to <b>{s.to}</b> as {s.roleName}</span>
          <span style={{ fontSize: 11, color: T.OK, fontWeight: 700 }}>pending</span>
        </div>
      ))}

      {rows.map((row) => {
        const busy = sendingKey === row.key;
        return (
          <div key={row.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', border: `1px solid ${T.BORDER}`, borderRadius: 8, overflow: 'hidden', flex: '0 0 auto' }} role="group" aria-label="Invite by">
                {(['email', 'mobile'] as const).map((m) => (
                  <button key={m} onClick={() => update(row.key, { method: m, error: null })} disabled={busy}
                    aria-pressed={row.method === m}
                    style={{
                      padding: '8px 10px', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: T.FONT,
                      background: row.method === m ? T.VANI_SOFT : T.WHITE, color: row.method === m ? T.VANI : T.TEXT_DIM,
                    }}>
                    {m === 'email' ? 'Email' : 'Mobile'}
                  </button>
                ))}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                {row.method === 'email' ? (
                  <input type="email" value={row.email} disabled={busy} placeholder="name@company.com" aria-label="Their email"
                    onChange={(e) => update(row.key, { email: e.target.value, error: null })}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(row); }}
                    style={{ ...input, borderColor: row.error ? '#ef4444' : T.BORDER }} />
                ) : (
                  <MobileInput value={row.mobile} disabled={busy} label="Their mobile number"
                    onChange={(v) => update(row.key, { mobile: v, error: null })} onEnter={() => send(row)}
                    style={{ ...input, borderColor: row.error ? '#ef4444' : T.BORDER }} />
                )}
              </div>
              <select value={row.roleId || roles[0]?.id || ''} disabled={busy || roles.length === 0} aria-label="Role"
                onChange={(e) => update(row.key, { roleId: e.target.value })}
                style={{ ...input, width: 'auto', flex: '0 1 170px' }}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.DisplayName}</option>)}
              </select>
              <button onClick={() => send(row)} disabled={busy || sendingKey !== null}
                style={{
                  padding: '8px 16px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: T.FONT,
                  background: `linear-gradient(135deg, ${T.VANI}, ${T.VANI_2})`, color: '#fff', fontSize: 13, fontWeight: 700,
                  opacity: busy || sendingKey !== null ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 7,
                }}>
                {busy && <VaniSpinner size={12} />}
                Send invite
              </button>
            </div>
            {row.error && <span style={{ fontSize: 12, color: T.ERROR }}>{row.error}</span>}
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 12, color: T.TEXT_DIM }}>
        <button onClick={() => setRows((prev) => [...prev, newRow()])}
          style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: T.FONT }}>
          + Invite another person
        </button>
        <span>They can sign in once you finish setup. You can also invite later from Settings → Users.</span>
      </div>
    </div>
  );
};

export default InviteTeamSection;

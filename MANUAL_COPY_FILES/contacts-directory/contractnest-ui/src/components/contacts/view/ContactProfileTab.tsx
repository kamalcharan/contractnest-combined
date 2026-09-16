// ============================================================================
// ContactProfileTab — playground-approved grouping (2026-09-16)
// ============================================================================
// Cards match the approved contact-profile playground exactly:
//   CONTACT DETAILS (channels + address, one card, one edit flow)
//   LINKED CONTACTS (alternates/substitutes — editable via the product's
//   existing Alternative Contact Person section; see savePersons())
//   BUSINESS (company / designation / compliance, one edit flow)
//   TAGS & ROLES · NOTES · EXTERNAL DATA
// IDENTITY stays as its own inline-editable card (owner call, 2026-09-16):
// it owns salutation + name (company name for corporates); BUSINESS owns
// designation + compliance — no field is editable from two cards.
//
// Each section edits in place and saves only its own fields — the update RPC
// (update_contact_idempotent_v2) COALESCEs scalars and skips null arrays, so
// partial section saves never drop other data.
//
// Layout wrappers (SectionCard / EditBar / KV) live at MODULE scope on purpose:
// defining them inside the component recreates their type every render, which
// makes React remount the subtree and drop input focus while typing.

import React, { useState } from 'react';
import { Pencil, Check, X, Plus, Trash2, Phone, Mail, MapPin, Users, StickyNote, Tag, Hash, Briefcase, MessageCircle, UserRound } from 'lucide-react';
import { useUpdateContact, useCreateContact, type Contact } from '@/hooks/useContacts';
import ContactPersonsSection from '@/components/contacts/forms/ContactPersonsSection';
import { useMasterDataOptions } from '@/hooks/useMasterData';
import { vaniToast } from '@/components/common/toast';
import { countries, getPhoneLengthForCountry } from '@/utils/constants/countries';
import { validatePhoneByCountry, getPhonePlaceholder } from '@/utils/validation/contactValidation';
import { CONTACT_CLASSIFICATION_CONFIG, getClassificationThemeColor, SALUTATIONS, DEFAULT_SALUTATION } from '@/utils/constants/contacts';

// Fixed product classification colors/labels (same source as the directory)
const clsColor = (id: string) =>
  getClassificationThemeColor(CONTACT_CLASSIFICATION_CONFIG.find(c => c.id === id)?.colorKey || 'default').themeColor;
const clsLabel = (id: string) =>
  CONTACT_CLASSIFICATION_CONFIG.find(c => c.id === id)?.label || id;

interface Props {
  contact: Contact & { compliance_numbers?: any[] };
  colors: any;
  onSaved: () => void;
  readOnly?: boolean;
}

type SectionKey = 'identity' | 'details' | 'tags' | 'business' | 'notes' | 'persons';

const COUNTRY_LIST = [...countries].sort((a, b) => (a.code === 'IN' ? -1 : b.code === 'IN' ? 1 : a.name.localeCompare(b.name)));
const ccFromDial = (dial?: string) => COUNTRY_LIST.find(c => `+${c.phoneCode}` === dial || c.code === dial)?.code || 'IN';
const dialFromCc = (cc: string) => { const c = COUNTRY_LIST.find(x => x.code === cc); return c ? `+${c.phoneCode}` : undefined; };
// Stored channel values already carry the country's dial code baked in
// (e.g. "+919885164233") since messaging reminders read this value directly
// as the number to dial — but the edit/view UI also has its own country
// selector, so re-displaying the raw value duplicates it ("IN +9198…").
// Strip the dial code back off for display, only when the remaining digits
// are a plausible local number for that country (same safe-strip rule the
// backend normalizer uses) — an ambiguous/corrupted value is left as-is
// rather than risk chopping real digits off a valid number.
const localDigits = (value: string, cc: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  const country = COUNTRY_LIST.find(c => c.code === cc);
  if (!country) return digits;
  if (digits.startsWith(country.phoneCode)) {
    const rest = digits.slice(country.phoneCode.length);
    const { min, max } = getPhoneLengthForCountry(cc);
    if (rest.length >= min && rest.length <= max) return rest;
  }
  return digits;
};

const CHANNEL_LABELS: Record<string, string> = { mobile: 'Mobile', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email' };
const channelIcon = (type: string) =>
  type === 'email' ? Mail : type === 'whatsapp' ? MessageCircle : Phone;

const labelStyle = (colors: any): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: colors.utility.secondaryText });
const inputStyle = (colors: any): React.CSSProperties => ({ width: '100%', border: `1px solid ${colors.utility.primaryText}33`, background: colors.utility.primaryBackground, color: colors.utility.primaryText, borderRadius: 9, padding: '9px 11px', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' });

// ── module-scope wrappers (stable identity → inputs keep focus) ──
const SectionCard: React.FC<{
  colors: any; icon: React.ElementType; title: string; accent?: string; active?: boolean;
  onEdit?: () => void; editLabel?: string; children: React.ReactNode;
}> = ({ colors, icon: Icon, title, accent, active, onEdit, editLabel = 'Edit', children }) => (
  <section style={{
    background: colors.utility.secondaryBackground, borderRadius: 16, padding: 17,
    border: `1px solid ${active ? colors.brand.primary : colors.utility.primaryText + '12'}`,
    boxShadow: active ? `0 0 0 3px ${colors.brand.primary}1f` : 'none',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
      {/* Tinted icon chip — same accent language as /experience and the directory */}
      <span style={{
        width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none',
        color: accent || colors.utility.secondaryText,
        background: `${accent || colors.utility.secondaryText}16`,
        border: `1px solid ${accent || colors.utility.secondaryText}30`,
      }}>
        <Icon className="h-4 w-4" />
      </span>
      <h3 style={labelStyle(colors)}>{title}</h3>
      {onEdit && !active && (
        <button onClick={onEdit} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: colors.brand.primary, fontWeight: 750, fontSize: 12, cursor: 'pointer' }}>
          <Pencil className="h-3.5 w-3.5" />{editLabel}
        </button>
      )}
    </div>
    {children}
  </section>
);

const EditBar: React.FC<{ colors: any; loading: boolean; onSave: () => void; onCancel: () => void }> = ({ colors, loading, onSave, onCancel }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
    <button onClick={onSave} disabled={loading} style={{ background: colors.brand.primary, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 15px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check className="h-4 w-4" />{loading ? 'Saving…' : 'Save'}</button>
    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: colors.utility.secondaryText, fontWeight: 650, fontSize: 13, cursor: 'pointer', padding: '8px 8px', display: 'inline-flex', alignItems: 'center', gap: 5 }}><X className="h-4 w-4" />Cancel</button>
  </div>
);

const KV: React.FC<{ colors: any; k: string; children: React.ReactNode }> = ({ colors, k, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'start', padding: '6px 0' }}>
    <span style={{ color: colors.utility.secondaryText, fontSize: 12, fontWeight: 600 }}>{k}</span>
    <span style={{ color: colors.utility.primaryText, fontSize: 13.5 }}>{children}</span>
  </div>
);

// Playground row: icon · muted label · value (used by CONTACT DETAILS)
const DetailRow: React.FC<{ colors: any; icon: React.ElementType; label: string; children: React.ReactNode; trailing?: React.ReactNode }> = ({ colors, icon: Icon, label, children, trailing }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0' }}>
    <Icon className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText, flex: 'none', marginTop: 3 }} />
    <span style={{ color: colors.utility.secondaryText, fontSize: 12, fontWeight: 600, width: 76, flex: 'none', marginTop: 1 }}>{label}</span>
    <span style={{ color: colors.utility.primaryText, fontSize: 13.5, flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>{children}</span>
    {trailing}
  </div>
);

const FieldLabel: React.FC<{ colors: any; children: React.ReactNode }> = ({ colors, children }) => (
  <div style={{ ...labelStyle(colors), marginBottom: 5 }}>{children}</div>
);

// "member_id" -> "Member Id" — humanizes any key so future external_data
// keys show up correctly without new UI code.
const humanizeKey = (key: string): string =>
  key.split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

const ContactProfileTab: React.FC<Props> = ({ contact, colors, onSaved, readOnly = false }) => {
  const { mutate, loading } = useUpdateContact();
  const { mutate: createChild } = useCreateContact();
  // Linked-person saves fan out into several create/update calls, so they
  // carry their own loading flag instead of the single-update hook's.
  const [personsSaving, setPersonsSaving] = useState(false);
  const { options: tagLov } = useMasterDataOptions('Tags', {});
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<any>(null);

  const isCorp = contact.type === 'corporate';
  const addresses = (contact as any).addresses || (contact as any).contact_addresses || [];
  const persons = contact.contact_persons || [];
  const channels = contact.contact_channels || [];
  const compliance = (contact as any).compliance_numbers || [];
  const tags = (contact.tags || []) as any[];
  const externalData = Object.entries(contact.external_data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');

  const sparse = channels.length <= 1 && addresses.length === 0 && persons.length === 0
    && compliance.length === 0 && (contact.classifications || []).length === 0 && !contact.notes;

  const startEdit = (key: SectionKey, initial: any) => { setDraft(initial); setEditing(key); };
  // When archived, sections are locked read-only — only the header status
  // control (view.tsx) may still change the contact, so it can be reactivated.
  // Returning undefined (vs a no-op handler) also hides each SectionCard's
  // Edit affordance entirely, per SectionCard's `{onEdit && !active && ...}`.
  const editHandler = (key: SectionKey, initial: any) => (readOnly ? undefined : () => startEdit(key, initial));
  const cancel = () => { setEditing(null); setDraft(null); };
  const save = async (updates: any) => {
    try {
      await mutate({ contactId: contact.id, updates });
      vaniToast.success('Saved');
      setEditing(null); setDraft(null);
      onSaved();
    } catch (e: any) {
      vaniToast.error(e?.response?.data?.error || e?.message || 'Could not save');
    }
  };

  const input = inputStyle(colors);
  const kStyle: React.CSSProperties = { color: colors.utility.secondaryText, fontSize: 12, fontWeight: 600 };
  const vStyle: React.CSSProperties = { color: colors.utility.primaryText, fontSize: 13.5 };
  const bar = (onSave: () => void) => <EditBar colors={colors} loading={loading} onSave={onSave} onCancel={cancel} />;
  const info = colors.semantic?.info || '#3573E8';

  const detailsInitial = () => ({
    list: channels.map(c => {
      const cc = ccFromDial((c as any).country_code);
      const channelType = c.channel_type || 'mobile';
      return { channel_type: channelType, value: channelType === 'email' ? c.value : localDigits(c.value, cc), cc, is_primary: c.is_primary };
    }),
    a: addresses[0]
      ? { ...addresses[0], country_code: ccFromDial(addresses[0].country_code) }
      : { type: 'billing', address_line1: '', address_line2: '', city: '', state_code: '', country_code: 'IN', postal_code: '' },
  });

  // ── Linked contacts (Alternative Contact Person) ──────────────────────
  // Reuses the product's existing ContactPersonsSection (same UI as the
  // create-contact page). IMPORTANT: it can NOT be saved through the parent
  // update — update_contact_idempotent_v2 accepts p_contact_persons but its
  // body never reads it (verified live), which is why the old ProfileDrawer's
  // persons edit silently did nothing. Persons only persist at CREATE time
  // (create RPC inserts children: individual · team_member ·
  // parent_contact_ids=[parent]). So Save here diffs the draft and applies
  // each change through the paths that DO work:
  //   added   → POST /api/contacts (child with parent_contact_ids=[this])
  //   edited  → PUT  /api/contacts/:childId (fields + channels)
  //   removed → PUT  /api/contacts/:childId with parent_contact_ids: []
  //             (unlink, never delete — children are created with exactly
  //             one parent everywhere in the product, incl. check-in subs)
  const personsInitial = () => ({
    list: persons.map((p: any) => ({
      id: p.id,
      salutation: p.salutation || undefined,
      name: p.name || '',
      designation: p.designation || undefined,
      department: p.department || undefined,
      is_primary: false,
      contact_channels: (p.contact_channels || []).map((ch: any) => ({
        id: ch.id, channel_type: ch.channel_type, value: ch.value,
        country_code: ch.country_code || undefined,
        is_primary: !!ch.is_primary, is_verified: !!ch.is_verified,
      })),
      notes: p.notes || undefined,
    })),
  });

  const cleanPersonChannels = (list: any[]) =>
    (list || [])
      .filter((ch: any) => ch.channel_type && ch.value)
      .map((ch: any) => ({
        channel_type: ch.channel_type,
        value: ch.value,
        ...(ch.country_code ? { country_code: ch.country_code } : {}),
        is_primary: !!ch.is_primary,
        is_verified: !!ch.is_verified,
      }));

  // Normalized fingerprint — decides whether an existing person needs a PUT
  const personFingerprint = (p: any) => JSON.stringify({
    n: p.name || '', s: p.salutation || '', d: p.designation || '',
    dep: p.department || '', ch: cleanPersonChannels(p.contact_channels),
  });

  const savePersons = async () => {
    const isNew = (p: any) => !p.id || String(p.id).startsWith('temp_');
    const before = personsInitial().list;
    const after: any[] = (draft?.list || []).filter((p: any) => p.name);

    const added = after.filter(isNew);
    const kept = after.filter((p: any) => !isNew(p));
    const beforeById = new Map(before.map((p: any) => [p.id, p]));
    const edited = kept.filter((p: any) => beforeById.has(p.id) && personFingerprint(p) !== personFingerprint(beforeById.get(p.id)));
    const removed = before.filter((p: any) => !kept.some((k: any) => k.id === p.id));

    if (!added.length && !edited.length && !removed.length) { cancel(); return; }

    setPersonsSaving(true);
    const failures: string[] = [];
    for (const p of added) {
      try {
        // Same child shape the create RPC produces for create-time persons
        await createChild({
          type: 'individual',
          name: p.name,
          salutation: p.salutation,
          designation: p.designation,
          department: p.department,
          classifications: ['team_member'],
          tags: [],
          contact_channels: cleanPersonChannels(p.contact_channels) as any,
          notes: p.notes,
          parent_contact_ids: [contact.id],
          // Linked persons intentionally skip the duplicate gate — a stand-in
          // may legitimately share a phone with the member (family member)
          force_create: true,
        } as any);
      } catch (e: any) { failures.push(`${p.name}: ${e?.response?.data?.error || e?.message || 'create failed'}`); }
    }
    for (const p of edited) {
      try {
        await mutate({ contactId: p.id, updates: {
          name: p.name, salutation: p.salutation, designation: p.designation,
          department: p.department,
          contact_channels: cleanPersonChannels(p.contact_channels) as any,
        } });
      } catch (e: any) { failures.push(`${p.name}: ${e?.response?.data?.error || e?.message || 'update failed'}`); }
    }
    for (const p of removed) {
      try {
        await mutate({ contactId: p.id, updates: { parent_contact_ids: [] } as any });
      } catch (e: any) { failures.push(`${p.name}: ${e?.response?.data?.error || e?.message || 'unlink failed'}`); }
    }
    setPersonsSaving(false);

    if (failures.length) {
      vaniToast.error(`Some linked contacts failed: ${failures.join(' · ')}`);
    } else {
      vaniToast.success('Linked contacts saved');
    }
    setEditing(null); setDraft(null);
    onSaved();
  };

  return (
    // The floating ActionIsland was retired (2026-09-16) — its actions live
    // in the identity hero now — so no reserved space is needed at the bottom.
    <div className="p-6" style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>

        {/* ── IDENTITY — salutation + name (company for corporates) ── */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={UserRound} title="Identity" accent={colors.brand.primary} active={editing === 'identity'}
            onEdit={editHandler('identity', { salutation: contact.salutation || DEFAULT_SALUTATION, name: contact.name || '', company_name: contact.company_name || '' })}>
            {editing === 'identity' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!isCorp && (
                  <div><FieldLabel colors={colors}>Salutation</FieldLabel>
                    <select value={draft.salutation || DEFAULT_SALUTATION} onChange={e => setDraft({ ...draft, salutation: e.target.value })} style={input as any}>
                      {SALUTATIONS.map(sal => <option key={sal.value} value={sal.value}>{sal.label}</option>)}
                    </select></div>
                )}
                <div><FieldLabel colors={colors}>{isCorp ? 'Company name' : 'Full name'}</FieldLabel>
                  {isCorp
                    ? <input style={input} value={draft.company_name} onChange={e => setDraft({ ...draft, company_name: e.target.value })} />
                    : <input style={input} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />}</div>
                {bar(() => save(isCorp
                  ? { company_name: draft.company_name }
                  : { name: draft.name, salutation: draft.salutation || DEFAULT_SALUTATION }))}
              </div>
            ) : (
              <div>
                {!isCorp && contact.salutation && (
                  <KV colors={colors} k="Salutation">
                    {SALUTATIONS.find(sal => sal.value === contact.salutation)?.label || contact.salutation}
                  </KV>
                )}
                <KV colors={colors} k={isCorp ? 'Company' : 'Full name'}>{isCorp ? contact.company_name : contact.name}</KV>
                <KV colors={colors} k="Type">{isCorp ? 'Corporate' : 'Individual'}</KV>
                <KV colors={colors} k="Added">{new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</KV>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── CONTACT DETAILS — channels + address, one card (playground) ── */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={Phone} title="Contact details" accent={info} active={editing === 'details'}
            onEdit={editHandler('details', detailsInitial())}>
            {editing === 'details' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {draft.list.map((ch: any, i: number) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8, borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={ch.channel_type} onChange={e => { const l = [...draft.list]; l[i] = { ...ch, channel_type: e.target.value }; setDraft({ ...draft, list: l }); }} style={{ ...input, width: 110 }}>
                        {['mobile', 'email', 'whatsapp', 'phone'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {ch.channel_type !== 'email' && (
                        <select value={ch.cc} onChange={e => { const l = [...draft.list]; l[i] = { ...ch, cc: e.target.value }; setDraft({ ...draft, list: l }); }} style={{ ...input, width: 96 }}>
                          {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.code} +{c.phoneCode}</option>)}
                        </select>
                      )}
                      <button onClick={() => setDraft({ ...draft, list: draft.list.filter((_: any, x: number) => x !== i) })} style={{ background: 'none', border: 'none', color: colors.utility.secondaryText, cursor: 'pointer', padding: 6 }} title="Remove"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <input style={input} value={ch.value} placeholder={ch.channel_type === 'email' ? 'name@example.com' : getPhonePlaceholder(ch.cc)}
                      onChange={e => { const l = [...draft.list]; l[i] = { ...ch, value: e.target.value }; setDraft({ ...draft, list: l }); }} />
                  </div>
                ))}
                <button onClick={() => setDraft({ ...draft, list: [...draft.list, { channel_type: 'mobile', value: '', cc: 'IN', is_primary: draft.list.length === 0 }] })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: `1px dashed ${colors.utility.primaryText}33`, borderRadius: 9, padding: '8px', color: colors.utility.secondaryText, fontWeight: 650, fontSize: 13, cursor: 'pointer' }}>
                  <Plus className="h-4 w-4" /> Add channel
                </button>
                <FieldLabel colors={colors}>Address</FieldLabel>
                <input style={input} placeholder="Address line 1" value={draft.a.address_line1 || ''} onChange={e => setDraft({ ...draft, a: { ...draft.a, address_line1: e.target.value } })} />
                <input style={input} placeholder="Address line 2 (optional)" value={draft.a.address_line2 || ''} onChange={e => setDraft({ ...draft, a: { ...draft.a, address_line2: e.target.value } })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={input} placeholder="City" value={draft.a.city || ''} onChange={e => setDraft({ ...draft, a: { ...draft.a, city: e.target.value } })} />
                  <input style={{ ...input, width: 110 }} placeholder="PIN" value={draft.a.postal_code || ''} onChange={e => setDraft({ ...draft, a: { ...draft.a, postal_code: e.target.value } })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={input} placeholder="State code" value={draft.a.state_code || ''} onChange={e => setDraft({ ...draft, a: { ...draft.a, state_code: e.target.value } })} />
                  <select style={{ ...input, width: 110 }} value={draft.a.country_code || 'IN'} onChange={e => setDraft({ ...draft, a: { ...draft.a, country_code: e.target.value } })}>
                    {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                {bar(() => {
                  for (const ch of draft.list) {
                    if (ch.channel_type === 'email' || !ch.value) continue;
                    const v = validatePhoneByCountry(ch.value, ch.cc);
                    if (!v.isValid) { vaniToast.error(v.error || 'Invalid mobile number'); return; }
                  }
                  const list = draft.list.filter((c: any) => (c.value || '').trim()).map((c: any) => ({
                    channel_type: c.channel_type, value: c.value.trim(),
                    country_code: c.channel_type === 'email' ? undefined : dialFromCc(c.cc),
                    is_primary: c.is_primary,
                  }));
                  if (list.length && !list.some((c: any) => c.is_primary)) list[0].is_primary = true;
                  const hasAddr = [draft.a.address_line1, draft.a.city, draft.a.postal_code].some((v: string) => (v || '').trim());
                  save({
                    contact_channels: list,
                    ...(hasAddr ? { addresses: [{ ...draft.a, type: draft.a.type || 'billing', is_primary: true }] } : {}),
                  });
                })}
              </div>
            ) : (
              <div>
                {channels.length === 0 && addresses.length === 0 && (
                  <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No contact details yet.</div>
                )}
                {channels.map((c, i) => {
                  const RowIcon = channelIcon(c.channel_type);
                  const value = (c as any).country_code && c.channel_type !== 'email'
                    ? `${(c as any).country_code} ${localDigits(c.value, ccFromDial((c as any).country_code))}`
                    : c.value;
                  return (
                    <DetailRow key={i} colors={colors} icon={RowIcon} label={CHANNEL_LABELS[c.channel_type] || c.channel_type}
                      trailing={c.is_primary ? <span style={{ fontSize: 10, fontWeight: 800, color: colors.semantic.success, background: `${colors.semantic.success}18`, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', flex: 'none' }}>Primary</span> : undefined}>
                      {value}
                    </DetailRow>
                  );
                })}
                {addresses.map((a: any, i: number) => (
                  <DetailRow key={`addr-${i}`} colors={colors} icon={MapPin} label="Address">
                    {[a.address_line1, a.address_line2, a.city, a.postal_code].filter(Boolean).join(', ')}
                    <span style={{ color: colors.utility.secondaryText }}>{a.state_code ? ` · ${a.state_code}` : ''}</span>
                  </DetailRow>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── LINKED CONTACTS — alternates/stand-ins. Edit embeds the product's
            existing Alternative Contact Person section (ContactPersonsSection,
            same UI as the create page); persistence notes on savePersons(). ── */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={Users} title="Linked contacts" accent="#7C5AC2" active={editing === 'persons'}
            onEdit={editHandler('persons', personsInitial())}
            editLabel={persons.length === 0 ? 'Add' : 'Edit'}>
            {editing === 'persons' ? (
              <div>
                <ContactPersonsSection
                  value={draft.list}
                  onChange={(list: any) => setDraft({ list })}
                  contactType={contact.type}
                  disabled={personsSaving}
                />
                <EditBar colors={colors} loading={personsSaving} onSave={savePersons} onCancel={cancel} />
              </div>
            ) : persons.length === 0 ? (
              <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No alternate contacts yet. Add someone who can stand in for this person — substitutes captured at check-in also appear here.</div>
            ) : (
              <>
                {persons.map((p, i) => {
                  const role = (p.tags || []).find((t: any) => ['substitute', 'guest'].includes((t.tag_value || '').toLowerCase()));
                  const phone = (p.contact_channels || []).find(c => c.channel_type !== 'email');
                  return (
                    <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: i ? `1px solid ${colors.utility.primaryText}0d` : 'none' }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 750, fontSize: 12.5, color: '#7C5AC2', background: '#7C5AC222', flex: 'none' }}>{(p.name || '?').slice(0, 2).toUpperCase()}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...vStyle, fontWeight: 650 }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: colors.utility.secondaryText }}>{[role ? (role.tag_label || role.tag_value) : null, phone?.value || (p.contact_channels || [])[0]?.value].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                      {role && <span style={{ fontSize: 10.5, fontWeight: 750, color: '#7C5AC2', background: '#7C5AC222', padding: '3px 9px', borderRadius: 999, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C5AC2' }} />{role.tag_label || role.tag_value}</span>}
                    </div>
                  );
                })}
                <p style={{ fontSize: 11.5, color: colors.utility.secondaryText, lineHeight: 1.6, margin: '10px 0 0', borderTop: `1px solid ${colors.utility.primaryText}0d`, paddingTop: 10 }}>
                  Linked contacts also appear on the Contacts page when filtered by their tag.
                </p>
              </>
            )}
          </SectionCard>
        </div>

        {/* ── BUSINESS — company / designation / compliance, one card (playground) ── */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={Briefcase} title="Business" accent="#6366F1" active={editing === 'business'}
            editLabel={(isCorp || contact.designation || compliance.length) ? 'Edit' : 'Add'}
            onEdit={editHandler('business', {
              designation: contact.designation || '',
              gstin: compliance.find((c: any) => (c.type || c.label || '').toUpperCase().includes('GST'))?.value || '',
              pan: compliance.find((c: any) => (c.type || c.label || '').toUpperCase().includes('PAN'))?.value || '',
            })}>
            {editing === 'business' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><FieldLabel colors={colors}>Designation</FieldLabel>
                  <input style={input} value={draft.designation} onChange={e => setDraft({ ...draft, designation: e.target.value })} placeholder="e.g. Managing Partner" /></div>
                <div><FieldLabel colors={colors}>GSTIN</FieldLabel><input style={input} value={draft.gstin} onChange={e => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })} placeholder="22ABCDE1234F1Z5" /></div>
                <div><FieldLabel colors={colors}>PAN</FieldLabel><input style={input} value={draft.pan} onChange={e => setDraft({ ...draft, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></div>
                {bar(() => {
                  const arr: any[] = [];
                  if (draft.gstin.trim()) arr.push({ type: 'GSTIN', label: 'GSTIN', value: draft.gstin.trim() });
                  if (draft.pan.trim()) arr.push({ type: 'PAN', label: 'PAN', value: draft.pan.trim() });
                  save({ designation: draft.designation, compliance_numbers: arr });
                })}
              </div>
            ) : (
              <div>
                {contact.designation && <KV colors={colors} k="Designation">{contact.designation}</KV>}
                {compliance.map((c: any, i: number) => (
                  <KV colors={colors} key={i} k={c.type || c.label || 'Number'}><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{c.value}</span></KV>
                ))}
                {!contact.designation && compliance.length === 0 && (
                  <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No business details yet.</div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── TAGS & ROLES ── */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={Tag} title="Tags & roles" accent={colors.semantic?.warning || '#C77414'} active={editing === 'tags'}
            onEdit={editHandler('tags', { tags: tags.map(t => t.tag_value), classifications: [...(contact.classifications || [])] })}>
            {editing === 'tags' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel colors={colors}>Classifications</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['client', 'vendor', 'partner', 'supplier', 'customer', 'lead'].map(cl => {
                      const on = draft.classifications.includes(cl);
                      const c = clsColor(cl);
                      return <button key={cl} onClick={() => setDraft({ ...draft, classifications: on ? draft.classifications.filter((x: string) => x !== cl) : [...draft.classifications, cl] })}
                        style={{ textTransform: 'capitalize', fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                          border: `1px solid ${on ? c : colors.utility.primaryText + '30'}`, background: on ? `${c}18` : 'transparent', color: on ? c : colors.utility.secondaryText }}>{clsLabel(cl)}</button>;
                    })}
                  </div>
                </div>
                <div>
                  <FieldLabel colors={colors}>Tags</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {(tagLov || []).map((opt: any) => {
                      const on = draft.tags.includes(opt.value);
                      return <button key={opt.value} onClick={() => setDraft({ ...draft, tags: on ? draft.tags.filter((x: string) => x !== opt.value) : [...draft.tags, opt.value] })}
                        style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                          border: `1px solid ${on ? (opt.color || colors.brand.primary) : colors.utility.primaryText + '30'}`, background: on ? `${opt.color || colors.brand.primary}22` : 'transparent', color: on ? colors.utility.primaryText : colors.utility.secondaryText }}>
                        {opt.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color }} />}{opt.label}</button>;
                    })}
                    {(!tagLov || tagLov.length === 0) && <span style={{ fontSize: 12, color: colors.utility.secondaryText }}>No tags configured in master data.</span>}
                  </div>
                </div>
                {bar(() => {
                  const tagObjs = (tagLov || []).filter((o: any) => draft.tags.includes(o.value)).map((o: any) => ({ tag_value: o.value, tag_label: o.label, tag_color: o.color || undefined }));
                  save({ classifications: draft.classifications, tags: tagObjs });
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ ...kStyle, marginBottom: 7 }}>Classifications</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {(contact.classifications || []).length === 0 && <span style={{ fontSize: 12.5, color: colors.utility.secondaryText }}>None</span>}
                    {(contact.classifications || []).map(cl => { const c = clsColor(cl); return <span key={cl} style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${c}15`, color: c, border: `1px solid ${c}40` }}>{clsLabel(cl)}</span>; })}
                  </div>
                </div>
                <div>
                  <div style={{ ...kStyle, marginBottom: 7 }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {tags.length === 0 && <span style={{ fontSize: 12.5, color: colors.utility.secondaryText }}>None</span>}
                    {tags.map((t, i) => <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, background: `${t.tag_color || colors.brand.primary}1e`, color: colors.utility.primaryText }}>
                      {t.tag_color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.tag_color }} />}{t.tag_label || t.tag_value}</span>)}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── NOTES ── */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={StickyNote} title="Notes" accent={colors.brand.primary} active={editing === 'notes'} editLabel={contact.notes ? 'Edit' : 'Add'}
            onEdit={editHandler('notes', { notes: contact.notes || '' })}>
            {editing === 'notes' ? (
              <div>
                <textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} value={draft.notes} onChange={e => setDraft({ notes: e.target.value })} placeholder="Anything worth remembering about this contact…" />
                {bar(() => save({ notes: draft.notes }))}
              </div>
            ) : (
              <p style={{ ...vStyle, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{contact.notes || <span style={{ color: colors.utility.secondaryText }}>No notes yet.</span>}</p>
            )}
          </SectionCard>
        </div>

        {/* EXTERNAL DATA (read-only — populated only by import, never by create/edit) */}
        {externalData.length > 0 && (
          <div style={{ gridColumn: 'span 12' }} className="cn-col-12">
            <SectionCard colors={colors} icon={Hash} title="External Data">
              {externalData.map(([key, value]) => (
                <KV colors={colors} key={key} k={humanizeKey(key)}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{value}</span>
                </KV>
              ))}
            </SectionCard>
          </div>
        )}

        {/* enrich hint for sparse/guest contacts */}
        {sparse && (
          <div style={{ gridColumn: 'span 12', border: `1px dashed ${colors.utility.primaryText}2e`, borderRadius: 14, padding: 16, display: 'flex', gap: 13, alignItems: 'center', background: colors.utility.primaryBackground }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: `${colors.brand.primary}18`, color: colors.brand.primary, display: 'grid', placeItems: 'center', flex: 'none' }}><Plus className="h-5 w-5" /></span>
            <div style={{ fontSize: 13, color: colors.utility.secondaryText }}>
              <b style={{ color: colors.utility.primaryText }}>This is a light contact.</b> Likely captured from a session check-in. Add a classification, address or company above to turn it into a full record — or leave it as a guest.
            </div>
          </div>
        )}
      </div>

      <style>{`@media (max-width: 780px){ .cn-col, .cn-col-6, .cn-col-12 { grid-column: span 12 !important; } }`}</style>
    </div>
  );
};

export default ContactProfileTab;

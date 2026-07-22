// ============================================================================
// ContactProfileTab — identity-first profile with inline section edit
// ============================================================================
// Redesign of the contact detail: leads with WHO the contact is (channels,
// people, addresses, tags, compliance, notes) rather than analytics. Each
// section edits in place and saves only its own fields — the update RPC
// (update_contact_idempotent_v2) COALESCEs scalars and skips null arrays, so
// partial section saves never drop other data.
//
// Reuses existing infra only: useUpdateContact (PUT /api/contacts/:id),
// useMasterDataOptions('Tags') for the tag LOV, and the country/phone utils.
//
// Layout wrappers (SectionCard / EditBar / KV) live at MODULE scope on purpose:
// defining them inside the component recreates their type every render, which
// makes React remount the subtree and drop input focus while typing.

import React, { useState } from 'react';
import { Pencil, Check, X, Plus, Trash2, Phone, Mail, MapPin, Users, ShieldCheck, StickyNote, Tag, UserRound, Hash } from 'lucide-react';
import { useUpdateContact, type Contact } from '@/hooks/useContacts';
import { useMasterDataOptions } from '@/hooks/useMasterData';
import { vaniToast } from '@/components/common/toast';
import { countries, getPhoneLengthForCountry } from '@/utils/constants/countries';
import { validatePhoneByCountry, getPhonePlaceholder } from '@/utils/validation/contactValidation';

interface Props {
  contact: Contact & { compliance_numbers?: any[] };
  colors: any;
  onSaved: () => void;
  readOnly?: boolean;
}

type SectionKey = 'identity' | 'channels' | 'tags' | 'addresses' | 'compliance' | 'notes';

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

const labelStyle = (colors: any): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: colors.utility.secondaryText });
const inputStyle = (colors: any): React.CSSProperties => ({ width: '100%', border: `1px solid ${colors.utility.primaryText}33`, background: colors.utility.primaryBackground, color: colors.utility.primaryText, borderRadius: 9, padding: '9px 11px', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' });

// ── module-scope wrappers (stable identity → inputs keep focus) ──
const SectionCard: React.FC<{
  colors: any; icon: React.ElementType; title: string; active?: boolean;
  onEdit?: () => void; editLabel?: string; children: React.ReactNode;
}> = ({ colors, icon: Icon, title, active, onEdit, editLabel = 'Edit', children }) => (
  <section style={{
    background: colors.utility.secondaryBackground, borderRadius: 14, padding: 17,
    border: `1px solid ${active ? colors.brand.primary : colors.utility.primaryText + '12'}`,
    boxShadow: active ? `0 0 0 3px ${colors.brand.primary}1f` : 'none',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
      <Icon className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
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
  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'start', padding: '5px 0' }}>
    <span style={{ color: colors.utility.secondaryText, fontSize: 12, fontWeight: 600 }}>{k}</span>
    <span style={{ color: colors.utility.primaryText, fontSize: 13.5 }}>{children}</span>
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

  return (
    // Extra bottom padding — ActionIsland (Profile/Contract/Email/WhatsApp
    // pill) is position:fixed at the viewport bottom with no space of its
    // own reserved in the page; without this, the last section can end up
    // sitting directly under it on short-content contacts.
    <div className="p-6" style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>

        {/* IDENTITY */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={UserRound} title="Identity" active={editing === 'identity'}
            onEdit={editHandler('identity', { salutation: contact.salutation || '', name: contact.name || '', company_name: contact.company_name || '', designation: contact.designation || '' })}>
            {editing === 'identity' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!isCorp && (
                  <div><FieldLabel colors={colors}>Salutation</FieldLabel>
                    <select value={draft.salutation} onChange={e => setDraft({ ...draft, salutation: e.target.value })} style={input as any}>
                      {['', 'Mr', 'Ms', 'Mrs', 'Dr'].map(s => <option key={s} value={s}>{s || '—'}</option>)}
                    </select></div>
                )}
                <div><FieldLabel colors={colors}>{isCorp ? 'Company name' : 'Full name'}</FieldLabel>
                  {isCorp
                    ? <input style={input} value={draft.company_name} onChange={e => setDraft({ ...draft, company_name: e.target.value })} />
                    : <input style={input} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />}</div>
                <div><FieldLabel colors={colors}>Designation</FieldLabel>
                  <input style={input} value={draft.designation} onChange={e => setDraft({ ...draft, designation: e.target.value })} placeholder="e.g. Director" /></div>
                {bar(() => save(isCorp
                  ? { company_name: draft.company_name, designation: draft.designation }
                  : { name: draft.name, salutation: draft.salutation || undefined, designation: draft.designation }))}
              </div>
            ) : (
              <div>
                {!isCorp && contact.salutation && <KV colors={colors} k="Salutation">{contact.salutation}</KV>}
                <KV colors={colors} k={isCorp ? 'Company' : 'Full name'}>{isCorp ? contact.company_name : contact.name}</KV>
                <KV colors={colors} k="Type">{isCorp ? 'Corporate' : 'Individual'}</KV>
                {contact.designation && <KV colors={colors} k="Designation">{contact.designation}</KV>}
                <KV colors={colors} k="Added">{new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</KV>
              </div>
            )}
          </SectionCard>
        </div>

        {/* CHANNELS */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={Phone} title="Contact channels" active={editing === 'channels'}
            onEdit={editHandler('channels', { list: channels.map(c => {
              const cc = ccFromDial((c as any).country_code);
              const channelType = c.channel_type || 'mobile';
              return { channel_type: channelType, value: channelType === 'email' ? c.value : localDigits(c.value, cc), cc, is_primary: c.is_primary };
            }) })}>
            {editing === 'channels' ? (
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
                  save({ contact_channels: list });
                })}
              </div>
            ) : (
              <div>
                {channels.length === 0 && <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No channels yet.</div>}
                {channels.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderTop: i ? `1px solid ${colors.utility.primaryText}0d` : 'none' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: colors.utility.primaryBackground, display: 'grid', placeItems: 'center', color: colors.utility.secondaryText, flex: 'none' }}>
                      {c.channel_type === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...vStyle, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{(c as any).country_code && c.channel_type !== 'email' ? `${(c as any).country_code} ${localDigits(c.value, ccFromDial((c as any).country_code))}` : c.value}</div>
                      <div style={{ fontSize: 11.5, color: colors.utility.secondaryText, textTransform: 'capitalize' }}>{c.channel_type}</div>
                    </div>
                    {c.is_primary && <span style={{ fontSize: 10, fontWeight: 800, color: colors.semantic.success, background: `${colors.semantic.success}18`, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase' }}>Primary</span>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* TAGS & CLASSIFICATIONS */}
        <div style={{ gridColumn: 'span 4' }} className="cn-col">
          <SectionCard colors={colors} icon={Tag} title="Tags & roles" active={editing === 'tags'}
            onEdit={editHandler('tags', { tags: tags.map(t => t.tag_value), classifications: [...(contact.classifications || [])] })}>
            {editing === 'tags' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel colors={colors}>Classifications</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['client', 'vendor', 'partner', 'supplier', 'customer', 'lead'].map(cl => {
                      const on = draft.classifications.includes(cl);
                      return <button key={cl} onClick={() => setDraft({ ...draft, classifications: on ? draft.classifications.filter((x: string) => x !== cl) : [...draft.classifications, cl] })}
                        style={{ textTransform: 'capitalize', fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                          border: `1px solid ${on ? colors.brand.primary : colors.utility.primaryText + '30'}`, background: on ? `${colors.brand.primary}18` : 'transparent', color: on ? colors.brand.primary : colors.utility.secondaryText }}>{cl}</button>;
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
                    {(contact.classifications || []).map(cl => <span key={cl} style={{ textTransform: 'capitalize', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${colors.brand.primary}14`, color: colors.brand.primary }}>{cl}</span>)}
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

        {/* PEOPLE & ALTERNATES (read-only) */}
        {!sparse && (
          <div style={{ gridColumn: 'span 6' }} className="cn-col-6">
            <SectionCard colors={colors} icon={Users} title="People & alternates">
              {persons.length === 0 ? (
                <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No alternate contacts. Substitutes and stand-ins captured at check-in appear here.</div>
              ) : persons.map((p, i) => {
                const role = (p.tags || []).find((t: any) => ['substitute', 'guest'].includes((t.tag_value || '').toLowerCase()));
                const phone = (p.contact_channels || []).find(c => c.channel_type !== 'email');
                return (
                  <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: i ? `1px solid ${colors.utility.primaryText}0d` : 'none' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 750, fontSize: 12.5, color: '#7C5AC2', background: '#7C5AC222', flex: 'none' }}>{(p.name || '?').slice(0, 2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...vStyle, fontWeight: 650 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: colors.utility.secondaryText }}>{phone?.value || (p.contact_channels || [])[0]?.value || '—'}</div>
                    </div>
                    {role && <span style={{ fontSize: 10.5, fontWeight: 750, color: '#7C5AC2', background: '#7C5AC222', padding: '3px 9px', borderRadius: 999, textTransform: 'capitalize' }}>{role.tag_label || role.tag_value}</span>}
                  </div>
                );
              })}
            </SectionCard>
          </div>
        )}

        {/* ADDRESSES */}
        {!sparse && (
          <div style={{ gridColumn: 'span 6' }} className="cn-col-6">
            <SectionCard colors={colors} icon={MapPin} title="Addresses" active={editing === 'addresses'} editLabel={addresses.length ? 'Edit' : 'Add'}
              onEdit={editHandler('addresses', { a: addresses[0] ? { ...addresses[0], country_code: ccFromDial(addresses[0].country_code) } : { type: 'billing', address_line1: '', city: '', state_code: '', country_code: 'IN', postal_code: '' } })}>
              {editing === 'addresses' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input style={input} placeholder="Address line 1" value={draft.a.address_line1 || ''} onChange={e => setDraft({ a: { ...draft.a, address_line1: e.target.value } })} />
                  <input style={input} placeholder="Address line 2 (optional)" value={draft.a.address_line2 || ''} onChange={e => setDraft({ a: { ...draft.a, address_line2: e.target.value } })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={input} placeholder="City" value={draft.a.city || ''} onChange={e => setDraft({ a: { ...draft.a, city: e.target.value } })} />
                    <input style={{ ...input, width: 120 }} placeholder="PIN" value={draft.a.postal_code || ''} onChange={e => setDraft({ a: { ...draft.a, postal_code: e.target.value } })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={input} placeholder="State code" value={draft.a.state_code || ''} onChange={e => setDraft({ a: { ...draft.a, state_code: e.target.value } })} />
                    <select style={{ ...input, width: 120 }} value={draft.a.country_code || 'IN'} onChange={e => setDraft({ a: { ...draft.a, country_code: e.target.value } })}>
                      {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                  {bar(() => save({ addresses: [{ ...draft.a, type: draft.a.type || 'billing', is_primary: true }] }))}
                </div>
              ) : addresses.length === 0 ? (
                <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No address on file.</div>
              ) : (
                addresses.map((a: any, i: number) => (
                  <div key={i} style={{ padding: '6px 0' }}>
                    <div style={{ ...kStyle, textTransform: 'capitalize', marginBottom: 2 }}>{a.type || 'Address'}</div>
                    <div style={vStyle}>{[a.address_line1, a.address_line2, a.city, a.postal_code].filter(Boolean).join(', ')}
                      <span style={{ color: colors.utility.secondaryText }}>{a.state_code ? ` · ${a.state_code}` : ''}{a.country_code ? `, ${a.country_code}` : ''}</span></div>
                  </div>
                ))
              )}
            </SectionCard>
          </div>
        )}

        {/* COMPLIANCE */}
        {!sparse && (
          <div style={{ gridColumn: 'span 6' }} className="cn-col-6">
            <SectionCard colors={colors} icon={ShieldCheck} title="Compliance" active={editing === 'compliance'} editLabel={compliance.length ? 'Edit' : 'Add'}
              onEdit={editHandler('compliance', { gstin: compliance.find((c: any) => (c.type || c.label || '').toUpperCase().includes('GST'))?.value || '', pan: compliance.find((c: any) => (c.type || c.label || '').toUpperCase().includes('PAN'))?.value || '' })}>
              {editing === 'compliance' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><FieldLabel colors={colors}>GSTIN</FieldLabel><input style={input} value={draft.gstin} onChange={e => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })} placeholder="22ABCDE1234F1Z5" /></div>
                  <div><FieldLabel colors={colors}>PAN</FieldLabel><input style={input} value={draft.pan} onChange={e => setDraft({ ...draft, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></div>
                  {bar(() => {
                    const arr: any[] = [];
                    if (draft.gstin.trim()) arr.push({ type: 'GSTIN', label: 'GSTIN', value: draft.gstin.trim() });
                    if (draft.pan.trim()) arr.push({ type: 'PAN', label: 'PAN', value: draft.pan.trim() });
                    save({ compliance_numbers: arr });
                  })}
                </div>
              ) : compliance.length === 0 ? (
                <div style={{ color: colors.utility.secondaryText, fontSize: 13 }}>No compliance numbers.</div>
              ) : compliance.map((c: any, i: number) => (
                <KV colors={colors} key={i} k={c.type || c.label || 'Number'}><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{c.value}</span></KV>
              ))}
            </SectionCard>
          </div>
        )}

        {/* NOTES */}
        <div style={{ gridColumn: 'span 12' }} className="cn-col-12">
          <SectionCard colors={colors} icon={StickyNote} title="Notes" active={editing === 'notes'} editLabel={contact.notes ? 'Edit' : 'Add'}
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

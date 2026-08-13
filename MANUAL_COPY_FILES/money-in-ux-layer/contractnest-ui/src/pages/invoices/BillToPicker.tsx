// ============================================================================
// BillToPicker — the composer's contact chooser, purpose-built.
// ----------------------------------------------------------------------------
// Why not the shared ContactPicker: its collapsed click-to-open button reads
// as dead UI in the sidecar, and its dropdown was being clipped anyway. This
// one is an ALWAYS-VISIBLE search box: type a name OR a mobile number (the
// list RPC — bbb-foundation/045 — matches any channel value, digits-only),
// rows show the phone underneath, and the last row is always "+ Add new
// contact", opening the EXISTING QuickAddContactDrawer (the same one the
// Contract Wizard's buyer step uses) and selecting the created contact.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Check, Loader2, Phone } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContactList, useContact, type Contact } from '@/hooks/useContacts';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';

interface BillToPickerProps {
  value: string | undefined;
  onChange: (contactId: string | undefined, displayName?: string | null) => void;
}

const DEBOUNCE_MS = 300;

const phoneOf = (c: Contact): string | null => {
  const ch = (c as any).contact_channels as Array<{ channel_type: string; value: string }> | undefined;
  if (!ch?.length) return null;
  const hit = ch.find((x) => ['mobile', 'phone', 'whatsapp'].includes(x.channel_type)) || null;
  return hit?.value || null;
};
const nameOf = (c: Contact): string =>
  (c as any).company_name || (c as any).name || (c as any).displayName || 'Unnamed contact';

const BillToPicker: React.FC<BillToPickerProps> = ({ value, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const ink: React.CSSProperties = { color: colors.utility.primaryText };
  const sub: React.CSSProperties = { color: colors.utility.secondaryText };
  const brand = colors.brand.primary;
  const green = colors.semantic.success;

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const filters = useMemo(() => ({
    page: 1, limit: 8,
    search: debounced || undefined,
    status: 'active' as const,
    classifications: [] as string[],
    sort_by: 'created_at', sort_order: 'desc' as const,
  }), [debounced]);
  const { data: results, loading } = useContactList(filters);

  const { data: selected } = useContact(value || '');
  const selectedName = selected ? nameOf(selected as any) : null;

  // ── Add-contact: the EXISTING QuickAddContactDrawer, not a duplicate ──
  const [drawerOpen, setDrawerOpen] = useState(false);

  const inputStyle: React.CSSProperties = { ...ink, borderColor: `${colors.utility.primaryText}25`, backgroundColor: 'transparent' };

  // ── selected state: quiet confirmation + change affordance ──
  if (value && !query) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: `${green}45`, backgroundColor: `${green}0d` }}>
        <Check size={14} style={{ color: green }} className="flex-none" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate" style={ink}>{selectedName || 'Selected contact'}</p>
          {selected && phoneOf(selected as any) && (
            <p className="text-[11px] truncate" style={sub}>{phoneOf(selected as any)}</p>
          )}
        </div>
        <button onClick={() => onChange(undefined)} className="flex-none text-[11px] font-bold" style={{ color: brand }}>
          Change
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={sub} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or mobile number…"
          autoFocus={!value}
          className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs"
          style={inputStyle}
        />
      </div>

      {/* results render IN FLOW (not absolutely positioned) so no container
          can ever clip them — the earlier bug, permanently off the table */}
      <div className="mt-1.5 rounded-lg border overflow-hidden" style={{ borderColor: `${colors.utility.primaryText}14` }}>
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-xs" style={sub}>
            <Loader2 size={13} className="animate-spin" /> Searching…
          </div>
        ) : (
          <>
            {(results || []).map((c) => (
              <button key={(c as any).id}
                onClick={() => { onChange((c as any).id, nameOf(c as any)); setQuery(''); }}
                className="w-full px-3 py-2 text-left border-b last:border-b-0 hover:brightness-95"
                style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}0d` }}>
                <span className="block text-xs font-semibold truncate" style={ink}>{nameOf(c as any)}</span>
                <span className="block text-[11px] truncate" style={sub}>
                  {phoneOf(c as any) ? <><Phone size={9} className="inline mr-1" />{phoneOf(c as any)}</> : ((c as any).type === 'corporate' ? 'Company' : 'No number on file')}
                </span>
              </button>
            ))}
            {!loading && (results || []).length === 0 && debounced && (
              <p className="px-3 py-2.5 text-[11px]" style={sub}>No one matches “{debounced}”.</p>
            )}
            <button onClick={() => setDrawerOpen(true)}
              className="w-full px-3 py-2.5 text-left flex items-center gap-2 text-xs font-bold"
              style={{ color: brand, backgroundColor: `${brand}0d` }}>
              <UserPlus size={13} /> Add new contact{debounced ? ` — “${debounced}”` : ''}
            </button>
          </>
        )}
      </div>

      <QuickAddContactDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(contactId) => {
          setDrawerOpen(false);
          setQuery('');
          onChange(contactId);
        }}
      />
    </>
  );
};

export default BillToPicker;

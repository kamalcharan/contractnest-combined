// src/components/common/ContactPicker.tsx
// Async-search combobox for selecting a contact (Owner / Buyer)
// Uses the same useContactList / useContact hooks as the Contract Wizard Step 3

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, User, Building2, Loader2, ChevronsUpDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContactList, useContact, type Contact } from '@/hooks/useContacts';

interface ContactPickerProps {
  value: string | undefined;            // contact ID
  onChange: (contactId: string | undefined) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  /** Pre-filter by classification, e.g. ['buyer'] */
  classifications?: string[];
}

const DEBOUNCE_MS = 300;

const ContactPicker: React.FC<ContactPickerProps> = ({
  value,
  onChange,
  placeholder = 'Search contacts...',
  label,
  disabled = false,
  classifications,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Debounce search input ──
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // ── Fetch contacts list via useContactList (same as wizard) ──
  // Same filter approach as BuyerSelectionStep in the Contract Wizard
  const contactListFilters = useMemo(() => ({
    page: 1,
    limit: 20,
    search: debouncedSearch || undefined,
    classifications: classifications || [],
    status: 'active' as const,
    sort_by: 'created_at',
    sort_order: 'desc' as const,
  }), [debouncedSearch, classifications]);

  const { data: contacts, loading: listLoading } = useContactList(contactListFilters);

  // ── Fetch selected contact by ID via useContact (same as wizard) ──
  const { data: selectedContactData } = useContact(value || '');

  // ── Close on outside click ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Handlers ──
  const handleSelect = (contact: Contact) => {
    onChange(contact.id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setQuery('');
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Display name helper ──
  const getDisplayName = (contact: Contact): string => {
    if (contact.company_name) return contact.company_name;
    return contact.name || contact.displayName || 'Unnamed Contact';
  };

  const getSubline = (contact: Contact): string => {
    const parts: string[] = [];
    if (contact.company_name && contact.name) parts.push(contact.name);
    if (contact.designation) parts.push(contact.designation);
    const email = contact.contact_channels?.find((c: any) => c.channel_type === 'email')?.value;
    if (email) parts.push(email);
    return parts.join(' · ');
  };

  // ── Styles ──
  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${colors.utility.primaryText}20`,
    backgroundColor: colors.utility.primaryBackground,
    color: selectedContactData ? colors.utility.primaryText : colors.utility.secondaryText,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    minHeight: 38,
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 50,
    marginTop: 4,
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.primaryText}20`,
    borderRadius: 8,
    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    maxHeight: 300,
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.utility.primaryText, marginBottom: 4 }}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <div style={triggerStyle} onClick={handleOpen}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {selectedContactData ? (
            <>
              {selectedContactData.type === 'corporate'
                ? <Building2 size={14} style={{ flexShrink: 0, color: colors.brand.primary }} />
                : <User size={14} style={{ flexShrink: 0, color: colors.brand.primary }} />
              }
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getDisplayName(selectedContactData)}
              </span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selectedContactData && (
            <button
              onClick={handleClear}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: colors.utility.secondaryText, display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
          <ChevronsUpDown size={14} style={{ color: colors.utility.secondaryText }} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={dropdownStyle}>
          {/* Search input */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.utility.primaryText}12` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, company..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: colors.utility.primaryText,
                  fontSize: 13,
                  flex: 1,
                  width: '100%',
                }}
              />
              {listLoading && <Loader2 size={14} className="animate-spin" style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />}
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {contacts.length === 0 && !listLoading && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 13, color: colors.utility.secondaryText }}>
                {query ? 'No contacts found' : 'Type to search contacts'}
              </div>
            )}
            {contacts.map((contact: Contact) => {
              const isSelected = value === contact.id;
              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? `${colors.brand.primary}12` : 'transparent',
                    borderBottom: `1px solid ${colors.utility.primaryText}08`,
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}08`; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${colors.brand.primary}15`,
                    color: colors.brand.primary,
                  }}>
                    {contact.type === 'corporate' ? <Building2 size={15} /> : <User size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.utility.primaryText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getDisplayName(contact)}
                    </div>
                    {getSubline(contact) && (
                      <div style={{ fontSize: 11, color: colors.utility.secondaryText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getSubline(contact)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactPicker;

// src/components/common/TenantPicker.tsx
// Async-search combobox for selecting a tenant by name (not by pasting a UUID)
// Same debounce/dropdown pattern as ContactPicker.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, Loader2, ChevronsUpDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface TenantOption {
  id: string;
  name: string;
}

interface TenantPickerProps {
  value: TenantOption | undefined;
  onChange: (tenant: TenantOption | undefined) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

const TenantPicker: React.FC<TenantPickerProps> = ({
  value,
  onChange,
  placeholder = 'Search tenant by name...',
  label,
  disabled = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [results, setResults] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
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

  // ── Fetch matching tenants once the query reaches the minimum length ──
  useEffect(() => {
    if (debouncedSearch.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(API_ENDPOINTS.ADMIN.TENANT_MANAGEMENT.LIST_WITH_FILTERS({ search: debouncedSearch, limit: 20 }))
      .then((res) => {
        if (cancelled) return;
        const tenants = (res.data?.data || []) as Array<{ id: string; name: string }>;
        setResults(tenants.map((t) => ({ id: t.id, name: t.name })));
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

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

  const handleSelect = (tenant: TenantOption) => {
    onChange(tenant);
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

  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${colors.utility.primaryText}20`,
    backgroundColor: colors.utility.primaryBackground,
    color: value ? colors.utility.primaryText : colors.utility.secondaryText,
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

  const hint = query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH
    ? `Type at least ${MIN_QUERY_LENGTH} characters`
    : query.trim().length === 0
      ? 'Type to search tenants'
      : null;

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
          {value ? (
            <>
              <Building2 size={14} style={{ flexShrink: 0, color: colors.brand.primary }} />
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {value.name}
              </span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {value && (
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
                placeholder="Search by tenant name..."
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
              {loading && <Loader2 size={14} className="animate-spin" style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />}
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {hint && !loading && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 13, color: colors.utility.secondaryText }}>
                {hint}
              </div>
            )}
            {!hint && results.length === 0 && !loading && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 13, color: colors.utility.secondaryText }}>
                No tenants found
              </div>
            )}
            {results.map((tenant) => {
              const isSelected = value?.id === tenant.id;
              return (
                <div
                  key={tenant.id}
                  onClick={() => handleSelect(tenant)}
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
                    <Building2 size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.utility.primaryText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tenant.name}
                    </div>
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

export default TenantPicker;

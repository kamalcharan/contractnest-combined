// ============================================================================
// MobileInput — country code + national number, the way Contacts capture it
// ============================================================================
// One control for every public and in-app form that asks for a mobile number
// (checkout, VaNi's lead form, Add a lead). Country list, dial codes and the
// per-country length come from utils/constants/countries — the same source
// ContactChannelsSection uses — so what these forms send is byte-for-byte
// what a contact channel holds: country_code 'IN' + value '+919885164233'.
//
// Dependency-light on purpose: it renders inside embed.js iframes on third-
// party sites, so no theme context, no icon library; looks come from the
// caller through `style`/`className` (inline tokens on public pages, Tailwind
// classes in the app).

import React, { useMemo } from 'react';
import { countries, getPhoneLengthForCountry } from '@/utils/constants/countries';

export interface MobileValue {
  /** ISO 3166-1 alpha-2, e.g. 'IN' */
  countryCode: string;
  /** national number as typed (digits only are kept) */
  number: string;
}

export const DEFAULT_MOBILE: MobileValue = { countryCode: 'IN', number: '' };

/** '+919885164233' — what the API and t_contact_channels.value carry. */
export const mobileToE164 = (v: MobileValue): string => {
  const c = countries.find((x) => x.code === v.countryCode);
  const digits = (v.number || '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${c?.phoneCode || '91'}${digits}`;
};

/** Length check for the chosen country (India: exactly 10). */
export const mobileIsValid = (v: MobileValue): boolean => {
  const digits = (v.number || '').replace(/\D/g, '');
  const { min, max } = getPhoneLengthForCountry(v.countryCode);
  return digits.length >= min && digits.length <= max;
};

/** Split a stored '+91…' value back into the control's shape (best effort). */
export const mobileFromE164 = (raw: string | null | undefined, fallbackCountry = 'IN'): MobileValue => {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return { countryCode: fallbackCountry, number: '' };
  const sorted = [...countries].sort((a, b) => b.phoneCode.length - a.phoneCode.length);
  for (const c of sorted) {
    if (digits.startsWith(c.phoneCode)) {
      const rest = digits.slice(c.phoneCode.length);
      const { min, max } = getPhoneLengthForCountry(c.code);
      if (rest.length >= min && rest.length <= max) return { countryCode: c.code, number: rest };
    }
  }
  return { countryCode: fallbackCountry, number: digits };
};

export interface MobileInputProps {
  value: MobileValue;
  onChange: (v: MobileValue) => void;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** applied to both the select and the input (public pages pass inline tokens) */
  style?: React.CSSProperties;
  /** applied to both the select and the input (app pages pass Tailwind classes) */
  className?: string;
  /** wrapper */
  wrapStyle?: React.CSSProperties;
  onEnter?: () => void;
  /** aria-label for the number input when there is no visible label */
  label?: string;
}

const MobileInput: React.FC<MobileInputProps> = ({
  value, onChange, id, disabled, autoFocus, placeholder, style, className, wrapStyle, onEnter, label,
}) => {
  // India first (the only market today), then the rest alphabetically.
  const options = useMemo(() => {
    const rest = countries.filter((c) => c.code !== 'IN').sort((a, b) => a.name.localeCompare(b.name));
    const india = countries.find((c) => c.code === 'IN');
    return india ? [india, ...rest] : rest;
  }, []);
  const { max } = getPhoneLengthForCountry(value.countryCode);
  const dial = countries.find((c) => c.code === value.countryCode)?.phoneCode || '91';

  return (
    <div style={{ display: 'flex', gap: 8, ...wrapStyle }}>
      <select
        aria-label="Country code"
        value={value.countryCode}
        disabled={disabled}
        onChange={(e) => onChange({ countryCode: e.target.value, number: value.number })}
        className={className}
        style={{ ...style, width: 'auto', flex: '0 0 auto', paddingRight: 8 }}
        title={countries.find((c) => c.code === value.countryCode)?.name}
      >
        {options.map((c) => (
          <option key={c.code} value={c.code}>{c.code} +{c.phoneCode}</option>
        ))}
      </select>
      <input
        id={id}
        aria-label={label || 'Mobile number'}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value.number}
        placeholder={placeholder || (value.countryCode === 'IN' ? '98765 43210' : `number without +${dial}`)}
        onChange={(e) => onChange({ countryCode: value.countryCode, number: e.target.value.replace(/\D/g, '').slice(0, Math.max(max, 15)) })}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
        className={className}
        style={{ ...style, flex: 1, minWidth: 0 }}
      />
    </div>
  );
};

export default MobileInput;

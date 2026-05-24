// src/pages/onboarding/steps/UserProfileStep.tsx
// Screen 2 — User Profile.
// Collects first_name, last_name, country_code, mobile_number.
// Saves via PATCH /api/users/me then refreshData() to sync AuthContext.
// Navigate to /onboarding/business-details on Continue.
// No avatar — storage is not live until Screen 8 (VaNi Working).

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { Loader2, User, Phone, ChevronDown } from 'lucide-react';

// ── Country dial-code data ──────────────────────────────────────────────────
const DIAL_CODES = [
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: 'LK', dial: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: 'ID', dial: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
];

const DEFAULT_DIAL = DIAL_CODES[0]; // India

const UserProfileStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant, refreshData } = useAuth();
  const colors = currentTheme.colors;

  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [dialEntry, setDialEntry]     = useState(DEFAULT_DIAL);
  const [mobile, setMobile]           = useState('');
  const [isSaving, setIsSaving]       = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [vaniVisible, setVaniVisible] = useState(false);
  const [ddOpen, setDdOpen]           = useState(false);
  const [ddSearch, setDdSearch]       = useState('');
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme('vani');
    loadProfile();
  }, []);

  // Show VaNi reaction bubble as soon as first name has content
  useEffect(() => {
    if (firstName.trim().length > 0 && !vaniVisible) {
      setVaniVisible(true);
    }
  }, [firstName]);

  // Close dial-code dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDdOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadProfile = async () => {
    // Pre-fill from AuthContext first (instant)
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');

    // Fetch full user profile for mobile_number + country_code
    try {
      const res = await api.get(API_ENDPOINTS.USERS.ME);
      const profile = res.data?.data || res.data;
      if (profile?.mobile_number) setMobile(profile.mobile_number);
      if (profile?.country_code) {
        const found = DIAL_CODES.find(d => d.code === profile.country_code);
        if (found) setDialEntry(found);
      }
    } catch {
      // Silent — mobile/country fields simply stay empty
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    const trimFirst = firstName.trim();
    const trimLast  = lastName.trim();
    if (!trimFirst || isSaving) return;
    setIsSaving(true);
    try {
      await api.patch(API_ENDPOINTS.USERS.UPDATE_PROFILE, {
        first_name:    trimFirst,
        last_name:     trimLast,
        country_code:  dialEntry.code,
        mobile_number: mobile.trim(),
      });
      // Sync AuthContext so subsequent screens see the updated name
      if (refreshData) await refreshData();
      navigate('/onboarding/business-details');
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDials = DIAL_CODES.filter(d =>
    d.name.toLowerCase().includes(ddSearch.toLowerCase()) ||
    d.dial.includes(ddSearch)
  );

  const companyName = currentTenant?.name || 'your company';
  const isReady = firstName.trim().length > 0;

  // ── sub-components ──

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div
        style={{
          width: 36, height: 36, flexShrink: 0,
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 14, color: '#fff',
          boxShadow: `0 3px 8px ${colors.brand.primary}40`,
          marginTop: 2,
        }}
      >
        V
      </div>
      <div
        style={{
          background: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}14`,
          borderRadius: '3px 14px 14px 14px',
          padding: '14px 18px',
          boxShadow: `0 2px 12px ${colors.utility.primaryText}08`,
          fontSize: 14,
          color: colors.utility.secondaryText,
          lineHeight: 1.6,
          maxWidth: 520,
        }}
        dangerouslySetInnerHTML={{ __html: msg }}
      />
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: colors.utility.secondaryBackground,
    border: `1.5px solid ${colors.utility.primaryText}20`,
    borderRadius: 10,
    fontSize: 14,
    color: colors.utility.primaryText,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    transition: 'border-color .2s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: colors.utility.secondaryText,
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: 6,
  };

  return (
    <>
      <div
        style={{
          flex: 1,
          backgroundColor: colors.utility.primaryBackground,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 24px 140px',
          fontFamily: "'Outfit', sans-serif",
          minHeight: '100%',
        }}
      >
        <div style={{ width: '100%', maxWidth: 580 }}>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
            }}
          >
            Step 2 of 9
          </div>

          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
              color: colors.utility.primaryText, marginBottom: 6,
            }}
          >
            Tell me a bit about yourself
          </h2>
          <p
            style={{
              fontSize: 14, color: colors.utility.secondaryText,
              marginBottom: 32, lineHeight: 1.55,
            }}
          >
            VaNi will use your name to personalise every part of the setup.
          </p>

          {/* VaNi intro bubble */}
          <VaniBubble
            msg={`Let's start with <strong>you</strong>. What should I call you?`}
          />

          {isLoading ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '32px 0', color: colors.utility.secondaryText,
              }}
            >
              <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading your profile…</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={14}
                      style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        color: `${colors.utility.primaryText}40`,
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Charan"
                      style={{ ...inputStyle, paddingLeft: 32 }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = colors.brand.primary; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = `${colors.utility.primaryText}20`; }}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Kamal"
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = colors.brand.primary; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = `${colors.utility.primaryText}20`; }}
                  />
                </div>
              </div>

              {/* Mobile row */}
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <div style={{ display: 'flex', gap: 10 }}>

                  {/* Dial code selector */}
                  <div ref={ddRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => { setDdOpen(o => !o); setDdSearch(''); }}
                      style={{
                        height: '100%',
                        padding: '12px 10px',
                        background: colors.utility.secondaryBackground,
                        border: `1.5px solid ${ddOpen ? colors.brand.primary : `${colors.utility.primaryText}20`}`,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 14,
                        color: colors.utility.primaryText,
                        whiteSpace: 'nowrap',
                        transition: 'border-color .2s',
                        minWidth: 90,
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{dialEntry.flag}</span>
                      <span style={{ fontWeight: 700 }}>{dialEntry.dial}</span>
                      <ChevronDown
                        size={13}
                        style={{
                          color: colors.utility.secondaryText,
                          transform: ddOpen ? 'rotate(180deg)' : 'rotate(0)',
                          transition: 'transform .2s',
                        }}
                      />
                    </button>

                    {/* Dropdown */}
                    {ddOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          zIndex: 300,
                          background: colors.utility.secondaryBackground,
                          border: `1.5px solid ${colors.brand.primary}40`,
                          borderRadius: 12,
                          boxShadow: `0 12px 40px ${colors.utility.primaryText}18`,
                          width: 240,
                          maxHeight: 260,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Search */}
                        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                          <input
                            type="text"
                            value={ddSearch}
                            onChange={e => setDdSearch(e.target.value)}
                            placeholder="Search country…"
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: `${colors.utility.primaryText}08`,
                              border: `1px solid ${colors.utility.primaryText}15`,
                              borderRadius: 7,
                              fontSize: 12,
                              color: colors.utility.primaryText,
                              fontFamily: "'Outfit', sans-serif",
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        {/* List */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                          {filteredDials.map(d => (
                            <button
                              key={d.code}
                              type="button"
                              onClick={() => { setDialEntry(d); setDdOpen(false); }}
                              style={{
                                width: '100%',
                                padding: '9px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                background: d.code === dialEntry.code ? `${colors.brand.primary}10` : 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: "'Outfit', sans-serif",
                                transition: 'background .1s',
                              }}
                              onMouseEnter={e => {
                                if (d.code !== dialEntry.code) {
                                  (e.currentTarget as HTMLButtonElement).style.background = `${colors.utility.primaryText}06`;
                                }
                              }}
                              onMouseLeave={e => {
                                if (d.code !== dialEntry.code) {
                                  (e.currentTarget as HTMLButtonElement).style.background = 'none';
                                }
                              }}
                            >
                              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{d.flag}</span>
                              <span style={{ fontSize: 13, color: colors.utility.primaryText, flex: 1 }}>{d.name}</span>
                              <span style={{ fontSize: 12, color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace" }}>{d.dial}</span>
                            </button>
                          ))}
                          {filteredDials.length === 0 && (
                            <div style={{ padding: '16px 14px', fontSize: 13, color: colors.utility.secondaryText, textAlign: 'center' }}>
                              No match
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile input */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Phone
                      size={14}
                      style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        color: `${colors.utility.primaryText}40`,
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="9876543210"
                      style={{ ...inputStyle, paddingLeft: 32 }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = colors.brand.primary; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = `${colors.utility.primaryText}20`; }}
                    />
                  </div>
                </div>
              </div>

              {/* VaNi reaction bubble */}
              {isReady && (
                <div
                  style={{
                    marginTop: 4,
                    opacity: vaniVisible ? 1 : 0,
                    transform: vaniVisible ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'all .4s cubic-bezier(.22,1,.36,1)',
                  }}
                >
                  <VaniBubble
                    msg={`Perfect, <strong>${firstName.trim()}</strong>! Now let's set up the workspace for <strong>${companyName}</strong>. This won't take long.`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating action island */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `${colors.accent.accent1}f0`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '10px 10px 10px 24px',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
          zIndex: 200,
          whiteSpace: 'nowrap',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {isReady ? `Hi, ${firstName.trim()}!` : 'Tell us your name to continue'}
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        {/* Back → VaNi Intro */}
        <button
          type="button"
          onClick={() => navigate('/onboarding/vani-intro')}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.14)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.85)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.6)';
          }}
        >
          ← Back
        </button>

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isReady || isSaving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: !isReady
              ? 'rgba(255,255,255,.15)'
              : colors.utility.secondaryBackground,
            color: !isReady
              ? 'rgba(255,255,255,.3)'
              : colors.utility.primaryText,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: !isReady || isSaving ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => {
            if (isReady && !isSaving) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f0ece6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = isReady
              ? colors.utility.secondaryBackground : 'rgba(255,255,255,.15)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isSaving && (
            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          )}
          Continue →
        </button>
      </div>
    </>
  );
};

export default UserProfileStep;

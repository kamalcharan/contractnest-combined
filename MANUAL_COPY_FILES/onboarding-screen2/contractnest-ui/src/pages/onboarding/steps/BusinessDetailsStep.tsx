// src/pages/onboarding/steps/BusinessDetailsStep.tsx
// Screen 2 — Business Details.
// Inside OnboardingLayout (has progress header). Has its own Back/Continue buttons.
// Saves business_name, business_email, address_line1, city to /api/tenant-profile.
// Logo upload via /api/tenant-profile/logo.
// GST/PAN are shown but not yet persisted (no DB column — future).

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { Loader2, Upload, X } from 'lucide-react';

const SUGGESTED_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Surat', 'Jaipur',
];

interface FormState {
  businessName: string;
  gstNumber: string;
  panNumber: string;
  businessEmail: string;
  officeAddress: string;
}

const BusinessDetailsStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  const { profile, loading: profileLoading } = useTenantProfile({ isOnboarding: true });

  const colors = currentTheme.colors;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    businessName: '',
    gstNumber: '',
    panNumber: '',
    businessEmail: '',
    officeAddress: '',
  });

  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Apply VaNi theme and pre-fill from profile/auth data
  useEffect(() => {
    setTheme('vani');
  }, []);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      businessName: profile?.business_name || currentTenant?.name || prev.businessName,
      businessEmail: profile?.business_email || user?.email || prev.businessEmail,
      officeAddress: profile?.address_line1 || prev.officeAddress,
    }));

    if (profile?.city) {
      // City may be comma-separated from a previous save
      const saved = profile.city.split(',').map(c => c.trim()).filter(Boolean);
      setSelectedCities(saved);
    }

    if (profile?.logo_url) {
      setLogoPreviewUrl(profile.logo_url);
    }
  }, [profile, currentTenant, user]);

  const logoInitials = (form.businessName || 'CN')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  // ── field style helpers ──
  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${
      focusedField === name
        ? colors.brand.primary
        : `${colors.utility.primaryText}20`
    }`,
    borderRadius: 8,
    backgroundColor: colors.utility.secondaryBackground,
    color: colors.utility.primaryText,
    fontSize: 14,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    transition: 'border-color .15s',
    boxShadow: focusedField === name
      ? `0 0 0 3px ${colors.brand.primary}20`
      : 'none',
  });

  const monoInputStyle = (name: string): React.CSSProperties => ({
    ...inputStyle(name),
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: colors.utility.secondaryText,
    marginBottom: 6,
    letterSpacing: '0.02em',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: `${colors.utility.primaryText}60`,
    margin: '28px 0 16px',
    paddingBottom: 10,
    borderBottom: `1px solid ${colors.utility.primaryText}12`,
    fontFamily: "'IBM Plex Mono', monospace",
  };

  // ── handlers ──
  const handleLogoClick = () => fileInputRef.current?.click();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      vaniToast.error('Logo must be under 2MB');
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoFile(null);
    setLogoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const handleContinue = async () => {
    if (!form.businessName.trim()) {
      vaniToast.error('Please enter your business name');
      return;
    }

    setIsSaving(true);
    try {
      // Upload logo first if selected
      let logoUrl = logoPreviewUrl;
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        const res = await api.post(API_ENDPOINTS.TENANTS.UPLOAD_LOGO, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        logoUrl = res.data.url || res.data.logo_url || logoUrl;
      }

      const payload: Record<string, any> = {
        business_name: form.businessName.trim(),
        business_email: form.businessEmail.trim() || undefined,
        address_line1: form.officeAddress.trim() || undefined,
        city: selectedCities.length ? selectedCities.join(', ') : undefined,
      };
      if (logoUrl) payload.logo_url = logoUrl;

      // Create or update profile — profile?.id distinguishes PUT vs POST
      if (profile?.id) {
        await api.put(API_ENDPOINTS.TENANTS.PROFILE, payload);
      } else {
        await api.post(API_ENDPOINTS.TENANTS.PROFILE, payload);
      }

      vaniToast.success('Business details saved');
      navigate('/onboarding/welcome');
    } catch (err: any) {
      console.error('Error saving business details:', err);
      vaniToast.error(err?.response?.data?.error || 'Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // ── loading skeleton ──
  if (profileLoading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <Loader2
          className="animate-spin"
          style={{ color: colors.brand.primary, width: 32, height: 32 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 24px 120px',
        fontFamily: "'Outfit', sans-serif",
        minHeight: '100%',
      }}
    >
      {/* Form card */}
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}14`,
          borderRadius: 20,
          padding: 'clamp(28px, 5vw, 52px)',
          boxShadow: `0 4px 24px ${colors.utility.primaryText}08`,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: colors.brand.primary,
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 12,
          }}
        >
          Step 2 of 9
        </div>

        <h2
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.7px',
            color: colors.utility.primaryText,
            marginBottom: 6,
          }}
        >
          Tell us about your business
        </h2>
        <p
          style={{
            fontSize: 14,
            color: colors.utility.secondaryText,
            marginBottom: 32,
            lineHeight: 1.55,
          }}
        >
          This appears on your contracts and client communications. You can update it anytime.
        </p>

        {/* ── Logo upload ── */}
        <div
          onClick={handleLogoClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: 20,
            border: `1.5px dashed ${colors.utility.primaryText}28`,
            borderRadius: 10,
            marginBottom: 28,
            cursor: 'pointer',
            transition: 'border-color .2s, background .2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.brand.primary}66`;
            (e.currentTarget as HTMLDivElement).style.backgroundColor = `${colors.brand.primary}06`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.utility.primaryText}28`;
            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
          }}
        >
          {/* Preview */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: logoPreviewUrl
                ? 'transparent'
                : `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 20,
              color: '#fff',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {logoPreviewUrl ? (
              <>
                <img
                  src={logoPreviewUrl}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={handleRemoveLogo}
                  style={{
                    position: 'absolute',
                    top: 2, right: 2,
                    background: 'rgba(0,0,0,.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 16, height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X style={{ width: 10, height: 10, color: '#fff' }} />
                </button>
              </>
            ) : (
              logoInitials
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.utility.primaryText, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload style={{ width: 14, height: 14, color: colors.utility.secondaryText }} />
              Upload your company logo
            </div>
            <div style={{ fontSize: 11, color: `${colors.utility.primaryText}50` }}>
              PNG or JPG · Recommended 200×200px · Max 2MB
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
        </div>

        {/* ── Business Identity ── */}
        <div style={sectionLabelStyle}>Business Identity</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Legal Business Name</label>
          <input
            type="text"
            value={form.businessName}
            onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
            onFocus={() => setFocusedField('businessName')}
            onBlur={() => setFocusedField(null)}
            placeholder="e.g. Sharma Elevators Pvt Ltd"
            style={inputStyle('businessName')}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
          <div>
            <label style={labelStyle}>GST Number <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 11 }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={form.gstNumber}
                onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                onFocus={() => setFocusedField('gstNumber')}
                onBlur={() => setFocusedField(null)}
                placeholder="27AABCS1234Z1Z5"
                style={{ ...monoInputStyle('gstNumber'), paddingRight: form.gstNumber.length === 15 ? 72 : 14 }}
                maxLength={15}
              />
              {form.gstNumber.length === 15 && (
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    backgroundColor: `${colors.semantic.success}15`,
                    color: colors.semantic.success,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  ✓ Valid
                </span>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>PAN Number <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 11 }}>(optional)</span></label>
            <input
              type="text"
              value={form.panNumber}
              onChange={e => setForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
              onFocus={() => setFocusedField('panNumber')}
              onBlur={() => setFocusedField(null)}
              placeholder="AABCS1234Z"
              style={monoInputStyle('panNumber')}
              maxLength={10}
            />
          </div>
        </div>

        {/* ── Contact & Location ── */}
        <div style={sectionLabelStyle}>Contact & Location</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Business Email</label>
          <input
            type="email"
            value={form.businessEmail}
            onChange={e => setForm(p => ({ ...p, businessEmail: e.target.value }))}
            onFocus={() => setFocusedField('businessEmail')}
            onBlur={() => setFocusedField(null)}
            placeholder="contracts@yourcompany.com"
            style={inputStyle('businessEmail')}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Office Address</label>
          <input
            type="text"
            value={form.officeAddress}
            onChange={e => setForm(p => ({ ...p, officeAddress: e.target.value }))}
            onFocus={() => setFocusedField('officeAddress')}
            onBlur={() => setFocusedField(null)}
            placeholder="Plot 42, HITEC City, Hyderabad, Telangana 500081"
            style={inputStyle('officeAddress')}
          />
        </div>

        <div>
          <label style={labelStyle}>Primary Service Cities</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {SUGGESTED_CITIES.map(city => {
              const selected = selectedCities.includes(city);
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => toggleCity(city)}
                  style={{
                    padding: '6px 14px',
                    border: `1.5px solid ${selected ? colors.brand.primary : `${colors.utility.primaryText}20`}`,
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                    color: selected ? colors.brand.primary : colors.utility.secondaryText,
                    backgroundColor: selected ? `${colors.brand.primary}0d` : 'transparent',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Card actions ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 40,
            paddingTop: 28,
            borderTop: `1px solid ${colors.utility.primaryText}12`,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/onboarding/vani-intro')}
            style={{
              padding: '11px 20px',
              border: `1.5px solid ${colors.utility.primaryText}20`,
              borderRadius: 8,
              background: 'transparent',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${colors.utility.primaryText}50`;
              (e.currentTarget as HTMLButtonElement).style.color = colors.utility.primaryText;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${colors.utility.primaryText}20`;
              (e.currentTarget as HTMLButtonElement).style.color = colors.utility.secondaryText;
            }}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isSaving}
            style={{
              padding: '12px 28px',
              background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.alternate} 100%)`,
              border: 'none',
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.75 : 1,
              boxShadow: `0 3px 10px ${colors.brand.primary}46`,
              transition: 'all .2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => {
              if (!isSaving) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 16px ${colors.brand.primary}60`;
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 10px ${colors.brand.primary}46`;
            }}
          >
            {isSaving ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                Saving…
              </>
            ) : (
              <>
                Continue
                <span style={{ transition: 'transform .2s' }}>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailsStep;

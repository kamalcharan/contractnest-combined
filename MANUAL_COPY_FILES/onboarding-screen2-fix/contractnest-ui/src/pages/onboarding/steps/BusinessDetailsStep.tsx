// src/pages/onboarding/steps/BusinessDetailsStep.tsx
// Screen 2 — Business Details.
// Uses useTenantProfile hook — formData IS the API payload, no manual field mapping.
// OrganizationDetailsForm handles all TenantProfile contact/address/identity fields.
// GST/PAN fields added below (stored via updateField → included in formData spread).
// Floating action island. Navigates to /onboarding/persona-selection on success.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import OrganizationDetailsForm from '@/components/tenantprofile/OrganizationDetailsForm';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { Loader2, Receipt } from 'lucide-react';

const BusinessDetailsStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user } = useAuth();
  const colors = currentTheme.colors;

  const { formData, updateField, fetchProfile, loading } = useTenantProfile({ isOnboarding: true });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTheme('vani');
    // Pre-fill form with any existing profile data
    fetchProfile();
  }, []);

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
  };

  const handleContinue = async () => {
    if (!formData.business_name?.trim()) {
      vaniToast.error('Business name is required');
      return;
    }
    setIsSaving(true);
    try {
      // Upload logo first if a new file was selected
      let logoUrl = formData.logo_url;
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        const res = await api.post(API_ENDPOINTS.TENANTS.UPLOAD_LOGO, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        logoUrl = res.data.url;
      }

      // formData spread sends ALL TenantProfile fields — no manual mapping needed
      await api.put(API_ENDPOINTS.TENANTS.PROFILE, {
        ...formData,
        business_name: formData.business_name.trim(),
        logo_url: logoUrl,
      });

      vaniToast.success('Business details saved');
      navigate('/onboarding/persona-selection');
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const firstName = user?.first_name || 'there';

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
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
          maxWidth: 540,
        }}
        dangerouslySetInnerHTML={{ __html: msg }}
      />
    </div>
  );

  return (
    <>
      {/* Page */}
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
        <div style={{ width: '100%', maxWidth: 720 }}>

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
            Tell us about your business
          </h2>
          <p
            style={{
              fontSize: 14, color: colors.utility.secondaryText,
              marginBottom: 32, lineHeight: 1.55,
            }}
          >
            This information appears on your contracts and client-facing documents. Fill in as much as you have — you can update it later.
          </p>

          {/* VaNi intro bubble */}
          <VaniBubble
            msg={`Hi <strong>${firstName}</strong>! Let's set up your business profile. Start with your company name and logo, then fill in contact and address details — I'll use these to personalise your contracts.`}
          />

          {/* ── Main form: OrganizationDetailsForm handles EVERY TenantProfile field ── */}
          {loading ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '60px 0', color: colors.utility.secondaryText, gap: 10,
              }}
            >
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading your profile…</span>
            </div>
          ) : (
            <OrganizationDetailsForm
              formData={formData}
              onUpdate={updateField}
              onLogoChange={handleLogoChange}
            />
          )}

          {/* ── India Tax Details (GST / PAN) ── */}
          {!loading && (
            <div
              style={{
                marginTop: 20,
                background: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Receipt size={18} style={{ color: colors.brand.primary }} />
                <span
                  style={{
                    fontSize: 14, fontWeight: 700,
                    color: colors.utility.primaryText,
                  }}
                >
                  India Tax Details
                </span>
                <span
                  style={{
                    fontSize: 11, color: colors.utility.secondaryText,
                    fontFamily: "'IBM Plex Mono', monospace",
                    background: `${colors.utility.primaryText}08`,
                    padding: '2px 7px', borderRadius: 4,
                  }}
                >
                  optional
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* GST Number */}
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: colors.utility.primaryText, marginBottom: 6,
                    }}
                  >
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={formData.gst_number || ''}
                    onChange={(e) => updateField('gst_number', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${colors.utility.primaryText}30`,
                      borderRadius: 8,
                      background: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: 13,
                      fontFamily: "'IBM Plex Mono', monospace",
                      outline: 'none',
                      boxSizing: 'border-box',
                      letterSpacing: '0.5px',
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11, color: colors.utility.secondaryText,
                      marginTop: 4, fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {(formData.gst_number || '').length}/15
                  </div>
                </div>

                {/* PAN Number */}
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: colors.utility.primaryText, marginBottom: 6,
                    }}
                  >
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.pan_number || ''}
                    onChange={(e) => updateField('pan_number', e.target.value.toUpperCase())}
                    placeholder="AAAPL1234C"
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${colors.utility.primaryText}30`,
                      borderRadius: 8,
                      background: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: 13,
                      fontFamily: "'IBM Plex Mono', monospace",
                      outline: 'none',
                      boxSizing: 'border-box',
                      letterSpacing: '0.5px',
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11, color: colors.utility.secondaryText,
                      marginTop: 4, fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {(formData.pan_number || '').length}/10
                  </div>
                </div>
              </div>
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.55)' }}>
          Business details
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        {/* Back */}
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
          disabled={isSaving || loading}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: isSaving || loading
              ? 'rgba(255,255,255,.15)'
              : colors.utility.secondaryBackground,
            color: isSaving || loading
              ? 'rgba(255,255,255,.3)'
              : colors.utility.primaryText,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: isSaving || loading ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => {
            if (!isSaving && !loading) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f0ece6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = isSaving || loading
              ? 'rgba(255,255,255,.15)'
              : colors.utility.secondaryBackground;
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isSaving ? (
            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          ) : null}
          Continue →
        </button>
      </div>
    </>
  );
};

export default BusinessDetailsStep;

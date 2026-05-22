// src/pages/auth/RegisterPage.tsx
// Screen 1 of the VaNi onboarding flow — Registration.
// Applies VaNi theme on mount so the entire onboarding entry feels cohesive.
// Mobile-first: single-column on small screens, hero+form split on desktop.

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { vaniToast } from '../../components/common/toast';
import { analyticsService, AUTH_EVENTS, UI_EVENTS } from '../../services/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  workspaceName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const { isDarkMode, currentTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cnakRef = searchParams.get('ref');

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── State ──────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<FormData>({
    workspaceName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // ── Apply VaNi theme for onboarding ───────────────────────────────────────
  useEffect(() => {
    setTheme('vani');
  }, []);

  // ── Analytics: page view ──────────────────────────────────────────────────
  useEffect(() => {
    analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_START, {
      source: cnakRef ? 'contract_review' : (document.referrer || 'direct'),
      page_name: 'register',
      ...(cnakRef ? { cnak_ref: cnakRef } : {}),
    });
  }, []);

  // ── Redirect if already authenticated ────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      if (sessionStorage.getItem('is_new_signup') === 'true') {
        sessionStorage.removeItem('is_new_signup');
        return;
      }
      const redirect = sessionStorage.getItem('contractnest_auth_redirect');
      if (redirect) {
        sessionStorage.removeItem('contractnest_auth_redirect');
        navigate(redirect);
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, navigate]);

  // ── Clear auth error on form change ──────────────────────────────────────
  useEffect(() => {
    if (error) clearError();
  }, [formData]);

  // ── Show auth error as toast (not account-exists — shown inline) ──────────
  const isAccountExistsError = error && (
    error.toLowerCase().includes('already exists') ||
    error.toLowerCase().includes('account_already_exists')
  );

  useEffect(() => {
    if (error && !isAccountExistsError) {
      vaniToast.error(error, { duration: 2000 });
    }
  }, [error]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.workspaceName.trim()) {
      newErrors.workspaceName = 'Company name is required';
    }
    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_STEP, {
        step_name: 'validation',
        success: false,
        error_fields: Object.keys(newErrors).join(','),
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_STEP, { step_name: 'submission', success: true });
    sessionStorage.setItem('is_new_signup', 'true');

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        workspaceName: formData.workspaceName.trim(),
      });
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_SUCCESS, {
        workspace_name: formData.workspaceName,
      });
    } catch {
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_FAILURE, {
        error_type: 'registration_error',
        error_message: error || 'Unknown error',
      });
    }
  };

  // ── Shared input style helper ──────────────────────────────────────────────
  const inputStyle = (fieldName: string): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    border: `1.5px solid ${
      errors[fieldName as keyof FormData]
        ? colors.semantic.error
        : focusedField === fieldName
        ? colors.brand.primary
        : '#e5e1db'
    }`,
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '14px',
    fontWeight: 500,
    color: colors.utility.primaryText,
    background: colors.utility.secondaryBackground,
    outline: 'none',
    boxShadow: focusedField === fieldName
      ? `0 0 0 3px ${colors.brand.primary}14`
      : errors[fieldName as keyof FormData]
      ? `0 0 0 3px ${colors.semantic.error}14`
      : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: colors.utility.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: '6px',
    fontFamily: "'Outfit', sans-serif",
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '11px',
    color: colors.semantic.error,
    marginTop: '4px',
    fontFamily: "'Outfit', sans-serif",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", minHeight: '100vh', background: colors.utility.secondaryBackground }}>

      {/* ── Mobile top strip (hidden on lg+) ── */}
      <div
        className="lg:hidden flex items-center gap-3 px-5 py-4"
        style={{ background: `linear-gradient(135deg, ${colors.accent.accent1} 0%, ${colors.accent.accent2} 100%)` }}
      >
        {/* Logo mark */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: colors.brand.primary }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, color: colors.accent.accent3 }}>
            ContractNest
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: colors.brand.primary, letterSpacing: '0.5px' }}>
            SERVICE CONTRACTS, FINALLY INTELLIGENT
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="lg:grid lg:min-h-screen" style={{ gridTemplateColumns: '45% 55%' }}>

        {/* ════ LEFT: Dark hero (desktop only) ════ */}
        <div
          className="hidden lg:flex flex-col justify-center px-14 py-16 relative overflow-hidden"
          style={{ background: `linear-gradient(145deg, ${colors.accent.accent1} 0%, ${colors.accent.accent2} 50%, ${colors.accent.accent1} 100%)` }}
        >
          {/* Glow orbs */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-100px', left: '-100px',
              width: '400px', height: '400px',
              background: `radial-gradient(circle, ${colors.brand.primary}1f 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '-80px', right: '-80px',
              width: '300px', height: '300px',
              background: `radial-gradient(circle, ${colors.brand.primary}14 0%, transparent 70%)`,
            }}
          />

          {/* VaNi badge */}
          <div
            className="flex items-center gap-2 mb-8 w-fit"
            style={{
              padding: '6px 14px',
              background: `${colors.brand.primary}1f`,
              border: `1px solid ${colors.brand.primary}33`,
              borderRadius: '100px',
            }}
          >
            <span
              className="animate-pulse"
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.brand.primary, display: 'inline-block' }}
            />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 700, color: colors.brand.primary, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Now Available
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: '42px', fontWeight: 800, color: colors.accent.accent3, lineHeight: 1.15, letterSpacing: '-1.5px', marginBottom: '20px' }}>
            Service contracts,<br />
            <em style={{ fontStyle: 'normal', color: colors.brand.primary }}>finally</em> intelligent.
          </h1>

          {/* Sub */}
          <p style={{ fontSize: '15px', color: colors.accent.accent4, lineHeight: 1.65, marginBottom: '48px', maxWidth: '340px' }}>
            ContractNest handles your AMC, CMC, and SLA contracts from creation to renewal — with VaNi doing the heavy lifting.
          </p>

          {/* Stats */}
          <div className="flex gap-8">
            {[
              { n: '15m', l: 'To first contract' },
              { n: '0', l: 'Blank forms' },
              { n: '∞', l: 'VaNi intelligence' },
            ].map(stat => (
              <div key={stat.l}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '28px', fontWeight: 800, color: colors.accent.accent3, letterSpacing: '-1px' }}>
                  {stat.n}
                </div>
                <div style={{ fontSize: '11px', color: colors.accent.accent4, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {stat.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════ RIGHT: Form panel ════ */}
        <div
          className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10 lg:py-16"
          style={{ background: colors.utility.secondaryBackground }}
        >
          {/* Desktop logo */}
          <div className="hidden lg:flex items-center gap-3 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: colors.brand.primary }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: colors.utility.primaryText }}>
              ContractNest
            </span>
          </div>

          {/* Form heading */}
          <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', color: colors.utility.primaryText, marginBottom: '4px' }}>
            Create your account
          </h2>
          <p style={{ fontSize: '14px', color: colors.utility.secondaryText, marginBottom: '28px', lineHeight: 1.5 }}>
            Set up your ContractNest workspace in minutes.
          </p>

          {/* Inline account-exists error */}
          {isAccountExistsError && (
            <div
              className="flex items-start gap-3 mb-5 p-3 rounded-lg"
              style={{ background: `${colors.semantic.error}0f`, border: `1px solid ${colors.semantic.error}30` }}
            >
              <AlertCircle size={16} style={{ color: colors.semantic.error, marginTop: '1px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: colors.semantic.error }}>
                  Account already exists
                </p>
                <p style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                  <Link to="/login" style={{ color: colors.brand.primary, fontWeight: 600 }}>Sign in</Link> or use a different email.
                </p>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Company Name */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Company Name</label>
              <input
                type="text"
                name="workspaceName"
                value={formData.workspaceName}
                onChange={handleChange}
                onFocus={() => setFocusedField('workspaceName')}
                onBlur={() => setFocusedField(null)}
                placeholder="Sharma Elevators Pvt Ltd"
                autoComplete="organization"
                style={inputStyle('workspaceName')}
              />
              {errors.workspaceName && <p style={errorStyle}>{errors.workspaceName}</p>}
            </div>

            {/* First + Last Name — side by side */}
            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Rajesh"
                  autoComplete="given-name"
                  style={inputStyle('firstName')}
                />
                {errors.firstName && <p style={errorStyle}>{errors.firstName}</p>}
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Sharma"
                  autoComplete="family-name"
                  style={inputStyle('lastName')}
                />
                {errors.lastName && <p style={errorStyle}>{errors.lastName}</p>}
              </div>
            </div>

            {/* Work Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="rajesh@sharmaelevatorsltd.com"
                autoComplete="email"
                style={inputStyle('email')}
              />
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  style={{ ...inputStyle('password'), paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(v => !v);
                    analyticsService.trackEvent(UI_EVENTS.MENU_CLICK, { menu_item: 'password_toggle', action: showPassword ? 'hide' : 'show' });
                  }}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText, padding: '4px', display: 'flex', alignItems: 'center' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password
                ? <p style={errorStyle}>{errors.password}</p>
                : <p style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>At least 8 characters with a number and symbol.</p>
              }
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  style={{ ...inputStyle('confirmPassword'), paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText, padding: '4px', display: 'flex', alignItems: 'center' }}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 group"
              style={{
                padding: '14px 24px',
                background: isLoading
                  ? `${colors.brand.primary}80`
                  : `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.alternate} 100%)`,
                border: 'none',
                borderRadius: '8px',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: isLoading ? 'none' : `0 4px 14px ${colors.brand.primary}4d`,
                transition: 'all 0.2s',
              }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                  Setting up your workspace…
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ marginTop: '20px', fontSize: '12px', color: colors.utility.secondaryText, textAlign: 'center', lineHeight: 1.6 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: colors.brand.primary, fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
            <br />
            By registering you agree to our{' '}
            <a href="#" style={{ color: colors.brand.primary, fontWeight: 600, textDecoration: 'none' }}>Terms</a>
            {' '}and{' '}
            <a href="#" style={{ color: colors.brand.primary, fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

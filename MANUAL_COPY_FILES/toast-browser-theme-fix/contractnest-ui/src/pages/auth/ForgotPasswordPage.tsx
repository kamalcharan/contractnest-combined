// src/pages/auth/ForgotPasswordPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Mail, ArrowLeft, Shield, Check, AlertCircle, Loader2 } from 'lucide-react';
import { vaniToast } from '../../components/common/toast';
import { supabase } from '../../utils/supabase';
import { analyticsService, AUTH_EVENTS } from '../../services/analytics';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userAuthType, setUserAuthType] = useState<'email' | 'google' | 'both' | 'unknown'>('unknown');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const { resetPassword, isAuthenticated, error, clearError } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const navigate = useNavigate();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Track page view
  useEffect(() => {
    analyticsService.trackEvent(AUTH_EVENTS.PASSWORD_RESET_REQUEST, {
      source: 'forgot_password_page',
      page_view: true
    });
  }, []);

  // Clear errors when email changes
  useEffect(() => {
    if (error) clearError();
  }, [email, clearError, error]);

  // Check user's authentication methods when email changes
  useEffect(() => {
    const checkAuthMethods = async () => {
      if (!email || !email.includes('@')) {
        setUserAuthType('unknown');
        return;
      }

      setIsCheckingAuth(true);
      try {
        // Check if this email exists and what auth methods it has
        const { data, error } = await supabase
          .from('t_user_auth_methods')
          .select('auth_type, is_primary')
          .eq('auth_identifier', email.toLowerCase())
          .eq('is_deleted', false);

        if (error) {
          console.error('Error checking auth methods:', error);
          setUserAuthType('unknown');
          return;
        }

        if (!data || data.length === 0) {
          setUserAuthType('unknown'); // Email not found, but we won't tell the user
          return;
        }

        const authTypes = data.map(d => d.auth_type);
        const hasEmail = authTypes.includes('email');
        const hasGoogle = authTypes.includes('google');

        if (hasEmail && hasGoogle) {
          setUserAuthType('both');
        } else if (hasGoogle) {
          setUserAuthType('google');
        } else if (hasEmail) {
          setUserAuthType('email');
        } else {
          setUserAuthType('unknown');
        }
      } catch (error) {
        console.error('Error checking auth methods:', error);
        setUserAuthType('unknown');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAuthMethods, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      vaniToast.error('Email is required', { duration: 3000 });
      return;
    }

    if (!validateEmail(email)) {
      vaniToast.error('Please enter a valid email address', { duration: 3000 });
      return;
    }

    setIsLoading(true);

    try {
      // Track reset attempt
      analyticsService.trackEvent(AUTH_EVENTS.PASSWORD_RESET_REQUEST, {
        source: 'forgot_password_form',
        user_auth_type: userAuthType
      });

      // Always call resetPassword (for security - Option A approach)
      // This will always show success message regardless of whether email exists
      await resetPassword(email.toLowerCase());

      setIsSubmitted(true);

      // Track successful submission
      analyticsService.trackEvent(AUTH_EVENTS.PASSWORD_RESET_REQUEST, {
        source: 'forgot_password_form',
        success: true
      });

    } catch (err: any) {
      // Track failed submission
      analyticsService.trackEvent(AUTH_EVENTS.PASSWORD_RESET_REQUEST, {
        source: 'forgot_password_form',
        success: false,
        error: err.message
      });

      console.error('Password reset error:', err);
      // Error handling is done by AuthContext and displayed via toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    analyticsService.trackEvent(AUTH_EVENTS.LOGIN, {
      source: 'forgot_password_back_button'
    });
    navigate('/login');
  };

  const renderAuthTypeMessage = () => {
    if (isCheckingAuth) {
      return (
        <div
          className="flex items-center space-x-2 text-sm transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking account...</span>
        </div>
      );
    }

    if (userAuthType === 'google') {
      return (
        <div
          className="p-3 rounded-lg border transition-colors"
          style={{
            backgroundColor: `${colors.brand.primary}10`,
            borderColor: `${colors.brand.primary}40`
          }}
        >
          <div className="flex items-start space-x-2">
            <AlertCircle
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: colors.brand.primary }}
            />
            <div className="text-sm">
              <p
                className="font-medium transition-colors"
                style={{ color: colors.brand.primary }}
              >
                This account uses Google authentication
              </p>
              <p
                className="mt-1 transition-colors"
                style={{ color: colors.brand.primary }}
              >
                Please use "Sign in with Google" on the login page instead.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (userAuthType === 'both') {
      return (
        <div
          className="p-3 rounded-lg border transition-colors"
          style={{
            backgroundColor: `${colors.semantic.success}10`,
            borderColor: `${colors.semantic.success}40`
          }}
        >
          <div className="flex items-start space-x-2">
            <Check
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: colors.semantic.success }}
            />
            <div className="text-sm">
              <p
                className="font-medium transition-colors"
                style={{ color: colors.semantic.success }}
              >
                Password reset available
              </p>
              <p
                className="mt-1 transition-colors"
                style={{ color: colors.semantic.success }}
              >
                You can also sign in with Google if preferred.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200"
        style={{
          background: isDarkMode
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}20)`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}10)`
        }}
      >
        {/* Background Pattern */}
        <div
          className={`absolute inset-0 transition-opacity ${isDarkMode ? 'opacity-10' : 'opacity-5'}`}
          style={{
            backgroundImage: `
              linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px),
              linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Success Card */}
          <div
            className="backdrop-blur-xl border rounded-2xl shadow-xl p-8 transition-colors"
            style={{
              backgroundColor: `${colors.utility.secondaryBackground}70`,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            {/* Logo */}
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h1
                className="text-2xl font-bold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                ContractNest
              </h1>
            </div>

            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.semantic.success}20` }}
              >
                <Check
                  className="w-10 h-10"
                  style={{ color: colors.semantic.success }}
                />
              </div>
            </div>

            <div className="text-center space-y-4">
              <h2
                className="text-2xl font-bold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Check Your Email
              </h2>

              <p
                className="transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                If an account exists with <strong>{email}</strong>, you'll receive password reset instructions shortly.
              </p>

              <div
                className="p-4 rounded-lg border transition-colors"
                style={{
                  backgroundColor: `${colors.brand.primary}10`,
                  borderColor: `${colors.brand.primary}40`
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: colors.brand.primary }}
                >
                  Didn't receive the email?
                </p>
                <ul
                  className="text-sm mt-2 space-y-1"
                  style={{ color: colors.brand.primary }}
                >
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure the email address is correct</li>
                  <li>• Wait a few minutes for delivery</li>
                </ul>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 hover:opacity-90"
                  style={{
                    background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>

                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                    setUserAuthType('unknown');
                  }}
                  className="w-full py-2 px-4 border rounded-lg font-medium transition-colors hover:opacity-80"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.primaryText,
                    backgroundColor: colors.utility.secondaryBackground
                  }}
                >
                  Try Different Email
                </button>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p
              className="text-xs flex items-center justify-center space-x-1 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              <Shield className="w-3 h-3" />
              <span>Your data is secured with enterprise-grade encryption</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}20)`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}10)`
      }}
    >
      {/* Background Pattern */}
      <div
        className={`absolute inset-0 transition-opacity ${isDarkMode ? 'opacity-10' : 'opacity-5'}`}
        style={{
          backgroundImage: `
            linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">

        {/* Left Side - Branding & Support Info */}
        <div className="hidden lg:block space-y-8">
          {/* Logo & Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{
                    background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
                  }}
                >
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1
                    className="text-3xl font-bold transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    ContractNest
                  </h1>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Contract Management Made Simple
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Support Message */}
          <div className="space-y-6">
            <h2
              className="text-2xl font-semibold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Don't worry, we've got you covered
            </h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${colors.brand.primary}20` }}
                >
                  <Mail
                    className="w-3 h-3"
                    style={{ color: colors.brand.primary }}
                  />
                </div>
                <div>
                  <h3
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Quick & Secure
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Reset your password in just a few clicks
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${colors.semantic.success}20` }}
                >
                  <Check
                    className="w-3 h-3"
                    style={{ color: colors.semantic.success }}
                  />
                </div>
                <div>
                  <h3
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Email Verification
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    We'll send instructions to your registered email
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${colors.brand.tertiary}20` }}
                >
                  <Shield
                    className="w-3 h-3"
                    style={{ color: colors.brand.tertiary }}
                  />
                </div>
                <div>
                  <h3
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Secure Process
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Your account security is our top priority
                  </p>
                </div>
              </div>
            </div>

            {/* Help Note */}
            <div
              className="rounded-lg p-4 border transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryBackground}50`,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <p
                className="text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <strong>Need help?</strong> If you're having trouble accessing your account,
                you can contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Reset Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="flex items-center justify-center space-x-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1
                className="text-2xl font-bold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                ContractNest
              </h1>
            </Link>
          </div>

          {/* Reset Form Card */}
          <div
            className="backdrop-blur-xl border rounded-2xl shadow-xl p-8 transition-colors"
            style={{
              backgroundColor: `${colors.utility.secondaryBackground}70`,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div className="text-center mb-8">
              <h2
                className="text-2xl font-bold mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Reset Your Password
              </h2>
              <p
                className="transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      borderColor: colors.utility.secondaryText + '40',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    placeholder="Enter your email address"
                    disabled={isLoading}
                  />
                </div>

                {/* Auth type message */}
                {email && validateEmail(email) && (
                  <div className="mt-3">
                    {renderAuthTypeMessage()}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || userAuthType === 'google'}
                className="w-full py-3 px-4 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="inline-flex items-center space-x-2 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p
              className="text-xs flex items-center justify-center space-x-1 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              <Shield className="w-3 h-3" />
              <span>Your data is secured with enterprise-grade encryption</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

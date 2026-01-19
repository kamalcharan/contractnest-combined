// src/pages/auth/LoginPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { vaniToast } from '../../components/common/toast';
import { supabase } from '../../utils/supabase';
// Import analytics
import { analyticsService, AUTH_EVENTS, UI_EVENTS } from '../../services/analytics';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // Onboarding redirects are handled by AuthContext during login flow
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Ref to prevent duplicate Google login attempts
  const googleLoginInProgress = useRef(false);

  // Check if Google OAuth is enabled
  const isGoogleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED!== 'false';

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Track page view when component mounts
  useEffect(() => {
    analyticsService.trackEvent(AUTH_EVENTS.LOGIN, {
      source: document.referrer || 'direct',
      page_name: 'login'
    });
  }, []);

  // Redirect if already authenticated
  // NOTE: Onboarding redirects are handled by AuthContext during login
  // This just handles the case where user navigates to /login while already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Just go to dashboard - AuthContext handles onboarding redirects during login flow
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Check for message from navigate state (e.g., after registration)
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      vaniToast.success(location.state.message, { duration: 2000 });
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Show error toast when error is present
  useEffect(() => {
    if (error) {
      vaniToast.error(error, { duration: 2000 });
    }
  }, [error]);

  // Clear any errors when form changes
  useEffect(() => {
    if (error) clearError();
  }, [email, password, clearError, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Track login attempt
    analyticsService.trackEvent(AUTH_EVENTS.LOGIN, {
      method: 'email',
      source: 'login_form'
    });

    try {
      await login(email, password, false); // Remember me removed - always false
      // Track successful login
      analyticsService.trackEvent(AUTH_EVENTS.LOGIN_SUCCESS, {
        method: 'email'
      });
      // The redirect will happen automatically from the isAuthenticated useEffect
      // which will now check onboarding status
    } catch (err) {
      // Track login failure
      analyticsService.trackEvent(AUTH_EVENTS.LOGIN_FAILURE, {
        method: 'email',
        error_type: 'authentication_error',
        error_message: error || 'Unknown error'
      });
      // Don't do anything here - error will be handled by auth context and shown via useEffect
    }
  };

  const handleGoogleLogin = async () => {
    // Prevent duplicate clicks
    if (googleLoginInProgress.current || isGoogleLoading) {
      return;
    }

    googleLoginInProgress.current = true;
    setIsGoogleLoading(true);

    // Track Google login attempt
    analyticsService.trackEvent(AUTH_EVENTS.LOGIN, {
      method: 'google',
      source: 'login_form'
    });

    try {
      // Store remember me preference before OAuth redirect (always false now)
      localStorage.setItem('remember_me', 'false');

      // Use Supabase's built-in OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/google-callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      // Supabase will handle the redirect automatically
      // The callback page will handle onboarding check for Google users

    } catch (error: any) {
      // Track Google login failure
      analyticsService.trackEvent(AUTH_EVENTS.LOGIN_FAILURE, {
        method: 'google',
        error_type: 'oauth_error',
        error_message: error.message
      });

      vaniToast.error(error.message || 'Failed to initiate Google login', { duration: 3000 });

      googleLoginInProgress.current = false;
      setIsGoogleLoading(false);
    }
    // Note: We don't set isGoogleLoading to false in success case because
    // the page will redirect and we want to keep the loading state
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);

    // Track password visibility toggle
    analyticsService.trackEvent(UI_EVENTS.MENU_CLICK, {
      menu_item: 'password_toggle',
      action: showPassword ? 'hide' : 'show'
    });
  };

  // Track forgot password click
  const handleForgotPasswordClick = () => {
    analyticsService.trackEvent(AUTH_EVENTS.PASSWORD_RESET_REQUEST, {
      source: 'login_page'
    });
    navigate('/forgot-password');
  };

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

        {/* Left Side - Branding & Features */}
        <div className="hidden lg:block space-y-8">
          {/* Logo & Brand - UPDATED: Link to landing page */}
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

          {/* Value Proposition */}
          <div className="space-y-6">
            <h2
              className="text-2xl font-semibold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Welcome back to your contract hub
            </h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${colors.semantic.success}20` }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors.semantic.success }}
                  />
                </div>
                <div>
                  <h3
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Track All Contracts
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Centralized dashboard for all your service contracts
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${colors.brand.primary}20` }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors.brand.primary }}
                  />
                </div>
                <div>
                  <h3
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Never Miss Renewals
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Smart notifications for upcoming deadlines
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${colors.brand.tertiary}20` }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors.brand.tertiary }}
                  />
                </div>
                <div>
                  <h3
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Team Collaboration
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Work together seamlessly with your team
                  </p>
                </div>
              </div>
            </div>

            {/* Free Contracts Banner */}
            <div
              className="rounded-lg p-4 border transition-colors"
              style={{
                background: `linear-gradient(to right, ${colors.semantic.success}10, ${colors.semantic.success}05)`,
                borderColor: `${colors.semantic.success}40`
              }}
            >
              <div
                className="flex items-center space-x-2 transition-colors"
                style={{ color: colors.semantic.success }}
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Your first 3 contracts are free!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Logo - UPDATED: Link to landing page */}
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
            <p
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Contract Management Made Simple
            </p>
          </div>

          {/* Login Card */}
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
                Welcome Back
              </h2>
              <p
                className="transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Sign in to manage your contracts
              </p>
            </div>

            {/* Success Message */}
            {message && (
              <div
                className="mb-6 p-3 border rounded-lg"
                style={{
                  backgroundColor: `${colors.semantic.success}10`,
                  borderColor: `${colors.semantic.success}40`
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: colors.semantic.success }}
                >
                  {message}
                </p>
              </div>
            )}

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
                    placeholder="Enter your email"
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      borderColor: colors.utility.secondaryText + '40',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    placeholder="Enter your password"
                    disabled={isLoading || isGoogleLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors hover:opacity-80"
                    style={{ color: colors.utility.secondaryText }}
                    onClick={togglePasswordVisibility}
                    disabled={isLoading || isGoogleLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: colors.brand.primary }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 px-4 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider - Only show if Google OAuth is enabled */}
            {isGoogleAuthEnabled && (
              <div className="my-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className="w-full border-t transition-colors"
                      style={{ borderColor: colors.utility.secondaryText + '40' }}
                    />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span
                      className="px-2 transition-colors"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.secondaryText
                      }}
                    >
                      Or continue with
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Google Sign-in Button - Only show if Google OAuth is enabled */}
            {isGoogleAuthEnabled && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border rounded-lg shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                {isGoogleLoading ? (
                  <>
                    <div
                      className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"
                      style={{ borderColor: colors.utility.secondaryText }}
                    />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            )}

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p
                className="text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium transition-colors hover:opacity-80"
                  style={{ color: colors.brand.primary }}
                  onClick={() => analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_START, { source: 'login_page' })}
                >
                  Start your free trial
                </Link>
              </p>
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
    </div>
  );
};

export default LoginPage;

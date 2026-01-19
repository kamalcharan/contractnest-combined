// src/pages/auth/RegisterPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Eye, EyeOff, User, Mail, Building, Shield, Check, Star, Gift, Users, Clock, ArrowRight } from 'lucide-react';
import { vaniToast } from '../../components/common/toast';
import { supabase } from '../../utils/supabase';
// Import analytics
import { analyticsService, AUTH_EVENTS, UI_EVENTS } from '../../services/analytics';

const RegisterPage: React.FC = () => {
  // Check if Google OAuth is enabled - MOVED TO TOP
  const isGoogleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED!== 'false';

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    workspaceName: ''
  });

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Auth context - Added hasCompletedOnboarding
  const { register, isAuthenticated, isLoading, error, clearError, hasCompletedOnboarding } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const navigate = useNavigate();

  // Ref to prevent duplicate Google signup attempts
  const googleSignupInProgress = useRef(false);

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Track page view when component mounts
  useEffect(() => {
    analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_START, {
      source: document.referrer || 'direct',
      page_name: 'register'
    });
  }, []);

  // Redirect if already authenticated
  // NOTE: Don't duplicate onboarding logic here - let AuthContext handle it
  useEffect(() => {
    if (isAuthenticated) {
      // Just redirect to dashboard - AuthContext will handle onboarding redirect if needed
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear auth errors when form changes
  useEffect(() => {
    if (error) clearError();
  }, [formData, clearError, error]);

  // Show error toast when error is present
  useEffect(() => {
    if (error) {
      vaniToast.error(error, { duration: 2000 });
    }
  }, [error]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Convert workspace name to lowercase if that field is changed
    const newValue = name === 'workspaceName' ? value.toLowerCase() : value;

    setFormData({ ...formData, [name]: newValue });

    // Clear field-specific error when changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Handle Google Sign-up
  const handleGoogleSignup = async () => {
    // Only proceed if Google auth is enabled
    if (!isGoogleAuthEnabled) {
      return;
    }

    // Prevent duplicate clicks
    if (googleSignupInProgress.current || isGoogleLoading) {
      return;
    }

    googleSignupInProgress.current = true;
    setIsGoogleLoading(true);

    // Track Google signup attempt
    analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_START, {
      method: 'google',
      source: 'register_form'
    });

    try {
      // Store remember me preference as false for new users
      localStorage.setItem('remember_me', 'false');

      // Store a flag to indicate this is a new signup (for onboarding)
      sessionStorage.setItem('is_new_signup', 'true');

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
      // The callback page will determine if it's a new user and handle onboarding accordingly

    } catch (error: any) {
      // Track Google signup failure
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_FAILURE, {
        method: 'google',
        error_type: 'oauth_error',
        error_message: error.message
      });

      vaniToast.error(error.message || 'Failed to initiate Google sign-up', { duration: 3000 });

      googleSignupInProgress.current = false;
      setIsGoogleLoading(false);
    }
    // Note: We don't set isGoogleLoading to false in success case because
    // the page will redirect and we want to keep the loading state
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);

    // Track password visibility toggle
    analyticsService.trackEvent(UI_EVENTS.MENU_CLICK, {
      menu_item: 'password_toggle',
      action: showPassword ? 'hide' : 'show'
    });
  };

  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);

    // Track confirm password visibility toggle
    analyticsService.trackEvent(UI_EVENTS.MENU_CLICK, {
      menu_item: 'confirm_password_toggle',
      action: showConfirmPassword ? 'hide' : 'show'
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    // Workspace name
    if (!formData.workspaceName) {
      newErrors.workspaceName = 'Workspace name is required';
    } else if (!/^[a-z0-9\-_]+$/.test(formData.workspaceName)) {
      newErrors.workspaceName = 'Workspace name can only contain lowercase letters, numbers, hyphens, and underscores';
    }

    setErrors(newErrors);

    // Track validation errors if there are any
    if (Object.keys(newErrors).length > 0) {
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_STEP, {
        step_name: 'validation',
        success: false,
        error_fields: Object.keys(newErrors).join(',')
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission - Updated to mark for onboarding
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Track registration attempt
    analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_STEP, {
      step_name: 'submission',
      success: true
    });

    // Mark this as a new signup for onboarding
    sessionStorage.setItem('is_new_signup', 'true');

    // Register the user
    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        workspaceName: formData.workspaceName
      });

      // Track successful registration
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_SUCCESS, {
        workspace_name: formData.workspaceName
      });

      // The AuthContext will handle navigation to onboarding or dashboard
      // Success toast will be shown by AuthContext
    } catch (err) {
      // Track registration failure
      analyticsService.trackEvent(AUTH_EVENTS.SIGNUP_FAILURE, {
        error_type: 'registration_error',
        error_message: error || 'Unknown error'
      });
      // Error is handled by auth context
    }
  };

  return (
    <div
      className="min-h-screen flex transition-colors duration-200"
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

      {/* Left Side - Value Proposition (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative z-10">
        <div className="max-w-md">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 mb-8">
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
          </div>

          {/* Main Headline */}
          <h2
            className="text-4xl font-bold mb-6 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Start Managing Contracts Like a Pro
          </h2>

          <p
            className="text-xl mb-8 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Join thousands of businesses who trust ContractNest to streamline their contract management.
          </p>

          {/* Free Trial Banner */}
          <div
            className="rounded-2xl p-6 mb-8 border-2 transition-colors"
            style={{
              background: `linear-gradient(to right, ${colors.semantic.success}10, ${colors.semantic.success}05)`,
              borderColor: colors.semantic.success
            }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <Gift
                className="w-8 h-8 transition-colors"
                style={{ color: colors.semantic.success }}
              />
              <div>
                <h3
                  className="text-lg font-bold transition-colors"
                  style={{ color: colors.semantic.success }}
                >
                  Start Free Today!
                </h3>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.semantic.success }}
                >
                  Your first 3 contracts are completely free
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {['No credit card required', 'Full feature access', 'Setup in under 5 minutes'].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-sm transition-colors"
                  style={{ color: colors.semantic.success }}
                >
                  <Check className="w-4 h-4" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-4">
            {[
              { icon: Shield, title: 'Enterprise Security', desc: 'Bank-level encryption and SOC 2 compliance', color: colors.brand.primary },
              { icon: Users, title: 'Team Collaboration', desc: 'Invite unlimited team members to work together', color: colors.brand.tertiary },
              { icon: Clock, title: 'Smart Reminders', desc: 'Never miss a renewal or important deadline again', color: colors.semantic.success }
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mt-1"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon
                    className="w-5 h-5"
                    style={{ color: feature.color }}
                  />
                </div>
                <div>
                  <h3
                    className="font-semibold transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div
            className="mt-8 p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: `${colors.utility.secondaryBackground}50`,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div className="flex items-center space-x-2 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
              <span
                className="text-sm font-medium transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                5.0 from 500+ users
              </span>
            </div>
            <p
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              "ContractNest transformed how we manage our vendor contracts. Setup was incredibly easy!"
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
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
            </div>

            {/* Mobile Free Trial Banner */}
            <div
              className="rounded-lg p-4 mb-6 border transition-colors"
              style={{
                background: `linear-gradient(to right, ${colors.semantic.success}10, ${colors.semantic.success}05)`,
                borderColor: `${colors.semantic.success}40`
              }}
            >
              <div
                className="flex items-center justify-center space-x-2 transition-colors"
                style={{ color: colors.semantic.success }}
              >
                <Gift className="w-5 h-5" />
                <span className="text-sm font-medium">Your first 3 contracts are free!</span>
              </div>
            </div>
          </div>

          {/* Registration Card */}
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
                Create Your Account
              </h2>
              <p
                className="transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Start managing contracts in minutes
              </p>
            </div>

            {/* Google Sign-up Button - Only show if Google OAuth is enabled */}
            {isGoogleAuthEnabled && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 border rounded-lg shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
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
                      Sign up with Google
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Divider - Only show if Google OAuth is enabled */}
            {isGoogleAuthEnabled && (
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className="w-full border-t transition-colors"
                      style={{ borderColor: `${colors.utility.secondaryText}40` }}
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
                      Or sign up with email
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name fields in two columns */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'firstName', placeholder: 'John', label: 'First Name' },
                  { name: 'lastName', placeholder: 'Doe', label: 'Last Name' }
                ].map((field) => (
                  <div key={field.name}>
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-medium mb-2 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {field.label}
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        required
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          errors[field.name] ? 'border-red-500' : ''
                        }`}
                        style={{
                          borderColor: errors[field.name] ? '#ef4444' : `${colors.utility.secondaryText}40`,
                          backgroundColor: colors.utility.secondaryBackground,
                          color: colors.utility.primaryText,
                          '--tw-ring-color': colors.brand.primary
                        } as React.CSSProperties}
                        value={formData[field.name as keyof typeof formData]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        disabled={isLoading || isGoogleLoading}
                      />
                    </div>
                    {errors[field.name] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[field.name]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Email */}
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
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      errors.email ? 'border-red-500' : ''
                    }`}
                    style={{
                      borderColor: errors.email ? '#ef4444' : `${colors.utility.secondaryText}40`,
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Workspace Name */}
              <div>
                <label
                  htmlFor="workspaceName"
                  className="block text-sm font-medium mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Workspace Name
                </label>
                <div className="relative">
                  <Building
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    id="workspaceName"
                    name="workspaceName"
                    type="text"
                    required
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      errors.workspaceName ? 'border-red-500' : ''
                    }`}
                    style={{
                      borderColor: errors.workspaceName ? '#ef4444' : `${colors.utility.secondaryText}40`,
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    placeholder="my-company"
                    value={formData.workspaceName}
                    onChange={handleChange}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                {errors.workspaceName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.workspaceName}</p>
                )}
                <p
                  className="mt-1 text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Use only letters, numbers, hyphens, and underscores (3-50 characters)
                </p>
              </div>

              {/* Password fields in two columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'password', show: showPassword, toggle: togglePasswordVisibility, placeholder: 'Create password', label: 'Password' },
                  { name: 'confirmPassword', show: showConfirmPassword, toggle: toggleConfirmPasswordVisibility, placeholder: 'Confirm password', label: 'Confirm Password' }
                ].map((field) => (
                  <div key={field.name}>
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-medium mb-2 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.show ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        className={`w-full pl-3 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          errors[field.name] ? 'border-red-500' : ''
                        }`}
                        style={{
                          borderColor: errors[field.name] ? '#ef4444' : `${colors.utility.secondaryText}40`,
                          backgroundColor: colors.utility.secondaryBackground,
                          color: colors.utility.primaryText,
                          '--tw-ring-color': colors.brand.primary
                        } as React.CSSProperties}
                        value={formData[field.name as keyof typeof formData]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        disabled={isLoading || isGoogleLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors hover:opacity-80"
                        style={{ color: colors.utility.secondaryText }}
                        onClick={field.toggle}
                        disabled={isLoading || isGoogleLoading}
                      >
                        {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors[field.name] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[field.name]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Create Account Button */}
              <div className="pt-2">
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Terms and Sign In Link */}
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  By signing up, you agree to our{' '}
                  <Link
                    to="/terms"
                    className="transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                    onClick={() => analyticsService.trackEvent(UI_EVENTS.MENU_CLICK, { menu_item: 'terms_link' })}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/privacy"
                    className="transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                    onClick={() => analyticsService.trackEvent(UI_EVENTS.MENU_CLICK, { menu_item: 'privacy_link' })}
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>

              <div className="text-center">
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                    onClick={() => analyticsService.trackEvent(AUTH_EVENTS.LOGIN, { source: 'register_page' })}
                  >
                    Sign in instead
                  </Link>
                </p>
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
    </div>
  );
};

export default RegisterPage;

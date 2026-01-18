// src/pages/auth/InvitationRegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Eye, EyeOff, Building, ArrowLeft, CheckCircle, X, UserCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import { useAuth } from '@/context/AuthContext';

interface InvitationData {
  id: string;
  email?: string;
  mobile_number?: string;
  tenant: {
    id: string;
    name: string;
    workspace_code: string;
  };
  user_exists: boolean;
  user_id?: string; // User ID when user exists
  existing_user_email?: string; // Actual email of existing user (may differ in case)
}

interface ExistingUserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_code: string;
}

const InvitationRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth(); // Get current logged-in user if any
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Get invitation codes from URL
  const userCode = searchParams.get('code');
  const secretCode = searchParams.get('secret');
  
  // State
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [existingUser, setExistingUser] = useState<ExistingUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<'preview' | 'form'>('preview');
  
  // Form data for new users
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    mobileNumber: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate invitation on mount
  useEffect(() => {
    validateInvitation();
  }, [userCode, secretCode]);

  const validateInvitation = async () => {
    if (!userCode || !secretCode) {
      toast.error('Invalid invitation link');
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(API_ENDPOINTS.USERS.INVITATIONS.VALIDATE, {
        user_code: userCode,
        secret_code: secretCode
      });
      
      if (!response.data.valid) {
        throw new Error(response.data.error || 'Invalid invitation');
      }
      
      const inviteData = response.data.invitation;
      setInvitation(inviteData);
      
      // If user exists, fetch their details
      if (inviteData.user_exists && inviteData.email) {
        // Check if user is already logged in
        if (currentUser && currentUser.email === inviteData.email) {
          setExistingUser({
            id: currentUser.id,
            email: currentUser.email,
            first_name: currentUser.first_name || '',
            last_name: currentUser.last_name || '',
            user_code: currentUser.user_code || ''
          });
          // Skip to form step for logged-in users
          setCurrentStep('form');
        } else {
          // For existing users not logged in, we'll get their info after they log in
          setExistingUser({
            id: '',
            email: inviteData.email,
            first_name: '',
            last_name: '',
            user_code: ''
          });
        }
      } else {
        // Pre-fill data for new users
        if (inviteData.email) {
          setFormData(prev => ({ ...prev, email: inviteData.email }));
        }
        if (inviteData.mobile_number) {
          setFormData(prev => ({ ...prev, mobileNumber: inviteData.mobile_number }));
        }
      }
      
    } catch (error: any) {
      console.error('Invitation validation error:', error);
      toast.error(error.response?.data?.error || error.message || 'Invalid invitation', {
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: colors.semantic.error,
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateNewUserForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Email validation (if not pre-filled)
    if (!invitation?.email && !formData.email) {
      newErrors.email = 'Email is required';
    } else if (!invitation?.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateNewUserForm() || !invitation) return;
    
    setSubmitting(true);
    
    try {
      // Register the user with invitation
      const registerData = {
        email: invitation.email || formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: invitation.mobile_number || formData.mobileNumber || undefined,
        userCode: userCode,
        secretCode: secretCode
      };
      
      const { data: authData } = await api.post(API_ENDPOINTS.AUTH.REGISTER_WITH_INVITATION, registerData);
      
      if (authData.access_token) {
        // Store auth data
        localStorage.setItem('auth_token', authData.access_token);
        if (authData.refresh_token) {
          localStorage.setItem('refresh_token', authData.refresh_token);
        }
        
        // Store user data
        if (authData.user) {
          localStorage.setItem('user_id', authData.user_id || authData.user.id);
          localStorage.setItem('user_data', JSON.stringify(authData.user));
        }
        
        // Store tenant info
        if (authData.tenant) {
          localStorage.setItem('tenant_id', authData.tenant.id);
          localStorage.setItem('current_tenant', JSON.stringify(authData.tenant));
        }
        
        toast.success(`Welcome to ${authData.tenant?.name || invitation.tenant.name}!`, {
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: colors.semantic.success,
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        throw new Error('No authentication token received');
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create account';
      toast.error(errorMessage, {
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: colors.semantic.error,
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExistingUserAccept = async () => {
    if (!invitation) return;

    setSubmitting(true);

    try {
      // Get the user ID from the invitation validation response
      // Since user exists, the backend should provide the user_id
      const userIdFromInvitation = invitation.user_id || existingUser?.id;

      if (!userIdFromInvitation) {
        // If we don't have user_id, redirect user to login first
        console.log('User ID not available - redirecting to login');
        toast('Please login first to accept this invitation.', {
          icon: 'ℹ️',
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: colors.brand.primary,
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
        // Redirect to login with invitation params to continue after login
        navigate(`/login?invitation=${userCode}&secret=${secretCode}&returnTo=accept`);
        return;
      }

      // Accept the invitation (NO AUTH REQUIRED - using anon key)
      const acceptResponse = await api.post(API_ENDPOINTS.USERS.INVITATIONS.ACCEPT, {
        user_code: userCode,
        secret_code: secretCode,
        user_id: userIdFromInvitation
      });

      toast.success(`Successfully accepted invitation to ${invitation.tenant.name}!`, {
        duration: 3000,
        icon: '🎉',
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: colors.semantic.success,
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });

      // Show info about the email used
      const displayEmail = invitation.existing_user_email || invitation.email || invitation.mobile_number;

      // Redirect to login page after successful acceptance
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: `You've been added to ${invitation.tenant.name}. Please login with ${displayEmail} to access the workspace.`
          }
        });
      }, 1500);

    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      const errorMsg = error.response?.data?.error || 'Failed to accept invitation';

      // If error is about user already having access, show appropriate message
      if (errorMsg.includes('already have access')) {
        toast('You already have access to this workspace. Please login.', {
          icon: 'ℹ️',
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: colors.brand.primary,
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
        navigate('/login');
      } else {
        toast.error(errorMsg, {
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: colors.semantic.error,
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (confirm('Are you sure you want to decline this invitation? This action cannot be undone.')) {
      toast('Invitation declined', {
        icon: 'ℹ️',
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: colors.utility.secondaryText,
          color: '#FFF',
        },
      });
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-colors duration-200"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: colors.brand.primary }}
        ></div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  // Step 1: Preview/Confirmation step
  if (currentStep === 'preview') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center py-6 px-4 transition-colors duration-200"
        style={{
          background: isDarkMode 
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.brand.primary}20)`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.brand.primary}10)`
        }}
      >
        <div className="w-full max-w-lg">
          {/* Back button */}
          <button
            onClick={() => navigate('/login')}
            className="mb-3 flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: colors.utility.secondaryText }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>

          <div 
            className="rounded-xl shadow-xl border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            {/* Header */}
            <div 
              className="px-6 py-6 text-white"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <Building className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Workspace Invitation</h1>
                  <p className="text-white/90">You've been invited to join a workspace</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Invitation details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle 
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: colors.brand.primary }}
                  />
                  <div>
                    <p 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      You're invited to join:
                    </p>
                    <h2 
                      className="text-2xl font-bold transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {invitation.tenant.name}
                    </h2>
                    <p 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Workspace Code: {invitation.tenant.workspace_code}
                    </p>
                  </div>
                </div>

                {(invitation.email || invitation.mobile_number) && (
                  <div 
                    className="rounded-lg p-4 transition-colors"
                    style={{ backgroundColor: `${colors.utility.secondaryText}10` }}
                  >
                    <p 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Invitation sent to: <span 
                        className="font-medium transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {invitation.email || invitation.mobile_number}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Message based on user existence */}
              <div 
                className="rounded-lg p-4 transition-colors"
                style={{ backgroundColor: `${colors.brand.primary}10` }}
              >
                {invitation.user_exists ? (
                  <p 
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    You already have an account. Click below to accept the invitation and join this workspace.
                  </p>
                ) : (
                  <p 
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    You'll need to create an account to join this workspace.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                {invitation.user_exists ? (
                  <button
                    onClick={() => setCurrentStep('form')}
                    className="w-full py-3 rounded-md font-medium transition-all duration-200 hover:opacity-90"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                      color: '#FFF'
                    }}
                  >
                    Accept
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep('form')}
                    className="w-full py-3 rounded-md font-medium transition-all duration-200 hover:opacity-90"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                      color: '#FFF'
                    }}
                  >
                    Create Account & Join
                  </button>
                )}

                <button
                  onClick={handleDecline}
                  className="w-full py-3 border rounded-md font-medium transition-colors hover:opacity-80"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.secondaryText,
                    backgroundColor: 'transparent'
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Form step for existing users
  if (invitation.user_exists) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center py-6 px-4 transition-colors duration-200"
        style={{
          background: isDarkMode 
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.brand.primary}20)`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.brand.primary}10)`
        }}
      >
        <div className="w-full max-w-lg">
          {/* Back button */}
          <button
            onClick={() => setCurrentStep('preview')}
            className="mb-3 flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: colors.utility.secondaryText }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div 
            className="rounded-xl shadow-xl border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 text-white"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Join {invitation.tenant.name}</h1>
                  <p className="text-white/90 text-sm">Your account is ready to join the workspace</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User exists message */}
              <div 
                className="rounded-lg p-4 transition-colors"
                style={{ backgroundColor: `${colors.utility.secondaryText}10` }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${colors.brand.primary}20` }}
                  >
                    <User 
                      className="h-6 w-6"
                      style={{ color: colors.brand.primary }}
                    />
                  </div>
                  <div>
                    <h3 
                      className="font-medium transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Account Found
                    </h3>
                    <p 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {invitation.email || invitation.mobile_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleExistingUserAccept}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-md font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{
                    background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                    color: '#FFF'
                  }}
                >
                  {submitting ? 'Accepting Invitation...' : 'Accept & Join Workspace'}
                </button>

                <button
                  onClick={handleDecline}
                  disabled={submitting}
                  className="w-full py-2.5 border rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.secondaryText,
                    backgroundColor: 'transparent'
                  }}
                >
                  Decline Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New user registration form
  return (
    <div 
      className="min-h-screen flex items-center justify-center py-6 px-4 transition-colors duration-200"
      style={{
        background: isDarkMode 
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.brand.primary}20)`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.brand.primary}10)`
      }}
    >
      <div className="w-full max-w-6xl">
        {/* Back button */}
        <button
          onClick={() => setCurrentStep('preview')}
          className="mb-3 flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: colors.utility.secondaryText }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div 
          className="rounded-xl shadow-xl border overflow-hidden transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
        >
          {/* Compact header */}
          <div 
            className="px-6 py-3 text-white"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Join {invitation.tenant.name}</h1>
                <p className="text-white/90 text-xs">Create your account to accept the invitation</p>
              </div>
            </div>
          </div>

          {/* Form with three column layout */}
          <form onSubmit={handleNewUserSubmit} className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* First column - Personal Information */}
              <div className="space-y-4">
                <h3 
                  className="text-sm font-semibold mb-3 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      First Name <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        borderColor: errors.firstName ? colors.semantic.error : colors.utility.secondaryText + '40',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p 
                        className="text-xs mt-0.5"
                        style={{ color: colors.semantic.error }}
                      >
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Last Name <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        borderColor: errors.lastName ? colors.semantic.error : colors.utility.secondaryText + '40',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p 
                        className="text-xs mt-0.5"
                        style={{ color: colors.semantic.error }}
                      >
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label 
                    className="block text-sm font-medium mb-1 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Email Address <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={invitation.email || formData.email}
                    onChange={handleChange}
                    readOnly={!!invitation.email}
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      borderColor: errors.email ? colors.semantic.error : colors.utility.secondaryText + '40',
                      backgroundColor: invitation.email ? colors.utility.secondaryText + '20' : colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      cursor: invitation.email ? 'not-allowed' : 'text',
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: colors.semantic.error }}
                    >
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Second column - Security */}
              <div className="space-y-4">
                <h3 
                  className="text-sm font-semibold mb-3 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Security
                </h3>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-1 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Password <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        borderColor: errors.password ? colors.semantic.error : colors.utility.secondaryText + '40',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors hover:opacity-80"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: colors.semantic.error }}
                    >
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label 
                    className="block text-sm font-medium mb-1 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Confirm Password <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        borderColor: errors.confirmPassword ? colors.semantic.error : colors.utility.secondaryText + '40',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors hover:opacity-80"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: colors.semantic.error }}
                    >
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Third column - Info and Actions */}
              <div className="space-y-4">
                <h3 
                  className="text-sm font-semibold mb-3 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Invitation Details
                </h3>
                
                {/* Info box */}
                <div 
                  className="rounded-lg p-3 transition-colors"
                  style={{ backgroundColor: `${colors.brand.primary}10` }}
                >
                  <div className="flex gap-2">
                    <CheckCircle 
                      className="h-4 w-4 flex-shrink-0 mt-0.5"
                      style={{ color: colors.brand.primary }}
                    />
                    <div className="text-xs">
                      <p 
                        className="font-medium mb-1 transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        What happens next?
                      </p>
                      <p 
                        className="leading-relaxed transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        After creating your account, you'll automatically join{' '}
                        <span className="font-medium">{invitation.tenant.name}</span> workspace
                        and have access to all shared resources.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 rounded-md font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                      color: '#FFF'
                    }}
                  >
                    {submitting ? 'Creating Account...' : 'Accept & Join Workspace'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="w-full py-2 border rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-80"
                    style={{
                      borderColor: colors.utility.secondaryText + '40',
                      color: colors.utility.secondaryText,
                      backgroundColor: 'transparent'
                    }}
                  >
                    <X size={16} />
                    Decline Invitation
                  </button>
                </div>

                {/* Login link */}
                <p 
                  className="text-center text-xs pt-2 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Already have an account?{' '}
                  <Link 
                    to={`/login?invitation=${userCode}&secret=${secretCode}`}
                    className="font-medium transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    Sign in instead
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvitationRegisterPage;
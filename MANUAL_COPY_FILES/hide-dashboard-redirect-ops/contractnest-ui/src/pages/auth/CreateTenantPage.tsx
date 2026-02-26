// src/pages/auth/CreateTenantPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Building2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabase'; 
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';
import api from '../../services/api';

const CreateTenantPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading, 
    registrationStatus,
    setCurrentTenant,
    tenants,
    setTenants 
  } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const hasCheckedAuth = useRef(false);
  const isSubmitting = useRef(false);
  
  // Get data from navigation state
  const fromGoogleAuth = location.state?.fromGoogleAuth || false;
  const isNewUser = location.state?.isNewUser || false;
  const resumingRegistration = location.state?.resumingRegistration || false;
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Form state
  const [formData, setFormData] = useState({
    workspaceName: '',
    workspaceCode: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [retryCount, setRetryCount] = useState(0);

  // Auth check - but don't redirect if coming from Google OAuth
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    
    if (!fromGoogleAuth && !authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, fromGoogleAuth]);

  // Generate workspace code from name
  const generateWorkspaceCode = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
  };

  // Check workspace name availability
  const checkNameAvailability = React.useCallback(
    debounce(async (name: string) => {
      if (!name || name.length < 3) {
        setNameAvailable(null);
        return;
      }

      setIsCheckingAvailability(true);
      try {
        const workspaceCode = generateWorkspaceCode(name);
        const { data: existing } = await supabase
          .from('t_tenants')
          .select('id')
          .eq('workspace_code', workspaceCode)
          .maybeSingle();
        
        setNameAvailable(!existing);
      } catch (error) {
        setNameAvailable(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 500),
    []
  );

  // Handle workspace name change
  const handleWorkspaceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      workspaceName: name,
      workspaceCode: generateWorkspaceCode(name)
    });
    
    if (errors.workspaceName) {
      setErrors({ ...errors, workspaceName: '' });
    }
    
    checkNameAvailability(name);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.workspaceName) {
      newErrors.workspaceName = 'Workspace name is required';
    } else if (formData.workspaceName.length < 3) {
      newErrors.workspaceName = 'Workspace name must be at least 3 characters';
    } else if (nameAvailable === false) {
      newErrors.workspaceName = 'This workspace name is already taken';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission with duplicate prevention
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Prevent duplicate submissions
    if (isSubmitting.current || isLoading) {
      return;
    }
    
    isSubmitting.current = true;
    setIsLoading(true);
    
    try {
      const response = await api.post('/api/tenants/create-google', {
        name: formData.workspaceName,
        workspace_code: formData.workspaceCode
      });
      
      // Handle different response structures
      let tenant = null;
      
      // Check if response.data is the tenant directly
      if (response.data && response.data.id && response.data.name) {
        tenant = response.data;
      } 
      // Check if it's wrapped in a tenant property
      else if (response.data && response.data.tenant) {
        tenant = response.data.tenant;
      }
      
      if (!tenant || !tenant.id) {
        throw new Error('Invalid response from server - no tenant data');
      }
      
      // Store tenant info
      const storage = localStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage;
      
      // Make sure tenant has required properties before accessing them
      if (tenant && tenant.id) {
        storage.setItem('tenant_id', tenant.id);
        storage.setItem('current_tenant', JSON.stringify(tenant));
        storage.setItem('is_admin', String(tenant.is_admin || false));
        
        // Update API headers
        api.defaults.headers.common['x-tenant-id'] = tenant.id;
      }
      
      // Update Auth Context with the new tenant
      if (setTenants && setCurrentTenant && tenant) {
        try {
          // Add the new tenant to the list
          const updatedTenants = [...(tenants || []), tenant];
          setTenants(updatedTenants);
          setCurrentTenant(tenant);
        } catch (contextError) {
          // Continue anyway - the tenant was created
        }
      }
      
      // Show success message
      toast.success(
        resumingRegistration 
          ? 'Registration completed successfully!' 
          : 'Workspace created successfully!',
        {
          duration: 3000,
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: colors.semantic.success,
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        }
      );
      
      // Reset retry count on success
      setRetryCount(0);
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/ops/cockpit', { replace: true });
      }, 100);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create workspace';
      const errorCode = error.response?.data?.code;
      
      // Handle specific error codes
      if (errorCode === 'WORKSPACE_CODE_EXISTS' || errorMessage.includes('already exists')) {
        setNameAvailable(false);
        setErrors({ workspaceName: 'This workspace name is already taken. Please try another.' });
      } else if (errorCode === 'TENANT_CREATION_FAILED' && error.response?.data?.retry) {
        // This is a retryable error
        setRetryCount(prev => prev + 1);
        
        if (retryCount < 2) {
          toast.error(`${errorMessage}. Please try again.`, {
            duration: 4000,
            style: {
              padding: '16px',
              borderRadius: '8px',
              background: colors.semantic.error,
              color: '#FFF',
              fontSize: '16px',
              minWidth: '300px'
            },
          });
        } else {
          // After 3 attempts, show contact support message
          toast.error('We\'re having trouble creating your workspace. Please contact support if this continues.', {
            duration: 6000,
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
      } else {
        // Generic error
        toast.error(errorMessage, {
          duration: 4000,
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
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  // Don't show loading if coming from Google OAuth
  if (!fromGoogleAuth && authLoading) {
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

  // Determine the appropriate title and subtitle
  const getPageTitle = () => {
    if (resumingRegistration) {
      return 'Complete Your Registration';
    } else if (isNewUser) {
      return 'Welcome! Create Your Workspace';
    } else {
      return 'Create a New Workspace';
    }
  };

  const getPageSubtitle = () => {
    if (resumingRegistration) {
      return "Let's finish setting up your workspace to get you started.";
    } else if (fromGoogleAuth && isNewUser) {
      return "You're almost done! Just need to set up your workspace.";
    } else {
      return "Set up a workspace for your team to collaborate";
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200"
      style={{
        background: isDarkMode 
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div 
            className="mx-auto h-12 w-12 flex items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.brand.primary}20` }}
          >
            <Building2 
              className="h-6 w-6"
              style={{ color: colors.brand.primary }}
            />
          </div>
          <h2 
            className="mt-6 text-center text-3xl font-extrabold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            {getPageTitle()}
          </h2>
          <p 
            className="mt-2 text-center text-sm transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {getPageSubtitle()}
          </p>
          {user?.email && (
            <p 
              className="mt-2 text-center text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Signed in as {user.email}
            </p>
          )}
          
          {/* Show retry indicator if there have been failures */}
          {retryCount > 0 && (
            <div 
              className="mt-4 p-3 border rounded-md transition-colors"
              style={{
                backgroundColor: `${colors.semantic.warning}10`,
                borderColor: `${colors.semantic.warning}40`
              }}
            >
              <div className="flex items-center">
                <RefreshCw 
                  className="h-5 w-5 mr-2"
                  style={{ color: colors.semantic.warning }}
                />
                <p 
                  className="text-sm"
                  style={{ color: colors.semantic.warning }}
                >
                  Attempt {retryCount + 1} of 3. The system is experiencing high load.
                </p>
              </div>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label 
              htmlFor="workspaceName" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Workspace Name
            </label>
            <div className="mt-1 relative">
              <input
                id="workspaceName"
                name="workspaceName"
                type="text"
                value={formData.workspaceName}
                onChange={handleWorkspaceNameChange}
                className={`appearance-none block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors ${
                  errors.workspaceName ? 'border-red-300' : 
                  nameAvailable === false ? 'border-red-300' :
                  nameAvailable === true ? 'border-green-300' :
                  ''
                }`}
                style={{
                  borderColor: errors.workspaceName || nameAvailable === false 
                    ? colors.semantic.error
                    : nameAvailable === true
                    ? colors.semantic.success
                    : colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                placeholder="My Company"
                autoFocus
                disabled={isLoading}
              />
              
              {/* Availability indicator */}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {isCheckingAvailability && (
                  <svg 
                    className="animate-spin h-5 w-5"
                    style={{ color: colors.utility.secondaryText }}
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                )}
                {!isCheckingAvailability && nameAvailable === true && (
                  <CheckCircle2 
                    className="h-5 w-5"
                    style={{ color: colors.semantic.success }}
                  />
                )}
                {!isCheckingAvailability && nameAvailable === false && (
                  <AlertCircle 
                    className="h-5 w-5"
                    style={{ color: colors.semantic.error }}
                  />
                )}
              </div>
            </div>
            
            {errors.workspaceName && (
              <p 
                className="mt-1 text-sm"
                style={{ color: colors.semantic.error }}
              >
                {errors.workspaceName}
              </p>
            )}
            
            {/* Workspace code preview */}
            {formData.workspaceCode && (
              <p 
                className="mt-1 text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Workspace code: <span className="font-mono">{formData.workspaceCode}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading || isCheckingAvailability || nameAvailable === false}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {resumingRegistration ? 'Completing Registration...' : 'Creating Workspace...'}
                </>
              ) : (
                resumingRegistration ? 'Complete Registration' : 'Create Workspace'
              )}
            </button>

            {/* Show alternative actions for resuming users */}
            {resumingRegistration && !isLoading && (
              <div className="text-center">
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Having trouble?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ workspaceName: '', workspaceCode: '' });
                      setErrors({});
                      setNameAvailable(null);
                    }}
                    className="font-medium transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    Try a different name
                  </button>
                  {' or '}
                  <a 
                    href="/support" 
                    className="font-medium transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    contact support
                  </a>
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Additional help text */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div 
                className="w-full border-t"
                style={{ borderColor: colors.utility.secondaryText + '40' }}
              />
            </div>
            <div className="relative flex justify-center text-sm">
              <span 
                className="px-2 transition-colors"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.secondaryText
                }}
              >
                Need help?
              </span>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p 
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Your workspace is where your team will collaborate on contracts and documents.
              You can invite team members after creating your workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTenantPage;
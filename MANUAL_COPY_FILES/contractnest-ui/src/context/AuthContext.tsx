// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query'; // PRODUCTION FIX: Add React Query
import api from '../services/api';
import { API_ENDPOINTS } from '../services/serviceURLs';
import toast from 'react-hot-toast';
import { setUserContext } from '../utils/sentry';
import { sessionService } from '../services/sessionService';

// Constants for storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TENANT_ID: 'tenant_id',
  CURRENT_TENANT: 'current_tenant',
  IS_ADMIN: 'is_admin',
  IS_LIVE: 'is_live_environment',
  REMEMBER_ME: 'remember_me',
  USER_ID: 'user_id',
  USER_DATA: 'user_data',
  // Lock screen related
  LOCK_STATE: 'lock_state',
  LOCK_TIME: 'lock_time',
  FAILED_UNLOCK_ATTEMPTS: 'failed_unlock_attempts',
  UNLOCK_BLOCKED_UNTIL: 'unlock_blocked_until',
  // Onboarding related
  ONBOARDING_COMPLETE: 'onboarding_complete'
};

// Timeout constants
const LOCK_TIMEOUT = 16 * 60 * 1000; // 5 minutes - lock screen appears
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes - total session timeout
const SESSION_TIMEOUT_AFTER_LOCK = 16 * 60 * 1000; // 10 minutes after lock to logout
const MAX_UNLOCK_ATTEMPTS = 5;
const LOCK_BLOCK_DURATION = 60 * 1000; // 1 minute block after max attempts

// Define the User and Tenant types
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_code?: string;
  preferred_language?: string;  
  preferred_theme?: string; 
  is_dark_mode?: boolean; 
  industry?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  is_admin?: boolean;
  registration_status?: 'complete' | 'pending_workspace';
}

interface Tenant {
  id: string;
  name: string;
  workspace_code: string;
  domain?: string;
  status: string;
  is_default?: boolean;
  is_admin?: boolean;
  storage_setup_complete?: boolean;
  is_owner?: boolean;
  user_is_profile_admin?: boolean;
  is_explicitly_assigned?: boolean;
}

// Google auth data interface
interface GoogleAuthData {
  user: User;
  tenants: Tenant[];
  access_token: string;
  refresh_token?: string;
  isNewUser: boolean;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  tenants: Tenant[];
  currentTenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isLive: boolean;
  registrationStatus: 'complete' | 'pending_workspace' | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (userData: RegisterFormData) => Promise<void>;
  logout: () => void;
  setCurrentTenant: (tenant: Tenant) => void;
  clearError: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  toggleEnvironment: () => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  refreshData: () => Promise<void>;
  // Environment switch modal
  showEnvironmentSwitchModal: boolean;
  pendingEnvironment: 'live' | 'test' | null;
  confirmEnvironmentSwitch: () => void;
  cancelEnvironmentSwitch: () => void;
  // Google OAuth methods
  setGoogleAuthData: (data: GoogleAuthData) => void;
  setAuthToken: (token: string) => void;
  linkGoogleAccount: () => Promise<void>;
  unlinkGoogleAccount: () => Promise<void>;
  hasGoogleAuth: boolean;
  // Lock screen properties
  isLocked: boolean;
  lockTime: Date | null;
  failedUnlockAttempts: number;
  unlockBlockedUntil: Date | null;
  lockScreen: () => void;
  unlockScreen: () => void;
  // Multi-tenant configuration
  isMultiTenantEnabled: boolean;
  canSwitchTenants: boolean;
  // Add setTenants for CreateTenantPage
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  // Onboarding properties
  hasCompletedOnboarding: boolean;
  checkOnboardingStatus: () => Promise<boolean>;
  skipOnboarding: () => void;
}

// Register form data interface
export interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  workspaceName: string;
  countryCode?: string;
  mobileNumber?: string;
}

// User preferences interface
export interface UserPreferences {
  preferred_language: string;
  preferred_theme: string;
  is_dark_mode: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true');
  const [isLive, setIsLive] = useState<boolean>(localStorage.getItem(STORAGE_KEYS.IS_LIVE) !== 'false');
  const [registrationStatus, setRegistrationStatus] = useState<'complete' | 'pending_workspace' | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // PRODUCTION FIX: Add React Query client

  // Environment switch modal state
  const [showEnvironmentSwitchModal, setShowEnvironmentSwitchModal] = useState<boolean>(false);
  const [pendingEnvironment, setPendingEnvironment] = useState<'live' | 'test' | null>(null);
  
  // Google OAuth state
  const [hasGoogleAuth, setHasGoogleAuth] = useState<boolean>(false);

  // Lock screen state
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  const [failedUnlockAttempts, setFailedUnlockAttempts] = useState<number>(0);
  const [unlockBlockedUntil, setUnlockBlockedUntil] = useState<Date | null>(null);

  // Multi-tenant configuration state
  const [isMultiTenantEnabled, setIsMultiTenantEnabled] = useState<boolean>(true);

  // Onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true); // Default to true to not block existing users

  // Refs for timeouts
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lockLogoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed property for whether user can switch tenants
  const canSwitchTenants = isMultiTenantEnabled && (tenants.length > 1 || user?.is_admin === true);

  // Storage management methods
  const storage = {
    getStorage: () => {
      return rememberMe ? localStorage : sessionStorage;
    },
    
    setAuthToken: (token: string, refreshToken?: string) => {
      const store = storage.getStorage();
      store.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      
      if (refreshToken) {
        store.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },
    
    getAuthToken: (): string | null => {
      return storage.getStorage().getItem(STORAGE_KEYS.AUTH_TOKEN);
    },
    
    setTenantId: (tenantId: string) => {
      if (!tenantId) return;
      
      storage.getStorage().setItem(STORAGE_KEYS.TENANT_ID, tenantId);
      api.defaults.headers.common['x-tenant-id'] = tenantId;
    },
    
    getTenantId: (): string | null => {
      return storage.getStorage().getItem(STORAGE_KEYS.TENANT_ID);
    },
    
    setUserId: (userId: string) => {
      if (!userId) return;
      storage.getStorage().setItem(STORAGE_KEYS.USER_ID, userId);
    },
    
    getUserId: (): string | null => {
      return storage.getStorage().getItem(STORAGE_KEYS.USER_ID);
    },
    
    setUserData: (userData: User) => {
      storage.getStorage().setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    },
    
    getUserData: (): User | null => {
      const data = storage.getStorage().getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    },
    
    setCurrentTenant: (tenant: Tenant | null) => {
      if (!tenant) {
        storage.getStorage().removeItem(STORAGE_KEYS.CURRENT_TENANT);
        storage.getStorage().removeItem(STORAGE_KEYS.TENANT_ID);
        storage.getStorage().removeItem(STORAGE_KEYS.IS_ADMIN);
        
        delete api.defaults.headers.common['x-tenant-id'];
        return;
      }
      
      storage.getStorage().setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant));
      storage.setTenantId(tenant.id);
      storage.getStorage().setItem(STORAGE_KEYS.IS_ADMIN, String(tenant.is_admin || false));
    },
    
    getCurrentTenant: (): Tenant | null => {
      const data = storage.getStorage().getItem(STORAGE_KEYS.CURRENT_TENANT);
      return data ? JSON.parse(data) : null;
    },
    
    setRememberMe: (remember: boolean) => {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, String(remember));
      setRememberMe(remember);
      
      if (!remember) {
        // Move data from localStorage to sessionStorage
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const tenantId = localStorage.getItem(STORAGE_KEYS.TENANT_ID);
        const currentTenant = localStorage.getItem(STORAGE_KEYS.CURRENT_TENANT);
        const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        if (token) {
          sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }
        
        if (refreshToken) {
          sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        }
        
        if (tenantId) {
          sessionStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId);
          localStorage.removeItem(STORAGE_KEYS.TENANT_ID);
        }
        
        if (currentTenant) {
          sessionStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, currentTenant);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
        }
        
        if (userId) {
          sessionStorage.setItem(STORAGE_KEYS.USER_ID, userId);
          localStorage.removeItem(STORAGE_KEYS.USER_ID);
        }
        
        if (userData) {
          sessionStorage.setItem(STORAGE_KEYS.USER_DATA, userData);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        }
      }
    },
    
    setEnvironmentMode: (isLive: boolean) => {
      localStorage.setItem(STORAGE_KEYS.IS_LIVE, String(isLive));
    },
    
    clearAuth: () => {
      [localStorage, sessionStorage].forEach(store => {
        store.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        store.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        store.removeItem(STORAGE_KEYS.TENANT_ID);
        store.removeItem(STORAGE_KEYS.CURRENT_TENANT);
        store.removeItem(STORAGE_KEYS.IS_ADMIN);
        store.removeItem(STORAGE_KEYS.USER_ID);
        store.removeItem(STORAGE_KEYS.USER_DATA);
        store.removeItem(STORAGE_KEYS.LOCK_STATE);
        store.removeItem(STORAGE_KEYS.LOCK_TIME);
        store.removeItem(STORAGE_KEYS.FAILED_UNLOCK_ATTEMPTS);
        store.removeItem(STORAGE_KEYS.UNLOCK_BLOCKED_UNTIL);
        store.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      });
      
      delete api.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['x-tenant-id'];
    }
  };

  // Clear all timeouts
  const clearAllTimeouts = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (lockLogoutTimeoutRef.current) {
      clearTimeout(lockLogoutTimeoutRef.current);
      lockLogoutTimeoutRef.current = null;
    }
  };

  // Lock screen function
  const lockScreen = () => {
    if (isLocked) return;
    
    console.log('Locking screen after 5 minutes of inactivity');
    
    setIsLocked(true);
    const lockTimeDate = new Date();
    setLockTime(lockTimeDate);
    
    sessionStorage.setItem(STORAGE_KEYS.LOCK_STATE, 'true');
    sessionStorage.setItem(STORAGE_KEYS.LOCK_TIME, lockTimeDate.toISOString());
    
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    
    lockLogoutTimeoutRef.current = setTimeout(() => {
      console.log('Session expired - 10 minutes passed since lock without unlock');
      logout();
    }, SESSION_TIMEOUT_AFTER_LOCK);
    
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('lock_screen');
      channel.postMessage({ action: 'lock' });
      channel.close();
    }
  };

  // Unlock screen function
  const unlockScreen = () => {
    console.log('Unlocking screen');
    
    setIsLocked(false);
    setLockTime(null);
    setFailedUnlockAttempts(0);
    setUnlockBlockedUntil(null);
    
    sessionStorage.removeItem(STORAGE_KEYS.LOCK_STATE);
    sessionStorage.removeItem(STORAGE_KEYS.LOCK_TIME);
    sessionStorage.removeItem(STORAGE_KEYS.FAILED_UNLOCK_ATTEMPTS);
    sessionStorage.removeItem(STORAGE_KEYS.UNLOCK_BLOCKED_UNTIL);
    
    if (lockLogoutTimeoutRef.current) {
      clearTimeout(lockLogoutTimeoutRef.current);
      lockLogoutTimeoutRef.current = null;
    }
    
    resetIdleTimer();
    resetSessionTimeout();
    
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('lock_screen');
      channel.postMessage({ action: 'unlock' });
      channel.close();
    }
  };

  // Reset idle timer
  const resetIdleTimer = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    if (isAuthenticated && !isLocked) {
      idleTimeoutRef.current = setTimeout(() => {
        lockScreen();
      }, LOCK_TIMEOUT);
    }
  };

  // Reset session timeout
  const resetSessionTimeout = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    if (isAuthenticated) {
      sessionTimeoutRef.current = setTimeout(() => {
        console.log('Session timeout - 15 minutes total');
        logout();
      }, SESSION_TIMEOUT);
    }
  };

  // Function to check onboarding status
  const checkOnboardingStatus = async (): Promise<boolean> => {
    try {
      // Only check if user is authenticated and has a current tenant
      if (!isAuthenticated || !currentTenant) {
        return true; // Don't block if not authenticated
      }

      // Check if we already have the status in storage
      const storedStatus = sessionStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      if (storedStatus === 'true') {
        setHasCompletedOnboarding(true);
        return true;
      }

      const response = await api.get(API_ENDPOINTS.ONBOARDING.STATUS);
      
      if (response.data && response.data.data) {
        const isComplete = response.data.data.is_complete || false;
        setHasCompletedOnboarding(isComplete);
        
        // Store in session to avoid repeated checks
        if (isComplete) {
          sessionStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
        }
        
        return isComplete;
      }
      
      // If we can't determine status, assume complete to not block
      return true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Don't block user if we can't check status
      return true;
    }
  };

  // Function to skip onboarding (mark as complete)
  const skipOnboarding = () => {
    setHasCompletedOnboarding(true);
    sessionStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  };

  // Update Sentry user/tenant context when they change
  useEffect(() => {
    setUserContext(user, currentTenant, isLive);
  }, [user, currentTenant, isLive]);

  // Update API headers when environment changes
  useEffect(() => {
    if (isLive) {
      api.defaults.headers.common['x-environment'] = 'live';
    } else {
      api.defaults.headers.common['x-environment'] = 'test';
    }
  }, [isLive]);

  // Check if user has Google auth linked
  useEffect(() => {
    const checkAuthMethods = async () => {
      if (user && storage.getAuthToken()) {
        try {
          setHasGoogleAuth(
            user.user_metadata?.provider === 'google' || 
            user.app_metadata?.provider === 'google' ||
            user.user_metadata?.google_linked === true ||
            false
          );
        } catch (error) {
          console.error('Error checking auth methods:', error);
        }
      }
    };
    
    checkAuthMethods();
  }, [user]);

  // Event listeners for user activity
  useEffect(() => {
    if (isAuthenticated) {
      resetSessionTimeout();
      resetIdleTimer();
      
      const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
      
      const handleUserActivity = () => {
        resetIdleTimer();
        
        if (!isLocked) {
          resetSessionTimeout();
        }
      };
      
      activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      
      return () => {
        clearAllTimeouts();
        
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleUserActivity);
        });
      };
    } else {
      clearAllTimeouts();
    }
  }, [isAuthenticated, isLocked]);

  // Listen for lock/unlock events from other tabs
  useEffect(() => {
    if (!window.BroadcastChannel) return;
    
    const channel = new BroadcastChannel('lock_screen');
    
    channel.onmessage = (event) => {
      if (event.data.action === 'lock' && !isLocked) {
        setIsLocked(true);
        setLockTime(new Date());
        
        if (lockLogoutTimeoutRef.current) {
          clearTimeout(lockLogoutTimeoutRef.current);
        }
        lockLogoutTimeoutRef.current = setTimeout(() => {
          console.log('Session expired - 10 minutes passed since lock without unlock');
          logout();
        }, SESSION_TIMEOUT_AFTER_LOCK);
        
      } else if (event.data.action === 'unlock' && isLocked) {
        // Clear all lock-related state
        setIsLocked(false);
        setLockTime(null);
        setFailedUnlockAttempts(0);
        setUnlockBlockedUntil(null);
        
        // Clear storage
        sessionStorage.removeItem(STORAGE_KEYS.LOCK_STATE);
        sessionStorage.removeItem(STORAGE_KEYS.LOCK_TIME);
        sessionStorage.removeItem(STORAGE_KEYS.FAILED_UNLOCK_ATTEMPTS);
        sessionStorage.removeItem(STORAGE_KEYS.UNLOCK_BLOCKED_UNTIL);
        
        // Clear any remaining timeouts
        if (lockLogoutTimeoutRef.current) {
          clearTimeout(lockLogoutTimeoutRef.current);
          lockLogoutTimeoutRef.current = null;
        }
        
        // Reset timers for the active session
        resetIdleTimer();
        resetSessionTimeout();
        
      } else if (event.data.action === 'logout') {
        clearAllTimeouts();
        storage.clearAuth();
        setUser(null);
        setTenants([]);
        setCurrentTenantState(null);
        setIsAuthenticated(false);
        setIsLocked(false);
        setLockTime(null);
        setFailedUnlockAttempts(0);
        setUnlockBlockedUntil(null);
        setRegistrationStatus(null);
        setHasCompletedOnboarding(true);
        navigate('/login');
      }
    };
    
    return () => {
      channel.close();
    };
  }, [isLocked]);

  // Restore lock state on mount
  useEffect(() => {
    const lockState = sessionStorage.getItem(STORAGE_KEYS.LOCK_STATE);
    const lockTimeStr = sessionStorage.getItem(STORAGE_KEYS.LOCK_TIME);
    const failedAttemptsStr = sessionStorage.getItem(STORAGE_KEYS.FAILED_UNLOCK_ATTEMPTS);
    const blockedUntilStr = sessionStorage.getItem(STORAGE_KEYS.UNLOCK_BLOCKED_UNTIL);
    
    if (lockState === 'true' && lockTimeStr && isAuthenticated) {
      const lockTimeDate = new Date(lockTimeStr);
      const timeSinceLock = Date.now() - lockTimeDate.getTime();
      
      if (timeSinceLock > SESSION_TIMEOUT_AFTER_LOCK) {
        console.log('Session expired - app reopened after lock timeout');
        logout();
        return;
      }
      
      setIsLocked(true);
      setLockTime(lockTimeDate);
      
      const remainingTime = SESSION_TIMEOUT_AFTER_LOCK - timeSinceLock;
      lockLogoutTimeoutRef.current = setTimeout(() => {
        console.log('Session expired - 10 minutes passed since lock without unlock');
        logout();
      }, remainingTime);
      
      if (failedAttemptsStr) {
        setFailedUnlockAttempts(parseInt(failedAttemptsStr, 10));
      }
      
      if (blockedUntilStr) {
        const blockedUntil = new Date(blockedUntilStr);
        if (blockedUntil > new Date()) {
          setUnlockBlockedUntil(blockedUntil);
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.UNLOCK_BLOCKED_UNTIL);
        }
      }
    }
  }, [isAuthenticated]);

  // Function to refresh data
  const refreshData = async () => {
    console.log('Refreshing data for environment:', isLive ? 'Live' : 'Test');
    
    window.dispatchEvent(new CustomEvent('environment-changed', { 
      detail: { isLive, tenantId: currentTenant?.id } 
    }));
    
    window.dispatchEvent(new CustomEvent('tenant-changed', { 
      detail: { tenant: currentTenant, isLive } 
    }));
    
    if (isAuthenticated && currentTenant) {
      try {
        const { data: tenantsData } = await api.get(API_ENDPOINTS.TENANTS.LIST);
        setTenants(tenantsData);
      } catch (error) {
        console.error('Error refreshing tenants:', error);
      }
    }
  };

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      const token = storage.getAuthToken();
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          api.defaults.headers.common['x-environment'] = isLive ? 'live' : 'test';
          
          const tenantId = storage.getTenantId();
          if (tenantId) {
            api.defaults.headers.common['x-tenant-id'] = tenantId;
          }
          
          const userId = storage.getUserId();
          if (userId) {
            sessionService.initializeSession();
          }
          
          const { data: userData } = await api.get(API_ENDPOINTS.AUTH.USER);
          setUser(userData);
          storage.setUserData(userData);
          setRegistrationStatus(userData.registration_status || 'complete');
          
          if (userData.registration_status === 'pending_workspace') {
            console.log('User has pending workspace registration');
            setIsAuthenticated(true);
            setIsLoading(false);
            navigate('/create-tenant');
            return;
          }
          
          const { data: tenantsData } = await api.get(API_ENDPOINTS.TENANTS.LIST);
          setTenants(tenantsData);
          
          if (tenantsData.length === 0) {
            setIsAuthenticated(true);
            setIsLoading(false);
            navigate('/create-tenant');
            return;
          }
          
          const storedTenant = storage.getCurrentTenant();
          if (storedTenant) {
            setCurrentTenantState(storedTenant);
          } else {
            const defaultTenant = tenantsData.find((t: Tenant) => t.is_default) || tenantsData[0];
            if (defaultTenant) {
              const normalizedTenant = {
                ...defaultTenant,
                is_admin: defaultTenant.is_admin || false
              };
              
              setCurrentTenantState(normalizedTenant);
              storage.setCurrentTenant(normalizedTenant);
            }
          }
          
          setIsAuthenticated(true);
          resetSessionTimeout();
          resetIdleTimer();
          
          // Check onboarding status after successful auth
          await checkOnboardingStatus();
        } catch (err: any) {
          console.error('Error initializing auth:', err.message);
          
          const isNetworkRelatedError = 
            err.message === 'Network Error' || 
            err.code === 'ERR_NETWORK' || 
            err.code === 'ECONNABORTED' ||
            !navigator.onLine ||
            (err.response?.status >= 500 && !navigator.onLine) ||
            err.message?.includes('Network') ||
            err.message?.includes('fetch');
          
          if (isNetworkRelatedError) {
            console.log('Network/Connection error during auth init - keeping user logged in');
            
            const storedUserData = storage.getUserData();
            const storedTenant = storage.getCurrentTenant();
            
            if (storedUserData) {
              setUser(storedUserData);
              setRegistrationStatus(storedUserData.registration_status || 'complete');
              if (storedTenant) {
                setCurrentTenantState(storedTenant);
                setTenants([storedTenant]);
              }
              setIsAuthenticated(true);
            }
            
            setIsLoading(false);
            return;
          }
          
          if (err.response?.status === 401 || err.response?.status === 403) {
            storage.clearAuth();
            sessionService.clearSession();
            setIsAuthenticated(false);
            setRegistrationStatus(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  // Toggle between live and test environment
  const toggleEnvironment = async () => {
    const targetEnvironment = isLive ? 'test' : 'live';
    setPendingEnvironment(targetEnvironment);
    setShowEnvironmentSwitchModal(true);
  };

  // PRODUCTION FIX: Confirm environment switch with cache clearing
  const confirmEnvironmentSwitch = async () => {
    if (!pendingEnvironment) return;

    const newIsLive = pendingEnvironment === 'live';

    setShowEnvironmentSwitchModal(false);

    toast.loading(`Switching to ${newIsLive ? 'Live' : 'Test'} environment...`, {
      id: 'environment-switch'
    });

    // Update state and storage
    setIsLive(newIsLive);
    storage.setEnvironmentMode(newIsLive);

    // Update axios default headers
    api.defaults.headers.common['x-environment'] = newIsLive ? 'live' : 'test';

    // PRODUCTION FIX: Clear ALL React Query cache to prevent stale data
    console.log('🔄 Clearing React Query cache for environment switch...');
    queryClient.clear();

    // Small delay to ensure state updates propagate
    await new Promise(resolve => setTimeout(resolve, 100));

    setPendingEnvironment(null);

    toast.success(`Switched to ${newIsLive ? 'Live' : 'Test'} environment`, {
      id: 'environment-switch',
      duration: 2000,
      style: {
        padding: '16px',
        borderRadius: '8px',
        background: '#10B981',
        color: '#FFF',
        fontSize: '16px',
        minWidth: '300px'
      },
    });

    // Navigate to dashboard - will trigger fresh data fetch
    navigate('/dashboard');
  };

  // Cancel environment switch
  const cancelEnvironmentSwitch = () => {
    setShowEnvironmentSwitchModal(false);
    setPendingEnvironment(null);
  };

  // Update user preferences
  const updateUserPreferences = async (preferences: Partial<UserPreferences>) => {
    try {
      console.log('Updating user preferences:', preferences);
      
      // Make sure we have a user
      if (!user) {
        throw new Error('No user logged in');
      }
      
      // Call the API endpoint
      const response = await api.patch(API_ENDPOINTS.AUTH.UPDATE_PREFERENCES, preferences);
      
      if (response.data) {
        // Update the local user state with new preferences
        const updatedUser = {
          ...user,
          preferred_theme: preferences.preferred_theme !== undefined ? preferences.preferred_theme : user.preferred_theme,
          is_dark_mode: preferences.is_dark_mode !== undefined ? preferences.is_dark_mode : user.is_dark_mode,
          preferred_language: preferences.preferred_language !== undefined ? preferences.preferred_language : user.preferred_language
        };
        
        setUser(updatedUser);
        storage.setUserData(updatedUser);
        
        // Show success message
        toast.success('Preferences updated successfully', {
          duration: 2000,
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: '#10B981',
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
        
        // Return the updated data
        return response.data;
      }
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      
      const errorMessage = error.response?.data?.error || 'Failed to update preferences';
      
      toast.error(errorMessage, {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string, remember: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    storage.setRememberMe(remember);
    
    try {
      const { data } = await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
      
      storage.setAuthToken(data.access_token, data.refresh_token);
      
      const userData = {
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.first_name || '',
        last_name: data.user.last_name || '',
        user_code: data.user.user_code || '',
        is_admin: data.user.is_admin || false,
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
        registration_status: data.user.registration_status || 'complete'
      };
      
      setUser(userData);
      storage.setUserData(userData);
      storage.setUserId(data.user.id);
      setRegistrationStatus(userData.registration_status);
      
      const multiTenantEnabled = data.user?.user_metadata?.multi_tenant_enabled !== false;
      setIsMultiTenantEnabled(multiTenantEnabled);
      
      console.log('Login response - registration status:', userData.registration_status);
      console.log('Login response - multi-tenant enabled:', multiTenantEnabled);
      console.log('Login response - user is admin:', userData.is_admin);
      console.log('Login response - tenant count:', data.tenants?.length);
      
      const activeSessionKey = `active_session_${data.user.id}`;
      localStorage.removeItem(activeSessionKey);
      sessionStorage.removeItem('session_conflict');
      
      const sessionId = sessionService.initializeSession();
      
      setTimeout(() => {
        localStorage.setItem(activeSessionKey, sessionId);
        
        if (window.BroadcastChannel) {
          const channel = new BroadcastChannel('session_conflict');
          channel.postMessage({ 
            userId: data.user.id, 
            sessionId,
            action: 'login'
          });
          channel.close();
        }
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: activeSessionKey,
          newValue: sessionId,
          url: window.location.href
        }));
      }, 500);
      
      setTenants(data.tenants || []);
      
      if (data.needs_workspace_setup || userData.registration_status === 'pending_workspace') {
        console.log('User needs to complete workspace setup');
        setIsAuthenticated(true);
        setIsLoading(false);
        navigate('/create-tenant');
        return;
      }
      
      if (!data.tenants || data.tenants.length === 0) {
        setIsAuthenticated(true);
        setIsLoading(false);
        navigate('/create-tenant');
        return;
      } else if (multiTenantEnabled && userData.is_admin) {
        console.log('Admin user with multi-tenant enabled - redirecting to select tenant');
        setIsAuthenticated(true);
        navigate('/select-tenant');
      } else if (multiTenantEnabled && data.tenants.length > 1) {
        console.log('Multiple tenants with multi-tenant enabled - redirecting to select tenant');
        setIsAuthenticated(true);
        navigate('/select-tenant');
      } else {
        console.log('Single tenant or multi-tenant disabled - processing onboarding check');
        const tenant = {
          ...data.tenants[0],
          is_admin: data.tenants[0].is_admin || false
        };
        
        setCurrentTenantState(tenant);
        storage.setCurrentTenant(tenant);
        setIsAuthenticated(true);
        
        // Check onboarding status before navigating
        const isOnboardingComplete = await checkOnboardingStatus();
        
        if (!isOnboardingComplete) {
          console.log('User needs to complete onboarding');
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }
      
      resetSessionTimeout();
      resetIdleTimer();
      
      toast.success('Login successful!', {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } catch (err: any) {
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !navigator.onLine) {
        setError('No internet connection. Please check your network.');
        toast.error('No internet connection', {
          duration: 3000,
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: '#EF4444',
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
        return;
      }
      
      const errorMessage = err.response?.data?.error || 'An error occurred during login';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = await api.post(API_ENDPOINTS.AUTH.REGISTER, {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        workspaceName: userData.workspaceName,
        countryCode: userData.countryCode,
        mobileNumber: userData.mobileNumber
      });
      
      storage.setRememberMe(true);
      storage.setAuthToken(data.access_token, data.refresh_token);
      
      setUser(data.user);
      storage.setUserData(data.user);
      storage.setUserId(data.user.id);
      setRegistrationStatus('complete');
      
      const activeSessionKey = `active_session_${data.user.id}`;
      localStorage.removeItem(activeSessionKey);
      sessionStorage.removeItem('session_conflict');
      
      const sessionId = sessionService.initializeSession();
      
      setTimeout(() => {
        localStorage.setItem(activeSessionKey, sessionId);
        
        if (window.BroadcastChannel) {
          const channel = new BroadcastChannel('session_conflict');
          channel.postMessage({ 
            userId: data.user.id, 
            sessionId,
            action: 'login'
          });
          channel.close();
        }
      }, 500);
      
      if (data.tenant) {
        setTenants([data.tenant]);
        setCurrentTenantState(data.tenant);
        storage.setCurrentTenant(data.tenant);
      }
      
      setIsAuthenticated(true);
      
      resetSessionTimeout();
      resetIdleTimer();
      
      toast.success('Registration successful!', {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      if (!data.tenant) {
        navigate('/create-tenant');
      } else {
        // Check if new user should go through onboarding
        const shouldOnboard = data.user?.user_metadata?.should_onboard !== false;
        if (shouldOnboard) {
          setHasCompletedOnboarding(false);
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An error occurred during registration';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Set Google auth data
  const setGoogleAuthData = async (data: GoogleAuthData) => {
    try {
      const { user, tenants, access_token, refresh_token, isNewUser } = data;
      
      if (access_token) {
        storage.setAuthToken(access_token, refresh_token);
      }
      
      setUser(user);
      storage.setUserData(user);
      storage.setUserId(user.id);
      setRegistrationStatus(user.registration_status || 'complete');
      
      const sessionId = sessionService.initializeSession();
      
      const activeSessionKey = `active_session_${user.id}`;
      localStorage.setItem(activeSessionKey, sessionId);
      
      setTenants(tenants || []);
      setHasGoogleAuth(true);
      setIsAuthenticated(true);
      
      // For Google users, automatically set the current tenant
      if (tenants && tenants.length > 0) {
        let userTenant = tenants.find(t => t.is_owner);
        
        if (!userTenant) {
          userTenant = tenants.find(t => t.is_default);
        }
        
        if (!userTenant) {
          userTenant = tenants[0];
        }
        
        if (!user.is_admin && userTenant.is_admin) {
          userTenant = tenants.find(t => !t.is_admin) || tenants[0];
        }
        
        if (userTenant) {
          setCurrentTenantState(userTenant);
          storage.setCurrentTenant(userTenant);
        }
        
        // Check onboarding status for Google users with tenants
        const isOnboardingComplete = await checkOnboardingStatus();
        if (!isOnboardingComplete && isNewUser) {
          navigate('/onboarding');
        }
      }
      
      resetSessionTimeout();
      resetIdleTimer();
      
    } catch (error: any) {
      console.error('Error setting Google auth data:', error);
      setError(error.message || 'Failed to process Google authentication');
    }
  };

  // Set auth token manually
  const setAuthToken = (token: string) => {
    storage.setAuthToken(token);
  };

  // Link Google account
  const linkGoogleAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      toast.error('Google account linking not implemented yet', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to link Google account';
      setError(errorMessage);
      
      toast.error(errorMessage, {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Unlink Google account
  const unlinkGoogleAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.post(API_ENDPOINTS.AUTH.GOOGLE_UNLINK);
      
      setHasGoogleAuth(false);
      
      if (user) {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            provider: undefined,
            google_id: undefined,
            google_linked: false
          }
        };
        setUser(updatedUser);
        storage.setUserData(updatedUser);
      }
      
      toast.success('Google account unlinked successfully', {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to unlink Google account';
      setError(errorMessage);
      
      toast.error(errorMessage, {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    clearAllTimeouts();
    
    const userId = user?.id;
    
    if (userId) {
      localStorage.removeItem(`active_session_${userId}`);
      sessionStorage.removeItem('session_conflict');
      
      if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('session_conflict');
        channel.postMessage({ 
          userId,
          action: 'logout',
          clearAll: true 
        });
        channel.close();
        
        const lockChannel = new BroadcastChannel('lock_screen');
        lockChannel.postMessage({ action: 'logout' });
        lockChannel.close();
      }
    }
    
    sessionService.clearSession();
    
    const authToken = storage.getAuthToken();
    if (authToken && navigator.onLine) {
      try {
        await api.post(API_ENDPOINTS.AUTH.SIGNOUT);
        
        toast.success('Logged out successfully', {
          duration: 2000,
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: '#10B981',
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
      } catch (err) {
        console.error('Error during logout:', err);
      }
    }
    
    storage.clearAuth();
    setUser(null);
    setTenants([]);
    setCurrentTenantState(null);
    setIsAuthenticated(false);
    setIsLive(true);
    setHasGoogleAuth(false);
    setIsLocked(false);
    setLockTime(null);
    setFailedUnlockAttempts(0);
    setUnlockBlockedUntil(null);
    setIsLoading(false);
    setIsMultiTenantEnabled(true);
    setRegistrationStatus(null);
    setHasCompletedOnboarding(true);
    
    setUserContext(null, null, isLive);
    
    navigate('/login');
  };

  // Set current tenant
  const updateCurrentTenant = (tenant: Tenant) => {
    const normalizedTenant = {
      ...tenant,
      is_admin: tenant.is_admin || false
    };
    
    setCurrentTenantState(normalizedTenant);
    storage.setCurrentTenant(normalizedTenant);
    
    setTenants(prevTenants => 
      prevTenants.map(t => ({
        ...t,
        is_default: t.id === normalizedTenant.id
      }))
    );
    
    // Check onboarding status when tenant changes
    checkOnboardingStatus();
    
    setTimeout(() => {
      refreshData();
    }, 100);
  };

  // Reset password request
  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { email });
      
      toast.success('Password reset email sent!', {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to send reset email';
      setError(errorMessage);
      
      toast.error(errorMessage, {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error state
  const clearError = () => setError(null);

  const value = {
    user,
    tenants,
    currentTenant,
    isAuthenticated,
    isLoading,
    error,
    isLive,
    registrationStatus,
    login,
    register,
    logout,
    setCurrentTenant: updateCurrentTenant,
    clearError,
    resetPassword,
    toggleEnvironment,
    updateUserPreferences,
    refreshData,
    showEnvironmentSwitchModal,
    pendingEnvironment,
    confirmEnvironmentSwitch,
    cancelEnvironmentSwitch,
    setGoogleAuthData,
    setAuthToken,
    linkGoogleAccount,
    unlinkGoogleAccount,
    hasGoogleAuth,
    isLocked,
    lockTime,
    failedUnlockAttempts,
    unlockBlockedUntil,
    lockScreen,
    unlockScreen,
    isMultiTenantEnabled,
    canSwitchTenants,
    setTenants,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    skipOnboarding
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
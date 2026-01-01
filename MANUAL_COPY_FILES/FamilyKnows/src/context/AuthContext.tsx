// src/context/AuthContext.tsx
// Centralized authentication state management for FamilyKnows

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { api, API_ENDPOINTS, STORAGE_KEYS } from '../services/api';

// Types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  country_code?: string;
  mobile_number?: string;
  is_phone_verified?: boolean;
  preferred_theme?: string;
  is_dark_mode?: boolean;
  preferred_language?: string;
  registration_status?: 'pending_workspace' | 'complete';
}

export interface Tenant {
  id: string;
  name: string;
  workspace_code: string;
  domain?: string;
  status: string;
  is_default?: boolean;
  is_admin?: boolean;
  is_owner?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  // Optional fields - captured during onboarding
  firstName?: string;
  lastName?: string;
  workspaceName?: string;
  countryCode?: string;
  mobileNumber?: string;
}

interface AuthContextType {
  // State
  user: User | null;
  tenants: Tenant[];
  currentTenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionExpired: boolean;

  // Methods
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setCurrentTenant: (tenant: Tenant) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  checkSession: () => Promise<boolean>;
  resetSessionTimer: () => void;
}

// Session timeout in minutes (from env or default 10)
const SESSION_TIMEOUT_MINUTES = parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES || '10', 10);
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Clear session timeout
  const clearSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  }, []);

  // Reset session timer
  const resetSessionTimer = useCallback(() => {
    clearSessionTimeout();

    if (isAuthenticated) {
      sessionTimeoutRef.current = setTimeout(async () => {
        console.log('Session timeout - logging out');
        setIsSessionExpired(true);
        await logout();
      }, SESSION_TIMEOUT_MS);

      // Update last activity
      AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    }
  }, [isAuthenticated, clearSessionTimeout]);

  // Check session validity
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const lastActivity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      if (!lastActivity) return true;

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > SESSION_TIMEOUT_MS) {
        setIsSessionExpired(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return true;
    }
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - check session
        if (isAuthenticated) {
          const isValid = await checkSession();
          if (!isValid) {
            setIsSessionExpired(true);
            await logout();
          } else {
            resetSessionTimer();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - save timestamp
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, checkSession, resetSessionTimer]);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!authToken) {
          setIsLoading(false);
          return;
        }

        // Check session validity
        const isValid = await checkSession();
        if (!isValid) {
          await api.clearAuth();
          setIsLoading(false);
          return;
        }

        // Load cached data
        const [userDataStr, tenantStr] = await AsyncStorage.multiGet([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.CURRENT_TENANT,
        ]);

        if (userDataStr[1]) {
          setUser(JSON.parse(userDataStr[1]));
        }
        if (tenantStr[1]) {
          setCurrentTenantState(JSON.parse(tenantStr[1]));
        }

        // Verify token with server
        try {
          const response = await api.get<{ user: User; tenants: Tenant[] }>(API_ENDPOINTS.AUTH.USER);
          setUser(response.data.user || response.data as unknown as User);

          if (response.data.tenants) {
            setTenants(response.data.tenants);
          }

          setIsAuthenticated(true);
          resetSessionTimer();
        } catch (error) {
          console.error('Token verification failed:', error);
          await api.clearAuth();
          setUser(null);
          setTenants([]);
          setCurrentTenantState(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      clearSessionTimeout();
    };
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<{
        access_token: string;
        refresh_token: string;
        user: User;
        tenants: Tenant[];
      }>(API_ENDPOINTS.AUTH.LOGIN, { email, password });

      const { access_token, refresh_token, user: userData, tenants: userTenants } = response.data;

      // Store tokens
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, access_token],
        [STORAGE_KEYS.REFRESH_TOKEN, refresh_token],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(userData)],
        [STORAGE_KEYS.USER_ID, userData.id],
        [STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString()],
      ]);

      // Set default tenant if available
      if (userTenants && userTenants.length > 0) {
        const defaultTenant = userTenants.find(t => t.is_default) || userTenants[0];
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.TENANT_ID, defaultTenant.id],
          [STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(defaultTenant)],
        ]);
        setCurrentTenantState(defaultTenant);
      }

      setUser(userData);
      setTenants(userTenants || []);
      setIsAuthenticated(true);
      setIsSessionExpired(false);
      resetSessionTimer();
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }, [resetSessionTimer]);

  // Register
  const register = useCallback(async (data: RegisterData) => {
    try {
      // FamilyKnows: Send email + password + optional workspace_name
      // If workspaceName provided, tenant is created during registration
      console.log('=== REGISTER DEBUG ===');
      console.log('Sending registration data:', {
        email: data.email,
        workspace_name: data.workspaceName,
        first_name: data.firstName,
        last_name: data.lastName,
      });

      const response = await api.post<{
        access_token: string;
        refresh_token: string;
        user: User;
        tenant: Tenant | null;
        tenants: Tenant[];
        needs_onboarding: boolean;
      }>(API_ENDPOINTS.AUTH.REGISTER, {
        email: data.email,
        password: data.password,
        workspace_name: data.workspaceName,
        first_name: data.firstName,
        last_name: data.lastName,
      });

      console.log('Registration response:', JSON.stringify(response.data, null, 2));

      const { access_token, refresh_token, user: userData, tenant, tenants: userTenants } = response.data;

      console.log('Extracted tenant:', tenant);
      console.log('Extracted tenants:', userTenants);

      // Store tokens (tenant may be null for FamilyKnows until onboarding completes)
      const storageItems: [string, string][] = [
        [STORAGE_KEYS.AUTH_TOKEN, access_token],
        [STORAGE_KEYS.REFRESH_TOKEN, refresh_token],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(userData)],
        [STORAGE_KEYS.USER_ID, userData.id],
        [STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString()],
      ];

      // Only store tenant if it exists (FamilyKnows creates tenant during onboarding)
      if (tenant) {
        console.log('Storing tenant ID:', tenant.id);
        storageItems.push([STORAGE_KEYS.TENANT_ID, tenant.id]);
        storageItems.push([STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant)]);
        setCurrentTenantState(tenant);
        setTenants([tenant]);
      } else {
        console.log('WARNING: No tenant returned from registration!');
        setTenants(userTenants || []);
      }

      await AsyncStorage.multiSet(storageItems);
      console.log('Storage items saved successfully');

      // Verify tenant was stored
      const storedTenantId = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
      console.log('Verified stored tenant ID:', storedTenantId);

      setUser(userData);
      setIsAuthenticated(true);
      setIsSessionExpired(false);
      resetSessionTimer();
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }, [resetSessionTimer]);

  // Logout
  const logout = useCallback(async () => {
    try {
      clearSessionTimeout();

      // Call signout API (best effort)
      try {
        await api.post(API_ENDPOINTS.AUTH.SIGNOUT);
      } catch (error) {
        console.log('Signout API call failed (continuing logout):', error);
      }

      // Clear all auth data
      await api.clearAuth();

      // Reset state
      setUser(null);
      setTenants([]);
      setCurrentTenantState(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear state even on error
      setUser(null);
      setTenants([]);
      setCurrentTenantState(null);
      setIsAuthenticated(false);
    }
  }, [clearSessionTimeout]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<{ user: User; tenants: Tenant[] }>(API_ENDPOINTS.AUTH.USER);
      const userData = response.data.user || response.data as unknown as User;

      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      if (response.data.tenants) {
        setTenants(response.data.tenants);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  }, []);

  // Set current tenant
  const setCurrentTenant = useCallback(async (tenant: Tenant) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.TENANT_ID, tenant.id],
        [STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant)],
      ]);
      setCurrentTenantState(tenant);
    } catch (error) {
      console.error('Set tenant error:', error);
      throw error;
    }
  }, []);

  // Update user
  const updateUser = useCallback(async (userData: Partial<User>) => {
    try {
      const response = await api.patch<User>(API_ENDPOINTS.USER.UPDATE, userData);
      const updatedUser = { ...user, ...response.data };

      setUser(updatedUser as User);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    tenants,
    currentTenant,
    isAuthenticated,
    isLoading,
    isSessionExpired,
    login,
    register,
    logout,
    refreshUser,
    setCurrentTenant,
    updateUser,
    checkSession,
    resetSessionTimer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

// src/components/auth/LockScreen.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import { supabase } from '../../utils/supabase';

// Constants - Import or define these constants
const MAX_UNLOCK_ATTEMPTS = 5;
const LOCK_BLOCK_DURATION = 60 * 1000; // 1 minute block after max attempts

// Storage keys - Import from AuthContext or define locally
const STORAGE_KEYS = {
  FAILED_UNLOCK_ATTEMPTS: 'failed_unlock_attempts',
  UNLOCK_BLOCKED_UNTIL: 'unlock_blocked_until'
};

interface LockScreenProps {
  onUnlock?: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const { user, logout, failedUnlockAttempts, unlockBlockedUntil } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [remainingBlockTime, setRemainingBlockTime] = useState(0);
  const [primaryAuthMethod, setPrimaryAuthMethod] = useState<'email' | 'google' | null>(null);
  const [isDetectingAuthMethod, setIsDetectingAuthMethod] = useState(true);
  
  // Determine primary auth method on mount
  useEffect(() => {
    determinePrimaryAuthMethod();
  }, [user]);
  
  // Timer for blocked state
  useEffect(() => {
    if (unlockBlockedUntil) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((unlockBlockedUntil.getTime() - new Date().getTime()) / 1000));
        setRemainingBlockTime(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [unlockBlockedUntil]);

  const determinePrimaryAuthMethod = async () => {
    try {
      console.log('Determining auth method for user:', user?.id, user?.email);
      setIsDetectingAuthMethod(true);
      
      // CRITICAL: Check the database FIRST for the actual auth method
      if (user?.id) {
        try {
          // Get ALL auth methods for the user to see what's available
          let authMethods: Array<{ auth_type: string; is_primary: boolean }> = [];
          let error: any = null;
          try {
            const resp = await api.get(API_ENDPOINTS.PUBLIC.AUTH_METHODS);
            authMethods = resp.data?.methods || [];
          } catch (e) {
            error = e;
          }
          
          console.log('Auth methods from DB:', authMethods);
          
          if (!error && authMethods && authMethods.length > 0) {
            // Find the primary method or the most recently used
            const primaryMethod = authMethods.find(m => m.is_primary) || authMethods[0];
            console.log('Selected auth method:', primaryMethod.auth_type);
            setPrimaryAuthMethod(primaryMethod.auth_type as 'email' | 'google');
            setIsDetectingAuthMethod(false);
            return;
          }
        } catch (dbError) {
          console.error('Error querying auth methods:', dbError);
        }
      }
      
      // Fallback: Check user metadata ONLY if database check fails
      const provider = user?.app_metadata?.provider || 
                      user?.app_metadata?.providers?.[0] ||
                      user?.user_metadata?.provider;
      
      console.log('Auth method from metadata:', provider);
      
      // Default to email unless we're CERTAIN it's Google
      if (provider === 'google') {
        setPrimaryAuthMethod('google');
      } else {
        setPrimaryAuthMethod('email');
      }
      
    } catch (error) {
      console.error('Error determining auth method:', error);
      // Default to email for safety
      setPrimaryAuthMethod('email');
    } finally {
      setIsDetectingAuthMethod(false);
    }
  };

  // Handle password unlock for email users
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }
    
    if (unlockBlockedUntil && new Date() < unlockBlockedUntil) {
      toast.error(`Too many failed attempts. Try again in ${remainingBlockTime} seconds`);
      return;
    }
    
    setIsUnlocking(true);
    
    try {
      // Call the verify-password endpoint
      const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_PASSWORD, {
        password
      });
      
      if (response.data.valid) {
        // Password is correct - unlock
        handleSuccessfulUnlock();
      } else {
        // Password is incorrect
        handleFailedUnlock();
      }
    } catch (error: any) {
      console.error('Unlock error:', error);
      
      // Check if it's a 400 error indicating wrong auth method
      if (error.response?.status === 400 && 
          error.response?.data?.error?.includes('Password authentication not available')) {
        // This user is definitely a Google-only user
        toast.error('This account uses Google authentication. Please use Google to unlock.');
        setPrimaryAuthMethod('google');
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Google re-authentication
  const handleGoogleUnlock = async () => {
    setIsUnlocking(true);
    
    try {
      // Store current user ID and location to return after re-auth
      if (user?.id) {
        sessionStorage.setItem('user_id', user.id);
      }
      sessionStorage.setItem('unlock_return_url', window.location.pathname);
      sessionStorage.setItem('is_unlock_flow', 'true');
      
      // Initiate Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/google-callback`,
          queryParams: {
            prompt: 'select_account',
            login_hint: user?.email || '',
            access_type: 'offline'
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
    } catch (error: any) {
      console.error('Google unlock error:', error);
      toast.error('Failed to initiate Google authentication');
      setIsUnlocking(false);
    }
  };

  // Handle successful unlock
  const handleSuccessfulUnlock = () => {
    setPassword('');
    
    // Clear lock state from storage
    sessionStorage.removeItem('lock_state');
    sessionStorage.removeItem('lock_time');
    sessionStorage.removeItem('failed_unlock_attempts');
    sessionStorage.removeItem('unlock_blocked_until');
    
    // Broadcast unlock event to other tabs
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('lock_screen');
      channel.postMessage({ action: 'unlock' });
      channel.close();
    }
    
    toast.success('Screen unlocked');
    
    // Call the onUnlock callback if provided
    if (onUnlock) {
      onUnlock();
    }
  };

  // Handle failed unlock attempt
  const handleFailedUnlock = () => {
    const newAttempts = failedUnlockAttempts + 1;
    const attemptsLeft = MAX_UNLOCK_ATTEMPTS - newAttempts;
    
    // Update failed attempts in storage
    sessionStorage.setItem(STORAGE_KEYS.FAILED_UNLOCK_ATTEMPTS, String(newAttempts));
    
    if (attemptsLeft > 0) {
      toast.error(`Incorrect password. ${attemptsLeft} attempts remaining.`);
    } else {
      // Block further attempts
      const blockedUntil = new Date(Date.now() + LOCK_BLOCK_DURATION);
      sessionStorage.setItem(STORAGE_KEYS.UNLOCK_BLOCKED_UNTIL, blockedUntil.toISOString());
      toast.error('Too many failed attempts. Please wait 1 minute.');
    }
    
    setPassword('');
    
    // Let AuthContext handle the state update through storage events or other means
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/login';
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Check if unlock is currently blocked
  const isUnlockBlocked = unlockBlockedUntil ? new Date() < unlockBlockedUntil : false;

  // Loading state while determining auth method
  if (isDetectingAuthMethod || primaryAuthMethod === null) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        style={{ backgroundColor: colors.utility.primaryBackground + '80' }}
      >
        <div 
          className="rounded-lg shadow-lg p-8"
          style={{ backgroundColor: colors.utility.secondaryBackground }}
        >
          <div className="flex flex-col items-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
              style={{ borderColor: colors.brand.primary }}
            ></div>
            <p 
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Checking authentication method...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: colors.utility.primaryBackground + '80' }}
    >
      <div className="w-full max-w-md">
        <div 
          className="rounded-lg shadow-lg"
          style={{ backgroundColor: colors.utility.secondaryBackground }}
        >
          {/* Header */}
          <div 
            className="p-6 pb-4 text-center border-b"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            <div 
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: colors.brand.primary + '10' }}
            >
              <Lock 
                className="h-8 w-8"
                style={{ color: colors.brand.primary }}
              />
            </div>
            <h2 
              className="text-2xl font-semibold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Session Locked
            </h2>
            <p 
              className="text-sm mt-2 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {primaryAuthMethod === 'google' 
                ? 'Please re-authenticate with Google to continue'
                : 'Enter your password to unlock'
              }
            </p>
            {user?.email && (
              <p 
                className="text-sm mt-1 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {user.email}
              </p>
            )}
          </div>

          {/* Content - Show ONLY the appropriate method */}
          {primaryAuthMethod === 'google' ? (
            // Google OAuth user interface
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <p 
                    className="text-sm mb-4 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Your session has been locked due to inactivity. Since you signed in with Google, 
                    you'll need to re-authenticate with Google to unlock.
                  </p>
                </div>
                
                <button
                  onClick={handleGoogleUnlock}
                  disabled={isUnlocking}
                  className="w-full py-2.5 px-4 border rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 hover:opacity-90"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: colors.utility.primaryText + '40',
                    color: '#374151',
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                >
                  {isUnlocking ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Redirecting to Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Re-authenticate with Google
                    </>
                  )}
                </button>
                
                <div className="text-center">
                  <button
                    onClick={handleSignOut}
                    className="text-sm underline transition-colors hover:opacity-80"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Sign out instead
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Regular password user interface
            <form onSubmit={handlePasswordSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    style={{
                      borderColor: colors.utility.primaryText + '40',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    disabled={isUnlocking || isUnlockBlocked}
                    autoFocus
                  />
                </div>

                {/* Error/Warning Messages */}
                {isUnlockBlocked && (
                  <div 
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: colors.semantic.error }}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Too many failed attempts. Try again in {formatTime(remainingBlockTime)}</span>
                  </div>
                )}
                
                {failedUnlockAttempts > 0 && failedUnlockAttempts < MAX_UNLOCK_ATTEMPTS && !isUnlockBlocked && (
                  <div 
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: colors.semantic.warning || '#f59e0b' }}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>{MAX_UNLOCK_ATTEMPTS - failedUnlockAttempts} attempt{MAX_UNLOCK_ATTEMPTS - failedUnlockAttempts !== 1 ? 's' : ''} remaining</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUnlocking || isUnlockBlocked}
                  className="w-full py-2.5 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
                  style={{
                    background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                    color: '#FFFFFF',
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                >
                  {isUnlocking ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Unlocking...
                    </span>
                  ) : (
                    'Unlock'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm underline transition-colors hover:opacity-80"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Sign out instead
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Footer */}
          <div 
            className="px-6 py-4 rounded-b-lg"
            style={{ backgroundColor: colors.utility.primaryBackground + '50' }}
          >
            <p 
              className="text-xs text-center transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Your session was locked after 5 minutes of inactivity for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
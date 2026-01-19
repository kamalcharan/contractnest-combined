// src/pages/settings/users/userview.tsx
// Glassmorphic Design - Updated to match LOV page standards
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Clock,
  UserX,
  Key,
  Loader2,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserStatusBadge, { UserRoleBadge } from '@/components/users/UserStatusBadge';
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { vaniToast } from '@/components/common/toast';

type TabType = 'overview' | 'permissions';

const UserViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const {
    getUser,
    suspendUser,
    activateUser,
    resetUserPassword,
    submitting
  } = useUsers({ autoLoad: false });

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === id;
  
  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const userData = await getUser(id);
        if (userData) {
          setUser(userData);
        } else {
          vaniToast.error('User not found');
          navigate('/settings/users');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        vaniToast.error('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserDetails();
  }, [id]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/settings/users');
  };
  
  // Handle edit user
  const handleEdit = () => {
    navigate(`/settings/users/edit/${id}`);
  };
  
  // Handle suspend user - open dialog
  const handleSuspend = () => {
    setSuspendDialogOpen(true);
  };

  // Confirm suspend
  const confirmSuspend = async () => {
    if (!user) return;

    const success = await suspendUser(user.user_id);
    if (success) {
      setUser((prev: any) => ({ ...prev, status: 'suspended' }));
      setSuspendDialogOpen(false);
    }
  };
  
  // Handle activate user
  const handleActivate = async () => {
    if (!user) return;
    
    const success = await activateUser(user.user_id);
    if (success) {
      setUser((prev: any) => ({ ...prev, status: 'active' }));
    }
  };
  
  // Handle reset password - open dialog
  const handleResetPassword = () => {
    setResetPasswordDialogOpen(true);
  };

  // Confirm reset password
  const confirmResetPassword = async () => {
    if (!user) return;

    await resetUserPassword(user.user_id);
    setResetPasswordDialogOpen(false);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brand.primary }} />
          </div>
          <div className="space-y-6">
            <div
              className="h-32 rounded-2xl animate-pulse"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
              boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
            }}
          >
            <User size={48} className="mx-auto mb-4" style={{ color: colors.utility.secondaryText }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              User not found
            </h3>
            <button onClick={handleBack} className="transition-colors hover:underline" style={{ color: colors.brand.primary }}>
              Back to users
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get primary role from assigned_roles (single source of truth)
  const primaryRole = user.assigned_roles?.[0]?.name || user.role;
  
  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Glassmorphic Header */}
        <div
          className="rounded-2xl mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
              </button>
              <div
                className="p-3 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)` }}
              >
                <Users className="h-6 w-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>User Profile</h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>View and manage user information</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isOwnProfile && user.status === 'active' && (
                <button
                  onClick={handleSuspend}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl transition-all hover:scale-105 flex items-center gap-2"
                  style={{ background: colors.semantic.error + '15', color: colors.semantic.error, border: `1px solid ${colors.semantic.error}30` }}
                >
                  <UserX size={16} />Suspend
                </button>
              )}
              {!isOwnProfile && user.status === 'suspended' && (
                <button
                  onClick={handleActivate}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl transition-all hover:scale-105 flex items-center gap-2"
                  style={{ background: colors.semantic.success + '15', color: colors.semantic.success, border: `1px solid ${colors.semantic.success}30` }}
                >
                  <Shield size={16} />Activate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Info Card - Glassmorphic */}
        <div
          className="rounded-2xl mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                  style={{ background: `linear-gradient(135deg, ${colors.brand.primary}30 0%, ${colors.brand.secondary || colors.brand.primary}20 100%)`, color: colors.brand.primary }}
                >
                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>{user.first_name} {user.last_name}</h2>
                    <UserStatusBadge status={user.status} size="sm" />
                    {primaryRole && <UserRoleBadge role={primaryRole} size="sm" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: colors.utility.secondaryText }}>
                    <span className="flex items-center gap-1"><Mail size={14} />{user.email}</span>
                    {user.mobile_number && <span className="flex items-center gap-1"><Phone size={14} />{user.mobile_number}</span>}
                    <span className="flex items-center gap-1"><Key size={14} />{user.user_code}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm mt-2" style={{ color: colors.utility.secondaryText }}>
                    <span className="flex items-center gap-1"><Calendar size={14} />Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                    {user.last_login && <span className="flex items-center gap-1"><Clock size={14} />Last active {formatDistanceToNow(new Date(user.last_login), { addSuffix: true })}</span>}
                  </div>
                </div>
              </div>
              {!isOwnProfile && (
                <button
                  onClick={handleResetPassword}
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-xl transition-all hover:scale-105"
                  style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: colors.utility.primaryText, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                >
                  Reset Password
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs + Content - Glassmorphic */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="px-6 pt-4">
            <nav className="flex space-x-1">
              {[{ id: 'overview', label: 'Overview' }, { id: 'permissions', label: 'Permissions' }].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn("px-4 py-2 rounded-t-xl font-medium text-sm transition-all", activeTab === tab.id ? "" : "hover:opacity-80")}
                  style={{ color: activeTab === tab.id ? '#FFFFFF' : colors.utility.secondaryText, backgroundColor: activeTab === tab.id ? colors.brand.primary : 'transparent' }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-6" style={{ borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                        <label className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Full Name</label>
                        <p className="mt-1 font-medium" style={{ color: colors.utility.primaryText }}>{user.first_name} {user.last_name}</p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                        <label className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Email Address</label>
                        <p className="mt-1 font-medium" style={{ color: colors.utility.primaryText }}>{user.email}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                        <label className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Mobile Number</label>
                        <p className="mt-1 font-medium" style={{ color: colors.utility.primaryText }}>{user.mobile_number || 'Not provided'}</p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                        <label className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Preferred Language</label>
                        <p className="mt-1 font-medium" style={{ color: colors.utility.primaryText }}>{user.preferred_language?.toUpperCase() || 'EN'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'permissions' && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.utility.primaryText }}>User Permissions</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={20} style={{ color: colors.brand.primary }} />
                      <span className="font-medium" style={{ color: colors.utility.primaryText }}>Role: {primaryRole || 'No role assigned'}</span>
                    </div>
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      {primaryRole ? `This user has ${primaryRole.toLowerCase()} privileges in the workspace.` : 'This user has not been assigned any role yet.'}
                    </p>
                  </div>
                  {user.assigned_roles && user.assigned_roles.length > 1 && (
                    <div>
                      <h4 className="font-medium mb-3" style={{ color: colors.utility.primaryText }}>Additional Roles</h4>
                      <div className="space-y-2">
                        {user.assigned_roles.slice(1).map((role: any) => (
                          <div key={role.id} className="p-3 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                            <div className="font-medium" style={{ color: colors.utility.primaryText }}>{role.name}</div>
                            {role.description && <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>{role.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!user.assigned_roles || user.assigned_roles.length === 0) && !primaryRole && (
                    <div className="text-center py-8 rounded-xl" style={{ color: colors.utility.secondaryText, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                      No roles or permissions assigned
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suspend Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        onConfirm={confirmSuspend}
        title="Suspend User"
        description={`Are you sure you want to suspend ${user?.first_name} ${user?.last_name}? They will no longer be able to access this workspace.`}
        confirmText="Yes, Suspend User"
        cancelText="Cancel"
        type="danger"
        isLoading={submitting}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={resetPasswordDialogOpen}
        onClose={() => setResetPasswordDialogOpen(false)}
        onConfirm={confirmResetPassword}
        title="Reset Password"
        description={`Send a password reset email to ${user?.email}? The user will receive an email with instructions to reset their password.`}
        confirmText="Yes, Send Reset Email"
        cancelText="Cancel"
        type="warning"
        isLoading={submitting}
      />
    </div>
  );
};

export default UserViewPage;
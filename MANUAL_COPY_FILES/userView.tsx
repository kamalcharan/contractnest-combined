// src/pages/settings/users/userview.tsx
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
  Edit,
  UserX,
  RefreshCw,
  Activity,
  Key,
  Globe,
  Building,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import UserStatusBadge, { UserRoleBadge } from '@/components/users/UserStatusBadge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

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
          toast.error('User not found');
          navigate('/settings/users');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user details');
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
        className="p-6 min-h-screen transition-colors duration-200"
        style={{
          background: isDarkMode 
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
        }}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 
            className="h-8 w-8 animate-spin transition-colors" 
            style={{ color: colors.brand.primary }}
          />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div 
        className="p-6 min-h-screen transition-colors duration-200"
        style={{
          background: isDarkMode 
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
        }}
      >
        <div className="text-center py-12">
          <User 
            size={48} 
            className="mx-auto mb-4 transition-colors" 
            style={{ color: colors.utility.secondaryText }}
          />
          <h3 
            className="text-lg font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            User not found
          </h3>
          <button
            onClick={handleBack}
            className="transition-colors hover:underline"
            style={{ color: colors.brand.primary }}
          >
            Back to users
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="p-6 min-h-screen transition-colors duration-200"
      style={{
        background: isDarkMode 
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button 
              onClick={handleBack} 
              className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
            >
              <ArrowLeft 
                className="h-5 w-5 transition-colors" 
                style={{ color: colors.utility.secondaryText }}
              />
            </button>
            <div>
              <h1 
                className="text-2xl font-bold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                User Profile
              </h1>
              <p 
                className="transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                View and manage user information
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isOwnProfile && (
              <>
                {user.status === 'active' && (
                  <button
                    onClick={handleSuspend}
                    disabled={submitting}
                    className="px-3 py-2 border rounded-md transition-colors hover:opacity-80 flex items-center gap-2"
                    style={{
                      borderColor: colors.semantic.error,
                      color: colors.semantic.error,
                      backgroundColor: colors.semantic.error + '10'
                    }}
                  >
                    <UserX size={16} />
                    Suspend
                  </button>
                )}

                {user.status === 'suspended' && (
                  <button
                    onClick={handleActivate}
                    disabled={submitting}
                    className="px-3 py-2 border rounded-md transition-colors hover:opacity-80 flex items-center gap-2"
                    style={{
                      borderColor: colors.semantic.success,
                      color: colors.semantic.success,
                      backgroundColor: colors.semantic.success + '10'
                    }}
                  >
                    <Shield size={16} />
                    Activate
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* User Info Header */}
        <div 
          className="border rounded-lg p-6 mb-6 transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div 
                className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-medium"
                style={{
                  backgroundColor: colors.brand.primary + '10',
                  color: colors.brand.primary
                }}
              >
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 
                    className="text-xl font-semibold transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {user.first_name} {user.last_name}
                  </h2>
                  <UserStatusBadge status={user.status} size="sm" />
                  {user.role && <UserRoleBadge role={user.role} size="sm" />}
                </div>
                
                <div 
                  className="flex items-center gap-4 text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    {user.email}
                  </span>
                  {user.mobile_number && (
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {user.mobile_number}
                    </span>
                  )}
                  <span>Code: {user.user_code}</span>
                </div>
                
                <div 
                  className="flex items-center gap-4 text-sm mt-2 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </span>
                  {user.last_login && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Last active {formatDistanceToNow(new Date(user.last_login), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {!isOwnProfile && (
              <button
                onClick={handleResetPassword}
                disabled={submitting}
                className="px-3 py-1.5 text-sm border rounded-md transition-colors hover:opacity-80"
                style={{
                  borderColor: colors.utility.primaryText + '40',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                Reset Password
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div 
          className="border-b transition-colors"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'permissions', label: 'Permissions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-primary"
                    : "border-transparent hover:opacity-80"
                )}
                style={{
                  color: activeTab === tab.id 
                    ? colors.brand.primary 
                    : colors.utility.secondaryText,
                  borderColor: activeTab === tab.id 
                    ? colors.brand.primary 
                    : 'transparent'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div 
        className="border rounded-lg p-6 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Profile Information */}
            <div>
              <h3 
                className="text-lg font-semibold mb-4 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Profile Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Full Name
                    </label>
                    <p 
                      className="mt-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.first_name} {user.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Email Address
                    </label>
                    <p 
                      className="mt-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.email}
                    </p>
                  </div>
                  
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Mobile Number
                    </label>
                    <p 
                      className="mt-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.mobile_number || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      User Code
                    </label>
                    <p 
                      className="mt-1 font-mono transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.user_code}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Department
                    </label>
                    <p 
                      className="mt-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.department || 'Not assigned'}
                    </p>
                  </div>
                  
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Employee ID
                    </label>
                    <p 
                      className="mt-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.employee_id || 'Not assigned'}
                    </p>
                  </div>
                  
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Location
                    </label>
                    <p 
                      className="mt-1 flex items-center gap-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Globe size={14} />
                      {user.country_code || 'Not set'} • {user.timezone || 'Not set'}
                    </p>
                  </div>
                  
                  <div>
                    <label 
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Preferred Language
                    </label>
                    <p 
                      className="mt-1 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {user.preferred_language?.toUpperCase() || 'EN'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        
        {activeTab === 'permissions' && (
          <div>
            <h3 
              className="text-lg font-semibold mb-4 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              User Permissions
            </h3>
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg transition-colors"
                style={{ backgroundColor: colors.utility.primaryBackground + '50' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield 
                    size={20} 
                    className="transition-colors" 
                    style={{ color: colors.brand.primary }}
                  />
                  <span 
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Role: {user.role || 'No role assigned'}
                  </span>
                </div>
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {user.role 
                    ? `This user has ${user.role.toLowerCase()} privileges in the workspace.`
                    : 'This user has not been assigned any role yet.'
                  }
                </p>
              </div>
              
              {user.assigned_roles && user.assigned_roles.length > 0 && (
                <div>
                  <h4 
                    className="font-medium mb-3 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Assigned Roles
                  </h4>
                  <div className="space-y-2">
                    {user.assigned_roles.map((role: any) => (
                      <div 
                        key={role.id} 
                        className="p-3 rounded-md transition-colors"
                        style={{ backgroundColor: colors.utility.primaryBackground + '30' }}
                      >
                        <div 
                          className="font-medium transition-colors"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {role.name}
                        </div>
                        {role.description && (
                          <p 
                            className="text-sm mt-1 transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {role.description}
                          </p>
                        )}
                        {role.permissions && role.permissions.length > 0 && (
                          <div className="mt-2">
                            <p 
                              className="text-sm font-medium mb-1 transition-colors"
                              style={{ color: colors.utility.primaryText }}
                            >
                              Permissions:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {role.permissions.map((permission: string) => (
                                <span
                                  key={permission}
                                  className="text-xs px-2 py-1 rounded-md font-mono transition-colors"
                                  style={{
                                    backgroundColor: colors.utility.primaryBackground + '80',
                                    color: colors.utility.primaryText
                                  }}
                                >
                                  {permission}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!user.assigned_roles || user.assigned_roles.length === 0) && (
                <div 
                  className="text-center py-8 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  No roles or permissions assigned
                </div>
              )}
            </div>
          </div>
        )}
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
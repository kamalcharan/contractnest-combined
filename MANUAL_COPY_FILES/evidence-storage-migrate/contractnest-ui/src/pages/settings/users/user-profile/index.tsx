// src/pages/settings/users/user-profile/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Camera, Lock, Palette, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCurrentUserProfile as useUserProfile } from '@/hooks/useUsers';
import { useTheme } from '@/contexts/ThemeContext';
import PersonalInfoSection from '@/components/users/user-profile/PersonalInfoSection';
import AvatarSection from '@/components/users/user-profile/AvatarSection';
import SecuritySection from '@/components/users/user-profile/SecuritySection';
import ThemePreferences from '@/components/users/user-profile/ThemePreferences';
import WorkspacesSection from '@/components/users/user-profile/WorkSpacesSection';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const {
    profile,
    loading,
    updating,
    error,
    updateProfile,
    updateAvatar,
    removeAvatar,
    changePassword,
    validateMobile,
    fetchProfile
  } = useUserProfile();

  const [activeSection, setActiveSection] = useState<string>('personal');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  useEffect(() => {
    // Fetch profile on mount
    if (authUser?.id && currentTenant?.id) {
      fetchProfile();
    }
  }, [authUser?.id, currentTenant?.id]);

  // Handle navigation with unsaved changes warning
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/settings');
  };

  // Section navigation items
  const sections = [
    { id: 'personal', label: 'Personal Information', icon: User },
   // { id: 'avatar', label: 'Profile Picture', icon: Camera },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'theme', label: 'Appearance', icon: Palette },
    { id: 'workspaces', label: 'Workspace Access', icon: Building2 }
  ];

  if (loading && !profile) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{
          background: isDarkMode 
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
        }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: colors.brand.primary }}
        />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen transition-colors duration-200"
      style={{
        background: isDarkMode 
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Header */}
      <div className="border-b" style={{ borderColor: colors.utility.primaryText + '20' }}>
        <div className="p-6">
          <div className="flex items-center mb-2">
            <button 
              onClick={handleBack} 
              className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
            >
              <ArrowLeft 
                className="h-5 w-5" 
                style={{ color: colors.utility.secondaryText }}
              />
            </button>
            <div className="flex-1">
              <h1 
                className="text-2xl font-bold"
                style={{ color: colors.utility.primaryText }}
              >
                My Profile
              </h1>
              <p 
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                Manage your personal information and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 border-r" style={{ borderColor: colors.utility.primaryText + '20' }}>
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                    isActive && "font-medium"
                  )}
                  style={{
                    backgroundColor: isActive ? colors.brand.primary + '10' : 'transparent',
                    color: isActive ? colors.brand.primary : colors.utility.secondaryText
                  }}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl">
            {error && (
              <div 
                className="mb-4 p-4 rounded-lg border"
                style={{
                  backgroundColor: colors.semantic.error + '10',
                  borderColor: colors.semantic.error + '50',
                  color: colors.semantic.error
                }}
              >
                {error}
              </div>
            )}

            {/* Personal Information Section */}
            {activeSection === 'personal' && profile && (
              <PersonalInfoSection
                profile={profile}
                onUpdate={updateProfile}
                onUpdateAvatar={updateAvatar}
                onRemoveAvatar={removeAvatar}
                onValidateMobile={validateMobile}
                updating={updating}
                onChangeDetected={setHasUnsavedChanges}
              />
            )}

            {/* Avatar Section */}
            {activeSection === 'avatar' && profile && (
              <AvatarSection
                profile={profile}
                onUpdateAvatar={updateAvatar}
                onRemoveAvatar={removeAvatar}
                updating={updating}
              />
            )}

            {/* Security Section */}
            {activeSection === 'security' && profile && (
              <SecuritySection
                profile={profile}
                onChangePassword={changePassword}
                updating={updating}
              />
            )}

            {/* Theme Preferences */}
            {activeSection === 'theme' && profile && (
              <ThemePreferences
                profile={profile}
                onUpdate={updateProfile}
                updating={updating}
              />
            )}

            {/* Workspaces Section */}
            {activeSection === 'workspaces' && profile && (
              <WorkspacesSection
                profile={profile}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
// src/components/layout/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  Palette,
  ToggleLeft,
  ToggleRight,
  Shield
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { languages } from '../../utils/constants/languages';
import { themes } from "../../utils/theme"
import EnvironmentSwitchModal from "../EnvironmentSwitchModal";
import TenantSwitcher from './TenantSwitcher';
import { cn } from '@/lib/utils';

// Environment configuration
const ENVIRONMENT_CONFIG = {
  showEnvironmentSwitch: import.meta.env.VITE_SHOW_ENVIRONMENT_SWITCH === 'true' || false,
  defaultEnvironment: 'live' as 'live' | 'test'
};

interface HeaderProps {
  onToggleSidebar: () => void;
}

interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState<boolean>(false);
  const { isDarkMode, toggleDarkMode, currentThemeId, setTheme, currentTheme } = useTheme();
  const { user, currentTenant, tenants, logout, isLive, toggleEnvironment, updateUserPreferences } = useAuth();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Refs for click outside detection
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  // Convert themes object to array for the dropdown
  const availableThemes = Object.values(themes).map(theme => ({
    name: theme.id, // This matches what the context expects
    label: theme.name, // This is the display name
    id: theme.id
  }));

  // Mock notification data
  const notifications: Notification[] = [
    { id: 1, text: 'New contract request from Acme Corp', time: '5 min ago', read: false },
    { id: 2, text: 'Appointment reminder: Meeting with client', time: '1 hour ago', read: false },
    { id: 3, text: 'Contract #1234 has been signed', time: '3 hours ago', read: true }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleUserMenu = (): void => {
    console.log("Toggle user menu");
    setUserMenuOpen(!userMenuOpen);
    setNotificationsOpen(false);
    setThemeMenuOpen(false);
    setLanguageMenuOpen(false);
  };
  
  const toggleNotifications = (): void => {
    setNotificationsOpen(!notificationsOpen);
    setUserMenuOpen(false);
    setThemeMenuOpen(false);
    setLanguageMenuOpen(false);
  };

  const toggleThemeMenu = (): void => {
    setThemeMenuOpen(!themeMenuOpen);
    setUserMenuOpen(false);
    setNotificationsOpen(false);
    setLanguageMenuOpen(false);
  };
  
  const toggleLanguageMenu = (): void => {
    setLanguageMenuOpen(!languageMenuOpen);
    setUserMenuOpen(false);
    setNotificationsOpen(false);
    setThemeMenuOpen(false);
  };

  // Update handleThemeChange
  const handleThemeChange = async (themeName: string): Promise<void> => {
    console.log('🎨 Theme change requested:', themeName);
    
    // First update the UI immediately
    setTheme(themeName as any);
    setThemeMenuOpen(false);
    
    // Then persist to backend if user is logged in
    if (user && updateUserPreferences) {
      try {
        console.log('📤 Sending theme preference to backend...');
        await updateUserPreferences({
          preferred_theme: themeName
        });
        console.log('✅ Theme preference saved');
      } catch (error) {
        console.error('❌ Failed to save theme preference:', error);
      }
    }
  };

  // Update handleDarkModeToggle  
  const handleDarkModeToggle = async (): Promise<void> => {
    console.log('🌓 Dark mode toggle requested, current:', isDarkMode);
    
    // First update the UI immediately
    toggleDarkMode();
    
    // Then persist to backend if user is logged in
    if (user && updateUserPreferences) {
      try {
        console.log('📤 Sending dark mode preference to backend...');
        await updateUserPreferences({
          is_dark_mode: !isDarkMode
        });
        console.log('✅ Dark mode preference saved');
      } catch (error) {
        console.error('❌ Failed to save dark mode preference:', error);
      }
    }
  };
  
  const handleLanguageChange = (languageCode: string): void => {
    console.log('Language changed to:', languageCode);
    setLanguageMenuOpen(false);
  };
  
  const handleLogout = (): void => {
    logout();
  };

  const handleProfileClick = (): void => {
    setUserMenuOpen(false);
    navigate('/settings/user-profile');
  };

  const handleChangePasswordClick = (): void => {
    setUserMenuOpen(false);
    navigate('/change-password');
  };

  const handleSettingsClick = (): void => {
    setUserMenuOpen(false);
    navigate('/settings');
  };

  const handleHelpClick = (): void => {
    setUserMenuOpen(false);
    navigate('/help');
  };

  // Function to get theme color indicator
  const getThemeColor = (themeId: string): string => {
    const theme = themes[themeId];
    if (!theme) return colors.brand.primary;
    
    // Return the theme's primary color
    return theme.colors.brand.primary;
  };

  // Get user's preferred language or default to English
  const userPreferredLanguage = user?.preferred_language || 'en';
  const currentLanguage = languages.find(lang => lang.code === userPreferredLanguage) || languages[0];

  // Check if user/tenant is admin
  const isUserAdmin = user?.is_admin || false;
  const isAdminTenant = currentTenant?.is_admin || false;
  
  // Determine if we should show the tenant switcher
  // Show for: 1) Admin users (always) 2) Users with multiple tenants
  const showTenantSwitcher = isUserAdmin || (tenants && tenants.length > 1);

  return (
    <div className="relative h-full">
      <header 
        className="shadow-sm py-2 px-4 flex items-center justify-between header h-full transition-colors"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        {/* Left section */}
        <div className="flex items-center">
          <button 
            onClick={onToggleSidebar}
            className="mr-4 p-2 rounded-lg transition-all duration-200 hover:opacity-80"
            style={{ 
              backgroundColor: `${colors.utility.primaryText}10`,
              color: colors.utility.primaryText 
            }}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          
          {/* Tenant Switcher - Show based on user type and tenant count */}
          {showTenantSwitcher && currentTenant && (
            <TenantSwitcher showFullName={true} className="mr-4" />
          )}
        </div>
        
        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Admin/Owner Badge */}
          {(isUserAdmin || isAdminTenant) && (
            <div 
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                backgroundColor: `${colors.brand.tertiary}20`,
                borderColor: `${colors.brand.tertiary}40`
              }}
            >
              <Shield 
                size={16} 
                style={{ color: colors.brand.tertiary }}
              />
              <span 
                className="text-sm font-medium transition-colors"
                style={{ color: colors.brand.tertiary }}
              >
                {isUserAdmin ? 'System Admin' : 'Workspace Admin'}
              </span>
            </div>
          )}

          {/* Environment Toggle - Only show if enabled in config */}
          {ENVIRONMENT_CONFIG.showEnvironmentSwitch && (
            <button 
              onClick={toggleEnvironment}
              className="flex items-center px-3 py-1.5 rounded-lg border transition-all duration-200 hover:opacity-80"
              style={{ 
                borderColor: isLive ? colors.semantic.success : colors.semantic.warning,
                backgroundColor: `${isLive ? colors.semantic.success : colors.semantic.warning}10`
              }}
              aria-label={isLive ? "Switch to test environment" : "Switch to live environment"}
            >
              {isLive ? (
                <>
                  <span 
                    className="text-sm font-medium mr-2 transition-colors"
                    style={{ color: colors.semantic.success }}
                  >
                    Live
                  </span>
                  <ToggleRight size={18} style={{ color: colors.semantic.success }} />
                </>
              ) : (
                <>
                  <span 
                    className="text-sm font-medium mr-2 transition-colors"
                    style={{ color: colors.semantic.warning }}
                  >
                    Test
                  </span>
                  <ToggleLeft size={18} style={{ color: colors.semantic.warning }} />
                </>
              )}
            </button>
          )}
          
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={toggleNotifications}
              className="p-2 rounded-lg transition-all duration-200 hover:opacity-80 relative"
              style={{ 
                backgroundColor: `${colors.utility.primaryText}10`,
                color: colors.utility.primaryText 
              }}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span 
                  className="absolute top-0 right-0 text-xs rounded-full h-5 w-5 flex items-center justify-center text-white"
                  style={{ backgroundColor: colors.semantic.error }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div 
                className="fixed right-4 top-16 w-80 border rounded-lg shadow-lg z-50 overflow-hidden transition-colors"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}20`
                }}
              >
                <div 
                  className="p-3 border-b flex justify-between items-center transition-colors"
                  style={{ borderColor: `${colors.utility.primaryText}20` }}
                >
                  <h3 
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Notifications
                  </h3>
                  <button 
                    className="text-xs transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    Mark all as read
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div 
                      className="p-4 text-center transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      No notifications
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className="p-3 border-b cursor-pointer transition-all duration-200 hover:opacity-80"
                        style={{ 
                          borderColor: `${colors.utility.primaryText}20`,
                          backgroundColor: !notification.read ? `${colors.utility.primaryText}05` : 'transparent'
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <p 
                            className="text-sm transition-colors"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {notification.text}
                          </p>
                          {!notification.read && (
                            <span 
                              className="h-2 w-2 rounded-full mt-1"
                              style={{ backgroundColor: colors.brand.primary }}
                            />
                          )}
                        </div>
                        <p 
                          className="text-xs mt-1 transition-colors"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {notification.time}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                
                <div 
                  className="p-2 border-t transition-colors"
                  style={{ borderColor: `${colors.utility.primaryText}20` }}
                >
                  <button 
                    className="w-full py-2 text-center text-sm rounded-md transition-all duration-200 hover:opacity-80"
                    style={{ 
                      color: colors.brand.primary,
                      backgroundColor: `${colors.brand.primary}05`
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={toggleUserMenu}
              className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: `${colors.utility.primaryText}10` }}
              aria-label="User menu"
            >
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: colors.brand.primary }}
              >
                {user?.first_name ? (
                  <span>{user.first_name.charAt(0)}</span>
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="hidden md:block text-left">
                <p 
                  className="text-sm font-medium leading-tight transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {user?.first_name} {user?.last_name}
                </p>
                <p 
                  className="text-xs leading-tight transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {user?.user_code || 'User'}
                </p>
              </div>
              <ChevronDown 
                size={16} 
                className="hidden md:block transition-colors"
                style={{ color: colors.utility.primaryText }}
              />
            </button>
            
            {userMenuOpen && (
              <div 
                className="fixed right-4 top-16 w-64 border rounded-lg shadow-lg z-50 overflow-hidden transition-colors"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}20`
                }}
              >
                <div 
                  className="p-3 border-b transition-colors"
                  style={{ borderColor: `${colors.utility.primaryText}20` }}
                >
                  <p 
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p 
                    className="text-sm mt-1 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {user?.email}
                  </p>
                  {user?.user_code && (
                    <div 
                      className="mt-2 text-xs rounded px-2 py-1 inline-block transition-colors"
                      style={{ 
                        backgroundColor: `${colors.utility.primaryText}10`,
                        color: colors.utility.primaryText
                      }}
                    >
                      User Code: {user.user_code}
                    </div>
                  )}
                </div>
                
                <div className="p-2">
                  <button 
                    onClick={toggleThemeMenu}
                    className="flex items-center justify-between gap-3 w-full p-2 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80"
                    style={{ 
                      backgroundColor: `${colors.utility.primaryText}05`,
                      color: colors.utility.primaryText
                    }}
                  >
                    <div className="flex items-center">
                      <Palette size={18} className="mr-3" />
                      <span>Theme</span>
                    </div>
                    <ChevronDown size={16} />
                  </button>
                  
                  
                  
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center gap-3 w-full p-2 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80"
                    style={{ 
                      backgroundColor: `${colors.utility.primaryText}05`,
                      color: colors.utility.primaryText
                    }}
                  >
                    <User size={18} className="mr-3" />
                    <span>Profile</span>
                  </button>
                  
              
                  <button 
                    onClick={handleSettingsClick}
                    className="flex items-center gap-3 w-full p-2 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80"
                    style={{ 
                      backgroundColor: `${colors.utility.primaryText}05`,
                      color: colors.utility.primaryText
                    }}
                  >
                    <Settings size={18} className="mr-3" />
                    <span>Settings</span>
                  </button>
                  
                  <button 
                    onClick={handleHelpClick}
                    className="flex items-center gap-3 w-full p-2 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80"
                    style={{ 
                      backgroundColor: `${colors.utility.primaryText}05`,
                      color: colors.utility.primaryText
                    }}
                  >
                    <HelpCircle size={18} className="mr-3" />
                    <span>Help & Support</span>
                  </button>
                </div>
                
                <div 
                  className="p-2 border-t transition-colors"
                  style={{ borderColor: `${colors.utility.primaryText}20` }}
                >
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-2 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80"
                    style={{ 
                      backgroundColor: `${colors.semantic.error}10`,
                      color: colors.semantic.error
                    }}
                  >
                    <LogOut size={18} className="mr-3" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Theme Selection Menu */}
      {themeMenuOpen && (
        <div 
          className="fixed right-20 top-16 w-60 border rounded-lg shadow-lg z-50 overflow-hidden transition-colors" 
          ref={themeMenuRef}
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <div 
            className="p-3 border-b transition-colors"
            style={{ borderColor: `${colors.utility.primaryText}20` }}
          >
            <h3 
              className="font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Appearance
            </h3>
          </div>
          
          <div className="p-3">
            <div className="mb-4">
              <p 
                className="text-sm font-medium mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Mode
              </p>
              <button 
                onClick={handleDarkModeToggle} 
                className="flex items-center justify-between w-full p-2 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80"
                style={{ 
                  backgroundColor: `${colors.utility.primaryText}05`,
                  color: colors.utility.primaryText
                }}
              >
                <div className="flex items-center">
                  {isDarkMode ? <Moon size={16} className="mr-2" /> : <Sun size={16} className="mr-2" />}
                  <span>{isDarkMode ? 'Dark' : 'Light'}</span>
                </div>
                <div 
                  className="h-4 w-8 rounded-full relative transition-colors"
                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                >
                  <div 
                    className="absolute h-3 w-3 rounded-full top-0.5 transition-all"
                    style={{ 
                      backgroundColor: isDarkMode ? colors.brand.primary : colors.utility.secondaryText,
                      transform: isDarkMode ? 'translateX(16px)' : 'translateX(2px)'
                    }}
                  />
                </div>
              </button>
            </div>
            
            <p 
              className="text-sm font-medium mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Theme
            </p>
            <div className="max-h-64 overflow-y-auto">
              {availableThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.name)}
                  className={`flex items-center w-full p-2 mb-1 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80 ${
                    currentThemeId === theme.name ? 'opacity-100' : 'opacity-70'
                  }`}
                  style={{ 
                    backgroundColor: currentThemeId === theme.name 
                      ? `${colors.brand.primary}20` 
                      : `${colors.utility.primaryText}05`,
                    color: colors.utility.primaryText
                  }}
                >
                  <div 
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: getThemeColor(theme.id) }}
                  />
                  <span className="flex-1 truncate">{theme.label}</span>
                  {currentThemeId === theme.name && (
                    <span 
                      className="ml-auto text-xs"
                      style={{ color: colors.brand.primary }}
                    >
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Language Selection Menu */}
      {languageMenuOpen && (
        <div 
          className="fixed right-20 top-16 w-60 border rounded-lg shadow-lg z-50 overflow-hidden transition-colors" 
          ref={languageMenuRef}
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <div 
            className="p-3 border-b transition-colors"
            style={{ borderColor: `${colors.utility.primaryText}20` }}
          >
            <h3 
              className="font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Select Language
            </h3>
          </div>
          
          <div className="p-3 max-h-96 overflow-y-auto">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`flex items-center w-full p-2 mb-1 text-left text-sm rounded-md transition-all duration-200 hover:opacity-80 ${
                  userPreferredLanguage === language.code ? 'opacity-100' : 'opacity-70'
                }`}
                style={{ 
                  backgroundColor: userPreferredLanguage === language.code 
                    ? `${colors.brand.primary}20` 
                    : `${colors.utility.primaryText}05`,
                  color: colors.utility.primaryText
                }}
              >
                <span className="mr-2">{language.isRTL ? '←' : '→'}</span>
                <span className="flex-1 truncate">{language.name} ({language.nativeName})</span>
                {userPreferredLanguage === language.code && (
                  <span 
                    className="ml-auto text-xs"
                    style={{ color: colors.brand.primary }}
                  >
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Environment Switch Modal */}
      <EnvironmentSwitchModal />
    </div>
  );
};

export default Header;
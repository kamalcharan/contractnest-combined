// src/pages/misc/BrowserNotSupportedPage.tsx
import React, { useEffect } from 'react';
import { Shield, Globe, ExternalLink } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { detectBrowser, getBrowserDownloadLinks } from '../../utils/browserDetection';

const BrowserNotSupportedPage: React.FC = () => {
  const { isDarkMode, currentTheme, setTheme, setIsDarkMode } = useTheme();

  // Load user theme preferences on mount
  useEffect(() => {
    const loadUserThemePreferences = () => {
      let userData = null;

      try {
        const sessionData = sessionStorage.getItem('user_data');
        if (sessionData) {
          userData = JSON.parse(sessionData);
        } else {
          const localData = localStorage.getItem('user_data');
          if (localData) {
            userData = JSON.parse(localData);
          }
        }
      } catch (error) {
        console.error('Error parsing user data for theme:', error);
      }

      if (userData) {
        if (userData.preferred_theme && userData.preferred_theme !== currentTheme.id) {
          setTheme(userData.preferred_theme);
        }
        if (userData.is_dark_mode !== undefined && userData.is_dark_mode !== isDarkMode) {
          setIsDarkMode(userData.is_dark_mode);
        }
      }
    };

    loadUserThemePreferences();
  }, []);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const browserInfo = detectBrowser();
  const downloadLinks = getBrowserDownloadLinks();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200"
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

      <div className="w-full max-w-lg relative z-10">
        {/* Main Card */}
        <div
          className="backdrop-blur-xl border rounded-2xl shadow-xl p-8 transition-colors"
          style={{
            backgroundColor: `${colors.utility.secondaryBackground}70`,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          {/* Logo & Brand */}
          <div className="flex items-center justify-center space-x-3 mb-8">
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
                className="text-2xl font-bold transition-colors"
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

          {/* Browser Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${colors.semantic.warning}20` }}
            >
              <Globe
                className="w-10 h-10"
                style={{ color: colors.semantic.warning }}
              />
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-4 mb-8">
            <h2
              className="text-2xl font-bold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Browser Not Supported
            </h2>

            <p
              className="transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              For the best experience with ContractNest, please use one of our supported browsers.
            </p>

            {browserInfo.name !== 'Unknown' && (
              <p
                className="text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                You're currently using <strong>{browserInfo.name}</strong>
                {browserInfo.version && ` (v${browserInfo.version})`}
              </p>
            )}
          </div>

          {/* Supported Browsers */}
          <div className="space-y-4">
            <p
              className="text-sm font-medium text-center transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Please download one of these browsers:
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Google Chrome */}
              <a
                href={downloadLinks.chrome}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-4 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: `${colors.utility.secondaryBackground}50`
                }}
              >
                <div className="w-12 h-12 mb-3">
                  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill="#4285F4"/>
                    <circle cx="24" cy="24" r="8" fill="white"/>
                    <path d="M24 4C12.95 4 4 12.95 4 24h20l8.5-14.7C28.7 6.4 26.5 4 24 4z" fill="#EA4335"/>
                    <path d="M4 24c0 11.05 8.95 20 20 20 3.5 0 6.8-.9 9.7-2.5L24 24H4z" fill="#FBBC05"/>
                    <path d="M44 24c0-3.5-.9-6.8-2.5-9.7L24 24l9.5 16.5C41 37.5 44 31 44 24z" fill="#34A853"/>
                  </svg>
                </div>
                <span
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Google Chrome
                </span>
                <span
                  className="text-xs flex items-center gap-1 mt-1 transition-colors"
                  style={{ color: colors.brand.primary }}
                >
                  Download <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              {/* Microsoft Edge */}
              <a
                href={downloadLinks.edge}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-4 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: `${colors.utility.secondaryBackground}50`
                }}
              >
                <div className="w-12 h-12 mb-3">
                  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0078D4"/>
                        <stop offset="100%" stopColor="#1DB954"/>
                      </linearGradient>
                    </defs>
                    <circle cx="24" cy="24" r="20" fill="url(#edge-gradient)"/>
                    <path d="M24 8c-8.8 0-16 7.2-16 16 0 6.4 3.8 12 9.3 14.5C16.5 35.4 16 32.8 16 30c0-8.8 7.2-16 16-16 2.8 0 5.4.7 7.7 2C36.8 11.5 30.9 8 24 8z" fill="white" opacity="0.9"/>
                    <circle cx="32" cy="30" r="8" fill="white"/>
                  </svg>
                </div>
                <span
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Microsoft Edge
                </span>
                <span
                  className="text-xs flex items-center gap-1 mt-1 transition-colors"
                  style={{ color: colors.brand.primary }}
                >
                  Download <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>
          </div>

          {/* Info Note */}
          <div
            className="mt-6 p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: `${colors.brand.primary}10`,
              borderColor: `${colors.brand.primary}40`
            }}
          >
            <p
              className="text-sm text-center transition-colors"
              style={{ color: colors.brand.primary }}
            >
              ContractNest works best on Chromium-based browsers for optimal performance and security features.
            </p>
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
  );
};

export default BrowserNotSupportedPage;

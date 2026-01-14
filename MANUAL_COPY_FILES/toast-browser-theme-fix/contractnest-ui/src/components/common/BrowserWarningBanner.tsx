// src/components/common/BrowserWarningBanner.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { detectBrowser, getBrowserDownloadLinks } from '../../utils/browserDetection';

const STORAGE_KEY = 'browser_warning_dismissed';

const BrowserWarningBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { isDarkMode, currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  useEffect(() => {
    // Only show on authenticated pages
    if (!isAuthenticated) {
      setIsVisible(false);
      return;
    }

    // Check if browser is supported
    const browserInfo = detectBrowser();
    if (browserInfo.isSupported) {
      setIsVisible(false);
      return;
    }

    // Check if user has dismissed the warning
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    // Show the warning
    setIsVisible(true);
  }, [isAuthenticated]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  const browserInfo = detectBrowser();
  const downloadLinks = getBrowserDownloadLinks();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3 shadow-lg transition-colors"
      style={{
        backgroundColor: `${colors.semantic.warning}15`,
        borderBottom: `1px solid ${colors.semantic.warning}40`
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: colors.semantic.warning }}
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="text-sm font-medium"
              style={{ color: colors.utility.primaryText }}
            >
              For the best experience, we recommend using Chrome or Microsoft Edge.
            </span>
            <span
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              You're using {browserInfo.name}.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Download Links */}
          <div className="hidden sm:flex items-center gap-2">
            <a
              href={downloadLinks.chrome}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.brand.primary,
                color: 'white'
              }}
            >
              Chrome <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={downloadLinks.edge}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:opacity-80"
              style={{
                borderColor: `${colors.utility.secondaryText}40`,
                color: colors.utility.primaryText
              }}
            >
              Edge <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{
              backgroundColor: `${colors.utility.secondaryText}20`
            }}
            aria-label="Dismiss browser warning"
          >
            <X
              className="w-4 h-4"
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrowserWarningBanner;

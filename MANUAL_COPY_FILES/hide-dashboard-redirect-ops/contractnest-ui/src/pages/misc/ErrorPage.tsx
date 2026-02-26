//src/pages/misc/ErrorPage.tsx - Theme Integrated Version

import React, { useEffect } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import MiscPageLayout from '../../components/misc/MiscPageLayout';
import { analyticsService } from '../../services/analytics.service';
import * as Sentry from '@sentry/react';

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error, resetError }) => {
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  useEffect(() => {
    analyticsService.trackMiscPageView('error', 'Application Error', {
      error_message: error?.message,
      error_stack: error?.stack
    });

    // Report to Sentry
    if (error) {
      Sentry.captureException(error);
    }
  }, [error]);

  const handleGoHome = () => {
    analyticsService.trackMiscPageAction('error', 'go_home_clicked');
    if (resetError) resetError();
    // Use window.location instead of navigate since we're outside Router context
    window.location.href = '/ops/cockpit';
  };

  const handleRetry = () => {
    analyticsService.trackMiscPageAction('error', 'retry_clicked');
    if (resetError) resetError();
    window.location.reload();
  };

  return (
    <MiscPageLayout
      icon={<AlertCircle className="h-16 w-16" style={{ color: colors.semantic.error }} />}
      title="Something Went Wrong"
      description="We encountered an unexpected error. Our team has been notified."
      illustration="error"
      actions={[
        {
          label: 'Go to Dashboard',
          onClick: handleGoHome,
          variant: 'primary',
          icon: <Home className="h-4 w-4" />
        },
        {
          label: 'Try Again',
          onClick: handleRetry,
          variant: 'outline',
          icon: <RefreshCw className="h-4 w-4" />
        }
      ]}
    >
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6 text-xs">
          <summary 
            className="cursor-pointer hover:opacity-80 transition-colors"
            style={{ 
              color: colors.utility.secondaryText 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.utility.primaryText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.utility.secondaryText;
            }}
          >
            Error Details (Development Only)
          </summary>
          <pre 
            className="mt-2 p-4 rounded-md overflow-auto font-mono text-xs transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`
            }}
          >
            {error.stack || error.message}
          </pre>
        </details>
      )}
    </MiscPageLayout>
  );
};

export default ErrorPage;
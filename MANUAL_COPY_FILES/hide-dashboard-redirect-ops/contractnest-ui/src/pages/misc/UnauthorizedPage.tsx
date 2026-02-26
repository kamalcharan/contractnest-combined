//src/pages/misc/UnauthorizedPage.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, Home, LogIn } from 'lucide-react';
import MiscPageLayout from '../../components/misc/MiscPageLayout';
import { analyticsService } from '../../services/analytics.service';
import { useAuth } from '../../context/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    analyticsService.trackMiscPageView('unauthorized', 'Unauthorized Access');
  }, []);

  const handleGoHome = () => {
    analyticsService.trackMiscPageAction('unauthorized', 'go_home_clicked');
    navigate('/ops/cockpit');
  };

  const handleLogin = async () => {
    analyticsService.trackMiscPageAction('unauthorized', 'login_clicked');
    if (isAuthenticated) {
      await logout();
    }
    navigate('/login');
  };

  return (
    <MiscPageLayout
      icon={<ShieldOff className="h-16 w-16" />}
      title="Access Denied"
      description="You don't have permission to access this resource."
      illustration="unauthorized"
      actions={[
        {
          label: 'Go to Dashboard',
          onClick: handleGoHome,
          variant: 'primary',
          icon: <Home className="h-4 w-4" />
        },
        {
          label: 'Login Again',
          onClick: handleLogin,
          variant: 'outline',
          icon: <LogIn className="h-4 w-4" />
        }
      ]}
    />
  );
};

export default UnauthorizedPage;
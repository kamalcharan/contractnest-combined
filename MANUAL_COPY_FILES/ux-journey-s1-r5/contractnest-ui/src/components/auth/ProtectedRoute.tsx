// src/components/auth/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { rememberDestination } from '@/utils/navigation/entry';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTenant?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireTenant = true 
}) => {
  const { isAuthenticated, isLoading, currentTenant } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (requireTenant && !currentTenant))) {
      rememberDestination(location.pathname + location.search + location.hash);
    }
  }, [isLoading, isAuthenticated, requireTenant, currentTenant, location.pathname, location.search, location.hash]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If tenant is required but not selected, redirect to tenant selection
  if (requireTenant && !currentTenant) {
    return <Navigate to="/select-tenant" state={{ from: location }} replace />;
  }

  // If authenticated (and tenant selected if required), render children
  return <>{children}</>;
};

export default ProtectedRoute;

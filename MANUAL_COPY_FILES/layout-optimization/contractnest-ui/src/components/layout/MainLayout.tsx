// src/components/layout/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

// Routes that should auto-collapse the sidebar for more workspace
const AUTO_COLLAPSE_ROUTES = [
  '/catalog-studio/configure',
  '/catalog-studio/template',
  '/catalog-studio/templates-list',
  '/catalog-studio/blocks'
];

const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const location = useLocation();

  // Auto-collapse sidebar on specific routes (unless user manually expanded)
  useEffect(() => {
    const shouldAutoCollapse = AUTO_COLLAPSE_ROUTES.some(route =>
      location.pathname.startsWith(route)
    );

    if (shouldAutoCollapse && !userOverride) {
      setSidebarCollapsed(true);
    } else if (!shouldAutoCollapse) {
      // Reset user override when leaving auto-collapse routes
      setUserOverride(false);
      setSidebarCollapsed(false);
    }
  }, [location.pathname, userOverride]);

  const toggleSidebar = () => {
    // Track that user manually toggled
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);

    // If user expands on auto-collapse route, remember their preference
    const isAutoCollapseRoute = AUTO_COLLAPSE_ROUTES.some(route =>
      location.pathname.startsWith(route)
    );
    if (isAutoCollapseRoute && !newCollapsed) {
      setUserOverride(true);
    }
  };

  return (
    <div className="h-screen flex bg-page-background">
      {/* Sidebar with margin */}
      <div className="h-full p-3 flex-shrink-0">
        <div className="h-full rounded-lg overflow-hidden shadow-sm">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
      </div>

      {/* Content area with header */}
      <div className="flex-grow h-full flex flex-col p-3 pl-0 min-w-0">
        {/* Header with margin-bottom */}
        <div className="flex-shrink-0 mb-3 rounded-lg overflow-hidden shadow-sm">
          <Header onToggleSidebar={toggleSidebar} />
        </div>
        
        {/* Main content - Updated to fix scrollbar issue */}
        <div className="flex-grow rounded-lg overflow-hidden bg-page-background">
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
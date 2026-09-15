// src/components/layout/MainLayout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import './navigation.css';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import LiteRouteGate from '../lite/LiteRouteGate';

// Routes that should auto-collapse the sidebar for more workspace
const AUTO_COLLAPSE_ROUTES = [
  '/experience',
  '/catalog-studio/configure',
  '/catalog-studio/templates-list',
  '/catalog-studio/blocks'
];

const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [userOverride, setUserOverride] = useState(false);
  const location = useLocation();
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const {currentTheme, isDarkMode} = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => { setMobile(media.matches); setDrawerOpen(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { setDrawerOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    const node = dialog.current;
    if (mobile && drawerOpen && node && !node.open) node.showModal();
    else if (node?.open) node.close();
  }, [mobile, drawerOpen]);

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
    if (mobile) { setDrawerOpen(open => !open); return; }
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
    <div className="cn-app-layout h-screen flex bg-page-background">
      {/* Sidebar with margin */}
      {!mobile && <div className="h-full p-3 flex-shrink-0">
        <div className="h-full rounded-lg overflow-hidden shadow-sm">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
      </div>}

      {/* Content area with header */}
      <div className="cn-app-content flex-grow h-full flex flex-col p-3 pl-0 min-w-0">
        {/* Header with margin-bottom */}
        <div className="cn-app-header flex-shrink-0 mb-3 rounded-lg shadow-sm">
          <Header onToggleSidebar={toggleSidebar} />
        </div>
        
        {/* Main content - Updated to fix scrollbar issue */}
        <div className="flex-grow rounded-lg overflow-hidden bg-page-background">
          <div className="h-full overflow-auto">
            {/* CNAK/RFQ-lite: restricted routes render the problem-led
                cross-sell state instead of the feature (no-op for full tenants) */}
            <LiteRouteGate>
              <Outlet />
            </LiteRouteGate>
          </div>
        </div>
      </div>
      {mobile && createPortal(<dialog ref={dialog} className="cn-nav-drawer" aria-label="Product navigation"
        style={{background:colors.utility.secondaryBackground,color:colors.utility.primaryText}}
        onCancel={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(node => node.getClientRects().length > 0);
          const first = targets[0]; const last = targets[targets.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        onClick={event => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
        <div className="cn-nav-drawer-inner">
          <div className="cn-nav-drawer-heading"><strong>Menu</strong><button autoFocus aria-label="Close navigation" onClick={() => setDrawerOpen(false)}><X size={20}/></button></div>
          <div className="cn-nav-drawer-menu" onClick={event => {
            const anchor = (event.target as HTMLElement).closest('a');
            const href = anchor?.getAttribute('href');
            if (href && !anchor?.hasAttribute('data-navigation-toggle')) setDrawerOpen(false);
          }}><Sidebar collapsed={false}/></div>
        </div>
      </dialog>, document.body)}
    </div>
  );
};

export default MainLayout;

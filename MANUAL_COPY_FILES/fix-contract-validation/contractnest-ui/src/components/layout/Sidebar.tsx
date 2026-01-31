// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMenuItemsForIndustry, MenuItem } from '../../utils/constants/industryMenus';
import { useContractStats } from '../../hooks/queries/useContractQueries';

interface NavItemProps {
  item: MenuItem;
  collapsed: boolean;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ item, collapsed, badge }) => {
  // Use defaultOpen from item config, fallback to false
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(item.defaultOpen || false);
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Safely get the icon from Lucide icons with proper typing
  const getIconComponent = (iconName: string) => {
    const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
    return iconsMap[iconName] || LucideIcons.Circle;
  };

  const IconComponent = getIconComponent(item.icon);

  const toggleSubmenu = (e: React.MouseEvent) => {
    if (item.hasSubmenu && item.submenuItems) {
      e.preventDefault();
      setIsSubmenuOpen(!isSubmenuOpen);
    }
  };

  return (
    <div className="mb-1">
      <NavLink
        to={item.hasSubmenu ? '#' : item.path}
        className={({ isActive }) => `
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all sidebar-nav-item
          ${item.hasSubmenu && isSubmenuOpen ? 'submenu-open' : ''}
        `}
        style={({ isActive }) => ({
          backgroundColor: (isActive && !item.hasSubmenu)
            ? colors.brand.primary
            : (item.hasSubmenu && isSubmenuOpen)
              ? `${colors.utility.primaryText}10`
              : 'transparent',
          color: (isActive && !item.hasSubmenu)
            ? 'white'
            : colors.utility.primaryText,
          fontWeight: (isActive && !item.hasSubmenu) ? '500' : 'normal'
        })}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          const isActive = target.classList.contains('active');
          if (!isActive && !(item.hasSubmenu && isSubmenuOpen)) {
            target.style.backgroundColor = `${colors.brand.primary}10`;
            target.style.color = colors.brand.primary;
          }
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget;
          const isActive = target.classList.contains('active');
          if (!isActive && !(item.hasSubmenu && isSubmenuOpen)) {
            target.style.backgroundColor = 'transparent';
            target.style.color = colors.utility.primaryText;
          }
        }}
        onClick={toggleSubmenu}
      >
        <div className="relative">
          <IconComponent size={20} />
          {badge !== undefined && badge > 0 && (
            <span
              className="absolute -top-1 -right-1 text-xs rounded-full h-4 w-4 flex items-center justify-center text-white"
              style={{ backgroundColor: colors.semantic.error }}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="flex justify-between items-center w-full">
            <span>{item.label}</span>

            {item.hasSubmenu && item.submenuItems && (
              <LucideIcons.ChevronRight
                size={16}
                className={`transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`}
              />
            )}

            {badge !== undefined && badge > 0 && (
              <span
                className="text-xs rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: `${colors.brand.primary}20`,
                  color: colors.brand.primary
                }}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
        )}
      </NavLink>

      {!collapsed && item.hasSubmenu && item.submenuItems && isSubmenuOpen && (
        <div
          className="ml-5 pl-4 border-l space-y-1 mt-1 transition-colors"
          style={{ borderColor: `${colors.utility.primaryText}20` }}
        >
          {item.submenuItems.map((subItem) => {
            const SubIconComponent = getIconComponent(subItem.icon);

            return (
              <NavLink
                key={subItem.id}
                to={subItem.path}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all"
                style={({ isActive }) => ({
                  backgroundColor: isActive
                    ? `${colors.brand.primary}20`
                    : 'transparent',
                  color: isActive
                    ? colors.brand.primary
                    : colors.utility.secondaryText,
                  fontWeight: isActive ? '500' : 'normal'
                })}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  const isActive = target.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    target.style.backgroundColor = `${colors.utility.primaryText}10`;
                    target.style.color = colors.utility.primaryText;
                  }
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  const isActive = target.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    target.style.backgroundColor = 'transparent';
                    target.style.color = colors.utility.secondaryText;
                  }
                }}
              >
                <div className="relative">
                  <SubIconComponent size={16} />
                </div>
                <span>{subItem.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  // Get user data and industry from auth context
  const { user, currentTenant, isAuthenticated, hasCompletedOnboarding } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const [logoError, setLogoError] = useState(false);
  const [iconError, setIconError] = useState(false);

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get industry-specific menu items
  const menuItems = getMenuItemsForIndustry(user?.industry || currentTenant?.id);

  // Check if user is owner and onboarding is not complete
  const isOwner = currentTenant?.is_owner || false;
  const showGettingStarted = !hasCompletedOnboarding && isOwner;

  // Filter items into regular and admin groups
  // Also filter out 'getting-started' if onboarding is complete or user is not owner
  const regularMenuItems = menuItems.filter(item => {
    if (!item.adminOnly) {
      // Hide 'getting-started' if onboarding complete or not owner
      if (item.id === 'getting-started' && !showGettingStarted) {
        return false;
      }
      return true;
    }
    return false;
  });
  const adminMenuItems = menuItems.filter(item => item.adminOnly);

  // Badge counts — contracts from real stats, others placeholder
  const { data: contractStats } = useContractStats();
  const notificationCounts: Record<string, number> = {
    contracts: contractStats?.total || 0,
    appointments: 0,
    tasks: 0,
    vani: 0
  };

  // Check if user is admin
  const isAdmin = Boolean(currentTenant?.is_admin);

  // Render logo or text based on collapsed state and image availability
  const renderLogo = () => {
    if (collapsed) {
      if (!iconError) {
        return (
          <img
            src="/assets/images/contractnest-icon.png"
            alt="CN"
            className="h-8 w-8"
            onError={() => setIconError(true)}
          />
        );
      } else {
        // Fallback for collapsed state if image fails to load
        return (
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <span className="font-bold">CN</span>
          </div>
        );
      }
    } else {
      if (!logoError) {
        return (
          <div className="flex items-center">
            <img
              src="/assets/images/contractnest-logo.png"
              alt="ContractNest"
              className="h-8"
              onError={() => setLogoError(true)}
            />
          </div>
        );
      } else {
        // Fallback for expanded state if image fails to load
        // Theme-stable design: icon badge + text
        return (
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: colors.brand.primary }}
            >
              CN
            </span>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: colors.utility.primaryText }}
            >
              ContractNest
            </span>
          </div>
        );
      }
    }
  };

  return (
    <aside
      className={`
        flex flex-col transition-all duration-300 ease-in-out sidebar shadow-sm h-full
        ${collapsed ? 'w-16' : 'w-64'}
      `}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        color: colors.utility.primaryText
      }}
    >
      <div
        className="flex items-center justify-between p-4 border-b transition-colors"
        style={{ borderColor: `${colors.utility.primaryText}20` }}
      >
        <div className="mx-auto">
          {renderLogo()}
        </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto">
        <nav className="py-4 space-y-1">
          {/* Regular menu items with VaNi inserted between Contracts and Catalog Studio */}
          {regularMenuItems.map((item, index) => {
            const nextItem = regularMenuItems[index + 1];
            const showVaNiAfter = item.id === 'contracts' && nextItem?.id === 'catalog-studio';

            return (
              <React.Fragment key={item.id}>
                <NavItem
                  item={item}
                  collapsed={collapsed}
                  badge={notificationCounts[item.id]}
                />
                {/* VaNi AI Card - between Contracts and Catalog Studio */}
                {showVaNiAfter && !collapsed && (
                  <div className="my-3 mx-2">
                    <div
                      className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 shadow-xl border border-white/10 relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all"
                      onClick={() => window.location.href = '/vani/chat'}
                    >
                      <div
                        className="absolute -right-4 -top-4 w-16 h-16 blur-2xl rounded-full group-hover:opacity-60 transition-all"
                        style={{ backgroundColor: `${colors.brand.primary}30` }}
                      />

                      <div className="flex items-center gap-3 relative z-10">
                        <div className="relative">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-inner">
                            <LucideIcons.Sparkles
                              size={20}
                              style={{ color: colors.brand.primary }}
                            />
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white tracking-widest uppercase">VaNi AI</h4>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Autonomous Mode: ON</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5">
                        <p className="text-[10px] text-gray-400 leading-tight italic">"Ready to assist with your contracts."</p>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Admin menu separator - only show if user is admin and there are admin items */}
          {isAdmin && adminMenuItems.length > 0 && (
            <div className="my-4 px-4">
              <div className="flex items-center">
                {!collapsed && (
                  <span
                    className="text-xs font-semibold uppercase tracking-wider transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Admin
                  </span>
                )}
                <div
                  className={`${collapsed ? 'w-full' : 'ml-2 flex-1'} h-px transition-colors`}
                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                />
              </div>
            </div>
          )}

          {/* Admin menu items - only show if user is admin */}
          {isAdmin && adminMenuItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      {/* Removed "Need help" section - replaced with VaNi AI card in main menu */}
    </aside>
  );
};

export default Sidebar;

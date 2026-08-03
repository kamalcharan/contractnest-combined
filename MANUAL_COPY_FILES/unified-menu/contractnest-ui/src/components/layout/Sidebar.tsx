// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMenuItemsForIndustry, getMenuAccess, MenuItem, MenuSection, MenuAccess } from '../../utils/constants/industryMenus';
import { useNavigate } from 'react-router-dom';
import { LITE_TRIAL, getLiteCrossSellCopy, type LiteCrossSellCopy } from '../../utils/constants/liteAccess';
import TrialCrossSellModal from '../lite/TrialCrossSellModal';
import { useReveals } from '@/components/reveal/useReveal';
import type { RevealId } from '@/components/reveal/revealRules';

// Menu entries the reveal schedule gates. Anything absent from this map is
// always shown, so adding a menu item can never accidentally hide it.
const REVEAL_BY_MENU_ID: Record<string, RevealId> = {
  'ops-group-sessions': 'group-sessions',
};

// Module-level so the reference is stable — useReveals memoises on it, and an
// inline array literal would rebuild the map on every render.
const GATED_IDS = ['group-sessions'] as const;
import { useContractStats } from '../../hooks/queries/useContractQueries';

interface NavItemProps {
  item: MenuItem;
  collapsed: boolean;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ item, collapsed, badge }) => {
  // All submenus open by default unless explicitly set to false
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(item.defaultOpen !== false);
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

// Special highlighted nav item for VaNi
// NOTE: previously a single hardcoded NavLink with no submenu support at all —
// item.hasSubmenu/submenuItems were silently ignored here even when set on the
// menu data, since this component (not the generic NavItem) renders id==='vani'.
// Now mirrors NavItem's toggle/chevron/submenu-list pattern while keeping the
// distinctive gradient + "AI" badge header.
// VaNiNavItem removed — highlight is now a property of a menu item
// (`highlight: 'vani' | 'brand'`) handled by FlatNavItem below.

// ─────────────────────────────────────────────────────────────────────────
// FLAT NAV ITEM — the single item renderer for the whole menu.
// `open`   → plain NavLink
// `locked` → same row + ✦ badge; clicking opens the cross-sell modal
//            instead of navigating (the upsell IS the menu)
// A `highlight` item gets an emphasis treatment (VaNi purple, or brand).
// ─────────────────────────────────────────────────────────────────────────
const HIGHLIGHT_STYLES = {
  vani: { from: 'rgba(139,92,246,0.12)', to: 'rgba(124,58,237,0.06)',
          activeFrom: '#8b5cf6', activeTo: '#7c3aed',
          border: 'rgba(139,92,246,0.2)', activeBorder: 'rgba(139,92,246,0.5)',
          text: '#c4b5fd', glow: 'rgba(139,92,246,0.3)' },
} as const;

const FlatNavItem: React.FC<{
  item: MenuItem;
  collapsed: boolean;
  access: MenuAccess;
  brand: string;
  colors: any;
  onLockedClick: (item: MenuItem) => void;
}> = ({ item, collapsed, access, brand, colors, onLockedClick }) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
  const Icon = iconsMap[item.icon] || LucideIcons.Circle;
  const locked = access === 'locked';

  // Highlighted items (VaNi purple / brand orange) keep their emphasis even
  // when locked — the point is that they are noticed.
  const hl = item.highlight === 'vani'
    ? HIGHLIGHT_STYLES.vani
    : item.highlight === 'brand'
      ? { from: `${brand}1A`, to: `${brand}0D`, activeFrom: brand, activeTo: brand,
          border: `${brand}33`, activeBorder: `${brand}80`, text: brand, glow: `${brand}4D` }
      : null;

  const rowClass = 'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all sidebar-nav-item mb-1';

  const body = (isActive: boolean) => (
    <>
      <Icon size={18} />
      {!collapsed && (
        <div className="flex justify-between items-center w-full">
          <span className="text-sm">{item.label}</span>
          {locked && (
            <span
              className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
              style={{ color: brand, backgroundColor: `${brand}15`, border: `1px solid ${brand}40` }}
            >
              ✦
            </span>
          )}
        </div>
      )}
    </>
  );

  const styleFor = (isActive: boolean): React.CSSProperties => {
    if (hl) {
      return {
        background: isActive
          ? `linear-gradient(135deg, ${hl.activeFrom}, ${hl.activeTo})`
          : `linear-gradient(135deg, ${hl.from}, ${hl.to})`,
        border: `1px solid ${isActive ? hl.activeBorder : hl.border}`,
        color: isActive ? '#ffffff' : hl.text,
        boxShadow: isActive ? `0 4px 15px ${hl.glow}` : 'none',
        fontWeight: 600,
      };
    }
    return {
      backgroundColor: isActive ? colors.brand.primary : 'transparent',
      color: isActive ? 'white' : locked ? colors.utility.secondaryText : colors.utility.primaryText,
      fontWeight: isActive ? 500 : 'normal',
    };
  };

  if (locked) {
    return (
      <button
        type="button"
        onClick={() => onLockedClick(item)}
        className={`${rowClass} w-full text-left`}
        style={styleFor(false)}
      >
        {body(false)}
      </button>
    );
  }

  return (
    <NavLink to={item.path} className={rowClass} style={({ isActive }) => styleFor(isActive)}>
      {({ isActive }) => body(isActive)}
    </NavLink>
  );
};

const SECTION_LABELS: Record<MenuSection, string> = {
  workspace: 'Your workspace',
  grow: 'Grow with ContractNest',
  configure: 'Configure',
};

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  // Get user data and industry from auth context
  const { user, currentTenant, isAuthenticated, hasCompletedOnboarding, liteTier, perspective } = useAuth();
  const navigate = useNavigate();
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
  // Reveal schedule. Fails open: an id with no rule, or a rule whose signal has
  // not arrived, returns true and the item renders exactly as it does today.
  const revealed = useReveals(GATED_IDS);
  const isRevealed = (id: string): boolean => {
    const ruleId = REVEAL_BY_MENU_ID[id];
    return ruleId ? revealed[ruleId] !== false : true;
  };

  const regularMenuItems = menuItems.filter(item => {
    if (!item.adminOnly) {
      // Hide 'getting-started' if onboarding complete or not owner
      if (item.id === 'getting-started' && !showGettingStarted) {
        return false;
      }
      return isRevealed(item.id);
    }
    return false;
  })
    // Submenu entries are gated too — Group Sessions lives under Operations,
    // so filtering only the top level would leave it visible.
    .map(item =>
      item.submenuItems
        ? { ...item, submenuItems: item.submenuItems.filter(sub => isRevealed(sub.id)) }
        : item
    );
  const adminMenuItems = menuItems.filter(item => item.adminOnly);

  // ── Access + grouping: ONE pass, ONE rule set (getMenuAccess) ──────────
  // Replaces the old lite/full branch. A lite tenant sees the SAME menu;
  // items they have not unlocked render with ✦ and open the cross-sell.
  const [trialCopy, setTrialCopy] = useState<LiteCrossSellCopy | null>(null);
  const handleLockedClick = (item: MenuItem) => {
    const flavor = liteTier || 'cnak';
    setTrialCopy(getLiteCrossSellCopy(flavor, item.copyKey || item.id));
  };

  const sectioned = (['workspace', 'grow', 'configure'] as MenuSection[]).map((section) => ({
    section,
    items: regularMenuItems
      .filter((item) => (item.section || 'workspace') === section)
      .map((item) => ({
        item,
        access: getMenuAccess(item, {
          tier: liteTier,
          perspective,
          revealed: isRevealed(item.id),
        }),
      }))
      .filter(({ access }) => access !== 'hidden'),
  })).filter((g) => g.items.length > 0);

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

      {/* ── ONE MENU, ONE RENDER PATH ──────────────────────────────────────
          Sections from industryMenus (workspace / grow / configure); each
          item is open, locked (✦ → cross-sell) or hidden, decided by
          getMenuAccess. There is no separate "lite" sidebar any more. */}
      <div className="p-2 flex-1 overflow-y-auto">
        <nav className="py-4">
          {sectioned.map(({ section, items }) => (
            <div key={section} data-walkover={section === 'workspace' ? 'nav-workspace' : section === 'grow' ? 'nav-grow' : undefined}>
              {!collapsed && (
                <div
                  className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {SECTION_LABELS[section]}
                </div>
              )}
              {items.map(({ item, access }) => (
                <FlatNavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  access={access}
                  brand={colors.brand.primary}
                  colors={colors}
                  onLockedClick={handleLockedClick}
                />
              ))}
            </div>
          ))}

          {/* Admin — unchanged, still nested, still admin-only */}
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
          {isAdmin && adminMenuItems.map((item) => (
            <NavItem key={item.id} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      {/* Trial bar — only for lite tenants; every CTA runs express onboarding */}
      {liteTier && !collapsed && (
        <div className="p-3" data-walkover="trial">
          <div
            className="rounded-xl p-3 text-center"
            style={{
              border: `1.5px dashed ${colors.brand.primary}66`,
              background: `linear-gradient(135deg, ${colors.brand.primary}10, transparent)`,
            }}
          >
            <p className="text-[11px] leading-snug mb-2" style={{ color: colors.utility.secondaryText }}>
              Your first <b style={{ color: colors.utility.primaryText }}>3 contracts are free.</b>
              <br />Set up in ~6 minutes with VaNi.
            </p>
            <button
              onClick={() => navigate(LITE_TRIAL.route)}
              className="w-full rounded-lg py-2 text-xs font-bold text-white"
              style={{ backgroundColor: colors.brand.primary }}
            >
              {LITE_TRIAL.cta} →
            </button>
          </div>
        </div>
      )}

      <TrialCrossSellModal open={trialCopy !== null} copy={trialCopy} onClose={() => setTrialCopy(null)} />

      {/* Removed "Need help" section - replaced with VaNi AI card in main menu */}
    </aside>
  );
};

export default Sidebar;

// src/pages/Dashboard.tsx - V4 Split-Layout Dashboard (Cockpit-Style Theme)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Wrench,
  Building2,
  LayoutGrid,
  FileText,
  Gauge,
  UserPlus,
  ClipboardList,
  Check,
  Plus,
  Zap,
  MessageSquare,
} from 'lucide-react';

// ─── Helpers (cockpit-style) ────────────────────────────────────

/** Append hex alpha to a #RRGGBB color string */
const withOpacity = (hex: string, opacity: number): string => {
  const base = (hex || '#6B7280').slice(0, 7);
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return base + alpha;
};

// ─── Static data ────────────────────────────────────────────────

const equipmentItems = [
  { emoji: '❄️', title: 'HVAC / AC', sub: 'AMC' },
  { emoji: '🛗', title: 'Elevators', sub: 'Safety' },
  { emoji: '📹', title: 'CCTV', sub: 'Surveillance' },
  { emoji: '🔥', title: 'Fire Safety', sub: 'Compliance' },
  { emoji: '⚡', title: 'Generators', sub: 'Power' },
  { emoji: '💧', title: 'Water Purifiers', sub: 'Filters' },
  { emoji: '🖨️', title: 'Printers', sub: 'Toner' },
  { emoji: '☀️', title: 'Solar Panels', sub: 'Cleaning' },
];

const operationsItems = [
  { emoji: '🏭', title: 'Factory', sub: 'Machinery' },
  { emoji: '🧪', title: 'Clean Room', sub: 'Certification' },
  { emoji: '💚', title: 'Health Plans', sub: 'Wellness' },
  { emoji: '🧹', title: 'Facility Mgmt', sub: 'Housekeeping' },
  { emoji: '🌿', title: 'Landscaping', sub: 'Green care' },
  { emoji: '🖥️', title: 'IT Infra', sub: 'Servers' },
  { emoji: '🚗', title: 'Fleet', sub: 'Vehicles' },
];

const valueFeatures = ['Service Schedule', 'Auto Invoicing', 'Digital Evidence', 'Acceptance & Tracking'];

// =================================================================
// SUB-COMPONENTS (cockpit card style)
// =================================================================

// ─── Section Pill Header ────────────────────────────────────────

const SectionPill: React.FC<{
  icon: React.ElementType;
  label: string;
  brandColor: string;
  isDarkMode: boolean;
}> = ({ icon: Icon, label, brandColor, isDarkMode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div
      className="p-1.5 rounded-lg"
      style={{ backgroundColor: withOpacity(brandColor, isDarkMode ? 0.2 : 0.1) }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: brandColor }} />
    </div>
    <span
      className="text-[11px] uppercase tracking-wider font-bold"
      style={{ color: brandColor }}
    >
      {label}
    </span>
  </div>
);

// ─── Step Card (How it works) ───────────────────────────────────

interface StepCardProps {
  num: number;
  accent: string;
  iconBg: string;
  Icon: React.ElementType;
  title: string;
  roles: Array<{ label: string; bg: string; color: string }>;
  desc: string;
  cta: string;
  path: string;
  isDarkMode: boolean;
  brandColor: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  textPrimary: string;
  textSecondary: string;
  isLast?: boolean;
  onClick: () => void;
}

const StepCard: React.FC<StepCardProps> = ({
  num, accent, iconBg, Icon, title, roles, desc, cta,
  isDarkMode, brandColor, cardBg, cardBorder, cardShadow,
  textPrimary, textSecondary, isLast, onClick,
}) => (
  <div
    className="relative overflow-hidden rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md"
    style={{
      backgroundColor: cardBg,
      borderColor: cardBorder,
      boxShadow: cardShadow,
      marginBottom: isLast ? 0 : 10,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = withOpacity(brandColor, 0.4); e.currentTarget.style.transform = 'translateX(2px)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'translateX(0)'; }}
    onClick={onClick}
  >
    {/* Left accent bar */}
    <div
      className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
      style={{ backgroundColor: accent }}
    />

    <div className="p-4">
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <span
          className="w-[22px] h-[22px] rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
          style={{ backgroundColor: accent }}
        >
          {num}
        </span>
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-[15px] h-[15px]" style={{ color: accent }} />
        </div>
        <h3 className="text-xs font-bold flex-1" style={{ color: textPrimary }}>
          {title}
        </h3>
      </div>

      {/* Role tags */}
      <div className="flex gap-1 mb-1 pl-8">
        {roles.map((role) => (
          <span
            key={role.label}
            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: role.bg, color: role.color }}
          >
            {role.label}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-[11px] leading-snug pl-8 mb-1.5" style={{ color: textSecondary }}>
        {desc}
      </p>

      {/* CTA */}
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold pl-8"
        style={{ color: brandColor }}
      >
        {cta} <ArrowRight className="w-3 h-3" />
      </span>
    </div>
  </div>
);

// ─── Equipment / Operations Tile ────────────────────────────────

const EquipmentTile: React.FC<{
  emoji: string;
  title: string;
  sub: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  hoverBorder: string;
  textPrimary: string;
  textSecondary: string;
  onClick: () => void;
}> = ({ emoji, title, sub, cardBg, cardBorder, cardShadow, hoverBorder, textPrimary, textSecondary, onClick }) => (
  <div
    className="rounded-xl border shadow-sm py-2.5 px-1.5 text-center cursor-pointer transition-all"
    style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorder; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = cardShadow; }}
    onClick={onClick}
  >
    <span className="text-[26px] block mb-0.5">{emoji}</span>
    <h4 className="text-[10px] font-bold leading-tight" style={{ color: textPrimary }}>{title}</h4>
    <p className="text-[9px]" style={{ color: textSecondary }}>{sub}</p>
  </div>
);

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ─── Theme palette (cockpit-style) ───────────────────────────
  const brandColor = colors.brand.primary;
  const brandSecondary = colors.brand.secondary;
  const brandTertiary = colors.brand.tertiary;
  const success = colors.semantic.success;
  const warning = colors.semantic.warning;
  const info = colors.semantic.info;

  const cardBg = colors.utility.secondaryBackground;
  const pageBg = colors.utility.primaryBackground;
  const textPrimary = colors.utility.primaryText;
  const textSecondary = colors.utility.secondaryText;
  const cardBorder = withOpacity(textPrimary, 0.08);
  const cardShadow = isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)';
  const hoverBorder = withOpacity(brandColor, 0.4);

  // ─── How it works steps ──────────────────────────────────────
  const howItWorksSteps = [
    {
      num: 1, accent: brandColor,
      iconBg: withOpacity(brandColor, isDarkMode ? 0.2 : 0.1),
      Icon: LayoutGrid, title: 'Define Your Services',
      roles: [
        { label: 'Seller', bg: withOpacity(info, isDarkMode ? 0.2 : 0.1), color: info },
        { label: 'Buyer', bg: withOpacity(brandTertiary, isDarkMode ? 0.2 : 0.1), color: brandTertiary },
      ],
      desc: 'Build a catalog with pricing, SLAs & evidence policies. Both sides see the same commitments.',
      cta: 'Build Catalog', path: '/catalog-studio',
    },
    {
      num: 2, accent: warning,
      iconBg: withOpacity(warning, isDarkMode ? 0.2 : 0.1),
      Icon: FileText, title: 'Create Digital Contract',
      roles: [
        { label: 'Sends', bg: withOpacity(info, isDarkMode ? 0.2 : 0.1), color: info },
        { label: 'Accepts', bg: withOpacity(brandTertiary, isDarkMode ? 0.2 : 0.1), color: brandTertiary },
      ],
      desc: 'Lock service commitments into a contract. Billing, schedules & deliverables — agreed digitally.',
      cta: 'Create Contract', path: '/contracts',
    },
    {
      num: 3, accent: success,
      iconBg: withOpacity(success, isDarkMode ? 0.2 : 0.1),
      Icon: Gauge, title: 'Operate & Track',
      roles: [
        { label: 'Revenue', bg: withOpacity(info, isDarkMode ? 0.2 : 0.1), color: info },
        { label: 'Expenses', bg: withOpacity(brandTertiary, isDarkMode ? 0.2 : 0.1), color: brandTertiary },
      ],
      desc: 'One cockpit for both sides. Events, invoices, payments & evidence — tied to the contract.',
      cta: 'Open Cockpit', path: '/ops/cockpit',
    },
  ];

  // ─── Quick actions ───────────────────────────────────────────
  const quickActions = [
    { title: 'Add Contacts', desc: 'Customers or vendors', path: '/contacts', accent: info, Icon: UserPlus },
    { title: 'Business Profile', desc: 'Brand & preferences', path: '/settings/business-profile', accent: warning, Icon: Building2 },
    { title: 'Ops Cockpit', desc: 'Track operations', path: '/ops/cockpit', accent: success, Icon: Gauge },
    { title: 'Templates', desc: 'Reuse contracts', path: '/service-contracts/templates', accent: brandTertiary, Icon: ClipboardList },
  ];

  // ─── Value strip (dark-mode aware) ───────────────────────────
  const valueStripBg = isDarkMode
    ? cardBg
    : 'linear-gradient(135deg, #0f172a, #1e293b 60%, #334155)';
  const valueStripText = isDarkMode ? textPrimary : '#ffffff';
  const valueStripSub = isDarkMode ? textSecondary : '#94a3b8';
  const valueCheckLabel = isDarkMode ? textSecondary : '#cbd5e1';

  return (
    <div
      className="min-h-screen p-6 transition-colors overflow-x-hidden"
      style={{ backgroundColor: pageBg, maxWidth: '100vw', overflowX: 'hidden' }}
    >
      {/* ═══════ HEADER (cockpit-style) ═══════ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: withOpacity(brandColor, 0.1) }}
          >
            <Sparkles className="h-5 w-5" style={{ color: brandColor }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>
              {user?.first_name ? `Welcome, ${user.first_name}` : 'Dashboard'}
            </h1>
            <p className="text-xs" style={{ color: textSecondary }}>
              Every service commitment deserves a digital contract
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold text-white transition-all hover:scale-105"
          style={{
            backgroundColor: brandColor,
            boxShadow: `0 10px 25px -5px ${withOpacity(brandColor, 0.4)}`,
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Contract
        </button>
      </div>

      {/* ═══════ HERO TAGLINE BAR ═══════ */}
      <div
        className="rounded-xl border shadow-sm px-5 py-3 mb-6 flex items-center justify-between"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: textPrimary }}>
            Vendor or buyer — one contract connects both sides
          </h2>
          <p className="text-[11px]" style={{ color: textSecondary }}>
            Schedules, billing, evidence & compliance built in.
          </p>
        </div>
        <div
          className="px-2.5 py-1 rounded-md text-[10px] font-semibold"
          style={{
            backgroundColor: withOpacity(brandColor, isDarkMode ? 0.2 : 0.08),
            color: brandColor,
          }}
        >
          ContractNest
        </div>
      </div>

      {/* ═══════ MAIN SPLIT LAYOUT ═══════ */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '320px 1fr' }}>

        {/* LEFT COLUMN: How it works */}
        <div
          className="rounded-xl border shadow-sm p-4"
          style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
        >
          <SectionPill icon={Clock} label="How it works" brandColor={brandColor} isDarkMode={isDarkMode} />

          {howItWorksSteps.map((step, i) => (
            <StepCard
              key={step.num}
              {...step}
              isDarkMode={isDarkMode}
              brandColor={brandColor}
              cardBg={pageBg}
              cardBorder={cardBorder}
              cardShadow={cardShadow}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              isLast={i === howItWorksSteps.length - 1}
              onClick={() => navigate(step.path)}
            />
          ))}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6" style={{ minWidth: 0 }}>

          {/* Equipment Section */}
          <div
            className="rounded-xl border shadow-sm p-4"
            style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
          >
            <SectionPill icon={Wrench} label="What are you maintaining today" brandColor={brandColor} isDarkMode={isDarkMode} />
            <div className="grid grid-cols-4 gap-2.5">
              {equipmentItems.map((item) => (
                <EquipmentTile
                  key={item.title}
                  {...item}
                  cardBg={pageBg}
                  cardBorder={cardBorder}
                  cardShadow={cardShadow}
                  hoverBorder={hoverBorder}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  onClick={() => navigate('/contracts')}
                />
              ))}
            </div>
          </div>

          {/* Operations & Industry Section */}
          <div
            className="rounded-xl border shadow-sm p-4"
            style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
          >
            <SectionPill icon={Building2} label="Operations & Industry" brandColor={brandColor} isDarkMode={isDarkMode} />
            <div className="grid grid-cols-4 gap-2.5">
              {operationsItems.map((item) => (
                <EquipmentTile
                  key={item.title}
                  {...item}
                  cardBg={pageBg}
                  cardBorder={cardBorder}
                  cardShadow={cardShadow}
                  hoverBorder={hoverBorder}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  onClick={() => navigate('/contracts')}
                />
              ))}
              {/* +Any card */}
              <div
                className="rounded-xl py-2.5 px-1.5 text-center cursor-pointer flex flex-col items-center justify-center transition-all"
                style={{
                  backgroundColor: withOpacity(brandColor, isDarkMode ? 0.08 : 0.04),
                  border: `1.5px dashed ${withOpacity(brandColor, 0.3)}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = withOpacity(brandColor, 0.6); e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = withOpacity(brandColor, 0.3); e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => navigate('/contracts')}
              >
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center mb-0.5"
                  style={{ backgroundColor: withOpacity(brandColor, isDarkMode ? 0.2 : 0.12) }}
                >
                  <Plus className="w-[13px] h-[13px]" style={{ color: brandColor }} />
                </div>
                <h4 className="text-[10px] font-bold" style={{ color: brandColor }}>Any</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ VALUE STRIP ═══════ */}
      <div
        className="rounded-xl border shadow-sm px-5 py-4 mb-6 relative overflow-hidden"
        style={{
          background: valueStripBg,
          borderColor: isDarkMode ? cardBorder : 'transparent',
          boxShadow: cardShadow,
        }}
      >
        <div
          className="absolute -top-4 -right-4 w-[90px] h-[90px] rounded-full"
          style={{ backgroundColor: withOpacity(brandColor, 0.1) }}
        />
        <div className="relative z-10 flex items-center gap-4 flex-wrap">
          <div className="min-w-[180px]">
            <h3 className="text-[13px] font-bold" style={{ color: valueStripText }}>
              Every contract includes
            </h3>
            <p className="text-[10px]" style={{ color: valueStripSub }}>
              Service commitments both sides trust
            </p>
          </div>
          <div className="flex gap-4 flex-wrap flex-1">
            {valueFeatures.map((feat) => (
              <div key={feat} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: withOpacity(success, 0.15) }}
                >
                  <Check className="w-[9px] h-[9px]" style={{ color: success }} />
                </div>
                <span className="text-[11px] font-medium" style={{ color: valueCheckLabel }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: withOpacity(brandColor, isDarkMode ? 0.2 : 0.1) }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: brandColor }} />
          </div>
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: textSecondary }}>
            Quick actions
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <div
              key={action.title}
              className="rounded-xl border shadow-sm p-3 cursor-pointer transition-all"
              style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorder; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = cardShadow; }}
              onClick={() => navigate(action.path)}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
                style={{ backgroundColor: withOpacity(action.accent, isDarkMode ? 0.2 : 0.1) }}
              >
                <action.Icon className="w-3.5 h-3.5" style={{ color: action.accent }} />
              </div>
              <h3 className="text-[11px] font-bold mb-0.5" style={{ color: textPrimary }}>{action.title}</h3>
              <p className="text-[9px]" style={{ color: textSecondary }}>{action.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ WHATSAPP STRIP (footer-bar style) ═══════ */}
      <div
        className="rounded-xl border shadow-sm px-5 py-3 flex items-center justify-between transition-all"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = withOpacity(success, 0.4); }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder; }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: withOpacity(success, isDarkMode ? 0.2 : 0.1) }}
          >
            <MessageSquare className="w-3.5 h-3.5" style={{ color: success }} />
          </div>
          <h4 className="text-xs font-semibold" style={{ color: textPrimary }}>
            Discoverable via WhatsApp AI Bot
          </h4>
        </div>
        <button
          onClick={() => navigate('/settings/configure/customer-channels/groups')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
          style={{
            backgroundColor: withOpacity(success, isDarkMode ? 0.2 : 0.08),
            color: success,
          }}
        >
          Configure
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

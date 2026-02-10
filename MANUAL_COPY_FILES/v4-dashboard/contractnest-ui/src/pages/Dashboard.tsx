// src/pages/Dashboard.tsx - V4 Split-Layout Dashboard (Theme-Enabled)
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
  Calendar,
  ClipboardList,
  Check,
  Plus,
  Zap,
  MessageSquare,
} from 'lucide-react';

// ─── Data arrays (static) ───────────────────────────────────────

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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ─── Theme-derived palette ───────────────────────────────────
  const brand = colors.brand.primary;
  const brandSecondary = colors.brand.secondary;
  const brandTertiary = colors.brand.tertiary;
  const success = colors.semantic.success;
  const warning = colors.semantic.warning;
  const info = colors.semantic.info;
  const cardBg = colors.utility.secondaryBackground;
  const pageBg = colors.utility.primaryBackground;
  const textPrimary = colors.utility.primaryText;
  const textSecondary = colors.utility.secondaryText;
  const borderColor = `${textPrimary}15`;
  const hoverBorderColor = `${brand}40`;

  // Opacity helpers — adjust for dark vs light
  const softBg = (color: string) => `${color}${isDarkMode ? '25' : '12'}`;
  const medBg = (color: string) => `${color}${isDarkMode ? '30' : '18'}`;

  // ─── How it works steps (theme-derived) ──────────────────────
  const howItWorksSteps = [
    {
      num: 1,
      accent: brand,
      iconBg: softBg(brand),
      Icon: LayoutGrid,
      title: 'Define Your Services',
      roles: [
        { label: 'Seller', bg: softBg(info), color: info },
        { label: 'Buyer', bg: softBg(brandTertiary), color: brandTertiary },
      ],
      desc: 'Build a catalog with pricing, SLAs & evidence policies. Both sides see the same commitments.',
      cta: 'Build Catalog',
      path: '/catalog-studio',
    },
    {
      num: 2,
      accent: warning,
      iconBg: softBg(warning),
      Icon: FileText,
      title: 'Create Digital Contract',
      roles: [
        { label: 'Sends', bg: softBg(info), color: info },
        { label: 'Accepts', bg: softBg(brandTertiary), color: brandTertiary },
      ],
      desc: 'Lock service commitments into a contract. Billing, schedules & deliverables — agreed digitally.',
      cta: 'Create Contract',
      path: '/contracts',
    },
    {
      num: 3,
      accent: success,
      iconBg: softBg(success),
      Icon: Gauge,
      title: 'Operate & Track',
      roles: [
        { label: 'Revenue', bg: softBg(info), color: info },
        { label: 'Expenses', bg: softBg(brandTertiary), color: brandTertiary },
      ],
      desc: 'One cockpit for both sides. Events, invoices, payments & evidence — tied to the contract.',
      cta: 'Open Cockpit',
      path: '/ops/cockpit',
    },
  ];

  // ─── Quick actions (theme-derived) ───────────────────────────
  const quickActions = [
    { title: 'Add Contacts', desc: 'Customers or vendors', path: '/contacts', accent: info, Icon: UserPlus },
    { title: 'Business Profile', desc: 'Brand & preferences', path: '/settings/business-profile', accent: warning, Icon: Building2 },
    { title: 'Ops Cockpit', desc: 'Track operations', path: '/ops/cockpit', accent: success, Icon: Calendar },
    { title: 'Templates', desc: 'Reuse contracts', path: '/service-contracts/templates', accent: brandTertiary, Icon: ClipboardList },
  ];

  // ─── Value strip gradient (dark-mode aware) ──────────────────
  const valueStripBg = isDarkMode
    ? `linear-gradient(135deg, ${cardBg}, ${textPrimary}10 60%, ${textPrimary}18)`
    : 'linear-gradient(135deg, #0f172a, #1e293b 60%, #334155)';

  const valueStripTextColor = isDarkMode ? textPrimary : '#ffffff';
  const valueStripSubColor = isDarkMode ? textSecondary : '#94a3b8';
  const valueCheckLabelColor = isDarkMode ? textSecondary : '#cbd5e1';

  return (
    <div
      className="min-h-[calc(100vh-120px)]"
      style={{ backgroundColor: pageBg }}
    >
      <style>{`
        .dash-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0,0,0,${isDarkMode ? '0.2' : '0.06'});
          border-color: ${hoverBorderColor} !important;
        }
        .pill-card:hover {
          transform: translateX(2px);
          box-shadow: 0 4px 14px rgba(0,0,0,${isDarkMode ? '0.2' : '0.06'});
          border-color: ${hoverBorderColor} !important;
        }
        .dash-hover, .pill-card { transition: all 0.2s ease; }
      `}</style>

      <div className="max-w-[1160px] mx-auto px-6 py-5">

        {/* ═══ HERO ═══ */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-1.5"
              style={{
                backgroundColor: softBg(brand),
                border: `1px solid ${brand}25`,
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: brand }} />
              <span className="text-[11px] font-bold" style={{ color: brand }}>
                ContractNest
              </span>
            </div>
            <h1
              className="text-[21px] font-extrabold tracking-tight leading-tight mb-1"
              style={{ color: textPrimary }}
            >
              Every service commitment deserves a{' '}
              <span style={{ color: brand }}>digital contract</span>
            </h1>
            <p className="text-xs" style={{ color: textSecondary }}>
              Vendor or buyer — one contract connects both sides. Schedules, billing, evidence & compliance built in.
            </p>
          </div>
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white whitespace-nowrap hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brand }}
          >
            + New Contract
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ═══ MAIN SPLIT LAYOUT ═══ */}
        <div
          className="grid gap-0 mb-5"
          style={{ gridTemplateColumns: '320px 1fr', minHeight: 480 }}
        >
          {/* LEFT COLUMN: How it works */}
          <div className="pr-6" style={{ borderRight: `1.5px solid ${borderColor}` }}>
            <div
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold text-white mb-4"
              style={{ backgroundColor: brandSecondary }}
            >
              <Clock className="w-3.5 h-3.5" />
              How it works
            </div>

            {howItWorksSteps.map((step, i) => (
              <div
                key={step.num}
                className="pill-card relative overflow-hidden rounded-xl border p-4 cursor-pointer"
                style={{
                  backgroundColor: cardBg,
                  borderColor,
                  marginBottom: i < howItWorksSteps.length - 1 ? 10 : 0,
                }}
                onClick={() => navigate(step.path)}
              >
                {/* Left accent bar */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
                  style={{ backgroundColor: step.accent }}
                />

                {/* Step header row */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span
                    className="w-[22px] h-[22px] rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: step.accent }}
                  >
                    {step.num}
                  </span>
                  <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: step.iconBg }}
                  >
                    <step.Icon className="w-[15px] h-[15px]" style={{ color: step.accent }} />
                  </div>
                  <h3 className="text-[13px] font-bold flex-1" style={{ color: textPrimary }}>
                    {step.title}
                  </h3>
                </div>

                {/* Role tags */}
                <div className="flex gap-1 mb-1 pl-8">
                  {step.roles.map((role) => (
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
                  {step.desc}
                </p>

                {/* CTA link */}
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold pl-8"
                  style={{ color: brand }}
                >
                  {step.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="pl-6 flex flex-col">

            {/* RIGHT TOP: Equipment */}
            <div className="flex-1 pb-5" style={{ borderBottom: `1.5px solid ${borderColor}` }}>
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold text-white mb-4"
                style={{ backgroundColor: brandSecondary }}
              >
                <Wrench className="w-3.5 h-3.5" />
                What are you maintaining today
              </div>

              <div className="grid grid-cols-4 gap-2">
                {equipmentItems.map((item) => (
                  <div
                    key={item.title}
                    className="dash-hover rounded-[10px] border py-2.5 px-1.5 text-center cursor-pointer"
                    style={{ backgroundColor: cardBg, borderColor }}
                    onClick={() => navigate('/contracts')}
                  >
                    <span className="text-[26px] block mb-0.5">{item.emoji}</span>
                    <h4 className="text-[10px] font-bold leading-tight" style={{ color: textPrimary }}>
                      {item.title}
                    </h4>
                    <p className="text-[9px]" style={{ color: textSecondary }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT BOTTOM: Operations & Industry */}
            <div className="flex-1 pt-5">
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold text-white mb-4"
                style={{ backgroundColor: brandSecondary }}
              >
                <Building2 className="w-3.5 h-3.5" />
                Operations & Industry
              </div>

              <div className="grid grid-cols-4 gap-2">
                {operationsItems.map((item) => (
                  <div
                    key={item.title}
                    className="dash-hover rounded-[10px] border py-2.5 px-1.5 text-center cursor-pointer"
                    style={{ backgroundColor: cardBg, borderColor }}
                    onClick={() => navigate('/contracts')}
                  >
                    <span className="text-[26px] block mb-0.5">{item.emoji}</span>
                    <h4 className="text-[10px] font-bold leading-tight" style={{ color: textPrimary }}>
                      {item.title}
                    </h4>
                    <p className="text-[9px]" style={{ color: textSecondary }}>{item.sub}</p>
                  </div>
                ))}
                {/* +Any card */}
                <div
                  className="dash-hover rounded-[10px] py-2.5 px-1.5 text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: softBg(brand),
                    border: `1.5px dashed ${brand}40`,
                  }}
                  onClick={() => navigate('/contracts')}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center mb-0.5"
                    style={{ backgroundColor: medBg(brand) }}
                  >
                    <Plus className="w-[13px] h-[13px]" style={{ color: brand }} />
                  </div>
                  <h4 className="text-[10px] font-bold" style={{ color: brand }}>Any</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VALUE STRIP ═══ */}
        <div
          className="rounded-xl px-5 py-4 mb-4 relative overflow-hidden"
          style={{
            background: valueStripBg,
            border: isDarkMode ? `1px solid ${borderColor}` : 'none',
          }}
        >
          <div
            className="absolute -top-4 -right-4 w-[90px] h-[90px] rounded-full"
            style={{ backgroundColor: `${brand}15` }}
          />
          <div className="relative z-10 flex items-center gap-4 flex-wrap">
            <div className="min-w-[180px]">
              <h3 className="text-[13px] font-bold" style={{ color: valueStripTextColor }}>
                Every contract includes
              </h3>
              <p className="text-[10px]" style={{ color: valueStripSubColor }}>
                Service commitments both sides trust
              </p>
            </div>
            <div className="flex gap-4 flex-wrap flex-1">
              {valueFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${success}25` }}
                  >
                    <Check className="w-[9px] h-[9px]" style={{ color: success }} />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: valueCheckLabelColor }}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="w-[15px] h-[15px]" style={{ color: brand }} />
            <span className="text-[13px] font-bold" style={{ color: textPrimary }}>
              Quick actions
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="dash-hover rounded-xl border p-3 cursor-pointer"
                style={{ backgroundColor: cardBg, borderColor }}
                onClick={() => navigate(action.path)}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                  style={{ backgroundColor: softBg(action.accent) }}
                >
                  <action.Icon className="w-3.5 h-3.5" style={{ color: action.accent }} />
                </div>
                <h3 className="text-[11px] font-bold mb-0.5" style={{ color: textPrimary }}>
                  {action.title}
                </h3>
                <p className="text-[9px]" style={{ color: textSecondary }}>{action.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ WHATSAPP STRIP ═══ */}
        <div
          className="rounded-xl border px-4 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
          style={{
            backgroundColor: cardBg,
            borderColor,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${success}50`; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; }}
          onClick={() => navigate('/settings/configure/customer-channels/groups')}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center"
              style={{ backgroundColor: softBg(success) }}
            >
              <MessageSquare className="w-[13px] h-[13px]" style={{ color: success }} />
            </div>
            <h4 className="text-[11px] font-semibold" style={{ color: textPrimary }}>
              Discoverable via WhatsApp AI Bot
            </h4>
          </div>
          <span
            className="text-[11px] font-semibold flex items-center gap-1"
            style={{ color: success }}
          >
            Configure <ArrowRight className="w-3 h-3" />
          </span>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

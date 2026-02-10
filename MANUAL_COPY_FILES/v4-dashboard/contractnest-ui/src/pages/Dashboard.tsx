// src/pages/Dashboard.tsx - V4 Split-Layout Dashboard
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

// Equipment items for "What are you maintaining today" grid
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

// Operations & Industry items
const operationsItems = [
  { emoji: '🏭', title: 'Factory', sub: 'Machinery' },
  { emoji: '🧪', title: 'Clean Room', sub: 'Certification' },
  { emoji: '💚', title: 'Health Plans', sub: 'Wellness' },
  { emoji: '🧹', title: 'Facility Mgmt', sub: 'Housekeeping' },
  { emoji: '🌿', title: 'Landscaping', sub: 'Green care' },
  { emoji: '🖥️', title: 'IT Infra', sub: 'Servers' },
  { emoji: '🚗', title: 'Fleet', sub: 'Vehicles' },
];

// How it works steps
const howItWorksSteps = [
  {
    num: 1,
    numColor: '#6366f1',
    iconBg: '#eef2ff',
    iconStroke: '#6366f1',
    accentColor: '#6366f1',
    title: 'Define Your Services',
    roles: [
      { label: 'Seller', bg: '#dbeafe', color: '#2563eb' },
      { label: 'Buyer', bg: '#fce7f3', color: '#db2777' },
    ],
    desc: 'Build a catalog with pricing, SLAs & evidence policies. Both sides see the same commitments.',
    cta: 'Build Catalog',
    path: '/catalog-studio',
  },
  {
    num: 2,
    numColor: '#f59e0b',
    iconBg: '#fef3c7',
    iconStroke: '#f59e0b',
    accentColor: '#f59e0b',
    title: 'Create Digital Contract',
    roles: [
      { label: 'Sends', bg: '#dbeafe', color: '#2563eb' },
      { label: 'Accepts', bg: '#fce7f3', color: '#db2777' },
    ],
    desc: 'Lock service commitments into a contract. Billing, schedules & deliverables — agreed digitally.',
    cta: 'Create Contract',
    path: '/contracts',
  },
  {
    num: 3,
    numColor: '#10b981',
    iconBg: '#d1fae5',
    iconStroke: '#10b981',
    accentColor: '#10b981',
    title: 'Operate & Track',
    roles: [
      { label: 'Revenue', bg: '#dbeafe', color: '#2563eb' },
      { label: 'Expenses', bg: '#fce7f3', color: '#db2777' },
    ],
    desc: 'One cockpit for both sides. Events, invoices, payments & evidence — tied to the contract.',
    cta: 'Open Cockpit',
    path: '/ops/cockpit',
  },
];

// Value strip features
const valueFeatures = ['Service Schedule', 'Auto Invoicing', 'Digital Evidence', 'Acceptance & Tracking'];

// Quick actions
const quickActions = [
  {
    title: 'Add Contacts',
    desc: 'Customers or vendors',
    path: '/contacts',
    iconBg: '#dbeafe',
    iconColor: '#3b82f6',
    Icon: UserPlus,
  },
  {
    title: 'Business Profile',
    desc: 'Brand & preferences',
    path: '/settings/business-profile',
    iconBg: '#fef3c7',
    iconColor: '#f59e0b',
    Icon: Building2,
  },
  {
    title: 'Ops Cockpit',
    desc: 'Track operations',
    path: '/ops/cockpit',
    iconBg: '#d1fae5',
    iconColor: '#10b981',
    Icon: Calendar,
  },
  {
    title: 'Templates',
    desc: 'Reuse contracts',
    path: '/service-contracts/templates',
    iconBg: '#fce7f3',
    iconColor: '#ec4899',
    Icon: ClipboardList,
  },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const tealPill = '#1a6b7a';

  return (
    <div
      className="min-h-[calc(100vh-120px)]"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <style>{`
        .dash-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .pill-card:hover { transform: translateX(2px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .dash-hover, .pill-card { transition: all 0.2s ease; }
      `}</style>

      <div className="max-w-[1160px] mx-auto px-6 py-5">

        {/* ═══ HERO ═══ */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-1.5"
              style={{
                backgroundColor: `${colors.brand.primary}12`,
                border: `1px solid ${colors.brand.primary}25`,
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: colors.brand.primary }} />
              <span className="text-[11px] font-bold" style={{ color: colors.brand.primary }}>
                ContractNest
              </span>
            </div>
            <h1
              className="text-[21px] font-extrabold tracking-tight leading-tight mb-1"
              style={{ color: colors.utility.primaryText }}
            >
              Every service commitment deserves a{' '}
              <span style={{ color: colors.brand.primary }}>digital contract</span>
            </h1>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              Vendor or buyer — one contract connects both sides. Schedules, billing, evidence & compliance built in.
            </p>
          </div>
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white whitespace-nowrap hover:opacity-90 transition-opacity"
            style={{ backgroundColor: colors.brand.primary }}
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
          <div
            className="pr-6"
            style={{ borderRight: `1.5px solid ${colors.utility.primaryText}15` }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold text-white mb-4"
              style={{ backgroundColor: tealPill }}
            >
              <Clock className="w-3.5 h-3.5" />
              How it works
            </div>

            {howItWorksSteps.map((step, i) => (
              <div
                key={step.num}
                className="pill-card relative overflow-hidden rounded-xl border p-4 cursor-pointer"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}12`,
                  marginBottom: i < howItWorksSteps.length - 1 ? 10 : 0,
                }}
                onClick={() => navigate(step.path)}
              >
                {/* Left accent bar */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
                  style={{ backgroundColor: step.accentColor }}
                />

                {/* Step row */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span
                    className="w-[22px] h-[22px] rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: step.numColor }}
                  >
                    {step.num}
                  </span>
                  <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: step.iconBg }}
                  >
                    {step.num === 1 && <LayoutGrid className="w-[15px] h-[15px]" style={{ color: step.iconStroke }} />}
                    {step.num === 2 && <FileText className="w-[15px] h-[15px]" style={{ color: step.iconStroke }} />}
                    {step.num === 3 && <Gauge className="w-[15px] h-[15px]" style={{ color: step.iconStroke }} />}
                  </div>
                  <h3 className="text-[13px] font-bold flex-1" style={{ color: colors.utility.primaryText }}>
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
                <p className="text-[11px] leading-snug pl-8 mb-1.5" style={{ color: colors.utility.secondaryText }}>
                  {step.desc}
                </p>

                {/* CTA link */}
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold pl-8"
                  style={{ color: colors.brand.primary }}
                >
                  {step.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="pl-6 flex flex-col">

            {/* RIGHT TOP: Equipment */}
            <div
              className="flex-1 pb-5"
              style={{ borderBottom: `1.5px solid ${colors.utility.primaryText}15` }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold text-white mb-4"
                style={{ backgroundColor: tealPill }}
              >
                <Wrench className="w-3.5 h-3.5" />
                What are you maintaining today
              </div>

              <div className="grid grid-cols-4 gap-2">
                {equipmentItems.map((item) => (
                  <div
                    key={item.title}
                    className="dash-hover rounded-[10px] border py-2.5 px-1.5 text-center cursor-pointer"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}12`,
                    }}
                    onClick={() => navigate('/contracts')}
                  >
                    <span className="text-[26px] block mb-0.5">{item.emoji}</span>
                    <h4 className="text-[10px] font-bold leading-tight" style={{ color: colors.utility.primaryText }}>
                      {item.title}
                    </h4>
                    <p className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT BOTTOM: Operations & Industry */}
            <div className="flex-1 pt-5">
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold text-white mb-4"
                style={{ backgroundColor: tealPill }}
              >
                <Building2 className="w-3.5 h-3.5" />
                Operations & Industry
              </div>

              <div className="grid grid-cols-4 gap-2">
                {operationsItems.map((item) => (
                  <div
                    key={item.title}
                    className="dash-hover rounded-[10px] border py-2.5 px-1.5 text-center cursor-pointer"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}12`,
                    }}
                    onClick={() => navigate('/contracts')}
                  >
                    <span className="text-[26px] block mb-0.5">{item.emoji}</span>
                    <h4 className="text-[10px] font-bold leading-tight" style={{ color: colors.utility.primaryText }}>
                      {item.title}
                    </h4>
                    <p className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                      {item.sub}
                    </p>
                  </div>
                ))}
                {/* +Any card */}
                <div
                  className="dash-hover rounded-[10px] border py-2.5 px-1.5 text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: `${colors.brand.primary}08`,
                    borderColor: `${colors.brand.primary}30`,
                    borderStyle: 'dashed',
                    borderWidth: '1.5px',
                  }}
                  onClick={() => navigate('/contracts')}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center mb-0.5"
                    style={{ backgroundColor: `${colors.brand.primary}15` }}
                  >
                    <Plus className="w-[13px] h-[13px]" style={{ color: colors.brand.primary }} />
                  </div>
                  <h4 className="text-[10px] font-bold" style={{ color: colors.brand.primary }}>
                    Any
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VALUE STRIP ═══ */}
        <div
          className="rounded-xl px-5 py-4 mb-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b 60%, #334155)' }}
        >
          <div
            className="absolute -top-4 -right-4 w-[90px] h-[90px] rounded-full"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          />
          <div className="relative z-10 flex items-center gap-4 flex-wrap">
            <div className="min-w-[180px]">
              <h3 className="text-[13px] font-bold text-white">Every contract includes</h3>
              <p className="text-[10px] text-slate-400">Service commitments both sides trust</p>
            </div>
            <div className="flex gap-4 flex-wrap flex-1">
              {valueFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}
                  >
                    <Check className="w-[9px] h-[9px] text-emerald-400" />
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="w-[15px] h-[15px]" style={{ color: colors.brand.primary }} />
            <span className="text-[13px] font-bold" style={{ color: colors.utility.primaryText }}>
              Quick actions
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="dash-hover rounded-xl border p-3 cursor-pointer"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}12`,
                }}
                onClick={() => navigate(action.path)}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                  style={{ backgroundColor: action.iconBg }}
                >
                  <action.Icon className="w-3.5 h-3.5" style={{ color: action.iconColor }} />
                </div>
                <h3 className="text-[11px] font-bold mb-0.5" style={{ color: colors.utility.primaryText }}>
                  {action.title}
                </h3>
                <p className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                  {action.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ WHATSAPP STRIP ═══ */}
        <div
          className="rounded-xl border px-4 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:border-green-300 transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}12`,
          }}
          onClick={() => navigate('/settings/configure/customer-channels/groups')}
        >
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded-md bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-[13px] h-[13px] text-green-600" />
            </div>
            <h4 className="text-[11px] font-semibold" style={{ color: colors.utility.primaryText }}>
              Discoverable via WhatsApp AI Bot
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-green-600 flex items-center gap-1">
            Configure <ArrowRight className="w-3 h-3" />
          </span>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

// src/components/catalog-studio/BlockWizard/steps/service/DeliveryStep.tsx
import React, { useState } from 'react';
import { MapPin, Video, Users, RefreshCw, Lightbulb, CheckCircle2, Clock, Bell } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface DeliveryStepProps {
  formData: {
    deliveryMode?: 'on-site' | 'virtual' | 'hybrid';
    serviceArea?: string;
    requiresScheduling?: boolean;
    schedulingBuffer?: number;
    maxDistance?: number;
    allowReschedule?: boolean;
    // Cycle fields
    requiresCycles?: boolean;
    cycleDays?: number;
    cycleGracePeriod?: number;
    // Optional day-of-week anchor: occurrences snap to this weekday (0=Sun..6=Sat)
    // at a whole-week interval instead of drifting off a raw day count.
    cycleAnchorWeekday?: number;
    // Billing-only: bills on its cycle, generates no service events/visits
    billingOnly?: boolean;
    // Complimentary: free — no price, no billing events; still delivers its
    // service/session occurrences. Opposite of billing-only.
    complimentary?: boolean;
    // Audience: who receives each cycle — the contract's buyer (individual/1:1)
    // or a group that checks in (group/1:N). The engine branches on this field.
    audience?: 'individual' | 'group';
    // Group Session attendance policy — how many no-shows / substitute
    // check-ins a member is allowed before the roster flags them. Becomes
    // part of every member's own contract (config snapshots onto
    // t_contract_blocks.custom_fields at signing) — a real T&C, not a
    // dashboard toggle. Undefined/blank = no cap.
    maxNoShows?: number;
    maxSubstitutes?: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [deliveryMode, setDeliveryMode] = useState(formData.deliveryMode || 'on-site');
  const [requiresCycles, setRequiresCycles] = useState<boolean>(
    // top-level (wizard edits) with meta fallback (editing an existing block
    // whose cadence lives under meta.serviceCycles)
    formData.requiresCycles ??
      ((formData as { meta?: { serviceCycles?: { enabled?: boolean; days?: number } } }).meta?.serviceCycles?.enabled
        ?? Boolean((formData as { meta?: { serviceCycles?: { days?: number } } }).meta?.serviceCycles?.days))
  );
  const [billingOnly, setBillingOnly] = useState(
    // top-level (wizard edits) with meta fallback (editing an existing block)
    formData.billingOnly ?? (formData as { meta?: { billingOnly?: boolean } }).meta?.billingOnly ?? false
  );
  const [complimentary, setComplimentary] = useState(
    formData.complimentary ?? (formData as { meta?: { complimentary?: boolean } }).meta?.complimentary ?? false
  );
  const [audience, setAudience] = useState<'individual' | 'group'>(
    formData.audience ?? (formData as { meta?: { audience?: 'individual' | 'group' } }).meta?.audience ?? 'individual'
  );

  const handleBillingOnlyToggle = (enabled: boolean) => {
    setBillingOnly(enabled);
    onChange('billingOnly', enabled);
    // Billing-only and Complimentary are opposites — never both on.
    if (enabled && complimentary) { setComplimentary(false); onChange('complimentary', false); }
  };

  const handleComplimentaryToggle = (enabled: boolean) => {
    setComplimentary(enabled);
    onChange('complimentary', enabled);
    if (enabled && billingOnly) { setBillingOnly(false); onChange('billingOnly', false); }
  };

  const handleAudienceChange = (value: 'individual' | 'group') => {
    setAudience(value);
    onChange('audience', value);
  };

  const handleModeChange = (mode: 'on-site' | 'virtual' | 'hybrid') => {
    setDeliveryMode(mode);
    onChange('deliveryMode', mode);
  };

  const handleCyclesToggle = (enabled: boolean) => {
    setRequiresCycles(enabled);
    onChange('requiresCycles', enabled);
    // Reset cycle fields if disabled
    if (!enabled) {
      onChange('cycleDays', undefined);
      onChange('cycleGracePeriod', undefined);
    }
  };

  // Common card style - clean white background
  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  };

  // Input style for white background
  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const deliveryOptions = [
    { id: 'on-site', icon: MapPin, label: 'On-Site', description: 'At customer location' },
    { id: 'virtual', icon: Video, label: 'Virtual', description: 'Video call / Remote' },
    { id: 'hybrid', icon: Users, label: 'Hybrid', description: 'Both options available' },
  ];

  // Sample timeline — the first few occurrences from *today*, using the same
  // anchor logic as real generation, so users can see how the cadence lands.
  const anchorForSample =
    formData.cycleAnchorWeekday ??
    (formData as { meta?: { serviceCycles?: { anchorWeekday?: number } } }).meta?.serviceCycles?.anchorWeekday;
  // Cycle Period hydrates from the top-level wizard field, falling back to an
  // existing block's meta.serviceCycles.days (edit mode) — same pattern as the
  // anchor above, so a saved cadence shows instead of a blank field.
  const cycleDaysForDisplay =
    formData.cycleDays ??
    (formData as { meta?: { serviceCycles?: { days?: number } } }).meta?.serviceCycles?.days;
  // Attendance policy — hydrates from the top-level wizard field, falling
  // back to an existing block's meta (edit mode), same pattern as above.
  const maxNoShowsForDisplay =
    formData.maxNoShows ??
    (formData as { meta?: { maxNoShows?: number } }).meta?.maxNoShows;
  const maxSubstitutesForDisplay =
    formData.maxSubstitutes ??
    (formData as { meta?: { maxSubstitutes?: number } }).meta?.maxSubstitutes;
  const sampleDates = React.useMemo(() => {
    const days = cycleDaysForDisplay;
    if (!requiresCycles || !days || days < 1) return [] as Date[];
    const hasAnchor = typeof anchorForSample === 'number' && anchorForSample >= 0 && anchorForSample <= 6;
    const addD = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let first = start;
    if (hasAnchor) {
      const diff = (((anchorForSample as number) - start.getDay()) % 7 + 7) % 7;
      first = addD(start, diff);
    }
    const everyNWeeks = Math.max(1, Math.round(days / 7));
    const out: Date[] = [];
    for (let i = 0; i < 6; i++) out.push(hasAnchor ? addD(first, i * everyNWeeks * 7) : addD(start, i * days));
    return out;
  }, [requiresCycles, cycleDaysForDisplay, anchorForSample]);
  const fmtSample = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Delivery Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this service will be delivered to customers.
      </p>

      <div className="space-y-6">
        {/* Audience — who receives each cycle. Individual (1:1, the buyer) or
            Group (1:N, a roster that checks in). Group Session presets this. */}
        <div className="p-6 rounded-xl border" style={cardStyle}>
          <label className="block text-sm font-semibold mb-1" style={labelStyle}>
            Who attends each cycle?
          </label>
          <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
            <strong>Individual</strong> — delivered to the one buyer on the contract (a visit).{' '}
            <strong>Group</strong> — one shared occurrence that many people check into (a meeting, class or session).
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'individual', icon: MapPin, label: 'Individual', desc: '1:1 — the buyer' },
              { id: 'group', icon: Users, label: 'Group', desc: '1:N — a roster checks in' },
            ] as const).map((opt) => {
              const IconComp = opt.icon;
              const isSelected = audience === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleAudienceChange(opt.id)}
                  className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all hover:shadow-md"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}08` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                  }}
                >
                  <div
                    className="w-11 h-11 mx-auto mb-2 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: isSelected ? colors.brand.primary : `${colors.brand.primary}15` }}
                  >
                    <IconComp className="w-5 h-5" style={{ color: isSelected ? '#FFFFFF' : colors.brand.primary }} />
                  </div>
                  <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{opt.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>{opt.desc}</div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 mx-auto mt-2" style={{ color: colors.brand.primary }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance policy — Group Session only. How many no-shows / substitute
            check-ins a member is allowed before the roster flags them. This
            becomes part of every member's own contract (config snapshots onto
            the contract at signing), not a live dashboard setting. */}
        {audience === 'group' && (
          <div className="p-6 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200" style={cardStyle}>
            <label className="block text-sm font-semibold mb-1" style={labelStyle}>
              Attendance policy
            </label>
            <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
              How many no-shows and substitute check-ins a member may have before the roster flags them.
              This becomes part of each member&apos;s own contract when they join — leave blank for no cap.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={labelStyle}>Max no-shows allowed</label>
                <input
                  type="number"
                  min="0"
                  placeholder="No cap"
                  value={maxNoShowsForDisplay ?? ''}
                  onChange={(e) => onChange('maxNoShows', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ ...inputStyle, borderRadius: '0.75rem' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={labelStyle}>Max substitute check-ins allowed</label>
                <input
                  type="number"
                  min="0"
                  placeholder="No cap"
                  value={maxSubstitutesForDisplay ?? ''}
                  onChange={(e) => onChange('maxSubstitutes', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ ...inputStyle, borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Billing-only toggle — fees/dues blocks that never create service visits */}
        <div className="p-6 rounded-xl border" style={cardStyle}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1" style={labelStyle}>
                Billing only (fees / dues)
              </label>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                This block bills on its cycle — e.g. a membership fee or maintenance dues —
                but creates <strong>no service visits or service events</strong> on contracts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={billingOnly}
                onChange={(e) => handleBillingOnlyToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors"
                style={{ backgroundColor: billingOnly ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#D1D5DB') }}
              />
            </label>
          </div>
        </div>

        {/* Complimentary toggle — free blocks: no price, no billing, still delivered */}
        <div className="p-6 rounded-xl border" style={cardStyle}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1" style={labelStyle}>
                Complimentary (free)
              </label>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                This block is free — <strong>no price is asked and it never bills</strong>. It still delivers
                its service/session occurrences (e.g. a group meeting, a free consultation, an included part).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={complimentary}
                onChange={(e) => handleComplimentaryToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors"
                style={{ backgroundColor: complimentary ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#D1D5DB') }}
              />
            </label>
          </div>
        </div>

        {/* Delivery Mode Selection */}
        <div
          className="p-6 rounded-xl border"
          style={cardStyle}
        >
          <label className="block text-sm font-semibold mb-4" style={labelStyle}>
            How is this service delivered? <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {deliveryOptions.map((option) => {
              const IconComp = option.icon;
              const isSelected = deliveryMode === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => handleModeChange(option.id as 'on-site' | 'virtual' | 'hybrid')}
                  className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all hover:shadow-md"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}08` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <div
                    className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? colors.brand.primary : `${colors.brand.primary}15`,
                    }}
                  >
                    <IconComp
                      className="w-6 h-6"
                      style={{ color: isSelected ? '#FFFFFF' : colors.brand.primary }}
                    />
                  </div>
                  <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                  <div className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
                  {isSelected && (
                    <CheckCircle2
                      className="w-5 h-5 mx-auto mt-2"
                      style={{ color: colors.brand.primary }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* On-Site Settings - HIDDEN FOR NOW */}
        {/*
        {(deliveryMode === 'on-site' || deliveryMode === 'hybrid') && (
          <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <MapPin className="w-4 h-4" /> On-Site Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Service Area</label>
                <select
                  defaultValue={formData.serviceArea || 'city'}
                  onChange={(e) => onChange('serviceArea', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="local">Local (within 10km)</option>
                  <option value="city">City-wide</option>
                  <option value="region">Regional</option>
                  <option value="national">National</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Max Distance (km)</label>
                <input
                  type="number"
                  defaultValue={formData.maxDistance || 25}
                  onChange={(e) => onChange('maxDistance', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded focus:ring-2"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Capture GPS location at service start
              </span>
            </label>
          </div>
        )}
        */}

        {/* Virtual Settings - HIDDEN FOR NOW */}
        {/*
        {(deliveryMode === 'virtual' || deliveryMode === 'hybrid') && (
          <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: `${colors.semantic.info}10` }}>
            <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <Video className="w-4 h-4" /> Virtual Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Meeting Platform</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="zoom">Zoom</option>
                  <option value="meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="internal">In-app Video</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Auto-create Link</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="yes">Yes, auto-generate</option>
                  <option value="no">No, manual entry</option>
                </select>
              </div>
            </div>
          </div>
        )}
        */}

        {/* Scheduling Options - HIDDEN FOR NOW */}
        {/*
        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Scheduling Options
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={formData.requiresScheduling !== false}
                onChange={(e) => onChange('requiresScheduling', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Requires appointment scheduling
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={formData.allowReschedule !== false}
                onChange={(e) => onChange('allowReschedule', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Allow customer rescheduling
              </span>
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Minimum Notice Period</label>
              <select
                defaultValue={formData.schedulingBuffer || 24}
                onChange={(e) => onChange('schedulingBuffer', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="0">No minimum</option>
                <option value="2">2 hours</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Available Days</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="weekdays">Weekdays only</option>
                <option value="all">All days</option>
                <option value="custom">Custom schedule</option>
              </select>
            </div>
          </div>
        </div>
        */}

        {/* Service Cycles Section - TWO COLUMN LAYOUT */}
        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left Column (3/5) - Toggle and Configuration */}
            <div className="lg:col-span-3 space-y-5">
              {/* Cycles Toggle Card */}
              <div
                className="p-6 rounded-xl border"
                style={cardStyle}
              >
                <h4 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <RefreshCw className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  Service Cycles
                </h4>

                <label className="block text-sm font-medium mb-3" style={labelStyle}>
                  Does this service require Cycles?
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleCyclesToggle(true)}
                    className="flex-1 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-md"
                    style={{
                      backgroundColor: requiresCycles ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                      borderColor: requiresCycles ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      color: requiresCycles ? '#FFFFFF' : colors.utility.primaryText
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Yes
                    {requiresCycles && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCyclesToggle(false)}
                    className="flex-1 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-md"
                    style={{
                      backgroundColor: !requiresCycles ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                      borderColor: !requiresCycles ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      color: !requiresCycles ? '#FFFFFF' : colors.utility.primaryText
                    }}
                  >
                    No
                    {!requiresCycles && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cycle Configuration - shown when Yes is selected */}
              {requiresCycles && (
                <div
                  className="p-6 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200"
                  style={cardStyle}
                >
                  <h4 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                    <Clock className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    Cycle Configuration
                  </h4>

                  <div className="space-y-5">
                    {/* Cycle Period */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={labelStyle}>
                        Cycle Period <span style={{ color: colors.semantic.error }}>*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g., 180"
                          value={cycleDaysForDisplay ?? ''}
                          onChange={(e) => onChange('cycleDays', parseInt(e.target.value) || undefined)}
                          className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{
                            ...inputStyle,
                            borderRadius: '0.75rem'
                          }}
                        />
                        <span
                          className="px-4 py-3 rounded-xl text-sm font-medium flex items-center"
                          style={{
                            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB',
                            color: colors.utility.secondaryText
                          }}
                        >
                          days
                        </span>
                      </div>
                      <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
                        How often should this service be repeated?
                      </p>
                    </div>

                    {/* Day-of-week anchor — keeps occurrences on a fixed weekday */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={labelStyle}>
                        Repeat on a fixed weekday?
                      </label>
                      <select
                        value={
                          formData.cycleAnchorWeekday ??
                          (formData as { meta?: { serviceCycles?: { anchorWeekday?: number } } }).meta?.serviceCycles?.anchorWeekday ??
                          ''
                        }
                        onChange={(e) =>
                          onChange('cycleAnchorWeekday', e.target.value === '' ? undefined : parseInt(e.target.value))
                        }
                        className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ ...inputStyle, borderRadius: '0.75rem' }}
                      >
                        <option value="">No — space by the interval above</option>
                        <option value="0">Every Sunday</option>
                        <option value="1">Every Monday</option>
                        <option value="2">Every Tuesday</option>
                        <option value="3">Every Wednesday</option>
                        <option value="4">Every Thursday</option>
                        <option value="5">Every Friday</option>
                        <option value="6">Every Saturday</option>
                      </select>
                      <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
                        When set, occurrences snap to this weekday (e.g. a 14-day cycle → alternate Saturdays)
                        instead of drifting.
                      </p>
                    </div>

                    {/* Grace Period */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={labelStyle}>
                        Grace Period
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g., 7"
                          value={formData.cycleGracePeriod || ''}
                          onChange={(e) => onChange('cycleGracePeriod', parseInt(e.target.value) || undefined)}
                          className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{
                            ...inputStyle,
                            borderRadius: '0.75rem'
                          }}
                        />
                        <span
                          className="px-4 py-3 rounded-xl text-sm font-medium flex items-center"
                          style={{
                            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB',
                            color: colors.utility.secondaryText
                          }}
                        >
                          days
                        </span>
                      </div>
                      <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
                        Buffer time before marking as overdue
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample timeline — how the cadence lands (from today) */}
              {requiresCycles && sampleDates.length > 0 && (
                <div className="p-6 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200" style={cardStyle}>
                  <h4 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    Sample schedule
                  </h4>
                  <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
                    First {sampleDates.length} occurrences from today
                    {typeof anchorForSample === 'number'
                      ? ` — snapped to every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][anchorForSample]}`
                      : ` — every ${formData.cycleDays} days`}.
                    Real dates use the contract's start date.
                  </p>
                  <div className="flex flex-col gap-0">
                    {sampleDates.map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
                          {i < sampleDates.length - 1 && (
                            <div className="w-px h-6" style={{ backgroundColor: `${colors.brand.primary}40` }} />
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 pb-1">
                          <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                            {fmtSample(d)}
                          </span>
                          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            occurrence {i + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 flex justify-center">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>⋯</span>
                      </div>
                      <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>continues for the full duration</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (2/5) - Explanation Card */}
            <div className="lg:col-span-2">
              <div
                className="p-6 rounded-xl border h-full"
                style={{
                  backgroundColor: isDarkMode ? `${colors.brand.primary}10` : '#EEF2FF',
                  borderColor: isDarkMode ? `${colors.brand.primary}30` : '#C7D2FE'
                }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{
                      backgroundColor: isDarkMode ? colors.brand.primary : '#4F46E5',
                    }}
                  >
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base" style={{ color: isDarkMode ? colors.utility.primaryText : '#312E81' }}>
                      What is a Service Cycle?
                    </h4>
                  </div>
                </div>

                <div className="space-y-4 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#4338CA' }}>
                  <p>
                    Some services need to be repeated at regular intervals. This includes:
                  </p>

                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#4F46E5' }} />
                      <span><strong>Routine check-ups</strong> — Health screenings, dental visits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#4F46E5' }} />
                      <span><strong>Equipment calibration</strong> — Testing & certification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#4F46E5' }} />
                      <span><strong>Periodic maintenance</strong> — Servicing, cleaning, repairs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#4F46E5' }} />
                      <span><strong>Refills</strong> — Supplies, consumables, fluids</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#4F46E5' }} />
                      <span><strong>Follow-up consultations</strong> — Reviews, assessments</span>
                    </li>
                  </ul>
                </div>

                <div
                  className="mt-5 p-4 rounded-xl"
                  style={{
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4" style={{ color: isDarkMode ? colors.brand.primary : '#4F46E5' }} />
                    <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#312E81' }}>
                      Benefits
                    </span>
                  </div>
                  <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#4338CA' }}>
                    <li>• Automatically remind customers when service is due</li>
                    <li>• Trigger proactive outreach for renewals</li>
                    <li>• Track service history effectively</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStep;

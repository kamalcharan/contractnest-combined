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
  };
  onChange: (field: string, value: unknown) => void;
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [deliveryMode, setDeliveryMode] = useState(formData.deliveryMode || 'on-site');
  const [requiresCycles, setRequiresCycles] = useState(formData.requiresCycles || false);

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

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Delivery Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this service will be delivered to customers.
      </p>

      <div className="space-y-6">
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
                          value={formData.cycleDays || ''}
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

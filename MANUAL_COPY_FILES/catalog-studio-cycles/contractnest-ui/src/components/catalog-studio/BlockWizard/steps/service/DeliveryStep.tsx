// src/components/catalog-studio/BlockWizard/steps/service/DeliveryStep.tsx
import React, { useState } from 'react';
import { MapPin, Video, Users, RefreshCw, Lightbulb } from 'lucide-react';
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

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
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
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>
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
                  className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <IconComp className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
                  <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
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

        {/* Service Cycles Section */}
        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>

          {/* Explanation Card */}
          <div
            className="p-4 rounded-lg flex gap-3 mb-6"
            style={{ backgroundColor: `${colors.semantic.info}15` }}
          >
            <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />
            <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
              <strong className="block mb-1">What is a Service Cycle?</strong>
              <p className="mb-2" style={{ color: colors.utility.secondaryText }}>
                Some services need to be repeated at regular intervals — whether it's a <strong>routine check-up</strong>, <strong>equipment calibration</strong>, <strong>periodic maintenance</strong>, <strong>refill</strong>, or <strong>follow-up consultation</strong>.
              </p>
              <p style={{ color: colors.utility.secondaryText }}>
                Setting a cycle period helps you automatically remind customers when service is due, trigger proactive outreach for renewals, and track service history.
              </p>
            </div>
          </div>

          {/* Cycles Toggle */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-3" style={labelStyle}>
              Does this service require Cycles?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleCyclesToggle(true)}
                className="px-6 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2"
                style={{
                  backgroundColor: requiresCycles ? `${colors.brand.primary}10` : 'transparent',
                  borderColor: requiresCycles ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                  color: requiresCycles ? colors.brand.primary : colors.utility.primaryText
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleCyclesToggle(false)}
                className="px-6 py-2.5 rounded-lg border-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: !requiresCycles ? `${colors.brand.primary}10` : 'transparent',
                  borderColor: !requiresCycles ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                  color: !requiresCycles ? colors.brand.primary : colors.utility.primaryText
                }}
              >
                No
              </button>
            </div>
          </div>

          {/* Cycle Configuration - shown when Yes is selected */}
          {requiresCycles && (
            <div
              className="p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
              style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
            >
              <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                <RefreshCw className="w-4 h-4" style={{ color: colors.brand.primary }} />
                Cycle Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Cycle Period <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g., 180"
                      value={formData.cycleDays || ''}
                      onChange={(e) => onChange('cycleDays', parseInt(e.target.value) || undefined)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    />
                    <span
                      className="px-3 py-2 rounded-lg text-sm flex items-center"
                      style={{
                        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB',
                        color: colors.utility.secondaryText
                      }}
                    >
                      days
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    How often should this service be repeated?
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Grace Period
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g., 7"
                      value={formData.cycleGracePeriod || ''}
                      onChange={(e) => onChange('cycleGracePeriod', parseInt(e.target.value) || undefined)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    />
                    <span
                      className="px-3 py-2 rounded-lg text-sm flex items-center"
                      style={{
                        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB',
                        color: colors.utility.secondaryText
                      }}
                    >
                      days
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    Buffer time before marking as overdue
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryStep;

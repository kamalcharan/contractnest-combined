// src/components/catalog-studio/BlockWizard/steps/service/DeliveryStep.tsx
import React, { useState } from 'react';
import { MapPin, Video, Users } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface DeliveryStepProps {
  formData: {
    deliveryMode?: 'on-site' | 'virtual' | 'hybrid';
    serviceArea?: string;
    requiresScheduling?: boolean;
    schedulingBuffer?: number;
    maxDistance?: number;
    allowReschedule?: boolean;
  };
  onChange: (field: string, value: unknown) => void;
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [deliveryMode, setDeliveryMode] = useState(formData.deliveryMode || 'on-site');

  const handleModeChange = (mode: 'on-site' | 'virtual' | 'hybrid') => {
    setDeliveryMode(mode);
    onChange('deliveryMode', mode);
  };

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
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
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
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
      </div>
    </div>
  );
};

export default DeliveryStep;

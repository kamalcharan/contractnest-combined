// src/components/catalog-studio/BlockWizard/steps/service/EvidenceStep.tsx
// Updated: Show only Upload Form, OTP Confirmation, Service Form
// Two-column layout with explanation card

import React, { useState } from 'react';
import {
  Upload,
  Shield,
  FileText,
  Check,
  Lightbulb,
  CheckCircle2,
  ClipboardList,
  Info,
  ChevronDown,
  // Hidden icons (preserved for future use)
  // Camera,
  // Pen,
  // MapPin,
  // Clock,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface EvidenceConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  when?: 'before' | 'during' | 'after' | 'any';
  required?: boolean;
  hasDropdown?: boolean;
  dropdownValue?: string;
}

interface EvidenceStepProps {
  formData: {
    evidenceRequired?: boolean;
    evidenceTypes?: string[];
    selectedServiceForm?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

// Mock service forms - in production, this would come from an API
const availableServiceForms = [
  { id: 'form-1', name: 'General Service Report' },
  { id: 'form-2', name: 'Maintenance Checklist' },
  { id: 'form-3', name: 'Installation Verification' },
  { id: 'form-4', name: 'Quality Inspection Form' },
  { id: 'form-5', name: 'Customer Feedback Form' },
];

const EvidenceStep: React.FC<EvidenceStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Only show: Upload Form, OTP Confirmation, Service Form
  const [evidenceItems, setEvidenceItems] = useState<EvidenceConfig[]>([
    {
      id: 'upload-form',
      name: 'Upload Form',
      icon: <Upload className="w-5 h-5" />,
      description: 'Allow technician to upload documents or forms',
      enabled: false,
      when: 'after',
      required: false,
    },
    {
      id: 'otp',
      name: 'OTP Confirmation',
      icon: <Shield className="w-5 h-5" />,
      description: 'Customer OTP verification for service confirmation',
      enabled: false,
      when: 'after',
      required: false,
    },
    {
      id: 'service-form',
      name: 'Service Form',
      icon: <ClipboardList className="w-5 h-5" />,
      description: 'Fill a structured form during or after service',
      enabled: false,
      when: 'after',
      required: false,
      hasDropdown: true,
      dropdownValue: '',
    },
  ]);

  // HIDDEN: Original evidence items (preserved for future use)
  /*
  const hiddenEvidenceItems = [
    { id: 'photo-before', name: 'Before Photo', icon: <Camera className="w-5 h-5" />, description: 'Capture photo before starting service', enabled: true, when: 'before', required: true },
    { id: 'photo-after', name: 'After Photo', icon: <Camera className="w-5 h-5" />, description: 'Capture photo after completion', enabled: true, when: 'after', required: true },
    { id: 'signature', name: 'Customer Signature', icon: <Pen className="w-5 h-5" />, description: 'Digital signature for confirmation', enabled: true, when: 'after', required: true },
    { id: 'gps', name: 'GPS Location', icon: <MapPin className="w-5 h-5" />, description: 'Auto-capture service location', enabled: false, when: 'before', required: false },
    { id: 'timestamp', name: 'Time Tracking', icon: <Clock className="w-5 h-5" />, description: 'Record start and end time', enabled: true, when: 'any', required: true },
    { id: 'report', name: 'Service Report', icon: <FileText className="w-5 h-5" />, description: 'Generate detailed work report', enabled: false, when: 'after', required: false },
  ];
  */

  const [selectedForm, setSelectedForm] = useState<string>(formData.selectedServiceForm || '');

  const toggleEvidence = (id: string) => {
    const updated = evidenceItems.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setEvidenceItems(updated);
    onChange('evidenceTypes', updated.filter((i) => i.enabled).map((i) => i.id));
  };

  const toggleRequired = (id: string) => {
    const updated = evidenceItems.map((item) =>
      item.id === id ? { ...item, required: !item.required } : item
    );
    setEvidenceItems(updated);
  };

  const handleFormSelect = (formId: string) => {
    setSelectedForm(formId);
    onChange('selectedServiceForm', formId);
    // Also enable the service-form evidence type when a form is selected
    if (formId && !evidenceItems.find(i => i.id === 'service-form')?.enabled) {
      toggleEvidence('service-form');
    }
  };

  const enabledCount = evidenceItems.filter((i) => i.enabled).length;

  // Styles
  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Evidence Collection
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure what proof of service completion is required.
      </p>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) - Evidence Options */}
        <div className="lg:col-span-3 space-y-5">
          {/* Summary Card */}
          <div
            className="p-5 rounded-xl border"
            style={cardStyle}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-base" style={{ color: colors.utility.primaryText }}>
                    Evidence Collection
                  </div>
                  <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    {enabledCount} evidence type{enabledCount !== 1 ? 's' : ''} enabled
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.evidenceRequired !== false}
                  onChange={(e) => onChange('evidenceRequired', e.target.checked)}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: colors.brand.primary }}
                />
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Required
                </span>
              </label>
            </div>
          </div>

          {/* Evidence Type Cards */}
          <div className="space-y-4">
            {evidenceItems.map((item) => {
              const isEnabled = item.enabled;

              return (
                <div
                  key={item.id}
                  className="p-5 border-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: isEnabled
                      ? `${colors.brand.primary}08`
                      : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isEnabled
                      ? colors.brand.primary
                      : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                    boxShadow: isEnabled
                      ? `0 0 0 1px ${colors.brand.primary}20`
                      : (isDarkMode ? 'none' : '0 1px 2px 0 rgb(0 0 0 / 0.05)')
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isEnabled ? colors.brand.primary : `${colors.brand.primary}15`,
                      }}
                    >
                      <div style={{ color: isEnabled ? '#FFFFFF' : colors.brand.primary }}>
                        {item.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                          {item.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleEvidence(item.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            backgroundColor: isEnabled ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#E5E7EB'),
                            color: isEnabled ? '#FFFFFF' : colors.utility.secondaryText
                          }}
                        >
                          {isEnabled && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                        {item.description}
                      </div>

                      {/* Expanded Options when enabled */}
                      {isEnabled && (
                        <div
                          className="mt-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-200"
                          style={{ borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB' }}
                        >
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* When dropdown */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                                When:
                              </span>
                              <select
                                value={item.when}
                                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2"
                                style={inputStyle}
                              >
                                <option value="before">Before service</option>
                                <option value="during">During service</option>
                                <option value="after">After service</option>
                                <option value="any">Any time</option>
                              </select>
                            </div>

                            {/* Required toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.required}
                                onChange={() => toggleRequired(item.id)}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: colors.brand.primary }}
                              />
                              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                                Required
                              </span>
                            </label>
                          </div>

                          {/* Service Form Dropdown - Only for service-form type */}
                          {item.id === 'service-form' && (
                            <div className="mt-4">
                              <label
                                className="block text-sm font-medium mb-2"
                                style={{ color: colors.utility.primaryText }}
                              >
                                Select Form <span style={{ color: colors.semantic.error }}>*</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={selectedForm}
                                  onChange={(e) => handleFormSelect(e.target.value)}
                                  className="w-full px-4 py-3 border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 pr-10"
                                  style={inputStyle}
                                >
                                  <option value="">Choose a form...</option>
                                  {availableServiceForms.map((form) => (
                                    <option key={form.id} value={form.id}>
                                      {form.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                                  style={{ color: colors.utility.secondaryText }}
                                />
                              </div>
                              {selectedForm && (
                                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: colors.semantic.success }}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Form selected: {availableServiceForms.find(f => f.id === selectedForm)?.name}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* HIDDEN: Photo Settings Section */}
          {/*
          <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Photo Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.utility.primaryText }}>Min Photos Required</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="1">At least 1</option>
                  <option value="2">At least 2</option>
                  <option value="3">At least 3</option>
                  <option value="5">At least 5</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.utility.primaryText }}>Photo Quality</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="standard">Standard</option>
                  <option value="high">High Resolution</option>
                  <option value="compressed">Compressed</option>
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Add timestamp watermark to photos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Add location watermark to photos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Allow photo from gallery (not just camera)</span>
              </label>
            </div>
          </div>
          */}
        </div>

        {/* Right Column (2/5) - Explanation Card */}
        <div className="lg:col-span-2">
          <div
            className="p-6 rounded-xl border h-full"
            style={{
              backgroundColor: isDarkMode ? `${colors.semantic.info}10` : '#EFF6FF',
              borderColor: isDarkMode ? `${colors.semantic.info}30` : '#BFDBFE'
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: isDarkMode ? colors.semantic.info : '#2563EB',
                }}
              >
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-base" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E3A8A' }}>
                  Evidence Types Explained
                </h4>
              </div>
            </div>

            <div className="space-y-4 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#1D4ED8' }}>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Upload className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                  <div>
                    <strong>Upload Form</strong>
                    <p className="text-xs mt-0.5 opacity-80">
                      Technicians can upload documents, photos, or files as proof of service completion
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                  <div>
                    <strong>OTP Confirmation</strong>
                    <p className="text-xs mt-0.5 opacity-80">
                      Customer receives an OTP to verify service start or completion. Adds accountability.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ClipboardList className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                  <div>
                    <strong>Service Form</strong>
                    <p className="text-xs mt-0.5 opacity-80">
                      A structured form that technicians fill during service. Great for checklists and inspections.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="mt-5 p-4 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E3A8A' }}>
                  Why Evidence Matters
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#1D4ED8' }}>
                <li>• Builds trust with customers</li>
                <li>• Provides proof for disputes</li>
                <li>• Ensures quality compliance</li>
                <li>• Creates audit trail for records</li>
              </ul>
            </div>

            <div
              className="mt-4 p-4 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.info : '#2563EB' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E3A8A' }}>
                  Best Practices
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#1D4ED8' }}>
                <li>• Use OTP for high-value services</li>
                <li>• Service forms work great for inspections</li>
                <li>• Upload forms for documentation needs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceStep;

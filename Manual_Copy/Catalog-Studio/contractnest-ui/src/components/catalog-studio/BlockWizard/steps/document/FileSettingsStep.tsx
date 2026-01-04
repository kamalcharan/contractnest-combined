// src/components/catalog-studio/BlockWizard/steps/document/FileSettingsStep.tsx
import React from 'react';
import { FileText, Upload, Shield, Download, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface FileSettingsStepProps {
  formData: {
    fileType?: 'upload' | 'request';
    allowedFormats?: string[];
    maxFileSize?: number;
    required?: boolean;
    multipleFiles?: boolean;
    templateUrl?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const FileSettingsStep: React.FC<FileSettingsStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const fileFormats = [
    { id: 'pdf', label: 'PDF', icon: '📄' },
    { id: 'doc', label: 'DOC/DOCX', icon: '📝' },
    { id: 'xls', label: 'XLS/XLSX', icon: '📊' },
    { id: 'img', label: 'Images', icon: '🖼️' },
    { id: 'any', label: 'Any File', icon: '📎' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        File Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure document upload requirements.
      </p>

      <div className="space-y-6">
        {/* Document Type */}
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>Document Type</label>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => onChange('fileType', 'upload')}
              className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
              style={{
                backgroundColor: (formData.fileType || 'upload') === 'upload' ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                borderColor: (formData.fileType || 'upload') === 'upload' ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
              <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Upload Template</div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Provide a document for download</div>
            </div>
            <div
              onClick={() => onChange('fileType', 'request')}
              className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
              style={{
                backgroundColor: formData.fileType === 'request' ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                borderColor: formData.fileType === 'request' ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
            >
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
              <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Request Upload</div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Customer/vendor uploads a file</div>
            </div>
          </div>
        </div>

        {/* Template Upload */}
        {(formData.fileType || 'upload') === 'upload' && (
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center"
            style={{ borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB' }}
          >
            <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
            <div className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              Drag and drop document here
            </div>
            <div className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              PDF, DOC, XLS, or image files
            </div>
            <button
              className="mt-3 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
            >
              Browse Files
            </button>
          </div>
        )}

        {/* File Request Settings */}
        {formData.fileType === 'request' && (
          <>
            {/* Allowed Formats */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>Allowed File Formats</h4>
              <div className="flex flex-wrap gap-2">
                {fileFormats.map((format) => (
                  <label
                    key={format.id}
                    className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
                    }}
                  >
                    <input type="checkbox" defaultChecked={format.id === 'pdf'} className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                    <span className="text-sm">{format.icon}</span>
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>{format.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* File Size */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>File Size Limit</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Maximum Size</label>
                  <select
                    value={formData.maxFileSize || 10}
                    onChange={(e) => onChange('maxFileSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                  >
                    <option value="5">5 MB</option>
                    <option value="10">10 MB</option>
                    <option value="25">25 MB</option>
                    <option value="50">50 MB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Multiple Files</label>
                  <select
                    value={formData.multipleFiles ? 'yes' : 'no'}
                    onChange={(e) => onChange('multipleFiles', e.target.value === 'yes')}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                  >
                    <option value="no">Single file only</option>
                    <option value="yes">Allow multiple files</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security & Verification */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Shield className="w-4 h-4" /> Security & Verification
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Virus scan uploaded files</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Require digital signature on document</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Allow download by contract parties</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Expire download link after contract ends</span>
            </label>
          </div>
        </div>

        {/* Requirement */}
        <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <div>
            <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>Document is required</span>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Contract cannot proceed without this document</p>
          </div>
          <div
            className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
            style={{ backgroundColor: formData.required === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
            onClick={() => onChange('required', !formData.required)}
          >
            <div
              className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
              style={{ left: formData.required === true ? '22px' : '2px' }}
            />
          </div>
        </label>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Use "Upload Template" for forms, certificates, or documents you want to share. Use "Request Upload" when you need the customer or vendor to provide documentation.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSettingsStep;

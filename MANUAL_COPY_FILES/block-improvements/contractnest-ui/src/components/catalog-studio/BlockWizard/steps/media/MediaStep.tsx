// src/components/catalog-studio/BlockWizard/steps/media/MediaStep.tsx
// VIDEO BLOCK: Single page with Name, Icon, Video source, and Display settings
import React, { useState } from 'react';
import { Video, Upload, Link, Youtube, Lightbulb, ChevronDown, ChevronUp, Maximize, Play } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import FileUploader from '../../../../common/FileUploader';
import IconPicker from '../../../IconPicker';

interface MediaStepProps {
  formData: {
    // Basic info
    name?: string;
    icon?: string;
    // Video source
    sourceType?: 'upload' | 'url' | 'youtube' | 'vimeo';
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: string;
    // Display settings
    displaySize?: 'small' | 'medium' | 'large' | 'full';
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    showControls?: boolean;
  };
  onChange: (field: string, value: unknown) => void;
}

const MediaStep: React.FC<MediaStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showSettings, setShowSettings] = useState(false);

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
  };

  const sourceTypes = [
    { id: 'upload', icon: Upload, label: 'Upload', description: 'Upload video file' },
    { id: 'url', icon: Link, label: 'URL', description: 'External video URL' },
    { id: 'youtube', icon: Youtube, label: 'YouTube', description: 'YouTube video' },
    { id: 'vimeo', icon: Video, label: 'Vimeo', description: 'Vimeo video' },
  ];

  const sizeOptions = [
    { id: 'small', label: 'Small', width: '25%' },
    { id: 'medium', label: 'Medium', width: '50%' },
    { id: 'large', label: 'Large', width: '75%' },
    { id: 'full', label: 'Full', width: '100%' },
  ];

  // Extract YouTube video ID for embed
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  // Extract Vimeo video ID for embed
  const getVimeoEmbedUrl = (url: string) => {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Video Block
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Create a video block with embedded or uploaded content.
      </p>

      <div className="space-y-5">
        {/* Name and Icon - Single Row */}
        <div className="p-5 rounded-xl border" style={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Block Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>
                Block Name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Product Demo Video"
                value={formData.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                maxLength={255}
                className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
                required
              />
            </div>

            {/* Icon Picker */}
            <IconPicker
              value={formData.icon || 'Video'}
              onChange={(icon) => onChange('icon', icon)}
              label="Block Icon"
            />
          </div>
        </div>

        {/* Video Source */}
        <div className="p-5 rounded-xl border" style={cardStyle}>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>Video Source</label>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {sourceTypes.map((type) => {
              const IconComp = type.icon;
              const isSelected = (formData.sourceType || 'youtube') === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => onChange('sourceType', type.id)}
                  className="p-3 border-2 rounded-xl cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <IconComp className="w-5 h-5 mx-auto mb-1" style={{ color: colors.brand.primary }} />
                  <div className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>{type.label}</div>
                </div>
              );
            })}
          </div>

          {/* Upload Area */}
          {formData.sourceType === 'upload' && (
            <FileUploader
              category="block_videos"
              accept="video/mp4,video/webm,video/quicktime"
              onUploadComplete={(file) => onChange('mediaUrl', file.download_url)}
              onUploadError={(error) => console.error('Video upload failed:', error)}
              showPreview={false}
              hint="MP4, WebM, MOV (max 100MB)"
            />
          )}

          {/* URL Input */}
          {(formData.sourceType === 'url' || formData.sourceType === 'youtube' || formData.sourceType === 'vimeo' || !formData.sourceType) && (
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                {formData.sourceType === 'youtube' || !formData.sourceType ? 'YouTube URL' : formData.sourceType === 'vimeo' ? 'Vimeo URL' : 'Video URL'}
                <span style={{ color: colors.semantic.error }}> *</span>
              </label>
              <input
                type="url"
                value={formData.mediaUrl || ''}
                onChange={(e) => onChange('mediaUrl', e.target.value)}
                placeholder={formData.sourceType === 'vimeo' ? 'https://vimeo.com/...' : 'https://www.youtube.com/watch?v=...'}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          )}

          {/* Video Preview */}
          {formData.mediaUrl && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>Preview</h4>
              <div
                className="aspect-video rounded-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: isDarkMode ? '#1F2937' : '#E5E7EB' }}
              >
                {(formData.sourceType === 'youtube' || !formData.sourceType) && getYouTubeEmbedUrl(formData.mediaUrl) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(formData.mediaUrl)!}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video preview"
                  />
                ) : formData.sourceType === 'vimeo' && getVimeoEmbedUrl(formData.mediaUrl) ? (
                  <iframe
                    src={getVimeoEmbedUrl(formData.mediaUrl)!}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Vimeo video preview"
                  />
                ) : formData.sourceType === 'upload' && formData.mediaUrl ? (
                  <video src={formData.mediaUrl} className="w-full h-full" controls />
                ) : (
                  <Video className="w-16 h-16" style={{ color: colors.utility.secondaryText }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Display Settings */}
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full p-4 flex items-center justify-between text-left transition-colors"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
          >
            <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
              Display Settings
            </span>
            {showSettings ? (
              <ChevronUp className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            )}
          </button>

          {showSettings && (
            <div className="p-4 space-y-5 border-t" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
              {/* Size Selection */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Maximize className="w-4 h-4" /> Display Size
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {sizeOptions.map((size) => {
                    const isSelected = (formData.displaySize || 'large') === size.id;
                    return (
                      <div
                        key={size.id}
                        onClick={() => onChange('displaySize', size.id)}
                        className="p-2 border-2 rounded-lg cursor-pointer text-center transition-all"
                        style={{
                          backgroundColor: isSelected ? `${colors.brand.primary}10` : 'transparent',
                          borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                        }}
                      >
                        <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{size.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Playback Options */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Play className="w-4 h-4" /> Playback Options
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>Autoplay</span>
                    <div
                      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                      style={{ backgroundColor: formData.autoplay ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                      onClick={() => onChange('autoplay', !formData.autoplay)}
                    >
                      <div
                        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                        style={{ left: formData.autoplay ? '22px' : '2px' }}
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>Loop video</span>
                    <div
                      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                      style={{ backgroundColor: formData.loop ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                      onClick={() => onChange('loop', !formData.loop)}
                    >
                      <div
                        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                        style={{ left: formData.loop ? '22px' : '2px' }}
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>Start muted</span>
                    <div
                      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                      style={{ backgroundColor: formData.muted !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                      onClick={() => onChange('muted', formData.muted === false)}
                    >
                      <div
                        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                        style={{ left: formData.muted !== false ? '22px' : '2px' }}
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>Show controls</span>
                    <div
                      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                      style={{ backgroundColor: formData.showControls !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                      onClick={() => onChange('showControls', formData.showControls === false)}
                    >
                      <div
                        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                        style={{ left: formData.showControls !== false ? '22px' : '2px' }}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> YouTube and Vimeo videos are recommended for reliable playback across devices.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaStep;

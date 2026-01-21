// src/components/catalog-studio/BlockWizard/steps/media/MediaStep.tsx
import React from 'react';
import { Video, Upload, Link, Youtube, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import FileUploader from '../../../../common/FileUploader';

interface MediaStepProps {
  formData: {
    sourceType?: 'upload' | 'url' | 'youtube' | 'vimeo';
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const MediaStep: React.FC<MediaStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const sourceTypes = [
    { id: 'upload', icon: Upload, label: 'Upload', description: 'Upload video file' },
    { id: 'url', icon: Link, label: 'URL', description: 'External video URL' },
    { id: 'youtube', icon: Youtube, label: 'YouTube', description: 'YouTube video' },
    { id: 'vimeo', icon: Video, label: 'Vimeo', description: 'Vimeo video' },
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
        Media Source
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Add video content to this block.
      </p>

      <div className="space-y-6">
        {/* Source Type */}
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>Video Source</label>
          <div className="grid grid-cols-4 gap-3">
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
                  <IconComp className="w-6 h-6 mx-auto mb-1" style={{ color: colors.brand.primary }} />
                  <div className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>{type.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload Area - Using FileUploader */}
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
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
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
                <video
                  src={formData.mediaUrl}
                  className="w-full h-full"
                  controls
                />
              ) : (
                <Video className="w-16 h-16" style={{ color: colors.utility.secondaryText }} />
              )}
            </div>
          </div>
        )}

        {/* Video Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Duration</label>
            <input
              type="text"
              value={formData.duration || ''}
              onChange={(e) => onChange('duration', e.target.value)}
              placeholder="e.g., 5:30"
              maxLength={10}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Thumbnail URL (optional)</label>
            <input
              type="url"
              value={formData.thumbnailUrl || ''}
              onChange={(e) => onChange('thumbnailUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> YouTube and Vimeo videos are recommended for reliable playback. Uploaded videos may increase contract load time.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaStep;

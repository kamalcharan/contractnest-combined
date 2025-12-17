// src/components/VaNi/bbb/ProfileEntryForm.tsx
// File 5/13 - BBB Profile Entry Form Component (with edit mode support)

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import RichTextEditor from '../../ui/RichTextEditor';
import {
  FileText,
  Globe,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { ProfileFormData } from '../../../types/bbb';

interface ProfileEntryFormProps {
  onSubmit: (data: ProfileFormData) => void;
  onEnhanceWithAI: (description: string) => Promise<string | undefined> | void;
  isEnhancing?: boolean;
  isSaving?: boolean;
  // Edit mode props
  isEditMode?: boolean;
  initialDescription?: string;
  initialWebsiteUrl?: string;
  initialMethod?: 'manual' | 'website';
}

// URL validation helper
const isValidWebsiteUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url.trim()) {
    return { valid: false, error: 'Website URL is required' };
  }

  // Must start with http:// or https://
  if (!url.match(/^https?:\/\//i)) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  try {
    const parsedUrl = new URL(url);

    // Must have a valid domain (at least one dot)
    if (!parsedUrl.hostname.includes('.')) {
      return { valid: false, error: 'Please enter a valid domain (e.g., example.com)' };
    }

    // Domain must have valid TLD (at least 2 characters after last dot)
    const parts = parsedUrl.hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      return { valid: false, error: 'Please enter a valid domain extension' };
    }

    // No spaces allowed
    if (url.includes(' ')) {
      return { valid: false, error: 'URL cannot contain spaces' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL format' };
  }
};

const ProfileEntryForm: React.FC<ProfileEntryFormProps> = ({
  onSubmit,
  onEnhanceWithAI,
  isEnhancing = false,
  isSaving = false,
  isEditMode = false,
  initialDescription = '',
  initialWebsiteUrl = '',
  initialMethod = 'manual'
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [generationMethod, setGenerationMethod] = useState<'manual' | 'website'>(initialMethod);
  const [shortDescription, setShortDescription] = useState(initialDescription);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);

  // Update form when initial values change (entering edit mode)
  useEffect(() => {
    if (isEditMode) {
      setShortDescription(initialDescription);
      setWebsiteUrl(initialWebsiteUrl);
      setGenerationMethod(initialMethod);
    }
  }, [isEditMode, initialDescription, initialWebsiteUrl, initialMethod]);

  const handleEnhance = async () => {
    if (!shortDescription.trim()) {
      return;
    }
    // Call parent and get enhanced description back
    const result = await onEnhanceWithAI(shortDescription);
    // Update local state with enhanced content (for edit mode)
    if (result) {
      setShortDescription(result);
    }
  };

  // Handle URL change with validation
  const handleUrlChange = (value: string) => {
    setWebsiteUrl(value);
    if (urlTouched && value.trim()) {
      const validation = isValidWebsiteUrl(value.trim());
      setUrlError(validation.valid ? null : (validation.error || null));
    } else if (!value.trim()) {
      setUrlError(null);
    }
  };

  // Handle URL blur - validate on blur
  const handleUrlBlur = () => {
    setUrlTouched(true);
    if (websiteUrl.trim()) {
      const validation = isValidWebsiteUrl(websiteUrl.trim());
      setUrlError(validation.valid ? null : (validation.error || null));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL before submit
    if (generationMethod === 'website') {
      const validation = isValidWebsiteUrl(websiteUrl.trim());
      if (!validation.valid) {
        setUrlError(validation.error || 'Invalid URL');
        setUrlTouched(true);
        return;
      }
    }

    const formData: ProfileFormData = {
      generation_method: generationMethod,
      short_description: shortDescription.trim(),
      ...(generationMethod === 'website' && { website_url: websiteUrl.trim() })
    };

    onSubmit(formData);
  };

  // Form validation - check URL is valid for website method
  const urlValidation = generationMethod === 'website' ? isValidWebsiteUrl(websiteUrl.trim()) : { valid: true };
  const isFormValid = generationMethod === 'manual'
    ? shortDescription.trim().length > 0
    : urlValidation.valid;

  return (
    <Card
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: `${colors.utility.primaryText}20`
      }}
    >
      <CardHeader
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`,
          borderBottom: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        <CardTitle style={{ color: colors.utility.primaryText }}>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${colors.brand.primary}20`
                }}
              >
                {isEditMode ? (
                  <Pencil className="w-6 h-6" style={{ color: colors.brand.primary }} />
                ) : (
                  <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                  {isEditMode ? 'Edit Your Profile' : 'Welcome! I am VaNi'}
                </h3>
                <p
                  className="text-sm font-normal mt-1 leading-relaxed"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {isEditMode
                    ? 'Update your business description below. You can edit the text directly or re-enhance with AI.'
                    : <>I am an AI assistant for ContractNest and I will help you now to create your profile
                      into <strong style={{ color: colors.brand.primary }}>Bagyanagar chapter of BBB</strong>.
                      This will enable the group to have a directory of the esteemed entrepreneurs like you
                      and share profiles between the group.</>
                  }
                </p>
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Generation Method Selection */}
          <div className="space-y-4">
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: colors.utility.primaryText }}
            >
              {isEditMode ? 'Update method:' : 'How would you like to create your profile?'}
            </label>

            {/* Manual Entry Option */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                generationMethod === 'manual' ? 'ring-2' : ''
              }`}
              style={{
                backgroundColor: generationMethod === 'manual'
                  ? `${colors.brand.primary}10`
                  : colors.utility.secondaryBackground,
                borderColor: generationMethod === 'manual'
                  ? colors.brand.primary
                  : `${colors.utility.primaryText}20`,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
              onClick={() => setGenerationMethod('manual')}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="manual"
                  name="generation_method"
                  value="manual"
                  checked={generationMethod === 'manual'}
                  onChange={() => setGenerationMethod('manual')}
                  className="mt-1"
                  style={{ accentColor: colors.brand.primary }}
                />
                <div className="flex-1">
                  <label
                    htmlFor="manual"
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <FileText className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    <span
                      className="font-semibold"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {isEditMode ? 'Edit my description manually' : 'Enter details of my business here'}
                    </span>
                  </label>
                  <p
                    className="text-sm mt-1 ml-7"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {isEditMode
                      ? 'Edit the existing description and optionally re-enhance with AI'
                      : 'Manually provide a brief description of your business'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Website Scraping Option */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                generationMethod === 'website' ? 'ring-2' : ''
              }`}
              style={{
                backgroundColor: generationMethod === 'website'
                  ? `${colors.brand.primary}10`
                  : colors.utility.secondaryBackground,
                borderColor: generationMethod === 'website'
                  ? colors.brand.primary
                  : `${colors.utility.primaryText}20`,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
              onClick={() => setGenerationMethod('website')}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="website"
                  name="generation_method"
                  value="website"
                  checked={generationMethod === 'website'}
                  onChange={() => setGenerationMethod('website')}
                  className="mt-1"
                  style={{ accentColor: colors.brand.primary }}
                />
                <div className="flex-1">
                  <label
                    htmlFor="website"
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Globe className="w-5 h-5" style={{ color: colors.brand.secondary }} />
                    <span
                      className="font-semibold"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {isEditMode ? 'Regenerate from my website' : 'Use my Website to generate about me'}
                    </span>
                  </label>
                  <p
                    className="text-sm mt-1 ml-7"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {isEditMode
                      ? 'VaNi will re-scrape your website and create a fresh profile'
                      : 'VaNi will analyze your website and create your profile automatically'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Form Fields */}
          {generationMethod === 'manual' ? (
            <div className="space-y-4">
              <div>
                <RichTextEditor
                  value={shortDescription}
                  onChange={setShortDescription}
                  label={isEditMode ? "Edit Your Description *" : "Short Description *"}
                  placeholder="Describe your business - what you do, your services, expertise, and what makes you unique..."
                  minHeight={200}
                  maxHeight={350}
                  toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
                  showCharCount={true}
                  maxLength={2000}
                  disabled={isEnhancing || isSaving}
                />
                {shortDescription.length > 0 && shortDescription.length < 50 && (
                  <div className="flex items-center space-x-1 mt-2" style={{ color: colors.semantic.warning }}>
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs">Too short. Provide more details for better AI enhancement.</span>
                  </div>
                )}
              </div>

              {/* Enhance with AI Button */}
              <button
                type="button"
                onClick={handleEnhance}
                disabled={!shortDescription.trim() || isEnhancing || isSaving}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: colors.semantic.success,
                  color: '#FFFFFF'
                }}
              >
                {isEnhancing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enhancing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{isEditMode ? 'Re-enhance with AI' : 'Enhance with AI'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              <label
                htmlFor="website_url"
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Website URL *
              </label>
              <input
                type="url"
                id="website_url"
                value={websiteUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://www.yourcompany.com"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: urlError && urlTouched ? colors.semantic.error : `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': urlError && urlTouched ? colors.semantic.error : colors.brand.primary
                } as React.CSSProperties}
                disabled={isSaving}
              />
              {urlError && urlTouched ? (
                <div className="flex items-center space-x-1 mt-2" style={{ color: colors.semantic.error }}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-xs">{urlError}</span>
                </div>
              ) : (
                <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                  {isEditMode
                    ? 'VaNi will re-scrape your website and regenerate your profile'
                    : 'VaNi will scrape your website and generate a profile based on your content'
                  }
                </p>
              )}
            </div>
          )}

          {/* Info Box */}
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: `${colors.semantic.info}15`,
              border: `1px solid ${colors.semantic.info}40`
            }}
          >
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                  {generationMethod === 'manual'
                    ? (isEditMode ? 'Edit & Re-enhance' : 'AI Enhancement Available')
                    : (isEditMode ? 'Regenerate Profile' : 'Automatic Profile Generation')}
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {generationMethod === 'manual'
                    ? (isEditMode
                        ? 'Edit your description and click "Re-enhance with AI" to improve it further.'
                        : 'Click "Enhance with AI" to expand your description into a professional 6-8 line profile. VaNi will also generate semantic clusters for better searchability.')
                    : (isEditMode
                        ? 'VaNi will analyze your website again and create a fresh comprehensive business profile.'
                        : 'VaNi will analyze your website content and automatically create a comprehensive business profile including services, keywords, and semantic clusters.')}
                </p>
              </div>
            </div>
          </div>

          {/* Save Profile Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSaving}
            className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isEditMode ? 'Updating your profile...' : 'Saving your profile...'}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{isEditMode ? 'Update my profile' : 'Save my profile'}</span>
              </>
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileEntryForm;

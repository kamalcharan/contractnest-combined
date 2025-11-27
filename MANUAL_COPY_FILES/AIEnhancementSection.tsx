// src/components/VaNi/bbb/AIEnhancementSection.tsx
// File 7/13 - BBB AI Enhancement Results Component

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import RichTextEditor from '../../ui/RichTextEditor';
import {
  Sparkles,
  CheckCircle,
  Edit3,
  Save,
  AlertCircle,
  FileText,
  ArrowRight
} from 'lucide-react';

interface AIEnhancementSectionProps {
  originalDescription: string;
  enhancedDescription: string;
  onSave: (description: string) => void;
  isSaving?: boolean;
}

const AIEnhancementSection: React.FC<AIEnhancementSectionProps> = ({
  originalDescription,
  enhancedDescription,
  onSave,
  isSaving = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [description, setDescription] = useState(enhancedDescription);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (description.trim().length === 0) {
      return;
    }
    onSave(description.trim());
  };

  return (
    <Card
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: `${colors.utility.primaryText}20`
      }}
    >
      <CardHeader
        style={{
          background: `linear-gradient(135deg, ${colors.semantic.success}15 0%, ${colors.brand.primary}15 100%)`,
          borderBottom: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        <CardTitle>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${colors.semantic.success}20`
                }}
              >
                <Sparkles className="w-6 h-6" style={{ color: colors.semantic.success }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                  AI Enhancement Complete
                </h3>
                <p className="text-sm mt-1 font-normal" style={{ color: colors.utility.secondaryText }}>
                  VaNi has expanded your description into a professional 6-8 line profile
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}40`
                }}
                disabled={isSaving}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Success Message */}
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: `${colors.semantic.success}15`,
            border: `1px solid ${colors.semantic.success}40`
          }}
        >
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.success }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                Enhancement Successful
              </p>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Your business description has been professionally enhanced by AI. 
                You can edit this description or save it directly to your BBB profile.
              </p>
            </div>
          </div>
        </div>

        {/* Before & After Comparison */}
        <div className="grid grid-cols-1 gap-4">
          {/* Original Description */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
              <label
                className="text-sm font-medium"
                style={{ color: colors.utility.secondaryText }}
              >
                Original Description
              </label>
            </div>
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}15`
              }}
            >
              <p
                className="text-sm leading-relaxed italic"
                style={{ color: colors.utility.secondaryText }}
              >
                {originalDescription}
              </p>
            </div>
          </div>

          {/* Arrow Indicator */}
          <div className="flex justify-center">
            <div
              className="p-2 rounded-full"
              style={{
                backgroundColor: `${colors.semantic.success}20`
              }}
            >
              <ArrowRight className="w-5 h-5" style={{ color: colors.semantic.success }} />
            </div>
          </div>

          {/* Enhanced Description */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: colors.semantic.success }} />
              <label
                className="text-sm font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                AI-Enhanced Description *
              </label>
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Review and edit your AI-enhanced business description..."
                  minHeight={250}
                  maxHeight={400}
                  toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
                  showCharCount={true}
                  maxLength={3000}
                  disabled={isSaving}
                />
                {description.length > 0 && description.length < 100 && (
                  <div className="flex items-center space-x-1" style={{ color: colors.semantic.warning }}>
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs">Consider adding more details for a comprehensive profile</span>
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(enhancedDescription);
                      setIsEditing(false);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      border: `1px solid ${colors.utility.primaryText}30`
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                    style={{
                      backgroundColor: colors.brand.primary,
                      color: '#FFFFFF'
                    }}
                    disabled={isSaving}
                  >
                    Done Editing
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.semantic.success}40`
                }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: colors.utility.primaryText }}
                >
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        {!isEditing && (
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: `${colors.semantic.info}15`,
              border: `1px solid ${colors.semantic.info}40`
            }}
          >
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                  What happens next?
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  When you save this profile, VaNi will automatically generate semantic clusters 
                  and keywords based on your enhanced description. This will make your business 
                  easily discoverable in the BBB directory when other members search for services you provide.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        {!isEditing && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || description.trim().length === 0}
            className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving your profile...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save my profile</span>
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default AIEnhancementSection;
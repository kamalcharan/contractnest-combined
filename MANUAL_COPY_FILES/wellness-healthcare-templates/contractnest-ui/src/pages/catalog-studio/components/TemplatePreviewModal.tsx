// src/pages/catalog-studio/components/TemplatePreviewModal.tsx
import React, { useState } from 'react';
import {
  X,
  Star,
  Users,
  Clock,
  CheckCircle,
  FileText,
  Tag,
  Building2,
  Copy,
  Download,
  Eye,
  Layers,
  Calendar,
  TrendingUp,
  Shield,
  Heart,
  Activity,
  Accessibility,
  Home,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

// Industry icon mapping
const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'wellness': Heart,
  'healthcare-equipment': Activity,
  'mobility-aids': Accessibility,
  'home-healthcare': Home,
  'rehabilitation': UserCheck,
  'senior-care': Users,
  'maintenance': Wrench,
  'preventive-care': Shield,
};

export interface GlobalTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  industryLabel: string;
  industryIcon: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: string;
  blocksCount: number;
  blocks: {
    id: string;
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  tags: string[];
  usageCount: number;
  rating: number;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: GlobalTemplate | null;
  onCopyToMyTemplates: (template: GlobalTemplate) => void;
  onExportPDF: (template: GlobalTemplate) => void;
  isCopying?: boolean;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  onCopyToMyTemplates,
  onExportPDF,
  isCopying = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);

  if (!isOpen || !template) return null;

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return { bg: colors.semantic.success + '15', text: colors.semantic.success };
      case 'medium':
        return { bg: colors.semantic.warning + '15', text: colors.semantic.warning };
      case 'complex':
        return { bg: colors.semantic.error + '15', text: colors.semantic.error };
      default:
        return { bg: colors.utility.secondaryText + '15', text: colors.utility.secondaryText };
    }
  };

  const complexityColors = getComplexityColor(template.complexity);

  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className="h-4 w-4"
          style={{
            fill: i < fullStars ? colors.semantic.warning : 'transparent',
            color: i < fullStars ? colors.semantic.warning : colors.utility.secondaryText + '50',
          }}
        />
      );
    }
    return stars;
  };

  const IndustryIcon = INDUSTRY_ICONS[template.industry] || Building2;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-4xl rounded-xl border shadow-2xl animate-in zoom-in-95"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: colors.utility.secondaryText + '20' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + '15' }}
              >
                <IndustryIcon className="w-6 h-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                    {template.name}
                  </h2>
                  {template.isPopular && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1"
                      style={{ backgroundColor: colors.semantic.warning + '15', color: colors.semantic.warning }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {template.industryLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: colors.utility.secondaryText }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-3 gap-0">
            {/* Main Content - 2 columns */}
            <div className="col-span-2 p-6 border-r" style={{ borderColor: colors.utility.secondaryText + '20' }}>
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  Description
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                  {template.description}
                </p>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: colors.brand.primary + '10',
                        color: colors.brand.primary,
                      }}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Blocks Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                  Template Blocks ({template.blocksCount})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {template.blocks.map((block, index) => (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockIndex(index)}
                      className="p-3 rounded-lg border cursor-pointer transition-all"
                      style={{
                        borderColor: selectedBlockIndex === index
                          ? colors.brand.primary
                          : colors.utility.secondaryText + '20',
                        backgroundColor: selectedBlockIndex === index
                          ? colors.brand.primary + '05'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: colors.brand.primary + '10' }}
                          >
                            <Layers className="w-4 h-4" style={{ color: colors.brand.primary }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                                {block.name}
                              </span>
                              {block.required && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: colors.semantic.error + '15', color: colors.semantic.error }}
                                >
                                  Required
                                </span>
                              )}
                            </div>
                            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                              {block.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedBlockIndex === index && (
                        <p className="text-xs mt-2 pl-11" style={{ color: colors.utility.secondaryText }}>
                          {block.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - 1 column */}
            <div className="p-6">
              {/* Stats */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Complexity
                    </span>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full capitalize"
                      style={{ backgroundColor: complexityColors.bg, color: complexityColors.text }}
                    >
                      {template.complexity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Duration
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                      <Clock className="w-3.5 h-3.5" />
                      {template.estimatedDuration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Blocks
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                      <Layers className="w-3.5 h-3.5" />
                      {template.blocksCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Used
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                      <Users className="w-3.5 h-3.5" />
                      {template.usageCount} times
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Rating
                    </span>
                    <div className="flex items-center gap-1">
                      {renderRating(template.rating)}
                      <span className="text-sm font-medium ml-1" style={{ color: colors.utility.primaryText }}>
                        {template.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Updated Date */}
              <div
                className="mb-6 p-3 rounded-lg"
                style={{ backgroundColor: colors.utility.primaryBackground }}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: colors.utility.secondaryText }}>
                  <Calendar className="w-3.5 h-3.5" />
                  Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => onCopyToMyTemplates(template)}
                  disabled={isCopying}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                >
                  {isCopying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to My Templates
                    </>
                  )}
                </button>
                <button
                  onClick={() => onExportPDF(template)}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.primaryText,
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as PDF
                </button>
                <button
                  onClick={() => onExportPDF(template)}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    color: colors.utility.primaryText,
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Preview PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;

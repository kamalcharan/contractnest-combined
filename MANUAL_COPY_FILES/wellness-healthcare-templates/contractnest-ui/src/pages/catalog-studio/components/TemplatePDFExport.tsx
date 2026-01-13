// src/pages/catalog-studio/components/TemplatePDFExport.tsx
import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Clock,
  Layers,
  Users,
  Star,
  Tag,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { GlobalTemplate } from './TemplatePreviewModal';

interface TemplatePDFExportProps {
  isOpen: boolean;
  onClose: () => void;
  template: GlobalTemplate | null;
  mode: 'preview' | 'export';
}

const TemplatePDFExport: React.FC<TemplatePDFExportProps> = ({
  isOpen,
  onClose,
  template,
  mode,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [zoom, setZoom] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !template) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create a simple PDF-like content for download
      const content = `
TEMPLATE: ${template.name}
=====================================

Industry: ${template.industryLabel}
Complexity: ${template.complexity}
Duration: ${template.estimatedDuration}
Rating: ${template.rating}/5

DESCRIPTION:
${template.description}

TAGS: ${template.tags.join(', ')}

BLOCKS (${template.blocksCount}):
${template.blocks.map((b, i) => `${i + 1}. ${b.name} (${b.type})${b.required ? ' [Required]' : ''}\n   ${b.description}`).join('\n\n')}

=====================================
Generated on: ${new Date().toLocaleString()}
      `;

      // Create and download blob
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (mode === 'export') {
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'complex': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)' }}
        onClick={onClose}
      />

      {/* Header */}
      <div
        className="relative z-10 px-4 py-3 flex items-center justify-between border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              {mode === 'preview' ? 'PDF Preview' : 'Export PDF'}
            </h2>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {template.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-1.5 rounded transition-colors disabled:opacity-50"
              style={{ color: colors.utility.secondaryText }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-14 text-center text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 rounded transition-colors disabled:opacity-50"
              style={{ color: colors.utility.secondaryText }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg border transition-colors"
            style={{
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
            title="Print"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Preview Content */}
      <div className="relative z-10 flex-1 overflow-auto p-8 flex justify-center">
        <div
          ref={contentRef}
          className="bg-white shadow-2xl transition-transform"
          style={{
            width: '210mm',
            minHeight: '297mm',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {/* PDF Content */}
          <div className="p-12 print:p-8">
            {/* Header */}
            <div className="border-b-2 pb-6 mb-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h1>
                  <p className="text-lg text-gray-600">{template.industryLabel}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Template ID</div>
                  <div className="text-sm font-mono text-gray-700">{template.id}</div>
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.estimatedDuration}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Layers className="w-4 h-4" />
                  Blocks
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.blocksCount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Usage
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.usageCount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Star className="w-4 h-4" />
                  Rating
                </div>
                <div className="text-lg font-semibold text-gray-900">{template.rating.toFixed(1)}/5</div>
              </div>
            </div>

            {/* Complexity Badge */}
            <div className="mb-8">
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium capitalize"
                style={{
                  backgroundColor: getComplexityColor(template.complexity) + '20',
                  color: getComplexityColor(template.complexity),
                }}
              >
                {template.complexity} Complexity
              </span>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{template.description}</p>
            </div>

            {/* Tags */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Blocks */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Blocks</h2>
              <div className="space-y-3">
                {template.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-700">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{block.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {block.type}
                          </span>
                          {block.required && (
                            <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{block.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 mt-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>Generated on: {new Date().toLocaleDateString()}</div>
                <div>ContractNest • Catalog Studio</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePDFExport;

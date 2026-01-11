// src/pages/contracts/pdf-view/index.tsx
// PDF View Page - Contract Document Viewer
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';
import {
  ArrowLeft,
  Download,
  Printer,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Search,
  Bookmark,
  MessageSquare,
  FileSignature,
  Shield,
  BarChart3,
  Layers,
  Clock
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const contractsFeatures = [
  { icon: FileSignature, title: 'Digital Contract Creation', description: 'Create professional contracts with customizable templates.', highlight: true },
  { icon: Shield, title: 'Compliance & Audit Trail', description: 'Full audit history for regulatory compliance.', highlight: false },
  { icon: Clock, title: 'Lifecycle Management', description: 'Track contract stages from draft to signed.', highlight: false },
  { icon: BarChart3, title: 'Contract Analytics', description: 'Insights on contract value and performance.', highlight: false }
];
const contractsFloatingIcons = [
  { Icon: FileText, top: '8%', left: '4%', delay: '0s', duration: '22s' },
  { Icon: FileSignature, top: '18%', right: '6%', delay: '1.5s', duration: '19s' },
  { Icon: Shield, top: '60%', left: '5%', delay: '3s', duration: '21s' },
  { Icon: Layers, top: '70%', right: '4%', delay: '0.5s', duration: '18s' },
];

interface PDFViewPageProps {
  contractId?: string;
}

const PDFViewPage: React.FC<PDFViewPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // PDF viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(12); // Mock value
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock document data
  const document = {
    id: id || 'CNT-2024-001',
    title: 'Annual Maintenance Service Agreement',
    fileName: 'contract-AMC-2024-001.pdf',
    fileSize: '2.4 MB',
    uploadedAt: '2024-01-05',
    pages: 12
  };

  // Page thumbnails mock data
  const thumbnails = Array.from({ length: totalPages }, (_, i) => ({
    page: i + 1,
    hasBookmark: [1, 5, 8].includes(i + 1),
    hasComment: [2, 7].includes(i + 1)
  }));

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handleDownload = () => {
    // Mock download - in real app, this would trigger file download
    console.log('Downloading PDF:', document.fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header Toolbar */}
      <div
        className="border-b sticky top-0 z-20"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Navigation & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
              >
                <ArrowLeft size={20} style={{ color: colors.utility.primaryText }} />
              </button>
              <div>
                <h1
                  className="text-lg font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  {document.title}
                </h1>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {document.fileName} • {document.fileSize}
                </p>
              </div>
            </div>

            {/* Center - Page Navigation & Zoom */}
            <div className="flex items-center gap-4">
              {/* Page Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <ChevronLeft size={18} style={{ color: colors.utility.primaryText }} />
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= totalPages) setCurrentPage(val);
                    }}
                    className="w-12 text-center rounded-md border px-2 py-1 text-sm"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText
                    }}
                  />
                  <span style={{ color: colors.utility.secondaryText }}>/</span>
                  <span style={{ color: colors.utility.primaryText }}>{totalPages}</span>
                </div>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <ChevronRight size={18} style={{ color: colors.utility.primaryText }} />
                </button>
              </div>

              {/* Divider */}
              <div
                className="h-6 w-px"
                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
              />

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <ZoomOut size={18} style={{ color: colors.utility.primaryText }} />
                </button>
                <span
                  className="text-sm font-medium w-14 text-center"
                  style={{ color: colors.utility.primaryText }}
                >
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <ZoomIn size={18} style={{ color: colors.utility.primaryText }} />
                </button>
              </div>

              {/* Rotate */}
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                title="Rotate"
              >
                <RotateCw size={18} style={{ color: colors.utility.primaryText }} />
              </button>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div
                className="relative flex items-center rounded-lg px-3 py-1.5"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
              >
                <Search size={16} style={{ color: colors.utility.secondaryText }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in document..."
                  className="bg-transparent border-none outline-none ml-2 text-sm w-40"
                  style={{ color: colors.utility.primaryText }}
                />
              </div>

              <button
                onClick={handleFullscreen}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                title="Fullscreen"
              >
                <Maximize2 size={18} style={{ color: colors.utility.primaryText }} />
              </button>

              <button
                onClick={handleDownload}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                title="Download"
              >
                <Download size={18} style={{ color: colors.utility.primaryText }} />
              </button>

              <button
                onClick={handlePrint}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                title="Print"
              >
                <Printer size={18} style={{ color: colors.utility.primaryText }} />
              </button>

              <button
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                title="Share"
              >
                <Share2 size={18} style={{ color: colors.utility.primaryText }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Page Thumbnails */}
        {showSidebar && (
          <div
            className="w-48 border-r overflow-y-auto flex-shrink-0"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div className="p-3 space-y-2">
              {thumbnails.map((thumb) => (
                <button
                  key={thumb.page}
                  onClick={() => setCurrentPage(thumb.page)}
                  className={`w-full p-2 rounded-lg transition-all border-2 ${
                    currentPage === thumb.page ? '' : 'border-transparent'
                  }`}
                  style={{
                    backgroundColor: currentPage === thumb.page
                      ? `${colors.brand.primary}10`
                      : `${colors.utility.primaryText}05`,
                    borderColor: currentPage === thumb.page
                      ? colors.brand.primary
                      : 'transparent'
                  }}
                >
                  {/* Thumbnail placeholder */}
                  <div
                    className="aspect-[3/4] rounded-md flex items-center justify-center mb-2"
                    style={{ backgroundColor: colors.utility.primaryBackground }}
                  >
                    <FileText
                      size={32}
                      style={{ color: `${colors.utility.secondaryText}50` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Page {thumb.page}
                    </span>
                    <div className="flex gap-1">
                      {thumb.hasBookmark && (
                        <Bookmark size={12} style={{ color: colors.semantic.warning }} />
                      )}
                      {thumb.hasComment && (
                        <MessageSquare size={12} style={{ color: colors.brand.primary }} />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PDF Viewer Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div
            className="shadow-lg rounded-lg overflow-hidden transition-transform"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {/* PDF Page Placeholder - In real app, use react-pdf or similar */}
            <div
              className="bg-white flex flex-col items-center justify-center"
              style={{
                width: '612px', // Standard US Letter width in points
                height: '792px', // Standard US Letter height in points
                minHeight: '400px'
              }}
            >
              {/* Mock PDF Content */}
              <div className="text-center p-8">
                <FileText size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {document.title}
                </h3>
                <p className="text-gray-500 mb-4">Page {currentPage} of {totalPages}</p>
                <div className="text-left max-w-md mx-auto text-sm text-gray-600 space-y-4">
                  <p>
                    This is a placeholder for the PDF viewer. In production, this would render
                    the actual PDF document using a library like react-pdf or pdf.js.
                  </p>
                  <p className="text-xs text-gray-400 border-t pt-4">
                    To integrate PDF viewing, install: npm install @react-pdf/renderer react-pdf
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed bottom-4 left-4 p-3 rounded-full shadow-lg transition-colors hover:opacity-90 z-10"
        style={{
          backgroundColor: colors.brand.primary,
          color: '#fff'
        }}
      >
        <FileText size={20} />
      </button>
    </div>
  );
};

const PDFViewPageWithComingSoon: React.FC = () => (
  <ComingSoonWrapper pageKey="contracts" title="Contract Management" subtitle="End-to-end contract lifecycle management." heroIcon={FileText} features={contractsFeatures} floatingIcons={contractsFloatingIcons}>
    <PDFViewPage />
  </ComingSoonWrapper>
);

export default PDFViewPageWithComingSoon;

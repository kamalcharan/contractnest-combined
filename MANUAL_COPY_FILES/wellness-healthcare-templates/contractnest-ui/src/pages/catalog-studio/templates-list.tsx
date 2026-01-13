// src/pages/catalog-studio/templates-list.tsx
// Consolidated Template Management - Source of Truth
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Grid3X3,
  List,
  Star,
  Plus,
  Clock,
  X,
  Loader2,
  AlertCircle,
  FileText,
  LayoutTemplate,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  History,
  Calendar,
  Users,
  TrendingUp,
  Globe,
  Building2,
  Layers,
  CheckCircle,
  Filter,
  Heart,
  Activity,
  Accessibility,
  Home,
  UserCheck,
  Wrench,
  Shield,
  Download,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Import components
import TemplatePreviewModal, { GlobalTemplate } from './components/TemplatePreviewModal';
import TemplatePDFExport from './components/TemplatePDFExport';

// =====================================================
// WELLNESS/HEALTHCARE INDUSTRY CATEGORIES
// =====================================================
const WELLNESS_INDUSTRIES = [
  { id: 'all', name: 'All Industries', icon: '📋', count: 12 },
  { id: 'wellness', name: 'Wellness & Spa', icon: '🧘', count: 2 },
  { id: 'healthcare-equipment', name: 'Healthcare Equipment', icon: '🏥', count: 3 },
  { id: 'mobility-aids', name: 'Mobility Aids', icon: '♿', count: 2 },
  { id: 'home-healthcare', name: 'Home Healthcare', icon: '🏠', count: 2 },
  { id: 'rehabilitation', name: 'Rehabilitation', icon: '💪', count: 1 },
  { id: 'senior-care', name: 'Senior Care', icon: '👴', count: 1 },
  { id: 'preventive-care', name: 'Preventive Care', icon: '🛡️', count: 1 },
];

// =====================================================
// 12 WELLNESS/HEALTHCARE GLOBAL TEMPLATES
// =====================================================
const GLOBAL_TEMPLATES: GlobalTemplate[] = [
  {
    id: 'gt-001',
    name: 'Hospital Bed Rental',
    description: 'Complete rental agreement for hospital beds including delivery, setup, maintenance, and pickup services. Ideal for home healthcare and recovery patients.',
    industry: 'healthcare-equipment',
    industryLabel: 'Healthcare Equipment',
    industryIcon: '🏥',
    complexity: 'simple',
    estimatedDuration: '10-15 min',
    blocksCount: 3,
    blocks: [
      { id: 'b1', name: 'Equipment Details', type: 'Service Block', description: 'Bed specifications, model, and features', required: true },
      { id: 'b2', name: 'Rental Terms', type: 'Billing Block', description: 'Duration, pricing, deposit, and payment schedule', required: true },
      { id: 'b3', name: 'Delivery & Setup', type: 'Service Block', description: 'Delivery address, setup requirements, and timing', required: false },
    ],
    tags: ['rental', 'hospital-bed', 'home-care', 'medical-equipment'],
    usageCount: 234,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2024-12-01T14:30:00Z',
  },
  {
    id: 'gt-002',
    name: 'Wheelchair Rental Package',
    description: 'Flexible wheelchair rental service contract covering manual and electric wheelchairs with optional accessories and maintenance support.',
    industry: 'mobility-aids',
    industryLabel: 'Mobility Aids',
    industryIcon: '♿',
    complexity: 'simple',
    estimatedDuration: '8-12 min',
    blocksCount: 3,
    blocks: [
      { id: 'b1', name: 'Wheelchair Selection', type: 'Service Block', description: 'Type, model, and accessories selection', required: true },
      { id: 'b2', name: 'Rental Agreement', type: 'Billing Block', description: 'Rental period, rates, and security deposit', required: true },
      { id: 'b3', name: 'Care Instructions', type: 'Text Block', description: 'Usage guidelines and maintenance tips', required: false },
    ],
    tags: ['wheelchair', 'mobility', 'rental', 'accessibility'],
    usageCount: 189,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-05-20T09:15:00Z',
    updatedAt: '2024-11-25T11:20:00Z',
  },
  {
    id: 'gt-003',
    name: 'Oxygen Concentrator Rental',
    description: 'Medical oxygen concentrator rental agreement with installation, training, maintenance, and emergency support services included.',
    industry: 'healthcare-equipment',
    industryLabel: 'Healthcare Equipment',
    industryIcon: '🏥',
    complexity: 'medium',
    estimatedDuration: '15-20 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Equipment Specs', type: 'Service Block', description: 'Concentrator model, capacity, and features', required: true },
      { id: 'b2', name: 'Installation & Training', type: 'Service Block', description: 'Setup process and user training session', required: true },
      { id: 'b3', name: 'Billing & Terms', type: 'Billing Block', description: 'Rental rates, payment terms, and deposits', required: true },
      { id: 'b4', name: 'Emergency Support', type: 'Service Block', description: '24/7 support and emergency replacement', required: false },
    ],
    tags: ['oxygen', 'concentrator', 'respiratory', 'medical-equipment', 'rental'],
    usageCount: 156,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-04-10T13:45:00Z',
    updatedAt: '2024-12-05T16:10:00Z',
  },
  {
    id: 'gt-004',
    name: 'Patient Lift Installation & Service',
    description: 'Comprehensive patient lift installation contract including site assessment, installation, training, and annual maintenance services.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '🏠',
    complexity: 'medium',
    estimatedDuration: '20-25 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Site Assessment', type: 'Service Block', description: 'Home evaluation and lift requirements', required: true },
      { id: 'b2', name: 'Equipment Selection', type: 'Service Block', description: 'Lift type, capacity, and accessories', required: true },
      { id: 'b3', name: 'Installation', type: 'Service Block', description: 'Professional installation and testing', required: true },
      { id: 'b4', name: 'Training', type: 'Service Block', description: 'Caregiver and user training session', required: true },
      { id: 'b5', name: 'Maintenance Plan', type: 'Billing Block', description: 'Annual maintenance and service schedule', required: false },
    ],
    tags: ['patient-lift', 'installation', 'home-healthcare', 'accessibility'],
    usageCount: 98,
    rating: 4.6,
    isPopular: false,
    createdAt: '2024-03-22T11:20:00Z',
    updatedAt: '2024-11-15T10:30:00Z',
  },
  {
    id: 'gt-005',
    name: 'Physiotherapy Session Package',
    description: 'Structured physiotherapy service package with assessment, treatment sessions, progress tracking, and home exercise programs.',
    industry: 'rehabilitation',
    industryLabel: 'Rehabilitation',
    industryIcon: '💪',
    complexity: 'simple',
    estimatedDuration: '12-15 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Initial Assessment', type: 'Service Block', description: 'Comprehensive physical evaluation', required: true },
      { id: 'b2', name: 'Treatment Sessions', type: 'Service Block', description: 'Number of sessions and frequency', required: true },
      { id: 'b3', name: 'Home Exercise Plan', type: 'Text Block', description: 'Personalized exercise program', required: false },
      { id: 'b4', name: 'Package Pricing', type: 'Billing Block', description: 'Session rates and package discounts', required: true },
    ],
    tags: ['physiotherapy', 'rehabilitation', 'therapy', 'wellness'],
    usageCount: 312,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-02-14T08:30:00Z',
    updatedAt: '2024-12-08T09:45:00Z',
  },
  {
    id: 'gt-006',
    name: 'Home Nursing Care Plan',
    description: 'Comprehensive home nursing service agreement covering skilled nursing care, medication management, wound care, and patient monitoring.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '🏠',
    complexity: 'medium',
    estimatedDuration: '18-22 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Care Assessment', type: 'Service Block', description: 'Patient needs and care level assessment', required: true },
      { id: 'b2', name: 'Nursing Services', type: 'Service Block', description: 'Types of nursing care provided', required: true },
      { id: 'b3', name: 'Visit Schedule', type: 'Service Block', description: 'Frequency and duration of visits', required: true },
      { id: 'b4', name: 'Medication Management', type: 'Service Block', description: 'Medication administration and tracking', required: false },
      { id: 'b5', name: 'Care Plan Pricing', type: 'Billing Block', description: 'Hourly rates and package options', required: true },
    ],
    tags: ['nursing', 'home-care', 'healthcare', 'patient-care'],
    usageCount: 178,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-01-28T14:15:00Z',
    updatedAt: '2024-11-20T13:25:00Z',
  },
  {
    id: 'gt-007',
    name: 'Stairlift Installation & Maintenance',
    description: 'Complete stairlift solution including site survey, installation, safety training, warranty, and annual maintenance contract.',
    industry: 'mobility-aids',
    industryLabel: 'Mobility Aids',
    industryIcon: '♿',
    complexity: 'complex',
    estimatedDuration: '25-30 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Site Survey', type: 'Service Block', description: 'Staircase measurement and assessment', required: true },
      { id: 'b2', name: 'Product Selection', type: 'Service Block', description: 'Stairlift model and customizations', required: true },
      { id: 'b3', name: 'Installation', type: 'Service Block', description: 'Professional installation and testing', required: true },
      { id: 'b4', name: 'Warranty & Support', type: 'Text Block', description: 'Warranty terms and support options', required: true },
      { id: 'b5', name: 'Maintenance Contract', type: 'Billing Block', description: 'Annual maintenance and service pricing', required: true },
    ],
    tags: ['stairlift', 'installation', 'mobility', 'accessibility', 'maintenance'],
    usageCount: 87,
    rating: 4.5,
    isPopular: false,
    createdAt: '2024-06-05T10:40:00Z',
    updatedAt: '2024-12-02T11:50:00Z',
  },
  {
    id: 'gt-008',
    name: 'Wellness Massage Package',
    description: 'Relaxation and therapeutic massage service package with multiple session options, add-on treatments, and membership benefits.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '🧘',
    complexity: 'simple',
    estimatedDuration: '8-10 min',
    blocksCount: 3,
    blocks: [
      { id: 'b1', name: 'Massage Selection', type: 'Service Block', description: 'Massage types and duration options', required: true },
      { id: 'b2', name: 'Add-on Services', type: 'Service Block', description: 'Aromatherapy, hot stones, etc.', required: false },
      { id: 'b3', name: 'Package Pricing', type: 'Billing Block', description: 'Session rates and package deals', required: true },
    ],
    tags: ['massage', 'wellness', 'spa', 'relaxation', 'therapy'],
    usageCount: 445,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-04-18T09:00:00Z',
    updatedAt: '2024-12-10T10:15:00Z',
  },
  {
    id: 'gt-009',
    name: 'Comprehensive Health Checkup',
    description: 'Full-body health screening package with blood tests, imaging, specialist consultations, and detailed health report.',
    industry: 'preventive-care',
    industryLabel: 'Preventive Care',
    industryIcon: '🛡️',
    complexity: 'medium',
    estimatedDuration: '15-18 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Test Panel', type: 'Service Block', description: 'List of included tests and screenings', required: true },
      { id: 'b2', name: 'Consultations', type: 'Service Block', description: 'Specialist consultations included', required: true },
      { id: 'b3', name: 'Health Report', type: 'Service Block', description: 'Detailed report and recommendations', required: true },
      { id: 'b4', name: 'Package Options', type: 'Billing Block', description: 'Basic, comprehensive, and executive packages', required: true },
    ],
    tags: ['health-checkup', 'preventive', 'screening', 'wellness'],
    usageCount: 267,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-05-10T12:30:00Z',
    updatedAt: '2024-11-28T14:40:00Z',
  },
  {
    id: 'gt-010',
    name: 'Rehabilitation Equipment Rental',
    description: 'Rental service for rehabilitation equipment including parallel bars, exercise bikes, therapy balls, and resistance equipment.',
    industry: 'healthcare-equipment',
    industryLabel: 'Healthcare Equipment',
    industryIcon: '🏥',
    complexity: 'medium',
    estimatedDuration: '12-16 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Equipment Selection', type: 'Service Block', description: 'Choose rehab equipment items', required: true },
      { id: 'b2', name: 'Rental Duration', type: 'Service Block', description: 'Rental period and extension options', required: true },
      { id: 'b3', name: 'Delivery & Setup', type: 'Service Block', description: 'Delivery and installation service', required: false },
      { id: 'b4', name: 'Rental Pricing', type: 'Billing Block', description: 'Daily/weekly/monthly rates', required: true },
    ],
    tags: ['rehabilitation', 'equipment', 'rental', 'therapy'],
    usageCount: 134,
    rating: 4.6,
    isPopular: false,
    createdAt: '2024-03-15T11:25:00Z',
    updatedAt: '2024-11-10T15:35:00Z',
  },
  {
    id: 'gt-011',
    name: 'Elderly Care Monthly Plan',
    description: 'Comprehensive monthly elderly care subscription covering daily assistance, health monitoring, medication management, and companionship services.',
    industry: 'senior-care',
    industryLabel: 'Senior Care',
    industryIcon: '👴',
    complexity: 'complex',
    estimatedDuration: '22-28 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Care Assessment', type: 'Service Block', description: 'Initial assessment and care plan', required: true },
      { id: 'b2', name: 'Daily Assistance', type: 'Service Block', description: 'ADL support and personal care', required: true },
      { id: 'b3', name: 'Health Monitoring', type: 'Service Block', description: 'Vital signs and health tracking', required: true },
      { id: 'b4', name: 'Medication Management', type: 'Service Block', description: 'Medication scheduling and reminders', required: true },
      { id: 'b5', name: 'Companionship', type: 'Service Block', description: 'Social engagement and activities', required: false },
      { id: 'b6', name: 'Monthly Subscription', type: 'Billing Block', description: 'Care level tiers and pricing', required: true },
    ],
    tags: ['elderly-care', 'senior', 'monthly-plan', 'assisted-living'],
    usageCount: 156,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-02-20T13:50:00Z',
    updatedAt: '2024-12-06T12:20:00Z',
  },
  {
    id: 'gt-012',
    name: 'Medical Equipment AMC',
    description: 'Annual maintenance contract for medical equipment including preventive maintenance, calibration, repairs, and emergency support.',
    industry: 'healthcare-equipment',
    industryLabel: 'Healthcare Equipment',
    industryIcon: '🏥',
    complexity: 'medium',
    estimatedDuration: '14-18 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Equipment Coverage', type: 'Service Block', description: 'List of covered equipment', required: true },
      { id: 'b2', name: 'Maintenance Schedule', type: 'Service Block', description: 'PM visits and calibration schedule', required: true },
      { id: 'b3', name: 'Repair Services', type: 'Service Block', description: 'Breakdown support and spare parts', required: true },
      { id: 'b4', name: 'AMC Pricing', type: 'Billing Block', description: 'Annual contract pricing and terms', required: true },
    ],
    tags: ['amc', 'maintenance', 'medical-equipment', 'calibration', 'support'],
    usageCount: 198,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-01-10T10:10:00Z',
    updatedAt: '2024-11-30T09:30:00Z',
  },
];

// =====================================================
// TYPES
// =====================================================
type ViewType = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'rating' | 'name';
type TabType = 'my-templates' | 'global';

interface MyTemplate extends GlobalTemplate {
  copiedFrom?: string;
  isCustom?: boolean;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

// =====================================================
// TOAST COMPONENT
// =====================================================
const ToastNotification: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ toast, onDismiss, colors, isDarkMode }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'info': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getBg = () => {
    switch (toast.type) {
      case 'success': return colors.semantic.success;
      case 'error': return colors.semantic.error;
      case 'info': return colors.brand.primary;
      default: return colors.brand.primary;
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-4 min-w-[280px]"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        border: `1px solid ${getBg()}40`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${getBg()}20`, color: getBg() }}
      >
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>{toast.description}</p>
        )}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="p-1" style={{ color: colors.utility.secondaryText }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// =====================================================
// TEMPLATE CARD COMPONENT
// =====================================================
const TemplateCard: React.FC<{
  template: GlobalTemplate | MyTemplate;
  viewType: ViewType;
  isGlobal: boolean;
  onPreview: () => void;
  onCopyToMyTemplates?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExportPDF?: () => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ template, viewType, isGlobal, onPreview, onCopyToMyTemplates, onEdit, onDelete, onExportPDF, colors, isDarkMode }) => {
  const [showActions, setShowActions] = useState(false);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return colors.semantic.success;
      case 'medium': return colors.semantic.warning;
      case 'complex': return colors.semantic.error;
      default: return colors.utility.secondaryText;
    }
  };

  if (viewType === 'list') {
    return (
      <div
        className="p-4 rounded-lg border transition-all hover:shadow-md"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
            style={{ backgroundColor: colors.brand.primary + '15' }}
          >
            {template.industryIcon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate" style={{ color: colors.utility.primaryText }}>
                {template.name}
              </h3>
              {isGlobal && (
                <Globe className="w-4 h-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
              )}
              {template.isPopular && (
                <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.warning }} />
              )}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${getComplexityColor(template.complexity)}20`, color: getComplexityColor(template.complexity) }}
              >
                {template.complexity}
              </span>
            </div>
            <p className="text-xs truncate mt-1" style={{ color: colors.utility.secondaryText }}>
              {template.description}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs" style={{ color: colors.utility.secondaryText }}>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {template.blocksCount}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" style={{ fill: colors.semantic.warning, color: colors.semantic.warning }} />
              {template.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {template.estimatedDuration}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPreview}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1" />
              Preview
            </button>
            {isGlobal && onCopyToMyTemplates && (
              <button
                onClick={onCopyToMyTemplates}
                className="px-3 py-1.5 text-xs font-medium rounded-lg"
                style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
              >
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                Copy
              </button>
            )}
            {!isGlobal && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showActions && (
                  <div
                    className="absolute right-0 top-full mt-1 w-36 rounded-lg border shadow-lg z-10"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: colors.utility.secondaryText + '20',
                    }}
                  >
                    <button
                      onClick={() => { onEdit?.(); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => { onExportPDF?.(); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <Download className="w-4 h-4" /> Export PDF
                    </button>
                    <div className="border-t" style={{ borderColor: colors.utility.secondaryText + '20' }} />
                    <button
                      onClick={() => { onDelete?.(); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20"
                      style={{ color: colors.semantic.error }}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className="rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1 group"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: colors.utility.secondaryText + '20',
      }}
    >
      {/* Popular Badge */}
      {template.isPopular && (
        <div className="absolute -top-2 -right-2 z-10">
          <div
            className="text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg"
            style={{ backgroundColor: colors.semantic.warning }}
          >
            <TrendingUp className="h-3 w-3" />
            Popular
          </div>
        </div>
      )}

      <div className="p-4 border-b relative" style={{ borderColor: colors.utility.secondaryText + '10' }}>
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: colors.brand.primary + '15' }}
          >
            {template.industryIcon}
          </div>
          <div className="flex items-center gap-1">
            {isGlobal && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
              >
                <Globe className="w-3 h-3" /> Global
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: `${getComplexityColor(template.complexity)}20`, color: getComplexityColor(template.complexity) }}
            >
              {template.complexity}
            </span>
          </div>
        </div>
        <h3 className="font-semibold" style={{ color: colors.utility.primaryText }}>
          {template.name}
        </h3>
        <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
          {template.industryLabel}
        </p>
      </div>

      <div className="p-4">
        <p className="text-xs line-clamp-2 mb-3" style={{ color: colors.utility.secondaryText }}>
          {template.description}
        </p>

        <div className="grid grid-cols-3 gap-2 text-center py-2 rounded-lg mb-3" style={{ backgroundColor: colors.brand.primary + '05' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {template.blocksCount}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Blocks</div>
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center justify-center gap-0.5" style={{ color: colors.utility.primaryText }}>
              <Star className="w-3 h-3" style={{ fill: colors.semantic.warning, color: colors.semantic.warning }} />
              {template.rating}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Rating</div>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {template.usageCount}
            </div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Uses</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {template.estimatedDuration}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: colors.utility.secondaryText + '10' }}>
        <button
          onClick={onPreview}
          className="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-1"
          style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        {isGlobal && onCopyToMyTemplates && (
          <button
            onClick={onCopyToMyTemplates}
            className="flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-1"
            style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        )}
        {!isGlobal && (
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg border transition-colors"
            style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.secondaryText }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const CatalogStudioTemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // My Templates (copied from global + custom created)
  const [myTemplates, setMyTemplates] = useState<MyTemplate[]>([]);

  // Modals
  const [previewModal, setPreviewModal] = useState<GlobalTemplate | null>(null);
  const [pdfModal, setPdfModal] = useState<{ template: GlobalTemplate | null; mode: 'preview' | 'export' }>({ template: null, mode: 'preview' });
  const [isCopying, setIsCopying] = useState(false);

  // Toast helper
  const showToast = useCallback((type: Toast['type'], title: string, description?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Filter templates
  const filteredGlobalTemplates = useMemo(() => {
    let result = [...GLOBAL_TEMPLATES];

    // Industry filter
    if (selectedIndustry !== 'all') {
      result = result.filter((t) => t.industry === selectedIndustry);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'popular':
        result.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [selectedIndustry, searchTerm, sortBy]);

  const filteredMyTemplates = useMemo(() => {
    let result = [...myTemplates];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return result;
  }, [myTemplates, searchTerm, sortBy]);

  // Handlers
  const handleCopyToMyTemplates = async (template: GlobalTemplate) => {
    setIsCopying(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const copiedTemplate: MyTemplate = {
        ...template,
        id: `my-${template.id}-${Date.now()}`,
        name: `${template.name} (Copy)`,
        copiedFrom: template.id,
        isCustom: false,
        updatedAt: new Date().toISOString(),
      };

      setMyTemplates((prev) => [copiedTemplate, ...prev]);
      showToast('success', 'Template Copied', `"${template.name}" has been added to My Templates`);
      setPreviewModal(null);
      setActiveTab('my-templates');
    } catch (error) {
      showToast('error', 'Copy Failed', 'Unable to copy template. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDeleteMyTemplate = (templateId: string) => {
    const template = myTemplates.find((t) => t.id === templateId);
    if (template) {
      setMyTemplates((prev) => prev.filter((t) => t.id !== templateId));
      showToast('success', 'Template Deleted', `"${template.name}" has been removed`);
    }
  };

  const handleExportPDF = (template: GlobalTemplate) => {
    setPdfModal({ template, mode: 'export' });
  };

  const handlePreviewPDF = (template: GlobalTemplate) => {
    setPdfModal({ template, mode: 'preview' });
  };

  // Tab counts
  const myTemplatesCount = myTemplates.length;
  const globalTemplatesCount = GLOBAL_TEMPLATES.length;

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.utility.secondaryBackground }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.brand.primary + '15' }}
            >
              <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                Templates
              </h1>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Manage and browse wellness/healthcare contract templates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/catalog-studio/template')}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="border-b px-6"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('my-templates')}
            className="px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors"
            style={{
              borderBottomColor: activeTab === 'my-templates' ? colors.brand.primary : 'transparent',
              color: activeTab === 'my-templates' ? colors.brand.primary : colors.utility.secondaryText,
            }}
          >
            <Building2 className="w-4 h-4" />
            My Templates
            <span
              className="px-1.5 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: activeTab === 'my-templates' ? colors.brand.primary + '15' : colors.utility.secondaryText + '15',
                color: activeTab === 'my-templates' ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              {myTemplatesCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className="px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors"
            style={{
              borderBottomColor: activeTab === 'global' ? colors.brand.primary : 'transparent',
              color: activeTab === 'global' ? colors.brand.primary : colors.utility.secondaryText,
            }}
          >
            <Globe className="w-4 h-4" />
            Global Templates
            <span
              className="px-1.5 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: activeTab === 'global' ? colors.brand.primary + '15' : colors.utility.secondaryText + '15',
                color: activeTab === 'global' ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              {globalTemplatesCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Industry Filter (Global Tab Only) */}
      {activeTab === 'global' && (
        <div
          className="px-6 py-4 border-b overflow-x-auto"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.brand.primary + '03',
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-sm font-medium mr-2" style={{ color: colors.utility.secondaryText }}>
              Industry:
            </span>
            {WELLNESS_INDUSTRIES.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className="px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: selectedIndustry === industry.id ? colors.brand.primary : 'transparent',
                  borderColor: selectedIndustry === industry.id ? colors.brand.primary : colors.utility.secondaryText + '30',
                  color: selectedIndustry === industry.id ? '#FFFFFF' : colors.utility.primaryText,
                }}
              >
                <span>{industry.icon}</span>
                {industry.name}
                <span
                  className="text-xs px-1.5 rounded-full"
                  style={{
                    backgroundColor: selectedIndustry === industry.id ? 'rgba(255,255,255,0.2)' : colors.utility.secondaryText + '15',
                  }}
                >
                  {industry.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div
        className="px-6 py-4 border-b"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.brand.primary + '05',
          borderColor: colors.utility.secondaryText + '20',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.primaryText,
              }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="recent">Recently Updated</option>
            <option value="name">Name A-Z</option>
          </select>

          <div
            className="flex rounded-lg p-0.5"
            style={{ backgroundColor: colors.utility.secondaryText + '10' }}
          >
            <button
              onClick={() => setViewType('grid')}
              className="p-2 rounded-md transition-colors"
              style={{
                backgroundColor: viewType === 'grid' ? colors.utility.primaryBackground : 'transparent',
                color: viewType === 'grid' ? colors.utility.primaryText : colors.utility.secondaryText,
              }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('list')}
              className="p-2 rounded-md transition-colors"
              style={{
                backgroundColor: viewType === 'list' ? colors.utility.primaryBackground : 'transparent',
                color: viewType === 'list' ? colors.utility.primaryText : colors.utility.secondaryText,
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {activeTab === 'global' ? filteredGlobalTemplates.length : filteredMyTemplates.length} templates
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Global Templates Tab */}
        {activeTab === 'global' && (
          <>
            {filteredGlobalTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Globe className="w-16 h-16 mb-4" style={{ color: colors.utility.secondaryText }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  No templates found
                </h3>
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div
                className={
                  viewType === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-3'
                }
              >
                {filteredGlobalTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    viewType={viewType}
                    isGlobal={true}
                    onPreview={() => setPreviewModal(template)}
                    onCopyToMyTemplates={() => handleCopyToMyTemplates(template)}
                    onExportPDF={() => handleExportPDF(template)}
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* My Templates Tab */}
        {activeTab === 'my-templates' && (
          <>
            {filteredMyTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Building2 className="w-16 h-16 mb-4" style={{ color: colors.utility.secondaryText }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  No templates yet
                </h3>
                <p className="text-sm mb-4 text-center" style={{ color: colors.utility.secondaryText }}>
                  Copy templates from Global Templates or create your own
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('global')}
                    className="px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2"
                    style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
                  >
                    <Globe className="w-4 h-4" />
                    Browse Global
                  </button>
                  <button
                    onClick={() => navigate('/catalog-studio/template')}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Plus className="w-4 h-4" />
                    Create New
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={
                  viewType === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-3'
                }
              >
                {filteredMyTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    viewType={viewType}
                    isGlobal={false}
                    onPreview={() => setPreviewModal(template)}
                    onEdit={() => navigate(`/catalog-studio/template?templateId=${template.id}`)}
                    onDelete={() => handleDeleteMyTemplate(template.id)}
                    onExportPDF={() => handleExportPDF(template)}
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        isOpen={!!previewModal}
        onClose={() => setPreviewModal(null)}
        template={previewModal}
        onCopyToMyTemplates={handleCopyToMyTemplates}
        onExportPDF={handleExportPDF}
        isCopying={isCopying}
      />

      {/* PDF Export/Preview Modal */}
      <TemplatePDFExport
        isOpen={!!pdfModal.template}
        onClose={() => setPdfModal({ template: null, mode: 'preview' })}
        template={pdfModal.template}
        mode={pdfModal.mode}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            colors={colors}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
};

export default CatalogStudioTemplatesListPage;

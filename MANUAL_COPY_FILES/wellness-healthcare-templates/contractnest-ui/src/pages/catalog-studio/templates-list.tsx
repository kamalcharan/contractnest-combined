// src/pages/catalog-studio/templates-list.tsx
// Enhanced Template Management with Multi-Industry AMC Support
// Includes pricing, service details, terms & conditions
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
  IndianRupee,
  DollarSign,
  Euro,
  PoundSterling,
  Banknote,
  Tag,
  Thermometer,
  Zap,
  Factory,
  Pill,
  Wind,
  ArrowUpDown,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Import components
import TemplatePreviewModal from './components/TemplatePreviewModal';
import TemplatePDFExport from './components/TemplatePDFExport';

// =====================================================
// CURRENCY CONFIGURATION
// =====================================================
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

const CURRENCY_RATES: Record<CurrencyCode, { rate: number; symbol: string; name: string }> = {
  INR: { rate: 1, symbol: '\u20B9', name: 'Indian Rupee' },
  USD: { rate: 0.012, symbol: '$', name: 'US Dollar' },
  EUR: { rate: 0.011, symbol: '\u20AC', name: 'Euro' },
  GBP: { rate: 0.0095, symbol: '\u00A3', name: 'British Pound' },
  AED: { rate: 0.044, symbol: 'AED', name: 'UAE Dirham' },
  SGD: { rate: 0.016, symbol: 'S$', name: 'Singapore Dollar' },
};

const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; icon: React.ReactNode }[] = [
  { code: 'INR', label: 'INR', icon: <IndianRupee className="w-4 h-4" /> },
  { code: 'USD', label: 'USD', icon: <DollarSign className="w-4 h-4" /> },
  { code: 'EUR', label: 'EUR', icon: <Euro className="w-4 h-4" /> },
  { code: 'GBP', label: 'GBP', icon: <PoundSterling className="w-4 h-4" /> },
  { code: 'AED', label: 'AED', icon: <Banknote className="w-4 h-4" /> },
  { code: 'SGD', label: 'SGD', icon: <Banknote className="w-4 h-4" /> },
];

// =====================================================
// HELPER: FORMAT CURRENCY
// =====================================================
const formatCurrency = (
  amountInINR: number,
  targetCurrency: CurrencyCode,
  options?: { compact?: boolean; showSymbol?: boolean }
): string => {
  const { rate, symbol } = CURRENCY_RATES[targetCurrency];
  const convertedAmount = amountInINR * rate;
  const showSymbol = options?.showSymbol !== false;

  if (options?.compact) {
    if (convertedAmount >= 10000000) {
      return `${showSymbol ? symbol : ''}${(convertedAmount / 10000000).toFixed(2)}Cr`;
    } else if (convertedAmount >= 100000) {
      return `${showSymbol ? symbol : ''}${(convertedAmount / 100000).toFixed(2)}L`;
    } else if (convertedAmount >= 1000) {
      return `${showSymbol ? symbol : ''}${(convertedAmount / 1000).toFixed(1)}K`;
    }
  }

  // Format with locale-specific separators
  const formatted = new Intl.NumberFormat(targetCurrency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(convertedAmount));

  return `${showSymbol ? symbol : ''}${formatted}`;
};

// =====================================================
// BLOCK TYPES
// =====================================================
type BlockType = 'Service' | 'Spare Part' | 'Billing' | 'Text' | 'Video' | 'Image' | 'Checklist' | 'Document';

// =====================================================
// ENHANCED GLOBAL TEMPLATE INTERFACE
// =====================================================
export interface TemplatePricing {
  baseAmount: number; // Always stored in INR
  currency: CurrencyCode;
  billingFrequency: 'one-time' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  paymentType: 'advance' | 'on-completion' | 'milestone' | 'emi';
  deposit?: number;
  taxRate: number; // Percentage (e.g., 18 for GST)
}

export interface ServiceDetails {
  serviceType: 'rental' | 'amc' | 'installation' | 'repair' | 'consultation' | 'subscription';
  usageLimit?: number;
  usageLimitUnit?: 'visits' | 'hours' | 'sessions' | 'calls' | 'units';
  validityPeriod: number; // In months
  includes: string[];
}

export interface TemplateBlock {
  id: string;
  name: string;
  type: BlockType;
  description: string;
  required: boolean;
}

export interface GlobalTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  industryLabel: string;
  industryIcon: string;
  category: string;
  categoryLabel: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: string;
  blocksCount: number;
  blocks: TemplateBlock[];
  tags: string[];
  usageCount: number;
  rating: number;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
  // Enhanced fields
  pricing: TemplatePricing;
  serviceDetails: ServiceDetails;
  termsAndConditions: string[];
  cancellationPolicy: string;
}

// =====================================================
// INDUSTRIES CONFIGURATION
// =====================================================
const INDUSTRIES = [
  { id: 'all', name: 'All Industries', icon: '\uD83D\uDCCB', count: 20 },
  { id: 'healthcare', name: 'Healthcare', icon: '\uD83C\uDFE5', count: 5 },
  { id: 'wellness', name: 'Wellness & Spa', icon: '\uD83E\uDDD8', count: 3 },
  { id: 'facility-management', name: 'Facility Management', icon: '\uD83C\uDFE2', count: 4 },
  { id: 'pharma', name: 'Pharma & Biotech', icon: '\uD83D\uDC8A', count: 2 },
  { id: 'industrial', name: 'Industrial', icon: '\uD83C\uDFED', count: 3 },
  { id: 'home-healthcare', name: 'Home Healthcare', icon: '\uD83C\uDFE0', count: 3 },
];

// =====================================================
// CATEGORIES CONFIGURATION
// =====================================================
const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: '\uD83D\uDCE6', count: 20 },
  { id: 'medical-equipment', name: 'Medical Equipment', icon: '\u2695\uFE0F', count: 5 },
  { id: 'mobility-aids', name: 'Mobility Aids', icon: '\u267F', count: 2 },
  { id: 'hvac-climate', name: 'HVAC & Climate', icon: '\u2744\uFE0F', count: 3 },
  { id: 'vertical-transport', name: 'Vertical Transport', icon: '\uD83D\uDEBB', count: 2 },
  { id: 'clean-room', name: 'Clean Room', icon: '\uD83E\uDDEA', count: 2 },
  { id: 'wellness-equipment', name: 'Wellness Equipment', icon: '\uD83D\uDCAA', count: 3 },
  { id: 'home-care', name: 'Home Care', icon: '\uD83C\uDFE0', count: 3 },
];

// =====================================================
// 20 GLOBAL TEMPLATES WITH PRICING & DETAILS
// =====================================================
const GLOBAL_TEMPLATES: GlobalTemplate[] = [
  // ===== HEALTHCARE / MEDICAL EQUIPMENT =====
  {
    id: 'gt-001',
    name: 'Hospital Bed Rental',
    description: 'Complete rental agreement for hospital beds including delivery, setup, maintenance, and pickup services. Ideal for home healthcare and recovery patients.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '\uD83C\uDFE5',
    category: 'medical-equipment',
    categoryLabel: 'Medical Equipment',
    complexity: 'simple',
    estimatedDuration: '10-15 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Equipment Details', type: 'Service', description: 'Bed specifications, model, and features', required: true },
      { id: 'b2', name: 'Rental Terms', type: 'Billing', description: 'Duration, pricing, deposit, and payment schedule', required: true },
      { id: 'b3', name: 'Delivery & Setup', type: 'Service', description: 'Delivery address, setup requirements, and timing', required: false },
      { id: 'b4', name: 'Care Instructions', type: 'Document', description: 'Usage guidelines and maintenance tips', required: false },
    ],
    tags: ['rental', 'hospital-bed', 'home-care', 'medical-equipment'],
    usageCount: 234,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2024-12-01T14:30:00Z',
    pricing: {
      baseAmount: 8500,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'advance',
      deposit: 15000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'rental',
      validityPeriod: 1,
      includes: ['Delivery & Setup', 'Monthly Maintenance', 'Mattress', '24/7 Helpline', 'Pickup on Return'],
    },
    termsAndConditions: [
      'Minimum rental period of 1 month',
      'Security deposit refundable on equipment return in good condition',
      'Damage charges applicable for misuse',
      'Free replacement within 48 hours for equipment malfunction',
      'Rental can be extended with 3 days prior notice',
    ],
    cancellationPolicy: 'Full refund if cancelled within 24 hours of booking. 50% deposit forfeited for cancellation after delivery.',
  },
  {
    id: 'gt-002',
    name: 'CT Scan Machine AMC',
    description: 'Comprehensive annual maintenance contract for CT scan machines including preventive maintenance, calibration, repairs, spare parts, and emergency breakdown support.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '\uD83C\uDFE5',
    category: 'medical-equipment',
    categoryLabel: 'Medical Equipment',
    complexity: 'complex',
    estimatedDuration: '30-40 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Equipment Details', type: 'Service', description: 'CT scanner model, serial number, and specifications', required: true },
      { id: 'b2', name: 'PM Schedule', type: 'Checklist', description: 'Preventive maintenance schedule and checklist', required: true },
      { id: 'b3', name: 'Spare Parts Coverage', type: 'Spare Part', description: 'List of covered and excluded spare parts', required: true },
      { id: 'b4', name: 'Response SLA', type: 'Text', description: 'Response time and resolution commitments', required: true },
      { id: 'b5', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract value and payment terms', required: true },
      { id: 'b6', name: 'Compliance Documents', type: 'Document', description: 'AERB compliance and calibration certificates', required: true },
    ],
    tags: ['amc', 'ct-scan', 'radiology', 'medical-imaging', 'healthcare'],
    usageCount: 89,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-12-10T11:30:00Z',
    pricing: {
      baseAmount: 1200000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 4,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['4 PM Visits/Year', 'Unlimited Breakdown Calls', 'X-ray Tube Coverage (Pro-rata)', 'Software Updates', 'AERB Compliance Support', '4-Hour Response Time'],
    },
    termsAndConditions: [
      'Contract valid for 12 months from effective date',
      'Tube replacement covered on pro-rata basis based on scan count',
      'Excludes damage from power fluctuation without proper UPS',
      'Customer to provide access during working hours for PM',
      'Annual calibration by certified physicist included',
    ],
    cancellationPolicy: 'No refund for cancellation after 30 days. Pro-rata refund available within first 30 days minus service charges for visits conducted.',
  },
  {
    id: 'gt-003',
    name: 'Defibrillator AMC',
    description: 'Annual maintenance contract for AED/defibrillators including battery replacement, pad checks, firmware updates, and emergency response training.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '\uD83C\uDFE5',
    category: 'medical-equipment',
    categoryLabel: 'Medical Equipment',
    complexity: 'simple',
    estimatedDuration: '12-15 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Device Registration', type: 'Service', description: 'AED model, location, and serial numbers', required: true },
      { id: 'b2', name: 'Maintenance Schedule', type: 'Checklist', description: 'Quarterly inspection checklist', required: true },
      { id: 'b3', name: 'Consumables', type: 'Spare Part', description: 'Battery and pad replacement schedule', required: true },
      { id: 'b4', name: 'AMC Pricing', type: 'Billing', description: 'Annual fee and consumable costs', required: true },
    ],
    tags: ['amc', 'defibrillator', 'aed', 'emergency', 'life-saving'],
    usageCount: 156,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-05-20T10:00:00Z',
    updatedAt: '2024-11-15T09:30:00Z',
    pricing: {
      baseAmount: 25000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 4,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Quarterly Inspections', 'Battery Testing', 'Pad Expiry Monitoring', 'Firmware Updates', 'Staff Training (2 sessions)', 'Replacement Unit During Repair'],
    },
    termsAndConditions: [
      'Covers up to 2 AED units per contract',
      'Battery replacement at additional cost if outside warranty',
      'Training for up to 10 staff members per session',
      'Device must be accessible for quarterly inspections',
    ],
    cancellationPolicy: 'Full refund if cancelled within 15 days. No refund after first quarterly inspection.',
  },
  {
    id: 'gt-004',
    name: 'Oxygen Concentrator Rental',
    description: 'Medical oxygen concentrator rental agreement with installation, training, maintenance, and emergency support services included.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '\uD83C\uDFE0',
    category: 'medical-equipment',
    categoryLabel: 'Medical Equipment',
    complexity: 'medium',
    estimatedDuration: '15-20 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Equipment Specs', type: 'Service', description: 'Concentrator model, capacity, and features', required: true },
      { id: 'b2', name: 'Installation & Training', type: 'Service', description: 'Setup process and user training session', required: true },
      { id: 'b3', name: 'Billing & Terms', type: 'Billing', description: 'Rental rates, payment terms, and deposits', required: true },
      { id: 'b4', name: 'Emergency Support', type: 'Service', description: '24/7 support and emergency replacement', required: false },
      { id: 'b5', name: 'Usage Guide', type: 'Document', description: 'Operating instructions and safety guidelines', required: false },
    ],
    tags: ['oxygen', 'concentrator', 'respiratory', 'medical-equipment', 'rental'],
    usageCount: 156,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-04-10T13:45:00Z',
    updatedAt: '2024-12-05T16:10:00Z',
    pricing: {
      baseAmount: 12000,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'advance',
      deposit: 20000,
      taxRate: 5,
    },
    serviceDetails: {
      serviceType: 'rental',
      validityPeriod: 1,
      includes: ['Home Delivery', 'Installation & Demo', 'Backup Cylinder (5L)', 'Weekly Filter Change', '24/7 Emergency Helpline', 'Free Replacement within 4 Hours'],
    },
    termsAndConditions: [
      'Minimum rental period of 15 days',
      'Electricity cost borne by customer',
      'Equipment must be used only for prescribed patient',
      'Tampering with device voids warranty and deposit',
      'Monthly servicing included in rental',
    ],
    cancellationPolicy: 'Pro-rata refund for unused days. Full deposit refund on equipment return in working condition.',
  },
  {
    id: 'gt-005',
    name: 'Wheelchair Rental Package',
    description: 'Flexible wheelchair rental service contract covering manual and electric wheelchairs with optional accessories and maintenance support.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '\uD83C\uDFE0',
    category: 'mobility-aids',
    categoryLabel: 'Mobility Aids',
    complexity: 'simple',
    estimatedDuration: '8-12 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Wheelchair Selection', type: 'Service', description: 'Type, model, and accessories selection', required: true },
      { id: 'b2', name: 'Rental Agreement', type: 'Billing', description: 'Rental period, rates, and security deposit', required: true },
      { id: 'b3', name: 'Care Instructions', type: 'Text', description: 'Usage guidelines and maintenance tips', required: false },
      { id: 'b4', name: 'Accessory Checklist', type: 'Checklist', description: 'Additional items and attachments', required: false },
    ],
    tags: ['wheelchair', 'mobility', 'rental', 'accessibility'],
    usageCount: 189,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-05-20T09:15:00Z',
    updatedAt: '2024-11-25T11:20:00Z',
    pricing: {
      baseAmount: 3500,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'advance',
      deposit: 5000,
      taxRate: 5,
    },
    serviceDetails: {
      serviceType: 'rental',
      validityPeriod: 1,
      includes: ['Home Delivery', 'Cushion & Footrest', 'Monthly Maintenance', 'Puncture Repair', 'Replacement for Mechanical Failure'],
    },
    termsAndConditions: [
      'Minimum rental of 1 week',
      'Electric wheelchair requires additional deposit of Rs. 15,000',
      'Damage due to misuse chargeable',
      'Wheelchair must be returned clean',
    ],
    cancellationPolicy: 'Full refund if cancelled before delivery. 20% deduction for cancellation after delivery.',
  },
  // ===== WELLNESS & SPA =====
  {
    id: 'gt-006',
    name: 'Wellness Massage Package',
    description: 'Relaxation and therapeutic massage service package with multiple session options, add-on treatments, and membership benefits.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '\uD83E\uDDD8',
    category: 'wellness-equipment',
    categoryLabel: 'Wellness Equipment',
    complexity: 'simple',
    estimatedDuration: '8-10 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Massage Selection', type: 'Service', description: 'Massage types and duration options', required: true },
      { id: 'b2', name: 'Add-on Services', type: 'Service', description: 'Aromatherapy, hot stones, etc.', required: false },
      { id: 'b3', name: 'Package Pricing', type: 'Billing', description: 'Session rates and package deals', required: true },
      { id: 'b4', name: 'Health Questionnaire', type: 'Checklist', description: 'Pre-session health assessment', required: true },
    ],
    tags: ['massage', 'wellness', 'spa', 'relaxation', 'therapy'],
    usageCount: 445,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-04-18T09:00:00Z',
    updatedAt: '2024-12-10T10:15:00Z',
    pricing: {
      baseAmount: 2500,
      currency: 'INR',
      billingFrequency: 'one-time',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'consultation',
      usageLimit: 1,
      usageLimitUnit: 'sessions',
      validityPeriod: 1,
      includes: ['60-min Session', 'Aromatherapy Oils', 'Steam Room Access', 'Herbal Tea', 'Relaxation Lounge'],
    },
    termsAndConditions: [
      'Appointment required 24 hours in advance',
      'Package valid for 3 months from purchase',
      'Sessions are non-transferable',
      'Medical conditions must be disclosed before session',
    ],
    cancellationPolicy: 'Free rescheduling up to 6 hours before appointment. No-show forfeits session.',
  },
  {
    id: 'gt-007',
    name: 'Physiotherapy Session Package',
    description: 'Structured physiotherapy service package with assessment, treatment sessions, progress tracking, and home exercise programs.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '\uD83E\uDDD8',
    category: 'wellness-equipment',
    categoryLabel: 'Wellness Equipment',
    complexity: 'simple',
    estimatedDuration: '12-15 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Initial Assessment', type: 'Service', description: 'Comprehensive physical evaluation', required: true },
      { id: 'b2', name: 'Treatment Sessions', type: 'Service', description: 'Number of sessions and frequency', required: true },
      { id: 'b3', name: 'Progress Tracking', type: 'Checklist', description: 'Session notes and improvement metrics', required: true },
      { id: 'b4', name: 'Home Exercise Plan', type: 'Document', description: 'Personalized exercise program', required: false },
      { id: 'b5', name: 'Package Pricing', type: 'Billing', description: 'Session rates and package discounts', required: true },
    ],
    tags: ['physiotherapy', 'rehabilitation', 'therapy', 'wellness'],
    usageCount: 312,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-02-14T08:30:00Z',
    updatedAt: '2024-12-08T09:45:00Z',
    pricing: {
      baseAmount: 15000,
      currency: 'INR',
      billingFrequency: 'one-time',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'consultation',
      usageLimit: 10,
      usageLimitUnit: 'sessions',
      validityPeriod: 3,
      includes: ['Initial Assessment', '10 Treatment Sessions', 'Progress Report', 'Home Exercise Plan', 'WhatsApp Support'],
    },
    termsAndConditions: [
      'Package of 10 sessions valid for 3 months',
      'Sessions cannot be transferred to another person',
      'Missed sessions without 4-hour notice will be counted',
      'Doctor referral required for certain conditions',
    ],
    cancellationPolicy: 'Unused sessions refundable at 70% value. No refund after 50% sessions used.',
  },
  {
    id: 'gt-008',
    name: 'Comprehensive Health Checkup',
    description: 'Full-body health screening package with blood tests, imaging, specialist consultations, and detailed health report.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '\uD83E\uDDD8',
    category: 'wellness-equipment',
    categoryLabel: 'Wellness Equipment',
    complexity: 'medium',
    estimatedDuration: '15-18 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Test Panel', type: 'Checklist', description: 'List of included tests and screenings', required: true },
      { id: 'b2', name: 'Consultations', type: 'Service', description: 'Specialist consultations included', required: true },
      { id: 'b3', name: 'Health Report', type: 'Document', description: 'Detailed report and recommendations', required: true },
      { id: 'b4', name: 'Package Options', type: 'Billing', description: 'Basic, comprehensive, and executive packages', required: true },
      { id: 'b5', name: 'Follow-up Plan', type: 'Text', description: 'Post-checkup recommendations', required: false },
    ],
    tags: ['health-checkup', 'preventive', 'screening', 'wellness'],
    usageCount: 267,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-05-10T12:30:00Z',
    updatedAt: '2024-11-28T14:40:00Z',
    pricing: {
      baseAmount: 8999,
      currency: 'INR',
      billingFrequency: 'one-time',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 5,
    },
    serviceDetails: {
      serviceType: 'consultation',
      usageLimit: 1,
      usageLimitUnit: 'sessions',
      validityPeriod: 1,
      includes: ['70+ Blood Tests', 'ECG & Chest X-ray', 'Ultrasound Abdomen', 'Physician Consultation', 'Dietitian Consultation', 'Digital Report'],
    },
    termsAndConditions: [
      'Appointment required, fasting of 10-12 hours needed',
      'Reports delivered within 48 hours',
      'Valid for one person only',
      'Some tests may require additional preparation',
    ],
    cancellationPolicy: 'Full refund if cancelled 24 hours before appointment. 50% refund for same-day cancellation.',
  },
  // ===== HOME HEALTHCARE =====
  {
    id: 'gt-009',
    name: 'Home Nursing Care Plan',
    description: 'Comprehensive home nursing service agreement covering skilled nursing care, medication management, wound care, and patient monitoring.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '\uD83C\uDFE0',
    category: 'home-care',
    categoryLabel: 'Home Care',
    complexity: 'medium',
    estimatedDuration: '18-22 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Care Assessment', type: 'Service', description: 'Patient needs and care level assessment', required: true },
      { id: 'b2', name: 'Nursing Services', type: 'Service', description: 'Types of nursing care provided', required: true },
      { id: 'b3', name: 'Visit Schedule', type: 'Checklist', description: 'Frequency and duration of visits', required: true },
      { id: 'b4', name: 'Medication Management', type: 'Checklist', description: 'Medication administration and tracking', required: false },
      { id: 'b5', name: 'Care Plan Pricing', type: 'Billing', description: 'Hourly rates and package options', required: true },
      { id: 'b6', name: 'Emergency Protocol', type: 'Document', description: 'Emergency contact and escalation procedures', required: true },
    ],
    tags: ['nursing', 'home-care', 'healthcare', 'patient-care'],
    usageCount: 178,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-01-28T14:15:00Z',
    updatedAt: '2024-11-20T13:25:00Z',
    pricing: {
      baseAmount: 45000,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'advance',
      deposit: 10000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'subscription',
      usageLimit: 30,
      usageLimitUnit: 'visits',
      validityPeriod: 1,
      includes: ['Daily 4-Hour Visit', 'Vital Monitoring', 'Medication Administration', 'Wound Care', 'Doctor Coordination', 'Weekly Report'],
    },
    termsAndConditions: [
      '24-hour notice required for schedule changes',
      'Nurse replacement provided within 24 hours if needed',
      'Critical care patients require doctor referral',
      'Night shift available at additional 20% charge',
    ],
    cancellationPolicy: 'Pro-rata refund for unused days with 7-day notice. Immediate cancellation forfeits 7 days charges.',
  },
  {
    id: 'gt-010',
    name: 'Elderly Care Monthly Plan',
    description: 'Comprehensive monthly elderly care subscription covering daily assistance, health monitoring, medication management, and companionship services.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '\uD83C\uDFE0',
    category: 'home-care',
    categoryLabel: 'Home Care',
    complexity: 'complex',
    estimatedDuration: '22-28 min',
    blocksCount: 7,
    blocks: [
      { id: 'b1', name: 'Care Assessment', type: 'Service', description: 'Initial assessment and care plan', required: true },
      { id: 'b2', name: 'Daily Assistance', type: 'Service', description: 'ADL support and personal care', required: true },
      { id: 'b3', name: 'Health Monitoring', type: 'Checklist', description: 'Vital signs and health tracking', required: true },
      { id: 'b4', name: 'Medication Management', type: 'Checklist', description: 'Medication scheduling and reminders', required: true },
      { id: 'b5', name: 'Companionship', type: 'Service', description: 'Social engagement and activities', required: false },
      { id: 'b6', name: 'Monthly Subscription', type: 'Billing', description: 'Care level tiers and pricing', required: true },
      { id: 'b7', name: 'Family Updates', type: 'Document', description: 'Regular reports and communication', required: true },
    ],
    tags: ['elderly-care', 'senior', 'monthly-plan', 'assisted-living'],
    usageCount: 156,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-02-20T13:50:00Z',
    updatedAt: '2024-12-06T12:20:00Z',
    pricing: {
      baseAmount: 65000,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'advance',
      deposit: 15000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'subscription',
      validityPeriod: 1,
      includes: ['8-Hour Daily Caregiver', 'Meal Assistance', 'Mobility Support', 'Health Vitals Tracking', 'Weekly Doctor Visit', 'Monthly Family Report', 'Emergency Response'],
    },
    termsAndConditions: [
      'Minimum commitment of 3 months',
      'Background-verified caregivers only',
      'Caregiver change available within 48 hours',
      'Additional night care at 30% premium',
      'Festival holidays may require advance scheduling',
    ],
    cancellationPolicy: '15-day notice required. Early termination incurs 1 month penalty within first 3 months.',
  },
  {
    id: 'gt-011',
    name: 'Stairlift Installation & Maintenance',
    description: 'Complete stairlift solution including site survey, installation, safety training, warranty, and annual maintenance contract.',
    industry: 'home-healthcare',
    industryLabel: 'Home Healthcare',
    industryIcon: '\uD83C\uDFE0',
    category: 'mobility-aids',
    categoryLabel: 'Mobility Aids',
    complexity: 'complex',
    estimatedDuration: '25-30 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Site Survey', type: 'Service', description: 'Staircase measurement and assessment', required: true },
      { id: 'b2', name: 'Product Selection', type: 'Service', description: 'Stairlift model and customizations', required: true },
      { id: 'b3', name: 'Installation', type: 'Service', description: 'Professional installation and testing', required: true },
      { id: 'b4', name: 'Safety Training', type: 'Video', description: 'User training and safety demonstration', required: true },
      { id: 'b5', name: 'Warranty & Support', type: 'Document', description: 'Warranty terms and support options', required: true },
      { id: 'b6', name: 'Maintenance Contract', type: 'Billing', description: 'Annual maintenance and service pricing', required: true },
    ],
    tags: ['stairlift', 'installation', 'mobility', 'accessibility', 'maintenance'],
    usageCount: 87,
    rating: 4.5,
    isPopular: false,
    createdAt: '2024-06-05T10:40:00Z',
    updatedAt: '2024-12-02T11:50:00Z',
    pricing: {
      baseAmount: 285000,
      currency: 'INR',
      billingFrequency: 'one-time',
      paymentType: 'milestone',
      deposit: 85000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'installation',
      validityPeriod: 24,
      includes: ['Site Survey', 'Custom Rail Manufacturing', 'Professional Installation', 'User Training', '2-Year Warranty', 'First Year AMC Free'],
    },
    termsAndConditions: [
      'Site survey determines final pricing based on staircase complexity',
      'Installation typically takes 1-2 days',
      '30% advance, 50% before installation, 20% on completion',
      'Structural modifications (if needed) charged separately',
      'Warranty void if serviced by unauthorized personnel',
    ],
    cancellationPolicy: 'Advance refundable minus 10% processing fee before manufacturing. No refund once rail manufacturing begins.',
  },
  {
    id: 'gt-012',
    name: 'Medical Equipment AMC',
    description: 'Annual maintenance contract for general medical equipment including preventive maintenance, calibration, repairs, and emergency support.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '\uD83C\uDFE5',
    category: 'medical-equipment',
    categoryLabel: 'Medical Equipment',
    complexity: 'medium',
    estimatedDuration: '14-18 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Equipment Coverage', type: 'Checklist', description: 'List of covered equipment', required: true },
      { id: 'b2', name: 'Maintenance Schedule', type: 'Checklist', description: 'PM visits and calibration schedule', required: true },
      { id: 'b3', name: 'Repair Services', type: 'Service', description: 'Breakdown support and spare parts', required: true },
      { id: 'b4', name: 'Spare Parts Coverage', type: 'Spare Part', description: 'Included and excluded parts list', required: true },
      { id: 'b5', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract pricing and terms', required: true },
    ],
    tags: ['amc', 'maintenance', 'medical-equipment', 'calibration', 'support'],
    usageCount: 198,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-01-10T10:10:00Z',
    updatedAt: '2024-11-30T09:30:00Z',
    pricing: {
      baseAmount: 75000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Quarterly PM Visits', 'Unlimited Breakdown Calls', 'Labour Charges', 'Basic Spare Parts', 'Calibration Certificates', '8-Hour Response Time'],
    },
    termsAndConditions: [
      'Covers standard medical equipment (monitors, ECG, suction, etc.)',
      'High-value spares chargeable at discounted rates',
      'Equipment age must be less than 10 years',
      'Access required during business hours for PM',
    ],
    cancellationPolicy: 'Pro-rata refund available with 30-day notice. No refund in last quarter of contract.',
  },
  // ===== FACILITY MANAGEMENT - HVAC =====
  {
    id: 'gt-013',
    name: 'Split AC AMC',
    description: 'Annual maintenance contract for split air conditioners covering preventive maintenance, gas charging, cleaning, and breakdown repairs.',
    industry: 'facility-management',
    industryLabel: 'Facility Management',
    industryIcon: '\uD83C\uDFE2',
    category: 'hvac-climate',
    categoryLabel: 'HVAC & Climate',
    complexity: 'simple',
    estimatedDuration: '8-10 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'AC Unit Details', type: 'Service', description: 'Brand, model, tonnage, and location', required: true },
      { id: 'b2', name: 'Service Schedule', type: 'Checklist', description: 'Quarterly service checklist', required: true },
      { id: 'b3', name: 'Parts & Gas', type: 'Spare Part', description: 'Consumables and refrigerant coverage', required: true },
      { id: 'b4', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract fee per unit', required: true },
    ],
    tags: ['amc', 'ac', 'split-ac', 'hvac', 'cooling', 'facility'],
    usageCount: 567,
    rating: 4.6,
    isPopular: true,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-12-12T14:00:00Z',
    pricing: {
      baseAmount: 3500,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 4,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['4 Preventive Services', 'Filter Cleaning', 'Gas Top-up (up to 200g)', 'Electrical Checks', 'Unlimited Breakdown Calls', 'Labour Charges'],
    },
    termsAndConditions: [
      'Pricing per unit; discounts for bulk units',
      'Gas charging beyond 200g charged extra',
      'Compressor and PCB repairs at additional cost',
      'AC unit must be less than 8 years old',
      '48-hour response for breakdown calls',
    ],
    cancellationPolicy: 'Non-refundable after first service. Pro-rata refund if cancelled before first service.',
  },
  {
    id: 'gt-014',
    name: 'Central HVAC AMC',
    description: 'Comprehensive annual maintenance for central air conditioning systems including chillers, AHUs, cooling towers, and BMS integration.',
    industry: 'facility-management',
    industryLabel: 'Facility Management',
    industryIcon: '\uD83C\uDFE2',
    category: 'hvac-climate',
    categoryLabel: 'HVAC & Climate',
    complexity: 'complex',
    estimatedDuration: '35-45 min',
    blocksCount: 7,
    blocks: [
      { id: 'b1', name: 'System Inventory', type: 'Checklist', description: 'Complete HVAC asset list and specs', required: true },
      { id: 'b2', name: 'Chiller Service', type: 'Service', description: 'Chiller maintenance and oil analysis', required: true },
      { id: 'b3', name: 'AHU Maintenance', type: 'Service', description: 'Air handling unit servicing', required: true },
      { id: 'b4', name: 'Cooling Tower', type: 'Service', description: 'Cooling tower cleaning and treatment', required: true },
      { id: 'b5', name: 'BMS Monitoring', type: 'Service', description: 'Building management system support', required: false },
      { id: 'b6', name: 'Spare Parts', type: 'Spare Part', description: 'Parts coverage and exclusions', required: true },
      { id: 'b7', name: 'Contract Value', type: 'Billing', description: 'Annual fee and payment schedule', required: true },
    ],
    tags: ['amc', 'hvac', 'chiller', 'central-ac', 'cooling-tower', 'facility'],
    usageCount: 78,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-02-15T09:30:00Z',
    updatedAt: '2024-12-01T10:45:00Z',
    pricing: {
      baseAmount: 450000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'quarterly',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Monthly PM for Chillers', 'Quarterly AHU Service', 'Cooling Tower Treatment', 'Oil Analysis', 'Refrigerant Leak Detection', 'BMS Parameter Monitoring', '4-Hour Emergency Response'],
    },
    termsAndConditions: [
      'Contract covers system up to 500 TR capacity',
      'Refrigerant charges extra beyond normal top-up',
      'Major overhauls quoted separately',
      'Dedicated technician during business hours',
      'Annual efficiency report included',
    ],
    cancellationPolicy: 'Quarterly payment terms. 60-day notice required for termination. No refund for paid quarters.',
  },
  {
    id: 'gt-015',
    name: 'DG Set AMC',
    description: 'Annual maintenance contract for diesel generator sets including regular servicing, load bank testing, and emergency breakdown support.',
    industry: 'facility-management',
    industryLabel: 'Facility Management',
    industryIcon: '\uD83C\uDFE2',
    category: 'hvac-climate',
    categoryLabel: 'HVAC & Climate',
    complexity: 'medium',
    estimatedDuration: '15-20 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'DG Specifications', type: 'Service', description: 'Generator capacity, make, and model', required: true },
      { id: 'b2', name: 'Service Schedule', type: 'Checklist', description: 'Monthly and quarterly service items', required: true },
      { id: 'b3', name: 'Load Testing', type: 'Service', description: 'Periodic load bank testing', required: true },
      { id: 'b4', name: 'Consumables', type: 'Spare Part', description: 'Filters, oil, and parts coverage', required: true },
      { id: 'b5', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract terms', required: true },
    ],
    tags: ['amc', 'dg-set', 'generator', 'power-backup', 'facility'],
    usageCount: 234,
    rating: 4.5,
    isPopular: false,
    createdAt: '2024-03-20T11:00:00Z',
    updatedAt: '2024-11-25T09:15:00Z',
    pricing: {
      baseAmount: 28000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Monthly Service Visits', 'Oil & Filter Change (Quarterly)', 'Battery Check & Maintenance', 'Load Bank Test (Half-yearly)', 'Coolant Top-up', 'Logbook Maintenance'],
    },
    termsAndConditions: [
      'Pricing for DG up to 125 KVA; higher capacity priced separately',
      'Diesel cost borne by customer',
      'Major overhaul (alternator, engine) not covered',
      'Running hours based service intervals',
      'Pollution compliance support included',
    ],
    cancellationPolicy: 'Pro-rata refund with 30-day notice. No refund after 6 months.',
  },
  // ===== FACILITY MANAGEMENT - VERTICAL TRANSPORT =====
  {
    id: 'gt-016',
    name: 'Passenger Lift AMC',
    description: 'Annual maintenance contract for passenger elevators including regular servicing, safety inspections, modernization consultation, and 24/7 emergency support.',
    industry: 'facility-management',
    industryLabel: 'Facility Management',
    industryIcon: '\uD83C\uDFE2',
    category: 'vertical-transport',
    categoryLabel: 'Vertical Transport',
    complexity: 'medium',
    estimatedDuration: '18-22 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Lift Details', type: 'Service', description: 'Make, model, capacity, and floors', required: true },
      { id: 'b2', name: 'Service Schedule', type: 'Checklist', description: 'Monthly maintenance checklist', required: true },
      { id: 'b3', name: 'Safety Compliance', type: 'Document', description: 'Safety certifications and inspections', required: true },
      { id: 'b4', name: 'Parts Coverage', type: 'Spare Part', description: 'Included and excluded components', required: true },
      { id: 'b5', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract and payment terms', required: true },
    ],
    tags: ['amc', 'lift', 'elevator', 'passenger-lift', 'vertical-transport'],
    usageCount: 345,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-08T11:30:00Z',
    pricing: {
      baseAmount: 48000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'half-yearly',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Monthly Preventive Maintenance', 'Safety Device Testing', 'Lubrication & Cleaning', 'Minor Parts Replacement', 'Emergency Rescue Service', 'Statutory Inspection Support'],
    },
    termsAndConditions: [
      'Pricing for lift up to 8 floors; additional floors charged extra',
      'Major components (controller, motor, ropes) at additional cost',
      'Customer to ensure machine room cleanliness',
      '24/7 emergency helpline with 1-hour response',
      'Annual safety certificate assistance included',
    ],
    cancellationPolicy: 'Half-yearly payment terms. 45-day notice for cancellation. No mid-term refunds.',
  },
  {
    id: 'gt-017',
    name: 'Goods Elevator AMC',
    description: 'Annual maintenance contract for goods/freight elevators including heavy-duty servicing, load testing, and industrial-grade support.',
    industry: 'industrial',
    industryLabel: 'Industrial',
    industryIcon: '\uD83C\uDFED',
    category: 'vertical-transport',
    categoryLabel: 'Vertical Transport',
    complexity: 'medium',
    estimatedDuration: '16-20 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Elevator Specs', type: 'Service', description: 'Capacity, dimensions, and usage pattern', required: true },
      { id: 'b2', name: 'Maintenance Plan', type: 'Checklist', description: 'Heavy-duty maintenance schedule', required: true },
      { id: 'b3', name: 'Load Testing', type: 'Service', description: 'Periodic load and safety tests', required: true },
      { id: 'b4', name: 'Parts & Labour', type: 'Spare Part', description: 'Industrial parts coverage', required: true },
      { id: 'b5', name: 'Contract Pricing', type: 'Billing', description: 'Annual fee and terms', required: true },
    ],
    tags: ['amc', 'goods-lift', 'freight-elevator', 'industrial', 'warehouse'],
    usageCount: 123,
    rating: 4.5,
    isPopular: false,
    createdAt: '2024-04-10T09:00:00Z',
    updatedAt: '2024-11-20T14:00:00Z',
    pricing: {
      baseAmount: 65000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'half-yearly',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Monthly Heavy-Duty Service', 'Rope & Sheave Inspection', 'Load Test (Quarterly)', 'Door Mechanism Service', 'Safety Gear Testing', 'Emergency Breakdown Support'],
    },
    termsAndConditions: [
      'Covers goods lifts up to 2000 kg capacity',
      'Higher capacity lifts priced on assessment',
      'Operational abuse voids certain coverages',
      'Requires clear pit and machine room access',
    ],
    cancellationPolicy: 'Half-yearly payment. 60-day notice required. Pro-rata refund for unused period.',
  },
  // ===== PHARMA & BIOTECH =====
  {
    id: 'gt-018',
    name: 'Clean Room AMC',
    description: 'Annual maintenance contract for pharmaceutical clean rooms including HEPA filter replacement, particle count testing, and compliance documentation.',
    industry: 'pharma',
    industryLabel: 'Pharma & Biotech',
    industryIcon: '\uD83D\uDC8A',
    category: 'clean-room',
    categoryLabel: 'Clean Room',
    complexity: 'complex',
    estimatedDuration: '30-40 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Clean Room Classification', type: 'Service', description: 'ISO class and area specifications', required: true },
      { id: 'b2', name: 'HVAC Maintenance', type: 'Service', description: 'AHU and filter maintenance', required: true },
      { id: 'b3', name: 'Particle Monitoring', type: 'Checklist', description: 'Regular particle count testing', required: true },
      { id: 'b4', name: 'Validation Support', type: 'Document', description: 'IQ/OQ/PQ documentation', required: true },
      { id: 'b5', name: 'Filter Replacement', type: 'Spare Part', description: 'HEPA/ULPA filter schedule', required: true },
      { id: 'b6', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract value', required: true },
    ],
    tags: ['amc', 'clean-room', 'pharma', 'hepa', 'validation', 'gmp'],
    usageCount: 67,
    rating: 4.9,
    isPopular: false,
    createdAt: '2024-02-28T10:30:00Z',
    updatedAt: '2024-12-05T09:00:00Z',
    pricing: {
      baseAmount: 180000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'quarterly',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Monthly HVAC Service', 'Quarterly Particle Count', 'HEPA Filter DOP Testing', 'Pressure Differential Monitoring', 'Temperature Mapping (Annual)', 'Validation Protocol Support'],
    },
    termsAndConditions: [
      'Covers clean room up to 1000 sq ft ISO Class 7',
      'Higher class rooms and larger areas priced separately',
      'HEPA filter cost additional (typically replaced annually)',
      'Requires 24-hour advance notice for scheduled visits',
      'Compliance documentation for regulatory audits included',
    ],
    cancellationPolicy: 'Quarterly payment terms. 90-day notice for termination to allow compliance handover.',
  },
  {
    id: 'gt-019',
    name: 'Pharma Reactor AMC',
    description: 'Annual maintenance contract for pharmaceutical reactors including glass-lined vessel care, agitator servicing, and process validation support.',
    industry: 'pharma',
    industryLabel: 'Pharma & Biotech',
    industryIcon: '\uD83D\uDC8A',
    category: 'clean-room',
    categoryLabel: 'Clean Room',
    complexity: 'complex',
    estimatedDuration: '35-45 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Reactor Inventory', type: 'Checklist', description: 'Vessel specifications and capacity', required: true },
      { id: 'b2', name: 'Glass Lining Inspection', type: 'Service', description: 'Spark testing and integrity check', required: true },
      { id: 'b3', name: 'Agitator Service', type: 'Service', description: 'Seal replacement and alignment', required: true },
      { id: 'b4', name: 'Instrumentation', type: 'Service', description: 'Sensor calibration and validation', required: true },
      { id: 'b5', name: 'Spare Parts', type: 'Spare Part', description: 'Seals, gaskets, and consumables', required: true },
      { id: 'b6', name: 'Contract Value', type: 'Billing', description: 'Annual maintenance fee', required: true },
    ],
    tags: ['amc', 'reactor', 'pharma', 'glass-lined', 'api', 'manufacturing'],
    usageCount: 45,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-03-15T11:00:00Z',
    updatedAt: '2024-11-28T10:30:00Z',
    pricing: {
      baseAmount: 225000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'quarterly',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 6,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Bi-monthly Inspections', 'Glass Lining Spark Test', 'Agitator Seal Service', 'Pressure Test', 'Instrument Calibration', 'Batch Documentation Support'],
    },
    termsAndConditions: [
      'Covers reactors up to 5000L capacity',
      'Glass relining is a separate major project',
      'Shutdown coordination required for inspections',
      'Calibration certificates for regulatory compliance',
      'Emergency support during batch processing available',
    ],
    cancellationPolicy: 'Quarterly payments. 90-day notice required. Ongoing batch support continues until completion.',
  },
  // ===== INDUSTRIAL =====
  {
    id: 'gt-020',
    name: 'Industrial Compressor AMC',
    description: 'Annual maintenance contract for industrial air compressors including preventive maintenance, oil analysis, valve servicing, and efficiency optimization.',
    industry: 'industrial',
    industryLabel: 'Industrial',
    industryIcon: '\uD83C\uDFED',
    category: 'hvac-climate',
    categoryLabel: 'HVAC & Climate',
    complexity: 'medium',
    estimatedDuration: '18-22 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Compressor Details', type: 'Service', description: 'Make, model, CFM, and pressure rating', required: true },
      { id: 'b2', name: 'Service Schedule', type: 'Checklist', description: 'Monthly and quarterly service items', required: true },
      { id: 'b3', name: 'Oil & Filter', type: 'Spare Part', description: 'Consumables and replacement schedule', required: true },
      { id: 'b4', name: 'Energy Audit', type: 'Document', description: 'Efficiency monitoring and reporting', required: false },
      { id: 'b5', name: 'AMC Pricing', type: 'Billing', description: 'Annual contract terms', required: true },
    ],
    tags: ['amc', 'compressor', 'industrial', 'pneumatic', 'air-compressor'],
    usageCount: 189,
    rating: 4.6,
    isPopular: false,
    createdAt: '2024-04-25T10:00:00Z',
    updatedAt: '2024-12-01T11:00:00Z',
    pricing: {
      baseAmount: 45000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'advance',
      deposit: 0,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'amc',
      usageLimit: 12,
      usageLimitUnit: 'visits',
      validityPeriod: 12,
      includes: ['Monthly Service Visits', 'Oil Change (Quarterly)', 'Air Filter Replacement', 'Valve Inspection', 'Belt Replacement', 'Efficiency Report (Half-yearly)'],
    },
    termsAndConditions: [
      'Covers screw/piston compressors up to 100 HP',
      'Larger compressors priced on assessment',
      'Running hours determine service intervals',
      'Dryer and receiver tank service available as add-on',
      'Energy audit recommendations provided',
    ],
    cancellationPolicy: 'Pro-rata refund with 30-day notice. No refund in final quarter.',
  },
];

// =====================================================
// TYPES
// =====================================================
type ViewType = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'rating' | 'name' | 'price-low' | 'price-high';
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
// BILLING FREQUENCY DISPLAY HELPER
// =====================================================
const getBillingFrequencyLabel = (frequency: TemplatePricing['billingFrequency']): string => {
  switch (frequency) {
    case 'one-time': return '';
    case 'monthly': return '/month';
    case 'quarterly': return '/quarter';
    case 'half-yearly': return '/6 months';
    case 'yearly': return '/year';
    default: return '';
  }
};

// =====================================================
// TEMPLATE CARD COMPONENT
// =====================================================
const TemplateCard: React.FC<{
  template: GlobalTemplate | MyTemplate;
  viewType: ViewType;
  isGlobal: boolean;
  selectedCurrency: CurrencyCode;
  onPreview: () => void;
  onCopyToMyTemplates?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExportPDF?: () => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ template, viewType, isGlobal, selectedCurrency, onPreview, onCopyToMyTemplates, onEdit, onDelete, onExportPDF, colors, isDarkMode }) => {
  const [showActions, setShowActions] = useState(false);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return colors.semantic.success;
      case 'medium': return colors.semantic.warning;
      case 'complex': return colors.semantic.error;
      default: return colors.utility.secondaryText;
    }
  };

  const formattedPrice = formatCurrency(template.pricing.baseAmount, selectedCurrency);
  const billingLabel = getBillingFrequencyLabel(template.pricing.billingFrequency);

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

          {/* Pricing - List View */}
          <div
            className="px-3 py-2 rounded-lg text-center min-w-[120px]"
            style={{ backgroundColor: colors.semantic.success + '10' }}
          >
            <div className="font-bold text-base" style={{ color: colors.semantic.success }}>
              {formattedPrice}
            </div>
            {billingLabel && (
              <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                {billingLabel}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs" style={{ color: colors.utility.secondaryText }}>
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
      className="rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1 group relative"
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
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            {template.industryLabel}
          </span>
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>|</span>
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            {template.categoryLabel}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Pricing Display - Grid View */}
        <div
          className="rounded-lg p-3 mb-3 text-center"
          style={{ backgroundColor: colors.semantic.success + '10' }}
        >
          <div className="font-bold text-xl" style={{ color: colors.semantic.success }}>
            {formattedPrice}
          </div>
          {billingLabel && (
            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {billingLabel}
            </div>
          )}
          {template.pricing.deposit && template.pricing.deposit > 0 && (
            <div className="text-[10px] mt-1" style={{ color: colors.utility.secondaryText }}>
              + {formatCurrency(template.pricing.deposit, selectedCurrency)} deposit
            </div>
          )}
        </div>

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

        {/* Service Details Preview */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.serviceDetails.includes.slice(0, 3).map((item, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.brand.primary + '10', color: colors.brand.primary }}
            >
              {item}
            </span>
          ))}
          {template.serviceDetails.includes.length > 3 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.utility.secondaryText + '15', color: colors.utility.secondaryText }}
            >
              +{template.serviceDetails.includes.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: colors.utility.secondaryText }}>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {template.estimatedDuration}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {template.serviceDetails.validityPeriod}M validity
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
// CURRENCY SELECTOR COMPONENT
// =====================================================
const CurrencySelector: React.FC<{
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  colors: Record<string, any>;
  isDarkMode: boolean;
}> = ({ selectedCurrency, onCurrencyChange, colors, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = CURRENCY_OPTIONS.find(c => c.code === selectedCurrency);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: colors.utility.secondaryText + '40',
          color: colors.utility.primaryText,
        }}
      >
        {selectedOption?.icon}
        {selectedOption?.label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-50"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.secondaryText + '20',
            }}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <button
                key={option.code}
                onClick={() => {
                  onCurrencyChange(option.code);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
                style={{
                  color: colors.utility.primaryText,
                  backgroundColor: selectedCurrency === option.code ? colors.brand.primary + '10' : 'transparent',
                }}
              >
                {option.icon}
                <span className="flex-1">{CURRENCY_RATES[option.code].name}</span>
                <span style={{ color: colors.utility.secondaryText }}>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR');
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

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.tags.some((tag) => tag.toLowerCase().includes(term)) ||
          t.industryLabel.toLowerCase().includes(term) ||
          t.categoryLabel.toLowerCase().includes(term)
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
      case 'price-low':
        result.sort((a, b) => a.pricing.baseAmount - b.pricing.baseAmount);
        break;
      case 'price-high':
        result.sort((a, b) => b.pricing.baseAmount - a.pricing.baseAmount);
        break;
    }

    return result;
  }, [selectedIndustry, selectedCategory, searchTerm, sortBy]);

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
      case 'price-low':
        result.sort((a, b) => a.pricing.baseAmount - b.pricing.baseAmount);
        break;
      case 'price-high':
        result.sort((a, b) => b.pricing.baseAmount - a.pricing.baseAmount);
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

  // Calculate dynamic industry counts based on current category filter
  const industryCountsForCurrentCategory = useMemo(() => {
    const counts: Record<string, number> = { all: GLOBAL_TEMPLATES.length };
    INDUSTRIES.forEach(ind => {
      if (ind.id !== 'all') {
        const filtered = GLOBAL_TEMPLATES.filter(t =>
          t.industry === ind.id && (selectedCategory === 'all' || t.category === selectedCategory)
        );
        counts[ind.id] = filtered.length;
      }
    });
    if (selectedCategory !== 'all') {
      counts['all'] = GLOBAL_TEMPLATES.filter(t => t.category === selectedCategory).length;
    }
    return counts;
  }, [selectedCategory]);

  // Calculate dynamic category counts based on current industry filter
  const categoryCountsForCurrentIndustry = useMemo(() => {
    const counts: Record<string, number> = { all: GLOBAL_TEMPLATES.length };
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'all') {
        const filtered = GLOBAL_TEMPLATES.filter(t =>
          t.category === cat.id && (selectedIndustry === 'all' || t.industry === selectedIndustry)
        );
        counts[cat.id] = filtered.length;
      }
    });
    if (selectedIndustry !== 'all') {
      counts['all'] = GLOBAL_TEMPLATES.filter(t => t.industry === selectedIndustry).length;
    }
    return counts;
  }, [selectedIndustry]);

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
                AMC & Service Contract Templates for Multiple Industries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Currency Selector */}
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
              colors={colors}
              isDarkMode={isDarkMode}
            />
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

      {/* Industry Filter Row (Global Tab Only) */}
      {activeTab === 'global' && (
        <div
          className="px-6 py-3 border-b overflow-x-auto"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : colors.brand.primary + '03',
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-sm font-medium mr-2 flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
              <Factory className="w-4 h-4" />
              Industry:
            </span>
            {INDUSTRIES.map((industry) => (
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
                  {industryCountsForCurrentCategory[industry.id] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Row (Global Tab Only) */}
      {activeTab === 'global' && (
        <div
          className="px-6 py-3 border-b overflow-x-auto"
          style={{
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-sm font-medium mr-2 flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
              <Tag className="w-4 h-4" />
              Category:
            </span>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: selectedCategory === category.id ? colors.brand.secondary || colors.semantic.info : 'transparent',
                  borderColor: selectedCategory === category.id ? colors.brand.secondary || colors.semantic.info : colors.utility.secondaryText + '30',
                  color: selectedCategory === category.id ? '#FFFFFF' : colors.utility.primaryText,
                }}
              >
                <span>{category.icon}</span>
                {category.name}
                <span
                  className="text-xs px-1.5 rounded-full"
                  style={{
                    backgroundColor: selectedCategory === category.id ? 'rgba(255,255,255,0.2)' : colors.utility.secondaryText + '15',
                  }}
                >
                  {categoryCountsForCurrentIndustry[category.id] || 0}
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
              placeholder="Search templates by name, industry, category..."
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
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
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
                {(selectedIndustry !== 'all' || selectedCategory !== 'all') && (
                  <button
                    onClick={() => { setSelectedIndustry('all'); setSelectedCategory('all'); }}
                    className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border"
                    style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
                  >
                    Clear Filters
                  </button>
                )}
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
                    selectedCurrency={selectedCurrency}
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
                    selectedCurrency={selectedCurrency}
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

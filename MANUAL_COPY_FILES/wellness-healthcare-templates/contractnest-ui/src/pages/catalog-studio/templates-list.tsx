// src/pages/catalog-studio/templates-list.tsx
// REDESIGNED: Premium UX with WOW factor + Tenant Theme Support
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
  FileText,
  Eye,
  Copy,
  MoreVertical,
  Users,
  TrendingUp,
  Globe,
  Layers,
  CheckCircle,
  Heart,
  Download,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  BadgeCheck,
  Timer,
  IndianRupee,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTenantProfile } from '../../hooks/useTenantProfile';

// =====================================================
// COLOR UTILITY FUNCTIONS (for tenant theme variations)
// =====================================================
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const lightenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * (percent / 100),
    rgb.g + (255 - rgb.g) * (percent / 100),
    rgb.b + (255 - rgb.b) * (percent / 100)
  );
};

const darkenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r * (1 - percent / 100),
    rgb.g * (1 - percent / 100),
    rgb.b * (1 - percent / 100)
  );
};

const withOpacity = (hex: string, opacity: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

// =====================================================
// TYPES & INTERFACES
// =====================================================
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

interface TemplatePricing {
  baseAmount: number;
  currency: 'INR';
  billingFrequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'per-session' | 'per-visit';
  paymentType: 'prepaid' | 'postpaid';
  depositRequired: boolean;
  depositAmount?: number;
  taxRate: number;
}

interface ServiceDetails {
  serviceType: 'limited' | 'unlimited';
  usageLimit?: number;
  usagePeriod?: string;
  validityPeriod: string;
  includes: string[];
  excludes: string[];
}

interface TemplateBlock {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface GlobalTemplate {
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
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  pricing: TemplatePricing;
  serviceDetails: ServiceDetails;
  termsAndConditions: string[];
  cancellationPolicy: string;
  gradient?: string;
}

// =====================================================
// CURRENCY CONFIG
// =====================================================
const CURRENCY_CONFIG: Record<CurrencyCode, { rate: number; symbol: string }> = {
  INR: { rate: 1, symbol: '₹' },
  USD: { rate: 0.012, symbol: '$' },
  EUR: { rate: 0.011, symbol: '€' },
  GBP: { rate: 0.0095, symbol: '£' },
  AED: { rate: 0.044, symbol: 'د.إ' },
  SGD: { rate: 0.016, symbol: 'S$' },
};

const formatCurrency = (amount: number, currency: CurrencyCode): string => {
  const { rate, symbol } = CURRENCY_CONFIG[currency];
  const converted = amount * rate;
  if (converted >= 100000) return `${symbol}${(converted / 100000).toFixed(1)}L`;
  if (converted >= 1000) return `${symbol}${(converted / 1000).toFixed(0)}K`;
  return `${symbol}${converted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatFullCurrency = (amount: number, currency: CurrencyCode): string => {
  const { rate, symbol } = CURRENCY_CONFIG[currency];
  const converted = amount * rate;
  return `${symbol}${converted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// =====================================================
// CATEGORIES (Single Filter System)
// =====================================================
const CATEGORIES = [
  { id: 'all', name: 'All Templates', emoji: '✨', color: 'from-violet-500 to-purple-600' },
  { id: 'healthcare', name: 'Healthcare', emoji: '🏥', color: 'from-red-500 to-pink-600' },
  { id: 'wellness', name: 'Wellness', emoji: '🧘', color: 'from-emerald-500 to-teal-600' },
  { id: 'hvac', name: 'HVAC & Climate', emoji: '❄️', color: 'from-cyan-500 to-blue-600' },
  { id: 'lifts', name: 'Lifts & Elevators', emoji: '🛗', color: 'from-amber-500 to-orange-600' },
  { id: 'industrial', name: 'Industrial', emoji: '🏭', color: 'from-slate-500 to-zinc-600' },
  { id: 'pharma', name: 'Pharma', emoji: '💊', color: 'from-fuchsia-500 to-pink-600' },
];

// =====================================================
// GLOBAL TEMPLATES DATA
// =====================================================
const GLOBAL_TEMPLATES: GlobalTemplate[] = [
  // FEATURED - CT Scan AMC
  {
    id: 'gt-001',
    name: 'CT Scan Machine AMC',
    description: 'Comprehensive annual maintenance for CT scanners with 4-hour response SLA, tube coverage, and AERB compliance support.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Medical Equipment',
    complexity: 'complex',
    estimatedDuration: '30-40 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Equipment Registration', type: 'Service', description: 'CT scanner details and specifications', required: true },
      { id: 'b2', name: 'PM Schedule', type: 'Checklist', description: 'Quarterly preventive maintenance', required: true },
      { id: 'b3', name: 'Spare Parts Coverage', type: 'Spare Part', description: 'Parts included in AMC', required: true },
      { id: 'b4', name: 'SLA Terms', type: 'Text', description: 'Response and resolution times', required: true },
      { id: 'b5', name: 'Billing Schedule', type: 'Billing', description: 'Payment milestones', required: true },
      { id: 'b6', name: 'Compliance Docs', type: 'Document', description: 'AERB certificates', required: true },
    ],
    tags: ['CT Scan', 'Radiology', 'AMC', 'Healthcare'],
    usageCount: 89,
    rating: 4.9,
    isPopular: true,
    isFeatured: true,
    createdAt: '2024-03-10',
    updatedAt: '2024-12-10',
    pricing: {
      baseAmount: 1200000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 4,
      usagePeriod: 'PM visits/year',
      validityPeriod: '12 Months',
      includes: ['4 PM Visits', 'Unlimited Breakdowns', 'X-Ray Tube (Pro-rata)', 'Software Updates', 'AERB Support', '4-Hour Response'],
      excludes: ['Gantry damage from external factors', 'Power surge damage without UPS'],
    },
    termsAndConditions: [
      'Contract valid for 12 months from effective date',
      'Tube replacement on pro-rata basis based on scan count',
      'Customer to provide access during working hours',
    ],
    cancellationPolicy: 'Pro-rata refund within first 30 days minus service charges.',
    gradient: 'from-red-500 via-pink-500 to-rose-600',
  },
  // FEATURED - Central HVAC
  {
    id: 'gt-002',
    name: 'Central HVAC System AMC',
    description: 'Complete maintenance package for central air conditioning systems including chillers, AHUs, and ductwork.',
    industry: 'hvac',
    industryLabel: 'HVAC & Climate',
    industryIcon: '❄️',
    category: 'hvac',
    categoryLabel: 'Climate Control',
    complexity: 'complex',
    estimatedDuration: '25-35 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'System Inventory', type: 'Service', description: 'All HVAC units and specs', required: true },
      { id: 'b2', name: 'PM Checklist', type: 'Checklist', description: 'Monthly maintenance tasks', required: true },
      { id: 'b3', name: 'Consumables', type: 'Spare Part', description: 'Filters, belts, refrigerant', required: true },
      { id: 'b4', name: 'Energy Audit', type: 'Document', description: 'Quarterly efficiency reports', required: false },
      { id: 'b5', name: 'Contract Value', type: 'Billing', description: 'Annual fee breakdown', required: true },
    ],
    tags: ['HVAC', 'Central AC', 'Chiller', 'AMC'],
    usageCount: 156,
    rating: 4.8,
    isPopular: true,
    isFeatured: true,
    createdAt: '2024-02-15',
    updatedAt: '2024-12-08',
    pricing: {
      baseAmount: 850000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '12 Months',
      includes: ['Monthly PM Visits', 'Unlimited Breakdown Calls', 'Filter Replacement', 'Refrigerant Top-up', '24/7 Emergency Support', 'Energy Efficiency Reports'],
      excludes: ['Compressor replacement', 'Major refrigerant leaks', 'Structural duct repairs'],
    },
    termsAndConditions: [
      'Covers central plant and all connected AHUs',
      'Refrigerant top-up limited to 10kg per year',
      'Emergency response within 4 hours',
    ],
    cancellationPolicy: '30-day notice required. Pro-rata refund for remaining period.',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
  },
  // FEATURED - Passenger Lift
  {
    id: 'gt-003',
    name: 'Passenger Lift AMC',
    description: 'Annual maintenance contract for passenger elevators with safety compliance, modernization support, and 24/7 emergency rescue.',
    industry: 'lifts',
    industryLabel: 'Lifts & Elevators',
    industryIcon: '🛗',
    category: 'lifts',
    categoryLabel: 'Vertical Transport',
    complexity: 'medium',
    estimatedDuration: '20-25 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Lift Details', type: 'Service', description: 'Make, model, capacity, floors', required: true },
      { id: 'b2', name: 'Safety Inspection', type: 'Checklist', description: 'Monthly safety checks', required: true },
      { id: 'b3', name: 'Parts Coverage', type: 'Spare Part', description: 'Included replacements', required: true },
      { id: 'b4', name: 'Emergency Protocol', type: 'Text', description: '24/7 rescue SLA', required: true },
      { id: 'b5', name: 'AMC Fees', type: 'Billing', description: 'Quarterly payment schedule', required: true },
    ],
    tags: ['Elevator', 'Lift', 'AMC', 'Safety'],
    usageCount: 234,
    rating: 4.7,
    isPopular: true,
    isFeatured: true,
    createdAt: '2024-01-20',
    updatedAt: '2024-12-05',
    pricing: {
      baseAmount: 48000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '12 Months',
      includes: ['Monthly Preventive Maintenance', 'Safety Certificate Support', 'Unlimited Breakdown Visits', '30-min Emergency Response', 'Lubrication & Cleaning', 'Minor Parts Replacement'],
      excludes: ['Major parts (motor, controller)', 'Cabin interiors', 'Vandalism damage'],
    },
    termsAndConditions: [
      'Valid for lifts up to 10 floors',
      'Higher floors attract additional charges',
      'Annual safety certification support included',
    ],
    cancellationPolicy: '60-day notice. No refund after 6 months.',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
  },
  // Hospital Bed Rental
  {
    id: 'gt-004',
    name: 'Hospital Bed Rental',
    description: 'Premium motorized hospital bed rental with mattress, side rails, and home delivery setup.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Medical Equipment',
    complexity: 'simple',
    estimatedDuration: '10-15 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Bed Selection', type: 'Service', description: 'Model and features', required: true },
      { id: 'b2', name: 'Rental Terms', type: 'Billing', description: 'Duration and deposit', required: true },
      { id: 'b3', name: 'Delivery Setup', type: 'Service', description: 'Address and timing', required: true },
      { id: 'b4', name: 'Care Guide', type: 'Document', description: 'Usage instructions', required: false },
    ],
    tags: ['Hospital Bed', 'Rental', 'Home Care'],
    usageCount: 312,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-04-10',
    updatedAt: '2024-12-01',
    pricing: {
      baseAmount: 8500,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'prepaid',
      depositRequired: true,
      depositAmount: 15000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '1 Month (Renewable)',
      includes: ['Motorized Bed', 'Medical Mattress', 'Side Rails', 'Free Delivery', 'Setup & Demo', 'Monthly Maintenance'],
      excludes: ['Bed linen', 'Patient care services'],
    },
    termsAndConditions: [
      'Minimum rental: 1 month',
      'Deposit refundable on return',
      'Free replacement for defects',
    ],
    cancellationPolicy: 'Full refund within 24hrs. 50% deposit after delivery.',
  },
  // Oxygen Concentrator
  {
    id: 'gt-005',
    name: 'Oxygen Concentrator Rental',
    description: 'Medical-grade oxygen concentrator with backup cylinder, 24/7 support, and emergency replacement.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Medical Equipment',
    complexity: 'medium',
    estimatedDuration: '15-20 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Equipment Specs', type: 'Service', description: 'Model and capacity', required: true },
      { id: 'b2', name: 'Installation', type: 'Service', description: 'Setup and training', required: true },
      { id: 'b3', name: 'Rental Billing', type: 'Billing', description: 'Rates and deposit', required: true },
      { id: 'b4', name: 'Emergency SLA', type: 'Text', description: '24/7 support terms', required: true },
      { id: 'b5', name: 'User Manual', type: 'Document', description: 'Operating guide', required: false },
    ],
    tags: ['Oxygen', 'Respiratory', 'Rental', 'Emergency'],
    usageCount: 278,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-03-15',
    updatedAt: '2024-12-10',
    pricing: {
      baseAmount: 12000,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'prepaid',
      depositRequired: true,
      depositAmount: 20000,
      taxRate: 5,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '1 Month (Renewable)',
      includes: ['10L Concentrator', 'Backup Cylinder', 'Pulse Oximeter', 'Home Delivery', '24/7 Helpline', '4-Hour Replacement'],
      excludes: ['Electricity cost', 'Nasal cannula replacement'],
    },
    termsAndConditions: [
      'Minimum rental: 15 days',
      'Must be used for prescribed patient only',
      'Weekly filter cleaning included',
    ],
    cancellationPolicy: 'Pro-rata refund for unused days. Full deposit on equipment return.',
  },
  // Defibrillator AMC
  {
    id: 'gt-006',
    name: 'Defibrillator AMC',
    description: 'Annual maintenance for AED devices with battery checks, pad replacement, and staff training.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Medical Equipment',
    complexity: 'simple',
    estimatedDuration: '12-15 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'AED Registration', type: 'Service', description: 'Device details', required: true },
      { id: 'b2', name: 'Inspection Schedule', type: 'Checklist', description: 'Quarterly checks', required: true },
      { id: 'b3', name: 'Consumables', type: 'Spare Part', description: 'Battery and pads', required: true },
      { id: 'b4', name: 'Training Sessions', type: 'Service', description: 'CPR/AED training', required: false },
    ],
    tags: ['AED', 'Defibrillator', 'Emergency', 'AMC'],
    usageCount: 145,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-05-20',
    updatedAt: '2024-11-15',
    pricing: {
      baseAmount: 25000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 4,
      usagePeriod: 'inspections/year',
      validityPeriod: '12 Months',
      includes: ['Quarterly Inspections', 'Battery Testing', 'Pad Monitoring', 'Firmware Updates', '2 Training Sessions'],
      excludes: ['Battery replacement (if out of warranty)', 'Additional training sessions'],
    },
    termsAndConditions: [
      'Covers up to 2 AED units',
      'Training for up to 10 staff per session',
      'Device must be accessible for inspections',
    ],
    cancellationPolicy: 'Full refund within 15 days. No refund after first inspection.',
  },
  // Wellness Massage
  {
    id: 'gt-007',
    name: 'Wellness Massage Package',
    description: 'Premium spa experience with aromatherapy, choice of massage styles, and relaxation amenities.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '🧘',
    category: 'wellness',
    categoryLabel: 'Spa Services',
    complexity: 'simple',
    estimatedDuration: '8-10 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Massage Type', type: 'Service', description: 'Style and duration', required: true },
      { id: 'b2', name: 'Add-ons', type: 'Service', description: 'Extra treatments', required: false },
      { id: 'b3', name: 'Pricing', type: 'Billing', description: 'Session cost', required: true },
      { id: 'b4', name: 'Health Form', type: 'Checklist', description: 'Pre-session assessment', required: true },
    ],
    tags: ['Massage', 'Spa', 'Wellness', 'Relaxation'],
    usageCount: 567,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-04-18',
    updatedAt: '2024-12-10',
    pricing: {
      baseAmount: 2500,
      currency: 'INR',
      billingFrequency: 'per-session',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 1,
      usagePeriod: 'session',
      validityPeriod: '3 Months',
      includes: ['60-min Massage', 'Aromatherapy Oils', 'Steam Room', 'Herbal Tea', 'Relaxation Lounge'],
      excludes: ['Extended sessions', 'Take-home products'],
    },
    termsAndConditions: [
      'Book 24 hours in advance',
      'Valid for 3 months',
      'Non-transferable',
    ],
    cancellationPolicy: 'Free reschedule up to 6 hours before. No-show forfeits session.',
  },
  // Physiotherapy
  {
    id: 'gt-008',
    name: 'Physiotherapy Sessions',
    description: 'Professional physiotherapy with assessment, treatment plan, and home exercise program.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '🧘',
    category: 'wellness',
    categoryLabel: 'Rehabilitation',
    complexity: 'medium',
    estimatedDuration: '12-15 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Assessment', type: 'Service', description: 'Initial evaluation', required: true },
      { id: 'b2', name: 'Treatment Plan', type: 'Text', description: 'Session outline', required: true },
      { id: 'b3', name: 'Session Package', type: 'Billing', description: 'Package pricing', required: true },
      { id: 'b4', name: 'Progress Tracking', type: 'Checklist', description: 'Outcome measures', required: true },
      { id: 'b5', name: 'Home Program', type: 'Document', description: 'Exercise guide', required: false },
    ],
    tags: ['Physio', 'Rehabilitation', 'Therapy', 'Exercise'],
    usageCount: 389,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-02-10',
    updatedAt: '2024-12-08',
    pricing: {
      baseAmount: 1500,
      currency: 'INR',
      billingFrequency: 'per-session',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 1,
      usagePeriod: 'session',
      validityPeriod: '6 Months',
      includes: ['45-min Session', 'Assessment Report', 'Treatment Modalities', 'Exercise Prescription', 'Progress Notes'],
      excludes: ['Home visits', 'Equipment purchase'],
    },
    termsAndConditions: [
      'Package of 10 sessions recommended',
      'Valid for 6 months',
      'Doctor referral may be required',
    ],
    cancellationPolicy: 'Reschedule up to 4 hours before. Late cancel loses session.',
  },
  // Split AC AMC
  {
    id: 'gt-009',
    name: 'Split AC AMC',
    description: 'Comprehensive maintenance for split air conditioners with gas top-up, filter cleaning, and breakdown support.',
    industry: 'hvac',
    industryLabel: 'HVAC & Climate',
    industryIcon: '❄️',
    category: 'hvac',
    categoryLabel: 'Room AC',
    complexity: 'simple',
    estimatedDuration: '10-12 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'AC Details', type: 'Service', description: 'Make, model, tonnage', required: true },
      { id: 'b2', name: 'Service Schedule', type: 'Checklist', description: 'Bi-annual service', required: true },
      { id: 'b3', name: 'Coverage', type: 'Spare Part', description: 'Parts included', required: true },
      { id: 'b4', name: 'AMC Fee', type: 'Billing', description: 'Annual cost', required: true },
    ],
    tags: ['AC', 'Split AC', 'AMC', 'Cooling'],
    usageCount: 892,
    rating: 4.6,
    isPopular: true,
    createdAt: '2024-03-01',
    updatedAt: '2024-12-05',
    pricing: {
      baseAmount: 3500,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 2,
      usagePeriod: 'services/year',
      validityPeriod: '12 Months',
      includes: ['2 PM Visits', 'Filter Cleaning', 'Gas Top-up (up to 200g)', 'Coil Cleaning', 'Electrical Check'],
      excludes: ['Compressor replacement', 'PCB repair', 'Major gas leaks'],
    },
    termsAndConditions: [
      'Per unit pricing',
      'Multi-unit discount available',
      'Summer months may have delayed response',
    ],
    cancellationPolicy: 'No refund after first service visit.',
  },
  // DG Set AMC
  {
    id: 'gt-010',
    name: 'DG Set AMC',
    description: 'Diesel generator maintenance with oil change, load bank testing, and emergency breakdown support.',
    industry: 'industrial',
    industryLabel: 'Industrial',
    industryIcon: '🏭',
    category: 'industrial',
    categoryLabel: 'Power Backup',
    complexity: 'medium',
    estimatedDuration: '20-25 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'DG Specs', type: 'Service', description: 'Make, kVA, serial number', required: true },
      { id: 'b2', name: 'PM Schedule', type: 'Checklist', description: 'Monthly checks', required: true },
      { id: 'b3', name: 'Consumables', type: 'Spare Part', description: 'Oil, filters, belts', required: true },
      { id: 'b4', name: 'Load Testing', type: 'Document', description: 'Quarterly reports', required: true },
      { id: 'b5', name: 'AMC Value', type: 'Billing', description: 'Annual contract', required: true },
    ],
    tags: ['Generator', 'DG Set', 'Power', 'AMC'],
    usageCount: 234,
    rating: 4.7,
    isPopular: false,
    createdAt: '2024-01-15',
    updatedAt: '2024-11-30',
    pricing: {
      baseAmount: 75000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 12,
      usagePeriod: 'visits/year',
      validityPeriod: '12 Months',
      includes: ['Monthly PM', 'Oil Change (2x)', 'Filter Replacement', 'Load Bank Testing', 'Emergency Support', 'Battery Check'],
      excludes: ['Major overhauls', 'Alternator rewinding', 'Fuel'],
    },
    termsAndConditions: [
      'For DG sets up to 250 kVA',
      'Higher capacity at additional cost',
      'Fuel to be provided by customer',
    ],
    cancellationPolicy: 'Pro-rata refund minus services rendered.',
  },
  // Goods Elevator
  {
    id: 'gt-011',
    name: 'Goods Elevator AMC',
    description: 'Heavy-duty goods lift maintenance with safety compliance and emergency rescue services.',
    industry: 'lifts',
    industryLabel: 'Lifts & Elevators',
    industryIcon: '🛗',
    category: 'lifts',
    categoryLabel: 'Goods Lift',
    complexity: 'medium',
    estimatedDuration: '20-25 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Lift Details', type: 'Service', description: 'Capacity and floors', required: true },
      { id: 'b2', name: 'Safety Checks', type: 'Checklist', description: 'Monthly inspections', required: true },
      { id: 'b3', name: 'Parts Coverage', type: 'Spare Part', description: 'Included items', required: true },
      { id: 'b4', name: 'Emergency SLA', type: 'Text', description: 'Rescue protocol', required: true },
      { id: 'b5', name: 'AMC Cost', type: 'Billing', description: 'Quarterly payments', required: true },
    ],
    tags: ['Goods Lift', 'Elevator', 'Industrial', 'AMC'],
    usageCount: 167,
    rating: 4.6,
    isPopular: false,
    createdAt: '2024-02-20',
    updatedAt: '2024-11-25',
    pricing: {
      baseAmount: 65000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '12 Months',
      includes: ['Monthly PM', 'Safety Certification', 'Unlimited Breakdowns', '1-Hour Response', 'Lubrication', 'Minor Parts'],
      excludes: ['Motor replacement', 'Controller upgrade', 'Cabin repairs'],
    },
    termsAndConditions: [
      'For lifts up to 2000kg capacity',
      'Higher capacity lifts priced separately',
      'Annual safety test support included',
    ],
    cancellationPolicy: '60-day notice required. No refund after 6 months.',
  },
  // Clean Room AMC
  {
    id: 'gt-012',
    name: 'Clean Room AMC',
    description: 'Certified clean room maintenance with HEPA filter changes, particle counts, and compliance documentation.',
    industry: 'pharma',
    industryLabel: 'Pharma & Biotech',
    industryIcon: '💊',
    category: 'pharma',
    categoryLabel: 'Clean Room',
    complexity: 'complex',
    estimatedDuration: '30-40 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Room Classification', type: 'Service', description: 'ISO class and specs', required: true },
      { id: 'b2', name: 'HEPA Schedule', type: 'Checklist', description: 'Filter maintenance', required: true },
      { id: 'b3', name: 'Particle Monitoring', type: 'Document', description: 'Count reports', required: true },
      { id: 'b4', name: 'Consumables', type: 'Spare Part', description: 'Filters and gaskets', required: true },
      { id: 'b5', name: 'Validation', type: 'Document', description: 'Compliance certs', required: true },
      { id: 'b6', name: 'AMC Value', type: 'Billing', description: 'Contract pricing', required: true },
    ],
    tags: ['Clean Room', 'Pharma', 'HEPA', 'Compliance'],
    usageCount: 78,
    rating: 4.9,
    isPopular: false,
    createdAt: '2024-04-05',
    updatedAt: '2024-12-01',
    pricing: {
      baseAmount: 250000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 4,
      usagePeriod: 'certifications/year',
      validityPeriod: '12 Months',
      includes: ['Quarterly HEPA Integrity', 'Monthly Particle Counts', 'Filter Changes', 'Pressure Monitoring', 'Compliance Documentation', 'Audit Support'],
      excludes: ['Civil modifications', 'AHU repairs', 'Major contamination cleanup'],
    },
    termsAndConditions: [
      'For clean rooms up to 500 sq ft',
      'Larger rooms priced per sq ft',
      'Customer to maintain temperature and humidity',
    ],
    cancellationPolicy: 'No refund after first certification visit.',
  },
  // Pharma Reactor AMC
  {
    id: 'gt-013',
    name: 'Pharma Reactor AMC',
    description: 'Specialized maintenance for pharmaceutical reactors with GMP compliance and validation support.',
    industry: 'pharma',
    industryLabel: 'Pharma & Biotech',
    industryIcon: '💊',
    category: 'pharma',
    categoryLabel: 'Process Equipment',
    complexity: 'complex',
    estimatedDuration: '35-45 min',
    blocksCount: 6,
    blocks: [
      { id: 'b1', name: 'Reactor Specs', type: 'Service', description: 'Capacity and type', required: true },
      { id: 'b2', name: 'PM Schedule', type: 'Checklist', description: 'Maintenance plan', required: true },
      { id: 'b3', name: 'Gaskets & Seals', type: 'Spare Part', description: 'Consumables list', required: true },
      { id: 'b4', name: 'Calibration', type: 'Document', description: 'Sensor calibration', required: true },
      { id: 'b5', name: 'GMP Docs', type: 'Document', description: 'Validation protocols', required: true },
      { id: 'b6', name: 'Contract Value', type: 'Billing', description: 'Annual fee', required: true },
    ],
    tags: ['Reactor', 'Pharma', 'GMP', 'Validation'],
    usageCount: 45,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-03-20',
    updatedAt: '2024-11-20',
    pricing: {
      baseAmount: 450000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 4,
      usagePeriod: 'PM visits/year',
      validityPeriod: '12 Months',
      includes: ['Quarterly PM', 'Gasket Replacement', 'Agitator Service', 'Sensor Calibration', 'GMP Documentation', 'Audit Support'],
      excludes: ['Vessel re-glasslining', 'Motor replacement', 'Major overhauls'],
    },
    termsAndConditions: [
      'For reactors up to 5000L',
      'Glass-lined and SS variants covered',
      'Shutdown schedule to be mutually agreed',
    ],
    cancellationPolicy: 'Pro-rata refund minus services and parts used.',
  },
  // Wheelchair Rental
  {
    id: 'gt-014',
    name: 'Wheelchair Rental',
    description: 'Flexible wheelchair rental with delivery, maintenance, and optional electric models.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Mobility Aids',
    complexity: 'simple',
    estimatedDuration: '8-10 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Chair Selection', type: 'Service', description: 'Type and features', required: true },
      { id: 'b2', name: 'Rental Terms', type: 'Billing', description: 'Duration and cost', required: true },
      { id: 'b3', name: 'Accessories', type: 'Checklist', description: 'Add-on items', required: false },
      { id: 'b4', name: 'Care Guide', type: 'Text', description: 'Usage tips', required: false },
    ],
    tags: ['Wheelchair', 'Mobility', 'Rental', 'Accessibility'],
    usageCount: 445,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-05-15',
    updatedAt: '2024-12-05',
    pricing: {
      baseAmount: 3500,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'prepaid',
      depositRequired: true,
      depositAmount: 5000,
      taxRate: 5,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '1 Month (Renewable)',
      includes: ['Wheelchair', 'Cushion', 'Footrest', 'Home Delivery', 'Monthly Maintenance', 'Puncture Repair'],
      excludes: ['Electric wheelchair battery', 'Accessories damage'],
    },
    termsAndConditions: [
      'Minimum rental: 1 week',
      'Electric chairs need extra deposit',
      'Return in clean condition',
    ],
    cancellationPolicy: 'Full refund before delivery. 20% after.',
  },
  // Industrial Compressor
  {
    id: 'gt-015',
    name: 'Industrial Compressor AMC',
    description: 'Comprehensive maintenance for industrial air compressors with oil analysis and efficiency monitoring.',
    industry: 'industrial',
    industryLabel: 'Industrial',
    industryIcon: '🏭',
    category: 'industrial',
    categoryLabel: 'Compressed Air',
    complexity: 'medium',
    estimatedDuration: '20-25 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Compressor Details', type: 'Service', description: 'Make and capacity', required: true },
      { id: 'b2', name: 'PM Checklist', type: 'Checklist', description: 'Service schedule', required: true },
      { id: 'b3', name: 'Consumables', type: 'Spare Part', description: 'Oil, filters, belts', required: true },
      { id: 'b4', name: 'Efficiency Report', type: 'Document', description: 'Performance data', required: false },
      { id: 'b5', name: 'AMC Cost', type: 'Billing', description: 'Annual fee', required: true },
    ],
    tags: ['Compressor', 'Industrial', 'AMC', 'Pneumatic'],
    usageCount: 178,
    rating: 4.6,
    isPopular: false,
    createdAt: '2024-02-25',
    updatedAt: '2024-11-15',
    pricing: {
      baseAmount: 55000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 4,
      usagePeriod: 'services/year',
      validityPeriod: '12 Months',
      includes: ['Quarterly Service', 'Oil Change', 'Filter Replacement', 'Oil Analysis', 'Leak Detection', 'Efficiency Report'],
      excludes: ['Air end overhaul', 'Motor rewinding', 'Dryer repairs'],
    },
    termsAndConditions: [
      'For compressors up to 100 CFM',
      'Larger units priced separately',
      'Oil analysis twice yearly',
    ],
    cancellationPolicy: 'Pro-rata refund minus services rendered.',
  },
  // Stairlift
  {
    id: 'gt-016',
    name: 'Stairlift Installation & AMC',
    description: 'Complete stairlift solution with installation, training, and annual maintenance contract.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Mobility Aids',
    complexity: 'complex',
    estimatedDuration: '25-30 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Site Survey', type: 'Service', description: 'Staircase assessment', required: true },
      { id: 'b2', name: 'Installation', type: 'Service', description: 'Fitting and testing', required: true },
      { id: 'b3', name: 'Training', type: 'Document', description: 'User guide and demo', required: true },
      { id: 'b4', name: 'AMC Terms', type: 'Checklist', description: 'Maintenance schedule', required: true },
      { id: 'b5', name: 'Pricing', type: 'Billing', description: 'Cost breakdown', required: true },
    ],
    tags: ['Stairlift', 'Mobility', 'Installation', 'AMC'],
    usageCount: 67,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-04-01',
    updatedAt: '2024-11-30',
    pricing: {
      baseAmount: 185000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: true,
      depositAmount: 50000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 2,
      usagePeriod: 'services/year',
      validityPeriod: '12 Months',
      includes: ['Site Survey', 'Installation', 'User Training', 'Bi-annual Service', 'Battery Check', 'Emergency Support'],
      excludes: ['Staircase modifications', 'Battery replacement', 'Rail extensions'],
    },
    termsAndConditions: [
      'For straight staircases up to 15 steps',
      'Curved stairs need custom quote',
      'Electrical point to be provided by customer',
    ],
    cancellationPolicy: 'No refund after installation begins.',
  },
  // Home Nursing
  {
    id: 'gt-017',
    name: 'Home Nursing Care Plan',
    description: 'Professional nursing services at home with medication management, wound care, and vital monitoring.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Home Care',
    complexity: 'medium',
    estimatedDuration: '15-20 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Patient Assessment', type: 'Service', description: 'Care requirements', required: true },
      { id: 'b2', name: 'Care Plan', type: 'Text', description: 'Treatment protocol', required: true },
      { id: 'b3', name: 'Nursing Schedule', type: 'Checklist', description: 'Visit frequency', required: true },
      { id: 'b4', name: 'Pricing', type: 'Billing', description: 'Monthly costs', required: true },
      { id: 'b5', name: 'Emergency Protocol', type: 'Document', description: 'Emergency contacts', required: true },
    ],
    tags: ['Nursing', 'Home Care', 'Medical', 'Elder Care'],
    usageCount: 234,
    rating: 4.9,
    isPopular: true,
    createdAt: '2024-03-10',
    updatedAt: '2024-12-10',
    pricing: {
      baseAmount: 18000,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '1 Month (Renewable)',
      includes: ['Daily Nurse Visits', 'Medication Management', 'Vital Monitoring', 'Wound Care', 'Doctor Coordination', '24/7 Helpline'],
      excludes: ['Medicines', 'Medical equipment', 'Hospital admission'],
    },
    termsAndConditions: [
      'Minimum commitment: 1 month',
      'Nurse replacement available on request',
      'Doctor consultation extra',
    ],
    cancellationPolicy: 'Pro-rata refund with 7-day notice.',
  },
  // Elderly Care
  {
    id: 'gt-018',
    name: 'Elderly Care Monthly Plan',
    description: 'Comprehensive senior care with attendant, meals coordination, activity engagement, and health monitoring.',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    industryIcon: '🏥',
    category: 'healthcare',
    categoryLabel: 'Senior Care',
    complexity: 'medium',
    estimatedDuration: '18-22 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'Senior Assessment', type: 'Service', description: 'Care needs evaluation', required: true },
      { id: 'b2', name: 'Care Services', type: 'Checklist', description: 'Services included', required: true },
      { id: 'b3', name: 'Schedule', type: 'Text', description: 'Daily routine', required: true },
      { id: 'b4', name: 'Health Reports', type: 'Document', description: 'Weekly updates', required: true },
      { id: 'b5', name: 'Monthly Fee', type: 'Billing', description: 'Cost breakdown', required: true },
    ],
    tags: ['Elder Care', 'Senior', 'Home Care', 'Attendant'],
    usageCount: 189,
    rating: 4.8,
    isPopular: true,
    createdAt: '2024-02-15',
    updatedAt: '2024-12-05',
    pricing: {
      baseAmount: 25000,
      currency: 'INR',
      billingFrequency: 'monthly',
      paymentType: 'prepaid',
      depositRequired: true,
      depositAmount: 10000,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '1 Month (Renewable)',
      includes: ['Trained Attendant', 'Meal Coordination', 'Activity Engagement', 'Vital Monitoring', 'Weekly Health Reports', 'Family Updates'],
      excludes: ['Medical treatment', 'Specialized nursing', 'Meals'],
    },
    termsAndConditions: [
      '8-hour or 12-hour shifts available',
      '24-hour care at extra cost',
      'Background-verified attendants',
    ],
    cancellationPolicy: '15-day notice. Deposit refundable minus dues.',
  },
  // Health Checkup
  {
    id: 'gt-019',
    name: 'Comprehensive Health Checkup',
    description: 'Full body health screening with blood tests, scans, specialist consultations, and detailed reports.',
    industry: 'wellness',
    industryLabel: 'Wellness & Spa',
    industryIcon: '🧘',
    category: 'wellness',
    categoryLabel: 'Preventive Care',
    complexity: 'simple',
    estimatedDuration: '10-12 min',
    blocksCount: 4,
    blocks: [
      { id: 'b1', name: 'Test Package', type: 'Checklist', description: 'Tests included', required: true },
      { id: 'b2', name: 'Consultations', type: 'Service', description: 'Specialist reviews', required: true },
      { id: 'b3', name: 'Package Price', type: 'Billing', description: 'All-inclusive cost', required: true },
      { id: 'b4', name: 'Report Delivery', type: 'Document', description: 'Digital reports', required: true },
    ],
    tags: ['Health Checkup', 'Screening', 'Preventive', 'Tests'],
    usageCount: 567,
    rating: 4.7,
    isPopular: true,
    createdAt: '2024-01-10',
    updatedAt: '2024-12-08',
    pricing: {
      baseAmount: 8500,
      currency: 'INR',
      billingFrequency: 'one-time',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 0,
    },
    serviceDetails: {
      serviceType: 'limited',
      usageLimit: 1,
      usagePeriod: 'checkup',
      validityPeriod: '30 Days',
      includes: ['70+ Blood Tests', 'ECG', 'Chest X-Ray', 'Ultrasound', 'Doctor Consultation', 'Diet Advice'],
      excludes: ['CT/MRI scans', 'Specialist referrals', 'Treatment'],
    },
    termsAndConditions: [
      'Fasting required for accurate results',
      'Reports within 48 hours',
      'Valid for 30 days from booking',
    ],
    cancellationPolicy: 'Full refund if cancelled 24 hours before.',
  },
  // VRF System
  {
    id: 'gt-020',
    name: 'VRF System AMC',
    description: 'Premium maintenance for Variable Refrigerant Flow systems with energy optimization and remote monitoring.',
    industry: 'hvac',
    industryLabel: 'HVAC & Climate',
    industryIcon: '❄️',
    category: 'hvac',
    categoryLabel: 'Central AC',
    complexity: 'complex',
    estimatedDuration: '25-35 min',
    blocksCount: 5,
    blocks: [
      { id: 'b1', name: 'System Mapping', type: 'Service', description: 'All ODUs and IDUs', required: true },
      { id: 'b2', name: 'PM Schedule', type: 'Checklist', description: 'Quarterly maintenance', required: true },
      { id: 'b3', name: 'Refrigerant Plan', type: 'Spare Part', description: 'Top-up coverage', required: true },
      { id: 'b4', name: 'Energy Reports', type: 'Document', description: 'Efficiency analysis', required: false },
      { id: 'b5', name: 'Contract Value', type: 'Billing', description: 'Annual fee', required: true },
    ],
    tags: ['VRF', 'VRV', 'HVAC', 'Energy', 'AMC'],
    usageCount: 123,
    rating: 4.8,
    isPopular: false,
    createdAt: '2024-04-20',
    updatedAt: '2024-12-01',
    pricing: {
      baseAmount: 125000,
      currency: 'INR',
      billingFrequency: 'yearly',
      paymentType: 'prepaid',
      depositRequired: false,
      taxRate: 18,
    },
    serviceDetails: {
      serviceType: 'unlimited',
      validityPeriod: '12 Months',
      includes: ['Quarterly PM', 'Refrigerant Top-up', 'Filter Cleaning', 'Remote Diagnostics', 'Energy Reports', '24/7 Support'],
      excludes: ['Compressor replacement', 'PCB failures', 'Physical damage'],
    },
    termsAndConditions: [
      'For systems up to 50 indoor units',
      'Larger systems quoted separately',
      'Remote monitoring setup required',
    ],
    cancellationPolicy: '60-day notice. Pro-rata refund minus services.',
  },
];

// =====================================================
// MY TEMPLATES (User Created)
// =====================================================
interface MyTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blocksCount: number;
  status: 'draft' | 'active' | 'archived';
}

const MY_TEMPLATES: MyTemplate[] = [];

// =====================================================
// MAIN COMPONENT
// =====================================================
const TemplatesList: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tenant Profile for branding colors
  const { profile: tenantProfile } = useTenantProfile();

  // Tenant Theme Colors (with fallbacks)
  const tenantPrimary = tenantProfile?.primary_color || '#667eea';
  const tenantSecondary = tenantProfile?.secondary_color || '#764ba2';

  // Derived theme colors for various UI elements
  const themeColors = useMemo(() => ({
    // Hero gradient
    heroGradient: isDarkMode
      ? `linear-gradient(135deg, ${darkenColor(tenantPrimary, 70)} 0%, ${darkenColor(tenantSecondary, 60)} 50%, ${darkenColor(tenantPrimary, 50)} 100%)`
      : `linear-gradient(135deg, ${tenantPrimary} 0%, ${tenantSecondary} 50%, ${lightenColor(tenantSecondary, 30)} 100%)`,
    // Featured card gradients (variations)
    featuredGradients: [
      `linear-gradient(135deg, ${tenantPrimary} 0%, ${darkenColor(tenantPrimary, 20)} 100%)`,
      `linear-gradient(135deg, ${tenantSecondary} 0%, ${darkenColor(tenantSecondary, 20)} 100%)`,
      `linear-gradient(135deg, ${tenantPrimary} 0%, ${tenantSecondary} 100%)`,
    ],
    // Modal header gradient
    modalGradient: `linear-gradient(135deg, ${tenantPrimary} 0%, ${tenantSecondary} 100%)`,
    // Button colors
    buttonPrimary: tenantPrimary,
    buttonHover: darkenColor(tenantPrimary, 10),
    // Active pill background
    activePillBg: tenantPrimary,
    // Accent colors
    accent: tenantPrimary,
    accentLight: withOpacity(tenantPrimary, 0.15),
    accentLighter: withOpacity(tenantPrimary, 0.08),
    // Text on primary
    textOnPrimary: '#FFFFFF',
  }), [tenantPrimary, tenantSecondary, isDarkMode]);

  // State
  const [activeTab, setActiveTab] = useState<'my' | 'global'>('global');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<GlobalTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return GLOBAL_TEMPLATES.filter((template) => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Featured templates
  const featuredTemplates = GLOBAL_TEMPLATES.filter(t => t.isFeatured);

  // Handlers
  const handleCopyTemplate = useCallback(async (template: GlobalTemplate) => {
    setIsCopying(true);
    setCopiedId(template.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsCopying(false);
    setCopiedId(null);
    // Show success feedback
  }, []);

  const handlePreview = useCallback((template: GlobalTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  }, []);

  const getBillingLabel = (freq: string) => {
    const labels: Record<string, string> = {
      'monthly': '/mo',
      'quarterly': '/qtr',
      'yearly': '/yr',
      'one-time': '',
      'per-session': '/session',
      'per-visit': '/visit',
    };
    return labels[freq] || '';
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.utility.primaryBackground }}>
      {/* ===== HERO SECTION ===== */}
      <div
        className="relative overflow-hidden"
        style={{ background: themeColors.heroGradient }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 px-6 pt-8 pb-12">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Template Gallery</h1>
              </div>
              <p className="text-white/70 text-lg">Professional contract templates for every industry</p>
            </div>

            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
              >
                <span className="font-semibold">{CURRENCY_CONFIG[selectedCurrency].symbol}</span>
                <span>{selectedCurrency}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showCurrencyDropdown ? 'rotate-90' : ''}`} />
              </button>

              {showCurrencyDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 py-2 rounded-xl shadow-2xl border z-50 min-w-[160px]"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.secondaryText + '20' }}
                >
                  {Object.entries(CURRENCY_CONFIG).map(([code, { symbol }]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setSelectedCurrency(code as CurrencyCode);
                        setShowCurrencyDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-black/5 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      <span>{code}</span>
                      <span className="font-semibold">{symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'global'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <span>Global Templates</span>
                <span className="px-2 py-0.5 rounded-full bg-black/10 text-sm">
                  {GLOBAL_TEMPLATES.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'my'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>My Templates</span>
                <span className="px-2 py-0.5 rounded-full bg-black/10 text-sm">
                  {MY_TEMPLATES.length}
                </span>
              </div>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search templates by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 border border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      {activeTab === 'global' && (
        <>
          {/* ===== CATEGORY PILLS ===== */}
          <div className="px-6 py-4 border-b" style={{ borderColor: colors.utility.secondaryText + '15' }}>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const count = cat.id === 'all'
                  ? GLOBAL_TEMPLATES.length
                  : GLOBAL_TEMPLATES.filter(t => t.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all transform hover:scale-105"
                    style={{
                      background: isActive ? themeColors.heroGradient : colors.utility.secondaryBackground,
                      color: isActive ? themeColors.textOnPrimary : colors.utility.primaryText,
                      boxShadow: isActive ? '0 10px 25px -5px rgba(0, 0, 0, 0.2)' : 'none',
                    }}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="font-medium">{cat.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== FEATURED SECTION ===== */}
          {selectedCategory === 'all' && searchQuery === '' && (
            <div className="px-6 py-8">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5" style={{ color: tenantPrimary }} />
                <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                  Featured Templates
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    onClick={() => handlePreview(template)}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  >
                    {/* Gradient Background - Using tenant theme variations */}
                    <div
                      className="absolute inset-0"
                      style={{ background: themeColors.featuredGradients[index % 3] }}
                    />

                    {/* Content */}
                    <div className="relative p-6 text-white">
                      {/* Badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{template.industryIcon}</span>
                        <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
                          {template.categoryLabel}
                        </span>
                        {template.isPopular && (
                          <span className="px-2 py-1 rounded-full bg-yellow-400/30 text-yellow-100 text-xs font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Popular
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                      <p className="text-white/80 text-sm mb-4 line-clamp-2">{template.description}</p>

                      {/* Price */}
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-3xl font-bold">
                            {formatCurrency(template.pricing.baseAmount, selectedCurrency)}
                          </div>
                          <div className="text-white/60 text-sm">
                            {getBillingLabel(template.pricing.billingFrequency)} + GST
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{template.rating}</span>
                        </div>
                      </div>

                      {/* Hover Arrow */}
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== TEMPLATES GRID ===== */}
          <div className="px-6 py-6">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                  {selectedCategory === 'all' ? 'All Templates' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </h2>
                <span
                  className="px-2.5 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: themeColors.accentLight, color: tenantPrimary }}
                >
                  {filteredTemplates.length} templates
                </span>
              </div>

              {/* View Toggle */}
              <div
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ backgroundColor: colors.utility.secondaryBackground }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  style={{ color: viewMode === 'grid' ? tenantPrimary : colors.utility.secondaryText }}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  style={{ color: viewMode === 'list' ? tenantPrimary : colors.utility.secondaryText }}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Templates Grid */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5' : 'space-y-4'}>
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handlePreview(template)}
                  className={`group rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-transparent ${
                    viewMode === 'list' ? 'flex items-center p-4' : 'overflow-hidden'
                  }`}
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.secondaryText + '20',
                  }}
                >
                  {viewMode === 'grid' ? (
                    <>
                      {/* Card Header with Tenant Gradient */}
                      <div
                        className="p-4 pb-3"
                        style={{
                          background: isDarkMode
                            ? `linear-gradient(135deg, ${withOpacity(tenantPrimary, 0.15)} 0%, transparent 100%)`
                            : `linear-gradient(135deg, ${withOpacity(tenantPrimary, 0.08)} 0%, transparent 100%)`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{template.industryIcon}</span>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: themeColors.accentLight, color: tenantPrimary }}
                            >
                              {template.categoryLabel}
                            </span>
                          </div>
                          {template.isPopular && (
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: withOpacity(tenantSecondary, 0.15), color: tenantSecondary }}
                            >
                              <TrendingUp className="w-3 h-3" />
                              Popular
                            </span>
                          )}
                        </div>

                        <h3
                          className="font-bold text-lg mb-1.5 transition-colors line-clamp-1"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {template.name}
                        </h3>
                        <p
                          className="text-sm line-clamp-2 leading-relaxed"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {template.description}
                        </p>
                      </div>

                      {/* Card Body */}
                      <div className="px-4 pb-4">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {template.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Price & Stats */}
                        <div
                          className="flex items-end justify-between pt-3 border-t"
                          style={{ borderColor: colors.utility.secondaryText + '15' }}
                        >
                          <div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: colors.semantic.success }}
                            >
                              {formatCurrency(template.pricing.baseAmount, selectedCurrency)}
                            </div>
                            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                              {getBillingLabel(template.pricing.billingFrequency)} + {template.pricing.taxRate}% GST
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span style={{ color: colors.utility.primaryText }}>{template.rating}</span>
                            </div>
                            <div className="flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                              <Users className="w-4 h-4" />
                              <span>{template.usageCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hover Action Bar */}
                      <div
                        className="flex items-center justify-between px-4 py-3 border-t opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ borderColor: colors.utility.secondaryText + '15', backgroundColor: colors.utility.primaryBackground }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTemplate(template);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          style={{ backgroundColor: tenantPrimary, color: themeColors.textOnPrimary }}
                        >
                          {copiedId === template.id ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(template);
                            }}
                            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    // List View
                    <>
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-3xl">{template.industryIcon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold" style={{ color: colors.utility.primaryText }}>
                            {template.name}
                          </h3>
                          <p className="text-sm truncate" style={{ color: colors.utility.secondaryText }}>
                            {template.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-bold" style={{ color: colors.semantic.success }}>
                            {formatCurrency(template.pricing.baseAmount, selectedCurrency)}
                          </div>
                          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            {getBillingLabel(template.pricing.billingFrequency)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span style={{ color: colors.utility.primaryText }}>{template.rating}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTemplate(template);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: tenantPrimary, color: themeColors.textOnPrimary }}
                        >
                          Copy
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-16">
                <div
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: themeColors.accentLighter }}
                >
                  <Search className="w-8 h-8" style={{ color: tenantPrimary }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                  No templates found
                </h3>
                <p style={{ color: colors.utility.secondaryText }}>
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== MY TEMPLATES TAB ===== */}
      {activeTab === 'my' && (
        <div className="px-6 py-12">
          <div className="text-center max-w-md mx-auto">
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: themeColors.accentLight }}
            >
              <FileText className="w-12 h-12" style={{ color: tenantPrimary }} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
              No Templates Yet
            </h2>
            <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
              Create your first custom template or copy one from the Global Templates gallery to get started.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('global')}
                className="px-6 py-3 rounded-xl font-medium transition-colors"
                style={{ backgroundColor: tenantPrimary, color: themeColors.textOnPrimary }}
              >
                Browse Templates
              </button>
              <button
                className="px-6 py-3 rounded-xl font-medium border transition-colors"
                style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.primaryText }}
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Create New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PREVIEW MODAL ===== */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 backdrop-blur-sm transition-opacity"
            style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowPreviewModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-4xl rounded-2xl border shadow-2xl animate-in zoom-in-95 overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '20',
              }}
            >
              {/* Modal Header with Gradient */}
              <div
                className="p-6 text-white"
                style={{ background: themeColors.modalGradient }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{selectedTemplate.industryIcon}</span>
                      <span className="px-3 py-1 rounded-full bg-white/20 text-sm font-medium backdrop-blur-sm">
                        {selectedTemplate.categoryLabel}
                      </span>
                      {selectedTemplate.isPopular && (
                        <span className="px-3 py-1 rounded-full bg-yellow-400/30 text-yellow-100 text-sm font-medium flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Popular
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{selectedTemplate.name}</h2>
                    <p className="text-white/80">{selectedTemplate.description}</p>
                  </div>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Price Banner */}
                <div className="flex items-end justify-between mt-6 pt-6 border-t border-white/20">
                  <div>
                    <div className="text-sm text-white/60 mb-1">Starting from</div>
                    <div className="text-4xl font-bold">
                      {formatFullCurrency(selectedTemplate.pricing.baseAmount, selectedCurrency)}
                    </div>
                    <div className="text-white/60">
                      {getBillingLabel(selectedTemplate.pricing.billingFrequency)} + {selectedTemplate.pricing.taxRate}% GST
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xl font-bold">{selectedTemplate.rating}</span>
                      </div>
                      <div className="text-xs text-white/60">{selectedTemplate.usageCount} uses</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Layers className="w-5 h-5" />
                        <span className="text-xl font-bold">{selectedTemplate.blocksCount}</span>
                      </div>
                      <div className="text-xs text-white/60">blocks</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Timer className="w-5 h-5" />
                        <span className="text-xl font-bold">{selectedTemplate.estimatedDuration.split('-')[0]}</span>
                      </div>
                      <div className="text-xs text-white/60">minutes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  {/* What's Included */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                      <CheckCircle className="w-5 h-5" style={{ color: colors.semantic.success }} />
                      What's Included
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.serviceDetails.includes.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.success }} />
                          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Not Included */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                      <X className="w-5 h-5" style={{ color: colors.semantic.error }} />
                      Not Included
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.serviceDetails.excludes.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.error }} />
                          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: colors.utility.primaryBackground }}>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Service Type</div>
                      <div className="font-semibold capitalize" style={{ color: colors.utility.primaryText }}>
                        {selectedTemplate.serviceDetails.serviceType}
                        {selectedTemplate.serviceDetails.usageLimit && (
                          <span className="text-sm font-normal" style={{ color: colors.utility.secondaryText }}>
                            {' '}({selectedTemplate.serviceDetails.usageLimit} {selectedTemplate.serviceDetails.usagePeriod})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Validity</div>
                      <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                        {selectedTemplate.serviceDetails.validityPeriod}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Payment</div>
                      <div className="font-semibold capitalize" style={{ color: colors.utility.primaryText }}>
                        {selectedTemplate.pricing.paymentType}
                        {selectedTemplate.pricing.depositRequired && (
                          <span className="text-sm font-normal" style={{ color: colors.utility.secondaryText }}>
                            {' '}+ {formatCurrency(selectedTemplate.pricing.depositAmount || 0, selectedCurrency)} deposit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blocks Preview */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                    Template Blocks ({selectedTemplate.blocksCount})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="px-3 py-2 rounded-lg border flex items-center gap-2"
                        style={{ borderColor: colors.utility.secondaryText + '20' }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: block.required ? colors.semantic.error : colors.utility.secondaryText }}
                        />
                        <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                          {block.name}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
                        >
                          {block.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                    Terms & Conditions
                  </h3>
                  <div className="space-y-2">
                    {selectedTemplate.termsAndConditions.map((term, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                          style={{ backgroundColor: themeColors.accentLight, color: tenantPrimary }}
                        >
                          {i + 1}
                        </div>
                        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>{term}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cancellation */}
                <div
                  className="mt-6 p-4 rounded-xl"
                  style={{ backgroundColor: colors.semantic.warning + '10' }}
                >
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                    <div>
                      <h4 className="font-semibold text-sm mb-1" style={{ color: colors.utility.primaryText }}>
                        Cancellation Policy
                      </h4>
                      <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                        {selectedTemplate.cancellationPolicy}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="px-6 py-4 border-t flex items-center justify-between"
                style={{ borderColor: colors.utility.secondaryText + '20' }}
              >
                <div className="flex items-center gap-2">
                  {selectedTemplate.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: themeColors.accentLighter, color: tenantPrimary }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPDFModal(true)}
                    className="px-4 py-2.5 rounded-xl font-medium border flex items-center gap-2 transition-colors"
                    style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.primaryText }}
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => handleCopyTemplate(selectedTemplate)}
                    disabled={isCopying}
                    className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
                    style={{ backgroundColor: tenantPrimary, color: themeColors.textOnPrimary }}
                  >
                    {isCopying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy to My Templates
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesList;

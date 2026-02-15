// src/constants/subCategoryConfig.ts
// Shared sub-category icon + color config used by Resources settings and Equipment Registry

import {
  ScanLine, HeartPulse, Activity,
  Hospital, ArrowUpDown, Wind, Flame, Zap, Droplets,
  Shield, Home, Store, Factory, Cpu, Cog,
  Network, Thermometer, Car, Gauge,
  Server, MonitorSpeaker, Dumbbell, Sparkles,
  Waves, Package,
  type LucideIcon,
} from 'lucide-react';

export const SUB_CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  // Healthcare — Equipment
  'Diagnostic Imaging':     { icon: ScanLine,     color: '#6366F1' },
  'Life Support':           { icon: HeartPulse,   color: '#EF4444' },
  'Patient Monitoring':     { icon: Activity,     color: '#10B981' },
  // Healthcare — Assets
  'Clinical Facilities':    { icon: Hospital,     color: '#8B5CF6' },
  // Facility Mgmt — Equipment
  'Vertical Transport':     { icon: ArrowUpDown,  color: '#6366F1' },
  'HVAC Systems':           { icon: Wind,         color: '#0EA5E9' },
  'Fire & Safety':          { icon: Flame,        color: '#F97316' },
  'Power & Electrical':     { icon: Zap,          color: '#EAB308' },
  'Water Treatment':        { icon: Droplets,     color: '#06B6D4' },
  'Security & Surveillance':{ icon: Shield,       color: '#64748B' },
  // Facility Mgmt — Assets
  'Residential Properties': { icon: Home,         color: '#10B981' },
  'Commercial Properties':  { icon: Store,        color: '#3B82F6' },
  'Industrial Properties':  { icon: Factory,      color: '#78716C' },
  // Manufacturing
  'CNC & Machining':        { icon: Cog,          color: '#6366F1' },
  'Pneumatics & Hydraulics':{ icon: Gauge,        color: '#0EA5E9' },
  'Moulding & Forming':     { icon: Cpu,          color: '#8B5CF6' },
  'Material Handling':      { icon: Package,      color: '#F59E0B' },
  'Thermal Systems':        { icon: Thermometer,  color: '#EF4444' },
  // Automotive
  'Workshop Equipment':     { icon: Car,          color: '#3B82F6' },
  'Diagnostic Tools':       { icon: Gauge,        color: '#10B981' },
  // Technology
  'Server & Compute':       { icon: Server,       color: '#6366F1' },
  'Networking':             { icon: Network,      color: '#0EA5E9' },
  'Power & Cooling':        { icon: Zap,          color: '#EAB308' },
  'Data Facilities':        { icon: MonitorSpeaker, color: '#8B5CF6' },
  // Wellness
  'Fitness Equipment':      { icon: Dumbbell,     color: '#10B981' },
  'Spa & Relaxation':       { icon: Sparkles,     color: '#EC4899' },
  'Wellness Facilities':    { icon: Waves,        color: '#06B6D4' },
};

export const getSubCategoryConfig = (subCat: string | null | undefined): { icon: LucideIcon; color: string } | null => {
  if (!subCat) return null;
  return SUB_CATEGORY_CONFIG[subCat] || { icon: Package, color: '#6B7280' };
};

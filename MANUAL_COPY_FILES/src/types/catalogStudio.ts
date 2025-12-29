// src/types/catalogStudio.ts
// Centralized types for Catalog Studio feature

export interface BlockCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name (e.g., 'Target', 'Package', 'Wallet')
  count: number;
  color: string;
  bgColor: string;
  description: string;
}

export interface Block {
  id: string;
  categoryId: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  price?: number;
  currency?: string;
  duration?: number;
  durationUnit?: string;
  tags: string[];
  evidenceTags?: string[];
  usage: { templates: number; contracts: number };
  meta?: Record<string, string | number>;
}

export interface WizardStep {
  id: number;
  label: string;
}

export type WizardMode = 'create' | 'edit';

export type BlockType =
  | 'service'
  | 'spare'
  | 'billing'
  | 'text'
  | 'video'
  | 'image'
  | 'checklist'
  | 'document';

export interface ServiceBlockFormData {
  name: string;
  icon: string;
  description: string;
  duration: number;
  durationUnit: 'minutes' | 'hours' | 'days';
  bufferTime: number;
  deliveryMode: 'on-site' | 'virtual' | 'hybrid';
  serviceArea?: string;
  requiresScheduling: boolean;
  schedulingBuffer: number;
  priceType: 'fixed' | 'hourly' | 'custom';
  basePrice: number;
  currency: string;
  taxInclusive: boolean;
  taxRate?: number;
  evidenceRequired: boolean;
  evidenceTypes: string[];
  photoRequired: boolean;
  signatureRequired: boolean;
  gpsRequired: boolean;
  autoApprove: boolean;
  requiresOTP: boolean;
  maxReschedules: number;
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  refundPercentage: number;
}

export interface EvidenceType {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
}

export interface PricingTier {
  id: string;
  name: string;
  minQty?: number;
  maxQty?: number;
  price: number;
  description?: string;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  refundPercent: number;
}

export interface IconOption {
  value: string; // Lucide icon name
  label: string;
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

// src/components/playground/types.ts
// Playground-specific types

export type PlaygroundStep = 'welcome' | 'lead-capture' | 'builder' | 'preview' | 'success';

export type PersonaType = 'seller' | 'buyer';

export type IndustryType = 'equipment_amc' | 'wellness' | 'lease' | 'opex';

export interface PlaygroundLead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  industry: IndustryType;
  persona: PersonaType;
  completed_demo: boolean;
  contract_data?: ContractData;
  created_at?: string;
  updated_at?: string;
}

export interface PlaygroundBlock {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  description: string;
  price?: number;
  currency?: string;
  duration?: number;
  durationUnit?: string;
  tags: string[];
  meta?: Record<string, unknown>;
}

export interface CanvasBlock extends PlaygroundBlock {
  canvasId: string; // Unique ID for canvas instance
  quantity?: number;
  customerNote?: string;
}

export interface ContractData {
  customerName: string;
  blocks: CanvasBlock[];
  totalValue: number;
  createdAt: string;
}

export interface RFPData {
  serviceType: string;
  equipmentType: string;
  quantity: number;
  location: string;
  budget: string;
  timeline: string;
  requirements: string[];
}

export interface VendorQuote {
  id: string;
  vendorName: string;
  vendorLogo: string;
  rating: number;
  price: number;
  responseTime: string;
  features: string[];
  highlight?: string;
}

export interface PlaygroundState {
  step: PlaygroundStep;
  persona: PersonaType | null;
  industry: IndustryType;
  lead: PlaygroundLead | null;
  canvasBlocks: CanvasBlock[];
  customerName: string;
  rfpData: RFPData | null;
  selectedVendor: VendorQuote | null;
}

// src/lite/landing/previewData.ts
//
// The four trades a visitor can pick before signing up, and the workspace each
// one previews. This is illustrative marketing data — NOT the seeder. The real
// catalog is built by the existing seed endpoints during onboarding.
//
// Keep the numbers defensible: they should match what a tenant in that trade
// actually gets, because the preview sets an expectation onboarding must meet.

export type TradeKey = 'amc' | 'pest' | 'house' | 'mfg';

export interface CatalogLine {
  name: string;
  meta: string;
  price: string;
}

export interface TradePreview {
  key: TradeKey;
  /** Chip label. */
  label: string;
  /** Total catalog blocks seeded for this trade. */
  blocks: number;
  /** Breakdown line under the block count. */
  blocksSub: string;
  /** Four representative catalog lines. */
  lines: CatalogLine[];
  /** Example contract. */
  contractTitle: string;
  contractSub: string;
  /** Generated events. */
  visits: number;
  invoices: number;
  /** Service visits drawn per month in the year strip. */
  visitsPerMonth: number;
  renewsOn: string;
  /** Carried into signup so onboarding never asks for the trade again. */
  seedIntent: string;
}

export const TRADES: Record<TradeKey, TradePreview> = {
  amc: {
    key: 'amc',
    label: 'Equipment AMC',
    blocks: 68,
    blocksSub: '29 services + 39 spares · market-reference prices',
    lines: [
      { name: 'Preventive maintenance visit', meta: '12 per year · 6 checkpoints', price: '₹28,000' },
      { name: 'Breakdown response 24×7', meta: 'SLA 48h', price: '₹9,000' },
      { name: 'Condenser coil deep clean', meta: 'half-yearly', price: '₹2,800' },
      { name: 'Rope & controller', meta: 'at actuals', price: 'excluded' },
    ],
    contractTitle: 'Annual AMC — Orion Towers',
    contractSub: '₹1,48,000 / year · quarterly billing · 1-year term',
    visits: 24,
    invoices: 4,
    visitsPerMonth: 2,
    renewsOn: 'Mar 2027',
    seedIntent: 'equipment_amc',
  },
  pest: {
    key: 'pest',
    label: 'Pest control',
    blocks: 41,
    blocksSub: '18 treatments + 23 chemicals · market-reference prices',
    lines: [
      { name: 'General pest treatment', meta: 'monthly · all zones', price: '₹3,400' },
      { name: 'Termite pre-construction', meta: 'one-time · 10-yr warranty', price: '₹18,000' },
      { name: 'Rodent station servicing', meta: 'fortnightly', price: '₹1,600' },
      { name: 'Compliance certificate', meta: 'per visit · FSSAI ready', price: 'included' },
    ],
    contractTitle: 'Pest Control AMC — Spice Route Restaurants',
    contractSub: '₹81,600 / year · monthly billing · 1-year term',
    visits: 12,
    invoices: 12,
    visitsPerMonth: 1,
    renewsOn: 'Mar 2027',
    seedIntent: 'pest_control',
  },
  house: {
    key: 'house',
    label: 'Housekeeping',
    blocks: 35,
    blocksSub: '11 deployments + 24 consumables · market-reference rates',
    lines: [
      { name: 'Housekeeping staff — 4 persons', meta: 'daily · 8h shift', price: '₹64,000/mo' },
      { name: 'Deep cleaning — common areas', meta: 'monthly', price: '₹8,500' },
      { name: 'Facade & glass cleaning', meta: 'quarterly', price: '₹14,000' },
      { name: 'Consumables & supplies', meta: 'at actuals', price: 'excluded' },
    ],
    contractTitle: 'Facility Housekeeping — Marina Bay Apartments',
    contractSub: '₹8,70,000 / year · monthly billing · 1-year term',
    visits: 12,
    invoices: 12,
    visitsPerMonth: 1,
    renewsOn: 'Mar 2027',
    seedIntent: 'housekeeping',
  },
  mfg: {
    key: 'mfg',
    label: 'Manufacturing support',
    blocks: 96,
    blocksSub: '34 service cycles + 62 spares · market-reference prices',
    lines: [
      { name: 'Compressor overhaul cycle', meta: 'half-yearly · 22 checkpoints', price: '₹46,000' },
      { name: 'Preventive line inspection', meta: 'monthly', price: '₹12,000' },
      { name: 'Calibration & certification', meta: 'annual · NABL', price: '₹22,000' },
      { name: 'Wear parts & consumables', meta: 'at actuals', price: 'excluded' },
    ],
    contractTitle: 'Plant Maintenance — Sundar Forgings Pvt Ltd',
    contractSub: '₹4,32,000 / year · quarterly billing · 2-year term',
    visits: 18,
    invoices: 4,
    visitsPerMonth: 2,
    renewsOn: 'Mar 2028',
    seedIntent: 'manufacturing_support',
  },
};

export const TRADE_ORDER: TradeKey[] = ['amc', 'pest', 'house', 'mfg'];

/** Financial-year month labels used by the year strip. */
export const FY_MONTHS = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
] as const;

/** localStorage key that carries the visitor's trade into signup. */
export const TRADE_HANDOFF_KEY = 'cn_landing_trade';

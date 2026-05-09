// src/utils/constants/businessTypes.ts
//
// PRE-BUILD SCAN: business_type_id branch audit [Task 0 — Onboarding Redesign]
// Files updated for 'both':
//   - contractnest-ui/src/utils/constants/businessTypes.ts       (this file)
//   - contractnest-ui/src/context/AuthContext.tsx:853            (perspective init)
//   - contractnest-ui/src/pages/settings/business-profile/index.tsx:260  (settings display)
// Files safe without change:
//   - useContractRole.ts, EquipmentTab, EvidenceTab, SellerTasksTab, contracts/detail —
//     these branch on CONTRACT-LEVEL role (buyer/seller in a specific contract),
//     not on tenant business_type_id. Unaffected.
//   - Landing/Playground persona vars — separate marketing concept, unaffected.
// Key rule: 'both' means major+minor persona. In any given contract the tenant
//   is still either the buyer or the seller — contract-level role never changes.

export interface BusinessType {
  id: string;
  name: string;
  description: string;
  helpText: string;
  icon: string;
  examples: string[];
  color: string;
}

export const businessTypes: BusinessType[] = [
  {
    id: 'buyer',
    name: 'Buyer',
    description: 'Organizations that purchase services from external providers',
    helpText: 'As a Buyer, you engage service providers to fulfill specific needs for your organization. You create service requests, manage contracts with vendors, track SLA compliance, and oversee service delivery. You are responsible for defining requirements, approving invoices, and ensuring contracted services meet your standards.',
    icon: 'ShoppingCart',
    color: '#3B82F6',
    examples: [
      'ABC Manufacturing contracts TechServ Inc. to maintain their CNC machines monthly',
      'City General Hospital hires MedEquip Solutions for MRI machine servicing',
      'Metro Office Tower contracts CleanPro for daily janitorial services',
      'Fashion Retail Corp outsources IT helpdesk to TechSupport Plus',
      'State Department of Health procures consulting from Policy Advisors LLC'
    ]
  },
  {
    id: 'seller',
    name: 'Service Provider (Seller)',
    description: 'Organizations that deliver specialized services to other businesses',
    helpText: 'As a Service Provider, you deliver specialized services to other organizations under contractual agreements. You respond to service requests, manage client relationships, track service delivery performance, and handle billing. You are responsible for meeting SLAs, maintaining service quality, and growing your client base through excellent service delivery.',
    icon: 'Wrench',
    color: '#10B981',
    examples: [
      'TechServ Inc. provides monthly CNC machine maintenance to ABC Manufacturing',
      'MedEquip Solutions services MRI machines for City General Hospital',
      'CleanPro delivers daily janitorial services to Metro Office Tower',
      'TechSupport Plus offers IT helpdesk services to Fashion Retail Corp',
      'Policy Advisors LLC provides consulting services to State Department of Health'
    ]
  },
  {
    id: 'both',
    name: 'Buyer & Seller',
    description: 'Organizations that both purchase services and deliver them to clients',
    helpText: 'As a Buyer & Seller, you operate on both sides of the contract. You engage service providers for your own asset and facility needs, while also delivering specialized services to your own clients. ContractNest gives you both procurement tools (expense view) and service delivery tools (revenue view) — switch perspectives anytime from the header.',
    icon: 'ArrowLeftRight',
    color: '#8B5CF6',
    examples: [
      'Apollo Hospitals buys medical equipment AMC and sells corporate health packages',
      'Large hotel chain procures facility management and sells event management services',
      'IT firm buys hardware maintenance contracts and sells software support to clients',
      'Real estate company procures cleaning services and provides facility management',
      'Diagnostic chain buys lab equipment servicing and sells health checkup packages'
    ]
  }
];
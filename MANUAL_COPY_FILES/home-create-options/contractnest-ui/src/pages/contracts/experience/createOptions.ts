// src/pages/contracts/experience/createOptions.ts
// THE list of ways to start a contract. The Contracts page's "New contract"
// menu and Home's "Create a service agreement" card both render from it, so
// the two entry points can never offer different choices.

export interface CreateOption {
  key: 'client' | 'partner' | 'vendor' | 'template';
  title: string;
  caption: string;
  /** Where the new create flow starts. */
  to: string;
}

export function createOptions(revenue: boolean): CreateOption[] {
  const relationships: CreateOption[] = revenue
    ? [
        { key: 'client', title: 'Client contract', caption: 'Services you provide to a customer', to: '/contracts/experience/create?relationship=client' },
        { key: 'partner', title: 'Partner contract', caption: 'An agreement with a partner', to: '/contracts/experience/create?relationship=partner' },
      ]
    : [
        { key: 'vendor', title: 'Vendor contract', caption: 'Services you receive from a provider', to: '/contracts/experience/create?relationship=vendor' },
      ];
  return [
    ...relationships,
    { key: 'template', title: 'Start from a template', caption: 'Use published terms, then add the matching contact and start date', to: '/contracts/experience/create?source=template' },
  ];
}

/** Opens the Contracts page with the VaNi composer showing. */
export const VANI_DRAFT_PATH = '/contracts/experience?vani=1';

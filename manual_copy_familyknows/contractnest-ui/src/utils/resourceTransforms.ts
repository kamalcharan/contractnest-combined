// src/utils/resourceTransforms.ts
// Shared utility for transforming contacts to resources

import type { Contact } from '@/hooks/useContacts';

export interface Resource {
  id: string;
  tenant_id?: string;
  is_live?: boolean;
  resource_type_id: string;
  name: string;
  display_name: string;
  description?: string | null;
  code?: string | null;
  contact_id?: string | null;
  attributes?: any;
  availability_config?: any;
  is_custom?: boolean;
  master_template_id?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  hexcolor?: string | null;
  sequence_no?: number | null;
  is_deletable?: boolean;
  tags?: any;
  form_settings?: any;
  contact?: Contact;
  resource_type?: any;
  is_active?: boolean;
  _source?: string;
}

/**
 * Transform contacts to Resource format
 * This is the canonical transformation used across the app
 * Used by: ResourcesPanel, ServiceConfigStep
 */
export function transformContactsToResources(
  contacts: Contact[],
  resourceTypeId: string,
  resourceType?: any
): Resource[] {
  if (!contacts || contacts.length === 0) {
    return [];
  }

  return contacts.map((contact) => ({
    id: contact.id,
    tenant_id: contact.tenant_id,
    is_live: contact.is_live,
    resource_type_id: resourceTypeId,
    name: contact.name || contact.company_name || 'Unnamed Contact',
    display_name: contact.displayName || contact.name || contact.company_name || 'Unnamed Contact',
    description: contact.notes || null,
    code: null,
    contact_id: contact.id,
    attributes: null,
    availability_config: null,
    is_custom: false,
    master_template_id: null,
    status: contact.status === 'active' ? 'active' : 'inactive',
    is_active: contact.status === 'active',
    created_at: contact.created_at,
    updated_at: contact.updated_at,
    created_by: null,
    updated_by: null,
    hexcolor: null,
    sequence_no: null,
    is_deletable: false, // Contact-based resources are not deletable from Resources UI
    tags: null,
    form_settings: null,
    contact: contact,
    resource_type: resourceType,
    _source: 'contact'
  } as Resource));
}

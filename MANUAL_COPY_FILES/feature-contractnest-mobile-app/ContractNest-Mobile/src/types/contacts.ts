// src/types/contacts.ts — contact domain types (wire format of /api/contacts)

export type ContactType = 'individual' | 'corporate';
export type ContactStatus = 'active' | 'inactive' | 'archived';
export type ChannelType = 'mobile' | 'email' | 'whatsapp' | 'linkedin' | 'website' | 'telegram' | 'skype';
export type AddressType = 'home' | 'office' | 'billing' | 'shipping' | 'factory' | 'warehouse' | 'other';
export type Salutation = 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';

export interface ContactChannel {
  id?: string;
  channel_type: ChannelType | string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified?: boolean;
  notes?: string;
}

export interface ContactAddress {
  id?: string;
  type: AddressType | string;
  label?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_code?: string;
  country_code?: string;
  postal_code?: string;
  google_pin?: string;
  is_primary: boolean;
  notes?: string;
}

export interface ContactTag {
  id?: string;
  tag_value: string;
  tag_label: string;
  tag_color?: string;
}

export interface ComplianceNumber {
  id?: string;
  type_value: string;
  type_label?: string;
  number: string;
  issuing_authority?: string;
  valid_from?: string;
  valid_to?: string;
  is_verified?: boolean;
  notes?: string;
}

export interface ContactPerson {
  id?: string;
  name: string;
  salutation?: string;
  designation?: string;
  department?: string;
  type?: string;
  status?: string;
  contact_channels?: ContactChannel[];
}

export interface Contact {
  id: string;
  type: ContactType;
  status: ContactStatus;
  name?: string;
  company_name?: string;
  displayName?: string;
  salutation?: string;
  designation?: string;
  department?: string;
  registration_number?: string;
  classifications: string[];
  tags?: ContactTag[];
  industries?: string[];
  compliance_numbers?: ComplianceNumber[];
  notes?: string;
  parent_contact_ids?: string[];
  manager_id?: string;
  manager_name?: string;
  potential_duplicate?: boolean;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  // list rows: only primary channel/address; detail: full arrays
  primary_channel?: ContactChannel | null;
  primary_address?: Partial<ContactAddress> | null;
  contact_channels?: ContactChannel[];
  addresses?: ContactAddress[];
  parent_contacts?: Array<Pick<Contact, 'id' | 'name' | 'company_name' | 'type' | 'status'>>;
  contact_persons?: ContactPerson[];
}

export interface ContactListParams {
  status?: ContactStatus;
  type?: ContactType;
  search?: string;
  classifications?: string[];
  tags?: string[];
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'name' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ContactListResponse {
  success: boolean;
  data: Contact[];
  pagination: Pagination;
}

export interface ContactStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  by_type: { individual?: number; corporate?: number };
  by_classification: Record<string, number>;
  by_tag: Record<string, number>;
  duplicates?: number;
}

export interface CreateContactRequest {
  type: ContactType;
  status?: ContactStatus;
  classifications: string[];
  name?: string;
  salutation?: string;
  designation?: string;
  department?: string;
  company_name?: string;
  registration_number?: string;
  contact_channels: Array<Omit<ContactChannel, 'id'>>;
  addresses?: Array<Omit<ContactAddress, 'id'>>;
  tags?: ContactTag[];
  notes?: string;
  force_create?: boolean;
}

export type UpdateContactRequest = Partial<CreateContactRequest>;

export interface DuplicateMatch {
  match_type: 'channel' | 'name';
  match_value?: string;
  existing_contact: {
    id: string;
    name?: string;
    company_name?: string;
    type: string;
    status: string;
    classifications?: string[];
  };
}

// Classification metadata used across the app (mirrors web CONTACT_CLASSIFICATION_CONFIG)
export const CLASSIFICATIONS: Array<{ id: string; label: string; icon: string; color: string }> = [
  { id: 'client', label: 'Client', icon: 'handshake', color: '#10B981' },
  { id: 'vendor', label: 'Vendor', icon: 'cart-outline', color: '#F59E0B' },
  { id: 'partner', label: 'Partner', icon: 'account-group-outline', color: '#8B5CF6' },
  { id: 'team_member', label: 'Team', icon: 'badge-account-outline', color: '#3B82F6' },
];

export const SALUTATIONS: Array<{ id: Salutation; label: string }> = [
  { id: 'mr', label: 'Mr' },
  { id: 'ms', label: 'Ms' },
  { id: 'mrs', label: 'Mrs' },
  { id: 'dr', label: 'Dr' },
  { id: 'prof', label: 'Prof' },
];

export const CHANNEL_META: Record<string, { label: string; icon: string; keyboard: 'default' | 'email-address' | 'phone-pad' | 'url' }> = {
  mobile: { label: 'Mobile', icon: 'phone-outline', keyboard: 'phone-pad' },
  email: { label: 'Email', icon: 'email-outline', keyboard: 'email-address' },
  whatsapp: { label: 'WhatsApp', icon: 'whatsapp', keyboard: 'phone-pad' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin', keyboard: 'default' },
  website: { label: 'Website', icon: 'web', keyboard: 'url' },
  telegram: { label: 'Telegram', icon: 'send-circle-outline', keyboard: 'default' },
  skype: { label: 'Skype', icon: 'video-outline', keyboard: 'default' },
};

export const PHONE_CHANNELS = ['mobile', 'whatsapp'];

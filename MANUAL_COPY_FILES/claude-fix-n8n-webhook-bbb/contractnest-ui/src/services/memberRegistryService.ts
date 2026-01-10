// src/services/memberRegistryService.ts
// Member Registry Service - Syncs member data with n8n webhook for WhatsApp integration
// Fire and forget - don't block UI on registry calls

const REGISTRY_URL = 'https://n8n.srv1096269.hstgr.cloud/webhook/member-registry';

export interface MemberRegistryData {
  phone: string;
  group_id: string;
  membership_id: string;
  business_name: string;
  owner_name: string;
  status: 'active' | 'inactive';
}

export interface MemberRegistryResponse {
  success: boolean;
  action: 'add' | 'update' | 'delete';
  phone?: string;
  group_id?: string;
  membership_id?: string;
  message?: string;
  error?: string;
}

/**
 * Member Registry Service
 * Syncs member data with n8n webhook for WhatsApp bot integration
 *
 * Usage:
 * - Call add() after successful profile creation
 * - Call update() after phone/status change
 * - Call delete() after profile deletion
 *
 * Note: These are fire-and-forget calls - errors are logged but don't block the UI
 */
class MemberRegistryService {

  /**
   * Add a new member to the registry
   * Call after successful profile creation
   */
  async add(
    profileData: {
      business_phone?: string;
      business_whatsapp?: string;
      business_name?: string;
      contact_first_name?: string;
      contact_last_name?: string;
    },
    groupId: string,
    membershipId: string
  ): Promise<MemberRegistryResponse> {
    const phone = profileData.business_whatsapp || profileData.business_phone;

    if (!phone) {
      console.warn('📱 Registry: No phone number provided, skipping add');
      return { success: false, action: 'add', error: 'No phone number provided' };
    }

    try {
      console.log('📱 Registry: Adding member...', { phone, groupId, membershipId });

      const response = await fetch(REGISTRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          phone: phone,
          group_id: groupId,
          membership_id: membershipId,
          business_name: profileData.business_name || '',
          owner_name: `${profileData.contact_first_name || ''} ${profileData.contact_last_name || ''}`.trim(),
          status: 'active'
        })
      });

      const result = await response.json();
      console.log('📱 Registry: Add result:', result);
      return result;

    } catch (error: any) {
      console.error('📱 Registry: Add failed:', error);
      return { success: false, action: 'add', error: error.message };
    }
  }

  /**
   * Update an existing member in the registry
   * Call after phone or status changes
   */
  async update(
    profileData: {
      business_phone?: string;
      business_whatsapp?: string;
      business_name?: string;
      contact_first_name?: string;
      contact_last_name?: string;
      status?: string;
    },
    groupId: string,
    membershipId: string
  ): Promise<MemberRegistryResponse> {
    const phone = profileData.business_whatsapp || profileData.business_phone;

    if (!phone) {
      console.warn('📱 Registry: No phone number provided, skipping update');
      return { success: false, action: 'update', error: 'No phone number provided' };
    }

    try {
      console.log('📱 Registry: Updating member...', { phone, groupId, membershipId });

      const response = await fetch(REGISTRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          phone: phone,
          group_id: groupId,
          membership_id: membershipId,
          business_name: profileData.business_name || '',
          owner_name: `${profileData.contact_first_name || ''} ${profileData.contact_last_name || ''}`.trim(),
          status: profileData.status || 'active'
        })
      });

      const result = await response.json();
      console.log('📱 Registry: Update result:', result);
      return result;

    } catch (error: any) {
      console.error('📱 Registry: Update failed:', error);
      return { success: false, action: 'update', error: error.message };
    }
  }

  /**
   * Remove a member from the registry
   * Call after profile deletion
   */
  async delete(
    phone: string,
    groupId: string
  ): Promise<MemberRegistryResponse> {
    if (!phone) {
      console.warn('📱 Registry: No phone number provided, skipping delete');
      return { success: false, action: 'delete', error: 'No phone number provided' };
    }

    try {
      console.log('📱 Registry: Deleting member...', { phone, groupId });

      const response = await fetch(REGISTRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          phone: phone,
          group_id: groupId
        })
      });

      const result = await response.json();
      console.log('📱 Registry: Delete result:', result);
      return result;

    } catch (error: any) {
      console.error('📱 Registry: Delete failed:', error);
      return { success: false, action: 'delete', error: error.message };
    }
  }
}

// Export singleton instance
const memberRegistryService = new MemberRegistryService();
export default memberRegistryService;

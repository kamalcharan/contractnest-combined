// supabase/functions/FKauth/handlers/roles.ts
// Updated to use FamilyKnows Relationships (Parent, Spouse, Child, etc.)

/**
 * Creates default FamilyKnows relationships for a tenant using the RPC function.
 * This copies system-level relationship templates to the tenant.
 *
 * Relationships include: Owner, Parent, Spouse, Child, Grandparent, Sibling, Other
 */
export async function createDefaultRolesForTenant(supabase: any, tenantId: string, userTenantId: string) {
  try {
    // Use the RPC function to copy relationships from system templates
    const { data, error } = await supabase.rpc('copy_fk_relationships_to_tenant', {
      p_tenant_id: tenantId,
      p_user_tenant_id: userTenantId
    });

    if (error) {
      console.error('Error copying relationships:', error.message);
      // Fallback to legacy method if RPC doesn't exist yet
      await createDefaultRolesLegacy(supabase, tenantId, userTenantId);
      return;
    }

    if (data && data.length > 0) {
      const result = data[0];
      console.log(`Family relationships created successfully: ${result.relationships_created} relationships`);
      console.log(`Category ID: ${result.relationship_category_id}`);
      console.log(`Owner role assigned: ${result.owner_role_id}`);
    }
  } catch (error: any) {
    console.error('Error creating default family relationships:', error.message);
    // Fallback to legacy method
    await createDefaultRolesLegacy(supabase, tenantId, userTenantId);
  }
}

/**
 * Legacy method - used as fallback if RPC function doesn't exist
 * Creates relationships directly via table inserts
 */
async function createDefaultRolesLegacy(supabase: any, tenantId: string, userTenantId: string) {
  try {
    // Check if relationships already exist
    const { data: existingRoles } = await supabase
      .from('t_category_master')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('category_name', 'Relationships')
      .single();

    if (existingRoles) {
      console.log('Relationships already exist for family space');
      return;
    }

    // Create Relationships category
    const { data: roleCategory, error: categoryError } = await supabase
      .from('t_category_master')
      .insert({
        category_name: 'Relationships',
        display_name: 'Family Relationships',
        is_active: true,
        description: 'Relationship types in the family space',
        tenant_id: tenantId,
        x_product: 'familyknows'
      })
      .select()
      .single();

    if (categoryError) {
      console.error('Relationship category creation error:', categoryError.message);
      throw new Error(`Error creating relationships category: ${categoryError.message}`);
    }

    console.log('Relationship category created successfully:', roleCategory.id);

    // Create default FamilyKnows relationships
    const defaultRelationships = [
      {
        sub_cat_name: 'OWNER',
        display_name: 'Family Head',
        description: 'Primary owner/head of the family space',
        category_id: roleCategory.id,
        hexcolor: '#32e275',
        icon_name: 'Crown',
        is_active: true,
        sequence_no: 1,
        tenant_id: tenantId,
        is_deletable: false,
        form_settings: { permissions: ['all'] }
      },
      {
        sub_cat_name: 'PARENT',
        display_name: 'Parent',
        description: 'Parent in the family (Mother/Father)',
        category_id: roleCategory.id,
        hexcolor: '#3B82F6',
        icon_name: 'Users',
        is_active: true,
        sequence_no: 2,
        tenant_id: tenantId,
        is_deletable: false,
        form_settings: { permissions: ['read', 'write', 'invite'] }
      },
      {
        sub_cat_name: 'SPOUSE',
        display_name: 'Spouse',
        description: 'Spouse/Partner in the family',
        category_id: roleCategory.id,
        hexcolor: '#EC4899',
        icon_name: 'Heart',
        is_active: true,
        sequence_no: 3,
        tenant_id: tenantId,
        is_deletable: false,
        form_settings: { permissions: ['read', 'write', 'invite'] }
      },
      {
        sub_cat_name: 'CHILD',
        display_name: 'Child',
        description: 'Child in the family (Son/Daughter)',
        category_id: roleCategory.id,
        hexcolor: '#F59E0B',
        icon_name: 'Baby',
        is_active: true,
        sequence_no: 4,
        tenant_id: tenantId,
        is_deletable: false,
        form_settings: { permissions: ['read', 'write'] }
      },
      {
        sub_cat_name: 'GRANDPARENT',
        display_name: 'Grandparent',
        description: 'Grandparent in the family',
        category_id: roleCategory.id,
        hexcolor: '#8B5CF6',
        icon_name: 'UserCircle',
        is_active: true,
        sequence_no: 5,
        tenant_id: tenantId,
        is_deletable: false,
        form_settings: { permissions: ['read', 'write'] }
      },
      {
        sub_cat_name: 'SIBLING',
        display_name: 'Sibling',
        description: 'Sibling in the family (Brother/Sister)',
        category_id: roleCategory.id,
        hexcolor: '#06B6D4',
        icon_name: 'Users2',
        is_active: true,
        sequence_no: 6,
        tenant_id: tenantId,
        is_deletable: false,
        form_settings: { permissions: ['read', 'write'] }
      },
      {
        sub_cat_name: 'OTHER',
        display_name: 'Other',
        description: 'Other family member or relative',
        category_id: roleCategory.id,
        hexcolor: '#64748B',
        icon_name: 'User',
        is_active: true,
        sequence_no: 7,
        tenant_id: tenantId,
        is_deletable: true,
        form_settings: { permissions: ['read'] }
      }
    ];

    const { data: createdRoles, error: rolesError } = await supabase
      .from('t_category_details')
      .insert(defaultRelationships)
      .select();

    if (rolesError) {
      console.error('Relationships creation error:', rolesError.message);
      throw new Error(`Error creating default relationships: ${rolesError.message}`);
    }

    console.log('Default family relationships created:', createdRoles.map((r: any) => r.display_name).join(', '));

    // Find the Owner role to assign to user
    const ownerRole = createdRoles.find((r: any) => r.sub_cat_name === 'OWNER');

    if (ownerRole && userTenantId) {
      // Assign Owner role to user (family head)
      const { error: roleAssignError } = await supabase
        .from('t_user_tenant_roles')
        .insert({
          user_tenant_id: userTenantId,
          role_id: ownerRole.id
        });

      if (roleAssignError) {
        console.error('Role assignment error:', roleAssignError.message);
        throw new Error(`Error assigning family head role: ${roleAssignError.message}`);
      }

      console.log('Family Head relationship assigned successfully to user');
    }
  } catch (error: any) {
    console.error('Error in legacy role creation:', error.message);
    throw error;
  }
}

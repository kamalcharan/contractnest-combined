// src/components/users/user-profile/WorkspacesSection.tsx
import React from 'react';
import { Building2, Users, Shield, Calendar, ExternalLink } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface WorkspacesSectionProps {
  profile: any;
}

const WorkspacesSection: React.FC<WorkspacesSectionProps> = ({ profile }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const navigate = useNavigate();
  const { tenants, currentTenant } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Use tenants from AuthContext, fallback to profile.workspaces if available
  // Map tenants to workspace format for display
  const workspaces = React.useMemo(() => {
    // If profile has workspaces with full data, use those
    if (profile?.workspaces && profile.workspaces.length > 0) {
      return profile.workspaces;
    }

    // Otherwise, map tenants from AuthContext to workspace format
    if (tenants && tenants.length > 0) {
      return tenants.map((tenant: any) => ({
        id: tenant.id,
        name: tenant.name,
        workspace_code: tenant.workspace_code,
        is_default: tenant.is_default || (currentTenant?.id === tenant.id),
        is_owner: tenant.is_owner || false,
        joined_at: tenant.created_at || null,
        member_count: tenant.member_count || null,
        role: tenant.is_owner ? 'owner' : (tenant.is_admin ? 'admin' : 'member'),
        permissions: tenant.permissions || []
      }));
    }

    return [];
  }, [profile?.workspaces, tenants, currentTenant]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get role badge color
  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'owner':
        return {
          backgroundColor: colors.semantic.error + '20',
          color: colors.semantic.error
        };
      case 'manager':
        return {
          backgroundColor: colors.brand.primary + '20',
          color: colors.brand.primary
        };
      case 'member':
      default:
        return {
          backgroundColor: colors.utility.primaryText + '10',
          color: colors.utility.secondaryText
        };
    }
  };

  return (
    <div 
      className="border rounded-lg p-6"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Building2 className="mr-3" style={{ color: colors.brand.primary }} />
          <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
            Workspace Access
          </h2>
        </div>
        <span
          className="text-sm px-3 py-1 rounded-full"
          style={{
            backgroundColor: colors.brand.primary + '10',
            color: colors.brand.primary
          }}
        >
          {workspaces.length || 0} Workspace{workspaces.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Workspaces List */}
      {workspaces && workspaces.length > 0 ? (
        <div className="space-y-3">
          {workspaces.map((workspace: any) => (
            <div 
              key={workspace.id}
              className="p-4 rounded-lg border transition-colors hover:shadow-md"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="font-medium text-lg" style={{ color: colors.utility.primaryText }}>
                      {workspace.name}
                    </h3>
                    {workspace.is_default && (
                      <span 
                        className="ml-2 px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: colors.semantic.success + '20',
                          color: colors.semantic.success
                        }}
                      >
                        Default
                      </span>
                    )}
                    {workspace.is_owner && (
                      <span 
                        className="ml-2 px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: colors.semantic.warning + '20' || '#fef3c7',
                          color: colors.semantic.warning || '#f59e0b'
                        }}
                      >
                        Owner
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm" style={{ color: colors.utility.secondaryText }}>
                    {/* Workspace Code */}
                    <div className="flex items-center">
                      <Shield className="mr-1 h-3 w-3" />
                      <span>{workspace.workspace_code || 'N/A'}</span>
                    </div>

                    {/* Join Date */}
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      <span>Joined {formatDate(workspace.joined_at)}</span>
                    </div>

                    {/* Member Count */}
                    {workspace.member_count && (
                      <div className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        <span>{workspace.member_count} members</span>
                      </div>
                    )}
                  </div>

                  {/* Role */}
                  <div className="mt-3 flex items-center space-x-2">
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Role:
                    </span>
                    <span 
                      className="px-2 py-0.5 text-sm rounded-md font-medium"
                      style={getRoleBadgeStyle(workspace.role)}
                    >
                      {workspace.role || 'Member'}
                    </span>
                  </div>

                  {/* Permissions if available */}
                  {workspace.permissions && workspace.permissions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs mb-1" style={{ color: colors.utility.secondaryText }}>
                        Permissions:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {workspace.permissions.slice(0, 5).map((permission: string, index: number) => (
                          <span 
                            key={index}
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: colors.utility.primaryText + '10',
                              color: colors.utility.secondaryText
                            }}
                          >
                            {permission}
                          </span>
                        ))}
                        {workspace.permissions.length > 5 && (
                          <span 
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: colors.utility.primaryText + '10',
                              color: colors.utility.secondaryText
                            }}
                          >
                            +{workspace.permissions.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Workspace Button */}
                <button
                  onClick={() => navigate('/settings/users')}
                  className="ml-4 p-2 rounded-md transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.brand.primary
                  }}
                  title="View workspace"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Building2 
            size={48} 
            className="mx-auto mb-4" 
            style={{ color: colors.utility.secondaryText + '50' }}
          />
          <p className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
            No Workspaces Found
          </p>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            You don't have access to any workspaces yet
          </p>
        </div>
      )}

      {/* Information Note */}
      <div 
        className="mt-6 p-4 rounded-lg border"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          <strong>Note:</strong> This section shows all workspaces you have access to. 
          Workspace administrators can manage your access and permissions. 
          Contact your workspace admin if you need additional permissions.
        </p>
      </div>
    </div>
  );
};

export default WorkspacesSection;
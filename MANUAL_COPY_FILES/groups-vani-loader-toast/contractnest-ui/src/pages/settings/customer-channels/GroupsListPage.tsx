// src/pages/settings/customer-channels/GroupsListPage.tsx
// Groups List Page - View and manage group memberships

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import {
  Users,
  Shield,
  Lock,
  Unlock,
  Eye,
  Plus,
  RefreshCw,
  Building2,
  CheckCircle,
  Search,
  Info,
  MessageCircle,
  Compass
} from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useGroups, useVerifyGroupAccess, groupQueryKeys } from '../../../hooks/queries/useGroupQueries';
import groupsService from '../../../services/groupsService';
import { vaniToast } from '../../../components/common/toast';
import { VaNiLoader } from '../../../components/common/loaders';

// Authentication Modal Component - Verifies user or admin password
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  onSuccess: () => void;
  accessType?: 'user' | 'admin';
}

const AuthenticationModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  group,
  onSuccess,
  accessType = 'user'
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyAccessMutation = useVerifyGroupAccess();

  const handleAuthenticate = async () => {
    if (!password.trim() || !group) return;

    setIsVerifying(true);
    try {
      const result = await verifyAccessMutation.mutateAsync({
        groupId: group.id,
        password: password.trim(),
        accessType: accessType
      });

      if (result.access_granted) {
        const message = accessType === 'admin'
          ? `Admin access granted to ${group.name}!`
          : `Access granted to ${group.name}!`;
        vaniToast.success(message);
        onSuccess();
        onClose();
      } else {
        vaniToast.error('Invalid password. Please try again.');
      }
    } catch (error: any) {
      vaniToast.error(error.message || 'Authentication failed');
    } finally {
      setIsVerifying(false);
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`,
              borderBottom: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: accessType === 'admin'
                    ? `${colors.semantic.warning}20`
                    : `${colors.brand.primary}20`
                }}
              >
                <Shield
                  className="w-6 h-6"
                  style={{
                    color: accessType === 'admin'
                      ? colors.semantic.warning
                      : colors.brand.primary
                  }}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                  {accessType === 'admin' ? 'Admin Authentication' : 'Authenticate Access'}
                </h2>
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {group?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: accessType === 'admin'
                  ? `${colors.semantic.warning}10`
                  : `${colors.semantic.info}10`,
                border: `1px solid ${accessType === 'admin' ? colors.semantic.warning : colors.semantic.info}30`
              }}
            >
              <div className="flex items-start space-x-3">
                <Info
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{
                    color: accessType === 'admin'
                      ? colors.semantic.warning
                      : colors.semantic.info
                  }}
                />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {accessType === 'admin'
                    ? 'Enter the admin password to access group administration features like member management and analytics.'
                    : 'Enter the group password provided by your administrator to join this group and create your profile.'}
                </p>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                {accessType === 'admin' ? 'Admin Password' : 'Group Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
                placeholder="Enter password..."
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthenticate}
                disabled={!password.trim() || isVerifying}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                {isVerifying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    <span>Authenticate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper to get authenticated groups from sessionStorage
const getAuthenticatedGroups = (): string[] => {
  try {
    const stored = sessionStorage.getItem('authenticated_groups');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to add authenticated group to sessionStorage
const addAuthenticatedGroup = (groupId: string) => {
  const groups = getAuthenticatedGroups();
  if (!groups.includes(groupId)) {
    groups.push(groupId);
    sessionStorage.setItem('authenticated_groups', JSON.stringify(groups));
  }
};

// Main Component
const GroupsListPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  const { currentTenant } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [adminAuthGroup, setAdminAuthGroup] = useState<any>(null);
  const [authenticatedGroupIds, setAuthenticatedGroupIds] = useState<string[]>(() => getAuthenticatedGroups());

  // Fetch all groups
  const { data: groups, isLoading: isLoadingGroups, refetch: refetchGroups } = useGroups('all');

  // Fetch memberships for ALL groups in parallel
  const membershipQueries = useQueries({
    queries: (groups || []).map((group: any) => ({
      queryKey: groupQueryKeys.groupMemberships(group.id, { status: 'all' }),
      queryFn: () => groupsService.getGroupMemberships(group.id, { status: 'all' }),
      enabled: !!currentTenant && !!group.id,
      staleTime: 2 * 60 * 1000,
    })),
  });

  // Refetch all memberships
  const refetchMemberships = () => {
    membershipQueries.forEach((query) => query.refetch());
  };

  // Build membership map for current tenant from ALL groups
  const membershipMap = useMemo(() => {
    const map: Record<string, any> = {};

    if (currentTenant) {
      membershipQueries.forEach((query) => {
        if (query.data?.memberships) {
          query.data.memberships.forEach((m: any) => {
            if (m.tenant_id === currentTenant.id && m.group_id) {
              map[m.group_id] = m;
            }
          });
        }
      });
    }

    return map;
  }, [membershipQueries, currentTenant]);

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchQuery.trim()) return groups;

    const query = searchQuery.toLowerCase();
    return groups.filter((g: any) =>
      g.name?.toLowerCase().includes(query) ||
      g.description?.toLowerCase().includes(query) ||
      g.group_type?.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Get group status for current tenant
  const getGroupStatus = (group: any) => {
    const membership = membershipMap[group.id];

    if (!membership) {
      // Check if user has authenticated this group (stored in sessionStorage)
      if (authenticatedGroupIds.includes(group.id)) {
        return { status: 'authenticated', label: 'Authenticated', action: 'create' };
      }
      return { status: 'locked', label: 'Not Authenticated', action: 'authenticate' };
    }

    // Check if profile is created (has ai_enhanced_description or short_description)
    const hasProfile = membership.profile_data?.ai_enhanced_description ||
                       membership.profile_data?.short_description;

    if (hasProfile) {
      return { status: 'active', label: 'Profile Created', action: 'view', membershipId: membership.id };
    }

    return { status: 'authenticated', label: 'Authenticated', action: 'create', membershipId: membership.id };
  };

  // Handle authenticate click
  const handleAuthenticate = (group: any) => {
    setSelectedGroup(group);
    setAuthModalOpen(true);
  };

  // Handle authentication success - navigate to dashboard to create membership
  const handleAuthSuccess = () => {
    // Store authenticated group in sessionStorage
    if (selectedGroup?.id) {
      addAuthenticatedGroup(selectedGroup.id);
      setAuthenticatedGroupIds(prev => [...prev, selectedGroup.id]);
    }
    refetchGroups();
    refetchMemberships();
    // Navigate to dashboard - it will handle "Let me in" flow
    navigate(`/settings/configure/customer-channels/groups/${selectedGroup?.id}`);
  };

  // Handle create profile click (may or may not have membership yet)
  const handleCreate = (group: any, membershipId?: string) => {
    const url = membershipId
      ? `/settings/configure/customer-channels/groups/${group.id}?membership=${membershipId}`
      : `/settings/configure/customer-channels/groups/${group.id}`;
    navigate(url);
  };

  // Handle view profile click
  const handleView = (group: any, membershipId: string) => {
    navigate(`/settings/configure/customer-channels/groups/${group.id}?membership=${membershipId}`);
  };

  // Handle admin click - open admin auth modal
  const handleAdminAuth = (group: any) => {
    setAdminAuthGroup(group);
    setAdminAuthModalOpen(true);
  };

  // Handle admin auth success - navigate to admin page
  const handleAdminAuthSuccess = () => {
    if (adminAuthGroup?.id) {
      navigate('/vani/channels/bbb/admin');
    }
  };

  // Loading state
  if (isLoadingGroups) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <VaNiLoader size="md" message="Loading Groups..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
            Business Groups
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Join groups to create your profile and connect with other members
          </p>
        </div>
        <button
          onClick={() => { refetchGroups(); refetchMemberships(); }}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{ backgroundColor: `${colors.brand.primary}15` }}
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" style={{ color: colors.brand.primary }} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
          style={{ color: colors.utility.secondaryText }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search groups..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`,
            color: colors.utility.primaryText,
            '--tw-ring-color': colors.brand.primary
          } as React.CSSProperties}
        />
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px dashed ${colors.utility.primaryText}20`
          }}
        >
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: colors.utility.secondaryText }} />
          <p className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
            No Groups Found
          </p>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {searchQuery ? 'Try a different search term' : 'No business groups are available yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group: any) => {
            const groupStatus = getGroupStatus(group);

            return (
              <Card
                key={group.id}
                className="overflow-hidden transition-all hover:shadow-lg"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: groupStatus.status === 'active'
                    ? `${colors.semantic.success}40`
                    : `${colors.utility.primaryText}15`
                }}
              >
                {/* Card Header with Status */}
                <div
                  className="px-5 py-4"
                  style={{
                    background: groupStatus.status === 'active'
                      ? `linear-gradient(135deg, ${colors.semantic.success}10 0%, ${colors.semantic.success}05 100%)`
                      : groupStatus.status === 'authenticated'
                      ? `linear-gradient(135deg, ${colors.semantic.info}10 0%, ${colors.semantic.info}05 100%)`
                      : `linear-gradient(135deg, ${colors.utility.primaryText}05 0%, transparent 100%)`,
                    borderBottom: `1px solid ${colors.utility.primaryText}10`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2.5 rounded-xl"
                        style={{
                          backgroundColor: groupStatus.status === 'active'
                            ? `${colors.semantic.success}15`
                            : groupStatus.status === 'authenticated'
                            ? `${colors.semantic.info}15`
                            : `${colors.utility.primaryText}10`
                        }}
                      >
                        <Building2
                          className="w-5 h-5"
                          style={{
                            color: groupStatus.status === 'active'
                              ? colors.semantic.success
                              : groupStatus.status === 'authenticated'
                              ? colors.semantic.info
                              : colors.utility.secondaryText
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                          {group.name}
                        </h3>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: groupStatus.status === 'active'
                              ? `${colors.semantic.success}15`
                              : groupStatus.status === 'authenticated'
                              ? `${colors.semantic.info}15`
                              : `${colors.utility.primaryText}10`,
                            color: groupStatus.status === 'active'
                              ? colors.semantic.success
                              : groupStatus.status === 'authenticated'
                              ? colors.semantic.info
                              : colors.utility.secondaryText
                          }}
                        >
                          {groupStatus.label}
                        </span>
                      </div>
                    </div>

                    {/* Status Icon */}
                    {groupStatus.status === 'active' ? (
                      <CheckCircle className="w-5 h-5" style={{ color: colors.semantic.success }} />
                    ) : groupStatus.status === 'authenticated' ? (
                      <Unlock className="w-5 h-5" style={{ color: colors.semantic.info }} />
                    ) : (
                      <Lock className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <CardContent className="p-5">
                  <p
                    className="text-sm line-clamp-2 mb-4"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {group.description || 'Join this business group to connect with members and showcase your services.'}
                  </p>

                  {/* Group Info */}
                  <div className="flex items-center space-x-4 mb-4 text-xs" style={{ color: colors.utility.secondaryText }}>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{group.member_count || '45+'} members</span>
                    </span>
                    <span className="capitalize">{group.group_type?.replace('_', ' ')}</span>
                  </div>

                  {/* Action Button */}
                  {groupStatus.action === 'authenticate' && (
                    <button
                      onClick={() => handleAuthenticate(group)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        border: `1px solid ${colors.utility.primaryText}20`
                      }}
                    >
                      <Lock className="w-4 h-4" />
                      <span>Authenticate</span>
                    </button>
                  )}

                  {groupStatus.action === 'create' && (
                    <button
                      onClick={() => handleCreate(group, groupStatus.membershipId)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90"
                      style={{
                        background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Profile</span>
                    </button>
                  )}

                  {groupStatus.action === 'view' && (
                    <div className="flex items-center justify-center space-x-2">
                      {/* View Profile */}
                      <button
                        onClick={() => handleView(group, groupStatus.membershipId!)}
                        title="View Profile"
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90"
                        style={{
                          background: `linear-gradient(to right, ${colors.semantic.success}, ${colors.brand.primary})`
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>

                      {/* Chat - VaNi AI Chat (BBB Directory Search) - Coming Soon */}
                      <button
                        title="Chat with VaNi (Coming Soon)"
                        className="p-2.5 rounded-lg transition-all cursor-not-allowed opacity-50"
                        style={{
                          backgroundColor: `${colors.brand.primary}15`,
                          color: colors.brand.primary
                        }}
                        disabled
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {/* WhatsApp - Future */}
                      <button
                        title="WhatsApp (Coming Soon)"
                        className="p-2.5 rounded-lg transition-all cursor-not-allowed opacity-50"
                        style={{
                          backgroundColor: '#25D36615',
                          color: '#25D366'
                        }}
                        disabled
                      >
                        {/* WhatsApp Icon SVG */}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>

                      {/* Explore - Group Member Profiles - Coming Soon */}
                      <button
                        title="Explore (Coming Soon)"
                        className="p-2.5 rounded-lg transition-all cursor-not-allowed opacity-50"
                        style={{
                          backgroundColor: `${colors.brand.secondary}15`,
                          color: colors.brand.secondary
                        }}
                        disabled
                      >
                        <Compass className="w-4 h-4" />
                      </button>

                      {/* Admin - Requires Authentication */}
                      <button
                        onClick={() => handleAdminAuth(group)}
                        title="Group Admin"
                        className="p-2.5 rounded-lg transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${colors.semantic.warning}15`,
                          color: colors.semantic.warning
                        }}
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
      <div
        className="p-5 rounded-xl"
        style={{
          backgroundColor: `${colors.semantic.info}08`,
          border: `1px solid ${colors.semantic.info}25`
        }}
      >
        <div className="flex items-start space-x-4">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${colors.semantic.info}15` }}
          >
            <Info className="w-5 h-5" style={{ color: colors.semantic.info }} />
          </div>
          <div>
            <h4 className="font-medium mb-1" style={{ color: colors.utility.primaryText }}>
              How Group Profiles Work
            </h4>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              1. <strong>Authenticate</strong> - Enter the group password provided by your admin<br />
              2. <strong>Create Profile</strong> - Add your business description and let AI enhance it<br />
              3. <strong>Add Semantic Clusters</strong> - Improve searchability with related keywords<br />
              4. <strong>Get Discovered</strong> - Members can find you via WhatsApp bot and web search
            </p>
          </div>
        </div>
      </div>

      {/* Authentication Modal - User Access */}
      <AuthenticationModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
        onSuccess={handleAuthSuccess}
        accessType="user"
      />

      {/* Authentication Modal - Admin Access */}
      <AuthenticationModal
        isOpen={adminAuthModalOpen}
        onClose={() => {
          setAdminAuthModalOpen(false);
          setAdminAuthGroup(null);
        }}
        group={adminAuthGroup}
        onSuccess={handleAdminAuthSuccess}
        accessType="admin"
      />
    </div>
  );
};

export default GroupsListPage;

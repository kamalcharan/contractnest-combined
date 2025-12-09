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
  Compass,
  Phone
} from 'lucide-react';
import { useGroups, useGroupMemberships, useVerifyGroupAccess } from '../../../hooks/queries/useGroupQueries';
import toast from 'react-hot-toast';

// Authentication Modal Component - Only verifies password
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  onSuccess: () => void;
}

const AuthenticationModal: React.FC<AuthModalProps> = ({ isOpen, onClose, group, onSuccess }) => {
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
        accessType: 'user'
      });

      if (result.access_granted) {
        toast.success(`Access granted to ${group.name}!`, {
          style: { background: colors.semantic.success, color: '#FFF' }
        });
        onSuccess();
        onClose();
      } else {
        toast.error('Invalid password. Please try again.', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
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
                style={{ backgroundColor: `${colors.brand.primary}20` }}
              >
                <Shield className="w-6 h-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                  Authenticate Access
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
                backgroundColor: `${colors.semantic.info}10`,
                border: `1px solid ${colors.semantic.info}30`
              }}
            >
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  Enter the group password provided by your administrator to join this group and create your profile.
                </p>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Group Password
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
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [authenticatedGroupIds, setAuthenticatedGroupIds] = useState<string[]>(() => getAuthenticatedGroups());

  // Fetch all groups
  const { data: groups, isLoading: isLoadingGroups, refetch: refetchGroups } = useGroups('all');

  // Get first BBB group ID to check memberships
  const bbbGroupId = groups?.[0]?.id || '';

  // Fetch user's memberships for the BBB group
  const { data: membershipsData, refetch: refetchMemberships } = useGroupMemberships(bbbGroupId, { status: 'all' });

  // Build membership map for current tenant
  const membershipMap = useMemo(() => {
    const map: Record<string, any> = {};

    if (membershipsData?.memberships && currentTenant) {
      membershipsData.memberships.forEach((m: any) => {
        if (m.tenant_id === currentTenant.id) {
          map[m.group_id] = m;
        }
      });
    }

    return map;
  }, [membershipsData, currentTenant]);

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

  // Loading state
  if (isLoadingGroups) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }}
          />
          <p style={{ color: colors.utility.secondaryText }}>Loading Groups...</p>
        </div>
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

                      {/* Chat */}
                      <button
                        onClick={() => navigate('/vani/chat')}
                        title="Chat with VaNi"
                        className="p-2.5 rounded-lg transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${colors.semantic.info}15`,
                          color: colors.semantic.info
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {/* WhatsApp - Future */}
                      <button
                        title="WhatsApp (Coming Soon)"
                        className="p-2.5 rounded-lg transition-all cursor-not-allowed opacity-50"
                        style={{
                          backgroundColor: `${colors.semantic.success}15`,
                          color: colors.semantic.success
                        }}
                        disabled
                      >
                        <Phone className="w-4 h-4" />
                      </button>

                      {/* Explore - Group Member Profiles */}
                      <button
                        onClick={() => navigate('/vani/tenant-profiles')}
                        title="Explore Group Members"
                        className="p-2.5 rounded-lg transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${colors.brand.primary}15`,
                          color: colors.brand.primary
                        }}
                      >
                        <Compass className="w-4 h-4" />
                      </button>

                      {/* Admin */}
                      <button
                        onClick={() => navigate('/vani/channels/bbb/admin')}
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

      {/* Authentication Modal */}
      <AuthenticationModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default GroupsListPage;

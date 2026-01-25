// src/pages/settings/users/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Download,
  RefreshCw,
  Settings,
  Shield,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import UsersList from '@/components/users/UsersList';
import InvitationsList from '@/components/users/InvitationsList';
import InviteUserModal from '@/components/users/InviteUserModal';
import InvitationDetailsModal from '@/components/users/InvitationDetailsModal';
import { cn } from '@/lib/utils';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { Invitation } from '@/hooks/useInvitations';

type TabType = 'all' | 'active' | 'pending' | 'cancelled';

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, user: currentUser } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Use the hooks for real data with autoLoad false for lazy loading
  const {
    users,
    loading: usersLoading,
    fetchUsers,
    suspendUser,
    activateUser,
    resetUserPassword,
    activeCount,
    invitedCount,
    suspendedCount
  } = useUsers({ autoLoad: false });

  const {
    invitations,
    loading: invitationsLoading,
    submitting,
    createInvitation,
    resendInvitation,
    cancelInvitation,
    fetchInvitations,
    statusFilter,
    handleStatusChange
  } = useInvitations({ autoLoad: false });

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationDetails, setShowInvitationDetails] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState<Record<TabType, boolean>>({ all: false, active: false, pending: false, cancelled: false });
  const [countsLoaded, setCountsLoaded] = useState(false);

  // Separate state for cancelled invitations
  const [cancelledInvitations, setCancelledInvitations] = useState<Invitation[]>([]);
  const [cancelledLoading, setCancelledLoading] = useState(false);
  const [cancelledCount, setCancelledCount] = useState(0);

  // Fetch cancelled invitations
  const fetchCancelledInvitations = async () => {
    if (!currentTenant?.id) return;

    setCancelledLoading(true);
    try {
      const response = await api.get('/api/users/invitations', {
        params: {
          status: 'cancelled',
          page: 1,
          limit: 50 // Get all cancelled invitations
        }
      });

      setCancelledInvitations(response.data.data || []);
      setCancelledCount(response.data.pagination?.total || response.data.data?.length || 0);
    } catch (error) {
      console.error('Error fetching cancelled invitations:', error);
      setCancelledInvitations([]);
      setCancelledCount(0);
    } finally {
      setCancelledLoading(false);
    }
  };

  // Load counts for all tabs on initial mount (for tab badges)
  useEffect(() => {
    const loadAllCounts = async () => {
      if (!currentTenant?.id || countsLoaded) return;

      try {
        // Load data for all tabs to populate counts
        await Promise.all([
          fetchUsers(1, 'all'),
          fetchUsers(1, 'active'),
          fetchUsers(1, 'invited'),
          fetchInvitations(1, 'pending'),
          fetchCancelledInvitations()
        ]);
        setCountsLoaded(true);
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    };

    loadAllCounts();
  }, [currentTenant?.id]);

  // Lazy load data when tab changes
  useEffect(() => {
    const loadTabData = async () => {
      if (!currentTenant?.id || dataLoaded[activeTab]) return;

      switch (activeTab) {
        case 'all':
          await fetchUsers(1, 'all');
          break;
        case 'active':
          await fetchUsers(1, 'active');
          break;
        case 'pending':
          // For pending, we need both invited users and invitations
          await Promise.all([
            fetchUsers(1, 'invited'),
            fetchInvitations(1, 'pending')
          ]);
          break;
        case 'cancelled':
          await fetchCancelledInvitations();
          break;
      }

      setDataLoaded(prev => ({ ...prev, [activeTab]: true }));
    };

    loadTabData();
  }, [activeTab, currentTenant?.id]);

  // Check if user has permission to manage team
  const canManageTeam = true; // TODO: Implement proper permission check

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const fetchRoles = async () => {
      if (!currentTenant?.id) return;

      setRolesLoading(true);
      try {
        // Get categories from masterdata API
        const categoriesResponse = await api.get(
          `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${currentTenant.id}`
        );

        const categories = categoriesResponse.data;
        const rolesCategory = categories.find((c: any) => c.CategoryName === 'Roles' || c.DisplayName === 'Roles');

        if (rolesCategory) {
          // Get role details from masterdata API
          const rolesResponse = await api.get(
            `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${rolesCategory.id}&tenantId=${currentTenant.id}`
          );

          const roleDetails = rolesResponse.data;

          // Transform to match expected format
          const transformedRoles = roleDetails
            .filter((r: any) => r.is_active)
            .map((role: any) => ({
              id: role.id,
              name: role.DisplayName,
              description: role.Description || undefined
            }));

          setAvailableRoles(transformedRoles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        vaniToast.error('Failed to load roles');
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, [currentTenant?.id]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/settings');
  };

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reset loaded state to force reload
      setDataLoaded({ all: false, active: false, pending: false, cancelled: false });

      // Reload current tab data
      switch (activeTab) {
        case 'all':
          await fetchUsers(1, 'all');
          break;
        case 'active':
          await fetchUsers(1, 'active');
          break;
        case 'pending':
          await Promise.all([
            fetchUsers(1, 'invited'),
            fetchInvitations(1, 'pending')
          ]);
          break;
        case 'cancelled':
          await fetchCancelledInvitations();
          break;
      }

      setDataLoaded(prev => ({ ...prev, [activeTab]: true }));
      vaniToast.success('Data refreshed');
    } catch (error) {
      vaniToast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle invite team member
  const handleInviteTeamMember = async (data: any) => {
    const invitation = await createInvitation(data);
    if (invitation) {
      setShowInviteModal(false);

      // Fetch all invitation statuses and users to update all counts immediately
      await Promise.all([
        fetchInvitations(1, 'all'),
        fetchInvitations(1, 'pending'),
        fetchInvitations(1, 'accepted'),
        fetchInvitations(1, 'expired'),
        fetchUsers(1, 'invited') // Update invited users count
      ]);

      // Reset loaded state to force refresh of all tabs
      setDataLoaded({ all: false, active: false, pending: false, cancelled: false });

      // Refresh current tab display if needed
      if (activeTab !== 'all') {
        await handleRefresh();
      }
    }
  };

  // Handle view user
  const handleViewUser = (user: any) => {
    navigate(`/settings/users/view/${user.user_id}`);
  };

  // Handle edit user
  const handleEditUser = (user: any) => {
    navigate(`/settings/users/edit/${user.user_id}`);
  };

  // Handle suspend team member
  const handleSuspendUser = async (user: any) => {
    if (confirm(`Are you sure you want to suspend ${user.first_name} ${user.last_name}?`)) {
      await suspendUser(user.user_id);
    }
  };

  // Handle resend invitation from users list
  const handleResendFromUsersList = async (userId: string) => {
    const user = users.find(u => u.user_id === userId);
if (user?.status === 'invited') {
      // Find corresponding invitation
      const invitation = invitations.find(inv =>
        inv.email === user.email || inv.mobile_number === user.mobile_number
      );
      if (invitation) {
        await resendInvitation(invitation.id);
      }
    }
  };

  // Handle cancel invitation and refresh cancelled list
  const handleCancelInvitation = async (invitationId: string) => {
    const success = await cancelInvitation(invitationId);
    if (success) {
      // Refresh cancelled invitations count
      await fetchCancelledInvitations();
      // Reset cancelled tab loaded state
      setDataLoaded(prev => ({ ...prev, cancelled: false }));
    }
    return success;
  };

  // Get filtered users based on tab
  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'active':
        return users.filter(u => u.status === 'active');
      case 'pending':
        // For pending tab, show invited users
        return users.filter(u => u.status === 'invited');
      case 'all':
      default:
        return users;
    }
  };

  // Get tab counts
  const pendingCount = invitedCount + invitations.filter(inv =>
    ['pending', 'sent', 'resent'].includes(inv.status)
  ).length;

  const tabCounts = {
    all: users.length,
    active: activeCount,
    pending: pendingCount,
    cancelled: cancelledCount
  };

  // Calculate team member limit (you may want to get this from tenant settings)
  const teamLimit = 100; // TODO: Get from tenant plan/settings

  // Check if we should show invitations list
  const showInvitationsList = activeTab === 'pending' && invitations.length > 0;
  const showCancelledList = activeTab === 'cancelled';
  const showUsersList = activeTab !== 'pending' && activeTab !== 'cancelled' || (activeTab === 'pending' && !showInvitationsList);

  return (
    <div
      className="p-6 min-h-screen transition-colors duration-200"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
          >
            <ArrowLeft
              className="h-5 w-5 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
          <div className="flex-1">
            <h1
              className="text-2xl font-bold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Team Management
            </h1>
            <p
              className="transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Manage team members and invitations for {currentTenant?.name}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-2 rounded-md transition-colors hover:opacity-80",
              isRefreshing && "animate-spin"
            )}
            style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
          >
            <RefreshCw
              size={20}
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div
            className="border rounded-lg p-4 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Total Team
                </p>
                <p
                  className="text-2xl font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {tabCounts.all}
                </p>
              </div>
              <Users
                className="h-8 w-8 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              />
            </div>
          </div>

          <div
            className="border rounded-lg p-4 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Active Team
                </p>
                <p
                  className="text-2xl font-semibold transition-colors"
                  style={{ color: colors.semantic.success }}
                >
                  {tabCounts.active}
                </p>
              </div>
              <Shield
                className="h-8 w-8 transition-colors"
                style={{ color: colors.semantic.success }}
              />
            </div>
          </div>

          <div
            className="border rounded-lg p-4 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Pending Invites
                </p>
                <p
                  className="text-2xl font-semibold transition-colors"
                  style={{ color: colors.semantic.warning || '#f59e0b' }}
                >
                  {tabCounts.pending}
                </p>
              </div>
              <UserPlus
                className="h-8 w-8 transition-colors"
                style={{ color: colors.semantic.warning || '#f59e0b' }}
              />
            </div>
          </div>

          <div
            className="border rounded-lg p-4 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Cancelled
                </p>
                <p
                  className="text-2xl font-semibold transition-colors"
                  style={{ color: colors.semantic.error }}
                >
                  {tabCounts.cancelled}
                </p>
              </div>
              <XCircle
                className="h-8 w-8 transition-colors"
                style={{ color: colors.semantic.error }}
              />
            </div>
          </div>

          <div
            className="border rounded-lg p-4 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Team Limit
                </p>
                <p
                  className="text-2xl font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {tabCounts.all}/{teamLimit}
                </p>
              </div>
              <AlertCircle
                className="h-8 w-8 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="border-b transition-colors"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: 'All Team', count: tabCounts.all },
              { id: 'active', label: 'Active', count: tabCounts.active },
              { id: 'pending', label: 'Pending', count: tabCounts.pending },
              { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={cn(
                  "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-primary"
                    : "border-transparent hover:opacity-80"
                )}
                style={{
                  color: activeTab === tab.id
                    ? colors.brand.primary
                    : colors.utility.secondaryText,
                  borderColor: activeTab === tab.id
                    ? colors.brand.primary
                    : 'transparent'
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "ml-2 px-2 py-0.5 text-xs rounded-full transition-colors"
                    )}
                    style={{
                      backgroundColor: activeTab === tab.id
                        ? colors.brand.primary + '10'
                        : colors.utility.primaryBackground + '80',
                      color: activeTab === tab.id
                        ? colors.brand.primary
                        : colors.utility.secondaryText
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div
        className="border rounded-lg transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <div className="p-6">
          {!canManageTeam ? (
            <div className="text-center py-12">
              <Shield
                size={48}
                className="mx-auto mb-4 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              />
              <h3
                className="text-lg font-medium mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Access Restricted
              </h3>
              <p
                className="transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                You don't have permission to manage team
              </p>
            </div>
          ) : (
            <>
              {/* Show invitations list for pending tab */}
              {showInvitationsList && (
                <div className="mb-6">
                  <h2
                    className="text-lg font-semibold mb-4 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Pending Invitations
                  </h2>
                  <InvitationsList
                    invitations={invitations.filter(inv =>
                      ['pending', 'sent', 'resent'].includes(inv.status)
                    )}
                    onResend={resendInvitation}
                    onCancel={handleCancelInvitation}
                    onViewDetails={(invitation) => {
                      setSelectedInvitation(invitation);
                      setShowInvitationDetails(true);
                    }}
                    isLoading={invitationsLoading}
                  />
                </div>
              )}

              {/* Show cancelled invitations list */}
              {showCancelledList && (
                <div>
                  <h2
                    className="text-lg font-semibold mb-4 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Cancelled Invitations
                  </h2>
                  {cancelledLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                          <div
                            className="border rounded-lg p-4 transition-colors"
                            style={{
                              backgroundColor: colors.utility.secondaryBackground,
                              borderColor: `${colors.utility.primaryText}20`
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div
                                  className="h-4 rounded w-48"
                                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                                />
                                <div
                                  className="h-3 rounded w-32"
                                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                                />
                              </div>
                              <div
                                className="h-8 rounded w-20"
                                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : cancelledInvitations.length === 0 ? (
                    <div
                      className="text-center py-12 border rounded-lg transition-colors"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: `${colors.utility.primaryText}20`
                      }}
                    >
                      <XCircle
                        size={48}
                        className="mx-auto mb-4"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <h3
                        className="text-lg font-medium mb-2 transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        No Cancelled Invitations
                      </h3>
                      <p
                        className="transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        There are no cancelled invitations to display
                      </p>
                    </div>
                  ) : (
                    <InvitationsList
                      invitations={cancelledInvitations}
                      onResend={resendInvitation}
                      onCancel={cancelInvitation}
                      onViewDetails={(invitation) => {
                        setSelectedInvitation(invitation);
                        setShowInvitationDetails(true);
                      }}
                      isLoading={cancelledLoading}
                    />
                  )}
                </div>
              )}

              {/* Show users list when appropriate */}
              {showUsersList && (
                <UsersList
                  users={getFilteredUsers()}
                  onViewUser={handleViewUser}
                  onEditUser={handleEditUser}
                  onSuspendUser={handleSuspendUser}
                  onResendInvitation={handleResendFromUsersList}
                  onInviteUser={() => setShowInviteModal(true)}
                  isLoading={usersLoading || (activeTab === 'pending' && invitationsLoading)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Invite Team Member Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteTeamMember}
        isSubmitting={submitting}
        availableRoles={availableRoles}
      />

      {/* Invitation Details Modal */}
      <InvitationDetailsModal
        invitation={selectedInvitation}
        isOpen={showInvitationDetails}
        onClose={() => {
          setShowInvitationDetails(false);
          setSelectedInvitation(null);
        }}
      />
    </div>
  );
};

export default UsersPage;

// src/pages/VaNi/channels/BBBAdminDashboard.tsx
// File 13/13 - BBB Admin Dashboard (API-connected version)

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  BarChart3,
  Shield,
  X,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import BBBMemberTable from '../../../components/VaNi/bbb/BBBMemberTable';
import ProfileCard from '../../../components/VaNi/bbb/ProfileCard';
import toast from 'react-hot-toast';
import { useGroups, useGroupMemberships } from '../../../hooks/queries/useGroupQueries';
import groupsService from '../../../services/groupsService';
import type { TenantProfile } from '../../../types/bbb';

const BBBAdminDashboard: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<any>(null);

  // Get BBB groups to find the group_id
  const { data: bbbGroups, isLoading: isLoadingGroups } = useGroups('bbb_chapter');
  const bbbGroupId = bbbGroups?.[0]?.id;

  // Get memberships from API
  const {
    data: membershipsData,
    isLoading: isLoadingMemberships,
    refetch: refetchMemberships
  } = useGroupMemberships(bbbGroupId || '', { status: 'all', limit: 100 });

  const memberships = membershipsData?.memberships || [];

  // Compute stats from memberships data
  const stats = useMemo(() => {
    const total = memberships.length;
    const active = memberships.filter((m: any) => m.status === 'active').length;
    const pending = memberships.filter((m: any) => m.status === 'pending' || m.status === 'draft').length;
    const inactive = memberships.filter((m: any) => m.status === 'inactive' || m.status === 'suspended').length;

    return {
      total_members: total,
      active_members: active,
      pending_approvals: pending,
      inactive_members: inactive
    };
  }, [memberships]);

  // Stats display config
  const statsConfig = [
    {
      icon: Users,
      label: 'Total Members',
      value: stats.total_members,
      color: colors.brand.primary,
      bgColor: `${colors.brand.primary}20`
    },
    {
      icon: CheckCircle,
      label: 'Active Members',
      value: stats.active_members,
      color: colors.semantic.success,
      bgColor: `${colors.semantic.success}20`
    },
    {
      icon: Clock,
      label: 'Pending/Draft',
      value: stats.pending_approvals,
      color: colors.semantic.warning,
      bgColor: `${colors.semantic.warning}20`
    },
    {
      icon: XCircle,
      label: 'Inactive/Suspended',
      value: stats.inactive_members,
      color: colors.utility.secondaryText,
      bgColor: `${colors.utility.secondaryText}20`
    }
  ];

  // Compute branch distribution from memberships
  const branchDistribution = useMemo(() => {
    const branches: { [key: string]: number } = {};
    memberships.forEach((m: any) => {
      const branch = m.profile_data?.branch || 'unassigned';
      branches[branch] = (branches[branch] || 0) + 1;
    });
    return Object.entries(branches).map(([name, count]) => ({ name, count }));
  }, [memberships]);

  // Recent activity based on joined_at
  const recentActivity = useMemo(() => {
    const sortedByDate = [...memberships]
      .sort((a: any, b: any) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
      .slice(0, 5);

    return sortedByDate.map((m: any) => {
      const joinedDate = new Date(m.joined_at);
      const now = new Date();
      const diffMs = now.getTime() - joinedDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      let timeAgo = '';
      if (diffHours < 1) {
        timeAgo = 'Just now';
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hours ago`;
      } else {
        timeAgo = `${diffDays} days ago`;
      }

      const actionMap: { [key: string]: { action: string; color: string } } = {
        active: { action: 'Profile active', color: colors.semantic.success },
        pending: { action: 'Pending approval', color: colors.semantic.warning },
        draft: { action: 'Profile created', color: colors.semantic.info },
        inactive: { action: 'Profile inactive', color: colors.utility.secondaryText },
        suspended: { action: 'Profile suspended', color: colors.semantic.error }
      };

      const actionInfo = actionMap[m.status] || actionMap.draft;

      return {
        member: m.tenant_profile?.business_name || 'Unknown Business',
        action: actionInfo.action,
        time: timeAgo,
        color: actionInfo.color
      };
    });
  }, [memberships, colors]);

  // Handle view
  const handleView = (membershipId: string) => {
    const membership = memberships.find((m: any) => m.id === membershipId);
    if (membership) {
      setSelectedMembership(membership);
      setViewModalOpen(true);
    }
  };

  // Handle edit - navigate to onboarding page for admin editing (future)
  const handleEdit = (membershipId: string) => {
    const membership = memberships.find((m: any) => m.id === membershipId);

    toast.success(`Opening editor for ${membership?.tenant_profile?.business_name || 'profile'}`, {
      style: { background: colors.brand.primary, color: '#FFF' }
    });

    // TODO: Implement admin edit functionality
    // Could open a modal or navigate to edit page
  };

  // Handle status change
  const handleStatusChange = async (membershipId: string, newStatus: string) => {
    const membership = memberships.find((m: any) => m.id === membershipId);

    try {
      await groupsService.updateMembershipStatus(membershipId, {
        status: newStatus as any,
        reason: `Status changed by admin to ${newStatus}`
      });

      toast.success(`${membership?.tenant_profile?.business_name || 'Profile'} status changed to ${newStatus}`, {
        style: { background: colors.semantic.success, color: '#FFF' }
      });

      // Refresh data
      refetchMemberships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Handle delete (soft delete)
  const handleDelete = async (membershipId: string) => {
    const membership = memberships.find((m: any) => m.id === membershipId);

    const confirmed = window.confirm(
      `Are you sure you want to delete ${membership?.tenant_profile?.business_name || 'this profile'}?\n\nThis will set the membership to inactive.`
    );

    if (confirmed) {
      try {
        await groupsService.updateMembershipStatus(membershipId, {
          status: 'inactive',
          reason: 'Deleted by admin'
        });

        toast.success(`${membership?.tenant_profile?.business_name || 'Profile'} has been deleted (set to inactive)`, {
          style: { background: colors.semantic.success, color: '#FFF' }
        });

        refetchMemberships();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    }
  };

  // Map selected membership to TenantProfile format for ProfileCard
  const selectedTenantProfile: TenantProfile | null = selectedMembership?.tenant_profile ? {
    id: selectedMembership.tenant_profile.id || '',
    tenant_id: selectedMembership.tenant_id || '',
    business_name: selectedMembership.tenant_profile.business_name || 'Unknown',
    business_email: selectedMembership.tenant_profile.business_email || undefined,
    city: selectedMembership.tenant_profile.city || undefined,
    logo_url: selectedMembership.tenant_profile.logo_url || undefined,
  } : null;

  // Loading state
  if (isLoadingGroups || (bbbGroupId && isLoadingMemberships)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: colors.utility.secondaryText }}>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // No BBB group found
  if (!bbbGroupId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card
          className="max-w-md w-full p-8 text-center"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.semantic.warning}40`
          }}
        >
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.semantic.warning }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
            No BBB Chapter Found
          </h2>
          <p style={{ color: colors.utility.secondaryText }}>
            Please ensure a BBB chapter group exists in the system.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            BBB Admin Dashboard
          </h1>
          <p
            className="text-lg"
            style={{ color: colors.utility.secondaryText }}
          >
            Manage BBB Directory members and monitor activity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchMemberships()}
            className="p-3 rounded-full transition-all hover:opacity-80"
            style={{ backgroundColor: `${colors.brand.primary}20` }}
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" style={{ color: colors.brand.primary }} />
          </button>
          <div
            className="p-3 rounded-full"
            style={{ backgroundColor: `${colors.brand.primary}20` }}
          >
            <Shield className="w-8 h-8" style={{ color: colors.brand.primary }} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: stat.bgColor }}
                >
                  <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <div className="text-right">
                  <p
                    className="text-3xl font-bold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: colors.utility.secondaryText }}
              >
                {stat.label}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Branch Distribution */}
      {branchDistribution.length > 0 && (
        <Card
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <CardHeader>
            <CardTitle style={{ color: colors.utility.primaryText }}>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Branch Distribution</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {branchDistribution.map((branch, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${colors.utility.primaryText}15`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="font-semibold capitalize"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {branch.name}
                    </p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: colors.brand.primary }}
                    >
                      {branch.count}
                    </p>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: `${colors.utility.primaryText}15`
                    }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${stats.total_members > 0 ? (branch.count / stats.total_members) * 100 : 0}%`,
                        backgroundColor: colors.brand.primary
                      }}
                    />
                  </div>
                  <p
                    className="text-xs mt-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {stats.total_members > 0 ? ((branch.count / stats.total_members) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <CardHeader>
            <CardTitle style={{ color: colors.utility.primaryText }}>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Recent Activity</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${colors.utility.primaryText}10`
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activity.color }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {activity.member}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {activity.action}
                    </p>
                  </div>
                  <p
                    className="text-xs"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {activity.time}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Table */}
      <BBBMemberTable
        memberships={memberships}
        isLoading={isLoadingMemberships}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* View Modal */}
      {viewModalOpen && selectedMembership && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewModalOpen(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setViewModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:opacity-80 z-10"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.secondaryText
                }}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div
                className="p-6 border-b"
                style={{
                  borderColor: `${colors.utility.primaryText}15`,
                  background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`
                }}
              >
                <h2
                  className="text-2xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  View Member Profile
                </h2>
                {/* Status Badge */}
                <div className="mt-2">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: selectedMembership.status === 'active'
                        ? `${colors.semantic.success}20`
                        : selectedMembership.status === 'pending' || selectedMembership.status === 'draft'
                        ? `${colors.semantic.warning}20`
                        : `${colors.utility.secondaryText}20`,
                      color: selectedMembership.status === 'active'
                        ? colors.semantic.success
                        : selectedMembership.status === 'pending' || selectedMembership.status === 'draft'
                        ? colors.semantic.warning
                        : colors.utility.secondaryText
                    }}
                  >
                    Status: {selectedMembership.status?.charAt(0).toUpperCase() + selectedMembership.status?.slice(1)}
                  </span>
                </div>
              </div>

              {/* Profile Content */}
              <div className="p-6">
                {selectedTenantProfile && (
                  <ProfileCard profile={selectedTenantProfile} showTitle={false} />
                )}

                {/* Profile Details */}
                {selectedMembership.profile_data && (
                  <div className="mt-6 space-y-4">
                    {/* AI Enhanced Description */}
                    {selectedMembership.profile_data.ai_enhanced_description && (
                      <div
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          border: `1px solid ${colors.utility.primaryText}15`
                        }}
                      >
                        <h3
                          className="text-sm font-semibold mb-3"
                          style={{ color: colors.utility.primaryText }}
                        >
                          AI-Enhanced Description
                        </h3>
                        <p
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {selectedMembership.profile_data.ai_enhanced_description}
                        </p>
                      </div>
                    )}

                    {/* Original Description */}
                    {selectedMembership.profile_data.short_description &&
                     selectedMembership.profile_data.short_description !== selectedMembership.profile_data.ai_enhanced_description && (
                      <div
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          border: `1px solid ${colors.utility.primaryText}15`
                        }}
                      >
                        <h3
                          className="text-sm font-semibold mb-3"
                          style={{ color: colors.utility.primaryText }}
                        >
                          Original Description
                        </h3>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {selectedMembership.profile_data.short_description}
                        </p>
                      </div>
                    )}

                    {/* Keywords */}
                    {selectedMembership.profile_data.approved_keywords?.length > 0 && (
                      <div
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          border: `1px solid ${colors.utility.primaryText}15`
                        }}
                      >
                        <h3
                          className="text-sm font-semibold mb-3"
                          style={{ color: colors.utility.primaryText }}
                        >
                          Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedMembership.profile_data.approved_keywords.map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${colors.semantic.success}20`,
                                color: colors.semantic.success
                              }}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generation Method */}
                    <div className="pt-2">
                      <span
                        className="inline-flex items-center space-x-1 text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${colors.semantic.info}15`,
                          color: colors.semantic.info
                        }}
                      >
                        <FileText className="w-3 h-3" />
                        <span>
                          Generated via: {selectedMembership.profile_data.generation_method === 'website' ? 'Website Scraping' : 'Manual Entry + AI'}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="mt-6 pt-6 border-t" style={{ borderColor: `${colors.utility.primaryText}15` }}>
                  <h3
                    className="text-sm font-semibold mb-3"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Admin Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembership.status !== 'active' && (
                      <button
                        onClick={() => {
                          handleStatusChange(selectedMembership.id, 'active');
                          setViewModalOpen(false);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${colors.semantic.success}20`,
                          color: colors.semantic.success
                        }}
                      >
                        Activate Profile
                      </button>
                    )}
                    {selectedMembership.status !== 'suspended' && (
                      <button
                        onClick={() => {
                          handleStatusChange(selectedMembership.id, 'suspended');
                          setViewModalOpen(false);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${colors.semantic.warning}20`,
                          color: colors.semantic.warning
                        }}
                      >
                        Suspend Profile
                      </button>
                    )}
                    {selectedMembership.status !== 'inactive' && (
                      <button
                        onClick={() => {
                          handleStatusChange(selectedMembership.id, 'inactive');
                          setViewModalOpen(false);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${colors.semantic.error}20`,
                          color: colors.semantic.error
                        }}
                      >
                        Set Inactive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BBBAdminDashboard;

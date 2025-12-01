// src/components/VaNi/bbb/BBBMemberTable.tsx
// File 12/13 - BBB Member Table Component for Admin (API-connected version)

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  Eye,
  Edit3,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface MembershipData {
  id: string;
  tenant_id: string;
  status: 'draft' | 'pending' | 'active' | 'inactive' | 'suspended';
  joined_at: string;
  profile_data?: {
    ai_enhanced_description?: string;
    short_description?: string;
    approved_keywords?: string[];
    branch?: string;
    business_category?: string;
    mobile_number?: string;
  };
  tenant_profile?: {
    business_name: string;
    business_email?: string;
    city?: string;
    logo_url?: string;
  };
}

interface BBBMemberTableProps {
  memberships: MembershipData[];
  isLoading?: boolean;
  onView: (membershipId: string) => void;
  onEdit: (membershipId: string) => void;
  onDelete: (membershipId: string) => void;
  onStatusChange?: (membershipId: string, newStatus: string) => void;
}

const BBBMemberTable: React.FC<BBBMemberTableProps> = ({
  memberships,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtered data
  const filteredData = useMemo(() => {
    return memberships.filter(m => {
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesSearch = !searchQuery ||
        m.tenant_profile?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.profile_data?.business_category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tenant_profile?.city?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [memberships, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Status badge (4 statuses: draft, active, suspended, inactive)
  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { icon: any; color: string; label: string } } = {
      draft: {
        icon: FileText,
        color: colors.semantic.info,
        label: 'Draft'
      },
      active: {
        icon: CheckCircle,
        color: colors.semantic.success,
        label: 'Active'
      },
      suspended: {
        icon: AlertTriangle,
        color: colors.semantic.warning,
        label: 'Suspended'
      },
      inactive: {
        icon: XCircle,
        color: colors.semantic.error,
        label: 'Inactive'
      }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span
        className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color
        }}
      >
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  // Check if profile has description
  const hasProfile = (membership: MembershipData) => {
    return Boolean(membership.profile_data?.ai_enhanced_description || membership.profile_data?.short_description);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: colors.utility.secondaryText }}>Loading members...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: `${colors.utility.primaryText}20`
      }}
    >
      <CardHeader
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`,
          borderBottom: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        <CardTitle style={{ color: colors.utility.primaryText }}>
          BBB Members Directory
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {/* Filters and Search */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Status Filter</span>
                </div>
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </div>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Company name, category, or city..."
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Results count */}
          <div className="flex justify-between items-center">
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              Showing {paginatedData.length} of {filteredData.length} members
              {memberships.length !== filteredData.length && ` (${memberships.length} total)`}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderBottom: `2px solid ${colors.utility.primaryText}20`
                }}
              >
                <th
                  className="text-left p-3 text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Company Name
                </th>
                <th
                  className="text-left p-3 text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  City
                </th>
                <th
                  className="text-left p-3 text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Profile
                </th>
                <th
                  className="text-left p-3 text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Status
                </th>
                <th
                  className="text-center p-3 text-sm font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-8"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {memberships.length === 0
                      ? 'No members in this directory yet'
                      : 'No members found matching your filters'
                    }
                  </td>
                </tr>
              ) : (
                paginatedData.map((membership, index) => (
                  <tr
                    key={membership.id}
                    className="transition-colors hover:bg-opacity-50"
                    style={{
                      borderBottom: `1px solid ${colors.utility.primaryText}10`,
                      backgroundColor: index % 2 === 0 ? 'transparent' : `${colors.utility.secondaryBackground}50`
                    }}
                  >
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        {membership.tenant_profile?.logo_url ? (
                          <img
                            src={membership.tenant_profile.logo_url}
                            alt={membership.tenant_profile.business_name}
                            className="w-10 h-10 rounded-lg object-cover"
                            style={{
                              border: `1px solid ${colors.utility.primaryText}20`
                            }}
                            onError={(e) => {
                              // Fallback to initial if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${membership.tenant_profile?.logo_url ? 'hidden' : ''}`}
                          style={{
                            backgroundColor: `${colors.brand.primary}20`,
                            color: colors.brand.primary
                          }}
                        >
                          {membership.tenant_profile?.business_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p
                            className="font-semibold text-sm"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {membership.tenant_profile?.business_name || 'Unknown Business'}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {membership.tenant_profile?.business_email || membership.profile_data?.mobile_number || 'No contact'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <p
                        className="text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {membership.tenant_profile?.city || 'N/A'}
                      </p>
                    </td>
                    <td className="p-3">
                      {hasProfile(membership) ? (
                        <span
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `${colors.semantic.success}15`,
                            color: colors.semantic.success
                          }}
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Complete</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `${colors.semantic.warning}15`,
                            color: colors.semantic.warning
                          }}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Incomplete</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {onStatusChange ? (
                        <select
                          value={membership.status}
                          onChange={(e) => onStatusChange(membership.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 cursor-pointer"
                          style={{
                            backgroundColor: membership.status === 'active' ? `${colors.semantic.success}15` :
                              membership.status === 'suspended' ? `${colors.semantic.warning}15` :
                              membership.status === 'inactive' ? `${colors.semantic.error}15` :
                              `${colors.semantic.info}15`,
                            color: membership.status === 'active' ? colors.semantic.success :
                              membership.status === 'suspended' ? colors.semantic.warning :
                              membership.status === 'inactive' ? colors.semantic.error :
                              colors.semantic.info,
                            borderColor: membership.status === 'active' ? colors.semantic.success :
                              membership.status === 'suspended' ? colors.semantic.warning :
                              membership.status === 'inactive' ? colors.semantic.error :
                              colors.semantic.info,
                          }}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        getStatusBadge(membership.status)
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onView(membership.id)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{
                            backgroundColor: `${colors.semantic.info}20`,
                            color: colors.semantic.info
                          }}
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(membership.id)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{
                            backgroundColor: `${colors.brand.primary}20`,
                            color: colors.brand.primary
                          }}
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(membership.id)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{
                            backgroundColor: `${colors.semantic.error}20`,
                            color: colors.semantic.error
                          }}
                          title="Delete (Set Inactive)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: currentPage === pageNum
                        ? colors.brand.primary
                        : colors.utility.secondaryBackground,
                      color: currentPage === pageNum
                        ? '#FFFFFF'
                        : colors.utility.primaryText,
                      border: `1px solid ${currentPage === pageNum
                        ? colors.brand.primary
                        : `${colors.utility.primaryText}20`}`
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BBBMemberTable;

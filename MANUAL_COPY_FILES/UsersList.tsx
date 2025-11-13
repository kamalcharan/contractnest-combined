// src/components/users/UsersList.tsx
import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Mail,
  Phone,
  ChevronDown,
  Users,
  UserPlus,
  Building,
  User,
  Check,
  Eye,
  UserX,
  RefreshCw,
  Key
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmationDialog from '../ui/ConfirmationDialog';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_code: string;
  mobile_number?: string;
  status: 'active' | 'inactive' | 'suspended' | 'invited';
  role?: string;
  last_login?: string;
  created_at: string;
  invitation?: {
    id: string;
    sent_at: string;
    expires_at: string;
  };
  // Additional fields for organization check
  is_organization?: boolean;
  company_name?: string;
  contact_type?: string;
}

interface UsersListProps {
  users: User[];
  onViewUser?: (user: User) => void;
  onEditUser?: (user: User) => void;
  onSuspendUser?: (user: User) => void;
  onResendInvitation?: (userId: string) => void;
  onInviteUser?: () => void;
  isLoading?: boolean;
  className?: string;
}

const UsersList: React.FC<UsersListProps> = ({
  users,
  onViewUser,
  onEditUser,
  onSuspendUser,
  onResendInvitation,
  onInviteUser,
  isLoading = false,
  className
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);

  // Get unique roles and statuses for filters
  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map(user => user.role).filter(Boolean));
    return Array.from(roles);
  }, [users]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(users.map(user => user.status));
    return Array.from(statuses);
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const matches = 
          fullName.includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.user_code.toLowerCase().includes(search) ||
          (user.mobile_number && user.mobile_number.includes(search));
        
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Handle suspend user
  const handleSuspendClick = (user: User) => {
    setUserToSuspend(user);
    setSuspendDialogOpen(true);
  };

  const handleSuspendConfirm = () => {
    if (userToSuspend && onSuspendUser) {
      onSuspendUser(userToSuspend);
    }
    setSuspendDialogOpen(false);
    setUserToSuspend(null);
  };

  const handleSuspendCancel = () => {
    setSuspendDialogOpen(false);
    setUserToSuspend(null);
  };

  // Get member card component
  const MemberCard = ({ user }: { user: User }) => {
    const isOrganization = user.is_organization || user.contact_type === 'Vendor' || user.contact_type === 'Partner';
    const displayName = `${user.first_name} ${user.last_name}`.trim() || user.company_name || user.email;
    const initials = user.first_name && user.last_name 
      ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
      : displayName.substring(0, 2).toUpperCase();

    // Get status badge
    const getStatusBadge = () => {
      if (user.status === 'invited') {
        return (
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: colors.semantic.warning + '10',
              color: colors.semantic.warning
            }}
          >
            Pending
          </span>
        );
      }
      return null;
    };

    // Get type badge
    const getTypeBadge = () => {
      if (user.role) {
        const roleColorMap = {
          'admin': colors.brand.tertiary,
          'owner': colors.brand.secondary,
          'default': colors.brand.primary
        };
        const roleColor = roleColorMap[user.role.toLowerCase() as keyof typeof roleColorMap] || roleColorMap.default;
        
        return (
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: roleColor + '10',
              color: roleColor
            }}
          >
            {user.role}
          </span>
        );
      }
      
      if (user.contact_type) {
        return (
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryText + '10',
              color: colors.utility.secondaryText
            }}
          >
            {user.contact_type}
          </span>
        );
      }
      
      return null;
    };

    return (
      <div 
        className="border-2 rounded-lg p-4 hover:shadow-sm transition-all duration-200"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.brand.primary + '20'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-medium transition-colors"
              style={{
                backgroundColor: isOrganization ? colors.utility.secondaryText : colors.brand.primary
              }}
            >
              {isOrganization ? (
                <Building size={20} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {displayName}
                </h4>
                <span 
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  #{user.user_code}
                </span>
                {getTypeBadge()}
                {getStatusBadge()}
              </div>
              
              <div 
                className="flex items-center gap-4 text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {user.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    {user.email}
                  </span>
                )}
                {user.mobile_number && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    {user.mobile_number}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User size={14} />
                  Team
                </span>
                {user.status === 'active' && (
                  <Check size={16} style={{ color: colors.semantic.success }} />
                )}
              </div>
              
              {/* Additional info for invited users */}
              {user.status === 'invited' && user.invitation && (
                <div 
                  className="mt-1 text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Invited {formatDistanceToNow(new Date(user.invitation.sent_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions - Icon Buttons */}
          <div className="flex items-center gap-2">
            {onViewUser && (
              <button
                onClick={() => onViewUser(user)}
                title="View Details"
                className="p-2 rounded-md transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.utility.secondaryText + '10',
                  color: colors.utility.primaryText
                }}
              >
                <Eye size={16} />
              </button>
            )}

            {onResendInvitation && user.status === 'invited' && (
              <button
                onClick={() => onResendInvitation(user.id)}
                title="Resend Invitation"
                className="p-2 rounded-md transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.utility.secondaryText + '10',
                  color: colors.utility.primaryText
                }}
              >
                <RefreshCw size={16} />
              </button>
            )}

            {onSuspendUser && user.status === 'active' && (
              <button
                onClick={() => handleSuspendClick(user)}
                title="Suspend User"
                className="p-2 rounded-md transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.semantic.error + '10',
                  color: colors.semantic.error
                }}
              >
                <UserX size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="border rounded-lg p-4 animate-pulse transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.secondaryText + '20'
            }}
          >
            <div className="flex items-center space-x-4">
              <div 
                className="h-12 w-12 rounded-full"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div className="flex-1 space-y-2">
                <div 
                  className="h-4 rounded w-1/3"
                  style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                ></div>
                <div 
                  className="h-3 rounded w-1/4"
                  style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with search and actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2" 
              size={18}
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-3 py-2 border rounded-md transition-colors flex items-center gap-2 hover:opacity-80"
            )}
            style={{
              borderColor: colors.utility.secondaryText + '40',
              backgroundColor: showFilters ? colors.utility.secondaryText + '10' : colors.utility.secondaryBackground,
              color: colors.utility.primaryText
            }}
          >
            <Filter size={16} />
            Filters
            <ChevronDown size={16} className={cn(
              "transition-transform",
              showFilters && "rotate-180"
            )} />
          </button>

          {onInviteUser && (
            <button
              onClick={onInviteUser}
              className="px-3 py-2 text-white rounded-md transition-colors flex items-center gap-2 hover:opacity-90"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              <UserPlus size={16} />
              Invite Team Member
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div 
          className="border rounded-md p-4 transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryText + '05',
            borderColor: colors.utility.secondaryText + '20'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md transition-colors"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md transition-colors"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div 
        className="flex items-center justify-between text-sm transition-colors"
        style={{ color: colors.utility.secondaryText }}
      >
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>
            Showing {filteredUsers.length} of {users.length} team members
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>{users.filter(u => u.status === 'active').length} Active</span>
          <span>{users.filter(u => u.status === 'invited').length} Invited</span>
        </div>
      </div>

      {/* Team Members List */}
      {filteredUsers.length === 0 ? (
        <div
          className="text-center py-12 border rounded-lg transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20'
          }}
        >
          <Users
            size={48}
            className="mx-auto mb-4"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3
            className="text-lg font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            No team members found
          </h3>
          <p
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by inviting team members to your workspace'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <MemberCard key={user.id} user={user} />
          ))}
        </div>
      )}

      {/* Suspend Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={suspendDialogOpen}
        onClose={handleSuspendCancel}
        onConfirm={handleSuspendConfirm}
        title="Suspend User"
        description={
          userToSuspend
            ? `Are you sure you want to suspend ${userToSuspend.first_name} ${userToSuspend.last_name}? They will no longer be able to access the workspace.`
            : ''
        }
        confirmText="Suspend"
        cancelText="Cancel"
        type="danger"
        icon={<UserX className="h-6 w-6" />}
      />
    </div>
  );
};

export default UsersList;
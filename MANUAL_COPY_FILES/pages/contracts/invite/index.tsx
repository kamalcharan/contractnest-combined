// src/pages/contracts/invite/index.tsx
// Invite Sellers Page - Uses existing invitation components
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Users,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

// Reusing existing invitation components
import InviteUserModal from '@/components/users/InviteUserModal';
import InvitationsList from '@/components/users/InvitationsList';
import { Invitation, CreateInvitationData } from '@/hooks/useInvitations';
import StatsCard from '@/components/dashboard/StatsCard';

const InviteSellersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock invitations data - in real app, this would come from useInvitations hook
  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: '1',
      email: 'supplier1@example.com',
      mobile_number: null,
      invitation_method: 'email',
      status: 'sent',
      role: 'seller',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      invitation_link: 'https://app.contractnest.com/invite/abc123',
      resent_count: 0,
      is_expired: false,
      time_remaining: '5 days remaining',
      invited_by_user: { first_name: 'John', last_name: 'Doe' }
    },
    {
      id: '2',
      email: 'vendor@techsolutions.com',
      mobile_number: null,
      invitation_method: 'email',
      status: 'accepted',
      role: 'seller',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      invitation_link: null,
      resent_count: 1,
      is_expired: false,
      accepted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_user: { first_name: 'Sarah', last_name: 'Wilson' },
      invited_by_user: { first_name: 'John', last_name: 'Doe' }
    },
    {
      id: '3',
      email: null,
      mobile_number: '+91 98765 43210',
      invitation_method: 'sms',
      status: 'pending',
      role: 'seller',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      invitation_link: 'https://app.contractnest.com/invite/def456',
      resent_count: 0,
      is_expired: false,
      time_remaining: '6 days remaining',
      invited_by_user: { first_name: 'Admin', last_name: 'User' }
    },
    {
      id: '4',
      email: 'expired@vendor.com',
      mobile_number: null,
      invitation_method: 'email',
      status: 'expired',
      role: 'seller',
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitation_link: null,
      resent_count: 2,
      is_expired: true,
      invited_by_user: { first_name: 'John', last_name: 'Doe' }
    }
  ] as Invitation[]);

  // Available roles for sellers
  const sellerRoles = [
    { id: 'seller', name: 'Seller', description: 'Can receive and respond to contract offers' },
    { id: 'vendor', name: 'Vendor', description: 'Full vendor access with contract management' },
    { id: 'supplier', name: 'Supplier', description: 'Supplier access for supply chain contracts' }
  ];

  // Stats calculation
  const stats = {
    total: invitations.length,
    pending: invitations.filter(i => ['pending', 'sent', 'resent'].includes(i.status)).length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    expired: invitations.filter(i => i.status === 'expired' || i.status === 'cancelled').length
  };

  // Filter invitations
  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch = searchQuery === '' ||
      inv.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.mobile_number?.includes(searchQuery);

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'pending' && ['pending', 'sent', 'resent'].includes(inv.status)) ||
      (filterStatus === 'accepted' && inv.status === 'accepted') ||
      (filterStatus === 'expired' && (inv.status === 'expired' || inv.status === 'cancelled'));

    return matchesSearch && matchesFilter;
  });

  // Handle invite submission
  const handleInviteSubmit = async (data: CreateInvitationData) => {
    setIsSubmitting(true);
    try {
      // Mock API call - in real app, use the useInvitations hook
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add new invitation to list
      const newInvitation: Invitation = {
        id: Date.now().toString(),
        email: data.email || null,
        mobile_number: data.mobile_number || null,
        invitation_method: data.invitation_method,
        status: 'sent',
        role: data.role,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invitation_link: `https://app.contractnest.com/invite/${Date.now()}`,
        resent_count: 0,
        is_expired: false,
        time_remaining: '7 days remaining',
        invited_by_user: { first_name: 'Current', last_name: 'User' }
      };

      setInvitations(prev => [newInvitation, ...prev]);
      toast.success('Invitation sent successfully!');
      setIsInviteModalOpen(false);
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resend
  const handleResend = async (invitationId: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setInvitations(prev => prev.map(inv =>
        inv.id === invitationId
          ? { ...inv, status: 'resent' as const, resent_count: inv.resent_count + 1 }
          : inv
      ));
      toast.success('Invitation resent!');
      return true;
    } catch {
      toast.error('Failed to resend invitation');
      return false;
    }
  };

  // Handle cancel
  const handleCancel = async (invitationId: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setInvitations(prev => prev.map(inv =>
        inv.id === invitationId
          ? { ...inv, status: 'cancelled' as const }
          : inv
      ));
      toast.success('Invitation cancelled');
      return true;
    } catch {
      toast.error('Failed to cancel invitation');
      return false;
    }
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: `${colors.utility.primaryText}10` }}
          >
            <ArrowLeft size={20} style={{ color: colors.utility.primaryText }} />
          </button>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              Invite Sellers
            </h1>
            <p
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              Invite vendors, suppliers, and sellers to your contract network
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:opacity-90"
          style={{
            backgroundColor: colors.brand.primary,
            color: '#fff'
          }}
        >
          <UserPlus size={20} />
          Invite Seller
        </button>
      </div>

      {/* Stats Cards - Reusing existing StatsCard component */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Invitations"
          value={stats.total}
          trend="up"
          change={15}
          icon={Users}
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          trend="neutral"
          change={0}
          icon={Clock}
        />
        <StatsCard
          title="Accepted"
          value={stats.accepted}
          trend="up"
          change={25}
          icon={CheckCircle}
        />
        <StatsCard
          title="Expired/Cancelled"
          value={stats.expired}
          trend="down"
          change={10}
          icon={XCircle}
        />
      </div>

      {/* Filters */}
      <div
        className="rounded-lg border p-4 mb-6"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[250px]"
            style={{ backgroundColor: `${colors.utility.primaryText}10` }}
          >
            <Search size={18} style={{ color: colors.utility.secondaryText }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or phone..."
              className="bg-transparent border-none outline-none flex-1 text-sm"
              style={{ color: colors.utility.primaryText }}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} style={{ color: colors.utility.secondaryText }} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: `${colors.utility.primaryText}20`,
                color: colors.utility.primaryText
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="expired">Expired/Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invitations List - Reusing existing component */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.utility.primaryText }}
          >
            Seller Invitations
          </h2>
          <span
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            {filteredInvitations.length} invitation{filteredInvitations.length !== 1 ? 's' : ''}
          </span>
        </div>

        <InvitationsList
          invitations={filteredInvitations}
          onResend={handleResend}
          onCancel={handleCancel}
          onViewDetails={(invitation) => {
            console.log('View details:', invitation);
          }}
          isLoading={false}
        />
      </div>

      {/* Invite Modal - Reusing existing component */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteSubmit}
        isSubmitting={isSubmitting}
        availableRoles={sellerRoles}
      />
    </div>
  );
};

export default InviteSellersPage;

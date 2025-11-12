// src/components/users/InvitationsList.tsx
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Copy,
  AlertCircle,
  User
} from 'lucide-react';
import { Invitation } from '@/hooks/useInvitations';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

interface InvitationsListProps {
  invitations: Invitation[];
  onResend: (invitationId: string) => Promise<boolean>;
  onCancel: (invitationId: string) => Promise<boolean>;
  onViewDetails?: (invitation: Invitation) => void;
  isLoading?: boolean;
}

const InvitationsList: React.FC<InvitationsListProps> = ({
  invitations,
  onResend,
  onCancel,
  onViewDetails,
  isLoading = false
}) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get status badge
  const getStatusBadge = (invitation: Invitation) => {
    const statusConfig = {
      pending: { icon: Clock, backgroundColor: `${colors.semantic.warning}20`, color: colors.semantic.warning, label: 'Pending' },
      sent: { icon: Mail, backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary, label: 'Sent' },
      resent: { icon: RefreshCw, backgroundColor: `${colors.brand.tertiary}20`, color: colors.brand.tertiary, label: 'Resent' },
      accepted: { icon: CheckCircle, backgroundColor: `${colors.semantic.success}20`, color: colors.semantic.success, label: 'Accepted' },
      expired: { icon: XCircle, backgroundColor: `${colors.semantic.error}20`, color: colors.semantic.error, label: 'Expired' },
      cancelled: { icon: XCircle, backgroundColor: `${colors.utility.secondaryText}20`, color: colors.utility.secondaryText, label: 'Cancelled' }
    };

    const config = statusConfig[invitation.status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: config.backgroundColor,
          color: config.color
        }}
      >
        <Icon size={14} className="mr-1" />
        {config.label}
      </span>
    );
  };

  // Get method icon
  const getMethodIcon = (method: string) => {
    const icons = {
      email: Mail,
      sms: Phone,
      whatsapp: MessageSquare
    };
    return icons[method as keyof typeof icons] || Mail;
  };

  // Copy invitation link
  const copyInvitationLink = (invitation: Invitation) => {
    if (invitation.invitation_link) {
      navigator.clipboard.writeText(invitation.invitation_link);
      toast.success('Invitation link copied!', {
        duration: 2000,
        style: {
          background: colors.semantic.success,
          color: '#FFF'
        }
      });
    }
  };

  // Handle resend
  const handleResend = async (invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    try {
      await onResend(invitationId);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  // Handle cancel - open confirmation dialog
  const handleCancelClick = (invitationId: string) => {
    setInvitationToCancel(invitationId);
    setCancelDialogOpen(true);
  };

  // Confirm cancel
  const confirmCancel = async () => {
    if (!invitationToCancel) return;

    setProcessingIds(prev => new Set(prev).add(invitationToCancel));
    try {
      await onCancel(invitationToCancel);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationToCancel);
        return newSet;
      });
      setCancelDialogOpen(false);
      setInvitationToCancel(null);
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  if (invitations.length === 0) {
    return (
      <div
        className="text-center py-12 border rounded-lg transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <User
          size={48}
          className="mx-auto mb-4"
          style={{ color: colors.utility.secondaryText }}
        />
        <h3
          className="text-lg font-medium mb-2 transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          No invitations found
        </h3>
        <p
          className="transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          Start inviting users to join your workspace
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const MethodIcon = getMethodIcon(invitation.invitation_method);
        const isProcessing = processingIds.has(invitation.id);
        const canResend = ['pending', 'sent', 'resent'].includes(invitation.status);
        const canCancel = ['pending', 'sent', 'resent'].includes(invitation.status);

        return (
          <div
            key={invitation.id}
            className={cn(
              "border-2 rounded-lg p-4 transition-all duration-200",
              isProcessing && "opacity-60"
            )}
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.brand.primary}40`
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start space-x-3">
                  <div
                    className="p-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: invitation.status === 'accepted'
                        ? `${colors.semantic.success}20`
                        : `${colors.utility.primaryText}20`
                    }}
                  >
                    <MethodIcon
                      size={20}
                      style={{
                        color: invitation.status === 'accepted'
                          ? colors.semantic.success
                          : colors.utility.secondaryText
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4
                        className="font-medium transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {invitation.email || invitation.mobile_number || 'Unknown'}
                      </h4>
                      {getStatusBadge(invitation)}
                    </div>

                    <div className="mt-1 space-y-1">
                      <p
                        className="text-sm transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Invited by {invitation.invited_by_user?.first_name} {invitation.invited_by_user?.last_name}
                        {' • '}
                        {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                      </p>

                      {invitation.resent_count > 0 && (
                        <p
                          className="text-sm transition-colors"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Resent {invitation.resent_count} time{invitation.resent_count > 1 ? 's' : ''}
                          {invitation.last_resent_at && (
                            <> • Last resent {formatDistanceToNow(new Date(invitation.last_resent_at), { addSuffix: true })}</>
                          )}
                        </p>
                      )}

                      {invitation.accepted_at && invitation.accepted_user && (
                        <p
                          className="text-sm transition-colors"
                          style={{ color: colors.semantic.success }}
                        >
                          Accepted by {invitation.accepted_user.first_name} {invitation.accepted_user.last_name}
                          {' • '}
                          {formatDistanceToNow(new Date(invitation.accepted_at), { addSuffix: true })}
                        </p>
                      )}

                      {invitation.is_expired && (
                        <div
                          className="flex items-center text-sm transition-colors"
                          style={{ color: colors.semantic.error }}
                        >
                          <AlertCircle size={14} className="mr-1" />
                          Invitation expired
                        </div>
                      )}

                      {invitation.time_remaining && !invitation.is_expired && canResend && (
                        <p
                          className="text-sm transition-colors"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {invitation.time_remaining}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions - Icon Buttons */}
              <div className="flex items-center gap-2">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(invitation)}
                    disabled={isProcessing}
                    className="p-2 rounded-md transition-colors hover:opacity-80"
                    title="View Details"
                    style={{ color: colors.brand.primary }}
                  >
                    <Eye size={16} />
                  </button>
                )}

                {invitation.invitation_link && (
                  <button
                    onClick={() => copyInvitationLink(invitation)}
                    disabled={isProcessing}
                    className="p-2 rounded-md transition-colors hover:opacity-80"
                    title="Copy Link"
                    style={{ color: colors.brand.primary }}
                  >
                    <Copy size={16} />
                  </button>
                )}

                {canResend && (
                  <button
                    onClick={() => handleResend(invitation.id)}
                    disabled={isProcessing}
                    className="p-2 rounded-md transition-colors hover:opacity-80"
                    title="Resend Invitation"
                    style={{ color: colors.brand.tertiary || colors.brand.primary }}
                  >
                    {isProcessing ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => handleCancelClick(invitation.id)}
                    disabled={isProcessing}
                    className="p-2 rounded-md transition-colors hover:opacity-80"
                    title="Cancel Invitation"
                    style={{ color: colors.semantic.error }}
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setInvitationToCancel(null);
        }}
        onConfirm={confirmCancel}
        title="Cancel Invitation"
        description="Are you sure you want to cancel this invitation? This action cannot be undone."
        confirmText="Yes, Cancel Invitation"
        cancelText="No, Keep It"
        type="danger"
        isLoading={invitationToCancel ? processingIds.has(invitationToCancel) : false}
      />
    </div>
  );
};

export default InvitationsList;

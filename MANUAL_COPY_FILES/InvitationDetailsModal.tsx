// src/components/users/InvitationDetailsModal.tsx
import React from 'react';
import {
  X,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Invitation } from '@/hooks/useInvitations';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

interface InvitationDetailsModalProps {
  invitation: Invitation | null;
  isOpen: boolean;
  onClose: () => void;
}

const InvitationDetailsModal: React.FC<InvitationDetailsModalProps> = ({
  invitation,
  isOpen,
  onClose
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  if (!isOpen || !invitation) return null;

  const copyInvitationLink = () => {
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

  const getMethodIcon = () => {
    const icons = {
      email: Mail,
      sms: Phone,
      whatsapp: MessageSquare
    };
    const Icon = icons[invitation.invitation_method as keyof typeof icons] || Mail;
    return <Icon size={20} style={{ color: colors.brand.primary }} />;
  };

  const getStatusInfo = () => {
    const statusConfig = {
      pending: { icon: Clock, color: colors.semantic.warning, label: 'Pending' },
      sent: { icon: Mail, color: colors.brand.primary, label: 'Sent' },
      resent: { icon: Mail, color: colors.brand.tertiary, label: 'Resent' },
      accepted: { icon: CheckCircle, color: colors.semantic.success, label: 'Accepted' },
      expired: { icon: XCircle, color: colors.semantic.error, label: 'Expired' },
      cancelled: { icon: XCircle, color: colors.utility.secondaryText, label: 'Cancelled' }
    };
    return statusConfig[invitation.status] || statusConfig.pending;
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl rounded-lg shadow-xl transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 border-b transition-colors"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: statusInfo.color + '20' }}
              >
                {getMethodIcon()}
              </div>
              <div>
                <h2
                  className="text-xl font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Invitation Details
                </h2>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {invitation.email || invitation.mobile_number}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-md hover:opacity-80 transition-colors"
              style={{ backgroundColor: colors.utility.primaryBackground }}
            >
              <X size={20} style={{ color: colors.utility.primaryText }} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status */}
            <div>
              <label
                className="text-sm font-medium block mb-2 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Status
              </label>
              <div className="flex items-center gap-2">
                <StatusIcon size={20} style={{ color: statusInfo.color }} />
                <span
                  className="font-medium transition-colors"
                  style={{ color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
                {invitation.is_expired && (
                  <span
                    className="text-sm flex items-center gap-1 ml-2"
                    style={{ color: colors.semantic.error }}
                  >
                    <AlertCircle size={14} />
                    Expired
                  </span>
                )}
              </div>
            </div>

            {/* Invitation Method */}
            <div>
              <label
                className="text-sm font-medium block mb-2 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Invitation Method
              </label>
              <p
                className="capitalize transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                {invitation.invitation_method}
              </p>
            </div>

            {/* Recipient */}
            <div>
              <label
                className="text-sm font-medium block mb-2 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Recipient
              </label>
              <p
                className="transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                {invitation.email || invitation.mobile_number}
              </p>
            </div>

            {/* Invited By */}
            <div>
              <label
                className="text-sm font-medium block mb-2 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Invited By
              </label>
              <div className="flex items-center gap-2">
                <User size={16} style={{ color: colors.brand.primary }} />
                <span
                  className="transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {invitation.invited_by_user?.first_name} {invitation.invited_by_user?.last_name}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="text-sm font-medium block mb-2 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Sent At
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: colors.brand.primary }} />
                  <span
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {format(new Date(invitation.created_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <p
                  className="text-xs mt-1 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </p>
              </div>

              {invitation.expires_at && (
                <div>
                  <label
                    className="text-sm font-medium block mb-2 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Expires At
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock size={16} style={{ color: colors.semantic.warning }} />
                    <span
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {format(new Date(invitation.expires_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  {invitation.time_remaining && !invitation.is_expired && (
                    <p
                      className="text-xs mt-1 transition-colors"
                      style={{ color: colors.semantic.warning }}
                    >
                      {invitation.time_remaining}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Resend Info */}
            {invitation.resent_count > 0 && (
              <div>
                <label
                  className="text-sm font-medium block mb-2 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Resend History
                </label>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Resent {invitation.resent_count} time{invitation.resent_count > 1 ? 's' : ''}
                </p>
                {invitation.last_resent_at && (
                  <p
                    className="text-xs mt-1 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Last resent {formatDistanceToNow(new Date(invitation.last_resent_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}

            {/* Accepted Info */}
            {invitation.accepted_at && invitation.accepted_user && (
              <div>
                <label
                  className="text-sm font-medium block mb-2 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Accepted
                </label>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={16} style={{ color: colors.semantic.success }} />
                  <span
                    className="text-sm transition-colors"
                    style={{ color: colors.semantic.success }}
                  >
                    Accepted by {invitation.accepted_user.first_name} {invitation.accepted_user.last_name}
                  </span>
                </div>
                <p
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {formatDistanceToNow(new Date(invitation.accepted_at), { addSuffix: true })}
                </p>
              </div>
            )}

            {/* Invitation Link */}
            {invitation.invitation_link && (
              <div>
                <label
                  className="text-sm font-medium block mb-2 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Invitation Link
                </label>
                <div
                  className="flex items-center gap-2 p-3 rounded-md border transition-colors"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <LinkIcon size={16} style={{ color: colors.brand.primary }} />
                  <input
                    type="text"
                    value={invitation.invitation_link}
                    readOnly
                    className="flex-1 bg-transparent outline-none text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  />
                  <button
                    onClick={copyInvitationLink}
                    className="p-2 rounded-md hover:opacity-80 transition-colors"
                    style={{ backgroundColor: colors.brand.primary + '20' }}
                    title="Copy Link"
                  >
                    <Copy size={16} style={{ color: colors.brand.primary }} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex justify-end p-6 border-t transition-colors"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#FFF'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvitationDetailsModal;

// src/components/contacts/view/cards/ContactHeaderCard.tsx - Full Production Version
import React from 'react';
import { Building2, User, Edit, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  CONTACT_STATUS_LABELS,
  getStatusColor,
  getClassificationConfig,
  formatContactDisplayName,
  canPerformOperation
} from '@/utils/constants/contacts';

interface ContactHeaderCardProps {
  contact: {
    id: string;
    type: 'individual' | 'corporate';
    status: 'active' | 'inactive' | 'archived';
    name?: string;
    salutation?: string;
    company_name?: string;
    registration_number?: string;
    classifications: Array<{
      id: string;
      classification_value: string;
      classification_label: string;
    }>;
    user_account_status?: string;
    potential_duplicate?: boolean;
    duplicate_reasons?: string[];
    created_at: string;
    updated_at: string;
  };
  onEdit?: () => void;
  className?: string;
}

const ContactHeaderCard: React.FC<ContactHeaderCardProps> = ({ 
  contact, 
  onEdit, 
  className = '' 
}) => {
  const navigate = useNavigate();

  // Generate avatar initials
  const getAvatarInitials = (): string => {
    if (contact.type === 'corporate') {
      return contact.company_name?.substring(0, 2).toUpperCase() || 'UC';
    } else {
      return contact.name?.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  // Get display name using utility function
  const displayName = formatContactDisplayName(contact);

  // Handle edit action
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      navigate(`/contacts/${contact.id}/edit`);
    }
  };

  // Check if edit is allowed
  const canEdit = canPerformOperation(contact.status, 'edit');

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border p-4 ${className}`}>
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Contact Information</h3>
        {canEdit && (
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Edit contact"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex items-start gap-3">
        {/* Enhanced Avatar */}
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/30 text-primary flex items-center justify-center font-semibold text-lg border-2 border-primary/20 shadow-sm flex-shrink-0">
          {getAvatarInitials()}
        </div>
        
        {/* Contact Details */}
        <div className="flex-1 min-w-0">
          {/* Name and Type */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-foreground truncate">{displayName}</h4>
            {contact.type === 'corporate' ? (
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          
          {/* Registration Number for Corporate */}
          {contact.type === 'corporate' && contact.registration_number && (
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">
                Reg: {contact.registration_number}
              </span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="mb-3">
            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
              <div className={`w-2 h-2 rounded-full ${
                contact.status === 'active' ? 'bg-green-600' :
                contact.status === 'inactive' ? 'bg-yellow-600' : 'bg-gray-600'
              }`} />
              {CONTACT_STATUS_LABELS[contact.status as keyof typeof CONTACT_STATUS_LABELS]}
            </span>
          </div>
          
          {/* Classification Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {contact.classifications.map((classification, index) => {
              // Handle both string and object formats
              const classValue = typeof classification === 'string'
                ? classification
                : classification.classification_value;
              const classLabel = typeof classification === 'string'
                ? classification
                : classification.classification_label;
              const config = getClassificationConfig(classValue);
              return (
                <span
                  key={typeof classification === 'string' ? `class-${index}` : (classification.id || `class-${index}`)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                    config?.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                    config?.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                    config?.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
                    config?.color === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                    'bg-secondary text-secondary-foreground border-secondary'
                  }`}
                >
                  {config?.icon && <span>{config.icon}</span>}
                  {classLabel}
                </span>
              );
            })}
          </div>

          {/* User Account Status */}
          {contact.user_account_status && (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                {contact.user_account_status === 'has_account' ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-700 dark:text-green-400">Has User Account</span>
                  </>
                ) : contact.user_account_status === 'invitation_sent' ? (
                  <>
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs text-yellow-700 dark:text-yellow-400">Invitation Sent</span>
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">No User Account</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Duplicate Warning */}
          {contact.potential_duplicate && (
            <div className="mb-3">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-xs text-yellow-700 dark:text-yellow-300">
                  Potential duplicate contact
                </span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Created:</span> {new Date(contact.created_at).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Updated:</span> {new Date(contact.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Contact ID at bottom */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Contact ID:</span> 
          <code className="ml-1 px-1 py-0.5 rounded bg-muted font-mono text-xs">
            {contact.id}
          </code>
        </div>
      </div>
    </div>
  );
};

export default ContactHeaderCard;
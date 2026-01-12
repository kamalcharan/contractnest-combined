// src/components/contacts/forms/ContactPersonsSection.tsx - Glass Morphism Theme
import React, { useState } from 'react';
import { Plus, Users, Trash2, User, Edit2, Building2, Star, Mail, Phone, X, CheckCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';
import ContactChannelsSection from './ContactChannelsSection';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import {
  SALUTATIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PLACEHOLDER_TEXTS,
  VALIDATION_RULES
} from '../../../utils/constants/contacts';

type SalutationType = typeof SALUTATIONS[number]['value'];

interface ContactChannel {
  id?: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

interface ContactPerson {
  id?: string;
  salutation?: SalutationType;
  name: string;
  designation?: string;
  department?: string;
  is_primary: boolean;
  contact_channels: ContactChannel[];
  notes?: string;
}

interface ContactPersonsSectionProps {
  value: ContactPerson[];
  onChange: (contactPersons: ContactPerson[]) => void;
  disabled?: boolean;
  contactType?: 'individual' | 'corporate';
}

const ContactPersonsSection: React.FC<ContactPersonsSectionProps> = ({
  value,
  onChange,
  disabled = false,
  contactType = 'corporate'
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<ContactPerson | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Track analytics
  React.useEffect(() => {
    if (value.length > 0 && contactType === 'corporate') {
      analyticsService.trackPageView(
        'contacts/contact-persons',
        `Contact Persons: ${value.length}`
      );
    }
  }, [value.length, contactType]);

  // Don't render if individual contact
  if (contactType === 'individual') {
    return null;
  }

  // Glass morphism styles
  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.8)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(255,255,255,0.5)',
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(0,0,0,0.02)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)',
  };

  // Add new contact person
  const addContactPerson = (newPerson: Omit<ContactPerson, 'id'>) => {
    if (disabled) return;

    try {
      const personWithId: ContactPerson = {
        ...newPerson,
        id: `temp_${Date.now()}`,
        is_primary: value.length === 0 ? true : newPerson.is_primary
      };

      let updatedPersons = [...value];
      if (personWithId.is_primary) {
        updatedPersons = updatedPersons.map(person => ({ ...person, is_primary: false }));
      }

      onChange([...updatedPersons, personWithId]);
      setIsAddModalOpen(false);
      // Note: Toast removed - will show on actual save

      analyticsService.trackEvent('contact_person_added', {
        contact_type: contactType,
        has_channels: newPerson.contact_channels.length > 0
      });
    } catch (error) {
      captureException(error, {
        tags: { component: 'ContactPersonsSection', action: 'addContactPerson' }
      });
    }
  };

  // Remove contact person
  const removeContactPerson = (index: number) => {
    if (disabled) return;

    try {
      const removedPerson = value[index];
      const newPersons = value.filter((_, i) => i !== index);

      if (removedPerson.is_primary && newPersons.length > 0) {
        newPersons[0] = { ...newPersons[0], is_primary: true };
      }

      onChange(newPersons);
      setShowDeleteDialog(false);
      setDeleteIndex(null);
      // Note: Toast removed - will show on actual save

      analyticsService.trackEvent('contact_person_removed', {
        was_primary: removedPerson.is_primary
      });
    } catch (error) {
      captureException(error, {
        tags: { component: 'ContactPersonsSection', action: 'removeContactPerson' }
      });
    }
  };

  // Update contact person
  const updateContactPerson = (index: number, updates: Partial<ContactPerson>) => {
    if (disabled) return;

    try {
      const newPersons = [...value];

      if (updates.is_primary) {
        newPersons.forEach((person, i) => {
          if (i !== index) {
            newPersons[i] = { ...person, is_primary: false };
          }
        });
      }

      newPersons[index] = { ...newPersons[index], ...updates };
      onChange(newPersons);
      setEditingPerson(null);
      setEditingIndex(null);
      // Note: Toast removed - will show on actual save
    } catch (error) {
      captureException(error, {
        tags: { component: 'ContactPersonsSection', action: 'updateContactPerson' }
      });
    }
  };

  // Get person display name
  const getPersonDisplayName = (person: ContactPerson): string => {
    const salutation = person.salutation ?
      SALUTATIONS.find(s => s.value === person.salutation)?.label + ' ' : '';
    return `${salutation}${person.name}`.trim() || 'New Contact Person';
  };

  // Get primary contact channel for person
  const getPrimaryChannel = (channels: ContactChannel[], type: string) => {
    return channels.find(ch => ch.channel_type === type && ch.is_primary) ||
           channels.find(ch => ch.channel_type === type);
  };

  const handleEditClick = (person: ContactPerson, index: number) => {
    setEditingPerson(person);
    setEditingIndex(index);
  };

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
    setShowDeleteDialog(true);
  };

  return (
    <>
      <div className="rounded-2xl shadow-sm border p-6" style={glassStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>Contact Persons</h2>
            <div
              className="px-2 py-1 text-xs rounded-full"
              style={{
                backgroundColor: `${colors.brand.primary}20`,
                color: colors.brand.primary
              }}
            >
              Corporate Only
            </div>
          </div>
          {value.length < 10 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={disabled}
              className="flex items-center px-3 py-2 rounded-md hover:opacity-90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </button>
          )}
        </div>

        <div
          className="mb-4 p-3 rounded-xl border"
          style={{
            backgroundColor: `${colors.brand.primary}10`,
            borderColor: `${colors.brand.primary}20`,
          }}
        >
          <p className="text-sm" style={{ color: colors.brand.primary }}>
            <Building2 className="inline h-4 w-4 mr-1" />
            Add individual contact persons who work for this corporate entity.
          </p>
        </div>

        {/* Contact Person Cards */}
        {value.length === 0 ? (
          <div
            className="text-center p-8 border-2 border-dashed rounded-xl"
            style={{
              borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            }}
          >
            <Users className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
            <p className="mb-4" style={{ color: colors.utility.secondaryText }}>No contact persons added yet</p>
            <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
              Add employees, managers, or other individuals who represent this company
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={disabled}
              className="flex items-center px-4 py-2 rounded-md hover:opacity-90 transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact Person
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {value.map((person, index) => {
              const primaryEmail = getPrimaryChannel(person.contact_channels, 'email');
              const primaryPhone = getPrimaryChannel(person.contact_channels, 'mobile');

              return (
                <div
                  key={person.id || index}
                  className="relative p-4 rounded-xl border hover:shadow-md transition-all group"
                  style={cardStyle}
                >
                  {/* Primary Badge */}
                  {person.is_primary && (
                    <div
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                      style={{
                        backgroundColor: `${colors.brand.primary}20`,
                        color: colors.brand.primary
                      }}
                    >
                      <Star className="h-3 w-3" />
                      Primary
                    </div>
                  )}

                  {/* Person Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                      style={{
                        backgroundColor: `${colors.brand.primary}20`,
                        color: colors.brand.primary
                      }}
                    >
                      {person.name.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                          {getPersonDisplayName(person)}
                        </span>
                      </div>
                      {(person.designation || person.department) && (
                        <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {person.designation}
                          {person.designation && person.department && ' • '}
                          {person.department}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Channels Summary */}
                  <div className="mb-4 space-y-2">
                    {primaryEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                        <span className="truncate" style={{ color: colors.utility.primaryText }}>{primaryEmail.value}</span>
                        {primaryEmail.is_verified && (
                          <CheckCircle className="h-3 w-3" style={{ color: colors.semantic.success }} />
                        )}
                      </div>
                    )}

                    {primaryPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                        <span style={{ color: colors.utility.primaryText }}>
                          {primaryPhone.country_code && `${primaryPhone.country_code} `}
                          {primaryPhone.value}
                        </span>
                        {primaryPhone.is_verified && (
                          <CheckCircle className="h-3 w-3" style={{ color: colors.semantic.success }} />
                        )}
                      </div>
                    )}

                    {person.contact_channels.length === 0 && (
                      <p className="text-xs italic" style={{ color: colors.utility.secondaryText }}>
                        No contact channels added
                      </p>
                    )}

                    {person.contact_channels.length > 2 && (
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        +{person.contact_channels.length - 2} more contact methods
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {person.notes && (
                    <div className="mb-4">
                      <p
                        className="text-xs p-2 rounded-lg"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          color: colors.utility.secondaryText
                        }}
                      >
                        💡 {person.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    className="flex items-center justify-between pt-3 border-t"
                    style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="flex gap-2">
                      {!person.is_primary && (
                        <button
                          onClick={() => updateContactPerson(index, { is_primary: true })}
                          disabled={disabled}
                          className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                          style={{ color: colors.utility.secondaryText }}
                          title="Make primary contact"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(person, index)}
                        disabled={disabled}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: colors.utility.secondaryText }}
                        title="Edit person"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(index)}
                        disabled={disabled}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: colors.semantic.error }}
                        title="Remove person"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Information */}
        {value.length > 0 && (
          <div
            className="mt-4 p-3 rounded-xl border"
            style={{
              backgroundColor: `${colors.brand.primary}10`,
              borderColor: `${colors.brand.primary}20`,
            }}
          >
            <div className="text-sm" style={{ color: colors.brand.primary }}>
              <strong>{value.length}</strong> contact person{value.length !== 1 ? 's' : ''} added
              {value.filter(p => p.is_primary).length > 0 && (
                <span>
                  {' '} • <strong>1</strong> primary contact
                </span>
              )}
              {value.filter(p => p.contact_channels.length > 0).length > 0 && (
                <span>
                  {' '} • <strong>{value.filter(p => p.contact_channels.length > 0).length}</strong> with contact info
                </span>
              )}
            </div>
          </div>
        )}

        {/* Validation Messages */}
        {value.length > 0 && !value.some(p => p.is_primary) && (
          <div
            className="mt-4 p-3 rounded-xl border"
            style={{
              backgroundColor: `${colors.semantic.warning}10`,
              borderColor: `${colors.semantic.warning}25`,
            }}
          >
            <p className="text-sm" style={{ color: colors.semantic.warning }}>
              💡 Tip: Mark one person as "Primary Contact" for the main point of contact.
            </p>
          </div>
        )}

        {value.length >= 10 && (
          <div
            className="mt-4 p-3 rounded-xl border"
            style={{
              backgroundColor: `${colors.brand.primary}10`,
              borderColor: `${colors.brand.primary}20`,
            }}
          >
            <p className="text-sm" style={{ color: colors.brand.primary }}>
              ℹ️ Maximum of 10 contact persons allowed per company.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteIndex(null);
        }}
        onConfirm={() => {
          if (deleteIndex !== null) {
            removeContactPerson(deleteIndex);
          }
        }}
        title="Remove Contact Person"
        description="Are you sure you want to remove this contact person? This action cannot be undone."
        confirmText="Remove"
        type="danger"
        icon={<Trash2 className="h-6 w-6" />}
      />

      {/* Add Contact Person Modal */}
      {isAddModalOpen && (
        <ContactPersonModal
          mode="add"
          person={null}
          onSave={addContactPerson}
          onClose={() => setIsAddModalOpen(false)}
          existingPersons={value}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Edit Contact Person Modal */}
      {editingPerson && editingIndex !== null && (
        <ContactPersonModal
          mode="edit"
          person={editingPerson}
          onSave={(updates) => updateContactPerson(editingIndex, updates as ContactPerson)}
          onClose={() => {
            setEditingPerson(null);
            setEditingIndex(null);
          }}
          existingPersons={value}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
};

// Modal Component for Add/Edit
interface ContactPersonModalProps {
  mode: 'add' | 'edit';
  person: ContactPerson | null;
  onSave: (person: Omit<ContactPerson, 'id'> | ContactPerson) => void;
  onClose: () => void;
  existingPersons: ContactPerson[];
  colors: any;
  isDarkMode: boolean;
}

const ContactPersonModal: React.FC<ContactPersonModalProps> = ({
  mode,
  person,
  onSave,
  onClose,
  existingPersons,
  colors,
  isDarkMode
}) => {
  const [loading, setLoading] = useState(false);
  const [personData, setPersonData] = useState<Omit<ContactPerson, 'id'>>({
    salutation: person?.salutation || undefined,
    name: person?.name || '',
    designation: person?.designation || '',
    department: person?.department || '',
    is_primary: person?.is_primary || existingPersons.length === 0,
    contact_channels: person?.contact_channels || [],
    notes: person?.notes || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modalGlassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.95)'
      : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(15, 23, 42, 0.6)'
      : 'rgba(255, 255, 255, 0.8)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.2)'
      : 'rgba(0,0,0,0.15)',
    color: colors.utility.primaryText,
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!personData.name.trim()) {
      newErrors.name = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (personData.name.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
      newErrors.name = ERROR_MESSAGES.MIN_LENGTH(VALIDATION_RULES.NAME_MIN_LENGTH);
    } else if (personData.name.length > VALIDATION_RULES.NAME_MAX_LENGTH) {
      newErrors.name = ERROR_MESSAGES.MAX_LENGTH(VALIDATION_RULES.NAME_MAX_LENGTH);
    }

    if (personData.designation && personData.designation.length > 50) {
      newErrors.designation = ERROR_MESSAGES.MAX_LENGTH(50);
    }

    if (personData.department && personData.department.length > 50) {
      newErrors.department = ERROR_MESSAGES.MAX_LENGTH(50);
    }

    if (personData.notes && personData.notes.length > VALIDATION_RULES.NOTES_MAX_LENGTH) {
      newErrors.notes = ERROR_MESSAGES.MAX_LENGTH(VALIDATION_RULES.NOTES_MAX_LENGTH);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      if (mode === 'edit' && person) {
        onSave({ ...person, ...personData });
      } else {
        onSave(personData);
      }
    } catch (error) {
      captureException(error, {
        tags: { component: 'ContactPersonModal', action: 'handleSubmit' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={modalGlassStyle}
      >
        {/* Header */}
        <div
          className="p-6 flex-shrink-0 border-b"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
              {mode === 'add' ? 'Add Contact Person' : 'Edit Contact Person'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md transition-colors"
              style={{ color: colors.utility.secondaryText }}
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Salutation</label>
                    <select
                      value={personData.salutation || ''}
                      onChange={(e) => setPersonData(prev => ({
                        ...prev,
                        salutation: e.target.value as SalutationType || undefined
                      }))}
                      className="w-full p-2 border rounded-md"
                      style={inputStyle}
                      disabled={loading}
                    >
                      <option value="">Select</option>
                      {SALUTATIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                      Name <span style={{ color: colors.semantic.error }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={personData.name}
                      onChange={(e) => {
                        setPersonData(prev => ({ ...prev, name: e.target.value }));
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder={PLACEHOLDER_TEXTS.FULL_NAME}
                      className="w-full p-2 border rounded-md"
                      style={{
                        ...inputStyle,
                        borderColor: errors.name ? colors.semantic.error : inputStyle.borderColor,
                      }}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{errors.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Job Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Designation</label>
                    <input
                      type="text"
                      value={personData.designation}
                      onChange={(e) => {
                        setPersonData(prev => ({ ...prev, designation: e.target.value }));
                        if (errors.designation) setErrors(prev => ({ ...prev, designation: '' }));
                      }}
                      placeholder={PLACEHOLDER_TEXTS.DESIGNATION}
                      className="w-full p-2 border rounded-md"
                      style={{
                        ...inputStyle,
                        borderColor: errors.designation ? colors.semantic.error : inputStyle.borderColor,
                      }}
                      disabled={loading}
                    />
                    {errors.designation && (
                      <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{errors.designation}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Department</label>
                    <input
                      type="text"
                      value={personData.department}
                      onChange={(e) => {
                        setPersonData(prev => ({ ...prev, department: e.target.value }));
                        if (errors.department) setErrors(prev => ({ ...prev, department: '' }));
                      }}
                      placeholder={PLACEHOLDER_TEXTS.DEPARTMENT}
                      className="w-full p-2 border rounded-md"
                      style={{
                        ...inputStyle,
                        borderColor: errors.department ? colors.semantic.error : inputStyle.borderColor,
                      }}
                      disabled={loading}
                    />
                    {errors.department && (
                      <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{errors.department}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Channels */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Contact Channels</h3>
                <ContactChannelsSection
                  value={personData.contact_channels}
                  onChange={(contact_channels) => setPersonData(prev => ({ ...prev, contact_channels }))}
                  disabled={loading}
                  mode={mode === 'add' ? 'create' : 'edit'}
                  showValidation={false}
                />
              </div>

              {/* Additional Options */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={personData.is_primary}
                    onChange={(e) => setPersonData(prev => ({ ...prev, is_primary: e.target.checked }))}
                    className="mr-2"
                    style={{ accentColor: colors.brand.primary }}
                    disabled={loading}
                  />
                  <label htmlFor="is_primary" className="text-sm" style={{ color: colors.utility.primaryText }}>
                    Make this the primary contact person
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Notes (Optional)</label>
                  <textarea
                    value={personData.notes}
                    onChange={(e) => {
                      setPersonData(prev => ({ ...prev, notes: e.target.value }));
                      if (errors.notes) setErrors(prev => ({ ...prev, notes: '' }));
                    }}
                    placeholder="Add any notes about this contact person..."
                    rows={3}
                    className="w-full p-2 border rounded-md resize-none"
                    style={{
                      ...inputStyle,
                      borderColor: errors.notes ? colors.semantic.error : inputStyle.borderColor,
                    }}
                    disabled={loading}
                  />
                  {errors.notes && (
                    <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{errors.notes}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    {personData.notes?.length || 0}/{VALIDATION_RULES.NOTES_MAX_LENGTH} characters
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="p-6 flex-shrink-0 border-t"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border rounded-md transition-colors disabled:opacity-50"
              style={{
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: colors.utility.primaryText,
                backgroundColor: 'transparent'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md hover:opacity-90 transition-colors disabled:opacity-50"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  {mode === 'add' ? 'Adding...' : 'Saving...'}
                </>
              ) : (
                mode === 'add' ? 'Add Person' : 'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPersonsSection;

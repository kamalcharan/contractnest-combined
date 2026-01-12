// src/pages/contacts/create.tsx - PRODUCTION READY VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
 ArrowLeft,
 Save,
 X,
 HelpCircle,
 AlertCircle,
 Loader2,
 Send,
 User,
 Building2,
 Archive,
 AlertTriangle,
 Sparkles
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// Import Skeletons
import { FormSkeleton } from '@/components/common/skeletons';

// Import Confirmation Dialog
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

// Import API hooks
import {
 useCreateContact,
 useUpdateContact,
 useContact,
 useCheckDuplicates,
 useSendInvitation,
 useUpdateContactStatus,
 invalidateContactsCache,
 invalidateSingleContactCache
} from '../../hooks/useContacts';

// Import form components
import ContactClassificationSelector from '../../components/contacts/forms/ContactClassificationSelector';
import ContactChannelsSection from '../../components/contacts/forms/ContactChannelsSection';
import AddressesSection from '../../components/contacts/forms/AddressesSection';
import ComplianceNumbersSection from '../../components/contacts/forms/ComplianceNumbersSection';
import ContactPersonsSection from '../../components/contacts/forms/ContactPersonsSection';
import ContactTagsSection from '../../components/contacts/forms/ContactTagsSection';

// Import types
import { CreateContactRequest, UpdateContactRequest } from '../../types/contact';

// Import constants
import {
 CONTACT_FORM_TYPES,
 CONTACT_STATUS,
 USER_ACCOUNT_STATUS,
 USER_STATUS_MESSAGES,
 SALUTATIONS,
 VALIDATION_RULES,
 ERROR_MESSAGES,
 SUCCESS_MESSAGES,
 PLACEHOLDER_TEXTS,
 DOMAIN_CLASSIFICATIONS,
 getClassificationsForIndustry
} from '../../utils/constants/contacts';

// Contact form data interface
interface ContactFormData {
 type: 'individual' | 'corporate';
 classifications: any[]; // Can be objects from UI or strings
 status: 'active' | 'inactive' | 'archived';
 salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
 name?: string;
 company_name?: string;
 company_registration_number?: string;
 industry?: string;
 contact_channels: any[];
 addresses: any[];
 compliance_numbers: any[];
 contact_persons: any[];
 notes?: string;
 tags: any[];
}

interface ContactFormProps {
 mode?: 'create' | 'edit';
 contactId?: string;
 initialData?: Partial<ContactFormData>;
 onSave?: (data: ContactFormData) => Promise<boolean>;
 onCancel?: () => void;
}

// Contact Type Tab Selector Component
const ContactTypeTabSelector: React.FC<{
 value: 'individual' | 'corporate';
 onChange: (type: 'individual' | 'corporate') => void;
 disabled?: boolean;
 hasUnsavedChanges?: boolean;
}> = ({ value, onChange, disabled = false, hasUnsavedChanges = false }) => {
 const { isDarkMode, currentTheme } = useTheme();
 const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
 
 const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
 const [pendingType, setPendingType] = useState<'individual' | 'corporate' | null>(null);

 const handleTypeChange = (newType: 'individual' | 'corporate') => {
   if (disabled || newType === value) return;
   
   if (hasUnsavedChanges) {
     setPendingType(newType);
     setShowSwitchConfirm(true);
   } else {
     onChange(newType);
   }
 };

 return (
   <>
     <div 
       className="rounded-lg shadow-sm border transition-colors"
       style={{
         backgroundColor: colors.utility.secondaryBackground,
         borderColor: colors.utility.primaryText + '20'
       }}
     >
       <div 
         className="border-b"
         style={{ borderColor: colors.utility.primaryText + '20' }}
       >
         <div className="flex">
           <button
             onClick={() => handleTypeChange(CONTACT_FORM_TYPES.INDIVIDUAL)}
             disabled={disabled}
             className={`
               flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors
               ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
             `}
             style={{
               borderBottomColor: value === CONTACT_FORM_TYPES.INDIVIDUAL 
                 ? colors.brand.primary 
                 : 'transparent',
               color: value === CONTACT_FORM_TYPES.INDIVIDUAL 
                 ? colors.brand.primary 
                 : colors.utility.secondaryText,
               backgroundColor: value === CONTACT_FORM_TYPES.INDIVIDUAL 
                 ? colors.brand.primary + '10' 
                 : 'transparent'
             }}
           >
             <User className="h-4 w-4" />
             Individual
           </button>
           <button
             onClick={() => handleTypeChange(CONTACT_FORM_TYPES.CORPORATE)}
             disabled={disabled}
             className={`
               flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors
               ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
             `}
             style={{
               borderBottomColor: value === CONTACT_FORM_TYPES.CORPORATE 
                 ? colors.brand.primary 
                 : 'transparent',
               color: value === CONTACT_FORM_TYPES.CORPORATE 
                 ? colors.brand.primary 
                 : colors.utility.secondaryText,
               backgroundColor: value === CONTACT_FORM_TYPES.CORPORATE 
                 ? colors.brand.primary + '10' 
                 : 'transparent'
             }}
           >
             <Building2 className="h-4 w-4" />
             Corporate
           </button>
         </div>
       </div>
     </div>

     {/* Switch Confirmation Dialog */}
     <ConfirmationDialog
       isOpen={showSwitchConfirm}
       onClose={() => {
         setShowSwitchConfirm(false);
         setPendingType(null);
       }}
       onConfirm={() => {
         if (pendingType) {
           onChange(pendingType);
         }
         setShowSwitchConfirm(false);
         setPendingType(null);
       }}
       title="Unsaved Changes"
       description="Switching contact type will reset some fields. Are you sure you want to continue?"
       confirmText="Switch Type"
       cancelText="Cancel"
       type="warning"
     />
   </>
 );
};

// Contact Status Section Component
const ContactStatusSection: React.FC<{
 status: 'active' | 'inactive' | 'archived';
 onChange: (status: 'active' | 'inactive' | 'archived') => void;
 disabled?: boolean;
 isEditMode?: boolean;
 contactId?: string;
}> = ({ status, onChange, disabled = false, isEditMode = false, contactId }) => {
 const { isDarkMode, currentTheme } = useTheme();
 const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
 
 const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
 const [isUpdating, setIsUpdating] = useState(false);
 const updateStatusHook = useUpdateContactStatus();
 const { toast } = useToast();

 const handleStatusChange = async (newStatus: 'active' | 'inactive' | 'archived') => {
   if (isEditMode && contactId) {
     try {
       setIsUpdating(true);
       await updateStatusHook.mutate(contactId, newStatus);
       onChange(newStatus);
       toast({
         title: "Success",
         description: `Contact ${newStatus === 'active' ? 'activated' : newStatus === 'inactive' ? 'deactivated' : 'archived'} successfully`
       });
     } catch (error) {
       console.error('Failed to update status:', error);
       toast({
         variant: "destructive",
         title: "Error",
         description: "Failed to update contact status"
       });
     } finally {
       setIsUpdating(false);
     }
   } else {
     onChange(newStatus);
   }
 };

 const handleArchive = () => {
   setShowArchiveConfirm(true);
 };

 return (
   <div className="space-y-4">
     {/* Active/Inactive Toggle Card */}
     <div 
       className="rounded-lg shadow-sm border p-4 transition-colors"
       style={{
         backgroundColor: colors.utility.secondaryBackground,
         borderColor: colors.utility.primaryText + '20'
       }}
     >
       <h3 
         className="text-base font-semibold mb-4 transition-colors"
         style={{ color: colors.utility.primaryText }}
       >
         Contact Status
       </h3>
       <div className="flex items-center justify-between">
         <div>
           <p 
             className="font-medium text-sm transition-colors"
             style={{ color: colors.utility.primaryText }}
           >
             {status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : 'Archived'}
           </p>
           <p 
             className="text-xs transition-colors"
             style={{ color: colors.utility.secondaryText }}
           >
             {status === 'active' ? 'Contact is available for business' : 
              status === 'inactive' ? 'Contact is temporarily disabled' : 
              'Contact is permanently archived'}
           </p>
         </div>
         {status !== 'archived' && (
           <label className="relative inline-flex items-center cursor-pointer">
             <input
               type="checkbox"
               checked={status === 'active'}
               onChange={(e) => handleStatusChange(e.target.checked ? 'active' : 'inactive')}
               disabled={disabled || isUpdating}
               className="sr-only peer"
             />
             <div 
               className={`
                 w-11 h-6 peer-focus:outline-none peer-focus:ring-4 
                 rounded-full peer 
                 peer-checked:after:translate-x-full peer-checked:after:border-white 
                 after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                 ${isUpdating ? 'opacity-50' : ''}
               `}
               style={{
                 backgroundColor: status === 'active' ? colors.brand.primary : colors.utility.secondaryText + '40',
                 '--tw-ring-color': colors.brand.primary + '40'
               } as React.CSSProperties}
             ></div>
           </label>
         )}
       </div>
       {isUpdating && (
         <div 
           className="mt-2 flex items-center text-sm"
           style={{ color: colors.utility.secondaryText }}
         >
           <Loader2 className="h-4 w-4 animate-spin mr-2" />
           Updating status...
         </div>
       )}
     </div>

     {/* Archive Card */}
     {status !== 'archived' && (
       <div 
         className="rounded-lg shadow-sm border p-4 transition-colors"
         style={{
           backgroundColor: colors.utility.secondaryBackground,
           borderColor: colors.semantic.error + '40'
         }}
       >
         <div className="flex items-start gap-3">
           <Archive 
             className="h-5 w-5 flex-shrink-0 mt-0.5"
             style={{ color: colors.semantic.error }}
           />
           <div className="flex-1">
             <h3 
               className="text-base font-semibold mb-2 transition-colors"
               style={{ color: colors.utility.primaryText }}
             >
               Archive Contact
             </h3>
             <p 
               className="text-sm mb-3 transition-colors"
               style={{ color: colors.utility.secondaryText }}
             >
               Once a contact is archived, it cannot be reverted back. The contact will be permanently disabled.
             </p>
             
             <button
               onClick={handleArchive}
               disabled={disabled || isUpdating}
               className="flex items-center px-3 py-2 rounded-md transition-colors text-sm disabled:opacity-50"
               style={{
                 backgroundColor: colors.semantic.error,
                 color: '#ffffff'
               }}
             >
               <Archive className="mr-2 h-4 w-4" />
               Archive Contact
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Archive Confirmation Dialog */}
     <ConfirmationDialog
       isOpen={showArchiveConfirm}
       onClose={() => setShowArchiveConfirm(false)}
       onConfirm={() => {
         handleStatusChange('archived');
         setShowArchiveConfirm(false);
       }}
       title="Archive Contact"
       description="Are you sure you want to archive this contact? This action cannot be undone."
       confirmText="Archive"
       type="danger"
       icon={<Archive className="h-6 w-6" />}
     />
   </div>
 );
};

// VaNi Full Page Loader Component - Branded loader with orb and pulse
const VANI_ORB_BG = '#1e293b'; // Dark slate for brand consistency

const FullPageSaveLoader: React.FC<{ message?: string }> = ({ message = "Saving entity..." }) => {
 const { isDarkMode, currentTheme } = useTheme();
 const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

 return (
   <div
     className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
     style={{ backgroundColor: colors.utility.primaryBackground + 'CC' }}
   >
     <div className="flex flex-col items-center">
       {/* VaNi Orb */}
       <div className="relative mb-6">
         {/* Pulse ring */}
         <div
           className="absolute inset-0 rounded-full animate-ping opacity-30"
           style={{ backgroundColor: colors.brand.primary }}
         />
         {/* Outer glow */}
         <div
           className="absolute -inset-2 rounded-full blur-md opacity-40 animate-pulse"
           style={{ backgroundColor: colors.brand.primary }}
         />
         {/* Orb */}
         <div
           className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
           style={{
             backgroundColor: VANI_ORB_BG,
             boxShadow: `0 0 30px ${colors.brand.primary}40`
           }}
         >
           <Sparkles
             className="h-8 w-8 animate-pulse"
             style={{ color: colors.brand.primary }}
           />
         </div>
       </div>

       {/* Message */}
       <p
         className="text-lg font-semibold tracking-wide uppercase animate-pulse transition-colors"
         style={{ color: colors.utility.primaryText }}
       >
         {message}
       </p>
       <p
         className="text-sm mt-2 transition-colors"
         style={{ color: colors.utility.secondaryText }}
       >
         Please wait while VaNi processes your request...
       </p>
     </div>
   </div>
 );
};

// Main Contact Form Component
const ContactCreateForm: React.FC<ContactFormProps> = ({
 mode = 'create',
 contactId,
 initialData,
 onSave,
 onCancel
}) => {
 const navigate = useNavigate();
 const { id } = useParams<{ id: string }>();
 const { isDarkMode, currentTheme } = useTheme();
 
 // FIXED: Get all required values from auth context
 const { isAuthenticated, currentTenant, user, isLive } = useAuth();
 const { toast } = useToast();
 const isEditMode = mode === 'edit' || !!id;
 
 // Get theme colors
 const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
 
 // Track initial data for change detection
 const initialFormDataRef = useRef<ContactFormData | null>(null);

 // Track page view
 useEffect(() => {
   try {
     analyticsService.trackPageView(
       isEditMode ? `contacts/edit/${contactId || id}` : 'contacts/create',
       isEditMode ? 'Edit Contact' : 'Create Contact'
     );
   } catch (error) {
     console.error('Analytics error:', error);
   }
 }, [isEditMode, contactId, id]);

 // API Hooks
 const createContactHook = useCreateContact();
 const updateContactHook = useUpdateContact();
 const { data: existingContact, loading: isLoadingContact, error: loadError } = useContact(contactId || id || '');
 const checkDuplicatesHook = useCheckDuplicates();
 const sendInvitationHook = useSendInvitation();

 // Combine loading states
 const isSaving = createContactHook.loading || updateContactHook.loading;
 const isCheckingDuplicates = checkDuplicatesHook.loading;

 // State for dialogs
 const [showCancelDialog, setShowCancelDialog] = useState(false);
 const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
 const [duplicateContacts, setDuplicateContacts] = useState<any[]>([]);
 const [showFullPageLoader, setShowFullPageLoader] = useState(false);

 // Get current industry - MOVED BEFORE CONDITIONAL RETURN (React hooks rule)
 const [currentIndustry, setCurrentIndustry] = useState<string>('default');

 // Form state - MOVED BEFORE CONDITIONAL RETURN (React hooks rule)
 const [formData, setFormData] = useState<ContactFormData>({
   type: CONTACT_FORM_TYPES.INDIVIDUAL,
   classifications: [],
   status: CONTACT_STATUS.ACTIVE,
   contact_channels: [],
   addresses: [],
   compliance_numbers: [],
   contact_persons: [],
   tags: [],
   ...initialData
 });

 // UI state - MOVED BEFORE CONDITIONAL RETURN (React hooks rule)
 const [showVideoHelp, setShowVideoHelp] = useState<boolean>(false);
 const [validationErrors, setValidationErrors] = useState<string[]>([]);
 const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
 const [userAccountStatus, setUserAccountStatus] = useState<string>(USER_ACCOUNT_STATUS.NO_ACCOUNT);

 // Initialize form data ref - MOVED BEFORE CONDITIONAL RETURN (React hooks rule)
 useEffect(() => {
   if (!initialFormDataRef.current) {
     initialFormDataRef.current = { ...formData };
   }
 }, []);

 // Load existing contact data in edit mode - MOVED BEFORE CONDITIONAL RETURN (React hooks rule)
 useEffect(() => {
   if (isEditMode && existingContact) {
     // Transform classifications to match UI component expectations
     const transformedClassifications = existingContact.classifications?.map((cls: any) => {
       if (typeof cls === 'string') {
         return {
           classification_value: cls,
           classification_label: cls.charAt(0).toUpperCase() + cls.slice(1).replace('_', ' ')
         };
       }
       return cls;
     }) || [];

     const loadedData = {
       type: existingContact.type as 'individual' | 'corporate',
       classifications: transformedClassifications,
       status: existingContact.status as 'active' | 'inactive' | 'archived',
       salutation: existingContact.salutation as any,
       name: existingContact.name,
       company_name: existingContact.company_name,
       company_registration_number: existingContact.company_registration_number,
       industry: existingContact.industry,
       contact_channels: existingContact.contact_channels || [],
       addresses: existingContact.addresses || [],
       compliance_numbers: existingContact.compliance_numbers || [],
       contact_persons: existingContact.contact_persons || [],
       notes: existingContact.notes,
       tags: existingContact.tags || []
     };

     setFormData(loadedData);
     initialFormDataRef.current = { ...loadedData };
     setHasUnsavedChanges(false);

     if (existingContact.user_account_status) {
       setUserAccountStatus(existingContact.user_account_status);
     }
   }
 }, [isEditMode, existingContact]);

 // Add authentication check - AFTER ALL HOOKS
 if (!isAuthenticated || !currentTenant) {
   return (
     <div
       className="p-4 md:p-6 min-h-screen transition-colors"
       style={{ backgroundColor: colors.utility.primaryBackground }}
     >
       <div className="flex items-center justify-center py-12">
         <FormSkeleton />
       </div>
     </div>
   );
 }

 // Check if form has actual changes
 const checkForChanges = (currentData: ContactFormData, initialData: ContactFormData | null): boolean => {
   if (!initialData) return false;
   
   const simpleFields = ['type', 'status', 'salutation', 'name', 'company_name', 'company_registration_number', 'industry', 'notes'];
   for (const field of simpleFields) {
     if (currentData[field as keyof ContactFormData] !== initialData[field as keyof ContactFormData]) {
       return true;
     }
   }
   
   const arrayFields = ['classifications', 'contact_channels', 'addresses', 'compliance_numbers', 'contact_persons', 'tags'];
   for (const field of arrayFields) {
     const current = currentData[field as keyof ContactFormData] as any[];
     const initial = initialData[field as keyof ContactFormData] as any[];
     if (current.length !== initial.length) return true;
   }
   
   return false;
 };

 // Form validation
 const validateForm = (): boolean => {
   const errors: string[] = [];

   if (formData.classifications.length === 0) {
     errors.push('Please select at least one contact classification.');
     toast({
       variant: "destructive",
       title: "Classification Required",
       description: "Please select at least one contact classification",
       duration: 5000
     });
   }

   if (formData.type === CONTACT_FORM_TYPES.INDIVIDUAL) {
     if (!formData.name?.trim()) {
       errors.push('Name is required for individual contacts.');
       toast({
         variant: "destructive",
         title: "Name Required",
         description: "Please enter the name for individual contact",
         duration: 5000
       });
     }
   } else {
     if (!formData.company_name?.trim()) {
       errors.push('Company name is required for corporate contacts.');
       toast({
         variant: "destructive",
         title: "Company Name Required",
         description: "Please enter the company name for corporate contact",
         duration: 5000
       });
     }
   }

   if (formData.contact_channels.length === 0) {
     errors.push('At least one contact channel is required.');
     toast({
       variant: "destructive",
       title: "Contact Channel Required",
       description: "Please add at least one contact channel (email, phone, etc.)",
       duration: 5000
     });
   }

   setValidationErrors(errors);
   return errors.length === 0;
 };

 // FIXED: Handle form submission with proper environment and user data
 const handleSave = async () => {
   if (!validateForm()) {
     return;
   }

   try {
     setShowFullPageLoader(true);
     
     // Debug logging
     console.log('=== SAVE CONTACT DEBUG ===');
     console.log('Current Environment (isLive):', isLive);
     console.log('Current User ID:', user?.id);
     console.log('Current Tenant ID:', currentTenant?.id);
     console.log('==========================');

     analyticsService.trackPageView(
       isEditMode ? 'contacts/edit/save' : 'contacts/create/save',
       'Contact Save Attempt'
     );

     // Transform all data to match API expectations
     const transformedData = {
       ...formData,
       // Transform classifications from objects to strings
       classifications: formData.classifications.map(c => {
         if (typeof c === 'object' && c.classification_value) {
           return c.classification_value;
         }
         return c;
       }),
       // Transform addresses to ensure correct field names
       addresses: formData.addresses.map(addr => ({
         ...addr,
         type: addr.address_type || addr.type,
         id: addr.id?.startsWith('temp_') ? undefined : addr.id
       })),
       // Transform contact channels - remove temp IDs
       contact_channels: formData.contact_channels.map(channel => ({
         ...channel,
         id: channel.id?.startsWith('temp_') ? undefined : channel.id
       })),
       // Transform contact persons - remove temp IDs
       contact_persons: formData.contact_persons.map(person => ({
         ...person,
         id: person.id?.startsWith('temp_') ? undefined : person.id
       })),
       // Transform tags
       tags: formData.tags.map(tag => {
         if (typeof tag === 'string') {
           return { tag_value: tag, tag_label: tag };
         }
         return tag;
       })
     };

     // Check for duplicates first (only in create mode)
     if (!isEditMode) {
       const duplicateCheck = await checkDuplicatesHook.check({
         contact_channels: transformedData.contact_channels,
         type: transformedData.type,
         name: transformedData.name,
         company_name: transformedData.company_name,
         classifications: transformedData.classifications
       });
       
       if (duplicateCheck.hasDuplicates) {
         setDuplicateContacts(duplicateCheck.duplicates);
         setShowDuplicateDialog(true);
         setShowFullPageLoader(false);
         return;
       }
     }

     // FIXED: Build contact data with all required fields
     const contactData: CreateContactRequest | UpdateContactRequest = {
       ...transformedData,
       name: transformedData.type === 'individual' ? transformedData.name! : undefined,
       company_name: transformedData.type === 'corporate' ? transformedData.company_name! : undefined,
       // CRITICAL FIXES: Add these fields
       tenant_id: currentTenant?.id,
       is_live: isLive,  // CRITICAL: Set environment flag from auth context
       created_by: !isEditMode ? (user?.id || null) : undefined,
       updated_by: isEditMode ? (user?.id || null) : undefined,
       t_userprofile_id: null,  // Force null - don't use user profile ID
       auth_user_id: null,  // Force null for now
     };

     console.log('Contact data being sent:', {
       is_live: contactData.is_live,
       tenant_id: contactData.tenant_id,
       created_by: contactData.created_by,
       t_userprofile_id: contactData.t_userprofile_id
     });

     let savedContactId: string;
     
     try {
       if (isEditMode && (contactId || id)) {
         const result = await updateContactHook.mutate({ 
           contactId: contactId || id!, 
           updates: contactData as UpdateContactRequest 
         });
         savedContactId = result.id;
         
         toast({
           title: "Success!",
           description: "Contact updated successfully",
           duration: 3000
         });
       } else {
         const result = await createContactHook.mutate(contactData as CreateContactRequest);
         savedContactId = result.id;
         
         toast({
           title: "Success!",
           description: "Contact created successfully",
           duration: 3000
         });
       }
       
       analyticsService.trackPageView(
         isEditMode ? 'contacts/edit/success' : 'contacts/create/success',
         'Contact Save Success'
       );

       setHasUnsavedChanges(false);

       // Invalidate caches so returning to list/view shows fresh data
       if (currentTenant?.id) {
         invalidateContactsCache(currentTenant.id, isLive);
         // Also invalidate the specific contact cache if editing
         if (isEditMode && savedContactId) {
           invalidateSingleContactCache(savedContactId, currentTenant.id, isLive);
         }
         console.log('📦 Caches invalidated after save');
       }

       setTimeout(() => {
         navigate(`/contacts/${savedContactId}`);
       }, 500);
       
     } catch (error: any) {
       console.error('Failed to save contact:', error);
       setShowFullPageLoader(false);
       
       // Better error handling
       if (error.message?.includes('auditLogger')) {
         toast({
           title: "Warning",
           description: `Contact ${isEditMode ? 'updated' : 'created'} but audit logging failed. Please verify the contact.`,
           duration: 5000
         });
         
         if (isEditMode && (contactId || id)) {
           setTimeout(() => {
             navigate(`/contacts/${contactId || id}`);
           }, 500);
         } else {
           navigate('/contacts');
         }
         return;
       }
       
       if (error.message?.includes('Validation')) {
         toast({
           variant: "destructive",
           title: "Validation Error",
           description: error.message
         });
       } else {
         toast({
           variant: "destructive",
           title: "Error",
           description: `Failed to ${isEditMode ? 'update' : 'create'} contact. Please try again.`
         });
       }
       
       captureException(error, {
         tags: { 
           component: 'ContactCreateForm', 
           action: isEditMode ? 'updateContact' : 'createContact' 
         },
         extra: { 
           contactData: contactData, 
           tenantId: currentTenant?.id,
           mode: isEditMode ? 'edit' : 'create',
           environment: isLive ? 'live' : 'test'
         }
       });
     }
   } catch (error: any) {
     console.error('Unexpected error in handleSave:', error);
     setShowFullPageLoader(false);
     
     toast({
       variant: "destructive",
       title: "Unexpected Error",
       description: "An unexpected error occurred. Please try again."
     });
   }
 };

 // Handle cancel
 const handleCancel = () => {
   if (hasUnsavedChanges) {
     setShowCancelDialog(true);
   } else {
     if (onCancel) {
       onCancel();
     } else {
       navigate('/contacts');
     }
   }
 };

 // Update form data helper
 const updateFormData = (updates: Partial<ContactFormData>) => {
   setFormData(prev => {
     if (updates.type && updates.type !== prev.type) {
       const resetData = {
         ...prev,
         ...updates,
         salutation: undefined,
         name: undefined,
         company_name: undefined,
         company_registration_number: undefined,
         compliance_numbers: [],
         contact_persons: [],
         contact_channels: [],
         addresses: [],
         tags: [],
         notes: '',
         classifications: prev.classifications,
         status: prev.status
       };
       
       const hasChanges = checkForChanges(resetData, initialFormDataRef.current);
       setHasUnsavedChanges(hasChanges);
       
       return resetData;
     }
     
     const newData = { ...prev, ...updates };
     
     const hasChanges = checkForChanges(newData, initialFormDataRef.current);
     setHasUnsavedChanges(hasChanges);
     
     return newData;
   });
 };

 const userStatusInfo = USER_STATUS_MESSAGES[userAccountStatus as keyof typeof USER_STATUS_MESSAGES];

 // Show loading state while fetching existing contact
 if (isEditMode && isLoadingContact) {
   return (
     <div
       className="p-4 md:p-6 min-h-screen transition-colors flex items-center justify-center"
       style={{ backgroundColor: colors.utility.primaryBackground }}
     >
       {/* VaNi Loading Orb */}
       <div className="flex flex-col items-center">
         <div className="relative mb-6">
           {/* Pulse ring */}
           <div
             className="absolute inset-0 rounded-full animate-ping opacity-30"
             style={{ backgroundColor: colors.brand.primary }}
           />
           {/* Outer glow */}
           <div
             className="absolute -inset-2 rounded-full blur-md opacity-40 animate-pulse"
             style={{ backgroundColor: colors.brand.primary }}
           />
           {/* Orb */}
           <div
             className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
             style={{
               backgroundColor: VANI_ORB_BG,
               boxShadow: `0 0 30px ${colors.brand.primary}40`
             }}
           >
             <Sparkles
               className="h-8 w-8 animate-pulse"
               style={{ color: colors.brand.primary }}
             />
           </div>
         </div>
         <p
           className="text-lg font-semibold tracking-wide uppercase animate-pulse"
           style={{ color: colors.utility.primaryText }}
         >
           Loading Entity...
         </p>
         <p
           className="text-sm mt-2"
           style={{ color: colors.utility.secondaryText }}
         >
           Please wait while we fetch the data
         </p>
       </div>
     </div>
   );
 }

 return (
   <div 
     className="p-4 md:p-6 min-h-screen transition-colors"
     style={{ backgroundColor: colors.utility.primaryBackground }}
   >
     {/* Full Page Save Loader */}
     {showFullPageLoader && <FullPageSaveLoader message={isEditMode ? "Updating Entity..." : "Creating Entity..."} />}
     
     {/* Header */}
     <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
       <div className="flex items-center gap-3">
         <button 
           onClick={handleCancel}
           className="p-2 rounded-full hover:opacity-80 transition-colors"
           style={{ backgroundColor: colors.utility.secondaryBackground }}
         >
           <ArrowLeft 
             className="h-5 w-5"
             style={{ color: colors.utility.secondaryText }}
           />
         </button>
         <div>
           <h1 
             className="text-2xl font-bold flex items-center gap-2 transition-colors"
             style={{ color: colors.utility.primaryText }}
           >
             {isEditMode ? 'Edit Entity' : 'Create Entity'}
             <button
               onClick={() => setShowVideoHelp(true)}
               className="p-1 rounded-full hover:opacity-80 transition-colors"
               title="Help & tutorials"
             >
               <HelpCircle 
                 className="h-5 w-5"
                 style={{ color: colors.utility.secondaryText }}
               />
             </button>
           </h1>
           <p 
             className="transition-colors"
             style={{ color: colors.utility.secondaryText }}
           >
             {isEditMode
               ? 'Update entity information and details'
               : 'Add a new entity to your directory'
             }
           </p>
         </div>
       </div>
       
       <div className="flex items-center gap-3">
         {/* Unsaved Changes Indicator */}
         {hasUnsavedChanges && !isSaving && (
           <div
             className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse"
             style={{
               backgroundColor: colors.semantic.warning + '20',
               color: colors.semantic.warning
             }}
           >
             <div
               className="w-2 h-2 rounded-full"
               style={{ backgroundColor: colors.semantic.warning }}
             />
             Unsaved changes
           </div>
         )}

         <button
           onClick={handleCancel}
           disabled={isSaving}
           className="flex items-center px-4 py-2 border rounded-md hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           style={{
             borderColor: colors.utility.primaryText + '40',
             color: colors.utility.primaryText,
             backgroundColor: 'transparent'
           }}
         >
           <X className="mr-2 h-4 w-4" />
           Cancel
         </button>
         <button
           onClick={handleSave}
           disabled={isSaving}
           className="flex items-center px-4 py-2 rounded-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
           style={{
             backgroundColor: colors.brand.primary,
             color: '#ffffff'
           }}
         >
           {isSaving ? (
             <>
               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
               Saving...
             </>
           ) : (
             <>
               <Save className="mr-2 h-4 w-4" />
               {isEditMode ? 'Update Entity' : 'Save Entity'}
             </>
           )}
         </button>
       </div>
     </div>

     {/* Validation Errors */}
     {validationErrors.length > 0 && (
       <div 
         className="mb-6 p-4 rounded-lg border transition-colors"
         style={{
           backgroundColor: colors.semantic.error + '10',
           borderColor: colors.semantic.error + '40'
         }}
       >
         <div className="flex items-start gap-3">
           <AlertCircle 
             className="h-5 w-5 flex-shrink-0 mt-0.5"
             style={{ color: colors.semantic.error }}
           />
           <div>
             <h3 
               className="font-medium"
               style={{ color: colors.semantic.error }}
             >
               Please fix the following errors:
             </h3>
             <ul 
               className="mt-2 text-sm list-disc list-inside"
               style={{ color: colors.semantic.error }}
             >
               {validationErrors.map((error, index) => (
                 <li key={`error-${index}`}>{error}</li>
               ))}
             </ul>
           </div>
         </div>
       </div>
     )}

     {/* Main Layout - Left Content + Right Sidebar */}
     <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
       {/* Left Content Area (3/4 width) */}
       <div className="xl:col-span-3 space-y-6">
         {/* Contact Type Selection */}
         <ContactTypeTabSelector
           value={formData.type}
           onChange={(type) => updateFormData({ type })}
           disabled={isSaving}
           hasUnsavedChanges={hasUnsavedChanges}
         />

         {/* Contact Info + Contact Channels - Side by Side */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Left Column: Contact Information + Tags */}
           <div className="space-y-6">
             {/* Contact Information */}
             <div 
               className="rounded-lg shadow-sm border p-6 transition-colors"
               style={{
                 backgroundColor: colors.utility.secondaryBackground,
                 borderColor: colors.utility.primaryText + '20'
               }}
             >
               <h2 
                 className="text-lg font-semibold mb-4 transition-colors"
                 style={{ color: colors.utility.primaryText }}
               >
                 Contact Information
               </h2>
               
               {formData.type === CONTACT_FORM_TYPES.INDIVIDUAL ? (
                 <div className="space-y-4">
                   <div>
                     <label 
                       className="block text-sm font-medium mb-2 transition-colors"
                       style={{ color: colors.utility.primaryText }}
                     >
                       Salutation
                     </label>
                     <select 
                       value={formData.salutation || ''}
                       onChange={(e) => updateFormData({ salutation: e.target.value as any || undefined })}
                       disabled={isSaving}
                       className="w-full p-2 border rounded-md disabled:opacity-50 transition-colors"
                       style={{
                         backgroundColor: colors.utility.primaryBackground,
                         borderColor: colors.utility.primaryText + '40',
                         color: colors.utility.primaryText
                       }}
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
                     <label 
                       className="block text-sm font-medium mb-2 transition-colors"
                       style={{ color: colors.utility.primaryText }}
                     >
                       Name *
                     </label>
                     <input
                       type="text"
                       value={formData.name || ''}
                       onChange={(e) => updateFormData({ name: e.target.value })}
                       disabled={isSaving}
                       className="w-full p-2 border rounded-md disabled:opacity-50 transition-colors"
                       style={{
                         backgroundColor: colors.utility.primaryBackground,
                         borderColor: colors.utility.primaryText + '40',
                         color: colors.utility.primaryText
                       }}
                       placeholder={PLACEHOLDER_TEXTS.FULL_NAME}
                     />
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <div>
                     <label 
                       className="block text-sm font-medium mb-2 transition-colors"
                       style={{ color: colors.utility.primaryText }}
                     >
                       Company Name *
                     </label>
                     <input
                       type="text"
                       value={formData.company_name || ''}
                       onChange={(e) => updateFormData({ company_name: e.target.value })}
                       disabled={isSaving}
                       className="w-full p-2 border rounded-md disabled:opacity-50 transition-colors"
                       style={{
                         backgroundColor: colors.utility.primaryBackground,
                         borderColor: colors.utility.primaryText + '40',
                         color: colors.utility.primaryText
                       }}
                       placeholder={PLACEHOLDER_TEXTS.COMPANY_NAME}
                     />
                   </div>
                   <div>
                     <label 
                       className="block text-sm font-medium mb-2 transition-colors"
                       style={{ color: colors.utility.primaryText }}
                     >
                       Registration Number
                     </label>
                     <input
                       type="text"
                       value={formData.company_registration_number || ''}
                       onChange={(e) => updateFormData({ company_registration_number: e.target.value })}
                       disabled={isSaving}
                       className="w-full p-2 border rounded-md disabled:opacity-50 transition-colors"
                       style={{
                         backgroundColor: colors.utility.primaryBackground,
                         borderColor: colors.utility.primaryText + '40',
                         color: colors.utility.primaryText
                       }}
                       placeholder="Company registration number"
                     />
                   </div>
                 </div>
               )}
             </div>

             {/* Tags Section */}
             <ContactTagsSection
               value={formData.tags || []}
               onChange={(tags) => updateFormData({ tags })}
               disabled={isSaving}
             />
           </div>

           {/* Right Column: Contact Channels */}
           <ContactChannelsSection
             value={formData.contact_channels}
             onChange={(contact_channels) => updateFormData({ contact_channels })}
             disabled={isSaving}
             duplicateWarnings={[]}
             mode={isEditMode ? 'edit' : 'create'}
           />
         </div>

         {/* Addresses */}
         <AddressesSection
           value={formData.addresses}
           onChange={(addresses) => updateFormData({ addresses })}
           disabled={isSaving}
           mode={isEditMode ? 'edit' : 'create'}
         />

         {/* Corporate-specific sections */}
         {formData.type === CONTACT_FORM_TYPES.CORPORATE && (
           <>
             <ComplianceNumbersSection
               value={formData.compliance_numbers}
               onChange={(compliance_numbers) => updateFormData({ compliance_numbers })}
               disabled={isSaving}
               contactType={formData.type}
             />

             <ContactPersonsSection
               value={formData.contact_persons}
               onChange={(contact_persons) => updateFormData({ contact_persons })}
               disabled={isSaving}
               contactType={formData.type}
             />
           </>
         )}

         {/* Notes */}
         <div 
           className="rounded-lg shadow-sm border p-6 transition-colors"
           style={{
             backgroundColor: colors.utility.secondaryBackground,
             borderColor: colors.utility.primaryText + '20'
           }}
         >
           <h2 
             className="text-lg font-semibold mb-4 transition-colors"
             style={{ color: colors.utility.primaryText }}
           >
             Notes
           </h2>
           <textarea
             value={formData.notes || ''}
             onChange={(e) => updateFormData({ notes: e.target.value })}
             disabled={isSaving}
             placeholder={PLACEHOLDER_TEXTS.NOTES}
             rows={4}
             className="w-full p-3 border rounded-md resize-none disabled:opacity-50 transition-colors"
             style={{
               backgroundColor: colors.utility.primaryBackground,
               borderColor: colors.utility.primaryText + '40',
               color: colors.utility.primaryText
             }}
           />
         </div>
       </div>

       {/* Right Sidebar (1/4 width) */}
       <div className="xl:col-span-1 space-y-6">
         {/* User Status Info */}
         <div 
           className="rounded-lg shadow-sm border p-4 transition-colors"
           style={{
             backgroundColor: colors.brand.primary + '10',
             borderColor: colors.brand.primary + '40'
           }}
         >
           <div className="text-center">
             <div className="text-2xl mb-2">{userStatusInfo.icon}</div>
             <p 
               className="text-sm mb-3"
               style={{ color: colors.brand.primary }}
             >
               {isEditMode ? 'Contact Status' : 'New Contact'}
             </p>
             <p 
               className="text-xs mb-3"
               style={{ color: colors.brand.primary }}
             >
               {isEditMode ? userStatusInfo.text : 'User account will be created after saving'}
             </p>
             {isEditMode && (
               <button
                 className="w-full flex items-center justify-center px-4 py-2 rounded-md transition-colors text-sm font-medium"
                 style={{
                   backgroundColor: colors.brand.primary,
                   color: '#ffffff'
                 }}
               >
                 <Send className="mr-2 h-4 w-4" />
                 {userStatusInfo.action}
               </button>
             )}
           </div>
         </div>

         {/* Contact Classification */}
         <ContactClassificationSelector
           value={formData.classifications}
           onChange={(classifications) => updateFormData({ classifications })}
           disabled={isSaving}
           industry={currentIndustry}
         />

         {/* Contact Status */}
         <ContactStatusSection
           status={formData.status}
           onChange={(status) => updateFormData({ status })}
           disabled={isSaving}
           isEditMode={isEditMode}
           contactId={contactId || id}
         />
       </div>
     </div>

     {/* Cancel Confirmation Dialog */}
     <ConfirmationDialog
       isOpen={showCancelDialog}
       onClose={() => setShowCancelDialog(false)}
       onConfirm={() => {
         setShowCancelDialog(false);
         if (onCancel) {
           onCancel();
         } else {
           navigate('/contacts');
         }
       }}
       title="Unsaved Changes"
       description="You have unsaved changes. Are you sure you want to leave?"
       confirmText="Leave"
       cancelText="Stay"
       type="warning"
     />

     {/* Duplicate Contacts Dialog */}
     <ConfirmationDialog
       isOpen={showDuplicateDialog}
       onClose={() => setShowDuplicateDialog(false)}
       onConfirm={async () => {
         setShowDuplicateDialog(false);
         setShowFullPageLoader(true);
         try {
           // Transform data before creating with duplicates
           const transformedData = {
             ...formData,
             classifications: formData.classifications.map(c => 
               typeof c === 'object' && c.classification_value ? c.classification_value : c
             ),
             addresses: formData.addresses.map(addr => ({
               ...addr,
               type: addr.address_type || addr.type,
               id: addr.id?.startsWith('temp_') ? undefined : addr.id
             })),
             contact_channels: formData.contact_channels.map(channel => ({
               ...channel,
               id: channel.id?.startsWith('temp_') ? undefined : channel.id
             }))
           };
           
           // FIXED: Include environment and user data when forcing creation
           const contactData: CreateContactRequest = {
             ...transformedData,
             name: transformedData.type === 'individual' ? transformedData.name! : undefined,
             company_name: transformedData.type === 'corporate' ? transformedData.company_name! : undefined,
             tenant_id: currentTenant?.id,
             is_live: isLive,  // CRITICAL: Include environment
             created_by: user?.id || null,
             t_userprofile_id: null,
             auth_user_id: null,
             force_create: true  // Force creation despite duplicates
           };
           
           const result = await createContactHook.mutate(contactData);
           
           toast({
             title: "Success!",
             description: "Contact created successfully",
             duration: 3000
           });
           
           setHasUnsavedChanges(false);
           
           setTimeout(() => {
             navigate(`/contacts/${result.id}`);
           }, 500);
         } catch (error) {
           setShowFullPageLoader(false);
           captureException(error, {
             tags: { component: 'ContactCreateForm', action: 'createContactWithDuplicates' },
             extra: { 
               contactData: formData, 
               tenantId: currentTenant?.id,
               environment: isLive ? 'live' : 'test'
             }
           });
         }
       }}
       title="Potential Duplicates Found"
       description={`Found ${duplicateContacts.length} potential duplicate contact(s). Do you want to continue creating this contact?`}
       confirmText="Create Anyway"
       cancelText="Review Duplicates"
       type="warning"
       icon={<AlertTriangle className="h-6 w-6" />}
     />

     {/* Video Help Modal */}
     {showVideoHelp && (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
         <div 
           className="rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden transition-colors"
           style={{ backgroundColor: colors.utility.secondaryBackground }}
         >
           <div 
             className="p-6 border-b transition-colors"
             style={{ borderColor: colors.utility.primaryText + '20' }}
           >
             <div className="flex items-center justify-between">
               <h2 
                 className="text-xl font-semibold transition-colors"
                 style={{ color: colors.utility.primaryText }}
               >
                 Contact Management Help
               </h2>
               <button
                 onClick={() => setShowVideoHelp(false)}
                 className="p-2 hover:opacity-80 rounded-md transition-colors"
                 style={{ color: colors.utility.secondaryText }}
               >
                 ×
               </button>
             </div>
           </div>
           <div className="p-6">
             <div className="space-y-4">
               <div 
                 className="p-4 rounded-lg transition-colors"
                 style={{ backgroundColor: colors.utility.secondaryText + '10' }}
               >
                 <h3 
                   className="font-medium mb-2 transition-colors"
                   style={{ color: colors.utility.primaryText }}
                 >
                   📹 Getting Started with Contacts
                 </h3>
                 <p 
                   className="text-sm transition-colors"
                   style={{ color: colors.utility.secondaryText }}
                 >
                   Learn how to add, organize, and manage your business contacts effectively.
                 </p>
               </div>
               <div 
                 className="p-4 rounded-lg transition-colors"
                 style={{ backgroundColor: colors.utility.secondaryText + '10' }}
               >
                 <h3 
                   className="font-medium mb-2 transition-colors"
                   style={{ color: colors.utility.primaryText }}
                 >
                   📹 Contact Classifications & Filtering
                 </h3>
                 <p 
                   className="text-sm transition-colors"
                   style={{ color: colors.utility.secondaryText }}
                 >
                   Understanding how to categorize contacts and use advanced filtering options.
                 </p>
               </div>
               <div 
                 className="p-4 rounded-lg transition-colors"
                 style={{ backgroundColor: colors.utility.secondaryText + '10' }}
               >
                 <h3 
                   className="font-medium mb-2 transition-colors"
                   style={{ color: colors.utility.primaryText }}
                 >
                   📹 Search & Discovery
                 </h3>
                 <p 
                   className="text-sm transition-colors"
                   style={{ color: colors.utility.secondaryText }}
                 >
                   Master the search functionality to quickly find the contacts you need.
                 </p>
               </div>
             </div>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default ContactCreateForm;
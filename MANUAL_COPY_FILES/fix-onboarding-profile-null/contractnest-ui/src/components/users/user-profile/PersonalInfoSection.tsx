// src/components/users/user-profile/PersonalInfoSection.tsx
// This combines Personal Info + Avatar into one cohesive section

import React, { useState, useEffect, useRef } from 'react';
import { User, Copy, Check, Mail, Phone, Hash, Edit2, Save, X, Camera, Upload, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useStorageManagement } from '@/hooks/useStorageManagement';
import { countries } from '@/utils/constants/countries';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ProfileInfoSectionProps {
  profile: any;
  onUpdate: (data: any) => Promise<boolean>;
  onUpdateAvatar: (avatarUrl: string) => Promise<boolean>;
  onRemoveAvatar: () => Promise<boolean>;
  onValidateMobile: (mobile: string, countryCode: string) => Promise<boolean>;
  updating: boolean;
  initialEditMode?: boolean; // Start in edit mode (useful for onboarding)
}

const ProfileInfoSection: React.FC<ProfileInfoSectionProps> = ({
  profile,
  onUpdate,
  onUpdateAvatar,
  onRemoveAvatar,
  onValidateMobile,
  updating,
  initialEditMode = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { uploadFile, isSubmitting } = useStorageManagement();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    country_code: '+91',
    mobile_number: ''
  });
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        country_code: profile.country_code || '+91',
        mobile_number: profile.mobile_number || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'mobile_number') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (formData.mobile_number && formData.mobile_number.length !== 10) {
      newErrors.mobile_number = 'Mobile number must be 10 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // Skip separate mobile validation - profile update API handles duplicate checks
    const success = await onUpdate(formData);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      country_code: profile?.country_code || '+91',
      mobile_number: profile?.mobile_number || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const copyUserCode = () => {
    if (profile?.user_code) {
      navigator.clipboard.writeText(profile.user_code);
      setCopied(true);
      toast.success('User code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const allowedFormats = ['image/jpeg', 'image/png', 'image/gif'];
    const maxFileSize = 2 * 1024 * 1024;

    if (!allowedFormats.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > maxFileSize) {
      toast.error(`Image size must be less than 2MB`);
      return;
    }

    try {
      setUploadProgress(20);
      const uploadedFile = await uploadFile(file, 'contact_photos', {
        user_id: profile.user_id || profile.id,
        type: 'profile_picture'
      });
      
      setUploadProgress(60);
      if (uploadedFile && uploadedFile.download_url) {
        setUploadProgress(80);
        const success = await onUpdateAvatar(uploadedFile.download_url);
        if (success) {
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(0), 1000);
        } else {
          setUploadProgress(0);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setUploadProgress(0);
    }
  };

  const formatMobile = (mobile: string) => {
    if (!mobile || mobile.length !== 10) return mobile;
    return `${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  };

  return (
    <div className="space-y-4">
      {/* User Code Card */}
      <div 
        className="border rounded-lg p-4"
        style={{
          backgroundColor: colors.brand.primary + '10',
          borderColor: colors.brand.primary + '30'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Hash className="mr-3 h-5 w-5" style={{ color: colors.brand.primary }} />
            <div>
              <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                Your Invite Code
              </p>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                Share this code with friends and peers to invite them to your workspace
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <code 
              className="px-3 py-1.5 rounded font-mono text-lg font-semibold"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.brand.primary
              }}
            >
              {profile?.user_code || 'N/A'}
            </code>
            <button
              onClick={copyUserCode}
              className="p-2 rounded hover:opacity-80 transition-colors"
              style={{ backgroundColor: colors.utility.secondaryBackground }}
            >
              {copied ? (
                <Check className="h-4 w-4" style={{ color: colors.semantic.success }} />
              ) : (
                <Copy className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Combined Profile & Avatar Card */}
      <div 
        className="border rounded-lg p-6"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <User className="mr-3" style={{ color: colors.brand.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
              Profile Information
            </h2>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Avatar and Basic Info Side by Side */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4"
                  style={{ borderColor: colors.brand.primary + '30' }}
                />
              ) : (
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center border-4"
                  style={{ 
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <User size={48} style={{ color: colors.utility.secondaryText }} />
                </div>
              )}
              
              {uploadProgress > 0 && (
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex flex-col items-center justify-center">
                  <div className="text-white text-sm font-medium">{uploadProgress}%</div>
                  <div className="w-20 h-2 bg-gray-300 rounded-full mt-2">
                    <div 
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress > 0}
                className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff'
                }}
              >
                <Upload className="inline mr-1 h-3 w-3" />
                Upload
              </button>
              {profile?.avatar_url && (
                <button
                  onClick={() => {
                    if (confirm('Remove profile picture?')) {
                      onRemoveAvatar();
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded-md font-medium border transition-colors hover:opacity-80"
                  style={{
                    borderColor: colors.semantic.error,
                    color: colors.semantic.error
                  }}
                >
                  <Trash2 className="inline h-3 w-3" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-4">
            {/* Email - Always Read Only */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                Email Address
              </label>
              <div className="relative">
                <Mail 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                  style={{ color: colors.utility.secondaryText }}
                />
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full pl-10 pr-3 py-2 border rounded-md cursor-not-allowed opacity-60"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: colors.utility.primaryText + '20',
                    color: colors.utility.secondaryText
                  }}
                />
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  disabled={!isEditing}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md transition-colors",
                    errors.first_name && "border-red-500",
                    !isEditing && "cursor-not-allowed opacity-60"
                  )}
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: errors.first_name ? colors.semantic.error : colors.utility.primaryText + '20',
                    color: colors.utility.primaryText
                  }}
                />
                {errors.first_name && (
                  <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>
                    {errors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  disabled={!isEditing}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md transition-colors",
                    errors.last_name && "border-red-500",
                    !isEditing && "cursor-not-allowed opacity-60"
                  )}
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: errors.last_name ? colors.semantic.error : colors.utility.primaryText + '20',
                    color: colors.utility.primaryText
                  }}
                />
                {errors.last_name && (
                  <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>
                    {errors.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.country_code}
                  onChange={(e) => handleInputChange('country_code', e.target.value)}
                  disabled={!isEditing}
                  className={cn(
                    "w-32 px-3 py-2 border rounded-md",
                    !isEditing && "cursor-not-allowed opacity-60"
                  )}
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: colors.utility.primaryText + '20',
                    color: colors.utility.primaryText
                  }}
                >
                  {countries.map(country => (
                    <option key={country.code} value={`+${country.phoneCode}`}>
                      {country.code} +{country.phoneCode}
                    </option>
                  ))}
                </select>
                <div className="flex-1 relative">
                  <Phone 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    type="text"
                    value={isEditing ? formData.mobile_number : formatMobile(formData.mobile_number)}
                    onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                    disabled={!isEditing}
                    placeholder="XXXXX XXXXX"
                    className={cn(
                      "w-full pl-10 pr-3 py-2 border rounded-md transition-colors",
                      errors.mobile_number && "border-red-500",
                      !isEditing && "cursor-not-allowed opacity-60"
                    )}
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: errors.mobile_number ? colors.semantic.error : colors.utility.primaryText + '20',
                      color: colors.utility.primaryText
                    }}
                  />
                </div>
              </div>
              {errors.mobile_number && (
                <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>
                  {errors.mobile_number}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: colors.utility.primaryText + '20' }}>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-md font-medium border transition-colors hover:opacity-80"
              style={{
                borderColor: colors.utility.primaryText + '30',
                color: colors.utility.primaryText,
                backgroundColor: 'transparent'
              }}
            >
              <X className="mr-2 h-4 w-4 inline" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updating}
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-colors flex items-center",
                updating && "opacity-50 cursor-not-allowed"
              )}
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileInfoSection;
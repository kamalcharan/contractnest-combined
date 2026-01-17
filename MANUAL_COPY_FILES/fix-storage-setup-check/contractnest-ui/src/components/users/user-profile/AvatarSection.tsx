// src/components/users/user-profile/AvatarSection.tsx
import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useStorageManagement } from '@/hooks/useStorageManagement';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface AvatarSectionProps {
  profile: any;
  onUpdateAvatar: (avatarUrl: string) => Promise<boolean>;
  onRemoveAvatar: () => Promise<boolean>;
  updating: boolean;
}

const AvatarSection: React.FC<AvatarSectionProps> = ({
  profile,
  onUpdateAvatar,
  onRemoveAvatar,
  updating
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { uploadFile, isSubmitting, storageSetupComplete, isLoading: isStorageLoading } = useStorageManagement();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxFileSize = 2 * 1024 * 1024; // 2MB - Fixed from 5MB

  const handleFileSelect = async (file: File) => {
    // Check if storage is set up
    if (!storageSetupComplete) {
      toast.error('Storage is not set up. Please configure storage in Settings → Storage Management.');
      return;
    }

    console.log('Selected file:', {
      name: file.name,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type
    });

    // Validate file type
    if (!allowedFormats.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeInMB = (maxFileSize / (1024 * 1024)).toFixed(0);
      toast.error(`Image size (${sizeInMB}MB) exceeds the maximum limit of ${maxSizeInMB}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    try {
      setUploadProgress(20);
      
      // Upload to storage - use 'avatar' as category if 'avatars' doesn't exist
      const uploadedFile = await uploadFile(file, 'contact_photos', {
        user_id: profile.user_id || profile.id,
        type: 'profile_picture'
      });
      
      setUploadProgress(60);
      
      if (uploadedFile && uploadedFile.download_url) {
        // Update profile with new avatar URL
        setUploadProgress(80);
        const success = await onUpdateAvatar(uploadedFile.download_url);
        
        if (success) {
          setUploadProgress(100);
          toast.success('Profile picture updated successfully');
          setPreviewUrl(null);
          setTimeout(() => setUploadProgress(0), 1000);
        } else {
          toast.error('Failed to update profile picture');
          setUploadProgress(0);
        }
      } else {
        toast.error('Upload succeeded but no URL was returned');
        setUploadProgress(0);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || 'Failed to upload image';
      toast.error(errorMessage);
      setUploadProgress(0);
      setPreviewUrl(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    const success = await onRemoveAvatar();
    if (success) {
      toast.success('Profile picture removed');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Check if storage is set up
    if (!storageSetupComplete) {
      toast.error('Storage is not set up. Please configure storage in Settings → Storage Management.');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const currentAvatar = previewUrl || profile?.avatar_url;
  const isUploading = uploadProgress > 0 || isSubmitting;

  return (
    <div 
      className="border rounded-lg p-6"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20'
      }}
    >
      <div className="flex items-center mb-6">
        <Camera className="mr-3" style={{ color: colors.brand.primary }} />
        <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
          Profile Picture
        </h2>
      </div>

      <div className="space-y-6">
        {/* Current Avatar Display */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            {currentAvatar ? (
              <img
                src={currentAvatar}
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
                <div className="text-white text-sm font-medium">
                  {uploadProgress}%
                </div>
                <div className="w-20 h-2 bg-gray-300 rounded-full mt-2">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-medium mb-1" style={{ color: colors.utility.primaryText }}>
              {profile?.first_name} {profile?.last_name}
            </h3>
            <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
              {profile?.email}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!storageSetupComplete) {
                    toast.error('Storage is not set up. Please configure storage in Settings → Storage Management.');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={isUploading || updating || isStorageLoading}
                title={!storageSetupComplete ? 'Storage not configured' : 'Upload new profile picture'}
                className={cn(
                  "px-4 py-2 rounded-md font-medium flex items-center transition-colors",
                  (isUploading || updating) && "opacity-50 cursor-not-allowed",
                  !storageSetupComplete && "opacity-70 cursor-not-allowed"
                )}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff'
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload New'}
              </button>
              
              {profile?.avatar_url && !isUploading && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={updating}
                  className={cn(
                    "px-4 py-2 rounded-md font-medium flex items-center transition-colors border",
                    updating && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    borderColor: colors.semantic.error,
                    color: colors.semantic.error,
                    backgroundColor: 'transparent'
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging && "border-opacity-100",
            isUploading && "opacity-50 pointer-events-none"
          )}
          style={{
            borderColor: isDragging ? colors.brand.primary : colors.utility.primaryText + '30',
            backgroundColor: isDragging ? colors.brand.primary + '10' : 'transparent'
          }}
        >
          <Camera 
            className="mx-auto mb-4 h-12 w-12" 
            style={{ color: colors.utility.secondaryText }}
          />
          <p className="font-medium mb-2" style={{ color: colors.utility.primaryText }}>
            Drag and drop your image here
          </p>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            or click to browse
          </p>
          <button
            onClick={() => {
              if (!storageSetupComplete) {
                toast.error('Storage is not set up. Please configure storage in Settings → Storage Management.');
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={isUploading || isStorageLoading}
            title={!storageSetupComplete ? 'Storage not configured' : 'Choose a file to upload'}
            className={cn(
              "px-4 py-2 rounded-md border transition-colors",
              !storageSetupComplete ? "opacity-70 cursor-not-allowed" : "hover:opacity-80"
            )}
            style={{
              borderColor: colors.utility.primaryText + '30',
              color: colors.utility.primaryText,
              backgroundColor: colors.utility.primaryBackground
            }}
          >
            Choose File
          </button>
        </div>

        {/* File Requirements */}
        <div 
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
            Image Requirements:
          </h4>
          <ul className="text-sm space-y-1" style={{ color: colors.utility.secondaryText }}>
            <li>• Maximum file size: 2MB</li>
            <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
            <li>• Recommended dimensions: 400x400 pixels</li>
            <li>• Square images work best</li>
          </ul>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = ''; // Reset input
        }}
        className="hidden"
      />
    </div>
  );
};

export default AvatarSection;
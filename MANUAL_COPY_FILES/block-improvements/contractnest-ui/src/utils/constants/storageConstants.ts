// src/utils/storageConstants.ts

export interface StorageCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  allowedTypes: string[];
  maxFileSize: number; // in bytes
}

// Maximum file size in bytes - 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Default storage quota in MB
export const DEFAULT_STORAGE_QUOTA = 40;

// Storage category definitions
export const STORAGE_CATEGORIES: StorageCategory[] = [
  {
    id: 'contact_photos',
    name: 'Contact Photos',
    description: 'Profile pictures and images of contacts',
    icon: 'UserCircle',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    maxFileSize: MAX_FILE_SIZE
  },
  {
    id: 'contract_media',
    name: 'Contract Media',
    description: 'Media files related to contracts',
    icon: 'FileContract',
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxFileSize: MAX_FILE_SIZE
  },
  {
    id: 'service_images',
    name: 'Service Images',
    description: 'Images for services and products',
    icon: 'Image',
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
    maxFileSize: MAX_FILE_SIZE
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'General document storage',
    icon: 'File',
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    maxFileSize: MAX_FILE_SIZE
  },
  {
    id: 'block_icons',
    name: 'Block Icons',
    description: 'Custom icons for catalog blocks',
    icon: 'Palette',
    allowedTypes: ['image/png', 'image/svg+xml', 'image/jpeg'],
    maxFileSize: 512 * 1024  // 512KB limit for icons
  },
  {
    id: 'block_videos',
    name: 'Block Videos',
    description: 'Video content for video blocks',
    icon: 'Video',
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxFileSize: 100 * 1024 * 1024  // 100MB limit for videos
  },
  {
    id: 'block_images',
    name: 'Block Images',
    description: 'Images for image blocks',
    icon: 'Image',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSize: MAX_FILE_SIZE
  }
];

// File type display names
export const FILE_TYPE_NAMES: Record<string, string> = {
  'pdf': 'PDF',
  'doc': 'DOC',
  'docx': 'DOCX',
  'jpg': 'JPG',
  'jpeg': 'JPEG',
  'png': 'PNG',
  'gif': 'GIF',
  'svg': 'SVG',
  'txt': 'TXT',
  'mp4': 'MP4'
};

// File type icons (Lucide icon names)
export const FILE_TYPE_ICONS: Record<string, string> = {
  'pdf': 'FileText',
  'doc': 'FileText',
  'docx': 'FileText',
  'jpg': 'Image',
  'jpeg': 'Image',
  'png': 'Image',
  'gif': 'Image',
  'svg': 'Image',
  'txt': 'File',
  'mp4': 'Video'
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension from filename
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

// Check if file type is allowed in a category
export const isFileTypeAllowed = (fileType: string, categoryId: string): boolean => {
  const category = STORAGE_CATEGORIES.find(cat => cat.id === categoryId);
  return category ? category.allowedTypes.includes(fileType) : false;
};

// Check if file size is within limits
export const isFileSizeAllowed = (fileSize: number, categoryId: string): boolean => {
  const category = STORAGE_CATEGORIES.find(cat => cat.id === categoryId);
  return category ? fileSize <= category.maxFileSize : false;
};

// Get readable allowed file type list
export const getAllowedFileTypesText = (categoryId: string): string => {
  const category = STORAGE_CATEGORIES.find(cat => cat.id === categoryId);
  if (!category) return '';
  
  const types = category.allowedTypes.map(type => {
    const extension = type.split('/')[1].toUpperCase();
    return extension;
  });
  
  return types.join(', ');
};
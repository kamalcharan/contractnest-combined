// src/utils/constants/blockValidation.ts
// Centralized validation constants for Block fields
// These align with database column constraints

/**
 * Field length limits for Block data
 * Based on typical PostgreSQL varchar/text column limits
 */
export const BLOCK_FIELD_LIMITS = {
  // Basic Info
  name: {
    min: 1,
    max: 255,
    label: 'Block Name',
  },
  description: {
    min: 0,
    max: 2000,
    label: 'Description',
  },
  tags: {
    maxCount: 20,
    maxLength: 50,
    label: 'Tags',
  },

  // Service/Spare specific
  sku: {
    min: 1,
    max: 50,
    label: 'SKU',
  },
  terms: {
    min: 0,
    max: 1000,
    label: 'Terms & Conditions',
  },

  // Media blocks
  mediaUrl: {
    max: 2000,
    label: 'Media URL',
  },
  thumbnailUrl: {
    max: 2000,
    label: 'Thumbnail URL',
  },
  altText: {
    max: 255,
    label: 'Alt Text',
  },
  caption: {
    max: 500,
    label: 'Caption',
  },
  duration: {
    max: 10,
    label: 'Duration',
  },

  // Text/Content blocks
  content: {
    max: 10000,
    label: 'Content',
  },

  // Checklist blocks
  checklistItem: {
    max: 500,
    label: 'Checklist Item',
  },
  checklistMaxItems: 50,

  // Document blocks
  documentTitle: {
    max: 255,
    label: 'Document Title',
  },
  documentDescription: {
    max: 500,
    label: 'Document Description',
  },

  // Business Rules
  warrantyTerms: {
    max: 1000,
    label: 'Warranty Terms',
  },
  customTerms: {
    max: 1000,
    label: 'Custom Terms',
  },
} as const;

/**
 * Helper function to get character count display
 */
export const getCharCountDisplay = (
  currentLength: number,
  maxLength: number
): { text: string; isWarning: boolean; isError: boolean } => {
  const remaining = maxLength - currentLength;
  const percentUsed = (currentLength / maxLength) * 100;

  return {
    text: `${currentLength}/${maxLength}`,
    isWarning: percentUsed >= 80 && percentUsed < 100,
    isError: currentLength > maxLength,
  };
};

/**
 * Validate a field value against its limits
 */
export const validateFieldLength = (
  value: string | undefined | null,
  fieldKey: keyof typeof BLOCK_FIELD_LIMITS
): { isValid: boolean; error?: string } => {
  const field = BLOCK_FIELD_LIMITS[fieldKey];
  const length = (value || '').length;

  if ('min' in field && length < field.min) {
    return {
      isValid: false,
      error: `${field.label} must be at least ${field.min} characters`,
    };
  }

  if (length > field.max) {
    return {
      isValid: false,
      error: `${field.label} must be ${field.max} characters or less`,
    };
  }

  return { isValid: true };
};

/**
 * Validate all block fields at once
 */
export const validateBlockFields = (
  formData: Record<string, unknown>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Validate name
  if (typeof formData.name === 'string') {
    const nameValidation = validateFieldLength(formData.name, 'name');
    if (!nameValidation.isValid && nameValidation.error) {
      errors.name = nameValidation.error;
    }
  }

  // Validate description
  if (typeof formData.description === 'string') {
    const descValidation = validateFieldLength(formData.description, 'description');
    if (!descValidation.isValid && descValidation.error) {
      errors.description = descValidation.error;
    }
  }

  // Validate content
  if (typeof formData.content === 'string') {
    const contentValidation = validateFieldLength(formData.content, 'content');
    if (!contentValidation.isValid && contentValidation.error) {
      errors.content = contentValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default BLOCK_FIELD_LIMITS;

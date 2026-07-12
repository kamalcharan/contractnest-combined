// src/utils/validation.ts
export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isValidPhone = (value: string): boolean => {
  const digits = value.replace(/[\s\-()]/g, '');
  return /^\+?\d{7,15}$/.test(digits);
};

export const isValidUrl = (value: string): boolean =>
  /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value.trim());

export function validateChannelValue(channelType: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Required';
  switch (channelType) {
    case 'email':
      return isValidEmail(trimmed) ? null : 'Invalid email address';
    case 'mobile':
    case 'whatsapp':
      return isValidPhone(trimmed) ? null : 'Invalid phone number';
    case 'website':
      return isValidUrl(trimmed) ? null : 'Invalid URL';
    default:
      return null;
  }
}

export function validatePersonName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 50) return 'Name must be at most 50 characters';
  if (!/^[A-Za-z\s\-'.]+$/.test(trimmed)) return "Only letters, spaces, - ' . allowed";
  return null;
}

export function validateCompanyName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Company name must be at least 2 characters';
  if (trimmed.length > 100) return 'Company name must be at most 100 characters';
  return null;
}

// src/utils/catalog-studio/htmlUtils.ts
// Utilities for handling HTML content in descriptions

/**
 * Strip HTML tags from a string
 * Use this when you need plain text (e.g., for cards, previews)
 */
export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';

  // Create a temporary div to parse HTML
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Fallback for SSR - regex-based stripping
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Decode &amp;
    .replace(/&lt;/g, '<')   // Decode &lt;
    .replace(/&gt;/g, '>')   // Decode &gt;
    .replace(/&quot;/g, '"') // Decode &quot;
    .replace(/&#39;/g, "'")  // Decode &#39;
    .trim();
};

/**
 * Basic HTML sanitization - removes dangerous tags and attributes
 * For production, consider using DOMPurify: npm install dompurify @types/dompurify
 */
export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html) return '';

  // List of allowed tags (safe for display)
  const allowedTags = [
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'code', 'pre',
  ];

  // List of dangerous tags to remove completely (with content)
  const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'];

  let sanitized = html;

  // Remove dangerous tags and their content
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing variants
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*\\/?>`, 'gi'), '');
  });

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URLs (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, '');

  return sanitized;
};

/**
 * Truncate HTML-stripped text to a maximum length
 * Useful for card descriptions
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Get a preview of HTML content (stripped and truncated)
 * Useful for block cards
 */
export const getHtmlPreview = (html: string | undefined | null, maxLength: number = 100): string => {
  return truncateText(stripHtml(html), maxLength);
};

/**
 * Check if a string contains HTML tags
 */
export const containsHtml = (str: string | undefined | null): boolean => {
  if (!str) return false;
  return /<[^>]+>/g.test(str);
};

/**
 * Convert plain text to HTML paragraphs
 * Useful when saving plain text that should be displayed as HTML
 */
export const textToHtml = (text: string | undefined | null): string => {
  if (!text) return '';

  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map(p => {
      // Replace single newlines with <br>
      const withBreaks = p.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('');
};

export default {
  stripHtml,
  sanitizeHtml,
  truncateText,
  getHtmlPreview,
  containsHtml,
  textToHtml,
};

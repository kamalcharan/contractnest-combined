// src/components/catalog-studio/SafeHtml.tsx
// Safe HTML rendering component for descriptions

import React from 'react';
import { sanitizeHtml, stripHtml } from '../../utils/catalog-studio/htmlUtils';

interface SafeHtmlProps {
  html: string | undefined | null;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'span' | 'p';
  stripTags?: boolean;
  maxLength?: number;
}

/**
 * SafeHtml - Safely render HTML content
 *
 * Features:
 * - Sanitizes HTML to remove dangerous tags/attributes
 * - Can optionally strip all HTML tags
 * - Can truncate content
 *
 * Usage:
 * <SafeHtml html={description} />
 * <SafeHtml html={description} stripTags maxLength={100} />
 */
const SafeHtml: React.FC<SafeHtmlProps> = ({
  html,
  className,
  style,
  as: Tag = 'div',
  stripTags = false,
  maxLength,
}) => {
  if (!html) {
    return null;
  }

  // If stripTags is true, render as plain text
  if (stripTags) {
    let text = stripHtml(html);
    if (maxLength && text.length > maxLength) {
      text = text.substring(0, maxLength).trim() + '...';
    }
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  // Sanitize and render as HTML
  const sanitized = sanitizeHtml(html);

  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

export default SafeHtml;

// Also export a simple hook for getting safe HTML
export const useSafeHtml = (html: string | undefined | null) => {
  if (!html) return '';
  return sanitizeHtml(html);
};

// Export stripped text getter
export const useStrippedText = (html: string | undefined | null, maxLength?: number) => {
  if (!html) return '';
  let text = stripHtml(html);
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + '...';
  }
  return text;
};

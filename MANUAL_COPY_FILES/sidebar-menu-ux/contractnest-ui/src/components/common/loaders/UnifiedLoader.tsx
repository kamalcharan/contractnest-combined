// src/components/common/loaders/UnifiedLoader.tsx
import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

interface SkeletonRowProps {
  /** Width variant for the skeleton row */
  width?: 'full' | '3/4' | '2/3' | '1/2' | '1/3' | '1/4';
}

interface ContentSkeletonProps {
  /** Number of skeleton rows to show */
  rows?: number;
  /** Show avatar/icon placeholder */
  showAvatar?: boolean;
  /** Layout variant */
  variant?: 'list' | 'card' | 'table';
  /** Number of items for card/list variant */
  count?: number;
}

interface VaNiLoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message below loader */
  message?: string;
  /** Whether to show full screen */
  fullScreen?: boolean;
}

interface PageLoaderProps {
  /** Loading message */
  message?: string;
  /** Loader style */
  variant?: 'spinner' | 'vani' | 'dots';
}

interface InlineLoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md';
  /** Optional text */
  text?: string;
}

// ============================================================================
// SKELETON COMPONENTS (Theme-aware)
// ============================================================================

/**
 * Single skeleton row with pulse animation
 */
export const SkeletonRow: React.FC<SkeletonRowProps> = ({ width = 'full' }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const widthClasses: Record<string, string> = {
    'full': 'w-full',
    '3/4': 'w-3/4',
    '2/3': 'w-2/3',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  };

  return (
    <div
      className={`h-2 rounded ${widthClasses[width]}`}
      style={{ backgroundColor: `${colors.utility.secondaryText}30` }}
    />
  );
};

/**
 * Content skeleton - for loading states of lists, cards, tables
 */
export const ContentSkeleton: React.FC<ContentSkeletonProps> = ({
  rows = 3,
  showAvatar = true,
  variant = 'list',
  count = 3,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const skeletonBg = `${colors.utility.secondaryText}20`;
  const cardBg = colors.utility.secondaryBackground;
  const borderColor = `${colors.utility.primaryText}10`;

  // Single skeleton item
  const SkeletonItem = () => (
    <div
      className="flex items-center space-x-4 p-4 rounded-2xl border transition-colors"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      {showAvatar && (
        <div
          className="rounded-xl h-12 w-12 flex-shrink-0"
          style={{ backgroundColor: skeletonBg }}
        />
      )}
      <div className="flex-1 space-y-3 py-1">
        <div
          className="h-2 rounded w-1/4"
          style={{ backgroundColor: skeletonBg }}
        />
        <div className="grid grid-cols-3 gap-4">
          <div
            className="h-2 rounded col-span-2"
            style={{ backgroundColor: skeletonBg }}
          />
          <div
            className="h-2 rounded col-span-1"
            style={{ backgroundColor: skeletonBg }}
          />
        </div>
      </div>
    </div>
  );

  // Card variant skeleton
  const CardSkeletonItem = () => (
    <div
      className="p-4 rounded-2xl border transition-colors"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      {showAvatar && (
        <div
          className="rounded-xl h-32 w-full mb-4"
          style={{ backgroundColor: skeletonBg }}
        />
      )}
      <div className="space-y-3">
        <div
          className="h-3 rounded w-3/4"
          style={{ backgroundColor: skeletonBg }}
        />
        <div
          className="h-2 rounded w-1/2"
          style={{ backgroundColor: skeletonBg }}
        />
        <div className="flex gap-2 pt-2">
          <div
            className="h-6 rounded-full w-16"
            style={{ backgroundColor: skeletonBg }}
          />
          <div
            className="h-6 rounded-full w-20"
            style={{ backgroundColor: skeletonBg }}
          />
        </div>
      </div>
    </div>
  );

  // Table variant skeleton
  const TableSkeletonRow = () => (
    <div
      className="flex items-center gap-4 p-4 border-b transition-colors"
      style={{ borderColor: borderColor }}
    >
      {showAvatar && (
        <div
          className="rounded-lg h-8 w-8 flex-shrink-0"
          style={{ backgroundColor: skeletonBg }}
        />
      )}
      <div
        className="h-2 rounded flex-1"
        style={{ backgroundColor: skeletonBg }}
      />
      <div
        className="h-2 rounded w-24"
        style={{ backgroundColor: skeletonBg }}
      />
      <div
        className="h-2 rounded w-16"
        style={{ backgroundColor: skeletonBg }}
      />
      <div
        className="h-6 rounded w-8"
        style={{ backgroundColor: skeletonBg }}
      />
    </div>
  );

  if (variant === 'card') {
    return (
      <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(count)].map((_, i) => (
          <CardSkeletonItem key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className="animate-pulse rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: cardBg,
          borderColor: borderColor,
        }}
      >
        {/* Table header */}
        <div
          className="flex items-center gap-4 p-4 border-b"
          style={{
            borderColor: borderColor,
            backgroundColor: `${colors.utility.primaryText}05`,
          }}
        >
          <div
            className="h-2 rounded w-32"
            style={{ backgroundColor: skeletonBg }}
          />
          <div
            className="h-2 rounded w-24 ml-auto"
            style={{ backgroundColor: skeletonBg }}
          />
          <div
            className="h-2 rounded w-20"
            style={{ backgroundColor: skeletonBg }}
          />
          <div
            className="h-2 rounded w-16"
            style={{ backgroundColor: skeletonBg }}
          />
        </div>
        {/* Table rows */}
        {[...Array(count)].map((_, i) => (
          <TableSkeletonRow key={i} />
        ))}
      </div>
    );
  }

  // Default list variant
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(count)].map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  );
};

// ============================================================================
// VANI LOADER (Branded pulse loader)
// ============================================================================

/**
 * VaNi branded loader with pulse animation
 * Uses theme primary color
 */
export const VaNiLoader: React.FC<VaNiLoaderProps> = ({
  size = 'md',
  message,
  fullScreen = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const sizeClasses = {
    sm: { container: 'w-8 h-8', icon: 14 },
    md: { container: 'w-10 h-10', icon: 18 },
    lg: { container: 'w-14 h-14', icon: 24 },
  };

  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`relative ${sizeClasses[size].container} flex items-center justify-center`}
      >
        {/* Pulse rings */}
        <span
          className="absolute inset-0 rounded-xl animate-vani-pulse"
          style={{ borderColor: colors.brand.primary }}
        />
        <span
          className="absolute inset-0 rounded-xl animate-vani-pulse-delayed"
          style={{ borderColor: colors.brand.primary }}
        />
        {/* Center icon */}
        <Sparkles
          size={sizeClasses[size].icon}
          style={{ color: colors.brand.primary }}
          className="relative z-10"
        />
      </div>
      {message && (
        <p
          className="text-sm font-medium"
          style={{ color: colors.utility.secondaryText }}
        >
          {message}
        </p>
      )}

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes vani-pulse {
          0% { transform: scale(0.5); opacity: 1; border-width: 3px; border-style: solid; }
          100% { transform: scale(1.5); opacity: 0; border-width: 3px; border-style: solid; }
        }
        .animate-vani-pulse {
          animation: vani-pulse 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        .animate-vani-pulse-delayed {
          animation: vani-pulse 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

// ============================================================================
// PAGE LOADER
// ============================================================================

/**
 * Full page loading state
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Loading...',
  variant = 'vani',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="text-center">
        {variant === 'vani' && <VaNiLoader size="lg" message={message} />}

        {variant === 'spinner' && (
          <>
            <div
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{
                borderColor: colors.brand.primary,
                borderTopColor: 'transparent',
              }}
            />
            <p style={{ color: colors.utility.secondaryText }}>{message}</p>
          </>
        )}

        {variant === 'dots' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full animate-bounce"
                  style={{
                    backgroundColor: colors.brand.primary,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <p style={{ color: colors.utility.secondaryText }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// INLINE LOADER (For buttons, small areas)
// ============================================================================

/**
 * Inline loader for buttons or small areas
 */
export const InlineLoader: React.FC<InlineLoaderProps> = ({
  size = 'sm',
  text,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Loader2
        className={`${sizeClasses[size]} animate-spin`}
        style={{ color: 'currentColor' }}
      />
      {text && <span>{text}</span>}
    </span>
  );
};

// ============================================================================
// SECTION LOADER (For partial page loading)
// ============================================================================

interface SectionLoaderProps {
  /** Loading message */
  message?: string;
  /** Height of the section */
  height?: 'sm' | 'md' | 'lg' | 'auto';
  /** Loader variant */
  variant?: 'skeleton' | 'vani' | 'spinner';
  /** Skeleton options (when variant is skeleton) */
  skeletonVariant?: 'list' | 'card' | 'table';
  skeletonCount?: number;
}

/**
 * Section loader for partial page areas
 */
export const SectionLoader: React.FC<SectionLoaderProps> = ({
  message,
  height = 'md',
  variant = 'skeleton',
  skeletonVariant = 'list',
  skeletonCount = 3,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const heightClasses = {
    sm: 'min-h-[200px]',
    md: 'min-h-[400px]',
    lg: 'min-h-[600px]',
    auto: '',
  };

  if (variant === 'skeleton') {
    return (
      <div className={heightClasses[height]}>
        <ContentSkeleton variant={skeletonVariant} count={skeletonCount} />
      </div>
    );
  }

  return (
    <div
      className={`${heightClasses[height]} flex items-center justify-center`}
    >
      {variant === 'vani' ? (
        <VaNiLoader size="md" message={message} />
      ) : (
        <div className="text-center">
          <Loader2
            className="w-8 h-8 animate-spin mx-auto mb-2"
            style={{ color: colors.brand.primary }}
          />
          {message && (
            <p
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT & NAMED EXPORTS
// ============================================================================

const UnifiedLoader = {
  Skeleton: ContentSkeleton,
  VaNi: VaNiLoader,
  Page: PageLoader,
  Inline: InlineLoader,
  Section: SectionLoader,
  SkeletonRow,
};

export default UnifiedLoader;

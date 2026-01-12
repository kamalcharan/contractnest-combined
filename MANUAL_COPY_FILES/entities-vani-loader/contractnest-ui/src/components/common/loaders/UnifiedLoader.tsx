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
  /** Whether to dim the skeleton (used in VaNiLoader) */
  dimmed?: boolean;
}

interface VaNiLoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message below loader */
  message?: string;
  /** Whether to show full screen */
  fullScreen?: boolean;
  /** Show skeleton placeholders below the orb */
  showSkeleton?: boolean;
  /** Skeleton layout variant */
  skeletonVariant?: 'list' | 'card' | 'table';
  /** Number of skeleton items */
  skeletonCount?: number;
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
// CONSTANTS
// ============================================================================

// VaNi orb background - consistent dark color for brand recognition
const VANI_ORB_BG = '#1e293b'; // slate-800

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
  dimmed = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const skeletonBg = `${colors.utility.secondaryText}20`;
  const cardBg = colors.utility.secondaryBackground;
  const borderColor = `${colors.utility.primaryText}10`;

  // Wrapper style for dimmed mode
  const wrapperStyle = dimmed ? { opacity: 0.4 } : {};

  // Single skeleton item
  const SkeletonItem = () => (
    <div
      className="flex items-center space-x-4 p-4 rounded-2xl border transition-colors skeleton-shimmer"
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
      className="p-4 rounded-[24px] border transition-colors skeleton-shimmer"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={wrapperStyle}>
        {[...Array(count)].map((_, i) => (
          <CardSkeletonItem key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: cardBg,
          borderColor: borderColor,
          ...wrapperStyle,
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
    <div className="space-y-4" style={wrapperStyle}>
      {[...Array(count)].map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  );
};

// ============================================================================
// VANI LOADER (Branded hybrid loader with orb + skeletons)
// ============================================================================

/**
 * VaNi branded loader with pulse animation and optional skeleton placeholders
 * Uses theme primary color for pulse ring, consistent dark orb background
 */
export const VaNiLoader: React.FC<VaNiLoaderProps> = ({
  size = 'md',
  message,
  fullScreen = false,
  showSkeleton = false,
  skeletonVariant = 'card',
  skeletonCount = 6,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const sizeConfig = {
    sm: { container: 'w-12 h-12', icon: 18, rounded: 'rounded-[14px]', ringOffset: '-3px', ringRadius: '17px' },
    md: { container: 'w-[60px] h-[60px]', icon: 24, rounded: 'rounded-[20px]', ringOffset: '-4px', ringRadius: '24px' },
    lg: { container: 'w-20 h-20', icon: 32, rounded: 'rounded-[24px]', ringOffset: '-5px', ringRadius: '29px' },
  };

  const config = sizeConfig[size];

  const loaderContent = (
    <div className="flex flex-col items-center justify-center">
      {/* VaNi Orb Container */}
      <div className="vani-thinking-container mb-8">
        {/* Orb with pulse ring */}
        <div
          className={`vani-orb relative ${config.container} ${config.rounded} flex items-center justify-center shadow-lg`}
          style={{
            backgroundColor: VANI_ORB_BG,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          {/* Sparkles Icon */}
          <Sparkles
            size={config.icon}
            style={{ color: colors.brand.primary }}
            className="relative z-10"
          />
          {/* Pulse Ring */}
          <span
            className="vani-pulse-ring absolute"
            style={{
              inset: config.ringOffset,
              borderRadius: config.ringRadius,
              border: `2px solid ${colors.brand.primary}`,
            }}
          />
        </div>

        {/* Message */}
        {message && (
          <p
            className="text-[10px] font-black uppercase tracking-widest mt-6 vani-message-pulse"
            style={{ color: colors.utility.secondaryText }}
          >
            {message}
          </p>
        )}
      </div>

      {/* Dimmed Skeleton Placeholders */}
      {showSkeleton && (
        <div className="w-full max-w-4xl">
          <ContentSkeleton
            variant={skeletonVariant}
            count={skeletonCount}
            dimmed={true}
          />
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes vani-orb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }

        @keyframes vani-message-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .vani-pulse-ring {
          animation: vani-orb-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .vani-message-pulse {
          animation: vani-message-pulse 2s ease-in-out infinite;
        }

        .skeleton-shimmer {
          background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-10"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      {loaderContent}
    </div>
  );
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
  variant = 'vani',
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

  if (variant === 'vani') {
    return (
      <div className={heightClasses[height]}>
        <VaNiLoader
          size="md"
          message={message}
          showSkeleton={true}
          skeletonVariant={skeletonVariant}
          skeletonCount={skeletonCount}
        />
      </div>
    );
  }

  return (
    <div
      className={`${heightClasses[height]} flex items-center justify-center`}
    >
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

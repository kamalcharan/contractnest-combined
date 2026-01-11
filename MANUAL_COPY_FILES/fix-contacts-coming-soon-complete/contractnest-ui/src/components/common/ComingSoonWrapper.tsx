// src/components/common/ComingSoonWrapper.tsx
// Reusable Coming Soon wrapper with password unlock for pre-launch features
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Rocket,
  Clock,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle,
  Users,
  Star,
  TrendingUp,
  ArrowRight,
  LucideIcon
} from 'lucide-react';

// Props for configuring each Coming Soon page
export interface ComingSoonFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean; // For featured/main items
}

export interface ComingSoonWrapperProps {
  children: React.ReactNode;
  pageKey: string; // Unique key for localStorage (e.g., 'contacts', 'contracts')
  title: string;
  subtitle: string;
  heroIcon: LucideIcon;
  features: ComingSoonFeature[];
  floatingIcons?: { Icon: LucideIcon; top?: string; left?: string; right?: string; bottom?: string; delay: string; duration: string }[];
  accentColor?: string; // Optional custom accent color
  ctaText?: string; // Optional CTA button text
  onCtaClick?: () => void; // Optional CTA action
}

// Floating background icons for animation
const defaultFloatingIcons = [
  { Icon: Star, top: '10%', left: '5%', delay: '0s', duration: '20s' },
  { Icon: TrendingUp, top: '20%', right: '8%', delay: '2s', duration: '18s' },
  { Icon: CheckCircle, top: '65%', left: '3%', delay: '4s', duration: '22s' },
  { Icon: Rocket, top: '75%', right: '6%', delay: '1s', duration: '19s' },
  { Icon: Sparkles, top: '40%', left: '7%', delay: '3s', duration: '21s' },
];

const UNLOCK_PASSWORD = 'bharathavarsha';

const ComingSoonWrapper: React.FC<ComingSoonWrapperProps> = ({
  children,
  pageKey,
  title,
  subtitle,
  heroIcon: HeroIcon,
  features,
  floatingIcons = defaultFloatingIcons,
  accentColor,
  ctaText,
  onCtaClick
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const accent = accentColor || colors.brand.primary;

  // State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUnlockPanel, setShowUnlockPanel] = useState(false);
  const [error, setError] = useState('');
  const [unlockAnimation, setUnlockAnimation] = useState(false);

  // Generate per-user storage key - returns null if no authenticated user
  const getStorageKey = (): string | null => {
    // Only create storage key if we have a valid user ID
    if (!user?.id) {
      return null;
    }
    return `comingsoon_unlocked_${user.id}_${pageKey}`;
  };

  // Check localStorage on mount (per-user key) - only after auth is loaded
  useEffect(() => {
    // Wait for auth to finish loading
    if (isAuthLoading) {
      return;
    }

    // Auth loaded - now check unlock status
    const storageKey = getStorageKey();
    if (storageKey) {
      const unlocked = localStorage.getItem(storageKey);
      if (unlocked === 'true') {
        setIsUnlocked(true);
      }
    }
    // If no storageKey (no user), keep isUnlocked as false
  }, [pageKey, user?.id, isAuthLoading]);

  // Handle unlock
  const handleUnlock = () => {
    if (password === UNLOCK_PASSWORD) {
      const storageKey = getStorageKey();
      if (!storageKey) {
        setError('Please log in to unlock this feature');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setUnlockAnimation(true);
      setTimeout(() => {
        localStorage.setItem(storageKey, 'true');
        setIsUnlocked(true);
      }, 600);
    } else {
      setError('Invalid access code');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  // While auth is loading, show loading state
  // This prevents flash of unlocked content before auth loads
  if (isAuthLoading) {
    return (
      <div
        className="h-full min-h-[500px] flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="animate-pulse text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4"
            style={{ backgroundColor: `${accent}20` }}
          />
          <div
            className="h-4 w-32 rounded mx-auto"
            style={{ backgroundColor: `${colors.utility.primaryText}20` }}
          />
        </div>
      </div>
    );
  }

  // If unlocked, show actual content
  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div
      className={`relative h-full min-h-[500px] overflow-auto ${unlockAnimation ? 'animate-unlock' : ''}`}
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          25% { transform: translateY(-15px) rotate(3deg); opacity: 0.1; }
          50% { transform: translateY(-8px) rotate(-2deg); opacity: 0.08; }
          75% { transform: translateY(-20px) rotate(2deg); opacity: 0.12; }
        }
        @keyframes slideUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes hero-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.03); }
        }
        @keyframes unlock-fade {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        .animate-float {
          animation: float var(--duration, 20s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        .animate-slide-up-delay-1 {
          animation: slideUp 0.6s ease-out 0.1s forwards;
          opacity: 0;
        }
        .animate-slide-up-delay-2 {
          animation: slideUp 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-slide-up-delay-3 {
          animation: slideUp 0.6s ease-out 0.3s forwards;
          opacity: 0;
        }
        .animate-slide-up-delay-4 {
          animation: slideUp 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }
        .animate-hero-bounce {
          animation: hero-bounce 3s ease-in-out infinite;
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
        .animate-unlock {
          animation: unlock-fade 0.6s ease-out forwards;
        }
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
        }
        .shimmer-bg {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .feature-card {
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px) scale(1.02);
        }
      `}</style>

      {/* Floating Background Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingIcons.map((item, index) => (
          <div
            key={index}
            className="absolute animate-float"
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              bottom: item.bottom,
              ['--delay' as any]: item.delay,
              ['--duration' as any]: item.duration,
            } as React.CSSProperties}
          >
            <item.Icon
              className="w-10 h-10 md:w-14 md:h-14"
              style={{ color: accent, opacity: 0.08 }}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">

        {/* Limited Access Badge */}
        <div className="text-center mb-8 animate-slide-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              backgroundColor: `${colors.semantic.warning}15`,
              borderColor: `${colors.semantic.warning}40`
            }}
          >
            <Users className="w-4 h-4" style={{ color: colors.semantic.warning }} />
            <span className="text-sm font-medium" style={{ color: colors.semantic.warning }}>
              Limited Early Access
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.semantic.warning,
                color: '#fff'
              }}
            >
              Beta
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10 animate-slide-up-delay-1">
          {/* Hero Icon */}
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 animate-hero-bounce"
            style={{
              background: `linear-gradient(135deg, ${accent}20, ${accent}40)`,
              boxShadow: `0 20px 40px ${accent}20`
            }}
          >
            <HeroIcon className="w-12 h-12" style={{ color: accent }} />
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            {title}
          </h1>

          <p
            className="text-lg max-w-2xl mx-auto mb-6"
            style={{ color: colors.utility.secondaryText }}
          >
            {subtitle}
          </p>

          {/* Pre-launch Message */}
          <div
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl"
            style={{
              backgroundColor: `${accent}10`,
              border: `1px solid ${accent}25`
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: accent }} />
            <p className="text-sm" style={{ color: colors.utility.primaryText }}>
              Currently being explored by limited customers for feedback
            </p>
          </div>
        </div>

        {/* Features Grid - Strong CRO */}
        <div className="mb-10 animate-slide-up-delay-2">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Rocket className="w-5 h-5" style={{ color: accent }} />
            <h2
              className="text-xl font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              What's Coming
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card p-5 rounded-xl border ${feature.highlight ? 'ring-2' : ''}`}
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: feature.highlight ? accent : `${colors.utility.primaryText}10`,
                  ['--tw-ring-color' as any]: `${accent}50`
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: feature.highlight ? accent : `${accent}15`,
                    }}
                  >
                    <feature.icon
                      className="w-6 h-6"
                      style={{ color: feature.highlight ? '#fff' : accent }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="font-semibold"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {feature.title}
                      </h3>
                      {feature.highlight && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${colors.semantic.success}20`,
                            color: colors.semantic.success
                          }}
                        >
                          Popular
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        {ctaText && onCtaClick && (
          <div className="text-center mb-10 animate-slide-up-delay-3">
            <button
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${colors.brand.secondary})`,
                color: '#fff',
                boxShadow: `0 10px 30px ${accent}30`
              }}
            >
              {ctaText}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom Message */}
        <div className="text-center animate-slide-up-delay-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: `${colors.semantic.info}10`,
              border: `1px solid ${colors.semantic.info}20`
            }}
          >
            <Clock className="w-4 h-4" style={{ color: colors.semantic.info }} />
            <span
              className="text-sm"
              style={{ color: colors.semantic.info }}
            >
              We're putting the finishing touches. Stay tuned for the launch!
            </span>
          </div>
        </div>

        {/* Early Access Unlock Panel - positioned at bottom of content area */}
        <div className="mt-10 flex justify-start">
          {!showUnlockPanel ? (
            <button
              onClick={() => setShowUnlockPanel(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}15`,
                color: colors.utility.secondaryText
              }}
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm">Early Access</span>
            </button>
          ) : (
            <div
              className="p-4 rounded-xl shadow-2xl border animate-slide-up"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}15`,
                minWidth: '280px'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Unlock className="w-4 h-4" style={{ color: accent }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Early Access Code
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowUnlockPanel(false);
                    setPassword('');
                    setError('');
                  }}
                  className="p-1 rounded hover:opacity-70"
                  style={{ color: colors.utility.secondaryText }}
                >
                  &times;
                </button>
              </div>

              <p
                className="text-xs mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                Enter your access code to preview this feature
              </p>

              <div className="relative mb-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter access code"
                  className="w-full px-3 py-2 pr-10 rounded-lg text-sm border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: error ? colors.semantic.error : `${colors.utility.primaryText}20`,
                    color: colors.utility.primaryText,
                    ['--tw-ring-color' as any]: `${accent}40`
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p
                  className="text-xs mb-2"
                  style={{ color: colors.semantic.error }}
                >
                  {error}
                </p>
              )}

              <button
                onClick={handleUnlock}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: accent,
                  color: '#fff'
                }}
              >
                Unlock Preview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComingSoonWrapper;

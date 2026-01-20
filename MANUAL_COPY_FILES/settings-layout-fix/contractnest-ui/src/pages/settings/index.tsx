// src/pages/settings/index.tsx
// Glassmorphic Settings Configuration Page
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageSquare, HelpCircle, Settings, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { getGroupedSettingsMetadata, GroupedSettingsMetadata } from '../../utils/constants/settingsMenus';

// ============================================================================
// Glassmorphic Group Card Component
// ============================================================================
interface GlassGroupCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
    isDarkMode: boolean;
    colors: any;
}

const GlassGroupCard: React.FC<GlassGroupCardProps> = ({
    title,
    description,
    children,
    isDarkMode,
    colors
}) => {
    return (
        <div
            className="rounded-2xl border overflow-hidden"
            style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
            }}
        >
            {/* Group Header */}
            <div
                className="px-6 py-4 border-b"
                style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
            >
                <h2
                    className="text-lg font-semibold"
                    style={{ color: colors.utility.primaryText }}
                >
                    {title}
                </h2>
                <p
                    className="text-sm mt-0.5"
                    style={{ color: colors.utility.secondaryText }}
                >
                    {description}
                </p>
            </div>
            {/* Group Content */}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};

// ============================================================================
// Glassmorphic Settings Item Card Component
// ============================================================================
interface GlassSettingsItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    isDarkMode: boolean;
    colors: any;
}

const GlassSettingsItem: React.FC<GlassSettingsItemProps> = ({
    icon,
    title,
    description,
    onClick,
    isDarkMode,
    colors
}) => {
    return (
        <div
            onClick={onClick}
            className="rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group"
            style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isDarkMode ? 'none' : '0 2px 8px -2px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode
                    ? 'rgba(30, 41, 59, 0.8)'
                    : 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.boxShadow = `0 4px 16px -4px ${colors.brand.primary}30`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = isDarkMode
                    ? 'rgba(30, 41, 59, 0.6)'
                    : 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.boxShadow = isDarkMode ? 'none' : '0 2px 8px -2px rgba(0,0,0,0.08)';
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Icon Container */}
                    <div
                        className="p-2.5 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{
                            background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)`,
                        }}
                    >
                        <div style={{ color: colors.brand.primary }}>
                            {icon}
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col">
                        <h3
                            className="font-medium text-sm transition-colors"
                            style={{ color: colors.utility.primaryText }}
                        >
                            {title}
                        </h3>
                        <p
                            className="text-xs mt-0.5 transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                        >
                            {description}
                        </p>
                    </div>
                </div>

                {/* Arrow Icon */}
                <div
                    className="p-1.5 rounded-lg transition-all duration-300 group-hover:translate-x-1"
                    style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}
                >
                    <Icons.ChevronRight
                        className="h-4 w-4"
                        style={{ color: colors.utility.secondaryText }}
                    />
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Settings Page Component
// ============================================================================
const SettingsPage = () => {
    const navigate = useNavigate();
    const { currentTenant } = useAuth();
    const { isDarkMode, currentTheme } = useTheme();

    // Get theme colors
    const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<GroupedSettingsMetadata>({});

    // Load settings from constants file
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            const groupedSettings = getGroupedSettingsMetadata(false);
            setSettings(groupedSettings);
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    const handleCardClick = (route: string | null, cardName: string) => {
        if (route) {
            navigate(route);
        }
    };

    const getIcon = (iconName: string | null) => {
        if (!iconName) return <Settings className="h-5 w-5" />;
        const Icon = (Icons as any)[iconName?.trim()];
        return Icon ? <Icon className="h-5 w-5" /> : <Settings className="h-5 w-5" />;
    };

    // Admin status check
    const isAdmin = Boolean(currentTenant?.is_admin);

    // Loading State with Glassmorphic Skeleton
    if (loading) {
        return (
            <div
                className="min-h-screen p-6 transition-colors"
                style={{
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
                }}
            >
                <div className="max-w-[1200px] mx-auto">
                    {/* Header Skeleton */}
                    <div className="flex items-center justify-center py-16">
                        <Loader2
                            className="h-8 w-8 animate-spin"
                            style={{ color: colors.brand.primary }}
                        />
                    </div>

                    {/* Content Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="rounded-2xl h-48 animate-pulse"
                                style={{
                                    background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Filter settings based on admin status
    const filteredSettings: GroupedSettingsMetadata = {};
    Object.entries(settings).forEach(([groupKey, { items }]) => {
        const filteredItems = items.filter(item => isAdmin || !item.adminOnly);
        if (filteredItems.length > 0) {
            filteredSettings[groupKey] = { items: filteredItems };
        }
    });

    return (
        <div
            className="min-h-screen p-6 transition-colors"
            style={{
                background: isDarkMode
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
            }}
        >
            <div className="max-w-[1200px] mx-auto">
                {/* Glassmorphic Header */}
                <div
                    className="rounded-2xl border mb-8 overflow-hidden"
                    style={{
                        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                        boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
                    }}
                >
                    <div className="p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div
                                className="p-3 rounded-xl"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)`
                                }}
                            >
                                <Settings className="h-6 w-6" style={{ color: colors.brand.primary }} />
                            </div>
                            <div>
                                <h1
                                    className="text-2xl font-bold"
                                    style={{ color: colors.utility.primaryText }}
                                >
                                    Configure System
                                </h1>
                                <p
                                    className="text-sm mt-0.5"
                                    style={{ color: colors.utility.secondaryText }}
                                >
                                    Set up how you manage subscriptions, customers, billing, and more
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                className="p-2.5 rounded-xl transition-all hover:scale-105"
                                style={{
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${colors.brand.primary}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                }}
                            >
                                <HelpCircle className="h-5 w-5" style={{ color: colors.brand.primary }} />
                            </button>
                            <button
                                className="p-2.5 rounded-xl transition-all hover:scale-105"
                                style={{
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${colors.brand.primary}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                }}
                            >
                                <MessageSquare className="h-5 w-5" style={{ color: colors.brand.primary }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Settings Groups - Single Column Layout */}
                <div className="flex flex-col">
                    {Object.entries(filteredSettings).map(([groupKey, { items }]) => {
                        const groupParent = items.find(item => item.parent_type === null);
                        const childItems = items.filter(item => item.parent_type === groupKey);

                        if (!groupParent || childItems.length === 0) return null;

                        return (
                            <div key={groupKey} className="mt-12 first:mt-0">
                                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                                    {/* Left: Group Header with Description (Grey) */}
                                    <div className="lg:w-1/4 flex-shrink-0">
                                        <div
                                            className="rounded-xl p-4 h-fit lg:sticky lg:top-6"
                                            style={{
                                                background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(148, 163, 184, 0.15)',
                                                backdropFilter: 'blur(8px)',
                                                WebkitBackdropFilter: 'blur(8px)',
                                                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(100, 116, 139, 0.2)'}`,
                                            }}
                                        >
                                            <h2
                                                className="text-lg font-semibold"
                                                style={{ color: colors.utility.primaryText }}
                                            >
                                                {groupKey}
                                            </h2>
                                            <p
                                                className="mt-2 text-sm leading-relaxed"
                                                style={{ color: colors.utility.secondaryText }}
                                            >
                                                {groupParent?.description_long || ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Cards Stack (White) */}
                                    <div className="lg:w-3/4 flex flex-col space-y-3">
                                        {childItems.map((item) => (
                                            <GlassSettingsItem
                                                key={item.id}
                                                icon={getIcon(item.card_icon_name)}
                                                title={item.settings_type}
                                                description={item.description_long || ''}
                                                onClick={() => handleCardClick(item.route_path, item.settings_type)}
                                                isDarkMode={isDarkMode}
                                                colors={colors}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
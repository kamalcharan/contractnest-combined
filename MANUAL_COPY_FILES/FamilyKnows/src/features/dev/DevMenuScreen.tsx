// src/features/dev/DevMenuScreen.tsx
// Development menu for bypassing auth and navigating directly to screens
// Access: Triple-tap on logo in SplashScreen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';

type DevMenuNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'DevMenu'>;

interface NavButton {
  label: string;
  screen: keyof AuthStackParamList;
  params?: any;
  requiresAuth?: boolean;
  category: 'auth' | 'onboarding' | 'main' | 'settings';
}

const NAV_BUTTONS: NavButton[] = [
  // Auth Screens
  { label: 'Intro', screen: 'Intro', category: 'auth' },
  { label: 'Login', screen: 'Login', params: {}, category: 'auth' },
  { label: 'Signup', screen: 'Signup', params: {}, category: 'auth' },
  { label: 'Forgot Password', screen: 'ForgotPassword', category: 'auth' },
  { label: 'Story Onboarding', screen: 'StoryOnboarding', category: 'auth' },

  // Onboarding Screens
  { label: 'Phone Auth', screen: 'PhoneAuth', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'User Profile', screen: 'UserProfile', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'Gender Selection', screen: 'GenderSelection', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'Theme Selection', screen: 'ThemeSelection', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'Language Selection', screen: 'LanguageSelection', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'Google Drive Connect', screen: 'GoogleDriveConnect', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'Family Setup', screen: 'FamilySetup', params: { isFromSettings: false }, category: 'onboarding', requiresAuth: true },
  { label: 'Pricing', screen: 'Pricing', category: 'onboarding', requiresAuth: true },

  // Main App Screens
  { label: 'Main (Dashboard)', screen: 'Main', category: 'main', requiresAuth: true },

  // Settings Screens
  { label: 'Unified Profile', screen: 'UnifiedProfile', category: 'settings', requiresAuth: true },
  { label: 'Settings: Theme', screen: 'SettingsTheme', params: { isFromSettings: true }, category: 'settings', requiresAuth: true },
  { label: 'Settings: Language', screen: 'SettingsLanguage', params: { isFromSettings: true }, category: 'settings', requiresAuth: true },
  { label: 'Settings: Google Drive', screen: 'SettingsGoogleDrive', params: { isFromSettings: true }, category: 'settings', requiresAuth: true },
  { label: 'Settings: Family', screen: 'SettingsFamily', params: { isFromSettings: true }, category: 'settings', requiresAuth: true },
];

const CATEGORY_LABELS: Record<string, string> = {
  auth: 'Auth Screens',
  onboarding: 'Onboarding Screens',
  main: 'Main App Screens',
  settings: 'Settings Screens',
};

export const DevMenuScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<DevMenuNavigationProp>();
  const { isAuthenticated, devBypassAuth } = useAuth();
  const [devAuthEnabled, setDevAuthEnabled] = useState(false);

  // Safe color access with fallbacks
  const colors = {
    primary: theme?.colors?.brand?.primary || '#6B4EFF',
    secondary: theme?.colors?.brand?.secondary || '#8B7AFF',
    primaryBg: theme?.colors?.utility?.primaryBackground || '#FFFFFF',
    secondaryBg: theme?.colors?.utility?.secondaryBackground || '#F5F5F5',
    primaryText: theme?.colors?.utility?.primaryText || '#1A1A2E',
    secondaryText: theme?.colors?.utility?.secondaryText || '#6B7280',
    success: theme?.colors?.semantic?.success || '#10B981',
    warning: theme?.colors?.semantic?.warning || '#F59E0B',
    error: theme?.colors?.semantic?.error || '#EF4444',
    accent: theme?.colors?.accent?.accent1 || '#FFD700',
  };

  const handleEnableDevAuth = async () => {
    try {
      await devBypassAuth();
      setDevAuthEnabled(true);
      Alert.alert('Dev Auth Enabled', 'Mock user and tenant data set. You can now access all screens.');
    } catch (error) {
      Alert.alert('Error', 'Failed to enable dev auth');
    }
  };

  const handleNavigate = (button: NavButton) => {
    if (button.requiresAuth && !isAuthenticated && !devAuthEnabled) {
      Alert.alert(
        'Auth Required',
        'This screen requires authentication. Enable Dev Auth first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable Dev Auth', onPress: handleEnableDevAuth },
        ]
      );
      return;
    }

    navigation.navigate(button.screen as any, button.params);
  };

  const handleGoBack = () => {
    navigation.navigate('Splash');
  };

  // Group buttons by category
  const groupedButtons = NAV_BUTTONS.reduce((acc, button) => {
    if (!acc[button.category]) {
      acc[button.category] = [];
    }
    acc[button.category].push(button);
    return acc;
  }, {} as Record<string, NavButton[]>);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primaryBg }]}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Menu</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Dev Mode Banner */}
      {(devAuthEnabled || isAuthenticated) && (
        <View style={[styles.banner, { backgroundColor: colors.success }]}>
          <Text style={styles.bannerText}>
            {devAuthEnabled ? '[DEV MODE] Mock Auth Active' : '[REAL AUTH] Logged In'}
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Enable Dev Auth Button */}
        {!isAuthenticated && !devAuthEnabled && (
          <TouchableOpacity
            style={[styles.devAuthButton, { backgroundColor: colors.warning }]}
            onPress={handleEnableDevAuth}
          >
            <Text style={styles.devAuthButtonText}>Enable Dev Auth (Mock User)</Text>
          </TouchableOpacity>
        )}

        {/* Navigation Buttons by Category */}
        {Object.entries(groupedButtons).map(([category, buttons]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: colors.secondaryText }]}>
              {CATEGORY_LABELS[category]}
            </Text>
            <View style={styles.buttonGrid}>
              {buttons.map((button) => {
                const needsAuth = button.requiresAuth && !isAuthenticated && !devAuthEnabled;
                return (
                  <TouchableOpacity
                    key={button.screen + button.label}
                    style={[
                      styles.navButton,
                      {
                        backgroundColor: needsAuth ? colors.secondaryBg : colors.primary,
                      },
                    ]}
                    onPress={() => handleNavigate(button)}
                  >
                    <Text
                      style={[
                        styles.navButtonText,
                        { color: needsAuth ? colors.secondaryText : '#FFFFFF' },
                      ]}
                    >
                      {button.label}
                    </Text>
                    {needsAuth && (
                      <Text style={[styles.lockIcon, { color: colors.secondaryText }]}>🔒</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: colors.secondaryBg }]}>
          <Text style={[styles.infoTitle, { color: colors.primaryText }]}>
            How to Use
          </Text>
          <Text style={[styles.infoText, { color: colors.secondaryText }]}>
            1. Tap "Enable Dev Auth" to set mock user/tenant data{'\n'}
            2. Navigate to any screen to test UI{'\n'}
            3. Screens marked with 🔒 require auth{'\n'}
            4. Access this menu: Triple-tap logo on Splash
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  devAuthButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  devAuthButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lockIcon: {
    fontSize: 12,
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DevMenuScreen;

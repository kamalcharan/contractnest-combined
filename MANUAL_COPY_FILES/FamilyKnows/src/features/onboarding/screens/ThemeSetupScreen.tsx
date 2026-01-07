// src/features/onboarding/screens/ThemeSetupScreen.tsx
// Theme selection with variant support for onboarding (glass) and settings (normal) styles

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Switch,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { dialog } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';
import api from '../../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 72) / 2;

type ThemeSetupNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ThemeSelection'>;
type ThemeSetupRouteProp = RouteProp<AuthStackParamList, 'ThemeSelection'>;

// Variant types for different visual styles
type ScreenVariant = 'glass' | 'normal';

export const ThemeSetupScreen: React.FC = () => {
  const navigation = useNavigation<ThemeSetupNavigationProp>();
  const route = useRoute<ThemeSetupRouteProp>();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, isDarkMode, toggleDarkMode, availableThemes, currentThemeId } = useTheme();
  const { user } = useAuth();

  const isFromSettings = route?.params?.isFromSettings || false;
  // Determine variant: glass for onboarding, normal for settings
  const variant: ScreenVariant = isFromSettings ? 'normal' : 'glass';

  // Default to current theme or purple-tone
  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId || 'purple-tone');
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Dynamic styles based on variant
  const getVariantStyles = () => {
    if (variant === 'normal') {
      return {
        backgroundColor: theme.colors.utility.primaryBackground,
        textColor: theme.colors.utility.primaryText,
        secondaryTextColor: theme.colors.utility.secondaryText,
        cardBg: theme.colors.utility.secondaryBackground,
        statusBarStyle: isDarkMode ? 'light-content' : 'dark-content',
        iconColor: theme.colors.brand.primary,
        buttonBg: theme.colors.brand.primary,
        buttonTextColor: '#FFFFFF',
      };
    }
    // Glass variant (default onboarding style)
    return {
      backgroundColor: '#0F172A',
      textColor: '#FFF',
      secondaryTextColor: 'rgba(255,255,255,0.6)',
      cardBg: 'rgba(30, 41, 59, 0.8)',
      statusBarStyle: 'light-content',
      iconColor: '#F59E0B',
      buttonBg: '#F59E0B',
      buttonTextColor: '#0F172A',
    };
  };

  const variantStyles = getVariantStyles();

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Apply theme locally
      setTheme(selectedThemeId);

      // Save to API
      await api.post('/api/FKonboarding/complete-step', {
        stepId: 'theme',
        data: {
          theme: selectedThemeId,
          is_dark_mode: isDarkMode,
          user_id: user?.id,
        },
      });

      // Show success message
      if (variant === 'normal') {
        // Use toast for settings mode
        toast.success('Theme Updated', 'Your theme preference has been saved.');
        navigation.goBack();
      } else {
        // Use dialog for onboarding
        dialog.success(
          'Theme Saved',
          'Your theme has been saved successfully!',
          () => navigation.navigate('LanguageSelection', { isFromSettings: false })
        );
      }
    } catch (err: any) {
      console.error('Error saving theme:', err);
      dialog.error(
        'Save Failed',
        err.message || 'Could not save theme. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('LanguageSelection', { isFromSettings: false });
  };

  const renderThemeCard = (themeItem: any) => {
    const isSelected = selectedThemeId === themeItem.id;
    const colors = themeItem.colors;

    return (
      <TouchableOpacity
        key={themeItem.id}
        style={[
          styles.themeCard,
          { backgroundColor: variantStyles.cardBg },
          isSelected && [styles.themeCardSelected, { borderColor: theme.colors.semantic.success }],
        ]}
        onPress={() => setSelectedThemeId(themeItem.id)}
        activeOpacity={0.8}
      >
        {/* Color Preview */}
        <View style={styles.colorPreview}>
          <View style={[styles.colorBar, { backgroundColor: colors.brand.primary }]} />
          <View style={styles.colorDots}>
            <View style={[styles.colorDot, { backgroundColor: colors.brand.secondary }]} />
            <View style={[styles.colorDot, { backgroundColor: colors.brand.tertiary }]} />
            <View style={[styles.colorDot, { backgroundColor: colors.accent.accent1 }]} />
          </View>
        </View>

        {/* Theme Name */}
        <Text style={[styles.themeName, { color: variantStyles.textColor }]} numberOfLines={1}>
          {themeItem.name}
        </Text>

        {/* Selected Indicator */}
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: theme.colors.semantic.success }]}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: variantStyles.backgroundColor }]}>
      <StatusBar barStyle={variantStyles.statusBarStyle as any} />

      {/* Gradient Background - only for glass variant */}
      {variant === 'glass' && (
        <>
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Stars Background */}
          <View style={styles.starsContainer}>
            {[...Array(40)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    left: Math.random() * SCREEN_WIDTH,
                    top: Math.random() * SCREEN_HEIGHT,
                    opacity: 0.2 + Math.random() * 0.4,
                    width: 1 + Math.random() * 2,
                    height: 1 + Math.random() * 2,
                  },
                ]}
              />
            ))}
          </View>
        </>
      )}

      {/* Progress Indicator - only for onboarding (glass variant) */}
      {variant === 'glass' && (
        <View style={[styles.progressContainer, { top: insets.top + 20 }]}>
          <View style={styles.progressDots}>
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepText}>Step 3 of 4</Text>
        </View>
      )}

      {/* Back Button for settings variant */}
      {variant === 'normal' && (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={variantStyles.textColor} />
        </TouchableOpacity>
      )}

      {/* Skip Button - only for onboarding */}
      {variant === 'glass' && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + 20 }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + (variant === 'normal' ? 60 : 80) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[
            styles.iconContainer,
            variant === 'normal' && {
              backgroundColor: theme.colors.brand.primary + '15',
              borderColor: theme.colors.brand.primary + '30'
            }
          ]}>
            <MaterialCommunityIcons
              name="palette-outline"
              size={48}
              color={variantStyles.iconColor}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: variantStyles.textColor }]}>
            {variant === 'normal' ? 'Theme' : 'Choose Your Theme'}
          </Text>
          <Text style={[styles.subtitle, { color: variantStyles.secondaryTextColor }]}>
            Personalize your experience
          </Text>

          {/* Dark Mode Toggle */}
          <View style={[styles.darkModeCard, { backgroundColor: variantStyles.cardBg }]}>
            <View style={styles.darkModeLeft}>
              <MaterialCommunityIcons
                name={isDarkMode ? 'weather-night' : 'white-balance-sunny'}
                size={24}
                color={isDarkMode ? '#8B5CF6' : '#F59E0B'}
              />
              <Text style={[styles.darkModeText, { color: variantStyles.textColor }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{
                false: variant === 'normal' ? theme.colors.utility.secondaryText + '40' : 'rgba(255,255,255,0.2)',
                true: 'rgba(139,92,246,0.4)'
              }}
              thumbColor={isDarkMode ? '#8B5CF6' : '#FFF'}
            />
          </View>

          {/* Theme Grid */}
          <View style={styles.themesGrid}>
            {availableThemes.map(renderThemeCard)}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: variantStyles.buttonBg },
              isLoading && styles.buttonLoading
            ]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={[styles.continueButtonText, { color: variantStyles.buttonTextColor }]}>
                Saving...
              </Text>
            ) : (
              <>
                <Text style={[styles.continueButtonText, { color: variantStyles.buttonTextColor }]}>
                  {variant === 'normal' ? 'Save' : 'Continue'}
                </Text>
                {variant === 'glass' && (
                  <MaterialCommunityIcons name="arrow-right" size={20} color={variantStyles.buttonTextColor} />
                )}
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  progressContainer: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: '#F59E0B',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#4ADE80',
  },
  stepText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  darkModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  darkModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  darkModeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 32,
  },
  themeCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    borderColor: '#4ADE80',
  },
  colorPreview: {
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  colorBar: {
    height: 30,
    width: '100%',
  },
  colorDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 30,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default ThemeSetupScreen;

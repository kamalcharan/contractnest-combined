// src/features/onboarding/screens/LanguageSetupScreen.tsx
// Language selection with variant support for onboarding (glass) and settings (normal) styles

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../theme/ThemeContext';
import api from '../../../services/api';
import Toast from 'react-native-toast-message';
// Single source of truth for languages
import { supportedLanguages, Language } from '../../../constants/languages';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LanguageSetupNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'LanguageSelection'>;
type LanguageSetupRouteProp = RouteProp<AuthStackParamList, 'LanguageSelection'>;

// Filter to only English and Telugu for now (as per i18n strategy)
const ENABLED_LANGUAGES = supportedLanguages.filter(
  lang => lang.code === 'en' || lang.code === 'te'
);

// Variant types for different visual styles
type ScreenVariant = 'glass' | 'normal';

export const LanguageSetupScreen: React.FC = () => {
  const navigation = useNavigation<LanguageSetupNavigationProp>();
  const route = useRoute<LanguageSetupRouteProp>();
  const insets = useSafeAreaInsets();
  const { user, currentTenant } = useAuth();
  const { theme } = useTheme();

  const isFromSettings = route?.params?.isFromSettings || false;
  // Determine variant: glass for onboarding, normal for settings
  const variant: ScreenVariant = isFromSettings ? 'normal' : 'glass';

  // Default to English, or use user's saved language (preferred_language is the correct field)
  const [selectedLanguage, setSelectedLanguage] = useState(user?.preferred_language || 'en');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Fetch existing data to determine CREATE vs EDIT mode
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const response = await api.get<{
          data: {
            step_data?: { language?: { language?: string; value?: string } };
            steps?: Record<string, { status: string }>;
          };
        }>('/api/FKonboarding/status');

        const stepData = response.data?.data?.step_data?.language;
        const stepStatus = response.data?.data?.steps?.language;

        // If step is completed or has data, we're in EDIT mode
        if (stepStatus?.status === 'completed' || stepData) {
          setIsEditMode(true);
          // Pre-populate with saved value
          const savedLang = stepData?.language || stepData?.value || user?.preferred_language;
          if (savedLang) {
            setSelectedLanguage(savedLang);
          }
        }
      } catch (error) {
        console.log('Could not fetch onboarding status for language step:', error);
        // Fall back to user profile data
        if (user?.preferred_language) {
          setIsEditMode(true);
          setSelectedLanguage(user.preferred_language);
        }
      }
    };

    fetchExistingData();
  }, [user?.preferred_language]);

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

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Save to API
      await api.post('/api/FKonboarding/complete-step', {
        stepId: 'language',
        data: {
          language: selectedLanguage,
          user_id: user?.id,
        },
      });

      Toast.show({
        type: 'success',
        text1: 'Language Updated',
        text2: 'Your language preference has been saved.',
      });

      if (isFromSettings) {
        navigation.goBack();
      } else {
        // Onboarding complete - go to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (err: any) {
      console.error('Error saving language:', err);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Could not save language preference. Please try again.',
      });
      // Still navigate even if save fails
      if (isFromSettings) {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  // Dynamic styles based on variant
  const getVariantStyles = () => {
    if (variant === 'normal') {
      return {
        backgroundColor: theme.colors.utility.primaryBackground,
        textColor: theme.colors.utility.primaryText,
        secondaryTextColor: theme.colors.utility.secondaryText,
        cardBg: theme.colors.utility.secondaryBackground,
        statusBarStyle: theme.isDark ? 'light-content' : 'dark-content',
      };
    }
    // Glass variant (default onboarding style)
    return {
      backgroundColor: '#0F172A',
      textColor: '#FFF',
      secondaryTextColor: 'rgba(255,255,255,0.6)',
      cardBg: 'rgba(30, 41, 59, 0.8)',
      statusBarStyle: 'light-content',
    };
  };

  const variantStyles = getVariantStyles();

  const renderLanguageItem = (lang: Language) => {
    const isSelected = selectedLanguage === lang.code;

    return (
      <TouchableOpacity
        key={lang.code}
        style={[
          styles.languageItem,
          { backgroundColor: variantStyles.cardBg },
          isSelected && styles.languageItemSelected,
        ]}
        onPress={() => setSelectedLanguage(lang.code)}
        activeOpacity={0.8}
      >
        <Text style={styles.languageFlag}>{lang.flag}</Text>
        <View style={styles.languageText}>
          <Text style={[styles.languageName, { color: variantStyles.textColor }]}>{lang.name}</Text>
          <Text style={[styles.languageNative, { color: variantStyles.secondaryTextColor }]}>{lang.nativeName}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIcon}>
            <Ionicons name="checkmark" size={18} color="#FFF" />
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
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
          <Text style={styles.stepText}>Step 4 of 4</Text>
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
          <View style={[styles.iconContainer, variant === 'normal' && { backgroundColor: theme.colors.brand.primary + '15', borderColor: theme.colors.brand.primary + '30' }]}>
            <MaterialCommunityIcons name="translate" size={48} color={variant === 'normal' ? theme.colors.brand.primary : '#3B82F6'} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: variantStyles.textColor }]}>
            {variant === 'normal' ? 'Language' : 'Select Language'}
          </Text>
          <Text style={[styles.subtitle, { color: variantStyles.secondaryTextColor }]}>
            Choose your preferred language
          </Text>

          {/* Language List - using constants as single source of truth */}
          <View style={styles.languageList}>
            {ENABLED_LANGUAGES.map(renderLanguageItem)}
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.finishButton,
              isLoading && styles.buttonLoading,
              variant === 'normal' && { backgroundColor: theme.colors.brand.primary }
            ]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.finishButtonText}>Saving...</Text>
            ) : (
              <>
                <Text style={styles.finishButtonText}>
                  {variant === 'normal' ? 'Save' : (isEditMode ? 'Update & Continue' : 'Get Started')}
                </Text>
                {variant === 'glass' && !isEditMode && (
                  <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFF" />
                )}
                {variant === 'glass' && isEditMode && (
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                )}
              </>
            )}
          </TouchableOpacity>

          {/* Welcome Text - only for onboarding */}
          {variant === 'glass' && (
            <Text style={styles.welcomeText}>
              You're all set! Welcome to FamilyKnows.
            </Text>
          )}
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
    backgroundColor: '#3B82F6',
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
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
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
    marginBottom: 32,
  },
  languageList: {
    width: '100%',
    gap: 10,
    marginBottom: 32,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 14,
  },
  languageItemSelected: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  languageFlag: {
    fontSize: 28,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  languageNative: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  selectedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});

export default LanguageSetupScreen;

// src/features/auth/screens/SplashScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { STORAGE_KEYS, api } from '../../../services/api';

const { width, height } = Dimensions.get('window');
const INTRO_SHOWN_KEY = '@FamilyKnows:introShown';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Splash'
>;

export const SplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const appNameOpacity = useRef(new Animated.Value(0)).current;
  const appNameTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Dev menu triple-tap trigger
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle logo tap for dev menu access
  const handleLogoTap = useCallback(() => {
    // Clear existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // If triple tap detected, navigate to dev menu
    if (newTapCount >= 3) {
      console.log('[DEV] Triple-tap detected, opening Dev Menu');
      setTapCount(0);
      navigation.navigate('DevMenu');
      return;
    }

    // Reset tap count after 500ms of no taps
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 500);
  }, [tapCount, navigation]);

  // Determine where to navigate based on auth state
  const determineNavigation = async () => {
    // Wait for auth loading to complete
    if (isLoading) return;

    // Check if intro has been shown before
    const introShown = await AsyncStorage.getItem(INTRO_SHOWN_KEY);

    if (isAuthenticated && user) {
      // User is authenticated - check actual onboarding status from API
      try {
        const response = await api.get<{
          needs_onboarding: boolean;
          data: {
            is_complete: boolean;
            current_step: number;
            steps: Record<string, { id: string; status: string; is_required: boolean; sequence: number }>;
          };
        }>('/api/FKonboarding/status');

        const result = response.data;
        console.log('SplashScreen - Onboarding status:', JSON.stringify(result, null, 2));

        // Check if onboarding is complete
        if (!result.needs_onboarding || result.data?.is_complete) {
          // Onboarding complete - go to main app
          navigation.replace('Main');
        } else {
          // Find first incomplete required step
          const stepOrder = ['personal-profile', 'gender', 'theme', 'language', 'family-space', 'storage', 'family-invite'];
          const steps = result.data?.steps || {};

          let firstIncompleteStep: string | null = null;
          for (const stepId of stepOrder) {
            const step = steps[stepId];
            if (step && step.status === 'pending' && step.is_required) {
              firstIncompleteStep = stepId;
              break;
            }
          }

          console.log('SplashScreen - First incomplete step:', firstIncompleteStep);

          // Navigate to appropriate onboarding screen
          if (firstIncompleteStep) {
            switch (firstIncompleteStep) {
              case 'personal-profile':
                navigation.replace('UserProfile' as any, { isFromSettings: false });
                break;
              case 'theme':
                navigation.replace('ThemeSelection' as any, { isFromSettings: false });
                break;
              case 'language':
                navigation.replace('LanguageSelection' as any, { isFromSettings: false });
                break;
              case 'family-space':
                navigation.replace('FamilySetup', { isFromSettings: false });
                break;
              default:
                // Default to family setup for unknown steps
                navigation.replace('FamilySetup', { isFromSettings: false });
            }
          } else {
            // No pending required steps - might have optional steps pending, go to main
            navigation.replace('Main');
          }
        }
      } catch (error) {
        console.log('SplashScreen - Error checking onboarding status:', error);
        // On error, fall back to registration_status check
        if (user.registration_status === 'complete') {
          navigation.replace('Main');
        } else if (user.registration_status === 'pending_workspace') {
          navigation.replace('FamilySetup', { isFromSettings: false });
        } else {
          navigation.replace('Main');
        }
      }
    } else {
      // Not authenticated
      if (introShown) {
        // Already seen intro - go straight to login
        navigation.replace('Login', {});
      } else {
        // New user - show intro screens
        navigation.replace('Intro');
      }
    }
  };

  useEffect(() => {
    // Staggered entrance animation sequence
    Animated.sequence([
      // Logo entrance with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // App name fade in
      Animated.parallel([
        Animated.timing(appNameOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(appNameTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Tagline fade in
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Navigate after delay - check auth state and navigate appropriately
    const timer = setTimeout(() => {
      determineNavigation();
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, logoScale, logoOpacity, logoRotate, appNameOpacity, appNameTranslateY, taglineOpacity, taglineTranslateY, pulseAnim, shimmerAnim, isLoading]);

  const rotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.brand.primary }]}>
      <StatusBar backgroundColor={theme.colors.brand.primary} barStyle="light-content" />

      {/* Background decorative circles */}
      <View style={[styles.bgCircle, styles.bgCircle1, { backgroundColor: theme.colors.brand.secondary + '10' }]} />
      <View style={[styles.bgCircle, styles.bgCircle2, { backgroundColor: theme.colors.brand.secondary + '08' }]} />

      {/* Logo Section - Triple-tap for Dev Menu */}
      <TouchableOpacity
        style={styles.logoSection}
        onPress={handleLogoTap}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [
                { scale: Animated.multiply(logoScale, pulseAnim) },
                { rotate: rotateInterpolate },
              ],
              opacity: logoOpacity,
            },
          ]}
        >
          <View style={[styles.logoContainer, { backgroundColor: theme.colors.utility.secondaryBackground }]}>
            <Image
              source={require('../../../../assets/images/family-knows-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.appName,
            {
              color: theme.colors.utility.secondaryBackground,
              opacity: appNameOpacity,
              transform: [{ translateY: appNameTranslateY }],
            },
          ]}
        >
          FamilyKnows
        </Animated.Text>
      </TouchableOpacity>

      {/* Tagline Section */}
      <Animated.View
        style={[
          styles.taglineContainer,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          },
        ]}
      >
        <Text style={[styles.tagline, { color: theme.colors.utility.secondaryBackground }]}>
          Your AI-Powered Family Intelligence Platform
        </Text>
        <View style={styles.bulletPoints}>
          <Text style={[styles.bulletPoint, { color: theme.colors.accent.accent4 }]}>
            Manage
          </Text>
          <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent.accent4 }]} />
          <Text style={[styles.bulletPoint, { color: theme.colors.accent.accent4 }]}>
            Protect
          </Text>
          <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent.accent4 }]} />
          <Text style={[styles.bulletPoint, { color: theme.colors.accent.accent4 }]}>
            Optimize
          </Text>
        </View>
      </Animated.View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingTrack, { backgroundColor: theme.colors.utility.secondaryBackground + '30' }]}>
          <Animated.View
            style={[
              styles.loadingBar,
              {
                backgroundColor: theme.colors.utility.secondaryBackground,
                transform: [{
                  translateX: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 100],
                  }),
                }],
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgCircle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.5,
    right: -width * 0.5,
  },
  bgCircle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.4,
    left: -width * 0.4,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  taglineContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  bulletPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletPoint: {
    fontSize: 15,
    fontWeight: '600',
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 60,
    width: 100,
    alignItems: 'center',
  },
  loadingTrack: {
    width: 100,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
});

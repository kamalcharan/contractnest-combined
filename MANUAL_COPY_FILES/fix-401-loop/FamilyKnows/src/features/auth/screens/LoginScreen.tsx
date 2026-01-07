// src/features/auth/screens/LoginScreen.tsx
// Email/Password Login Screen for FamilyKnows

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  TextInput,
  ScrollView,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Toast, ToastType } from '../../../components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<ToastType>('error');
  const [toastTitle, setToastTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Refs for input focus
  const passwordInputRef = useRef<TextInput>(null);

  // Retry counter for onboarding check to prevent infinite loops
  const onboardingCheckRetryCount = useRef(0);
  const MAX_ONBOARDING_CHECK_RETRIES = 2;

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Helper function to show toast
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToastType(type);
    setToastTitle(title);
    setToastMessage(message || '');
    setToastVisible(true);
  };

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Navigate when authenticated - check onboarding status
  useEffect(() => {
    const checkOnboardingAndNavigate = async () => {
      if (isAuthenticated) {
        try {
          // Check onboarding status from API (uses api service with auth token)
          const response = await api.get<{
            needs_onboarding: boolean;
            data: {
              is_complete: boolean;
              steps: Record<string, { id: string; status: string; is_required: boolean; sequence: number }>;
            };
          }>('/api/FKonboarding/status');

          // Reset retry counter on successful response
          onboardingCheckRetryCount.current = 0;

          const result = response.data;
          console.log('Onboarding status:', JSON.stringify(result, null, 2));

          // Check if onboarding is complete
          if (!result.needs_onboarding || result.data?.is_complete) {
            // Onboarding complete - go to main app
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          } else {
            // Find first incomplete required step
            // Step order must match FKonboarding config required steps
            const stepOrder = ['personal-profile', 'theme', 'language', 'family-space'];
            const steps = result.data?.steps || {};

            let firstIncompleteStep: string | null = null;
            for (const stepId of stepOrder) {
              const step = steps[stepId];
              if (step && step.status === 'pending') {
                firstIncompleteStep = stepId;
                break;
              }
            }

            console.log('First incomplete step:', firstIncompleteStep);

            if (firstIncompleteStep) {
              // Navigate to the appropriate onboarding screen
              switch (firstIncompleteStep) {
                case 'personal-profile':
                  // Personal profile includes mobile number entry
                  navigation.replace('PhoneAuth' as any, { isFromSettings: false });
                  break;
                case 'theme':
                  navigation.replace('ThemeSelection' as any, { isFromSettings: false });
                  break;
                case 'language':
                  navigation.replace('LanguageSelection' as any, { isFromSettings: false });
                  break;
                case 'family-space':
                  navigation.replace('FamilySetup' as any, { isFromSettings: false });
                  break;
                default:
                  navigation.replace('PhoneAuth' as any, { isFromSettings: false });
              }
            } else {
              // No pending steps found but needs_onboarding is true - go to main
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        } catch (error: any) {
          console.log('Error checking onboarding status:', error);
          onboardingCheckRetryCount.current++;

          // Check if this is a session expired error (auth was cleared)
          if (error.message?.includes('Session expired')) {
            console.log('Session expired - will return to login');
            onboardingCheckRetryCount.current = 0;
            // Auth context will handle setting isAuthenticated to false
            return;
          }

          // If we've exceeded max retries, show error and don't retry
          if (onboardingCheckRetryCount.current >= MAX_ONBOARDING_CHECK_RETRIES) {
            console.log(`Max onboarding check retries (${MAX_ONBOARDING_CHECK_RETRIES}) exceeded - showing error`);
            showToast('error', 'Connection Error', 'Unable to verify account status. Please try logging in again.');
            onboardingCheckRetryCount.current = 0;
            // Clear auth to break the loop and let user try fresh login
            await api.clearAuth();
            return;
          }

          // First retry - default to onboarding flow
          console.log(`Onboarding check failed (attempt ${onboardingCheckRetryCount.current}), defaulting to onboarding`);
          navigation.replace('PhoneAuth' as any, { isFromSettings: false });
        }
      }
    };

    checkOnboardingAndNavigate();
  }, [isAuthenticated, navigation]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation will happen via useEffect when isAuthenticated changes
    } catch (error: any) {
      // Determine the appropriate error message and type
      const errorMessage = error.message || 'Please check your credentials and try again.';

      // Check for specific error types
      if (errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('password') ||
          errorMessage.toLowerCase().includes('credentials')) {
        showToast('error', 'Invalid Credentials', 'Please check your email and password.');
      } else if (errorMessage.toLowerCase().includes('network') ||
                 errorMessage.toLowerCase().includes('connect')) {
        showToast('warning', 'Connection Error', 'Please check your internet connection.');
      } else if (errorMessage.toLowerCase().includes('timeout')) {
        showToast('warning', 'Request Timeout', 'The server is taking too long. Please try again.');
      } else {
        showToast('error', 'Login Failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    // Navigate to StoryOnboarding to capture name + family space first
    navigation.navigate('StoryOnboarding' as any);
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Toast Component */}
      <Toast
        visible={toastVisible}
        type={toastType}
        title={toastTitle}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
        duration={4000}
      />

      {/* IMMERSIVE BACKGROUND */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars Background */}
      <View style={styles.starsContainer}>
        {[...Array(30)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: Math.random() * SCREEN_WIDTH,
                top: Math.random() * SCREEN_HEIGHT,
                opacity: 0.15 + Math.random() * 0.35,
                width: 1 + Math.random() * 2,
                height: 1 + Math.random() * 2,
              }
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* LOGO SECTION */}
          <Animated.View
            style={[
              styles.headerSection,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
                paddingTop: insets.top + 30,
              }
            ]}
          >
            <View style={styles.logoBubble}>
              <View style={styles.logoGlow} />
              <MaterialCommunityIcons name="shield-home" size={32} color="#4ADE80" />
            </View>
            <Text style={styles.appName}>FamilyKnows</Text>
            <Text style={styles.tagline}>Your Family's Digital Vault</Text>
          </Animated.View>

          {/* GLASSMORPHIC LOGIN CARD */}
          <Animated.View
            style={[
              styles.glassCard,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
              }
            ]}
          >
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSub}>Sign in to access your family vault</Text>
            </View>

            <View style={styles.divider} />

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!isLoading}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(255,255,255,0.5)"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonLoading]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Signal */}
            <View style={styles.trustRow}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#4ADE80" />
              <Text style={styles.trustText}>Bank-grade Encryption</Text>
            </View>
          </Animated.View>

          {/* FOOTER */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: footerOpacity,
                paddingBottom: insets.bottom + 20,
              }
            ]}
          >
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBubble: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  glassCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#4ADE80',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  signUpText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  signUpLink: {
    color: '#4ADE80',
    fontSize: 14,
    fontWeight: '600',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trustText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  termsText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
});

// src/features/auth/screens/LoginScreen.tsx
// Floating Glass Portal - Seamless transition from Story Onboarding
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
} from 'react-native';
import { Text } from '@rneui/themed';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { GoogleIcon } from '../components/GoogleIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const route = useRoute<LoginScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  // DATA BRIDGE: Receive from StoryOnboarding
  const { userName, familyName } = route.params || {};

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      // Logo first
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
      // Then the glass card
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
      // Finally footer
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Mock Login Delay
      setTimeout(() => {
        // DATA BRIDGE: Pass forward to PhoneAuth
        navigation.replace('PhoneAuth' as any, {
          isFromSettings: false,
          prefillName: userName,
          prefillFamily: familyName,
        });
      }, 2000);
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* IMMERSIVE BACKGROUND - Matches Story Onboarding */}
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
        style={styles.content}
      >
        {/* LOGO SECTION */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
              paddingTop: insets.top + 40,
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
          {/* Personalized Greeting */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>
              {userName ? `Welcome, ${userName}` : 'Welcome Back'}
            </Text>
            <Text style={styles.welcomeSub}>
              {familyName
                ? `Let's secure the ${familyName} legacy.`
                : "Your family's digital vault awaits."}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Google Login Button */}
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonLoading]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <GoogleIcon size={22} color="#0F172A" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Header / Logo Section
  headerSection: {
    alignItems: 'center',
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

  // Glass Card
  glassCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 28,
    padding: 32,
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
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSub: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },

  // Google Button
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Trust Signal
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

  // Footer
  footer: {
    paddingHorizontal: 40,
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

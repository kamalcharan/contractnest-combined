// src/features/auth/screens/IntroScreens.tsx
// Immersive Vertical Scroll Intro - StoryOnboarding Style
import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text } from '@rneui/themed';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

type IntroScreensNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Intro'>;

interface Props {
  navigation: IntroScreensNavigationProp;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const INTRO_SHOWN_KEY = '@FamilyKnows:introShown';
const TOTAL_HEIGHT = SCREEN_HEIGHT * 4;

// Glassmorphic Feature Card
const GlassFeatureCard = ({ icon, text, delay, scrollY, baseOffset }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.glassCard,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      <View style={styles.glassCardIcon}>
        <Ionicons name={icon as any} size={20} color="#4ADE80" />
      </View>
      <Text style={styles.glassCardText}>{text}</Text>
    </Animated.View>
  );
};

// Floating Category Bubble
const FloatingBubble = ({ icon, label, color, delay, x, y }: any) => {
  const scale = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      delay,
      useNativeDriver: true,
    }).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -8,
          duration: 1500 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1500 + Math.random() * 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.floatingBubble,
        {
          left: x,
          top: y,
          transform: [{ scale }, { translateY: floatY }],
        },
      ]}
    >
      <View style={[styles.bubbleInner, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.bubbleLabel}>{label}</Text>
    </Animated.View>
  );
};

export const IntroScreens: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Floating animation for icons
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // --- SCROLL INTERPOLATIONS ---

  // Page 1: Welcome (fade out as scroll)
  const welcomeOpacity = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const welcomeScale = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.5],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  // Page 2: Features (fade in/out)
  const featuresOpacity = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 0.3, SCREEN_HEIGHT * 0.8, SCREEN_HEIGHT * 1.5, SCREEN_HEIGHT * 2],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const featuresTranslateY = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT],
    outputRange: [50, 0],
    extrapolate: 'clamp',
  });

  // Page 3: Security (fade in/out)
  const securityOpacity = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 1.3, SCREEN_HEIGHT * 1.8, SCREEN_HEIGHT * 2.5, SCREEN_HEIGHT * 3],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const shieldScale = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 1.5, SCREEN_HEIGHT * 2],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  // Page 4: Categories (fade in)
  const categoriesOpacity = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 2.5, SCREEN_HEIGHT * 3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const categoriesScale = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 2.5, SCREEN_HEIGHT * 3.2],
    outputRange: [0.8, 1],
    extrapolate: 'clamp',
  });

  // Background color shift
  const backgroundOpacity = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 3],
    outputRange: [0, 0.3],
    extrapolate: 'clamp',
  });

  const handleFinish = async () => {
    await AsyncStorage.setItem(INTRO_SHOWN_KEY, 'true');
    navigation.replace('Login');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(INTRO_SHOWN_KEY, 'true');
    navigation.replace('Login');
  };

  const features = [
    { icon: 'checkmark-circle', text: 'One trusted place for everything' },
    { icon: 'sparkles', text: 'AI-powered insights' },
    { icon: 'people', text: 'Connect with verified providers' },
    { icon: 'heart', text: 'Share across generations' },
  ];

  const securityFeatures = [
    { icon: 'lock-closed', text: 'End-to-end encryption' },
    { icon: 'shield-checkmark', text: 'Your data stays yours' },
    { icon: 'cloud-offline', text: 'Offline-first architecture' },
    { icon: 'key', text: 'PIN protected access' },
  ];

  const categories = [
    { icon: 'home', label: 'Property', color: '#FF6B6B', x: 20, y: 0 },
    { icon: 'medical-bag', label: 'Medical', color: '#4ECDC4', x: 140, y: 30 },
    { icon: 'diamond-stone', label: 'Valuables', color: '#45B7D1', x: 260, y: 10 },
    { icon: 'cellphone', label: 'Electronics', color: '#96CEB4', x: 50, y: 120 },
    { icon: 'car', label: 'Vehicles', color: '#FECA57', x: 180, y: 140 },
    { icon: 'file-document', label: 'Documents', color: '#9C88FF', x: 280, y: 100 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated Color Shift Overlay */}
      <Animated.View
        style={[styles.backgroundOverlay, { opacity: backgroundOpacity }]}
      />

      {/* Stars Background */}
      <View style={styles.starsContainer}>
        {[...Array(50)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: Math.random() * SCREEN_WIDTH,
                top: Math.random() * SCREEN_HEIGHT,
                opacity: 0.2 + Math.random() * 0.5,
                width: 1 + Math.random() * 2,
                height: 1 + Math.random() * 2,
              },
            ]}
          />
        ))}
      </View>

      {/* Skip Button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + 10 }]}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* FIXED ANIMATED ELEMENTS LAYER */}
      <View style={styles.fixedLayer} pointerEvents="none">
        {/* PAGE 1: Welcome */}
        <Animated.View
          style={[
            styles.centeredContent,
            {
              opacity: welcomeOpacity,
              transform: [{ scale: welcomeScale }, { translateY: floatAnim }],
            },
          ]}
        >
          <View style={styles.logoGlow} />
          <View style={styles.logoBubble}>
            <MaterialCommunityIcons name="shield-home" size={60} color="#4ADE80" />
          </View>
          <Text style={styles.logoText}>FAMILYKNOWS</Text>
          <Text style={styles.mainHeading}>Your Family's{'\n'}Digital Vault</Text>
          <Text style={styles.subHeading}>Scroll to discover</Text>
          <MaterialCommunityIcons
            name="chevron-double-down"
            size={28}
            color="rgba(255,255,255,0.4)"
            style={{ marginTop: 20 }}
          />
        </Animated.View>

        {/* PAGE 2: Features */}
        <Animated.View
          style={[
            styles.centeredContent,
            {
              opacity: featuresOpacity,
              transform: [{ translateY: featuresTranslateY }],
            },
          ]}
        >
          <Text style={styles.sectionSubtitle}>WHY FAMILYKNOWS?</Text>
          <Text style={styles.sectionTitle}>Everything in One Place</Text>
          <View style={styles.featuresContainer}>
            {features.map((feature, idx) => (
              <GlassFeatureCard
                key={idx}
                icon={feature.icon}
                text={feature.text}
                delay={idx * 100}
                scrollY={scrollY}
                baseOffset={SCREEN_HEIGHT}
              />
            ))}
          </View>
        </Animated.View>

        {/* PAGE 3: Security */}
        <Animated.View
          style={[
            styles.centeredContent,
            {
              opacity: securityOpacity,
              transform: [{ scale: shieldScale }],
            },
          ]}
        >
          <View style={styles.shieldGlow} />
          <MaterialCommunityIcons name="shield-lock" size={80} color="#4ADE80" />
          <Text style={styles.sectionSubtitle}>BANK-GRADE SECURITY</Text>
          <Text style={styles.sectionTitle}>Your Privacy, Our Priority</Text>
          <View style={styles.featuresContainer}>
            {securityFeatures.map((feature, idx) => (
              <GlassFeatureCard
                key={idx}
                icon={feature.icon}
                text={feature.text}
                delay={idx * 100}
                scrollY={scrollY}
                baseOffset={SCREEN_HEIGHT * 2}
              />
            ))}
          </View>
        </Animated.View>

        {/* PAGE 4: Categories */}
        <Animated.View
          style={[
            styles.centeredContent,
            {
              opacity: categoriesOpacity,
              transform: [{ scale: categoriesScale }],
            },
          ]}
        >
          <Text style={styles.sectionSubtitle}>BEYOND JUST ASSETS</Text>
          <Text style={styles.sectionTitle}>Everything Your{'\n'}Family Needs</Text>

          {/* Floating Bubbles */}
          <View style={styles.bubblesContainer}>
            {categories.map((cat, idx) => (
              <FloatingBubble
                key={idx}
                icon={cat.icon}
                label={cat.label}
                color={cat.color}
                delay={idx * 80}
                x={cat.x - 60}
                y={cat.y}
              />
            ))}
            {/* Center Hub */}
            <View style={styles.centerHub}>
              <FontAwesome5 name="infinity" size={24} color="#FFF" />
              <Text style={styles.hubText}>& More</Text>
            </View>
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* SCROLLABLE CONTENT LAYER */}
      <Animated.ScrollView
        contentContainerStyle={{ height: TOTAL_HEIGHT }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Empty scroll area - content is in fixed layer */}
        <View style={{ height: TOTAL_HEIGHT }} />
      </Animated.ScrollView>

      {/* Scroll Progress Indicator */}
      <View style={[styles.progressContainer, { bottom: insets.bottom + 20 }]}>
        <Animated.View
          style={[
            styles.progressDot,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT],
                outputRange: [1, 0.3, 0.3],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.progressDot,
            {
              opacity: scrollY.interpolate({
                inputRange: [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT, SCREEN_HEIGHT * 1.5],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.progressDot,
            {
              opacity: scrollY.interpolate({
                inputRange: [SCREEN_HEIGHT * 1.5, SCREEN_HEIGHT * 2, SCREEN_HEIGHT * 2.5],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.progressDot,
            {
              opacity: scrollY.interpolate({
                inputRange: [SCREEN_HEIGHT * 2.5, SCREEN_HEIGHT * 3, SCREEN_HEIGHT * 3.5],
                outputRange: [0.3, 1, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4F46E5',
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  fixedLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContent: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 30,
    width: '100%',
  },

  // Logo Section
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    top: -20,
  },
  logoBubble: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ADE80',
    letterSpacing: 4,
    marginBottom: 12,
  },
  mainHeading: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subHeading: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },

  // Section Styles
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ADE80',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 36,
  },

  // Glass Cards
  featuresContainer: {
    width: '100%',
    gap: 12,
  },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  glassCardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    flex: 1,
  },

  // Shield Glow
  shieldGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    top: -35,
  },

  // Floating Bubbles
  bubblesContainer: {
    width: SCREEN_WIDTH - 60,
    height: 220,
    position: 'relative',
    marginBottom: 40,
  },
  floatingBubble: {
    position: 'absolute',
    alignItems: 'center',
  },
  bubbleInner: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  centerHub: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -35,
    marginTop: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  hubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 2,
  },

  // Get Started Button
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  // Progress Indicator
  progressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
});

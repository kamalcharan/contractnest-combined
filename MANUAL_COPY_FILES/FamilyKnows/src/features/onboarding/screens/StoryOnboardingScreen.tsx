// src/features/onboarding/screens/StoryOnboardingScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Button } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ACT SCROLL POINTS
const TOTAL_HEIGHT = SCREEN_HEIGHT * 4;

export const StoryOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Animation Values
  const scrollY = useRef(new Animated.Value(0)).current;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [spaceName, setSpaceName] = useState('');

  // Floating animation for seed
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

  // --- INTERPOLATIONS ---

  // Act 1: The Seed (Opacity & Scale)
  const seedOpacity = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const seedScale = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.5],
    outputRange: [1, 2.5],
    extrapolate: 'clamp',
  });

  // Act 2: The Tree (Growth)
  const treeGrowth = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 1.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const treeOpacity = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 0.3, SCREEN_HEIGHT * 0.6],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const treeTranslateY = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 1.5],
    outputRange: [50, 0],
    extrapolate: 'clamp',
  });

  // Act 3: Assets (Pop up from bottom)
  const assetsOpacity = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 1.5, SCREEN_HEIGHT * 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const assetsTranslateY = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 1.5, SCREEN_HEIGHT * 2.2],
    outputRange: [100, 0],
    extrapolate: 'clamp',
  });

  // Act 4: Shield (Scale In)
  const shieldOpacity = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 2.5, SCREEN_HEIGHT * 3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const shieldScale = scrollY.interpolate({
    inputRange: [SCREEN_HEIGHT * 2.5, SCREEN_HEIGHT * 3.2],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  // Background color shift
  const backgroundOpacity = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 3],
    outputRange: [0, 0.3],
    extrapolate: 'clamp',
  });

  const handleFinish = () => {
    // Navigate to Signup with captured data
    navigation.replace('Signup', {
      prefillFirstName: firstName,
      prefillLastName: lastName,
      prefillSpaceName: spaceName,
    });
  };

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
        style={[
          styles.backgroundOverlay,
          { opacity: backgroundOpacity }
        ]}
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
              }
            ]}
          />
        ))}
      </View>

      {/* FIXED ANIMATED ELEMENTS LAYER */}
      <View style={styles.fixedLayer} pointerEvents="none">

        {/* ACT 1: THE SEED (You) */}
        <Animated.View style={[
          styles.centeredElement,
          {
            opacity: seedOpacity,
            transform: [
              { scale: seedScale },
              { translateY: floatAnim }
            ]
          }
        ]}>
          <View style={styles.seedGlow} />
          <MaterialCommunityIcons name="seed-outline" size={80} color="#4ADE80" />
          <Text style={styles.actTitle}>It starts with you.</Text>
        </Animated.View>

        {/* ACT 2: THE TREE (Family) */}
        <Animated.View style={[
          styles.treeContainer,
          {
            opacity: treeOpacity,
            transform: [
              { scaleY: treeGrowth },
              { translateY: treeTranslateY }
            ]
          }
        ]}>
          {/* Trunk */}
          <View style={styles.trunk} />
          {/* Branches */}
          <View style={[styles.branch, styles.branchLeft]} />
          <View style={[styles.branch, styles.branchRight]} />

          {/* Avatar Leaves */}
          <View style={[styles.leaf, styles.leafTop]}>
            <MaterialCommunityIcons name="account" size={20} color="#FFF" />
          </View>
          <View style={[styles.leaf, styles.leafLeft]}>
            <MaterialCommunityIcons name="account" size={18} color="#FFF" />
          </View>
          <View style={[styles.leaf, styles.leafRight]}>
            <MaterialCommunityIcons name="account" size={18} color="#FFF" />
          </View>
        </Animated.View>

        {/* ACT 3: ASSETS (Roots) */}
        <Animated.View style={[
          styles.assetsContainer,
          {
            opacity: assetsOpacity,
            transform: [{ translateY: assetsTranslateY }]
          }
        ]}>
          <Text style={styles.assetLabel}>Your assets. Protected.</Text>
          <View style={styles.assetRow}>
            <View style={[styles.assetBubble, { backgroundColor: '#F59E0B' }]}>
              <MaterialCommunityIcons name="home-city" size={28} color="#FFF" />
            </View>
            <View style={[styles.assetBubble, { backgroundColor: '#3B82F6' }]}>
              <MaterialCommunityIcons name="car-sports" size={28} color="#FFF" />
            </View>
            <View style={[styles.assetBubble, { backgroundColor: '#EC4899' }]}>
              <MaterialCommunityIcons name="gold" size={28} color="#FFF" />
            </View>
            <View style={[styles.assetBubble, { backgroundColor: '#10B981' }]}>
              <MaterialCommunityIcons name="file-document" size={28} color="#FFF" />
            </View>
          </View>
        </Animated.View>

        {/* ACT 4: SHIELD */}
        <Animated.View style={[
          styles.shieldContainer,
          {
            opacity: shieldOpacity,
            transform: [{ scale: shieldScale }]
          }
        ]}>
          <View style={styles.shieldGlow} />
          <MaterialCommunityIcons name="shield-check" size={120} color="#4ADE80" />
          <Text style={styles.shieldText}>Secure. Private. Yours.</Text>
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
        keyboardShouldPersistTaps="handled"
      >
        {/* PAGE 1: INTRO */}
        <View style={[styles.page, { paddingTop: insets.top }]}>
          <View style={styles.textBlock}>
            <Text style={styles.logoText}>FamilyKnows</Text>
            <Text style={styles.mainHeading}>Build your legacy.</Text>
            <Text style={styles.subHeading}>One scroll to begin the journey.</Text>
          </View>
          <View style={styles.scrollHint}>
            <MaterialCommunityIcons name="chevron-double-down" size={32} color="rgba(255,255,255,0.4)" />
            <Text style={styles.scrollHintText}>Scroll to explore</Text>
          </View>
        </View>

        {/* PAGE 2: NAME INPUT */}
        <View style={styles.page}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputWrapper}
          >
            <View style={styles.inputCard}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="account-circle-outline" size={40} color="#4ADE80" />
              </View>
              <Text style={styles.cardTitle}>Who are you?</Text>
              <Text style={styles.cardSubtitle}>The seed that starts the tree.</Text>
              <TextInput
                placeholder="First name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.textInput}
                autoCapitalize="words"
              />
              <TextInput
                placeholder="Last name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={lastName}
                onChangeText={setLastName}
                style={[styles.textInput, { marginTop: 16 }]}
                autoCapitalize="words"
              />
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* PAGE 3: FAMILY SPACE NAME */}
        <View style={styles.page}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputWrapper}
          >
            <View style={styles.inputCard}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="family-tree" size={40} color="#8B5CF6" />
              </View>
              <Text style={styles.cardTitle}>Name your space.</Text>
              <Text style={styles.cardSubtitle}>Your family's digital identity.</Text>
              <TextInput
                placeholder="e.g. The Charan Family"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={spaceName}
                onChangeText={setSpaceName}
                style={styles.textInput}
                autoCapitalize="words"
              />
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* PAGE 4: FINISH */}
        <View style={styles.page}>
          <View style={styles.finalCard}>
            <View style={styles.finalIconRow}>
              <MaterialCommunityIcons name="shield-check" size={48} color="#4ADE80" />
            </View>
            <Text style={styles.finalTitle}>Your Vault Awaits</Text>
            <Text style={styles.finalSub}>
              {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
            </Text>
            {spaceName && (
              <Text style={styles.familyNameDisplay}>{spaceName}</Text>
            )}
            <TouchableOpacity
              style={[
                styles.finishButton,
                (!firstName || !lastName || !spaceName) && styles.finishButtonDisabled
              ]}
              onPress={handleFinish}
              disabled={!firstName || !lastName || !spaceName}
              activeOpacity={0.8}
            >
              <Text style={styles.finishButtonText}>Continue to Signup</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
            </TouchableOpacity>
            {(!firstName || !lastName || !spaceName) && (
              <Text style={styles.hintText}>
                Scroll up to fill in your details
              </Text>
            )}
          </View>
        </View>

      </Animated.ScrollView>
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
  fixedLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredElement: {
    alignItems: 'center',
    position: 'absolute',
  },
  seedGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  actTitle: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
    opacity: 0.8,
    letterSpacing: 1,
  },

  // Tree Styles
  treeContainer: {
    width: 180,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
  },
  trunk: {
    width: 8,
    height: 120,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  branch: {
    position: 'absolute',
    height: 4,
    width: 50,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
    top: 70,
  },
  branchLeft: {
    left: 45,
    transform: [{ rotate: '-35deg' }],
  },
  branchRight: {
    right: 45,
    transform: [{ rotate: '35deg' }],
  },
  leaf: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  leafTop: { top: 0, backgroundColor: '#10B981' },
  leafLeft: { top: 55, left: 25, backgroundColor: '#3B82F6' },
  leafRight: { top: 55, right: 25, backgroundColor: '#EC4899' },

  // Assets Styles
  assetsContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  assetLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },
  assetRow: {
    flexDirection: 'row',
    gap: 16,
  },
  assetBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Shield
  shieldContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  shieldGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  shieldText: {
    color: '#4ADE80',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Scroll Content
  page: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.35,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ADE80',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  mainHeading: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    textAlign: 'center',
  },
  scrollHint: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  scrollHintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },

  // Input Cards
  inputWrapper: {
    width: '100%',
    marginTop: SCREEN_HEIGHT * 0.3,
  },
  inputCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 24,
  },
  textInput: {
    fontSize: 18,
    color: '#FFF',
    borderBottomWidth: 2,
    borderBottomColor: '#4ADE80',
    paddingVertical: 12,
  },

  // Final Card
  finalCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: 36,
    borderRadius: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  finalIconRow: {
    marginBottom: 20,
  },
  finalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  finalSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  familyNameDisplay: {
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 28,
  },
  finishButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButtonDisabled: {
    backgroundColor: 'rgba(79, 70, 229, 0.4)',
    shadowOpacity: 0,
  },
  finishButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  hintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 16,
  },
});

// src/features/onboarding/screens/GenderSelectionScreen.tsx
// Gender selection step for FamilyKnows onboarding

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
import api from '../../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type GenderSelectionScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'GenderSelection'>;
type GenderSelectionScreenRouteProp = RouteProp<AuthStackParamList, 'GenderSelection'>;

type GenderOption = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

const GENDER_OPTIONS: GenderOption[] = [
  { id: 'male', label: 'Male', icon: 'gender-male', color: '#60A5FA' },
  { id: 'female', label: 'Female', icon: 'gender-female', color: '#F472B6' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'account-question', color: '#A78BFA' },
];

export const GenderSelectionScreen: React.FC = () => {
  const navigation = useNavigation<GenderSelectionScreenNavigationProp>();
  const route = useRoute<GenderSelectionScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const isFromSettings = route?.params?.isFromSettings || false;

  // State
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(GENDER_OPTIONS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Entrance animation
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

    // Floating animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
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

  const handleSelectGender = (index: number, genderId: string) => {
    setSelectedGender(genderId);
    setError('');

    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selectedGender) {
      setError('Please select an option');
      return;
    }

    setIsLoading(true);
    try {
      // Call FKonboarding API to complete gender step
      await api.post('/api/FKonboarding/complete-step', {
        stepId: 'gender',
        data: {
          gender: selectedGender,
          user_id: user?.id,
        },
      });

      // Navigate to next step (Theme Selection)
      if (isFromSettings) {
        navigation.goBack();
      } else {
        navigation.navigate('ThemeSelection', {
          isFromSettings: false,
          ...route.params,
        });
      }
    } catch (err: any) {
      console.error('Error saving gender:', err);
      setError(err.message || 'Failed to save selection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('ThemeSelection', {
      isFromSettings: false,
      ...route.params,
    });
  };

  const renderGenderOption = (option: GenderOption, index: number) => {
    const isSelected = selectedGender === option.id;

    return (
      <Animated.View
        key={option.id}
        style={[
          { transform: [{ scale: scaleAnims[index] }] },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.genderOption,
            isSelected && styles.genderOptionSelected,
            isSelected && { borderColor: option.color },
          ]}
          onPress={() => handleSelectGender(index, option.id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.genderIconContainer,
              isSelected && { backgroundColor: `${option.color}20` },
            ]}
          >
            <MaterialCommunityIcons
              name={option.icon as any}
              size={32}
              color={isSelected ? option.color : 'rgba(255,255,255,0.5)'}
            />
          </View>
          <Text
            style={[
              styles.genderLabel,
              isSelected && { color: '#FFF', fontWeight: '600' },
            ]}
          >
            {option.label}
          </Text>
          {isSelected && (
            <View style={[styles.checkCircle, { backgroundColor: option.color }]}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
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

      {/* Progress Indicator */}
      <View style={[styles.progressContainer, { top: insets.top + 20 }]}>
        <View style={styles.progressDots}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 3 of 6</Text>
      </View>

      {/* Skip Button */}
      {!isFromSettings && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + 20 }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ translateY: floatAnim }] },
            ]}
          >
            <View style={styles.iconGlow} />
            <MaterialCommunityIcons name="account-heart" size={48} color="#A78BFA" />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>How do you identify?</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your experience
          </Text>

          {/* Gender Options */}
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((option, index) => renderGenderOption(option, index))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Privacy Note */}
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark" size={14} color="#A78BFA" />
            <Text style={styles.privacyText}>This information is private and secure</Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              isLoading && styles.buttonLoading,
              !selectedGender && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={isLoading || !selectedGender}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.continueButtonText}>Saving...</Text>
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#0F172A" />
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
    backgroundColor: '#A78BFA',
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
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(30, 41, 59, 1)',
  },
  genderIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  genderLabel: {
    flex: 1,
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  privacyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78BFA',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(167, 139, 250, 0.5)',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default GenderSelectionScreen;

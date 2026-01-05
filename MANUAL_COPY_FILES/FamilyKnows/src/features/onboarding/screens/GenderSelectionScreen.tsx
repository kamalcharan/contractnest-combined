// src/features/onboarding/screens/GenderSelectionScreen.tsx
// Storyboard-style gender selection screen

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
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

type GenderSelectionNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'GenderSelection'>;
type GenderSelectionRouteProp = RouteProp<AuthStackParamList, 'GenderSelection'>;

type GenderOption = {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

const genderOptions: GenderOption[] = [
  { id: 'male', label: 'Male', icon: 'gender-male', color: '#3B82F6' },
  { id: 'female', label: 'Female', icon: 'gender-female', color: '#EC4899' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'account-question-outline', color: '#8B5CF6' },
];

export const GenderSelectionScreen: React.FC = () => {
  const navigation = useNavigation<GenderSelectionNavigationProp>();
  const route = useRoute<GenderSelectionRouteProp>();
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
  const optionAnims = genderOptions.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    // Main content animation
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

    // Floating icon animation
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

    // Stagger option animations
    optionAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const handleContinue = async () => {
    if (!selectedGender) {
      // Allow continuing without selection
      navigation.navigate('ThemeSelection', { isFromSettings: false });
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

      if (isFromSettings) {
        navigation.goBack();
      } else {
        navigation.navigate('ThemeSelection', { isFromSettings: false });
      }
    } catch (err: any) {
      console.error('Error saving gender:', err);
      setError(err.message || 'Failed to save gender');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('ThemeSelection', { isFromSettings: false });
  };

  const handleSelectGender = (genderId: string) => {
    setSelectedGender(selectedGender === genderId ? null : genderId);
    setError('');
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
        </View>
        <Text style={styles.stepText}>Step 3 of 5</Text>
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
          <MaterialCommunityIcons name="gender-male-female" size={48} color="#8B5CF6" />
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>What's your gender?</Text>
        <Text style={styles.subtitle}>This helps personalize your experience</Text>

        {/* Gender Options */}
        <View style={styles.optionsContainer}>
          {genderOptions.map((option, index) => (
            <Animated.View
              key={option.id}
              style={{
                opacity: optionAnims[index],
                transform: [
                  {
                    translateY: optionAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedGender === option.id && styles.optionCardSelected,
                  selectedGender === option.id && { borderColor: option.color },
                ]}
                onPress={() => handleSelectGender(option.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: `${option.color}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={28}
                    color={option.color}
                  />
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {selectedGender === option.id && (
                  <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.buttonLoading]}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <Text style={styles.continueButtonText}>Saving...</Text>
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
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
    backgroundColor: '#8B5CF6',
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
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
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#8B5CF6',
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
    color: '#FFF',
  },
});

export default GenderSelectionScreen;

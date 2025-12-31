// src/features/onboarding/screens/LanguageSetupScreen.tsx
// Storyboard-style language selection with English default

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

type LanguageSetupNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'LanguageSelection'>;
type LanguageSetupRouteProp = RouteProp<AuthStackParamList, 'LanguageSelection'>;

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

export const LanguageSetupScreen: React.FC = () => {
  const navigation = useNavigation<LanguageSetupNavigationProp>();
  const route = useRoute<LanguageSetupRouteProp>();
  const insets = useSafeAreaInsets();
  const { user, currentTenant } = useAuth();

  const isFromSettings = route?.params?.isFromSettings || false;

  // Default to English
  const [selectedLanguage, setSelectedLanguage] = useState('en');
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

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Save to API
      await api.post('/api/FKonboarding/step', {
        step_id: 'language',
        tenant_id: currentTenant?.id,
        user_id: user?.id,
        data: {
          language: selectedLanguage,
          user_id: user?.id,
        },
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

  const renderLanguageItem = (lang: Language) => {
    const isSelected = selectedLanguage === lang.code;

    return (
      <TouchableOpacity
        key={lang.code}
        style={[
          styles.languageItem,
          isSelected && styles.languageItemSelected,
        ]}
        onPress={() => setSelectedLanguage(lang.code)}
        activeOpacity={0.8}
      >
        <Text style={styles.languageFlag}>{lang.flag}</Text>
        <View style={styles.languageText}>
          <Text style={styles.languageName}>{lang.name}</Text>
          <Text style={styles.languageNative}>{lang.nativeName}</Text>
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
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
        <Text style={styles.stepText}>Step 4 of 4</Text>
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}
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
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="translate" size={48} color="#3B82F6" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Select Language</Text>
          <Text style={styles.subtitle}>Choose your preferred language</Text>

          {/* Language List */}
          <View style={styles.languageList}>
            {LANGUAGES.map(renderLanguageItem)}
          </View>

          {/* Finish Button */}
          <TouchableOpacity
            style={[styles.finishButton, isLoading && styles.buttonLoading]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.finishButtonText}>Setting up...</Text>
            ) : (
              <>
                <Text style={styles.finishButtonText}>Get Started</Text>
                <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Welcome Text */}
          <Text style={styles.welcomeText}>
            You're all set! Welcome to FamilyKnows.
          </Text>
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

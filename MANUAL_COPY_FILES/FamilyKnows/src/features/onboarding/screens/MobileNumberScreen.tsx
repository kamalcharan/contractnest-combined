// src/features/onboarding/screens/MobileNumberScreen.tsx
// Storyboard-style mobile number capture (no OTP)

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { countryCodes } from '../../../constants/countryCodes';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type MobileNumberScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PhoneAuth'>;
type MobileNumberScreenRouteProp = RouteProp<AuthStackParamList, 'PhoneAuth'>;

export const MobileNumberScreen: React.FC = () => {
  const navigation = useNavigation<MobileNumberScreenNavigationProp>();
  const route = useRoute<MobileNumberScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { user, currentTenant } = useAuth();

  const isFromSettings = route?.params?.isFromSettings || false;

  // State
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodes.find(c => c.code === 'IN') || countryCodes[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  const validatePhone = () => {
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = async () => {
    if (!validatePhone()) return;

    setIsLoading(true);
    try {
      // Call FKonboarding API to update mobile step
      await api.post('/api/FKonboarding/step', {
        step_id: 'mobile',
        tenant_id: currentTenant?.id,
        user_id: user?.id,
        data: {
          country_code: selectedCountry.dialCode,
          mobile_number: phoneNumber,
          user_id: user?.id,
        },
      });

      // Navigate to next step
      if (isFromSettings) {
        navigation.goBack();
      } else {
        navigation.navigate('UserProfile', {
          isFromSettings: false,
        });
      }
    } catch (err: any) {
      console.error('Error saving mobile:', err);
      setError(err.message || 'Failed to save mobile number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('UserProfile', {
      isFromSettings: false,
    });
  };

  const renderCountryItem = ({ item }: { item: typeof countryCodes[0] }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setSelectedCountry(item);
        setShowCountryPicker(false);
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryCode}>{item.dialCode}</Text>
    </TouchableOpacity>
  );

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
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 1 of 4</Text>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
              <MaterialCommunityIcons name="phone-outline" size={48} color="#4ADE80" />
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>Your Mobile Number</Text>
            <Text style={styles.subtitle}>
              We'll use this to keep your family connected
            </Text>

            {/* Glass Card */}
            <View style={styles.glassCard}>
              {/* Country Code Selector */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>

              {/* Phone Input */}
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text.replace(/[^0-9]/g, ''));
                    if (error) setError('');
                  }}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Info Text */}
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={14} color="#4ADE80" />
                <Text style={styles.infoText}>Your number is encrypted and secure</Text>
              </View>
            </View>

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
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#0F172A" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countryCodes}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#4ADE80',
    width: 24,
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
  keyboardView: {
    flex: 1,
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
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
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
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 32,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 10,
  },
  countryFlag: {
    fontSize: 24,
  },
  dialCode: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
  },
  phoneInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  phoneInput: {
    fontSize: 18,
    color: '#FFF',
    letterSpacing: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ADE80',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#4ADE80',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
  },
  countryCode: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default MobileNumberScreen;

// src/features/onboarding/screens/PhoneAuthScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  Easing,
} from 'react-native';
import { Text, Input, Button } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { countryCodes } from '../../../constants/countryCodes';
import CountryCodePicker from '../components/CountryCodePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PhoneAuthNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'PhoneAuth'>;
type PhoneAuthRouteProp = RouteProp<OnboardingStackParamList, 'PhoneAuth'>;

interface Props {
  navigation: PhoneAuthNavigationProp;
  route: PhoneAuthRouteProp;
}

interface SavedPhoneNumber {
  countryCode: string;
  dialCode: string;
  phoneNumber: string;
  isPrimary: boolean;
  isVerified: boolean;
}

const PHONE_NUMBERS_KEY = '@FamilyKnows:phoneNumbers';

export const PhoneAuthScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const isFromSettings = route?.params?.isFromSettings || false;

  // Extract prefill data to carry forward
  const { prefillName, prefillFamily } = route?.params || {};
  
  // State
  const [mode, setMode] = useState<'list' | 'add' | 'verify'>('list');
  const [savedNumbers, setSavedNumbers] = useState<SavedPhoneNumber[]>([]);
  const [editingNumber, setEditingNumber] = useState<SavedPhoneNumber | null>(null);
  
  // Phone number state
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // OTP input refs
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Load saved phone numbers
  useEffect(() => {
    loadSavedNumbers();
  }, []);

  useEffect(() => {
    // Determine initial mode
    if (!isFromSettings && savedNumbers.length === 0) {
      // First time onboarding
      setMode('add');
    } else if (isFromSettings && savedNumbers.length > 0) {
      // Coming from settings with existing numbers
      setMode('list');
    } else if (isFromSettings && savedNumbers.length === 0) {
      // Coming from settings but no numbers saved
      setMode('add');
    }
  }, [isFromSettings, savedNumbers]);

  useEffect(() => {
    if (mode === 'verify') {
      // Animate OTP section appearance
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Focus first OTP input
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 350);
    }
  }, [mode, fadeAnim]);

  useEffect(() => {
    // Timer countdown
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (mode === 'verify' && timer === 0) {
      setCanResend(true);
    }
  }, [timer, mode]);

  const loadSavedNumbers = async () => {
    try {
      const saved = await AsyncStorage.getItem(PHONE_NUMBERS_KEY);
      if (saved) {
        setSavedNumbers(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved numbers:', error);
    }
  };

  const savePhoneNumbers = async (numbers: SavedPhoneNumber[]) => {
    try {
      await AsyncStorage.setItem(PHONE_NUMBERS_KEY, JSON.stringify(numbers));
      setSavedNumbers(numbers);
    } catch (error) {
      console.error('Error saving phone numbers:', error);
    }
  };

  const validatePhone = () => {
    if (phoneNumber.length < 10) {
      setPhoneError('Please enter a valid phone number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleAddNumber = () => {
    setMode('add');
    setPhoneNumber('');
    setEditingNumber(null);
  };

  const handleEditNumber = (number: SavedPhoneNumber) => {
    setEditingNumber(number);
    setPhoneNumber(number.phoneNumber);
    const country = countryCodes.find(c => c.dialCode === number.dialCode);
    if (country) setSelectedCountry(country);
    setMode('add');
  };

  const handleDeleteNumber = (number: SavedPhoneNumber) => {
    Alert.alert(
      'Delete Phone Number',
      `Are you sure you want to delete ${number.dialCode} ${number.phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = savedNumbers.filter(
              n => n.phoneNumber !== number.phoneNumber || n.dialCode !== number.dialCode
            );
            await savePhoneNumbers(updated);
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (number: SavedPhoneNumber) => {
    const updated = savedNumbers.map(n => ({
      ...n,
      isPrimary: n.phoneNumber === number.phoneNumber && n.dialCode === number.dialCode,
    }));
    await savePhoneNumbers(updated);
  };

  const handleSendOTP = () => {
    if (validatePhone()) {
      setMode('verify');
      setTimer(45); // 45 second timer
      setCanResend(false);
      // Mock OTP send
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-verify when all digits are entered
    if (index === 3 && value) {
      const otpString = newOtp.join('');
      if (otpString.length === 4) {
        handleVerify(otpString);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async (otpString?: string) => {
    const code = otpString || otp.join('');
    
    // Mock verification - accept any 4 digits
    if (code.length === 4) {
      const newNumber: SavedPhoneNumber = {
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        phoneNumber: phoneNumber,
        isPrimary: savedNumbers.length === 0 || (editingNumber?.isPrimary ?? false),
        isVerified: true,
      };

      let updated: SavedPhoneNumber[];
      if (editingNumber) {
        // Update existing number
        updated = savedNumbers.map(n => 
          (n.phoneNumber === editingNumber.phoneNumber && n.dialCode === editingNumber.dialCode)
            ? newNumber
            : n
        );
      } else {
        // Add new number
        updated = [...savedNumbers, newNumber];
      }

      await savePhoneNumbers(updated);

      if (isFromSettings) {
        navigation.goBack();
      } else {
        // Pass prefill data forward to UserProfile
        navigation.navigate('UserProfile', {
          isFromSettings: false,
          prefillName,
          prefillFamily,
        });
      }
    }
  };

  const handleResend = () => {
    setTimer(45);
    setCanResend(false);
    setOtp(['', '', '', '']);
    inputRefs[0].current?.focus();
    // Mock OTP resend
  };

  const handleSkip = () => {
    // Pass prefill data forward even when skipping
    navigation.navigate('UserProfile', {
      isFromSettings: false,
      prefillName,
      prefillFamily,
    });
  };

  const handleBack = () => {
    if (mode === 'verify') {
      setMode('add');
      setOtp(['', '', '', '']);
      setTimer(0);
      fadeAnim.setValue(0);
    } else if (mode === 'add' && savedNumbers.length > 0) {
      setMode('list');
    } else {
      navigation.goBack();
    }
  };

  const renderPhoneList = () => (
    <View style={styles.listContainer}>
      <Text style={[styles.listTitle, { color: theme.colors.utility.primaryText }]}>
        Your Phone Numbers
      </Text>
      
      {savedNumbers.map((number, index) => (
        <View
          key={index}
          style={[
            styles.phoneCard,
            { backgroundColor: theme.colors.utility.secondaryBackground }
          ]}
        >
          <View style={styles.phoneCardLeft}>
            <View style={styles.phoneCardNumber}>
              <Text style={[styles.phoneCardCountry, { color: theme.colors.utility.secondaryText }]}>
                {number.dialCode}
              </Text>
              <Text style={[styles.phoneCardPhone, { color: theme.colors.utility.primaryText }]}>
                {number.phoneNumber}
              </Text>
            </View>
            {number.isPrimary && (
              <View style={[styles.primaryBadge, { backgroundColor: theme.colors.brand.primary + '20' }]}>
                <Text style={[styles.primaryText, { color: theme.colors.brand.primary }]}>
                  Primary
                </Text>
              </View>
            )}
            {number.isVerified && (
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={theme.colors.semantic.success}
              />
            )}
          </View>
          
          <View style={styles.phoneCardActions}>
            {!number.isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSetPrimary(number)}
              >
                <MaterialCommunityIcons
                  name="star-outline"
                  size={20}
                  color={theme.colors.utility.secondaryText}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditNumber(number)}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={theme.colors.brand.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteNumber(number)}
            >
              <MaterialCommunityIcons
                name="delete"
                size={20}
                color={theme.colors.semantic.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      <Button
        title="Add New Number"
        onPress={handleAddNumber}
        buttonStyle={[
          styles.addButton,
          { backgroundColor: theme.colors.brand.primary }
        ]}
        titleStyle={styles.addButtonText}
        icon={
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
        }
      />
    </View>
  );

  const renderAddNumber = () => (
    <View style={styles.phoneSection}>
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={[
            styles.countryCodeButton,
            { backgroundColor: theme.colors.utility.secondaryBackground }
          ]}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={[styles.countryFlag, { color: theme.colors.utility.primaryText }]}>
            {selectedCountry.flag}
          </Text>
          <Text style={[styles.countryCode, { color: theme.colors.utility.primaryText }]}>
            {selectedCountry.dialCode}
          </Text>
          <MaterialCommunityIcons 
            name="chevron-down" 
            size={20} 
            color={theme.colors.utility.secondaryText} 
          />
        </TouchableOpacity>

        <Input
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={10}
          containerStyle={styles.phoneInputContainer}
          inputContainerStyle={[
            styles.phoneInput,
            { 
              backgroundColor: theme.colors.utility.secondaryBackground,
              borderColor: phoneError ? theme.colors.semantic.error : 'transparent'
            }
          ]}
          inputStyle={{ color: theme.colors.utility.primaryText }}
          errorMessage={phoneError}
          errorStyle={{ color: theme.colors.semantic.error }}
        />
      </View>

      <Button
        title={editingNumber ? "Update & Verify" : "Send OTP"}
        onPress={handleSendOTP}
        buttonStyle={[
          styles.primaryButton,
          { backgroundColor: theme.colors.brand.primary }
        ]}
        titleStyle={styles.primaryButtonText}
        disabled={phoneNumber.length === 0}
        disabledStyle={{ opacity: 0.5 }}
      />
    </View>
  );

  const renderOTP = () => (
    <Animated.View 
      style={[
        styles.otpSection,
        { opacity: fadeAnim }
      ]}
    >
      {/* OTP Input */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={inputRefs[index]}
            style={[
              styles.otpInput,
              {
                backgroundColor: theme.colors.utility.secondaryBackground,
                color: theme.colors.utility.primaryText,
                borderColor: digit ? theme.colors.brand.primary : 'transparent',
                borderWidth: digit ? 2 : 0,
              }
            ]}
            value={digit}
            onChangeText={(value) => handleOTPChange(value.replace(/[^0-9]/g, ''), index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
            textAlign="center"
          />
        ))}
      </View>

      {/* Timer and Actions */}
      <View style={styles.otpActions}>
        {!canResend ? (
          <Text style={[styles.timerText, { color: theme.colors.utility.secondaryText }]}>
            Resend code in {timer}s
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={[styles.resendText, { color: theme.colors.brand.primary }]}>
              Resend Code
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity onPress={handleBack}>
          <Text style={[styles.changeNumberText, { color: theme.colors.brand.secondary }]}>
            Change Number
          </Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Verify"
        onPress={() => handleVerify()}
        buttonStyle={[
          styles.primaryButton,
          { backgroundColor: theme.colors.brand.primary }
        ]}
        titleStyle={styles.primaryButtonText}
        disabled={otp.join('').length !== 4}
        disabledStyle={{ opacity: 0.5 }}
      />

      {/* Test info */}
      <Text style={[styles.infoText, { color: theme.colors.utility.secondaryText }]}>
        For testing, enter any 4 digits
      </Text>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.utility.primaryBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Bar - Only show during onboarding */}
        {!isFromSettings && mode !== 'list' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.colors.brand.primary,
                    width: '16.67%' // 1/6 steps
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.utility.secondaryText }]}>
              Step 1 of 6
            </Text>
          </View>
        )}

        {/* Back button for settings mode */}
        {isFromSettings && mode !== 'list' && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={theme.colors.utility.primaryText}
            />
            <Text style={[styles.backText, { color: theme.colors.utility.primaryText }]}>
              Back
            </Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            }
          ]}
        >
          <MaterialCommunityIcons
            name={mode === 'verify' ? "message-text-lock" : mode === 'list' ? "phone-settings" : "phone-check"}
            size={60}
            color={theme.colors.brand.primary}
          />
          <Text style={[styles.title, { color: theme.colors.utility.primaryText }]}>
            {mode === 'verify'
              ? 'Enter Verification Code'
              : mode === 'list'
              ? 'Manage Phone Numbers'
              : editingNumber
              ? 'Update Phone Number'
              : 'Verify Your Mobile'
            }
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.utility.secondaryText }]}>
            {mode === 'verify'
              ? `We've sent a 4-digit code to\n${selectedCountry.dialCode} ${phoneNumber}`
              : mode === 'list'
              ? 'Add or manage your phone numbers'
              : "Link your mobile number for account recovery and notifications"
            }
          </Text>
        </Animated.View>

        {/* Content based on mode */}
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
          {mode === 'list' && renderPhoneList()}
          {mode === 'add' && renderAddNumber()}
          {mode === 'verify' && renderOTP()}
        </Animated.View>

        {/* Skip Option - Only show during onboarding */}
        {!isFromSettings && savedNumbers.length === 0 && mode !== 'list' && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.colors.utility.secondaryText }]}>
              Set up Later
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Country Code Picker Modal */}
      <CountryCodePicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={(country) => {
          setSelectedCountry(country);
          setShowCountryPicker(false);
        }}
        selectedCountry={selectedCountry}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  progressContainer: {
    marginTop: 60,
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  listContainer: {
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  phoneCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  phoneCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneCardNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneCardCountry: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneCardPhone: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  phoneCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 5,
  },
  phoneInputContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  phoneInput: {
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  otpSection: {
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 15,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  otpActions: {
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  timerText: {
    fontSize: 14,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeNumberText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    borderRadius: 25,
    paddingVertical: 15,
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 10,
    marginTop: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
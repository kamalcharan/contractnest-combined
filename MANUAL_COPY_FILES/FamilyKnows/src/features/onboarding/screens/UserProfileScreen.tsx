// src/features/onboarding/screens/UserProfileScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Text, Input, Button } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import GenderSelector from '../components/GenderSelector';

type UserProfileNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'UserProfile'
>;

type UserProfileRouteProp = RouteProp<
  OnboardingStackParamList,
  'UserProfile'
>;

interface Props {
  navigation: UserProfileNavigationProp;
  route: UserProfileRouteProp;
}

export const UserProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { isFromSettings, prefillName, prefillFamily } = route.params;

  // Parse first and last name from prefillName
  const parseNames = (fullName?: string) => {
    if (!fullName) return { first: '', last: '' };
    const parts = fullName.trim().split(' ');
    return {
      first: parts[0] || '',
      last: parts.slice(1).join(' ') || '',
    };
  };

  const parsedNames = parseNames(prefillName);
  const [firstName, setFirstName] = useState(parsedNames.first);
  const [lastName, setLastName] = useState(parsedNames.last);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Save profile data via FKonboarding API
      await api.post('/api/FKonboarding/complete-step', {
        stepId: 'personal-profile',
        data: {
          first_name: firstName,
          last_name: lastName,
          gender: selectedGender,
          date_of_birth: dob?.toISOString(),
          profile_image: profileImage,
        },
      });

      // Show success message
      Alert.alert(
        'Success',
        'Profile saved successfully!',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (isFromSettings) {
                navigation.goBack();
              } else {
                navigation.navigate('GenderSelection', {
                  isFromSettings: false,
                  prefillFamily,
                });
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to save profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Pass prefillFamily forward even when skipping
    navigation.navigate('GenderSelection', {
      isFromSettings: false,
      prefillFamily,
    });
  };

  const pickImage = async () => {
    const options = ['Take Photo', 'Choose from Gallery', 'Cancel'];
    
    Alert.alert(
      'Select Profile Picture',
      '',
      [
        { text: options[0], onPress: takePhoto },
        { text: options[1], onPress: selectFromGallery },
        { text: options[2], style: 'cancel' },
      ],
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const selectFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.utility.primaryBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Bar - Only show during onboarding */}
        {!isFromSettings && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.colors.brand.primary,
                    width: '33.33%' // 2/6 steps
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.utility.secondaryText }]}>
              Step 2 of 6
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.utility.primaryText }]}>
            Create Your Profile
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.utility.secondaryText }]}>
            Tell us a bit about yourself
          </Text>
        </View>

        {/* Profile Image */}
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.brand.alternate }]}>
              <MaterialCommunityIcons 
                name="camera-plus" 
                size={40} 
                color={theme.colors.brand.primary} 
              />
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.colors.brand.primary }]}>
            <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Input
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            leftIcon={
              <MaterialCommunityIcons 
                name="account" 
                size={20} 
                color={theme.colors.utility.secondaryText} 
              />
            }
            containerStyle={styles.inputContainer}
            inputContainerStyle={[
              styles.input,
              { 
                backgroundColor: theme.colors.utility.secondaryBackground,
                borderColor: errors.firstName ? theme.colors.semantic.error : 'transparent'
              }
            ]}
            inputStyle={{ color: theme.colors.utility.primaryText }}
            errorMessage={errors.firstName}
            errorStyle={{ color: theme.colors.semantic.error }}
          />

          <Input
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            leftIcon={
              <MaterialCommunityIcons 
                name="account-outline" 
                size={20} 
                color={theme.colors.utility.secondaryText} 
              />
            }
            containerStyle={styles.inputContainer}
            inputContainerStyle={[
              styles.input,
              { 
                backgroundColor: theme.colors.utility.secondaryBackground,
                borderColor: errors.lastName ? theme.colors.semantic.error : 'transparent'
              }
            ]}
            inputStyle={{ color: theme.colors.utility.primaryText }}
            errorMessage={errors.lastName}
            errorStyle={{ color: theme.colors.semantic.error }}
          />

          {/* Gender Selection */}
          <View style={styles.genderContainer}>
            <Text style={[styles.fieldLabel, { color: theme.colors.utility.secondaryText }]}>
              Gender (Optional)
            </Text>
            <GenderSelector
              selectedGender={selectedGender}
              onSelectGender={setSelectedGender}
            />
          </View>

          {/* Date of Birth */}
          <View style={styles.dobContainer}>
            <Text style={[styles.fieldLabel, { color: theme.colors.utility.secondaryText }]}>
              Date of Birth (Optional)
            </Text>
            <TouchableOpacity 
              style={[
                styles.dobButton,
                { backgroundColor: theme.colors.utility.secondaryBackground }
              ]}
              onPress={() => {
                // For now, just set a mock date
                // TODO: Implement proper date picker
                setDob(new Date(2000, 0, 1));
                Alert.alert('Date Picker', 'Date picker will be implemented. For now, setting to Jan 1, 2000');
              }}
            >
              <MaterialCommunityIcons 
                name="calendar" 
                size={20} 
                color={theme.colors.utility.secondaryText} 
              />
              <Text style={[
                styles.dobText,
                { color: dob ? theme.colors.utility.primaryText : theme.colors.utility.secondaryText }
              ]}>
                {dob ? dob.toLocaleDateString() : 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Continue Button */}
        <Button
          title="Continue"
          onPress={handleContinue}
          buttonStyle={[
            styles.continueButton,
            { backgroundColor: theme.colors.brand.primary }
          ]}
          titleStyle={styles.continueButtonText}
        />

        {/* Skip Option - Only show during onboarding */}
        {!isFromSettings && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.colors.utility.secondaryText }]}>
              Set up Later
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 5,
  },
  genderContainer: {
    marginBottom: 20,
  },
  dobContainer: {
    marginBottom: 20,
  },
  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  dobText: {
    fontSize: 16,
    flex: 1,
  },
  continueButton: {
    borderRadius: 25,
    paddingVertical: 15,
    marginBottom: 20,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
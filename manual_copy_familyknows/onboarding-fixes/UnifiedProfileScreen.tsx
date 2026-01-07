// src/features/settings/screens/UnifiedProfileScreen.tsx
// Unified Profile View - All user settings in one place

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
// Single source of truth for languages
import { supportedLanguages } from '../../../constants/languages';

// Section Edit Modes
type EditSection = 'none' | 'personal' | 'preferences';

// Filter to English and Telugu only (as per i18n strategy)
const ENABLED_LANGUAGES = supportedLanguages.filter(
  lang => lang.code === 'en' || lang.code === 'te'
);

// Gender options
const GENDERS = [
  { id: 'male', label: 'Male', icon: 'gender-male' },
  { id: 'female', label: 'Female', icon: 'gender-female' },
  { id: 'other', label: 'Other', icon: 'gender-non-binary' },
];

export const UnifiedProfileScreen: React.FC = () => {
  const { theme, currentThemeId, isDarkMode, availableThemes, setTheme, toggleDarkMode } = useTheme();
  const { user, currentTenant, updateUser } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Edit mode state
  const [editSection, setEditSection] = useState<EditSection>('none');
  const [isSaving, setIsSaving] = useState(false);

  // Form state - Personal Info
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar_url || null);

  // Form state - Preferences
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isGDriveConnected, setIsGDriveConnected] = useState(false);

  // DatePicker state
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load saved preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  // Refresh language when screen comes into focus (after returning from language screen)
  useFocusEffect(
    useCallback(() => {
      const refreshLanguage = async () => {
        const savedLang = await AsyncStorage.getItem('@FamilyKnows:language');
        if (savedLang) setSelectedLanguage(savedLang);
      };
      refreshLanguage();
    }, [])
  );

  const loadPreferences = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('@FamilyKnows:language');
      const savedGender = await AsyncStorage.getItem('@FamilyKnows:gender');
      const savedDob = await AsyncStorage.getItem('@FamilyKnows:dob');
      const savedGDrive = await AsyncStorage.getItem('@FamilyKnows:gdriveConnected');
      const savedImage = await AsyncStorage.getItem('@FamilyKnows:profileImage');

      if (savedLang) setSelectedLanguage(savedLang);
      if (savedGender) setGender(savedGender);
      if (savedDob) {
        const parsedDate = new Date(savedDob);
        if (!isNaN(parsedDate.getTime())) {
          setDob(parsedDate);
        }
      }
      if (savedGDrive) setIsGDriveConnected(savedGDrive === 'true');
      if (savedImage) setProfileImage(savedImage);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Handle date change from DatePicker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fullName = `${firstName} ${lastName}`.trim() || 'User';

  // Handle profile image change
  const handleChangePhoto = async () => {
    Alert.alert(
      'Change Profile Photo',
      '',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem('@FamilyKnows:profileImage', uri);
    }
  };

  const selectFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem('@FamilyKnows:profileImage', uri);
    }
  };

  // Save personal info
  const savePersonalInfo = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('@FamilyKnows:gender', gender);
      if (dob) {
        await AsyncStorage.setItem('@FamilyKnows:dob', dob.toISOString());
      }

      // Update user context if available
      if (updateUser) {
        await updateUser({
          first_name: firstName,
          last_name: lastName,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your personal info has been saved.',
      });
      setEditSection('none');
    } catch (error) {
      console.error('Error saving personal info:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Could not save changes. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    // Reset to original values
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setEditSection('none');
  };

  // Handle theme selection
  const handleThemePress = () => {
    navigation.navigate('SettingsTheme', { isFromSettings: true });
  };

  // Handle language selection - navigate to language screen
  const handleLanguagePress = () => {
    navigation.navigate('SettingsLanguage', { isFromSettings: true });
  };

  // Handle Google Drive
  const handleGDrivePress = () => {
    navigation.navigate('SettingsGoogleDrive', { isFromSettings: true });
  };

  // Render section header
  const renderSectionHeader = (
    title: string,
    section?: EditSection,
    isReadOnly?: boolean
  ) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.utility.secondaryText }]}>
        {title}
      </Text>
      {!isReadOnly && section && (
        <TouchableOpacity
          onPress={() => {
            if (editSection === section) {
              savePersonalInfo();
            } else {
              setEditSection(section);
            }
          }}
          disabled={isSaving}
        >
          <Text style={[styles.editButton, { color: theme.colors.brand.primary }]}>
            {editSection === section ? (isSaving ? 'Saving...' : 'Done') : 'Edit'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render read-only row
  const renderReadOnlyRow = (
    icon: string,
    label: string,
    value: string,
    showLock: boolean = true
  ) => (
    <View style={[styles.row, { backgroundColor: theme.colors.utility.secondaryBackground }]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={22}
        color={theme.colors.utility.secondaryText}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.colors.utility.secondaryText }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: theme.colors.utility.primaryText }]}>
          {value || 'Not set'}
        </Text>
      </View>
      {showLock && (
        <MaterialCommunityIcons
          name="lock"
          size={18}
          color={theme.colors.utility.secondaryText}
        />
      )}
    </View>
  );

  // Render editable row
  const renderEditableRow = (
    icon: string,
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    isEditing: boolean,
    placeholder?: string
  ) => (
    <View style={[styles.row, { backgroundColor: theme.colors.utility.secondaryBackground }]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={22}
        color={theme.colors.utility.secondaryText}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.colors.utility.secondaryText }]}>
          {label}
        </Text>
        {isEditing ? (
          <TextInput
            style={[styles.rowInput, { color: theme.colors.utility.primaryText }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.utility.secondaryText}
            autoCapitalize="words"
          />
        ) : (
          <Text style={[styles.rowValue, { color: theme.colors.utility.primaryText }]}>
            {value || 'Not set'}
          </Text>
        )}
      </View>
    </View>
  );

  // Render clickable row (for navigation)
  const renderClickableRow = (
    icon: string,
    label: string,
    value: string,
    onPress: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.colors.utility.secondaryBackground }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={22}
        color={theme.colors.utility.secondaryText}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.colors.utility.secondaryText }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: theme.colors.utility.primaryText }]}>
          {value}
        </Text>
      </View>
      {rightElement || (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.utility.secondaryText}
        />
      )}
    </TouchableOpacity>
  );

  // Render gender selector
  const renderGenderSelector = () => (
    <View style={[styles.row, { backgroundColor: theme.colors.utility.secondaryBackground }]}>
      <MaterialCommunityIcons
        name="gender-male-female"
        size={22}
        color={theme.colors.utility.secondaryText}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.colors.utility.secondaryText }]}>
          Gender
        </Text>
        {editSection === 'personal' ? (
          <View style={styles.genderOptions}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.genderOption,
                  {
                    backgroundColor: gender === g.id
                      ? theme.colors.brand.primary + '20'
                      : 'transparent',
                    borderColor: gender === g.id
                      ? theme.colors.brand.primary
                      : theme.colors.utility.secondaryText + '30',
                  },
                ]}
                onPress={() => setGender(g.id)}
              >
                <MaterialCommunityIcons
                  name={g.icon as any}
                  size={16}
                  color={gender === g.id ? theme.colors.brand.primary : theme.colors.utility.secondaryText}
                />
                <Text
                  style={[
                    styles.genderOptionText,
                    { color: gender === g.id ? theme.colors.brand.primary : theme.colors.utility.primaryText },
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.rowValue, { color: theme.colors.utility.primaryText }]}>
            {GENDERS.find(g => g.id === gender)?.label || 'Not set'}
          </Text>
        )}
      </View>
    </View>
  );

  const currentTheme = availableThemes.find(t => t.id === currentThemeId);
  const themeName = currentTheme?.name || 'Default';
  const languageName = ENABLED_LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName || 'English';

  // Render DOB field with native DatePicker
  const renderDobField = () => (
    <View style={[styles.row, { backgroundColor: theme.colors.utility.secondaryBackground }]}>
      <MaterialCommunityIcons
        name="calendar"
        size={22}
        color={theme.colors.utility.secondaryText}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.colors.utility.secondaryText }]}>
          Date of Birth
        </Text>
        {editSection === 'personal' ? (
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.dobButton}
          >
            <Text style={[styles.rowValue, { color: theme.colors.utility.primaryText }]}>
              {formatDate(dob)}
            </Text>
            <MaterialCommunityIcons
              name="calendar-edit"
              size={18}
              color={theme.colors.brand.primary}
            />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.rowValue, { color: theme.colors.utility.primaryText }]}>
            {formatDate(dob)}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.utility.primaryBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.utility.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.utility.primaryText }]}>
          My Profile
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.brand.primary }]}>
                <Text style={styles.avatarInitials}>{getInitials(fullName)}</Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: theme.colors.brand.primary }]}>
              <MaterialCommunityIcons name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.profileName, { color: theme.colors.utility.primaryText }]}>
            {fullName}
          </Text>
        </View>

        {/* Account Section - Read Only */}
        <View style={styles.section}>
          {renderSectionHeader('ACCOUNT', undefined, true)}
          <View style={styles.sectionContent}>
            {renderReadOnlyRow(
              'phone',
              'Mobile',
              user?.mobile_number
                ? `${user.country_code || ''} ${user.mobile_number}`
                : 'Not set'
            )}
            {renderReadOnlyRow('email', 'Email', user?.email || 'Not set')}
            {renderReadOnlyRow('home-group', 'Workspace', currentTenant?.name || 'Not set')}
          </View>
          <Text style={[styles.sectionHint, { color: theme.colors.utility.secondaryText }]}>
            Contact support to change these details
          </Text>
        </View>

        {/* Personal Info Section - Editable */}
        <View style={styles.section}>
          {renderSectionHeader('PERSONAL INFO', 'personal')}
          <View style={styles.sectionContent}>
            {renderEditableRow(
              'account',
              'First Name',
              firstName,
              setFirstName,
              editSection === 'personal',
              'Enter first name'
            )}
            {renderEditableRow(
              'account-outline',
              'Last Name',
              lastName,
              setLastName,
              editSection === 'personal',
              'Enter last name'
            )}
            {renderGenderSelector()}
            {renderDobField()}
          </View>
          {editSection === 'personal' && (
            <TouchableOpacity onPress={cancelEdit} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: theme.colors.semantic.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          {renderSectionHeader('PREFERENCES')}
          <View style={styles.sectionContent}>
            {renderClickableRow(
              'palette',
              'Theme',
              `${themeName}${isDarkMode ? ' (Dark)' : ' (Light)'}`,
              handleThemePress
            )}
            {renderClickableRow(
              'translate',
              'Language',
              languageName,
              handleLanguagePress
            )}
          </View>
        </View>

        {/* Connected Accounts Section */}
        <View style={styles.section}>
          {renderSectionHeader('CONNECTED ACCOUNTS')}
          <View style={styles.sectionContent}>
            {renderClickableRow(
              'google-drive',
              'Google Drive',
              isGDriveConnected ? 'Connected' : 'Not connected',
              handleGDrivePress,
              <View style={styles.connectionStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isGDriveConnected ? theme.colors.semantic.success : theme.colors.utility.secondaryText },
                  ]}
                />
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.colors.utility.secondaryText}
                />
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Native DatePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={dob || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 16,
  },
  rowInput: {
    fontSize: 16,
    padding: 0,
    margin: 0,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default UnifiedProfileScreen;

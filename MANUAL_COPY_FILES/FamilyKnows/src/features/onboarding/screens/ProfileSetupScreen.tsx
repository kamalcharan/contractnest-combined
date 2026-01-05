// src/features/onboarding/screens/ProfileSetupScreen.tsx
// Storyboard-style profile setup with DOB calendar

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Modal,
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

type ProfileSetupNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'UserProfile'>;
type ProfileSetupRouteProp = RouteProp<AuthStackParamList, 'UserProfile'>;

// Calendar component
const Calendar: React.FC<{
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}> = ({ selectedDate, onSelectDate, onClose }) => {
  const [viewDate, setViewDate] = useState(selectedDate || new Date(2000, 0, 1));
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelectDate(newDate);
  };

  const handleSelectMonth = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
    setViewMode('day');
  };

  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setViewMode('month');
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  // Generate years (1920 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);

  return (
    <View style={calendarStyles.container}>
      {/* Header */}
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={calendarStyles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'day' ? 'month' : viewMode === 'month' ? 'year' : 'day')}
          style={calendarStyles.headerTitle}
        >
          <Text style={calendarStyles.headerText}>
            {viewMode === 'year' ? 'Select Year' : `${fullMonths[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#4ADE80" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextMonth} style={calendarStyles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Day View */}
      {viewMode === 'day' && (
        <>
          {/* Week Days */}
          <View style={calendarStyles.weekDaysRow}>
            {weekDays.map((day) => (
              <View key={day} style={calendarStyles.weekDayCell}>
                <Text style={calendarStyles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={calendarStyles.daysGrid}>
            {getDaysInMonth(viewDate).map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  calendarStyles.dayCell,
                  day && isSelectedDay(day) && calendarStyles.selectedDay,
                  day && isToday(day) && calendarStyles.todayDay,
                ]}
                onPress={() => day && handleSelectDay(day)}
                disabled={!day}
              >
                {day && (
                  <Text
                    style={[
                      calendarStyles.dayText,
                      isSelectedDay(day) && calendarStyles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <View style={calendarStyles.monthGrid}>
          {months.map((month, index) => (
            <TouchableOpacity
              key={month}
              style={[
                calendarStyles.monthCell,
                viewDate.getMonth() === index && calendarStyles.selectedMonth,
              ]}
              onPress={() => handleSelectMonth(index)}
            >
              <Text
                style={[
                  calendarStyles.monthText,
                  viewDate.getMonth() === index && calendarStyles.selectedMonthText,
                ]}
              >
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Year View */}
      {viewMode === 'year' && (
        <ScrollView style={calendarStyles.yearScroll} showsVerticalScrollIndicator={false}>
          <View style={calendarStyles.yearGrid}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  calendarStyles.yearCell,
                  viewDate.getFullYear() === year && calendarStyles.selectedYear,
                ]}
                onPress={() => handleSelectYear(year)}
              >
                <Text
                  style={[
                    calendarStyles.yearText,
                    viewDate.getFullYear() === year && calendarStyles.selectedYearText,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Actions */}
      <View style={calendarStyles.actions}>
        <TouchableOpacity style={calendarStyles.cancelButton} onPress={onClose}>
          <Text style={calendarStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={calendarStyles.confirmButton}
          onPress={onClose}
        >
          <Text style={calendarStyles.confirmText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const ProfileSetupScreen: React.FC = () => {
  const navigation = useNavigation<ProfileSetupNavigationProp>();
  const route = useRoute<ProfileSetupRouteProp>();
  const insets = useSafeAreaInsets();
  const { user, currentTenant } = useAuth();

  const isFromSettings = route?.params?.isFromSettings || false;

  // Get name from user profile (read-only)
  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';

  // State
  const [dob, setDob] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Call FKonboarding API to complete personal-profile step
      await api.post('/api/FKonboarding/complete-step', {
        stepId: 'personal-profile',
        data: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob?.toISOString(),
          user_id: user?.id,
        },
      });

      if (isFromSettings) {
        navigation.goBack();
      } else {
        navigation.navigate('GenderSelection', { isFromSettings: false });
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('GenderSelection', { isFromSettings: false });
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
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 2 of 4</Text>
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
              <MaterialCommunityIcons name="account-circle-outline" size={48} color="#8B5CF6" />
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.subtitle}>Just a few more details</Text>

            {/* Glass Card */}
            <View style={styles.glassCard}>
              {/* Name Display (Read-only) */}
              <View style={styles.nameSection}>
                <Text style={styles.nameLabel}>Name</Text>
                <Text style={styles.nameValue}>
                  {firstName} {lastName}
                </Text>
                <View style={styles.nameNote}>
                  <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                  <Text style={styles.nameNoteText}>Captured during signup</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* DOB Picker */}
              <View style={styles.dobSection}>
                <Text style={styles.dobLabel}>Date of Birth</Text>
                <TouchableOpacity
                  style={styles.dobPicker}
                  onPress={() => setShowCalendar(true)}
                >
                  <MaterialCommunityIcons
                    name="calendar"
                    size={22}
                    color="#8B5CF6"
                  />
                  <Text style={[styles.dobValue, !dob && styles.dobPlaceholder]}>
                    {dob ? formatDate(dob) : 'Select your birthday'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
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

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <Calendar
            selectedDate={dob}
            onSelectDate={setDob}
            onClose={() => setShowCalendar(false)}
          />
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
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 32,
  },
  nameSection: {
    marginBottom: 20,
  },
  nameLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  nameNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameNoteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  dobSection: {},
  dobLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dobPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dobValue: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  dobPlaceholder: {
    color: 'rgba(255,255,255,0.4)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

// Calendar Styles
const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    color: '#FFF',
  },
  selectedDay: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
  },
  selectedDayText: {
    color: '#FFF',
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 1,
    borderColor: '#4ADE80',
    borderRadius: 20,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  monthCell: {
    width: '25%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 14,
    color: '#FFF',
  },
  selectedMonth: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  selectedMonthText: {
    fontWeight: '600',
  },
  yearScroll: {
    maxHeight: 250,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  yearCell: {
    width: '25%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  yearText: {
    fontSize: 14,
    color: '#FFF',
  },
  selectedYear: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  selectedYearText: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  confirmText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileSetupScreen;

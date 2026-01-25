// src/features/onboarding/screens/FamilySetupScreen.tsx
// Glassmorphism design with constellation UI for relationship invites

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Modal,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Text, Button, Input } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../../../components/Toast';
import { useInvitations, CreateInvitationData, Invitation } from '../../../hooks/useInvitations';
import { useRelationships, Relationship } from '../../../hooks/useRelationships';
import { countryCodes, CountryCode } from '../../../constants/countryCodes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FamilySetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'FamilySetup'>;
type FamilySetupRouteProp = RouteProp<OnboardingStackParamList, 'FamilySetup'>;

interface Props {
  navigation: FamilySetupNavigationProp;
  route: FamilySetupRouteProp;
}

type InviteMethod = 'whatsapp' | 'email' | 'sms';

// Bubble positions for constellation layout
const BUBBLE_POSITIONS = [
  { top: '18%', left: '12%', delay: 0 },
  { top: '15%', right: '8%', delay: 200 },
  { top: '48%', left: '5%', delay: 400 },
  { top: '45%', right: '10%', delay: 300 },
  { bottom: '22%', left: '20%', delay: 500 },
  { bottom: '25%', right: '18%', delay: 100 },
];

export const FamilySetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDarkMode } = useTheme();
  const { currentTenant, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isFromSettings } = route.params || {};

  // Hooks
  const { relationships, isLoading: relationshipsLoading } = useRelationships();
  const {
    invitations,
    isLoading: invitationsLoading,
    isCreating,
    fetchInvitations,
    createInvitation,
    resendInvitation,
    cancelInvitation,
  } = useInvitations();

  // State
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('whatsapp');
  const [inviteContact, setInviteContact] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [showManageMode, setShowManageMode] = useState(isFromSettings || false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    countryCodes.find((c) => c.code === 'IN') || countryCodes[0]
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Get default message based on relationship
  const getDefaultMessage = (relationship: Relationship | null): string => {
    if (!relationship) return "Join our family on FamilyKnows!";

    const userName = user?.first_name || 'Someone';
    const relationshipName = relationship.displayName.toLowerCase();

    const messages: Record<string, string> = {
      father: `Hey Dad! I've set up a family space for us on FamilyKnows. Let's stay connected and organized together!`,
      mother: `Hi Mom! I've created a family hub for us on FamilyKnows. Would love for you to join and stay connected!`,
      spouse: `Hey love! I've set up FamilyKnows for our family. Join me and let's keep everything organized together!`,
      son: `Hey! I've created a family space on FamilyKnows. Join us and let's stay connected as a family!`,
      daughter: `Hey! I've set up a family hub on FamilyKnows. Would love for you to join our family space!`,
      brother: `Hey bro! I've set up FamilyKnows for our family. Join us and let's stay connected!`,
      sister: `Hey sis! I've created a family space on FamilyKnows. Join us and stay connected!`,
      grandfather: `Hi Grandpa! I've set up a family hub on FamilyKnows. Would love for you to join us!`,
      grandmother: `Hi Grandma! I've created a family space on FamilyKnows. Join us and stay connected!`,
      'grand mother': `Hi Grandma! I've created a family space on FamilyKnows. Join us and stay connected!`,
      'grand daughter': `Hey! I've set up a family hub on FamilyKnows. Would love for you to join our family space!`,
      guardian: `Hi! I've set up FamilyKnows for our family. Would love for you to join and stay connected!`,
      executor: `Hi! I've created a family space on FamilyKnows for important family matters. Please join us!`,
    };

    return messages[relationshipName] || `Hi! ${userName} has invited you to join the family on FamilyKnows. Let's stay connected!`;
  };

  // Animations
  const orbPulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const bubbleAnimations = useRef(
    BUBBLE_POSITIONS.map(() => ({
      float: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // Get workspace name
  const workspaceName = currentTenant?.name || 'Your Family';

  // Colors
  const colors = theme.colors;
  const glassBackground = isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
  const glassBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  // Fetch invitations on mount with error handling
  useEffect(() => {
    const loadInvitations = async () => {
      try {
        await fetchInvitations();
      } catch (error: any) {
        // Show custom toast instead of letting Expo handle the error
        console.log('Failed to fetch invitations:', error.message);
        // Only show toast if it's not a tenantId issue (user might not be fully onboarded)
        if (!error.message?.includes('tenantId')) {
          toast.warning('Unable to load invitations', 'Please try again later');
        }
      }
    };
    loadInvitations();
  }, []);

  // Entrance animations
  useEffect(() => {
    // Fade in main content
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Orb pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Bubble animations
    bubbleAnimations.forEach((anim, index) => {
      const delay = BUBBLE_POSITIONS[index].delay;

      // Scale in with delay
      setTimeout(() => {
        Animated.spring(anim.scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }, delay);

      // Continuous float animation
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(anim.float, {
            toValue: 1,
            duration: 3000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim.float, {
            toValue: 0,
            duration: 3000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      floatAnimation.start();
    });

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  // Handle relationship bubble tap
  const handleRelationshipTap = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    setCustomMessage(getDefaultMessage(relationship));
    setShowInviteModal(true);
  };

  // Send invitation
  const handleSendInvitation = async () => {
    if (!inviteContact.trim()) {
      toast.error('Required', inviteMethod === 'email' ? 'Please enter email address' : 'Please enter phone number');
      return;
    }

    if (!selectedRelationship) {
      toast.error('Required', 'Please select a relationship');
      return;
    }

    try {
      const isEmail = inviteMethod === 'email';
      const invitationData: CreateInvitationData = {
        invitation_method: inviteMethod,
        role_id: selectedRelationship.id,
        custom_message: customMessage || getDefaultMessage(selectedRelationship),
      };

      if (isEmail) {
        invitationData.email = inviteContact.trim();
      } else {
        // Use selected country code
        invitationData.phone_code = selectedCountry.dialCode.replace('+', '');
        invitationData.mobile_number = inviteContact.replace(/\D/g, '');
      }

      const invitation = await createInvitation(invitationData);

      toast.success('Invitation Sent!', `Invitation sent to your ${selectedRelationship.displayName}`);

      // Open WhatsApp if that was the method
      if (inviteMethod === 'whatsapp' && invitation.invitation_link) {
        const inviteMessage = customMessage || getDefaultMessage(selectedRelationship);
        const message = encodeURIComponent(
          `${user?.first_name || 'Someone'} has invited you to join ${workspaceName} on FamilyKnows!\n\n` +
            `${inviteMessage}\n\n` +
            `Click here to join: ${invitation.invitation_link}`
        );
        // Format phone with country code (without +)
        const phone = invitationData.mobile_number
          ? `${invitationData.phone_code || selectedCountry.dialCode.replace('+', '')}${invitationData.mobile_number}`
          : '';
        const whatsappUrl = phone
          ? `whatsapp://send?phone=${phone}&text=${message}`
          : `whatsapp://send?text=${message}`;

        Linking.openURL(whatsappUrl).catch(() => {
          toast.info('WhatsApp Not Found', 'Please share the invitation link manually');
        });
      }

      // Close modal and reset
      setShowInviteModal(false);
      setInviteContact('');
      setCustomMessage('');
      setSelectedRelationship(null);
    } catch (error: any) {
      toast.error('Failed', error.message || 'Could not send invitation');
    }
  };

  // Handle nudge (resend)
  const handleNudge = async (invitation: Invitation) => {
    const success = await resendInvitation(invitation.id);
    if (success) {
      toast.success('Nudged!', 'Reminder sent successfully');
    } else {
      toast.error('Failed', 'Could not send reminder');
    }
  };

  // Handle complete/skip
  const handleComplete = () => {
    if (isFromSettings) {
      navigation.goBack();
    } else {
      navigation.navigate('Pricing');
    }
  };

  // Share hub code
  const shareHubCode = async () => {
    try {
      await Share.share({
        message: `Join ${workspaceName} on FamilyKnows!\n\nDownload the app and use workspace code: ${currentTenant?.workspace_code || 'N/A'}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Get pending invitations
  const pendingInvitations = invitations.filter((inv) =>
    ['pending', 'sent', 'resent'].includes(inv.status)
  );

  // Get active members (accepted invitations + self)
  const activeMembers = [
    {
      id: user?.id || 'self',
      name: `${user?.first_name || 'You'} ${user?.last_name || ''}`.trim() || 'You',
      email: user?.email,
      role: 'Host',
      isSelf: true,
    },
    ...invitations
      .filter((inv) => inv.status === 'accepted' && inv.accepted_user)
      .map((inv) => ({
        id: inv.accepted_user?.id || inv.id,
        name: `${inv.accepted_user?.first_name || ''} ${inv.accepted_user?.last_name || ''}`.trim() || inv.email || 'Member',
        email: inv.email,
        role: inv.role_id || 'Member',
        isSelf: false,
      })),
  ];

  // Render constellation bubble
  const renderBubble = (relationship: Relationship, index: number) => {
    if (index >= BUBBLE_POSITIONS.length) return null;

    const position = BUBBLE_POSITIONS[index];
    const anim = bubbleAnimations[index];

    const translateY = anim.float.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -15],
    });

    const positionStyle: any = {};
    if (position.top) positionStyle.top = position.top;
    if (position.bottom) positionStyle.bottom = position.bottom;
    if (position.left) positionStyle.left = position.left;
    if (position.right) positionStyle.right = position.right;

    return (
      <Animated.View
        key={relationship.id}
        style={[
          styles.bubble,
          positionStyle,
          {
            transform: [{ translateY }, { scale: anim.scale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleRelationshipTap(relationship)}
          activeOpacity={0.8}
          style={[
            styles.bubbleInner,
            {
              backgroundColor: glassBackground,
              borderColor: glassBorder,
            },
          ]}
        >
          <View
            style={[
              styles.bubbleAvatar,
              { backgroundColor: `${colors.brand.primary}20` },
            ]}
          >
            <MaterialCommunityIcons
              name={(relationship.icon as any) || 'account'}
              size={28}
              color={colors.brand.primary}
            />
          </View>
          <Text style={[styles.bubbleLabel, { color: colors.brand.primary }]}>
            {relationship.displayName}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render Management Mode (Screen 1)
  const renderManagementMode = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.manageHeader}>
        <View>
          <Text style={[styles.manageTitle, { color: colors.utility.primaryText }]}>
            {workspaceName}
          </Text>
          <Text style={[styles.manageSubtitle, { color: colors.utility.secondaryText }]}>
            Space Management
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: glassBackground, borderColor: glassBorder }]}
          onPress={() => {}}
        >
          <MaterialCommunityIcons
            name="cog"
            size={24}
            color={colors.utility.secondaryText}
          />
        </TouchableOpacity>
      </View>

      {/* Active Circle Card */}
      <View style={[styles.glassCard, { backgroundColor: glassBackground, borderColor: glassBorder }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.brand.primary }]}>
            ACTIVE CIRCLE
          </Text>
          <View style={[styles.statusPill, { backgroundColor: `${colors.semantic.success}15`, borderColor: `${colors.semantic.success}30` }]}>
            <Text style={[styles.statusPillText, { color: colors.semantic.success }]}>
              {activeMembers.length} PRESENT
            </Text>
          </View>
        </View>

        {/* Members List */}
        <View style={styles.membersList}>
          {activeMembers.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberLeft}>
                <LinearGradient
                  colors={[colors.brand.primary, colors.brand.secondary || '#a855f7']}
                  style={styles.avatarRing}
                >
                  <View style={[styles.avatarInner, { backgroundColor: isDarkMode ? '#0a0a0c' : '#fff' }]}>
                    <Text style={[styles.avatarText, { color: colors.brand.primary }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </LinearGradient>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.utility.primaryText }]}>
                    {member.name} {member.isSelf && '(You)'}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.utility.secondaryText }]}>
                    {member.role}
                  </Text>
                </View>
              </View>
              {member.isSelf && (
                <Text style={[styles.hostBadge, { color: colors.utility.secondaryText }]}>HOST</Text>
              )}
              {!member.isSelf && (
                <TouchableOpacity>
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={20}
                    color={colors.utility.secondaryText}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Pending Invitations */}
          {pendingInvitations.map((invitation) => {
            // Format phone number with country code
            const displayContact = invitation.email
              ? invitation.email
              : invitation.mobile_number
              ? `+${invitation.phone_code || '91'} ${invitation.mobile_number}`
              : 'Pending';

            return (
              <View key={invitation.id} style={[styles.memberRow, { opacity: 0.7 }]}>
                <View style={styles.memberLeft}>
                  <View style={[styles.pendingAvatar, { borderColor: colors.utility.secondaryText }]}>
                    <MaterialCommunityIcons
                      name="account"
                      size={24}
                      color={colors.utility.secondaryText}
                    />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.utility.secondaryText }]}>
                      {displayContact}
                    </Text>
                    <Text style={[styles.pendingLabel, { color: colors.brand.primary }]}>
                      Invite Pending...
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.nudgeButton, { backgroundColor: `${colors.brand.secondary || colors.brand.primary}15` }]}
                  onPress={() => handleNudge(invitation)}
                >
                  <Text style={[styles.nudgeText, { color: colors.brand.secondary || colors.brand.primary }]}>
                    Nudge
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: glassBackground, borderColor: glassBorder }]}
          onPress={() => setShowManageMode(false)}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${colors.brand.primary}20` }]}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.brand.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.utility.primaryText }]}>
            Add Member
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: glassBackground, borderColor: glassBorder }]}
          onPress={shareHubCode}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${colors.semantic.success}20` }]}>
            <MaterialCommunityIcons name="share-variant" size={24} color={colors.semantic.success} />
          </View>
          <Text style={[styles.actionText, { color: colors.utility.primaryText }]}>
            Share Hub
          </Text>
        </TouchableOpacity>
      </View>

      {/* Done Button */}
      {isFromSettings && (
        <Button
          title="Done"
          onPress={handleComplete}
          buttonStyle={[styles.doneButton, { backgroundColor: colors.brand.primary }]}
          titleStyle={styles.doneButtonText}
          containerStyle={styles.doneButtonContainer}
        />
      )}
    </ScrollView>
  );

  // Render Constellation Mode (Screen 2 - Onboarding)
  const renderConstellationMode = () => (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0a0a0c' : colors.utility.primaryBackground }]}>
      {/* Background gradient */}
      <View style={styles.portalBackground}>
        <LinearGradient
          colors={[`${colors.brand.primary}25`, 'transparent']}
          style={styles.portalGradient}
        />
      </View>

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        <Text style={[styles.stepText, { color: colors.brand.primary }]}>
          {isFromSettings ? 'FAMILY SETUP' : 'STEP 2 OF 3'}
        </Text>
        <Text style={[styles.title, { color: colors.utility.primaryText }]}>
          Populate Your Space
        </Text>
        <Text style={[styles.subtitle, { color: colors.utility.secondaryText }]}>
          Tap a relationship to invite them into the hub
        </Text>
      </Animated.View>

      {/* Constellation Area */}
      <View style={styles.constellationArea}>
        {/* Center Orb */}
        <Animated.View
          style={[
            styles.centerOrb,
            {
              transform: [{ scale: orbPulse }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.brand.primary, colors.brand.secondary || '#a855f7']}
            style={styles.orbGradient}
          >
            <MaterialCommunityIcons name="home" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.orbLabel, { color: colors.brand.primary }]}>
            {workspaceName}
          </Text>
        </Animated.View>

        {/* Relationship Bubbles */}
        {relationshipsLoading ? (
          <ActivityIndicator size="large" color={colors.brand.primary} />
        ) : (
          relationships.slice(0, 6).map((rel, index) => renderBubble(rel, index))
        )}
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        {invitations.length > 0 && (
          <TouchableOpacity
            style={[styles.viewMembersButton, { backgroundColor: glassBackground, borderColor: glassBorder }]}
            onPress={() => setShowManageMode(true)}
          >
            <Text style={[styles.viewMembersText, { color: colors.brand.primary }]}>
              View {invitations.length} Invitation{invitations.length !== 1 ? 's' : ''}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        )}

        {!isFromSettings && (
          <TouchableOpacity style={styles.skipButton} onPress={handleComplete}>
            <Text style={[styles.skipText, { color: colors.utility.secondaryText }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowInviteModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? '#1a1a1f' : '#fff',
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.utility.primaryText }]}>
                Invite {selectedRelationship?.displayName || 'Family Member'}
              </Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.utility.secondaryText}
                />
              </TouchableOpacity>
            </View>

            {/* Invite Method Tabs */}
            <View style={styles.methodTabs}>
              {(['whatsapp', 'email', 'sms'] as InviteMethod[]).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodTab,
                    {
                      backgroundColor: inviteMethod === method ? colors.brand.primary : glassBackground,
                      borderColor: inviteMethod === method ? colors.brand.primary : glassBorder,
                    },
                  ]}
                  onPress={() => setInviteMethod(method)}
                >
                  <MaterialCommunityIcons
                    name={method === 'whatsapp' ? 'whatsapp' : method === 'email' ? 'email' : 'message-text'}
                    size={20}
                    color={inviteMethod === method ? '#fff' : colors.utility.secondaryText}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      { color: inviteMethod === method ? '#fff' : colors.utility.secondaryText },
                    ]}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contact Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.utility.secondaryText }]}>
                {inviteMethod === 'email' ? 'Email Address' : 'Phone Number'}
              </Text>
              {inviteMethod === 'email' ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: glassBackground,
                      borderColor: glassBorder,
                      color: colors.utility.primaryText,
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.utility.secondaryText}
                  value={inviteContact}
                  onChangeText={setInviteContact}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <View style={styles.phoneInputRow}>
                  {/* Country Code Selector */}
                  <TouchableOpacity
                    style={[
                      styles.countrySelector,
                      {
                        backgroundColor: glassBackground,
                        borderColor: glassBorder,
                      },
                    ]}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={[styles.countryDialCode, { color: colors.utility.primaryText }]}>
                      {selectedCountry.dialCode}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={16}
                      color={colors.utility.secondaryText}
                    />
                  </TouchableOpacity>
                  {/* Phone Input */}
                  <TextInput
                    style={[
                      styles.input,
                      styles.phoneInput,
                      {
                        backgroundColor: glassBackground,
                        borderColor: glassBorder,
                        color: colors.utility.primaryText,
                      },
                    ]}
                    placeholder="98765 43210"
                    placeholderTextColor={colors.utility.secondaryText}
                    value={inviteContact}
                    onChangeText={(text) => setInviteContact(text.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>
              )}
            </View>

            {/* Custom Message */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.utility.secondaryText }]}>
                Personal Message (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: glassBackground,
                    borderColor: glassBorder,
                    color: colors.utility.primaryText,
                  },
                ]}
                placeholder="Add a personal touch to your invitation..."
                placeholderTextColor={colors.utility.secondaryText}
                value={customMessage}
                onChangeText={setCustomMessage}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inviteMethod === 'whatsapp' ? '#25D366' : colors.brand.primary,
                },
              ]}
              onPress={handleSendInvitation}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={inviteMethod === 'whatsapp' ? 'whatsapp' : 'send'}
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.sendButtonText}>
                    Invite {selectedRelationship?.displayName || 'Member'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: colors.utility.secondaryText }]}>
              No password required • One-tap join
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.countryPickerOverlay}>
          <View
            style={[
              styles.countryPickerContent,
              {
                backgroundColor: isDarkMode ? '#1a1a1f' : '#fff',
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.countryPickerHeader}>
              <Text style={[styles.countryPickerTitle, { color: colors.utility.primaryText }]}>
                Select Country
              </Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.utility.secondaryText}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countryCodes}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    {
                      backgroundColor:
                        item.code === selectedCountry.code
                          ? `${colors.brand.primary}15`
                          : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text
                    style={[styles.countryItemName, { color: colors.utility.primaryText }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.countryItemCode, { color: colors.utility.secondaryText }]}
                  >
                    {item.dialCode}
                  </Text>
                  {item.code === selectedCountry.code && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.brand.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );

  // Main render
  return showManageMode ? renderManagementMode() : renderConstellationMode();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },

  // Portal Background
  portalBackground: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    left: '-25%',
    top: '-25%',
  },
  portalGradient: {
    flex: 1,
    borderRadius: 9999,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Constellation
  constellationArea: {
    flex: 1,
    position: 'relative',
  },
  centerOrb: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    alignItems: 'center',
  },
  orbGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  orbLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
  },

  // Bubbles
  bubble: {
    position: 'absolute',
  },
  bubbleInner: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bubbleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bubbleLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Bottom Actions
  bottomActions: {
    padding: 24,
    alignItems: 'center',
  },
  viewMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    marginBottom: 16,
  },
  viewMembersText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 14,
  },

  // Management Mode
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  manageTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  manageSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Glass Card
  glassCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Members List
  membersList: {
    gap: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  pendingAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  memberInfo: {
    marginLeft: 16,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 13,
    marginTop: 2,
  },
  pendingLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  hostBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nudgeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  nudgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Done Button
  doneButtonContainer: {
    marginTop: 16,
  },
  doneButton: {
    borderRadius: 16,
    paddingVertical: 16,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },

  // Method Tabs
  methodTabs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Inputs
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Phone Input Row
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDialCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
  },

  // Country Picker Modal
  countryPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  countryPickerContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '70%',
  },
  countryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  countryPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  countryItemFlag: {
    fontSize: 24,
  },
  countryItemName: {
    flex: 1,
    fontSize: 16,
  },
  countryItemCode: {
    fontSize: 14,
    marginRight: 8,
  },
});

export default FamilySetupScreen;

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
import { Text, Button } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../../../components/Toast';
import { useInvitations, CreateInvitationData, Invitation } from '../../../hooks/useInvitations';
import { useRelationships, Relationship } from '../../../hooks/useRelationships';
import { countryCodes, CountryCode } from '../../../constants/countryCodes';
import CountryCodePicker from '../components/CountryCodePicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FamilySetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'FamilySetup'>;
type FamilySetupRouteProp = RouteProp<OnboardingStackParamList, 'FamilySetup'>;

interface Props {
  navigation: FamilySetupNavigationProp;
  route: FamilySetupRouteProp;
}

type InviteMethod = 'whatsapp' | 'email' | 'sms';

// Bubble positions for constellation layout (6 positions + 1 for "Add More")
const BUBBLE_POSITIONS = [
  { top: '18%', left: '12%', delay: 0 },
  { top: '15%', right: '8%', delay: 200 },
  { top: '48%', left: '5%', delay: 400 },
  { top: '45%', right: '10%', delay: 300 },
  { bottom: '22%', left: '20%', delay: 500 },
  { bottom: '25%', right: '18%', delay: 100 },
];

// Position for "Add More" button
const ADD_MORE_POSITION = { bottom: '8%', left: '50%', marginLeft: -42.5, delay: 600 };

// Number of bubbles to show in constellation (remaining shown in modal)
const VISIBLE_BUBBLES = 6;

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
    error: invitationsError,
    fetchInvitations,
    createInvitation,
    resendInvitation,
    clearError,
  } = useInvitations();

  // State
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAllRelationshipsModal, setShowAllRelationshipsModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('whatsapp');
  const [inviteContact, setInviteContact] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [showManageMode, setShowManageMode] = useState(isFromSettings || false);

  // Country code picker state
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(countryCodes[0]); // India default
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Animations
  const orbPulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const addMoreScale = useRef(new Animated.Value(0)).current;
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

  // Split relationships: first 6 for bubbles, rest for "Add More" modal
  const visibleRelationships = relationships.slice(0, VISIBLE_BUBBLES);
  const additionalRelationships = relationships.slice(VISIBLE_BUBBLES);
  const hasMoreRelationships = relationships.length > VISIBLE_BUBBLES;

  // Fetch invitations on mount
  useEffect(() => {
    fetchInvitations();
  }, []);

  // Pre-fill message when relationship is selected
  useEffect(() => {
    if (selectedRelationship) {
      setCustomMessage(selectedRelationship.defaultMessage);
    }
  }, [selectedRelationship]);

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

    // "Add More" button animation
    setTimeout(() => {
      Animated.spring(addMoreScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, ADD_MORE_POSITION.delay);

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  // Handle relationship bubble tap
  const handleRelationshipTap = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    setInviteContact('');
    setShowInviteModal(true);
    // Close the all relationships modal if it's open
    if (showAllRelationshipsModal) {
      setShowAllRelationshipsModal(false);
    }
  };

  // Send invitation
  const handleSendInvitation = async () => {
    const isEmail = inviteMethod === 'email';

    if (isEmail && !inviteContact.trim()) {
      toast.error('Required', 'Please enter an email address');
      return;
    }

    if (!isEmail && !inviteContact.trim()) {
      toast.error('Required', 'Please enter a phone number');
      return;
    }

    if (!selectedRelationship) {
      toast.error('Required', 'Please select a relationship');
      return;
    }

    try {
      const invitationData: CreateInvitationData = {
        invitation_method: inviteMethod,
        role_id: selectedRelationship.id,
        custom_message: customMessage || selectedRelationship.defaultMessage,
      };

      if (isEmail) {
        invitationData.email = inviteContact.trim();
      } else {
        // Use selected country's dial code
        invitationData.phone_code = selectedCountry.dialCode.replace('+', '');
        invitationData.country_code = selectedCountry.code;
        invitationData.mobile_number = inviteContact.replace(/\D/g, '');
      }

      const invitation = await createInvitation(invitationData);

      toast.success('Invitation Sent!', `Invitation sent to your ${selectedRelationship.displayName}`);

      // Open WhatsApp if that was the method
      if (inviteMethod === 'whatsapp') {
        const fullPhone = `${selectedCountry.dialCode.replace('+', '')}${inviteContact.replace(/\D/g, '')}`;
        const message = encodeURIComponent(
          `${customMessage || selectedRelationship.defaultMessage}\n\n` +
            (invitation.invitation_link ? `Click here to join: ${invitation.invitation_link}` : '')
        );
        const whatsappUrl = `whatsapp://send?phone=${fullPhone}&text=${message}`;

        Linking.openURL(whatsappUrl).catch(() => {
          toast.info('WhatsApp', 'Please share the invitation link manually');
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
      toast.error('Failed', invitationsError || 'Could not send reminder');
      clearError();
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

  // Render "Add More" button
  const renderAddMoreButton = () => {
    if (!hasMoreRelationships && relationships.length <= VISIBLE_BUBBLES) return null;

    return (
      <Animated.View
        style={[
          styles.addMoreBubble,
          {
            transform: [{ scale: addMoreScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setShowAllRelationshipsModal(true)}
          activeOpacity={0.8}
          style={[
            styles.addMoreInner,
            {
              backgroundColor: glassBackground,
              borderColor: colors.brand.primary,
              borderStyle: 'dashed',
            },
          ]}
        >
          <View
            style={[
              styles.addMoreIcon,
              { backgroundColor: `${colors.brand.primary}20` },
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={colors.brand.primary}
            />
          </View>
          <Text style={[styles.addMoreLabel, { color: colors.brand.primary }]}>
            +{relationships.length - VISIBLE_BUBBLES} More
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render relationship item in modal list
  const renderRelationshipItem = ({ item }: { item: Relationship }) => (
    <TouchableOpacity
      style={[
        styles.relationshipListItem,
        {
          backgroundColor: glassBackground,
          borderColor: glassBorder,
        },
      ]}
      onPress={() => handleRelationshipTap(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.relationshipListIcon,
          { backgroundColor: `${colors.brand.primary}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={(item.icon as any) || 'account'}
          size={24}
          color={colors.brand.primary}
        />
      </View>
      <View style={styles.relationshipListInfo}>
        <Text style={[styles.relationshipListName, { color: colors.utility.primaryText }]}>
          {item.displayName}
        </Text>
        <Text style={[styles.relationshipListDesc, { color: colors.utility.secondaryText }]}>
          {item.name}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={colors.utility.secondaryText}
      />
    </TouchableOpacity>
  );

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
          {pendingInvitations.map((invitation) => (
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
                    {invitation.email || invitation.mobile_number || 'Pending'}
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
          ))}
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
          <>
            {visibleRelationships.map((rel, index) => renderBubble(rel, index))}
            {renderAddMoreButton()}
          </>
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

      {/* All Relationships Modal */}
      <Modal
        visible={showAllRelationshipsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllRelationshipsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAllRelationshipsModal(false)}
          />
          <View
            style={[
              styles.allRelationshipsModalContent,
              {
                backgroundColor: isDarkMode ? '#1a1a1f' : '#fff',
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.utility.primaryText }]}>
                All Relationships
              </Text>
              <TouchableOpacity onPress={() => setShowAllRelationshipsModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.utility.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.allRelationshipsSubtitle, { color: colors.utility.secondaryText }]}>
              Select a relationship to send an invitation
            </Text>

            {/* Relationships List */}
            <FlatList
              data={relationships}
              renderItem={renderRelationshipItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.relationshipsList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          </View>
        </View>
      </Modal>

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
                  {/* Country Code Picker */}
                  <TouchableOpacity
                    style={[
                      styles.countryCodeButton,
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

                  {/* Phone Number Input */}
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
                    onChangeText={setInviteContact}
                    keyboardType="phone-pad"
                  />
                </View>
              )}
            </View>

            {/* Custom Message */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.utility.secondaryText }]}>
                Personal Message
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

      {/* Country Code Picker Modal */}
      <CountryCodePicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={(country) => {
          setSelectedCountry(country);
          setShowCountryPicker(false);
        }}
        selectedCode={selectedCountry.code}
      />
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

  // Add More Button
  addMoreBubble: {
    position: 'absolute',
    bottom: '8%',
    left: '50%',
    marginLeft: -42.5,
  },
  addMoreInner: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addMoreLabel: {
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

  // All Relationships Modal
  allRelationshipsModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  allRelationshipsSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  relationshipsList: {
    paddingBottom: 20,
  },
  relationshipListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  relationshipListIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  relationshipListInfo: {
    flex: 1,
  },
  relationshipListName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  relationshipListDesc: {
    fontSize: 13,
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
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // Phone Input
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDialCode: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
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
});

export default FamilySetupScreen;

// src/features/onboarding/screens/FamilySetupScreen.tsx
// Family Setup with API integration and Relationship card selector
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Modal,
  FlatList,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text, Input, Button, Avatar, Divider } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FamilyActionSheet from '../components/FamilyActionSheet';
import api, { API_ENDPOINTS } from '../../../services/api';
import { toast } from '../../../components/Toast';

type FamilySetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'FamilySetup'>;
type FamilySetupRouteProp = RouteProp<OnboardingStackParamList, 'FamilySetup'>;

interface Props {
  navigation: FamilySetupNavigationProp;
  route: FamilySetupRouteProp;
}

type SetupMode = 'choose' | 'create' | 'join' | 'manage';

// Relationship type from API (t_category_details)
interface Relationship {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

// Member with relationship
interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  relationshipDisplay: string;
  joinedAt: Date;
  isCurrentUser?: boolean;
}

// Pending invitation
interface PendingInvite {
  id: string;
  email: string;
  phone?: string;
  relationship: string;
  relationshipDisplay: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

// Default relationships for fallback (when API is not available)
const DEFAULT_RELATIONSHIPS: Relationship[] = [
  { id: '1', code: 'FATHER', name: 'Father', description: 'Male parent', color: '#3B82F6', icon: 'human-male' },
  { id: '2', code: 'MOTHER', name: 'Mother', description: 'Female parent', color: '#EC4899', icon: 'human-female' },
  { id: '3', code: 'SPOUSE', name: 'Spouse', description: 'Husband or Wife', color: '#EF4444', icon: 'heart' },
  { id: '4', code: 'SON', name: 'Son', description: 'Male child', color: '#10B981', icon: 'human-male-child' },
  { id: '5', code: 'DAUGHTER', name: 'Daughter', description: 'Female child', color: '#8B5CF6', icon: 'human-female-girl' },
  { id: '6', code: 'BROTHER', name: 'Brother', description: 'Male sibling', color: '#06B6D4', icon: 'account-multiple' },
  { id: '7', code: 'SISTER', name: 'Sister', description: 'Female sibling', color: '#F472B6', icon: 'account-multiple' },
  { id: '8', code: 'GRANDMOTHER', name: 'Grand Mother', description: 'Mother of parent', color: '#F59E0B', icon: 'human-female' },
  { id: '9', code: 'GRANDDAUGHTER', name: 'Grand Daughter', description: 'Daughter of child', color: '#A855F7', icon: 'human-female-girl' },
  { id: '10', code: 'GUARDIAN', name: 'Guardian', description: 'Legal guardian or caretaker', color: '#6366F1', icon: 'shield-account' },
  { id: '11', code: 'EXECUTOR', name: 'Executor', description: 'Estate executor', color: '#64748B', icon: 'briefcase-account' },
  { id: '12', code: 'OTHER', name: 'Other', description: 'Other relation', color: '#78716C', icon: 'account-question' },
];

export const FamilySetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { isFromSettings, prefillFamily } = route.params || {};
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    updateWorkspaces,
  } = useWorkspace();

  // Setup mode
  const [setupMode, setSetupMode] = useState<SetupMode>(
    prefillFamily && !isFromSettings ? 'create' : 'choose'
  );

  // UI states
  const [showLocalWorkspaceSwitcher, setShowLocalWorkspaceSwitcher] = useState(false);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Form states
  const [familyName, setFamilyName] = useState(prefillFamily || '');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // API data states
  const [relationships, setRelationships] = useState<Relationship[]>(DEFAULT_RELATIONSHIPS);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Fetch relationships from API
  const fetchRelationships = useCallback(async () => {
    setIsLoadingRelationships(true);
    try {
      const response = await api.get<{
        data: Array<{
          id: string;
          sub_cat_name: string;
          display_name: string;
          description: string;
          hexcolor: string;
          icon_name: string;
        }>;
      }>(API_ENDPOINTS.CATEGORIES.GET_DETAILS('roles'));

      if (response.data?.data && Array.isArray(response.data.data)) {
        const mapped = response.data.data.map((item) => ({
          id: item.id,
          code: item.sub_cat_name,
          name: item.display_name,
          description: item.description || '',
          color: item.hexcolor || '#6366F1',
          icon: item.icon_name || 'account',
        }));
        if (mapped.length > 0) {
          setRelationships(mapped);
        }
      }
    } catch (error) {
      console.log('Using default relationships - API not available:', error);
      // Keep using DEFAULT_RELATIONSHIPS
    } finally {
      setIsLoadingRelationships(false);
    }
  }, []);

  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const response = await api.get<{
        data: Array<{
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string;
          relationship_code: string;
          relationship_display: string;
          created_at: string;
          is_current_user: boolean;
        }>;
      }>(API_ENDPOINTS.WORKSPACE.MEMBERS);

      if (response.data?.data && Array.isArray(response.data.data)) {
        const mapped = response.data.data.map((item) => ({
          id: item.id,
          name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email,
          phone: item.phone,
          relationship: item.relationship_code || 'OTHER',
          relationshipDisplay: item.relationship_display || 'Other',
          joinedAt: new Date(item.created_at),
          isCurrentUser: item.is_current_user,
        }));
        setMembers(mapped);
      }
    } catch (error) {
      console.log('Could not fetch members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get<{
        data: Array<{
          id: string;
          email: string;
          phone?: string;
          relationship_code: string;
          relationship_display: string;
          created_at: string;
          status: string;
        }>;
      }>(API_ENDPOINTS.INVITATIONS.LIST);

      if (response.data?.data && Array.isArray(response.data.data)) {
        const mapped = response.data.data
          .filter((item) => item.status === 'pending')
          .map((item) => ({
            id: item.id,
            email: item.email,
            phone: item.phone,
            relationship: item.relationship_code || 'OTHER',
            relationshipDisplay: item.relationship_display || 'Other',
            invitedAt: new Date(item.created_at),
            status: item.status as PendingInvite['status'],
          }));
        setPendingInvites(mapped);
      }
    } catch (error) {
      console.log('Could not fetch invitations:', error);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMembers(), fetchInvitations()]);
    setRefreshing(false);
  }, [fetchMembers, fetchInvitations]);

  // Initial data fetch
  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  useEffect(() => {
    if (setupMode === 'manage' || isFromSettings) {
      fetchMembers();
      fetchInvitations();
    }
  }, [setupMode, isFromSettings, fetchMembers, fetchInvitations]);

  // Fetch existing data to determine CREATE vs EDIT mode
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const response = await api.get<{
          data: {
            step_data?: {
              'family-space'?: {
                name?: string;
                family_name?: string;
                pre_created?: boolean;
              };
            };
            steps?: Record<string, { status: string }>;
          };
        }>(API_ENDPOINTS.ONBOARDING.STATUS);

        const stepData = response.data?.data?.step_data?.['family-space'];
        const stepStatus = response.data?.data?.steps?.['family-space'];

        if (stepData) {
          const savedName = stepData.name || stepData.family_name;
          if (savedName && !familyName) {
            setFamilyName(savedName);
          }
          // If pre_created flag exists, this workspace was created at registration
          // Show create mode to let user confirm and invite members
          if (stepData.pre_created && !stepStatus?.status?.includes('completed')) {
            setIsEditMode(false);
            setSetupMode('create');
          } else if (stepStatus?.status === 'completed') {
            setIsEditMode(true);
            setSetupMode('manage');
          }
        }
      } catch (error) {
        console.log('Could not fetch onboarding status for family-space step:', error);
      }
    };

    if (!isFromSettings && !prefillFamily) {
      fetchExistingData();
    }
  }, [isFromSettings, prefillFamily]);

  // Animation effect
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

  // Setup mode based on workspaces
  useEffect(() => {
    if (isFromSettings && (workspaces.length > 0 || members.length > 0)) {
      setSetupMode('manage');
    } else if (!isFromSettings && workspaces.length === 0 && !prefillFamily) {
      setSetupMode('choose');
    } else if (isFromSettings && workspaces.length === 0) {
      setSetupMode('choose');
    }
  }, [isFromSettings, workspaces, members, prefillFamily]);

  // Create family/workspace
  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setErrors({ familyName: 'Family name is required' });
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      // Complete the family-space onboarding step
      await api.post(API_ENDPOINTS.ONBOARDING.STEP_COMPLETE, {
        step: 'family-space',
        data: {
          name: familyName.trim(),
          created_at: new Date().toISOString(),
        },
      });

      toast.success('Family Created', `${familyName} workspace is ready!`);
      setSetupMode('manage');
      setShowActionSheet(true);

      // Refresh data
      await refreshData();
    } catch (error: any) {
      console.error('Error creating family:', error);
      toast.error('Error', error.message || 'Failed to create family workspace');
    } finally {
      setIsLoading(false);
    }
  };

  // Join family with invite code
  const handleJoinFamily = async () => {
    if (!inviteCode.trim() || inviteCode.length !== 6) {
      setErrors({ inviteCode: 'Please enter a valid 6-character code' });
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      await api.post('/api/invitations/accept', {
        code: inviteCode.toUpperCase(),
      });

      toast.success('Request Sent', 'Your request to join the family has been sent.');
      handleComplete();
    } catch (error: any) {
      console.error('Error joining family:', error);
      toast.error('Invalid Code', error.message || 'The invite code is invalid or expired');
    } finally {
      setIsLoading(false);
    }
  };

  // Send invitation to a family member
  const handleInviteMember = async () => {
    if (!inviteEmail.trim() && !invitePhone.trim()) {
      toast.warning('Required', 'Please enter an email or phone number');
      return;
    }

    if (!selectedRelationship) {
      toast.warning('Required', 'Please select a relationship');
      return;
    }

    setIsSendingInvite(true);

    try {
      await api.post(API_ENDPOINTS.INVITATIONS.CREATE, {
        email: inviteEmail.trim() || undefined,
        phone: invitePhone.trim() || undefined,
        relationship_code: selectedRelationship.code,
        relationship_display: selectedRelationship.name,
        // Delivery channels based on what's provided
        delivery_channels: [
          ...(inviteEmail.trim() ? ['email'] : []),
          ...(invitePhone.trim() ? ['sms', 'whatsapp'] : []),
        ],
      });

      toast.success('Invitation Sent', `Invitation sent to ${inviteEmail || invitePhone}`);

      // Reset form
      setInviteEmail('');
      setInvitePhone('');
      setSelectedRelationship(null);
      setShowMemberManager(false);

      // Refresh invitations list
      await fetchInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('Error', error.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Cancel pending invitation
  const handleCancelInvite = async (invite: PendingInvite) => {
    Alert.alert(
      'Cancel Invitation',
      `Cancel invitation to ${invite.email || invite.phone}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(API_ENDPOINTS.INVITATIONS.CANCEL(invite.id));
              toast.success('Cancelled', 'Invitation has been cancelled');
              await fetchInvitations();
            } catch (error: any) {
              toast.error('Error', error.message || 'Failed to cancel invitation');
            }
          },
        },
      ]
    );
  };

  // Resend invitation
  const handleResendInvite = async (invite: PendingInvite) => {
    try {
      await api.post(API_ENDPOINTS.INVITATIONS.RESEND(invite.id), {});
      toast.success('Resent', `Invitation resent to ${invite.email || invite.phone}`);
    } catch (error: any) {
      toast.error('Error', error.message || 'Failed to resend invitation');
    }
  };

  // Complete and navigate
  const handleComplete = () => {
    if (isFromSettings) {
      navigation.goBack();
    } else {
      navigation.navigate('Pricing');
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Share invite code
  const shareInviteCode = async () => {
    const code = activeWorkspace?.inviteCode || 'FAMILY';
    try {
      await Share.share({
        message: `Join our family on FamilyKnows!\n\nFamily: ${familyName || activeWorkspace?.name || 'My Family'}\nInvite Code: ${code}\n\nDownload the app and use this code to join.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Get relationship display info
  const getRelationshipInfo = (code: string) => {
    const rel = relationships.find(r => r.code === code);
    return rel || { name: 'Other', color: '#78716C', icon: 'account-question' };
  };

  // Render relationship card for selection
  const renderRelationshipCard = (relationship: Relationship, isSelected: boolean) => (
    <TouchableOpacity
      key={relationship.id}
      style={[
        styles.relationshipCard,
        {
          backgroundColor: isSelected
            ? relationship.color + '20'
            : theme.colors.utility.secondaryBackground,
          borderColor: isSelected ? relationship.color : 'transparent',
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={() => setSelectedRelationship(relationship)}
    >
      <View
        style={[
          styles.relationshipIconContainer,
          { backgroundColor: relationship.color + '20' },
        ]}
      >
        <MaterialCommunityIcons
          name={relationship.icon as any}
          size={28}
          color={relationship.color}
        />
      </View>
      <Text
        style={[
          styles.relationshipName,
          {
            color: isSelected ? relationship.color : theme.colors.utility.primaryText,
            fontWeight: isSelected ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {relationship.name}
      </Text>
      {isSelected && (
        <View style={[styles.selectedBadge, { backgroundColor: relationship.color }]}>
          <MaterialCommunityIcons name="check" size={14} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  // Render member card
  const renderMemberCard = (member: Member) => {
    const relInfo = getRelationshipInfo(member.relationship);

    return (
      <TouchableOpacity
        key={member.id}
        style={[styles.memberCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}
        onPress={() => {
          if (!member.isCurrentUser) {
            setSelectedMember(member);
            setShowMemberOptions(true);
          }
        }}
        disabled={member.isCurrentUser}
      >
        <View style={[styles.avatar, { backgroundColor: relInfo.color }]}>
          <MaterialCommunityIcons name={relInfo.icon as any} size={20} color="#fff" />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: theme.colors.utility.primaryText }]}>
              {member.name} {member.isCurrentUser && '(You)'}
            </Text>
            <View style={[styles.relationshipBadge, { backgroundColor: relInfo.color + '20' }]}>
              <Text style={[styles.relationshipBadgeText, { color: relInfo.color }]}>
                {member.relationshipDisplay}
              </Text>
            </View>
          </View>
          <Text style={[styles.memberEmail, { color: theme.colors.utility.secondaryText }]}>
            {member.email}
          </Text>
        </View>
        {!member.isCurrentUser && (
          <MaterialCommunityIcons
            name="dots-vertical"
            size={20}
            color={theme.colors.utility.secondaryText}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Render pending invite card
  const renderPendingInviteCard = (invite: PendingInvite) => {
    const relInfo = getRelationshipInfo(invite.relationship);

    return (
      <View
        key={invite.id}
        style={[styles.inviteCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}
      >
        <View style={[styles.avatar, { backgroundColor: relInfo.color + '40' }]}>
          <MaterialCommunityIcons name="email-outline" size={20} color={relInfo.color} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: theme.colors.utility.primaryText }]}>
              {invite.email || invite.phone}
            </Text>
            <View style={[styles.pendingBadge, { backgroundColor: theme.colors.semantic.warning + '20' }]}>
              <Text style={[styles.pendingBadgeText, { color: theme.colors.semantic.warning }]}>
                Pending
              </Text>
            </View>
          </View>
          <Text style={[styles.memberEmail, { color: theme.colors.utility.secondaryText }]}>
            {invite.relationshipDisplay}
          </Text>
        </View>
        <View style={styles.inviteActions}>
          <TouchableOpacity onPress={() => handleResendInvite(invite)} style={styles.inviteAction}>
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={theme.colors.brand.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCancelInvite(invite)} style={styles.inviteAction}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={theme.colors.semantic.error}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render manage mode
  const renderManageMode = () => {
    const totalMembers = members.length;
    const totalPending = pendingInvites.length;

    return (
      <View style={styles.manageContainer}>
        {/* Workspace Info Card */}
        <View style={[styles.workspaceCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}>
          <View style={styles.workspaceCardHeader}>
            <View>
              <Text style={[styles.workspaceLabel, { color: theme.colors.utility.secondaryText }]}>
                Family Workspace
              </Text>
              <Text style={[styles.workspaceName, { color: theme.colors.utility.primaryText }]}>
                {familyName || activeWorkspace?.name || 'My Family'}
              </Text>
            </View>
            <TouchableOpacity onPress={shareInviteCode}>
              <MaterialCommunityIcons
                name="share-variant"
                size={24}
                color={theme.colors.brand.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.workspaceStats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.brand.primary }]}>
                {totalMembers}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.utility.secondaryText }]}>
                Members
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.semantic.warning }]}>
                {totalPending}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.utility.secondaryText }]}>
                Pending
              </Text>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.utility.primaryText }]}>
              Family Members
            </Text>
            <TouchableOpacity onPress={() => setShowMemberManager(true)}>
              <MaterialCommunityIcons
                name="account-plus"
                size={24}
                color={theme.colors.brand.primary}
              />
            </TouchableOpacity>
          </View>

          {isLoadingMembers ? (
            <ActivityIndicator color={theme.colors.brand.primary} style={{ marginVertical: 20 }} />
          ) : members.length > 0 ? (
            members.map(renderMemberCard)
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={48}
                color={theme.colors.utility.secondaryText}
              />
              <Text style={[styles.emptyText, { color: theme.colors.utility.secondaryText }]}>
                No family members yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.utility.secondaryText }]}>
                Tap the + button to invite someone
              </Text>
            </View>
          )}
        </View>

        {/* Pending Invitations Section */}
        {pendingInvites.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.utility.primaryText }]}>
                Pending Invitations
              </Text>
            </View>
            {pendingInvites.map(renderPendingInviteCard)}
          </View>
        )}

        {/* Done Button for Settings */}
        {isFromSettings && (
          <Button
            title="Done"
            onPress={handleComplete}
            buttonStyle={[styles.primaryButton, { backgroundColor: theme.colors.brand.primary }]}
            titleStyle={styles.primaryButtonText}
            containerStyle={{ marginTop: 24 }}
          />
        )}
      </View>
    );
  };

  // Render choose mode
  const renderChooseMode = () => (
    <View style={styles.optionsContainer}>
      <TouchableOpacity
        style={[styles.optionCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}
        onPress={() => setSetupMode('create')}
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={48}
          color={theme.colors.brand.primary}
        />
        <Text style={[styles.optionTitle, { color: theme.colors.utility.primaryText }]}>
          Create New Family
        </Text>
        <Text style={[styles.optionDescription, { color: theme.colors.utility.secondaryText }]}>
          Start a new family workspace and invite members
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}
        onPress={() => setSetupMode('join')}
      >
        <MaterialCommunityIcons
          name="account-plus-outline"
          size={48}
          color={theme.colors.brand.primary}
        />
        <Text style={[styles.optionTitle, { color: theme.colors.utility.primaryText }]}>
          Join Existing Family
        </Text>
        <Text style={[styles.optionDescription, { color: theme.colors.utility.secondaryText }]}>
          Enter an invite code to join your family
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render create mode
  const renderCreateMode = () => (
    <>
      {!prefillFamily && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSetupMode(workspaces.length > 0 ? 'manage' : 'choose')}
        >
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

      <View style={styles.formContainer}>
        <Text style={[styles.formTitle, { color: theme.colors.utility.primaryText }]}>
          {prefillFamily
            ? 'Confirm Your Family Workspace'
            : 'Create Your Family Workspace'
          }
        </Text>

        {prefillFamily && (
          <View style={[styles.prefillNotice, { backgroundColor: theme.colors.semantic.success + '15' }]}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={theme.colors.semantic.success}
            />
            <Text style={[styles.prefillText, { color: theme.colors.semantic.success }]}>
              We remembered your family name from registration!
            </Text>
          </View>
        )}

        <Input
          placeholder="Enter Family Name"
          value={familyName}
          onChangeText={setFamilyName}
          leftIcon={
            <MaterialCommunityIcons
              name="home-heart"
              size={20}
              color={theme.colors.utility.secondaryText}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[
            styles.input,
            {
              backgroundColor: theme.colors.utility.secondaryBackground,
              borderColor: errors.familyName ? theme.colors.semantic.error : 'transparent'
            }
          ]}
          inputStyle={{ color: theme.colors.utility.primaryText }}
          errorMessage={errors.familyName}
          errorStyle={{ color: theme.colors.semantic.error }}
        />

        <Text style={[styles.helperText, { color: theme.colors.utility.secondaryText }]}>
          {prefillFamily
            ? 'You can edit the name above or keep it as is.'
            : 'Choose a name that represents your family, like your surname.'
          }
        </Text>

        <Button
          title={isLoading ? 'Creating...' : (prefillFamily ? 'Confirm & Create' : 'Create Family')}
          onPress={handleCreateFamily}
          buttonStyle={[styles.primaryButton, { backgroundColor: theme.colors.brand.primary }]}
          titleStyle={styles.primaryButtonText}
          disabled={!familyName.trim() || isLoading}
          disabledStyle={{ opacity: 0.5 }}
          loading={isLoading}
        />
      </View>
    </>
  );

  // Render join mode
  const renderJoinMode = () => (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setSetupMode(workspaces.length > 0 ? 'manage' : 'choose')}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={theme.colors.utility.primaryText}
        />
        <Text style={[styles.backText, { color: theme.colors.utility.primaryText }]}>
          Back
        </Text>
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={[styles.formTitle, { color: theme.colors.utility.primaryText }]}>
          Join a Family
        </Text>

        <Input
          placeholder="Enter 6-digit invite code"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          leftIcon={
            <MaterialCommunityIcons
              name="ticket-confirmation"
              size={20}
              color={theme.colors.utility.secondaryText}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[
            styles.input,
            {
              backgroundColor: theme.colors.utility.secondaryBackground,
              borderColor: errors.inviteCode ? theme.colors.semantic.error : 'transparent'
            }
          ]}
          inputStyle={{
            color: theme.colors.utility.primaryText,
            textAlign: 'center',
            fontSize: 20,
            letterSpacing: 4
          }}
          errorMessage={errors.inviteCode}
          errorStyle={{ color: theme.colors.semantic.error }}
        />

        <Text style={[styles.helperText, { color: theme.colors.utility.secondaryText }]}>
          Ask your family admin for the invite code to join your family workspace.
        </Text>

        <Button
          title={isLoading ? 'Joining...' : 'Join Family'}
          onPress={handleJoinFamily}
          buttonStyle={[styles.primaryButton, { backgroundColor: theme.colors.brand.primary }]}
          titleStyle={styles.primaryButtonText}
          disabled={inviteCode.length !== 6 || isLoading}
          disabledStyle={{ opacity: 0.5 }}
          loading={isLoading}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.utility.primaryBackground }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          setupMode === 'manage' ? (
            <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
          ) : undefined
        }
      >
        {/* Progress Bar */}
        {!isFromSettings && setupMode !== 'manage' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.brand.primary,
                    width: '100%'
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.utility.secondaryText }]}>
              Step 6 of 6
            </Text>
          </View>
        )}

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={setupMode === 'manage' ? 'account-group-outline' : 'account-group'}
            size={60}
            color={theme.colors.brand.primary}
          />
          <Text style={[styles.title, { color: theme.colors.utility.primaryText }]}>
            {setupMode === 'manage' ? 'Family Members' : 'Set Up Your Family'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.utility.secondaryText }]}>
            {setupMode === 'manage'
              ? 'Invite family members to collaborate'
              : 'Create or join a family to start collaborating'}
          </Text>
        </Animated.View>

        {/* Content */}
        <Animated.View style={{ opacity: contentOpacity }}>
          {setupMode === 'choose' && renderChooseMode()}
          {setupMode === 'create' && renderCreateMode()}
          {setupMode === 'join' && renderJoinMode()}
          {setupMode === 'manage' && renderManageMode()}
        </Animated.View>

        {/* Skip Option */}
        {!isFromSettings && setupMode === 'choose' && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.colors.utility.secondaryText }]}>
              Set up Later
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Invite Member Modal */}
      <Modal
        visible={showMemberManager}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberManager(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.utility.primaryBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.utility.primaryText }]}>
                Invite Family Member
              </Text>
              <TouchableOpacity onPress={() => setShowMemberManager(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.utility.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Contact Input */}
              <Input
                placeholder="Email address"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={theme.colors.utility.secondaryText}
                  />
                }
                containerStyle={styles.inputContainer}
                inputContainerStyle={[
                  styles.input,
                  { backgroundColor: theme.colors.utility.secondaryBackground }
                ]}
                inputStyle={{ color: theme.colors.utility.primaryText }}
              />

              <Text style={[styles.orText, { color: theme.colors.utility.secondaryText }]}>
                or
              </Text>

              <Input
                placeholder="Phone number"
                value={invitePhone}
                onChangeText={setInvitePhone}
                keyboardType="phone-pad"
                leftIcon={
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={20}
                    color={theme.colors.utility.secondaryText}
                  />
                }
                containerStyle={styles.inputContainer}
                inputContainerStyle={[
                  styles.input,
                  { backgroundColor: theme.colors.utility.secondaryBackground }
                ]}
                inputStyle={{ color: theme.colors.utility.primaryText }}
              />

              {/* Relationship Selector */}
              <Text style={[styles.sectionLabel, { color: theme.colors.utility.primaryText }]}>
                Select Relationship
              </Text>

              {isLoadingRelationships ? (
                <ActivityIndicator color={theme.colors.brand.primary} style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.relationshipGrid}>
                  {relationships.map((rel) =>
                    renderRelationshipCard(rel, selectedRelationship?.code === rel.code)
                  )}
                </View>
              )}
            </ScrollView>

            <Button
              title={isSendingInvite ? 'Sending...' : 'Send Invitation'}
              onPress={handleInviteMember}
              buttonStyle={[styles.modalButton, { backgroundColor: theme.colors.brand.primary }]}
              disabled={(!inviteEmail.trim() && !invitePhone.trim()) || !selectedRelationship || isSendingInvite}
              disabledStyle={{ opacity: 0.5 }}
              loading={isSendingInvite}
            />
          </View>
        </View>
      </Modal>

      {/* Member Options Modal */}
      {selectedMember && (
        <Modal
          visible={showMemberOptions}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowMemberOptions(false);
            setSelectedMember(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowMemberOptions(false);
              setSelectedMember(null);
            }}
          >
            <View style={[styles.memberOptionsModal, { backgroundColor: theme.colors.utility.primaryBackground }]}>
              <View style={styles.memberOptionsHeader}>
                <View style={[styles.avatar, { backgroundColor: getRelationshipInfo(selectedMember.relationship).color }]}>
                  <MaterialCommunityIcons
                    name={getRelationshipInfo(selectedMember.relationship).icon as any}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.memberOptionsInfo}>
                  <Text style={[styles.memberOptionsName, { color: theme.colors.utility.primaryText }]}>
                    {selectedMember.name}
                  </Text>
                  <Text style={[styles.memberOptionsEmail, { color: theme.colors.utility.secondaryText }]}>
                    {selectedMember.email}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              <Text style={[styles.optionsTitle, { color: theme.colors.utility.primaryText }]}>
                Current Relationship: {selectedMember.relationshipDisplay}
              </Text>

              <TouchableOpacity
                style={styles.dangerOption}
                onPress={() => {
                  Alert.alert(
                    'Remove Member',
                    `Are you sure you want to remove ${selectedMember.name} from the family?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await api.delete(API_ENDPOINTS.WORKSPACE.GET_MEMBER(selectedMember.id));
                            toast.success('Removed', `${selectedMember.name} has been removed`);
                            setShowMemberOptions(false);
                            setSelectedMember(null);
                            await fetchMembers();
                          } catch (error: any) {
                            toast.error('Error', error.message || 'Failed to remove member');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <MaterialCommunityIcons
                  name="account-remove"
                  size={24}
                  color={theme.colors.semantic.error}
                />
                <Text style={[styles.dangerOptionText, { color: theme.colors.semantic.error }]}>
                  Remove from Family
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Family Action Sheet */}
      <FamilyActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        familyName={familyName}
        inviteCode={activeWorkspace?.inviteCode || 'FAMILY'}
        onShare={shareInviteCode}
        onComplete={() => {
          setShowActionSheet(false);
          // After creating, show invite modal
          setShowMemberManager(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
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
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  manageContainer: {
    flex: 1,
  },
  workspaceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  workspaceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workspaceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  workspaceName: {
    fontSize: 20,
    fontWeight: '700',
  },
  workspaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  relationshipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  relationshipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteAction: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  optionCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    marginLeft: 8,
  },
  formContainer: {
    marginTop: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  prefillNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  prefillText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  orText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 25,
    paddingVertical: 15,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  // Relationship card styles
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  relationshipCard: {
    width: '30%',
    aspectRatio: 0.85,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
  },
  relationshipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  relationshipName: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOptionsModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  memberOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberOptionsInfo: {
    flex: 1,
  },
  memberOptionsName: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberOptionsEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  dangerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  dangerOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

// src/features/onboarding/screens/FamilySetupScreen.tsx (Fixed version)
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Text, Input, Button, Avatar, Divider } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FamilyActionSheet from '../components/FamilyActionSheet';
import api from '../../../services/api';

type FamilySetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'FamilySetup'>;
type FamilySetupRouteProp = RouteProp<OnboardingStackParamList, 'FamilySetup'>;

interface Props {
  navigation: FamilySetupNavigationProp;
  route: FamilySetupRouteProp;
}

type SetupMode = 'choose' | 'create' | 'join' | 'manage';
type UserRole = 'admin' | 'editor' | 'viewer';

const USER_ID = 'current-user-id';

const generateMockWorkspace = (name: string, isFirst: boolean = false) => {
  const workspace = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    createdBy: USER_ID,
    createdAt: new Date(),
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    isDefault: isFirst,
    members: [
      {
        id: USER_ID,
        name: 'You',
        email: 'you@example.com',
        phone: '+91 9876543210',
        role: 'admin' as UserRole,
        joinedAt: new Date(),
      },
    ],
    pendingInvites: [],
  };

  return workspace;
};

export const FamilySetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { isFromSettings, prefillFamily } = route.params;
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    updateWorkspaces,
    showWorkspaceSwitcher: globalShowSwitcher,
    setShowWorkspaceSwitcher: setGlobalShowSwitcher
  } = useWorkspace();

  // If we have a prefillFamily from StoryOnboarding, start in 'create' mode
  // This is the "Delivery" - the user sees their family name already filled in!
  const [setupMode, setSetupMode] = useState<SetupMode>(
    prefillFamily && !isFromSettings ? 'create' : 'choose'
  );
  const [showLocalWorkspaceSwitcher, setShowLocalWorkspaceSwitcher] = useState(false);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Form states - pre-fill familyName if we have it from the Story
  const [familyName, setFamilyName] = useState(prefillFamily || '');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

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
              };
            };
            steps?: Record<string, { status: string }>;
          };
        }>('/api/FKonboarding/status');

        const stepData = response.data?.data?.step_data?.['family-space'];
        const stepStatus = response.data?.data?.steps?.['family-space'];

        // If step has data, we're in EDIT mode - pre-populate
        if (stepData) {
          setIsEditMode(true);
          const savedName = stepData.name || stepData.family_name;
          if (savedName && !familyName) {
            setFamilyName(savedName);
            setSetupMode('manage'); // Already have a family, show manage mode
          }
        } else if (stepStatus?.status === 'completed') {
          setIsEditMode(true);
          setSetupMode('manage');
        }
      } catch (error) {
        console.log('Could not fetch onboarding status for family-space step:', error);
      }
    };

    // Only fetch if not coming from settings and no prefill
    if (!isFromSettings && !prefillFamily) {
      fetchExistingData();
    }
  }, [isFromSettings, prefillFamily]);

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
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isFromSettings && workspaces.length > 0) {
      setSetupMode('manage');
    } else if (!isFromSettings && workspaces.length === 0) {
      // If we have prefillFamily from Story, stay in 'create' mode
      // Otherwise, show the 'choose' mode
      if (!prefillFamily) {
        setSetupMode('choose');
      }
      // If prefillFamily exists, we already started in 'create' mode
    } else if (isFromSettings && workspaces.length === 0) {
      setSetupMode('choose');
    }
  }, [isFromSettings, workspaces, prefillFamily]);

  const isUserAdmin = (workspace: any): boolean => {
    const currentUser = workspace.members.find((m: any) => m.id === USER_ID);
    return currentUser?.role === 'admin';
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setErrors({ familyName: 'Family name is required' });
      return;
    }
    setErrors({});
    
    const newWorkspace = generateMockWorkspace(familyName, workspaces.length === 0);
    const updated = [...workspaces, newWorkspace];
    await updateWorkspaces(updated);
    
    if (workspaces.length === 0) {
      await setActiveWorkspace(newWorkspace);
    }
    
    setShowActionSheet(true);
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim() || inviteCode.length !== 6) {
      setErrors({ inviteCode: 'Please enter a valid 6-character code' });
      return;
    }
    setErrors({});
    
    Alert.alert(
      'Join Request Sent',
      'Your request to join the family has been sent. You\'ll be notified once approved.',
      [{ text: 'OK', onPress: handleComplete }]
    );
  };

  const handleInviteMember = async () => {
    if (!activeWorkspace || !isUserAdmin(activeWorkspace)) return;
    
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    const newInvite = {
      id: Math.random().toString(36).substring(2, 9),
      email: inviteEmail,
      role: inviteRole,
      invitedBy: USER_ID,
      invitedAt: new Date(),
      status: 'pending' as const,
      code: activeWorkspace.inviteCode,
    };
    
    const updated = workspaces.map(w => {
      if (w.id === activeWorkspace.id) {
        return {
          ...w,
          pendingInvites: [...w.pendingInvites, newInvite],
        };
      }
      return w;
    });
    
    await updateWorkspaces(updated);
    setInviteEmail('');
    setInviteRole('viewer');
    setShowMemberManager(false);
    Alert.alert('Success', 'Invitation sent successfully!');
  };

  const handleRemoveMember = (member: any) => {
    if (!activeWorkspace || !isUserAdmin(activeWorkspace)) return;
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from ${activeWorkspace.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = workspaces.map(w => {
              if (w.id === activeWorkspace.id) {
                return {
                  ...w,
                  members: w.members.filter((m: any) => m.id !== member.id),
                };
              }
              return w;
            });
            await updateWorkspaces(updated);
            setShowMemberOptions(false);
            setSelectedMember(null);
          },
        },
      ]
    );
  };

  const handleChangeRole = async (member: any, newRole: UserRole) => {
    if (!activeWorkspace || !isUserAdmin(activeWorkspace)) return;
    
    const updated = workspaces.map(w => {
      if (w.id === activeWorkspace.id) {
        return {
          ...w,
          members: w.members.map((m: any) => 
            m.id === member.id ? { ...m, role: newRole } : m
          ),
        };
      }
      return w;
    });
    
    await updateWorkspaces(updated);
    setShowMemberOptions(false);
    setSelectedMember(null);
  };

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

  const shareInviteCode = async () => {
    if (!activeWorkspace) return;
    
    try {
      await Share.share({
        message: `Join our family on FamilyKnows!\n\nFamily: ${activeWorkspace.name}\nInvite Code: ${activeWorkspace.inviteCode}\n\nDownload the app and use this code to join.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'shield-crown';
      case 'editor': return 'pencil';
      case 'viewer': return 'eye';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return theme.colors.semantic.error;
      case 'editor': return theme.colors.semantic.warning;
      case 'viewer': return theme.colors.semantic.info;
    }
  };

  const renderManageMode = () => {
    if (!activeWorkspace) return null;
    
    const isAdmin = isUserAdmin(activeWorkspace);
    
    return (
      <View style={styles.manageContainer}>
        {/* Current Workspace Card */}
        <TouchableOpacity
          style={[styles.workspaceCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}
          onPress={() => workspaces.length > 1 && setShowLocalWorkspaceSwitcher(true)}
          disabled={workspaces.length <= 1}
        >
          <View style={styles.workspaceCardHeader}>
            <View>
              <Text style={[styles.workspaceLabel, { color: theme.colors.utility.secondaryText }]}>
                Current Workspace
              </Text>
              <Text style={[styles.workspaceName, { color: theme.colors.utility.primaryText }]}>
                {activeWorkspace.name}
              </Text>
            </View>
            <View style={styles.workspaceCardRight}>
              {activeWorkspace.isDefault && (
                <View style={[styles.defaultBadge, { backgroundColor: theme.colors.brand.primary }]}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
              {workspaces.length > 1 && (
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.utility.secondaryText}
                />
              )}
            </View>
          </View>
          
          <View style={styles.workspaceStats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.brand.primary }]}>
                {activeWorkspace.members.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.utility.secondaryText }]}>
                Members
              </Text>
            </View>
            {isAdmin && (
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.colors.semantic.warning }]}>
                  {activeWorkspace.pendingInvites.filter((i: any) => i.status === 'pending').length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.utility.secondaryText }]}>
                  Pending
                </Text>
              </View>
            )}
            <View style={styles.stat}>
              <TouchableOpacity onPress={shareInviteCode}>
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color={theme.colors.brand.primary}
                />
              </TouchableOpacity>
              <Text style={[styles.statLabel, { color: theme.colors.utility.secondaryText }]}>
                Share
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.utility.primaryText }]}>
              Members
            </Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => setShowMemberManager(true)}>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={24}
                  color={theme.colors.brand.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          
          {activeWorkspace.members.map((member: any) => (
            <TouchableOpacity
              key={member.id}
              style={[styles.memberCard, { backgroundColor: theme.colors.utility.secondaryBackground }]}
              onPress={() => {
                if (isAdmin && member.id !== USER_ID) {
                  setSelectedMember(member);
                  setShowMemberOptions(true);
                }
              }}
              disabled={!isAdmin || member.id === USER_ID}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.brand.primary }]}>
                <Text style={styles.avatarText}>
                  {member.name.split(' ').map((n: string) => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberName, { color: theme.colors.utility.primaryText }]}>
                    {member.name} {member.id === USER_ID && '(You)'}
                  </Text>
                  <MaterialCommunityIcons
                    name={getRoleIcon(member.role)}
                    size={16}
                    color={getRoleColor(member.role)}
                  />
                </View>
                <Text style={[styles.memberEmail, { color: theme.colors.utility.secondaryText }]}>
                  {member.email}
                </Text>
              </View>
              {isAdmin && member.id !== USER_ID && (
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={20}
                  color={theme.colors.utility.secondaryText}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Create New Workspace"
            onPress={() => setSetupMode('create')}
            buttonStyle={[styles.actionButton, { backgroundColor: theme.colors.brand.primary }]}
            titleStyle={styles.actionButtonText}
          />
          <Button
            title="Join Another Workspace"
            onPress={() => setSetupMode('join')}
            type="outline"
            buttonStyle={[styles.actionButton, { borderColor: theme.colors.brand.primary }]}
            titleStyle={[styles.actionButtonText, { color: theme.colors.brand.primary }]}
          />
        </View>
      </View>
    );
  };

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

  const renderCreateMode = () => (
    <>
      {/* Only show back button if user can go back to choose mode */}
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

        {/* Show a success indicator when prefilled */}
        {prefillFamily && (
          <View style={[styles.prefillNotice, { backgroundColor: theme.colors.semantic.success + '15' }]}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={theme.colors.semantic.success}
            />
            <Text style={[styles.prefillText, { color: theme.colors.semantic.success }]}>
              We remembered your family name from the story!
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
            : 'Choose a name that represents your family. This can be your family surname or a creative name.'
          }
        </Text>

        <Button
          title={prefillFamily ? 'Confirm & Create' : 'Create Family'}
          onPress={handleCreateFamily}
          buttonStyle={[styles.primaryButton, { backgroundColor: theme.colors.brand.primary }]}
          titleStyle={styles.primaryButtonText}
          disabled={!familyName.trim()}
          disabledStyle={{ opacity: 0.5 }}
        />
      </View>
    </>
  );

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
          title="Join Family"
          onPress={handleJoinFamily}
          buttonStyle={[styles.primaryButton, { backgroundColor: theme.colors.brand.primary }]}
          titleStyle={styles.primaryButtonText}
          disabled={inviteCode.length !== 6}
          disabledStyle={{ opacity: 0.5 }}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.utility.primaryBackground }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        <View style={styles.header}>
          <MaterialCommunityIcons 
            name={setupMode === 'manage' ? 'account-group-outline' : 'account-group'} 
            size={60} 
            color={theme.colors.brand.primary} 
          />
          <Text style={[styles.title, { color: theme.colors.utility.primaryText }]}>
            {setupMode === 'manage' ? 'Family Workspaces' : 'Set Up Your Family'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.utility.secondaryText }]}>
            {setupMode === 'manage'
              ? 'Manage your family workspaces and members'
              : 'Create or join a family to start collaborating'}
          </Text>
        </View>

        {/* Content */}
        {setupMode === 'choose' && renderChooseMode()}
        {setupMode === 'create' && renderCreateMode()}
        {setupMode === 'join' && renderJoinMode()}
        {setupMode === 'manage' && renderManageMode()}

        {/* Skip Option */}
        {!isFromSettings && setupMode === 'choose' && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.colors.utility.secondaryText }]}>
              Set up Later
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Workspace Switcher Modal */}
      <Modal
        visible={showLocalWorkspaceSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocalWorkspaceSwitcher(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.utility.primaryBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.utility.primaryText }]}>
                Switch Workspace
              </Text>
              <TouchableOpacity onPress={() => setShowLocalWorkspaceSwitcher(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.utility.secondaryText}
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={workspaces}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.workspaceItem,
                    { 
                      backgroundColor: item.id === activeWorkspace?.id 
                        ? theme.colors.brand.primary + '20'
                        : theme.colors.utility.secondaryBackground 
                    }
                  ]}
                  onPress={() => {
                    setActiveWorkspace(item);
                    setShowLocalWorkspaceSwitcher(false);
                  }}
                >
                  <View style={styles.workspaceItemLeft}>
                    <Text style={[styles.workspaceItemName, { color: theme.colors.utility.primaryText }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.workspaceItemInfo, { color: theme.colors.utility.secondaryText }]}>
                      {item.members.length} members
                    </Text>
                  </View>
                  <View style={styles.workspaceItemRight}>
                    {item.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: theme.colors.brand.primary }]}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                    {item.id === activeWorkspace?.id && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={theme.colors.brand.primary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
                Invite Member
              </Text>
              <TouchableOpacity onPress={() => setShowMemberManager(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.utility.secondaryText}
                />
              </TouchableOpacity>
            </View>
            
            <Input
              placeholder="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
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
            
            <View style={styles.roleSelector}>
              <Text style={[styles.roleSelectorLabel, { color: theme.colors.utility.primaryText }]}>
                Select Role:
              </Text>
              {(['viewer', 'editor', 'admin'] as UserRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    { 
                      backgroundColor: inviteRole === role 
                        ? theme.colors.brand.primary + '20'
                        : theme.colors.utility.secondaryBackground,
                      borderColor: inviteRole === role
                        ? theme.colors.brand.primary
                        : 'transparent',
                    }
                  ]}
                  onPress={() => setInviteRole(role)}
                >
                  <MaterialCommunityIcons
                    name={getRoleIcon(role)}
                    size={20}
                    color={getRoleColor(role)}
                  />
                  <Text style={[styles.roleOptionText, { color: theme.colors.utility.primaryText }]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Button
              title="Send Invitation"
              onPress={handleInviteMember}
              buttonStyle={[styles.modalButton, { backgroundColor: theme.colors.brand.primary }]}
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
                <Avatar
                  rounded
                  title={selectedMember.name.split(' ').map((n: string) => n[0]).join('')}
                  size={40}
                  containerStyle={{ backgroundColor: theme.colors.brand.primary }}
                />
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
                Change Role
              </Text>
              
              {(['viewer', 'editor', 'admin'] as UserRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={styles.roleChangeOption}
                  onPress={() => handleChangeRole(selectedMember, role)}
                >
                  <MaterialCommunityIcons
                    name={getRoleIcon(role)}
                    size={24}
                    color={getRoleColor(role)}
                  />
                  <Text style={[styles.roleChangeText, { color: theme.colors.utility.primaryText }]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                  {selectedMember.role === role && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={theme.colors.brand.primary}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              ))}
              
              <Divider style={{ marginVertical: 16 }} />
              
              <TouchableOpacity
                style={styles.dangerOption}
                onPress={() => handleRemoveMember(selectedMember)}
              >
                <MaterialCommunityIcons
                  name="account-remove"
                  size={24}
                  color={theme.colors.semantic.error}
                />
                <Text style={[styles.dangerOptionText, { color: theme.colors.semantic.error }]}>
                  Remove from Workspace
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
        inviteCode={activeWorkspace?.inviteCode || ''}
        onShare={shareInviteCode}
        onComplete={handleComplete}
      />
    </View>
  );
};

// Styles remain the same as before...
const styles = StyleSheet.create({
  // ... (all the previous styles)
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
  workspaceCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionButtons: {
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '80%',
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
  workspaceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  workspaceItemLeft: {
    flex: 1,
  },
  workspaceItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workspaceItemInfo: {
    fontSize: 14,
  },
  workspaceItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 14,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleChangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  roleChangeText: {
    fontSize: 16,
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
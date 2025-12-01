// frontend/src/pages/VaNi/channels/WhatsAppIntegrationPage.tsx
// COMPLETE WORKING VERSION - NO PLACEHOLDERS

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  MessageSquare,
  Shield,
  CheckCircle,
  Lock,
  Users,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useGroups, useVerifyGroupAccess } from '../../../hooks/queries/useGroupQueries';
import { useTenantProfile } from '../../../hooks/useTenantProfile';

const WhatsAppIntegrationPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [accessType, setAccessType] = useState<'user' | 'admin'>('user');

  // Get tenant profile to check if business profile is complete
  const { profile: tenantProfile, loading: isLoadingProfile } = useTenantProfile();

  // Check if business profile is complete (has business_name at minimum)
  const hasBusinessProfile = !!tenantProfile?.business_name;

  // Fetch all BBB chapters from database
  const { data: groups, isLoading: isLoadingGroups, error: groupsError } = useGroups('bbb_chapter');

  // Debug logging
  useEffect(() => {
    console.log('=== GROUPS DEBUG ===');
    console.log('isLoading:', isLoadingGroups);
    console.log('groups:', groups);
    console.log('error:', groupsError);
    console.log('==================');
  }, [isLoadingGroups, groups, groupsError]);

  // Auto-select first group if only one exists
  useEffect(() => {
    if (groups && groups.length === 1) {
      setSelectedGroupId(groups[0].id);
      console.log('Auto-selected group:', groups[0].id);
    }
  }, [groups]);

  // Use real API hook
  const { mutate: verifyAccess, isPending: isVerifying } = useVerifyGroupAccess();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== FORM SUBMIT ===');
    console.log('Password length:', password.length);
    console.log('Selected Group:', selectedGroupId);
    console.log('Access Type:', accessType);
    console.log('Has Business Profile:', hasBusinessProfile);
    console.log('==================');

    // Check if business profile exists first
    if (!hasBusinessProfile) {
      toast({
        variant: "destructive",
        title: "Business Profile Required",
        description: "Please create your business profile first before joining BBB."
      });
      // Redirect to profile creation
      setTimeout(() => {
        navigate('/tenant/profile');
      }, 1500);
      return;
    }

    if (!password.trim() || !selectedGroupId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a chapter and enter password"
      });
      return;
    }

    const selectedGroup = groups?.find(g => g.id === selectedGroupId);

    console.log('🔐 Calling verifyAccess API...');

    verifyAccess({
      groupId: selectedGroupId,
      password: password.trim(),
      accessType: accessType
    }, {
      onSuccess: (result) => {
        console.log('✅ API Response:', result);
        
        if (result.access_granted) {
          console.log('✅ Access GRANTED!');
          
          toast({
            title: "Welcome! 🎉",
            description: `Access granted to ${result.group_name || selectedGroup?.group_name || 'BBB'}`,
            duration: 3000
          });

          const redirectPath = result.redirect_to || '/vani/channels/bbb/onboarding';
          
          console.log('🔄 Redirecting to:', redirectPath);
          console.log('🔄 With state:', {
            branch: result.group_name?.toLowerCase().replace(/\s+/g, '-') || 'chapter',
            groupId: result.group_id,
            groupName: result.group_name,
            accessLevel: result.access_level
          });
          
          setTimeout(() => {
            navigate(redirectPath, {
              state: { 
                branch: result.group_name?.toLowerCase().replace(/\s+/g, '-') || 'chapter',
                groupId: result.group_id,
                groupName: result.group_name,
                accessLevel: result.access_level
              }
            });
          }, 1000);
        } else {
          console.log('❌ Access DENIED:', result.error);
          
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: result.error || 'Invalid password. Please try again.'
          });
          
          setPassword('');
        }
      },
      onError: (error: any) => {
        console.error('❌ API Error:', error);
        console.error('❌ Error response:', error?.response?.data);
        
        const errorMessage = error?.response?.data?.error 
          || error?.message 
          || 'Failed to verify access. Please try again.';
        
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage
        });
        
        setPassword('');
      }
    });
  };

  const features = [
    {
      icon: MessageSquare,
      title: 'WhatsApp Bot Access',
      description: 'Search directory via WhatsApp using "Hi BBB" command'
    },
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Password-protected directory for verified members only'
    },
    {
      icon: Users,
      title: 'Member Directory',
      description: 'Access to verified business profiles in your chapter'
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'AI-powered semantic search for quick discovery'
    }
  ];

  // Loading state
  if (isLoadingGroups) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }}></div>
          <p style={{ color: colors.utility.primaryText }}>Loading BBB chapters...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (groupsError || !groups || groups.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <Card style={{ backgroundColor: colors.semantic.error + '10', borderColor: colors.semantic.error }}>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
                No BBB Chapters Available
              </h2>
              <p className="mb-4" style={{ color: colors.utility.secondaryText }}>
                {groupsError ? 'Error loading chapters. Please try again.' : 'Please contact your administrator to set up BBB chapters.'}
              </p>
              {groupsError && (
                <p className="text-sm" style={{ color: colors.semantic.error }}>
                  Error: {String(groupsError)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8 max-w-4xl mx-auto" style={{ backgroundColor: colors.utility.primaryBackground }}>
      {/* Hero Section */}
      <div
        className="relative overflow-hidden rounded-2xl p-12 text-center"
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`,
          border: `1px solid ${colors.brand.primary}30`
        }}
      >
        <MessageSquare 
          className="w-20 h-20 mx-auto mb-6" 
          style={{ color: colors.brand.primary }} 
        />
        
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: colors.utility.primaryText }}
        >
          WhatsApp Integration
        </h1>
        
        <p
          className="text-xl mb-2"
          style={{ color: colors.utility.secondaryText }}
        >
          Access BBB Directory via WhatsApp
        </p>
        
        <p
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          Logged in as: <strong>{user?.email || currentTenant?.name}</strong>
        </p>
      </div>

      {/* Info Alert */}
      <Card
        style={{
          backgroundColor: `${colors.semantic.info}10`,
          borderColor: colors.semantic.info
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <AlertCircle 
              className="w-6 h-6 flex-shrink-0 mt-1" 
              style={{ color: colors.semantic.info }} 
            />
            <div>
              <h3 
                className="font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                How WhatsApp Integration Works
              </h3>
              <ul 
                className="space-y-2 text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                <li>• Select your BBB chapter and enter the password to verify membership</li>
                <li>• Complete your business profile in the onboarding flow</li>
                <li>• Message "Hi BBB" to our WhatsApp number to search the directory</li>
                <li>• Get instant results using natural language search</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <div className="flex items-start space-x-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: `${colors.brand.primary}20`
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: colors.brand.primary }} />
                </div>
                <div className="flex-1">
                  <h3
                    className="font-semibold mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Password Entry Card */}
      <Card
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: `${colors.brand.primary}40`
        }}
      >
        <CardHeader
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
            borderBottom: `1px solid ${colors.utility.primaryText}15`
          }}
        >
          <CardTitle style={{ color: colors.utility.primaryText }}>
            <div className="flex items-center space-x-2">
              <Lock className="w-6 h-6" />
              <span>Enter BBB Chapter Password</span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {/* Business Profile Warning */}
            {!isLoadingProfile && !hasBusinessProfile && (
              <div
                className="p-4 rounded-lg flex items-start space-x-3"
                style={{
                  backgroundColor: `${colors.semantic.warning}15`,
                  border: `1px solid ${colors.semantic.warning}40`
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.warning }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.semantic.warning }}>
                    Business Profile Required
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    Please create your business profile before joining BBB.
                    <button
                      type="button"
                      onClick={() => navigate('/tenant/profile')}
                      className="ml-1 underline font-medium"
                      style={{ color: colors.brand.primary }}
                    >
                      Create Profile
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Chapter Selection (if multiple chapters) */}
            {groups.length > 1 && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Select BBB Chapter *
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText
                  }}
                >
                  <option value="">-- Select Chapter --</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name} - {group.chapter || group.branch || 'Chapter'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Display selected chapter info */}
            {selectedGroupId && (
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: `${colors.brand.primary}10`,
                  border: `1px solid ${colors.brand.primary}30`
                }}
              >
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 mt-0.5" style={{ color: colors.brand.primary }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                      {groups.find(g => g.id === selectedGroupId)?.group_name}
                    </p>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {groups.find(g => g.id === selectedGroupId)?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Access Type Selection */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Access Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accessType"
                    value="user"
                    checked={accessType === 'user'}
                    onChange={() => setAccessType('user')}
                    disabled={isVerifying}
                    className="w-4 h-4"
                    style={{ accentColor: colors.brand.primary }}
                  />
                  <span style={{ color: colors.utility.primaryText }}>
                    Member Access
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accessType"
                    value="admin"
                    checked={accessType === 'admin'}
                    onChange={() => setAccessType('admin')}
                    disabled={isVerifying}
                    className="w-4 h-4"
                    style={{ accentColor: colors.brand.primary }}
                  />
                  <span style={{ color: colors.utility.primaryText }}>
                    Admin Access
                  </span>
                </label>
              </div>
              <p 
                className="text-xs mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                {accessType === 'user' 
                  ? 'Member access for joining and searching the directory' 
                  : 'Admin access for managing chapter members'}
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                {accessType === 'user' ? 'Member' : 'Admin'} Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Enter ${accessType} password`}
                disabled={isVerifying || !selectedGroupId}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              />
              <p 
                className="text-xs mt-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Contact your chapter admin if you don't have the password
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying || !password.trim() || !selectedGroupId}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Verify & Continue</span>
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <CardContent className="p-6">
          <h3
            className="font-semibold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Need Help?
          </h3>
          <div className="space-y-3 text-sm" style={{ color: colors.utility.secondaryText }}>
            <p>
              <strong>Q: Where do I get the chapter password?</strong><br />
              A: Contact your chapter admin or check your BBB welcome email.
            </p>
            <p>
              <strong>Q: What's the difference between Member and Admin access?</strong><br />
              A: Member access is for joining and searching. Admin access is for managing chapter members.
            </p>
            <p>
              <strong>Q: Can I use this without WhatsApp?</strong><br />
              A: Yes! You can access the directory directly through the ContractNest web app.
            </p>
            <p>
              <strong>Q: Is my WhatsApp number stored?</strong><br />
              A: Yes, securely in your tenant profile for directory purposes only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppIntegrationPage;
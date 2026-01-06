// src/navigation/types.ts

// Prefill data passed from StoryOnboarding through the entire flow
export type OnboardingPrefillData = {
  prefillName?: string;    // User's name from Story (legacy)
  prefillFamily?: string;  // Family name from Story (legacy)
  prefillFirstName?: string;  // First name from Story
  prefillLastName?: string;   // Last name from Story
  prefillSpaceName?: string;  // Family space name from Story
};

// Auth Stack - includes both auth and onboarding screens
export type AuthStackParamList = {
  // Auth screens
  Splash: undefined;
  Intro: undefined;
  StoryOnboarding: undefined;
  Login: { userName?: string; familyName?: string };
  Signup: OnboardingPrefillData | undefined;
  ForgotPassword: undefined;

  // Onboarding screens (in order) - all carry prefill data
  PhoneAuth: { isFromSettings?: boolean } & OnboardingPrefillData;
  UserProfile: { isFromSettings: boolean } & OnboardingPrefillData;
  GenderSelection: { isFromSettings: boolean } & OnboardingPrefillData;
  ThemeSelection: { isFromSettings: boolean } & OnboardingPrefillData;
  LanguageSelection: { isFromSettings: boolean } & OnboardingPrefillData;
  GoogleDriveConnect: { isFromSettings: boolean } & OnboardingPrefillData;
  FamilySetup: { isFromSettings: boolean } & OnboardingPrefillData;
  Pricing: undefined;

  // Settings screens (accessible from menu)
  UnifiedProfile: undefined;  // Consolidated profile view
  SettingsProfile: { isFromSettings: boolean };
  SettingsPhone: { isFromSettings: boolean };
  SettingsTheme: { isFromSettings: boolean };
  SettingsLanguage: { isFromSettings: boolean };
  SettingsGoogleDrive: { isFromSettings: boolean };
  SettingsFamily: { isFromSettings: boolean };
  SettingsPricing: undefined;

  // Main app
  Main: undefined;
};

// Onboarding Stack - for type safety in onboarding screens
export type OnboardingStackParamList = {
  PhoneAuth: { isFromSettings?: boolean } & OnboardingPrefillData;
  UserProfile: { isFromSettings: boolean } & OnboardingPrefillData;
  GenderSelection: { isFromSettings: boolean } & OnboardingPrefillData;
  ThemeSelection: { isFromSettings: boolean } & OnboardingPrefillData;
  LanguageSelection: { isFromSettings: boolean } & OnboardingPrefillData;
  GoogleDriveConnect: { isFromSettings: boolean } & OnboardingPrefillData;
  FamilySetup: { isFromSettings: boolean } & OnboardingPrefillData;
};

export type MainTabParamList = {
  Home: undefined;
  Assets: undefined;
  Documents: undefined;
  Services: undefined;
  Family: undefined;
};

export type AssetStackParamList = {
  AssetList: undefined;
  AssetDetail: { assetId: string };
  AddAsset: undefined;
  EditAsset: { assetId: string };
};

export type FamilyStackParamList = {
  FamilyMembers: undefined;
  InviteMember: undefined;
  MemberProfile: { memberId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Settings: undefined;
  ThemeSelector: undefined;
};

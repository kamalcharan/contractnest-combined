// src/navigation/MainNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainDashboard } from '../features/dashboard/screens/MainDashboard';

// Import all screens that can be accessed from settings (Storyboard Style)
import { ProfileSetupScreen } from '../features/onboarding/screens/ProfileSetupScreen';
import { MobileNumberScreen } from '../features/onboarding/screens/MobileNumberScreen';
import { ThemeSetupScreen } from '../features/onboarding/screens/ThemeSetupScreen';
import { LanguageSetupScreen } from '../features/onboarding/screens/LanguageSetupScreen';
import { GoogleDriveConnectScreen } from '../features/onboarding/screens/GoogleDriveConnectScreen';
import { FamilySetupScreen } from '../features/onboarding/screens/FamilySetupScreen';
import { PricingScreen } from '../features/onboarding/screens/PricingScreen';

// Feature screens
import { AssetsHubScreen } from '../features/assets';
import { AssetDetailScreen } from '../features/assets/screens/AssetDetailScreen';
import { AssetDashboardScreen } from '../features/assets/screens/AssetDashboardScreen';
import { UniversalAddAssetScreen } from '../features/assets/screens/UniversalAddAssetScreen';
import { HealthTimelineScreen, HealthRecordDetailScreen } from '../features/health';
import { CollaboratorsOrbitScreen } from '../features/collaborators';
import { DocumentsVaultScreen } from '../features/documents';

export type MainStackParamList = {
  Dashboard: undefined;
  // Feature screens
  AssetsHub: undefined;
  AssetDetail: { assetId: string };
  AssetDashboard: { assetId: string; category?: string };
  AddAsset: undefined;
  HealthTimeline: undefined;
  HealthRecordDetail: { recordId: string };
  CollaboratorsOrbit: undefined;
  DocumentsVault: undefined;
  // Settings screens
  SettingsProfile: { isFromSettings: boolean };
  SettingsPhone: { isFromSettings: boolean };
  SettingsTheme: { isFromSettings: boolean };
  SettingsLanguage: { isFromSettings: boolean };
  SettingsGoogleDrive: { isFromSettings: boolean };
  SettingsFamily: { isFromSettings: boolean };
  SettingsPricing: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Dashboard" component={MainDashboard} />

      {/* Feature Screens */}
      <Stack.Screen
        name="AssetsHub"
        component={AssetsHubScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AssetDashboard"
        component={AssetDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AddAsset"
        component={UniversalAddAssetScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="HealthTimeline"
        component={HealthTimelineScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="HealthRecordDetail"
        component={HealthRecordDetailScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="CollaboratorsOrbit"
        component={CollaboratorsOrbitScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="DocumentsVault"
        component={DocumentsVaultScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Settings Screens - Storyboard Style */}
      <Stack.Screen
        name="SettingsProfile"
        component={ProfileSetupScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SettingsPhone"
        component={MobileNumberScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SettingsTheme"
        component={ThemeSetupScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SettingsLanguage"
        component={LanguageSetupScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen 
        name="SettingsGoogleDrive" 
        component={GoogleDriveConnectScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen 
        name="SettingsFamily" 
        component={FamilySetupScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen 
        name="SettingsPricing" 
        component={PricingScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};
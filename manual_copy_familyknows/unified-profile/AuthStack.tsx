// src/navigation/stacks/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';

// Auth screens
import { SplashScreen } from '../../features/auth/screens/SplashScreen';
import { IntroScreens } from '../../features/auth/screens/IntroScreens';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { SignupScreen } from '../../features/auth/screens/SignupScreen';
import { ForgotPasswordScreen } from '../../features/auth/screens/ForgotPasswordScreen';

// Onboarding screens
import { StoryOnboardingScreen } from '../../features/onboarding/screens/StoryOnboardingScreen';
import { MobileNumberScreen } from '../../features/onboarding/screens/MobileNumberScreen';
import { ProfileSetupScreen } from '../../features/onboarding/screens/ProfileSetupScreen';
import { GenderSelectionScreen } from '../../features/onboarding/screens/GenderSelectionScreen';
import { ThemeSetupScreen } from '../../features/onboarding/screens/ThemeSetupScreen';
import { LanguageSetupScreen } from '../../features/onboarding/screens/LanguageSetupScreen';
import { GoogleDriveConnectScreen } from '../../features/onboarding/screens/GoogleDriveConnectScreen';
import { FamilySetupScreen } from '../../features/onboarding/screens/FamilySetupScreen';
import { PricingScreen } from '../../features/onboarding/screens/PricingScreen';

// Settings screens
import { UnifiedProfileScreen } from '../../features/settings/screens/UnifiedProfileScreen';

// Main app screens
import { MainNavigator } from '../MainNavigator';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {/* Auth Flow */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="Intro"
        component={IntroScreens}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="StoryOnboarding"
        component={StoryOnboardingScreen}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Onboarding Flow - Storyboard Style */}
      <Stack.Screen
        name="PhoneAuth"
        component={MobileNumberScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={ProfileSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="GenderSelection"
        component={GenderSelectionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ThemeSelection"
        component={ThemeSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="LanguageSelection"
        component={LanguageSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="GoogleDriveConnect"
        component={GoogleDriveConnectScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="FamilySetup"
        component={FamilySetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Settings Screens (accessible from menu) */}
      <Stack.Screen
        name="UnifiedProfile"
        component={UnifiedProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="SettingsTheme"
        component={ThemeSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="SettingsLanguage"
        component={LanguageSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="SettingsGoogleDrive"
        component={GoogleDriveConnectScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="SettingsFamily"
        component={FamilySetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Main App with Navigation */}
      <Stack.Screen
        name="Main"
        component={MainNavigator}
        options={{
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
};

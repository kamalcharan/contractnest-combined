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
import { PhoneAuthScreen } from '../../features/onboarding/screens/PhoneAuthScreen';
import { UserProfileScreen } from '../../features/onboarding/screens/UserProfileScreen';
import { ThemeSelectionScreen } from '../../features/onboarding/screens/ThemeSelectionScreen';
import { LanguageSelectionScreen } from '../../features/onboarding/screens/LanguageSelectionScreen';
import { GoogleDriveConnectScreen } from '../../features/onboarding/screens/GoogleDriveConnectScreen';
import { FamilySetupScreen } from '../../features/onboarding/screens/FamilySetupScreen';
import { PricingScreen } from '../../features/onboarding/screens/PricingScreen';

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

      {/* Onboarding Flow */}
      <Stack.Screen
        name="PhoneAuth"
        component={PhoneAuthScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ThemeSelection"
        component={ThemeSelectionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="LanguageSelection"
        component={LanguageSelectionScreen}
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

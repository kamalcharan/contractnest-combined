// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList, MainStackParamList, MainTabsParamList } from './types';
import { tint } from '../utils/format';

import { SplashScreen } from '../features/auth/SplashScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { InvitationSignupScreen } from '../features/auth/InvitationSignupScreen';
import { RegisterInfoScreen } from '../features/auth/RegisterInfoScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { ContactsScreen } from '../features/contacts/ContactsScreen';
import { ContactDetailScreen } from '../features/contacts/ContactDetailScreen';
import { ContactFormScreen } from '../features/contacts/ContactFormScreen';
import { ContractHubScreen } from '../features/contracts/ContractHubScreen';
import { FinanceScreen } from '../features/finance/FinanceScreen';
import { OpsScreen } from '../features/ops/OpsScreen';
import { AppearanceScreen } from '../features/settings/AppearanceScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<keyof MainTabsParamList, { active: string; inactive: string }> = {
  Home: { active: 'view-dashboard', inactive: 'view-dashboard-outline' },
  Contacts: { active: 'account-multiple', inactive: 'account-multiple-outline' },
  Hub: { active: 'file-document', inactive: 'file-document-outline' },
  Money: { active: 'wallet', inactive: 'wallet-outline' },
  Ops: { active: 'speedometer', inactive: 'speedometer-slow' },
};

const MainTabs: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const c = theme.colors;
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.brand.primary,
        tabBarInactiveTintColor: c.utility.secondaryText,
        tabBarStyle: {
          backgroundColor: c.utility.secondaryBackground,
          borderTopColor: isDarkMode ? tint('#ffffff', '16') : tint('#000000', '12'),
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons
            name={(focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive) as any}
            size={size - 1}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Contacts" component={ContactsScreen} />
      <Tabs.Screen name="Hub" component={ContractHubScreen} options={{ title: 'Contracts' }} />
      <Tabs.Screen name="Money" component={FinanceScreen} options={{ title: 'AR / AP' }} />
      <Tabs.Screen name="Ops" component={OpsScreen} />
    </Tabs.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { status } = useAuth();

  if (status === 'restoring') {
    return <SplashScreen />;
  }

  if (status === 'signedOut') {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="InvitationSignup" component={InvitationSignupScreen} />
        <AuthStack.Screen name="RegisterInfo" component={RegisterInfoScreen} />
      </AuthStack.Navigator>
    );
  }

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <MainStack.Screen name="Tabs" component={MainTabs} />
      <MainStack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <MainStack.Screen name="ContactForm" component={ContactFormScreen} />
      <MainStack.Screen name="Appearance" component={AppearanceScreen} />
    </MainStack.Navigator>
  );
};

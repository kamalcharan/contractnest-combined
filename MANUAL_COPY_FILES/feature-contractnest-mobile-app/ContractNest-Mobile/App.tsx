// App.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

const ThemedApp: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const base = isDarkMode ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.brand.primary,
      background: theme.colors.utility.primaryBackground,
      card: theme.colors.utility.secondaryBackground,
      text: theme.colors.utility.primaryText,
      border: 'transparent',
    },
  };

  return (
    <ToastProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ToastProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

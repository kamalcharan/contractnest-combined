// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider as RNEThemeProvider } from '@rneui/themed';
import { ThemeProvider } from './src/theme/ThemeContext';
import { WorkspaceProvider } from './src/contexts/WorkspaceContext';
import { FamilyProvider } from './src/context/FamilyContext';
import { AuthProvider } from './src/context/AuthContext';
import { AuthStack } from './src/navigation/stacks/AuthStack';
import Toast from 'react-native-toast-message';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <FamilyProvider>
              <RNEThemeProvider>
                <NavigationContainer>
                  <AuthStack />
                </NavigationContainer>
                <Toast />
              </RNEThemeProvider>
            </FamilyProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

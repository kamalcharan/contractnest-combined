// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider as RNEThemeProvider } from '@rneui/themed';
import { ThemeProvider } from './src/theme/ThemeContext';
import { WorkspaceProvider } from './src/contexts/WorkspaceContext';
import { FamilyProvider } from './src/context/FamilyContext';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ToastProvider } from './src/components/Toast';
import { DialogProvider } from './src/components/ConfirmDialog';
import { AuthStack } from './src/navigation/stacks/AuthStack';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <FamilyProvider>
                <RNEThemeProvider>
                  <NavigationContainer>
                    <ToastProvider>
                      <DialogProvider>
                        <AuthStack />
                      </DialogProvider>
                    </ToastProvider>
                  </NavigationContainer>
                </RNEThemeProvider>
              </FamilyProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

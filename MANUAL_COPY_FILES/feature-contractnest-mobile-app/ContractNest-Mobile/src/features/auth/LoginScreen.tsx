// src/features/auth/LoginScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, TextField, Card } from '../../components/ui';
import { isValidEmail } from '../../utils/validation';
import { tint } from '../../utils/format';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { login } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const [email, setEmail] = useState(route.params?.prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [workspacePending, setWorkspacePending] = useState(false);

  useEffect(() => {
    if (route.params?.prefillEmail) setEmail(route.params.prefillEmail);
  }, [route.params?.prefillEmail]);

  const handleLogin = async () => {
    const nextErrors: typeof errors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address';
    if (!password) nextErrors.password = 'Enter your password';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setWorkspacePending(false);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.ok) {
      showToast({ type: 'success', title: 'Welcome back!' });
      return;
    }
    if (result.needsWorkspaceSetup) {
      setWorkspacePending(true);
      return;
    }
    showToast({ type: 'error', title: 'Sign in failed', message: result.error });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.utility.primaryBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={toggleDarkMode} hitSlop={8} style={styles.modeToggle}>
          <MaterialCommunityIcons
            name={isDarkMode ? 'weather-sunny' : 'weather-night'}
            size={22}
            color={c.utility.secondaryText}
          />
        </Pressable>

        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: c.brand.primary }]}>
            <Text style={styles.logoText}>CN</Text>
          </View>
          <Text style={[styles.title, { color: c.utility.primaryText }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: c.utility.secondaryText }]}>
            Sign in to your ContractNest workspace
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            icon="email-outline"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            error={errors.email}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />
          <TextField
            label="Password"
            icon="lock-outline"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((s) => !s)}
            autoCapitalize="none"
            containerStyle={{ marginTop: 14 }}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />

          {workspacePending ? (
            <Card style={[styles.pendingCard, { borderColor: tint(c.semantic.warning, '55') }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={c.semantic.warning} />
              <Text style={[styles.pendingText, { color: c.utility.primaryText }]}>
                Your account exists but workspace setup isn't finished. Complete onboarding on the ContractNest
                website, then sign in here.
              </Text>
            </Card>
          ) : null}

          <Button title="Sign in" onPress={handleLogin} loading={submitting} style={{ marginTop: 22 }} />
        </View>

        <View style={styles.links}>
          <Pressable onPress={() => navigation.navigate('InvitationSignup')} style={styles.linkRow}>
            <MaterialCommunityIcons name="email-check-outline" size={18} color={c.brand.primary} />
            <Text style={[styles.link, { color: c.brand.primary }]}>Have an invitation? Join your team</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('RegisterInfo')} style={styles.linkRow}>
            <MaterialCommunityIcons name="account-plus-outline" size={18} color={c.utility.secondaryText} />
            <Text style={[styles.link, { color: c.utility.secondaryText }]}>New to ContractNest? Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  modeToggle: { alignSelf: 'flex-end', padding: 4 },
  brand: { alignItems: 'center', marginTop: 8, marginBottom: 34 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 25, fontWeight: '800' },
  subtitle: { fontSize: 13.5, marginTop: 5 },
  form: { marginBottom: 26 },
  pendingCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
  },
  pendingText: { flex: 1, fontSize: 13, lineHeight: 19 },
  links: { gap: 16, alignItems: 'center', marginTop: 'auto' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  link: { fontSize: 13.5, fontWeight: '600' },
});

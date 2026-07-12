// src/features/auth/InvitationSignupScreen.tsx
// Three-step invitation flow: enter codes → validate & preview workspace → register or accept.
import React, { useState } from 'react';
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
import { useToast } from '../../contexts/ToastContext';
import { Button, TextField, Card, Badge } from '../../components/ui';
import { authService } from '../../services/authService';
import { ApiError, InvitationInfo } from '../../types/api';
import { isValidEmail } from '../../utils/validation';
import { validatePersonName } from '../../utils/validation';
import { tint } from '../../utils/format';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'InvitationSignup'>;

type Step = 'code' | 'details';

export const InvitationSignupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const [step, setStep] = useState<Step>('code');
  const [userCode, setUserCode] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleValidate = async () => {
    if (!userCode.trim() || !secretCode.trim()) {
      showToast({ type: 'warning', title: 'Enter both codes', message: 'The invitation code and secret code are in your invite message.' });
      return;
    }
    setValidating(true);
    try {
      const response = await authService.validateInvitation(userCode.trim(), secretCode.trim());
      if (!response.valid || !response.invitation) {
        showToast({ type: 'error', title: 'Invalid invitation', message: 'This invitation is invalid or has expired. Ask your admin to send a new one.' });
        return;
      }
      setInvitation(response.invitation);
      if (response.invitation.email) setEmail(response.invitation.email);
      setStep('details');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not validate the invitation.';
      showToast({ type: 'error', title: 'Validation failed', message });
    } finally {
      setValidating(false);
    }
  };

  const handleAcceptExisting = async () => {
    if (!invitation?.user_id) return;
    setSubmitting(true);
    try {
      await authService.acceptInvitation(userCode.trim(), secretCode.trim(), invitation.user_id);
      showToast({
        type: 'success',
        title: `Joined ${invitation.tenant?.name ?? 'the workspace'}!`,
        message: 'Sign in with your existing account to continue.',
      });
      navigation.navigate('Login', { prefillEmail: invitation.email });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not accept the invitation.';
      showToast({ type: 'error', title: 'Something went wrong', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const nextErrors: typeof errors = {};
    const firstNameError = validatePersonName(firstName);
    if (firstNameError) nextErrors.firstName = firstNameError;
    if (!lastName.trim()) nextErrors.lastName = 'Required';
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address';
    if (password.length < 6) nextErrors.password = 'At least 6 characters';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await authService.registerWithInvitation({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        userCode: userCode.trim(),
        secretCode: secretCode.trim(),
      });
      showToast({
        type: 'success',
        title: 'Account created!',
        message: `You've joined ${invitation?.tenant?.name ?? 'the workspace'}. Sign in to get started.`,
      });
      navigation.navigate('Login', { prefillEmail: email.trim().toLowerCase() });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      showToast({ type: 'error', title: 'Could not create account', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.utility.primaryBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => (step === 'details' ? setStep('code') : navigation.goBack())}
          style={styles.back}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.utility.primaryText} />
        </Pressable>

        <Text style={[styles.title, { color: c.utility.primaryText }]}>Join your team</Text>
        <Text style={[styles.subtitle, { color: c.utility.secondaryText }]}>
          {step === 'code'
            ? 'Enter the invitation code and secret code from your invite.'
            : invitation?.user_exists
              ? 'You already have a ContractNest account — accept to join.'
              : 'Create your account to join the workspace.'}
        </Text>

        {step === 'code' ? (
          <View style={{ marginTop: 26 }}>
            <TextField
              label="Invitation code"
              icon="ticket-confirmation-outline"
              value={userCode}
              onChangeText={setUserCode}
              placeholder="e.g. INV-XXXXXX"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextField
              label="Secret code"
              icon="key-outline"
              value={secretCode}
              onChangeText={setSecretCode}
              placeholder="From your invite message"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ marginTop: 14 }}
            />
            <Button title="Validate invitation" onPress={handleValidate} loading={validating} style={{ marginTop: 24 }} />
            <Text style={[styles.hint, { color: c.utility.secondaryText }]}>
              Got an invite link by email or WhatsApp? The code and secret are included in the message.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 22 }}>
            <Card style={[styles.workspaceCard, { borderColor: tint(c.brand.primary, '44') }]}>
              <View style={[styles.workspaceIcon, { backgroundColor: tint(c.brand.primary, '22') }]}>
                <MaterialCommunityIcons name="office-building-outline" size={24} color={c.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.workspaceName, { color: c.utility.primaryText }]} numberOfLines={1}>
                  {invitation?.tenant?.name ?? 'Workspace'}
                </Text>
                {invitation?.tenant?.workspace_code ? (
                  <Text style={[styles.workspaceCode, { color: c.utility.secondaryText }]}>
                    {invitation.tenant.workspace_code}
                  </Text>
                ) : null}
              </View>
              <Badge label="Invited" color={c.semantic.success} />
            </Card>

            {invitation?.user_exists ? (
              <View style={{ marginTop: 22 }}>
                <Text style={[styles.existingText, { color: c.utility.secondaryText }]}>
                  This invitation is linked to an existing account
                  {invitation.email ? ` (${invitation.email})` : ''}. Accept it and sign in to access the
                  workspace.
                </Text>
                <Button title="Accept & join" onPress={handleAcceptExisting} loading={submitting} style={{ marginTop: 20 }} />
              </View>
            ) : (
              <View style={{ marginTop: 18 }}>
                <View style={styles.nameRow}>
                  <TextField
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    error={errors.firstName}
                    placeholder="First name"
                    containerStyle={{ flex: 1 }}
                  />
                  <TextField
                    label="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    error={errors.lastName}
                    placeholder="Last name"
                    containerStyle={{ flex: 1 }}
                  />
                </View>
                <TextField
                  label="Email"
                  icon="email-outline"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!invitation?.email}
                  containerStyle={{ marginTop: 14, opacity: invitation?.email ? 0.7 : 1 }}
                />
                <TextField
                  label="Password"
                  icon="lock-outline"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                  placeholder="At least 6 characters"
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword((s) => !s)}
                  autoCapitalize="none"
                  containerStyle={{ marginTop: 14 }}
                />
                <TextField
                  label="Confirm password"
                  icon="lock-check-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={errors.confirmPassword}
                  placeholder="Repeat password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  containerStyle={{ marginTop: 14 }}
                />
                <Button title="Create account & join" onPress={handleRegister} loading={submitting} style={{ marginTop: 24 }} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 14, alignSelf: 'flex-start', padding: 4 },
  title: { fontSize: 25, fontWeight: '800' },
  subtitle: { fontSize: 13.5, marginTop: 6, lineHeight: 19 },
  hint: { fontSize: 12.5, marginTop: 16, lineHeight: 18, textAlign: 'center' },
  workspaceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
  workspaceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  workspaceName: { fontSize: 16, fontWeight: '700' },
  workspaceCode: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  existingText: { fontSize: 13.5, lineHeight: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
});

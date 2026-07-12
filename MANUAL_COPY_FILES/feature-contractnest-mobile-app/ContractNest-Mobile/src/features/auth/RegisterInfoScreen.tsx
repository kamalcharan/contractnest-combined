// src/features/auth/RegisterInfoScreen.tsx
// Registration happens on the website (rich onboarding). This screen explains why and points there.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card } from '../../components/ui';
import { WEBSITE_URL } from '../../services/config';
import { tint } from '../../utils/format';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterInfo'>;

const STEPS: Array<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string }> = [
  {
    icon: 'office-building-outline',
    title: 'Create your workspace',
    text: 'Set up your business identity, branding and the industries you serve.',
  },
  {
    icon: 'tune-variant',
    title: 'Configure preferences',
    text: 'Storage, sequence numbers, master data and business preferences.',
  },
  {
    icon: 'rocket-launch-outline',
    title: 'Then sign in here',
    text: 'Once onboarding is complete, everything syncs to mobile instantly.',
  },
];

export const RegisterInfoScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const openWebsite = () => {
    Linking.openURL(`${WEBSITE_URL}/register`).catch(() =>
      showToast({ type: 'error', title: 'Could not open the browser', message: `Visit ${WEBSITE_URL} to register.` })
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.utility.primaryBackground }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={8}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={c.utility.primaryText} />
      </Pressable>

      <View style={[styles.hero, { backgroundColor: tint(c.brand.primary, '15') }]}>
        <MaterialCommunityIcons name="monitor-cellphone" size={44} color={c.brand.primary} />
      </View>

      <Text style={[styles.title, { color: c.utility.primaryText }]}>Registration lives on the web</Text>
      <Text style={[styles.subtitle, { color: c.utility.secondaryText }]}>
        Setting up a ContractNest business takes a guided onboarding — branding, industries, pricing and master
        data — which works best on a bigger screen. It only takes a few minutes.
      </Text>

      <View style={{ marginTop: 26, gap: 12 }}>
        {STEPS.map((step, index) => (
          <Card key={step.title} style={styles.stepCard}>
            <View style={[styles.stepIcon, { backgroundColor: tint(c.brand.primary, '1a') }]}>
              <MaterialCommunityIcons name={step.icon} size={22} color={c.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: c.utility.primaryText }]}>
                {index + 1}. {step.title}
              </Text>
              <Text style={[styles.stepText, { color: c.utility.secondaryText }]}>{step.text}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Button title="Register on the website" icon="open-in-new" onPress={openWebsite} style={{ marginTop: 28 }} />
      <Pressable onPress={() => navigation.navigate('InvitationSignup')} style={styles.inviteLink}>
        <Text style={[styles.inviteLinkText, { color: c.brand.primary }]}>
          Joining an existing team? Use your invitation instead
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 14, alignSelf: 'flex-start', padding: 4 },
  hero: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13.5, marginTop: 10, lineHeight: 20, textAlign: 'center' },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 14.5, fontWeight: '700' },
  stepText: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  inviteLink: { alignItems: 'center', marginTop: 18, padding: 6 },
  inviteLinkText: { fontSize: 13.5, fontWeight: '600' },
});

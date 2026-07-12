// src/components/AppHeader.tsx
// Shared screen header: title + workspace context + account menu (theme, workspace switch, logout).
import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from './ui';
import { initials, avatarColor, tint } from '../utils/format';
import { WEBSITE_URL } from '../services/config';
import { MainStackParamList } from '../navigation/types';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle, right }) => {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { user, tenant, tenants, switchTenant, logout } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false);
  const c = theme.colors;

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Account';

  const close = () => setMenuOpen(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: c.utility.primaryBackground }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.utility.primaryText }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: c.utility.secondaryText }]} numberOfLines={1}>
            {subtitle ?? tenant?.name ?? ''}
          </Text>
        </View>
        {right}
        <Pressable onPress={toggleDarkMode} hitSlop={8} style={styles.iconButton}>
          <MaterialCommunityIcons
            name={isDarkMode ? 'weather-sunny' : 'weather-night'}
            size={22}
            color={c.utility.secondaryText}
          />
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={6}>
          <Avatar label={initials(fullName)} color={avatarColor(user?.id ?? fullName)} size={38} />
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            style={[
              styles.menu,
              { backgroundColor: c.utility.secondaryBackground, marginTop: insets.top + 54 },
            ]}
            onPress={() => {}}
          >
            <View style={styles.menuHeader}>
              <Avatar label={initials(fullName)} color={avatarColor(user?.id ?? fullName)} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuName, { color: c.utility.primaryText }]} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={[styles.menuEmail, { color: c.utility.secondaryText }]} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {tenants.length > 1 ? (
              <View style={styles.menuSection}>
                <Text style={[styles.menuSectionLabel, { color: c.utility.secondaryText }]}>WORKSPACE</Text>
                {tenants.map((t) => {
                  const active = t.id === tenant?.id;
                  return (
                    <Pressable
                      key={t.id}
                      style={styles.menuItem}
                      onPress={async () => {
                        await switchTenant(t.id);
                        close();
                        showToast({ type: 'success', title: `Switched to ${t.name}` });
                      }}
                    >
                      <MaterialCommunityIcons
                        name={active ? 'radiobox-marked' : 'radiobox-blank'}
                        size={20}
                        color={active ? c.brand.primary : c.utility.secondaryText}
                      />
                      <Text style={[styles.menuItemText, { color: c.utility.primaryText }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.menuDivider, { backgroundColor: tint(c.utility.secondaryText, '22') }]} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                close();
                navigation.navigate('Appearance');
              }}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={c.utility.secondaryText} />
              <Text style={[styles.menuItemText, { color: c.utility.primaryText }]}>Appearance & themes</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                close();
                Linking.openURL(WEBSITE_URL).catch(() =>
                  showToast({ type: 'error', title: 'Could not open the website' })
                );
              }}
            >
              <MaterialCommunityIcons name="open-in-new" size={20} color={c.utility.secondaryText} />
              <Text style={[styles.menuItemText, { color: c.utility.primaryText }]}>Open web app</Text>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: tint(c.utility.secondaryText, '22') }]} />

            <Pressable
              style={styles.menuItem}
              onPress={async () => {
                close();
                await logout();
              }}
            >
              <MaterialCommunityIcons name="logout" size={20} color={c.semantic.error} />
              <Text style={[styles.menuItemText, { color: c.semantic.error }]}>Sign out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, marginTop: 1, fontWeight: '500' },
  iconButton: { padding: 4 },
  backdrop: { flex: 1, backgroundColor: '#00000055' },
  menu: {
    marginHorizontal: 16,
    marginLeft: 'auto',
    width: 300,
    maxWidth: '92%',
    borderRadius: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  menuName: { fontSize: 15.5, fontWeight: '700' },
  menuEmail: { fontSize: 12.5, marginTop: 1 },
  menuSection: { paddingTop: 6 },
  menuSectionLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { fontSize: 14.5, fontWeight: '600', flex: 1 },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginHorizontal: 12 },
});

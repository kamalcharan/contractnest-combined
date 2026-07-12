// src/features/home/HomeScreen.tsx
// Home: greeting + live contact pulse + module launcher + preview action queue.
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppHeader } from '../../components/AppHeader';
import { Avatar, Badge, Card, SectionTitle, Skeleton } from '../../components/ui';
import { contactService } from '../../services/contactService';
import { Contact, ContactStats } from '../../types/contacts';
import { MOCK_ACTION_QUEUE, MOCK_EVENTS } from '../preview/mockData';
import { avatarColor, initials, tint } from '../../utils/format';
import { MainStackParamList, MainTabsParamList } from '../../navigation/types';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

interface ModuleCard {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  preview?: boolean;
  go: (nav: HomeNav) => void;
}

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user, tenant } = useAuth();
  const navigation = useNavigation<HomeNav>();
  const c = theme.colors;

  const [stats, setStats] = useState<ContactStats | null>(null);
  const [recent, setRecent] = useState<Contact[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const [statsResponse, recentResponse] = await Promise.all([
        contactService.stats(),
        contactService.list({ page: 1, limit: 5, sort_by: 'created_at', sort_order: 'desc' }),
      ]);
      setStats(statsResponse.data);
      setRecent(recentResponse.data);
    } catch {
      // home stays useful even if the pulse fails — modules below don't depend on it
      setRecent((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const overdueEvents = MOCK_EVENTS.filter((event) => event.bucket === 'overdue').length;

  const modules: ModuleCard[] = [
    {
      key: 'contacts',
      title: 'Contacts',
      subtitle: stats ? `${stats.total} total · ${stats.active} active` : 'Clients, vendors & partners',
      icon: 'account-multiple-outline',
      color: '#3B82F6',
      go: (nav) => nav.navigate('Contacts'),
    },
    {
      key: 'contracts',
      title: 'Contract Hub',
      subtitle: 'Portfolio, pipeline & health',
      icon: 'file-document-outline',
      color: '#8B5CF6',
      preview: true,
      go: (nav) => nav.navigate('Hub'),
    },
    {
      key: 'finance',
      title: 'AR / AP',
      subtitle: 'Receivables & payables',
      icon: 'wallet-outline',
      color: '#10B981',
      preview: true,
      go: (nav) => nav.navigate('Money'),
    },
    {
      key: 'ops',
      title: 'Ops Cockpit',
      subtitle: overdueEvents > 0 ? `${overdueEvents} overdue events` : 'Command center',
      icon: 'speedometer',
      color: '#F59E0B',
      preview: true,
      go: (nav) => nav.navigate('Ops', { segment: 'cockpit' }),
    },
    {
      key: 'cadence',
      title: 'Cadence',
      subtitle: 'Service & billing rhythm',
      icon: 'metronome',
      color: '#EC4899',
      preview: true,
      go: (nav) => nav.navigate('Ops', { segment: 'cadence' }),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <AppHeader title={`${greeting()},`} subtitle={undefined} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.brand.primary} />}
      >
        <Text style={[styles.name, { color: c.utility.primaryText }]} numberOfLines={1}>
          {user?.first_name || 'there'} 👋
        </Text>
        <View style={styles.workspaceRow}>
          <MaterialCommunityIcons name="office-building-outline" size={14} color={c.utility.secondaryText} />
          <Text style={[styles.workspace, { color: c.utility.secondaryText }]} numberOfLines={1}>
            {tenant?.name ?? 'Workspace'}
          </Text>
          <Badge small label="LIVE" color={c.semantic.success} />
        </View>

        <SectionTitle title="Your modules" style={{ marginTop: 24 }} />
        <View style={styles.grid}>
          {modules.map((module) => (
            <Card key={module.key} onPress={() => module.go(navigation)} style={styles.moduleCard}>
              <View style={styles.moduleTop}>
                <View style={[styles.moduleIcon, { backgroundColor: tint(module.color, '1e') }]}>
                  <MaterialCommunityIcons name={module.icon as any} size={22} color={module.color} />
                </View>
                {module.preview ? (
                  <Text style={[styles.previewTag, { color: c.brand.tertiary, borderColor: tint(c.brand.tertiary, '55') }]}>
                    PREVIEW
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.moduleTitle, { color: c.utility.primaryText }]}>{module.title}</Text>
              <Text style={[styles.moduleSubtitle, { color: c.utility.secondaryText }]} numberOfLines={2}>
                {module.subtitle}
              </Text>
            </Card>
          ))}
        </View>

        <SectionTitle
          title="Recent contacts"
          style={{ marginTop: 24 }}
          right={
            <Pressable onPress={() => navigation.navigate('Contacts')} hitSlop={8}>
              <Text style={{ color: c.brand.primary, fontWeight: '700', fontSize: 12.5 }}>See all</Text>
            </Pressable>
          }
        />
        {recent === null ? (
          <Card style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={38} height={38} radius={19} />
                <Skeleton width="55%" height={13} />
              </View>
            ))}
          </Card>
        ) : recent.length === 0 ? (
          <Card>
            <Text style={{ color: c.utility.secondaryText, fontSize: 13 }}>
              No contacts yet — add your first from the Contacts tab.
            </Text>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {recent.map((contact, index) => {
              const name = contact.displayName || contact.name || contact.company_name || 'Unnamed';
              return (
                <Pressable
                  key={contact.id}
                  onPress={() => navigation.navigate('ContactDetail', { id: contact.id })}
                  style={({ pressed }) => [
                    styles.recentRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(c.utility.secondaryText, '33') },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Avatar label={initials(name)} color={avatarColor(contact.id)} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentName, { color: c.utility.primaryText }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.recentMeta, { color: c.utility.secondaryText }]} numberOfLines={1}>
                      {contact.type === 'corporate' ? 'Corporate' : 'Individual'}
                      {contact.primary_channel?.value ? ` · ${contact.primary_channel.value}` : ''}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={tint(c.utility.secondaryText, '88')} />
                </Pressable>
              );
            })}
          </Card>
        )}

        <SectionTitle title="Needs your attention" style={{ marginTop: 24 }} right={<Text style={{ color: c.utility.secondaryText, fontSize: 11 }}>preview</Text>} />
        <Card style={{ paddingVertical: 4 }}>
          {MOCK_ACTION_QUEUE.slice(0, 3).map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate('Ops', { segment: 'cockpit' })}
              style={({ pressed }) => [
                styles.recentRow,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(c.utility.secondaryText, '33') },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.queueDot,
                  { backgroundColor: item.kind === 'urgent' ? c.semantic.error : item.kind === 'pending' ? c.semantic.warning : c.utility.secondaryText },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentName, { color: c.utility.primaryText }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.recentMeta, { color: c.utility.secondaryText }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  name: { fontSize: 27, fontWeight: '800', marginTop: -6 },
  workspaceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  workspace: { fontSize: 13, fontWeight: '600', maxWidth: '70%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: { flexBasis: '47%', flexGrow: 1, padding: 14 },
  moduleTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  moduleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  previewTag: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  moduleTitle: { fontSize: 15, fontWeight: '800', marginTop: 10 },
  moduleSubtitle: { fontSize: 11.5, marginTop: 3, lineHeight: 15 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  recentName: { fontSize: 13.5, fontWeight: '600' },
  recentMeta: { fontSize: 11.5, marginTop: 2 },
  queueDot: { width: 9, height: 9, borderRadius: 5 },
});

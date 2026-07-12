// src/features/contacts/ContactsScreen.tsx
// Live contact list: debounced search, classification filter chips with counts,
// infinite scroll, pull-to-refresh, FAB create.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { AppHeader } from '../../components/AppHeader';
import { Avatar, Badge, Chip, EmptyState, Skeleton, TextField } from '../../components/ui';
import { contactService } from '../../services/contactService';
import { ApiError } from '../../types/api';
import { CLASSIFICATIONS, Contact, ContactStats } from '../../types/contacts';
import { avatarColor, initials, tint } from '../../utils/format';
import { MainStackParamList } from '../../navigation/types';

const PAGE_SIZE = 20;

const classificationMeta = (id: string) => CLASSIFICATIONS.find((cl) => cl.id === id);

const ContactRow: React.FC<{ contact: Contact; onPress: () => void }> = ({ contact, onPress }) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const name = contact.displayName || contact.name || contact.company_name || 'Unnamed';
  const channel = contact.primary_channel?.value || contact.contact_channels?.[0]?.value;
  const subtitle =
    contact.type === 'corporate'
      ? channel || 'Corporate'
      : [contact.designation, contact.company_name].filter(Boolean).join(' · ') || channel || 'Individual';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.utility.secondaryBackground, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Avatar label={initials(name)} color={avatarColor(contact.id)} size={46} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: c.utility.primaryText }]} numberOfLines={1}>
            {name}
          </Text>
          {contact.type === 'corporate' ? (
            <MaterialCommunityIcons name="office-building-outline" size={14} color={c.utility.secondaryText} />
          ) : null}
        </View>
        <Text style={[styles.rowSubtitle, { color: c.utility.secondaryText }]} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.rowBadges}>
          {contact.classifications?.slice(0, 3).map((id) => {
            const meta = classificationMeta(id);
            return <Badge key={id} small label={meta?.label ?? id} color={meta?.color ?? c.brand.secondary} />;
          })}
          {contact.status !== 'active' ? (
            <Badge small label={contact.status === 'archived' ? 'Archived' : 'Inactive'} color={c.utility.secondaryText} />
          ) : null}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={tint(c.utility.secondaryText, '88')} />
    </Pressable>
  );
};

export const ContactsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const c = theme.colors;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classification, setClassification] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (targetPage: number, mode: 'replace' | 'append' | 'refresh') => {
      const seq = ++requestSeq.current;
      if (mode === 'replace') setLoading(true);
      if (mode === 'append') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const response = await contactService.list({
          search: debouncedSearch || undefined,
          classifications: classification ? [classification] : undefined,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        if (seq !== requestSeq.current) return; // stale response — a newer request superseded this one
        setContacts((prev) => (mode === 'append' ? [...prev, ...response.data] : response.data));
        setPage(response.pagination.page);
        setTotalPages(response.pagination.totalPages || 1);
        setTotal(response.pagination.total ?? response.data.length);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const message = err instanceof ApiError ? err.message : 'Could not load contacts.';
        showToast({ type: 'error', title: 'Loading failed', message });
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearch, classification, showToast]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await contactService.stats();
      setStats(response.data);
    } catch {
      // stats are decorative — list still works without them
    }
  }, []);

  useEffect(() => {
    fetchPage(1, 'replace');
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      // refresh silently when returning from create/edit/detail
      fetchStats();
      fetchPage(1, 'refresh');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchStats])
  );

  const loadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    fetchPage(page + 1, 'append');
  };

  const chips = useMemo(
    () => [
      { id: null as string | null, label: 'All', count: stats?.total },
      ...CLASSIFICATIONS.map((cl) => ({
        id: cl.id as string | null,
        label: cl.label,
        count: stats?.by_classification?.[cl.id],
      })),
    ],
    [stats]
  );

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <AppHeader title="Contacts" subtitle={total ? `${total} contact${total === 1 ? '' : 's'}` : undefined} />

      <View style={styles.searchWrap}>
        <TextField
          icon="magnify"
          placeholder="Search name or company…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          rightIcon={search ? 'close-circle' : undefined}
          onRightIconPress={() => setSearch('')}
        />
      </View>

      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={chips}
          keyExtractor={(item) => item.id ?? 'all'}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              count={item.count}
              selected={classification === item.id}
              onPress={() => setClassification(item.id)}
            />
          )}
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 18, gap: 10, marginTop: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.skeletonRow, { backgroundColor: c.utility.secondaryBackground }]}>
              <Skeleton width={46} height={46} radius={23} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="62%" height={14} />
                <Skeleton width="40%" height={11} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactRow contact={item} onPress={() => navigation.navigate('ContactDetail', { id: item.id })} />
          )}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 96, gap: 10, flexGrow: 1 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                fetchStats();
                fetchPage(1, 'refresh');
              }}
              tintColor={c.brand.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="account-search-outline"
              title={debouncedSearch ? 'No matches' : 'No contacts yet'}
              message={
                debouncedSearch
                  ? `Nothing found for "${debouncedSearch}". Search matches names and companies.`
                  : 'Add your first client, vendor or partner to get started.'
              }
              action={
                debouncedSearch
                  ? undefined
                  : { title: 'Add contact', onPress: () => navigation.navigate('ContactForm') }
              }
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Skeleton width={120} height={12} />
              </View>
            ) : null
          }
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('ContactForm')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.brand.primary, opacity: pressed ? 0.85 : 1, shadowColor: c.brand.primary },
        ]}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 18, marginBottom: 10 },
  chipsRow: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 15.5, fontWeight: '700', flexShrink: 1 },
  rowSubtitle: { fontSize: 12.5, marginTop: 2 },
  rowBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});

// src/features/contacts/ContactDetailScreen.tsx
// Full contact view: channels (tap to call/mail/open), addresses, tags, notes,
// contact persons, archive/restore + delete with confirmation.
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Avatar, Badge, Button, Card, EmptyState, SectionTitle, Skeleton } from '../../components/ui';
import { contactService } from '../../services/contactService';
import { ApiError } from '../../types/api';
import { CHANNEL_META, CLASSIFICATIONS, Contact, ContactChannel } from '../../types/contacts';
import { avatarColor, formatDate, initials, tint } from '../../utils/format';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ContactDetail'>;

const channelAction = (channel: ContactChannel): string | null => {
  const value = channel.value?.trim();
  if (!value) return null;
  switch (channel.channel_type) {
    case 'mobile':
      return `tel:${(channel.country_code ?? '')}${value}`;
    case 'whatsapp':
      return `https://wa.me/${((channel.country_code ?? '') + value).replace(/[^\d]/g, '')}`;
    case 'email':
      return `mailto:${value}`;
    case 'website':
      return value.startsWith('http') ? value : `https://${value}`;
    case 'linkedin':
      return value.startsWith('http') ? value : `https://www.linkedin.com/in/${value}`;
    default:
      return null;
  }
};

export const ContactDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const { id } = route.params;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      try {
        const response = await contactService.get(id);
        setContact(response.data);
        setLoadError(null);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not load the contact.';
        setLoadError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openChannel = (channel: ContactChannel) => {
    const url = channelAction(channel);
    if (!url) return;
    Linking.openURL(url).catch(() => showToast({ type: 'error', title: 'Could not open', message: channel.value }));
  };

  const toggleArchive = () => {
    if (!contact || mutating) return;
    const archiving = contact.status !== 'archived';
    const nextStatus = archiving ? 'archived' : 'active';
    const run = async () => {
      setMutating(true);
      try {
        const response = await contactService.updateStatus(contact.id, nextStatus);
        setContact(response.data ?? { ...contact, status: nextStatus });
        showToast({ type: 'success', title: archiving ? 'Contact archived' : 'Contact restored' });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Please try again.';
        showToast({ type: 'error', title: 'Update failed', message });
      } finally {
        setMutating(false);
      }
    };
    if (archiving) {
      Alert.alert('Archive contact?', 'The contact is hidden from active lists but can be restored anytime.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const confirmDelete = () => {
    if (!contact || mutating) return;
    Alert.alert(
      'Delete contact?',
      `"${displayName}" will be removed. This is a soft delete — data is archived, not destroyed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setMutating(true);
            try {
              await contactService.remove(contact.id);
              showToast({ type: 'success', title: 'Contact deleted' });
              navigation.goBack();
            } catch (err) {
              const message = err instanceof ApiError ? err.message : 'Please try again.';
              showToast({ type: 'error', title: 'Delete failed', message });
              setMutating(false);
            }
          },
        },
      ]
    );
  };

  const displayName = contact?.displayName || contact?.name || contact?.company_name || 'Contact';
  const channels = contact?.contact_channels ?? [];
  const addresses = contact?.addresses ?? [];

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.navButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.utility.primaryText} />
        </Pressable>
        <Text style={[styles.navTitle, { color: c.utility.primaryText }]} numberOfLines={1}>
          {loading ? 'Contact' : displayName}
        </Text>
        {contact ? (
          <Pressable
            onPress={() => navigation.navigate('ContactForm', { id: contact.id })}
            hitSlop={8}
            style={styles.navButton}
          >
            <MaterialCommunityIcons name="pencil-outline" size={22} color={c.brand.primary} />
          </Pressable>
        ) : (
          <View style={styles.navButton} />
        )}
      </View>

      {loading ? (
        <View style={{ padding: 18, gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
            <Skeleton width={84} height={84} radius={42} />
            <Skeleton width={180} height={18} />
            <Skeleton width={120} height={12} />
          </View>
          <Skeleton height={110} radius={16} />
          <Skeleton height={110} radius={16} />
        </View>
      ) : !contact ? (
        <EmptyState
          icon="account-alert-outline"
          title="Contact unavailable"
          message={loadError ?? 'It may have been deleted.'}
          action={{ title: 'Retry', onPress: () => { setLoading(true); load(); } }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.brand.primary} />
          }
        >
          <View style={styles.hero}>
            <Avatar label={initials(displayName)} color={avatarColor(contact.id)} size={84} />
            <Text style={[styles.heroName, { color: c.utility.primaryText }]}>{displayName}</Text>
            <Text style={[styles.heroSub, { color: c.utility.secondaryText }]}>
              {contact.type === 'corporate'
                ? [contact.registration_number && `Reg: ${contact.registration_number}`].filter(Boolean).join(' · ') ||
                  'Corporate'
                : [contact.designation, contact.company_name].filter(Boolean).join(' · ') || 'Individual'}
            </Text>
            <View style={styles.heroBadges}>
              {contact.classifications?.map((clId) => {
                const meta = CLASSIFICATIONS.find((cl) => cl.id === clId);
                return <Badge key={clId} label={meta?.label ?? clId} color={meta?.color ?? c.brand.secondary} />;
              })}
              {contact.status !== 'active' ? (
                <Badge
                  label={contact.status === 'archived' ? 'Archived' : 'Inactive'}
                  color={contact.status === 'archived' ? c.utility.secondaryText : c.semantic.warning}
                />
              ) : null}
            </View>
          </View>

          <SectionTitle title="Channels" style={{ marginTop: 22 }} />
          {channels.length === 0 ? (
            <Card>
              <Text style={{ color: c.utility.secondaryText, fontSize: 13 }}>No channels on record.</Text>
            </Card>
          ) : (
            <Card style={{ paddingVertical: 6 }}>
              {channels.map((channel, index) => {
                const meta = CHANNEL_META[channel.channel_type] ?? { label: channel.channel_type, icon: 'link-variant' };
                const actionable = channelAction(channel) !== null;
                return (
                  <Pressable
                    key={channel.id ?? `${channel.channel_type}-${index}`}
                    onPress={() => openChannel(channel)}
                    disabled={!actionable}
                    style={({ pressed }) => [
                      styles.channelRow,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(c.utility.secondaryText, '33') },
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={[styles.channelIcon, { backgroundColor: tint(c.brand.primary, '16') }]}>
                      <MaterialCommunityIcons name={meta.icon as any} size={19} color={c.brand.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.channelValue, { color: c.utility.primaryText }]} numberOfLines={1}>
                        {channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp'
                          ? `${channel.country_code ?? ''} ${channel.value}`.trim()
                          : channel.value}
                      </Text>
                      <Text style={[styles.channelLabel, { color: c.utility.secondaryText }]}>
                        {meta.label}
                        {channel.is_primary ? ' · Primary' : ''}
                      </Text>
                    </View>
                    {actionable ? (
                      <MaterialCommunityIcons name="open-in-new" size={17} color={tint(c.utility.secondaryText, 'aa')} />
                    ) : null}
                  </Pressable>
                );
              })}
            </Card>
          )}

          {addresses.length > 0 ? (
            <>
              <SectionTitle title="Addresses" style={{ marginTop: 22 }} />
              <View style={{ gap: 10 }}>
                {addresses.map((address, index) => (
                  <Card key={address.id ?? index} style={styles.addressCard}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={c.brand.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addressType, { color: c.utility.secondaryText }]}>
                        {(address.label || address.type || 'Address').toUpperCase()}
                        {address.is_primary ? ' · PRIMARY' : ''}
                      </Text>
                      <Text style={[styles.addressText, { color: c.utility.primaryText }]}>
                        {[address.address_line1, address.address_line2, address.city, address.state_code, address.postal_code]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {contact.tags && contact.tags.length > 0 ? (
            <>
              <SectionTitle title="Tags" style={{ marginTop: 22 }} />
              <View style={styles.tagsWrap}>
                {contact.tags.map((tag, index) => (
                  <Badge key={tag.id ?? index} label={tag.tag_label || tag.tag_value} color={tag.tag_color || c.brand.tertiary} />
                ))}
              </View>
            </>
          ) : null}

          {contact.contact_persons && contact.contact_persons.length > 0 ? (
            <>
              <SectionTitle title="Contact persons" style={{ marginTop: 22 }} />
              <Card style={{ paddingVertical: 6 }}>
                {contact.contact_persons.map((person, index) => (
                  <View
                    key={person.id ?? index}
                    style={[
                      styles.personRow,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(c.utility.secondaryText, '33') },
                    ]}
                  >
                    <Avatar label={initials(person.name)} color={avatarColor(person.id ?? person.name)} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.personName, { color: c.utility.primaryText }]} numberOfLines={1}>
                        {person.name}
                      </Text>
                      {person.designation ? (
                        <Text style={[styles.personRole, { color: c.utility.secondaryText }]} numberOfLines={1}>
                          {person.designation}
                        </Text>
                      ) : null}
                    </View>
                    {person.contact_channels?.[0]?.value ? (
                      <Text style={[styles.personChannel, { color: c.utility.secondaryText }]} numberOfLines={1}>
                        {person.contact_channels[0].value}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {contact.notes ? (
            <>
              <SectionTitle title="Notes" style={{ marginTop: 22 }} />
              <Card>
                <Text style={[styles.notes, { color: c.utility.primaryText }]}>{contact.notes}</Text>
              </Card>
            </>
          ) : null}

          <Text style={[styles.metaLine, { color: tint(c.utility.secondaryText, 'aa') }]}>
            Created {formatDate(contact.created_at)} · Updated {formatDate(contact.updated_at)}
          </Text>

          <View style={styles.actions}>
            <Button
              title={contact.status === 'archived' ? 'Restore contact' : 'Archive contact'}
              variant="secondary"
              icon={contact.status === 'archived' ? 'archive-arrow-up-outline' : 'archive-arrow-down-outline'}
              onPress={toggleArchive}
              loading={mutating}
            />
            <Button title="Delete contact" variant="ghost" icon="trash-can-outline" onPress={confirmDelete} disabled={mutating} />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16.5, fontWeight: '700' },
  hero: { alignItems: 'center' },
  heroName: { fontSize: 22, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  heroSub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  channelIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelValue: { fontSize: 14.5, fontWeight: '600' },
  channelLabel: { fontSize: 11.5, marginTop: 1.5 },
  addressCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  addressType: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  addressText: { fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  personName: { fontSize: 14, fontWeight: '600' },
  personRole: { fontSize: 11.5, marginTop: 1 },
  personChannel: { fontSize: 11.5, maxWidth: 110 },
  notes: { fontSize: 13.5, lineHeight: 20 },
  metaLine: { fontSize: 11.5, textAlign: 'center', marginTop: 20 },
  actions: { marginTop: 18, gap: 10 },
});

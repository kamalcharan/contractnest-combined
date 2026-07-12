// src/features/contacts/ContactFormScreen.tsx
// Create & edit contacts against the live API.
// Handles: individual/corporate, classifications, channel editor (one primary),
// optional address, notes, validation, duplicate (409) confirmation, toasts.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { Button, Chip, SectionTitle, Skeleton, TextField } from '../../components/ui';
import { contactService } from '../../services/contactService';
import { ApiError } from '../../types/api';
import {
  CHANNEL_META,
  CLASSIFICATIONS,
  ContactType,
  CreateContactRequest,
  DuplicateMatch,
  PHONE_CHANNELS,
  SALUTATIONS,
} from '../../types/contacts';
import { validateChannelValue, validateCompanyName, validatePersonName } from '../../utils/validation';
import { tint } from '../../utils/format';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ContactForm'>;

interface ChannelDraft {
  key: number;
  channel_type: string;
  value: string;
  country_code: string;
  is_primary: boolean;
}

interface AddressDraft {
  type: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_code: string;
  postal_code: string;
}

const CHANNEL_TYPES = Object.keys(CHANNEL_META);
const emptyAddress: AddressDraft = { type: 'office', address_line1: '', address_line2: '', city: '', state_code: '', postal_code: '' };

let channelKeySeq = 1;
const newChannel = (type = 'mobile'): ChannelDraft => ({
  key: channelKeySeq++,
  channel_type: type,
  value: '',
  country_code: PHONE_CHANNELS.includes(type) ? '+91' : '',
  is_primary: false,
});

export const ContactFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const editId = route.params?.id;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<ContactType>('individual');
  const [salutation, setSalutation] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [classifications, setClassifications] = useState<string[]>([]);
  const [channels, setChannels] = useState<ChannelDraft[]>([{ ...newChannel('mobile'), is_primary: true }]);
  const [showAddress, setShowAddress] = useState(false);
  const [address, setAddress] = useState<AddressDraft>(emptyAddress);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await contactService.get(editId);
        if (cancelled) return;
        const contact = response.data;
        setType(contact.type);
        setSalutation(contact.salutation ?? null);
        setName(contact.name ?? '');
        setCompanyName(contact.company_name ?? '');
        setRegistrationNumber(contact.registration_number ?? '');
        setDesignation(contact.designation ?? '');
        setClassifications(contact.classifications ?? []);
        const loadedChannels = (contact.contact_channels ?? []).map((channel) => ({
          key: channelKeySeq++,
          channel_type: channel.channel_type,
          value: channel.value ?? '',
          country_code: channel.country_code ?? (PHONE_CHANNELS.includes(channel.channel_type) ? '+91' : ''),
          is_primary: !!channel.is_primary,
        }));
        if (loadedChannels.length > 0) setChannels(loadedChannels);
        const primaryAddress = (contact.addresses ?? [])[0];
        if (primaryAddress) {
          setShowAddress(true);
          setAddress({
            type: primaryAddress.type ?? 'office',
            address_line1: primaryAddress.address_line1 ?? '',
            address_line2: primaryAddress.address_line2 ?? '',
            city: primaryAddress.city ?? '',
            state_code: primaryAddress.state_code ?? '',
            postal_code: primaryAddress.postal_code ?? '',
          });
        }
        setNotes(contact.notes ?? '');
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not load the contact.';
        showToast({ type: 'error', title: 'Loading failed', message });
        navigation.goBack();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, navigation, showToast]);

  const toggleClassification = (id: string) =>
    setClassifications((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const setChannel = (key: number, patch: Partial<ChannelDraft>) =>
    setChannels((prev) =>
      prev.map((channel) => {
        if (channel.key !== key) {
          // selecting a new primary clears the others
          return patch.is_primary ? { ...channel, is_primary: false } : channel;
        }
        const next = { ...channel, ...patch };
        if (patch.channel_type) {
          next.country_code = PHONE_CHANNELS.includes(patch.channel_type) ? channel.country_code || '+91' : '';
        }
        return next;
      })
    );

  const removeChannel = (key: number) =>
    setChannels((prev) => {
      const next = prev.filter((channel) => channel.key !== key);
      if (next.length > 0 && !next.some((channel) => channel.is_primary)) next[0].is_primary = true;
      return next;
    });

  const validate = (): boolean => {
    const nextErrors: Record<string, string | undefined> = {};
    if (type === 'individual') {
      const nameError = validatePersonName(name);
      if (nameError) nextErrors.name = nameError;
    } else {
      const companyError = validateCompanyName(companyName);
      if (companyError) nextErrors.companyName = companyError;
    }
    if (classifications.length === 0) nextErrors.classifications = 'Pick at least one classification';
    const validChannels = channels.filter((channel) => channel.value.trim());
    if (validChannels.length === 0) {
      nextErrors.channels = 'Add at least one channel';
    } else {
      for (const channel of channels) {
        if (!channel.value.trim()) continue;
        const channelError = validateChannelValue(channel.channel_type, channel.value);
        if (channelError) {
          nextErrors[`channel-${channel.key}`] = channelError;
        }
      }
    }
    if (showAddress && (address.address_line1.trim() || address.city.trim())) {
      if (!address.address_line1.trim()) nextErrors.addressLine1 = 'Required';
      if (!address.city.trim()) nextErrors.addressCity = 'Required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (forceCreate = false): CreateContactRequest => {
    const cleanChannels = channels
      .filter((channel) => channel.value.trim())
      .map((channel, index, list) => ({
        channel_type: channel.channel_type,
        value: channel.value.trim(),
        country_code: PHONE_CHANNELS.includes(channel.channel_type) ? channel.country_code || '+91' : undefined,
        is_primary: list.some((x) => x.is_primary) ? channel.is_primary : index === 0,
      }));
    const includeAddress = showAddress && address.address_line1.trim() && address.city.trim();
    return {
      type,
      classifications,
      name: type === 'individual' ? name.trim() : undefined,
      salutation: type === 'individual' ? (salutation ?? undefined) : undefined,
      designation: type === 'individual' && designation.trim() ? designation.trim() : undefined,
      company_name: type === 'corporate' ? companyName.trim() : undefined,
      registration_number: type === 'corporate' && registrationNumber.trim() ? registrationNumber.trim() : undefined,
      contact_channels: cleanChannels,
      addresses: includeAddress
        ? [
            {
              type: address.type,
              address_line1: address.address_line1.trim(),
              address_line2: address.address_line2.trim() || undefined,
              city: address.city.trim(),
              state_code: address.state_code.trim() || undefined,
              postal_code: address.postal_code.trim() || undefined,
              country_code: 'IN',
              is_primary: true,
            },
          ]
        : undefined,
      notes: notes.trim() || undefined,
      force_create: forceCreate || undefined,
    };
  };

  const describeDuplicates = (duplicates: DuplicateMatch[]): string =>
    duplicates
      .slice(0, 3)
      .map((duplicate) => {
        const existing = duplicate.existing_contact;
        const label = existing?.name || existing?.company_name || 'Existing contact';
        return `• ${label}${duplicate.match_value ? ` (${duplicate.match_value})` : ''}`;
      })
      .join('\n');

  const submit = useCallback(
    async (forceCreate = false) => {
      if (!validate()) {
        showToast({ type: 'warning', title: 'Check the highlighted fields' });
        return;
      }
      setSaving(true);
      try {
        const payload = buildPayload(forceCreate);
        if (isEdit && editId) {
          await contactService.update(editId, payload);
          showToast({ type: 'success', title: 'Contact updated' });
        } else {
          await contactService.create(payload);
          showToast({ type: 'success', title: 'Contact created' });
        }
        navigation.goBack();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const payloadData = (err.payload ?? {}) as { duplicates?: DuplicateMatch[] };
          Alert.alert(
            'Possible duplicate',
            `A similar contact already exists:\n\n${describeDuplicates(payloadData.duplicates ?? [])}\n\nCreate anyway?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Create anyway', style: 'destructive', onPress: () => submit(true) },
            ]
          );
        } else {
          const message = err instanceof ApiError ? err.message : 'Please try again.';
          showToast({ type: 'error', title: isEdit ? 'Update failed' : 'Create failed', message });
        }
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, name, companyName, salutation, designation, registrationNumber, classifications, channels, showAddress, address, notes, isEdit, editId]
  );

  const fieldBorder = useMemo(() => tint(c.utility.secondaryText, '40'), [c.utility.secondaryText]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.utility.primaryBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.navBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.navButton}>
          <MaterialCommunityIcons name="close" size={24} color={c.utility.primaryText} />
        </Pressable>
        <Text style={[styles.navTitle, { color: c.utility.primaryText }]}>
          {isEdit ? 'Edit contact' : 'New contact'}
        </Text>
        <View style={styles.navButton} />
      </View>

      {loading ? (
        <View style={{ padding: 18, gap: 14 }}>
          <Skeleton height={48} radius={14} />
          <Skeleton height={48} radius={14} />
          <Skeleton height={110} radius={16} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 28 }}
          keyboardShouldPersistTaps="handled"
        >
          {!isEdit ? (
            <View style={styles.typeRow}>
              {(['individual', 'corporate'] as ContactType[]).map((option) => {
                const active = type === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setType(option)}
                    style={[
                      styles.typeCard,
                      {
                        borderColor: active ? c.brand.primary : fieldBorder,
                        backgroundColor: active ? tint(c.brand.primary, '14') : c.utility.secondaryBackground,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={option === 'individual' ? 'account-outline' : 'office-building-outline'}
                      size={22}
                      color={active ? c.brand.primary : c.utility.secondaryText}
                    />
                    <Text style={[styles.typeLabel, { color: active ? c.brand.primary : c.utility.primaryText }]}>
                      {option === 'individual' ? 'Individual' : 'Corporate'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {type === 'individual' ? (
            <>
              <SectionTitle title="Identity" style={{ marginTop: 18 }} />
              <View style={styles.salutations}>
                {SALUTATIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    selected={salutation === option.id}
                    onPress={() => setSalutation((prev) => (prev === option.id ? null : option.id))}
                  />
                ))}
              </View>
              <TextField
                label="Full name *"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                error={errors.name}
                placeholder="e.g. Ananya Sharma"
                containerStyle={{ marginTop: 12 }}
              />
              <TextField
                label="Designation"
                value={designation}
                onChangeText={setDesignation}
                placeholder="e.g. Facility Manager"
                containerStyle={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              <SectionTitle title="Company" style={{ marginTop: 18 }} />
              <TextField
                label="Company name *"
                value={companyName}
                onChangeText={(v) => {
                  setCompanyName(v);
                  if (errors.companyName) setErrors((e) => ({ ...e, companyName: undefined }));
                }}
                error={errors.companyName}
                placeholder="e.g. Meridian Facilities Pvt Ltd"
              />
              <TextField
                label="Registration number"
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
                placeholder="CIN / GSTIN (optional)"
                autoCapitalize="characters"
                containerStyle={{ marginTop: 12 }}
              />
            </>
          )}

          <SectionTitle title="Classification *" style={{ marginTop: 22 }} />
          <View style={styles.salutations}>
            {CLASSIFICATIONS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                icon={option.icon as any}
                selected={classifications.includes(option.id)}
                onPress={() => {
                  toggleClassification(option.id);
                  if (errors.classifications) setErrors((e) => ({ ...e, classifications: undefined }));
                }}
              />
            ))}
          </View>
          {errors.classifications ? (
            <Text style={[styles.errorText, { color: c.semantic.error }]}>{errors.classifications}</Text>
          ) : null}

          <SectionTitle
            title="Channels *"
            style={{ marginTop: 22 }}
            right={
              <Pressable onPress={() => setChannels((prev) => [...prev, newChannel('email')])} hitSlop={8}>
                <Text style={{ color: c.brand.primary, fontWeight: '700', fontSize: 13 }}>+ Add channel</Text>
              </Pressable>
            }
          />
          {errors.channels ? <Text style={[styles.errorText, { color: c.semantic.error }]}>{errors.channels}</Text> : null}
          <View style={{ gap: 14 }}>
            {channels.map((channel) => {
              const isPhone = PHONE_CHANNELS.includes(channel.channel_type);
              const meta = CHANNEL_META[channel.channel_type];
              return (
                <View
                  key={channel.key}
                  style={[styles.channelCard, { borderColor: fieldBorder, backgroundColor: c.utility.secondaryBackground }]}
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {CHANNEL_TYPES.map((channelType) => (
                      <Chip
                        key={channelType}
                        label={CHANNEL_META[channelType].label}
                        selected={channel.channel_type === channelType}
                        onPress={() => setChannel(channel.key, { channel_type: channelType })}
                      />
                    ))}
                  </ScrollView>
                  <View style={styles.channelValueRow}>
                    {isPhone ? (
                      <TextField
                        value={channel.country_code}
                        onChangeText={(v) => setChannel(channel.key, { country_code: v })}
                        placeholder="+91"
                        keyboardType="phone-pad"
                        containerStyle={{ width: 76 }}
                      />
                    ) : null}
                    <TextField
                      value={channel.value}
                      onChangeText={(v) => {
                        setChannel(channel.key, { value: v });
                        if (errors[`channel-${channel.key}`])
                          setErrors((e) => ({ ...e, [`channel-${channel.key}`]: undefined }));
                      }}
                      error={errors[`channel-${channel.key}`]}
                      placeholder={
                        channel.channel_type === 'email'
                          ? 'name@company.com'
                          : isPhone
                            ? '98765 43210'
                            : meta?.label
                      }
                      keyboardType={meta?.keyboard ?? 'default'}
                      autoCapitalize="none"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                  <View style={styles.channelFooter}>
                    <Pressable
                      onPress={() => setChannel(channel.key, { is_primary: true })}
                      style={styles.primaryToggle}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons
                        name={channel.is_primary ? 'star' : 'star-outline'}
                        size={18}
                        color={channel.is_primary ? c.semantic.warning : c.utility.secondaryText}
                      />
                      <Text style={{ color: channel.is_primary ? c.utility.primaryText : c.utility.secondaryText, fontSize: 12.5, fontWeight: '600' }}>
                        Primary
                      </Text>
                    </Pressable>
                    {channels.length > 1 ? (
                      <Pressable onPress={() => removeChannel(channel.key)} hitSlop={6}>
                        <MaterialCommunityIcons name="trash-can-outline" size={19} color={c.semantic.error} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <SectionTitle
            title="Address"
            style={{ marginTop: 22 }}
            right={
              <Pressable onPress={() => setShowAddress((s) => !s)} hitSlop={8}>
                <Text style={{ color: c.brand.primary, fontWeight: '700', fontSize: 13 }}>
                  {showAddress ? 'Remove' : '+ Add address'}
                </Text>
              </Pressable>
            }
          />
          {showAddress ? (
            <View style={{ gap: 12 }}>
              <TextField
                label="Address line 1 *"
                value={address.address_line1}
                onChangeText={(v) => {
                  setAddress((a) => ({ ...a, address_line1: v }));
                  if (errors.addressLine1) setErrors((e) => ({ ...e, addressLine1: undefined }));
                }}
                error={errors.addressLine1}
                placeholder="Building, street"
              />
              <TextField
                label="Address line 2"
                value={address.address_line2}
                onChangeText={(v) => setAddress((a) => ({ ...a, address_line2: v }))}
                placeholder="Area, landmark (optional)"
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextField
                  label="City *"
                  value={address.city}
                  onChangeText={(v) => {
                    setAddress((a) => ({ ...a, city: v }));
                    if (errors.addressCity) setErrors((e) => ({ ...e, addressCity: undefined }));
                  }}
                  error={errors.addressCity}
                  placeholder="City"
                  containerStyle={{ flex: 1 }}
                />
                <TextField
                  label="State"
                  value={address.state_code}
                  onChangeText={(v) => setAddress((a) => ({ ...a, state_code: v }))}
                  placeholder="e.g. TS"
                  autoCapitalize="characters"
                  containerStyle={{ width: 90 }}
                />
                <TextField
                  label="PIN"
                  value={address.postal_code}
                  onChangeText={(v) => setAddress((a) => ({ ...a, postal_code: v }))}
                  placeholder="500001"
                  keyboardType="number-pad"
                  containerStyle={{ width: 96 }}
                />
              </View>
            </View>
          ) : null}

          <SectionTitle title="Notes" style={{ marginTop: 22 }} />
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything worth remembering about this contact…"
            multiline
            numberOfLines={4}
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />

          <Button
            title={isEdit ? 'Save changes' : 'Create contact'}
            onPress={() => submit(false)}
            loading={saving}
            style={{ marginTop: 26 }}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16.5, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  typeLabel: { fontSize: 14.5, fontWeight: '700' },
  salutations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  errorText: { fontSize: 12, fontWeight: '500', marginTop: 6, marginBottom: 2 },
  channelCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  channelValueRow: { flexDirection: 'row', gap: 10 },
  channelFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

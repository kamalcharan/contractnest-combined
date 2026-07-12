// src/features/ops/OpsScreen.tsx
// Operations tab with two segments mirroring the web "Operations" cluster:
//  • Cockpit — stat cards, awaiting-acceptance carousel, action queue
//  • Cadence — the event schedule: lane toggle, bucket tiles, event cards
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { Avatar, Badge, Card, EmptyState, KpiCard, PreviewBadge, SectionTitle, SegmentedControl } from '../../components/ui';
import {
  EVENT_STATUS_META,
  MOCK_ACTION_QUEUE,
  MOCK_AWAITING_ACCEPTANCE,
  MOCK_EVENTS,
  MockEvent,
} from '../preview/mockData';
import { avatarColor, formatCurrencyCompact, formatDateShort, initials, tint } from '../../utils/format';

type Segment = 'cockpit' | 'cadence';
type Lane = 'all' | 'service' | 'billing';
type Bucket = 'all' | 'overdue' | 'today' | 'this_week' | 'upcoming';

const EVENT_TYPE_META: Record<string, { icon: string; color: string }> = {
  service: { icon: 'wrench-outline', color: '#10B981' },
  billing: { icon: 'currency-inr', color: '#F59E0B' },
  spare_part: { icon: 'package-variant-closed', color: '#3B82F6' },
};

const QUEUE_DOT: Record<'draft' | 'urgent' | 'pending', string> = {
  draft: '#6B7280',
  urgent: '#EF4444',
  pending: '#F59E0B',
};

export const OpsScreen: React.FC = () => {
  const { theme } = useTheme();
  const c = theme.colors;
  const [segment, setSegment] = useState<Segment>('cockpit');
  const [lane, setLane] = useState<Lane>('all');
  const [bucket, setBucket] = useState<Bucket>('all');

  const bucketMeta: Array<{ id: Bucket; label: string; color: string }> = [
    { id: 'overdue', label: 'Overdue', color: c.semantic.error },
    { id: 'today', label: 'Today', color: c.semantic.warning },
    { id: 'this_week', label: 'This week', color: c.brand.primary },
    { id: 'upcoming', label: 'Upcoming', color: c.utility.secondaryText },
  ];

  const laneEvents = useMemo(
    () => MOCK_EVENTS.filter((event) => lane === 'all' || event.event_type === lane),
    [lane]
  );
  const visibleEvents = useMemo(
    () => laneEvents.filter((event) => bucket === 'all' || event.bucket === bucket),
    [laneEvents, bucket]
  );

  const overdueCount = MOCK_EVENTS.filter((event) => event.bucket === 'overdue').length;

  const renderEvent = (event: MockEvent) => {
    const typeMeta = EVENT_TYPE_META[event.event_type];
    const status = EVENT_STATUS_META[event.status] ?? { label: event.status, color: '#6B7280' };
    return (
      <Card key={event.id} style={styles.eventCard}>
        <View style={[styles.eventIcon, { backgroundColor: tint(typeMeta.color, '1e') }]}>
          <MaterialCommunityIcons name={typeMeta.icon as any} size={19} color={typeMeta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventTitle, { color: c.utility.primaryText }]} numberOfLines={1}>
            {event.block_name}
          </Text>
          <Text style={[styles.eventMeta, { color: c.utility.secondaryText }]} numberOfLines={1}>
            {event.buyer_name} · {event.contract_number}
          </Text>
          <View style={styles.eventFooter}>
            <View style={styles.eventDate}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={13}
                color={event.bucket === 'overdue' ? c.semantic.error : c.utility.secondaryText}
              />
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '600',
                  color: event.bucket === 'overdue' ? c.semantic.error : c.utility.secondaryText,
                }}
              >
                {formatDateShort(event.scheduled_date)}
              </Text>
            </View>
            <Badge small label={status.label} color={status.color} />
            {event.amount ? (
              <Text style={[styles.eventAmount, { color: c.utility.primaryText }]}>
                {formatCurrencyCompact(event.amount)}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <AppHeader
        title="Operations"
        subtitle={segment === 'cockpit' ? 'Command center for your day' : 'Every promised event, in rhythm'}
        right={<PreviewBadge />}
      />

      <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
        <SegmentedControl
          options={[
            { id: 'cockpit', label: 'Cockpit', icon: 'speedometer' },
            { id: 'cadence', label: 'Cadence', icon: 'metronome' },
          ]}
          value={segment}
          onChange={(id) => setSegment(id as Segment)}
        />
      </View>

      {segment === 'cockpit' ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}>
          <View style={styles.statRow}>
            <KpiCard style={{ flex: 1 }} label="Pending Accept" value="2" color={c.semantic.warning} icon="send-clock-outline" />
            <KpiCard style={{ flex: 1 }} label="Drafts" value="1" icon="file-document-edit-outline" />
            <KpiCard style={{ flex: 1 }} label="Overdue" value={String(overdueCount)} color={c.semantic.error} icon="alert-outline" />
          </View>

          <SectionTitle title="Awaiting acceptance" style={{ marginTop: 22 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {MOCK_AWAITING_ACCEPTANCE.map((item) => (
              <Card key={item.id} style={styles.awaitCard}>
                <View style={styles.awaitTop}>
                  <Avatar label={initials(item.buyer)} color={avatarColor(item.buyer)} size={36} />
                  <Badge
                    small
                    label={item.seen}
                    color={item.seen === 'Opened' ? '#F59E0B' : '#EF4444'}
                  />
                </View>
                <Text style={[styles.awaitTitle, { color: c.utility.primaryText }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.awaitMeta, { color: c.utility.secondaryText }]} numberOfLines={1}>
                  {item.contract_number} · {item.buyer}
                </Text>
                <Text style={[styles.awaitSent, { color: c.utility.secondaryText }]}>
                  Sent {item.sentDaysAgo}d ago
                </Text>
              </Card>
            ))}
          </ScrollView>

          <SectionTitle title="Action queue" style={{ marginTop: 22 }} />
          <Card style={{ paddingVertical: 4 }}>
            {MOCK_ACTION_QUEUE.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.queueRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(c.utility.secondaryText, '33') },
                ]}
              >
                <View style={[styles.queueDot, { backgroundColor: QUEUE_DOT[item.kind] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.queueTitle, { color: c.utility.primaryText }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.queueSub, { color: c.utility.secondaryText }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={tint(c.utility.secondaryText, '88')} />
              </View>
            ))}
          </Card>

          <Text style={[styles.footerNote, { color: tint(c.utility.secondaryText, 'aa') }]}>
            {MOCK_EVENTS.length} events across 8 contracts · preview data
          </Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}>
          <SegmentedControl
            options={[
              { id: 'all', label: 'All events' },
              { id: 'service', label: 'Service', icon: 'wrench-outline' },
              { id: 'billing', label: 'Billing', icon: 'currency-inr' },
            ]}
            value={lane}
            onChange={(id) => setLane(id as Lane)}
            style={{ marginBottom: 14 }}
          />

          <View style={styles.bucketRow}>
            {bucketMeta.map((meta) => {
              const count = laneEvents.filter((event) => event.bucket === meta.id).length;
              const active = bucket === meta.id;
              return (
                <Card
                  key={meta.id}
                  onPress={() => setBucket(active ? 'all' : meta.id)}
                  style={[
                    styles.bucketTile,
                    active && { borderWidth: 1.5, borderColor: meta.color },
                  ]}
                >
                  <Text style={[styles.bucketLabel, { color: c.utility.secondaryText }]}>
                    {meta.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.bucketCount, { color: count > 0 ? meta.color : c.utility.secondaryText }]}>
                    {count}
                  </Text>
                </Card>
              );
            })}
          </View>

          {visibleEvents.length === 0 ? (
            <EmptyState icon="calendar-check-outline" title="Nothing in this view" message="All caught up for this filter." />
          ) : (
            <View style={{ gap: 10, marginTop: 14 }}>{visibleEvents.map(renderEvent)}</View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  statRow: { flexDirection: 'row', gap: 10 },
  awaitCard: { width: 230, padding: 13, gap: 8 },
  awaitTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  awaitTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  awaitMeta: { fontSize: 11 },
  awaitSent: { fontSize: 10.5, fontWeight: '600' },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  queueDot: { width: 9, height: 9, borderRadius: 5 },
  queueTitle: { fontSize: 13.5, fontWeight: '600' },
  queueSub: { fontSize: 11.5, marginTop: 2 },
  footerNote: { fontSize: 11, textAlign: 'center', marginTop: 20 },
  bucketRow: { flexDirection: 'row', gap: 8 },
  bucketTile: { flex: 1, padding: 11, alignItems: 'flex-start' },
  bucketLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  bucketCount: { fontSize: 20, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  eventCard: { flexDirection: 'row', gap: 12, padding: 13, alignItems: 'flex-start' },
  eventIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 13.5, fontWeight: '700' },
  eventMeta: { fontSize: 11.5, marginTop: 2 },
  eventFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' },
  eventDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventAmount: { fontSize: 12.5, fontWeight: '800', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
});

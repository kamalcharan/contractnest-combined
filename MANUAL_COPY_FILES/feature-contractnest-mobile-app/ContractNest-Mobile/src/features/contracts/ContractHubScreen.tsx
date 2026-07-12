// src/features/contracts/ContractHubScreen.tsx
// UI preview of the web Contract Hub: portfolio summary strip, status pipeline, contract rows.
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { Avatar, Badge, Card, EmptyState, KpiCard, PreviewBadge } from '../../components/ui';
import {
  CONTRACT_STATUS_META,
  ContractStatus,
  MOCK_CONTRACTS,
  MOCK_PORTFOLIO,
  MockContract,
} from '../preview/mockData';
import { avatarColor, formatCurrencyCompact, initials, tint } from '../../utils/format';

type PipelineFilter = 'all' | ContractStatus;

const PIPELINE: Array<{ id: PipelineFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'In Review' },
  { id: 'pending_acceptance', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'expired', label: 'Expired' },
];

export const ContractHubScreen: React.FC = () => {
  const { theme } = useTheme();
  const c = theme.colors;
  const [filter, setFilter] = useState<PipelineFilter>('active');

  const statusColor = (status: ContractStatus): string => {
    const key = CONTRACT_STATUS_META[status].colorKey;
    switch (key) {
      case 'success':
        return c.semantic.success;
      case 'warning':
        return c.semantic.warning;
      case 'error':
        return c.semantic.error;
      case 'info':
        return c.semantic.info === '#ffffff' ? c.brand.secondary : c.semantic.info;
      case 'tertiary':
        return c.brand.tertiary;
      default:
        return c.utility.secondaryText;
    }
  };

  const counts = useMemo(() => {
    const map = new Map<PipelineFilter, number>();
    map.set('all', MOCK_CONTRACTS.length);
    for (const contract of MOCK_CONTRACTS) {
      map.set(contract.status, (map.get(contract.status) ?? 0) + 1);
    }
    return map;
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? MOCK_CONTRACTS : MOCK_CONTRACTS.filter((contract) => contract.status === filter)),
    [filter]
  );

  const healthColor = (score: number) =>
    score >= 70 ? c.semantic.success : score >= 40 ? c.semantic.warning : c.semantic.error;

  const renderRow = ({ item }: { item: MockContract }) => {
    const color = statusColor(item.status);
    const needsAttention = item.events_overdue > 0 || (item.health_score > 0 && item.health_score < 50);
    return (
      <Card
        style={[
          styles.row,
          needsAttention && { borderLeftWidth: 3, borderLeftColor: c.semantic.error },
        ]}
      >
        <Avatar label={initials(item.buyer_name)} color={avatarColor(item.buyer_name)} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: c.utility.primaryText }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.rowNumber, { color: c.utility.secondaryText }]}>
            {item.contract_number} · {item.buyer_name}
          </Text>
          <View style={styles.rowFooter}>
            <Badge small label={CONTRACT_STATUS_META[item.status].label} color={color} />
            {item.events_overdue > 0 ? (
              <Badge small label={`${item.events_overdue} overdue`} color={c.semantic.error} />
            ) : null}
            {item.health_score > 0 ? (
              <View style={styles.health}>
                <MaterialCommunityIcons name="heart-pulse" size={13} color={healthColor(item.health_score)} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: healthColor(item.health_score) }}>
                  {item.health_score}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={[styles.rowValue, { color: c.utility.primaryText }]}>
          {formatCurrencyCompact(item.grand_total)}
        </Text>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <AppHeader
        title="Contract Hub"
        subtitle={`${MOCK_CONTRACTS.length} contracts · Revenue`}
        right={<PreviewBadge />}
      />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 10 }}
        ListEmptyComponent={
          <EmptyState icon="file-search-outline" title="No contracts in this stage" message="Try another pipeline filter." />
        }
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpis}>
              <KpiCard label="Portfolio Value" value={formatCurrencyCompact(MOCK_PORTFOLIO.portfolioValue)} icon="briefcase-outline" />
              <KpiCard label="Collected" value={formatCurrencyCompact(MOCK_PORTFOLIO.collected)} color={c.semantic.success} icon="check-circle-outline" />
              <KpiCard label="Outstanding" value={formatCurrencyCompact(MOCK_PORTFOLIO.outstanding)} color={MOCK_PORTFOLIO.outstanding > 0 ? c.semantic.error : c.semantic.success} icon="cash-clock" />
              <KpiCard label="Avg Health" value={String(MOCK_PORTFOLIO.avgHealth)} color={healthColor(MOCK_PORTFOLIO.avgHealth)} icon="heart-pulse" />
              <KpiCard label="Needs Attention" value={String(MOCK_PORTFOLIO.needsAttention)} color={c.semantic.error} icon="alert-circle-outline" />
              <KpiCard label="Overdue Tasks" value={String(MOCK_PORTFOLIO.overdueTasks)} color={c.semantic.error} icon="clock-alert-outline" />
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipeline}>
              {PIPELINE.map((stage) => {
                const active = filter === stage.id;
                const count = counts.get(stage.id) ?? 0;
                const color = stage.id === 'all' ? c.brand.primary : statusColor(stage.id as ContractStatus);
                return (
                  <View key={stage.id}>
                    <Text
                      onPress={() => setFilter(stage.id)}
                      style={[
                        styles.pill,
                        {
                          color: active ? '#fff' : c.utility.primaryText,
                          backgroundColor: active ? color : c.utility.secondaryBackground,
                          borderColor: active ? color : tint(c.utility.secondaryText, '44'),
                        },
                      ]}
                    >
                      {stage.label} {count > 0 ? `· ${count}` : ''}
                    </Text>
                    <View style={[styles.pillBar, { backgroundColor: active ? color : 'transparent' }]} />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  kpis: { gap: 10, paddingBottom: 14 },
  pipeline: { gap: 8, paddingBottom: 14 },
  pill: {
    fontSize: 12.5,
    fontWeight: '700',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pillBar: { height: 3, borderRadius: 2, marginTop: 3, marginHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowTitle: { fontSize: 14.5, fontWeight: '700' },
  rowNumber: { fontSize: 11.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  rowFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  health: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowValue: { fontSize: 14.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

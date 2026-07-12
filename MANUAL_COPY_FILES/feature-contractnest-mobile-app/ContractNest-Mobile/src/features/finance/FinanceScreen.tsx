// src/features/finance/FinanceScreen.tsx
// UI preview of the web Finance (AR/AP) page: receivables/payables toggle,
// KPI cards, ageing tiles, top debtors, invoice worklist with status filter.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { Badge, Card, Chip, EmptyState, KpiCard, PreviewBadge, SectionTitle, SegmentedControl } from '../../components/ui';
import {
  InvoiceStatus,
  MOCK_AP_SUMMARY,
  MOCK_AR_SUMMARY,
  MOCK_PAYABLES,
  MOCK_RECEIVABLES,
  MockInvoice,
} from '../preview/mockData';
import { formatCurrency, formatCurrencyCompact, formatDateShort, tint } from '../../utils/format';

type ViewMode = 'receivables' | 'payables';
type StatusFilter = 'all' | 'draft' | 'open' | 'overdue' | 'paid';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'open', label: 'Open' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

export const FinanceScreen: React.FC = () => {
  const { theme } = useTheme();
  const c = theme.colors;
  const [mode, setMode] = useState<ViewMode>('receivables');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isAR = mode === 'receivables';
  const invoices = isAR ? MOCK_RECEIVABLES : MOCK_PAYABLES;

  const statusMeta = (invoice: MockInvoice): { label: string; color: string } => {
    switch (invoice.status) {
      case 'paid':
        return { label: 'Paid', color: c.semantic.success };
      case 'overdue':
        return { label: `${invoice.days_overdue}d overdue`, color: c.semantic.error };
      case 'draft':
        return { label: 'Draft', color: c.semantic.warning };
      case 'partially_paid':
        return { label: 'Partially paid', color: c.brand.primary };
      default:
        return { label: 'Unpaid', color: c.utility.secondaryText };
    }
  };

  const matchesFilter = (invoice: MockInvoice): boolean => {
    switch (statusFilter) {
      case 'all':
        return true;
      case 'draft':
        return invoice.status === 'draft';
      case 'open':
        return invoice.status === 'unpaid' || invoice.status === 'partially_paid';
      case 'overdue':
        return invoice.status === 'overdue';
      case 'paid':
        return invoice.status === 'paid';
    }
  };

  const visible = useMemo(() => invoices.filter(matchesFilter), [invoices, statusFilter]);

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <AppHeader
        title="Finance"
        subtitle={isAR ? 'What customers owe you' : 'What you owe others'}
        right={<PreviewBadge />}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}>
        <SegmentedControl
          options={[
            { id: 'receivables', label: 'Receivables', icon: 'arrow-down-circle-outline' },
            { id: 'payables', label: 'Payables', icon: 'arrow-up-circle-outline' },
          ]}
          value={mode}
          onChange={(id) => {
            setMode(id as ViewMode);
            setStatusFilter('all');
          }}
          style={{ marginBottom: 16 }}
        />

        <View style={styles.kpiGrid}>
          {isAR ? (
            <>
              <KpiCard style={styles.kpiCell} label="Total outstanding" value={formatCurrencyCompact(MOCK_AR_SUMMARY.totalOutstanding)} sub={`${MOCK_AR_SUMMARY.openInvoices} open invoices`} icon="wallet-outline" />
              <KpiCard style={styles.kpiCell} label="Overdue" value={formatCurrencyCompact(MOCK_AR_SUMMARY.overdueTotal)} sub={`${MOCK_AR_SUMMARY.overdueCount} past due`} color={c.semantic.error} icon="alert-outline" />
              <KpiCard style={styles.kpiCell} label="Due in 30 days" value={formatCurrencyCompact(MOCK_AR_SUMMARY.dueNext30)} icon="calendar-clock" />
              <KpiCard style={styles.kpiCell} label="Collected this month" value={formatCurrencyCompact(MOCK_AR_SUMMARY.collectedThisMonth)} color={c.semantic.success} icon="check-circle-outline" />
            </>
          ) : (
            <>
              <KpiCard style={styles.kpiCell} label="Total payable" value={formatCurrencyCompact(MOCK_AP_SUMMARY.totalOutstanding)} sub={`${MOCK_AP_SUMMARY.openInvoices} open bills`} icon="wallet-outline" />
              <KpiCard style={styles.kpiCell} label="Overdue" value={formatCurrencyCompact(MOCK_AP_SUMMARY.overdueTotal)} sub={`${MOCK_AP_SUMMARY.overdueCount} past due`} color={c.semantic.error} icon="alert-outline" />
              <KpiCard style={styles.kpiCell} label="Due in 30 days" value={formatCurrencyCompact(MOCK_AP_SUMMARY.dueNext30)} icon="calendar-clock" />
              <KpiCard style={styles.kpiCell} label="Paid to date" value={formatCurrencyCompact(MOCK_AP_SUMMARY.paidToDate)} color={c.semantic.success} icon="check-circle-outline" />
            </>
          )}
        </View>

        {isAR ? (
          <>
            <SectionTitle title="Ageing — overdue balances" style={{ marginTop: 22 }} />
            <View style={styles.ageingRow}>
              {MOCK_AR_SUMMARY.ageing.map((bucket) => (
                <Card key={bucket.label} style={[styles.ageingTile, { borderTopWidth: 3, borderTopColor: bucket.color }]}>
                  <Text style={[styles.ageingLabel, { color: c.utility.secondaryText }]}>{bucket.label}</Text>
                  <Text style={[styles.ageingValue, { color: bucket.amount > 0 ? bucket.color : c.utility.secondaryText }]}>
                    {formatCurrencyCompact(bucket.amount)}
                  </Text>
                  <Text style={[styles.ageingCount, { color: c.utility.secondaryText }]}>
                    {bucket.count} invoice{bucket.count === 1 ? '' : 's'}
                  </Text>
                </Card>
              ))}
            </View>

            <SectionTitle title="Who owes you" style={{ marginTop: 22 }} />
            <Card style={{ paddingVertical: 4 }}>
              {MOCK_AR_SUMMARY.topDebtors.map((debtor, index) => (
                <View
                  key={debtor.name}
                  style={[
                    styles.debtorRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(c.utility.secondaryText, '33') },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.debtorName, { color: c.utility.primaryText }]} numberOfLines={1}>
                      {debtor.name}
                    </Text>
                    <Text style={[styles.debtorMeta, { color: c.utility.secondaryText }]}>
                      {debtor.invoices} invoice{debtor.invoices === 1 ? '' : 's'}
                      {debtor.oldest > 0 ? ` · oldest ${debtor.oldest}d overdue` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.debtorAmount, { color: debtor.oldest > 0 ? c.semantic.error : c.utility.primaryText }]}>
                    {formatCurrency(debtor.outstanding)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionTitle title="Invoices" style={{ marginTop: 22 }} right={<Text style={{ color: c.utility.secondaryText, fontSize: 12 }}>{visible.length} of {invoices.length}</Text>} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {STATUS_FILTERS.filter((f) => isAR || f.id !== 'draft').map((f) => (
            <Chip key={f.id} label={f.label} selected={statusFilter === f.id} onPress={() => setStatusFilter(f.id)} />
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <EmptyState icon="inbox-outline" title="No invoices match this view" />
        ) : (
          <View style={{ gap: 10 }}>
            {visible.map((invoice) => {
              const meta = statusMeta(invoice);
              const paidRatio = invoice.total_amount > 0 ? 1 - invoice.balance / invoice.total_amount : 0;
              return (
                <Card key={invoice.id} style={styles.invoiceCard}>
                  <View style={styles.invoiceTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.invoiceNumber, { color: c.utility.primaryText }]}>{invoice.invoice_number}</Text>
                      <Text style={[styles.invoiceMeta, { color: c.utility.secondaryText }]} numberOfLines={1}>
                        {invoice.counterparty} · {invoice.contract_number}
                        {invoice.billing_cycle ? ` · ${invoice.billing_cycle}` : ''}
                      </Text>
                    </View>
                    <Badge label={meta.label} color={meta.color} />
                  </View>
                  <View style={styles.invoiceBottom}>
                    <Text style={[styles.invoiceDue, { color: invoice.status === 'overdue' ? c.semantic.error : c.utility.secondaryText }]}>
                      Due {formatDateShort(invoice.due_date)}
                    </Text>
                    <Text style={[styles.invoiceBalance, { color: c.utility.primaryText }]}>
                      {formatCurrency(invoice.balance)}
                      {invoice.balance !== invoice.total_amount ? (
                        <Text style={{ color: c.utility.secondaryText, fontSize: 11.5, fontWeight: '500' }}>
                          {'  '}of {formatCurrency(invoice.total_amount)}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                  {paidRatio > 0 && paidRatio < 1 ? (
                    <View style={[styles.progressTrack, { backgroundColor: tint(c.semantic.success, '22') }]}>
                      <View style={[styles.progressFill, { backgroundColor: c.semantic.success, width: `${Math.round(paidRatio * 100)}%` }]} />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}

        {!isAR ? (
          <Text style={[styles.payablesNote, { color: c.utility.secondaryText }]}>
            Payables are read-only in this release.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCell: { flexBasis: '47%', flexGrow: 1 },
  ageingRow: { flexDirection: 'row', gap: 8 },
  ageingTile: { flex: 1, padding: 10, alignItems: 'flex-start' },
  ageingLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  ageingValue: { fontSize: 14, fontWeight: '800', marginTop: 5, fontVariant: ['tabular-nums'] },
  ageingCount: { fontSize: 9.5, marginTop: 2 },
  debtorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  debtorName: { fontSize: 13.5, fontWeight: '600' },
  debtorMeta: { fontSize: 11.5, marginTop: 2 },
  debtorAmount: { fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  invoiceCard: { padding: 13, gap: 9 },
  invoiceTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  invoiceNumber: { fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  invoiceMeta: { fontSize: 11.5, marginTop: 2 },
  invoiceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoiceDue: { fontSize: 12, fontWeight: '600' },
  invoiceBalance: { fontSize: 14.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  payablesNote: { fontSize: 11.5, textAlign: 'center', marginTop: 16 },
});

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import { useKassaSession } from '@/components/kassa-demo/api';
import { KScreen, KCard } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import {
  ScreenHeading, Tabs, MetricGrid, ListHeading, RecordRow,
  InlineNotice, SmallAction, money,
} from '@/components/kassa-demo/business-ui';

type Period = 'Daily' | 'Weekly' | 'Monthly' | 'Custom range';
type Granularity = 'day' | 'week' | 'month';
type Channel = 'BANK_TRANSFER' | 'POS' | 'CASH' | 'USSD' | 'CARD' | 'WALLET';
type Analytics = {
  scope: { businessId: string; branchId: string | null; from: string; to: string; granularity: Granularity; timezone: string };
  summary: {
    paidSales: string; paidTransactions: number; averageSale: string;
    totalTransactions: number; pendingTransactions: number; failedPayments: number;
    failedPaymentRate: number | null; previousPaidSales: string; salesChangePercent: number | null;
    topBranch: { name: string; amount: string } | null;
  };
  trend: { period: string; channel: Channel; amount: string; transactions: number }[];
  channels: { channel: Channel; amount: string; paidTransactions: number; sharePct: number }[];
  staff: { id: string | null; name: string; paidTransactions: number; paidSales: string; failedPayments: number }[];
  branches: { id: string; name: string; amount: string }[];
  notes: string[];
};
const periods: Period[] = ['Daily', 'Weekly', 'Monthly', 'Custom range'];
const channels: Channel[] = ['BANK_TRANSFER', 'POS', 'CASH', 'USSD', 'CARD', 'WALLET'];
const names: Record<Channel, string> = {
  BANK_TRANSFER: 'Bank transfer', POS: 'POS', CASH: 'Cash', USSD: 'USSD', CARD: 'Card', WALLET: 'Wallet',
};
const colors: Record<Channel, string> = {
  BANK_TRANSFER: C.green, POS: '#4B9C84', CASH: '#75B59B', USSD: '#A6D5BA',
  CARD: '#D3ECE0', WALLET: '#CEE0D7',
};
function lagosToday() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const p = (key: string) => parts.find(part => part.type === key)?.value || '';
  return [p('year'), p('month'), p('day')].join('-');
}
function shift(iso: string, days: number): string {
  const date = new Date(iso + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function startMonth(iso: string, months: number): string {
  const [y, m] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}
function defaultRange(period: Period, customFrom: string, customTo: string) {
  const today = lagosToday();
  if (period === 'Daily') return { from: shift(today, -6), to: today, granularity: 'day' as Granularity };
  if (period === 'Weekly') return { from: shift(today, -41), to: today, granularity: 'week' as Granularity };
  if (period === 'Monthly') return { from: startMonth(today, -5), to: today, granularity: 'month' as Granularity };
  return { from: customFrom, to: customTo, granularity: 'day' as Granularity };
}

const quickRanges = ['Last 7 days', 'Last 30 days', 'This quarter', 'Year to date', 'Last 6 months'] as const;
function presetRange(preset: typeof quickRanges[number]): { from: string; to: string } {
  const today = lagosToday();
  if (preset === 'Last 7 days') return { from: shift(today, -6), to: today };
  if (preset === 'Last 30 days') return { from: shift(today, -29), to: today };
  if (preset === 'Last 6 months') return { from: startMonth(today, -5), to: today };
  if (preset === 'Year to date') return { from: today.slice(0, 4) + '-01-01', to: today };
  const [year, month] = today.split('-').map(Number);
  const quarter = Math.floor((month - 1) / 3) * 3;
  const start = new Date(Date.UTC(year, quarter, 1)).toISOString().slice(0, 10);
  return { from: start, to: today };
}
function reportHtml(report: Analytics): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
  const row = (name: string, value: string) =>
    '<tr><th>' + escape(name) + '</th><td>' + escape(value) + '</td></tr>';
  return '<html><head><meta charset="UTF-8"/><style>' +
    'body{font-family:Arial,sans-serif;color:#182C27;padding:22px}h1{color:#0F6E56}' +
    'table{border-collapse:collapse;width:100%;margin:14px 0 26px}' +
    'td,th{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left;font-size:12px}' +
    'p{color:#55615D;font-size:12px}</style></head><body><h1>KASSA Reports &amp; Analytics</h1>' +
    '<p>' + escape(report.scope.from + ' to ' + report.scope.to) + '</p>' +
    '<h2>Summary</h2><table>' +
    row('Confirmed sales', money(report.summary.paidSales)) +
    row('Paid transactions', String(report.summary.paidTransactions)) +
    row('Average transaction', money(report.summary.averageSale)) +
    row('Failed payment rate', report.summary.failedPaymentRate === null ? 'N/A' : report.summary.failedPaymentRate + '%') +
    '</table><h2>Sales by channel</h2><table>' +
    report.channels.map(channel => row(names[channel.channel], money(channel.amount) +
      ' · ' + channel.paidTransactions + ' payments (' + channel.sharePct + '%)')).join('') +
    '</table><h2>Sales by staff</h2><table>' +
    report.staff.map(person => row(person.name, money(person.paidSales) +
      ' · ' + person.paidTransactions + ' transactions')).join('') +
    '</table><p>Only confirmed paid sales are counted. These figures are not bank settlement verification.</p></body></html>';
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
function StackedTrend({ data }: { data: Analytics }) {
  const rows = useMemo(() => {
    const bucket = new Map<string, Record<string, number>>();
    for (const row of data.trend) {
      const values = bucket.get(row.period) ?? {};
      values[row.channel] = (values[row.channel] ?? 0) + Number(row.amount);
      bucket.set(row.period, values);
    }
    return [...bucket.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);
  const max = Math.max(1, ...rows.map(([, entry]) =>
    channels.reduce((sum, channel) => sum + (entry[channel] ?? 0), 0)));
  return <KCard>
    <Text style={s.cardTitle}>Sales trend</Text>
    <Text style={s.cardSubtitle}>Confirmed sales by payment channel</Text>
    {!rows.length ? <Text style={s.muted}>No confirmed sales for this period.</Text> :
      <View style={s.chart}>
        {rows.map(([day, entries]) => {
          const total = channels.reduce((sum, channel) => sum + (entries[channel] ?? 0), 0);
          return <View key={day} style={s.barColumn}>
            <View style={s.barBackground}>
              <View style={{ height: Math.max(2, total / max * 160), justifyContent: 'flex-end' }}>
                {channels.map(channel => {
                  const amount = entries[channel] ?? 0;
                  return amount > 0 ? <View key={channel} style={{
                    flex: amount, backgroundColor: colors[channel], minHeight: 1,
                  }}/> : null;
                })}
              </View>
            </View>
            <Text numberOfLines={1} style={s.chartLabel}>
              {data.scope.granularity === 'month'
                ? day.slice(0, 7) : day.slice(5)}
            </Text>
          </View>;
        })}
      </View>}
    <View style={s.legend}>{channels.map(channel =>
      <View key={channel} style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: colors[channel] }]}/>
        <Text style={s.legendText}>{names[channel]}</Text>
      </View>)}</View>
  </KCard>;
}

export default function Reports() {
  const session = useKassaSession();
  const scope = session.scope;
  const [period, setPeriod] = useState<Period>('Weekly');
  const [allBranches, setAllBranches] = useState(false);
  const [customFrom, setCustomFrom] = useState(shift(lagosToday(), -29));
  const [customTo, setCustomTo] = useState(lagosToday());
  const [customApply, setCustomApply] = useState(0);
  const [report, setReport] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllStaff, setShowAllStaff] = useState(false);
  const owner = scope?.myRole === 'Owner';
  const range = defaultRange(period, customFrom, customTo);
  const reload = useCallback(async (live: () => boolean = () => true) => {
    if (!scope) { setReport(null); return; }
    if (!validDate(range.from) || !validDate(range.to) || range.from > range.to) {
      if (live()) setError('Enter valid dates in YYYY-MM-DD format, with From before To.');
      return;
    }
    if (live()) { setLoading(true); setError(''); }
    try {
      const query = new URLSearchParams({
        businessId: scope.businessId, from: range.from, to: range.to,
        granularity: range.granularity,
        ...(!owner || !allBranches ? { branchId: scope.branchId } : {}),
      });
      const result = await session.request<Analytics>('reports/summary?' + query.toString());
      if (!result?.summary || !Array.isArray(result.trend) || !Array.isArray(result.channels)) {
        throw new Error('Invalid analytics response.');
      }
      if (live()) setReport(result);
    } catch (cause) {
      if (live()) { setReport(null); setError(cause instanceof Error ? cause.message : 'Cannot load analytics.'); }
    } finally { if (live()) setLoading(false); }
  }, [scope?.businessId, scope?.branchId, owner, allBranches, range.from, range.to, range.granularity, customApply, session.request]);
  useFocusEffect(useCallback(() => {
    let live = true;
    void reload(() => live);
    return () => { live = false; };
  }, [reload]));
  const exportPdf = async () => {
    if (!report) return;
    try { await Print.printAsync({ html: reportHtml(report) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open PDF export.'); }
  };
  const shareReport = async () => {
    if (!report) return;
    const lines = ['KASSA Reports & Analytics', range.from + ' to ' + range.to,
      'Paid sales: ' + money(report.summary.paidSales),
      'Transactions: ' + report.summary.paidTransactions,
      ...report.channels.map(row => names[row.channel] + ': ' + money(row.amount) + ' (' + row.sharePct + '%)')];
    try { await Share.share({ message: lines.join('\n'), title: 'KASSA sales report' }); }
    catch { setError('Unable to share this report.'); }
  };
  const growth = report?.summary.salesChangePercent;
  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Reports & Analytics" subtitle="Confirmed business sales"
      right={<SmallAction label="Export PDF" secondary disabled={!report}
        onPress={() => { void exportPdf(); }}/>} />
    <Tabs options={periods} value={period} onChange={next => setPeriod(next as Period)}/>
    {owner && <Tabs options={['This branch', 'All branches']} value={allBranches ? 'All branches' : 'This branch'}
      onChange={value => setAllBranches(value === 'All branches')}/>}
    {period === 'Custom range' && <KCard>
      <Text style={s.cardSubtitle}>Choose a reporting period</Text>
      <View style={s.presetRow}>
        {quickRanges.map(option => <Pressable key={option} accessibilityRole="button"
          onPress={() => {
            const next = presetRange(option);
            setCustomFrom(next.from); setCustomTo(next.to);
            setCustomApply(value => value + 1);
          }} style={s.preset}>
          <Text style={s.presetText}>{option}</Text>
        </Pressable>)}
      </View>
      <Text style={s.cardSubtitle}>Custom dates (YYYY-MM-DD)</Text>
      <View style={s.dateRow}>
        <TextInput style={s.dateInput} value={customFrom} onChangeText={setCustomFrom} placeholder="From: YYYY-MM-DD"/>
        <TextInput style={s.dateInput} value={customTo} onChangeText={setCustomTo} placeholder="To: YYYY-MM-DD"/>
      </View>
      <SmallAction label="Apply dates" onPress={() => setCustomApply(value => value + 1)}/>
    </KCard>}
    {loading && <Text style={s.muted}>Loading business analytics…</Text>}
    {!!error && <InlineNotice warning text={error}/>}
    {!!report && <>
      <View style={s.shareRow}><SmallAction label="Share summary" secondary onPress={() => { void shareReport(); }}/></View>
      <Text style={s.period}>{report.scope.from} to {report.scope.to} · {report.scope.branchId ? 'Selected branch' : 'All branches'}</Text>
      <MetricGrid items={[
        { label: 'Total sales', value: money(report.summary.paidSales),
          note: growth == null ? 'No prior comparison' : (growth >= 0 ? '+' : '') + growth + '% vs prior period' },
        { label: period === 'Custom range' ? 'Transactions' : 'Avg. transaction value',
          value: period === 'Custom range' ? String(report.summary.paidTransactions) : money(report.summary.averageSale),
          note: period === 'Custom range' ? 'Confirmed transactions' :
            report.summary.paidTransactions + ' paid transactions' },
        { label: 'Failed payment rate',
          value: report.summary.failedPaymentRate == null ? 'N/A' : report.summary.failedPaymentRate + '%',
          note: report.summary.failedPayments + ' failed attempts', alert: report.summary.failedPayments > 0 },
        { label: period === 'Custom range' ? 'Days covered' : 'Top branch',
          value: period === 'Custom range'
            ? String(Math.round((Date.parse(report.scope.to) - Date.parse(report.scope.from)) / 86400000) + 1)
            : report.summary.topBranch?.name ?? '—',
          note: period === 'Custom range' ? report.scope.from + ' to ' + report.scope.to : 'By confirmed sales' },
      ]}/>
      <StackedTrend data={report}/>
      <KCard>
        <Text style={s.cardTitle}>Sales by channel</Text>
        <Text style={s.cardSubtitle}>Share of confirmed sales</Text>
        {report.channels.map(row => <View key={row.channel} style={s.channel}>
          <View style={s.channelHead}>
            <Text style={s.channelName}>{names[row.channel]}</Text>
            <Text style={s.channelValue}>{Math.max(0, Math.min(100, row.sharePct))}%</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: Math.max(0, Math.min(100, row.sharePct)) + '%', backgroundColor: colors[row.channel] }]}/>
          </View>
          <Text style={s.channelAmount}>{money(row.amount)} · {row.paidTransactions} paid</Text>
        </View>)}
      </KCard>
      <ListHeading title="Sales by staff member" action={showAllStaff ? 'Show less' : 'View all'}
        onPress={() => setShowAllStaff(value => !value)}/>
      {(showAllStaff ? report.staff : report.staff.slice(0, 5)).map((member, index) =>
        <RecordRow key={member.id ?? String(index)} title={member.name}
          subtitle={member.paidTransactions + ' transactions · ' + member.failedPayments + ' failed'}
          amount={money(member.paidSales)} status="Sales" tone="green"/>)}
      {!report.staff.length && <InlineNotice text="No staff sales for this period."/>}
      <Text style={s.footer}>Revenue is confirmed paid sales, not profit or bank-settled funds. Test sales are excluded.</Text>
    </>}
  </KScreen>;
}

const s = StyleSheet.create({
  shareRow: { alignSelf: 'flex-end', marginBottom: 8 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  preset: { paddingHorizontal: 9, minHeight: 32, borderRadius: 7, backgroundColor: C.mint,
    borderWidth: 1, borderColor: C.mintBorder, justifyContent: 'center' },
  presetText: { color: C.greenDark, fontSize: 12, fontWeight: '700' },
  muted: { color: C.muted, fontSize: 14, paddingVertical: 14 },
  cardTitle: { color: C.title, fontSize: 17, fontWeight: '800', marginBottom: 5 },
  cardSubtitle: { color: C.muted, fontSize: 12, marginBottom: 15 },
  period: { color: C.muted, fontSize: 12, marginBottom: 13 },
  dateRow: { flexDirection: 'row', gap: 7, marginBottom: 11 },
  dateInput: { backgroundColor: C.white, flex: 1, minWidth: 0, borderWidth: 1,
    borderColor: C.border, borderRadius: 8, padding: 10, color: C.title, fontSize: 13 },
  chart: { minHeight: 195, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 14 },
  barColumn: { flex: 1, minWidth: 12, alignItems: 'center' },
  barBackground: { width: '80%', height: 165, justifyContent: 'flex-end', backgroundColor: C.background },
  chartLabel: { fontSize: 9, color: C.muted, marginTop: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderColor: C.border, paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { color: C.muted, fontSize: 11 },
  channel: { marginBottom: 17 },
  channelHead: { flexDirection: 'row', justifyContent: 'space-between' },
  channelName: { fontSize: 13, color: C.title, fontWeight: '700' },
  channelValue: { fontSize: 12, color: C.muted },
  track: { height: 7, backgroundColor: C.mint, borderRadius: 4, overflow: 'hidden', marginTop: 9 },
  fill: { height: '100%', borderRadius: 4 },
  channelAmount: { fontSize: 11, color: C.muted, marginTop: 5 },
  footer: { fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 24 },
});

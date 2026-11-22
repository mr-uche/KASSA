import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import { useFocusEffect, useRouter } from 'expo-router';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { getOfflineSales, type OfflineCashRecord } from '@/components/kassa-demo/offline-cash';
import { useKassaConnectivity } from '@/components/kassa-demo/connectivity';
import { KScreen } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import { DropdownFilter } from '@/components/kassa-demo/dropdown-filter';
import {
  ScreenHeading, MetricGrid, ListHeading, SmallAction,
  RecordRow, InlineNotice, money,
} from '@/components/kassa-demo/business-ui';

type Period = 'Today' | 'Last 7 days' | 'All recent';
type Status = 'All statuses' | 'Successful' | 'Pending' | 'Failed';
const periods: Period[] = ['Today', 'Last 7 days', 'All recent'];
const statuses: Status[] = ['All statuses', 'Successful', 'Pending', 'Failed'];
const channels = ['All payments', 'Cash', 'Transfer', 'POS', 'Card', 'USSD', 'Wallet'];

function isTest(sale: CheckoutSale): boolean {
  return sale.payments.some(payment => payment.provider === 'PAYSTACK_TEST');
}
function state(sale: CheckoutSale): 'Successful' | 'Pending' | 'Failed' {
  if (sale.status === 'PAID' && sale.payments.some(payment => payment.status === 'SUCCEEDED')) return 'Successful';
  if (sale.payments.some(payment => payment.status === 'FAILED') || sale.status === 'FAILED') return 'Failed';
  return 'Pending';
}
function method(sale: CheckoutSale): string {
  const raw = sale.payments[0]?.channel;
  return ({ BANK_TRANSFER: 'Transfer', CASH: 'Cash', POS: 'POS', CARD: 'Card',
    USSD: 'USSD', WALLET: 'Wallet' } as Record<string, string>)[raw ?? ''] ?? 'Unknown';
}
/** Show the actual payment channel if this sale has no recorded customer. */
function transactionLabel(sale: CheckoutSale): string {
  const name = sale.customer?.trim();
  if (name && !/^(walk-in customer|customer details unavailable)$/i.test(name)) return name;
  const channel = method(sale);
  return channel === 'Transfer' ? 'Bank transfer'
    : channel === 'Unknown' ? 'Customer details unavailable' : channel;
}
function lagosDay(input: string | number | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(input));
  const value = (name: string) => parts.find(part => part.type === name)?.value ?? '00';
  return value('year') + '-' + value('month') + '-' + value('day');
}
function matchesDate(date: string, period: Period): boolean {
  if (period === 'All recent') return true;
  const time = Date.parse(date);
  if (!Number.isFinite(time)) return false;
  if (period === 'Today') return lagosDay(date) === lagosDay(new Date());
  return time >= Date.now() - 7 * 86400000;
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[char] ?? char);
}

export default function Transactions() {
  const session = useKassaSession();
  const router = useRouter();
  const { disconnected } = useKassaConnectivity();
  const { scope, user } = session;
  const [sales, setSales] = useState<CheckoutSale[]>([]);
  const [local, setLocal] = useState<OfflineCashRecord[]>([]);
  const [period, setPeriod] = useState<Period>('Today');
  const [status, setStatus] = useState<Status>('All statuses');
  const [channel, setChannel] = useState('All payments');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (alive: () => boolean = () => true) => {
    if (!scope || !user) return;
    if (alive()) { setLoading(true); setError(''); }
    try {
      const saved = await getOfflineSales({ userId: user.id, businessId: scope.businessId, branchId: scope.branchId });
      if (alive()) setLocal(saved.filter(item => item.status !== 'SYNCED'));
    } catch {
      if (alive()) setError('Cannot read the offline queue on this device.');
    }
    if (disconnected) {
      if (alive()) { setSales([]); setLoading(false); }
      return;
    }
    try {
      const query = 'businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId);
      const result = await session.request<CheckoutSale[]>('sales?' + query);
      if (!Array.isArray(result)) throw new Error('Unexpected transactions response.');
      if (alive()) setSales(result);
    } catch (cause) {
      if (alive()) {
        setSales([]);
        setError(cause instanceof Error ? cause.message : 'Unable to load transactions.');
      }
    } finally { if (alive()) setLoading(false); }
  }, [scope?.businessId, scope?.branchId, user?.id, disconnected, session.request]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    void refresh(() => alive);
    return () => { alive = false; };
  }, [refresh]));

  const scoped = useMemo(() => sales.filter(sale => matchesDate(sale.createdAt, period) && !isTest(sale)), [sales, period]);
  const visible = useMemo(() => scoped.filter(sale => {
    const text = transactionLabel(sale) + ' ' + sale.reference + ' ' + (sale.cashier ?? '') +
      ' ' + sale.items.map(item => item.name).join(' ');
    return (status === 'All statuses' || state(sale) === status) &&
      (channel === 'All payments' || method(sale) === channel) &&
      text.toLowerCase().includes(search.trim().toLowerCase());
  }), [scoped, status, channel, search]);
  const localVisible = local.filter(item => matchesDate(item.recordedAt, period) &&
    (!search.trim() || [item.customerName ?? '', item.id, ...item.items.map(row => row.name)]
      .some(value => value.toLowerCase().includes(search.trim().toLowerCase()))) &&
    (status === 'All statuses' || status === 'Pending') &&
    (channel === 'All payments' || ({ CASH: 'Cash', BANK_TRANSFER: 'Transfer', POS: 'POS', CARD: 'Card' } as Record<string,string>)[item.channel] === channel));
  const paid = scoped.filter(sale => state(sale) === 'Successful');
  const failed = scoped.filter(sale => state(sale) === 'Failed').length;
  const branchCount = session.scopes.filter(item => item.businessId === scope?.businessId).length;
  const amount = paid.reduce((sum, sale) => sum + Number(sale.total), 0);
  const exportRecent = async () => {
    // Include only transactions matching the current filters, with offline entries
    // explicitly marked as unconfirmed/queued rather than completed payments.
    const rows = [
      ...visible.map(sale => [
        sale.reference, new Date(sale.createdAt).toLocaleString('en-NG'),
        sale.customer?.trim() ?? '', sale.cashier ?? '', method(sale), state(sale), money(sale.total),
      ]),
      ...localVisible.map(item => [
        item.id, new Date(item.recordedAt).toLocaleString('en-NG'),
        item.customerName ?? '', '', method({ payments: [{ channel: item.channel }] } as CheckoutSale) + ' (offline)',
        item.status === 'REVIEW' ? 'Needs review' : 'Queued',
        money(item.total),
      ]),
    ];
    if (!rows.length) return;
    const headings = ['Reference', 'Date', 'Customer', 'Cashier', 'Payment', 'Status', 'Amount'];
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
      '<style>body{font-family:Arial,sans-serif;color:#172923;margin:25px}' +
      'h1{font-size:22px;color:#0F6E56}p{font-size:12px;color:#52645D}' +
      'table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed}' +
      'th,td{padding:9px 6px;border:1px solid #DCE7E2;word-wrap:break-word;text-align:left}' +
      'th{background:#EAF5F0}tr{page-break-inside:avoid}</style></head><body>' +
      '<h1>Kassa — Transactions</h1>' +
      '<p>Branch: ' + escapeHtml(scope?.branchName ?? '') + '</p>' +
      '<p>Filters: ' + escapeHtml([period, status, channel, search ? 'Search: ' + search : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<p>Exported from the transaction records currently loaded on this device. ' +
      'Queued or review-required offline sales are not confirmed online payments.</p>' +
      '<table><thead><tr>' + headings.map(item => '<th>' + escapeHtml(item) + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(row =>
        '<tr>' + row.map(value => '<td>' + escapeHtml(String(value)) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></body></html>';
    try {
      // Android supports "Save as PDF" in the system print destination picker.
      await Print.printAsync({ html });
    } catch {
      Alert.alert('Export unavailable', 'Could not open the system PDF save/print screen.');
    }
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Transactions" subtitle={scope?.branchName ?? 'Select your branch'}
      right={<SmallAction label="Refresh" secondary onPress={() => { void refresh(); }} disabled={loading}/>} />
    <View style={s.filterRow}>
      <DropdownFilter label="Payment channel" value={channel} options={channels} onChange={setChannel}/>
      <DropdownFilter label="Payment status" value={status} options={statuses}
        onChange={next => setStatus(next as Status)}/>
      <DropdownFilter label="Date range" value={period} options={periods}
        onChange={next => setPeriod(next as Period)}/>
    </View>
    <View style={s.searchExportRow}>
      <TextInput
        accessibilityLabel="Search customer or reference"
        autoCapitalize="none" autoCorrect={false}
        value={search} onChangeText={setSearch}
        placeholder="Search customer or reference" placeholderTextColor={C.faint}
        style={s.searchInput}
      />
      <SmallAction label="Export" onPress={() => { void exportRecent(); }}
        disabled={loading || (!visible.length && !localVisible.length)}/>
    </View>
    <MetricGrid items={[
      { label: 'Total received', value: money(amount), note: 'Recent confirmed sales' },
      { label: 'Successful', value: String(paid.length), note: 'Confirmed paid sales' },
      { label: 'Failed payments', value: String(failed), note: 'Needs attention', alert: failed > 0 },
      { label: 'Branches active', value: String(branchCount), note: 'Your accessible branches' },
    ]}/>
    {disconnected && <InlineNotice text="Connect internet to sync sales" warning/>}
    {!!localVisible.length && <>
      <ListHeading title="Waiting to sync" onPress={() => router.push('/cashier/offline-sales')}
        action="Review"/>
      {localVisible.map(item => <RecordRow key={item.id} title={item.customerName || item.items[0]?.name || 'Offline sale'}
        subtitle={item.channel.replaceAll('_', ' ') + ' · ' + new Date(item.recordedAt).toLocaleString('en-NG')}
        amount={money(item.total)} status={item.status === 'REVIEW' ? 'Needs review' : 'Queued'}
        tone="orange" onPress={() => router.push({ pathname: '/cashier/offline-receipt', params: { id: item.id } })}/>)}
    </>}
    <ListHeading title="Recent transactions" action="New sale"
      onPress={() => router.push('/cashier/new-sale')}/>
    {loading && <Text style={s.info}>Loading transactions…</Text>}
    {!!error && <InlineNotice text={error} warning/>}
    {!loading && !disconnected && !error && visible.length === 0 && <InlineNotice text="No transactions match these filters."/>}
    {visible.map(sale => {
      const current = state(sale);
      const count = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      return <RecordRow key={sale.id} title={transactionLabel(sale)}
        subtitle={method(sale) + ' · ' + new Date(sale.createdAt).toLocaleString('en-NG') +
          ' · ' + count + (count === 1 ? ' item' : ' items')}
        detail={'Cashier: ' + (sale.cashier ?? 'Not assigned')}
        amount={money(sale.total)} status={current}
        tone={current === 'Successful' ? 'green' : current === 'Failed' ? 'red' : 'orange'}
        onPress={() => router.push({ pathname: '/cashier/transaction-detail', params: { saleId: sale.id } })}/>;
    })}
    <Text style={s.footer}>Tap a row for transaction details and receipt options.</Text>
  </KScreen>;
}

const s = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  searchExportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white, borderRadius: 9, paddingHorizontal: 12, fontSize: 13, color: C.title },
  info: { color: C.muted, fontSize: 14, marginVertical: 16 },
  footer: { color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 23 },
});

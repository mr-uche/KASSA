import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { getOfflineSales, type OfflineCashRecord } from '@/components/kassa-demo/offline-cash';
import { useKassaConnectivity } from '@/components/kassa-demo/connectivity';
import { KScreen } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import {
  ScreenHeading, MetricGrid, ListHeading, SearchBox, Tabs, SmallAction,
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
function csvCell(text: string): string {
  // Escape spreadsheets as text; CSV consumers must not execute formula cells.
  const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
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
    const text = (sale.customer ?? '') + ' ' + sale.reference + ' ' + (sale.cashier ?? '') +
      ' ' + sale.items.map(item => item.name).join(' ');
    return (status === 'All statuses' || state(sale) === status) &&
      (channel === 'All payments' || method(sale) === channel) &&
      text.toLowerCase().includes(search.trim().toLowerCase());
  }), [scoped, status, channel, search]);
  const localVisible = local.filter(item => matchesDate(item.recordedAt, period) &&
    (!search.trim() || item.items.some(row => row.name.toLowerCase().includes(search.trim().toLowerCase()))) &&
    (status === 'All statuses' || status === 'Pending') &&
    (channel === 'All payments' || channel === 'Cash'));
  const paid = scoped.filter(sale => state(sale) === 'Successful');
  const failed = scoped.filter(sale => state(sale) === 'Failed').length;
  const branchCount = session.scopes.filter(item => item.businessId === scope?.businessId).length;
  const amount = paid.reduce((sum, sale) => sum + Number(sale.total), 0);
  const exportRecent = async () => {
    const rows = [['Reference', 'Date', 'Customer', 'Cashier', 'Payment', 'Status', 'Amount'],
      ...visible.map(sale => [sale.reference, sale.createdAt, sale.customer ?? '', sale.cashier ?? '',
        method(sale), state(sale), sale.total])];
    try { await Share.share({ message: rows.map(row => row.map(csvCell).join(',')).join('\n'), title: 'KASSA recent transactions' }); }
    catch { Alert.alert('Export unavailable', 'The transactions could not be shared.'); }
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Transactions" subtitle={scope?.branchName ?? 'Select your branch'}
      right={<SmallAction label="Refresh" secondary onPress={() => { void refresh(); }} disabled={loading}/>} />
    <Tabs options={periods} value={period} onChange={setPeriod}/>
    <View style={s.filterRow}>
      <View style={s.half}><Tabs options={statuses} value={status} onChange={setStatus}/></View>
    </View>
    <Tabs options={channels} value={channel} onChange={setChannel}/>
    <SearchBox value={search} onChangeText={setSearch} placeholder="Search customer or reference"/>
    <View style={s.exportRow}>
      <Text style={s.help}>Figures cover recent loaded records (up to 100), not lifetime totals.</Text>
      <SmallAction label="Export" secondary onPress={() => { void exportRecent(); }} disabled={!visible.length}/>
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
      {localVisible.map(item => <RecordRow key={item.id} title={item.items[0]?.name || 'Offline cash sale'}
        subtitle={'Cash · ' + new Date(item.recordedAt).toLocaleString('en-NG')}
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
      return <RecordRow key={sale.id} title={sale.customer && sale.customer !== 'Walk-in customer' ? sale.customer : 'Customer details unavailable'}
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
  filterRow: { flexDirection: 'row', alignItems: 'center' },
  half: { flex: 1 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  help: { color: C.muted, fontSize: 11, lineHeight: 16, flex: 1 },
  info: { color: C.muted, fontSize: 14, marginVertical: 16 },
  footer: { color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 23 },
});

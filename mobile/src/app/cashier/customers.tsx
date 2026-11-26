import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { KScreen } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import { DropdownFilter } from '@/components/kassa-demo/dropdown-filter';
import {
  ScreenHeading, MetricGrid, ListHeading, RecordRow, SearchBox, SmallAction,
  InlineNotice, money,
} from '@/components/kassa-demo/business-ui';

type Period = 'Today' | 'Last 7 days' | 'All recent';
type Status = 'All statuses' | 'Successful' | 'Pending' | 'Failed';
const periods: Period[] = ['Today', 'Last 7 days', 'All recent'];
const statuses: Status[] = ['All statuses', 'Successful', 'Pending', 'Failed'];
const channels = ['All payments', 'Cash', 'Bank transfer', 'POS', 'Card', 'USSD', 'Wallet'];

function paymentChannel(sale: CheckoutSale): string {
  const channel = sale.payments[0]?.channel;
  const labels: Record<string, string> = {
    CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', POS: 'POS', CARD: 'Card',
    USSD: 'USSD', WALLET: 'Wallet',
  };
  return labels[channel ?? ''] ?? 'Unknown';
}
function customerName(sale: CheckoutSale): string | null {
  const name = sale.customer?.trim();
  return name && !/^(walk-in customer|customer details unavailable)$/i.test(name) ? name : null;
}
function paymentStatus(sale: CheckoutSale): Exclude<Status, 'All statuses'> {
  if (sale.status === 'PAID' && sale.payments.some(item => item.status === 'SUCCEEDED')) return 'Successful';
  if (sale.status === 'FAILED' || sale.payments.some(item => item.status === 'FAILED')) return 'Failed';
  return 'Pending';
}
function dayInLagos(date: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(date));
  const part = (type: string) => parts.find(item => item.type === type)?.value || '00';
  return part('year') + '-' + part('month') + '-' + part('day');
}
function withinPeriod(date: string, period: Period): boolean {
  if (period === 'All recent') return true;
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp)) return false;
  if (period === 'Today') return dayInLagos(date) === dayInLagos(new Date());
  return timestamp >= Date.now() - 7 * 86400000;
}

export default function Customers() {
  const session = useKassaSession();
  const router = useRouter();
  const scope = session.scope;
  const [sales, setSales] = useState<CheckoutSale[]>([]);
  const [channel, setChannel] = useState('All payments');
  const [status, setStatus] = useState<Status>('All statuses');
  const [period, setPeriod] = useState<Period>('Last 7 days');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async (stillMounted: () => boolean = () => true) => {
    if (!scope) {
      if (stillMounted()) { setSales([]); setError('Select a branch to view transaction-linked customers.'); }
      return;
    }
    if (stillMounted()) { setLoading(true); setError(''); }
    try {
      // We use recorded transactions, not a separate or fabricated customer list.
      const result = await session.request<CheckoutSale[]>(
        'sales?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId),
      );
      if (!Array.isArray(result)) throw new Error('Unexpected sales response.');
      if (stillMounted()) setSales(result.filter(sale =>
        !sale.payments.some(payment => payment.provider === 'PAYSTACK_TEST')));
    } catch (cause) {
      if (stillMounted()) {
        setSales([]);
        setError(cause instanceof Error ? cause.message : 'Cannot load transaction history.');
      }
    } finally {
      if (stillMounted()) setLoading(false);
    }
  }, [scope?.businessId, scope?.branchId, session.request]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void reload(() => active);
    return () => { active = false; };
  }, [reload]));

  const filtered = useMemo(() => sales.filter(sale => {
    const name = customerName(sale);
    const payment = paymentChannel(sale);
    const searchText = [
      name ?? '', payment, sale.reference, sale.cashier ?? '',
      ...sale.items.map(item => item.name),
    ].join(' ').toLowerCase();
    return withinPeriod(sale.createdAt, period) &&
      (channel === 'All payments' || channel === payment) &&
      (status === 'All statuses' || status === paymentStatus(sale)) &&
      searchText.includes(query.trim().toLowerCase());
  }), [sales, channel, status, period, query]);

  const named = filtered.filter(sale => customerName(sale) != null).length;
  const unnamed = filtered.length - named;
  const paid = filtered.filter(sale => paymentStatus(sale) === 'Successful').length;

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Customers" subtitle="Customer information available from recorded transactions"
      right={<SmallAction label="Refresh" secondary disabled={loading}
        onPress={() => { void reload(); }}/>} />
    <View style={s.filters}>
      <DropdownFilter label="Payment channel" value={channel} options={channels} onChange={setChannel}/>
      <DropdownFilter label="Payment status" value={status} options={statuses}
        onChange={next => setStatus(next as Status)}/>
      <DropdownFilter label="Date range" value={period} options={periods}
        onChange={next => setPeriod(next as Period)}/>
    </View>
    <SearchBox value={query} onChangeText={setQuery} placeholder="Search customer or transaction reference"/>
    <MetricGrid items={[
      { label: 'Transactions', value: String(filtered.length), note: 'Matching recent records' },
      { label: 'Customer name available', value: String(named), note: 'Identity supplied with sale' },
      { label: 'Customer details unavailable', value: String(unnamed), note: 'Payment method shown instead' },
      { label: 'Successful payments', value: String(paid), note: 'Confirmed sales in this view' },
    ]}/>
    <InlineNotice text="KASSA shows customer details only when the transaction supplies them. Bank transfer or POS labels are payment methods, not verified customer identities."/>
    {loading && <Text style={s.loading}>Loading customer transactions…</Text>}
    {!!error && <InlineNotice warning text={error}/>}
    <ListHeading title="Customer transaction history" action={showAll ? 'Show less' : 'View all'}
      onPress={() => setShowAll(value => !value)}/>
    {!loading && !error && !filtered.length && <InlineNotice text="No transactions match these filters."/>}
    {(showAll ? filtered : filtered.slice(0, 12)).map(sale => {
      const name = customerName(sale);
      const payment = paymentChannel(sale);
      const state = paymentStatus(sale);
      const displayName = name ?? (payment === 'Unknown' ? 'Customer details unavailable' : payment);
      return <RecordRow key={sale.id} title={displayName}
        subtitle={payment + ' · ' + new Date(sale.createdAt).toLocaleString('en-NG')}
        detail={'Reference: ' + sale.reference}
        amount={money(sale.total)} status={state}
        tone={state === 'Successful' ? 'green' : state === 'Failed' ? 'red' : 'orange'}
        onPress={() => router.push({ pathname: '/cashier/transaction-detail', params: { saleId: sale.id } })}/>;
    })}
    <Text style={s.footer}>
      Records are limited to transactions currently returned for this branch. This is not a complete lifetime customer directory.
    </Text>
  </KScreen>;
}

const s = StyleSheet.create({
  filters: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  loading: { fontSize: 14, color: C.muted, paddingVertical: 12 },
  footer: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 18 },
});

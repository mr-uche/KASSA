import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

type DateFilter = 'Today' | 'This week' | 'All';
type TodaySummary = {
  today: { paidSales: number; amountReceived: string; testSales: number };
  scope: { businessId: string; branchId: string };
};

const filters: DateFilter[] = ['Today', 'This week', 'All'];

function lagosDay(value: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return get('year') + '-' + get('month') + '-' + get('day');
}

function startOfLagosWeek(): number {
  const [y, m, d] = lagosDay(new Date()).split('-').map(Number);
  const midnightUtc = Date.UTC(y, m - 1, d);
  const daysAfterMonday = (new Date(midnightUtc).getUTCDay() + 6) % 7;
  return midnightUtc - daysAfterMonday * 86400000 - 3600000;
}

function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString('en-NG', {
    hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos',
  });
}

function itemTitle(sale: CheckoutSale): string {
  if (!sale.items.length) return 'Sale ' + sale.reference.slice(-8).toUpperCase();
  const names = sale.items.map(item => item.name);
  return names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) + ' more' : '');
}

function channelLabel(channel?: string): string {
  const names: Record<string, string> = {
    CASH: 'Cash', BANK_TRANSFER: 'Transfer', CARD: 'Card',
    POS: 'POS', USSD: 'USSD', WALLET: 'Wallet',
  };
  return names[channel ?? ''] ?? 'Payment';
}

export default function Sales() {
  const router = useRouter();
  const session = useKassaSession();
  const { scope, user } = session;
  const [filter, setFilter] = useState<DateFilter>('Today');
  const [sales, setSales] = useState<CheckoutSale[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!scope || !user) {
      setSales([]);
      setSummary(null);
      setError('Sign in and select a branch to view your sales.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const query = '?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId);
      const [list, today] = await Promise.all([
        session.request<CheckoutSale[]>('sales/mine' + query),
        session.request<TodaySummary>('sales/dashboard' + query),
      ]);
      if (!Array.isArray(list) || !today?.today ||
          today.scope?.branchId !== scope.branchId || today.scope?.businessId !== scope.businessId) {
        throw new Error('Invalid response from the sales service.');
      }
      if (isCurrent()) {
        setSales(list);
        setSummary(today);
      }
    } catch (cause) {
      if (isCurrent()) {
        setSales([]);
        setSummary(null);
        setError(cause instanceof Error ? cause.message : 'Could not load sales.');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [scope?.businessId, scope?.branchId, user?.id, session.request]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refresh(() => active);
    return () => { active = false; };
  }, [refresh]));

  const visible = useMemo(() => {
    const today = lagosDay(new Date());
    const weekStart = startOfLagosWeek();
    return sales.filter(sale => {
      if (!sale.createdAt) return filter === 'All';
      const when = Date.parse(sale.createdAt);
      if (!Number.isFinite(when)) return filter === 'All';
      if (filter === 'Today') return lagosDay(sale.createdAt) === today;
      if (filter === 'This week') return when >= weekStart;
      return true;
    });
  }, [sales, filter]);

  const openSale = (sale: CheckoutSale) => {
    if (sale.status === 'PAID' && sale.payments.some(p => p.status === 'SUCCEEDED')) {
      router.push({ pathname: '/cashier/receipt', params: { saleId: sale.id } });
    } else {
      Alert.alert('Payment not completed',
        'This sale is still awaiting confirmed payment. Do not release goods based on a transfer screenshot or pending transaction.');
    }
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.heading}>My sales</Text>
        <Text style={s.subheading}>Your transactions · {scope?.branchName ?? 'Select branch'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh sales"
        onPress={() => { void refresh(); }} style={s.refreshButton}>
        <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} tintColor={C.green} size={20} />
      </Pressable>
    </View>

    <View style={s.summaryCard}>
      <View style={s.summaryColumn}>
        <Text style={s.summaryLabel}>Today's sales</Text>
        <Text style={s.summaryValue} adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1}>
          {summary ? naira(Number(summary.today.amountReceived)) : loading ? '…' : '—'}
        </Text>
      </View>
      <View style={s.summaryDivider} />
      <View style={s.summaryColumnRight}>
        <Text style={s.summaryLabel}>Transactions</Text>
        <Text style={s.summaryValue}>{summary ? summary.today.paidSales : loading ? '…' : '—'}</Text>
      </View>
    </View>
    {summary?.today.testSales ? (
      <Text style={s.testNote}>Revenue excludes Paystack test payments.</Text>
    ) : null}

    <View style={s.filters}>
      {filters.map(item => <Pressable
        key={item}
        accessibilityRole="button"
        accessibilityLabel={'Show ' + item.toLowerCase() + ' sales'}
        accessibilityState={{ selected: item === filter }}
        onPress={() => setFilter(item)}
        style={[s.filterPill, filter === item && s.filterSelected]}>
        <Text style={[s.filterText, filter === item && s.filterSelectedText]}>{item}</Text>
      </Pressable>)}
    </View>

    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>TRANSACTIONS</Text>
      <Text style={s.count}>{visible.length} shown</Text>
    </View>
    {loading && <Text style={s.info}>Loading your sales…</Text>}
    {error ? <View style={s.errorCard}>
      <Text style={s.errorText}>{error}</Text>
      <Pressable onPress={() => { void refresh(); }} accessibilityRole="button">
        <Text style={s.retry}>Retry</Text>
      </Pressable>
    </View> : null}
    {!loading && !error && visible.length === 0 && (
      <View style={s.emptyCard}><Text style={s.info}>No transactions for this period.</Text></View>
    )}

    {visible.map(sale => {
      const paid = sale.status === 'PAID' && sale.payments.some(p => p.status === 'SUCCEEDED');
      const pending = sale.status === 'PENDING_PAYMENT';
      const testMode = sale.payments.some(p => p.provider === 'PAYSTACK_TEST');
      const count = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      const channel = channelLabel(sale.payments[0]?.channel);
      return <Pressable key={sale.id} accessibilityRole="button"
        accessibilityLabel={'Sale ' + sale.reference + ', ' + (paid ? 'Paid' : pending ? 'Pending' : sale.status)}
        onPress={() => openSale(sale)}
        style={s.saleCard}>
        <View style={[s.saleIcon, !paid && s.pendingIcon]}>
          <SymbolView name={paid
            ? { ios: 'checkmark', android: 'check', web: 'check' }
            : { ios: 'clock', android: 'schedule', web: 'schedule' }}
            tintColor={paid ? C.green : C.orange} size={18} />
        </View>
        <View style={s.saleInfo}>
          <Text style={s.saleTitle} numberOfLines={2}>{itemTitle(sale)}</Text>
          <Text style={s.saleMeta} numberOfLines={2}>
            {channel}{testMode ? ' · TEST' : ''} · {timeLabel(sale.createdAt)} · {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={s.saleRight}>
          <Text style={s.saleAmount} numberOfLines={1}>{naira(Number(sale.total))}</Text>
          <View style={[s.statusPill, !paid && s.pendingPill]}>
            <Text style={[s.statusText, !paid && s.pendingStatusText]}>
              {paid ? (testMode ? 'Test paid' : 'Paid') : pending ? 'Pending' : sale.status.replaceAll('_', ' ')}
            </Text>
          </View>
        </View>
      </Pressable>;
    })}
    <Text style={s.footer}>
      {filter === 'Today' ? "Showing today's transactions" :
        filter === 'This week' ? "Showing this week's transactions" : 'Showing recent transactions'}
      {sales.length >= 100 ? ' · Latest 100 records' : ''}
    </Text>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  heading: { fontSize: 28, fontWeight: '800', color: C.title },
  subheading: { fontSize: 14, color: C.muted, marginTop: 4 },
  refreshButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { backgroundColor: C.green, borderRadius: 13, minHeight: 112, paddingHorizontal: 20, paddingVertical: 17, flexDirection: 'row', alignItems: 'center' },
  summaryColumn: { flex: 1.65 },
  summaryColumnRight: { flex: 0.75, paddingLeft: 12 },
  summaryDivider: { height: 58, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  summaryLabel: { fontSize: 14, color: '#D9F4EB', fontWeight: '600' },
  summaryValue: { fontSize: 27, color: C.white, fontWeight: '800', marginTop: 7 },
  testNote: { fontSize: 13, color: C.muted, marginTop: 7 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 21, marginBottom: 23 },
  filterPill: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 22, backgroundColor: C.white, borderColor: C.border, borderWidth: 1 },
  filterSelected: { backgroundColor: C.green, borderColor: C.green },
  filterText: { fontSize: 14, fontWeight: '700', color: C.text },
  filterSelectedText: { color: C.white },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, color: C.muted, fontWeight: '800', letterSpacing: 0.7 },
  count: { fontSize: 13, color: C.faint },
  saleCard: { backgroundColor: C.white, borderRadius: 12, borderColor: C.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  saleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  pendingIcon: { backgroundColor: '#FFF3E5' },
  saleInfo: { flex: 1, minWidth: 0 },
  saleTitle: { color: C.title, fontSize: 14, fontWeight: '800' },
  saleMeta: { color: C.muted, fontSize: 12, marginTop: 5, lineHeight: 17 },
  saleRight: { alignItems: 'flex-end', maxWidth: 96, gap: 7 },
  saleAmount: { color: C.title, fontWeight: '800', fontSize: 14 },
  statusPill: { backgroundColor: C.mint, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 4 },
  pendingPill: { backgroundColor: '#FFF2DC' },
  statusText: { color: C.green, fontWeight: '800', fontSize: 12 },
  pendingStatusText: { color: C.orange },
  emptyCard: { backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 20 },
  info: { fontSize: 14, color: C.muted, paddingVertical: 9 },
  errorCard: { borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.white, padding: 16 },
  errorText: { color: C.danger, fontSize: 14, lineHeight: 21 },
  retry: { color: C.green, fontWeight: '800', fontSize: 14, paddingTop: 10 },
  footer: { textAlign: 'center', color: C.faint, fontSize: 12, marginTop: 25, marginBottom: 5 },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Print from 'expo-print';
import { useKassaDemo, type CompletedPayment } from '@/components/kassa-demo/store';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { receiptHtml, receiptMethod, receiptText } from '@/components/kassa-demo/receipt-tools';

const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
});

function isConfirmed(sale: CheckoutSale): boolean {
  return sale.status === 'PAID' && sale.payments.some(payment => payment.status === 'SUCCEEDED');
}

function money(value: string | number): string {
  return naira(Number(value));
}

export default function Receipt() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId?: string }>();
  const store = useKassaDemo();
  const session = useKassaSession();
  const scope = session.scope;
  const [savedSale, setSavedSale] = useState<CheckoutSale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = store.completedPayment;
  const activeId = typeof saleId === 'string' ? saleId : null;

  const fetchSale = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!activeId) return;
    setSavedSale(null);
    setError('');
    if (!scope) {
      setError('Sign in to view this receipt.');
      return;
    }
    setLoading(true);
    try {
      const sale = await session.request<CheckoutSale>('sales/' + encodeURIComponent(activeId));
      if (sale.id !== activeId || sale.branchId !== scope.branchId || !isConfirmed(sale)) {
        throw new Error('A verified receipt is not available for this transaction.');
      }
      if (isCurrent()) setSavedSale(sale);
    } catch (cause) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Could not load receipt.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [activeId, scope?.branchId, session.request]);

  useEffect(() => {
    let active = true;
    void fetchSale(() => active);
    return () => { active = false; };
  }, [fetchSale]);

  const sale = activeId ? savedSale : current?.sale ?? null;
  const confirmed = !!sale && isConfirmed(sale);
  const detail: CompletedPayment | null = useMemo(() => {
    if (!sale || !confirmed) return null;
    if (!activeId && current?.sale.id === sale.id) return current;
    return { sale, cashReceived: null, change: 0 };
  }, [sale, confirmed, current, activeId]);
  const test = !!sale?.payments.some(payment => payment.provider === 'PAYSTACK_TEST');
  const channel = sale?.payments[0]?.channel ?? '';
  const cashReceived = detail?.cashReceived ?? null;
  const change = detail?.change ?? 0;
  const businessName = scope?.businessName ?? 'Kassa Business';
  const initials = businessName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(word => word[0].toUpperCase()).join('') || 'K';
  const safeAction = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Receipt action unavailable.'); }
  };

  if (!detail || !sale) {
    return <KScreen title="Receipt" subtitle={loading ? 'Loading verified receipt…' : 'Transaction receipt'}
      showBrand={false} showPreviewLabel={false} back>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {!loading && !error && <Text style={s.info}>No completed payment is selected.</Text>}
      {activeId && <Pressable onPress={() => { void fetchSale(); }} style={s.outline}>
        <Text style={s.outlineText}>Retry loading receipt</Text>
      </Pressable>}
      <Pressable onPress={() => router.replace('/cashier/sales')} style={s.button}>
        <Text style={s.buttonText}>Back to My sales</Text>
      </Pressable>
    </KScreen>;
  }

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={s.back}>
        <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
          size={21} tintColor={C.green}/>
      </Pressable>
      <View><Text style={s.title}>Receipt</Text><Text style={s.subtitle}>#{sale.reference.slice(-8).toUpperCase()}</Text></View>
    </View>

    <View style={s.paper}>
      <View style={s.businessHeader}>
        <View style={s.businessLogo}><Text style={s.businessInitials}>{initials}</Text></View>
        <Text style={s.businessName}>{businessName}</Text>
        <Text style={s.address}>{scope?.branchName ?? 'Main branch'}
          {scope?.branchAddress ? ' · ' + scope.branchAddress : ''}</Text>
      </View>

      <View style={s.rule} />
      <View style={s.detailRow}><Text style={s.label}>Receipt no.</Text><Text style={s.valueSmall} numberOfLines={2}>{sale.reference}</Text></View>
      <View style={s.detailRow}><Text style={s.label}>Date & time</Text><Text style={s.valueSmall}>{dateFormatter.format(new Date(sale.createdAt))}</Text></View>
      <View style={s.detailRow}><Text style={s.label}>Served by</Text><Text style={s.valueSmall}>{sale.cashier ?? session.user?.fullName ?? 'Cashier'}</Text></View>
      <View style={s.detailRow}><Text style={s.label}>Customer</Text><Text style={s.valueSmall}>{sale.customer || 'Walk-in customer'}</Text></View>
      {test && <Text style={s.warning}>PAYSTACK TEST MODE — Not a live payment</Text>}

      <View style={s.rule} />
      <View style={s.tableHead}>
        <Text style={[s.tableLabel, { flex: 1 }]}>ITEM</Text>
        <Text style={s.tableLabel}>QTY</Text>
        <Text style={[s.tableLabel, s.columnPrice]}>AMOUNT</Text>
      </View>
      {sale.items.map(item => <View key={item.id} style={s.itemRow}>
        <Text style={[s.itemName, { flex: 1 }]}>{item.name}</Text>
        <Text style={s.qty}>{item.quantity}</Text>
        <Text style={[s.itemName, s.columnPrice]}>{money(item.lineTotal)}</Text>
      </View>)}
      <View style={s.rule}/>
      <View style={s.detailRow}><Text style={s.label}>Subtotal</Text><Text style={s.valueSmall}>{money(sale.subtotal)}</Text></View>
      <View style={s.detailRow}><Text style={s.label}>Payment method</Text><Text style={s.valueSmall}>{receiptMethod(channel)}</Text></View>
      {cashReceived !== null && <>
        <View style={s.detailRow}><Text style={s.label}>Cash received</Text><Text style={s.valueSmall}>{money(cashReceived)}</Text></View>
        <View style={s.detailRow}><Text style={s.label}>Change given</Text><Text style={s.valueSmall}>{money(change)}</Text></View>
      </>}
      <View style={s.rule}/>
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total paid</Text>
        <Text style={s.totalValue}>{money(sale.total)}</Text>
      </View>
      <View style={s.referenceBox}>
        <SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
          tintColor={C.green} size={26}/>
        <View style={{ flex: 1 }}>
          <Text style={s.verified}>Payment verified</Text>
          <Text style={s.referenceShort} numberOfLines={2}>{sale.reference}</Text>
        </View>
      </View>
      <Text style={s.thankYou}>Thank you for shopping with us!</Text>
    </View>

    {error ? <Text style={s.error}>{error}</Text> : null}
    <View style={s.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Share receipt" style={s.outline}
        onPress={() => { void safeAction(() => Share.share({ message: receiptText(detail) })); }}>
        <SymbolView name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
          tintColor={C.green} size={19}/>
        <Text style={s.outlineText}>Share receipt</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="New sale" style={s.button}
        onPress={() => { store.beginNewSale(); router.replace('/cashier/new-sale'); }}>
        <Text style={s.buttonText}>New sale</Text>
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" style={s.printButton}
      onPress={() => { void safeAction(() => Print.printAsync({ html: receiptHtml(detail) })); }}>
      <SymbolView name={{ ios: 'printer', android: 'print', web: 'print' }} tintColor={C.green} size={17}/>
      <Text style={s.printText}>Print receipt</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  back: { backgroundColor: C.mint, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 27, color: C.title, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 3 },
  paper: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 17 },
  businessHeader: { alignItems: 'center', paddingVertical: 7 },
  businessLogo: { backgroundColor: C.mint, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  businessInitials: { color: C.green, fontWeight: '800', fontSize: 18 },
  businessName: { color: C.title, fontWeight: '800', fontSize: 17, marginTop: 8, textAlign: 'center' },
  address: { color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  rule: { height: 1, borderTopWidth: 1, borderTopColor: '#E8EDF0', marginVertical: 13, borderStyle: 'dashed' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingVertical: 5 },
  label: { color: C.muted, fontSize: 12, flex: 1 },
  valueSmall: { color: C.title, fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1.3 },
  warning: { fontSize: 12, color: C.orange, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, gap: 7 },
  tableLabel: { fontSize: 11, color: C.muted, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 7 },
  itemName: { fontSize: 12, color: C.title, fontWeight: '700' },
  qty: { fontSize: 12, width: 27, textAlign: 'center', color: C.muted },
  columnPrice: { width: 90, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: C.title },
  totalValue: { fontSize: 24, fontWeight: '800', color: C.green },
  referenceBox: { backgroundColor: '#F3F8F6', borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
  verified: { color: C.green, fontWeight: '800', fontSize: 12 },
  referenceShort: { color: C.muted, fontSize: 11, marginTop: 3 },
  thankYou: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 13 },
  info: { color: C.muted, fontSize: 14, lineHeight: 20 },
  error: { color: C.danger, fontSize: 14, marginVertical: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, backgroundColor: C.green, minHeight: 49, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, flexDirection: 'row' },
  buttonText: { color: C.white, fontSize: 14, fontWeight: '800' },
  outline: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, minHeight: 49, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, flexDirection: 'row', gap: 7 },
  outlineText: { color: C.green, fontSize: 14, fontWeight: '800' },
  printButton: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  printText: { color: C.green, fontWeight: '700', fontSize: 14 },
});

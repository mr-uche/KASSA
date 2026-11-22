import React, { useCallback, useMemo, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useKassaSession, type CatalogItem } from '@/components/kassa-demo/api';
import { C, naira, toKobo } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import {
  cacheOfflineCatalog, getOfflineSales, loadOfflineCatalogue,
  recordOfflineSale, syncOfflineCash,
  type CachedProduct, type OfflineCashRecord, type OfflineScope, type OfflinePaymentChannel,
} from '@/components/kassa-demo/offline-cash';

export default function OfflineSales() {
  const session = useKassaSession();
  const router = useRouter();
  const { savedRef } = useLocalSearchParams<{ savedRef?: string }>();
  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<OfflineCashRecord[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [cash, setCash] = useState('');
  const [method, setMethod] = useState<OfflinePaymentChannel>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [merchantChecked, setMerchantChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const scope: OfflineScope | null = session.user && session.scope ? {
    userId: session.user.id,
    businessId: session.scope.businessId,
    branchId: session.scope.branchId,
  } : null;

  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!scope) return;
    try {
      const [cached, records] = await Promise.all([
        loadOfflineCatalogue(scope), getOfflineSales(scope),
      ]);
      if (isCurrent()) {
        setProducts(cached.products);
        setCachedAt(cached.savedAt);
        setHistory(records);
      }
    } catch (cause) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Offline data unavailable.');
    }
  }, [scope?.userId, scope?.businessId, scope?.branchId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setSelected({});
    setCash('');
    setMethod('CASH');
    setCustomerName('');
    setMerchantChecked(false);
    void load(() => active);
    const attemptSync = async () => {
      if (!scope || !active) return;
      try {
        const records = await getOfflineSales(scope);
        if (!active || !records.some(item => item.status === 'QUEUED')) return;
        const result = await syncOfflineCash(scope, session.request);
        if (!active) return;
        if (result.synced) {
          try {
            const fresh = await session.request<CatalogItem[]>(
              'sales/catalog?businessId=' + encodeURIComponent(scope.businessId) +
              '&branchId=' + encodeURIComponent(scope.branchId));
            await cacheOfflineCatalog(scope, fresh);
          } catch { /* A later refresh retries the catalogue. */ }
        }
        await load(() => active);
      } catch {
        // Offline is expected: keep the immutable local queue for next attempt.
      }
    };
    void attemptSync();
    const timer = setInterval(() => { void attemptSync(); }, 60000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void attemptSync();
    });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [load, scope?.userId, scope?.businessId, scope?.branchId, session.request]));

  const displayed = useMemo(() => {
    const value = query.trim().toLowerCase();
    return products.filter(item => !value ||
      [item.name, item.sku, item.barcode ?? ''].some(text => text.toLowerCase().includes(value)));
  }, [products, query]);

  const count = Object.values(selected).reduce((sum, n) => sum + n, 0);
  const total = products.reduce((sum, item) =>
    sum + toKobo(Number(item.price)) * (selected[item.id] ?? 0), 0) / 100;
  const cashText = cash.replace(/,/g, '').trim();
  const validMoney = /^(?:0|[1-9][0-9]{0,11})(?:[.][0-9]{1,2})?$/.test(cashText);
  const received = validMoney ? Number(cashText) : 0;
  const validCash = count > 0 && validMoney && Number.isSafeInteger(toKobo(received)) &&
    toKobo(received) >= toKobo(total);
  const validPayment = method === 'CASH' ? validCash : count > 0 && merchantChecked;
  const outdated = !cachedAt || Date.now() - cachedAt > 48 * 60 * 60 * 1000;
  const pending = history.filter(item => item.status === 'QUEUED');
  const reviews = history.filter(item => item.status === 'REVIEW');

  const refreshCatalogue = async () => {
    if (!scope || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const catalog = await session.request<CatalogItem[]>(
        'sales/catalog?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId));
      if (!Array.isArray(catalog)) throw new Error('Invalid catalogue returned.');
      await cacheOfflineCatalog(scope, catalog);
      setSelected({});
      await load();
      setNotice('Latest prices and stock are saved on this phone for this cashier and branch.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connect to the internet before refreshing products.');
    } finally { setBusy(false); }
  };

  const record = async () => {
    if (!scope || !validPayment || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const items = Object.entries(selected)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));
      const sale = await recordOfflineSale(scope, items, method,
        method === 'CASH' ? received : total, customerName);
      setSelected({});
      setCash(''); setCustomerName(''); setMerchantChecked(false);
      await load();
      setNotice(method + ' recorded on THIS phone: ' + naira(Number(sale.total)) +
        '. Local reference: ' + sale.id.slice(0, 8).toUpperCase() +
        '. Awaiting sync. Do not collect this payment again.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save offline sale. Check the queue before retrying.');
    } finally { setBusy(false); }
  };

  const sync = async (review = false) => {
    if (!scope || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await syncOfflineCash(scope, session.request, review);
      if (result.synced) {
        try {
          const catalog = await session.request<CatalogItem[]>(
            'sales/catalog?businessId=' + encodeURIComponent(scope.businessId) +
            '&branchId=' + encodeURIComponent(scope.branchId));
          await cacheOfflineCatalog(scope, catalog);
        } catch { /* The queue still has server-confirmed results. */ }
      }
      await load();
      setNotice(result.synced + ' synced, ' + result.review +
        ' need reconciliation, ' + result.remaining + ' unsynced.');
      if (result.remaining && !result.synced) setError('Some sales remain on this phone. Check internet and review the queue.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sync failed. No records were deleted.');
    } finally { setBusy(false); }
  };

  const confirm = () => {
    if (!validPayment || busy) return;
    Alert.alert('Confirm merchant payment received',
      'Confirm ' + naira(method === 'CASH' ? received : total) + ' was received by the business via ' + method +
      '. For bank transfers and POS, check merchant bank credit or terminal records, not the customer screenshot. ' +
      'The sale stays on this device until synced. Do not collect payment twice.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Payment received — save', onPress: () => { void record(); } },
      ]);
  };

  const updateQty = (item: CachedProduct, delta: number) => {
    setSelected(previous => ({
      ...previous,
      [item.id]: Math.max(0, Math.min(item.stock, (previous[item.id] ?? 0) + delta)),
    }));
  };

  if (!scope) return <KScreen title="Offline sales" back showBrand={false} showPreviewLabel={false}>
    <Text style={s.info}>Sign in online and choose a branch before recording offline sales.</Text>
  </KScreen>;

  return <KScreen showBrand={false} showPreviewLabel={false} back>
    <Text style={s.title}>Offline sales</Text>
    <Text style={s.info}>{session.scope?.branchName} · Cash, bank transfer and POS</Text>
    <View style={s.banner}>
      <Text style={s.bannerTitle}>Saved locally until verified</Text>
      <Text style={s.info}>Payments are recorded on this phone until synced. Cashiers must check bank/POS receipts from the merchant side. Reconnect and sync within 8 days.</Text>
    </View>
    <View style={s.stats}>
      <View style={s.stat}><Text style={s.number}>{pending.length}</Text><Text style={s.info}>Queued</Text></View>
      <View style={s.stat}><Text style={s.number}>{reviews.length}</Text><Text style={s.info}>Needs review</Text></View>
    </View>
    <Text style={s.info}>Stock last cached: {cachedAt ? new Date(cachedAt).toLocaleString('en-NG') : 'Not available'}</Text>
    {outdated && <Text style={s.error}>Connect and refresh: offline stock must be less than 48 hours old.</Text>}
    <View style={s.actions}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void refreshCatalogue(); }} style={s.outline}>
        <Text style={s.outlineText}>Refresh stock</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy || (!pending.length && !reviews.length)}
        onPress={() => { void sync(); }} style={s.primary}>
        <Text style={s.primaryText}>Sync queued</Text>
      </Pressable>
    </View>
    {reviews.length > 0 && <Pressable accessibilityRole="button" style={s.review}
      onPress={() => Alert.alert('Owner reconciliation needed',
        'These payments were already collected. Review inventory or price conflicts with your manager before retrying.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry reviewed sales', onPress: () => { void sync(true); } },
        ])}><Text style={s.reviewText}>{reviews.length} sale(s) need reconciliation</Text></Pressable>}
    {typeof savedRef === 'string' && <View style={s.banner}>
      <Text style={s.bannerTitle}>Sale saved on this phone</Text>
      <Text style={s.info}>Local reference #{savedRef.slice(0, 8).toUpperCase()}. This is not yet a cloud-confirmed sale. Your record remains below until synchronized.</Text>
    </View>}
    <Pressable accessibilityRole="button" onPress={() => router.push('/cashier/scan-product')}
      style={s.scanEntry}>
      <Text style={s.scanEntryText}>Scan a barcode in New Sale (works offline)</Text>
    </Pressable>
    {notice ? <Text style={s.notice}>{notice}</Text> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}

    <Text style={s.heading}>New offline sale</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search saved products / barcode"
      placeholderTextColor={C.faint} style={s.input}/>
    {!products.length && <Text style={s.info}>Connect online and use Refresh stock before your first offline sale.</Text>}
    {displayed.slice(0, 80).map(item => <View key={item.id} style={s.product}>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.info}>{naira(Number(item.price))} · {item.stock} locally available</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => updateQty(item, -1)}
        disabled={!selected[item.id] || busy} style={s.qtyButton}><Text style={s.qtyText}>−</Text></Pressable>
      <Text style={s.qty}>{selected[item.id] ?? 0}</Text>
      <Pressable accessibilityRole="button" onPress={() => updateQty(item, 1)}
        disabled={outdated || busy || (selected[item.id] ?? 0) >= item.stock}
        style={s.qtyButton}><Text style={s.qtyText}>+</Text></Pressable>
    </View>)}

    <View style={s.checkout}>
      <View style={s.totalRow}><Text style={s.heading}>{count} items</Text><Text style={s.total}>{naira(total)}</Text></View>
      <Text style={s.name}>Customer name (optional)</Text>
      <TextInput value={customerName} onChangeText={setCustomerName} maxLength={120}
        placeholder="Customer name" placeholderTextColor={C.faint} style={s.input}/>
      <Text style={[s.name, { marginTop: 13 }]}>Payment method</Text>
      <View style={s.methodRow}>
        {(['CASH', 'BANK_TRANSFER', 'POS', 'CARD'] as const).map(value =>
          <Pressable key={value} accessibilityRole="button"
            accessibilityState={{ selected: method === value }}
            onPress={() => { setMethod(value); setMerchantChecked(false); }}
            style={[s.methodChip, method === value && s.methodSelected]}>
            <Text style={[s.methodText, method === value && s.methodTextSelected]}>
              {value === 'BANK_TRANSFER' ? 'Transfer' : value}
            </Text>
          </Pressable>)}
      </View>
      {method === 'CASH' ? <>
        <Text style={s.name}>Cash actually received (₦)</Text>
        <TextInput value={cash} onChangeText={setCash} keyboardType="decimal-pad"
          placeholder="Enter cash received" placeholderTextColor={C.faint} style={s.input}/>
        {validCash && <Text style={s.info}>Change: {naira((toKobo(received) - toKobo(total)) / 100)}</Text>}
      </> : <Pressable accessibilityRole="checkbox"
        accessibilityState={{ checked: merchantChecked }}
        onPress={() => setMerchantChecked(value => !value)} style={s.checkRow}>
        <Text style={s.name}>{merchantChecked ? '☑' : '☐'} I checked the merchant bank credit or successful terminal record.</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" disabled={busy || outdated || !validPayment}
        onPress={confirm} style={[s.primary, { marginTop: 15 }, (busy || outdated || !validPayment) && { opacity: 0.5 }]}>
        <Text style={s.primaryText}>{busy ? 'Saving…' : 'Confirm payment received and save'}</Text>
      </Pressable>
    </View>
    <Text style={s.heading}>Recent offline records</Text>
    {!history.length && <Text style={s.info}>No offline sales on this phone.</Text>}
    {history.slice(0, 25).map(item => <Pressable key={item.id} style={s.record}
      accessibilityRole="button" accessibilityLabel={'View local receipt ' + item.id.slice(0, 8)}
      onPress={() => router.push({ pathname: '/cashier/offline-receipt', params: { id: item.id } })}>
      <View style={{ flex: 1 }}><Text style={s.name}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={s.info}>{new Date(item.recordedAt).toLocaleString('en-NG')} · {item.channel} · {item.status}</Text>
        {!!item.customerName && <Text style={s.info}>Customer: {item.customerName}</Text>
        {item.error ? <Text style={s.error}>{item.error}</Text> : null}
        <Text style={s.scanEntryText}>View receipt</Text></View>
      <Text style={s.name}>{naira(Number(item.total))}</Text>
    </Pressable>)}
    <Text style={s.info}>Offline sales support a previously signed-in cashier with recent cached stock. Keep this phone and local data safe until all sales are synchronized.</Text>
  </KScreen>;
}

const s = StyleSheet.create({
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9, marginBottom: 13 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: C.border },
  methodSelected: { backgroundColor: C.green, borderColor: C.green },
  methodText: { color: C.text, fontSize: 13, fontWeight: '700' },
  methodTextSelected: { color: C.white },
  checkRow: { backgroundColor: C.mint, padding: 12, borderRadius: 9 },
  title: { fontSize: 28, color: C.title, fontWeight: '800', marginBottom: 5 },
  heading: { fontSize: 20, color: C.title, fontWeight: '800', marginTop: 23, marginBottom: 13 },
  info: { color: C.muted, fontSize: 14, lineHeight: 21 },
  banner: { backgroundColor: '#FFF7EB', borderColor: '#F8D8AD', borderWidth: 1, borderRadius: 11, padding: 14, marginTop: 19 },
  bannerTitle: { color: C.orange, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 19, marginBottom: 13 },
  stat: { flex: 1, backgroundColor: C.white, padding: 15, borderColor: C.border, borderWidth: 1, borderRadius: 11 },
  number: { fontSize: 25, fontWeight: '800', color: C.green },
  actions: { flexDirection: 'row', gap: 11, marginTop: 14 },
  scanEntry: { padding: 13, borderRadius: 9, borderWidth: 1, borderColor: C.green, marginTop: 15 },
  scanEntryText: { color: C.green, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  outline: { flex: 1, borderWidth: 1, borderColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: C.white },
  outlineText: { color: C.green, fontSize: 14, fontWeight: '800' },
  primary: { flex: 1, backgroundColor: C.green, borderRadius: 10, minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: C.white, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  review: { padding: 14, backgroundColor: '#FFF7EB', borderRadius: 9, marginTop: 13 },
  reviewText: { color: C.orange, fontWeight: '800', fontSize: 14 },
  notice: { color: C.greenDark, fontSize: 14, marginVertical: 13 },
  error: { color: C.danger, fontSize: 14, marginVertical: 10, lineHeight: 20 },
  input: { marginTop: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 9, fontSize: 14, color: C.title, minHeight: 50, paddingHorizontal: 12 },
  product: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: C.title, fontWeight: '700', fontSize: 14 },
  qtyButton: { backgroundColor: C.mint, borderRadius: 7, width: 32, height: 34, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 20, fontWeight: '800', color: C.green, textAlign: 'center' },
  qty: { fontSize: 14, fontWeight: '800', color: C.title, width: 20, textAlign: 'center' },
  checkout: { marginTop: 18, padding: 15, borderColor: C.border, borderWidth: 1, backgroundColor: C.white, borderRadius: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { color: C.green, fontSize: 23, fontWeight: '800' },
  record: { flexDirection: 'row', gap: 10, backgroundColor: C.white, borderColor: C.border, borderBottomWidth: 1, padding: 11 },
});

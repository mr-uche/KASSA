import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import { SymbolView } from 'expo-symbols';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { useKassaDemo, type CompletedPayment } from '@/components/kassa-demo/store';
import { getOfflineSales, type OfflineCashRecord } from '@/components/kassa-demo/offline-cash';
import { C, naira, toKobo } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { exportReceiptPdf, receiptHtml, receiptMethod, receiptText } from '@/components/kassa-demo/receipt-tools';
import { receiptQrDataUrl } from '@/components/kassa-demo/receipt-qr';

const date = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
});

// Reuse the same receipt contract as an online sale; reconciliation state
// belongs to the merchant's local queue, not customer-facing receipts.
function localPayment(record: OfflineCashRecord, branchId: string): CompletedPayment {
  const total = Number(record.total);
  const received = Number(record.cashReceived);
  const sale: CheckoutSale = {
    id: record.id,
    reference: 'KSO-' + record.id.replace(/-/g, ''),
    createdAt: record.recordedAt,
    status: 'PAID',
    total: record.total,
    subtotal: record.subtotal,
    discount: record.discount,
    currency: 'NGN',
    branchId,
    customer: record.customerName ?? undefined,
    items: record.items.map((item, index) => ({
      id: String(index) + '-' + item.productId,
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: (toKobo(Number(item.unitPrice)) * item.quantity / 100).toFixed(2),
    })),
    payments: [{
      channel: record.channel,
      status: 'SUCCEEDED',
      confirmedAt: record.recordedAt,
      provider: record.channel === 'CASH' ? 'OFFLINE_CASH' : 'OFFLINE_MERCHANT_ATTESTED',
    }],
  };
  return {
    sale,
    cashReceived: record.channel === 'CASH' ? received : null,
    change: record.channel === 'CASH' ? (toKobo(received) - toKobo(total)) / 100 : 0,
  };
}

export default function OfflineReceipt() {
  const { user, scope } = useKassaSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <OfflineReceiptContent key={JSON.stringify([user?.id, scope?.businessId, scope?.branchId, id])}/>;
}

function OfflineReceiptContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useKassaSession();
  const store = useKassaDemo();
  const [record, setRecord] = useState<OfflineCashRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (active: () => boolean = () => true) => {
    if (!id || !session.scope || !session.user) {
      setError('Sign in with the original cashier account to view this receipt.');
      return;
    }
    try {
      const rows = await getOfflineSales({
        userId: session.user.id,
        businessId: session.scope.businessId,
        branchId: session.scope.branchId,
      });
      const found = rows.find(row => row.id === id);
      if (!found) throw new Error('This sale was not found on this phone.');
      if (active()) { setRecord(found); setError(''); }
    } catch (cause) {
      if (active()) { setRecord(null); setError(cause instanceof Error ? cause.message : 'Could not open the receipt.'); }
    }
  }, [id, session.user, session.scope]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void reload(() => active);
    return () => { active = false; };
  }, [reload]));
  const payment = useMemo(() => record && session.scope
    ? localPayment(record, session.scope.branchId) : null,
    [record, session.scope]);
  const qr = useMemo(() => payment ? receiptQrDataUrl(payment.sale) : null, [payment]);
  const business = session.scope?.businessName || 'KASSA';
  const initials = business.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(word => word[0].toUpperCase()).join('') || 'K';

  async function downloadPdf() {
    if (!payment || busy) return;
    setBusy(true); setError('');
    try { await exportReceiptPdf(payment); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the receipt PDF.'); }
    finally { setBusy(false); }
  }
  async function print() {
    if (!payment || busy) return;
    setBusy(true); setError('');
    try { await Print.printAsync({ html: receiptHtml(payment) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not print the receipt.'); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!payment || busy) return;
    setBusy(true); setError('');
    try { await Share.share({ message: receiptText(payment) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not share receipt.'); }
    finally { setBusy(false); }
  }

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back"
        onPress={() => router.back()} style={s.back}>
        <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
          tintColor={C.green} size={21}/>
      </Pressable>
      <Text style={s.title}>Receipt</Text>
    </View>
    {error ? <Text style={s.error}>{error}</Text> : null}
    {!record && <Pressable accessibilityRole="button" onPress={() => { void reload(); }}>
      <Text style={s.action}>Retry loading receipt</Text>
    </Pressable>}
    {record && payment && <>
      <View style={s.paper}>
        <View style={s.businessHeader}>
          <View style={s.businessLogo}><Text style={s.businessInitials}>{initials}</Text></View>
          <Text style={s.businessName}>{business}</Text>
          <Text style={s.address}>{session.scope?.branchName ?? 'Main branch'}
            {session.scope?.branchAddress ? ' · ' + session.scope.branchAddress : ''}</Text>
        </View>
        <View style={s.rule}/>
        <View style={s.row}><Text style={s.label}>Receipt no.</Text>
          <Text style={s.smallValue} selectable numberOfLines={2}>{payment.sale.reference}</Text></View>
        <View style={s.row}><Text style={s.label}>Date & time</Text>
          <Text style={s.smallValue}>{date.format(new Date(record.recordedAt))}</Text></View>
        {!!record.customerName && <View style={s.row}><Text style={s.label}>Customer</Text>
          <Text style={s.smallValue}>{record.customerName}</Text></View>}
        <View style={s.rule}/>
        <View style={s.tableHead}><Text style={[s.tableLabel, s.itemName]}>ITEM</Text>
          <Text style={[s.tableLabel, s.qty]}>QTY</Text>
          <Text style={[s.tableLabel, s.amount]}>AMOUNT</Text></View>
        {payment.sale.items.map(item => <View key={item.id} style={s.itemRow}>
          <Text style={[s.itemText, s.itemName]}>{item.name}</Text>
          <Text style={[s.itemText, s.qty]}>{item.quantity}</Text>
          <Text style={[s.itemText, s.amount]}>{naira(Number(item.lineTotal))}</Text>
        </View>)}
        <View style={s.rule}/>
        <View style={s.row}><Text style={s.label}>Subtotal</Text>
          <Text style={s.value}>{naira(Number(record.subtotal))}</Text></View>
        {Number(record.discount) > 0 && <View style={s.row}><Text style={s.label}>Discount</Text>
          <Text style={s.value}>−{naira(Number(record.discount))}</Text></View>}
        <View style={s.row}><Text style={s.label}>Payment method</Text>
          <Text style={s.value}>{receiptMethod(record.channel)}</Text></View>
        {payment.cashReceived !== null && <>
          <View style={s.row}><Text style={s.label}>Cash received</Text>
            <Text style={s.value}>{naira(payment.cashReceived)}</Text></View>
          <View style={s.row}><Text style={s.label}>Change given</Text>
            <Text style={s.value}>{naira(payment.change)}</Text></View>
        </>}
        <View style={s.rule}/>
        <View style={s.row}><Text style={s.totalLabel}>Total paid</Text>
          <Text style={s.total}>{naira(Number(record.total))}</Text></View>
        {!!qr && <View style={s.qrBlock}>
          <Image source={{ uri: qr }} accessibilityLabel="Receipt reference QR code"
            contentFit="contain" style={s.qrImage}/>
          <View style={s.qrText}>
            <Text style={s.qrTitle}>Scan for receipt details</Text>
            <Text style={s.reference} numberOfLines={2}>{payment.sale.reference}</Text>
            <Text style={s.qrHint}>Reference only. Confirm payments with the merchant.</Text>
          </View>
        </View>}
        <Text style={s.footer}>Thank you for shopping with us!</Text>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void downloadPdf(); }} style={s.primary}>
        <Text style={s.primaryText}>{busy ? 'Working…' : 'Download PDF'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void print(); }} style={s.secondary}>
        <Text style={s.secondaryText}>Print receipt</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void share(); }} style={s.secondary}>
        <Text style={s.secondaryText}>Share receipt</Text>
      </Pressable>
    </>}
    <Pressable accessibilityRole="button" onPress={() => {
      store.beginNewSale();
      router.replace('/cashier/new-sale');
    }} style={s.secondary}>
      <Text style={s.secondaryText}>New sale</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  back: { width: 27, height: 32, justifyContent: 'center' },
  title: { color: C.title, fontSize: 26, fontWeight: '800' },
  paper: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 13, padding: 16, marginBottom: 18 },
  businessHeader: { alignItems: 'center', paddingVertical: 7 },
  businessLogo: { height: 45, width: 45, borderRadius: 23, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center' },
  businessInitials: { color: C.green, fontSize: 18, fontWeight: '800' },
  businessName: { color: C.title, fontSize: 21, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  address: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 5 },
  rule: { borderBottomColor: C.border, borderBottomWidth: 1, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 10, paddingVertical: 6 },
  label: { color: C.muted, fontSize: 13, flexShrink: 0 },
  smallValue: { color: C.title, fontSize: 13, fontWeight: '700',
    textAlign: 'right', flex: 1 },
  value: { color: C.title, fontSize: 14, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  tableHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tableLabel: { color: C.muted, fontSize: 12, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
  itemName: { flex: 1 },
  itemText: { color: C.title, fontSize: 14 },
  qty: { width: 35, textAlign: 'center' },
  amount: { width: 91, textAlign: 'right' },
  totalLabel: { color: C.title, fontWeight: '800', fontSize: 16 },
  total: { color: C.green, fontWeight: '800', fontSize: 21 },
  qrBlock: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: C.border,
    marginTop: 18, paddingTop: 14, alignItems: 'center' },
  qrImage: { width: 102, height: 102 },
  qrText: { flex: 1 },
  qrTitle: { color: C.title, fontSize: 14, fontWeight: '800' },
  reference: { fontSize: 11, color: C.green, marginVertical: 6 },
  qrHint: { fontSize: 11, color: C.muted, lineHeight: 17 },
  footer: { textAlign: 'center', marginTop: 18, color: C.muted, fontSize: 13 },
  error: { color: C.danger, fontSize: 14, marginBottom: 13 },
  action: { color: C.green, fontWeight: '800', fontSize: 14 },
  primary: { backgroundColor: C.green, borderRadius: 9,
    minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  primaryText: { color: C.white, fontSize: 14, fontWeight: '800' },
  secondary: { borderRadius: 9, borderWidth: 1, borderColor: C.green,
    minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  secondaryText: { color: C.green, fontSize: 14, fontWeight: '800' },
});

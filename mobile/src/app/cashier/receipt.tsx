import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { receiptHtml, receiptMethod, shareReceiptSms, shareReceiptWhatsApp } from '@/components/kassa-demo/receipt-tools';

export default function Receipt() {
  const store = useKassaDemo();
  const router = useRouter();
  const completed = store.completedPayment;
  const [error, setError] = useState('');
  if (!completed || completed.sale.status !== 'PAID') {
    return <KScreen title="Receipt" subtitle="No verified or confirmed sale is available." showPreviewLabel={false} back>
      <Pressable style={s.button} onPress={() => router.replace('/cashier/new-sale')}><Text style={s.buttonText}>Start a new sale</Text></Pressable>
    </KScreen>;
  }
  const { sale, cashReceived, change } = completed;
  const channel = sale.payments[0]?.channel ?? '';
  const test = channel !== 'CASH';

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action unavailable.'); }
  };

  return <KScreen title="Receipt" subtitle={test ? 'Verified Paystack test sale' : 'Confirmed cash sale'} showBrand={false} showPreviewLabel={false} back>
    <View style={s.paper}>
      <Text style={s.brand}>KASSA</Text>
      <Text style={s.smallCenter}>{test ? 'PAYSTACK TEST RECEIPT' : 'SALE RECEIPT'}</Text>
      <Text style={s.reference}>Reference: {sale.reference}</Text>
      <View style={s.line} />
      <Text style={s.section}>Items</Text>
      {sale.items.map(item => <View key={item.id} style={s.row}>
        <View style={{ flex: 1 }}><Text style={s.itemName}>{item.name}</Text><Text style={s.meta}>{item.quantity} × {naira(Number(item.unitPrice))}</Text></View>
        <Text style={s.itemName}>{naira(Number(item.lineTotal))}</Text>
      </View>)}
      <View style={s.line} />
      <View style={s.row}><Text style={s.total}>TOTAL</Text><Text style={s.total}>{naira(Number(sale.total))}</Text></View>
      <View style={s.row}><Text style={s.meta}>Payment method</Text><Text style={s.itemName}>{receiptMethod(channel)}</Text></View>
      {cashReceived !== null && <>
        <View style={s.row}><Text style={s.meta}>Cash received</Text><Text style={s.itemName}>{naira(cashReceived)}</Text></View>
        <View style={s.row}><Text style={s.meta}>Change given</Text><Text style={s.itemName}>{naira(change)}</Text></View>
      </>}
      <Text style={s.notice}>{test ? 'TEST MODE — not proof of a live charge.' : 'Payment confirmed by KASSA.'}</Text>
    </View>
    {error ? <Text style={s.error}>{error}</Text> : null}
    <Pressable style={s.button} onPress={() => { void run(() => Print.printAsync({ html: receiptHtml(completed) })); }}>
      <Text style={s.buttonText}>Print receipt</Text>
    </Pressable>
    <View style={s.shareActions}>
      <Pressable onPress={() => { void run(() => shareReceiptWhatsApp(completed)); }} style={s.secondary}><Text style={s.secondaryText}>WhatsApp</Text></Pressable>
      <Pressable onPress={() => { void run(() => shareReceiptSms(completed)); }} style={s.secondary}><Text style={s.secondaryText}>SMS</Text></Pressable>
    </View>
    <Pressable onPress={() => router.replace('/cashier')} style={s.home}>
      <Text style={s.homeText}>Back to dashboard</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  paper: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 20 },
  brand: { color: C.green, fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  smallCenter: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 7 },
  reference: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 10 },
  line: { height: 1, backgroundColor: C.border, marginVertical: 17 },
  section: { color: C.title, fontWeight: '800', fontSize: 20, marginBottom: 9 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 10 },
  itemName: { color: C.title, fontSize: 14, fontWeight: '700' },
  meta: { color: C.muted, fontSize: 14, marginTop: 4 },
  total: { color: C.title, fontSize: 22, fontWeight: '800' },
  notice: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 25 },
  button: { backgroundColor: C.green, borderRadius: 9, alignItems: 'center', padding: 15, marginTop: 20 },
  buttonText: { color: C.white, fontWeight: '800', fontSize: 14 },
  shareActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondary: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: C.green, borderRadius: 9, padding: 13 },
  secondaryText: { color: C.green, fontSize: 14, fontWeight: '700' },
  home: { alignItems: 'center', padding: 18 },
  homeText: { color: C.green, fontWeight: '800', fontSize: 14 },
  error: { color: C.danger, fontSize: 14, marginTop: 10 },
});

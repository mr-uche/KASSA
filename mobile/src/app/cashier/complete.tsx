import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Print from 'expo-print';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { receiptHtml, receiptMethod, shareReceiptSms, shareReceiptWhatsApp } from '@/components/kassa-demo/receipt-tools';

export default function CompletedSale() {
  const router = useRouter();
  const store = useKassaDemo();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 420 || fontScale > 1.1;
  const complete = store.completedPayment;
  const [error, setError] = useState('');

  if (!complete || complete.sale.status !== 'PAID' || complete.sale.payments[0]?.status !== 'SUCCEEDED') {
    return <KScreen showBrand={false} showPreviewLabel={false}>
      <Text style={s.title}>No confirmed sale</Text>
      <Text style={s.subtitle}>Complete and verify a payment before viewing its receipt.</Text>
      <Pressable onPress={() => router.replace('/cashier/new-sale')} style={s.action}>
        <Text style={s.actionText}>Back to New Sale</Text>
      </Pressable>
    </KScreen>;
  }

  const { sale, cashReceived, change } = complete;
  const channel = sale.payments[0].channel;
  const isTest = sale.payments.some(payment => payment.provider === 'PAYSTACK_TEST');
  const actions = [
    {
      title: 'Send via WhatsApp',
      icon: { ios: 'message', android: 'chat', web: 'chat' },
      run: () => shareReceiptWhatsApp(complete),
    },
    {
      title: 'Send via SMS',
      icon: { ios: 'envelope', android: 'sms', web: 'sms' },
      run: () => shareReceiptSms(complete),
    },
    {
      title: 'Print receipt',
      icon: { ios: 'printer', android: 'print', web: 'print' },
      run: () => Print.printAsync({ html: receiptHtml(complete) }),
    },
  ] as const;

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Return to home" onPress={() => router.replace('/cashier')} style={s.back}>
        <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={20} tintColor={C.green} />
      </Pressable>
      <View><Text style={s.headerTitle}>Sale complete</Text><Text style={s.headerSub}>{isTest ? 'Paystack test payment verified' : 'Cash receipt confirmed'}</Text></View>
    </View>

    <View style={s.checkCircle}>
      <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor={C.green} size={49} />
    </View>
    <Text style={s.title}>Payment successful</Text>
    <Text style={s.subtitle}>{isTest ? 'Paystack TEST payment verified by the backend.' : 'Sale has been saved to Transactions.'}</Text>

    <View style={s.detailsCard}>
      <View style={[s.detail, compact && s.detailCompact]}>
        <Text style={s.detailLabel}>Amount charged</Text>
        <Text style={[s.value, compact && s.valueCompact]} numberOfLines={1}
          adjustsFontSizeToFit minimumFontScale={0.75}
          accessibilityLabel={'Amount charged ' + naira(Number(sale.total))}>
          {naira(Number(sale.total))}
        </Text>
      </View>
      <View style={[s.detail, compact && s.detailCompact]}>
        <Text style={s.detailLabel}>Payment method</Text>
        <Text style={[s.value, compact && s.valueCompact]} numberOfLines={2}
          adjustsFontSizeToFit minimumFontScale={0.85}>{receiptMethod(channel)}</Text>
      </View>
      {cashReceived !== null && <>
        <View style={[s.detail, compact && s.detailCompact]}>
          <Text style={s.detailLabel}>Cash received</Text>
          <Text style={[s.value, compact && s.valueCompact]} numberOfLines={1}
            adjustsFontSizeToFit minimumFontScale={0.75}>{naira(cashReceived)}</Text>
        </View>
        <View style={[s.detail, compact && s.detailCompact, { borderBottomWidth: 0 }]}>
          <Text style={s.detailLabel}>Change given</Text>
          <Text style={[s.changeValue, compact && s.valueCompact]} numberOfLines={1}
            adjustsFontSizeToFit minimumFontScale={0.75}>{naira(change)}</Text>
        </View>
      </>}
      {isTest && <Text style={s.testWarning}>TEST MODE — not a live payment.</Text>}
    </View>

    <Text style={s.sectionTitle}>Share receipt</Text>
    {actions.map(item =>
      <Pressable
        key={item.title}
        accessibilityRole="button"
        onPress={() => { setError(''); void item.run().catch(e =>
          setError(e instanceof Error ? e.message : 'This share action is unavailable.'));
        }}
        style={s.shareRow}
      >
        <View style={s.shareIcon}><SymbolView name={item.icon} size={19} tintColor={C.green} /></View>
        <Text style={s.shareText}>{item.title}</Text>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={17} tintColor={C.faint} />
      </Pressable>
    )}
    {error ? <Text style={s.error}>{error}</Text> : null}

    <Pressable
      accessibilityRole="button"
      onPress={() => { store.beginNewSale(); router.replace('/cashier/new-sale'); }}
      style={s.action}
    >
      <Text style={s.actionText}>New sale</Text>
    </Pressable>
    <Pressable onPress={() => router.push('/cashier/receipt')} style={s.receiptLink}>
      <Text style={s.receiptLinkText}>View full receipt</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 18 },
  back: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.title },
  headerSub: { marginTop: 3, color: C.muted, fontSize: 14 },
  checkCircle: { width: 87, height: 87, borderRadius: 44, backgroundColor: C.mint, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 19 },
  title: { color: C.title, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: C.muted, fontSize: 14, marginTop: 6, textAlign: 'center', marginBottom: 23 },
  detailsCard: { borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: C.white, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 24 },
  detail: { paddingVertical: 13, borderBottomColor: C.border, borderBottomWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minWidth: 0 },
  detailCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  detailLabel: { color: C.muted, fontSize: 14, flexShrink: 1, minWidth: 0 },
  value: { color: C.title, fontSize: 15, fontWeight: '800',
    textAlign: 'right', flexShrink: 1, maxWidth: '63%', minWidth: 0 },
  valueCompact: { maxWidth: '100%', textAlign: 'right', alignSelf: 'stretch' },
  changeValue: { color: C.green, fontSize: 20, fontWeight: '800', maxWidth: '63%', minWidth: 0, flexShrink: 1, textAlign: 'right' },
  testWarning: { color: C.greenDark, fontSize: 14, paddingTop: 12, paddingBottom: 6 },
  sectionTitle: { color: C.title, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  shareRow: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  shareIcon: { backgroundColor: C.mint, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  shareText: { flex: 1, fontSize: 14, fontWeight: '700', color: C.title },
  action: { borderRadius: 9, backgroundColor: C.green, alignItems: 'center', paddingVertical: 16, marginTop: 16 },
  actionText: { color: C.white, fontWeight: '800', fontSize: 14 },
  receiptLink: { paddingVertical: 17, alignItems: 'center' },
  receiptLinkText: { fontSize: 14, fontWeight: '800', color: C.green },
  error: { color: C.danger, fontSize: 14, marginTop: 7 },
});

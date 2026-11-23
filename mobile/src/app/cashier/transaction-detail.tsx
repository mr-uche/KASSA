import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { C } from '@/components/kassa-demo/theme';
import { KScreen, KCard } from '@/components/kassa-demo/ui';
import { InlineNotice, ListHeading, RecordRow, ScreenHeading, SmallAction, StatusChip, money } from '@/components/kassa-demo/business-ui';

export default function TransactionDetail() {
  const params = useLocalSearchParams<{ saleId?: string }>();
  const router = useRouter();
  const session = useKassaSession();
  const saleId = typeof params.saleId === 'string' ? params.saleId : '';
  const [sale, setSale] = useState<CheckoutSale | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!saleId) { setError('Missing transaction ID.'); setLoading(false); return; }
    if (isCurrent()) setLoading(true);
    try {
      const record = await session.request<CheckoutSale>('sales/' + encodeURIComponent(saleId));
      if (isCurrent()) { setSale(record); setError(''); }
    } catch (cause) {
      if (isCurrent()) { setSale(null); setError(cause instanceof Error ? cause.message : 'Cannot load transaction.'); }
    } finally { if (isCurrent()) setLoading(false); }
  }, [saleId, session.request]);
  useFocusEffect(useCallback(() => {
    let alive = true;
    void reload(() => alive);
    return () => { alive = false; };
  }, [reload]));
  const paid = sale?.status === 'PAID' && sale.payments.some(item => item.status === 'SUCCEEDED');
  const failed = sale?.payments.some(item => item.status === 'FAILED') ?? false;
  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Transaction details" right={<SmallAction label="Back" secondary onPress={() => router.back()}/>}/>
    {loading && <Text style={s.message}>Loading transaction…</Text>}
    {!!error && <InlineNotice text={error} warning/>}
    {!!sale && <>
      <KCard>
        <Text style={s.ref}>{sale.reference}</Text>
        <Text style={s.small}>{new Date(sale.createdAt).toLocaleString('en-NG')}</Text>
        <View style={s.status}><StatusChip label={paid ? 'Successful' : failed ? 'Failed' : 'Pending'}
          color={paid ? 'green' : failed ? 'red' : 'orange'}/></View>
        <Text style={s.total}>{money(sale.total)}</Text>
        {!!sale.customer && sale.customer !== 'Walk-in customer' &&
          sale.customer !== 'Customer details unavailable' &&
          <Text style={s.small}>Customer: {sale.customer}</Text>}
        {sale.cashier ? <Text style={s.small}>Cashier: {sale.cashier}</Text> : null}
      </KCard>
      <ListHeading title="Products"/>
      {sale.items.map(item => <RecordRow key={item.id} title={item.name}
        subtitle={item.quantity + ' × ' + money(item.unitPrice)}
        amount={money(item.lineTotal)}/>)}
      <ListHeading title="Payment status"/>
      {sale.payments.map((payment, index) =>
        <RecordRow key={index} title={payment.channel.replaceAll('_', ' ')}
          subtitle={payment.confirmedAt ? new Date(payment.confirmedAt).toLocaleString('en-NG') : 'Awaiting confirmation'}
          status={payment.status} tone={payment.status === 'SUCCEEDED' ? 'green' : payment.status === 'FAILED' ? 'red' : 'orange'}/>
      )}
      {paid ? <SmallAction label="Open verified receipt" onPress={() => router.push({
        pathname: '/cashier/receipt', params: { saleId: sale.id },
      })}/> : <InlineNotice warning text="Payment is not confirmed. Do not release goods or issue a verified receipt until payment is confirmed."/>}
      <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={s.refresh}>
        <Text style={s.refreshText}>Refresh transaction</Text>
      </Pressable>
    </>}
  </KScreen>;
}

const s = StyleSheet.create({
  ref: { fontSize: 16, fontWeight: '800', color: C.title },
  small: { fontSize: 13, lineHeight: 20, color: C.muted, marginTop: 7 },
  status: { alignItems: 'flex-start', marginTop: 15 },
  total: { fontSize: 28, fontWeight: '800', color: C.green, marginTop: 14 },
  message: { fontSize: 14, color: C.muted, marginVertical: 13 },
  refresh: { alignSelf: 'center', padding: 14, marginTop: 20 },
  refreshText: { color: C.green, fontWeight: '800', fontSize: 14 },
});

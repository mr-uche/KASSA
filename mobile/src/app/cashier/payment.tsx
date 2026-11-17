import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { SymbolView } from 'expo-symbols';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

const methods = [
  { name: 'Cash', channel: 'CASH', detail: 'Confirm after collecting cash' },
  { name: 'Card', channel: 'CARD', detail: 'Paystack test checkout (not live POS)' },
  { name: 'Transfer', channel: 'BANK_TRANSFER', detail: 'Paystack test transfer (not live bank confirmation)' },
] as const;

type Verification = {
  testMode: true;
  saleStatus: string;
  paymentStatus: string;
  providerStatus: string;
  needsAttention: boolean;
};
type CheckoutResult = { saleId: string; authorizationUrl: string; reference: string; testMode: true };

export default function Payment() {
  const router = useRouter();
  const store = useKassaDemo();
  const session = useKassaSession();
  const [cashInput, setCashInput] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  // A stable request ID prevents a double sale when a request is retried on this screen.
  const requestId = useRef<string | null>(null);

  const method = methods.find(item => item.name === store.paymentMethod) ?? methods[0];
  const received = Number(cashInput.replace(/,/g, '').trim());
  const validCash = cashInput.trim().length > 0 && Number.isFinite(received) && received >= store.total;
  const change = validCash ? received - store.total : 0;
  const pending = store.pendingSale;
  const locked = pending !== null;
  const orderItems = store.lines.map(line => ({
    line,
    product: store.catalog.find(item => item.id === line.id),
  })).filter((entry): entry is typeof entry & { product: NonNullable<typeof entry.product> } => !!entry.product);

  const prepareSale = async (): Promise<CheckoutSale> => {
    if (!session.scope || !session.user) throw new Error('Sign in and select an assigned branch first.');
    if (!store.count || orderItems.length !== store.lines.length) {
      throw new Error('Your cart is empty or a product could not be found.');
    }
    if (pending) {
      if (pending.payments[0]?.channel !== method.channel)
        throw new Error('This pending sale uses another payment method. Verify it before starting another.');
      return pending;
    }
    if (!requestId.current) requestId.current = Crypto.randomUUID();
    const saved = await session.request<CheckoutSale>('sales', {
      businessId: session.scope.businessId,
      branchId: session.scope.branchId,
      clientRequestId: requestId.current,
      channel: method.channel,
      items: store.lines.map(line => ({ productId: line.id, quantity: line.quantity })),
    });
    store.setPendingSale(saved);
    if (Math.round(Number(saved.total) * 100) !== Math.round(store.total * 100)) {
      throw new Error('Prices changed on the server. Please review the saved sale before accepting payment.');
    }
    return saved;
  };

  const finishCash = () => {
    if (!validCash) {
      setError('Enter the amount actually received. It must cover the total.');
      return;
    }
    Alert.alert(
      'Confirm cash received',
      'Only continue if you have physically received ' + naira(received) +
      '. This will record the sale as paid and reduce stock in KASSA.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash received', onPress: () => { void (async () => {
          setWorking(true); setError('');
          try {
            const sale = await prepareSale();
            const confirmed = await session.request<CheckoutSale>(
              'sales/' + encodeURIComponent(sale.id) + '/confirm-cash',
              { cashReceived: true }
            );
            if (confirmed.status !== 'PAID' || confirmed.payments[0]?.status !== 'SUCCEEDED') {
              throw new Error('Cash confirmation was not completed on the server.');
            }
            store.setCompletedPayment({ sale: confirmed, cashReceived: received, change: received - Number(confirmed.total) });
            router.replace('/cashier/complete');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to confirm cash payment.');
          } finally { setWorking(false); }
        })(); } },
      ]
    );
  };

  const openTestCheckout = async () => {
    if (working) return;
    setWorking(true); setError('');
    try {
      const sale = await prepareSale();
      const result = await session.request<CheckoutResult>('payments/paystack/initialize', {
        saleId: sale.id, email: session.user!.email,
      });
      // Checkout is hosted by Paystack; secret keys are never sent to the app.
      if (result.testMode !== true || !/^https:\/\/checkout\.paystack\.com\//.test(result.authorizationUrl)) {
        throw new Error('The server did not return a valid Paystack test checkout URL.');
      }
      await WebBrowser.openBrowserAsync(result.authorizationUrl);
      // Do not mark paid here: on Android the browser call can resolve before checkout ends.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open test checkout.');
    } finally { setWorking(false); }
  };

  const verifyTestPayment = async () => {
    if (!pending || working) return;
    setWorking(true); setError('');
    try {
      const verified = await session.request<Verification>('payments/paystack/verify', {
        saleId: pending.id,
      });
      if (verified.testMode !== true || verified.saleStatus !== 'PAID' ||
          verified.paymentStatus !== 'SUCCEEDED' || verified.needsAttention) {
        setError('Payment is not confirmed yet (' + verified.providerStatus + '). Retry verification after test checkout.');
        return;
      }
      const confirmed = await session.request<CheckoutSale>('sales/' + encodeURIComponent(pending.id));
      if (confirmed.status !== 'PAID' || confirmed.payments[0]?.status !== 'SUCCEEDED') {
        throw new Error('The sale is awaiting confirmed payment.');
      }
      store.setCompletedPayment({ sale: confirmed, cashReceived: null, change: 0 });
      router.replace('/cashier/complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment verification failed. Try again.');
    } finally { setWorking(false); }
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.heading}>
      <Pressable accessibilityLabel="Back to sale review" accessibilityRole="button" onPress={() => router.push('/cashier/review-sale')} style={s.back}>
        <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={21} tintColor={C.green} />
      </Pressable>
      <View><Text style={s.title}>Payment</Text><Text style={s.subtitle}>Complete customer purchase</Text></View>
    </View>

    <Text style={s.sectionTitle}>Order summary</Text>
    <View style={s.summary}>
      {orderItems.map(({ line, product }) => (
        <View style={s.itemRow} key={product.id}>
          <View style={{ flex: 1 }}>
            <Text style={s.productName}>{product.name}</Text>
            <Text style={s.productQty}>{line.quantity} × {naira(product.price)}</Text>
          </View>
          <Text style={s.amount}>{naira(product.price * line.quantity)}</Text>
        </View>
      ))}
      <View style={s.divider} />
      <View style={s.totalRow}><Text style={s.totalText}>Total</Text><Text style={s.totalValue}>{naira(pending ? Number(pending.total) : store.total)}</Text></View>
    </View>

    <Text style={[s.sectionTitle, { marginTop: 26 }]}>How did the customer pay?</Text>
    {methods.map(item => {
      const selected = method.name === item.name;
      return <Pressable key={item.name} accessibilityRole="button"
        accessibilityState={{ selected, disabled: locked && !selected }}
        disabled={locked && !selected}
        onPress={() => store.setPaymentMethod(item.name)}
        style={[s.method, selected && s.methodSelected, locked && !selected && { opacity: 0.55 }]}>
        <View style={[s.radio, selected && s.radioSelected]}>{selected && <View style={s.dot} />}</View>
        <View><Text style={s.methodName}>{item.name}</Text><Text style={s.methodDesc}>{item.detail}</Text></View>
      </Pressable>;
    })}

    {method.channel === 'CASH' ? <>
      <Text style={s.sectionTitle}>Cash received</Text>
      <TextInput
        accessibilityLabel="Cash received amount in naira"
        keyboardType="decimal-pad"
        placeholder="₦ 0"
        placeholderTextColor={C.faint}
        value={cashInput}
        onChangeText={setCashInput}
        editable={!working}
        style={s.cashInput}
      />
      <View style={s.changeRow}><Text style={s.changeLabel}>Change to customer</Text><Text style={s.changeNumber}>{naira(change)}</Text></View>
    </> : <View style={s.note}><Text style={s.noteText}>Paystack TEST MODE • No real charge. After completing checkout, return here and tap Verify payment.</Text></View>}

    {!session.scope && <Text style={s.error}>Sign in to KASSA before completing payments.</Text>}
    {error ? <Text style={s.error}>{error}</Text> : null}
    <Pressable
      accessibilityRole="button"
      disabled={working || !session.scope || !store.count || (method.channel === 'CASH' && !validCash)}
      onPress={method.channel === 'CASH' ? finishCash : () => { void openTestCheckout(); }}
      style={[s.primary, (working || !session.scope || !store.count || (method.channel === 'CASH' && !validCash)) && { opacity: 0.5 }]}
    >
      <Text style={s.primaryText}>{working ? 'Please wait…' : method.channel === 'CASH' ? 'Complete sale' : pending ? 'Reopen test checkout' : 'Pay with Paystack (test)'}</Text>
    </Pressable>
    {pending && method.channel !== 'CASH' &&
      <Pressable style={s.verify} disabled={working} onPress={() => { void verifyTestPayment(); }}>
        <Text style={s.verifyText}>Verify payment</Text>
      </Pressable>}
    {!session.scope && <Pressable onPress={() => router.push('/login')} style={s.verify}><Text style={s.verifyText}>Go to sign in</Text></Pressable>}
  </KScreen>;
}

const s = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 25 },
  back: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, color: C.title, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 14, marginTop: 2 },
  sectionTitle: { color: C.title, fontWeight: '800', fontSize: 20, marginBottom: 12 },
  summary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, alignItems: 'center' },
  productName: { color: C.title, fontSize: 14, fontWeight: '700' },
  productQty: { color: C.faint, fontSize: 14, marginTop: 4 },
  amount: { color: C.title, fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: C.border, height: 1, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { color: C.title, fontSize: 14, fontWeight: '800' },
  totalValue: { fontSize: 22, color: C.green, fontWeight: '800' },
  method: { backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 9, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  methodSelected: { backgroundColor: C.mint, borderColor: C.green },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: C.faint, justifyContent: 'center', alignItems: 'center', marginRight: 13 },
  radioSelected: { borderColor: C.green },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.green },
  methodName: { color: C.title, fontSize: 14, fontWeight: '800' },
  methodDesc: { color: C.muted, fontSize: 14, marginTop: 4 },
  cashInput: { backgroundColor: C.white, color: C.title, borderWidth: 1, borderColor: C.green, height: 55, borderRadius: 9, paddingHorizontal: 16, fontSize: 20, marginBottom: 10 },
  changeRow: { backgroundColor: C.mint, borderRadius: 9, padding: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeLabel: { color: C.muted, fontSize: 14 },
  changeNumber: { color: C.green, fontSize: 22, fontWeight: '800' },
  primary: { backgroundColor: C.green, borderRadius: 9, alignItems: 'center', marginTop: 22, padding: 18 },
  primaryText: { color: C.white, fontSize: 14, fontWeight: '800' },
  note: { backgroundColor: C.mint, padding: 14, borderRadius: 9, marginTop: 14 },
  noteText: { fontSize: 14, color: C.greenDark, lineHeight: 22 },
  error: { color: C.danger, fontSize: 14, marginTop: 12 },
  verify: { borderRadius: 9, borderWidth: 1, borderColor: C.green, padding: 14, alignItems: 'center', marginTop: 10 },
  verifyText: { color: C.green, fontWeight: '800', fontSize: 14 },
});

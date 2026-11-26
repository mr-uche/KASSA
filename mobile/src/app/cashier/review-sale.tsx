import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { CheckoutProgress } from '@/components/kassa-demo/checkout-progress';

type IconName = React.ComponentProps<typeof SymbolView>['name'];
const icon = (name: IconName, size = 20, color: string = C.green) =>
  <SymbolView name={name} size={size} tintColor={color} />;

export default function ReviewSale() {
  const store = useKassaDemo();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 420 || fontScale > 1.1;
  const selected = store.lines.map(line => ({
    line, item: store.catalog.find(item => item.id === line.id),
  })).filter((entry): entry is typeof entry & { item: NonNullable<typeof entry.item> } => !!entry.item);

  return <KScreen showBrand={false} showPreviewLabel={false}>
    {store.offlineMode && <View style={{ borderWidth: 1, borderColor: C.mintBorder, backgroundColor: C.mint, borderRadius: 9, padding: 12, marginBottom: 15 }}>
      <Text style={{ color: C.greenDark, fontWeight: '800', fontSize: 14 }}>OFFLINE · Cash only</Text>
      <Text style={{ color: C.muted, fontSize: 13, marginTop: 5 }}>Connect internet to sync sales</Text>
    </View>}
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to product selection" onPress={() => router.replace('/cashier/new-sale')} style={s.back}>
        {icon({ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' })}
      </Pressable>
      <View><Text style={s.headerTitle}>New Sale</Text><Text style={s.headerCaption}>Select products & quantity</Text></View>
    </View>

    <CheckoutProgress stage={1}/>
    <Pressable style={s.search} onPress={() => router.push('/cashier/new-sale')} accessibilityRole="button" accessibilityLabel="Find more products">
      {icon({ ios: 'magnifyingglass', android: 'search', web: 'search' }, 17, C.muted)}
      <Text style={s.searchText}>Search products or scan barcode</Text>
    </Pressable>

    <View style={[s.current, compact && s.currentCompact]}>
      <View style={s.currentHeading}>
        <View style={s.cartSymbol}>{icon({ ios: 'basket', android: 'shopping_basket', web: 'shopping_basket' }, 22)}</View>
        <View style={s.currentText}>
          <Text style={s.currentTitle}>Current sale</Text>
          <Text style={s.currentSubtitle}>{store.count} items selected</Text>
        </View>
      </View>
      <View style={[s.currentAmountWrap, compact && s.currentAmountWrapCompact]}>
        <Text style={s.totalAccent} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
          accessibilityLabel={'Current sale total ' + naira(store.total)}>
          {naira(store.total)}
        </Text>
      </View>
    </View>

    <View style={s.heading}><Text style={s.sectionTitle}>Products</Text><Text style={s.hint}>Adjust quantity</Text></View>
    {selected.length === 0 && <View style={s.empty}><Text style={s.emptyText}>No items selected yet.</Text><Pressable onPress={() => router.replace('/cashier/new-sale')}><Text style={s.addText}>Browse products</Text></Pressable></View>}
    {selected.map(({ item, line }) => (
      <View key={item.id} style={s.product}>
        <View style={s.imageBox}>{icon(item.category === 'Beverages'
          ? { ios: 'cup.and.saucer', android: 'local_drink', web: 'local_drink' }
          : { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }, 27)}</View>
        <View style={s.productInfo}>
          <Text numberOfLines={2} style={s.productName}>{item.name}</Text>
          <Text style={s.productSub}>{naira(item.price)} each • Stock: {item.stock}</Text>
        </View>
        <View style={s.counter}>
          <Pressable accessibilityRole="button" accessibilityLabel={'Remove one ' + item.name} onPress={() => store.subtract(item.id)} style={s.counterButton}>
            <Text style={s.minus}>−</Text>
          </Pressable>
          <Text style={s.qty}>{line.quantity}</Text>
          <Pressable disabled={line.quantity >= item.stock} accessibilityRole="button" accessibilityLabel={'Add one ' + item.name} onPress={() => store.add(item.id)} style={[s.plusButton, line.quantity >= item.stock && { opacity: 0.4 }]}>
            <Text style={s.plus}>+</Text>
          </Pressable>
        </View>
      </View>
    ))}

    <View style={s.customerPanel}>
      <Text style={s.customerLabel}>Customer name (optional)</Text>
      <TextInput accessibilityLabel="Customer name optional"
        placeholder="Who is buying? (optional)" placeholderTextColor={C.faint}
        value={store.customerName} maxLength={120} autoCapitalize="words"
        onChangeText={store.setCustomerName}
        editable={!store.pendingSale} style={s.customerInput}/>
      <Text style={s.customerHint}>Include a name to identify the buyer in sales history and on the receipt.</Text>
    </View>

    <View style={s.summary}>
      <View style={s.sumRow}><Text style={s.label}>Items</Text><Text style={s.smallBold}>{store.count}</Text></View>
      <View style={s.sumRow}>
        <Text style={s.label}>Subtotal</Text>
        <Text style={[s.smallBold, s.summaryAmount]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{naira(store.subtotal)}</Text>
      </View>
      {!store.pendingSale && <View style={s.discountPanel}>
        <Text style={s.customerLabel}>Apply discount (optional)</Text>
        <View style={s.discountModes}>
          {(['fixed', 'percent'] as const).map(type => <Pressable key={type}
            accessibilityRole="radio" accessibilityState={{ checked: store.discountType === type }}
            style={[s.discountMode, store.discountType === type && s.discountSelected]}
            onPress={() => store.setDiscountType(type)}>
            <Text style={s.smallBold}>{type === 'fixed' ? 'Fixed amount (₦)' : 'Percentage (%)'}</Text>
          </Pressable>)}
        </View>
        <TextInput style={s.customerInput} accessibilityLabel="Discount value"
          keyboardType="decimal-pad" placeholder={store.discountType === 'fixed' ? '0.00' : '0%'}
          placeholderTextColor={C.faint} value={store.discountInput} maxLength={15}
          onChangeText={store.setDiscountInput}/>
        {!store.discountValid && <Text style={s.discountError}>Enter a valid discount smaller than the subtotal. The amount payable must remain positive.</Text>}
      </View>}
      <View style={s.sumRow}>
        <Text style={s.label}>Discount</Text><Text style={s.smallBold}>−{naira(store.discount)}</Text>
      </View>
      <View style={s.divider} />
      <View style={s.sumRow}>
        <Text style={s.totalLabel}>Total</Text>
        <Text style={[s.totalAccent, s.summaryAmount]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{naira(store.total)}</Text>
      </View>
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue to payment"
      disabled={!store.count || !store.discountValid}
      onPress={() => router.push('/cashier/payment')}
      style={[s.next, (!store.count || !store.discountValid) && { opacity: 0.4 }]}
    >
      <Text style={s.nextText}>Continue to payment</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  discountPanel: { marginVertical: 10 },
  discountModes: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  discountMode: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.border },
  discountSelected: { borderColor: C.green, backgroundColor: C.mint },
  discountError: { color: C.danger, fontSize: 12, marginTop: 8 },
  customerPanel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    padding: 14, borderRadius: 11, marginTop: 15, marginBottom: 14 },
  customerLabel: { color: C.title, fontSize: 14, fontWeight: '800', marginBottom: 9 },
  customerInput: { backgroundColor: C.white, color: C.title, fontSize: 14,
    borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 12, height: 46 },
  customerHint: { color: C.muted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 19 },
  back: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.title },
  headerCaption: { color: C.muted, fontSize: 14, marginTop: 3 },
  search: { height: 49, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchText: { color: C.faint, fontSize: 14 },
  current: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, backgroundColor: C.mint, marginTop: 18, width: '100%', minWidth: 0 },
  currentCompact: { flexDirection: 'column', alignItems: 'stretch' },
  currentHeading: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  currentAmountWrap: { maxWidth: '48%', flexShrink: 1, minWidth: 0, alignItems: 'flex-end', marginLeft: 8 },
  currentAmountWrapCompact: { maxWidth: '100%', marginLeft: 0, marginTop: 8, alignSelf: 'stretch' },
  cartSymbol: { width: 36, height: 36, backgroundColor: '#D7EBE4', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  currentText: { flex: 1, minWidth: 0, flexShrink: 1 },
  currentTitle: { color: C.title, fontSize: 20, fontWeight: '800' },
  currentSubtitle: { color: C.muted, fontSize: 14, marginTop: 3 },
  totalAccent: { fontSize: 22, fontWeight: '800', color: C.green, textAlign: 'right', flexShrink: 1 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, marginBottom: 14 },
  sectionTitle: { color: C.title, fontSize: 20, fontWeight: '800' },
  hint: { color: C.faint, fontSize: 14 },
  product: { borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.white, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 11, gap: 10 },
  imageBox: { backgroundColor: C.mint, width: 58, height: 68, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 14, fontWeight: '800', color: C.title },
  productSub: { color: C.muted, fontSize: 14, marginTop: 5 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterButton: { width: 25, height: 27, backgroundColor: '#F0F4F2', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  minus: { color: C.green, fontSize: 20, fontWeight: '700' },
  qty: { fontSize: 14, minWidth: 13, textAlign: 'center', color: C.title, fontWeight: '800' },
  plusButton: { width: 27, height: 27, backgroundColor: C.green, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  plus: { color: C.white, fontWeight: '800', fontSize: 20 },
  summary: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 11, padding: 15, marginTop: 7 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, alignItems: 'center', gap: 12, minWidth: 0 },
  summaryAmount: { flexShrink: 1, maxWidth: '72%', textAlign: 'right', minWidth: 0 },
  label: { color: C.muted, fontSize: 14 },
  smallBold: { fontSize: 14, fontWeight: '700', color: C.title },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 3 },
  totalLabel: { color: C.title, fontWeight: '800', fontSize: 14 },
  next: { backgroundColor: C.green, borderRadius: 9, marginTop: 21, padding: 16, alignItems: 'center' },
  nextText: { color: C.white, fontSize: 14, fontWeight: '800' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 14, marginBottom: 10 },
  addText: { color: C.green, fontWeight: '700' },
});

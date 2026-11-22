import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

const icon = (name: React.ComponentProps<typeof SymbolView>['name'], size = 22, color: string = C.green) =>
  <SymbolView name={name} tintColor={color} size={size}/>;

export default function ProductDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useKassaDemo();
  const product = store.catalog.find(item => item.id === id);
  const quantity = store.lines.find(item => item.id === id)?.quantity ?? 0;

  if (!product) return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.back}>
        {icon({ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }, 20, C.title)}
      </Pressable>
      <Text style={s.heading}>Product Details</Text>
    </View>
    <Text style={s.notice}>This product is no longer available in the selected branch.</Text>
    <Pressable accessibilityRole="button" style={s.returnButton}
      onPress={() => router.replace('/cashier/new-sale')}>
      <Text style={s.returnText}>Back to New Sale</Text>
    </Pressable>
  </KScreen>;

  const unavailable = product.stock <= quantity || !!store.pendingSale;
  const productIcon = product.category === 'Beverages'
    ? { ios: 'cup.and.saucer', android: 'local_drink', web: 'local_drink' }
    : { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to New Sale" style={s.back}
        onPress={() => router.back()}>
        {icon({ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }, 20, C.title)}
      </Pressable>
      <Text style={s.heading}>Product Details</Text>
    </View>

    <View style={s.card}>
      <View style={s.imagePanel}>
        <View style={s.imageIcon}>{icon(productIcon, 64)}</View>
      </View>
      <Text style={s.category}>{product.category}</Text>
      <Text style={s.title}>{product.name}</Text>
      <View style={s.productMeta}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Price</Text>
          <Text style={s.price}>{naira(product.price)}</Text>
        </View>
        <View style={s.stockWrap}>
          <Text style={s.label}>Available stock</Text>
          <Text style={s.stock}>{product.stock}</Text>
        </View>
      </View>
      {!!product.sku && <View style={s.metaRow}>
        <Text style={s.label}>SKU</Text>
        <Text style={s.metaValue}>{product.sku}</Text>
      </View>}
      {!!product.barcode && <View style={s.metaRow}>
        <Text style={s.label}>Barcode</Text>
        <Text style={s.metaValue}>{product.barcode}</Text>
      </View>}
      {quantity > 0 && <View style={s.inSale}>
        {icon({ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }, 18)}
        <Text style={s.inSaleText}>{quantity} selected for the current sale</Text>
      </View>}
      {store.pendingSale && <Text style={s.warning}>
        A payment is pending. Finish or verify it before changing this sale.
      </Text>}
      <Pressable accessibilityRole="button"
        accessibilityLabel={'Add ' + product.name + ' to current sale'}
        disabled={unavailable} onPress={() => store.add(product.id)}
        style={[s.addButton, unavailable && s.disabled]}>
        {icon({ ios: 'plus', android: 'add', web: 'add' }, 20, C.white)}
        <Text style={s.addText}>{product.stock <= quantity ? 'Out of available stock'
          : store.pendingSale ? 'Sale awaiting payment' : 'Add to current sale'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.returnLink}>
        <Text style={s.returnLinkText}>Continue shopping</Text>
      </Pressable>
    </View>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { width: 26, height: 38, justifyContent: 'center' },
  heading: { fontSize: 26, color: C.title, fontWeight: '800' },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    padding: 15, borderRadius: 18, marginBottom: 18 },
  imagePanel: { height: 235, backgroundColor: C.mint, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  imageIcon: { height: 124, width: 124, backgroundColor: '#D7EBE4',
    borderRadius: 62, alignItems: 'center', justifyContent: 'center' },
  category: { color: C.green, fontSize: 13, fontWeight: '700' },
  title: { color: C.title, fontSize: 23, fontWeight: '800', marginTop: 5, marginBottom: 13 },
  productMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  label: { color: C.muted, fontSize: 13, fontWeight: '600' },
  price: { color: C.green, fontSize: 22, fontWeight: '800', marginTop: 4 },
  stockWrap: { alignItems: 'flex-end' },
  stock: { color: C.title, fontSize: 18, fontWeight: '800', marginTop: 5 },
  metaRow: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaValue: { color: C.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  inSale: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.mint,
    borderRadius: 9, padding: 12, marginTop: 10 },
  inSaleText: { color: C.greenDark, fontSize: 13, fontWeight: '700', flex: 1 },
  addButton: { minHeight: 51, borderRadius: 10, backgroundColor: C.green, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  disabled: { opacity: 0.45 },
  addText: { color: C.white, fontWeight: '800', fontSize: 14 },
  warning: { color: C.orange, fontSize: 13, marginTop: 10 },
  returnLink: { padding: 13, alignItems: 'center' },
  returnLinkText: { fontSize: 14, color: C.green, fontWeight: '700' },
  notice: { fontSize: 14, color: C.muted },
  returnButton: { backgroundColor: C.green, borderRadius: 10,
    alignItems: 'center', padding: 14, marginTop: 18 },
  returnText: { color: C.white, fontWeight: '800', fontSize: 14 },
});
